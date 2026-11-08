/* =========================================================
   GALAXY INVASION — enemigos-ciudad.js
   Aliens de la ciudad (usan la clase Enemigo de enemigos.js):
     - Soldado alien: se queda a media distancia, se mueve de
       lado y dispara balas de plasma (el cañón brilla antes =
       aviso). Las paredes, autos y barreras detienen el plasma.
     - Bruto: grande y resistente. De cerca da puñetazos; de
       media distancia CARGA en línea recta (esquívalo de lado).
   ========================================================= */

import * as THREE from 'three';
import { Enemigo, registrarEnemigo } from './enemigos.js';
import { crearSoldadoAlien, crearBruto, crearPlasma } from './modelos-ciudad.js';
import { resolverColisiones } from './mundo.js';

const vec = new THREE.Vector3();

/* =========================================================
   SOLDADO ALIEN
   ========================================================= */
class SoldadoAlien extends Enemigo {
  constructor(escena, punto) {
    super('soldadoAlien', escena, punto, crearSoldadoAlien());
    this.colorGolpe = 0x6a3fb3;
    this.esperaDisparo = 1 + Math.random() * 1.5;
    this.lado = Math.random() < 0.5 ? -1 : 1;     // hacia qué lado se mueve
    this.cambioLado = 2 + Math.random() * 2;
    this.sonidos = { chillido: 'soldadoAlienGrito', ataque: 'alienAtaque', aparece: 'alienAparece', muere: 'soldadoAlienMuere' };
  }

  get alturaCentro() { return 1.1; }

  comportamiento(dt, jugador, otros, mundo, ctx) {
    const c = this.c;
    const m = this.modelo;
    const dx = jugador.posicion.x - this.posicion.x, dz = jugador.posicion.z - this.posicion.z;
    const distancia = Math.hypot(dx, dz) || 0.001;

    // Muy cerca: pelea cuerpo a cuerpo (como los demás aliens)
    if (this.estado === 'preparando' || (distancia < 3 && this.estado === 'persiguiendo')) {
      super.comportamiento(dt, jugador, otros, mundo, ctx);
      return;
    }

    // Cargando el disparo: el cañón brilla cada vez más
    if (this.estado === 'cargando') {
      const p = Math.min(1, this.tiempoEstado / c.preparacionDisparo);
      m.matCanon.color.setRGB(0.48 + p * 0.52, 0.25 + p * 0.6, 0.7 + p * 0.3);
      this.mirarHacia(dx, dz, dt, 10);
      if (p >= 1) {
        this.disparar(jugador, ctx);
        m.matCanon.color.setHex(0x7a3fb3);
        this.esperaDisparo = c.esperaDisparo * (0.8 + Math.random() * 0.5);
        this.cambiarEstado('persiguiendo');
      }
      return;
    }

    // Moverse: acercarse o alejarse hasta su distancia ideal, y de lado
    this.cambioLado -= dt;
    if (this.cambioLado <= 0) { this.lado *= -1; this.cambioLado = 1.5 + Math.random() * 2.5; }
    const dirX = dx / distancia, dirZ = dz / distancia;
    const error = distancia - c.distanciaIdeal;
    const avance = Math.max(-1, Math.min(1, error / 4));
    vec.set(
      this.posicion.x + (dirX * avance - dirZ * this.lado * 0.7) * 6,
      0,
      this.posicion.z + (dirZ * avance + dirX * this.lado * 0.7) * 6
    );
    const { rapidez } = this.perseguir(dt, vec, otros, mundo, this.velocidad);
    this.mirarHacia(dx, dz, dt, 10);
    this.fasePaso += dt * Math.max(rapidez, 0.5) * 3;
    this.animarCaminar(dt, rapidez);

    // Disparar
    this.esperaDisparo -= dt;
    if (this.esperaDisparo <= 0 && distancia < c.alcanceDisparo && jugador.vivo) this.cambiarEstado('cargando');
  }

  disparar(jugador, ctx) {
    const c = this.c;
    const origen = new THREE.Vector3();
    this.modelo.salida.getWorldPosition(origen);
    // Apunta un poquito adelante de donde va Rosa (y a veces falla)
    const destino = jugador.posicion.clone().addScaledVector(jugador.velocidad, 0.25);
    destino.y = jugador.posicion.y + (jugador.enVehiculo ? 1.2 : 1.1);
    destino.x += (Math.random() - 0.5) * 1.2;
    destino.z += (Math.random() - 0.5) * 1.2;
    ctx.gestor.lanzar({
      origen, direccion: destino.sub(origen), velocidad: c.velocidadPlasma,
      malla: crearPlasma(), danio: c.danioPlasma, radio: 0.6, tipo: 'plasma', vidaMax: 2.5
    });
    ctx.sonido.reproducir('plasmaDisparo', { x: this.posicion.x, z: this.posicion.z });
  }

