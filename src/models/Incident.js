const db = require('../config/db');

async function create({ userId, cityId, lat, lng, type, description }) {
  const { rows } = await db.query(
    `INSERT INTO incidents (user_id, city_id, lat, lng, type, description)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, status`,
    [userId, cityId, lat, lng, type, description || null]
  );
  return rows[0];
}

// Para moderación: primero los pendientes. No exponemos quién reportó (el reporte es anónimo hacia afuera)
async function listForModeration() {
  const { rows } = await db.query(
    `SELECT id, city_id, lat, lng, type, description, status, created_at FROM incidents
     ORDER BY (status = 'pending') DESC, created_at DESC LIMIT 100`
  );
  return rows;
}

async function findById(id) {
  const { rows } = await db.query('SELECT * FROM incidents WHERE id = $1', [id]);
  return rows[0] || null;
}

async function setStatus(id, status) {
  await db.query('UPDATE incidents SET status = $2 WHERE id = $1', [id, status]);
}

module.exports = { create, listForModeration, findById, setStatus };
