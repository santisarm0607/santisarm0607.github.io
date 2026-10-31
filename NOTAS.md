# NOTAS — Portafolio Santisarm

Portafolio personal de Santiago Sarmiento (SantiSarm), estudiante de Ingeniería Multimedia.
Hecho para el Primer Previo de Ingeniería Web. **HTML + CSS + JavaScript (sin librerías)**.
Bootstrap se usa solo en Contacto. **Tema espacial** (fondo azul noche con estrellas) desde el 2026-10-28.

---

## 1. Archivos

| Archivo | Qué es |
|---|---|
| `index.html` | Inicio: presentación, **proyectos destacados**, franja del Arcade, habilidades y correo |
| `blog.html` | Solo una **redirección** a `portafolio.html`, para que los enlaces viejos sigan funcionando (no tiene contenido) |
| `portafolio.html` | Portafolio: 7 proyectos en tarjetas, con filtros, visor y el enlace «Ver proyecto» |
| `proyecto-*.html` | **Una página por proyecto** (7): `proyecto-feu-doux`, `proyecto-marvel`, `proyecto-santisarm-animation`, `proyecto-revista-up-date`, `proyecto-love-market`, `proyecto-trio-amoroso` y `proyecto-flama`. Cada una tiene la obra completa, un cuadro con los datos y los textos «El pedido», «Mi rol» y «La idea». Al final llevan a la anterior y a la siguiente |
| `contacto.html` | Formulario (maqueta) + tarjetas de Correo y Ubicación |
| `juegos.html` | **Arcade**: una nave y un planeta por cada juego. Al hacer clic, la nave viaja al planeta y entra al juego |
| `futbol.html` | **Galaxy Gol** (fútbol). Igual que `cosmoball.html`: menú, juego en ventana, "Volver a la nave" y portada para celular |
| `juegos/galaxy-gol/` | El juego Galaxy Gol (`index.html`, `css/`, `js/`, `img/`). Es una **copia** del repositorio `github.com/santisarm0607/galaxy-gol`, sin las guías PDF ni `una-sola-pagina/`, para que la página pese menos |
| `cosmoball.html` | **COSMOBALL** (ping-pong). Tiene el menú del portafolio, el juego en una ventana (`iframe`) y el botón "Volver a la nave". Las instrucciones están dentro del juego. En celular, en vez de la ventana, muestra una portada con el botón "Jugar" que abre el juego solo |
| `juegos/cosmoball/` | El juego COSMOBALL completo (`html/`, `css/`, `js/`, su propio `NOTAS.md`). Es una **copia** del repositorio `github.com/santisarm0607/cosmoball`: si cambias el juego, cámbialo en los dos lados |
| `css/styles.css` | **Único archivo de estilos**, lo usan todas las páginas |
| `js/main.js` | **El JavaScript de la página**, lo usan todas las páginas |
| `js/tema.js` | Pone el **modo claro u oscuro** guardado, antes de que se dibuje la página (va en el `<head>`) |
| `img/og-*.jpg` | Imágenes de 1200 × 630 para cuando comparten un enlace (WhatsApp, LinkedIn…): `og-portada.jpg` (inicio, portafolio, contacto y juegos) y `og-proyecto-1…7.jpg` (una por página de proyecto). Se ven en las etiquetas `og:image` del `<head>` |
| `video/` | `trio-amoroso.mp4`: el video del proyecto 6, comprimido a 720 × 1280 (unos 4 MB). Su póster es `img/trio-amoroso-poster.webp` |
| `img/` | Logo, avatar, `proyecto1…7` y las 3 páginas de la revista (`revista-excelencia-*.webp`). `proyecto3-santisarm-marca.webp` ahora es la **portada** del manual de marca. Todo en `.webp`, máx. 800 px de ancho. Además `favicon.png` (tu muñequito en la pestaña, 96 × 96) y `apple-touch-icon.png` (el ícono si guardan la página en el celular, 180 × 180), sacados de `avatar.webp` |
| `Manual_Tecnico_...pdf` | Informe del examen (no es parte de la página) |

