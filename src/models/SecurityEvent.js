const db = require('../config/db');

// A09: registro de eventos de seguridad (login fallido, acceso denegado, alertas)
async function log(event, { userId = null, ip = null, detail = null } = {}) {
  console.warn(`[seguridad] ${event}`, userId ? `usuaria=${userId}` : '', detail || '');
  try {
    await db.query(
      'INSERT INTO security_events (event, user_id, ip, detail) VALUES ($1, $2, $3, $4)',
      [event, userId, ip, detail ? String(detail).slice(0, 300) : null]
    );
  } catch (err) {
    console.error('[seguridad] no se pudo guardar el evento:', err.message);
  }
}

module.exports = { log };
