// Orquesta el cálculo: pide rutas a la API externa, las puntúa y elige la rápida y la segura
const routingService = require('./routingService');
const { scoreRoute, pickRoutes, explain } = require('./safetyScoreService');
const { distanceM, offsetPoint } = require('./geoUtils');
const RiskZone = require('../models/RiskZone');
const SafePoint = require('../models/SafePoint');
const SegmentScore = require('../models/SegmentScore');

// Dos puntos de paso a cada lado de una zona (perpendiculares a la línea origen→destino)
// para pedirle al ruteador un camino que la rodee
function detourPoints(origin, dest, zone) {
  const dx = distanceM(origin, [dest[0], origin[1]]) * Math.sign(dest[0] - origin[0]);
  const dy = distanceM(origin, [origin[0], dest[1]]) * Math.sign(dest[1] - origin[1]);
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const away = zone.radius_m + 120;
  const center = [zone.lng, zone.lat];
  return [offsetPoint(center, nx * away, ny * away), offsetPoint(center, -nx * away, -ny * away)];
}

async function plan(origin, dest, city) {
  const [riskZones, safePoints, segmentScores] = await Promise.all([
    RiskZone.findByCity(city.id),
    SafePoint.findByCity(city.id),
    SegmentScore.getAll()
  ]);

  const { provider, routes } = await routingService.getWalkingRoutes([origin, dest]);
  const fastDurationS = Math.min(...routes.map((r) => r.duration_s));
  const ctx = { riskZones, safePoints, segmentScores, fastDurationS };
  const scored = routes.map((r) => ({ ...r, ...scoreRoute(r, ctx) }));

  // Si la mejor opción todavía cruza una zona, probamos rodear la más grave
  let best = pickRoutes(scored).safe;
  if (best.zonesCrossed.length) {
    const worst = best.zonesCrossed.reduce((a, b) => (b.level > a.level ? b : a));
    const vias = detourPoints(origin, dest, worst);
    const extra = await Promise.allSettled(vias.map((v) => routingService.getWalkingRoutes([origin, v, dest])));
    for (const r of extra) {
      if (r.status === 'fulfilled' && r.value.routes[0]) {
        const route = r.value.routes[0];
        scored.push({ ...route, ...scoreRoute(route, ctx) });
      }
    }
  }

  const { fast, safe, same } = pickRoutes(scored);
  const clean = (r) => ({
    geometry: r.geometry,
    duration_s: r.duration_s,
    distance_m: r.distance_m,
    score: r.score,
    breakdown: r.breakdown,
    zones: r.zonesCrossed.map((z) => ({ id: z.id, reason: z.reason, level: z.level })),
    nearbySafePoints: r.nearbySafePoints.slice(0, 3)
  });
  return {
    provider,
    same,
    candidates: scored.length,
    fast: clean(fast),
    safe: clean(safe),
    explanation: explain(safe, fast, same)
  };
}

module.exports = { plan, detourPoints };
