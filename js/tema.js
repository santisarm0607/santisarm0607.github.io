/* =========================================================
   MODO CLARO / OSCURO — se carga en el <head> de cada página
   Pone el tema guardado ANTES de que se dibuje la página, para
   que no se vea un parpadeo del otro color al entrar.
   El botón para cambiarlo lo crea js/main.js (parte 19).
   ========================================================= */
(function () {
  try {
    var tema = localStorage.getItem('santisarm.tema');
    if (tema === 'claro' || tema === 'oscuro') {
      document.documentElement.setAttribute('data-tema', tema);
    }
  } catch (e) { /* sin localStorage se queda en oscuro */ }
})();
