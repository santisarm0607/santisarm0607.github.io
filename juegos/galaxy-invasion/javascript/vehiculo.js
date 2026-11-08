/* =========================================================
   GALAXY INVASION — vehiculo.js
   La camioneta de Rosa: se maneja con las mismas "acciones"
   que caminar (adelante = acelerar/frenar, lado = girar).
     - Física sencilla: acelera, frena, reversa y gira más
       cuando va rápido.
     - Choca con paredes, autos y lo que lanza el Lanzador:
       si va muy rápido, Rosa recibe daño.
     - Atropella aliens pequeños (los grandes solo se lastiman).
     - Cámara de persecución (detrás y arriba de la camioneta).
   Cuando Rosa se baja, la camioneta queda como un obstáculo.
   Si el Lanzador la destroza (v0.6) queda "averiada": echa
   humo, no arranca y Rosa tiene que seguir a pie.
   ========================================================= */

import * as THREE from 'three';
import { CONFIG } from './config.js';
import { crearCamioneta } from './modelos-granja.js';
import { resolverColisiones } from './mundo.js';

const V = CONFIG.vehiculo;

export class Vehiculo {
  constructor(sonido) {
    this.sonido = sonido;
    this.modelo = crearCamioneta();
    this.grupo = this.modelo.grupo;
    this.llantas = this.grupo.children.filter((o) => o.name.startsWith('llanta_'));
    // Las de adelante (hacia -Z) giran con el volante (v0.8)
    this.llantas.forEach((l) => { l.rotation.order = 'YXZ'; });
    this.llantasDelanteras = this.llantas.filter((l) => l.position.z < 0);
    this.volante = 0;            // -1 a 1: cuánto está girado el volante (se mueve suave)
    this.posicion = new THREE.Vector3();
    this.yaw = 0;
    this.velocidad = 0;          // m/s hacia adelante (negativa = reversa)
    this.ocupado = false;
    this.inclinacion = 0;
    this.giroLlantas = 0;
    this.atropellos = 0;
    this.averiada = false;       // destrozada por el Lanzador: no arranca
    this.tiempoHumo = 0;
    // Caja de choque (solo cuando está estacionada, para que Rosa no la atraviese)
    this.caja = { minX: 0, maxX: 0, minZ: 0, maxZ: 0, alto: 2.2, inactiva: true };
    this.camaraPos = new THREE.Vector3();
    this.mirarOffset = 0;        // mirar a los lados con el mouse/dedo (vuelve solo)
    this.alChocar = () => {};    // (danio) daño a Rosa
    this.alAtropellar = () => {};
  }

  /* Pone la camioneta en una escena (cada etapa tiene la suya) */
  usarEscena(escena, mundo) {
    if (this.grupo.parent) this.grupo.parent.remove(this.grupo);
    escena.add(this.grupo);
    this.mundo = mundo;
    if (!mundo.colisiones.includes(this.caja)) mundo.colisiones.push(this.caja);
  }

  colocar(x, z, yaw) {
    this.posicion.set(x, 0, z);
    this.yaw = yaw;
    this.velocidad = 0;
    this.averiada = false;
    this.inclinacion = 0;
    this.volante = 0;
    this.actualizarModelo(0);
    this.actualizarCaja();
  }

  /* El Lanzador la destroza: frena en seco y ya no arranca */
  averiar() {
    this.averiada = true;
    this.velocidad = 0;
    this.inclinacion = 0.09;     // queda ladeada
    this.sonido.motorContinuo(null);
    this.sonido.reproducir('choqueFuerte');
    this.sonido.reproducir('choqueCamioneta');
    this.actualizarModelo(0);
  }

  /* Humo y chispas del motor roto (lo llama main.js cada cuadro) */
  echarHumo(dt, efectos) {
    if (!this.averiada || !efectos) return;
    this.tiempoHumo -= dt;
    if (this.tiempoHumo > 0) return;
    this.tiempoHumo = 0.12;
    const capo = this.posicion.clone().addScaledVector(this.adelante(), 1.8);
    capo.y = 1.4;
    efectos.emitir(capo, { cantidad: 2, color: 0x4a4a52, velocidad: 0.8, arriba: 3.2, gravedad: -1.5, tam: 0.35, vida: 1.6 });
    if (Math.random() < 0.3) efectos.fuego(capo, 0.5);
  }

