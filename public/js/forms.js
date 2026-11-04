// Botón "mostrar contraseña": ayuda a escribir bien en el celular sin perder privacidad por defecto
document.querySelectorAll('[data-reveal]').forEach(function (btn) {
  var input = document.getElementById(btn.getAttribute('data-reveal'));
  btn.addEventListener('click', function () {
    var show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    btn.setAttribute('aria-pressed', String(show));
    btn.setAttribute('aria-label', show ? 'Ocultar contraseña' : 'Mostrar contraseña');
  });
});

// Lleva el foco al primer campo con error para quien navega con teclado o lector de pantalla
var firstInvalid = document.querySelector('[aria-invalid="true"]');
if (firstInvalid) firstInvalid.focus();
