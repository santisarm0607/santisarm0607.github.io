/* =========================================================
   GALAXY INVASION — modelos-ciudad.js
   Modelos de la Etapa 3 (La ciudad):
     - Soldado alien (dispara plasma) y Bruto (grande, carga)
     - Proyectiles: plasma y orbe
     - Aliado (soldado humano con rifle)
     - Edificio con ventanas que comparte material (rinde más)
   Mismo estilo low poly que modelos.js.
   ========================================================= */

import * as THREE from 'three';
import { material, COLORES, crearSoldado } from './modelos.js';

const geo = {
  caja: new THREE.BoxGeometry(1, 1, 1),
  esfera: new THREE.IcosahedronGeometry(1, 1),
  esferaBaja: new THREE.IcosahedronGeometry(1, 0),
  cono: new THREE.ConeGeometry(1, 1, 6),
  cilindro: new THREE.CylinderGeometry(1, 1, 1, 8)
};

function pieza(nombre, geometria, mat, escala, posicion = [0, 0, 0], rotacion = [0, 0, 0]) {
  const m = new THREE.Mesh(geometria, mat);
  m.name = nombre;
  m.scale.set(...escala);
  m.position.set(...posicion);
  m.rotation.set(...rotacion);
  return m;
}

function hitbox(tam, pos) {
  const h = new THREE.Mesh(new THREE.BoxGeometry(...tam), new THREE.MeshBasicMaterial({ visible: false }));
  h.name = 'hitbox';
  h.position.set(...pos);
  return h;
}

/* =========================================================
   SOLDADO ALIEN. Alto: 1.9 m
   Armadura morada, visor verde y un cañón de plasma en el
   brazo derecho (brilla antes de disparar).
   ========================================================= */
