/* =========================================================
   GALAXY INVASION — efectos.js
   Partículas (chispas, sangre verde alien, polvo) y trazos
   de bala. Se reutilizan siempre los mismos objetos ("pool")
   para no crear basura y que el celular no se trabe.
   ========================================================= */

import * as THREE from 'three';
import { COLORES } from './modelos.js';

const MAX_PARTICULAS = 200;
const COLORES_BABA = { clara: 0x9dff6a, oscura: 0x1f7a3c };

export class Efectos {
  constructor(escena, cantidadParticulas = 1) {
    this.escena = escena;
    this.factor = cantidadParticulas;
    this.particulas = [];
    this.materiales = {};
    const geo = new THREE.BoxGeometry(1, 1, 1);
    for (let i = 0; i < MAX_PARTICULAS; i++) {
      const malla = new THREE.Mesh(geo, this.mat(0xffffff));
      malla.visible = false;
      escena.add(malla);
      this.particulas.push({ malla, vel: new THREE.Vector3(), vida: 0, vidaMax: 1, gravedad: 9, tam: 0.1 });
    }

    // Trazos de bala (líneas brillantes que duran un instante)
    this.trazos = [];
    const geoTrazo = new THREE.BoxGeometry(0.012, 0.012, 1);
    geoTrazo.translate(0, 0, 0.5); // lookAt apunta +Z hacia el destino
    const matTrazo = new THREE.MeshBasicMaterial({ color: COLORES.ambar, transparent: true, opacity: 0.8 });
    for (let i = 0; i < 8; i++) {
      const m = new THREE.Mesh(geoTrazo, matTrazo.clone());
      m.visible = false;
      escena.add(m);
      this.trazos.push({ malla: m, vida: 0 });
    }

    // Destellos de explosión (esferas que crecen y se apagan)
    this.destellos = [];
    const geoDestello = new THREE.IcosahedronGeometry(1, 1);
    for (let i = 0; i < 4; i++) {
      const m = new THREE.Mesh(geoDestello, new THREE.MeshBasicMaterial({ color: 0xffb347, transparent: true, opacity: 0.9, depthWrite: false }));
      m.visible = false;
      escena.add(m);
      this.destellos.push({ malla: m, vida: 0, radio: 1 });
    }
  }

  mat(color) {
    if (typeof color === 'string') color = new THREE.Color(color).getHex();
    if (!this.materiales[color]) this.materiales[color] = new THREE.MeshBasicMaterial({ color });
    return this.materiales[color];
  }

  /* Lanza un grupo de partículas desde un punto */
  emitir(punto, { cantidad = 8, color = 0xffffff, velocidad = 4, hacia = null, arriba = 2, gravedad = 9, tam = 0.08, vida = 0.5 }) {
    const n = Math.max(1, Math.round(cantidad * this.factor));
    let lanzadas = 0;
    for (const p of this.particulas) {
      if (p.vida > 0) continue;
      p.malla.material = this.mat(color);
      p.malla.position.copy(punto);
      p.malla.visible = true;
      p.vel.set((Math.random() - 0.5) * 2, Math.random() * 0.5 + 0.2, (Math.random() - 0.5) * 2).normalize().multiplyScalar(velocidad * (0.4 + Math.random() * 0.8));
      if (hacia) p.vel.addScaledVector(hacia, velocidad * 0.6);
      p.vel.y += arriba * Math.random();
      p.gravedad = gravedad;
      p.vidaMax = p.vida = vida * (0.6 + Math.random() * 0.6);
      p.tam = tam * (0.6 + Math.random() * 0.8);
      p.malla.scale.setScalar(p.tam);
      if (++lanzadas >= n) break;
    }
  }

  /* --- Efectos ya armados --- */
  impactoPared(punto, normal) {
    this.emitir(punto, { cantidad: 6, color: 0xffd28a, velocidad: 3, hacia: normal, arriba: 1, tam: 0.05, vida: 0.3 });
    this.emitir(punto, { cantidad: 3, color: 0x6a6670, velocidad: 1.5, hacia: normal, arriba: 1.5, gravedad: 4, tam: 0.12, vida: 0.6 });
  }

  impactoAlien(punto, direccion, baba = false) {
    this.emitir(punto, { cantidad: 7, color: baba ? COLORES_BABA.clara : COLORES.verdeAlien, velocidad: 3.5, hacia: direccion, arriba: 2, tam: 0.08, vida: 0.45 });
  }

  muerteAlien(punto, baba = false, radio = 0.5) {
    const tam = Math.max(1, radio * 1.5);
    this.emitir(punto, { cantidad: 22 * tam, color: baba ? COLORES_BABA.clara : COLORES.verdeAlien, velocidad: 5 * tam, arriba: 4, tam: 0.12 * tam, vida: 0.8 });
    this.emitir(punto, { cantidad: 10 * tam, color: baba ? COLORES_BABA.oscura : COLORES.caparazon, velocidad: 4 * tam, arriba: 3, tam: 0.16 * tam, vida: 0.9 });
  }

  aparicion(punto, baba = false) {
    this.emitir(punto, { cantidad: 14, color: baba ? COLORES_BABA.clara : COLORES.verdeAlien, velocidad: 1.5, arriba: 6, gravedad: 2, tam: 0.07, vida: 0.9 });
    this.emitir(punto, { cantidad: 8, color: baba ? 0x2a2216 : 0x3a3c44, velocidad: 2.5, arriba: 3, tam: 0.18, vida: 0.7 });
  }

