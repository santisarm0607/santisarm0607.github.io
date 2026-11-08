/* =========================================================
   GALAXY INVASION — interfaz.js
   Todo lo que se ve encima del juego: pantallas (menú,
   pausa, opciones...), el HUD (vida, escudo, munición,
   mira) y los avisos de logros.
   ========================================================= */

import { CONFIG } from './config.js';
import { ETAPAS, etiquetaEtapa } from './etapas.js';
import { personaje, textoPersonaje } from './personaje.js';

const $ = (id) => document.getElementById(id);

export class Interfaz {
  constructor(sonido) {
    this.sonido = sonido;
    this.pantallaActual = null;
    this.volverA = 'pantalla-menu';
    this.tiempoMarca = 0;
    this.tiempoDanio = 0;
    this.tiempoMensaje = 0;
    this.tiempoSubtitulo = 0;
    this.ultimasRanuras = '';

    // Referencias del HUD (se buscan una sola vez)
    this.el = {
      hud: $('hud'),
      tactil: $('controles-tactiles'),
      objetivoTitulo: $('objetivo-titulo'),
      objetivoDetalle: $('objetivo-detalle'),
      barraVida: $('barra-vida'),
      barraEscudo: $('barra-escudo'),
      textoVida: $('texto-vida'),
      textoEscudo: $('texto-escudo'),
      cargador: $('municion-cargador'),
      reserva: $('municion-reserva'),
      avisoRecarga: $('aviso-recarga'),
      mira: $('mira'),
      marca: $('marca-impacto'),
      indicador: $('indicador-danio'),
      vineta: $('vineta-danio'),
      avisoUsar: $('aviso-usar'),
      textoUsar: $('texto-usar'),
      ranuras: $('ranuras-armas'),
      nombreArma: $('nombre-arma'),
      rarezaArma: $('rareza-arma'),
      tipoMunicion: $('tipo-municion'),
      vinetaBaba: $('vineta-baba'),
      miraTelescopica: $('mira-telescopica'),
      marcador: $('marcador'),
      marcadorDistancia: $('marcador-distancia'),
      subtitulo: $('subtitulo'),
      barraJefe: $('barra-jefe'),
      velocimetro: $('velocimetro'),
      numeroVelocidad: $('numero-velocidad'),
      nombreJefe: $('nombre-jefe'),
      vidaJefe: $('vida-jefe'),
      pistaJefe: $('pista-jefe'),
      botonUsar: $('boton-usar'),
      mensaje: $('mensaje-centro'),
      fps: $('contador-fps'),
      notificaciones: $('notificaciones')
    };
    this.ultimoObjetivo = '';

    // Sonidos al pasar por encima y al hacer clic en cualquier botón de menú
    document.querySelectorAll('.pantalla').forEach((p) => {
      p.addEventListener('pointerenter', (e) => {
        if (e.target.matches && e.target.matches('.boton')) this.sonido.reproducir('uiEncima');
      }, true);
      p.addEventListener('click', (e) => {
        if (e.target.closest('.boton, input, select')) {
          this.sonido.iniciar();
          this.sonido.reproducir('uiClic');
        }
      });
    });

    // Botones "Volver"
    document.querySelectorAll('[data-volver]').forEach((b) => {
      b.addEventListener('click', () => this.mostrar(this.volverA));
    });
  }

  /* ---------------- Pantallas ---------------- */
  mostrar(id) {
    document.querySelectorAll('.pantalla').forEach((p) => { p.hidden = p.id !== id; });
    this.pantallaActual = id;
    if (id) {
      // Accesibilidad: el foco va al primer botón de la pantalla
      const primero = $(id).querySelector('.boton:not([disabled]), input, select');
      if (primero) setTimeout(() => primero.focus({ preventScroll: true }), 30);
    }
  }

  /* Abre una sub-pantalla (opciones, controles...) recordando a dónde volver */
  abrirSub(id, desde) {
    this.volverA = desde;
    this.mostrar(id);
  }

  mostrarHUD(visible) {
    this.el.hud.hidden = !visible;
    this.el.tactil.hidden = !visible;
    document.body.classList.toggle('jugando', visible);
  }

