/* =========================================================
   GALAXY INVASION — jugador.js
   Rosa Méndez: movimiento en primera persona, salto, vida,
   escudo y cámara (con balanceo al caminar).
   Cuando maneja, la camioneta (vehiculo.js) la mueve y pone
   la cámara; aquí solo se recarga el escudo.
   Recibe "acciones" (ver entrada.js), no lee el teclado.
   ========================================================= */

import * as THREE from 'three';
import { CONFIG } from './config.js';
import { resolverColisiones } from './mundo.js';

const C = CONFIG.jugador;

export class Jugador {
  constructor(camara, sonido) {
    this.camara = camara;
    this.sonido = sonido;
    this.camara.rotation.order = 'YXZ'; // primero girar a los lados, luego arriba/abajo
    this.posicion = new THREE.Vector3();
    this.velocidad = new THREE.Vector3();
    this.reiniciar(new THREE.Vector3(0, 0, 10), 0);
  }

  /* Deja al jugador como nuevo en un punto del mapa */
  reiniciar(punto, yaw = 0) {
    this.posicion.copy(punto);
    this.velocidad.set(0, 0, 0);
    this.yaw = yaw;
    this.pitch = 0;
    this.enSuelo = true;
    this.vida = C.vidaMax;
    this.escudo = C.escudoMax;
    this.tiempoSinDanio = 99;
    this.recargandoEscudo = false;
    this.vivo = true;
    this.apuntado = 0;          // 0 = desde la cadera, 1 = apuntando
    this.corriendo = false;
    this.faseBalanceo = 0;
    this.distanciaPaso = 0;
    this.hundimiento = 0;       // pequeño "golpe" de cámara al caer
    this.sacudida = 0;          // temblor al recibir daño
    this.retroceso = 0;         // la mira sube al disparar y vuelve sola
    this.enBaba = false;        // pisando un charco de baba (camina más lento)
    this.enVehiculo = false;    // manejando la camioneta
    this.fovApuntar = C.fovApuntar;
    this.ladeo = 0;             // la cámara se ladea un poquito al moverse de lado (v0.8)
    this.ladoActual = 0;
  }

  /* Velocidad horizontal actual (m/s) */
  get rapidez() {
    return Math.hypot(this.velocidad.x, this.velocidad.z);
  }

  actualizar(dt, acc, mundo) {
    if (!this.vivo) return;

    /* ---- Mirar ---- */
    const sensApuntar = 1 - this.apuntado * (1 - C.factorSensibilidadApuntando);
    this.yaw -= acc.mirarX * sensApuntar;
    this.pitch -= acc.mirarY * sensApuntar;
    this.pitch = Math.max(-C.pitchMax, Math.min(C.pitchMax, this.pitch));

    /* ---- Apuntar (suave) ---- */
    const objetivoApuntar = acc.apuntar ? 1 : 0;
    this.apuntado += (objetivoApuntar - this.apuntado) * Math.min(1, dt * 12);

    /* ---- Moverse ---- */
    this.corriendo = acc.correr && acc.adelante > 0.3 && this.apuntado < 0.3;
    let rapidezMax = this.corriendo ? C.velocidadCorrer : C.velocidad;
    rapidezMax = rapidezMax + (C.velocidadApuntando - rapidezMax) * this.apuntado;
    if (this.enBaba) rapidezMax *= C.lentitudBaba;

    const adelanteX = -Math.sin(this.yaw), adelanteZ = -Math.cos(this.yaw);
    const derechaX = Math.cos(this.yaw), derechaZ = -Math.sin(this.yaw);
    let dx = adelanteX * acc.adelante + derechaX * acc.lado;
    let dz = adelanteZ * acc.adelante + derechaZ * acc.lado;
    const largo = Math.hypot(dx, dz);
    if (largo > 1) { dx /= largo; dz /= largo; }

    // En el aire se controla menos. Frenar es un poco más rápido que arrancar
    // (así se siente con peso pero responde bien) (v0.8)
    const control = this.enSuelo ? 1 : 0.35;
    const quiereMoverse = largo > 0.05;
    const aceleracion = quiereMoverse ? C.aceleracion : C.frenado;
    const k = Math.min(1, (aceleracion / rapidezMax) * dt * control);
    this.ladoActual = acc.lado;
    this.velocidad.x += (dx * rapidezMax - this.velocidad.x) * k;
    this.velocidad.z += (dz * rapidezMax - this.velocidad.z) * k;

    /* ---- Saltar y caer ---- */
    if (acc.saltar && this.enSuelo) {
      this.velocidad.y = C.fuerzaSalto;
      this.enSuelo = false;
      this.sonido.reproducir('salto');
    }
    this.velocidad.y -= C.gravedad * dt;

    this.posicion.x += this.velocidad.x * dt;
    this.posicion.z += this.velocidad.z * dt;
    this.posicion.y += this.velocidad.y * dt;
    if (this.posicion.y <= 0) {
      if (!this.enSuelo && this.velocidad.y < -4) {
        this.hundimiento = Math.min(0.15, -this.velocidad.y * 0.012);
        this.sonido.reproducir('aterrizaje');
      }
      this.posicion.y = 0;
      this.velocidad.y = 0;
      this.enSuelo = true;
    }
    resolverColisiones(this.posicion, C.radio, mundo.colisiones, mundo.limite);

    /* ---- Pasos ---- */
    if (this.enSuelo) {
      this.distanciaPaso += this.rapidez * dt;
      if (this.distanciaPaso > C.distanciaPaso) {
        this.distanciaPaso = 0;
        this.sonido.reproducir('paso');
      }
    }

    this.actualizarEscudo(dt);
    this.actualizarCamara(dt);
  }

