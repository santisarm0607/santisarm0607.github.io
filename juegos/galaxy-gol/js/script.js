'use strict';
/* ==========================================================================
   GALAXY GOL · js/script.js · versión 3.8
   Fútbol arcade 2D de alienígenas. Autor: David Santiago Sarmiento Salguero.

   Índice:
   1. Constantes del mundo, niveles y poderes
   2. Tablas de animaciones y sonidos (de aquí salen las guías en PDF)
   3. Elementos de la página, colores e imágenes
   4. Utilidades matemáticas
   5. Guardado en el navegador (localStorage dentro de try/catch)
   6. Logros
   7. Sonido (Web Audio API o tus propios archivos)
   8. Pantallas y menús
   9. Entrada: teclado y controles táctiles
   10. Estado de la partida y saques
   11. Movimiento de los alienígenas
   12. Balón: posesión, pases, tiros y derrapes
   13. Poderes: cápsulas, asteroides, nave y baba
   14. Inteligencia de Zorp y de los compañeros
   15. Tutorial
   16. Reglas: goles, balón nuevo y final
   17. Dibujo en el canvas
   18. Bucle principal
   19. Perfil del jugador (nombre, equipo, color y capitán)
   20. Juego en línea (1 contra 1 con PeerJS)
   21. Arranque
   ========================================================================== */

/* 1. CONSTANTES DEL MUNDO, NIVELES Y PODERES ============================== */
// La cancha se mide en "unidades" propias; luego se escala a la pantalla.
const CANCHA = { largo: 1000, ancho: 620 };
const CENTRO = { x: CANCHA.largo / 2, y: CANCHA.ancho / 2 };
const MARGEN = { x: 56, y: 36 };                 // espacio con estrellas alrededor
const VISTA = { ancho: CANCHA.largo + MARGEN.x * 2, alto: CANCHA.ancho + MARGEN.y * 2 };
const BORDE = 18;                                // césped extra fuera de las líneas
const ARCO = { boca: 180, fondo: 36, poste: 5 };
const ARCO_ARRIBA = CENTRO.y - ARCO.boca / 2;
const ARCO_ABAJO = CENTRO.y + ARCO.boca / 2;
const AREA = { fondo: 160, ancho: 400 };
const AREA_CHICA = { fondo: 58, ancho: 230 };
const PUNTO_PENAL = 110;
const RADIO_CIRCULO = 88;
const RADIO_ALIEN = 18;                          // todos los alienígenas miden lo mismo
const RADIO_BALON = 9;
const CONTACTO = RADIO_ALIEN + RADIO_BALON;
const ALCANCE_TOQUE = CONTACTO + 16;             // para pasar o tirar un balón suelto
const VEL_ALIEN = 240;                           // unidades por segundo
const VEL_CON_BALON = 0.9;                       // con el balón se corre un poco más lento
const CONTROL_MAX = 480;                         // más rápido que esto, el balón rebota
const FRICCION = 1.05;
const VEL_MAX_BALON = 1100;
const GOLES_PARA_GANAR = 5;
// Velocidad progresiva (versión 3.8): cada 30 segundos de juego el balón va
// un 4 % más rápido, hasta +24 %. Se suma a lo que ya sube con cada gol
// ("aumentoPorGol" de cada nivel). El reloj solo corre con el balón en juego.
// El tutorial no se acelera.
const ACELERACION = { cada: 30, aumento: 0.04, maximo: 0.24 };
const SEGUNDOS_MITAD = 8;
const PASO = 1 / 120;                            // la física avanza en pasos fijos
const ROLES = ['arquero', 'defensa', 'volante', 'delantero'];

// Derrape: se lanza al piso, roba el balón y luego tarda en levantarse
const DERRAPE = { velocidad: 600, freno: 6, duracion: 0.42, levantarse: 0.3, espera: 0.9 };
const DERRIBO = 0.75;                            // segundos en el piso del que pierde el balón

const POSTES = [
  { x: 0, y: ARCO_ARRIBA }, { x: 0, y: ARCO_ABAJO },
  { x: CANCHA.largo, y: ARCO_ARRIBA }, { x: CANCHA.largo, y: ARCO_ABAJO }
];

// Poderes: aparecen en cápsulas; el equipo que toca la cápsula lo lanza contra el rival
const PODER = {
  capsula: { primera: 10, cadaMin: 15, cadaMax: 22, dura: 10, radio: 16 },
  asteroides: { cantidad: 6, aviso: 0.9, entre: 0.32, radioMin: 30, radioMax: 42, crater: 10, regenera: 2.5, aturde: 1 },
  nave: { velocidad: 200, escape: 270, llegada: 430, dura: 8, alcance: RADIO_ALIEN + 16, altura: 34, ventaja: 2, huida: 150 },
  baba: { cruce: 5.5, cadaCharco: 46, radio: 36, charco: 9, desvanece: 2, agarre: 0.12, pierdeBalon: 0.4 }
};
const NOMBRES_PODER = { asteroides: 'Lluvia de asteroides', nave: 'Aficionado en nave', baba: 'Alienígena de baba' };

// La dificultad sale de la velocidad del balón y de qué tan bien juega Zorp
const NIVELES = {
  tutorial: {
    nombre: 'Tutorial', tiro: 560, aumentoPorGol: 0,
    velocidadZorp: 0.45, reaccion: 0.5, errorTiro: 60, probPase: 0, derrape: 0, buscaCapsula: 0,
    distraccion: 0, duracionDistraccion: [0.5, 1],
    arquero: { velocidad: 0.35, reaccion: 0.5 }
  },
  facil: {
    nombre: 'Fácil', tiro: 560, aumentoPorGol: 0.035,
    velocidadZorp: 0.8, reaccion: 0.34, errorTiro: 48, probPase: 0.3, derrape: 0.35, buscaCapsula: 0.4,
    distraccion: 0.2, duracionDistraccion: [0.9, 1.6],
    arquero: { velocidad: 0.7, reaccion: 0.3 }
  },
  normal: {
    nombre: 'Normal', tiro: 610, aumentoPorGol: 0.045,
    velocidadZorp: 0.9, reaccion: 0.22, errorTiro: 30, probPase: 0.5, derrape: 0.6, buscaCapsula: 0.7,
    distraccion: 0.1, duracionDistraccion: [0.6, 1.0],
    arquero: { velocidad: 0.82, reaccion: 0.2 }
  },
  dificil: {
    nombre: 'Difícil', tiro: 660, aumentoPorGol: 0.06,
    velocidadZorp: 1, reaccion: 0.12, errorTiro: 14, probPase: 0.65, derrape: 0.85, buscaCapsula: 1,
    distraccion: 0.05, duracionDistraccion: [0.45, 0.8],
    arquero: { velocidad: 0.92, reaccion: 0.13 }
  }
};
const ARQUERO_AMIGO = { velocidad: 0.85, reaccion: 0.2 };   // arquero de una persona

// Dibujos pixelados de los alienígenas (12 x 11, más una fila de pies).
// Letras: o contorno, c cuerpo, l brillo, a antena, b visor, w ojo, m boca.
const CUERPOS = {
  campo: [
    '..a......a..',
    '...o....o...',
    '...oooooo...',
    '..occcccco..',
    '.occllcccco.',
    '.ocwwccwwco.',
    '.ocwwccwwco.',
    '.occcccccco.',
    '.occcmmccco.',
    '..occcccco..',
    '...oooooo...'
  ],
  arquero: [
    '..a......a..',
    '...o....o...',
    '...oooooo...',
    '..obbbbbbo..',
    '.occllcccco.',
    '.ocwwccwwco.',
    '.ocwwccwwco.',
    '.occcccccco.',
    '.occcmmccco.',
    '..occcccco..',
    '...oooooo...'
  ],
  zorp: [
    '..a..aa..a..',
    '...o.oo.o...',
    '...oooooo...',
    '..occwwcco..',
    '.occllcccco.',
    '.ocwwccwwco.',
    '.ocwwccwwco.',
    '.occcccccco.',
    '.occmmmmcco.',
    '..occcccco..',
    '...oooooo...'
  ],
  // Capitanes que se pueden escoger en el perfil (versión 3)
  ciclope: [
    '.....aa.....',
    '.....oo.....',
    '...oooooo...',
    '..occlccco..',
    '.occwwwwcco.',
    '.occwwwwcco.',
    '.occwwwwcco.',
    '.occcccccco.',
    '.occcmmccco.',
    '..occcccco..',
    '...oooooo...'
  ],
  cuernos: [
    '.a........a.',
    '.aa......aa.',
    '..aooooooa..',
    '..occcccco..',
    '.occllcccco.',
    '.ocwwccwwco.',
    '.ocwwccwwco.',
    '.occcccccco.',
    '.occcmmccco.',
    '..occcccco..',
    '...oooooo...'
  ],
  corona: [
    '...a.aa.a...',
    '...aaaaaa...',
    '...oooooo...',
    '..occcccco..',
    '.occllcccco.',
    '.ocwwccwwco.',
    '.ocwwccwwco.',
    '.occcccccco.',
    '.occcmmccco.',
    '..occcccco..',
    '...oooooo...'
  ]
};
const PIES = {
  normal: '..oo....oo..',
  pasoA: '.oo.....oo..',
  pasoB: '..oo.....oo.',
  patadaDer: '..oo.....ooo',
  patadaIzq: 'ooo.....oo..'
};
// Dónde están los ojos de cada dibujo (columna, fila, alto) para mover las pupilas
const OJOS = {
  campo: [[3, 5, 2], [7, 5, 2]],
  arquero: [[3, 5, 2], [7, 5, 2]],
  zorp: [[3, 5, 2], [7, 5, 2], [5, 3, 1]],
  ciclope: [[5, 4, 2]],
  cuernos: [[3, 5, 2], [7, 5, 2]],
  corona: [[3, 5, 2], [7, 5, 2]]
};

// Capitanes del perfil: el capitán es el delantero de tu equipo.
// "cuerpo" es el dibujo de la tabla CUERPOS que se usa.
const CAPITANES = {
  cometa: { nombre: 'Cometa', cuerpo: 'campo', detalle: 'Dos ojos y dos antenas' },
  ciclope: { nombre: 'Cíclope', cuerpo: 'ciclope', detalle: 'Un solo ojo gigante' },
  cuernos: { nombre: 'Cuernitos', cuerpo: 'cuernos', detalle: 'Cuernos en vez de antenas' },
  corona: { nombre: 'Corona', cuerpo: 'corona', detalle: 'Corona de rey galáctico' },
  zorp: { nombre: 'Zorp', cuerpo: 'zorp', detalle: 'Tres ojos (solo para el equipo de Zorp)' }
};
const CAPITANES_PERFIL = ['cometa', 'ciclope', 'cuernos', 'corona'];

// Colores de equipo: cada uno usa 3 variables de :root (base, -oscuro y -claro)
const COLORES_EQUIPO = {
  celeste: { nombre: 'Celeste', variable: 'cometa' },
  rosado: { nombre: 'Rosado', variable: 'zorp' },
  naranja: { nombre: 'Naranja', variable: 'naranja' },
  morado: { nombre: 'Morado', variable: 'morado' },
  rojo: { nombre: 'Rojo', variable: 'rojo' }
};

// Perfiles por defecto. El tuyo se cambia en la pantalla "Tu perfil".
const PERFIL_INICIAL = { nombre: '', equipo: '', color: 'celeste', capitan: 'cometa' };
const PERFIL_ZORP = { nombre: 'Zorp', equipo: 'Zorp', color: 'rosado', capitan: 'zorp' };
const PERFIL_J2 = { nombre: '', equipo: '', color: 'rosado', capitan: 'cuernos' };   // versión 3.9: el jugador 2 también escoge

/* 2. TABLAS DE ANIMACIONES Y SONIDOS ====================================== */
// Cada animación: cuántos cuadros tiene, a cuántos cuadros por segundo va y
// el tamaño del dibujo en "píxeles de arte" (la guía recomienda exportar ×4).
const ESCALA_ARTE = 4;
const ANIMACIONES = {
  // Personajes (los 5 personajes tienen estas 7 animaciones)
  quieto: { cuadros: 2, fps: 3, arte: [12, 12], que: 'Parado: sube y baja 1 píxel, como si respirara.' },
  correr: { cuadros: 4, fps: 10, arte: [12, 12], que: 'Corriendo: los pies se alternan y el cuerpo rebota.' },
  patear: { cuadros: 2, fps: 12, arte: [12, 12], que: 'Pase o tiro: estira un pie hacia adelante.' },
  derrapar: { cuadros: 2, fps: 10, arte: [12, 12], que: 'Derrape: acostado en el piso, deslizándose.' },
  caer: { cuadros: 2, fps: 4, arte: [12, 12], que: 'En el piso con ojos en X (derribado o golpeado).' },
  resbalar: { cuadros: 2, fps: 6, arte: [12, 12], que: 'Sobre un charco de baba: se tambalea de lado a lado.' },
  celebrar: { cuadros: 2, fps: 5, arte: [12, 12], que: 'Gol de su equipo: salta.' },
  // Objetos
  'balon-girar': { cuadros: 4, fps: 12, arte: [8, 8], que: 'El balón rodando (las manchas giran).' },
  'capsula-asteroides': { cuadros: 2, fps: 3, arte: [10, 16], que: 'Cápsula del poder de asteroides, flotando.' },
  'capsula-nave': { cuadros: 2, fps: 3, arte: [10, 16], que: 'Cápsula del poder del aficionado, flotando.' },
  'capsula-baba': { cuadros: 2, fps: 3, arte: [10, 16], que: 'Cápsula del poder de baba, flotando.' },
  'asteroide-caer': { cuadros: 3, fps: 12, arte: [10, 10], que: 'Roca en llamas que cae girando.' },
  crater: { cuadros: 3, fps: 0, arte: [24, 24], que: 'Cuadro 1: impacto. Cuadro 2: hueco. Cuadro 3: regenerándose.' },
  'nave-aficionado': { cuadros: 2, fps: 6, arte: [20, 14], que: 'Mini nave con el aficionado saludando; las luces parpadean.' },
  'babosa-caminar': { cuadros: 4, fps: 8, arte: [16, 12], que: 'Alienígena de baba avanzando (se estira y se encoge).' },
  'charco-baba': { cuadros: 2, fps: 3, arte: [24, 16], que: 'Charco de baba que burbujea.' },
  'polvo-derrape': { cuadros: 3, fps: 15, arte: [6, 6], que: 'Nubecita de polvo que deja el derrape.' },
  'estrellas-mareo': { cuadros: 4, fps: 10, arte: [12, 6], que: 'Estrellitas que giran sobre la cabeza del derribado.' },
  'pregunta-zorp': { cuadros: 2, fps: 2, arte: [6, 6], que: 'Burbuja "?" cuando un alienígena de Zorp se distrae.' }
};
// Personajes: nombre del archivo → a quién representa
const PERSONAJES = {
  cometa: 'Jugador de campo celeste (tu equipo o el jugador 1)',
  'cometa-arquero': 'Arquero celeste (visera amarilla)',
  zorpiano: 'Jugador de campo rosado (equipo de Zorp o jugador 2)',
  'zorpiano-arquero': 'Arquero rosado (visera amarilla)',
  zorp: 'Zorp, capitán rosado de tres ojos y tres antenas',
  ciclope: 'Capitán Cíclope (se escoge en el perfil; toma el color de su equipo)',
  cuernos: 'Capitán Cuernitos (se escoge en el perfil; toma el color de su equipo)',
  corona: 'Capitán Corona (se escoge en el perfil; toma el color de su equipo)'
};

// ¿Hiciste tus propias animaciones? Guarda la tira como img/animaciones/NOMBRE.png
// y escribe NOMBRE aquí (por ejemplo 'cometa-correr'). El juego la usa en vez del dibujo.
const HOJAS_PROPIAS = [];

// ¿Hiciste tus propios sonidos? Guarda el archivo como sonidos/NOMBRE.mp3
// y escribe NOMBRE aquí (por ejemplo 'gol'). El juego lo usa en vez del sonido creado.
const SONIDOS_PROPIOS = [];

// Notas seguidas (para melodías): cada nota dura "duracion" segundos
const melodia = (notas, duracion, opciones = {}) =>
  notas.map((f, i) => ({ f, dur: duracion * 1.1, retraso: i * duracion, ...opciones }));

// Efectos de sonido. Cada capa es un tono (f = frecuencia en Hz, hasta = a dónde
// baja o sube) o un ruido. "dur" y "retraso" van en segundos.
const EFECTOS = {
  // Balón y jugadas
  control: { grupo: 'Balón y jugadas', que: 'Tomar el balón', cuando: 'Un alienígena recibe o recoge el balón y se lo queda.', capas: [{ f: 320, hasta: 440, dur: 0.05, onda: 'triangle', vol: 0.12 }] },
  pase: { grupo: 'Balón y jugadas', que: 'Pase', cuando: 'Alguien pasa el balón a un compañero.', capas: [{ f: 620, dur: 0.05, onda: 'triangle', vol: 0.22 }, { f: 930, dur: 0.07, onda: 'triangle', vol: 0.22, retraso: 0.05 }] },
  tiro: { grupo: 'Balón y jugadas', que: 'Tiro al arco', cuando: 'Alguien patea fuerte con el botón Tirar.', capas: [{ f: 260, hasta: 60, dur: 0.16, vol: 0.28 }, { ruido: true, dur: 0.07, vol: 0.12 }] },
  patada: { grupo: 'Balón y jugadas', que: 'Patada a balón suelto', cuando: 'Un derrape golpea un balón suelto o el arquero despeja.', capas: [{ f: 180, hasta: 70, dur: 0.08, vol: 0.22 }] },
  derrape: { grupo: 'Balón y jugadas', que: 'Derrape', cuando: 'Alguien se lanza al piso para quitar el balón.', capas: [{ ruido: true, dur: 0.32, vol: 0.13 }, { f: 160, hasta: 70, dur: 0.3, onda: 'sawtooth', vol: 0.05 }] },
  robo: { grupo: 'Balón y jugadas', que: 'Balón robado', cuando: 'Un derrape le quita el balón a un rival.', capas: [{ f: 110, hasta: 50, dur: 0.14, vol: 0.26 }, { ruido: true, dur: 0.08, vol: 0.14 }] },
  caida: { grupo: 'Balón y jugadas', que: 'Caída', cuando: 'Un alienígena queda en el piso (derribado o golpeado por un asteroide).', capas: [{ f: 520, hasta: 130, dur: 0.3, onda: 'triangle', vol: 0.14 }] },
  rebote: { grupo: 'Balón y jugadas', que: 'Rebote', cuando: 'El balón choca rápido con la banda, el fondo, un cráter o un alienígena.', capas: [{ f: 320, dur: 0.03, vol: 0.06 }] },
  poste: { grupo: 'Balón y jugadas', que: 'Balón en el poste', cuando: 'El balón pega en un palo del arco.', capas: [{ f: 1250, hasta: 900, dur: 0.14, onda: 'triangle', vol: 0.16 }] },
  atajada: { grupo: 'Balón y jugadas', que: 'Atajada', cuando: 'El arquero atrapa el balón.', capas: [{ f: 150, hasta: 90, dur: 0.12, vol: 0.22 }] },
  cambio: { grupo: 'Balón y jugadas', que: 'Cambio de alienígena', cuando: 'Sin uso desde la versión 3.2 (el cambio de alienígena es automático). Se deja por si lo quieres usar.', capas: [{ f: 440, dur: 0.05, vol: 0.07 }] },
  'no-valido': { grupo: 'Balón y jugadas', que: 'Acción no permitida', cuando: 'Sueltas Patear sin el balón cerca, o Derrapas mientras te levantas.', capas: [{ f: 140, dur: 0.06, vol: 0.06 }] },
  // Poderes
  capsula: { grupo: 'Poderes', que: 'Aparece una cápsula', cuando: 'Sale una cápsula de poder en la cancha.', capas: melodia([880, 1175, 1568], 0.05, { onda: 'triangle', vol: 0.1 }) },
  poder: { grupo: 'Poderes', que: 'Poder activado', cuando: 'Alguien toca una cápsula.', capas: [{ f: 330, hasta: 990, dur: 0.35, vol: 0.12 }] },
  asteroide: { grupo: 'Poderes', que: 'Asteroide cayendo', cuando: 'Cada asteroide empieza a caer (silbido que baja).', capas: [{ f: 1400, hasta: 300, dur: 0.75, onda: 'sine', vol: 0.07 }] },
  impacto: { grupo: 'Poderes', que: 'Impacto de asteroide', cuando: 'Un asteroide choca y deja un hueco.', capas: [{ ruido: true, dur: 0.35, vol: 0.3 }, { f: 90, hasta: 40, dur: 0.3, onda: 'sine', vol: 0.3 }] },
  regenerar: { grupo: 'Poderes', que: 'Hueco regenerado', cuando: 'Un cráter termina de cerrarse y la cancha queda como estaba.', capas: melodia([523, 659], 0.07, { onda: 'triangle', vol: 0.06 }) },
  nave: { grupo: 'Poderes', que: 'Llega la nave del aficionado', cuando: 'Se activa el poder del aficionado.', capas: [{ f: 520, hasta: 760, dur: 0.18, onda: 'sine', vol: 0.12 }, { f: 760, hasta: 520, dur: 0.18, onda: 'sine', vol: 0.12, retraso: 0.18 }, { f: 520, hasta: 760, dur: 0.18, onda: 'sine', vol: 0.12, retraso: 0.36 }] },
  'nave-roba': { grupo: 'Poderes', que: 'La nave se lleva el balón', cuando: 'El rayo de la nave atrapa el balón.', capas: [{ f: 1200, hasta: 400, dur: 0.2, vol: 0.1 }] },
  'nave-atrapada': { grupo: 'Poderes', que: 'Alcanzas la nave', cuando: 'Un alienígena alcanza la nave y recupera el balón.', capas: melodia([523, 784], 0.09, { vol: 0.14 }) },
  baba: { grupo: 'Poderes', que: 'Paso de la babosa', cuando: 'El alienígena de baba deja un charco.', capas: [{ f: 210, hasta: 120, dur: 0.12, onda: 'sine', vol: 0.18 }] },
  resbalon: { grupo: 'Poderes', que: 'Resbalón', cuando: 'Un alienígena pisa un charco de baba o pierde el balón resbalando.', capas: [{ f: 700, hasta: 220, dur: 0.25, onda: 'triangle', vol: 0.1 }] },
  // Partida
  cuenta: { grupo: 'Partida', que: 'Cuenta regresiva', cuando: 'El 3, 2, 1 antes de empezar.', capas: [{ f: 520, dur: 0.08, vol: 0.1 }] },
  silbato: { grupo: 'Partida', que: 'Silbato', cuando: 'Arranca el juego después de un saque.', capas: [{ f: 2100, dur: 0.16, vol: 0.05 }, { f: 2250, dur: 0.22, vol: 0.05, retraso: 0.18 }] },
  gol: { grupo: 'Partida', que: 'Gol', cuando: 'Gol de tu equipo (o de cualquiera con 2 jugadores).', capas: [...melodia([523, 659, 784, 1047], 0.09, { vol: 0.18 }), { ruido: true, dur: 0.45, vol: 0.07, retraso: 0.36 }] },
  'gol-rival': { grupo: 'Partida', que: 'Gol de Zorp', cuando: 'Zorp te hace un gol.', capas: melodia([392, 330, 262], 0.12, { onda: 'triangle', vol: 0.2 }) },
  'balon-nuevo': { grupo: 'Partida', que: 'Balón nuevo', cuando: 'El balón no cruzó la mitad en 8 segundos.', capas: [{ f: 330, dur: 0.09, vol: 0.1 }, { f: 330, dur: 0.09, vol: 0.1, retraso: 0.16 }] },
  victoria: { grupo: 'Partida', que: 'Victoria', cuando: 'Termina la partida y ganaste (o ganó alguien con 2 jugadores).', capas: melodia([523, 659, 784, 659, 784, 1047, 1047], 0.13, { vol: 0.18 }) },
  derrota: { grupo: 'Partida', que: 'Derrota', cuando: 'Termina la partida y ganó Zorp.', capas: melodia([392, 370, 349, 330, 262], 0.18, { onda: 'triangle', vol: 0.2 }) },
  logro: { grupo: 'Partida', que: 'Logro desbloqueado', cuando: 'Ganas un logro en medio del partido.', capas: melodia([784, 988, 1319], 0.07, { onda: 'triangle', vol: 0.16 }) },
  'tutorial-paso': { grupo: 'Partida', que: 'Paso del tutorial cumplido', cuando: 'Completas un paso del tutorial.', capas: melodia([784, 1047], 0.08, { onda: 'triangle', vol: 0.14 }) },
  // En línea (versión 3)
  conectado: { grupo: 'En línea', que: 'Rival conectado', cuando: 'Tu amigo entra a tu sala, o tú entras a la suya.', capas: melodia([659, 880, 1319], 0.07, { onda: 'triangle', vol: 0.14 }) },
  desconectado: { grupo: 'En línea', que: 'Conexión perdida', cuando: 'Tu rival sale de la partida o se corta internet.', capas: melodia([523, 392, 262], 0.1, { onda: 'triangle', vol: 0.14 }) },
  // Menús
  menu: { grupo: 'Menús', que: 'Botón del menú', cuando: 'Tocas un botón para cambiar de pantalla.', capas: [{ f: 660, dur: 0.04, onda: 'triangle', vol: 0.08 }] }
};

/* 3. ELEMENTOS DE LA PÁGINA, COLORES E IMÁGENES =========================== */
const $ = (selector) => document.querySelector(selector);

const dom = {
  pantallas: document.querySelectorAll('.pantalla'),
  partida: $('#pantalla-partida'),
  pausa: $('#pantalla-pausa'),
  final: $('#pantalla-final'),
  tituloPartida: $('#titulo-partida'),
  canvas: $('#cancha'),
  zona: $('#zona-cancha'),
  mensaje: $('#mensaje'),
  goles: [$('#goles-0'), $('#goles-1')],
  nombres: [$('#nombre-equipo-0'), $('#nombre-equipo-1')],
  marcadorEquipos: [$('#marcador-equipo-0'), $('#marcador-equipo-1')],
  pads: [$('.pad-j1'), $('.pad-j2')],
  capitanes: [$('#capitan-0'), $('#capitan-1')],
  segmentos: $('#reloj-segmentos'),
  botonPausa: $('#boton-pausa'),
  botonSonido: $('#boton-sonido'),
  botonPantalla: $('#boton-pantalla'),
  botonPantallaMenu: $('#boton-pantalla-menu'),   // el mismo, pero en los menús (versión 3.7)
  iconoSonido: $('#icono-sonido'),
  botonContinuar: $('#boton-continuar'),
  resumenPausa: $('#resumen-pausa'),
  tituloFinal: $('#titulo-final'),
  textoFinal: $('#texto-final'),
  imagenFinal: $('#imagen-final'),
  botonOtraVez: $('#boton-otra-vez'),
  logrosFinal: $('#logros-final'),
  listaLogrosFinal: $('#lista-logros-final'),
  listaLogros: $('#lista-logros'),
  contadorLogros: $('#contador-logros'),
  listaMejores: $('#lista-mejores'),               // pantalla Récords (versión 3.8)
  listaHistorial: $('#lista-historial'),
  resumenRecords: $('#resumen-records'),
  sinPartidos: $('#sin-partidos'),
  botonReiniciarRecords: $('#boton-reiniciar-records'),
  puntajeFinal: $('#puntaje-final'),
  tutorial: $('#tutorial'),
  tutorialPaso: $('#tutorial-paso'),
  tutorialTexto: $('#tutorial-texto'),
  tutorialSaltar: $('#tutorial-saltar'),
  avisoGol: $('#aviso-gol'),
  aviso: $('#aviso'),
  notificaciones: $('#notificaciones')
};
const ctx = dom.canvas.getContext('2d');

// Rutas de las imágenes que cambia el código
const IMAGENES = {
  medalla: 'img/medalla.svg',
  candado: 'img/candado.svg',
  zorp: 'img/zorp.svg',
  zorpTriste: 'img/zorp-triste.svg',
  cometa: 'img/cometa.svg',
  sonido: 'img/icono-sonido.svg',
  silencio: 'img/icono-silencio.svg'
};

// Los colores viven en :root (css/style.css); aquí solo se leen para el canvas.
const COLORES = {};
let FUENTE_TITULO = 'sans-serif';
let FUENTE_TEXTO = 'sans-serif';
function leerColores() {
  const css = getComputedStyle(document.documentElement);
  const nombres = [
    'cesped-1', 'cesped-2', 'borde-cancha', 'linea', 'red', 'poste', 'sombra',
    'cometa', 'cometa-oscuro', 'cometa-claro', 'zorp', 'zorp-oscuro', 'zorp-claro',
    'antena', 'visor', 'ojo', 'pupila', 'boca', 'balon', 'balon-brillo', 'balon-mancha',
    'franja-1', 'franja-2', 'franja-3', 'franja-4', 'texto', 'espacio', 'foco',
    'baba', 'baba-oscuro', 'charco', 'crater', 'crater-borde', 'roca', 'roca-oscura', 'fuego',
    'nave', 'nave-oscura', 'nave-cupula', 'rayo', 'polvo', 'aviso-impacto',
    'naranja', 'naranja-oscuro', 'naranja-claro', 'morado', 'morado-oscuro', 'morado-claro',
    'rojo', 'rojo-oscuro', 'rojo-claro'
  ];
  for (const nombre of nombres) COLORES[nombre] = css.getPropertyValue('--' + nombre).trim();
  FUENTE_TITULO = css.getPropertyValue('--fuente-titulo').trim() || 'sans-serif';
  FUENTE_TEXTO = css.getPropertyValue('--fuente-texto').trim() || 'sans-serif';
}

// Colores de cada equipo en la partida (según el color escogido en el perfil).
// tono: '' (base), 'oscuro' o 'claro'.
function colorDe(equipo, tono = '') {
  const nombre = juego.colores[equipo] || (equipo === 0 ? 'celeste' : 'rosado');
  const variable = COLORES_EQUIPO[nombre].variable;
  return COLORES[tono ? `${variable}-${tono}` : variable];
}

