// =====================================================================
// GALAXY WAR - Lógica del juego (Three.js r128 + Web Audio API)
// Autor: David Santiago Sarmiento Salguero (SantiSarm)
// =====================================================================
(function () {
'use strict';

// =====================================================================
// 0. COMPROBACIÓN DE THREE.JS
// =====================================================================
if (typeof THREE === 'undefined') {
  document.getElementById('errorCarga').classList.add('visible');
  return;
}

// =====================================================================
// 1. UTILIDADES
// =====================================================================
const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const rand = (a, b) => a + Math.random() * (b - a);
const lerp = (a, b, t) => a + (b - a) * t;
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const ARRIBA = V3(0, 1, 0);

/** Elige una clave al azar según su peso. Ej: {caza:0.6, kamikaze:0.4} */
function elegirPonderado(pesos) {
  let total = 0;
  for (const k in pesos) total += pesos[k];
  let r = Math.random() * total;
  for (const k in pesos) { r -= pesos[k]; if (r <= 0) return k; }
  return Object.keys(pesos)[0];
}

/** Interpola ángulos por el camino más corto. */
function anguloLerp(a, b, t) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * clamp(t, 0, 1);
}

/** ¿El segmento a-b toca la esfera (c, r)? Evita que las balas rápidas atraviesen objetivos. */
function segmentoEsfera(a, b, c, r) {
  const abx = b.x - a.x, aby = b.y - a.y, abz = b.z - a.z;
  const acx = c.x - a.x, acy = c.y - a.y, acz = c.z - a.z;
  const ab2 = abx * abx + aby * aby + abz * abz;
  let t = ab2 > 0 ? (acx * abx + acy * aby + acz * abz) / ab2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const dx = a.x + abx * t - c.x, dy = a.y + aby * t - c.y, dz = a.z + abz * t - c.z;
  return dx * dx + dy * dy + dz * dz <= r * r;
}

/** Gira suavemente un vector dirección hacia otro (ambos normalizados). */
function girarHacia(dir, deseo, t) {
  dir.lerp(deseo, clamp(t, 0, 1));
  if (dir.lengthSq() < 1e-4) dir.set(deseo.z, 0.1, -deseo.x);
  dir.normalize();
}

/** Vector aleatorio de longitud dada. */
function vecAleatorio(out, largo) {
  out.set(rand(-1, 1), rand(-1, 1), rand(-1, 1));
  if (out.lengthSq() < 1e-4) out.set(1, 0, 0);
  return out.normalize().multiplyScalar(largo);
}

/** Generador aleatorio con semilla (para colocar asteroides siempre igual en cada nivel). */
function rngSemilla(s) {
  return function () {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// =====================================================================
// 2. CONFIGURACIÓN GENERAL
// =====================================================================
const CONFIG = {
  ARENA: 620,      // radio de la zona de combate
  ALTURA: 170,     // altura máxima (arriba y abajo)
  VERSION: '1.0'
};

// Detección automática de celular / pantalla táctil
let modoTactil = window.matchMedia('(pointer: coarse)').matches;

// =====================================================================
// 3. GUARDADO AUTOMÁTICO (localStorage)
// =====================================================================
const CLAVE_GUARDADO = 'galaxyWar_guardado_v1';

function guardadoPorDefecto() {
  return {
    version: 1,
    progreso: { tierra: 0, alien: 0 },       // niveles completados por bando (0-4)
    puntajes: { tierra: 0, alien: 0 },       // puntaje acumulado de la campaña
    bajas: { tierra: 0, alien: 0 },          // bajas acumuladas por bando (mejoras permanentes)
    mejorasNave: { tierra: [], alien: [] },  // mejoras elegidas al superar niveles
    records: { tierra: [], alien: [] },      // top 5 del modo infinito
    continuar: null,                          // { faccion, nivel } para "Seguir partida"
    logros: {},                               // id -> fecha
    stats: { derribos: 0, derribosMisil: 0, bandosJugados: {}, jefesDerrotados: {} },
    opciones: { musica: 0.6, efectos: 0.8, calidad: modoTactil ? 'media' : 'alta', invertirY: false, sensibilidad: 1, dificultad: 'normal', autoDisparo: true, apodo: '', salaCarrera: 'galaxia', bandoCarrera: 'tierra' }
  };
}
function esObjeto(o) { return o && typeof o === 'object' && !Array.isArray(o); }
function fusionar(base, datos) {
  if (!esObjeto(datos)) return base;
  for (const k in datos) {
    if (esObjeto(base[k]) && Object.keys(base[k]).length && esObjeto(datos[k])) fusionar(base[k], datos[k]);
    else if (k in base) base[k] = datos[k];
  }
  return base;
}
function cargarGuardado() {
  try {
    const t = localStorage.getItem(CLAVE_GUARDADO);
    if (t) return fusionar(guardadoPorDefecto(), JSON.parse(t));
  } catch (e) { /* datos dañados: se empieza de cero */ }
  return guardadoPorDefecto();
}
let guardado = cargarGuardado();
function guardar() {
  try { localStorage.setItem(CLAVE_GUARDADO, JSON.stringify(guardado)); } catch (e) { /* almacenamiento lleno o bloqueado */ }
}

// =====================================================================
// 4. DEFINICIÓN DE LOGROS
// =====================================================================
const LOGROS = [
  { id: 'primer_derribo', icono: '✦', nombre: 'Primer derribo', desc: 'Destruye tu primera nave enemiga.' },
  { id: 'primer_jefe', icono: '☠', nombre: 'Cazajefes', desc: 'Derrota a tu primer jefe.' },
  { id: 'intocable', icono: '🛡', nombre: 'Intocable', desc: 'Termina un nivel sin recibir daño.' },
  { id: 'doble_agente', icono: '⇄', nombre: 'Doble agente', desc: 'Juega con ambos bandos.' },
  { id: 'cien_naves', icono: '✈', nombre: 'As del espacio', desc: 'Destruye 100 naves enemigas.', progreso: () => [guardado.stats.derribos, 100] },
  { id: 'misilero', icono: '🚀', nombre: 'Lluvia de misiles', desc: 'Destruye 15 naves con el arma secundaria.', progreso: () => [guardado.stats.derribosMisil, 15] },
  { id: 'arsenal', icono: '⚡', nombre: 'Arsenal completo', desc: 'Mejora tu arma principal al nivel máximo.' },
  { id: 'defensor', icono: '🌍', nombre: 'Defensor de la Tierra', desc: 'Completa la campaña de los Militares de la Tierra.' },
  { id: 'conquistador', icono: '👾', nombre: 'Conquistador galáctico', desc: 'Completa la campaña de los Alienígenas.' },
  { id: 'leyenda', icono: '👑', nombre: 'Leyenda de la galaxia', desc: 'Derrota a los 8 jefes.', progreso: () => [Object.keys(guardado.stats.jefesDerrotados).length, 8] },
  { id: 'campeon', icono: '🏆', nombre: 'Campeón galáctico', desc: 'Gana una Carrera Galáctica.' },
  { id: 'sin_bajas', icono: '🏁', nombre: 'Piloto impecable', desc: 'Termina una carrera sin que te destruyan.' },
  { id: 'pesadilla', icono: '😈', nombre: 'Pesadilla', desc: 'Supera un nivel en dificultad Pesadilla.' }
];

// =====================================================================
// 5. AUDIO SINTETIZADO (Web Audio API)
//    Cada sonido es una función con nombre claro. Para cambiarlo por un
//    archivo real, reemplaza el cuerpo de la función por la reproducción
//    del archivo indicado en el comentario "Archivo:".
// =====================================================================
const Sonido = (() => {
  let ctx = null, salida, musicaGain, efectosGain, bufferRuido;
  let pistaPendiente = null;
  const ultimo = {};

  function iniciar() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    comp.connect(ctx.destination);
    salida = ctx.createGain(); salida.gain.value = 0.9; salida.connect(comp);
    musicaGain = ctx.createGain(); musicaGain.connect(salida);
    efectosGain = ctx.createGain(); efectosGain.connect(salida);
    bufferRuido = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = bufferRuido.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    aplicarVolumen();
    if (pistaPendiente) { const p = pistaPendiente; pistaPendiente = null; musica(p); }
  }
  function aplicarVolumen() {
    if (!ctx) return;
    musicaGain.gain.value = guardado.opciones.musica * 0.45;
    efectosGain.gain.value = guardado.opciones.efectos * 0.9;
  }
  function suspender() { if (ctx && ctx.state === 'running') ctx.suspend(); }
  function reanudar() { if (ctx && ctx.state === 'suspended') ctx.resume(); }
  function limitar(nombre, ms) {
    const ahora = performance.now();
    if (ultimo[nombre] && ahora - ultimo[nombre] < ms) return false;
    ultimo[nombre] = ahora; return true;
  }

  /** Oscilador con envolvente. o = {f, fFin, tipo, dur, vol, ataque, t, retraso, destino} */
  function tono(o) {
    if (!ctx) return;
    const t = o.t !== undefined ? o.t : ctx.currentTime + (o.retraso || 0);
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = o.tipo || 'square';
    osc.frequency.setValueAtTime(o.f, t);
    if (o.fFin) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.fFin), t + o.dur);
    const vol = o.vol || 0.2, at = Math.min(o.ataque || 0.005, o.dur * 0.5);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + at);
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    osc.connect(g); g.connect(o.destino || efectosGain);
    osc.start(t); osc.stop(t + o.dur + 0.05);
  }
  /** Ruido filtrado con envolvente (explosiones, viento, platillos). */
  function ruido(o) {
    if (!ctx) return;
    const t = o.t !== undefined ? o.t : ctx.currentTime + (o.retraso || 0);
    const src = ctx.createBufferSource(); src.buffer = bufferRuido; src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = o.filtro || 'lowpass';
    f.frequency.setValueAtTime(o.fc || 1500, t);
    if (o.fcFin) f.frequency.exponentialRampToValueAtTime(Math.max(20, o.fcFin), t + o.dur);
    f.Q.value = o.q || 1;
    const g = ctx.createGain(), vol = o.vol || 0.3, at = Math.min(o.ataque || 0.005, o.dur * 0.5);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + at);
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    src.connect(f); f.connect(g); g.connect(o.destino || efectosGain);
    src.start(t, Math.random() * 0.5); src.stop(t + o.dur + 0.05);
  }
  const semitono = (base, s) => base * Math.pow(2, s / 12);

  // ---------------- EFECTOS DE SONIDO ----------------
  const sfx = {
    // Archivo: sfx_disparo_tierra.wav
    disparoTierra() { if (!limitar('dT', 45)) return; tono({ f: 1400, fFin: 500, tipo: 'square', dur: 0.07, vol: 0.05 }); },
    // Archivo: sfx_disparo_alien.wav
    disparoAlien() { if (!limitar('dA', 60)) return; tono({ f: 320, fFin: 900, tipo: 'sine', dur: 0.12, vol: 0.12 }); tono({ f: 160, fFin: 450, tipo: 'triangle', dur: 0.12, vol: 0.06 }); },
    // Archivo: sfx_disparo_enemigo.wav
    disparoEnemigo() { if (!limitar('dE', 70)) return; tono({ f: 520, fFin: 200, tipo: 'triangle', dur: 0.12, vol: 0.05 }); },
    // Archivo: sfx_misil.wav
    misil() { ruido({ fc: 600, fcFin: 3000, filtro: 'bandpass', q: 2, dur: 0.45, vol: 0.25 }); tono({ f: 180, fFin: 520, tipo: 'sawtooth', dur: 0.35, vol: 0.05 }); },
    // Archivo: sfx_sin_municion.wav
    sinMunicion() { if (!limitar('sm', 200)) return; tono({ f: 200, tipo: 'square', dur: 0.08, vol: 0.06 }); tono({ f: 150, tipo: 'square', dur: 0.08, vol: 0.06, retraso: 0.09 }); },
    // Archivo: sfx_explosion_pequena.wav
    explosionPequena() { if (!limitar('eP', 50)) return; ruido({ fc: 2200, fcFin: 120, dur: 0.5, vol: 0.45 }); tono({ f: 140, fFin: 40, tipo: 'sine', dur: 0.35, vol: 0.3 }); },
    // Archivo: sfx_explosion_grande.wav
    explosionGrande() { ruido({ fc: 1600, fcFin: 60, dur: 1.6, vol: 0.7, ataque: 0.01 }); tono({ f: 90, fFin: 25, tipo: 'sine', dur: 1.2, vol: 0.5 }); tono({ f: 60, fFin: 20, tipo: 'sawtooth', dur: 0.9, vol: 0.15 }); },
    // Archivo: sfx_impacto.wav
    impacto() { if (!limitar('imp', 40)) return; tono({ f: 260, fFin: 120, tipo: 'square', dur: 0.05, vol: 0.05 }); },
    // Archivo: sfx_impacto_escudo.wav
    impactoEscudo() { if (!limitar('iej', 80)) return; tono({ f: 1800, fFin: 1200, tipo: 'sine', dur: 0.08, vol: 0.05 }); },
    // Archivo: sfx_danio_jugador.wav
    danioJugador() { if (!limitar('dj', 90)) return; ruido({ fc: 900, fcFin: 200, dur: 0.25, vol: 0.35 }); tono({ f: 110, fFin: 60, tipo: 'sawtooth', dur: 0.2, vol: 0.12 }); },
    // Archivo: sfx_escudo_roto.wav
    escudoRoto() { tono({ f: 1200, fFin: 90, tipo: 'sawtooth', dur: 0.5, vol: 0.12 }); },
    // Archivo: sfx_esquiva.wav
    esquiva() { ruido({ fc: 400, fcFin: 4000, filtro: 'bandpass', q: 1.5, dur: 0.35, vol: 0.3 }); },
    // Archivo: sfx_recoger_mejora.wav
    recoger() { [0, 4, 7, 12].forEach((s, i) => tono({ f: semitono(660, s), tipo: 'triangle', dur: 0.12, vol: 0.1, retraso: i * 0.05 })); },
    // Archivo: sfx_alerta_jefe.wav
    alerta() { for (let i = 0; i < 3; i++) { tono({ f: 880, tipo: 'square', dur: 0.18, vol: 0.07, retraso: i * 0.4 }); tono({ f: 660, tipo: 'square', dur: 0.18, vol: 0.07, retraso: i * 0.4 + 0.2 }); } },
    // Archivo: sfx_jefe_rugido.wav
    rugidoJefe() { tono({ f: 90, fFin: 35, tipo: 'sawtooth', dur: 1.4, vol: 0.22, ataque: 0.1 }); tono({ f: 93, fFin: 37, tipo: 'sawtooth', dur: 1.4, vol: 0.18, ataque: 0.1 }); ruido({ fc: 500, fcFin: 100, dur: 1.2, vol: 0.3, ataque: 0.1 }); },
    // Archivo: sfx_jefe_cambio_fase.wav
    faseJefe() { [0, -3, -6, -9].forEach((s, i) => tono({ f: semitono(440, s), tipo: 'sawtooth', dur: 0.2, vol: 0.08, retraso: i * 0.12 })); },
    // Archivo: sfx_psiquico.wav
    psiquico() { tono({ f: 300, fFin: 1200, tipo: 'sine', dur: 0.8, vol: 0.12 }); tono({ f: 1200, fFin: 300, tipo: 'sine', dur: 0.8, vol: 0.08 }); },
    // Archivo: sfx_teletransporte.wav
    teletransporte() { tono({ f: 2000, fFin: 200, tipo: 'sine', dur: 0.3, vol: 0.1 }); },
    // Archivo: sfx_carga_canon.wav
    cargaCanon() { tono({ f: 100, fFin: 900, tipo: 'sawtooth', dur: 1.4, vol: 0.07, ataque: 0.2 }); },
    // Archivo: sfx_poder.wav
    poder() { [0, 7, 12, 19].forEach((s, i) => tono({ f: semitono(440, s), tipo: 'sawtooth', dur: 0.18, vol: 0.06, retraso: i * 0.06 })); tono({ f: 220, fFin: 880, tipo: 'sine', dur: 0.4, vol: 0.1 }); },
    // Archivo: sfx_racha.wav
    racha() { [0, 4, 7].forEach((s, i) => tono({ f: semitono(784, s), tipo: 'square', dur: 0.1, vol: 0.06, retraso: i * 0.07 })); },
    // Archivo: sfx_trueno.wav
    trueno() { ruido({ fc: 800, fcFin: 80, dur: 1.2, vol: 0.5, ataque: 0.01 }); },
    // Archivo: sfx_laser_carga.wav
    laserCarga() { if (!limitar('lc', 300)) return; tono({ f: 300, fFin: 1600, tipo: 'sine', dur: 1.2, vol: 0.06, ataque: 0.1 }); },
    // Archivo: sfx_laser.wav
    laser() { if (!limitar('lz', 120)) return; tono({ f: 1800, fFin: 200, tipo: 'sawtooth', dur: 0.35, vol: 0.1 }); ruido({ fc: 3000, fcFin: 500, filtro: 'bandpass', dur: 0.3, vol: 0.2 }); },
    // Archivo: sfx_muro.wav
    muro() { tono({ f: 520, tipo: 'square', dur: 0.1, vol: 0.06 }); tono({ f: 780, tipo: 'square', dur: 0.15, vol: 0.06, retraso: 0.1 }); },
    // Archivo: sfx_ui_click.wav
    ui() { tono({ f: 1100, tipo: 'sine', dur: 0.05, vol: 0.06 }); },
    // Archivo: sfx_ui_confirmar.wav
    uiConfirmar() { tono({ f: 880, tipo: 'triangle', dur: 0.08, vol: 0.08 }); tono({ f: 1320, tipo: 'triangle', dur: 0.12, vol: 0.08, retraso: 0.07 }); },
    // Archivo: sfx_logro.wav
    logro() { [0, 4, 7, 12, 16].forEach((s, i) => tono({ f: semitono(523, s), tipo: 'triangle', dur: 0.25, vol: 0.1, retraso: i * 0.08 })); },
    // Archivo: sfx_victoria.wav
    victoria() { [0, 4, 7, 12, 7, 12].forEach((s, i) => tono({ f: semitono(392, s), tipo: 'square', dur: 0.22, vol: 0.07, retraso: i * 0.15 })); },
    // Archivo: sfx_derrota.wav
    derrota() { [0, -2, -5, -9].forEach((s, i) => tono({ f: semitono(330, s), tipo: 'sawtooth', dur: 0.4, vol: 0.07, retraso: i * 0.3 })); }
  };

  // ---------------- MOTOR DE LA NAVE (sonido continuo) ----------------
  // Archivo: sfx_motor_loop.wav
  let motor = null, tMotor = 0;
  function motorIniciar() {
    if (!ctx || motor) return;
    const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o1.type = 'sawtooth'; o2.type = 'sawtooth';
    o1.frequency.value = 50; o2.frequency.value = 50.7;
    f.type = 'lowpass'; f.frequency.value = 350;
    g.gain.value = 0.0001;
    o1.connect(f); o2.connect(f); f.connect(g); g.connect(efectosGain);
    o1.start(); o2.start();
    g.gain.setTargetAtTime(0.04, ctx.currentTime, 0.3);
    motor = { o1, o2, f, g };
  }
  function motorActualizar(x, dt) {
    if (!motor) return;
    tMotor -= dt; if (tMotor > 0) return; tMotor = 0.1;
    const t = ctx.currentTime;
    motor.o1.frequency.setTargetAtTime(42 + x * 55, t, 0.1);
    motor.o2.frequency.setTargetAtTime(42.7 + x * 56, t, 0.1);
    motor.f.frequency.setTargetAtTime(250 + x * 900, t, 0.1);
  }
  function motorDetener() {
    if (!motor) return;
    const m = motor; motor = null;
    const t = ctx.currentTime;
    m.g.gain.setTargetAtTime(0.0001, t, 0.12);
    m.o1.stop(t + 0.6); m.o2.stop(t + 0.6);
  }

  // ---------------- MÚSICA PROCEDURAL ----------------
  // Archivos: musica_menu.mp3, musica_batalla.mp3, musica_jefe.mp3
  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
  const PISTAS = {
    menu: {
      bpm: 76, acordes: [[57, 'm'], [53, 'M'], [48, 'M'], [55, 'M']],
      bajo: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0], bajoTipo: 'sine', bajoVol: 0.12,
      bombo: [], caja: [], hat: [],
      arp: [0, -1, 1, -1, 2, -1, 1, -1, 0, -1, 1, -1, 2, -1, 3, -1], arpTipo: 'triangle', arpVol: 0.035, pad: true
    },
    batalla: {
      bpm: 126, acordes: [[50, 'm'], [46, 'M'], [48, 'M'], [45, 'm']],
      bajo: [1, 0, 1, 0, 2, 0, 1, 0, 1, 0, 1, 0, 2, 0, 1, 1], bajoTipo: 'sawtooth', bajoVol: 0.07,
      bombo: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
      caja: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
      hat: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1],
      arp: [0, 1, 2, 3, 2, 1, 0, 1, 0, 1, 2, 3, 2, 1, 2, 3], arpTipo: 'square', arpVol: 0.018, pad: false
    },
    jefe: {
      bpm: 144, acordes: [[45, 'm'], [45, 'm'], [46, 'M'], [44, 'M']],
      bajo: [1, 1, 0, 1, 1, 0, 2, 0, 1, 1, 0, 1, 2, 0, 1, 2], bajoTipo: 'sawtooth', bajoVol: 0.08,
      bombo: [1, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0, 1, 0],
      caja: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1],
      hat: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1],
      arp: [3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 1, 2, 3, 2], arpTipo: 'sawtooth', arpVol: 0.016, pad: false
    }
  };
  let pistaActual = null, timerMusica = null, paso = 0, tiempoSig = 0;

  function programarPaso(p, t) {
    const P = PISTAS[pistaActual];
    if (!P) return;
    const s = p % 16;
    const [raiz, tipo] = P.acordes[Math.floor(p / 16) % P.acordes.length];
    const notas = tipo === 'm' ? [0, 3, 7, 12] : [0, 4, 7, 12];
    const d16 = 60 / P.bpm / 4, dm = musicaGain;
    if (P.pad && s === 0) {
      for (let i = 0; i < 3; i++) tono({ f: midi(raiz + notas[i]), tipo: 'sine', dur: d16 * 16, vol: 0.045, ataque: 0.5, t, destino: dm });
    }
    const b = P.bajo[s];
    if (b) tono({ f: midi(raiz - 12 + (b === 2 ? 12 : 0)), tipo: P.bajoTipo, dur: d16 * 1.8, vol: P.bajoVol, t, destino: dm });
    if (P.bombo[s]) tono({ f: 150, fFin: 40, tipo: 'sine', dur: 0.25, vol: 0.35, t, destino: dm });
    if (P.caja[s]) ruido({ fc: 2500, fcFin: 800, filtro: 'bandpass', dur: 0.15, vol: 0.16, t, destino: dm });
    if (P.hat[s]) ruido({ fc: 7000, filtro: 'highpass', dur: 0.04, vol: 0.05, t, destino: dm });
    const a = P.arp[s];
    if (a >= 0) tono({ f: midi(raiz + 12 + notas[a]), tipo: P.arpTipo, dur: d16 * 0.9, vol: P.arpVol, t, destino: dm });
  }
  function musica(nombre) {
    if (!ctx) { pistaPendiente = nombre; return; }
    if (pistaActual === nombre) return;
    pistaActual = nombre; paso = 0; tiempoSig = ctx.currentTime + 0.1;
    if (!timerMusica) {
      timerMusica = setInterval(() => {
        if (!pistaActual || !ctx || ctx.state !== 'running') return;
        if (tiempoSig < ctx.currentTime - 0.2) tiempoSig = ctx.currentTime + 0.05;
        while (tiempoSig < ctx.currentTime + 0.15) {
          programarPaso(paso, tiempoSig);
          tiempoSig += 60 / PISTAS[pistaActual].bpm / 4;
          paso++;
        }
      }, 30);
    }
  }
  function detenerMusica() { pistaActual = null; pistaPendiente = null; }

  return { iniciar, aplicarVolumen, suspender, reanudar, sfx, musica, detenerMusica, motorIniciar, motorActualizar, motorDetener };
})();

// =====================================================================
// 6. MOTOR GRÁFICO (Three.js): renderizador, escena, cámara y luces
// =====================================================================
const canvas = $('juego');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !modoTactil, powerPreference: 'high-performance' });
renderer.setClearColor(0x03040b, 1);
const escena = new THREE.Scene();
escena.fog = new THREE.Fog(0x070a1a, 450, 1400);
const camara = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.5, 4200);
const camaraMira = V3();          // punto al que mira la cámara (suavizado)
const luzHemi = new THREE.HemisphereLight(0xb8c8ff, 0x3a2850, 1.0);
escena.add(luzHemi);
const luzSol = new THREE.DirectionalLight(0xfff2dd, 1.05);
luzSol.position.set(0.6, 0.8, 0.3);
escena.add(luzSol);

// ---------- Materiales compartidos (se reutilizan para ahorrar memoria) ----------
const MAT = {};
const MAT_COMPARTIDOS = new Set();
/** Material sólido con sombreado plano (estilo low-poly). */
function matSolido(color, emisivo = 0x000000, brillo = 30) {
  const k = 's' + color + '_' + emisivo + '_' + brillo;
  if (!MAT[k]) { MAT[k] = new THREE.MeshPhongMaterial({ color, emissive: emisivo, shininess: brillo, flatShading: true }); MAT_COMPARTIDOS.add(MAT[k]); }
  return MAT[k];
}
/** Material luminoso (aditivo) para brillos, motores y proyectiles. */
function matLuz(color, opacidad = 1) {
  const k = 'l' + color + '_' + opacidad;
  if (!MAT[k]) { MAT[k] = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: opacidad, blending: THREE.AdditiveBlending, depthWrite: false }); MAT_COMPARTIDOS.add(MAT[k]); }
  return MAT[k];
}
/** Crea una malla en una posición. */
function M(geo, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  return m;
}
/** Textura de brillo circular generada por código (sin archivos). */
function texturaBrillo() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.3, 'rgba(255,255,255,0.6)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}
const TEX_BRILLO = texturaBrillo();

// =====================================================================
// 7. MODELOS 3D (todos con la nariz hacia +Z)
//    Cada función crea un modelo. Para usar tus propios modelos .glb,
//    reemplaza el contenido de la función por el modelo cargado.
// =====================================================================

// ---------- NAVE JUGABLE: MILITARES (Halcón X-7) ----------
// Archivo: nave_tierra_halcon.glb
function crearModeloNaveTierra() {
  const g = new THREE.Group(), motores = [];
  const gris = matSolido(0x9aa6b8, 0x0b1018, 60), oscuro = matSolido(0x353d4a, 0x05070a, 20);
  const azul = matSolido(0x2a7fff, 0x0a2a66, 50), cabina = matSolido(0x7fd8ff, 0x1a5a8a, 90);
  g.add(M(new THREE.BoxGeometry(1.2, 0.7, 4.2), gris));
  g.add(M(new THREE.ConeGeometry(0.6, 1.8, 6).rotateX(Math.PI / 2), gris, 0, 0, 3));
  const cab = M(new THREE.SphereGeometry(0.45, 8, 6), cabina, 0, 0.42, 0.8); cab.scale.set(1, 0.7, 1.8); g.add(cab);
  g.add(M(new THREE.BoxGeometry(5.2, 0.12, 1.5), gris, 0, -0.05, -0.5));
  g.add(M(new THREE.BoxGeometry(5.0, 0.14, 0.35), azul, 0, -0.02, 0.1));
  for (const s of [-1, 1]) {
    g.add(M(new THREE.BoxGeometry(0.25, 0.55, 1.4), azul, s * 2.6, 0.12, -0.5));
    g.add(M(new THREE.CylinderGeometry(0.08, 0.08, 1.5, 5).rotateX(Math.PI / 2), oscuro, s * 1.3, -0.18, 0.7));
    const aleta = M(new THREE.BoxGeometry(0.12, 1.0, 0.9), gris, s * 0.45, 0.6, -1.7); aleta.rotation.z = s * 0.3; g.add(aleta);
    g.add(M(new THREE.CylinderGeometry(0.32, 0.4, 0.9, 8).rotateX(Math.PI / 2), oscuro, s * 0.42, 0, -2.2));
    const fuego = M(new THREE.SphereGeometry(0.3, 8, 6), matLuz(0x55ccff, 0.9), s * 0.42, 0, -2.8); fuego.scale.z = 1.8;
    g.add(fuego); motores.push(fuego);
  }
  g.userData.motores = motores;
  return g;
}

// ---------- NAVE JUGABLE: ALIENÍGENAS (Espectro Vex) ----------
// Archivo: nave_alien_espectro.glb
function crearModeloNaveAlien() {
  const g = new THREE.Group(), motores = [];
  const piel = matSolido(0x2f8f52, 0x0c3a1c, 25), morado = matSolido(0x9b4dff, 0x4a1a8a, 80);
  const cuerpo = M(new THREE.SphereGeometry(1, 10, 8), piel); cuerpo.scale.set(1.05, 0.55, 2.2); g.add(cuerpo);
  g.add(M(new THREE.ConeGeometry(0.3, 2.4, 4).rotateX(-Math.PI / 2), morado, 0, 0.55, -0.5));
  g.add(M(new THREE.TorusGeometry(1.25, 0.09, 5, 20), morado, 0, 0, -0.6));
  for (const s of [-1, 1]) {
    const garra = M(new THREE.ConeGeometry(0.3, 3.2, 5), morado, s * 1.9, 0, 0.1);
    garra.rotation.set(0.35, 0, -s * Math.PI * 0.4); g.add(garra);
    g.add(M(new THREE.SphereGeometry(0.22, 6, 5), matLuz(0xd08bff), s * 3.4, 0.47, 0.27));
    g.add(M(new THREE.SphereGeometry(0.2, 6, 5), matLuz(0x9dff6a), s * 0.35, 0.28, 1.75));
  }
  const fuego = M(new THREE.SphereGeometry(0.42, 8, 6), matLuz(0x66ff99, 0.9), 0, 0, -2.3); fuego.scale.z = 1.7;
  g.add(fuego); motores.push(fuego);
  g.userData.motores = motores;
  return g;
}

// ---------- ENEMIGOS TERRESTRES (los enfrenta el bando alienígena) ----------
// Archivo: enemigo_tierra_caza.glb
function crearModeloCazaTierra() {
  const g = new THREE.Group();
  const gris = matSolido(0x7d8796, 0x080a10, 50), rojo = matSolido(0xd23a3a, 0x400808, 40);
  g.add(M(new THREE.BoxGeometry(1, 0.6, 3.4), gris));
  g.add(M(new THREE.ConeGeometry(0.5, 1.4, 6).rotateX(Math.PI / 2), rojo, 0, 0, 2.4));
  g.add(M(new THREE.BoxGeometry(4.2, 0.1, 1.4), gris, 0, 0, -0.4));
  g.add(M(new THREE.BoxGeometry(4.0, 0.12, 0.3), rojo, 0, 0.02, 0));
  g.add(M(new THREE.BoxGeometry(0.1, 0.9, 0.8), rojo, 0, 0.5, -1.4));
  g.add(M(new THREE.SphereGeometry(0.3, 6, 5), matLuz(0xff7a2a), 0, 0, -1.9));
  return g;
}
// Archivo: enemigo_tierra_dron.glb
function crearModeloDronTierra() {
  const g = new THREE.Group();
  g.add(M(new THREE.OctahedronGeometry(1.1, 0), matSolido(0x5a6270, 0x080808, 40)));
  g.add(M(new THREE.SphereGeometry(0.55, 8, 6), matLuz(0xff3344), 0, 0, 0.7));
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2;
    const f = M(new THREE.BoxGeometry(0.08, 0.9, 0.7), matSolido(0xd23a3a, 0x400808), Math.cos(a) * 0.9, Math.sin(a) * 0.9, -0.6);
    f.rotation.z = a; g.add(f);
  }
  g.add(M(new THREE.SphereGeometry(0.35, 6, 5), matLuz(0xffaa44), 0, 0, -1.2));
  return g;
}
// Archivo: enemigo_tierra_bombardero.glb
function crearModeloBombarderoTierra() {
  const g = new THREE.Group();
  const verde = matSolido(0x56604a, 0x0a0c08, 30), amarillo = matSolido(0xd8b23a, 0x2a2000, 40), oscuro = matSolido(0x2c3442);
  g.add(M(new THREE.BoxGeometry(2.4, 1.1, 5.4), verde));
  g.add(M(new THREE.ConeGeometry(1.1, 1.8, 4).rotateX(Math.PI / 2), verde, 0, 0, 3.5));
  g.add(M(new THREE.BoxGeometry(8.5, 0.22, 2.2), verde, 0, 0, -0.5));
  g.add(M(new THREE.BoxGeometry(8.3, 0.24, 0.4), amarillo, 0, 0.01, 0.3));
  for (const s of [-1, 1]) for (const x of [1.8, 3.4]) {
    g.add(M(new THREE.CylinderGeometry(0.35, 0.4, 1.6, 6).rotateX(Math.PI / 2), oscuro, s * x, -0.3, -0.6));
    g.add(M(new THREE.SphereGeometry(0.3, 6, 5), matLuz(0xffaa44), s * x, -0.3, -1.5));
  }
  g.add(M(new THREE.BoxGeometry(1, 0.6, 1), oscuro, 0, 0.8, 0.6));
  g.add(M(new THREE.CylinderGeometry(0.12, 0.12, 1.4, 5).rotateX(Math.PI / 2), oscuro, 0, 0.85, 1.6));
  return g;
}

// ---------- ENEMIGOS ALIENÍGENAS (los enfrenta el bando militar) ----------
// Archivo: enemigo_alien_caza.glb
function crearModeloCazaAlien() {
  const g = new THREE.Group();
  const piel = matSolido(0x6a2fa0, 0x240a3a, 40);
  const c = M(new THREE.SphereGeometry(1, 9, 7), piel); c.scale.set(0.85, 0.5, 1.6); g.add(c);
  for (const s of [-1, 1]) {
    const garra = M(new THREE.ConeGeometry(0.28, 2.2, 5).rotateX(Math.PI / 2), matSolido(0x3fd46a, 0x10501e, 60), s * 0.75, 0, 1.0);
    garra.rotation.y = -s * 0.15; g.add(garra);
  }
  g.add(M(new THREE.SphereGeometry(0.3, 6, 5), matLuz(0x9dff6a), 0, 0.35, 0.8));
  g.add(M(new THREE.SphereGeometry(0.35, 6, 5), matLuz(0xc061ff), 0, 0, -1.6));
  return g;
}
// Archivo: enemigo_alien_espora.glb
function crearModeloEsporaAlien() {
  const g = new THREE.Group();
  g.add(M(new THREE.IcosahedronGeometry(1.1, 0), matSolido(0x3fbf4a, 0x1a6a1a, 50)));
  const dirs = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  for (const d of dirs) {
    const v = V3(d[0], d[1], d[2]);
    const p = M(new THREE.ConeGeometry(0.22, 0.9, 4), matSolido(0xb6ff3a, 0x406a00, 50));
    p.quaternion.setFromUnitVectors(ARRIBA, v); p.position.copy(v).multiplyScalar(1.2); g.add(p);
  }
  g.add(M(new THREE.SphereGeometry(0.7, 8, 6), matLuz(0x9dff55, 0.35)));
  return g;
}
// Archivo: enemigo_alien_canonera.glb
function crearModeloCanoneraAlien() {
  const g = new THREE.Group();
  const c = M(new THREE.SphereGeometry(1.8, 10, 8), matSolido(0x4a1a6a, 0x1a0528, 30)); c.scale.set(1.3, 0.8, 1.8); g.add(c);
  g.add(M(new THREE.TorusGeometry(2.6, 0.25, 6, 20), matSolido(0x3fd46a, 0x146a28, 60)));
  for (let i = 0; i < 3; i++) {
    const t = M(new THREE.CylinderGeometry(0.25, 0.06, 3, 5), matSolido(0x7a3aa0, 0x200830), (i - 1) * 1.2, -2, -0.5);
    t.rotation.x = 0.3; g.add(t);
  }
  g.add(M(new THREE.SphereGeometry(0.6, 8, 6), matLuz(0xff3a9a), 0, 0, 3.1));
  return g;
}
// Archivo: enemigo_dron_enjambre.glb
function crearModeloDronEnjambre() {
  const g = new THREE.Group();
  g.add(M(new THREE.TetrahedronGeometry(0.9, 0), matSolido(0xd4ff3a, 0x506a00, 40)));
  g.add(M(new THREE.SphereGeometry(0.45, 6, 4), matLuz(0xffd23a, 0.6)));
  return g;
}

// =====================================================================
// 8. MODELOS DE LOS JEFES
// =====================================================================

// ---------- Jefe militar 1: COLOSO ORBITAL ----------
// Archivo: jefe_coloso_orbital.glb
function crearModeloColosoOrbital() {
  const g = new THREE.Group();
  const metal = matSolido(0x6f7a8c, 0x0a0e16, 50), oscuro = matSolido(0x2c3442), rojo = matSolido(0xb83030, 0x3a0505, 40);
  const cuerpo = M(new THREE.CylinderGeometry(9, 11, 7, 12), metal); g.add(cuerpo);
  g.add(M(new THREE.CylinderGeometry(6, 9, 3, 12), oscuro, 0, 4.5, 0));
  const anilloE = M(new THREE.TorusGeometry(17, 1.4, 6, 28), oscuro); anilloE.rotation.x = Math.PI / 2; g.add(anilloE);
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2;
    const r = M(new THREE.BoxGeometry(16, 1, 1.4), metal, Math.cos(a) * 9, 0, Math.sin(a) * 9); r.rotation.y = -a; g.add(r);
  }
  const torretas = [];
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + Math.PI / 4;
    const t = new THREE.Group(); t.position.set(Math.cos(a) * 17, 1.8, Math.sin(a) * 17);
    t.add(M(new THREE.BoxGeometry(3, 1.6, 3), rojo));
    t.add(M(new THREE.CylinderGeometry(0.35, 0.35, 3.2, 6).rotateX(Math.PI / 2), oscuro, -0.6, 0.6, 1.6));
    t.add(M(new THREE.CylinderGeometry(0.35, 0.35, 3.2, 6).rotateX(Math.PI / 2), oscuro, 0.6, 0.6, 1.6));
    g.add(t); torretas.push(t);
  }
  const generador = M(new THREE.SphereGeometry(4, 12, 8), matSolido(0x3ab8ff, 0x1460a0, 80), 0, 9, 0); g.add(generador);
  const escudoGen = M(new THREE.SphereGeometry(6.2, 14, 10), matLuz(0x66ccff, 0.22), 0, 9, 0); g.add(escudoGen);
  const nucleo = M(new THREE.SphereGeometry(3.6, 10, 8), matSolido(0xff3355, 0x801020, 80), 0, -6, 0); g.add(nucleo);
  const blindaje = [];
  for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3;
    const b = M(new THREE.BoxGeometry(3.6, 4.2, 1), metal, Math.cos(a) * 4.2, -6, Math.sin(a) * 4.2); b.rotation.y = -a + Math.PI / 2;
    g.add(b); blindaje.push(b);
  }
  for (const s of [-1, 1]) g.add(M(new THREE.CylinderGeometry(0.2, 0.2, 9, 4), metal, s * 3, 15, 0));
  g.userData = { cuerpo, torretas, generador, escudoGen, nucleo, blindaje };
  return g;
}