Cómo se conectan:
- Las páginas se enlazan por el menú del header: **Inicio · Portafolio · Juegos · Contacto**.
  - `futbol.html` y `cosmoball.html` no están en el menú: se entra desde los planetas de `juegos.html`, y en su menú queda marcado "Juegos".
- Todas cargan, en el `<head>`:
  - el favicon (`img/favicon.png`) y el ícono para celular (`img/apple-touch-icon.png`)
  - `css/styles.css`
  - `js/main.js` (con `defer`: se ejecuta cuando la página ya cargó)
  - la fuente **Poppins** (Google Fonts)
- Solo `contacto.html` carga **Bootstrap 5.3.3**, para la rejilla del formulario (requisito del examen).
- `img/logo-santisarm.webp` no se usa en ninguna página.

## 2. Secciones (y dónde están)

**index.html**
- Header + menú → líneas 32–46 *(igual en todas las páginas; solo cambia cuál está activo)*
- `.hero` (avatar, nombre, bio, botones) → 49–70
- `.destacados` (3 tarjetas: Marvel, Manual de marca y Love Market + botón «Ver los 7 proyectos») → 72–132
- `.arcade-franja` (acceso a Juegos) → 134–142
- `.habilidades` (píldoras) → 144–158
- `.contacto-rapido` (franja azul con correo) → 160–168
- Footer (vacío) → 171–173

**juegos.html**
- `.arcade` (título y texto) → desde la línea 33
- Planetas (`<ul class="planetas">`) → 45–92. Cada planeta es un `<li class="planetas__item">`:
  - Galaxy Gol → 48
  - COSMOBALL → 66 (agujero negro con disco de fuego)
  - Próximamente → 78
- La nave (`.nave`, dibujo SVG) → 94–134

**portafolio.html**
- `.portafolio-intro` → 49–57
- Botones de filtro (`.filtros`) → 62–68
- Tarjetas → cada proyecto es un `<li class="proyecto" data-filtro="...">` entre las líneas 71–163. Cada una termina con su enlace `proyecto__ver` («Ver proyecto →») hacia su página

**proyecto-*.html** (las 7 tienen la misma estructura)
- Header + menú (Portafolio queda marcado) y footer igual que las demás
- `.ficha-pagina` → `← Portafolio`, categoría y título (`.ficha__titulo`, es un `<p>` como en el resto del sitio)
- `.ficha` → `.ficha__obra` (la imagen completa; en el manual y la revista va arriba y ancha con `ficha--ancha`) + `.ficha__texto` (`.ficha__datos` y varios `.ficha__bloque`)
- `.ficha__otros` → anterior / siguiente

**contacto.html**
- `.contacto-hero` → 35–43
- Formulario (`.form-tarjeta`, rejilla Bootstrap) → 49–86
- `.contacto-datos` (Correo y Ubicación) → 88–97

## 3. Diseño

**Colores** — solo se cambian en `:root` (inicio de `styles.css`):

| Variable | Color | Uso |
|---|---|---|
| `--color-azul` | `#3153A1` | Header, footer, títulos (azul del logo) |
| `--color-azul-claro` | `#F1F9FE` | Fondos suaves, píldoras |
| `--color-acento` | `#29B6F6` | Botón principal, subrayado del menú |
| `--color-texto` | `#222222` | Texto normal |
| `--color-texto-claro` | `#5A6472` | Bio y descripciones |

> El celeste **no** se usa para textos sobre azul o blanco: no se lee bien (falla contraste WCAG).
> Por eso todo botón celeste lleva texto oscuro.

**Colores del tema espacial** — también en `:root`, empiezan con `--espacio-`. Todos los textos dan más de 4.5:1 (WCAG).

