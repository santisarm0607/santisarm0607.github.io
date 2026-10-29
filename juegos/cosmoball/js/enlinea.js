// =====================================================================
//  🌐 COSMOBALL EN LÍNEA — cada jugador en su propio aparato
//
//  CÓMO FUNCIONA (en sencillo)
//  - Uno CREA una sala: es el "anfitrión". Le sale un código de 4 números.
//  - El otro escribe ese código y se UNE: es el "invitado".
//  - Los dos aparatos se conectan directo entre ellos con WebRTC, usando la
//    librería gratuita PeerJS. El servidor público de PeerJS solo sirve para
//    "presentarlos"; después los datos van de un aparato al otro.
//  - El ANFITRIÓN corre el juego de verdad (pelota, poderes, goles...) y
//    60 veces por segundo le manda al invitado una "foto" de la cancha.
//  - El INVITADO no simula nada: dibuja la foto que le llega y le manda al
//    anfitrión dónde está su nave. Su propia nave se mueve al instante en
//    su pantalla, para que no se sienta retraso.
//  - El anfitrión juega con la nave de la izquierda (p1) y el invitado con
//    la de la derecha (p2).
//
//  MENSAJES (campo "t" de cada mensaje)
//    hola        invitado → anfitrión  nombre, color y nave del invitado
//    bienvenido  anfitrión → invitado  nombre y color del anfitrión
//    llena       anfitrión → invitado  la sala ya tiene 2 jugadores
//    inicio      anfitrión → invitado  empieza una partida (nombres, goles)
//    e           anfitrión → invitado  la "foto" de la cancha (cada cuadro)
//    fin         anfitrión → invitado  terminó la partida (quién ganó)
//    mov         invitado → anfitrión  dónde está la nave del invitado
//    pausa / reanudar / otraVez        el invitado le pide eso al anfitrión
//    ping / pong                       para medir el retraso (ms)
//    adios                             alguien salió de la sala
//
//  PARA PROBAR EN UN SOLO COMPUTADOR (sin internet): abre el juego en dos
//  pestañas con "?red=local" al final de la dirección, por ejemplo
//  html/index.html?red=local. Se conectan entre pestañas del mismo navegador.
//
//  Necesita juego.js (usa sus variables: estado, pelota, p1, p2, etc.).
// =====================================================================

