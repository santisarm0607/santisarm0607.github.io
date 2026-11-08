/* =========================================================
   GALAXY INVASION — nidos.js  (v0.8)
   NIDO DE LA COLMENA: un capullo vivo pegado al suelo.
   No se mueve, pero mientras estés cerca hace nacer Babositos
   cada pocos segundos (máximo unos cuantos a la vez).
   Hay que destruirlo a disparos o con una granada.
   Se usa en la misión extra "Nidos de la Colmena" de la granja.
   ========================================================= */

import * as THREE from 'three';
import { CONFIG } from './config.js';
import { Enemigo, registrarEnemigo } from './enemigos.js';

const geo = {
  esfera: new THREE.IcosahedronGeometry(1, 1),
  cono: new THREE.ConeGeometry(1, 1, 5),
  caja: new THREE.BoxGeometry(1, 1, 1)
};

/* Modelo: montículo morado con un saco verde que late y púas alrededor. 3 m */
export function crearNido() {
  const grupo = new THREE.Group();
  grupo.name = 'nido';
  const matBase = new THREE.MeshLambertMaterial({ color: 0x3a2050, flatShading: true });
  const matCuerpo = new THREE.MeshLambertMaterial({ color: 0x4a8a3a, flatShading: true, emissive: 0x1a4a1a });
  const matPua = new THREE.MeshLambertMaterial({ color: 0x2a1438, flatShading: true });
  const base = new THREE.Mesh(geo.esfera, matBase);
  base.scale.set(1.8, 0.6, 1.8);
  base.position.y = 0.1;
  grupo.add(base);
  const saco = new THREE.Mesh(geo.esfera, matCuerpo);
  saco.name = 'saco';
  saco.scale.set(1.1, 1.4, 1.1);
  saco.position.y = 1.2;
  grupo.add(saco);
  // Venas que brillan
  const matVena = new THREE.MeshBasicMaterial({ color: 0x9dff6a });
  for (let i = 0; i < 4; i++) {
    const v = new THREE.Mesh(geo.caja, matVena);
    v.scale.set(0.06, 1.6, 0.06);
    const a = (i / 4) * Math.PI * 2;
    v.position.set(Math.cos(a) * 0.95, 1.2, Math.sin(a) * 0.95);
    v.rotation.set(Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3);
    grupo.add(v);
  }
  // Púas
  for (let i = 0; i < 7; i++) {
    const p = new THREE.Mesh(geo.cono, matPua);
    const a = (i / 7) * Math.PI * 2 + 0.3;
    p.scale.set(0.25, 1.1, 0.25);
    p.position.set(Math.cos(a) * 1.6, 0.5, Math.sin(a) * 1.6);
    p.rotation.set(Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6);
    grupo.add(p);
  }
  const hitbox = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.8, 2.6), new THREE.MeshBasicMaterial({ visible: false }));
  hitbox.position.y = 1.3;
  hitbox.name = 'hitbox';
  grupo.add(hitbox);
  return { grupo, saco, matCuerpo, hitbox };
}

class Nido extends Enemigo {
  constructor(escena, punto) {
    super('nido', escena, punto, crearNido());
    this.esEstructura = true;     // no cuenta como alien vivo para las misiones
    this.grupo.rotation.y = 0;
    this.crias = [];
    this.esperaCria = 1.5;
    this.esperaLatido = 0;
    this.colorGolpe = 0xb36bff;
    this.duracionMuerte = 0.9;
    this.sonidos = { aparece: null, muere: 'nidoMuere', chillido: null, ataque: null };
  }

  get alturaCentro() { return 1.3; }

  actualizar(dt, jugador, otros, mundo, ctx) {
    this.tiempoEstado += dt;
    this.parpadeo -= dt;
    this.modelo.matCuerpo.emissive.setHex(this.parpadeo > 0 ? this.colorGolpe : this.colorNormal);
    const c = this.c;
    if (this.estado === 'apareciendo') {
      // Sale de la tierra creciendo
      const p = Math.min(1, this.tiempoEstado / c.tiempoAparicion);
      this.grupo.position.set(this.posicion.x, -1.5 * (1 - p), this.posicion.z);
      this.grupo.scale.setScalar(0.4 + 0.6 * p);
      if (p >= 1) this.cambiarEstado('latiendo');
      return;
    }
    if (this.estado === 'muriendo') {
      // Se desinfla y se hunde
      const p = Math.min(1, this.tiempoEstado / this.duracionMuerte);
      this.grupo.scale.set(1 + p * 0.3, Math.max(0.05, 1 - p), 1 + p * 0.3);
      this.grupo.position.y = -p * 0.5;
      if (p >= 1) this.eliminar = true;
      return;
    }
    // Late (más rápido si estás cerca)
    const d = Math.hypot(jugador.posicion.x - this.posicion.x, jugador.posicion.z - this.posicion.z);
    const cerca = d < c.distanciaActiva;
    const ritmo = cerca ? 4.5 : 2;
    const latido = 1 + Math.max(0, Math.sin(this.tiempoEstado * ritmo)) * 0.12;
    this.modelo.saco.scale.set(1.1 * latido, 1.4 * latido, 1.1 * latido);
    this.grupo.position.set(this.posicion.x, 0, this.posicion.z);
    if (!cerca || !jugador.vivo) return;
    this.esperaLatido -= dt;
    if (this.esperaLatido <= 0) { this.esperaLatido = 2.2; ctx.sonido.reproducir('nidoLate', { x: this.posicion.x, z: this.posicion.z }); }
    // Hace nacer Babositos
    this.crias = this.crias.filter((e) => e.vivo && ctx.gestor.lista.includes(e));
    this.esperaCria -= dt;
    if (this.esperaCria <= 0 && this.crias.length < c.maxCrias) {
      this.esperaCria = c.intervaloCria;
      const a = Math.random() * Math.PI * 2;
      const cria = ctx.gestor.crear('babosito', { x: this.posicion.x + Math.cos(a) * 2.5, y: 0, z: this.posicion.z + Math.sin(a) * 2.5 });
      this.crias.push(cria);
      this.modelo.saco.scale.multiplyScalar(1.3);
    }
  }
}

registrarEnemigo('nido', Nido);
