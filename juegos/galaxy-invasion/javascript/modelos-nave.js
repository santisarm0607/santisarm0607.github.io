/* =========================================================
   GALAXY INVASION — modelos-nave.js  (v0.7)
   Modelos de la Etapa 4: la nave nodriza por dentro.
   Mismo estilo low poly (cajas, cilindros y bolas).
     - Cápsula de humano (vacía): tubo de vidrio con luz verde
     - Motor de la nave (se puede destruir)
     - Consola con holograma (la grabación)
     - Sombrero del hermano (la primera pista)
     - Caja alien, columna, puerta corrediza
     - Cápsula de escape
     - El Capitán (jefe) y el planeta colmena (se ve por la ventana)
   ========================================================= */

import * as THREE from 'three';
import { material } from './modelos.js';

const geo = {
  caja: new THREE.BoxGeometry(1, 1, 1),
  esfera: new THREE.IcosahedronGeometry(1, 1),
  esferaBaja: new THREE.IcosahedronGeometry(1, 0),
  cono: new THREE.ConeGeometry(1, 1, 6),
  cilindro: new THREE.CylinderGeometry(1, 1, 1, 10),
  tubo: new THREE.CylinderGeometry(1, 1, 1, 14, 1, true)
};

function pieza(nombre, geometria, mat, escala, posicion = [0, 0, 0], rotacion = [0, 0, 0]) {
  const m = new THREE.Mesh(geometria, mat);
  m.name = nombre;
  m.scale.set(...escala);
  m.position.set(...posicion);
  m.rotation.set(...rotacion);
  return m;
}

/* Colores de la nave: metal morado oscuro con luces verdes y moradas */
export const COLORES_NAVE = {
  piso: 0x2c2840,
  pared: 0x4a4270,
  paredClara: 0x5a5288,
  techo: 0x231e36,
  metal: 0x4a4466,
  verde: 0x5dff9b,
  morado: 0xb36bff,
  rojo: 0xff4d5e
};

/* Cápsula donde la Colmena guardaba humanos. 1.4 m de ancho, 3 m de alto */
export function crearCapsulaHumano() {
  const grupo = new THREE.Group();
  grupo.name = 'capsula_humano';
  const matMetal = material(COLORES_NAVE.metal);
  const matLuz = material(COLORES_NAVE.verde, { brilla: true });
  grupo.add(pieza('base', geo.cilindro, matMetal, [0.8, 0.35, 0.8], [0, 0.18, 0]));
  grupo.add(pieza('tapa', geo.cilindro, matMetal, [0.8, 0.35, 0.8], [0, 2.85, 0]));
  grupo.add(pieza('anillo_abajo', geo.cilindro, matLuz, [0.72, 0.06, 0.72], [0, 0.38, 0]));
  grupo.add(pieza('anillo_arriba', geo.cilindro, matLuz, [0.72, 0.06, 0.72], [0, 2.66, 0]));
  const vidrio = new THREE.Mesh(geo.tubo, new THREE.MeshBasicMaterial({ color: 0x9dff6a, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide }));
  vidrio.name = 'vidrio';
  vidrio.scale.set(0.65, 2.3, 0.65);
  vidrio.position.y = 1.52;
  grupo.add(vidrio);
  return { grupo };
}

/* Motor de la nave: reactor de 7 m con un núcleo que brilla.
   Al destruirlo, el núcleo se apaga (matNucleo pasa a gris) */
