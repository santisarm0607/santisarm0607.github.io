/* =========================================================
   GALAXY INVASION — modelos-granja.js
   Modelos de la Etapa 1 (La granja): Rosa, los Babosos y
   todo lo de la granja (casa, granero, silo, maíz, tractor,
   camioneta...). Mismo estilo low poly que modelos.js.
   ========================================================= */

import * as THREE from 'three';
import { material, COLORES } from './modelos.js';

/* ---------- Geometrías compartidas ---------- */
const geo = {
  caja: new THREE.BoxGeometry(1, 1, 1),
  esfera: new THREE.IcosahedronGeometry(1, 1),
  esferaBaja: new THREE.IcosahedronGeometry(1, 0),
  cono: new THREE.ConeGeometry(1, 1, 6),
  cilindro: new THREE.CylinderGeometry(1, 1, 1, 8),
  prisma: new THREE.CylinderGeometry(1, 1, 1, 3) // para techos a dos aguas
};

function pieza(nombre, geometria, mat, escala, posicion = [0, 0, 0], rotacion = [0, 0, 0]) {
  const m = new THREE.Mesh(geometria, mat);
  m.name = nombre;
  m.scale.set(...escala);
  m.position.set(...posicion);
  m.rotation.set(...rotacion);
  return m;
}

export const COLORES_GRANJA = {
  baba: 0x3fd16a,
  babaOscura: 0x1f7a3c,
  babaBrillo: 0x9dff6a,
  manchas: 0x7a3fb3,
  pasto: 0x22361f,
  tierra: 0x3b2c1e,
  maderaRoja: 0x7a2420,
  madera: 0x6b4a2b,
  maderaClara: 0x9a7448,
  heno: 0xc9a24a,
  maiz: 0x3f5a22,
  maizSeco: 0x7a6a32
};

/* =========================================================
   GENTE DE LA GRANJA: Rosa y Tomás Méndez (hermanos).
   El jugador los ve en primera persona, pero salen enteros en
   la escena del secuestro (cinematica.js) y servirán para el
   multijugador. Piezas que se animan: pierna_izq/der,
   brazo_izq/der y cabeza (grupos con el pivote arriba).
   ========================================================= */
export function crearPersonaGranja(nombre, c) {
  const grupo = new THREE.Group();
  grupo.name = nombre;
  const matOverol = material(c.overol);
  const matCamisa = material(c.camisa);
  const matPiel = material(COLORES.piel);
  const matBotas = material(0x4a2e1a);
  const matSombrero = material(c.sombrero);
  const matCinta = material(0x5a3a22);
  const matPelo = material(c.pelo);

  [['pierna_izq', -0.11], ['pierna_der', 0.11]].forEach(([n, x]) => {
    const p = new THREE.Group(); p.name = n; p.position.set(x, 0.86, 0);
    p.add(pieza('pierna', geo.caja, matOverol, [0.15, 0.78, 0.17], [0, -0.38, 0]));
    p.add(pieza('bota', geo.caja, matBotas, [0.16, 0.14, 0.26], [0, -0.8, -0.04]));
    grupo.add(p);
  });
  grupo.add(pieza('torso', geo.caja, matCamisa, [0.4 * c.ancho, 0.48, 0.22], [0, 1.15, 0]));
  grupo.add(pieza('peto_overol', geo.caja, matOverol, [0.32 * c.ancho, 0.3, 0.235], [0, 1.03, 0]));
  grupo.add(pieza('tirante_izq', geo.caja, matOverol, [0.05, 0.25, 0.24], [-0.12 * c.ancho, 1.26, 0]));
  grupo.add(pieza('tirante_der', geo.caja, matOverol, [0.05, 0.25, 0.24], [0.12 * c.ancho, 1.26, 0]));
  const cabeza = new THREE.Group(); cabeza.name = 'cabeza'; cabeza.position.set(0, 1.52, 0);
  cabeza.add(pieza('cara', geo.caja, matPiel, [0.19, 0.22, 0.2]));
  cabeza.add(pieza('pelo', geo.caja, matPelo, [0.2, 0.12, 0.21], [0, 0.07, 0.01]));
  if (c.trenza) cabeza.add(pieza('trenza', geo.caja, matPelo, [0.06, 0.3, 0.06], [0, -0.12, 0.12], [0.2, 0, 0]));
  if (c.barba) cabeza.add(pieza('barba', geo.caja, matPelo, [0.2, 0.1, 0.06], [0, -0.08, -0.09]));
  cabeza.add(pieza('ala_sombrero', geo.cilindro, matSombrero, [0.24, 0.02, 0.24], [0, 0.14, 0]));
  cabeza.add(pieza('copa_sombrero', geo.cilindro, matSombrero, [0.12, 0.12, 0.12], [0, 0.2, 0]));
  cabeza.add(pieza('cinta_sombrero', geo.cilindro, matCinta, [0.125, 0.03, 0.125], [0, 0.16, 0]));
  grupo.add(cabeza);
  [['brazo_izq', -0.27 * c.ancho, 1], ['brazo_der', 0.27 * c.ancho, -1]].forEach(([n, x, lado]) => {
    const b = new THREE.Group(); b.name = n; b.position.set(x, 1.36, 0);
    b.add(pieza('brazo', geo.caja, matCamisa, [0.11, 0.32, 0.12], [0, -0.16, 0]));
    b.add(pieza('antebrazo', geo.caja, matCamisa, [0.1, 0.26, 0.11], [0, -0.44, -0.02]));
    b.add(pieza('guante', geo.caja, matCinta, [0.09, 0.1, 0.1], [0, -0.62, -0.02]));
    b.rotation.z = lado * 0.08;
    grupo.add(b);
  });
  grupo.scale.setScalar(c.escala);
  return { grupo };
}

