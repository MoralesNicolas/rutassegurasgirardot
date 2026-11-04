// npm run osm:sync → trae puntos seguros reales de OpenStreetMap (Overpass) y los guarda en la BD.
// Si Overpass falla o tiene pocos datos de Girardot, la app sigue funcionando con los datos demo.
const env = require('../src/config/env');
const db = require('../src/config/db');
const City = require('../src/models/City');
const SafePoint = require('../src/models/SafePoint');
const overpassService = require('../src/services/overpassService');

async function main() {
  const city = await City.findBySlug(env.DEFAULT_CITY);
  if (!city) throw new Error('No existe la ciudad. Ejecuta primero npm run db:init');
  console.log(`Consultando Overpass para ${city.name}...`);
  const points = await overpassService.fetchSafePoints(city);
  const byType = points.reduce((acc, p) => ({ ...acc, [p.type]: (acc[p.type] || 0) + 1 }), {});
  console.log('Encontrados en OSM:', byType);
  const saved = await SafePoint.upsertFromOsm(city.id, points);
  console.log(`✔ ${saved} puntos guardados en safe_points (source = 'osm')`);
}

main()
  .catch((err) => {
    console.error('✘ No se pudo sincronizar con OpenStreetMap:', err.message, '→ se usan los datos demo.');
    process.exitCode = 1;
  })
  .finally(() => db.pool.end());
