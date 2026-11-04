const { isApi } = require('./auth');

// Envuelve controladores async para que sus errores lleguen al manejador central (Express 4)
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function notFound(req, res) {
  if (isApi(req)) return res.status(404).json({ ok: false, error: 'Recurso no encontrado.' });
  res.status(404).render('errors/error', {
    title: 'Página no encontrada',
    code: 404,
    message: 'Esta página no existe. Vuelve al mapa para trazar tu ruta.'
  });
}

// Manejador central: registra el detalle en consola pero nunca muestra el stack trace a la usuaria (A05)
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error('[error]', err.stack || err.message);
  const status = err.status || err.statusCode || 500;
  const message = status < 500
    ? 'La solicitud no es válida. Revisa los datos e intenta de nuevo.'
    : 'Algo salió mal de nuestro lado. Intenta de nuevo en un momento.';

  if (isApi(req)) return res.status(status).json({ ok: false, error: message });
  res.status(status).render('errors/error', { title: 'Error', code: status, message });
}

module.exports = { wrap, notFound, errorHandler };
