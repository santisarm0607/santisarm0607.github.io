# Galaxy Gol · notas del proyecto (versión 3.9)

Juego web arcade de fútbol 2D estilo Atari. Tu equipo juega 4 contra 4 contra el equipo de Zorp (rosado), contra un amigo en el mismo dispositivo o **en línea, cada uno en su dispositivo**. Cada jugador tiene un perfil: nombre, nombre del equipo, color y capitán. Gana el primero que llega a 5 goles.

Autor: David Santiago Sarmiento Salguero (SantiSarm) · Ingeniería Web · Ingeniería Multimedia · Universidad Simón Bolívar.

## Cómo abrirlo

- Abre `index.html` con Live Server en Visual Studio Code (o con doble clic).
- Cada código va en su carpeta: el HTML es `index.html` (se queda en la raíz porque Live Server y GitHub Pages abren ese archivo), los estilos en `css/style.css` y el JavaScript en `js/script.js`. `index.html` los carga con `href="css/style.css"` y `src="js/script.js"`.
- Las fuentes vienen de Google Fonts: Jersey 10 (pixelada) para títulos y marcador, y Atkinson Hyperlegible para todos los textos (hecha para leerse fácil, incluso con baja visión). Sin internet el juego funciona igual, con fuentes de respaldo.
- El juego en línea usa la librería PeerJS 1.5.4 (se carga desde jsDelivr en `index.html`). Necesita internet y abrir el juego con Live Server o publicado (por ejemplo, en GitHub Pages). No funciona dentro de la vista previa de Claude, que bloquea las conexiones entre dispositivos.
- `una-sola-pagina/galaxy-gol.html` es el mismo juego en un solo archivo (HTML, CSS y JS juntos), para compartirlo.

## Archivos

| Archivo o carpeta | Qué tiene |
| --- | --- |
| `index.html` | Todas las pantallas: inicio, perfil, controles, logros, récords, créditos, jugadores, nivel, sala en línea, partida (con el panel del tutorial), pausa y final. |
| `css/style.css` | Colores en `:root`, pantallas, controles táctiles, vertical/horizontal y "reducir movimiento". |
| `js/script.js` | Toda la lógica, dividida en 21 secciones con comentarios. |
| `img/` | Pixel art en SVG: logo, Zorp, capitán Cometa, iconos, candado, medalla, cápsulas y celular. |
| `img/animaciones/` | Aquí van tus propias tiras de animación (ver la guía de animaciones). |
| `sonidos/` | Aquí van tus propios sonidos (ver la guía de sonidos). |
| `guias/` | Guía de sonidos y guía de animaciones 2D en PDF. |

## Controles

Regla: una mano se mueve y la otra hace las acciones. El jugador 1 usa F (patear) y G (derrapar).

| Acción | Jugador 1 | Jugador 2 (mano izquierda) | Celular |
| --- | --- | --- | --- |
| Mover | W A S D (mano izquierda) | Flechas (mano derecha) | Joystick |
| Patear (toque = pasar, mantener = tirar) | F | Ñ | Patear |
| Derrapar | G | . (punto) | Derrapar |

**No hay botón para cambiar de alienígena** (desde la versión 3.2): siempre manejas al de tu equipo más cercano al balón.

**Patear**: un toque corto (menos de 0,18 s) pasa a un compañero. Si lo mantienes, se carga el tiro y sale al soltar: más tiempo, más fuerte (carga llena en 1 s; a los 1,25 s sale solo). Sin carga el tiro sale al 70 % de la velocidad normal y con la carga llena al 115 %, pero un poco menos preciso. Mientras cargas, una barrita bajo tu alienígena (y en la guía) muestra la fuerza. Zorp tira siempre a la velocidad normal.

En la partida, abajo a la derecha, hay una **guía de botones** (F Patear, G Derrapar) que se pone amarilla mientras aprietas cada tecla. Con 2 jugadores, la del jugador 2 va abajo a la izquierda. En celulares no aparece, porque ahí están los botones táctiles, que se ponen blancos al tocarlos.

