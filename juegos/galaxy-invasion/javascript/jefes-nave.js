/* =========================================================
   GALAXY INVASION — jefes-nave.js  (v0.7)
   ETAPA 4 · EL CAPITÁN DE LA NAVE
   Flota por la cabina con su báculo de energía. Su armadura
   deja pasar muy poco daño: hay que dispararle a la GEMA del
   pecho cuando brilla (después de embestir o de una ráfaga).

   Estados:
     apareciendo -> flotando -> (rafaga | teleport | preparandoEmbestida | lluvia)
     preparandoEmbestida (franja roja en el piso) -> embestida -> aturdido (gema abierta)
     rafaga (5 tiros de plasma) -> recuperando (gema abierta un ratito)
   Fase 2 (menos del 50 %): lluvia de orbes en arco y refuerzos.
   ========================================================= */

import * as THREE from 'three';
import { registrarEnemigo } from './enemigos.js';
import { Jefe } from './jefes.js';
import { crearCapitan } from './modelos-nave.js';
import { crearPlasma, crearOrbe } from './modelos-ciudad.js';
import { resolverColisiones } from './mundo.js';

const RADIO_ARENA = 22;     // no se aleja más que esto del centro de la cabina

class Capitan extends Jefe {
  constructor(escena, punto, opciones = {}) {
    super('capitan', escena, punto, crearCapitan());
    this.nombre = 'El Capitán';
    this.colorGolpe = 0x6a3a9a;
    this.duracionMuerte = 3.2;
    this.sonidos = { chillido: 'capitanRisa', ataque: 'capitanRisa', aparece: 'jefeAparece', muere: 'capitanMuere' };
    this.sonidoBloqueo = 'escudoGolpe';
    this.mundo = opciones.mundo;
    this.centro = opciones.centro ? opciones.centro.clone() : new THREE.Vector3(punto.x, 0, punto.z);
    this.cooldowns = { rafaga: 2, teleport: 5, embestida: 4, lluvia: 4, refuerzos: 10 };
    this.gemaAbierta = 0;          // segundos que le quedan a la gema brillando
    this.disparosHechos = 0;
    this.altura = 0.5;             // flota sobre el piso
    this.grupo.rotation.y = 0;
    this.direccion = new THREE.Vector3();
    this.destinoTeleport = new THREE.Vector3();
    this.lado = 1;                 // hacia qué lado se mueve en círculos
    this.crearFranja();
    this.ponerGema(false);
  }

  get alturaCentro() { return 2.6; }

  get pista() {
    if (this.estado === 'apareciendo') return 'El Capitán baja de su silla…';
    if (this.gemaAbierta > 0) return '¡La gema brilla! ¡Dispárale al pecho!';
    if (this.estado === 'preparandoEmbestida') return '¡Va a embestir! Sal de la línea roja';
    if (this.estado === 'teleport') return '¡Se teletransporta!';
    if (this.fase === 2) return 'Esquiva los orbes y espera a que la gema brille';
    return 'Su armadura es dura: espera a que embista y dispárale a la gema';
  }

