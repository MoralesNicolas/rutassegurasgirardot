const { body, validationResult } = require('express-validator');

// Reglas de validación en el servidor (A03). La salida se escapa en EJS con <%= %>.
const registerRules = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Escribe tu nombre (mínimo 2 letras).'),
  body('email').trim().toLowerCase().isEmail().withMessage('Escribe un correo válido, por ejemplo nombre@correo.com.')
    .isLength({ max: 150 }).withMessage('El correo es demasiado largo.'),
  body('password')
    .isLength({ min: 10, max: 72 }).withMessage('La contraseña debe tener entre 10 y 72 caracteres.')
    .matches(/[A-Za-zÁÉÍÓÚáéíóúÑñ]/).withMessage('La contraseña debe incluir al menos una letra.')
    .matches(/\d/).withMessage('La contraseña debe incluir al menos un número.'),
  body('acceptPolicy').equals('on').withMessage('Para crear la cuenta debes aceptar el tratamiento de datos.')
];

const loginRules = [
  body('email').trim().toLowerCase().isEmail().withMessage('Escribe un correo válido.'),
  body('password').isLength({ min: 1, max: 72 }).withMessage('Escribe tu contraseña.')
];

// Coordenadas: números reales dentro de rangos válidos (nunca texto libre hacia las APIs externas)
const latLng = (field, label) => [
  body(`${field}.lat`).isFloat({ min: -90, max: 90 }).withMessage(`Marca ${label} en el mapa.`).toFloat(),
  body(`${field}.lng`).isFloat({ min: -180, max: 180 }).withMessage(`Marca ${label} en el mapa.`).toFloat()
];

const computeRouteRules = [...latLng('origin', 'el punto de partida'), ...latLng('destination', 'el destino')];

const tripRules = [
  body('routeType').isIn(['safe', 'fast']).withMessage('Elige la ruta segura o la rápida.'),
  ...latLng('origin', 'el punto de partida'),
  ...latLng('destination', 'el destino'),
  body(['origin.label', 'destination.label']).optional().isString().trim().isLength({ max: 200 }),
  body('geometry.type').equals('LineString').withMessage('La ruta no es válida. Trázala de nuevo.'),
  body('geometry.coordinates').isArray({ min: 2, max: 10000 }).withMessage('La ruta no es válida. Trázala de nuevo.')
    .custom((coords) => coords.every((c) => Array.isArray(c) && c.length >= 2 && c.every(Number.isFinite)))
    .withMessage('La ruta no es válida. Trázala de nuevo.'),
  body('score').isInt({ min: 0, max: 100 }).toInt(),
  body('durationS').isInt({ min: 0, max: 86400 }).toInt(),
  body('distanceM').isInt({ min: 0, max: 200000 }).toInt()
];

const ratingRules = [
  body('stars').isInt({ min: 1, max: 5 }).withMessage('Elige de 1 a 5 estrellas.').toInt(),
  body('comment').optional({ values: 'falsy' }).isString().trim().isLength({ max: 500 }).withMessage('El comentario puede tener máximo 500 caracteres.')
];

const contactRules = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Escribe el nombre de tu contacto.'),
  body('phone').trim().matches(/^\+?[0-9 ]{7,20}$/).withMessage('Escribe un celular válido, por ejemplo 3001234567.'),
  body('email').optional({ values: 'falsy' }).trim().isEmail().withMessage('El correo no es válido.').isLength({ max: 150 })
];

const incidentRules = [
  body('lat').isFloat({ min: -90, max: 90 }).withMessage('Marca el punto en el mapa.').toFloat(),
  body('lng').isFloat({ min: -180, max: 180 }).withMessage('Marca el punto en el mapa.').toFloat(),
  body('type').isIn(['acoso', 'hurto', 'sin_luz', 'zona_sola', 'otro']).withMessage('Elige qué tipo de problema viste.'),
  body('description').optional({ values: 'falsy' }).isString().trim().isLength({ max: 300 }).withMessage('Máximo 300 caracteres.')
];

const settingsRules = [
  body('inactivityMinutes').isInt({ min: 1, max: 60 }).withMessage('Elige entre 1 y 60 minutos.').toInt()
];

// Devuelve { campo: mensaje } con el primer error de cada campo, o null si todo está bien
function collectErrors(req) {
  const result = validationResult(req);
  if (result.isEmpty()) return null;
  const errors = {};
  for (const e of result.array()) {
    if (!errors[e.path]) errors[e.path] = e.msg;
  }
  return errors;
}

module.exports = {
  registerRules, loginRules, computeRouteRules, tripRules, ratingRules, contactRules, incidentRules, settingsRules,
  latLng, collectErrors
};
