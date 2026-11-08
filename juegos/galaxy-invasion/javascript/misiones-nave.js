/* =========================================================
   GALAXY INVASION — misiones-nave.js  (v0.7)
   Reglas de la Etapa 4 (La nave nodriza). Pasos:
     0. Hangar: llegas por el rayo. Cápsulas vacías.
     1. Cuarto de armas: una oleada de aliens (hay que acabarla).
     2. PISTA 1: el sombrero de tu hermano en el suelo (E).
        -> se abre la puerta hacia los motores
     3. Ir a la sala de motores.
     4. Sabotear los 3 motores (disparándoles). Siguen saliendo aliens.
     5. PISTA 2: la consola recibe una grabación (E): a tu hermano
        y a los demás se los llevaron al planeta de la Colmena.
        -> se abre la puerta hacia la cabina
     6. Ir a la cabina.
     7. JEFE: el Capitán (la puerta se cierra detrás de ti).
     8. Huir en una cápsula de escape rumbo al planeta (fin).
   Puntos de control: 0, 1, 3, 4, 6, 7 y 8.
   ========================================================= */

import * as THREE from 'three';
import { CONFIG } from './config.js';
import { otroPersonaje, textoPersonaje } from './personaje.js';

const C = CONFIG.nave;

/* La grabación de la consola: [segundo, texto, quién habla ('yo' = el personaje)] */
const GRABACION = [
  [0.0, 'REGISTRO DE CARGA · Humanos capturados en San Isidro: 214.', 'Grabación'],
  [4.0, 'Destino: el planeta de la Mente Colmena. Llegada: un ciclo.', 'Grabación'],
  [8.0, '{NOMBRE}… si escuchas esto… nos llevan a su planeta.', '{pareja}'],
  [12.5, 'Hay mucha gente conmigo. No vengas… es una trampa.', '{pareja}'],
  [17.0, 'Voy a ir de todas formas, {pareja}. Aguanta.', 'yo']
];
const FIN_GRABACION = 21;

export class MisionNave {
  constructor(enemigos, mundo, sonido) {
    this.enemigos = enemigos;
    this.mundo = mundo;
    this.sonido = sonido;
    this.alCambiar = () => {};
    this.alCompletar = () => {};
    this.alMensaje = () => {};
    this.alSubtitulo = () => {};
    this.alLogro = () => {};
    // Los motores avisan cuando les disparan
    this.mundo.motores.forEach((m) => { m.alDisparo = (motor, danio) => this.danioMotor(motor, danio); });
    this.reiniciar(0);
  }

  reiniciar(paso) {
    this.enemigos.limpiar();
    if (paso === 2) paso = 1;   // el sombrero no es punto de control (vuelves a la oleada)
    if (paso === 5) paso = 4;   // la grabación tampoco
    this.paso = paso;
    this.puntoControl = paso;
    this.estado = 'activo';
    this.oleada = [];
    this.jefe = null;
    this.esperaJefe = 0;
    this.tiempoAparicion = 2;
    this.grabacion = -1;          // segundos de la grabación (-1 = no suena)
    this.lineaGrabacion = 0;
    this.motoresPendientes = [];
    const M = this.mundo;
    // Puertas, motores, alarma y pistas según el paso
    M.puertas.armas.abrir(paso >= 3);
    M.puertas.motores.abrir(paso >= 6);
    M.puertas.cabina.abrir(paso !== 7);
    M.puertas.escape.abrir(paso >= 8);
    M.motores.forEach((m) => {
      m.vidaMax = C.vidaMotor;
      m.destruido = paso >= 5;
      m.vida = m.destruido ? 0 : C.vidaMotor;
    });
    M.alarma.activa = paso >= 5;
    M.consola.activa = paso === 5;
    M.sombrero.mat.color.setHex(otroPersonaje().sombrero);
    M.sombrero.mostrar(paso <= 2);
    this.iniciarPaso(paso, true);
  }

