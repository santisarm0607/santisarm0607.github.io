# Galaxy Gol

Fútbol arcade 2D de alienígenas contra Zorp · Ingeniería Web

Juego web de fútbol 4 contra 4 estilo Atari: juega contra Zorp y su equipo, contra un amigo en el mismo dispositivo o **en línea**, cada uno en su dispositivo. Gana el primero que llega a 5 goles.

**Autor:** David Santiago Sarmiento Salguero (SantiSarm) · Ingeniería Web · Ingeniería Multimedia · Universidad Simón Bolívar.

## Jugar

- En línea: `https://santisarm0607.github.io/galaxy-gol/` (cuando GitHub Pages esté activado).
- En tu computador: abre `index.html` con Live Server en Visual Studio Code.

## Controles

| Acción | Jugador 1 | Jugador 2 | Celular |
| --- | --- | --- | --- |
| Mover | W A S D | Flechas | Joystick |
| Patear (toque = pasar, mantener = tirar) | F | Ñ | Patear |
| Derrapar | G | . (punto) | Derrapar |
| Cambiar de alienígena | H | L | (automático) |

P, Espacio o Esc pausan; M silencia. El juego te cambia solo al alienígena más cercano al balón, y con Cambiar eliges tú. El pase va hacia donde apuntas: un aro punteado te muestra a quién le llega.

**Jugar en línea**: crea una sala y tu amigo entra con el código de 4 letras o escaneando el **código QR** con la cámara del celular, sin tener el juego.

El balón va cada vez más rápido: después de cada gol y cada 30 segundos de juego. Antes de jugar, en **Prepara tu equipo**, cada jugador pone su nombre, el nombre de su equipo, su color y su capitán (o toca su perfil guardado). Todo se guarda en tu navegador (LocalStorage): en **Perfiles** ves a todos los que han jugado, y en **Récords** el mayor puntaje de cada persona, los últimos partidos y el botón para reiniciar las estadísticas.

## Archivos

| Carpeta o archivo | Qué tiene |
| --- | --- |
| `index.html` | El HTML: todas las pantallas del juego. |
| `css/style.css` | Los estilos (colores en `:root`). |
| `js/script.js` | Todo el JavaScript, en 21 secciones comentadas. |
| `img/` | Imágenes en pixel art (SVG). |
| `sonidos/` | Aquí van tus propios sonidos (opcional). |
| `guias/` | Guía de sonidos y guía de animaciones 2D en PDF. |
| `una-sola-pagina/` | El juego en un solo archivo HTML. |
| `NOTAS.md` | Cómo está hecho el juego y su historial de versiones. |

Hecho con HTML5, CSS3, JavaScript y Canvas. Sonidos con Web Audio API. Juego en línea con PeerJS (WebRTC) y código QR con qrcode-generator.