  animarCaminar(dt, rapidez = 1) {
    const m = this.modelo;
    const s = Math.sin(this.fasePaso) * Math.min(1, rapidez / 2);
    m.piernas[0].rotation.x = s * 0.5;
    m.piernas[1].rotation.x = -s * 0.5;
    m.brazoIzq.rotation.x = -s * 0.4;
    m.cuerpo.position.y = Math.abs(Math.cos(this.fasePaso)) * 0.04;
  }

  animarPreparar(p) { this.modelo.brazoIzq.rotation.x = -p * 2.2; }
  animarGolpe() { this.modelo.brazoIzq.rotation.x = 0.4; }
}

/* =========================================================
   BRUTO
   ========================================================= */
class Bruto extends Enemigo {
  constructor(escena, punto) {
    super('bruto', escena, punto, crearBruto());
    this.colorGolpe = 0x6a2a8a;
    this.esperaCarga = 2 + Math.random() * 2;
    this.direccionCarga = new THREE.Vector3();
    this.sonidos = { chillido: 'brutoRugido', ataque: 'brutoRugido', aparece: 'alienAparece', muere: 'brutoMuere' };
  }

  get alturaCentro() { return 1.5; }

  comportamiento(dt, jugador, otros, mundo, ctx) {
    const c = this.c;
    const m = this.modelo;
    const dx = jugador.posicion.x - this.posicion.x, dz = jugador.posicion.z - this.posicion.z;
    const distancia = Math.hypot(dx, dz) || 0.001;

    if (this.estado === 'preparandoCarga') {
      // Golpea el suelo con los puños y apunta
      const p = Math.min(1, this.tiempoEstado / c.preparacionCarga);
      m.torso.rotation.x = 0.35 + p * 0.3;
      m.brazos.forEach((b, i) => { b.rotation.x = Math.sin(this.tiempoEstado * 14 + i) * 0.4; });
      this.mirarHacia(dx, dz, dt, 6);
      if (p >= 1) {
        this.direccionCarga.set(dx, 0, dz).normalize();
        this.golpeoCarga = false;
        this.cambiarEstado('cargando');
      }
      return;
    }
    if (this.estado === 'cargando') {
      this.posicion.addScaledVector(this.direccionCarga, c.velocidadCarga * dt);
      const empujado = resolverColisiones(this.posicion, c.radio, mundo.colisiones, mundo.limite);
      this.grupo.position.set(this.posicion.x, 0, this.posicion.z);
      this.fasePaso += dt * 16;
      this.animarCaminar(dt, 3);
      if (Math.random() < 0.4) ctx.efectos.polvo(new THREE.Vector3(this.posicion.x, 0.3, this.posicion.z), 0.8);
      if (!this.golpeoCarga && distancia < c.radio + 1.0) {
        this.golpeoCarga = true;
        ctx.alAtacar(this, c.danioCarga);
        if (!jugador.enVehiculo) jugador.empujar(this.direccionCarga.x * 9, this.direccionCarga.z * 9);
      }
      if (empujado > 0.05 || this.tiempoEstado > c.duracionCarga) {
        if (empujado > 0.05) ctx.sonido.reproducir('choqueFuerte', { x: this.posicion.x, z: this.posicion.z });
        this.esperaCarga = c.esperaCarga;
        this.cambiarEstado('recuperando');
      }
      return;
    }
    if (this.estado === 'recuperando') {
      m.torso.rotation.x += (0.35 - m.torso.rotation.x) * Math.min(1, dt * 4);
      if (this.tiempoEstado > 1.1) this.cambiarEstado('persiguiendo');
      return;
    }
    // Persiguiendo: ¿carga?
    this.esperaCarga -= dt;
    if (this.estado === 'persiguiendo' && this.esperaCarga <= 0 && distancia > 5 && distancia < c.distanciaCarga && jugador.vivo) {
      ctx.sonido.reproducir('brutoRugido', { x: this.posicion.x, z: this.posicion.z });
      this.cambiarEstado('preparandoCarga');
      return;
    }
    super.comportamiento(dt, jugador, otros, mundo, ctx);
  }

  animarCaminar(dt, fuerza = 1) {
    const m = this.modelo;
    const s = Math.sin(this.fasePaso * 0.9);
    m.piernas[0].rotation.x = s * 0.35 * Math.min(fuerza, 1.6);
    m.piernas[1].rotation.x = -s * 0.35 * Math.min(fuerza, 1.6);
    m.brazos[0].rotation.x += (-s * 0.4 - m.brazos[0].rotation.x) * Math.min(1, dt * 6);
    m.brazos[1].rotation.x += (s * 0.4 - m.brazos[1].rotation.x) * Math.min(1, dt * 6);
    m.cuerpo.position.y = Math.abs(Math.cos(this.fasePaso * 0.9)) * 0.1;
    m.torso.rotation.x += (0.35 - m.torso.rotation.x) * Math.min(1, dt * 4);
  }
  animarPreparar(p) { this.modelo.brazos.forEach((b) => { b.rotation.x = -p * 2.4; }); }
  animarGolpe() { this.modelo.brazos.forEach((b) => { b.rotation.x = 0.5; }); }
}

registrarEnemigo('soldadoAlien', SoldadoAlien);
registrarEnemigo('bruto', Bruto);
