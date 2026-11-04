// Recorrido en curso: dibuja la ruta, sigue la posición, mantiene la pantalla encendida y lo finaliza
(function () {
  const el = document.getElementById('trip-map');
  if (!el || !window.L) return;
  const $ = (id) => document.getElementById(id);
  const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  const map = L.map(el);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map);

  const geometry = JSON.parse(el.dataset.geometry);
  const latlngs = geometry.coordinates.map((c) => [c[1], c[0]]);
  if (el.dataset.type === 'safe') L.polyline(latlngs, { color: '#1C2A2F', weight: 11, opacity: 0.85 }).addTo(map);
  const line = L.polyline(latlngs, el.dataset.type === 'safe'
    ? { color: css('--lamp'), weight: 6 }
    : { color: css('--route-fast'), weight: 5, dashArray: '2 10' }).addTo(map);
  map.fitBounds(line.getBounds(), { padding: [30, 30] });
  L.marker(latlngs[latlngs.length - 1], { icon: L.divIcon({ className: 'pin pin-dest', html: '<span></span>', iconSize: [28, 28], iconAnchor: [14, 14] }), title: 'Destino' }).addTo(map);

  const status = $('trip-status');
  const arrived = $('arrived');
  if (!arrived) return;
  const tripId = arrived.dataset.trip;

  // Posición en vivo (solo en el celular de la usuaria; no se envía a terceros)
  let me = null;
  if (navigator.geolocation) {
    navigator.geolocation.watchPosition((p) => {
      const ll = [p.coords.latitude, p.coords.longitude];
      if (!me) me = L.circleMarker(ll, { radius: 9, color: '#fff', weight: 3, fillColor: '#2563eb', fillOpacity: 1 }).bindTooltip('Tú').addTo(map);
      else me.setLatLng(ll);
    }, () => {}, { enableHighAccuracy: true });
  }

  // Screen Wake Lock: evita que la pantalla se apague durante el recorrido (si el navegador lo permite)
  async function keepAwake() {
    try { if ('wakeLock' in navigator) await navigator.wakeLock.request('screen'); } catch (e) { /* no soportado */ }
  }
  keepAwake();
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') keepAwake(); });

  async function finish(statusValue) {
    const res = await fetch(`/api/trips/${tripId}/finish`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: statusValue })
    });
    return res.ok;
  }

  arrived.addEventListener('click', async () => {
    if (window.RSAlarm) window.RSAlarm.stop();
    status.textContent = 'Qué bueno que llegaste. Guardando…';
    await finish('completed');
    window.location.href = `/trip/${tripId}/rate`;
  });

  $('cancel-trip').addEventListener('click', async () => {
    if (window.RSAlarm) window.RSAlarm.stop();
    await finish('cancelled');
    window.location.href = '/map';
  });

  // Control de inactividad: si no hay interacción en N minutos preguntamos "¿Estás bien?".
  // Si no responde en 20 s, suena la alarma y se envía la alerta con reason = 'inactividad'.
  const limitMs = Number(arrived.dataset.inactivity || 5) * 60000;
  const okDialog = $('ok-dialog');
  let idleTimer = null;
  let answerTimer = null;

  function resetIdle() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(askIfOk, limitMs);
  }

  function askIfOk() {
    let n = 20;
    $('ok-count').textContent = String(n);
    $('ok-msg').textContent = 'Si no respondes, avisaremos a tus contactos.';
    $('ok-contacts').innerHTML = '';
    okDialog.showModal();
    window.RSAlarm.start();
    answerTimer = setInterval(async () => {
      n -= 1;
      $('ok-count').textContent = String(Math.max(n, 0));
      if (n > 0) return;
      clearInterval(answerTimer);
      $('ok-msg').textContent = 'No respondiste: estamos avisando a tus contactos.';
      try {
        const res = await fetch('/api/alerts/emergency', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tripId, reason: 'inactividad', lat: me ? me.getLatLng().lat : undefined, lng: me ? me.getLatLng().lng : undefined })
        });
        const json = await res.json();
        if (!json.ok) throw new Error(json.error);
        $('ok-msg').textContent = json.data.contacts.length
          ? 'Alerta registrada. Avisa a tu gente con un toque:'
          : 'Alerta registrada. Aún no tienes contactos: agrégalos en «Mi red». Si necesitas ayuda, llama al 123.';
        if (window.RSRenderContacts) window.RSRenderContacts($('ok-contacts'), json.data);
      } catch (err) {
        $('ok-msg').textContent = 'Sin conexión. Si necesitas ayuda, llama al 123.';
      }
    }, 1000);
  }

  $('im-ok').addEventListener('click', () => {
    clearInterval(answerTimer);
    window.RSAlarm.stop();
    okDialog.close();
    status.textContent = 'Perfecto. Seguimos contigo.';
    resetIdle();
  });

  // Cualquier toque o tecla reinicia el contador y "arma" el audio (el navegador exige un gesto)
  ['pointerdown', 'keydown'].forEach((ev) => document.addEventListener(ev, () => {
    window.RSAlarm.arm();
    if (!okDialog.open) resetIdle();
  }, { passive: true }));
  resetIdle();

  $('alarm-toggle').addEventListener('click', (e) => {
    const on = window.RSAlarm.toggle();
    e.currentTarget.setAttribute('aria-pressed', String(on));
    e.currentTarget.textContent = on ? 'Detener alarma' : 'Sonar alarma';
    status.textContent = on ? 'Alarma sonando al volumen actual de tu celular.' : 'Alarma detenida.';
  });
})();
