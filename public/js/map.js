// Pantalla principal: mapa, origen/destino y comparación ruta rápida vs. ruta segura
(function () {
  const el = document.getElementById('map');
  if (!el || !window.L) return;

  const $ = (id) => document.getElementById(id);
  const d = el.dataset;
  const bounds = L.latLngBounds([+d.south, +d.west], [+d.north, +d.east]);
  const map = L.map(el, { maxBounds: bounds.pad(0.4), minZoom: 13 }).setView([+d.lat, +d.lng], 15);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map);

  const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const REASON = { poca_iluminacion: 'Poca iluminación', aislamiento: 'Tramo solitario', hurto: 'Reportes de hurto', reportes: 'Reportes ciudadanos' };
  const TYPE = { cai: 'CAI', estacion_policia: 'Policía', comercio_24h: 'Abierto 24 h', luminaria: 'Luminaria' };

  const state = { origin: null, dest: null, picking: 'origin', data: null };
  const markers = {};
  let routeLayers = {};

  // Mensajes de estado: se leen en voz alta con lector de pantalla (aria-live)
  const setStatus = (msg) => { $('status').textContent = msg; };

  // ---------- Capas: zonas de riesgo y puntos seguros ----------
  async function loadLayers() {
    try {
      const res = await fetch('/api/map/layers');
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      const list = $('layer-list');
      const addItem = (text) => { const li = document.createElement('li'); li.textContent = text; list.appendChild(li); };

      json.data.riskZones.forEach((z) => {
        const label = `${REASON[z.reason] || 'Zona con reportes'} · nivel ${z.level} de 5${z.source === 'demo' ? ' (demo)' : ''}`;
        L.circle([z.lat, z.lng], { radius: z.radius_m, color: cssVar('--risk'), weight: 2, dashArray: '6 6', fillOpacity: 0.12 })
          .bindTooltip(esc(label)).addTo(map);
        addItem('Zona: ' + label);
      });
      json.data.safePoints.forEach((p) => {
        const lamp = p.type === 'luminaria';
        L.circleMarker([p.lat, p.lng], {
          radius: lamp ? 4 : 8,
          color: lamp ? cssVar('--lamp') : '#ffffff',
          weight: lamp ? 1 : 2,
          fillColor: lamp ? cssVar('--lamp') : cssVar('--safe'),
          fillOpacity: 1
        }).bindTooltip(esc(p.name)).addTo(map);
        if (!lamp) addItem(`${TYPE[p.type] || 'Punto seguro'}: ${p.name}`);
      });
    } catch (err) {
      setStatus('No pudimos cargar las zonas del mapa. Igual puedes trazar tu ruta.');
    }
  }

  // ---------- Origen y destino ----------
  const pinIcon = (kind) => L.divIcon({ className: 'pin pin-' + kind, html: '<span></span>', iconSize: [28, 28], iconAnchor: [14, 14] });

  function setPoint(kind, latlng, label) {
    state[kind] = { lat: latlng.lat, lng: latlng.lng, label: label || `Punto en el mapa (${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)})` };
    if (markers[kind]) {
      markers[kind].setLatLng(latlng);
    } else {
      markers[kind] = L.marker(latlng, { icon: pinIcon(kind), draggable: true, title: kind === 'origin' ? 'Origen' : 'Destino' }).addTo(map);
      markers[kind].on('dragend', (e) => setPoint(kind, e.target.getLatLng()));
    }
    $(kind + '-value').textContent = state[kind].label;
    state.picking = 'dest';
    $('pick-dest').setAttribute('aria-pressed', 'false');
    clearRoutes();
    $('compute').disabled = !(state.origin && state.dest);
    if (state.origin && state.dest) setStatus('Listo. Pulsa «Trazar ruta segura».');
    else if (state.origin) setStatus('Ahora toca el mapa (o busca) para marcar tu destino.');
    else setStatus('Toca el mapa para marcar desde dónde sales.');
  }

  map.on('click', (e) => {
    if (!bounds.contains(e.latlng)) return setStatus('Ese punto está fuera de Girardot. Marca uno dentro del municipio.');
    if (state.picking === 'report') return setReportPoint(e.latlng);
    setPoint(state.picking === 'origin' || !state.origin ? 'origin' : 'dest', e.latlng);
  });

  // ---------- Reportar un problema (queda pendiente de moderación) ----------
  let reportMarker = null;
  function setReportPoint(latlng) {
    state.report = latlng;
    if (reportMarker) reportMarker.setLatLng(latlng);
    else reportMarker = L.circleMarker(latlng, { radius: 10, color: cssVar('--risk'), weight: 3, fillOpacity: 0.3 }).addTo(map);
    $('report-point').textContent = `Punto elegido (${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)})`;
    $('report-pick').setAttribute('aria-pressed', 'false');
    state.picking = state.origin ? 'dest' : 'origin';
    setStatus('Punto del reporte marcado. Completa el formulario y envíalo.');
  }

  $('report-pick').addEventListener('click', () => {
    state.picking = 'report';
    $('report-pick').setAttribute('aria-pressed', 'true');
    setStatus('Toca el mapa donde está el problema.');
  });

  $('report-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!state.report) return setStatus('Primero elige el punto del problema en el mapa.');
    try {
      const res = await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: state.report.lat, lng: state.report.lng, type: $('report-type').value, description: $('report-desc').value })
      });
      const json = await res.json();
      if (!json.ok) return setStatus(json.error);
      setStatus('Gracias. Tu reporte quedó pendiente de revisión y ayudará a otras mujeres.');
      $('report-desc').value = '';
      state.report = null;
      if (reportMarker) { map.removeLayer(reportMarker); reportMarker = null; }
      $('report-point').textContent = 'Elegir el punto en el mapa';
    } catch (err) {
      setStatus('No pudimos enviar el reporte. Revisa tu conexión.');
    }
  });

  $('use-location').addEventListener('click', () => {
    if (!navigator.geolocation) return setStatus('Tu navegador no permite ubicarte. Toca el mapa para marcar el origen.');
    setStatus('Buscando tu ubicación…');
    navigator.geolocation.getCurrentPosition((pos) => {
      const ll = L.latLng(pos.coords.latitude, pos.coords.longitude);
      if (!bounds.contains(ll)) {
        state.picking = 'origin';
        return setStatus('Parece que no estás en Girardot. Toca el mapa para marcar el origen.');
      }
      setPoint('origin', ll, 'Mi ubicación');
      map.setView(ll, 16);
    }, () => {
      state.picking = 'origin';
      setStatus('No pudimos ubicarte. Toca el mapa para marcar el origen.');
    }, { enableHighAccuracy: true, timeout: 10000 });
  });

  $('pick-dest').addEventListener('click', () => {
    state.picking = 'dest';
    $('pick-dest').setAttribute('aria-pressed', 'true');
    setStatus('Toca el mapa para marcar tu destino.');
  });

  // Búsqueda por nombre: alternativa accesible al clic en el mapa (teclado / lector de pantalla)
  $('search-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const q = $('search-input').value.trim();
    const list = $('search-results');
    list.innerHTML = '';
    list.hidden = true;
    if (q.length < 3) return setStatus('Escribe al menos 3 letras del lugar.');
    setStatus('Buscando…');
    try {
      const json = await (await fetch('/api/geocode?q=' + encodeURIComponent(q))).json();
      if (!json.ok) return setStatus(json.error);
      if (!json.data.length) return setStatus('No encontramos ese lugar en Girardot. Prueba con otro nombre o toca el mapa.');
      const kind = state.origin ? 'dest' : 'origin';
      json.data.forEach((r) => {
        const li = document.createElement('li');
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'search-hit';
        b.textContent = r.label;
        b.addEventListener('click', () => {
          setPoint(kind, L.latLng(r.lat, r.lng), r.label);
          map.setView([r.lat, r.lng], 16);
          list.hidden = true;
        });
        li.appendChild(b);
        list.appendChild(li);
      });
      list.hidden = false;
      setStatus(`Encontramos ${json.data.length}. Elige uno para usarlo como ${kind === 'dest' ? 'destino' : 'origen'}.`);
    } catch (err) {
      setStatus('Sin conexión para buscar. Toca el mapa para marcar el lugar.');
    }
  });

  // ---------- Rutas ----------
  function clearRoutes() {
    Object.values(routeLayers).forEach((layer) => map.removeLayer(layer));
    routeLayers = {};
    state.data = null;
    $('results').hidden = true;
  }

  function drawRoute(route, kind) {
    const latlngs = route.geometry.coordinates.map((c) => [c[1], c[0]]);
    const parts = kind === 'safe'
      ? [L.polyline(latlngs, { color: '#1C2A2F', weight: 11, opacity: 0.85 }), L.polyline(latlngs, { color: cssVar('--lamp'), weight: 6 })]
      : [L.polyline(latlngs, { color: cssVar('--route-fast'), weight: 5, dashArray: '2 10', lineCap: 'round' })];
    const group = L.featureGroup(parts)
      .bindTooltip(`${kind === 'safe' ? 'Ruta segura' : 'Ruta rápida'} ${route.score}/100`, { sticky: true })
      .addTo(map);
    routeLayers[kind] = group;
    return group;
  }

  // Puntaje como fila de 10 faroles (y el número, para no depender solo de lo visual)
  function lampsHtml(score) {
    const lit = Math.round(score / 10);
    let html = `<span role="img" aria-label="Puntaje de seguridad: ${score} de 100">`;
    for (let i = 0; i < 10; i++) html += `<svg class="icon${i < lit ? ' lit' : ''}" aria-hidden="true"><use href="#i-lamp"/></svg>`;
    return html + '</span>';
  }

  const minutes = (s) => Math.max(1, Math.round(s / 60));
  const km = (m) => (m / 1000).toFixed(1).replace('.', ',');

  function fillCard(kind, route) {
    $(kind + '-score').textContent = `${route.score}/100`;
    $(kind + '-lamps').innerHTML = lampsHtml(route.score);
    $(kind + '-meta').textContent = `${minutes(route.duration_s)} min caminando · ${km(route.distance_m)} km`;
  }

  function highlight(kind) {
    Object.entries(routeLayers).forEach(([k, layer]) => {
      layer.setStyle({ opacity: k === kind ? 1 : 0.45 });
      if (k === kind) layer.bringToFront();
    });
  }

  function showRoutes(data) {
    clearRoutes();
    state.data = data;
    if (!data.same) drawRoute(data.fast, 'fast');
    const safe = drawRoute(data.safe, 'safe');
    map.fitBounds(safe.getBounds().extend(routeLayers.fast ? routeLayers.fast.getBounds() : safe.getBounds()), { padding: [30, 30] });

    fillCard('safe', data.safe);
    fillCard('fast', data.fast);
    document.querySelector('.route-option.fast').hidden = data.same;
    document.querySelector('input[name="route"][value="safe"]').checked = true;

    const ul = $('explanation');
    ul.innerHTML = '';
    data.explanation.forEach((line) => { const li = document.createElement('li'); li.textContent = line; ul.appendChild(li); });
    $('provider').textContent = `Rutas a pie calculadas con ${data.provider} sobre datos de OpenStreetMap.`;
    $('results').hidden = false;
    highlight('safe');

    setStatus(data.same
      ? `La ruta más rápida ya es la más segura: ${data.safe.score} de 100, ${minutes(data.safe.duration_s)} minutos.`
      : `Ruta segura: ${data.safe.score} de 100, ${minutes(data.safe.duration_s)} min. Ruta rápida: ${data.fast.score} de 100, ${minutes(data.fast.duration_s)} min.`);
    $('results').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  document.querySelectorAll('input[name="route"]').forEach((r) => r.addEventListener('change', () => highlight(r.value)));

  $('compute').addEventListener('click', async () => {
    const btn = $('compute');
    btn.disabled = true;
    btn.classList.add('is-loading');
    setStatus('Calculando rutas y revisando zonas… puede tardar unos segundos.');
    try {
      const res = await fetch('/api/routes/compute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin: state.origin, destination: state.dest })
      });
      if (res.status === 401) { window.location.href = '/login'; return; }
      const json = await res.json();
      if (!json.ok) return setStatus(json.error);
      showRoutes(json.data);
    } catch (err) {
      setStatus('No hay conexión. Revisa tus datos móviles e intenta de nuevo.');
    } finally {
      btn.disabled = !(state.origin && state.dest);
      btn.classList.remove('is-loading');
    }
  });

  // ---------- Iniciar recorrido ----------
  $('start-trip').addEventListener('click', async () => {
    if (!state.data) return;
    const kind = document.querySelector('input[name="route"]:checked').value;
    const route = state.data[kind];
    setStatus('Iniciando tu recorrido…');
    try {
      const res = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          routeType: kind,
          origin: state.origin,
          destination: state.dest,
          geometry: route.geometry,
          score: route.score,
          durationS: route.duration_s,
          distanceM: route.distance_m
        })
      });
      const json = await res.json();
      if (!json.ok) return setStatus(json.error);
      window.location.href = '/trip/' + json.data.id;
    } catch (err) {
      setStatus('No pudimos iniciar el recorrido. Revisa tu conexión.');
    }
  });

  loadLayers();
})();
