/* =========================================================
   GALAXY INVASION — modelos.js
   Aquí se "dibujan" los modelos 3D con formas simples
   (cajas, esferas, conos). Estilo low poly: pocas caras,
   para que corra bien en el celular.

   Cada pieza tiene un nombre (mesh.name) igual al de la
   Guía de modelos 3D. Cuando tengas modelos hechos en
   Blender (.glb), se reemplazan las funciones de este archivo.
   ========================================================= */

import * as THREE from 'three';

/* ---------- Colores de los modelos ---------- */
export const COLORES = {
  verdeAlien: 0x5dff9b,
  moradoAlien: 0xb36bff,
  cuerpoZangano: 0x3a1d5c,
  caparazon: 0x5b2bb5,
  patas: 0x24123b,
  piel: 0xc99372,
  uniforme: 0x3d4a3a,
  chaleco: 0x262b25,
  casco: 0x4a5545,
  metalOscuro: 0x2a2d33,
  metal: 0x5a5f6a,
  concreto: 0x4b4e57,
  asfalto: 0x1b1d23,
  oxido: 0x6b3d24,
  rojoAlarma: 0xff4d5e,
  ambar: 0xffc65c,
  cian: 0x4de1ff
};

/* ---------- Materiales compartidos (se crean una sola vez) ---------- */
const cacheMateriales = new Map();

export function material(color, opciones = {}) {
  const clave = color + JSON.stringify(opciones);
  if (cacheMateriales.has(clave)) return cacheMateriales.get(clave);
  let mat;
  if (opciones.brilla) {
    // Las cosas que brillan (luces, ojos) no reciben sombra ni luz
    mat = new THREE.MeshBasicMaterial({ color, fog: opciones.niebla !== false });
  } else {
    mat = new THREE.MeshLambertMaterial({
      color,
      flatShading: true,
      emissive: opciones.emisivo ?? 0x000000,
      emissiveIntensity: opciones.intensidad ?? 1
    });
  }
  cacheMateriales.set(clave, mat);
  return mat;
}

/* ---------- Geometrías compartidas ---------- */
const geo = {
  caja: new THREE.BoxGeometry(1, 1, 1),
  esfera: new THREE.IcosahedronGeometry(1, 0),
  esferaSuave: new THREE.IcosahedronGeometry(1, 1),
  cono: new THREE.ConeGeometry(1, 1, 5),
  cilindro: new THREE.CylinderGeometry(1, 1, 1, 6)
};

/* Crea una pieza: geometría + material + tamaño + posición + nombre */
function pieza(nombre, geometria, mat, escala, posicion = [0, 0, 0], rotacion = [0, 0, 0]) {
  const malla = new THREE.Mesh(geometria, mat);
  malla.name = nombre;
  malla.scale.set(...escala);
  malla.position.set(...posicion);
  malla.rotation.set(...rotacion);
  return malla;
}

/* =========================================================
   ZÁNGANO (enemigo básico)
   Medidas aprox.: 1.3 m de ancho, 1.0 m de alto, 1.5 m de largo
   ========================================================= */
