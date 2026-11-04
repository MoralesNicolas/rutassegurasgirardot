const Alert = require('../models/Alert');
const Trip = require('../models/Trip');
const EmergencyContact = require('../models/EmergencyContact');
const SecurityEvent = require('../models/SecurityEvent');
const notificationService = require('../services/notificationService');

// POST /api/alerts/emergency  body: { lat?, lng?, tripId?, reason: 'boton' | 'inactividad' }
// La llamada al 123 la hace el celular (tel:123); aquí registramos la alerta y avisamos a los contactos
async function emergency(req, res) {
  const lat = Number.isFinite(req.body.lat) ? req.body.lat : null;
  const lng = Number.isFinite(req.body.lng) ? req.body.lng : null;
  const reason = req.body.reason === 'inactividad' ? 'inactividad' : 'boton';
  let tripId = null;
  if (req.body.tripId) {
    const trip = await Trip.findForUser(req.body.tripId, req.user.id); // evita marcar recorridos ajenos
    if (trip) { tripId = trip.id; await Trip.markAlert(trip.id, req.user.id); }
  }

  const contacts = await EmergencyContact.listForUser(req.user.id);
  const result = await notificationService.notifyContacts(req.user, contacts, { lat, lng, reason });
  const alert = await Alert.create({
    userId: req.user.id, tripId, lat, lng, reason, contactsNotified: result.notified, simulated: result.simulated
  });
  SecurityEvent.log('alerta_emergencia', { userId: req.user.id, ip: req.ip, detail: `alerta ${alert.id} (${reason})` });

  res.status(201).json({
    ok: true,
    data: {
      alertId: alert.id,
      notified: result.notified,
      simulated: result.simulated,
      message: result.message,
      // Para abrir WhatsApp/SMS con el mensaje ya escrito desde el celular de la usuaria
      contacts: contacts.filter((c) => c.phone).map((c) => ({ name: c.name, phone: c.phone }))
    }
  });
}

module.exports = { emergency };