/* ROSA MÉNDEZ (la granjera). Alto: 1.70 m. Camisa roja, trenza */
export function crearGranjera() {
  return crearPersonaGranja('rosa_mendez', { camisa: 0x8a2b2b, overol: 0x2f4a6b, sombrero: 0xb08a4a, pelo: 0x3a2416, trenza: true, ancho: 1, escala: 1 });
}

/* TOMÁS MÉNDEZ (el granjero, hermano de Rosa). Alto: 1.80 m. Camisa azul, barba */
export function crearGranjero() {
  return crearPersonaGranja('tomas_mendez', { camisa: 0x2f5a8a, overol: 0x5a4632, sombrero: 0x8a6a3a, pelo: 0x2a1a10, barba: true, ancho: 1.1, escala: 1.06 });
}

/* =========================================================
   PLATILLO de la Colmena (escena del secuestro). 9 m de ancho.
   Pieza "luces" gira; "cupula" brilla.
   ========================================================= */
export function crearPlatillo() {
  const grupo = new THREE.Group();
  grupo.name = 'platillo';
  const matCasco = material(0x4a4458, { emisivo: 0x15111e });
  const matBorde = material(0x2a2433, { emisivo: 0x0c0a12 });
  grupo.add(pieza('casco', geo.cilindro, matCasco, [4.5, 0.6, 4.5], [0, 0, 0]));
  grupo.add(pieza('borde', geo.cilindro, matBorde, [3.6, 0.35, 3.6], [0, -0.45, 0]));
  grupo.add(pieza('panza', geo.esfera, matBorde, [2.2, 0.5, 2.2], [0, -0.6, 0]));
  grupo.add(pieza('cupula', geo.esfera, material(0x9dff6a, { brilla: true }), [1.6, 1.0, 1.6], [0, 0.45, 0]));
  const luces = new THREE.Group(); luces.name = 'luces';
  const matLuz = material(0xb36bff, { brilla: true });
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    luces.add(pieza('luz_' + (i + 1), geo.esferaBaja, matLuz, [0.22, 0.22, 0.22], [Math.cos(a) * 4.3, 0, Math.sin(a) * 4.3]));
  }
  grupo.add(luces);
  return { grupo, luces };
}

/* Rayo del platillo: cono verde transparente con la punta arriba. Alto 1 (se escala) */
export function crearRayoAbduccion() {
  const mat = new THREE.MeshBasicMaterial({ color: 0x9dff6a, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false });
  const cono = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 3, 1, 20, 1, true), mat);
  cono.name = 'rayo';
  cono.position.y = 0.5;
  const grupo = new THREE.Group();
  grupo.name = 'rayo_abduccion';
  grupo.add(cono);
  return { grupo, mat };
}

