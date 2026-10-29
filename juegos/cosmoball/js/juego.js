// =====================================================================
//  COSMOBALL — ping pong en el espacio (proyecto de clase de SantiSarm)
//  «Un universo. Dos pilotos. Ninguna regla normal.»
//  - Modos: 1 jugador (contra el robot), 2 jugadores o práctica.
//  - Se gana con 3, 5 o 7 goles, o en contrarreloj de 1 minuto.
//  - Poderes: hielo, escudo, encogedor, lluvia, cambio de lado, agujero
//    negro, cancha circular, remolino y cancha normal.
// =====================================================================

const canvas = document.getElementById("juego");
let ctx = canvas.getContext("2d");   // "let" para poder dibujar los íconos de "Cómo jugar"
const ANCHO = canvas.width;   // 960
const ALTO  = canvas.height;  // 540

// Bordes de la cancha (ocupa toda la pantalla)
const C_IZQ = 0, C_DER = ANCHO;
const C_ARRIBA = 0, C_ABAJO = ALTO;
const $ = id => document.getElementById(id);

// =====================================================================
//  CONFIGURACIÓN
// =====================================================================
let GOLES_PARA_TERMINAR = 5;   // se elige en la configuración: 3, 5 o 7
// ⏱ Contrarreloj: 1 minuto, gana quien meta más goles (si empatan: gol de oro)
let contrarreloj = false;
const DURACION_CONTRARRELOJ = 60 * 60;   // 60 segundos (60 cuadros por segundo)
let tiempoRestante = DURACION_CONTRARRELOJ;
let golDeOro = false;

// Sensibilidad de los controles (más bajo = más suave y lento)
const SENSIBILIDAD = 0.15;   // qué tan rápido la paleta sigue al mouse (antes 0.18)
const SENSIBILIDAD_DEDO = 0.24; // en celular, un poco más rápida porque el dedo tapa la paleta
const VEL_TECLAS   = 6;      // píxeles por cuadro con el teclado (antes 7)
const VEL_BOTONES  = 7;      // píxeles por cuadro con los botones ▲ ▼ del celular

// Agujeros negros
const DURACION_AGUJERO = 480;
const TIEMPO_ATRAPADA  = 55;

// Poderes
const MAX_PODERES       = 3;    // máximo 3 poderes en la cancha
const REGENERA_PODER    = 300;  // cuando se toca uno, sale otro 5 segundos después
const APARECE_INICIO    = 240;  // al empezar, van apareciendo de a uno cada 4 s
const CONGELA_ROBOT     = 110;  // ❄ congelado el robot (~1.8 s)
const CONGELA_HUMANO    = 80;   // ❄ congelada una persona (~1.3 s)
const DURACION_ENCOGER  = 360;  // 👽 ~6 s
const DURACION_LLUVIA   = 330;  // ☄ ~5.5 s
const DURACION_CAMBIO   = 120;  // 🔄 pausa de la pelota al cambiar de lado (2 s)
const DURACION_CAMBIO_CEL = 180; // 🔄 en celular un poco más larga (3 s)

// ¿Se está jugando en una pantalla táctil (celular o tablet)?
const esCelular = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;

// "peso": entre más alto, más seguido sale ese poder.
// Casi todos tienen 1 (misma posibilidad). El ▭ tiene 3 para que la cancha
// circular no dure demasiado.
const TIPOS_PODER = {
  hielo:     { color: "#9fe6ff", peso: 1 },
  escudo:    { color: "#ffb36b", peso: 1 },
  encoger:   { color: "#7dff6a", peso: 1 },
  lluvia:    { color: "#ff7b3c", peso: 1 },
  cambio:    { color: "#ffd23f", peso: 1 },
  circulo:   { color: "#5fffd7", peso: 1 },
  giro:      { color: "#ff9df5", peso: 1 },  // solo sale en la cancha circular
  agujero:   { color: "#b98cff", peso: 1 },
  normal:    { color: "#7fb2ff", peso: 3 }   // solo en la cancha circular, después del primer giro (sale más para no quedarse tanto)
};

// DIFICULTAD (sirve para 1 y 2 jugadores)
//   velInicial: qué tan rápido sale la pelota en cada saque
//   velMax:     velocidad máxima de la pelota
//   velTiempo:  cuánto se acelera la pelota con el tiempo
//   Solo para el robot (1 jugador):
//   vel: rapidez de su paleta (más alto = más difícil)
//   base y porVel: sus errores de puntería (más alto = más fácil)
const DIFICULTADES = {
  facil:   { velInicial: 3,   velMax: 11, velTiempo: 0.0025,
             vel: 4.0, base: 36, porVel: 10 },
  normal:  { velInicial: 3.5, velMax: 14, velTiempo: 0.0025,
             vel: 5.0, base: 26, porVel: 7.5 },
  dificil: { velInicial: 4.5, velMax: 15, velTiempo: 0.005,
             vel: 7.4, base: 8.5, porVel: 4.1 }
};
let dificultad = DIFICULTADES.normal;

const COLORES_NAVE   = ["#ff3cac", "#38e8ff", "#ffd23f", "#ff7b3c", "#b98cff", "#7dff6a"];

// 🌐 MULTIJUGADOR EN LÍNEA (cada jugador en su aparato)
// Todo el código de la conexión está en js/enlinea.js. Aquí solo queda este
// objeto para que juego.js sepa si se está jugando en línea:
//   activo: true mientras hay una sala abierta
//   rol:    "anfitrion" (creó la sala y corre el juego) o "invitado" (se unió)
//   yo:     la nave de este aparato (p1 para el anfitrión, p2 para el invitado)
// Las líneas marcadas con 🌐 en este archivo son los "ganchos" del modo en línea.
const enLinea = { activo: false, rol: null, yo: null };
const COLOR_ROBOT = "#7dff6a";

// =====================================================================
//  JUGADORES Y PELOTA
// =====================================================================
const ALTO_PALETA = 115;      // tamaño normal de las naves (antes 100)
const X_IZQ = C_IZQ + 24, X_DER = C_DER - 38;
function xDelLado(lado) { return lado < 0 ? X_IZQ : X_DER; }

function crearJugador(lado) {
  return {
    lado,                       // -1 = izquierda, 1 = derecha
    x: xDelLado(lado), y: ALTO / 2 - ALTO_PALETA / 2, w: 14, h: ALTO_PALETA,
    objetivoY: ALTO / 2 - ALTO_PALETA / 2,
    nombre: "", color: "#ff3cac", esRobot: false, esPared: false, forma: "clasica",
    puntos: 0, golpes: 0,
    congelado: 0, encogido: 0, escudo: false, error: 0
  };
}
const p1 = crearJugador(-1);
const p2 = crearJugador(1);
const jugadores = [p1, p2];
const rivalDe = p => (p === p1 ? p2 : p1);

const pelota = { x: ANCHO/2, y: ALTO/2, r: 9, vx: 0, vy: 0, vel: 3.5,
                 atrapada: null, giro: 0, tiempoAtrapada: 0 };

let modo = 1;              // 1 o 2 jugadores
let estado = "menu";       // "menu" | "jugando" | "pausa" | "gol" | "fin"
let temporizador = 0;
let tituloCartel = "", mensaje = "";
let temblor = 0, cuadro = 0;
let golpes = 0, mejorRacha = 0;
let ultimoGolpe = null;    // el jugador que tocó la pelota de último
let haciaQuienSaca = p1;
let cuentaSaque = 0;       // cuenta regresiva 3, 2, 1 antes de cada saque
let celebrar = false;      // 🎆 fuegos artificiales en la pantalla final
let flashGol = null;       // destello en el arco cuando hay gol
let cambio = 0;            // cuadros que faltan de la animación de cambio de lado
let aviso = null;          // texto grande al tomar un poder

const estela = [], particulas = [], agujeros = [], poderes = [], asteroides = [];
let esperaPoder = APARECE_INICIO;
let yaSeLleno = false;       // true cuando la cancha ya tuvo sus 3 poderes
let lluvia = 0;

const burlas = ["Bip bup... gol 👾", "Ningún humano me gana", "¿Eso es todo, terrícola?",
  "Mis circuitos no fallan", "Perdido en el espacio", "Houston, tenemos un gol"];
const quejas = ["¡Error en mis circuitos! 🤖", "Eso fue suerte, terrícola", "¡Recalculando...!",
  "Bip... ¿qué pasó?", "¡Gran tiro, piloto!"];
const festejos = ["¡Qué golazo!", "¡Directo a otra galaxia!", "¡Imparable!",
  "¡A la velocidad de la luz!", "¡Eso dolió!"];

// =====================================================================
//  FONDO GALÁCTICO
// =====================================================================
const estrellas = [];
for (let i = 0; i < 170; i++) {
  estrellas.push({ x: Math.random() * ANCHO, y: Math.random() * ALTO,
    tam: Math.random() * 1.8 + 0.3, vel: Math.random() * 0.5 + 0.08, brillo: Math.random() * 6.3 });
}

const nebulosa = document.createElement("canvas");
nebulosa.width = ANCHO; nebulosa.height = ALTO;
(function pintarNebulosa() {
  const n = nebulosa.getContext("2d");
  n.fillStyle = "#050a24";                 // azul oscuro del espacio (COSMOBALL)
  n.fillRect(0, 0, ANCHO, ALTO);
  [[200, 120, 260, "rgba(130, 60, 230, .32)"], [760, 420, 300, "rgba(20, 90, 220, .30)"],
   [520, 260, 220, "rgba(255, 60, 172, .12)"], [880, 80, 180, "rgba(56, 232, 255, .12)"],
   [130, 450, 170, "rgba(255, 140, 50, .14)"]
  ].forEach(([x, y, r, c]) => {
    const g = n.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, c); g.addColorStop(1, "rgba(0,0,0,0)");
    n.fillStyle = g; n.fillRect(0, 0, ANCHO, ALTO);
  });
  // 🕳 Agujero negro de fondo (el símbolo de COSMOBALL), en vez del planeta
  const px = 120, py = 450;
  n.save();
  n.globalAlpha = 0.6;
  n.translate(px, py); n.rotate(-0.3); n.scale(1, 0.32);
  [[110, "rgba(155, 92, 255, .55)", 10], [92, "rgba(255, 60, 172, .7)", 8], [76, "rgba(255, 154, 60, .9)", 6]]
    .forEach(([r, c, w]) => { n.strokeStyle = c; n.lineWidth = w; n.beginPath(); n.arc(0, 0, r, 0, Math.PI * 2); n.stroke(); });
  n.restore();
  n.save();
  n.globalAlpha = 0.9;
  const gh = n.createRadialGradient(px, py, 30, px, py, 52);
  gh.addColorStop(0, "#01020a"); gh.addColorStop(0.8, "#01020a"); gh.addColorStop(1, "rgba(56, 232, 255, .0)");
  n.fillStyle = gh;
  n.beginPath(); n.arc(px, py, 52, 0, Math.PI * 2); n.fill();
  n.strokeStyle = "rgba(56, 232, 255, .45)"; n.lineWidth = 2;
  n.beginPath(); n.arc(px, py, 41, 0, Math.PI * 2); n.stroke();
  n.restore();
  // La mitad de adelante del anillo pasa por encima del agujero
  n.save();
  n.globalAlpha = 0.6;
  n.translate(px, py); n.rotate(-0.3); n.scale(1, 0.32);
  [[110, "rgba(155, 92, 255, .55)", 10], [92, "rgba(255, 60, 172, .7)", 8], [76, "rgba(255, 154, 60, .9)", 6]]
    .forEach(([r, c, w]) => { n.strokeStyle = c; n.lineWidth = w; n.beginPath(); n.arc(0, 0, r, 0, Math.PI); n.stroke(); });
  n.restore();
})();

function dibujarFondo() {
  ctx.drawImage(nebulosa, 0, 0);
  ctx.fillStyle = "#ffffff";
  estrellas.forEach(s => {
    s.x -= s.vel;
    if (s.x < 0) { s.x = ANCHO; s.y = Math.random() * ALTO; }
    s.brillo += 0.05;
    ctx.globalAlpha = 0.5 + Math.sin(s.brillo) * 0.4;
    ctx.fillRect(s.x, s.y, s.tam, s.tam);
  });
  ctx.globalAlpha = 1;
}

// =====================================================================
//  PANTALLAS: MODO -> NOMBRES Y COLORES -> JUEGO -> FIN
// =====================================================================
function mostrarPantalla(id) {
  ["pantallaTitulo", "pantallaModo", "pantallaConfig", "pantallaFin", "pantallaMarcador",
   "pantallaSesion", "pantallaAyuda", "pantallaCreditos", "pantallaLogros", "pantallaEnLinea"].forEach(p => $(p).classList.add("oculta"));
  if (id) $(id).classList.remove("oculta");
  // En la pantalla de título no se repite el nombre de arriba
  document.body.classList.toggle("en-titulo", id === "pantallaTitulo");
}

// =====================================================================
//  🚀 NAVES DESBLOQUEABLES
//  Cada piloto desbloquea formas de nave según cuántas medallas tiene.
//  Las formas son solo de adorno: el tamaño para golpear es el mismo.
// =====================================================================
const NAVES = [
  { id: "clasica",  nombre: "Clásica",  medallas: 0 },
  { id: "alas",     nombre: "Alada",    medallas: 1 },
  { id: "cohete",   nombre: "Cohete",   medallas: 3 },
  { id: "platillo", nombre: "Platillo", medallas: 6 },
  { id: "estrella", nombre: "Estrella", medallas: 10 }
];
function medallasDe(nombre) { return nombre ? Object.keys(leerLogros(nombre)).length : 0; }
function naveDesbloqueada(forma, nombre) {
  const n = NAVES.find(x => x.id === forma);
  return !!n && medallasDe(nombre) >= n.medallas;
}

