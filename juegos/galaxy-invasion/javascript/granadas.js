/* =========================================================
   GALAXY INVASION — granadas.js  (v0.8)
   Granadas que se lanzan con G (o el botón del celular):
   vuelan en arco, rebotan en el suelo y en las paredes, la luz
   parpadea más rápido cuando están por explotar y a los
   ~2 segundos explotan (daño en área, hacen explotar barriles
   y queman a la Bestia de Heno igual que un barril).
   La explosión la hace main.js con enemigos.explotar().
   ========================================================= */

import * as THREE from 'three';
import { CONFIG } from './config.js';
import { resolverColisiones } from './mundo.js';

const G = CONFIG.granada;
const geoCuerpo = new THREE.IcosahedronGeometry(0.12, 1);
const geoPalanca = new THREE.BoxGeometry(0.04, 0.12, 0.03);
const geoLuz = new THREE.IcosahedronGeometry(0.035, 0);
const matCuerpo = new THREE.MeshLambertMaterial({ color: 0x3a5a2a, flatShading: true });
const matPalanca = new THREE.MeshLambertMaterial({ color: 0x8a8a90, flatShading: true });

/* Modelo de la granada: bola verde oliva con palanca y una lucecita roja */
export function crearGranada() {
  const grupo = new THREE.Group();
  grupo.name = 'granada';
  grupo.add(new THREE.Mesh(geoCuerpo, matCuerpo));
  const palanca = new THREE.Mesh(geoPalanca, matPalanca);
  palanca.position.set(0.07, 0.1, 0);
  palanca.rotation.z = -0.4;
  grupo.add(palanca);
  const matLuz = new THREE.MeshBasicMaterial({ color: 0xff4d5e });
  const luz = new THREE.Mesh(geoLuz, matLuz);
  luz.position.set(0, 0.12, 0.06);
  grupo.add(luz);
  return { grupo, matLuz };
}

export class Granadas {
  constructor(sonido) {
    this.sonido = sonido;
    this.lista = [];
    this.escena = null;
  }

  usarEscena(escena) {
    this.limpiar();
    this.escena = escena;
  }

  limpiar() {
    if (this.escena) this.lista.forEach((g) => this.escena.remove(g.modelo.grupo));
    this.lista = [];
  }

  /* Sale desde la mano, hacia donde mira la cámara, un poco hacia arriba */
  lanzar(camara, jugador) {
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camara.quaternion);
    const derecha = new THREE.Vector3(1, 0, 0).applyQuaternion(camara.quaternion);
    const pos = camara.position.clone().addScaledVector(dir, 0.5).addScaledVector(derecha, 0.25);
    pos.y -= 0.2;
    const vel = dir.multiplyScalar(G.fuerza);
    vel.y += G.fuerzaArriba;
    vel.x += jugador.velocidad.x * 0.5;
    vel.z += jugador.velocidad.z * 0.5;
    const modelo = crearGranada();
    modelo.grupo.position.copy(pos);
    this.escena.add(modelo.grupo);
    this.lista.push({ modelo, pos, vel, mecha: G.mecha, giro: new THREE.Vector3(Math.random() * 8, Math.random() * 8, 0) });
    this.sonido.reproducir('granadaLanzar');
  }

  /* alExplotar(punto): la hace main.js (daño, sonido, sacudida) */
  actualizar(dt, mundo, alExplotar) {
    for (let i = this.lista.length - 1; i >= 0; i--) {
      const g = this.lista[i];
      g.mecha -= dt;
      g.vel.y -= G.gravedad * dt;
      const antes = g.pos.clone();
      g.pos.addScaledVector(g.vel, dt);
      // Choca con paredes, autos, cercas… y rebota
      const choque = g.pos.clone();
      resolverColisiones(choque, 0.15, mundo.colisiones, mundo.limite);
      if (Math.abs(choque.x - g.pos.x) > 0.001) { g.vel.x *= -G.rebote; g.pos.x = antes.x; }
      if (Math.abs(choque.z - g.pos.z) > 0.001) { g.vel.z *= -G.rebote; g.pos.z = antes.z; }
      // Suelo: rebota y se frena
      if (g.pos.y < 0.12) {
        g.pos.y = 0.12;
        if (g.vel.y < -2) {
          g.vel.y = -g.vel.y * G.rebote;
          g.vel.x *= 0.6; g.vel.z *= 0.6;
          this.sonido.reproducir('granadaRebote', { x: g.pos.x, z: g.pos.z });
        } else {
          g.vel.y = 0;
          const f = Math.max(0, 1 - dt * 4);
          g.vel.x *= f; g.vel.z *= f;
        }
      }
      const m = g.modelo.grupo;
      m.position.copy(g.pos);
      const rodando = Math.hypot(g.vel.x, g.vel.z);
      m.rotation.x += g.giro.x * dt * Math.min(1, rodando / 3);
      m.rotation.y += g.giro.y * dt * Math.min(1, rodando / 3);
      // La luz parpadea cada vez más rápido
      const ritmo = g.mecha < 0.6 ? 18 : g.mecha < 1.2 ? 9 : 4;
      g.modelo.matLuz.color.setHex(Math.sin(g.mecha * ritmo * Math.PI) > 0 ? 0xff4d5e : 0x330a10);
      if (g.mecha <= 0) {
        this.escena.remove(m);
        this.lista.splice(i, 1);
        alExplotar(g.pos.clone().setY(0.6));
      }
    }
  }
}