// ---------- Jefe militar 2: FÉNIX B-99 ----------
// Archivo: jefe_fenix_b99.glb
function crearModeloFenixB99() {
  const g = new THREE.Group(), motores = [];
  const casco = matSolido(0x4a4f5a, 0x0a0a0e, 40), naranja = matSolido(0xe0662a, 0x401500, 50), oscuro = matSolido(0x22262e);
  const cuerpo = M(new THREE.BoxGeometry(5, 3, 22), casco); g.add(cuerpo);
  g.add(M(new THREE.ConeGeometry(2.5, 6, 6).rotateX(Math.PI / 2), casco, 0, 0, 14));
  g.add(M(new THREE.SphereGeometry(1.3, 8, 6), matSolido(0xffc27a, 0x6a3a00, 90), 0, 1.4, 9));
  const alaIzq = new THREE.Object3D(), alaDer = new THREE.Object3D();
  for (const s of [-1, 1]) {
    const ala = M(new THREE.BoxGeometry(16, 1.2, 7), casco, s * 10, 0, -3); ala.rotation.y = s * 0.32; g.add(ala);
    const franja = M(new THREE.BoxGeometry(14, 1.25, 1.2), naranja, s * 10, 0.02, -0.4); franja.rotation.y = s * 0.32; g.add(franja);
    for (const x of [5, 11]) {
      g.add(M(new THREE.CylinderGeometry(1, 1.2, 4, 8).rotateX(Math.PI / 2), oscuro, s * x, -0.6, -6 - x * 0.25));
      const f = M(new THREE.SphereGeometry(0.9, 8, 6), matLuz(0xff8a3a, 0.9), s * x, -0.6, -8.4 - x * 0.25); f.scale.z = 1.8;
      g.add(f); motores.push(f);
    }
    (s < 0 ? alaIzq : alaDer).position.set(s * 13, 0, -5);
  }
  g.add(alaIzq, alaDer);
  g.add(M(new THREE.BoxGeometry(3, 0.8, 8), oscuro, 0, -1.8, 0));
  g.add(M(new THREE.BoxGeometry(0.6, 5, 4), casco, 0, 3, -9));
  g.userData = { cuerpo, alaIzq, alaDer, motores };
  return g;
}

// ---------- Jefe militar 3: ALMIRANTE ÍCARO ----------
// Archivo: jefe_almirante_icaro.glb
function crearModeloAlmiranteIcaro() {
  const g = new THREE.Group(), nave = new THREE.Group(), motores = [];
  const negro = matSolido(0x1b1d24, 0x050508, 90), oro = matSolido(0xd4a531, 0x4a3300, 90);
  nave.add(M(new THREE.BoxGeometry(1.4, 0.8, 5.5), negro));
  nave.add(M(new THREE.ConeGeometry(0.7, 2.4, 6).rotateX(Math.PI / 2), oro, 0, 0, 3.9));
  const cab = M(new THREE.SphereGeometry(0.5, 8, 6), matSolido(0xff3a3a, 0x6a0a0a, 90), 0, 0.5, 1.2); cab.scale.set(1, 0.6, 2); nave.add(cab);
  for (const s of [-1, 1]) {
    const ala = M(new THREE.BoxGeometry(3.8, 0.12, 1.5), negro, s * 2.3, 0, -0.4); ala.rotation.y = -s * 0.38; nave.add(ala);
    const borde = M(new THREE.BoxGeometry(3.6, 0.14, 0.3), oro, s * 2.4, 0.01, 0.2); borde.rotation.y = -s * 0.38; nave.add(borde);
    const canard = M(new THREE.BoxGeometry(1.2, 0.08, 0.6), oro, s * 1.0, 0, 2.2); nave.add(canard);
    const aleta = M(new THREE.BoxGeometry(0.1, 1.2, 1.1), oro, s * 0.55, 0.6, -2.3); aleta.rotation.z = s * 0.35; nave.add(aleta);
    const f = M(new THREE.SphereGeometry(0.35, 8, 6), matLuz(0xffd27a, 0.95), s * 0.4, 0, -3.1); f.scale.z = 2; nave.add(f); motores.push(f);
  }
  nave.scale.setScalar(1.5);
  g.add(nave);
  g.userData = { nave, cuerpo: nave, motores };
  return g;
}

// ---------- Jefe militar 4: TITÁN AEGIS ----------
// Archivo: jefe_titan_aegis.glb
function crearModeloTitanAegis() {
  const g = new THREE.Group();
  const casco = matSolido(0x56607a, 0x0a0c14, 40), azul = matSolido(0x2f6fd8, 0x0a2050, 50), oscuro = matSolido(0x262c38);
  const cascoM = M(new THREE.BoxGeometry(10, 6, 34), casco); g.add(cascoM);
  g.add(M(new THREE.BoxGeometry(14, 1, 28), oscuro, 0, 3.5, -1));
  g.add(M(new THREE.BoxGeometry(13.6, 0.2, 1), azul, 0, 4.05, 8));
  g.add(M(new THREE.BoxGeometry(3, 6, 5), casco, 4, 7, -6));
  g.add(M(new THREE.BoxGeometry(3.1, 1, 5.1), azul, 4, 9, -6));
  g.add(M(new THREE.ConeGeometry(5, 8, 4).rotateX(Math.PI / 2), casco, 0, 0, 21));
  g.add(M(new THREE.CylinderGeometry(1.1, 1.3, 8, 8).rotateX(Math.PI / 2), oscuro, 0, -2.5, 20));
  const carga = M(new THREE.SphereGeometry(2, 10, 8), matLuz(0x66ccff, 0.9), 0, -2.5, 24.5); carga.visible = false; g.add(carga);
  for (const x of [-3, 0, 3]) {
    g.add(M(new THREE.CylinderGeometry(1.4, 1.6, 3, 8).rotateX(Math.PI / 2), oscuro, x, 0, -18));
    const f = M(new THREE.SphereGeometry(1.3, 8, 6), matLuz(0x5ab8ff, 0.9), x, 0, -20); f.scale.z = 1.8; g.add(f);
  }
  const proa = new THREE.Object3D(); proa.position.set(0, 0, 13); g.add(proa);
  const popa = new THREE.Object3D(); popa.position.set(0, 0, -13); g.add(popa);
  // Escudo de energía (burbuja)
  const escudo = new THREE.Group();
  escudo.add(new THREE.Mesh(new THREE.SphereGeometry(27, 20, 14), new THREE.MeshBasicMaterial({ color: 0x4a9aff, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })));
  escudo.add(new THREE.Mesh(new THREE.IcosahedronGeometry(27.3, 1), new THREE.MeshBasicMaterial({ color: 0x8fd0ff, wireframe: true, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false })));
  g.add(escudo);
  // Generadores del escudo (satélites que orbitan)
  const anilloGens = new THREE.Group(); g.add(anilloGens);
  const generadores = [];
  for (let i = 0; i < 3; i++) {
    const a = i * Math.PI * 2 / 3;
    const gen = new THREE.Group(); gen.position.set(Math.cos(a) * 38, 4, Math.sin(a) * 38);
    gen.add(M(new THREE.OctahedronGeometry(2.4, 0), matSolido(0x33ddff, 0x1188aa, 80)));
    const ani = M(new THREE.TorusGeometry(3.2, 0.25, 5, 16), oscuro); ani.rotation.x = Math.PI / 2; gen.add(ani);
    anilloGens.add(gen); generadores.push(gen);
  }
  g.userData = { casco: cascoM, proa, popa, escudo, anilloGens, generadores, carga };
  return g;
}

// ---------- Jefe alienígena 1: LA REINA COLMENA ----------
// Archivo: jefe_reina_colmena.glb
function crearModeloReinaColmena() {
  const g = new THREE.Group();
  const cuerpoMat = new THREE.MeshPhongMaterial({ color: 0x8a7a2a, emissive: 0x3a2a05, flatShading: true, shininess: 20 });
  const cuerpo = M(new THREE.SphereGeometry(11, 14, 10), cuerpoMat); cuerpo.scale.set(1, 1.15, 1); g.add(cuerpo);
  const rng = rngSemilla(7), poros = [];
  for (let i = 0; i < 16; i++) {
    const d = V3(rng() * 2 - 1, rng() * 2 - 1, rng() * 2 - 1).normalize();
    g.add(M(new THREE.SphereGeometry(2 + rng() * 2, 7, 5), cuerpoMat, d.x * 10.5, d.y * 12, d.z * 10.5));
  }
  for (let i = 0; i < 12; i++) {
    const d = V3(rng() * 2 - 1, rng() * 2 - 1, rng() * 2 - 1).normalize();
    const p = M(new THREE.SphereGeometry(1, 6, 5), matLuz(0xffd23a, 0.9), d.x * 11, d.y * 12.6, d.z * 11); g.add(p); poros.push(p);
  }
  for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3;
    const c = M(new THREE.ConeGeometry(1.2, 7, 5), matSolido(0x5a3a0a, 0x1a0a00, 30), Math.cos(a) * 5, 14, Math.sin(a) * 5);
    c.rotation.set(Math.sin(a) * 0.4, 0, -Math.cos(a) * 0.4); g.add(c);
  }
  g.add(M(new THREE.SphereGeometry(2.6, 10, 8), matLuz(0x9dff55, 0.9), 0, 0, 11));
  g.userData = { cuerpo, cuerpoMat, poros };
  return g;
}

// ---------- Jefe alienígena 2: DEVORADOR DE MUNDOS ----------
// Archivo: jefe_devorador_mundos.glb
function crearModeloDevorador() {
  const g = new THREE.Group();
  const piel = new THREE.MeshPhongMaterial({ color: 0x4a2a5a, emissive: 0x14051c, flatShading: true, shininess: 30 });
  const cabeza = M(new THREE.SphereGeometry(9, 14, 10), piel); cabeza.scale.set(1, 0.85, 1.2); g.add(cabeza);
  g.add(M(new THREE.TorusGeometry(3.6, 1.1, 8, 18), matSolido(0xff3366, 0x801030, 60), 0, -1, 10.3));
  const garganta = M(new THREE.SphereGeometry(3, 10, 8), matLuz(0xff5588, 0.9), 0, -1, 9.6); g.add(garganta);
  for (const s of [-1, 1]) for (const y of [2.5, 4.2]) g.add(M(new THREE.SphereGeometry(0.8, 6, 5), matLuz(0xffe03a), s * (y === 2.5 ? 3.5 : 2), y, 8.6));
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4;
    const p = M(new THREE.ConeGeometry(1, 4, 5), matSolido(0x2a1035, 0x0a0210), Math.cos(a) * 6, Math.sin(a) * 5 + 2, -6);
    p.rotation.set(-0.8, 0, a - Math.PI / 2); g.add(p);
  }
  const tentaculos = [];
  for (let k = 0; k < 6; k++) {
    const a = k * Math.PI / 3 + Math.PI / 6;
    const raiz = new THREE.Group(); raiz.position.set(Math.cos(a) * 7, Math.sin(a) * 6, 4); g.add(raiz);
    const segs = [];
    for (let i = 0; i < 6; i++) {
      const s = M(new THREE.SphereGeometry(1.6 - i * 0.2, 7, 5), i === 5 ? matLuz(0xff5588) : piel);
      raiz.add(s); segs.push(s);
    }
    tentaculos.push({ raiz, segs, ang: a, fase: k * 1.3 });
  }
  g.userData = { cabeza, piel, garganta, tentaculos };
  return g;
}

// ---------- Jefe alienígena 3: ORÁCULO VACÍO (también se usa para sus naves falsas) ----------
// Archivo: jefe_oraculo_vacio.glb
function crearModeloOraculo() {
  const g = new THREE.Group();
  const cuerpo = M(new THREE.OctahedronGeometry(7, 0), new THREE.MeshPhongMaterial({ color: 0x1a1030, emissive: 0x2a0a4a, flatShading: true, shininess: 90 }));
  g.add(cuerpo);
  const a1 = M(new THREE.TorusGeometry(11, 0.4, 6, 32), matSolido(0x9b4dff, 0x5a1aaa, 80)); g.add(a1);
  const a2 = M(new THREE.TorusGeometry(13, 0.3, 6, 32), matSolido(0x6a2aff, 0x3a0a8a, 80)); a2.rotation.x = Math.PI / 2; g.add(a2);
  const ojo = M(new THREE.SphereGeometry(2.6, 12, 10), matSolido(0xffffff, 0x8a6aff, 90), 0, 0, 6.2); g.add(ojo);
  g.add(M(new THREE.SphereGeometry(1.2, 8, 6), matSolido(0x050008, 0x000000, 90), 0, 0, 8.2));
  g.add(M(new THREE.SphereGeometry(9, 12, 10), matLuz(0x9b4dff, 0.12)));
  g.userData = { cuerpo, anillos: [a1, a2], ojo };
  return g;
}

// ---------- Jefe alienígena 4: EMPERADOR ZORGON ----------
// Archivo: jefe_emperador_zorgon.glb
function crearModeloZorgon() {
  const g = new THREE.Group();
  const armadura = matSolido(0x234a2e, 0x07160a, 40), oscuro = matSolido(0x141a22), dorado = matSolido(0xc9a227, 0x3a2a00, 80);
  const cuerpo = M(new THREE.SphereGeometry(9, 14, 10), armadura); cuerpo.scale.set(1.3, 0.9, 1.1); g.add(cuerpo);
  for (let i = 0; i < 7; i++) {
    const a = (i - 3) * 0.32;
    const c = M(new THREE.ConeGeometry(1, 7, 5), dorado, Math.sin(a) * 7, 9 + Math.cos(a) * 1.5, 0); c.rotation.z = -a; g.add(c);
  }
  const nucleo = M(new THREE.SphereGeometry(4.5, 12, 8), matSolido(0xff2a8a, 0x8a0a4a, 80), 0, 0, 8); g.add(nucleo);
  const placas = [];
  for (let i = 0; i < 5; i++) {
    const a = (i - 2) * 0.45;
    const p = M(new THREE.BoxGeometry(5, 7, 1.5), armadura, Math.sin(a) * 6, 0, 10 + Math.cos(a) * 1.5); p.rotation.y = a; g.add(p); placas.push(p);
  }
  const canones = [];
  for (const s of [-1, 1]) {
    const brazo = new THREE.Group(); brazo.position.set(s * 14, -1, 2);
    brazo.add(M(new THREE.SphereGeometry(3.5, 10, 8), armadura));
    brazo.add(M(new THREE.CylinderGeometry(1.4, 1.8, 9, 8).rotateX(Math.PI / 2), oscuro, 0, 0, 4.5));
    brazo.add(M(new THREE.SphereGeometry(1.2, 8, 6), matLuz(0xff2a8a), 0, 0, 9.2));
    g.add(brazo); canones.push(brazo);
  }
  const orbita = new THREE.Group(); g.add(orbita);
  const orbes = [];
  for (let i = 0; i < 3; i++) {
    const a = i * Math.PI * 2 / 3;
    const o = M(new THREE.OctahedronGeometry(2.3, 0), matSolido(0x33ddff, 0x1188aa, 80), Math.cos(a) * 30, 3, Math.sin(a) * 30);
    orbita.add(o); orbes.push(o);
  }
  const escudo = M(new THREE.SphereGeometry(22, 20, 14), new THREE.MeshBasicMaterial({ color: 0x33ddff, transparent: true, opacity: 0.14, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  g.add(escudo);
  g.userData = { cuerpo, nucleo, placas, canones, orbita, orbes, escudo };
  return g;
}

// =====================================================================
// 9. ESCENARIO: cielo estrellado, nebulosas, planeta, polvo y asteroides
//    Archivos sugeridos: escenario_planeta.glb, escenario_asteroide.glb,
//    textura_nebulosa.png, textura_estrellas.png
// =====================================================================
const grupoCielo = new THREE.Group();
escena.add(grupoCielo);

const estrellas = (function () {
  const n = 3000, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  const v = V3(), c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    vecAleatorio(v, rand(1900, 2500));
    pos[i * 3] = v.x; pos[i * 3 + 1] = v.y; pos[i * 3 + 2] = v.z;
    const t = Math.random();
    c.setHSL(t < 0.7 ? 0.62 : t < 0.9 ? 0.12 : 0.0, t < 0.7 ? 0.3 : 0.6, rand(0.55, 1));
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const p = new THREE.Points(geo, new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, vertexColors: true, fog: false, depthWrite: false }));
  p.frustumCulled = false;
  return p;
})();
grupoCielo.add(estrellas);

const nebulosas = [];
[[-0.6, 0.3, -1], [0.8, -0.2, -0.6], [0.2, 0.6, 1], [-0.9, -0.5, 0.4]].forEach((d) => {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX_BRILLO, color: 0xffffff, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  sp.position.set(d[0], d[1], d[2]).normalize().multiplyScalar(2600);
  sp.scale.setScalar(rand(1700, 2400));
  grupoCielo.add(sp); nebulosas.push(sp);
});
const planeta = new THREE.Mesh(new THREE.SphereGeometry(420, 32, 20), new THREE.MeshLambertMaterial({ color: 0x3a6ad8, emissive: 0x08142a, fog: false }));
planeta.position.set(-1500, -520, -2300);
grupoCielo.add(planeta);
const anilloPlaneta = new THREE.Mesh(new THREE.RingGeometry(540, 760, 64), new THREE.MeshBasicMaterial({ color: 0xc8b48a, transparent: true, opacity: 0.35, side: THREE.DoubleSide, fog: false, depthWrite: false }));
anilloPlaneta.position.copy(planeta.position);
anilloPlaneta.rotation.set(1.2, 0.3, 0);
grupoCielo.add(anilloPlaneta);
const sol = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX_BRILLO, color: 0xfff0cc, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
sol.position.copy(luzSol.position).normalize().multiplyScalar(2700);
sol.scale.setScalar(650);
grupoCielo.add(sol);

/** Cambia los colores del cielo según el nivel. */
function aplicarCielo(c) {
  planeta.material.color.setHex(c.planeta);
  planeta.material.emissive.setHex(new THREE.Color(c.planeta).multiplyScalar(0.12).getHex());
  anilloPlaneta.visible = !!c.anillo;
  nebulosas.forEach((n, i) => n.material.color.setHex(c.neb[i % c.neb.length]));
  escena.fog.color.setHex(c.niebla);
  renderer.setClearColor(new THREE.Color(c.niebla).multiplyScalar(0.5), 1);
}
const CIELO_MENU = { planeta: 0x3a6ad8, anillo: true, neb: [0x3a1a7a, 0x0a4a8a], niebla: 0x070a1a };

// Polvo espacial cercano (da sensación de velocidad)
const polvo = (function () {
  const n = 260, pos = new Float32Array(n * 3);
  for (let i = 0; i < n * 3; i++) pos[i] = rand(-90, 90);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const p = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0x9fb2ff, size: 0.5, transparent: true, opacity: 0.55, depthWrite: false }));
  p.frustumCulled = false;
  escena.add(p);
  return p;
})();
function actualizarPolvo(centro) {
  const p = polvo.geometry.attributes.position.array;
  for (let i = 0; i < p.length; i += 3) {
    let d = p[i] - centro.x; if (d > 90) p[i] -= 180; else if (d < -90) p[i] += 180;
    d = p[i + 1] - centro.y; if (d > 90) p[i + 1] -= 180; else if (d < -90) p[i + 1] += 180;
    d = p[i + 2] - centro.z; if (d > 90) p[i + 2] -= 180; else if (d < -90) p[i + 2] += 180;
  }
  polvo.geometry.attributes.position.needsUpdate = true;
}

// Asteroides (obstáculos)
const asteroides = [];
(function () {
  const geo = new THREE.IcosahedronGeometry(1, 0), mat = matSolido(0x6b5e55, 0x0a0806, 5);
  for (let i = 0; i < 30; i++) {
    const m = new THREE.Mesh(geo, mat); m.visible = false; escena.add(m);
    asteroides.push({ malla: m, radio: 1, giro: V3(), activo: false });
  }
})();
function colocarAsteroides(n, semilla, moviles) {
  const rng = rngSemilla(semilla);
  asteroides.forEach((a, i) => {
    a.activo = i < n; a.malla.visible = a.activo;
    if (!a.activo) return;
    const r = 4 + rng() * 11, ang = rng() * Math.PI * 2, dist = 90 + rng() * (CONFIG.ARENA * 0.9 - 90);
    a.malla.position.set(Math.cos(ang) * dist, (rng() * 2 - 1) * 110, Math.sin(ang) * dist);
    a.malla.scale.set(r, r * (0.7 + rng() * 0.3), r * (0.7 + rng() * 0.4));
    a.radio = r * 0.85;
    a.giro.set(rng() - 0.5, rng() - 0.5, rng() - 0.5).multiplyScalar(0.6);
    a.hp = r * 5;
    a.vel = moviles ? V3((rng() - 0.5) * 26, (rng() - 0.5) * 8, (rng() - 0.5) * 26) : null;
  });
}

// =====================================================================
// 10. ESTADO GENERAL DEL JUEGO
// =====================================================================
const juego = {
  estado: 'menu',          // menu | jugando | pausa | fin
  faccion: 'tierra',       // bando del jugador
  nivel: 1,
  fase: 'oleadas',         // oleadas | alertaJefe | jefe | muerteJefe | completado | derrota
  tFase: 0,
  puntaje: 0,
  puntajeInicio: 0,
  enemigosGenerados: 0,
  enemigosDerribados: 0,
  derribosNivel: 0,
  tSpawn: 0,
  danioRecibido: false,
  sacudida: 0,
  jefe: null
};

// Temporales reutilizables (evitan crear objetos en cada cuadro)
const _a = V3(), _b = V3(), _c = V3(), _d = V3(), _deseo = V3(), _mira = V3(), _hacia = V3(), _origen = V3();
const _apunte = V3(), _base = V3(), _u = V3(), _v = V3(), _dirR = V3(), _proj = V3();

// =====================================================================
// 11. OBJECT POOLING (balas, misiles, explosiones y mejoras reutilizables)
// =====================================================================
class Pool {
  constructor(crear, n) {
    this.items = [];
    for (let i = 0; i < n; i++) { const it = crear(); it.activo = false; this.items.push(it); }
  }
  obtener() {
    for (let i = 0; i < this.items.length; i++) {
      const it = this.items[i];
      if (!it.activo) { it.activo = true; return it; }
    }
    return null;
  }
}

// ---------- Proyectiles del jugador ----------
// Archivo: proyectil_laser_tierra.glb / proyectil_plasma_alien.glb
const GEO_BALA_J = new THREE.BoxGeometry(0.3, 0.3, 3.4);
const balasJ = new Pool(() => {
  const m = new THREE.Mesh(GEO_BALA_J, matLuz(0x66e0ff)); m.visible = false; escena.add(m);
  return { malla: m, vel: V3(), prev: V3(), vida: 0, danio: 0 };
}, 90);

// ---------- Proyectiles enemigos ----------
// Archivo: proyectil_enemigo.glb
const GEO_BALA_E = new THREE.SphereGeometry(0.75, 6, 4);
const balasE = new Pool(() => {
  const m = new THREE.Mesh(GEO_BALA_E, matLuz(0xff4d6d)); m.visible = false; escena.add(m);
  return { malla: m, vel: V3(), prev: V3(), vida: 0, danio: 0, radio: 0.7 };
}, 150);