// Dibuja el adorno de la nave detrás de la paleta (lado = -1 izquierda, 1 derecha)
function dibujarFormaNave(forma, x, y, w, h, lado, color) {
  if (!forma || forma === "clasica") return;
  const atras = lado < 0 ? x : x + w;      // borde de atrás de la nave
  const cy = y + h / 2;
  ctx.save();
  ctx.fillStyle = color;
  ctx.shadowColor = color; ctx.shadowBlur = 10;
  if (forma === "alas") {
    ctx.globalAlpha = 0.8;
    // las alas no pasan de arriba ni de abajo de la nave (así se ve igual a donde choca)
    [[y + 4, y, y + 34], [y + h - 4, y + h, y + h - 34]].forEach(([a, punta, b]) => {
      ctx.beginPath();
      ctx.moveTo(atras, a); ctx.lineTo(atras + lado * 22, punta); ctx.lineTo(atras, b);
      ctx.closePath(); ctx.fill();
    });
  }
  if (forma === "cohete") {
    const largo = 16 + Math.random() * 12;               // la llama tiembla
    const g = ctx.createLinearGradient(atras, cy, atras + lado * largo, cy);
    g.addColorStop(0, "#ffd23f"); g.addColorStop(1, "rgba(255, 77, 46, 0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(atras, cy - 16); ctx.lineTo(atras + lado * largo, cy); ctx.lineTo(atras, cy + 16);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = color;
    // puntas del cohete hacia atrás (no sobresalen arriba ni abajo de donde choca la pelota)
    ctx.beginPath(); ctx.moveTo(atras, y + 2); ctx.lineTo(atras + lado * 10, y + 14); ctx.lineTo(atras, y + 26); ctx.fill();
    ctx.beginPath(); ctx.moveTo(atras, y + h - 2); ctx.lineTo(atras + lado * 10, y + h - 14); ctx.lineTo(atras, y + h - 26); ctx.fill();
  }
  if (forma === "platillo") {
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.ellipse(atras, cy, 15, 30, 0, lado < 0 ? Math.PI / 2 : -Math.PI / 2, lado < 0 ? Math.PI * 1.5 : Math.PI / 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#ffffff";
    [0.2, 0.5, 0.8].forEach((k, i) => {
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(cuadro * 0.2 + i * 2);
      ctx.beginPath(); ctx.arc(x + w / 2, y + h * k, 2.5, 0, Math.PI * 2); ctx.fill();
    });
  }
  if (forma === "estrella") {
    const sx = atras + lado * 16;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 6 : 14, a = -Math.PI / 2 + i * Math.PI / 5 + cuadro * 0.03;
      i === 0 ? ctx.moveTo(sx + Math.cos(a) * r, cy + Math.sin(a) * r) : ctx.lineTo(sx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.arc(sx, cy, 3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// El nombre con el que se va a guardar la partida: si el campo está vacío,
// el juego usa "Piloto" (o "Jugador 1" / "Jugador 2" en 2 jugadores).
// Las medallas se buscan con ESE nombre.
function nombreEfectivo(campo) {
  const escrito = campo.value.trim();
  if (escrito) return escrito;
  if (campo.id === "nombre2") return "Jugador 2";
  return modo === 2 ? "Jugador 1" : "Piloto";
}

// Botones para elegir la forma de la nave, con un dibujito de cada una
function crearSelectorFormas(caja, nota, jugador, campoNombre) {
  caja.innerHTML = "";
  NAVES.forEach(n => {
    const b = document.createElement("button");
    b.className = "forma";
    b.dataset.forma = n.id;
    b.title = n.nombre;
    b.setAttribute("aria-label", "Nave " + n.nombre);
    const mini = document.createElement("canvas");
    mini.width = 44; mini.height = 44;
    b.appendChild(mini);
    b.addEventListener("click", () => {
      const nombre = nombreEfectivo(campoNombre);
      if (!naveDesbloqueada(n.id, nombre)) {
        nota.textContent = "🔒 La nave " + n.nombre + " se desbloquea con " + n.medallas + (n.medallas === 1 ? " medalla" : " medallas");
        sonido(200, 0.1, "square", 0.08);
        return;
      }
      jugador.forma = n.id;
      nota.textContent = "Nave: " + n.nombre;
      pintarSelectorFormas(caja, jugador, campoNombre);
      sonido(700, 0.06, "triangle");
    });
    caja.appendChild(b);
  });
  campoNombre.addEventListener("input", () => pintarSelectorFormas(caja, jugador, campoNombre));
}
function pintarSelectorFormas(caja, jugador, campoNombre) {
  const nombre = nombreEfectivo(campoNombre);
  if (!naveDesbloqueada(jugador.forma, nombre)) jugador.forma = "clasica";
  caja.querySelectorAll(".forma").forEach(b => {
    const libre = naveDesbloqueada(b.dataset.forma, nombre);
    b.classList.toggle("bloqueada", !libre);
    b.classList.toggle("elegido", b.dataset.forma === jugador.forma);
    // Dibujito de la nave
    const mini = b.querySelector("canvas");
    const ctxReal = ctx;
    ctx = mini.getContext("2d");
    ctx.clearRect(0, 0, 44, 44);
    ctx.save();
    ctx.scale(0.4, 0.4);
    ctx.fillStyle = jugador.color;
    ctx.shadowColor = jugador.color; ctx.shadowBlur = 8;
    rectRedondo(66, 5, 14, 100, 7); ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.scale(0.4, 0.4);
    dibujarFormaNave(b.dataset.forma, 66, 5, 14, 100, -1, jugador.color);
    ctx.restore();
    ctx = ctxReal;
  });
}

// Crea una fila de botones de color dentro de "caja"
function crearSelectorColores(caja, lista, alElegir) {
  caja.innerHTML = "";
  lista.forEach((color, i) => {
    const b = document.createElement("button");
    b.className = "color";
    b.style.background = color;
    b.style.color = color;
    b.setAttribute("aria-label", "Color " + (i + 1));
    b.addEventListener("click", () => {
      caja.querySelectorAll(".color").forEach(c => c.classList.remove("elegido"));
      b.classList.add("elegido");
      alElegir(color);
      sonido(500 + i * 80, 0.06, "triangle");
    });
    caja.appendChild(b);
  });
}
function marcarColor(caja, color) {
  caja.querySelectorAll(".color").forEach(b =>
    b.classList.toggle("elegido", b.style.color === hexARgb(color)));
}
function hexARgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return "rgb(" + (n >> 16) + ", " + ((n >> 8) & 255) + ", " + (n & 255) + ")";
}

crearSelectorColores($("colores1"), COLORES_NAVE, c => { p1.color = c; pintarSelectorFormas($("formas1"), p1, $("nombre1")); });
crearSelectorColores($("colores2"), COLORES_NAVE, c => { p2.color = c; pintarSelectorFormas($("formas2"), p2, $("nombre2")); });
crearSelectorFormas($("formas1"), $("notaFormas1"), p1, $("nombre1"));
crearSelectorFormas($("formas2"), $("notaFormas2"), p2, $("nombre2"));

// 👤 Botones con los pilotos guardados (los 8 más recientes): un toque y se
// cargan su nombre, su color y su nave. Los usan "Prepara tu nave" y "En línea".
function pintarChipsPilotos(caja, campo, alElegir) {
  caja.innerHTML = "";
  const pilotos = leerPilotos().slice(0, 8);
  caja.classList.toggle("oculta", pilotos.length === 0);
  pilotos.forEach(p => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "piloto mini";
    if (mismoNombre(campo.value || "-", p.nombre)) b.classList.add("elegido");
    const punto = document.createElement("span");
    punto.className = "punto";
    punto.style.background = p.color;
    punto.style.color = p.color;
    b.appendChild(punto);
    b.appendChild(document.createTextNode(p.nombre));   // textContent: el nombre se muestra tal cual
    b.addEventListener("click", () => {
      campo.value = p.nombre;
      alElegir(p);
      pintarChipsPilotos(caja, campo, alElegir);
      sonido(660, 0.08, "triangle");
    });
    caja.appendChild(b);
  });
}
// Los botones de cada tarjeta (1 = jugador 1, 2 = jugador 2)
function chipsDeTarjeta(n) {
  const jugador = n === 1 ? p1 : p2;
  const campo = $("nombre" + n);
  pintarChipsPilotos($("chips" + n), campo, p => {
    jugador.color = p.color;
    jugador.forma = p.forma || "clasica";
    marcarColor($("colores" + n), jugador.color);
    $("notaFormas" + n).textContent = "";
    pintarSelectorFormas($("formas" + n), jugador, campo);
  });
}
$("nombre1").addEventListener("input", () => chipsDeTarjeta(1));
$("nombre2").addEventListener("input", () => chipsDeTarjeta(2));

function elegirModo(m) {
  modo = m;
  sonido(660, 0.1, "triangle");
  const dos = modo === 2;
  $("tituloConfig").textContent = dos ? "Preparen sus naves" : modo === 3 ? "🎯 Modo práctica" : "Prepara tu nave";
  $("cajaGoles").classList.toggle("oculta", modo === 3);
  $("cajaDificultad").classList.toggle("oculta", modo === 3);
  $("titulo1").textContent = dos ? "Jugador 1" : "Tu nave";
  $("teclas1").textContent = dos ? "(W / S)" : "(mouse o ↑ / ↓)";
  $("tarjeta2").classList.toggle("oculta", !dos);
  p1.color = "#ff3cac";
  p2.color = "#38e8ff";
  // 👤 Si hay sesión iniciada, el jugador 1 ya tiene su nombre y su color
  const sesion = sesionActual();
  if (sesion) { $("nombre1").value = sesion.nombre; p1.color = sesion.color; p1.forma = sesion.forma || "clasica"; }
  // 👤 Si el nombre escrito es de un piloto guardado, se usa su color
  [[1, p1], [2, p2]].forEach(([n, jugador]) => {
    const guardado = leerPilotos().find(p => mismoNombre(p.nombre, $("nombre" + n).value || "-"));
    if (guardado && !(n === 1 && sesion)) jugador.color = guardado.color;
  });
  if (p2.color === p1.color) p2.color = "#ffd23f";
  marcarColor($("colores1"), p1.color);
  marcarColor($("colores2"), p2.color);
  // 🚀 Formas de nave según las medallas de cada piloto
  const guardado2 = leerPilotos().find(p => mismoNombre(p.nombre, $("nombre2").value || "-"));
  p2.forma = (guardado2 && guardado2.forma) || "clasica";
  $("notaFormas1").textContent = ""; $("notaFormas2").textContent = "";
  pintarSelectorFormas($("formas1"), p1, $("nombre1"));
  pintarSelectorFormas($("formas2"), p2, $("nombre2"));
  chipsDeTarjeta(1);   // 👤 pilotos guardados
  chipsDeTarjeta(2);
  mostrarPantalla("pantallaConfig");
  $("nombre1").focus();
}
// Pantalla de título -> elegir modo
$("botonTitulo").addEventListener("click", () => { sonido(660, 0.12, "triangle"); iniciarMusica(); mostrarPantalla("pantallaModo"); });
$("botonAtrasModo").addEventListener("click", () => mostrarPantalla("pantallaTitulo"));
$("modo1").addEventListener("click", () => elegirModo(1));
$("modo2").addEventListener("click", () => elegirModo(2));
$("modo3").addEventListener("click", () => elegirModo(3));
$("botonAtras").addEventListener("click", () => mostrarPantalla("pantallaModo"));

// 🎯 A cuántos goles se juega
document.querySelectorAll(".meta").forEach(b => {
  b.addEventListener("click", () => {
    document.querySelectorAll(".meta").forEach(x => x.classList.remove("elegido"));
    b.classList.add("elegido");
    contrarreloj = b.dataset.goles === "tiempo";
    GOLES_PARA_TERMINAR = contrarreloj ? Infinity : Number(b.dataset.goles);
    sonido(600, 0.06, "triangle");
  });
});

document.querySelectorAll(".dificultad:not(.meta)").forEach(b => {
  b.addEventListener("click", () => {
    document.querySelectorAll(".dificultad:not(.meta)").forEach(x => x.classList.remove("elegido"));
    b.classList.add("elegido");
    dificultad = DIFICULTADES[b.dataset.nivel];
    nivelElegido = b.dataset.nivel;
    sonido(600, 0.06, "triangle");
  });
});

$("botonPlay").addEventListener("click", () => {
  p2.esPared = false;
  if (modo === 3) {                         // 🎯 práctica contra la pared
    p1.nombre = $("nombre1").value.trim() || "Piloto";
    p2.nombre = "Pared";
    p2.color = "#38e8ff";
    p2.esRobot = true;
    p2.esPared = true;
  } else if (modo === 1) {
    p1.nombre = $("nombre1").value.trim() || "Piloto";
    p2.nombre = "Robot alienígena";
    p2.color = COLOR_ROBOT;
    p2.esRobot = true;
  } else {
    p1.nombre = $("nombre1").value.trim() || "Jugador 1";
    p2.nombre = $("nombre2").value.trim() || "Jugador 2";
    p2.esRobot = false;
    // 👤 Cada piloto guarda su propio puntaje: no pueden llamarse igual
    if (mismoNombre(p1.nombre, p2.nombre)) {
      $("notaFormas2").textContent = "⚠ Los dos pilotos no pueden tener el mismo nombre";
      sonido(200, 0.1, "square", 0.08);
      $("nombre2").focus();
      return;
    }
  }
  nuevaPartida();
});
["nombre1", "nombre2"].forEach(id =>
  $(id).addEventListener("keydown", e => { if (e.key === "Enter") $("botonPlay").click(); }));
$("botonOtraVez").addEventListener("click", nuevaPartida);
$("botonInicio").addEventListener("click", () => { estado = "menu"; limpiarTodo(); mostrarPantalla("pantallaTitulo"); });

function nuevaPartida() {
  // 🌐 El invitado no arranca partidas: le pide al anfitrión que empiece otra
  if (enLinea.activo && enLinea.rol === "invitado") { enLinea.pedirOtraPartida(); return; }
  celebrar = false;
  iniciarMusica();
  limpiarTodo();
  jugadores.forEach(p => {
    p.puntos = 0; p.golpes = 0;
    p.stats = { poderes: 0, peorDiferencia: 0, golCirculo: false, golGiro: false, supersonico: false };
    p.lado = p === p1 ? -1 : 1;
    p.x = xDelLado(p.lado);
  });
  mejorRacha = 0;
  tiempoRestante = DURACION_CONTRARRELOJ;   // ⏱
  golDeOro = false;
  // 🎯 En práctica, la pared ocupa todo el lado derecho
  jugadores.forEach(p => { if (p.esPared) { p.h = ALTO; p.y = 0; p.objetivoY = 0; } });
  mostrarPantalla(null);
  estado = "jugando";
  prepararSaque(p1);
  mostrarConsejo("mover", textoMover());
  if (enLinea.activo) enLinea.alEmpezar();   // 🌐 avisa al invitado que empezó la partida
}

function limpiarTodo() {
  bolsaPoderes = [];        // 🎲 bolsa de poderes nueva en cada partida
  agujeros.length = 0;
  poderes.length = 0;
  esperaPoder = APARECE_INICIO;
  yaSeLleno = false;
  aviso = null;
  cambio = 0;
  quitarEfectos();
  terminarCirculo(false);
}

function terminarPartida(ganador) {
  estado = "fin";
  const perdedor = rivalDe(ganador);
  const marcador = ganador.puntos + " a " + perdedor.puntos;
  let titulo, texto, gano = true;
  if (modo === 1 && ganador === p2) {
    gano = false;
    titulo = "¡Ganó el robot alienígena!";
    texto = p1.nombre + ", perdiste " + p1.puntos + " a " + p2.puntos + ". Hiciste " + p1.golpes +
            " golpes y el peloteo más largo fue de " + mejorRacha + ".";
  } else if (modo === 1) {
    titulo = "¡Ganaste, " + p1.nombre + "!";
    texto = "Derrotaste al robot alienígena " + marcador + ". Hiciste " + p1.golpes +
            " golpes y el peloteo más largo fue de " + mejorRacha + ".";
  } else {
    titulo = "¡Ganó " + ganador.nombre + "!";
    texto = ganador.nombre + " venció a " + perdedor.nombre + " " + marcador +
            ". El peloteo más largo fue de " + mejorRacha + (mejorRacha === 1 ? " golpe." : " golpes.");
    // 🌐 En línea cada uno ve la partida desde su lado
    if (enLinea.activo) {
      gano = ganador === enLinea.yo;
      if (gano) titulo = "¡Ganaste, " + ganador.nombre + "!";
    }
  }
  $("tituloFin").textContent = titulo;
  $("textoFin").textContent = texto;
  $("puntajeFin").textContent = "";
  $("logrosFin").textContent = "";
  mostrarPantalla("pantallaFin");
  guardarPuntajesDeLaPartida(ganador);
  celebrar = gano;          // 🎆 fuegos artificiales si alguien (humano) ganó
  if (gano) [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => sonido(f, 0.18, "triangle", 0.18), i * 130));
  else sonido(220, 0.5, "sawtooth", 0.15);
}

// =====================================================================
//  👤 PILOTOS (INICIO DE SESIÓN) Y 🏆 MARCADOR
//  - Iniciar sesión = elegir tu piloto. Se guarda tu nombre y tu color
//    para no escribirlos cada vez. (No lleva contraseña: para eso se
//    necesitaría un servidor.)
//  - Cada partida se guarda como un registro. El marcador junta los
//    registros de cada piloto: mejor puntaje, partidas jugadas y ganadas.
//  - Puntaje de una partida:
//      goles: 500 puntos repartidos entre los goles de la partida
//             (a 5 goles = 100 por gol; a 3 = 167; a 7 = 71) para que
//             sea justo jugar a 3, 5 o 7
//      + 2 por golpe + bono por ganar
//      (Fácil +300, Normal +600, Difícil +1000, 2 jugadores +500)
//  - En la página publicada en Claude el marcador es compartido entre
//    todos; en tu computador o celular se guarda en ese aparato.
//  - 🔑 Solo el ADMINISTRADOR puede borrar el marcador:
//      en Claude, el dueño de la página (los demás no ven el botón);
//      en tu computador o celular, quien sepa la CLAVE_ADMIN.
// =====================================================================
const BONO_VICTORIA = { facil: 300, normal: 600, dificil: 1000, dos: 500, linea: 500 };   // 🌐 linea = en línea
const NOMBRES_CATEGORIA = { todos: "Todos", facil: "Fácil", normal: "Normal", dificil: "Difícil", dos: "2 jugadores", linea: "En línea" };
const CLAVE_PARTIDAS = "galaxyPongPartidas";
const CLAVE_PILOTOS  = "galaxyPongPilotos";
const CLAVE_SESION   = "galaxyPongSesion";
let nivelElegido = "normal";
let dbCompartida = null;              // base de datos compartida (solo en Claude)
let miId = null;                      // id de quien juega en Claude (para guardar sus partidas)
let esAdmin = false;                  // en Claude: true solo para el dueño de la página
let pantallaAntesDelMarcador = "pantallaTitulo";
let categoriaMarcador = "todos";

// 🔑 Clave para borrar el marcador cuando se juega en tu computador o celular.
//    En la página publicada en Claude no se usa: allí solo el dueño puede borrar.
//    Cámbiala por una tuya. Ojo: quien abra este archivo puede leerla.
const CLAVE_ADMIN = "cosmoball2026";

// Si la página está publicada en Claude, se conecta a la base compartida
// y averigua si quien juega es el dueño (el administrador).
const conexionLista = (async () => {
  try {
    if (window.claude && window.claude.use) {
      dbCompartida = await window.claude.use("db");
      const usuario = await window.claude.use("user");
      if (usuario) {
        esAdmin = await usuario.isOwner();
        miId = await usuario.id();
      }
    }
  } catch (e) { dbCompartida = null; }
})();

// ---------- Guardar y leer en el aparato ----------
function leerLS(clave, porDefecto) {
  try { const v = localStorage.getItem(clave); return v ? JSON.parse(v) : porDefecto; } catch (e) { return porDefecto; }
}
function guardarLS(clave, valor) {
  try { localStorage.setItem(clave, JSON.stringify(valor)); } catch (e) { /* sin espacio */ }
}
const mismoNombre = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();

// ---------- 👤 Pilotos y sesión ----------
function leerPilotos() { return leerLS(CLAVE_PILOTOS, []); }
function sesionActual() { return leerLS(CLAVE_SESION, null); }   // { nombre, color } o null

function guardarPiloto(nombre, color, forma) {
  const viejo = leerPilotos().find(p => mismoNombre(p.nombre, nombre));
  const lista = leerPilotos().filter(p => !mismoNombre(p.nombre, nombre));
  lista.unshift({ nombre, color, forma: forma || (viejo && viejo.forma) || "clasica" });   // el más reciente primero
  guardarLS(CLAVE_PILOTOS, lista.slice(0, 20));
}
function iniciarSesion(nombre, color) {
  nombre = nombre.trim().slice(0, 12);
  if (!nombre) return;
  const guardado = leerPilotos().find(p => mismoNombre(p.nombre, nombre));
  const piloto = { nombre: guardado ? guardado.nombre : nombre, color: color || (guardado && guardado.color) || "#ff3cac",
                   forma: (guardado && guardado.forma) || "clasica" };
  guardarPiloto(piloto.nombre, piloto.color, piloto.forma);
  guardarLS(CLAVE_SESION, piloto);
  sonido(660, 0.1, "triangle");
  mostrarEstadoSesion();
  mostrarPantalla("pantallaTitulo");
}
function cerrarSesion() {
  try { localStorage.removeItem(CLAVE_SESION); } catch (e) {}
  mostrarEstadoSesion();
  mostrarPantallaSesion();
}
function mostrarEstadoSesion() {
  const s = sesionActual();
  $("estadoSesion").textContent = s ? "👤 Piloto: " + s.nombre : "";
  $("botonSesion").textContent = "👤 Pilotos";
}
function mostrarPantallaSesion() {
  mostrarPantalla("pantallaSesion");
  const s = sesionActual();
  $("sesionActiva").classList.toggle("oculta", !s);
  if (s) $("textoSesion").textContent = "Jugando como " + s.nombre;
  const caja = $("listaPilotos");
  caja.innerHTML = "";
  const pilotos = leerPilotos();
  $("tituloPilotos").classList.toggle("oculta", pilotos.length === 0);
  pilotos.forEach(p => {
    const b = document.createElement("button");
    b.className = "piloto";
    const punto = document.createElement("span");
    punto.className = "punto";
    punto.style.background = p.color;
    b.appendChild(punto);
    b.appendChild(document.createTextNode(p.nombre));
    b.addEventListener("click", () => iniciarSesion(p.nombre, p.color));
    caja.appendChild(b);
  });
  $("nombreSesion").value = "";
}
$("botonSesion").addEventListener("click", mostrarPantallaSesion);
$("botonEntrar").addEventListener("click", () => iniciarSesion($("nombreSesion").value));
$("nombreSesion").addEventListener("keydown", e => { if (e.key === "Enter") $("botonEntrar").click(); });
$("botonCerrarSesion").addEventListener("click", cerrarSesion);
$("botonVolverSesion").addEventListener("click", () => mostrarPantalla("pantallaTitulo"));
mostrarEstadoSesion();

// ---------- 🏆 Registros de partidas ----------
function calcularPuntaje(p, gano) {
  let bono = 0;
  if (gano) bono = enLinea.activo ? BONO_VICTORIA.linea : modo === 2 ? BONO_VICTORIA.dos : BONO_VICTORIA[nivelElegido];   // 🌐
  const puntosGoles = contrarreloj ? p.puntos * 100 : Math.round(p.puntos * 500 / GOLES_PARA_TERMINAR);
  return puntosGoles + p.golpes * 2 + bono;
}

// En Claude cada jugador tiene UN documento "marcador/<su id>" con su lista
// de partidas. Cada uno solo puede escribir el suyo; el dueño puede borrarlos todos.
async function leerRegistros() {
  await conexionLista;
  const locales = leerLS(CLAVE_PARTIDAS, []);
  if (dbCompartida) {
    try {
      const snap = await dbCompartida.collection("marcador").get();
      const lista = [];
      snap.docs.forEach(d => ((d.data() || {}).partidas || []).forEach(r => lista.push(r)));
      // + las partidas de este aparato que no se pudieron subir
      locales.filter(r => r.subido !== true).forEach(r => lista.push(r));
      return { lista, compartido: true };
    } catch (e) { /* si falla, se usa el del aparato */ }
  }
  return { lista: locales, compartido: false };
}

async function guardarRegistro(r) {
  await conexionLista;
  let subido = false;
  if (dbCompartida && miId) {
    try {
      const ref = dbCompartida.doc("marcador/" + miId);
      const snap = await ref.get();
      const mias = (snap.exists && snap.data().partidas) || [];
      await ref.set({ partidas: [r, ...mias].slice(0, 300) });
      subido = true;
    } catch (e) { /* sin permiso para escribir: queda guardada en el aparato */ }
  }
  const lista = leerLS(CLAVE_PARTIDAS, []);
  lista.unshift(Object.assign({}, r, { subido }));
  guardarLS(CLAVE_PARTIDAS, lista.slice(0, 500));
}

// Junta los registros por piloto: mejor puntaje, partidas y ganadas
function armarTabla(registros, categoria) {
  const porPiloto = {};
  registros.forEach(r => {
    if (categoria !== "todos" && r.cat !== categoria) return;
    const clave = String(r.nombre).trim().toLowerCase();
    const f = porPiloto[clave] || (porPiloto[clave] = { nombre: r.nombre, mejor: 0, partidas: 0, ganadas: 0, goles: 0 });
    f.partidas++;
    if (r.gano) f.ganadas++;
    f.goles += r.goles || 0;
    f.mejor = Math.max(f.mejor, r.puntaje || 0);
  });
  return Object.values(porPiloto).sort((a, b) => b.mejor - a.mejor || b.ganadas - a.ganadas).slice(0, 10);
}

// =====================================================================
//  🏅 LOGROS Y MEDALLAS
//  Cada piloto (por su nombre) va ganando medallas. Se guardan en el
//  aparato. Para agregar uno nuevo: súmalo a la lista LOGROS y escribe
//  su condición en revisarLogros().
// =====================================================================
const CLAVE_LOGROS = "galaxyPongLogros";
const LOGROS = [
  { id: "primera",     icono: "🥉", nombre: "Primera victoria",   texto: "Gana tu primera partida." },
  { id: "facil",       icono: "🤖", nombre: "Cazador de robots",   texto: "Gánale al robot en Fácil." },
  { id: "normal",      icono: "🦾", nombre: "Domador de robots",   texto: "Gánale al robot en Normal." },
  { id: "dificil",     icono: "👑", nombre: "Leyenda galáctica",   texto: "Gánale al robot en Difícil." },
  { id: "duelo",       icono: "⚔️", nombre: "Duelo de pilotos",    texto: "Gana una partida de 2 jugadores." },
  { id: "invicto",     icono: "🧱", nombre: "Muro galáctico",      texto: "Gana sin recibir ni un gol." },
  { id: "remontada",   icono: "🔥", nombre: "Remontada",           texto: "Gana después de ir perdiendo por 2 goles o más." },
  { id: "peloteo10",   icono: "🏓", nombre: "Buen peloteo",        texto: "Logra un peloteo de 10 golpes." },
  { id: "peloteo25",   icono: "♾️", nombre: "Maratón espacial",    texto: "Logra un peloteo de 25 golpes." },
  { id: "supersonico", icono: "⚡", nombre: "Supersónico",         texto: "Golpea el cometa a máxima velocidad." },
  { id: "coleccion",   icono: "🎁", nombre: "Coleccionista",       texto: "Usa 8 poderes en una sola partida." },
  { id: "orbita",      icono: "⭕", nombre: "Gol en órbita",       texto: "Mete un gol en la cancha circular." },
  { id: "giratorio",   icono: "🌀", nombre: "Gol en el remolino",  texto: "Mete un gol durante el remolino." },
  { id: "siete",       icono: "7️⃣", nombre: "Partido largo",       texto: "Gana una partida a 7 goles." },
  { id: "veterano",    icono: "🎖️", nombre: "Veterano",            texto: "Juega 10 partidas." }
];

function leerLogros(nombre) {
  const todos = leerLS(CLAVE_LOGROS, {});
  return todos[String(nombre).trim().toLowerCase()] || {};
}
function guardarLogros(nombre, logros) {
  const todos = leerLS(CLAVE_LOGROS, {});
  todos[String(nombre).trim().toLowerCase()] = logros;
  guardarLS(CLAVE_LOGROS, todos);
}

// ⚡ Se revisa en cada golpe: ¿le pegó a máxima velocidad?
// =====================================================================
//  💡 CONSEJOS: salen una sola vez (la primera vez que pasa algo)
// =====================================================================
const CLAVE_CONSEJOS = "galaxyPongConsejos";
let consejo = null;               // el que se está mostrando
const consejosEnFila = [];        // los que esperan su turno
function mostrarConsejo(id, texto) {
  const vistos = leerLS(CLAVE_CONSEJOS, {});
  if (vistos[id]) return;
  vistos[id] = 1;
  guardarLS(CLAVE_CONSEJOS, vistos);
  consejosEnFila.push(texto);
}
function textoMover() {
  // 🌐 En línea cada uno mueve su nave con lo que quiera
  if (enLinea.activo) return esCelular ? "Usa los botones ▲ ▼ o arrastra el dedo para mover tu nave"
                                      : "Mueve tu nave con el mouse, W / S o las flechas ↑ ↓";
  if (esCelular) return modo === 2 ? "Cada uno usa sus botones ▲ ▼ (o el dedo en su mitad)" : "Usa los botones ▲ ▼ o arrastra el dedo para mover tu nave";
  return modo === 2 ? "Jugador 1: W / S  ·  Jugador 2: flechas ↑ ↓" : "Mueve tu nave con el mouse o las flechas ↑ ↓";
}
function actualizarConsejos() {
  if (consejo && --consejo.vida <= 0) consejo = null;
  if (!consejo && consejosEnFila.length) consejo = { texto: consejosEnFila.shift(), vida: 270 };
}
function dibujarConsejo() {
  if (!consejo || (estado !== "jugando" && estado !== "gol")) return;
  ctx.save();
  ctx.font = "600 18px Rubik, sans-serif";
  const texto = "💡 " + consejo.texto;
  const w = ctx.measureText(texto).width + 40, h = 44;
  const x = ANCHO / 2 - w / 2, y = ALTO - 120;
  ctx.globalAlpha = Math.min(1, consejo.vida / 25, (270 - consejo.vida) / 15 + 0.2);
  ctx.fillStyle = "rgba(255, 154, 60, .95)";
  rectRedondo(x, y, w, h, 22); ctx.fill();
  ctx.fillStyle = "#1a0b33";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(texto, ANCHO / 2, y + h / 2 + 1);
  ctx.restore();
}
$("botonRepetirConsejos").addEventListener("click", () => {
  guardarLS(CLAVE_CONSEJOS, {});
  $("botonRepetirConsejos").textContent = "✓ Los consejos saldrán otra vez";
  sonido(660, 0.08, "triangle");
});

function registrarGolpe(p) {
  if (!p.esRobot && p.golpes === 3) mostrarConsejo("punta", "Pégale con la punta de tu nave para darle más ángulo");
  if (p.stats && pelota.vel >= velMaxActual() * 0.97) p.stats.supersonico = true;
}

// Al final de la partida: ¿qué medallas nuevas ganó este piloto?
function revisarLogros(p, gano, partidasJugadas) {
  const ya = leerLogros(p.nombre);
  const cumple = {
    primera:     gano,
    facil:       gano && modo === 1 && nivelElegido === "facil",
    normal:      gano && modo === 1 && nivelElegido === "normal",
    dificil:     gano && modo === 1 && nivelElegido === "dificil",
    duelo:       gano && modo === 2,
    invicto:     gano && rivalDe(p).puntos === 0,
    remontada:   gano && p.stats.peorDiferencia >= 2,
    peloteo10:   mejorRacha >= 10,
    peloteo25:   mejorRacha >= 25,
    supersonico: p.stats.supersonico,
    coleccion:   p.stats.poderes >= 8,
    orbita:      p.stats.golCirculo,
    giratorio:   p.stats.golGiro,
    siete:       gano && GOLES_PARA_TERMINAR === 7,
    veterano:    partidasJugadas >= 10
  };
  const nuevos = LOGROS.filter(l => cumple[l.id] && !ya[l.id]);
  nuevos.forEach(l => (ya[l.id] = Date.now()));
  if (nuevos.length) guardarLogros(p.nombre, ya);
  return nuevos;
}

// Pantalla de medallas: se elige el piloto y se ven las que tiene
function mostrarLogros() {
  mostrarPantalla("pantallaLogros");
  const selector = $("pilotoLogros");
  const pilotos = leerPilotos();
  const sesion = sesionActual();
  selector.innerHTML = "";
  pilotos.forEach(p => {
    const op = document.createElement("option");
    op.value = p.nombre;
    op.textContent = p.nombre;
    selector.appendChild(op);
  });
  if (sesion) selector.value = sesion.nombre;
  $("sinPilotos").classList.toggle("oculta", pilotos.length > 0);
  selector.classList.toggle("oculta", pilotos.length === 0);
  pintarLogros();
}
function pintarLogros() {
  const nombre = $("pilotoLogros").value;
  const tiene = nombre ? leerLogros(nombre) : {};
  const caja = $("listaLogros");
  caja.innerHTML = "";
  LOGROS.forEach(l => {
    const div = document.createElement("div");
    div.className = "logro" + (tiene[l.id] ? " ganado" : "");
    const icono = document.createElement("span");
    icono.className = "icono-logro";
    icono.textContent = tiene[l.id] ? l.icono : "🔒";
    const info = document.createElement("div");
    const b = document.createElement("b");
    b.textContent = l.nombre;
    const t = document.createElement("span");
    t.textContent = l.texto;
    info.appendChild(b); info.appendChild(t);
    div.appendChild(icono); div.appendChild(info);
    caja.appendChild(div);
  });
  const cuantos = LOGROS.filter(l => tiene[l.id]).length;
  $("cuentaLogros").textContent = cuantos + " de " + LOGROS.length + " medallas";
  $("navesLogros").textContent = "🚀 Naves: " + NAVES.map(n =>
    n.nombre + (cuantos >= n.medallas ? " ✓" : " 🔒" + n.medallas)).join(" · ");
}
$("pilotoLogros").addEventListener("change", pintarLogros);
$("botonLogros").addEventListener("click", mostrarLogros);
$("botonVolverLogros").addEventListener("click", () => mostrarPantalla("pantallaTitulo"));

async function guardarPuntajesDeLaPartida(ganador) {
  const cat = enLinea.activo ? "linea" : modo === 2 ? "dos" : nivelElegido;   // 🌐
  const antes = (await leerRegistros()).lista;
  // 🌐 En línea cada aparato guarda SOLO a su piloto (el rival lo guarda en el suyo)
  const humanos = jugadores.filter(p => !p.esRobot && (!enLinea.activo || p === enLinea.yo));
  const textos = [], medallas = [], navesNuevas = [];
  const conNombre = modo === 2 && !enLinea.activo;   // 🌐 en línea solo se muestra lo mío
  for (const p of humanos) {
    const gano = p === ganador;
    const r = { nombre: p.nombre, cat, puntaje: calcularPuntaje(p, gano), gano, goles: p.puntos,
                rival: rivalDe(p).puntos, fecha: Date.now() };
    const mejorAntes = Math.max(0, ...antes.filter(x => x.cat === cat).map(x => x.puntaje || 0));
    const mejorMio = Math.max(0, ...antes.filter(x => x.cat === cat && mismoNombre(String(x.nombre), p.nombre)).map(x => x.puntaje || 0));
    await guardarRegistro(r);
    guardarPiloto(p.nombre, p.color, p.forma);
    // Si es el piloto con sesión iniciada, se recuerda su último color
    const ses = sesionActual();
    if (ses && mismoNombre(ses.nombre, p.nombre)) guardarLS(CLAVE_SESION, { nombre: ses.nombre, color: p.color, forma: p.forma });
    let t = (conNombre ? p.nombre + ": " : "Tu puntaje: ") + r.puntaje + " pts";
    if (r.puntaje > mejorAntes) t += " 🏆 ¡RÉCORD DEL MARCADOR!";
    else if (r.puntaje > mejorMio && mejorMio > 0) t += " ⭐ ¡Récord personal!";
    textos.push(t);
    // 🏅 Medallas nuevas
    const partidas = antes.filter(x => mismoNombre(String(x.nombre), p.nombre)).length + 1;
    const medallasAntes = medallasDe(p.nombre);
    revisarLogros(p, gano, partidas).forEach(l => medallas.push((conNombre ? p.nombre + ": " : "") + l.icono + " " + l.nombre));
    // 🚀 ¿Desbloqueó una nave nueva?
    const medallasAhora = medallasDe(p.nombre);
    NAVES.filter(n => n.medallas > medallasAntes && n.medallas <= medallasAhora)
         .forEach(n => navesNuevas.push((conNombre ? p.nombre + ": " : "") + n.nombre));
  }
  if (estado === "fin") {
    $("puntajeFin").textContent = textos.join("   |   ");
    $("logrosFin").textContent = (medallas.length ? "🏅 ¡Medalla nueva! " + medallas.join(" · ") : "") +
      (navesNuevas.length ? "   🚀 ¡Nave nueva desbloqueada! " + navesNuevas.join(" · ") : "");
    if (medallas.length) [784, 988, 1175].forEach((f, i) => setTimeout(() => sonido(f, 0.15, "sine", 0.15), 600 + i * 110));
  }
}

async function mostrarMarcador(desde) {
  if (desde) pantallaAntesDelMarcador = desde;
  mostrarPantalla("pantallaMarcador");
  document.querySelectorAll(".pestana").forEach(b => b.classList.toggle("elegido", b.dataset.cat === categoriaMarcador));
  const tabla = $("tablaMarcador");
  tabla.innerHTML = "";
  $("notaMarcador").textContent = "Cargando...";
  $("cajaAdmin").classList.add("oculta");
  const { lista, compartido } = await leerRegistros();
  // 🔑 En Claude el botón de borrar solo lo ve el administrador (el dueño)
  $("botonBorrar").classList.toggle("oculta", !!dbCompartida && !esAdmin);
  const filas = armarTabla(lista, categoriaMarcador);
  tabla.innerHTML = "";
  if (filas.length === 0) {
    $("notaMarcador").textContent = "Todavía no hay partidas en " + NOMBRES_CATEGORIA[categoriaMarcador] + ". ¡Juega y sé el primero!";
    return;
  }
  const sesion = sesionActual();
  filas.forEach((f, i) => {
    const fila = document.createElement("li");
    if (sesion && mismoNombre(String(f.nombre), sesion.nombre)) fila.classList.add("yo");
    const medalla = ["🥇", "🥈", "🥉"][i] || (i + 1) + ".";
    const medallasPiloto = Object.keys(leerLogros(f.nombre)).length;
    const detalle = (medallasPiloto ? "🏅 " + medallasPiloto + " · " : "") +
                    f.partidas + (f.partidas === 1 ? " partida" : " partidas") + " · " +
                    f.ganadas + (f.ganadas === 1 ? " ganada" : " ganadas") + " · " + f.goles + " goles";
    [["puesto", medalla], ["nombreM", f.nombre], ["detalleM", detalle], ["puntosM", f.mejor + " pts"]]
      .forEach(([clase, texto]) => {
        const span = document.createElement("span");
        span.className = clase;
        span.textContent = texto;     // textContent: los nombres se muestran tal cual
        fila.appendChild(span);
      });
    tabla.appendChild(fila);
  });
  $("notaMarcador").textContent = (compartido ? "Marcador compartido entre todos los que juegan." :
    "Puntajes guardados en este aparato.") + " Se muestra el mejor puntaje de cada piloto." +
    " Solo el administrador puede borrarlo.";
}

// 🗑 Borrar marcador: SOLO EL ADMINISTRADOR
//  - En Claude: solo el dueño de la página ve el botón (tocar dos veces).
//  - En tu computador o celular: hay que escribir la CLAVE_ADMIN.
let confirmarBorrado = false;
async function borrarMarcador() {
  guardarLS(CLAVE_PARTIDAS, []);
  if (dbCompartida && esAdmin) {
    try {
      const snap = await dbCompartida.collection("marcador").get();
      for (const d of snap.docs) await dbCompartida.doc("marcador/" + d.id).delete();
    } catch (e) { /* si falla, se intenta otra vez después */ }
  }
  sonido(300, 0.3, "sawtooth", 0.1, 80);
  mostrarMarcador();
}
$("botonBorrar").addEventListener("click", () => {
  const b = $("botonBorrar");
  if (!dbCompartida) {                 // en el aparato: pedir la clave
    $("cajaAdmin").classList.remove("oculta");
    $("claveAdmin").value = "";
    $("avisoAdmin").textContent = "";
    $("claveAdmin").focus();
    return;
  }
  if (!esAdmin) return;                // en Claude: solo el dueño
  if (!confirmarBorrado) {
    confirmarBorrado = true;
    b.textContent = "⚠ ¿Seguro? Toca otra vez";
    setTimeout(() => { confirmarBorrado = false; b.textContent = "🗑 Borrar marcador"; }, 3000);
    return;
  }
  confirmarBorrado = false;
  b.textContent = "🗑 Borrar marcador";
  borrarMarcador();
});
$("botonConfirmarBorrar").addEventListener("click", () => {
  if ($("claveAdmin").value !== CLAVE_ADMIN) {
    $("avisoAdmin").textContent = "Clave incorrecta";
    sonido(180, 0.25, "square", 0.1);
    return;
  }
  $("cajaAdmin").classList.add("oculta");
  borrarMarcador();
});
$("claveAdmin").addEventListener("keydown", e => { if (e.key === "Enter") $("botonConfirmarBorrar").click(); });

document.querySelectorAll(".pestana").forEach(b =>
  b.addEventListener("click", () => { categoriaMarcador = b.dataset.cat; mostrarMarcador(); }));
$("botonMarcador").addEventListener("click", () => mostrarMarcador("pantallaTitulo"));
$("botonMarcadorFin").addEventListener("click", () => mostrarMarcador("pantallaFin"));
$("botonVolverMarcador").addEventListener("click", () => mostrarPantalla(pantallaAntesDelMarcador));

// =====================================================================
//  ❓ CÓMO JUGAR (con los íconos de verdad de cada poder)
// =====================================================================
const AYUDA_PODERES = [
  ["hielo", "Hielo", "Congela la nave del rival un momento."],
  ["escudo", "Escudo", "Barrera de rocas detrás de tu nave que te salva de un gol."],
  ["encoger", "Encogedor", "La nave del rival queda a la mitad por 6 segundos."],
  ["lluvia", "Lluvia de asteroides", "Caen asteroides que desvían la pelota (afecta a los dos)."],
  ["cambio", "Cambio de lado", "Los jugadores cambian de lado. La pelota espera 2 segundos."],
  ["agujero", "Agujero negro", "Atrapa la pelota ahí mismo y la lanza a un lado al azar."],
  ["circulo", "Cancha circular", "La cancha se vuelve un agujero negro redondo y las naves se mueven por el borde."],
  ["giro", "Remolino", "Solo en la cancha circular: por 10 segundos la pelota se curva en espiral."],
  ["normal", "Cancha normal", "Solo en la cancha circular, después del primer remolino: vuelve a la cancha normal."]
];
function armarAyuda() {
  const caja = $("listaAyuda");
  if (caja.childElementCount) return;          // ya está armada
  AYUDA_PODERES.forEach(([tipo, nombre, texto]) => {
    const fila = document.createElement("div");
    fila.className = "fila-ayuda";
    const mini = document.createElement("canvas");
    mini.width = 56; mini.height = 56;
    // Dibuja el mismo ícono de la cancha, pero en el canvas pequeño
    const ctxReal = ctx;
    ctx = mini.getContext("2d");
    dibujarPoder({ tipo, x: 28, y: 28, r: 17, edad: 60, angulo: 0.6 });
    ctx = ctxReal;
    const info = document.createElement("div");
    const b = document.createElement("b");
    b.textContent = nombre;
    const t = document.createElement("span");
    t.textContent = texto;
    info.appendChild(b); info.appendChild(t);
    fila.appendChild(mini); fila.appendChild(info);
    caja.appendChild(fila);
  });
}
$("botonCreditos").addEventListener("click", () => mostrarPantalla("pantallaCreditos"));
$("botonVolverCreditos").addEventListener("click", () => mostrarPantalla("pantallaTitulo"));
$("botonAyuda").addEventListener("click", () => { armarAyuda(); mostrarPantalla("pantallaAyuda"); });
$("botonVolverAyuda").addEventListener("click", () => mostrarPantalla("pantallaTitulo"));

// =====================================================================
//  SONIDOS (Web Audio, sin archivos)
// =====================================================================
let audio = null;
let silencio = false;
try { silencio = localStorage.getItem("galaxyPongSilencio") === "1"; } catch (e) {}
function sonido(frecuencia, duracion = 0.08, tipo = "square", volumen = 0.15, frecuenciaFinal) {
  // 🌐 El anfitrión anota cada sonido para que también suene en el aparato del invitado
  if (enLinea.activo && enLinea.rol === "anfitrion") enLinea.sonidos.push([frecuencia, duracion, tipo, volumen, frecuenciaFinal]);
  if (silencio) return;     // 🔇 sonido apagado
  try {
    if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === "suspended") audio.resume();   // necesario en iPhone
    const osc = audio.createOscillator();
    const gan = audio.createGain();
    osc.type = tipo;
    osc.frequency.setValueAtTime(frecuencia, audio.currentTime);
    if (frecuenciaFinal) osc.frequency.exponentialRampToValueAtTime(frecuenciaFinal, audio.currentTime + duracion);
    gan.gain.setValueAtTime(volumen, audio.currentTime);
    gan.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duracion);
    osc.connect(gan).connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + duracion);
  } catch (e) { /* si no hay audio, el juego sigue igual */ }
}