  /* Dirección hacia adelante (el frente de la camioneta mira hacia -Z) */
  adelante() {
    return new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
  }

  subir() {
    this.ocupado = true;
    this.caja.inactiva = true;
    this.sonido.reproducir('subirCamioneta');
  }

  bajar() {
    this.ocupado = false;
    this.velocidad = 0;
    this.actualizarCaja();
    this.sonido.motorContinuo(null);
    this.sonido.reproducir('bajarCamioneta');
  }

  /* Punto al lado de la puerta del conductor (para bajarse) */
  puntoBajada() {
    const izq = new THREE.Vector3(-Math.cos(this.yaw), 0, Math.sin(this.yaw));
    return this.posicion.clone().addScaledVector(izq, 2.4);
  }

  actualizarCaja() {
    const c = this.caja;
    // Caja que cubre la camioneta girada (vista desde arriba)
    const ancho = 1.0, largo = 2.5;
    const ex = Math.abs(Math.cos(this.yaw)) * ancho + Math.abs(Math.sin(this.yaw)) * largo;
    const ez = Math.abs(Math.sin(this.yaw)) * ancho + Math.abs(Math.cos(this.yaw)) * largo;
    c.minX = this.posicion.x - ex; c.maxX = this.posicion.x + ex;
    c.minZ = this.posicion.z - ez; c.maxZ = this.posicion.z + ez;
    c.inactiva = this.ocupado;
  }

  /* Manejar. acc: acciones de entrada.js. Devuelve la velocidad */
  actualizar(dt, acc, gestor) {
    // Destrozada: no responde (el volante y el pedal no hacen nada)
    if (this.averiada) acc = { adelante: 0, lado: 0 };
    // ---- Acelerar, frenar y reversa ----
    const gas = acc.adelante;
    if (gas > 0.05) {
      this.velocidad += (this.velocidad < 0 ? V.frenado : V.aceleracion) * gas * dt;
    } else if (gas < -0.05) {
      if (this.velocidad > 0.5) this.velocidad -= V.frenado * -gas * dt;
      else this.velocidad -= V.aceleracion * 0.7 * -gas * dt;
    } else {
      const f = V.friccion * dt;
      this.velocidad = Math.abs(this.velocidad) < f ? 0 : this.velocidad - Math.sign(this.velocidad) * f;
    }
    this.velocidad = Math.max(-V.reversaMax, Math.min(V.velocidadMax, this.velocidad));

    // ---- Girar como un carro de verdad (v0.8) ----
    // El volante se mueve suave (no de golpe) y vuelve solo al centro.
    // El giro depende de la velocidad: despacio gira cerrado, rápido gira abierto.
    // En reversa se gira al revés, como en la vida real.
    this.volante += (-acc.lado - this.volante) * Math.min(1, dt * V.rapidezVolante);
    const rapidez = Math.abs(this.velocidad);
    const anguloRuedas = V.anguloRuedas * (1 - Math.min(0.6, rapidez / V.velocidadMax * 0.6));
    let giro = this.velocidad * Math.tan(this.volante * anguloRuedas) / V.distanciaEjes;
    const giroMax = Math.min(V.giroMax, V.agarre / Math.max(1, rapidez));   // no se voltea en las curvas rápidas
    giro = Math.max(-giroMax, Math.min(giroMax, giro));
    this.yaw += giro * dt;
    this.inclinacion += (-this.volante * Math.min(1, Math.abs(this.velocidad) / 15) * 0.06 - this.inclinacion) * Math.min(1, dt * 5);

    // ---- Moverse y chocar ----
    const antes = this.posicion.clone();
    this.posicion.addScaledVector(this.adelante(), this.velocidad * dt);
    const empujado = resolverColisiones(this.posicion, V.radio, this.mundo.colisiones, this.mundo.limite);
    if (empujado > 0.02) {
      const rapidez = Math.abs(this.velocidad);
      if (rapidez > 4) {
        this.sonido.reproducir('choqueCamioneta');
        if (rapidez > V.velocidadChoqueSinDanio) this.alChocar((rapidez - V.velocidadChoqueSinDanio) * V.danioChoque);
      }
      // Pierde casi toda la velocidad al chocar de frente
      const avance = this.posicion.distanceTo(antes) / Math.max(0.001, rapidez * dt);
      this.velocidad *= Math.max(0.2, Math.min(1, avance)) * (rapidez > 4 ? 0.6 : 1);
    }

    // ---- Atropellar aliens ----
    if (gestor && Math.abs(this.velocidad) > V.atropelloMinimo) {
      for (const e of gestor.lista) {
        if (!e.vivo || e.estado === 'apareciendo') continue;
        const d = Math.hypot(e.posicion.x - this.posicion.x, e.posicion.z - this.posicion.z);
        if (d > V.radio + e.c.radio + 0.6) continue;
        const dir = new THREE.Vector3(e.posicion.x - this.posicion.x, 0, e.posicion.z - this.posicion.z).normalize();
        if (e.esJefe) {
          this.velocidad *= -0.3;
          this.sonido.reproducir('choqueFuerte');
          this.alChocar(10);
          continue;
        }
        if (e.c.vida <= 150) {
          if (e.recibirDanio(9999, dir.multiplyScalar(6))) {
            gestor.morir(e);
            gestor.efectos.muerteAlien(new THREE.Vector3(e.posicion.x, 0.6, e.posicion.z), e.tipo === 'babosito', 0.8);
            this.sonido.reproducir('atropello');
            this.atropellos++;
            this.alAtropellar(e);
          }
        } else if (!e.atropelladoHace || e.atropelladoHace < 0) {
          // Los grandes se lastiman y la camioneta frena
          e.atropelladoHace = 1;
          if (e.recibirDanio(V.danioAtropelloGrande, dir.multiplyScalar(10))) gestor.morir(e);
          this.velocidad *= 0.4;
          this.sonido.reproducir('choqueFuerte');
        }
      }
      for (const e of gestor.lista) if (e.atropelladoHace) e.atropelladoHace -= dt;
    }

    this.actualizarModelo(dt);
    this.sonido.motorContinuo(this.averiada ? null : this.velocidad);
    return this.velocidad;
  }

