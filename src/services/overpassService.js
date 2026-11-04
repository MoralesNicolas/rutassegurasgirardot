// Datos abiertos de OpenStreetMap vía Overpass API: estaciones de policía, comercios 24 h y luminarias.
// Se ejecuta con "npm run osm:sync" y el resultado se guarda en safe_points (caché en la BD).
// Servidor principal y un espejo de respaldo (el principal a veces está saturado)
const OVERPASS_URLS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter'
];

function buildQuery(city) {
  const bbox = `${city.bbox_south},${city.bbox_west},${city.bbox_north},${city.bbox_east}`;
  return `[out:json][timeout:25];
(
  node["amenity"="police"](${bbox});
  way["amenity"="police"](${bbox});
  node["highway"="street_lamp"](${bbox});
  node["opening_hours"="24/7"](${bbox});
  way["opening_hours"="24/7"](${bbox});
);
out center 800;`;
}

function classify(tags) {
  if (tags.amenity === 'police') return 'estacion_policia';
  if (tags.highway === 'street_lamp') return 'luminaria';
  return 'comercio_24h';
}

const DEFAULT_NAMES = {
  estacion_policia: 'Policía (OSM)',
  luminaria: 'Luminaria (OSM)',
  comercio_24h: 'Lugar abierto 24 h (OSM)'
};

async function queryOverpass(query) {
  let lastError;
  for (const url of OVERPASS_URLS) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'RutaSeguraGirardot/1.0' },
        body: 'data=' + encodeURIComponent(query),
        signal: AbortSignal.timeout(45000)
      });
      if (!res.ok) throw new Error(`Overpass respondió ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn(`[overpass] ${url} falló: ${err.message}`);
      lastError = err;
    }
  }
  throw lastError;
}

async function fetchSafePoints(city) {
  const data = await queryOverpass(buildQuery(city));
  return data.elements
    .map((el) => {
      const lat = el.lat ?? (el.center && el.center.lat);
      const lng = el.lon ?? (el.center && el.center.lon);
      const tags = el.tags || {};
      const type = classify(tags);
      return { osmId: `${el.type}/${el.id}`, type, lat, lng, name: (tags.name || DEFAULT_NAMES[type]).slice(0, 120) };
    })
    .filter((p) => typeof p.lat === 'number' && typeof p.lng === 'number');
}

module.exports = { fetchSafePoints };
