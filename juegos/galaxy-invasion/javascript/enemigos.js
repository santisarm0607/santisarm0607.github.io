/* =========================================================
   GALAXY INVASION — enemigos.js
   Los aliens normales y todo lo que lanzan:
     - Zángano / Mini zángano (ciudad y carretera): corre y muerde.
   - Soldado alien y Bruto: en enemigos-ciudad.js.
     - Babosito (granja): pequeño y rápido; al morir deja un charco de baba.
     - Babosón  (granja): grande y lento; escupe bolas de baba y golpea de cerca.
   Estados: apareciendo -> persiguiendo -> preparando (aviso) -> ataque
            -> persiguiendo ... -> muriendo
   Los JEFES están en jefes.js (usan la clase Enemigo de aquí).

   El gestor también maneja:
     - proyectiles en arco o en línea recta (baba, pacas, rocas, plasma)
     - avisos rojos en el suelo (dónde va a caer algo)
     - ondas de choque (se esquivan saltando)
     - explosiones (barriles) y charcos de baba
   ========================================================= */

import * as THREE from 'three';
import { CONFIG } from './config.js';
import { crearZangano } from './modelos.js';
import { crearBabosito, crearBaboson, crearEscupitajo, crearCharco } from './modelos-granja.js';
import { resolverColisiones } from './mundo.js';

/* =========================================================
   BASE: lo que todos los aliens hacen igual
   ========================================================= */
export class Enemigo {
  constructor(tipo, escena, punto, modelo) {
    this.tipo = tipo;
    this.c = CONFIG.enemigos[tipo];
    this.modelo = modelo;
    this.grupo = modelo.grupo;
    this.grupo.position.set(punto.x, -1.5, punto.z);
    this.grupo.rotation.y = Math.random() * Math.PI * 2;
    // Cajas que reciben los disparos (los jefes tienen varias)
    this.hitboxes = modelo.hitboxes || [modelo.hitbox];
    this.hitboxes.forEach((h) => { h.userData.enemigo = this; });
    escena.add(this.grupo);

    this.posicion = new THREE.Vector3(punto.x, 0, punto.z);
    this.vida = this.c.vida;
    this.vidaMax = this.c.vida;
    this.estado = 'apareciendo';
    this.tiempoEstado = 0;
    this.esperaAtaque = 0.5;
    this.fasePaso = Math.random() * 10;
    this.parpadeo = 0;
    this.empuje = new THREE.Vector3();
    this.ultimaPos = this.posicion.clone();
    this.tiempoAtascado = 0;
    this.esquivar = 0;
    this.ladoEsquivar = 1;
    this.proximoChillido = 2 + Math.random() * 5;
    this.eliminar = false;
    this.velocidad = this.c.velocidad * (0.9 + Math.random() * 0.2);
    this.colorGolpe = 0x2a8a55;
    this.colorNormal = modelo.matCuerpo.emissive.getHex();
    this.duracionMuerte = 0.45;
  }

  get vivo() { return this.estado !== 'muriendo'; }

  /* Altura a la que apunta la ayuda de puntería (centro del cuerpo) */
  get alturaCentro() { return this.hitboxes[0].position.y; }

  cambiarEstado(nuevo) {
    this.estado = nuevo;
    this.tiempoEstado = 0;
  }

  /* Recibe daño. objeto = la caja que recibió la bala (los jefes la usan).
     Devuelve true si murió */
  recibirDanio(cantidad, direccion, objeto) {
    if (!this.vivo || (this.estado === 'apareciendo' && this.tiempoEstado < 0.2)) return false;
    this.vida -= cantidad;
    this.parpadeo = 0.08;
    if (direccion) this.empuje.addScaledVector(direccion, 2.5 / Math.max(1, this.c.radio * 2)).setY(0);
    if (this.vida <= 0) {
      this.cambiarEstado('muriendo');
      return true;
    }
    return false;
  }

