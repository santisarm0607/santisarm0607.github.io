/* =========================================================
   GALAXY INVASION — misiones-carretera.js
   Reglas de la Etapa 2 (La carretera). Desde la v0.6:
     0. Manejar: Rosa viene de la granja en la camioneta.
        Hay grupos de aliens en la vía (se pueden atropellar).
     1. ¡Ataque! De la nada, el Lanzador salta desde el maizal,
        cae delante y destroza la camioneta. Rosa sale a pie.
     2. JEFE: pelea con el Lanzador junto a la camioneta rota.
     3. A pie hasta la entrada de la ciudad.
   Puntos de control: el 0 (manejando) y el 2 (la pelea).
   El muro de baba de la v0.5 ya no sale (sigue en el mapa,
   apagado, por si se quiere volver a usar).
   ========================================================= */

import * as THREE from 'three';
import { CONFIG } from './config.js';

const K = CONFIG.carretera;

export class MisionCarretera {
  constructor(enemigos, mundo, sonido, vehiculo) {
    this.enemigos = enemigos;
    this.mundo = mundo;
    this.sonido = sonido;
    this.vehiculo = vehiculo;
    this.alCambiar = () => {};
    this.alCompletar = () => {};
    this.alMensaje = () => {};
    this.alSubtitulo = () => {};
    this.alSacarDelAuto = () => {};   // main.js baja a Rosa (aunque la camioneta no se pueda usar)
    this.reiniciar(0);
  }

  reiniciar(paso) {
    this.enemigos.limpiar();
    this.mundo.limpiarObstaculos();
    if (paso === 1) paso = 0;          // la emboscada no es punto de control
    this.paso = paso;
    this.puntoControl = paso;
    this.estado = 'activo';
    this.lanzador = null;
    this.esperaFinal = 0;
    this.esperaBajarse = -1;
    // Grupos de la vía: los que ya pasaron no vuelven a salir
    const zControl = this.puntoInicio().punto.z;
    this.ultimoZ = zControl;
    this.grupos = K.grupos.map(([z, n, tipo]) => ({ z, n, tipo, salio: z > zControl + 5 }));
    this.mundo.muro.reiniciar(true);   // el muro de baba no sale
    this.mundo.ponerEscombros(paso === 2);
    this.mundo.barriles.forEach((b) => b.reiniciar());
    this.iniciarPaso(paso, true);
  }

  /* Dónde empieza Rosa en cada paso (y la camioneta) */
  puntoInicio() {
    const ini = this.mundo.inicioVehiculo;
    if (this.paso === 0) {
      return { punto: new THREE.Vector3(ini.x, 0, ini.z), yaw: ini.yaw, enVehiculo: true, vehiculo: { ...ini } };
    }
    // Junto a la camioneta destrozada
    const zAuto = K.zJefe + 24;
    if (this.paso === 2) return { punto: new THREE.Vector3(3, 0, zAuto - 3), yaw: 0, enVehiculo: false, vehiculo: { x: -1, z: zAuto, yaw: 0.25, averiada: true } };
    return { punto: new THREE.Vector3(2.5, 0, K.zJefe - 5), yaw: 0, enVehiculo: false, vehiculo: { x: -1, z: zAuto, yaw: 0.25, averiada: true } };
  }

  iniciarPaso(paso, alReiniciar = false) {
    this.paso = paso;
    if (paso !== 1) this.puntoControl = paso;
    if (paso === 0) {
      this.alSubtitulo(alReiniciar ? 'La ciudad está a 900 metros. Pie al fondo.' : 'Ya salí de la granja. Ahora, derecho a la ciudad.');
    } else if (paso === 1) {
      this.emboscada();
    } else if (paso === 2) {
      // Al reintentar: el Lanzador vuelve a caer del cielo junto a la camioneta rota
      if (alReiniciar) {
        this.lanzador = this.enemigos.crear('lanzador', { x: 0, y: 0, z: K.zJefe }, { modo: 'pelea' });
        this.sonido.reproducir('jefeAparece');
        this.alSubtitulo('Sin camioneta… Le voy a reventar esos sacos.', 4);
      }
      this.mundo.ponerEscombros(true);
    } else if (paso === 3) {
      this.mundo.ponerEscombros(false);
      if (!alReiniciar) this.sonido.reproducir('objetivoCompletado');
      this.alSubtitulo(alReiniciar ? 'La ciudad está ahí. A pie.' : '¡Lo tumbé! La camioneta no sirve… sigo a pie.');
    }
  }

