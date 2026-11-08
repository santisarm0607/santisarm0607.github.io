/* =========================================================
   GALAXY INVASION — mundo-ciudad.js
   Construye la Etapa 3: la ciudad. Una avenida larga hacia el
   norte (-Z) que termina en la plaza donde flota la nave.

   Vista desde arriba (el norte está arriba):

        ┌──── PLAZA DE LA NAVE ────┐   z = -345 a -470 (centro -410)
        └──────┐          ┌────────┘
     ══════════╡ cruce 2  ╞═══════════  z = -215  (bloqueo)
               │ avenida  │
     ══════════╡ cruce 1  ╞══[soldados] z = -100  (rescate, calle del este)
               │          │
               │  inicio  │             z = 10
   ========================================================= */

import * as THREE from 'three';
import { material, COLORES, crearCofre, crearCajaMunicion, crearBotiquin, crearNaveNodriza, crearAutoDestruido, crearBarrera, crearFarola, crearCristal, crearGrieta, crearTexturaVentanas, crearSuministro } from './modelos.js';
import { crearEdificioCiudad, crearBarricada } from './modelos-ciudad.js';
import { crearTexturaHumo, fusionarEstaticos } from './mundo.js';
import { colocarBarriles } from './barriles.js';

export const NIEBLA_CIUDAD_COMPLETA = 0.02;
export const CENTRO_PLAZA = new THREE.Vector3(0, 0, -410);

