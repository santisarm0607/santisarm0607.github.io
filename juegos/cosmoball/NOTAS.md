# COSMOBALL — Notas del proyecto

Ping pong con temática espacial. Proyecto de clase hecho con HTML, CSS y JavaScript. Autor: **SantiSarm**.
Eslogan: «Un universo. Dos pilotos. Ninguna regla normal.» (Antes se llamaba *Galaxy Pong*.)
Todo se dibuja con Canvas y todos los sonidos se crean con Web Audio, así que no hay imágenes ni audios.

## Archivos
| Archivo | Qué hace |
|---|---|
| `index.html` (en la raíz) | Solo lleva al juego (`html/index.html`). Sirve para que la dirección corta `https://santisarm0607.github.io/cosmoball/` también abra el juego (GitHub Pages está activado desde `main`, carpeta raíz). |
| `html/index.html` | El canvas del juego (960×540), el logo SVG del agujero negro y todas las pantallas de menú. Busca los otros archivos con `../css/` y `../js/`. |
| `css/estilos.css` | La identidad visual (colores, letras, botones, tarjetas, logo). Adapta el juego al celular. La clase `.oculta` esconde cosas. |
| `js/juego.js` | Toda la lógica: física, robot, poderes, cancha circular, puntaje, marcador, medallas, naves, sonido y bucle. |
| `js/enlinea.js` | 🌐 **Multijugador en línea**: salas con código, conexión entre los dos aparatos y sincronización de la partida. Se carga después de `juego.js` y usa sus variables. |
| `LEEME.txt` | Cómo abrir y jugar. |

## Identidad visual (COSMOBALL)
- **Símbolo**: un agujero negro que se traga la pelota. Es un SVG animado en la pantalla de título (`.logo-agujero`), y también se dibuja en el fondo de la cancha, en `pintarNebulosa`, donde antes había un planeta.
- **Colores** (en `:root`, al principio de `estilos.css`): `--neon` cian `#38e8ff`, `--morado` `#9b5cff`, `--magenta` rosa `#ff3cac`, `--naranja` `#ff9a3c` y `--espacio` azul oscuro `#050a24`.
- **Letras**: Fredoka (redondeada) para títulos, botones y números del canvas (`--titulo`), y Rubik para los textos.
- **Detalles**: el nombre tiene un degradado cian → morado → rosa → naranja y va un poco inclinado. El botón principal usa morado → rosa → naranja. La nave elegida brilla en naranja. El marcador y los carteles tienen fondo azul oscuro.
- Si el aparato pide menos movimiento, el logo se queda quieto (código al final de `juego.js` y regla `prefers-reduced-motion` en el CSS).

## Variables principales (juego.js)
- `estado`: `"menu"`, `"jugando"`, `"gol"`, `"pausa"` o `"fin"`.
- `modo`: 1 jugador (contra el robot), 2 jugadores o 3 (práctica contra la pared). En línea se usa `modo = 2`.
- `enLinea`: `{ activo, rol, yo }`. `rol` es `"anfitrion"` o `"invitado"`; `yo` es la nave de este aparato (p1 o p2).
- `p1` y `p2`: los jugadores. Tienen `x`, `y`, `h`, `objetivoY`, `lado`, `puntos`, `golpes`, efectos (`congelado`, `encogido`, `escudo`) y `stats`.
- `pelota`: posición y velocidad (`vx`, `vy`, `vel`).
- `dificultad` (de `DIFICULTADES`), `GOLES_PARA_TERMINAR`, `contrarreloj`, `golDeOro`.
- `ultimoGolpe`: quién tocó la pelota de último. El poder es para ese jugador.
- `poderes`, `agujeros`, `asteroides`, `particulas`: lo que hay en la cancha.
- Ritmo de los poderes: `MAX_PODERES` = 3 a la vez, `APARECE_INICIO` = 4 s entre los primeros, `REGENERA_PODER` = 5 s para que salga otro.
- `circulo`: vale `null` en la cancha normal y es un objeto en la cancha circular.
- Marcador: `dbCompartida`, `esAdmin`, `miId` y `CLAVE_ADMIN`.

