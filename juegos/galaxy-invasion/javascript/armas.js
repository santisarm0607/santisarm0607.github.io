/* =========================================================
   GALAXY INVASION — armas.js
   El arsenal de Rosa: hasta 3 armas (escopeta, pistola, rifle),
   cada una con su rareza. Disparo, perdigones de la escopeta,
   recarga, apuntar, cambio de arma, linterna y animaciones.
   ========================================================= */

import * as THREE from 'three';
import { CONFIG } from './config.js';
import { crearArmaFPS } from './modelos.js';

export const ORDEN_RAREZA = ['comun', 'rara', 'epica', 'legendaria'];

/* Busca un dato (userData) en el objeto o en sus "padres" */
function datoArriba(objeto, clave) {
  while (objeto) {
    if (objeto.userData && objeto.userData[clave]) return objeto.userData[clave];
    objeto = objeto.parent;
  }
  return null;
}

/* Elige una rareza al azar según las probabilidades de config.js */
export function rarezaAlAzar() {
  let azar = Math.random();
  for (const r of ORDEN_RAREZA) {
    azar -= CONFIG.rarezas[r].probabilidad;
    if (azar <= 0) return r;
  }
  return 'comun';
}

/* Calcula los números finales de un arma según su rareza */
export function datosArma(tipo, rareza) {
  const base = CONFIG.armas[tipo];
  const r = CONFIG.rarezas[rareza];
  return {
    ...base,
    tipo,
    rareza,
    nombreRareza: r.nombre,
    color: r.color,
    danio: base.danio * r.danio,
    recarga: base.recarga * r.recarga,
    cadencia: base.cadencia * r.cadencia,
    cargador: Math.round(base.cargador * r.cargador)
  };
}

export class Arsenal {
  constructor(camara, sonido) {
    this.camara = camara;
    this.sonido = sonido;
    this.efectos = null;
    this.modelos = {};
    this.armas = [];
    this.actual = 0;
    this.municion = { cartuchos: 0, balas: 0 };

    // Linterna (tecla F). Apagada = invisible, así no gasta rendimiento
    this.linterna = new THREE.SpotLight(0xfff1d6, 60, 35, 0.42, 0.5, 1.4);
    this.linterna.visible = false;
    this.linterna.position.set(0.15, -0.1, 0);
    this.linterna.target.position.set(0, 0, -5);
    camara.add(this.linterna);
    camara.add(this.linterna.target);
    this.linternaEncendida = false;

    this.raycaster = new THREE.Raycaster();
    this.visible = false;
    this.reiniciarEstado();
  }

  usarEfectos(efectos) { this.efectos = efectos; }

  reiniciarEstado() {
    this.espera = 0;
    this.recargando = false;
    this.tiempoRecarga = 0;
    this.patada = 0;
    this.golpeAnim = 0;         // culatazo (v0.8)
    this.lanzaAnim = 0;         // lanzar granada (v0.8)
    this.fogonazo = 0;
    this.gatilloSoltado = true;
    this.cambiando = 0;         // > 0 mientras se cambia de arma
    this.dispersionActual = 0.02;
    this.disparos = 0;
    this.impactos = 0;
    this.muertesUltimoDisparo = 0;
  }

  /* Modelo 3D de cada tipo de arma (se crea una sola vez) */
  modelo(tipo) {
    if (!this.modelos[tipo]) {
      const m = crearArmaFPS(tipo);
      m.grupo.visible = false;
      m.brazoIzqBase = m.brazoIzq.position.y;
      this.camara.add(m.grupo);
      this.modelos[tipo] = m;
    }
    return this.modelos[tipo];
  }

  /* Carga las armas guardadas: [{ tipo, rareza }] */
  cargar(lista) {
    this.armas = lista.slice(0, CONFIG.maxArmas).map(({ tipo, rareza }) => this.nuevaArma(tipo, rareza));
    if (!this.armas.length) this.armas.push(this.nuevaArma('escopeta', 'comun'));
    this.actual = 0;
    this.municion = { cartuchos: CONFIG.municion.cartuchos.inicial, balas: CONFIG.municion.balas.inicial };
    this.reiniciarEstado();
    this.mostrarActual();
  }

  nuevaArma(tipo, rareza) {
    const datos = datosArma(tipo, rareza);
    return { tipo, rareza, datos, cargador: datos.cargador };
  }

  /* Para guardar en el navegador */
  aGuardar() {
    return this.armas.map(({ tipo, rareza }) => ({ tipo, rareza }));
  }

  /* Para el punto de control: copia de armas y munición */
  copia() {
    return { armas: this.armas.map((a) => ({ ...a })), actual: this.actual, municion: { ...this.municion } };
  }