export function crearCiudadCompleta(escena, calidad) {
  const colisiones = [];
  const solidos = [];
  const animables = [];
  const estaticos = [];
  const limite = { minX: -46, maxX: 46, minZ: -472, maxZ: 22 };

  /* ---------- Cielo, niebla y luces ---------- */
  escena.background = new THREE.Color(0x08070f);
  escena.fog = new THREE.FogExp2(0x0c0a18, NIEBLA_CIUDAD_COMPLETA * calidad.niebla);
  escena.add(new THREE.HemisphereLight(0x7a86c8, 0x2a2238, 1.6));
  const luna = new THREE.DirectionalLight(0x9fb0ff, 1.0);
  luna.position.set(-30, 60, 20);
  escena.add(luna);

  const caja3 = new THREE.Box3();
  function colocar(grupo, x, z, rotY = 0, choca = true, bloqueaBalas = true) {
    grupo.position.set(x, 0, z);
    grupo.rotation.y = rotY;
    escena.add(grupo);
    if (choca) {
      grupo.updateWorldMatrix(true, true);
      caja3.setFromObject(grupo);
      colisiones.push({ minX: caja3.min.x + 0.05, maxX: caja3.max.x - 0.05, minZ: caja3.min.z + 0.05, maxZ: caja3.max.z - 0.05, alto: caja3.max.y });
    }
    if (bloqueaBalas) solidos.push(grupo);
    estaticos.push({ grupo, solido: bloqueaBalas });
    return grupo;
  }

  /* ---------- Suelo: asfalto, andenes y la plaza ---------- */
  // Un poco más claro que el asfalto normal: la ciudad es muy oscura
  const suelo = new THREE.Mesh(new THREE.PlaneGeometry(140, 560), material(0x2e313d));
  suelo.rotation.x = -Math.PI / 2;
  suelo.position.z = -220;
  escena.add(suelo);
  solidos.push(suelo);
  const matAnden = material(0x3a3c48);
  [[-13.5, -170, 5, 400], [13.5, -170, 5, 400]].forEach(([x, z, an, la]) => {
    const a = new THREE.Mesh(new THREE.PlaneGeometry(an, la), matAnden);
    a.rotation.x = -Math.PI / 2;
    a.position.set(x, 0.015, z);
    escena.add(a);
  });
  const plaza = new THREE.Mesh(new THREE.CircleGeometry(40, 32), material(0x25262e));
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.set(CENTRO_PLAZA.x, 0.02, CENTRO_PLAZA.z);
  escena.add(plaza);
  // Líneas de la avenida (un solo dibujo)
  const m4 = new THREE.Matrix4();
  const lineas = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.18, 2.5), material(0x8a7a3a), 46);
  for (let i = 0; i < 46; i++) {
    m4.makeRotationX(-Math.PI / 2);
    m4.setPosition(0, 0.03, 15 - i * 8);
    lineas.setMatrixAt(i, m4);
  }
  escena.add(lineas);

  /* ---------- Edificios ---------- */
  const texVentanas = crearTexturaVentanas();
  const colores = [0x2c2f38, 0x33303a, 0x2a3036, 0x36312f, 0x2e2a36];
  let iColor = 0;
  function edificio(x1, x2, z1, z2, alto) {
    const ancho = x2 - x1, fondo = z1 - z2;
    const { grupo, cuerpo } = crearEdificioCiudad(ancho, alto, fondo, colores[iColor++ % colores.length], texVentanas);
    grupo.position.set((x1 + x2) / 2, 0, (z1 + z2) / 2);
    escena.add(grupo);
    colisiones.push({ minX: x1, maxX: x2, minZ: z2, maxZ: z1 });
    solidos.push(cuerpo);
    estaticos.push({ grupo, solido: true });
  }
  // Manzanas a lado y lado de la avenida, separadas por los cruces
  const manzanas = [[22, -93], [-107, -208], [-222, -345]];
  for (const lado of [-1, 1]) {
    for (const [zIni, zFin] of manzanas) {
      let z = zIni;
      while (z > zFin + 4) {
        const largo = Math.min(z - zFin, 14 + Math.floor(Math.random() * 16));
        const fondo = 14 + Math.random() * 12;
        const alto = 16 + Math.random() * 30;
        const xa = lado * 16, xb = lado * (16 + fondo);
        edificio(Math.min(xa, xb), Math.max(xa, xb), z, z - largo + 0.6, alto);
        // Relleno de atrás hasta el borde (para que no se vea vacío)
        const xc = lado * (16 + fondo), xd = lado * 50;
        edificio(Math.min(xc, xd), Math.max(xc, xd), z, z - largo + 0.6, alto + 8 + Math.random() * 12);
        z -= largo;
      }
    }
  }
  // Fondo de los cruces: edificios que cierran las calles laterales
  for (const zc of [-100, -215]) {
    for (const lado of [-1, 1]) edificio(Math.min(lado * 42, lado * 52), Math.max(lado * 42, lado * 52), zc + 7, zc - 7, 28);
  }
  // Edificios que rodean la plaza
  for (let i = 0; i < 14; i++) {
    const a = Math.PI * (0.05 + i / 13 * 0.9) + Math.PI;   // media vuelta por el norte
    const r = 52;
    const x = CENTRO_PLAZA.x + Math.cos(a) * r, z = CENTRO_PLAZA.z + Math.sin(a) * r;
    const t = 9 + Math.random() * 4;
    edificio(x - t, x + t, z + t, z - t, 26 + Math.random() * 30);
  }
  [[-1, -360], [1, -360]].forEach(([lado, z]) => edificio(Math.min(lado * 30, lado * 52), Math.max(lado * 30, lado * 52), z + 15, z - 22, 34));

  /* ---------- Autos, barreras, farolas, cristales ---------- */
  const coloresAuto = [0x5a2a2a, 0x2a3a5a, 0x4a4a4a, 0x3d5a2a, 0x6a5a3a, 0x5a4a6a];
  [[-6, -20, 0.3], [5, -55, -0.6], [-8, -80, 1.3], [7, -135, 0.2], [-4, -160, -0.4], [6, -190, 1.6],
   [-7, -250, 0.5], [4, -280, -0.2], [-5, -310, 0.9], [8, -330, -1.1], [-20, -365, 0.4], [22, -372, -0.7],
   [24, -96, 1.5], [-28, -214, 0.2]].forEach(([x, z, r], i) => colocar(crearAutoDestruido(coloresAuto[i % coloresAuto.length]).grupo, x, z, r));
  [[3, -40, 0.1], [-4, -118, Math.PI / 2], [5, -228, 0.3], [-3, -236, -0.2], [7, -300, Math.PI / 2], [-6, -340, 0.2]].forEach(([x, z, r]) => colocar(crearBarrera().grupo, x, z, r));
  for (let z = 10; z > -340; z -= 32) {
    [-12.5, 12.5].forEach((x, i) => {
      if (Math.abs(z + 100) < 10 || Math.abs(z + 215) < 10) return;
      const f = crearFarola((Math.round(z / 32) + i) % 3 === 0).grupo;
      f.position.set(x, 0, z);
      f.rotation.y = x > 0 ? -Math.PI / 2 : Math.PI / 2;
      escena.add(f);
      estaticos.push({ grupo: f, solido: false });
      colisiones.push({ minX: x - 0.15, maxX: x + 0.15, minZ: z - 0.15, maxZ: z + 0.15 });
    });
  }
  // Cristales de la Colmena: más mientras más cerca de la nave
  [[-9, -60, 0.6], [10, -150, 0.8], [-10, -240, 1.0], [9, -300, 1.1], [-14, -380, 1.4], [15, -395, 1.3], [-25, -430, 1.6], [26, -440, 1.5], [0, -458, 1.8]].forEach(([x, z, e], i) => {
    const c = crearCristal(e).grupo;
    c.position.set(x, 0, z);
    c.rotation.y = i;
    escena.add(c);
    estaticos.push({ grupo: c, solido: false });
  });

  /* ---------- Rescate: barricada en la calle del este (cruce 1) ---------- */
  const lugarRescate = new THREE.Vector3(33, 0, -100);
  colocar(crearBarricada(7).grupo, 29.5, -100, Math.PI / 2);
  colocar(crearAutoDestruido(0x2a4a2a).grupo, 31, -94.5, 0.1);

  /* ---------- Fuegos (autos ardiendo) ---------- */
  const matFuego1 = new THREE.MeshBasicMaterial({ color: 0xff7a2a, transparent: true, opacity: 0.85, depthWrite: false });
  const matFuego2 = new THREE.MeshBasicMaterial({ color: 0xffc63a, transparent: true, opacity: 0.85, depthWrite: false });
  const geoLlama = new THREE.ConeGeometry(0.5, 1.6, 5);
  [[5, -55], [-7, -250], [8, -330]].forEach(([x, z], k) => {
    for (let i = 0; i < 5; i++) {
      const llama = new THREE.Mesh(geoLlama, i % 2 ? matFuego1 : matFuego2);
      const ox = (Math.random() - 0.5) * 2.4, oz = (Math.random() - 0.5) * 3;
      escena.add(llama);
      animables.push((t) => {
        const s = 0.7 + Math.sin(t * 9 + i * 2 + k) * 0.25 + Math.random() * 0.1;
        llama.scale.set(s, s * 1.3, s);
        llama.position.set(x + ox, 1.5 + s * 0.6, z + oz);
      });
    }
  });
  const lucesFuego = [[5, -55], [-7, -250], [8, -330]].map(([x, z]) => {
    const l = new THREE.PointLight(0xff7a3a, 26, 22, 1.6);
    l.position.set(x, 3, z);
    l.visible = calidad.luces;
    escena.add(l);
    animables.push(() => { l.intensity = 20 + Math.random() * 10; });
    return l;
  });

  /* ---------- Humo ---------- */
  const matHumo = new THREE.SpriteMaterial({ map: crearTexturaHumo(), color: 0x5a5866, transparent: true, opacity: 0.3, depthWrite: false });
  const focos = [[5, -55], [-7, -250], [8, -330], [-20, -365], [22, -372]];
  for (let i = 0; i < calidad.humo; i++) {
    const [x, z] = focos[i % focos.length];
    const humo = new THREE.Sprite(matHumo);
    const fase = Math.random() * 8;
    escena.add(humo);
    animables.push((t) => {
      const ciclo = ((t * 0.12 + fase / 8) % 1);
      humo.position.set(x + Math.sin(t * 0.3 + fase) * 1.5, 2 + ciclo * 16, z);
      const tam = 3 + ciclo * 8;
      humo.scale.set(tam, tam, 1);
    });
  }

  /* ---------- Barriles ---------- */
  const barriles = colocarBarriles(escena, [
    [-9.5, -30], [-9.5, -31.2], [9.5, -125], [22, -104], [20, -97.5], [-9.5, -230], [9.8, -236], [9.5, -237.2],
    [-10, -290], [-18, -385], [-17, -386.5], [19, -430], [20, -431.3], [-30, -420], [31, -400]
  ], colisiones, solidos);

  /* ---------- Cofres y suministros ---------- */
  const cofres = [];
  [[-10, -10, Math.PI / 2], [38, -107, -Math.PI / 2], [-10, -205, Math.PI / 2], [10, -338, -Math.PI / 2]].forEach(([x, z, r]) => {
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
  [[9, -70], [36, -98], [-9, -150], [8, -245], [-9, -320], [-30, -395], [30, -440], [0, -372]].forEach(([x, z]) => agregarSuministro('botiquin', x, z));
  [[-9, -45], [9, -110], [-8, -175], [9, -265], [-9, -300], [28, -400], [-27, -445], [6, -372]].forEach(([x, z]) => agregarSuministro('cartuchos', x, z));
  [[8, -20], [-9, -95], [9, -190], [-8, -260], [8, -315], [-32, -410], [32, -420], [-6, -372]].forEach(([x, z]) => agregarSuministro('balas', x, z));
  animables.push((t) => {
    suministros.forEach((s) => {
      if (!s.activo) return;
      s.grupo.rotation.y = t * 1.2 + s.base;
      s.grupo.position.y = 0.15 + Math.sin(t * 2.5 + s.base) * 0.08;
    });
  });

  /* ---------- Puntos de aparición (grietas en la avenida, cruces y plaza) ---------- */
  const puntosAparicion = [];
  for (let z = 0; z > -340; z -= 18) puntosAparicion.push(new THREE.Vector3((z / 18) % 2 ? -7 : 7, 0, z));
  for (const zc of [-100, -215]) for (const x of [-36, -26, 22, 38]) puntosAparicion.push(new THREE.Vector3(x, 0, zc + (Math.random() - 0.5) * 6));
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    puntosAparicion.push(new THREE.Vector3(CENTRO_PLAZA.x + Math.cos(a) * 30, 0, CENTRO_PLAZA.z + Math.sin(a) * 30));
  }
  puntosAparicion.forEach((p, i) => {
    if (i % 2) return;
    const g = crearGrieta().grupo;
    g.position.copy(p);
    escena.add(g);
    estaticos.push({ grupo: g, solido: false });
  });

  /* ---------- La nave nodriza sobre la plaza ---------- */
  const nave = crearNaveNodriza();
  nave.grupo.position.set(CENTRO_PLAZA.x, 72, CENTRO_PLAZA.z);
  nave.grupo.scale.setScalar(1.15);
  escena.add(nave.grupo);
  animables.push((t) => { nave.grupo.rotation.y = t * 0.03; });
  // Rayo de la nave: al vencer al Guardián baja hasta el centro de la plaza
  const rayo = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 4, 70, 18, 1, true), new THREE.MeshBasicMaterial({ color: 0x5dff9b, transparent: true, opacity: 0.0, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  rayo.position.set(CENTRO_PLAZA.x, 35, CENTRO_PLAZA.z);
  rayo.visible = false;
  escena.add(rayo);
  const anilloRayo = new THREE.Mesh(new THREE.RingGeometry(3.2, 4.2, 28), new THREE.MeshBasicMaterial({ color: 0x5dff9b, transparent: true, opacity: 0.7, depthWrite: false }));
  anilloRayo.rotation.x = -Math.PI / 2;
  anilloRayo.position.set(CENTRO_PLAZA.x, 0.06, CENTRO_PLAZA.z);
  anilloRayo.visible = false;
  escena.add(anilloRayo);
  const estadoRayo = { activo: false, nivel: 0 };
  animables.push((t, dt) => {
    estadoRayo.nivel += ((estadoRayo.activo ? 1 : 0) - estadoRayo.nivel) * Math.min(1, dt * 1.5);
    rayo.visible = anilloRayo.visible = estadoRayo.nivel > 0.02;
    rayo.material.opacity = 0.32 * estadoRayo.nivel + Math.sin(t * 6) * 0.04 * estadoRayo.nivel;
    rayo.scale.set(1, estadoRayo.nivel, 1);
    rayo.position.y = 72 - 35 * estadoRayo.nivel;
    anilloRayo.scale.setScalar(1 + Math.sin(t * 4) * 0.08);
  });
  const posEstrellas = [];
  for (let i = 0; i < 400; i++) {
    const a = Math.random() * Math.PI * 2;
    const alt = 0.2 + Math.random() * 0.8;
    posEstrellas.push(Math.cos(a) * 300 * Math.cos(alt), 300 * Math.sin(alt), Math.sin(a) * 300 * Math.cos(alt) - 200);
  }
  const geoEstrellas = new THREE.BufferGeometry();
  geoEstrellas.setAttribute('position', new THREE.Float32BufferAttribute(posEstrellas, 3));
  escena.add(new THREE.Points(geoEstrellas, new THREE.PointsMaterial({ color: 0xcfd6ff, size: 1.2, sizeAttenuation: false, fog: false })));

  /* ---------- Juntar lo que no se mueve ---------- */
  fusionarEstaticos(escena, estaticos, solidos);

  function camaraMenu(t, camara) {
    const z = -40 - ((t * 5) % 280);
    camara.position.set(Math.sin(t * 0.15) * 5, 9, z + 20);
    camara.lookAt(0, 14, z - 60);
  }

  function actualizar(t, dt) {
    animables.forEach((f) => f(t, dt));
  }

  return {
    id: 'ciudad', limite, nieblaBase: NIEBLA_CIUDAD_COMPLETA,
    minimapa: {
      suelo: '#262833',
      formas: [
        { x1: -16, z1: -370, x2: -11, z2: 30, color: '#3a3c48' }, { x1: 11, z1: -370, x2: 16, z2: 30, color: '#3a3c48' },   // andenes
        { x1: CENTRO_PLAZA.x - 30, z1: CENTRO_PLAZA.z - 30, x2: CENTRO_PLAZA.x + 30, z2: CENTRO_PLAZA.z + 30, color: '#30323c' }   // la plaza
      ]
    },
    colisiones, solidos, puntosAparicion, suministros, cofres, barriles,
    lucesExtra: lucesFuego,
    lugares: { rescate: lugarRescate, cruce1: new THREE.Vector3(0, 0, -100), cruce2: new THREE.Vector3(0, 0, -215), plaza: CENTRO_PLAZA.clone(), entradaPlaza: new THREE.Vector3(0, 0, -350) },
    rayoNave: estadoRayo,
    inicioJugador: new THREE.Vector3(0, 0, 10), yawInicio: 0,
    agregarSuministro, actualizar, camaraMenu
  };
}
