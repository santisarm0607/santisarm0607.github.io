/* =========================================================
   PORTAFOLIO WEB - SANTIAGO SARMIENTO
   Todo el JavaScript del sitio (las 3 páginas usan este mismo archivo)

   Cada efecto está en su propia función. Al final del archivo
   (parte 17) se encienden todas. Si una página no tiene lo que
   el efecto necesita, la función simplemente no hace nada.

   Si el JavaScript falla o está apagado, la página se sigue
   viendo y funcionando igual que antes: todo esto es "extra".
   ========================================================= */

/* ---------------------------------------------------------
   0. AJUSTES GENERALES
   --------------------------------------------------------- */

// Si la persona pidió en su sistema "reducir movimiento",
// no hacemos animaciones fuertes (accesibilidad)
const movimientoReducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Mi correo, para copiarlo y para el formulario
const MI_CORREO = 'santisarm.06salguero@gmail.com';

// Frases que se van escribiendo debajo de mi nombre (index.html)
// Puedo agregar, quitar o cambiar las que quiera
const MIS_ROLES = [
  'Ingeniero Multimedia',
  'Diseñador Gráfico',
  'Animador',
  'Diseñador UI/UX',
  'Desarrollador Web'
];

// Colores del confeti de estrellas (blanco, celeste, lavanda y amarillo, para que brillen en lo oscuro)
const COLORES_CONFETI = ['#FFFFFF', '#29B6F6', '#9DB8FF', '#FFD54F'];


/* ---------------------------------------------------------
   1. CONFETI
   Dibuja papelitos de colores en un <canvas> encima de la página.
   Se usa así:  lanzarConfeti(x, y, cantidad)
   (x, y = posición en la pantalla desde donde salen)
   --------------------------------------------------------- */
const lanzarConfeti = (function () {
  let lienzo = null;
  let pincel = null;
  let papelitos = [];
  let animando = false;

  function ajustarTamano() {
    const densidad = window.devicePixelRatio || 1; // para que se vea nítido en celulares
    lienzo.width = window.innerWidth * densidad;
    lienzo.height = window.innerHeight * densidad;
    pincel.setTransform(densidad, 0, 0, densidad, 0, 0);
  }

  // dibuja una estrellita de 4 puntas (tipo destello ✦) centrada en 0,0
  function dibujarEstrella(tamano) {
    const largo = tamano / 2;      // largo de cada punta
    const ancho = tamano / 7;      // qué tan gordita es en el centro
    pincel.beginPath();
    pincel.moveTo(0, -largo);
    pincel.lineTo(ancho, -ancho);
    pincel.lineTo(largo, 0);
    pincel.lineTo(ancho, ancho);
    pincel.lineTo(0, largo);
    pincel.lineTo(-ancho, ancho);
    pincel.lineTo(-largo, 0);
    pincel.lineTo(-ancho, -ancho);
    pincel.closePath();
    pincel.fill();
  }

  function dibujarCuadro() {
    pincel.clearRect(0, 0, window.innerWidth, window.innerHeight);

    papelitos.forEach(function (p) {
      p.velY += 0.25;      // gravedad: cada vez cae más rápido
      p.velX *= 0.99;      // el aire lo frena un poquito
      p.x += p.velX;
      p.y += p.velY;
      p.giro += p.velGiro;

      pincel.save();
      pincel.translate(p.x, p.y);
      pincel.rotate(p.giro);
      pincel.fillStyle = p.color;
      if (p.estrella) {
        dibujarEstrella(p.tamano);        // destello de 4 puntas
      } else {
        pincel.beginPath();               // puntito redondo
        pincel.arc(0, 0, p.tamano / 4, 0, Math.PI * 2);
        pincel.fill();
      }
      pincel.restore();
    });

    // borro los papelitos que ya se salieron por abajo
    papelitos = papelitos.filter(function (p) { return p.y < window.innerHeight + 30; });

    if (papelitos.length > 0) {
      requestAnimationFrame(dibujarCuadro);
    } else {
      animando = false;
      pincel.clearRect(0, 0, window.innerWidth, window.innerHeight);
    }
  }

  return function (x, y, cantidad) {
    if (movimientoReducido) return;
    cantidad = cantidad || 40;

    // el lienzo se crea solo la primera vez que se usa
    if (!lienzo) {
      lienzo = document.createElement('canvas');
      lienzo.className = 'confeti';
      lienzo.setAttribute('aria-hidden', 'true');
      document.body.appendChild(lienzo);
      pincel = lienzo.getContext('2d');
      ajustarTamano();
      window.addEventListener('resize', ajustarTamano);
    }

    for (let i = 0; i < cantidad; i++) {
      papelitos.push({
        x: x,
        y: y,
        velX: (Math.random() - 0.5) * 12,
        velY: -Math.random() * 10 - 3,
        giro: Math.random() * Math.PI,
        velGiro: (Math.random() - 0.5) * 0.3,
        tamano: 8 + Math.random() * 10,
        estrella: Math.random() < 0.7,   // 7 de cada 10 son estrellitas, el resto puntitos
        color: COLORES_CONFETI[Math.floor(Math.random() * COLORES_CONFETI.length)]
      });
    }

    if (!animando) {
      animando = true;
      requestAnimationFrame(dibujarCuadro);
    }
  };
})();

// Ayudita: lanza confeti desde el centro de un elemento
function confetiDesde(elemento, cantidad) {
  const caja = elemento.getBoundingClientRect();
  lanzarConfeti(caja.left + caja.width / 2, caja.top + caja.height / 2, cantidad);
}


/* ---------------------------------------------------------
   2. AVISO FLOTANTE
   Un mensajito que sale abajo unos segundos y se va.
   Se usa así:  mostrarAviso('¡Hola!')
   --------------------------------------------------------- */
let cajaAviso = null;
let temporizadorAviso = null;

