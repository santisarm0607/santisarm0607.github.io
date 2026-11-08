/* =========================================================
   GALAXY INVASION — sonido.js
   Todos los sonidos y la música hechos con código (Web Audio).
   Cada sonido tiene un nombre de archivo en ARCHIVOS: si un día
   pones tus propios sonidos en la carpeta "sonidos/" y activas
   CONFIG.audio.usarArchivos, el juego usa tus archivos y deja
   de usar los sonidos hechos con código.
   ========================================================= */

import { CONFIG } from './config.js';

/* Nombre del archivo de cada sonido (ver la Guía de sonidos) */
export const ARCHIVOS = {
  disparoPistola: 'sfx_pistola_disparo.mp3',
  sinMunicion: 'sfx_pistola_vacia.mp3',
  recarga: 'sfx_pistola_recarga.mp3',
  impactoAlien: 'sfx_impacto_alien.mp3',
  impactoPared: 'sfx_impacto_pared.mp3',
  marcaImpacto: 'sfx_marca_impacto.mp3',
  alienAparece: 'sfx_zangano_aparece.mp3',
  alienAtaque: 'sfx_zangano_ataque.mp3',
  alienMuere: 'sfx_zangano_muere.mp3',
  alienChillido: 'sfx_zangano_chillido.mp3',
  jugadorHerido: 'sfx_jugador_herido.mp3',
  escudoRoto: 'sfx_escudo_roto.mp3',
  escudoRecarga: 'sfx_escudo_recarga.mp3',
  paso: 'sfx_paso.mp3',
  salto: 'sfx_salto.mp3',
  aterrizaje: 'sfx_aterrizaje.mp3',
  abrirCofre: 'sfx_cofre_abrir.mp3',
  recogerMunicion: 'sfx_recoger_municion.mp3',
  recogerBotiquin: 'sfx_recoger_botiquin.mp3',
  oleadaInicia: 'sfx_oleada_inicia.mp3',
  oleadaSuperada: 'sfx_oleada_superada.mp3',
  victoria: 'sfx_victoria.mp3',
  derrota: 'sfx_derrota.mp3',
  logro: 'sfx_logro.mp3',
  uiClic: 'sfx_ui_clic.mp3',
  uiEncima: 'sfx_ui_encima.mp3',
  // --- Nuevos en la v0.2 ---
  escopetaDisparo: 'sfx_escopeta_disparo.mp3',
  escopetaRecarga: 'sfx_escopeta_recarga.mp3',
  rifleDisparo: 'sfx_rifle_disparo.mp3',
  rifleRecarga: 'sfx_rifle_recarga.mp3',
  cambioArma: 'sfx_cambio_arma.mp3',
  babosoAparece: 'sfx_baboso_aparece.mp3',
  babositoChillido: 'sfx_babosito_chillido.mp3',
  babositoAtaque: 'sfx_babosito_ataque.mp3',
  babositoMuere: 'sfx_babosito_muere.mp3',
  babosonRugido: 'sfx_baboson_rugido.mp3',
  babosonGolpe: 'sfx_baboson_golpe.mp3',
  babosonEscupe: 'sfx_baboson_escupe.mp3',
  babosonMuere: 'sfx_baboson_muere.mp3',
  impactoBaba: 'sfx_impacto_baba.mp3',
  babaImpacto: 'sfx_escupitajo_cae.mp3',
  pisarBaba: 'sfx_pisar_baba.mp3',
  armaNueva: 'sfx_arma_nueva.mp3',
  armaLegendaria: 'sfx_arma_legendaria.mp3',
  vidaLlena: 'sfx_vida_llena.mp3',
  objetivoCompletado: 'sfx_objetivo_completado.mp3',
  llaves: 'sfx_llaves.mp3',
  motor: 'sfx_camioneta_motor.mp3',
  // --- Nuevos en la v0.3 (la Bestia de Heno y los barriles) ---
  explosion: 'sfx_explosion.mp3',
  fuego: 'sfx_fuego.mp3',
  jefeAparece: 'sfx_jefe_aparece.mp3',
  bestiaRugido: 'sfx_bestia_rugido.mp3',
  bestiaMuere: 'sfx_bestia_muere.mp3',
  golpeHeno: 'sfx_golpe_heno.mp3',
  golpeSuelo: 'sfx_golpe_suelo.mp3',
  lanzar: 'sfx_lanzar.mp3',
  pacaCae: 'sfx_paca_cae.mp3',
  embestida: 'sfx_embestida.mp3',
  choqueFuerte: 'sfx_choque_fuerte.mp3',
  nucleoExpuesto: 'sfx_nucleo_expuesto.mp3',
  // --- Nuevos en la v0.4 (la carretera y el Lanzador) ---
  subirCamioneta: 'sfx_camioneta_subir.mp3',
  bajarCamioneta: 'sfx_camioneta_bajar.mp3',
  choqueCamioneta: 'sfx_camioneta_choque.mp3',
  atropello: 'sfx_atropello.mp3',
  alertaLanzamiento: 'sfx_alerta_lanzamiento.mp3',
  rocaCae: 'sfx_roca_cae.mp3',
  golpeRoca: 'sfx_golpe_roca.mp3',
  lanzadorRugido: 'sfx_lanzador_rugido.mp3',
  lanzadorPaso: 'sfx_lanzador_paso.mp3',
  sacoRevienta: 'sfx_saco_revienta.mp3',
  lanzadorMuere: 'sfx_lanzador_muere.mp3',
  muroBaba: 'sfx_muro_baba.mp3',
  // --- Nuevos en la v0.5 (la ciudad y el Guardián) ---
  plasmaDisparo: 'sfx_plasma_disparo.mp3',
  impactoPlasma: 'sfx_plasma_impacto.mp3',
  soldadoAlienGrito: 'sfx_soldado_alien_grito.mp3',
  soldadoAlienMuere: 'sfx_soldado_alien_muere.mp3',
  brutoRugido: 'sfx_bruto_rugido.mp3',
  brutoMuere: 'sfx_bruto_muere.mp3',
  aliadoDisparo: 'sfx_aliado_disparo.mp3',
  aliadoRescatado: 'sfx_aliado_rescatado.mp3',
  escudoGolpe: 'sfx_escudo_guardian_golpe.mp3',
  escudoCae: 'sfx_escudo_guardian_cae.mp3',
  generadorRoto: 'sfx_generador_roto.mp3',
  laserCarga: 'sfx_laser_carga.mp3',
  laser: 'sfx_laser.mp3',
  orbe: 'sfx_orbe.mp3',
  guardianRugido: 'sfx_guardian_rugido.mp3',
  guardianMuere: 'sfx_guardian_muere.mp3',
  rayoNave: 'sfx_rayo_nave.mp3',
  // Escena del secuestro (v0.6.4)
  platilloLlega: 'sfx_platillo_llega.mp3',
  abduccion: 'sfx_abduccion.mp3',
  platilloSeVa: 'sfx_platillo_se_va.mp3',
  // La nave nodriza (v0.7)
  puertaNave: 'sfx_puerta_nave.mp3',
  motorRoto: 'sfx_motor_roto.mp3',
  alarmaNave: 'sfx_alarma_nave.mp3',
  holograma: 'sfx_holograma.mp3',
  teletransporte: 'sfx_teletransporte.mp3',
  capitanRisa: 'sfx_capitan_risa.mp3',
  capitanMuere: 'sfx_capitan_muere.mp3',
  // v0.8: presentaciones, misiones, granadas, golpe y mochila
  presentacion: 'sfx_presentacion.mp3',
  misionNueva: 'sfx_mision_nueva.mp3',
  misionExtra: 'sfx_mision_extra.mp3',
  granadaLanzar: 'sfx_granada_lanzar.mp3',
  granadaRebote: 'sfx_granada_rebote.mp3',
  golpeAire: 'sfx_golpe_aire.mp3',
  golpeCarne: 'sfx_golpe_carne.mp3',
  mochila: 'sfx_mochila.mp3',
  curarse: 'sfx_curarse.mp3',
  nidoLate: 'sfx_nido_late.mp3',
  nidoMuere: 'sfx_nido_muere.mp3',
  vecinosGracias: 'sfx_vecinos_gracias.mp3'
};

