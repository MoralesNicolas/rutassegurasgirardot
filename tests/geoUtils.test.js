const test = require('node:test');
const assert = require('node:assert/strict');
const { distanceM, sampleLine, cellKey, insideBbox } = require('../src/services/geoUtils');

test('distanceM: 0.001° de latitud son ~111 m', () => {
  const d = distanceM([-74.8031, 4.3014], [-74.8031, 4.3024]);
  assert.ok(d > 110 && d < 112, `distancia inesperada: ${d}`);
});

test('sampleLine: una línea de ~111 m muestreada cada 30 m da 5 puntos (0, 30, 60, 90 y el final)', () => {
  const samples = sampleLine([[-74.8031, 4.3014], [-74.8031, 4.3024]], 30);
  assert.equal(samples.length, 5);
  assert.deepEqual(samples[0], [-74.8031, 4.3014]);
  assert.deepEqual(samples[samples.length - 1], [-74.8031, 4.3024]);
});

test('sampleLine: línea vacía devuelve arreglo vacío', () => {
  assert.deepEqual(sampleLine([], 30), []);
});

test('cellKey: redondea a 3 decimales en formato lat_lng', () => {
  assert.equal(cellKey(-74.80312, 4.30149), '4.301_-74.803');
});

test('insideBbox: detecta puntos dentro y fuera de Girardot', () => {
  const city = { bbox_south: 4.28, bbox_west: -74.83, bbox_north: 4.325, bbox_east: -74.77 };
  assert.equal(insideBbox([-74.8031, 4.3014], city), true);
  assert.equal(insideBbox([-74.08, 4.6], city), false); // Bogotá
});
