const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { wrap } = require('../middleware/errorHandler');
const { authLimiter } = require('../middleware/rateLimits');
const { registerRules, loginRules, ratingRules, contactRules, settingsRules } = require('../middleware/validators');
const authController = require('../controllers/authController');
const mapController = require('../controllers/mapController');
const userController = require('../controllers/userController');
const tripController = require('../controllers/tripController');
const contactController = require('../controllers/contactController');
const adminController = require('../controllers/adminController');
const requireRole = require('../middleware/requireRole');

const router = express.Router();

router.get('/', (req, res) => res.redirect(req.user ? '/map' : '/login'));

// Autenticación (formularios)
router.get('/login', authController.showLogin);
router.post('/login', authLimiter, loginRules, wrap(authController.login));
router.get('/register', authController.showRegister);
router.post('/register', authLimiter, registerRules, wrap(authController.register));
router.post('/logout', requireAuth, authController.logout);
router.get('/privacidad', (req, res) => res.render('privacy', { title: 'Tus datos' }));

// Pantallas protegidas (los :id solo aceptan números)
router.get('/onboarding', requireAuth, userController.showOnboarding);
router.post('/onboarding', requireAuth, wrap(userController.finishOnboarding));
router.get('/map', requireAuth, wrap(mapController.showMap));
router.get('/trip/:id(\\d+)', requireAuth, wrap(tripController.showTrip));
router.get('/trip/:id(\\d+)/rate', requireAuth, wrap(tripController.showRate));
router.post('/trip/:id(\\d+)/rate', requireAuth, ratingRules, wrap(tripController.rate));
router.get('/history', requireAuth, wrap(tripController.showHistory));

// Mi red de confianza, ajustes y borrado de cuenta (Ley 1581)
router.get('/contacts', requireAuth, wrap(contactController.show));
router.post('/contacts', requireAuth, contactRules, wrap(contactController.create));
router.post('/contacts/:id(\\d+)/delete', requireAuth, wrap(contactController.remove));
router.post('/settings', requireAuth, settingsRules, wrap(contactController.updateSettings));
router.post('/account/delete', requireAuth, wrap(contactController.deleteAccount));

// Moderación: solo rol admin (A01, validado en el servidor)
router.get('/admin/incidents', requireAuth, requireRole('admin'), wrap(adminController.showIncidents));
router.post('/admin/incidents/:id(\\d+)', requireAuth, requireRole('admin'), wrap(adminController.review));

module.exports = router;
