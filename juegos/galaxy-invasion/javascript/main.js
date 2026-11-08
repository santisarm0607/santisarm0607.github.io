/* =========================================================
   GALAXY INVASION — main.js
   Arranque y bucle principal del juego. Une todas las piezas:
   etapas (mapas), jugador, camioneta, armas, aliens, aliados,
   misiones, sonido e interfaz.

   Estados del juego (variable "modo"):
     menu     -> el menú, con la etapa actual de fondo
     jugando  -> partida en curso
     pausa    -> partida congelada
     transicion -> pantalla en negro al pasar de una etapa a la siguiente
     fin      -> ganaste o perdiste (pantalla de resultados)
     cinematica -> la escena del secuestro (al empezar la granja)

   Creado por SantiSarm
   ========================================================= */

import * as THREE from 'three';
import { CONFIG } from './config.js';
import { cargar, guardar } from './guardado.js';
import { crearGranja } from './mundo-granja.js';
import { crearCarretera } from './mundo-carretera.js';
import { crearCiudadCompleta } from './mundo-ciudad.js';
import { crearNave } from './mundo-nave.js';
import { Sonido } from './sonido.js';
import { Efectos } from './efectos.js';
import { Entrada } from './entrada.js';
import { Jugador } from './jugador.js';
import { Arsenal, rarezaAlAzar } from './armas.js';
import { GestorEnemigos } from './enemigos.js';
import './jefes.js';            // registra a los jefes en el gestor de enemigos
import './jefes-nave.js';       // el Capitán (v0.7)
import './enemigos-ciudad.js';  // registra al Soldado alien y al Bruto
import { Vehiculo } from './vehiculo.js';
import { Aliados } from './aliados.js';
import { crearArmaSuelo } from './modelos.js';
import { MisionGranja } from './misiones-granja.js';
import { MisionCarretera } from './misiones-carretera.js';
import { MisionCiudad } from './misiones-ciudad.js';
import { MisionNave } from './misiones-nave.js';
import { Interfaz } from './interfaz.js';
import { Minimapa } from './minimapa.js';
import { etapa, ETAPAS } from './etapas.js';
import { usarPersonaje } from './personaje.js';
import { Cinematica } from './cinematica.js';
import { Presentacion } from './presentacion.js';
import { Mochila, OBJETOS } from './mochila.js';
import { Granadas } from './granadas.js';
import { MisionesExtra } from './misiones-extra.js';
import './nidos.js';            // registra el Nido de la Colmena (v0.8)
import { textoPersonaje } from './personaje.js';
import { pintarBrazos } from './modelos.js';

/* =========================================================
   1. PREPARACIÓN
   ========================================================= */
const datos = cargar();
const $ = (id) => document.getElementById(id);

const lienzo = $('lienzo');
const renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: false, powerPreference: 'high-performance' });
const camara = new THREE.PerspectiveCamera(CONFIG.jugador.fov, window.innerWidth / window.innerHeight, 0.05, 1500);

let calidad = CONFIG.graficos[datos.opciones.calidad] || CONFIG.graficos.media;
const sonido = new Sonido();
const entrada = new Entrada(lienzo, $('controles-tactiles'));
const jugador = new Jugador(camara, sonido);
const arsenal = new Arsenal(camara, sonido);
const enemigos = new GestorEnemigos(sonido);
const vehiculo = new Vehiculo(sonido);
const aliados = new Aliados(sonido);
const ui = new Interfaz(sonido);
const minimapa = new Minimapa($('minimapa'), entrada.esTactil);
const cinematica = new Cinematica(camara, sonido);
// v0.8: presentación de monstruos, mochila, granadas y golpe
const presentacion = new Presentacion(camara, sonido);
const mochila = new Mochila();
const granadas = new Granadas(sonido);
datos.extras = datos.extras || {};
datos.bestiario = datos.bestiario || {};
mochila.cargar(datos.partida && datos.partida.mochila);
let esperaGranada = 0;
let esperaGolpe = 0;
let esperaBuscarMonstruo = 0;
let pasoTarjeta = null;     // para mostrar la tarjeta "NUEVA MISIÓN" al cambiar de paso
let momentoMochila = 0;     // cuándo se abrió (para que la misma tecla no la cierre al instante)

let nivel = null;          // la etapa cargada: { id, etapa, escena, mundo, efectos, logica }
let etapaElegida = 'granja';
let modo = 'menu';
let partida = null;
let copiaControl = null;   // armas y munición al pasar el último punto de control
let ultimoControl = -1;
const reloj = new THREE.Clock();

arsenal.cargar(datos.arsenal);
elegirPersonaje(datos.opciones.personaje, false);
cargarNivel('granja');
aplicarOpciones(datos.opciones);
ajustarTamano();
ui.recordMenu(datos);
ui.menuPartida(datos);
ui.mostrar('pantalla-menu');
document.body.classList.add('listo');

/* =========================================================
   2. CARGAR UNA ETAPA (crea su mapa en una escena nueva)
   ========================================================= */
function cargarNivel(id) {
  if (nivel && nivel.id === id) return;
  if (nivel) {
    enemigos.limpiar();
    nivel.escena.remove(camara);
  }
  const escena = new THREE.Scene();
  const crear = { granja: crearGranja, carretera: crearCarretera, ciudad: crearCiudadCompleta, nave: crearNave }[id];
  const mundo = crear(escena, calidad);
  escena.add(camara); // la cámara lleva el arma, así que debe estar en la escena
  const efectos = new Efectos(escena, calidad.particulas);
  enemigos.usarEscena(escena, efectos);
  aliados.usarEscena(escena, efectos);
  arsenal.usarEfectos(efectos);
  granadas.usarEscena(escena);
  // La camioneta solo está en las etapas donde se maneja
  if (vehiculo.grupo.parent) vehiculo.grupo.parent.remove(vehiculo.grupo);
  if (mundo.usaVehiculo) {
    vehiculo.usarEscena(escena, mundo);
    const v = mundo.inicioVehiculo;
    vehiculo.colocar(v.x, v.z, v.yaw);   // estacionada en su sitio (también se ve en el menú)
  }
  let logica;
  if (id === 'granja') logica = new MisionGranja(enemigos, mundo, sonido, vehiculo);
  else if (id === 'carretera') logica = new MisionCarretera(enemigos, mundo, sonido, vehiculo);
  else if (id === 'ciudad') logica = new MisionCiudad(enemigos, mundo, sonido, aliados);
  else logica = new MisionNave(enemigos, mundo, sonido);
  logica.alLogro = (idLogro) => desbloquearLogro(idLogro);
  logica.alCambiar = (texto) => ui.objetivo(texto);
  logica.alCompletar = () => ganar();
  logica.alSacarDelAuto = () => bajarCamioneta(true);
  logica.alGolpe = (danio, punto) => recibirGolpe(danio, punto.x, punto.z);
  logica.alMensaje = (texto, segundos = 2.2) => ui.mensaje(texto, segundos);
  logica.alSubtitulo = (texto, segundos, hablante) => ui.subtitulo(texto, segundos, hablante);
  logica.alObjeto = (idObjeto) => agregarObjeto(idObjeto);
  // Misiones extra (v0.8)
  const extras = new MisionesExtra(enemigos, mundo, sonido, datos.extras);
  extras.alTarjeta = (titulo, detalle, esExtra) => ui.tarjetaMision(titulo, detalle, esExtra);
  extras.alMensaje = (texto, segundos) => ui.mensaje(texto, segundos);
  extras.alSubtitulo = (texto, segundos, hablante) => ui.subtitulo(texto, segundos, hablante);
  extras.alPremio = (rareza, pos) => soltarPremio(pos.x + 2, pos.z + 2, [rareza]);
  extras.alGranadas = (n) => { mochila.agregarGranadas(n); };
  extras.alBotiquines = (n) => { mochila.botiquines = Math.min(CONFIG.mochila.maxBotiquines, mochila.botiquines + n); };
  extras.alObjeto = (idObjeto) => agregarObjeto(idObjeto);
  extras.alLogro = (idLogro) => desbloquearLogro(idLogro);
  extras.alGuardar = () => guardar(datos);
  // Barriles: al explotar dañan a todos alrededor
  (mundo.barriles || []).forEach((b) => { b.alExplotar = explotarBarril; });
  nivel = { id, etapa: etapa(id), escena, mundo, efectos, logica, extras, premios: [], barrilesPendientes: [] };
  pasoTarjeta = null;
  minimapa.usarNivel(mundo);
}