export function crearZangano() {
  const grupo = new THREE.Group();
  grupo.name = 'zangano';

  // Material propio del cuerpo, para que pueda "parpadear" al recibir un disparo
  const matCuerpo = new THREE.MeshLambertMaterial({
    color: COLORES.cuerpoZangano, flatShading: true, emissive: 0x000000
  });
  const matCaparazon = material(COLORES.caparazon);
  const matPatas = material(COLORES.patas);
  const matBrillo = material(COLORES.verdeAlien, { brilla: true });

  // Todo lo que se mueve al caminar va dentro de "cuerpo"
  const cuerpo = new THREE.Group();
  cuerpo.name = 'cuerpo_raiz';
  cuerpo.position.y = 0.55;
  grupo.add(cuerpo);

  cuerpo.add(pieza('torso', geo.esfera, matCuerpo, [0.5, 0.38, 0.62]));
  cuerpo.add(pieza('caparazon', geo.esfera, matCaparazon, [0.46, 0.26, 0.56], [0, 0.12, 0.05]));

  // Púas del caparazón con punta verde
  [-0.22, 0, 0.22].forEach((x, i) => {
    const pua = pieza('pua_' + (i + 1), geo.cono, matBrillo, [0.07, 0.3, 0.07], [x, 0.38, 0.08 - Math.abs(x) * 0.3], [-0.5, 0, x * -1.2]);
    cuerpo.add(pua);
  });

  // Cabeza con 3 ojos
  const cabeza = new THREE.Group();
  cabeza.name = 'cabeza';
  cabeza.position.set(0, 0.05, -0.55);
  cabeza.add(pieza('craneo', geo.esfera, matCuerpo, [0.3, 0.24, 0.3]));
  [[-0.12, 0.08], [0.12, 0.08], [0, 0.16]].forEach(([x, y], i) => {
    cabeza.add(pieza('ojo_' + (i + 1), geo.esferaSuave, matBrillo, [0.055, 0.055, 0.055], [x, y, -0.24]));
  });
  // Mandíbulas
  const mandIzq = pieza('mandibula_izq', geo.cono, matCaparazon, [0.05, 0.22, 0.05], [-0.1, -0.12, -0.25], [-1.9, 0, 0.3]);
  const mandDer = pieza('mandibula_der', geo.cono, matCaparazon, [0.05, 0.22, 0.05], [0.1, -0.12, -0.25], [-1.9, 0, -0.3]);
  cabeza.add(mandIzq, mandDer);
  cuerpo.add(cabeza);

  // 4 patas (cada una con un "hombro" que gira para caminar)
  const patas = [];
  const posPatas = [
    ['pata_del_izq', -0.38, -0.3], ['pata_del_der', 0.38, -0.3],
    ['pata_tra_izq', -0.38, 0.3], ['pata_tra_der', 0.38, 0.3]
  ];
  posPatas.forEach(([nombre, x, z]) => {
    const hombro = new THREE.Group();
    hombro.name = nombre;
    hombro.position.set(x, 0.05, z);
    const lado = Math.sign(x);
    // Muslo hacia afuera y canilla hacia el suelo
    hombro.add(pieza('muslo', geo.cilindro, matPatas, [0.05, 0.42, 0.05], [lado * 0.16, 0.1, 0], [0, 0, lado * 1.1]));
    hombro.add(pieza('canilla', geo.cono, matPatas, [0.06, 0.62, 0.06], [lado * 0.33, -0.22, 0], [Math.PI, 0, lado * -0.25]));
    cuerpo.add(hombro);
    patas.push(hombro);
  });

  // Caja invisible para detectar los disparos (más fácil de acertar)
  const hitbox = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 0.95, 1.5),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  hitbox.name = 'hitbox';
  hitbox.position.y = 0.55;
  grupo.add(hitbox);

  return { grupo, cuerpo, cabeza, patas, mandibulas: [mandIzq, mandDer], matCuerpo, hitbox };
}

/* =========================================================
   ARMAS EN PRIMERA PERSONA (con los brazos de Rosa)
   Todas apuntan hacia -Z y se cuelgan de la cámara.
   Cada arma trae:
     posCadera / posApuntando: dónde se pone respecto a la cámara
     franjaRareza: pieza cuyo color cambia según la rareza
   ========================================================= */
const RELLENO = { emisivo: 0x1c1d26 }; // brillo propio para que se vea de noche

/* Brazos: manga de camisa y guantes de cuero. Usan materiales propios
   (no los del caché) para poder cambiarles el color según el personaje:
   roja para la granjera, azul para el granjero (v0.6.2). */
const MAT_MANGA = material(0x8a2b2b, RELLENO).clone();
const MAT_GUANTE = material(0x5a3a22, RELLENO).clone();
export function pintarBrazos(manga, guante) {
  MAT_MANGA.color.setHex(manga);
  MAT_GUANTE.color.setHex(guante);
}