  /* Persigue un punto (normalmente al jugador). Devuelve la distancia */
  perseguir(dt, objetivo, otros, mundo, rapidez) {
    const dx = objetivo.x - this.posicion.x;
    const dz = objetivo.z - this.posicion.z;
    const distancia = Math.hypot(dx, dz) || 0.001;
    let dirX = dx / distancia, dirZ = dz / distancia;

    // Atascado detrás de algo: camina de lado un rato
    if (this.esquivar > 0) {
      this.esquivar -= dt;
      const lx = -dirZ * this.ladoEsquivar, lz = dirX * this.ladoEsquivar;
      dirX = dirX * 0.3 + lx; dirZ = dirZ * 0.3 + lz;
      const l = Math.hypot(dirX, dirZ); dirX /= l; dirZ /= l;
    }
    // Separarse de los demás aliens
    let sepX = 0, sepZ = 0;
    for (const o of otros) {
      if (o === this || !o.vivo) continue;
      const ox = this.posicion.x - o.posicion.x, oz = this.posicion.z - o.posicion.z;
      const minimo = (this.c.radio + o.c.radio) * 1.15;
      const d2 = ox * ox + oz * oz;
      if (d2 < minimo * minimo && d2 > 0.0001) { const d = Math.sqrt(d2); sepX += ox / d * (minimo - d); sepZ += oz / d * (minimo - d); }
    }
    if (distancia < (this.c.rangoAtaque || 1.5) * 0.8) rapidez = 0; // ya está encima
    // Movimiento con inercia (v0.8): acelera y frena poco a poco en vez de
    // arrancar y parar de golpe, y no cambia de dirección en seco
    if (!this.velMov) this.velMov = new THREE.Vector2();
    const suavidad = Math.min(1, dt * (this.c.agilidad || 7));
    this.velMov.x += (dirX * rapidez + sepX * 3 - this.velMov.x) * suavidad;
    this.velMov.y += (dirZ * rapidez + sepZ * 3 - this.velMov.y) * suavidad;
    this.posicion.x += (this.velMov.x + this.empuje.x) * dt;
    this.posicion.z += (this.velMov.y + this.empuje.z) * dt;
    this.empuje.multiplyScalar(Math.max(0, 1 - dt * 8));
    resolverColisiones(this.posicion, this.c.radio, mundo.colisiones, mundo.limite);

    const movido = this.posicion.distanceTo(this.ultimaPos);
    this.ultimaPos.copy(this.posicion);
    if (rapidez > 0 && movido < rapidez * dt * 0.25) {
      this.tiempoAtascado += dt;
      if (this.tiempoAtascado > 0.4) {
        this.esquivar = 0.9;
        this.ladoEsquivar = Math.random() < 0.5 ? -1 : 1;
        this.tiempoAtascado = 0;
      }
    } else {
      this.tiempoAtascado = 0;
    }
    this.grupo.position.set(this.posicion.x, 0, this.posicion.z);
    this.mirarHacia(dx, dz, dt);
    return { distancia, rapidez };
  }

  /* Gira el cuerpo hacia una dirección (la cabeza mira hacia -Z) */
  mirarHacia(dx, dz, dt, velocidadGiro = 6) {
    const objetivo = Math.atan2(-dx, -dz);
    let diferencia = objetivo - this.grupo.rotation.y;
    diferencia = Math.atan2(Math.sin(diferencia), Math.cos(diferencia));
    this.grupo.rotation.y += diferencia * Math.min(1, dt * velocidadGiro);
  }

  actualizar(dt, jugador, otros, mundo, ctx) {
    this.tiempoEstado += dt;
    this.parpadeo -= dt;
    this.modelo.matCuerpo.emissive.setHex(this.parpadeo > 0 ? this.colorGolpe : this.colorNormal);

    if (this.estado === 'apareciendo') {
      const p = Math.min(1, this.tiempoEstado / this.c.tiempoAparicion);
      this.grupo.position.set(this.posicion.x, -1.5 * (1 - p), this.posicion.z);
      if (this.modelo.cuerpo) this.modelo.cuerpo.rotation.x = (1 - p) * -0.8;
      if (p >= 1) this.cambiarEstado('persiguiendo');
      return;
    }
    if (this.estado === 'muriendo') {
      this.animarMuerte(dt);
      return;
    }
    this.comportamiento(dt, jugador, otros, mundo, ctx);

    // Chillido de vez en cuando
    this.proximoChillido -= dt;
    if (this.proximoChillido <= 0) {
      this.proximoChillido = 3 + Math.random() * 5;
      if (this.posicion.distanceTo(jugador.posicion) < 30) ctx.sonido.reproducir(this.sonidos.chillido, { x: this.posicion.x, z: this.posicion.z });
    }
  }