function prepararAviso() {
  cajaAviso = document.createElement('div');
  cajaAviso.className = 'aviso-flotante';
  cajaAviso.setAttribute('role', 'status'); // los lectores de pantalla lo leen en voz alta
  document.body.appendChild(cajaAviso);
}

function mostrarAviso(texto) {
  if (!cajaAviso) prepararAviso();
  cajaAviso.textContent = texto;
  cajaAviso.classList.add('aviso-flotante--visible');
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(function () {
    cajaAviso.classList.remove('aviso-flotante--visible');
  }, 2600);
}


/* ---------------------------------------------------------
   3. APARECER AL HACER SCROLL
   Las cosas suben y aparecen suavemente cuando llegan a la pantalla.
   Para que algo nuevo también aparezca así, agrego su clase a la lista.
   --------------------------------------------------------- */
const ELEMENTOS_QUE_APARECEN = [
  '.hero__foto', '.hero__texto',
  '.habilidades__titulo', '.habilidad',
  '.contacto-rapido .contenedor',
  '.portafolio-intro .contenedor', '.filtros', '.proyecto',
  '.contacto-hero .contenedor', '.form-tarjeta', '.contacto-dato',
  '.destacados .habilidades__titulo', '.arcade-franja .contenedor',
  '.ficha__cab', '.ficha__datos', '.ficha__bloque', '.ficha__otros'
];

function iniciarAparecer() {
  if (movimientoReducido || !('IntersectionObserver' in window)) return;

  const elementos = document.querySelectorAll(ELEMENTOS_QUE_APARECEN.join(','));

  const vigilante = new IntersectionObserver(function (entradas) {
    entradas.forEach(function (entrada) {
      if (entrada.isIntersecting) {
        entrada.target.classList.add('aparecer--visible');
        vigilante.unobserve(entrada.target); // solo aparece una vez
      }
    });
  }, { threshold: 0.12 });

  elementos.forEach(function (el) {
    // lo que ya se ve al abrir la página no lo escondo: así carga rápido
    // y no baja el puntaje de Lighthouse (Performance)
    if (el.getBoundingClientRect().top < window.innerHeight) return;

    // si hay varios hermanos iguales (habilidades, tarjetas), salen uno detrás del otro
    const hermanos = Array.from(el.parentElement.children);
    const posicion = Math.min(hermanos.indexOf(el), 8);
    el.style.setProperty('--retraso', (posicion * 0.08) + 's');

    el.classList.add('aparecer');
    vigilante.observe(el);

    // cuando ya apareció, le quito las clases para que no choquen con otros efectos (rebote, giro)
    el.addEventListener('animationend', function (e) {
      if (e.target === el && e.animationName === 'aparecer') {
        el.classList.remove('aparecer', 'aparecer--visible');
      }
    });
  });
}


/* ---------------------------------------------------------
   4. HEADER QUE SE ACHICA AL BAJAR
   Cuando bajo por la página, el header se hace más delgado
   para dejar más espacio (sobre todo en el celular).
   --------------------------------------------------------- */
function iniciarHeaderCompacto() {
  const header = document.querySelector('.header');
  if (!header) return;

  function revisar() {
    // uso dos números distintos para que no "tiemble" justo en el límite
    if (window.scrollY > 60) header.classList.add('header--compacto');
    else if (window.scrollY < 10) header.classList.remove('header--compacto');
  }

  window.addEventListener('scroll', revisar, { passive: true });
  revisar();
}


/* ---------------------------------------------------------
   5. BOTÓN "VOLVER ARRIBA"
   Aparece abajo a la derecha cuando ya bajé bastante.
   --------------------------------------------------------- */
function iniciarVolverArriba() {
  const boton = document.createElement('button');
  boton.className = 'arriba';
  boton.type = 'button';
  boton.setAttribute('aria-label', 'Volver arriba');
  boton.innerHTML = '<span aria-hidden="true">🚀</span>'; // un cohete (el CSS lo endereza)
  document.body.appendChild(boton);

  boton.addEventListener('click', function () {
    // el cohete despega (parte 10 del CSS) y la página sube con él
    boton.classList.remove('arriba--despegue');
    void boton.offsetWidth;
    boton.classList.add('arriba--despegue');
    setTimeout(function () { boton.classList.remove('arriba--despegue'); }, 1000);

    window.scrollTo({ top: 0, behavior: movimientoReducido ? 'auto' : 'smooth' });
  });

  window.addEventListener('scroll', function () {
    boton.classList.toggle('arriba--visible', window.scrollY > 500);
  }, { passive: true });
}


/* ---------------------------------------------------------
   6. TEXTO QUE SE ESCRIBE SOLO (index.html)
   Debajo de mi nombre se escriben y borran mis roles (MIS_ROLES).
   --------------------------------------------------------- */
function iniciarEscritura() {
  const subtitulo = document.querySelector('.hero__subtitulo');
  if (!subtitulo || movimientoReducido) return;

  const textoOriginal = subtitulo.textContent.trim();

  // el lector de pantalla lee el texto original y se salta la animación
  subtitulo.innerHTML =
    '<span class="solo-lectores"></span>' +
    '<span class="escribiendo" aria-hidden="true"></span>' +
    '<span class="cursor" aria-hidden="true"></span>';
  subtitulo.querySelector('.solo-lectores').textContent = textoOriginal;

  const zona = subtitulo.querySelector('.escribiendo');
  zona.textContent = MIS_ROLES[0];

  let rol = 0;
  let letras = MIS_ROLES[0].length;
  let borrando = true;

  function paso() {
    if (borrando) {
      letras--;
      zona.textContent = MIS_ROLES[rol].slice(0, letras);
      if (letras === 0) {
        borrando = false;
        rol = (rol + 1) % MIS_ROLES.length; // paso al siguiente rol (y vuelvo al primero al final)
      }
      setTimeout(paso, 45);              // borrar es rápido
    } else {
      letras++;
      zona.textContent = MIS_ROLES[rol].slice(0, letras);
      if (letras === MIS_ROLES[rol].length) {
        borrando = true;
        setTimeout(paso, 2200);          // pausa para que se alcance a leer
      } else {
        setTimeout(paso, 85);            // escribir es más lento
      }
    }
  }

  setTimeout(paso, 2500);
}


