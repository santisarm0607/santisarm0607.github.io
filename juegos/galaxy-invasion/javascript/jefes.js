/* =========================================================
   GALAXY INVASION — jefes.js
   Los jefes de cada etapa. Todos usan la clase Enemigo de
   enemigos.js y tienen:
     esJefe = true, nombre, vida/vidaMax, pista (texto de ayuda)
     zonas de disparo: 'cuerpo' (blindado) y 'nucleo' (punto débil)

   ETAPA 1 · BESTIA DE HENO
     Estados: apareciendo -> caminando -> (golpe | lanzar | embestida)
              embestida -> aturdida (núcleo expuesto) -> caminando
     Si un barril explota cerca: se quema (le baja vida y deja el núcleo expuesto).

   ETAPA 2 · EL LANZADOR
     Modo 'acompanando': mientras manejas, camina por el campo y te lanza
       rocas y autos (caen donde va a estar la camioneta, con aviso rojo).
     Modo 'pelea': bloquea la carretera. Hay que reventar sus 3 sacos de
       baba; después su cabeza queda sin protección.

   ETAPA 3 · GUARDIÁN DE LA NAVE
     Escudo de energía alimentado por 3 generadores: destrúyelos y dispara
     al núcleo del pecho. Al 50 % de vida el escudo y los generadores vuelven.
     Ataques: orbes (en arco), láser (solo sin escudo), pisotón y refuerzos.

   Los jefes pueden dejar un texto en "aviso": main.js lo muestra en pantalla.
   ========================================================= */

import * as THREE from 'three';
import { CONFIG } from './config.js';
import { Enemigo, registrarEnemigo } from './enemigos.js';
import { crearBestiaHeno, crearPacaLanzada, crearLanzador, crearGuardian, crearGenerador } from './modelos-jefes.js';
import { crearRoca } from './modelos-carretera.js';
import { crearAutoDestruido } from './modelos.js';
import { crearOrbe } from './modelos-ciudad.js';
import { resolverColisiones } from './mundo.js';

/* =========================================================
   BASE DE LOS JEFES
   ========================================================= */
export class Jefe extends Enemigo {
  constructor(tipo, escena, punto, modelo) {
    super(tipo, escena, punto, modelo);
    this.esJefe = true;
    this.grupo.position.y = 0;
    this.cooldowns = {};
    this.fase = 1;
    this.ultimoGolpeBloqueado = false;
    this.escena = escena;
    this.aviso = null;           // texto para mostrar en pantalla (lo lee main.js)
    this.mostrarBarra = true;    // barra de vida arriba
  }

  /* Dirección hacia donde mira (la cara está hacia -Z) */
  frente() {
    return new THREE.Vector3(-Math.sin(this.grupo.rotation.y), 0, -Math.cos(this.grupo.rotation.y));
  }

  /* Baja los tiempos de espera de los ataques */
  enfriar(dt) {
    for (const k in this.cooldowns) this.cooldowns[k] -= dt;
  }
}

/* =========================================================
   BESTIA DE HENO
   ========================================================= */
class BestiaHeno extends Jefe {
  constructor(escena, punto) {
    super('bestia', escena, punto, crearBestiaHeno());
    this.nombre = 'Bestia de Heno';
    this.grupo.rotation.y = 0;
    this.colorGolpe = 0x6a4a10;
    this.duracionMuerte = 2.6;
    this.sonidos = { chillido: 'bestiaRugido', ataque: 'bestiaRugido', aparece: 'jefeAparece', muere: 'bestiaMuere' };
    this.sonidoBloqueo = 'golpeHeno';
    this.cooldowns = { golpe: 2, paca: 2.5, embestida: 5 };
    this.ardiendo = 0;           // segundos que le quedan quemándose
    this.apertura = 0;           // 0 = pecho cerrado, 1 = núcleo expuesto
    this.direccionEmbestida = new THREE.Vector3();
    this.embestidaGolpeo = false;
    this.refuerzosLlamados = [];
    this.piezasMuerte = [];
  }

  get alturaCentro() { return 3.85; }

  /* Texto de ayuda bajo la barra de vida */
  get pista() {
    if (this.estado === 'apareciendo') return '¡Las pacas cobraron vida!';
    if (this.ardiendo > 0) return '¡Se está quemando! Dispara al núcleo';
    if (this.apertura > 0.5) return '¡El núcleo está expuesto! ¡Dispárale!';
    if (this.estado === 'preparandoEmbestida') return '¡Va a embestir! Muévete de lado';
    if (this.estado === 'preparandoGolpe') return '¡Salta para esquivar la onda!';
    return 'Haz que embista o quémala con un barril para abrirle el pecho';
  }

  get nucleoExpuesto() { return this.apertura > 0.5; }

  recibirDanio(cantidad, direccion, objeto) {
    if (!this.vivo || this.estado === 'apareciendo') { this.ultimoGolpeBloqueado = true; return false; }
    const enNucleo = objeto && objeto.userData.zona === 'nucleo';
    this.ultimoGolpeBloqueado = !enNucleo;
    const B = this.c;
    // El heno casi no le hace nada; el núcleo recibe daño de más
    const danio = enNucleo ? cantidad * B.multiplicadorNucleo : cantidad * B.danioCuerpo;
    this.vida -= danio;
    this.parpadeo = 0.08;
    if (this.vida <= 0) { this.vida = 0; this.morirAhora(); return true; }
    return false;
  }

  /* Un barril explotó cerca: se quema */
  alExplosion(danio, punto, gestor) {
    if (!this.vivo || this.estado === 'apareciendo') return;
    this.ardiendo = this.c.duracionFuego;
    this.ultimoGolpeBloqueado = false;
    this.vida -= danio;
    this.parpadeo = 0.15;
    this.fuePorFuego = true;
    gestor.sonido.reproducir('fuego', { x: this.posicion.x, z: this.posicion.z });
    if (this.vida <= 0) { this.vida = 0; this.morirAhora(); gestor.morir(this); }
  }

  morirAhora() {
    this.cambiarEstado('muriendo');
    // Cada paca sale volando para un lado
    this.piezasMuerte = [];
    this.modelo.cuerpo.traverse((o) => {
      if (o.isGroup && o.children.some((c) => c.name === 'heno')) {
        this.piezasMuerte.push({ obj: o, vel: new THREE.Vector3((Math.random() - 0.5) * 6, 3 + Math.random() * 4, (Math.random() - 0.5) * 6), giro: new THREE.Vector3(Math.random() * 4, Math.random() * 4, Math.random() * 4) });
      }
    });
  }