/* =========================================================
   3. OPCIONES Y TAMAÑO DE PANTALLA
   ========================================================= */
function aplicarOpciones(op) {
  sonido.volumenes(op.musica, op.efectos);
  entrada.ajustarSensibilidad(op.sensibilidad);
  calidad = CONFIG.graficos[op.calidad] || CONFIG.graficos.media;
  if (nivel) {
    nivel.escena.fog.density = nivel.mundo.nieblaBase * calidad.niebla;
    nivel.efectos.factor = calidad.particulas;
    (nivel.mundo.lucesExtra || []).forEach((luz) => { luz.visible = calidad.luces; });
  }
  ajustarTamano();
}

function ajustarTamano() {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, calidad.escalaPixeles));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  camara.aspect = window.innerWidth / window.innerHeight;
  camara.updateProjectionMatrix();
  revisarOrientacion();
}
window.addEventListener('resize', ajustarTamano);
window.addEventListener('orientationchange', () => setTimeout(ajustarTamano, 200));

/* En el celular el juego va siempre en horizontal */
function revisarOrientacion() {
  const vertical = entrada.esTactil && window.innerHeight > window.innerWidth;
  $('aviso-girar').hidden = !vertical;
  if (vertical && modo === 'jugando') pausar();
}

/* Granjera o granjero (v0.6.2): cambia el nombre en los textos y el color
   de los brazos, y se guarda para la próxima vez */
function elegirPersonaje(id, guardarlo = true) {
  const p = usarPersonaje(id);
  pintarBrazos(p.manga, p.guante);
  datos.opciones.personaje = CONFIG.personajes[id] ? id : 'granjera';
  if (guardarlo) guardar(datos);
  ui.mostrarPersonaje(datos.opciones.personaje);
  if (!$('pantalla-historia').hidden) ui.introEtapa(etapa(etapaElegida));   // el texto dice "Eres Rosa/Tomás"
}

/* =========================================================
   PARTIDA GUARDADA (v0.6.5): "Continuar partida" y "Nueva partida"
   Se guarda al empezar una etapa, en cada punto de control y al
   ganar (apuntando a la etapa siguiente). Guarda la etapa, el punto
   de control, el personaje y las armas con su munición.
   ========================================================= */
function guardarPartida(etapaId = nivel.id, control = nivel.logica.puntoControl, copia = copiaControl, terminada = false) {
  datos.partida = {
    etapa: etapaId,
    control,
    personaje: datos.opciones.personaje,
    armas: arsenal.copiaGuardable(copia),
    mochila: mochila.guardable(),       // v0.8
    fecha: new Date().toISOString(),
    terminada
  };
  guardar(datos);
}

function continuarPartida() {
  const g = datos.partida;
  if (!g || g.terminada) return;
  elegirPersonaje(g.personaje);
  cargarNivel(g.etapa);
  partida = { tiempo: 0, eliminados: 0 };
  datos.estadisticas.partidasJugadas++;
  ui.limpiarTextos();
  quitarPremios();
  nivel.efectos.limpiar();
  reiniciarObjetos();
  nivel.logica.reiniciar(g.control);
  colocarJugador();
  arsenal.cargarCopia(g.armas);
  mochila.cargar(g.mochila);
  copiaControl = arsenal.copia();
  ultimoControl = nivel.logica.puntoControl;
  entrarAlJuego();
  ui.mensaje('Partida cargada', 2.2);
  pantallaCompleta();
}

/* Empieza la historia desde cero: escopeta común, granja y la escena del secuestro */
function nuevaPartida() {
  datos.partida = null;
  datos.arsenal = [{ tipo: 'escopeta', rareza: 'comun' }];
  datos.extras = {};          // v0.8: las misiones extra vuelven a empezar
  mochila.vaciar();
  guardar(datos);
  ui.menuPartida(datos);
  etapaElegida = 'granja';
  ui.introEtapa(etapa('granja'));
  ui.abrirSub('pantalla-historia', 'pantalla-menu');   // aquí se elige granjera o granjero
}

/* =========================================================
   4. LOGROS
   ========================================================= */
function desbloquearLogro(id) {
  if (datos.logros[id]) return;
  const logro = CONFIG.logros.find((l) => l.id === id);
  if (!logro) return;
  datos.logros[id] = new Date().toISOString();
  guardar(datos);
  sonido.reproducir('logro');
  ui.avisoLogro(logro);
}
const metaLogro = (id) => CONFIG.logros.find((l) => l.id === id).meta;

/* =========================================================
   5. EMPEZAR, PAUSAR, PERDER Y GANAR
   ========================================================= */
function empezarPartida(id) {
  cargarNivel(id);
  partida = { tiempo: 0, eliminados: 0 };
  datos.estadisticas.partidasJugadas++;
  guardar(datos);

  arsenal.cargar(datos.arsenal);
  ui.limpiarTextos();
  quitarPremios();
  nivel.efectos.limpiar();
  reiniciarObjetos();
  nivel.logica.reiniciar(0);
  colocarJugador();
  copiaControl = arsenal.copia();
  ultimoControl = 0;
  pasoTarjeta = null;
  guardarPartida();
  pantallaCompleta();
  // La historia empieza con el secuestro del hermano (v0.6.4)
  if (id === 'granja' && CONFIG.cinematica.activa) verCinematica();
  else entrarAlJuego();
}

/* Escena del secuestro: nada se mueve en el juego mientras dura */
function verCinematica() {
  modo = 'cinematica';
  ui.mostrar(null);
  ui.mostrarHUD(false);
  arsenal.mostrar(false);
  entrada.activa = false;
  sonido.musica(null);
  sonido.atenuarMusica(false);
  cinematica.iniciar(nivel.escena, () => {
    colocarJugador();      // la cámara vuelve a los ojos del personaje
    entrarAlJuego();
  });
}

function colocarJugador() {
  const ini = nivel.logica.puntoInicio();
  jugador.reiniciar(ini.punto, ini.yaw);
  if (ini.vehiculo) {
    vehiculo.colocar(ini.vehiculo.x, ini.vehiculo.z, ini.vehiculo.yaw);
    if (ini.vehiculo.averiada) { vehiculo.averiada = true; vehiculo.inclinacion = 0.09; vehiculo.actualizarModelo(0); }
  }
  vehiculo.ocupado = false;
  if (ini.enVehiculo) {
    vehiculo.ocupado = true;
    vehiculo.actualizarCaja();
    jugador.subirVehiculo(vehiculo);
  }
  arsenal.mostrar(!jugador.enVehiculo);
}

