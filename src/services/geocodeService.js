// Búsqueda de lugares con Nominatim (OpenStreetMap), limitada al recuadro de la ciudad.
// Host fijo (A10 SSRF) y solo se consulta cuando la usuaria pulsa "Buscar" (política de uso de Nominatim).
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

async function search(q, city) {
  const params = new URLSearchParams({
    q,
    format: 'jsonv2',
    limit: '5',
    countrycodes: 'co',
    bounded: '1',
    viewbox: `${city.bbox_west},${city.bbox_north},${city.bbox_east},${city.bbox_south}`,
    'accept-language': 'es'
  });
  try {
    const res = await fetch(`${NOMINATIM_URL}?${params}`, {
      headers: { 'User-Agent': 'RutaSeguraGirardot/1.0 (maraton UCundinamarca)' },
      signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) throw new Error(`Nominatim respondió ${res.status}`);
    const data = await res.json();
    return data.map((r) => ({
      label: r.display_name.split(',').slice(0, 3).join(','),
      lat: Number(r.lat),
      lng: Number(r.lon)
    }));
  } catch (err) {
    console.warn('[geocode]', err.message);
    return [];
  }
}

module.exports = { search };