  actualizar(dt, jugador, otros, mundo, ctx) {
    this.tiempoEstado += dt;
    this.parpadeo -= dt;
    this.enfriar(dt);
    const m = this.modelo;

    // Color: parpadeo al recibir golpes, brillo naranja al quemarse
    if (this.parpadeo > 0) m.matCuerpo.emissive.setHex(this.colorGolpe);
    else if (this.ardiendo > 0) m.matCuerpo.emissive.setRGB(0.35 + Math.random() * 0.15, 0.12, 0);
    else m.matCuerpo.emissive.setHex(0x30240a);   // brillo propio: se ve de noche

    if (this.estado === 'apareciendo') {
      // Sale de la pila de pacas
      const p = Math.min(1, this.tiempoEstado / this.c.tiempoAparicion);
      m.cuerpo.scale.set(0.6 + p * 0.4, 0.15 + p * 0.85, 0.6 + p * 0.4);
      m.cuerpo.rotation.z = Math.sin(this.tiempoEstado * 12) * 0.05 * (1 - p);
      if (Math.random() < 0.4) ctx.efectos.heno(new THREE.Vector3(this.posicion.x + (Math.random() - 0.5) * 3, 0.5 + p * 4, this.posicion.z), 0.5);
      if (p >= 1) { m.cuerpo.rotation.z = 0; this.cambiarEstado('caminando'); ctx.sonido.reproducir('bestiaRugido', { x: this.posicion.x, z: this.posicion.z }); }
      return;
    }

    if (this.estado === 'muriendo') {
      this.animarMuerte(dt, ctx);
      return;
    }

    // ---- Fuego ----
    if (this.ardiendo > 0) {
      this.ardiendo -= dt;
      this.vida -= this.c.danioFuego * dt;
      if (Math.random() < 0.6) ctx.efectos.fuego(new THREE.Vector3(this.posicion.x + (Math.random() - 0.5) * 2.5, 2 + Math.random() * 3, this.posicion.z + (Math.random() - 0.5) * 1.5), 1.6);
      if (this.vida <= 0) { this.vida = 0; this.morirAhora(); ctx.gestor.morir(this); return; }
    }

    // ---- Fase 2: a la mitad de la vida llama refuerzos y se vuelve más rápida ----
    const proporcion = this.vida / this.vidaMax;
    for (const umbral of [0.6, 0.3]) {
      if (proporcion < umbral && !this.refuerzosLlamados.includes(umbral)) {
        this.refuerzosLlamados.push(umbral);
        this.fase = 2;
        ctx.sonido.reproducir('bestiaRugido', { x: this.posicion.x, z: this.posicion.z });
        for (let i = 0; i < this.c.refuerzos; i++) {
          const a = Math.random() * Math.PI * 2;
          ctx.gestor.crear('babosito', { x: this.posicion.x + Math.cos(a) * 8, y: 0, z: this.posicion.z + Math.sin(a) * 8 });
        }
      }
    }
    const rapida = this.fase === 2 ? 1.3 : 1;

    // ---- Pecho: se abre cuando está aturdida o ardiendo ----
    const abrir = this.estado === 'aturdida' || this.ardiendo > 0;
    this.apertura += ((abrir ? 1 : 0) - this.apertura) * Math.min(1, dt * 5);
    m.pechoIzq.position.x = -0.66 - this.apertura * 0.9;
    m.pechoDer.position.x = 0.66 + this.apertura * 0.9;
    m.pechoIzq.rotation.y = this.apertura * 0.9;
    m.pechoDer.rotation.y = -this.apertura * 0.9;
    m.hitNucleo.userData.apagada = !this.nucleoExpuesto;
    m.nucleo.scale.setScalar(1 + Math.sin(this.tiempoEstado * 10) * 0.06 * this.apertura);

    const dx = jugador.posicion.x - this.posicion.x, dz = jugador.posicion.z - this.posicion.z;
    const distancia = Math.hypot(dx, dz);
    const B = this.c;

    switch (this.estado) {
      case 'caminando': {
        const { rapidez } = this.perseguir(dt, jugador.posicion, [], mundo, this.velocidad * rapida);
        this.fasePaso += dt * Math.max(rapidez, 0.5) * 1.3;
        this.animarCaminar(dt);
        if (!jugador.vivo) break;
        if (distancia < B.rangoGolpe && this.cooldowns.golpe <= 0) this.iniciar('preparandoGolpe', ctx, 'bestiaRugido');
        else if (this.cooldowns.embestida <= 0 && distancia > 8 && distancia < 40) this.iniciar('preparandoEmbestida', ctx, 'bestiaRugido');
        else if (this.cooldowns.paca <= 0 && distancia > 9) this.iniciar('lanzando', ctx);
        break;
      }
      case 'preparandoGolpe': {
        // Levanta los dos brazos
        const p = Math.min(1, this.tiempoEstado / B.preparacionGolpe);
        m.brazos.forEach((b) => { b.rotation.x = -p * 2.6; });
        this.mirarHacia(dx, dz, dt, 3);
        if (p >= 1) {
          m.brazos.forEach((b) => { b.rotation.x = 0.3; });
          const frente = this.frente();
          ctx.gestor.onda(this.posicion.x + frente.x * 2.5, this.posicion.z + frente.z * 2.5, B.radioOnda, B.danioOnda, jugador);
          ctx.sonido.reproducir('golpeSuelo', { x: this.posicion.x, z: this.posicion.z });
          if (distancia < 25) jugador.sacudida = Math.max(jugador.sacudida, 0.8);
          this.cooldowns.golpe = B.esperaGolpe / rapida;
          this.cambiarEstado('recuperando');
        }
        break;
      }
      case 'lanzando': {
        // Echa el brazo derecho hacia atrás y lanza una paca
        const p = Math.min(1, this.tiempoEstado / 0.8);
        m.brazos[1].rotation.x = -p * 2.2;
        this.mirarHacia(dx, dz, dt, 4);
        if (p >= 1) {
          const mano = new THREE.Vector3();
          m.brazos[1].getWorldPosition(mano);
          mano.y += 1;
          const destino = jugador.posicion.clone().addScaledVector(jugador.velocidad, 0.9);
          destino.y = 0.4;
          ctx.gestor.lanzar({
            origen: mano, destino, tiempo: B.tiempoPaca, gravedad: 20, malla: crearPacaLanzada(),
            danio: B.danioPaca, radio: B.radioPaca, tipo: 'paca', aviso: true, giro: 5
          });
          ctx.sonido.reproducir('lanzar', { x: this.posicion.x, z: this.posicion.z });
          m.brazos[1].rotation.x = 0.6;
          this.cooldowns.paca = B.esperaPaca / rapida;
          this.cambiarEstado('recuperando');
        }
        break;
      }
      case 'preparandoEmbestida': {
        // Se agacha, rasca el suelo y apunta hacia Rosa
        const p = Math.min(1, this.tiempoEstado / B.preparacionEmbestida);
        m.cuerpo.rotation.x = p * 0.35;
        m.cuerpo.position.y = -p * 0.3;
        this.mirarHacia(dx, dz, dt, 6);
        if (Math.random() < 0.3) ctx.efectos.polvo(new THREE.Vector3(this.posicion.x, 0.3, this.posicion.z), 1);
        if (p >= 1) {
          this.direccionEmbestida.set(dx, 0, dz).normalize();
          this.embestidaGolpeo = false;
          ctx.sonido.reproducir('embestida', { x: this.posicion.x, z: this.posicion.z });
          this.cambiarEstado('embistiendo');
        }
        break;
      }
      case 'embistiendo': {
        // Corre en línea recta. Si choca con algo, se aturde más tiempo
        const antes = this.posicion.clone();
        this.posicion.addScaledVector(this.direccionEmbestida, B.velocidadEmbestida * rapida * dt);
        resolverColisiones(this.posicion, B.radio, mundo.colisiones, mundo.limite);
        const avance = this.posicion.distanceTo(antes);
        const choco = avance < B.velocidadEmbestida * rapida * dt * 0.5;
        this.grupo.position.set(this.posicion.x, 0, this.posicion.z);
        this.fasePaso += dt * 18;
        this.animarCaminar(dt, 2);
        if (Math.random() < 0.5) ctx.efectos.heno(new THREE.Vector3(this.posicion.x, 1, this.posicion.z), 0.4);
        // ¿Atropelló a Rosa?
        if (!this.embestidaGolpeo && distancia < B.radio + 1.0) {
          this.embestidaGolpeo = true;
          ctx.alAtacar(this, B.danioEmbestida);
          jugador.empujar(this.direccionEmbestida.x * 12, this.direccionEmbestida.z * 12);
        }
        // Los barriles que toca explotan (¡y se quema!)
        if (mundo.barriles) mundo.barriles.forEach((b) => { if (!b.explotado && Math.hypot(b.posicion.x - this.posicion.x, b.posicion.z - this.posicion.z) < B.radio + 0.6) b.explotar(); });
        if (choco || this.tiempoEstado > B.duracionEmbestida) {
          if (choco) { ctx.sonido.reproducir('choqueFuerte', { x: this.posicion.x, z: this.posicion.z }); ctx.efectos.polvo(new THREE.Vector3(this.posicion.x, 1, this.posicion.z), 3); }
          this.aturdidaPor = choco ? B.aturdidaChoque : B.aturdida;
          this.cooldowns.embestida = B.esperaEmbestida / rapida;
          ctx.sonido.reproducir('nucleoExpuesto', { x: this.posicion.x, z: this.posicion.z });
          this.cambiarEstado('aturdida');
        }
        break;
      }
      case 'aturdida': {
        // Mareada: se tambalea con el pecho abierto
        m.cuerpo.rotation.x += (0.15 - m.cuerpo.rotation.x) * Math.min(1, dt * 4);
        m.cuerpo.position.y += (-0.5 - m.cuerpo.position.y) * Math.min(1, dt * 4);
        m.cuerpo.rotation.z = Math.sin(this.tiempoEstado * 3) * 0.12;
        m.cabeza.rotation.y = Math.sin(this.tiempoEstado * 5) * 0.4;
        if (this.tiempoEstado > this.aturdidaPor) { m.cuerpo.rotation.z = 0; m.cabeza.rotation.y = 0; this.cambiarEstado('recuperando'); }
        break;
      }
      case 'recuperando': {
        m.cuerpo.rotation.x += (0 - m.cuerpo.rotation.x) * Math.min(1, dt * 5);
        m.cuerpo.position.y += (0 - m.cuerpo.position.y) * Math.min(1, dt * 5);
        m.brazos.forEach((b) => { b.rotation.x += (0 - b.rotation.x) * Math.min(1, dt * 5); });
        this.mirarHacia(dx, dz, dt, 3);
        if (this.tiempoEstado > 0.7) this.cambiarEstado('caminando');
        break;
      }
    }

    // Rugido de vez en cuando
    this.proximoChillido -= dt;
    if (this.proximoChillido <= 0) {
      this.proximoChillido = 6 + Math.random() * 5;
      ctx.sonido.reproducir('bestiaRugido', { x: this.posicion.x, z: this.posicion.z });
    }
  }