/* Subir y bajar de la camioneta */
function subirCamioneta() {
  vehiculo.subir();
  jugador.subirVehiculo(vehiculo);
  arsenal.mostrar(false);
  ui.avisoUsar(null);
}

function bajarCamioneta(forzar = false) {
  if (!forzar && Math.abs(vehiculo.velocidad) > CONFIG.vehiculo.velocidadParaBajar) {
    ui.mensaje('FRENA PARA BAJARTE (S)', 1.5);
    return;
  }
  vehiculo.bajar();
  jugador.bajarVehiculo(vehiculo);
  camara.fov = CONFIG.jugador.fov;
  camara.updateProjectionMatrix();
  arsenal.mostrar(true);
}
vehiculo.alChocar = (danio) => recibirGolpe(danio, vehiculo.posicion.x + vehiculo.adelante().x * 3, vehiculo.posicion.z + vehiculo.adelante().z * 3);
vehiculo.alAtropellar = () => {
  const e = datos.estadisticas;
  e.atropellos = (e.atropellos || 0) + 1;
  if (e.atropellos >= metaLogro('atropellador')) desbloquearLogro('atropellador');
};

function entrarAlJuego() {
  modo = 'jugando';
  ui.mostrar(null);
  ui.mostrarHUD(true);
  arsenal.mostrar(!jugador.enVehiculo);
  camara.fov = CONFIG.jugador.fov;
  camara.updateProjectionMatrix();
  entrada.reiniciar();
  entrada.activa = true;
  entrada.pedirBloqueo();
  sonido.atenuarMusica(false);
  sonido.musica('exploracion');
  reloj.getDelta();
}

function pausar() {
  if (modo !== 'jugando') return;
  modo = 'pausa';
  entrada.activa = false;
  entrada.soltarBloqueo();
  sonido.atenuarMusica(true);
  ui.mostrar('pantalla-pausa');
}

function reanudar() {
  if (modo !== 'pausa') return;
  modo = 'jugando';
  ui.mostrar(null);
  entrada.reiniciar();
  entrada.activa = true;
  entrada.pedirBloqueo();
  sonido.atenuarMusica(false);
  reloj.getDelta();
}

function irAlMenu() {
  modo = 'menu';
  entrada.activa = false;
  entrada.soltarBloqueo();
  enemigos.limpiar();
  nivel.efectos.limpiar();
  ui.mostrarHUD(false);
  ui.marcador(null);
  ui.barraJefe(null);
  ui.manejando(null);
  sonido.motorContinuo(null);
  arsenal.mostrar(false);
  camara.fov = CONFIG.jugador.fov;
  camara.rotation.set(0, 0, 0);
  camara.updateProjectionMatrix();
  sonido.atenuarMusica(false);
  sonido.musica('menu');
  ui.recordMenu(datos);
  ui.menuPartida(datos);
  ui.mostrar('pantalla-menu');
}

function perder() {
  modo = 'fin';
  entrada.activa = false;
  entrada.soltarBloqueo();
  sonido.motorContinuo(null);
  sonido.musica(null);
  sonido.reproducir('derrota');
  guardar(datos);
  setTimeout(() => {
    ui.mostrarHUD(false);
    ui.marcador(null);
    ui.mostrar('pantalla-derrota');
  }, 1300);
}

/* Reintentar desde el último punto de control */
function reintentar() {
  nivel.efectos.limpiar();
  nivel.logica.reiniciar(nivel.logica.puntoControl);
  colocarJugador();
  arsenal.restaurar(copiaControl);
  granadas.limpiar();
  pasoTarjeta = null;
  ui.mensaje('Punto de control', 2.5);
  entrarAlJuego();
}

/* Guarda la etapa ganada: progreso, logros, mejor tiempo y armas. Devuelve la puntería */
function registrarVictoria() {
  const punteria = arsenal.disparos ? Math.round((arsenal.impactos / arsenal.disparos) * 100) : 0;
  datos.estadisticas.disparos += arsenal.disparos;
  datos.estadisticas.impactos += arsenal.impactos;
  const p = datos.progreso;
  const id = nivel.id;
  if (id === 'granja') { p.granjaCompletada = true; desbloquearLogro('fuera_de_mi_granja'); }
  if (id === 'carretera') desbloquearLogro('en_la_carretera');
  if (id === 'ciudad') desbloquearLogro('ciudad_liberada');
  if (id === 'nave') desbloquearLogro('rumbo_colmena');
  p.completadas = { ...p.completadas, [id]: true };
  const tiempo = Math.round(partida.tiempo);
  if (!p.mejoresTiempos[id] || tiempo < p.mejoresTiempos[id]) p.mejoresTiempos[id] = tiempo;
  datos.arsenal = arsenal.aGuardar();
  guardar(datos);

  if (punteria >= metaLogro('ojo_de_halcon')) desbloquearLogro('ojo_de_halcon');
  return punteria;
}

function ganar() {
  // Cómo terminó Rosa la etapa: la siguiente empieza igual (v0.6)
  continuacion = { enVehiculo: jugador.enVehiculo, velocidad: vehiculo.velocidad };
  modo = 'fin';
  entrada.activa = false;
  entrada.soltarBloqueo();
  sonido.motorContinuo(null);
  const punteria = registrarVictoria();
  // La partida guardada pasa a la etapa siguiente (o queda terminada)
  const sigEtapa = etapaSiguiente(nivel.id);
  if (sigEtapa) guardarPartida(sigEtapa.id, 0, arsenal.copia());
  else guardarPartida(nivel.id, nivel.logica.puntoControl, arsenal.copia(), true);
  const p = datos.progreso;
  const id = nivel.id;
  sonido.musica(null);
  sonido.reproducir('victoria');

  ui.resultados({ etapa: nivel.etapa, tiempo: partida.tiempo, eliminados: partida.eliminados, punteria, mejorTiempo: p.mejoresTiempos[id], siguiente: etapaSiguiente(id) });
  setTimeout(() => {
    ui.mostrarHUD(false);
    ui.marcador(null);
    ui.manejando(null);
    ui.mostrar('pantalla-victoria');
  }, continuacion.enVehiculo ? 1200 : 2600);
}

/* Historia continua (v0.6): desde el panel de "etapa completada", el botón
   Continuar carga la etapa siguiente y Rosa sigue justo como terminó:
   con sus armas y munición, y si venía manejando, sigue manejando.
   Cada etapa sigue siendo un punto de control (vida y escudo llenos). */
let continuacion = null;

