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
   La nave: un platillo volador alienígena (OVNI). El "frente" mira hacia +Z
   (hacia ahí se inclina para apuntar al planeta) y la cúpula queda arriba.
   --------------------------------------------------------- */
function crearNave() {
  const nave = new THREE.Group();
  const modelo = new THREE.Group(); // lo que flota y se balancea
  nave.add(modelo);

  const metal = new THREE.MeshStandardMaterial({ color: 0xcfd8f5, metalness: 0.75, roughness: 0.25 });
  const oscuro = new THREE.MeshStandardMaterial({ color: 0x2b3f86, metalness: 0.6, roughness: 0.35 });
  const verde = new THREE.MeshStandardMaterial({ color: 0x6be58a, metalness: 0.1, roughness: 0.45, emissive: 0x1e8a3c, emissiveIntensity: 0.55 });

  // casco: dos conos achatados pegados (la forma clásica de platillo), torneados
  const perfil = new THREE.SplineCurve([
    new THREE.Vector2(0.01, -0.55), new THREE.Vector2(0.7, -0.5), new THREE.Vector2(1.45, -0.28),
    new THREE.Vector2(2.05, -0.02), new THREE.Vector2(1.5, 0.2), new THREE.Vector2(0.8, 0.32),
    new THREE.Vector2(0.01, 0.34)
  ]).getPoints(48);
  modelo.add(new THREE.Mesh(new THREE.LatheGeometry(perfil, 48), metal));

  // franja oscura alrededor del borde
  const borde = new THREE.Mesh(new THREE.TorusGeometry(2.0, 0.09, 12, 64), oscuro);
  borde.rotation.x = Math.PI / 2;
  borde.position.y = -0.03;
  modelo.add(borde);

  // cúpula de vidrio (celeste, medio transparente)
  const cupula = new THREE.Mesh(
    new THREE.SphereGeometry(0.86, 32, 20, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x8fdbff, metalness: 0.1, roughness: 0.08, transparent: true, opacity: 0.55, emissive: 0x0a5f8c, emissiveIntensity: 0.35 })
  );
  cupula.position.y = 0.3;
  modelo.add(cupula);

  // el alienígena que va adentro: cabecita verde con dos ojos grandes
  const cabeza = new THREE.Mesh(new THREE.SphereGeometry(0.36, 24, 18), verde);
  cabeza.scale.set(1, 1.12, 1);
  cabeza.position.set(0, 0.62, 0);
  modelo.add(cabeza);
  const ojoMaterial = new THREE.MeshBasicMaterial({ color: 0x0b1030 });
  [-0.14, 0.14].forEach(function (x) {
    const ojo = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 10), ojoMaterial);
    ojo.scale.set(0.8, 1.35, 0.5);
    ojo.position.set(x, 0.68, 0.31);
    ojo.rotation.z = x < 0 ? 0.35 : -0.35;
    modelo.add(ojo);
  });

  // lucecitas que giran alrededor del borde
  const anillo = new THREE.Group();
  const colores = [0x29b6f6, 0xb9a4ff, 0x6be58a, 0xffffff];
  for (let i = 0; i < 12; i++) {
    const ang = (i / 12) * Math.PI * 2;
    const luzPunto = new THREE.Mesh(
      new THREE.SphereGeometry(0.085, 10, 8),
      new THREE.MeshBasicMaterial({ color: colores[i % colores.length] })
    );
    luzPunto.position.set(Math.cos(ang) * 1.78, -0.12, Math.sin(ang) * 1.78);
    anillo.add(luzPunto);
  }
  modelo.add(anillo);

  // fuego (rayo propulsor) hacia atrás (-Z): ahora en celeste y morado, y titila
  const fuego = new THREE.Group();
  fuego.position.z = -1.9;
  const conoGeo = new THREE.ConeGeometry(0.5, 2.4, 20, 1, true);
  conoGeo.translate(0, -1.2, 0);
  conoGeo.rotateX(-Math.PI / 2);
  const fuegoExterior = new THREE.Mesh(conoGeo, new THREE.MeshBasicMaterial({
    color: 0x6d5cff, transparent: true, opacity: 0.65, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
  }));
  const interior = new THREE.Mesh(conoGeo, new THREE.MeshBasicMaterial({
    color: 0x9ff0ff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
  }));
  interior.scale.set(0.5, 0.5, 0.6);
  fuego.add(fuegoExterior, interior);
  modelo.add(fuego);

  // luz del motor
  const luz = new THREE.PointLight(0x7aa8ff, 8, 9, 2);
  luz.position.z = -2.4;
  modelo.add(luz);

  return { nave: nave, modelo: modelo, fuego: fuego, luz: luz, anillo: anillo };
}