export const ARCHIVOS_MUSICA = {
  menu: 'musica_menu.mp3',
  exploracion: 'musica_exploracion.mp3',
  combate: 'musica_combate.mp3',
  jefe: 'musica_jefe.mp3'
};

/* Notas (frecuencias en Hz) que usa la música: escala de Re menor */
const NOTA = {
  D1: 36.71, A1: 55.0, D2: 73.42, F2: 87.31, G2: 98.0, A2: 110.0, Bb2: 116.54, C3: 130.81,
  D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.0, A3: 220.0, Bb3: 233.08, C4: 261.63, Cs4: 277.18,
  D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0, Bb4: 466.16, C5: 523.25, D5: 587.33,
  E5: 659.25, F5: 698.46, A5: 880.0
};

export class Sonido {
  constructor() {
    this.ctx = null;
    this.buffers = {};
    this.oyente = { x: 0, z: 0, yaw: 0 };  // dónde está el jugador (para sonidos con dirección)
    this.pistaActual = null;
    this.paso16 = 0;
    this.proximoTiempo = 0;
    this.alternarPaso = false;
  }

  /* Se llama al primer clic (los navegadores no dejan sonar antes) */
  iniciar() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const Contexto = window.AudioContext || window.webkitAudioContext;
    if (!Contexto) return;
    this.ctx = new Contexto();
    const ctx = this.ctx;

    // Cadena: efectos / música -> compresor -> parlantes
    this.compresor = ctx.createDynamicsCompressor();
    this.compresor.threshold.value = -14;
    this.compresor.ratio.value = 4;
    this.compresor.connect(ctx.destination);
    this.efectos = ctx.createGain();
    this.efectos.connect(this.compresor);
    this.musicaGeneral = ctx.createGain();
    this.musicaGeneral.connect(this.compresor);

    // Una "pista" por cada música, para poder mezclar entre ellas
    this.pistas = {};
    ['menu', 'exploracion', 'combate', 'jefe'].forEach((nombre) => {
      const g = ctx.createGain();
      g.gain.value = 0;
      g.connect(this.musicaGeneral);
      this.pistas[nombre] = g;
    });

    // Ruido blanco (base de disparos, golpes y percusión)
    const largo = ctx.sampleRate;
    this.bufferRuido = ctx.createBuffer(1, largo, ctx.sampleRate);
    const datos = this.bufferRuido.getChannelData(0);
    for (let i = 0; i < largo; i++) datos[i] = Math.random() * 2 - 1;

    this.volumenes(CONFIG.opcionesIniciales.musica, CONFIG.opcionesIniciales.efectos);
    if (this.volPendiente) this.volumenes(...this.volPendiente);
    if (CONFIG.audio.usarArchivos) this.cargarArchivos();

    if (this.pistaPendiente !== undefined) this.musica(this.pistaPendiente);

    // Reloj de la música (revisa cada 25 ms qué notas tocar)
    this.proximoTiempo = ctx.currentTime + 0.1;
    setInterval(() => this.programarMusica(), 25);

