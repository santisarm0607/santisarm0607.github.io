/* =========================================================
   GALAXY INVASION — modelos-jefes.js
   Modelos de los jefes. Mismo estilo low poly (cajas y bolas).
   Cada jefe trae:
     hitboxes: cajas invisibles que reciben los disparos.
       userData.zona = 'cuerpo' (blindado) o 'nucleo' (punto débil)
     matCuerpo: material que parpadea al recibir un golpe
   Jefes: Bestia de Heno (granja), el Lanzador (carretera) y el
   Guardián de la nave (ciudad).
   ========================================================= */

import * as THREE from 'three';
import { material, COLORES } from './modelos.js';
import { COLORES_GRANJA } from './modelos-granja.js';

const geo = {
  caja: new THREE.BoxGeometry(1, 1, 1),
  esfera: new THREE.IcosahedronGeometry(1, 1),
  esferaBaja: new THREE.IcosahedronGeometry(1, 0),
  cono: new THREE.ConeGeometry(1, 1, 6),
  cilindro: new THREE.CylinderGeometry(1, 1, 1, 8)
};

function pieza(nombre, geometria, mat, escala, posicion = [0, 0, 0], rotacion = [0, 0, 0]) {
  const m = new THREE.Mesh(geometria, mat);
  m.name = nombre;
  m.scale.set(...escala);
  m.position.set(...posicion);
  m.rotation.set(...rotacion);
  return m;
}

/* Caja invisible que recibe disparos */
function hitbox(nombre, zona, tam, pos) {
  // Cajas invisibles: el rayo de los disparos sí las detecta
  const h = new THREE.Mesh(new THREE.BoxGeometry(...tam), new THREE.MeshBasicMaterial({ visible: false }));
  h.name = nombre;
  h.position.set(...pos);
  h.userData.zona = zona;
  return h;
}

/* =========================================================
   BESTIA DE HENO (jefe de la granja). 6 m de alto
   Un alien que se fusionó con las pacas de heno. En el pecho
   tiene un núcleo brillante (el alien) tapado por dos pacas
   que se abren después de embestir o cuando se quema.
   ========================================================= */