/* ---------------------------------------------------------
   7. AVATAR CON SORPRESA (index.html)
   Clic en mi avatar = salta y suelta confeti.
   5 clics seguidos = da una vuelta y sale un mensaje secreto.
   --------------------------------------------------------- */
function iniciarAvatar() {
  const avatar = document.querySelector('.hero__foto img');
  if (!avatar) return;

  // para que también se pueda usar con el teclado (Tab + Enter)
  avatar.tabIndex = 0;
  avatar.setAttribute('role', 'button');
  avatar.setAttribute('aria-label', 'Avatar de Santiago. Haz clic para saludar');

  let clics = 0;
  let temporizador = null;

  function saludar() {
    clics++;
    clearTimeout(temporizador);
    temporizador = setTimeout(function () { clics = 0; }, 1500); // si paro de dar clic, se reinicia

    // reinicio la animación quitando y poniendo la clase
    avatar.classList.remove('avatar--salto', 'avatar--giro');
    void avatar.offsetWidth;

    if (clics >= 5) {
      clics = 0;
      avatar.classList.add('avatar--giro');
      confetiDesde(avatar, 120);
      mostrarAviso('¡Encontraste el secreto! 🚀 Bienvenido a la galaxia Santisarm');
    } else {
      avatar.classList.add('avatar--salto');
      confetiDesde(avatar, 18);
      if (clics === 1) mostrarAviso('¡Hola! 👋 Sigue dando clic…');
    }
  }

  avatar.addEventListener('click', saludar);
  avatar.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); saludar(); }
  });
}


/* ---------------------------------------------------------
   8. HABILIDADES QUE REBOTAN (index.html)
   --------------------------------------------------------- */
function iniciarHabilidades() {
  document.querySelectorAll('.habilidad').forEach(function (habilidad) {
    habilidad.addEventListener('click', function () {
      habilidad.classList.remove('habilidad--rebote');
      void habilidad.offsetWidth;
      habilidad.classList.add('habilidad--rebote');
      confetiDesde(habilidad, 10);
    });
  });
}


/* ---------------------------------------------------------
   9. COPIAR MI CORREO (index.html y contacto.html)
   Agrega un botón "Copiar" al lado de mi correo.
   --------------------------------------------------------- */
function copiarTexto(texto) {
  // forma moderna; si el navegador no la permite, uso la forma antigua
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(texto);
  }
  return new Promise(function (resolver, fallar) {
    const temporal = document.createElement('textarea');
    temporal.value = texto;
    temporal.style.position = 'fixed';
    temporal.style.opacity = '0';
    document.body.appendChild(temporal);
    temporal.select();
    const funciono = document.execCommand('copy');
    temporal.remove();
    funciono ? resolver() : fallar();
  });
}

function iniciarCopiarCorreo() {
  // lugares donde aparece mi correo
  const lugares = [
    { caja: document.querySelector('.contacto-rapido__correo'), oscuro: true },
    { caja: Array.from(document.querySelectorAll('.contacto-dato__valor'))
              .find(function (el) { return el.textContent.includes('@'); }), oscuro: false }
  ];

  lugares.forEach(function (lugar) {
    if (!lugar.caja) return;

    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'boton-copiar' + (lugar.oscuro ? ' boton-copiar--oscuro' : '');
    boton.textContent = 'Copiar';
    boton.setAttribute('aria-label', 'Copiar mi correo');
    lugar.caja.appendChild(boton);

    boton.addEventListener('click', function () {
      copiarTexto(MI_CORREO).then(function () {
        boton.textContent = '¡Copiado!';
        mostrarAviso('¡Correo copiado! 📋 Pégalo donde quieras');
        confetiDesde(boton, 14);
        setTimeout(function () { boton.textContent = 'Copiar'; }, 2000);
      }).catch(function () {
        mostrarAviso('No se pudo copiar, pero aquí está: ' + MI_CORREO);
      });
    });
  });
}


/* ---------------------------------------------------------
   10. FILTROS DEL PORTAFOLIO (portafolio.html)
   Los botones están en el HTML (<div class="filtros">).
   Cada tarjeta dice a qué filtros pertenece con data-filtro="...".
   --------------------------------------------------------- */
function iniciarFiltros() {
  const caja = document.querySelector('.filtros');
  if (!caja) return;

  const botones = Array.from(caja.querySelectorAll('.filtro'));
  const tarjetas = Array.from(document.querySelectorAll('.proyecto'));

  function perteneceA(tarjeta, filtro) {
    if (filtro === 'todos') return true;
    return (tarjeta.dataset.filtro || '').split(' ').includes(filtro);
  }

  caja.hidden = false; // sin JavaScript los botones no sirven, por eso empiezan escondidos

  botones.forEach(function (boton) {
    const filtro = boton.dataset.filtro;

    // le pongo a cada botón cuántos proyectos tiene
    const cuantos = tarjetas.filter(function (t) { return perteneceA(t, filtro); }).length;
    const numero = document.createElement('span');
    numero.className = 'filtro__numero';
    numero.textContent = cuantos;
    boton.appendChild(numero);

    boton.addEventListener('click', function () {
      botones.forEach(function (b) { b.setAttribute('aria-pressed', b === boton ? 'true' : 'false'); });

      let orden = 0;
      tarjetas.forEach(function (tarjeta) {
        const mostrar = perteneceA(tarjeta, filtro);
        tarjeta.hidden = !mostrar;

        // las que se quedan vuelven a aparecer con su animación
        if (mostrar && !movimientoReducido) {
          tarjeta.classList.remove('aparecer--visible');
          void tarjeta.offsetWidth;
          tarjeta.style.setProperty('--retraso', (orden * 0.07) + 's');
          tarjeta.classList.add('aparecer', 'aparecer--visible');
          orden++;
        }
      });
    });
  });
}