| Variable | Color | Uso |
|---|---|---|
| `--espacio-fondo` | `#0B1026` | Fondo azul noche de toda la página, campos del formulario |
| `--espacio-negro` | `#070B1C` | Footer |
| `--espacio-panel` | `#121A3D` | Tarjetas, formulario, visor, filtros |
| `--espacio-borde` | lavanda al 18% | Bordecito de los paneles |
| `--espacio-texto` | `#E8EEFF` | Texto principal |
| `--espacio-texto-suave` | `#A9B6D9` | Bio y descripciones |
| `--espacio-lavanda` | `#9DB8FF` | Títulos de tarjetas y etiquetas (mi azul, pero visible en lo oscuro) |
| `--espacio-celeste-claro` | `#8FDBFF` | Categorías y colaboraciones |
| `--espacio-brillo` | celeste al 35% | Resplandores |

> Sobre el fondo oscuro el celeste `--color-acento` **sí** cumple WCAG (8.2:1), por eso ahora se usa en "Ingeniero Multimedia".

**Modo claro:**
- El bloque `html[data-tema="claro"]` (justo debajo del `:root`) le da otro valor a cada variable `--espacio-`: blanco, azul `#3153A1` y gris de texto.
- Como la parte 10 usa esas variables, todo cambia solo.
- Lo que no es solo color (esconder las estrellas, las píldoras de Habilidades, la franja azul clarito de arriba) está al final de la parte 10.
- En el modo claro todos los textos también dan más de 4.5:1.
- Los juegos se quedan con sus propios colores, porque tienen su diseño.

- **Fuente:** Poppins (400–800). **Bordes:** `--radio-borde: 14px`. **Ancho máximo:** 1200 px (`.contenedor`).
- **Tamaños:** nombre 2.6rem · títulos de página 2.2rem · Habilidades 1.8rem · título de proyecto 1.2rem.
- **Nombres de clases:** estilo BEM en español → `bloque__parte--variante` (ej: `nav__enlace--activo`, `boton--primario`).
- **Orden de `styles.css`:**

| Parte | Contenido |
|---|---|
| 1 | Variables |
| 2 | Reset |
| 3 | Header |
| 4 | Footer |
| 5 | Inicio |
| 6 | Portafolio |
| 7 | Contacto |
| 8 | Celular (línea ~504) |
| 9 | **Efectos del JavaScript** |
| 10 | **Tema espacial**: pinta todo de galaxia. Va después de las partes 3 a 9 para ganarle a sus colores claros |
| 11 | **Página de Juegos / Arcade**: planetas, nave, viaje, páginas de aterrizaje y la página de un juego (`.juego`, para `cosmoball.html`) |
| 12 | **Proyectos destacados y páginas de proyecto**: `.destacados`, `.arcade-franja`, `.proyecto__ver` y todo `.ficha*`. Usa los colores `--espacio-` (cambia con el modo claro) |

**Qué tiene el tema espacial (parte 10):**
- **Cielo:** dos capas de estrellas detrás de todo (`body::before` y `body::after`), hechas con `radial-gradient`, sin imágenes.
  - La capa 1 tiene nebulosas de color y estrellas chiquitas quietas.
  - La capa 2 tiene estrellas más grandes que titilan y suben muy despacio.
- **Planeta con anillo** saliendo por el borde derecho del hero (`.hero::before` y `.hero::after`).
- **Avatar:**
  - tiene detrás un disco claro, como una luna, para que se vea en lo oscuro
  - tiene una órbita punteada que gira, con una lunita celeste dando vueltas (`.hero__foto::before` y `::after`)
- **Header:** de vidrio oscuro, con lo de atrás borroso.
- **Tarjetas, formulario y visor:** paneles azul noche con borde y brillo celeste al pasar el mouse.
- **Franja de contacto:** nebulosa azul.
- **Volver al diseño claro:** borra la parte 10 completa y la línea `color-scheme: dark;` del `:root`. El confeti y el cohete del JS siguen funcionando igual.

