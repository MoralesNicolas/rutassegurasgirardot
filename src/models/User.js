const db = require('../config/db');

// Campos que se pueden exponer (nunca el password_hash)
const PUBLIC_FIELDS = 'id, name, email, role, city_id, inactivity_minutes, consent_location, onboarding_done, created_at';

async function findByEmail(email) {
  const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [email]);
  return rows[0] || null;
}

async function findById(id) {
  const { rows } = await db.query(`SELECT ${PUBLIC_FIELDS} FROM users WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function create({ name, email, passwordHash, cityId }) {
  const { rows } = await db.query(
    `INSERT INTO users (name, email, password_hash, city_id)
     VALUES ($1, $2, $3, $4) RETURNING ${PUBLIC_FIELDS}`,
    [name, email, passwordHash, cityId]
  );
  return rows[0];
}

async function completeOnboarding(id, consentLocation) {
  await db.query(
    'UPDATE users SET onboarding_done = TRUE, consent_location = $2 WHERE id = $1',
    [id, consentLocation]
  );
}

async function updateSettings(id, { inactivityMinutes, consentLocation }) {
  const { rows } = await db.query(
    `UPDATE users SET inactivity_minutes = $2, consent_location = $3 WHERE id = $1 RETURNING ${PUBLIC_FIELDS}`,
    [id, inactivityMinutes, consentLocation]
  );
  return rows[0];
}

// Derecho a la supresión (Ley 1581): borra la cuenta y, en cascada, sus datos
async function remove(id) {
  await db.query('DELETE FROM users WHERE id = $1', [id]);
}

module.exports = { findByEmail, findById, create, completeOnboarding, updateSettings, remove };
