/* =========================================================
   GALAXY INVASION — misiones-ciudad.js
   Reglas de la Etapa 3 (La ciudad). Pasos:
     0. Avanzar por la avenida (aliens que no paran de salir)
     1. Rescatar a los soldados atrapados (calle del este, cruce 1)
     2. Seguir hacia la nave con los aliados
     3. Romper el bloqueo del cruce 2 (Brutos y Soldados alien)
     4. Llegar a la plaza (cada vez más aliens)
     5. JEFE: el Guardián de la nave
     6. La nave baja un rayo: entrar en él (fin de la etapa)
   Mientras más cerca de la nave, más aliens a la vez y más
   seguido (ver CONFIG.ciudad.tramos).
   ========================================================= */

import * as THREE from 'three';
import { CONFIG } from './config.js';

const C = CONFIG.ciudad;

export class MisionCiudad {
  constructor(enemigos, mundo, sonido, aliados) {
    this.enemigos = enemigos;
    this.mundo = mundo;
    this.sonido = sonido;
    this.aliados = aliados;
    this.alCambiar = () => {};
    this.alCompletar = () => {};
    this.alMensaje = () => {};
    this.alSubtitulo = () => {};
    this.alLogro = () => {};
    this.reiniciar(0);
  }

  reiniciar(paso) {
    this.enemigos.limpiar();
    this.paso = paso;
    this.puntoControl = paso;
    this.estado = 'activo';
    this.cola = [];
    this.puntoCola = null;
    this.tiempoAparicion = 2;
    this.oleada = [];             // aliens del rescate o del bloqueo (hay que acabarlos)
    this.jefe = null;
    this.esperaJefe = 0;
    this.mundo.rayoNave.activo = paso >= 6;
    this.zJugador = this.puntoInicio().punto.z;
    this.mundo.barriles.forEach((b) => b.reiniciar());
    // Soldados: esperando en su barricada, o ya con Rosa
    this.aliados.limpiar();
    const R = this.mundo.lugares.rescate;
    if (paso <= 1) {
      this.aliados.crear(R.x + 1.5, R.z - 2.2, Math.PI / 2, 'Cabo Díaz');
      this.aliados.crear(R.x + 1.5, R.z + 2.2, Math.PI / 2, 'Soldado Ruiz');
      this.rescatados = false;
    } else {
      const p = this.puntoInicio().punto;
      this.aliados.crear(p.x - 3, p.z + 2, 0, 'Cabo Díaz');
      this.aliados.crear(p.x + 3, p.z + 2, 0, 'Soldado Ruiz');
      this.aliados.rescatar();
      this.rescatados = true;
    }
    this.iniciarPaso(paso, true);
  }

  puntoInicio() {
    const pts = [[0, 10, 0], [0, -82, -0.5], [10, -104, 0], [0, -190, 0], [0, -250, 0], [0, -342, 0], [0, -385, 0]];
    const [x, z, yaw] = pts[Math.min(this.paso, pts.length - 1)];
    return { punto: new THREE.Vector3(x, 0, z), yaw };
  }

  iniciarPaso(paso, alReiniciar = false) {
    this.paso = paso;
    this.puntoControl = paso;
    if (!alReiniciar && paso > 0) this.sonido.reproducir('objetivoCompletado');
    if (paso === 0) {
      this.alSubtitulo('Así que esta es la ciudad… La nave está justo al final de la avenida.');
    } else if (paso === 1) {
      this.alSubtitulo('¿Disparos? ¡Hay soldados atrapados en la calle de la derecha!');
      this.alMensaje('¡SOLDADOS ATRAPADOS!', 2.5);
      this.sonido.reproducir('oleadaInicia');
      this.oleada = [];
      const R = this.mundo.lugares.rescate;
      C.cercoRescate.forEach((tipo, i) => {
        const e = this.enemigos.crear(tipo, { x: R.x - 9 - (i % 3) * 3, y: 0, z: R.z + (i - 2.5) * 2.4 });
        this.oleada.push(e);
      });
    } else if (paso === 2) {
      this.alSubtitulo(alReiniciar ? 'Vamos, la nave está cerca.' : '—¡Gracias, {trato}! Vamos con usted hasta esa nave.', 5);
    } else if (paso === 3) {
      this.alMensaje('¡BLOQUEO ALIEN!', 2.5);
      this.alSubtitulo('Cierran el paso en el cruce. ¡Cuidado con los grandes, cargan de frente!', 5);
      this.sonido.reproducir('oleadaInicia');
      this.oleada = [];
      C.bloqueo.forEach((tipo, i) => {
        const e = this.enemigos.crear(tipo, { x: (i - 2.5) * 3.5, y: 0, z: -228 - (i % 2) * 6 });
        this.oleada.push(e);
      });
    } else if (paso === 4) {
      this.alSubtitulo('¡Pasamos! Los aliens salen de todos lados… ¡a la plaza!');
    } else if (paso === 5) {
      const P = this.mundo.lugares.plaza;
      this.jefe = this.enemigos.crear('guardian', { x: P.x, y: 0, z: P.z }, { mundo: this.mundo });
      this.jefe.grupo.rotation.y = 0;
      this.alMensaje('¡GUARDIÁN DE LA NAVE!', 3);
      this.alSubtitulo('Ese escudo… lo alimentan esas torres. ¡Hay que destruirlas!', 5);
      this.cola = [];
    } else if (paso === 6) {
      this.mundo.rayoNave.activo = true;
      this.sonido.reproducir('rayoNave');
      this.alMensaje('LA NAVE ABRE SU COMPUERTA', 3);
      this.alSubtitulo(alReiniciar ? 'El rayo sigue ahí. Adentro.' : 'Ese rayo sube a la nave… Aguanta, {pareja}. Ya voy.', 5);
    }
  }