  iniciar(estado, ctx, sonido) {
    if (sonido) ctx.sonido.reproducir(sonido, { x: this.posicion.x, z: this.posicion.z });
    this.cambiarEstado(estado);
  }

  frente() {
    return new THREE.Vector3(-Math.sin(this.grupo.rotation.y), 0, -Math.cos(this.grupo.rotation.y));
  }

  animarCaminar(dt, fuerza = 1) {
    const m = this.modelo;
    const s = Math.sin(this.fasePaso);
    m.piernas[0].rotation.x = s * 0.45 * fuerza;
    m.piernas[1].rotation.x = -s * 0.45 * fuerza;
    m.brazos[0].rotation.x += (-s * 0.35 - m.brazos[0].rotation.x) * Math.min(1, dt * 6);
    m.brazos[1].rotation.x += (s * 0.35 - m.brazos[1].rotation.x) * Math.min(1, dt * 6);
    m.cuerpo.position.y = Math.abs(Math.cos(this.fasePaso)) * 0.15;
    m.torso.rotation.y = s * 0.08;
  }

  /* Se desarma: las pacas salen volando y el núcleo revienta */
  animarMuerte(dt, ctx) {
    const m = this.modelo;
    m.matCuerpo.emissive.setHex(0x30240a);
    for (const pz of this.piezasMuerte) {
      pz.vel.y -= 12 * dt;
      pz.obj.position.addScaledVector(pz.vel, dt);
      pz.obj.rotation.x += pz.giro.x * dt;
      pz.obj.rotation.z += pz.giro.z * dt;
    }
    const p = this.tiempoEstado / this.duracionMuerte;
    m.nucleo.scale.setScalar(Math.max(0.01, 1 + p * 0.8 - (p > 0.6 ? (p - 0.6) * 5 : 0)));
    if (p > 0.6 && !this.reventado) {
      this.reventado = true;
      ctx && ctx.efectos.muerteAlien(new THREE.Vector3(this.posicion.x, 3.6, this.posicion.z), true, 2);
      ctx && ctx.efectos.heno(new THREE.Vector3(this.posicion.x, 2, this.posicion.z), 3);
    }
    if (p > 0.7) this.grupo.scale.setScalar(Math.max(0.01, 1 - (p - 0.7) / 0.3));
    if (p >= 1) this.eliminar = true;
  }
}

registrarEnemigo('bestia', BestiaHeno);

/* =========================================================
   EL LANZADOR
   ========================================================= */
class Lanzador extends Jefe {
  constructor(escena, punto, opciones = {}) {
    super('lanzador', escena, punto, crearLanzador());
    const c = this.c;
    this.nombre = 'El Lanzador';
    this.colorGolpe = 0x3a2a4a;
    this.duracionMuerte = 3.2;
    this.sonidos = { chillido: 'lanzadorRugido', ataque: 'lanzadorRugido', aparece: 'jefeAparece', muere: 'lanzadorMuere' };
    this.sonidoBloqueo = 'golpeRoca';
    this.modo = opciones.modo || 'pelea';
    this.vidaSacos = [c.vidaSaco, c.vidaSaco, c.vidaSaco];
    this.vidaCabeza = c.vidaCabeza;
    this.vidaMax = this.vida = c.vidaSaco * 3 + c.vidaCabeza;
    this.cooldowns = { lanzar: 2.5, roca: 2.5, pisoton: 4, cria: 6 };
    this.reventadosPendientes = [];
    this.vehiculo = null;               // la camioneta (la pone la misión)
    this.alCaerObjeto = () => {};       // (punto, tipo, malla) la misión deja el obstáculo en la vía
    this.caida = this.modo === 'pelea'; // en la pelea llega saltando desde el cielo
    // Emboscada (v0.6): salta desde el maizal hasta la vía. opciones.salto = { desde: Vector3, tiempo }
    this.salto = opciones.salto || null;
    this.alAterrizar = () => {};        // la misión lo usa para destrozar la camioneta
    if (this.salto) {
      this.caida = false;
      this.salto.desde = this.salto.desde.clone();
      this.grupo.position.copy(this.salto.desde);
      // Recién aterrizado tarda un poco en atacar (Rosa todavía está saliendo de la camioneta)
      this.cooldowns = { lanzar: 2.5, roca: 4.5, pisoton: 6, cria: 9 };
    }
    this.ponerModo(this.modo);
    this.modelo.hitCabeza.userData.apagada = true;
  }

