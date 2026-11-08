/* =========================================================
   GALAXY INVASION — mundo.js
   Herramientas que usan todos los mapas: choques (cajas AABB),
   textura de humo y unión de objetos quietos para dibujar rápido.
   (La Calle Principal de la v0.1 se quitó en la v0.6.3.)
   ========================================================= */

import * as THREE from 'three';
import { material } from './modelos.js';

export const LIMITE_MAPA = 44; // el jugador no puede pasar de aquí (m)

export function crearTexturaHumo() {
  const lienzo = document.createElement('canvas');
  lienzo.width = lienzo.height = 64;
  const ctx = lienzo.getContext('2d');
  const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,0.9)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(lienzo);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* =========================================================
   CHOQUES: empuja un círculo (jugador o alien) fuera de
   las cajas. Funciona "desde arriba" (solo X y Z).
   limite: un número (mapa cuadrado de -limite a limite) o un
   rectángulo { minX, maxX, minZ, maxZ } (mapas largos)
   Devuelve cuánto lo tuvo que empujar (sirve para saber si chocó)
   ========================================================= */
export function resolverColisiones(pos, radio, colisiones, limite = LIMITE_MAPA) {
  const antesX = pos.x, antesZ = pos.z;
  for (const c of colisiones) {
    if (c.inactiva) continue;
    const cx = Math.max(c.minX, Math.min(pos.x, c.maxX));
    const cz = Math.max(c.minZ, Math.min(pos.z, c.maxZ));
    const dx = pos.x - cx;
    const dz = pos.z - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 < radio * radio) {
      if (d2 > 0.000001) {
        const d = Math.sqrt(d2);
        pos.x += (dx / d) * (radio - d);
        pos.z += (dz / d) * (radio - d);
      } else {
        // El centro quedó dentro de la caja: lo sacamos por el lado más cercano
        const izq = pos.x - c.minX, der = c.maxX - pos.x, arr = pos.z - c.minZ, aba = c.maxZ - pos.z;
        const m = Math.min(izq, der, arr, aba);
        if (m === izq) pos.x = c.minX - radio;
        else if (m === der) pos.x = c.maxX + radio;
        else if (m === arr) pos.z = c.minZ - radio;
        else pos.z = c.maxZ + radio;
      }
    }
  }
  // Bordes del mapa
  if (typeof limite === 'number') {
    pos.x = Math.max(-limite, Math.min(limite, pos.x));
    pos.z = Math.max(-limite, Math.min(limite, pos.z));
  } else {
    pos.x = Math.max(limite.minX, Math.min(limite.maxX, pos.x));
    pos.z = Math.max(limite.minZ, Math.min(limite.maxZ, pos.z));
  }
  return Math.hypot(pos.x - antesX, pos.z - antesZ);
}

/* =========================================================
   JUNTAR OBJETOS QUIETOS: todas las piezas que nunca se
   mueven y tienen el mismo material se convierten en UNA
   sola malla. Se ven igual, pero el celular las dibuja de
   una vez (menos "llamadas de dibujo" = más FPS).
   lista: [{ grupo, solido }]  (solido = detiene las balas)
   ========================================================= */
export function fusionarEstaticos(escena, lista, solidos) {
  const grupos = new Map();   // "material + sólido" -> piezas
  const fusionados = new Set(lista.map((e) => e.grupo));
  lista.forEach(({ grupo, solido }) => {
    grupo.updateWorldMatrix(true, true);
    grupo.traverse((o) => {
      if (!o.isMesh || o.isInstancedMesh || !o.visible) return;
      const clave = o.material.uuid + (solido ? ':s' : ':n');
      if (!grupos.has(clave)) grupos.set(clave, { material: o.material, solido, piezas: [] });
      grupos.get(clave).piezas.push(o);
    });
  });
  // Quitar los originales de la escena y de la lista de sólidos
  lista.forEach(({ grupo }) => escena.remove(grupo));
  for (let i = solidos.length - 1; i >= 0; i--) {
    let o = solidos[i];
    while (o && !fusionados.has(o)) o = o.parent;
    if (o) solidos.splice(i, 1);
  }
  // Crear una malla por material
  grupos.forEach(({ material: mat, solido, piezas }) => {
    const partes = piezas.map((m) => {
      const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
      g.applyMatrix4(m.matrixWorld);
      return g;
    });
    const total = partes.reduce((n, g) => n + g.attributes.position.count, 0);
    const posiciones = new Float32Array(total * 3);
    const normales = new Float32Array(total * 3);
    // Coordenadas de textura (las ventanas de los edificios): solo si todas las piezas las tienen
    const conUV = partes.every((g) => g.attributes.uv);
    const uvs = conUV ? new Float32Array(total * 2) : null;
    let desde = 0;
    partes.forEach((g) => {
      posiciones.set(g.attributes.position.array, desde * 3);
      normales.set(g.attributes.normal.array, desde * 3);
      if (conUV) uvs.set(g.attributes.uv.array, desde * 2);
      desde += g.attributes.position.count;
      g.dispose();
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(posiciones, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(normales, 3));
    if (conUV) geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.computeBoundingBox();
    geo.computeBoundingSphere();
    const malla = new THREE.Mesh(geo, mat);
    malla.name = 'estaticos';
    escena.add(malla);
    if (solido) solidos.push(malla);
  });
}
