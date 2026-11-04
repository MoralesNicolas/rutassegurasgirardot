// Carga y valida las variables de entorno en un solo lugar
require('dotenv').config();

const env = {
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || '',
  JWT_SECRET: process.env.JWT_SECRET || '',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '2h',
  DATA_KEY: process.env.DATA_KEY || '',
  ORS_API_KEY: process.env.ORS_API_KEY || '',
  DEFAULT_CITY: process.env.DEFAULT_CITY || 'girardot',
  APP_URL: process.env.APP_URL || '',
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || ''
};

env.isProd = env.NODE_ENV === 'production';

// Sin un secreto JWT largo no arrancamos: evita tokens firmados con una clave vacía o adivinable
if (env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET falta o es muy corto (mínimo 32 caracteres). Revisa el archivo .env');
}

module.exports = env;