// =====================================================================
//  CONTROLES
// =====================================================================
function posicionEnCanvas(clientX, clientY) {
  const r = canvas.getBoundingClientRect();
  return { x: (clientX - r.left) * (ANCHO / r.width), y: (clientY - r.top) * (ALTO / r.height) };
}

// Mouse: solo en modo 1 jugador
canvas.addEventListener("mousemove", e => {
  if (modo === 2 && !enLinea.activo) return;
  const yo = enLinea.activo ? enLinea.yo : p1;     // 🌐 en línea, el mouse mueve MI nave
  yo.conDedo = false;
  yo.objetivoY = posicionEnCanvas(e.clientX, e.clientY).y - yo.h / 2;
});

// Dedo: en 1 jugador sirve tocar en cualquier parte.
// En 2 jugadores, la mitad izquierda SIEMPRE es del jugador 1 y la derecha
// del jugador 2, aunque cambien de lado. Así nadie tiene que mover las manos.
function manejarToques(e) {
  for (const t of e.touches) {
    const pos = posicionEnCanvas(t.clientX, t.clientY);
    let p = p1;
    if (enLinea.activo) p = enLinea.yo;            // 🌐 en línea, toda la pantalla es para MI nave
    else if (modo === 2) p = pos.x < ANCHO / 2 ? p1 : p2;
    if (!p.esRobot) { p.objetivoY = pos.y - p.h / 2; p.conDedo = true; }
  }
}
canvas.addEventListener("touchmove", e => { e.preventDefault(); manejarToques(e); }, { passive: false });
canvas.addEventListener("touchstart", manejarToques, { passive: true });

