const env = require('../config/env');
const City = require('../models/City');
const routePlanner = require('../services/routePlanner');
const { insideBbox } = require('../services/geoUtils');
const { collectErrors } = require('../middleware/validators');

// POST /api/routes/compute  body: { origin: {lat,lng}, destination: {lat,lng} }
async function compute(req, res) {
  const errors = collectErrors(req);
  if (errors) return res.status(400).json({ ok: false, error: Object.values(errors)[0] });

  const city = await City.findBySlug(env.DEFAULT_CITY);
  const origin = [req.body.origin.lng, req.body.origin.lat];
  const dest = [req.body.destination.lng, req.body.destination.lat];
  if (!insideBbox(origin, city) || !insideBbox(dest, city)) {
    return res.status(400).json({ ok: false, error: 'Por ahora RutaSegura funciona dentro de Girardot. Marca puntos dentro del área del mapa.' });
  }

  try {
    const data = await routePlanner.plan(origin, dest, city);
    res.json({ ok: true, data });
  } catch (err) {
    if (err.expose) return res.status(err.status).json({ ok: false, error: err.message });
    throw err;
  }
}

module.exports = { compute };