/* ---------------------------------------------------------
   11. VISOR DE IMÁGENES (portafolio.html)
   Clic en la imagen de un proyecto = se abre en grande y completa
   (sin recorte). Se pasa de proyecto con las flechas, con el teclado
   (← →) o deslizando el dedo en el celular. Esc o clic afuera = cerrar.
   --------------------------------------------------------- */
function iniciarVisor() {
  const tarjetas = Array.from(document.querySelectorAll('.proyecto'));
  if (tarjetas.length === 0 || typeof HTMLDialogElement !== 'function') return;
  if (!document.querySelector('.filtros')) return; // el visor es solo del portafolio; en el inicio las tarjetas llevan al proyecto

  // armo la ventana una sola vez
  const visor = document.createElement('dialog');
  visor.className = 'visor';
  visor.setAttribute('aria-label', 'Visor de proyectos');
  visor.innerHTML =
    '<button type="button" class="visor__cerrar" aria-label="Cerrar">×</button>' +
    '<button type="button" class="visor__flecha visor__flecha--izq" aria-label="Proyecto anterior">‹</button>' +
    '<button type="button" class="visor__flecha visor__flecha--der" aria-label="Proyecto siguiente">›</button>' +
    '<figure class="visor__figura">' +
    '  <img class="visor__imagen" alt="">' +
    '  <figcaption class="visor__info">' +
    '    <span class="proyecto__categoria visor__categoria"></span>' +
    '    <p class="visor__titulo"></p>' +
    '    <p class="visor__descripcion"></p>' +
    '    <p class="proyecto__colaboracion visor__colaboracion"></p>' +
    '    <p class="visor__contador"></p>' +
    '  </figcaption>' +
    '</figure>';
  document.body.appendChild(visor);

  const imagen = visor.querySelector('.visor__imagen');
  let tarjetaActual = null;

  // solo recorro las tarjetas que se ven (por si hay un filtro puesto)
  function tarjetasVisibles() {
    return tarjetas.filter(function (t) { return !t.hidden; });
  }

  function mostrar(tarjeta) {
    tarjetaActual = tarjeta;
    const lista = tarjetasVisibles();
    const foto = tarjeta.querySelector('.proyecto__imagen');
    const colaboracion = tarjeta.querySelector('.proyecto__colaboracion');

    imagen.src = foto.src;
    imagen.alt = foto.alt;
    visor.querySelector('.visor__categoria').textContent = tarjeta.querySelector('.proyecto__categoria').textContent;
    visor.querySelector('.visor__titulo').textContent = tarjeta.querySelector('.proyecto__titulo').textContent;
    visor.querySelector('.visor__descripcion').textContent = tarjeta.querySelector('.proyecto__descripcion').textContent.trim();
    visor.querySelector('.visor__colaboracion').textContent = colaboracion ? colaboracion.textContent : '';
    visor.querySelector('.visor__contador').textContent = (lista.indexOf(tarjeta) + 1) + ' de ' + lista.length;

    imagen.classList.remove('visor__imagen--entra');
    void imagen.offsetWidth;
    imagen.classList.add('visor__imagen--entra');
  }

  function mover(cuanto) {
    const lista = tarjetasVisibles();
    const posicion = lista.indexOf(tarjetaActual);
    mostrar(lista[(posicion + cuanto + lista.length) % lista.length]);
  }

  function abrir(tarjeta) {
    mostrar(tarjeta);
    visor.showModal();
    document.body.style.overflow = 'hidden'; // que no se mueva la página de atrás
  }

  visor.addEventListener('close', function () {
    document.body.style.overflow = '';
    // devuelvo el foco a la imagen que abrió el visor (teclado)
    if (tarjetaActual) tarjetaActual.querySelector('.proyecto__imagen').focus();
  });

  visor.querySelector('.visor__cerrar').addEventListener('click', function () { visor.close(); });
  visor.querySelector('.visor__flecha--izq').addEventListener('click', function () { mover(-1); });
  visor.querySelector('.visor__flecha--der').addEventListener('click', function () { mover(1); });

  // clic en el fondo oscuro = cerrar
  visor.addEventListener('click', function (e) { if (e.target === visor) visor.close(); });

  // flechas del teclado
  visor.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') mover(-1);
    if (e.key === 'ArrowRight') mover(1);
  });

  // deslizar con el dedo en el celular
  let inicioX = null;
  visor.addEventListener('touchstart', function (e) { inicioX = e.touches[0].clientX; }, { passive: true });
  visor.addEventListener('touchend', function (e) {
    if (inicioX === null) return;
    const distancia = e.changedTouches[0].clientX - inicioX;
    if (Math.abs(distancia) > 50) mover(distancia < 0 ? 1 : -1);
    inicioX = null;
  });

  // preparo cada tarjeta: la imagen se vuelve "botón" y le pongo la etiqueta "Ver completa"
  tarjetas.forEach(function (tarjeta) {
    const foto = tarjeta.querySelector('.proyecto__imagen');
    const titulo = tarjeta.querySelector('.proyecto__titulo').textContent;

    foto.tabIndex = 0;
    foto.setAttribute('role', 'button');
    foto.setAttribute('aria-label', 'Ver imagen completa de ' + titulo);

    const lupa = document.createElement('span');
    lupa.className = 'proyecto__lupa';
    lupa.setAttribute('aria-hidden', 'true');
    lupa.textContent = '⤢ Ver completa';
    tarjeta.appendChild(lupa);

    foto.addEventListener('click', function () { abrir(tarjeta); });
    foto.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrir(tarjeta); }
    });
  });
}


