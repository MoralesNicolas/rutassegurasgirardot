const db = require('../config/db');

// Una calificación por recorrido (trip_id es UNIQUE). Devuelve null si ya existía.
async function create({ tripId, userId, stars, comment }) {
  const { rows } = await db.query(
    `INSERT INTO trip_ratings (trip_id, user_id, stars, comment) VALUES ($1, $2, $3, $4)
     ON CONFLICT (trip_id) DO NOTHING RETURNING id`,
    [tripId, userId, stars, comment || null]
  );
  return rows[0] || null;
}

async function findByTrip(tripId) {
  const { rows } = await db.query('SELECT * FROM trip_ratings WHERE trip_id = $1', [tripId]);
  return rows[0] || null;
}

module.exports = { create, findByTrip };