  animarMuerte(dt) {
    const p = this.tiempoEstado / this.duracionMuerte;
    const base = this.escalaBase || 1;
    this.grupo.scale.setScalar(Math.max(0.01, (1 - p) * base));
    this.grupo.rotation.z += dt * 6;
    if (p >= 1) this.eliminar = true;
  }

  /* Comportamiento estándar: perseguir y morder con aviso */
  comportamiento(dt, jugador, otros, mundo, ctx) {
    if (this.estado === 'preparando') {
      const p = this.tiempoEstado / this.c.preparacionAtaque;
      this.animarPreparar(Math.min(1, p));
      const dx = jugador.posicion.x - this.posicion.x, dz = jugador.posicion.z - this.posicion.z;
      this.mirarHacia(dx, dz, dt);
      if (p >= 1) {
        if (Math.hypot(dx, dz) < this.c.rangoAtaque + 0.5) ctx.alAtacar(this, this.c.danio);
        this.esperaAtaque = this.c.esperaAtaque;
        this.animarGolpe();
        this.cambiarEstado('persiguiendo');
      }
      return;
    }
    this.esperaAtaque -= dt;
    const { distancia, rapidez } = this.perseguir(dt, jugador.posicion, otros, mundo, this.velocidad);
    this.fasePaso += dt * Math.max(rapidez, 0.6) * 3.2;
    this.animarCaminar(dt);
    if (distancia < this.c.rangoAtaque && this.esperaAtaque <= 0 && jugador.vivo) {
      this.cambiarEstado('preparando');
      ctx.sonido.reproducir(this.sonidos.ataque, { x: this.posicion.x, z: this.posicion.z });
    }
  }

  animarPreparar() {}
  animarGolpe() {}
  animarCaminar() {}

  quitar(escena) {
    escena.remove(this.grupo);
    this.modelo.matCuerpo.dispose();
  }
}

/* =========================================================
   ZÁNGANO (y su versión pequeña, el Mini zángano)
   ========================================================= */
class Zangano extends Enemigo {
  constructor(escena, punto, tipo) {
    // El gestor le pasa "opciones" de 3er dato: solo vale si es texto ('minizangano')
    super(typeof tipo === 'string' ? tipo : 'zangano', escena, punto, crearZangano());
    this.escalaBase = this.c.escala || 1;
    this.grupo.scale.setScalar(this.escalaBase);
    this.sonidos = { chillido: 'alienChillido', ataque: 'alienAtaque', aparece: 'alienAparece', muere: 'alienMuere' };
  }
  get alturaCentro() { return 0.55 * this.escalaBase; }
  animarPreparar(p) {
    const m = this.modelo;
    m.cuerpo.rotation.x = Math.sin(p * Math.PI) * -0.45;
    m.mandibulas[0].rotation.z = 0.3 + p * 0.5;
    m.mandibulas[1].rotation.z = -0.3 - p * 0.5;
  }
  animarGolpe() {
    const m = this.modelo;
    m.cuerpo.rotation.x = 0.35;
    m.mandibulas[0].rotation.z = 0.3;
    m.mandibulas[1].rotation.z = -0.3;
  }
  animarCaminar(dt) {
    const m = this.modelo;
    const s = Math.sin(this.fasePaso);
    m.patas[0].rotation.x = s * 0.5; m.patas[3].rotation.x = s * 0.5;
    m.patas[1].rotation.x = -s * 0.5; m.patas[2].rotation.x = -s * 0.5;
    m.cuerpo.position.y = 0.55 + Math.abs(Math.cos(this.fasePaso)) * 0.06;
    m.cuerpo.rotation.x += (0 - m.cuerpo.rotation.x) * Math.min(1, dt * 6);
    m.cabeza.rotation.y = Math.sin(this.fasePaso * 0.5) * 0.15;
  }
}

class MiniZangano extends Zangano {
  constructor(escena, punto) { super(escena, punto, 'minizangano'); }
}

/* =========================================================
   BABOSITO
   ========================================================= */
