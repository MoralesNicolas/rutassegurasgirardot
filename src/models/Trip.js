const db = require('../config/db');

// Todas las consultas filtran por user_id: una usuaria nunca ve los recorridos de otra (A01 / IDOR)
async function create(userId, t) {
  const { rows } = await db.query(
    `INSERT INTO trips (user_id, origin_lat, origin_lng, origin_label, dest_lat, dest_lng, dest_label,
       geometry, route_type, safety_score, duration_s, distance_m, last_heartbeat)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW()) RETURNING id`,
    [userId, t.origin.lat, t.origin.lng, t.origin.label, t.destination.lat, t.destination.lng, t.destination.label,
      JSON.stringify(t.geometry), t.routeType, t.score, t.durationS, t.distanceM]
  );
  return rows[0];
}

async function findForUser(id, userId) {
  const { rows } = await db.query('SELECT * FROM trips WHERE id = $1 AND user_id = $2', [id, userId]);
  return rows[0] || null;
}

async function listForUser(userId) {
  const { rows } = await db.query(
    `SELECT t.id, t.origin_label, t.dest_label, t.route_type, t.safety_score, t.duration_s, t.distance_m,
            t.status, t.started_at, t.ended_at, r.stars
     FROM trips t LEFT JOIN trip_ratings r ON r.trip_id = t.id
     WHERE t.user_id = $1 ORDER BY t.started_at DESC LIMIT 50`,
    [userId]
  );
  return rows;
}

async function finish(id, userId, status = 'completed') {
  const { rows } = await db.query(
    `UPDATE trips SET status = $3, ended_at = NOW()
     WHERE id = $1 AND user_id = $2 AND status IN ('active', 'alert') RETURNING id`,
    [id, userId, status]
  );
  return rows[0] || null;
}

async function markAlert(id, userId) {
  await db.query("UPDATE trips SET status = 'alert' WHERE id = $1 AND user_id = $2 AND status = 'active'", [id, userId]);
}

module.exports = { create, findForUser, listForUser, finish, markAlert };