/* =========================================================
   BABOSITO: alien de baba pequeño y rápido. 1.0 m de largo
   ========================================================= */
export function crearBabosito() {
  const grupo = new THREE.Group();
  grupo.name = 'babosito';
  const matCuerpo = new THREE.MeshLambertMaterial({ color: COLORES_GRANJA.baba, flatShading: true, emissive: 0x0b3a18 });
  const matManchas = material(COLORES_GRANJA.manchas);
  const matOjo = material(COLORES_GRANJA.babaBrillo, { brilla: true });
  const matPupila = material(0x111111);

  const cuerpo = new THREE.Group();
  cuerpo.name = 'cuerpo_raiz';
  grupo.add(cuerpo);
  // Cuerpo de babosa: 3 bolas que se achican hacia atrás
  const segmentos = [];
  [[0.36, 0.26, -0.22, 0.28], [0.32, 0.22, 0.1, 0.24], [0.24, 0.15, 0.38, 0.17]].forEach(([r, h, z, y], i) => {
    const s = pieza('segmento_' + (i + 1), geo.esfera, matCuerpo, [r, h, r * 1.1], [0, y, z]);
    cuerpo.add(s);
    segmentos.push(s);
  });
  cuerpo.add(pieza('mancha_1', geo.esferaBaja, matManchas, [0.09, 0.05, 0.09], [0.1, 0.48, -0.15]));
  cuerpo.add(pieza('mancha_2', geo.esferaBaja, matManchas, [0.07, 0.04, 0.07], [-0.12, 0.42, 0.08]));
  // Antenas con ojos
  const antenas = [];
  [-0.12, 0.12].forEach((x, i) => {
    const a = new THREE.Group();
    a.name = i ? 'antena_der' : 'antena_izq';
    a.position.set(x, 0.42, -0.36);
    a.add(pieza('tallo', geo.cilindro, matCuerpo, [0.025, 0.32, 0.025], [0, 0.16, 0]));
    a.add(pieza('ojo', geo.esfera, matOjo, [0.06, 0.06, 0.06], [0, 0.34, 0]));
    a.add(pieza('pupila', geo.esferaBaja, matPupila, [0.025, 0.025, 0.02], [0, 0.34, -0.05]));
    a.rotation.x = -0.35;
    a.rotation.z = -x * 2;
    cuerpo.add(a);
    antenas.push(a);
  });
  // Boca
  const boca = pieza('boca', geo.caja, material(0x0d2a14), [0.18, 0.05, 0.04], [0, 0.18, -0.55]);
  cuerpo.add(boca);

  const hitbox = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.75, 1.15), new THREE.MeshBasicMaterial({ visible: false }));
  hitbox.name = 'hitbox';
  hitbox.position.y = 0.35;
  grupo.add(hitbox);
  return { grupo, cuerpo, segmentos, antenas, boca, matCuerpo, hitbox };
}

/* =========================================================
   BABOSÓN: alien de baba grande. Escupe baba. 2.2 m de alto
   ========================================================= */