/* ---------------------------------------------------------
   Los planetas
   --------------------------------------------------------- */
export const PLANETAS = {
  // Galaxy Gol: un planeta-cancha de fútbol
  gol: {
    radio: 2.7,
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
    radio: 2.0,
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

  // Galaxy Invasion: un planeta rojo de lava con un OVNI dándole vueltas
  invasion: {
    radio: 2.6,
    crear: function (grupo, brillo) {
      const textura = texturaDibujada(1024, 512, function (c, w, h) {
        const g = c.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, '#5a1d1a'); g.addColorStop(0.5, '#8f3324'); g.addColorStop(1, '#4a1614');
        c.fillStyle = g; c.fillRect(0, 0, w, h);
        for (let i = 0; i < 700; i++) { // manchas de roca
          c.fillStyle = 'rgba(' + (40 + Math.random() * 90) + ',' + (10 + Math.random() * 30) + ',10,0.16)';
          c.beginPath(); c.arc(Math.random() * w, Math.random() * h, 2 + Math.random() * 16, 0, 6.28); c.fill();
        }
        c.shadowColor = '#ff7a1a'; c.shadowBlur = 14; // grietas de lava
        c.strokeStyle = 'rgba(255,176,64,0.95)'; c.lineCap = 'round';
        for (let i = 0; i < 30; i++) {
          let x = Math.random() * w, y = Math.random() * h;
          c.lineWidth = 2 + Math.random() * 3;
          c.beginPath(); c.moveTo(x, y);
          for (let k = 0; k < 9; k++) { x += (Math.random() - 0.5) * 80; y += (Math.random() - 0.5) * 60; c.lineTo(x, y); }
          c.stroke();
        }
        c.shadowBlur = 0;
        for (let i = 0; i < 22; i++) { // cráteres
          const x = Math.random() * w, y = h * (0.15 + Math.random() * 0.7), r = 12 + Math.random() * 40;
          c.fillStyle = 'rgba(25,6,4,0.55)'; c.beginPath(); c.arc(x, y, r, 0, 6.28); c.fill();
        }
      });
      const esfera = new THREE.Mesh(
        new THREE.SphereGeometry(1, 64, 40),
        new THREE.MeshStandardMaterial({ map: textura, roughness: 0.9, metalness: 0, emissive: 0xff5a1a, emissiveMap: textura, emissiveIntensity: 0.28 })
      );
      grupo.add(esfera);

      // el OVNI: plato metálico, cúpula verde y lucecitas
      const ovni = new THREE.Group();
      const plato = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 14), new THREE.MeshStandardMaterial({ color: 0xc2cce0, metalness: 0.85, roughness: 0.28 }));
      plato.scale.set(0.34, 0.085, 0.34);
      const cupula = new THREE.Mesh(
        new THREE.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshStandardMaterial({ color: 0x7dffa0, emissive: 0x2cff6b, emissiveIntensity: 0.9, transparent: true, opacity: 0.88 })
      );
      cupula.scale.set(0.16, 0.15, 0.16); cupula.position.y = 0.045;
      ovni.add(plato, cupula);
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * Math.PI * 2;
        const luz = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), new THREE.MeshBasicMaterial({ color: i % 2 ? 0x9dffb0 : 0xfff2a0 }));
        luz.position.set(Math.cos(a) * 0.3, -0.005, Math.sin(a) * 0.3);
        ovni.add(luz);
      }
      grupo.add(ovni);
      return { girar: esfera, luna: ovni, lunaRadio: 1.7, lunaVel: 1.1 };
    }
  },

  // Galaxy War: un planeta partido en dos bandos (azul y rojo) con un anillo y dos naves
  war: {
    radio: 2.4,
    crear: function (grupo, brillo) {
      const textura = texturaDibujada(1024, 512, function (c, w, h) {
        const g1 = c.createLinearGradient(0, 0, 0, h);
        g1.addColorStop(0, '#2c63d8'); g1.addColorStop(1, '#183a8f');
        c.fillStyle = g1; c.fillRect(0, 0, w / 2, h);
        const g2 = c.createLinearGradient(0, 0, 0, h);
        g2.addColorStop(0, '#c9374a'); g2.addColorStop(1, '#7c1a2a');
        c.fillStyle = g2; c.fillRect(w / 2, 0, w / 2, h);
        c.strokeStyle = 'rgba(255,255,255,0.16)'; c.lineWidth = 2; // paneles
        for (let x = 0; x <= w; x += 64) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
        for (let y = 0; y <= h; y += 64) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
        for (let i = 0; i < 160; i++) { // luces de las bases
          c.fillStyle = Math.random() < 0.5 ? 'rgba(190,225,255,0.85)' : 'rgba(255,235,160,0.85)';
          c.fillRect(Math.random() * w, Math.random() * h, 3, 3);
        }
        c.fillStyle = 'rgba(255,255,255,0.55)'; // la línea del frente de batalla
        c.fillRect(w / 2 - 3, 0, 6, h); c.fillRect(0, 0, 4, h);
      });
      const esfera = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 40), new THREE.MeshStandardMaterial({ map: textura, roughness: 0.5, metalness: 0.35 }));
      esfera.rotation.y = -Math.PI / 2 + 0.5;
      grupo.add(esfera);

      const inclinado = new THREE.Group(); // anillo metálico inclinado
      inclinado.rotation.set(-1.18, 0, 0.28);
      inclinado.add(new THREE.Mesh(
        new THREE.RingGeometry(1.3, 1.66, 96, 1),
        new THREE.MeshStandardMaterial({ color: 0xaab6d6, metalness: 0.7, roughness: 0.3, side: THREE.DoubleSide, transparent: true, opacity: 0.8 })
      ));
      grupo.add(inclinado);

      // dos naves en formación (una azul y una roja)
      const naves = new THREE.Group();
      [[0x4fa3ff, -0.16], [0xff5a6e, 0.16]].forEach(function (par) {
        const nave = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.26, 8), new THREE.MeshStandardMaterial({ color: par[0], emissive: par[0], emissiveIntensity: 0.7, metalness: 0.4, roughness: 0.4 }));
        nave.rotation.z = -Math.PI / 2;
        nave.position.z = par[1];
        naves.add(nave);
      });
      grupo.add(naves);
      return { girar: esfera, luna: naves, lunaRadio: 1.55, lunaVel: 1.5 };
    }
  },

  // ORBIX: Overdrive: un balón de baloncesto con anillos de neón
  orbix: {
    radio: 2.5,
    crear: function (grupo, brillo) {
      const textura = texturaDibujada(1024, 512, function (c, w, h) {
        const g = c.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, '#f08a3a'); g.addColorStop(0.5, '#e2762b'); g.addColorStop(1, '#bb5a1c');
        c.fillStyle = g; c.fillRect(0, 0, w, h);
        for (let i = 0; i < 3000; i++) { // textura rugosa del balón
          c.fillStyle = 'rgba(0,0,0,' + (Math.random() * 0.12) + ')';
          c.fillRect(Math.random() * w, Math.random() * h, 2, 2);
        }
        c.strokeStyle = '#1a0f0a'; c.lineWidth = 9; c.lineCap = 'round';
        c.beginPath(); c.moveTo(0, h / 2); c.lineTo(w, h / 2); c.stroke();                     // costura del ecuador
        [0.25, 0.75].forEach(function (k) { c.beginPath(); c.moveTo(w * k, 0); c.lineTo(w * k, h); c.stroke(); }); // costuras verticales
        [0.5, 1.0, 0.0].forEach(function (k) {                                                     // costuras curvas
          [-1, 1].forEach(function (lado) {
            c.beginPath();
            for (let y = 0; y <= h; y += 8) {
              const x = w * k + lado * Math.sin(Math.PI * y / h) * w * 0.085 + lado * w * 0.01;
              if (y === 0) c.moveTo(x, y); else c.lineTo(x, y);
            }
            c.stroke();
          });
        });
      });
      const esfera = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 40), new THREE.MeshStandardMaterial({ map: textura, roughness: 0.72, metalness: 0.02 }));
      esfera.rotation.y = 0.4;
      grupo.add(esfera);

      // anillos de neón ("Overdrive")
      [[1.25, 0.3, 0x5ff0ff], [-0.5, -0.9, 0xff7bd8]].forEach(function (a) {
        const aro = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.022, 12, 140), new THREE.MeshBasicMaterial({ color: a[2], transparent: true, opacity: 0.95 }));
        aro.rotation.set(a[0], a[1], 0);
        grupo.add(aro);
      });
      const orbe = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), new THREE.MeshBasicMaterial({ color: 0xfff07a }));
      grupo.add(orbe);
      return { girar: esfera, luna: orbe, lunaRadio: 1.5, lunaVel: 1.7 };
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
  miNave.nave.scale.setScalar(1.0);
  escena.add(miNave.nave);
  const mirada = new THREE.Object3D(); // ayudante para calcular hacia dónde debe mirar la nave
  mirada.position.copy(miNave.nave.position);

  // los 5 planetas, en arco (en V): los de las orillas más cerca, el del centro más lejos
  const POSICIONES = [
    new THREE.Vector3(-16, 0.6, -19),
    new THREE.Vector3(-8, 1.6, -23),
    new THREE.Vector3(0, 2.4, -27),
    new THREE.Vector3(8, 1.6, -23),
    new THREE.Vector3(16, 0.6, -19)
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
    e.className = 'arcade__etiqueta' + (info.proximo ? ' arcade__etiqueta--proximo' : '');
    e.style.setProperty('--color', info.color);
    const nombre = document.createElement('span');
    nombre.className = 'arcade__etiqueta-nombre';
    nombre.textContent = info.nombre;
    e.appendChild(nombre);
    if (info.proximo) {
      const chip = document.createElement('span');
      chip.className = 'arcade__etiqueta-chip';
      chip.textContent = 'Próximamente';
      e.appendChild(chip);
    }
    if (info.corta) {
      const tip = document.createElement('span');
      tip.className = 'arcade__etiqueta-tip';
      tip.textContent = info.corta;
      e.appendChild(tip);
    }
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

  // cuánto se desplaza la cámara hacia el planeta elegido (0 = quieta, se ven los 5 a la vez)
  let PANEO = 0.65;

  function ajustarTamano() {
    ancho = Math.max(1, contenedor.clientWidth);
    alto = Math.max(1, contenedor.clientHeight);
    renderizador.setSize(ancho, alto, false);
    camara.aspect = ancho / alto;
    // en pantallas angostas (celular) abro un poco más la vista para que quepan los 3 planetas
    // el ancho que se ve se mantiene igual aunque el recuadro sea más alto o más angosto (si no, los planetas se cortarían)
    // en pantallas anchas (PC, pantalla completa) caben los 5 planetas a la vez: la cámara no se desplaza
    const ancha = ancho >= 560;
    const mitadAncho = ancha ? 0.86 : 0.62;
    PANEO = ancha ? 0 : 1; // en celular la cámara se centra justo en el planeta elegido
    camara.fov = limitar(2 * Math.atan(mitadAncho / camara.aspect) * 180 / Math.PI, 40, 78);
    camara.updateProjectionMatrix();
  }
  ajustarTamano();
  const observador = new ResizeObserver(ajustarTamano);
  observador.observe(contenedor);

  // la nave gira hacia el planeta elegido
  const adelante = new THREE.Vector3(0, 0, -1);
  const haciaPlaneta = new THREE.Vector3();
  let apuntaCompleto = false;
  // con 5 planetas, la cámara (y la nave) se desplazan de lado hacia el elegido para que siempre se vea bien
  let panX = 0;
  let panMeta = 0;

  // hacia dónde debe mirar la nave (se recalcula cada cuadro porque la nave se desplaza)
  function calcularMeta() {
    // mientras se elige, la nave solo se inclina un poco hacia el planeta (65 %); al despegar apunta de lleno
    haciaPlaneta.copy(mundos[elegido].grupo.position).sub(miNave.nave.position).normalize();
    haciaPlaneta.lerpVectors(adelante, haciaPlaneta, apuntaCompleto ? 1 : 0.65).normalize();
    mirada.position.copy(miNave.nave.position);
    mirada.lookAt(haciaPlaneta.multiplyScalar(10).add(miNave.nave.position)); // en un objeto normal, lookAt apunta su eje +Z (donde está la punta)
    quatMeta.copy(mirada.quaternion);
  }

  function apuntar(i, instante, completo) {
    elegido = i;
    apuntaCompleto = !!completo;
    panMeta = mundos[i].grupo.position.x * PANEO;
    mundos.forEach(function (m, n) {
      m.escalaMeta = n === i ? 1.22 : 1;
      etiquetas[n].classList.toggle('arcade__etiqueta--activa', n === i);
    });
    if (instante) {
      panX = panMeta;
      miNave.nave.position.x = panX * 0.9;
    }
    calcularMeta();
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
    etiquetas.forEach(function (et, n) { et.classList.toggle('arcade__etiqueta--sobre', n === sobre); });
  });
  renderizador.domElement.addEventListener('pointerleave', function () {
    sobre = -1;
    etiquetas.forEach(function (et) { et.classList.remove('arcade__etiqueta--sobre'); });
  });
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
      panMeta = mundos[elegido].grupo.position.x * PANEO;
      panX += (panMeta - panX) * Math.min(1, dt * 3);
      nave.position.x = panX * 0.9;
      calcularMeta();
      nave.quaternion.slerp(quatMeta, Math.min(1, dt * 4.5));
      miNave.modelo.position.y = Math.sin(tiempo * 1.6) * 0.14;
      miNave.modelo.rotation.z = Math.sin(tiempo * 1.1) * 0.05;
    }

    miNave.anillo.rotation.y += dt * 2.2; // las lucecitas del borde giran
    // fuego del motor titilando (más largo durante el salto)
    const fuerza = salto ? 1.4 + salto.velocidad * 1.6 : 1;
    const parpadeo = 0.85 + Math.random() * 0.3;
    miNave.fuego.scale.set(1, 1, fuerza * parpadeo);
    miNave.luz.intensity = (6 + Math.random() * 3) * fuerza;

    // hiperespacio
    if (salto) avanzarSalto(dt);

    // la cámara va un poquito hacia donde apunta la nave
    if (!salto) {
      const vaiven = PANEO > 0 ? 1 : 0; // en pantalla ancha la cámara no se mueve de lado: la escena queda centrada
      camMeta.set(panX + vectorMirada().x * 0.9 * vaiven, camPos.y - vectorMirada().y * 0.25, camPos.z);
      camara.position.lerp(camMeta, Math.min(1, dt * 2.5));
      camara.lookAt(panX + vectorMirada().x * 2.2 * vaiven, 0.8, -12);
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
      // que el globito con la descripción no se salga del recuadro
      const mitad = 112;
      const dx = x - mitad < 6 ? 6 - (x - mitad) : (x + mitad > ancho - 6 ? (ancho - 6) - (x + mitad) : 0);
      etiquetas[n].style.setProperty('--dx', dx.toFixed(0) + 'px');
      etiquetas[n].style.opacity = salto ? String(Math.max(0, 1 - salto.t * 3)) : '';
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
