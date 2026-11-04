// Alarma sonora con Web Audio API (sirena que sube y baja).
// Límite honesto: el navegador exige un toque de la usuaria para sonar y NO puede subir el volumen
// del celular: suena al volumen que tenga el dispositivo.
window.RSAlarm = (function () {
  let ctx = null;
  let osc = null;
  let lfo = null;

  // Crea/reanuda el audio durante un toque de la usuaria para que luego pueda sonar sola
  function arm() {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
  }

  function start() {
    if (osc) return;
    arm();
    osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 900;
    // Un segundo oscilador lento mueve la frecuencia entre ~600 y ~1200 Hz (efecto sirena)
    lfo = ctx.createOscillator();
    lfo.frequency.value = 1.5;
    const depth = ctx.createGain();
    depth.gain.value = 300;
    lfo.connect(depth).connect(osc.frequency);
    const volume = ctx.createGain();
    volume.gain.value = 0.9;
    osc.connect(volume).connect(ctx.destination);
    osc.start();
    lfo.start();
  }

  function stop() {
    if (!osc) return;
    osc.stop();
    lfo.stop();
    osc = null;
    lfo = null;
  }

  return {
    arm,
    start,
    stop,
    toggle() { if (osc) stop(); else start(); return Boolean(osc); },
    isOn() { return Boolean(osc); }
  };
})();