/* ---------------------------------------------------------
   12. TARJETAS QUE SE INCLINAN CON EL MOUSE (portafolio.html)
   Solo en computador (en celular no hay mouse).
   --------------------------------------------------------- */
function iniciarInclinacion() {
  const hayMouse = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (movimientoReducido || !hayMouse) return;

  document.querySelectorAll('.proyecto').forEach(function (tarjeta) {
    tarjeta.addEventListener('mousemove', function (e) {
      const caja = tarjeta.getBoundingClientRect();
      const x = (e.clientX - caja.left) / caja.width - 0.5;  // -0.5 (izquierda) a 0.5 (derecha)
      const y = (e.clientY - caja.top) / caja.height - 0.5;  // -0.5 (arriba) a 0.5 (abajo)
      tarjeta.style.transform =
        'perspective(900px) translateY(-6px) rotateX(' + (-y * 6) + 'deg) rotateY(' + (x * 6) + 'deg)';
    });
    tarjeta.addEventListener('mouseleave', function () {
      tarjeta.style.transform = ''; // vuelve a lo normal del CSS
    });
  });
}


/* ---------------------------------------------------------
   13. FORMULARIO DE CONTACTO (contacto.html)
   - Cuenta los caracteres del mensaje.
   - Al enviar: no recarga la página. Muestra un mensaje de gracias
     con confeti y un botón que abre el correo de la persona con
     todo ya escrito, listo para enviármelo.
   --------------------------------------------------------- */
function iniciarFormulario() {
  const formulario = document.querySelector('.form-tarjeta');
  if (!formulario) return;

  // contador de caracteres debajo del mensaje
  const mensaje = formulario.querySelector('#mensaje');
  if (mensaje) {
    const contador = document.createElement('p');
    contador.className = 'form-contador';
    mensaje.insertAdjacentElement('afterend', contador);
    const actualizar = function () {
      const n = mensaje.value.length;
      contador.textContent = n + (n === 1 ? ' carácter' : ' caracteres');
    };
    mensaje.addEventListener('input', actualizar);
    actualizar();
  }

  // el navegador ya revisa que todo esté lleno ("required") antes de llegar aquí
  formulario.addEventListener('submit', function (e) {
    e.preventDefault(); // que no recargue la página ni ponga los datos en la URL

    const nombre = formulario.nombre.value.trim();
    const correo = formulario.email.value.trim();
    const asunto = formulario.asunto.options[formulario.asunto.selectedIndex].text;
    const texto = formulario.mensaje.value.trim();
    const primerNombre = nombre.split(' ')[0];

    // enlace que abre el programa de correo con todo escrito
    const enlaceCorreo = 'mailto:' + MI_CORREO +
      '?subject=' + encodeURIComponent('Proyecto de ' + asunto + ' — ' + nombre) +
      '&body=' + encodeURIComponent(texto + '\n\n— ' + nombre + ' (' + correo + ')');

    // armo la tarjeta de gracias (uso textContent para que nadie pueda meter código raro)
    const gracias = document.createElement('div');
    gracias.className = 'form-tarjeta form-gracias';
    gracias.setAttribute('role', 'status');
    gracias.tabIndex = -1;
    gracias.innerHTML =
      '<p class="form-gracias__emoji" aria-hidden="true">🎉</p>' +
      '<p class="form-gracias__titulo"></p>' +
      '<p class="form-gracias__texto"></p>' +
      '<div class="form-gracias__botones">' +
      '  <a class="boton boton--primario">Enviar por mi correo</a>' +
      '  <button type="button" class="boton boton--secundario">Escribir otro mensaje</button>' +
      '</div>' +
      '<p class="form-aviso">Este formulario es una maqueta: el botón de arriba abre tu correo con el mensaje ya escrito.</p>';

    gracias.querySelector('.form-gracias__titulo').textContent = '¡Gracias, ' + primerNombre + '!';
    gracias.querySelector('.form-gracias__texto').textContent =
      'Tu mensaje sobre ' + asunto.toLowerCase() + ' quedó listo. Dale al botón para enviármelo desde tu correo y te respondo pronto.';
    gracias.querySelector('a').href = enlaceCorreo;

    gracias.querySelector('button').addEventListener('click', function () {
      formulario.reset();
      if (mensaje) mensaje.dispatchEvent(new Event('input')); // el contador vuelve a 0
      gracias.remove();
      formulario.hidden = false;
      formulario.nombre.focus();
    });

    formulario.hidden = true;
    formulario.insertAdjacentElement('afterend', gracias);
    gracias.focus();
    confetiDesde(gracias, 100);
  });
}


/* ---------------------------------------------------------
   14. ESTRELLAS FUGACES (todas las páginas)
   Cada 4 a 9 segundos cruza una estrella fugaz por el cielo.
   El dibujo y la animación están en la parte 10 del CSS (.estrella-fugaz).
   --------------------------------------------------------- */
function iniciarEstrellasFugaces() {
  if (movimientoReducido) return;

  function lanzarUna() {
    // solo si la pestaña se está viendo (no gasta batería en segundo plano)
    if (!document.hidden) {
      const estrella = document.createElement('span');
      estrella.className = 'estrella-fugaz';
      estrella.setAttribute('aria-hidden', 'true');

      // sale de un punto al azar en la parte de arriba de la pantalla
      estrella.style.left = (20 + Math.random() * 75) + '%';
      estrella.style.top = (Math.random() * 40) + '%';
      // y baja hacia la izquierda con un ángulo un poco distinto cada vez
      estrella.style.setProperty('--angulo', (135 + Math.random() * 25) + 'deg');

      document.body.appendChild(estrella);
      estrella.addEventListener('animationend', function () { estrella.remove(); });
    }
    setTimeout(lanzarUna, 4000 + Math.random() * 5000);
  }

  setTimeout(lanzarUna, 1500); // la primera sale rapidito
}