class Babosito extends Enemigo {
  constructor(escena, punto) {
    super('babosito', escena, punto, crearBabosito());
    this.colorGolpe = 0xc8ffd0;
    this.sonidos = { chillido: 'babositoChillido', ataque: 'babositoAtaque', aparece: 'babosoAparece', muere: 'babositoMuere' };
  }
  animarPreparar(p) {
    const m = this.modelo;
    m.cuerpo.scale.set(1, 1 + p * 0.25, 1 - p * 0.2);  // se encoge como resorte
    m.boca.scale.y = 1 + p * 2;
  }
  animarGolpe() {
    const m = this.modelo;
    m.cuerpo.scale.set(1, 0.85, 1.25);
    m.boca.scale.y = 1;
  }
  animarCaminar(dt) {
    const m = this.modelo;
    // Se arrastra estirándose y encogiéndose como una babosa
    const s = Math.sin(this.fasePaso * 1.4);
    m.cuerpo.scale.x += (1 - m.cuerpo.scale.x) * Math.min(1, dt * 8);
    m.cuerpo.scale.y = 1 - s * 0.08;
    m.cuerpo.scale.z = 1 + s * 0.12;
    m.antenas[0].rotation.x = -0.35 + Math.sin(this.fasePaso) * 0.15;
    m.antenas[1].rotation.x = -0.35 + Math.cos(this.fasePaso) * 0.15;
  }
}

/* =========================================================
   BABOSÓN
   ========================================================= */
class Baboson extends Enemigo {
  constructor(escena, punto) {
    super('baboson', escena, punto, crearBaboson());
    this.colorGolpe = 0x9dffa0;
    this.esperaEscupir = 1.5 + Math.random();
    this.sonidos = { chillido: 'babosonRugido', ataque: 'babosonGolpe', aparece: 'babosoAparece', muere: 'babosonMuere' };
  }
  comportamiento(dt, jugador, otros, mundo, ctx) {
    const m = this.modelo;
    const dx = jugador.posicion.x - this.posicion.x, dz = jugador.posicion.z - this.posicion.z;
    const distancia = Math.hypot(dx, dz);

    // Escupitajo: se infla el saco y lanza la baba
    if (this.estado === 'escupiendo') {
      const p = Math.min(1, this.tiempoEstado / 0.6);
      m.saco.scale.setScalar(0.45 + p * 0.25);
      m.cabeza.rotation.x = -p * 0.4;
      this.mirarHacia(dx, dz, dt);
      if (p >= 1) {
        const boca = new THREE.Vector3();
        m.boca.getWorldPosition(boca);
        ctx.gestor.escupir(boca, jugador);
        ctx.sonido.reproducir('babosonEscupe', { x: this.posicion.x, z: this.posicion.z });
        m.saco.scale.set(0.5, 0.45, 0.45);
        m.cabeza.rotation.x = 0;
        this.esperaEscupir = this.c.esperaEscupir * (0.8 + Math.random() * 0.4);
        this.cambiarEstado('persiguiendo');
      }
      return;
    }
    if (this.estado === 'persiguiendo') {
      this.esperaEscupir -= dt;
      if (this.esperaEscupir <= 0 && distancia > this.c.escupeDesde && distancia < this.c.escupeHasta && jugador.vivo) {
        this.cambiarEstado('escupiendo');
        return;
      }
    }
    super.comportamiento(dt, jugador, otros, mundo, ctx);
  }
  animarPreparar(p) {
    const m = this.modelo;
    m.brazos.forEach((b) => { b.rotation.x = -p * 1.6; });
    m.cuerpo.rotation.x = -p * 0.2;
  }
  animarGolpe() {
    const m = this.modelo;
    m.brazos.forEach((b) => { b.rotation.x = 0.6; });
    m.cuerpo.rotation.x = 0.15;
  }
  animarCaminar(dt) {
    const m = this.modelo;
    const s = Math.sin(this.fasePaso * 0.8);
    m.cuerpo.position.y = Math.abs(s) * 0.08;
    m.cuerpo.rotation.z = s * 0.06;
    m.cuerpo.rotation.x += (0 - m.cuerpo.rotation.x) * Math.min(1, dt * 4);
    m.brazos.forEach((b, i) => { b.rotation.x += ((i ? s : -s) * 0.3 - b.rotation.x) * Math.min(1, dt * 6); });
    m.saco.scale.y = 0.45 + Math.sin(this.fasePaso * 1.5) * 0.03;
  }
}