**Celular:**
- Casi todo se acomoda solo con `flex-wrap`.
- La parte 8 (`@media (max-width: 768px)`):
  - centra el header y el hero
  - achica el nombre a 2rem
  - reduce el relleno del formulario
- La parte 9 tiene su propio `@media` para el visor y el aviso flotante.
- La parte 10 tiene su propio `@media`: el planeta se hace más pequeño.

## 4. JavaScript (`js/main.js`)

Está dividido en partes numeradas con comentarios.
- La **parte 17** (al final) enciende todos los efectos. Para apagar uno, pon `//` delante de su línea.
- Si el JS no carga, la página se ve y funciona igual que antes, sin efectos.

| # | Efecto | Página | Qué hace |
|---|---|---|---|
| 3 | Aparecer | todas | Lo que llega a la pantalla al bajar sube y aparece. Lo que ya se ve al abrir **no** se anima (cuida el puntaje de Lighthouse). Lista de clases en `ELEMENTOS_QUE_APARECEN` |
| 4 | Header compacto | todas | Al bajar, el header se hace más delgado (logo de 72 → 50px) |
| 5 | Volver arriba | todas | **Cohete** 🚀 abajo a la derecha. Sale después de bajar 500px y despega al darle clic |
| 6 | Texto que se escribe | inicio | Debajo del nombre se escriben y borran los roles de `MIS_ROLES` (parte 0) |
| 7 | Avatar sorpresa | inicio | 1 clic = salta + confeti. **5 clics seguidos** = vuelta completa + mensaje secreto |
| 8 | Habilidades | inicio | Rebotan y sueltan confeti al hacer clic |
| 9 | Copiar correo | inicio y contacto | Botón "Copiar" junto al correo + aviso "¡Correo copiado!" |
| 10 | Filtros | portafolio | Todos / Branding / Diseño gráfico / Publicidad / Editorial, con contador |
| 11 | Visor | portafolio (solo ahí; en el inicio las tarjetas llevan a su proyecto) | Clic en una imagen = se ve en grande y **completa** (sin recorte). Se navega con flechas, teclado (← → Esc) o deslizando el dedo |
| 12 | Inclinación 3D | portafolio | La tarjeta se inclina siguiendo el mouse (solo computador) |
| 13 | Formulario | contacto | Contador de caracteres. Al enviar ya no recarga la página: muestra "¡Gracias, Nombre!" con confeti y un botón que abre el correo con el mensaje ya escrito (`mailto:`) |
| 14 | Estrellas fugaces | todas | Cada 4 a 9 segundos cruza una estrella fugaz (solo si la pestaña se está viendo) |
| 18 | Ventana del juego | cosmoball | Cuando el juego termina de cargar, le pasa el foco para que el teclado funcione sin hacer clic |
| 19 | Modo claro / oscuro | todas | Botón ☀️/🌙 al lado del menú. Guarda la elección en `localStorage` (`santisarm.tema`). Cambia el atributo `data-tema` del `<html>` y el CSS hace el resto |
| 20 | Página de proyecto | proyecto-* | Barra celeste de lectura arriba, la obra se inclina con el mouse (solo computador) y los colores (Feu Doux) se copian con un toque. Además `ELEMENTOS_QUE_APARECEN` ahora incluye lo de destacados y de las fichas |
| 16 | Arcade | juegos | Al pasar el mouse (o Tab) por un planeta, la nave gira para mirarlo. Al hacer clic: la nave gira, despega, vuela al planeta haciéndose pequeña, la pantalla se llena del color del planeta (`data-color`) y entra al juego. El planeta "Próximamente" solo se sacude y avisa |

