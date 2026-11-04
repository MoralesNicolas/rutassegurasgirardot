const authService = require('../services/authService');

// ¿La petición es a la API JSON? (para responder JSON en vez de una vista)
function isApi(req) {
  return req.originalUrl.startsWith('/api/');
}

// Lee el JWT de la cookie (si existe) y deja a la usuaria en req.user y en las vistas
function loadUser(req, res, next) {
  req.user = null;
  const token = req.cookies && req.cookies.token;
  if (token) {
    try {
      const payload = authService.verifyToken(token);
      req.user = { id: payload.sub, role: payload.role, name: payload.name };
    } catch (err) {
      res.clearCookie('token'); // token vencido o alterado
    }
  }
  res.locals.user = req.user;
  next();
}

// Exige sesión: en la API responde 401, en las vistas redirige a /login
function requireAuth(req, res, next) {
  if (req.user) return next();
  if (isApi(req)) {
    return res.status(401).json({ ok: false, error: 'Tu sesión terminó. Inicia sesión de nuevo.' });
  }
  return res.redirect('/login');
}

module.exports = { isApi, loadUser, requireAuth };
