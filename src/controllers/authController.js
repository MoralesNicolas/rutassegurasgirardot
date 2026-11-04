const authService = require('../services/authService');
const SecurityEvent = require('../models/SecurityEvent');
const { collectErrors } = require('../middleware/validators');
const { isApi } = require('../middleware/auth');

const TITLES = { 'auth/login': 'Inicia sesión', 'auth/register': 'Crea tu cuenta' };

// Responde un error: JSON en la API, o la misma vista con los mensajes junto a cada campo
function fail(req, res, view, status, errors, values) {
  if (isApi(req)) {
    return res.status(status).json({ ok: false, error: Object.values(errors)[0], fields: errors });
  }
  res.status(status).render(view, { title: TITLES[view], errors, values });
}

function startSession(res, user) {
  res.cookie('token', authService.signToken(user), authService.cookieOptions());
}

function showLogin(req, res) {
  if (req.user) return res.redirect('/map');
  res.render('auth/login', { title: TITLES['auth/login'], errors: {}, values: {} });
}

function showRegister(req, res) {
  if (req.user) return res.redirect('/map');
  res.render('auth/register', { title: TITLES['auth/register'], errors: {}, values: {} });
}

async function register(req, res) {
  const values = { name: req.body.name, email: req.body.email };
  const errors = collectErrors(req);
  if (errors) return fail(req, res, 'auth/register', 400, errors, values);

  const result = await authService.register(req.body);
  if (result.error) return fail(req, res, 'auth/register', 409, { email: result.error }, values);

  startSession(res, result.user);
  if (isApi(req)) return res.status(201).json({ ok: true, data: { id: result.user.id, name: result.user.name } });
  res.redirect('/onboarding');
}

async function login(req, res) {
  const values = { email: req.body.email };
  const errors = collectErrors(req);
  if (errors) return fail(req, res, 'auth/login', 400, errors, values);

  const user = await authService.login(req.body.email, req.body.password);
  if (!user) {
    SecurityEvent.log('login_fallido', { ip: req.ip, detail: req.body.email });
    // Mensaje genérico: no decimos si el correo existe (A07)
    return fail(req, res, 'auth/login', 401, { form: 'El correo o la contraseña no coinciden.' }, values);
  }

  startSession(res, user);
  if (isApi(req)) return res.json({ ok: true, data: { id: user.id, name: user.name, role: user.role } });
  res.redirect(user.onboarding_done ? '/map' : '/onboarding');
}

function logout(req, res) {
  res.clearCookie('token', { path: '/' });
  res.redirect('/login');
}

module.exports = { showLogin, showRegister, register, login, logout };
