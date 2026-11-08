/* =========================================================
   GALAXY INVASION — presentacion.js  (v0.8)
   La primera vez que un monstruo aparece cerca, el juego se
   detiene unos segundos para presentarlo:
     - franjas de cine arriba y abajo,
     - la cámara vuela hasta él y lo rodea despacio,
     - el monstruo vuelve a FORMARSE (sale del suelo, de las
       pacas, cae del techo… cada uno con su animación) con
       chispas y baba alrededor,
     - y sale su ficha: nombre, qué hace y cómo vencerlo.
   Se salta con clic, toque, Enter, Espacio o E.
   main.js llama a buscar() mientras juegas, iniciar() y luego
   actualizar(dt) cada cuadro hasta que termina.
   ========================================================= */

import * as THREE from 'three';
import { CONFIG } from './config.js';

const P = CONFIG.presentaciones;
const caja = new THREE.Box3();
const ARRIBA = new THREE.Vector3(0, 1, 0);
const giro = new THREE.Matrix4();
const qMira = new THREE.Quaternion();
const tam = new THREE.Vector3();

export class Presentacion {
  constructor(camara, sonido) {
    this.camara = camara;
    this.sonido = sonido;
    this.activa = false;
    this.el = {
      capa: document.getElementById('presentacion'),
      clase: document.getElementById('ficha-clase'),
      nombre: document.getElementById('ficha-nombre'),
      descripcion: document.getElementById('ficha-descripcion'),
      consejo: document.getElementById('ficha-consejo')
    };
    const saltar = (e) => {
      if (!this.activa || this.t < 0.6) return;     // que no se salte sin querer al instante
      if (e.type === 'keydown' && !['Enter', 'Space', 'KeyE', 'Escape'].includes(e.code)) return;
      e.preventDefault();
      this.terminar();
    };
    window.addEventListener('keydown', saltar);
    this.el.capa.addEventListener('pointerdown', saltar);
  }

  /* ¿Hay algún monstruo nuevo cerca para presentar? Devuelve el alien o null */
  buscar(gestor, jugador, vistos) {
    if (!P.activa) return null;
    for (const e of gestor.lista) {
      if (!e.vivo || e.estado === 'muriendo' || vistos[e.tipo] || !CONFIG.bestiario[e.tipo]) continue;
      const d = Math.hypot(e.posicion.x - jugador.posicion.x, e.posicion.z - jugador.posicion.z);
      if (d < (e.esJefe ? P.distanciaJefe : P.distancia)) return e;
    }
    return null;
  }

  iniciar(enemigo, jugador, efectos, ctx, mundo, alTerminar) {
    this.e = enemigo;
    this.jugador = jugador;
    this.efectos = efectos;
    this.ctx = ctx;
    this.mundo = mundo;
    this.alTerminar = alTerminar;
    this.t = 0;
    this.duracion = enemigo.esJefe ? P.duracionJefe : P.duracion;
    this.chispa = 0;
    // Tamaño del monstruo (para saber a qué distancia poner la cámara)
    enemigo.grupo.updateWorldMatrix(true, true);
    caja.setFromObject(enemigo.grupo);
    caja.getSize(tam);
    this.alto = Math.max(0.6, Math.min(tam.y || 1, 12));
    this.distancia = THREE.MathUtils.clamp(Math.max(tam.x, tam.y, tam.z) * 1.8, 2.8, 14);
    // Vuelve a formarse delante de nosotros (los jefes ya vienen formándose)
    if (!enemigo.esJefe && enemigo.estado !== 'apareciendo') enemigo.cambiarEstado('apareciendo');
    // Cámara: guarda dónde estaba y arranca desde ahí
    this.desdePos = this.camara.position.clone();
    this.desdeQuat = this.camara.quaternion.clone();
    this.fovAntes = this.camara.fov;
    // Ángulo de la toma: del monstruo hacia el jugador, un poco de lado
    this.angulo = Math.atan2(jugador.posicion.x - enemigo.posicion.x, jugador.posicion.z - enemigo.posicion.z) + 0.35;
    // Ficha
    const datos = CONFIG.bestiario[enemigo.tipo];
    this.el.clase.textContent = datos.clase === 'Jefe' ? 'JEFE' : datos.clase === 'Nido' ? 'NIDO DE LA COLMENA' : 'NUEVO ALIEN';
    this.el.clase.classList.toggle('es-jefe', datos.clase === 'Jefe');
    this.el.nombre.textContent = (CONFIG.enemigos[enemigo.tipo] && CONFIG.enemigos[enemigo.tipo].nombre) || enemigo.nombre || enemigo.tipo;
    this.el.descripcion.textContent = datos.descripcion;
    this.el.consejo.textContent = datos.consejo;
    this.el.capa.hidden = false;
    requestAnimationFrame(() => this.el.capa.classList.add('visible'));
    this.sonido.reproducir(enemigo.esJefe ? 'jefeAparece' : 'presentacion');
    this.activa = true;
  }

  actualizar(dt) {
    if (!this.activa) return;
    this.t += dt;
    const e = this.e;
    // Solo el monstruo presentado se mueve: hace su animación de "formarse"
    if (e.vivo && e.estado === 'apareciendo') e.actualizar(dt, this.jugador, [], this.mundo, this.ctx);
    // Baba y chispas mientras se forma
    this.chispa -= dt;
    if (this.t < 1.8 && this.chispa <= 0) {
      this.chispa = 0.18;
      const p = e.posicion.clone().setY(0.3);
      this.efectos.aparicion(p, e.tipo.startsWith('babo') || e.tipo === 'nido');
      if (Math.random() < 0.5) this.efectos.chispas(p.clone().setY(this.alto * 0.5), 0x5dff9b, 0.6);
    }
    // Cámara: viaja desde los ojos del jugador hasta el monstruo y lo rodea despacio
    const viaje = THREE.MathUtils.smoothstep(this.t, 0, 1.1);
    const a = this.angulo + this.t * 0.12;
    // Mira al monstruo a la altura del suelo mientras sale, y a su centro cuando ya salió
    const centro = new THREE.Vector3(e.posicion.x, Math.max(0, e.grupo.position.y) + this.alto * 0.45, e.posicion.z);
    const destino = new THREE.Vector3(
      e.posicion.x + Math.sin(a) * this.distancia,
      centro.y + Math.max(1.0, this.alto * 0.5),
      e.posicion.z + Math.cos(a) * this.distancia
    );
    this.camara.position.copy(this.desdePos).lerp(destino, viaje);
    // (Matrix4.lookAt usa la convención de las cámaras: miran hacia -Z)
    giro.lookAt(this.camara.position, centro, ARRIBA);
    qMira.setFromRotationMatrix(giro);
    this.camara.quaternion.copy(this.desdeQuat).slerp(qMira, viaje);
    this.camara.fov = this.fovAntes + (50 - this.fovAntes) * viaje;
    this.camara.updateProjectionMatrix();
    if (this.t >= this.duracion) this.terminar();
  }

  terminar() {
    if (!this.activa) return;
    this.activa = false;
    // Si el monstruo no alcanzó a formarse, que termine ya (no queda bajo tierra)
    const e = this.e;
    if (e.vivo && e.estado === 'apareciendo' && !e.esJefe) e.cambiarEstado('persiguiendo');
    this.camara.fov = this.fovAntes;
    this.camara.updateProjectionMatrix();
    this.el.capa.classList.remove('visible');
    setTimeout(() => { if (!this.activa) this.el.capa.hidden = true; }, 350);
    this.alTerminar(e.tipo);
  }
}