/* Registro de tipos: los jefes y los aliens de otros archivos se agregan aquí */
const CLASES = { zangano: Zangano, minizangano: MiniZangano, babosito: Babosito, baboson: Baboson };
export function registrarEnemigo(tipo, Clase) { CLASES[tipo] = Clase; }

/* Geometrías para avisos y ondas (se crean una sola vez) */
const geoAnillo = new THREE.RingGeometry(0.82, 1, 28);
const geoDisco = new THREE.CircleGeometry(1, 28);

/* =========================================================
   GESTOR: crea, actualiza y borra a todos los aliens,
   sus proyectiles, avisos, ondas, explosiones y charcos
   ========================================================= */
export class GestorEnemigos {
  constructor(sonido) {
    this.sonido = sonido;
    this.escena = null;
    this.efectos = null;
    this.lista = [];
    this.proyectiles = [];
    this.avisos = [];
    this.ondas = [];
    this.charcos = [];
    this.jefe = null;              // el jefe que está peleando (para la barra de vida)
    this.alAtacar = () => {};      // (enemigo, danio)
    this.alMorir = () => {};       // (enemigo)
    this.alSalpicar = () => {};    // (danio, punto) daño a Rosa por proyectiles, ondas o explosiones
    this.alExplotar = () => {};    // (punto, radio) para encadenar barriles, etc.
  }

  /* Al cambiar de etapa se cambia de escena */
  usarEscena(escena, efectos) {
    this.limpiar();
    this.escena = escena;
    this.efectos = efectos;
  }

  crear(tipo, punto, opciones = {}) {
    const Clase = CLASES[tipo] || Zangano;
    const e = new Clase(this.escena, punto, opciones);
    this.lista.push(e);
    if (e.esJefe) this.jefe = e;
    if (!e.esJefe) this.efectos.aparicion(new THREE.Vector3(punto.x, 0.2, punto.z), tipo === 'babosito' || tipo === 'baboson');
    if (e.sonidos.aparece) this.sonido.reproducir(e.sonidos.aparece, { x: punto.x, z: punto.z });
    return e;
  }

  /* Todas las cajas que reciben disparos */
  objetivos() {
    const lista = [];
    for (const e of this.lista) if (e.vivo) for (const h of e.hitboxes) if (h.visible !== false && !h.userData.apagada) lista.push(h);
    return lista;
  }

  get vivos() {
    // Los nidos (v0.8) no cuentan: son "estructuras", no aliens que te persiguen
    return this.lista.filter((e) => e.vivo && !e.esJefe && !e.esEstructura).length;
  }

  get jefeVivo() {
    return !!(this.jefe && this.jefe.vivo);
  }

  vivosDe(tipo) {
    return this.lista.filter((e) => e.vivo && e.tipo === tipo).length;
  }

  /* Una bala le pegó a un alien. Devuelve true si murió */
  herir(enemigo, cantidad, punto, direccion, objeto) {
    const baba = enemigo.tipo === 'babosito' || enemigo.tipo === 'baboson';
    const resultado = enemigo.recibirDanio(cantidad, direccion, objeto);
    // Los jefes avisan si el golpe no le hizo nada (blindado / escudo)
    if (enemigo.ultimoGolpeBloqueado) {
      this.efectos.impactoPared(punto, direccion.clone().negate());
      this.sonido.reproducir(enemigo.sonidoBloqueo || 'impactoPared', { x: punto.x, z: punto.z });
    } else {
      this.efectos.impactoAlien(punto, direccion.clone().negate(), baba || enemigo.tipo === 'bestia');
      this.sonido.reproducir(baba ? 'impactoBaba' : 'impactoAlien', { x: punto.x, z: punto.z });
    }
    if (resultado) this.morir(enemigo);
    return resultado;
  }