// Letras de los dibujos pixelados → color, para un color de equipo
function coloresCuerpo(nombreColor) {
  const variable = (COLORES_EQUIPO[nombreColor] || COLORES_EQUIPO.celeste).variable;
  return {
    o: COLORES[`${variable}-oscuro`], c: COLORES[variable], l: COLORES[`${variable}-claro`],
    a: COLORES.antena, b: COLORES.visor, w: COLORES.ojo, m: COLORES.boca
  };
}

// ¿La persona pidió "reducir movimiento" en su sistema?
const consultaMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)');
let reducirMovimiento = consultaMovimiento.matches;
consultaMovimiento.addEventListener?.('change', (e) => { reducirMovimiento = e.matches; });

/* 4. UTILIDADES MATEMÁTICAS =============================================== */
const limitar = (valor, min, max) => Math.max(min, Math.min(max, valor));
const distancia = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const azar = (min, max) => min + Math.random() * (max - min);

// Devuelve la dirección (largo 1) y el largo original de un vector
function normalizar(x, y) {
  const largo = Math.hypot(x, y);
  return largo > 0.0001 ? { x: x / largo, y: y / largo, l: largo } : { x: 0, y: 0, l: 0 };
}

// Distancia de un punto al segmento que va de a hasta b
function distanciaASegmento(p, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const largo2 = dx * dx + dy * dy || 1;
  const t = limitar(((p.x - a.x) * dx + (p.y - a.y) * dy) / largo2, 0, 1);
  return Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t));
}

/* 5. GUARDADO EN EL NAVEGADOR ============================================= */
// localStorage puede fallar (modo privado, permisos), por eso todo va en try/catch.
const CLAVE_LOGROS = 'galaxyGol.logros';
const CLAVE_SILENCIO = 'galaxyGol.silencio';
const CLAVE_PERFIL = 'galaxyGol.perfil';
const CLAVE_HISTORIAL = 'galaxyGol.historial';   // versión 3.8: partidos jugados (JSON)
const CLAVE_PERFILES = 'galaxyGol.perfiles';     // versión 3.9: todos los perfiles guardados (JSON)
const CLAVE_PERFIL_J2 = 'galaxyGol.perfilJ2';    // versión 3.9: último perfil del jugador 2

const almacen = {
  leer(clave, porDefecto) {
    try {
      const texto = window.localStorage.getItem(clave);
      return texto === null ? porDefecto : JSON.parse(texto);
    } catch (error) {
      return porDefecto;
    }
  },
  guardar(clave, valor) {
    try {
      window.localStorage.setItem(clave, JSON.stringify(valor));
      return true;
    } catch (error) {
      return false;
    }
  }
};

/* 6. LOGROS =============================================================== */
const LOGROS = [
  { id: 'primer-gol', nombre: 'Primer gol', descripcion: 'Marca tu primer gol contra Zorp.' },
  { id: 'victoria', nombre: 'Vencedor de Zorp', descripcion: 'Gana una partida.' },
  { id: 'arco-blindado', nombre: 'Arco blindado', descripcion: 'Gana sin recibir ni un gol.' },
  { id: 'dificil', nombre: 'Rey de la galaxia', descripcion: 'Gana una partida en nivel difícil.' },
  { id: 'tiki-taka', nombre: 'Tiki-taka espacial', descripcion: 'Haz 3 pases seguidos y termina la jugada en gol.' },
  { id: 'remontada', nombre: 'Remontada cósmica', descripcion: 'Gana después de ir perdiendo por 2 goles.' },
  { id: 'relampago', nombre: 'Gol relámpago', descripcion: 'Marca menos de 6 segundos después de un saque.' }
];

const guardados = almacen.leer(CLAVE_LOGROS, []);
const logrosGanados = new Set(Array.isArray(guardados) ? guardados : []);

// Desbloquea un logro (solo cuenta jugando 1 jugador contra Zorp, no en el tutorial).
// Al final del partido no se muestra aviso flotante: la pantalla final ya los lista.
function desbloquear(id, avisar = true) {
  if (juego.modo !== '1j' || juego.tutorial || logrosGanados.has(id)) return;
  const logro = LOGROS.find((l) => l.id === id);
  if (!logro) return;
  logrosGanados.add(id);
  almacen.guardar(CLAVE_LOGROS, [...logrosGanados]);
  juego.logrosNuevos.push(logro);
  if (!avisar) return;
  sonido.tocar('logro');
  notificar(`Logro: ${logro.nombre}`);
  anunciar(`Logro desbloqueado: ${logro.nombre}.`);
}

// Pinta la lista de la pantalla "Logros"
function pintarLogros() {
  dom.listaLogros.replaceChildren();
  for (const logro of LOGROS) {
    const ganado = logrosGanados.has(logro.id);
    const item = document.createElement('li');
    item.className = ganado ? 'logro ganado' : 'logro';

    const imagen = document.createElement('img');
    imagen.src = ganado ? IMAGENES.medalla : IMAGENES.candado;
    imagen.alt = ganado ? 'Desbloqueado' : 'Bloqueado';
    imagen.width = 80;
    imagen.height = 80;

    const texto = document.createElement('div');
    const titulo = document.createElement('h3');
    titulo.textContent = logro.nombre;
    const descripcion = document.createElement('p');
    descripcion.textContent = logro.descripcion;
    texto.append(titulo, descripcion);

    const estado = document.createElement('span');
    estado.className = 'logro-estado';
    estado.setAttribute('aria-hidden', 'true');
    estado.textContent = ganado ? 'Listo' : 'Bloqueado';

    item.append(imagen, texto, estado);
    dom.listaLogros.append(item);
  }
  dom.contadorLogros.textContent = `Llevas ${logrosGanados.size} de ${LOGROS.length}.`;
}

/* 7. SONIDO =============================================================== */
// Los efectos se crean con osciladores (tabla EFECTOS). Si pones tus propios
// archivos en la carpeta sonidos/ y los anotas en SONIDOS_PROPIOS, se usan esos.
const sonido = {
  ctx: null,
  salida: null,
  archivos: {},
  silenciado: almacen.leer(CLAVE_SILENCIO, false) === true,

  // El navegador solo deja sonar después de que la persona toca algo
  iniciar() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const Contexto = window.AudioContext || window.webkitAudioContext;
    if (!Contexto) return;
    try {
      this.ctx = new Contexto();
      this.salida = this.ctx.createGain();
      this.salida.gain.value = 0.55;
      this.salida.connect(this.ctx.destination);
    } catch (error) {
      this.ctx = null;
    }
  },

  // Carga los archivos propios que estén anotados en SONIDOS_PROPIOS
  cargarArchivos() {
    for (const nombre of SONIDOS_PROPIOS) {
      const audio = new Audio(`sonidos/${nombre}.mp3`);
      audio.preload = 'auto';
      audio.addEventListener('canplaythrough', () => { this.archivos[nombre] = audio; }, { once: true });
    }
  },

  // Un tono simple que puede subir o bajar
  tono({ f, hasta = 0, dur, onda = 'square', vol = 0.15, retraso = 0 }) {
    const inicio = this.ctx.currentTime + retraso;
    const oscilador = this.ctx.createOscillator();
    const ganancia = this.ctx.createGain();
    oscilador.type = onda;
    oscilador.frequency.setValueAtTime(f, inicio);
    if (hasta) oscilador.frequency.exponentialRampToValueAtTime(hasta, inicio + dur);
    ganancia.gain.setValueAtTime(vol, inicio);
    ganancia.gain.exponentialRampToValueAtTime(0.0001, inicio + dur);
    oscilador.connect(ganancia).connect(this.salida);
    oscilador.start(inicio);
    oscilador.stop(inicio + dur + 0.02);
  },

  // Ruido corto (como un "chas" o la red del arco)
  ruido({ dur, vol = 0.1, retraso = 0 }) {
    const muestras = Math.floor(this.ctx.sampleRate * dur);
    const memoria = this.ctx.createBuffer(1, muestras, this.ctx.sampleRate);
    const datos = memoria.getChannelData(0);
    for (let i = 0; i < muestras; i++) datos[i] = Math.random() * 2 - 1;
    const fuente = this.ctx.createBufferSource();
    const ganancia = this.ctx.createGain();
    const inicio = this.ctx.currentTime + retraso;
    fuente.buffer = memoria;
    ganancia.gain.setValueAtTime(vol, inicio);
    ganancia.gain.exponentialRampToValueAtTime(0.0001, inicio + dur);
    fuente.connect(ganancia).connect(this.salida);
    fuente.start(inicio);
  },

  tocar(nombre) {
    red.grabar(['s', nombre]);   // en línea: el invitado también lo oye
    if (this.silenciado) return;
    const archivo = this.archivos[nombre];
    if (archivo) {
      const copia = archivo.cloneNode();
      copia.volume = 0.8;
      copia.play().catch(() => {});
      return;
    }
    if (!this.ctx || this.ctx.state !== 'running') return;
    const efecto = EFECTOS[nombre];
    if (!efecto) return;
    for (const capa of efecto.capas) {
      if (capa.ruido) this.ruido(capa);
      else this.tono(capa);
    }
  }
};

function alternarSilencio() {
  sonido.silenciado = !sonido.silenciado;
  almacen.guardar(CLAVE_SILENCIO, sonido.silenciado);
  pintarBotonSonido();
  anunciar(sonido.silenciado ? 'Sonido apagado.' : 'Sonido encendido.');
}

// ---- Pantalla completa (versión 3.6) ----
// Esconde la barra del navegador. En celulares Android, además, deja la
// pantalla acostada. En iPhone no existe para páginas web: el botón se esconde.
const elementoEnPantallaCompleta = () => document.fullscreenElement || document.webkitFullscreenElement || null;

function pantallaCompletaDisponible() {
  const raiz = document.documentElement;
  const sePuede = document.fullscreenEnabled || document.webkitFullscreenEnabled;
  return Boolean((raiz.requestFullscreen || raiz.webkitRequestFullscreen) && sePuede);
}

async function alternarPantallaCompleta() {
  const raiz = document.documentElement;
  try {
    if (elementoEnPantallaCompleta()) {
      await (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    } else {
      await (raiz.requestFullscreen || raiz.webkitRequestFullscreen).call(raiz, { navigationUI: 'hide' });
      // En celular, se intenta dejar la pantalla acostada (si el sistema lo permite)
      if (document.body.classList.contains('tactil') && screen.orientation && screen.orientation.lock) {
        screen.orientation.lock('landscape').catch(() => {});
      }
    }
  } catch (error) {
    ponerMensaje('Sin pantalla completa aquí', true, 2);
    anunciar('Este navegador no deja usar pantalla completa aquí.');
  }
}

function pintarBotonPantalla() {
  const activa = Boolean(elementoEnPantallaCompleta());
  // Los dos botones (el de la partida y el de los menús) muestran lo mismo
  for (const boton of [dom.botonPantalla, dom.botonPantallaMenu]) {
    boton.classList.toggle('activa', activa);
    boton.setAttribute('aria-pressed', String(activa));
    boton.title = activa ? 'Salir de pantalla completa' : 'Pantalla completa';
  }
}

function pintarBotonSonido() {
  dom.botonSonido.setAttribute('aria-pressed', String(sonido.silenciado));
  dom.iconoSonido.src = sonido.silenciado ? IMAGENES.silencio : IMAGENES.sonido;
}

/* 8. PANTALLAS Y MENÚS ==================================================== */
const TITULOS = {
  'pantalla-inicio': 'Galaxy Gol',
  'pantalla-controles': 'Controles · Galaxy Gol',
  'pantalla-logros': 'Logros · Galaxy Gol',
  'pantalla-records': 'Récords · Galaxy Gol',
  'pantalla-creditos': 'Créditos · Galaxy Gol',
  'pantalla-jugadores': '¿Cuántos jugadores? · Galaxy Gol',
  'pantalla-nivel': 'Elige el nivel · Galaxy Gol',
  'pantalla-perfil': 'Perfiles · Galaxy Gol',
  'pantalla-equipo': 'Prepara tu equipo · Galaxy Gol',
  'pantalla-red': 'Jugar en línea · Galaxy Gol',
  'pantalla-partida': 'Partida · Galaxy Gol'
};

// Muestra una pantalla, oculta las demás y lleva el foco a su título
function mostrarPantalla(id, enfocar = true) {
  for (const pantalla of dom.pantallas) pantalla.hidden = pantalla.id !== id;
  document.title = TITULOS[id] || 'Galaxy Gol';
  const actual = document.getElementById(id);
  if (enfocar) actual.querySelector('h1, h2')?.focus();
}

// Escribe un aviso para lectores de pantalla.
// "soloAqui": en línea, no se le manda al otro jugador.
function anunciar(texto, urgente = false, soloAqui = false) {
  if (!soloAqui) red.grabar(['a', texto, urgente]);
  const region = urgente ? dom.avisoGol : dom.aviso;
  region.textContent = '';
  window.setTimeout(() => { region.textContent = texto; }, 60);
}

// Cartelito arriba de la pantalla (los lectores reciben anunciar())
function notificar(texto) {
  const nota = document.createElement('p');
  nota.className = 'notificacion';
  const imagen = document.createElement('img');
  imagen.src = IMAGENES.medalla;
  imagen.alt = '';
  imagen.width = 80;
  imagen.height = 80;
  nota.append(imagen, document.createTextNode(texto));
  dom.notificaciones.append(nota);
  // Máximo 3 avisos a la vez
  while (dom.notificaciones.children.length > 3) dom.notificaciones.firstElementChild.remove();
  window.setTimeout(() => nota.remove(), 3200);
}

// Un solo "escuchador" atiende todos los botones de los menús
document.addEventListener('click', (evento) => {
  const boton = evento.target.closest('button');
  if (!boton) return;
  sonido.iniciar();
  const datos = boton.dataset;

  if (datos.ir) {
    if (datos.ir === 'pantalla-logros') pintarLogros();
    if (datos.ir === 'pantalla-records') pintarRecords();
    if (datos.ir === 'pantalla-perfil') pintarPerfiles();
    if (datos.salirSala !== undefined) cerrarRed();
    sonido.tocar('menu');
    mostrarPantalla(datos.ir);
  } else if (datos.modo === 'red') {
    sonido.tocar('menu');
    abrirEquipos('red');   // versión 3.9: primero se prepara el equipo y luego la sala
  } else if (datos.modo) {
    juego.modo = datos.modo;
    sonido.tocar('menu');
    if (juego.modo === '1j') {
      mostrarPantalla('pantalla-nivel');
    } else {
      juego.nivel = 'normal';
      abrirEquipos('2j');
    }
  } else if (datos.nivel) {
    juego.nivel = datos.nivel;
    sonido.tocar('menu');
    abrirEquipos('1j');
  } else if (datos.accionMenu === 'otra-vez' && juego.modo === 'red') {
    pedirRevancha();
  } else if (datos.accionMenu === 'otra-vez') {
    if (juego.terminoTutorial) {
      salirDePartida();
      mostrarPantalla('pantalla-nivel');
    } else {
      empezarPartida();
    }
  } else if (datos.accionMenu === 'inicio') {
    if (juego.modo === 'red') cerrarRed();
    salirDePartida();
    mostrarPantalla('pantalla-inicio');
  }
});

dom.botonPausa.addEventListener('click', () => pausar());
dom.botonContinuar.addEventListener('click', () => reanudar());
dom.botonSonido.addEventListener('click', (evento) => {
  alternarSilencio();
  // Con mouse o dedo el foco vuelve a la cancha para no robar teclas al juego
  if (evento.detail > 0 && !juego.pausado) dom.canvas.focus();
});
dom.botonPantalla.addEventListener('click', async (evento) => {
  await alternarPantallaCompleta();
  if (evento.detail > 0 && !juego.pausado) dom.canvas.focus();
});
dom.botonPantallaMenu.addEventListener('click', () => alternarPantallaCompleta());
for (const tipo of ['fullscreenchange', 'webkitfullscreenchange']) {
  document.addEventListener(tipo, () => {
    pintarBotonPantalla();
    ajustarCanvas();
  });
}
dom.tutorialSaltar.addEventListener('click', (evento) => {
  siguientePasoTutorial();
  if (evento.detail > 0) dom.canvas.focus();
});

function empezarPartida() {
  dom.pausa.hidden = true;
  dom.final.hidden = true;
  dom.partida.inert = false;
  juego.pausado = false;
  juego.terminoTutorial = false;
  juego.ajuste = NIVELES[juego.nivel] || NIVELES.normal;
  juego.tutorial = juego.modo === '1j' && juego.nivel === 'tutorial' ? { paso: 0, recorrido: 0, espera: 0 } : null;
  // En línea cada quien ve los controles de 1 jugador en su dispositivo
  dom.partida.dataset.modo = juego.modo === '2j' ? '2j' : '1j';
  dom.tutorial.hidden = !juego.tutorial;
  dom.botonOtraVez.hidden = false;

  const unJugador = juego.modo === '1j';
  prepararEquiposVisuales();

  mostrarPantalla('pantalla-partida', false);
  document.body.classList.add('jugando');
  ajustarCanvas();
  nuevaPartida();
  dom.tituloPartida.focus();
  if (juego.tutorial) anunciar(`Tutorial. ${PASOS_TUTORIAL[0].texto}`);
  else if (juego.modo === 'red') anunciar(`Partida en línea: ${nombreVisible(0)} contra ${nombreVisible(1)}. Juegas con el equipo ${COLORES_EQUIPO[juego.colores[red.miEquipo()]].nombre.toLowerCase()}. Gana el primero que llegue a ${GOLES_PARA_GANAR} goles.`, false, true);
  else anunciar(unJugador
    ? `Partida contra Zorp, nivel ${juego.ajuste.nombre}. Gana el primero que llegue a ${GOLES_PARA_GANAR} goles.`
    : `Partida de 2 jugadores. Gana el primero que llegue a ${GOLES_PARA_GANAR} goles.`);
}

function salirDePartida() {
  juego.estado = 'menu';
  juego.pausado = false;
  dom.pausa.hidden = true;
  dom.final.hidden = true;
  dom.partida.inert = false;
  document.body.classList.remove('jugando');
  teclas.clear();
  ponerMensaje('');
}

// "desdeRed": la pausa la pidió el otro jugador (en línea), así que no se reenvía
function pausar(desdeRed = false) {
  if (juego.pausado || dom.partida.hidden || juego.estado === 'final') return;
  juego.pausado = true;
  teclas.clear();
  cancelarCargas();
  soltarJoysticks();
  const [a, b] = juego.marcador;
  if (juego.modo === '1j') dom.resumenPausa.textContent = `Tú ${a} - ${b} Zorp · ${juego.tutorial ? 'Tutorial' : `Nivel ${juego.ajuste.nombre}`}`;
  else if (juego.modo === 'red') dom.resumenPausa.textContent = `${nombreVisible(0)} ${a} - ${b} ${nombreVisible(1)} · En línea${desdeRed ? ` · Pausó ${nombreJugador(1 - red.miEquipo())}` : ''}`;
  else dom.resumenPausa.textContent = `${nombreJugador(0)} ${a} - ${b} ${nombreJugador(1)}`;
  dom.partida.inert = true;
  dom.pausa.hidden = false;
  dom.botonContinuar.focus();
  anunciar(desdeRed ? `${nombreJugador(1 - red.miEquipo())} pausó el juego.` : 'Juego en pausa.', false, true);
  if (juego.modo === 'red' && !desdeRed) red.enviar({ t: 'pausa' });
}

function reanudar(desdeRed = false) {
  if (!juego.pausado) return;
  if (juego.modo === 'red' && !desdeRed) red.enviar({ t: 'seguir' });
  juego.pausado = false;
  dom.pausa.hidden = true;
  dom.partida.inert = false;
  dom.canvas.focus();
}

function alternarPausa() {
  if (juego.pausado) reanudar();
  else pausar();
}

/* 9. ENTRADA: TECLADO Y CONTROLES TÁCTILES ================================ */
// Teclas de cada jugador (e.code, o sea, la tecla física: funciona igual en
// teclado español, latinoamericano o en inglés).
// Versión 3.4: pasar y tirar son UN solo botón, Patear:
//  · un toque corto (menos de 0,18 s) pasa;
//  · mantenerlo carga el tiro: al soltar sale más fuerte cuanto más lo mantuviste
//    (carga llena en 1 s; a los 1,25 s tira solo).
// Versión 3.2: ya no hay tecla Cambiar. Siempre manejas al alienígena de tu
// equipo más cercano al balón (ver cambioAutomatico, sección 12).
const CONTROLES = [
  {
    // Jugador 1: mano izquierda en W A S D; F patea y G derrapa
    arriba: ['KeyW'], abajo: ['KeyS'], izquierda: ['KeyA'], derecha: ['KeyD'],
    patear: ['KeyF'], derrapar: ['KeyG']
  },
  {
    // Jugador 2: mano derecha en las flechas; Ñ patea y el punto derrapa
    // (Semicolon es la Ñ en teclado latinoamericano)
    arriba: ['ArrowUp'], abajo: ['ArrowDown'], izquierda: ['ArrowLeft'], derecha: ['ArrowRight'],
    patear: ['Semicolon'], derrapar: ['Period']
  }
];
const BOTONES = ['patear', 'derrapar'];             // lo que se aprieta
const ACCIONES = ['pasar', 'tirar', 'derrapar'];     // lo que hace el alienígena
const CARGA = { toque: 0.18, llena: 1, maxima: 1.25 };   // segundos
const cargas = [null, null];   // tiro cargándose de cada jugador de este aparato
const teclas = new Set();
const TECLAS_JUEGO = new Set([...CONTROLES.flatMap((c) => Object.values(c).flat()), 'KeyP', 'Space', 'KeyM']);

const enPartida = () => !dom.partida.hidden;

document.addEventListener('keydown', (evento) => {
  const codigo = evento.code;

  // Silencio funciona en cualquier pantalla
  if (codigo === 'KeyM' && !evento.repeat) {
    alternarSilencio();
    return;
  }

  // Menús: Esc vuelve atrás
  if (!enPartida()) {
    if (codigo === 'Escape') {
      const visible = [...dom.pantallas].find((p) => !p.hidden);
      visible?.querySelector('[data-volver]')?.click();
    }
    return;
  }

  // Ventana de pausa abierta
  if (juego.pausado) {
    if ((codigo === 'KeyP' || codigo === 'Escape') && !evento.repeat) {
      evento.preventDefault();
      reanudar();
    }
    return;
  }
  if (juego.estado === 'final') return;

  // Si el foco está en un botón, Enter y Espacio activan ese botón
  const enBoton = evento.target instanceof Element && evento.target.closest('button');
  if (enBoton && (codigo === 'Enter' || codigo === 'NumpadEnter' || codigo === 'Space')) return;

  if (TECLAS_JUEGO.has(codigo)) evento.preventDefault();
  if (codigo === 'Escape') {
    pausar();
    return;
  }
  teclas.add(codigo);
  if (evento.repeat) return;

  if (codigo === 'KeyP' || codigo === 'Space') {
    alternarPausa();
    return;
  }
  CONTROLES.forEach((teclasJugador, j) => {
    for (const boton of BOTONES) {
      if (!teclasJugador[boton].includes(codigo)) continue;
      const jugador = j === 1 && juego.modo !== '2j' ? 0 : j;
      if (boton === 'patear') empezarCarga(jugador);
      else accionLocal(jugador, boton);
      encenderGuia(jugador, boton, codigo);
    }
  });
});

document.addEventListener('keyup', (evento) => {
  teclas.delete(evento.code);
  apagarGuia(evento.code);
  // Al soltar Patear sale el pase o el tiro
  CONTROLES.forEach((teclasJugador, j) => {
    if (teclasJugador.patear.includes(evento.code)) soltarCarga(j === 1 && juego.modo !== '2j' ? 0 : j);
  });
  if (enPartida() && evento.code === 'Space' && !evento.target.closest?.('button')) evento.preventDefault();
});

// ---- Guía de botones (esquina inferior derecha) ----
// Muestra las teclas de Pasar, Tirar y Derrapar y se ilumina mientras se aprietan.
const guiaEncendida = new Map();   // tecla → elemento iluminado

function encenderGuia(jugador, tipo, codigo) {
  const elemento = document.querySelector(`.guia-jugador[data-jugador="${jugador}"] [data-accion="${tipo}"]`);
  if (!elemento) return;
  elemento.classList.add('activa');
  guiaEncendida.set(codigo, elemento);
}

function apagarGuia(codigo = null) {
  if (codigo === null) {
    for (const elemento of guiaEncendida.values()) elemento.classList.remove('activa');
    guiaEncendida.clear();
    return;
  }
  const elemento = guiaEncendida.get(codigo);
  if (!elemento) return;
  guiaEncendida.delete(codigo);
  // Si otra tecla sigue apretando la misma acción, se queda encendida
  if (![...guiaEncendida.values()].includes(elemento)) elemento.classList.remove('activa');
}

// ---- Patear: toque = pase, mantener = tiro con fuerza ----
function empezarCarga(jugador) {
  if (cargas[jugador] || juego.estado !== 'jugando' || juego.pausado) return;
  cargas[jugador] = { inicio: performance.now() };
}

// Cuánto lleva cargado (0 a 1), o null si no está apretando Patear
function nivelCarga(jugador) {
  const c = cargas[jugador];
  if (!c) return null;
  const segundos = (performance.now() - c.inicio) / 1000;
  return limitar((segundos - CARGA.toque) / (CARGA.llena - CARGA.toque), 0, 1);
}

function soltarCarga(jugador) {
  const c = cargas[jugador];
  if (!c) return;
  cargas[jugador] = null;
  const segundos = (performance.now() - c.inicio) / 1000;
  if (segundos < CARGA.toque) accionLocal(jugador, 'pasar');
  else accionLocal(jugador, 'tirar', nivelDe(segundos));
}

const nivelDe = (segundos) => limitar((segundos - CARGA.toque) / (CARGA.llena - CARGA.toque), 0, 1);

function cancelarCargas() {
  cargas[0] = null;
  cargas[1] = null;
}

// Cada cuadro: si alguien mantiene Patear demasiado, el tiro sale solo,
// y la guía muestra cuánto va cargado
function revisarCargas() {
  for (const jugador of [0, 1]) {
    const c = cargas[jugador];
    if (c && (juego.estado !== 'jugando' || juego.pausado)) cargas[jugador] = null;
    else if (c && (performance.now() - c.inicio) / 1000 >= CARGA.maxima) soltarCarga(jugador);
    const nivel = nivelCarga(jugador);
    const guia = document.querySelector(`.guia-jugador[data-jugador="${jugador}"] [data-accion="patear"]`);
    const pasos = nivel === null ? '0' : String(Math.ceil(nivel * 5));
    if (guia && guia.dataset.nivel !== pasos) guia.dataset.nivel = pasos;
  }
}

// Si la ventana pierde el foco o se cambia de pestaña, se pausa
window.addEventListener('blur', () => {
  teclas.clear();
  apagarGuia();
  cancelarCargas();
  if (enPartida() && juego.estado !== 'final') pausar();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && enPartida() && juego.estado !== 'final') pausar();
});

// ---- Controles táctiles ----
const joystick = [{ x: 0, y: 0 }, { x: 0, y: 0 }];
const soltadores = [];

function activarTactil() {
  if (!document.body.classList.contains('tactil')) {
    document.body.classList.add('tactil');
    ajustarCanvas();
  }
}
if (window.matchMedia('(pointer: coarse)').matches) document.body.classList.add('tactil');
document.addEventListener('pointerdown', (evento) => {
  if (evento.pointerType === 'touch') activarTactil();
}, { capture: true });

function soltarJoysticks() {
  for (const soltar of soltadores) soltar();
}

// Joystick virtual: la perilla sigue al dedo dentro del círculo
for (const zona of document.querySelectorAll('.joystick')) {
  const jugador = Number(zona.dataset.jugador);
  const svg = zona.querySelector('svg');
  const perilla = zona.querySelector('.joystick-perilla');
  let dedo = null;

  const mover = (evento) => {
    const caja = zona.getBoundingClientRect();
    const radio = caja.width * 0.36;
    // Dirección en la pantalla (sirve igual aunque el control esté girado)
    let dx = (evento.clientX - (caja.left + caja.width / 2)) / radio;
    let dy = (evento.clientY - (caja.top + caja.height / 2)) / radio;
    const largo = Math.hypot(dx, dy);
    if (largo > 1) { dx /= largo; dy /= largo; }
    joystick[jugador] = largo < 0.18 ? { x: 0, y: 0 } : { x: dx, y: dy };

    // Posición de la perilla dentro del dibujo SVG
    const punto = svg.createSVGPoint();
    punto.x = evento.clientX;
    punto.y = evento.clientY;
    const matriz = svg.getScreenCTM();
    if (!matriz) return;
    const local = punto.matrixTransform(matriz.inverse());
    const n = normalizar(local.x, local.y);
    const tope = Math.min(n.l, 34);
    perilla.setAttribute('cx', (n.x * tope).toFixed(1));
    perilla.setAttribute('cy', (n.y * tope).toFixed(1));
  };

  const soltar = () => {
    dedo = null;
    joystick[jugador] = { x: 0, y: 0 };
    perilla.setAttribute('cx', '0');
    perilla.setAttribute('cy', '0');
  };
  soltadores.push(soltar);

  zona.addEventListener('pointerdown', (evento) => {
    if (dedo !== null) return;
    evento.preventDefault();
    dedo = evento.pointerId;
    zona.setPointerCapture?.(dedo);
    sonido.iniciar();
    mover(evento);
  });
  zona.addEventListener('pointermove', (evento) => {
    if (evento.pointerId === dedo) mover(evento);
  });
  for (const tipo of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    zona.addEventListener(tipo, (evento) => {
      if (evento.pointerId === dedo) soltar();
    });
  }
}

// Botones Patear y Derrapar: responden apenas se tocan (y cambian de color).
// Patear funciona igual que la tecla: toque corto = pase, mantener = tiro.
for (const boton of document.querySelectorAll('.boton-tactil')) {
  const jugador = Number(boton.dataset.jugador);
  const tipo = boton.dataset.accion;
  boton.addEventListener('pointerdown', (evento) => {
    evento.preventDefault();
    try {
      boton.setPointerCapture(evento.pointerId);   // aunque el dedo se corra, el botón sigue apretado
    } catch (error) {
      // Algunos navegadores no lo permiten: igual funciona, solo sin "agarrar" el dedo
    }
    boton.classList.add('presionado');
    sonido.iniciar();
    if (tipo === 'patear') empezarCarga(jugador);
    else accionLocal(jugador, tipo);
  });
  for (const fin of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    boton.addEventListener(fin, () => {
      boton.classList.remove('presionado');
      if (tipo === 'patear') soltarCarga(jugador);
    });
  }
  // Con teclado (Enter o Espacio sobre el botón) el clic llega con detail = 0: pase o derrape
  boton.addEventListener('click', (evento) => {
    if (evento.detail === 0) accionLocal(jugador, tipo === 'patear' ? 'pasar' : tipo);
  });
}