export function crearBestiaHeno() {
  const grupo = new THREE.Group();
  grupo.name = 'bestia_de_heno';
  // Material propio del heno (parpadea al recibir golpes y se pone naranja al quemarse)
  const matCuerpo = new THREE.MeshLambertMaterial({ color: COLORES_GRANJA.heno, flatShading: true, emissive: 0x000000 });
  const matAmarre = material(0x6b4a2b);
  const matBaba = material(COLORES_GRANJA.babaBrillo, { brilla: true });
  const matNucleo = new THREE.MeshBasicMaterial({ color: COLORES_GRANJA.babaBrillo });
  const matOscuro = material(0x1a1208);
  const matMetal = material(0x7a7f86);

  // Una paca con sus amarres
  function paca(nombre, tam, pos, rot = [0, 0, 0]) {
    const g = new THREE.Group();
    g.name = nombre;
    g.position.set(...pos);
    g.rotation.set(...rot);
    g.add(pieza('heno', geo.caja, matCuerpo, tam));
    g.add(pieza('amarre_1', geo.caja, matAmarre, [tam[0] + 0.02, tam[1] + 0.02, 0.06], [0, 0, -tam[2] * 0.25]));
    g.add(pieza('amarre_2', geo.caja, matAmarre, [tam[0] + 0.02, tam[1] + 0.02, 0.06], [0, 0, tam[2] * 0.25]));
    return g;
  }

  const cuerpo = new THREE.Group();
  cuerpo.name = 'cuerpo_raiz';
  grupo.add(cuerpo);

  // Piernas (2 pacas cada una)
  const piernas = [];
  [-0.85, 0.85].forEach((x, i) => {
    const p = new THREE.Group();
    p.name = i ? 'pierna_der' : 'pierna_izq';
    p.position.set(x, 2.3, 0);
    p.add(paca('muslo', [1.0, 1.1, 1.0], [0, -0.55, 0]));
    p.add(paca('canilla', [1.1, 1.1, 1.1], [0, -1.65, -0.05]));
    cuerpo.add(p);
    piernas.push(p);
  });

  // Torso: bloque de pacas con el núcleo adentro
  const torso = new THREE.Group();
  torso.name = 'torso';
  torso.position.set(0, 3.6, 0);
  cuerpo.add(torso);
  torso.add(paca('vientre', [2.6, 1.0, 1.6], [0, -0.75, 0.05]));
  torso.add(paca('espalda', [2.8, 1.8, 0.9], [0, 0.35, 0.45]));
  torso.add(paca('hombros', [3.4, 0.9, 1.5], [0, 1.25, 0.1]));
  // Núcleo: el alien de adentro (brilla)
  const nucleo = new THREE.Group();
  nucleo.name = 'nucleo';
  nucleo.position.set(0, 0.25, -0.35);
  nucleo.add(pieza('alien', geo.esfera, matNucleo, [0.55, 0.5, 0.45]));
  nucleo.add(pieza('ojo_izq', geo.esfera, matOscuro, [0.09, 0.09, 0.05], [-0.18, 0.1, -0.42]));
  nucleo.add(pieza('ojo_der', geo.esfera, matOscuro, [0.09, 0.09, 0.05], [0.18, 0.1, -0.42]));
  torso.add(nucleo);
  // Las dos pacas del pecho (se abren como puertas)
  const pechoIzq = paca('pecho_izq', [1.3, 1.6, 0.7], [-0.66, 0.3, -0.55]);
  const pechoDer = paca('pecho_der', [1.3, 1.6, 0.7], [0.66, 0.3, -0.55]);
  torso.add(pechoIzq, pechoDer);

  // Cabeza: una paca con ojos de baba y un trinche clavado como cuerno
  const cabeza = new THREE.Group();
  cabeza.name = 'cabeza';
  cabeza.position.set(0, 2.25, -0.1);
  torso.add(cabeza);
  cabeza.add(paca('craneo', [1.3, 0.95, 1.1], [0, 0, 0]));
  cabeza.add(pieza('ojo_izq', geo.esfera, matBaba, [0.13, 0.13, 0.08], [-0.3, 0.1, -0.56]));
  cabeza.add(pieza('ojo_der', geo.esfera, matBaba, [0.13, 0.13, 0.08], [0.3, 0.1, -0.56]));
  cabeza.add(pieza('boca', geo.caja, matOscuro, [0.7, 0.15, 0.06], [0, -0.25, -0.56]));
  const trinche = new THREE.Group();
  trinche.name = 'trinche';
  trinche.position.set(0.35, 0.45, 0);
  trinche.rotation.z = -0.4;
  trinche.add(pieza('mango', geo.cilindro, material(COLORES_GRANJA.madera), [0.04, 1.2, 0.04], [0, 0.6, 0]));
  [-0.1, 0, 0.1].forEach((x, i) => trinche.add(pieza('punta_' + (i + 1), geo.cilindro, matMetal, [0.02, 0.35, 0.02], [x, 1.35, 0])));
  trinche.add(pieza('travesano', geo.caja, matMetal, [0.26, 0.03, 0.03], [0, 1.18, 0]));
  cabeza.add(trinche);

  // Brazos (3 pacas: brazo, antebrazo y puño grande)
  const brazos = [];
  [-1, 1].forEach((lado) => {
    const b = new THREE.Group();
    b.name = lado < 0 ? 'brazo_izq' : 'brazo_der';
    b.position.set(lado * 2.0, 1.25, 0);
    b.add(paca('brazo', [0.9, 1.1, 0.9], [lado * 0.15, -0.6, 0]));
    b.add(paca('antebrazo', [0.85, 1.1, 0.85], [lado * 0.2, -1.65, -0.05]));
    b.add(paca('puno', [1.2, 0.9, 1.1], [lado * 0.2, -2.6, -0.1]));
    torso.add(b);
    brazos.push(b);
  });

  // Tentáculos de baba que lo mantienen unido (lo "fusionado")
  [[-1.0, 0.5, -0.8, 0.5], [1.1, -0.4, -0.8, -0.6], [0, 1.0, -0.75, 1.4], [-1.3, 1.0, 0.2, 0.9], [1.2, -0.9, 0.5, -0.3]].forEach(([x, y, z, r], i) => {
    torso.add(pieza('tentaculo_' + (i + 1), geo.cilindro, matBaba, [0.07, 1.4, 0.07], [x, y, z], [0, 0, r]));
  });

  // Cajas de disparo: el cuerpo (blindado) y el núcleo (punto débil, delante del pecho)
  const hitCuerpo = hitbox('hitbox_cuerpo', 'cuerpo', [3.4, 5.8, 2.0], [0, 2.9, 0.1]);
  const hitNucleo = hitbox('hitbox_nucleo', 'nucleo', [1.3, 1.3, 0.6], [0, 3.85, -1.25]);
  grupo.add(hitCuerpo, hitNucleo);

  return {
    grupo, cuerpo, torso, cabeza, nucleo, pechoIzq, pechoDer, brazos, piernas, matCuerpo, matNucleo,
    hitboxes: [hitNucleo, hitCuerpo], hitbox: hitCuerpo, hitNucleo
  };
}

