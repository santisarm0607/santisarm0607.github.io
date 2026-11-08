/* =========================================================
   GALAXY INVASION — mundo-granja.js
   Construye la Etapa 1: la granja de Rosa en San Isidro.
   La granja (188 x 188 m, con cerca) está en el centro de un
   mapa de 400 x 400 m que se puede explorar (v0.8): la granja
   de los vecinos Ortiz al oeste, la laguna al sur, la cabaña
   del cazador al este y la gasolinera al norte de la carretera.
   El borde es un bosque cerrado (no hay paredes invisibles).
   De noche. Lejos, al noreste, se ve la nave nodriza.

   Mapa visto desde arriba (norte arriba):

     ┌──────────── carretera ───────────── [camioneta]
     │  maíz       ┌─ camino de tierra ─────┘
     │  maíz       │        maíz   maíz
     │  maíz       │   corral   [granero] silo
     │  maíz       │
     │   molino   [casa]   pozo        maíz
     └─────────────────────────────────────────
   ========================================================= */

import * as THREE from 'three';
import { CONFIG } from './config.js';
import { material, crearCofre, crearCajaMunicion, crearBotiquin, crearNaveNodriza, crearSuministro } from './modelos.js';
import {
  COLORES_GRANJA, crearCasa, crearGranero, crearSilo, crearCerca, crearPorton, crearTractor,
  crearMolino, crearPozo, crearPaca, crearLlaves, crearMesa, crearBuzon, crearLuna
} from './modelos-granja.js';
import { crearTexturaHumo, fusionarEstaticos } from './mundo.js';
import { colocarBarriles } from './barriles.js';
import { crearRoca } from './modelos-carretera.js';
import { crearPersonaGranja } from './modelos-granja.js';

export const NIEBLA_GRANJA = 0.017;

