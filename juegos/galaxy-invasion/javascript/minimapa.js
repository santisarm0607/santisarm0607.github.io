/* =========================================================
   GALAXY INVASION — minimapa.js  (v0.6)
   Minimapa redondo del HUD. Gira con Rosa: arriba siempre es
   hacia donde mira (o hacia donde va la camioneta).
     - El mapa de cada etapa se dibuja UNA vez al cargarla (en un
       lienzo aparte) con el suelo, los caminos y todo lo sólido.
     - Cada cuadro solo se copia el pedazo que rodea a Rosa y se
       ponen encima los puntos: aliens (rojo), jefe (morado),
       aliados (verde), camioneta (azul) y el objetivo (amarillo).
     - Se redibuja 20 veces por segundo para ahorrar batería.
   ========================================================= */

import { CONFIG } from './config.js';

const M = CONFIG.minimapa;

export class Minimapa {
  constructor(lienzo, esTactil) {
    this.lienzo = lienzo;
    this.ctx = lienzo.getContext('2d');
    this.esTactil = esTactil;
    this.base = null;            // el mapa dibujado de la etapa
    this.limites = null;
    this.metros = M.metros;      // zoom actual (se acerca y se aleja suave)
    this.espera = 0;
    this.ajustarTamano();
    window.addEventListener('resize', () => this.ajustarTamano());
  }

  /* Tamaño en pantalla × densidad de píxeles (se ve nítido en el celular) */
  ajustarTamano() {
    const css = this.esTactil ? M.tamanoCelular : M.tamano;
    const px = Math.round(css * Math.min(2, window.devicePixelRatio || 1));
    if (this.lienzo.width !== px) { this.lienzo.width = px; this.lienzo.height = px; }
  }

  /* Dibuja el mapa de la etapa una sola vez */
  usarNivel(mundo) {
    const L = mundo.limite;
    const lim = typeof L === 'number' ? { minX: -L, maxX: L, minZ: -L, maxZ: L } : L;
    const margen = 40;   // fuera del mapa se ve oscuro
    const b = { minX: lim.minX - margen, maxX: lim.maxX + margen, minZ: lim.minZ - margen, maxZ: lim.maxZ + margen };
    const ancho = b.maxX - b.minX, alto = b.maxZ - b.minZ;
    const ppm = Math.min(M.pixelesPorMetro, 2048 / Math.max(ancho, alto));
    const lienzo = document.createElement('canvas');
    lienzo.width = Math.ceil(ancho * ppm);
    lienzo.height = Math.ceil(alto * ppm);
    const c = lienzo.getContext('2d');
    const rect = (x1, z1, x2, z2) => c.fillRect((Math.min(x1, x2) - b.minX) * ppm, (Math.min(z1, z2) - b.minZ) * ppm, Math.abs(x2 - x1) * ppm, Math.abs(z2 - z1) * ppm);
    const datos = mundo.minimapa || {};

    // Fuera del mapa
    c.fillStyle = '#05050b';
    c.fillRect(0, 0, lienzo.width, lienzo.height);
    // Suelo de la etapa
    c.fillStyle = datos.suelo || '#1c2130';
    rect(lim.minX, lim.minZ, lim.maxX, lim.maxZ);
    // Caminos, campos, plazas… (cada etapa trae los suyos)
    for (const f of datos.formas || []) {
      c.fillStyle = f.color;
      rect(f.x1, f.z1, f.x2, f.z2);
    }
    // Todo lo sólido (casas, edificios, autos…). Las cajas que se prenden y apagan no van
    c.fillStyle = datos.solido || '#6b7088';
    for (const k of mundo.colisiones) {
      if ('inactiva' in k) continue;
      rect(k.minX, k.minZ, k.maxX, k.maxZ);
    }
    // Borde del mapa
    c.strokeStyle = 'rgba(93, 255, 155, 0.35)';
    c.lineWidth = Math.max(1, ppm);
    c.strokeRect((lim.minX - b.minX) * ppm, (lim.minZ - b.minZ) * ppm, (lim.maxX - lim.minX) * ppm, (lim.maxZ - lim.minZ) * ppm);

    this.base = lienzo;
    this.limites = b;
    this.ppm = ppm;
  }