  ponerModo(modo) {
    this.modo = modo;
    this.mostrarBarra = modo === 'pelea';
    const apagadas = modo !== 'pelea';
    this.modelo.hitSacos.forEach((h, i) => { h.userData.apagada = apagadas || this.vidaSacos[i] <= 0; });
    this.modelo.hitbox.userData.apagada = apagadas;
  }

  get alturaCentro() { return 8; }
  get sacosVivos() { return this.vidaSacos.filter((v) => v > 0).length; }

  get pista() {
    if (this.estado === 'apareciendo') return '¡Te bloquea el camino!';
    if (this.sacosVivos > 0) return `Revienta los sacos de baba que brillan (${this.sacosVivos} de 3)`;
    return '¡Sin sacos! Dispárale a la cabeza';
  }

  recibirDanio(cantidad, direccion, objeto) {
    this.ultimoGolpeBloqueado = true;
    if (!this.vivo || this.modo !== 'pelea' || this.estado === 'apareciendo') return false;
    const zona = objeto && objeto.userData.zona;
    if (zona && zona.startsWith('saco')) {
      const i = Number(zona.slice(4));
      if (this.vidaSacos[i] <= 0) return false;
      const d = Math.min(cantidad, this.vidaSacos[i]);
      this.vidaSacos[i] -= d;
      this.vida -= d;
      this.ultimoGolpeBloqueado = false;
      this.parpadeo = 0.08;
      if (this.vidaSacos[i] <= 0) this.reventadosPendientes.push(i);
      return false;
    }
    if (zona === 'nucleo' && this.sacosVivos === 0) {
      const d = Math.min(cantidad, this.vidaCabeza);
      this.vidaCabeza -= d;
      this.vida -= d;
      this.ultimoGolpeBloqueado = false;
      this.parpadeo = 0.08;
      if (this.vidaCabeza <= 0) { this.vida = 0; this.cambiarEstado('muriendo'); return true; }
    }
    return false;
  }

  actualizar(dt, jugador, otros, mundo, ctx) {
    this.tiempoEstado += dt;
    this.parpadeo -= dt;
    this.enfriar(dt);
    const m = this.modelo;
    m.matCuerpo.emissive.setHex(this.parpadeo > 0 ? 0x4a3a6a : 0x15111e);
    m.matSaco.color.setRGB(0.6 + Math.sin(this.tiempoEstado * 5) * 0.15, 1, 0.42);

    // Sacos que acaban de reventar
    while (this.reventadosPendientes.length) {
      const i = this.reventadosPendientes.shift();
      const pos = new THREE.Vector3();
      m.sacos[i].getWorldPosition(pos);
      m.sacos[i].visible = false;
      m.hitSacos[i].userData.apagada = true;
      ctx.efectos.muerteAlien(pos, true, 1.6);
      ctx.sonido.reproducir('sacoRevienta', { x: this.posicion.x, z: this.posicion.z });
      ctx.gestor.crearCharco(pos.x, pos.z, 2.5, 8);
      if (this.sacosVivos === 0) {
        m.hitCabeza.userData.apagada = false;
        this.aviso = '¡SIN SACOS! DISPÁRALE A LA CABEZA';
        ctx.sonido.reproducir('nucleoExpuesto');
      } else {
        this.aviso = `¡SACO REVENTADO! Quedan ${this.sacosVivos}`;
      }
    }

    if (this.estado === 'muriendo') { this.animarMuerte(dt, ctx); return; }

    if (this.estado === 'apareciendo') {
      if (this.salto) {
        // Salta en arco desde el maizal y cae en la vía, delante de la camioneta
        const S = this.salto;
        const p = Math.min(1, this.tiempoEstado / S.tiempo);
        const x = S.desde.x + (this.posicion.x - S.desde.x) * p;
        const z = S.desde.z + (this.posicion.z - S.desde.z) * p;
        this.grupo.position.set(x, 4 * S.altura * p * (1 - p), z);
        this.grupo.rotation.y = Math.atan2(-(jugador.posicion.x - x), -(jugador.posicion.z - z));
        // Brazos arriba en el aire, listos para el golpe
        this.modelo.brazos.forEach((br) => { br.rotation.x = -2.4 * Math.sin(p * Math.PI); });
        if (p >= 1) {
          this.modelo.brazos.forEach((br) => { br.rotation.x = 0.4; });
          ctx.gestor.onda(this.posicion.x, this.posicion.z, 10, 0, jugador, 0x8a7a62);
          ctx.efectos.polvo(new THREE.Vector3(this.posicion.x, 0.5, this.posicion.z), 7);
          ctx.sonido.reproducir('golpeSuelo', { x: this.posicion.x, z: this.posicion.z });
          ctx.sonido.reproducir('lanzadorRugido', { x: this.posicion.x, z: this.posicion.z });
          jugador.sacudida = Math.max(jugador.sacudida, 1.2);
          this.salto = null;
          this.alAterrizar(this);
          this.cambiarEstado('caminando');
        }
        return;
      }
      if (this.caida) {
        // Cae desde el cielo y aterriza bloqueando la carretera
        const p = Math.min(1, this.tiempoEstado / this.c.tiempoAparicion);
        this.grupo.position.set(this.posicion.x, (1 - p * p) * 40, this.posicion.z);
        if (p >= 1) {
          ctx.gestor.onda(this.posicion.x, this.posicion.z, 14, 15, jugador, 0x8a7a62);
          ctx.sonido.reproducir('golpeSuelo', { x: this.posicion.x, z: this.posicion.z });
          ctx.sonido.reproducir('lanzadorRugido', { x: this.posicion.x, z: this.posicion.z });
          jugador.sacudida = Math.max(jugador.sacudida, 1);
          this.cambiarEstado('caminando');
        }
      } else if (this.tiempoEstado > 0.3) {
        this.cambiarEstado('caminando');
      }
      this.grupo.rotation.y = Math.atan2(-(jugador.posicion.x - this.posicion.x), -(jugador.posicion.z - this.posicion.z));
      return;
    }

    if (this.modo === 'acompanando') this.acompanar(dt, jugador, ctx);
    else this.pelear(dt, jugador, mundo, ctx);

    this.proximoChillido -= dt;
    if (this.proximoChillido <= 0) {
      this.proximoChillido = 7 + Math.random() * 5;
      ctx.sonido.reproducir('lanzadorRugido', { x: this.posicion.x, z: this.posicion.z });
    }
  }