// Mientras se juega, nada de menús de "mantener presionado" ni zoom con gestos
dom.partida.addEventListener('contextmenu', (evento) => evento.preventDefault());
document.addEventListener('gesturestart', (evento) => {
  if (enPartida()) evento.preventDefault();
});

// Lee las teclas y el joystick de un jugador y devuelve hacia dónde moverse (en el mundo)
function entrada(jugador) {
  // En línea, el anfitrión recibe por internet hacia dónde va el invitado
  if (juego.modo === 'red' && red.esAnfitrion() && jugador === 1) return { x: red.mov.x, y: red.mov.y };
  let x = 0;
  let y = 0;
  const grupos = juego.modo === '2j' ? [CONTROLES[jugador]] : CONTROLES;
  for (const c of grupos) {
    if (c.arriba.some((t) => teclas.has(t))) y -= 1;
    if (c.abajo.some((t) => teclas.has(t))) y += 1;
    if (c.izquierda.some((t) => teclas.has(t))) x -= 1;
    if (c.derecha.some((t) => teclas.has(t))) x += 1;
  }
  x += joystick[jugador].x;
  y += joystick[jugador].y;
  const n = normalizar(x, y);
  const fuerza = Math.min(1, n.l);
  return direccionEnMundo(n.x * fuerza, n.y * fuerza);
}

// Tecla o botón de ESTE dispositivo. En línea, el invitado no juega la
// partida en su aparato: le manda la acción al anfitrión.
// "fuerza" (0 a 1) es la carga del tiro.
function accionLocal(jugador, tipo, fuerza = null) {
  if (red.esInvitado()) {
    if (!juego.pausado && juego.estado !== 'final') red.enviar({ t: 'acc', tipo, fuerza });
    return;
  }
  accion(jugador, tipo, fuerza);
}

// Pasar, tirar o derrapar, según el botón o la tecla.
function accion(jugador, tipo, fuerza = null) {
  if (juego.estado !== 'jugando' || juego.pausado) return;
  if (jugador === 1 && juego.modo === '1j') return;
  const equipo = juego.equipos[jugador];
  const alien = equipo.aliens[equipo.controlado];
  let hecho = false;
  if (alien.estado !== 'normal') hecho = false;
  else if (tipo === 'pasar') hecho = pasar(alien);
  else if (tipo === 'tirar') hecho = tirar(alien, entrada(jugador), fuerza);
  else if (tipo === 'derrapar') {
    const m = entrada(jugador);
    hecho = iniciarDerrape(alien, Math.hypot(m.x, m.y) > 0.2 ? m : { x: alien.mirarX, y: alien.mirarY });
  }
  if (!hecho) sonido.tocar('no-valido');
}

/* 10. ESTADO DE LA PARTIDA Y SAQUES ======================================= */
const juego = {
  modo: '1j',          // '1j' = contra Zorp, '2j' = dos personas, 'red' = en línea
  perfiles: [{ ...PERFIL_INICIAL }, { ...PERFIL_ZORP }],   // nombre, equipo, color y capitán
  colores: ['celeste', 'rosado'],                           // color final de cada equipo
  nivel: 'facil',
  ajuste: NIVELES.facil,
  estado: 'menu',      // 'saque' | 'jugando' | 'gol' | 'balonNuevo' | 'final'
  pausado: false,
  tutorial: null,
  terminoTutorial: false,
  marcador: [0, 0],
  equipos: [],
  balon: { x: CENTRO.x, y: CENTRO.y, vx: 0, vy: 0, giro: 0, estela: [], dueno: null, ultimo: null },
  tiempoEstado: 0,
  primerSaque: true,
  saqueEquipo: 0,
  equipoQueAnoto: -1,
  tiempoMitad: 0,
  ladoBalon: 1,
  tiempoDesdeSaque: 0,
  cadena: [0, 0],      // pases seguidos de cada equipo
  pase: null,          // pase que va en el aire
  peorDiferencia: 0,
  logrosNuevos: [],
  particulas: [],
  sacudida: 0,
  reloj: 0,
  ultimoRebote: 0,
  segundosPintados: -1,
  mensajeHasta: 0,
  ultimaCuenta: -1,
  // Poderes
  capsula: null,
  proximaCapsula: PODER.capsula.primera,
  ultimoPoder: '',
  asteroides: [],
  crateres: [],
  nave: null,
  babosa: null,
  charcos: []
};

function crearEquipo(indice) {
  const sentido = indice === 0 ? 1 : -1;   // equipo 0 ataca hacia la derecha
  const humano = indice === 0 || juego.modo === '2j' || juego.modo === 'red';
  // El delantero es el capitán: su dibujo sale del perfil (Zorp en el equipo rival)
  const capitan = CAPITANES[juego.perfiles[indice]?.capitan] || CAPITANES.cometa;
  return {
    indice,
    sentido,
    humano,
    arcoX: indice === 0 ? 0 : CANCHA.largo,   // arco propio
    controlado: 3,                             // alienígena que maneja la persona
    activo: 3,                                 // (máquina) el que va por el balón
    marcador: -1,                              // (máquina) el que cubre al rival
    buscador: -1,                              // (máquina) el que va por la cápsula
    vaPorCapsula: false,
    ultimoPase: -10,
    esperaCambio: 0,                           // (persona) pausa corta entre cambios automáticos
    aliens: ROLES.map((rol, numero) => ({
      equipo: indice,
      numero,
      rol,
      variante: rol === 'arquero' ? 'arquero' : (rol === 'delantero' ? capitan.cuerpo : 'campo'),
      x: 0, y: 0, vx: 0, vy: 0,
      mirarX: sentido, mirarY: 0,
      estado: 'normal',    // 'normal' | 'derrapando' | 'levantandose' | 'aturdido'
      tiempoEstado: 0,
      derrapeX: 0, derrapeY: 0, golpeo: false,
      esperaDerrape: 0,
      sinRecoger: 0,
      patada: 0,
      sostener: 0,
      enBaba: false, estabaEnBaba: false,
      tiempoAnim: Math.random(),
      distraido: 0, rumbo: 0,
      decision: 0,
      meta: { x: 0, y: 0 },
      objetivo: { x: 0, y: 0 },
      apuntarY: CENTRO.y,
      quierePasar: false, quiereTirar: false,
      atasco: 0, empujon: 0, empujonX: 0, empujonY: 0
    }))
  };
}

function nuevaPartida() {
  juego.marcador = [0, 0];
  juego.equipos = [crearEquipo(0), crearEquipo(1)];
  juego.peorDiferencia = 0;
  juego.logrosNuevos = [];
  juego.particulas = [];
  juego.primerSaque = true;
  juego.reloj = 0;
  juego.ritmoAvisado = 0;          // velocidad progresiva: último aumento anunciado
  juego.historialGuardado = false; // para guardar el partido una sola vez
  juego.capsula = null;
  juego.proximaCapsula = PODER.capsula.primera;
  juego.ultimoPoder = '';
  juego.asteroides = [];
  juego.crateres = [];
  juego.nave = null;
  juego.babosa = null;
  juego.charcos = [];
  pintarMarcador();
  if (juego.tutorial) iniciarTutorial();
  else prepararSaque(0, 3);
}

// Coloca a todos para sacar del centro. "segundos" es la cuenta regresiva.
function prepararSaque(equipoSaca, segundos) {
  const b = juego.balon;
  b.x = CENTRO.x;
  b.y = CENTRO.y;
  b.vx = 0;
  b.vy = 0;
  b.estela = [];
  b.dueno = null;
  b.ultimo = null;

  for (const eq of juego.equipos) {
    const s = eq.sentido;
    const [arquero, defensa, volante, delantero] = eq.aliens;
    colocar(arquero, eq.arcoX + s * 26, CENTRO.y);
    colocar(defensa, CENTRO.x - s * 310, CENTRO.y + 130 * s);
    colocar(volante, CENTRO.x - s * 200, CENTRO.y - 140 * s);
    if (eq.indice === equipoSaca) colocar(delantero, CENTRO.x - s * (CONTACTO + 3), CENTRO.y);
    else colocar(delantero, CENTRO.x - s * (RADIO_CIRCULO + 30), CENTRO.y - 60 * s);
    eq.controlado = 3;
    eq.activo = 3;
  }
  // El delantero que saca empieza con el balón
  const sacador = juego.equipos[equipoSaca].aliens[3];
  b.dueno = sacador;
  b.ultimo = sacador;
  pegarBalon(sacador, 0);

  juego.saqueEquipo = equipoSaca;
  juego.pase = null;
  juego.cadena = [0, 0];
  juego.tiempoMitad = 0;
  juego.ladoBalon = 1;
  juego.nave = null;
  juego.estado = 'saque';
  juego.tiempoEstado = segundos;
  juego.ultimaCuenta = -1;
  pintarReloj();
}

function colocar(alien, x, y) {
  alien.x = x;
  alien.y = y;
  alien.vx = 0;
  alien.vy = 0;
  alien.estado = 'normal';
  alien.tiempoEstado = 0;
  alien.distraido = 0;
  alien.empujon = 0;
  alien.sinRecoger = 0;
  alien.esperaDerrape = 0;
  alien.quierePasar = false;
  alien.quiereTirar = false;
  alien.objetivo = { x, y };
  alien.mirarX = alien.equipo === 0 ? 1 : -1;
  alien.mirarY = 0;
}

/* 11. MOVIMIENTO DE LOS ALIENÍGENAS ======================================= */
function actualizar(dt) {
  actualizarParticulas(dt);
  if (juego.pausado || juego.estado === 'menu' || juego.estado === 'final') return;
  juego.tiempoEstado -= dt;
  juego.sacudida = Math.max(0, juego.sacudida - dt * 3);

  switch (juego.estado) {
    case 'saque': {
      // Cuenta regresiva: 3, 2, 1 al empezar; "¡Listos!" en los demás saques
      const quedan = Math.ceil(juego.tiempoEstado);
      if (juego.primerSaque && quedan !== juego.ultimaCuenta && quedan > 0) {
        juego.ultimaCuenta = quedan;
        ponerMensaje(String(quedan));
        sonido.tocar('cuenta');
      } else if (!juego.primerSaque && juego.ultimaCuenta === -1) {
        juego.ultimaCuenta = 0;
        ponerMensaje('¡Listos!', true);
      }
      if (juego.tiempoEstado <= 0) {
        juego.estado = 'jugando';
        juego.primerSaque = false;
        juego.tiempoDesdeSaque = 0;
        ponerMensaje('¡Ya!', false, 0.6);
        sonido.tocar('silbato');
      }
      return;
    }
    case 'gol':
      moverBalon(dt);
      for (const eq of juego.equipos) for (const a of eq.aliens) { a.tiempoAnim += dt; frenar(a, dt, 6); }
      actualizarPoderesVisuales(dt);
      if (juego.tiempoEstado <= 0) {
        if (juego.tutorial) {
          prepararSaque(1, 0);
          juego.estado = 'jugando';
          ponerMensaje('');
        } else if (Math.max(...juego.marcador) >= GOLES_PARA_GANAR) {
          terminarPartida();
        } else {
          prepararSaque(juego.saqueEquipo, 1.1);
        }
      }
      return;
    case 'balonNuevo':
      for (const eq of juego.equipos) for (const a of eq.aliens) frenar(a, dt, 6);
      if (juego.tiempoEstado <= 0) prepararSaque(juego.saqueEquipo, 1.1);
      return;
    case 'jugando':
      actualizarJuego(dt);
      break;
    default:
      break;
  }
  if (juego.mensajeHasta && juego.reloj > juego.mensajeHasta) {
    juego.mensajeHasta = 0;
    ponerMensaje('');
  }
}

function actualizarJuego(dt) {
  juego.reloj += dt;
  // Velocidad progresiva: avisa cada vez que el balón sube de velocidad
  const ritmo = nivelRitmo();
  if (ritmo > juego.ritmoAvisado) {
    juego.ritmoAvisado = ritmo;
    const porcentaje = Math.round((multiplicador() - 1) * 100);
    ponerMensaje('¡El balón va más rápido!', true, 1.6);
    anunciar(`El balón va más rápido: ${porcentaje} % más que al empezar.`);
  }
  juego.tiempoDesdeSaque += dt;
  actualizarPoderes(dt);
  for (const eq of juego.equipos) actualizarEquipo(eq, dt);
  separarAliens();
  for (const eq of juego.equipos) {
    for (const a of eq.aliens) {
      limitarAlien(a, eq);
      chocarConCrateres(a);
    }
  }
  moverBalon(dt);
  revisarToques();
  for (const eq of juego.equipos) cambioAutomatico(eq, dt);
  if (juego.pase) {
    juego.pase.tiempo += dt;
    const b = juego.balon;
    if (b.dueno || juego.pase.tiempo > 2.2 || Math.hypot(b.vx, b.vy) < 30) juego.pase = null;
  }
  if (juego.tutorial) actualizarTutorial(dt);
  if (revisarGol()) return;
  if (!juego.tutorial) revisarMitad(dt);
}

function actualizarEquipo(eq, dt) {
  if (!eq.humano) elegirRoles(eq);
  const b = juego.balon;
  for (const a of eq.aliens) {
    a.tiempoAnim += dt;
    a.esperaDerrape = Math.max(0, a.esperaDerrape - dt);
    a.sinRecoger = Math.max(0, a.sinRecoger - dt);
    a.patada = Math.max(0, a.patada - dt);
    a.enBaba = juego.charcos.some((c) => distancia(a, c) < radioCharco(c));
    if (a.enBaba && !a.estabaEnBaba && a.estado === 'normal') sonido.tocar('resbalon');
    a.estabaEnBaba = a.enBaba;

    if (a.estado === 'derrapando') {
      moverDerrape(a, dt);
      continue;
    }
    if (a.estado !== 'normal') {           // aturdido o levantándose
      a.tiempoEstado -= dt;
      frenar(a, dt, 8);
      if (a.tiempoEstado <= 0) a.estado = 'normal';
      continue;
    }

    const manejado = eq.humano && eq.controlado === a.numero;
    let deseada;
    if (manejado) {
      const m = entrada(eq.indice);
      deseada = { x: m.x * VEL_ALIEN, y: m.y * VEL_ALIEN };
    } else {
      actualizarDistraccion(a, eq, dt);
      deseada = evitarObstaculos(a, pensar(a, eq, dt));
    }
    if (a.estado !== 'normal') continue;   // pensar() pudo lanzar un derrape
    if (b.dueno === a) {
      deseada.x *= VEL_CON_BALON;
      deseada.y *= VEL_CON_BALON;
    }
    acelerar(a, deseada, dt, manejado);
    perderBalonEnBaba(a, dt);
  }
}

// Cambia la velocidad poco a poco hacia la deseada y mueve al alienígena.
// Sobre la baba casi no hay agarre: el alienígena sigue de largo.
function acelerar(a, deseada, dt, manejado) {
  if (!manejado) {
    // Si la máquina quiere moverse y no avanza, se da un empujoncito para no trabarse
    if (a.empujon > 0) {
      a.empujon -= dt;
      deseada = { x: a.empujonX * VEL_ALIEN * 0.7, y: a.empujonY * VEL_ALIEN * 0.7 };
    } else if (Math.hypot(deseada.x, deseada.y) > 120 && Math.hypot(a.vx, a.vy) < 25) {
      a.atasco += dt;
      if (a.atasco > 0.7) {
        const angulo = Math.atan2(deseada.y, deseada.x) + (Math.random() < 0.5 ? 1.6 : -1.6);
        a.empujonX = Math.cos(angulo);
        a.empujonY = Math.sin(angulo);
        a.empujon = 0.35;
        a.atasco = 0;
      }
    } else {
      a.atasco = 0;
    }
  }
  const agarre = a.enBaba ? PODER.baba.agarre : 1;
  const k = Math.min(1, (manejado ? 14 : 9) * agarre * dt);
  a.vx += (deseada.x - a.vx) * k;
  a.vy += (deseada.y - a.vy) * k;
  a.x += a.vx * dt;
  a.y += a.vy * dt;
  girarHacia(a, a.vx, a.vy, dt);
}

// La mirada gira suave hacia donde se mueve (así el balón no salta de lado a lado)
function girarHacia(a, vx, vy, dt) {
  const rapidez = Math.hypot(vx, vy);
  if (rapidez < 30) return;
  const t = Math.min(1, dt * 14);
  const m = normalizar(a.mirarX + (vx / rapidez - a.mirarX) * t, a.mirarY + (vy / rapidez - a.mirarY) * t);
  if (m.l > 0.01) {
    a.mirarX = m.x;
    a.mirarY = m.y;
  }
}

function frenar(a, dt, fuerza) {
  const freno = Math.exp(-fuerza * dt);
  a.vx *= freno;
  a.vy *= freno;
  a.x += a.vx * dt;
  a.y += a.vy * dt;
}

// Ningún alienígena se encima de otro
function separarAliens() {
  const todos = juego.equipos.flatMap((eq) => eq.aliens);
  const minimo = RADIO_ALIEN * 2;
  for (let i = 0; i < todos.length; i++) {
    for (let j = i + 1; j < todos.length; j++) {
      const a = todos[i];
      const b = todos[j];
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      let d = Math.hypot(dx, dy);
      if (d >= minimo) continue;
      if (d < 0.01) { dx = Math.random() - 0.5; dy = Math.random() - 0.5; d = Math.hypot(dx, dy); }
      const empuje = (minimo - d) / 2;
      a.x -= (dx / d) * empuje;
      a.y -= (dy / d) * empuje;
      b.x += (dx / d) * empuje;
      b.y += (dy / d) * empuje;
    }
  }
}

// Los alienígenas no salen de la cancha; el arquero no sale de su área
function limitarAlien(a, eq) {
  if (a.rol === 'arquero') {
    const xMin = eq.sentido > 0 ? 6 : CANCHA.largo - AREA.fondo;
    const xMax = eq.sentido > 0 ? AREA.fondo : CANCHA.largo - 6;
    a.x = limitar(a.x, xMin, xMax);
    a.y = limitar(a.y, CENTRO.y - AREA.ancho / 2, CENTRO.y + AREA.ancho / 2);
  } else {
    a.x = limitar(a.x, -BORDE + 4, CANCHA.largo + BORDE - 4);
    a.y = limitar(a.y, -BORDE + 4, CANCHA.ancho + BORDE - 4);
  }
}

// Los huecos de los asteroides no se pueden pisar: hay que rodearlos
function chocarConCrateres(a) {
  for (const c of juego.crateres) {
    const minimo = radioCrater(c) + RADIO_ALIEN * 0.5;
    const d = normalizar(a.x - c.x, a.y - c.y);
    if (d.l < minimo) {
      const dir = d.l > 0.01 ? d : { x: 1, y: 0 };
      a.x = c.x + dir.x * minimo;
      a.y = c.y + dir.y * minimo;
    }
  }
}

/* 12. BALÓN: POSESIÓN, PASES, TIROS Y DERRAPES ============================ */
const esManejado = (a) => juego.equipos[a.equipo].humano && juego.equipos[a.equipo].controlado === a.numero;

// Velocidad progresiva: cuántos aumentos por tiempo lleva la partida (0 a 6)
function nivelRitmo() {
  if (juego.tutorial) return 0;
  const tope = Math.round(ACELERACION.maximo / ACELERACION.aumento);
  return Math.min(Math.floor(juego.reloj / ACELERACION.cada), tope);
}

// El balón va un poco más rápido después de cada gol (según el nivel)
// y cada 30 segundos de juego (velocidad progresiva, versión 3.8)
function multiplicador() {
  return 1 + (juego.marcador[0] + juego.marcador[1]) * juego.ajuste.aumentoPorGol
           + nivelRitmo() * ACELERACION.aumento;
}

function moverBalon(dt) {
  const b = juego.balon;
  const r = RADIO_BALON;
  // Lo lleva la nave del aficionado
  if (juego.nave && juego.nave.conBalon) {
    b.x = juego.nave.x;
    b.y = juego.nave.y;
    b.vx = juego.nave.vx;
    b.vy = juego.nave.vy;
    b.estela.length = 0;
    return;
  }
  // Lo lleva un alienígena pegado al pie
  if (b.dueno) {
    pegarBalon(b.dueno, dt);
    return;
  }

  const enBaba = juego.charcos.some((c) => distancia(b, c) < radioCharco(c));
  const freno = Math.exp(-FRICCION * (enBaba ? 0.3 : 1) * dt);
  b.vx *= freno;
  b.vy *= freno;
  let rapidez = Math.hypot(b.vx, b.vy);
  if (rapidez > VEL_MAX_BALON) {
    b.vx *= VEL_MAX_BALON / rapidez;
    b.vy *= VEL_MAX_BALON / rapidez;
    rapidez = VEL_MAX_BALON;
  }
  if (rapidez < 4) { b.vx = 0; b.vy = 0; }
  b.x += b.vx * dt;
  b.y += b.vy * dt;
  b.giro += rapidez * dt * 0.06;

  // Estela del balón (solo para dibujar)
  b.estela.push({ x: b.x, y: b.y });
  if (b.estela.length > 10) b.estela.shift();

  // Bandas laterales: el balón rebota (estilo Atari, sin saques de banda)
  let reboto = false;
  if (b.y < r) { b.y = r; b.vy = Math.abs(b.vy) * 0.8; reboto = true; }
  if (b.y > CANCHA.ancho - r) { b.y = CANCHA.ancho - r; b.vy = -Math.abs(b.vy) * 0.8; reboto = true; }

  // Líneas de fondo y arcos
  if (b.x < r || b.x > CANCHA.largo - r) {
    const izquierda = b.x < CENTRO.x;
    const dentro = izquierda ? b.x < 0 : b.x > CANCHA.largo;
    const enBoca = b.y > ARCO_ARRIBA && b.y < ARCO_ABAJO;
    if (dentro && enBoca) {
      // Dentro del arco: la red frena el balón
      if (b.y < ARCO_ARRIBA + r) { b.y = ARCO_ARRIBA + r; b.vy = Math.abs(b.vy) * 0.3; }
      if (b.y > ARCO_ABAJO - r) { b.y = ARCO_ABAJO - r; b.vy = -Math.abs(b.vy) * 0.3; }
      const fondo = izquierda ? -ARCO.fondo + r : CANCHA.largo + ARCO.fondo - r;
      if (izquierda ? b.x < fondo : b.x > fondo) { b.x = fondo; b.vx = -b.vx * 0.25; }
    } else if (!enBoca) {
      if (izquierda) { b.x = r; b.vx = Math.abs(b.vx) * 0.8; } else { b.x = CANCHA.largo - r; b.vx = -Math.abs(b.vx) * 0.8; }
      reboto = true;
    }
  }

  // Postes
  for (const poste of POSTES) {
    const d = normalizar(b.x - poste.x, b.y - poste.y);
    const minimo = r + ARCO.poste;
    if (d.l < minimo && d.l > 0.001) {
      b.x = poste.x + d.x * minimo;
      b.y = poste.y + d.y * minimo;
      const vn = b.vx * d.x + b.vy * d.y;
      if (vn < 0) {
        b.vx -= 1.7 * vn * d.x;
        b.vy -= 1.7 * vn * d.y;
        if (rapidez > 120) sonido.tocar('poste');
      }
    }
  }

  // Cráteres: el balón rebota en el borde del hueco
  for (const c of juego.crateres) {
    const d = normalizar(b.x - c.x, b.y - c.y);
    const minimo = radioCrater(c) + r * 0.3;
    if (d.l < minimo) {
      const dir = d.l > 0.01 ? d : { x: 1, y: 0 };
      b.x = c.x + dir.x * minimo;
      b.y = c.y + dir.y * minimo;
      const vn = b.vx * dir.x + b.vy * dir.y;
      if (vn < 0) {
        b.vx -= 1.6 * vn * dir.x;
        b.vy -= 1.6 * vn * dir.y;
        reboto = true;
      }
    }
  }

  if (reboto && rapidez > 160 && juego.reloj - juego.ultimoRebote > 0.1) {
    juego.ultimoRebote = juego.reloj;
    sonido.tocar('rebote');
  }
}

// El balón va pegado delante del pie de quien lo tiene
function pegarBalon(a, dt) {
  const b = juego.balon;
  const r = RADIO_BALON;
  const separacion = RADIO_ALIEN + r + 2;
  let x = a.x + a.mirarX * separacion;
  const y = limitar(a.y + a.mirarY * separacion, r, CANCHA.ancho - r);
  const enBoca = y > ARCO_ARRIBA && y < ARCO_ABAJO;
  x = enBoca ? limitar(x, -ARCO.fondo + r, CANCHA.largo + ARCO.fondo - r) : limitar(x, r, CANCHA.largo - r);
  b.x = x;
  b.y = y;
  b.vx = a.vx;
  b.vy = a.vy;
  b.giro += Math.hypot(a.vx, a.vy) * dt * 0.06;
  b.estela.length = 0;
  // Si el balón cae en un hueco, se escapa del pie
  for (const c of juego.crateres) {
    if (distancia(b, c) < radioCrater(c) - 2) {
      soltarBalon(a, a.vx * 0.6, a.vy * 0.6);
      break;
    }
  }
}

// ¿Quién toca el balón suelto?
function revisarToques() {
  const b = juego.balon;
  if (juego.nave && juego.nave.conBalon) return;
  for (const eq of juego.equipos) {
    for (const a of eq.aliens) {
      if (a.estado !== 'normal') continue;               // derrapando, en el piso o levantándose
      const d = normalizar(b.x - a.x, b.y - a.y);
      if (d.l >= CONTACTO + 1) continue;

      if (b.dueno) {
        // El arquero le quita el balón al rival que entra a su área y lo toca
        if (b.dueno.equipo !== a.equipo && a.rol === 'arquero' && b.dueno.rol !== 'arquero'
          && dentroDelArea(b, eq, 0) && puedeRecoger(a)) {
          atajar(a);
          return;
        }
        continue;
      }
      if (a.sinRecoger > 0 || !puedeRecoger(a)) continue;   // acaba de soltarlo: lo deja ir
      const n = d.l > 0.001 ? d : { x: eq.sentido, y: 0 };
      if (a.rol === 'arquero') {
        atajar(a);
        return;
      }
      if (Math.hypot(b.vx, b.vy) < CONTROL_MAX) {
        tomarBalon(a);
        return;
      }
      desviar(a, n);
    }
  }
}

// En el tutorial, el equipo de Zorp no recoge balones hasta el paso del derrape
function puedeRecoger(a) {
  if (!juego.tutorial || a.equipo === 0) return true;
  return juego.tutorial.zorpJuega === true;
}

function tomarBalon(a, nombreSonido = 'control') {
  const b = juego.balon;
  if (b.dueno && b.dueno !== a) b.dueno.sinRecoger = 0.5;
  b.dueno = a;
  b.vx = 0;
  b.vy = 0;
  a.sostener = a.rol === 'arquero' ? 0.7 : 0;
  registrarToque(a);
  if (nombreSonido) sonido.tocar(nombreSonido);
  if (a.equipo === 0 && esManejado(a)) tutorialEvento('tomar');
}

function soltarBalon(a, vx, vy) {
  const b = juego.balon;
  if (b.dueno === a) b.dueno = null;
  b.vx = vx;
  b.vy = vy;
  a.sinRecoger = Math.max(a.sinRecoger, 0.3);
}

// Un balón muy rápido no se puede dominar: rebota en el cuerpo
function desviar(a, n) {
  const b = juego.balon;
  b.x = a.x + n.x * (CONTACTO + 0.5);
  b.y = a.y + n.y * (CONTACTO + 0.5);
  const vn = b.vx * n.x + b.vy * n.y;
  if (vn < 0) {
    b.vx -= 1.5 * vn * n.x;
    b.vy -= 1.5 * vn * n.y;
  }
  b.vx *= 0.6;
  b.vy *= 0.6;
  a.sinRecoger = 0.1;
  b.ultimo = a;
  juego.cadena[1 - a.equipo] = 0;
  sonido.tocar('rebote');
}

function atajar(a) {
  // En el tutorial, el arquero de Zorp no ataja: solo desvía
  if (juego.tutorial && a.equipo === 1) {
    desviar(a, normalizar(juego.balon.x - a.x, juego.balon.y - a.y));
    return;
  }
  tomarBalon(a, 'atajada');
}

// Guarda quién tocó el balón, cuenta pases y mueve el control automático
function registrarToque(a) {
  const b = juego.balon;
  const eq = juego.equipos[a.equipo];
  if (juego.pase) {
    if (a.equipo === juego.pase.equipo && a !== juego.pase.desde) {
      juego.cadena[a.equipo] += 1;
      if (a.equipo === 0) tutorialEvento('pase');
    }
    juego.pase = null;
  }
  juego.cadena[1 - a.equipo] = 0;   // el rival tocó: se corta su cadena de pases
  b.ultimo = a;
  if (a.rol !== 'arquero') {
    if (eq.humano && eq.controlado !== a.numero && eq.aliens[eq.controlado].rol !== 'arquero') {
      eq.controlado = a.numero;     // el balón le llegó a un compañero: ahora lo manejas tú
    }
    eq.activo = a.numero;
  }
}

// ¿Tiene el balón, o está suelto y cerquita?
function puedeTocar(a) {
  const b = juego.balon;
  if (juego.nave && juego.nave.conBalon) return false;
  return b.dueno === a || (!b.dueno && a.estado === 'normal' && distancia(a, b) < ALCANCE_TOQUE);
}