  /* ---------------- HUD ---------------- */
  actualizarHUD(jugador, arsenal, dt) {
    const e = this.el;
    const arma = arsenal.arma;
    e.barraVida.value = jugador.vida;
    e.barraEscudo.value = jugador.escudo;
    e.textoVida.textContent = Math.ceil(jugador.vida);
    e.textoEscudo.textContent = Math.ceil(jugador.escudo);
    e.hud.classList.toggle('vida-baja', jugador.vida <= 30);
    e.cargador.textContent = arma.cargador;
    e.reserva.textContent = arsenal.reserva;
    e.tipoMunicion.textContent = arma.datos.municion;
    e.cargador.classList.toggle('vacio', arma.cargador === 0);
    e.avisoRecarga.hidden = !arsenal.recargando && !(arma.cargador === 0 && arsenal.reserva === 0);
    e.avisoRecarga.textContent = arsenal.recargando ? 'RECARGANDO…' : 'SIN MUNICIÓN';
    this.ranurasArmas(arsenal);

    // La mira se abre con la dispersión del arma y se esconde al apuntar
    const apertura = 6 + arsenal.dispersionActual * 900;
    e.mira.style.setProperty('--apertura', apertura.toFixed(1) + 'px');
    e.mira.classList.toggle('apuntando', jugador.apuntado > 0.6);
    const conMira = arsenal.mirandoPorMira(jugador);
    e.miraTelescopica.hidden = !conMira;
    e.mira.classList.toggle('oculta', conMira);
    e.vinetaBaba.classList.toggle('visible', jugador.enBaba);

    // Marca de impacto y daño (se desvanecen solas)
    this.tiempoMarca -= dt;
    if (this.tiempoMarca <= 0) e.marca.classList.remove('visible', 'mortal');
    this.tiempoDanio -= dt;
    if (this.tiempoDanio <= 0) { e.indicador.classList.remove('visible'); e.vineta.classList.remove('visible'); }
    this.tiempoMensaje -= dt;
    if (this.tiempoMensaje <= 0) e.mensaje.classList.remove('visible');
    this.tiempoSubtitulo -= dt;
    if (this.tiempoSubtitulo <= 0) e.subtitulo.classList.remove('visible');
  }

  /* Las 3 ranuras de armas (1, 2, 3) y el nombre del arma en la mano */
  ranurasArmas(arsenal) {
    const clave = arsenal.armas.map((a) => a.tipo + a.rareza).join() + arsenal.actual;
    if (clave === this.ultimasRanuras) return;
    this.ultimasRanuras = clave;
    const e = this.el;
    const a = arsenal.arma;
    e.nombreArma.textContent = a.datos.nombre;
    e.rarezaArma.textContent = a.datos.nombreRareza;
    e.rarezaArma.style.setProperty('--color-rareza', a.datos.color);
    e.ranuras.replaceChildren();
    for (let i = 0; i < CONFIG.maxArmas; i++) {
      const li = document.createElement('li');
      const arma = arsenal.armas[i];
      li.className = 'ranura' + (i === arsenal.actual ? ' activa' : '') + (arma ? '' : ' vacia');
      li.textContent = arma ? (i + 1) + ' ' + arma.datos.nombre.split(' ')[0] : (i + 1) + ' —';
      if (arma) li.style.setProperty('--color-rareza', arma.datos.color);
      e.ranuras.append(li);
    }
  }

  /* Manejando: velocímetro en vez de la munición. velocidad en m/s (null = a pie) */
  manejando(velocidad) {
    const maneja = velocidad !== null;
    document.body.classList.toggle('manejando', maneja);
    this.el.velocimetro.hidden = !maneja;
    if (maneja) {
      const kmh = String(Math.round(Math.abs(velocidad) * 3.6));
      if (this.el.numeroVelocidad.textContent !== kmh) this.el.numeroVelocidad.textContent = kmh;
    }
  }

  /* Pantalla negra entre etapas (con el nombre de la que sigue) */
  fundido(visible, texto = '') {
    const f = document.getElementById('fundido');
    if (texto) document.getElementById('fundido-texto').textContent = texto;
    f.classList.toggle('visible', visible);
  }

  /* Barra de vida del jefe (arriba al centro). jefe = null la esconde */
  barraJefe(jefe) {
    const e = this.el;
    e.barraJefe.hidden = !jefe;
    document.body.classList.toggle('con-jefe', !!jefe);
    if (!jefe) return;
    if (e.nombreJefe.textContent !== jefe.nombre) e.nombreJefe.textContent = jefe.nombre;
    e.vidaJefe.max = jefe.vidaMax;
    e.vidaJefe.value = Math.max(0, jefe.vida);
    const pista = jefe.pista || '';
    if (e.pistaJefe.textContent !== pista) e.pistaJefe.textContent = pista;
  }