/* Paca que lanza la Bestia (centrada para que gire bien) */
export function crearPacaLanzada() {
  const g = new THREE.Group();
  g.name = 'paca_lanzada';
  g.add(pieza('heno', geo.caja, material(COLORES_GRANJA.heno), [1.2, 0.8, 0.8]));
  g.add(pieza('amarre', geo.caja, material(0x6b4a2b), [1.22, 0.82, 0.05]));
  return g;
}

/* =========================================================
   EL LANZADOR (jefe de la carretera). 11 m de alto
   Un alien gigante de roca que arranca cosas del camino y las
   lanza. Tiene 3 sacos de baba que brillan (hombros y barriga):
   son sus puntos débiles. Cuando revientan los 3, su cabeza
   queda sin protección.
   ========================================================= */
export function crearLanzador() {
  const grupo = new THREE.Group();
  grupo.name = 'lanzador';
  const matCuerpo = new THREE.MeshLambertMaterial({ color: 0x5a5368, flatShading: true, emissive: 0x15111e });
  const matRoca = material(0x3d3846);
  const matOscuro = material(0x16121c);
  const matOjo = material(COLORES.verdeAlien, { brilla: true });
  const matSaco = new THREE.MeshBasicMaterial({ color: 0x9dff6a });

  const cuerpo = new THREE.Group();
  cuerpo.name = 'cuerpo_raiz';
  grupo.add(cuerpo);

  // Piernas: columnas de roca
  const piernas = [];
  [-1.5, 1.5].forEach((x, i) => {
    const p = new THREE.Group();
    p.name = i ? 'pierna_der' : 'pierna_izq';
    p.position.set(x, 4.8, 0.3);
    p.add(pieza('muslo', geo.esferaBaja, matCuerpo, [1.0, 1.7, 1.0], [0, -1.1, 0]));
    p.add(pieza('rodilla', geo.esferaBaja, matRoca, [0.9, 0.7, 0.9], [0, -2.6, -0.2]));
    p.add(pieza('canilla', geo.esferaBaja, matCuerpo, [0.9, 1.4, 0.9], [0, -3.6, 0]));
    p.add(pieza('pie', geo.caja, matRoca, [1.5, 0.6, 2.0], [0, -4.5, -0.3]));
    cuerpo.add(p);
    piernas.push(p);
  });

  // Torso encorvado
  const torso = new THREE.Group();
  torso.name = 'torso';
  torso.position.set(0, 6.9, 0);
  torso.rotation.x = 0.25;
  cuerpo.add(torso);
  torso.add(pieza('barriga', geo.esferaBaja, matCuerpo, [2.2, 1.8, 1.7], [0, -0.6, 0]));
  torso.add(pieza('pecho', geo.esferaBaja, matCuerpo, [2.6, 1.7, 1.8], [0, 1.3, 0.1]));
  torso.add(pieza('espalda', geo.esferaBaja, matRoca, [2.4, 1.6, 1.3], [0, 1.6, 1.0]));
  [[-1.2, 2.3, 0.9], [0.4, 2.7, 1.2], [1.4, 2.1, 0.8], [-0.4, 1.0, 1.6]].forEach(([x, y, z], i) => torso.add(pieza('pua_' + (i + 1), geo.cono, matRoca, [0.35, 1.1, 0.35], [x, y, z], [0.5, 0, x * -0.3])));

  // Sacos de baba (puntos débiles): hombro izquierdo, hombro derecho y barriga
  const sacos = [];
  [[-1.6, 2.4, -0.6], [1.6, 2.4, -0.6], [0, -0.5, -1.55]].forEach(([x, y, z], i) => {
    const s = new THREE.Group();
    s.name = 'saco_' + (i + 1);
    s.position.set(x, y, z);
    s.add(pieza('bolsa', geo.esfera, matSaco, [0.75, 0.75, 0.6]));
    s.add(pieza('venas', geo.esferaBaja, matOscuro, [0.8, 0.5, 0.45], [0, -0.25, 0.1]));
    torso.add(s);
    sacos.push(s);
  });

  // Cabeza pequeña con un solo ojo
  const cabeza = new THREE.Group();
  cabeza.name = 'cabeza';
  cabeza.position.set(0, 2.9, -1.0);
  cabeza.add(pieza('craneo', geo.esferaBaja, matCuerpo, [0.9, 0.8, 0.9]));
  cabeza.add(pieza('casco', geo.esferaBaja, matRoca, [1.0, 0.45, 0.95], [0, 0.45, 0.1]));
  cabeza.add(pieza('ojo', geo.esfera, matOjo, [0.32, 0.32, 0.2], [0, 0.05, -0.82]));
  cabeza.add(pieza('mandibula', geo.caja, matOscuro, [1.0, 0.3, 0.5], [0, -0.6, -0.55]));
  torso.add(cabeza);

  // Brazos larguísimos. La mano derecha agarra lo que va a lanzar
  const brazos = [];
  [-1, 1].forEach((lado) => {
    const b = new THREE.Group();
    b.name = lado < 0 ? 'brazo_izq' : 'brazo_der';
    b.position.set(lado * 2.6, 1.8, 0);
    b.add(pieza('hombro', geo.esferaBaja, matRoca, [1.0, 0.9, 1.0]));
    b.add(pieza('brazo', geo.esferaBaja, matCuerpo, [0.7, 1.7, 0.7], [lado * 0.2, -1.8, 0]));
    b.add(pieza('antebrazo', geo.esferaBaja, matCuerpo, [0.65, 1.6, 0.65], [lado * 0.3, -4.2, -0.2]));
    b.add(pieza('mano', geo.esferaBaja, matRoca, [0.9, 0.8, 1.0], [lado * 0.3, -5.8, -0.3]));
    torso.add(b);
    brazos.push(b);
  });
  // Lo que lleva en la mano (se esconde al lanzarlo)
  const carga = new THREE.Group();
  carga.name = 'carga';
  carga.position.set(0.3, -6.6, -0.4);
  carga.add(pieza('roca', geo.esferaBaja, material(0x5d5866), [1.2, 1.0, 1.1]));
  brazos[1].add(carga);

  // Cajas de disparo: cuerpo (blindado), 3 sacos y la cabeza
  // (no muy hondo hacia adelante, para que los sacos queden por delante y reciban las balas)
  const hitCuerpo = hitbox('hitbox_cuerpo', 'cuerpo', [5.4, 10.5, 2.4], [0, 5.3, 0.8]);
  const hitSacos = sacos.map((s, i) => {
    const h = hitbox('hitbox_saco_' + (i + 1), 'saco' + i, [1.7, 1.7, 1.3], [0, 0, -0.1]);
    s.add(h);
    return h;
  });
  const hitCabeza = hitbox('hitbox_cabeza', 'nucleo', [2.0, 1.9, 2.0], [0, 0, -0.2]);
  cabeza.add(hitCabeza);
  grupo.add(hitCuerpo);

  return {
    grupo, cuerpo, torso, cabeza, sacos, brazos, piernas, carga, matCuerpo, matSaco,
    hitboxes: [...hitSacos, hitCabeza, hitCuerpo], hitbox: hitCuerpo, hitSacos, hitCabeza
  };
}

