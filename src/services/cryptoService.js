// Cifrado en reposo de datos sensibles (teléfono y correo de los contactos) con AES-256-GCM.
// GCM además de cifrar detecta si alguien alteró el dato (etiqueta de autenticación).
const crypto = require('crypto');
const env = require('../config/env');

const KEY = env.DATA_KEY ? Buffer.from(env.DATA_KEY, 'hex') : null;
if (KEY && KEY.length !== 32) throw new Error('DATA_KEY debe tener 64 caracteres hexadecimales (32 bytes)');

// Formato guardado: iv:tag:texto_cifrado (en base64)
function encrypt(plain) {
  if (plain === null || plain === undefined || plain === '') return null;
  if (!KEY) throw new Error('Falta DATA_KEY para cifrar datos sensibles');
  const iv = crypto.randomBytes(12); // IV único por cada dato
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  const encrypted = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((b) => b.toString('base64')).join(':');
}

function decrypt(stored) {
  if (!stored) return null;
  try {
    const [iv, tag, data] = stored.split(':').map((p) => Buffer.from(p, 'base64'));
    const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  } catch (err) {
    // Clave distinta o dato alterado: no tumbamos la app, solo ocultamos el valor
    console.error('[cifrado] no se pudo descifrar un dato:', err.message);
    return '(no disponible)';
  }
}

module.exports = { encrypt, decrypt };
