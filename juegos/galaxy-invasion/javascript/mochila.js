/* =========================================================
   GALAXY INVASION — mochila.js  (v0.8)
   La mochila del personaje:
     - Botiquines: si recoges uno con la vida llena, se guarda
       (máximo 3). Se usa con H o desde la mochila.
     - Granadas: se lanzan con G (máximo 6).
     - Objetos importantes: lo que encuentras en la historia
       (llaves, el sombrero de tu hermano, la grabación…).
   La mochila se abre con Tab o I (en el celular, con su botón)
   y el juego se pausa mientras está abierta.
   Se guarda con la partida (ver guardarPartida en main.js).
   ========================================================= */

import { CONFIG } from './config.js';
import { textoPersonaje } from './personaje.js';

/* Objetos importantes que se pueden encontrar */
export const OBJETOS = {
  llaves:     { icono: '🔑', nombre: 'Llaves de la camioneta', texto: 'Las encontraste en el granero. Sin ellas no hay cómo salir de la granja.' },
  carta:      { icono: '✉️', nombre: 'Carta de los Ortiz', texto: 'Los vecinos que rescataste: "Gracias, {nombre}. Vimos el platillo irse hacia la ciudad."' },
  nidoMuestra:{ icono: '🧪', nombre: 'Muestra de nido', texto: 'Un pedazo del capullo de la Colmena. Todavía late un poco…' },
  sombrero:   { icono: '🤠', nombre: 'El sombrero de {pareja}', texto: 'Estaba tirado en el cuarto de armas de la nave. {pareja} estuvo ahí.' },
  grabacion:  { icono: '📼', nombre: 'La grabación', texto: '"Humanos capturados: 214. Destino: el planeta de la Mente Colmena."' }
};

export class Mochila {
  constructor() {
    this.vaciar();
  }

  /* Partida nueva */
  vaciar() {
    this.botiquines = 0;
    this.granadas = CONFIG.granada.inicial;
    this.objetos = [];
  }

  guardable() {
    return { botiquines: this.botiquines, granadas: this.granadas, objetos: [...this.objetos] };
  }

  cargar(g) {
    if (!g) { this.vaciar(); return; }
    this.botiquines = Math.min(CONFIG.mochila.maxBotiquines, g.botiquines || 0);
    this.granadas = Math.min(CONFIG.granada.maximo, g.granadas ?? CONFIG.granada.inicial);
    this.objetos = Array.isArray(g.objetos) ? g.objetos.filter((o) => OBJETOS[o]) : [];
  }

  get botiquinesLlenos() { return this.botiquines >= CONFIG.mochila.maxBotiquines; }
  get granadasLlenas() { return this.granadas >= CONFIG.granada.maximo; }

  /* Agrega granadas; devuelve cuántas cupieron */
  agregarGranadas(n) {
    const antes = this.granadas;
    this.granadas = Math.min(CONFIG.granada.maximo, this.granadas + n);
    return this.granadas - antes;
  }

  /* Agrega un objeto importante (si no lo tenías). true = era nuevo */
  agregarObjeto(id) {
    if (!OBJETOS[id] || this.objetos.includes(id)) return false;
    this.objetos.push(id);
    return true;
  }

  /* Dibuja el panel de la mochila */
  dibujar(contenedor) {
    const M = CONFIG.mochila, G = CONFIG.granada;
    const ranura = (icono, nombre, cantidad, maximo, ayuda) => `
      <div class="mochila-ranura">
        <span class="mochila-icono" aria-hidden="true">${icono}</span>
        <span class="mochila-nombre">${nombre}</span>
        <span class="mochila-cantidad">${cantidad} / ${maximo}</span>
        <span class="mochila-ayuda">${ayuda}</span>
      </div>`;
    const objetos = this.objetos.length
      ? this.objetos.map((id) => {
        const o = OBJETOS[id];
        return `<li class="mochila-objeto"><span class="mochila-icono" aria-hidden="true">${o.icono}</span><div><strong>${textoPersonaje(o.nombre)}</strong><p>${textoPersonaje(o.texto)}</p></div></li>`;
      }).join('')
      : '<li class="mochila-vacia">Todavía no has encontrado objetos importantes.</li>';
    contenedor.innerHTML = `
      <div class="mochila-ranuras">
        ${ranura('✚', 'Botiquines', this.botiquines, M.maxBotiquines, `Cura ${M.curaBotiquin} · tecla H`)}
        ${ranura('💣', 'Granadas', this.granadas, G.maximo, 'Lanzar · tecla G')}
      </div>
      <h3 class="mochila-subtitulo">Objetos importantes</h3>
      <ul class="mochila-objetos">${objetos}</ul>`;
  }
}