function continuarHistoria() {
  const sig = etapaSiguiente(nivel.id);
  if (!sig) return;
  const estado = continuacion || {};
  continuacion = null;
  ui.mostrar(null);
  entrada.pedirBloqueo();              // el bloqueo del mouse necesita el clic del botón
  modo = 'transicion';
  ui.fundido(true, `Etapa ${sig.numero} · ${sig.nombre}`);
  setTimeout(() => {
    cargarNivel(sig.id);
    partida = { tiempo: 0, eliminados: 0 };
    ui.limpiarTextos();
    quitarPremios();
    nivel.efectos.limpiar();
    reiniciarObjetos();
    nivel.logica.reiniciar(0);
    colocarJugador();
    if (estado.enVehiculo && jugador.enVehiculo) {
      vehiculo.velocidad = Math.min(Math.max(8, estado.velocidad), CONFIG.vehiculo.velocidadMax * 0.7);
      vehiculo.camaraPos.set(0, 0, 0);   // la cámara se pone detrás de una vez
    }
    arsenal.disparos = 0;               // la puntería de cada etapa se cuenta aparte
    arsenal.impactos = 0;
    copiaControl = arsenal.copia();     // las armas con las que llegó (punto de control)
    ultimoControl = 0;
    guardarPartida();
    entrarAlJuego();
    ui.fundido(false);
  }, 900);
}

/* En el celular: pantalla completa y horizontal (si el navegador lo permite) */
function pantallaCompleta() {
  if (!entrada.esTactil) return;
  try {
    const el = document.documentElement;
    if (!document.fullscreenElement && el.requestFullscreen) {
      el.requestFullscreen().then(() => {
        if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {});
      }).catch(() => {});
    }
  } catch (e) { /* no se pudo: no pasa nada */ }
}

/* =========================================================
   6. EVENTOS DE LA PARTIDA
   ========================================================= */
/* Rosa recibe daño desde un punto (para la flecha roja) */
function recibirGolpe(danio, x, z) {
  if (modo !== 'jugando') return;
  const r = jugador.recibirDanio(danio);
  sonido.reproducir('jugadorHerido');
  if (r.escudoRoto) sonido.reproducir('escudoRoto');
  const dx = x - jugador.posicion.x;
  const dz = z - jugador.posicion.z;
  const derecha = dx * Math.cos(jugador.yaw) + dz * -Math.sin(jugador.yaw);
  const adelante = dx * -Math.sin(jugador.yaw) + dz * -Math.cos(jugador.yaw);
  ui.danio(THREE.MathUtils.radToDeg(Math.atan2(derecha, adelante)));
  if (r.murio) perder();
}
enemigos.alAtacar = (enemigo, danio) => recibirGolpe(danio, enemigo.posicion.x, enemigo.posicion.z);
enemigos.alSalpicar = (danio, punto) => recibirGolpe(danio, punto.x, punto.z);

// Un alien muere
enemigos.alMorir = (enemigo) => {
  partida.eliminados++;
  const e = datos.estadisticas;
  if (enemigo.esJefe) { jefeDerrotado(enemigo); return; }
  if (enemigo.tipo === 'zangano' || enemigo.tipo === 'minizangano') e.zanganosEliminados++;
  else if (enemigo.tipo === 'babosito' || enemigo.tipo === 'baboson') e.babososEliminados++;
  desbloquearLogro('primer_contacto');
  if (e.zanganosEliminados >= metaLogro('exterminador')) desbloquearLogro('exterminador');
  if (e.babososEliminados >= metaLogro('limpieza_de_baba')) desbloquearLogro('limpieza_de_baba');
  // Los aliens normales casi nunca sueltan algo (el Babosón, más seguido)
  // v0.8: a veces sueltan una caja de granadas
  if (Math.random() < CONFIG.granada.probabilidadSoltar && enemigo.tipo !== 'nido') {
    const s = nivel.mundo.agregarSuministro('granadas', enemigo.posicion.x, enemigo.posicion.z);
    s.temporal = true;
  } else if (Math.random() < enemigo.c.probabilidadSoltarMunicion) {
    const tipo = enemigo.tipo === 'zangano' || Math.random() < 0.4 ? 'balasAlien' : 'cartuchosAlien';
    const s = nivel.mundo.agregarSuministro(tipo, enemigo.posicion.x, enemigo.posicion.z);
    s.temporal = true;
  }
};

/* Un jefe cae: logros y premio (los jefes siempre sueltan un arma buena) */
function jefeDerrotado(jefe) {
  desbloquearLogro('primer_contacto');
  if (jefe.tipo === 'bestia') {
    desbloquearLogro('bestia_de_heno');
    if (jefe.fuePorFuego) desbloquearLogro('fuego_al_heno');
  }
  if (jefe.tipo === 'lanzador') desbloquearLogro('lanzador');
  if (jefe.tipo === 'guardian') desbloquearLogro('guardian');
  if (jefe.tipo === 'capitan') desbloquearLogro('capitan');
  if (CONFIG.logrosJefe && CONFIG.logrosJefe[jefe.tipo]) desbloquearLogro(CONFIG.logrosJefe[jefe.tipo]);
  ui.mensaje('¡JEFE DERROTADO!', 3);
  // El premio cae cerca de Rosa si el jefe murió lejos (por ejemplo, en medio de la plaza)
  const px = jefe.posicion.x, pz = jefe.posicion.z;
  setTimeout(() => soltarPremio(px + (jugador.posicion.x - px) * 0.5, pz + (jugador.posicion.z - pz) * 0.5, jefe.c.premio), 1800);
}

/* Arma en el suelo que se recoge con E */
function soltarPremio(x, z, rarezas = ['epica', 'legendaria']) {
  if (modo !== 'jugando' && modo !== 'pausa') return;
  const tipos = ['escopeta', 'pistola', 'rifle'];
  const tipo = tipos[Math.floor(Math.random() * tipos.length)];
  const rareza = rarezas[Math.floor(Math.random() * rarezas.length)];
  const color = CONFIG.rarezas[rareza].color;
  const modelo = crearArmaSuelo(tipo, color);
  const grupo = new THREE.Group();
  grupo.add(modelo.grupo);
  // Columna de luz del color de la rareza (para encontrarla de lejos)
  const columna = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 14, 10, 1, true), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.25, depthWrite: false, side: THREE.DoubleSide }));
  columna.position.y = 7;
  grupo.add(columna);
  grupo.position.set(x, 0, z);
  nivel.escena.add(grupo);
  nivel.efectos.explosionRareza(new THREE.Vector3(x, 1, z), color);
  sonido.reproducir(rareza === 'legendaria' ? 'armaLegendaria' : 'armaNueva');
  nivel.premios.push({ grupo, arma: modelo.grupo, tipo, rareza, posicion: new THREE.Vector3(x, 0, z), base: Math.random() * 5 });
}

function recogerPremio(premio) {
  const r = arsenal.agregarArma(premio.tipo, premio.rareza);
  const nombre = `${r.arma.datos.nombre} ${r.arma.datos.nombreRareza.toLowerCase()}`;
  const textos = { nueva: `NUEVA ARMA: ${nombre}`, mejor: `¡MEJORASTE! ${nombre}`, municion: `${nombre}: ya tenías una igual o mejor. +${r.cantidad} ${r.arma.datos.municion}`, reemplazo: `CAMBIASTE TU ARMA: ${nombre}` };
  ui.mensaje(textos[r.resultado], 3);
  sonido.reproducir(premio.rareza === 'legendaria' ? 'armaLegendaria' : 'armaNueva');
  if (premio.rareza === 'legendaria' && r.resultado !== 'municion') desbloquearLogro('coleccionista');
  nivel.escena.remove(premio.grupo);
  nivel.premios.splice(nivel.premios.indexOf(premio), 1);
  datos.arsenal = arsenal.aGuardar();
  guardar(datos);
}

function quitarPremios() {
  if (!nivel) return;
  nivel.premios.forEach((p) => nivel.escena.remove(p.grupo));
  nivel.premios = [];
}

