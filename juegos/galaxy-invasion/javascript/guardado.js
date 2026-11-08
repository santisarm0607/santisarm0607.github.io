/* =========================================================
   GALAXY INVASION — guardado.js
   Guarda y carga el progreso en el navegador (localStorage):
   opciones, logros, estadísticas y zonas completadas.
   Si el navegador no deja guardar (modo incógnito, etc.),
   el juego sigue funcionando, solo que no recuerda nada.
   ========================================================= */

import { CONFIG } from './config.js';

const CLAVE = 'galactic-invasion-guardado-v1';   // nombre viejo a propósito: así no se pierde el progreso

/* Datos vacíos de una partida nueva */
function datosNuevos() {
  return {
    opciones: { ...CONFIG.opcionesIniciales },
    logros: {},                 // id -> fecha en que se desbloqueó
    // Armas que tienes (se conservan entre etapas): [{ tipo, rareza }]
    arsenal: [{ tipo: 'escopeta', rareza: 'comun' }],
    // Partida de la historia (v0.6.5): dónde vas para "Continuar partida".
    // { etapa, control (punto de control), personaje, armas, fecha, terminada }
    partida: null,
    estadisticas: {
      zanganosEliminados: 0,
      babososEliminados: 0,
      partidasJugadas: 0,
      disparos: 0,
      impactos: 0
    },
    progreso: {
      granjaCompletada: false,
      mejoresTiempos: {}        // id de la etapa -> segundos
    }
  };
}

/* Carga lo guardado (o datos nuevos si no hay nada) */
export function cargar() {
  const base = datosNuevos();
  try {
    const texto = localStorage.getItem(CLAVE);
    if (!texto) return base;
    const leido = JSON.parse(texto);
    // Partidas guardadas en la v0.1 tenían el récord de la calle en otro lugar
    if (leido.progreso && leido.progreso.mejorTiempoCalle) {
      leido.progreso.mejoresTiempos = { calle: leido.progreso.mejorTiempoCalle, ...leido.progreso.mejoresTiempos };
      delete leido.progreso.mejorTiempoCalle;
    }
    // Mezclamos con los datos base para que versiones nuevas no fallen
    return {
      opciones: { ...base.opciones, ...leido.opciones },
      logros: { ...leido.logros },
      arsenal: Array.isArray(leido.arsenal) && leido.arsenal.length ? leido.arsenal : base.arsenal,
      partida: leido.partida && leido.partida.etapa ? leido.partida : null,
      estadisticas: { ...base.estadisticas, ...leido.estadisticas },
      progreso: { ...base.progreso, ...leido.progreso, mejoresTiempos: { ...(leido.progreso && leido.progreso.mejoresTiempos) } }
    };
  } catch (error) {
    return base;
  }
}

/* Guarda todo */
export function guardar(datos) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(datos));
  } catch (error) {
    // Sin permiso para guardar: no pasa nada, el juego sigue
  }
}