export function crearBaboson() {
  const grupo = new THREE.Group();
  grupo.name = 'baboson';
  const matCuerpo = new THREE.MeshLambertMaterial({ color: 0x2c9a4f, flatShading: true, emissive: 0x062a10 });
  const matSaco = material(COLORES.moradoAlien, { brilla: true });
  const matOjo = material(COLORES_GRANJA.babaBrillo, { brilla: true });
  const matOscuro = material(0x0d2a14);
  const matManchas = material(COLORES_GRANJA.manchas);

  const cuerpo = new THREE.Group();
  cuerpo.name = 'cuerpo_raiz';
  grupo.add(cuerpo);
  cuerpo.add(pieza('base', geo.esfera, matCuerpo, [1.1, 0.6, 1.5], [0, 0.55, 0.2]));
  cuerpo.add(pieza('torso', geo.esfera, matCuerpo, [0.85, 0.85, 0.8], [0, 1.25, -0.2]));
  // Saco de baba en la espalda (brilla morado)
  const saco = pieza('saco_baba', geo.esfera, matSaco, [0.5, 0.45, 0.45], [0, 1.55, 0.45]);
  cuerpo.add(saco);
  cuerpo.add(pieza('mancha_1', geo.esferaBaja, matManchas, [0.18, 0.08, 0.18], [0.5, 1.0, 0.4]));
  cuerpo.add(pieza('mancha_2', geo.esferaBaja, matManchas, [0.14, 0.06, 0.14], [-0.55, 0.85, 0.6]));
  // Cabeza
  const cabeza = new THREE.Group();
  cabeza.name = 'cabeza';
  cabeza.position.set(0, 1.75, -0.65);
  cabeza.add(pieza('craneo', geo.esfera, matCuerpo, [0.5, 0.42, 0.5]));
  cabeza.add(pieza('ojo_izq', geo.esfera, matOjo, [0.1, 0.1, 0.1], [-0.2, 0.15, -0.4]));
  cabeza.add(pieza('ojo_der', geo.esfera, matOjo, [0.1, 0.1, 0.1], [0.2, 0.15, -0.4]));
  cabeza.add(pieza('ojo_centro', geo.esfera, matOjo, [0.13, 0.13, 0.13], [0, 0.28, -0.38]));
  const boca = pieza('boca', geo.esfera, matOscuro, [0.28, 0.12, 0.1], [0, -0.12, -0.43]);
  cabeza.add(boca);
  cuerpo.add(cabeza);
  // Brazos cortos
  const brazos = [];
  [-1, 1].forEach((lado) => {
    const b = new THREE.Group();
    b.name = lado < 0 ? 'brazo_izq' : 'brazo_der';
    b.position.set(lado * 0.75, 1.3, -0.4);
    b.add(pieza('brazo', geo.esfera, matCuerpo, [0.2, 0.5, 0.2], [lado * 0.1, -0.35, -0.1], [0.4, 0, lado * 0.3]));
    cuerpo.add(b);
    brazos.push(b);
  });
  const hitbox = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.2, 2.4), new THREE.MeshBasicMaterial({ visible: false }));
  hitbox.name = 'hitbox';
  hitbox.position.y = 1.1;
  grupo.add(hitbox);
  return { grupo, cuerpo, cabeza, saco, boca, brazos, matCuerpo, hitbox };
}

/* Bola de baba que escupe el Babosón */
export function crearEscupitajo() {
  const m = new THREE.Mesh(geo.esferaBaja, material(COLORES_GRANJA.babaBrillo, { brilla: true }));
  m.name = 'escupitajo';
  m.scale.setScalar(0.28);
  return m;
}

/* Charco de baba (hace caminar lento) */
const geoCharco = new THREE.CircleGeometry(1, 12);
export function crearCharco() {
  const m = new THREE.Mesh(geoCharco, new THREE.MeshBasicMaterial({ color: COLORES_GRANJA.baba, transparent: true, opacity: 0.6, depthWrite: false }));
  m.name = 'charco_baba';
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.03;
  return m;
}

/* =========================================================
   CONSTRUCCIONES DE LA GRANJA
   ========================================================= */
export function crearCasa() {
  const grupo = new THREE.Group();
  grupo.name = 'casa';
  const matPared = material(0xd8cbb0);
  const matTecho = material(0x4a2a24);
  const matMadera = material(COLORES_GRANJA.madera);
  const matVentana = material(0xffc070, { brilla: true });
  grupo.add(pieza('paredes', geo.caja, matPared, [12, 5, 8], [0, 2.5, 0]));
  // Techo a dos aguas: prisma de 3 caras acostado a lo largo de X, con la punta hacia arriba
  grupo.add(pieza('techo', geo.prisma, matTecho, [5.0, 13, 2.0], [0, 6, 0], [-Math.PI / 2, 0, -Math.PI / 2]));
  grupo.add(pieza('porche', geo.caja, matMadera, [12, 0.3, 3], [0, 0.15, 5.5]));
  grupo.add(pieza('techo_porche', geo.caja, matTecho, [12.4, 0.2, 3.2], [0, 3.2, 5.5]));
  [-5.6, -2, 2, 5.6].forEach((x, i) => grupo.add(pieza('poste_porche_' + (i + 1), geo.caja, matMadera, [0.2, 3, 0.2], [x, 1.6, 6.9])));
  grupo.add(pieza('puerta', geo.caja, matMadera, [1.3, 2.4, 0.1], [0, 1.2, 4.02]));
  [[-3.8, 2.6], [3.8, 2.6], [-3.8, 4.1], [3.8, 4.1]].forEach(([x, y], i) => grupo.add(pieza('ventana_' + (i + 1), geo.caja, matVentana, [1.4, 1.0, 0.1], [x, y, 4.02])));
  grupo.add(pieza('chimenea', geo.caja, material(0x6b3a2a), [0.9, 3, 0.9], [3.5, 7, -1.5]));
  return { grupo };
}

