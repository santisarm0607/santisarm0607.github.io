/* =========================================================
   GALAXY INVASION — barriles.js
   Barriles de combustible que explotan al dispararles (o si
   los toca otra explosión). Se usan en todas las etapas.
   El daño de la explosión lo hace main.js (con el gestor de
   enemigos), aquí solo se maneja cada barril.
   ========================================================= */

import * as THREE from 'three';
import { CONFIG } from './config.js';
import { crearBarril } from './modelos-granja.js';

/* posiciones: [[x, z], ...]. Devuelve la lista de barriles */
export function colocarBarriles(escena, posiciones, colisiones, solidos) {
  const lista = [];
  posiciones.forEach(([x, z]) => {
    const { grupo } = crearBarril();
    grupo.position.set(x, 0, z);
    grupo.rotation.y = Math.random() * Math.PI;
    escena.add(grupo);
    const caja = { minX: x - 0.4, maxX: x + 0.4, minZ: z - 0.4, maxZ: z + 0.4, alto: 1.1 };
    const b = {
      grupo, caja, posicion: new THREE.Vector3(x, 0.6, z), vida: CONFIG.objetos.vidaBarril, explotado: false,
      alExplotar: () => {},          // main.js pone aquí qué hacer (daño, sonido...)
      explotar() {
        if (b.explotado) return;
        b.explotado = true;
        grupo.visible = false;
        const i = colisiones.indexOf(caja);
        if (i >= 0) colisiones.splice(i, 1);
        const j = solidos.indexOf(grupo);
        if (j >= 0) solidos.splice(j, 1);
        b.alExplotar(b);
      },
      reiniciar() {
        b.explotado = false;
        b.vida = CONFIG.objetos.vidaBarril;
        grupo.visible = true;
        if (!colisiones.includes(caja)) colisiones.push(caja);
        if (!solidos.includes(grupo)) solidos.push(grupo);
      }
    };
    // Las balas le pegan (ver armas.js: "blanco")
    grupo.userData.blanco = {
      recibirDisparo(danio) {
        if (b.explotado) return;
        b.vida -= danio;
        if (b.vida <= 0) b.explotar();
      }
    };
    colisiones.push(caja);
    solidos.push(grupo);
    lista.push(b);
  });
  return lista;
}