// ---------- Misiles (jugador y enemigos) ----------
// Archivos: proyectil_misil.glb, proyectil_espora.glb, proyectil_orbe.glb
const misiles = new Pool(() => {
  const g = new THREE.Group();
  const vMisil = new THREE.Group();
  vMisil.add(M(new THREE.CylinderGeometry(0.18, 0.22, 1.8, 6).rotateX(Math.PI / 2), matSolido(0xd8dde6, 0x202428, 40)));
  vMisil.add(M(new THREE.ConeGeometry(0.2, 0.5, 6).rotateX(Math.PI / 2), matSolido(0xff4d4d, 0x400000), 0, 0, 1.15));
  const llama = M(new THREE.SphereGeometry(0.3, 6, 4), matLuz(0xffaa44), 0, 0, -1.1); llama.scale.z = 2; vMisil.add(llama);
  const vEspora = M(new THREE.IcosahedronGeometry(0.65, 0), matLuz(0x9dff55));
  const vOrbe = M(new THREE.SphereGeometry(1.1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xc061ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  g.add(vMisil, vEspora, vOrbe); g.visible = false; escena.add(g);
  return { grupo: g, vistas: { misil: vMisil, espora: vEspora, orbe: vOrbe }, dir: V3(0, 0, 1), prev: V3(), vel: 0, giro: 0, vida: 0, danio: 0,
           dueno: 'jugador', objetivo: null, tBuscar: 0, tRastro: 0, colorRastro: 0xffaa44, radio: 1.2 };
}, 48);
function setVista(m, vista, color) {
  for (const k in m.vistas) m.vistas[k].visible = (k === vista);
  if (vista === 'orbe' && color) m.vistas.orbe.material.color.setHex(color);
}
function desactivarMisil(m) { m.activo = false; m.grupo.visible = false; m.objetivo = null; }

// ---------- Explosiones ----------
// Archivo: efecto_explosion.png (sprite) o efecto_explosion.glb
const GEO_EXPLOSION = new THREE.SphereGeometry(1, 10, 8);
const explosiones = new Pool(() => {
  const m = new THREE.Mesh(GEO_EXPLOSION, new THREE.MeshBasicMaterial({ color: 0xffaa55, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false }));
  m.visible = false; escena.add(m);
  return { malla: m, t: 0, dur: 0.5, tam: 1 };
}, 22);

// ---------- Partículas (un solo objeto Points para todas: muy eficiente) ----------
const Particulas = (() => {
  const MAX = 600;
  const pos = new Float32Array(MAX * 3), col = new Float32Array(MAX * 3), vel = new Float32Array(MAX * 3), base = new Float32Array(MAX * 3);
  const vida = new Float32Array(MAX), vidaMax = new Float32Array(MAX);
  let siguiente = 0, limite = 400;
  for (let i = 0; i < MAX; i++) pos[i * 3 + 1] = -99999;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const puntos = new THREE.Points(geo, new THREE.PointsMaterial({ size: 1.8, map: TEX_BRILLO, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  puntos.frustumCulled = false;
  escena.add(puntos);
  const color = new THREE.Color(), dir = V3();

  function emitir(p, n, colorHex, rapidez, duracion) {
    color.setHex(colorHex);
    for (let k = 0; k < n; k++) {
      const i = siguiente; siguiente = (siguiente + 1) % limite;
      vecAleatorio(dir, rapidez * rand(0.3, 1));
      pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z;
      vel[i * 3] = dir.x; vel[i * 3 + 1] = dir.y; vel[i * 3 + 2] = dir.z;
      vida[i] = vidaMax[i] = duracion * rand(0.5, 1);
      const br = rand(0.7, 1.2);
      base[i * 3] = color.r * br; base[i * 3 + 1] = color.g * br; base[i * 3 + 2] = color.b * br;
    }
  }
  /** Emite partículas con una velocidad concreta (para estelas o succión). */
  function emitirVel(p, v, colorHex, duracion) {
    color.setHex(colorHex);
    const i = siguiente; siguiente = (siguiente + 1) % limite;
    pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z;
    vel[i * 3] = v.x; vel[i * 3 + 1] = v.y; vel[i * 3 + 2] = v.z;
    vida[i] = vidaMax[i] = duracion;
    base[i * 3] = color.r; base[i * 3 + 1] = color.g; base[i * 3 + 2] = color.b;
  }
  function actualizar(dt) {
    const fr = Math.max(0, 1 - 1.5 * dt);
    for (let i = 0; i < limite; i++) {
      if (vida[i] <= 0) continue;
      vida[i] -= dt;
      const j = i * 3;
      if (vida[i] <= 0) { col[j] = col[j + 1] = col[j + 2] = 0; pos[j + 1] = -99999; continue; }
      pos[j] += vel[j] * dt; pos[j + 1] += vel[j + 1] * dt; pos[j + 2] += vel[j + 2] * dt;
      vel[j] *= fr; vel[j + 1] *= fr; vel[j + 2] *= fr;
      const f = vida[i] / vidaMax[i];
      col[j] = base[j] * f; col[j + 1] = base[j + 1] * f; col[j + 2] = base[j + 2] * f;
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
  }
  function limpiar() {
    vida.fill(0); col.fill(0);
    for (let i = 0; i < MAX; i++) pos[i * 3 + 1] = -99999;
    geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true;
  }
  function setLimite(n) { limpiar(); limite = Math.min(MAX, n); siguiente = 0; geo.setDrawRange(0, limite); }
  return { emitir, emitirVel, actualizar, limpiar, setLimite };
})();

/** Crea una explosión (esfera brillante + chispas). */
function explosion(pos, tam, color = 0xffaa44) {
  const ex = explosiones.obtener();
  if (ex) {
    ex.malla.position.copy(pos); ex.t = 0; ex.dur = 0.45 + tam * 0.015; ex.tam = tam;
    ex.malla.material.color.setHex(color); ex.malla.material.opacity = 1;
    ex.malla.scale.setScalar(tam * 0.3); ex.malla.visible = true;
  }
  Particulas.emitir(pos, Math.min(50, 6 + Math.floor(tam * 3)), color, 8 + tam * 2.5, 0.9);
  Particulas.emitir(pos, Math.min(20, 3 + Math.floor(tam)), 0xffffff, 6 + tam * 2, 0.5);
}
function actualizarExplosiones(dt) {
  for (const ex of explosiones.items) {
    if (!ex.activo) continue;
    ex.t += dt;
    const k = ex.t / ex.dur;
    if (k >= 1) { ex.activo = false; ex.malla.visible = false; continue; }
    ex.malla.scale.setScalar(ex.tam * (0.3 + k * 1.1));
    ex.malla.material.opacity = 1 - k;
  }
}

// ---------- Mejoras recogibles ----------
// Archivo: mejora_vida.glb, mejora_escudo.glb, mejora_municion.glb, mejora_arma.glb
const TIPOS_MEJORA = {
  vida: { color: 0xff4d6d, texto: '+35 VIDA' },
  escudo: { color: 0x3ab8ff, texto: 'ESCUDO RECARGADO' },
  municion: { color: 0xffa53a, texto: '+4 ARMA SECUNDARIA' },
  arma: { color: 0xd06bff, texto: '¡ARMA MEJORADA!' }
};
const mejoras = new Pool(() => {
  const g = new THREE.Group();
  const nucleo = M(new THREE.OctahedronGeometry(1.4, 0), matSolido(0xffffff));
  const halo = M(new THREE.SphereGeometry(2.3, 10, 8), matLuz(0xffffff, 0.25));
  g.add(nucleo, halo); g.visible = false; escena.add(g);
  return { grupo: g, nucleo, halo, tipo: 'vida', vida: 0 };
}, 10);
function soltarMejora(pos, tipoForzado) {
  const m = mejoras.obtener(); if (!m) return;
  let tipo = tipoForzado || elegirPonderado({ vida: 0.3, escudo: 0.25, municion: 0.3, arma: 0.15 });
  if (tipo === 'arma' && jugador.nivelArma >= 3) tipo = 'municion';
  m.tipo = tipo;
  const c = TIPOS_MEJORA[tipo].color;
  m.nucleo.material = matSolido(c, new THREE.Color(c).multiplyScalar(0.5).getHex(), 80);
  m.halo.material = matLuz(c, 0.25);
  m.grupo.position.copy(pos); m.vida = 18; m.grupo.visible = true;
}
function actualizarMejoras(dt) {
  for (const m of mejoras.items) {
    if (!m.activo) continue;
    m.vida -= dt;
    if (m.vida <= 0) { m.activo = false; m.grupo.visible = false; continue; }
    m.nucleo.rotation.y += dt * 2; m.nucleo.rotation.x += dt;
    m.halo.scale.setScalar(1 + Math.sin(m.vida * 6) * 0.12);
    m.grupo.visible = m.vida > 3 || Math.floor(m.vida * 8) % 2 === 0;
    const d = m.grupo.position.distanceTo(jugador.pos);
    if (jugador.vivo && d < 32) { _a.subVectors(jugador.pos, m.grupo.position).normalize(); m.grupo.position.addScaledVector(_a, (60 + jugador.vel) * dt); }
    if (jugador.vivo && d < 5) { aplicarMejora(m.tipo); m.activo = false; m.grupo.visible = false; }
  }
}
function aplicarMejora(tipo) {
  const J = jugador;
  if (tipo === 'vida') J.vida = Math.min(J.vidaMax, J.vida + 35);
  else if (tipo === 'escudo') J.escudo = J.escudoMax;
  else if (tipo === 'municion') J.municion = Math.min(J.municionMax + 6, J.municion + 4);
  else if (tipo === 'arma') { J.nivelArma = Math.min(3, J.nivelArma + 1); if (J.nivelArma >= 3) desbloquearLogro('arsenal'); }
  Sonido.sfx.recoger();
  mensajeRadio(TIPOS_MEJORA[tipo].texto, 1.6);
  Particulas.emitir(J.pos, 14, TIPOS_MEJORA[tipo].color, 14, 0.5);
}

// =====================================================================
// 12. JUGADOR
// =====================================================================
const STATS_JUGADOR = {
  tierra: { nombre: 'Halcón X-7', vida: 100, escudo: 90, vel: 38, cadencia: 0.11, danio: 10, colorBala: 0x66e0ff, velBala: 290,
            municion: 8, vistaMisil: 'misil', danioMisil: 48, sonido: 'disparoTierra', arma: 'Láser', secundaria: 'Misiles', colorExp: 0x66ccff },
  alien:  { nombre: 'Espectro Vex', vida: 120, escudo: 70, vel: 36, cadencia: 0.15, danio: 14, colorBala: 0x7dff6a, velBala: 250,
            municion: 6, vistaMisil: 'espora', danioMisil: 22, sonido: 'disparoAlien', arma: 'Plasma', secundaria: 'Esporas', colorExp: 0x9dff55 }
};
const jugador = {
  obj: new THREE.Group(), modelos: {}, modelo: null, pos: null,
  fwd: V3(0, 0, 1), der: V3(-1, 0, 0), velVec: V3(),
  yaw: 0, pitch: 0, roll: 0, vel: 45,
  vida: 100, vidaMax: 100, escudo: 80, escudoMax: 80, municion: 8, municionMax: 8, nivelArma: 1,
  tDisparo: 0, ladoCanon: 1, tMisil: 0, tEsquivaCD: 0, esquivaT: 0, esquivaDir: 1, invT: 0, tSinDanio: 10,
  invertidoT: 0, tChoque: 0, vivo: true,
  poderes: {}, escalaVis: 1, cargasEsquiva: 1, st: null, pendiente: null, burbuja: null
};
jugador.pos = jugador.obj.position;
jugador.obj.visible = false;
escena.add(jugador.obj);

/** Prepara la nave del bando elegido con sus valores iniciales. */
function prepararJugador(faccion) {
  const J = jugador, S = STATS_JUGADOR[faccion];
  if (!J.modelos.tierra) {
    J.modelos.tierra = crearModeloNaveTierra(); J.modelos.alien = crearModeloNaveAlien();
    J.obj.add(J.modelos.tierra, J.modelos.alien);
  }
  J.modelos.tierra.visible = faccion === 'tierra';
  J.modelos.alien.visible = faccion === 'alien';
  J.modelo = J.modelos[faccion];
  J.modelo.rotation.set(0, 0, 0);
  J.st = statsNave(faccion);   // valores base + mejoras permanentes
  J.vidaMax = J.vida = J.st.vida; J.escudoMax = J.escudo = J.st.escudo;
  J.municionMax = J.municion = J.st.municion; J.nivelArma = J.st.nivelArma;
  J.vel = J.st.vel; J.yaw = 0; J.pitch = 0; J.roll = 0;
  J.tDisparo = J.tMisil = J.tEsquivaCD = J.esquivaT = J.invT = J.invertidoT = J.tChoque = 0;
  J.tSinDanio = 10; J.vivo = true;
  J.poderes = {}; J.pendiente = null; J.escalaVis = 1; J.cargasEsquiva = J.st.esquivas;
  J.modelo.scale.setScalar(1);
  if (!J.burbuja) {
    J.burbuja = M(new THREE.SphereGeometry(4.2, 16, 12), new THREE.MeshBasicMaterial({ color: 0x4dc3ff, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false }));
    J.obj.add(J.burbuja);
  }
  J.burbuja.visible = false;
  J.pos.set(0, 0, -CONFIG.ARENA * 0.55);
  J.fwd.set(0, 0, 1); J.der.crossVectors(J.fwd, ARRIBA).normalize(); J.velVec.copy(J.fwd).multiplyScalar(J.vel);
  _mira.copy(J.pos).add(J.fwd); J.obj.lookAt(_mira);
  J.obj.visible = true;
  camara.position.copy(J.pos).addScaledVector(J.fwd, -14).add(_a.set(0, 4.5, 0));
  camaraMira.copy(J.pos).addScaledVector(J.fwd, 25);
}

function actualizarJugador(dt) {
  const J = jugador, S = STATS_JUGADOR[juego.faccion], op = guardado.opciones;
  if (!J.vivo) return;
  if (juego.modo === 'carrera' && juego.carrera && juego.carrera.fase === 'cuenta') { J.velVec.set(0, 0, 0); ratonDX = ratonDY = 0; return; }   // cuenta regresiva
  if (J.invertidoT > 0) J.invertidoT -= dt;
  const inv = J.invertidoT > 0 ? -1 : 1;
  const sens = op.sensibilidad;
  const g = entrada.girar * inv, s = entrada.subir * inv;

  if (juego.modo === 'infinito') moverCorredor(dt, g, s);   // MODO INFINITO: corredor
  else {
  // ---- Giro y cabeceo: SOLO con el ratón (en celular, arrastrando el dedo a la derecha) ----
  if (ratonDX || ratonDY) {
    const k = 0.0022 * sens;
    J.yaw -= ratonDX * k * inv;
    J.pitch -= ratonDY * k * inv * (op.invertirY ? -1 : 1);
    ratonDX = ratonDY = 0;
  }
  // Imán de puntería: mientras disparas, la nave se acomoda suavemente hacia el enemigo más cercano a la mira
  if (entrada.disparar) {
    const iman = mejorObjetivo(modoTactil ? 0.38 : 0.26, 450);
    if (iman) {
      _b.subVectors(posObjetivo(iman), J.pos).normalize();
      const fuerza = (modoTactil ? 2.2 : 1.4) * dt;
      J.yaw = anguloLerp(J.yaw, Math.atan2(_b.x, _b.z), fuerza);
      J.pitch = lerp(J.pitch, Math.asin(clamp(_b.y, -1, 1)), fuerza);
    }
  }
  J.pitch = clamp(J.pitch, -1.05, 1.05);

  // ---- Velocidad (acelerar / frenar) ----
  const velObj = J.st.vel * (entrada.acelerar > 0 ? 1.8 : entrada.acelerar < 0 ? 0.5 : 1);
  J.vel = lerp(J.vel, velObj, 1 - Math.exp(-dt * 2.5));
  J.fwd.set(Math.sin(J.yaw) * Math.cos(J.pitch), Math.sin(J.pitch), Math.cos(J.yaw) * Math.cos(J.pitch));
  J.der.crossVectors(J.fwd, ARRIBA).normalize();
  J.velVec.copy(J.fwd).multiplyScalar(J.vel);

  // ---- Desplazamiento: flechas / A-D / joystick mueven a los lados y arriba-abajo, SIN girar ----
  if (!J.velLat) J.velLat = V3();
  _a.set(0, 0, 0).addScaledVector(J.der, g * 30 * sens).addScaledVector(ARRIBA, s * 24 * sens);
  J.velLat.lerp(_a, 1 - Math.exp(-dt * 8));
  J.velVec.add(J.velLat);

  // ---- Esquiva ----
  procesarEsquiva(dt);
  J.pos.addScaledVector(J.velVec, dt);

  // ---- Límites de la zona de combate ----
  const d = J.pos.length();
  if (d > CONFIG.ARENA) {
    J.pos.multiplyScalar(CONFIG.ARENA / d);
    J.yaw = anguloLerp(J.yaw, Math.atan2(-J.pos.x, -J.pos.z), dt * 1.2);
  }
  J.pos.y = clamp(J.pos.y, -CONFIG.ALTURA, CONFIG.ALTURA);
  mostrarElem('avisoZona', d > CONFIG.ARENA * 0.92);
  }

  // ---- Orientación visual (alabeo al girar) ----
  _mira.copy(J.pos).add(J.fwd); J.obj.lookAt(_mira);
  J.roll = lerp(J.roll, g * 0.65, 1 - Math.exp(-dt * 6));
  let giro = J.roll;
  if (J.esquivaT > 0) giro += J.esquivaDir * (1 - J.esquivaT / 0.5) * Math.PI * 2;
  J.modelo.rotation.z = giro;
  for (const m of J.modelo.userData.motores) m.scale.z = 1.1 + (J.vel / J.st.vel - 0.5) * 1.3 + Math.random() * 0.4;
  Sonido.motorActualizar(clamp(J.vel / (J.st.vel * 1.8), 0, 1), dt);

  // ---- Armas ----
  J.tDisparo -= dt;
  if (entrada.disparar && J.tDisparo <= 0) { J.tDisparo = J.st.cadencia; dispararJugador(); }
  J.tMisil -= dt;
  if (pedirMisil) { pedirMisil = false; lanzarMisilJugador(); }

  // ---- Escudo regenerativo ----
  J.tSinDanio += dt;
  if (J.tSinDanio > 3 && J.escudo < J.escudoMax) J.escudo = Math.min(J.escudoMax, J.escudo + J.st.regen * dt);
  if (J.invT > 0) J.invT -= dt;

  // ---- Choques con asteroides ----
  J.tChoque -= dt;
  for (const a of asteroides) {
    if (!a.activo) continue;
    _d.subVectors(J.pos, a.malla.position);
    const dist = _d.length(), r = a.radio + 2 * J.escalaVis;
    if (dist < r && juego.modo === 'infinito') { if (!(J.poderes.gigante > 0)) danarJugador(16); romperAsteroide(a); continue; }
    if (dist < r) {
      J.pos.copy(a.malla.position).addScaledVector(_d, r / (dist || 1));
      if (J.tChoque <= 0 && !(J.poderes.gigante > 0)) { danarJugador(6); J.tChoque = 0.8; Particulas.emitir(J.pos, 10, 0xaa9988, 12, 0.5); }
    }
  }
}

/** Disparo del arma principal (con apuntado asistido suave). */
function dispararJugador() {
  const J = jugador, S = STATS_JUGADOR[juego.faccion];
  const obj = mejorObjetivo(modoTactil ? 0.3 : 0.2, 520);
  if (obj) {
    const p = posObjetivo(obj);
    const t = p.distanceTo(J.pos) / S.velBala;
    _apunte.copy(p);
    if (!obj.esParte) _apunte.addScaledVector(obj.ref.dir, obj.ref.vel * t);
    _apunte.sub(J.pos).normalize();
  } else _apunte.copy(J.fwd);
  let canones;
  const nivelArma = J.poderes.triple > 0 ? 3 : J.nivelArma;   // poder DISPARO TRIPLE
  if (nivelArma === 1) { J.ladoCanon = -J.ladoCanon; canones = [[J.ladoCanon * 1.3, 0]]; }
  else if (nivelArma === 2) canones = [[-1.3, 0], [1.3, 0]];
  else canones = [[-1.3, -0.035], [0, 0], [1.3, 0.035]];
  for (const [lado, abre] of canones) {
    const b = balasJ.obtener(); if (!b) break;
    _origen.copy(J.pos).addScaledVector(J.fwd, 2.5).addScaledVector(J.der, lado * J.escalaVis);
    _dirR.copy(_apunte).addScaledVector(J.der, abre).normalize();
    b.malla.position.copy(_origen);
    b.vel.copy(_dirR).multiplyScalar(S.velBala + J.vel);
    b.vida = 1.7; b.danio = S.danio * (J.poderes.gigante > 0 ? 2 : 1);
    b.malla.material = matLuz(S.colorBala);
    _mira.copy(_origen).add(_dirR); b.malla.lookAt(_mira);
    b.malla.visible = true;
  }
  Sonido.sfx[S.sonido]();
}

/** Arma secundaria: misiles (militares) o enjambre de 3 esporas (alienígenas). */
function lanzarMisilJugador() {
  const J = jugador, S = STATS_JUGADOR[juego.faccion];
  if (J.tMisil > 0) return;
  if (J.municion <= 0) { Sonido.sfx.sinMunicion(); mensajeRadio('Sin munición secundaria', 1.2); return; }
  J.municion--; J.tMisil = 0.45;
  const objs = listaObjetivosMisil();
  const n = (juego.faccion === 'tierra' ? 1 : 3) * (J.st.misilesDobles ? 2 : 1);
  for (let i = 0; i < n; i++) {
    const m = misiles.obtener(); if (!m) break;
    m.dueno = 'jugador'; m.aereo = false;
    m.grupo.position.copy(J.pos).addScaledVector(ARRIBA, -0.8).addScaledVector(J.der, (i - (n - 1) / 2) * 1.5);
    m.dir.copy(J.fwd).addScaledVector(J.der, (i - (n - 1) / 2) * 0.35).normalize();
    m.vel = juego.faccion === 'tierra' ? 120 : 108;
    m.giro = juego.faccion === 'tierra' ? 3.5 : 4.5;
    m.vida = 4; m.danio = S.danioMisil * J.st.multMisil; m.radio = 1.2;
    m.objetivo = objs.length ? objs[i % objs.length] : null;
    m.tBuscar = 0; m.tRastro = 0;
    m.colorRastro = juego.faccion === 'tierra' ? 0xffaa44 : 0x9dff55;
    setVista(m, S.vistaMisil);
    m.grupo.visible = true;
  }
  Sonido.sfx.misil();
}

/** Recibir daño: primero el escudo, después la vida. */
function danarJugador(cant) {
  const J = jugador;
  if (!J.vivo || J.esquivaT > 0 || J.invT > 0 || juego.fase === 'completado' || juego.fase === 'muerteJefe' || juego.fase === 'meta') return;
  if (J.poderes.escudo > 0) { Sonido.sfx.impactoEscudo(); flashDanio(true); return; }   // ESCUDO INVENCIBLE
  cant *= juego.D.danio;   // dificultad
  juego.danioRecibido = true; J.tSinDanio = 0;
  if (juego.racha >= 5) mensajeRadio('Racha perdida en x' + juego.racha, 1.5);
  juego.racha = 0;
  const conEscudo = J.escudo > 0;
  if (conEscudo) {
    J.escudo -= cant;
    if (J.escudo < 0) { J.vida += J.escudo; J.escudo = 0; Sonido.sfx.escudoRoto(); }
  } else J.vida -= cant;
  Sonido.sfx.danioJugador();
  juego.sacudida = Math.min(1.2, juego.sacudida + cant * 0.04);
  flashDanio(conEscudo);
  if (J.vida <= 0) { J.vida = 0; jugadorDestruido(); }
}

function jugadorDestruido() {
  const J = jugador;
  J.vivo = false; J.obj.visible = false;
  explosion(J.pos, 14, 0xffaa44); explosion(J.pos, 8, 0xffffff);
  Sonido.sfx.explosionGrande(); Sonido.motorDetener();
  juego.sacudida = 1.5;
  if (juego.modo === 'carrera') { juego.fase = 'reaparecer'; juego.tFase = 0; juego.puntaje = Math.max(0, juego.puntaje - 300); juego.carrera.muertes++; mostrarMensaje('NAVE DESTRUIDA\nReapareces en 3 s (−300)', 2.5); }
  else { juego.fase = 'derrota'; juego.tFase = 0; }
}

function sumarPuntos(n) { juego.puntaje += juego.modo === 'infinito' ? Math.round(n * multCombo()) : n; }

// =====================================================================
// 13. OBJETIVOS (para apuntado asistido y misiles guiados)
// =====================================================================
function crearObjetivo(ref, esParte) { return { ref, esParte, gen: esParte ? 0 : ref.gen }; }
function objetivoVivo(o) {
  if (!o) return false;
  if (o.esParte) return o.ref.activa && !o.ref.inmune && !!juego.jefe && !juego.jefe.muriendo && juego.jefe.partes.indexOf(o.ref) >= 0;
  return o.ref.activo && o.ref.gen === o.gen && !o.ref.aliado;
}
function posObjetivo(o) { return o.esParte ? o.ref.posMundo : o.ref.pos; }
function candidatosObjetivo() {
  const lista = [];
  for (const e of enemigos) if (e.activo && !e.aliado) lista.push(crearObjetivo(e, false));
  const j = juego.jefe;
  if (j && !j.muriendo && j.entrada >= 1) for (const p of j.partes) if (p.activa && !p.inmune && !p.redirigir && p.cuenta) lista.push(crearObjetivo(p, true));
  return lista;
}
/** El objetivo más cercano a la mira dentro de un ángulo y distancia. */
function mejorObjetivo(maxAng, maxDist) {
  const J = jugador; let mejor = null, mejorAng = maxAng;
  for (const o of candidatosObjetivo()) {
    _b.subVectors(posObjetivo(o), J.pos);
    const d = _b.length(); if (d > maxDist || d < 1) continue;
    const ang = Math.acos(clamp(_b.dot(J.fwd) / d, -1, 1));
    if (ang < mejorAng) { mejorAng = ang; mejor = o; }
  }
  return mejor;
}
/** Lista de objetivos ordenada por cercanía a la mira (para misiles). */
function listaObjetivosMisil() {
  const J = jugador, lista = [];
  for (const o of candidatosObjetivo()) {
    _b.subVectors(posObjetivo(o), J.pos);
    const d = _b.length(); if (d > 600 || d < 1) continue;
    const ang = Math.acos(clamp(_b.dot(J.fwd) / d, -1, 1));
    if (ang < 0.7) lista.push({ o, ang });
  }
  lista.sort((x, y) => x.ang - y.ang);
  return lista.map((x) => x.o);
}

// =====================================================================
// 14. ENEMIGOS NORMALES
// =====================================================================
const MODELOS_ENEMIGOS = {
  alien: { caza: crearModeloCazaAlien, kamikaze: crearModeloEsporaAlien, pesado: crearModeloCanoneraAlien },
  tierra: { caza: crearModeloCazaTierra, kamikaze: crearModeloDronTierra, pesado: crearModeloBombarderoTierra }
};
const STATS_ENEMIGOS = {
  // escala = tamaño visual del modelo · radio = zona de impacto (más grande = más fácil de acertar)
  caza:     { vida: 30, vel: 27, giro: 1.2, radio: 5.6, escala: 2.6, halo: 14, puntos: 100, cadencia: 1.7, drop: 0.18 },
  kamikaze: { vida: 18, vel: 36, giro: 1.7, radio: 4.6, escala: 2.6, halo: 11, puntos: 75, choque: 18, drop: 0.1 },
  pesado:   { vida: 110, vel: 17, giro: 0.7, radio: 9.5, escala: 2.3, halo: 17, puntos: 200, cadencia: 2.6, drop: 0.55 },
  enjambre: { vida: 8, vel: 40, giro: 2.0, radio: 3.2, escala: 2.6, halo: 8, puntos: 25, choque: 8, drop: 0.04 },
  senuelo:  { vida: 1, vel: 30, giro: 1, radio: 8, escala: 1, halo: 0, puntos: 50, cadencia: 2.6, drop: 0 }
};
const enemigos = [];
const cacheEnemigos = {};
function faccionEnemiga() { return juego.faccion === 'tierra' ? 'alien' : 'tierra'; }
function colorBalaEnemiga() { return faccionEnemiga() === 'alien' ? 0xc061ff : 0xff5544; }

function obtenerEnemigo(clave, crearModelo) {
  const lista = cacheEnemigos[clave] || (cacheEnemigos[clave] = []);
  let e = lista.find((x) => !x.activo);
  if (!e) {
    e = { clave, modelo: crearModelo(), dir: V3(0, 0, 1), offset: V3(), activo: false, gen: 0 };
    e.halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX_BRILLO, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    e.modelo.add(e.halo);
    e.pos = e.modelo.position; escena.add(e.modelo); lista.push(e);
  }
  e.activo = true; e.modelo.visible = true;
  return e;
}
function generarEnemigo(tipo, pos) {
  const fe = faccionEnemiga();
  let clave, crear;
  if (tipo === 'enjambre') { clave = 'enjambre'; crear = crearModeloDronEnjambre; }
  else if (tipo === 'senuelo') { clave = 'senuelo'; crear = crearModeloOraculo; }
  else { clave = fe + '_' + tipo; crear = MODELOS_ENEMIGOS[fe][tipo]; }
  const e = obtenerEnemigo(clave, crear), st = STATS_ENEMIGOS[tipo], n = juego.nivel - 1;
  e.tipo = tipo; e.vida = e.vidaMax = st.vida * (1 + n * 0.35) * juego.D.vida;
  e.vel = st.vel * (1 + n * 0.05) * juego.D.vel; e.giro = st.giro; e.radio = st.radio; e.puntos = st.puntos;
  e.cadencia = (st.cadencia || 2) / ((1 + n * 0.18) * juego.D.cadencia); e.tDisparo = rand(1, 2.5);
  e.t = rand(0, 10); e.tOffset = 0; e.golpeT = 0; e.gen++; e.deOleada = false; e.deJefe = false; e.aliado = false; e.elite = false; e.protegido = false;
  e.pos.copy(pos); e.dir.subVectors(jugador.pos, pos).normalize();
  e.escala = st.escala || 1;
  e.modelo.scale.setScalar(e.escala);
  e.halo.visible = st.halo > 0;
  e.halo.scale.setScalar(st.halo || 1);
  e.halo.material.color.setHex(tipo === 'enjambre' ? 0xd4ff3a : fe === 'alien' ? 0xc061ff : 0xff5544);
  _mira.copy(pos).add(e.dir); e.modelo.lookAt(_mira);
  enemigos.push(e);
  return e;
}
function posicionAparicion(out) {
  if (juego.modo === 'infinito') return out.set(rand(-CORR.X, CORR.X), rand(-CORR.Y, CORR.Y), jugador.pos.z + rand(240, 330));
  const J = jugador, ang = J.yaw + rand(-0.9, 0.9), dist = rand(150, 220);
  out.set(J.pos.x + Math.sin(ang) * dist, clamp(J.pos.y + rand(-60, 60), -CONFIG.ALTURA, CONFIG.ALTURA), J.pos.z + Math.cos(ang) * dist);
  const d = out.length(); if (d > CONFIG.ARENA) out.multiplyScalar(CONFIG.ARENA * 0.95 / d);
  return out;
}

function actualizarEnemigos(dt) {
  const J = jugador;
  actualizarProtecciones();
  for (let i = enemigos.length - 1; i >= 0; i--) {
    const e = enemigos[i];
    if (!e.activo) { enemigos.splice(i, 1); continue; }
    e.t += dt;
    if (juego.modo === 'infinito' && e.tipo !== 'kamikaze' && e.tipo !== 'enjambre') e.pos.z += juego.avanceZ * 0.85;   // acompañan al corredor
    _hacia.subVectors(J.pos, e.pos);
    const dist = _hacia.length() || 1;
    _hacia.divideScalar(dist);
    let mirarJugador = false;
    if (e.aliado) { actualizarConvertido(e, dt); continue; }   // nave bajo CONTROL MENTAL

    switch (e.tipo) {
      case 'caza': {
        e.tOffset -= dt;
        if (e.tOffset <= 0) { e.tOffset = rand(2, 4); vecAleatorio(e.offset, rand(15, 40)); }
        if (dist < 35) _deseo.copy(_hacia).negate().addScaledVector(J.der, 0.8).normalize();
        else _deseo.copy(J.pos).add(e.offset).sub(e.pos).normalize();
        if (fueraArena(e.pos)) _deseo.copy(e.pos).negate().normalize();
        girarHacia(e.dir, _deseo, e.giro * dt);
        e.pos.addScaledVector(e.dir, e.vel * dt);
        e.tDisparo -= dt;
        if (e.tDisparo <= 0) {
          if (dist < 230 && e.dir.dot(_hacia) > 0.9 && J.vivo) {
            e.tDisparo = e.cadencia;
            _origen.copy(e.pos).addScaledVector(e.dir, 2.5);
            dispararAlJugador(_origen, { vel: 105, danio: 6 + juego.nivel, color: colorBalaEnemiga() }, 0.04);
            Sonido.sfx.disparoEnemigo();
          } else e.tDisparo = 0.3;
        }
        break;
      }
      case 'kamikaze':
      case 'enjambre': {
        _deseo.copy(_hacia);
        if (e.tipo === 'enjambre') _deseo.addScaledVector(J.der, Math.sin(e.t * 3) * 0.3).normalize();
        girarHacia(e.dir, _deseo, e.giro * dt);
        e.pos.addScaledVector(e.dir, e.vel * dt);
        e.modelo.rotation.z += dt * 4;
        if (J.vivo && dist < e.radio + 2.2 * J.escalaVis) {
          if (J.poderes.gigante > 0) destruirEnemigo(e, false, false);   // la nave gigante los aplasta
          else { danarJugador(STATS_ENEMIGOS[e.tipo].choque + juego.nivel); destruirEnemigo(e, false, true); }
          continue;
        }
        break;
      }
      case 'pesado': {
        if (dist > 170) _deseo.copy(_hacia);
        else if (dist < 100) _deseo.copy(_hacia).negate().addScaledVector(J.der, 0.6).normalize();
        else { _deseo.crossVectors(_hacia, ARRIBA); if (_deseo.lengthSq() < 1e-4) _deseo.set(1, 0, 0); _deseo.normalize(); }
        if (fueraArena(e.pos)) _deseo.copy(e.pos).negate().normalize();
        girarHacia(e.dir, _deseo, e.giro * dt);
        e.pos.addScaledVector(e.dir, e.vel * dt);
        mirarJugador = true;
        e.tDisparo -= dt;
        if (e.tDisparo <= 0 && dist < 280 && J.vivo) {
          e.tDisparo = e.cadencia;
          for (let k = 0; k < 3; k++) dispararAlJugador(e.pos, { vel: 85, danio: 7 + juego.nivel, color: colorBalaEnemiga(), tam: 1.3 }, 0.08);
          Sonido.sfx.disparoEnemigo();
        }
        break;
      }
      case 'interceptor': iaInterceptor(e, dt, dist); break;
      case 'minador': iaMinador(e, dt, dist); break;
      case 'francotirador': mirarJugador = iaFrancotirador(e, dt, dist); break;
      case 'escudero': iaEscudero(e, dt, dist); break;
      case 'senuelo': {
        const j = juego.jefe;
        const centro = j ? j.grupo.position : J.pos;
        const ang = e.t * 0.5 + e.fase;
        _deseo.set(centro.x + Math.cos(ang) * 50, centro.y + Math.sin(ang * 1.3) * 15, centro.z + Math.sin(ang) * 50);
        e.pos.lerp(_deseo, 1 - Math.exp(-dt * 1.5));
        e.dir.copy(_hacia);
        e.modelo.userData.anillos[0].rotation.z += dt;
        e.modelo.userData.anillos[1].rotation.y += dt * 0.7;
        e.tDisparo -= dt;
        if (e.tDisparo <= 0 && dist < 300 && J.vivo) { e.tDisparo = e.cadencia; dispararAlJugador(e.pos, { vel: 70, danio: 4, color: 0xc061ff }, 0.05); }
        break;
      }
    }
    // Orientación del modelo
    if (mirarJugador) _mira.copy(e.pos).add(_hacia); else _mira.copy(e.pos).add(e.dir);
    e.modelo.lookAt(_mira);
    if (e.golpeT > 0) { e.golpeT -= dt; e.modelo.scale.setScalar(e.escala * (1 + Math.max(0, e.golpeT) * 2.5)); }
    else if (e.modelo.scale.x !== e.escala) e.modelo.scale.setScalar(e.escala);
    // Choque físico con el jugador (cazas y pesados)
    if (J.vivo && e.tipo !== 'senuelo' && dist < e.radio + 1.8 * J.escalaVis) {
      if (J.poderes.gigante > 0) { destruirEnemigo(e, false, false); juego.sacudida = Math.min(1, juego.sacudida + 0.3); }
      else { danarJugador(12); destruirEnemigo(e, false, true); }
    }
  }
}

function danarEnemigo(e, cant, porMisil) {
  if (e.protegido) { cant *= 0.25; Sonido.sfx.impactoEscudo(); }   // protegido por un ESCUDERO
  e.vida -= cant; e.golpeT = 0.08;
  if (e.vida <= 0) destruirEnemigo(e, porMisil, false);
  else Sonido.sfx.impacto();
}

function destruirEnemigo(e, porMisil, sinRecompensa) {
  if (!e.activo) return;
  e.activo = false; e.modelo.visible = false;
  const fe = e.tipo === 'senuelo' ? 'senuelo' : (e.tipo === 'enjambre' ? 'alien' : faccionEnemiga());
  explosion(e.pos, e.radio * 2.2, fe === 'senuelo' ? 0xc061ff : fe === 'alien' ? 0x9dff55 : 0xffaa44);
  Sonido.sfx.explosionPequena();
  if (e.deOleada) juego.enemigosDerribados++;
  if (e.tipo === 'enjambre' && juego.jefe) juego.jefe.enjambresPerdidos = (juego.jefe.enjambresPerdidos || 0) + 1;
  if (e.tipo === 'senuelo') { mensajeRadio('¡Era una ilusión!', 1.3); }
  if (sinRecompensa) return;
  sumarPuntos(e.puntos);
  juego.derribosNivel++;
  if (!e.aliado) sumarRacha();
  contarBaja();
  const st = guardado.stats;
  st.derribos++;
  if (porMisil) st.derribosMisil++;
  if (st.derribos >= 1) desbloquearLogro('primer_derribo');
  if (st.derribos >= 100) desbloquearLogro('cien_naves');
  if (st.derribosMisil >= 15) desbloquearLogro('misilero');
  if (st.derribos % 10 === 0) guardar();
  if (Math.random() < STATS_ENEMIGOS[e.tipo].drop) soltarMejora(e.pos);
  if (e.elite) { soltarMejora(_c.copy(e.pos).add(_d.set(3, 0, 0)), 'arma'); if (Math.random() < 0.5) generarCapsula(e.pos); }
}

// =====================================================================
// 15. PROYECTILES: disparos enemigos, colisiones y misiles
// =====================================================================
function dispararEnemigo(origen, dir, op = {}) {
  const b = balasE.obtener(); if (!b) return;
  const tam = op.tam || 1;
  b.malla.position.copy(origen);
  b.vel.copy(dir).normalize().multiplyScalar(op.vel || 100);
  b.vida = op.vida || 4; b.danio = op.danio || 6; b.radio = tam * 0.7;
  b.malla.scale.setScalar(tam);
  b.malla.material = matLuz(op.color || 0xff4d6d);
  b.malla.visible = true;
}
/** Dispara hacia donde estará el jugador (predicción). */
function dispararAlJugador(origen, op = {}, dispersion = 0) {
  const vel = op.vel || 100, t = origen.distanceTo(jugador.pos) / vel;
  _apunte.copy(jugador.pos).addScaledVector(jugador.velVec, t * 0.75).sub(origen).normalize();
  if (dispersion) { _apunte.x += rand(-dispersion, dispersion); _apunte.y += rand(-dispersion, dispersion); _apunte.z += rand(-dispersion, dispersion); }
  dispararEnemigo(origen, _apunte, op);
}
/** Ráfaga en forma de cono apuntando al jugador. */
function rafagaCono(origen, n, apertura, op = {}) {
  _base.copy(jugador.pos).sub(origen).normalize();
  _u.crossVectors(_base, ARRIBA); if (_u.lengthSq() < 1e-4) _u.set(1, 0, 0); _u.normalize();
  _v.crossVectors(_u, _base).normalize();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    _dirR.copy(_base).addScaledVector(_u, Math.cos(a) * apertura).addScaledVector(_v, Math.sin(a) * apertura);
    dispararEnemigo(origen, _dirR, op);
  }
  if (op.centro !== false) dispararEnemigo(origen, _base, op);
  Sonido.sfx.disparoEnemigo();
}
function lanzarMisilEnemigo(origen, dir, op = {}) {
  const m = misiles.obtener(); if (!m) return;
  m.dueno = 'enemigo'; m.racimo = op.racimo || 0;
  m.grupo.position.copy(origen); m.dir.copy(dir).normalize();
  m.vel = op.vel || 60; m.giro = op.giro || 1.2; m.vida = op.vida || 6; m.danio = op.danio || 12;
  const vista = op.vista || 'misil';
  m.radio = vista === 'orbe' ? 1.6 : 1.2;
  m.colorRastro = op.color || (vista === 'orbe' ? 0xc061ff : 0xff7744);
  setVista(m, vista, m.colorRastro);
  m.objetivo = null; m.tRastro = 0; m.grupo.visible = true;
}

/** Revisa si un proyectil del jugador (segmento a-b) golpea algo.
 *  Devuelve 0 = nada, 1 = impactó, 2 = el jefe reflejó el misil. */
function colisionProyectilJugador(a, b, danio, esMisil) {
  for (let i = 0; i < enemigos.length; i++) {
    const e = enemigos[i]; if (!e.activo || e.aliado) continue;
    if (segmentoEsfera(a, b, e.pos, e.radio)) { Particulas.emitir(b, 5, 0xffffff, 14, 0.25); danarEnemigo(e, danio, esMisil); return 1; }
  }
  const j = juego.jefe;
  if (j && !j.muriendo) {
    for (const p of j.partes) {
      if (!p.activa) continue;
      if (!segmentoEsfera(a, b, p.posMundo, p.radio)) continue;
      if (esMisil && j.reflejaMisiles) return 2;
      const destino = p.redirigir || p;
      if (destino.inmune || !destino.activa) { Particulas.emitir(b, 6, 0x88ccff, 16, 0.3); Sonido.sfx.impactoEscudo(); return 1; }
      Particulas.emitir(b, 6, 0xffcc66, 16, 0.3); danarParte(destino, danio); return 1;
    }
  }
  for (const m of misiles.items) {
    if (!m.activo || m.dueno !== 'enemigo') continue;
    if (segmentoEsfera(a, b, m.grupo.position, m.radio + 0.5)) { explosion(m.grupo.position, 3, 0xff8844); Sonido.sfx.explosionPequena(); desactivarMisil(m); sumarPuntos(10); return 1; }
  }
  for (const m of minas.items) if (m.activo && segmentoEsfera(a, b, m.grupo.position, m.radio)) { golpearMina(m, danio); return 1; }
  for (const m of meteoritos.items) if (m.activo && segmentoEsfera(a, b, m.grupo.position, m.radio)) { golpearMeteorito(m, danio); return 1; }
  for (const ast of asteroides) {
    if (!ast.activo) continue;
    if (segmentoEsfera(a, b, ast.malla.position, ast.radio)) {
      Particulas.emitir(b, 4, 0xaa9988, 10, 0.3);
      if (juego.modo === 'infinito') { ast.hp -= danio; if (ast.hp <= 0) { sumarPuntos(25); romperAsteroide(ast); } }
      return 1;
    }
  }
  return 0;
}

function actualizarBalasJugador(dt) {
  for (const b of balasJ.items) {
    if (!b.activo) continue;
    b.vida -= dt;
    if (b.vida <= 0) { b.activo = false; b.malla.visible = false; continue; }
    b.prev.copy(b.malla.position);
    b.malla.position.addScaledVector(b.vel, dt);
    if (colisionProyectilJugador(b.prev, b.malla.position, b.danio, false)) { b.activo = false; b.malla.visible = false; }
  }
}
function actualizarBalasEnemigas(dt) {
  const J = jugador;
  for (const b of balasE.items) {
    if (!b.activo) continue;
    b.vida -= dt;
    if (b.vida <= 0) { b.activo = false; b.malla.visible = false; continue; }
    b.prev.copy(b.malla.position);
    b.malla.position.addScaledVector(b.vel, dt);
    if (J.vivo && J.esquivaT <= 0 && segmentoEsfera(b.prev, b.malla.position, J.pos, 1.9 * Math.min(J.escalaVis, 1.8) + b.radio)) {
      danarJugador(b.danio);
      Particulas.emitir(b.malla.position, 8, 0xff6677, 12, 0.3);
      b.activo = false; b.malla.visible = false;
    }
  }
}
function actualizarMisiles(dt) {
  const J = jugador;
  for (const m of misiles.items) {
    if (!m.activo) continue;
    m.vida -= dt;
    if (m.vida <= 0) { explosion(m.grupo.position, 2.5, m.colorRastro); desactivarMisil(m); continue; }
    if (m.dueno === 'enemigo' && m.racimo > 0) { m.racimo -= dt * juego.lento; if (m.racimo <= 0) { estallarRacimo(m); continue; } }
    if (m.dueno === 'jugador') {
      if (!objetivoVivo(m.objetivo)) {
        m.objetivo = null; m.tBuscar -= dt;
        if (m.tBuscar <= 0) { m.tBuscar = 0.25; m.objetivo = mejorObjetivo(0.9, 500); }
      }
      if (m.objetivo) { _deseo.subVectors(posObjetivo(m.objetivo), m.grupo.position).normalize(); girarHacia(m.dir, _deseo, m.giro * dt); }
    } else if (J.vivo) {
      _deseo.subVectors(J.pos, m.grupo.position).normalize(); girarHacia(m.dir, _deseo, m.giro * dt);
    }
    m.prev.copy(m.grupo.position);
    m.grupo.position.addScaledVector(m.dir, m.vel * dt * (m.dueno === 'enemigo' ? juego.lento : 1));
    _mira.copy(m.grupo.position).add(m.dir); m.grupo.lookAt(_mira);
    m.tRastro -= dt;
    if (m.tRastro <= 0) { m.tRastro = 0.04; Particulas.emitir(m.grupo.position, 1, m.colorRastro, 2, 0.4); }
    if (m.dueno === 'jugador') {
      const r = colisionProyectilJugador(m.prev, m.grupo.position, m.danio, !m.aereo);
      if (r === 1) { explosion(m.grupo.position, 5, m.colorRastro); Sonido.sfx.explosionPequena(); desactivarMisil(m); }
      else if (r === 2) reflejarMisil(m);
    } else if (J.vivo && J.esquivaT <= 0 && segmentoEsfera(m.prev, m.grupo.position, J.pos, 2.2 + m.radio * 0.5)) {
      danarJugador(m.danio); explosion(m.grupo.position, 4, 0xff6644); desactivarMisil(m);
    }
  }
}
/** El Devorador de Mundos absorbe el misil y lo devuelve contra el jugador. */
function reflejarMisil(m) {
  m.dueno = 'enemigo'; m.racimo = 0; m.dir.negate();
  m.vel = 70; m.giro = 1.5; m.vida = 5; m.danio = 14; m.radio = 1.6; m.objetivo = null;
  m.colorRastro = 0xff5588; setVista(m, 'orbe', 0xff5588);
  Particulas.emitir(m.grupo.position, 14, 0xff5588, 18, 0.5);
  Sonido.sfx.impactoEscudo();
  const j = juego.jefe;
  if (j && !j.avisoReflejo) { j.avisoReflejo = true; mensajeRadio('¡El Devorador absorbe tus misiles y los devuelve! Usa el arma principal.', 4.5); }
}

function actualizarAsteroides(dt) {
  for (const a of asteroides) {
    if (!a.activo) continue;
    a.malla.rotation.x += a.giro.x * dt; a.malla.rotation.y += a.giro.y * dt; a.malla.rotation.z += a.giro.z * dt;
    if (a.vel) {   // asteroides en movimiento (rebotan en el borde de la zona)
      a.malla.position.addScaledVector(a.vel, dt);
      if (a.malla.position.length() > CONFIG.ARENA * 0.92 || Math.abs(a.malla.position.y) > 130) a.vel.negate();
    }
  }
}

// =====================================================================
// 16. JEFES
//     Cada jefe tiene "partes" (zonas que reciben daño). Una parte puede ser:
//      - inmune: absorbe disparos (escudos, blindaje)
//      - redirigir: pasa el daño a otra parte (para jefes grandes)
//      - cuenta: suma a la barra de vida del jefe
//     El jefe muere cuando todas las partes que "cuentan" llegan a 0.
// =====================================================================
const _ja = V3(), _jb = V3(), _jc = V3();

function parte(id, malla, radio, vida, op = {}) {
  return {
    id, malla, radio, vida, vidaMax: vida, activa: true,
    inmune: !!op.inmune, cuenta: op.cuenta !== false && isFinite(vida),
    ocultar: !!op.ocultar, redirigir: op.redirigir || null, alDestruir: op.alDestruir || null,
    posMundo: V3(), tDisp: op.tDisp !== undefined ? op.tDisp : rand(0.8, 2.2)
  };
}
function jefeMirar(j, objetivo, dt, rapidez) {
  _ja.subVectors(objetivo, j.grupo.position);
  if (_ja.lengthSq() < 1e-6) return;
  _ja.normalize(); girarHacia(j.dir, _ja, rapidez * dt);
  _jb.copy(j.grupo.position).add(j.dir); j.grupo.lookAt(_jb);
}
function jefeMirarDir(j, dir, dt, rapidez) {
  girarHacia(j.dir, dir, rapidez * dt);
  _jb.copy(j.grupo.position).add(j.dir); j.grupo.lookAt(_jb);
}
function jefeMoverHacia(j, destino, vel, dt) {
  _jc.subVectors(destino, j.grupo.position);
  const d = _jc.length();
  if (d > 0.5) j.grupo.position.addScaledVector(_jc, Math.min(vel * dt, d) / d);
}
function puntoOrbita(ang, dist, altura, out) {
  if (juego.modo === 'infinito') return out.set(jugador.pos.x * 0.5 + Math.cos(ang) * 45, clamp(jugador.pos.y + altura * 0.4, -CORR.Y, CORR.Y), jugador.pos.z + 150 + Math.sin(ang) * 40);
  return out.set(jugador.pos.x + Math.cos(ang) * dist, clamp(jugador.pos.y + altura, -CONFIG.ALTURA, CONFIG.ALTURA), jugador.pos.z + Math.sin(ang) * dist);
}
function limitarArena(p) {
  if (juego.modo === 'infinito') { p.x = clamp(p.x, -CORR.X - 20, CORR.X + 20); p.y = clamp(p.y, -CORR.Y - 15, CORR.Y + 15); return; }
  const d = p.length(); if (d > CONFIG.ARENA) p.multiplyScalar(CONFIG.ARENA / d);
  p.y = clamp(p.y, -CONFIG.ALTURA, CONFIG.ALTURA);
}
function distJefe(j) { return j.grupo.position.distanceTo(jugador.pos); }
function anunciarFase(j, titulo, objetivo) {
  mostrarMensaje(titulo, 2.8);
  j.objetivo = objetivo;
  Sonido.sfx.faseJefe();
  soltarMejora(_ja.copy(jugador.pos).addScaledVector(jugador.fwd, 40), Math.random() < 0.5 ? 'vida' : 'municion');
}
function contarEnemigosJefe(tipo) {
  let n = 0;
  for (const e of enemigos) if (e.activo && e.deJefe && (!tipo || e.tipo === tipo)) n++;
  return n;
}
function generarDesdeJefe(tipo, origen, dispersion) {
  vecAleatorio(_ja, dispersion).add(origen);
  limitarArena(_ja);
  const e = generarEnemigo(tipo, _ja);
  e.deJefe = true;
  Particulas.emitir(_ja, 8, 0xffffff, 10, 0.4);
  return e;
}

// ---------------------------------------------------------------------
// JEFE MILITAR 1: COLOSO ORBITAL — se destruye por módulos
//   Fase 1: 4 torretas (el generador tiene escudo)
//   Fase 2: generador expuesto, lanza ráfagas en cono
//   Fase 3: núcleo expuesto, ataque rápido
// ---------------------------------------------------------------------
function crearJefeColoso() {
  const g = crearModeloColosoOrbital(), u = g.userData;
  const j = { grupo: g, dir: V3(0, 0, 1), partes: [], frase: 'Coloso Orbital: "Esta órbita pertenece a la Tierra. Retírate, invasor."', objetivo: 'Destruye las 4 torretas' };
  const escudoGen = parte('escudoGen', u.escudoGen, 6.2, Infinity, { inmune: true });
  const torretas = u.torretas.map((t, i) => parte('torreta' + i, t, 3.2, 130, { ocultar: true, tDisp: 1 + i * 0.4 }));
  const generador = parte('generador', u.generador, 4.5, 320, { inmune: true });
  const nucleo = parte('nucleo', u.nucleo, 4, 420, { inmune: true });
  const cuerpo = parte('cuerpo', u.cuerpo, 11, Infinity, { inmune: true });
  j.partes.push(escudoGen, ...torretas, generador, nucleo, cuerpo);
  let tAtaque = 2, tRafaga = 1, tMinas = 5;
  j.actualizar = (dt) => {
    g.rotation.y += (j.fase === 3 ? 0.35 : 0.15) * dt;
    // NUEVO: minas orbitales que giran alrededor de la estación
    tMinas -= dt;
    if (tMinas <= 0) {
      tMinas = j.fase === 3 ? 8 : 12;
      let n = 0; for (const m of minas.items) if (m.activo && m.orbita && m.orbita.jefe === j) n++;
      if (n < 6) { for (let k = 0; k < 6; k++) soltarMina(g.position, { orbita: { jefe: j, ang: k * Math.PI / 3, r: 34, y: rand(-6, 6), vel: 0.7 }, vida: 40 }); mensajeRadio('⚠ ¡Minas orbitales!', 1.5); }
    }
    const dist = distJefe(j);
    if (dist > 300) jefeMoverHacia(j, jugador.pos, 15, dt);
    for (const p of torretas) {
      if (!p.activa) continue;
      p.malla.lookAt(jugador.pos);
      p.tDisp -= dt;
      if (p.tDisp <= 0 && dist < 380) { p.tDisp = 1.7; dispararAlJugador(p.posMundo, { vel: 95, danio: 7, color: 0xff7a3a }, 0.05); Sonido.sfx.disparoEnemigo(); }
    }
    if (j.fase === 1 && torretas.every((p) => !p.activa)) {
      j.fase = 2; generador.inmune = false; escudoGen.activa = false; u.escudoGen.visible = false;
      anunciarFase(j, '¡Torretas destruidas!\nEl generador está expuesto', 'Destruye el generador (arriba)');
    }
    if (j.fase === 2) {
      tAtaque -= dt;
      if (tAtaque <= 0) { tAtaque = 2.6; rafagaCono(generador.posMundo, 14, 0.35, { vel: 80, danio: 7, color: 0x66ccff, tam: 1.3 }); }
      if (!generador.activa) {
        j.fase = 3; nucleo.inmune = false; u.blindaje.forEach((b) => (b.visible = false));
        anunciarFase(j, '¡NÚCLEO EXPUESTO!', 'Destruye el núcleo (abajo)');
      }
    }
    if (j.fase === 3) {
      tRafaga -= dt; tAtaque -= dt;
      if (tRafaga <= 0) { tRafaga = 0.9; for (let k = 0; k < 3; k++) dispararAlJugador(nucleo.posMundo, { vel: 120, danio: 8, color: 0xff3355 }, 0.06); Sonido.sfx.disparoEnemigo(); }
      if (tAtaque <= 0) { tAtaque = 3.5; rafagaCono(nucleo.posMundo, 18, 0.5, { vel: 75, danio: 7, color: 0xff8844 }); }
    }
  };
  return j;
}

// ---------------------------------------------------------------------
// JEFE MILITAR 2: FÉNIX B-99 — bombardero gigante
//   Fase 1: alfombras de misiles + cañón de cola
//   Fase 2 (<50%): llama escuadrones de cazas y ataca más rápido
// ---------------------------------------------------------------------
function crearJefeFenix() {
  const g = crearModeloFenixB99(), u = g.userData;
  const j = { grupo: g, dir: V3(0, 0, 1), partes: [], frase: 'Fénix B-99: "Bombardero en posición. Alfombra de misiles lista."', objetivo: 'Derriba el bombardero' };
  const casco = parte('casco', u.cuerpo, 9, 1500);
  j.partes.push(casco,
    parte('alaI', u.alaIzq, 7, 0, { redirigir: casco, cuenta: false }),
    parte('alaD', u.alaDer, 7, 0, { redirigir: casco, cuenta: false }));
  let ang = 0, tAlfombra = 3, restantes = 0, tEntre = 0, tCola = 1.5, tEscuadron = 4, tRacimo = 6;
  j.actualizar = (dt) => {
    const f2 = j.fase === 2;
    ang += dt * (f2 ? 0.32 : 0.24);
    puntoOrbita(ang, 175, Math.sin(j.t * 0.3) * 40, _ja); limitarArena(_ja);
    _jb.subVectors(_ja, g.position);
    if (_jb.lengthSq() > 1) {
      _jb.normalize();
      jefeMirarDir(j, _jb, dt, 1.2);
      g.position.addScaledVector(j.dir, (f2 ? 62 : 48) * dt);
    }
    for (const m of u.motores) m.scale.z = 1.6 + Math.random() * 0.6;
    // Alfombra de misiles
    tAlfombra -= dt;
    if (tAlfombra <= 0 && restantes <= 0) { tAlfombra = f2 ? 3 : 4.2; restantes = f2 ? 9 : 6; mensajeRadio('⚠ ¡Alfombra de misiles!', 1.5); }
    if (restantes > 0) {
      tEntre -= dt;
      if (tEntre <= 0) {
        tEntre = 0.22; restantes--;
        _jc.copy(g.position).addScaledVector(ARRIBA, -2.5);
        _jc.x += rand(-8, 8); _jc.z += rand(-4, 4);
        _jb.copy(j.dir).addScaledVector(ARRIBA, -0.6);
        lanzarMisilEnemigo(_jc, _jb, { vel: 58, giro: 0.9, vida: 6, danio: 11 });
      }
    }
    // NUEVO: bombas de racimo que se dividen en 10 proyectiles
    tRacimo -= dt;
    if (tRacimo <= 0 && distJefe(j) < 350) {
      tRacimo = f2 ? 5 : 7;
      _jc.copy(g.position).addScaledVector(ARRIBA, -3);
      for (let k = 0; k < (f2 ? 3 : 2); k++) { _jb.subVectors(jugador.pos, _jc).normalize().addScaledVector(vecAleatorio(_ja, 1), 0.25); lanzarMisilEnemigo(_jc, _jb, { vista: 'orbe', color: 0xffa040, vel: 65, giro: 0.6, danio: 10, racimo: 1.3 + k * 0.25 }); }
      mensajeRadio('⚠ ¡Bombas de racimo!', 1.2);
    }
    // Cañón de cola
    tCola -= dt;
    if (tCola <= 0 && distJefe(j) < 320) {
      tCola = f2 ? 0.8 : 1.2;
      _jc.copy(g.position).addScaledVector(j.dir, -10);
      dispararAlJugador(_jc, { vel: 100, danio: 7, color: 0xff7a3a }, 0.05); Sonido.sfx.disparoEnemigo();
    }
    if (!f2 && casco.vida < casco.vidaMax * 0.5) {
      j.fase = 2;
      anunciarFase(j, '¡El Fénix B-99 llama\na sus escuadrones!', 'Derriba el bombardero (cuidado con los cazas)');
    }
    if (j.fase === 2) {
      tEscuadron -= dt;
      if (tEscuadron <= 0) {
        tEscuadron = 11;
        if (contarEnemigosJefe('caza') < 6) for (let k = 0; k < 3; k++) generarDesdeJefe('caza', g.position, 18);
      }
    }
  };
  return j;
}

// ---------------------------------------------------------------------
// JEFE MILITAR 3: ALMIRANTE ÍCARO — duelo de maniobras contra un as
//   Fase 1: persecuciones y pasadas, esquiva cuando le apuntas
//   Fase 2 (<50%): modo prototipo, más rápido y con misiles
// ---------------------------------------------------------------------
function crearJefeIcaro() {
  const g = crearModeloAlmiranteIcaro(), u = g.userData;
  const j = { grupo: g, dir: V3(0, 0, 1), partes: [], frase: 'Almirante Ícaro: "Solo uno de nosotros saldrá vivo de este duelo."', objetivo: 'Derrota al as enemigo' };
  const casco = parte('casco', u.cuerpo, 5.5, 950);
  j.partes.push(casco);
  const frases = ['Ícaro: "¿Eso es todo lo que tienes?"', 'Ícaro: "¡Demasiado lento!"', 'Ícaro: "Te tengo en la mira..."', 'Ícaro: "¡Por la Tierra!"'];
  let modo = 'ataque', tModo = 6, tEvasion = 0, evadiendo = 0, giroEv = 0, rafaga = 0, tEntre = 0, tRafaga = 1.5, tMisiles = 5, tFrase = 8, tBengala = 0;
  const evDir = V3();
  j.actualizar = (dt) => {
    const f2 = j.fase === 2, J = jugador;
    const velBase = f2 ? 72 : 56;
    tModo -= dt;
    if (tModo <= 0) { modo = modo === 'ataque' ? 'pasada' : 'ataque'; tModo = modo === 'ataque' ? rand(5, 7) : rand(2.5, 3.5); }
    const dist = distJefe(j);
    if (modo === 'ataque') {
      if (dist > 90) _ja.copy(J.pos);
      else _ja.copy(J.pos).addScaledVector(J.fwd, -55).addScaledVector(J.der, Math.sin(j.t) * 20);
    } else _ja.copy(g.position).addScaledVector(j.dir, 100).addScaledVector(ARRIBA, 20);
    if (g.position.length() > CONFIG.ARENA - 40) _ja.set(0, 0, 0);
    _jb.subVectors(_ja, g.position).normalize();
    jefeMirarDir(j, _jb, dt, f2 ? 2.6 : 2.0);
    g.position.addScaledVector(j.dir, velBase * (modo === 'pasada' ? 1.3 : 1) * dt);
    // Evasión cuando el jugador le apunta
    tEvasion -= dt;
    _jc.subVectors(g.position, J.pos).normalize();
    if (tEvasion <= 0 && _jc.dot(J.fwd) > 0.985 && dist < 320) {
      evadiendo = 0.6; tEvasion = f2 ? 1.4 : 2.4;
      evDir.copy(J.der).multiplyScalar(Math.random() < 0.5 ? -1 : 1).addScaledVector(ARRIBA, rand(-0.5, 0.5)).normalize();
    }
    if (evadiendo > 0) { evadiendo -= dt; g.position.addScaledVector(evDir, 70 * dt); giroEv += dt * 12; }
    else giroEv = lerp(giroEv, 0, 1 - Math.exp(-dt * 5));
    u.nave.rotation.z = giroEv;
    limitarArena(g.position);
    // Ráfagas cuando te tiene enfrente
    tRafaga -= dt;
    if (tRafaga <= 0 && dist < 260 && j.dir.dot(_jc.negate()) > 0.93) { tRafaga = f2 ? 1.0 : 1.6; rafaga = 3; }
    if (rafaga > 0) {
      tEntre -= dt;
      if (tEntre <= 0) { tEntre = 0.08; rafaga--; _ja.copy(g.position).addScaledVector(j.dir, 5); dispararAlJugador(_ja, { vel: 130, danio: 7, color: 0xffd27a }, 0.03); Sonido.sfx.disparoEnemigo(); }
    }
    if (f2) {
      tMisiles -= dt;
      if (tMisiles <= 0) { tMisiles = 5; for (const s of [-1, 1]) { _ja.copy(g.position).addScaledVector(j.dir, 2).add(_jb.set(s * 3, -1, 0)); lanzarMisilEnemigo(_ja, j.dir, { vel: 70, giro: 1.6, danio: 12 }); } }
    }
    // NUEVO: bengalas que desvían tus misiles
    tBengala -= dt;
    if (tBengala <= 0) {
      let desvio = false;
      for (const m of misiles.items) if (m.activo && m.dueno === 'jugador' && m.grupo.position.distanceTo(g.position) < 70) { m.objetivo = null; m.tBuscar = 1.5; m.dir.add(vecAleatorio(_ja, 1.2)).normalize(); desvio = true; }
      if (desvio) {
        tBengala = f2 ? 3.5 : 5.5;
        for (let k = 0; k < 10; k++) { vecAleatorio(_ja, rand(10, 25)); Particulas.emitirVel(g.position, _ja, 0xffd27a, 1.2); }
        mensajeRadio('Ícaro lanza bengalas: ¡tus misiles se desvían!', 2); Sonido.sfx.teletransporte();
      }
    }
    tFrase -= dt;
    if (tFrase <= 0) { tFrase = rand(10, 15); mensajeRadio(frases[Math.floor(Math.random() * frases.length)], 2.5); }
    if (!f2 && casco.vida < casco.vidaMax * 0.5) {
      j.fase = 2;
      u.motores.forEach((m) => (m.material = matLuz(0xff4d4d, 0.95)));
      anunciarFase(j, '¡Ícaro activa el\nMODO PROTOTIPO!', 'Sigue presionando al as');
      mensajeRadio('Ícaro: "¡Ahora vas a ver de lo que soy capaz!"', 3);
    }
  };
  return j;
}

// ---------------------------------------------------------------------
// JEFE MILITAR 4: TITÁN AEGIS — portaaviones con escudo de energía
//   Fase 1: escudo activo (destruye los 3 generadores), lanza cazas
//   Fase 2: casco vulnerable, cañón pesado que se carga
//   Fase 3 (<30%): sobrecarga del reactor, ataques más rápidos
// ---------------------------------------------------------------------
function crearJefeAegis() {
  const g = crearModeloTitanAegis(), u = g.userData;
  const j = { grupo: g, dir: V3(0, 0, 1), partes: [], frase: 'Titán Aegis: "Escudo al 100 %. Ninguna nave alienígena pasará."', objetivo: 'Destruye los 3 generadores del escudo' };
  const gens = u.generadores.map((m, i) => parte('gen' + i, m, 3, 170, { ocultar: true, tDisp: 1 + i * 0.6 }));
  const escudo = parte('escudo', u.escudo, 27, Infinity, { inmune: true });
  const casco = parte('casco', u.casco, 9, 1600, { inmune: true });
  j.partes.push(...gens, escudo, casco,
    parte('proa', u.proa, 7, 0, { redirigir: casco, cuenta: false }),
    parte('popa', u.popa, 7, 0, { redirigir: casco, cuenta: false }));
  let tLanzar = 4, tFlak = 3, tCanon = 6, cargando = false, tMis = 4, tRayo = 9;
  j.actualizar = (dt) => {
    u.anilloGens.rotation.y += dt * 0.4;
    u.escudo.rotation.y += dt * 0.1;
    const dist = distJefe(j);
    if (dist > 220) jefeMoverHacia(j, jugador.pos, 10, dt);
    jefeMirar(j, jugador.pos, dt, 0.25);
    // Generadores
    for (const p of gens) {
      if (!p.activa) continue;
      p.malla.rotation.y += dt * 2;
      p.tDisp -= dt;
      if (p.tDisp <= 0 && dist < 360) { p.tDisp = 2.2; dispararAlJugador(p.posMundo, { vel: 90, danio: 6, color: 0x66ccff }, 0.05); }
    }
    // Hangar: lanza cazas
    tLanzar -= dt;
    if (tLanzar <= 0) {
      tLanzar = j.fase === 1 ? 9 : 8;
      if (contarEnemigosJefe('caza') < 5) { _jc.copy(g.position).addScaledVector(j.dir, 10).addScaledVector(ARRIBA, 6); for (let k = 0; k < 2; k++) generarDesdeJefe('caza', _jc, 6); }
    }
    // Antiaéreo
    tFlak -= dt;
    if (tFlak <= 0 && dist < 320) { tFlak = j.fase === 3 ? 1.4 : j.fase === 2 ? 2.5 : 3; _jc.copy(g.position).addScaledVector(ARRIBA, 5); rafagaCono(_jc, 10, 0.3, { vel: 85, danio: 6, color: 0x8fd0ff }); }
    if (j.fase === 1 && gens.every((p) => !p.activa)) {
      j.fase = 2; escudo.activa = false; u.escudo.visible = false; casco.inmune = false;
      Sonido.sfx.escudoRoto();
      anunciarFase(j, '¡Escudo de energía destruido!', 'Destruye el casco del Titán');
    }
    if (j.fase >= 2) {
      // NUEVO: rayo de barrido horizontal (súbete o bájate para esquivarlo)
      tRayo -= dt;
      if (tRayo <= 0 && dist < 380) {
        tRayo = j.fase === 3 ? 7 : 10;
        crearRayo({ origenFn: (o) => u.proa.getWorldPosition(o), dir: _jb.subVectors(jugador.pos, u.proa.getWorldPosition(_ja)).normalize(), largo: 420, carga: 1.2, dur: 2.4, ancho: 3, danio: 16, barrido: 1.5, color: 0x66ccff, vivo: () => juego.jefe === j && !j.muriendo });
        mensajeRadio('⚠ ¡Rayo de barrido! Sube o baja para esquivarlo', 2); Sonido.sfx.laserCarga();
      }
      // Cañón pesado con carga
      tCanon -= dt;
      if (!cargando && tCanon <= 1.5) { cargando = true; u.carga.visible = true; Sonido.sfx.cargaCanon(); mensajeRadio('⚠ ¡El cañón pesado se está cargando!', 1.5); }
      if (cargando) u.carga.scale.setScalar(0.3 + (1.5 - Math.max(0, tCanon)) * 0.9);
      if (tCanon <= 0) {
        cargando = false; u.carga.visible = false; tCanon = j.fase === 3 ? 4.5 : 6;
        u.carga.getWorldPosition(_jc);
        dispararAlJugador(_jc, { vel: 75, danio: 25, color: 0x66ccff, tam: 3.5, vida: 6 });
        Sonido.sfx.misil();
      }
      if (j.fase === 2 && casco.vida < casco.vidaMax * 0.3) {
        j.fase = 3;
        anunciarFase(j, '¡SOBRECARGA DEL REACTOR!', 'Remata al Titán Aegis');
      }
      if (j.fase === 3) {
        tMis -= dt;
        if (tMis <= 0) { tMis = 4; _jc.copy(g.position).addScaledVector(ARRIBA, 6); for (let k = 0; k < 3; k++) lanzarMisilEnemigo(_jc, vecAleatorio(_jb, 1).add(ARRIBA), { vel: 62, giro: 1.3, danio: 12 }); }
      }
    }
  };
  return j;
}

// ---------------------------------------------------------------------
// JEFE ALIENÍGENA 1: LA REINA COLMENA — nave-nido
//   Fase 1: suelta enjambres; si pierde muchos o baja al 50 %, se enfurece
//   Fase 2: furia, más crías, más esporas y se acerca al jugador
// ---------------------------------------------------------------------
function crearJefeReina() {
  const g = crearModeloReinaColmena(), u = g.userData;
  const j = { grupo: g, dir: V3(0, 0, 1), partes: [], frase: 'La Reina Colmena: "Mis hijos cubrirán tu cielo..."', objetivo: 'Destruye la nave-nido (sus crías la enfurecen)', enjambresPerdidos: 0 };
  const cuerpo = parte('cuerpo', u.cuerpo, 13, 1250);
  j.partes.push(cuerpo);
  let tCria = 2, tEsporas = 3, furia = false, tHuevos = 6;
  j.actualizar = (dt) => {
    g.rotation.y += dt * (furia ? 0.6 : 0.2);
    u.poros.forEach((p, i) => p.scale.setScalar(0.8 + Math.sin(j.t * (furia ? 8 : 3) + i) * 0.35));
    const dist = distJefe(j);
    if (furia && dist > 90) jefeMoverHacia(j, jugador.pos, 20, dt);
    else if (dist > 260) jefeMoverHacia(j, jugador.pos, 12, dt);
    tCria -= dt;
    if (tCria <= 0) {
      tCria = furia ? 2.6 : 5;
      const vivos = contarEnemigosJefe('enjambre'), n = furia ? 5 : 4;
      for (let k = 0; k < n && vivos + k < 14; k++) generarDesdeJefe('enjambre', g.position, 16);
    }
    // NUEVO: huevos que se abren si no los destruyes a tiempo
    tHuevos -= dt;
    if (tHuevos <= 0) {
      tHuevos = furia ? 7 : 10;
      for (let k = 0; k < (furia ? 4 : 3); k++) { _jb.subVectors(jugador.pos, g.position).normalize().multiplyScalar(30).add(vecAleatorio(_ja, 25)); soltarMina(cuerpo.posMundo, { huevo: true, vel: _jb, vida: 6 }); }
      mensajeRadio('⚠ ¡Huevos! Destrúyelos antes de que se abran', 2);
    }
    tEsporas -= dt;
    if (tEsporas <= 0 && dist < 330) { tEsporas = furia ? 2 : 4; rafagaCono(cuerpo.posMundo, furia ? 14 : 10, 0.4, { vel: 60, danio: 7, color: 0xd4ff3a, tam: 1.5 }); }
    if (!furia && (cuerpo.vida < cuerpo.vidaMax * 0.5 || j.enjambresPerdidos >= 16)) {
      furia = true; j.fase = 2;
      u.cuerpoMat.color.setHex(0xb8402a); u.cuerpoMat.emissive.setHex(0x5a0a05);
      Sonido.sfx.rugidoJefe();
      anunciarFase(j, '¡LA REINA COLMENA\nSE ENFURECE!', 'Destrúyela antes de que te rodee');
    }
  };
  return j;
}

// ---------------------------------------------------------------------
// JEFE ALIENÍGENA 2: DEVORADOR DE MUNDOS — criatura con tentáculos
//   Siempre: absorbe y devuelve los misiles; succiona al jugador
//   Fase 2 (<50%): frenesí con anillos de energía y escupitajos guiados
// ---------------------------------------------------------------------
function crearJefeDevorador() {
  const g = crearModeloDevorador(), u = g.userData;
  const j = { grupo: g, dir: V3(0, 0, 1), partes: [], reflejaMisiles: true, frase: 'Devorador de Mundos: *un rugido hace vibrar el vacío*', objetivo: 'Destruye a la criatura (no le dispares misiles)' };
  const cabeza = parte('cabeza', u.cabeza, 11, 1500);
  j.partes.push(cabeza);
  let ang = Math.random() * 6, tTent = 1, iTent = 0, tInhalar = 7, inhalando = 0, tAnillo = 3, tEscupir = 5, tRoca = 4;
  j.actualizar = (dt) => {
    const f2 = j.fase === 2, J = jugador;
    // Animación de tentáculos
    for (const tn of u.tentaculos) {
      const cx = Math.cos(tn.ang), cy = Math.sin(tn.ang);
      tn.segs.forEach((s, i) => {
        const ond = Math.sin(j.t * (f2 ? 3.5 : 2.2) + i * 0.7 + tn.fase) * i * 0.6;
        s.position.set(cx * i * 2.2 - cy * ond, cy * i * 2.2 + cx * ond, -i * 1.8);
      });
    }
    u.garganta.scale.setScalar(1 + Math.sin(j.t * 4) * 0.15 + (inhalando > 0 ? 0.4 : 0));
    ang += dt * 0.12;
    puntoOrbita(ang, 140, Math.sin(j.t * 0.4) * 30, _ja); limitarArena(_ja);
    jefeMoverHacia(j, _ja, inhalando > 0 ? 6 : 22, dt);
    jefeMirar(j, J.pos, dt, 1.5);
    const dist = distJefe(j);
    // Disparos desde la punta de los tentáculos
    tTent -= dt;
    if (tTent <= 0 && dist < 340) {
      tTent = f2 ? 0.35 : 0.55;
      const tn = u.tentaculos[iTent++ % u.tentaculos.length];
      tn.segs[tn.segs.length - 1].getWorldPosition(_jc);
      dispararAlJugador(_jc, { vel: 90, danio: 7, color: 0xff5588, tam: 1.2 }, 0.08);
      Sonido.sfx.disparoEnemigo();
    }
    // NUEVO: escupe asteroides gigantes
    tRoca -= dt;
    if (tRoca <= 0 && dist < 380 && inhalando <= 0) {
      tRoca = f2 ? 3.5 : 5;
      u.garganta.getWorldPosition(_jc);
      _jb.copy(J.pos).addScaledVector(J.velVec, 0.8).sub(_jc).normalize().multiplyScalar(f2 ? 85 : 70);
      lanzarMeteorito(_jc, _jb, f2 ? 7 : 6, { vida: 7, danio: 22 });
    }
    // Succión
    tInhalar -= dt;
    if (tInhalar <= 0 && inhalando <= 0) {
      inhalando = 2.5; tInhalar = f2 ? 7 : 9;
      mostrarMensaje('¡TE ESTÁ ABSORBIENDO!\nAcelera para escapar', 1.8); Sonido.sfx.rugidoJefe();
    }
    if (inhalando > 0) {
      inhalando -= dt;
      _jb.subVectors(g.position, J.pos);
      const d = _jb.length(); _jb.normalize();
      if (J.vivo) J.pos.addScaledVector(_jb, (f2 ? 36 : 28) * dt);
      _jc.copy(J.pos).addScaledVector(vecAleatorio(_ja, 1), 12);
      _ja.subVectors(g.position, _jc).multiplyScalar(1.4);
      Particulas.emitirVel(_jc, _ja, 0xff88aa, 0.7);
      if (d < 26 && J.tChoque <= 0) { danarJugador(12); J.tChoque = 0.6; }
    }
    if (!f2 && cabeza.vida < cabeza.vidaMax * 0.5) {
      j.fase = 2; u.piel.emissive.setHex(0x40081c);
      anunciarFase(j, '¡EL DEVORADOR ENTRA\nEN FRENESÍ!', 'Esquiva sus anillos de energía');
    }
    if (j.fase === 2) {
      tAnillo -= dt;
      if (tAnillo <= 0 && dist < 330) { tAnillo = 3.2; u.garganta.getWorldPosition(_jc); rafagaCono(_jc, 20, 0.6, { vel: 70, danio: 7, color: 0xff5588, centro: false }); }
      tEscupir -= dt;
      if (tEscupir <= 0) { tEscupir = 5; u.garganta.getWorldPosition(_jc); lanzarMisilEnemigo(_jc, j.dir, { vista: 'orbe', color: 0xff5588, vel: 55, giro: 1.4, danio: 12 }); }
    }
  };
  return j;
}

// ---------------------------------------------------------------------
// JEFE ALIENÍGENA 3: ORÁCULO VACÍO — nave psíquica
//   Fase 1: orbes guiados e inversión de controles
//   Fase 2 (<50%): crea naves falsas (ilusiones) y se teletransporta
// ---------------------------------------------------------------------
function crearJefeOraculo() {
  const g = crearModeloOraculo(), u = g.userData;
  const j = { grupo: g, dir: V3(0, 0, 1), partes: [], frase: 'Oráculo Vacío: "Ya vi tu derrota... en mil futuros distintos."', objetivo: 'Destruye al Oráculo' };
  const cuerpo = parte('cuerpo', u.cuerpo, 8.5, 1350);
  j.partes.push(cuerpo);
  let tOrbes = 2.5, tInversion = 9, tTele = 7, tSenuelos = 0, tRayo = 5;
  function crearSenuelos() {
    for (let k = 0; k < 3; k++) {
      if (contarEnemigosJefe('senuelo') >= 3) break;
      const e = generarDesdeJefe('senuelo', g.position, 40);
      e.fase = k * 2.1;
    }
  }
  j.actualizar = (dt) => {
    const f2 = j.fase === 2, J = jugador;
    u.anillos[0].rotation.z += dt * 1.1;
    u.anillos[1].rotation.y += dt * 0.8;
    g.position.y += Math.sin(j.t * 1.5) * dt * 3;
    const dist = distJefe(j);
    if (dist > 200) jefeMoverHacia(j, J.pos, 30, dt);
    else if (dist < 100) { _ja.subVectors(g.position, J.pos).normalize().multiplyScalar(30).add(g.position); jefeMoverHacia(j, _ja, 30, dt); }
    limitarArena(g.position);
    jefeMirar(j, J.pos, dt, 2);
    tOrbes -= dt;
    if (tOrbes <= 0 && dist < 380) {
      tOrbes = f2 ? 2.2 : 3;
      u.ojo.getWorldPosition(_jc);
      for (let k = 0; k < (f2 ? 2 : 1); k++) {
        _jb.copy(j.dir).addScaledVector(vecAleatorio(_ja, 1), 0.5);
        lanzarMisilEnemigo(_jc, _jb, { vista: 'orbe', color: 0xc061ff, vel: 45, giro: 1.3, vida: 7, danio: 12 });
      }
    }
    // NUEVO: rayo psíquico que barre la zona
    tRayo -= dt;
    if (tRayo <= 0 && dist < 380) {
      tRayo = f2 ? 6 : 8;
      crearRayo({ origenFn: (o) => u.ojo.getWorldPosition(o), dir: _jb.subVectors(J.pos, u.ojo.getWorldPosition(_ja)).normalize(), largo: 420, carga: 1.0, dur: 2.2, ancho: 2.6, danio: 15, barrido: 1.4, color: 0xd06bff, vivo: () => juego.jefe === j && !j.muriendo });
      Sonido.sfx.laserCarga();
    }
    tInversion -= dt;
    if (tInversion <= 0) {
      tInversion = f2 ? 9 : 12;
      J.invertidoT = 4.5;
      Sonido.sfx.psiquico();
      mostrarMensaje('¡INTERFERENCIA PSÍQUICA!', 1.6);
    }
    if (!f2 && cuerpo.vida < cuerpo.vidaMax * 0.5) {
      j.fase = 2;
      anunciarFase(j, '¡EL ORÁCULO CREA\nNAVES FALSAS!', 'Encuentra al Oráculo real (tiene barra de vida)');
      crearSenuelos();
    }
    if (j.fase === 2) {
      tTele -= dt;
      if (tTele <= 0) {
        tTele = 7;
        explosion(g.position, 10, 0xc061ff);
        puntoOrbita(Math.random() * Math.PI * 2, rand(130, 180), rand(-40, 40), g.position); limitarArena(g.position);
        explosion(g.position, 10, 0xc061ff);
        Sonido.sfx.teletransporte();
      }
      tSenuelos -= dt;
      if (tSenuelos <= 0) { tSenuelos = 15; crearSenuelos(); }
    }
  };
  return j;
}

// ---------------------------------------------------------------------
// JEFE ALIENÍGENA 4: EMPERADOR ZORGON — jefe final de 3 fases
//   Fase 1 ESCUDO: destruye los 3 orbes que lo protegen
//   Fase 2 ARMAS: destruye los 2 cañones de sus brazos
//   Fase 3 NÚCLEO EXPUESTO: espirales de energía y kamikazes
// ---------------------------------------------------------------------
function crearJefeZorgon() {
  const g = crearModeloZorgon(), u = g.userData;
  const j = { grupo: g, dir: V3(0, 0, 1), partes: [], frase: 'Emperador Zorgon: "Arrodíllate ante el trono de Zorgon, terrícola."', objetivo: 'FASE 1: destruye los 3 orbes del escudo' };
  const orbes = u.orbes.map((m, i) => parte('orbe' + i, m, 3, 200, { ocultar: true, tDisp: 1 + i * 0.5 }));
  const escudo = parte('escudo', u.escudo, 22, Infinity, { inmune: true });
  const canones = u.canones.map((c, i) => parte('canon' + i, c, 4.2, 380, { inmune: true, ocultar: true }));
  const nucleo = parte('nucleo', u.nucleo, 5, 1100, { inmune: true });
  const cuerpo = parte('cuerpo', u.cuerpo, 10.5, Infinity, { inmune: true });
  j.partes.push(...orbes, escudo, ...canones, nucleo, cuerpo);
  let tCono = 3, tCanon = 1.3, iCanon = 0, tSalva = 6, angEsp = 0, tEsp = 0, tKami = 5, tNucleo = 1.5, ang = 0, tAnilloMinas = 8, tLluvia = 15;
  j.actualizar = (dt) => {
    const J = jugador;
    u.orbita.rotation.y += dt * 0.7;
    u.escudo.rotation.y -= dt * 0.2;
    const dist = distJefe(j);
    if (j.fase < 3) { if (dist > 200) jefeMoverHacia(j, J.pos, 18, dt); }
    else { ang += dt * 0.35; puntoOrbita(ang, 115, Math.sin(j.t * 0.5) * 30, _ja); limitarArena(_ja); jefeMoverHacia(j, _ja, 40, dt); }
    jefeMirar(j, J.pos, dt, j.fase === 3 ? 1.6 : 1);
    // NUEVO: anillo de minas y lluvia de meteoritos invocada
    tAnilloMinas -= dt;
    if (tAnilloMinas <= 0) {
      tAnilloMinas = 16;
      for (let k = 0; k < 10; k++) { const a = k * Math.PI / 5; _jc.set(g.position.x + Math.cos(a) * 48, g.position.y + rand(-8, 8), g.position.z + Math.sin(a) * 48); soltarMina(_jc, { vida: 30 }); }
      mensajeRadio('⚠ Zorgon crea un anillo de minas', 1.8);
    }
    if (j.fase >= 2) { tLluvia -= dt; if (tLluvia <= 0 && !juego.evento) { tLluvia = 22; iniciarEvento('meteoritos'); } }
    if (j.fase === 1) {
      tCono -= dt;
      if (tCono <= 0 && dist < 340) { tCono = 3; _jc.copy(g.position).addScaledVector(j.dir, 12); rafagaCono(_jc, 10, 0.35, { vel: 80, danio: 7, color: 0x33ddff }); }
      for (const p of orbes) {
        if (!p.activa) continue;
        p.malla.rotation.x += dt * 2;
        p.tDisp -= dt;
        if (p.tDisp <= 0 && dist < 380) { p.tDisp = 2; dispararAlJugador(p.posMundo, { vel: 90, danio: 6, color: 0x33ddff }, 0.05); }
      }
      if (orbes.every((p) => !p.activa)) {
        j.fase = 2; escudo.activa = false; u.escudo.visible = false; canones.forEach((c) => (c.inmune = false));
        Sonido.sfx.escudoRoto();
        anunciarFase(j, '¡ESCUDO DESTRUIDO!\nZorgon activa sus cañones', 'FASE 2: destruye los cañones de los brazos');
      }
    } else if (j.fase === 2) {
      tCanon -= dt;
      if (tCanon <= 0) {
        tCanon = 1.3;
        const vivos = canones.filter((c) => c.activa);
        if (vivos.length) {
          const c = vivos[iCanon++ % vivos.length];
          c.malla.children[2].getWorldPosition(_jc);
          for (let k = 0; k < 4; k++) dispararAlJugador(_jc, { vel: 110, danio: 9, color: 0xff2a8a, tam: 1.4 }, 0.05);
          Sonido.sfx.disparoEnemigo();
        }
      }
      tSalva -= dt;
      if (tSalva <= 0) { tSalva = 6; _jc.copy(g.position).addScaledVector(ARRIBA, 8); for (let k = 0; k < 4; k++) lanzarMisilEnemigo(_jc, vecAleatorio(_jb, 1).add(j.dir), { vista: 'orbe', color: 0xff2a8a, vel: 55, giro: 1.3, danio: 12 }); }
      if (canones.every((c) => !c.activa)) {
        j.fase = 3; nucleo.inmune = false; u.placas.forEach((p) => (p.visible = false));
        Sonido.sfx.rugidoJefe();
        anunciarFase(j, '¡NÚCLEO EXPUESTO!', 'FASE 3: ¡destruye el núcleo de Zorgon!');
      }
    } else {
      // Espiral de energía
      angEsp += dt * 2.2; tEsp -= dt;
      if (tEsp <= 0) {
        tEsp = 0.18;
        for (let k = 0; k < 3; k++) {
          const a = angEsp + k * Math.PI * 2 / 3;
          _jb.set(Math.cos(a), clamp((J.pos.y - g.position.y) / 200, -0.4, 0.4), Math.sin(a));
          dispararEnemigo(nucleo.posMundo, _jb, { vel: 55, danio: 6, color: 0xff2a8a, vida: 3.5 });
        }
      }
      tNucleo -= dt;
      if (tNucleo <= 0 && dist < 300) { tNucleo = 1.5; for (let k = 0; k < 3; k++) dispararAlJugador(nucleo.posMundo, { vel: 120, danio: 8, color: 0xffffff }, 0.05); Sonido.sfx.disparoEnemigo(); }
      tKami -= dt;
      if (tKami <= 0) { tKami = 7; if (contarEnemigosJefe('kamikaze') < 6) for (let k = 0; k < 3; k++) generarDesdeJefe('kamikaze', g.position, 20); }
    }
  };
  return j;
}

// ---------------------------------------------------------------------
// Catálogo de jefes y lógica común
// ---------------------------------------------------------------------
const JEFES = {
  coloso:    { nombre: 'COLOSO ORBITAL', crear: crearJefeColoso },
  fenix:     { nombre: 'FÉNIX B-99', crear: crearJefeFenix },
  icaro:     { nombre: 'ALMIRANTE ÍCARO', crear: crearJefeIcaro },
  aegis:     { nombre: 'TITÁN AEGIS', crear: crearJefeAegis },
  reina:     { nombre: 'LA REINA COLMENA', crear: crearJefeReina },
  devorador: { nombre: 'DEVORADOR DE MUNDOS', crear: crearJefeDevorador },
  oraculo:   { nombre: 'ORÁCULO VACÍO', crear: crearJefeOraculo },
  zorgon:    { nombre: 'EMPERADOR ZORGON', crear: crearJefeZorgon }
};

function crearJefe(id) {
  const def = JEFES[id], j = def.crear();
  const fv = juego.modo === 'infinito' ? 0.5 * (1 + 0.3 * (juego.jefesInfinito || 0)) : 1.35 * (1 + 0.12 * (juego.nivel - 1)) * juego.D.jefe;
  for (const p of j.partes) if (isFinite(p.vidaMax) && p.vidaMax > 0) { p.vidaMax = Math.round(p.vidaMax * fv); p.vida = p.vidaMax; }
  j.id = id; j.nombre = def.nombre; j.t = 0; j.fase = 1; j.muriendo = false; j.entrada = 0;
  const g = j.grupo;
  g.position.copy(jugador.pos).addScaledVector(jugador.fwd, 260);
  if (juego.modo !== 'infinito' && g.position.length() > CONFIG.ARENA * 0.75) g.position.setLength(CONFIG.ARENA * 0.75);
  g.position.y = clamp(g.position.y, -CONFIG.ALTURA * 0.6, CONFIG.ALTURA * 0.6);
  j.dir.subVectors(jugador.pos, g.position).normalize();
  _ja.copy(g.position).add(j.dir); g.lookAt(_ja);
  g.scale.setScalar(0.05);
  escena.add(g);
  j.vidaTotal = j.partes.reduce((s, p) => s + (p.cuenta ? p.vidaMax : 0), 0);
  juego.jefe = j;
  explosion(g.position, 30, 0xffffff);
  E('jefeNombre').textContent = j.nombre;
  mostrarElem('jefeCaja', true);
  Sonido.sfx.rugidoJefe();
  mensajeRadio(j.frase, 4.5);
}

function actualizarJefe(dt) {
  const j = juego.jefe; if (!j) return;
  j.t += dt;
  if (juego.modo === 'infinito') j.grupo.position.z += juego.avanceZ;   // el jefe acompaña al corredor
  if (j.entrada < 1) {
    j.entrada = Math.min(1, j.entrada + dt / 1.4);
    const k = j.entrada, s = 1 + 2.2 * Math.pow(k - 1, 3) + 1.2 * Math.pow(k - 1, 2);
    j.grupo.scale.setScalar(Math.max(0.05, s));
  }
  if (j.muriendo) { actualizarMuerteJefe(dt); return; }
  if (j.entrada >= 1) {
    // FURIA: si tardas más de 80 s, el jefe ataca 40 % más rápido
    if (!j.furioso && j.t > 80) { j.furioso = true; mostrarMensaje('😡 ¡' + j.nombre + '\nSE ENFURECE!', 2.5); Sonido.sfx.rugidoJefe(); }
    j.actualizar(j.furioso ? dt * 1.4 : dt);
  } else jefeMirar(j, jugador.pos, dt, 1);
  j.grupo.updateMatrixWorld(true);
  for (const p of j.partes) p.malla.getWorldPosition(p.posMundo);
  // El jugador no puede atravesar al jefe
  const J = jugador;
  if (J.vivo && j.entrada >= 1) {
    for (const p of j.partes) {
      if (!p.activa) continue;
      _ja.subVectors(J.pos, p.posMundo);
      const d = _ja.length(), r = p.radio + 2 * J.escalaVis;
      if (d < r) {
        J.pos.copy(p.posMundo).addScaledVector(_ja, r / (d || 1));
        if (J.tChoque <= 0) {
          if (J.poderes.gigante > 0) {   // la nave gigante embiste al jefe
            const t = p.redirigir || p;
            if (!t.inmune && t.activa) danarParte(t, 45);
            J.tChoque = 0.4; juego.sacudida = Math.min(1, juego.sacudida + 0.4);
          } else { danarJugador(8); J.tChoque = 0.8; }
        }
        if (j.muriendo) break;
      }
    }
  }
}

function danarParte(p, cant) {
  const j = juego.jefe;
  if (!j || !p.activa || j.muriendo) return;
  p.vida -= cant;
  Sonido.sfx.impacto();
  if (p.vida <= 0) {
    p.vida = 0; p.activa = false;
    explosion(p.posMundo, Math.max(6, p.radio * 2.2), 0xffaa44);
    Sonido.sfx.explosionPequena();
    juego.sacudida = Math.min(1.2, juego.sacudida + 0.4);
    if (p.ocultar) p.malla.visible = false;
    sumarPuntos(250);
    if (p.alDestruir) p.alDestruir();
  }
  if (j.partes.every((q) => !q.cuenta || q.vida <= 0)) iniciarMuerteJefe();
}

function iniciarMuerteJefe() {
  const j = juego.jefe;
  j.muriendo = true; j.tMuerte = 0; j.tExp = 0;
  juego.fase = 'muerteJefe'; juego.tFase = 0;
  mostrarMensaje('¡' + j.nombre + '\nDESTRUIDO!', 3);
  mostrarElem('jefeCaja', false);
  Sonido.sfx.explosionGrande();
  for (const e of enemigos) if (e.activo) { explosion(e.pos, e.radio * 2, 0xffaa44); e.activo = false; e.modelo.visible = false; }
  for (const b of balasE.items) if (b.activo) { b.activo = false; b.malla.visible = false; }
  for (const m of misiles.items) if (m.activo && m.dueno === 'enemigo') desactivarMisil(m);
  jugador.invertidoT = 0;
  sumarPuntos(2000 * juego.nivel);
}

function actualizarMuerteJefe(dt) {
  const j = juego.jefe;
  j.tMuerte += dt; j.tExp -= dt;
  j.grupo.rotation.z += dt * 0.3;
  if (j.tExp <= 0) {
    j.tExp = 0.16;
    vecAleatorio(_ja, rand(4, 18)).add(j.grupo.position);
    explosion(_ja, rand(5, 10), Math.random() < 0.5 ? 0xffaa44 : 0xff5533);
    Sonido.sfx.explosionPequena();
    juego.sacudida = Math.min(1, juego.sacudida + 0.15);
  }
  if (j.tMuerte > 2.6) {
    explosion(j.grupo.position, 40, 0xffffff);
    explosion(j.grupo.position, 28, 0xffaa44);
    Sonido.sfx.explosionGrande();
    juego.sacudida = 1.5;
    eliminarJefe();
    if (juego.modo === 'infinito') corredorJefeVencido(); else nivelCompletado();
  }
}

/** Quita el jefe de la escena y libera su memoria. */
function eliminarJefe() {
  const j = juego.jefe; if (!j) return;
  escena.remove(j.grupo);
  j.grupo.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material && !MAT_COMPARTIDOS.has(o.material)) o.material.dispose();
  });
  juego.jefe = null;
  mostrarElem('jefeCaja', false);
}

// =====================================================================
// 16b. PODERES, CÁPSULAS, ALIADOS, RACHAS Y MEJORAS DE LA NAVE
// =====================================================================

// ---------- Mejoras permanentes que se eligen al superar un nivel ----------
// (una por cada nivel 1, 2 y 3 superado; se eligen entre 3 opciones al azar)
const MEJORAS_NAVE = {
  motor:        { icono: '🔥', nombre: 'Motor turbo', desc: '+20 % de velocidad' },
  canon:        { icono: '🔫', nombre: 'Cañón doble', desc: 'Empiezas cada nivel con el arma en nivel 2' },
  misiles:      { icono: '🚀', nombre: 'Misiles teledirigidos dobles', desc: 'El arma secundaria lanza el doble y hace +25 % de daño' },
  blindaje:     { icono: '🛡️', nombre: 'Blindaje reforzado', desc: '+30 de vida máxima' },
  escudo:       { icono: '🔷', nombre: 'Escudo ampliado', desc: '+30 de escudo máximo' },
  gatillo:      { icono: '⚡', nombre: 'Gatillo rápido', desc: 'Disparas 25 % más rápido' },
  amplificador: { icono: '✨', nombre: 'Amplificador', desc: 'Los poderes duran 40 % más y atraes las cápsulas desde más lejos' }
};

// ---------- Mejoras permanentes por bajas acumuladas (cada bando por separado) ----------
const MEJORAS_BAJAS = [
  { bajas: 50, id: 'vida', nombre: '+15 % de vida máxima' },
  { bajas: 150, id: 'misiles', nombre: '+2 de capacidad de misiles' },
  { bajas: 300, id: 'regen', nombre: 'El escudo se recarga más rápido' },
  { bajas: 500, id: 'esquiva', nombre: 'Doble esquiva' }
];
function tieneMejoraBajas(f, id) { const m = MEJORAS_BAJAS.find((x) => x.id === id); return (guardado.bajas[f] || 0) >= m.bajas; }
function tieneMejoraNave(f, id) { return (guardado.mejorasNave[f] || []).indexOf(id) >= 0; }

/** Estadísticas finales de la nave: valores base + todas las mejoras permanentes. */
function statsNave(f) {
  const S = STATS_JUGADOR[f], mN = (id) => tieneMejoraNave(f, id), mB = (id) => tieneMejoraBajas(f, id);
  return {
    vida: Math.round((S.vida + (mN('blindaje') ? 30 : 0)) * (mB('vida') ? 1.15 : 1)),
    escudo: S.escudo + (mN('escudo') ? 30 : 0),
    municion: S.municion + (mB('misiles') ? 2 : 0),
    vel: S.vel * (mN('motor') ? 1.2 : 1),
    cadencia: S.cadencia / (mN('gatillo') ? 1.25 : 1),
    nivelArma: mN('canon') ? 2 : 1,
    misilesDobles: mN('misiles'),
    multMisil: mN('misiles') ? 1.25 : 1,
    regen: mB('regen') ? 26 : 14,
    esquivas: mB('esquiva') ? 2 : 1,
    multPoder: mN('amplificador') ? 1.4 : 1,
    iman: mN('amplificador') ? 75 : 40
  };
}

/** Aviso emergente dorado (logros y mejoras). */
function avisoToast(icono, titulo, nombre) {
  const d = document.createElement('div');
  d.className = 'toast';
  d.innerHTML = '<span class="ico">' + icono + '</span><div><small>' + titulo + '</small><b>' + nombre + '</b></div>';
  $('toasts').appendChild(d);
  setTimeout(() => d.remove(), 4000);
  Sonido.sfx.logro();
}

/** Suma una baja al bando actual y aplica la mejora permanente si se alcanza un umbral. */
function contarBaja() {
  const f = juego.faccion, J = jugador;
  guardado.bajas[f] = (guardado.bajas[f] || 0) + 1;
  const m = MEJORAS_BAJAS.find((x) => x.bajas === guardado.bajas[f]);
  if (!m) return;
  const antes = J.st;
  J.st = statsNave(f);
  J.vidaMax = J.st.vida; J.vida = Math.min(J.vidaMax, J.vida + (J.st.vida - antes.vida));
  J.municionMax = J.st.municion;
  if (J.st.esquivas > antes.esquivas) J.cargasEsquiva++;
  avisoToast('⭐', 'MEJORA PERMANENTE · ' + m.bajas + ' BAJAS', m.nombre);
  guardar();
}

// ---------- Elegir mejora al superar un nivel ----------
function opcionesMejoraNave(f) {
  const libres = Object.keys(MEJORAS_NAVE).filter((id) => !tieneMejoraNave(f, id));
  for (let i = libres.length - 1; i > 0; i--) { const k = Math.floor(Math.random() * (i + 1)); const t = libres[i]; libres[i] = libres[k]; libres[k] = t; }
  return libres.slice(0, 3);
}
function elegirMejora(id) {
  if (!juego.mejoraPendiente) return;
  const f = juego.faccion;
  (guardado.mejorasNave[f] = guardado.mejorasNave[f] || []).push(id);
  juego.mejoraPendiente = false; juego.mejoraElegida = id;
  guardar();
  Sonido.sfx.logro();
  renderEligeMejora();
}
function renderEligeMejora() {
  const caja = $('eligeMejora'), btn = $('btnSiguiente');
  if (!juego.opcionesMejora || !juego.opcionesMejora.length) { caja.innerHTML = ''; btn.disabled = false; return; }
  if (!juego.mejoraPendiente) {
    const m = MEJORAS_NAVE[juego.mejoraElegida];
    caja.innerHTML = '<div class="mejora-ok">' + m.icono + ' Mejora instalada: <b>' + m.nombre + '</b></div>';
    btn.disabled = false; return;
  }
  caja.innerHTML = '<div class="titulo-mejora">ELIGE UNA MEJORA PERMANENTE PARA TU NAVE</div><div class="tarjetas-mejora">' +
    juego.opcionesMejora.map((id) => { const m = MEJORAS_NAVE[id]; return '<button class="opMejora" data-mejora="' + id + '"><span>' + m.icono + '</span><b>' + m.nombre + '</b><small>' + m.desc + '</small></button>'; }).join('') + '</div>';
  caja.querySelectorAll('[data-mejora]').forEach((b) => (b.onclick = () => elegirMejora(b.dataset.mejora)));
  btn.disabled = true;
}
/** Texto de mejoras para la pantalla de selección de bando. */
function textoMejoras(f) {
  const lista = (guardado.mejorasNave[f] || []).filter((id) => MEJORAS_NAVE[id]).map((id) => MEJORAS_NAVE[id].icono + ' ' + MEJORAS_NAVE[id].nombre);
  const b = guardado.bajas[f] || 0, sig = MEJORAS_BAJAS.find((m) => b < m.bajas);
  return 'Mejoras: ' + (lista.length ? lista.join(' · ') : 'ninguna todavía') +
    '<br>Bajas: ' + b + (sig ? ' · a las ' + sig.bajas + ': ' + sig.nombre : ' · todas las mejoras por bajas desbloqueadas');
}

// ---------- Poderes de las cápsulas ----------
// faccion: null = ambos bandos · dur: 0 = efecto instantáneo
const PODERES = {
  gigante: { icono: '💪', nombre: 'NAVE GIGANTE', color: 0xff8c2a, dur: 10, faccion: null },
  triple:  { icono: '🔱', nombre: 'DISPARO TRIPLE', color: 0xffe14d, dur: 12, faccion: null },
  escudo:  { icono: '🛡️', nombre: 'ESCUDO INVENCIBLE', color: 0x4dc3ff, dur: 8, faccion: null },
  lento:   { icono: '⏳', nombre: 'CÁMARA LENTA', color: 0xa8b8ff, dur: 8, faccion: null },
  drones:  { icono: '🤖', nombre: 'DRONES ESCOLTA', color: 0x66e0ff, dur: 20, faccion: 'tierra' },
  aereo:   { icono: '🎯', nombre: 'ATAQUE AÉREO', color: 0xff4d4d, dur: 0, faccion: 'tierra' },
  crias:   { icono: '🐝', nombre: 'CRÍAS DE LA COLMENA', color: 0x9dff55, dur: 20, faccion: 'alien' },
  mental:  { icono: '🧠', nombre: 'CONTROL MENTAL', color: 0xd06bff, dur: 0, faccion: 'alien' }
};

function activarPoder(id) {
  const P = PODERES[id], J = jugador;
  if (P.dur > 0) {
    J.poderes[id] = Math.max(J.poderes[id] || 0, P.dur * J.st.multPoder);
    if (id === 'drones') crearDrones();
    if (id === 'crias') crearCrias();
  } else if (!usarPoderInstantaneo(id)) {
    // No hay enemigos cerca: el poder queda guardado y se usa en cuanto aparezcan
    J.pendiente = id; J.tPendiente = 25; J.tReintento = 0.5;
    mensajeRadio(P.nombre + ' listo: se activará cuando haya enemigos cerca', 2.5);
  }
  mostrarMensaje(P.icono + ' ' + P.nombre, 1.8);
  Sonido.sfx.poder();
}
function usarPoderInstantaneo(id) {
  if (id === 'aereo') return ataqueAereo();
  if (id === 'mental') return controlMental();
  return false;
}

function actualizarPoderes(dt) {
  const J = jugador;
  for (const id in J.poderes) {
    if (J.poderes[id] > 0) {
      J.poderes[id] -= dt;
      if (J.poderes[id] <= 0) { J.poderes[id] = 0; mensajeRadio(PODERES[id].nombre + ' terminó', 1.5); }
    }
  }
  if (J.pendiente) {
    J.tPendiente -= dt; J.tReintento -= dt;
    if (J.tReintento <= 0) { J.tReintento = 0.5; if (usarPoderInstantaneo(J.pendiente)) { mostrarMensaje(PODERES[J.pendiente].icono + ' ' + PODERES[J.pendiente].nombre, 1.5); J.pendiente = null; } }
    if (J.tPendiente <= 0) J.pendiente = null;
  }
  // Nave gigante: crece y encoge suavemente
  J.escalaVis = lerp(J.escalaVis, J.poderes.gigante > 0 ? 3 : 1, 1 - Math.exp(-dt * 4));
  J.modelo.scale.setScalar(J.escalaVis);
  // Burbuja del escudo invencible (parpadea cuando se va a acabar)
  const e = J.poderes.escudo || 0;
  J.burbuja.visible = e > 0 && (e > 2 || Math.floor(e * 8) % 2 === 0);
  J.burbuja.scale.setScalar(J.escalaVis * (1 + Math.sin(performance.now() * 0.008) * 0.05));
}

function limpiarPoderes() {
  const J = jugador;
  J.poderes = {}; J.pendiente = null; J.escalaVis = 1;
  if (J.modelo) J.modelo.scale.setScalar(1);
  if (J.burbuja) J.burbuja.visible = false;
  for (const a of aliados) { a.activo = false; a.modelo.visible = false; }
  aliados.length = 0;
  for (const k of capsulas.items) { k.activo = false; k.grupo.visible = false; }
  juego.racha = 0; juego.lento = 1;
}

// ---------- Cápsulas de poder (modelo y aparición) ----------
// Archivo: capsula_poder.glb (el ícono es un sprite: icono_poder_<nombre>.png)
const TEX_ICONOS = {};
function texturaIcono(txt) {
  if (TEX_ICONOS[txt]) return TEX_ICONOS[txt];
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '86px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
  g.fillText(txt, 64, 70);
  return (TEX_ICONOS[txt] = new THREE.CanvasTexture(c));
}
const GEO_CAPS_CUERPO = new THREE.CylinderGeometry(1.5, 1.5, 3, 12), GEO_CAPS_PUNTA = new THREE.SphereGeometry(1.5, 12, 8);
const GEO_CAPS_ANILLO = new THREE.TorusGeometry(2.6, 0.18, 6, 24);
const capsulas = new Pool(() => {
  const g = new THREE.Group();
  const vidrio = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false });
  const cuerpo = new THREE.Group();
  cuerpo.add(new THREE.Mesh(GEO_CAPS_CUERPO, vidrio), M(GEO_CAPS_PUNTA, vidrio, 0, 1.5, 0), M(GEO_CAPS_PUNTA, vidrio, 0, -1.5, 0));
  cuerpo.rotation.z = 0.4;
  const anillo = new THREE.Mesh(GEO_CAPS_ANILLO, vidrio);
  const icono = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthTest: false, fog: false }));
  icono.scale.setScalar(3.4); icono.renderOrder = 5;
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX_BRILLO, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  halo.scale.setScalar(16);
  g.add(halo, cuerpo, anillo, icono);
  g.scale.setScalar(1.7); g.visible = false; escena.add(g);
  return { grupo: g, cuerpo, anillo, icono, halo, vidrio, tipo: 'gigante', vida: 0, colorCss: '#ffffff' };
}, 4);