/* Granero con puerta abierta (se puede entrar). 16 x 22 m */
export function crearGranero() {
  const grupo = new THREE.Group();
  grupo.name = 'granero';
  const matPared = material(COLORES_GRANJA.maderaRoja);
  const matBorde = material(0xe8e0d0);
  const matTecho = material(0x2e2a2c);
  const A = 16, F = 22, H = 8, P = 0.5;
  // Paredes separadas (para dejar el hueco de la puerta al frente, lado -Z)
  const paredes = [
    pieza('pared_trasera', geo.caja, matPared, [A, H, P], [0, H / 2, F / 2]),
    pieza('pared_izq', geo.caja, matPared, [P, H, F], [-A / 2, H / 2, 0]),
    pieza('pared_der', geo.caja, matPared, [P, H, F], [A / 2, H / 2, 0]),
    pieza('frente_izq', geo.caja, matPared, [5, H, P], [-5.5, H / 2, -F / 2]),
    pieza('frente_der', geo.caja, matPared, [5, H, P], [5.5, H / 2, -F / 2]),
    pieza('frente_arriba', geo.caja, matPared, [6, 2.5, P], [0, H - 1.25, -F / 2])
  ];
  paredes.forEach((p) => grupo.add(p));
  // Techo: prisma de 3 caras acostado a lo largo de Z, con la punta hacia arriba
  grupo.add(pieza('techo', geo.prisma, matTecho, [9.6, F + 1, 2.67], [0, H + 1.33, 0], [-Math.PI / 2, 0, 0]));
  // Triángulos de pared del frente y de atrás (bajo el techo)
  [-F / 2, F / 2].forEach((z, i) => {
    grupo.add(pieza(i ? 'fronton_trasero' : 'fronton_delantero', geo.prisma, matPared, [9.2, 0.4, 2.5], [0, H + 1.25, z], [-Math.PI / 2, 0, 0]));
  });
  // Marco blanco de la puerta (la X típica de granero)
  grupo.add(pieza('marco_puerta', geo.caja, matBorde, [6.2, 0.3, 0.6], [0, H - 2.6, -F / 2]));
  const puertaIzq = pieza('puerta_izq', geo.caja, matPared, [3, 5.2, 0.2], [-7.6, 2.6, -F / 2 - 1.2], [0, -1.2, 0]);
  const puertaDer = pieza('puerta_der', geo.caja, matPared, [3, 5.2, 0.2], [7.6, 2.6, -F / 2 - 1.2], [0, 1.2, 0]);
  grupo.add(puertaIzq, puertaDer);
  return { grupo, paredes, A, F, H };
}

export function crearSilo() {
  const grupo = new THREE.Group();
  grupo.name = 'silo';
  grupo.add(pieza('cuerpo', geo.cilindro, material(0x8a8f96), [3.5, 15, 3.5], [0, 7.5, 0]));
  grupo.add(pieza('cupula', geo.esfera, material(0x6a6f76), [3.6, 2.2, 3.6], [0, 15, 0]));
  [3, 6, 9, 12].forEach((y, i) => grupo.add(pieza('anillo_' + (i + 1), geo.cilindro, material(0x55595f), [3.55, 0.15, 3.55], [0, y, 0])));
  return { grupo };
}

