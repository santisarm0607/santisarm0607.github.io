/* =========================================================
   GALAXY INVASION — entrada.js
   Lee el teclado, el mouse y la pantalla táctil, y lo traduce
   a "acciones" (moverse, mirar, disparar...).

   El jugador nunca lee el teclado directamente: solo recibe
   acciones. Así, en el multijugador, las acciones de otro
   jugador podrán llegar por internet sin cambiar jugador.js.
   ========================================================= */

import { CONFIG } from './config.js';

export class Entrada {
  constructor(lienzo, capaTactil) {
    this.lienzo = lienzo;
    this.capaTactil = capaTactil;
    this.activa = false;           // solo lee mientras se juega
    this.esTactil = false;
    this.bloqueado = false;        // ¿el mouse está "atrapado" en el juego?
    this.bloqueoFunciono = false;  // ¿alguna vez se pudo atrapar el mouse?
    this.sinBloqueo = false;       // modo de respaldo (si el navegador no deja atrapar el mouse)
    this.multiplicadorSens = 1;
    this.alPausar = () => {};
    this.alMochila = () => {};   // abrir/cerrar la mochila (v0.8)

    this.teclas = new Set();
    this.mouse = { izquierdo: false, derecho: false };
    this.mirar = { x: 0, y: 0 };
    this.unaVez = { saltar: false, recargar: false, usar: false, linterna: false, disparar: false, granada: false, golpe: false, curar: false, cambiarArma: null };
    this.tactil = {
      mover: { x: 0, y: 0 }, joystickId: null, origen: { x: 0, y: 0 },
      mirarId: null, ultimo: { x: 0, y: 0 },
      disparar: false, disparoId: null, disparoUltimo: { x: 0, y: 0 },
      apuntar: false
    };

    this.escucharTeclado();
    this.escucharMouse();
    this.escucharTactil();
  }

  /* Sensibilidad de 0 a 100 (50 = normal) */
  ajustarSensibilidad(valor) {
    this.multiplicadorSens = Math.pow(2, (valor - 50) / 35);
  }

  /* ---------------- Teclado ---------------- */
  escucharTeclado() {
    window.addEventListener('keydown', (e) => {
      if (!this.activa) return;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
      if (e.repeat) return;
      this.teclas.add(e.code);
      if (e.code === 'Space') this.unaVez.saltar = true;
      if (e.code === 'KeyR') this.unaVez.recargar = true;
      if (e.code === 'KeyE') this.unaVez.usar = true;
      if (e.code === 'KeyF') this.unaVez.linterna = true;
      // v0.8: granada, golpe, botiquín de la mochila y abrir la mochila
      if (e.code === 'KeyG') this.unaVez.granada = true;
      if (e.code === 'KeyV') this.unaVez.golpe = true;
      if (e.code === 'KeyH') this.unaVez.curar = true;
      if (e.code === 'Tab' || e.code === 'KeyI') this.alMochila();
      if (['Digit1', 'Digit2', 'Digit3'].includes(e.code)) this.unaVez.cambiarArma = { indice: Number(e.code.slice(-1)) - 1 };
      if (e.code === 'KeyP' || (e.code === 'Escape' && !this.bloqueado)) this.alPausar();
    });
    window.addEventListener('keyup', (e) => this.teclas.delete(e.code));
    document.addEventListener('mouseleave', () => { this.cursorX = null; });
    window.addEventListener('blur', () => { this.cursorX = null; this.teclas.clear(); this.mouse.izquierdo = this.mouse.derecho = false; });
  }

  /* ---------------- Mouse ---------------- */
  escucharMouse() {
    this.lienzo.addEventListener('contextmenu', (e) => e.preventDefault());
    this.lienzo.addEventListener('mousedown', (e) => {
      if (!this.activa || this.esTactil) return;
      if (!this.bloqueado && !this.sinBloqueo) { this.pedirBloqueo(); return; }
      if (!this.bloqueado) this.pedirBloqueo(); // en respaldo: se vuelve a intentar atrapar el mouse
      if (e.button === 0) { this.mouse.izquierdo = true; this.unaVez.disparar = true; }
      if (e.button === 2) this.mouse.derecho = true;
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouse.izquierdo = false;
      if (e.button === 2) this.mouse.derecho = false;
    });
    window.addEventListener('mousemove', (e) => {
      if (!this.activa || this.esTactil) return;
      this.cursorX = e.clientX;
      if (!this.bloqueado && !this.sinBloqueo) return;
      const s = CONFIG.jugador.sensibilidadMouse * this.multiplicadorSens;
      // Se limita el salto máximo para evitar tirones raros de algunos navegadores
      this.mirar.x += Math.max(-200, Math.min(200, e.movementX)) * s;
      this.mirar.y += Math.max(-200, Math.min(200, e.movementY)) * s;
    });
    // Rueda del mouse: cambiar de arma
    window.addEventListener('wheel', (e) => {
      if (!this.activa || this.esTactil || Math.abs(e.deltaY) < 1) return;
      this.unaVez.cambiarArma = { indice: Math.sign(e.deltaY), relativo: true };
    }, { passive: true });
    document.addEventListener('pointerlockchange', () => {
      const antes = this.bloqueado;
      this.bloqueado = document.pointerLockElement === this.lienzo;
      if (this.bloqueado) {
        this.bloqueoFunciono = true;
        this.sinBloqueo = false;
        document.body.classList.remove('sin-bloqueo');
      }
      // Si se soltó el mouse (tecla Esc) en medio del juego: pausa
      if (antes && !this.bloqueado && this.activa) this.alPausar();
    });
    document.addEventListener('pointerlockerror', () => this.activarRespaldo());
  }