export function crearGranja(escena, calidad) {
  const G = CONFIG.granja;
  const colisiones = [];
  const solidos = [];
  const animables = [];

  /* ---------- Cielo nocturno, niebla y luces ---------- */
  escena.background = new THREE.Color(0x0a0c1c);
  escena.fog = new THREE.FogExp2(0x0d1020, NIEBLA_GRANJA * calidad.niebla);
  escena.add(new THREE.HemisphereLight(0x8a98d8, 0x22301a, 1.5));
  const lunaLuz = new THREE.DirectionalLight(0xb8c6ff, 1.0);
  lunaLuz.position.set(-60, 80, -100);
  escena.add(lunaLuz);

  /* ---------- Ayudantes ---------- */
  const caja3 = new THREE.Box3();
  const estaticos = [];   // cosas que nunca se mueven: al final se juntan en pocos dibujos
  function agregarColision(objeto, encoger = 0.05) {
    objeto.updateWorldMatrix(true, true);
    caja3.setFromObject(objeto);
    colisiones.push({ minX: caja3.min.x + encoger, maxX: caja3.max.x - encoger, minZ: caja3.min.z + encoger, maxZ: caja3.max.z - encoger, alto: caja3.max.y });
  }
  // Techos: los proyectiles en arco que caen encima se estrellan contra el techo
  const techos = [];
  function agregarTecho(grupo) {
    grupo.updateWorldMatrix(true, true);
    const c = new THREE.Box3().setFromObject(grupo);
    techos.push({ minX: c.min.x, maxX: c.max.x, minZ: c.min.z, maxZ: c.max.z, alto: c.max.y });
  }
  function colocar(grupo, x, z, rotY = 0, choca = true, bloqueaBalas = true) {
    grupo.position.set(x, 0, z);
    grupo.rotation.y = rotY;
    escena.add(grupo);
    if (choca) agregarColision(grupo);
    if (bloqueaBalas) solidos.push(grupo);
    estaticos.push({ grupo, solido: bloqueaBalas });
    return grupo;
  }

  /* ---------- Suelo y caminos ---------- */
  const suelo = new THREE.Mesh(new THREE.PlaneGeometry(700, 700), material(COLORES_GRANJA.pasto));
  suelo.name = 'suelo';
  suelo.rotation.x = -Math.PI / 2;
  escena.add(suelo);
  solidos.push(suelo);
  const matTierra = material(COLORES_GRANJA.tierra);
  function camino(x1, z1, x2, z2, ancho = 5) {
    const largo = Math.hypot(x2 - x1, z2 - z1);
    const c = new THREE.Mesh(new THREE.PlaneGeometry(ancho, largo + ancho), matTierra);
    c.rotation.x = -Math.PI / 2;
    c.rotation.z = Math.atan2(x2 - x1, z2 - z1);
    c.position.set((x1 + x2) / 2, 0.02, (z1 + z2) / 2);
    escena.add(c);
    estaticos.push({ grupo: c, solido: false });
  }
  camino(-25, 15, -25, -70);
  camino(-25, -70, 60, -70);
  camino(60, -70, 60, -88);
  camino(-25, -20, 24, -20, 4);       // del camino al granero
  // v0.8: caminos hacia los alrededores (salen por los huecos de la cerca)
  camino(-25, 2, -150, 2, 4);         // al oeste: granja de los Ortiz
  camino(0, 40, 0, 118, 4);           // al sur: la laguna
  camino(60, 20, 165, 20, 4);         // al este: hacia la cabaña del cazador
  camino(165, 20, 172, 55, 3);
  // Carretera de asfalto (borde norte): por aquí se va a la ciudad
  const carretera = new THREE.Mesh(new THREE.PlaneGeometry(500, 10), material(0x1b1d23));
  carretera.rotation.x = -Math.PI / 2;
  carretera.position.set(0, 0.03, -92);
  escena.add(carretera);
  for (let x = -196; x <= 200; x += 6) {
    const l = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 0.2), material(0x8a7a3a));
    l.rotation.x = -Math.PI / 2;
    l.position.set(x, 0.04, -92);
    escena.add(l);
    estaticos.push({ grupo: l, solido: false });
  }

  /* ---------- Casa de Rosa (el porche mira al norte) ---------- */
  const casa = crearCasa();
  colocar(casa.grupo, -25, 26, Math.PI, false, true);
  colisiones.push({ minX: -31, maxX: -19, minZ: 22, maxZ: 30 });
  const luzPorche = new THREE.PointLight(0xffb060, 26, 18, 1.6);
  luzPorche.position.set(-25, 3, 19.5);
  luzPorche.visible = calidad.luces;
  escena.add(luzPorche);

  /* ---------- Granero (puerta hacia el oeste) y silo ---------- */
  const granero = crearGranero();
  granero.grupo.position.set(35, 0, -20);
  granero.grupo.rotation.y = Math.PI / 2;
  escena.add(granero.grupo);
  // La pared de encima de la puerta (a más de 5 m) NO cuenta para chocar:
  // los choques se miran desde arriba y si no taparía la entrada
  granero.paredes.filter((p) => p.name !== 'frente_arriba').forEach((p) => agregarColision(p, 0.02));
  solidos.push(granero.grupo);
  agregarTecho(granero.grupo);
  estaticos.push({ grupo: granero.grupo, solido: true });
  const luzGranero = new THREE.PointLight(0xffc070, 18, 16, 1.6);
  luzGranero.position.set(38, 6, -20);
  luzGranero.visible = calidad.luces;
  escena.add(luzGranero);
  animables.push(() => { luzGranero.intensity = Math.random() < 0.015 ? 6 : 18; }); // foco que parpadea

  // Mesa con las llaves (al fondo del granero)
  colocar(crearMesa().grupo, 43.5, -20, Math.PI / 2);
  const llaves = crearLlaves();
  llaves.grupo.position.set(43.5, 1.12, -20);
  escena.add(llaves.grupo);
  animables.push((t) => { if (llaves.grupo.visible) { llaves.grupo.rotation.y = t * 2; llaves.grupo.position.y = 1.15 + Math.sin(t * 3) * 0.04; } });

  colocar(crearSilo().grupo, 54, -4, 0);

  // Pila de pacas detrás del granero: de aquí se levanta la Bestia de Heno.
  // Va aparte (no se junta con lo quieto) para poder esconderla.
  const pilaPacas = new THREE.Group();
  pilaPacas.name = 'pila_pacas';
  [[22, -32, 0], [23.4, -32, 0], [22.7, -32, 0, 0.8], [26, -34, 0.6], [20, -36, 0.3], [21.3, -36, 0.3], [22, -34, 1.2, 0], [23, -34.5, 0.2, 0.8], [24.5, -33, 0.9, 0]].forEach(([x, z, r, y = 0]) => {
    const p = crearPaca().grupo;
    p.position.set(x, y, z);
    p.rotation.y = r;
    pilaPacas.add(p);
  });
  escena.add(pilaPacas);
  // Barriles de combustible: explotan al dispararles (sirven contra la Bestia)
  const barriles = colocarBarriles(escena, [
    [24, -6], [25.2, -6.4], [24.5, -7.4], [-18, 16], [8, -60],
    [12, -28], [4, -22], [-6, -17], [17, -13], [31, -36], [9, -38], [-12, -30], [36, -8]
  ], colisiones, solidos);

  /* ---------- Corral con cerca (abierto al sur) ---------- */
  const corral = { x: -2, z: -4, ancho: 22, fondo: 16 };
  [
    [corral.x, corral.z - corral.fondo / 2, corral.ancho, 0],              // norte
    [corral.x - corral.ancho / 2, corral.z, corral.fondo, Math.PI / 2],    // oeste
    [corral.x + corral.ancho / 2, corral.z, corral.fondo, Math.PI / 2],    // este
    [corral.x - 6.5, corral.z + corral.fondo / 2, 9, 0],                   // sur (dos tramos con portón)
    [corral.x + 6.5, corral.z + corral.fondo / 2, 9, 0]
  ].forEach(([x, z, largo, r]) => colocar(crearCerca(largo).grupo, x, z, r));
  colocar(crearPaca().grupo, -8, -8, 0.4);
  colocar(crearBuzon().grupo, 63, -84, 0, false, false);

  /* ---------- Tractores, camioneta, molino, pozo ---------- */
  colocar(crearTractor().grupo, -10, 18, 0.6);
  colocar(crearTractor().grupo, 22, 34, -1.2);
  // La camioneta ya no es un adorno: desde la v0.6 se maneja (la pone vehiculo.js en (60, -80))
  const molino = crearMolino();
  colocar(molino.grupo, -55, 35, 0.4, false, false);
  colisiones.push({ minX: -56, maxX: -54, minZ: 34, maxZ: 36 });
  animables.push((t, dt) => { molino.aspas.rotation.z += dt * 0.8; });
  colocar(crearPozo().grupo, -6, 32, 0);

  /* ---------- Campos de maíz (muchos tallos con un solo dibujo) ---------- */
  const campos = [
    { x1: -86, x2: -32, z1: -64, z2: -8 },
    { x1: 8, x2: 86, z1: 18, z2: 84 },
    { x1: 4, x2: 86, z1: -64, z2: -36 },
    { x1: -86, x2: -40, z1: 48, z2: 86 }
  ];
  const separacion = 1.45 / Math.sqrt(calidad.maiz);
  const posMaiz = [];
  campos.forEach((c) => {
    for (let x = c.x1; x < c.x2; x += separacion) {
      for (let z = c.z1; z < c.z2; z += separacion * 1.1) posMaiz.push([x + (Math.random() - 0.5) * 0.5, z + (Math.random() - 0.5) * 0.5]);
    }
  });
  const geoMaiz = new THREE.ConeGeometry(0.38, 2.5, 4);
  geoMaiz.translate(0, 1.25, 0);
  const maiz = new THREE.InstancedMesh(geoMaiz, new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }), posMaiz.length);
  maiz.name = 'maiz';
  const m4 = new THREE.Matrix4();
  const colorMaiz = new THREE.Color();
  posMaiz.forEach(([x, z], i) => {
    const alto = 0.8 + Math.random() * 0.4;
    m4.makeRotationY(Math.random() * Math.PI);
    m4.scale(new THREE.Vector3(1, alto, 1));
    m4.setPosition(x, 0, z);
    maiz.setMatrixAt(i, m4);
    colorMaiz.setHex(Math.random() < 0.25 ? COLORES_GRANJA.maizSeco : COLORES_GRANJA.maiz).multiplyScalar(0.8 + Math.random() * 0.4);
    maiz.setColorAt(i, colorMaiz);
  });
  escena.add(maiz);

  /* ---------- Árboles (borde del mapa y algunos sueltos) ---------- */
  const posArboles = [];
  // v0.8: el borde del mapa es un BOSQUE CERRADO (tres filas de árboles)
  // justo después del límite: así se ve por qué no se puede seguir.
  for (let fila = 0; fila < 3; fila++) {
    const r = G.limite + 4 + fila * 5;
    for (let p = -r; p <= r; p += 5.5) {
      const j = () => (Math.random() - 0.5) * 3;
      posArboles.push([p + j(), -r + j(), false], [p + j(), r + j(), false], [-r + j(), p + j(), false], [r + j(), p + j(), false]);
    }
  }
  // Árboles sueltos y bosquecitos en los alrededores (estos sí chocan)
  [[-70, 15], [-62, 22], [-45, 62], [-8, 60], [5, 64], [70, 5], [80, -12], [-12, 44], [-38, 8]].forEach(([x, z]) => posArboles.push([x, z, true]));
  const bosquecito = (cx, cz, radio, n) => {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * radio;
      posArboles.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r, true]);
    }
  };
  bosquecito(150, 75, 26, 34);     // bosque del cazador (este)
  bosquecito(-120, 150, 30, 30);   // bosque del suroeste
  bosquecito(130, -150, 30, 26);   // al otro lado de la carretera (noreste)
  bosquecito(-150, -150, 34, 30);  // noroeste
  bosquecito(60, 170, 22, 16);     // sureste, junto a la laguna
  bosquecito(-170, 80, 18, 14);
  // Sin árboles encima de caminos, casas ni la carretera
  const libre = ([x, z]) => !(Math.abs(z + 92) < 9 || (Math.abs(z - 2) < 4 && x < -20 && x > -152) || (Math.abs(x) < 4 && z > 38 && z < 120)
    || (Math.abs(z - 20) < 4 && x > 58 && x < 168) || Math.hypot(x - 10, z - 150) < 33 || Math.hypot(x - 172, z - 62) < 10 || Math.hypot(x + 150, z + 10) < 32);
  for (let i = posArboles.length - 1; i >= 0; i--) if (posArboles[i][2] && !libre(posArboles[i])) posArboles.splice(i, 1);
  const tronco = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.3, 0.4, 3, 6), material(0x3a2818), posArboles.length);
  const copa = new THREE.InstancedMesh(new THREE.ConeGeometry(2.6, 6, 7), material(0x18301c), posArboles.length);
  posArboles.forEach(([x, z, choca], i) => {
    const e = 0.8 + Math.random() * 0.6;
    m4.makeScale(e, e, e); m4.setPosition(x, 1.5 * e, z); tronco.setMatrixAt(i, m4);
    m4.makeScale(e, e, e); m4.setPosition(x, 5.5 * e, z); copa.setMatrixAt(i, m4);
    if (choca) colisiones.push({ minX: x - 0.4, maxX: x + 0.4, minZ: z - 0.4, maxZ: z + 0.4 });
  });
  escena.add(tronco, copa);

  /* ---------- Cerca del borde ---------- */
  // La cerca de la granja (v0.8: ya no es el borde del mapa). Tiene el portón del
  // norte (hacia la carretera) y tres huecos rotos: oeste, sur y este.
  const L = G.cerca;
  const P = G.porton, anchoPorton = 6;
  // tramo(desde, hasta, fijo, horizontal): un lado de la cerca sin los huecos
  function lado(fijo, horizontal, huecos) {
    let desde = -L;
    [...huecos, [L, L]].forEach(([a, b]) => {
      if (a - desde > 1) {
        const c = crearCerca(a - desde).grupo;
        const medio = (desde + a) / 2;
        c.position.set(horizontal ? medio : fijo, 0, horizontal ? fijo : medio);
        c.rotation.y = horizontal ? 0 : Math.PI / 2;
        escena.add(c);
        estaticos.push({ grupo: c, solido: false });
      }
      desde = b;
    });
  }
  lado(-L + 5, true, [[P.x - anchoPorton, P.x + anchoPorton]]);   // norte (portón)
  lado(L, true, [[-6, 6]]);                                        // sur (hacia la laguna)
  lado(-L, false, [[-4, 8]]);                                      // oeste (hacia los Ortiz)
  lado(L, false, [[14, 26]]);                                      // este (hacia la cabaña)

  // El portón (postes y la hoja abierta hacia adentro de la granja)
  const porton = crearPorton(anchoPorton * 2).grupo;
  porton.position.set(P.x, 0, -L + 5);
  escena.add(porton);
  estaticos.push({ grupo: porton, solido: false });

  /* =========================================================
     ALREDEDORES (v0.8): para explorar y con misiones extra
     ========================================================= */
  // --- Granja de los Ortiz (oeste): casa, granero y un maizal chico ---
  colocar(crearCasa().grupo, -160, -32, -Math.PI / 2);
  const graneroOrtiz = crearGranero();
  graneroOrtiz.grupo.position.set(-140, 0, 10);
  graneroOrtiz.grupo.rotation.y = -Math.PI / 2;          // la puerta mira al este (hacia la granja de Rosa)
  escena.add(graneroOrtiz.grupo);
  graneroOrtiz.paredes.filter((p) => p.name !== 'frente_arriba').forEach((p) => agregarColision(p, 0.02));
  solidos.push(graneroOrtiz.grupo);
  agregarTecho(graneroOrtiz.grupo);
  estaticos.push({ grupo: graneroOrtiz.grupo, solido: true });
  colocar(crearTractor().grupo, -122, -20, 2.2);
  const luzOrtiz = new THREE.PointLight(0xffb060, 20, 16, 1.6);
  luzOrtiz.position.set(-128, 5, 10);
  luzOrtiz.visible = calidad.luces;
  escena.add(luzOrtiz);
  animables.push(() => { luzOrtiz.intensity = Math.random() < 0.02 ? 4 : 20; });
  // Los vecinos (don Julio y Marta), escondidos en su granero
  const vecinos = [
    crearPersonaGranja('don_julio', { camisa: 0x6a6a3a, overol: 0x3a3a4a, sombrero: 0x6a5a3a, pelo: 0x8a8a8a, barba: true, ancho: 1.1, escala: 1.0 }),
    crearPersonaGranja('marta', { camisa: 0x3a6a6a, overol: 0x4a3a5a, sombrero: 0x9a7a4a, pelo: 0x2a1a10, trenza: true, ancho: 1, escala: 0.95 })
  ].map((v, i) => {
    v.grupo.position.set(-134, 0, 8 + i * 3.5);
    v.grupo.rotation.y = -Math.PI / 2 - 0.3 + i * 0.6;   // miran hacia la puerta
    escena.add(v.grupo);
    return v.grupo;
  });

  // --- La laguna (sur) con un muelle: el agua te hace ir lento ---
  const agua = new THREE.Mesh(new THREE.CircleGeometry(28, 28), new THREE.MeshLambertMaterial({ color: 0x1a3a5a, emissive: 0x06121e, transparent: true, opacity: 0.88 }));
  agua.rotation.x = -Math.PI / 2;
  agua.position.set(10, 0.05, 150);
  escena.add(agua);
  animables.push((t) => { agua.material.emissive.setRGB(0.02 + Math.sin(t) * 0.01, 0.07, 0.12 + Math.sin(t * 0.7) * 0.02); });
  const matTabla = material(COLORES_GRANJA.madera);
  const muelle = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const tabla = new THREE.Mesh(new THREE.BoxGeometry(3, 0.15, 1.8), matTabla);
    tabla.position.set(0, 0.35, i * 1.9);
    muelle.add(tabla);
  }
  muelle.position.set(10, 0, 120);
  escena.add(muelle);
  estaticos.push({ grupo: muelle, solido: false });
  [[-12, 132], [32, 130], [38, 158], [-20, 168], [14, 180]].forEach(([x, z]) => { const r = crearRoca(); r.scale.setScalar(1.4); colocar(r, x, z, Math.random() * 3); });

  // --- Cabaña del cazador (este, en el bosque) ---
  const cabana = new THREE.Group();
  const matTronco = material(0x5a3a22);
  const paredCabana = (w, h, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), matTronco); m.position.set(x, y, z); cabana.add(m); };
  paredCabana(7, 3, 0.4, 0, 1.5, -3);            // atrás
  paredCabana(0.4, 3, 6, -3.5, 1.5, 0);           // lados
  paredCabana(0.4, 3, 6, 3.5, 1.5, 0);
  paredCabana(2.5, 3, 0.4, -2.25, 1.5, 3);        // frente con puerta en medio
  paredCabana(2.5, 3, 0.4, 2.25, 1.5, 3);
  const techoCabana = new THREE.Mesh(new THREE.ConeGeometry(5.6, 2.4, 4), material(0x3a2a1a));
  techoCabana.position.y = 4.2;
  techoCabana.rotation.y = Math.PI / 4;
  cabana.add(techoCabana);
  cabana.position.set(172, 0, 62);
  escena.add(cabana);
  solidos.push(cabana);
  estaticos.push({ grupo: cabana, solido: true });
  // Paredes de la cabaña (la puerta, de 2 m, mira al sur)
  colisiones.push({ minX: 168.3, maxX: 175.7, minZ: 58.8, maxZ: 59.2 }, { minX: 168.3, maxX: 168.7, minZ: 59, maxZ: 65 }, { minX: 175.3, maxX: 175.7, minZ: 59, maxZ: 65 },
    { minX: 168.5, maxX: 171, minZ: 64.8, maxZ: 65.2 }, { minX: 173, maxX: 175.5, minZ: 64.8, maxZ: 65.2 });

  // --- Gasolinera abandonada (al norte de la carretera) ---
  const gas = new THREE.Group();
  const matGas = material(0x8a8a90);
  const techoGas = new THREE.Mesh(new THREE.BoxGeometry(14, 0.5, 9), material(0xb03a2a));
  techoGas.position.set(0, 5, 0);
  gas.add(techoGas);
  [[-6, -3.5], [6, -3.5], [-6, 3.5], [6, 3.5]].forEach(([x, z]) => { const c = new THREE.Mesh(new THREE.BoxGeometry(0.4, 5, 0.4), matGas); c.position.set(x, 2.5, z); gas.add(c); });
  [[-2.5, 0], [2.5, 0]].forEach(([x, z]) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.8, 0.6), material(0xd8cbb0));
    b.position.set(x, 0.9, z); gas.add(b);
    const pantalla = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.05), material(0x5dff9b, { brilla: true }));
    pantalla.position.set(x, 1.4, z + 0.32); gas.add(pantalla);
  });
  gas.position.set(-60, 0, -118);
  escena.add(gas);
  solidos.push(gas);
  estaticos.push({ grupo: gas, solido: true });
  colisiones.push({ minX: -63, maxX: -62, minZ: -118.3, maxZ: -117.7 }, { minX: -58, maxX: -57, minZ: -118.3, maxZ: -117.7 });
  const tienda = new THREE.Group();
  const caraTienda = new THREE.Mesh(new THREE.BoxGeometry(12, 4, 8), material(0xc8c0b0));
  caraTienda.position.y = 2;
  tienda.add(caraTienda);
  const vidrioTienda = new THREE.Mesh(new THREE.BoxGeometry(6, 2, 0.1), material(0x3a5a6a, { brilla: true }));
  vidrioTienda.position.set(0, 1.8, 4.05);
  tienda.add(vidrioTienda);
  colocar(tienda, -60, -134, 0);

  // --- Derrumbe en la carretera (oeste): por ahí no se puede salir ---
  for (let i = 0; i < 9; i++) {
    const r = crearRoca();
    r.scale.setScalar(2 + Math.random() * 1.5);
    colocar(r, -186 + Math.random() * 6, -98 + i * 1.6, Math.random() * 3);
  }

  // --- Rocas sueltas en el campo (cobertura) ---
  [[-60, 120], [-100, 60], [120, -20], [140, 110], [-130, -60], [90, 150], [-40, 150], [110, 60]].forEach(([x, z]) => { const r = crearRoca(); r.scale.setScalar(1.6); colocar(r, x, z, Math.random() * 3); });

  /* ---------- Cofres (dan un arma al azar) ----------
     v0.8: los tres últimos están ESCONDIDOS lejos (misión extra) y dan armas mejores */
  const cofres = [];
  [[-31, 17, 0], [6, -9, Math.PI], [58, 1, -Math.PI / 2], [-50, 40, 0.3],
   [172, 61, Math.PI, 'epica'], [14.5, 118.5, Math.PI, 'epica'], [-60, -140, 0, 'legendaria']].forEach(([x, z, r, rareza]) => {
    const c = crearCofre();
    colocar(c.grupo, x, z, r);
    const datos = { ...c, abierto: false, posicion: new THREE.Vector3(x, 0, z), angulo: 0, rareza, escondido: !!rareza };
    cofres.push(datos);
    animables.push((t, dt) => {
      const objetivo = datos.abierto ? 1.9 : 0;
      datos.angulo += (objetivo - datos.angulo) * Math.min(1, dt * 6);
      c.tapa.rotation.x = datos.angulo;
    });
  });

  /* ---------- Suministros ---------- */
  const suministros = [];
  function agregarSuministro(tipo, x, z) {
    const modelo = crearSuministro(tipo);
    modelo.grupo.position.set(x, 0, z);
    escena.add(modelo.grupo);
    const s = { tipo, grupo: modelo.grupo, posicion: new THREE.Vector3(x, 0, z), activo: true, base: Math.random() * 6 };
    suministros.push(s);
    return s;
  }
  [[-21, 18], [14, -4], [30, -26], [-45, -4], [40, 12]].forEach(([x, z]) => agregarSuministro('botiquin', x, z));
  [[-28, 18], [-6, -4], [27, -9], [-40, 28], [48, -66], [-25, -50]].forEach(([x, z]) => agregarSuministro('cartuchos', x, z));
  [[56, -72], [10, 8], [-12, -30]].forEach(([x, z]) => agregarSuministro('balas', x, z));
  // v0.8: suministros en los alrededores (y cajas de granadas)
  [[-128, 4], [12, 112], [160, 20], [-55, -110]].forEach(([x, z]) => agregarSuministro('botiquin', x, z));
  [[-150, 30], [-70, 130], [140, -60], [100, 120]].forEach(([x, z]) => agregarSuministro('cartuchos', x, z));
  [[-110, -40], [150, 90], [-30, 170]].forEach(([x, z]) => agregarSuministro('balas', x, z));
  [[20, -14], [-62, -121], [168, 66], [-125, 120], [130, 140]].forEach(([x, z]) => agregarSuministro('granadas', x, z));
  animables.push((t) => {
    suministros.forEach((s) => {
      if (!s.activo) return;
      s.grupo.rotation.y = t * 1.2 + s.base;
      s.grupo.position.y = 0.15 + Math.sin(t * 2.5 + s.base) * 0.08;
    });
  });

  /* ---------- Humo de la chimenea ---------- */
  const matHumo = new THREE.SpriteMaterial({ map: crearTexturaHumo(), color: 0x6a6878, transparent: true, opacity: 0.25, depthWrite: false });
  for (let i = 0; i < Math.min(4, calidad.humo); i++) {
    const humo = new THREE.Sprite(matHumo);
    const fase = i / 4;
    escena.add(humo);
    animables.push((t) => {
      const ciclo = (t * 0.1 + fase) % 1;
      humo.position.set(-28.5 + Math.sin(t * 0.4 + i) * 0.8, 9 + ciclo * 12, 27.5);
      const tam = 2 + ciclo * 6;
      humo.scale.set(tam, tam, 1);
    });
  }

  /* ---------- Cielo: luna, estrellas, nave nodriza a lo lejos y la ciudad ---------- */
  const luna = crearLuna();
  luna.position.set(-260, 170, -380);
  escena.add(luna);
  const posEstrellas = [];
  for (let i = 0; i < 700; i++) {
    const a = Math.random() * Math.PI * 2;
    const alt = 0.08 + Math.random() * 0.9;
    posEstrellas.push(Math.cos(a) * 400 * Math.cos(alt), 400 * Math.sin(alt), Math.sin(a) * 400 * Math.cos(alt));
  }
  const geoEstrellas = new THREE.BufferGeometry();
  geoEstrellas.setAttribute('position', new THREE.Float32BufferAttribute(posEstrellas, 3));
  escena.add(new THREE.Points(geoEstrellas, new THREE.PointsMaterial({ color: 0xdfe4ff, size: 1.3, sizeAttenuation: false, fog: false })));

  // La nave nodriza está muy lejos, sobre la ciudad (al noreste)
  const nave = crearNaveNodriza();
  nave.grupo.position.set(320, 140, -720);
  nave.grupo.scale.setScalar(1.8);
  escena.add(nave.grupo);
  animables.push((t) => { nave.grupo.rotation.y = t * 0.02; });
  const rayo = new THREE.Mesh(new THREE.ConeGeometry(30, 260, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0x5dff9b, transparent: true, opacity: 0.06, fog: false, depthWrite: false, side: THREE.DoubleSide }));
  rayo.position.set(320, 10, -720);
  escena.add(rayo);
  // Silueta de la ciudad en el horizonte
  const matCiudad = new THREE.MeshBasicMaterial({ color: 0x090a14, fog: false });
  const matVentanas = new THREE.MeshBasicMaterial({ color: 0x3a3a26, fog: false });
  for (let i = 0; i < 26; i++) {
    const ancho = 14 + Math.random() * 20, alto = 25 + Math.random() * 70;
    const x = 160 + i * 16 + Math.random() * 6, z = -640 - Math.random() * 80;
    const e = new THREE.Mesh(new THREE.BoxGeometry(ancho, alto, 14), matCiudad);
    e.position.set(x, alto / 2 - 4, z);
    escena.add(e);
    if (i % 3 === 0) {
      const v = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 0.5), matVentanas);
      v.position.set(x, alto * 0.6, z + 7.3);
      escena.add(v);
    }
  }

  /* ---------- Puntos donde aparecen los aliens (en el maíz y el bosque) ---------- */
  const puntosAparicion = [
    [-40, -20], [-40, -45], [-62, -30], [-38, -58], [12, -45], [30, -55], [62, -48], [80, -40],
    [15, 25], [40, 30], [70, 40], [55, 70], [-70, 20], [-60, 60], [-12, 62], [82, 2], [70, -25], [-80, -10], [-20, -82], [20, -82],
    // v0.8: también afuera de la cerca (por si te alejas)
    [-120, 30], [-110, -50], [-150, 60], [-60, 115], [40, 120], [110, 100], [130, 30], [120, -50], [-20, -125], [60, -125], [-100, -120]
  ].map(([x, z]) => new THREE.Vector3(x, 0, z));

  /* ---------- Cámara del menú: vuela despacio sobre la granja ---------- */
  function camaraMenu(t, camara) {
    const a = t * 0.04 + 2.4;
    camara.position.set(-5 + Math.sin(a) * 48, 16 + Math.sin(t * 0.15) * 2, -10 + Math.cos(a) * 48);
    camara.lookAt(5, 2, -12);
  }

  /* ---------- Juntar lo que no se mueve (rinde mucho más en el celular) ----------
     El molino (aspas que giran) y los cofres (tapa que se abre) quedan aparte. */
  fusionarEstaticos(escena, estaticos.filter((e) => e.grupo !== molino.grupo && !cofres.some((c) => c.grupo === e.grupo)), solidos);

  function actualizar(t, dt) {
    animables.forEach((f) => f(t, dt));
  }

  return {
    id: 'granja', limite: G.limite, nieblaBase: NIEBLA_GRANJA, usaVehiculo: true,
    // Lo que dibuja el minimapa (además de lo sólido): maíz, caminos de tierra y la carretera
    minimapa: {
      suelo: '#1d3320',
      formas: [
        ...campos.map((c) => ({ x1: c.x1, z1: c.z1, x2: c.x2, z2: c.z2, color: '#3d6a26' })),
        { x1: -27.5, z1: 17.5, x2: -22.5, z2: -72.5, color: '#6a5536' }, { x1: -27.5, z1: -72.5, x2: 62.5, z2: -67.5, color: '#6a5536' },
        { x1: 57.5, z1: -67.5, x2: 62.5, z2: -90, color: '#6a5536' }, { x1: -25, z1: -22, x2: 26, z2: -18, color: '#6a5536' },
        { x1: corral.x - corral.ancho / 2, z1: corral.z - corral.fondo / 2, x2: corral.x + corral.ancho / 2, z2: corral.z + corral.fondo / 2, color: '#4a4030' },
        { x1: -200, z1: -97, x2: 200, z2: -87, color: '#34363f' },
        // v0.8: caminos a los alrededores, la laguna y la gasolinera
        { x1: -150, z1: 0, x2: -25, z2: 4, color: '#6a5536' }, { x1: -2, z1: 40, x2: 2, z2: 118, color: '#6a5536' },
        { x1: 60, z1: 18, x2: 165, z2: 22, color: '#6a5536' }, { x1: 163, z1: 20, x2: 168, z2: 56, color: '#6a5536' },
        { x1: -10, z1: 130, x2: 30, z2: 170, color: '#1a3a5a' }, { x1: -14, z1: 136, x2: 34, z2: 164, color: '#1a3a5a' },
        { x1: -67, z1: -123, x2: -53, z2: -113, color: '#4a4a52' }
      ]
    },
    inicioVehiculo: { x: 60, z: -80, yaw: 0 },
    colisiones, techos, solidos, puntosAparicion, suministros, cofres,
    inicioJugador: new THREE.Vector3(-25, 0, 17), yawInicio: 0,
    lugares: {
      corral: new THREE.Vector3(corral.x, 0, corral.z),
      granero: new THREE.Vector3(26, 0, -20),           // la puerta
      llaves: new THREE.Vector3(43.5, 0, -20),
      camioneta: new THREE.Vector3(60, 0, -80),
      porton: new THREE.Vector3(G.porton.x, 0, G.porton.z),
      salida: new THREE.Vector3(G.salidaX + 4, 0, -92),  // fin de la granja por la carretera (hacia el este)
      puntoGranero: new THREE.Vector3(16, 0, -20),      // dónde reaparecer en la misión del granero
      puntoHuida: new THREE.Vector3(30, 0, -26),
      pilaPacas: new THREE.Vector3(22.5, 0, -33.5),     // de aquí sale la Bestia de Heno
      puntoJefe: new THREE.Vector3(8, 0, -14),          // dónde reaparecer en la pelea con la Bestia
      puntoHuidaFinal: new THREE.Vector3(22, 0, -46)    // dónde reaparecer en la huida (después de la Bestia)
    },
    llaves: llaves.grupo,
    lucesExtra: [luzPorche, luzGranero, luzOrtiz],   // se apagan en calidad baja
    // v0.8: misiones extra de la granja (las maneja misiones-extra.js)
    extras: {
      nidos: [new THREE.Vector3(-115, 0, 118), new THREE.Vector3(128, 0, 132), new THREE.Vector3(160, 0, -45)],
      vecinos: {
        posicion: new THREE.Vector3(-134, 0, 10),           // dentro del granero de los Ortiz
        modelos: vecinos,
        ataque: [[-120, 0], [-118, 18], [-124, -14], [-112, 8], [-128, 28], [-114, -4]].map(([x, z]) => new THREE.Vector3(x, 0, z)),
        casa: new THREE.Vector3(-155, 0, -30)
      },
      cofresEscondidos: [4, 5, 6]                           // índices en "cofres"
    },
    zonasLentas: [{ x: 10, z: 150, r: 27 }],                 // el agua de la laguna
    pilaPacas, barriles,
    agregarSuministro, actualizar, camaraMenu
  };
}
