/* =========================================================
   GALAXY INVASION — mundo-carretera.js
   Construye la Etapa 2: la carretera de San Isidro a la ciudad.
   Una vía recta de 900 m hacia el norte (-Z), de noche, con
   campos a los lados. Al fondo, la ciudad y la nave nodriza.

   Vista desde arriba (el norte está arriba):

        [ CIUDAD ]          z = -885  meta
           |  |
        (Lanzador)          z = -770  el jefe bloquea la vía
           |  |
        ~~~~~~~~ muro       z = -380  muro de baba
           |  |
        [camioneta]         z = 6     inicio
   ========================================================= */

import * as THREE from 'three';
import { CONFIG } from './config.js';
import { material, crearCofre, crearCajaMunicion, crearBotiquin, crearNaveNodriza, crearAutoDestruido, crearSuministro } from './modelos.js';
import { COLORES_GRANJA, crearCerca, crearPaca, crearLuna } from './modelos-granja.js';
import { crearRoca, crearMuroBaba, crearPosteCarretera, crearSenal } from './modelos-carretera.js';
import { fusionarEstaticos } from './mundo.js';
import { colocarBarriles } from './barriles.js';

export const NIEBLA_CARRETERA = 0.011;

export function crearCarretera(escena, calidad) {
  const K = CONFIG.carretera;
  const colisiones = [];
  const solidos = [];
  const animables = [];
  const estaticos = [];
  const limite = { minX: -30, maxX: 30, minZ: -920, maxZ: 30 };

  /* ---------- Cielo (casi amanecer), niebla y luces ---------- */
  escena.background = new THREE.Color(0x121735);
  escena.fog = new THREE.FogExp2(0x161a36, NIEBLA_CARRETERA * calidad.niebla);
  escena.add(new THREE.HemisphereLight(0x8a98d8, 0x2a2a1a, 1.6));
  const lunaLuz = new THREE.DirectionalLight(0xc0c8ff, 1.0);
  lunaLuz.position.set(60, 90, 40);
  escena.add(lunaLuz);

  function colocar(grupo, x, z, rotY = 0, choca = true, bloqueaBalas = true, encoger = 0.05) {
    grupo.position.set(x, 0, z);
    grupo.rotation.y = rotY;
    escena.add(grupo);
    if (choca) {
      grupo.updateWorldMatrix(true, true);
      const b = new THREE.Box3().setFromObject(grupo);
      colisiones.push({ minX: b.min.x + encoger, maxX: b.max.x - encoger, minZ: b.min.z + encoger, maxZ: b.max.z - encoger, alto: b.max.y });
    }
    if (bloqueaBalas) solidos.push(grupo);
    estaticos.push({ grupo, solido: bloqueaBalas });
    return grupo;
  }

  /* ---------- Suelo: pasto, bermas y la carretera ---------- */
  const suelo = new THREE.Mesh(new THREE.PlaneGeometry(400, 1300), material(COLORES_GRANJA.pasto));
  suelo.rotation.x = -Math.PI / 2;
  suelo.position.z = -450;
  escena.add(suelo);
  solidos.push(suelo);
  const largo = 1000;
  const berma = new THREE.Mesh(new THREE.PlaneGeometry(22, largo), material(0x3b3428));
  berma.rotation.x = -Math.PI / 2;
  berma.position.set(0, 0.01, -450);
  escena.add(berma);
  const asfalto = new THREE.Mesh(new THREE.PlaneGeometry(14, largo), material(0x1d1f25));
  asfalto.rotation.x = -Math.PI / 2;
  asfalto.position.set(0, 0.02, -450);
  escena.add(asfalto);

  // Líneas: amarilla punteada en el centro y blancas en los bordes (un solo dibujo cada una)
  const m4 = new THREE.Matrix4();
  const nLineas = Math.floor(largo / 8);
  const lineas = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.2, 3.5), material(0xc9a83a), nLineas);
  for (let i = 0; i < nLineas; i++) {
    m4.makeRotationX(-Math.PI / 2);
    m4.setPosition(0, 0.03, 40 - i * 8);
    lineas.setMatrixAt(i, m4);
  }
  escena.add(lineas);
  [-6.6, 6.6].forEach((x) => {
    const borde = new THREE.Mesh(new THREE.PlaneGeometry(0.18, largo), material(0xb8b8b8));
    borde.rotation.x = -Math.PI / 2;
    borde.position.set(x, 0.03, -450);
    escena.add(borde);
  });

  /* ---------- Cercas a los lados (solo se ven, no chocan) ---------- */
  for (let z = 25; z > -900; z -= 60) {
    [-13.5, 13.5].forEach((x) => {
      const c = crearCerca(56).grupo;
      c.position.set(x, 0, z - 28);
      c.rotation.y = Math.PI / 2;
      escena.add(c);
      estaticos.push({ grupo: c, solido: false });
    });
  }

  /* ---------- Postes de luz (cada 45 m, alternando lado) ---------- */
  for (let i = 0, z = 0; z > -880; i++, z -= 45) {
    const lado = i % 2 ? 1 : -1;
    colocar(crearPosteCarretera().grupo, lado * 8.6, z, lado > 0 ? -Math.PI / 2 : Math.PI / 2, false, true);
    colisiones.push({ minX: lado * 8.6 - 0.2, maxX: lado * 8.6 + 0.2, minZ: z - 0.2, maxZ: z + 0.2 });   // solo el poste
  }
  // Solo dos luces reales que siguen a la camioneta (las luces cuestan en el celular)
  const lucesPoste = [new THREE.PointLight(0xffa060, 30, 26, 1.6), new THREE.PointLight(0xffa060, 30, 26, 1.6)];
  lucesPoste.forEach((l) => { l.visible = calidad.luces; escena.add(l); });

  /* ---------- Señales ---------- */
  [[20, 'CIUDAD 900 m'], [-300, 'CIUDAD 600 m'], [-600, 'CIUDAD 300 m'], [-860, 'BIENVENIDOS']].forEach(([z, t]) => colocar(crearSenal(t).grupo, 10.5, z, -0.15, false, false));

  /* ---------- Autos abandonados en la vía (obstáculos) ---------- */
  const colores = [0x5a2a2a, 0x2a3a5a, 0x4a4a4a, 0x3d5a2a, 0x6a5a3a, 0x5a4a6a];
  [[-3.5, -60, 0.2], [3.2, -130, -0.4], [-2.8, -205, 1.4], [3.8, -275, 0.1], [-4, -330, -0.3], [2.5, -455, 0.5],
   [-3.2, -520, 2.8], [3.6, -590, -0.2], [-1.5, -650, 0.9], [4, -715, 0.3], [-3.6, -820, -0.5]].forEach(([x, z, r], i) => {
    colocar(crearAutoDestruido(colores[i % colores.length]).grupo, x, z, r);
  });

  /* ---------- Árboles y pacas en los campos ---------- */
  const posArboles = [];
  for (let z = 30; z > -910; z -= 9) {
    for (const lado of [-1, 1]) {
      if (Math.random() < 0.35) continue;
      const x = lado * (19 + Math.random() * 40);
      // En la zona de la pelea con el Lanzador se deja espacio libre
      if (z < K.zJefe + 50 && z > K.zJefe - 40 && Math.abs(x) < 32) continue;
      posArboles.push([x, z + (Math.random() - 0.5) * 6]);
    }
  }
  const tronco = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.3, 0.4, 3, 6), material(0x3a2818), posArboles.length);
  const copa = new THREE.InstancedMesh(new THREE.ConeGeometry(2.6, 6, 7), material(0x18301c), posArboles.length);
  posArboles.forEach(([x, z], i) => {
    const e = 0.8 + Math.random() * 0.6;
    m4.makeScale(e, e, e); m4.setPosition(x, 1.5 * e, z); tronco.setMatrixAt(i, m4);
    m4.makeScale(e, e, e); m4.setPosition(x, 5.5 * e, z); copa.setMatrixAt(i, m4);
    if (Math.abs(x) < 31) colisiones.push({ minX: x - 0.4, maxX: x + 0.4, minZ: z - 0.4, maxZ: z + 0.4 });
  });
  escena.add(tronco, copa);
  [[-17, -100], [18, -180], [-20, -430], [17, -500], [-16, -680]].forEach(([x, z], i) => {
    for (let k = 0; k < 3; k++) colocar(crearPaca().grupo, x + k * 1.25, z, 0.1 * i);
  });

  /* ---------- Barriles (explotan: úsalos contra los aliens) ---------- */
  const barriles = colocarBarriles(escena, [
    [-8.5, K.zMuro + 18], [8.8, K.zMuro + 12], [-9, K.zMuro + 6],
    [-9, K.zJefe + 28], [9, K.zJefe + 22], [-12, K.zJefe + 6], [12, K.zJefe], [-9, K.zJefe - 4]
  ], colisiones, solidos);

  /* ---------- Muro de baba (tapa la vía; hay que destruirlo a pie) ---------- */
  const muro = crearMuroBaba(20);
  muro.grupo.position.set(0, 0, K.zMuro);
  escena.add(muro.grupo);
  const cajaMuro = { minX: -10.5, maxX: 10.5, minZ: K.zMuro - 1, maxZ: K.zMuro + 1, alto: 4 };
  colisiones.push(cajaMuro);
  solidos.push(muro.grupo);
  const datosMuro = {
    grupo: muro.grupo, vida: K.vidaMuro, destruido: false, parpadeo: 0,
    alRecibir: () => {}, alDestruir: () => {},
    reiniciar(destruido = false) {
      this.destruido = destruido;
      this.vida = K.vidaMuro;
      muro.grupo.visible = !destruido;
      muro.grupo.scale.set(1, 1, 1);
      cajaMuro.inactiva = destruido;
      const i = solidos.indexOf(muro.grupo);
      if (destruido && i >= 0) solidos.splice(i, 1);
      if (!destruido && i < 0) solidos.push(muro.grupo);
    }
  };
  muro.grupo.userData.blanco = {
    recibirDisparo(danio) {
      if (datosMuro.destruido) return;
      datosMuro.vida -= danio;
      datosMuro.parpadeo = 0.08;
      datosMuro.alRecibir();
      if (datosMuro.vida <= 0) {
        datosMuro.destruido = true;
        cajaMuro.inactiva = true;
        const i = solidos.indexOf(muro.grupo);
        if (i >= 0) solidos.splice(i, 1);
        datosMuro.alDestruir();
      }
    }
  };
  animables.push((t, dt) => {
    datosMuro.parpadeo -= dt;
    muro.matBaba.emissive.setHex(datosMuro.parpadeo > 0 ? 0x4aff8a : 0x0b3a18);
    muro.capullos.forEach((c, i) => c.scale.setScalar(0.45 + Math.sin(t * 3 + i) * 0.05));
    // Al destruirlo, se derrite hacia el suelo
    if (datosMuro.destruido && muro.grupo.visible) {
      muro.grupo.scale.y -= dt * 0.8;
      if (muro.grupo.scale.y <= 0.05) muro.grupo.visible = false;
    }
  });

  /* ---------- Escombros detrás del Lanzador (no dejan pasar hasta vencerlo) ---------- */
  const escombros = new THREE.Group();
  for (let i = 0; i < 9; i++) {
    const r = crearRoca();
    r.position.set(-9 + i * 2.2, 0.8, K.zJefe - 14 + (Math.random() - 0.5) * 2);
    r.rotation.set(Math.random(), Math.random() * 3, Math.random());
    r.scale.setScalar(1.1 + Math.random() * 0.4);
    escombros.add(r);
  }
  escombros.visible = false;
  escena.add(escombros);
  const cajaEscombros = { minX: -12, maxX: 12, minZ: K.zJefe - 16.5, maxZ: K.zJefe - 11.5, alto: 3, inactiva: true };
  colisiones.push(cajaEscombros);
  function ponerEscombros(activos) {
    escombros.visible = activos;
    cajaEscombros.inactiva = !activos;
  }

  /* ---------- Cofres y suministros ---------- */
  const cofres = [];
  [[-9.5, K.zMuro + 30, Math.PI / 2], [10, K.zJefe + 40, -Math.PI / 2]].forEach(([x, z, r]) => {
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
  [[-7.5, K.zMuro + 24], [8, K.zJefe + 34], [-8, K.zJefe + 10], [9, K.zJefe - 2]].forEach(([x, z]) => agregarSuministro('botiquin', x, z));
  [[8.5, K.zMuro + 26], [-8, K.zMuro + 10], [-9.5, K.zJefe + 36], [8, K.zJefe + 14]].forEach(([x, z]) => agregarSuministro('cartuchos', x, z));
  [[7.8, K.zMuro + 4], [-7.5, K.zJefe + 22], [10, K.zJefe + 4]].forEach(([x, z]) => agregarSuministro('balas', x, z));
  animables.push((t) => {
    suministros.forEach((s) => {
      if (!s.activo) return;
      s.grupo.rotation.y = t * 1.2 + s.base;
      s.grupo.position.y = 0.15 + Math.sin(t * 2.5 + s.base) * 0.08;
    });
  });

  /* ---------- Lo que lanza el Lanzador queda en la vía un rato ---------- */
  const obstaculos = [];
  function agregarObstaculo(punto, tipo) {
    if (Math.abs(punto.x) > 12) return;   // si cae en el campo, no estorba
    const malla = tipo === 'auto' ? crearAutoDestruido(colores[Math.floor(Math.random() * colores.length)]).grupo : crearRoca();
    malla.position.set(punto.x, tipo === 'auto' ? 0 : 0.8, punto.z);
    malla.rotation.y = Math.random() * Math.PI * 2;
    if (tipo === 'auto') malla.rotation.z = Math.random() < 0.5 ? Math.PI : 0.3;   // a veces queda volteado
    if (tipo === 'auto' && malla.rotation.z > 3) malla.position.y = 1.7;
    escena.add(malla);
    const r = tipo === 'auto' ? 1.8 : 1.2;
    const caja = { minX: punto.x - r, maxX: punto.x + r, minZ: punto.z - r, maxZ: punto.z + r, alto: 2 };
    colisiones.push(caja);
    solidos.push(malla);
    obstaculos.push({ malla, caja, vida: K.vidaObstaculo });
  }
  function limpiarObstaculos() {
    obstaculos.forEach((o) => {
      escena.remove(o.malla);
      const i = colisiones.indexOf(o.caja); if (i >= 0) colisiones.splice(i, 1);
      const j = solidos.indexOf(o.malla); if (j >= 0) solidos.splice(j, 1);
    });
    obstaculos.length = 0;
  }
  animables.push((t, dt) => {
    for (let i = obstaculos.length - 1; i >= 0; i--) {
      const o = obstaculos[i];
      o.vida -= dt;
      if (o.vida < 1) o.malla.position.y -= dt * 2;   // se hunde y desaparece
      if (o.vida <= 0) {
        escena.remove(o.malla);
        const k = colisiones.indexOf(o.caja); if (k >= 0) colisiones.splice(k, 1);
        const j = solidos.indexOf(o.malla); if (j >= 0) solidos.splice(j, 1);
        obstaculos.splice(i, 1);
      }
    }
  });

  /* ---------- Cielo: luna, estrellas, la ciudad al fondo y la nave ---------- */
  const luna = crearLuna();
  luna.position.set(300, 160, -200);
  escena.add(luna);
  const posEstrellas = [];
  for (let i = 0; i < 700; i++) {
    const a = Math.random() * Math.PI * 2;
    const alt = 0.08 + Math.random() * 0.9;
    posEstrellas.push(Math.cos(a) * 500 * Math.cos(alt), 500 * Math.sin(alt), Math.sin(a) * 500 * Math.cos(alt) - 400);
  }
  const geoEstrellas = new THREE.BufferGeometry();
  geoEstrellas.setAttribute('position', new THREE.Float32BufferAttribute(posEstrellas, 3));
  const estrellas = new THREE.Points(geoEstrellas, new THREE.PointsMaterial({ color: 0xdfe4ff, size: 1.3, sizeAttenuation: false, fog: false }));
  escena.add(estrellas);
  // La ciudad (silueta) y la nave encima: se ven todo el camino
  const matCiudad = new THREE.MeshBasicMaterial({ color: 0x0b0c18, fog: false });
  const matVentanas = new THREE.MeshBasicMaterial({ color: 0x8a7a3a, fog: false });
  const ciudad = new THREE.Group();
  for (let i = 0; i < 34; i++) {
    const ancho = 14 + Math.random() * 22, alto = 30 + Math.random() * 90;
    const x = -260 + i * 16 + Math.random() * 6, z = -1100 - Math.random() * 120;
    const e = new THREE.Mesh(new THREE.BoxGeometry(ancho, alto, 14), matCiudad);
    e.position.set(x, alto / 2 - 4, z);
    ciudad.add(e);
    for (let k = 0; k < 3; k++) {
      if (Math.random() < 0.5) continue;
      const v = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 0.5), matVentanas);
      v.position.set(x + (Math.random() - 0.5) * ancho * 0.7, alto * (0.3 + Math.random() * 0.6), z + 7.3);
      ciudad.add(v);
    }
  }
  escena.add(ciudad);
  const nave = crearNaveNodriza();
  nave.grupo.position.set(0, 150, -1180);
  nave.grupo.scale.setScalar(2);
  escena.add(nave.grupo);
  animables.push((t) => { nave.grupo.rotation.y = t * 0.02; });
  const rayo = new THREE.Mesh(new THREE.ConeGeometry(34, 300, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0x5dff9b, transparent: true, opacity: 0.06, fog: false, depthWrite: false, side: THREE.DoubleSide }));
  rayo.position.set(0, 0, -1180);
  escena.add(rayo);

  /* ---------- Juntar lo que no se mueve ---------- */
  fusionarEstaticos(escena, estaticos, solidos);

  /* ---------- Cámara del menú ---------- */
  function camaraMenu(t, camara) {
    const z = -((t * 6) % 600);
    camara.position.set(Math.sin(t * 0.2) * 4, 6, z + 10);
    camara.lookAt(0, 3, z - 30);
  }

  function actualizar(t, dt, foco) {
    animables.forEach((f) => f(t, dt));
    // Las dos luces de poste más cercanas a Rosa
    if (foco && calidad.luces) {
      const zBase = Math.round(foco.z / 45) * 45;
      lucesPoste[0].position.set(((Math.abs(zBase / 45)) % 2 ? 1 : -1) * 6.4, 7.5, zBase);
      lucesPoste[1].position.set(((Math.abs(zBase / 45) + 1) % 2 ? 1 : -1) * 6.4, 7.5, zBase - 45);
    }
    // El cielo de fondo sigue a Rosa (para no verle el borde)
    estrellas.position.z = foco ? foco.z * 0.5 : 0;
  }

  return {
    id: 'carretera', limite, nieblaBase: NIEBLA_CARRETERA, usaVehiculo: true,
    minimapa: {
      suelo: '#1d3320',
      formas: [
        { x1: -11, z1: -950, x2: 11, z2: 50, color: '#4a4232' },     // bermas
        { x1: -7, z1: -950, x2: 7, z2: 50, color: '#34363f' },        // asfalto
        { x1: -40, z1: K.zCiudad - 60, x2: 40, z2: K.zCiudad, color: '#2e313d' }   // la ciudad
      ]
    },
    colisiones, solidos, suministros, cofres, barriles, puntosAparicion: [],
    lucesExtra: lucesPoste,
    muro: datosMuro, ponerEscombros, agregarObstaculo, limpiarObstaculos,
    inicioJugador: new THREE.Vector3(3.5, 0, 12), yawInicio: 0.4,
    inicioVehiculo: { x: 0, z: 6, yaw: 0 },
    agregarSuministro, actualizar, camaraMenu
  };
}
