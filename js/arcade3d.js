/* =========================================================
   ARCADE EN 3D (juegos.html)
   La escena de verdad: mi nave vista desde atrás, los planetas flotando
   adelante y un salto a hiperespacio al despegar.

   Usa Three.js (js/vendor/three.module.min.js, versión 0.160.1).
   Este archivo solo dibuja y anima; quien decide qué pasa al elegir o
   despegar es js/main.js (parte 16). Si algo falla aquí (por ejemplo el
   navegador no tiene WebGL), main.js se queda con el carrusel de CSS.

   Cómo se usa (lo hace main.js):
     const escena = crearEscena({ contenedor, planetas, reducido, alClic });
     escena.elegir(1);               // la nave gira hacia el planeta 1
     await escena.hiperespacio(1);   // despega y salta; termina cuando ya hay que abrir el juego
   ========================================================= */

import * as THREE from './vendor/three.module.min.js';

/* ---------------------------------------------------------
   Utilidades
   --------------------------------------------------------- */

// crea una textura dibujando con el canvas 2D (así no hay que cargar imágenes)
function texturaDibujada(ancho, alto, dibujar) {
  const lienzo = document.createElement('canvas');
  lienzo.width = ancho;
  lienzo.height = alto;
  dibujar(lienzo.getContext('2d'), ancho, alto);
  const textura = new THREE.CanvasTexture(lienzo);
  textura.colorSpace = THREE.SRGBColorSpace;
  textura.anisotropy = 4;
  return textura;
}

// un resplandor redondo (para el brillo detrás de cada planeta)
function texturaBrillo() {
  return texturaDibujada(128, 128, function (c, w, h) {
    const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.35)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
  });
}

function suavizar(t) { // arranca despacio y acelera (para el despegue)
  return t * t * (3 - 2 * t);
}

function limitar(valor, min, max) {
  return Math.min(max, Math.max(min, valor));
}

/* ---------------------------------------------------------
   La nave (la misma del dibujo 2D, pero en 3D). La punta mira hacia +Z.
   --------------------------------------------------------- */
