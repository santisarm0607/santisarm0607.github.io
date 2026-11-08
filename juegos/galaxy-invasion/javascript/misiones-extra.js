/* =========================================================
   GALAXY INVASION — misiones-extra.js  (v0.8)
   Misiones EXTRA (opcionales) de cada etapa. Se descubren al
   acercarse: sale la tarjeta "MISIÓN EXTRA" y su marca en el
   minimapa. Dan premios: granadas, botiquines, armas buenas
   y objetos para la mochila.

   La granja tiene tres:
     - "Los Ortiz": los vecinos están encerrados en su granero
       y rodeados de babosos. Acaba con ellos y rescátalos (E).
     - "Nidos de la Colmena": 3 nidos que hacen nacer Babositos.
     - "Cofres escondidos": 3 cofres lejos (cabaña del cazador,
       el muelle de la laguna y detrás de la gasolinera).

   Lo que ya completaste queda guardado (datos.extras) hasta
   que empieces una partida nueva.
   ========================================================= */

import * as THREE from 'three';
import { CONFIG } from './config.js';

export class MisionesExtra {
  constructor(enemigos, mundo, sonido, hechas) {
    this.enemigos = enemigos;
    this.mundo = mundo;
    this.sonido = sonido;
    this.hechas = hechas;        // datos.extras: { id: true } (se guarda)
    this.defs = mundo.extras || null;
    // main.js pone estas funciones
    this.alTarjeta = () => {};   // (titulo, detalle)
    this.alMensaje = () => {};
    this.alSubtitulo = () => {};
    this.alPremio = () => {};    // (rareza, posicion): suelta un arma
    this.alGranadas = () => {};  // (cantidad)
    this.alBotiquines = () => {};
    this.alObjeto = () => {};    // (id) objeto para la mochila
    this.alLogro = () => {};
    this.alGuardar = () => {};
    this.lista = [];
    if (!this.defs) return;
    const d = this.defs;
    if (d.vecinos) this.lista.push(this.crearVecinos(d.vecinos));
    if (d.nidos) this.lista.push(this.crearNidos(d.nidos));
    if (d.cofresEscondidos) this.lista.push(this.crearCofres(d.cofresEscondidos));
  }

  /* ---------------- Los Ortiz (rescate) ---------------- */
  crearVecinos(v) {
    const m = {
      id: 'vecinos', nombre: 'Los Ortiz', detalle: 'Los vecinos están atrapados en su granero. Acaba con los babosos y rescátalos.',
      posicion: v.posicion, radioDescubrir: 60, descubierta: false, completa: !!this.hechas.vecinos,
      ataque: [], estado: 'esperando', tiempo: 0
    };
    v.modelos.forEach((g) => { g.visible = !m.completa; });
    m.actualizar = (dt, jugador) => {
      if (m.completa) return;
      if (m.estado === 'esperando' && m.descubierta) {
        // Llegan los babosos al granero
        m.estado = 'ataque';
        this.crearAtaque(m, v);
      }
      if (m.estado === 'ataque') {
        // Si se borraron (te moriste y la etapa se reinició), vuelven a salir
        if (m.ataque.some((e) => e.vivo && !this.enemigos.lista.includes(e))) this.crearAtaque(m, v);
        if (m.ataque.every((e) => !e.vivo)) {
          m.estado = 'libres';
          this.alMensaje('¡LOS ORTIZ ESTÁN A SALVO!', 2.5);
          this.alSubtitulo('¡Por aquí, {trato}! ¡Estamos en el granero!', 4, 'Marta');
        }
      }
      if (m.estado === 'yendose') {
        m.tiempo += dt;
        v.modelos.forEach((g, i) => {
          const dir = new THREE.Vector3(v.casa.x - g.position.x, 0, v.casa.z - g.position.z);
          if (dir.length() > 1) {
            dir.normalize();
            g.position.addScaledVector(dir, dt * 2.5);
            g.rotation.y = Math.atan2(-dir.x, -dir.z);
            const fase = Math.sin(m.tiempo * 9 + i);
            g.getObjectByName('pierna_izq').rotation.x = fase * 0.6;
            g.getObjectByName('pierna_der').rotation.x = -fase * 0.6;
          } else {
            g.visible = false;
          }
        });
        if (m.tiempo > 30) { v.modelos.forEach((g) => { g.visible = false; }); m.estado = 'fin'; }
      }
    };
    m.interactuables = () => (m.estado === 'libres' ? [{ posicion: v.posicion, radio: 4, texto: 'Rescatar a los Ortiz', accion: () => this.rescatarVecinos(m) }] : []);
    m.marcas = () => (m.completa && m.estado !== 'yendose' ? [] : [{ x: v.posicion.x, z: v.posicion.z, color: '#4de1ff', borde: m.descubierta }]);
    m.progreso = () => (m.estado === 'libres' ? 'Rescátalos (E)' : `Quedan ${m.ataque.filter((e) => e.vivo).length} babosos`);
    return m;
  }