function generarCapsula(posFija) {
  const k = capsulas.obtener(); if (!k) return;
  const f = juego.faccion;
  const lista = Object.keys(PODERES).filter((id) => !PODERES[id].faccion || PODERES[id].faccion === f);
  const tipo = lista[Math.floor(Math.random() * lista.length)], P = PODERES[tipo];
  k.tipo = tipo; k.vida = 32;
  k.vidrio.color.setHex(P.color); k.halo.material.color.setHex(P.color);
  k.icono.material.map = texturaIcono(P.icono); k.icono.material.needsUpdate = true;
  k.colorCss = '#' + new THREE.Color(P.color).getHexString();
  const J = jugador, ang = J.yaw + rand(-0.8, 0.8), dist = rand(110, 200);
  k.grupo.position.set(J.pos.x + Math.sin(ang) * dist, clamp(J.pos.y + rand(-35, 35), -CONFIG.ALTURA, CONFIG.ALTURA), J.pos.z + Math.cos(ang) * dist);
  limitarArena(k.grupo.position);
  if (posFija) k.grupo.position.copy(posFija);
  k.grupo.visible = true;
  Particulas.emitir(k.grupo.position, 16, P.color, 14, 0.7);
  mensajeRadio('Cápsula detectada: ' + P.icono + ' ' + P.nombre, 2.2);
}

