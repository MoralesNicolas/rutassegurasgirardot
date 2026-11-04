// Onboarding de 3 pasos. Sin JavaScript se ven los 3 pasos seguidos (mejora progresiva).
(function () {
  var steps = document.querySelectorAll('.ob-step');
  var dots = document.querySelectorAll('[data-dot]');
  if (!steps.length) return;

  function show(n) {
    steps.forEach(function (s) { s.hidden = s.getAttribute('data-step') !== String(n); });
    dots.forEach(function (d) {
      var current = d.getAttribute('data-dot') === String(n);
      d.classList.toggle('is-current', current);
      if (current) d.setAttribute('aria-current', 'step'); else d.removeAttribute('aria-current');
    });
    // Mueve el foco al título del paso para lectores de pantalla
    var title = document.querySelector('.ob-step[data-step="' + n + '"] h2');
    if (title) { title.setAttribute('tabindex', '-1'); title.focus(); }
  }

  document.querySelectorAll('[data-next]').forEach(function (btn) {
    btn.addEventListener('click', function () { show(btn.getAttribute('data-next')); });
  });
  steps.forEach(function (s) { s.hidden = s.getAttribute('data-step') !== '1'; });
})();
