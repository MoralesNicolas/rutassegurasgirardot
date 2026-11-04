// ============================================================
// Puntaje de seguridad de una ruta (0 a 100). Funciones PURAS: no tocan la BD ni la red,
// por eso se pueden probar con pruebas unitarias (tests/safetyScore.test.js).
//
// puntaje = 100
//   − zonas de riesgo   (por cada muestra de 30 m dentro de una zona: nivel × 0.6; máx. 60)
//   − sin cobertura     (% del recorrido sin punto seguro/luminaria a < 150 m; máx. 20)
//   + puntos seguros    (CAI, estación o comercio 24 h a < 100 m: +5 c/u; máx. 15)
//   + comunidad         (promedio de estrellas de las celdas que cruza: de −10 a +10)
//   − desvío            (si tarda más de 1.3 × la rápida: 1 punto por cada 1 % extra)
// ============================================================
const { distanceM, sampleLine, cellKey } = require('./geoUtils');

const WEIGHTS = {
  sampleStepM: 30,
  riskPerLevel: 0.6,
  maxRiskPenalty: 60,
  coverageRadiusM: 150,
  maxCoveragePenalty: 20,
  safePointRadiusM: 100,
  bonusPerSafePoint: 5,
  maxSafeBonus: 15,
  maxCommunityAdjust: 10,
  detourThreshold: 1.3,
  maxDetourForSafe: 1.4 // la ruta segura no puede tardar más de +40 % que la rápida
};

const REASON_TEXT = {
  poca_iluminacion: 'tramo con poca iluminación',
  aislamiento: 'tramo solitario de noche',
  hurto: 'sector con reportes de hurto',
  reportes: 'sector con reportes ciudadanos'
};

const SAFE_TYPE_TEXT = {
  cai: 'un CAI',
  estacion_policia: 'una estación de policía',
  comercio_24h: 'un comercio abierto 24 h'
};

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

/**
 * Calcula el puntaje de una ruta.
 * @param route { geometry: { coordinates: [[lng,lat],...] }, duration_s }
 * @param ctx   { riskZones, safePoints, segmentScores: Map, fastDurationS }
 */
function scoreRoute(route, ctx) {
  const samples = sampleLine(route.geometry.coordinates, WEIGHTS.sampleStepM);

  // 1. Zonas de riesgo: penaliza cada tramo de 30 m que pasa por una zona (cuenta la de mayor nivel)
  let riskPenalty = 0;
  const zonesCrossed = new Map();
  for (const p of samples) {
    let worst = null;
    for (const z of ctx.riskZones) {
      if (distanceM(p, [z.lng, z.lat]) <= z.radius_m && (!worst || z.level > worst.level)) worst = z;
    }
    if (worst) {
      riskPenalty += worst.level * WEIGHTS.riskPerLevel;
      zonesCrossed.set(worst.id, worst);
    }
  }
  riskPenalty = Math.min(riskPenalty, WEIGHTS.maxRiskPenalty);

  // 2. Cobertura: ¿qué parte del recorrido no tiene cerca un punto seguro o una luminaria?
  let uncovered = 0;
  for (const p of samples) {
    const covered = ctx.safePoints.some((s) => distanceM(p, [s.lng, s.lat]) <= WEIGHTS.coverageRadiusM);
    if (!covered) uncovered++;
  }
  const uncoveredRatio = samples.length ? uncovered / samples.length : 0;
  const coveragePenalty = uncoveredRatio * WEIGHTS.maxCoveragePenalty;

  // 3. Bonus por pasar cerca de lugares donde pedir ayuda (las luminarias no cuentan aquí)
  const nearbySafePoints = [];
  for (const s of ctx.safePoints) {
    if (s.type === 'luminaria') continue;
    let min = Infinity;
    for (const p of samples) min = Math.min(min, distanceM(p, [s.lng, s.lat]));
    if (min <= WEIGHTS.safePointRadiusM) nearbySafePoints.push({ name: s.name, type: s.type, distance_m: Math.round(min) });
  }
  nearbySafePoints.sort((a, b) => a.distance_m - b.distance_m);
  const safeBonus = Math.min(nearbySafePoints.length * WEIGHTS.bonusPerSafePoint, WEIGHTS.maxSafeBonus);

  // 4. Comunidad: estrellas promedio (1 a 5) de las celdas que cruza → −10 a +10
  const cells = [...new Set(samples.map((p) => cellKey(p[0], p[1])))];
  let sum = 0;
  let count = 0;
  for (const key of cells) {
    const s = ctx.segmentScores && ctx.segmentScores.get(key);
    if (s) { sum += s.rating_sum; count += s.rating_count; }
  }
  const communityAvg = count ? sum / count : null;
  const communityAdjust = count ? ((communityAvg - 3) / 2) * WEIGHTS.maxCommunityAdjust : 0;

  // 5. Desvío: una ruta segura que tarda demasiado tampoco sirve
  const ratio = ctx.fastDurationS ? route.duration_s / ctx.fastDurationS : 1;
  const detourPenalty = ratio > WEIGHTS.detourThreshold ? (ratio - WEIGHTS.detourThreshold) * 100 : 0;

  const raw = 100 - riskPenalty - coveragePenalty + safeBonus + communityAdjust - detourPenalty;
  return {
    score: Math.round(clamp(raw, 0, 100)),
    zonesCrossed: [...zonesCrossed.values()],
    nearbySafePoints,
    communityAvg: communityAvg === null ? null : Math.round(communityAvg * 10) / 10,
    breakdown: {
      riskPenalty: Math.round(riskPenalty),
      coveragePenalty: Math.round(coveragePenalty),
      safeBonus,
      communityAdjust: Math.round(communityAdjust),
      detourPenalty: Math.round(detourPenalty)
    }
  };
}