export function crearMotorNave() {
  const grupo = new THREE.Group();
  grupo.name = 'motor_nave';
  const matMetal = material(COLORES_NAVE.metal);
  const matOscuro = material(0x221e33);
  const matNucleo = new THREE.MeshBasicMaterial({ color: COLORES_NAVE.morado });
  const matAnillo = new THREE.MeshBasicMaterial({ color: COLORES_NAVE.verde });
  grupo.add(pieza('base', geo.cilindro, matOscuro, [3.0, 0.8, 3.0], [0, 0.4, 0]));
  grupo.add(pieza('carcasa_abajo', geo.cilindro, matMetal, [2.4, 1.6, 2.4], [0, 1.6, 0]));
  grupo.add(pieza('carcasa_arriba', geo.cilindro, matMetal, [2.4, 1.6, 2.4], [0, 5.4, 0]));
  grupo.add(pieza('techo', geo.cilindro, matOscuro, [1.4, 1.2, 1.4], [0, 6.8, 0]));
  // Núcleo (el punto que hay que destruir): se ve entre las dos carcasas
  const nucleo = pieza('nucleo', geo.cilindro, matNucleo, [1.7, 2.3, 1.7], [0, 3.5, 0]);
  grupo.add(nucleo);
  const anillos = new THREE.Group();
  anillos.name = 'anillos';
  [2.6, 3.5, 4.4].forEach((y, i) => anillos.add(pieza('anillo_' + (i + 1), geo.cilindro, matAnillo, [2.05, 0.08, 2.05], [0, y, 0])));
  grupo.add(anillos);
  // Tubos que salen hacia el piso
  [0, 1, 2, 3].forEach((i) => {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    grupo.add(pieza('tubo_' + (i + 1), geo.cilindro, matOscuro, [0.25, 3.2, 0.25], [Math.cos(a) * 2.9, 1.6, Math.sin(a) * 2.9], [Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35]));
  });
  return { grupo, nucleo, matNucleo, matAnillo, anillos };
}

/* Consola con pantalla de holograma. 1.6 m */
export function crearConsola() {
  const grupo = new THREE.Group();
  grupo.name = 'consola';
  const matMetal = material(COLORES_NAVE.metal);
  grupo.add(pieza('pie', geo.caja, matMetal, [0.5, 1.0, 0.5], [0, 0.5, 0]));
  grupo.add(pieza('tablero', geo.caja, material(0x221e33), [1.4, 0.12, 0.8], [0, 1.05, 0], [0.35, 0, 0]));
  grupo.add(pieza('botones', geo.caja, material(COLORES_NAVE.verde, { brilla: true }), [1.0, 0.03, 0.4], [0, 1.13, 0.05], [0.35, 0, 0]));
  const matPantalla = new THREE.MeshBasicMaterial({ color: COLORES_NAVE.verde, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide });
  const pantalla = pieza('holograma', geo.caja, matPantalla, [1.3, 0.9, 0.02], [0, 1.85, -0.1]);
  grupo.add(pantalla);
  return { grupo, pantalla, matPantalla };
}

/* Sombrero del hermano secuestrado (pista 1). color = el de su sombrero */
export function crearSombrero(color) {
  const grupo = new THREE.Group();
  grupo.name = 'sombrero';
  // Material propio (no el del caché): la misión le cambia el color según quién fue secuestrado
  const mat = material(color).clone();
  grupo.add(pieza('ala', geo.cilindro, mat, [0.28, 0.025, 0.28], [0, 0.02, 0]));
  grupo.add(pieza('copa', geo.cilindro, mat, [0.14, 0.14, 0.14], [0, 0.1, 0]));
  grupo.add(pieza('cinta', geo.cilindro, material(0x5a3a22), [0.145, 0.035, 0.145], [0, 0.05, 0]));
  return { grupo, mat };
}

/* Caja de carga alienígena. 1.6 m */
export function crearCajaAlien() {
  const grupo = new THREE.Group();
  grupo.name = 'caja_alien';
  grupo.add(pieza('caja', geo.caja, material(0x332c4a), [1.6, 1.2, 1.6], [0, 0.6, 0]));
  grupo.add(pieza('franja', geo.caja, material(COLORES_NAVE.morado, { brilla: true }), [1.62, 0.08, 1.62], [0, 0.9, 0]));
  return { grupo };
}

/* Columna de la nave (de piso a techo) con una línea de luz */
export function crearColumna(alto = 8) {
  const grupo = new THREE.Group();
  grupo.name = 'columna';
  grupo.add(pieza('columna', geo.caja, material(COLORES_NAVE.paredClara), [1.2, alto, 1.2], [0, alto / 2, 0]));
  grupo.add(pieza('luz', geo.caja, material(COLORES_NAVE.verde, { brilla: true }), [0.1, alto * 0.7, 1.22], [0.56, alto / 2, 0]));
  grupo.add(pieza('luz2', geo.caja, material(COLORES_NAVE.verde, { brilla: true }), [0.1, alto * 0.7, 1.22], [-0.56, alto / 2, 0]));
  return { grupo };
}

