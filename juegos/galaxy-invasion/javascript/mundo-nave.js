/* =========================================================
   GALAXY INVASION — mundo-nave.js  (v0.7)
   Construye la Etapa 4: la nave nodriza por dentro.
   Todo es bajo techo (7 m), con paredes de metal morado,
   luces verdes y puertas que se abren al cumplir cada paso.

   Vista desde arriba (el norte, -Z, está arriba):

                 ┌──── CABINA (Capitán) ────┐  z -140 a -200
     [CÁPSULAS]══╡      ventana al planeta  │
     (escape)    └──────────┐  ┌────────────┘
                            │C3│  (puerta de los motores)
                 ┌───── SALA DE MOTORES ────┐  z -40 a -100
                 │  ● motor 1     ● motor 2 │
   ┌ CUARTO DE ─┐│          ● motor 3       │
   │   ARMAS    ╞╡  (puerta del cuarto)     │
   └─────┐ ┌────┘└──────────────────────────┘
         │C1│   z -20 a -50
   ┌─────┘ └─────┐
   │   HANGAR    │  z 20 a -20 (aquí te deja el rayo)
   └─────────────┘
   ========================================================= */

import * as THREE from 'three';
import { material, crearCofre, crearCajaMunicion, crearBotiquin, crearSuministro } from './modelos.js';
import {
  COLORES_NAVE, crearCapsulaHumano, crearMotorNave, crearConsola, crearSombrero, crearCajaAlien,
  crearColumna, crearPuerta, crearCapsulaEscape, crearPlanetaColmena
} from './modelos-nave.js';
import { fusionarEstaticos } from './mundo.js';

export const NIEBLA_NAVE = 0.022;
const ALTO = 7;          // altura del techo
const GROSOR = 0.8;      // grosor de las paredes