    // Pausar el audio si se cambia de pestaña
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) this.ctx.suspend(); else this.ctx.resume();
    });
  }

  /* Volumen de 0 a 100 */
  volumenes(musica, efectos) {
    this.ultimoVolMusica = musica / 100;
    if (!this.ctx) { this.volPendiente = [musica, efectos]; return; }
    const t = this.ctx.currentTime;
    this.musicaGeneral.gain.setTargetAtTime((musica / 100) * 0.55, t, 0.05);
    this.efectos.gain.setTargetAtTime((efectos / 100) * 0.9, t, 0.05);
  }

  /* Carga tus archivos de sonido (solo si usarArchivos = true) */
  async cargarArchivos() {
    const todos = { ...ARCHIVOS, ...Object.fromEntries(Object.entries(ARCHIVOS_MUSICA).map(([k, v]) => ['musica_' + k, v])) };
    for (const [id, archivo] of Object.entries(todos)) {
      try {
        const resp = await fetch(CONFIG.audio.carpeta + archivo);
        if (!resp.ok) continue;
        this.buffers[id] = await this.ctx.decodeAudioData(await resp.arrayBuffer());
      } catch (e) { /* si falta un archivo, se usa el sonido hecho con código */ }
    }
  }

  /* =========================================================
     HERRAMIENTAS PARA FABRICAR SONIDOS
     ========================================================= */

  /* Salida con dirección: suena más a la izquierda o derecha y más bajito si está lejos */
  salida(x, z) {
    if (x === undefined || !this.ctx.createStereoPanner) return this.efectos;
    const dx = x - this.oyente.x;
    const dz = z - this.oyente.z;
    const d = Math.hypot(dx, dz) || 0.001;
    const derechaX = Math.cos(this.oyente.yaw);
    const derechaZ = -Math.sin(this.oyente.yaw);
    const paneo = Math.max(-1, Math.min(1, (dx * derechaX + dz * derechaZ) / d));
    const ganancia = this.ctx.createGain();
    ganancia.gain.value = 1 / (1 + d * 0.09);
    const panner = this.ctx.createStereoPanner();
    panner.pan.value = paneo * 0.8;
    ganancia.connect(panner);
    panner.connect(this.efectos);
    return ganancia;
  }

  /* Un tono: forma de onda, frecuencia inicial y final, duración y volumen */
  tono({ tipo = 'sine', f0, f1 = f0, dur, vol = 0.3, inicio = 0, destino, ataque = 0.005 }) {
    const ctx = this.ctx;
    const t = ctx.currentTime + inicio;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = tipo;
    osc.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + ataque);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(destino || this.efectos);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  /* Ruido filtrado: para disparos, golpes, viento... */
  ruido({ dur, vol = 0.3, tipoFiltro = 'lowpass', f0 = 2000, f1 = f0, q = 1, inicio = 0, destino }) {
    const ctx = this.ctx;
    const t = ctx.currentTime + inicio;
    const fuente = ctx.createBufferSource();
    fuente.buffer = this.bufferRuido;
    const filtro = ctx.createBiquadFilter();
    filtro.type = tipoFiltro;
    filtro.Q.value = q;
    filtro.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) filtro.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    fuente.connect(filtro);
    filtro.connect(g);
    g.connect(destino || this.efectos);
    fuente.start(t, Math.random() * 0.5);
    fuente.stop(t + dur + 0.05);
  }

  /* =========================================================
     REPRODUCIR UN SONIDO POR SU NOMBRE
     opciones: { x, z } para sonidos con dirección (aliens)
     ========================================================= */
  reproducir(id, opciones = {}) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const destino = this.salida(opciones.x, opciones.z);
    // ¿Hay archivo propio? Entonces lo usamos
    if (this.buffers[id]) {
      const fuente = this.ctx.createBufferSource();
      fuente.buffer = this.buffers[id];
      fuente.connect(destino);
      fuente.start();
      return;
    }
    const fabrica = this.sintetizados[id];
    if (fabrica) fabrica.call(this, destino);
  }

  /* =========================================================
     MÚSICA: menu, exploracion, combate (o null para silencio)
     ========================================================= */
  musica(nombre) {
    if (!this.ctx) { this.pistaPendiente = nombre; return; }
    if (this.pistaActual === nombre) return;
    this.pistaActual = nombre;
    const t = this.ctx.currentTime;
    Object.entries(this.pistas).forEach(([n, g]) => {
      g.gain.cancelScheduledValues(t);
      g.gain.setTargetAtTime(n === nombre ? 1 : 0, t, n === nombre ? 0.6 : 0.8);
    });
    // Si hay archivo de música propio, se toca en bucle
    if (this.fuenteMusica) { try { this.fuenteMusica.stop(); } catch (e) { /* ya paró */ } this.fuenteMusica = null; }
    if (nombre && this.buffers['musica_' + nombre]) {
      const f = this.ctx.createBufferSource();
      f.buffer = this.buffers['musica_' + nombre];
      f.loop = true;
      f.connect(this.pistas[nombre]);
      f.start();
      this.fuenteMusica = f;
    }
  }

  /* Baja la música (por ejemplo en pausa) */
  atenuarMusica(atenuar) {
    if (!this.ctx) return;
    const vol = (this.ultimoVolMusica ?? 0.5) * 0.55;
    this.musicaGeneral.gain.setTargetAtTime(atenuar ? vol * 0.3 : vol, this.ctx.currentTime, 0.2);
  }

  /* Programa las notas que vienen (cada paso = una semicorchea) */
  programarMusica() {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const duracionPaso = 60 / CONFIG.audio.bpmCombate / 4;
    while (this.proximoTiempo < this.ctx.currentTime + 0.12) {
      const paso = this.paso16;
      const t = this.proximoTiempo;
      // Solo se fabrican notas de la pista que suena y no tiene archivo propio
      const p = this.pistaActual;
      if (p && !this.buffers['musica_' + p]) {
        if (p === 'menu') this.pasoMenu(paso, t, duracionPaso);
        if (p === 'exploracion') this.pasoExploracion(paso, t, duracionPaso);
        if (p === 'combate') this.pasoCombate(paso, t, duracionPaso);
        if (p === 'jefe') this.pasoJefe(paso, t, duracionPaso);
      }
      this.paso16++;
      this.proximoTiempo += duracionPaso;
    }
  }

  /* Nota musical programada en un tiempo exacto */
  notaMusica(pista, { tipo = 'sawtooth', f, t, dur, vol = 0.1, filtro = 1200, ataque = 0.01, desafinar = 0 }) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.type = tipo;
    osc.frequency.value = f;
    osc.detune.value = desafinar;
    const fil = ctx.createBiquadFilter();
    fil.type = 'lowpass';
    fil.frequency.value = filtro;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + ataque);
    g.gain.setValueAtTime(vol, t + Math.max(ataque, dur * 0.6));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(fil); fil.connect(g); g.connect(this.pistas[pista]);
    osc.start(t); osc.stop(t + dur + 0.05);
  }

  /* Golpe de batería con ruido */
  percusion(pista, t, { dur, vol, tipoFiltro, f }) {
    const ctx = this.ctx;
    const fuente = ctx.createBufferSource();
    fuente.buffer = this.bufferRuido;
    const fil = ctx.createBiquadFilter();
    fil.type = tipoFiltro; fil.frequency.value = f;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    fuente.connect(fil); fil.connect(g); g.connect(this.pistas[pista]);
    fuente.start(t, Math.random() * 0.5); fuente.stop(t + dur + 0.02);
  }

  /* MENÚ: acordes lentos y misteriosos (Re menor - Si bemol - Sol menor - La) */
  pasoMenu(paso, t, dp) {
    const acordes = [
      [NOTA.D3, NOTA.F3, NOTA.A3], [NOTA.Bb2, NOTA.D3, NOTA.F3],
      [NOTA.G2, NOTA.Bb2, NOTA.D3], [NOTA.A2, NOTA.Cs4 / 2, NOTA.E3]
    ];
    const acorde = acordes[Math.floor(paso / 32) % 4];
    if (paso % 32 === 0) {
      acorde.forEach((f, i) => {
        this.notaMusica('menu', { f, t, dur: dp * 33, vol: 0.05, filtro: 700, ataque: 1.2, desafinar: i * 6 - 6 });
        this.notaMusica('menu', { f: f * 2, t, dur: dp * 33, vol: 0.02, filtro: 900, ataque: 1.5, desafinar: 8 });
      });
      this.notaMusica('menu', { tipo: 'sine', f: acorde[0] / 2, t, dur: dp * 33, vol: 0.12, filtro: 300, ataque: 0.8 });
    }
    // Arpegio suave
    if (paso % 4 === 0) {
      const f = acorde[(paso / 4) % 3] * 4;
      this.notaMusica('menu', { tipo: 'triangle', f, t, dur: dp * 3, vol: 0.035, filtro: 3000 });
    }
  }

  /* EXPLORACIÓN: zumbido grave y campanitas extrañas (suspenso) */
  pasoExploracion(paso, t, dp) {
    if (paso % 64 === 0) {
      this.notaMusica('exploracion', { f: NOTA.D1 * 2, t, dur: dp * 66, vol: 0.09, filtro: 260, ataque: 2 });
      this.notaMusica('exploracion', { f: NOTA.A1 * 2, t, dur: dp * 66, vol: 0.05, filtro: 220, ataque: 2.5, desafinar: 7 });
    }
    if (paso % 16 === 8 && Math.random() < 0.35) {
      const notas = [NOTA.D5, NOTA.F5, NOTA.A5, NOTA.E5, NOTA.C5];
      this.notaMusica('exploracion', { tipo: 'sine', f: notas[Math.floor(Math.random() * notas.length)], t, dur: 2.4, vol: 0.03, filtro: 5000, ataque: 0.01 });
    }
    if (paso % 128 === 96) {
      // Un "suspiro" alien lejano
      this.notaMusica('exploracion', { tipo: 'triangle', f: NOTA.A3, t, dur: 3, vol: 0.02, filtro: 900, ataque: 1, desafinar: -40 });
    }
  }

  /* JEFE: como el combate pero más pesado: doble bombo, bajo que sube y una alarma */
  pasoJefe(paso, t, dp) {
    const p = paso % 16;
    const compas = Math.floor(paso / 16) % 4;
    if (p % 2 === 0 || p === 15) this.bombo('jefe', t, 0.55);
    if (p === 4 || p === 12) this.percusion('jefe', t, { dur: 0.2, vol: 0.32, tipoFiltro: 'bandpass', f: 1500 });
    this.percusion('jefe', t, { dur: 0.03, vol: 0.05, tipoFiltro: 'highpass', f: 8000 });
    const raiz = [NOTA.D2, NOTA.F2, NOTA.G2, NOTA.A2][compas];
    this.notaMusica('jefe', { f: p % 2 ? raiz * 2 : raiz, t, dur: dp * 0.9, vol: 0.14, filtro: 700 });
    if (p === 0) [1, 1.19, 1.41].forEach((m) => this.notaMusica('jefe', { tipo: 'sawtooth', f: raiz * 4 * m, t, dur: dp * 6, vol: 0.03, filtro: 1600 }));
    if (compas === 3 && p % 4 === 0) this.notaMusica('jefe', { tipo: 'square', f: p % 8 ? NOTA.A4 : NOTA.Bb4, t, dur: dp * 3, vol: 0.03, filtro: 3000 });
  }

  /* Bombo de batería */
  bombo(pista, t, vol) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    osc.connect(g); g.connect(this.pistas[pista]);
    osc.start(t); osc.stop(t + 0.22);
  }

  /* MOTOR DE LA CAMIONETA: sonido continuo que sube de tono con la velocidad.
     velocidad en m/s; null lo apaga */
  motorContinuo(velocidad) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    if (velocidad === null) {
      if (this.nodoMotor) {
        const t = this.ctx.currentTime;
        this.nodoMotor.g.gain.setTargetAtTime(0, t, 0.1);
        const n = this.nodoMotor;
        setTimeout(() => { try { n.osc.stop(); n.osc2.stop(); } catch (e) { /* ya paró */ } }, 400);
        this.nodoMotor = null;
      }
      return;
    }
    if (!this.nodoMotor) {
      const ctx = this.ctx;
      const osc = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const fil = ctx.createBiquadFilter();
      const g = ctx.createGain();
      osc.type = 'sawtooth'; osc2.type = 'square';
      fil.type = 'lowpass'; fil.frequency.value = 420;
      g.gain.value = 0;
      osc.connect(fil); osc2.connect(fil); fil.connect(g); g.connect(this.efectos);
      osc.start(); osc2.start();
      this.nodoMotor = { osc, osc2, fil, g };
    }
    const v = Math.abs(velocidad);
    const t = this.ctx.currentTime;
    const f = 38 + v * 3.2;
    this.nodoMotor.osc.frequency.setTargetAtTime(f, t, 0.1);
    this.nodoMotor.osc2.frequency.setTargetAtTime(f * 0.5, t, 0.1);
    this.nodoMotor.fil.frequency.setTargetAtTime(300 + v * 25, t, 0.1);
    this.nodoMotor.g.gain.setTargetAtTime(0.07 + Math.min(v, 25) * 0.003, t, 0.1);
  }

  /* COMBATE: batería, bajo rápido y golpes de sintetizador */
  pasoCombate(paso, t, dp) {
    const p = paso % 16;
    const compas = Math.floor(paso / 16) % 4;
    // Bombo
    if (p === 0 || p === 4 || p === 8 || p === 12 || p === 10) {
      const ctx = this.ctx;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.frequency.setValueAtTime(140, t);
      osc.frequency.exponentialRampToValueAtTime(45, t + 0.12);
      g.gain.setValueAtTime(0.5, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      osc.connect(g); g.connect(this.pistas.combate);
      osc.start(t); osc.stop(t + 0.22);
    }
    // Caja
    if (p === 4 || p === 12) this.percusion('combate', t, { dur: 0.16, vol: 0.28, tipoFiltro: 'bandpass', f: 1800 });
    // Platillo
    if (p % 2 === 0) this.percusion('combate', t, { dur: 0.04, vol: 0.06, tipoFiltro: 'highpass', f: 7000 });
    // Bajo
    const raiz = [NOTA.D2, NOTA.D2, NOTA.Bb2 / 2, NOTA.C3 / 2][compas];
    const fBajo = p % 4 === 3 ? raiz * 2 : raiz;
    this.notaMusica('combate', { f: fBajo, t, dur: dp * 0.9, vol: 0.13, filtro: 600 });
    // Golpe de sintetizador al inicio de cada compás
    if (p === 0) {
      [1, 1.19, 1.5].forEach((m) => this.notaMusica('combate', { tipo: 'square', f: raiz * 4 * m, t, dur: dp * 3, vol: 0.03, filtro: 2000 }));
    }
    // Melodía amenazante cada 2 compases
    if (compas % 2 === 1 && (p === 6 || p === 7 || p === 14)) {
      const f = p === 14 ? NOTA.A4 : (p === 6 ? NOTA.F4 : NOTA.E4);
      this.notaMusica('combate', { tipo: 'square', f, t, dur: dp * 1.6, vol: 0.025, filtro: 2500 });
    }
  }
}