export function crearSoldadoAlien() {
  const grupo = new THREE.Group();
  grupo.name = 'soldado_alien';
  const matCuerpo = new THREE.MeshLambertMaterial({ color: 0x3b2a63, flatShading: true, emissive: 0x0c0718 });
  const matArmadura = material(0x5b4a8a);
  const matOscuro = material(0x15101f);
  const matVisor = material(COLORES.verdeAlien, { brilla: true });
  const matCanon = new THREE.MeshBasicMaterial({ color: 0x7a3fb3 });   // propio: brilla al cargar

  const cuerpo = new THREE.Group();
  cuerpo.name = 'cuerpo_raiz';
  grupo.add(cuerpo);
  // Piernas (dobladas hacia atrás, como de alien)
  const piernas = [];
  [-0.16, 0.16].forEach((x, i) => {
    const p = new THREE.Group();
    p.name = i ? 'pierna_der' : 'pierna_izq';
    p.position.set(x, 0.95, 0);
    p.add(pieza('muslo', geo.caja, matCuerpo, [0.16, 0.5, 0.18], [0, -0.22, -0.06], [0.3, 0, 0]));
    p.add(pieza('canilla', geo.caja, matArmadura, [0.14, 0.5, 0.16], [0, -0.66, 0.04], [-0.25, 0, 0]));
    p.add(pieza('pie', geo.caja, matOscuro, [0.16, 0.08, 0.3], [0, -0.92, -0.06]));
    cuerpo.add(p);
    piernas.push(p);
  });
  cuerpo.add(pieza('cadera', geo.caja, matOscuro, [0.44, 0.16, 0.26], [0, 0.98, 0]));
  cuerpo.add(pieza('torso', geo.caja, matCuerpo, [0.5, 0.55, 0.3], [0, 1.32, 0]));
  cuerpo.add(pieza('pecho', geo.caja, matArmadura, [0.54, 0.34, 0.34], [0, 1.42, -0.02]));
  cuerpo.add(pieza('luz_pecho', geo.caja, matVisor, [0.1, 0.06, 0.02], [0, 1.42, -0.2]));
  // Cabeza alargada con visor
  const cabeza = new THREE.Group();
  cabeza.name = 'cabeza';
  cabeza.position.set(0, 1.78, -0.02);
  cabeza.add(pieza('casco', geo.esferaBaja, matArmadura, [0.17, 0.2, 0.22], [0, 0.02, 0.02]));
  cabeza.add(pieza('cresta', geo.caja, matOscuro, [0.04, 0.12, 0.28], [0, 0.18, 0.04]));
  cabeza.add(pieza('visor', geo.caja, matVisor, [0.24, 0.07, 0.04], [0, 0.03, -0.17]));
  cuerpo.add(cabeza);
  // Brazos: el derecho es un cañón
  const brazoIzq = new THREE.Group();
  brazoIzq.name = 'brazo_izq';
  brazoIzq.position.set(-0.33, 1.55, 0);
  brazoIzq.add(pieza('hombrera', geo.caja, matArmadura, [0.2, 0.14, 0.24]));
  brazoIzq.add(pieza('brazo', geo.caja, matCuerpo, [0.12, 0.5, 0.13], [0, -0.3, 0]));
  cuerpo.add(brazoIzq);
  const brazoDer = new THREE.Group();
  brazoDer.name = 'brazo_der';
  brazoDer.position.set(0.33, 1.55, 0);
  brazoDer.add(pieza('hombrera', geo.caja, matArmadura, [0.2, 0.14, 0.24]));
  brazoDer.add(pieza('brazo', geo.caja, matCuerpo, [0.12, 0.3, 0.13], [0, -0.18, 0]));
  const canon = new THREE.Group();
  canon.name = 'canon_plasma';
  canon.position.set(0, -0.35, 0);
  canon.add(pieza('carcasa', geo.cilindro, matOscuro, [0.09, 0.5, 0.09], [0, 0, -0.18], [Math.PI / 2, 0, 0]));
  canon.add(pieza('bobina', geo.cilindro, matCanon, [0.1, 0.12, 0.1], [0, 0, -0.08], [Math.PI / 2, 0, 0]));
  canon.add(pieza('boca', geo.cilindro, matCanon, [0.06, 0.04, 0.06], [0, 0, -0.44], [Math.PI / 2, 0, 0]));
  brazoDer.add(canon);
  brazoDer.rotation.x = -1.2;   // apuntando hacia adelante
  cuerpo.add(brazoDer);
  const boca = new THREE.Object3D();
  boca.name = 'salida_plasma';
  boca.position.set(0, 0, -0.5);
  canon.add(boca);

  const hit = hitbox([0.8, 1.9, 0.6], [0, 0.95, 0]);
  grupo.add(hit);
  return { grupo, cuerpo, cabeza, piernas, brazoIzq, brazoDer, salida: boca, matCanon, matCuerpo, hitbox: hit };
}

/* =========================================================
   BRUTO. Alto: 2.8 m
   Encorvado, enorme, con puños gigantes y placas de roca.
   Luces verdes en la espalda.
   ========================================================= */