  /* d = { jugador, vehiculo (o null), enemigos, aliados, objetivo (Vector3 o null) } */
  actualizar(dt, d) {
    this.espera -= dt;
    if (this.espera > 0 || !this.base) return;
    this.espera = 1 / M.cuadrosPorSegundo;

    const ctx = this.ctx;
    const W = this.lienzo.width, R = W / 2;
    const enAuto = d.vehiculo && d.jugador.enVehiculo;
    const centro = enAuto ? d.vehiculo.posicion : d.jugador.posicion;
    const yaw = enAuto ? d.vehiculo.yaw : d.jugador.yaw;
    // Manejando se ve más lejos (vas rápido); el cambio es suave
    const meta = enAuto ? M.metrosManejando : M.metros;
    this.metros += (meta - this.metros) * Math.min(1, dt * 2 + 0.05);
    const esc = R / this.metros;                    // píxeles por metro en el minimapa
    const cos = Math.cos(yaw), sin = Math.sin(yaw);
    // Mundo -> minimapa (gira para que lo de adelante quede arriba)
    const aPantalla = (x, z) => {
      const dx = x - centro.x, dz = z - centro.z;
      return [R + esc * (dx * cos - dz * sin), R + esc * (dx * sin + dz * cos)];
    };

    ctx.clearRect(0, 0, W, W);
    ctx.save();
    ctx.beginPath();
    ctx.arc(R, R, R, 0, Math.PI * 2);
    ctx.clip();

    // El mapa, girado y centrado en Rosa
    ctx.save();
    ctx.translate(R, R);
    ctx.rotate(yaw);
    ctx.scale(esc / this.ppm, esc / this.ppm);
    ctx.translate(-(centro.x - this.limites.minX) * this.ppm, -(centro.z - this.limites.minZ) * this.ppm);
    ctx.globalAlpha = 0.92;
    ctx.drawImage(this.base, 0, 0);
    ctx.restore();

    const punto = (x, z, radio, color) => {
      const [sx, sy] = aPantalla(x, z);
      if ((sx - R) ** 2 + (sy - R) ** 2 > (R + radio) ** 2) return;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(sx, sy, radio, 0, Math.PI * 2);
      ctx.fill();
    };
    const u = W / 150;   // unidad: 1 px en el minimapa del computador

    // Aliados
    for (const a of d.aliados) if (a.vivo !== false && a.posicion) punto(a.posicion.x, a.posicion.z, 3 * u, '#5dff9b');
    // Aliens y jefes
    for (const e of d.enemigos) {
      if (!e.vivo) continue;
      if (e.esJefe) punto(e.posicion.x, e.posicion.z, Math.max(6 * u, (e.c.radio || 2) * esc), '#d24dff');
      else if (e.esEstructura) punto(e.posicion.x, e.posicion.z, 5 * u, '#b36bff');   // nidos (v0.8)
      else punto(e.posicion.x, e.posicion.z, 2.6 * u, '#ff4d5e');
    }

    // La camioneta (si Rosa no va manejando)
    if (d.vehiculo && !enAuto) {
      const [sx, sy] = aPantalla(d.vehiculo.posicion.x, d.vehiculo.posicion.z);
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(yaw - d.vehiculo.yaw);
      ctx.fillStyle = d.vehiculo.averiada ? '#5a5f72' : '#4d9bff';
      const a = Math.max(4 * u, 2 * esc), l = Math.max(8 * u, 5 * esc);
      ctx.fillRect(-a / 2, -l / 2, a, l);
      ctx.restore();
    }

    // Misiones extra (v0.8): rombos celestes; si están lejos se pegan al borde, más chicos
    for (const m of d.marcas || []) {
      let [sx, sy] = aPantalla(m.x, m.z);
      const dx = sx - R, dy = sy - R, dist = Math.hypot(dx, dy), maximo = R - 7 * u;
      const lejos = dist > maximo;
      if (lejos) { if (!m.borde) continue; sx = R + dx / dist * maximo; sy = R + dy / dist * maximo; }
      const t = (lejos ? 3.5 : 5) * u;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(Math.PI / 4);
      ctx.globalAlpha = lejos ? 0.6 : 1;
      ctx.strokeStyle = m.color || '#4de1ff';
      ctx.lineWidth = 2 * u;
      ctx.strokeRect(-t / 2, -t / 2, t, t);
      ctx.restore();
    }

    // Objetivo: rombo amarillo (si está lejos, se pega al borde)
    if (d.objetivo) {
      let [sx, sy] = aPantalla(d.objetivo.x, d.objetivo.z);
      const dx = sx - R, dy = sy - R, dist = Math.hypot(dx, dy), maximo = R - 8 * u;
      if (dist > maximo) { sx = R + dx / dist * maximo; sy = R + dy / dist * maximo; }
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = '#ffc65c';
      ctx.strokeStyle = '#07060f';
      ctx.lineWidth = 1.5 * u;
      ctx.fillRect(-4.5 * u, -4.5 * u, 9 * u, 9 * u);
      ctx.strokeRect(-4.5 * u, -4.5 * u, 9 * u, 9 * u);
      ctx.restore();
    }

    // Rosa: flecha blanca en el centro, siempre apuntando arriba
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#07060f';
    ctx.lineWidth = 1.5 * u;
    ctx.beginPath();
    ctx.moveTo(R, R - 8 * u);
    ctx.lineTo(R + 6 * u, R + 6 * u);
    ctx.lineTo(R, R + 3 * u);
    ctx.lineTo(R - 6 * u, R + 6 * u);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // "N" en el borde, donde queda el norte (para orientarse)
    const nx = R + Math.sin(yaw) * (R - 9 * u), ny = R - Math.cos(yaw) * (R - 9 * u);
    ctx.font = `bold ${Math.round(10 * u)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#5dff9b';
    ctx.fillText('N', nx, ny);
  }
}