Herramientas que usan los efectos:
- `lanzarConfeti(x, y, cantidad)` / `confetiDesde(elemento, cantidad)` → confeti de **estrellitas** y puntitos (parte 1). Los colores están en `COLORES_CONFETI`.
- `mostrarAviso('texto')` → mensajito flotante abajo (parte 2).

Accesibilidad:
- Si el sistema tiene "reducir movimiento", no hay animaciones fuertes ni confeti. El cielo queda quieto y no salen estrellas fugaces.
- El avatar y las imágenes se pueden usar con el teclado (Tab + Enter).
- Los lectores de pantalla leen "Ingeniero Multimedia" en vez del texto que se escribe solo.

## 5. Pendientes / cosas a revisar

**Para el Segundo Previo (sección de juegos):**
- ~~Meter los dos juegos~~ ✓ COSMOBALL y Galaxy Gol (los dos con modo en línea).
- ~~Galaxy Gol: velocidad progresiva e historial~~ ✓ (versión 3.8).
- Botón de Modo Oscuro/Claro.
- Récords con LocalStorage (historial + High Scores + botón reiniciar).
- Publicar en GitHub Pages.
- Manual técnico nuevo en PDF horizontal.

**Otros:**

1. **Blog y Contacto no tienen h1/h2.** Sus títulos son `<p>`, por eso se ven delgados. *(Se decidió así en el manual; consultar antes de cambiar.)*
2. **Footer vacío** (franja azul de 32 px). Hay CSS sin usar para redes y copyright (`.footer__redes`, `.footer__copy`).
3. **Correo en la tarjeta de Contacto:** no es enlace `mailto:` y se parte en dos líneas. Ya tiene botón "Copiar".
4. **Imágenes de tarjetas:** se recortan al centro (210 px de alto). Ahora se pueden ver completas en el visor.
5. ~~**Contenido:** Figma en Habilidades y "3ds Max"~~ ✓ (2026-10-30).
6. **Código repetido:** header y footer están copiados en todas las páginas (ahora 13). Si cambias el menú, cámbialo en todos los archivos.
7. **Redes sociales y correo nuevo:** cuando existan, se agregan al footer y se cambia el correo (está en `index.html`, `contacto.html` y `js/main.js`, parte 0).
8. **Pendientes que dependen de ti:** formulario que sí envíe (cuando tengas el correo nuevo), botón «Descargar hoja de vida» (falta el PDF) y redes sociales en el footer (faltan los enlaces).
9. **Títulos de las páginas de proyecto:** son `<p>`, igual que en Blog y Contacto. Si algún día se pasan a `h2`/`h3`, consultar antes.

## 6. Cómo hacer cambios sin dañar el diseño

**Cambiar un texto:** edita solo lo que está **entre** las etiquetas. No borres las `class="..."`.
```html
<p class="hero__subtitulo">Ingeniero Multimedia</p>   ← cambia solo "Ingeniero Multimedia"
```

**Cambiar las frases que se escriben solas:** en `js/main.js`, parte 0, edita la lista `MIS_ROLES`.

**Agregar una habilidad** (`index.html`, dentro de `<ul class="habilidades__lista">`). Rebota sola, no hay que tocar el JS:
```html
<li class="habilidad">Figma</li>
```

**Agregar un proyecto** (`portafolio.html`): copia un `<li class="proyecto" ...>…</li>` completo y pégalo antes de `</ul>`.
- La imagen va en `img/` con el nombre `proyecto8-nombre.webp`, de unos 800 px de ancho.
- En `data-filtro` pon uno o varios filtros, separados por espacio: `branding`, `diseno`, `publicidad`, `editorial`.
- Los contadores de los botones y el visor lo toman solos.
- La línea `proyecto__colaboracion` es opcional: bórrala si el trabajo fue solo tuyo.
```html
<li class="proyecto" data-filtro="branding diseno">
    <img class="proyecto__imagen" src="img/proyecto8-nombre.webp" alt="Describe lo que se ve en la imagen" width="360" height="210" loading="lazy">
    <div class="proyecto__contenido">
        <span class="proyecto__categoria">Categoría</span>
        <p class="proyecto__titulo">Título del proyecto</p>
        <p class="proyecto__descripcion">Descripción corta.</p>
        <p class="proyecto__colaboracion">En conjunto con Nombre</p>
    </div>
</li>
```