  /* Franja roja en el piso: por dónde va a embestir */
  crearFranja() {
    const geo = new THREE.PlaneGeometry(2.2, 1);
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, 0, -0.5);
    this.franja = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xff4d5e, transparent: true, opacity: 0.3, depthWrite: false }));
    this.franja.visible = false;
    this.escena.add(this.franja);
  }

  ponerGema(abierta) {
    this.modelo.hitGema.userData.apagada = !abierta;
  }

  abrirGema(segundos) {
    this.gemaAbierta = segundos;
    this.ponerGema(true);
  }

  recibirDanio(cantidad, direccion, objeto) {
    this.ultimoGolpeBloqueado = true;
    if (!this.vivo || this.estado === 'apareciendo' || this.estado === 'teleport') return false;
    const enGema = objeto && objeto.userData.zona === 'nucleo' && this.gemaAbierta > 0;
    this.ultimoGolpeBloqueado = !enGema;
    this.vida -= enGema ? cantidad * this.c.multiplicadorGema : cantidad * this.c.danioCuerpo;
    this.parpadeo = 0.08;
    if (this.vida <= 0) { this.vida = 0; this.cambiarEstado('muriendo'); this.franja.visible = false; return true; }
    return false;
  }

  /* Mueve al Capitán sin atravesar columnas ni salir de la cabina */
  mover(dx, dz) {
    const siguiente = this.posicion.clone();
    siguiente.x += dx;
    siguiente.z += dz;
    const off = siguiente.clone().sub(this.centro).setY(0);
    if (off.length() > RADIO_ARENA) off.setLength(RADIO_ARENA);
    siguiente.copy(this.centro).add(off);
    if (this.mundo) resolverColisiones(siguiente, this.c.radio, this.mundo.colisiones, this.mundo.limite);
    this.posicion.copy(siguiente);
  }

  actualizar(dt, jugador, otros, mundo, ctx) {
    this.tiempoEstado += dt;
    this.parpadeo -= dt;
    this.enfriar(dt);
    const c = this.c;
    const m = this.modelo;
    const t = this.tiempoEstado;

    // Gema: brilla fuerte cuando está abierta
    if (this.gemaAbierta > 0) {
      this.gemaAbierta -= dt;
      m.matGema.color.setHSL(0.86, 1, 0.55 + Math.sin(performance.now() / 60) * 0.15);
      m.gema.scale.setScalar(0.28 * (1.2 + Math.sin(performance.now() / 90) * 0.15));
      if (this.gemaAbierta <= 0) { this.ponerGema(false); m.gema.scale.set(0.28, 0.28, 0.18); }
    } else {
      m.matGema.color.setHex(0x6a4a8a);
    }
    m.matCuerpo.emissive.setHex(this.parpadeo > 0 ? this.colorGolpe : 0x1c1232);
    // Flota: sube y baja, la capa se mueve
    const flotar = Math.sin(performance.now() / 500) * 0.15;
    m.capa.rotation.x = 0.12 + Math.sin(performance.now() / 300) * 0.08;

    if (this.estado === 'muriendo') { this.animarMuerte(dt, ctx); return; }

    if (this.estado === 'apareciendo') {
      // Baja flotando desde el techo
      const p = Math.min(1, t / c.tiempoAparicion);
      this.grupo.position.set(this.posicion.x, this.altura + 6 * (1 - p), this.posicion.z);
      this.mirarHacia(jugador.posicion.x - this.posicion.x, jugador.posicion.z - this.posicion.z, dt, 3);
      if (Math.random() < 0.3) ctx.efectos.chispas(this.posicion.clone().setY(this.grupo.position.y + 1), 0x5dff9b);
      if (p >= 1) { ctx.sonido.reproducir('capitanRisa', { x: this.posicion.x, z: this.posicion.z }); this.cambiarEstado('flotando'); }
      return;
    }

    // Fase 2: al 50 % se enoja
    if (this.fase === 1 && this.vida < this.vidaMax * 0.5) {
      this.fase = 2;
      this.aviso = '¡EL CAPITÁN SE ENFURECE!';
      ctx.sonido.reproducir('capitanRisa', { x: this.posicion.x, z: this.posicion.z });
      this.cooldowns.lluvia = 0.5;
      this.cooldowns.refuerzos = 0;
      this.velocidad *= 1.25;
    }

    const dx = jugador.posicion.x - this.posicion.x, dz = jugador.posicion.z - this.posicion.z;
    const distancia = Math.hypot(dx, dz) || 0.001;

    switch (this.estado) {
      case 'flotando': {
        // Se mantiene a unos 11 m de Rosa, dando vueltas a su alrededor
        const ideal = 11;
        const acercar = (distancia - ideal) * 0.6;
        const vx = (dx / distancia) * acercar + (-dz / distancia) * this.lado * this.velocidad;
        const vz = (dz / distancia) * acercar + (dx / distancia) * this.lado * this.velocidad;
        const largo = Math.hypot(vx, vz);
        const tope = this.velocidad * 1.4;
        const k = largo > tope ? tope / largo : 1;
        this.mover(vx * k * dt, vz * k * dt);
        if (Math.random() < dt * 0.3) this.lado *= -1;
        this.mirarHacia(dx, dz, dt, 4);
        if (!jugador.vivo) break;
        if (this.fase === 2 && this.cooldowns.refuerzos <= 0) this.llamarRefuerzos(ctx);
        if (this.cooldowns.embestida <= 0 && distancia < 26) this.empezarEmbestida(jugador, ctx);
        else if (this.fase === 2 && this.cooldowns.lluvia <= 0) this.cambiarEstado('lluvia');
        else if (this.cooldowns.teleport <= 0 && (distancia < 6 || Math.random() < 0.4)) this.empezarTeleport(jugador, ctx);
        else if (this.cooldowns.rafaga <= 0) { this.disparosHechos = 0; this.cambiarEstado('rafaga'); }
        break;
      }
      case 'rafaga': {
        // Levanta el báculo y dispara varios tiros de plasma seguidos
        m.brazos[1].rotation.x = -Math.min(1, t / 0.4) * 1.3;
        this.mirarHacia(dx, dz, dt, 6);
        const tocaDisparo = 0.45 + this.disparosHechos * c.entreDisparos;
        if (t >= tocaDisparo && this.disparosHechos < c.disparosRafaga) {
          this.disparosHechos++;
          const origen = new THREE.Vector3();
          m.salidaPlasma.getWorldPosition(origen);
          const destino = jugador.posicion.clone().addScaledVector(jugador.velocidad, 0.25);
          destino.y = jugador.posicion.y + 1.1;
          destino.x += (Math.random() - 0.5) * 1.5;
          destino.z += (Math.random() - 0.5) * 1.5;
          ctx.gestor.lanzar({ origen, direccion: destino.sub(origen), velocidad: c.velocidadPlasma, malla: crearPlasma(), danio: c.danioPlasma, radio: 0.6, tipo: 'plasma', vidaMax: 2.5 });
          ctx.sonido.reproducir('plasmaDisparo', { x: this.posicion.x, z: this.posicion.z });
        }
        if (this.disparosHechos >= c.disparosRafaga && t > tocaDisparo + 0.2) {
          this.cooldowns.rafaga = c.esperaRafaga;
          this.abrirGema(1.4);          // tras la ráfaga, la gema queda abierta un momento
          this.cambiarEstado('recuperando');
        }
        break;
      }
      case 'teleport': {
        // Se encoge en chispas, aparece en otro lado y vuelve a crecer
        const mitad = c.duracionTeleport / 2;
        if (t < mitad) {
          this.grupo.scale.setScalar(Math.max(0.05, 1 - t / mitad));
        } else {
          if (!this.yaSalto) {
            this.yaSalto = true;
            ctx.efectos.chispas(this.posicion.clone().setY(2), 0x5dff9b, 2);
            this.posicion.copy(this.destinoTeleport);
            ctx.efectos.chispas(this.posicion.clone().setY(2), 0x5dff9b, 2);
          }
          this.grupo.scale.setScalar(Math.min(1, (t - mitad) / mitad));
          this.mirarHacia(dx, dz, dt, 10);
        }
        if (t >= c.duracionTeleport) {
          this.grupo.scale.setScalar(1);
          this.cooldowns.teleport = c.esperaTeleport;
          this.cooldowns.rafaga = Math.min(this.cooldowns.rafaga, 0.4);   // casi siempre dispara al aparecer
          this.cambiarEstado('flotando');
        }
        break;
      }
      case 'preparandoEmbestida': {
        // La franja roja se marca cada vez más fuerte; el báculo apunta
        const p = Math.min(1, t / c.preparacionEmbestida);
        this.franja.material.opacity = 0.15 + p * 0.45;
        m.brazos[1].rotation.x = -p * 1.5;
        m.punta.scale.setScalar(0.2 * (1 + p));
        if (p >= 1) {
          this.franja.visible = false;
          this.golpeoEmbestida = false;
          ctx.sonido.reproducir('embestida', { x: this.posicion.x, z: this.posicion.z });
          this.cambiarEstado('embestida');
        }
        break;
      }
      case 'embestida': {
        // Sale disparado en línea recta dejando chispas
        const paso = c.velocidadEmbestida * dt;
        const antes = this.posicion.clone();
        this.mover(this.direccion.x * paso, this.direccion.z * paso);
        if (Math.random() < 0.7) ctx.efectos.chispas(this.posicion.clone().setY(1.5), 0xb36bff);
        if (!this.golpeoEmbestida && jugador.vivo && Math.hypot(jugador.posicion.x - this.posicion.x, jugador.posicion.z - this.posicion.z) < 1.9) {
          this.golpeoEmbestida = true;
          ctx.alAtacar(this, c.danioEmbestida);
          jugador.sacudida = Math.max(jugador.sacudida, 0.8);
        }
        const choco = antes.distanceTo(this.posicion) < paso * 0.3;   // se frenó contra algo
        if (t > c.duracionEmbestida || choco) {
          if (choco) { ctx.sonido.reproducir('choqueFuerte', { x: this.posicion.x, z: this.posicion.z }); ctx.efectos.polvo(this.posicion.clone().setY(1), 2); }
          m.punta.scale.setScalar(0.2);
          this.cooldowns.embestida = c.esperaEmbestida;
          this.abrirGema(c.tiempoGemaAbierta);
          this.aviso = '¡LA GEMA BRILLA! DISPARA AL PECHO';
          this.cambiarEstado('aturdido');
        }
        break;
      }
      case 'aturdido': {
        // Mareado: se queda quieto con la gema brillando
        m.torso.rotation.z = Math.sin(t * 6) * 0.15;
        m.brazos.forEach((b) => { b.rotation.x += (0.5 - b.rotation.x) * Math.min(1, dt * 4); });
        if (t > c.tiempoGemaAbierta) { m.torso.rotation.z = 0; this.cambiarEstado('flotando'); }
        break;
      }
      case 'lluvia': {
        // Levanta los brazos y llueven orbes alrededor de Rosa
        const p = Math.min(1, t / 0.9);
        m.brazos.forEach((b) => { b.rotation.x = -p * 2.6; });
        this.mirarHacia(dx, dz, dt, 4);
        if (p >= 1) {
          const salida = new THREE.Vector3();
          m.salidaPlasma.getWorldPosition(salida);
          for (let i = 0; i < c.orbesLluvia; i++) {
            const destino = jugador.posicion.clone().addScaledVector(jugador.velocidad, 0.6);
            if (i > 0) { const a = (i / c.orbesLluvia) * Math.PI * 2; destino.x += Math.cos(a) * 4.5; destino.z += Math.sin(a) * 4.5; }
            destino.y = 0.4;
            ctx.gestor.lanzar({ origen: salida.clone(), destino, tiempo: c.tiempoOrbe + i * 0.08, gravedad: 14, malla: crearOrbe(), danio: c.danioOrbe, radio: c.radioOrbe, tipo: 'orbe', aviso: true, giro: 2 });
          }
          ctx.sonido.reproducir('orbe', { x: this.posicion.x, z: this.posicion.z });
          this.cooldowns.lluvia = c.esperaLluvia;
          this.abrirGema(1.6);
          this.cambiarEstado('recuperando');
        }
        break;
      }
      case 'recuperando': {
        m.brazos.forEach((b) => { b.rotation.x += (0 - b.rotation.x) * Math.min(1, dt * 4); });
        this.mirarHacia(dx, dz, dt, 3);
        if (t > 0.9) this.cambiarEstado('flotando');
        break;
      }
    }

    this.grupo.position.set(this.posicion.x, this.altura + flotar, this.posicion.z);

    this.proximoChillido -= dt;
    if (this.proximoChillido <= 0) {
      this.proximoChillido = 9 + Math.random() * 5;
      ctx.sonido.reproducir('capitanRisa', { x: this.posicion.x, z: this.posicion.z });
    }
  }

  empezarEmbestida(jugador, ctx) {
    this.direccion.set(jugador.posicion.x - this.posicion.x, 0, jugador.posicion.z - this.posicion.z).normalize();
    const largo = this.c.velocidadEmbestida * this.c.duracionEmbestida;
    this.franja.position.set(this.posicion.x, 0.06, this.posicion.z);
    this.franja.rotation.y = Math.atan2(-this.direccion.x, -this.direccion.z);
    this.franja.scale.set(1, 1, largo);
    this.franja.material.opacity = 0.15;
    this.franja.visible = true;
    this.grupo.rotation.y = this.franja.rotation.y;
    ctx.sonido.reproducir('laserCarga', { x: this.posicion.x, z: this.posicion.z });
    this.cambiarEstado('preparandoEmbestida');
  }

  /* Elige un punto de la cabina lejos de Rosa y empieza a desaparecer */
  empezarTeleport(jugador, ctx) {
    let mejor = null;
    for (let i = 0; i < 8; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 6 + Math.random() * (RADIO_ARENA - 8);
      const p = new THREE.Vector3(this.centro.x + Math.cos(a) * r, 0, this.centro.z + Math.sin(a) * r);
      if (this.mundo) resolverColisiones(p, this.c.radio, this.mundo.colisiones, this.mundo.limite);
      const d = p.distanceTo(jugador.posicion);
      if (d > 9 && (!mejor || Math.abs(d - 13) < Math.abs(mejor.d - 13))) mejor = { p, d };
    }
    if (!mejor) { this.cooldowns.teleport = 2; return; }
    this.destinoTeleport.copy(mejor.p);
    this.yaSalto = false;
    ctx.sonido.reproducir('teletransporte', { x: this.posicion.x, z: this.posicion.z });
    this.cambiarEstado('teleport');
  }

  llamarRefuerzos(ctx) {
    this.cooldowns.refuerzos = this.c.esperaRefuerzos;
    const puntos = this.mundo && this.mundo.puntosAparicion.cabina;
    ['soldadoAlien', 'zangano', 'soldadoAlien'].forEach((tipo, i) => {
      const p = puntos ? puntos[(i * 2 + Math.floor(Math.random() * 2)) % puntos.length] : this.centro;
      ctx.gestor.crear(tipo, { x: p.x, y: 0, z: p.z });
    });
  }

  /* Gira, echa chispas, explota varias veces y cae */
  animarMuerte(dt, ctx) {
    const m = this.modelo;
    const p = Math.min(1, this.tiempoEstado / this.duracionMuerte);
    this.grupo.rotation.y += dt * (2 + p * 10);
    this.grupo.position.y = Math.max(0, (this.altura + 1.5 * Math.sin(p * Math.PI)) * (1 - p));
    m.matGema.color.setHex(Math.random() < 0.5 ? 0xffffff : 0xff5ad1);
    this.explosionesHechas = this.explosionesHechas || 0;
    if (p > this.explosionesHechas * 0.22 && this.explosionesHechas < 5) {
      this.explosionesHechas++;
      const pos = this.posicion.clone().setY(1.5 + Math.random() * 2);
      pos.x += (Math.random() - 0.5) * 1.5; pos.z += (Math.random() - 0.5) * 1.5;
      ctx.efectos.explosion(pos, 2.5);
      ctx.sonido.reproducir('explosion', { x: pos.x, z: pos.z });
    }
    if (p > 0.8) this.grupo.scale.setScalar(Math.max(0.01, (1 - p) * 5));
    if (p >= 1) this.eliminar = true;
  }

  quitar(escena) {
    super.quitar(escena);
    escena.remove(this.franja);
  }
}

registrarEnemigo('capitan', Capitan);