En teclado en inglés, la Ñ es `;` (el juego usa la posición física de la tecla). Entre los dos bloques quedan libres J, K, N, M y la coma, para que las manos no choquen jugando de a dos.

Pausa: P, Espacio o Esc. Silencio: M. Con 1 jugador también sirven las teclas del jugador 2.

**Pantalla completa**: en la partida está en la barra de arriba. En el inicio y en todos los menús hay un botón igual que flota en la esquina de arriba a la derecha (`#boton-pantalla-menu`, versión 3.7). En la partida ese botón se esconde solo, con la regla `body:has(#pantalla-partida:not([hidden]))` de `style.css`. Los dos botones usan `alternarPantallaCompleta()` y `pintarBotonPantalla()` los pinta iguales.

## Cómo está hecho `js/script.js`

1. **Constantes, niveles y poderes**: medidas de la cancha, `GOLES_PARA_GANAR`, `SEGUNDOS_MITAD`, `DERRAPE`, `PODER` y `NIVELES` (tutorial, fácil, normal, difícil).
2. **Tablas de animaciones y sonidos**: `ANIMACIONES`, `EFECTOS`, `HOJAS_PROPIAS` y `SONIDOS_PROPIOS`. De aquí salen las guías en PDF.
3. **Colores**: el canvas lee los colores de las variables de `:root`.
4. a 7. **Utilidades, guardado (`localStorage` con `try/catch`), logros y sonido.**
8. y 9. **Pantallas, teclado y controles táctiles** (tabla `CONTROLES`: para cambiar una tecla, cambia su código ahí y en la pantalla Controles de `index.html`).
10. y 11. **Estado de la partida y movimiento** (pasos fijos de 1/120 s).
12. **Balón**: posesión (el balón va pegado al pie), pases, tiros, derrapes y robos.
13. **Poderes**: cápsulas, asteroides y cráteres, nave del aficionado, babosa y charcos.
14. **Inteligencia**: el que va por el balón, el que marca, el que busca cápsulas, el arquero y los que se ubican solos.
15. **Tutorial**: lista `PASOS_TUTORIAL` y cómo se prepara cada paso.
16. **Reglas**: goles, balón nuevo (8 segundos) y final.
17. **Dibujo**: cancha, personajes con sus 7 animaciones, poderes y efectos. Cada equipo se pinta con su color (`colorDe`, `coloresCuerpo`).
18. **Bucle principal**: pasos fijos de física; en línea, el invitado no simula, solo dibuja.
19. **Perfil del jugador**: `limpiarPerfil` (revisa nombres y colores), lista de perfiles guardados (`leerPerfiles`, `guardarPerfilEnLista`), pantalla "Perfiles", pantalla "Prepara tu equipo" (`abrirEquipos`), retratos de los capitanes y `prepararEquiposVisuales` (colores, marcador y joystick).
20. **Juego en línea**: sala con código, conexión con PeerJS, fotos del estado, eventos (sonidos y avisos), pausa compartida, revancha y conexión cortada.
21. **Arranque**.

## Perfiles y juego en línea (versiones 3 y 3.9)

- **Perfil**: nombre (hasta 12 letras), nombre del equipo (hasta 14), color (celeste, rosado, naranja, morado o rojo) y capitán, que es tu aspecto (Cometa, Cíclope, Cuernitos o Corona). El capitán es tu delantero.
- **Prepara tu equipo** (versión 3.9): sale después de elegir el modo, antes de jugar.
  - 1 jugador: Jugar → 1 jugador → nivel (o Tutorial) → Prepara tu equipo → partido.
  - 2 jugadores: Jugar → 2 jugadores → Prepara tu equipo (dos tarjetas: Jugador 1 con W A S D y Jugador 2 con flechas) → partido.
  - En línea: Jugar → En línea → Prepara tu equipo → sala. En la sala, "Cambiar equipo" vuelve a esta pantalla sin cerrar la sala.
  - Arriba de cada tarjeta están los **perfiles guardados**: un toque y se cargan nombre, equipo, color y capitán. "+ Nuevo" deja la tarjeta en blanco.
  - El nombre es obligatorio (así queda en los récords). Con 2 jugadores no pueden tener el mismo nombre.
