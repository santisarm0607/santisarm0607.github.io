/* =========================================================
   GALAXY INVASION — modelos-carretera.js
   Modelos de la Etapa 2 (La carretera): rocas que lanza el
   Lanzador, el muro de baba, postes de luz y señales.
   ========================================================= */

import * as THREE from 'three';
import { material } from './modelos.js';
import { COLORES_GRANJA } from './modelos-granja.js';

const geo = {
  caja: new THREE.BoxGeometry(1, 1, 1),
  esfera: new THREE.IcosahedronGeometry(1, 1),
  esferaBaja: new THREE.IcosahedronGeometry(1, 0),
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

/* Roca que lanza el Lanzador (centrada para que gire bien). 2.4 m */
export function crearRoca() {
  const g = new THREE.Group();
  g.name = 'roca';
  g.add(pieza('piedra', geo.esferaBaja, material(0x5d5866), [1.3, 1.0, 1.15]));
  g.add(pieza('piedra_2', geo.esferaBaja, material(0x4a4652), [0.8, 0.7, 0.8], [0.6, 0.4, 0.2]));
  return g;
}

/* =========================================================
   MURO DE BABA: tapa toda la carretera. 18 x 4.5 m
   Tiene capullos que brillan: es lo que hay que reventar
   (todo el muro recibe los disparos).
   ========================================================= */
export function crearMuroBaba(ancho = 18) {
  const grupo = new THREE.Group();
  grupo.name = 'muro_baba';
  const matBaba = new THREE.MeshLambertMaterial({ color: COLORES_GRANJA.baba, flatShading: true, emissive: 0x0b3a18 });
  const matOscura = material(COLORES_GRANJA.babaOscura);
  const matCapullo = material(0x9dff6a, { brilla: true });
  const n = Math.round(ancho / 1.6);
  for (let i = 0; i < n; i++) {
    const x = -ancho / 2 + 0.8 + i * (ancho - 1.6) / (n - 1);
    const alto = 3.2 + Math.sin(i * 1.7) * 0.9;
    grupo.add(pieza('masa_' + (i + 1), geo.esfera, i % 3 ? matBaba : matOscura, [1.3, alto / 2, 0.9], [x, alto / 2 - 0.2, (i % 2) * 0.4]));
  }
  // Capullos (huevos) pegados al muro
  const capullos = [];
  [-6, -2, 3, 7].forEach((x, i) => {
    const c = pieza('capullo_' + (i + 1), geo.esfera, matCapullo, [0.45, 0.6, 0.4], [x, 2 + (i % 2) * 0.8, -0.9]);
    grupo.add(c);
    capullos.push(c);
  });
  // Hilos de baba hacia arriba
  for (let i = 0; i < 6; i++) grupo.add(pieza('hilo_' + (i + 1), geo.cilindro, matBaba, [0.06, 2.2, 0.06], [-7 + i * 2.8, 4.4, 0.2], [0, 0, (i % 2 ? 0.3 : -0.3)]));
  return { grupo, matBaba, capullos };
}

/* Poste de luz de carretera (con foco naranja). 8 m */
export function crearPosteCarretera() {
  const grupo = new THREE.Group();
  grupo.name = 'poste_carretera';
  const matPoste = material(0x3a3d44);
  grupo.add(pieza('poste', geo.cilindro, matPoste, [0.12, 8, 0.12], [0, 4, 0]));
  grupo.add(pieza('brazo', geo.caja, matPoste, [0.1, 0.1, 2.4], [0, 7.9, -1.1]));
  grupo.add(pieza('foco', geo.caja, material(0xffa060, { brilla: true }), [0.35, 0.12, 0.6], [0, 7.8, -2.2]));
  return { grupo };
}

/* Señal verde de carretera ("CIUDAD 900 m") */
export function crearSenal(texto) {
  const grupo = new THREE.Group();
  grupo.name = 'senal';
  const lienzo = document.createElement('canvas');
  lienzo.width = 256;
  lienzo.height = 96;
  const ctx = lienzo.getContext('2d');
  ctx.fillStyle = '#1d5c35';
  ctx.fillRect(0, 0, 256, 96);
  ctx.strokeStyle = '#e8e8e8';
  ctx.lineWidth = 6;
  ctx.strokeRect(6, 6, 244, 84);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 34px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(texto, 128, 50);
  const tex = new THREE.CanvasTexture(lienzo);
  tex.colorSpace = THREE.SRGBColorSpace;
  const cartel = new THREE.Mesh(new THREE.PlaneGeometry(4, 1.5), new THREE.MeshBasicMaterial({ map: tex }));
  cartel.name = 'cartel';
  cartel.position.set(0, 4.2, 0);
  grupo.add(cartel);
  const matPoste = material(0x6a6d74);
  grupo.add(pieza('poste_izq', geo.caja, matPoste, [0.12, 4.2, 0.12], [-1.6, 2.1, 0.05]));
  grupo.add(pieza('poste_der', geo.caja, matPoste, [0.12, 4.2, 0.12], [1.6, 2.1, 0.05]));
  return { grupo };
}