/* Puerta corrediza: una hoja que sube al abrirse. ancho = espacio del pasillo */
export function crearPuerta(ancho, alto = 6) {
  const grupo = new THREE.Group();
  grupo.name = 'puerta';
  const hoja = new THREE.Group();
  hoja.name = 'hoja';
  hoja.add(pieza('placa', geo.caja, material(0x3a3356), [ancho, alto, 0.4], [0, alto / 2, 0]));
  const matLuz = new THREE.MeshBasicMaterial({ color: COLORES_NAVE.rojo });
  [-1, 1].forEach((l, i) => hoja.add(pieza('luz_' + (i + 1), geo.caja, matLuz, [0.12, alto * 0.8, 0.42], [l * ancho * 0.3, alto / 2, 0])));
  hoja.add(pieza('franja', geo.caja, matLuz, [ancho * 0.6, 0.12, 0.42], [0, alto * 0.55, 0]));
  grupo.add(hoja);
  return { grupo, hoja, matLuz };
}

/* Cápsula de escape: huevo de metal con compuerta abierta. 3 m */
export function crearCapsulaEscape() {
  const grupo = new THREE.Group();
  grupo.name = 'capsula_escape';
  const matMetal = material(0x5a5478);
  grupo.add(pieza('cuerpo', geo.esfera, matMetal, [1.6, 2.0, 1.6], [0, 2.0, 0]));
  grupo.add(pieza('compuerta', geo.caja, material(0x0c0a14), [1.3, 1.9, 0.3], [0, 1.6, 1.45]));
  grupo.add(pieza('luz_compuerta', geo.caja, material(COLORES_NAVE.verde, { brilla: true }), [1.45, 0.08, 0.32], [0, 2.6, 1.45]));
  grupo.add(pieza('base', geo.cilindro, material(0x221e33), [1.8, 0.3, 1.8], [0, 0.15, 0]));
  return { grupo };
}

/* Planeta de la Mente Colmena (se ve por la ventana de la cabina) */
export function crearPlanetaColmena() {
  const grupo = new THREE.Group();
  grupo.name = 'planeta_colmena';
  grupo.add(pieza('planeta', new THREE.IcosahedronGeometry(1, 3), new THREE.MeshBasicMaterial({ color: 0x3d6a3a, fog: false }), [40, 40, 40]));
  // Manchas moradas (la Colmena cubre el planeta)
  const matMancha = new THREE.MeshBasicMaterial({ color: 0x6a3a9a, fog: false });
  [[0.4, 0.5, 0.75], [-0.6, 0.1, 0.8], [0.1, -0.5, 0.85], [-0.2, 0.7, 0.68]].forEach(([x, y, z], i) => {
    grupo.add(pieza('mancha_' + (i + 1), geo.esferaBaja, matMancha, [9 + i * 2, 9 + i * 2, 4], [x * 36, y * 36, z * 36]));
  });
  const anillo = new THREE.Mesh(new THREE.RingGeometry(52, 60, 48), new THREE.MeshBasicMaterial({ color: 0x9dff6a, transparent: true, opacity: 0.25, side: THREE.DoubleSide, fog: false }));
  anillo.rotation.x = 1.2;
  grupo.add(anillo);
  return { grupo };
}

/* =========================================================
   EL CAPITÁN (jefe de la nave). Alto: 3.8 m, flota.
   Túnica con capa, cresta, ojos verdes y un báculo de energía.
   Punto débil: la GEMA del pecho, solo cuando brilla.
   ========================================================= */
function hitbox(nombre, zona, tam, pos) {
  const h = new THREE.Mesh(new THREE.BoxGeometry(...tam), new THREE.MeshBasicMaterial({ visible: false }));
  h.name = nombre;
  h.position.set(...pos);
  h.userData.zona = zona;
  return h;
}