function crearNave() {
  const nave = new THREE.Group();
  const modelo = new THREE.Group(); // lo que flota y se balancea
  nave.add(modelo);

  const metal = new THREE.MeshStandardMaterial({ color: 0xe9efff, metalness: 0.55, roughness: 0.28 });
  const azul = new THREE.MeshStandardMaterial({ color: 0x3153a1, metalness: 0.4, roughness: 0.4, side: THREE.DoubleSide });
  const celeste = new THREE.MeshStandardMaterial({ color: 0x29b6f6, metalness: 0.2, roughness: 0.3, emissive: 0x0a5f8c, emissiveIntensity: 0.5 });

  // cuerpo: una figura de revolución (como torneada)
  const perfil = new THREE.SplineCurve([
    new THREE.Vector2(0.01, -1.6), new THREE.Vector2(0.55, -1.6), new THREE.Vector2(0.78, -1.2),
    new THREE.Vector2(0.82, -0.2), new THREE.Vector2(0.78, 0.9), new THREE.Vector2(0.6, 1.7),
    new THREE.Vector2(0.3, 2.3), new THREE.Vector2(0.01, 2.7)
  ]).getPoints(40);
  const cuerpoGeo = new THREE.LatheGeometry(perfil, 36);
  cuerpoGeo.rotateX(Math.PI / 2); // el eje Y pasa a ser Z: la punta queda hacia +Z
  modelo.add(new THREE.Mesh(cuerpoGeo, metal));

  // punta celeste
  const puntaPerfil = new THREE.SplineCurve([
    new THREE.Vector2(0.612, 1.7), new THREE.Vector2(0.31, 2.32), new THREE.Vector2(0.01, 2.72)
  ]).getPoints(16);
  const puntaGeo = new THREE.LatheGeometry(puntaPerfil, 36);
  puntaGeo.rotateX(Math.PI / 2);
  modelo.add(new THREE.Mesh(puntaGeo, celeste));

  // aletas: dos a los lados y una arriba
  const forma = new THREE.Shape();
  forma.moveTo(0.7, 0.8);
  forma.lineTo(2.2, -1.1);
  forma.lineTo(2.2, -1.7);
  forma.lineTo(0.7, -1.4);
  forma.closePath();
  const aletaGeo = new THREE.ExtrudeGeometry(forma, { depth: 0.12, bevelEnabled: false });
  aletaGeo.translate(0, 0, -0.06);
  aletaGeo.rotateX(Math.PI / 2); // la aleta "acostada" queda a lo largo de la nave
  const derecha = new THREE.Mesh(aletaGeo, azul);
  const izquierda = new THREE.Mesh(aletaGeo, azul);
  izquierda.scale.x = -1;
  const arriba = new THREE.Mesh(aletaGeo, azul);
  arriba.rotation.z = Math.PI / 2;
  arriba.scale.set(0.8, 0.8, 1);
  modelo.add(derecha, izquierda, arriba);

  // franja azul y motor
  const franja = new THREE.Mesh(new THREE.TorusGeometry(0.815, 0.09, 12, 48), azul);
  franja.position.z = -0.35;
  modelo.add(franja);

  const toberaGeo = new THREE.CylinderGeometry(0.42, 0.62, 0.55, 28);
  toberaGeo.rotateX(Math.PI / 2);
  const tobera = new THREE.Mesh(toberaGeo, new THREE.MeshStandardMaterial({ color: 0x24346b, metalness: 0.7, roughness: 0.35 }));
  tobera.position.z = -1.85;
  modelo.add(tobera);

  // ventana arriba, para que se vea desde atrás
  const ventana = new THREE.Mesh(new THREE.SphereGeometry(0.36, 24, 18), celeste);
  ventana.scale.set(1, 1, 1.35);
  ventana.position.set(0, 0.62, 0.95);
  modelo.add(ventana);
  const reflejo = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  reflejo.position.set(-0.12, 0.88, 1.15);
  modelo.add(reflejo);

  // fuego del motor: dos conos que apuntan hacia atrás (-Z) y titilan
  const fuego = new THREE.Group();
  fuego.position.z = -2.1;
  const conoGeo = new THREE.ConeGeometry(0.46, 2.6, 20, 1, true);
  conoGeo.translate(0, -1.3, 0); // la base queda en el origen y la punta apunta hacia -Y
  conoGeo.rotateX(-Math.PI / 2); // ... y ahora hacia -Z
  const fuegoExterior = new THREE.Mesh(conoGeo, new THREE.MeshBasicMaterial({
    color: 0xffb53d, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
  }));
  const interior = new THREE.Mesh(conoGeo, new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
  }));
  interior.scale.set(0.5, 0.5, 0.6);
  fuego.add(fuegoExterior, interior);
  modelo.add(fuego);

  // luz del motor sobre la nave
  const luz = new THREE.PointLight(0xffa23c, 8, 9, 2);
  luz.position.z = -2.6;
  modelo.add(luz);

  return { nave: nave, modelo: modelo, fuego: fuego, luz: luz };
}

/* ---------------------------------------------------------
   Los planetas
   --------------------------------------------------------- */