  /* Diálogo del personaje (Rosa o Tomás) abajo en la pantalla */
  subtitulo(texto, segundos = 4.5, hablante = null) {
    // hablante: otro que habla (por ejemplo 'Grabación' o '{pareja}'); si no, habla el personaje
    const quien = hablante ? textoPersonaje(hablante) : personaje().nombre;
    this.el.subtitulo.textContent = quien + ': ' + textoPersonaje(texto);
    this.el.subtitulo.classList.add('visible');
    this.tiempoSubtitulo = segundos;
  }

  /* Flecha hacia el objetivo. x, y en píxeles; angulo en grados; dentro = está en pantalla */
  marcador(info) {
    const m = this.el.marcador;
    if (!info) { m.hidden = true; return; }
    m.hidden = false;
    m.style.setProperty('--x', info.x.toFixed(0) + 'px');
    m.style.setProperty('--y', info.y.toFixed(0) + 'px');
    m.style.setProperty('--angulo', info.angulo.toFixed(0) + 'deg');
    m.classList.toggle('en-pantalla', info.dentro);
    this.el.marcadorDistancia.textContent = Math.round(info.distancia) + ' m';
  }

  objetivo({ titulo, detalle }) {
    const clave = titulo + detalle;
    if (clave === this.ultimoObjetivo) return;
    this.ultimoObjetivo = clave;
    this.el.objetivoTitulo.textContent = titulo;
    this.el.objetivoDetalle.textContent = detalle;
  }

  marcaImpacto(mortal) {
    this.el.marca.classList.add('visible');
    this.el.marca.classList.toggle('mortal', mortal);
    this.tiempoMarca = mortal ? 0.25 : 0.12;
  }

  /* angulo: de dónde viene el golpe (0 = de frente, 90 = derecha) */
  danio(angulo) {
    this.el.indicador.style.setProperty('--angulo', angulo.toFixed(0) + 'deg');
    this.el.indicador.classList.add('visible');
    this.el.vineta.classList.add('visible');
    this.tiempoDanio = 0.6;
  }

  /* Borra los textos que quedan de la partida anterior */
  limpiarTextos() {
    this.el.mensaje.classList.remove('visible');
    this.el.subtitulo.classList.remove('visible');
    this.tiempoMensaje = 0;
    this.tiempoSubtitulo = 0;
    this.ultimasRanuras = '';
  }

  mensaje(texto, segundos = 1.8) {
    this.el.mensaje.textContent = texto;
    this.el.mensaje.classList.add('visible');
    this.tiempoMensaje = segundos;
  }

  avisoUsar(texto) {
    this.el.avisoUsar.hidden = !texto;
    this.el.botonUsar.hidden = !texto;
    if (texto) {
      this.el.textoUsar.textContent = texto;
      this.el.botonUsar.textContent = texto.split(' ')[0];
    }
  }

  fps(valor, visible) {
    this.el.fps.hidden = !visible;
    if (visible) this.el.fps.textContent = valor + ' FPS';
  }

  /* ---------------- Logros ---------------- */
  avisoLogro(logro) {
    const aviso = document.createElement('div');
    aviso.className = 'aviso-logro';
    aviso.setAttribute('role', 'status');
    const titulo = document.createElement('p');
    titulo.className = 'aviso-logro-titulo';
    titulo.textContent = 'Logro desbloqueado';
    const nombre = document.createElement('p');
    nombre.className = 'aviso-logro-nombre';
    nombre.textContent = logro.nombre;
    aviso.append(titulo, nombre);
    this.el.notificaciones.append(aviso);
    setTimeout(() => aviso.classList.add('saliendo'), 3200);
    setTimeout(() => aviso.remove(), 3800);
  }

