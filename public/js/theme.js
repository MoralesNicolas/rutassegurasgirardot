// Tema claro/noche: respeta la preferencia del sistema y recuerda la elección de la usuaria
(function () {
  var root = document.documentElement;
  var saved = null;
  try { saved = localStorage.getItem('theme'); } catch (e) { /* almacenamiento bloqueado */ }
  if (saved === 'dark' || saved === 'light') root.setAttribute('data-theme', saved);

  function isDark() {
    var forced = root.getAttribute('data-theme');
    if (forced) return forced === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  document.addEventListener('DOMContentLoaded', function () {
    var btn = document.getElementById('theme-toggle');
    if (!btn) return;
    function sync() {
      var dark = isDark();
      btn.setAttribute('aria-pressed', String(dark));
      btn.setAttribute('aria-label', dark ? 'Activar modo claro' : 'Activar modo noche');
    }
    sync();
    btn.addEventListener('click', function () {
      var next = isDark() ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) { /* sin almacenamiento */ }
      sync();
    });
  });
})();