/* =========================================================
   GUARDIÁN DE LA NAVE (jefe de la ciudad). 9 m de alto
   Caballero de metal alien con un núcleo rosado en el pecho y
   un escudo de energía (burbuja) que alimentan 3 generadores.
   ========================================================= */
export function crearGuardian() {
  const grupo = new THREE.Group();
  grupo.name = 'guardian';
  const matCuerpo = new THREE.MeshLambertMaterial({ color: 0x2c2346, flatShading: true, emissive: 0x0e0a1c });
  const matPlaca = material(0x4a3d72);
  const matLinea = material(COLORES.verdeAlien, { brilla: true });
  const matNucleo = new THREE.MeshBasicMaterial({ color: 0xff5ad1 });
  const matOjo = material(0xff5ad1, { brilla: true });

  const cuerpo = new THREE.Group();
  cuerpo.name = 'cuerpo_raiz';
  grupo.add(cuerpo);

  const piernas = [];
  [-1.1, 1.1].forEach((x, i) => {
    const p = new THREE.Group();
    p.name = i ? 'pierna_der' : 'pierna_izq';
    p.position.set(x, 3.6, 0);
    p.add(pieza('muslo', geo.caja, matCuerpo, [0.9, 1.6, 0.9], [0, -0.8, 0]));
    p.add(pieza('rodillera', geo.caja, matPlaca, [1.0, 0.6, 1.1], [0, -1.8, -0.15]));
    p.add(pieza('canilla', geo.caja, matPlaca, [0.85, 1.5, 0.9], [0, -2.7, 0]));
    p.add(pieza('pie', geo.caja, matCuerpo, [1.1, 0.4, 1.6], [0, -3.45, -0.25]));
    p.add(pieza('linea', geo.caja, matLinea, [0.05, 1.2, 0.05], [x > 0 ? 0.46 : -0.46, -2.6, -0.3]));
    cuerpo.add(p);
    piernas.push(p);
  });

  const torso = new THREE.Group();
  torso.name = 'torso';
  torso.position.set(0, 5.4, 0);
  cuerpo.add(torso);
  torso.add(pieza('cintura', geo.caja, matCuerpo, [1.8, 1.0, 1.2], [0, -1.2, 0]));
  torso.add(pieza('pecho', geo.caja, matPlaca, [3.0, 2.2, 1.7], [0, 0.6, 0]));
  torso.add(pieza('cuello', geo.caja, matCuerpo, [0.9, 0.5, 0.9], [0, 1.9, 0]));
  // Núcleo en el pecho (punto débil)
  const nucleo = new THREE.Group();
  nucleo.name = 'nucleo';
  nucleo.position.set(0, 0.6, -0.9);
  nucleo.add(pieza('cristal', geo.esfera, matNucleo, [0.6, 0.6, 0.35]));
  nucleo.add(pieza('marco', geo.cilindro, matCuerpo, [0.75, 0.15, 0.75], [0, 0, 0.1], [Math.PI / 2, 0, 0]));
  torso.add(nucleo);
  [[-1.0, 1.4], [1.0, 1.4], [-1.0, -0.2], [1.0, -0.2]].forEach(([x, y], i) => torso.add(pieza('linea_pecho_' + (i + 1), geo.caja, matLinea, [0.6, 0.05, 0.05], [x, y, -0.86])));

  // Cabeza con cresta y visor
  const cabeza = new THREE.Group();
  cabeza.name = 'cabeza';
  cabeza.position.set(0, 2.7, -0.1);
  cabeza.add(pieza('yelmo', geo.caja, matPlaca, [1.0, 1.0, 1.1]));
  cabeza.add(pieza('cresta', geo.caja, matCuerpo, [0.15, 0.9, 1.4], [0, 0.6, 0.1]));
  cabeza.add(pieza('visor', geo.caja, matOjo, [0.75, 0.12, 0.05], [0, 0.05, -0.56]));
  torso.add(cabeza);

  // Brazos: el izquierdo es un cañón (orbes), el derecho una garra
  const brazos = [];
  [-1, 1].forEach((lado) => {
    const b = new THREE.Group();
    b.name = lado < 0 ? 'brazo_izq' : 'brazo_der';
    b.position.set(lado * 2.0, 1.2, 0);
    b.add(pieza('hombrera', geo.caja, matPlaca, [1.2, 0.8, 1.3], [lado * 0.1, 0.2, 0]));
    b.add(pieza('brazo', geo.caja, matCuerpo, [0.7, 1.8, 0.7], [lado * 0.15, -1.1, 0]));
    if (lado < 0) {
      b.add(pieza('canon', geo.cilindro, matPlaca, [0.45, 1.6, 0.45], [lado * 0.15, -2.6, -0.3], [0.4, 0, 0]));
      b.add(pieza('boca_canon', geo.cilindro, matOjo, [0.3, 0.1, 0.3], [lado * 0.15, -3.35, -0.62], [0.4, 0, 0]));
    } else {
      [-0.25, 0, 0.25].forEach((dx, i) => b.add(pieza('garra_' + (i + 1), geo.cono, matPlaca, [0.15, 0.8, 0.15], [0.15 + dx, -2.5, -0.1], [Math.PI, 0, 0])));
    }
    torso.add(b);
    brazos.push(b);
  });
  const bocaCanon = new THREE.Object3D();
  bocaCanon.name = 'salida_orbes';
  bocaCanon.position.set(-0.15, -3.5, -0.7);
  brazos[0].add(bocaCanon);

  // Escudo de energía: una burbuja transparente
  const escudo = new THREE.Group();
  escudo.name = 'escudo';
  escudo.position.set(0, 4.6, 0);
  const matEscudo = new THREE.MeshBasicMaterial({ color: 0xb36bff, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide });
  const matRed = new THREE.MeshBasicMaterial({ color: 0xd9a8ff, wireframe: true, transparent: true, opacity: 0.35 });
  escudo.add(new THREE.Mesh(new THREE.IcosahedronGeometry(6.2, 2), matEscudo));
  escudo.add(new THREE.Mesh(new THREE.IcosahedronGeometry(6.25, 1), matRed));
  grupo.add(escudo);

  // Cajas de disparo
  const hitEscudo = new THREE.Mesh(new THREE.SphereGeometry(6.2, 16, 12), new THREE.MeshBasicMaterial({ visible: false }));
  hitEscudo.name = 'hitbox_escudo';
  hitEscudo.userData.zona = 'escudo';
  hitEscudo.position.copy(escudo.position);
  const hitNucleo = hitbox('hitbox_nucleo', 'nucleo', [1.5, 1.5, 0.8], [0, 0, -0.2]);
  nucleo.add(hitNucleo);
  const hitCuerpo = hitbox('hitbox_cuerpo', 'cuerpo', [4.6, 8.6, 2.2], [0, 4.3, 0]);
  grupo.add(hitEscudo, hitCuerpo);

  return {
    grupo, cuerpo, torso, cabeza, nucleo, brazos, piernas, escudo, matEscudo, matRed, matCuerpo, matNucleo, salidaOrbes: bocaCanon,
    hitboxes: [hitEscudo, hitNucleo, hitCuerpo], hitbox: hitCuerpo, hitEscudo, hitNucleo
  };
}