const PLANETAS = {
  // Galaxy Gol: un planeta-cancha de fútbol
  gol: {
    radio: 3.3,
    crear: function (grupo, brillo) {
      const textura = texturaDibujada(1024, 512, function (c, w, h) {
        // franjas de pasto
        for (let i = 0; i < 16; i++) {
          c.fillStyle = i % 2 ? '#3FAF4A' : '#4BC056';
          c.fillRect(i * w / 16, 0, w / 16 + 1, h);
        }
        // líneas de la cancha (blancas)
        c.strokeStyle = 'rgba(255,255,255,0.9)';
        c.lineWidth = 7;
        c.beginPath(); c.moveTo(w / 2, 0); c.lineTo(w / 2, h); c.stroke();
        c.beginPath(); c.arc(w / 2, h / 2, 62, 0, Math.PI * 2); c.stroke();
        c.strokeRect(w / 2 - 250, h / 2 - 110, 120, 220);
        c.strokeRect(w / 2 + 130, h / 2 - 110, 120, 220);
        c.strokeRect(w / 2 - 250 - 150, h / 2 - 60, 150, 120);
        c.strokeRect(w / 2 + 250, h / 2 - 60, 150, 120);
      });
      const esfera = new THREE.Mesh(
        new THREE.SphereGeometry(1, 64, 40),
        new THREE.MeshStandardMaterial({ map: textura, roughness: 0.85, metalness: 0 })
      );
      esfera.rotation.y = -Math.PI / 2; // para que la cancha mire al frente
      grupo.add(esfera);

      // un balón que le da la vuelta al planeta
      const balonTextura = texturaDibujada(128, 64, function (c, w, h) {
        c.fillStyle = '#ffffff';
        c.fillRect(0, 0, w, h);
        c.fillStyle = '#1b1b1b';
        for (let i = 0; i < 6; i++) {
          c.beginPath();
          c.arc(10 + i * 21, 18 + (i % 2) * 26, 8, 0, Math.PI * 2);
          c.fill();
        }
      });
      const balon = new THREE.Mesh(new THREE.SphereGeometry(0.17, 20, 16), new THREE.MeshStandardMaterial({ map: balonTextura, roughness: 0.5 }));
      grupo.add(balon);
      return { girar: esfera, luna: balon, lunaRadio: 1.55, lunaVel: 0.9 };
    }
  },

  // COSMOBALL: un agujero negro con su disco de gas brillante
  cosmo: {
    radio: 2.7,
    crear: function (grupo, brillo) {
      const hueco = new THREE.Mesh(
        new THREE.SphereGeometry(1, 48, 32),
        new THREE.MeshStandardMaterial({ color: 0x07041a, roughness: 0.5, metalness: 0.3, emissive: 0x1c0a40, emissiveIntensity: 0.6 })
      );
      grupo.add(hueco);

      // borde azulado alrededor del agujero (un fresnel casero con una esfera de atrás)
      const borde = new THREE.Mesh(
        new THREE.SphereGeometry(1.06, 48, 32),
        new THREE.MeshBasicMaterial({ color: 0x6a8dff, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, side: THREE.BackSide, depthWrite: false })
      );
      grupo.add(borde);

      const discoTextura = texturaDibujada(512, 512, function (c, w, h) {
        const g = c.createRadialGradient(w / 2, h / 2, w * 0.2, w / 2, h / 2, w / 2);
        g.addColorStop(0, 'rgba(255,235,160,0)');
        g.addColorStop(0.18, 'rgba(255,200,90,0.95)');
        g.addColorStop(0.42, 'rgba(255,90,170,0.9)');
        g.addColorStop(0.72, 'rgba(155,92,255,0.55)');
        g.addColorStop(1, 'rgba(60,20,140,0)');
        c.fillStyle = g;
        c.fillRect(0, 0, w, h);
        // vetitas de gas girando
        c.globalCompositeOperation = 'destination-out';
        for (let i = 0; i < 60; i++) {
          c.strokeStyle = 'rgba(0,0,0,' + (0.05 + Math.random() * 0.2) + ')';
          c.lineWidth = 1 + Math.random() * 3;
          c.beginPath();
          c.arc(w / 2, h / 2, w * (0.22 + Math.random() * 0.26), Math.random() * 6.28, Math.random() * 6.28 + 1.2);
          c.stroke();
        }
      });
      const disco = new THREE.Mesh(
        new THREE.RingGeometry(1.25, 2.55, 96, 1),
        new THREE.MeshBasicMaterial({ map: discoTextura, transparent: true, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })
      );
      // los anillos de Three.js dan la textura "de lado": la estiro para que quede redonda
      const posiciones = disco.geometry.attributes.position;
      const uv = disco.geometry.attributes.uv;
      for (let i = 0; i < posiciones.count; i++) {
        const x = posiciones.getX(i);
        const y = posiciones.getY(i);
        uv.setXY(i, (x / 2.55) * 0.5 + 0.5, (y / 2.55) * 0.5 + 0.5);
      }
      const inclinado = new THREE.Group(); // el disco va inclinado, como en el logo
      inclinado.rotation.set(-1.05, 0, 0.32);
      inclinado.add(disco);
      grupo.add(inclinado);

      const pelota = new THREE.Mesh(new THREE.SphereGeometry(0.13, 18, 14), new THREE.MeshBasicMaterial({ color: 0x9ff1ff }));
      grupo.add(pelota);
      return { girar: disco, girarEje: 'z', luna: pelota, lunaRadio: 1.9, lunaVel: 1.3 };
    }
  },

  // Próximamente: una luna gris con candado
  bloqueado: {
    radio: 2.3,
    crear: function (grupo, brillo) {
      const textura = texturaDibujada(1024, 512, function (c, w, h) {
        c.fillStyle = '#7d8cae';
        c.fillRect(0, 0, w, h);
        for (let i = 0; i < 700; i++) { // manchitas
          c.fillStyle = 'rgba(' + (60 + Math.random() * 80) + ',' + (70 + Math.random() * 80) + ',' + (100 + Math.random() * 80) + ',0.12)';
          c.beginPath();
          c.arc(Math.random() * w, Math.random() * h, 2 + Math.random() * 14, 0, 6.28);
          c.fill();
        }
        for (let i = 0; i < 38; i++) { // cráteres
          const x = Math.random() * w;
          const y = h * (0.15 + Math.random() * 0.7);
          const r = 10 + Math.random() * 46;
          c.fillStyle = 'rgba(30,40,70,0.55)';
          c.beginPath(); c.arc(x, y, r, 0, 6.28); c.fill();
          c.strokeStyle = 'rgba(220,230,255,0.35)';
          c.lineWidth = 3;
          c.beginPath(); c.arc(x - 2, y - 2, r, 3.4, 5.6); c.stroke();
        }
      });
      const esfera = new THREE.Mesh(new THREE.SphereGeometry(1, 56, 36), new THREE.MeshStandardMaterial({ map: textura, roughness: 0.95, metalness: 0 }));
      grupo.add(esfera);

      // el candado, flotando adelante
      const candadoTextura = texturaDibujada(128, 128, function (c, w, h) {
        c.fillStyle = '#e8b830';
        c.strokeStyle = '#c99a15';
        c.lineWidth = 10;
        c.beginPath(); c.arc(64, 50, 24, Math.PI, 0); c.stroke();
        c.fillStyle = '#f2c94c';
        c.beginPath();
        c.roundRect ? c.roundRect(28, 52, 72, 56, 10) : c.rect(28, 52, 72, 56);
        c.fill();
        c.fillStyle = '#7a5a08';
        c.beginPath(); c.arc(64, 78, 8, 0, 6.28); c.fill();
        c.fillRect(61, 80, 6, 16);
      });
      const candado = new THREE.Sprite(new THREE.SpriteMaterial({ map: candadoTextura, transparent: true, depthTest: false }));
      candado.scale.set(1.5, 1.5, 1);
      candado.position.set(0, 0, 1.25);
      candado.renderOrder = 5;
      grupo.add(candado);
      return { girar: esfera };
    }
  }
};