function crearBrazos(manoDer, manoIzq) {
  const matGuante = MAT_GUANTE;
  const matManga = MAT_MANGA;
  const matPiel = material(COLORES.piel, RELLENO);
  const brazoDer = new THREE.Group();
  brazoDer.name = 'brazo_derecho';
  brazoDer.position.set(...manoDer);
  brazoDer.add(pieza('mano_der', geo.caja, matGuante, [0.06, 0.08, 0.08], [0, 0, 0]));
  brazoDer.add(pieza('pulgar_der', geo.caja, matPiel, [0.015, 0.015, 0.05], [-0.032, 0.035, -0.02]));
  brazoDer.add(pieza('antebrazo_der', geo.caja, matManga, [0.078, 0.078, 0.32], [0.035, -0.04, 0.19], [0.35, -0.12, 0]));
  const brazoIzq = new THREE.Group();
  brazoIzq.name = 'brazo_izquierdo';
  brazoIzq.position.set(...manoIzq);
  brazoIzq.add(pieza('mano_izq', geo.caja, matGuante, [0.065, 0.07, 0.085], [0, 0, 0], [0, 0, 0.3]));
  brazoIzq.add(pieza('antebrazo_izq', geo.caja, matManga, [0.078, 0.078, 0.32], [-0.085, -0.06, 0.185], [0.3, 0.35, 0]));
  return { brazoDer, brazoIzq };
}

/* Fogonazo en la punta del cañón */
function crearPunta(posicion, tam = 1) {
  const puntaCanon = new THREE.Object3D();
  puntaCanon.name = 'punta_canon';
  puntaCanon.position.set(...posicion);
  const fogonazo = pieza('fogonazo', geo.esfera, material(COLORES.ambar, { brilla: true, niebla: false }), [0.05 * tam, 0.05 * tam, 0.09 * tam], [0, 0, -0.04 * tam]);
  fogonazo.visible = false;
  puntaCanon.add(fogonazo);
  return { puntaCanon, fogonazo };
}