/* Generador del escudo del Guardián. 4.5 m */
export function crearGenerador() {
  const grupo = new THREE.Group();
  grupo.name = 'generador';
  const matBase = material(0x2c2346);
  const matCristal = new THREE.MeshBasicMaterial({ color: 0xb36bff });
  grupo.add(pieza('base', geo.cilindro, matBase, [1.3, 0.8, 1.3], [0, 0.4, 0]));
  grupo.add(pieza('columna', geo.cilindro, material(0x4a3d72), [0.55, 2.2, 0.55], [0, 1.9, 0]));
  const cristal = pieza('cristal', geo.cono, matCristal, [0.65, 1.6, 0.65], [0, 3.8, 0]);
  grupo.add(cristal);
  [0, 1, 2].forEach((i) => {
    const a = (i / 3) * Math.PI * 2;
    grupo.add(pieza('aleta_' + (i + 1), geo.caja, matBase, [0.15, 1.6, 0.7], [Math.cos(a) * 0.75, 1.4, Math.sin(a) * 0.75], [0, -a, 0.15]));
  });
  const anillo = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.07, 4, 16), matCristal);
  anillo.name = 'anillo';
  anillo.rotation.x = Math.PI / 2;
  anillo.position.y = 3.0;
  grupo.add(anillo);
  return { grupo, cristal, anillo, matCristal };
}
