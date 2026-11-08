/* =========================================================
   GALAXY INVASION — config.js
   Todos los números del juego en un solo lugar.
   Si quieres balancear el juego (más difícil, más fácil,
   más rápido...), cambia los valores aquí y recarga.
   Unidades: metros, segundos, puntos de vida.
   ========================================================= */

export const CONFIG = {
  version: '0.5',

  /* ---------- Jugador (Rosa Méndez) ---------- */
  jugador: {
    altura: 1.65,             // altura de los ojos (m)
    radio: 0.4,               // grosor para chocar con paredes (m)
    velocidad: 6,             // caminar (m/s)
    velocidadCorrer: 9.5,     // correr con Shift (m/s)
    velocidadApuntando: 3.5,  // moverse mientras apuntas (m/s)
    aceleracion: 26,          // qué tan rápido arranca (v0.8: más suave, con peso)
    frenado: 38,              // qué tan rápido frena al soltar las teclas
    fuerzaSalto: 7,           // impulso hacia arriba al saltar
    gravedad: 22,             // qué tan rápido cae
    vidaMax: 100,
    escudoMax: 50,
    escudoEspera: 4,          // segundos sin recibir daño para que el escudo empiece a recargar
    escudoRecarga: 15,        // puntos de escudo por segundo
    fov: 75,                  // campo de visión normal (grados)
    fovApuntar: 52,           // campo de visión al apuntar (zoom); cada arma puede cambiarlo
    sensibilidadMouse: 0.0022,
    // Si el navegador no deja atrapar el mouse: al llevar la flecha al borde, sigue girando
    giroBorde: 2.4,        // radianes por segundo en el borde
    zonaBorde: 0.1,        // 10% del ancho de la pantalla a cada lado
    sensibilidadTactil: 0.0055,
    factorSensibilidadApuntando: 0.6,
    pitchMax: 1.45,           // cuánto puede mirar arriba/abajo (radianes)
    distanciaPaso: 2.2,       // metros entre sonidos de pasos
    lentitudBaba: 0.5         // en un charco de baba caminas a la mitad
  },

  /* ---------- Armas ----------
     danio = daño por bala (la escopeta dispara varios perdigones)
     cadencia = segundos entre disparos
     municion = qué tipo de munición usa (cartuchos o balas) */
  armas: {
    escopeta: {
      nombre: 'Escopeta vieja',
      municion: 'cartuchos',
      danio: 11,                // por perdigón
      perdigones: 8,
      cadencia: 0.32,
      cargador: 2,              // doble cañón
      recarga: 1.6,
      alcance: 40,
      caidaDesde: 10,           // a partir de aquí el daño baja
      caidaHasta: 30,           // aquí el daño queda al 40 %
      dispersion: 0.075,
      dispersionApuntando: 0.05,
      dispersionMoviendo: 0.02,
      retroceso: 0.09,
      fovApuntar: 60
    },
    pistola: {
      nombre: 'Pistola M9',
      municion: 'balas',
      danio: 25,
      perdigones: 1,
      cadencia: 0.22,
      cargador: 12,
      recarga: 1.3,
      alcance: 90,
      dispersion: 0.022,
      dispersionApuntando: 0.004,
      dispersionMoviendo: 0.02,
      retroceso: 0.03,
      fovApuntar: 52
    },
    rifle: {
      nombre: 'Rifle de caza',
      municion: 'balas',
      danio: 70,
      perdigones: 1,
      cadencia: 0.9,
      cargador: 5,
      recarga: 2.2,
      alcance: 150,
      dispersion: 0.035,
      dispersionApuntando: 0.0006,
      dispersionMoviendo: 0.03,
      retroceso: 0.12,
      fovApuntar: 28
    }
  },

  /* Munición: cuánta tienes al empezar y el máximo que puedes cargar */
  municion: {
    cartuchos: { inicial: 16, maximo: 40, nombre: 'cartuchos' },
    balas: { inicial: 36, maximo: 150, nombre: 'balas' }
  },
  maxArmas: 3,

  /* ---------- Rareza de las armas ----------
     probabilidad: qué tan seguido sale en un cofre (suman 1)
     danio, recarga, cadencia: multiplicadores; cargador: multiplicador redondeado */
  rarezas: {
    comun:      { nombre: 'Común',      probabilidad: 0.55, danio: 1.0,  recarga: 1.0,  cadencia: 1.0,  cargador: 1.0, color: '#a39dcf' },
    rara:       { nombre: 'Rara',       probabilidad: 0.30, danio: 1.15, recarga: 0.95, cadencia: 1.0,  cargador: 1.0, color: '#4da3ff' },
    epica:      { nombre: 'Épica',      probabilidad: 0.12, danio: 1.3,  recarga: 0.85, cadencia: 0.95, cargador: 1.25, color: '#b36bff' },
    legendaria: { nombre: 'Legendaria', probabilidad: 0.03, danio: 1.5,  recarga: 0.75, cadencia: 0.85, cargador: 1.5, color: '#ffc65c' }
  },

  /* ---------- Enemigos ---------- */
  enemigos: {
    zangano: {
      nombre: 'Zángano',
      vida: 50,
      velocidad: 4.6,
      danio: 10,
      rangoAtaque: 1.8,         // distancia a la que muerde (m)
      preparacionAtaque: 0.35,  // tiempo de aviso antes del mordisco (s)
      esperaAtaque: 1.1,        // tiempo entre mordiscos (s)
      radio: 0.55,
      tiempoAparicion: 0.8,     // tarda esto en salir del suelo (s)
      probabilidadSoltarMunicion: 0.08 // 8 %: los aliens normales casi nunca sueltan cosas
    },
    babosito: {
      nombre: 'Babosito',
      vida: 40,
      velocidad: 5.2,
      danio: 8,
      rangoAtaque: 1.6,
      preparacionAtaque: 0.3,
      esperaAtaque: 1.0,
      radio: 0.5,
      tiempoAparicion: 0.7,
      probabilidadSoltarMunicion: 0.08,
      charcoAlMorir: 1.3,       // radio del charco que deja al morir (m)
      duracionCharco: 6
    },
    baboson: {
      nombre: 'Babosón',
      vida: 240,
      velocidad: 2.3,
      danio: 20,                // golpe de cerca
      rangoAtaque: 2.8,
      preparacionAtaque: 0.6,
      esperaAtaque: 1.8,
      radio: 1.2,
      tiempoAparicion: 1.2,
      probabilidadSoltarMunicion: 0.5,
      // Escupitajo de baba (ataque a distancia)
      escupeDesde: 6,           // distancia mínima para escupir (m)
      escupeHasta: 26,          // distancia máxima (m)
      esperaEscupir: 3.2,       // segundos entre escupitajos
      velocidadEscupitajo: 15,
      danioEscupitajo: 15,
      radioImpacto: 1.4,
      charcoEscupitajo: 2.0,
      duracionCharco: 7
    },
    minizangano: {
      nombre: 'Mini zángano',
      vida: 25,
      velocidad: 6.2,
      danio: 6,
      rangoAtaque: 1.3,
      preparacionAtaque: 0.25,
      esperaAtaque: 0.9,
      radio: 0.35,
      tiempoAparicion: 0.5,
      probabilidadSoltarMunicion: 0.05,
      escala: 0.6                // tamaño comparado con el Zángano normal
    },

    /* ----- JEFE de la granja: Bestia de Heno ----- */
    bestia: {
      nombre: 'Bestia de Heno',
      vida: 1400,
      velocidad: 3.4,
      radio: 2.2,
      rangoAtaque: 3,
      tiempoAparicion: 3,        // tarda esto en levantarse de la pila de pacas
      danioCuerpo: 0.08,         // el heno solo recibe el 8 % del daño
      multiplicadorNucleo: 1.5,  // el núcleo recibe 150 % del daño
      duracionFuego: 6,          // segundos quemándose después de una explosión
      danioFuego: 20,            // daño por segundo mientras se quema
      refuerzos: 3,              // Babositos que llama al 60 % y al 30 % de vida
      // Golpe al suelo (onda de choque: se esquiva saltando)
      rangoGolpe: 7, preparacionGolpe: 0.9, radioOnda: 9, danioOnda: 25, esperaGolpe: 5,
      // Lanzar pacas
      tiempoPaca: 1.3, danioPaca: 20, radioPaca: 2.2, esperaPaca: 4,
      // Embestida: después queda aturdida con el núcleo expuesto
      preparacionEmbestida: 1.1, velocidadEmbestida: 15, duracionEmbestida: 2.2, danioEmbestida: 30,
      aturdida: 3, aturdidaChoque: 4.5, esperaEmbestida: 9,
      probabilidadSoltarMunicion: 0
    },

    /* ----- Aliens de la ciudad ----- */
    soldadoAlien: {
      nombre: 'Soldado alien',
      vida: 90,
      velocidad: 3.6,
      danio: 12,                 // golpe de cerca
      rangoAtaque: 1.8,
      preparacionAtaque: 0.35,
      esperaAtaque: 1.2,
      radio: 0.45,
      tiempoAparicion: 0.8,
      probabilidadSoltarMunicion: 0.15,
      // Disparo de plasma (en línea recta: las paredes y autos lo detienen)
      distanciaIdeal: 14,        // trata de quedarse a esta distancia
      alcanceDisparo: 32,
      esperaDisparo: 1.8,
      preparacionDisparo: 0.5,   // brilla el arma antes de disparar (aviso)
      velocidadPlasma: 24,
      danioPlasma: 10
    },
    bruto: {
      nombre: 'Bruto',
      vida: 480,
      velocidad: 2.2,
      danio: 28,
      rangoAtaque: 2.6,
      preparacionAtaque: 0.7,
      esperaAtaque: 1.6,
      radio: 1.0,
      tiempoAparicion: 1.2,
      probabilidadSoltarMunicion: 0.6,
      // Carga: corre hacia Rosa en línea recta
      distanciaCarga: 16, preparacionCarga: 0.9, velocidadCarga: 13, duracionCarga: 1.4, esperaCarga: 6, danioCarga: 25
    },

    /* ----- JEFE de la carretera: el Lanzador ----- */
    lanzador: {
      nombre: 'El Lanzador',
      vida: 1500,                // la barra: 3 sacos + la cabeza
      vidaSaco: 260,             // cada uno de los 3 sacos de baba
      vidaCabeza: 720,
      velocidad: 2.6,
      radio: 2.6,
      rangoAtaque: 5,
      tiempoAparicion: 2,
      danioCuerpo: 0,            // la piel de roca no recibe daño
      // Mientras manejas: camina por el campo y te lanza cosas
      esperaLanzarManejando: 2.8,
      // En la pelea
      esperaRoca: 3.2, tiempoRoca: 1.4, danioRoca: 25, radioRoca: 2.8,
      rangoPisoton: 9, preparacionPisoton: 1.0, radioOnda: 12, danioOnda: 22, esperaPisoton: 6,
      esperaCria: 9, criasPorVez: 3,     // mini zánganos que salen de su espalda
      premio: ['epica', 'legendaria'],
      probabilidadSoltarMunicion: 0
    },

    /* ----- JEFE de la ciudad: el Guardián de la nave ----- */
    guardian: {
      nombre: 'Guardián de la nave',
      vida: 2400,
      velocidad: 1.6,
      radio: 2.5,
      rangoAtaque: 5,
      tiempoAparicion: 3,
      vidaGenerador: 300,        // cada uno de los 3 generadores del escudo
      vidaGeneradorFase2: 220,   // al 50 % de vida los generadores vuelven a subir
      multiplicadorNucleo: 1.2,
      radioPlaza: 16,            // no se aleja más que esto del centro de la plaza
      // Orbes de plasma (en arco, con aviso en el suelo)
      esperaOrbes: 3.5, orbesPorVez: 3, tiempoOrbe: 1.6, danioOrbe: 18, radioOrbe: 2.4,
      // Láser (solo sin escudo): carga, aviso en el suelo y barrido
      esperaLaser: 7, cargaLaser: 1.3, duracionLaser: 1.4, danioLaser: 35, anchoLaser: 1.6, largoLaser: 45,
      // Pisotón
      rangoPisoton: 8, preparacionPisoton: 0.9, radioOnda: 11, danioOnda: 22, esperaPisoton: 6,
      esperaRefuerzos: 12,
      premio: ['legendaria'],
      probabilidadSoltarMunicion: 0
    },
    // v0.8: Nido de la Colmena (misión extra de la granja). No se mueve; hace nacer Babositos
    nido: {
      nombre: 'Nido de la Colmena',
      vida: 280,
      velocidad: 0,
      radio: 1.6,
      rangoAtaque: 0,
      tiempoAparicion: 1.6,
      distanciaActiva: 42,      // si estás más cerca que esto, empieza a hacer nacer Babositos
      intervaloCria: 5,         // segundos entre cada Babosito
      maxCrias: 3,              // máximo de sus Babositos vivos a la vez
      probabilidadSoltarMunicion: 0.7
    },
    // Etapa 4 (v0.7): el Capitán de la nave. Flota, se teletransporta y
    // solo se le puede herir de verdad cuando la gema del pecho brilla.
    capitan: {
      nombre: 'El Capitán',
      vida: 2600,
      velocidad: 3.2,
      radio: 1.1,
      rangoAtaque: 3,
      tiempoAparicion: 2.5,
      danioCuerpo: 0.2,          // la armadura deja pasar solo el 20 % del daño
      multiplicadorGema: 1.6,    // la gema (cuando brilla) recibe 160 %
      tiempoGemaAbierta: 3.0,    // segundos que brilla la gema después de un ataque fuerte
      // Ráfaga de plasma (en línea recta, las columnas la detienen)
      esperaRafaga: 2.6, disparosRafaga: 5, entreDisparos: 0.18, velocidadPlasma: 26, danioPlasma: 9,
      // Teletransporte
      esperaTeleport: 6, duracionTeleport: 0.7,
      // Embestida de energía (deja la gema abierta al terminar)
      esperaEmbestida: 7, preparacionEmbestida: 0.8, velocidadEmbestida: 22, duracionEmbestida: 0.9, danioEmbestida: 28,
      // Fase 2 (menos del 50 %): lluvia de orbes en arco y refuerzos
      esperaLluvia: 5.5, orbesLluvia: 6, tiempoOrbe: 1.5, danioOrbe: 16, radioOrbe: 2.2,
      esperaRefuerzos: 14,
      premio: ['legendaria'],
      probabilidadSoltarMunicion: 0
    }
  },

  /* ---------- La camioneta ---------- */
  vehiculo: {
    velocidadMax: 26,          // m/s (unos 95 km/h)
    reversaMax: 8,
    aceleracion: 11,
    frenado: 26,
    friccion: 4,               // frena sola si no aceleras
    // Dirección (v0.8): gira como un carro real, más cerrado cuando vas despacio
    anguloRuedas: 0.62,        // cuánto giran las llantas de adelante (radianes) con el volante a fondo
    distanciaEjes: 2.7,        // metros entre las llantas de adelante y las de atrás
    rapidezVolante: 6,         // qué tan rápido se mueve el volante (más = más brusco)
    giroMax: 2.2,              // giro máximo (radianes por segundo)
    agarre: 24,                // a más velocidad, menos giro (para que no gire como trompo)
    radio: 1.5,                // tamaño para chocar
    velocidadParaBajar: 3,     // hay que ir más lento que esto para bajarse
    danioChoque: 1.4,          // daño a Rosa por cada m/s de más al chocar
    velocidadChoqueSinDanio: 9,
    atropelloMinimo: 5,        // velocidad mínima para atropellar
    danioAtropelloGrande: 70   // a aliens grandes (Babosón, Bruto) no los mata de una
  },

  /* ---------- Etapa 2: La carretera ---------- */
  carretera: {
    largo: 900,                // metros de carretera hasta la ciudad
    zMuro: -380,               // dónde estaba el muro de baba (v0.5; desde la v0.6 no sale, queda la zona con cofre y cosas)
    vidaMuro: 400,
    zJefe: -770,               // dónde ataca el Lanzador (salta a la vía y destroza la camioneta)
    distanciaAtaque: 75,       // a cuántos metros antes de zJefe salta desde el maizal
    tiempoSalto: 1.5,          // segundos que dura el salto
    danioAtaque: 12,           // daño a Rosa cuando destroza la camioneta
    esperaBajarse: 1.4,        // segundos hasta que Rosa sale de la camioneta destrozada
    zCiudad: -885,             // entrada de la ciudad (meta)
    vidaObstaculo: 22,         // segundos que dura en la carretera lo que lanza el Lanzador
    grupos: [                  // aliens que esperan en la carretera: [z, cantidad, tipo]
      [-150, 5, 'minizangano'], [-250, 7, 'minizangano'], [-300, 2, 'babosito'], [-400, 6, 'minizangano'],
      [-480, 6, 'minizangano'], [-560, 3, 'babosito'], [-620, 8, 'minizangano'], [-660, 1, 'baboson'],
      // A pie, después del jefe (no salen mientras peleas con él)
      [-835, 5, 'minizangano'], [-860, 2, 'babosito']
    ],
    maxVivos: 9
  },

  /* ---------- Etapa 3: La ciudad ---------- */
  ciudad: {
    largo: 470,
    // Cuántos aliens a la vez y cada cuánto, por tramo (más cerca de la nave = más aliens)
    tramos: [
      { hastaZ: -95,  maxVivos: 5,  intervalo: 2.6, tipos: ['zangano', 'zangano', 'soldadoAlien'] },
      { hastaZ: -210, maxVivos: 7,  intervalo: 2.0, tipos: ['zangano', 'soldadoAlien', 'soldadoAlien', 'minizangano'] },
      { hastaZ: -330, maxVivos: 9,  intervalo: 1.6, tipos: ['zangano', 'soldadoAlien', 'soldadoAlien', 'minizangano', 'bruto'] }
    ],
    cercoRescate: ['soldadoAlien', 'soldadoAlien', 'zangano', 'zangano', 'soldadoAlien', 'zangano'],
    bloqueo: ['bruto', 'soldadoAlien', 'soldadoAlien', 'zangano', 'zangano', 'bruto'],
    distanciaAparicionMin: 22,
    distanciaAparicionMax: 60
  },

  /* ---------- Presentación de monstruos (v0.8) ----------
     La primera vez que un monstruo aparece cerca, el juego se detiene
     unos segundos: la cámara lo muestra formándose y sale su ficha.
     Se guarda cuáles ya viste (datos.bestiario). */
  presentaciones: {
    activa: true,
    distancia: 30,             // a cuántos metros tiene que estar un alien normal
    distanciaJefe: 70,         // y un jefe
    duracion: 4.2,             // segundos (los jefes un poco más)
    duracionJefe: 5.5
  },
  bestiario: {
    babosito:     { clase: 'Alien', descripcion: 'Una bolita de baba que sale de la tierra. Llegan en grupo, rápido, y saltan encima.', consejo: 'No dejes que te rodeen: retrocede y dispara. Al morir dejan un charco que te hace ir lento.' },
    baboson:      { clase: 'Alien', descripcion: 'Un baboso enorme y lento. De lejos escupe baba y de cerca golpea fuerte.', consejo: 'Muévete de lado para esquivar los escupitajos y no pises sus charcos.' },
    minizangano:  { clase: 'Alien', descripcion: 'Un zángano chiquito y veloz. Nunca viene solo: ataca en enjambre.', consejo: 'La escopeta acaba con varios de un solo tiro.' },
    zangano:      { clase: 'Alien', descripcion: 'El soldado más común de la Colmena: sale del suelo, corre hacia ti y muerde.', consejo: 'Cuando brilla está por morder: aléjate un paso y dispara.' },
    soldadoAlien: { clase: 'Alien', descripcion: 'Un soldado con arma de plasma. Prefiere pelear de lejos, a unos 14 metros.', consejo: 'Su arma brilla antes de disparar. El plasma no atraviesa paredes ni autos: cúbrete.' },
    bruto:        { clase: 'Alien', descripcion: 'Un gigante con armadura que embiste en línea recta.', consejo: 'Hazte a un lado cuando cargue: queda aturdido y es tu momento de disparar.' },
    nido:         { clase: 'Nido', descripcion: 'Un capullo vivo de la Colmena. De él nacen Babositos sin parar mientras estés cerca.', consejo: 'Destrúyelo para que dejen de salir. Una granada lo revienta rapidísimo.' },
    bestia:       { clase: 'Jefe', descripcion: 'Las pacas de heno de la granja cobraron vida alrededor de un núcleo alien.', consejo: 'El heno casi no se lastima: quémala con un barril o haz que choque, y dispárale al núcleo.' },
    lanzador:     { clase: 'Jefe', descripcion: 'Un gigante de roca que arranca y lanza todo lo que encuentra.', consejo: 'Revienta los 3 sacos de baba del pecho; después la cabeza recibe daño.' },
    guardian:     { clase: 'Jefe', descripcion: 'El protector de la nave nodriza, cubierto por un escudo de energía.', consejo: 'Rompe los 3 generadores para apagar el escudo y dispárale al núcleo.' },
    capitan:      { clase: 'Jefe', descripcion: 'El que manda la nave nodriza. Flota, se teletransporta y su armadura es casi irrompible.', consejo: 'Dispárale a la gema del pecho cuando brille: justo después de embestir.' }
  },

  /* ---------- Granadas, golpe y mochila (v0.8) ---------- */
  granada: {
    inicial: 2,                // con cuántas empiezas una partida nueva
    maximo: 6,                 // cuántas caben en la mochila
    fuerza: 15,                // velocidad del lanzamiento (m/s)
    fuerzaArriba: 4.5,
    gravedad: 18,
    rebote: 0.35,              // cuánto rebota al tocar el suelo
    mecha: 1.9,                // segundos hasta explotar
    radio: 6.5,                // metros
    danio: 170,                // en el centro (baja con la distancia)
    danioJugador: 30,          // si te agarra muy cerca
    espera: 0.8,               // segundos entre lanzamientos
    probabilidadSoltar: 0.05,  // un alien a veces suelta una granada
    cajaTrae: 2                // una caja de granadas trae 2
  },
  golpe: {
    danio: 45,                 // culatazo
    alcance: 2.7,              // metros
    angulo: 0.55,              // qué tan de frente (1 = justo al frente)
    empuje: 9,                 // los manda para atrás
    espera: 0.65               // segundos entre golpes
  },
  mochila: {
    maxBotiquines: 3,          // si tienes la vida llena, los botiquines van a la mochila
    curaBotiquin: 40           // cuánto cura usar uno (tecla H)
  },

  /* ---------- Etapa 4: La nave nodriza (v0.7) ---------- */
  nave: {
    // Aliens a la vez y cada cuánto, por zona de la nave
    zonas: {
      hangar:  { maxVivos: 3, intervalo: 3.2, tipos: ['zangano', 'minizangano', 'soldadoAlien'] },
      motores: { maxVivos: 6, intervalo: 2.2, tipos: ['zangano', 'soldadoAlien', 'soldadoAlien', 'minizangano', 'bruto'] },
      cabina:  { maxVivos: 0, intervalo: 99, tipos: [] }     // en la cabina solo está el Capitán (y sus refuerzos)
    },
    oleadaArmas: ['soldadoAlien', 'soldadoAlien', 'zangano', 'zangano', 'soldadoAlien', 'bruto', 'zangano'],
    vidaMotor: 380,             // cada uno de los 3 motores
    distanciaAparicionMin: 14,
    distanciaAparicionMax: 45
  },

  /* ---------- Aliados (soldados rescatados) ---------- */
  aliado: {
    velocidad: 6.5,
    distanciaSeguir: 4,        // se quedan a esta distancia de Rosa
    alcance: 32,
    esperaDisparo: 0.55,
    danio: 14,
    punteria: 0.7              // 70 % de los disparos pegan
  },

  /* ---------- Etapa 1: La granja ---------- */
  granja: {
    limite: 200,                // v0.8: el mapa va de -200 a 200 m (la granja con cerca está en el medio)
    cerca: 95,                  // la cerca de la granja (de -95 a 95 m)
    babositosCorral: 6,         // ataque al corral
    babositosGranero: 5,        // emboscada en el granero
    babosonesGranero: 1,
    maxVivosHuida: 6,           // en la huida a la camioneta
    intervaloHuida: 3.5,        // segundos entre aliens que aparecen en la huida
    babosonesHuida: 1,
    distanciaAparicionMin: 18,  // los aliens no aparecen más cerca que esto
    distanciaAparicionMax: 55,
    intervaloAparicion: 0.9,
    distanciaSalirGranero: 13,  // con las llaves, a esta distancia de la mesa aparece la Bestia
    // La salida: manejando la camioneta, por el portón del norte a la carretera y hacia el este
    porton: { x: 60, z: -90 },
    salidaX: 186                // v0.8: al pasar este punto de la carretera (hacia el este) empieza la Etapa 2
  },

  /* ---------- Minimapa (redondo, gira con Rosa) ---------- */
  minimapa: {
    tamano: 150,               // px en el computador
    tamanoCelular: 100,        // px en el celular
    metros: 45,                // radio que se ve a pie (metros)
    metrosManejando: 95,       // radio que se ve manejando (más lejos, vas rápido)
    cuadrosPorSegundo: 20,     // se redibuja 20 veces por segundo (ahorra batería)
    pixelesPorMetro: 3         // detalle del dibujo del mapa
  },

  /* ---------- Objetos y suministros ---------- */
  objetos: {
    botiquinCura: 40,
    cajaBalas: 24,
    cajaCartuchos: 10,
    municionAlien: 12,          // balas que suelta un alien (cuando suelta algo)
    cartuchosAlien: 4,
    radioRecoger: 1.4,          // distancia para recoger tocando (m)
    cofreCura: 30,
    vidaBarril: 20,             // daño que aguanta un barril antes de explotar
    radioExplosion: 4.5,        // metros
    danioExplosion: 150,        // a los aliens (menos mientras más lejos)
    danioExplosionJugador: 35,  // a Rosa si está muy cerca
    distanciaUsar: 2.6,         // distancia para abrir un cofre o usar algo (m)
    distanciaSubir: 4.2         // distancia para subir a la camioneta (m)
  },

  /* ---------- Ayuda al apuntar (solo celular) ---------- */
  ayudaApuntado: {
    angulo: 0.13,               // qué tan cerca de la mira debe estar el alien (radianes)
    fuerza: 3.0,                // qué tan fuerte jala la mira
    distanciaMax: 40
  },

  /* ---------- Calidad gráfica ----------
     luces: focos que alumbran alrededor (porche, granero). Son lo que más
     cuesta en el celular, así que en "baja" se apagan. */
  graficos: {
    baja:  { escalaPixeles: 0.6, niebla: 1.3, particulas: 0.5, humo: 3, maiz: 0.5, luces: false },
    media: { escalaPixeles: 1.0, niebla: 1.0, particulas: 0.8, humo: 6, maiz: 0.8, luces: true },
    alta:  { escalaPixeles: 2.0, niebla: 0.8, particulas: 1.0, humo: 10, maiz: 1.0, luces: true }
  },

  /* ---------- Audio ---------- */
  audio: {
    volumenMusica: 0.5,
    volumenEfectos: 0.8,
    // Cuando tengas tus propios sonidos, ponlos en la carpeta "sonidos/"
    // con los nombres de la Guía de sonidos y cambia esto a true.
    usarArchivos: false,
    carpeta: '../sonidos/',      // relativo a html/index.html
    bpmCombate: 124
  },

  /* ---------- Opciones por defecto ---------- */
  opcionesIniciales: {
    musica: 50,         // 0 a 100
    efectos: 80,        // 0 a 100
    sensibilidad: 50,   // 0 a 100 (50 = normal)
    calidad: 'media',
    ayudaApuntado: true,
    mostrarFps: false,
    personaje: 'granjera'   // 'granjera' (Rosa) o 'granjero' (Tomás)
  },

  /* ---------- Protagonista (v0.6.2): granjera o granjero ----------
     Rosa y Tomás son hermanos: la Colmena secuestra al que NO
     escogiste (escena al empezar la granja) y la historia es ir a
     rescatarlo. Los textos usan estas palabras con {llaves}:
     {nombre}, {completo}, {tipo}, {Un}, {trato}  -> el que juegas
     {pareja}, {PAREJA}, {NOMBRE}, {tuPariente}, {suPariente}
       -> "Tomás", "TOMÁS", "ROSA", "tu hermano Tomás", "su hermano Tomás"
     pariente: cómo se le dice a este personaje siendo el hermano.
     manga / guante: colores de los brazos en primera persona
     sombrero: color de su sombrero (la pista de la nave, v0.7) */
  personajes: {
    granjera: { nombre: 'Rosa', completo: 'Rosa Méndez', tipo: 'granjera', Un: 'Una', trato: 'señora', pariente: 'hermana', otro: 'granjero', manga: 0x8a2b2b, guante: 0x5a3a22, sombrero: 0xb08a4a },
    granjero: { nombre: 'Tomás', completo: 'Tomás Méndez', tipo: 'granjero', Un: 'Un', trato: 'señor', pariente: 'hermano', otro: 'granjera', manga: 0x2f5a8a, guante: 0x3e2a1a, sombrero: 0x8a6a3a }
  },

  /* ---------- Escena del secuestro (al empezar la granja) ---------- */
  cinematica: {
    activa: true,               // false = empezar la granja sin la escena
    casa: { x: -25, z: 22 },    // puerta de la casa (sale el personaje que juegas)
    victima: { x: -17, z: 7 },  // donde está el hermano cuando llega el platillo
    alturaPlatillo: 20          // a qué altura se queda mientras se lo lleva
  },

  /* ---------- Logros ---------- */
  logros: [
    { id: 'primer_contacto',     nombre: 'Primer contacto',      descripcion: 'Elimina a tu primer alien.' },
    { id: 'saqueador',           nombre: 'Saqueador',            descripcion: 'Abre tu primer cofre.' },
    { id: 'fuera_de_mi_granja',  nombre: 'Fuera de mi granja',   descripcion: 'Termina la Etapa 1: La granja.' },
    { id: 'limpieza_de_baba',    nombre: 'Limpieza de baba',     descripcion: 'Elimina 30 babosos (se suman entre partidas).', meta: 30 },
    { id: 'bestia_de_heno',      nombre: 'Hecha paja',           descripcion: 'Derrota a la Bestia de Heno.' },
    { id: 'fuego_al_heno',       nombre: 'Fuego al heno',        descripcion: 'Vence a la Bestia de Heno después de quemarla con un barril.' },
    { id: 'escopetazo',          nombre: 'Escopetazo',           descripcion: 'Elimina 2 babosos con un solo disparo de escopeta.' },
    { id: 'coleccionista',       nombre: 'Coleccionista',        descripcion: 'Consigue un arma legendaria.' },
    { id: 'exterminador',        nombre: 'Exterminador',         descripcion: 'Elimina 25 zánganos (se suman entre partidas).', meta: 25 },
    { id: 'en_la_carretera',     nombre: 'En la carretera',      descripcion: 'Termina la Etapa 2: La carretera.' },
    { id: 'lanzador',            nombre: 'Atrapa esto',          descripcion: 'Derrota al Lanzador.' },
    { id: 'atropellador',        nombre: 'Al volante',           descripcion: 'Atropella 15 aliens con la camioneta (se suman entre partidas).', meta: 15 },
    { id: 'nadie_atras',         nombre: 'Nadie se queda atrás', descripcion: 'Rescata a los soldados atrapados en la ciudad.' },
    { id: 'guardian',            nombre: 'Escudo roto',          descripcion: 'Derrota al Guardián de la nave.' },
    { id: 'ciudad_liberada',     nombre: 'Rumbo a la nave',      descripcion: 'Termina la Etapa 3: La ciudad.' },
    { id: 'buen_vecino',         nombre: 'Buen vecino',          descripcion: 'Rescata a los Ortiz de su granero.' },
    { id: 'sin_nidos',           nombre: 'Sin nidos',            descripcion: 'Destruye los 3 nidos de la Colmena en los alrededores de la granja.' },
    { id: 'buscador',            nombre: 'Buscador',             descripcion: 'Encuentra los 3 cofres escondidos de la granja.' },
    { id: 'alrededores',         nombre: 'Conoces San Isidro',   descripcion: 'Completa todas las misiones extra de la granja.' },
    { id: 'bombazo',             nombre: '¡Bombazo!',            descripcion: 'Elimina 3 aliens con una sola granada.' },
    { id: 'culatazo',            nombre: 'Culatazo',             descripcion: 'Elimina un alien de un golpe con el arma.' },
    { id: 'motores_fuera',       nombre: 'Motores fuera',        descripcion: 'Sabotea los 3 motores de la nave nodriza.' },
    { id: 'capitan',             nombre: 'Sin capitán',          descripcion: 'Derrota al Capitán de la nave.' },
    { id: 'rumbo_colmena',       nombre: 'Rumbo a la Colmena',   descripcion: 'Termina la Etapa 4: La nave nodriza.' },
    { id: 'ojo_de_halcon',       nombre: 'Ojo de halcón',        descripcion: 'Termina una etapa con 60 % de puntería o más.', meta: 60 }
  ]
};