  crearAtaque(m, v) {
    m.ataque = v.ataque.map((p, i) => this.enemigos.crear(i === 2 ? 'baboson' : 'babosito', { x: p.x, y: 0, z: p.z }));
  }

  rescatarVecinos(m) {
    m.completa = true;
    m.estado = 'yendose';
    m.tiempo = 0;
    this.hechas.vecinos = true;
    this.sonido.reproducir('vecinosGracias');
    this.alSubtitulo('¡Gracias, {trato}! Pensamos que no la contábamos. Tome, lléveselo todo.', 4.5, 'Don Julio');
    setTimeout(() => this.alSubtitulo('Vimos un platillo llevarse a alguien hacia la ciudad… ¿era {pareja}?', 4.5, 'Marta'), 4600);
    this.alBotiquines(2);
    this.alGranadas(2);
    this.alObjeto('carta');
    this.alTarjeta('Los Ortiz', 'COMPLETADA · +2 botiquines, +2 granadas y una carta en tu mochila', true);
    this.alLogro('buen_vecino');
    this.revisarTodas();
    this.alGuardar();
  }

  /* ---------------- Nidos de la Colmena ---------------- */
  crearNidos(puntos) {
    const m = {
      id: 'nidos', nombre: 'Nidos de la Colmena', detalle: 'Hay 3 nidos haciendo nacer babosos. Destrúyelos (las granadas sirven).',
      posicion: puntos[0], radioDescubrir: 55, descubierta: false, completa: !!this.hechas.nidos,
      nidos: puntos.map((p, i) => ({ punto: p, enemigo: null, destruido: !!this.hechas.nidos || !!this.hechas['nido_' + i] }))
    };
    const crear = (n) => { n.enemigo = this.enemigos.crear('nido', { x: n.punto.x, y: 0, z: n.punto.z }); };
    m.actualizar = (dt, jugador) => {
      if (m.completa) return;
      for (const [i, n] of m.nidos.entries()) {
        if (n.destruido) continue;
        // Se descubre al acercarse a CUALQUIERA de los nidos
        if (!m.descubierta && Math.hypot(n.punto.x - jugador.posicion.x, n.punto.z - jugador.posicion.z) < m.radioDescubrir) this.descubrir(m);
        if (!n.enemigo || (n.enemigo.vivo && !this.enemigos.lista.includes(n.enemigo))) { crear(n); continue; }
        if (!n.enemigo.vivo) {
          n.destruido = true;
          this.hechas['nido_' + i] = true;
          const quedan = m.nidos.filter((x) => !x.destruido).length;
          this.alMensaje(quedan ? `NIDO DESTRUIDO · Quedan ${quedan}` : '¡TODOS LOS NIDOS DESTRUIDOS!', 2.6);
          if (!quedan) {
            m.completa = true;
            this.hechas.nidos = true;
            this.alGranadas(3);
            this.alObjeto('nidoMuestra');
            this.alPremio('epica', n.punto.clone());
            this.alTarjeta('Nidos de la Colmena', 'COMPLETADA · +3 granadas y un arma épica junto al último nido', true);
            this.alLogro('sin_nidos');
            this.revisarTodas();
          }
          this.alGuardar();
        }
      }
    };
    m.interactuables = () => [];
    m.marcas = () => m.nidos.filter((n) => !n.destruido).map((n) => ({ x: n.punto.x, z: n.punto.z, color: '#b36bff', borde: m.descubierta }));
    m.progreso = () => `Quedan ${m.nidos.filter((n) => !n.destruido).length} nidos`;
    m.esNidos = true;
    return m;
  }

