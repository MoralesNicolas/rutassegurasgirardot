// Ruteo peatonal con APIs externas. A10 (SSRF): solo llamamos a estos hosts fijos,
// nunca a una URL que envíe el cliente; las coordenadas llegan ya validadas como números.
const env = require('../config/env');

const ORS_URL = 'https://api.openrouteservice.org/v2/directions/foot-walking/geojson';
// OSRM de FOSSGIS con perfil PEATONAL (el OSRM público de project-osrm.org solo calcula en carro)
const OSRM_FOOT_URL = 'https://routing.openstreetmap.de/routed-foot/route/v1/driving/';
const TIMEOUT_MS = 12000;

// OpenRouteService: hasta 3 alternativas (solo cuando son 2 puntos, sin paradas intermedias)
async function fromOrs(points) {
  const body = { coordinates: points };
  if (points.length === 2) body.alternative_routes = { target_count: 3, share_factor: 0.6, weight_factor: 1.6 };
  const res = await fetch(ORS_URL, {
    method: 'POST',
    headers: { Authorization: env.ORS_API_KEY, 'Content-Type': 'application/json', Accept: 'application/geo+json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS)
  });
  if (!res.ok) throw new Error(`ORS respondió ${res.status}`);
  const data = await res.json();
  return data.features.map((f) => ({
    geometry: f.geometry,
    duration_s: Math.round(f.properties.summary.duration || 0),
    distance_m: Math.round(f.properties.summary.distance || 0)
  }));
}

async function fromOsrm(points) {
  const coords = points.map((p) => `${p[0]},${p[1]}`).join(';');
  const alternatives = points.length === 2 ? 3 : 'false';
  const url = `${OSRM_FOOT_URL}${coords}?overview=full&geometries=geojson&alternatives=${alternatives}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'RutaSeguraGirardot/1.0 (maraton UCundinamarca)' },
    signal: AbortSignal.timeout(TIMEOUT_MS)
  });
  if (!res.ok) throw new Error(`OSRM respondió ${res.status}`);
  const data = await res.json();
  if (data.code !== 'Ok') throw new Error(`OSRM: ${data.code}`);
  return data.routes.map((r) => ({
    geometry: r.geometry,
    duration_s: Math.round(r.duration),
    distance_m: Math.round(r.distance)
  }));
}

/**
 * Rutas a pie entre varios puntos [[lng,lat], ...]. Intenta ORS y, si falla o no hay key, OSRM.
 * Devuelve { provider, routes } o lanza un error con mensaje claro para la usuaria.
 */
async function getWalkingRoutes(points) {
  if (env.ORS_API_KEY) {
    try {
      return { provider: 'OpenRouteService', routes: await fromOrs(points) };
    } catch (err) {
      console.warn('[ruteo] ORS falló, uso OSRM:', err.message);
    }
  }
  try {
    return { provider: 'OSRM (FOSSGIS)', routes: await fromOsrm(points) };
  } catch (err) {
    console.error('[ruteo] OSRM también falló:', err.message);
    const e = new Error('No pudimos calcular la ruta en este momento. Revisa tu conexión e intenta de nuevo.');
    e.status = 503;
    e.expose = true;
    throw e;
  }
}

module.exports = { getWalkingRoutes };