  listaLogros(datos) {
    const lista = $('lista-logros');
    lista.replaceChildren();
    let conseguidos = 0;
    CONFIG.logros.forEach((l) => {
      const fecha = datos.logros[l.id];
      if (fecha) conseguidos++;
      const item = document.createElement('li');
      item.className = 'logro' + (fecha ? ' conseguido' : '');
      const nombre = document.createElement('p');
      nombre.className = 'logro-nombre';
      nombre.textContent = l.nombre;
      const desc = document.createElement('p');
      desc.className = 'logro-descripcion';
      desc.textContent = l.descripcion;
      if (l.id === 'exterminador' && !fecha) desc.textContent += ` (${Math.min(l.meta, datos.estadisticas.zanganosEliminados)}/${l.meta})`;
      const estado = document.createElement('p');
      estado.className = 'logro-estado';
      estado.textContent = fecha ? 'Conseguido' : 'Bloqueado';
      item.append(nombre, desc, estado);
      lista.append(item);
    });
    $('resumen-logros').textContent = `${conseguidos} de ${CONFIG.logros.length} conseguidos`;
  }

  /* ---------------- Opciones ---------------- */
  cargarOpciones(op) {
    $('op-musica').value = op.musica;
    $('op-efectos').value = op.efectos;
    $('op-sensibilidad').value = op.sensibilidad;
    $('op-calidad').value = op.calidad;
    $('op-ayuda').checked = op.ayudaApuntado;
    $('op-fps').checked = op.mostrarFps;
    this.textosOpciones(op);
  }

  textosOpciones(op) {
    $('val-musica').textContent = op.musica;
    $('val-efectos').textContent = op.efectos;
    $('val-sensibilidad').textContent = op.sensibilidad;
  }

  leerOpciones() {
    return {
      musica: Number($('op-musica').value),
      efectos: Number($('op-efectos').value),
      sensibilidad: Number($('op-sensibilidad').value),
      calidad: $('op-calidad').value,
      ayudaApuntado: $('op-ayuda').checked,
      mostrarFps: $('op-fps').checked
    };
  }

  /* ---------------- Fin de partida ---------------- */
  /* Lista de etapas del Modo Historia */
  listaEtapas(datos, alElegir) {
    const lista = $('lista-capitulos');
    lista.replaceChildren();
    ETAPAS.forEach((et) => {
      const li = document.createElement('li');
      li.className = 'capitulo' + (et.estado === 'pronto' ? ' bloqueado' : '');
      const num = document.createElement('p');
      num.className = 'capitulo-numero';
      num.textContent = etiquetaEtapa(et);
      const nombre = document.createElement('h3');
      nombre.className = 'capitulo-nombre';
      nombre.textContent = et.nombre;
      const resumen = document.createElement('p');
      resumen.className = 'capitulo-resumen';
      resumen.textContent = textoPersonaje(et.resumen);
      li.append(num, nombre, resumen);
      if (et.estado === 'pronto') {
        const pronto = document.createElement('p');
        pronto.className = 'etiqueta-pronto';
        pronto.textContent = 'Llega en la ' + et.version;
        li.append(pronto);
      } else {
        const boton = document.createElement('button');
        boton.type = 'button';
        boton.className = 'boton' + (et.numero === 1 ? ' boton-principal' : '');
        boton.textContent = datos.progreso.completadas && datos.progreso.completadas[et.id] ? 'Jugar otra vez' : 'Jugar';
        boton.addEventListener('click', () => alElegir(et.id));
        const record = datos.progreso.mejoresTiempos[et.id];
        if (record) {
          const r = document.createElement('p');
          r.className = 'capitulo-record';
          r.textContent = 'Récord: ' + formatoTiempo(record);
          li.append(r);
        }
        li.append(boton);
      }
      lista.append(li);
    });
  }

  /* Texto de introducción de una etapa */
  introEtapa(et) {
    $('historia-eyebrow').textContent = etiquetaEtapa(et) + ' · ' + et.nombre;
    $('titulo-historia').textContent = et.titulo;
    const cont = $('historia-texto');
    cont.replaceChildren();
    et.texto.forEach((t) => {
      const p = document.createElement('p');
      p.innerHTML = textoPersonaje(t); // textos fijos del juego (con <strong>)
      cont.append(p);
    });
  }

  resultados(r) {
    $('victoria-eyebrow').textContent = etiquetaEtapa(r.etapa) + ' completada';
    $('titulo-victoria').textContent = r.etapa.victoria.titulo;
    $('victoria-nota').textContent = textoPersonaje(r.etapa.victoria.nota);
    $('res-tiempo').textContent = formatoTiempo(r.tiempo);
    $('res-eliminados').textContent = r.eliminados;
    $('res-punteria').textContent = r.punteria + ' %';
    $('res-record').textContent = r.mejorTiempo ? formatoTiempo(r.mejorTiempo) : '—';
    const sig = $('btn-siguiente');
    sig.hidden = !r.siguiente;
    if (r.siguiente) sig.textContent = 'Continuar: ' + r.siguiente.nombre;   // sigue la historia sin volver al menú
  }