/* ---------------------------------------------------------
   16. ARCADE: LA NAVE VIAJA AL PLANETA (juegos.html)
   - Al pasar el mouse (o Tab) por un planeta, la nave gira para mirarlo.
   - Al hacer clic: la nave gira, despega hacia el planeta, se hace
     chiquita (se aleja), la pantalla se llena del color del planeta
     y entra al juego.
   - Los planetas son enlaces normales: sin JavaScript igual funcionan.
   --------------------------------------------------------- */
function iniciarArcade() {
  const escena = document.querySelector('.arcade__escena');
  if (!escena) return;

  const nave = escena.querySelector('.nave');
  const giro = escena.querySelector('.nave__giro');
  const planetas = Array.from(escena.querySelectorAll('.planeta'));
  const segmentos = Array.from(escena.querySelectorAll('.arcade__segmento'));
  const progreso = escena.querySelector('.arcade__progreso');
  const barra = escena.querySelector('.arcade__barra');
  const contador = escena.querySelector('.arcade__contador-actual');
  const panel = document.querySelector('.ficha-juego');
  const despegar = panel.querySelector('.ficha-juego__despegar');
  let viajando = false;
  let activo = 0; // el planeta elegido (0 = el primero)
  let escena3d = null; // la escena 3D (si el navegador la permite; ver js/arcade3d.js)

  // con JavaScript se muestran el panel, la barra de progreso y la barra de abajo
  document.querySelector('.arcade').classList.add('arcade--js');
  panel.hidden = false;
  barra.hidden = false;
  progreso.hidden = false;

  // centro de un elemento en la pantalla
  function centro(elemento) {
    const caja = elemento.getBoundingClientRect();
    return { x: caja.left + caja.width / 2, y: caja.top + caja.height / 2 };
  }

  // gira la nave hacia un planeta y devuelve cuánto tiene que viajar
  function apuntarA(planeta) {
    const desde = centro(nave);
    const hacia = centro(planeta.querySelector('.planeta__esfera'));
    const dx = hacia.x - desde.x;
    const dy = hacia.y - desde.y;
    // atan2 da el ángulo en radianes; lo paso a grados. +90 porque la nave está dibujada mirando hacia arriba
    const grados = Math.atan2(dy, dx) * 180 / Math.PI + 90;
    giro.style.transform = 'rotate(' + grados + 'deg)';
    return { dx: dx, dy: dy, destino: hacia };
  }

  // la nave siempre vuelve a mirar al planeta elegido
  function mirarAlElegido() {
    if (!viajando) apuntarA(planetas[activo]);
  }

  function dosDigitos(n) {
    return (n < 10 ? '0' : '') + n;
  }

  // elige un planeta: lo resalta, gira la nave y llena el panel con su descripción
  function elegir(i) {
    activo = (i + planetas.length) % planetas.length;
    const planeta = planetas[activo];
    const bloqueado = planeta.classList.contains('planeta--bloqueado');

    planetas.forEach(function (p, n) {
      p.classList.toggle('planeta--activo', n === activo);
      // el carrusel 3D: el elegido al centro, el siguiente a la derecha y el otro a la izquierda
      const item = p.closest('.planetas__item');
      const lugar = (n - activo + planetas.length) % planetas.length;
      item.classList.toggle('planetas__item--centro', lugar === 0);
      item.classList.toggle('planetas__item--der', lugar === 1);
      item.classList.toggle('planetas__item--izq', lugar > 1);
    });
    segmentos.forEach(function (s, n) {
      s.classList.toggle('arcade__segmento--activo', n === activo);
    });
    contador.textContent = dosDigitos(activo + 1);

    panel.querySelector('.ficha-juego__numero').textContent = dosDigitos(activo + 1);
    panel.querySelector('.ficha-juego__titulo').textContent = planeta.querySelector('.planeta__nombre').textContent;
    panel.querySelector('.ficha-juego__texto').textContent = planeta.dataset.descripcion;
    panel.querySelector('.ficha-juego__genero').textContent = planeta.dataset.genero;
    panel.querySelector('.ficha-juego__jugadores').textContent = planeta.dataset.jugadores;
    panel.querySelector('.ficha-juego__controles').textContent = planeta.dataset.controles;
    panel.querySelector('.ficha-juego__mini').className = 'ficha-juego__mini ficha-juego__mini--' + planeta.dataset.mini;

    if (bloqueado) {
      despegar.removeAttribute('href');
      despegar.setAttribute('aria-disabled', 'true');
      despegar.textContent = 'En construcción';
    } else {
      despegar.setAttribute('href', planeta.getAttribute('href'));
      despegar.removeAttribute('aria-disabled');
      despegar.textContent = 'Despegar';
    }

    // el panel "entra" otra vez para que se note el cambio
    panel.classList.remove('ficha-juego--cambia');
    void panel.offsetWidth;
    panel.classList.add('ficha-juego--cambia');

    mirarAlElegido();
    setTimeout(mirarAlElegido, 700); // y otra vez cuando el carrusel termina de girar
    if (escena3d) escena3d.elegir(activo); // en 3D, la nave gira hacia el planeta
  }

  function esperar(ms) {
    return new Promise(function (listo) { setTimeout(listo, ms); });
  }

  // el planeta en construcción solo se sacude y avisa
  function avisarConstruccion(planeta) {
    planeta.classList.remove('planeta--sacudir');
    void planeta.offsetWidth;
    planeta.classList.add('planeta--sacudir');
    mostrarAviso('🛠️ Este planeta está en construcción. ¡Pronto habrá un juego nuevo!');
  }

  // despega hacia el planeta elegido (o avisa si está en construcción)
  function despegarAlElegido() {
    const planeta = planetas[activo];
    if (planeta.classList.contains('planeta--bloqueado')) {
      avisarConstruccion(planeta);
    } else {
      viajar(planeta);
    }
  }

  async function viajar(planeta) {
    if (viajando) return;
    viajando = true;
    const destino = planeta.href;

    // sin animaciones (reducir movimiento o navegador viejo): entro directo
    if (movimientoReducido || !nave.animate) {
      location.href = destino;
      return;
    }

    escena.classList.add('arcade__escena--viajando');

    // con la escena 3D: despegue y salto a hiperespacio, y luego se abre el juego
    if (escena3d) {
      await escena3d.hiperespacio(planetas.indexOf(planeta));
      const velo = document.createElement('div');
      velo.className = 'warp warp--hiper';
      velo.setAttribute('aria-hidden', 'true');
      velo.style.setProperty('--color', planeta.dataset.color || '#29B6F6');
      document.body.appendChild(velo);
      await velo.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 350, easing: 'ease-in', fill: 'forwards' }).finished;
      location.href = destino;
      return;
    }

    planeta.classList.add('planeta--destino');

    // 1) la nave gira hacia el planeta
    const ruta = apuntarA(planeta);
    await esperar(450);

    // 2) motor a fondo y vuela hasta el planeta, haciéndose pequeña
    nave.classList.add('nave--turbo');
    const vuelo = nave.animate([
      { transform: 'translate(0, 0) scale(1)' },
      { transform: 'translate(' + ruta.dx + 'px, ' + ruta.dy + 'px) scale(0.3)' }
    ], { duration: 900, easing: 'cubic-bezier(0.55, 0, 0.75, 0.2)', fill: 'forwards' });
    await vuelo.finished;

    // 3) el planeta crece y la pantalla se llena de su color desde el centro del planeta
    const x = ruta.destino.x + 'px';
    const y = ruta.destino.y + 'px';
    const destello = document.createElement('div');
    destello.className = 'warp';
    destello.setAttribute('aria-hidden', 'true');
    destello.style.setProperty('--x', x);
    destello.style.setProperty('--y', y);
    destello.style.setProperty('--color', planeta.dataset.color || '#29B6F6');
    document.body.appendChild(destello);

    planeta.querySelector('.planeta__esfera').animate([
      { transform: 'scale(1.18)' },
      { transform: 'scale(2.6)' }
    ], { duration: 650, easing: 'ease-in', fill: 'forwards' });

    const llenar = destello.animate([
      { clipPath: 'circle(0px at ' + x + ' ' + y + ')' },
      { clipPath: 'circle(150vmax at ' + x + ' ' + y + ')' }
    ], { duration: 650, easing: 'ease-in', fill: 'forwards' });
    await llenar.finished;

    // 4) ¡a jugar!
    location.href = destino;
  }

  planetas.forEach(function (planeta, i) {
    // al pasar el mouse (o con Tab) la nave mira ese planeta; al salir, vuelve al elegido
    planeta.addEventListener('mouseenter', function () { if (!viajando) apuntarA(planeta); });
    planeta.addEventListener('focus', function () { if (!viajando) apuntarA(planeta); });
    planeta.addEventListener('mouseleave', mirarAlElegido);
    planeta.addEventListener('blur', mirarAlElegido);

    planeta.addEventListener('click', function (e) {
      // si lo abren en otra pestaña (Ctrl, Cmd, Shift o clic del medio), dejo el enlace normal
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      if (viajando) return;
      if (i !== activo) {
        elegir(i);          // primer clic: lo elige y muestra la descripción
      } else {
        despegarAlElegido(); // clic en el que ya está elegido: despega
      }
    });
  });

  // botón "Despegar" del panel
  despegar.addEventListener('click', function (e) {
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    if (!viajando) despegarAlElegido();
  });

  // flechitas de la barra de abajo
  barra.querySelectorAll('.arcade__flecha').forEach(function (flecha) {
    flecha.addEventListener('click', function () {
      if (!viajando) elegir(activo + Number(flecha.dataset.paso));
    });
  });

  // teclado: ← → eligen y Enter despega (solo si no estoy escribiendo ni parado en un botón)
  document.addEventListener('keydown', function (e) {
    if (viajando || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      elegir(activo - 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      elegir(activo + 1);
    } else if (e.key === 'Enter' && document.activeElement === document.body) {
      e.preventDefault();
      despegarAlElegido();
    }
  });

  // si cambia el tamaño de la ventana, la nave vuelve a apuntar bien
  window.addEventListener('resize', mirarAlElegido);
  window.addEventListener('load', mirarAlElegido); // cuando ya cargó todo, la nave apunta bien

  elegir(0);

  // escena 3D con Three.js: se carga aparte; si falla (sin WebGL, sin internet...) se queda el carrusel de CSS
  const lienzo = escena.querySelector('.arcade__lienzo');
  if (lienzo && 'WebGLRenderingContext' in window) {
    import('./arcade3d.js').then(function (modulo) {
      lienzo.hidden = false;
      document.querySelector('.arcade').classList.add('arcade--3d');
      try {
        escena3d = modulo.crearEscena({
          contenedor: lienzo,
          reducido: movimientoReducido,
          planetas: planetas.map(function (p) {
            return { id: p.dataset.mini, nombre: p.querySelector('.planeta__nombre').textContent, color: p.dataset.color || '#9DB8FF' };
          }),
          alClic: function (i) {
            if (viajando) return;
            if (i !== activo) elegir(i);   // primer clic: lo elige
            else despegarAlElegido();      // clic en el elegido: despega
          }
        });
        escena3d.elegir(activo, true);
      } catch (error) {
        escena3d = null;
        lienzo.hidden = true;
        lienzo.textContent = '';
        document.querySelector('.arcade').classList.remove('arcade--3d');
      }
    }).catch(function () { /* sin escena 3D: sigue el carrusel de CSS */ });
  }

  // si vuelven con el botón "atrás", el navegador puede mostrar la página congelada
  // a mitad del viaje: en ese caso la recargo para que todo empiece de nuevo
  window.addEventListener('pageshow', function (e) {
    if (e.persisted) location.reload();
  });
}


