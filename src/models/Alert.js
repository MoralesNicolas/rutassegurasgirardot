const db = require('../config/db');

async function create({ userId, tripId, lat, lng, reason, contactsNotified, simulated }) {
  const { rows } = await db.query(
    `INSERT INTO alerts (user_id, trip_id, lat, lng, reason, contacts_notified, simulated)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, created_at`,
    [userId, tripId, lat, lng, reason, contactsNotified, simulated]
  );
  return rows[0];
}

module.exports = { create };