(function () {
  // Librería PeerJS (se descarga solo cuando alguien entra a "En línea")
  const URL_PEERJS = "https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js";
  const PREFIJO = "cosmoball-sala-";     // nombre de la sala en el servidor de PeerJS
  const VERSION_RED = 1;                 // si algún día cambia el formato de los mensajes
  const pruebaLocal = new URLSearchParams(location.search).get("red") === "local";

  let red = null;               // la conexión (PeerJS o la de prueba local)
  let codigo = null;            // los 4 números de la sala
  let rival = null;             // { nombre, color, forma } del otro jugador
  let colorLinea = "#ff3cac";   // mi color
  let golesLinea = 5, contrarrelojLinea = false;   // lo que elige el anfitrión
  let finEnviado = false, finMostrado = false;
  let ultimaYEnviada = null;
  let ultimoMensaje = 0;        // cuándo llegó el último mensaje del rival (para avisar si se cayó)
  let ultimoPing = 0, retraso = null;
  let ocupado = false;          // mientras se conecta, no se puede tocar otra vez
  let antesDeEntrar = null;     // la configuración normal, para devolverla al salir

  const r1 = v => Math.round(v * 10) / 10;      // redondear a 1 decimal (mensajes más livianos)
  const limitar = (v, min, max) => Math.max(min, Math.min(max, v));
  const ahora = () => performance.now();

  // ===================================================================
  //  1. TRANSPORTE: cómo viajan los mensajes
  //  Los dos transportes tienen las mismas funciones:
  //    crear(codigo)  unirse(codigo)  enviar(mensaje)  cerrar()
  //  y avisan con:  alNuevo()  alMensaje(m)  alCerrar()
  // ===================================================================

  // --- Por internet, con PeerJS ---
  function transportePeerJS() {
    let peer = null, conexion = null;
    const t = {};

    function usarConexion(c) {
      conexion = c;
      c.on("data", m => t.alMensaje && t.alMensaje(m));
      c.on("close", () => t.alCerrar && t.alCerrar());
      c.on("error", () => t.alCerrar && t.alCerrar());
    }

    // Anfitrión: abre la sala con el código y espera al invitado
    t.crear = cod => new Promise((listo, falla) => {
      if (peer) peer.destroy();
      let abierta = false;
      peer = new Peer(PREFIJO + cod);
      peer.on("open", () => { abierta = true; listo(); });
      peer.on("error", e => { if (!abierta) falla(e); });
      // si se pierde el contacto con el servidor de PeerJS, se intenta otra vez
      peer.on("disconnected", () => { try { if (!peer.destroyed) peer.reconnect(); } catch (e) {} });
      peer.on("connection", c => {
        if (conexion && conexion.open) {          // ya hay 2 jugadores
          c.on("open", () => { c.send({ t: "llena" }); setTimeout(() => c.close(), 400); });
          return;
        }
        c.on("open", () => { usarConexion(c); t.alNuevo && t.alNuevo(); });
      });
    });

    // Invitado: se conecta a la sala del código
    t.unirse = cod => new Promise((listo, falla) => {
      if (peer) peer.destroy();
      let conectado = false;
      peer = new Peer();
      peer.on("error", e => { if (!conectado) falla(e); else t.alCerrar && t.alCerrar(); });
      peer.on("open", () => {
        const c = peer.connect(PREFIJO + cod, { reliable: true, serialization: "json" });
        c.on("open", () => { conectado = true; usarConexion(c); listo(); });
      });
      setTimeout(() => { if (!conectado) falla({ type: "tiempo" }); }, 15000);
    });

    t.enviar = m => { if (conexion && conexion.open) conexion.send(m); };
    t.cerrar = () => {
      try { if (conexion) conexion.close(); } catch (e) {}
      try { if (peer) peer.destroy(); } catch (e) {}
      conexion = null; peer = null;
    };
    return t;
  }

  // --- Prueba local: entre dos pestañas del mismo navegador (?red=local) ---
  function transporteLocal() {
    const miId = Math.random().toString(36).slice(2);
    let canal = null, conectado = false;
    const t = {};
    const mandar = m => canal && canal.postMessage({ de: miId, m: JSON.parse(JSON.stringify(m)) });

    t.crear = cod => {
      canal = new BroadcastChannel(PREFIJO + cod);
      canal.onmessage = e => {
        if (e.data.de === miId) return;
        const m = e.data.m;
        if (m.t === "__hola") {
          if (conectado) { mandar({ t: "llena" }); return; }
          conectado = true; mandar({ t: "__ok" }); t.alNuevo && t.alNuevo(); return;
        }
        if (conectado) t.alMensaje && t.alMensaje(m);
      };
      return Promise.resolve();
    };
    t.unirse = cod => new Promise((listo, falla) => {
      canal = new BroadcastChannel(PREFIJO + cod);
      canal.onmessage = e => {
        if (e.data.de === miId) return;
        const m = e.data.m;
        if (m.t === "__ok" && !conectado) { conectado = true; listo(); return; }
        if (m.t === "llena" && !conectado) { falla({ type: "llena" }); return; }
        if (conectado) t.alMensaje && t.alMensaje(m);
      };
      mandar({ t: "__hola" });
      setTimeout(() => { if (!conectado) falla({ type: "peer-unavailable" }); }, 1500);
    });
    t.enviar = m => { if (conectado) mandar(m); };
    t.cerrar = () => { if (canal) canal.close(); canal = null; conectado = false; };
    return t;
  }

  // Descarga PeerJS solo la primera vez que se necesita
  function cargarPeerJS() {
    return new Promise((listo, falla) => {
      if (window.Peer) { listo(); return; }
      const s = document.createElement("script");
      s.src = URL_PEERJS;
      s.onload = () => (window.Peer ? listo() : falla({ type: "sin-libreria" }));
      s.onerror = () => falla({ type: "sin-libreria" });
      document.head.appendChild(s);
    });
  }

  async function prepararTransporte() {
    if (red) { red.alCerrar = null; red.cerrar(); }
    if (pruebaLocal) { red = transporteLocal(); return; }
    await cargarPeerJS();
    red = transportePeerJS();
  }

  function enviar(m) { if (red) { try { red.enviar(m); } catch (e) { /* se reintenta en el siguiente cuadro */ } } }

  // Traduce los errores de la conexión a algo entendible
  function textoError(e) {
    const tipo = e && e.type;
    if (tipo === "peer-unavailable") return "No existe una sala con ese código. Revisa los números.";
    if (tipo === "llena") return "Esa sala ya tiene 2 jugadores.";
    if (tipo === "tiempo") return "La sala no respondió. Revisa el código o intenta otra vez.";
    if (tipo === "sin-libreria") return "No se pudo cargar el modo en línea. Revisa tu internet.";
    if (tipo === "browser-incompatible" || tipo === "webrtc") return "Este navegador no permite jugar en línea. Prueba con Chrome.";
    if (["network", "server-error", "socket-error", "socket-closed"].includes(tipo)) return "No hay conexión con el servidor. Revisa tu internet.";
    return "No se pudo conectar" + (tipo ? " (" + tipo + ")" : "") + ". Intenta otra vez.";
  }

  // ===================================================================
  //  2. PANTALLA "EN LÍNEA" (crear sala o unirse)
  // ===================================================================
  function avisoLinea(texto) { $("avisoLinea").textContent = texto || ""; }
  function estadoLinea(texto, conectado) {
    $("estadoLinea").textContent = texto;
    $("estadoLinea").classList.toggle("conectado", !!conectado);
  }
  function mostrarPaso(paso) {          // "inicio" o "sala"
    $("lineaInicio").classList.toggle("oculta", paso !== "inicio");
    $("lineaSala").classList.toggle("oculta", paso !== "sala");
    if (paso === "inicio") $("lineaConfig").classList.add("oculta");
  }

  // Mi nombre, color y nave (la nave se revisa con mis medallas)
  function miPiloto() {
    const nombre = $("nombreLinea").value.trim().slice(0, 12) || "Piloto";
    const ses = sesionActual();
    const guardado = leerPilotos().find(p => mismoNombre(p.nombre, nombre));
    let forma = (ses && mismoNombre(ses.nombre, nombre) && ses.forma) || (guardado && guardado.forma) || "clasica";
    if (!naveDesbloqueada(forma, nombre)) forma = "clasica";
    return { nombre, color: colorLinea, forma };
  }

  function abrirPantallaLinea() {
    mostrarPantalla("pantallaEnLinea");
    mostrarPaso("inicio");
    avisoLinea("");
    const ses = sesionActual();
    if (ses && !$("nombreLinea").value) $("nombreLinea").value = ses.nombre;
    if (ses && ses.color) colorLinea = ses.color;
    marcarColor($("coloresLinea"), colorLinea);
  }

  crearSelectorColores($("coloresLinea"), COLORES_NAVE, c => { colorLinea = c; });

  // Botones de goles del anfitrión (se crean aquí para no mezclarse con los de juego.js)
  [["3", 3], ["5", 5], ["7", 7], ["⏱ 1 min", "tiempo"]].forEach(([texto, valor]) => {
    const b = document.createElement("button");
    b.className = "dificultad" + (valor === 5 ? " elegido" : "");
    b.textContent = texto;
    b.addEventListener("click", () => {
      $("golesLinea").querySelectorAll("button").forEach(x => x.classList.remove("elegido"));
      b.classList.add("elegido");
      contrarrelojLinea = valor === "tiempo";
      golesLinea = contrarrelojLinea ? 5 : valor;
      sonido(600, 0.06, "triangle");
    });
    $("golesLinea").appendChild(b);
  });

  // --- Crear sala (anfitrión) ---
  async function crearSala() {
    if (ocupado) return;
    ocupado = true;
    avisoLinea("");
    sonido(660, 0.1, "triangle");
    mostrarPaso("sala");
    $("tituloCodigo").textContent = "Código de tu sala";
    $("codigoGrande").textContent = "…";
    $("botonCopiarCodigo").classList.add("oculta");
    estadoLinea("Creando la sala…");
    try {
      await prepararTransporte();
      codigo = null;
      for (let intento = 0; intento < 4 && !codigo; intento++) {
        const cod = String(1000 + Math.floor(Math.random() * 9000));
        try { await red.crear(cod); codigo = cod; }
        catch (e) { if (!(e && e.type === "unavailable-id")) throw e; }   // código ocupado: otro
      }
      if (!codigo) throw { type: "ocupado" };
    } catch (e) {
      cerrarTransporte();
      mostrarPaso("inicio");
      avisoLinea(textoError(e));
      ocupado = false;
      return;
    }
    enLinea.rol = "anfitrion";
    red.alMensaje = recibir;
    red.alCerrar = () => conexionPerdida("Se perdió la conexión con tu rival 😢");
    $("codigoGrande").textContent = "COSMO-" + codigo;
    $("botonCopiarCodigo").classList.remove("oculta");
    $("botonCopiarCodigo").textContent = "📋 Copiar código";
    estadoLinea("Esperando a tu rival… Pásale este código para que se una.");
    ocupado = false;
  }

  // --- Unirse con un código (invitado) ---
  async function unirse() {
    if (ocupado) return;
    const cod = ($("codigoSala").value.match(/\d/g) || []).join("").slice(-4);
    if (cod.length !== 4) { avisoLinea("Escribe los 4 números del código (por ejemplo 4821)."); return; }
    ocupado = true;
    avisoLinea("");
    sonido(660, 0.1, "triangle");
    mostrarPaso("sala");
    $("tituloCodigo").textContent = "Uniéndote a la sala";
    $("codigoGrande").textContent = "COSMO-" + cod;
    $("botonCopiarCodigo").classList.add("oculta");
    estadoLinea("Conectando…");
    try {
      await prepararTransporte();
      await red.unirse(cod);
    } catch (e) {
      cerrarTransporte();
      mostrarPaso("inicio");
      avisoLinea(textoError(e));
      ocupado = false;
      return;
    }
    codigo = cod;
    enLinea.rol = "invitado";
    red.alMensaje = recibir;
    red.alCerrar = () => conexionPerdida("Se perdió la conexión con el anfitrión 😢");
    enviar(Object.assign({ t: "hola", v: VERSION_RED }, miPiloto()));
    estadoLinea("Conectado. Esperando al anfitrión…");
    ocupado = false;
  }

  // El anfitrión empieza la partida
  function empezar() {
    if (enLinea.rol !== "anfitrion" || !rival) return;
    const yo = miPiloto();
    Object.assign(p1, { nombre: yo.nombre, color: yo.color, forma: yo.forma, esRobot: false, esPared: false });
    Object.assign(p2, { nombre: rival.nombre, color: rival.color, forma: rival.forma || "clasica", esRobot: false, esPared: false });
    modo = 2;
    dificultad = DIFICULTADES.normal;
    nivelElegido = "normal";
    contrarreloj = contrarrelojLinea;
    GOLES_PARA_TERMINAR = contrarreloj ? Infinity : golesLinea;
    nuevaPartida();        // juego.js; al final llama a enLinea.alEmpezar()
  }

  // Guarda la configuración normal la primera vez que se entra a una sala
  function guardarConfigNormal() {
    if (!antesDeEntrar) antesDeEntrar = { modo, GOLES_PARA_TERMINAR, contrarreloj, dificultad, nivelElegido };
  }
  function devolverConfigNormal() {
    if (!antesDeEntrar) return;
    ({ modo, GOLES_PARA_TERMINAR, contrarreloj, dificultad, nivelElegido } = antesDeEntrar);
    antesDeEntrar = null;
  }

  function cerrarTransporte() {
    if (red) { red.alCerrar = null; red.alMensaje = null; red.cerrar(); }
    red = null;
  }

  // Salir de la sala (por botón). "avisar" = decirle al rival que me fui
  function salir(avisar) {
    if (red && avisar) enviar({ t: "adios" });
    const r = red;
    red = null;
    if (r) { r.alCerrar = null; r.alMensaje = null; setTimeout(() => r.cerrar(), 200); }
    codigo = null; rival = null; ocupado = false;
    enLinea.activo = false; enLinea.rol = null; enLinea.yo = null;
    finEnviado = false; finMostrado = false; retraso = null;
    if (estado !== "menu") { estado = "menu"; limpiarTodo(); }
    $("pantallaPausa").classList.add("oculta");
    devolverConfigNormal();
  }

  // Se cayó la conexión o el rival salió
  function conexionPerdida(texto) {
    const estabaEnSala = enLinea.activo || codigo;
    salir(false);
    if (!estabaEnSala) return;
    abrirPantallaLinea();
    avisoLinea(texto);
    sonido(220, 0.4, "sawtooth", 0.12);
  }

  // Botones
  $("modoLinea").addEventListener("click", () => { sonido(660, 0.1, "triangle"); abrirPantallaLinea(); });
  $("botonCrearSala").addEventListener("click", crearSala);
  $("botonUnirse").addEventListener("click", unirse);
  $("codigoSala").addEventListener("keydown", e => { if (e.key === "Enter") unirse(); });
  $("botonEmpezarLinea").addEventListener("click", empezar);
  $("botonVolverLinea").addEventListener("click", () => {
    if (codigo || red) { salir(true); mostrarPaso("inicio"); avisoLinea(""); return; }
    mostrarPantalla("pantallaModo");
  });
  $("botonCopiarCodigo").addEventListener("click", () => {
    const texto = "COSMO-" + codigo;
    const listo = () => { $("botonCopiarCodigo").textContent = "✓ ¡Copiado!"; sonido(880, 0.08, "triangle"); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(texto).then(listo).catch(() => {});
  });
  // Salir de la partida (pausa) o ir al inicio (pantalla final) también cierra la sala
  $("botonSalir").addEventListener("click", () => { if (enLinea.activo || red) salir(true); });
  $("botonInicio").addEventListener("click", () => { if (enLinea.activo || red) salir(true); });
  // Si el anfitrión cambia de pestaña, su juego se pausa: se lo cuenta al invitado de una vez
  document.addEventListener("visibilitychange", () => { if (enLinea.activo && enLinea.rol === "anfitrion") enviarFoto(); });
  // Al cerrar la página, se despide
  window.addEventListener("pagehide", () => { if (red) enviar({ t: "adios" }); });

  // ===================================================================
  //  3. MENSAJES QUE LLEGAN
  // ===================================================================
  function recibir(m) {
    if (!m || !m.t) return;
    ultimoMensaje = ahora();
    switch (m.t) {
      // ---- los dos ----
      case "ping": enviar({ t: "pong", t0: m.t0 }); return;
      case "pong": retraso = Math.round(ahora() - m.t0); return;
      case "adios": conexionPerdida("Tu rival salió de la sala."); return;
      case "llena": conexionPerdida("Esa sala ya tiene 2 jugadores."); return;

      // ---- le llegan al ANFITRIÓN ----
      case "hola": {
        if (enLinea.rol !== "anfitrion" || rival) return;
        rival = { nombre: String(m.nombre || "Rival").slice(0, 12), color: m.color, forma: m.forma };
        if (mismoNombre(rival.nombre, miPiloto().nombre)) rival.nombre = rival.nombre.slice(0, 10) + " 2";   // que no se llamen igual
        // si eligieron el mismo color, al rival se le da otro
        if (!COLORES_NAVE.includes(rival.color) || rival.color === colorLinea) {
          rival.color = COLORES_NAVE.find(c => c !== colorLinea);
        }
        guardarConfigNormal();
        enLinea.activo = true;
        enLinea.yo = p1;
        enviar({ t: "bienvenido", nombre: miPiloto().nombre, color: colorLinea, colorRival: rival.color });
        estadoLinea("¡" + rival.nombre + " se unió! ✓", true);
        $("lineaConfig").classList.remove("oculta");
        sonido(784, 0.15, "triangle", 0.15);
        return;
      }
      case "mov": {      // dónde está la nave del invitado
        if (enLinea.rol !== "anfitrion") return;
        if (p2.congelado <= 0) {
          p2.y = limitar(m.y, C_ARRIBA, C_ABAJO - p2.h);
          p2.objetivoY = p2.y;      // así juego.js no la mueve por su cuenta
        }
        p2.conDedo = !!m.d;
        return;
      }
      case "pausa": if (enLinea.rol === "anfitrion") alternarPausa(); return;
      case "reanudar": if (enLinea.rol === "anfitrion" && estado === "pausa") reanudar(); return;
      case "otraVez":
        if (enLinea.rol === "anfitrion" && (estado === "fin" || estado === "pausa")) {
          $("pantallaPausa").classList.add("oculta");
          nuevaPartida();
        }
        return;

      // ---- le llegan al INVITADO ----
      case "bienvenido": {
        if (enLinea.rol !== "invitado") return;
        guardarConfigNormal();
        enLinea.activo = true;
        enLinea.yo = p2;
        rival = { nombre: m.nombre, color: m.color };
        colorLinea = m.colorRival || colorLinea;
        estadoLinea("¡Conectado con " + m.nombre + "! ✓ Esperando a que empiece la partida…", true);
        sonido(784, 0.15, "triangle", 0.15);
        return;
      }
      case "inicio": empezarComoInvitado(m); return;
      case "e": aplicarFoto(m); return;
      case "fin": terminarComoInvitado(m); return;
    }
  }

  // ===================================================================
  //  4. ANFITRIÓN: manda la "foto" de la cancha
  // ===================================================================
  const datosNave = p => ({ nombre: p.nombre, color: p.color, forma: p.forma });

  // juego.js la llama al final de nuevaPartida()
  enLinea.alEmpezar = function () {
    if (enLinea.rol !== "anfitrion") return;
    finEnviado = false;
    enLinea.sonidos.length = 0;     // los clics del menú no se mandan
    enLinea.chispas.length = 0;
    enviar({ t: "inicio", naves: [datosNave(p1), datosNave(p2)],
             goles: contrarreloj ? 0 : GOLES_PARA_TERMINAR, cr: contrarreloj });
  };

  function enviarFoto() {
    if (estado === "menu") return;
    enviar({
      t: "e",
      es: estado, tm: temporizador, tc: tituloCartel, me: mensaje,
      cs: cuentaSaque, ca: cambio, pc: pausaCirculo,
      av: aviso ? [aviso.texto, aviso.color, aviso.vida] : null,
      fg: flashGol ? [flashGol.lado, flashGol.color, flashGol.vida] : null,
      go: golpes, mr: mejorRacha, tr: tiempoRestante, gd: golDeOro, tb: r1(temblor),
      b: [r1(pelota.x), r1(pelota.y), r1(pelota.vx), r1(pelota.vy), r1(pelota.vel), pelota.atrapada ? 1 : 0],
      j: jugadores.map(p => [r1(p.x), r1(p.y), p.h, p.lado, p.puntos, p.golpes, p.congelado, p.encogido, p.escudo ? 1 : 0]),
      po: poderes.map(o => [o.tipo, r1(o.x), r1(o.y), o.edad, r1(o.angulo)]),
      ag: agujeros.map(a => [r1(a.x), r1(a.y), a.r, a.vida, r1(a.angulo), a.edad || 0]),
      as: asteroides.map(a => [r1(a.x), r1(a.y), r1(a.r), r1(a.rot), r1(a.vx), a.puntos.map(r1)]),
      ci: circulo ? [circulo.edad, circulo.remolino, circulo.dir, circulo.yaGiro ? 1 : 0, r1(circulo.brillo), circulo.rot] : null,
      el: estela.length,
      so: enLinea.sonidos.splice(0),
      ch: enLinea.chispas.splice(0)
    });
  }

  // ===================================================================
  //  5. INVITADO: dibuja lo que manda el anfitrión
  // ===================================================================
  function empezarComoInvitado(m) {
    if (enLinea.rol !== "invitado") return;
    const [n1, n2] = m.naves;
    Object.assign(p1, n1, { esRobot: false, esPared: false });
    Object.assign(p2, n2, { esRobot: false, esPared: false });
    modo = 2;
    dificultad = DIFICULTADES.normal;
    nivelElegido = "normal";
    contrarreloj = !!m.cr;
    GOLES_PARA_TERMINAR = contrarreloj ? Infinity : m.goles;
    jugadores.forEach(p => {
      p.puntos = 0; p.golpes = 0;
      p.stats = { poderes: 0, peorDiferencia: 0, golCirculo: false, golGiro: false, supersonico: false };
    });
    limpiarTodo();
    particulas.length = 0;
    estela.length = 0;
    celebrar = false;
    finMostrado = false;
    p2.objetivoY = p2.y;
    mostrarPantalla(null);
    $("pantallaPausa").classList.add("oculta");
    estado = "jugando";
    iniciarMusica();
    mostrarConsejo("mover", textoMover());
  }

  function aplicarFoto(f) {
    if (enLinea.rol !== "invitado") return;
    const antes = estado;
    estado = f.es; temporizador = f.tm; tituloCartel = f.tc; mensaje = f.me;
    cuentaSaque = f.cs; cambio = f.ca; pausaCirculo = f.pc;
    aviso = f.av ? { texto: f.av[0], color: f.av[1], vida: f.av[2] } : null;
    flashGol = f.fg ? { lado: f.fg[0], color: f.fg[1], vida: f.fg[2] } : null;
    golpes = f.go; mejorRacha = f.mr; tiempoRestante = f.tr; golDeOro = f.gd;
    temblor = Math.max(temblor, f.tb);

    [pelota.x, pelota.y, pelota.vx, pelota.vy, pelota.vel] = f.b;
    pelota.atrapada = f.b[5] ? {} : null;

    const yo = enLinea.yo;
    f.j.forEach((d, i) => {
      const p = jugadores[i];
      p.x = d[0];
      if (p !== yo) p.y = d[1];            // MI nave la muevo yo (sin retraso)
      p.h = d[2]; p.lado = d[3]; p.puntos = d[4]; p.golpes = d[5];
      p.congelado = d[6]; p.encogido = d[7]; p.escudo = !!d[8];
    });
    yo.y = limitar(yo.y, C_ARRIBA, C_ABAJO - yo.h);

    poderes.length = 0;
    f.po.forEach(([tipo, x, y, edad, angulo]) => poderes.push({ tipo, x, y, r: 17, edad, angulo }));
    agujeros.length = 0;
    f.ag.forEach(([x, y, r, vida, angulo, edad]) => agujeros.push({ x, y, r, vida, angulo, edad }));
    asteroides.length = 0;
    f.as.forEach(([x, y, r, rot, vx, puntos]) => asteroides.push({ x, y, r, rot, vx, puntos }));

    if (f.ci) {      // se conserva el mismo objeto para que el dibujo del remolino siga suave
      circulo = circulo || {};
      [circulo.edad, circulo.remolino, circulo.dir] = f.ci;
      circulo.yaGiro = !!f.ci[3]; circulo.brillo = f.ci[4]; circulo.rot = f.ci[5];
    } else circulo = null;

    // Estela del cometa: el invitado la arma con las posiciones que le llegan
    if (f.el === 0 || pelota.atrapada) estela.length = 0;
    else if (estado === "jugando") {
      estela.push({ x: pelota.x, y: pelota.y });
      while (estela.length > f.el) estela.shift();
    }

    // en la pantalla final el invitado ya toca sus propios sonidos de victoria
    if (estado !== "fin") f.so.forEach(s => sonido(...s));
    f.ch.forEach(([x, y, color, cantidad]) => chispas(x, y, color, cantidad));

    $("pantallaPausa").classList.toggle("oculta", estado !== "pausa");
    if (antes === "fin" && estado !== "fin") {    // el anfitrión empezó otra partida
      mostrarPantalla(null);
      finMostrado = false;
      celebrar = false;
    }
  }

  function terminarComoInvitado(m) {
    if (enLinea.rol !== "invitado" || finMostrado) return;
    finMostrado = true;
    p2.stats = m.stats || p2.stats;
    mejorRacha = m.mr;
    terminarPartida(m.ganador === 1 ? p1 : p2);    // juego.js: pantalla final y guarda MI puntaje
  }

  // juego.js la llama en vez de actualizar() cuando soy el invitado
  enLinea.actualizarInvitado = function () {
    cuadro++;
    const yo = enLinea.yo;
    if (estado === "jugando" || estado === "gol") moverConTeclas();
    yo.objetivoY = limitar(yo.objetivoY, C_ARRIBA, C_ABAJO - yo.h);
    if (yo.congelado <= 0) yo.y += (yo.objetivoY - yo.y) * (yo.conDedo ? SENSIBILIDAD_DEDO : SENSIBILIDAD);
    for (let i = particulas.length - 1; i >= 0; i--) {
      const q = particulas[i];
      q.x += q.vx; q.y += q.vy; q.vida -= 0.035;
      if (q.vida <= 0) particulas.splice(i, 1);
    }
    temblor *= 0.85;
    if (estado === "jugando" || estado === "gol") actualizarConsejos();
    lanzarFuegos();
  };

  // ===================================================================
  //  6. CADA CUADRO (juego.js la llama 1 vez por cuadro dibujado)
  // ===================================================================
  enLinea.sonidos = [];      // los llena sonido() en juego.js (anfitrión)
  enLinea.chispas = [];      // los llena chispas() en juego.js (anfitrión)

  enLinea.cadaCuadro = function () {
    if (!red) return;
    if (enLinea.rol === "anfitrion") {
      enviarFoto();
      if (estado === "fin" && !finEnviado) {
        finEnviado = true;
        enviar({ t: "fin", ganador: p1.puntos > p2.puntos ? 1 : 2, stats: p2.stats, mr: mejorRacha });
      }
    } else {
      const yo = enLinea.yo;
      if (estado !== "menu" && (ultimaYEnviada === null || Math.abs(yo.y - ultimaYEnviada) > 0.3 || cuadro % 30 === 0)) {
        ultimaYEnviada = yo.y;
        enviar({ t: "mov", y: r1(yo.y), d: yo.conDedo ? 1 : 0 });
      }
    }
    if (ahora() - ultimoPing > 1000) { ultimoPing = ahora(); enviar({ t: "ping", t0: ahora() }); }
  };

  enLinea.pedirPausa = function () {                 // el invitado pausa o quita la pausa
    enviar({ t: estado === "pausa" ? "reanudar" : "pausa" });
  };
  enLinea.pedirOtraPartida = function () { enviar({ t: "otraVez" }); };

  // Cartelito abajo a la izquierda y aviso si el rival no responde
  enLinea.dibujarExtra = function () {
    if (estado === "menu") return;
    ctx.save();
    const texto = "🌐 En línea" + (retraso !== null ? " · " + retraso + " ms" : "");
    ctx.font = "600 14px Rubik, sans-serif";
    const w = ctx.measureText(texto).width + 24;
    ctx.fillStyle = "rgba(6, 10, 36, .8)";
    ctx.strokeStyle = "rgba(56, 232, 255, .35)";
    ctx.lineWidth = 1.5;
    rectRedondo(12, ALTO - 42, w, 30, 12); ctx.fill(); ctx.stroke();
    ctx.fillStyle = retraso !== null && retraso > 150 ? "#ff9a3c" : "#7dff6a";
    ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.fillText(texto, 24, ALTO - 26);
    // Si hace rato no llega nada del rival
    const callado = ultimoMensaje && ahora() - ultimoMensaje > 2000 && estado !== "fin";
    if (callado) {
      ctx.fillStyle = "rgba(6, 10, 36, .85)";
      rectRedondo(ANCHO / 2 - 220, ALTO / 2 - 34, 440, 68, 16); ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = "600 20px Rubik, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("⏳ Esperando a " + (rival ? rival.nombre : "tu rival") + "…", ANCHO / 2, ALTO / 2);
    }
    ctx.restore();
  };
})();
