/* =========================================================
   GALAXY INVASION — cinematica.js  (v0.6.4)
   Escena del secuestro al empezar la granja (unos 24 s).
   Rosa y Tomás son hermanos. Juegues con quien juegues, un
   platillo de la Colmena se lleva AL OTRO con un rayo verde.
   Ese es el motivo de toda la historia: llegar al planeta de
   la Mente Colmena para rescatarlo (y a los demás humanos).

   Cómo funciona:
     - Usa el mapa de la granja que ya está cargado.
     - Pone a los dos hermanos, el platillo y el rayo.
     - Una "línea de tiempo" en segundos decide qué pasa,
       dónde va la cámara y qué dice cada uno.
     - Se puede saltar (botón, Enter, Espacio o Esc).
   main.js llama a iniciar(), luego actualizar(dt) cada cuadro.
   ========================================================= */

import * as THREE from 'three';
import { CONFIG } from './config.js';
import { crearGranjera, crearGranjero, crearPlatillo, crearRayoAbduccion } from './modelos-granja.js';
import { personaje, otroPersonaje, textoPersonaje } from './personaje.js';

const C = CONFIG.cinematica;
const DURACION = 24.5;

/* Suaviza un valor de 0 a 1 (arranca y frena despacio) */
const suave = (x) => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };
/* Avance (0 a 1) de t dentro del tramo [a, b] */
const tramo = (t, a, b) => suave((t - a) / (b - a));
const mezclar = (a, b, k) => a.clone().lerp(b, k);
const V = (x, y, z) => new THREE.Vector3(x, y, z);

/* Diálogos: [segundo, quién habla ('yo' | 'otro' | null = narración), texto, duración] */
const DIALOGOS = [
  [0.6, null, 'San Isidro · 11:40 de la noche', 3.6],
  [5.2, 'otro', '¿{nombre}? …¿Qué es esa luz?', 3.0],
  [9.0, 'otro', '¡{NOMBRE}! ¡AYÚDAME!', 3.2],
  [12.8, 'yo', '¡{PAREJA}! ¡NOOO!', 2.6],
  [19.4, 'yo', 'Te voy a encontrar, {pareja}. A ti y a todos los que se llevaron.', 4.2],
  [22.4, null, 'Esa noche, la Colmena se llevó a cientos de personas.', 2.4]
];

export class Cinematica {
  constructor(camara, sonido) {
    this.camara = camara;
    this.sonido = sonido;
    this.activa = false;
    this.alTerminar = () => {};
    this.el = {
      capa: document.getElementById('cinematica'),
      texto: document.getElementById('cine-texto'),
      dialogo: document.getElementById('cine-dialogo'),
      saltar: document.getElementById('btn-saltar-cine')
    };
    this.el.saltar.addEventListener('click', () => this.terminar());
    window.addEventListener('keydown', (e) => {
      if (this.activa && ['Enter', 'Space', 'Escape'].includes(e.code)) { e.preventDefault(); this.terminar(); }
    });
  }

  /* Arma la escena dentro del mapa de la granja y empieza */
  iniciar(escena, alTerminar) {
    this.escena = escena;
    this.alTerminar = alTerminar;
    this.t = 0;
    this.siguienteDialogo = 0;
    this.sonidos = {};
    const yo = personaje();
    const otro = otroPersonaje();
    const crear = (p) => (p.tipo === 'granjera' ? crearGranjera() : crearGranjero()).grupo;

    this.grupo = new THREE.Group();
    this.grupo.name = 'cinematica';
    this.yo = crear(yo);
    this.otro = crear(otro);
    this.grupo.add(this.yo, this.otro);
    const pl = crearPlatillo();
    this.platillo = pl.grupo;
    this.lucesPlatillo = pl.luces;
    this.luz = new THREE.PointLight(0x9dff6a, 0, 34, 1.4);
    this.luz.position.y = -1.5;
    this.platillo.add(this.luz);
    this.grupo.add(this.platillo);
    const rayo = crearRayoAbduccion();
    this.rayo = rayo.grupo;
    this.matRayo = rayo.mat;
    this.rayo.position.set(C.victima.x, 0, C.victima.z);
    this.rayo.scale.set(1, C.alturaPlatillo - 0.8, 1);
    this.rayo.visible = false;
    this.grupo.add(this.rayo);
    escena.add(this.grupo);

    // Puntos clave
    this.pVictima = V(C.victima.x, 0, C.victima.z);
    this.pPuerta = V(C.casa.x, 0, C.casa.z - 0.5);
    this.pCorre = V(C.victima.x - 3.5, 0, C.victima.z + 5);   // hasta donde alcanza a correr
    this.pLlegada = V(90, 60, -160);                             // de dónde viene el platillo
    this.pArriba = V(C.victima.x, C.alturaPlatillo, C.victima.z);
    this.pSeVa = V(260, 150, -420);                              // hacia la nave nodriza

    this.fovAntes = this.camara.fov;
    this.camara.fov = 50;
    this.camara.updateProjectionMatrix();
    this.el.capa.hidden = false;
    requestAnimationFrame(() => this.el.capa.classList.add('visible'));
    this.el.texto.classList.remove('visible');
    this.el.dialogo.classList.remove('visible');
    this.activa = true;
    this.actualizar(0);
  }