/* Tramo de cerca de madera (largo en X) */
export function crearCerca(largo) {
  const grupo = new THREE.Group();
  grupo.name = 'cerca';
  const mat = material(COLORES_GRANJA.maderaClara);
  const n = Math.max(2, Math.round(largo / 2.5) + 1);
  for (let i = 0; i < n; i++) grupo.add(pieza('poste_' + (i + 1), geo.caja, mat, [0.15, 1.3, 0.15], [-largo / 2 + (i * largo) / (n - 1), 0.65, 0]));
  grupo.add(pieza('tabla_arriba', geo.caja, mat, [largo, 0.12, 0.06], [0, 1.05, 0]));
  grupo.add(pieza('tabla_abajo', geo.caja, mat, [largo, 0.12, 0.06], [0, 0.55, 0]));
  return { grupo };
}

/* Portón de la cerca (v0.6): dos postes altos y la hoja abierta hacia adentro.
   ancho = espacio libre entre los postes (por ahí pasa la camioneta) */
export function crearPorton(ancho = 12) {
  const grupo = new THREE.Group();
  grupo.name = 'porton';
  const mat = material(COLORES_GRANJA.maderaClara);
  grupo.add(pieza('poste_izq', geo.caja, mat, [0.3, 2.2, 0.3], [-ancho / 2, 1.1, 0]));
  grupo.add(pieza('poste_der', geo.caja, mat, [0.3, 2.2, 0.3], [ancho / 2, 1.1, 0]));
  // La hoja (abierta 90°, pegada al poste derecho): se puede animar girando "hoja"
  const hoja = new THREE.Group();
  hoja.name = 'hoja';
  hoja.position.set(ancho / 2 - 0.3, 0, 0);
  const largo = 5.6;
  [0, 1, 2, 3].forEach((i) => hoja.add(pieza('hoja_poste_' + (i + 1), geo.caja, mat, [0.12, 1.3, 0.12], [0, 0.65, i * largo / 3])));
  hoja.add(pieza('hoja_tabla_arriba', geo.caja, mat, [0.06, 0.12, largo], [0, 1.05, largo / 2]));
  hoja.add(pieza('hoja_tabla_abajo', geo.caja, mat, [0.06, 0.12, largo], [0, 0.55, largo / 2]));
  hoja.add(pieza('hoja_diagonal', geo.caja, mat, [0.06, 0.1, largo * 1.05], [0, 0.8, largo / 2], [Math.atan2(0.5, largo), 0, 0]));
  grupo.add(hoja);
  return { grupo, hoja };
}

export function crearTractor() {
  const grupo = new THREE.Group();
  grupo.name = 'tractor';
  const matVerde = material(0x2f6b2a);
  const matNegro = material(0x151515);
  const matAmarillo = material(0xd8b030);
  grupo.add(pieza('motor', geo.caja, matVerde, [1.2, 1.1, 2.2], [0, 1.2, -0.9]));
  grupo.add(pieza('cabina', geo.caja, matVerde, [1.5, 0.3, 1.4], [0, 2.9, 0.7]));
  [[-0.7, 0.1], [0.7, 0.1], [-0.7, 1.3], [0.7, 1.3]].forEach(([x, z], i) => grupo.add(pieza('poste_cabina_' + (i + 1), geo.caja, matNegro, [0.08, 1.4, 0.08], [x, 2.1, z])));
  grupo.add(pieza('asiento', geo.caja, matNegro, [0.6, 0.6, 0.6], [0, 1.6, 0.7]));
  grupo.add(pieza('chimenea', geo.cilindro, matNegro, [0.08, 0.9, 0.08], [0.4, 2.1, -1.4]));
  [[-0.95, 1.0, 0.85], [0.95, 1.0, 0.85]].forEach(([x, z, r], i) => grupo.add(pieza('llanta_grande_' + (i + 1), geo.cilindro, matNegro, [r, 0.5, r], [x, r, z], [0, 0, Math.PI / 2])));
  [[-0.8, -1.6], [0.8, -1.6]].forEach(([x, z], i) => grupo.add(pieza('llanta_chica_' + (i + 1), geo.cilindro, matNegro, [0.45, 0.35, 0.45], [x, 0.45, z], [0, 0, Math.PI / 2])));
  [[-0.95, 0.85], [0.95, 0.85]].forEach(([x, z], i) => grupo.add(pieza('rin_' + (i + 1), geo.cilindro, matAmarillo, [0.4, 0.52, 0.4], [x, 0.85, z], [0, 0, Math.PI / 2])));
  return { grupo };
}