  /* Atrapa el mouse dentro del juego (para mirar sin que se salga la flecha) */
  pedirBloqueo() {
    if (this.esTactil) return;
    try {
      const promesa = this.lienzo.requestPointerLock();
      if (promesa && promesa.catch) promesa.catch(() => this.activarRespaldo());
    } catch (e) {
      this.activarRespaldo();
    }
  }

  /* Si el navegador no deja atrapar el mouse (por ejemplo dentro de Claude),
     se mira moviendo el mouse normal */
  activarRespaldo() {
    if (this.bloqueado || this.sinBloqueo) return;
    this.sinBloqueo = true;
    document.body.classList.add('sin-bloqueo');
  }

  soltarBloqueo() {
    if (document.pointerLockElement) document.exitPointerLock();
  }

  /* ---------------- Pantalla táctil ---------------- */
  escucharTactil() {
    // En cuanto se toca la pantalla, se muestran los controles táctiles
    window.addEventListener('touchstart', () => this.marcarTactil(), { passive: true });
    if (window.matchMedia('(pointer: coarse)').matches) this.marcarTactil();

    const zonaJoy = this.capaTactil.querySelector('#zona-joystick');
    const base = this.capaTactil.querySelector('#joystick-base');
    const palanca = this.capaTactil.querySelector('#joystick-palanca');
    const zonaMirar = this.capaTactil.querySelector('#zona-mirar');
    const t = this.tactil;
    const radio = 55;

    // Joystick: aparece donde pones el dedo
    zonaJoy.addEventListener('pointerdown', (e) => {
      if (t.joystickId !== null) return;
      t.joystickId = e.pointerId;
      zonaJoy.setPointerCapture(e.pointerId);
      t.origen = { x: e.clientX, y: e.clientY };
      const r = zonaJoy.getBoundingClientRect();
      base.style.setProperty('--x', (e.clientX - r.left) + 'px');
      base.style.setProperty('--y', (e.clientY - r.top) + 'px');
      base.classList.add('activo');
    });
    zonaJoy.addEventListener('pointermove', (e) => {
      if (e.pointerId !== t.joystickId) return;
      let dx = e.clientX - t.origen.x;
      let dy = e.clientY - t.origen.y;
      const d = Math.hypot(dx, dy);
      if (d > radio) { dx = dx / d * radio; dy = dy / d * radio; }
      t.mover.x = dx / radio;
      t.mover.y = dy / radio;
      palanca.style.setProperty('--dx', dx + 'px');
      palanca.style.setProperty('--dy', dy + 'px');
    });
    const soltarJoy = (e) => {
      if (e.pointerId !== t.joystickId) return;
      t.joystickId = null;
      t.mover.x = t.mover.y = 0;
      palanca.style.setProperty('--dx', '0px');
      palanca.style.setProperty('--dy', '0px');
      base.classList.remove('activo');
    };
    zonaJoy.addEventListener('pointerup', soltarJoy);
    zonaJoy.addEventListener('pointercancel', soltarJoy);

    // Mirar: arrastrar el dedo en la mitad derecha
    zonaMirar.addEventListener('pointerdown', (e) => {
      if (t.mirarId !== null) return;
      t.mirarId = e.pointerId;
      zonaMirar.setPointerCapture(e.pointerId);
      t.ultimo = { x: e.clientX, y: e.clientY };
    });
    zonaMirar.addEventListener('pointermove', (e) => {
      if (e.pointerId !== t.mirarId) return;
      this.sumarMirarTactil(e.clientX - t.ultimo.x, e.clientY - t.ultimo.y);
      t.ultimo = { x: e.clientX, y: e.clientY };
    });
    const soltarMirar = (e) => { if (e.pointerId === t.mirarId) t.mirarId = null; };
    zonaMirar.addEventListener('pointerup', soltarMirar);
    zonaMirar.addEventListener('pointercancel', soltarMirar);

    // Botones
    this.capaTactil.querySelectorAll('[data-accion]').forEach((boton) => {
      const accion = boton.dataset.accion;
      boton.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        boton.setPointerCapture(e.pointerId);
        boton.classList.add('presionado');
        if (accion === 'disparar') {
          t.disparar = true;
          this.unaVez.disparar = true; // un toque rápido también dispara
          t.disparoId = e.pointerId;
          t.disparoUltimo = { x: e.clientX, y: e.clientY };
        }
        if (accion === 'apuntar') { t.apuntar = !t.apuntar; boton.classList.toggle('encendido', t.apuntar); }
        if (accion === 'saltar') this.unaVez.saltar = true;
        if (accion === 'recargar') this.unaVez.recargar = true;
        if (accion === 'usar') this.unaVez.usar = true;
        if (accion === 'linterna') this.unaVez.linterna = true;
        if (accion === 'granada') this.unaVez.granada = true;
        if (accion === 'golpe') this.unaVez.golpe = true;
        if (accion === 'mochila') this.alMochila();
        if (accion === 'cambiar') this.unaVez.cambiarArma = { indice: 1, relativo: true };
        if (accion === 'pausa') this.alPausar();
      });
      // Arrastrar el botón de disparo también mueve la mira
      boton.addEventListener('pointermove', (e) => {
        if (accion !== 'disparar' || e.pointerId !== t.disparoId) return;
        this.sumarMirarTactil(e.clientX - t.disparoUltimo.x, e.clientY - t.disparoUltimo.y);
        t.disparoUltimo = { x: e.clientX, y: e.clientY };
      });
      const soltar = () => {
        boton.classList.remove('presionado');
        if (accion === 'disparar') { t.disparar = false; t.disparoId = null; }
      };
      boton.addEventListener('pointerup', soltar);
      boton.addEventListener('pointercancel', soltar);
    });
  }

  sumarMirarTactil(dx, dy) {
    const s = CONFIG.jugador.sensibilidadTactil * this.multiplicadorSens;
    this.mirar.x += dx * s;
    this.mirar.y += dy * s;
  }

  marcarTactil() {
    if (this.esTactil) return;
    this.esTactil = true;
    document.body.classList.add('tactil');
  }

  /* Apaga el "apuntar" táctil (al reiniciar, por ejemplo) */
  reiniciar() {
    this.tactil.apuntar = false;
    this.capaTactil.querySelectorAll('.encendido').forEach((b) => b.classList.remove('encendido'));
    this.teclas.clear();
    this.mouse.izquierdo = this.mouse.derecho = false;
    this.mirar.x = this.mirar.y = 0;
    Object.keys(this.unaVez).forEach((k) => { this.unaVez[k] = false; });
    this.unaVez.cambiarArma = null;
  }

  /* =========================================================
     LEER ACCIONES (una vez por cuadro)
     adelante: 1 = hacia adelante, -1 = hacia atrás
     lado: 1 = derecha, -1 = izquierda
     ========================================================= */
  leer() {
    const k = this.teclas;
    const t = this.tactil;
    let adelante = 0;
    let lado = 0;
    if (k.has('KeyW') || k.has('ArrowUp')) adelante += 1;
    if (k.has('KeyS') || k.has('ArrowDown')) adelante -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) lado += 1;
    if (k.has('KeyA') || k.has('ArrowLeft')) lado -= 1;
    adelante += -t.mover.y;
    lado += t.mover.x;

    // Joystick casi al tope hacia adelante = correr
    const correTactil = Math.hypot(t.mover.x, t.mover.y) > 0.92 && t.mover.y < -0.5;

    // Respaldo sin mouse atrapado: la flecha en el borde sigue girando la cámara
    const ahora = performance.now();
    const dt = Math.min(0.1, ((ahora - (this.ultimaLectura || ahora)) / 1000));
    this.ultimaLectura = ahora;
    if (this.sinBloqueo && !this.bloqueado && !this.esTactil && this.activa && this.cursorX != null) {
      const ancho = window.innerWidth, zona = ancho * CONFIG.jugador.zonaBorde;
      let empuje = 0;
      if (this.cursorX < zona) empuje = -(1 - this.cursorX / zona);
      else if (this.cursorX > ancho - zona) empuje = 1 - (ancho - this.cursorX) / zona;
      this.mirar.x += empuje * CONFIG.jugador.giroBorde * dt;
    }

    const acciones = {
      adelante: Math.max(-1, Math.min(1, adelante)),
      lado: Math.max(-1, Math.min(1, lado)),
      mirarX: this.mirar.x,
      mirarY: this.mirar.y,
      disparar: this.mouse.izquierdo || t.disparar || this.unaVez.disparar,
      apuntar: this.mouse.derecho || t.apuntar,
      correr: k.has('ShiftLeft') || k.has('ShiftRight') || correTactil,
      saltar: this.unaVez.saltar,
      recargar: this.unaVez.recargar,
      usar: this.unaVez.usar,
      linterna: this.unaVez.linterna,
      granada: this.unaVez.granada,
      golpe: this.unaVez.golpe,
      curar: this.unaVez.curar,
      cambiarArma: this.unaVez.cambiarArma,
      tactil: this.esTactil
    };
    this.mirar.x = this.mirar.y = 0;
    Object.keys(this.unaVez).forEach((key) => { this.unaVez[key] = false; });
    this.unaVez.cambiarArma = null;
    return acciones;
  }
}