export function crearArmaFPS(tipo) {
  const grupo = new THREE.Group();
  grupo.name = tipo + '_fps';
  const arma = new THREE.Group();
  arma.name = tipo;
  grupo.add(arma);
  const matMetal = material(0x3a3f4a, RELLENO);
  const matMetalClaro = material(0x767d8a, RELLENO);
  const matMadera = material(0x6b4226, RELLENO);
  const matMaderaOsc = material(0x4a2d1a, RELLENO);
  const matMira = material(COLORES.verdeAlien, { brilla: true, niebla: false });
  // Material propio para la franja de rareza (cambia de color)
  const matRareza = new THREE.MeshBasicMaterial({ color: 0xa39dcf, fog: false });
  let datos;

  if (tipo === 'escopeta') {
    // Escopeta vieja de doble cañón
    arma.add(pieza('culata', geo.caja, matMadera, [0.05, 0.085, 0.26], [0, -0.045, 0.24], [0.12, 0, 0]));
    arma.add(pieza('empunadura', geo.caja, matMaderaOsc, [0.045, 0.06, 0.09], [0, -0.035, 0.08], [0.25, 0, 0]));
    arma.add(pieza('cajon', geo.caja, matMetal, [0.055, 0.055, 0.12], [0, 0, -0.02]));
    arma.add(pieza('canon_izq', geo.cilindro, matMetalClaro, [0.014, 0.56, 0.014], [-0.015, 0.018, -0.36], [Math.PI / 2, 0, 0]));
    arma.add(pieza('canon_der', geo.cilindro, matMetalClaro, [0.014, 0.56, 0.014], [0.015, 0.018, -0.36], [Math.PI / 2, 0, 0]));
    arma.add(pieza('guardamanos', geo.caja, matMadera, [0.05, 0.035, 0.24], [0, -0.012, -0.24]));
    arma.add(pieza('mira_delantera', geo.caja, matMira, [0.006, 0.01, 0.006], [0, 0.04, -0.62]));
    arma.add(pieza('gatillo', geo.caja, matMetal, [0.008, 0.03, 0.01], [0, -0.04, 0.03]));
    const franja = pieza('franja_rareza', geo.caja, matRareza, [0.054, 0.02, 0.025], [0, -0.03, 0.16], [0.12, 0, 0]);
    arma.add(franja);
    const { puntaCanon, fogonazo } = crearPunta([0, 0.018, -0.64], 1.6);
    arma.add(puntaCanon);
    const { brazoDer, brazoIzq } = crearBrazos([0, -0.075, 0.1], [-0.01, -0.05, -0.24]);
    grupo.add(brazoDer, brazoIzq);
    datos = { puntaCanon, fogonazo, brazoIzq, franja, posCadera: [0.2, -0.2, -0.36], posApuntando: [0, -0.04, -0.22] };
  } else if (tipo === 'rifle') {
    // Rifle de caza con mira telescópica
    arma.add(pieza('culata', geo.caja, matMadera, [0.048, 0.09, 0.3], [0, -0.04, 0.25], [0.1, 0, 0]));
    arma.add(pieza('cuerpo', geo.caja, matMadera, [0.045, 0.05, 0.4], [0, -0.01, -0.12]));
    arma.add(pieza('cajon', geo.caja, matMetal, [0.04, 0.045, 0.16], [0, 0.02, 0.0]));
    arma.add(pieza('cerrojo', geo.caja, matMetalClaro, [0.06, 0.014, 0.014], [0.035, 0.03, 0.04]));
    arma.add(pieza('canon', geo.cilindro, matMetal, [0.012, 0.4, 0.012], [0, 0.02, -0.48], [Math.PI / 2, 0, 0]));
    arma.add(pieza('mira_telescopica', geo.cilindro, matMetal, [0.022, 0.22, 0.022], [0, 0.075, -0.02], [Math.PI / 2, 0, 0]));
    arma.add(pieza('lente', geo.cilindro, material(COLORES.cian, { brilla: true, niebla: false }), [0.018, 0.005, 0.018], [0, 0.075, -0.132], [Math.PI / 2, 0, 0]));
    arma.add(pieza('soporte_mira', geo.caja, matMetal, [0.016, 0.03, 0.1], [0, 0.05, -0.02]));
    const franja = pieza('franja_rareza', geo.caja, matRareza, [0.05, 0.02, 0.025], [0, -0.03, 0.16], [0.1, 0, 0]);
    arma.add(franja);
    const { puntaCanon, fogonazo } = crearPunta([0, 0.02, -0.69], 1.2);
    arma.add(puntaCanon);
    const { brazoDer, brazoIzq } = crearBrazos([0, -0.075, 0.1], [-0.01, -0.05, -0.2]);
    grupo.add(brazoDer, brazoIzq);
    datos = { puntaCanon, fogonazo, brazoIzq, franja, posCadera: [0.2, -0.21, -0.36], posApuntando: [0, -0.075, -0.2], conMira: true };
  } else {
    // Pistola M9
    arma.add(pieza('corredera', geo.caja, matMetal, [0.045, 0.045, 0.22], [0, 0.03, -0.02]));
    arma.add(pieza('armazon', geo.caja, matMetalClaro, [0.04, 0.03, 0.18], [0, -0.005, 0]));
    arma.add(pieza('empunadura', geo.caja, matMetal, [0.038, 0.12, 0.055], [0, -0.07, 0.06], [0.25, 0, 0]));
    arma.add(pieza('guardamonte', geo.caja, matMetal, [0.01, 0.03, 0.05], [0, -0.035, 0.0]));
    arma.add(pieza('canon', geo.cilindro, matMetalClaro, [0.012, 0.03, 0.012], [0, 0.03, -0.14], [Math.PI / 2, 0, 0]));
    arma.add(pieza('mira_delantera', geo.caja, matMira, [0.006, 0.012, 0.006], [0, 0.058, -0.12]));
    arma.add(pieza('mira_trasera_izq', geo.caja, matMira, [0.006, 0.012, 0.006], [-0.012, 0.058, 0.08]));
    arma.add(pieza('mira_trasera_der', geo.caja, matMira, [0.006, 0.012, 0.006], [0.012, 0.058, 0.08]));
    const franja = pieza('franja_rareza', geo.caja, matRareza, [0.042, 0.012, 0.03], [0, -0.06, 0.07], [0.25, 0, 0]);
    arma.add(franja);
    const { puntaCanon, fogonazo } = crearPunta([0, 0.03, -0.17]);
    arma.add(puntaCanon);
    const { brazoDer, brazoIzq } = crearBrazos([0, -0.08, 0.07], [-0.035, -0.09, 0.075]);
    grupo.add(brazoDer, brazoIzq);
    datos = { puntaCanon, fogonazo, brazoIzq, franja, posCadera: [0.21, -0.215, -0.44], posApuntando: [0, -0.062, -0.3] };
  }
  return { grupo, arma, matRareza, ...datos };
}