- **Dónde se guarda** (`localStorage`, en este navegador):
  - `galaxyGol.perfiles`: la lista de todos los perfiles (máximo 20, el más reciente primero). Se busca por nombre sin importar mayúsculas.
  - `galaxyGol.perfil`: el último perfil del jugador 1 (es el que se manda al rival en línea).
  - `galaxyGol.perfilJ2`: el último perfil del jugador 2.
- **Pantalla Perfiles** (botón "Perfiles" del inicio): lista de todos los que han jugado, con su retrato, equipo, color, capitán y mejor puntaje.
  - **Editar**: abre el formulario. Si le cambias el nombre, sus partidos del historial pasan al nombre nuevo (`renombrarEnHistorial`).
  - **Borrar**: hay que tocar dos veces. Borra el perfil, pero no sus partidos (esos se borran con "Reiniciar estadísticas").
  - **Nuevo perfil**: crea uno sin jugar.
- Los perfiles son de cada navegador: si alguien juega en su celular, queda guardado en su celular, no en tu computador.
- Si los dos equipos tienen el mismo color, el segundo usa rosado (o celeste, si el primero es rosado). Contra Zorp también vale: si escoges rosado, Zorp juega en celeste.
- **En línea, 1 contra 1**:
  1. Uno toca "Jugar → En línea → Crear sala" y le sale un código de 4 letras (sin O, 0, I, 1 ni L para no confundirse).
  2. El otro escribe el código y toca "Unirme". Los dos ven la tarjeta del rival.
  3. Quien creó la sala toca "¡A jugar!".
- **Quién hace qué**:
  - **El anfitrión** (quien creó la sala) es el árbitro: corre la partida de verdad, con el equipo 1 a su cargo.
  - **El invitado** maneja el equipo 2. Manda hacia dónde se mueve (cuando cambia, y cada 0,2 s) y sus acciones, y recibe unas 30 "fotos" por segundo con las posiciones, el marcador, los poderes, los sonidos y los avisos. Usa unos 10 KB/s.
  - Su pantalla mueve a los alienígenas suavemente hacia la última foto, para que no se vea a saltos.
- **Pausa**: si cualquiera pausa (o cambia de pestaña), se pausa para los dos. Cualquiera puede continuar.
- **Revancha**: cualquiera la puede pedir desde la pantalla final o la pausa.
- **Si alguien se va** o se corta internet, al otro le sale "Se cortó la conexión": al instante si salió con el botón, o a los 12 s si cerró la pestaña o se quedó sin internet. Los dos se mandan un "latido" cada segundo para notarlo.
- **Seguridad**: todo lo que llega por internet se revisa. Los nombres se recortan, se les quitan los símbolos `<` `>` y se muestran como texto, nunca como HTML. Los números deben ser válidos y las acciones deben estar en la lista.
- **Logros**: solo se ganan contra Zorp (no en línea).
- **Límite conocido**: algunas redes (por ejemplo, el wifi de una universidad) bloquean la conexión directa entre dispositivos. En ese caso sale un mensaje y se puede probar con los datos del celular. Arreglarlo del todo necesita un servidor de retransmisión (TURN).

## Reglas y decisiones de diseño