/* Camioneta de Rosa (en la v0.4 se maneja) */
export function crearCamioneta() {
  const grupo = new THREE.Group();
  grupo.name = 'camioneta';
  const matPintura = material(0x2a4f7a);
  const matNegro = material(0x151515);
  const matVidrio = material(0x1e2a33);
  const matFaro = material(0xfff2c0, { brilla: true });
  const matRojo = material(0xff3030, { brilla: true });
  grupo.add(pieza('chasis', geo.caja, matPintura, [2.0, 0.8, 5.0], [0, 0.85, 0]));
  grupo.add(pieza('cabina', geo.caja, matPintura, [1.9, 0.9, 2.0], [0, 1.7, -0.6]));
  grupo.add(pieza('parabrisas', geo.caja, matVidrio, [1.8, 0.7, 0.1], [0, 1.75, -1.62], [-0.25, 0, 0]));
  grupo.add(pieza('ventana_izq', geo.caja, matVidrio, [0.05, 0.55, 1.4], [-0.96, 1.8, -0.6]));
  grupo.add(pieza('ventana_der', geo.caja, matVidrio, [0.05, 0.55, 1.4], [0.96, 1.8, -0.6]));
  grupo.add(pieza('platon', geo.caja, matNegro, [1.8, 0.1, 2.0], [0, 1.26, 1.4]));
  grupo.add(pieza('baranda_izq', geo.caja, matPintura, [0.1, 0.45, 2.1], [-0.95, 1.45, 1.4]));
  grupo.add(pieza('baranda_der', geo.caja, matPintura, [0.1, 0.45, 2.1], [0.95, 1.45, 1.4]));
  grupo.add(pieza('compuerta', geo.caja, matPintura, [2.0, 0.45, 0.1], [0, 1.45, 2.45]));
  grupo.add(pieza('faro_izq', geo.caja, matFaro, [0.4, 0.2, 0.05], [-0.7, 1.0, -2.52]));
  grupo.add(pieza('faro_der', geo.caja, matFaro, [0.4, 0.2, 0.05], [0.7, 1.0, -2.52]));
  grupo.add(pieza('stop_izq', geo.caja, matRojo, [0.25, 0.2, 0.05], [-0.8, 1.0, 2.52]));
  grupo.add(pieza('stop_der', geo.caja, matRojo, [0.25, 0.2, 0.05], [0.8, 1.0, 2.52]));
  [[-1.0, -1.6], [1.0, -1.6], [-1.0, 1.6], [1.0, 1.6]].forEach(([x, z], i) => grupo.add(pieza('llanta_' + (i + 1), geo.cilindro, matNegro, [0.45, 0.3, 0.45], [x, 0.45, z], [0, 0, Math.PI / 2])));
  return { grupo };
}

export function crearMolino() {
  const grupo = new THREE.Group();
  grupo.name = 'molino';
  const matMetal = material(0x7a7f86);
  // Torre de 4 patas
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([x, z], i) => grupo.add(pieza('pata_' + (i + 1), geo.caja, matMetal, [0.12, 12, 0.12], [x * 0.6, 6, z * 0.6], [z * 0.08, 0, -x * 0.08])));
  grupo.add(pieza('plataforma', geo.caja, matMetal, [0.9, 0.2, 0.9], [0, 12, 0]));
  const aspas = new THREE.Group();
  aspas.name = 'aspas';
  aspas.position.set(0, 12.6, -0.6);
  for (let i = 0; i < 12; i++) {
    const a = pieza('aspa_' + (i + 1), geo.caja, material(0xb0b4ba), [0.25, 1.8, 0.04], [0, 1.1, 0]);
    const g = new THREE.Group();
    g.rotation.z = (i / 12) * Math.PI * 2;
    g.add(a);
    aspas.add(g);
  }
  grupo.add(aspas);
  grupo.add(pieza('cola', geo.caja, matMetal, [0.05, 0.8, 1.6], [0, 12.6, 1.0]));
  return { grupo, aspas };
}