  objetivoPosicion() {
    const L = this.mundo.lugares;
    if (this.paso === 0) return L.cruce1;
    if (this.paso === 1) return this.oleadaViva() ? null : L.rescate;
    if (this.paso === 2) return L.cruce2;
    if (this.paso === 3) return null;
    if (this.paso === 4) return L.entradaPlaza;
    if (this.paso === 5) return null;
    return L.plaza;
  }

  oleadaViva() {
    return this.oleada.filter((e) => e.vivo).length;
  }

  textoObjetivo() {
    if (this.estado === 'completada') return { titulo: 'Etapa 3 · La ciudad', detalle: 'Llegaste a la nave.' };
    const metros = Math.max(0, Math.round(this.zJugador - this.mundo.lugares.plaza.z));
    if (this.paso === 0) return { titulo: 'Etapa 3 · La ciudad', detalle: `Avanza por la avenida · ${metros} m a la nave` };
    if (this.paso === 1) {
      const n = this.oleadaViva();
      return { titulo: 'Rescate', detalle: n ? `Salva a los soldados · Aliens: ${n}` : 'Habla con los soldados (E)' };
    }
    if (this.paso === 2) return { titulo: 'Hacia la nave', detalle: `Avanza con los soldados · ${metros} m` };
    if (this.paso === 3) return { titulo: 'Bloqueo', detalle: `Rompe el bloqueo del cruce · Aliens: ${this.oleadaViva()}` };
    if (this.paso === 4) return { titulo: 'La plaza', detalle: `Llega a la plaza de la nave · ${metros} m` };
    if (this.paso === 5) return { titulo: 'Jefe', detalle: 'Derrota al Guardián de la nave' };
    return { titulo: 'La nave', detalle: 'Entra al rayo de la nave' };
  }

  interactuables() {
    if (this.paso === 1 && !this.oleadaViva() && !this.rescatados) {
      return [{ posicion: this.mundo.lugares.rescate, radio: 6, texto: 'Rescatar a los soldados', accion: () => this.rescatar() }];
    }
    return [];
  }

  rescatar() {
    this.rescatados = true;
    this.aliados.rescatar();
    this.alMensaje('¡SOLDADOS RESCATADOS!', 2.5);
    this.alLogro('nadie_atras');
    this.iniciarPaso(2);
  }

  completar() {
    if (this.estado === 'completada') return;
    this.estado = 'completada';
    this.enemigos.limpiar();
    this.sonido.reproducir('rayoNave');
    this.alSubtitulo('Allá voy. Que la Colmena se prepare.');
    this.alCambiar(this.textoObjetivo());
    this.alCompletar();
  }

  /* Tramo actual: cuántos aliens y de qué tipo, según qué tan cerca de la nave */
  tramo(z) {
    return C.tramos.find((t) => z > t.hastaZ) || C.tramos[C.tramos.length - 1];
  }

  actualizar(dt, jugador) {
    if (this.estado === 'completada') return;
    const z = jugador.posicion.z;
    this.zJugador = z;

    // Aparición continua (no durante el rescate, ni con el jefe, ni al final)
    const continua = this.paso === 0 || this.paso === 2 || this.paso === 3 || this.paso === 4;
    this.tiempoAparicion -= dt;
    if (continua && this.tiempoAparicion <= 0) {
      const t = this.tramo(z);
      if (this.enemigos.vivos < t.maxVivos) {
        const tipo = t.tipos[Math.floor(Math.random() * t.tipos.length)];
        const punto = this.elegirPunto(jugador);
        if (punto) this.enemigos.crear(tipo, punto);
      }
      this.tiempoAparicion = t.intervalo * (0.7 + Math.random() * 0.6);
    }

    if (this.paso === 0) {
      if (z < -88) this.iniciarPaso(1);
    } else if (this.paso === 1) {
      // Al acabar con los aliens, los soldados se pueden rescatar (E)
    } else if (this.paso === 2) {
      if (z < -200) this.iniciarPaso(3);
    } else if (this.paso === 3) {
      if (!this.oleadaViva()) this.iniciarPaso(4);
    } else if (this.paso === 4) {
      if (z < -352) this.iniciarPaso(5);
    } else if (this.paso === 5) {
      if (this.jefe && !this.jefe.vivo) {
        this.esperaJefe += dt;
        if (this.esperaJefe > 3.5) this.iniciarPaso(6);
      }
    } else if (this.paso === 6) {
      const P = this.mundo.lugares.plaza;
      if (Math.hypot(jugador.posicion.x - P.x, jugador.posicion.z - P.z) < 3.5) this.completar();
    }
    this.alCambiar(this.textoObjetivo());
  }

  /* Un punto de aparición no muy cerca ni muy lejos, de preferencia adelante */
  elegirPunto(jugador) {
    const candidatos = this.mundo.puntosAparicion.filter((p) => {
      const d = p.distanceTo(jugador.posicion);
      return d > C.distanciaAparicionMin && d < C.distanciaAparicionMax && p.z < jugador.posicion.z + 15;
    });
    if (!candidatos.length) return null;
    const p = candidatos[Math.floor(Math.random() * candidatos.length)];
    return { x: p.x + (Math.random() - 0.5) * 3, y: 0, z: p.z + (Math.random() - 0.5) * 3 };
  }
}