- **Posesión**: tocar el balón te lo deja pegado al pie. Un balón muy rápido (más de 480 unidades/s) no se puede dominar: rebota.
- **Tiro**: mantén Patear y suelta. Mirando más o menos al arco, va a un palo (lo eliges manteniendo la dirección hacia ese lado); de espaldas, despeja. De lejos es menos preciso, y con mucha fuerza también un poco.
- **Derrape**: el alienígena se lanza al piso. Si su pie alcanza el balón de un rival, se lo quita y el rival queda en el piso 0,75 s. Si falla, tarda en levantarse y debe esperar 0,9 s para volver a derrapar. Al arquero con el balón en las manos no se le quita.
- **Pase y cambio automático**: el pase va al compañero más adelantado o libre y el control salta al que recibe. Si tu equipo no tiene el balón, manejas al alienígena más cercano a él (se mira un poquito adelante, hacia donde va el balón). Para que no salte de un lado a otro, el nuevo debe estar 45 unidades más cerca y entre un cambio y otro pasan al menos 0,35 s. No cambia a mitad de un derrape, y los que están en el piso cuentan como más lejanos. El arquero lo maneja siempre la máquina. Todo esto está en la función `cambioAutomatico` (sección 12).
- **Arquero**: lo maneja la máquina. Ataja, le quita el balón al rival que entra a su área y reparte.
- **Poderes**: cada 15 a 22 segundos aparece una cápsula (dura 10 s). El equipo que la toca lanza el poder:
  - *Lluvia de asteroides*: 6 asteroides caen sobre los rivales (los tumban 1 s). Dejan cráteres que no se pueden pisar ni atravesar con el balón; se cierran solos en 10 s.
  - *Aficionado en nave*: es hincha del equipo que la llamó. Le roba el balón al rival, vuela alto 2 s (nadie lo alcanza) y después baja: hay que tocarlo para recuperar el balón. A los 8 s lo suelta solo.
  - *Alienígena de baba*: cruza la cancha rival dejando charcos. Sobre la baba casi no hay agarre y quien lleva el balón puede perderlo. Los charcos duran 9 s.
- **Velocidad progresiva** (versión 3.8), en `multiplicador()` (sección 12) con la constante `ACELERACION` (sección 1):
  - El balón sale más rápido en pases, tiros y despejes después de cada gol (`aumentoPorGol` de cada nivel).
  - Además, va un 4 % más rápido cada 30 segundos de juego, hasta +24 % (`nivelRitmo()`).
  - El reloj (`juego.reloj`) solo corre con el balón en juego.
  - Cada aumento muestra "¡El balón va más rápido!" y lo anuncia para lectores de pantalla.
  - El tutorial no se acelera.
- **Historial y récords** (versión 3.8, sección 16):
  - Al terminar cada partido, `guardarEnHistorial()` guarda en `localStorage` (clave `galaxyGol.historial`, en JSON, máximo 50) estos datos:
    - fecha, modo, nivel, jugador y rival
    - marcador, si ganó, puntaje y segundos jugados
  - **Puntaje**: 100 por gol a favor − 50 por gol en contra + bono por ganar (fácil 300, normal 600, difícil 1000, 2 jugadores 500, en línea 500).
  - En 2 jugadores se guardan **los dos** (versión 3.9): uno por cada persona, con su puntaje. El del que perdió lleva `espejo: true` para no repetir el partido en "Últimos partidos". En línea, cada aparato guarda el suyo. El tutorial no se guarda.
  - La pantalla final muestra el puntaje de cada persona: "¡Nuevo récord!" si es el mejor de todos, o "¡Récord personal!" si es su mejor.
  - **Pantalla Récords** (botón en el inicio): resumen, **Mejores puntajes** (versión 3.9: un renglón por jugador con 🥇🥈🥉, su mayor puntaje, partidos y ganados; hasta 10, lo arma `rankingPorJugador`) y los últimos 10 partidos con los nombres reales.
  - El historial guarda hasta 100 registros.
  - El botón **Reiniciar estadísticas** borra el historial; hay que tocarlo dos veces para no borrar por error.
- **Balón nuevo**: si el balón no cruza la mitad en 8 segundos. El reloj se detiene mientras la nave tiene el balón.
- **Niveles**: tutorial (paso a paso), fácil, normal y difícil. La dificultad sale de la velocidad del balón y de cómo juega Zorp (velocidad, reacción, puntería, cuánto derrapa, cuánto se distrae y si busca cápsulas).

## Tus propios sonidos y animaciones

- **Sonido**: guarda `sonidos/NOMBRE.mp3` y escribe `NOMBRE` en `SONIDOS_PROPIOS` (sección 2 de `js/script.js`). Nombres y duraciones en `guias/guia-sonidos-galaxy-gol.pdf`.
- **Animación**: guarda la tira en `img/animaciones/NOMBRE.png` y escribe `NOMBRE` en `HOJAS_PROPIAS`. Nombres, cuadros y medidas en `guias/guia-animaciones-galaxy-gol.pdf`.
- Si un archivo falta, el juego sigue usando el sonido o el dibujo hecho con código.

