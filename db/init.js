// npm run db:init → crea las tablas, carga los datos demo y crea las cuentas de prueba.
// Las contraseñas de prueba vienen de .env y se guardan HASHEADAS con bcrypt (nunca en texto plano).
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const env = require('../src/config/env');
const db = require('../src/config/db');

async function main() {
  if (!env.DATABASE_URL) throw new Error('Falta DATABASE_URL en el archivo .env');
  const adminPass = process.env.SEED_ADMIN_PASSWORD;
  const userPass = process.env.SEED_USER_PASSWORD;
  if (!adminPass || !userPass) throw new Error('Faltan SEED_ADMIN_PASSWORD o SEED_USER_PASSWORD en .env');

  await db.query(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
  console.log('✔ Tablas creadas');
  await db.query(fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf8'));
  console.log('✔ Datos demo cargados (ciudad, zonas y puntos seguros)');

  const city = await db.query('SELECT id FROM cities WHERE slug = $1', [env.DEFAULT_CITY]);
  const cityId = city.rows[0].id;
  const insert = `INSERT INTO users (name, email, password_hash, role, city_id, onboarding_done, consent_location)
                  VALUES ($1, $2, $3, $4, $5, $6, $7)`;
  await db.query(insert, ['Equipo de moderación', 'admin@rutasegura.test', await bcrypt.hash(adminPass, 11), 'admin', cityId, true, false]);
  await db.query(insert, ['Laura Gómez', 'laura@rutasegura.test', await bcrypt.hash(userPass, 11), 'user', cityId, false, false]);
  console.log('✔ Cuentas de prueba: admin@rutasegura.test y laura@rutasegura.test');
}

main()
  .catch((err) => {
    console.error('✘ Error inicializando la base de datos:', err.message);
    process.exitCode = 1;
  })
  .finally(() => db.pool.end());