  /* Escudo: se recarga si no recibes daño por un rato */
  actualizarEscudo(dt) {
    this.tiempoSinDanio += dt;
    if (this.tiempoSinDanio > C.escudoEspera && this.escudo < C.escudoMax) {
      if (!this.recargandoEscudo) { this.recargandoEscudo = true; this.sonido.reproducir('escudoRecarga'); }
      this.escudo = Math.min(C.escudoMax, this.escudo + C.escudoRecarga * dt);
    } else if (this.escudo >= C.escudoMax) {
      this.recargandoEscudo = false;
    }
  }

  /* Subir a la camioneta y bajarse */
  subirVehiculo(vehiculo) {
    this.enVehiculo = true;
    this.apuntado = 0;
    this.posicion.copy(vehiculo.posicion);
    this.velocidad.set(0, 0, 0);
  }

  bajarVehiculo(vehiculo) {
    this.enVehiculo = false;
    this.posicion.copy(vehiculo.puntoBajada());
    this.velocidad.set(0, 0, 0);
    this.yaw = vehiculo.yaw;
    this.pitch = 0;
    this.enSuelo = true;
  }

  /* Mientras maneja: Rosa va donde va la camioneta */
  seguirVehiculo(vehiculo) {
    this.posicion.copy(vehiculo.posicion);
    this.velocidad.copy(vehiculo.adelante()).multiplyScalar(vehiculo.velocidad);
    this.yaw = vehiculo.yaw;
    this.sacudida = Math.max(0, this.sacudida - 0.05);
  }

  /* Pone la cámara en los ojos del jugador, con balanceo al caminar */
  actualizarCamara(dt) {
    const enMovimiento = this.enSuelo && this.rapidez > 0.5;
    if (enMovimiento) this.faseBalanceo += this.rapidez * dt * 1.7;
    const fuerzaBalanceo = enMovimiento ? Math.min(1, this.rapidez / C.velocidad) * (1 - this.apuntado * 0.8) : 0;
    const balanceoY = Math.abs(Math.sin(this.faseBalanceo)) * 0.06 * fuerzaBalanceo;

    this.hundimiento += (0 - this.hundimiento) * Math.min(1, dt * 8);
    this.sacudida = Math.max(0, this.sacudida - dt * 3);
    this.retroceso += (0 - this.retroceso) * Math.min(1, dt * 10);

    // Balanceo de lado a lado al caminar (la cabeza se mueve como en un paso de verdad)
    const balanceoX = Math.sin(this.faseBalanceo) * 0.035 * fuerzaBalanceo;
    this.camara.position.set(
      this.posicion.x + Math.cos(this.yaw) * balanceoX,
      this.posicion.y + C.altura + balanceoY - this.hundimiento,
      this.posicion.z - Math.sin(this.yaw) * balanceoX
    );
    this.ladeo += (-this.ladoActual * 0.022 * (this.enVehiculo ? 0 : 1) - this.ladeo) * Math.min(1, dt * 6);
    const temblor = this.sacudida * 0.04;
    this.camara.rotation.y = this.yaw + (Math.random() - 0.5) * temblor;
    this.camara.rotation.x = this.pitch + this.retroceso + (Math.random() - 0.5) * temblor;
    this.camara.rotation.z = Math.sin(this.faseBalanceo) * 0.006 * fuerzaBalanceo + this.ladeo;

    // Zoom al apuntar (y un poquito más abierto al correr)
    const fovObjetivo = C.fov + (this.fovApuntar - C.fov) * this.apuntado + (this.corriendo ? 6 : 0);
    if (Math.abs(this.camara.fov - fovObjetivo) > 0.05) {
      this.camara.fov += (fovObjetivo - this.camara.fov) * Math.min(1, dt * 10);
      this.camara.updateProjectionMatrix();
    }
  }

  /* Un golpe fuerte (embestida) la empuja */
  empujar(vx, vz) {
    this.velocidad.x += vx;
    this.velocidad.z += vz;
    this.velocidad.y = Math.max(this.velocidad.y, 3);
    this.enSuelo = false;
  }

  /* El arma empuja la mira hacia arriba */
  aplicarRetroceso(cantidad) {
    this.retroceso += cantidad;
    this.pitch = Math.min(C.pitchMax, this.pitch + cantidad * 0.35);
  }

  /* Recibe daño: primero baja el escudo y luego la vida */
  recibirDanio(cantidad) {
    if (!this.vivo) return { escudoRoto: false, murio: false };
    this.tiempoSinDanio = 0;
    this.recargandoEscudo = false;
    this.sacudida = 1;
    const teniaEscudo = this.escudo > 0;
    const absorbido = Math.min(this.escudo, cantidad);
    this.escudo -= absorbido;
    this.vida -= cantidad - absorbido;
    const escudoRoto = teniaEscudo && this.escudo <= 0;
    if (this.vida <= 0) {
      this.vida = 0;
      this.vivo = false;
    }
    return { escudoRoto, murio: !this.vivo };
  }

  curar(cantidad) {
    const antes = this.vida;
    this.vida = Math.min(C.vidaMax, this.vida + cantidad);
    return this.vida - antes;
  }
}