/* Arma tirada en el suelo (para el cofre o lo que suelta un jefe) */
export function crearArmaSuelo(tipo, colorRareza) {
  const m = crearArmaFPS(tipo);
  m.grupo.remove(m.grupo.getObjectByName('brazo_derecho'));
  m.grupo.remove(m.grupo.getObjectByName('brazo_izquierdo'));
  m.matRareza.color.set(colorRareza);
  m.grupo.scale.setScalar(2.2);
  return m;
}

/* =========================================================
   SARGENTO REYES (cuerpo completo)
   Aún no se ve en el juego (es primera persona), pero queda
   listo para los aliados y el multijugador.
   Alto: 1.8 m
   ========================================================= */
export function crearSoldado() {
  const grupo = new THREE.Group();
  grupo.name = 'sargento_reyes';
  const matUni = material(COLORES.uniforme);
  const matChaleco = material(COLORES.chaleco);
  const matCasco = material(COLORES.casco);
  const matPiel = material(COLORES.piel);
  const matBotas = material(0x17181a);
  const matVisor = material(COLORES.cian, { brilla: true });
  const matInsignia = material(COLORES.ambar, { brilla: true });

  // Piernas
  [['pierna_izq', -0.12], ['pierna_der', 0.12]].forEach(([n, x]) => {
    const p = new THREE.Group(); p.name = n; p.position.set(x, 0.9, 0);
    p.add(pieza('muslo', geo.caja, matUni, [0.16, 0.42, 0.18], [0, -0.2, 0]));
    p.add(pieza('pantorrilla', geo.caja, matUni, [0.14, 0.38, 0.16], [0, -0.6, 0]));
    p.add(pieza('bota', geo.caja, matBotas, [0.16, 0.12, 0.26], [0, -0.84, -0.04]));
    grupo.add(p);
  });
  // Torso
  grupo.add(pieza('torso', geo.caja, matUni, [0.44, 0.52, 0.24], [0, 1.18, 0]));
  grupo.add(pieza('chaleco', geo.caja, matChaleco, [0.48, 0.4, 0.3], [0, 1.2, 0]));
  grupo.add(pieza('insignia', geo.caja, matInsignia, [0.06, 0.04, 0.01], [-0.12, 1.32, -0.155]));
  grupo.add(pieza('mochila', geo.caja, matChaleco, [0.34, 0.38, 0.14], [0, 1.2, 0.21]));
  grupo.add(pieza('cinturon', geo.caja, matBotas, [0.46, 0.06, 0.26], [0, 0.94, 0]));
  // Cabeza
  const cabeza = new THREE.Group(); cabeza.name = 'cabeza'; cabeza.position.set(0, 1.57, 0);
  cabeza.add(pieza('cara', geo.caja, matPiel, [0.2, 0.22, 0.2]));
  cabeza.add(pieza('casco', geo.caja, matCasco, [0.26, 0.14, 0.26], [0, 0.1, 0.01]));
  cabeza.add(pieza('visor', geo.caja, matVisor, [0.2, 0.05, 0.02], [0, 0.03, -0.11]));
  grupo.add(cabeza);
  // Brazos
  [['brazo_izq', -0.3, 1], ['brazo_der', 0.3, -1]].forEach(([n, x, lado]) => {
    const b = new THREE.Group(); b.name = n; b.position.set(x, 1.4, 0);
    b.add(pieza('hombrera', geo.caja, matChaleco, [0.16, 0.12, 0.2], [0, 0, 0]));
    b.add(pieza('brazo', geo.caja, matUni, [0.12, 0.3, 0.14], [0, -0.2, 0]));
    b.add(pieza('antebrazo', geo.caja, matUni, [0.11, 0.28, 0.13], [0, -0.46, -0.02]));
    b.add(pieza('guante', geo.caja, matBotas, [0.1, 0.1, 0.11], [0, -0.64, -0.02]));
    b.rotation.z = lado * 0.08;
    grupo.add(b);
  });
  return { grupo };
}

/* =========================================================
   COFRE DE SUMINISTROS (tecnología humana con luces)
   1.2 x 0.75 x 0.7 m
   ========================================================= */
