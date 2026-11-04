const User = require('../models/User');

function showOnboarding(req, res) {
  res.render('onboarding', { title: 'Bienvenida' });
}

// Paso 3 del onboarding: guarda el consentimiento de ubicación (Ley 1581) y marca el tutorial como visto
async function finishOnboarding(req, res) {
  const consent = req.body.consentLocation === 'on';
  await User.completeOnboarding(req.user.id, consent);
  res.redirect('/map');
}

module.exports = { showOnboarding, finishOnboarding };
