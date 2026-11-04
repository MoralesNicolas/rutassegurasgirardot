const db = require('../config/db');
const { encrypt, decrypt } = require('../services/cryptoService');

// El teléfono y el correo se guardan cifrados (AES-256-GCM) y se descifran solo al leerlos
const toPublic = (row) => ({ id: row.id, name: row.name, phone: decrypt(row.phone), email: decrypt(row.email) });

async function listForUser(userId) {
  const { rows } = await db.query('SELECT * FROM emergency_contacts WHERE user_id = $1 ORDER BY id', [userId]);
  return rows.map(toPublic);
}

async function create(userId, { name, phone, email }) {
  const { rows } = await db.query(
    'INSERT INTO emergency_contacts (user_id, name, phone, email) VALUES ($1, $2, $3, $4) RETURNING *',
    [userId, name, encrypt(phone), encrypt(email)]
  );
  return toPublic(rows[0]);
}

async function remove(id, userId) {
  const { rowCount } = await db.query('DELETE FROM emergency_contacts WHERE id = $1 AND user_id = $2', [id, userId]);
  return rowCount > 0;
}

async function countForUser(userId) {
  const { rows } = await db.query('SELECT COUNT(*)::int AS n FROM emergency_contacts WHERE user_id = $1', [userId]);
  return rows[0].n;
}

module.exports = { listForUser, create, remove, countForUser };