export function crearCofre() {
  const grupo = new THREE.Group();
  grupo.name = 'cofre';
  const matCaja = material(0x2f3a2c);
  const matBorde = material(COLORES.metal);
  const matLuz = material(COLORES.ambar, { brilla: true });

  grupo.add(pieza('base', geo.caja, matCaja, [1.2, 0.5, 0.7], [0, 0.25, 0]));
  grupo.add(pieza('borde_inferior', geo.caja, matBorde, [1.24, 0.06, 0.74], [0, 0.03, 0]));
  grupo.add(pieza('franja_luz', geo.caja, matLuz, [1.21, 0.04, 0.71], [0, 0.42, 0]));

  // La tapa gira desde la bisagra de atrás
  const tapa = new THREE.Group();
  tapa.name = 'tapa';
  tapa.position.set(0, 0.5, 0.35);
  tapa.add(pieza('tapa_cubierta', geo.caja, matCaja, [1.22, 0.22, 0.72], [0, 0.11, -0.35]));
  tapa.add(pieza('cerradura', geo.caja, matLuz, [0.14, 0.1, 0.04], [0, 0.05, -0.72]));
  tapa.add(pieza('asa', geo.caja, matBorde, [0.4, 0.05, 0.08], [0, 0.24, -0.35]));
  grupo.add(tapa);

  return { grupo, tapa, matLuz };
}

/* =========================================================
   CAJA DE MUNICIÓN y BOTIQUÍN (se recogen al pasar)
   ========================================================= */
export function crearCajaMunicion(cartuchos = false) {
  // Caja verde = balas; caja roja = cartuchos de escopeta
  const grupo = new THREE.Group();
  grupo.name = cartuchos ? 'caja_cartuchos' : 'caja_municion';
  grupo.add(pieza('caja', geo.caja, material(cartuchos ? 0x8a2b20 : 0x4a5230), [0.5, 0.28, 0.3], [0, 0.14, 0]));
  grupo.add(pieza('tapa', geo.caja, material(cartuchos ? 0x5a1a14 : 0x353b22), [0.52, 0.06, 0.32], [0, 0.3, 0]));
  grupo.add(pieza('marca', geo.caja, material(COLORES.ambar, { brilla: true }), [0.2, 0.08, 0.01], [0, 0.15, -0.155]));
  return { grupo };
}

export function crearBotiquin() {
  const grupo = new THREE.Group();
  grupo.name = 'botiquin';
  grupo.add(pieza('caja', geo.caja, material(0xe8e8ec), [0.42, 0.3, 0.2], [0, 0.15, 0]));
  const matCruz = material(COLORES.rojoAlarma, { brilla: true });
  grupo.add(pieza('cruz_h', geo.caja, matCruz, [0.18, 0.06, 0.01], [0, 0.15, -0.105]));
  grupo.add(pieza('cruz_v', geo.caja, matCruz, [0.06, 0.18, 0.01], [0, 0.15, -0.105]));
  grupo.add(pieza('asa', geo.caja, material(COLORES.metalOscuro), [0.16, 0.04, 0.04], [0, 0.32, 0]));
  return { grupo };
}

/* Caja de granadas (v0.8): caja militar verde con 2 granadas encima */
export function crearCajaGranadas() {
  const grupo = new THREE.Group();
  grupo.name = 'caja_granadas';
  grupo.add(pieza('caja', geo.caja, material(0x3a4a2a), [0.5, 0.24, 0.34], [0, 0.12, 0]));
  grupo.add(pieza('franja', geo.caja, material(COLORES.ambar, { brilla: true }), [0.52, 0.04, 0.36], [0, 0.2, 0]));
  const matGranada = material(0x3a5a2a);
  [-0.11, 0.11].forEach((x, i) => grupo.add(pieza('granada_' + (i + 1), geo.esferaSuave, matGranada, [0.09, 0.1, 0.09], [x, 0.33, 0])));
  return { grupo };
}

/* El modelo de cualquier cosa que se recoge tocándola (v0.8) */
export function crearSuministro(tipo) {
  if (tipo === 'botiquin') return crearBotiquin();
  if (tipo === 'granadas') return crearCajaGranadas();
  return crearCajaMunicion(tipo.startsWith('cartuchos'));
}

