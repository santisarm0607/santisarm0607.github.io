/* =========================================================
   MOVIMIENTO DEL SITIO (todas las páginas)
   Animaciones sobrias para que la página se sienta viva.
   Va aparte de main.js: para quitar un efecto, pongo // delante de su
   línea en la parte 15 de abajo.

   1. Barra de progreso   una línea arriba que avanza al bajar
   2. Cielo con parallax  las estrellas se mueven distinto al hacer scroll
   3. (el nombre entra solo con CSS, sin JS: ver parte 14 del CSS)
   4. Cifras que suben    los números cuentan hasta su valor
   5. Brillo en tarjetas  una luz sigue al mouse dentro de cada tarjeta
   6. Botones magnéticos  los botones se acercan un poquito al mouse
   7. Tarjeta de nivel  al tocar una habilidad, muestra cuánto domino
   8. Encender todo
   ========================================================= */
(function () {
  'use strict';

  const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    document.documentElement.hasAttribute('data-reducir'); // o lo activó en el panel Opciones
  const hayMouse = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const raiz = document.documentElement;

  /* 1 + 2. PROGRESO Y PARALLAX (comparten el mismo evento de scroll) */
  function iniciarScroll() {
    const barra = document.createElement('div');
    barra.className = 'progreso';
    barra.setAttribute('aria-hidden', 'true');
    // la barra vive en el borde de abajo del menú (logo, Inicio, Portafolio…); si no hubiera menú, va arriba de la pantalla
    (document.querySelector('.header') || document.body).appendChild(barra);

    let esperando = false;
    function actualizar() {
      esperando = false;
      const alto = raiz.scrollHeight - window.innerHeight;
      const avance = alto > 0 ? window.scrollY / alto : 0;
      barra.style.transform = 'scaleX(' + Math.min(1, Math.max(0, avance)).toFixed(4) + ')';
      if (!reducido) raiz.style.setProperty('--sy', window.scrollY.toFixed(0)); // el CSS lo usa para mover el cielo
    }
    window.addEventListener('scroll', function () {
      if (!esperando) { esperando = true; requestAnimationFrame(actualizar); }
    }, { passive: true });
    window.addEventListener('resize', actualizar);
    actualizar();
  }

  /* 4. CIFRAS QUE SUBEN HASTA SU VALOR */
  function iniciarCifras() {
    const cifras = document.querySelectorAll('[data-contar]');
    if (!cifras.length || reducido || !('IntersectionObserver' in window)) return;

    function contar(el) {
      const meta = Number(el.getAttribute('data-contar'));
      const sufijo = el.getAttribute('data-sufijo') || '';
      const inicio = performance.now();
      const duracion = 1400;
      (function paso(ahora) {
        const t = Math.min(1, (ahora - inicio) / duracion);
        const suave = 1 - Math.pow(1 - t, 3); // arranca rápido y frena al final
        el.textContent = Math.round(meta * suave) + sufijo;
        if (t < 1) requestAnimationFrame(paso);
      })(inicio);
    }

    const vigilante = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (e.isIntersecting) { contar(e.target); vigilante.unobserve(e.target); }
      });
    }, { threshold: 0.6 });
    cifras.forEach(function (el) { el.textContent = '0' + (el.getAttribute('data-sufijo') || ''); vigilante.observe(el); });
  }

  /* 5. BRILLO QUE SIGUE AL MOUSE DENTRO DE LAS TARJETAS */
  function iniciarBrillo() {
    if (reducido || !hayMouse) return;
    document.querySelectorAll('.proyecto, .contacto-dato, .form-tarjeta, .arcade-franja__caja').forEach(function (tarjeta) {
      tarjeta.classList.add('con-brillo');
      tarjeta.addEventListener('pointermove', function (e) {
        const caja = tarjeta.getBoundingClientRect();
        tarjeta.style.setProperty('--mx', (e.clientX - caja.left) + 'px');
        tarjeta.style.setProperty('--my', (e.clientY - caja.top) + 'px');
      });
    });
  }

  /* 6. BOTONES MAGNÉTICOS (se mueven hasta 6 px hacia el mouse) */
  function iniciarMagnetismo() {
    if (reducido || !hayMouse) return;
    document.querySelectorAll('.boton').forEach(function (boton) {
      boton.addEventListener('pointermove', function (e) {
        const caja = boton.getBoundingClientRect();
        const x = ((e.clientX - caja.left) / caja.width - 0.5) * 12;
        const y = ((e.clientY - caja.top) / caja.height - 0.5) * 8;
        boton.style.translate = x.toFixed(1) + 'px ' + y.toFixed(1) + 'px';
      });
      boton.addEventListener('pointerleave', function () { boton.style.translate = ''; });
    });
  }

  /* 7c. CÓMO TRABAJO: los 4 pasos se encienden uno tras otro (cada uno con su barrita de avance).
     Si pasas el mouse o tocas un paso, ese se enciende y el recorrido sigue desde ahí. */
  function iniciarProceso() {
    const pasos = Array.from(document.querySelectorAll('.proceso .paso'));
    if (!pasos.length) return;
    const CICLO = 2800;
    let actual = -1, reloj = null, visible = false, detenido = false;

    function encender(i) {
      pasos.forEach(function (p, k) { p.classList.toggle('paso--activo', k === i); });
      actual = i;
    }
    function siguiente() {
      clearTimeout(reloj);
      if (!visible || detenido || document.hidden) { reloj = setTimeout(siguiente, 600); return; }
      encender((actual + 1) % pasos.length);
      reloj = setTimeout(siguiente, CICLO);
    }
    pasos.forEach(function (p, i) {
      p.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') { detenido = true; encender(i); } });
      p.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') { detenido = false; clearTimeout(reloj); reloj = setTimeout(siguiente, CICLO); } });
      p.addEventListener('click', function () { encender(i); clearTimeout(reloj); reloj = setTimeout(siguiente, CICLO * 1.5); });
    });
    if (reducido) return; // con "reducir movimiento" quedan todos quietos; solo se enciende el que tocas
    document.documentElement.style.setProperty('--ciclo', (CICLO / 1000) + 's');
    if (!('IntersectionObserver' in window)) return;
    new IntersectionObserver(function (items) {
      items.forEach(function (it) {
        const antes = visible;
        visible = it.isIntersecting;
        if (visible && !antes) { clearTimeout(reloj); reloj = setTimeout(siguiente, 500); }
      });
    }, { threshold: 0.4 }).observe(document.querySelector('.proceso__lista'));
  }

  /* 8. SUBTÍTULO: las letras llegan desde todos lados y se juntan, y cada
     tanto una ola de luz las recorre. (Reemplaza al texto que se escribía solo.) */
  function iniciarSubtitulo() {
    const sub = document.querySelector('.hero__subtitulo');
    if (!sub || reducido) return;
    const texto = sub.textContent.trim();
    sub.setAttribute('aria-label', texto);
    sub.textContent = '';
    Array.from(texto).forEach(function (letra, i) {
      const el = document.createElement('span');
      el.className = 'letra';
      el.setAttribute('aria-hidden', 'true');
      el.textContent = letra;
      el.style.setProperty('--i', i);
      el.style.setProperty('--x', ((Math.random() - 0.5) * 360).toFixed(0) + 'px');
      el.style.setProperty('--y', ((Math.random() - 0.5) * 220).toFixed(0) + 'px');
      el.style.setProperty('--g', ((Math.random() - 0.5) * 240).toFixed(0) + 'deg');
      sub.appendChild(el);
    });
  }

  /* 10. ESCENAS: cada elemento recibe --p (0 a 1) según cuánto ha entrado
     en la pantalla, y --salida (0 a 1) según cuánto se ha ido por arriba.
     El CSS (parte 14) decide qué hace con esos números. */
  function iniciarEscenas() {
    if (reducido) return;
    const entrada = Array.from(document.querySelectorAll('.proyecto, .arcade-franja__caja, .contacto-dato, .form-tarjeta, .ficha__bloque, .ficha__datos, .ficha__img, .ficha__otros, .contacto-rapido .contenedor, .paso, .linea__item'));
    const salida = Array.from(document.querySelectorAll('.hero__texto, .portafolio-intro .contenedor, .contacto-hero .contenedor, .ficha__cab'));
    const frases = Array.from(document.querySelectorAll('[data-iluminar]')).map(function (el) {
      const texto = el.textContent.trim();
      el.setAttribute('aria-label', texto);
      el.textContent = '';
      return { el: el, palabras: texto.split(/\s+/).map(function (w) {
        const sp = document.createElement('span');
        sp.className = 'iluminar';
        sp.setAttribute('aria-hidden', 'true');
        sp.textContent = w;
        el.appendChild(sp);
        el.appendChild(document.createTextNode(' '));
        return sp;
      }) };
    });
    const lineas = Array.from(document.querySelectorAll('.linea'));
    if (!entrada.length && !salida.length && !frases.length && !lineas.length) return;
    const acotar = function (n) { return Math.min(1, Math.max(0, n)); };
    let esperando = false;

    function actualizar() {
      esperando = false;
      const alto = window.innerHeight;
      // al llegar al final de la página, lo último que se ve ya queda completo (no hay más scroll para terminar la animación)
      const alFinal = raiz.scrollHeight - window.innerHeight - window.scrollY < 6;
      entrada.forEach(function (el) {
        const caja = el.getBoundingClientRect();
        el.style.setProperty('--p', alFinal && caja.top < alto ? '1' : acotar((alto * 0.98 - caja.top) / (alto * 0.4)).toFixed(3));
      });
      lineas.forEach(function (l) {
        // la línea de tiempo se dibuja y cada hito se enciende cuando la línea lo alcanza
        const caja = l.getBoundingClientRect();
        const r = acotar((alto * 0.6 - caja.top) / caja.height);
        l.style.setProperty('--r', r.toFixed(3));
        l.querySelectorAll('.linea__item').forEach(function (it) {
          it.classList.toggle('linea__item--on', it.getBoundingClientRect().top < alto * 0.6);
        });
      });
      frases.forEach(function (f) {
        // la frase se ilumina palabra por palabra mientras cruza la pantalla
        const caja = f.el.getBoundingClientRect();
        const r = acotar((alto * 0.85 - caja.top) / (alto * 0.45));
        const n = f.palabras.length;
        f.palabras.forEach(function (w, i) { w.classList.toggle('iluminar--on', r * (n + 1) > i + 1); });
      });
      salida.forEach(function (el) {
        const arriba = window.scrollY;
        el.style.setProperty('--salida', acotar(arriba / (alto * 0.7)).toFixed(3));
      });
    }
    window.addEventListener('scroll', function () { if (!esperando) { esperando = true; requestAnimationFrame(actualizar); } }, { passive: true });
    window.addEventListener('resize', actualizar);
    actualizar();
  }

  /* 10b. SOBRE MÍ: LINTERNA ESPACIAL
     El texto está casi apagado y una luz lo va revelando. Con mouse, la luz
     sigue al cursor; en el celular (o si no tocas nada) recorre el texto sola.
     Si la persona pidió menos movimiento, el texto se ve completo y quieto. */
  function iniciarLinterna() {
    const seccion = document.querySelector('.sobre');
    const texto = seccion && seccion.querySelector('.sobre__texto');
    // en el celular (sin mouse) el texto se queda completo: así se lee bien en pantallas chicas
    if (!texto || reducido || !hayMouse) return;

    const luz = seccion.querySelector('.sobre__luz');
    seccion.classList.add('sobre--linterna');
    let x = 0, y = 0;          // posición de la luz dentro del texto (px)
    let manual = false;        // true mientras el dedo o el mouse la mueven
    let visible = false;
    let enMarcha = false;

    function poner(px, py) {
      texto.style.setProperty('--lx', px.toFixed(0) + 'px');
      texto.style.setProperty('--ly', py.toFixed(0) + 'px');
      if (luz) { luz.style.setProperty('--lx', px.toFixed(0) + 'px'); luz.style.setProperty('--ly', py.toFixed(0) + 'px'); }
    }

    function cuadro(t) {
      if (!visible) { enMarcha = false; return; }
      if (!manual) {
        // recorrido automático: va de lado a lado y de arriba abajo
        const caja = texto.getBoundingClientRect();
        const u = t / 1000;
        x = caja.width * (0.5 + 0.5 * Math.sin(u * 0.55));
        y = caja.height * (0.5 + 0.5 * Math.sin(u * 0.31 + 1.2));
        poner(x, y);
      }
      requestAnimationFrame(cuadro);
    }
    function arrancar() {
      if (enMarcha) return;
      enMarcha = true;
      requestAnimationFrame(cuadro);
    }

    new IntersectionObserver(function (entradas) {
      visible = entradas[0].isIntersecting;
      if (visible) arrancar();
    }, { threshold: 0.05 }).observe(seccion);

    let volver = 0;
    seccion.addEventListener('pointermove', function (e) {
      const caja = texto.getBoundingClientRect();
      manual = true;
      poner(e.clientX - caja.left, e.clientY - caja.top);
      clearTimeout(volver);
      volver = setTimeout(function () { manual = false; }, e.pointerType === 'mouse' ? 1800 : 900);
    });
    seccion.addEventListener('pointerleave', function () {
      clearTimeout(volver);
      volver = setTimeout(function () { manual = false; }, 400);
    });
  }

  /* 10c. ALTO DEL MENÚ: guarda en --alto-header lo que mide el menú de arriba,
     para que las portadas llenen justo el resto de la pantalla (sin franja abajo). */
  function iniciarAltoHeader() {
    const header = document.querySelector('.header');
    if (!header) return;
    function medir() {
      const alto = header.offsetHeight;
      // el menú se encoge al hacer scroll; para la portada cuenta su alto "de arriba" (sin encoger)
      if (!header.classList.contains('header--compacto') && alto > 0) {
        document.documentElement.style.setProperty('--alto-header', alto + 'px');
      }
    }
    medir();
    window.addEventListener('resize', medir);
    window.addEventListener('load', medir);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(medir);
  }

  /* 11. PROFUNDIDAD: el hero se mueve con el mouse (solo con mouse) */
  function iniciarProfundidad() {
    const hero = document.querySelector('.hero');
    if (!hero || reducido || !hayMouse) return;
    hero.addEventListener('pointermove', function (e) {
      const caja = hero.getBoundingClientRect();
      hero.style.setProperty('--hx', (((e.clientX - caja.left) / caja.width) * 2 - 1).toFixed(3));
      hero.style.setProperty('--hy', (((e.clientY - caja.top) / caja.height) * 2 - 1).toFixed(3));
    });
    hero.addEventListener('pointerleave', function () {
      hero.style.setProperty('--hx', 0);
      hero.style.setProperty('--hy', 0);
    });
  }

  /* 12. TARJETAS DESTACADAS: la imagen se mueve con el mouse y toda la tarjeta lleva al proyecto (el enlace de siempre sigue ahí). */
  function iniciarTarjetas() {
    document.querySelectorAll('.destacados .proyecto').forEach(function (tarjeta) {
      const enlace = tarjeta.querySelector('a.proyecto__ver');
      if (!enlace) return;
      tarjeta.addEventListener('click', function (e) {
        if (e.target.closest('a, button')) return;
        enlace.click();
      });
      if (reducido || !hayMouse) return;
      tarjeta.addEventListener('pointermove', function (e) {
        const caja = tarjeta.getBoundingClientRect();
        tarjeta.style.setProperty('--ix', (((e.clientX - caja.left) / caja.width) * 2 - 1).toFixed(3));
        tarjeta.style.setProperty('--iy', (((e.clientY - caja.top) / caja.height) * 2 - 1).toFixed(3));
      });
    });
  }

  /* 12b. ARCADE: toda la franja lleva al Arcade (el botón de siempre sigue ahí) */
  function iniciarFranjaArcade() {
    const caja = document.querySelector('.arcade-franja__caja');
    const enlace = caja && caja.querySelector('a.arcade-franja__boton');
    if (!enlace) return;
    caja.addEventListener('click', function (e) { if (!e.target.closest('a, button')) enlace.click(); });
  }

  /* 12c. CONTACTO DEL INICIO: entra escalonado, una luz sigue al mouse y la frase "Hablemos de…" cambia de palabra. */
  function iniciarContactoRapido() {
    const sec = document.querySelector('.contacto-rapido');
    if (!sec || reducido) return;
    const palabra = sec.querySelector('.contacto-rapido__palabra');
    const lista = palabra ? (palabra.dataset.palabras || '').split('|').filter(Boolean) : [];
    let visible = false, i = 0;

    sec.classList.add('contacto-rapido--lista');
    if (hayMouse) {
      sec.addEventListener('pointermove', function (e) {
        const r = sec.getBoundingClientRect();
        sec.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        sec.style.setProperty('--my', (e.clientY - r.top) + 'px');
        sec.classList.add('contacto-rapido--luz');
      });
      sec.addEventListener('pointerleave', function () { sec.classList.remove('contacto-rapido--luz'); });
    }
    if (palabra && lista.length && palabra.animate) {
      palabra.textContent = lista[0];
      setInterval(function () {
        if (!visible || document.hidden) return;
        const sale = palabra.animate([{ opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(-14px)' }], { duration: 260, easing: 'ease-in', fill: 'forwards' });
        sale.onfinish = function () {
          i = (i + 1) % lista.length;
          palabra.textContent = lista[i];
          sale.cancel();
          palabra.animate([{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 320, easing: 'ease-out' });
        };
      }, 2300);
    }
    if (!('IntersectionObserver' in window)) { sec.classList.add('contacto-rapido--viva'); visible = true; return; }
    new IntersectionObserver(function (items) {
      items.forEach(function (it) {
        visible = it.isIntersecting;
        if (it.isIntersecting) sec.classList.add('contacto-rapido--viva');
      });
    }, { threshold: 0.3 }).observe(sec);
  }

  /* 12d. PORTADA DEL PORTAFOLIO: letras que suben y reaccionan al mouse, luz que sigue al cursor, iconos que flotan con profundidad
     y una frase que va nombrando cada área (y enciende su filtro). */
  function iniciarPortada() {
    const portada = document.querySelector('.portada');
    if (!portada) return;
    const titulo = portada.querySelector('.portada__titulo');
    // el título se parte en letras (el texto completo queda en aria-label)
    const letras = [];
    if (titulo) {
      titulo.setAttribute('aria-label', titulo.textContent.trim());
      titulo.querySelectorAll('.portada__palabra').forEach(function (pal) {
        const t = pal.textContent;
        pal.textContent = '';
        pal.setAttribute('aria-hidden', 'true');
        Array.from(t).forEach(function (c) {
          const l = document.createElement('span');
          l.className = 'portada__letra';
          l.textContent = c;
          l.style.setProperty('--i', letras.length);
          pal.appendChild(l);
          letras.push(l);
        });
      });
    }
    if (reducido) return;
    let visible = true, punto = null, esperando = false;

    // luz + profundidad + letras cerca del mouse
    function repartir() {
      esperando = false;
      letras.forEach(function (l) {
        if (!punto) { l.style.setProperty('--c', 0); return; }
        const r = l.getBoundingClientRect();
        const d = Math.hypot(punto.x - (r.left + r.width / 2), punto.y - (r.top + r.height / 2));
        l.style.setProperty('--c', Math.pow(Math.max(0, 1 - d / 150), 1.4).toFixed(3));
      });
    }
    if (hayMouse) {
      portada.addEventListener('pointermove', function (e) {
        const r = portada.getBoundingClientRect();
        portada.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        portada.style.setProperty('--my', (e.clientY - r.top) + 'px');
        portada.style.setProperty('--px', (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
        portada.style.setProperty('--py', (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
        portada.classList.add('portada--luz');
        punto = { x: e.clientX, y: e.clientY };
        if (!esperando) { esperando = true; requestAnimationFrame(repartir); }
      });
      portada.addEventListener('pointerleave', function () {
        portada.classList.remove('portada--luz');
        portada.style.setProperty('--px', 0); portada.style.setProperty('--py', 0);
        punto = null; if (!esperando) { esperando = true; requestAnimationFrame(repartir); }
      });
    }

    // frase "Aquí vas a ver …": cambia de área y enciende el filtro que corresponde
    const area = portada.querySelector('.portada__area');
    const lista = area ? (area.dataset.areas || '').split('|').filter(Boolean) : [];
    const filtros = ['branding', 'diseno', 'publicidad', 'editorial', 'web'];
    if (area && lista.length && area.animate) {
      let i = 0;
      area.textContent = lista[0];
      function eco(k) {
        const b = document.querySelector('.filtro[data-filtro="' + filtros[k] + '"]');
        if (!b) return;
        b.classList.add('filtro--eco');
        setTimeout(function () { b.classList.remove('filtro--eco'); }, 1500);
      }
      eco(0);
      setInterval(function () {
        if (!visible || document.hidden) return;
        const sale = area.animate([{ opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(-12px)' }], { duration: 240, easing: 'ease-in', fill: 'forwards' });
        sale.onfinish = function () {
          i = (i + 1) % lista.length;
          area.textContent = lista[i];
          sale.cancel();
          area.animate([{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 300, easing: 'ease-out' });
          eco(i);
        };
      }, 2200);
    }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (items) { items.forEach(function (it) { visible = it.isIntersecting; }); }, { threshold: 0.2 }).observe(portada);
    }
  }

  /* 13. COMETAS: cada 9-16 segundos cruza uno (solo si estás arriba en la página) */
  function iniciarCometas() {
    if (reducido || !document.querySelector('.hero') || document.body.classList.contains('pagina-marca')) return; // en el look de marca no hay cometas
    function lanzar() {
      if (!document.hidden && window.scrollY < 700) {
        const c = document.createElement('span');
        c.className = 'cometa';
        c.setAttribute('aria-hidden', 'true');
        c.style.top = (6 + Math.random() * 34) + '%';
        c.style.left = (4 + Math.random() * 50) + '%';
        document.body.appendChild(c);
        c.addEventListener('animationend', function () { c.remove(); });
      }
      setTimeout(lanzar, 9000 + Math.random() * 7000);
    }
    setTimeout(lanzar, 5000);
  }

  /* 14. PESTAÑA: si cambias de pestaña, el título te llama de vuelta */
  function iniciarPestana() {
    const original = document.title;
    document.addEventListener('visibilitychange', function () {
      document.title = document.hidden ? '¡Vuelve! Aún falta por explorar 🚀' : original;
    });
  }


  /* 15. ENCENDER TODO */
  iniciarScroll();
  iniciarCifras();
  iniciarBrillo();
  iniciarMagnetismo();
  iniciarProceso();
  iniciarSubtitulo();
  iniciarEscenas();
  iniciarProfundidad();
  iniciarLinterna();
  iniciarAltoHeader();
  iniciarTarjetas();
  iniciarFranjaArcade();
  iniciarContactoRapido();
  iniciarPortada();
  iniciarCometas();
  iniciarPestana();
})();