const teclas = {};
window.addEventListener("keydown", e => {
  if (document.activeElement && document.activeElement.tagName === "INPUT") return;
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  teclas[k] = true;
  if (k === " " || k === "p") {
    e.preventDefault();
    alternarPausa();
  }
  if (k === "ArrowUp" || k === "ArrowDown") e.preventDefault();
});
window.addEventListener("keyup", e => {
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  teclas[k] = false;
});

function moverConTeclas() {
  // 🌐 En línea: W/S, flechas y botones ▲ ▼ mueven MI nave (la del rival llega por internet)
  if (enLinea.activo) {
    const yo = enLinea.yo, b = botonesApretados[1];
    if (teclas["w"] || teclas["ArrowUp"])   yo.objetivoY -= VEL_TECLAS;
    if (teclas["s"] || teclas["ArrowDown"]) yo.objetivoY += VEL_TECLAS;
    if (b.arriba) { yo.objetivoY = Math.min(yo.objetivoY, yo.y) - VEL_BOTONES; yo.conDedo = true; }
    if (b.abajo)  { yo.objetivoY = Math.max(yo.objetivoY, yo.y) + VEL_BOTONES; yo.conDedo = true; }
    return;
  }
  // En 1 jugador: flechas o W/S mueven a p1. En 2 jugadores: W/S = p1, flechas = p2
  const arriba1 = teclas["w"] || (modo !== 2 && teclas["ArrowUp"]);
  const abajo1  = teclas["s"] || (modo !== 2 && teclas["ArrowDown"]);
  if (arriba1) p1.objetivoY -= VEL_TECLAS;
  if (abajo1)  p1.objetivoY += VEL_TECLAS;
  if (modo === 2) {
    if (teclas["ArrowUp"])   p2.objetivoY -= VEL_TECLAS;
    if (teclas["ArrowDown"]) p2.objetivoY += VEL_TECLAS;
  }
  // Botones ▲ ▼ de la pantalla (celular)
  jugadores.forEach(p => {
    const b = botonesApretados[p === p1 ? 1 : 2];
    if (b.arriba) { p.objetivoY = Math.min(p.objetivoY, p.y) - VEL_BOTONES; p.conDedo = true; }
    if (b.abajo)  { p.objetivoY = Math.max(p.objetivoY, p.y) + VEL_BOTONES; p.conDedo = true; }
  });
}

// ---------- Botones ▲ ▼ en pantalla (para celular) ----------
// El jugador 1 tiene los suyos a la izquierda y el jugador 2 a la derecha.
// Se mueve mientras mantengas el botón apretado.
const botonesApretados = { 1: { arriba: false, abajo: false }, 2: { arriba: false, abajo: false } };
document.querySelectorAll(".control").forEach(boton => {
  const estadoBoton = botonesApretados[boton.dataset.jugador];
  const dir = boton.dataset.dir;
  const apretar = e => {
    e.preventDefault();
    estadoBoton[dir] = true;
    boton.classList.add("activo");
    if (boton.setPointerCapture && e.pointerId !== undefined) boton.setPointerCapture(e.pointerId);
  };
  const soltar = () => { estadoBoton[dir] = false; boton.classList.remove("activo"); };
  boton.addEventListener("pointerdown", apretar);
  ["pointerup", "pointercancel", "lostpointercapture"].forEach(ev => boton.addEventListener(ev, soltar));
  boton.addEventListener("contextmenu", e => e.preventDefault());   // sin menú al dejar apretado
});

// =====================================================================
//  PELOTA
// =====================================================================
// Antes de cada saque: la pelota espera en el centro con una cuenta 3, 2, 1
const DURACION_CUENTA = 105;   // 1.75 s
function prepararSaque(hacia) {
  pelota.x = ANCHO / 2; pelota.y = ALTO / 2;
  pelota.vx = 0; pelota.vy = 0;
  pelota.atrapada = null;
  pelota.fuera = false;
  estela.length = 0;
  haciaQuienSaca = hacia;
  cuentaSaque = DURACION_CUENTA;
}

// Saca hacia el jugador "hacia"
function sacar(hacia) {
  pelota.x = ANCHO / 2;
  pelota.y = ALTO / 2;
  pelota.vel = dificultad.velInicial;
  pelota.atrapada = null;
  const angulo = Math.random() * 0.8 - 0.4;
  pelota.vx = Math.cos(angulo) * pelota.vel * hacia.lado;
  pelota.vy = Math.sin(angulo) * pelota.vel;
  ultimoGolpe = rivalDe(hacia);
  pelota.fuera = false;
  nuevoErrorRobot();
  golpes = 0;
  golpesAntes = 0;
  cuadrosSinGolpe = 0;
  estela.length = 0;
}

// Si la pelota queda casi vertical, rebota arriba y abajo para siempre
// sin llegar a nadie. Esto le da siempre un poco de movimiento hacia los lados.
function evitarPelotaVertical() {
  // En la cancha circular se mide "hacia los arcos" tomando en cuenta el giro
  const v = circulo ? aCancha(pelota.vx, pelota.vy) : { x: pelota.vx, y: pelota.vy };
  const minimo = pelota.vel * (circulo && !(circulo.remolino > 0) ? Math.cos(PHI_PARED - 0.08) : 0.45);
  if (Math.abs(v.x) >= minimo) return;
  v.x = (v.x >= 0 ? 1 : -1) * minimo;
  v.y = (v.y >= 0 ? 1 : -1) * Math.sqrt(pelota.vel * pelota.vel - minimo * minimo);
  if (circulo) {                 // se devuelve al giro real
    const r = circulo.rot;
    pelota.vx = v.x * Math.cos(r) - v.y * Math.sin(r);
    pelota.vy = v.x * Math.sin(r) + v.y * Math.cos(r);
  } else {
    pelota.vx = v.x; pelota.vy = v.y;
  }
}

// Seguro anti-trabas: si pasan 12 segundos sin que nadie toque la pelota,
// se lanza hacia el arco de alguno de los dos.
let cuadrosSinGolpe = 0;
function seguroAntiTrabas() {
  if (golpes !== golpesAntes) { golpesAntes = golpes; cuadrosSinGolpe = 0; return; }
  if (++cuadrosSinGolpe < 720) return;
  cuadrosSinGolpe = 0;
  const lado = Math.random() < 0.5 ? -1 : 1;
  const destino = jugadores.find(p => p.lado === lado);
  const dx = (circulo ? CX + lado * RADIO : xDelLado(lado)) - pelota.x;
  const dy = (destino.y + destino.h / 2) - pelota.y;
  const d = Math.hypot(dx, dy) || 1;
  pelota.vx = dx / d * pelota.vel;
  pelota.vy = dy / d * pelota.vel;
  nuevoErrorRobot();
}
let golpesAntes = 0;

// En la cancha circular la pelota va un poco más lenta (es más pequeña)
function velMaxActual() {
  return circulo ? Math.min(dificultad.velMax, VEL_MAX_CIRCULO) : dificultad.velMax;
}

function ponerVelocidad(nueva) {
  pelota.vel = Math.min(velMaxActual(), nueva);
  const actual = Math.hypot(pelota.vx, pelota.vy) || 1;
  pelota.vx = pelota.vx / actual * pelota.vel;
  pelota.vy = pelota.vy / actual * pelota.vel;
}

// ¿La pelota tocó la nave? Revisa el camino completo entre el cuadro anterior
// y este (no solo donde quedó), así no se "salta" las puntas cuando va rápido.
// El margen cuenta las puntas redondas y el brillo de la nave.
function tocaNave(p, x0, y0) {
  const margen = 4;
  const izq = p.x - pelota.r - margen, der = p.x + p.w + pelota.r + margen;
  const arriba = p.y - pelota.r - margen, abajo = p.y + p.h + pelota.r + margen;
  // Solo vale si la pelota venía por delante de la nave (no desde atrás)
  if (p.lado < 0 ? x0 < p.x : x0 > p.x + p.w) return false;
  for (let k = 1; k <= 6; k++) {
    const t = k / 6;
    const x = x0 + (pelota.x - x0) * t, y = y0 + (pelota.y - y0) * t;
    if (x >= izq && x <= der && y >= arriba && y <= abajo) return true;
  }
  return false;
}

function rebotar(paleta) {
  const centro = paleta.y + paleta.h / 2;
  const impacto = Math.max(-1, Math.min(1, (pelota.y - centro) / (paleta.h / 2)));
  const angulo = impacto * (Math.PI / 3.2);
  pelota.vx = Math.cos(angulo) * pelota.vel * -paleta.lado;   // sale hacia el otro lado
  pelota.vy = Math.sin(angulo) * pelota.vel;
  chispas(pelota.x, pelota.y, paleta.color);
  temblor = 4;
}

// =====================================================================
//  ROBOT ALIENÍGENA
// =====================================================================
function nuevoErrorRobot() {
  jugadores.forEach(p => {
    if (!p.esRobot) return;
    const tam = dificultad.base + pelota.vel * dificultad.porVel;
    p.error = (Math.random() * 2 - 1) * tam;
  });
}

// Simula el camino de la pelota para saber a qué altura llegará al robot
function predecirY(p) {
  let x = pelota.x, y = pelota.y, vx = pelota.vx, vy = pelota.vy;
  const meta = p.lado > 0 ? X_DER : X_IZQ + p.w;
  let pasos = 0;
  while ((p.lado > 0 ? x < meta : x > meta) && pasos < 3000) {
    x += vx; y += vy; pasos++;
    if (y < C_ARRIBA + pelota.r || y > C_ABAJO - pelota.r) vy = -vy;
  }
  return y;
}

function moverRobot(p) {
  if (p.esPared) return;            // 🎯 la pared de práctica no se mueve
  if (p.congelado > 0) return;
  let objetivo;
  if (circulo) {
    // En la cancha circular calcula en qué punto del borde llegará la pelota
    const y = pelota.atrapada || pelota.fuera || estado !== "jugando" ? null : predecirCirculo(p);
    objetivo = y === null ? ALTO / 2 - p.h / 2 : y + p.error * 1.4 - p.h / 2;
  } else {
    const vieneHaciaMi = Math.sign(pelota.vx) === p.lado && !pelota.atrapada && estado === "jugando";
    objetivo = vieneHaciaMi ? predecirY(p) + p.error - p.h / 2 : ALTO / 2 - p.h / 2;
  }
  const paso = Math.max(-dificultad.vel, Math.min(dificultad.vel, objetivo - p.y));
  p.y = Math.max(C_ARRIBA, Math.min(C_ABAJO - p.h, p.y + paso));

}

// =====================================================================
//  AGUJEROS NEGROS
// =====================================================================
function actualizarAgujeros() {
  for (let i = agujeros.length - 1; i >= 0; i--) {
    const a = agujeros[i];
    a.angulo += 0.05;
    a.edad = (a.edad || 0) + 1;
    if (pelota.atrapada !== a) a.vida--;
    if (a.vida <= 0) { agujeros.splice(i, 1); continue; }
    if (pelota.atrapada) continue;

    const dx = a.x - pelota.x, dy = a.y - pelota.y;
    const dist = Math.hypot(dx, dy);
    if (dist < a.r * 3.5 && dist > 0) {      // gravedad
      const fuerza = 0.18 * (1 - dist / (a.r * 3.5));
      pelota.vx += dx / dist * fuerza;
      pelota.vy += dy / dist * fuerza;
    }
    if (dist < a.r && !pelota.fuera) {       // ¡atrapada! (si ya se iba a gol, no)
      pelota.atrapada = a;
      pelota.tiempoAtrapada = TIEMPO_ATRAPADA;
      pelota.giro = Math.atan2(-dy, -dx);
      estela.length = 0;
      sonido(400, 0.9, "sine", 0.18, 60);
    }
  }
}

function lanzarDesdeAgujero() {
  const a = pelota.atrapada;
  const lado = Math.random() < 0.5 ? -1 : 1;
  const angulo = Math.random() * 1.1 - 0.55;
  const vel = Math.max(5, Math.min(pelota.vel, 10));
  pelota.vel = vel;
  pelota.vx = Math.cos(angulo) * vel * lado;
  pelota.vy = Math.sin(angulo) * vel;
  pelota.x = a.x + Math.sign(pelota.vx) * (a.r + pelota.r + 4);
  pelota.y = a.y;
  pelota.atrapada = null;
  pelota.fuera = false;
  a.vida = Math.min(a.vida, 40);
  nuevoErrorRobot();
  chispas(pelota.x, pelota.y, "#ffffff", 24);
  temblor = 8;
  sonido(120, 0.35, "sawtooth", 0.18, 900);
}

// =====================================================================
//  PODERES
// =====================================================================
// 🎲 Elige el siguiente poder con una "bolsa":
//  - Es como sacar papelitos de una bolsa: cada poder sale una vez y
//    no se repite hasta que salgan los demás (luego se llena otra vez).
//  - Si se puede, nunca sale uno igual a los que ya están en la mesa.
//  - El "peso" es cuántos papelitos de ese poder hay en la bolsa.
let bolsaPoderes = [];
const PODERES_PRACTICA = ["escudo", "lluvia", "agujero"];
function poderPermitido(t) {
  if (modo === 3 && !PODERES_PRACTICA.includes(t)) return false;   // 🎯 práctica: solo algunos
  if (circulo && t === "circulo") return false;           // no sale otro círculo si ya estamos en uno
  if (circulo && t === "cambio") return false;            // en el círculo no hay cambio de lado
  if (!circulo && t === "giro") return false;             // el giro solo sale en la cancha circular
  if (t === "normal" && !(circulo && circulo.yaGiro)) return false;   // ▭ solo después del primer giro
  return true;
}
function llenarBolsa() {
  bolsaPoderes = [];
  Object.keys(TIPOS_PODER).forEach(t => {
    for (let i = 0; i < TIPOS_PODER[t].peso; i++) bolsaPoderes.push(t);
  });
}
function elegirTipoPoder() {
  const enMesa = poderes.map(o => o.tipo);
  let permitidos = Object.keys(TIPOS_PODER).filter(t => TIPOS_PODER[t].peso > 0 && poderPermitido(t));
  // Mejor uno que no esté ya en la mesa
  const distintos = permitidos.filter(t => !enMesa.includes(t));
  if (distintos.length) permitidos = distintos;
  // Papelitos de la bolsa que sirven ahora; si no queda ninguno, se llena otra vez
  let opciones = bolsaPoderes.filter(t => permitidos.includes(t));
  if (opciones.length === 0) {
    llenarBolsa();
    opciones = bolsaPoderes.filter(t => permitidos.includes(t));
  }
  const tipo = opciones[Math.floor(Math.random() * opciones.length)];
  bolsaPoderes.splice(bolsaPoderes.indexOf(tipo), 1);   // ese papelito sale de la bolsa
  return tipo;
}

