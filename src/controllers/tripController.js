const Trip = require('../models/Trip');
const TripRating = require('../models/TripRating');
const SegmentScore = require('../models/SegmentScore');
const EmergencyContact = require('../models/EmergencyContact');
const User = require('../models/User');
const { sampleLine, cellKey } = require('../services/geoUtils');
const { collectErrors } = require('../middleware/validators');
const { isApi } = require('../middleware/auth');

const notFound = (res) => res.status(404).json({ ok: false, error: 'No encontramos ese recorrido.' });

// POST /api/trips → guarda la ruta elegida e inicia el recorrido
async function create(req, res) {
  const errors = collectErrors(req);
  if (errors) return res.status(400).json({ ok: false, error: Object.values(errors)[0] });
  const trip = await Trip.create(req.user.id, req.body);
  res.status(201).json({ ok: true, data: { id: trip.id } });
}

// GET /api/trips → historial de la usuaria
async function list(req, res) {
  res.json({ ok: true, data: await Trip.listForUser(req.user.id) });
}

// PATCH /api/trips/:id/finish  body: { status: 'completed' | 'cancelled' }
async function finish(req, res) {
  const status = req.body.status === 'cancelled' ? 'cancelled' : 'completed';
  const trip = await Trip.finish(req.params.id, req.user.id, status);
  if (!trip) return notFound(res);
  res.json({ ok: true, data: { id: trip.id, status } });
}

// POST /trip/:id/rate (formulario) o /api/trips/:id/rating → guarda estrellas y alimenta segment_scores
async function rate(req, res) {
  const trip = await Trip.findForUser(req.params.id, req.user.id);
  if (!trip) return isApi(req) ? notFound(res) : res.redirect('/history');

  const errors = collectErrors(req);
  if (errors) {
    if (isApi(req)) return res.status(400).json({ ok: false, error: Object.values(errors)[0] });
    return res.status(400).render('trip-rate', { title: 'Califica tu recorrido', trip, errors });
  }

  const rating = await TripRating.create({ tripId: trip.id, userId: req.user.id, stars: req.body.stars, comment: req.body.comment });
  if (rating) {
    // Cada celda de ~100 m por la que pasó la ruta recibe estas estrellas (retroalimenta el puntaje)
    const cells = [...new Set(sampleLine(trip.geometry.coordinates, 30).map((p) => cellKey(p[0], p[1])))];
    await SegmentScore.addRating(cells, req.body.stars);
  }
  await Trip.finish(trip.id, req.user.id, 'completed');

  if (isApi(req)) return res.status(201).json({ ok: true, data: { saved: Boolean(rating) } });
  res.redirect('/history?calificado=1');
}

// ---------- Vistas ----------
async function showTrip(req, res) {
  const trip = await Trip.findForUser(req.params.id, req.user.id);
  if (!trip) return res.redirect('/map');
  const [contacts, profile] = await Promise.all([EmergencyContact.countForUser(req.user.id), User.findById(req.user.id)]);
  res.render('trip-active', {
    title: 'Recorrido en curso', trip, contacts, inactivityMinutes: profile.inactivity_minutes, leaflet: true
  });
}

async function showRate(req, res) {
  const trip = await Trip.findForUser(req.params.id, req.user.id);
  if (!trip) return res.redirect('/history');
  const existing = await TripRating.findByTrip(trip.id);
  if (existing) return res.redirect('/history');
  res.render('trip-rate', { title: 'Califica tu recorrido', trip, errors: {} });
}

async function showHistory(req, res) {
  const trips = await Trip.listForUser(req.user.id);
  res.render('history', { title: 'Tus recorridos', trips, rated: req.query.calificado === '1' });
}

module.exports = { create, list, finish, rate, showTrip, showRate, showHistory };