export function crearBruto() {
  const grupo = new THREE.Group();
  grupo.name = 'bruto';
  const matCuerpo = new THREE.MeshLambertMaterial({ color: 0x5a3b6b, flatShading: true, emissive: 0x100818 });
  const matPlaca = material(0x3a3442);
  const matBrillo = material(COLORES.verdeAlien, { brilla: true });
  const matOscuro = material(0x1a1222);

  const cuerpo = new THREE.Group();
  cuerpo.name = 'cuerpo_raiz';
  grupo.add(cuerpo);
  const piernas = [];
  [-0.45, 0.45].forEach((x, i) => {
    const p = new THREE.Group();
    p.name = i ? 'pierna_der' : 'pierna_izq';
    p.position.set(x, 1.0, 0.2);
    p.add(pieza('muslo', geo.caja, matCuerpo, [0.45, 0.6, 0.5], [0, -0.25, 0]));
    p.add(pieza('pie', geo.caja, matPlaca, [0.5, 0.35, 0.65], [0, -0.82, -0.08]));
    cuerpo.add(p);
    piernas.push(p);
  });
  const torso = new THREE.Group();
  torso.name = 'torso';
  torso.position.set(0, 1.75, 0);
  torso.rotation.x = 0.35;   // encorvado
  cuerpo.add(torso);
  torso.add(pieza('pecho', geo.esferaBaja, matCuerpo, [1.0, 0.85, 0.75]));
  torso.add(pieza('placa_pecho', geo.caja, matPlaca, [1.1, 0.7, 0.3], [0, 0.05, -0.62]));
  torso.add(pieza('joroba', geo.esferaBaja, matPlaca, [0.75, 0.6, 0.5], [0, 0.55, 0.35]));
  [-0.3, 0, 0.3].forEach((x, i) => torso.add(pieza('luz_espalda_' + (i + 1), geo.esferaBaja, matBrillo, [0.1, 0.1, 0.1], [x, 0.7, 0.75])));
  // Cabeza pequeña metida entre los hombros
  const cabeza = new THREE.Group();
  cabeza.name = 'cabeza';
  cabeza.position.set(0, 0.55, -0.75);
  cabeza.add(pieza('craneo', geo.esferaBaja, matCuerpo, [0.3, 0.26, 0.3]));
  cabeza.add(pieza('ojo_izq', geo.esfera, matBrillo, [0.06, 0.06, 0.04], [-0.12, 0.04, -0.27]));
  cabeza.add(pieza('ojo_der', geo.esfera, matBrillo, [0.06, 0.06, 0.04], [0.12, 0.04, -0.27]));
  cabeza.add(pieza('mandibula', geo.caja, matOscuro, [0.34, 0.1, 0.12], [0, -0.18, -0.22]));
  torso.add(cabeza);
  // Brazos larguísimos con puños enormes
  const brazos = [];
  [-1, 1].forEach((lado) => {
    const b = new THREE.Group();
    b.name = lado < 0 ? 'brazo_izq' : 'brazo_der';
    b.position.set(lado * 1.05, 0.35, -0.1);
    b.add(pieza('hombro', geo.esferaBaja, matPlaca, [0.42, 0.38, 0.42]));
    b.add(pieza('brazo', geo.caja, matCuerpo, [0.35, 0.8, 0.38], [lado * 0.05, -0.6, 0]));
    b.add(pieza('puno', geo.esferaBaja, matPlaca, [0.42, 0.4, 0.45], [lado * 0.05, -1.2, -0.05]));
    torso.add(b);
    brazos.push(b);
  });
  const hit = hitbox([2.2, 2.8, 1.9], [0, 1.4, 0]);
  grupo.add(hit);
  return { grupo, cuerpo, torso, cabeza, piernas, brazos, matCuerpo, hitbox: hit };
}

/* Bala de plasma del Soldado alien (alargada, apunta hacia +Z con lookAt) */
const geoPlasma = new THREE.CapsuleGeometry(0.09, 0.5, 2, 6);
geoPlasma.rotateX(Math.PI / 2);
export function crearPlasma() {
  const m = new THREE.Mesh(geoPlasma, material(0xd28aff, { brilla: true }));
  m.name = 'plasma';
  return m;
}

/* Orbe del Guardián (bola rosada que cae en arco) */
export function crearOrbe() {
  const g = new THREE.Group();
  g.name = 'orbe';
  g.add(pieza('nucleo', geo.esfera, material(0xffe0f6, { brilla: true }), [0.25, 0.25, 0.25]));
  g.add(pieza('halo', geo.esferaBaja, new THREE.MeshBasicMaterial({ color: 0xff5ad1, transparent: true, opacity: 0.5, depthWrite: false }), [0.5, 0.5, 0.5]));
  return g;
}

/* =========================================================
   ALIADO: el soldado humano de modelos.js, con un rifle en
   las manos y los brazos hacia adelante
   ========================================================= */