function crearPoder(tipoForzado) {
  const tipo = tipoForzado || elegirTipoPoder();
  for (let intento = 0; intento < 40; intento++) {
    let x = C_IZQ + 120 + Math.random() * (C_DER - C_IZQ - 240);
    let y = C_ARRIBA + 40 + Math.random() * (C_ABAJO - C_ARRIBA - 80);
    if (circulo) {                 // en la cancha circular sale adentro del círculo
      const ang = Math.random() * Math.PI * 2, dist = Math.random() * (RADIO - 60);
      x = CX + Math.cos(ang) * dist;
      y = CY + Math.sin(ang) * dist;
    }
    const cerca = intento > 30 ? 60 : 120;   // si no encuentra lugar, es menos exigente
    if (Math.hypot(x - pelota.x, y - pelota.y) > cerca &&
        agujeros.every(a => Math.hypot(x - a.x, y - a.y) > 110) &&
        poderes.every(o => Math.hypot(x - o.x, y - o.y) > 110) &&
        Math.abs(x - ANCHO / 2) > 25) {
      poderes.push({ tipo, x, y, r: 17, edad: 0, angulo: Math.random() * 6 });
      sonido(1400, 0.25, "sine", 0.1, 2000);
      if (estado === "jugando") mostrarConsejo("poder", "Golpea los poderes con la pelota: son para quien la tocó de último");
      return true;
    }
  }
  return false;   // no encontró lugar libre (lo intenta otra vez después)
}


function mostrarAviso(texto, color) { aviso = { texto, color, vida: 80 }; }

function cambiarAltura(p, nuevoAlto) {
  const centro = p.y + p.h / 2;
  p.h = nuevoAlto;
  p.y = Math.max(C_ARRIBA, Math.min(C_ABAJO - p.h, centro - p.h / 2));
  p.objetivoY = p.y;
}

// Quita los efectos que se acaban con cada gol (la cancha circular NO:
// esa solo se quita con el poder ▭ o al empezar otra partida)
function quitarEfectos() {
  jugadores.forEach(p => {
    p.congelado = 0;
    p.escudo = false;
    if (p.esPared) return;          // la pared de práctica siempre ocupa todo el alto
    if (p.encogido > 0 || p.h !== ALTO_PALETA) { p.encogido = 0; cambiarAltura(p, ALTO_PALETA); }
  });
  lluvia = 0;
  asteroides.length = 0;
}

// 🔊 Cada poder suena distinto, para reconocerlo sin mirar.
// Cada musiquita es una lista de notas: [frecuencia, cuándo (ms), duración, tipo, frecuencia final]
const SONIDOS_PODER = {
  hielo:    [[2093, 0, 0.12, "sine"], [1568, 70, 0.12, "sine"], [1319, 140, 0.12, "sine"], [2637, 210, 0.3, "triangle", 1800]],   // cristalitos
  escudo:   [[196, 0, 0.18, "square"], [294, 120, 0.18, "square"], [392, 240, 0.35, "square", 300]],                               // clang metálico
  encoger:  [[900, 0, 0.45, "sawtooth", 150], [300, 380, 0.15, "triangle", 500]],                                                  // se desinfla + boing
  lluvia:   [[110, 0, 0.3, "sawtooth", 60], [90, 150, 0.3, "sawtooth", 50], [70, 300, 0.5, "sawtooth", 40]],                     // retumbe
  cambio:   [[300, 0, 0.3, "square", 900], [900, 300, 0.3, "square", 300]],                                                        // ida y vuelta
  agujero:  [[220, 0, 0.9, "sine", 40], [55, 200, 0.8, "triangle", 35]],                                                           // se lo traga
  circulo:  [[523, 0, 0.15, "sine"], [659, 100, 0.15, "sine"], [784, 200, 0.15, "sine"], [1046, 300, 0.4, "sine"]],                // mágico, sube
  giro:     [[400, 0, 0.1, "triangle"], [600, 80, 0.1, "triangle"], [400, 160, 0.1, "triangle"], [600, 240, 0.1, "triangle"],
             [400, 320, 0.1, "triangle"], [800, 400, 0.4, "triangle", 300]],                                                       // remolino
  normal:   [[1046, 0, 0.15, "sine"], [784, 100, 0.15, "sine"], [659, 200, 0.15, "sine"], [523, 300, 0.4, "sine"]]                 // mágico, baja
};
function sonidoPoder(tipo) {
  (SONIDOS_PODER[tipo] || []).forEach(([f, ms, dur, forma, fFinal]) =>
    setTimeout(() => sonido(f, dur, forma, 0.13, fFinal), ms));
}

// "o" es el poder que se tocó (sirve para saber dónde estaba)
function activarPoder(tipo, o) {
  sonidoPoder(tipo);          // 🔊 cada poder tiene su propia musiquita
  const dueno = ultimoGolpe || p1;
  if (dueno.stats) dueno.stats.poderes++;      // para el logro "Coleccionista"
  const rival = rivalDe(dueno);
  temblor = 6;

  if (tipo === "hielo") {
    rival.congelado = rival.esRobot ? CONGELA_ROBOT : CONGELA_HUMANO;
    mostrarAviso("¡" + rival.nombre + " congelado! ❄", "#9fe6ff");
  }
  if (tipo === "escudo") {
    dueno.escudo = true;
    mostrarAviso("¡Escudo para " + dueno.nombre + "! 🛡", "#ffb36b");
  }
  if (tipo === "encoger") {
    cambiarAltura(rival, ALTO_PALETA / 2);
    rival.encogido = DURACION_ENCOGER;
    mostrarAviso("¡" + rival.nombre + " encogido! 👽", "#7dff6a");
  }
  if (tipo === "lluvia") {
    lluvia = DURACION_LLUVIA;
    mostrarAviso("¡Lluvia de asteroides! ☄", "#ff7b3c");
  }
  if (tipo === "agujero") {
    // ¡El poder se convierte en el agujero negro y atrapa la pelota ahí mismo!
    const x = o ? o.x : pelota.x, y = o ? o.y : pelota.y;
    const agujero = { x, y, r: 26, vida: DURACION_AGUJERO, angulo: 0 };
    agujeros.push(agujero);
    pelota.atrapada = agujero;
    pelota.tiempoAtrapada = TIEMPO_ATRAPADA;
    pelota.giro = Math.atan2(pelota.y - y, pelota.x - x);
    estela.length = 0;
    mostrarAviso("¡Agujero negro! 🕳", "#b98cff");
  }
  if (tipo === "giro") {
    if (circulo) empezarRemolino();
    mostrarAviso("¡Remolino! La pelota se curva 🌀", "#ff9df5");
  }
  if (tipo === "normal") {
    terminarCirculo(true);
  }
  if (tipo === "circulo") {
    activarCirculo();
    mostrarAviso("¡Cancha circular! ⭕", "#5fffd7");
    if (navigator.vibrate) navigator.vibrate([60, 40, 60]);
  }
  if (tipo === "cambio") {
    // ¡Los jugadores cambian de lado! La pelota se detiene 2 segundos.
    jugadores.forEach(p => (p.lado *= -1));
    cambio = esCelular ? DURACION_CAMBIO_CEL : DURACION_CAMBIO;
    mostrarAviso("¡Cambio de lado! 🔄", "#ffd23f");
    if (navigator.vibrate) navigator.vibrate(120);   // vibración en Android
  }
}

// =====================================================================
//  ⭕ CANCHA CIRCULAR
//  La cancha se vuelve un círculo. Cada nave se mueve por el borde de
//  su mitad (izquierda o derecha). Arriba y abajo hay paredes.
//  Truco: las naves se siguen controlando igual (arriba / abajo), y esa
//  altura se convierte en un ángulo sobre el círculo.
// =====================================================================
const CX = ANCHO / 2, CY = ALTO / 2;
const RADIO = 235;               // tamaño de la cancha circular
const PHI_PARED = 0.8;          // ángulo donde empiezan las paredes (más bajo = paredes más grandes)
const ESPERA_NORMAL_MIN = 180;  // el 🌀 aparece entre 3 y 6 s después de entrar al círculo
const ESPERA_NORMAL_MAX = 360;
const PAUSA_CIRCULO = 90;       // la pelota espera 1.5 s al aparecer el círculo
const VEL_MAX_CIRCULO = 9;
let circulo = null;             // { vida, edad } mientras está activo
let pausaCirculo = 0;
let esperaNormal = 0;           // cuenta para que salga el poder ▭

// Ángulo de una nave sobre su mitad del círculo (0 = en el medio de su lado)
// Cada nave se queda en su lado y arriba/abajo la mueve por el borde de su
// mitad del círculo, de pared a pared. TODO el recorrido del mouse, el dedo
// o las teclas se usa (sin zonas muertas) y la nave nunca pasa las paredes.
function rangoNave(p) { return (C_ABAJO - C_ARRIBA) / 2 - p.h / 2; }
function limiteNave(p) { return PHI_PARED - medioArco(p) * 0.8; }   // hasta tocar la pared
function anguloDe(p) {
  const s = Math.max(-1, Math.min(1, (p.y + p.h / 2 - CY) / rangoNave(p)));
  return s * limiteNave(p);
}
// Lo contrario: para llegar a un ángulo, ¿a qué altura tiene que ir la nave?
function alturaParaAngulo(p, phi) {
  return CY + Math.max(-1, Math.min(1, phi / limiteNave(p))) * rangoNave(p);
}

// Ángulo "de verdad" en el canvas (la mitad izquierda está volteada)
function anguloReal(p, phi) { return p.lado > 0 ? phi : Math.PI - phi; }
// Media nave medida como ángulo
function medioArco(p) { return (p.h / 2) / RADIO; }

function activarCirculo() {
  mostrarConsejo("circulo", "Cancha redonda: busca el 🌀 para el remolino y después el ▭ para volver");
  circulo = { edad: 0, rot: 0, remolino: 0, dir: 1, yaGiro: false, brillo: 0 };
  pausaCirculo = PAUSA_CIRCULO;
  esperaNormal = ESPERA_NORMAL_MIN + Math.random() * (ESPERA_NORMAL_MAX - ESPERA_NORMAL_MIN);
  // Si había otros ⭕ o 🔄 en la mesa, se quitan: en el círculo no hay cambio de lado
  for (let i = poderes.length - 1; i >= 0; i--) {
    if (poderes[i].tipo === "circulo" || poderes[i].tipo === "cambio") poderes.splice(i, 1);
  }
  // Los poderes y agujeros negros que quedaron afuera del círculo se mueven adentro
  [...poderes, ...agujeros].forEach(o => {
    const dx = o.x - CX, dy = o.y - CY, d = Math.hypot(dx, dy) || 1;
    if (d > RADIO - 50) {
      const nuevoRadio = 40 + Math.random() * (RADIO - 110);
      o.x = CX + dx / d * nuevoRadio;
      o.y = CY + dy / d * nuevoRadio;
    }
  });
  pelota.fuera = false;
  // Si la pelota quedó cerca del borde, se acerca al centro
  const dx = pelota.x - CX, dy = pelota.y - CY, d = Math.hypot(dx, dy);
  if (d > RADIO * 0.6) { pelota.x = CX + dx / d * RADIO * 0.4; pelota.y = CY + dy / d * RADIO * 0.4; }
  estela.length = 0;
  ponerVelocidad(pelota.vel);
}

function terminarCirculo(conAviso) {
  if (!circulo) return;
  circulo = null;
  pausaCirculo = conAviso ? 60 : 0;      // 1 s de pausa para acomodarse
  pelota.fuera = false;
  // Los poderes ▭ y 🌀 que sobren ya no sirven
  for (let i = poderes.length - 1; i >= 0; i--) {
    if (["normal", "giro"].includes(poderes[i].tipo)) poderes.splice(i, 1);
  }
  if (conAviso) mostrarAviso("¡Cancha normal! ▭", "#7fb2ff");
}

// Mientras la cancha es circular, cada cierto tiempo sale el poder ▭
// para que siempre se pueda volver
// En cada cancha circular, el 🌀 tiene que salir sí o sí para girar al
// menos una vez. Después del primer giro, los poderes salen al azar
// (incluido el ▭ para volver a la cancha normal).
function actualizarNormal() {
  if (!circulo || circulo.yaGiro) return;
  const necesario = "giro";
  if (poderes.some(o => o.tipo === necesario)) return;
  if (--esperaNormal <= 0) {
    // Si ya están todos, se quita el más viejo para no pasar del máximo
    if (poderes.length >= MAX_PODERES) poderes.shift();
    crearPoder(necesario);
    esperaNormal = ESPERA_NORMAL_MIN + Math.random() * (ESPERA_NORMAL_MAX - ESPERA_NORMAL_MIN);
  }
}

// Choque de la pelota con el borde del círculo
// ---------- 🌀 Remolino ----------
// Las paredes nunca se mueven. El remolino hace que el agujero negro del
// centro curve la pelota en espiral durante 10 segundos.
const DURACION_REMOLINO = 600;  // 10 s
const FUERZA_REMOLINO = 1.4;    // qué tanto se curva la pelota (antes 0.7)
// Las paredes no giran, así que la cancha siempre está "derecha"
function aCancha(dx, dy) { return { x: dx, y: dy }; }
function empezarRemolino() {
  circulo.yaGiro = true;                 // desde ahora el ▭ puede salir al azar
  circulo.remolino = DURACION_REMOLINO;
  circulo.dir = Math.random() < 0.5 ? -1 : 1;   // a favor o en contra del reloj
}
function actualizarRemolino() {
  if (circulo && circulo.remolino > 0) circulo.remolino--;
}

function fisicaCirculo() {
  const dx = pelota.x - CX, dy = pelota.y - CY;
  const d = Math.hypot(dx, dy) || 1;
  const c = aCancha(dx, dy);     // posición respecto a las paredes (que pueden girar)
  const lado = dx < 0 ? -1 : 1;  // la mitad izquierda es de un jugador y la derecha del otro
  const dueno = jugadores.find(p => p.lado === lado);

  if (pelota.fuera) {             // ya pasó la nave: ¡gol cuando salga del todo!
    // Si algo la devolvió adentro del círculo (agujero, asteroide...), NO es gol: sigue el juego
    if (d + pelota.r < RADIO - 2) { pelota.fuera = false; return; }
    // Es gol solo cuando la pelota ya está claramente afuera, pasando el borde de fuego
    if (d > RADIO + 45) anotarGol(rivalDe(dueno));
    return;
  }
  if (d + pelota.r < RADIO) return;
  const nx = dx / d, ny = dy / d;
  if (pelota.vx * nx + pelota.vy * ny <= 0) return;     // ya va hacia adentro

  const phiPared = Math.atan2(c.y, Math.abs(c.x));   // para saber si pegó en una pared
  const phi = Math.atan2(dy, Math.abs(dx));             // dónde pegó, en la mitad de ese jugador
  const reflejar = () => {
    const punto = pelota.vx * nx + pelota.vy * ny;
    pelota.vx -= 2 * punto * nx;
    pelota.vy -= 2 * punto * ny;
    pelota.x = CX + nx * (RADIO - pelota.r - 1);
    pelota.y = CY + ny * (RADIO - pelota.r - 1);
  };

  // Paredes de fuego (arriba y abajo, o donde estén si giraron)
  if (Math.abs(phiPared) > PHI_PARED) { reflejar(); circulo.brillo = 1; sonido(300, 0.04); return; }

  // ¿Le pegó a la nave?
  const diferencia = phi - anguloDe(dueno);
  // La nave se dibuja con puntas redondas y brillo: el choque cuenta hasta ahí también
  const alcance = medioArco(dueno) + (pelota.r + 7) / RADIO;
  if (Math.abs(diferencia) <= alcance) {
    const impacto = diferencia / alcance;                 // -1 (punta de arriba) a 1 (abajo)
    const ang = Math.atan2(-ny, -nx) + impacto * 0.9 * -lado;
    pelota.vx = Math.cos(ang) * pelota.vel;
    pelota.vy = Math.sin(ang) * pelota.vel;
    pelota.x = CX + nx * (RADIO - pelota.r - 1);
    pelota.y = CY + ny * (RADIO - pelota.r - 1);
    chispas(pelota.x, pelota.y, dueno.color);
    temblor = 4;
    ultimoGolpe = dueno;
    dueno.golpes++;
    registrarGolpe(dueno);
    golpes++;
    mejorRacha = Math.max(mejorRacha, golpes);
    sonido(dueno.esRobot ? 420 : 520 + golpes * 12, 0.07);
    nuevoErrorRobot();
    return;
  }

  // 🛡 El escudo también funciona en el círculo
  if (dueno.escudo) {
    reflejar();
    dueno.escudo = false;
    chispas(pelota.x, pelota.y, "#ffb36b", 30);
    temblor = 8;
    mostrarAviso("¡El escudo salvó a " + dueno.nombre + "! 🛡", "#ffb36b");
    sonido(180, 0.3, "square", 0.15, 90);
    nuevoErrorRobot();
    return;
  }
  pelota.fuera = true;            // ¡se le pasó!
}

// El robot simula el camino de la pelota dentro del círculo
function predecirCirculo(p) {
  let x = pelota.x, y = pelota.y, vx = pelota.vx, vy = pelota.vy;
  for (let i = 0; i < 2000; i++) {
    x += vx; y += vy;
    const dx = x - CX, dy = y - CY, d = Math.hypot(dx, dy);
    if (d + pelota.r < RADIO) continue;
    const c = aCancha(dx, dy);
    if (Math.abs(Math.atan2(c.y, Math.abs(c.x))) > PHI_PARED) {   // rebota en la pared
      const nx = dx / d, ny = dy / d, punto = vx * nx + vy * ny;
      if (punto > 0) { vx -= 2 * punto * nx; vy -= 2 * punto * ny; }
      continue;
    }
    if (Math.sign(dx) !== p.lado) return null;            // va al otro lado
    return alturaParaAngulo(p, Math.atan2(dy, Math.abs(dx)));
  }
  return null;
}

function actualizarPoderes() {
  // Efectos que se acaban con el tiempo
  jugadores.forEach(p => {
    if (p.congelado > 0) p.congelado--;
    if (p.encogido > 0 && --p.encogido === 0) cambiarAltura(p, ALTO_PALETA);
  });

  // Al principio salen de a poco (cada 4 s) hasta llegar a 3.
  // Después, si falta uno, sale otro 5 segundos después.
  if (poderes.length >= MAX_PODERES) yaSeLleno = true;
  if (poderes.length < MAX_PODERES && --esperaPoder <= 0) {
    esperaPoder = crearPoder() ? (yaSeLleno ? REGENERA_PODER : APARECE_INICIO) : 10;
  }

  // Se quedan en la mesa hasta que la pelota los toque
  for (let i = poderes.length - 1; i >= 0; i--) {
    const o = poderes[i];
    o.edad++;
    o.angulo += 0.03;
    if (o.edad < 30 || pelota.atrapada) continue;   // todavía está apareciendo
    if (Math.hypot(pelota.x - o.x, pelota.y - o.y) < o.r + pelota.r) {
      chispas(o.x, o.y, TIPOS_PODER[o.tipo].color, 30);
      poderes.splice(i, 1);
      activarPoder(o.tipo, o);
      break;   // un poder por vez (algunos poderes cambian la lista)
    }
  }
}