**Agregar un filtro nuevo** (ej. "Animación"):
1. En `portafolio.html`, dentro de `<div class="filtros">`, agrega:
   ```html
   <button type="button" class="filtro" data-filtro="animacion" aria-pressed="false">Animación</button>
   ```
2. Pon `animacion` en el `data-filtro` de las tarjetas que correspondan.

**Agregar una sección nueva:**
1. En el HTML, ponla dentro de `<main>`, siguiendo este molde:
   ```html
   <section class="nueva-seccion" aria-labelledby="titulo-nueva">
       <div class="contenedor">
           <p id="titulo-nueva" class="nueva-seccion__titulo">Título</p>
           ...
       </div>
   </section>
   ```
   El `.contenedor` es lo que la centra y le da los márgenes.
2. En `styles.css`, pon sus estilos **dentro del bloque de esa página** (partes 5, 6 o 7).
   - Usa las variables: `var(--color-azul)`, `var(--radio-borde)`…
   - Para alternar con las otras secciones, usa fondo blanco o `var(--color-azul-claro)`.
   - Espacio arriba/abajo: entre 50px y 70px (`padding: 60px 0;`).
3. Si en celular necesita ajustes, agrégalos dentro del `@media` de la parte 8.
4. Si quieres que aparezca con animación al bajar, agrega su clase a `ELEMENTOS_QUE_APARECEN` en `js/main.js` (parte 3).

**Agregar un juego nuevo al Arcade** (`juegos.html`):
1. Cambia el planeta "Próximamente" por un enlace. Copia el `<li class="planetas__item">` de Galaxy Pong y cambia:
   - `href` por la página del juego
   - `data-color` por el color del destello
   - el nombre y la info
2. Para darle colores propios, crea en `styles.css` (parte 11) una clase como `.planeta--nuevo` con:
   - `--luz`, `--base`, `--sombra` y `--halo`
   - `--tam` si quieres otro tamaño
3. No hay que tocar el JS: la nave viaja sola a cualquier planeta que sea un enlace.

**Agregar una página nueva:**
1. Copia `portafolio.html` y cambia `<title>`, `description` y el contenido de `<main>`. Deja el `<script src="js/main.js" defer>`.
2. Agrega el enlace al menú en **todas** las páginas.
3. En la página nueva, ponle `nav__enlace--activo` y `aria-current="page"` a su propio enlace.

**Después de cambiar algo:**
- Revisa en el celular (en Chrome: F12 → ícono de celular).
- Abre la consola (F12 → Console): no debe salir nada en rojo.
- Si es para entregar, pásalo por el validador W3C.

## 7. Historial de cambios

- **2026-10-30** — **Portafolio con nuevo nombre, tarjetas para compartir y ajustes.**
  - `blog.html` → **`portafolio.html`**. Se actualizaron los enlaces de todas las páginas y `blog.html` quedó como una redirección (`<meta http-equiv="refresh">`).
  - **Etiquetas para compartir** (`og:` y `twitter:card`, más `canonical`) en las 13 páginas, con imágenes nuevas `img/og-*.jpg`.
  - Las imágenes de las tarjetas se recortan desde abajo (`.proyecto__imagen { object-position: center top }`, parte 12 del CSS).
  - Descripciones nuevas en las tarjetas del manual de marca y del Trío Amoroso (en `portafolio.html` y en el inicio).