## Accesibilidad

- Cada pantalla tiene un título que recibe el foco al abrirse; todos los botones se usan con teclado y tienen foco visible.
- `aria-live` en el marcador y en los avisos de gol, pausa, poderes, logros, balón nuevo e instrucciones del tutorial.
- Imágenes con texto alternativo (las decorativas con `alt=""`).
- `prefers-reduced-motion`: sin animaciones de menú, temblor, confeti, polvo ni parpadeos.

## Pruebas que se hicieron (versión 3)

- Menús y partida solo con teclado; pase, derrape, pausa y silencio.
- 15 partidas simuladas completas en fácil, normal y difícil (persona quieta, máquina contra máquina y un jugador automático con tus controles): todas terminaron, entre 1,5 y 4,5 minutos, sin errores.
- Los tres poderes, la persecución de la nave y el tutorial completo de principio a fin.
- Celular vertical y horizontal, 1 y 2 jugadores: la cancha cabe, sin scroll y sin botones encimados.
- Navegador sin `localStorage` y con "reducir movimiento". Cero atributos `style` en el HTML.
- Versión 2.2: cada una de las 8 teclas de acción hace lo que debe (1 y 2 jugadores), ninguna se repite ni choca con P, M, Espacio o Esc, y la pantalla Controles se ve bien en computadora y en celular.
- Versión 3, en línea, con dos navegadores de verdad (WebRTC) y un servidor de salas propio (`herramientas/probar_red.py`):
  - **Sala**: crear y unirse; código equivocado; sala llena (un tercer jugador); los dos con el mismo color.
  - **Partida**: el invitado (en un celular vertical) se mueve, cambia y derrapa; pausa compartida; final rápido; partida completa en tiempo real, máquina contra máquina, pasando todo por la red; revancha.
  - **Salidas**: el anfitrión sale con el botón; el invitado cierra la pestaña de golpe.
  - **Resultado**: cero errores y cero atributos `style`.
- Versión 3, perfil: se guarda y se lee, sale en el marcador, y las partidas de 1 y 2 jugadores siguen terminando igual.

## Historial