  morir(enemigo) {
    const baba = enemigo.tipo === 'babosito' || enemigo.tipo === 'baboson';
    if (!enemigo.esJefe) {
      const centro = new THREE.Vector3(enemigo.posicion.x, 0.6, enemigo.posicion.z);
      this.efectos.muerteAlien(centro, baba, enemigo.c.radio * (enemigo.escalaBase || 1));
    }
    this.sonido.reproducir(enemigo.sonidos.muere, { x: enemigo.posicion.x, z: enemigo.posicion.z });
    if (enemigo.c.charcoAlMorir) this.crearCharco(enemigo.posicion.x, enemigo.posicion.z, enemigo.c.charcoAlMorir, enemigo.c.duracionCharco);
    this.alMorir(enemigo);
  }

  /* =========================================================
     PROYECTILES
     opciones:
       origen (Vector3), destino (Vector3) y tiempo (s)  -> en arco
       o direccion (Vector3) y velocidad (m/s)           -> en línea recta
       malla, danio, radio (de daño), gravedad, tipo ('baba', 'paca', 'roca', 'plasma')
       aviso: true para marcar en el suelo dónde cae
       alCaer(punto): se llama al caer (por ejemplo, para dejar un obstáculo)
     ========================================================= */
  lanzar(op) {
    const p = {
      malla: op.malla, danio: op.danio, radio: op.radio || 1, tipo: op.tipo || 'baba',
      gravedad: op.gravedad ?? 18, alCaer: op.alCaer, vida: op.vidaMax || 8, giro: op.giro ?? 6,
      recto: !op.destino, vel: new THREE.Vector3(), aviso: null
    };
    p.malla.position.copy(op.origen);
    this.escena.add(p.malla);
    if (op.destino) {
      const t = op.tiempo;
      p.vel.set((op.destino.x - op.origen.x) / t, 0, (op.destino.z - op.origen.z) / t);
      p.vel.y = (op.destino.y - op.origen.y + 0.5 * p.gravedad * t * t) / t;
      if (op.aviso) p.aviso = this.avisar(op.destino.x, op.destino.z, p.radio, t);
    } else {
      p.gravedad = 0;
      p.vel.copy(op.direccion).normalize().multiplyScalar(op.velocidad);
      p.malla.lookAt(op.origen.clone().add(p.vel));
    }
    this.proyectiles.push(p);
    return p;
  }

  /* Escupitajo del Babosón (apunta a donde va a estar el jugador) */
  escupir(origen, jugador) {
    const c = CONFIG.enemigos.baboson;
    const destino = jugador.posicion.clone().addScaledVector(jugador.velocidad, 0.4);
    destino.y = 0;
    const d = Math.max(1, Math.hypot(destino.x - origen.x, destino.z - origen.z));
    this.lanzar({
      origen, destino, tiempo: d / c.velocidadEscupitajo, gravedad: 18,
      malla: crearEscupitajo(), danio: c.danioEscupitajo, radio: c.radioImpacto, tipo: 'baba',
      alCaer: (p) => this.crearCharco(p.x, p.z, c.charcoEscupitajo, c.duracionCharco)
    });
  }

  /* Aviso rojo en el suelo: crece hasta que cae lo que viene */
  avisar(x, z, radio, duracion) {
    const grupo = new THREE.Group();
    const anillo = new THREE.Mesh(geoAnillo, new THREE.MeshBasicMaterial({ color: 0xff4d5e, transparent: true, opacity: 0.8, depthWrite: false }));
    const relleno = new THREE.Mesh(geoDisco, new THREE.MeshBasicMaterial({ color: 0xff4d5e, transparent: true, opacity: 0.18, depthWrite: false }));
    anillo.rotation.x = relleno.rotation.x = -Math.PI / 2;
    grupo.add(anillo, relleno);
    grupo.position.set(x, 0.06, z);
    grupo.scale.setScalar(radio);
    this.escena.add(grupo);
    const a = { grupo, relleno, vida: duracion, total: duracion, radio };
    this.avisos.push(a);
    return a;
  }