/* ---------------------------------------------------------
   La escena completa
   opciones = { contenedor, planetas: [{ id, nombre, color }], reducido, alClic }
   --------------------------------------------------------- */
export function crearEscena(opciones) {
  const contenedor = opciones.contenedor;
  const infos = opciones.planetas;
  const reducido = !!opciones.reducido;

  const renderizador = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderizador.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderizador.setClearColor(0x000000, 0);
  renderizador.domElement.className = 'arcade__canvas';
  renderizador.domElement.setAttribute('aria-hidden', 'true');
  contenedor.appendChild(renderizador.domElement);

  const escena = new THREE.Scene();
  const camara = new THREE.PerspectiveCamera(55, 1, 0.1, 400);
  const FOV_NORMAL = 55;

  // luces
  escena.add(new THREE.AmbientLight(0x93a5d8, 1.05));
  const sol = new THREE.DirectionalLight(0xffffff, 2.6);
  sol.position.set(6, 9, 8);
  escena.add(sol);
  const relleno = new THREE.DirectionalLight(0x6f8bff, 0.7);
  relleno.position.set(-8, -2, 4);
  escena.add(relleno);

  // estrellas de fondo
  const nEstrellas = 900;
  const posEstrellas = new Float32Array(nEstrellas * 3);
  for (let i = 0; i < nEstrellas; i++) {
    posEstrellas[i * 3] = (Math.random() - 0.5) * 220;
    posEstrellas[i * 3 + 1] = (Math.random() - 0.5) * 120;
    posEstrellas[i * 3 + 2] = -30 - Math.random() * 160;
  }
  const estrellasGeo = new THREE.BufferGeometry();
  estrellasGeo.setAttribute('position', new THREE.BufferAttribute(posEstrellas, 3));
  const estrellas = new THREE.Points(estrellasGeo, new THREE.PointsMaterial({ color: 0xcfe2ff, size: 0.55, sizeAttenuation: true, transparent: true, opacity: 0.85, depthWrite: false }));
  escena.add(estrellas);

  // la nave
  const miNave = crearNave();
  miNave.nave.position.set(0, -1.5, 0);
  miNave.nave.scale.setScalar(0.62);
  escena.add(miNave.nave);
  const mirada = new THREE.Object3D(); // ayudante para calcular hacia dónde debe mirar la nave
  mirada.position.copy(miNave.nave.position);

  // los planetas, en arco: izquierda, centro (más lejos) y derecha
  const POSICIONES = [
    new THREE.Vector3(-9, 0.8, -19),
    new THREE.Vector3(0, 2.2, -27),
    new THREE.Vector3(9, 0.2, -19)
  ];
  const textoBrillo = texturaBrillo();
  const mundos = infos.map(function (info, i) {
    const def = PLANETAS[info.id];
    const grupo = new THREE.Group();
    grupo.position.copy(POSICIONES[i % POSICIONES.length]);
    const cuerpo = new THREE.Group(); // lo que se agranda cuando está elegido
    cuerpo.scale.setScalar(def.radio);
    grupo.add(cuerpo);
    const piezas = def.crear(cuerpo, textoBrillo);

    // la luna/balón que orbita se agrega al cuerpo (en unidades del planeta)
    const brillo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: textoBrillo, color: new THREE.Color(info.color), transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false
    }));
    brillo.scale.setScalar(def.radio * 5.2);
    brillo.position.z = -def.radio;
    grupo.add(brillo);

    escena.add(grupo);
    return {
      grupo: grupo, cuerpo: cuerpo, brillo: brillo, piezas: piezas, radio: def.radio,
      color: new THREE.Color(info.color), escala: 1, escalaMeta: 1, opacidad: 1, fase: i * 1.7
    };
  });

  // etiquetas con el nombre (HTML encima del canvas)
  const capaEtiquetas = document.createElement('div');
  capaEtiquetas.className = 'arcade__etiquetas';
  capaEtiquetas.setAttribute('aria-hidden', 'true');
  const etiquetas = infos.map(function (info) {
    const e = document.createElement('span');
    e.className = 'arcade__etiqueta';
    e.textContent = info.nombre;
    capaEtiquetas.appendChild(e);
    return e;
  });
  contenedor.appendChild(capaEtiquetas);

  // rayas de velocidad para el hiperespacio
  const nRayas = 520;
  const rayasPos = new Float32Array(nRayas * 6);
  const rayasBase = []; // x, y, z de cada raya
  for (let i = 0; i < nRayas; i++) {
    const ang = Math.random() * Math.PI * 2;
    const rad = 2.5 + Math.pow(Math.random(), 0.7) * 38;
    rayasBase.push({ x: Math.cos(ang) * rad, y: Math.sin(ang) * rad * 0.65, z: -Math.random() * 220 + 20, v: 0.6 + Math.random() * 0.8 });
  }
  const rayasGeo = new THREE.BufferGeometry();
  rayasGeo.setAttribute('position', new THREE.BufferAttribute(rayasPos, 3));
  const rayasMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const rayas = new THREE.LineSegments(rayasGeo, rayasMaterial);
  rayas.frustumCulled = false;
  rayas.visible = false;
  escena.add(rayas);

  // estado
  let elegido = 0;
  let sobre = -1; // planeta bajo el puntero
  let ancho = 1;
  let alto = 1;
  let salto = null; // datos del hiperespacio mientras ocurre
  let tiempo = 0;
  let ultimo = performance.now();
  let enPantalla = true;
  let pestanaVisible = true;
  let visible = true;
  let animacion = 0;
  const quatMeta = new THREE.Quaternion();
  const camMeta = new THREE.Vector3();
  const camPos = new THREE.Vector3(0, 2.4, 8.4);
  camara.position.copy(camPos);
  const vector = new THREE.Vector3();

  function ajustarTamano() {
    ancho = Math.max(1, contenedor.clientWidth);
    alto = Math.max(1, contenedor.clientHeight);
    renderizador.setSize(ancho, alto, false);
    camara.aspect = ancho / alto;
    // en pantallas angostas (celular) abro un poco más la vista para que quepan los 3 planetas
    // el ancho que se ve se mantiene igual aunque el recuadro sea más alto o más angosto (si no, los planetas se cortarían)
    const mitadAncho = 0.63;
    camara.fov = limitar(2 * Math.atan(mitadAncho / camara.aspect) * 180 / Math.PI, 40, 78);
    camara.updateProjectionMatrix();
  }
  ajustarTamano();
  const observador = new ResizeObserver(ajustarTamano);
  observador.observe(contenedor);

  // la nave gira hacia el planeta elegido
  const adelante = new THREE.Vector3(0, 0, -1);
  const haciaPlaneta = new THREE.Vector3();
  function apuntar(i, instante, completo) {
    elegido = i;
    mundos.forEach(function (m, n) {
      m.escalaMeta = n === i ? 1.22 : 1;
      etiquetas[n].classList.toggle('arcade__etiqueta--activa', n === i);
    });
    // mientras se elige, la nave solo se inclina un poco hacia el planeta (65 %); al despegar apunta de lleno
    haciaPlaneta.copy(mundos[i].grupo.position).sub(miNave.nave.position).normalize();
    haciaPlaneta.lerpVectors(adelante, haciaPlaneta, completo ? 1 : 0.65).normalize();
    mirada.position.copy(miNave.nave.position);
    mirada.lookAt(haciaPlaneta.multiplyScalar(10).add(miNave.nave.position)); // en un objeto normal, lookAt apunta su eje +Z (donde está la punta)
    quatMeta.copy(mirada.quaternion);
    if (instante) {
      miNave.nave.quaternion.copy(quatMeta);
      mundos.forEach(function (m) { m.escala = m.escalaMeta; });
    }
  }
  apuntar(0, true);

  // clic / toque sobre un planeta
  const rayo = new THREE.Raycaster();
  const puntero = new THREE.Vector2();
  function planetaEn(evento) {
    const caja = renderizador.domElement.getBoundingClientRect();
    puntero.x = ((evento.clientX - caja.left) / caja.width) * 2 - 1;
    puntero.y = -((evento.clientY - caja.top) / caja.height) * 2 + 1;
    rayo.setFromCamera(puntero, camara);
    let mejor = -1;
    let distancia = Infinity;
    mundos.forEach(function (m, n) {
      // dejo un margen: el área de clic es un poco más grande que el planeta (más fácil en celular)
      const esfera = new THREE.Sphere(m.grupo.position, m.radio * m.escala * 1.25);
      const punto = rayo.ray.intersectSphere(esfera, vector);
      if (punto) {
        const d = camara.position.distanceTo(punto);
        if (d < distancia) { distancia = d; mejor = n; }
      }
    });
    return mejor;
  }

  renderizador.domElement.addEventListener('pointermove', function (e) {
    if (salto) return;
    sobre = planetaEn(e);
    renderizador.domElement.style.cursor = sobre >= 0 ? 'pointer' : '';
  });
  renderizador.domElement.addEventListener('pointerleave', function () { sobre = -1; });
  renderizador.domElement.addEventListener('click', function (e) {
    if (salto) return;
    const n = planetaEn(e);
    if (n >= 0 && opciones.alClic) opciones.alClic(n);
  });

  // ---- el dibujo de cada cuadro ----
  function cuadro(ahora) {
    animacion = requestAnimationFrame(cuadro);
    if (!visible) return;
    const dt = Math.min(0.05, (ahora - ultimo) / 1000);
    ultimo = ahora;
    tiempo += dt;

    // planetas: giran, se agrandan si están elegidos y su luna orbita
    mundos.forEach(function (m, n) {
      m.escala += (m.escalaMeta - m.escala) * Math.min(1, dt * 6);
      m.cuerpo.scale.setScalar(m.radio * m.escala);
      m.grupo.position.y = POSICIONES[n % POSICIONES.length].y + Math.sin(tiempo * 0.8 + m.fase) * 0.25;
      const p = m.piezas;
      if (p.girar) {
        if (p.girarEje === 'z') p.girar.rotation.z += dt * 0.35;
        else p.girar.rotation.y += dt * 0.06;
      }
      if (p.luna) {
        const a = tiempo * p.lunaVel + m.fase;
        p.luna.position.set(Math.cos(a) * p.lunaRadio, Math.sin(a * 0.7) * 0.35, Math.sin(a) * p.lunaRadio);
      }
      const objetivo = n === elegido ? 0.5 : (n === sobre ? 0.34 : 0.18);
      m.brillo.material.opacity += (objetivo - m.brillo.material.opacity) * Math.min(1, dt * 5);
    });

    // la nave flota y gira suavecito hacia el planeta elegido
    const nave = miNave.nave;
    if (!salto) {
      nave.quaternion.slerp(quatMeta, Math.min(1, dt * 4.5));
      miNave.modelo.position.y = Math.sin(tiempo * 1.6) * 0.14;
      miNave.modelo.rotation.z = Math.sin(tiempo * 1.1) * 0.05;
    }

    // fuego del motor titilando (más largo durante el salto)
    const fuerza = salto ? 1.4 + salto.velocidad * 1.6 : 1;
    const parpadeo = 0.85 + Math.random() * 0.3;
    miNave.fuego.scale.set(1, 1, fuerza * parpadeo);
    miNave.luz.intensity = (6 + Math.random() * 3) * fuerza;

    // hiperespacio
    if (salto) avanzarSalto(dt);

    // la cámara va un poquito hacia donde apunta la nave
    if (!salto) {
      camMeta.set(vectorMirada().x * 0.9, camPos.y - vectorMirada().y * 0.25, camPos.z);
      camara.position.lerp(camMeta, Math.min(1, dt * 2.5));
      camara.lookAt(vectorMirada().x * 2.2, 0.8, -12);
    }

    posicionarEtiquetas();
    renderizador.render(escena, camara);
  }

  const mira = new THREE.Vector3();
  function vectorMirada() {
    mira.set(0, 0, 1).applyQuaternion(miNave.nave.quaternion); // hacia dónde apunta la punta
    return mira;
  }

  function posicionarEtiquetas() {
    mundos.forEach(function (m, n) {
      vector.copy(m.grupo.position);
      vector.y -= m.radio * m.escala * 1.2 + 0.4;
      vector.project(camara);
      const x = (vector.x * 0.5 + 0.5) * ancho;
      const y = (-vector.y * 0.5 + 0.5) * alto;
      etiquetas[n].style.transform = 'translate(' + x.toFixed(1) + 'px, ' + y.toFixed(1) + 'px) translate(-50%, 0)';
      etiquetas[n].style.opacity = salto ? String(Math.max(0, 1 - salto.t * 3)) : '1';
    });
  }

  /* ---- el despegue y el salto a hiperespacio ----
     0.0 - 0.6 s  la nave se alinea y el motor se enciende
     0.5 - 2.3 s  acelera: las estrellas se vuelven rayas y la vista se ensancha
     2.3 s        todo se vuelve color del planeta y se abre el juego */
  const DURACION = 2.4;
  function avanzarSalto(dt) {
    salto.t += dt / DURACION;
    const t = salto.t;
    const aceleracion = suavizar(limitar((t - 0.2) / 0.75, 0, 1)); // 0 → 1
    salto.velocidad = aceleracion;

    // la nave apunta de lleno al planeta y avanza hacia él
    miNave.nave.quaternion.slerp(quatMeta, Math.min(1, dt * 8));
    const destino = mundos[salto.indice].grupo.position;
    const avance = suavizar(limitar((t - 0.25) / 0.7, 0, 1)) * 0.62;
    miNave.nave.position.lerpVectors(salto.inicio, destino, avance);
    miNave.modelo.position.y *= 0.9;

    // la cámara sigue a la nave de cerca, con un temblorcito
    const t2 = aceleracion;
    const temblor = t2 * 0.07;
    camara.position.set(
      miNave.nave.position.x + (Math.random() - 0.5) * temblor,
      miNave.nave.position.y + 3.2 - t2 * 0.9 + (Math.random() - 0.5) * temblor,
      miNave.nave.position.z + 9.6 - t2 * 2.2
    );
    camara.lookAt(destino.x * 0.8, destino.y * 0.8, destino.z);

    camara.fov = salto.fovInicial + aceleracion * 62;
    camara.updateProjectionMatrix();

    // los otros planetas se apagan
    mundos.forEach(function (m, n) {
      if (n !== salto.indice) {
        m.grupo.visible = t < 0.55;
      }
    });

    // rayas de velocidad
    rayas.visible = aceleracion > 0.02;
    rayasMaterial.opacity = Math.min(1, aceleracion * 1.6);
    const velocidad = aceleracion * 320 + 8;
    const largo = aceleracion * 38;
    const ref = camara.position.z;
    for (let i = 0; i < nRayas; i++) {
      const r = rayasBase[i];
      r.z += velocidad * r.v * dt;
      if (r.z > ref + 6) r.z -= 240;
      const k = i * 6;
      rayasPos[k] = camara.position.x * 0.5 + r.x;
      rayasPos[k + 1] = camara.position.y * 0.5 + r.y;
      rayasPos[k + 2] = r.z;
      rayasPos[k + 3] = rayasPos[k];
      rayasPos[k + 4] = rayasPos[k + 1];
      rayasPos[k + 5] = r.z - largo * r.v;
    }
    rayasGeo.attributes.position.needsUpdate = true;
    // las rayas pasan del blanco al color del planeta
    rayasMaterial.color.copy(salto.blanco).lerp(salto.color, limitar(aceleracion * 1.3, 0, 1));

    estrellas.material.opacity = 0.85 * (1 - aceleracion);

    if (t >= 1 && salto.resolver) {
      const listo = salto.resolver;
      salto.resolver = null;
      listo();
    }
  }

  const api = {
    // elige un planeta (la nave gira hacia él)
    elegir: function (i, instante) { if (!salto) apuntar(i, instante); },

    // despega hacia el planeta i; devuelve una promesa que se cumple cuando hay que abrir el juego
    hiperespacio: function (i) {
      apuntar(i, false, true);
      return new Promise(function (resolver) {
        if (reducido) { resolver(); return; } // sin animaciones: se abre directo
        salto = {
          t: 0, velocidad: 0, indice: i, resolver: resolver, fovInicial: camara.fov,
          inicio: miNave.nave.position.clone(),
          color: mundos[i].color.clone(), blanco: new THREE.Color(0xdff3ff)
        };
        etiquetas.forEach(function (e) { e.classList.remove('arcade__etiqueta--activa'); });
      });
    },

    // por si la página se queda abierta y se regresa con el botón "atrás"
    destruir: function () {
      cancelAnimationFrame(animacion);
      observador.disconnect();
      renderizador.dispose();
    }
  };

  // dibujo solo cuando la escena se ve en pantalla (ahorra batería)
  new IntersectionObserver(function (entradas) {
    enPantalla = entradas[0].isIntersecting;
    visible = enPantalla && pestanaVisible;
    ultimo = performance.now();
  }).observe(contenedor);
  document.addEventListener('visibilitychange', function () {
    pestanaVisible = !document.hidden;
    visible = enPantalla && pestanaVisible;
    ultimo = performance.now();
  });

  animacion = requestAnimationFrame(cuadro);
  return api;
}