  /* Explosión de barril: fuego, humo y un destello */
  explosion(punto, radio = 4) {
    this.emitir(punto, { cantidad: 30, color: 0xffb347, velocidad: radio * 2.2, arriba: 6, gravedad: 6, tam: 0.22, vida: 0.7 });
    this.emitir(punto, { cantidad: 20, color: 0xff5a2a, velocidad: radio * 1.6, arriba: 5, gravedad: 4, tam: 0.3, vida: 0.9 });
    this.emitir(punto, { cantidad: 16, color: 0x2a2630, velocidad: radio * 0.8, arriba: 6, gravedad: -1.5, tam: 0.5, vida: 1.4 });
    const d = this.destellos.find((x) => x.vida <= 0) || this.destellos[0];
    d.malla.position.copy(punto);
    d.malla.visible = true;
    d.vida = 0.35;
    d.radio = radio;
  }

  /* Polvo de una onda de choque o de una roca que cae */
  polvo(punto, radio = 3) {
    this.emitir(punto, { cantidad: 18, color: 0x8a7a62, velocidad: radio * 1.4, arriba: 2, gravedad: 3, tam: 0.35, vida: 0.9 });
    this.emitir(punto, { cantidad: 8, color: 0x4a4038, velocidad: radio, arriba: 3, gravedad: 5, tam: 0.2, vida: 0.7 });
  }

  /* Pajitas de heno (golpes a la Bestia de Heno, pacas que caen) */
  heno(punto, fuerza = 1) {
    this.emitir(punto, { cantidad: 14 * fuerza, color: 0xe0b85a, velocidad: 3 * fuerza, arriba: 3, gravedad: 5, tam: 0.12, vida: 0.8 });
    this.emitir(punto, { cantidad: 6 * fuerza, color: 0x9a7a3a, velocidad: 2 * fuerza, arriba: 2, gravedad: 5, tam: 0.1, vida: 0.7 });
  }

  /* Chispas de energía (plasma, escudo, generadores) */
  chispas(punto, color = 0x4de1ff, fuerza = 1) {
    this.emitir(punto, { cantidad: 10 * fuerza, color, velocidad: 4 * fuerza, arriba: 2, gravedad: 4, tam: 0.07, vida: 0.4 });
  }

  /* Llamas que suben (algo que se quema) */
  fuego(punto, tam = 1) {
    this.emitir(punto, { cantidad: 3, color: Math.random() < 0.5 ? 0xff7a2a : 0xffc63a, velocidad: 0.8 * tam, arriba: 3 * tam, gravedad: -4, tam: 0.25 * tam, vida: 0.6 });
  }

  salpicadura(punto) {
    this.emitir(punto, { cantidad: 12, color: COLORES_BABA.clara, velocidad: 4, arriba: 3, tam: 0.1, vida: 0.6 });
  }

  explosionRareza(punto, color) {
    this.emitir(punto, { cantidad: 24, color, velocidad: 2, arriba: 6, gravedad: 1, tam: 0.07, vida: 1.2 });
  }

  recoger(punto, color) {
    this.emitir(punto, { cantidad: 10, color, velocidad: 1.2, arriba: 4, gravedad: -2, tam: 0.05, vida: 0.6 });
  }

  /* Línea brillante desde el cañón hasta donde pegó la bala */
  trazo(desde, hasta) {
    const t = this.trazos.find((x) => x.vida <= 0) || this.trazos[0];
    const largo = desde.distanceTo(hasta);
    t.malla.position.copy(desde);
    t.malla.lookAt(hasta);
    t.malla.scale.set(1, 1, largo);
    t.malla.visible = true;
    t.malla.material.opacity = 0.8;
    t.vida = 0.06;
  }

  actualizar(dt) {
    for (const d of this.destellos) {
      if (d.vida <= 0) continue;
      d.vida -= dt;
      const p = 1 - Math.max(0, d.vida) / 0.35;
      d.malla.scale.setScalar(d.radio * (0.3 + p * 0.9));
      d.malla.material.opacity = 0.9 * (1 - p);
      if (d.vida <= 0) d.malla.visible = false;
    }
    for (const p of this.particulas) {
      if (p.vida <= 0) continue;
      p.vida -= dt;
      if (p.vida <= 0) { p.malla.visible = false; continue; }
      p.vel.y -= p.gravedad * dt;
      p.malla.position.addScaledVector(p.vel, dt);
      if (p.malla.position.y < 0.02) { p.malla.position.y = 0.02; p.vel.set(p.vel.x * 0.5, 0, p.vel.z * 0.5); }
      p.malla.scale.setScalar(p.tam * (p.vida / p.vidaMax));
      p.malla.rotation.x += dt * 8;
    }
    for (const t of this.trazos) {
      if (t.vida <= 0) continue;
      t.vida -= dt;
      t.malla.material.opacity = Math.max(0, t.vida / 0.06) * 0.8;
      if (t.vida <= 0) t.malla.visible = false;
    }
  }

  limpiar() {
    this.destellos.forEach((d) => { d.vida = 0; d.malla.visible = false; });
    this.particulas.forEach((p) => { p.vida = 0; p.malla.visible = false; });
    this.trazos.forEach((t) => { t.vida = 0; t.malla.visible = false; });
  }
}
