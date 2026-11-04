const db = require('../config/db');

async function findByCity(cityId) {
  const { rows } = await db.query(
    'SELECT id, name, lat, lng, radius_m, level, reason, source FROM risk_zones WHERE city_id = $1 ORDER BY level DESC',
    [cityId]
  );
  return rows;
}

// Al aprobar un reporte de incidente se crea una zona de origen 'comunidad'
async function create({ cityId, name, lat, lng, radiusM, level, reason, source }) {
  const { rows } = await db.query(
    `INSERT INTO risk_zones (city_id, name, lat, lng, radius_m, level, reason, source)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [cityId, name, lat, lng, radiusM, level, reason, source]
  );
  return rows[0];
}

module.exports = { findByCity, create };
