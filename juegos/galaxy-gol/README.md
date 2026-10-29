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

P, Espacio o Esc pausan; M silencia. Siempre manejas al alienígena de tu equipo más cercano al balón.

El balón va cada vez más rápido: después de cada gol y cada 30 segundos de juego. Cada partido se guarda en tu navegador (LocalStorage): en **Récords** ves tus mejores puntajes, tus últimos partidos y puedes reiniciar las estadísticas.

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

Hecho con HTML5, CSS3, JavaScript y Canvas. Sonidos con Web Audio API. Juego en línea con PeerJS (WebRTC).
