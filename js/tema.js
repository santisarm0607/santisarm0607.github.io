/* =========================================================
   OPCIONES DE LA PÁGINA (tema, letra, contraste, animaciones)
   Se carga en el <head> de cada página. Pone lo guardado ANTES
   de que se dibuje la página, para que no haya parpadeos.
   El panel "Opciones" y su botón los crea js/main.js (parte 19).

   Se guarda en localStorage con la clave "santisarm.opciones":
     tema:      'oscuro' (por defecto) | 'claro' | 'auto' (sigue al sistema)
     letra:     'normal' | 'grande' | 'muy-grande'
     contraste: true / false  (alto contraste)
     reducir:   true / false  (reducir animaciones)
   ========================================================= */
(function () {
  var CLAVE = 'santisarm.opciones';
  var CLAVE_VIEJA = 'santisarm.tema'; // la que usaba el botón del sol/luna antes
  var DEFECTO = { tema: 'oscuro', letra: 'normal', contraste: false, reducir: false };

  function leer() {
    var o = {};
    try {
      var texto = localStorage.getItem(CLAVE);
      if (texto) o = JSON.parse(texto) || {};
      else {
        var vieja = localStorage.getItem(CLAVE_VIEJA);
        if (vieja === 'claro' || vieja === 'oscuro') o.tema = vieja;
      }
    } catch (e) { /* sin localStorage se usan los valores por defecto */ }
    return {
      tema: ['claro', 'oscuro', 'auto'].indexOf(o.tema) >= 0 ? o.tema : DEFECTO.tema,
      letra: ['normal', 'grande', 'muy-grande'].indexOf(o.letra) >= 0 ? o.letra : DEFECTO.letra,
      contraste: o.contraste === true,
      reducir: o.reducir === true
    };
  }

  function guardar(o) {
    try { localStorage.setItem(CLAVE, JSON.stringify(o)); } catch (e) { /* no se guarda, pero cambia igual */ }
  }

  // Pone las opciones en <html>: el CSS (styles.css, parte 14zl) hace el resto
  function aplicar(o) {
    var raiz = document.documentElement;
    var claro = o.tema === 'claro' ||
      (o.tema === 'auto' && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches);
    raiz.setAttribute('data-tema', claro ? 'claro' : 'oscuro');
    raiz.setAttribute('data-letra', o.letra);
    if (o.contraste) raiz.setAttribute('data-contraste', ''); else raiz.removeAttribute('data-contraste');
    if (o.reducir) raiz.setAttribute('data-reducir', ''); else raiz.removeAttribute('data-reducir');
  }

  window.SantiOpciones = { leer: leer, guardar: guardar, aplicar: aplicar, defecto: DEFECTO };
  aplicar(leer());
})();
