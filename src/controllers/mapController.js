const env = require('../config/env');
const City = require('../models/City');
const RiskZone = require('../models/RiskZone');
const SafePoint = require('../models/SafePoint');
const geocodeService = require('../services/geocodeService');

// Pantalla principal: el mapa. Los datos de las capas llegan por /api/map/layers
async function showMap(req, res) {
  const city = await City.findBySlug(env.DEFAULT_CITY);
  res.render('map', { title: 'Tu ruta', city, leaflet: true });
}

// GET /api/map/layers?city=girardot → zonas de riesgo + puntos seguros de la ciudad
async function layers(req, res) {
  const city = await City.findBySlug(req.query.city || env.DEFAULT_CITY);
  if (!city) return res.status(404).json({ ok: false, error: 'Esa ciudad todavía no está disponible.' });
  const [riskZones, safePoints] = await Promise.all([RiskZone.findByCity(city.id), SafePoint.findByCity(city.id)]);
  res.json({ ok: true, data: { city, riskZones, safePoints } });
}

// GET /api/geocode?q=... → busca lugares dentro de Girardot (alternativa al clic en el mapa)
async function geocode(req, res) {
  const q = String(req.query.q || '').trim();
  if (q.length < 3 || q.length > 120) {
    return res.status(400).json({ ok: false, error: 'Escribe al menos 3 letras del lugar que buscas.' });
  }
  const city = await City.findBySlug(env.DEFAULT_CITY);
  const results = await geocodeService.search(q, city);
  res.json({ ok: true, data: results });
}

module.exports = { showMap, layers, geocode };