// Elige la ruta rápida (menor duración) y la segura (mayor puntaje sin pasar de +40 % de tiempo)
function pickRoutes(scored) {
  const fast = scored.reduce((a, b) => (b.duration_s < a.duration_s ? b : a));
  const limit = fast.duration_s * WEIGHTS.maxDetourForSafe;
  const safe = scored
    .filter((r) => r.duration_s <= limit)
    .reduce((a, b) => (b.score > a.score || (b.score === a.score && b.duration_s < a.duration_s) ? b : a));
  return { fast, safe, same: fast === safe };
}

// Explicación legible: describe FACTORES (luz, compañía, reportes), nunca etiqueta barrios
function explain(safe, fast, same) {
  if (same) {
    const lines = ['La ruta más rápida ya es la más segura que encontramos.'];
    if (safe.nearbySafePoints[0]) lines.push(describeSafePoint(safe.nearbySafePoints[0]));
    return lines;
  }
  const lines = [];
  const safeIds = new Set(safe.zonesCrossed.map((z) => z.id));
  const avoided = fast.zonesCrossed.filter((z) => !safeIds.has(z.id));
  if (avoided.length) {
    const reasons = {};
    for (const z of avoided) reasons[z.reason] = (reasons[z.reason] || 0) + 1;
    const parts = Object.entries(reasons).map(([r, n]) =>
      `${n} ${REASON_TEXT[r] || 'tramo con reportes'}${n > 1 ? ' (x' + n + ')' : ''}`);
    lines.push(`Evita ${parts.join(', ')}.`);
  } else if (safe.breakdown.riskPenalty < fast.breakdown.riskPenalty) {
    lines.push('Recorre menos metros por tramos con poca luz o con reportes.');
  }
  if (safe.nearbySafePoints[0]) lines.push(describeSafePoint(safe.nearbySafePoints[0]));
  if (safe.communityAvg !== null) lines.push(`Otras usuarias califican sus tramos con ${safe.communityAvg} de 5 estrellas.`);
  const extraMin = Math.round((safe.duration_s - fast.duration_s) / 60);
  lines.push(extraMin > 0 ? `Te toma ${extraMin} min más que la ruta rápida.` : 'Tarda prácticamente lo mismo que la ruta rápida.');
  return lines;
}

function describeSafePoint(p) {
  return `Pasa a ${p.distance_m} m de ${SAFE_TYPE_TEXT[p.type] || 'un punto seguro'}: ${p.name}.`;
}

module.exports = { WEIGHTS, scoreRoute, pickRoutes, explain };
