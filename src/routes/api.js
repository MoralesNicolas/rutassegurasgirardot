const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { wrap } = require('../middleware/errorHandler');
const { authLimiter, apiLimiter } = require('../middleware/rateLimits');
const { registerRules, loginRules, computeRouteRules, tripRules, ratingRules, incidentRules } = require('../middleware/validators');
const incidentController = require('../controllers/incidentController');
const authController = require('../controllers/authController');
const mapController = require('../controllers/mapController');
const routeController = require('../controllers/routeController');
const tripController = require('../controllers/tripController');
const alertController = require('../controllers/alertController');

const router = express.Router();

router.use(apiLimiter);

// Respuestas siempre con la forma { ok: true, data } o { ok: false, error }
router.post('/auth/register', authLimiter, registerRules, wrap(authController.register));
router.post('/auth/login', authLimiter, loginRules, wrap(authController.login));

// Todo lo demás exige sesión
router.use(requireAuth);

router.get('/map/layers', wrap(mapController.layers));
router.get('/geocode', wrap(mapController.geocode));
router.post('/routes/compute', computeRouteRules, wrap(routeController.compute));

router.post('/trips', tripRules, wrap(tripController.create));
router.get('/trips', wrap(tripController.list));
router.patch('/trips/:id(\\d+)/finish', wrap(tripController.finish));
router.post('/trips/:id(\\d+)/rating', ratingRules, wrap(tripController.rate));

router.post('/alerts/emergency', wrap(alertController.emergency));
router.post('/incidents', incidentRules, wrap(incidentController.create));

module.exports = router;