/* =========================================================
   v0.8: GRANADAS, GOLPE, MOCHILA Y PRESENTACIONES
   ========================================================= */
function lanzarGranada() {
  if (jugador.enVehiculo || esperaGranada > 0) return;
  if (mochila.granadas <= 0) { ui.mensaje('SIN GRANADAS', 1.4); sonido.reproducir('sinMunicion'); esperaGranada = 0.4; return; }
  mochila.granadas--;
  esperaGranada = CONFIG.granada.espera;
  arsenal.lanzaAnim = 1;
  granadas.lanzar(camara, jugador);
}

function explotarGranada(punto) {
  const G = CONFIG.granada;
  const antes = partida ? partida.eliminados : 0;
  enemigos.explotar(punto, G.radio, G.danio, G.danioJugador, jugador);
  if (jugador.posicion.distanceTo(punto) < 25) jugador.sacudida = Math.max(jugador.sacudida, 0.8);
  if (partida && partida.eliminados - antes >= 3) desbloquearLogro('bombazo');
}

/* Culatazo: golpea a lo que tengas justo al frente y lo empuja */
function golpear() {
  if (jugador.enVehiculo || esperaGolpe > 0) return;
  const C = CONFIG.golpe;
  esperaGolpe = C.espera;
  arsenal.golpeAnim = 1;
  sonido.reproducir('golpeAire');
  const ax = -Math.sin(jugador.yaw), az = -Math.cos(jugador.yaw);
  let acerto = false;
  for (const e of [...enemigos.lista]) {
    if (!e.vivo || e.estado === 'apareciendo') continue;
    const dx = e.posicion.x - jugador.posicion.x, dz = e.posicion.z - jugador.posicion.z;
    const d = Math.hypot(dx, dz) || 0.001;
    if (d - (e.c.radio || 0.5) > C.alcance || (dx * ax + dz * az) / d < C.angulo) continue;
    const dir = new THREE.Vector3(ax, 0, az).multiplyScalar(C.empuje / 2.5);
    const murio = enemigos.herir(e, C.danio, new THREE.Vector3(e.posicion.x, 1, e.posicion.z), dir, null);
    ui.marcaImpacto(murio);
    if (murio) desbloquearLogro('culatazo');
    acerto = true;
  }
  if (acerto) { sonido.reproducir('golpeCarne'); jugador.sacudida = Math.max(jugador.sacudida, 0.25); }
}

/* Usar un botiquín de la mochila (tecla H o desde la mochila) */
function usarBotiquin() {
  if (mochila.botiquines <= 0) { ui.mensaje('NO TIENES BOTIQUINES', 1.5); sonido.reproducir('vidaLlena'); return; }
  if (jugador.vida >= CONFIG.jugador.vidaMax) { ui.mensaje('VIDA LLENA', 1.4); sonido.reproducir('vidaLlena'); return; }
  mochila.botiquines--;
  const curado = jugador.curar(CONFIG.mochila.curaBotiquin);
  sonido.reproducir('curarse');
  ui.mensaje(`+${Math.round(curado)} VIDA`, 1.6);
}

/* Un objeto importante va a la mochila (llaves, el sombrero…) */
function agregarObjeto(id) {
  if (!mochila.agregarObjeto(id)) return;
  setTimeout(() => {
    if (modo !== 'jugando') return;
    ui.mensaje('A LA MOCHILA: ' + textoPersonaje(OBJETOS[id].nombre).toUpperCase(), 2.4);
    sonido.reproducir('mochila');
  }, 2600);
}

function abrirMochila() {
  if (modo !== 'jugando') return;
  modo = 'mochila';
  momentoMochila = performance.now();
  entrada.activa = false;
  entrada.soltarBloqueo();
  sonido.atenuarMusica(true);
  sonido.reproducir('mochila');
  mochila.dibujar($('contenido-mochila'));
  ui.mostrar('pantalla-mochila');
}

function cerrarMochila() {
  if (modo !== 'mochila') return;
  modo = 'jugando';
  ui.mostrar(null);
  sonido.atenuarMusica(false);
  entrada.reiniciar();
  entrada.activa = true;
  entrada.pedirBloqueo();
}

/* La primera vez que ves un monstruo: se presenta (cámara + ficha) */
function iniciarPresentacion(e) {
  modo = 'presentacion';
  document.body.classList.add('presentando');
  entrada.activa = false;
  arsenal.mostrar(false);
  ui.mostrarHUD(false);
  const ctx = { sonido, alAtacar: () => {}, gestor: enemigos, efectos: nivel.efectos };
  presentacion.iniciar(e, jugador, nivel.efectos, ctx, nivel.mundo, (tipo) => {
    datos.bestiario[tipo] = true;
    guardar(datos);
    modo = 'jugando';
    document.body.classList.remove('presentando');
    ui.mostrarHUD(true);
    arsenal.mostrar(!jugador.enVehiculo);
    entrada.reiniciar();
    entrada.activa = true;
    if (!jugador.enVehiculo) jugador.actualizarCamara(0);
  });
}

/* Barril que explota: daña todo alrededor y hace explotar a los barriles cercanos */
function explotarBarril(b) {
  const O = CONFIG.objetos;
  enemigos.explotar(b.posicion.clone().setY(0.8), O.radioExplosion, O.danioExplosion, O.danioExplosionJugador, jugador);
  if (jugador.posicion.distanceTo(b.posicion) < 20) jugador.sacudida = Math.max(jugador.sacudida, 0.7);
}
enemigos.alExplotar = (punto, radio) => {
  // Reacción en cadena (con un pequeño retraso, se ve mejor)
  (nivel.mundo.barriles || []).forEach((b) => {
    if (!b.explotado && Math.hypot(b.posicion.x - punto.x, b.posicion.z - punto.z) < radio) nivel.barrilesPendientes.push({ b, tiempo: 0.18 });
  });
};

function etapaSiguiente(id) {
  const i = ETAPAS.findIndex((e) => e.id === id);
  const sig = ETAPAS.slice(i + 1).find((e) => e.estado !== 'pronto');
  return sig && ETAPAS[i + 1] === sig ? sig : null;
}

/* Suministros y cofres */
function reiniciarObjetos() {
  const m = nivel.mundo;
  for (let i = m.suministros.length - 1; i >= 0; i--) {
    const s = m.suministros[i];
    if (s.temporal) { nivel.escena.remove(s.grupo); m.suministros.splice(i, 1); continue; }
    s.activo = true;
    s.grupo.visible = true;
  }
  m.cofres.forEach((c) => { c.abierto = false; });
  if (nivel.extras) nivel.extras.alReiniciarObjetos();   // los cofres escondidos que ya abriste siguen abiertos
}