## Cómo funciona
- **Bucle**: `bucle()` llama a `actualizar()` 60 veces por segundo (paso fijo) y luego a `dibujar()`.
- **Pelota**: avanza `x += vx`, `y += vy` y se acelera poco a poco hasta `velMax`. Rebota en el techo y el piso.
- **Paletas**: el mouse, las teclas o el dedo cambian `objetivoY`, y la nave se acerca a ese punto suavemente (`SENSIBILIDAD`). El robot calcula dónde va a llegar la pelota con `predecirY` y le suma un error al azar según la dificultad.
- **Choques**: `tocaNave` revisa 6 puntos del camino de la pelota para que no atraviese la nave. `rebotar` cambia el ángulo según dónde pegó (hasta unos 56°). En la cancha circular lo hace `fisicaCirculo`.
- **Gol**: la pelota sale más de 30 px por un lado y `anotarGol` suma el punto. Después saca quien recibió el gol.
- **Ganar**: alguien llega a `GOLES_PARA_TERMINAR`, o se acaba el minuto en contrarreloj (si hay empate, sigue con gol de oro). Lo maneja `terminarPartida`.
- **Puntaje** (`calcularPuntaje`): 500 puntos repartidos entre los goles + 2 por golpe + bono por ganar.

## 🌐 Multijugador en línea (`js/enlinea.js`)
- **Cómo se juega**:
  - Modo → **🌐 En línea**.
  - Uno toca **Crear sala** y le sale un código como `COSMO-4821`.
  - El otro escribe los 4 números y toca **Unirme**.
  - El que creó la sala elige los goles y toca **Empezar partida**.
- **Conexión**: usa **PeerJS** (WebRTC), que se descarga de jsDelivr solo cuando alguien entra a "En línea".
  - El servidor gratuito de PeerJS solo presenta a los dos aparatos; después se hablan directo.
  - Necesita internet y funciona en GitHub Pages.
  - **No funciona** en la vista de prueba de Claude, porque ahí WebRTC está bloqueado.
- **Quién hace qué**:
  - El **anfitrión** (p1, izquierda) corre `actualizar()` normal. Una vez por cuadro le manda al invitado una "foto" de la cancha (`enviarFoto`) con:
    - la pelota y las naves
    - los poderes, agujeros, asteroides y la cancha circular
    - los carteles
    - los sonidos y las chispas de ese cuadro
  - El **invitado** (p2, derecha) **no simula**: `actualizar()` llama a `enLinea.actualizarInvitado()`.
    - Mueve su propia nave al instante, sin esperar al anfitrión.
    - Manda su posición (`mov`).
    - Dibuja la última foto que le llegó.
- **Ganchos en juego.js**: son líneas marcadas con 🌐. Si `enLinea.activo` es `false`, el juego funciona exactamente igual que antes.
  - En `actualizar`, `dibujar`, `bucle`, `nuevaPartida` y `sonido`.
  - En `chispas`, `moverConTeclas`, el mouse y el dedo.
  - En la pausa, `terminarPartida` y al guardar puntajes.
- **Pausa, otra partida y salir**:
  - El invitado se los pide al anfitrión (`pausa`, `reanudar`, `otraVez`).
  - Si alguien sale o se cae la conexión, al otro le aparece un aviso.
- **Puntajes**:
  - Cada aparato guarda solo a su piloto, en la categoría **🌐 En línea** del marcador.
  - Bono por ganar: +500.
- **Probar sin internet** (dos pestañas del mismo navegador):
  - Abre `html/index.html?red=local` en las dos pestañas, con Live Server.
  - Así usa `BroadcastChannel` en vez de PeerJS.
- En pantalla sale el cartel **"🌐 En línea · N ms"** con el retraso entre los dos aparatos. Si no llega nada del rival en 2 segundos, sale "⏳ Esperando a…".

## Pantallas
Título → Play → Modo → Config (selección de nave) → JUEGO → Fin (volver a jugar / marcador / inicio).
En línea: Título → Play → Modo → 🌐 En línea (crear sala o unirse) → JUEGO → Fin.
En la pantalla de título la marca (agujero negro, nombre y eslogan) va arriba y el menú va en una columna de botones del mismo ancho, con Play primero y más grande (`.menu-principal`). En el celular acostado la marca queda a la izquierda y el menú a la derecha.
Desde el título también se abren Cómo jugar, Marcador, 👤 Pilotos (antes "Iniciar sesión"), Medallas y Créditos.