/* ---------------------------------------------------------
   18. PÁGINA DE UN JUEGO (cosmoball.html)
   El juego está dentro de una ventana (iframe). Cuando termina de
   cargar, le paso el foco para que el teclado funcione de una vez
   (sin tener que hacer clic primero).
   --------------------------------------------------------- */
function iniciarVentanaJuego() {
  const ventana = document.querySelector('.juego__ventana');
  if (!ventana) return;

  ventana.addEventListener('load', function () {
    try { ventana.contentWindow.focus(); } catch (e) { /* si no se puede, basta con hacer clic */ }
  });
}


/* ---------------------------------------------------------
   19. BOTÓN MODO CLARO / OSCURO (todas las páginas)
   - Oscuro = el tema espacial. Claro = mis colores de antes (blanco y azul).
   - Lo elegido se guarda en localStorage ("santisarm.tema") y js/tema.js
     lo pone al entrar a cualquier página.
   - El CSS cambia solo: en styles.css (parte 1) el bloque
     html[data-tema="claro"] cambia los colores --espacio-.
   --------------------------------------------------------- */
const ICONO_LUNA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 14.5A9 9 0 0 1 9.5 3a7.5 7.5 0 1 0 11.5 11.5z"/></svg>';
const ICONO_SOL = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="5"/><path d="M11 1h2v4h-2zM11 19h2v4h-2zM1 11h4v2H1zM19 11h4v2h-4zM3.5 5l1.5-1.5 2.8 2.8-1.5 1.5zM16.2 17.7l1.5-1.5 2.8 2.8-1.5 1.5zM3.5 19l2.8-2.8 1.5 1.5L5 20.5zM16.2 6.3 19 3.5 20.5 5l-2.8 2.8z"/></svg>';

