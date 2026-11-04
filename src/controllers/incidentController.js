const env = require('../config/env');
const City = require('../models/City');
const Incident = require('../models/Incident');
const { insideBbox } = require('../services/geoUtils');
const { collectErrors } = require('../middleware/validators');

// POST /api/incidents → queda 'pending' hasta que el equipo de moderación lo revise
async function create(req, res) {
  const errors = collectErrors(req);
  if (errors) return res.status(400).json({ ok: false, error: Object.values(errors)[0] });
  const city = await City.findBySlug(env.DEFAULT_CITY);
  if (!insideBbox([req.body.lng, req.body.lat], city)) {
    return res.status(400).json({ ok: false, error: 'Marca un punto dentro de Girardot.' });
  }
  const incident = await Incident.create({ userId: req.user.id, cityId: city.id, ...req.body });
  res.status(201).json({ ok: true, data: incident });
}

module.exports = { create };