export function crearAliado() {
  const { grupo } = crearSoldado();
  grupo.name = 'aliado';
  const brazoDer = grupo.getObjectByName('brazo_der');
  const brazoIzq = grupo.getObjectByName('brazo_izq');
  brazoDer.rotation.set(-1.25, 0, -0.1);
  brazoIzq.rotation.set(-1.3, 0, 0.45);
  const rifle = new THREE.Group();
  rifle.name = 'rifle';
  rifle.position.set(0.15, 1.15, -0.45);
  rifle.add(pieza('cuerpo', geo.caja, material(0x22252b), [0.07, 0.1, 0.75]));
  rifle.add(pieza('canon', geo.caja, material(0x3a3f4a), [0.035, 0.035, 0.35], [0, 0.02, -0.5]));
  rifle.add(pieza('cargador', geo.caja, material(0x22252b), [0.05, 0.16, 0.08], [0, -0.1, -0.05]));
  grupo.add(rifle);
  const salida = new THREE.Object3D();
  salida.position.set(0, 0.02, -0.7);
  rifle.add(salida);
  const fogonazo = pieza('fogonazo', geo.esferaBaja, material(COLORES.ambar, { brilla: true }), [0.08, 0.08, 0.14], [0, 0.02, -0.72]);
  fogonazo.visible = false;
  rifle.add(fogonazo);
  // Marca sobre la cabeza para reconocerlos (verde = amigo)
  const marca = pieza('marca_aliado', geo.cono, material(COLORES.verdeAlien, { brilla: true }), [0.12, 0.18, 0.12], [0, 2.15, 0], [Math.PI, 0, 0]);
  grupo.add(marca);
  return {
    grupo, salida, fogonazo, marca,
    piernas: [grupo.getObjectByName('pierna_izq'), grupo.getObjectByName('pierna_der')]
  };
}

/* =========================================================
   EDIFICIOS DE LA CIUDAD
   Las ventanas son una textura que se repite. A diferencia de
   crearEdificio() (v0.1), aquí todos los edificios del mismo
   color comparten material, así se pueden juntar en un solo
   dibujo (mucho más rápido en el celular).
   ========================================================= */
const materialesEdificio = new Map();
export function materialEdificio(color, texturaVentanas) {
  if (!materialesEdificio.has(color)) {
    materialesEdificio.set(color, new THREE.MeshLambertMaterial({ color, emissive: 0xffffff, emissiveMap: texturaVentanas, emissiveIntensity: 0.9 }));
  }
  return materialesEdificio.get(color);
}

/* Caja de ancho x alto x fondo con las coordenadas de la textura
   escaladas: una ventana cada 4 m en cualquier tamaño */
export function geometriaEdificio(ancho, alto, fondo) {
  const g = new THREE.BoxGeometry(ancho, alto, fondo);
  const uv = g.attributes.uv;
  // Orden de las caras de BoxGeometry: +x, -x, +y, -y, +z, -z (4 vértices cada una)
  const tamCara = [[fondo, alto], [fondo, alto], [0, 0], [0, 0], [ancho, alto], [ancho, alto]];
  for (let cara = 0; cara < 6; cara++) {
    const [u, v] = tamCara[cara];
    for (let k = 0; k < 4; k++) {
      const i = cara * 4 + k;
      if (u === 0) uv.setXY(i, 0.02, 0.02);   // techo y piso: sin ventanas
      else uv.setXY(i, uv.getX(i) * Math.max(1, Math.round(u / 4)), uv.getY(i) * Math.max(1, Math.round(v / 4)));
    }
  }
  uv.needsUpdate = true;
  return g;
}

export function crearEdificioCiudad(ancho, alto, fondo, color, texturaVentanas) {
  const grupo = new THREE.Group();
  grupo.name = 'edificio';
  const cuerpo = new THREE.Mesh(geometriaEdificio(ancho, alto, fondo), materialEdificio(color, texturaVentanas));
  cuerpo.name = 'cuerpo';
  cuerpo.position.y = alto / 2;
  grupo.add(cuerpo);
  grupo.add(pieza('azotea', geo.caja, material(0x1f2128), [ancho + 0.3, 0.4, fondo + 0.3], [0, alto + 0.2, 0]));
  return { grupo, cuerpo };
}

/* Barricada de sacos de arena (donde están atrapados los soldados) */
export function crearBarricada(largo = 4) {
  const grupo = new THREE.Group();
  grupo.name = 'barricada';
  const mat = material(0x8a7a52);
  const n = Math.max(2, Math.round(largo / 0.7));
  for (let fila = 0; fila < 3; fila++) {
    for (let i = 0; i < n - (fila % 2); i++) {
      grupo.add(pieza('saco', geo.esferaBaja, mat, [0.38, 0.2, 0.28], [-largo / 2 + 0.35 + i * (largo / n) + (fila % 2) * 0.35, 0.18 + fila * 0.33, 0], [0, (i * 0.7) % 1, 0]));
    }
  }
  return { grupo };
}
