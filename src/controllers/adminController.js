const Incident = require('../models/Incident');
const RiskZone = require('../models/RiskZone');
const SecurityEvent = require('../models/SecurityEvent');

const TYPE_TEXT = { acoso: 'Acoso', hurto: 'Hurto', sin_luz: 'Sin luz', zona_sola: 'Zona sola', otro: 'Otro' };
// Cómo se traduce un reporte aprobado en una zona del mapa (factor + nivel de 1 a 5)
const TO_ZONE = {
  acoso: { reason: 'reportes', level: 4 },
  hurto: { reason: 'hurto', level: 4 },
  sin_luz: { reason: 'poca_iluminacion', level: 3 },
  zona_sola: { reason: 'aislamiento', level: 3 },
  otro: { reason: 'reportes', level: 2 }
};

async function showIncidents(req, res) {
  const incidents = await Incident.listForModeration();
  res.render('admin/incidents', { title: 'Moderación', incidents, TYPE_TEXT, done: req.query.ok });
}

// POST /admin/incidents/:id  body: { action: 'approve' | 'reject' }
async function review(req, res) {
  const incident = await Incident.findById(req.params.id);
  if (!incident || incident.status !== 'pending') return res.redirect('/admin/incidents');

  if (req.body.action === 'approve') {
    const z = TO_ZONE[incident.type] || TO_ZONE.otro;
    await RiskZone.create({
      cityId: incident.city_id,
      name: `Reporte comunitario: ${TYPE_TEXT[incident.type] || 'Otro'}`,
      lat: incident.lat,
      lng: incident.lng,
      radiusM: 120,
      level: z.level,
      reason: z.reason,
      source: 'comunidad'
    });
    await Incident.setStatus(incident.id, 'approved');
  } else {
    await Incident.setStatus(incident.id, 'rejected');
  }
  SecurityEvent.log('moderacion', { userId: req.user.id, ip: req.ip, detail: `incidente ${incident.id}: ${req.body.action}` });
  res.redirect('/admin/incidents?ok=1');
}

module.exports = { showIncidents, review };
