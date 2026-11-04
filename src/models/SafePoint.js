const db = require('../config/db');

async function findByCity(cityId) {
  const { rows } = await db.query(
    'SELECT id, name, type, lat, lng, source FROM safe_points WHERE city_id = $1',
    [cityId]
  );
  return rows;
}

// Guarda en caché los puntos traídos de OpenStreetMap (no consultamos Overpass en cada petición)
async function upsertFromOsm(cityId, points) {
  let saved = 0;
  for (const p of points) {
    const result = await db.query(
      `INSERT INTO safe_points (city_id, name, type, lat, lng, source, osm_id)
       VALUES ($1, $2, $3, $4, $5, 'osm', $6)
       ON CONFLICT (osm_id) DO UPDATE SET name = EXCLUDED.name, type = EXCLUDED.type,
         lat = EXCLUDED.lat, lng = EXCLUDED.lng`,
      [cityId, p.name, p.type, p.lat, p.lng, p.osmId]
    );
    saved += result.rowCount;
  }
  return saved;
}

module.exports = { findByCity, upsertFromOsm };