## 👤 Pilotos guardados
- Cada piloto que juega queda guardado en `localStorage` (clave `galaxyPongPilotos`, máximo 20): nombre, color y nave.
- En **Prepara tu nave** (cada tarjeta) y en **🌐 En línea** salen los 8 pilotos más recientes como botones (`pintarChipsPilotos` en `juego.js`). Un toque carga el nombre, el color y la nave; el elegido queda marcado en rosa.
- Si el nombre escrito ya es de un piloto guardado, se usa su color.
- En 2 jugadores los dos pilotos no pueden tener el mismo nombre (cada uno guarda su propio puntaje).
- El 🏆 Marcador muestra a cada piloto una vez, con su mejor puntaje (`armarTabla`).
- Los pilotos son de cada navegador: si alguien juega en su celular, queda guardado en su celular.
La pausa sale encima del juego. `mostrarPantalla(id)` esconde todas las pantallas y muestra solo una (la lista de pantallas está escrita a mano dentro de esa función).

## Marcador y administrador
- **En el computador o celular** se guarda en `localStorage`. "Borrar marcador" pide la `CLAVE_ADMIN` (por ahora `cosmoball2026`; conviene cambiarla).
- **En la página publicada en Claude** el marcador es compartido. Cada jugador guarda sus partidas en `marcador/<su id>` y solo puede escribir el suyo. Solo el **dueño de la página** (`esAdmin`) ve el botón de borrar y puede borrar todo. El artefacto se publica con las reglas `marcador: read view, write owner` y `marcador/{self}: write interact`.
- Si alguien no tiene permiso para guardar en el marcador compartido, su partida queda en su aparato (`subido: false`) y la ve solo él.
- Las claves de `localStorage` siguen empezando con `galaxyPong…` a propósito: si se cambian, se pierden los puntajes, pilotos y medallas guardados.

## Cosas para revisar algún día (no rompen el juego)
1. Las naves se mueven durante la pausa (`actualizar` mueve jugadores antes de revisar la pausa).
2. `flashGol` no se apaga durante el cartel de gol.
3. La tecla Espacio no presiona botones en los menús.
4. En 2 jugadores, los dos pueden sacar "¡RÉCORD DEL MARCADOR!" en la misma partida.
5. `anotarGol` usa `Math.random() * 5` fijo para elegir las frases.
6. Hay código repetido: contar un golpe, el escudo, reiniciar la pelota y las cajas del marcador.
7. `aCancha()` y `circulo.rot` son restos de una versión vieja.
8. Si el juego se sube a GitHub Pages, hace falta un `index.html` en la carpeta principal, porque ahora está dentro de `html/`.

## Reglas para trabajar en el proyecto
- No cambiar lo que funciona sin que SantiSarm lo pida.
- Decir en qué archivo va cada código y exactamente dónde ponerlo.
- Avisar antes si un cambio afecta otras partes.
- Actualizar este NOTAS.md en cada cambio importante.
- Explicar sencillo y en español.

## Historial
- **Versión final de clase** (Galaxy Pong): el juego completo.
- **Marcador con administrador**: el marcador es compartido en Claude y solo el administrador puede borrarlo.
- **Poderes más calmados**: máximo 3 en la cancha, salen cada 4–5 segundos. `index.html` pasó a la carpeta `html/`.
- **Identidad COSMOBALL**: nuevo nombre, logo del agujero negro, eslogan, paleta cian/morado/rosa/naranja, letra Fredoka y agujero negro en el fondo de la cancha.
- **Menú en columna**: la pantalla de título tiene la marca arriba y los botones en columna (en el celular acostado, uno al lado del otro).
- **🌐 Multijugador en línea** (28 oct 2026):
  - Archivo nuevo: `js/enlinea.js`.
  - Pantalla "Jugar en línea" con salas de código de 4 números.
  - Pestaña "En línea" en el marcador.
  - Ganchos 🌐 en `juego.js`.
  - Los fuegos artificiales pasaron a la función `lanzarFuegos()`.
  - En línea, la pantalla final dice "¡Ganaste!" solo al que ganó.
- **GitHub Pages** (29 oct 2026): el juego también se publica solo en `https://santisarm0607.github.io/cosmoball/`. Archivo nuevo `index.html` en la raíz, que lleva a `html/index.html`.
- **👤 Pilotos guardados como botones** (29 oct 2026):
  - "Iniciar sesión" pasa a llamarse **👤 Pilotos**.
  - Botones con los pilotos guardados en Prepara tu nave (`#chips1`, `#chips2`) y en En línea (`#chipsLinea`).
  - Aviso si en 2 jugadores los dos pilotos se llaman igual.
  - Cambios en `html/index.html`, `css/estilos.css` (al final), `js/juego.js` (`pintarChipsPilotos`, `chipsDeTarjeta`) y `js/enlinea.js` (`abrirPantallaLinea`).