// ---------- ☄ Lluvia de asteroides ----------
function crearAsteroide() {
  const r = 10 + Math.random() * 10;
  const puntos = [];
  for (let i = 0; i < 9; i++) puntos.push(0.75 + Math.random() * 0.35);
  asteroides.push({ x: C_IZQ + 50 + Math.random() * (C_DER - C_IZQ - 100), y: -r - 5,
    vx: (Math.random() - 0.5) * 2.5, vy: 2.5 + Math.random() * 2.5,
    r, rot: Math.random() * 6, giro: (Math.random() - 0.5) * 0.1, puntos });
}

function actualizarLluvia() {
  if (lluvia > 0 && --lluvia % 9 === 0) crearAsteroide();
  for (let i = asteroides.length - 1; i >= 0; i--) {
    const a = asteroides[i];
    a.x += a.vx; a.y += a.vy; a.rot += a.giro;
    if (a.y > ALTO + 40) { asteroides.splice(i, 1); continue; }
    if (pelota.atrapada) continue;
    const dx = pelota.x - a.x, dy = pelota.y - a.y;
    const dist = Math.hypot(dx, dy);
    if (dist < a.r + pelota.r && dist > 0) {
      const nx = dx / dist, ny = dy / dist;
      const punto = pelota.vx * nx + pelota.vy * ny;
      if (punto < 0) { pelota.vx -= 2 * punto * nx; pelota.vy -= 2 * punto * ny; }
      const minimo = pelota.vel * 0.4;   // que no quede casi vertical
      if (Math.abs(pelota.vx) < minimo) pelota.vx = (pelota.vx >= 0 ? 1 : -1) * minimo;
      ponerVelocidad(pelota.vel);
      pelota.x = a.x + nx * (a.r + pelota.r + 1);
      pelota.y = a.y + ny * (a.r + pelota.r + 1);
      chispas(pelota.x, pelota.y, "#c9a27a", 10);
      nuevoErrorRobot();
      sonido(160, 0.08, "square", 0.12);
    }
  }
}

// =====================================================================
//  EFECTOS
// =====================================================================
function chispas(x, y, color, cantidad = 14) {
  // 🌐 El anfitrión anota las chispas para que el invitado también las vea
  if (enLinea.activo && enLinea.rol === "anfitrion") enLinea.chispas.push([Math.round(x), Math.round(y), color, cantidad]);
  for (let i = 0; i < cantidad; i++) {
    particulas.push({ x, y, vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8, vida: 1, color });
  }
}

// 🎆 Fuegos artificiales mientras se ve la pantalla de victoria
// (función aparte para que el invitado del modo en línea también los vea)
function lanzarFuegos() {
  if (!(estado === "fin" && celebrar && cuadro % 18 === 0)) return;
  const colores = ["#ff3cac", "#38e8ff", "#ffd23f", "#7dff6a", "#b98cff", "#ff7b3c"];
  const x = 120 + Math.random() * (ANCHO - 240), y = 70 + Math.random() * (ALTO - 220);
  for (let i = 0; i < 46; i++) {
    const ang = Math.random() * Math.PI * 2, v = 2 + Math.random() * 4;
    particulas.push({ x, y, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, vida: 1.6, tam: 5,
                      color: colores[Math.floor(Math.random() * colores.length)] });
  }
  if (cuadro % 36 === 0) sonido(180 + Math.random() * 200, 0.25, "sine", 0.06, 60);
}

// =====================================================================
//  ACTUALIZAR (cada cuadro, ~60 veces por segundo)
// =====================================================================
function actualizar() {
  // 🌐 El invitado NO simula la física: dibuja lo que le manda el anfitrión (js/enlinea.js)
  if (enLinea.activo && enLinea.rol === "invitado") { enLinea.actualizarInvitado(); return; }
  cuadro++;
  moverConTeclas();
  jugadores.forEach(p => {
    p.objetivoY = Math.max(C_ARRIBA, Math.min(C_ABAJO - p.h, p.objetivoY));
    if (!p.esRobot && p.congelado <= 0) p.y += (p.objetivoY - p.y) * (p.conDedo ? SENSIBILIDAD_DEDO : SENSIBILIDAD);
    p.x += (xDelLado(p.lado) - p.x) * 0.12;     // vuela a su lado (cambio de lado)
  });
  if (aviso && --aviso.vida <= 0) aviso = null;

  for (let i = particulas.length - 1; i >= 0; i--) {
    const q = particulas[i];
    q.x += q.vx; q.y += q.vy; q.vida -= 0.035;
    if (q.vida <= 0) particulas.splice(i, 1);
  }
  temblor *= 0.85;

  if (estado === "gol") {
    jugadores.forEach(p => p.esRobot && moverRobot(p));
    if (--temporizador <= 0) { estado = "jugando"; prepararSaque(haciaQuienSaca); }
    return;
  }
  if (flashGol && --flashGol.vida <= 0) flashGol = null;
  if (estado === "jugando" || estado === "gol") actualizarConsejos();
  lanzarFuegos();   // 🎆 fuegos artificiales en la pantalla de victoria
  if (circulo && circulo.brillo > 0) circulo.brillo *= 0.9;
  if (estado !== "jugando") return;

  // 3, 2, 1... ¡ya! (la pelota espera en el centro)
  if (cuentaSaque > 0) {
    jugadores.forEach(p => p.esRobot && moverRobot(p));
    if (cuentaSaque % 35 === 0) sonido(cuentaSaque > 35 ? 520 : 520, 0.08, "triangle", 0.12);
    if (--cuentaSaque === 0) { sacar(haciaQuienSaca); sonido(880, 0.15, "triangle", 0.15); }
    return;
  }

  // 🔄 Mientras cambian de lado, la pelota espera quieta
  if (cambio > 0) {
    if (--cambio === 0) jugadores.forEach(p => (p.x = xDelLado(p.lado)));
    return;
  }

  // ⭕ Cancha circular: pausa al empezar y tiempo que dura
  if (pausaCirculo > 0) {
    pausaCirculo--;
    if (circulo) circulo.edad++;
    jugadores.forEach(p => p.esRobot && moverRobot(p));
    return;
  }
  if (circulo) {
    circulo.edad++;
    actualizarNormal();
    actualizarRemolino();
  }

  // ⏱ Contrarreloj: el tiempo solo corre mientras la pelota está en juego
  if (contrarreloj && modo !== 3 && !golDeOro) {
    tiempoRestante--;
    if (tiempoRestante > 0 && tiempoRestante <= 600 && tiempoRestante % 60 === 0) sonido(1200, 0.06, "square", 0.08);
    if (tiempoRestante <= 0) {
      if (p1.puntos !== p2.puntos) {         // ¡se acabó el tiempo!
        sonido(1000, 0.6, "square", 0.15, 500);
        terminarPartida(p1.puntos > p2.puntos ? p1 : p2);
        return;
      }
      golDeOro = true;                      // empate: el próximo gol gana
      mostrarAviso("¡Empate! ⚡ Gol de oro: el próximo gol gana", "#ffd23f");
      sonido(880, 0.5, "square", 0.15, 1760);
    }
  }

  actualizarAgujeros();
  actualizarPoderes();
  actualizarLluvia();

  if (pelota.atrapada) {
    const a = pelota.atrapada;
    pelota.giro += 0.35;
    const radio = a.r * 0.6 * (pelota.tiempoAtrapada / TIEMPO_ATRAPADA) + 3;
    pelota.x = a.x + Math.cos(pelota.giro) * radio;
    pelota.y = a.y + Math.sin(pelota.giro) * radio;
    jugadores.forEach(p => p.esRobot && moverRobot(p));
    if (--pelota.tiempoAtrapada <= 0) lanzarDesdeAgujero();
    return;
  }

  ponerVelocidad(pelota.vel + dificultad.velTiempo);
  evitarPelotaVertical();
  seguroAntiTrabas();
  const xAntes = pelota.x, yAntes = pelota.y;   // para revisar el camino completo de la pelota
  pelota.x += pelota.vx;
  pelota.y += pelota.vy;
  estela.push({ x: pelota.x, y: pelota.y });
  // En el remolino la estela es más larga, para que se vea la curva
  const largoEstela = circulo && circulo.remolino > 0 ? 45 : 16;
  while (estela.length > largoEstela) estela.shift();

  // ⭕ En la cancha circular se usa otra física
  if (circulo) {
    // El agujero del centro atrae un poquito la pelota (solo la curva)
    const gx = CX - pelota.x, gy = CY - pelota.y, gd = Math.hypot(gx, gy);
    if (!pelota.fuera && gd < 120 && gd > 5) {
      const fuerza = 0.06 * (1 - gd / 120);
      pelota.vx += gx / gd * fuerza;
      pelota.vy += gy / gd * fuerza;
    }
    // 🌀 Remolino: empuja la pelota de lado, alrededor del centro, y la curva.
    // (La fuerza depende de la velocidad para que nunca se quede dando vueltas.)
    if (circulo.remolino > 0 && !pelota.fuera && gd > 5) {
      const fuerza = FUERZA_REMOLINO * pelota.vel * pelota.vel / RADIO;
      pelota.vx += -gy / gd * fuerza * circulo.dir;
      pelota.vy +=  gx / gd * fuerza * circulo.dir;
    }
    jugadores.forEach(p => p.esRobot && moverRobot(p));
    fisicaCirculo();
    return;
  }

  if (pelota.y < C_ARRIBA + pelota.r) { pelota.y = C_ARRIBA + pelota.r; pelota.vy = Math.abs(pelota.vy);  sonido(300, 0.04); }
  if (pelota.y > C_ABAJO - pelota.r)  { pelota.y = C_ABAJO - pelota.r;  pelota.vy = -Math.abs(pelota.vy); sonido(300, 0.04); }

  jugadores.forEach(p => p.esRobot && moverRobot(p));

  // Golpes con las paletas
  jugadores.forEach(p => {
    if (Math.sign(pelota.vx) !== p.lado) return;
    if (tocaNave(p, xAntes, yAntes)) {
      pelota.x = p.lado < 0 ? p.x + p.w + pelota.r : p.x - pelota.r;
      rebotar(p);
      ultimoGolpe = p;
      p.golpes++;
      registrarGolpe(p);
      golpes++;
      mejorRacha = Math.max(mejorRacha, golpes);
      sonido(p.esRobot ? 420 : 520 + golpes * 12, 0.07);
      nuevoErrorRobot();
    }
  });

  // 🛡 Escudos: salvan un gol y se rompen
  jugadores.forEach(p => {
    if (!p.escudo) return;
    const salva = p.lado < 0 ? (pelota.vx < 0 && pelota.x - pelota.r <= C_IZQ + 6)
                             : (pelota.vx > 0 && pelota.x + pelota.r >= C_DER - 6);
    if (!salva) return;
    pelota.x = p.lado < 0 ? C_IZQ + 6 + pelota.r : C_DER - 6 - pelota.r;
    pelota.vx = -pelota.vx;
    p.escudo = false;
    chispas(pelota.x, pelota.y, "#ffb36b", 30);
    temblor = 8;
    mostrarAviso("¡El escudo salvó a " + p.nombre + "! 🛡", "#ffb36b");
    sonido(180, 0.3, "square", 0.15, 90);
    nuevoErrorRobot();
  });

  // ¿Gol? Si sale por la izquierda, anota quien está a la derecha (y al revés)
  if (pelota.x < C_IZQ - 30)  anotarGol(jugadores.find(p => p.lado === 1));
  if (pelota.x > C_DER + 30) anotarGol(jugadores.find(p => p.lado === -1));
}

// 🎯 En práctica no hay goles: si se te pasa, vuelves a sacar
function fallarPractica() {
  temblor = 10;
  pelota.vx = 0; pelota.vy = 0;
  pelota.x = ANCHO / 2; pelota.y = ALTO / 2;
  agujeros.length = 0;
  aviso = null;
  quitarEfectos();
  tituloCartel = "¡Se te pasó!";
  mensaje = "Tu mejor peloteo: " + mejorRacha + " · ¡Sigue practicando!";
  sonido(220, 0.25, "triangle", 0.15);
  haciaQuienSaca = p1;
  estado = "gol";
  temporizador = 80;
}

function anotarGol(goleador) {
  if (modo === 3) { fallarPractica(); return; }
  // Datos para los logros (antes de que se limpie todo)
  if (goleador.stats) {
    if (circulo) goleador.stats.golCirculo = true;
    if (circulo && circulo.remolino > 0) goleador.stats.golGiro = true;
  }
  const recibio = rivalDe(goleador);
  goleador.puntos++;
  jugadores.forEach(p => {
    if (p.stats) p.stats.peorDiferencia = Math.max(p.stats.peorDiferencia, rivalDe(p).puntos - p.puntos);
  });
  temblor = 14;
  pelota.vx = 0; pelota.vy = 0;
  pelota.x = ANCHO / 2; pelota.y = ALTO / 2;
  agujeros.length = 0;
  aviso = null;
  quitarEfectos();
  haciaQuienSaca = recibio;
  flashGol = { lado: recibio.lado, color: goleador.color, vida: 45 };

  tituloCartel = "¡Gol de " + goleador.nombre + "!";
  if (goleador.puntos === GOLES_PARA_TERMINAR - 1) tituloCartel += " ¡Punto de partido!";
  if (goleador.esRobot) {
    mensaje = burlas[Math.floor(Math.random() * burlas.length)];
    sonido(140, 0.35, "sawtooth", 0.2);
  } else {
    mensaje = (modo === 1 ? quejas : festejos)[Math.floor(Math.random() * 5)];
    sonido(660, 0.12, "triangle", 0.2);
    setTimeout(() => sonido(990, 0.2, "triangle", 0.2), 110);
  }

  mostrarConsejo("pausa", esCelular ? "Con el botón ⏸ puedes pausar cuando quieras" : "Con Espacio o el botón ⏸ puedes pausar");
  if (goleador.puntos >= GOLES_PARA_TERMINAR || golDeOro) terminarPartida(goleador);
  else { estado = "gol"; temporizador = 80; }
}

