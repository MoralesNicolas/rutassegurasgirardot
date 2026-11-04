// Botones "Avisar por WhatsApp" con el mensaje y la ubicación ya escritos.
// Una web no puede enviar WhatsApp sola: la usuaria confirma con un toque. También lo usa trip.js.
function renderContacts(list, data) {
  list.innerHTML = '';
  data.contacts.forEach((c) => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.className = 'btn btn-ghost btn-block';
    a.href = `https://wa.me/${c.phone.replace(/\D/g, '').replace(/^3/, '573')}?text=${encodeURIComponent(data.message)}`;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = `Avisar por WhatsApp a ${c.name}`;
    li.appendChild(a);
    list.appendChild(li);
  });
}
window.RSRenderContacts = renderContacts;

// Botón de ayuda: 1 toque → 3 s para cancelar → alarma, registra la alerta, avisa contactos y abre tel:123
(function () {
  const btn = document.getElementById('sos-btn');
  const dialog = document.getElementById('sos-dialog');
  if (!btn || !dialog) return;
  const $ = (id) => document.getElementById(id);
  let timer = null;

  function reset() {
    clearInterval(timer);
    $('sos-counting').hidden = false;
    $('sos-done').hidden = true;
    $('sos-count').textContent = '3';
  }

  // Ubicación rápida (máx. 3 s); si no hay permiso, la alerta sale igual sin coordenadas
  function quickPosition() {
    return new Promise((resolve) => {
      if (!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => resolve(null),
        { timeout: 3000, maximumAge: 60000 }
      );
    });
  }

  async function sendAlert() {
    clearInterval(timer);
    startAlarm();
    $('sos-counting').hidden = true;
    $('sos-done').hidden = false;
    $('sos-result').textContent = 'Registrando tu alerta…';
    const pos = await quickPosition();
    try {
      const res = await fetch('/api/alerts/emergency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: pos && pos.lat, lng: pos && pos.lng, tripId: btn.dataset.trip || null, reason: 'boton' })
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      const d = json.data;
      $('sos-result').textContent = d.notified
        ? `Alerta registrada. Avisamos a ${d.notified} contacto(s)${d.simulated ? ' (envío simulado en esta demo)' : ''}. Escríbeles también desde aquí:`
        : 'Alerta registrada. Aún no tienes contactos de confianza: agrégalos en «Mi red».';
      renderContacts($('sos-contacts'), d);
    } catch (err) {
      $('sos-result').textContent = 'No pudimos registrar la alerta (sin conexión). Llama al 123 ahora.';
    }
    window.location.href = 'tel:123';
  }

  // Alarma automática al confirmar la alerta (el audio se "armó" con el toque en el botón Ayuda)
  function startAlarm() {
    if (!window.RSAlarm) return;
    window.RSAlarm.start();
    $('sos-alarm').setAttribute('aria-pressed', 'true');
    $('sos-alarm').textContent = 'Detener alarma';
  }

  btn.addEventListener('click', () => {
    if (window.RSAlarm) window.RSAlarm.arm();
    reset();
    dialog.showModal();
    $('sos-cancel').focus();
    let n = 3;
    timer = setInterval(() => {
      n -= 1;
      $('sos-count').textContent = String(n);
      if (n <= 0) sendAlert();
    }, 1000);
  });

  $('sos-now').addEventListener('click', sendAlert);
  $('sos-cancel').addEventListener('click', () => { reset(); dialog.close(); btn.focus(); });
  $('sos-close').addEventListener('click', () => { dialog.close(); btn.focus(); });
  dialog.addEventListener('close', () => clearInterval(timer));
  $('sos-alarm').addEventListener('click', (e) => {
    if (!window.RSAlarm) return;
    const on = window.RSAlarm.toggle();
    e.currentTarget.setAttribute('aria-pressed', String(on));
    e.currentTarget.textContent = on ? 'Detener alarma' : 'Sonar alarma';
  });
})();