  puntoInicio() {
    const pts = [[0, 0, 0], [0, -46, 0], [0, -70, 0], [26, -70, -Math.PI / 2], [56, -70, -Math.PI / 2], [100, -88, -Math.PI / 2], [82, -104, 0], [82, -148, 0], [80, -172, Math.PI / 2]];
    const [x, z, yaw] = pts[Math.min(this.paso, pts.length - 1)];
    return { punto: new THREE.Vector3(x, 0, z), yaw };
  }

  iniciarPaso(paso, alReiniciar = false) {
    this.paso = paso;
    if (paso !== 2 && paso !== 5) this.puntoControl = paso;
    if (!alReiniciar && paso > 0) this.sonido.reproducir('objetivoCompletado');
    const M = this.mundo;
    if (paso === 0) {
      this.alSubtitulo('Estoy dentro de la nave… Estas cápsulas están vacías. ¿Dónde estás, {pareja}?', 5);
    } else if (paso === 1) {
      this.alMensaje('¡CUARTO DE ARMAS!', 2.5);
      this.alSubtitulo('Aquí guardan sus armas… y me estaban esperando.', 4);
      this.sonido.reproducir('oleadaInicia');
      this.oleada = C.oleadaArmas.map((tipo, i) => {
        const p = M.puntosAparicion.armas[i % M.puntosAparicion.armas.length];
        return this.enemigos.crear(tipo, { x: p.x + (Math.random() - 0.5) * 2, y: 0, z: p.z + (Math.random() - 0.5) * 2 });
      });
    } else if (paso === 2) {
      this.alSubtitulo('Algo brilla entre las cajas…', 4);
    } else if (paso === 3) {
      M.puertas.armas.abrir(true);
      if (!alReiniciar) this.sonido.reproducir('puertaNave', { x: 22, z: -70 });
      this.alSubtitulo(alReiniciar ? 'Hacia los motores. Si los apago, esta nave no se mueve.' : 'La puerta se abrió. Si apago los motores, esta nave no se va a ningún lado.', 5);
    } else if (paso === 4) {
      this.alMensaje('SABOTEA LOS 3 MOTORES', 3);
      this.alSubtitulo('Esos núcleos morados… ¡a dispararles!', 4);
    } else if (paso === 5) {
      M.alarma.activa = true;
      M.consola.activa = true;
      this.alMensaje('¡ALARMA! MENSAJE EN LA CONSOLA', 3);
      this.alSubtitulo('Esa consola… está recibiendo algo.', 4);
    } else if (paso === 6) {
      M.puertas.motores.abrir(true);
      if (!alReiniciar) this.sonido.reproducir('puertaNave', { x: 82, z: -100 });
      this.alSubtitulo(alReiniciar ? 'A la cabina. El que manda esta nave sabe dónde está {pareja}.' : 'La puerta de la cabina… El que manda esta nave me va a llevar con {pareja}.', 5);
    } else if (paso === 7) {
      M.puertas.cabina.abrir(false);
      this.sonido.reproducir('puertaNave', { x: 82, z: -140 });
      const P = M.lugares.cabina;
      this.jefe = this.enemigos.crear('capitan', { x: P.x, y: 0, z: P.z - 8 }, { mundo: M, centro: P });
      this.jefe.grupo.rotation.y = 0;
      this.alMensaje('¡EL CAPITÁN!', 3);
      this.alSubtitulo('Tú eres el que manda aquí. ¿Dónde está {pareja}?', 5);
    } else if (paso === 8) {
      M.puertas.cabina.abrir(true);
      M.puertas.escape.abrir(true);
      this.sonido.reproducir('puertaNave', { x: 52, z: -170 });
      this.alMensaje('¡A LAS CÁPSULAS DE ESCAPE!', 3);
      this.alSubtitulo(alReiniciar ? 'Una cápsula. Rumbo al planeta.' : 'La nave se cae a pedazos… ¡Una cápsula! Rumbo al planeta de la Colmena.', 5);
    }
  }

  /* Le dispararon a un motor */
  danioMotor(motor, danio) {
    if (this.paso !== 4 || motor.destruido) return;
    motor.vida -= danio;
    motor.parpadeo = 0.08;
    if (motor.vida <= 0) { motor.vida = 0; motor.destruido = true; this.motoresPendientes.push(motor); }
  }