  restaurar(c) {
    this.armas = c.armas.map((a) => ({ ...a, cargador: a.datos.cargador }));
    this.actual = Math.min(c.actual, this.armas.length - 1);
    this.municion = { ...c.municion };
    // Si te quedaste sin balas, te devolvemos un poco para que puedas seguir
    this.municion.cartuchos = Math.max(this.municion.cartuchos, 10);
    this.municion.balas = Math.max(this.municion.balas, 24);
    this.reiniciarEstado();
    this.mostrarActual();
  }

  /* Partida guardada (v0.6.5): solo lo necesario para el localStorage */
  copiaGuardable(c = this.copia()) {
    return { armas: c.armas.map(({ tipo, rareza }) => ({ tipo, rareza })), actual: c.actual, municion: { ...c.municion } };
  }

  cargarCopia(g) {
    this.restaurar({ armas: g.armas.map(({ tipo, rareza }) => this.nuevaArma(tipo, rareza)), actual: g.actual, municion: g.municion });
  }

  get arma() { return this.armas[this.actual]; }
  get reserva() { return this.municion[this.arma.datos.municion]; }

  mostrarActual() {
    Object.values(this.modelos).forEach((m) => { m.grupo.visible = false; });
    const a = this.arma;
    const m = this.modelo(a.tipo);
    m.matRareza.color.set(a.datos.color);
    m.grupo.visible = this.visible;
    m.grupo.position.set(...m.posCadera);
  }

  mostrar(visible) {
    this.visible = visible;
    if (this.armas.length) this.mostrarActual();
    if (!visible) { this.linterna.visible = false; this.linternaEncendida = false; }
  }

  /* Recibe un arma (de un cofre). Devuelve qué pasó para avisar al jugador */
  agregarArma(tipo, rareza) {
    const nueva = this.nuevaArma(tipo, rareza);
    const extra = nueva.datos.municion === 'cartuchos' ? 8 : 24;
    const i = this.armas.findIndex((a) => a.tipo === tipo);
    if (i >= 0) {
      // Ya tienes ese tipo: si la nueva es mejor, la cambias; si no, se convierte en munición
      if (ORDEN_RAREZA.indexOf(rareza) > ORDEN_RAREZA.indexOf(this.armas[i].rareza)) {
        this.armas[i] = nueva;
        if (i === this.actual) { this.recargando = false; this.mostrarActual(); }
        return { resultado: 'mejor', arma: nueva };
      }
      const cant = this.agregarMunicion(nueva.datos.municion, extra);
      return { resultado: 'municion', arma: nueva, cantidad: cant };
    }
    if (this.armas.length < CONFIG.maxArmas) {
      this.armas.push(nueva);
      this.agregarMunicion(nueva.datos.municion, extra);
      return { resultado: 'nueva', arma: nueva };
    }
    // Sin espacio: reemplaza el arma que tienes en la mano
    this.armas[this.actual] = nueva;
    this.mostrarActual();
    return { resultado: 'reemplazo', arma: nueva };
  }

  agregarMunicion(tipo, cantidad) {
    const max = CONFIG.municion[tipo].maximo;
    const antes = this.municion[tipo];
    this.municion[tipo] = Math.min(max, antes + cantidad);
    return this.municion[tipo] - antes;
  }

  municionLlena(tipo) {
    return this.municion[tipo] >= CONFIG.municion[tipo].maximo;
  }

  /* Cambiar de arma: indice 0..2, o +1 / -1 (relativo) para pasar a la siguiente */
  cambiar(indice, relativo = false) {
    if (this.armas.length < 2) return;
    const nuevo = relativo ? (this.actual + indice + this.armas.length) % this.armas.length : indice;
    if (nuevo < 0 || nuevo >= this.armas.length || nuevo === this.actual) return;
    this.actual = nuevo;
    this.recargando = false;
    this.cambiando = 0.35;
    this.espera = Math.max(this.espera, 0.35);
    this.sonido.reproducir('cambioArma');
    this.mostrarActual();
    this.modelo(this.arma.tipo).grupo.position.y -= 0.3; // sube desde abajo
  }

  empezarRecarga() {
    const a = this.arma;
    if (this.recargando || a.cargador >= a.datos.cargador || this.reserva <= 0 || this.cambiando > 0) return;
    this.recargando = true;
    this.tiempoRecarga = 0;
    this.sonido.reproducir(a.tipo === 'escopeta' ? 'escopetaRecarga' : a.tipo === 'rifle' ? 'rifleRecarga' : 'recarga');
  }

  alternarLinterna() {
    this.linternaEncendida = !this.linternaEncendida;
    this.linterna.visible = this.linternaEncendida;
    this.sonido.reproducir('uiClic');
  }