function actualizarCapsulas(dt) {
  const J = jugador;
  juego.tCapsula -= dt;
  let activas = 0; for (const k of capsulas.items) if (k.activo) activas++;
  if (juego.tCapsula <= 0 && J.vivo && juego.fase !== 'completado' && juego.fase !== 'muerteJefe') {
    juego.tCapsula = rand(13, 18);
    if (activas < 2) generarCapsula();
  }
  for (const k of capsulas.items) {
    if (!k.activo) continue;
    k.vida -= dt;
    if (k.vida <= 0) { k.activo = false; k.grupo.visible = false; continue; }
    k.cuerpo.rotation.y += dt * 2; k.anillo.rotation.x += dt * 1.5; k.anillo.rotation.y += dt;
    k.halo.material.opacity = 0.55 + Math.sin(k.vida * 5) * 0.2;
    k.grupo.visible = k.vida > 4 || Math.floor(k.vida * 8) % 2 === 0;
    if (!J.vivo) continue;
    const d = k.grupo.position.distanceTo(J.pos);
    if (d < J.st.iman) { _c.subVectors(J.pos, k.grupo.position).normalize(); k.grupo.position.addScaledVector(_c, (50 + J.vel) * dt); }
    if (d < 7 * J.escalaVis) {
      k.activo = false; k.grupo.visible = false;
      Particulas.emitir(J.pos, 20, PODERES[k.tipo].color, 18, 0.6);
      activarPoder(k.tipo);
    }
  }
}

// ---------- Aliados: drones escolta (militares) y crías de la colmena (alienígenas) ----------
// Archivo: aliado_dron.glb
function crearModeloDronAliado() {
  const g = new THREE.Group();
  g.add(M(new THREE.BoxGeometry(0.9, 0.5, 1.8), matSolido(0xb8c6d8, 0x101820, 60)));
  for (const s of [-1, 1]) g.add(M(new THREE.BoxGeometry(1.4, 0.1, 0.8), matSolido(0x2a7fff, 0x0a2a66, 50), s * 1, 0, -0.2));
  g.add(M(new THREE.SphereGeometry(0.3, 6, 5), matLuz(0x66e0ff), 0, 0, -1));
  const h = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX_BRILLO, color: 0x66e0ff, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
  h.scale.setScalar(4); g.add(h);
  g.scale.setScalar(0.75);
  return g;
}
// Archivo: aliado_cria.glb
function crearModeloCria() {
  const g = new THREE.Group();
  const c = M(new THREE.SphereGeometry(0.8, 7, 5), matSolido(0x3fbf4a, 0x1a6a1a, 50)); c.scale.z = 1.6; g.add(c);
  for (const s of [-1, 1]) { const ala = M(new THREE.ConeGeometry(0.25, 1.6, 4), matSolido(0xb6ff3a, 0x406a00, 50), s * 0.8, 0, -0.2); ala.rotation.z = -s * Math.PI / 2; g.add(ala); }
  const h = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX_BRILLO, color: 0x9dff55, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
  h.scale.setScalar(4); g.add(h);
  g.scale.setScalar(1.4);
  return g;
}
const aliados = [];
const cacheAliados = { dron: [], cria: [] };
function obtenerAliado(tipo) {
  let a = cacheAliados[tipo].find((x) => !x.activo);
  if (!a) {
    a = { tipo, modelo: tipo === 'dron' ? crearModeloDronAliado() : crearModeloCria(), dir: V3(0, 0, 1), activo: false };
    a.pos = a.modelo.position; escena.add(a.modelo); cacheAliados[tipo].push(a);
  }
  a.activo = true; a.modelo.visible = true; a.t = rand(0, 5); a.tDisp = rand(0.2, 0.5); a.espera = 0;
  aliados.push(a);
  return a;
}
function crearDrones() {
  if (aliados.some((a) => a.activo && a.tipo === 'dron')) return;
  [-1, 1].forEach((lado) => { const a = obtenerAliado('dron'); a.lado = lado; a.pos.copy(jugador.pos); });
}
function crearCrias() {
  let n = 0; for (const a of aliados) if (a.activo && a.tipo === 'cria') n++;
  for (let i = n; i < 6; i++) { const a = obtenerAliado('cria'); a.pos.copy(jugador.pos).add(vecAleatorio(_c, 4)); a.dir.copy(jugador.fwd); }
}
/** Enemigo (o parte vulnerable del jefe) más cercano a un punto. */
function objetivoCercano(pos, maxDist) {
  let mejor = null, md = maxDist;
  for (const o of candidatosObjetivo()) { const d = posObjetivo(o).distanceTo(pos); if (d < md) { md = d; mejor = o; } }
  return mejor;
}
function danarObjetivo(o, cant) { if (o.esParte) danarParte(o.ref, cant); else danarEnemigo(o.ref, cant, false); }
/** Disparo de un aliado (usa las balas del jugador). */
function disparoAliado(origen, dir, danio, color) {
  const b = balasJ.obtener(); if (!b) return;
  b.malla.position.copy(origen);
  b.vel.copy(dir).multiplyScalar(290); b.vida = 1.6; b.danio = danio;
  b.malla.material = matLuz(color);
  _mira.copy(origen).add(dir); b.malla.lookAt(_mira);
  b.malla.visible = true;
}

function actualizarAliados(dt) {
  const J = jugador;
  for (let i = aliados.length - 1; i >= 0; i--) {
    const a = aliados[i];
    if (!a.activo) { aliados.splice(i, 1); continue; }
    a.t += dt;
    const poder = a.tipo === 'dron' ? 'drones' : 'crias';
    if (!(J.poderes[poder] > 0) || !J.vivo) {
      if (a.modelo.visible) explosion(a.pos, 2.5, a.tipo === 'dron' ? 0x66e0ff : 0x9dff55);
      a.activo = false; a.modelo.visible = false; continue;
    }
    if (a.tipo === 'dron') {
      // Vuela en formación a tu lado y dispara solo
      _d.copy(J.pos).addScaledVector(J.der, a.lado * 5 * J.escalaVis).addScaledVector(ARRIBA, 1.8 + Math.sin(a.t * 3 + a.lado) * 0.5).addScaledVector(J.fwd, 3);
      a.pos.lerp(_d, 1 - Math.exp(-dt * 8));
      _mira.copy(a.pos).add(J.fwd); a.modelo.lookAt(_mira);
      a.tDisp -= dt;
      if (a.tDisp <= 0) {
        a.tDisp = 0.32;
        const o = objetivoCercano(a.pos, 280);
        if (o) {
          _apunte.copy(posObjetivo(o));
          if (!o.esParte) _apunte.addScaledVector(o.ref.dir, o.ref.vel * (a.pos.distanceTo(_apunte) / 290));
          _apunte.sub(a.pos).normalize();
          disparoAliado(a.pos, _apunte, 7, 0x8fd0ff);
          Sonido.sfx.disparoTierra();
        }
      }
    } else {
      // Cría: persigue al enemigo más cercano y explota al tocarlo; luego renace junto a tu nave
      if (a.espera > 0) {
        a.espera -= dt;
        if (a.espera <= 0) { a.modelo.visible = true; a.pos.copy(J.pos).add(vecAleatorio(_c, 3)); a.dir.copy(J.fwd); }
        continue;
      }
      const o = objetivoCercano(a.pos, 400);
      if (o) _deseo.subVectors(posObjetivo(o), a.pos).normalize();
      else {
        _deseo.copy(J.pos).addScaledVector(J.der, Math.cos(a.t * 2) * 10).addScaledVector(ARRIBA, Math.sin(a.t * 2) * 6).sub(a.pos);
        if (_deseo.lengthSq() < 1) _deseo.copy(J.fwd);
        _deseo.normalize();
      }
      girarHacia(a.dir, _deseo, 4 * dt);
      a.pos.addScaledVector(a.dir, (o ? 75 : Math.max(J.vel + 10, 45)) * dt);
      _mira.copy(a.pos).add(a.dir); a.modelo.lookAt(_mira);
      if (o && a.pos.distanceTo(posObjetivo(o)) < o.ref.radio + 2.5) {
        explosion(a.pos, 4, 0x9dff55); Sonido.sfx.explosionPequena();
        danarObjetivo(o, 30);
        a.modelo.visible = false; a.espera = 0.8;
      }
    }
  }
}

// ---------- Control mental: un enemigo pasa a tu bando durante 20 s ----------
function controlMental() {
  let e = null;
  const o = mejorObjetivo(0.6, 500);
  if (o && !o.esParte && o.ref.tipo !== 'senuelo') e = o.ref;
  if (!e) {
    let md = 450;
    for (const x of enemigos) if (x.activo && !x.aliado && x.tipo !== 'senuelo') { const d = x.pos.distanceTo(jugador.pos); if (d < md) { md = d; e = x; } }
  }
  if (!e) return false;
  e.aliado = true; e.tAliado = 20 * jugador.st.multPoder; e.tDisparo = 0.5;
  e.halo.visible = true; e.halo.material.color.setHex(0x5dff9a);
  Particulas.emitir(e.pos, 24, 0xd06bff, 16, 0.8);
  Sonido.sfx.psiquico();
  mensajeRadio('🧠 ¡Controlas una nave enemiga! Peleará a tu lado', 2.5);
  return true;
}
function actualizarConvertido(e, dt) {
  e.tAliado -= dt;
  if (e.tAliado <= 0) { destruirEnemigo(e, false, false); return; }
  const o = objetivoCercano(e.pos, 500);
  if (o) _deseo.subVectors(posObjetivo(o), e.pos).normalize();
  else {
    _deseo.copy(jugador.pos).addScaledVector(jugador.der, 25).sub(e.pos);
    if (_deseo.lengthSq() < 1) _deseo.copy(jugador.fwd);
    _deseo.normalize();
  }
  girarHacia(e.dir, _deseo, Math.max(e.giro, 1.5) * dt);
  e.pos.addScaledVector(e.dir, Math.max(e.vel, 34) * dt);
  _mira.copy(e.pos).add(e.dir); e.modelo.lookAt(_mira);
  if (e.modelo.scale.x !== e.escala) e.modelo.scale.setScalar(e.escala);
  if (!o) return;
  const dO = posObjetivo(o).distanceTo(e.pos);
  if (e.tipo === 'kamikaze' || e.tipo === 'enjambre') {
    if (dO < o.ref.radio + e.radio) { danarObjetivo(o, 60); destruirEnemigo(e, false, false); }
    return;
  }
  e.tDisparo -= dt;
  if (e.tDisparo <= 0 && dO < 260) {
    e.tDisparo = 0.45;
    _apunte.subVectors(posObjetivo(o), e.pos).normalize();
    _origen.copy(e.pos).addScaledVector(_apunte, e.radio + 1);
    disparoAliado(_origen, _apunte, 10, 0x5dff9a);
  }
}

// ---------- Ataque aéreo (militares): lluvia de misiles sobre los enemigos cercanos ----------
function ataqueAereo() {
  const J = jugador, objs = [];
  for (const e of enemigos) if (e.activo && !e.aliado && e.pos.distanceTo(J.pos) < 480) objs.push(crearObjetivo(e, false));
  const partes = candidatosObjetivo().filter((o) => o.esParte);
  for (let k = 0; k < 6 && partes.length; k++) objs.push(partes[k % partes.length]);
  if (!objs.length) return false;
  objs.slice(0, 24).forEach((o) => {
    const m = misiles.obtener(); if (!m) return;
    m.dueno = 'jugador'; m.aereo = true;
    m.grupo.position.copy(J.pos).addScaledVector(ARRIBA, 45 + rand(0, 15)).addScaledVector(J.der, rand(-30, 30)).addScaledVector(J.fwd, rand(-20, 10));
    m.dir.subVectors(posObjetivo(o), m.grupo.position).normalize();
    m.vel = 140; m.giro = 5; m.vida = 5; m.danio = 60; m.radio = 1.2;
    m.objetivo = o; m.tBuscar = 0; m.tRastro = 0; m.colorRastro = 0xff7744;
    setVista(m, 'misil'); m.grupo.visible = true;
  });
  Sonido.sfx.misil();
  return true;
}

// ---------- Onda de choque (alienígenas, racha x20): destruye todo lo cercano ----------
function ondaChoque() {
  const J = jugador;
  explosion(J.pos, 50, 0x9dff55); explosion(J.pos, 28, 0xffffff);
  for (const e of enemigos.slice()) if (e.activo && !e.aliado && e.pos.distanceTo(J.pos) < 240) destruirEnemigo(e, false, false);
  for (const o of candidatosObjetivo()) if (o.esParte && posObjetivo(o).distanceTo(J.pos) < 320) danarParte(o.ref, 150);
  for (const b of balasE.items) if (b.activo && b.malla.position.distanceTo(J.pos) < 240) { b.activo = false; b.malla.visible = false; }
  juego.sacudida = 1.4;
  Sonido.sfx.explosionGrande();
  mostrarMensaje('💥 ¡ONDA DE CHOQUE!', 1.6);
}

// ---------- Rachas de derribos ----------
// Cada 5: recarga misiles · cada 10: poder del bando · cada 20: poder definitivo
function sumarRacha() {
  juego.racha++;
  const r = juego.racha;
  if (juego.sinPremioRacha || r % 5 !== 0) return;
  Sonido.sfx.racha();
  if (r % 20 === 0) {
    if (juego.faccion === 'tierra') { mensajeRadio('🔥 RACHA x' + r + ': ¡ataque aéreo!', 2.5); activarPoder('aereo'); }
    else { mensajeRadio('🔥 RACHA x' + r + ': ¡onda de choque!', 2.5); juego.sinPremioRacha = true; ondaChoque(); juego.sinPremioRacha = false; }
  } else if (r % 10 === 0) {
    const id = juego.faccion === 'tierra' ? 'drones' : 'crias';
    mensajeRadio('🔥 RACHA x' + r + ': ' + PODERES[id].nombre, 2.5);
    activarPoder(id);
  } else {
    jugador.municion = Math.max(jugador.municion, jugador.municionMax);
    mensajeRadio('🔥 RACHA x' + r + ': misiles recargados', 2.2);
  }
}

// =====================================================================
// 16c. DIFICULTAD, ENEMIGOS NUEVOS, PELIGROS (minas, meteoritos, rayos) Y EVENTOS
// =====================================================================

// ---------- Dificultad (se elige en la pantalla de bandos) ----------
const DIFICULTADES = {
  normal:    { nombre: 'NORMAL',    vida: 1,   danio: 1,   cadencia: 1,    vel: 1,   cantidad: 1,   jefe: 1 },
  dificil:   { nombre: 'DIFÍCIL',   vida: 1.4, danio: 1.3, cadencia: 1.25, vel: 1.1, cantidad: 1.3, jefe: 1.4 },
  pesadilla: { nombre: 'PESADILLA', vida: 1.9, danio: 1.6, cadencia: 1.5,  vel: 1.2, cantidad: 1.6, jefe: 1.9 }
};
juego.D = DIFICULTADES.normal;
juego.modo = 'campana';      // campana | infinito
juego.avanceZ = 0;           // cuánto avanzó la nave este cuadro (modo infinito)
const CORR = { X: 55, Y: 32 };   // medio ancho y medio alto del corredor del modo infinito

/** En el modo infinito no hay límite circular de arena. */
function fueraArena(p) { return juego.modo !== 'infinito' && p.length() > CONFIG.ARENA + 60; }
/** Multiplicador de puntos por combo (modo infinito). */
function multCombo() { return 1 + Math.min(juego.racha, 30) / 10; }

/** Esquiva con cargas (se usa en ambos modos). */
function procesarEsquiva(dt) {
  const J = jugador;
  if (J.cargasEsquiva < J.st.esquivas) {
    J.tEsquivaCD -= dt;
    if (J.tEsquivaCD <= 0) { J.cargasEsquiva++; J.tEsquivaCD = J.cargasEsquiva < J.st.esquivas ? 1.6 : 0; }
  }
  if (pedirEsquiva) {
    pedirEsquiva = false;
    if (J.cargasEsquiva > 0 && J.esquivaT <= 0) {
      J.cargasEsquiva--; J.esquivaT = 0.5; if (J.tEsquivaCD <= 0) J.tEsquivaCD = 1.6;
      J.esquivaDir = entrada.girar > 0.2 ? 1 : entrada.girar < -0.2 ? -1 : -J.esquivaDir;
      Sonido.sfx.esquiva();
    }
  }
  if (J.esquivaT > 0) { J.esquivaT -= dt; J.velVec.addScaledVector(J.der, J.esquivaDir * 75); }
}

// ---------- Modelos de los enemigos nuevos (colores según el bando enemigo) ----------
function paletaEnemiga(fe) {
  return fe === 'alien'
    ? { base: matSolido(0x6a2fa0, 0x240a3a, 40), acento: matSolido(0x3fd46a, 0x10501e, 60), luz: 0xc061ff }
    : { base: matSolido(0x7d8796, 0x080a10, 50), acento: matSolido(0xd23a3a, 0x400808, 40), luz: 0xff7a2a };
}
// Archivo: enemigo_<bando>_interceptor.glb
function crearModeloInterceptor(fe) {
  const P = paletaEnemiga(fe), g = new THREE.Group();
  g.add(M(new THREE.ConeGeometry(0.55, 4.2, 5).rotateX(Math.PI / 2), P.base, 0, 0, 0.6));
  for (const s of [-1, 1]) {
    const ala = M(new THREE.BoxGeometry(2.6, 0.08, 1.1), P.acento, s * 1.3, 0, -0.9); ala.rotation.y = s * 0.55; g.add(ala);
  }
  g.add(M(new THREE.SphereGeometry(0.3, 6, 5), matLuz(P.luz), 0, 0, -1.6));
  return g;
}
// Archivo: enemigo_<bando>_minador.glb
function crearModeloMinador(fe) {
  const P = paletaEnemiga(fe), g = new THREE.Group();
  const c = M(new THREE.SphereGeometry(1.4, 9, 7), P.base); c.scale.set(1.2, 0.8, 1.5); g.add(c);
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2;
    g.add(M(new THREE.IcosahedronGeometry(0.45, 0), P.acento, Math.cos(a) * 1.3, Math.sin(a) * 0.9, -1.3));
  }
  g.add(M(new THREE.SphereGeometry(0.35, 6, 5), matLuz(0xff3344), 0, 0, -2));
  return g;
}
// Archivo: enemigo_<bando>_francotirador.glb
function crearModeloFrancotirador(fe) {
  const P = paletaEnemiga(fe), g = new THREE.Group();
  g.add(M(new THREE.BoxGeometry(1.4, 1, 2.2), P.base));
  g.add(M(new THREE.CylinderGeometry(0.18, 0.25, 4.5, 6).rotateX(Math.PI / 2), P.acento, 0, 0, 3));
  g.add(M(new THREE.SphereGeometry(0.35, 6, 5), matLuz(0xff3355), 0, 0, 5.3));
  for (const s of [-1, 1]) g.add(M(new THREE.BoxGeometry(1.8, 0.1, 0.7), P.base, s * 1.4, 0, -0.4));
  return g;
}
// Archivo: enemigo_<bando>_escudero.glb
function crearModeloEscudero(fe) {
  const P = paletaEnemiga(fe), g = new THREE.Group();
  g.add(M(new THREE.OctahedronGeometry(1.5, 0), P.base));
  const anillo = M(new THREE.TorusGeometry(2.3, 0.18, 6, 20), matSolido(0x33ddff, 0x1188aa, 80)); g.add(anillo);
  g.add(M(new THREE.SphereGeometry(0.6, 8, 6), matLuz(0x33ddff), 0, 0, 1.2));
  g.userData.anillo = anillo;
  return g;
}
Object.assign(MODELOS_ENEMIGOS.alien, {
  interceptor: () => crearModeloInterceptor('alien'), minador: () => crearModeloMinador('alien'),
  francotirador: () => crearModeloFrancotirador('alien'), escudero: () => crearModeloEscudero('alien')
});
Object.assign(MODELOS_ENEMIGOS.tierra, {
  interceptor: () => crearModeloInterceptor('tierra'), minador: () => crearModeloMinador('tierra'),
  francotirador: () => crearModeloFrancotirador('tierra'), escudero: () => crearModeloEscudero('tierra')
});
Object.assign(STATS_ENEMIGOS, {
  interceptor:   { vida: 24, vel: 46, giro: 2.4, radio: 4.4, escala: 2.2, halo: 11, puntos: 150, cadencia: 1.1, drop: 0.15 },
  minador:       { vida: 65, vel: 20, giro: 0.9, radio: 6.2, escala: 2.2, halo: 13, puntos: 175, cadencia: 2.6, drop: 0.35 },
  francotirador: { vida: 45, vel: 14, giro: 0.8, radio: 5.4, escala: 2.0, halo: 12, puntos: 200, cadencia: 4.2, drop: 0.3 },
  escudero:      { vida: 80, vel: 22, giro: 1.0, radio: 6.0, escala: 2.2, halo: 13, puntos: 220, drop: 0.45 }
});

/** Convierte un enemigo en ÉLITE (dorado, triple de vida, mejores premios). */
function hacerElite(e) {
  e.elite = true; e.vida *= 3; e.vidaMax *= 3; e.puntos *= 3; e.radio *= 1.2; e.escala *= 1.3;
  e.modelo.scale.setScalar(e.escala);
  e.halo.visible = true; e.halo.material.color.setHex(0xffd166); e.halo.scale.multiplyScalar(1.5);
}

