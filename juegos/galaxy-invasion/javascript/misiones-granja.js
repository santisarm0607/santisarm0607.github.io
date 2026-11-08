/* =========================================================
   GALAXY INVASION — misiones-granja.js
   Reglas de la Etapa 1 (La granja). La misión va por pasos:
     0. Revisar el corral (se escuchó un ruido)
     1. Defender el corral de los Babositos
     2. Buscar las llaves de la camioneta en el granero (emboscada)
     3. JEFE: al salir del granero, las pacas se levantan: la Bestia de Heno
     4. Huir hasta la camioneta (siguen saliendo Babositos del maíz)
     5. (v0.6) Manejar: salir por el portón a la carretera y tomar
        hacia el este. Al llegar al final de la granja sigue la
        Etapa 2 sin cortes (main.js carga la carretera).
   Cada paso que empieza es un punto de control (menos el 5).
   ========================================================= */

import { CONFIG } from './config.js';

const G = CONFIG.granja;

export class MisionGranja {
  constructor(enemigos, mundo, sonido, vehiculo) {
    this.enemigos = enemigos;
    this.mundo = mundo;
    this.sonido = sonido;
    this.vehiculo = vehiculo;
    this.alCambiar = () => {};
    this.alCompletar = () => {};
    this.alMensaje = () => {};
    this.alSubtitulo = () => {};
    this.reiniciar(0);
  }

  /* Empieza desde un paso (también se usa como punto de control) */
  reiniciar(paso) {
    this.enemigos.limpiar();
    if (paso === 5) paso = 4;
    this.paso = paso;
    this.puntoControl = paso;
    this.estado = 'activo';
    this.cola = [];               // aliens que faltan por aparecer: ['babosito', 'baboson', ...]
    this.tiempoAparicion = 0;
    this.emboscada = false;
    this.temporizadorHuida = 0;
    this.jefe = null;
    this.jefeDerrotado = paso >= 4;
    this.esperaTrasJefe = 0;
    this.tieneLlaves = paso >= 3;
    this.mundo.llaves.visible = !this.tieneLlaves;
    this.mundo.pilaPacas.visible = paso < 3;
    this.mundo.barriles.forEach((b) => b.reiniciar());
    this.iniciarPaso(paso, true);
  }

  /* Dónde aparece Rosa al reintentar desde cada paso */
  puntoInicio() {
    const L = this.mundo.lugares;
    const vehiculo = this.mundo.inicioVehiculo;   // la camioneta siempre empieza estacionada
    if (this.paso <= 1) return { punto: this.mundo.inicioJugador, yaw: 0, vehiculo };
    if (this.paso === 2) return { punto: L.corral.clone().setZ(L.corral.z + 10), yaw: -1.2, vehiculo };
    if (this.paso === 3) return { punto: L.puntoJefe, yaw: -0.9, vehiculo };
    return { punto: L.puntoHuidaFinal, yaw: Math.atan2(-(L.camioneta.x - L.puntoHuidaFinal.x), -(L.camioneta.z - L.puntoHuidaFinal.z)), vehiculo };
  }

  /* ¿Se puede subir a la camioneta? Solo con las llaves y sin la Bestia viva */
  puedeSubir() {
    if (this.paso >= 4) return true;
    return { mensaje: this.tieneLlaves ? 'PRIMERO, LA BESTIA DE HENO' : 'LAS LLAVES ESTÁN EN EL GRANERO' };
  }

  iniciarPaso(paso, alReiniciar = false) {
    this.paso = paso;
    this.puntoControl = paso;
    if (paso === 0) {
      this.alSubtitulo('Se llevaron a {pareja}… ¿Y ese ruido? Viene del corral.', 5);
    } else if (paso === 1) {
      this.cola = Array(G.babositosCorral).fill('babosito');
      this.tiempoAparicion = 0.5;
      this.sonido.reproducir('oleadaInicia');
      this.alMensaje('¡BABOSOS EN EL CORRAL!');
      this.alSubtitulo('¿¡Qué son esas cosas!? ¡Fuera de mi granja!');
    } else if (paso === 2) {
      if (!alReiniciar) this.sonido.reproducir('objetivoCompletado');
      this.alSubtitulo('Tengo que llegar a la ciudad. Las llaves de la camioneta están en el granero.');
    } else if (paso === 3) {
      // La pila de pacas se levanta: aparece la Bestia de Heno
      this.mundo.pilaPacas.visible = false;
      const p = this.mundo.lugares.pilaPacas;
      this.jefe = this.enemigos.crear('bestia', { x: p.x, y: 0, z: p.z });
      this.jefe.grupo.rotation.y = 1.0;   // mirando hacia el granero
      this.alMensaje('¡BESTIA DE HENO!', 3);
      this.alSubtitulo('¿Las pacas se están… moviendo? ¡Ese alien se metió en el heno!', 5);
    } else if (paso === 4) {
      if (!alReiniciar) this.sonido.reproducir('objetivoCompletado');
      this.temporizadorHuida = 2;
      this.alSubtitulo(alReiniciar ? 'A la camioneta, rápido.' : '¡Quedó hecha paja! Toma lo que soltó y vámonos a la camioneta.');
    } else if (paso === 5) {
      this.puntoControl = 4;
      this.sonido.reproducir('motor');
      this.alSubtitulo('¡Arrancó! Por el portón a la carretera, y a la derecha hacia la ciudad.', 5);
    }
  }

  /* Dónde está el objetivo actual (para la flecha en pantalla) */
  objetivoPosicion() {
    const L = this.mundo.lugares;
    if (this.paso === 0) return L.corral;
    if (this.paso === 1 || this.paso === 3) return null;   // estás peleando
    if (this.paso === 2) return L.llaves;
    if (this.paso === 5 && this.vehiculo.ocupado) {
      // Primero el portón; ya en la carretera, el final de la granja
      return this.vehiculo.posicion.z > L.porton.z + 1 ? L.porton : L.salida;
    }
    return this.vehiculo.posicion;
  }

