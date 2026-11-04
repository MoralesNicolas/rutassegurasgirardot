const db = require('../config/db');

// La tabla cities permite replicar la app a otros municipios sin cambiar código
async function findBySlug(slug) {
  const { rows } = await db.query('SELECT * FROM cities WHERE slug = $1 AND active = TRUE', [slug]);
  return rows[0] || null;
}

async function findById(id) {
  const { rows } = await db.query('SELECT * FROM cities WHERE id = $1', [id]);
  return rows[0] || null;
}

module.exports = { findBySlug, findById };