// ---------- Inteligencia de los enemigos nuevos ----------
function iaInterceptor(e, dt, dist) {
  const J = jugador;
  if (!e.sentido) e.sentido = Math.random() < 0.5 ? -1 : 1;
  e.ang = (e.ang || rand(0, 6.28)) + dt * 1.1 * e.sentido;
  if (dist > 160) _deseo.copy(_hacia);
  else _deseo.set(J.pos.x + Math.cos(e.ang) * 55, J.pos.y + Math.sin(e.t * 0.9) * 18, J.pos.z + Math.sin(e.ang) * 55).sub(e.pos).normalize();
  if (fueraArena(e.pos)) _deseo.copy(e.pos).negate().normalize();
  girarHacia(e.dir, _deseo, e.giro * dt);
  e.pos.addScaledVector(e.dir, e.vel * dt);
  // Esquiva cuando le apuntas
  e.tEv = (e.tEv || 0) - dt;
  _a.subVectors(e.pos, J.pos).normalize();
  if (e.tEv <= 0 && _a.dot(J.fwd) > 0.985 && dist < 260) { e.tEv = 2.2; e.evT = 0.45; e.evS = Math.random() < 0.5 ? -1 : 1; }
  if (e.evT > 0) { e.evT -= dt; e.pos.addScaledVector(J.der, e.evS * 55 * dt); }
  e.tDisparo -= dt;
  if (e.tDisparo <= 0 && dist < 220 && e.dir.dot(_hacia) > 0.8 && J.vivo) {
    e.tDisparo = e.cadencia;
    for (let k = 0; k < 2; k++) dispararAlJugador(e.pos, { vel: 135, danio: 5 + juego.nivel, color: colorBalaEnemiga() }, 0.03);
    Sonido.sfx.disparoEnemigo();
  }
}
function iaMinador(e, dt, dist) {
  const J = jugador;
  e.tOffset -= dt;
  if (e.tOffset <= 0) { e.tOffset = rand(3, 5); e.offset.copy(J.fwd).multiplyScalar(rand(50, 120)).addScaledVector(J.der, rand(-60, 60)).addScaledVector(ARRIBA, rand(-25, 25)); }
  _deseo.copy(J.pos).add(e.offset).sub(e.pos);
  if (_deseo.lengthSq() < 25) _deseo.copy(e.dir);
  _deseo.normalize();
  if (fueraArena(e.pos)) _deseo.copy(e.pos).negate().normalize();
  girarHacia(e.dir, _deseo, e.giro * dt);
  e.pos.addScaledVector(e.dir, e.vel * dt);
  e.tDisparo -= dt;
  if (e.tDisparo <= 0 && dist < 260) { e.tDisparo = e.cadencia; soltarMina(e.pos, { vida: 24 }); }
}
function iaFrancotirador(e, dt, dist) {
  const J = jugador;
  if (dist < 160) _deseo.copy(_hacia).negate();
  else if (dist > 240) _deseo.copy(_hacia);
  else { _deseo.crossVectors(_hacia, ARRIBA); if (_deseo.lengthSq() < 1e-4) _deseo.set(1, 0, 0); }
  _deseo.normalize();
  if (fueraArena(e.pos)) _deseo.copy(e.pos).negate().normalize();
  girarHacia(e.dir, _deseo, e.giro * dt);
  e.pos.addScaledVector(e.dir, e.vel * dt);
  e.tDisparo -= dt;
  if (e.tDisparo <= 0 && dist < 330 && J.vivo) {
    e.tDisparo = e.cadencia;
    const gen = e.gen;
    _apunte.copy(J.pos).addScaledVector(J.velVec, 0.4).sub(e.pos).normalize();
    crearRayo({ origenFn: (o) => o.copy(e.pos), dir: _apunte, largo: 450, carga: 1.3, dur: 0.25, ancho: 1.6,
      danio: 18 + juego.nivel * 2, color: 0xff3355, vivo: () => e.activo && e.gen === gen && !e.aliado });
    Sonido.sfx.laserCarga();
  }
  return true;   // siempre mira al jugador
}
function iaEscudero(e, dt, dist) {
  _b.set(0, 0, 0); let n = 0;
  for (const o of enemigos) if (o !== e && o.activo && !o.aliado && o.tipo !== 'escudero' && o.pos.distanceTo(e.pos) < 200) { _b.add(o.pos); n++; }
  if (n) { _b.divideScalar(n); _deseo.subVectors(_b, e.pos); if (_deseo.lengthSq() < 225) _deseo.copy(e.dir); }
  else if (dist > 130) _deseo.copy(_hacia); else _deseo.copy(_hacia).negate();
  _deseo.normalize();
  if (fueraArena(e.pos)) _deseo.copy(e.pos).negate().normalize();
  girarHacia(e.dir, _deseo, e.giro * dt);
  e.pos.addScaledVector(e.dir, e.vel * dt);
  if (e.modelo.userData.anillo) e.modelo.userData.anillo.rotation.x += dt * 3;
}
// Escudo que el ESCUDERO pone a sus compañeros (reciben solo 25 % del daño)
const GEO_ESCUDO_ENEMIGO = new THREE.SphereGeometry(2.4, 14, 10);
const MAT_ESCUDO_ENEMIGO = new THREE.MeshBasicMaterial({ color: 0x33ddff, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false });
function actualizarProtecciones() {
  for (const e of enemigos) e.protegido = false;
  for (const s of enemigos) {
    if (!s.activo || s.aliado || s.tipo !== 'escudero') continue;
    for (const o of enemigos) if (o !== s && o.activo && !o.aliado && o.pos.distanceTo(s.pos) < 50) o.protegido = true;
  }
  for (const e of enemigos) {
    if (!e.activo) continue;
    if (e.protegido && !e.escudoVis) { e.escudoVis = new THREE.Mesh(GEO_ESCUDO_ENEMIGO, MAT_ESCUDO_ENEMIGO); e.modelo.add(e.escudoVis); }
    if (e.escudoVis) e.escudoVis.visible = e.protegido;
  }
}

// ---------- MINAS y HUEVOS ----------
// Archivo: peligro_mina.glb
function crearModeloMina() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.IcosahedronGeometry(1.4, 0), matSolido(0x3a3f4a, 0x100808, 40)));
  const pua = new THREE.ConeGeometry(0.35, 1.2, 4), matPua = matSolido(0xd23a3a, 0x400808, 40);
  [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].forEach((d) => {
    const v = V3(d[0], d[1], d[2]), p = new THREE.Mesh(pua, matPua);
    p.quaternion.setFromUnitVectors(ARRIBA, v); p.position.copy(v).multiplyScalar(1.5); g.add(p);
  });
  const luz = M(new THREE.SphereGeometry(0.7, 8, 6), matLuz(0xff3344)); g.add(luz);
  const h = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX_BRILLO, color: 0xff3344, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  h.scale.setScalar(7); g.add(h);
  g.userData.luz = luz;
  return g;
}
// Archivo: peligro_huevo.glb
function crearModeloHuevo() {
  const g = new THREE.Group();
  const c = M(new THREE.SphereGeometry(1.4, 10, 8), matSolido(0xc8d83a, 0x4a5a00, 40)); c.scale.y = 1.35; g.add(c);
  for (let i = 0; i < 5; i++) g.add(M(new THREE.SphereGeometry(0.28, 6, 4), matLuz(0x9dff55), Math.cos(i * 1.26) * 1.2, (i - 2) * 0.45, Math.sin(i * 1.26) * 1.2));
  const h = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX_BRILLO, color: 0xd4ff3a, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  h.scale.setScalar(7); g.add(h);
  return g;
}
const minas = new Pool(() => {
  const g = new THREE.Group(), vMina = crearModeloMina(), vHuevo = crearModeloHuevo();
  g.add(vMina, vHuevo); g.scale.setScalar(1.6); g.visible = false; escena.add(g);
  return { grupo: g, vMina, vHuevo, tipo: 'mina', vel: V3(), vida: 0, t: 0, hp: 0, radio: 3, orbita: null };
}, 40);
function soltarMina(pos, op = {}) {
  const m = minas.obtener(); if (!m) return null;
  m.tipo = op.huevo ? 'huevo' : 'mina';
  m.vMina.visible = !op.huevo; m.vHuevo.visible = !!op.huevo;
  m.grupo.position.copy(pos);
  m.vel.set(0, 0, 0); if (op.vel) m.vel.copy(op.vel);
  m.vida = op.vida || 25; m.t = 0; m.hp = op.huevo ? 30 : 8; m.radio = op.huevo ? 3.6 : 3.4;
  m.orbita = op.orbita || null; m.grupo.visible = true;
  return m;
}
function detonarMina(m) {
  explosion(m.grupo.position, 8, 0xff5533); Sonido.sfx.explosionPequena();
  if (jugador.vivo && m.grupo.position.distanceTo(jugador.pos) < 15) danarJugador(18);
  m.activo = false; m.grupo.visible = false;
}
function eclosionar(m) {
  explosion(m.grupo.position, 5, 0x9dff55);
  for (let k = 0; k < 3; k++) { const e = generarEnemigo('enjambre', _rf.copy(m.grupo.position).add(vecAleatorio(_rd, 4))); e.deJefe = true; }
  m.activo = false; m.grupo.visible = false;
}
function golpearMina(m, danio) {
  m.hp -= danio;
  if (m.hp > 0) { Particulas.emitir(m.grupo.position, 4, 0xffffff, 8, 0.2); return; }
  if (m.tipo === 'huevo') { explosion(m.grupo.position, 4, 0x9dff55); sumarPuntos(40); m.activo = false; m.grupo.visible = false; }
  else { sumarPuntos(15); detonarMina(m); }
}
function actualizarMinas(dt) {
  const J = jugador;
  for (const m of minas.items) {
    if (!m.activo) continue;
    m.vida -= dt; m.t += dt;
    if (m.orbita) {
      const o = m.orbita;
      if (juego.jefe !== o.jefe || o.jefe.muriendo) { detonarMina(m); continue; }
      o.ang += o.vel * dt;
      const c = o.jefe.grupo.position;
      m.grupo.position.set(c.x + Math.cos(o.ang) * o.r, c.y + o.y, c.z + Math.sin(o.ang) * o.r);
    } else {
      m.grupo.position.addScaledVector(m.vel, dt);
      m.vel.multiplyScalar(Math.max(0, 1 - dt * 0.8));
    }
    if (m.tipo === 'huevo') {
      m.vHuevo.scale.setScalar(1 + Math.sin(m.t * (m.vida < 2 ? 18 : 6)) * 0.08);
      if (m.vida <= 0) eclosionar(m);
      continue;
    }
    m.vMina.rotation.y += dt; m.vMina.rotation.x += dt * 0.6;
    const d = m.grupo.position.distanceTo(J.pos);
    m.vMina.userData.luz.visible = Math.floor(m.t * (d < 40 ? 10 : 3)) % 2 === 0;
    if (m.vida <= 0) { m.activo = false; m.grupo.visible = false; Particulas.emitir(m.grupo.position, 6, 0xff5533, 6, 0.4); continue; }
    if (J.vivo && m.t > 0.8 && d < m.radio + 3.5 * J.escalaVis) detonarMina(m);
  }
}

// ---------- METEORITOS ----------
// Archivo: peligro_meteorito.glb
const GEO_METEORO = new THREE.IcosahedronGeometry(1, 0);
const _rd = V3(), _rf = V3();
const meteoritos = new Pool(() => {
  const g = new THREE.Group();
  const roca = new THREE.Mesh(GEO_METEORO, matSolido(0x6a4a3a, 0x3a1505, 10));
  const fuego = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX_BRILLO, color: 0xff7a2a, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  fuego.scale.setScalar(2.8);
  g.add(fuego, roca); g.visible = false; escena.add(g);
  return { grupo: g, roca, vel: V3(), prev: V3(), giro: V3(), radio: 3, hp: 20, vida: 0, danio: 10, tRastro: 0 };
}, 44);
function lanzarMeteorito(pos, vel, tam, op = {}) {
  const m = meteoritos.obtener(); if (!m) return;
  m.grupo.position.copy(pos); m.vel.copy(vel); m.radio = tam; m.grupo.scale.setScalar(tam);
  m.hp = tam * 6; m.vida = op.vida || 6; m.danio = op.danio || Math.round(8 + tam * 2); m.tRastro = 0;
  m.giro.set(rand(-2, 2), rand(-2, 2), rand(-2, 2)); m.grupo.visible = true;
}
function golpearMeteorito(m, danio) {
  m.hp -= danio;
  if (m.hp > 0) { Particulas.emitir(m.grupo.position, 4, 0xffaa66, 8, 0.25); return; }
  explosion(m.grupo.position, m.radio * 2, 0xff8a3a); Sonido.sfx.explosionPequena();
  sumarPuntos(30);
  m.activo = false; m.grupo.visible = false;
}
function actualizarMeteoritos(dt) {
  const J = jugador;
  for (const m of meteoritos.items) {
    if (!m.activo) continue;
    m.vida -= dt;
    if (m.vida <= 0) { m.activo = false; m.grupo.visible = false; continue; }
    m.prev.copy(m.grupo.position);
    m.grupo.position.addScaledVector(m.vel, dt);
    m.roca.rotation.x += m.giro.x * dt; m.roca.rotation.y += m.giro.y * dt;
    m.tRastro -= dt;
    if (m.tRastro <= 0) { m.tRastro = 0.06; Particulas.emitir(m.grupo.position, 1, 0xff8a3a, 4, 0.5); }
    if (J.vivo && J.esquivaT <= 0 && segmentoEsfera(m.prev, m.grupo.position, J.pos, m.radio + 1.9 * Math.min(J.escalaVis, 1.8))) {
      if (J.poderes.gigante > 0) golpearMeteorito(m, 9999);
      else { danarJugador(m.danio); explosion(m.grupo.position, m.radio * 1.8, 0xff8a3a); m.activo = false; m.grupo.visible = false; }
    }
  }
}

// ---------- RAYOS LÁSER (francotiradores y jefes) ----------
// Primero se ve una línea roja de aviso (carga) y luego dispara.
// Archivo: efecto_rayo_laser.png
const GEO_RAYO = new THREE.CylinderGeometry(1, 1, 1, 8, 1, true);
const rayos = new Pool(() => {
  const m = new THREE.Mesh(GEO_RAYO, new THREE.MeshBasicMaterial({ color: 0xff3355, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  m.visible = false; escena.add(m);
  return { malla: m, origen: V3(), dir: V3(), largo: 400, t: 0, carga: 1, dur: 0.3, ancho: 2, danio: 15, barrido: 0, color: 0xff3355, tGolpe: 0, origenFn: null, vivo: null, sono: false };
}, 12);
function crearRayo(op) {
  const r = rayos.obtener(); if (!r) return null;
  r.dir.copy(op.dir).normalize();
  r.origenFn = op.origenFn || null;
  if (r.origenFn) r.origenFn(r.origen); else r.origen.copy(op.origen);
  r.largo = op.largo || 400; r.carga = op.carga || 1.2; r.dur = op.dur || 0.3; r.ancho = op.ancho || 2;
  r.danio = op.danio || 15; r.barrido = op.barrido || 0; r.color = op.color || 0xff3355; r.vivo = op.vivo || null;
  r.t = 0; r.tGolpe = 0; r.sono = false;
  return r;
}
function actualizarRayos(dt) {
  const J = jugador;
  for (const r of rayos.items) {
    if (!r.activo) continue;
    r.t += dt; r.tGolpe -= dt;
    if ((r.vivo && !r.vivo()) || r.t >= r.carga + r.dur) { r.activo = false; r.malla.visible = false; continue; }
    if (r.origenFn) r.origenFn(r.origen);
    const cargando = r.t < r.carga;
    let ang = 0;
    if (r.barrido) ang = cargando ? -r.barrido / 2 : -r.barrido / 2 + r.barrido * (r.t - r.carga) / r.dur;
    _rd.copy(r.dir); if (ang) _rd.applyAxisAngle(ARRIBA, ang);
    const ancho = cargando ? 0.25 : r.ancho;
    r.malla.material.opacity = cargando ? 0.35 + Math.sin(r.t * 30) * 0.2 : 0.85;
    r.malla.material.color.setHex(cargando ? 0xff2244 : r.color);
    r.malla.position.copy(r.origen).addScaledVector(_rd, r.largo / 2);
    r.malla.quaternion.setFromUnitVectors(ARRIBA, _rd);
    r.malla.scale.set(ancho, r.largo, ancho);
    r.malla.visible = true;
    if (cargando) continue;
    if (!r.sono) { r.sono = true; Sonido.sfx.laser(); }
    if (J.vivo && r.tGolpe <= 0 && J.esquivaT <= 0) {
      _rf.copy(r.origen).addScaledVector(_rd, r.largo);
      if (segmentoEsfera(r.origen, _rf, J.pos, ancho + 1.9 * Math.min(J.escalaVis, 1.8))) { danarJugador(r.danio); r.tGolpe = 0.45; }
    }
  }
}

/** Bomba de racimo del Fénix: se divide en 10 proyectiles. */
function estallarRacimo(m) {
  explosion(m.grupo.position, 4, 0xffa040); Sonido.sfx.explosionPequena();
  for (let k = 0; k < 10; k++) dispararEnemigo(m.grupo.position, vecAleatorio(_rf, 1), { vel: 55, danio: 8, color: 0xffa040, vida: 3 });
  desactivarMisil(m);
}

// ---------- EVENTOS DINÁMICOS ----------
const EVENTOS = {
  meteoritos: { nombre: '☄️ LLUVIA DE METEORITOS', aviso: '¡Esquiva los meteoritos!', dur: 11 },
  agujero:    { nombre: '🌀 AGUJERO NEGRO', aviso: '¡No te dejes atrapar!', dur: 12 },
  tormenta:   { nombre: '⚡ TORMENTA DE IONES', aviso: 'Radar y marcadores sin señal', dur: 10 },
  emboscada:  { nombre: '🚨 EMBOSCADA', aviso: '¡Enemigos por la retaguardia!', dur: 0 }
};
// Archivo: efecto_agujero_negro.glb
const agujeroVis = (function () {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.SphereGeometry(9, 20, 14), new THREE.MeshBasicMaterial({ color: 0x000000 })));
  const disco = new THREE.Mesh(new THREE.TorusGeometry(17, 3, 8, 40), new THREE.MeshBasicMaterial({ color: 0xb45dff, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
  disco.rotation.x = Math.PI / 2.4; g.add(disco);
  const disco2 = new THREE.Mesh(new THREE.TorusGeometry(25, 1.2, 6, 48), new THREE.MeshBasicMaterial({ color: 0xff8a3a, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
  disco2.rotation.x = Math.PI / 2.2; g.add(disco2);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX_BRILLO, color: 0x7a3aff, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  halo.scale.setScalar(55); g.add(halo);
  g.userData = { disco, disco2 }; g.visible = false; escena.add(g);
  return g;
})();

function eventosDisponibles() {
  if (juego.modo === 'carrera') return ['meteoritos', 'emboscada'];
  if (juego.modo === 'infinito') {
    const l = ['meteoritos'];
    if (juego.sector >= 2) l.push('emboscada', 'agujero');
    if (juego.sector >= 3) l.push('tormenta');
    return l;
  }
  return nivelActual().eventos || [];
}
function programarEvento(primero) { juego.tEvento = primero ? rand(18, 26) : (juego.modo === 'infinito' ? rand(22, 32) : rand(28, 40)); }
function iniciarEvento(id) {
  const ev = EVENTOS[id];
  juego.evento = { id, t: 0, fase: 'aviso', tSpawn: 0, tTick: 0, tRayo: 1, lado: Math.random() < 0.5 ? -1 : 1, dir: V3(), centro: V3() };
  mostrarMensaje(ev.nombre + '\n' + ev.aviso, 2.6);
  Sonido.sfx.alerta();
}
function terminarEvento() {
  agujeroVis.visible = false; juego.tormenta = false;
  juego.evento = null; programarEvento(false);
}
function empezarEvento(ev) {
  const J = jugador;
  if (ev.id === 'meteoritos') ev.dir.copy(J.der).multiplyScalar(ev.lado).addScaledVector(ARRIBA, rand(-0.5, -0.1)).normalize();
  else if (ev.id === 'agujero') {
    if (juego.modo === 'infinito') ev.centro.set(rand(-30, 30), rand(-15, 15), J.pos.z + 260);
    else { ev.centro.copy(J.pos).addScaledVector(J.fwd, 140); limitarArena(ev.centro); }
    agujeroVis.position.copy(ev.centro); agujeroVis.scale.setScalar(0.1); agujeroVis.visible = true;
    Sonido.sfx.rugidoJefe();
  } else if (ev.id === 'tormenta') juego.tormenta = true;
  else if (ev.id === 'emboscada') {
    const n = 3 + Math.min(3, juego.nivel), inf = juego.modo === 'infinito';
    for (let k = 0; k < n; k++) {
      _c.copy(J.pos).addScaledVector(J.fwd, inf ? -60 : -110).addScaledVector(J.der, rand(-40, 40)).addScaledVector(ARRIBA, rand(-20, 20));
      limitarArena(_c);
      generarEnemigo(Math.random() < 0.5 ? 'caza' : (juego.nivel >= 2 ? 'interceptor' : (inf ? 'caza' : 'kamikaze')), _c);
    }
  }
}
function spawnMeteoroEvento(ev) {
  const J = jugador, tam = rand(2.5, 6);
  if (juego.modo === 'infinito') {
    _c.set(-ev.lado * (CORR.X + 70), rand(-CORR.Y, CORR.Y), J.pos.z + rand(80, 360));
    _d.set(ev.lado * rand(65, 95), rand(-12, 12), rand(-25, 5));
  } else {
    _c.copy(J.pos).addScaledVector(J.fwd, rand(20, 230)).addScaledVector(ARRIBA, rand(-45, 45)).addScaledVector(ev.dir, -240);
    _d.copy(ev.dir).multiplyScalar(rand(80, 115));
  }
  lanzarMeteorito(_c, _d, tam, { vida: 6 });
}
function actualizarAgujero(ev, dt) {
  const J = jugador, c = ev.centro, R = 300;
  agujeroVis.scale.setScalar(Math.min(1, agujeroVis.scale.x + dt * 0.8));
  agujeroVis.userData.disco.rotation.z += dt * 2; agujeroVis.userData.disco2.rotation.z -= dt * 1.3;
  _b.subVectors(c, J.pos); const d = _b.length();
  if (J.vivo && d < R && d > 0.1) {
    J.pos.addScaledVector(_b.normalize(), (1 - d / R) * 34 * dt);
    if (d < 14) { ev.tTick -= dt; if (ev.tTick <= 0) { ev.tTick = 0.5; danarJugador(10); } }
  }
  for (const e of enemigos) {
    if (!e.activo || e.aliado) continue;
    _b.subVectors(c, e.pos); const de = _b.length();
    if (de < R) { e.pos.addScaledVector(_b.normalize(), (1 - de / R) * 45 * dt); if (de < 12) destruirEnemigo(e, false, false); }
  }
  ev.tSpawn -= dt;
  if (ev.tSpawn <= 0) { ev.tSpawn = 0.03; vecAleatorio(_c, rand(40, 80)).add(c); _d.subVectors(c, _c).multiplyScalar(1.1); Particulas.emitirVel(_c, _d, 0xb45dff, 0.9); }
}
function relampago() {
  const el = E('relampago'); el.style.opacity = '0.65';
  setTimeout(() => { el.style.opacity = '0'; }, 90);
  Sonido.sfx.trueno();
}
function actualizarEventos(dt) {
  const J = jugador;
  if (!juego.evento) {
    const fasesOk = juego.fase === 'oleadas' || juego.fase === 'jefe' || juego.fase === 'infinito' || juego.fase === 'carrera';
    if (!fasesOk || !J.vivo) return;
    const lista = eventosDisponibles(); if (!lista.length) return;
    juego.tEvento -= dt;
    if (juego.tEvento <= 0) iniciarEvento(lista[Math.floor(Math.random() * lista.length)]);
    return;
  }
  const ev = juego.evento; ev.t += dt;
  if (ev.fase === 'aviso') { if (ev.t >= 2.5) { ev.fase = 'activo'; ev.t = 0; empezarEvento(ev); } return; }
  if (ev.id === 'meteoritos') { ev.tSpawn -= dt; if (ev.tSpawn <= 0) { ev.tSpawn = 0.16; spawnMeteoroEvento(ev); } }
  else if (ev.id === 'agujero') actualizarAgujero(ev, dt);
  else if (ev.id === 'tormenta') { ev.tRayo -= dt; if (ev.tRayo <= 0) { ev.tRayo = rand(0.6, 1.8); relampago(); } }
  if (ev.t >= EVENTOS[ev.id].dur || (ev.id === 'agujero' && juego.modo === 'infinito' && ev.centro.z < J.pos.z - 80)) terminarEvento();
}

/** Limpia minas, meteoritos, rayos, eventos y muros (al empezar o salir de un nivel). */
function limpiarPeligros() {
  for (const m of minas.items) { m.activo = false; m.grupo.visible = false; }
  for (const m of meteoritos.items) { m.activo = false; m.grupo.visible = false; }
  for (const r of rayos.items) { r.activo = false; r.malla.visible = false; }
  agujeroVis.visible = false; juego.tormenta = false; juego.evento = null;
  programarEvento(true);
  if (typeof limpiarCorredor === 'function') limpiarCorredor();
}

// =====================================================================
// 16e. CARRERA GALÁCTICA (multijugador en línea)
//     Circuito de anillos, 3 vueltas. Puntos por anillo y por enemigo
//     derribado + bono por puesto de llegada. En línea, cada jugador ve
//     las naves de los demás en tiempo real (capability "room" de la
//     página de Claude). Sin conexión (por ejemplo en VS Code con Live
//     Server) se corre contra 3 bots.
// =====================================================================
const CARRERA = { ANILLOS: 14, VUELTAS: 3, RX: 520, RZ: 380, RADIO: 16, LIMITE: 420 };
CARRERA.TOTAL = CARRERA.ANILLOS * CARRERA.VUELTAS + 1;   // el último es la meta (anillo 0 otra vez)
const BONO_PUESTO = [1500, 1000, 600, 300];
const CIELO_CARRERA = { planeta: 0xd85a3a, anillo: true, neb: [0x1a3a8a, 0x6a1a5a], niebla: 0x06071a };

// ---------- Pista: la misma para todos los jugadores ----------
/** Punto del circuito. t se mide en anillos (el anillo i está en t = i). */
function puntoPista(t, out) {
  const a = (t / CARRERA.ANILLOS) * Math.PI * 2;
  return out.set(Math.sin(a) * CARRERA.RX, 55 * Math.sin(2 * a) + 25 * Math.sin(3 * a), -Math.cos(a) * CARRERA.RZ);
}
const LARGO_SEG = (function () {   // largo promedio entre dos anillos
  const a = V3(), b = V3(); let total = 0;
  puntoPista(0, a);
  for (let i = 1; i <= 280; i++) { puntoPista(i * CARRERA.ANILLOS / 280, b); total += a.distanceTo(b); a.copy(b); }
  return total / CARRERA.ANILLOS;
})();
const vueltaDe = (prog) => Math.min(CARRERA.VUELTAS, Math.floor(Math.max(0, prog - 1) / CARRERA.ANILLOS) + 1);

/** Texto como sprite (nombres de pilotos y la palabra META). */
function spriteTexto(txt, color) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64;
  const g = c.getContext('2d');
  g.font = 'bold 34px "Segoe UI",Arial,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineWidth = 6; g.strokeStyle = 'rgba(0,0,0,0.8)'; g.strokeText(txt, 128, 34);
  g.fillStyle = color || '#ffffff'; g.fillText(txt, 128, 34);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthTest: false, fog: false }));
  s.scale.set(16, 4, 1); s.renderOrder = 6;
  return s;
}

// Archivo: escenario_anillo_carrera.glb
const GEO_ANILLO = new THREE.TorusGeometry(CARRERA.RADIO, 1.1, 8, 36);
const anillos = [];
(function () {
  const p = V3();
  for (let i = 0; i < CARRERA.ANILLOS; i++) {
    const m = new THREE.Mesh(GEO_ANILLO, new THREE.MeshBasicMaterial({ color: 0x3ab8ff, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false }));
    puntoPista(i, m.position);
    puntoPista(i + 0.05, p);
    m.lookAt(p);   // el anillo queda atravesado en la pista
    m.userData.normal = p.clone().sub(m.position).normalize();
    if (i === 0) { const t = spriteTexto('META', '#ffd166'); t.position.set(0, CARRERA.RADIO + 5, 0); m.add(t); }
    m.visible = false; escena.add(m); anillos.push(m);
  }
})();
function anilloSiguiente() {
  const C = juego.carrera;
  if (juego.modo !== 'carrera' || !C || C.prog >= CARRERA.TOTAL) return null;
  return anillos[C.prog % CARRERA.ANILLOS];
}
function actualizarAnillos() {
  const C = juego.carrera; if (!C) return;
  const sig = C.prog % CARRERA.ANILLOS, tras = (C.prog + 1) % CARRERA.ANILLOS, pulso = 1 + Math.sin(performance.now() * 0.006) * 0.06;
  anillos.forEach((m, i) => {
    const final = i === 0 && C.prog === CARRERA.TOTAL - 1;
    if (C.prog >= CARRERA.TOTAL) { m.material.color.setHex(0x3ab8ff); m.material.opacity = 0.2; m.scale.setScalar(1); return; }
    if (i === sig) { m.material.color.setHex(final ? 0xffd166 : 0x5dff9a); m.material.opacity = 0.95; m.scale.setScalar(pulso); }
    else if (i === tras) { m.material.color.setHex(0x3ab8ff); m.material.opacity = 0.5; m.scale.setScalar(1); }
    else { m.material.color.setHex(0x3ab8ff); m.material.opacity = 0.18; m.scale.setScalar(1); }
  });
}

/** Asteroides a los lados de la pista (siempre en el mismo lugar para todos). */
function colocarAsteroidesCarrera() {
  const rng = rngSemilla(77), p = V3();
  asteroides.forEach((a, i) => {
    a.activo = i < 24; a.malla.visible = a.activo;
    if (!a.activo) return;
    puntoPista(i * CARRERA.ANILLOS / 24 + 0.5, p);
    const off = V3((rng() - 0.5) * 2, (rng() - 0.5) * 0.8, (rng() - 0.5) * 2);
    if (off.length() < 0.01) off.set(1, 0, 0);
    off.normalize().multiplyScalar(30 + rng() * 45);
    const r = 4 + rng() * 7;
    a.malla.position.copy(p).add(off);
    a.malla.scale.set(r, r * (0.7 + rng() * 0.3), r * (0.7 + rng() * 0.4));
    a.radio = r * 0.85; a.hp = r * 5; a.vel = null;
    a.giro.set(rng() - 0.5, rng() - 0.5, rng() - 0.5).multiplyScalar(0.6);
  });
}

function pesosCarrera(v) {
  const p = { caza: 0.55, kamikaze: 0.45 };
  if (v >= 2) { p.interceptor = 0.25; p.pesado = 0.15; }
  if (v >= 3) { p.francotirador = 0.12; p.minador = 0.12; }
  return p;
}

// =====================================================================
// RED: salas en línea con la capability "room"
// =====================================================================
const Red = {
  room: null, sala: null, nombreSala: '', estado: 'off',   // off | conectando | online | error
  est: 'menu',            // lo que este jugador anuncia: menu | lobby | cuenta | carrera | meta
  cId: null, ultimaC: null, ultimoEnvio: 0, tLobby: 0,
  paso: 'piloto'           // pantalla de la sala: piloto (crear/unirse) | sala (código + QR)
};
const NO_IMPRIMIBLES = new RegExp('[\\u0000-\\u001f\\u007f-\\u009f\\u200b-\\u200f\\u2028-\\u202e\\u2060-\\u206f\\ufeff]', 'g');
const limpiarTexto = (t, max) => String(t == null ? '' : t).replace(NO_IMPRIMIBLES, '').trim().slice(0, max);
const numOk = (v, d) => (typeof v === 'number' && isFinite(v) ? v : d);
function apodo() {
  const a = limpiarTexto(guardado.opciones.apodo, 12);
  if (a) return a;
  guardado.opciones.apodo = 'Piloto' + Math.floor(10 + Math.random() * 90); guardar();
  return guardado.opciones.apodo;
}
function codigoSala() {
  const c = String(guardado.opciones.salaCarrera || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 20);
  return c || 'galaxia';
}
function escaparHTML(t) { return String(t).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch])); }

async function iniciarRed() {
  try {
    if (!window.claude || typeof window.claude.use !== 'function') { Red.estado = 'off'; renderLobby(); return; }
    Red.estado = 'conectando'; renderLobby();
    const room = await window.claude.use('room');
    if (!room) { Red.estado = 'off'; renderLobby(); return; }
    Red.room = room; Red.estado = 'online';
    if (Red.paso === 'sala' && !Red.sala) await unirseSala(codigoSala());
    else renderLobby();
  } catch (e) { Red.estado = 'off'; renderLobby(); }
}
async function unirseSala(codigo) {
  if (!Red.room) return;
  try {
    if (Red.sala) { const vieja = Red.sala; Red.sala = null; vieja.leave().catch(() => {}); }
    Red.estado = 'conectando'; renderLobby();
    const sala = await Red.room.join('carrera-' + codigo);
    Red.sala = sala; Red.nombreSala = codigo; Red.estado = 'online';
    sala.onPeers(() => alCambiarSala(), () => { if (Red.sala === sala) { Red.sala = null; Red.estado = 'error'; renderLobby(); } });
    enviarPresencia(true);
    renderLobby();
  } catch (e) { Red.sala = null; Red.estado = 'error'; renderLobby(); }
}
/** Lo que este jugador comparte con los demás de la sala (posición, puntos, progreso). */
function enviarPresencia(forzar) {
  if (!Red.sala) return;
  const ahora = performance.now();
  if (!forzar && ahora - Red.ultimoEnvio < 90) return;
  Red.ultimoEnvio = ahora;
  const C = juego.carrera, J = jugador, r1 = (v) => Math.round(v * 10) / 10, r2 = (v) => Math.round(v * 100) / 100;
  const p = { n: apodo(), f: guardado.opciones.bandoCarrera === 'alien' ? 'alien' : 'tierra', est: Red.est, c: Red.cId || null };
  if (juego.modo === 'carrera' && C && (Red.est === 'cuenta' || Red.est === 'carrera' || Red.est === 'meta')) {
    Object.assign(p, {
      x: r1(J.pos.x), y: r1(J.pos.y), z: r1(J.pos.z), ry: r2(J.yaw), rp: r2(J.pitch), rr: r2(J.modelo ? J.modelo.rotation.z : 0),
      p: juego.puntaje, pr: C.prog, fin: C.fin == null ? null : r1(C.fin), vi: Math.round(Math.max(0, J.vida) / J.vidaMax * 100),
      gi: J.escalaVis > 1.5 ? 1 : 0, vivo: J.vivo ? 1 : 0
    });
  } else Object.assign(p, { x: null, y: null, z: null, ry: null, rp: null, rr: null, p: null, pr: null, fin: null, vi: null, gi: null, vivo: null });
  Red.sala.presence(p).catch(() => {});
}
function pilotosSala() { return Red.sala ? Red.sala.peers() : []; }
/** El anfitrión es el primer piloto (en orden fijo) que está esperando en la sala: él inicia la carrera. */
function anfitrion() {
  const cand = pilotosSala().filter((p) => p.presence && (p.presence.est === 'lobby' || p.presence.est === 'cuenta'));
  cand.sort((a, b) => (a.peer < b.peer ? -1 : a.peer > b.peer ? 1 : 0));
  return cand[0] || null;
}
function alCambiarSala() {
  if (pantallaActual === 'pCarrera') renderLobby();
  // Si el anfitrión arrancó, los demás que esperan en la sala arrancan con él
  if (juego.estado === 'menu' && pantallaActual === 'pCarrera' && Red.est === 'lobby') {
    const h = anfitrion();
    if (h && !h.isMe && h.presence.est === 'cuenta' && typeof h.presence.c === 'string' && h.presence.c !== Red.ultimaC) iniciarCarrera(h.presence.c.slice(0, 40), false);
  }
}

// ---------- Sala de espera (lobby) ----------
const TXT_EST = { menu: 'en el menú', lobby: 'esperando', cuenta: '🏁 en carrera', carrera: '🏁 en carrera', meta: '🏁 terminó' };
// Enlace público del juego (la sala viaja en el #: #sala-galaxia)
const URL_JUEGO = 'https://claude.ai/artifact/UZ3oSjSTDh5HjZUK2dDeEb';
const enlaceSala = () => URL_JUEGO + '#sala-' + codigoSala();
let qrDeSala = '';
/** Dibuja el código QR de la sala (si la librería cargó). */
function dibujarQR() {
  const url = enlaceSala();
  $('txtEnlace').textContent = url;
  if (qrDeSala === url) return;
  qrDeSala = url;
  const caja = $('qrImg');
  try {
    if (typeof window.qrcode !== 'function') throw new Error('sin librería');
    const qr = window.qrcode(0, 'M');
    qr.addData(url); qr.make();
    caja.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
    caja.classList.remove('oculto');
  } catch (e) { caja.innerHTML = ''; caja.classList.add('oculto'); }
}
function renderLobby() {
  if (pantallaActual !== 'pCarrera') return;
  $('pasoPiloto').classList.toggle('oculto', Red.paso !== 'piloto');
  $('pasoSala').classList.toggle('oculto', Red.paso !== 'sala');
  document.querySelectorAll('[data-cbando]').forEach((b) => b.classList.toggle('sel', b.dataset.cbando === (guardado.opciones.bandoCarrera === 'alien' ? 'alien' : 'tierra')));
  if (Red.paso !== 'sala') return;
  const est = $('estadoRed'), lista = $('listaSala'), btn = $('btnEmpezarCarrera');
  const pilotos = pilotosSala(), enSala = Red.estado === 'online' && !!Red.sala;
  $('codigoGrande').textContent = codigoSala().toUpperCase();
  if (enSala) est.textContent = pilotos.length > 1 ? '🟢 ¡Ya hay ' + pilotos.length + ' pilotos! Empieza cuando estén todos.' : '⏳ Esperando a tus amigos… pásales este código para que se unan.';
  else if (Red.estado === 'conectando') est.textContent = '🟡 Conectando con la sala…';
  else if (Red.estado === 'error') est.textContent = '🔴 No se pudo entrar a la sala. Vuelve atrás e inténtalo otra vez, o corre contra bots.';
  else est.textContent = '⚪ Sin conexión en línea: correrás contra 3 bots. El modo en línea funciona al abrir el juego desde su enlace de Claude.';
  // QR de invitación
  $('cajaQR').classList.toggle('oculto', !enSala);
  if (enSala) dibujarQR();
  $('numPilotos').textContent = enSala ? '· ' + pilotos.length : '';
  lista.innerHTML = !enSala ? '<div class="vacia">Correrás contra los bots Nova, Orión y Vega.</div>' : pilotos.map((p) => {
    const pr = p.presence || {}, yo = p.isMe && p.sameTab;
    const nombre = escaparHTML(limpiarTexto(pr.n, 12) || 'Piloto');
    return '<div class="pil' + (yo ? ' yo' : '') + '"><span>' + (pr.f === 'alien' ? '👾' : '🛡️') + ' ' + nombre + (yo ? ' (tú)' : '') + '</span><span>' + escaparHTML(TXT_EST[pr.est] || 'conectado') + '</span></div>';
  }).join('');
  const h = anfitrion(), esperando = pilotos.filter((p) => p.presence && p.presence.est === 'lobby').length;
  if (!enSala) { btn.disabled = Red.estado === 'conectando'; btn.textContent = '▶ Correr contra bots'; }
  else if (!h || (h.isMe && h.sameTab)) { btn.disabled = false; btn.textContent = esperando > 1 ? '▶ Empezar (' + esperando + ' pilotos)' : '▶ Empezar (solo, contra bots)'; }
  else { btn.disabled = true; btn.textContent = '⏳ Esperando a ' + (limpiarTexto(h.presence.n, 12) || 'el anfitrión'); }
}
/** Crea una sala nueva con un código corto (GALAXY-4821). */
function crearSala() {
  entrarSala('galaxy-' + String(1000 + Math.floor(Math.random() * 9000)));
}
/** Convierte lo que escribe el jugador en un código válido: "4821" -> "galaxy-4821". */
function normalizarCodigo(t) {
  const c = String(t || '').trim().toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9-]/g, '').slice(0, 20);
  return /^[0-9]{1,6}$/.test(c) ? 'galaxy-' + c : c;
}
function unirmeConCodigo() {
  const c = normalizarCodigo($('inCodigo').value);
  if (!c) { $('avisoPiloto').textContent = 'Escribe el código que te pasó tu amigo.'; $('inCodigo').focus(); return; }
  entrarSala(c);
}
/** Pasa a la pantalla de la sala y se conecta a ella. */
function entrarSala(codigo) {
  guardado.opciones.salaCarrera = codigo; guardar();
  $('avisoPiloto').textContent = '';
  Red.paso = 'sala'; Red.est = 'lobby';
  marcarSalaEnEnlace();
  if (Red.room) unirseSala(codigoSala()); else if (!window.claude) Red.estado = 'off';
  renderLobby();
}
/** Sale de la sala y vuelve al paso de "Tu piloto". */
function salirDeSala() {
  if (Red.sala) { const vieja = Red.sala; Red.sala = null; vieja.leave().catch(() => {}); }
  if (Red.room) Red.estado = 'online';
  Red.paso = 'piloto';
  try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* no importa */ }
  renderLobby();
}
/** Copiar el código de la sala. */
function copiarCodigo() {
  const b = $('btnCopiarCodigo');
  const listo = (txt) => { b.textContent = txt; setTimeout(() => { b.textContent = '📋 Copiar código'; }, 2000); };
  try { navigator.clipboard.writeText(codigoSala().toUpperCase()).then(() => listo('✓ ¡Copiado!'), () => listo('Cópialo a mano')); }
  catch (e) { listo('Cópialo a mano'); }
}
/** Copiar el enlace de la sala (si el navegador no deja, el enlace queda visible para copiarlo a mano). */
function copiarEnlace() {
  const b = $('btnCopiarEnlace'), url = enlaceSala();
  const listo = (txt) => { b.textContent = txt; setTimeout(() => { b.textContent = '🔗 Copiar enlace'; }, 2000); };
  try { navigator.clipboard.writeText(url).then(() => listo('✓ ¡Copiado!'), () => listo('Cópialo a mano')); }
  catch (e) { listo('Cópialo a mano'); }
}
/** Si el juego se abre con #sala-xxx (desde el QR), entra directo a esa sala. */
function revisarSalaEnEnlace() {
  let h = '';
  try { h = window.location.hash || ''; } catch (e) { /* sin acceso */ }
  const m = /^#sala-([a-z0-9-]{1,20})$/.exec(h.toLowerCase());
  if (!m) return;
  abrirLobby();
  entrarSala(m[1]);
}
function marcarSalaEnEnlace() { try { history.replaceState(null, '', '#sala-' + codigoSala()); } catch (e) { /* no importa */ } }
function abrirLobby() {
  $('inApodo').value = apodo();
  $('inCodigo').value = '';
  Red.est = 'lobby'; Red.cId = null;
  Red.paso = Red.sala ? 'sala' : 'piloto';   // si ya estabas en una sala (otra carrera), sigues en ella
  mostrarPantalla('pCarrera');
  enviarPresencia(true);
  renderLobby();
}
function salirLobby() { Red.est = 'menu'; enviarPresencia(true); mostrarPantalla('pMenu'); }
function botonEmpezar() {
  const otros = pilotosSala().filter((p) => !(p.isMe && p.sameTab) && p.presence && p.presence.est === 'lobby').length;
  const id = 'c' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
  iniciarCarrera(id, !Red.sala || otros === 0);
}