  actualizar(dt) {
    if (!this.activa) return;
    this.t += dt;
    const t = this.t;
    this.animarPersonas(t);
    this.animarPlatillo(t, dt);
    this.moverCamara(t);
    this.dialogos(t);
    // Sonidos (una sola vez cada uno)
    this.sonarUnaVez('llega', 4.2, 'platilloLlega');
    this.sonarUnaVez('rayo', 8.6, 'abduccion');
    this.sonarUnaVez('seVa', 15.2, 'platilloSeVa');
    if (t >= DURACION) this.terminar();
  }

  sonarUnaVez(clave, segundo, id) {
    if (this.t >= segundo && !this.sonidos[clave]) { this.sonidos[clave] = true; this.sonido.reproducir(id); }
  }

  /* ---------- Los dos hermanos ---------- */
  animarPersonas(t) {
    const otro = this.otro;
    const pz = (g, n) => g.getObjectByName(n);
    // EL OTRO: camina hacia la casa; voltea hacia la luz, mira arriba y el rayo lo sube
    const subir = tramo(t, 9.0, 14.0);
    otro.position.copy(this.pVictima).setY(subir * (C.alturaPlatillo - 1.6));
    otro.visible = t < 14.0;
    const voltea = tramo(t, 5.0, 6.2);
    const haciaLuz = Math.atan2(-(this.pLlegada.x - this.pVictima.x), -(this.pLlegada.z - this.pVictima.z));
    otro.rotation.y = Math.PI + voltea * (haciaLuz - Math.PI) + (t > 9 ? Math.sin(t * 1.7) * 0.6 * subir : 0);
    pz(otro, 'cabeza').rotation.x = tramo(t, 5.6, 7.0) * 0.55;
    const brazoI = pz(otro, 'brazo_izq'), brazoD = pz(otro, 'brazo_der');
    if (t > 8.8) {
      // Patalea y agita los brazos
      brazoI.rotation.x = 2.6 + Math.sin(t * 9) * 0.5;
      brazoD.rotation.x = 2.6 + Math.sin(t * 9 + 1.5) * 0.5;
      pz(otro, 'pierna_izq').rotation.x = Math.sin(t * 8) * 0.5;
      pz(otro, 'pierna_der').rotation.x = -Math.sin(t * 8) * 0.5;
    } else {
      brazoI.rotation.x = brazoD.rotation.x = tramo(t, 6.5, 7.5) * 1.3;   // se cubre de la luz
    }

    // YO: sale corriendo de la casa al oír el grito
    const yo = this.yo;
    yo.visible = t >= 12.0;
    const corre = tramo(t, 12.0, 15.2);
    yo.position.copy(mezclar(this.pPuerta, this.pCorre, corre));
    // Mira hacia su hermano y luego al cielo, siguiendo el platillo
    const haciaVictima = Math.atan2(-(this.pVictima.x - yo.position.x), -(this.pVictima.z - yo.position.z));
    yo.rotation.y = haciaVictima;
    const corriendo = t > 12 && t < 15.2;
    const fase = Math.sin(t * 11);
    pz(yo, 'pierna_izq').rotation.x = corriendo ? fase * 0.8 : 0;
    pz(yo, 'pierna_der').rotation.x = corriendo ? -fase * 0.8 : 0;
    pz(yo, 'brazo_izq').rotation.x = corriendo ? -fase * 0.7 : t > 15.2 ? 0.3 : 0;
    // Al llegar estira el brazo hacia el platillo que se va
    pz(yo, 'brazo_der').rotation.x = corriendo ? fase * 0.7 : 2.7 * tramo(t, 15.0, 15.8) * (1 - tramo(t, 18.6, 19.4) * 0.8);
    pz(yo, 'cabeza').rotation.x = tramo(t, 14.5, 15.5) * 0.6 - tramo(t, 18.8, 19.6) * 0.45;
  }