  textoObjetivo() {
    if (this.estado === 'completada') return { titulo: 'Etapa 1 · La granja', detalle: 'Granja defendida.' };
    const quedan = this.cola.length + this.enemigos.vivos;
    if (this.paso === 0) return { titulo: 'Etapa 1 · La granja', detalle: 'Revisa el corral' };
    if (this.paso === 1) return { titulo: 'Defiende el corral', detalle: `Babosos restantes: ${quedan}` };
    if (this.paso === 2) return { titulo: 'Las llaves', detalle: this.emboscada && quedan ? `Busca las llaves en el granero · Babosos: ${quedan}` : 'Busca las llaves en el granero' };
    if (this.paso === 3) return { titulo: 'Jefe', detalle: 'Derrota a la Bestia de Heno' };
    if (this.paso === 5) return { titulo: 'La huida', detalle: this.vehiculo.ocupado ? 'Sal por el portón a la carretera' : 'Vuelve a la camioneta' };
    return { titulo: 'La huida', detalle: 'Sube a la camioneta' };
  }

  /* Cosas que se pueden usar con E en este momento */
  interactuables() {
    const L = this.mundo.lugares;
    const lista = [];
    if (this.paso === 2 && !this.tieneLlaves) {
      lista.push({ posicion: L.llaves, radio: 2.6, texto: 'Tomar las llaves', accion: () => this.tomarLlaves() });
    }
    return lista;
  }

  tomarLlaves() {
    this.tieneLlaves = true;
    this.mundo.llaves.visible = false;
    this.sonido.reproducir('llaves');
    if (this.alObjeto) this.alObjeto('llaves');   // a la mochila (v0.8)
    this.alMensaje('LLAVES DE LA CAMIONETA');
    this.alSubtitulo('¡Las tengo! Ahora, a la camioneta…');
    this.salirDelGranero = true;   // el jefe aparece al salir
  }

  completar() {
    if (this.estado === 'completada') return;
    this.estado = 'completada';
    this.enemigos.limpiar();
    this.alSubtitulo('Esa nave… ahí se llevaron a {pareja}. Allá voy.');
    this.alCambiar(this.textoObjetivo());
    this.alCompletar();
  }

  actualizar(dt, jugador) {
    if (this.estado === 'completada') return;
    const L = this.mundo.lugares;

    // Aparición de los aliens que están en cola
    this.tiempoAparicion -= dt;
    if (this.cola.length && this.tiempoAparicion <= 0) {
      const tipo = this.cola.shift();
      this.enemigos.crear(tipo, this.elegirPunto(jugador, tipo === 'baboson'));
      this.tiempoAparicion = G.intervaloAparicion;
      if (tipo === 'baboson') this.alSubtitulo('¡Hay uno enorme! Cuidado con lo que escupe.');
    }

    if (this.paso === 0) {
      if (jugador.posicion.distanceTo(L.corral) < 14) this.iniciarPaso(1);
    } else if (this.paso === 1) {
      if (!this.cola.length && this.enemigos.vivos === 0) this.iniciarPaso(2);
    } else if (this.paso === 2) {
      // Emboscada al acercarse al granero
      if (!this.emboscada && jugador.posicion.distanceTo(L.granero) < 22) {
        this.emboscada = true;
        this.cola = [...Array(G.babositosGranero).fill('babosito'), ...Array(G.babosonesGranero).fill('baboson')];
        this.tiempoAparicion = 0.3;
        this.sonido.reproducir('oleadaInicia');
        this.alMensaje('¡EMBOSCADA!');
      }
      // Con las llaves en la mano, al salir del granero se levanta la Bestia
      if (this.tieneLlaves && jugador.posicion.distanceTo(L.llaves) > G.distanciaSalirGranero) this.iniciarPaso(3);
    } else if (this.paso === 3) {
      if (!this.jefe || !this.jefe.vivo) {
        this.esperaTrasJefe += dt;
        if (this.esperaTrasJefe > 2.5) this.iniciarPaso(4);
      }
    } else if (this.paso === 4) {
      // Mientras huyes, siguen saliendo Babositos del maíz
      this.temporizadorHuida -= dt;
      if (this.temporizadorHuida <= 0 && this.enemigos.vivos < G.maxVivosHuida) {
        this.cola.push(Math.random() < 0.15 ? 'baboson' : 'babosito');
        this.temporizadorHuida = G.intervaloHuida;
      }
      if (this.vehiculo.ocupado) this.iniciarPaso(5);
    } else if (this.paso === 5) {
      // Fin de la granja: en la carretera, pasando el portón hacia el este
      const v = this.vehiculo.posicion;
      if (v.x > G.salidaX && v.z < G.porton.z + 2) this.completar();
    }
    this.alCambiar(this.textoObjetivo());
  }

  /* Elige un punto de aparición lejos del jugador (pero no demasiado) */
  elegirPunto(jugador, lejos = false) {
    const min = lejos ? G.distanciaAparicionMin + 8 : G.distanciaAparicionMin;
    const candidatos = this.mundo.puntosAparicion.filter((p) => {
      const d = p.distanceTo(jugador.posicion);
      return d > min && d < G.distanciaAparicionMax;
    });
    const lista = candidatos.length ? candidatos : this.mundo.puntosAparicion;
    const p = lista[Math.floor(Math.random() * lista.length)];
    return p.clone().set(p.x + (Math.random() - 0.5) * 3, 0, p.z + (Math.random() - 0.5) * 3);
  }
}