  get motoresVivos() {
    return this.mundo.motores.filter((m) => !m.destruido).length;
  }

  objetivoPosicion() {
    const L = this.mundo.lugares;
    if (this.paso === 0) return L.armas;
    if (this.paso === 1) return null;
    if (this.paso === 2) return this.mundo.sombrero.posicion;
    if (this.paso === 3) return L.motores;
    if (this.paso === 4) return null;
    if (this.paso === 5) return this.grabacion >= 0 ? null : this.mundo.consola.posicion;
    if (this.paso === 6) return L.cabinaEntrada;
    if (this.paso === 7) return null;
    return L.escape;
  }

  oleadaViva() {
    return this.oleada.filter((e) => e.vivo).length;
  }

  textoObjetivo() {
    if (this.estado === 'completada') return { titulo: 'Etapa 4 · La nave nodriza', detalle: 'Escapaste rumbo al planeta.' };
    const t = 'Etapa 4 · La nave';
    if (this.paso === 0) return { titulo: t, detalle: 'Busca a tu hermano: ve al fondo del hangar' };
    if (this.paso === 1) return { titulo: 'Cuarto de armas', detalle: `Acaba con los aliens · Quedan ${this.oleadaViva()}` };
    if (this.paso === 2) return { titulo: 'Cuarto de armas', detalle: 'Revisa lo que brilla en el suelo (E)' };
    if (this.paso === 3) return { titulo: t, detalle: 'Ve a la sala de motores' };
    if (this.paso === 4) return { titulo: 'Sala de motores', detalle: `Destruye los núcleos de los motores · Quedan ${this.motoresVivos}` };
    if (this.paso === 5) return { titulo: 'Sala de motores', detalle: this.grabacion >= 0 ? 'Escucha la grabación…' : 'Revisa la consola (E)' };
    if (this.paso === 6) return { titulo: t, detalle: 'Ve a la cabina de mando' };
    if (this.paso === 7) return { titulo: 'Jefe', detalle: 'Derrota al Capitán' };
    return { titulo: 'Escape', detalle: 'Sube a la cápsula de escape' };
  }

  interactuables() {
    const M = this.mundo;
    if (this.paso === 2) {
      return [{ posicion: M.sombrero.posicion, radio: 2.5, texto: 'Revisar', accion: () => this.encontrarSombrero() }];
    }
    if (this.paso === 5 && this.grabacion < 0) {
      return [{ posicion: M.consola.posicion, radio: 3, texto: 'Revisar la consola', accion: () => this.escucharGrabacion() }];
    }
    if (this.paso === 8) {
      return [{ posicion: M.lugares.escape, radio: 3.5, texto: 'Subir a la cápsula', accion: () => this.completar() }];
    }
    return [];
  }

  encontrarSombrero() {
    this.mundo.sombrero.mostrar(false);
    if (this.alObjeto) this.alObjeto('sombrero');   // a la mochila (v0.8)
    this.sonido.reproducir('llaves');
    this.alMensaje(textoPersonaje('PISTA: EL SOMBRERO DE {PAREJA}'), 3.5);
    this.alSubtitulo('Es el sombrero de {pareja}… Estuvo aquí. Está vivo… tiene que estarlo.', 5);
    this.iniciarPaso(3);
  }

  escucharGrabacion() {
    this.grabacion = 0;
    if (this.alObjeto) this.alObjeto('grabacion');
    this.lineaGrabacion = 0;
    this.sonido.reproducir('holograma', { x: this.mundo.consola.posicion.x, z: this.mundo.consola.posicion.z });
    this.alMensaje('PISTA: UNA GRABACIÓN', 2.5);
  }

  completar() {
    if (this.estado === 'completada') return;
    this.estado = 'completada';
    this.enemigos.limpiar();
    this.sonido.reproducir('platilloSeVa');
    this.alSubtitulo('Aguanta, {pareja}. Ya casi llego.');
    this.alCambiar(this.textoObjetivo());
    this.alCompletar();
  }