/* Abrir un cofre: da un arma al azar con rareza */
function abrirCofre(cofre) {
  cofre.abierto = true;
  sonido.reproducir('abrirCofre');
  // Más probable que salga un arma que todavía no tienes
  const tipos = ['escopeta', 'pistola', 'rifle'];
  const faltan = tipos.filter((t) => !arsenal.armas.some((a) => a.tipo === t));
  const tipo = faltan.length && Math.random() < 0.65 ? faltan[Math.floor(Math.random() * faltan.length)] : tipos[Math.floor(Math.random() * tipos.length)];
  const rareza = cofre.rareza || rarezaAlAzar();   // los cofres escondidos (v0.8) traen rareza fija
  const r = arsenal.agregarArma(tipo, rareza);
  const nombre = `${r.arma.datos.nombre} ${r.arma.datos.nombreRareza.toLowerCase()}`;
  const textos = {
    nueva: `NUEVA ARMA: ${nombre}`,
    mejor: `¡MEJORASTE! ${nombre}`,
    municion: `${nombre}: ya tenías una igual o mejor. +${r.cantidad} ${r.arma.datos.municion}`,
    reemplazo: `CAMBIASTE TU ARMA: ${nombre}`
  };
  ui.mensaje(textos[r.resultado], 3);
  sonido.reproducir(rareza === 'legendaria' ? 'armaLegendaria' : 'armaNueva');
  nivel.efectos.explosionRareza(cofre.posicion.clone().setY(1), r.arma.datos.color);
  jugador.curar(CONFIG.objetos.cofreCura);
  desbloquearLogro('saqueador');
  if (rareza === 'legendaria' && r.resultado !== 'municion') desbloquearLogro('coleccionista');
  datos.arsenal = arsenal.aGuardar();
  guardar(datos);
}

function revisarObjetos(acc) {
  const O = CONFIG.objetos;
  for (const s of nivel.mundo.suministros) {
    if (!s.activo) continue;
    const d = Math.hypot(s.posicion.x - jugador.posicion.x, s.posicion.z - jugador.posicion.z);
    if (d > O.radioRecoger) { s.avisado = false; continue; }
    if (s.tipo === 'granadas') {
      // v0.8: caja de granadas (van a la mochila)
      if (mochila.granadasLlenas) {
        if (!s.avisado) { ui.mensaje('GRANADAS: MOCHILA LLENA'); sonido.reproducir('vidaLlena'); s.avisado = true; }
        continue;
      }
      const n = mochila.agregarGranadas(CONFIG.granada.cajaTrae);
      sonido.reproducir('recogerMunicion');
      ui.mensaje(`+${n} GRANADA${n > 1 ? 'S' : ''}`);
      nivel.efectos.recoger(s.posicion.clone().setY(0.4), 0x9dff6a);
    } else if (s.tipo === 'botiquin') {
      if (jugador.vida >= CONFIG.jugador.vidaMax) {
        // v0.8: con la vida llena, el botiquín se guarda en la mochila (si cabe)
        if (!mochila.botiquinesLlenos) {
          mochila.botiquines++;
          sonido.reproducir('mochila');
          ui.mensaje(`BOTIQUÍN A LA MOCHILA (${mochila.botiquines}/${CONFIG.mochila.maxBotiquines}) · H para usar`, 2.4);
          nivel.efectos.recoger(s.posicion.clone().setY(0.4), 0xff4d5e);
          s.activo = false;
          s.grupo.visible = false;
          continue;
        }
        // Mochila llena: no se gasta, se queda ahí y te avisa
        if (!s.avisado) { ui.mensaje('VIDA LLENA'); sonido.reproducir('vidaLlena'); s.avisado = true; }
        continue;
      }
      const curado = jugador.curar(O.botiquinCura);
      sonido.reproducir('recogerBotiquin');
      ui.mensaje(`+${Math.round(curado)} VIDA`);
      nivel.efectos.recoger(s.posicion.clone().setY(0.4), 0xff4d5e);
    } else {
      const tipoMunicion = s.tipo.startsWith('cartuchos') ? 'cartuchos' : 'balas';
      const cantidad = { balas: O.cajaBalas, cartuchos: O.cajaCartuchos, balasAlien: O.municionAlien, cartuchosAlien: O.cartuchosAlien }[s.tipo];
      if (arsenal.municionLlena(tipoMunicion)) {
        if (!s.avisado) { ui.mensaje(`${tipoMunicion.toUpperCase()}: MUNICIÓN LLENA`); sonido.reproducir('vidaLlena'); s.avisado = true; }
        continue;
      }
      const agregada = arsenal.agregarMunicion(tipoMunicion, cantidad);
      sonido.reproducir('recogerMunicion');
      ui.mensaje(`+${agregada} ${tipoMunicion.toUpperCase()}`);
      nivel.efectos.recoger(s.posicion.clone().setY(0.4), 0xffc65c);
    }
    s.activo = false;
    s.grupo.visible = false;
  }

  // Lo que se puede usar con E: cofres y cosas de la misión
  const usables = [
    ...nivel.mundo.cofres.filter((c) => !c.abierto).map((c) => ({ posicion: c.posicion, radio: O.distanciaUsar, texto: 'Abrir cofre', accion: () => abrirCofre(c) })),
    ...nivel.premios.map((p) => ({ posicion: p.posicion, radio: O.distanciaUsar, texto: `Recoger ${CONFIG.armas[p.tipo].nombre} (${CONFIG.rarezas[p.rareza].nombre})`, accion: () => recogerPremio(p) })),
    // Lo de la misión va primero si está cerca (ej.: rescatar a los soldados junto a un cofre)
    ...nivel.logica.interactuables().map((u) => ({ ...u, prioridad: true })),
    ...nivel.extras.interactuables().map((u) => ({ ...u, prioridad: true }))
  ];
  // La camioneta: subir (a pie, cerca) o bajar (manejando)
  if (nivel.mundo.usaVehiculo) {
    if (jugador.enVehiculo) usables.length = 0;
    const dCamioneta = Math.hypot(vehiculo.posicion.x - jugador.posicion.x, vehiculo.posicion.z - jugador.posicion.z);
    // El aviso de bajarse solo sale al ir despacio (la ayuda de abajo ya dice "E bajarse")
    if (jugador.enVehiculo) usables.push({ posicion: jugador.posicion, radio: 1, texto: 'Bajar de la camioneta', accion: bajarCamioneta, oculto: vehiculo.averiada || Math.abs(vehiculo.velocidad) > CONFIG.vehiculo.velocidadParaBajar });
    else if (dCamioneta < O.distanciaSubir && !vehiculo.averiada) {
      // La misión decide si ya se puede (en la granja, hace falta tener las llaves)
      const permiso = nivel.logica.puedeSubir ? nivel.logica.puedeSubir() : true;
      if (permiso === true) usables.push({ posicion: vehiculo.posicion, radio: O.distanciaSubir, texto: 'Subir a la camioneta', accion: subirCamioneta });
      else usables.push({ posicion: vehiculo.posicion, radio: O.distanciaSubir, texto: 'Camioneta (bloqueada)', accion: () => { ui.mensaje(permiso.mensaje, 2); sonido.reproducir('vidaLlena'); } });
    }
  }
  let cercano = null;
  let mejor = Infinity;
  for (const u of usables) {
    const d = Math.hypot(u.posicion.x - jugador.posicion.x, u.posicion.z - jugador.posicion.z);
    const dEfectiva = u.prioridad ? d - 100 : d;
    if (d < u.radio && dEfectiva < mejor) { mejor = dEfectiva; cercano = u; }
  }
  ui.avisoUsar(cercano && !cercano.oculto ? cercano.texto : null);
  if (cercano && acc.usar) cercano.accion();
}