  /* ¿Se está mirando por la mira telescópica? */
  mirandoPorMira(jugador) {
    return !!this.modelo(this.arma.tipo).conMira && jugador.apuntado > 0.85 && !this.recargando;
  }

  /* objetivos: cajas de impacto de los aliens; solidos: paredes, autos...
     alImpactar(enemigo, danio, punto, direccion, objeto) -> devuelve true si murió
     (objeto = la caja que recibió la bala: sirve para saber si fue en el punto débil) */
  actualizar(dt, acc, jugador, objetivos, solidos, alImpactar) {
    this.espera -= dt;
    this.cambiando = Math.max(0, this.cambiando - dt);
    if (acc.linterna) this.alternarLinterna();
    if (acc.cambiarArma) this.cambiar(acc.cambiarArma.indice, acc.cambiarArma.relativo);
    if (acc.recargar) this.empezarRecarga();
    const a = this.arma;
    const d = a.datos;

    /* ---- Recarga ---- */
    if (this.recargando) {
      this.tiempoRecarga += dt;
      if (this.tiempoRecarga >= d.recarga) {
        const pasan = Math.min(d.cargador - a.cargador, this.reserva);
        a.cargador += pasan;
        this.municion[d.municion] -= pasan;
        this.recargando = false;
      }
    }

    /* ---- Dispersión ---- */
    const base = d.dispersion + (d.dispersionApuntando - d.dispersion) * jugador.apuntado;
    const extraMovimiento = Math.min(1, jugador.rapidez / CONFIG.jugador.velocidad) * d.dispersionMoviendo * (1 - jugador.apuntado * 0.7);
    const extraAire = jugador.enSuelo ? 0 : 0.03;
    const objetivoDispersion = base + extraMovimiento + extraAire + this.patada * 0.12 * (d.perdigones > 1 ? 0.2 : 1);
    this.dispersionActual += (objetivoDispersion - this.dispersionActual) * Math.min(1, dt * 12);

    /* ---- Disparar ---- */
    if (!acc.disparar) this.gatilloSoltado = true;
    // El rifle es de cerrojo: hay que soltar el gatillo entre disparos
    const puedeRepetir = a.tipo !== 'rifle' || this.gatilloSoltado;
    if (acc.disparar && this.espera <= 0 && !this.recargando && this.cambiando <= 0 && jugador.vivo && puedeRepetir) {
      if (a.cargador > 0) {
        this.disparar(jugador, objetivos, solidos, alImpactar);
      } else if (this.gatilloSoltado) {
        this.sonido.reproducir('sinMunicion');
        this.espera = 0.25;
        this.empezarRecarga();
      }
      this.gatilloSoltado = false;
    }
    if (a.cargador === 0 && !this.recargando && this.reserva > 0 && this.espera <= 0) this.empezarRecarga();

    this.animar(dt, jugador);
  }

  disparar(jugador, objetivos, solidos, alImpactar) {
    const a = this.arma;
    const d = a.datos;
    const m = this.modelo(a.tipo);
    a.cargador--;
    this.espera = d.cadencia;
    this.disparos++;
    this.patada = 1;
    this.fogonazo = 0.05;
    jugador.aplicarRetroceso(d.retroceso * (1 - jugador.apuntado * 0.5));
    this.sonido.reproducir(a.tipo === 'escopeta' ? 'escopetaDisparo' : a.tipo === 'rifle' ? 'rifleDisparo' : 'disparoPistola');

    const escala = 1 / Math.tan(THREE.MathUtils.degToRad(this.camara.fov / 2));
    this.camara.updateMatrixWorld();
    const desde = new THREE.Vector3();
    m.puntaCanon.getWorldPosition(desde);
    const lista = [...objetivos, ...solidos];
    let acerto = false;
    let muertes = 0;
    const yaMuertos = new Set();

    // La escopeta lanza varios perdigones; las otras armas, una sola bala
    for (let p = 0; p < d.perdigones; p++) {
      const ang = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * this.dispersionActual * escala;
      this.raycaster.setFromCamera(new THREE.Vector2(Math.cos(ang) * r, Math.sin(ang) * r), this.camara);
      this.raycaster.far = d.alcance;
      const golpes = this.raycaster.intersectObjects(lista, true);
      const dir = this.raycaster.ray.direction.clone();
      if (!golpes.length) {
        if (p < 3) this.efectos.trazo(desde, desde.clone().addScaledVector(dir, Math.min(40, d.alcance)));
        continue;
      }
      const g = golpes[0];
      if (p < 4) this.efectos.trazo(desde, g.point);
      const enemigo = g.object.userData.enemigo;
      const blanco = !enemigo && datoArriba(g.object, 'blanco'); // barriles, generadores...
      if (blanco) {
        acerto = true;
        blanco.recibirDisparo(d.danio, g.point, dir);
      } else if (enemigo) {
        acerto = true;
        let danio = d.danio;
        // El daño de la escopeta baja con la distancia
        if (d.caidaDesde && g.distance > d.caidaDesde) {
          const t = Math.min(1, (g.distance - d.caidaDesde) / (d.caidaHasta - d.caidaDesde));
          danio *= 1 - t * 0.6;
        }
        if (!yaMuertos.has(enemigo) && alImpactar(enemigo, danio, g.point, dir, g.object)) {
          yaMuertos.add(enemigo);
          muertes++;
        }
      } else if (p < 3) {
        const normal = g.face ? g.face.normal.clone().transformDirection(g.object.matrixWorld) : dir.clone().negate();
        this.efectos.impactoPared(g.point, normal);
        this.sonido.reproducir('impactoPared', { x: g.point.x, z: g.point.z });
      }
    }
    if (acerto) this.impactos++;
    this.muertesUltimoDisparo = muertes;
    this.tipoUltimoDisparo = a.tipo;
  }

