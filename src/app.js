const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const env = require('./config/env');
const { loadUser } = require('./middleware/auth');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const webRoutes = require('./routes/web');
const apiRoutes = require('./routes/api');

const app = express();

// Azure App Service está detrás de un proxy: así Express ve la IP real y el HTTPS
app.set('trust proxy', 1);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// A05: cabeceras seguras y política de contenido (solo recursos de orígenes conocidos)
app.use(helmet({
  // OpenStreetMap exige el Referer para servir teselas (con 'no-referrer' responde 403).
  // Esta política solo envía el dominio, nunca la ruta ni datos de la página.
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https://tile.openstreetmap.org', 'https://*.tile.openstreetmap.org'],
      connectSrc: ["'self'"],
      upgradeInsecureRequests: env.isProd ? [] : null
    }
  }
}));

// CORS restringido: solo la URL pública de la app (vacío = únicamente mismo origen)
app.use(cors({ origin: env.APP_URL || false }));
app.use(express.json({ limit: '200kb' }));
app.use(express.urlencoded({ extended: false, limit: '50kb' }));
app.use(cookieParser());

app.use(express.static(path.join(__dirname, '..', 'public'), { maxAge: '1h' }));
// Leaflet se sirve desde node_modules: no dependemos de un CDN externo
app.use('/vendor/leaflet', express.static(path.join(__dirname, '..', 'node_modules', 'leaflet', 'dist')));

// Lee el JWT de la cookie y deja a la usuaria disponible en req.user y en las vistas
app.use(loadUser);
app.use((req, res, next) => {
  res.locals.currentPath = req.path;
  next();
});

app.use('/api', apiRoutes);
app.use('/', webRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