// Elige al compañero más adelantado o más libre
function elegirCompanero(a) {
  const eq = juego.equipos[a.equipo];
  const rival = juego.equipos[1 - a.equipo];
  let mejor = null;
  let mejorPuntaje = -Infinity;
  for (const c of eq.aliens) {
    if (c === a || c.estado === 'aturdido') continue;
    const avance = ((c.x - a.x) * eq.sentido) / 400;
    let libre = Infinity;
    for (const r of rival.aliens) libre = Math.min(libre, distancia(c, r));
    libre = Math.min(libre, 220) / 220;
    let bloqueo = 0;
    for (const r of rival.aliens) {
      if (distanciaASegmento(r, a, c) < RADIO_ALIEN + 16) bloqueo += 0.6;
    }
    for (const cr of juego.crateres) {
      if (distanciaASegmento(cr, a, c) < radioCrater(cr)) bloqueo += 0.4;
    }
    let puntaje = avance * 0.55 + libre * 0.45 - bloqueo;
    if (c.rol === 'arquero') puntaje -= 0.9;
    if (distancia(a, c) < 70) puntaje -= 0.5;
    if (puntaje > mejorPuntaje) {
      mejorPuntaje = puntaje;
      mejor = c;
    }
  }
  return mejor;
}

function pasar(a) {
  if (!puedeTocar(a)) return false;
  const b = juego.balon;
  const eq = juego.equipos[a.equipo];
  const destino = elegirCompanero(a);
  if (!destino) return false;
  if (b.dueno !== a) registrarToque(a);

  // Se apunta un poco adelante del compañero si va corriendo
  const tiempo = distancia(b, destino) / 420;
  const meta = {
    x: limitar(destino.x + destino.vx * tiempo * 0.7, RADIO_ALIEN, CANCHA.largo - RADIO_ALIEN),
    y: limitar(destino.y + destino.vy * tiempo * 0.7, RADIO_ALIEN, CANCHA.ancho - RADIO_ALIEN)
  };
  const dir = normalizar(meta.x - b.x, meta.y - b.y);
  const velocidad = limitar(dir.l * FRICCION + 210 * multiplicador(), 260, 900);
  soltarBalon(a, dir.x * velocidad, dir.y * velocidad);
  a.mirarX = dir.x;
  a.mirarY = dir.y;
  a.patada = 0.18;
  juego.pase = { equipo: a.equipo, desde: a, hacia: destino, tiempo: 0 };
  eq.ultimoPase = juego.reloj;
  eq.activo = destino.numero;
  if (eq.humano) eq.controlado = destino.numero;   // el control pasa al que recibe
  sonido.tocar('pase');
  return true;
}

// Tiro al arco. "apunte" es hacia dónde aprieta la persona (para elegir palo).
// "fuerza": carga del tiro de una persona (0 a 1). La máquina tira sin carga (null).
// Sin carga sale a 0,7 de la velocidad normal; con la carga llena, a 1,15
// (pero un poquito menos preciso: arriesgas puntería por potencia).
function tirar(a, apunte = null, fuerza = null) {
  if (!puedeTocar(a)) return false;
  const b = juego.balon;
  const eq = juego.equipos[a.equipo];
  if (b.dueno !== a) registrarToque(a);
  const s = eq.sentido;
  const arcoX = s > 0 ? CANCHA.largo : 0;
  const distanciaArco = Math.hypot(arcoX - b.x, CENTRO.y - b.y);
  let dir;
  if (a.mirarX * s > -0.3 || distanciaArco < 250) {
    // Mirando más o menos al arco: el tiro va a un palo
    const y = puntoDeTiro(a, eq, apunte);
    const recto = normalizar(arcoX - b.x, y - b.y);
    let desvio = Math.max(0, distanciaArco - 250) / 2600;     // de lejos es menos preciso
    if (fuerza !== null) desvio *= 0.7 + 0.6 * fuerza;
    const angulo = Math.atan2(recto.y, recto.x) + azar(-desvio, desvio);
    dir = { x: Math.cos(angulo), y: Math.sin(angulo) };
  } else {
    // De espaldas al arco: patea hacia donde mira (despeje)
    dir = { x: a.mirarX, y: a.mirarY };
  }
  const potencia = fuerza === null ? 1 : 0.7 + 0.45 * fuerza;
  const velocidad = juego.ajuste.tiro * multiplicador() * potencia;
  soltarBalon(a, dir.x * velocidad, dir.y * velocidad);
  a.mirarX = dir.x;
  a.mirarY = dir.y;
  a.patada = 0.2;
  juego.pase = null;
  sonido.tocar('tiro');
  return true;
}

// A qué altura del arco va el tiro
function puntoDeTiro(a, eq, apunte) {
  const arquero = juego.equipos[1 - eq.indice].aliens[0];
  const ladoLibre = arquero.y < CENTRO.y ? ARCO_ABAJO - 22 : ARCO_ARRIBA + 22;
  if (apunte) {
    // La persona apunta manteniendo una dirección hacia el lado al tirar
    const y = Math.abs(apunte.y) > 0.3 ? CENTRO.y + Math.sign(apunte.y) * (ARCO.boca / 2 - 20) : ladoLibre;
    return y + azar(-10, 10);
  }
  return a.apuntarY;
}

// Si el arquero no tiene a quién pasar, despeja hacia adelante
function despejar(a, eq) {
  const dir = normalizar(eq.sentido, azar(-0.6, 0.6));
  const velocidad = 480 * multiplicador();
  soltarBalon(a, dir.x * velocidad, dir.y * velocidad);
  a.patada = 0.2;
  sonido.tocar('patada');
}

// Derrape: el alienígena se lanza al piso en una dirección
function iniciarDerrape(a, dir) {
  if (a.estado !== 'normal' || a.esperaDerrape > 0 || juego.balon.dueno === a) return false;
  let d = normalizar(dir.x, dir.y);
  if (d.l < 0.1) d = { x: a.mirarX, y: a.mirarY };
  a.estado = 'derrapando';
  a.tiempoEstado = DERRAPE.duracion;
  a.derrapeX = d.x;
  a.derrapeY = d.y;
  a.mirarX = d.x;
  a.mirarY = d.y;
  a.vx = d.x * DERRAPE.velocidad;
  a.vy = d.y * DERRAPE.velocidad;
  a.golpeo = false;
  a.esperaDerrape = DERRAPE.espera;
  sonido.tocar('derrape');
  return true;
}

function moverDerrape(a, dt) {
  a.tiempoEstado -= dt;
  frenar(a, dt, DERRAPE.freno);
  if (!reducirMovimiento && Math.random() < dt * 30) soltarPolvo(a);
  revisarDerrape(a);
  if (a.tiempoEstado <= 0) {
    a.estado = 'levantandose';
    a.tiempoEstado = DERRAPE.levantarse;
  }
}

// ¿El pie del que derrapa alcanzó el balón (o la nave)?
function revisarDerrape(a) {
  if (a.golpeo) return;
  const b = juego.balon;
  const pie = { x: a.x + a.derrapeX * RADIO_ALIEN * 0.6, y: a.y + a.derrapeY * RADIO_ALIEN * 0.6 };
  const n = juego.nave;
  if (n && n.conBalon) {
    if (n.t > PODER.nave.ventaja && distancia(pie, n) < PODER.nave.alcance) {
      a.golpeo = true;
      atraparNave(a);
    }
    return;
  }
  if (distancia(pie, b) > RADIO_ALIEN + RADIO_BALON + 4) return;
  const dueno = b.dueno;
  if (dueno) {
    if (dueno.equipo === a.equipo || dueno.rol === 'arquero' || !puedeRecoger(a)) return;
    // ¡Robo! El balón sale suelto y el rival queda en el piso
    a.golpeo = true;
    soltarBalon(dueno, a.derrapeX * 300 + dueno.vx * 0.2, a.derrapeY * 300 + dueno.vy * 0.2);
    aturdir(dueno, DERRIBO);
    juego.cadena[dueno.equipo] = 0;
    juego.pase = null;
    b.ultimo = a;
    sonido.tocar('robo');
    if (a.equipo === 0 && esManejado(a)) tutorialEvento('robo');
  } else {
    // Balón suelto: el derrape lo patea
    a.golpeo = true;
    const velocidad = Math.max(380, Math.hypot(b.vx, b.vy));
    b.vx = a.derrapeX * velocidad;
    b.vy = a.derrapeY * velocidad;
    b.ultimo = a;
    juego.cadena[1 - a.equipo] = 0;
    juego.pase = null;
    sonido.tocar('patada');
  }
}

// Deja a un alienígena en el piso un rato (y pierde el balón si lo tenía)
function aturdir(a, segundos) {
  const b = juego.balon;
  if (b.dueno === a) soltarBalon(a, a.vx * 0.4, a.vy * 0.4);
  a.estado = 'aturdido';
  a.tiempoEstado = segundos;
  a.sinRecoger = Math.max(a.sinRecoger, segundos);
  sonido.tocar('caida');
}

// Sobre la baba, quien lleva el balón puede perderlo
function perderBalonEnBaba(a, dt) {
  const b = juego.balon;
  if (b.dueno !== a || !a.enBaba) return;
  if (Math.random() < PODER.baba.pierdeBalon * dt) {
    soltarBalon(a, a.vx * 1.3 + azar(-60, 60), a.vy * 1.3 + azar(-60, 60));
    sonido.tocar('resbalon');
  }
}

// Cambia al compañero más cercano al balón. Si llevabas el balón, tu compañero
// se queda con él y lo juega solo (puede pasártelo). El arquero solo se elige
// cuando el balón está cerca de su área.
// Cambio automático (versión 3.2): cada persona maneja siempre al alienígena de
// su equipo más cercano al balón. El arquero lo maneja siempre la máquina.
//  · Si tu equipo tiene el balón, manejas al que lo lleva.
//  · Si va un pase de tu equipo en el aire, el control ya saltó al que recibe.
//  · Para que no salte de un lado a otro, el nuevo debe estar bastante más cerca
//    (45 unidades) y entre un cambio y otro pasan al menos 0,35 s.
//  · No cambia a mitad de un derrape.
const CAMBIO = { ventaja: 45, espera: 0.35, anticipo: 0.2, castigoCaido: 90 };

function cambioAutomatico(eq, dt) {
  if (!eq.humano) return;
  eq.esperaCambio = Math.max(0, eq.esperaCambio - dt);
  const b = juego.balon;
  const actual = eq.aliens[eq.controlado];

  if (b.dueno && b.dueno.equipo === eq.indice) {
    if (b.dueno.rol !== 'arquero') eq.controlado = b.dueno.numero;
    if (actual.rol !== 'arquero') return;
  }
  if (juego.pase && juego.pase.equipo === eq.indice && actual.rol !== 'arquero') return;
  if (actual.estado === 'derrapando') return;

  // Se mira un poquito adelante, hacia donde va el balón (o la nave que lo lleva)
  const objetivo = juego.nave && juego.nave.conBalon
    ? juego.nave
    : { x: b.x + b.vx * CAMBIO.anticipo, y: b.y + b.vy * CAMBIO.anticipo };
  // Los que están en el piso cuentan como si estuvieran más lejos
  const lejania = (a) => distancia(a, objetivo) + (a.estado === 'normal' ? 0 : CAMBIO.castigoCaido);

  let mejor = null;
  for (const c of eq.aliens) {
    if (c.rol === 'arquero') continue;
    if (!mejor || lejania(c) < lejania(mejor)) mejor = c;
  }
  if (!mejor || mejor === actual) return;
  const arquero = actual.rol === 'arquero';
  if (!arquero && (eq.esperaCambio > 0 || lejania(mejor) > lejania(actual) - CAMBIO.ventaja)) return;
  eq.controlado = mejor.numero;
  eq.esperaCambio = CAMBIO.espera;
}

function dentroDelArea(punto, eq, holgura) {
  const distanciaLinea = (punto.x - eq.arcoX) * eq.sentido;
  return distanciaLinea < AREA.fondo + holgura && Math.abs(punto.y - CENTRO.y) < AREA.ancho / 2 + holgura;
}

/* 13. PODERES: CÁPSULAS, ASTEROIDES, NAVE Y BABA ========================== */
const poderEnCurso = () => juego.asteroides.length > 0 || juego.nave !== null || juego.babosa !== null;

function actualizarPoderes(dt) {
  // Cápsula: aparece cada cierto tiempo y dura un rato en la cancha
  if (juego.capsula) {
    juego.capsula.vida -= dt;
    juego.capsula.t += dt;
    if (juego.capsula.vida <= 0) juego.capsula = null;
    else revisarCapsula();
  } else if (!juego.tutorial && !poderEnCurso()) {
    juego.proximaCapsula -= dt;
    if (juego.proximaCapsula <= 0) crearCapsula();
  }
  actualizarAsteroides(dt);
  actualizarNave(dt);
  actualizarBabosa(dt);
  actualizarPoderesVisuales(dt);
}

// Lo que sigue pasando aunque el juego esté detenido por un gol
function actualizarPoderesVisuales(dt) {
  for (const c of juego.crateres) {
    c.vida -= dt;
    c.edad += dt;
    if (c.vida <= 0) sonido.tocar('regenerar');
  }
  juego.crateres = juego.crateres.filter((c) => c.vida > 0);
  for (const c of juego.charcos) c.vida -= dt;
  juego.charcos = juego.charcos.filter((c) => c.vida > 0);
}

function crearCapsula(tipo = null, x = null, y = null) {
  const tipos = ['asteroides', 'nave', 'baba'].filter((t) => t !== juego.ultimoPoder);
  const elegido = tipo || tipos[Math.floor(Math.random() * tipos.length)];
  let px = x;
  let py = y;
  for (let intento = 0; px === null && intento < 25; intento++) {
    const cx = azar(260, 740);
    const cy = azar(90, 530);
    const libre = distancia({ x: cx, y: cy }, juego.balon) > 120
      && juego.crateres.every((c) => distancia({ x: cx, y: cy }, c) > c.radio + 30);
    if (libre || intento === 24) { px = cx; py = cy; }
  }
  juego.capsula = { x: px, y: py, tipo: elegido, vida: PODER.capsula.dura, t: 0 };
  juego.proximaCapsula = azar(PODER.capsula.cadaMin, PODER.capsula.cadaMax);
  // ¿Zorp va a buscarla? Depende del nivel
  for (const eq of juego.equipos) eq.vaPorCapsula = !eq.humano && Math.random() < ajusteDe(eq).buscaCapsula;
  sonido.tocar('capsula');
  anunciar(`Apareció una cápsula de poder: ${NOMBRES_PODER[elegido]}.`);
}

function revisarCapsula() {
  const c = juego.capsula;
  for (const eq of juego.equipos) {
    for (const a of eq.aliens) {
      if (a.estado === 'aturdido') continue;
      if (distancia(a, c) < RADIO_ALIEN + PODER.capsula.radio) {
        juego.capsula = null;
        activarPoder(c.tipo, a.equipo);
        return;
      }
    }
  }
}

function nombreEquipo(indice) {
  if (juego.modo === 'red') return nombreVisible(indice);
  if (juego.modo === '2j') return `El jugador ${indice + 1}`;
  return indice === 0 ? 'Tu equipo' : 'Zorp';
}

function activarPoder(tipo, equipo) {
  juego.ultimoPoder = tipo;
  ponerMensaje(NOMBRES_PODER[tipo], true, 1.6);
  anunciar(`${nombreEquipo(equipo)} activó: ${NOMBRES_PODER[tipo]}.`);
  sonido.tocar('poder');
  if (tipo === 'asteroides') lanzarAsteroides(equipo);
  else if (tipo === 'nave') llamarNave(equipo);
  else soltarBabosa(equipo);
  if (equipo === 0) tutorialEvento('poder');
}

// ---- Lluvia de asteroides: caen cerca de los rivales y dejan huecos ----
function lanzarAsteroides(equipo) {
  const rival = juego.equipos[1 - equipo];
  const campo = rival.aliens.filter((a) => a.rol !== 'arquero');
  const p = PODER.asteroides;
  for (let i = 0; i < p.cantidad; i++) {
    const victima = campo[i % campo.length];
    let x = limitar(victima.x + azar(-45, 45), 70, CANCHA.largo - 70);
    const y = limitar(victima.y + azar(-45, 45), 55, CANCHA.ancho - 55);
    // Nunca dentro de las áreas (los arcos quedan libres)
    if (x < AREA.fondo + 40) x = AREA.fondo + 40;
    if (x > CANCHA.largo - AREA.fondo - 40) x = CANCHA.largo - AREA.fondo - 40;
    juego.asteroides.push({ x, y, t: p.aviso + i * p.entre, total: p.aviso + i * p.entre, radio: azar(p.radioMin, p.radioMax), sono: false });
  }
}

function actualizarAsteroides(dt) {
  for (const ast of juego.asteroides) {
    ast.t -= dt;
    if (!ast.sono && ast.t < 0.75) {
      ast.sono = true;
      sonido.tocar('asteroide');
    }
    if (ast.t <= 0) impactoAsteroide(ast);
  }
  juego.asteroides = juego.asteroides.filter((ast) => ast.t > 0);
}

function impactoAsteroide(ast) {
  const p = PODER.asteroides;
  juego.crateres.push({ x: ast.x, y: ast.y, radio: ast.radio, vida: p.crater, edad: 0, semilla: Math.random() * 1000 });
  for (const eq of juego.equipos) {
    for (const a of eq.aliens) {
      const d = normalizar(a.x - ast.x, a.y - ast.y);
      if (d.l < ast.radio + RADIO_ALIEN) {
        if (a.rol !== 'arquero') aturdir(a, p.aturde);
        const dir = d.l > 0.01 ? d : { x: 1, y: 0 };
        a.x = ast.x + dir.x * (ast.radio + RADIO_ALIEN * 0.6);
        a.y = ast.y + dir.y * (ast.radio + RADIO_ALIEN * 0.6);
      }
    }
  }
  const b = juego.balon;
  const db = normalizar(b.x - ast.x, b.y - ast.y);
  if (!b.dueno && !(juego.nave && juego.nave.conBalon) && db.l < ast.radio + RADIO_BALON) {
    const dir = db.l > 0.01 ? db : { x: 0, y: 1 };
    b.x = ast.x + dir.x * (ast.radio + RADIO_BALON);
    b.y = ast.y + dir.y * (ast.radio + RADIO_BALON);
    b.vx = dir.x * 260;
    b.vy = dir.y * 260;
  }
  red.grabar(['r', Math.round(ast.x), Math.round(ast.y)]);   // rocas en el aparato del invitado
  if (!reducirMovimiento) {
    juego.sacudida = Math.max(juego.sacudida, 0.45);
    lanzarRocas(ast);
  }
  sonido.tocar('impacto');
}

const radioCrater = (c) => c.radio * (c.vida < PODER.asteroides.regenera ? c.vida / PODER.asteroides.regenera : 1);

// ---- Aficionado en mini nave: se roba el balón y hay que perseguirlo ----
// El aficionado es hincha del equipo que tocó la cápsula: le roba el balón al
// rival y vuela alto un par de segundos (nadie lo alcanza). Luego baja, huye de
// los rivales y hay que atraparlo para recuperar el balón.
function llamarNave(equipo) {
  const b = juego.balon;
  juego.nave = {
    x: limitar(b.x + azar(-200, 200), 60, CANCHA.largo - 60), y: -80,
    vx: 0, vy: 0, fase: 'llega', t: 0, equipo, conBalon: false, destino: null, cambio: 0
  };
  sonido.tocar('nave');
}

function actualizarNave(dt) {
  const n = juego.nave;
  if (!n) return;
  const b = juego.balon;
  n.t += dt;
  if (n.fase === 'llega') {
    const d = normalizar(b.x - n.x, b.y - n.y);
    n.vx = d.x * PODER.nave.llegada;
    n.vy = d.y * PODER.nave.llegada;
    if (d.l < 16) {
      // Se lleva el balón y sale disparada lejos del que lo tenía
      const robado = b.dueno;
      if (robado) soltarBalon(robado, 0, 0);
      b.dueno = null;
      const lejos = robado ? normalizar(n.x - robado.x, n.y - robado.y) : normalizar(0, 1);
      n.vx = lejos.x * PODER.nave.velocidad * 1.4;
      n.vy = lejos.y * PODER.nave.velocidad * 1.4;
      n.conBalon = true;
      n.fase = 'huye';
      n.t = 0;
      juego.pase = null;
      sonido.tocar('nave-roba');
      anunciar('¡El aficionado se llevó el balón! Persigue la nave.');
    }
  } else if (n.fase === 'huye') {
    n.cambio -= dt;
    if (!n.destino || n.cambio <= 0 || distancia(n, n.destino) < 30) {
      n.destino = destinoNave(n);
      n.cambio = azar(0.9, 1.5);
    }
    const ir = normalizar(n.destino.x - n.x, n.destino.y - n.y);
    let vx = ir.x;
    let vy = ir.y;
    // Es hincha del equipo que la llamó: solo huye de los rivales
    for (const a of jugadoresDeCampo().filter((x) => x.equipo !== n.equipo)) {
      const d = normalizar(n.x - a.x, n.y - a.y);
      if (d.l < PODER.nave.huida) {
        const peso = (1 - d.l / PODER.nave.huida) * 1.6;
        vx += d.x * peso;
        vy += d.y * peso;
      }
    }
    // Cerca de una banda, vuelve hacia el centro para no quedar arrinconada
    if (n.y < 90 || n.y > CANCHA.ancho - 90) vy += (CENTRO.y - n.y) / 150;
    // Los primeros segundos vuela alto y rápido; después baja y se puede atrapar
    const v = normalizar(vx, vy);
    const k = Math.min(1, dt * 4);
    const rapidez = n.t < PODER.nave.ventaja ? PODER.nave.escape : PODER.nave.velocidad;
    n.vx += (v.x * rapidez - n.vx) * k;
    n.vy += (v.y * rapidez - n.vy) * k;
    if (n.t > PODER.nave.dura) {
      n.conBalon = false;
      n.fase = 'se-va';
      b.vx = n.vx * 0.5;
      b.vy = n.vy * 0.5;
      anunciar('La nave soltó el balón.');
    }
  } else {
    n.vx *= 0.9;
    n.vy = -380;
    if (n.y < -140) {
      juego.nave = null;
      return;
    }
  }
  n.x += n.vx * dt;
  n.y += n.vy * dt;
  if (n.fase === 'huye') {
    // No entra a las áreas: los arqueros no la pueden atrapar
    n.x = limitar(n.x, AREA.fondo + 30, CANCHA.largo - AREA.fondo - 30);
    n.y = limitar(n.y, 40, CANCHA.ancho - 40);
  }
  // ¿Alguien la alcanza? (al principio tiene un momento de ventaja para escapar)
  if (n.conBalon && n.t > PODER.nave.ventaja) {
    for (const a of jugadoresDeCampo()) {
      if (a.estado === 'normal' && distancia(a, n) < PODER.nave.alcance) {
        atraparNave(a);
        return;
      }
    }
  }
}

const jugadoresDeCampo = () => juego.equipos.flatMap((eq) => eq.aliens.filter((a) => a.rol !== 'arquero'));

// La nave elige volar hacia el lugar más libre, sobre todo en la mitad
// donde ataca su equipo favorito
function destinoNave(n) {
  const favorito = juego.equipos[n.equipo];
  let mejor = null;
  let mejorLibre = -1;
  for (let i = 0; i < 8; i++) {
    const punto = {
      x: limitar(CENTRO.x + favorito.sentido * azar(-150, 300), AREA.fondo + 40, CANCHA.largo - AREA.fondo - 40),
      y: azar(70, CANCHA.ancho - 70)
    };
    let libre = Infinity;
    for (const a of jugadoresDeCampo()) if (a.equipo !== n.equipo) libre = Math.min(libre, distancia(a, punto));
    if (libre > mejorLibre) {
      mejorLibre = libre;
      mejor = punto;
    }
  }
  return mejor;
}

function atraparNave(a) {
  const n = juego.nave;
  if (!n || !n.conBalon) return;
  n.conBalon = false;
  n.fase = 'se-va';
  tomarBalon(a, 'nave-atrapada');
  anunciar(`${nombreEquipo(a.equipo)} recuperó el balón de la nave.`);
}

// ---- Alienígena de baba: cruza la cancha dejando charcos resbalosos ----
function soltarBabosa(equipo) {
  const rival = juego.equipos[1 - equipo];
  const x = limitar(rival.arcoX + rival.sentido * azar(220, 420), 140, CANCHA.largo - 140);
  const deArriba = Math.random() < 0.5;
  juego.babosa = {
    x, x0: x, y: deArriba ? -30 : CANCHA.ancho + 30,
    vy: (deArriba ? 1 : -1) * (CANCHA.ancho + 60) / PODER.baba.cruce,
    recorrido: 0, t: 0
  };
}

function actualizarBabosa(dt) {
  const s = juego.babosa;
  if (!s) return;
  s.t += dt;
  s.y += s.vy * dt;
  s.x = s.x0 + Math.sin(s.t * 2.2) * 40;
  s.recorrido += Math.abs(s.vy) * dt;
  if (s.recorrido >= PODER.baba.cadaCharco && s.y > 10 && s.y < CANCHA.ancho - 10) {
    s.recorrido = 0;
    juego.charcos.push({ x: s.x, y: s.y, radio: PODER.baba.radio * azar(0.85, 1.15), vida: PODER.baba.charco, semilla: Math.random() * 1000 });
    sonido.tocar('baba');
  }
  if (s.y < -60 || s.y > CANCHA.ancho + 60) juego.babosa = null;
}

const radioCharco = (c) => c.radio * (c.vida < PODER.baba.desvanece ? c.vida / PODER.baba.desvanece : 1);

/* 14. INTELIGENCIA DE ZORP Y DE LOS COMPAÑEROS ============================ */
// Ajustes de juego del equipo: Zorp usa su nivel; los compañeros, uno medio
function ajusteDe(eq) {
  return eq.humano ? NIVELES.normal : juego.ajuste;
}

// Devuelve la velocidad que quiere un alienígena que no maneja una persona
function pensar(a, eq, dt) {
  if (a.distraido > 0) return deambular(a);
  if (a.rol === 'arquero') return iaArquero(a, eq, dt);
  const b = juego.balon;
  if (juego.tutorial && eq.indice === 1) return iaTutorialZorp(a, eq, dt);
  if (b.dueno === a) return iaConBalon(a, eq, dt);
  if (eq.humano) {
    if (juego.pase && juego.pase.hacia === a) return iaRecibir(a);
    // Un balón suelto que le pasa cerca lo va a buscar
    if (!b.dueno && !(juego.nave && juego.nave.conBalon) && distancia(a, b) < 70) return hacia(a, b.x, b.y, VEL_ALIEN, false);
    return iaPosicion(a, eq, dt);
  }
  if (eq.buscador === a.numero && juego.capsula) return hacia(a, juego.capsula.x, juego.capsula.y, VEL_ALIEN * ajusteDe(eq).velocidadZorp, false);
  if (eq.activo === a.numero) return iaActivo(a, eq, dt);
  if (eq.marcador === a.numero) return iaMarcar(a, eq, dt);
  return iaPosicion(a, eq, dt);
}

// Elige qué alienígena de Zorp va por el balón, cuál marca y cuál busca la cápsula
function elegirRoles(eq) {
  const b = juego.balon;
  const campo = eq.aliens.filter((a) => a.rol !== 'arquero');
  const nave = juego.nave && juego.nave.conBalon ? juego.nave : null;
  const objetivo = nave || b;
  const libres = campo.filter((a) => a.estado !== 'aturdido');

  if (b.dueno && b.dueno.equipo === eq.indice && b.dueno.rol !== 'arquero') {
    eq.activo = b.dueno.numero;
  } else if (!(juego.pase && juego.pase.equipo === eq.indice)) {
    let mejor = null;
    for (const a of libres) if (!mejor || distancia(a, objetivo) < distancia(mejor, objetivo)) mejor = a;
    const actual = eq.aliens[eq.activo];
    const actualSirve = actual.rol !== 'arquero' && actual.estado !== 'aturdido';
    if (mejor && (!actualSirve || distancia(mejor, objetivo) + 45 < distancia(actual, objetivo))) eq.activo = mejor.numero;
  }

  // Marcador: el segundo más cerca cuando el rival tiene el balón
  eq.marcador = -1;
  if (b.dueno && b.dueno.equipo !== eq.indice) {
    let mejor = null;
    for (const a of libres) {
      if (a.numero !== eq.activo && (!mejor || distancia(a, b) < distancia(mejor, b))) mejor = a;
    }
    if (mejor) eq.marcador = mejor.numero;
  }

  // Buscador de la cápsula
  eq.buscador = -1;
  if (juego.capsula && eq.vaPorCapsula) {
    let mejor = null;
    for (const a of libres) {
      if (a.numero === eq.activo || a.numero === eq.marcador || b.dueno === a) continue;
      if (!mejor || distancia(a, juego.capsula) < distancia(mejor, juego.capsula)) mejor = a;
    }
    if (mejor) eq.buscador = mejor.numero;
  }
}

// De vez en cuando un alienígena de Zorp se distrae mirando las estrellas
function actualizarDistraccion(a, eq, dt) {
  if (eq.humano) return;
  if (a.distraido > 0) {
    a.distraido -= dt;
    return;
  }
  const aj = juego.ajuste;
  const probabilidad = aj.distraccion * (a.rol === 'arquero' ? 0.5 : 1);
  if (juego.balon.dueno !== a && Math.random() < probabilidad * dt) {
    a.distraido = azar(...aj.duracionDistraccion);
    a.rumbo = azar(0, Math.PI * 2);
  }
}

function deambular(a) {
  return { x: Math.cos(a.rumbo) * VEL_ALIEN * 0.2, y: Math.sin(a.rumbo) * VEL_ALIEN * 0.2 };
}

// Velocidad hacia un punto, frenando al llegar
function hacia(a, x, y, rapidez, frenarAlLlegar = true) {
  const d = normalizar(x - a.x, y - a.y);
  const factor = frenarAlLlegar ? Math.min(1, d.l / 40) : 1;
  return { x: d.x * rapidez * factor, y: d.y * rapidez * factor };
}

