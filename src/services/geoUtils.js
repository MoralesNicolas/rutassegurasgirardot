// Utilidades geográficas. Los puntos van en orden GeoJSON: [lng, lat]
const EARTH_RADIUS_M = 6371000;
const toRad = (deg) => (deg * Math.PI) / 180;

// Distancia en metros entre dos puntos (fórmula de haversine)
function distanceM(a, b) {
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

// Recorre la polilínea y devuelve un punto cada `stepM` metros (incluye el inicio y el final)
function sampleLine(coords, stepM = 30) {
  if (!coords || coords.length === 0) return [];
  const samples = [coords[0]];
  let carried = 0; // metros recorridos desde la última muestra
  for (let i = 1; i < coords.length; i++) {
    const a = coords[i - 1];
    const b = coords[i];
    const segment = distanceM(a, b);
    let pos = stepM - carried; // dónde cae la siguiente muestra dentro de este segmento
    while (pos <= segment) {
      const t = pos / segment;
      samples.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
      pos += stepM;
    }
    carried = (carried + segment) % stepM;
  }
  const last = coords[coords.length - 1];
  const prev = samples[samples.length - 1];
  if (prev[0] !== last[0] || prev[1] !== last[1]) samples.push(last);
  return samples;
}

// Celda de ~100 m: lat/lng redondeados a 3 decimales, ej. '4.302_-74.803'
function cellKey(lng, lat) {
  return `${lat.toFixed(3)}_${lng.toFixed(3)}`;
}

// Desplaza un punto `meters` hacia el norte (dy) y el este (dx)
function offsetPoint(point, dxM, dyM) {
  const dLat = dyM / 111320;
  const dLng = dxM / (111320 * Math.cos(toRad(point[1])));
  return [point[0] + dLng, point[1] + dLat];
}

function insideBbox(point, city) {
  return point[1] >= city.bbox_south && point[1] <= city.bbox_north &&
    point[0] >= city.bbox_west && point[0] <= city.bbox_east;
}

module.exports = { distanceM, sampleLine, cellKey, offsetPoint, insideBbox };