function iniciarTema() {
  const nav = document.querySelector('nav[aria-label="Menú principal"]');
  if (!nav) return;

  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = 'tema-boton';
  nav.appendChild(boton);

  function temaActual() {
    return document.documentElement.getAttribute('data-tema') === 'claro' ? 'claro' : 'oscuro';
  }

  // El botón muestra el modo AL QUE vas a cambiar: en oscuro sale el sol, en claro la luna
  function pintar() {
    const claro = temaActual() === 'claro';
    boton.innerHTML = claro ? ICONO_LUNA : ICONO_SOL;
    boton.setAttribute('aria-label', claro ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro');
    boton.title = boton.getAttribute('aria-label');
    boton.setAttribute('aria-pressed', claro ? 'true' : 'false');
  }

  boton.addEventListener('click', function () {
    const nuevo = temaActual() === 'claro' ? 'oscuro' : 'claro';
    document.documentElement.setAttribute('data-tema', nuevo);
    try { localStorage.setItem('santisarm.tema', nuevo); } catch (e) { /* no se guarda, pero cambia igual */ }
    pintar();
    mostrarAviso(nuevo === 'claro' ? '☀️ Modo claro' : '🌙 Modo oscuro');
  });

  pintar();
}


/* ---------------------------------------------------------
   20. PÁGINA DE CADA PROYECTO (proyecto-*.html)
   - Barra celeste arriba que se llena mientras leo.
   - La imagen de la obra se inclina con el mouse (solo computador).
   - Los colores se copian con un toque (uso copiarTexto de la parte 9).
   --------------------------------------------------------- */
function iniciarFicha() {
  if (!document.querySelector('.ficha-pagina')) return;

  // barra de lectura
  const barra = document.createElement('div');
  barra.className = 'ficha__progreso';
  barra.setAttribute('aria-hidden', 'true');
  document.body.appendChild(barra);

  function pintarBarra() {
    const total = document.documentElement.scrollHeight - window.innerHeight;
    const avance = total > 0 ? Math.min(1, window.scrollY / total) : 0;
    barra.style.transform = 'scaleX(' + avance + ')';
  }
  window.addEventListener('scroll', pintarBarra, { passive: true });
  window.addEventListener('resize', pintarBarra);
  pintarBarra();

  // inclinación de la obra
  const hayMouse = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (!movimientoReducido && hayMouse) {
    document.querySelectorAll('.ficha__img').forEach(function (img) {
      img.addEventListener('pointermove', function (e) {
        const caja = img.getBoundingClientRect();
        const x = (e.clientX - caja.left) / caja.width - 0.5;
        const y = (e.clientY - caja.top) / caja.height - 0.5;
        img.style.transform = 'perspective(900px) rotateY(' + (x * 6) + 'deg) rotateX(' + (-y * 6) + 'deg)';
      });
      img.addEventListener('pointerleave', function () {
        img.style.transform = '';
      });
    });
  }

  // colores que se copian
  document.querySelectorAll('.ficha__muestra').forEach(function (boton) {
    boton.addEventListener('click', function () {
      const codigo = boton.dataset.hex;
      copiarTexto(codigo).then(
        function () { mostrarAviso('Color ' + codigo + ' copiado'); },
        function () { mostrarAviso('Color ' + codigo); }
      );
    });
  });
}


/* ---------------------------------------------------------
   17. ENCENDER TODO
   Si algún día quiero apagar un efecto, solo pongo // delante de su línea.
   --------------------------------------------------------- */
prepararAviso();
iniciarAparecer();
iniciarHeaderCompacto();
iniciarVolverArriba();
iniciarEscritura();
iniciarAvatar();
iniciarHabilidades();
iniciarCopiarCorreo();
iniciarFiltros();
iniciarVisor();
iniciarInclinacion();
iniciarFormulario();
iniciarEstrellasFugaces();
iniciarArcade();
iniciarVentanaJuego();
iniciarTema();
iniciarFicha();