// =====================================================================
// BOTS (solo cuando no hay otros pilotos en la carrera)
// =====================================================================
let bots = [];
function crearBots() {
  const f = juego.faccion, otro = f === 'tierra' ? 'alien' : 'tierra';
  return ['Nova', 'Orión', 'Vega'].map((n, i) => ({
    clave: 'bot' + i, nombre: 'Bot ' + n, faccion: i === 1 ? f : otro, t: -0.55 - i * 0.12,
    velBase: [46, 50, 54][i] * rand(0.94, 1.06), puntos: 0, prog: 0, fin: null, tKill: rand(4, 8), lado: (i - 1) * 6
  }));
}
function actualizarBots(dt) {
  const C = juego.carrera; if (!C) return;
  for (const b of bots) {
    if (C.fase === 'cuenta') continue;
    const vel = b.velBase * (1 + Math.sin(C.tiempo * 0.3 + b.lado) * 0.12) * (b.fin != null ? 0.5 : 1);
    b.t += vel * dt / LARGO_SEG;
    if (b.fin != null) continue;
    const prog = b.t >= 0 ? Math.floor(b.t) + 1 : 0;
    while (b.prog < prog && b.prog < CARRERA.TOTAL) { b.prog++; b.puntos += 50; if (b.prog > 1 && (b.prog - 1) % CARRERA.ANILLOS === 0) b.puntos += 300; }
    b.tKill -= dt;
    if (b.tKill <= 0) { b.tKill = rand(4, 9); b.puntos += [75, 100, 100, 150][Math.floor(Math.random() * 4)]; }
    if (b.prog >= CARRERA.TOTAL) b.fin = C.tiempo;
  }
}

// =====================================================================
// NAVES RIVALES (bots y otros jugadores)
// =====================================================================
const rivales = new Map();
const _rv = V3(), _rv2 = V3();
function obtenerRival(clave, nombre, faccion) {
  let r = rivales.get(clave);
  if (!r) {
    const obj = new THREE.Group(), mt = crearModeloNaveTierra(), ma = crearModeloNaveAlien();
    obj.add(mt, ma);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX_BRILLO, color: 0x3ab8ff, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    halo.scale.setScalar(9); obj.add(halo);
    r = { obj, mt, ma, label: null, nombre: '', objetivo: V3(), yaw: 0, pitch: 0, roll: 0, escala: 1, nuevo: true };
    escena.add(obj); rivales.set(clave, r);
  }
  if (r.nombre !== nombre) {
    if (r.label) { r.obj.remove(r.label); r.label.material.map.dispose(); r.label.material.dispose(); }
    r.label = spriteTexto(nombre, '#bde4ff'); r.label.scale.set(10, 2.5, 1); r.label.position.set(0, 4.5, 0); r.obj.add(r.label); r.nombre = nombre;
  }
  r.mt.visible = faccion !== 'alien'; r.ma.visible = faccion === 'alien';
  return r;
}
function quitarRival(clave) {
  const r = rivales.get(clave); if (!r) return;
  escena.remove(r.obj);
  r.obj.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material && !MAT_COMPARTIDOS.has(o.material)) { if (o.material.map && o.material.map !== TEX_BRILLO) o.material.map.dispose(); o.material.dispose(); }
  });
  rivales.delete(clave);
}
function listaRivales() { return Array.from(rivales.values()); }
function actualizarRivales(dt) {
  const C = juego.carrera; if (!C) return;
  actualizarBots(dt);
  const vistos = new Set();
  bots.forEach((b) => {
    const r = obtenerRival(b.clave, b.nombre, b.faccion);
    puntoPista(b.t, r.objetivo); puntoPista(b.t + 0.03, _rv);
    _rv.sub(r.objetivo).normalize();
    _rv2.crossVectors(_rv, ARRIBA).normalize();
    r.objetivo.addScaledVector(_rv2, b.lado + Math.sin(b.t * 3) * 4).addScaledVector(ARRIBA, Math.cos(b.t * 2) * 3);
    r.yaw = Math.atan2(_rv.x, _rv.z); r.pitch = Math.asin(clamp(_rv.y, -1, 1)); r.roll = Math.sin(b.t * 3) * 0.3; r.escala = 1;
    vistos.add(b.clave);
  });
  for (const p of pilotosSala()) {
    if (p.isMe) continue;
    const pr = p.presence || {};
    if (pr.c !== C.id || typeof pr.x !== 'number') continue;
    const r = obtenerRival(p.peer, limpiarTexto(pr.n, 12) || 'Piloto', pr.f === 'alien' ? 'alien' : 'tierra');
    r.objetivo.set(clamp(numOk(pr.x, 0), -900, 900), clamp(numOk(pr.y, 0), -300, 300), clamp(numOk(pr.z, 0), -900, 900));
    r.yaw = numOk(pr.ry, 0); r.pitch = clamp(numOk(pr.rp, 0), -1.2, 1.2); r.roll = clamp(numOk(pr.rr, 0), -7, 7); r.escala = pr.gi ? 3 : 1;
    r.obj.visible = pr.vivo !== 0;
    C.remotos[p.peer] = { nombre: r.nombre, faccion: pr.f === 'alien' ? 'alien' : 'tierra', puntos: Math.max(0, Math.round(numOk(pr.p, 0))), prog: clamp(Math.round(numOk(pr.pr, 0)), 0, CARRERA.TOTAL), fin: typeof pr.fin === 'number' && isFinite(pr.fin) ? pr.fin : null, conectado: true };
    vistos.add(p.peer);
  }
  for (const k in C.remotos) if (!vistos.has(k)) C.remotos[k].conectado = false;
  for (const clave of Array.from(rivales.keys())) if (!vistos.has(clave)) quitarRival(clave);
  // Movimiento suave hacia la última posición conocida
  const k = 1 - Math.exp(-dt * 10);
  for (const [, r] of rivales) {
    if (r.nuevo) { r.obj.position.copy(r.objetivo); r.nuevo = false; } else r.obj.position.lerp(r.objetivo, k);
    _rv.set(Math.sin(r.yaw) * Math.cos(r.pitch), Math.sin(r.pitch), Math.cos(r.yaw) * Math.cos(r.pitch)).add(r.obj.position);
    r.obj.lookAt(_rv);
    r.mt.rotation.z = r.ma.rotation.z = r.roll;
    const e = lerp(r.mt.scale.x, r.escala, k); r.mt.scale.setScalar(e); r.ma.scale.setScalar(e);
    if (r.label) r.label.visible = r.obj.position.distanceTo(camara.position) > 28;
  }
}

// =====================================================================
// FLUJO DE LA CARRERA
// =====================================================================
function iniciarCarrera(cId, conBots) {
  Sonido.iniciar();
  limpiarNivel();
  const f = guardado.opciones.bandoCarrera === 'alien' ? 'alien' : 'tierra';
  juego.modo = 'carrera'; juego.faccion = f; juego.nivel = 1; juego.D = DIFICULTADES.normal;
  const st = guardado.stats;
  st.bandosJugados[f] = true;
  if (st.bandosJugados.tierra && st.bandosJugados.alien) desbloquearLogro('doble_agente');
  guardar();
  prepararJugador(f);
  const J = jugador;
  puntoPista(-0.4, J.pos);
  puntoPista(0, _rv); _rv.sub(J.pos).normalize();
  _rv2.crossVectors(_rv, ARRIBA).normalize();
  J.pos.addScaledVector(_rv2, rand(-11, 11)).addScaledVector(ARRIBA, rand(-6, 6));   // salida escalonada
  puntoPista(0, _rv); _rv.sub(J.pos).normalize();
  J.yaw = Math.atan2(_rv.x, _rv.z); J.pitch = Math.asin(clamp(_rv.y, -1, 1));
  J.fwd.copy(_rv); J.der.crossVectors(J.fwd, ARRIBA).normalize();
  _mira.copy(J.pos).add(J.fwd); J.obj.lookAt(_mira);
  camara.position.copy(J.pos).addScaledVector(J.fwd, -13).addScaledVector(ARRIBA, 4.2);
  camaraMira.copy(J.pos).addScaledVector(J.fwd, 25);
  aplicarCielo(CIELO_CARRERA);
  colocarAsteroidesCarrera();
  anillos.forEach((m) => (m.visible = true));
  juego.carrera = { id: cId, fase: 'cuenta', t: 0, tiempo: 0, prog: 0, fin: null, prev: J.pos.clone(), tEnem: 3, muertes: 0, tMeta: 0, ultN: 0, remotos: {}, resVisibles: false, tRes: 0, logroDado: false };
  Object.assign(juego, { fase: 'carrera', tFase: 0, puntaje: 0, racha: 0, lento: 1, tCapsula: 12, derribosNivel: 0, enemigosDerribados: 0, enemigosGenerados: 0, danioRecibido: false, opcionesMejora: [], mejoraPendiente: false });
  bots = conBots ? crearBots() : [];
  Red.est = 'cuenta'; Red.cId = cId; Red.ultimaC = cId; enviarPresencia(true);
  programarEvento(true);
  grupoMenu.visible = false;
  mostrarElem('hud', true); mostrarElem('tactil', modoTactil); mostrarPantalla(null);
  for (const k in hudCache) delete hudCache[k];
  juego.estado = 'jugando';
  mensajeRadio(bots.length ? 'Carrera contra 3 bots: pasa por los anillos verdes y derriba enemigos.' : '¡Carrera en línea! Pasa por los anillos verdes y derriba enemigos.', 4);
  Sonido.musica('batalla'); Sonido.motorIniciar();
  if (modoTactil) pantallaCompleta(); else bloquearPuntero();
  revisarOrientacion();
}

function pasarAnillo() {
  const C = juego.carrera, J = jugador;
  C.prog++;
  sumarPuntos(50);
  Sonido.sfx.recoger();
  Particulas.emitir(J.pos, 16, 0x5dff9a, 16, 0.5);
  if (C.prog >= CARRERA.TOTAL) { llegarMeta(); return; }
  if (C.prog > 1 && (C.prog - 1) % CARRERA.ANILLOS === 0) {
    const v = vueltaDe(C.prog);
    sumarPuntos(300); juego.nivel = v;
    mostrarMensaje(v === CARRERA.VUELTAS ? '¡ÚLTIMA VUELTA!' : 'VUELTA ' + v + ' / ' + CARRERA.VUELTAS, 1.8);
    Sonido.sfx.faseJefe();
  }
}
function llegarMeta() {
  const C = juego.carrera;
  C.fin = C.tiempo; C.fase = 'meta'; juego.fase = 'meta'; C.tMeta = 0;
  Red.est = 'meta'; enviarPresencia(true);
  mostrarMensaje('🏁 ¡META!\n' + formatoTiempo(C.fin), 2.2);
  Sonido.sfx.victoria();
}
function reaparecer() {
  const C = juego.carrera, J = jugador;
  const ultimo = C.prog > 0 ? (C.prog - 1) % CARRERA.ANILLOS : 0;
  puntoPista(C.prog > 0 ? ultimo + 0.15 : -0.4, J.pos);
  anilloSiguiente().getWorldPosition(_rv); _rv.sub(J.pos).normalize();
  J.yaw = Math.atan2(_rv.x, _rv.z); J.pitch = Math.asin(clamp(_rv.y, -1, 1));
  J.vida = J.vidaMax; J.escudo = J.escudoMax; J.invT = 2.5; J.vivo = true; J.obj.visible = true; J.vel = J.st.vel;
  if (J.velLat) J.velLat.set(0, 0, 0);
  C.prev.copy(J.pos);
  juego.fase = 'carrera'; juego.tFase = 0;
  Sonido.motorIniciar();
  mensajeRadio('De vuelta en la carrera (−300 puntos)', 2);
}
function formatoTiempo(s) { s = Math.max(0, s || 0); const m = Math.floor(s / 60), r = Math.floor(s % 60); return m + ':' + (r < 10 ? '0' : '') + r; }

function actualizarCarrera(dt) {
  const C = juego.carrera, J = jugador; if (!C) return;
  C.t += dt;
  if (C.fase === 'cuenta') {
    const n = 3 - Math.floor(C.t);
    if (n >= 1 && n !== C.ultN) { C.ultN = n; mostrarMensaje(String(n), 0.9); Sonido.sfx.ui(); }
    if (C.t >= 3) { C.fase = 'carrera'; C.t = 0; mostrarMensaje('¡YA!', 1.2); Sonido.sfx.uiConfirmar(); Red.est = 'carrera'; enviarPresencia(true); }
    C.prev.copy(J.pos);
    actualizarRivales(dt); actualizarAnillos(); enviarPresencia();
    return;
  }
  if (C.fase === 'carrera') C.tiempo += dt;
  juego.tFase += dt;
  if (juego.fase === 'reaparecer') { if (juego.tFase > 3) reaparecer(); }
  else if (J.vivo && C.fase === 'carrera') {
    // ¿Cruzó el anillo siguiente? (pasó de un lado al otro de su plano, cerca del centro)
    const r = anillos[C.prog % CARRERA.ANILLOS], n = r.userData.normal;
    _a.subVectors(C.prev, r.position); _b.subVectors(J.pos, r.position);
    if (_a.dot(n) < 0 && _b.dot(n) >= 0 && _b.length() < CARRERA.RADIO + 3 * J.escalaVis) pasarAnillo();
    // Enemigos que aparecen más adelante en la pista
    C.tEnem -= dt;
    if (C.tEnem <= 0) {
      C.tEnem = rand(2.5, 4);
      let vivos = 0; for (const e of enemigos) if (e.activo && !e.aliado) vivos++;
      const v = vueltaDe(C.prog);
      if (vivos < 3 + v * 2) {
        const nE = Math.random() < 0.4 ? 2 : 1;
        for (let k = 0; k < nE; k++) {
          puntoPista(C.prog + rand(0.5, 1.8), _c).add(vecAleatorio(_d, rand(15, 45)));
          limitarArena(_c);
          const e = generarEnemigo(elegirPonderado(pesosCarrera(v)), _c);
          if (Math.random() < 0.06) hacerElite(e);
        }
      }
    }
  }
  C.prev.copy(J.pos);
  for (const e of enemigos) if (e.activo && !e.aliado && e.pos.distanceTo(J.pos) > 520) { e.activo = false; e.modelo.visible = false; }
  if (C.fase === 'carrera' && C.tiempo > CARRERA.LIMITE) { mostrarMensaje('⏱ TIEMPO AGOTADO', 2); C.fase = 'meta'; juego.fase = 'meta'; Red.est = 'meta'; enviarPresencia(true); }
  if (C.fase === 'meta') { C.tMeta += dt; if (C.tMeta > 2.2) mostrarResultados(); }
  actualizarRivales(dt); actualizarAnillos(); enviarPresencia();
}

// ---------- Tabla de pilotos ----------
function fraccionYo() {
  const s = anilloSiguiente(); if (!s) return 0;
  return clamp(1 - s.position.distanceTo(jugador.pos) / LARGO_SEG, 0, 0.99);
}
function corredores() {
  const C = juego.carrera; if (!C) return [];
  const l = [{ nombre: apodo(), yo: true, faccion: juego.faccion, puntos: juego.puntaje, prog: C.prog, frac: fraccionYo(), fin: C.fin, conectado: true }];
  bots.forEach((b) => l.push({ nombre: b.nombre, bot: true, faccion: b.faccion, puntos: b.puntos, prog: b.prog, frac: b.t - Math.floor(b.t), fin: b.fin, conectado: true }));
  for (const k in C.remotos) { const r = C.remotos[k]; l.push(Object.assign({ frac: 0.5 }, r)); }
  // Bono por puesto de llegada
  const llegaron = l.filter((x) => x.fin != null).sort((a, b) => a.fin - b.fin);
  l.forEach((x) => { const i = llegaron.indexOf(x); x.bono = i < 0 ? 0 : (BONO_PUESTO[i] || 100); x.total = x.puntos + x.bono; });
  return l;
}
function ordenCarrera(l) {   // posición en la pista (para el puesto en vivo)
  return l.slice().sort((a, b) => {
    if ((a.fin != null) !== (b.fin != null)) return a.fin != null ? -1 : 1;
    if (a.fin != null) return a.fin - b.fin;
    return (b.prog + b.frac) - (a.prog + a.frac);
  });
}
function textosHUDCarrera() {
  const C = juego.carrera; if (!C) return ['🏁 CARRERA', ''];
  const l = corredores(), puesto = ordenCarrera(l).findIndex((x) => x.yo) + 1;
  const v = vueltaDe(Math.max(1, C.prog));
  let obj;
  if (C.fase === 'cuenta') obj = 'Prepárate…';
  else if (C.fin != null) obj = '🏁 Llegaste ' + puesto + 'º · ' + formatoTiempo(C.fin);
  else if (juego.fase === 'reaparecer') obj = 'Reapareciendo…';
  else obj = 'Anillo ' + ((C.prog % CARRERA.ANILLOS) + 1) + '/' + CARRERA.ANILLOS + ' · Puesto ' + puesto + 'º de ' + l.length + ' · ' + formatoTiempo(C.tiempo);
  if (C.prog === CARRERA.TOTAL - 1 && C.fin == null && C.fase === 'carrera') obj = '¡Cruza la META! · Puesto ' + puesto + 'º · ' + formatoTiempo(C.tiempo);
  return ['🏁 CARRERA · VUELTA ' + v + ' / ' + CARRERA.VUELTAS, obj];
}
let tTablaCarrera = 0;
function actualizarHUDCarrera(dt) {
  const caja = E('tablaCarrera');
  if (juego.modo !== 'carrera' || !juego.carrera) { if (caja.innerHTML) caja.innerHTML = ''; return; }
  tTablaCarrera -= dt; if (tTablaCarrera > 0) return; tTablaCarrera = 0.25;
  const l = corredores().sort((a, b) => b.total - a.total);
  caja.innerHTML = l.map((x, i) => '<div' + (x.yo ? ' class="yo"' : '') + '>' + (i + 1) + '. ' + escaparHTML(x.nombre) + ' · ' + x.total.toLocaleString('es') +
    (x.fin != null ? ' 🏁' : ' · V' + vueltaDe(Math.max(1, x.prog))) + (x.conectado ? '' : ' ✖') + '</div>').join('');
}

// ---------- Resultados ----------
function mostrarResultados() {
  const C = juego.carrera; if (!C || C.resVisibles) return;
  C.resVisibles = true;
  juego.estado = 'fin';
  Sonido.motorDetener(); Sonido.musica('menu');
  liberarPuntero(); mostrarElem('tactil', false);
  renderResultados();
  mostrarPantalla('pResCarrera');
}
function renderResultados() {
  const C = juego.carrera; if (!C) return;
  const l = corredores().sort((a, b) => b.total - a.total);
  const faltan = l.filter((x) => x.fin == null && x.conectado && !x.yo).length;
  const final = faltan === 0 || C.tRes > 120;
  const yoPrimero = l[0] && l[0].yo && l.length > 1;
  $('tituloRes').textContent = final ? (yoPrimero ? '🏆 ¡GANASTE LA CARRERA!' : 'RESULTADOS FINALES') : 'RESULTADOS (EN VIVO)';
  $('tablaRes').innerHTML = '<table class="tabla-res"><tr><th>#</th><th>Piloto</th><th>Llegada</th><th>Puntos</th><th>Bono</th><th>Total</th></tr>' +
    l.map((x, i) => '<tr' + (x.yo ? ' class="yo"' : '') + '><td>' + (i + 1) + '</td><td>' + (x.faccion === 'alien' ? '👾 ' : '🛡️ ') + escaparHTML(x.nombre) + (x.yo ? ' (tú)' : '') + '</td><td>' +
      (x.fin != null ? formatoTiempo(x.fin) : x.conectado ? 'corriendo (V' + vueltaDe(Math.max(1, x.prog)) + ')' : 'se desconectó') + '</td><td>' + x.puntos.toLocaleString('es') + '</td><td>+' + x.bono.toLocaleString('es') + '</td><td><b>' + x.total.toLocaleString('es') + '</b></td></tr>').join('') + '</table>';
  $('notaRes').innerHTML = final
    ? 'Muertes: <b>' + C.muertes + '</b> · Naves derribadas: <b>' + juego.derribosNivel + '</b>'
    : '⏳ Esperando a que ' + (faltan === 1 ? 'llegue 1 piloto' : 'lleguen ' + faltan + ' pilotos') + '… la tabla se actualiza sola.';
  if (final && !C.logroDado) { C.logroDado = true; if (yoPrimero) desbloquearLogro('campeon'); if (C.fin != null && C.muertes === 0) desbloquearLogro('sin_bajas'); guardar(); }
}
/** Se llama en cada cuadro mientras se ven los resultados: sigue moviendo rivales y actualiza la tabla. */
function actualizarFinCarrera(dt) {
  const C = juego.carrera; if (!C) return;
  C.tRes += dt;
  if (C.fase === 'carrera') C.tiempo += dt;
  actualizarRivales(dt); actualizarAnillos(); enviarPresencia();
  C.tTabla = (C.tTabla || 0) - dt;
  if (C.tTabla <= 0 && pantallaActual === 'pResCarrera') { C.tTabla = 0.5; renderResultados(); }
}
function limpiarCarrera() {
  anillos.forEach((m) => (m.visible = false));
  for (const clave of Array.from(rivales.keys())) quitarRival(clave);
  bots = []; juego.carrera = null;
  E('tablaCarrera').innerHTML = '';
}
function volverLobby() { irAlMenu(); abrirLobby(); }

// =====================================================================
// 17. CAMPAÑAS Y NIVELES
//     Los Militares de la Tierra enfrentan a los jefes alienígenas y los
//     Alienígenas enfrentan a los jefes militares. Para intercambiarlo,
//     cambia el valor "jefe" de cada nivel.
// =====================================================================
const NIVELES = {
  tierra: [
    { nombre: 'Órbita de Marte', jefe: 'reina', pesos: { caza: 0.6, kamikaze: 0.4 }, total: 14, simultaneos: 5, asteroides: 10,
      eventos: ['meteoritos', 'emboscada'],
      cielo: { planeta: 0xc1583a, anillo: false, neb: [0x5a1a6a, 0x1a3a8a], niebla: 0x0a0614 },
      radio: 'Comando Tierra: Una flota alienígena se acerca a Marte. ¡Intercéptala, piloto!' },
    { nombre: 'Cinturón de Asteroides', jefe: 'devorador', pesos: { caza: 0.4, kamikaze: 0.25, pesado: 0.15, interceptor: 0.2 }, total: 20, simultaneos: 6, asteroides: 26, asteroidesMoviles: true,
      eventos: ['meteoritos', 'meteoritos', 'emboscada'],
      cielo: { planeta: 0x9a7a5a, anillo: true, neb: [0x6a2a1a, 0x2a1a5a], niebla: 0x0c0808 },
      radio: 'Comando Tierra: Los asteroides se mueven y algo enorme se esconde entre ellos. ¡Cuidado!' },
    { nombre: 'Nebulosa del Vacío', jefe: 'oraculo', pesos: { caza: 0.3, kamikaze: 0.2, pesado: 0.15, interceptor: 0.15, minador: 0.1, francotirador: 0.1 }, total: 26, simultaneos: 8, asteroides: 12,
      eventos: ['tormenta', 'agujero', 'meteoritos'],
      cielo: { planeta: 0x6a3aba, anillo: true, neb: [0x7a1a9a, 0x3a0a6a], niebla: 0x0e0618 },
      radio: 'Comando Tierra: La nebulosa interfiere con los instrumentos... confía en tus reflejos.' },
    { nombre: 'Trono de Zorgon', jefe: 'zorgon', pesos: { caza: 0.25, kamikaze: 0.15, pesado: 0.15, interceptor: 0.15, minador: 0.1, francotirador: 0.1, escudero: 0.1 }, total: 32, simultaneos: 9, asteroides: 14,
      eventos: ['agujero', 'meteoritos', 'emboscada', 'tormenta'],
      cielo: { planeta: 0x2a8a4a, anillo: true, neb: [0x1a6a2a, 0x5a0a4a], niebla: 0x040c06 },
      radio: 'Comando Tierra: Este es el trono del Emperador Zorgon. Todo depende de ti.' }
  ],
  alien: [
    { nombre: 'Órbita Terrestre', jefe: 'coloso', pesos: { caza: 0.6, kamikaze: 0.4 }, total: 14, simultaneos: 5, asteroides: 10,
      eventos: ['meteoritos', 'emboscada'],
      cielo: { planeta: 0x2a6ad8, anillo: false, neb: [0x0a3a8a, 0x1a6a8a], niebla: 0x050a18 },
      radio: 'Mente Colmena: La órbita terrestre está defendida. Destruye sus defensas.' },
    { nombre: 'Frente Lunar', jefe: 'fenix', pesos: { caza: 0.4, kamikaze: 0.25, pesado: 0.15, interceptor: 0.2 }, total: 20, simultaneos: 6, asteroides: 22, asteroidesMoviles: true,
      eventos: ['meteoritos', 'meteoritos', 'emboscada'],
      cielo: { planeta: 0x9a9aa0, anillo: false, neb: [0x3a3a6a, 0x1a2a4a], niebla: 0x08080e },
      radio: 'Mente Colmena: Los humanos envían bombarderos desde la Luna. Derríbalos.' },
    { nombre: 'Estación Ícaro', jefe: 'icaro', pesos: { caza: 0.3, kamikaze: 0.2, pesado: 0.15, interceptor: 0.15, minador: 0.1, francotirador: 0.1 }, total: 26, simultaneos: 8, asteroides: 12,
      eventos: ['tormenta', 'emboscada', 'meteoritos'],
      cielo: { planeta: 0xd8a03a, anillo: true, neb: [0x6a4a0a, 0x0a2a6a], niebla: 0x0e0a04 },
      radio: 'Mente Colmena: Su mejor piloto te desafía. Demuestra la superioridad de la Colmena.' },
    { nombre: 'Flota Aegis', jefe: 'aegis', pesos: { caza: 0.25, kamikaze: 0.15, pesado: 0.15, interceptor: 0.15, minador: 0.1, francotirador: 0.1, escudero: 0.1 }, total: 32, simultaneos: 9, asteroides: 14,
      eventos: ['agujero', 'meteoritos', 'emboscada', 'tormenta'],
      cielo: { planeta: 0x3a8ad8, anillo: true, neb: [0x0a4a9a, 0x2a0a5a], niebla: 0x040814 },
      radio: 'Mente Colmena: La flota Aegis es su última esperanza. Aplástala.' }
  ]
};
const NOMBRE_BANDO = { tierra: 'MILITARES DE LA TIERRA', alien: 'ALIENÍGENAS INVASORES' };
const EPILOGO = {
  tierra: 'El Emperador Zorgon ha caído y la invasión se desmorona. La Tierra está a salvo gracias a ti, piloto. Tu nombre quedará grabado en la historia de la galaxia.',
  alien: 'La flota Aegis ha sido aniquilada. Sin defensas, la Tierra se rinde ante la Colmena. La galaxia entera ahora pertenece a los invasores.'
};
const nivelActual = () => NIVELES[juego.faccion][juego.nivel - 1];

// =====================================================================
// 18. FLUJO DE NIVEL: oleadas → alerta → jefe → victoria
// =====================================================================
function limpiarNivel() {
  for (const e of enemigos) { e.activo = false; e.modelo.visible = false; }
  enemigos.length = 0;
  for (const b of balasJ.items) { b.activo = false; b.malla.visible = false; }
  for (const b of balasE.items) { b.activo = false; b.malla.visible = false; }
  for (const m of misiles.items) desactivarMisil(m);
  for (const m of mejoras.items) { m.activo = false; m.grupo.visible = false; }
  for (const ex of explosiones.items) { ex.activo = false; ex.malla.visible = false; }
  Particulas.limpiar();
  eliminarJefe();
  colocarAsteroides(0, 1);
  jugador.invertidoT = 0;
  juego.sacudida = 0;
  limpiarPoderes();
  limpiarPeligros();
  limpiarCarrera();
}

function iniciarNivel(faccion, nivel) {
  Sonido.iniciar();
  juego.modo = 'campana';
  juego.faccion = faccion; juego.nivel = nivel;
  const st = guardado.stats;
  st.bandosJugados[faccion] = true;
  if (st.bandosJugados.tierra && st.bandosJugados.alien) desbloquearLogro('doble_agente');
  guardado.continuar = { faccion, nivel };
  guardar();

  limpiarNivel();
  prepararJugador(faccion);
  const N = nivelActual();
  aplicarCielo(N.cielo);
  const factorAst = guardado.opciones.calidad === 'baja' ? 0.6 : 1;
  colocarAsteroides(Math.round(N.asteroides * factorAst), nivel * 31 + (faccion === 'tierra' ? 7 : 13), !!N.asteroidesMoviles);

  juego.fase = 'oleadas'; juego.tFase = 0;
  juego.enemigosGenerados = 0; juego.enemigosDerribados = 0; juego.derribosNivel = 0;
  juego.tSpawn = 2.5; juego.danioRecibido = false;
  juego.racha = 0; juego.lento = 1; juego.tCapsula = 8; juego.opcionesMejora = []; juego.mejoraPendiente = false;
  juego.D = DIFICULTADES[guardado.opciones.dificultad] || DIFICULTADES.normal;
  juego.totalNivel = Math.round(N.total * juego.D.cantidad);
  juego.simultNivel = Math.round(N.simultaneos * Math.sqrt(juego.D.cantidad));
  juego.puntaje = juego.puntajeInicio = nivel === 1 ? 0 : (guardado.puntajes[faccion] || 0);

  grupoMenu.visible = false;
  mostrarElem('hud', true);
  mostrarElem('tactil', modoTactil);
  mostrarPantalla(null);
  for (const k in hudCache) delete hudCache[k];
  juego.estado = 'jugando';
  mostrarMensaje('NIVEL ' + nivel + '\n' + N.nombre.toUpperCase(), 3);
  mensajeRadio(N.radio, 5);
  Sonido.musica('batalla');
  Sonido.motorIniciar();
  Sonido.sfx.uiConfirmar();
  if (modoTactil) pantallaCompleta(); else bloquearPuntero();
  revisarOrientacion();
}

function actualizarNivel(dt) {
  const N = nivelActual();
  juego.tFase += dt;
  if (juego.fase === 'oleadas') {
    juego.tSpawn -= dt;
    let vivos = 0;
    for (const e of enemigos) if (e.activo && e.deOleada) vivos++;
    if (juego.enemigosGenerados < juego.totalNivel && vivos < juego.simultNivel && juego.tSpawn <= 0) {
      juego.tSpawn = rand(0.6, 1.4);
      const e = generarEnemigo(elegirPonderado(N.pesos), posicionAparicion(_c));
      e.deOleada = true; juego.enemigosGenerados++;
      if (Math.random() < (0.03 + 0.05 * (juego.nivel - 1)) * juego.D.cantidad) hacerElite(e);   // ÉLITE
      Particulas.emitir(e.pos, 10, 0xffffff, 12, 0.5);
    }
    if (juego.enemigosDerribados >= juego.totalNivel) {
      juego.fase = 'alertaJefe'; juego.tFase = 0;
      mostrarMensaje('⚠ ¡ALERTA! ⚠\n' + JEFES[N.jefe].nombre + ' SE APROXIMA', 3);
      Sonido.sfx.alerta();
      Sonido.musica('jefe');
      soltarMejora(_c.copy(jugador.pos).addScaledVector(jugador.fwd, 40), 'escudo');
    }
  } else if (juego.fase === 'alertaJefe') {
    if (juego.tFase > 3.2) { juego.fase = 'jefe'; crearJefe(N.jefe); }
  } else if (juego.fase === 'completado') {
    if (juego.tFase > 2.8) mostrarVictoria();
  } else if (juego.fase === 'derrota') {
    if (juego.tFase > 2.2) mostrarDerrota();
  }
}

function nivelCompletado() {
  const f = juego.faccion, n = juego.nivel, st = guardado.stats;
  juego.fase = 'completado'; juego.tFase = 0;
  const idJefe = nivelActual().jefe;
  st.jefesDerrotados[idJefe] = true;
  desbloquearLogro('primer_jefe');
  if (Object.keys(st.jefesDerrotados).length >= 8) desbloquearLogro('leyenda');
  juego.bonusSinDanio = 0;
  if (!juego.danioRecibido) { desbloquearLogro('intocable'); juego.bonusSinDanio = 1000; sumarPuntos(1000); }
  // Mejora de nave: una por cada nivel 1-3 superado (se elige en la pantalla de victoria)
  juego.opcionesMejora = (n < 4 && (guardado.mejorasNave[f] || []).length < n) ? opcionesMejoraNave(f) : [];
  juego.mejoraPendiente = juego.opcionesMejora.length > 0; juego.mejoraElegida = null;
  guardado.progreso[f] = Math.max(guardado.progreso[f], n);
  guardado.puntajes[f] = juego.puntaje;
  guardado.continuar = { faccion: f, nivel: Math.min(4, n + 1) };
  if (n === 4) desbloquearLogro(f === 'tierra' ? 'defensor' : 'conquistador');
  if (guardado.opciones.dificultad === 'pesadilla') desbloquearLogro('pesadilla');
  guardar();
}

function mostrarVictoria() {
  juego.estado = 'fin';
  Sonido.motorDetener(); Sonido.musica('menu'); Sonido.sfx.victoria();
  liberarPuntero(); mostrarElem('tactil', false);
  if (juego.nivel >= 4) {
    $('textoFin').innerHTML = EPILOGO[juego.faccion] + '<br><br>Puntaje final: <b>' + juego.puntaje.toLocaleString('es') + '</b>';
    mostrarPantalla('pFin');
    return;
  }
  $('resumenVictoria').innerHTML =
    'Jefe derrotado: <b>' + JEFES[nivelActual().jefe].nombre + '</b><br>' +
    'Naves derribadas: <b>' + juego.derribosNivel + '</b><br>' +
    (juego.bonusSinDanio ? 'Bonus sin daño: <b>+1000</b><br>' : '') +
    'Puntaje: <b>' + juego.puntaje.toLocaleString('es') + '</b><br>' +
    'Siguiente: <b>Nivel ' + (juego.nivel + 1) + ' · ' + NIVELES[juego.faccion][juego.nivel].nombre + '</b>';
  mostrarPantalla('pVictoria');
  renderEligeMejora();
}
function mostrarDerrota() {
  juego.estado = 'fin';
  Sonido.musica('menu'); Sonido.sfx.derrota();
  liberarPuntero(); mostrarElem('tactil', false);
  guardar();
  $('resumenDerrota').innerHTML =
    'Nivel ' + juego.nivel + ' · <b>' + nivelActual().nombre + '</b><br>' +
    'Naves derribadas: <b>' + juego.derribosNivel + '</b><br>' +
    'Puntaje: <b>' + juego.puntaje.toLocaleString('es') + '</b><br>' +
    '<span style="opacity:.75">Consejo: usa la ESQUIVA para atravesar las ráfagas sin recibir daño.</span>';
  mostrarPantalla('pDerrota');
}

// =====================================================================
// 19. LOGROS: aviso emergente
// =====================================================================
function desbloquearLogro(id) {
  if (guardado.logros[id]) return;
  const l = LOGROS.find((x) => x.id === id); if (!l) return;
  guardado.logros[id] = Date.now();
  guardar();
  avisoToast(l.icono, '¡LOGRO DESBLOQUEADO!', l.nombre);
}