// =====================================================================
//  DIBUJAR
// =====================================================================
function rectRedondo(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function dibujarAgujero(a) {
  const aparicion = Math.min(1, (a.edad || 0) / 8, a.vida / 30);   // aparece de golpe y se apaga suave
  ctx.save();
  ctx.globalAlpha = Math.max(0, aparicion);
  ctx.translate(a.x, a.y);
  const halo = ctx.createRadialGradient(0, 0, a.r * 0.6, 0, 0, a.r * 3.5);
  halo.addColorStop(0, "rgba(180, 80, 255, .55)");
  halo.addColorStop(0.4, "rgba(255, 60, 172, .18)");
  halo.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = halo;
  ctx.beginPath(); ctx.arc(0, 0, a.r * 3.5, 0, Math.PI * 2); ctx.fill();
  ctx.rotate(a.angulo);
  for (let i = 0; i < 3; i++) {
    ctx.strokeStyle = ["#ffb36b", "#ff3cac", "#b98cff"][i];
    ctx.lineWidth = 3 - i * 0.7;
    ctx.beginPath();
    ctx.ellipse(0, 0, a.r * (1.5 + i * 0.35), a.r * (0.55 + i * 0.12), i * 0.6, 0, Math.PI * 1.4);
    ctx.stroke();
  }
  ctx.fillStyle = "#000";
  ctx.beginPath(); ctx.arc(0, 0, a.r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "rgba(255, 200, 255, .8)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

function dibujarPoder(o) {
  const color = TIPOS_PODER[o.tipo].color;
  // Aparece de a poco: crece con un pequeño rebote
  const t = Math.min(1, o.edad / 30);
  const escala = t < 1 ? 1 - Math.pow(1 - t, 3) * Math.cos(t * 9) : 1;
  const flota = Math.sin(cuadro * 0.08 + o.angulo) * 4;
  ctx.save();
  ctx.globalAlpha = t;
  ctx.translate(o.x, o.y + flota);
  ctx.scale(escala, escala);

  const g = ctx.createRadialGradient(0, 0, 4, 0, 0, o.r * 2.4);
  g.addColorStop(0, color + "88");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, o.r * 2.4, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, o.r + 6, 0, Math.PI * 2); ctx.stroke();
  ctx.lineCap = "round";

  if (o.tipo === "hielo") {
    ctx.rotate(o.angulo);
    ctx.strokeStyle = "#e6fbff";
    ctx.lineWidth = 3;
    for (let i = 0; i < 6; i++) {
      ctx.rotate(Math.PI / 3);
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(0, -o.r);
      ctx.moveTo(0, -o.r * 0.55); ctx.lineTo(-5, -o.r * 0.8);
      ctx.moveTo(0, -o.r * 0.55); ctx.lineTo(5, -o.r * 0.8);
      ctx.stroke();
    }
  }
  if (o.tipo === "escudo") {
    ctx.fillStyle = "#ffb36b";
    ctx.beginPath();
    ctx.moveTo(0, -14); ctx.lineTo(12, -8); ctx.lineTo(10, 6); ctx.lineTo(0, 15);
    ctx.lineTo(-10, 6); ctx.lineTo(-12, -8); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#7a4a2a";
    [[-4, -3, 3.5], [4, 1, 3], [-1, 7, 2.5]].forEach(([x, y, r]) => {
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    });
  }
  if (o.tipo === "encoger") {
    ctx.fillStyle = "#7dff6a";
    ctx.beginPath(); ctx.ellipse(0, 0, 10, 13, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#0b1a05";
    ctx.beginPath(); ctx.ellipse(-4, -1, 3, 5, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(4, -1, 3, 5, 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#e9ffe5"; ctx.lineWidth = 2;
    [-1, 1].forEach(lado => {
      ctx.beginPath();
      ctx.moveTo(lado * 22, 0); ctx.lineTo(lado * 15, 0);
      ctx.moveTo(lado * 18, -3); ctx.lineTo(lado * 15, 0); ctx.lineTo(lado * 18, 3);
      ctx.stroke();
    });
  }
  if (o.tipo === "lluvia") {
    ctx.strokeStyle = "#ffd23f"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(-14, -14); ctx.lineTo(0, 0); ctx.stroke();
    ctx.strokeStyle = "#ff7b3c"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-6, -16); ctx.lineTo(2, -4); ctx.moveTo(-16, -6); ctx.lineTo(-4, 2); ctx.stroke();
    ctx.fillStyle = "#a07050";
    ctx.beginPath(); ctx.arc(4, 4, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#6e4a33";
    ctx.beginPath(); ctx.arc(6, 2, 2.5, 0, Math.PI * 2); ctx.fill();
  }
  if (o.tipo === "agujero") {
    // Mini agujero negro con su disco girando
    ctx.rotate(o.angulo * 2);
    ctx.strokeStyle = "#ffb36b"; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.ellipse(0, 0, 14, 5, 0.3, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = "#ff3cac"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(0, 0, 11, 3.5, 0.3, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = "#000";
    ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(255, 210, 255, .9)"; ctx.lineWidth = 1.2;
    ctx.stroke();
  }
  if (o.tipo === "giro") {
    // Flechas girando alrededor de un círculo
    ctx.rotate(-o.angulo * 5);
    ctx.strokeStyle = "#ff9df5";
    ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
      ctx.rotate(Math.PI * 2 / 3);
      ctx.beginPath(); ctx.arc(0, 0, 11, 0, 1.4); ctx.stroke();
      const fx = Math.cos(1.4) * 11, fy = Math.sin(1.4) * 11;
      ctx.beginPath(); ctx.moveTo(fx + 4, fy - 3); ctx.lineTo(fx, fy); ctx.lineTo(fx + 5, fy + 3); ctx.stroke();
    }
  }
  if (o.tipo === "normal") {
    // Una canchita rectangular con sus dos naves
    ctx.strokeStyle = "#7fb2ff";
    ctx.lineWidth = 2.5;
    ctx.strokeRect(-13, -9, 26, 18);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(-10, -5, 3, 10);
    ctx.fillRect(7, -5, 3, 10);
    ctx.setLineDash([2, 2]);
    ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(0, 9); ctx.stroke();
    ctx.setLineDash([]);
  }
  if (o.tipo === "circulo") {
    // Un anillo con una pelotita que gira alrededor
    ctx.strokeStyle = "#5fffd7";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.arc(Math.cos(o.angulo * 4) * 11, Math.sin(o.angulo * 4) * 11, 3.5, 0, Math.PI * 2); ctx.fill();
  }
  if (o.tipo === "cambio") {
    // Dos flechas curvas que giran (intercambio)
    ctx.rotate(o.angulo * 1.5);
    ctx.strokeStyle = "#ffd23f";
    ctx.lineWidth = 3;
    for (let i = 0; i < 2; i++) {
      ctx.rotate(Math.PI);
      ctx.beginPath(); ctx.arc(0, 0, 10, 0.2, Math.PI - 0.4); ctx.stroke();
      const fx = Math.cos(Math.PI - 0.4) * 10, fy = Math.sin(Math.PI - 0.4) * 10;
      ctx.beginPath();
      ctx.moveTo(fx - 5, fy - 3); ctx.lineTo(fx, fy); ctx.lineTo(fx + 1, fy - 6);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function dibujarAsteroide(a) {
  ctx.save();
  ctx.translate(a.x, a.y);
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = "#ff7b3c";
  ctx.beginPath(); ctx.moveTo(-a.r * 0.6, 0); ctx.lineTo(a.r * 0.6, 0); ctx.lineTo(-a.vx * 6, -a.r * 2.6); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.rotate(a.rot);
  ctx.fillStyle = "#8a6a52";
  ctx.strokeStyle = "#c9a27a";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  a.puntos.forEach((f, i) => {
    const ang = i / a.puntos.length * Math.PI * 2;
    const px = Math.cos(ang) * a.r * f, py = Math.sin(ang) * a.r * f;
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  });
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#5e4535";
  ctx.beginPath(); ctx.arc(a.r * 0.25, -a.r * 0.2, a.r * 0.22, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function dibujarEscudo(p) {
  const x = p.lado < 0 ? C_IZQ + 4 : C_DER - 4;
  ctx.save();
  ctx.shadowColor = "#ffb36b";
  ctx.shadowBlur = 12;
  ctx.fillStyle = "rgba(255, 179, 107, " + (0.35 + Math.sin(cuadro * 0.15) * 0.15) + ")";
  ctx.fillRect(x - 3, C_ARRIBA, 6, C_ABAJO - C_ARRIBA);
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#8a6a52";
  for (let y = C_ARRIBA + 10; y < C_ABAJO; y += 26) {
    ctx.beginPath(); ctx.arc(x, y, 6 + (y % 3), 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// Nave dibujada como un arco sobre el borde del círculo
// 🎯 Pared del modo práctica: devuelve todas las pelotas
function dibujarPared(p) {
  ctx.save();
  const g = ctx.createLinearGradient(p.x, 0, p.x + p.w + 10, 0);
  g.addColorStop(0, "rgba(56, 232, 255, .9)");
  g.addColorStop(1, "rgba(56, 232, 255, .15)");
  ctx.fillStyle = g;
  ctx.shadowColor = "#38e8ff"; ctx.shadowBlur = 18;
  ctx.fillRect(p.x, 0, p.w + 10, ALTO);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(255, 255, 255, .35)";
  ctx.lineWidth = 1;
  for (let y = (cuadro % 30) - 30; y < ALTO; y += 30) {     // rayitas que se mueven
    ctx.beginPath(); ctx.moveTo(p.x, y); ctx.lineTo(p.x + p.w + 10, y + 12); ctx.stroke();
  }
  ctx.restore();
}

function dibujarPaletaCirculo(p) {
  const color = p.congelado > 0 ? "#9fe6ff" : p.color;
  const a = anguloReal(p, anguloDe(p));      // la nave se queda en su lado
  const m = medioArco(p);
  ctx.save();
  ctx.lineCap = "round";
  if (p.congelado > 0) {
    ctx.strokeStyle = "rgba(190, 240, 255, .45)";
    ctx.lineWidth = 28;
    ctx.beginPath(); ctx.arc(CX, CY, RADIO + 7, a - m - 0.04, a + m + 0.04); ctx.stroke();
  }
  ctx.strokeStyle = color;
  ctx.shadowColor = color; ctx.shadowBlur = 18;
  ctx.lineWidth = 14;
  ctx.beginPath(); ctx.arc(CX, CY, RADIO + 7, a - m, a + m); ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(255,255,255,.55)";
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(CX, CY, RADIO + 4, a - m * 0.8, a + m * 0.8); ctx.stroke();
  if (p.esRobot) {
    ctx.fillStyle = "#1a0033";
    [-0.06, 0.06].forEach(d => {
      ctx.beginPath();
      ctx.arc(CX + Math.cos(a + d) * (RADIO + 7), CY + Math.sin(a + d) * (RADIO + 7), 3.5, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  ctx.restore();
}

// Bordes de la cancha circular
// Polvo de estrellas que gira en espiral hacia el centro del agujero negro
const polvo = [];
for (let i = 0; i < 90; i++) {
  polvo.push({ ang: Math.random() * Math.PI * 2, rad: 30 + Math.random() * (RADIO - 30),
               color: ["#ffb36b", "#ff3cac", "#b98cff", "#ffd23f"][i % 4] });
}

// Fondo de la cancha circular: un gran agujero negro
// (se dibuja ANTES que la pelota, las naves y los poderes)
function dibujarFondoCirculo() {
  const alfa = Math.min(1, circulo.edad / 30);
  ctx.save();
  ctx.globalAlpha = Math.max(0, alfa);

  // Todo lo de afuera queda muy oscuro
  ctx.fillStyle = "rgba(2, 0, 8, .82)";
  ctx.beginPath();
  ctx.rect(0, 0, ANCHO, ALTO);
  ctx.arc(CX, CY, RADIO + 16, 0, Math.PI * 2, true);
  ctx.fill("evenodd");

  // Adentro: negro en el centro y morado hacia el borde
  const g = ctx.createRadialGradient(CX, CY, 0, CX, CY, RADIO);
  g.addColorStop(0,    "rgba(0, 0, 0, .95)");
  g.addColorStop(0.25, "rgba(8, 0, 20, .8)");
  g.addColorStop(0.7,  "rgba(45, 10, 80, .5)");
  g.addColorStop(1,    "rgba(130, 40, 170, .45)");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(CX, CY, RADIO, 0, Math.PI * 2); ctx.fill();

  // Brazos en espiral que giran lentamente
  ctx.save();
  ctx.translate(CX, CY);
  const enRemolino = circulo.remolino > 0;
  if (enRemolino) circulo.vueltaVisual = (circulo.vueltaVisual || 0) + 0.06 * circulo.dir;
  ctx.rotate(cuadro * 0.012 + (circulo.vueltaVisual || 0));
  for (let k = 0; k < 4; k++) {
    const brillo = enRemolino ? 0.55 : 0.22;
    ctx.strokeStyle = k % 2 ? "rgba(255, 60, 172, " + brillo + ")" : "rgba(255, 179, 107, " + brillo + ")";
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let t = 0; t <= 1; t += 0.03) {
      const r = RADIO * (1 - t) + 25 * t;
      const a = k * Math.PI / 2 + t * 4.2;
      const px = Math.cos(a) * r, py = Math.sin(a) * r;
      t === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  ctx.restore();

  // Polvo que cae en espiral (más rápido cerca del centro)
  polvo.forEach(q => {
    const rapido = circulo.remolino > 0 ? 3 : 1;
    q.ang += (0.01 + 1.2 / q.rad) * rapido;
    q.rad -= (0.25 + 18 / q.rad) * rapido;
    if (q.rad < 22) { q.rad = RADIO - 5; q.ang = Math.random() * Math.PI * 2; }
    ctx.globalAlpha = alfa * Math.min(1, (q.rad - 22) / 40) * 0.8;
    ctx.fillStyle = q.color;
    ctx.fillRect(CX + Math.cos(q.ang) * q.rad, CY + Math.sin(q.ang) * q.rad, 2, 2);
  });
  ctx.globalAlpha = alfa;

  // Corazón del agujero negro con su anillo de luz
  ctx.fillStyle = "#000";
  ctx.beginPath(); ctx.arc(CX, CY, 22, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "rgba(255, 190, 120, .9)";
  ctx.shadowColor = "#ffb36b"; ctx.shadowBlur = 18;
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(CX, CY, 24, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

// Bordes de la cancha circular (se dibujan encima)
function dibujarCancha() {
  const alfa = Math.min(1, circulo.edad / 30);
  ctx.save();
  ctx.globalAlpha = Math.max(0, alfa);
  // Arco de cada jugador (su "arco" de gol), con su color
  ctx.shadowBlur = 0;
  ctx.setLineDash([6, 8]);
  ctx.lineWidth = 2;
  jugadores.forEach(p => {
    const centro = p.lado > 0 ? 0 : Math.PI;
    ctx.strokeStyle = p.color;
    ctx.beginPath(); ctx.arc(CX, CY, RADIO + 7, centro - Math.PI / 2, centro + Math.PI / 2); ctx.stroke();
  });
  ctx.setLineDash([]);
  // Paredes de arriba y abajo: el disco de fuego del agujero negro
  ctx.lineCap = "round";
  const rot = circulo.rot;
  [[16, "#b98cff", 26], [10, "#ff3cac", 20], [4, "#ffd23f", 12]].forEach(([ancho, color, brillo]) => {
    ctx.strokeStyle = color;
    ctx.shadowColor = color; ctx.shadowBlur = brillo;
    ctx.lineWidth = ancho;
    ctx.beginPath(); ctx.arc(CX, CY, RADIO + 5, rot + PHI_PARED, rot + Math.PI - PHI_PARED); ctx.stroke();
    ctx.beginPath(); ctx.arc(CX, CY, RADIO + 5, rot + Math.PI + PHI_PARED, rot + Math.PI * 2 - PHI_PARED); ctx.stroke();
  });
  // Las paredes brillan cuando la pelota rebota en ellas
  if (circulo.brillo > 0.05) {
    ctx.strokeStyle = "rgba(255, 255, 255, " + (circulo.brillo * 0.8) + ")";
    ctx.shadowColor = "#ffffff"; ctx.shadowBlur = 30 * circulo.brillo;
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(CX, CY, RADIO + 5, rot + PHI_PARED, rot + Math.PI - PHI_PARED); ctx.stroke();
    ctx.beginPath(); ctx.arc(CX, CY, RADIO + 5, rot + Math.PI + PHI_PARED, rot + Math.PI * 2 - PHI_PARED); ctx.stroke();
    ctx.shadowBlur = 0;
  }
  // Chispas que recorren las paredes
  ctx.fillStyle = "#fff6d0";
  for (let i = 0; i < 6; i++) {
    const t = ((cuadro * 0.006 + i / 6) % 1);
    const a = rot + (i % 2 ? PHI_PARED : Math.PI + PHI_PARED) + t * (Math.PI - 2 * PHI_PARED);
    ctx.beginPath(); ctx.arc(CX + Math.cos(a) * (RADIO + 3), CY + Math.sin(a) * (RADIO + 3), 2.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.shadowBlur = 0;
  ctx.lineCap = "butt";
  // Recordatorio de cómo volver
  ctx.globalAlpha = alfa;
  ctx.font = "600 14px Rubik, sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(200, 215, 255, .8)";
  ctx.fillText(circulo.remolino > 0 ? "🌀 ¡Remolino! La pelota se curva en espiral"
             : circulo.yaGiro ? "Si sale el poder ▭, te devuelve a la cancha normal"
             : "Golpea el poder 🌀 para activar el remolino", CX, ALTO - 8);
  // Escudos sobre el arco
  jugadores.forEach(p => {
    if (!p.escudo) return;
    const centro = p.lado > 0 ? 0 : Math.PI;
    ctx.strokeStyle = "rgba(255, 179, 107, " + (0.4 + Math.sin(cuadro * 0.15) * 0.2) + ")";
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(CX, CY, RADIO + 20, centro - Math.PI / 2, centro + Math.PI / 2); ctx.stroke();
  });
  ctx.restore();
}


function dibujarPaleta(p) {
  if (circulo) { dibujarPaletaCirculo(p); return; }
  if (p.esPared) { dibujarPared(p); return; }
  const color = p.congelado > 0 ? "#9fe6ff" : p.color;
  if (!p.esRobot) dibujarFormaNave(p.forma, p.x, p.y, p.w, p.h, p.lado, color);   // 🚀 adorno de la nave
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 18;
  ctx.fillStyle = color;
  rectRedondo(p.x, p.y, p.w, p.h, 7); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(255,255,255,.55)";
  rectRedondo(p.x + 4, p.y + 8, 3, p.h - 16, 2); ctx.fill();

  if (p.esRobot) {
    // Ojos del robot que miran la pelota
    const mira = Math.max(-6, Math.min(6, (pelota.y - (p.y + p.h / 2)) / 20));
    ctx.fillStyle = "#1a0033";
    ctx.beginPath(); ctx.arc(p.x + 7, p.y + p.h * 0.32 + mira, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(p.x + 7, p.y + p.h * 0.5 + mira, 4, 0, Math.PI * 2); ctx.fill();
  }
  if (p.congelado > 0) {
    ctx.fillStyle = "rgba(190, 240, 255, .35)";
    ctx.strokeStyle = "rgba(230, 250, 255, .9)";
    ctx.lineWidth = 2;
    rectRedondo(p.x - 7, p.y - 8, p.w + 14, p.h + 16, 6); ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(p.x - 7, p.y + p.h * 0.2); ctx.lineTo(p.x + 6, p.y + p.h * 0.34); ctx.lineTo(p.x + p.w + 7, p.y + p.h * 0.28);
    ctx.moveTo(p.x - 7, p.y + p.h * 0.75); ctx.lineTo(p.x + 9, p.y + p.h * 0.6);
    ctx.stroke();
  }
  ctx.restore();
}

// El cometa cambia de color con la velocidad: blanco → amarillo → rojo fuego
function colorCometa() {
  const t = Math.max(0, Math.min(1, (pelota.vel - dificultad.velInicial) / (dificultad.velMax - dificultad.velInicial)));
  const mezclar = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
  const c = t < 0.5 ? mezclar([255, 255, 255], [255, 210, 63], t * 2)
                    : mezclar([255, 210, 63], [255, 77, 46], (t - 0.5) * 2);
  return "rgb(" + c.join(",") + ")";
}

// Marcador compacto arriba: [nombre  N : N  nombre]
// En la cancha circular se parte en dos cajitas en las esquinas.
function dibujarMarcador() {
  ctx.save();
  if (modo === 3) {                 // 🎯 práctica: solo el mejor peloteo
    const w = 340, h = 46, x = ANCHO / 2 - w / 2, y = 10;
    ctx.fillStyle = "rgba(6, 10, 36, .88)";
    ctx.strokeStyle = "rgba(56, 232, 255, .45)";
    ctx.lineWidth = 1.5;
    rectRedondo(x, y, w, h, 14); ctx.fill(); ctx.stroke();
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = "600 18px Rubik, sans-serif";
    ctx.fillStyle = "#ff9a3c";
    ctx.fillText("🎯 Práctica · Mejor peloteo: " + mejorRacha, ANCHO / 2, y + h / 2 + 1);
    ctx.restore();
    return;
  }
  const izq = jugadores.find(p => p.lado < 0), der = jugadores.find(p => p.lado > 0);
  const caja = (x, y, w, h) => {
    ctx.fillStyle = "rgba(6, 10, 36, .88)";
    ctx.strokeStyle = "rgba(56, 232, 255, .45)";
    ctx.lineWidth = 1.5;
    rectRedondo(x, y, w, h, 14); ctx.fill(); ctx.stroke();
  };
  const puntoPartido = (p, x, y) => {
    if (p.puntos !== GOLES_PARA_TERMINAR - 1) return;
    ctx.font = "700 12px Fredoka, Rubik, sans-serif";
    ctx.fillStyle = "#ff9a3c";
    ctx.textAlign = "center";
    ctx.globalAlpha = 0.6 + Math.sin(cuadro * 0.15) * 0.4;
    ctx.fillText("¡PUNTO DE PARTIDO!", x, y);
    ctx.globalAlpha = 1;
  };
  ctx.textBaseline = "middle";
  if (!circulo) {
    const w = 470, h = 46, x = ANCHO / 2 - w / 2, y = 10, cy = y + h / 2;
    caja(x, y, w, h);
    ctx.font = "700 30px Fredoka, Rubik, sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.fillText(izq.puntos, ANCHO / 2 - 32, cy + 2);
    ctx.fillText(der.puntos, ANCHO / 2 + 32, cy + 2);
    ctx.fillStyle = "rgba(255,255,255,.5)";
    ctx.fillText(":", ANCHO / 2, cy);
    ctx.font = "600 17px Rubik, sans-serif";
    ctx.fillStyle = izq.color; ctx.textAlign = "right";
    ctx.fillText(izq.nombre, ANCHO / 2 - 62, cy);
    ctx.fillStyle = der.color; ctx.textAlign = "left";
    ctx.fillText(der.nombre, ANCHO / 2 + 62, cy);
    puntoPartido(izq, ANCHO / 2 - 130, y + h + 12);
    puntoPartido(der, ANCHO / 2 + 130, y + h + 12);
    dibujarReloj(ANCHO / 2, y + h + 22);
  } else {
    [izq, der].forEach(p => {
      const w = 190, h = 44, x = p.lado < 0 ? 14 : ANCHO - 14 - w, y = 62, cy = y + h / 2;
      caja(x, y, w, h);
      ctx.font = "700 28px Fredoka, Rubik, sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.fillText(p.puntos, p.lado < 0 ? x + 28 : x + w - 28, cy + 2);
      ctx.font = "600 16px Rubik, sans-serif";
      ctx.fillStyle = p.color;
      ctx.textAlign = p.lado < 0 ? "left" : "right";
      ctx.fillText(p.nombre, p.lado < 0 ? x + 54 : x + w - 54, cy);
      puntoPartido(p, x + w / 2, y + h + 12);
    });
    dibujarReloj(ANCHO / 2, 20);
  }
  ctx.restore();
}

// Cajita abajo a la derecha: peloteo actual y barra de velocidad del cometa
function dibujarBarraAbajo() {
  const w = 250, h = 34, x = ANCHO - w - 12, y = ALTO - h - 12;
  ctx.save();
  ctx.fillStyle = "rgba(6, 10, 36, .8)";
  ctx.strokeStyle = "rgba(56, 232, 255, .35)";
  ctx.lineWidth = 1.5;
  rectRedondo(x, y, w, h, 12); ctx.fill(); ctx.stroke();
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.font = "600 17px Rubik, sans-serif";
  ctx.fillStyle = "#e8e6ff";
  ctx.fillText("Peloteo " + golpes, x + 14, y + h / 2 + 1);
  // Barra de velocidad: se llena y cambia de color como el cometa
  const bx = x + 118, bw = 118, bh = 10, by = y + h / 2 - bh / 2;
  const t = Math.max(0, Math.min(1, pelota.vel / dificultad.velMax));
  ctx.fillStyle = "rgba(255,255,255,.12)";
  rectRedondo(bx, by, bw, bh, 5); ctx.fill();
  ctx.fillStyle = colorCometa();
  rectRedondo(bx, by, Math.max(bh, bw * t), bh, 5); ctx.fill();
  ctx.restore();
}

// ⏱ Reloj del contrarreloj (se pone rojo en los últimos 10 segundos)
function dibujarReloj(x, y) {
  if (!contrarreloj || modo === 3) return;
  const seg = Math.ceil(Math.max(0, tiempoRestante) / 60);
  const texto = golDeOro ? "⚡ GOL DE ORO" : "⏱ " + Math.floor(seg / 60) + ":" + String(seg % 60).padStart(2, "0");
  const urgente = golDeOro || seg <= 10;
  ctx.save();
  ctx.font = "700 18px Fredoka, Rubik, sans-serif";
  const w = ctx.measureText(texto).width + 28;
  ctx.fillStyle = urgente ? "rgba(255, 60, 90, .9)" : "rgba(6, 10, 36, .88)";
  ctx.strokeStyle = urgente ? "#ff9a3c" : "rgba(56, 232, 255, .45)";
  ctx.lineWidth = 1.5;
  rectRedondo(x - w / 2, y - 15, w, 30, 12); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  if (urgente) ctx.globalAlpha = 0.75 + Math.sin(cuadro * 0.3) * 0.25;
  ctx.fillText(texto, x, y + 1);
  ctx.restore();
}

// Mesa de la cancha principal: bordes de neón, círculo central y zonas de gol
function dibujarMesa() {
  ctx.save();
  // Zonas de gol iluminadas con el color de cada jugador
  jugadores.forEach(p => {
    const x0 = p.lado < 0 ? 0 : ANCHO;
    const g = ctx.createLinearGradient(x0, 0, x0 - p.lado * 70, 0);
    g.addColorStop(0, hexAlfa(p.color, 0.22));
    g.addColorStop(1, hexAlfa(p.color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(p.lado < 0 ? 0 : ANCHO - 70, 0, 70, ALTO);
  });
  // Bordes de neón de arriba y abajo
  ctx.strokeStyle = "rgba(56, 232, 255, .6)";
  ctx.shadowColor = "#38e8ff"; ctx.shadowBlur = 10;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 2); ctx.lineTo(ANCHO, 2);
  ctx.moveTo(0, ALTO - 2); ctx.lineTo(ANCHO, ALTO - 2);
  ctx.stroke();
  // Círculo central (morado, con un puntito naranja: los colores de COSMOBALL)
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(155, 92, 255, .35)";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(ANCHO / 2, ALTO / 2, 70, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = "rgba(255, 154, 60, .55)";
  ctx.beginPath(); ctx.arc(ANCHO / 2, ALTO / 2, 4, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
function hexAlfa(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return "rgba(" + (n >> 16) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
}

function dibujar() {
  ctx.save();
  if (temblor > 0.5) ctx.translate((Math.random() - 0.5) * temblor, (Math.random() - 0.5) * temblor);

  dibujarFondo();

  ctx.fillStyle = "rgba(56, 232, 255, " + (0.45 + Math.sin(cuadro * 0.08) * 0.2) + ")";
  for (let y = C_ARRIBA; y < C_ABAJO; y += 18) ctx.fillRect(ANCHO / 2 - 2, y, 4, 10);
  if (circulo) dibujarFondoCirculo();
  else dibujarMesa();

  // Destello en el arco donde entró el gol
  if (flashGol) {
    const a = flashGol.vida / 45;
    const x0 = flashGol.lado < 0 ? 0 : ANCHO;
    const g = ctx.createLinearGradient(x0, 0, x0 - flashGol.lado * 260, 0);
    g.addColorStop(0, hexAlfa(flashGol.color, 0.75 * a));
    g.addColorStop(1, hexAlfa(flashGol.color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(flashGol.lado < 0 ? 0 : ANCHO - 260, 0, 260, ALTO);
  }

  if (estado !== "menu") {
    dibujarMarcador();
    dibujarBarraAbajo();
  }

  agujeros.forEach(dibujarAgujero);
  poderes.forEach(dibujarPoder);
  asteroides.forEach(dibujarAsteroide);
  if (circulo) dibujarCancha();
  else jugadores.forEach(p => p.escudo && dibujarEscudo(p));

  const cometa = colorCometa();
  const enRemolino = circulo && circulo.remolino > 0;
  estela.forEach((q, i) => {
    ctx.globalAlpha = (i / estela.length) * (enRemolino ? 0.75 : 0.45);
    ctx.fillStyle = enRemolino ? (i % 2 ? "#ff9df5" : "#ffffff") : cometa;   // estela rosada en el remolino
    ctx.beginPath(); ctx.arc(q.x, q.y, pelota.r * (i / estela.length), 0, Math.PI * 2); ctx.fill();
  });
  ctx.globalAlpha = 1;

  particulas.forEach(q => {
    ctx.globalAlpha = Math.max(0, q.vida);
    ctx.fillStyle = q.color;
    ctx.fillRect(q.x, q.y, q.tam || 3, q.tam || 3);
  });
  ctx.globalAlpha = 1;

  if (estado !== "menu") jugadores.forEach(dibujarPaleta);

  if (estado === "jugando" || estado === "pausa") {
    ctx.save();
    ctx.shadowColor = cometa;
    ctx.shadowBlur = 20;
    ctx.fillStyle = cometa;
    const r = pelota.atrapada ? pelota.r * 0.7 : pelota.r;
    ctx.beginPath(); ctx.arc(pelota.x, pelota.y, r, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255,255,255,.8)";
    ctx.beginPath(); ctx.arc(pelota.x - 2.5, pelota.y - 2.5, r * 0.35, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  ctx.textAlign = "center";
  if (estado === "gol")   cartel(tituloCartel, mensaje);
  // ⭕ Cuenta regresiva al aparecer la cancha circular
  if (pausaCirculo > 0 && estado === "jugando") {
    ctx.save();
    ctx.font = "700 44px Fredoka, Rubik, sans-serif";
    const colorPausa = circulo ? "#5fffd7" : "#7fb2ff";
    ctx.fillStyle = colorPausa;
    ctx.shadowColor = colorPausa; ctx.shadowBlur = 18;
    ctx.fillText(Math.ceil(pausaCirculo / 60), pelota.x, pelota.y - 24);
    ctx.shadowBlur = 0;
    ctx.font = "600 18px Rubik, sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(circulo ? "Mueve tu nave arriba y abajo para girar por el borde"
                         : "¡Volvió la cancha normal!", CX, CY + 80);
    ctx.restore();
  }

  // 3, 2, 1 antes del saque
  if (cuentaSaque > 0 && estado === "jugando") {
    const n = Math.ceil(cuentaSaque / 35);
    const dentro = (cuentaSaque % 35) / 35;        // para que cada número "salte"
    ctx.save();
    ctx.font = "700 " + Math.round(60 + dentro * 30) + "px Fredoka, Rubik, sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.globalAlpha = 0.4 + dentro * 0.6;
    ctx.shadowColor = "#38e8ff"; ctx.shadowBlur = 20;
    ctx.fillText(n, ANCHO / 2, ALTO / 2 - 40);
    ctx.restore();
  }

  // Cuenta regresiva mientras la pelota espera el cambio de lado
  if (cambio > 0 && estado === "jugando") {
    ctx.save();
    ctx.font = "700 44px Fredoka, Rubik, sans-serif";
    ctx.fillStyle = "#ffd23f";
    ctx.shadowColor = "#ffd23f"; ctx.shadowBlur = 18;
    ctx.fillText(Math.ceil(cambio / 60), pelota.x, pelota.y - 24);

    // Flecha con el nombre encima de cada nave, para saber dónde quedó cada uno
    const rebote = Math.sin(cuadro * 0.2) * 5;
    jugadores.forEach(p => {
      const cx = p.x + p.w / 2;
      const arriba = p.y > 70;              // si la nave está muy arriba, la flecha va abajo
      const yFlecha = arriba ? p.y - 12 + rebote : p.y + p.h + 12 - rebote;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color; ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(cx, yFlecha);
      ctx.lineTo(cx - 9, yFlecha + (arriba ? -14 : 14));
      ctx.lineTo(cx + 9, yFlecha + (arriba ? -14 : 14));
      ctx.closePath(); ctx.fill();
      ctx.font = "700 16px Fredoka, Rubik, sans-serif";
      ctx.textAlign = p.lado < 0 ? "left" : "right";
      const xTexto = p.lado < 0 ? cx - 10 : cx + 10;
      ctx.fillText(p.nombre, xTexto, yFlecha + (arriba ? -22 : 34));
    });
    ctx.textAlign = "center";

    // En celular: recordar que el dedo se queda donde está
    if (esCelular) {
      ctx.shadowBlur = 0;
      ctx.font = "600 18px Rubik, sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(modo === 2 ? "¡No muevan las manos! Cada uno sigue en su mitad de la pantalla 👆"
                              : "¡No muevas la mano! Tu dedo sigue controlando tu nave 👆",
                   ANCHO / 2, ALTO - 50);
    }
    ctx.restore();
  }
  dibujarConsejo();
  if (aviso && estado === "jugando") {
    ctx.save();
    ctx.globalAlpha = Math.min(1, aviso.vida / 20);
    ctx.font = "700 26px Fredoka, Rubik, sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = aviso.color; ctx.shadowBlur = 16;
    ctx.fillText(aviso.texto, ANCHO / 2, 200);
    ctx.restore();
  }
  if (enLinea.activo) enLinea.dibujarExtra();   // 🌐 cartelito "En línea" y avisos de conexión
}

function cartel(titulo, sub) {
  ctx.save();
  ctx.fillStyle = "rgba(6, 10, 36, .78)";
  ctx.strokeStyle = "rgba(56, 232, 255, .7)";
  ctx.lineWidth = 2;
  rectRedondo(ANCHO / 2 - 300, ALTO / 2 - 70, 600, 140, 16); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "#38e8ff"; ctx.shadowBlur = 12;
  ctx.font = "700 30px Fredoka, Rubik, sans-serif";
  ctx.fillText(titulo, ANCHO / 2, ALTO / 2 - 8);
  ctx.shadowBlur = 0;
  ctx.font = "400 20px Rubik, sans-serif";
  ctx.fillText(sub, ANCHO / 2, ALTO / 2 + 32);
  ctx.restore();
}

// =====================================================================
//  BUCLE PRINCIPAL
// =====================================================================
// =====================================================================
//  CELULAR: pausa con botón, pantalla completa y aviso para girar
// =====================================================================
const botonPausa = $("botonPausa");
botonPausa.addEventListener("click", () => {
  alternarPausa();
});
// Tocar la pantalla durante la pausa también la quita
// ---------- ⏸ Menú de pausa ----------
let estadoAntesDePausa = "jugando";
function alternarPausa() {
  // 🌐 El invitado le pide la pausa al anfitrión (la pausa es para los dos)
  if (enLinea.activo && enLinea.rol === "invitado") { enLinea.pedirPausa(); return; }
  if (estado === "jugando" || estado === "gol") {
    estadoAntesDePausa = estado;          // también se puede pausar durante el cartel de gol
    estado = "pausa";
    $("pantallaPausa").classList.remove("oculta");
  } else if (estado === "pausa") reanudar();
}
function reanudar() {
  if (enLinea.activo && enLinea.rol === "invitado") { enLinea.pedirPausa(); return; }   // 🌐
  estado = estadoAntesDePausa;
  $("pantallaPausa").classList.add("oculta");
}
$("botonReanudar").addEventListener("click", reanudar);
// Si cambias de pestaña, minimizas o llega algo al celular, el juego se pausa solo
const enPartida = () => estado === "jugando" || estado === "gol";
document.addEventListener("visibilitychange", () => { if (document.hidden && enPartida()) alternarPausa(); });
window.addEventListener("blur", () => { if (enPartida()) alternarPausa(); });
$("botonReiniciar").addEventListener("click", () => { $("pantallaPausa").classList.add("oculta"); nuevaPartida(); });
$("botonSalir").addEventListener("click", () => {
  $("pantallaPausa").classList.add("oculta");
  estado = "menu";
  limpiarTodo();
  mostrarPantalla("pantallaTitulo");
});

function actualizarBotones() {
  const enJuego = estado === "jugando" || estado === "pausa" || estado === "gol";
  // Clases en el <body> para que el CSS muestre los botones ▲ ▼ solo jugando
  document.body.classList.toggle("en-juego", enJuego);
  document.body.classList.toggle("modo2", modo === 2 && !enLinea.activo);   // 🌐 en línea solo se ven mis botones
  $("grupo1").style.setProperty("--color", p1.color);
  $("grupo2").style.setProperty("--color", p2.color);
  botonPausa.classList.toggle("oculta", !enJuego);
  botonPausa.textContent = estado === "pausa" ? "▶" : "⏸";
}

// =====================================================================
//  🎵 MÚSICA DE FONDO (se genera con Web Audio, sin archivos)
//  Un bajo suave y un arpegio espacial que se repiten. Se apaga con 🔊.
// =====================================================================
let musica = null;
const ACORDES = [[220, 261.6, 329.6, 392], [174.6, 220, 261.6, 329.6],
                 [196, 246.9, 293.7, 392], [164.8, 196, 246.9, 329.6]];
function iniciarMusica() {
  if (silencio || musica) return;
  try {
    if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === "suspended") audio.resume();
    const volumen = audio.createGain();
    volumen.gain.value = 0.035;
    volumen.connect(audio.destination);
    let paso = 0, siguiente = audio.currentTime + 0.1;
    const tocar = (frec, cuando, dur, tipo, vol) => {
      const o = audio.createOscillator(), g = audio.createGain();
      o.type = tipo; o.frequency.value = frec;
      g.gain.setValueAtTime(0.0001, cuando);
      g.gain.exponentialRampToValueAtTime(vol, cuando + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, cuando + dur);
      o.connect(g).connect(volumen);
      o.start(cuando); o.stop(cuando + dur + 0.05);
    };
    // Programa las notas un poquito antes de que suenen
    const reloj = setInterval(() => {
      if (siguiente < audio.currentTime) siguiente = audio.currentTime + 0.05;   // volvió de otra pestaña
      while (siguiente < audio.currentTime + 0.5) {
        const acorde = ACORDES[Math.floor(paso / 16) % ACORDES.length];
        if (paso % 16 === 0) tocar(acorde[0] / 2, siguiente, 3.6, "sine", 0.9);     // bajo
        tocar(acorde[[0, 2, 1, 3, 2, 1, 3, 2][paso % 8]] * 2, siguiente, 0.4, "triangle", 0.35);  // arpegio
        siguiente += 0.24;
        paso++;
      }
    }, 120);
    musica = { reloj, volumen };
  } catch (e) { musica = null; }
}
function pararMusica() {
  if (!musica) return;
  clearInterval(musica.reloj);
  try { musica.volumen.gain.setTargetAtTime(0, audio.currentTime, 0.1); } catch (e) {}
  musica = null;
}

// 🔊 Botón para prender y apagar el sonido y la música (se recuerda)
const botonSonido = $("botonSonido");
function pintarBotonSonido() { botonSonido.textContent = silencio ? "🔇" : "🔊"; }
botonSonido.addEventListener("click", () => {
  silencio = !silencio;
  try { localStorage.setItem("galaxyPongSilencio", silencio ? "1" : "0"); } catch (e) {}
  pintarBotonSonido();
  if (silencio) pararMusica(); else iniciarMusica();
  sonido(660, 0.08, "triangle");
});
pintarBotonSonido();

const botonCompleta = $("botonCompleta");
const puedeCompleta = document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen;
if (!puedeCompleta) { botonCompleta.classList.add("oculta"); botonSonido.classList.add("sola"); }  // iPhone no lo permite
botonCompleta.addEventListener("click", () => {
  const raiz = document.documentElement;
  if (document.fullscreenElement || document.webkitFullscreenElement) {
    (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    return;
  }
  const pedir = raiz.requestFullscreen || raiz.webkitRequestFullscreen;
  Promise.resolve(pedir.call(raiz)).then(() => {
    // En Android intenta poner el celular horizontal
    if (screen.orientation && screen.orientation.lock) screen.orientation.lock("landscape").catch(() => {});
  }).catch(() => {});
});

$("botonSeguir").addEventListener("click", () => document.body.classList.add("sin-aviso-girar"));

// ⏱ Paso fijo: el juego SIEMPRE se actualiza 60 veces por segundo, aunque
// la pantalla dibuje 60, 90, 120 o 144 veces por segundo. Así la pelota y
// el robot van a la misma velocidad en cualquier celular o computador.
const PASO = 1000 / 60;
let ultimoTiempo = null, acumulado = 0;
function bucle(tiempo) {
  if (ultimoTiempo === null) ultimoTiempo = tiempo;
  acumulado += Math.min(250, tiempo - ultimoTiempo);   // máximo 1/4 s de golpe
  ultimoTiempo = tiempo;
  let pasos = 0;
  while (acumulado >= PASO && pasos < 5) {
    actualizar();
    acumulado -= PASO;
    pasos++;
  }
  if (pasos === 5) acumulado = 0;      // si el aparato va muy lento, no se atrasa
  if (enLinea.activo) enLinea.cadaCuadro();   // 🌐 manda/recibe lo que pasó en la cancha
  dibujar();
  actualizarBotones();
  requestAnimationFrame(bucle);
}
requestAnimationFrame(bucle);

// 🕳 Logo animado de COSMOBALL: se queda quieto si el aparato pide menos movimiento
try {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const logo = document.querySelector(".logo-agujero");
    logo.setCurrentTime(1.4);
    logo.pauseAnimations();
  }
} catch (e) { /* sin logo animado, no pasa nada */ }
