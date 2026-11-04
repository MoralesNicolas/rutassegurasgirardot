const app = require('./app');
const env = require('./config/env');

app.listen(env.PORT, () => {
  console.log(`RutaSegura Girardot escuchando en http://localhost:${env.PORT} (${env.NODE_ENV})`);
});