export function crearCapitan() {
  const grupo = new THREE.Group();
  grupo.name = 'capitan';
  const matCuerpo = new THREE.MeshLambertMaterial({ color: 0x4a3a72, flatShading: true, emissive: 0x1c1232 });
  const matArmadura = material(0x5a4a86);
  const matCapa = new THREE.MeshLambertMaterial({ color: 0x5a1a3a, flatShading: true, side: THREE.DoubleSide, emissive: 0x14060c });
  const matOjo = material(COLORES_NAVE.verde, { brilla: true });
  const matGema = new THREE.MeshBasicMaterial({ color: 0x6a4a8a });

  const cuerpo = new THREE.Group();
  cuerpo.name = 'cuerpo_raiz';
  grupo.add(cuerpo);
  // Túnica (cono invertido: flota, no tiene piernas)
  cuerpo.add(pieza('tunica', geo.cono, matCuerpo, [1.0, 2.2, 1.0], [0, 1.3, 0], [Math.PI, 0, 0]));
  cuerpo.add(pieza('cola_energia', geo.cono, material(COLORES_NAVE.morado, { brilla: true }), [0.35, 0.8, 0.35], [0, 0.0, 0], [Math.PI, 0, 0]));
  const torso = new THREE.Group();
  torso.name = 'torso';
  torso.position.set(0, 2.5, 0);
  cuerpo.add(torso);
  torso.add(pieza('pecho', geo.caja, matArmadura, [1.3, 1.1, 0.8], [0, 0.1, 0]));
  torso.add(pieza('hombrera_izq', geo.esferaBaja, matArmadura, [0.45, 0.35, 0.45], [-0.8, 0.55, 0]));
  torso.add(pieza('hombrera_der', geo.esferaBaja, matArmadura, [0.45, 0.35, 0.45], [0.8, 0.55, 0]));
  // Gema del pecho (punto débil)
  const gema = pieza('gema', geo.esferaBaja, matGema, [0.28, 0.28, 0.18], [0, 0.15, -0.42]);
  torso.add(gema);
  // Capa
  const capa = pieza('capa', new THREE.PlaneGeometry(1.6, 2.4), matCapa, [1, 1, 1], [0, -0.6, 0.45], [0.12, 0, 0]);
  torso.add(capa);
  // Cabeza alargada con cresta y 3 ojos
  const cabeza = new THREE.Group();
  cabeza.name = 'cabeza';
  cabeza.position.set(0, 0.95, -0.05);
  cabeza.add(pieza('craneo', geo.esfera, matCuerpo, [0.38, 0.5, 0.42], [0, 0.15, 0]));
  cabeza.add(pieza('cresta', geo.cono, matArmadura, [0.22, 0.8, 0.5], [0, 0.65, 0.1], [-0.3, 0, 0]));
  [[-0.15, 0.2], [0.15, 0.2], [0, 0.36]].forEach(([x, y], i) => cabeza.add(pieza('ojo_' + (i + 1), geo.esferaBaja, matOjo, [0.07, 0.05, 0.04], [x, y, -0.38])));
  torso.add(cabeza);
  // Brazos: el derecho lleva el báculo
  const brazos = [];
  [-1, 1].forEach((lado) => {
    const b = new THREE.Group();
    b.name = lado < 0 ? 'brazo_izq' : 'brazo_der';
    b.position.set(lado * 0.85, 0.45, 0);
    b.add(pieza('brazo', geo.caja, matCuerpo, [0.28, 0.9, 0.28], [0, -0.45, 0]));
    b.add(pieza('mano', geo.esferaBaja, matArmadura, [0.18, 0.18, 0.18], [0, -0.95, 0]));
    torso.add(b);
    brazos.push(b);
  });
  const baculo = new THREE.Group();
  baculo.name = 'baculo';
  baculo.position.set(0, -0.95, 0);
  baculo.add(pieza('vara', geo.cilindro, material(0x221e33), [0.06, 2.6, 0.06], [0, 0.3, 0]));
  const punta = pieza('punta', geo.esferaBaja, material(COLORES_NAVE.verde, { brilla: true }), [0.2, 0.28, 0.2], [0, 1.7, 0]);
  baculo.add(punta);
  brazos[1].add(baculo);
  const salida = new THREE.Object3D();
  salida.name = 'salida_plasma';
  salida.position.set(0, 1.7, 0);
  baculo.add(salida);

  // Cajas de disparo
  // (va en el torso, no dentro de la gema: la gema está escalada y la caja saldría diminuta)
  const hitGema = hitbox('hitbox_gema', 'nucleo', [0.75, 0.75, 0.5], [0, 0.15, -0.5]);
  torso.add(hitGema);
  const hitCuerpo = hitbox('hitbox_cuerpo', 'cuerpo', [1.6, 3.4, 1.1], [0, 1.9, 0]);
  grupo.add(hitCuerpo);

  return {
    grupo, cuerpo, torso, cabeza, brazos, baculo, punta, gema, capa, matCuerpo, matGema, salidaPlasma: salida,
    hitboxes: [hitGema, hitCuerpo], hitbox: hitCuerpo, hitGema
  };
}