  /* ---------------- Cofres escondidos ---------------- */
  crearCofres(indices) {
    const cofres = indices.map((i) => this.mundo.cofres[i]).filter(Boolean);
    const m = {
      id: 'cofres', nombre: 'Cofres escondidos', detalle: 'Hay 3 cofres con armas buenas escondidos lejos de la granja.',
      posicion: cofres[0].posicion, radioDescubrir: 0, descubierta: false, completa: !!this.hechas.cofres, cofres
    };
    // Los que ya abriste siguen abiertos
    const aplicar = () => cofres.forEach((c, i) => { if (this.hechas['cofre_' + i]) c.abierto = true; });
    aplicar();
    m.reaplicar = aplicar;
    m.actualizar = (dt, jugador) => {
      if (m.completa) return;
      cofres.forEach((c, i) => {
        if (c.abierto && !this.hechas['cofre_' + i]) {
          this.hechas['cofre_' + i] = true;
          const n = cofres.filter((_, j) => this.hechas['cofre_' + j]).length;
          if (!m.descubierta) this.descubrir(m);
          this.alMensaje(`COFRE ESCONDIDO ${n} / ${cofres.length}`, 2.5);
          if (n >= cofres.length) {
            m.completa = true;
            this.hechas.cofres = true;
            this.alGranadas(2);
            this.alTarjeta('Cofres escondidos', 'COMPLETADA · +2 granadas', true);
            this.alLogro('buscador');
            this.revisarTodas();
          }
          this.alGuardar();
        }
      });
    };
    m.interactuables = () => [];
    // Solo se ven en el minimapa cuando estás cerca (están escondidos)
    m.marcas = (jugador) => cofres.filter((c, i) => !this.hechas['cofre_' + i] && Math.hypot(c.posicion.x - jugador.posicion.x, c.posicion.z - jugador.posicion.z) < 35)
      .map((c) => ({ x: c.posicion.x, z: c.posicion.z, color: '#ffc65c', borde: false }));
    m.progreso = () => `${cofres.filter((_, j) => this.hechas['cofre_' + j]).length} / ${cofres.length} encontrados`;
    return m;
  }

  /* ---------------- Comunes ---------------- */
  descubrir(m) {
    if (m.descubierta) return;
    m.descubierta = true;
    this.sonido.reproducir('misionExtra');
    this.alTarjeta(m.nombre, m.detalle, true);
  }

  revisarTodas() {
    if (this.lista.length && this.lista.every((m) => m.completa)) this.alLogro('alrededores');
  }

  /* Cofres: al reiniciar la etapa se cierran todos; los escondidos que ya abriste se quedan abiertos */
  alReiniciarObjetos() {
    this.lista.forEach((m) => { if (m.reaplicar) m.reaplicar(); });
  }

  actualizar(dt, jugador) {
    for (const m of this.lista) {
      if (!m.descubierta && !m.completa && m.radioDescubrir && Math.hypot(m.posicion.x - jugador.posicion.x, m.posicion.z - jugador.posicion.z) < m.radioDescubrir) this.descubrir(m);
      m.actualizar(dt, jugador);
    }
  }

  interactuables() {
    return this.lista.flatMap((m) => m.interactuables());
  }

  marcas(jugador) {
    return this.lista.flatMap((m) => m.marcas(jugador));
  }

  /* Texto para la lista del HUD: solo las descubiertas y sin terminar */
  pendientes() {
    return this.lista.filter((m) => m.descubierta && !m.completa).map((m) => ({ nombre: m.nombre, progreso: m.progreso() }));
  }
}