  /* ---------- Platillo y rayo ---------- */
  animarPlatillo(t, dt) {
    const p = this.platillo;
    let pos;
    if (t < 4.0) pos = this.pLlegada;
    else if (t < 8.5) pos = mezclar(this.pLlegada, this.pArriba, tramo(t, 4.0, 8.5));
    else if (t < 15.0) pos = this.pArriba.clone().setY(C.alturaPlatillo + Math.sin(t * 2) * 0.25);
    else {
      // Se va: primero sube y luego sale disparado hacia la nave nodriza
      const k = (t - 15.0) / 3.5;
      pos = mezclar(this.pArriba, this.pSeVa, Math.min(1, k * k));
    }
    p.position.copy(pos);
    p.visible = t > 3.5 && t < 19.5;
    p.rotation.z = t > 4 && t < 8.5 ? Math.sin(t * 3) * 0.08 : 0;
    this.lucesPlatillo.rotation.y += dt * 2.5;
    this.luz.intensity = 40 * tramo(t, 6.0, 8.5) * (1 - tramo(t, 14.5, 15.5));
    // Rayo: aparece, se queda mientras sube el hermano y se apaga
    const opacidad = tramo(t, 8.5, 9.2) * (1 - tramo(t, 14.0, 14.8));
    this.rayo.visible = opacidad > 0.01;
    this.matRayo.opacity = 0.3 * opacidad * (0.85 + Math.sin(t * 14) * 0.15);
    this.rayo.rotation.y += dt * 0.8;
  }

  /* ---------- Cámara: 6 tomas ---------- */
  moverCamara(t) {
    const cam = this.camara;
    const v = this.pVictima;
    let desde, mira;
    if (t < 4.5) {          // 1. Toda la granja de noche
      const k = tramo(t, 0, 4.5);
      desde = mezclar(V(-52, 16, 48), V(-44, 12, 38), k);
      mira = mezclar(V(-18, 2, 8), V(-15, 6, 2), k);
    } else if (t < 8.5) {   // 2. El hermano voltea… y la cámara sube hasta el platillo que baja
      const k = tramo(t, 4.5, 8.5);
      desde = mezclar(V(v.x + 4.5, 1.9, v.z - 6), V(v.x + 5.5, 1.3, v.z - 5), k);
      mira = mezclar(V(v.x, 1.6, v.z), this.platillo.position, tramo(t, 6.3, 8.3));
    } else if (t < 12.5) {  // 3. Desde abajo: el rayo se lo lleva
      desde = V(v.x + 8, 1.0, v.z + 9);
      mira = this.otro.position.clone().add(V(0, 1.4, 0));
    } else if (t < 15.5) {  // 4. Sale corriendo de la casa
      const k = tramo(t, 12.5, 15.5);
      desde = mezclar(V(v.x - 0.5, 2.2, v.z + 3.5), V(v.x - 1.5, 2.0, v.z + 2.5), k);
      mira = this.yo.position.clone().add(V(0, 1.4, 0));
    } else if (t < 19.0) {  // 5. Por detrás: el platillo se aleja
      desde = this.yo.position.clone().add(V(-0.9, 1.1, 2.6));   // bajito, para ver su brazo estirado
      mira = this.platillo.position.clone();
    } else {                // 6. La cara del personaje: la promesa
      const k = tramo(t, 19.0, 24.5);
      const y = this.yo.position;
      const frente = V(-Math.sin(this.yo.rotation.y), 0, -Math.cos(this.yo.rotation.y));
      desde = y.clone().addScaledVector(frente, 2.4 - k * 0.5).add(V(0.45, 1.6, 0));
      mira = y.clone().add(V(0, 1.75, 0));
    }
    cam.position.copy(desde);
    cam.lookAt(mira);
  }

  /* ---------- Textos en pantalla ---------- */
  dialogos(t) {
    while (this.siguienteDialogo < DIALOGOS.length && t >= DIALOGOS[this.siguienteDialogo][0]) {
      const [, quien, texto] = DIALOGOS[this.siguienteDialogo];
      const frase = textoPersonaje(texto);
      if (quien === null) {
        this.el.texto.textContent = frase;
      } else {
        const nombre = quien === 'yo' ? personaje().nombre : otroPersonaje().nombre;
        this.el.dialogo.textContent = `${nombre}: ${frase}`;
      }
      this.siguienteDialogo++;
    }
    // Cada texto se ve mientras dura su tramo
    const visible = (quien) => DIALOGOS.some(([ini, q, , dur]) => q === quien && t >= ini && t < ini + dur);
    this.el.texto.classList.toggle('visible', visible(null));
    this.el.dialogo.classList.toggle('visible', visible('yo') || visible('otro'));
  }

  /* Quita todo lo de la escena y avisa a main.js */
  terminar() {
    if (!this.activa) return;
    this.activa = false;
    this.escena.remove(this.grupo);
    this.camara.fov = this.fovAntes;
    this.camara.updateProjectionMatrix();
    this.el.capa.classList.remove('visible');
    this.el.texto.classList.remove('visible');
    this.el.dialogo.classList.remove('visible');
    setTimeout(() => { if (!this.activa) this.el.capa.hidden = true; }, 400);
    this.alTerminar();
  }
}