  /* El Lanzador salta desde el maizal y cae delante de Rosa */
  emboscada() {
    const v = this.vehiculo;
    const enAuto = v.ocupado;
    const origen = enAuto ? v.posicion : null;
    // Dónde va a estar la camioneta cuando él aterrice (más unos metros adelante)
    let x, z;
    if (enAuto) {
      const avance = Math.max(0, v.velocidad) * K.tiempoSalto;
      const p = origen.clone().addScaledVector(v.adelante(), avance + 16);
      x = Math.max(-5, Math.min(5, p.x));
      z = p.z;
    } else {
      x = 0;
      z = Math.min(K.zJefe, this.ultimoZ - 20);
    }
    const lado = Math.random() < 0.5 ? -1 : 1;
    const desde = new THREE.Vector3(lado * 48, 0, z + 25);
    this.lanzador = this.enemigos.crear('lanzador', { x, y: 0, z }, { modo: 'pelea', salto: { desde, tiempo: K.tiempoSalto, altura: 16 } });
    this.lanzador.alAterrizar = () => this.aterrizo();
    this.sonido.reproducir('lanzadorRugido', { x: desde.x, z: desde.z });
    this.sonido.reproducir('alertaLanzamiento');
    this.alMensaje('¡CUIDADO!', 1.4);
  }

  /* Cayó: si Rosa va en la camioneta, la destroza */
  aterrizo() {
    const v = this.vehiculo;
    this.sonido.reproducir('jefeAparece');
    this.mundo.ponerEscombros(true);
    if (v.ocupado && !v.averiada) {
      v.averiar();
      this.enemigos.efectos.explosion(v.posicion.clone().addScaledVector(v.adelante(), 1.8).setY(1), 2.5);
      if (this.alGolpe) this.alGolpe(K.danioAtaque, this.lanzador.posicion);
      this.alMensaje('¡TE DESTROZÓ LA CAMIONETA!', 2.6);
      this.alSubtitulo('¡Mi camioneta! …Bueno. Tendrás que vértelas conmigo a pie.', 5);
      this.esperaBajarse = K.esperaBajarse;
    } else {
      this.alMensaje('¡EL LANZADOR!', 2.4);
      this.alSubtitulo('¿De dónde salió eso? ¡Es enorme!', 4);
      this.iniciarPaso(2);
    }
  }

  /* Flecha hacia el objetivo */
  objetivoPosicion() {
    const v = this.vehiculo;
    if (this.paso === 0) return v.ocupado || v.averiada ? null : v.posicion;
    if (this.paso === 3) return new THREE.Vector3(0, 0, K.zCiudad);
    return null;
  }

  textoObjetivo() {
    if (this.estado === 'completada') return { titulo: 'Etapa 2 · La carretera', detalle: 'Llegaste a la ciudad.' };
    const v = this.vehiculo;
    const z = v.ocupado ? v.posicion.z : this.ultimoZ;
    const metros = Math.max(0, Math.round(z - K.zCiudad));
    if (this.paso === 0) return { titulo: 'La carretera', detalle: v.ocupado ? `Maneja a la ciudad · ${metros} m` : 'Vuelve a la camioneta' };
    if (this.paso === 1) return { titulo: 'La carretera', detalle: '¡Algo viene!' };
    if (this.paso === 2) return { titulo: 'Jefe', detalle: v.ocupado ? 'Sal de la camioneta' : 'Derrota al Lanzador' };
    return { titulo: 'A la ciudad', detalle: `Sigue a pie · ${metros} m` };
  }

  /* Aquí no hay objetos de misión que usar (subir y bajar lo maneja main.js) */
  interactuables() { return []; }

  completar() {
    if (this.estado === 'completada') return;
    this.estado = 'completada';
    this.enemigos.limpiar();
    this.alSubtitulo('La ciudad… y encima, la nave. Ya casi.');
    this.alCambiar(this.textoObjetivo());
    this.alCompletar();
  }

  actualizar(dt, jugador) {
    if (this.estado === 'completada') return;
    const v = this.vehiculo;
    const z = jugador.posicion.z;
    this.ultimoZ = z;

    // Grupos que esperan en la vía: salen cuando Rosa se acerca (no durante el jefe)
    if (this.paso === 0 || this.paso === 3) {
      for (const g of this.grupos) {
        if (g.salio || z > g.z + 90) continue;
        g.salio = true;
        for (let i = 0; i < g.n; i++) {
          if (this.enemigos.vivos >= K.maxVivos) break;
          this.enemigos.crear(g.tipo, { x: (Math.random() - 0.5) * 12, y: 0, z: g.z + (Math.random() - 0.5) * 16 });
        }
      }
    }

    if (this.paso === 0) {
      if (z < K.zJefe + K.distanciaAtaque) this.iniciarPaso(1);
    } else if (this.paso === 1) {
      // Rosa sale sola de la camioneta destrozada
      if (this.esperaBajarse > 0) {
        this.esperaBajarse -= dt;
        if (this.esperaBajarse <= 0) {
          if (v.ocupado) this.alSacarDelAuto();
          this.iniciarPaso(2);
        }
      }
    } else if (this.paso === 2) {
      if (this.lanzador && !this.lanzador.vivo) {
        this.esperaFinal += dt;
        if (this.esperaFinal > 3.2) this.iniciarPaso(3);
      }
    } else if (this.paso === 3) {
      if (z < K.zCiudad) this.completar();
    }
    this.alCambiar(this.textoObjetivo());
  }
}