  /* Mientras Rosa maneja: va por el campo, un poco adelante, y lanza cosas */
  acompanar(dt, jugador, ctx) {
    const c = this.c;
    const v = this.vehiculo;
    const objetivoZ = jugador.posicion.z - 45;
    const objetivoX = 36;
    const dz = objetivoZ - this.posicion.z, dx = objetivoX - this.posicion.x;
    const dist = Math.hypot(dx, dz);
    const rapidez = Math.min(32, dist * 1.6);
    if (dist > 0.5) {
      this.posicion.x += dx / dist * rapidez * dt;
      this.posicion.z += dz / dist * rapidez * dt;
    }
    this.grupo.position.set(this.posicion.x, 0, this.posicion.z);
    this.mirarHacia(jugador.posicion.x - this.posicion.x, jugador.posicion.z - this.posicion.z, dt, 3);
    this.fasePaso += dt * Math.max(rapidez, 1) * 0.35;
    this.animarCaminar(dt, Math.min(1.5, rapidez / 10 + 0.3));
    if (Math.sin(this.fasePaso) * Math.sin(this.fasePaso - dt * Math.max(rapidez, 1) * 0.35) < 0 && rapidez > 3) ctx.sonido.reproducir('lanzadorPaso', { x: this.posicion.x, z: this.posicion.z });

    const espera = jugador.enVehiculo ? c.esperaLanzarManejando : c.esperaLanzarManejando * 1.8;
    if (this.cooldowns.lanzar <= 0 && jugador.vivo) {
      this.cooldowns.lanzar = espera * (0.8 + Math.random() * 0.4);
      // ¿Dónde va a estar Rosa (o la camioneta) cuando caiga?
      const t = 1.7;
      const destino = jugador.posicion.clone();
      if (jugador.enVehiculo && v) destino.addScaledVector(v.adelante(), v.velocidad * t);
      destino.x = Math.max(-6, Math.min(6, destino.x + (Math.random() - 0.5) * 4));
      destino.y = 0.6;
      this.lanzarObjeto(destino, t, Math.random() < 0.35 ? 'auto' : 'roca', ctx);
    }
  }

  /* Pelea: camina hacia Rosa sin acercarse demasiado; rocas, pisotones y crías */
  pelear(dt, jugador, mundo, ctx) {
    const c = this.c;
    const m = this.modelo;
    const dx = jugador.posicion.x - this.posicion.x, dz = jugador.posicion.z - this.posicion.z;
    const distancia = Math.hypot(dx, dz);
    const rapida = this.sacosVivos === 0 ? 1.35 : 1;

    switch (this.estado) {
      case 'caminando': {
        const rapidez = distancia > 12 ? this.velocidad * rapida : 0;
        if (rapidez > 0) {
          this.posicion.x += dx / distancia * rapidez * dt;
          this.posicion.z += dz / distancia * rapidez * dt;
          resolverColisiones(this.posicion, c.radio, [], mundo.limite);
        }
        this.grupo.position.set(this.posicion.x, 0, this.posicion.z);
        this.mirarHacia(dx, dz, dt, 2);
        this.fasePaso += dt * Math.max(rapidez, 0.4) * 0.6;
        this.animarCaminar(dt, rapidez > 0 ? 1 : 0.3);
        if (!jugador.vivo) break;
        if (distancia < c.rangoPisoton + 3 && this.cooldowns.pisoton <= 0) { ctx.sonido.reproducir('lanzadorRugido', { x: this.posicion.x, z: this.posicion.z }); this.cambiarEstado('pisoton'); }
        else if (this.cooldowns.cria <= 0) this.cambiarEstado('cria');
        else if (this.cooldowns.roca <= 0) this.cambiarEstado('lanzando');
        break;
      }
      case 'lanzando': {
        const p = Math.min(1, this.tiempoEstado / 0.9);
        m.brazos[1].rotation.x = -p * 2.6;
        m.carga.visible = true;
        this.mirarHacia(dx, dz, dt, 4);
        if (p >= 1) {
          const destino = jugador.posicion.clone().addScaledVector(jugador.velocidad, c.tiempoRoca * 0.8);
          destino.y = 0.6;
          this.lanzarObjeto(destino, c.tiempoRoca, 'roca', ctx);
          m.brazos[1].rotation.x = 0.4;
          this.cooldowns.roca = c.esperaRoca / rapida;
          this.cambiarEstado('recuperando');
        }
        break;
      }
      case 'pisoton': {
        // Levanta una pierna... y la deja caer (se esquiva saltando)
        const p = Math.min(1, this.tiempoEstado / c.preparacionPisoton);
        m.piernas[0].rotation.x = -p * 0.9;
        m.cuerpo.rotation.z = p * 0.08;
        if (p >= 1) {
          m.piernas[0].rotation.x = 0;
          m.cuerpo.rotation.z = 0;
          ctx.gestor.onda(this.posicion.x, this.posicion.z, c.radioOnda, c.danioOnda, jugador, 0x8a7a62);
          ctx.sonido.reproducir('golpeSuelo', { x: this.posicion.x, z: this.posicion.z });
          if (distancia < 30) jugador.sacudida = Math.max(jugador.sacudida, 0.9);
          this.cooldowns.pisoton = c.esperaPisoton / rapida;
          this.cambiarEstado('recuperando');
        }
        break;
      }
      case 'cria': {
        // Se sacude y de su espalda caen mini zánganos
        m.torso.rotation.z = Math.sin(this.tiempoEstado * 18) * 0.06;
        if (this.tiempoEstado > 1.0) {
          m.torso.rotation.z = 0;
          for (let i = 0; i < c.criasPorVez; i++) {
            const a = Math.random() * Math.PI * 2;
            ctx.gestor.crear('minizangano', { x: this.posicion.x + Math.cos(a) * 5, y: 0, z: this.posicion.z + Math.sin(a) * 5 });
          }
          this.cooldowns.cria = c.esperaCria;
          this.cambiarEstado('recuperando');
        }
        break;
      }
      case 'recuperando': {
        m.brazos.forEach((b) => { b.rotation.x += (0 - b.rotation.x) * Math.min(1, dt * 4); });
        this.mirarHacia(dx, dz, dt, 2);
        if (this.tiempoEstado > 0.8) this.cambiarEstado('caminando');
        break;
      }
    }
  }

  /* Lanza una roca o un auto en arco (con aviso rojo en el suelo) */
  lanzarObjeto(destino, tiempo, tipo, ctx) {
    const c = this.c;
    const m = this.modelo;
    const origen = new THREE.Vector3();
    m.brazos[1].getWorldPosition(origen);
    origen.y += 4;
    let malla;
    if (tipo === 'auto') {
      const colores = [0x5a2a2a, 0x2a3a5a, 0x4a4a4a, 0x3d5a2a];
      malla = crearAutoDestruido(colores[Math.floor(Math.random() * colores.length)]).grupo;
      malla.children.forEach((h) => { h.position.y -= 0.8; });   // centrado para girar
    } else {
      malla = crearRoca();
    }
    m.carga.visible = false;
    ctx.gestor.lanzar({
      origen, destino, tiempo, gravedad: 22, malla, danio: c.danioRoca, radio: c.radioRoca, tipo, aviso: true, giro: 3,
      alCaer: (p) => this.alCaerObjeto(p, tipo)
    });
    ctx.sonido.reproducir('lanzar', { x: this.posicion.x, z: this.posicion.z });
    ctx.sonido.reproducir('alertaLanzamiento');
    setTimeout(() => { m.carga.visible = true; }, 900);
  }