export function crearNave(escena, calidad) {
  const colisiones = [];
  const solidos = [];
  const animables = [];
  const estaticos = [];
  const limite = { minX: -21, maxX: 113, minZ: -201, maxZ: 21 };

  /* ---------- Fondo, niebla y luces ---------- */
  escena.background = new THREE.Color(0x05040a);
  escena.fog = new THREE.FogExp2(0x0d0a18, NIEBLA_NAVE * calidad.niebla);
  const ambiente = new THREE.HemisphereLight(0x9a8ad8, 0x2a2240, 2.3);
  escena.add(ambiente);
  const colorAmbiente = new THREE.Color(0x9a8ad8);
  const colorAlarma = new THREE.Color(0xff4d5e);

  const caja3 = new THREE.Box3();
  function colocar(grupo, x, z, rotY = 0, choca = true, bloqueaBalas = true, fusionar = true) {
    grupo.position.set(x, 0, z);
    grupo.rotation.y = rotY;
    escena.add(grupo);
    if (choca) {
      grupo.updateWorldMatrix(true, true);
      caja3.setFromObject(grupo);
      colisiones.push({ minX: caja3.min.x + 0.05, maxX: caja3.max.x - 0.05, minZ: caja3.min.z + 0.05, maxZ: caja3.max.z - 0.05 });
    }
    if (bloqueaBalas) solidos.push(grupo);
    if (fusionar) estaticos.push({ grupo, solido: bloqueaBalas });
    return grupo;
  }

  /* ---------- Piso y techo ---------- */
  const piso = new THREE.Mesh(new THREE.PlaneGeometry(140, 230), material(COLORES_NAVE.piso));
  piso.rotation.x = -Math.PI / 2;
  piso.position.set(46, 0, -90);
  escena.add(piso);
  solidos.push(piso);
  const techo = new THREE.Mesh(new THREE.PlaneGeometry(140, 230), material(COLORES_NAVE.techo));
  techo.rotation.x = Math.PI / 2;
  techo.position.set(46, ALTO, -90);
  escena.add(techo);

  /* ---------- Paredes ---------- */
  // Las paredes tienen un poco de brillo propio para que se vean en la penumbra
  const matPared = material(COLORES_NAVE.pared, { emisivo: 0x141026 });
  const matZocalo = material(COLORES_NAVE.verde, { brilla: true });
  const geoCaja = new THREE.BoxGeometry(1, 1, 1);
  // Pared recta de (x1, z1) a (x2, z2). Una de las dos coordenadas es igual
  function pared(x1, z1, x2, z2, { alto = ALTO, y = 0, choca = true, zocalo = true } = {}) {
    const horizontal = z1 === z2;
    const largo = horizontal ? Math.abs(x2 - x1) : Math.abs(z2 - z1);
    const g = new THREE.Group();
    const m = new THREE.Mesh(geoCaja, matPared);
    m.scale.set(horizontal ? largo + GROSOR : GROSOR, alto, horizontal ? GROSOR : largo + GROSOR);
    m.position.y = y + alto / 2;
    g.add(m);
    // Línea de luz verde abajo (ayuda a ver los bordes de noche)
    if (zocalo) {
      const z = new THREE.Mesh(geoCaja, matZocalo);
      z.scale.set(horizontal ? largo : GROSOR + 0.04, 0.08, horizontal ? GROSOR + 0.04 : largo);
      z.position.y = 0.5;
      g.add(z);
    }
    g.position.set((x1 + x2) / 2, 0, (z1 + z2) / 2);
    escena.add(g);
    if (choca) {
      const mx = horizontal ? 0 : GROSOR / 2, mz = horizontal ? GROSOR / 2 : 0;
      colisiones.push({ minX: Math.min(x1, x2) - mx, maxX: Math.max(x1, x2) + mx, minZ: Math.min(z1, z2) - mz, maxZ: Math.max(z1, z2) + mz });
    }
    solidos.push(g);
    estaticos.push({ grupo: g, solido: true });
  }
  [
    // Hangar
    [-20, 20, 20, 20], [-20, 20, -20, -20], [20, 20, 20, -20], [-20, -20, -4, -20], [4, -20, 20, -20],
    // Pasillo 1
    [-4, -20, -4, -50], [4, -20, 4, -50],
    // Cuarto de armas
    [-22, -50, -4, -50], [4, -50, 22, -50], [-22, -90, 22, -90], [-22, -50, -22, -90], [22, -50, 22, -66], [22, -74, 22, -90],
    // Pasillo 2
    [22, -66, 52, -66], [22, -74, 52, -74],
    // Sala de motores
    [52, -40, 52, -66], [52, -74, 52, -100], [112, -40, 112, -100], [52, -40, 112, -40], [52, -100, 78, -100], [86, -100, 112, -100],
    // Pasillo 3
    [78, -100, 78, -140], [86, -100, 86, -140],
    // Cabina (la pared del norte va aparte: tiene ventana)
    [52, -140, 78, -140], [86, -140, 112, -140], [112, -140, 112, -200], [52, -140, 52, -160], [52, -180, 52, -200],
    // Cápsulas de escape
    [30, -160, 52, -160], [30, -180, 52, -180], [30, -160, 30, -180]
  ].forEach(([x1, z1, x2, z2]) => pared(x1, z1, x2, z2));

  // Pared norte de la cabina con un ventanal: abajo y arriba pared, en medio vidrio
  pared(52, -200, 112, -200, { alto: 1.4 });
  pared(52, -200, 112, -200, { alto: 1.6, y: ALTO - 1.6, choca: false, zocalo: false });
  for (let x = 52; x <= 112; x += 10) pared(x - 0.5, -200, x + 0.5, -200, { choca: false, zocalo: false });
  const vidrio = new THREE.Mesh(new THREE.PlaneGeometry(60, ALTO - 3), new THREE.MeshBasicMaterial({ color: 0x6a9aff, transparent: true, opacity: 0.08, depthWrite: false }));
  vidrio.position.set(82, 1.4 + (ALTO - 3) / 2, -199.7);
  escena.add(vidrio);
  // Afuera: el espacio, estrellas y el planeta de la Colmena
  const planeta = crearPlanetaColmena().grupo;
  planeta.position.set(76, 4, -380);   // se ve centrado en el ventanal de la cabina
  escena.add(planeta);
  animables.push((t) => { planeta.rotation.y = t * 0.02; });
  const posEstrellas = [];
  for (let i = 0; i < 500; i++) posEstrellas.push((Math.random() - 0.5) * 900, (Math.random() - 0.3) * 400, -260 - Math.random() * 300);
  const geoEstrellas = new THREE.BufferGeometry();
  geoEstrellas.setAttribute('position', new THREE.Float32BufferAttribute(posEstrellas, 3));
  escena.add(new THREE.Points(geoEstrellas, new THREE.PointsMaterial({ color: 0xcfd6ff, size: 1.3, sizeAttenuation: false, fog: false })));

  /* ---------- Luces del techo (franjas que brillan) ---------- */
  const matFranja = material(0x3fbf7a, { brilla: true });
  [[0, 0, 30, 1], [0, -35, 1, 26], [0, -70, 36, 1], [37, -70, 26, 1], [82, -55, 50, 1], [82, -85, 50, 1], [82, -120, 1, 36], [82, -160, 50, 1], [82, -185, 50, 1], [41, -170, 18, 1]].forEach(([x, z, ax, az]) => {
    const f = new THREE.Mesh(geoCaja, matFranja);
    f.scale.set(ax === 1 ? 0.35 : ax, 0.06, az === 1 ? 0.35 : az);
    f.position.set(x, ALTO - 0.06, z);
    escena.add(f);
    estaticos.push({ grupo: f, solido: false });
  });
  // Pocas luces de verdad (cada una le cuesta al celular)
  const lucesExtra = [[0, 0, 0x5dff9b], [0, -70, 0xb36bff], [82, -70, 0xb36bff], [82, -172, 0x5dff9b]].map(([x, z, color]) => {
    const l = new THREE.PointLight(color, 40, 40, 1.4);
    l.position.set(x, ALTO - 1.2, z);
    l.visible = calidad.luces;
    escena.add(l);
    return l;
  });

  /* ---------- HANGAR: plataforma del rayo y cápsulas vacías ---------- */
  const plataforma = new THREE.Mesh(new THREE.CircleGeometry(4, 24), material(0x2b2640));
  plataforma.rotation.x = -Math.PI / 2;
  plataforma.position.set(0, 0.02, 0);
  escena.add(plataforma);
  const anillo = new THREE.Mesh(new THREE.RingGeometry(3.6, 4.2, 28), new THREE.MeshBasicMaterial({ color: COLORES_NAVE.verde, transparent: true, opacity: 0.6, depthWrite: false }));
  anillo.rotation.x = -Math.PI / 2;
  anillo.position.set(0, 0.04, 0);
  escena.add(anillo);
  animables.push((t) => { anillo.material.opacity = 0.4 + Math.sin(t * 3) * 0.2; });
  for (let i = 0; i < 6; i++) {
    colocar(crearCapsulaHumano().grupo, -17.5, 14 - i * 6, Math.PI / 2);
    colocar(crearCapsulaHumano().grupo, 17.5, 14 - i * 6, -Math.PI / 2);
  }
  [[-12, -14, 0.3], [-10, -16, 0], [12, 15, 0.6], [10.5, 13, 0.1]].forEach(([x, z, r]) => colocar(crearCajaAlien().grupo, x, z, r));

  /* ---------- CUARTO DE ARMAS ---------- */
  // Estantes con armas alien a los lados
  const matEstante = material(COLORES_NAVE.metal);
  const matArmaAlien = material(COLORES_NAVE.morado, { brilla: true });
  function estante(x, z, rot) {
    const g = new THREE.Group();
    const e = new THREE.Mesh(geoCaja, matEstante);
    e.scale.set(5, 2.6, 0.8);
    e.position.y = 1.3;
    g.add(e);
    for (let i = 0; i < 4; i++) {
      const a = new THREE.Mesh(geoCaja, matArmaAlien);
      a.scale.set(0.15, 1.1, 0.25);
      a.position.set(-1.8 + i * 1.2, 1.5, -0.45);
      a.rotation.z = 0.2;
      g.add(a);
    }
    colocar(g, x, z, rot);
  }
  [[-19, -60, Math.PI / 2], [-19, -72, Math.PI / 2], [-19, -84, Math.PI / 2], [-8, -87.5, 0], [8, -87.5, 0]].forEach(([x, z, r]) => estante(x, z, r));
  [[-8, -64], [8, -64], [-8, -78], [8, -78]].forEach(([x, z]) => colocar(crearColumna(ALTO).grupo, x, z));
  [[14, -58, 0.2], [16, -82, 0.5], [-14, -55, 0]].forEach(([x, z, r]) => colocar(crearCajaAlien().grupo, x, z, r));
  // El sombrero del hermano, tirado entre las cajas
  const sombrero = crearSombrero(0xb08a4a);
  sombrero.grupo.position.set(-14, 0.02, -82);
  sombrero.grupo.rotation.set(0.15, 0.6, 0.1);
  escena.add(sombrero.grupo);
  const brilloSombrero = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.6, 20), new THREE.MeshBasicMaterial({ color: 0xffc65c, transparent: true, opacity: 0.6, depthWrite: false }));
  brilloSombrero.rotation.x = -Math.PI / 2;
  brilloSombrero.position.set(-14, 0.03, -82);
  escena.add(brilloSombrero);
  animables.push((t) => { brilloSombrero.scale.setScalar(1 + Math.sin(t * 4) * 0.15); });
  const datosSombrero = { ...sombrero, brillo: brilloSombrero, posicion: new THREE.Vector3(-14, 0, -82),
    mostrar(v) { sombrero.grupo.visible = v; brilloSombrero.visible = v; } };

  /* ---------- SALA DE MOTORES ---------- */
  const motores = [[66, -58], [98, -58], [82, -80]].map(([x, z], i) => {
    const m = crearMotorNave();
    m.grupo.position.set(x, 0, z);
    escena.add(m.grupo);
    const caja = { minX: x - 3, maxX: x + 3, minZ: z - 3, maxZ: z + 3 };
    colisiones.push(caja);
    solidos.push(m.grupo);
    const motor = { modelo: m, posicion: new THREE.Vector3(x, 0, z), vida: 1, vidaMax: 1, destruido: false, parpadeo: 0, alDisparo: null, numero: i + 1 };
    m.grupo.userData.blanco = { recibirDisparo: (danio) => { if (motor.alDisparo) motor.alDisparo(motor, danio); } };
    animables.push((t, dt) => {
      motor.parpadeo -= dt;
      if (motor.destruido) { m.matNucleo.color.setHex(0x2a2433); m.matAnillo.color.setHex(0x3a2a2a); return; }
      m.anillos.rotation.y += dt * 1.5;
      m.anillos.position.y = Math.sin(t * 2 + i) * 0.15;
      m.matNucleo.color.setHex(motor.parpadeo > 0 ? 0xffffff : COLORES_NAVE.morado);
      m.matAnillo.color.setHex(COLORES_NAVE.verde);
    });
    return motor;
  });
  [[60, -92], [104, -92], [60, -46], [104, -46]].forEach(([x, z]) => colocar(crearColumna(ALTO).grupo, x, z));
  [[72, -94, 0.2], [92, -95, 0.6], [57, -52, 0], [106, -70, 0.4], [74, -45, 0.3]].forEach(([x, z, r]) => colocar(crearCajaAlien().grupo, x, z, r));
  // Consola con la grabación (se prende al destruir los motores)
  const consola = crearConsola();
  consola.grupo.position.set(106, 0, -95);
  consola.grupo.rotation.y = Math.PI * 0.75;
  escena.add(consola.grupo);
  colisiones.push({ minX: 105.2, maxX: 106.8, minZ: -95.8, maxZ: -94.2 });
  solidos.push(consola.grupo);
  const datosConsola = { ...consola, posicion: new THREE.Vector3(106, 0, -95), activa: false };
  animables.push((t) => {
    consola.matPantalla.opacity = datosConsola.activa ? 0.45 + Math.sin(t * 8) * 0.15 : 0.08;
    consola.matPantalla.color.setHex(datosConsola.activa ? COLORES_NAVE.verde : 0x334455);
  });

  /* ---------- CABINA ---------- */
  [[66, -160], [98, -160], [66, -182], [98, -182]].forEach(([x, z]) => colocar(crearColumna(ALTO).grupo, x, z));
  // Silla de mando frente a la ventana
  const silla = new THREE.Group();
  const matSilla = material(0x3a2a5a);
  [[0, 0.6, 0, 2.2, 1.2, 1.8], [0, 2.2, 0.8, 2.2, 2.4, 0.4]].forEach(([x, y, z, ax, ay, az]) => {
    const p = new THREE.Mesh(geoCaja, matSilla);
    p.scale.set(ax, ay, az);
    p.position.set(x, y, z);
    silla.add(p);
  });
  colocar(silla, 82, -194, Math.PI);
  // Consolas a los lados (decoración)
  [[58, -150, Math.PI / 2], [58, -170, Math.PI / 2], [106, -150, -Math.PI / 2], [106, -170, -Math.PI / 2], [106, -190, -Math.PI / 2]].forEach(([x, z, r]) => {
    const c = crearConsola();
    c.matPantalla.opacity = 0.4;
    c.matPantalla.color.setHex(COLORES_NAVE.morado);
    colocar(c.grupo, x, z, r);
  });

  /* ---------- CÁPSULAS DE ESCAPE ---------- */
  const capsula = crearCapsulaEscape();
  colocar(capsula.grupo, 35, -170, Math.PI / 2, false, true, false);
  const luzCapsula = new THREE.Mesh(new THREE.RingGeometry(1.8, 2.3, 24), new THREE.MeshBasicMaterial({ color: COLORES_NAVE.verde, transparent: true, opacity: 0.5, depthWrite: false }));
  luzCapsula.rotation.x = -Math.PI / 2;
  luzCapsula.position.set(37.5, 0.04, -170);
  escena.add(luzCapsula);
  animables.push((t) => { luzCapsula.material.opacity = 0.3 + Math.sin(t * 4) * 0.2; });
  colocar(crearCapsulaEscape().grupo, 35, -163.5, Math.PI / 2);
  colocar(crearCapsulaEscape().grupo, 35, -176.5, Math.PI / 2);

  /* ---------- PUERTAS (se abren al cumplir cada paso) ---------- */
  function crearPuertaNave(x, z, ancho, girada) {
    const p = crearPuerta(ancho, 6);
    p.grupo.position.set(x, 0, z);
    if (girada) p.grupo.rotation.y = Math.PI / 2;
    escena.add(p.grupo);
    const caja = girada
      ? { minX: x - 0.4, maxX: x + 0.4, minZ: z - ancho / 2, maxZ: z + ancho / 2, inactiva: false }
      : { minX: x - ancho / 2, maxX: x + ancho / 2, minZ: z - 0.4, maxZ: z + 0.4, inactiva: false };
    colisiones.push(caja);
    solidos.push(p.grupo);
    const puerta = { ...p, caja, abierta: false, nivel: 0,
      abrir(v = true) { puerta.abierta = v; caja.inactiva = v; } };
    animables.push((t, dt) => {
      puerta.nivel += ((puerta.abierta ? 1 : 0) - puerta.nivel) * Math.min(1, dt * 3);
      p.hoja.position.y = puerta.nivel * 5.6;
      p.matLuz.color.setHex(puerta.abierta ? COLORES_NAVE.verde : COLORES_NAVE.rojo);
    });
    return puerta;
  }
  const puertas = {
    armas: crearPuertaNave(22, -70, 8, true),        // del cuarto de armas al pasillo de los motores
    motores: crearPuertaNave(82, -100, 8, false),    // de los motores a la cabina
    cabina: crearPuertaNave(82, -140, 8, false),     // se cierra detrás de ti al empezar la pelea
    escape: crearPuertaNave(52, -170, 20, true)      // de la cabina a las cápsulas
  };

  /* ---------- Cofres y suministros ---------- */
  const cofres = [];
  [[18, -86, -Math.PI / 2], [108, -44, -Math.PI / 2], [-16, 17, Math.PI]].forEach(([x, z, r]) => {
    const c = crearCofre();
    c.grupo.position.set(x, 0, z);
    c.grupo.rotation.y = r;
    escena.add(c.grupo);
    colisiones.push({ minX: x - 0.7, maxX: x + 0.7, minZ: z - 0.7, maxZ: z + 0.7, alto: 0.8 });
    solidos.push(c.grupo);
    const datos = { ...c, abierto: false, posicion: new THREE.Vector3(x, 0, z), angulo: 0 };
    cofres.push(datos);
    animables.push((t, dt) => {
      datos.angulo += ((datos.abierto ? 1.9 : 0) - datos.angulo) * Math.min(1, dt * 6);
      c.tapa.rotation.x = datos.angulo;
    });
  });
  const suministros = [];
  function agregarSuministro(tipo, x, z) {
    const modelo = crearSuministro(tipo);
    modelo.grupo.position.set(x, 0, z);
    escena.add(modelo.grupo);
    const s = { tipo, grupo: modelo.grupo, posicion: new THREE.Vector3(x, 0, z), activo: true, base: Math.random() * 6 };
    suministros.push(s);
    return s;
  }
  [[8, 10], [0, -40], [0, -84], [70, -46], [100, -90], [41, -70], [82, -125], [60, -195], [104, -195]].forEach(([x, z]) => agregarSuministro('botiquin', x, z));
  [[-8, 10], [-15, -66], [15, -70], [64, -94], [100, -46], [82, -110], [58, -146], [106, -146]].forEach(([x, z]) => agregarSuministro('cartuchos', x, z));
  [[8, -10], [15, -60], [-15, -76], [94, -94], [64, -46], [82, -132], [70, -195], [94, -195]].forEach(([x, z]) => agregarSuministro('balas', x, z));
  animables.push((t) => {
    suministros.forEach((s) => {
      if (!s.activo) return;
      s.grupo.rotation.y = t * 1.2 + s.base;
      s.grupo.position.y = 0.15 + Math.sin(t * 2.5 + s.base) * 0.08;
    });
  });

  /* ---------- Puntos de aparición (compuertas en el piso de cada zona) ---------- */
  const V = (x, z) => new THREE.Vector3(x, 0, z);
  const puntosAparicion = {
    hangar: [V(-14, -8), V(14, -8), V(-12, 8), V(12, 8), V(0, -32), V(0, -45)],
    armas: [V(-16, -56), V(16, -56), V(-16, -86), V(0, -86), V(16, -74), V(-2, -70)],
    motores: [V(58, -44), V(106, -44), V(58, -96), V(106, -96), V(82, -46), V(70, -70), V(94, -70), V(40, -70)],
    cabina: [V(58, -146), V(106, -146), V(58, -196), V(106, -196), V(68, -170)]
  };
  const matCompuerta = new THREE.MeshBasicMaterial({ color: COLORES_NAVE.morado, transparent: true, opacity: 0.5, depthWrite: false });
  const geoCompuerta = new THREE.RingGeometry(0.7, 1.0, 6);
  Object.values(puntosAparicion).flat().forEach((p) => {
    const c = new THREE.Mesh(geoCompuerta, matCompuerta);
    c.rotation.x = -Math.PI / 2;
    c.position.set(p.x, 0.03, p.z);
    escena.add(c);
  });

  /* ---------- Juntar lo que no se mueve ---------- */
  fusionarEstaticos(escena, estaticos, solidos);

  /* Alarma: al sabotear los motores todo se pone rojo y parpadea */
  const alarma = { activa: false };
  animables.push((t) => {
    if (alarma.activa) {
      const k = 0.5 + Math.sin(t * 6) * 0.5;
      ambiente.color.copy(colorAmbiente).lerp(colorAlarma, 0.35 + k * 0.4);
    } else {
      ambiente.color.copy(colorAmbiente);
    }
  });

  function camaraMenu(t, camara) {
    const a = t * 0.08;
    camara.position.set(Math.sin(a) * 12, 3.2, Math.cos(a) * 12);
    camara.lookAt(0, 2, 0);
  }

  function actualizar(t, dt) {
    animables.forEach((f) => f(t, dt));
  }

  return {
    id: 'nave', limite, nieblaBase: NIEBLA_NAVE,
    minimapa: {
      suelo: '#05050b',
      solido: '#6a5a9a',
      formas: [
        { x1: -20, z1: -20, x2: 20, z2: 20, color: '#1d1a2b' },     // hangar
        { x1: -4, z1: -50, x2: 4, z2: -20, color: '#1d1a2b' },      // pasillo 1
        { x1: -22, z1: -90, x2: 22, z2: -50, color: '#1d1a2b' },    // armas
        { x1: 22, z1: -74, x2: 52, z2: -66, color: '#1d1a2b' },     // pasillo 2
        { x1: 52, z1: -100, x2: 112, z2: -40, color: '#1d1a2b' },   // motores
        { x1: 78, z1: -140, x2: 86, z2: -100, color: '#1d1a2b' },   // pasillo 3
        { x1: 52, z1: -200, x2: 112, z2: -140, color: '#221d33' },  // cabina
        { x1: 30, z1: -180, x2: 52, z2: -160, color: '#1d1a2b' }    // cápsulas
      ]
    },
    colisiones, solidos, puntosAparicion, suministros, cofres, barriles: [],
    motores, consola: datosConsola, sombrero: datosSombrero, puertas, alarma,
    lucesExtra,
    lugares: {
      hangar: V(0, 0), salidaHangar: V(0, -24), armas: V(0, -62), salidaArmas: V(26, -70),
      motores: V(60, -70), salidaMotores: V(82, -104), cabinaEntrada: V(82, -146), cabina: V(82, -172),
      escape: V(37.5, -170)
    },
    inicioJugador: new THREE.Vector3(0, 0, 0), yawInicio: 0,
    agregarSuministro, actualizar, camaraMenu
  };
}