/* =========================================================
   CATÁLOGO DE SONIDOS HECHOS CON CÓDIGO
   (cada uno coincide con una fila de la Guía de sonidos)
   ========================================================= */
Sonido.prototype.sintetizados = {
  // --- Pistola ---
  disparoPistola(d) {
    this.ruido({ dur: 0.16, vol: 0.55, tipoFiltro: 'lowpass', f0: 5000, f1: 400, destino: d });
    this.tono({ tipo: 'triangle', f0: 160, f1: 45, dur: 0.18, vol: 0.5, destino: d });
    this.tono({ tipo: 'sine', f0: 3200, f1: 2600, dur: 0.05, vol: 0.05, inicio: 0.28, destino: d }); // casquillo
  },
  sinMunicion(d) {
    this.tono({ tipo: 'square', f0: 1800, f1: 1600, dur: 0.03, vol: 0.12, destino: d });
  },
  recarga(d) {
    this.ruido({ dur: 0.08, vol: 0.2, tipoFiltro: 'bandpass', f0: 2500, q: 4, inicio: 0.05, destino: d });          // sale el cargador
    this.tono({ tipo: 'square', f0: 900, f1: 700, dur: 0.04, vol: 0.12, inicio: 0.62, destino: d });                // entra el cargador
    this.ruido({ dur: 0.12, vol: 0.25, tipoFiltro: 'bandpass', f0: 1500, f1: 3500, q: 3, inicio: 1.0, destino: d }); // corredera
    this.tono({ tipo: 'square', f0: 1300, f1: 1100, dur: 0.03, vol: 0.12, inicio: 1.12, destino: d });
  },
  // --- Impactos ---
  impactoAlien(d) {
    this.ruido({ dur: 0.12, vol: 0.35, tipoFiltro: 'lowpass', f0: 900, f1: 200, destino: d });
    this.tono({ tipo: 'sine', f0: 320, f1: 110, dur: 0.12, vol: 0.2, destino: d });
  },
  impactoPared(d) {
    this.ruido({ dur: 0.06, vol: 0.2, tipoFiltro: 'highpass', f0: 2500, destino: d });
  },
  marcaImpacto(d) {
    this.tono({ tipo: 'triangle', f0: 2400, dur: 0.04, vol: 0.1, destino: d });
  },
  // --- Zángano ---
  alienAparece(d) {
    this.tono({ tipo: 'sawtooth', f0: 70, f1: 170, dur: 0.6, vol: 0.18, ataque: 0.1, destino: d });
    this.ruido({ dur: 0.5, vol: 0.2, tipoFiltro: 'lowpass', f0: 300, f1: 1200, destino: d });
  },
  alienAtaque(d) {
    this.tono({ tipo: 'sawtooth', f0: 620, f1: 280, dur: 0.25, vol: 0.2, destino: d });
    this.tono({ tipo: 'square', f0: 640, f1: 300, dur: 0.22, vol: 0.06, destino: d });
  },
  alienMuere(d) {
    this.tono({ tipo: 'sawtooth', f0: 900, f1: 90, dur: 0.5, vol: 0.2, destino: d });
    this.ruido({ dur: 0.35, vol: 0.3, tipoFiltro: 'lowpass', f0: 1500, f1: 150, destino: d });
  },
  alienChillido(d) {
    this.tono({ tipo: 'sawtooth', f0: 380, f1: 520, dur: 0.18, vol: 0.08, destino: d });
    this.tono({ tipo: 'sawtooth', f0: 520, f1: 300, dur: 0.22, vol: 0.08, inicio: 0.18, destino: d });
  },
  // --- Jugador ---
  jugadorHerido(d) {
    this.tono({ tipo: 'sine', f0: 120, f1: 50, dur: 0.25, vol: 0.5, destino: d });
    this.ruido({ dur: 0.2, vol: 0.25, tipoFiltro: 'lowpass', f0: 700, destino: d });
  },
  escudoRoto(d) {
    [2600, 2100, 1700, 1300].forEach((f, i) => this.tono({ tipo: 'sine', f0: f, f1: f * 0.7, dur: 0.25, vol: 0.08, inicio: i * 0.05, destino: d }));
    this.ruido({ dur: 0.3, vol: 0.2, tipoFiltro: 'highpass', f0: 3000, destino: d });
  },
  escudoRecarga(d) {
    this.tono({ tipo: 'sine', f0: 300, f1: 900, dur: 0.5, vol: 0.1, ataque: 0.1, destino: d });
  },
  paso(d) {
    this.alternarPaso = !this.alternarPaso;
    this.ruido({ dur: 0.07, vol: 0.12, tipoFiltro: 'lowpass', f0: this.alternarPaso ? 500 : 420, destino: d });
  },
  salto(d) {
    this.ruido({ dur: 0.12, vol: 0.08, tipoFiltro: 'bandpass', f0: 600, f1: 1400, destino: d });
  },
  aterrizaje(d) {
    this.tono({ tipo: 'sine', f0: 90, f1: 40, dur: 0.12, vol: 0.3, destino: d });
    this.ruido({ dur: 0.1, vol: 0.15, tipoFiltro: 'lowpass', f0: 400, destino: d });
  },
  // --- Objetos ---
  abrirCofre(d) {
    this.ruido({ dur: 0.4, vol: 0.12, tipoFiltro: 'bandpass', f0: 400, f1: 900, q: 6, destino: d });
    [523, 659, 784, 1047].forEach((f, i) => this.tono({ tipo: 'triangle', f0: f, dur: 0.3, vol: 0.12, inicio: 0.3 + i * 0.08, destino: d }));
  },
  recogerMunicion(d) {
    this.tono({ tipo: 'square', f0: 1200, dur: 0.04, vol: 0.1, destino: d });
    this.tono({ tipo: 'square', f0: 1600, dur: 0.05, vol: 0.1, inicio: 0.07, destino: d });
  },
  recogerBotiquin(d) {
    this.tono({ tipo: 'sine', f0: 660, dur: 0.15, vol: 0.18, destino: d });
    this.tono({ tipo: 'sine', f0: 990, dur: 0.25, vol: 0.18, inicio: 0.12, destino: d });
  },
  // --- Partida ---
  oleadaInicia(d) {
    for (let i = 0; i < 3; i++) {
      this.tono({ tipo: 'square', f0: 440, dur: 0.18, vol: 0.12, inicio: i * 0.4, destino: d });
      this.tono({ tipo: 'square', f0: 330, dur: 0.18, vol: 0.12, inicio: i * 0.4 + 0.2, destino: d });
    }
  },
  oleadaSuperada(d) {
    [392, 494, 587].forEach((f, i) => this.tono({ tipo: 'triangle', f0: f, dur: 0.4, vol: 0.15, inicio: i * 0.12, destino: d }));
  },
  victoria(d) {
    [392, 523, 659, 784, 659, 1047].forEach((f, i) => this.tono({ tipo: 'square', f0: f, dur: i === 5 ? 1 : 0.22, vol: 0.1, inicio: i * 0.18, destino: d }));
  },
  derrota(d) {
    [440, 415, 392, 294].forEach((f, i) => this.tono({ tipo: 'sawtooth', f0: f, f1: f * 0.98, dur: i === 3 ? 1.2 : 0.4, vol: 0.1, inicio: i * 0.35, destino: d }));
  },
  logro(d) {
    [880, 1109, 1319, 1760].forEach((f, i) => this.tono({ tipo: 'sine', f0: f, dur: 0.35, vol: 0.12, inicio: i * 0.07, destino: d }));
  },
  // --- Menús ---
  uiClic(d) {
    this.tono({ tipo: 'square', f0: 660, f1: 880, dur: 0.06, vol: 0.08, destino: d });
  },
  uiEncima(d) {
    this.tono({ tipo: 'sine', f0: 1200, dur: 0.03, vol: 0.03, destino: d });
  },

  // ===== Nuevos en la v0.2 =====
  // --- Escopeta y rifle ---
  escopetaDisparo(d) {
    this.ruido({ dur: 0.45, vol: 0.7, tipoFiltro: 'lowpass', f0: 3500, f1: 180, destino: d });
    this.tono({ tipo: 'sine', f0: 95, f1: 32, dur: 0.4, vol: 0.65, destino: d });
    this.ruido({ dur: 0.05, vol: 0.3, tipoFiltro: 'highpass', f0: 4000, destino: d });
  },
  escopetaRecarga(d) {
    this.tono({ tipo: 'square', f0: 700, f1: 500, dur: 0.05, vol: 0.12, inicio: 0.05, destino: d });       // se abre
    this.ruido({ dur: 0.07, vol: 0.2, tipoFiltro: 'bandpass', f0: 1200, q: 3, inicio: 0.5, destino: d });   // cartucho 1
    this.ruido({ dur: 0.07, vol: 0.2, tipoFiltro: 'bandpass', f0: 1100, q: 3, inicio: 0.85, destino: d });  // cartucho 2
    this.tono({ tipo: 'square', f0: 900, f1: 600, dur: 0.06, vol: 0.16, inicio: 1.35, destino: d });       // se cierra
  },
  rifleDisparo(d) {
    this.ruido({ dur: 0.08, vol: 0.55, tipoFiltro: 'highpass', f0: 1500, destino: d });
    this.ruido({ dur: 0.6, vol: 0.4, tipoFiltro: 'lowpass', f0: 2500, f1: 120, destino: d });
    this.tono({ tipo: 'sine', f0: 140, f1: 45, dur: 0.3, vol: 0.5, destino: d });
    this.ruido({ dur: 0.5, vol: 0.08, tipoFiltro: 'lowpass', f0: 900, f1: 150, inicio: 0.28, destino: d }); // eco
  },
  rifleRecarga(d) {
    this.tono({ tipo: 'square', f0: 1100, f1: 900, dur: 0.04, vol: 0.12, inicio: 0.1, destino: d });
    this.ruido({ dur: 0.1, vol: 0.18, tipoFiltro: 'bandpass', f0: 2000, f1: 3000, q: 3, inicio: 0.3, destino: d });
    this.tono({ tipo: 'square', f0: 800, dur: 0.04, vol: 0.12, inicio: 1.0, destino: d });
    this.ruido({ dur: 0.12, vol: 0.2, tipoFiltro: 'bandpass', f0: 3000, f1: 1800, q: 3, inicio: 1.8, destino: d });
    this.tono({ tipo: 'square', f0: 1200, f1: 1000, dur: 0.04, vol: 0.14, inicio: 2.05, destino: d });
  },
  cambioArma(d) {
    this.ruido({ dur: 0.15, vol: 0.12, tipoFiltro: 'bandpass', f0: 900, f1: 1600, q: 2, destino: d });
    this.tono({ tipo: 'square', f0: 1000, f1: 800, dur: 0.03, vol: 0.08, inicio: 0.2, destino: d });
  },
  // --- Babosos ---
  babosoAparece(d) {
    this.ruido({ dur: 0.7, vol: 0.25, tipoFiltro: 'lowpass', f0: 300, f1: 1100, destino: d });
    this.burbujas(d, 6, 0.1, 0.6);
  },
  babositoChillido(d) {
    this.tono({ tipo: 'sine', f0: 700, f1: 950, dur: 0.12, vol: 0.08, destino: d });
    this.tono({ tipo: 'sine', f0: 950, f1: 600, dur: 0.18, vol: 0.08, inicio: 0.12, destino: d });
    this.burbujas(d, 2, 0.05, 0.2);
  },
  babositoAtaque(d) {
    this.ruido({ dur: 0.25, vol: 0.2, tipoFiltro: 'bandpass', f0: 2500, q: 2, destino: d });
    this.tono({ tipo: 'sawtooth', f0: 520, f1: 260, dur: 0.22, vol: 0.12, destino: d });
  },
  babositoMuere(d) {
    this.ruido({ dur: 0.4, vol: 0.35, tipoFiltro: 'lowpass', f0: 1600, f1: 100, destino: d });
    this.tono({ tipo: 'sine', f0: 320, f1: 60, dur: 0.35, vol: 0.2, destino: d });
    this.burbujas(d, 4, 0.1, 0.4);
  },
  babosonRugido(d) {
    this.tono({ tipo: 'sawtooth', f0: 55, f1: 80, dur: 0.5, vol: 0.2, ataque: 0.1, destino: d });
    this.tono({ tipo: 'sawtooth', f0: 80, f1: 50, dur: 0.5, vol: 0.2, inicio: 0.45, destino: d });
    this.ruido({ dur: 0.9, vol: 0.15, tipoFiltro: 'lowpass', f0: 350, destino: d });
  },
  babosonGolpe(d) {
    this.tono({ tipo: 'sawtooth', f0: 95, f1: 55, dur: 0.45, vol: 0.25, ataque: 0.05, destino: d });
  },
  babosonEscupe(d) {
    this.ruido({ dur: 0.3, vol: 0.3, tipoFiltro: 'bandpass', f0: 600, f1: 1500, q: 2, destino: d });
    this.tono({ tipo: 'sine', f0: 200, f1: 520, dur: 0.15, vol: 0.25, inicio: 0.22, destino: d });
  },
  babosonMuere(d) {
    this.tono({ tipo: 'sawtooth', f0: 120, f1: 28, dur: 1.2, vol: 0.28, destino: d });
    this.ruido({ dur: 0.8, vol: 0.4, tipoFiltro: 'lowpass', f0: 1200, f1: 80, inicio: 0.3, destino: d });
    this.burbujas(d, 8, 0.4, 0.8);
  },
  impactoBaba(d) {
    this.ruido({ dur: 0.1, vol: 0.3, tipoFiltro: 'lowpass', f0: 1200, f1: 300, destino: d });
    this.tono({ tipo: 'sine', f0: 420, f1: 150, dur: 0.1, vol: 0.15, destino: d });
  },
  babaImpacto(d) {
    this.ruido({ dur: 0.35, vol: 0.4, tipoFiltro: 'lowpass', f0: 2000, f1: 180, destino: d });
    this.burbujas(d, 4, 0.05, 0.35);
  },
  pisarBaba(d) {
    this.ruido({ dur: 0.18, vol: 0.18, tipoFiltro: 'lowpass', f0: 800, f1: 250, destino: d });
    this.burbujas(d, 2, 0.02, 0.15);
  },
  // --- Objetos y misiones ---
  armaNueva(d) {
    [440, 554, 659, 880].forEach((f, i) => this.tono({ tipo: 'square', f0: f, dur: 0.18, vol: 0.08, inicio: i * 0.08, destino: d }));
  },
  armaLegendaria(d) {
    [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => this.tono({ tipo: 'triangle', f0: f, dur: i === 5 ? 0.8 : 0.2, vol: 0.12, inicio: i * 0.09, destino: d }));
    this.ruido({ dur: 1.0, vol: 0.06, tipoFiltro: 'highpass', f0: 6000, inicio: 0.4, destino: d });
  },
  vidaLlena(d) {
    this.tono({ tipo: 'square', f0: 320, dur: 0.08, vol: 0.07, destino: d });
    this.tono({ tipo: 'square', f0: 260, dur: 0.12, vol: 0.07, inicio: 0.1, destino: d });
  },
  objetivoCompletado(d) {
    this.tono({ tipo: 'triangle', f0: 587, dur: 0.25, vol: 0.14, destino: d });
    this.tono({ tipo: 'triangle', f0: 880, dur: 0.45, vol: 0.14, inicio: 0.15, destino: d });
  },
  llaves(d) {
    for (let i = 0; i < 6; i++) this.tono({ tipo: 'sine', f0: 3000 + Math.random() * 2500, dur: 0.06, vol: 0.06, inicio: i * 0.05 + Math.random() * 0.03, destino: d });
  },
  motor(d) {
    this.tono({ tipo: 'sawtooth', f0: 45, f1: 90, dur: 1.6, vol: 0.2, ataque: 0.2, destino: d });
    this.ruido({ dur: 1.6, vol: 0.15, tipoFiltro: 'lowpass', f0: 200, f1: 600, destino: d });
  },
  // --- v0.3: explosiones, fuego y la Bestia de Heno ---
  explosion(d) {
    this.ruido({ dur: 1.2, vol: 0.9, tipoFiltro: 'lowpass', f0: 2400, f1: 60, destino: d });
    this.tono({ tipo: 'sine', f0: 90, f1: 25, dur: 0.9, vol: 0.8, destino: d });
    this.ruido({ dur: 0.15, vol: 0.4, tipoFiltro: 'highpass', f0: 3000, destino: d });
  },
  fuego(d) {
    this.ruido({ dur: 1.4, vol: 0.25, tipoFiltro: 'bandpass', f0: 600, f1: 1400, q: 0.8, destino: d });
    for (let i = 0; i < 6; i++) this.ruido({ dur: 0.04, vol: 0.12, tipoFiltro: 'highpass', f0: 2500, inicio: Math.random() * 1.2, destino: d });
  },
  jefeAparece(d) {
    // Golpe grave + acorde que sube (aviso de jefe)
    this.tono({ tipo: 'sine', f0: 60, f1: 35, dur: 1.5, vol: 0.7, destino: d });
    [146.8, 174.6, 220].forEach((f, i) => this.tono({ tipo: 'sawtooth', f0: f, f1: f * 1.06, dur: 1.6, vol: 0.06, inicio: 0.1 + i * 0.12, ataque: 0.2, destino: d }));
  },
  bestiaRugido(d) {
    this.tono({ tipo: 'sawtooth', f0: 70, f1: 110, dur: 0.6, vol: 0.3, ataque: 0.1, destino: d });
    this.tono({ tipo: 'sawtooth', f0: 110, f1: 55, dur: 0.8, vol: 0.3, inicio: 0.5, destino: d });
    this.ruido({ dur: 1.3, vol: 0.25, tipoFiltro: 'bandpass', f0: 500, f1: 300, q: 1, destino: d });
  },
  bestiaMuere(d) {
    this.tono({ tipo: 'sawtooth', f0: 140, f1: 30, dur: 2.2, vol: 0.35, destino: d });
    this.ruido({ dur: 1.5, vol: 0.35, tipoFiltro: 'lowpass', f0: 1500, f1: 200, inicio: 0.4, destino: d });
    this.burbujas(d, 10, 1.5, 0.8);
  },
  golpeHeno(d) {
    this.ruido({ dur: 0.1, vol: 0.25, tipoFiltro: 'bandpass', f0: 1800, q: 1.5, destino: d });
  },
  golpeSuelo(d) {
    this.tono({ tipo: 'sine', f0: 70, f1: 28, dur: 0.7, vol: 0.9, destino: d });
    this.ruido({ dur: 0.8, vol: 0.5, tipoFiltro: 'lowpass', f0: 900, f1: 80, destino: d });
  },
  lanzar(d) {
    this.ruido({ dur: 0.35, vol: 0.3, tipoFiltro: 'bandpass', f0: 400, f1: 1600, q: 1, destino: d });
  },
  pacaCae(d) {
    this.tono({ tipo: 'sine', f0: 110, f1: 50, dur: 0.25, vol: 0.5, destino: d });
    this.ruido({ dur: 0.4, vol: 0.3, tipoFiltro: 'bandpass', f0: 1200, f1: 600, q: 1, destino: d });
  },
  embestida(d) {
    this.tono({ tipo: 'sawtooth', f0: 90, f1: 140, dur: 0.5, vol: 0.3, destino: d });
    for (let i = 0; i < 5; i++) this.tono({ tipo: 'sine', f0: 60, f1: 35, dur: 0.15, vol: 0.5, inicio: 0.2 + i * 0.32, destino: d });
  },
  choqueFuerte(d) {
    this.ruido({ dur: 0.6, vol: 0.7, tipoFiltro: 'lowpass', f0: 2500, f1: 120, destino: d });
    this.tono({ tipo: 'sine', f0: 80, f1: 30, dur: 0.5, vol: 0.7, destino: d });
  },
  nucleoExpuesto(d) {
    // "¡ahora!": dos notas brillantes
    this.tono({ tipo: 'square', f0: 880, dur: 0.1, vol: 0.1, destino: d });
    this.tono({ tipo: 'square', f0: 1320, dur: 0.18, vol: 0.1, inicio: 0.12, destino: d });
  },
  // --- v0.4: la carretera ---
  subirCamioneta(d) {
    this.tono({ tipo: 'square', f0: 300, f1: 200, dur: 0.06, vol: 0.12, destino: d });          // puerta
    this.ruido({ dur: 0.1, vol: 0.2, tipoFiltro: 'lowpass', f0: 600, inicio: 0.35, destino: d }); // se cierra
    this.tono({ tipo: 'sawtooth', f0: 40, f1: 75, dur: 0.8, vol: 0.18, inicio: 0.5, ataque: 0.1, destino: d }); // arranca
  },
  bajarCamioneta(d) {
    this.tono({ tipo: 'square', f0: 300, f1: 200, dur: 0.06, vol: 0.12, destino: d });
    this.ruido({ dur: 0.1, vol: 0.2, tipoFiltro: 'lowpass', f0: 600, inicio: 0.3, destino: d });
  },
  choqueCamioneta(d) {
    this.ruido({ dur: 0.4, vol: 0.6, tipoFiltro: 'bandpass', f0: 1200, f1: 300, q: 0.8, destino: d });
    this.tono({ tipo: 'square', f0: 220, f1: 90, dur: 0.25, vol: 0.15, destino: d });
  },
  atropello(d) {
    this.ruido({ dur: 0.25, vol: 0.4, tipoFiltro: 'lowpass', f0: 900, f1: 150, destino: d });
    this.burbujas(d, 3, 0.05, 0.2);
  },
  alertaLanzamiento(d) {
    this.tono({ tipo: 'square', f0: 990, dur: 0.08, vol: 0.06, destino: d });
    this.tono({ tipo: 'square', f0: 990, dur: 0.08, vol: 0.06, inicio: 0.15, destino: d });
  },
  rocaCae(d) {
    this.tono({ tipo: 'sine', f0: 65, f1: 25, dur: 0.8, vol: 0.8, destino: d });
    this.ruido({ dur: 0.7, vol: 0.45, tipoFiltro: 'lowpass', f0: 1800, f1: 100, destino: d });
  },
  golpeRoca(d) {
    this.ruido({ dur: 0.07, vol: 0.25, tipoFiltro: 'highpass', f0: 2000, destino: d });
    this.tono({ tipo: 'square', f0: 400, f1: 300, dur: 0.05, vol: 0.06, destino: d });
  },
  lanzadorRugido(d) {
    this.tono({ tipo: 'sawtooth', f0: 45, f1: 70, dur: 1.0, vol: 0.4, ataque: 0.2, destino: d });
    this.tono({ tipo: 'sawtooth', f0: 70, f1: 40, dur: 1.0, vol: 0.4, inicio: 0.9, destino: d });
    this.ruido({ dur: 1.8, vol: 0.2, tipoFiltro: 'lowpass', f0: 300, destino: d });
  },
  lanzadorPaso(d) {
    this.tono({ tipo: 'sine', f0: 55, f1: 30, dur: 0.4, vol: 0.6, destino: d });
  },
  sacoRevienta(d) {
    this.ruido({ dur: 0.5, vol: 0.5, tipoFiltro: 'lowpass', f0: 1500, f1: 200, destino: d });
    this.tono({ tipo: 'sawtooth', f0: 500, f1: 80, dur: 0.6, vol: 0.2, destino: d });
    this.burbujas(d, 6, 0.1, 0.5);
  },
  lanzadorMuere(d) {
    this.tono({ tipo: 'sawtooth', f0: 90, f1: 22, dur: 2.8, vol: 0.4, destino: d });
    this.ruido({ dur: 2, vol: 0.4, tipoFiltro: 'lowpass', f0: 800, f1: 60, inicio: 1, destino: d });
  },
  muroBaba(d) {
    this.ruido({ dur: 1.2, vol: 0.3, tipoFiltro: 'lowpass', f0: 1200, f1: 150, destino: d });
    this.burbujas(d, 12, 0, 1.2);
  },
  // --- v0.5: la ciudad ---
  plasmaDisparo(d) {
    this.tono({ tipo: 'sawtooth', f0: 1400, f1: 300, dur: 0.22, vol: 0.12, destino: d });
    this.tono({ tipo: 'sine', f0: 700, f1: 200, dur: 0.2, vol: 0.12, destino: d });
  },
  impactoPlasma(d) {
    this.ruido({ dur: 0.18, vol: 0.25, tipoFiltro: 'bandpass', f0: 2500, f1: 800, q: 2, destino: d });
  },
  soldadoAlienGrito(d) {
    this.tono({ tipo: 'square', f0: 300, f1: 420, dur: 0.15, vol: 0.06, destino: d });
    this.tono({ tipo: 'square', f0: 420, f1: 260, dur: 0.2, vol: 0.06, inicio: 0.15, destino: d });
  },
  soldadoAlienMuere(d) {
    this.tono({ tipo: 'square', f0: 500, f1: 70, dur: 0.6, vol: 0.12, destino: d });
    this.ruido({ dur: 0.3, vol: 0.2, tipoFiltro: 'bandpass', f0: 2000, q: 2, destino: d });
  },
  brutoRugido(d) {
    this.tono({ tipo: 'sawtooth', f0: 60, f1: 95, dur: 0.6, vol: 0.35, ataque: 0.1, destino: d });
    this.ruido({ dur: 0.7, vol: 0.2, tipoFiltro: 'lowpass', f0: 400, destino: d });
  },
  brutoMuere(d) {
    this.tono({ tipo: 'sawtooth', f0: 110, f1: 30, dur: 1.2, vol: 0.35, destino: d });
    this.tono({ tipo: 'sine', f0: 70, f1: 30, dur: 0.4, vol: 0.6, inicio: 1, destino: d });
  },
  aliadoDisparo(d) {
    this.ruido({ dur: 0.12, vol: 0.35, tipoFiltro: 'lowpass', f0: 4000, f1: 500, destino: d });
    this.tono({ tipo: 'triangle', f0: 180, f1: 60, dur: 0.12, vol: 0.25, destino: d });
  },
  aliadoRescatado(d) {
    [523, 659, 784].forEach((f, i) => this.tono({ tipo: 'triangle', f0: f, dur: 0.3, vol: 0.12, inicio: i * 0.1, destino: d }));
    this.tono({ tipo: 'square', f0: 1200, dur: 0.05, vol: 0.05, inicio: 0.45, destino: d }); // radio
  },
  escudoGolpe(d) {
    this.tono({ tipo: 'sine', f0: 1800, f1: 1200, dur: 0.12, vol: 0.08, destino: d });
    this.tono({ tipo: 'sine', f0: 2700, f1: 2400, dur: 0.1, vol: 0.05, destino: d });
  },
  escudoCae(d) {
    [2400, 1800, 1300, 900, 600].forEach((f, i) => this.tono({ tipo: 'sine', f0: f, f1: f * 0.5, dur: 0.35, vol: 0.1, inicio: i * 0.08, destino: d }));
    this.ruido({ dur: 0.6, vol: 0.3, tipoFiltro: 'highpass', f0: 2500, destino: d });
  },
  generadorRoto(d) {
    this.ruido({ dur: 0.9, vol: 0.5, tipoFiltro: 'lowpass', f0: 3000, f1: 150, destino: d });
    this.tono({ tipo: 'sawtooth', f0: 900, f1: 60, dur: 0.9, vol: 0.15, destino: d });
  },
  laserCarga(d) {
    this.tono({ tipo: 'sawtooth', f0: 200, f1: 1600, dur: 1.2, vol: 0.08, ataque: 0.1, destino: d });
  },
  laser(d) {
    this.tono({ tipo: 'sawtooth', f0: 1600, f1: 1500, dur: 2.0, vol: 0.08, destino: d });
    this.ruido({ dur: 2.0, vol: 0.12, tipoFiltro: 'bandpass', f0: 3000, q: 4, destino: d });
  },
  orbe(d) {
    this.tono({ tipo: 'sine', f0: 300, f1: 900, dur: 0.4, vol: 0.12, destino: d });
  },
  guardianRugido(d) {
    this.tono({ tipo: 'sawtooth', f0: 55, f1: 50, dur: 1.4, vol: 0.3, ataque: 0.3, destino: d });
    this.tono({ tipo: 'square', f0: 110, f1: 104, dur: 1.4, vol: 0.08, ataque: 0.3, destino: d });
    this.ruido({ dur: 1.4, vol: 0.15, tipoFiltro: 'bandpass', f0: 800, q: 3, destino: d });
  },
  guardianMuere(d) {
    this.tono({ tipo: 'sawtooth', f0: 220, f1: 25, dur: 3.0, vol: 0.4, destino: d });
    for (let i = 0; i < 4; i++) this.ruido({ dur: 0.8, vol: 0.4, tipoFiltro: 'lowpass', f0: 2000, f1: 100, inicio: i * 0.6, destino: d });
  },
  rayoNave(d) {
    this.tono({ tipo: 'sine', f0: 200, f1: 800, dur: 3.0, vol: 0.12, ataque: 0.5, destino: d });
    this.tono({ tipo: 'sine', f0: 300, f1: 1200, dur: 3.0, vol: 0.08, ataque: 0.8, destino: d });
  },

  /* ---- Escena del secuestro (v0.6.4) ---- */
  platilloLlega(d) {
    // Zumbido grave que tiembla y se acerca, con un pitido extraño encima
    this.tono({ tipo: 'sawtooth', f0: 45, f1: 70, dur: 4.5, vol: 0.12, ataque: 2.0, destino: d });
    this.tono({ tipo: 'sine', f0: 90, f1: 140, dur: 4.5, vol: 0.1, ataque: 2.0, destino: d });
    [0, 1.2, 2.4, 3.4].forEach((t) => this.tono({ tipo: 'square', f0: 1400, f1: 1900, dur: 0.25, vol: 0.025, inicio: t, destino: d }));
  },
  abduccion(d) {
    // Rayo que sube lento (más largo que el de la nave) + ruido como viento
    this.tono({ tipo: 'sine', f0: 180, f1: 900, dur: 5.0, vol: 0.12, ataque: 0.6, destino: d });
    this.tono({ tipo: 'triangle', f0: 270, f1: 1350, dur: 5.0, vol: 0.07, ataque: 0.9, destino: d });
    this.ruido({ dur: 5.0, vol: 0.06, tipoFiltro: 'bandpass', f0: 600, f1: 2400, destino: d });
  },
  /* ---- v0.8 ---- */
  presentacion(d) {
    // Golpe grave de "cine" + un acorde misterioso que sube
    this.tono({ tipo: 'sine', f0: 70, f1: 40, dur: 1.2, vol: 0.3, destino: d });
    this.ruido({ dur: 0.5, vol: 0.12, f0: 1200, f1: 200, destino: d });
    [220, 277, 330].forEach((f, i) => this.tono({ tipo: 'triangle', f0: f, f1: f * 1.02, dur: 1.6, vol: 0.05, ataque: 0.3, inicio: 0.1 + i * 0.05, destino: d }));
  },
  misionNueva(d) {
    // Dos notas que suben (como un "¡nuevo objetivo!")
    this.tono({ tipo: 'square', f0: 523, dur: 0.12, vol: 0.06, destino: d });
    this.tono({ tipo: 'square', f0: 784, dur: 0.22, vol: 0.06, inicio: 0.12, destino: d });
  },
  misionExtra(d) {
    [659, 784, 988].forEach((f, i) => this.tono({ tipo: 'triangle', f0: f, dur: 0.14, vol: 0.07, inicio: i * 0.1, destino: d }));
  },
  granadaLanzar(d) {
    // Se suelta el seguro ("clink") y un soplido
    this.tono({ tipo: 'square', f0: 2400, f1: 1800, dur: 0.05, vol: 0.05, destino: d });
    this.ruido({ dur: 0.25, vol: 0.08, tipoFiltro: 'bandpass', f0: 800, f1: 400, inicio: 0.05, destino: d });
  },
  granadaRebote(d) {
    this.tono({ tipo: 'triangle', f0: 900, f1: 500, dur: 0.06, vol: 0.06, destino: d });
  },
  golpeAire(d) {
    this.ruido({ dur: 0.18, vol: 0.1, tipoFiltro: 'bandpass', f0: 1800, f1: 600, destino: d });
  },
  golpeCarne(d) {
    // Golpe seco y húmedo
    this.tono({ tipo: 'sine', f0: 140, f1: 60, dur: 0.15, vol: 0.3, destino: d });
    this.ruido({ dur: 0.12, vol: 0.18, f0: 900, f1: 200, destino: d });
  },
  mochila(d) {
    // Cierre de mochila
    this.ruido({ dur: 0.3, vol: 0.08, tipoFiltro: 'highpass', f0: 2500, f1: 4000, destino: d });
  },
  curarse(d) {
    this.tono({ tipo: 'sine', f0: 440, f1: 880, dur: 0.4, vol: 0.08, destino: d });
    this.tono({ tipo: 'sine', f0: 660, f1: 1320, dur: 0.4, vol: 0.05, inicio: 0.08, destino: d });
  },
  nidoLate(d) {
    // Latido viscoso
    this.tono({ tipo: 'sine', f0: 60, f1: 45, dur: 0.2, vol: 0.2, destino: d });
    this.tono({ tipo: 'sine', f0: 55, f1: 40, dur: 0.2, vol: 0.15, inicio: 0.25, destino: d });
  },
  nidoMuere(d) {
    this.ruido({ dur: 1.0, vol: 0.3, tipoFiltro: 'lowpass', f0: 1500, f1: 100, destino: d });
    this.tono({ tipo: 'sawtooth', f0: 300, f1: 50, dur: 0.9, vol: 0.12, destino: d });
  },
  vecinosGracias(d) {
    [523, 659, 784, 1047].forEach((f, i) => this.tono({ tipo: 'triangle', f0: f, dur: 0.18, vol: 0.07, inicio: i * 0.12, destino: d }));
  },

  /* ---- La nave nodriza (v0.7) ---- */
  puertaNave(d) {
    // Compuerta neumática: siseo + golpe metálico
    this.ruido({ dur: 0.6, vol: 0.12, tipoFiltro: 'highpass', f0: 3000, f1: 1200, destino: d });
    this.tono({ tipo: 'square', f0: 110, f1: 70, dur: 0.25, vol: 0.1, inicio: 0.45, destino: d });
  },
  motorRoto(d) {
    // Explosión grande con zumbido eléctrico que se apaga
    this.ruido({ dur: 1.6, vol: 0.5, f0: 2500, f1: 120, destino: d });
    this.tono({ tipo: 'sawtooth', f0: 220, f1: 30, dur: 1.8, vol: 0.18, destino: d });
    this.tono({ tipo: 'square', f0: 1200, f1: 200, dur: 0.6, vol: 0.05, inicio: 0.1, destino: d });
  },
  alarmaNave(d) {
    // Sirena de dos tonos (tres veces)
    [0, 0.5, 1.0].forEach((t) => {
      this.tono({ tipo: 'square', f0: 620, f1: 620, dur: 0.24, vol: 0.06, inicio: t, destino: d });
      this.tono({ tipo: 'square', f0: 460, f1: 460, dur: 0.24, vol: 0.06, inicio: t + 0.25, destino: d });
    });
  },
  holograma(d) {
    // Pitidos de computadora que suben
    [0, 0.12, 0.24, 0.36].forEach((t, i) => this.tono({ tipo: 'sine', f0: 700 + i * 220, dur: 0.1, vol: 0.08, inicio: t, destino: d }));
    this.tono({ tipo: 'triangle', f0: 300, f1: 900, dur: 0.8, vol: 0.05, inicio: 0.4, destino: d });
  },
  teletransporte(d) {
    // "Fzzzip": barrido rápido de abajo hacia arriba con chispas
    this.tono({ tipo: 'sine', f0: 200, f1: 2400, dur: 0.45, vol: 0.12, destino: d });
    this.ruido({ dur: 0.45, vol: 0.06, tipoFiltro: 'bandpass', f0: 1500, f1: 5000, destino: d });
  },
  capitanRisa(d) {
    // Risa grave y metálica: tres "ja" que bajan
    [0, 0.22, 0.44].forEach((t, i) => {
      this.tono({ tipo: 'sawtooth', f0: 150 - i * 15, f1: 110 - i * 15, dur: 0.18, vol: 0.14, inicio: t, destino: d });
      this.tono({ tipo: 'square', f0: 300 - i * 30, f1: 220 - i * 30, dur: 0.18, vol: 0.04, inicio: t, destino: d });
    });
  },
  capitanMuere(d) {
    // Grito que se distorsiona y cae, con explosiones
    this.tono({ tipo: 'sawtooth', f0: 400, f1: 40, dur: 2.6, vol: 0.18, destino: d });
    this.tono({ tipo: 'square', f0: 800, f1: 60, dur: 2.0, vol: 0.05, destino: d });
    this.ruido({ dur: 2.8, vol: 0.25, f0: 3000, f1: 100, inicio: 0.4, destino: d });
  },
  platilloSeVa(d) {
    // "Fiuuuu": barrido que sube rapidísimo y se aleja
    this.tono({ tipo: 'sawtooth', f0: 80, f1: 600, dur: 2.2, vol: 0.12, destino: d });
    this.tono({ tipo: 'sine', f0: 400, f1: 2400, dur: 2.2, vol: 0.06, destino: d });
  }
};

/* Burbujas de baba: varios "plop" cortos al azar */
Sonido.prototype.burbujas = function (d, cantidad, inicio, duracion) {
  for (let i = 0; i < cantidad; i++) {
    const f = 180 + Math.random() * 380;
    this.tono({ tipo: 'sine', f0: f, f1: f * 1.8, dur: 0.05, vol: 0.07, inicio: inicio + Math.random() * duracion, destino: d });
  }
};