/* Ayuda al apuntar (solo celular): acerca la mira al alien más cercano a ella */
const vecTemp = new THREE.Vector3();
const adelanteCam = new THREE.Vector3();
function ayudaApuntado(dt, acc) {
  const A = CONFIG.ayudaApuntado;
  camara.getWorldDirection(adelanteCam);
  let mejor = null;
  let mejorAngulo = A.angulo;
  for (const e of enemigos.lista) {
    if (!e.vivo || e.estado === 'apareciendo') continue;
    vecTemp.set(e.posicion.x, e.alturaCentro, e.posicion.z).sub(camara.position);
    const dist = vecTemp.length();
    if (dist > A.distanciaMax) continue;
    const angulo = adelanteCam.angleTo(vecTemp);
    if (angulo < mejorAngulo) { mejorAngulo = angulo; mejor = vecTemp.clone(); }
  }
  if (!mejor) return;
  const yawObjetivo = Math.atan2(-mejor.x, -mejor.z);
  const pitchObjetivo = Math.atan2(mejor.y, Math.hypot(mejor.x, mejor.z));
  let dYaw = yawObjetivo - jugador.yaw;
  dYaw = Math.atan2(Math.sin(dYaw), Math.cos(dYaw));
  const k = Math.min(1, A.fuerza * dt);
  acc.mirarX -= dYaw * k;
  acc.mirarY -= (pitchObjetivo - jugador.pitch) * k;
}

/* Flecha que señala el objetivo de la misión */
const vecLocal = new THREE.Vector3();
const vecProy = new THREE.Vector3();
function actualizarMarcador() {
  const objetivo = nivel.logica.objetivoPosicion();
  if (!objetivo) { ui.marcador(null); return; }
  const distancia = Math.hypot(objetivo.x - jugador.posicion.x, objetivo.z - jugador.posicion.z);
  if (distancia < 5) { ui.marcador(null); return; }
  const W = window.innerWidth, H = window.innerHeight;
  vecLocal.set(objetivo.x, 1.5, objetivo.z).applyMatrix4(camara.matrixWorldInverse);
  vecProy.set(objetivo.x, 1.5, objetivo.z).project(camara);
  const dentro = vecLocal.z < 0 && Math.abs(vecProy.x) < 0.88 && Math.abs(vecProy.y) < 0.8;
  if (dentro) {
    ui.marcador({ x: (vecProy.x + 1) / 2 * W, y: (1 - vecProy.y) / 2 * H, angulo: 180, distancia, dentro });
    return;
  }
  // Fuera de la pantalla: la flecha se pega al borde apuntando hacia el objetivo
  let dx = vecLocal.x, dy = -vecLocal.y;
  if (vecLocal.z > 0 && Math.abs(dx) < 0.001) dx = 0.001;
  const largo = Math.hypot(dx, dy) || 1;
  dx /= largo; dy /= largo;
  const mx = W / 2 - 70, my = H / 2 - 70;
  const t = Math.min(mx / Math.max(0.001, Math.abs(dx)), my / Math.max(0.001, Math.abs(dy)));
  ui.marcador({ x: W / 2 + dx * t, y: H / 2 + dy * t, angulo: THREE.MathUtils.radToDeg(Math.atan2(dy, dx)) + 90, distancia, dentro });
}

/* =========================================================
   7. BOTONES DE LAS PANTALLAS
   ========================================================= */
function abrirEtapas() {
  sonido.iniciar();
  ui.listaEtapas(datos, (id) => {
    etapaElegida = id;
    ui.introEtapa(etapa(id));
    ui.abrirSub('pantalla-historia', 'pantalla-capitulos');
  });
  ui.abrirSub('pantalla-capitulos', 'pantalla-menu');
}
$('btn-historia').addEventListener('click', abrirEtapas);
$('btn-continuar-partida').addEventListener('click', continuarPartida);
$('btn-nueva-partida').addEventListener('click', () => {
  if (datos.partida && !datos.partida.terminada) ui.abrirSub('pantalla-nueva', 'pantalla-menu');
  else nuevaPartida();
});
$('btn-confirmar-nueva').addEventListener('click', nuevaPartida);
$('btn-comenzar').addEventListener('click', () => empezarPartida(etapaElegida));
document.querySelectorAll('[data-personaje]').forEach((b) => b.addEventListener('click', () => {
  sonido.reproducir('uiClic');
  elegirPersonaje(b.dataset.personaje);
}));
$('btn-logros').addEventListener('click', () => { ui.listaLogros(datos); ui.abrirSub('pantalla-logros', 'pantalla-menu'); });
$('btn-opciones').addEventListener('click', () => ui.abrirSub('pantalla-opciones', 'pantalla-menu'));
$('btn-controles').addEventListener('click', () => ui.abrirSub('pantalla-controles', 'pantalla-menu'));
$('btn-creditos').addEventListener('click', () => ui.abrirSub('pantalla-creditos', 'pantalla-menu'));

$('btn-continuar').addEventListener('click', reanudar);
$('btn-pausa-opciones').addEventListener('click', () => ui.abrirSub('pantalla-opciones', 'pantalla-pausa'));
$('btn-pausa-controles').addEventListener('click', () => ui.abrirSub('pantalla-controles', 'pantalla-pausa'));
$('btn-pausa-salir').addEventListener('click', irAlMenu);

$('btn-reintentar').addEventListener('click', reintentar);
$('btn-derrota-menu').addEventListener('click', irAlMenu);
$('btn-jugar-otra').addEventListener('click', () => { irAlMenu(); abrirEtapas(); });
$('btn-siguiente').addEventListener('click', continuarHistoria);
$('btn-victoria-menu').addEventListener('click', irAlMenu);
$('btn-victoria-creditos').addEventListener('click', () => ui.abrirSub('pantalla-creditos', 'pantalla-victoria'));

// Opciones: se aplican y se guardan al momento
ui.cargarOpciones(datos.opciones);
$('form-opciones').addEventListener('input', () => {
  datos.opciones = ui.leerOpciones();
  ui.textosOpciones(datos.opciones);
  aplicarOpciones(datos.opciones);
  guardar(datos);
});
$('form-opciones').addEventListener('submit', (e) => e.preventDefault());

entrada.alPausar = () => pausar();
entrada.alMochila = () => (modo === 'mochila' ? cerrarMochila() : abrirMochila());
// Con la mochila abierta la entrada está apagada: Tab, I o Esc la cierran
window.addEventListener('keydown', (e) => {
  if (modo === 'mochila' && ['Tab', 'KeyI', 'Escape'].includes(e.code) && performance.now() - momentoMochila > 150) { e.preventDefault(); cerrarMochila(); }
});
$('btn-cerrar-mochila').addEventListener('click', cerrarMochila);
$('btn-usar-botiquin').addEventListener('click', () => { usarBotiquin(); mochila.dibujar($('contenido-mochila')); });

// El primer toque/clic enciende el sonido y la música del menú
const encenderAudio = () => {
  sonido.iniciar();
  if (modo === 'menu') sonido.musica('menu');
};
window.addEventListener('pointerdown', encenderAudio);
window.addEventListener('keydown', encenderAudio);

/* =========================================================
   8. BUCLE PRINCIPAL (se repite unas 60 veces por segundo)
   ========================================================= */
let cuadros = 0;
let tiempoFps = 0;

