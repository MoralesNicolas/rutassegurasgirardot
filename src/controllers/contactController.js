const EmergencyContact = require('../models/EmergencyContact');
const User = require('../models/User');
const SecurityEvent = require('../models/SecurityEvent');
const { collectErrors } = require('../middleware/validators');

async function render(req, res, status = 200, extra = {}) {
  const [contacts, profile] = await Promise.all([EmergencyContact.listForUser(req.user.id), User.findById(req.user.id)]);
  res.status(status).render('contacts', {
    title: 'Mi red de confianza', contacts, profile, errors: {}, values: {}, saved: req.query.ok, ...extra
  });
}

const show = (req, res) => render(req, res);

async function create(req, res) {
  const errors = collectErrors(req);
  if (errors) return render(req, res, 400, { errors, values: req.body });
  await EmergencyContact.create(req.user.id, req.body);
  res.redirect('/contacts?ok=contacto');
}

async function remove(req, res) {
  await EmergencyContact.remove(req.params.id, req.user.id);
  res.redirect('/contacts?ok=borrado');
}

async function updateSettings(req, res) {
  const errors = collectErrors(req);
  if (errors) return render(req, res, 400, { errors });
  await User.updateSettings(req.user.id, {
    inactivityMinutes: req.body.inactivityMinutes,
    consentLocation: req.body.consentLocation === 'on'
  });
  res.redirect('/contacts?ok=ajustes');
}

// Ley 1581: derecho a la supresión. Borra la cuenta y en cascada recorridos, contactos y alertas
async function deleteAccount(req, res) {
  await User.remove(req.user.id);
  SecurityEvent.log('cuenta_borrada', { ip: req.ip, detail: `usuaria ${req.user.id}` });
  res.clearCookie('token', { path: '/' });
  res.redirect('/login');
}

module.exports = { show, create, remove, updateSettings, deleteAccount };