export function crearPozo() {
  const grupo = new THREE.Group();
  grupo.name = 'pozo';
  grupo.add(pieza('borde', geo.cilindro, material(0x6a6a70), [1, 0.9, 1], [0, 0.45, 0]));
  grupo.add(pieza('agua', geo.cilindro, material(0x0a1420), [0.85, 0.05, 0.85], [0, 0.8, 0]));
  grupo.add(pieza('poste_izq', geo.caja, material(COLORES_GRANJA.madera), [0.12, 2, 0.12], [-0.9, 1.4, 0]));
  grupo.add(pieza('poste_der', geo.caja, material(COLORES_GRANJA.madera), [0.12, 2, 0.12], [0.9, 1.4, 0]));
  grupo.add(pieza('techito', geo.caja, material(0x4a2a24), [2.2, 0.1, 1.4], [0, 2.4, 0]));
  return { grupo };
}

export function crearBarril() {
  const grupo = new THREE.Group();
  grupo.name = 'barril_combustible';
  grupo.add(pieza('cuerpo', geo.cilindro, material(0xb02a20), [0.4, 1.1, 0.4], [0, 0.55, 0]));
  grupo.add(pieza('franja', geo.cilindro, material(0xffc65c), [0.41, 0.15, 0.41], [0, 0.7, 0]));
  grupo.add(pieza('tapa', geo.cilindro, material(0x5a1a14), [0.38, 0.04, 0.38], [0, 1.11, 0]));
  return { grupo };
}

export function crearPaca() {
  const grupo = new THREE.Group();
  grupo.name = 'paca_heno';
  grupo.add(pieza('heno', geo.caja, material(COLORES_GRANJA.heno), [1.2, 0.8, 0.8], [0, 0.4, 0]));
  grupo.add(pieza('amarre_1', geo.caja, material(0x6b4a2b), [1.21, 0.81, 0.04], [0, 0.4, -0.2]));
  grupo.add(pieza('amarre_2', geo.caja, material(0x6b4a2b), [1.21, 0.81, 0.04], [0, 0.4, 0.2]));
  return { grupo };
}

/* Llaves de la camioneta (objeto de misión, brilla) */
export function crearLlaves() {
  const grupo = new THREE.Group();
  grupo.name = 'llaves';
  const matDorado = material(0xffc65c, { brilla: true });
  grupo.add(pieza('aro', geo.cilindro, matDorado, [0.06, 0.015, 0.06], [0, 0, 0], [Math.PI / 2, 0, 0]));
  grupo.add(pieza('llave_1', geo.caja, matDorado, [0.025, 0.12, 0.01], [0.03, -0.09, 0]));
  grupo.add(pieza('llave_2', geo.caja, material(0xd0d4da, { brilla: true }), [0.025, 0.1, 0.01], [-0.03, -0.08, 0], [0, 0, 0.3]));
  grupo.add(pieza('llavero', geo.caja, material(0xff4d5e, { brilla: true }), [0.05, 0.05, 0.02], [0, 0.07, 0]));
  return { grupo };
}

export function crearMesa() {
  const grupo = new THREE.Group();
  grupo.name = 'mesa_trabajo';
  const mat = material(COLORES_GRANJA.madera);
  grupo.add(pieza('tablero', geo.caja, mat, [2, 0.1, 1], [0, 0.95, 0]));
  [[-0.9, -0.4], [0.9, -0.4], [-0.9, 0.4], [0.9, 0.4]].forEach(([x, z], i) => grupo.add(pieza('pata_' + (i + 1), geo.caja, mat, [0.1, 0.95, 0.1], [x, 0.47, z])));
  return { grupo };
}

/* Buzón junto al camino */
export function crearBuzon() {
  const grupo = new THREE.Group();
  grupo.name = 'buzon';
  grupo.add(pieza('poste', geo.caja, material(COLORES_GRANJA.madera), [0.1, 1.1, 0.1], [0, 0.55, 0]));
  grupo.add(pieza('caja', geo.caja, material(0x55606a), [0.25, 0.25, 0.5], [0, 1.2, 0]));
  grupo.add(pieza('bandera', geo.caja, material(0xff4d5e), [0.02, 0.15, 0.08], [0.14, 1.3, 0.1]));
  return { grupo };
}

/* Luna grande (no le afecta la niebla) */
export function crearLuna() {
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(14, 2), new THREE.MeshBasicMaterial({ color: 0xe8e4d0, fog: false }));
  m.name = 'luna';
  return m;
}