  /* Movimiento del arma en pantalla: apuntar, balanceo, retroceso, recarga */
  animar(dt, jugador) {
    const a = this.arma;
    const m = this.modelo(a.tipo);
    const g = m.grupo;
    const objetivo = new THREE.Vector3(...m.posCadera).lerp(new THREE.Vector3(...m.posApuntando), jugador.apuntado);

    const mov = jugador.enSuelo ? Math.min(1, jugador.rapidez / CONFIG.jugador.velocidad) : 0.3;
    const fuerza = mov * (1 - jugador.apuntado * 0.85) * (jugador.corriendo ? 1.8 : 1);
    objetivo.x += Math.cos(jugador.faseBalanceo) * 0.012 * fuerza;
    objetivo.y += -Math.abs(Math.sin(jugador.faseBalanceo)) * 0.012 * fuerza;

    const pesada = a.tipo === 'pistola' ? 1 : 1.8;
    this.patada = Math.max(0, this.patada - dt * (a.tipo === 'pistola' ? 9 : 6));
    objetivo.z += this.patada * 0.05 * pesada;
    g.position.lerp(objetivo, Math.min(1, dt * (this.cambiando > 0 ? 8 : 18)));

    let rotX = this.patada * 0.18 * pesada;
    let rotZ = 0;
    let rotY = 0;
    // Culatazo (v0.8): el arma da un golpe de lado hacia adelante
    if (this.golpeAnim > 0) {
      this.golpeAnim = Math.max(0, this.golpeAnim - dt * 3.2);
      const c = Math.sin((1 - this.golpeAnim) * Math.PI);
      rotY += c * 0.9;
      rotX -= c * 0.35;
      objetivo.x -= c * 0.14;
      objetivo.z -= c * 0.18;
    }
    // Lanzar granada (v0.8): el arma baja un momento
    if (this.lanzaAnim > 0) {
      this.lanzaAnim = Math.max(0, this.lanzaAnim - dt * 2.8);
      const c = Math.sin((1 - this.lanzaAnim) * Math.PI);
      objetivo.y -= c * 0.25;
      rotX += c * 0.4;
    }
    if (jugador.corriendo) { rotX -= 0.25; rotZ = 0.3; }
    if (this.recargando) {
      const p = this.tiempoRecarga / a.datos.recarga;
      const curva = Math.sin(Math.min(1, p) * Math.PI);
      if (a.tipo === 'escopeta') {
        // La escopeta se "quiebra": los cañones bajan para meter cartuchos
        rotX += curva * 0.5;
        m.arma.rotation.x = -curva * 0.35;
      } else {
        rotX -= curva * 0.7;
        rotZ += curva * 0.5;
      }
      g.position.y -= curva * 0.08;
      m.brazoIzq.position.y = m.brazoIzqBase - curva * 0.12;
    } else {
      m.arma.rotation.x = 0;
      m.brazoIzq.position.y = m.brazoIzqBase;
    }
    g.rotation.x += (rotX - g.rotation.x) * Math.min(1, dt * 16);
    g.rotation.z += (rotZ - g.rotation.z) * Math.min(1, dt * 12);
    g.rotation.y += (rotY - g.rotation.y) * Math.min(1, dt * 18);

    // Con la mira telescópica, el rifle se esconde (se ve la mira en pantalla)
    g.visible = this.visible && !this.mirandoPorMira(jugador);

    this.fogonazo -= dt;
    const encendido = this.fogonazo > 0;
    m.fogonazo.visible = encendido;
    if (encendido) m.fogonazo.rotation.z = Math.random() * Math.PI;
  }
}