  animarCaminar(dt, fuerza = 1) {
    const m = this.modelo;
    const s = Math.sin(this.fasePaso);
    m.piernas[0].rotation.x = s * 0.35 * fuerza;
    m.piernas[1].rotation.x = -s * 0.35 * fuerza;
    m.brazos[0].rotation.x += (-s * 0.3 * fuerza - m.brazos[0].rotation.x) * Math.min(1, dt * 4);
    m.cuerpo.position.y = Math.abs(Math.cos(this.fasePaso)) * 0.3 * fuerza;
  }

  /* Cae hacia atrás y se hunde */
  animarMuerte(dt, ctx) {
    const p = Math.min(1, this.tiempoEstado / this.duracionMuerte);
    this.modelo.cuerpo.rotation.x = -Math.min(1, p * 1.6) * 1.35;
    this.grupo.position.y = p > 0.6 ? -(p - 0.6) * 12 : 0;
    if (p > 0.45 && !this.caido) {
      this.caido = true;
      ctx.gestor.onda(this.posicion.x, this.posicion.z, 16, 0, { posicion: new THREE.Vector3(1e9, 0, 1e9), vivo: false }, 0x8a7a62);
      ctx.sonido.reproducir('golpeSuelo', { x: this.posicion.x, z: this.posicion.z });
    }
    if (p >= 1) this.eliminar = true;
  }
}

/* =========================================================
   GUARDIÁN DE LA NAVE
   opciones: { centro (Vector3), mundo }  el mundo se usa para
   que los generadores reciban balas y bloqueen el paso
   ========================================================= */
class Guardian extends Jefe {
  constructor(escena, punto, opciones = {}) {
    super('guardian', escena, punto, crearGuardian());
    const c = this.c;
    this.nombre = 'Guardián de la nave';
    this.colorGolpe = 0x4a3a7a;
    this.duracionMuerte = 3.5;
    this.sonidos = { chillido: 'guardianRugido', ataque: 'guardianRugido', aparece: 'jefeAparece', muere: 'guardianMuere' };
    this.centro = new THREE.Vector3(punto.x, 0, punto.z);   // centro de la plaza
    this.mundo = opciones.mundo;
    this.cooldowns = { orbes: 3, laser: 5, pisoton: 4, refuerzos: 8 };
    this.escudoActivo = true;
    this.pendientes = [];      // generadores que acaban de explotar
    this.grupo.rotation.y = 0;
    this.crearGeneradores();
    this.crearLaser();
    this.ponerEscudo(true);
  }

  get alturaCentro() { return 6; }
  get generadoresVivos() { return this.generadores.filter((g) => g.vida > 0).length; }

  get pista() {
    if (this.estado === 'apareciendo') return 'El Guardián despierta…';
    if (this.escudoActivo) return `Destruye los generadores del escudo (${this.generadoresVivos} de 3)`;
    if (this.estado === 'cargandoLaser') return '¡Láser! Sal de la línea roja';
    return '¡Escudo abajo! Dispárale al núcleo del pecho';
  }