- **Versión 1**: 3 por equipo, el balón se empujaba al tocarlo, tiro automático cerca del arco, niveles fácil y difícil.
- **Versión 2** (19 de octubre de 2026): 4 por equipo, posesión del balón, botones Tirar y Derrapar, niveles tutorial, fácil, normal y difícil, poderes en cápsulas, 7 animaciones por personaje y guías de sonidos y animaciones en PDF.
- **Versión 2.1** (19 de octubre de 2026): la tecla Q (Cambiar) funciona siempre: también con el balón en los pies y durante la cuenta del saque. Ya no se elige al arquero si el balón está lejos de su área.
- **Versión 2.2** (20 de octubre de 2026): teclas nuevas, más cómodas. Antes las acciones (E, Q, F, R) estaban alrededor de W A S D y había que soltar el movimiento para usarlas. Ahora el jugador 1 usa G H V B con la mano derecha y el jugador 2 usa L Ñ . - con la izquierda. La pantalla Controles muestra el bloque de teclas, con las de atacar en amarillo y las de defender en celeste.
- **Versión 3** (20 de octubre de 2026): **perfil del jugador** (nombre, nombre del equipo, 5 colores y 4 capitanes) y **juego en línea 1 contra 1** con PeerJS: sala con código, nombres sobre los alienígenas, pausa compartida, revancha y aviso de conexión cortada. 3 capitanes nuevos (Cíclope, Cuernitos y Corona), 2 sonidos nuevos (`conectado` y `desconectado`). El marcador dibuja el capitán de cada equipo con su color; el joystick y el botón Cambiar también toman el color del equipo.
- **Versión 3.1** (20 de octubre de 2026): letra más legible. Los textos pasan de Pixelify Sans (pixelada, difícil de leer en tamaño chico) a Atkinson Hyperlegible. Títulos, marcador y mensajes grandes siguen con Jersey 10. Cambios en `index.html` (enlace de Google Fonts) y `style.css` (variable `--fuente-texto` en `:root`).
- **Versión 3.2** (22 de octubre de 2026): ya no hay botón ni tecla para cambiar de alienígena: manejas siempre al de tu equipo más cercano al balón. Nueva guía de botones abajo a la izquierda de la cancha, que se ilumina al apretar cada tecla. En celular quedan 3 botones en triángulo, que se ponen blancos al tocarlos. El tutorial pasa de 7 a 6 pasos.
- **Versión 3.3** (22 de octubre de 2026): el jugador 1 usa F (pasar), G (tirar) y H (derrapar), en fila y en el mismo orden que la guía. La guía de botones pasa a la esquina inferior derecha (con 2 jugadores, la del jugador 2 va a la izquierda).
- **Versión 3.4** (22 de octubre de 2026): pasar y tirar se juntan en un solo botón, **Patear** (F, Ñ o el botón del celular): un toque pasa y mantener carga un tiro con fuerza, con barrita de carga. Derrapar pasa a la G. En celular quedan 2 botones: Patear y Derrapar.
- **Versión 3.5** (23 de octubre de 2026): carpetas separadas por tipo de código: `css/style.css` y `js/script.js` (antes estaban al lado de `index.html`). No cambia nada del juego.
- **Versión 3.9** (29 de octubre de 2026): **perfiles guardados y ranking por jugador**.
  - Pantalla nueva **Prepara tu equipo** después de elegir el modo (1 jugador, Tutorial, 2 jugadores y En línea), con los perfiles guardados como botones.
  - "Tu perfil" pasa a ser **Perfiles**: lista de todos los que han jugado, con su mejor puntaje, y botones Editar y Borrar.
  - **Récords**: Mejores puntajes muestra a cada persona una vez, con su mayor puntaje. Con 2 jugadores se guardan los dos y se usan sus nombres (antes decía "Jugador 1" y "Jugador 2").
  - Cambios en `index.html` (`#pantalla-equipo`, `<template id="plantilla-equipo">`, `#pantalla-perfil` con lista, botón "Cambiar equipo" en la sala), `css/style.css` (sección "Perfiles y Prepara tu equipo" al final) y `js/script.js` (secciones 16 y 19).
  - No cambian los sonidos ni las animaciones.
- **Versión 3.8** (29 de octubre de 2026): **velocidad progresiva** por tiempo y **historial de partidos con récords** (pantalla Récords, puntaje en la pantalla final y botón Reiniciar estadísticas).
  - Cambios en `index.html` (botón Récords, pantalla `#pantalla-records` y `#puntaje-final`), `css/style.css` (sección Récords al final) y `js/script.js` (`ACELERACION`, `nivelRitmo`, `multiplicador`, `guardarEnHistorial`, `pintarRecords`).
  - No cambian los sonidos ni las animaciones. Cero atributos `style`.
- **Versión 3.7** (28 de octubre de 2026): el botón de **pantalla completa** se ve desde el inicio y en todos los menús.
  - Es un botón nuevo, `#boton-pantalla-menu`, en la esquina de arriba a la derecha.
  - En la partida se sigue usando el de la barra de arriba.
  - Cambios en `index.html`, `css/style.css` y `js/script.js` (`dom.botonPantallaMenu` y `pintarBotonPantalla`).
  - Cero atributos `style`.
  - No cambian los sonidos ni las animaciones.
  - `una-sola-pagina/galaxy-gol.html` todavía es la versión anterior.
- **Versión 3.6** (27 de octubre de 2026): en celular acostado la cancha usa toda la altura (cerca de un 40 % más grande). La barra de arriba se reparte a los costados: pausa, pantalla completa y sonido a la izquierda; goles y reloj a la derecha. Patear y Derrapar van uno encima del otro. Nuevo botón de **pantalla completa** (esconde la barra del navegador y, en Android, deja el celular acostado; en iPhone no existe para páginas web y el botón se esconde).
