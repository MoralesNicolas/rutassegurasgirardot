const SecurityEvent = require('../models/SecurityEvent');
const { isApi } = require('./auth');

// A01: la autorización por rol se valida en el backend (ocultar un botón no basta)
function requireRole(...roles) {
  return (req, res, next) => {
    if (req.user && roles.includes(req.user.role)) return next();

    SecurityEvent.log('acceso_denegado', { userId: req.user && req.user.id, ip: req.ip, detail: req.originalUrl });
    if (isApi(req)) {
      return res.status(403).json({ ok: false, error: 'No tienes permiso para esta acción.' });
    }
    return res.status(403).render('errors/error', {
      title: 'Sin permiso',
      code: 403,
      message: 'Esta sección es solo para el equipo de moderación.'
    });
  };
}

module.exports = requireRole;