/* =========================================================
   ESCENARIO: auto destruido, barrera, farola, cristal, grieta
   ========================================================= */
export function crearAutoDestruido(color = 0x5a2a2a) {
  const grupo = new THREE.Group();
  grupo.name = 'auto_destruido';
  const matCarro = material(color);
  const matOscuro = material(0x111215);
  const matVidrio = material(0x1e2a33);
  grupo.add(pieza('chasis', geo.caja, matCarro, [1.9, 0.7, 4.2], [0, 0.55, 0]));
  grupo.add(pieza('cabina', geo.caja, matVidrio, [1.7, 0.6, 2.0], [0, 1.15, 0.2], [0.05, 0, 0.04]));
  grupo.add(pieza('techo_hundido', geo.caja, matCarro, [1.72, 0.08, 1.7], [0, 1.47, 0.25], [0.08, 0, 0.06]));
  [[-0.9, -1.3], [0.9, -1.3], [-0.9, 1.3], [0.9, 1.3]].forEach(([x, z], i) => {
    grupo.add(pieza('llanta_' + (i + 1), geo.cilindro, matOscuro, [0.36, 0.25, 0.36], [x, 0.3, z], [0, 0, Math.PI / 2]));
  });
  return { grupo };
}

export function crearBarrera() {
  const grupo = new THREE.Group();
  grupo.name = 'barrera';
  const matConcreto = material(0x6c6f78);
  grupo.add(pieza('base', geo.caja, matConcreto, [3, 0.35, 0.7], [0, 0.18, 0]));
  grupo.add(pieza('cuerpo', geo.caja, matConcreto, [3, 0.6, 0.35], [0, 0.65, 0]));
  grupo.add(pieza('franja', geo.caja, material(COLORES.rojoAlarma), [3.02, 0.1, 0.36], [0, 0.8, 0]));
  return { grupo };
}

export function crearFarola(encendida = true) {
  const grupo = new THREE.Group();
  grupo.name = 'farola';
  const matPoste = material(0x30343c);
  grupo.add(pieza('poste', geo.cilindro, matPoste, [0.08, 5, 0.08], [0, 2.5, 0]));
  grupo.add(pieza('brazo', geo.caja, matPoste, [0.08, 0.08, 1.1], [0, 4.95, -0.5]));
  const matFoco = encendida ? material(0xff7a5c, { brilla: true }) : material(0x22252b);
  grupo.add(pieza('foco', geo.caja, matFoco, [0.3, 0.12, 0.45], [0, 4.85, -1.0]));
  return { grupo };
}

export function crearCristal(escala = 1) {
  const grupo = new THREE.Group();
  grupo.name = 'cristal_alien';
  const matVerde = material(COLORES.verdeAlien, { brilla: true });
  const matMorado = material(COLORES.moradoAlien, { brilla: true });
  const piezas = [
    [0, 1.2, 0, 0.35, 2.4, 0, 0, matVerde],
    [0.45, 0.8, 0.2, 0.25, 1.6, 0.3, 0.5, matMorado],
    [-0.4, 0.7, -0.15, 0.22, 1.4, -0.2, -0.45, matVerde],
    [0.1, 0.5, 0.5, 0.18, 1.0, 0.6, 0.1, matMorado]
  ];
  piezas.forEach(([x, y, z, r, h, rx, rz, m], i) => {
    grupo.add(pieza('punta_' + (i + 1), geo.cono, m, [r * escala, h * escala, r * escala], [x * escala, y * escala, z * escala], [rx, 0, rz]));
  });
  return { grupo };
}

export function crearGrieta() {
  // Grieta brillante en el suelo: de aquí salen los zánganos
  const grupo = new THREE.Group();
  grupo.name = 'grieta';
  const matBrillo = material(COLORES.verdeAlien, { brilla: true });
  for (let i = 0; i < 5; i++) {
    const largo = 1.2 + Math.random() * 1.4;
    const raya = pieza('raya_' + (i + 1), geo.caja, matBrillo, [0.1, 0.02, largo], [0, 0.02, 0], [0, (i / 5) * Math.PI + Math.random() * 0.4, 0]);
    grupo.add(raya);
  }
  grupo.add(pieza('centro', geo.cilindro, material(0x0c2a1b), [0.8, 0.03, 0.8], [0, 0.015, 0]));
  return { grupo };
}

