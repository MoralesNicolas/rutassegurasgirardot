const { Pool } = require('pg');
const env = require('./env');

// Pool de conexiones a PostgreSQL (Neon en la nube). La cadena incluye sslmode=require.
const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 5
});

pool.on('error', (err) => console.error('[db] error inesperado en el pool:', err.message));

// Todas las consultas pasan por aquí y SIEMPRE con parámetros ($1, $2...) → evita inyección SQL (A03)
function query(text, params) {
  return pool.query(text, params);
}

module.exports = { pool, query };