- **2026-10-31** — **Franja del Arcade más dinámica y CSS sin caché vieja.**
  - La franja del Arcade ahora tiene dos planetas que flotan, brillo y sube al pasar el mouse (se apaga con «reducir movimiento»).
  - Los enlaces a `styles.css`, `main.js` y `tema.js` llevan `?v=20261031`. **Cada vez que cambies el CSS o el JS, cambia ese número en todas las páginas**, para que el navegador no muestre la versión vieja guardada.
  - Destacados quedó en 3 tarjetas (Marvel, Manual de marca y Love Market).
- **2026-10-30** — **Proyectos destacados y una página por proyecto.**
  - Nuevos: `proyecto-*.html` (7), `video/trio-amoroso.mp4`, `img/trio-amoroso-poster.webp` e `img/revista-excelencia-*.webp` (3).
  - `index.html`: secciones `.destacados` (Marvel, Manual de marca y Love Market) y `.arcade-franja`, entre el hero y Habilidades.
  - `blog.html` (hoy `portafolio.html`): cada tarjeta termina con «Ver proyecto →». Flama ya no dice «En conjunto con Santiago Colmenares» (lo hizo solo). El manual de marca ahora muestra su **portada** (`proyecto3-santisarm-marca.webp`, y su `alt` cambió).
  - `styles.css`: parte 12 nueva (no se cambió nada de las partes 1–11).
  - `main.js`: parte 20 nueva, `iniciarFicha()` en «Encender todo»; el visor ahora solo se activa en el portafolio (si no, en el inicio se abría el visor en vez de ir al proyecto); más elementos en `ELEMENTOS_QUE_APARECEN`.
  - Categorías corregidas: Flama pasa de «Branding & Diseño Textil» a «Branding & Merchandising» (las camisetas se diseñaron y se hicieron mockups, no se imprimieron) y 1076 Perfumería de «Pauta Publicitaria» a «Campaña Publicitaria» (la pauta es pagar por mostrar los anuncios; acá se hicieron las piezas y el video).
  - Los textos de las páginas son lo que Santiago contó de cada trabajo: materia y semestre, herramientas, su rol y la idea.

- **2026-10-30** — `index.html`, Habilidades: «3D Max» → «3ds Max» y se agregó «Figma» (antes de UI/UX).

- **2026-10-29** — **Favicon**: tu muñequito (de `img/avatar.webp`) sale en la pestaña del navegador en las 6 páginas.
  - Archivos nuevos: `img/favicon.png` e `img/apple-touch-icon.png`.
  - Los 6 HTML: 2 líneas `<link rel="icon">` y `<link rel="apple-touch-icon">` en el `<head>`, justo antes de `css/styles.css`.
  - Los juegos abiertos solos siguen con su propio ícono.

- **2026-10-29** — Juegos actualizados (copiados de sus repositorios a `juegos/`). No cambió ninguna página del portafolio.
  - **Galaxy Gol 3.9**: pantalla "Prepara tu equipo" después de elegir el modo, perfiles guardados, pantalla "Perfiles" y ranking con el mayor puntaje de cada persona.
  - **COSMOBALL**: pilotos guardados como botones en "Prepara tu nave" y "En línea"; "Iniciar sesión" pasa a llamarse "👤 Pilotos".

- **2026-10-29** — Galaxy Gol pasa a la **versión 3.8** (copiado de su repositorio):
  - **velocidad progresiva** por tiempo
  - **historial de partidos** en LocalStorage, con pantalla Récords y botón Reiniciar estadísticas

- **2026-10-29** — **Botón de modo claro / oscuro** (lo pide el Segundo Previo).
  - `js/tema.js` es nuevo y va en el `<head>` de las 6 páginas.
  - `main.js`: parte 19 nueva.
  - `styles.css`: bloque `html[data-tema="claro"]` en la parte 1, variables nuevas (`--espacio-header`, `--espacio-titulo`, `--espacio-acento-texto`, `--espacio-placeholder`) y el estilo `.tema-boton`.