  /* Onda de choque: anillo que crece. Si Rosa está en el suelo dentro del radio, le pega */
  onda(x, z, radio, danio, jugador, color = 0xc9a24a) {
    const malla = new THREE.Mesh(geoAnillo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide }));
    malla.rotation.x = -Math.PI / 2;
    malla.position.set(x, 0.15, z);
    malla.scale.setScalar(0.5);
    this.escena.add(malla);
    this.ondas.push({ malla, x, z, radio, vida: 0.5, total: 0.5, danio, golpeo: false });
    this.efectos.polvo(new THREE.Vector3(x, 0.3, z), radio);
  }

  /* Explosión: daña a aliens y a Rosa con menos fuerza mientras más lejos */
  explotar(punto, radio, danioAliens, danioJugador, jugador) {
    this.efectos.explosion(punto, radio);
    this.sonido.reproducir('explosion', { x: punto.x, z: punto.z });
    for (const e of [...this.lista]) {
      if (!e.vivo) continue;
      const d = Math.hypot(e.posicion.x - punto.x, e.posicion.z - punto.z) - (e.c.radio || 0.5);
      if (d > radio) continue;
      const f = 1 - Math.max(0, d) / radio * 0.6;
      if (e.alExplosion) { e.alExplosion(danioAliens * f, punto, this); continue; }
      const dir = new THREE.Vector3(e.posicion.x - punto.x, 0, e.posicion.z - punto.z).normalize();
      if (e.recibirDanio(danioAliens * f, dir.multiplyScalar(3))) this.morir(e);
    }
    if (jugador && jugador.vivo) {
      const d = Math.hypot(jugador.posicion.x - punto.x, jugador.posicion.z - punto.z);
      if (d < radio) this.alSalpicar(danioJugador * (1 - d / radio * 0.6), punto);
    }
    this.alExplotar(punto, radio);
  }

  crearCharco(x, z, radio, duracion) {
    const malla = crearCharco();
    malla.position.set(x, 0.03 + Math.random() * 0.01, z);
    malla.scale.setScalar(0.1);
    this.escena.add(malla);
    this.charcos.push({ malla, x, z, radio, vida: duracion, total: duracion });
  }

  /* ¿El punto está pisando baba? */
  enCharco(pos) {
    return this.charcos.some((c) => c.vida > 0.5 && Math.hypot(pos.x - c.x, pos.z - c.z) < c.radio);
  }

  actualizar(dt, jugador, mundo) {
    const ctx = { sonido: this.sonido, alAtacar: this.alAtacar, gestor: this, efectos: this.efectos };
    for (const e of this.lista) e.actualizar(dt, jugador, this.lista, mundo, ctx);
    for (let i = this.lista.length - 1; i >= 0; i--) {
      if (this.lista[i].eliminar) {
        if (this.lista[i] === this.jefe) this.jefe = null;
        this.lista[i].quitar(this.escena);
        this.lista.splice(i, 1);
      }
    }

    // ---- Proyectiles ----
    for (let i = this.proyectiles.length - 1; i >= 0; i--) {
      const s = this.proyectiles[i];
      s.vel.y -= s.gravedad * dt;
      s.malla.position.addScaledVector(s.vel, dt);
      if (!s.recto) { s.malla.rotation.x += dt * s.giro; s.malla.rotation.z += dt * s.giro * 0.4; }
      s.vida -= dt;
      const p = s.malla.position;
      const dJugador = Math.hypot(p.x - jugador.posicion.x, p.z - jugador.posicion.z);
      // Manejando, el "blanco" es toda la camioneta (más grande)
      const alturaJugador = jugador.posicion.y + (jugador.enVehiculo ? 2.4 : 1.8);
      const radioJugador = jugador.enVehiculo ? 1.8 : (s.recto ? 0.6 : 0.8);
      const golpeDirecto = dJugador < radioJugador && p.y > jugador.posicion.y - 0.2 && p.y < alturaJugador;
      let choco = false;
      if (s.recto) {
        // En línea recta: choca con paredes, autos y barreras
        for (const c of mundo.colisiones) {
          if (p.x > c.minX && p.x < c.maxX && p.z > c.minZ && p.z < c.maxZ && p.y < (c.alto ?? 99)) { choco = true; break; }
        }
      }
      if (p.y <= 0.05 || golpeDirecto || choco || s.vida <= 0) {
        this.impactoProyectil(s, p);
        if (golpeDirecto || (!s.recto && dJugador < s.radio)) this.alSalpicar(s.danio, p);
        this.quitarProyectil(i);
      }
    }

    // ---- Avisos en el suelo ----
    for (let i = this.avisos.length - 1; i >= 0; i--) {
      const a = this.avisos[i];
      a.vida -= dt;
      const p = 1 - Math.max(0, a.vida) / a.total;
      a.relleno.scale.setScalar(p);
      a.relleno.material.opacity = 0.15 + p * 0.25;
      if (a.vida <= 0) this.quitarAviso(a);
    }

    // ---- Ondas de choque ----
    for (let i = this.ondas.length - 1; i >= 0; i--) {
      const o = this.ondas[i];
      o.vida -= dt;
      const p = 1 - Math.max(0, o.vida) / o.total;
      const r = o.radio * p;
      o.malla.scale.setScalar(Math.max(0.5, r));
      o.malla.material.opacity = 0.85 * (1 - p);
      // Le pega cuando el anillo pasa por donde está Rosa (si está en el suelo)
      const dJ = Math.hypot(jugador.posicion.x - o.x, jugador.posicion.z - o.z);
      if (!o.golpeo && jugador.vivo && dJ < r && dJ > r - 2.5 && jugador.posicion.y < 0.35 && !jugador.enVehiculo) {
        o.golpeo = true;
        this.alSalpicar(o.danio, new THREE.Vector3(o.x, 0, o.z));
      }
      if (o.vida <= 0) { this.escena.remove(o.malla); o.malla.material.dispose(); this.ondas.splice(i, 1); }
    }

    // ---- Charcos: crecen al aparecer y se secan al final ----
    for (let i = this.charcos.length - 1; i >= 0; i--) {
      const ch = this.charcos[i];
      ch.vida -= dt;
      const crecer = Math.min(1, (ch.total - ch.vida) / 0.25);
      const secar = Math.min(1, ch.vida / 1);
      ch.malla.scale.setScalar(ch.radio * crecer * (0.6 + 0.4 * secar));
      ch.malla.material.opacity = 0.6 * secar;
      if (ch.vida <= 0) { this.escena.remove(ch.malla); ch.malla.material.dispose(); this.charcos.splice(i, 1); }
    }
  }

  /* Qué pasa cuando cae un proyectil, según su tipo */
  impactoProyectil(s, p) {
    const suelo = new THREE.Vector3(p.x, Math.max(0.2, p.y), p.z);
    if (s.tipo === 'baba') {
      this.efectos.salpicadura(suelo);
      this.sonido.reproducir('babaImpacto', { x: p.x, z: p.z });
    } else if (s.tipo === 'paca') {
      this.efectos.heno(suelo, 1.4);
      this.sonido.reproducir('pacaCae', { x: p.x, z: p.z });
    } else if (s.tipo === 'roca' || s.tipo === 'auto') {
      this.efectos.polvo(suelo, s.radio);
      this.sonido.reproducir(s.tipo === 'auto' ? 'choqueCamioneta' : 'rocaCae', { x: p.x, z: p.z });
    } else if (s.tipo === 'plasma') {
      this.efectos.chispas(suelo, 0xb36bff);
      this.sonido.reproducir('impactoPlasma', { x: p.x, z: p.z });
    } else if (s.tipo === 'orbe') {
      this.efectos.chispas(suelo, 0xff5ad1, 2);
      this.sonido.reproducir('impactoPlasma', { x: p.x, z: p.z });
    }
    if (s.alCaer) s.alCaer(suelo);
  }

  quitarProyectil(i) {
    const s = this.proyectiles[i];
    this.escena.remove(s.malla);
    if (s.aviso) this.quitarAviso(s.aviso);
    this.proyectiles.splice(i, 1);
  }

  quitarAviso(a) {
    const i = this.avisos.indexOf(a);
    if (i < 0) return;
    this.escena.remove(a.grupo);
    a.grupo.children.forEach((m) => m.material.dispose());
    this.avisos.splice(i, 1);
  }

  limpiar() {
    if (!this.escena) return;
    this.lista.forEach((e) => e.quitar(this.escena));
    this.lista = [];
    this.jefe = null;
    this.proyectiles.forEach((s) => this.escena.remove(s.malla));
    this.proyectiles = [];
    [...this.avisos].forEach((a) => this.quitarAviso(a));
    this.ondas.forEach((o) => this.escena.remove(o.malla));
    this.ondas = [];
    this.charcos.forEach((c) => this.escena.remove(c.malla));
    this.charcos = [];
  }
}