// La máquina esquiva huecos y charcos de baba que tiene adelante
function evitarObstaculos(a, deseada) {
  const v = normalizar(deseada.x, deseada.y);
  if (v.l < 1) return deseada;
  let x = v.x;
  let y = v.y;
  const obstaculos = [
    ...juego.crateres.map((c) => ({ x: c.x, y: c.y, radio: radioCrater(c), peso: 1.3 })),
    ...juego.charcos.map((c) => ({ x: c.x, y: c.y, radio: radioCharco(c), peso: 0.6 }))
  ];
  for (const o of obstaculos) {
    const dx = o.x - a.x;
    const dy = o.y - a.y;
    const adelante = dx * v.x + dy * v.y;
    if (adelante < 0 || adelante > 110 + o.radio) continue;
    const lateral = dx * -v.y + dy * v.x;
    const libre = o.radio + RADIO_ALIEN + 8;
    if (Math.abs(lateral) < libre) {
      const lado = lateral > 0 ? -1 : 1;
      const fuerza = ((libre - Math.abs(lateral)) / libre) * o.peso;
      x += -v.y * lado * fuerza;
      y += v.x * lado * fuerza;
    }
  }
  const n = normalizar(x, y);
  return { x: n.x * v.l, y: n.y * v.l };
}

// El que va por el balón: lo intercepta, persigue la nave o presiona al rival
function iaActivo(a, eq, dt) {
  const aj = ajusteDe(eq);
  const b = juego.balon;
  const rapidez = VEL_ALIEN * aj.velocidadZorp;
  const n = juego.nave;
  if (n && n.conBalon) return hacia(a, n.x + n.vx * 0.3, n.y + n.vy * 0.3, rapidez, false);
  if (!b.dueno) {
    const anticipo = Math.min(0.5, distancia(a, b) / 500);
    const px = limitar(b.x + b.vx * anticipo, RADIO_BALON, CANCHA.largo - RADIO_BALON);
    const py = limitar(b.y + b.vy * anticipo, RADIO_BALON, CANCHA.ancho - RADIO_BALON);
    return hacia(a, px, py, rapidez, false);
  }
  return iaPresionar(a, eq, dt, 1);
}

// Presionar: ponerse entre el balón y el arco propio, y derrapar cuando conviene
function iaPresionar(a, eq, dt, factorDerrape) {
  const aj = ajusteDe(eq);
  const b = juego.balon;
  const rapidez = VEL_ALIEN * aj.velocidadZorp;
  const arco = normalizar(eq.arcoX - b.x, CENTRO.y - b.y);
  const d = distancia(a, b);
  a.decision -= dt;
  if (a.decision <= 0) {
    a.decision = aj.reaccion * azar(0.7, 1.3);
    if (d < 88 && a.esperaDerrape <= 0 && Math.random() < aj.derrape * factorDerrape) {
      // Solo derrapa si llega al balón antes que al cuerpo del rival
      const dir = normalizar(b.x + b.vx * 0.12 - a.x, b.y + b.vy * 0.12 - a.y);
      const dueno = b.dueno;
      const alCuerpo = dueno ? (dueno.x - a.x) * dir.x + (dueno.y - a.y) * dir.y : Infinity;
      const alBalon = (b.x - a.x) * dir.x + (b.y - a.y) * dir.y;
      if (alBalon < alCuerpo + 4 && iniciarDerrape(a, dir)) return { x: a.vx, y: a.vy };
    }
  }
  // Si quedó detrás del rival, lo rodea para ponerse delante
  const rel = normalizar(a.x - b.x, a.y - b.y);
  const delante = rel.x * arco.x + rel.y * arco.y;
  if (delante < 0.1 && d < 110) {
    const lado = (rel.x * -arco.y + rel.y * arco.x) >= 0 ? 1 : -1;
    return hacia(a, b.x + arco.x * 50 - arco.y * lado * 55, b.y + arco.y * 50 + arco.x * lado * 55, rapidez, false);
  }
  return hacia(a, b.x + arco.x * 44, b.y + arco.y * 44, rapidez, true);
}

// El que marca cubre el camino al arco y, si el rival se le acerca, también derrapa
function iaMarcar(a, eq, dt) {
  const b = juego.balon;
  if (distancia(a, b) < 90) return iaPresionar(a, eq, dt, 0.5);
  const arco = normalizar(eq.arcoX - b.x, CENTRO.y - b.y);
  const rapidez = VEL_ALIEN * ajusteDe(eq).velocidadZorp * 0.95;
  return hacia(a, b.x + arco.x * 150, b.y + arco.y * 150, rapidez);
}

// Con el balón: conduce hacia el arco, pasa si lo presionan y tira cerca del arco
function iaConBalon(a, eq, dt) {
  const aj = ajusteDe(eq);
  const rapidez = VEL_ALIEN * aj.velocidadZorp;
  const s = eq.sentido;
  const arcoX = s > 0 ? CANCHA.largo : 0;
  a.decision -= dt;
  if (a.decision <= 0) {
    a.decision = aj.reaccion * azar(0.7, 1.3);
    decidirConBalon(a, eq, aj);
  }
  if (a.quiereTirar) {
    const alArco = normalizar(arcoX - a.x, a.apuntarY - a.y);
    if (a.mirarX * alArco.x + a.mirarY * alArco.y > 0.55) {
      a.quiereTirar = false;
      if (tirar(a)) return { x: 0, y: 0 };
    }
    return hacia(a, a.x + alArco.x * 100, a.y + alArco.y * 100, rapidez, false);   // gira hacia el arco
  }
  if (a.quierePasar) {
    a.quierePasar = false;
    if (pasar(a)) return { x: 0, y: 0 };
  }
  return hacia(a, a.meta.x, a.meta.y, rapidez, false);
}

function decidirConBalon(a, eq, aj) {
  const b = juego.balon;
  const s = eq.sentido;
  const arcoX = s > 0 ? CANCHA.largo : 0;
  const rival = juego.equipos[1 - eq.indice];
  const distanciaArco = Math.hypot(arcoX - b.x, CENTRO.y - b.y);

  if (distanciaArco < 300) {
    // Apunta al palo más lejos del arquero rival (con algo de error según el nivel)
    const arquero = rival.aliens[0];
    const lado = arquero.y < CENTRO.y ? 1 : -1;
    a.apuntarY = CENTRO.y + lado * (ARCO.boca / 2 - 22) + azar(-aj.errorTiro, aj.errorTiro);
    const meta = { x: arcoX, y: a.apuntarY };
    const tapado = rival.aliens.some((r) => r.rol !== 'arquero' && distanciaASegmento(r, b, meta) < RADIO_ALIEN + 8);
    if (!tapado || distanciaArco < 190) {
      a.quiereTirar = true;
      return;
    }
  }

  // ¿Hay un rival delante y cerca? Pasa o lo esquiva
  let cercano = null;
  for (const r of rival.aliens) {
    if (r.rol === 'arquero' || r.estado === 'aturdido') continue;
    if (!cercano || distancia(r, a) < distancia(cercano, a)) cercano = r;
  }
  let metaY = CENTRO.y + (a.y - CENTRO.y) * 0.5;
  if (cercano && distancia(cercano, a) < 100 && (cercano.x - a.x) * s > -10) {
    if (juego.reloj - eq.ultimoPase > 1.2 && Math.random() < aj.probPase) {
      a.quierePasar = true;
      return;
    }
    metaY = a.y + (a.y < cercano.y ? -170 : 170);
  }
  a.meta = { x: a.x + s * 240, y: limitar(metaY, 60, CANCHA.ancho - 60) };
}

// Arquero: se mueve sobre su línea siguiendo el balón, sale si está cerca y reparte
function iaArquero(a, eq, dt) {
  const aj = eq.humano ? ARQUERO_AMIGO : juego.ajuste.arquero;
  const b = juego.balon;
  const s = eq.sentido;
  const lineaX = eq.arcoX + s * 24;
  if (b.dueno === a) {
    a.sostener -= dt;
    if (a.sostener <= 0) {
      if (!pasar(a)) despejar(a, eq);
      return { x: 0, y: 0 };
    }
    return hacia(a, lineaX + s * 30, CENTRO.y, VEL_ALIEN * 0.4);
  }
  a.decision -= dt;
  if (a.decision <= 0) {
    a.decision = aj.reaccion;
    let yObjetivo = CENTRO.y + (b.y - CENTRO.y) * 0.55;
    let xObjetivo = lineaX;
    const vieneHacia = -b.vx * s;               // positivo si viene al arco propio
    const lejos = (b.x - lineaX) * s;
    if (!b.dueno && vieneHacia > 80 && lejos > 0) {
      const t = lejos / vieneHacia;
      if (t < 1.4) yObjetivo = b.y + b.vy * t;
    }
    yObjetivo = limitar(yObjetivo, ARCO_ARRIBA - 4, ARCO_ABAJO + 4);
    // Balón suelto y lento (o un rival con el balón) dentro del área: sale a buscarlo
    const rivalConBalon = b.dueno && b.dueno.equipo !== eq.indice;
    const lento = !b.dueno && Math.hypot(b.vx, b.vy) < 260;
    const tutorialQuieto = juego.tutorial && eq.indice === 1;
    if (!tutorialQuieto && (lento || rivalConBalon) && dentroDelArea(b, eq, 0) && distancia(a, b) < 190) {
      xObjetivo = b.x;
      yObjetivo = b.y;
    }
    a.objetivo = { x: xObjetivo, y: yObjetivo };
  }
  return hacia(a, a.objetivo.x, a.objetivo.y, VEL_ALIEN * aj.velocidad);
}

// Compañero que recibe un pase: va al encuentro del balón y lo espera
function iaRecibir(a) {
  const b = juego.balon;
  if (distancia(a, b) < 48) return { x: 0, y: 0 };
  return hacia(a, b.x + b.vx * 0.3, b.y + b.vy * 0.3, VEL_ALIEN);
}

// Los que no van por el balón se ubican solos, sin estorbar
function iaPosicion(a, eq, dt) {
  const b = juego.balon;
  const s = eq.sentido;
  const avance = (b.x - eq.arcoX) * s;          // qué tan lejos del arco propio está el balón
  let x;
  let y;
  if (a.rol === 'defensa') {
    x = eq.arcoX + s * limitar(avance - 260, 140, 480);
    y = CENTRO.y + (b.y - CENTRO.y) * 0.5;
  } else if (a.rol === 'volante') {
    x = eq.arcoX + s * limitar(avance - 50, 240, 680);
    y = b.y < CENTRO.y ? b.y + 170 : b.y - 170;
  } else {
    x = eq.arcoX + s * limitar(avance + 180, 400, 870);
    y = b.y < CENTRO.y ? CENTRO.y + 150 : CENTRO.y - 150;
  }

  // No estorbar al compañero que lleva la jugada, ni a los demás
  const lider = eq.aliens[eq.humano ? eq.controlado : eq.activo];
  for (const otro of eq.aliens) {
    if (otro === a || otro.rol === 'arquero') continue;
    const espacio = otro === lider ? 120 : 95;
    const ref = otro === lider ? otro : otro.objetivo;
    const d = normalizar(x - ref.x, y - ref.y);
    if (d.l < espacio) {
      const dir = d.l > 1 ? d : { x: 0, y: y < CENTRO.y ? -1 : 1 };
      x = ref.x + dir.x * espacio;
      y = ref.y + dir.y * espacio;
    }
  }
  const db = normalizar(x - b.x, y - b.y);
  if (db.l < 90) {
    const dir = db.l > 1 ? db : { x: -s, y: 0 };
    x = b.x + dir.x * 90;
    y = b.y + dir.y * 90;
  }
  x = limitar(x, 40, CANCHA.largo - 40);
  y = limitar(y, 40, CANCHA.ancho - 40);

  // Suaviza el objetivo para que no tiemble
  const k = Math.min(1, dt * 3);
  a.objetivo.x += (x - a.objetivo.x) * k;
  a.objetivo.y += (y - a.objetivo.y) * k;
  const rapidez = VEL_ALIEN * (eq.humano ? 0.9 : juego.ajuste.velocidadZorp * 0.92);
  return hacia(a, a.objetivo.x, a.objetivo.y, rapidez);
}

/* 15. TUTORIAL ============================================================ */
const PASOS_TUTORIAL = [
  { id: 'mover', texto: 'Muévete con W A S D o con el joystick. Siempre manejas al alienígena de tu equipo más cercano al balón: el aro brillante te muestra cuál es.' },
  { id: 'tomar', texto: 'Ve hasta el balón y tócalo: se queda pegado a tu pie.' },
  { id: 'pase', texto: 'Pásale el balón a un compañero: toca F (o el botón Patear) una vez, rapidito. El control salta al que recibe.' },
  { id: 'gol', texto: 'Lleva el balón al arco de Zorp, mantén apretado F (o Patear) y suelta: más tiempo = tiro más fuerte. Para elegir palo, mantén la dirección hacia ese lado.' },
  { id: 'robo', texto: 'Zorp tiene el balón. Ponte delante de él y derrapa con G o con el botón Derrapar.' },
  { id: 'poder', texto: 'Toca la cápsula de poder. Los asteroides dejan huecos: rodéalos. La cancha se arregla sola.' }
];

function iniciarTutorial() {
  prepararSaque(0, 0);
  const b = juego.balon;
  b.dueno = null;
  b.x = CENTRO.x - 170;
  b.y = CENTRO.y + 150;
  juego.estado = 'jugando';
  juego.tutorial.paso = 0;
  juego.tutorial.recorrido = 0;
  juego.tutorial.espera = 0;
  juego.tutorial.zorpJuega = false;
  mostrarPasoTutorial();
}

function mostrarPasoTutorial() {
  const t = juego.tutorial;
  dom.tutorialPaso.textContent = `Paso ${t.paso + 1} de ${PASOS_TUTORIAL.length}`;
  dom.tutorialTexto.textContent = PASOS_TUTORIAL[t.paso].texto;
}

// Algo pasó en el juego: si era lo que pedía el paso, se cumple
function tutorialEvento(tipo) {
  const t = juego.tutorial;
  if (!t || t.espera > 0 || t.paso >= PASOS_TUTORIAL.length) return;
  if (PASOS_TUTORIAL[t.paso].id !== tipo) return;
  t.espera = tipo === 'poder' ? 3.5 : 1.2;
  sonido.tocar('tutorial-paso');
  dom.tutorialTexto.textContent = tipo === 'poder' ? '¡Muy bien! Mira cómo caen los asteroides.' : '¡Bien hecho!';
}

function actualizarTutorial(dt) {
  const t = juego.tutorial;
  if (PASOS_TUTORIAL[t.paso]?.id === 'mover') {
    const a = juego.equipos[0].aliens[juego.equipos[0].controlado];
    t.recorrido += Math.hypot(a.vx, a.vy) * dt;
    if (t.recorrido > 160) tutorialEvento('mover');
  }
  // Con el cambio automático puedes llegar al paso "tomar" con el balón ya en
  // los pies (lo agarraste mientras te movías): en ese caso el paso ya está hecho.
  if (PASOS_TUTORIAL[t.paso]?.id === 'tomar') {
    const dueno = juego.balon.dueno;
    if (dueno && dueno.equipo === 0 && esManejado(dueno)) tutorialEvento('tomar');
  }
  if (t.espera > 0) {
    t.espera -= dt;
    if (t.espera <= 0) siguientePasoTutorial();
  }
}

function siguientePasoTutorial() {
  const t = juego.tutorial;
  if (!t) return;
  t.espera = 0;
  t.paso += 1;
  if (t.paso >= PASOS_TUTORIAL.length) {
    terminarTutorial();
    return;
  }
  prepararPasoTutorial(PASOS_TUTORIAL[t.paso].id);
  mostrarPasoTutorial();
  anunciar(PASOS_TUTORIAL[t.paso].texto);
}

// Acomoda la cancha para cada paso
function prepararPasoTutorial(id) {
  const t = juego.tutorial;
  const b = juego.balon;
  const equipo = juego.equipos[0];
  const yo = equipo.aliens[equipo.controlado];
  if (juego.estado !== 'jugando') {
    juego.estado = 'jugando';
    ponerMensaje('');
  }
  if ((id === 'pase' || id === 'gol') && (!b.dueno || b.dueno.equipo !== 0)) {
    juego.nave = null;
    b.dueno = yo;
    pegarBalon(yo, 0);
  }
  if (id === 'robo') {
    t.zorpJuega = true;
    const zorp = juego.equipos[1].aliens[3];
    colocar(zorp, CENTRO.x + 40, CENTRO.y);
    colocar(yo, CENTRO.x - 160, CENTRO.y + 30);
    b.dueno = zorp;
    juego.pase = null;
    pegarBalon(zorp, 0);
  }
  if (id === 'poder') {
    t.zorpJuega = false;
    crearCapsula('asteroides', limitar(yo.x + 130, 200, CANCHA.largo - 200), limitar(yo.y, 90, CANCHA.ancho - 90));
  }
}

// En el tutorial Zorp casi no juega: solo pasea con el balón en el paso del derrape
function iaTutorialZorp(a) {
  const b = juego.balon;
  if (b.dueno === a) {
    const t = juego.reloj;
    return hacia(a, CENTRO.x + Math.cos(t * 0.6) * 160, CENTRO.y + Math.sin(t * 0.6) * 120, VEL_ALIEN * 0.4, false);
  }
  return { x: 0, y: 0 };
}

function terminarTutorial() {
  juego.estado = 'final';
  juego.terminoTutorial = true;
  dom.tutorial.hidden = true;
  ponerMensaje('');
  dom.tituloFinal.textContent = '¡Tutorial completado!';
  dom.textoFinal.textContent = 'Ya sabes moverte, pasar, tirar, derrapar y usar poderes. ¡A ganarle a Zorp!';
  dom.imagenFinal.src = IMAGENES.cometa;
  dom.imagenFinal.alt = 'Capitán celeste de tu equipo';
  dom.botonOtraVez.textContent = 'Elegir nivel';
  dom.logrosFinal.hidden = true;
  sonido.tocar('victoria');
  mostrarFinal();
}

/* 16. REGLAS: GOLES, BALÓN NUEVO Y FINAL ================================== */
function revisarGol() {
  const b = juego.balon;
  if (juego.nave && juego.nave.conBalon) return false;
  const enBoca = b.y > ARCO_ARRIBA && b.y < ARCO_ABAJO;
  if (!enBoca) return false;
  if (b.x < -RADIO_BALON) { gol(1); return true; }
  if (b.x > CANCHA.largo + RADIO_BALON) { gol(0); return true; }
  return false;
}

function gol(equipoAnota) {
  const b = juego.balon;
  if (b.dueno) {
    b.dueno = null;
    b.vx = equipoAnota === 0 ? 120 : -120;
  }
  juego.marcador[equipoAnota] += 1;
  juego.estado = 'gol';
  juego.tiempoEstado = 2.2;
  juego.saqueEquipo = 1 - equipoAnota;
  juego.equipoQueAnoto = equipoAnota;
  juego.capsula = null;
  juego.nave = null;
  pintarMarcador();

  const unJugador = juego.modo === '1j';
  const enLinea = juego.modo === 'red';
  let nombre = unJugador ? (equipoAnota === 0 ? 'tu equipo' : 'Zorp') : `el jugador ${equipoAnota + 1}`;
  if (enLinea) nombre = nombreVisible(equipoAnota);
  ponerMensaje('¡GOL!');
  // En línea suena desde el lado del anfitrión; el invitado lo da vuelta
  sonido.tocar((unJugador || enLinea) && equipoAnota === 1 ? 'gol-rival' : 'gol');
  anunciar(`¡Gol de ${nombre}!`, true);

  // Fiesta de píxeles (no se hace con "reducir movimiento")
  red.grabar(['p', equipoAnota]);
  if (!reducirMovimiento) {
    juego.sacudida = 1;
    lanzarParticulas(equipoAnota);
  }

  if (equipoAnota === 0) tutorialEvento('gol');
  // Logros (solo 1 jugador, goles de tu equipo)
  if (unJugador && equipoAnota === 0) {
    desbloquear('primer-gol');
    if (juego.cadena[0] >= 3) desbloquear('tiki-taka');
    if (juego.tiempoDesdeSaque < 6) desbloquear('relampago');
  }
  juego.peorDiferencia = Math.max(juego.peorDiferencia, juego.marcador[1] - juego.marcador[0]);
}

// Si el balón no cruza la mitad en 8 segundos, sale un balón nuevo.
// Mientras la nave del aficionado tiene el balón, el reloj se detiene.
function revisarMitad(dt) {
  if (juego.nave && juego.nave.conBalon) return;
  const lado = juego.balon.x < CENTRO.x ? 0 : 1;
  if (lado !== juego.ladoBalon) {
    juego.ladoBalon = lado;
    juego.tiempoMitad = 0;
  } else {
    juego.tiempoMitad += dt;
  }
  pintarReloj();
  if (juego.tiempoMitad >= SEGUNDOS_MITAD) balonNuevo();
}

function balonNuevo() {
  juego.estado = 'balonNuevo';
  juego.tiempoEstado = 1.3;
  const ultimo = juego.balon.ultimo;
  juego.saqueEquipo = ultimo ? 1 - ultimo.equipo : 0;
  juego.balon.dueno = null;
  ponerMensaje('¡Balón nuevo!', true);
  sonido.tocar('balon-nuevo');
  anunciar('Balón nuevo: no cruzó la mitad en 8 segundos.');
}

function terminarPartida() {
  juego.estado = 'final';
  ponerMensaje('');
  const [a, b] = juego.marcador;
  const ganador = a > b ? 0 : 1;
  const unJugador = juego.modo === '1j';

  if (unJugador && ganador === 0) {
    desbloquear('victoria', false);
    if (b === 0) desbloquear('arco-blindado', false);
    if (juego.nivel === 'dificil') desbloquear('dificil', false);
    if (juego.peorDiferencia >= 2) desbloquear('remontada', false);
  }

  red.grabar(['f', ganador]);   // en línea: el invitado arma su propia pantalla final
  pintarFinal(ganador);
}

// Pantalla final. "conSonido" es falso en el invitado (el sonido le llega por internet).
function pintarFinal(ganador, conSonido = true) {
  juego.estado = 'final';
  const partidos = guardarEnHistorial(ganador);   // historial y récords (versiones 3.8 y 3.9)
  pintarPuntajeFinal(partidos);
  const [a, b] = juego.marcador;
  const unJugador = juego.modo === '1j';
  dom.botonOtraVez.hidden = false;
  if (juego.modo === 'red') {
    const mio = red.miEquipo();
    dom.tituloFinal.textContent = ganador === mio ? '¡Ganaste!' : `¡Ganó ${nombreJugador(ganador)}!`;
    dom.textoFinal.textContent = `${nombreVisible(0)} ${a} - ${b} ${nombreVisible(1)}.`;
    dom.imagenFinal.src = ganador === mio ? IMAGENES.medalla : IMAGENES.zorpTriste;
    dom.imagenFinal.alt = ganador === mio ? 'Medalla de campeón' : 'Alienígena triste por perder';
  } else if (unJugador) {
    dom.tituloFinal.textContent = ganador === 0 ? '¡Ganaste!' : '¡Ganó Zorp!';
    dom.textoFinal.textContent = ganador === 0
      ? `Le ganaste a Zorp ${a} a ${b} en nivel ${juego.ajuste.nombre.toLowerCase()}.`
      : `Zorp ganó ${b} a ${a}. ¡La revancha te espera!`;
    dom.imagenFinal.src = ganador === 0 ? IMAGENES.zorpTriste : IMAGENES.zorp;
    dom.imagenFinal.alt = ganador === 0 ? 'Zorp, triste por perder' : 'Zorp, feliz por ganar';
  } else {
    dom.tituloFinal.textContent = `¡Ganó ${nombreJugador(ganador)}!`;
    dom.textoFinal.textContent = `${nombreJugador(0)} ${a} - ${b} ${nombreJugador(1)}.`;
    dom.imagenFinal.src = ganador === 0 ? IMAGENES.cometa : IMAGENES.zorp;
    dom.imagenFinal.alt = `Alienígena del equipo de ${nombreJugador(ganador)} celebrando`;
  }
  dom.botonOtraVez.textContent = juego.modo === 'red' ? 'Revancha' : 'Jugar otra vez';
  if (conSonido) sonido.tocar((unJugador || juego.modo === 'red') && ganador === 1 ? 'derrota' : 'victoria');

  // Logros que se ganaron en esta partida
  dom.listaLogrosFinal.replaceChildren(...juego.logrosNuevos.map((logro) => {
    const item = document.createElement('li');
    item.textContent = `${logro.nombre}: ${logro.descripcion}`;
    return item;
  }));
  dom.logrosFinal.hidden = juego.logrosNuevos.length === 0;
  dom.notificaciones.replaceChildren();
  mostrarFinal();
}

// ---- Historial de partidos y récords (versiones 3.8 y 3.9) ----
// Cada partido terminado se guarda en localStorage (clave galaxyGol.historial)
// como JSON. Puntaje = 100 por gol a favor − 50 por gol en contra + bono por ganar.
// El tutorial no se guarda. En línea cada aparato guarda su propio partido.
// Versión 3.9: con 2 jugadores se guarda a los dos (cada uno con su puntaje),
// y "Mejores puntajes" muestra a cada jugador una sola vez, con su mayor puntaje.
const BONO_GANAR = { facil: 300, normal: 600, dificil: 1000, '2j': 500, red: 500 };
const MAX_HISTORIAL = 100;

// ¿Es el mismo nombre? (sin importar mayúsculas ni espacios de más)
const mismoNombre = (a, b) => String(a ?? '').trim().toLowerCase() === String(b ?? '').trim().toLowerCase();
const NOMBRE_MODO = { '1j': 'contra Zorp', '2j': '2 jugadores', red: 'en línea' };

function leerHistorial() {
  const lista = almacen.leer(CLAVE_HISTORIAL, []);
  if (!Array.isArray(lista)) return [];
  return lista.filter((p) => p && typeof p.puntaje === 'number' && Array.isArray(p.marcador));
}

// Guarda el partido y devuelve la lista de lo guardado (1 o 2 registros)
function guardarEnHistorial(ganador) {
  if (juego.tutorial || juego.historialGuardado) return [];
  juego.historialGuardado = true;
  // De quién es el partido: 1 jugador = tú; en línea = tu equipo;
  // 2 jugadores = los dos (primero el que ganó)
  const lados = juego.modo === '2j' ? [ganador, 1 - ganador] : [juego.modo === 'red' ? red.miEquipo() : 0];
  const claveBono = juego.modo === '1j' ? juego.nivel : juego.modo;
  const anteriores = leerHistorial();
  const mejorDeTodos = Math.max(0, ...anteriores.map((p) => p.puntaje));
  const fecha = Date.now();
  const nuevos = lados.map((mio, i) => {
    const rival = 1 - mio;
    const favor = juego.marcador[mio];
    const contra = juego.marcador[rival];
    const gano = ganador === mio;
    const partido = {
      fecha,
      modo: juego.modo,
      nivel: juego.modo === '1j' ? juego.nivel : null,
      jugador: nombreJugador(mio),
      rival: juego.modo === '1j' ? 'Zorp' : nombreJugador(rival),
      marcador: [favor, contra],
      gano,
      puntaje: Math.max(0, favor * 100 - contra * 50 + (gano ? BONO_GANAR[claveBono] || 0 : 0)),
      segundos: Math.round(juego.reloj)
    };
    // El mismo partido visto por el otro jugador: cuenta en su récord, pero no se repite en "Últimos partidos"
    if (i > 0) partido.espejo = true;
    const suyos = anteriores.filter((p) => mismoNombre(p.jugador, partido.jugador));
    const mejorSuyo = Math.max(0, ...suyos.map((p) => p.puntaje));
    partido.record = partido.puntaje > 0 && partido.puntaje > mejorDeTodos;
    partido.recordPersonal = !partido.record && suyos.length > 0 && partido.puntaje > mejorSuyo;
    return partido;
  });
  almacen.guardar(CLAVE_HISTORIAL, [...nuevos, ...anteriores].slice(0, MAX_HISTORIAL));
  return nuevos;
}

function pintarPuntajeFinal(partidos) {
  if (!dom.puntajeFinal) return;
  dom.puntajeFinal.hidden = partidos.length === 0;
  dom.puntajeFinal.textContent = partidos.map((p) => `${p.jugador}: ${p.puntaje} puntos` +
    (p.record ? ' · ¡Nuevo récord!' : p.recordPersonal ? ' · ¡Récord personal!' : '')).join('   |   ');
}

// Junta los partidos por jugador: mayor puntaje, partidos y ganados (versión 3.9)
function rankingPorJugador(lista) {
  const porNombre = new Map();
  for (const p of lista) {
    const clave = String(p.jugador).trim().toLowerCase();
    const fila = porNombre.get(clave) || { nombre: p.jugador, mejor: 0, partidos: 0, ganados: 0 };
    fila.partidos += 1;
    if (p.gano) fila.ganados += 1;
    fila.mejor = Math.max(fila.mejor, p.puntaje);
    porNombre.set(clave, fila);
  }
  return [...porNombre.values()].sort((a, b) => b.mejor - a.mejor || b.ganados - a.ganados);
}

// Mayor puntaje de una persona (para la pantalla "Perfiles")
function datosDeJugador(nombre, lista = leerHistorial()) {
  return rankingPorJugador(lista.filter((p) => mismoNombre(p.jugador, nombre)))[0] || null;
}

// Texto de un partido para las listas (nombres como texto, nunca como HTML)
function textoPartido(p) {
  const fecha = new Date(p.fecha).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
  const nivel = p.nivel && NIVELES[p.nivel] ? ` (${NIVELES[p.nivel].nombre.toLowerCase()})` : '';
  return `${p.jugador} ${p.marcador[0]} - ${p.marcador[1]} ${p.rival} · ${NOMBRE_MODO[p.modo] || ''}${nivel} · ${fecha}`;
}

function filaRecord(p, izquierda) {
  const item = document.createElement('li');
  item.className = p.gano ? 'record ganado' : 'record';
  const marca = document.createElement('span');
  marca.className = 'record-marca';
  marca.textContent = izquierda;
  const texto = document.createElement('span');
  texto.className = 'record-texto';
  texto.textContent = textoPartido(p);
  const puntos = document.createElement('span');
  puntos.className = 'record-puntos';
  puntos.textContent = `${p.puntaje} pts`;
  item.append(marca, texto, puntos);
  return item;
}

