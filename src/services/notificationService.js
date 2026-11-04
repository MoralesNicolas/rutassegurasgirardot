// Avisa a los contactos de confianza cuando la usuaria pide ayuda.
// Sin credenciales de envío configuradas, SIMULA el envío (lo registra en consola) en vez de fallar.
const env = require('../config/env');

function buildMessage(userName, lat, lng, reason) {
  const where = lat && lng ? `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=18/${lat}/${lng}` : 'ubicación no disponible';
  const why = reason === 'inactividad' ? 'no respondió al control de inactividad' : 'pidió ayuda';
  return `RutaSegura: ${userName} ${why}. Última ubicación: ${where}. Si no te responde, llama al 123.`;
}

async function notifyContacts(user, contacts, { lat, lng, reason }) {
  const message = buildMessage(user.name, lat, lng, reason);
  const reachable = contacts.filter((c) => c.phone || c.email);
  if (!env.TELEGRAM_BOT_TOKEN) {
    reachable.forEach((c) => console.log(`[aviso simulado] para ${c.name}: ${message}`));
    return { notified: reachable.length, simulated: true, message };
  }
  // Con TELEGRAM_BOT_TOKEN se enviaría con la API de Telegram a cada telegram_chat_id (trabajo futuro)
  return { notified: 0, simulated: true, message };
}

module.exports = { notifyContacts, buildMessage };