  /* Selector granjera / granjero y los textos del menú que lo nombran */
  mostrarPersonaje(id) {
    document.querySelectorAll('[data-personaje]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.personaje === id)));
    const p = personaje();
    $('menu-lema').textContent = `${p.Un} ${p.tipo} contra la Colmena.`;
    $('nota-capitulos').textContent = textoPersonaje('La Colmena se llevó a {suPariente}. {completo} va a ir a buscarlo hasta el planeta de donde vienen.').replace('buscarlo', p.otro === 'granjera' ? 'buscarla' : 'buscarlo');
  }

  /* Botones de partida del menú (v0.6.5) */
  menuPartida(datos) {
    const g = datos.partida;
    const cont = $('btn-continuar-partida');
    const nueva = $('btn-nueva-partida');
    cont.hidden = !g;
    nueva.classList.toggle('boton-principal', !g);
    if (!g) return;
    const et = ETAPAS.find((e) => e.id === g.etapa);
    const quien = CONFIG.personajes[g.personaje] || CONFIG.personajes.granjera;
    if (g.terminada) {
      const sig = ETAPAS[ETAPAS.indexOf(et) + 1];
      cont.disabled = true;
      $('continuar-detalle').textContent = sig ? `${etiquetaEtapa(sig)} llega en la ${sig.version}` : 'Historia terminada';
    } else {
      cont.disabled = false;
      $('continuar-detalle').textContent = `${quien.nombre} · ${etiquetaEtapa(et)}: ${et.nombre}` + (g.control > 0 ? ' (punto de control)' : '');
    }
    $('nueva-nota').textContent = `Se borra tu partida guardada (${quien.nombre}, ${etiquetaEtapa(et)}: ${et.nombre}). Tus logros y récords se quedan.`;
  }

  /* ---------- v0.8 ---------- */
  /* Tarjeta grande "NUEVA MISIÓN" / "MISIÓN EXTRA" arriba al centro */
  tarjetaMision(titulo, detalle, extra = false, segundos = 3.8) {
    const el = $('tarjeta-mision');
    $('tarjeta-mision-tipo').textContent = extra ? 'MISIÓN EXTRA' : 'NUEVA MISIÓN';
    $('tarjeta-mision-titulo').textContent = textoPersonaje(titulo);
    $('tarjeta-mision-detalle').textContent = textoPersonaje(detalle);
    el.classList.toggle('extra', extra);
    el.hidden = false;
    requestAnimationFrame(() => el.classList.add('visible'));
    clearTimeout(this.tiempoTarjeta);
    this.tiempoTarjeta = setTimeout(() => {
      el.classList.remove('visible');
      setTimeout(() => { if (!el.classList.contains('visible')) el.hidden = true; }, 400);
    }, segundos * 1000);
  }

  /* Contadores de granadas y botiquines (al lado del arma) */
  mochila(granadas, botiquines) {
    if (this.ultimaMochila === granadas * 100 + botiquines) return;
    this.ultimaMochila = granadas * 100 + botiquines;
    $('hud-granadas').textContent = granadas;
    $('hud-botiquines').textContent = botiquines;
  }

  /* Lista chiquita de misiones extra (debajo del objetivo) */
  extras(lista) {
    const clave = lista.map((m) => m.nombre + m.progreso).join('|');
    if (clave === this.ultimasExtras) return;
    this.ultimasExtras = clave;
    const ul = $('lista-extras');
    ul.hidden = !lista.length;
    ul.innerHTML = lista.map((m) => `<li><span>${m.nombre}</span> · ${m.progreso}</li>`).join('');
  }

  recordMenu(datos) {
    const p = $('record-menu');
    const t = datos.progreso.mejoresTiempos.granja;
    p.hidden = !t;
    if (t) p.textContent = `Récord en la granja: ${formatoTiempo(t)}`;
  }
}

export function formatoTiempo(segundos) {
  const m = Math.floor(segundos / 60);
  const s = Math.floor(segundos % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}