- **2026-10-28** — Páginas de los juegos (`cosmoball.html` y `futbol.html`) más limpias.
  - Debajo del juego solo queda el botón **"Volver a la nave"**.
  - Se quitaron las tarjetas de instrucciones, el texto de ayuda y los botones "Abrir solo el juego" y "Ver el código en GitHub".
  - Las instrucciones siguen dentro de cada juego: "Cómo jugar" en COSMOBALL y "Controles" en Galaxy Gol.
  - Se borraron sus estilos en `styles.css` y `.juego__tarjeta` de `main.js`.

- **2026-10-28** — Galaxy Gol pasa a la **versión 3.7**: tiene botón de pantalla completa desde el inicio y en todos los menús (copiado de su repositorio).

- **2026-10-28** — **Galaxy Gol en el portafolio.**
  - `futbol.html` dejó de ser temporal: ahora tiene el juego, que va en `juegos/galaxy-gol/` (copia del repositorio `galaxy-gol`, versión 3.6).
  - El planeta verde ahora dice "Fútbol 4 contra 4 · contra Zorp, 2 jugadores o en línea".

- **2026-10-28** — **COSMOBALL en el portafolio.**
  - Nueva página `cosmoball.html`. El juego va en `juegos/cosmoball/`, que es una copia del repositorio `cosmoball`.
  - El planeta Galaxy Pong ahora es el agujero negro de COSMOBALL.
  - Se borró `pingpong.html`.
  - `styles.css`: estilos `.juego` en la parte 11. `main.js`: parte 18 nueva.
  - El juego tiene **multijugador en línea** con salas de código. Funciona con internet en la página publicada; los detalles están en `juegos/cosmoball/NOTAS.md`.

- **2026-10-28** — **Sección de Juegos (Arcade).**
  - Nuevos:
    - `juegos.html`: nave + 3 planetas (Galaxy Gol, Galaxy Pong, Próximamente).
    - `futbol.html` y `pingpong.html` (temporales).
  - `styles.css`: parte 11 nueva.
  - `main.js`: parte 16 nueva (el viaje de la nave). "Encender todo" ahora es la parte 17.
  - Menú: se agregó "Juegos" entre "Portafolio" y "Contacto" en todas las páginas.
  - En la página de Juegos no se muestra texto de ayuda de teclado. Igual se puede jugar con Tab + Enter.

- **2026-10-28** — **Tema espacial.**
  - `styles.css`:
    - colores `--espacio-*` y `color-scheme: dark` en `:root`
    - parte 10 nueva: cielo con estrellas, planeta, órbita del avatar y paneles oscuros
    - las partes 2 a 9 no se tocaron
  - `main.js`:
    - confeti de estrellitas
    - botón volver arriba ahora es un cohete que despega
    - parte 14 nueva: estrellas fugaces
    - mensaje secreto del avatar: "Bienvenido a la galaxia Santisarm"
  - Los HTML no cambiaron.

- **2026-10-18** — `blog.html`, línea 100 (Revista Up Date): "En conjunto con un compañero" → "En conjunto con Santiago Daniel Colmenares".
- **2026-10-18** — **JavaScript agregado** (`js/main.js`, nuevo). Efectos: aparecer al bajar, header compacto, volver arriba, texto que se escribe, avatar sorpresa, habilidades que rebotan, copiar correo, filtros, visor de imágenes, inclinación 3D y formulario con mensaje de gracias + `mailto:`.
  - `styles.css`: parte 9 nueva (no se cambió nada de las partes 1–8).
  - Los 3 HTML: línea `<script>` en el `<head>`.
  - `blog.html`: botones de filtro + `data-filtro` en cada tarjeta.
- **2026-10-08** — `styles.css`, `.nav__lista`: agregado `padding: 0; margin: 0;`. Bootstrap movía el menú en `contacto.html`; ahora se ve igual en las 3 páginas. También se limpió un comentario viejo en `.contacto-rapido__subtitulo`.