// Una fila del ranking: medalla o puesto, nombre, partidos y mayor puntaje
function filaRanking(fila, puesto) {
  const item = document.createElement('li');
  item.className = puesto < 3 ? 'record ganado' : 'record';
  const marca = document.createElement('span');
  marca.className = 'record-marca';
  marca.textContent = ['🥇', '🥈', '🥉'][puesto] || `${puesto + 1}.`;
  const texto = document.createElement('span');
  texto.className = 'record-texto';
  const nombre = document.createElement('strong');
  nombre.textContent = fila.nombre;
  texto.append(nombre, ` · ${fila.partidos} ${fila.partidos === 1 ? 'partido' : 'partidos'} · ${fila.ganados} ${fila.ganados === 1 ? 'ganado' : 'ganados'}`);
  const puntos = document.createElement('span');
  puntos.className = 'record-puntos';
  puntos.textContent = `${fila.mejor} pts`;
  item.append(marca, texto, puntos);
  return item;
}

// Pinta la pantalla "Récords": ranking por jugador, últimos partidos y resumen
function pintarRecords() {
  const lista = leerHistorial();
  const ranking = rankingPorJugador(lista).slice(0, 10);
  const partidos = lista.filter((p) => !p.espejo);
  dom.listaMejores.replaceChildren(...ranking.map((fila, i) => filaRanking(fila, i)));
  dom.listaHistorial.replaceChildren(...partidos.slice(0, 10).map((p) => filaRecord(p, p.gano ? 'Ganó' : 'Perdió')));
  dom.resumenRecords.textContent = lista.length
    ? `Partidos: ${partidos.length} · Jugadores: ${rankingPorJugador(lista).length} · Mejor puntaje: ${ranking[0].mejor} (${ranking[0].nombre})`
    : '';
  dom.sinPartidos.hidden = lista.length > 0;
  dom.listaMejores.hidden = lista.length === 0;
  dom.listaHistorial.hidden = lista.length === 0;
}

// Reiniciar estadísticas: hay que tocar dos veces para no borrar por error
let confirmarReinicio = 0;
dom.botonReiniciarRecords.addEventListener('click', () => {
  if (!confirmarReinicio) {
    dom.botonReiniciarRecords.textContent = '¿Seguro? Toca otra vez para borrar';
    confirmarReinicio = window.setTimeout(() => {
      confirmarReinicio = 0;
      dom.botonReiniciarRecords.textContent = 'Reiniciar estadísticas';
    }, 3000);
    return;
  }
  window.clearTimeout(confirmarReinicio);
  confirmarReinicio = 0;
  almacen.guardar(CLAVE_HISTORIAL, []);
  dom.botonReiniciarRecords.textContent = 'Reiniciar estadísticas';
  pintarRecords();
  anunciar('Estadísticas reiniciadas.', false, true);
});

function mostrarFinal() {
  teclas.clear();
  soltarJoysticks();
  dom.partida.inert = true;
  dom.final.hidden = false;
  dom.tituloFinal.focus();
}

// ---- Textos de la pantalla de partida ----
function pintarMarcador() {
  dom.goles[0].textContent = juego.marcador[0];
  dom.goles[1].textContent = juego.marcador[1];
}

function pintarReloj() {
  const quedan = limitar(Math.ceil(SEGUNDOS_MITAD - juego.tiempoMitad), 0, SEGUNDOS_MITAD);
  if (quedan === juego.segundosPintados) return;
  juego.segundosPintados = quedan;
  [...dom.segmentos.children].forEach((segmento, i) => segmento.classList.toggle('apagado', i >= quedan));
  dom.segmentos.classList.toggle('urgente', quedan <= 3);
}

// Mensaje grande sobre la cancha. "segundos" lo borra solo después de un rato.
function ponerMensaje(texto, chico = false, segundos = 0) {
  red.grabar(['m', texto, chico, segundos]);
  dom.mensaje.textContent = '';
  dom.mensaje.classList.toggle('chico', chico);
  if (texto) {
    void dom.mensaje.offsetWidth;   // reinicia la animación de aparición
    dom.mensaje.textContent = texto;
  }
  juego.mensajeHasta = segundos ? juego.reloj + segundos : 0;
}

/* 17. DIBUJO EN EL CANVAS ================================================= */
const vista = { vertical: false, escala: 1 };
const sprites = {};
const arte = {};
const hojas = {};

// Ajusta el canvas al espacio disponible. Si el espacio es más alto que ancho
// (celular vertical), la cancha se dibuja de pie.
function ajustarCanvas() {
  if (dom.partida.hidden) return;
  const caja = dom.zona.getBoundingClientRect();
  if (caja.width < 20 || caja.height < 20) return;
  const vertical = caja.height > caja.width * 1.05;
  const anchoMundo = vertical ? VISTA.alto : VISTA.ancho;
  const altoMundo = vertical ? VISTA.ancho : VISTA.alto;
  const escalaCss = Math.min(caja.width / anchoMundo, caja.height / altoMundo);
  const densidad = Math.min(window.devicePixelRatio || 1, 2);
  const ancho = Math.max(1, Math.floor(anchoMundo * escalaCss * densidad));
  const alto = Math.max(1, Math.floor(altoMundo * escalaCss * densidad));
  if (dom.canvas.width !== ancho) dom.canvas.width = ancho;
  if (dom.canvas.height !== alto) dom.canvas.height = alto;
  vista.vertical = vertical;
  vista.escala = ancho / anchoMundo;
}

// Del mundo a la pantalla (en píxeles del canvas)
function aPantalla(x, y) {
  const e = vista.escala;
  if (vista.vertical) return { x: (y + MARGEN.y) * e, y: (CANCHA.largo + MARGEN.x - x) * e };
  return { x: (x + MARGEN.x) * e, y: (y + MARGEN.y) * e };
}

// Convierte una dirección de la pantalla (lo que aprieta la persona) al mundo
function direccionEnMundo(x, y) {
  return vista.vertical ? { x: -y, y: x } : { x, y };
}

function direccionEnPantalla(x, y) {
  return vista.vertical ? { x: y, y: -x } : { x, y };
}

// Lienzo pequeño para pintar arte pixelado una sola vez
function lienzoPixel(ancho, alto, pintar) {
  const lienzo = document.createElement('canvas');
  lienzo.width = ancho;
  lienzo.height = alto;
  const pincel = lienzo.getContext('2d');
  pintar((x, y, color) => {
    pincel.fillStyle = color;
    pincel.fillRect(x, y, 1, 1);
  });
  return lienzo;
}

// Prepara los dibujos pixelados de los alienígenas (cada equipo, variante y pies).
// Se rehace al empezar cada partida, con el color de cada equipo.
function crearSprites() {
  [0, 1].forEach((equipo) => {
    const colores = coloresCuerpo(juego.colores[equipo]);
    for (const [variante, cuerpo] of Object.entries(CUERPOS)) {
      for (const [nombrePies, pies] of Object.entries(PIES)) {
        sprites[`${equipo}-${variante}-${nombrePies}`] = lienzoPixel(12, 12, (p) => {
          [...cuerpo, pies].forEach((fila, y) => {
            [...fila].forEach((letra, x) => {
              if (letra !== '.') p(x, y, colores[letra]);
            });
          });
        });
      }
    }
  });
  crearArteNave();
}

// Arte pixelado de los poderes: babosa, cápsulas, nave y asteroide
function crearArteObjetos() {
  // Babosa: 4 cuadros que se estiran y se encogen
  arte.babosa = [1, 1.1, 1, 0.9].map((estirar) => lienzoPixel(16, 12, (p) => {
    const rx = 7.2 * estirar;
    const ry = 4.4 / estirar;
    const dentro = (x, y) => ((x + 0.5 - 8) / rx) ** 2 + ((y + 0.5 - 7.4) / ry) ** 2 <= 1;
    for (let y = 0; y < 12; y++) {
      for (let x = 0; x < 16; x++) {
        if (!dentro(x, y)) continue;
        const borde = !dentro(x - 1, y) || !dentro(x + 1, y) || !dentro(x, y - 1) || !dentro(x, y + 1);
        p(x, y, borde ? COLORES['baba-oscuro'] : COLORES.baba);
      }
    }
    // Antenas con ojos
    for (const ox of [5, 10]) {
      p(ox, 2, COLORES['baba-oscuro']);
      p(ox, 0, COLORES.ojo);
      p(ox + (ox === 5 ? -1 : 1), 1, COLORES.ojo);
      p(ox, 1, COLORES.pupila);
    }
    p(7, 8, COLORES.boca);
    p(8, 8, COLORES.boca);
    p(6, 6, COLORES.ojo);
  }));

  // Cápsulas: mitad de color, mitad blanca, con un icono
  arte.capsula = {};
  const colorCapsula = { asteroides: COLORES['franja-3'], nave: COLORES.foco, baba: COLORES.baba };
  for (const tipo of ['asteroides', 'nave', 'baba']) {
    arte.capsula[tipo] = [0, 1].map((cuadro) => lienzoPixel(10, 16, (p) => {
      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 10; x++) {
          const esquina = (y < 2 || y > 13) && (x < 2 || x > 7);
          const punta = (y === 0 || y === 15) && (x < 3 || x > 6);
          if (esquina || punta) continue;
          const borde = x === 0 || x === 9 || y === 0 || y === 15 || ((y === 1 || y === 14) && (x === 1 || x === 8))
            || (y === 0 || y === 15) || ((y === 2 || y === 13) && (x === 1 || x === 8));
          p(x, y, borde ? COLORES.espacio : (y < 8 ? colorCapsula[tipo] : COLORES.texto));
        }
      }
      p(2 + cuadro, 3, COLORES.ojo);       // brillo que se mueve
      p(2 + cuadro, 4, COLORES.ojo);
      // Iconos
      if (tipo === 'asteroides') {
        [[4, 4], [5, 4], [4, 5], [5, 5], [6, 3], [3, 6]].forEach(([x, y]) => p(x, y, COLORES['roca-oscura']));
        [[6, 10], [3, 11], [5, 12]].forEach(([x, y]) => p(x, y, COLORES['franja-3']));
      } else if (tipo === 'nave') {
        [[4, 4], [5, 4]].forEach(([x, y]) => p(x, y, COLORES['nave-cupula']));
        [[2, 5], [3, 5], [4, 5], [5, 5], [6, 5], [7, 5]].forEach(([x, y]) => p(x, y, COLORES.espacio));
        [[4, 10], [5, 10], [4, 11], [5, 11]].forEach(([x, y]) => p(x, y, COLORES.foco));
      } else {
        [[4, 3], [4, 4], [5, 4], [3, 5], [4, 5], [5, 5], [6, 5], [4, 6], [5, 6]].forEach(([x, y]) => p(x, y, COLORES['baba-oscuro']));
        [[3, 10], [6, 11], [4, 12]].forEach(([x, y]) => p(x, y, COLORES.baba));
      }
    }));
  }

  // Asteroide: roca con cráteres pequeños
  arte.asteroide = lienzoPixel(10, 10, (p) => {
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 10; x++) {
        const d = Math.hypot(x - 4.5, y - 4.5);
        if (d > 4.6) continue;
        p(x, y, d > 3.6 ? COLORES['roca-oscura'] : COLORES.roca);
      }
    }
    [[3, 3], [6, 5], [4, 7]].forEach(([x, y]) => p(x, y, COLORES['roca-oscura']));
    p(2, 2, COLORES['franja-1']);
  });
}

// Nave del aficionado: platillo con cúpula y un fan del color de su equipo
// (se rehace con crearSprites, porque depende del color de cada equipo)
function crearArteNave() {
  arte.nave = [0, 1].map((equipo) => [0, 1].map((cuadro) => lienzoPixel(20, 14, (p) => {
    const fan = colorDe(equipo);
    for (let y = 1; y < 7; y++) {
      for (let x = 5; x < 15; x++) {
        if (((x - 9.5) / 4.6) ** 2 + ((y - 6.5) / 5.6) ** 2 <= 1) p(x, y, COLORES['nave-cupula']);
      }
    }
    // Aficionado dentro de la cúpula
    [[8, 4], [9, 4], [10, 4], [11, 4], [8, 5], [9, 5], [10, 5], [11, 5], [8, 6], [11, 6]].forEach(([x, y]) => p(x, y, fan));
    p(9, 4, COLORES.ojo);
    p(10, 4, COLORES.ojo);
    // Bandera que se mueve
    const bx = cuadro ? 13 : 12;
    p(bx, 2, COLORES['franja-1']);
    p(bx + 1, 2, COLORES['franja-1']);
    p(bx, 3, COLORES['franja-1']);
    p(12, 4, COLORES.espacio);
    for (let y = 7; y < 12; y++) {
      for (let x = 0; x < 20; x++) {
        const dentro = ((x - 9.5) / 10) ** 2 + ((y - 9) / 2.8) ** 2 <= 1;
        if (!dentro) continue;
        p(x, y, y === 7 || y === 11 ? COLORES['nave-oscura'] : COLORES.nave);
      }
    }
    // Luces que parpadean
    [3, 7, 12, 16].forEach((x, i) => p(x, 9, (i + cuadro) % 2 ? COLORES['franja-1'] : COLORES['franja-4']));
    [8, 9, 10, 11].forEach((x) => p(x, 12, COLORES['nave-oscura']));
    [9, 10].forEach((x) => p(x, 13, COLORES.rayo));
  })));
}

// Usa tu propia hoja de animación si está en HOJAS_PROPIAS y ya cargó
function cargarHojas() {
  for (const nombre of HOJAS_PROPIAS) {
    const imagen = new Image();
    imagen.addEventListener('load', () => { hojas[nombre] = imagen; });
    imagen.src = `img/animaciones/${nombre}.png`;
  }
}

function dibujarHoja(nombre, cuadro, cx, cy, ancho, alto, voltear = false) {
  const imagen = hojas[nombre];
  if (!imagen) return false;
  const datos = ANIMACIONES[nombre.replace(/^(cometa-arquero|zorpiano-arquero|cometa|zorpiano|zorp|ciclope|cuernos|corona)-(?=[a-z]+$)/, '')];
  if (!datos) return false;
  const anchoCuadro = imagen.width / datos.cuadros;
  ctx.save();
  ctx.translate(cx, cy);
  if (voltear) ctx.scale(-1, 1);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(imagen, cuadro * anchoCuadro, 0, anchoCuadro, imagen.height, -ancho / 2, -alto / 2, ancho, alto);
  ctx.restore();
  return true;
}

const cuadroDe = (nombre, tiempo) => {
  const datos = ANIMACIONES[nombre];
  return datos.fps ? Math.floor(tiempo * datos.fps) % datos.cuadros : 0;
};

function dibujar() {
  const e = vista.escala;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, dom.canvas.width, dom.canvas.height);
  if (!juego.equipos.length) return;

  // Pequeño temblor al hacer gol o caer un asteroide
  const ox = juego.sacudida > 0 ? azar(-1, 1) * juego.sacudida * 6 * e : 0;
  const oy = juego.sacudida > 0 ? azar(-1, 1) * juego.sacudida * 6 * e : 0;

  // La cancha se dibuja en unidades del mundo (girada si la pantalla está vertical)
  if (vista.vertical) ctx.setTransform(0, -e, e, 0, MARGEN.y * e + ox, (CANCHA.largo + MARGEN.x) * e + oy);
  else ctx.setTransform(e, 0, 0, e, MARGEN.x * e + ox, MARGEN.y * e + oy);
  dibujarCancha();
  dibujarCharcos();
  dibujarCrateres();
  dibujarArcos();
  dibujarSombrasAsteroides();

  // Personajes y objetos en píxeles de pantalla (para que siempre se vean de pie)
  ctx.setTransform(1, 0, 0, 1, ox, oy);
  dibujarCapsula();
  const lista = juego.equipos.flatMap((eq) => eq.aliens.map((a) => ({ a, eq, p: aPantalla(a.x, a.y) })));
  lista.sort((m, n) => m.p.y - n.p.y);
  for (const item of lista) dibujarSombra(item.p, RADIO_ALIEN, 0.95);
  for (const item of lista) if (esManejado(item.a)) dibujarAro(item);
  dibujarBabosa();
  const pb = aPantalla(juego.balon.x, juego.balon.y);
  const conNave = juego.nave && juego.nave.conBalon;
  for (const item of lista) if (conNave || item.p.y < pb.y) dibujarAlien(item);
  if (!conNave) {
    dibujarBalon(pb);
    for (const item of lista) if (item.p.y >= pb.y) dibujarAlien(item);
  }
  for (const item of lista) if (esManejado(item.a)) dibujarFlecha(item);
  if (juego.modo === 'red') for (const item of lista) if (esManejado(item.a)) dibujarNombre(item);
  // Barrita de fuerza bajo el alienígena que está cargando un tiro
  for (const jugador of [0, 1]) {
    const nivel = nivelCarga(jugador);
    if (nivel === null) continue;
    const equipo = juego.modo === 'red' ? red.miEquipo() : jugador;
    const item = lista.find((i) => i.a.equipo === equipo && esManejado(i.a));
    if (item && juego.balon.dueno === item.a) dibujarCarga(item, nivel);
  }
  dibujarAsteroidesCayendo();
  dibujarNave(conNave ? pb : null);
  dibujarParticulas();
}

function dibujarCancha() {
  const L = CANCHA.largo;
  const A = CANCHA.ancho;
  // Borde de césped oscuro y franjas
  ctx.fillStyle = COLORES['borde-cancha'];
  ctx.fillRect(-BORDE - 2, -BORDE - 2, L + (BORDE + 2) * 2, A + (BORDE + 2) * 2);
  const franjas = 12;
  const anchoFranja = L / franjas;
  for (let i = 0; i < franjas; i++) {
    ctx.fillStyle = i % 2 === 0 ? COLORES['cesped-1'] : COLORES['cesped-2'];
    ctx.fillRect(i * anchoFranja, 0, anchoFranja + 0.5, A);
  }

  // Líneas
  ctx.strokeStyle = COLORES.linea;
  ctx.fillStyle = COLORES.linea;
  ctx.lineWidth = 3;
  ctx.strokeRect(0, 0, L, A);
  linea(CENTRO.x, 0, CENTRO.x, A);
  circulo(CENTRO.x, CENTRO.y, RADIO_CIRCULO, false);
  circulo(CENTRO.x, CENTRO.y, 4, true);

  for (const lado of [0, 1]) {
    const x0 = lado === 0 ? 0 : L;
    const s = lado === 0 ? 1 : -1;
    // Área grande y área chica
    ctx.strokeRect(lado === 0 ? 0 : L - AREA.fondo, CENTRO.y - AREA.ancho / 2, AREA.fondo, AREA.ancho);
    ctx.strokeRect(lado === 0 ? 0 : L - AREA_CHICA.fondo, CENTRO.y - AREA_CHICA.ancho / 2, AREA_CHICA.fondo, AREA_CHICA.ancho);
    // Punto penal y medialuna
    const penalX = x0 + s * PUNTO_PENAL;
    circulo(penalX, CENTRO.y, 3.5, true);
    const angulo = Math.acos((AREA.fondo - PUNTO_PENAL) / RADIO_CIRCULO);
    ctx.beginPath();
    if (lado === 0) ctx.arc(penalX, CENTRO.y, RADIO_CIRCULO, -angulo, angulo);
    else ctx.arc(penalX, CENTRO.y, RADIO_CIRCULO, Math.PI - angulo, Math.PI + angulo);
    ctx.stroke();
  }
  // Esquinas
  ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI / 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(L, 0, 12, Math.PI / 2, Math.PI); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, A, 12, -Math.PI / 2, 0); ctx.stroke();
  ctx.beginPath(); ctx.arc(L, A, 12, Math.PI, Math.PI * 1.5); ctx.stroke();
}

function dibujarArcos() {
  for (const lado of [0, 1]) {
    const x0 = lado === 0 ? -ARCO.fondo : CANCHA.largo;
    const linea0 = lado === 0 ? 0 : CANCHA.largo;
    const fondo = lado === 0 ? -ARCO.fondo : CANCHA.largo + ARCO.fondo;
    // Red
    ctx.fillStyle = COLORES.sombra;
    ctx.fillRect(x0, ARCO_ARRIBA, ARCO.fondo, ARCO.boca);
    ctx.strokeStyle = COLORES.red;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = x0 + 6; x < x0 + ARCO.fondo; x += 6) { ctx.moveTo(x, ARCO_ARRIBA); ctx.lineTo(x, ARCO_ABAJO); }
    for (let y = ARCO_ARRIBA + 6; y < ARCO_ABAJO; y += 6) { ctx.moveTo(x0, y); ctx.lineTo(x0 + ARCO.fondo, y); }
    ctx.stroke();
    // Marco
    ctx.strokeStyle = COLORES.poste;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(linea0, ARCO_ARRIBA);
    ctx.lineTo(fondo, ARCO_ARRIBA);
    ctx.lineTo(fondo, ARCO_ABAJO);
    ctx.lineTo(linea0, ARCO_ABAJO);
    ctx.stroke();
    ctx.fillStyle = COLORES.poste;
    circulo(linea0, ARCO_ARRIBA, ARCO.poste, true);
    circulo(linea0, ARCO_ABAJO, ARCO.poste, true);
  }
}

// Huecos de asteroide: borde de tierra, fondo oscuro y brasas al principio
function dibujarCrateres() {
  for (const c of juego.crateres) {
    const r = radioCrater(c);
    if (r < 1) continue;
    const cuadro = c.edad < 0.4 ? 0 : (c.vida < PODER.asteroides.regenera ? 2 : 1);
    if (dibujarHoja('crater', cuadro, c.x, c.y, (r + 5) * 2, (r + 5) * 2)) continue;
    ctx.fillStyle = COLORES['crater-borde'];
    circulo(c.x, c.y, r + 5, true);
    ctx.fillStyle = COLORES.crater;
    circulo(c.x, c.y, r, true);
    // Piedritas en el borde (siempre en el mismo lugar gracias a la semilla)
    ctx.fillStyle = COLORES['roca-oscura'];
    for (let i = 0; i < 7; i++) {
      const angulo = c.semilla + i * 0.9;
      ctx.fillRect(c.x + Math.cos(angulo) * (r + 3) - 3, c.y + Math.sin(angulo) * (r + 3) - 3, 6, 6);
    }
    if (c.edad < 1.4) {
      ctx.globalAlpha = 1 - c.edad / 1.4;
      ctx.fillStyle = COLORES.fuego;
      circulo(c.x, c.y, r * 0.55, true);
      ctx.globalAlpha = 1;
    }
    // Regenerándose: el césped vuelve a crecer desde el borde
    if (c.vida < PODER.asteroides.regenera) {
      ctx.globalAlpha = 1 - c.vida / PODER.asteroides.regenera;
      ctx.fillStyle = COLORES['cesped-1'];
      circulo(c.x, c.y, r + 5, true);
      ctx.globalAlpha = 1;
    }
  }
}

function dibujarCharcos() {
  const burbuja = reducirMovimiento ? 0 : Math.floor(performance.now() / 330) % 2;
  for (const c of juego.charcos) {
    const r = radioCharco(c);
    if (r < 1) continue;
    if (dibujarHoja('charco-baba', cuadroDe('charco-baba', c.vida), c.x, c.y, r * 2.4, r * 1.6)) continue;
    ctx.fillStyle = COLORES.charco;
    circulo(c.x, c.y, r, true);
    circulo(c.x + Math.cos(c.semilla) * r * 0.5, c.y + Math.sin(c.semilla) * r * 0.5, r * 0.55, true);
    // Burbujas
    ctx.fillStyle = COLORES.baba;
    ctx.fillRect(c.x - 6 + burbuja * 8, c.y - 4, 4, 4);
    ctx.fillRect(c.x + 8 - burbuja * 10, c.y + 7, 3, 3);
  }
}

// Sombra y aro rojo donde va a caer cada asteroide (aviso para esquivarlo)
function dibujarSombrasAsteroides() {
  for (const ast of juego.asteroides) {
    const progreso = 1 - ast.t / ast.total;
    ctx.fillStyle = COLORES.sombra;
    circulo(ast.x, ast.y, ast.radio * (0.3 + progreso * 0.7), true);
    if (Math.floor(ast.t * 8) % 2 === 0 || reducirMovimiento) {
      ctx.strokeStyle = COLORES['aviso-impacto'];
      ctx.lineWidth = 3;
      circulo(ast.x, ast.y, ast.radio, false);
    }
  }
}

function linea(x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function circulo(x, y, radio, relleno) {
  ctx.beginPath();
  ctx.arc(x, y, radio, 0, Math.PI * 2);
  if (relleno) ctx.fill();
  else ctx.stroke();
}

function dibujarSombra(p, radio, ancho) {
  const e = vista.escala;
  ctx.fillStyle = COLORES.sombra;
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + radio * 0.9 * e, radio * ancho * e, radio * 0.35 * e, 0, 0, Math.PI * 2);
  ctx.fill();
}