  /* Zona de la nave donde está el jugador (para saber de dónde salen los aliens) */
  zona(p) {
    if (p.z > -20) return 'hangar';
    if (p.x < 22 && p.z > -92) return 'armas';
    if (p.z > -102) return 'motores';
    return 'cabina';
  }

  actualizar(dt, jugador) {
    if (this.estado === 'completada') return;
    const p = jugador.posicion;
    const M = this.mundo;

    // Aparición continua en el hangar (paso 0) y en los motores (paso 4)
    const zonaConfig = this.paso === 0 ? C.zonas.hangar : this.paso === 4 ? C.zonas.motores : null;
    this.tiempoAparicion -= dt;
    if (zonaConfig && this.tiempoAparicion <= 0) {
      if (this.enemigos.vivos < zonaConfig.maxVivos) {
        const tipo = zonaConfig.tipos[Math.floor(Math.random() * zonaConfig.tipos.length)];
        const punto = this.elegirPunto(this.paso === 0 ? 'hangar' : 'motores', jugador);
        if (punto) this.enemigos.crear(tipo, punto);
      }
      this.tiempoAparicion = zonaConfig.intervalo * (0.7 + Math.random() * 0.6);
    }

    // Motores que acaban de explotar
    while (this.motoresPendientes.length) {
      const m = this.motoresPendientes.shift();
      const pos = m.posicion.clone().setY(3.5);
      this.enemigos.efectos.explosion(pos, 5);
      this.enemigos.efectos.chispas(pos, 0xb36bff, 3);
      this.sonido.reproducir('motorRoto', { x: m.posicion.x, z: m.posicion.z });
      jugador.sacudida = Math.max(jugador.sacudida, 0.6);
      if (this.motoresVivos > 0) {
        this.alMensaje(`MOTOR DESTRUIDO · Quedan ${this.motoresVivos}`, 2.5);
      } else {
        this.alLogro('motores_fuera');
        this.sonido.reproducir('alarmaNave');
        this.iniciarPaso(5);
      }
    }

    if (this.paso === 0) {
      if (p.z < -52) this.iniciarPaso(1);
    } else if (this.paso === 1) {
      if (!this.oleadaViva()) this.iniciarPaso(2);
    } else if (this.paso === 3) {
      if (p.x > 54) this.iniciarPaso(4);
    } else if (this.paso === 5) {
      if (this.grabacion >= 0) {
        this.grabacion += dt;
        while (this.lineaGrabacion < GRABACION.length && this.grabacion >= GRABACION[this.lineaGrabacion][0]) {
          const [, texto, quien] = GRABACION[this.lineaGrabacion];
          this.alSubtitulo(texto, 4.2, quien === 'yo' ? null : quien);
          this.lineaGrabacion++;
        }
        if (this.grabacion >= FIN_GRABACION) { this.grabacion = -1; M.consola.activa = false; this.iniciarPaso(6); }
      }
      // La alarma suena cada tanto
      this.alarmaEspera = (this.alarmaEspera || 0) - dt;
      if (this.alarmaEspera <= 0) { this.alarmaEspera = 6; this.sonido.reproducir('alarmaNave'); }
    } else if (this.paso === 6) {
      if (p.z < -146) this.iniciarPaso(7);
    } else if (this.paso === 7) {
      if (this.jefe && !this.jefe.vivo) {
        this.esperaJefe += dt;
        if (this.esperaJefe > 3.5) this.iniciarPaso(8);
      }
    } else if (this.paso === 8) {
      if (p.distanceTo(M.lugares.escape) < 2.2) this.completar();
    }
    this.alCambiar(this.textoObjetivo());
  }

  /* Un punto de aparición de la zona, ni muy cerca ni muy lejos del jugador */
  elegirPunto(zona, jugador) {
    const candidatos = this.mundo.puntosAparicion[zona].filter((p) => {
      const d = p.distanceTo(jugador.posicion);
      return d > C.distanciaAparicionMin && d < C.distanciaAparicionMax;
    });
    if (!candidatos.length) return null;
    const p = candidatos[Math.floor(Math.random() * candidatos.length)];
    return { x: p.x + (Math.random() - 0.5) * 2, y: 0, z: p.z + (Math.random() - 0.5) * 2 };
  }
}
