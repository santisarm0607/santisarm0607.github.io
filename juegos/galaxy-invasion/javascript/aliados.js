/* =========================================================
   GALAXY INVASION — aliados.js
   Soldados humanos que Rosa rescata en la ciudad.
     - Antes del rescate: esperan detrás de su barricada.
     - Después: siguen a Rosa (a los lados y un poco atrás) y
       le disparan al alien más cercano.
   En esta versión no pueden morir (los aliens solo atacan a Rosa).
   ========================================================= */

import * as THREE from 'three';
import { CONFIG } from './config.js';
import { crearAliado } from './modelos-ciudad.js';
import { resolverColisiones } from './mundo.js';

const A = CONFIG.aliado;

export class Aliados {
  constructor(sonido) {
    this.sonido = sonido;
    this.lista = [];
    this.escena = null;
    this.efectos = null;
  }

  usarEscena(escena, efectos) {
    this.limpiar();
    this.escena = escena;
    this.efectos = efectos;
  }

  /* Crea un soldado esperando en un punto (todavía no sigue a Rosa) */
  crear(x, z, yaw, nombre) {
    const modelo = crearAliado();
    modelo.grupo.position.set(x, 0, z);
    modelo.grupo.rotation.y = yaw;
    this.escena.add(modelo.grupo);
    const a = {
      modelo, nombre, posicion: new THREE.Vector3(x, 0, z), siguiendo: false,
      espera: Math.random() * 0.5, fasePaso: Math.random() * 6, fogonazo: 0, lado: this.lista.length % 2 ? 1 : -1
    };
    this.lista.push(a);
    return a;
  }

  rescatar() {
    this.lista.forEach((a) => { a.siguiendo = true; });
    this.sonido.reproducir('aliadoRescatado');
  }

  actualizar(dt, jugador, mundo, gestor) {
    for (const a of this.lista) {
      const m = a.modelo;
      m.marca.rotation.y += dt * 2;
      m.marca.position.y = 2.15 + Math.sin(performance.now() / 300) * 0.06;

      // ---- Moverse: a un lado de Rosa, un poco atrás ----
      let rapidez = 0;
      if (a.siguiendo && !jugador.enVehiculo) {
        const adelanteX = -Math.sin(jugador.yaw), adelanteZ = -Math.cos(jugador.yaw);
        const meta = new THREE.Vector3(
          jugador.posicion.x - adelanteX * 2 + adelanteZ * a.lado * A.distanciaSeguir * -1,
          0,
          jugador.posicion.z - adelanteZ * 2 + adelanteX * a.lado * A.distanciaSeguir
        );
        const dx = meta.x - a.posicion.x, dz = meta.z - a.posicion.z;
        const d = Math.hypot(dx, dz);
        if (d > 1) {
          rapidez = Math.min(A.velocidad * (d > 12 ? 1.6 : 1), d * 3);
          a.posicion.x += dx / d * rapidez * dt;
          a.posicion.z += dz / d * rapidez * dt;
          resolverColisiones(a.posicion, 0.4, mundo.colisiones, mundo.limite);
          // Muy lejos (por ejemplo, Rosa se fue corriendo): aparece cerca
          if (d > 40) a.posicion.copy(meta);
        }
      }

      // ---- Buscar al alien más cercano ----
      let blanco = null;
      let mejor = A.alcance;
      for (const e of gestor.lista) {
        if (!e.vivo || e.estado === 'apareciendo') continue;
        const d = Math.hypot(e.posicion.x - a.posicion.x, e.posicion.z - a.posicion.z);
        if (d < mejor) { mejor = d; blanco = e; }
      }

      // ---- Girar: hacia el alien, o hacia donde camina ----
      let mirar = null;
      if (blanco) mirar = [blanco.posicion.x - a.posicion.x, blanco.posicion.z - a.posicion.z];
      else if (rapidez > 0.5) mirar = [jugador.posicion.x - a.posicion.x, jugador.posicion.z - a.posicion.z];
      if (mirar) {
        const objetivo = Math.atan2(-mirar[0], -mirar[1]);
        let dif = objetivo - m.grupo.rotation.y;
        dif = Math.atan2(Math.sin(dif), Math.cos(dif));
        m.grupo.rotation.y += dif * Math.min(1, dt * 8);
      }

      // ---- Disparar ----
      a.espera -= dt;
      if (blanco && a.espera <= 0 && (a.siguiendo || mejor < 25)) {
        a.espera = A.esperaDisparo * (0.8 + Math.random() * 0.5);
        const desde = new THREE.Vector3();
        m.salida.getWorldPosition(desde);
        const hasta = new THREE.Vector3(blanco.posicion.x, blanco.alturaCentro, blanco.posicion.z);
        const acierta = Math.random() < A.punteria;
        if (!acierta) hasta.add(new THREE.Vector3((Math.random() - 0.5) * 3, Math.random() * 1.5, (Math.random() - 0.5) * 3));
        this.efectos.trazo(desde, hasta);
        a.fogonazo = 0.05;
        this.sonido.reproducir('aliadoDisparo', { x: a.posicion.x, z: a.posicion.z });
        if (acierta) {
          const dir = hasta.clone().sub(desde).normalize();
          // A los jefes los aliados les hacen poco (sus balas no atraviesan escudos)
          if (blanco.esJefe) {
            const debil = blanco.hitboxes.find((h) => !h.userData.apagada && h.userData.zona !== 'cuerpo' && h.userData.zona !== 'escudo');
            if (blanco.recibirDanio(A.danio * 0.3, dir, debil)) gestor.morir(blanco);
          }
          else gestor.herir(blanco, A.danio, hasta, dir);
        }
      }
      a.fogonazo -= dt;
      m.fogonazo.visible = a.fogonazo > 0;

      // ---- Animación de caminar ----
      a.fasePaso += dt * Math.max(rapidez, 0) * 1.8;
      const s = rapidez > 0.3 ? Math.sin(a.fasePaso) : 0;
      m.piernas[0].rotation.x = s * 0.5;
      m.piernas[1].rotation.x = -s * 0.5;
      m.grupo.position.set(a.posicion.x, Math.abs(Math.cos(a.fasePaso)) * 0.05 * (rapidez > 0.3 ? 1 : 0), a.posicion.z);
      // Mientras Rosa maneja, se esconden (van "en el platón")
      m.grupo.visible = !(a.siguiendo && jugador.enVehiculo);
    }
  }

  limpiar() {
    if (this.escena) this.lista.forEach((a) => this.escena.remove(a.modelo.grupo));
    this.lista = [];
  }
}