  actualizarModelo(dt) {
    this.grupo.position.copy(this.posicion);
    this.grupo.rotation.set(0, this.yaw, 0);
    this.grupo.rotateZ(this.inclinacion);
    this.giroLlantas += this.velocidad * dt / 0.45;
    this.llantas.forEach((l) => { l.rotation.x = this.giroLlantas; });
    this.llantasDelanteras.forEach((l) => { l.rotation.y = this.volante * 0.5; });
  }

  /* Cámara detrás de la camioneta. mirarX: el mouse/dedo la gira un poco */
  camaraPersecucion(camara, dt, mirarX, sacudida = 0) {
    this.mirarOffset = Math.max(-1.2, Math.min(1.2, this.mirarOffset - mirarX));
    this.mirarOffset += (0 - this.mirarOffset) * Math.min(1, dt * 0.8);
    const yaw = this.yaw + this.mirarOffset;
    const atras = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    const distancia = 8.5 + Math.abs(this.velocidad) * 0.08;
    const objetivo = this.posicion.clone().addScaledVector(atras, distancia);
    objetivo.y = 3.6 + Math.abs(this.velocidad) * 0.03;
    if (this.camaraPos.lengthSq() === 0 || this.camaraPos.distanceTo(objetivo) > 30) this.camaraPos.copy(objetivo);
    this.camaraPos.lerp(objetivo, Math.min(1, dt * 6));
    camara.position.copy(this.camaraPos);
    if (sacudida > 0) camara.position.add(new THREE.Vector3((Math.random() - 0.5) * sacudida * 0.4, (Math.random() - 0.5) * sacudida * 0.4, 0));
    const mira = this.posicion.clone().addScaledVector(atras, -7);
    mira.y = 1.6;
    camara.up.set(0, 1, 0);
    camara.lookAt(mira);
    // Un poco más de campo de visión mientras más rápido
    const fov = 70 + Math.min(1, Math.abs(this.velocidad) / V.velocidadMax) * 12;
    if (Math.abs(camara.fov - fov) > 0.1) { camara.fov += (fov - camara.fov) * Math.min(1, dt * 3); camara.updateProjectionMatrix(); }
  }
}
