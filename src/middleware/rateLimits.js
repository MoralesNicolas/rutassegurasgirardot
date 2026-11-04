const rateLimit = require('express-rate-limit');
const SecurityEvent = require('../models/SecurityEvent');
const { isApi } = require('./auth');

function tooMany(message) {
  return (req, res) => {
    SecurityEvent.log('limite_de_intentos', { ip: req.ip, detail: req.originalUrl });
    if (isApi(req)) return res.status(429).json({ ok: false, error: message });
    res.status(429).render('errors/error', { title: 'Demasiados intentos', code: 429, message });
  };
}

// A07: máximo 10 intentos fallidos de login/registro cada 15 minutos por IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: tooMany('Demasiados intentos. Espera 15 minutos e inténtalo de nuevo.')
});

// Límite general de la API para frenar abusos (y proteger la cuota de las APIs externas)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: tooMany('Hiciste muchas solicitudes seguidas. Espera unos minutos.')
});

module.exports = { authLimiter, apiLimiter };