function bucle() {
  requestAnimationFrame(bucle);
  const dt = Math.min(reloj.getDelta(), 0.05);
  const t = reloj.elapsedTime;
  const { mundo, logica } = nivel;

  mundo.actualizar(t, dt, jugador.posicion);

  if (modo === 'menu') {
    mundo.camaraMenu(t, camara);
  } else if (modo === 'cinematica') {
    cinematica.actualizar(dt);
  } else if (modo === 'presentacion') {
    presentacion.actualizar(dt);
  } else if (modo === 'jugando') {
    const acc = entrada.leer();
    if (acc.tactil && datos.opciones.ayudaApuntado && (acc.disparar || acc.apuntar || acc.mirarX || acc.mirarY)) ayudaApuntado(dt, acc);

    if (jugador.enVehiculo) {
      // ---- Manejando: la camioneta mueve a Rosa y pone la cámara ----
      vehiculo.actualizar(dt, acc, enemigos);
      jugador.seguirVehiculo(vehiculo);
      jugador.actualizarEscudo(dt);
      vehiculo.camaraPersecucion(camara, dt, acc.mirarX, jugador.sacudida);
      ui.manejando(vehiculo.velocidad);
    } else {
      // ---- A pie ----
      ui.manejando(null);
      // En la baba o en el agua de la laguna (v0.8) se camina más lento
      const enAgua = (mundo.zonasLentas || []).some((z) => Math.hypot(jugador.posicion.x - z.x, jugador.posicion.z - z.z) < z.r);
      const enBaba = enemigos.enCharco(jugador.posicion) || enAgua;
      if (enBaba && !jugador.enBaba) sonido.reproducir('pisarBaba');
      jugador.enBaba = enBaba;
      jugador.fovApuntar = arsenal.arma.datos.fovApuntar;
      jugador.actualizar(dt, acc, mundo);
      arsenal.actualizar(dt, acc, jugador, [...enemigos.objetivos(), ...(mundo.blancos ? mundo.blancos() : [])], mundo.solidos, (enemigo, danio, punto, dir, objeto) => {
        const murio = enemigos.herir(enemigo, danio, punto, dir, objeto);
        ui.marcaImpacto(murio);
        sonido.reproducir('marcaImpacto');
        return murio;
      });
      // v0.8: granada (G), golpe (V) y botiquín de la mochila (H)
      if (acc.granada) lanzarGranada();
      if (acc.golpe) golpear();
      if (acc.curar) usarBotiquin();
    }
    esperaGranada -= dt;
    esperaGolpe -= dt;
    sonido.oyente.x = jugador.posicion.x;
    sonido.oyente.z = jugador.posicion.z;
    sonido.oyente.yaw = jugador.yaw;
    // Logro: dos babosos de un solo escopetazo
    if (arsenal.muertesUltimoDisparo >= 2 && arsenal.tipoUltimoDisparo === 'escopeta') desbloquearLogro('escopetazo');
    arsenal.muertesUltimoDisparo = 0;

    enemigos.actualizar(dt, jugador, mundo);
    aliados.actualizar(dt, jugador, mundo, enemigos);
    if (mundo.usaVehiculo) vehiculo.echarHumo(dt, nivel.efectos);
    logica.actualizar(dt, jugador);
    nivel.extras.actualizar(dt, jugador);
    // Tarjeta "NUEVA MISIÓN" cada vez que cambia el paso de la misión (v0.8)
    if (modo === 'jugando' && logica.paso !== pasoTarjeta && logica.estado !== 'completada') {
      pasoTarjeta = logica.paso;
      const o = logica.textoObjetivo();
      ui.tarjetaMision(o.titulo, o.detalle, false);
      sonido.reproducir('misionNueva');
    }
    // Presentación de un monstruo nuevo (v0.8)
    esperaBuscarMonstruo -= dt;
    if (modo === 'jugando' && esperaBuscarMonstruo <= 0) {
      esperaBuscarMonstruo = 0.25;
      const nuevo = presentacion.buscar(enemigos, jugador, datos.bestiario);
      if (nuevo) iniciarPresentacion(nuevo);
    }
    // Los jefes avisan cosas ("¡saco reventado!", "¡el escudo cayó!")
    if (enemigos.jefe && enemigos.jefe.aviso) { ui.mensaje(enemigos.jefe.aviso, 2.6); enemigos.jefe.aviso = null; }
    if (modo === 'jugando') {
      // Punto de control nuevo: guardamos las armas de ese momento
      if (logica.puntoControl !== ultimoControl) {
        ultimoControl = logica.puntoControl;
        copiaControl = arsenal.copia();
        guardarPartida();
      }
      revisarObjetos(acc);
      actualizarMarcador();
    }
    partida.tiempo += dt;

    const peleandoJefe = enemigos.jefeVivo && enemigos.jefe.mostrarBarra;
    sonido.musica(peleandoJefe ? 'jefe' : enemigos.vivos > 0 || enemigos.jefeVivo ? 'combate' : 'exploracion');
    ui.actualizarHUD(jugador, arsenal, dt);
    ui.barraJefe(peleandoJefe ? enemigos.jefe : null);
    minimapa.actualizar(dt, {
      jugador, vehiculo: mundo.usaVehiculo ? vehiculo : null, enemigos: enemigos.lista,
      aliados: aliados.lista || [], objetivo: logica.objetivoPosicion(), marcas: nivel.extras.marcas(jugador)
    });
    ui.mochila(mochila.granadas, mochila.botiquines);
    ui.extras(nivel.extras.pendientes());
  }
  if (modo === 'transicion' && jugador.enVehiculo) vehiculo.camaraPersecucion(camara, dt, 0, 0);
  document.body.classList.toggle('mouse-libre', modo === 'jugando' && !entrada.esTactil && !entrada.bloqueado && !entrada.sinBloqueo);

  if (modo === 'fin') {
    enemigos.actualizar(dt, jugador, mundo);
    if (jugador.enVehiculo) vehiculo.camaraPersecucion(camara, dt, 0, 0);
    else jugador.actualizarCamara(dt);
  }

  // Granadas en el aire (siguen volando aunque ganes)
  if (modo === 'jugando' || modo === 'fin') granadas.actualizar(dt, nivel.mundo, explotarGranada);

  // Premios en el suelo: giran y flotan
  for (const p of nivel.premios) {
    p.arma.rotation.y = t * 1.5 + p.base;
    p.arma.position.y = 0.9 + Math.sin(t * 2.5 + p.base) * 0.12;
  }
  // Barriles que explotan en cadena
  if (modo === 'jugando' || modo === 'fin') {
    for (let i = nivel.barrilesPendientes.length - 1; i >= 0; i--) {
      const bp = nivel.barrilesPendientes[i];
      bp.tiempo -= dt;
      if (bp.tiempo <= 0) { nivel.barrilesPendientes.splice(i, 1); bp.b.explotar(); }
    }
  }

  nivel.efectos.actualizar(dt);
  renderer.render(nivel.escena, camara);

  cuadros++;
  tiempoFps += dt;
  if (tiempoFps >= 0.5) {
    ui.fps(Math.round(cuadros / tiempoFps), datos.opciones.mostrarFps);
    cuadros = 0;
    tiempoFps = 0;
  }
}
bucle();

// Para pruebas desde la consola del navegador (F12): window.juego
window.juego = {
  CONFIG, jugador, arsenal, enemigos, datos, camara, entrada, renderer, vehiculo, aliados, minimapa, cinematica, subirCamioneta, bajarCamioneta, colocarJugador,
  get nivel() { return nivel; }, empezarPartida, pausar, reanudar, irAlMenu,
  presentacion, mochila, granadas, lanzarGranada, golpear, usarBotiquin, abrirMochila, cerrarMochila
};
