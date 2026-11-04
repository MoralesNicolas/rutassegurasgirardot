const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');
const City = require('../models/City');

// Costo de bcrypt: 2^11 rondas (OWASP pide ≥ 10). Más alto = más lento para un atacante.
const BCRYPT_COST = 11;
const SESSION_MS = 2 * 60 * 60 * 1000; // 2 horas, igual que JWT_EXPIRES_IN

// Hash ficticio: comparamos aunque el correo no exista para que el tiempo de respuesta
// no revele qué correos están registrados
const DUMMY_HASH = bcrypt.hashSync('contraseña-que-no-existe', BCRYPT_COST);

async function register({ name, email, password }) {
  const existing = await User.findByEmail(email);
  if (existing) return { error: 'Ya existe una cuenta con ese correo. Intenta iniciar sesión.' };

  const city = await City.findBySlug(env.DEFAULT_CITY);
  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  const user = await User.create({ name, email, passwordHash, cityId: city ? city.id : null });
  return { user };
}

// Devuelve la usuaria si el correo y la contraseña coinciden; si no, null (mensaje genérico)
async function login(email, password) {
  const user = await User.findByEmail(email);
  const ok = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH);
  return user && ok ? user : null;
}

function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, name: user.name },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN, algorithm: 'HS256' }
  );
}

function verifyToken(token) {
  return jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
}

// Cookie httpOnly (JS no puede leerla → mitiga XSS), sameSite strict (mitiga CSRF),
// secure en producción (solo viaja por HTTPS)
function cookieOptions() {
  return { httpOnly: true, sameSite: 'strict', secure: env.isProd, maxAge: SESSION_MS, path: '/' };
}

module.exports = { register, login, signToken, verifyToken, cookieOptions };
