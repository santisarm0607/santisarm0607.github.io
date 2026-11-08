# Carpeta de sonidos

Por ahora el juego hace todos sus sonidos y su música con código (Web Audio), así que esta carpeta está vacía.

Cuando tengas tus propios archivos:

1. Ponlos aquí con el nombre exacto que dice la **Guía de sonidos** (por ejemplo `sfx_pistola_disparo.mp3`).
2. Abre `js/config.js` y cambia `usarArchivos: false` por `usarArchivos: true`.
3. Recarga el juego. Si falta algún archivo, ese sonido se sigue haciendo con código.

Formato recomendado: MP3, 44.1 kHz. Los efectos en mono; la música en estéreo y preparada para repetirse sin cortes (bucle).
