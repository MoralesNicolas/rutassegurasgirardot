const test = require('node:test');
const assert = require('node:assert/strict');
const { scoreRoute, pickRoutes, explain, WEIGHTS } = require('../src/services/safetyScoreService');

// Ruta recta de ~330 m hacia el norte
const line = (lng) => ({ geometry: { coordinates: [[lng, 4.3000], [lng, 4.3030]] }, duration_s: 240, distance_m: 330 });
const zone = { id: 1, name: 'Zona demo', lat: 4.3015, lng: -74.8031, radius_m: 100, level: 5, reason: 'poca_iluminacion' };
const cai = { name: 'CAI demo', type: 'cai', lat: 4.3015, lng: -74.8031 };
const baseCtx = { riskZones: [], safePoints: [], segmentScores: new Map(), fastDurationS: 240 };

test('una ruta que cruza una zona de riesgo puntúa menos que una que no la cruza', () => {
  const ctx = { ...baseCtx, riskZones: [zone] };
  const crossing = scoreRoute(line(-74.8031), ctx);
  const clear = scoreRoute(line(-74.7950), ctx); // ~900 m al este, fuera de la zona
  assert.ok(crossing.score < clear.score, `${crossing.score} debería ser < ${clear.score}`);
  assert.equal(crossing.zonesCrossed.length, 1);
  assert.equal(clear.zonesCrossed.length, 0);
});

test('pasar cerca de un CAI suma bonus y lo reporta en nearbySafePoints', () => {
  const ctx = { ...baseCtx, safePoints: [cai] };
  const r = scoreRoute(line(-74.8031), ctx);
  assert.equal(r.breakdown.safeBonus, WEIGHTS.bonusPerSafePoint);
  assert.equal(r.nearbySafePoints[0].name, 'CAI demo');
});

test('el puntaje siempre queda entre 0 y 100', () => {
  const ctx = { ...baseCtx, riskZones: [{ ...zone, radius_m: 5000 }], fastDurationS: 60 };
  const r = scoreRoute(line(-74.8031), ctx);
  assert.ok(r.score >= 0 && r.score <= 100);
});

test('las calificaciones de la comunidad ajustan el puntaje (5★ sube, 1★ baja)', () => {
  const route = line(-74.8031);
  const good = new Map([['4.301_-74.803', { rating_sum: 5, rating_count: 1 }]]);
  const bad = new Map([['4.301_-74.803', { rating_sum: 1, rating_count: 1 }]]);
  const up = scoreRoute(route, { ...baseCtx, segmentScores: good });
  const down = scoreRoute(route, { ...baseCtx, segmentScores: bad });
  assert.ok(up.score > down.score);
});

test('pickRoutes no elige como segura una ruta que tarda más de +40 %', () => {
  const fast = { duration_s: 600, score: 50 };
  const slowButSafe = { duration_s: 900, score: 95 }; // +50 %
  const okSafe = { duration_s: 700, score: 80 };
  const { safe } = pickRoutes([fast, slowButSafe, okSafe]);
  assert.equal(safe, okSafe);
});

test('explain no nombra barrios: describe factores y avisa si las rutas coinciden', () => {
  const r = { zonesCrossed: [], nearbySafePoints: [], communityAvg: null, duration_s: 300, breakdown: { riskPenalty: 0 } };
  assert.match(explain(r, r, true)[0], /ya es la más segura/);
  const fast = { ...r, zonesCrossed: [zone], breakdown: { riskPenalty: 20 } };
  const lines = explain({ ...r, duration_s: 360 }, fast, false);
  assert.match(lines[0], /poca iluminación/);
});