// Aro brillante bajo el alienígena que maneja cada persona
function dibujarAro({ a, p }) {
  const e = vista.escala;
  const claro = colorDe(a.equipo, 'claro');
  const pulso = reducirMovimiento ? 1 : 0.75 + Math.sin(performance.now() / 160) * 0.25;
  ctx.save();
  ctx.globalAlpha = pulso;
  ctx.strokeStyle = claro;
  ctx.lineWidth = Math.max(2, 3 * e);
  ctx.shadowColor = colorDe(a.equipo);
  ctx.shadowBlur = 12 * e;
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + RADIO_ALIEN * 0.85 * e, RADIO_ALIEN * 1.35 * e, RADIO_ALIEN * 0.55 * e, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

// Flechita sobre la cabeza del alienígena manejado
function dibujarFlecha({ a, p }) {
  const e = vista.escala;
  const arriba = p.y - RADIO_ALIEN * 1.85 * e;
  ctx.fillStyle = colorDe(a.equipo);
  ctx.strokeStyle = COLORES.espacio;
  ctx.lineWidth = Math.max(1, 1.5 * e);
  ctx.beginPath();
  ctx.moveTo(p.x - 7 * e, arriba - 9 * e);
  ctx.lineTo(p.x + 7 * e, arriba - 9 * e);
  ctx.lineTo(p.x, arriba);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

// Barrita de fuerza del tiro: de amarillo a rojo; llena, parpadea
function dibujarCarga({ p }, nivel) {
  const e = vista.escala;
  const ancho = 44 * e;
  const alto = Math.max(4, 7 * e);
  const x = p.x - ancho / 2;
  const y = p.y + RADIO_ALIEN * 1.45 * e;
  ctx.fillStyle = COLORES.espacio;
  ctx.fillRect(x - 2, y - 2, ancho + 4, alto + 4);
  const llena = nivel >= 1 && !reducirMovimiento && Math.floor(performance.now() / 90) % 2 === 0;
  ctx.fillStyle = llena ? COLORES.texto : (nivel < 0.5 ? COLORES['franja-1'] : (nivel < 0.85 ? COLORES['franja-3'] : COLORES['franja-4']));
  ctx.fillRect(x, y, ancho * Math.max(0.04, nivel), alto);
}

// En línea: el nombre de cada persona sobre el alienígena que maneja
function dibujarNombre({ a, p }) {
  const e = vista.escala;
  const texto = nombreJugador(a.equipo);
  const y = p.y - RADIO_ALIEN * 1.85 * e - 13 * e;
  ctx.font = `700 ${Math.max(10, Math.round(13 * e))}px ${FUENTE_TEXTO}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(2, 3 * e);
  ctx.strokeStyle = COLORES.espacio;
  ctx.strokeText(texto, p.x, y);
  ctx.fillStyle = colorDe(a.equipo, 'claro');
  ctx.fillText(texto, p.x, y);
}

// Qué animación le toca a cada alienígena según lo que está haciendo
function animacionDe(a) {
  const rapidez = Math.hypot(a.vx, a.vy);
  if (a.estado === 'derrapando' || a.estado === 'levantandose') return 'derrapar';
  if (a.estado === 'aturdido') return 'caer';
  if (juego.estado === 'gol' && juego.equipoQueAnoto === a.equipo) return 'celebrar';
  if (a.enBaba && rapidez > 30) return 'resbalar';
  if (a.patada > 0) return 'patear';
  return rapidez > 40 ? 'correr' : 'quieto';
}

function nombrePersonaje(a) {
  if (CAPITANES_PERFIL.includes(a.variante)) return a.variante;   // capitanes del perfil
  if (a.equipo === 0) return a.rol === 'arquero' ? 'cometa-arquero' : 'cometa';
  if (a.variante === 'zorp') return 'zorp';
  return a.rol === 'arquero' ? 'zorpiano-arquero' : 'zorpiano';
}

function dibujarAlien({ a, p }) {
  const e = vista.escala;
  const tam = RADIO_ALIEN * 2.8 * e;
  const celda = tam / 12;
  const nombre = animacionDe(a);
  const cuadro = cuadroDe(nombre, a.tiempoAnim);
  const mirada = direccionEnPantalla(a.mirarX, a.mirarY);
  let angulo = 0;
  let dy = 0;
  let pies = 'normal';
  switch (nombre) {
    case 'quieto': dy = cuadro === 1 ? celda : 0; break;
    case 'correr': pies = ['normal', 'pasoA', 'normal', 'pasoB'][cuadro]; dy = cuadro % 2 ? -celda : 0; break;
    case 'patear': pies = mirada.x >= 0 ? 'patadaDer' : 'patadaIzq'; break;
    case 'derrapar': {
      const d = direccionEnPantalla(a.derrapeX, a.derrapeY);
      angulo = (d.x >= 0 ? 1 : -1) * (Math.PI / 2) * (a.estado === 'levantandose' ? 0.5 : 1);
      dy = celda * 3;
      break;
    }
    case 'caer': angulo = (mirada.x >= 0 ? -1 : 1) * (Math.PI / 2); dy = celda * 3; break;
    case 'resbalar': angulo = (cuadro ? 1 : -1) * 0.22; break;
    case 'celebrar': dy = cuadro ? -celda * 3 : 0; break;
    default: break;
  }
  const centroX = Math.round(p.x);
  const centroY = Math.round(p.y - 2 * e + dy);

  // ¿Hay una hoja propia para esta animación?
  if (!dibujarHoja(`${nombrePersonaje(a)}-${nombre}`, cuadro, centroX, centroY, tam, tam, mirada.x < 0)) {
    ctx.save();
    ctx.translate(centroX, centroY);
    if (angulo) ctx.rotate(angulo);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sprites[`${a.equipo}-${a.variante}-${pies}`], -tam / 2, -tam / 2, tam, tam);
    // Pupilas que miran hacia donde se mueve (o ojos en X si está en el piso)
    ctx.fillStyle = COLORES.pupila;
    const columna = mirada.x >= 0 ? 1 : 0;
    const fila = mirada.y >= 0 ? 1 : 0;
    for (const [ojoX, ojoY, alto] of OJOS[a.variante]) {
      const x0 = -tam / 2 + ojoX * celda;
      const y0 = -tam / 2 + ojoY * celda;
      const lado = Math.ceil(celda);
      if (nombre === 'caer' && alto === 2) {
        ctx.fillRect(x0, y0, lado, lado);
        ctx.fillRect(x0 + celda, y0 + celda, lado, lado);
      } else {
        ctx.fillRect(x0 + columna * celda, y0 + (alto === 2 ? fila : 0) * celda, lado, lado);
      }
    }
    ctx.restore();
  }

  if (nombre === 'caer') dibujarEstrellas(p, a.tiempoAnim);
  // Burbuja "?" cuando un alienígena de Zorp se distrae
  if (a.distraido > 0) {
    const bx = p.x + tam * 0.45;
    const by = p.y - tam / 2 - 6 * e;
    if (dibujarHoja('pregunta-zorp', cuadroDe('pregunta-zorp', a.tiempoAnim), bx, by - 7 * e, 18 * e, 18 * e)) return;
    ctx.fillStyle = COLORES.texto;
    ctx.fillRect(bx - 7 * e, by - 14 * e, 14 * e, 14 * e);
    ctx.fillStyle = COLORES.pupila;
    ctx.font = `${Math.round(15 * e)}px ${FUENTE_TITULO}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', bx, by - 6.5 * e);
  }
}

// Estrellitas girando sobre la cabeza del que está en el piso
function dibujarEstrellas(p, tiempo) {
  const e = vista.escala;
  if (dibujarHoja('estrellas-mareo', cuadroDe('estrellas-mareo', tiempo), p.x, p.y - RADIO_ALIEN * 1.1 * e, 36 * e, 18 * e)) return;
  const lado = Math.max(2, 3 * e);
  ctx.fillStyle = COLORES['franja-1'];
  for (let i = 0; i < 3; i++) {
    const angulo = (reducirMovimiento ? 0 : tiempo * 6) + i * 2.1;
    const x = p.x + Math.cos(angulo) * RADIO_ALIEN * 0.9 * e;
    const y = p.y - RADIO_ALIEN * 0.9 * e + Math.sin(angulo) * RADIO_ALIEN * 0.3 * e;
    ctx.fillRect(x - lado / 2, y - lado * 1.5, lado, lado * 3);
    ctx.fillRect(x - lado * 1.5, y - lado / 2, lado * 3, lado);
  }
}

function dibujarBalon(p) {
  const b = juego.balon;
  const e = vista.escala;
  const r = RADIO_BALON * e;

  // Estela brillante cuando va rápido
  if (!reducirMovimiento && Math.hypot(b.vx, b.vy) > 250 && !b.dueno) {
    ctx.fillStyle = COLORES['balon-brillo'];
    b.estela.forEach((punto, i) => {
      const q = aPantalla(punto.x, punto.y);
      const t = (i + 1) / b.estela.length;
      ctx.globalAlpha = t * 0.35;
      ctx.beginPath();
      ctx.arc(q.x, q.y, r * t, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  dibujarSombra(p, RADIO_BALON, 0.9);
  if (dibujarHoja('balon-girar', Math.floor(b.giro * 2) % 4, p.x, p.y, r * 2.2, r * 2.2)) return;

  // Halo
  const halo = ctx.createRadialGradient(p.x, p.y, r * 0.6, p.x, p.y, r * 3);
  halo.addColorStop(0, COLORES['balon-brillo']);
  halo.addColorStop(1, 'transparent');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(p.x, p.y, r * 3, 0, Math.PI * 2);
  ctx.fill();

  // Balón con manchas que giran
  ctx.fillStyle = COLORES.balon;
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORES['balon-mancha'];
  const lado = r * 0.5;
  for (const extra of [0, 2.4]) {
    const mx = p.x + Math.cos(b.giro + extra) * r * 0.42;
    const my = p.y + Math.sin(b.giro + extra) * r * 0.42;
    ctx.fillRect(mx - lado / 2, my - lado / 2, lado, lado);
  }
}

function dibujarCapsula() {
  const c = juego.capsula;
  if (!c) return;
  if (c.vida < 2 && Math.floor(c.vida * 8) % 2 === 0) return;   // parpadea antes de irse
  const e = vista.escala;
  const p = aPantalla(c.x, c.y);
  const flota = reducirMovimiento ? 0 : Math.sin(c.t * 4) * 3 * e;
  const ancho = 20 * e;
  const alto = 32 * e;
  dibujarSombra(p, 12, 0.9);
  // Brillo alrededor
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = c.tipo === 'asteroides' ? COLORES['franja-3'] : (c.tipo === 'nave' ? COLORES.foco : COLORES.baba);
  circulo(p.x, p.y - 10 * e + flota, 22 * e, true);
  ctx.globalAlpha = 1;
  const cuadro = cuadroDe(`capsula-${c.tipo}`, c.t);
  if (dibujarHoja(`capsula-${c.tipo}`, cuadro, p.x, p.y - 10 * e + flota, ancho, alto)) return;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(arte.capsula[c.tipo][cuadro], p.x - ancho / 2, p.y - 10 * e + flota - alto / 2, ancho, alto);
}

function dibujarBabosa() {
  const s = juego.babosa;
  if (!s) return;
  const e = vista.escala;
  const p = aPantalla(s.x, s.y);
  const ancho = 48 * e;
  const alto = 36 * e;
  const cuadro = cuadroDe('babosa-caminar', s.t);
  dibujarSombra(p, 20, 1);
  if (dibujarHoja('babosa-caminar', cuadro, p.x, p.y - 6 * e, ancho, alto)) return;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(arte.babosa[cuadro], p.x - ancho / 2, p.y - 6 * e - alto / 2, ancho, alto);
}

function dibujarAsteroidesCayendo() {
  const e = vista.escala;
  for (const ast of juego.asteroides) {
    if (ast.t > 0.75) continue;
    const p = aPantalla(ast.x, ast.y);
    const altura = ast.t / 0.75;                      // 1 arriba, 0 en el piso
    const x = p.x - altura * 160 * e;
    const y = p.y - altura * 320 * e;
    const tam = 34 * e;
    // Estela de fuego
    ctx.fillStyle = COLORES.fuego;
    for (let i = 1; i <= 3; i++) {
      ctx.globalAlpha = 0.5 / i;
      ctx.fillRect(x - i * 10 * e - tam / 4, y - i * 20 * e - tam / 4, tam / 2, tam / 2);
    }
    ctx.globalAlpha = 1;
    const cuadro = cuadroDe('asteroide-caer', ast.t);
    if (dibujarHoja('asteroide-caer', cuadro, x, y, tam, tam)) continue;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(cuadro * (Math.PI / 2));
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(arte.asteroide, -tam / 2, -tam / 2, tam, tam);
    ctx.restore();
  }
}

// La nave vuela por encima: sombra en el piso, rayo y balón colgando
function dibujarNave(pBalon) {
  const n = juego.nave;
  if (!n) return;
  const e = vista.escala;
  const p = aPantalla(n.x, n.y);
  // Mientras vuela alto (no se puede atrapar) se dibuja más arriba
  const alta = n.fase === 'huye' && n.t < PODER.nave.ventaja ? 1 - n.t / PODER.nave.ventaja : 0;
  const altura = (PODER.nave.altura + alta * 40) * e;
  const ancho = 60 * e;
  const alto = 42 * e;
  dibujarSombra(p, 22, 1);
  if (pBalon) {
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = COLORES.rayo;
    ctx.beginPath();
    ctx.moveTo(p.x - 6 * e, p.y - altura + 10 * e);
    ctx.lineTo(p.x + 6 * e, p.y - altura + 10 * e);
    ctx.lineTo(p.x + 16 * e, p.y);
    ctx.lineTo(p.x - 16 * e, p.y);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    dibujarBalon(pBalon);
  }
  const cuadro = cuadroDe('nave-aficionado', n.t);
  if (dibujarHoja('nave-aficionado', cuadro, p.x, p.y - altura, ancho, alto)) return;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(arte.nave[n.equipo][cuadro], p.x - ancho / 2, p.y - altura - alto / 2, ancho, alto);
}

// Confeti de píxeles al hacer gol
function lanzarParticulas(equipo) {
  const arcoX = equipo === 0 ? CANCHA.largo : 0;
  const origen = aPantalla(arcoX, CENTRO.y);
  const colores = [colorDe(equipo), COLORES['franja-1'], COLORES['franja-3'], COLORES.texto];
  for (let i = 0; i < 46; i++) {
    const angulo = azar(0, Math.PI * 2);
    const fuerza = azar(80, 420) * vista.escala;
    juego.particulas.push({
      x: origen.x, y: origen.y,
      vx: Math.cos(angulo) * fuerza, vy: Math.sin(angulo) * fuerza,
      vida: azar(0.6, 1.3), color: colores[i % colores.length], tam: azar(3, 7) * vista.escala
    });
  }
}

// Piedras que salen volando cuando cae un asteroide
function lanzarRocas(ast) {
  const origen = aPantalla(ast.x, ast.y);
  for (let i = 0; i < 12; i++) {
    const angulo = azar(0, Math.PI * 2);
    const fuerza = azar(60, 220) * vista.escala;
    juego.particulas.push({
      x: origen.x, y: origen.y,
      vx: Math.cos(angulo) * fuerza, vy: Math.sin(angulo) * fuerza,
      vida: azar(0.3, 0.7), color: i % 3 ? COLORES.roca : COLORES.fuego, tam: azar(3, 6) * vista.escala
    });
  }
}

// Nubecita de polvo detrás del que derrapa
function soltarPolvo(a) {
  const p = aPantalla(a.x - a.derrapeX * RADIO_ALIEN, a.y - a.derrapeY * RADIO_ALIEN);
  juego.particulas.push({
    x: p.x + azar(-4, 4) * vista.escala, y: p.y + RADIO_ALIEN * 0.6 * vista.escala,
    vx: azar(-20, 20) * vista.escala, vy: azar(-30, -5) * vista.escala,
    vida: 0.35, color: COLORES.polvo, tam: azar(4, 7) * vista.escala, polvo: true
  });
}

function actualizarParticulas(dt) {
  for (const p of juego.particulas) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.98;
    p.vy *= 0.98;
    p.vida -= dt;
  }
  juego.particulas = juego.particulas.filter((p) => p.vida > 0);
}

function dibujarParticulas() {
  for (const p of juego.particulas) {
    // El polvo del derrape puede usar tu propia hoja (3 cuadros a lo largo de su vida)
    if (p.polvo) {
      const cuadro = Math.min(2, Math.floor((1 - p.vida / 0.35) * 3));
      const lado = 12 * vista.escala;
      if (dibujarHoja('polvo-derrape', cuadro, p.x, p.y, lado, lado)) continue;
    }
    ctx.globalAlpha = Math.min(1, p.vida * 2);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, p.tam, p.tam);
  }
  ctx.globalAlpha = 1;
}

/* 18. BUCLE PRINCIPAL ===================================================== */
// La física avanza en pasos fijos para que el juego vaya igual en cualquier equipo
let tiempoAnterior = 0;
let acumulado = 0;

function bucle(ahora) {
  window.requestAnimationFrame(bucle);
  const dt = Math.min(0.1, (ahora - tiempoAnterior) / 1000 || 0);
  tiempoAnterior = ahora;
  if (dom.partida.hidden) return;
  revisarCargas();
  if (red.esInvitado()) {
    if (!juego.pausado) actualizarInvitado(dt);
  } else if (!juego.pausado) {
    acumulado += dt;
    while (acumulado >= PASO) {
      actualizar(PASO);
      acumulado -= PASO;
    }
  }
  if (juego.modo === 'red' && red.esAnfitrion()) enviarFoto(dt);
  dibujar();
}

/* 19. PERFIL DEL JUGADOR ================================================== */
// Cada persona escoge su nombre, el nombre de su equipo, el color y el capitán.
// Se guarda en este navegador (localStorage) y, en línea, se le manda al rival.
const LARGO_NOMBRE = 12;
const LARGO_EQUIPO = 14;

// Quita lo que no debe ir en un nombre (saltos de línea, < >) y lo recorta.
// Los nombres siempre se muestran con textContent, nunca como HTML.
function limpiarTexto(texto, largo) {
  return String(texto ?? '')
    .replace(/[\u0000-\u001f\u007f<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, largo);
}

// Revisa un perfil (guardado o recibido por internet) y corrige lo que esté mal
function limpiarPerfil(datos) {
  const p = datos && typeof datos === 'object' ? datos : {};
  return {
    nombre: limpiarTexto(p.nombre, LARGO_NOMBRE),
    equipo: limpiarTexto(p.equipo, LARGO_EQUIPO),
    color: COLORES_EQUIPO[p.color] ? p.color : 'celeste',
    capitan: CAPITANES_PERFIL.includes(p.capitan) ? p.capitan : 'cometa'
  };
}

let perfil = limpiarPerfil(almacen.leer(CLAVE_PERFIL, PERFIL_INICIAL));      // jugador 1 (o tú)
let perfilJ2 = limpiarPerfil(almacen.leer(CLAVE_PERFIL_J2, PERFIL_J2));      // jugador 2 (versión 3.9)

// ---- Lista de perfiles guardados (versión 3.9) ----
// Cada persona que juega queda guardada (nombre, equipo, color y capitán).
// El más reciente va primero. Se busca por nombre sin importar mayúsculas.
const MAX_PERFILES = 20;

function leerPerfiles() {
  const lista = almacen.leer(CLAVE_PERFILES, null);
  if (Array.isArray(lista)) return lista.map(limpiarPerfil).filter((p) => p.nombre);
  // Primera vez con la versión 3.9: se pasa el perfil que ya existía a la lista
  return perfil.nombre ? [perfil] : [];
}

// Guarda (o actualiza) un perfil. "nombreViejo" sirve para cuando le cambian el nombre.
function guardarPerfilEnLista(p, nombreViejo = p.nombre) {
  if (!p.nombre) return;
  const resto = leerPerfiles().filter((x) => !mismoNombre(x.nombre, p.nombre) && !mismoNombre(x.nombre, nombreViejo));
  almacen.guardar(CLAVE_PERFILES, [p, ...resto].slice(0, MAX_PERFILES));
}

function borrarPerfil(nombre) {
  almacen.guardar(CLAVE_PERFILES, leerPerfiles().filter((x) => !mismoNombre(x.nombre, nombre)));
}

// Si a un perfil le cambian el nombre, sus partidos pasan al nombre nuevo
function renombrarEnHistorial(viejo, nuevo) {
  const lista = leerHistorial().map((p) => ({
    ...p,
    jugador: mismoNombre(p.jugador, viejo) ? nuevo : p.jugador,
    rival: mismoNombre(p.rival, viejo) ? nuevo : p.rival
  }));
  almacen.guardar(CLAVE_HISTORIAL, lista);
}

// Nombre que se muestra de un perfil (con algo por defecto si está vacío)
const nombreDe = (p, porDefecto = 'Jugador') => p.nombre || porDefecto;

// Nombre del equipo en el marcador y en los avisos
function nombreVisible(indice) {
  const p = juego.perfiles[indice];
  return p.equipo || p.nombre || `Equipo ${indice + 1}`;
}

// Nombre de la persona (sobre su alienígena y en la pantalla final)
function nombreJugador(indice) {
  const p = juego.perfiles[indice];
  return p.nombre || p.equipo || `Jugador ${indice + 1}`;
}

// Si los dos equipos escogen el mismo color, el segundo usa otro
function resolverColores(color0, color1) {
  if (color0 !== color1) return [color0, color1];
  return [color0, color0 === 'rosado' ? 'celeste' : 'rosado'];
}

// Prepara colores, dibujos, nombres y capitanes del marcador antes de una partida
function prepararEquiposVisuales() {
  if (juego.modo === '1j') juego.perfiles = [perfil, PERFIL_ZORP];
  else if (juego.modo === '2j') juego.perfiles = [perfil, perfilJ2];
  // En línea, juego.perfiles ya llegó con los datos de los dos jugadores
  juego.colores = resolverColores(juego.perfiles[0].color, juego.perfiles[1].color);
  crearSprites();

  let nombres = [nombreVisible(0), nombreVisible(1)];
  if (juego.modo === '1j') nombres = [perfil.equipo || 'Tú', 'Zorp'];
  [0, 1].forEach((i) => {
    dom.nombres[i].textContent = nombres[i];
    dom.marcadorEquipos[i].dataset.color = juego.colores[i];
    const capitan = CAPITANES[juego.perfiles[i].capitan] || CAPITANES.cometa;
    pintarRetrato(dom.capitanes[i], juego.colores[i], capitan.cuerpo);
  });

  // Joystick del color de tu equipo (en línea, el invitado es el equipo 2)
  dom.pads[0].dataset.color = juego.colores[juego.modo === 'red' ? red.miEquipo() : 0];
  dom.pads[1].dataset.color = juego.colores[1];

  const [c0, c1] = juego.colores.map((c) => COLORES_EQUIPO[c].nombre.toLowerCase());
  let descripcion = `Tu equipo es ${c0} y el de Zorp es ${c1}.`;
  if (juego.modo === '2j') descripcion = `${nombreJugador(0)} (jugador 1) es ${c0} y ${nombreJugador(1)} (jugador 2) es ${c1}.`;
  if (juego.modo === 'red') descripcion = `${nombres[0]} es ${c0} y ${nombres[1]} es ${c1}.`;
  dom.canvas.setAttribute('aria-label', `Cancha de fútbol vista desde arriba. ${descripcion}`);
}

// Retrato pixelado de un capitán (12 × 12) con las pupilas mirando al frente
function crearRetrato(nombreColor, cuerpo) {
  const colores = coloresCuerpo(nombreColor);
  const dibujo = CUERPOS[cuerpo] || CUERPOS.campo;
  return lienzoPixel(12, 12, (p) => {
    [...dibujo, PIES.normal].forEach((fila, y) => {
      [...fila].forEach((letra, x) => {
        if (letra !== '.') p(x, y, colores[letra]);
      });
    });
    for (const [ojoX, ojoY, alto] of OJOS[cuerpo] || OJOS.campo) p(ojoX + 1, ojoY + (alto === 2 ? 1 : 0), COLORES.pupila);
  });
}

// Pinta un retrato en un <canvas> de la página (sin suavizar los píxeles)
function pintarRetrato(lienzo, nombreColor, cuerpo) {
  if (!lienzo) return;
  const pincel = lienzo.getContext('2d');
  pincel.imageSmoothingEnabled = false;
  pincel.clearRect(0, 0, lienzo.width, lienzo.height);
  pincel.drawImage(crearRetrato(nombreColor, cuerpo), 0, 0, lienzo.width, lienzo.height);
}

// ---- Pantalla "Perfiles" (versión 3.9) ----
// Arriba la lista de todos los perfiles; al tocar "Editar" o "Nuevo perfil"
// se muestra el formulario (el mismo de la versión 3).
const formPerfil = {
  form: $('#form-perfil'),
  nombre: $('#perfil-nombre'),
  equipo: $('#perfil-equipo'),
  vista: $('#perfil-vista'),
  resumen: $('#perfil-resumen'),
  error: $('#perfil-error'),
  cancelar: $('#perfil-cancelar'),
  zonaLista: $('#perfiles-zona-lista'),
  lista: $('#lista-perfiles'),
  sinPerfiles: $('#sin-perfiles'),
  nuevo: $('#boton-nuevo-perfil')
};
let perfilEditando = null;   // nombre del perfil que se está editando (null = perfil nuevo)

// Texto corto de un perfil: equipo · color · capitán
function resumenPerfil(p) {
  const color = COLORES_EQUIPO[p.color].nombre.toLowerCase();
  return `${p.equipo || 'Equipo sin nombre'} · ${color} · capitán ${CAPITANES[p.capitan].nombre}`;
}

// Lo que está escrito y marcado en el formulario, ya revisado
function leerFormularioPerfil() {
  const marcado = (nombre) => formPerfil.form.querySelector(`input[name="${nombre}"]:checked`)?.value;
  return limpiarPerfil({
    nombre: formPerfil.nombre.value,
    equipo: formPerfil.equipo.value,
    color: marcado('perfil-color'),
    capitan: marcado('perfil-capitan')
  });
}

// Dibuja la vista previa y los 4 capitanes con el color escogido
function pintarVistaPerfil() {
  const p = leerFormularioPerfil();
  pintarRetrato(formPerfil.vista, p.color, CAPITANES[p.capitan].cuerpo);
  for (const lienzo of formPerfil.form.querySelectorAll('canvas[data-capitan]')) {
    pintarRetrato(lienzo, p.color, CAPITANES[lienzo.dataset.capitan].cuerpo);
  }
  formPerfil.resumen.textContent = `${nombreDe(p, 'Sin nombre')} · ${resumenPerfil(p)}`;
}

// Una fila de la lista: retrato, nombre, equipo, mejor puntaje y botones
function filaPerfil(p, historial) {
  const item = document.createElement('li');
  item.className = 'perfil-fila';
  const retrato = document.createElement('canvas');
  retrato.width = 48;
  retrato.height = 48;
  retrato.setAttribute('aria-hidden', 'true');
  pintarRetrato(retrato, p.color, CAPITANES[p.capitan].cuerpo);

  const texto = document.createElement('div');
  texto.className = 'perfil-fila-texto';
  const nombre = document.createElement('strong');
  nombre.textContent = p.nombre;
  const detalle = document.createElement('span');
  detalle.textContent = resumenPerfil(p);
  const puntos = document.createElement('span');
  puntos.className = 'perfil-fila-puntos';
  const datos = datosDeJugador(p.nombre, historial);
  puntos.textContent = datos
    ? `Mejor puntaje: ${datos.mejor} pts · ${datos.partidos} ${datos.partidos === 1 ? 'partido' : 'partidos'}`
    : 'Todavía sin partidos';
  texto.append(nombre, detalle, puntos);

  const botones = document.createElement('div');
  botones.className = 'perfil-fila-botones';
  const editar = document.createElement('button');
  editar.type = 'button';
  editar.className = 'boton boton-mini';
  editar.textContent = 'Editar';
  editar.setAttribute('aria-label', `Editar el perfil de ${p.nombre}`);
  editar.addEventListener('click', () => abrirEditorPerfil(p));
  const borrar = document.createElement('button');
  borrar.type = 'button';
  borrar.className = 'boton boton-mini boton-secundario';
  borrar.textContent = 'Borrar';
  borrar.setAttribute('aria-label', `Borrar el perfil de ${p.nombre}`);
  // Hay que tocar dos veces para no borrar por error
  let confirmar = 0;
  borrar.addEventListener('click', () => {
    if (!confirmar) {
      borrar.textContent = '¿Seguro?';
      confirmar = window.setTimeout(() => { confirmar = 0; borrar.textContent = 'Borrar'; }, 3000);
      return;
    }
    window.clearTimeout(confirmar);
    borrarPerfil(p.nombre);
    pintarPerfiles();
    formPerfil.nuevo.focus();
    anunciar(`Perfil de ${p.nombre} borrado.`, false, true);
  });
  botones.append(editar, borrar);

  item.append(retrato, texto, botones);
  return item;
}

// Muestra la lista de perfiles (y esconde el formulario)
function pintarPerfiles() {
  const historial = leerHistorial();
  const lista = leerPerfiles();
  formPerfil.lista.replaceChildren(...lista.map((p) => filaPerfil(p, historial)));
  formPerfil.lista.hidden = lista.length === 0;
  formPerfil.sinPerfiles.hidden = lista.length > 0;
  formPerfil.form.hidden = true;
  formPerfil.zonaLista.hidden = false;
}

// Abre el formulario para editar un perfil (o crear uno nuevo si p es null)
function abrirEditorPerfil(p) {
  perfilEditando = p ? p.nombre : null;
  const datos = p || { ...PERFIL_INICIAL };
  formPerfil.nombre.value = datos.nombre;
  formPerfil.equipo.value = datos.equipo;
  for (const opcion of formPerfil.form.querySelectorAll('input[type="radio"]')) {
    opcion.checked = (opcion.name === 'perfil-color' && opcion.value === datos.color)
      || (opcion.name === 'perfil-capitan' && opcion.value === datos.capitan);
  }
  formPerfil.error.hidden = true;
  formPerfil.zonaLista.hidden = true;
  formPerfil.form.hidden = false;
  pintarVistaPerfil();
  formPerfil.nombre.focus();
}

function errorPerfil(texto) {
  formPerfil.error.textContent = texto;
  formPerfil.error.hidden = false;
  formPerfil.nombre.focus();
}

function prepararPantallaPerfil() {
  formPerfil.form.addEventListener('input', pintarVistaPerfil);
  formPerfil.form.addEventListener('change', pintarVistaPerfil);
  formPerfil.nuevo.addEventListener('click', () => abrirEditorPerfil(null));
  formPerfil.cancelar.addEventListener('click', () => {
    pintarPerfiles();
    formPerfil.nuevo.focus();
  });
  formPerfil.form.addEventListener('submit', (evento) => {
    evento.preventDefault();
    const nuevo = leerFormularioPerfil();
    if (!nuevo.nombre) return errorPerfil('Escribe un nombre para el perfil.');
    const repetido = leerPerfiles().some((x) => mismoNombre(x.nombre, nuevo.nombre) && !mismoNombre(x.nombre, perfilEditando));
    if (repetido) return errorPerfil('Ya hay un perfil con ese nombre. Escoge otro.');
    const viejo = perfilEditando || nuevo.nombre;
    guardarPerfilEnLista(nuevo, viejo);
    if (perfilEditando && nuevo.nombre !== perfilEditando) renombrarEnHistorial(perfilEditando, nuevo.nombre);
    // Si era el perfil que se está usando, también se actualiza
    if (mismoNombre(perfil.nombre, viejo)) { perfil = nuevo; almacen.guardar(CLAVE_PERFIL, perfil); }
    if (mismoNombre(perfilJ2.nombre, viejo)) { perfilJ2 = nuevo; almacen.guardar(CLAVE_PERFIL_J2, perfilJ2); }
    sonido.iniciar();
    sonido.tocar('menu');
    pintarPerfiles();
    formPerfil.nuevo.focus();
    anunciar(`Perfil guardado: ${nuevo.nombre} · ${resumenPerfil(nuevo)}.`);
    perfilCambiado();
  });
}

// ---- Pantalla "Prepara tu equipo" (versión 3.9) ----
// Sale después de elegir el modo. Con 2 jugadores hay dos tarjetas.
// Arriba de cada tarjeta están los perfiles guardados: un toque y se carga.
const equipos = {
  form: $('#form-equipo'),
  tarjetas: $('#tarjetas-equipo'),
  plantilla: $('#plantilla-equipo'),
  error: $('#error-equipo'),
  listo: $('#boton-listo-equipo'),
  volver: $('#equipo-volver'),
  cambiarEnSala: $('#boton-cambiar-equipo'),
  modo: '1j',          // para qué modo se está preparando
  desdeSala: false     // true si se abrió con "Cambiar equipo" desde la sala en línea
};

// Copia la plantilla del HTML y le pone el número de jugador (0 o 1)
function crearTarjetaEquipo(n) {
  const caja = document.createElement('div');
  caja.innerHTML = equipos.plantilla.innerHTML.replaceAll('__N__', String(n));
  return caja.firstElementChild;
}

// Lo que está escrito y marcado en una tarjeta, ya revisado
function datosTarjeta(tarjeta) {
  const marcado = (campo) => tarjeta.querySelector(`input[name^="${campo}-"]:checked`)?.value;
  return limpiarPerfil({
    nombre: tarjeta.querySelector('input[name="nombre"]').value,
    equipo: tarjeta.querySelector('input[name="equipo"]').value,
    color: marcado('color'),
    capitan: marcado('capitan')
  });
}

// Llena una tarjeta con un perfil
function ponerEnTarjeta(tarjeta, p) {
  tarjeta.querySelector('input[name="nombre"]').value = p.nombre;
  tarjeta.querySelector('input[name="equipo"]').value = p.equipo;
  for (const opcion of tarjeta.querySelectorAll('input[type="radio"]')) {
    opcion.checked = (opcion.name.startsWith('color-') && opcion.value === p.color)
      || (opcion.name.startsWith('capitan-') && opcion.value === p.capitan);
  }
  pintarTarjeta(tarjeta);
}

// Vista previa, capitanes con el color escogido y el botón del perfil marcado
function pintarTarjeta(tarjeta) {
  const p = datosTarjeta(tarjeta);
  pintarRetrato(tarjeta.querySelector('.perfil-vista'), p.color, CAPITANES[p.capitan].cuerpo);
  for (const lienzo of tarjeta.querySelectorAll('canvas[data-capitan]')) {
    pintarRetrato(lienzo, p.color, CAPITANES[lienzo.dataset.capitan].cuerpo);
  }
  tarjeta.querySelector('.perfil-resumen').textContent = `${nombreDe(p, 'Sin nombre')} · ${resumenPerfil(p)}`;
  for (const chip of tarjeta.querySelectorAll('.chip-perfil[data-perfil]')) {
    chip.setAttribute('aria-pressed', String(mismoNombre(chip.dataset.perfil, p.nombre)));
  }
}

// Botones con los perfiles guardados (y uno para empezar uno nuevo)
function pintarChips(tarjeta, colorNuevo) {
  const lista = leerPerfiles();
  const caja = tarjeta.querySelector('.chips-perfiles');
  tarjeta.querySelector('.perfiles-guardados').hidden = lista.length === 0;
  const chips = lista.map((p) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip-perfil';
    chip.dataset.perfil = p.nombre;
    const muestra = document.createElement('span');
    muestra.className = `muestra-color color-${p.color}`;
    muestra.setAttribute('aria-hidden', 'true');
    chip.append(muestra, document.createTextNode(p.nombre));
    chip.addEventListener('click', () => {
      ponerEnTarjeta(tarjeta, p);
      equipos.error.hidden = true;
    });
    return chip;
  });
  const nuevo = document.createElement('button');
  nuevo.type = 'button';
  nuevo.className = 'chip-perfil chip-nuevo';
  nuevo.textContent = '+ Nuevo';
  nuevo.addEventListener('click', () => {
    ponerEnTarjeta(tarjeta, { ...PERFIL_INICIAL, color: colorNuevo });
    tarjeta.querySelector('input[name="nombre"]').focus();
  });
  caja.replaceChildren(...chips, nuevo);
}

// Abre "Prepara tu equipo" para un modo: '1j', '2j' o 'red'
function abrirEquipos(modo, desdeSala = false) {
  equipos.modo = modo;
  equipos.desdeSala = desdeSala;
  const dos = modo === '2j';
  const titulos = dos ? ['Jugador 1 · W A S D', 'Jugador 2 · flechas'] : ['Tu equipo'];
  const perfiles = [perfil, perfilJ2];
  const tarjetas = titulos.map((titulo, n) => {
    const tarjeta = crearTarjetaEquipo(n);
    tarjeta.querySelector('.tarjeta-equipo-titulo').textContent = titulo;
    tarjeta.addEventListener('input', () => pintarTarjeta(tarjeta));
    tarjeta.addEventListener('change', () => pintarTarjeta(tarjeta));
    return tarjeta;
  });
  equipos.tarjetas.replaceChildren(...tarjetas);
  equipos.tarjetas.classList.toggle('dos', dos);
  tarjetas.forEach((tarjeta, n) => {
    pintarChips(tarjeta, n === 0 ? 'celeste' : 'rosado');
    ponerEnTarjeta(tarjeta, perfiles[n]);
  });
  equipos.listo.textContent = modo === 'red' ? (desdeSala ? 'Guardar' : 'Continuar') : '¡A jugar!';
  equipos.error.hidden = true;
  mostrarPantalla('pantalla-equipo');
}

function errorEquipo(tarjeta, texto) {
  equipos.error.textContent = texto;
  equipos.error.hidden = false;
  tarjeta.querySelector('input[name="nombre"]').focus();
}

function prepararPantallaEquipo() {
  equipos.form.addEventListener('submit', (evento) => {
    evento.preventDefault();
    const tarjetas = [...equipos.tarjetas.children];
    const datos = tarjetas.map(datosTarjeta);
    const falta = datos.findIndex((p) => !p.nombre);
    if (falta >= 0) return errorEquipo(tarjetas[falta], 'Escribe tu nombre: así quedas guardado en los récords.');
    if (datos.length === 2 && mismoNombre(datos[0].nombre, datos[1].nombre)) {
      return errorEquipo(tarjetas[1], 'Los dos jugadores no pueden tener el mismo nombre.');
    }
    // Se guardan en la lista de perfiles (el jugador 1 queda de primero)
    if (datos[1]) {
      perfilJ2 = datos[1];
      almacen.guardar(CLAVE_PERFIL_J2, perfilJ2);
      guardarPerfilEnLista(perfilJ2);
    }
    perfil = datos[0];
    almacen.guardar(CLAVE_PERFIL, perfil);
    guardarPerfilEnLista(perfil);
    sonido.tocar('menu');
    if (equipos.desdeSala) {
      // Volver a la sala sin cerrarla; el rival recibe el equipo nuevo
      mostrarPantalla('pantalla-red');
      perfilCambiado();
    } else if (equipos.modo === 'red') {
      abrirSala();
    } else {
      empezarPartida();
    }
  });
  equipos.volver.addEventListener('click', () => {
    if (equipos.desdeSala) mostrarPantalla('pantalla-red');
    else mostrarPantalla(equipos.modo === '1j' ? 'pantalla-nivel' : 'pantalla-jugadores');
  });
  equipos.cambiarEnSala.addEventListener('click', () => abrirEquipos('red', true));
}

/* 20. JUEGO EN LÍNEA ====================================================== */
// 1 contra 1, cada quien en su dispositivo. Se usa PeerJS (index.html la carga)
// para conectar los dos navegadores directamente (WebRTC).
//  · El ANFITRIÓN crea la sala y juega la partida de verdad: balón, goles, poderes.
//  · El INVITADO entra con el código, manda sus teclas y dibuja lo que recibe.
// Mensajes (objetos JSON con un campo "t"):
//  hola (perfil) · inicio (perfiles) · e (estado, unas 30 veces por segundo, con
//  sonidos y avisos dentro de "ev") · mov (dirección del invitado) · acc (acción)
//  · pausa · seguir · revancha · salir · latido (sigo aquí) · llena (sala ocupada)
const RED = {
  prefijo: 'galaxygol-santisarm-',          // para no chocar con salas de otros juegos
  letras: 'ABCDEFGHJKMNPQRSTUVWXYZ23456789', // sin O, 0, I, 1 ni L (se confunden)
  largoCodigo: 4,
  envio: 1 / 30,     // segundos entre fotos del estado
  latido: 1000,      // milisegundos entre latidos
  espera: 12000,     // sin noticias en este tiempo = conexión perdida
  version: 3
};
const ESTADOS_ALIEN = ['normal', 'derrapando', 'levantandose', 'aturdido'];
const ESTADOS_PARTIDA = ['saque', 'jugando', 'gol', 'balonNuevo', 'final'];
// El anfitrión oye los sonidos desde su lado; el invitado los da vuelta
const SONIDO_DEL_OTRO_LADO = { gol: 'gol-rival', 'gol-rival': 'gol', victoria: 'derrota', derrota: 'victoria' };

const red = {
  rol: null,           // null | 'anfitrion' | 'invitado'
  peer: null,
  conexion: null,
  codigo: '',
  rival: null,         // perfil del otro jugador
  mov: { x: 0, y: 0 }, // (anfitrión) hacia dónde va el invitado
  eventos: [],         // (anfitrión) sonidos y avisos para la próxima foto
  acumulado: 0,
  ultimoDato: 0,
  latidos: 0,
  espera: 0,
  movEnviado: '',
  ultimoMov: 0,

  esAnfitrion() { return this.rol === 'anfitrion'; },
  esInvitado() { return this.rol === 'invitado' && juego.modo === 'red'; },
  conectado() { return Boolean(this.conexion && this.conexion.open); },
  miEquipo() { return this.rol === 'invitado' ? 1 : 0; },

  // (anfitrión) anota algo que el invitado también debe oír o ver
  grabar(evento) {
    if (this.rol === 'anfitrion' && juego.modo === 'red' && !dom.partida.hidden && !juego.pausado && this.conectado()) {
      this.eventos.push(evento);
    }
  },

  enviar(datos) {
    if (!this.conectado() || !datos || typeof datos !== 'object') return;
    try {
      this.conexion.send(datos);
    } catch (error) {
      // Si falla un envío, el latido detecta la conexión caída
    }
  }
};

// ¿Este navegador puede jugar en línea? (sin internet PeerJS no carga)
const redDisponible = () => typeof window.Peer === 'function' && typeof window.RTCPeerConnection === 'function';

// Opciones de PeerJS. Las pruebas pueden usar su propio servidor de salas
// definiendo window.galaxyGolServidorRed antes de cargar el juego.
const opcionesPeer = () => ({ debug: 0, ...(window.galaxyGolServidorRed || {}) });

function nuevoCodigo() {
  let codigo = '';
  for (let i = 0; i < RED.largoCodigo; i++) codigo += RED.letras[Math.floor(Math.random() * RED.letras.length)];
  return codigo;
}

const normalizarCodigo = (texto) => String(texto || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, RED.largoCodigo);

// ---- Pantalla de la sala ----
const sala = {
  pantalla: $('#pantalla-red'),
  estado: $('#red-estado'),
  opciones: $('#red-opciones'),
  crear: $('#boton-crear-sala'),
  formUnirse: $('#form-unirse'),
  codigoEscrito: $('#codigo-sala'),
  cajaCodigo: $('#red-codigo'),
  codigo: $('#codigo-grande'),
  empezar: $('#boton-empezar-red'),
  tuRetrato: $('#sala-tu-retrato'),
  tuNombre: $('#sala-tu-nombre'),
  tuEquipo: $('#sala-tu-equipo'),
  rival: $('#sala-rival'),
  rivalRetrato: $('#sala-rival-retrato'),
  rivalNombre: $('#sala-rival-nombre'),
  rivalEquipo: $('#sala-rival-equipo')
};

function estadoSala(texto, esError = false) {
  sala.estado.textContent = texto;
  sala.estado.classList.toggle('error', esError);
}

// Muestra tu tarjeta, la del rival y los botones que tocan según el momento
function pintarSala() {
  // Colores como quedarían en la partida (el anfitrión es el equipo 1)
  let miColor = perfil.color;
  let colorRival = red.rival ? red.rival.color : 'rosado';
  if (red.rival) {
    const colores = red.rol === 'invitado' ? resolverColores(red.rival.color, perfil.color) : resolverColores(perfil.color, red.rival.color);
    [miColor, colorRival] = red.rol === 'invitado' ? [colores[1], colores[0]] : colores;
  }
  pintarRetrato(sala.tuRetrato, miColor, CAPITANES[perfil.capitan].cuerpo);
  sala.tuNombre.textContent = nombreDe(perfil, 'Sin nombre');
  sala.tuEquipo.textContent = perfil.equipo || 'Equipo sin nombre';

  sala.rival.classList.toggle('esperando', !red.rival);
  if (red.rival) {
    pintarRetrato(sala.rivalRetrato, colorRival, CAPITANES[red.rival.capitan].cuerpo);
    sala.rivalNombre.textContent = nombreDe(red.rival, 'Tu amigo');
    sala.rivalEquipo.textContent = red.rival.equipo || 'Equipo sin nombre';
  } else {
    sala.rivalRetrato.getContext('2d').clearRect(0, 0, sala.rivalRetrato.width, sala.rivalRetrato.height);
    sala.rivalNombre.textContent = 'Esperando rival…';
    sala.rivalEquipo.textContent = red.rol === 'anfitrion' ? 'Dile el código a tu amigo' : 'Crea una sala o únete a una';
  }

  const disponible = redDisponible();
  sala.opciones.hidden = Boolean(red.rol);
  sala.crear.disabled = !disponible;
  for (const control of sala.formUnirse.elements) control.disabled = !disponible;
  sala.cajaCodigo.hidden = red.rol !== 'anfitrion';
  sala.codigo.textContent = red.codigo;
  sala.empezar.hidden = !(red.rol === 'anfitrion' && red.rival && red.conectado());
}

// Al entrar a "Jugar en línea" desde "¿Cuántos jugadores?"
function abrirSala() {
  if (red.rol && !red.conectado()) cerrarRed(false);
  pintarSala();
  mostrarPantalla('pantalla-red');
  if (red.rol) return;
  if (!redDisponible()) {
    estadoSala('El juego en línea no está disponible aquí. Necesita internet y abrir el juego con Live Server o desde una página publicada (no funciona dentro de la vista previa de Claude).', true);
  } else {
    estadoSala('Crea una sala y dile el código a tu amigo, o escribe el código de la sala de tu amigo.');
  }
}

// Si cambias el perfil con la sala abierta, el rival recibe el nuevo
function perfilCambiado() {
  if (red.conectado()) red.enviar({ t: 'hola', version: RED.version, perfil });
  if (!sala.pantalla.hidden) pintarSala();
}

function crearSala() {
  if (!redDisponible()) return;
  cerrarRed(false);
  red.rol = 'anfitrion';
  red.codigo = nuevoCodigo();
  estadoSala('Creando la sala…');
  pintarSala();
  let peer;
  try {
    peer = new window.Peer(RED.prefijo + red.codigo, opcionesPeer());
  } catch (error) {
    errorRed(error);
    return;
  }
  red.peer = peer;
  peer.on('open', () => {
    if (red.peer !== peer) return;
    estadoSala(`Sala ${red.codigo} lista. Dile el código a tu amigo y espera a que entre.`);
    pintarSala();
  });
  peer.on('connection', (conexion) => {
    if (red.peer !== peer) return;
    if (red.conexion) {
      // Ya hay dos jugadores: se le avisa al tercero y se cierra
      conexion.on('open', () => {
        conexion.send({ t: 'llena' });
        window.setTimeout(() => conexion.close(), 400);
      });
      return;
    }
    prepararConexion(conexion);
  });
  peer.on('disconnected', () => {
    // Se perdió el servidor de salas; la conexión directa puede seguir viva
    if (red.peer === peer && !red.conexion) {
      try { peer.reconnect(); } catch (error) { /* se intenta solo una vez */ }
    }
  });
  peer.on('error', (error) => {
    if (red.peer !== peer) return;
    if (error.type === 'unavailable-id') crearSala();   // código ocupado: se crea otro
    else errorRed(error);
  });
}

function unirseASala(texto) {
  if (!redDisponible()) return;
  const codigo = normalizarCodigo(texto);
  if (codigo.length !== RED.largoCodigo) {
    estadoSala(`El código tiene ${RED.largoCodigo} letras o números. Revisa lo que escribiste.`, true);
    sala.codigoEscrito.focus();
    return;
  }
  cerrarRed(false);
  red.rol = 'invitado';
  red.codigo = codigo;
  estadoSala(`Buscando la sala ${codigo}…`);
  pintarSala();
  let peer;
  try {
    peer = new window.Peer(opcionesPeer());
  } catch (error) {
    errorRed(error);
    return;
  }
  red.peer = peer;
  peer.on('open', () => {
    if (red.peer !== peer) return;
    prepararConexion(peer.connect(RED.prefijo + codigo, { reliable: true, serialization: 'json' }));
  });
  peer.on('error', (error) => {
    if (red.peer === peer) errorRed(error);
  });
  red.espera = window.setTimeout(() => {
    if (red.peer === peer && !red.conectado()) errorRed({ type: 'tiempo' });
  }, 15000);
}

// Escucha una conexión (la que llega al anfitrión o la que abre el invitado)
function prepararConexion(conexion) {
  conexion.on('open', () => {
    if (red.conexion && red.conexion !== conexion) return;
    red.conexion = conexion;
    window.clearTimeout(red.espera);
    red.ultimoDato = performance.now();
    red.enviar({ t: 'hola', version: RED.version, perfil });
    empezarLatidos();
  });
  conexion.on('data', (datos) => {
    if (conexion === red.conexion) recibirRed(datos);
  });
  conexion.on('close', () => {
    if (conexion === red.conexion) conexionCortada('cerro');
  });
  conexion.on('error', () => {
    if (conexion === red.conexion) conexionCortada('error');
  });
}

// Cada segundo: "sigo aquí". Si el otro no da señales, se corta.
function empezarLatidos() {
  window.clearInterval(red.latidos);
  red.latidos = window.setInterval(() => {
    if (!red.conectado()) return;
    red.enviar({ t: 'latido' });
    if (performance.now() - red.ultimoDato > RED.espera) conexionCortada('silencio');
  }, RED.latido);
}

// Lo que llega por internet. Todo se revisa: nunca se confía a ciegas.
function recibirRed(datos) {
  if (!datos || typeof datos !== 'object') return;
  red.ultimoDato = performance.now();
  switch (datos.t) {
    case 'hola': {
      const nuevo = !red.rival;
      red.rival = limpiarPerfil(datos.perfil);
      const rival = nombreDe(red.rival, 'Tu amigo');
      if (nuevo) sonido.tocar('conectado');
      if (nuevo && red.esAnfitrion()) estadoSala(`¡${rival} entró a tu sala! Cuando estén listos, toca «¡A jugar!».`);
      else if (nuevo) estadoSala(`¡Conectado con ${rival}! Espera a que empiece la partida.`);
      if (!sala.pantalla.hidden) pintarSala();
      break;
    }
    case 'llena':
      cerrarRed(false);
      estadoSala('Esa sala ya tiene dos jugadores. Pídele a tu amigo que cree otra.', true);
      pintarSala();
      break;
    case 'inicio':
      if (red.rol === 'invitado') iniciarPartidaInvitado(datos);
      break;
    case 'e':
      if (red.esInvitado() && !dom.partida.hidden) aplicarFoto(datos);
      break;
    case 'mov':
      if (red.esAnfitrion()) red.mov = vectorSeguro(datos.x, datos.y);
      break;
    case 'acc':
      if (red.esAnfitrion() && juego.modo === 'red' && ACCIONES.includes(datos.tipo)) {
        const fuerza = datos.fuerza === null || datos.fuerza === undefined ? null : limitar(numeroSeguro(datos.fuerza), 0, 1);
        accion(1, datos.tipo, fuerza);
      }
      break;
    case 'pausa':
      if (juego.modo === 'red') pausar(true);
      break;
    case 'seguir':
      if (juego.modo === 'red') reanudar(true);
      break;
    case 'revancha':
      if (red.esAnfitrion() && juego.modo === 'red' && !dom.partida.hidden) empezarPartidaRed();
      break;
    case 'salir':
      conexionCortada('salio');
      break;
    default:
      break;   // 'latido' solo actualiza ultimoDato
  }
}

// Una dirección que llega por internet: números válidos y largo máximo 1
function vectorSeguro(x, y) {
  const vx = Number.isFinite(Number(x)) ? Number(x) : 0;
  const vy = Number.isFinite(Number(y)) ? Number(y) : 0;
  const largo = Math.hypot(vx, vy);
  return largo > 1 ? { x: vx / largo, y: vy / largo } : { x: vx, y: vy };
}

function errorRed(error) {
  const mensajes = {
    'peer-unavailable': 'No encontramos una sala con ese código. Revisa las letras y que tu amigo siga en la sala.',
    network: 'No hay conexión con el servidor de salas. Revisa tu internet.',
    'server-error': 'El servidor de salas no responde. Inténtalo en un momento.',
    'socket-error': 'No hay conexión con el servidor de salas. Revisa tu internet.',
    'socket-closed': 'Se cerró la conexión con el servidor de salas. Inténtalo otra vez.',
    'browser-incompatible': 'Este navegador no permite jugar en línea. Prueba con Chrome, Edge, Firefox o Safari actualizados.',
    tiempo: 'Tu amigo no respondió. Puede que la red (por ejemplo, el wifi de la universidad) bloquee la conexión directa: prueben con los datos del celular.'
  };
  cerrarRed(false);
  estadoSala(mensajes[error && error.type] || 'No se pudo conectar. Inténtalo otra vez.', true);
  pintarSala();
}

// Termina la conexión. "avisar": le dice al otro que te fuiste.
function cerrarRed(avisar = true) {
  if (avisar) red.enviar({ t: 'salir' });
  window.clearInterval(red.latidos);
  window.clearTimeout(red.espera);
  const { conexion, peer } = red;
  Object.assign(red, { rol: null, peer: null, conexion: null, codigo: '', rival: null, mov: { x: 0, y: 0 }, eventos: [], acumulado: 0 });
  // Un instante de espera para que el "salir" alcance a llegar
  window.setTimeout(() => {
    try { conexion?.close(); } catch (error) { /* ya estaba cerrada */ }
    try { peer?.destroy(); } catch (error) { /* ya estaba cerrado */ }
  }, avisar ? 300 : 0);
}

// El otro se fue o se cayó internet
function conexionCortada(motivo) {
  if (!red.rol) return;
  const nombre = red.rival ? red.rival.nombre : '';
  const enPartida = juego.modo === 'red' && !dom.partida.hidden;
  cerrarRed(false);
  sonido.tocar('desconectado');
  const texto = motivo === 'salio'
    ? `${nombre || 'Tu rival'} salió de la partida.`
    : `Se perdió la conexión con ${nombre || 'tu rival'}. Revisen internet y vuelvan a crear la sala.`;
  if (enPartida) {
    juego.estado = 'final';
    juego.pausado = false;
    dom.pausa.hidden = true;
    dom.tituloFinal.textContent = 'Se cortó la conexión';
    dom.textoFinal.textContent = texto;
    dom.imagenFinal.src = IMAGENES.zorpTriste;
    dom.imagenFinal.alt = 'Alienígena triste';
    dom.logrosFinal.hidden = true;
    dom.botonOtraVez.hidden = true;
    ponerMensaje('');
    mostrarFinal();
    anunciar(texto, true, true);
  } else {
    estadoSala(texto, true);
    if (!sala.pantalla.hidden) pintarSala();
  }
}

// ---- Empezar la partida ----
// (anfitrión) botón «¡A jugar!» y revancha
function empezarPartidaRed() {
  if (!red.esAnfitrion() || !red.conectado() || !red.rival) return;
  juego.modo = 'red';
  juego.nivel = 'normal';
  juego.perfiles = [perfil, red.rival];
  red.eventos = [];
  red.mov = { x: 0, y: 0 };
  red.acumulado = 0;
  red.enviar({ t: 'inicio', perfiles: juego.perfiles });
  empezarPartida();
}

// (invitado) llega la orden de empezar
function iniciarPartidaInvitado(datos) {
  const [p0, p1] = Array.isArray(datos.perfiles) ? datos.perfiles : [];
  juego.modo = 'red';
  juego.nivel = 'normal';
  juego.perfiles = [limpiarPerfil(p0), limpiarPerfil(p1)];
  red.movEnviado = '';
  empezarPartida();
  for (const eq of juego.equipos) for (const a of eq.aliens) a.enRed = false;
}

// (cualquiera) botón «Revancha» de la pantalla final o de la pausa
function pedirRevancha() {
  if (!red.conectado()) return;
  if (red.esAnfitrion()) {
    empezarPartidaRed();
  } else {
    red.enviar({ t: 'revancha' });
    anunciar(`Pediste la revancha. Empieza en un momento.`, false, true);
  }
}

// ---- Anfitrión: manda una "foto" del juego unas 30 veces por segundo ----
const r1 = (v) => Math.round(v * 10) / 10;
const r2 = (v) => Math.round(v * 100) / 100;

function fotoDelJuego() {
  const b = juego.balon;
  return {
    t: 'e',
    es: juego.estado,
    m: juego.marcador,
    tm: r2(juego.tiempoMitad),
    r: r2(juego.reloj),
    sa: r2(juego.sacudida),
    qa: juego.equipoQueAnoto,
    c: juego.equipos.map((eq) => eq.controlado),
    // Cada alienígena: x, y, vx, vy, mirada x/y, estado, derrape x/y, patada, baba, distraído
    al: juego.equipos.flatMap((eq) => eq.aliens.map((a) => [
      r1(a.x), r1(a.y), r1(a.vx), r1(a.vy), r2(a.mirarX), r2(a.mirarY),
      ESTADOS_ALIEN.indexOf(a.estado), r2(a.derrapeX), r2(a.derrapeY),
      a.patada > 0 ? 1 : 0, a.enBaba ? 1 : 0, a.distraido > 0 ? 1 : 0
    ])),
    b: [r1(b.x), r1(b.y), r1(b.vx), r1(b.vy), r2(b.giro), b.dueno ? b.dueno.equipo * 4 + b.dueno.numero : -1],
    ca: juego.capsula,
    as: juego.asteroides,
    cr: juego.crateres,
    nv: juego.nave,
    bs: juego.babosa,
    ch: juego.charcos,
    ev: red.eventos
  };
}

function enviarFoto(dt) {
  if (!red.conectado() || dom.partida.hidden) return;
  red.acumulado += dt;
  if (red.acumulado < RED.envio) return;
  red.acumulado = 0;
  red.enviar(fotoDelJuego());
  red.eventos = [];
}

// ---- Invitado: usa la foto para dibujar ----
const numeroSeguro = (v, porDefecto = 0) => (Number.isFinite(Number(v)) ? Number(v) : porDefecto);
const objetoSeguro = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : null);
const listaSegura = (v) => (Array.isArray(v) ? v.filter((x) => x && typeof x === 'object') : []);

function aplicarFoto(d) {
  if (!juego.equipos.length) return;
  if (ESTADOS_PARTIDA.includes(d.es) && juego.estado !== 'final') juego.estado = d.es;
  if (Array.isArray(d.m)) {
    const marcador = [numeroSeguro(d.m[0]), numeroSeguro(d.m[1])];
    if (marcador[0] !== juego.marcador[0] || marcador[1] !== juego.marcador[1]) {
      juego.marcador = marcador;
      pintarMarcador();
    }
  }
  juego.tiempoMitad = numeroSeguro(d.tm);
  pintarReloj();
  juego.reloj = numeroSeguro(d.r);
  juego.sacudida = numeroSeguro(d.sa);
  juego.equipoQueAnoto = numeroSeguro(d.qa, -1);
  if (Array.isArray(d.c)) juego.equipos.forEach((eq, i) => { eq.controlado = limitar(Math.round(numeroSeguro(d.c[i], 3)), 0, 3); });

  const aliens = juego.equipos.flatMap((eq) => eq.aliens);
  (Array.isArray(d.al) ? d.al : []).slice(0, aliens.length).forEach((v, i) => {
    if (!Array.isArray(v)) return;
    const a = aliens[i];
    const [x, y, vx, vy, mx, my, est, dx, dy, pat, baba, dis] = v.map((n) => numeroSeguro(n));
    // Si el salto es grande (saque, gol) se pone directo; si no, se suaviza
    if (!a.enRed || Math.hypot(x - a.x, y - a.y) > 150) {
      a.x = x;
      a.y = y;
    }
    a.enRed = true;
    a.destinoX = x;
    a.destinoY = y;
    Object.assign(a, { vx, vy, mirarX: mx, mirarY: my, derrapeX: dx, derrapeY: dy });
    a.estado = ESTADOS_ALIEN[est] || 'normal';
    a.patada = pat ? 0.1 : 0;
    a.enBaba = Boolean(baba);
    a.distraido = dis ? 1 : 0;
  });

  if (Array.isArray(d.b)) {
    const b = juego.balon;
    const [x, y, vx, vy, giro, dueno] = d.b.map((n) => numeroSeguro(n));
    if (!b.enRed || Math.hypot(x - b.x, y - b.y) > 150) {
      b.x = x;
      b.y = y;
      b.estela = [];
    }
    b.enRed = true;
    Object.assign(b, { destinoX: x, destinoY: y, vx, vy, giro });
    b.dueno = dueno >= 0 && dueno < aliens.length ? aliens[dueno] : null;
  }

  juego.capsula = objetoSeguro(d.ca);
  juego.asteroides = listaSegura(d.as);
  juego.crateres = listaSegura(d.cr);
  juego.nave = objetoSeguro(d.nv);
  juego.babosa = objetoSeguro(d.bs);
  juego.charcos = listaSegura(d.ch);
  for (const evento of Array.isArray(d.ev) ? d.ev : []) aplicarEvento(evento);
}

// Sonidos, mensajes, avisos y efectos que mandó el anfitrión
function aplicarEvento(ev) {
  if (!Array.isArray(ev)) return;
  const [tipo, a, b, c] = ev;
  switch (tipo) {
    case 's': sonido.tocar(SONIDO_DEL_OTRO_LADO[a] || String(a)); break;
    case 'm': ponerMensaje(String(a ?? '').slice(0, 40), Boolean(b), numeroSeguro(c)); break;
    case 'a': anunciar(String(a ?? '').slice(0, 200), Boolean(b), true); break;
    case 'p': if (!reducirMovimiento) { juego.sacudida = 1; lanzarParticulas(a === 1 ? 1 : 0); } break;
    case 'r': if (!reducirMovimiento) lanzarRocas({ x: numeroSeguro(a), y: numeroSeguro(b) }); break;
    case 'f': pintarFinal(a === 1 ? 1 : 0, false); break;
    default: break;
  }
}

// Cada cuadro del invitado: mover suave hacia la última foto y mandar sus teclas
function actualizarInvitado(dt) {
  actualizarParticulas(dt);
  juego.sacudida = Math.max(0, juego.sacudida - dt * 3);
  const suave = 1 - Math.exp(-dt * 20);
  for (const eq of juego.equipos) {
    for (const a of eq.aliens) {
      a.tiempoAnim += dt;
      if (a.enRed) {
        a.x += (a.destinoX - a.x) * suave;
        a.y += (a.destinoY - a.y) * suave;
      }
      if (a.estado === 'derrapando' && !reducirMovimiento && Math.random() < dt * 30) soltarPolvo(a);
    }
  }
  const b = juego.balon;
  if (b.enRed) {
    b.x += (b.destinoX - b.x) * suave;
    b.y += (b.destinoY - b.y) * suave;
    b.estela.push({ x: b.x, y: b.y });
    if (b.estela.length > 10) b.estela.shift();
  }
  if (juego.mensajeHasta && juego.reloj > juego.mensajeHasta) {
    juego.mensajeHasta = 0;
    ponerMensaje('');
  }
  enviarMovimiento();
}

// Manda la dirección del invitado cuando cambia (y cada 0,2 s por si acaso)
function enviarMovimiento() {
  const quieto = juego.pausado || juego.estado === 'final';
  const m = quieto ? { x: 0, y: 0 } : entrada(0);
  const x = r2(m.x);
  const y = r2(m.y);
  const clave = `${x},${y}`;
  const ahora = performance.now();
  if (clave !== red.movEnviado || ahora - red.ultimoMov > 200) {
    red.enviar({ t: 'mov', x, y });
    red.movEnviado = clave;
    red.ultimoMov = ahora;
  }
}

// Botones y formulario de la sala
function prepararSala() {
  sala.crear.addEventListener('click', crearSala);
  sala.empezar.addEventListener('click', empezarPartidaRed);
  sala.formUnirse.addEventListener('submit', (evento) => {
    evento.preventDefault();
    unirseASala(sala.codigoEscrito.value);
  });
  // El código se escribe en mayúsculas y sin espacios
  sala.codigoEscrito.addEventListener('input', () => {
    const limpio = normalizarCodigo(sala.codigoEscrito.value);
    if (sala.codigoEscrito.value !== limpio) sala.codigoEscrito.value = limpio;
  });
  // Si se cierra la pestaña, se avisa al otro jugador
  window.addEventListener('pagehide', () => {
    if (red.conectado()) red.enviar({ t: 'salir' });
  });
}

/* 21. ARRANQUE ============================================================ */
function iniciar() {
  leerColores();
  crearSprites();
  crearArteObjetos();
  prepararPantallaPerfil();
  prepararPantallaEquipo();   // versión 3.9
  prepararSala();
  cargarHojas();
  sonido.cargarArchivos();
  pintarBotonSonido();
  dom.botonPantalla.hidden = !pantallaCompletaDisponible();
  dom.botonPantallaMenu.hidden = !pantallaCompletaDisponible();
  pintarBotonPantalla();
  pintarLogros();
  if ('ResizeObserver' in window) new ResizeObserver(ajustarCanvas).observe(dom.zona);
  window.addEventListener('resize', ajustarCanvas);
  window.requestAnimationFrame((ahora) => {
    tiempoAnterior = ahora;
    bucle(ahora);
  });
}

iniciar();