/* Textura de ventanas para los edificios (hecha con código) */
export function crearTexturaVentanas() {
  const lienzo = document.createElement('canvas');
  lienzo.width = 64;
  lienzo.height = 64;
  const ctx = lienzo.getContext('2d');
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, 64, 64);
  // 4 x 4 ventanas por bloque; algunas con luz, otras rotas
  for (let fila = 0; fila < 4; fila++) {
    for (let col = 0; col < 4; col++) {
      const azar = Math.random();
      if (azar < 0.12) ctx.fillStyle = '#ffb35c';       // luz cálida
      else if (azar < 0.18) ctx.fillStyle = '#5dff9b';  // reflejo alien
      else ctx.fillStyle = '#0d1016';                   // apagada
      ctx.fillRect(col * 16 + 4, fila * 16 + 3, 8, 10);
    }
  }
  const textura = new THREE.CanvasTexture(lienzo);
  textura.colorSpace = THREE.SRGBColorSpace;
  textura.wrapS = textura.wrapT = THREE.RepeatWrapping;
  textura.magFilter = THREE.NearestFilter;
  return textura;
}

/* Edificio: una caja con ventanas + azotea */
export function crearEdificio(ancho, alto, fondo, texturaBase, color = 0x2c2f38) {
  const grupo = new THREE.Group();
  grupo.name = 'edificio';
  const textura = texturaBase.clone();
  textura.needsUpdate = true;
  textura.repeat.set(Math.max(1, Math.round(ancho / 4)), Math.max(1, Math.round(alto / 4)));
  const mat = new THREE.MeshLambertMaterial({
    color, emissive: 0xffffff, emissiveMap: textura, emissiveIntensity: 0.9
  });
  const cuerpo = new THREE.Mesh(geo.caja, mat);
  cuerpo.name = 'cuerpo';
  cuerpo.scale.set(ancho, alto, fondo);
  cuerpo.position.y = alto / 2;
  grupo.add(cuerpo);
  grupo.add(pieza('azotea', geo.caja, material(0x1f2128), [ancho + 0.3, 0.4, fondo + 0.3], [0, alto + 0.2, 0]));
  return { grupo, cuerpo };
}

/* =========================================================
   NAVE NODRIZA (se ve en el cielo, de fondo)
   Diámetro: 120 m
   ========================================================= */
export function crearNaveNodriza() {
  const grupo = new THREE.Group();
  grupo.name = 'nave_nodriza';
  const matCasco = new THREE.MeshBasicMaterial({ color: 0x0f0b1d, fog: false });
  const matLuzVerde = new THREE.MeshBasicMaterial({ color: COLORES.verdeAlien, fog: false });
  const matLuzMorada = new THREE.MeshBasicMaterial({ color: COLORES.moradoAlien, fog: false });

  const disco = new THREE.Mesh(new THREE.CylinderGeometry(60, 48, 8, 24), matCasco);
  disco.name = 'disco';
  grupo.add(disco);
  const cupula = new THREE.Mesh(new THREE.CylinderGeometry(22, 34, 10, 16), matCasco);
  cupula.name = 'cupula';
  cupula.position.y = 8;
  grupo.add(cupula);
  const anillo = new THREE.Mesh(new THREE.TorusGeometry(46, 0.9, 4, 48), matLuzVerde);
  anillo.name = 'anillo_luces';
  anillo.rotation.x = Math.PI / 2;
  anillo.position.y = -4.2;
  grupo.add(anillo);
  const nucleo = new THREE.Mesh(new THREE.CylinderGeometry(9, 12, 2, 12), matLuzMorada);
  nucleo.name = 'nucleo';
  nucleo.position.y = -4.6;
  grupo.add(nucleo);
  // Luces pequeñas alrededor
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const luz = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1, 2.5), i % 2 ? matLuzMorada : matLuzVerde);
    luz.name = 'luz_' + (i + 1);
    luz.position.set(Math.cos(a) * 56, -2, Math.sin(a) * 56);
    grupo.add(luz);
  }
  return { grupo, anillo };
}