  /* Los 3 generadores alrededor de la plaza */
  crearGeneradores() {
    this.generadores = [];
    [0.3, 2.4, 4.5].forEach((a, i) => {
      const modelo = crearGenerador();
      const x = this.centro.x + Math.cos(a) * 21, z = this.centro.z + Math.sin(a) * 21;
      modelo.grupo.position.set(x, 0, z);
      this.escena.add(modelo.grupo);
      const caja = { minX: x - 1.2, maxX: x + 1.2, minZ: z - 1.2, maxZ: z + 1.2 };
      const gen = { modelo, posicion: new THREE.Vector3(x, 0, z), vida: this.c.vidaGenerador, caja, parpadeo: 0 };
      modelo.grupo.userData.blanco = { recibirDisparo: (danio) => this.danioGenerador(gen, danio) };
      // Rayo que une el generador con el Guardián
      const rayo = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1, 6, 1, true), new THREE.MeshBasicMaterial({ color: 0xd9a8ff, transparent: true, opacity: 0.7, depthWrite: false }));
      rayo.name = 'rayo_generador';
      this.escena.add(rayo);
      gen.rayo = rayo;
      if (this.mundo) { this.mundo.solidos.push(modelo.grupo); this.mundo.colisiones.push(caja); }
      this.generadores.push(gen);
    });
  }

  danioGenerador(gen, danio) {
    if (gen.vida <= 0 || this.estado === 'apareciendo' || !this.vivo) return;
    gen.vida -= danio;
    gen.parpadeo = 0.1;
    if (gen.vida <= 0) this.pendientes.push(gen);
  }

  /* Láser: una franja roja en el suelo (aviso) y luego el rayo */
  crearLaser() {
    const c = this.c;
    const geoFranja = new THREE.PlaneGeometry(c.anchoLaser, c.largoLaser);
    geoFranja.rotateX(-Math.PI / 2);
    geoFranja.translate(0, 0, -c.largoLaser / 2);
    this.franja = new THREE.Mesh(geoFranja, new THREE.MeshBasicMaterial({ color: 0xff4d5e, transparent: true, opacity: 0.3, depthWrite: false }));
    this.franja.visible = false;
    this.escena.add(this.franja);
    const geoRayo = new THREE.BoxGeometry(0.5, 0.5, 1);
    geoRayo.translate(0, 0, 0.5);
    this.rayoLaser = new THREE.Mesh(geoRayo, new THREE.MeshBasicMaterial({ color: 0xff8ae6 }));
    this.rayoLaser.visible = false;
    this.escena.add(this.rayoLaser);
  }

  recibirDanio(cantidad, direccion, objeto) {
    this.ultimoGolpeBloqueado = true;
    this.sonidoBloqueo = 'escudoGolpe';
    if (!this.vivo || this.estado === 'apareciendo') return false;
    const zona = objeto && objeto.userData.zona;
    if (zona === 'nucleo' && !this.escudoActivo) {
      this.ultimoGolpeBloqueado = false;
      this.vida -= cantidad * this.c.multiplicadorNucleo;
      this.parpadeo = 0.08;
      if (this.vida <= 0) { this.vida = 0; this.cambiarEstado('muriendo'); this.apagarLaser(); return true; }
      return false;
    }
    if (zona === 'cuerpo') this.sonidoBloqueo = 'golpeRoca';
    return false;
  }

  ponerEscudo(activo) {
    const m = this.modelo;
    this.escudoActivo = activo;
    m.escudo.visible = activo;
    m.hitEscudo.userData.apagada = !activo;
    m.hitNucleo.userData.apagada = activo;
  }

  actualizar(dt, jugador, otros, mundo, ctx) {
    this.tiempoEstado += dt;
    this.parpadeo -= dt;
    this.enfriar(dt);
    const c = this.c;
    const m = this.modelo;
    m.matCuerpo.emissive.setHex(this.parpadeo > 0 ? this.colorGolpe : 0x0e0a1c);
    m.escudo.rotation.y += dt * 0.4;
    m.matEscudo.opacity = 0.13 + Math.sin(this.tiempoEstado * 3) * 0.04;
    m.matNucleo.color.setHSL(0.88, 1, this.escudoActivo ? 0.55 : 0.6 + Math.sin(this.tiempoEstado * 12) * 0.15);

    // Generadores: brillan, parpadean al recibir balas, explotan
    const pecho = new THREE.Vector3();
    m.nucleo.getWorldPosition(pecho);
    for (const g of this.generadores) {
      g.parpadeo -= dt;
      const vivo = g.vida > 0;
      g.modelo.cristal.rotation.y += dt * 1.5;
      g.modelo.anillo.position.y = 3 + Math.sin(this.tiempoEstado * 2 + g.posicion.x) * 0.3;
      g.modelo.matCristal.color.setHex(g.parpadeo > 0 ? 0xffffff : 0xb36bff);
      g.rayo.visible = vivo && this.vivo && this.estado !== 'apareciendo';
      if (g.rayo.visible) {
        const desde = g.posicion.clone().setY(4);
        const largo = desde.distanceTo(pecho);
        g.rayo.position.copy(desde).lerp(pecho, 0.5);
        g.rayo.scale.set(1, largo, 1);
        g.rayo.lookAt(pecho);
        g.rayo.rotateX(Math.PI / 2);
      }
    }
    while (this.pendientes.length) {
      const g = this.pendientes.shift();
      g.modelo.grupo.visible = false;
      g.caja.inactiva = true;
      if (this.mundo) { const i = this.mundo.solidos.indexOf(g.modelo.grupo); if (i >= 0) this.mundo.solidos.splice(i, 1); }
      ctx.efectos.explosion(g.posicion.clone().setY(2.5), 3.5);
      ctx.sonido.reproducir('generadorRoto', { x: g.posicion.x, z: g.posicion.z });
      if (this.generadoresVivos === 0) {
        this.ponerEscudo(false);
        this.aviso = '¡EL ESCUDO CAYÓ! DISPARA AL NÚCLEO';
        ctx.sonido.reproducir('escudoCae', { x: this.posicion.x, z: this.posicion.z });
      } else {
        this.aviso = `GENERADOR DESTRUIDO · Quedan ${this.generadoresVivos}`;
      }
    }

    if (this.estado === 'muriendo') { this.animarMuerte(dt, ctx); return; }

    if (this.estado === 'apareciendo') {
      // Sale de la tierra en medio de la plaza
      const p = Math.min(1, this.tiempoEstado / c.tiempoAparicion);
      this.grupo.position.set(this.posicion.x, -9 * (1 - p), this.posicion.z);
      if (Math.random() < 0.5) ctx.efectos.polvo(new THREE.Vector3(this.posicion.x + (Math.random() - 0.5) * 6, 0.5, this.posicion.z + (Math.random() - 0.5) * 6), 2);
      this.mirarHacia(jugador.posicion.x - this.posicion.x, jugador.posicion.z - this.posicion.z, dt, 2);
      if (p >= 1) { ctx.sonido.reproducir('guardianRugido', { x: this.posicion.x, z: this.posicion.z }); this.cambiarEstado('caminando'); }
      return;
    }

    // Fase 2: al 50 % el escudo vuelve y los generadores suben otra vez
    if (this.fase === 1 && this.vida < this.vidaMax * 0.5) {
      this.fase = 2;
      this.generadores.forEach((g) => {
        g.vida = c.vidaGeneradorFase2;
        g.modelo.grupo.visible = true;
        g.caja.inactiva = false;
        if (this.mundo && !this.mundo.solidos.includes(g.modelo.grupo)) this.mundo.solidos.push(g.modelo.grupo);
        ctx.efectos.chispas(g.posicion.clone().setY(3), 0xb36bff, 2);
      });
      this.ponerEscudo(true);
      this.apagarLaser();
      this.aviso = '¡EL ESCUDO VOLVIÓ! Destruye otra vez los generadores';
      ctx.sonido.reproducir('guardianRugido', { x: this.posicion.x, z: this.posicion.z });
      this.cooldowns.refuerzos = 0;
      this.cambiarEstado('caminando');
    }

    const dx = jugador.posicion.x - this.posicion.x, dz = jugador.posicion.z - this.posicion.z;
    const distancia = Math.hypot(dx, dz);

    switch (this.estado) {
      case 'caminando': {
        // Va hacia Rosa, pero sin salir de la plaza
        let rapidez = distancia > 9 ? this.velocidad : 0;
        const siguiente = this.posicion.clone();
        if (rapidez > 0) {
          siguiente.x += dx / distancia * rapidez * dt;
          siguiente.z += dz / distancia * rapidez * dt;
          if (siguiente.distanceTo(this.centro) > c.radioPlaza) rapidez = 0;
          else this.posicion.copy(siguiente);
        }
        this.grupo.position.set(this.posicion.x, 0, this.posicion.z);
        this.mirarHacia(dx, dz, dt, 2);
        this.fasePaso += dt * Math.max(rapidez, 0.5) * 1.2;
        this.animarCaminar(dt, rapidez > 0 ? 1 : 0.3);
        if (!jugador.vivo) break;
        if (this.cooldowns.refuerzos <= 0) this.llamarRefuerzos(ctx);
        if (distancia < c.rangoPisoton && this.cooldowns.pisoton <= 0) this.cambiarEstado('pisoton');
        else if (!this.escudoActivo && this.cooldowns.laser <= 0) this.empezarLaser(jugador, ctx);
        else if (this.cooldowns.orbes <= 0) this.cambiarEstado('orbes');
        break;
      }
      case 'orbes': {
        // Levanta el cañón y dispara varias bolas en arco
        const p = Math.min(1, this.tiempoEstado / 0.8);
        m.brazos[0].rotation.x = -p * 1.4;
        this.mirarHacia(dx, dz, dt, 4);
        if (p >= 1) {
          const salida = new THREE.Vector3();
          m.salidaOrbes.getWorldPosition(salida);
          for (let i = 0; i < c.orbesPorVez; i++) {
            const destino = jugador.posicion.clone().addScaledVector(jugador.velocidad, 0.8);
            if (i > 0) { destino.x += (Math.random() - 0.5) * 9; destino.z += (Math.random() - 0.5) * 9; }
            destino.y = 0.4;
            ctx.gestor.lanzar({ origen: salida.clone(), destino, tiempo: c.tiempoOrbe + i * 0.15, gravedad: 16, malla: crearOrbe(), danio: c.danioOrbe, radio: c.radioOrbe, tipo: 'orbe', aviso: true, giro: 2 });
          }
          ctx.sonido.reproducir('orbe', { x: this.posicion.x, z: this.posicion.z });
          this.cooldowns.orbes = c.esperaOrbes * (this.escudoActivo ? 1 : 1.4);
          this.cambiarEstado('recuperando');
        }
        break;
      }
      case 'cargandoLaser': {
        // La franja roja se marca cada vez más fuerte
        const p = Math.min(1, this.tiempoEstado / c.cargaLaser);
        this.franja.material.opacity = 0.15 + p * 0.45;
        if (p >= 1) {
          this.franja.visible = false;
          this.rayoLaser.visible = true;
          this.laserGolpeo = false;
          ctx.sonido.reproducir('laser', { x: this.posicion.x, z: this.posicion.z });
          this.cambiarEstado('disparandoLaser');
        }
        break;
      }
      case 'disparandoLaser': {
        // Rayo desde el visor hasta el suelo a lo largo de la franja
        const ojo = new THREE.Vector3();
        m.cabeza.getWorldPosition(ojo);
        const fin = this.posicion.clone().addScaledVector(this.dirLaser, c.largoLaser);
        this.rayoLaser.position.copy(ojo);
        this.rayoLaser.scale.set(1 + Math.random() * 0.3, 1 + Math.random() * 0.3, ojo.distanceTo(fin));
        this.rayoLaser.lookAt(fin);
        if (Math.random() < 0.6) ctx.efectos.chispas(this.posicion.clone().addScaledVector(this.dirLaser, Math.random() * c.largoLaser).setY(0.3), 0xff8ae6);
        // ¿Rosa está sobre la franja?
        const rel = jugador.posicion.clone().sub(this.posicion);
        const alo = rel.dot(this.dirLaser);   // qué tan adelante del Guardián está Rosa
        if (!this.laserGolpeo && jugador.vivo && alo > 0 && alo < c.largoLaser) {
          const lateral = Math.abs(rel.x * this.dirLaser.z - rel.z * this.dirLaser.x);
          if (lateral < c.anchoLaser / 2 + 0.4) { this.laserGolpeo = true; ctx.alAtacar(this, c.danioLaser); }
        }
        if (this.tiempoEstado > c.duracionLaser) {
          this.apagarLaser();
          this.cooldowns.laser = c.esperaLaser;
          this.cambiarEstado('recuperando');
        }
        break;
      }
      case 'pisoton': {
        const p = Math.min(1, this.tiempoEstado / c.preparacionPisoton);
        m.piernas[1].rotation.x = -p * 1.0;
        this.mirarHacia(dx, dz, dt, 3);
        if (p >= 1) {
          m.piernas[1].rotation.x = 0;
          ctx.gestor.onda(this.posicion.x, this.posicion.z, c.radioOnda, c.danioOnda, jugador, 0xb36bff);
          ctx.sonido.reproducir('golpeSuelo', { x: this.posicion.x, z: this.posicion.z });
          jugador.sacudida = Math.max(jugador.sacudida, 0.8);
          this.cooldowns.pisoton = c.esperaPisoton;
          this.cambiarEstado('recuperando');
        }
        break;
      }
      case 'recuperando': {
        m.brazos.forEach((b) => { b.rotation.x += (0 - b.rotation.x) * Math.min(1, dt * 4); });
        this.mirarHacia(dx, dz, dt, 2);
        if (this.tiempoEstado > 0.9) this.cambiarEstado('caminando');
        break;
      }
    }

    this.proximoChillido -= dt;
    if (this.proximoChillido <= 0) {
      this.proximoChillido = 8 + Math.random() * 5;
      ctx.sonido.reproducir('guardianRugido', { x: this.posicion.x, z: this.posicion.z });
    }
  }

  empezarLaser(jugador, ctx) {
    this.dirLaser = new THREE.Vector3(jugador.posicion.x - this.posicion.x, 0, jugador.posicion.z - this.posicion.z).normalize();
    this.franja.position.set(this.posicion.x, 0.08, this.posicion.z);
    this.franja.rotation.y = Math.atan2(-this.dirLaser.x, -this.dirLaser.z);
    this.franja.material.opacity = 0.15;
    this.franja.visible = true;
    this.grupo.rotation.y = this.franja.rotation.y;
    ctx.sonido.reproducir('laserCarga', { x: this.posicion.x, z: this.posicion.z });
    this.cambiarEstado('cargandoLaser');
  }

  apagarLaser() {
    if (this.franja) this.franja.visible = false;
    if (this.rayoLaser) this.rayoLaser.visible = false;
  }

  llamarRefuerzos(ctx) {
    this.cooldowns.refuerzos = this.c.esperaRefuerzos;
    const tipos = this.fase === 2 ? ['soldadoAlien', 'soldadoAlien', 'zangano', 'bruto'] : ['soldadoAlien', 'zangano', 'zangano'];
    tipos.forEach((t, i) => {
      const a = Math.random() * Math.PI * 2;
      ctx.gestor.crear(t, { x: this.centro.x + Math.cos(a) * 26, y: 0, z: this.centro.z + Math.sin(a) * 26 });
    });
  }

  animarCaminar(dt, fuerza = 1) {
    const m = this.modelo;
    const s = Math.sin(this.fasePaso);
    m.piernas[0].rotation.x = s * 0.3 * fuerza;
    m.piernas[1].rotation.x = -s * 0.3 * fuerza;
    m.brazos[1].rotation.x += (s * 0.25 * fuerza - m.brazos[1].rotation.x) * Math.min(1, dt * 4);
    m.cuerpo.position.y = Math.abs(Math.cos(this.fasePaso)) * 0.15 * fuerza;
  }

  /* Se arrodilla, el núcleo explota varias veces y se hunde */
  animarMuerte(dt, ctx) {
    const m = this.modelo;
    const p = Math.min(1, this.tiempoEstado / this.duracionMuerte);
    m.escudo.visible = false;
    this.generadores.forEach((g) => { g.rayo.visible = false; });
    m.cuerpo.position.y = -Math.min(1, p * 2) * 1.6;
    m.torso.rotation.x = Math.min(1, p * 2) * 0.5;
    this.explosionesHechas = this.explosionesHechas || 0;
    if (p > this.explosionesHechas * 0.2 && this.explosionesHechas < 5) {
      this.explosionesHechas++;
      const pos = new THREE.Vector3();
      m.nucleo.getWorldPosition(pos);
      pos.x += (Math.random() - 0.5) * 3; pos.y += (Math.random() - 0.5) * 3; pos.z += (Math.random() - 0.5) * 2;
      ctx.efectos.explosion(pos, 3);
      ctx.sonido.reproducir('explosion', { x: pos.x, z: pos.z });
    }
    if (p > 0.75) this.grupo.position.y = -(p - 0.75) * 30;
    if (p >= 1) this.eliminar = true;
  }

  quitar(escena) {
    super.quitar(escena);
    this.generadores.forEach((g) => {
      escena.remove(g.modelo.grupo);
      escena.remove(g.rayo);
      g.caja.inactiva = true;
      if (this.mundo) {
        const i = this.mundo.solidos.indexOf(g.modelo.grupo);
        if (i >= 0) this.mundo.solidos.splice(i, 1);
        const j = this.mundo.colisiones.indexOf(g.caja);
        if (j >= 0) this.mundo.colisiones.splice(j, 1);
      }
    });
    escena.remove(this.franja, this.rayoLaser);
  }
}

registrarEnemigo('lanzador', Lanzador);
registrarEnemigo('guardian', Guardian);
