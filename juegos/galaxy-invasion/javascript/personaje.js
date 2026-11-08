/* =========================================================
   GALAXY INVASION — personaje.js
   Quién protagoniza la historia: la granjera (Rosa Méndez)
   o el granjero (Tomás Méndez). Son hermanos: la Colmena se
   lleva al que no escogiste y hay que ir a rescatarlo.
   Se elige antes de empezar una etapa y se guarda.
   Los textos con {llaves} se completan con el personaje:
     "{nombre} arranca la camioneta" -> "Tomás arranca la camioneta"
     "Aguanta, {pareja}"             -> "Aguanta, Rosa"
   ========================================================= */

import { CONFIG } from './config.js';

let actual = CONFIG.personajes.granjera;

export function usarPersonaje(id) {
  actual = CONFIG.personajes[id] || CONFIG.personajes.granjera;
  return actual;
}

export function personaje() {
  return actual;
}

/* El hermano secuestrado (el que no escogiste) */
export function otroPersonaje() {
  return CONFIG.personajes[actual.otro];
}

/* Cambia las {llaves} por los nombres del personaje y de su hermano */
export function textoPersonaje(texto) {
  const otro = otroPersonaje();
  const datos = {
    ...actual,
    NOMBRE: actual.nombre.toUpperCase(),
    pareja: otro.nombre,
    PAREJA: otro.nombre.toUpperCase(),
    tuPariente: `tu ${otro.pariente} ${otro.nombre}`,
    suPariente: `su ${otro.pariente} ${otro.nombre}`
  };
  return String(texto).replace(/\{(\w+)\}/g, (todo, clave) => (clave in datos ? datos[clave] : todo));
}