// =====================================================================
// 20. HUD
// =====================================================================
const elems = {};
const E = (id) => elems[id] || (elems[id] = $(id));
const hudCache = {};
function setTexto(id, txt) { if (hudCache[id] !== txt) { hudCache[id] = txt; E(id).textContent = txt; } }
function setAncho(id, frac) { const v = Math.round(clamp(frac, 0, 1) * 1000) / 10; if (hudCache[id] !== v) { hudCache[id] = v; E(id).style.width = v + '%'; } }
function mostrarElem(id, vis) { E(id).classList.toggle('oculto', !vis); }

let tMensaje = 0, tRadio = 0, tFlash = 0, tRadar = 0, tFijado = 0;
let objetivoFijado = null;
function mostrarMensaje(txt, dur = 2.5) { E('mensajeCentral').textContent = txt; E('mensajeCentral').classList.add('visible'); tMensaje = dur; }
function mensajeRadio(txt, dur = 3.5) { E('mensajeRadio').textContent = txt; E('mensajeRadio').classList.add('visible'); tRadio = dur; }
function flashDanio(escudo) { const f = E('danioFlash'); f.classList.toggle('escudo', escudo); f.style.opacity = escudo ? '0.5' : '0.9'; tFlash = 0.15; }

/** Convierte una posición 3D a coordenadas de pantalla. Devuelve false si está detrás. */
function aPantalla(pos, out) {
  _proj.copy(pos).project(camara);
  if (_proj.z > 1) return false;
  out.x = (_proj.x * 0.5 + 0.5) * window.innerWidth;
  out.y = (-_proj.y * 0.5 + 0.5) * window.innerHeight;
  return true;
}
const _pant = { x: 0, y: 0 };

function actualizarHUD(dt) {
  const J = jugador, S = STATS_JUGADOR[juego.faccion], N = juego.modo !== 'campana' ? null : nivelActual();
  setAncho('barraVida', J.vida / J.vidaMax);
  setAncho('barraEscudo', J.escudo / J.escudoMax);
  setTexto('txtArma', S.arma.toUpperCase() + ' NV.' + J.nivelArma);
  setTexto('txtMisiles', S.secundaria.toUpperCase() + ': ' + J.municion);
  setTexto('txtEsquiva', 'ESQUIVA: ' + (J.cargasEsquiva > 0 ? 'lista' + (J.st.esquivas > 1 ? ' (' + J.cargasEsquiva + ')' : '') : 'recargando'));
  E('btnEsquiva').classList.toggle('enfriando', J.cargasEsquiva <= 0);
  // Poderes activos con su tiempo restante
  let txtP = '';
  for (const id in J.poderes) if (J.poderes[id] > 0) txtP += PODERES[id].icono + ' ' + PODERES[id].nombre + ' ' + Math.ceil(J.poderes[id]) + 's\n';
  if (J.pendiente) txtP += PODERES[J.pendiente].icono + ' ' + PODERES[J.pendiente].nombre + ' (esperando enemigos)\n';
  setTexto('txtPoderes', txtP);
  setTexto('txtRacha', juego.racha >= 2 ? '🔥 RACHA x' + juego.racha : '');
  E('tinteLento').style.opacity = J.poderes.lento > 0 ? '1' : '0';
  actualizarHUDCarrera(dt);
  setTexto('txtPuntaje', juego.puntaje.toLocaleString('es'));
  let obj = '';
  if (!N && juego.modo === 'carrera') { const tc = textosHUDCarrera(); setTexto('txtNivel', tc[0]); obj = tc[1]; }
  else if (!N) {   // MODO INFINITO
    setTexto('txtNivel', '∞ MODO INFINITO · SECTOR ' + juego.sector);
    obj = Math.floor(juego.distancia).toLocaleString('es') + ' m' + (juego.racha >= 10 ? ' · COMBO x' + multCombo().toFixed(1) : '');
    if (juego.jefe && !juego.jefe.muriendo) obj = 'MINI-JEFE: ' + juego.jefe.objetivo;
  } else {
    setTexto('txtNivel', (juego.faccion === 'tierra' ? 'TIERRA' : 'INVASIÓN') + ' · NIVEL ' + juego.nivel + ' · ' + N.nombre.toUpperCase() + (juego.D !== DIFICULTADES.normal ? ' · ' + juego.D.nombre : ''));
    if (juego.fase === 'oleadas') obj = 'Derriba enemigos: ' + juego.enemigosDerribados + ' / ' + juego.totalNivel;
    else if (juego.fase === 'alertaJefe') obj = '⚠ Jefe aproximándose...';
    else if (juego.fase === 'jefe' && juego.jefe) obj = juego.jefe.objetivo;
    else if (juego.fase === 'muerteJefe' || juego.fase === 'completado') obj = '¡Victoria!';
  }
  setTexto('txtObjetivo', obj);
  const j = juego.jefe;
  if (j && !j.muriendo) {
    let v = 0; for (const p of j.partes) if (p.cuenta) v += Math.max(0, p.vida);
    setAncho('barraJefe', v / j.vidaTotal);
  }
  // Mira (donde apunta la nave)
  if (J.vivo && aPantalla(_a.copy(J.pos).addScaledVector(J.fwd, 150), _pant)) {
    E('mira').style.transform = 'translate(' + (_pant.x - window.innerWidth / 2) + 'px,' + (_pant.y - window.innerHeight / 2) + 'px)';
  }
  // Indicador de fijado de misil
  tFijado -= dt;
  if (tFijado <= 0) { tFijado = 0.1; const l = J.municion > 0 ? listaObjetivosMisil() : []; objetivoFijado = l.length ? l[0] : null; }
  const fijo = objetivoFijado && objetivoVivo(objetivoFijado) && J.vivo && aPantalla(posObjetivo(objetivoFijado), _pant);
  mostrarElem('fijado', !!fijo);
  if (fijo) { E('fijado').style.left = _pant.x + 'px'; E('fijado').style.top = _pant.y + 'px'; }
  // Avisos
  mostrarElem('avisoInvertido', J.invertidoT > 0);
  E('tintePsiquico').style.opacity = J.invertidoT > 0 ? '1' : '0';
  mostrarElem('avisoRaton', !modoTactil && document.pointerLockElement !== canvas);
  if (tMensaje > 0) { tMensaje -= dt; if (tMensaje <= 0) E('mensajeCentral').classList.remove('visible'); }
  if (tRadio > 0) { tRadio -= dt; if (tRadio <= 0) E('mensajeRadio').classList.remove('visible'); }
  if (tFlash > 0) { tFlash -= dt; if (tFlash <= 0) E('danioFlash').style.opacity = '0'; }
  E('mira').classList.toggle('enMira', !!(J.vivo && mejorObjetivo(modoTactil ? 0.3 : 0.2, 520)));
  dibujarMarcadores();
  tRadar -= dt;
  if (tRadar <= 0) { tRadar = 0.066; dibujarRadar(); }
}

// ---------- Marcadores: recuadros sobre enemigos visibles y flechas hacia los que están fuera de pantalla ----------
const capaMarcas = $('marcadores'), ctxMarcas = capaMarcas.getContext('2d');
const _cam = V3();
function dibujarMarcadores() {
  const w = window.innerWidth, h = window.innerHeight, c = ctxMarcas;
  if (capaMarcas.width !== w || capaMarcas.height !== h) { capaMarcas.width = w; capaMarcas.height = h; }
  c.clearRect(0, 0, w, h);
  if (!jugador.vivo || juego.tormenta) return;
  c.lineWidth = 2.5;
  function marca(pos, color, jefe) {
    _cam.copy(pos).applyMatrix4(camara.matrixWorldInverse);
    const delante = _cam.z < 0;
    const dist = pos.distanceTo(jugador.pos);
    let x = 0, y = 0, dentro = false;
    if (delante) {
      _proj.copy(pos).project(camara);
      x = (_proj.x * 0.5 + 0.5) * w; y = (-_proj.y * 0.5 + 0.5) * h;
      dentro = x > 30 && x < w - 30 && y > 30 && y < h - 30;
    }
    c.strokeStyle = color; c.fillStyle = color;
    if (dentro) {
      // Recuadro de esquinas: más grande cuanto más cerca
      const t = clamp((jefe ? 1400 : 700) / dist, jefe ? 22 : 14, jefe ? 70 : 40), l = t * 0.45;
      c.globalAlpha = 0.95;
      c.beginPath();
      c.moveTo(x - t, y - t + l); c.lineTo(x - t, y - t); c.lineTo(x - t + l, y - t);
      c.moveTo(x + t - l, y - t); c.lineTo(x + t, y - t); c.lineTo(x + t, y - t + l);
      c.moveTo(x + t, y + t - l); c.lineTo(x + t, y + t); c.lineTo(x + t - l, y + t);
      c.moveTo(x - t + l, y + t); c.lineTo(x - t, y + t); c.lineTo(x - t, y + t - l);
      c.stroke();
      return;
    }
    // Fuera de pantalla: flecha en el borde apuntando hacia el enemigo
    let dx = _cam.x, dy = -_cam.y;
    if (Math.abs(dx) + Math.abs(dy) < 1e-3) dy = 1;
    const ang = Math.atan2(dy, dx), m = 46;
    const ex = (w / 2 - m) / Math.max(Math.abs(Math.cos(ang)), 1e-3), ey = (h / 2 - m) / Math.max(Math.abs(Math.sin(ang)), 1e-3);
    const r = Math.min(ex, ey), ax = w / 2 + Math.cos(ang) * r, ay = h / 2 + Math.sin(ang) * r;
    const s = jefe ? 16 : 11;
    c.globalAlpha = dist < 250 ? 0.95 : 0.6;
    c.save(); c.translate(ax, ay); c.rotate(ang);
    c.beginPath(); c.moveTo(s, 0); c.lineTo(-s * 0.7, s * 0.75); c.lineTo(-s * 0.7, -s * 0.75); c.closePath(); c.fill();
    c.restore();
  }
  for (const k of capsulas.items) if (k.activo && k.grupo.visible) marca(k.grupo.position, k.colorCss, false);
  if (juego.modo === 'carrera') { const sig = anilloSiguiente(); if (sig) marca(sig.position, '#5dff9a', true); for (const r of listaRivales()) if (r.obj.visible) marca(r.obj.position, '#3ab8ff', false); }
  for (const e of enemigos) if (e.activo) marca(e.pos, e.aliado ? '#5dff9a' : e.elite ? '#ffd166' : e.tipo === 'senuelo' ? '#c98bff' : '#ff4d6d', false);
  const j = juego.jefe;
  if (j && !j.muriendo && j.entrada >= 1) marca(j.grupo.position, '#ffb703', true);
  c.globalAlpha = 1;
}

// ---------- Radar ----------
const radarCtx = $('radar').getContext('2d');
function dibujarRadar() {
  const c = radarCtx, R = 56, cx = 60, cy = 60, rango = 420, J = jugador;
  c.clearRect(0, 0, 120, 120);
  c.globalAlpha = 1;
  if (juego.tormenta) {   // TORMENTA DE IONES: radar con estática
    c.fillStyle = 'rgba(10,25,60,0.6)'; c.beginPath(); c.arc(cx, cy, R + 2, 0, Math.PI * 2); c.fill();
    for (let i = 0; i < 70; i++) { c.fillStyle = 'rgba(180,200,255,' + Math.random() * 0.8 + ')'; const a = Math.random() * 6.28, r = Math.random() * R; c.fillRect(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 2, 2); }
    return;
  }
  c.fillStyle = 'rgba(10,25,60,0.6)';
  c.beginPath(); c.arc(cx, cy, R + 2, 0, Math.PI * 2); c.fill();
  c.strokeStyle = 'rgba(120,190,255,0.55)'; c.lineWidth = 1; c.stroke();
  c.beginPath(); c.arc(cx, cy, R * 0.5, 0, Math.PI * 2); c.stroke();
  c.beginPath(); c.moveTo(cx - R, cy); c.lineTo(cx + R, cy); c.moveTo(cx, cy - R); c.lineTo(cx, cy + R);
  c.strokeStyle = 'rgba(120,190,255,0.2)'; c.stroke();
  const sy = Math.sin(J.yaw), cyw = Math.cos(J.yaw);
  function punto(p, color, tam) {
    const dx = p.x - J.pos.x, dz = p.z - J.pos.z, dy = p.y - J.pos.y;
    const adelante = dx * sy + dz * cyw, derecha = -dx * cyw + dz * sy;
    let x = derecha / rango * R, y = -adelante / rango * R;
    const d = Math.hypot(x, y); if (d > R) { x *= R / d; y *= R / d; }
    c.globalAlpha = Math.abs(dy) > 25 ? 0.5 : 1;
    c.fillStyle = color;
    c.beginPath(); c.arc(cx + x, cy + y, tam, 0, Math.PI * 2); c.fill();
  }
  for (const m of mejoras.items) if (m.activo) punto(m.grupo.position, '#ffe066', 2);
  if (juego.modo === 'carrera') { const sig = anilloSiguiente(); if (sig) punto(sig.position, '#5dff9a', 4.5); for (const r of listaRivales()) punto(r.obj.position, '#3ab8ff', 3); }
  for (const a of asteroides) if (a.activo) punto(a.malla.position, 'rgba(170,150,130,0.6)', 1.5);
  for (const m of misiles.items) if (m.activo && m.dueno === 'enemigo') punto(m.grupo.position, '#ff9966', 1.5);
  for (const k of capsulas.items) if (k.activo) punto(k.grupo.position, k.colorCss, 3.2);
  for (const e of enemigos) if (e.activo) punto(e.pos, e.aliado ? '#5dff9a' : e.elite ? '#ffd166' : e.tipo === 'senuelo' ? '#c061ff' : '#ff4d6d', 2.6);
  if (juego.jefe && !juego.jefe.muriendo) punto(juego.jefe.grupo.position, '#ffb703', 5);
  c.globalAlpha = 1;
  c.fillStyle = '#bdf0ff';
  c.beginPath(); c.moveTo(cx, cy - 6); c.lineTo(cx - 4, cy + 4); c.lineTo(cx + 4, cy + 4); c.closePath(); c.fill();
}

// =====================================================================
// 21. CÁMARA
// =====================================================================
function actualizarCamara(dt) {
  const J = jugador;
  const kc = 1 + (J.escalaVis - 1) * 0.55;   // la cámara se aleja con la nave gigante
  _a.copy(J.pos).addScaledVector(J.fwd, -13 * kc).addScaledVector(ARRIBA, 4.2 * kc);
  camara.position.lerp(_a, 1 - Math.exp(-dt * 7));
  _b.copy(J.pos).addScaledVector(J.fwd, 25);
  camaraMira.lerp(_b, 1 - Math.exp(-dt * 10));
  if (juego.sacudida > 0) {
    juego.sacudida = Math.max(0, juego.sacudida - dt * 2.5);
    const s = juego.sacudida * 0.6;
    camara.position.x += rand(-s, s); camara.position.y += rand(-s, s); camara.position.z += rand(-s, s);
  }
  camara.lookAt(camaraMira);
  const fovObj = entrada.acelerar > 0 && J.vivo ? 78 : 68;
  if (Math.abs(camara.fov - fovObj) > 0.1) { camara.fov = lerp(camara.fov, fovObj, 1 - Math.exp(-dt * 4)); camara.updateProjectionMatrix(); }
}

// =====================================================================
// 22. CONTROLES (teclado, ratón y táctiles)
// =====================================================================
const teclas = {};
const entrada = { girar: 0, subir: 0, acelerar: 0, disparar: false };
let pedirMisil = false, pedirEsquiva = false, ratonDX = 0, ratonDY = 0, ratonDisparo = false, punteroBloqueado = false;
const tactil = { jx: 0, jy: 0, disparo: false, turbo: false, joyId: null };

function leerEntrada() {
  let g = 0, s = 0, a = 0;
  if (teclas.KeyA || teclas.ArrowLeft) g -= 1;
  if (teclas.KeyD || teclas.ArrowRight) g += 1;
  if (teclas.ArrowUp) s += 1;
  if (teclas.ArrowDown) s -= 1;
  if (teclas.KeyW) a += 1;
  if (teclas.KeyS) a -= 1;
  g += tactil.jx; s -= tactil.jy;
  if (tactil.turbo) a += 1;
  entrada.girar = clamp(g, -1, 1);
  entrada.subir = clamp(s, -1, 1);
  entrada.acelerar = clamp(a, -1, 1);
  entrada.disparar = !!(teclas.Space || ratonDisparo || tactil.disparo || (juego.modo === 'infinito' && modoTactil && guardado.opciones.autoDisparo !== false));
}
function soltarControles() {
  for (const k in teclas) teclas[k] = false;
  ratonDisparo = false; pedirMisil = false; pedirEsquiva = false; ratonDX = ratonDY = 0;
  tactil.disparo = tactil.turbo = false; tactil.jx = tactil.jy = 0; tactil.joyId = null;
  E('joyPalanca').style.transform = '';
  document.querySelectorAll('.tbtn.presionado').forEach((b) => b.classList.remove('presionado'));
}

// ---------- Teclado ----------
window.addEventListener('keydown', (e) => {
  if (e.target && e.target.tagName === 'INPUT') return;   // escribiendo el apodo o la sala
  Sonido.iniciar();
  if (juego.estado === 'jugando' && ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  if (modoTactil) cambiarModoTactil(false);
  const repetida = e.repeat;
  teclas[e.code] = true;
  if (repetida) return;
  if (e.code === 'Escape' || e.code === 'KeyP') {
    if (juego.estado === 'jugando') pausar();
    else if (juego.estado === 'pausa' && pantallaActual === 'pPausa') reanudar();
    else if (pantallaActual && pantallaActual !== 'pMenu' && pantallaActual !== 'pPausa' && juego.estado !== 'fin') volver();
  }
  if (juego.estado === 'jugando') {
    if (e.code === 'KeyE' || e.code === 'KeyQ' || e.code === 'KeyF') pedirMisil = true;
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') pedirEsquiva = true;
  }
});
window.addEventListener('keyup', (e) => { teclas[e.code] = false; });
window.addEventListener('blur', () => { soltarControles(); if (juego.estado === 'jugando') pausar(); });

// ---------- Ratón (con captura del puntero) ----------
function bloquearPuntero() {
  if (modoTactil || !canvas.requestPointerLock) return;
  try { const r = canvas.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) { /* el navegador no lo permite ahora */ }
}
function liberarPuntero() { if (document.pointerLockElement && document.exitPointerLock) document.exitPointerLock(); }
canvas.addEventListener('mousedown', (e) => {
  if (juego.estado !== 'jugando' || modoTactil) return;
  if (document.pointerLockElement !== canvas) bloquearPuntero();
  if (e.button === 0) ratonDisparo = true;
  if (e.button === 2) pedirMisil = true;
});
window.addEventListener('mouseup', (e) => { if (e.button === 0) ratonDisparo = false; });
document.addEventListener('mousemove', (e) => {
  if (document.pointerLockElement === canvas && juego.estado === 'jugando') { ratonDX += e.movementX || 0; ratonDY += e.movementY || 0; }
});
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('pointerlockchange', () => {
  const ahora = document.pointerLockElement === canvas;
  if (punteroBloqueado && !ahora && juego.estado === 'jugando') pausar();
  punteroBloqueado = ahora;
});

// ---------- Controles táctiles ----------
function cambiarModoTactil(v) {
  if (modoTactil === v) return;
  modoTactil = v;
  if (juego.estado === 'jugando') mostrarElem('tactil', v);
  if (v) liberarPuntero();
  revisarOrientacion();
}
window.addEventListener('touchstart', () => { if (!modoTactil) cambiarModoTactil(true); }, { passive: true });

function configurarTactil() {
  const zona = E('joyZona'), base = E('joyBase'), palanca = E('joyPalanca'), R = 48;
  let cx = 0, cy = 0;
  function mover(e) {
    let dx = e.clientX - cx, dy = e.clientY - cy;
    const d = Math.hypot(dx, dy);
    if (d > R) { dx *= R / d; dy *= R / d; }
    palanca.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
    const zonaMuerta = 0.12;
    let x = dx / R, y = dy / R;
    x = Math.abs(x) < zonaMuerta ? 0 : x; y = Math.abs(y) < zonaMuerta ? 0 : y;
    const sens = guardado.opciones.sensibilidad;
    tactil.jx = clamp(x * (0.6 + 0.4 * Math.abs(x)) * sens, -1, 1);
    tactil.jy = clamp(y * (0.6 + 0.4 * Math.abs(y)) * sens, -1, 1);
  }
  zona.addEventListener('pointerdown', (e) => {
    if (tactil.joyId !== null) return;
    e.preventDefault();
    tactil.joyId = e.pointerId;
    try { zona.setPointerCapture(e.pointerId); } catch (err) { /* sin captura */ }
    const r = zona.getBoundingClientRect();
    cx = e.clientX; cy = e.clientY;
    base.style.left = (cx - r.left - 65) + 'px'; base.style.top = (cy - r.top - 65) + 'px'; base.style.bottom = 'auto';
    mover(e);
  });
  zona.addEventListener('pointermove', (e) => { if (e.pointerId === tactil.joyId) mover(e); });
  const fin = (e) => {
    if (e.pointerId !== tactil.joyId) return;
    tactil.joyId = null; tactil.jx = tactil.jy = 0;
    palanca.style.transform = '';
    base.style.left = ''; base.style.top = ''; base.style.bottom = '';
  };
  zona.addEventListener('pointerup', fin);
  zona.addEventListener('pointercancel', fin);
  zona.addEventListener('lostpointercapture', fin);

  function boton(id, alPresionar, alSoltar) {
    const el = E(id);
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      try { el.setPointerCapture(e.pointerId); } catch (err) { /* sin captura */ }
      el.classList.add('presionado'); alPresionar();
    });
    const soltar = () => { el.classList.remove('presionado'); if (alSoltar) alSoltar(); };
    el.addEventListener('pointerup', soltar);
    el.addEventListener('pointercancel', soltar);
  }
  boton('btnDisparo', () => (tactil.disparo = true), () => (tactil.disparo = false));
  boton('btnMisil', () => (pedirMisil = true));
  boton('btnEsquiva', () => (pedirEsquiva = true));
  boton('btnTurbo', () => (tactil.turbo = true), () => (tactil.turbo = false));

  // Zona de giro: arrastrar el dedo en el lado derecho gira y apunta la nave (como el ratón)
  const look = E('lookZona');
  let lookId = null, lx = 0, ly = 0;
  look.addEventListener('pointerdown', (e) => {
    if (lookId !== null) return;
    e.preventDefault(); lookId = e.pointerId; lx = e.clientX; ly = e.clientY;
    try { look.setPointerCapture(e.pointerId); } catch (err) { /* sin captura */ }
  });
  look.addEventListener('pointermove', (e) => {
    if (e.pointerId !== lookId || juego.estado !== 'jugando') return;
    ratonDX += (e.clientX - lx) * 1.6; ratonDY += (e.clientY - ly) * 1.6;
    lx = e.clientX; ly = e.clientY;
  });
  const finLook = (e) => { if (e.pointerId === lookId) lookId = null; };
  look.addEventListener('pointerup', finLook);
  look.addEventListener('pointercancel', finLook);
  look.addEventListener('lostpointercapture', finLook);
}

// Evitar zoom y desplazamiento accidental en el celular
document.addEventListener('touchmove', (e) => { if (!(e.target.closest && e.target.closest('.panel'))) e.preventDefault(); }, { passive: false });
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault());

function pantallaCompleta() {
  const el = document.documentElement;
  try {
    if (!document.fullscreenElement && el.requestFullscreen) {
      el.requestFullscreen({ navigationUI: 'hide' }).then(() => {
        if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {});
      }).catch(() => {});
    }
  } catch (e) { /* no disponible (por ejemplo, iPhone) */ }
}
function revisarOrientacion() {
  const vertical = modoTactil && window.innerHeight > window.innerWidth;
  E('girar').classList.toggle('visible', vertical);
  if (vertical && juego.estado === 'jugando') pausar();
}

// =====================================================================
// 23. MENÚS Y PANTALLAS
// =====================================================================
let pantallaActual = null;
function mostrarPantalla(id) {
  document.querySelectorAll('.pantalla').forEach((p) => p.classList.remove('activa'));
  pantallaActual = id;
  if (id) $(id).classList.add('activa');
}
function volver() {
  if (juego.estado === 'pausa') mostrarPantalla('pPausa');
  else mostrarPantalla('pMenu');
}
function irAlMenu() {
  juego.estado = 'menu';
  limpiarNivel();
  jugador.obj.visible = false;
  grupoMenu.visible = true;
  mostrarElem('hud', false); mostrarElem('tactil', false);
  aplicarCielo(CIELO_MENU);
  camara.fov = 68; camara.updateProjectionMatrix();
  Sonido.motorDetener(); Sonido.musica('menu');
  liberarPuntero(); soltarControles();
  $('btnSeguir').disabled = !guardado.continuar;
  mostrarPantalla('pMenu');
  juego.modo = 'campana';
  Red.est = 'menu'; Red.cId = null; enviarPresencia(true);
}
function pausar() {
  if (juego.estado !== 'jugando') return;
  juego.estado = 'pausa';
  soltarControles();
  Sonido.motorDetener();
  liberarPuntero();
  mostrarElem('tactil', false);
  guardar();
  mostrarPantalla('pPausa');
  $('btnReiniciar').textContent = juego.modo === 'carrera' ? '⟲ Volver a la sala' : '⟳ Reiniciar nivel';
}
function reanudar() {
  if (juego.estado !== 'pausa') return;
  if (modoTactil && window.innerHeight > window.innerWidth) return;
  juego.estado = 'jugando';
  mostrarPantalla(null);
  mostrarElem('tactil', modoTactil);
  if (jugador.vivo) Sonido.motorIniciar();
  if (!modoTactil) bloquearPuntero();
}

function renderBandos() {
  document.querySelectorAll('[data-dif]').forEach((b) => b.classList.toggle('sel', b.dataset.dif === (guardado.opciones.dificultad || 'normal')));
  for (const f of ['tierra', 'alien']) {
    const prog = guardado.progreso[f];
    $(f === 'tierra' ? 'mejTierra' : 'mejAlien').innerHTML = textoMejoras(f);
    $(f === 'tierra' ? 'progTierra' : 'progAlien').textContent = 'Progreso: ' + prog + ' / 4 niveles' + (prog >= 4 ? ' ✓ campaña completada' : '');
    const cont = $(f === 'tierra' ? 'nivTierra' : 'nivAlien');
    cont.innerHTML = '';
    for (let n = 1; n <= 4; n++) {
      const b = document.createElement('button');
      b.className = 'chip' + (n <= prog ? ' hecho' : '');
      b.textContent = 'N' + n + ' · ' + JEFES[NIVELES[f][n - 1].jefe].nombre.split(' ').slice(-1)[0];
      b.disabled = n > prog + 1;
      b.title = NIVELES[f][n - 1].nombre;
      b.onclick = () => { Sonido.sfx.ui(); iniciarNivel(f, n); };
      cont.appendChild(b);
    }
  }
}
function renderLogros() {
  const lista = $('listaLogros'); lista.innerHTML = '';
  let ok = 0;
  for (const l of LOGROS) {
    const hecho = !!guardado.logros[l.id]; if (hecho) ok++;
    let extra = '';
    if (l.progreso && !hecho) { const [v, m] = l.progreso(); extra = ' (' + Math.min(v, m) + '/' + m + ')'; }
    const d = document.createElement('div');
    d.className = 'logro' + (hecho ? ' ok' : '');
    d.innerHTML = '<div class="ico">' + (hecho ? l.icono : '🔒') + '</div><div><b>' + l.nombre + '</b><small>' + l.desc + extra + '</small></div>';
    lista.appendChild(d);
  }
  $('resumenLogros').textContent = ok + ' de ' + LOGROS.length + ' logros desbloqueados · Naves destruidas: ' + guardado.stats.derribos;
}
function renderOpciones() {
  const o = guardado.opciones;
  $('opMusica').value = Math.round(o.musica * 100); $('lblMusica').textContent = Math.round(o.musica * 100) + '%';
  $('opEfectos').value = Math.round(o.efectos * 100); $('lblEfectos').textContent = Math.round(o.efectos * 100) + '%';
  $('opSens').value = Math.round(o.sensibilidad * 100); $('lblSens').textContent = o.sensibilidad.toFixed(1) + 'x';
  $('opInvertir').checked = !!o.invertirY;
  document.querySelectorAll('[data-calidad]').forEach((b) => b.classList.toggle('sel', b.dataset.calidad === o.calidad));
}
function aplicarCalidad() {
  const q = guardado.opciones.calidad, dpr = window.devicePixelRatio || 1;
  renderer.setPixelRatio(q === 'baja' ? Math.min(dpr, 1) : q === 'media' ? Math.min(dpr, 1.5) : Math.min(dpr, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  estrellas.geometry.setDrawRange(0, q === 'baja' ? 900 : q === 'media' ? 1800 : 3000);
  polvo.geometry.setDrawRange(0, q === 'baja' ? 120 : 260);
  Particulas.setLimite(q === 'baja' ? 180 : q === 'media' ? 320 : 520);
}

function configurarMenus() {
  document.querySelectorAll('.btn').forEach((b) => b.addEventListener('click', () => Sonido.sfx.ui()));
  document.querySelectorAll('[data-volver]').forEach((b) => (b.onclick = volver));
  $('btnNueva').onclick = () => { renderBandos(); mostrarPantalla('pBandos'); };
  $('btnSeguir').onclick = () => { const c = guardado.continuar; if (c) iniciarNivel(c.faccion, c.nivel); };
  $('btnLogros').onclick = () => { renderLogros(); mostrarPantalla('pLogros'); };
  $('btnOpciones').onclick = () => { renderOpciones(); mostrarPantalla('pOpciones'); };
  $('btnControles').onclick = () => mostrarPantalla('pControles');
  $('btnCreditos').onclick = () => mostrarPantalla('pCreditos');
  document.querySelectorAll('[data-bando]').forEach((b) => (b.onclick = () => iniciarNivel(b.dataset.bando, 1)));
  // Pausa
  E('btnPausaHud').addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); pausar(); });
  $('btnContinuar').onclick = reanudar;
  $('btnReiniciar').onclick = () => (juego.modo === 'carrera' ? volverLobby() : iniciarNivel(juego.faccion, juego.nivel));
  $('btnOpcionesPausa').onclick = () => { renderOpciones(); mostrarPantalla('pOpciones'); };
  $('btnControlesPausa').onclick = () => mostrarPantalla('pControles');
  $('btnSalir').onclick = () => { guardar(); irAlMenu(); };
  // Victoria, derrota y fin
  $('btnSiguiente').onclick = () => iniciarNivel(juego.faccion, Math.min(4, juego.nivel + 1));
  $('btnMenuV').onclick = () => { if (juego.mejoraPendiente) elegirMejora(juego.opcionesMejora[0]); irAlMenu(); };
  $('btnReintentar').onclick = () => iniciarNivel(juego.faccion, juego.nivel);
  $('btnMenuD').onclick = irAlMenu;
  $('btnOtroBando').onclick = () => iniciarNivel(juego.faccion === 'tierra' ? 'alien' : 'tierra', 1);
  $('btnMenuF').onclick = irAlMenu;
  // Dificultad y modo infinito
  document.querySelectorAll('[data-dif]').forEach((b) => (b.onclick = () => { guardado.opciones.dificultad = b.dataset.dif; guardar(); renderBandos(); }));
  // Carrera multijugador
  $('btnCarrera').onclick = abrirLobby;
  $('btnVolverCarrera').onclick = salirLobby;
  $('btnEmpezarCarrera').onclick = botonEmpezar;
  $('btnOtraCarrera').onclick = volverLobby;
  $('btnMenuCarrera').onclick = irAlMenu;
  $('inApodo').onchange = (e) => { guardado.opciones.apodo = limpiarTexto(e.target.value, 12); guardar(); e.target.value = apodo(); enviarPresencia(true); renderLobby(); };
  $('btnCrearSala').onclick = crearSala;
  $('btnUnirme').onclick = unirmeConCodigo;
  $('inCodigo').onkeydown = (e) => { if (e.key === 'Enter') unirmeConCodigo(); };
  $('btnBots').onclick = botonEmpezar;
  $('btnAtrasSala').onclick = salirDeSala;
  $('btnCopiarCodigo').onclick = copiarCodigo;
  $('btnCopiarEnlace').onclick = copiarEnlace;
  document.querySelectorAll('[data-cbando]').forEach((b) => (b.onclick = () => { guardado.opciones.bandoCarrera = b.dataset.cbando; guardar(); enviarPresencia(true); renderLobby(); }));
  // Opciones
  const o = () => guardado.opciones;
  $('opMusica').oninput = (e) => { o().musica = e.target.value / 100; Sonido.aplicarVolumen(); renderOpciones(); guardar(); };
  $('opEfectos').oninput = (e) => { o().efectos = e.target.value / 100; Sonido.aplicarVolumen(); renderOpciones(); guardar(); };
  $('opSens').oninput = (e) => { o().sensibilidad = e.target.value / 100; renderOpciones(); guardar(); };
  $('opInvertir').onchange = (e) => { o().invertirY = e.target.checked; guardar(); };
  document.querySelectorAll('[data-calidad]').forEach((b) => (b.onclick = () => { o().calidad = b.dataset.calidad; aplicarCalidad(); renderOpciones(); guardar(); Sonido.sfx.ui(); }));
  let confirmar = false;
  $('btnBorrar').onclick = () => {
    if (!confirmar) { confirmar = true; $('btnBorrar').textContent = '¿Seguro? Toca otra vez'; setTimeout(() => { confirmar = false; $('btnBorrar').textContent = 'Borrar progreso'; }, 3000); return; }
    const op = guardado.opciones; guardado = guardadoPorDefecto(); guardado.opciones = op; guardar();
    confirmar = false; $('btnBorrar').textContent = '✓ Progreso borrado';
    $('btnSeguir').disabled = true;
  };
}

// =====================================================================
// 24. ANIMACIÓN DEL MENÚ (naves de ambos bandos en combate)
// =====================================================================
const grupoMenu = new THREE.Group();
escena.add(grupoMenu);
const demoTierra = crearModeloNaveTierra(), demoAlien = crearModeloNaveAlien();
demoTierra.scale.setScalar(1.6); demoAlien.scale.setScalar(1.6);
grupoMenu.add(demoTierra, demoAlien);
let tMenu = 0, tLaserMenu = 0;
function posDemo(a, alt, out) { return out.set(Math.cos(a) * 18, Math.sin(a * 2) * 3 + alt, Math.sin(a) * 18); }
function actualizarMenuDemo(dt) {
  tMenu += dt;
  const a = tMenu * 0.35, a2 = a - 0.6;
  posDemo(a, 0, demoAlien.position); demoAlien.lookAt(posDemo(a + 0.05, 0, _a));
  demoAlien.rotateZ(-0.5);
  posDemo(a2, 1, demoTierra.position); demoTierra.lookAt(posDemo(a2 + 0.05, 1, _a));
  demoTierra.rotateZ(-0.5 + Math.sin(tMenu * 2) * 0.2);
  for (const m of demoTierra.userData.motores.concat(demoAlien.userData.motores)) m.scale.z = 1.4 + Math.random() * 0.6;
  tLaserMenu -= dt;
  if (tLaserMenu <= 0) {
    tLaserMenu = 0.12;
    demoTierra.getWorldPosition(_b); demoAlien.getWorldPosition(_c);
    _d.subVectors(_c, _b).normalize().multiplyScalar(60);
    Particulas.emitirVel(_b, _d, 0x66e0ff, 0.35);
    _d.set(rand(-2, 2), rand(-2, 2), rand(-2, 2));
    Particulas.emitirVel(_c, _d, 0x9dff55, 0.6);
  }
  camara.position.set(Math.cos(tMenu * 0.05) * 50, 12 + Math.sin(tMenu * 0.1) * 4, Math.sin(tMenu * 0.05) * 50);
  camara.lookAt(0, 0, 0);
  Particulas.actualizar(dt);
}

// =====================================================================
// 25. BUCLE PRINCIPAL
// =====================================================================
function actualizarJuego(dt) {
  leerEntrada();
  juego.lento = jugador.poderes.lento > 0 ? 0.45 : 1;   // poder CÁMARA LENTA
  const dtE = dt * juego.lento;                          // tiempo de los enemigos
  juego.avanceZ = 0;
  actualizarJugador(dt);
  actualizarPoderes(dt);
  if (juego.modo === 'carrera') actualizarCarrera(dt); else actualizarNivel(dt);
  actualizarEventos(dt);
  actualizarEnemigos(dtE);
  actualizarJefe(dtE);
  actualizarAliados(dt);
  actualizarCapsulas(dt);
  actualizarMinas(dtE);
  actualizarMeteoritos(dtE);
  actualizarRayos(dtE);
  actualizarBalasJugador(dt);
  actualizarBalasEnemigas(dtE);
  actualizarMisiles(dt);
  actualizarMejoras(dt);
  actualizarAsteroides(dt);
  actualizarExplosiones(dt);
  Particulas.actualizar(dt);
  actualizarPolvo(jugador.pos);
  actualizarCamara(dt);
  actualizarHUD(dt);
}
let ultimoT = performance.now(), tOrbitaFin = 0;
function bucle(ahora) {
  requestAnimationFrame(bucle);
  let dt = (ahora - ultimoT) / 1000; ultimoT = ahora;
  if (!(dt > 0)) dt = 0.001;
  if (dt > 0.05) dt = 0.05;
  if (juego.estado === 'jugando') actualizarJuego(dt);
  else if (juego.estado === 'menu') actualizarMenuDemo(dt);
  else if (juego.estado === 'fin') {
    // Cámara orbitando lentamente tras ganar o perder
    tOrbitaFin += dt * 0.15;
    actualizarExplosiones(dt); Particulas.actualizar(dt); actualizarAsteroides(dt);
    if (juego.modo === 'carrera') actualizarFinCarrera(dt);
    _a.set(Math.cos(tOrbitaFin) * 40, 12, Math.sin(tOrbitaFin) * 40).add(jugador.pos);
    camara.position.lerp(_a, 1 - Math.exp(-dt * 1.5));
    camara.lookAt(jugador.pos);
  }
  grupoCielo.position.copy(camara.position);
  renderer.render(escena, camara);
}

function redimensionar() {
  camara.aspect = window.innerWidth / Math.max(1, window.innerHeight);
  camara.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  revisarOrientacion();
}
window.addEventListener('resize', redimensionar);
window.addEventListener('orientationchange', () => setTimeout(redimensionar, 200));
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { if (juego.estado === 'jugando') pausar(); Sonido.suspender(); }
  else Sonido.reanudar();
});
// El audio solo puede empezar después de que el usuario toque o presione algo
['pointerdown', 'touchend', 'keydown'].forEach((ev) => window.addEventListener(ev, () => Sonido.iniciar(), { passive: true }));

// =====================================================================
// 26. INICIO
// =====================================================================
aplicarCalidad();
redimensionar();
configurarMenus();
configurarTactil();
irAlMenu();
iniciarRed();
revisarSalaEnEnlace();
requestAnimationFrame(bucle);

// Acceso para pruebas desde la consola del navegador (opcional)
window.GALAXY_WAR = { juego, jugador, iniciarNivel, irAlMenu, danarParte, activarPoder, generarCapsula, iniciarCarrera, Red, danarJugador, iniciarEvento, crearJefe, guardado: () => guardado };
})();
