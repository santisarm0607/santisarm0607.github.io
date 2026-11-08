# Galaxy Invasion — NOTAS del proyecto

Shooter en primera persona (FPS) en 3D de invasión alienígena, hecho con HTML, CSS y JavaScript (sin frameworks) y **Three.js** por CDN.
Creado por **SantiSarm** (David Santiago Sarmiento Salguero) para el curso Ingeniería Web — Ingeniería Multimedia, Universidad Simón Bolívar.

Este archivo explica cómo está hecho el juego para que otra persona (o una IA) pueda seguir trabajando en él.

---

## 1. La historia (resumen)

**Rosa y Tomás Méndez** son hermanos y tienen una granja en el pueblo de San Isidro. La noche de la invasión, un platillo de la Colmena se lleva a uno de los dos. El jugador escoge con quién juega (granjera o granjero) y el otro es el secuestrado. La meta de toda la historia: cruzar la granja, la carretera, la ciudad y la nave nodriza hasta llegar al **planeta de la Mente Colmena** y rescatar al hermano y a los demás humanos secuestrados.

| Etapa | Nombre | Estado |
|---|---|---|
| 1 | La granja: defender la granja de los Babosos, conseguir las llaves y salir manejando la camioneta. Jefe: Bestia de Heno | **Jugable (v0.6)** |
| 2 | La carretera: sigue sin cortes desde la granja. Manejar hacia la ciudad hasta que el Lanzador salta del maizal y destroza la camioneta; pelea a pie y luego llegar caminando a la ciudad | **Jugable (v0.6)** |
| 3 | La ciudad: cruzarla hasta la nave, rescatar soldados, romper el bloqueo. Jefe: el Guardián de la nave | **Jugable (v0.5)** |
| 4 | La nave nodriza: hangar, cuarto de armas (pista: el sombrero), sabotear 3 motores, grabación (pista 2) y cabina. Jefe: el Capitán. Se huye en una cápsula de escape | **Jugable (v0.7)** |
| 5 | El planeta colmena: fábrica, fuente de alimento y núcleo. Jefa: la Mente Colmena | v0.8 |

Final: al vencer a la Mente Colmena, Rosa descubre que los aliens huían de algo peor ("Continuará…").

---

## 2. Cómo abrirlo

1. Abre la carpeta `galaxy-invasion` en Visual Studio Code.
2. Clic en **Go Live** (abajo a la derecha) o clic derecho en `index.html` → **Open with Live Server**. Te lleva solo a `html/index.html`, que es el juego.
3. Necesita internet la primera vez (Three.js y las letras vienen de internet).

> No funciona con doble clic en `index.html` (`file://`), porque los módulos de JavaScript necesitan un servidor. Live Server lo resuelve.

**Para probar en el celular:** conecta el celular al mismo wifi del computador y abre `http://IP-DEL-COMPUTADOR:5500` (Live Server muestra el puerto). El juego pide ponerlo en horizontal.

---

## 3. Archivos

```
galaxy-invasion/
├── index.html          Solo lleva al juego (abre html/index.html). Así "Go Live" funciona directo
├── html/index.html     Estructura: lienzo 3D, HUD, controles táctiles y todas las pantallas
├── css/style.css       Estilos (colores en :root, HUD, menús, controles táctiles)
├── img/                platillo.svg (logo) e icono.svg (pestaña)
├── sonidos/            Vacía: aquí van tus sonidos cuando los tengas (ver LEEME.md)
├── javascript/         Todo el código JavaScript (un archivo por tema)
│   ├── config.js         TODOS los números del juego (vida, daño, armas, rareza, aliens, misión...)
│   ├── etapas.js         Las 5 etapas del Modo Historia: nombre, estado, textos de inicio y de victoria
│   ├── main.js           Arranque, carga de etapas, estados del juego y bucle principal
│   ├── entrada.js        Teclado, mouse y pantalla táctil → "acciones"
│   ├── jugador.js        Movimiento, salto, vida, escudo, baba y cámara
│   ├── armas.js          Arsenal: 3 armas con rareza, disparo, perdigones, recarga, cambio de arma
│   ├── enemigos.js       Base de los aliens + Zángano, Babosito y Babosón, proyectiles, ondas y charcos
│   ├── enemigos-ciudad.js  Soldado alien (dispara plasma) y Bruto (carga de frente)
│   ├── jefes.js          Jefes: Bestia de Heno, Lanzador y Guardián de la nave
│   ├── jefes-nave.js     Jefe de la Etapa 4: el Capitán
│   ├── vehiculo.js       La camioneta: manejar, chocar, atropellar y cámara de persecución
│   ├── aliados.js        Soldados rescatados que siguen a Rosa y disparan
│   ├── barriles.js       Barriles de combustible que explotan
│   ├── misiones-granja.js    Pasos de la Etapa 1
│   ├── misiones-carretera.js Pasos de la Etapa 2
│   ├── misiones-ciudad.js    Pasos de la Etapa 3
│   ├── misiones-nave.js      Pasos de la Etapa 4 (pistas, motores, Capitán, escape)
│   ├── mundo-granja.js   Mapa de la granja: 400 × 400 m (la granja con cerca en el medio + alrededores)
│   ├── mundo-carretera.js  Mapa de la carretera (1 km de largo)
│   ├── mundo-ciudad.js   Mapa de la ciudad (avenida, 2 cruces y la plaza bajo la nave)
│   ├── mundo-nave.js     Mapa de la nave nodriza por dentro (salas, pasillos, puertas, ventanal)
│   ├── mundo.js          Herramientas de todos los mapas (choques, humo, juntar objetos)
│   ├── modelos.js        Modelos 3D generales: armas en primera persona, zángano, cofre, ciudad, nave
│   ├── modelos-granja.js Modelos 3D de la granja: Rosa, Babosos, casa, granero, silo, maíz...
│   ├── modelos-jefes.js  Modelos de los 3 jefes y sus partes (sacos, escudo, generadores)
│   ├── modelos-carretera.js  Rocas, muro de baba, postes y señales
│   ├── modelos-ciudad.js Soldado alien, Bruto, aliados, edificios con ventanas, barricada
│   ├── modelos-nave.js   Cápsulas, motores, consola, sombrero, puertas, el Capitán y el planeta colmena
│   ├── efectos.js        Partículas y trazos de bala
│   ├── sonido.js         Sonidos y música con Web Audio
│   ├── interfaz.js       Pantallas, HUD, flecha del objetivo, diálogos y logros
│   ├── minimapa.js       Minimapa redondo del HUD (gira con Rosa)
│   ├── personaje.js      Granjera (Rosa) o granjero (Tomás), hermanos: nombres en los textos ({nombre}, {pareja}...)
│   ├── cinematica.js     Escena del secuestro al empezar la granja (cámara, diálogos, platillo y rayo)
│   ├── presentacion.js   v0.8: la primera vez que ves un monstruo, la cámara lo muestra formándose + su ficha
│   ├── misiones-extra.js v0.8: misiones opcionales de la granja (los Ortiz, nidos, cofres escondidos)
│   ├── nidos.js          v0.8: Nido de la Colmena (no se mueve, hace nacer Babositos)
│   ├── granadas.js       v0.8: granadas que rebotan y explotan
│   ├── mochila.js        v0.8: botiquines guardados, granadas y objetos importantes
│   └── guardado.js       Guardar/cargar en localStorage
└── NOTAS.md            Este archivo
```

---

## 4. Cómo funciona por dentro

### Estados del juego (`main.js`)
`menu` → `jugando` ⇄ `pausa` → `fin` (victoria o derrota) → `menu`.
**Historia continua:** al terminar una etapa sale el panel de victoria con sus datos. El botón **Continuar: (etapa siguiente)** llama a `continuarHistoria()`: estado corto `transicion` (pantalla negra), carga la etapa siguiente y Rosa sigue como terminó (mismas armas y munición; si venía manejando, sigue manejando a la misma velocidad). `ganar()` guarda eso en `continuacion`. Cada etapa nueva es punto de control (vida y escudo llenos).
En el menú, la cámara vuela sobre la granja. Al jugar, la cámara pasa a los ojos de Rosa.

### Etapas (`etapas.js` + `cargarNivel()` en `main.js`)
Cada etapa tiene su **mapa** (`crearGranja`, `crearCarretera`, `crearCiudadCompleta` o `crearCiudad`) y su **lógica** (`MisionGranja`, `MisionCarretera`, `MisionCiudad` o `Zona`). Al cambiar de etapa se crea una escena 3D nueva.
Todos los mapas devuelven lo mismo: `colisiones`, `solidos`, `puntosAparicion`, `suministros`, `cofres`, `limite`, `nieblaBase`, `actualizar()` y `camaraMenu()`.
Todas las lógicas tienen: `reiniciar(paso)`, `actualizar()`, `puntoInicio()`, `objetivoPosicion()` (para la flecha), `interactuables()` (cosas para usar con E), `textoObjetivo()` y `puntoControl`.
**Para agregar una etapa nueva:** crear su `mundo-xxx.js` y su `misiones-xxx.js` con esas mismas funciones, ponerla en `etapas.js` y en `cargarNivel()`.

### El bucle (60 veces por segundo)
1. `entrada.leer()` devuelve las acciones del cuadro (moverse, mirar, disparar, cambiar arma...).
2. Ayuda al apuntar (solo celular, si está activada).
3. Si Rosa pisa baba, camina a la mitad de velocidad.
4. `jugador.actualizar()` mueve a Rosa y la cámara.
5. `arsenal.actualizar()` dispara rayos (`Raycaster`) desde el centro de la pantalla.
6. `enemigos.actualizar()` mueve a los aliens, sus escupitajos y los charcos.
7. `logica.actualizar()` avanza la misión.
8. Se revisan suministros, cofres y cosas para usar; se mueve la flecha del objetivo; se cambia la música y se dibuja el HUD.

### La camioneta (`vehiculo.js`) — Etapas 1 y 2
- **W/S** acelerar, frenar y reversa; **A/D** girar; **E** subir o bajar (solo si vas a menos de `vehiculo.velocidadParaBajar`). En el celular: el joystick maneja y el botón Usar sube y baja.
- Mientras Rosa maneja no puede disparar: el arma se esconde, la cámara va detrás de la camioneta y aparece el velocímetro.
- **Chocar** fuerte hace daño a Rosa. **Atropellar**: los aliens pequeños mueren y los grandes reciben `danioAtropelloGrande`.
- En la granja solo se puede subir con las llaves y después de vencer a la Bestia (`MisionGranja.puedeSubir()`); antes dice "Camioneta (bloqueada)".
- **Averiada** (`vehiculo.averiar()`): la destroza el Lanzador. Echa humo y fuego, no arranca y no se puede subir; queda como cobertura.
- (v0.5) Las rocas y autos que lanza el Lanzador marcan en rojo dónde van a caer. Desde la v0.6 solo los lanza en la pelea a pie.

### La misión de la carretera (`misiones-carretera.js`)
| Paso | Qué pasa | Termina cuando |
|---|---|---|
| 0 | Manejar (Rosa ya viene en la camioneta desde la granja). Grupos de aliens en la vía para atropellar | Llega a `distanciaAtaque` metros de `zJefe` |
| 1 | **Emboscada:** el Lanzador salta desde el maizal (`tiempoSalto`), cae delante y destroza la camioneta (`danioAtaque`). Rosa sale sola a los `esperaBajarse` segundos | Rosa está a pie |
| 2 | **Jefe: el Lanzador** junto a la camioneta rota. Reventar sus 3 sacos de baba y luego dispararle a la cabeza. Escombros cierran la vía | El Lanzador muere |
| 3 | A pie hasta la entrada de la ciudad (salen unos aliens más) | Rosa pasa la meta |

Puntos de control: 0 y 2. El muro de baba de la v0.5 sigue en el mapa pero apagado (`muro.reiniciar(true)`).

### La misión de la ciudad (`misiones-ciudad.js`)
| Paso | Qué pasa | Termina cuando |
|---|---|---|
| 0 | Avanzar por la avenida | Llega al primer cruce |
| 1 | Soldados atrapados en la calle de la derecha (6 aliens) | Se acaban los aliens y Rosa los rescata (E) |
| 2 | Seguir con los 2 soldados | Llega al segundo cruce |
| 3 | Bloqueo: Brutos, Soldados alien y Zánganos | No queda ninguno del bloqueo |
| 4 | Llegar a la plaza | Entra a la plaza |
| 5 | **Jefe: el Guardián**. Su escudo lo alimentan 3 generadores: romperlos y dispararle al núcleo. Al 50 % el escudo vuelve | El Guardián muere |
| 6 | La nave baja un rayo | Rosa entra al rayo |

Mientras más cerca de la nave, más aliens al tiempo y más seguido (`CONFIG.ciudad.tramos`). Los **aliados** siguen a Rosa, le disparan al alien más cercano y no pueden morir (los aliens solo atacan a Rosa). Mientras Rosa maneja se esconden.

### Jefes (`jefes.js`)
Todos heredan de `Enemigo` con `esJefe = true`. Tienen `pista` (el texto bajo la barra), `aviso` (mensaje grande que muestra `main.js`) y `mostrarBarra` (el Lanzador, mientras acompaña la camioneta, no muestra barra).
- **Bestia de Heno:** el heno casi no recibe daño; quemarla con un barril o hacerla chocar en la embestida deja el núcleo expuesto. Golpe al suelo (se esquiva saltando), lanza pacas, llama Babositos.
- **Lanzador:** 3 sacos de baba en el pecho; al reventarlos todos, la cabeza recibe daño. Lanza rocas en arco, pisotón con onda, suelta crías.
- **Guardián de la nave:** escudo de burbuja alimentado por 3 generadores; orbes que persiguen, láser (franja roja de aviso), pisotón y refuerzos. Fase 2 al 50 %.
- **El Capitán** (`jefes-nave.js`): flota por la cabina. Su armadura solo deja pasar el 20 % del daño; la **gema del pecho** recibe 160 % pero solo cuando brilla (3 s después de embestir, y un momento después de una ráfaga o de la lluvia de orbes). Ataques: ráfaga de 5 tiros de plasma, teletransporte, embestida (franja roja de aviso). Fase 2 al 50 %: lluvia de orbes y refuerzos.

### La misión de la nave (`misiones-nave.js`)
| Paso | Qué pasa | Termina cuando |
|---|---|---|
| 0 | Llegada al hangar (cápsulas vacías). Salen pocos aliens | Rosa entra al cuarto de armas |
| 1 | Oleada en el cuarto de armas (`nave.oleadaArmas`) | No queda ninguno |
| 2 | **Pista 1:** el sombrero del hermano brilla en el suelo | Rosa lo revisa (E) → se abre la puerta |
| 3 | Ir a la sala de motores | Entra a la sala |
| 4 | Sabotear los 3 motores (dispararle al núcleo morado, `nave.vidaMotor` cada uno). Siguen saliendo aliens | Los 3 explotan → alarma roja |
| 5 | **Pista 2:** la consola recibe una grabación (registro de carga y la voz del hermano) | Termina la grabación → se abre la puerta |
| 6 | Ir a la cabina | Entra a la cabina (la puerta se cierra detrás) |
| 7 | **Jefe: el Capitán** | El Capitán muere |
| 8 | Las cápsulas de escape se abren | Rosa sube a la cápsula (E) → fin de la etapa |

Las puertas (`mundo.puertas`) son cajas de choque que se apagan al abrirse (`inactiva`) y la hoja sube. Los motores son "blancos" (`userData.blanco`) como los barriles.

### Acciones (preparado para multijugador)
Rosa **no lee el teclado**: recibe un objeto de acciones `{ adelante, lado, mirarX, mirarY, disparar, apuntar, correr, saltar, recargar, usar, linterna, cambiarArma }`. En el multijugador (v1.x), las acciones de otro jugador llegarán por internet (PeerJS) y se usará el mismo `jugador.js`.

### La misión de la granja (`misiones-granja.js`)
| Paso | Qué pasa | Termina cuando |
|---|---|---|
| 0 | "Revisa el corral" (flecha hacia el corral) | Rosa llega a menos de 14 m del corral |
| 1 | 6 Babositos atacan el corral | No queda ninguno |
| 2 | "Busca las llaves en el granero". Al acercarse: emboscada (5 Babositos + 1 Babosón) | Rosa toma las llaves (E) |
| 3 | **Jefe: la Bestia de Heno** (sale de las pacas al salir del granero con las llaves) | La Bestia muere |
| 4 | "Sube a la camioneta": siguen saliendo Babositos del maíz | Rosa sube (E) |
| 5 | Manejar: por el portón del norte a la carretera y hacia el este (flecha al portón y luego a la salida) | La camioneta pasa `granja.salidaX` → empieza la carretera |

Cada paso es un **punto de control**. Al morir, Rosa vuelve al inicio del paso con vida y escudo llenos y con las armas que tenía al llegar a ese punto.

### Armas (`armas.js`)
- Hasta **3 armas**: escopeta vieja (con la que empiezas), pistola M9 y rifle de caza.
- **Rareza:** común, rara, épica y legendaria. Cambia daño, recarga, cadencia y tamaño del cargador (ver `CONFIG.rarezas`). El color de la rareza se ve en una franja del arma y en el HUD.
- **Escopeta:** dispara 8 perdigones; el daño baja con la distancia (de 10 a 30 m).
- **Rifle:** es de cerrojo (hay que soltar el gatillo entre tiros) y tiene mira telescópica al apuntar.
- **Munición por tipo:** cartuchos (escopeta) y balas (pistola y rifle).
- **Cofres:** dan un arma al azar (más probable una que no tengas). Si ya tienes ese tipo y la nueva es mejor, la cambias; si no, se convierte en munición. Si tienes las 3 armas, reemplaza la que llevas en la mano.
- Las armas se **guardan** y se conservan entre partidas y etapas.

### Aliens (`enemigos.js`)
Todos heredan de la clase `Enemigo` (aparecer, perseguir, esquivar obstáculos, separarse, avisar antes de atacar, morir).
- **Babosito:** pequeño y rápido. Al morir deja un charco de baba.
- **Babosón:** grande y lento. De lejos (6 a 26 m) **escupe** bolas de baba que caen en arco y dejan charcos; de cerca golpea. Suelta munición el 50 % de las veces.
- **Zángano** y **Mini zángano:** los de la ciudad.
- **Soldado alien:** se mueve de lado, carga el disparo (brilla) y dispara plasma en línea recta. De cerca golpea.
- **Bruto:** grande y lento; se prepara (gruñe) y **carga de frente**. Hay que esquivarlo hacia un lado.
Los charcos hacen que Rosa camine a la mitad de velocidad (y se ve un borde verde en la pantalla).

### Choques
Paredes, autos, cercas y construcciones son cajas vistas desde arriba (`colisiones`). Rosa y los aliens son círculos; `resolverColisiones()` (en `mundo.js`) los empuja fuera de las cajas.

### Guardado (`guardado.js`)
Clave `galactic-invasion-guardado-v1` en `localStorage`: opciones, logros, armas, estadísticas (aliens eliminados, disparos...) y progreso (etapas completadas y mejores tiempos). Las partidas guardadas en la v0.1 se convierten solas al formato nuevo. (La clave conserva el nombre viejo "galactic" a propósito: así no se pierde el progreso guardado al cambiar el nombre a Galaxy Invasion.)

### Sonido (`sonido.js`)
Todo se fabrica con Web Audio: osciladores + ruido filtrado. 111 efectos, el motor continuo de la camioneta y 4 músicas (menú, exploración, combate y jefe) que se mezclan suavemente. Cada sonido tiene un nombre de archivo en `ARCHIVOS`; si pones archivos en `sonidos/` y cambias `CONFIG.audio.usarArchivos` a `true`, se usan los tuyos.

### Rendimiento (celular)
- Modelos low poly con materiales compartidos.
- **Objetos quietos juntados** (`fusionarEstaticos()` en `mundo.js`): todas las piezas que nunca se mueven y tienen el mismo color se dibujan como una sola. La granja pasó de ~700 a ~200 dibujos por cuadro.
- El maíz y los árboles usan `InstancedMesh` (miles de tallos en un solo dibujo).
- Opción de calidad: **baja** (menos resolución, más niebla, la mitad del maíz y **sin focos de luz**), media o alta.
- Partículas reutilizadas (no se crean objetos nuevos al disparar).

---

## 5. Cómo balancear el juego
Todo está en `javascript/config.js`. Ejemplos:
- Más difícil: subir `enemigos.babosito.velocidad`, `granja.babositosCorral` o `enemigos.baboson.danioEscupitajo`.
- Más fácil: subir `jugador.vidaMax`, `armas.escopeta.danio` o `municion.cartuchos.inicial`.
- Más armas legendarias: subir `rarezas.legendaria.probabilidad` (y bajar otra para que sumen 1).

---

## 6. Para probar rápido (consola del navegador, F12)
`window.juego` da acceso a todo. Ejemplos:
- `juego.jugador.vida = 1000` → casi inmortal.
- `juego.arsenal.agregarArma('rifle', 'legendaria')` → rifle legendario.
- `juego.arsenal.municion.cartuchos = 40` → cartuchos llenos.
- `juego.nivel.logica.iniciarPaso(3)` → saltar a la huida.
- `juego.empezarPartida('carretera')` o `juego.empezarPartida('ciudad')` → ir directo a una etapa.
- `juego.nivel.logica.reiniciar(2); juego.colocarJugador()` → saltar al jefe de la carretera (en la ciudad, el jefe es el paso 5).
- `juego.vehiculo.colocar(0, -690, 0)` en la carretera, manejando → ver la emboscada del Lanzador.
- En la granja: `juego.nivel.logica.reiniciar(4); juego.colocarJugador()` → la camioneta ya se puede manejar.

---

## 7. Historial de versiones

### v0.8 — 7 de noviembre de 2026 · Más mecánicas, granja abierta y presentaciones
- **Arreglos:** ya no hay pared invisible al salir de la granja (el mapa ahora mide 400 × 400 m y el borde es un bosque cerrado; al oeste de la carretera hay un derrumbe). La **camioneta gira como un carro de verdad**: el volante se mueve suave, despacio gira cerrado y rápido gira más abierto (`CONFIG.vehiculo`: anguloRuedas, distanciaEjes, rapidezVolante, giroMax, agarre). Las llantas de adelante giran.
- **Movimientos más naturales:** Rosa arranca y frena con un poco de peso (`aceleracion` / `frenado`), la cabeza se balancea de lado al caminar y la cámara se ladea un poquito al moverse de lado. Los aliens aceleran, frenan y giran con inercia (`agilidad`).
- **Presentación de monstruos:** la primera vez que un monstruo aparece cerca (o un jefe), todo se detiene: la cámara vuela hasta él, lo muestra formándose y sale su ficha (qué hace y cómo vencerlo). Se guarda en `datos.bestiario`. Textos en `CONFIG.bestiario`; se apaga con `CONFIG.presentaciones.activa = false`.
- **Tarjeta de misión:** cada vez que empieza un objetivo nuevo sale la tarjeta "NUEVA MISIÓN" (y "MISIÓN EXTRA" en celeste).
- **Granadas (G):** vuelan en arco, rebotan, la luz parpadea y explotan (también hacen explotar barriles y queman a la Bestia). Empiezas con 2, máximo 6. Cajas de granadas en el mapa y a veces las sueltan los aliens.
- **Golpe con el arma (V):** culatazo a lo que tengas de frente, lo empuja.
- **Mochila (Tab o I; botón en el celular):** botiquines guardados (si recoges uno con la vida llena; máximo 3; se usan con H), granadas y objetos importantes (llaves, carta de los Ortiz, muestra de nido, sombrero de tu hermano, grabación). Se guarda con la partida.
- **Granja más grande y libre:** la cerca tiene huecos al oeste, sur y este. Alrededores: granja de los Ortiz (oeste), laguna con muelle (sur; el agua te hace ir lento), cabaña del cazador (este, en el bosque), gasolinera abandonada (norte de la carretera), bosquecitos y rocas. La salida en camioneta es hacia el este por la carretera (`granja.salidaX = 186`).
- **Misiones extra (granja):** *Los Ortiz* (rescatarlos de los babosos en su granero), *Nidos de la Colmena* (destruir 3 nidos) y *Cofres escondidos* (3 cofres con armas épicas/legendaria). Salen en el minimapa (rombos) y en una lista bajo el objetivo. Lo hecho se guarda en `datos.extras` (se borra con Nueva partida).
- 6 logros nuevos (25 en total): Buen vecino, Sin nidos, Buscador, Conoces San Isidro, ¡Bombazo!, Culatazo. 12 sonidos nuevos (111 efectos).
- Plan: la v0.9 hace igual de abiertas la carretera y la ciudad, con sus misiones extra.

### v0.7 — 31 de octubre de 2026 · La nave nodriza
- **Etapa 4 "La nave nodriza"** jugable: el rayo de la ciudad te deja en el hangar (cápsulas vacías donde guardaban a la gente). Cuarto de armas con oleada, sala de motores, cabina con ventanal (se ve el planeta colmena) y cápsulas de escape. Todo bajo techo, con puertas que se abren al cumplir cada paso y alarma roja al sabotear los motores.
- **Pistas del hermano:** su sombrero en el cuarto de armas y una grabación en la consola: se lo llevaron al planeta de la Mente Colmena con 214 personas más ("No vengas… es una trampa").
- **Jefe: el Capitán**, que flota, se teletransporta, dispara ráfagas de plasma, embiste y en la fase 2 lanza lluvia de orbes y llama refuerzos. Solo se le hace daño de verdad en la gema del pecho cuando brilla.
- La ciudad ahora sigue a la nave con **Continuar** (historia continua). Al terminar la nave el botón dice "Etapa 5 llega en la v0.8".
- 3 logros nuevos (19 en total): Motores fuera, Sin capitán y Rumbo a la Colmena. 7 sonidos nuevos (99 efectos): puerta, motor roto, alarma, holograma, teletransporte, risa y muerte del Capitán.
- Los diálogos pueden tener otro que habla ("Grabación:", "Tomás:"): `ui.subtitulo(texto, segundos, hablante)`.
- Pantalla de carga: si el juego no arranca, explica por qué (abierto con doble clic, un archivo que no cargó o sin internet).

### v0.6.6 — 23 de octubre de 2026 · Carpetas separadas
- Cada tipo de código en su carpeta: `html/` (index.html), `css/` (style.css) y `javascript/` (antes `js/`). Las rutas del HTML ahora empiezan con `../` y los sonidos propios se buscan en `../sonidos/`.
- En la raíz queda un `index.html` mínimo que redirige a `html/index.html`, para que Live Server abra el juego con "Go Live".

### v0.6.5 — 22 de octubre de 2026 · Nueva partida y Continuar partida
- Menú: **Continuar partida** (dice con quién vas y en qué etapa: "Rosa · Etapa 2: La carretera"), **Nueva partida**, **Elegir etapa** (antes "Modo Historia") y abajo Logros, Opciones, Controles y Créditos en botones chicos.
- La partida se guarda sola en `datos.partida` (localStorage): al empezar una etapa, en cada punto de control y al ganar (ya apuntando a la etapa siguiente). Guarda etapa, punto de control, personaje y armas con munición (`arsenal.copiaGuardable()` / `cargarCopia()`).
- **Continuar** carga ese punto exacto (sin la escena del secuestro). Al terminar la ciudad el botón dice "Etapa 4 llega en la v0.7".
- **Nueva partida** pregunta antes de borrar la partida guardada (logros y récords se quedan), vuelve a la escopeta común y lleva a elegir granjera o granjero y a la escena del secuestro.
- Jugar una etapa desde "Elegir etapa" también pasa a ser la partida guardada.

### v0.6.4 — 22 de octubre de 2026 · El secuestro (el motivo de la historia)
- **Rosa y Tomás Méndez son hermanos.** Al empezar la granja hay una **escena de unos 24 s** (`javascript/cinematica.js`): un platillo de la Colmena baja y se lleva con un rayo verde **al hermano que no escogiste**; el que juegas sale corriendo de la casa y promete encontrarlo. Se salta con el botón "Saltar", Enter, Espacio o Esc. Se apaga con `CONFIG.cinematica.activa = false`.
- **Nueva meta de la historia:** llegar al planeta de la Mente Colmena para rescatar al hermano y a los demás humanos secuestrados. Cambiaron los textos de la granja, la ciudad, la nave, el planeta, la pantalla de etapas y algunos diálogos (`{pareja}`, `{tuPariente}`, `{suPariente}`, `{NOMBRE}`, `{PAREJA}`).
- Modelos nuevos en `javascript/modelos-granja.js`: `crearGranjero()` (Tomás: camisa azul, barba, 1,80 m), `crearPlatillo()` y `crearRayoAbduccion()`. Rosa y Tomás salen de la misma función (`crearPersonaGranja`).
- 3 sonidos nuevos hechos con código: `platilloLlega`, `abduccion` y `platilloSeVa` (92 efectos en total).

### v0.6.3 — 22 de octubre de 2026 · Sin Calle Principal
- Se quitó la **Calle Principal** (la demo de oleadas de la v0.1): ya no sale en el Modo Historia. Se borraron `javascript/zona.js`, el mapa de la calle en `javascript/mundo.js`, `CONFIG.zona` y el logro "Calle despejada" (quedan 16 logros).
- Los zánganos siguen en el juego (salen en la ciudad).

### v0.6.2 — 22 de octubre de 2026 · Granjera o granjero
- Antes de empezar una etapa (pantalla de la historia) se elige **Granjera (Rosa Méndez)** o **Granjero (Tomás Méndez)**. Se guarda en las opciones.
- Cambia: el nombre en los diálogos ("Tomás: ..."), los textos de la historia, el lema del menú ("Un granjero contra la Colmena"), cómo le dicen los soldados ("señora" / "señor") y el color de la camisa de los brazos (roja / azul).
- Datos en `CONFIG.personajes` (nombre, tipo, trato, colores). Los textos usan `{nombre}`, `{completo}`, `{tipo}`, `{Un}` y `{trato}`, que completa `textoPersonaje()` de `javascript/personaje.js`.
- En los comentarios del código el personaje se sigue llamando "Rosa" (vale para los dos).

### v0.6.1 — 22 de octubre de 2026 · Nuevo nombre
- El juego pasa a llamarse **Galaxy Invasion** (antes Galactic Invasion): título, logo, créditos, pantalla de carga y comentarios. La carpeta ahora es `galaxy-invasion`. El guardado no cambia (no se pierde el progreso).

### v0.6 — 21 de octubre de 2026 · De la granja a la carretera sin cortes
- **La camioneta se maneja en la granja**: al vencer a la Bestia, Rosa sube, sale por el **portón** del norte a la carretera y toma hacia el este. Al llegar al final de la granja sale el **panel de etapa completada**; con **Continuar** la Etapa 2 empieza con Rosa manejando, sin pasar por el menú.
- **Historia continua en todas las etapas:** el botón Continuar del panel de victoria lleva directo a la etapa siguiente (granja → carretera → ciudad) conservando armas y munición.
- **Emboscada del Lanzador**: ya no te acompaña tirando cosas. Manejas tranquila y, de la nada, salta desde el maizal, cae delante y **destroza la camioneta** (humo, fuego, daño). Rosa sale sola y pelea a pie; después sigue caminando hasta la ciudad.
- El **muro de baba** quedó apagado (el código sigue en el mapa).
- **Minimapa redondo** en todas las etapas: gira con Rosa, muestra aliens (rojo), jefe (morado), aliados (verde), la camioneta (azul), el objetivo (amarillo) y la N del norte. Se aleja cuando manejas. En el celular va debajo del objetivo.
- Granja: portón en la cerca del norte y sin árboles encima de la carretera. Antes de tiempo, la camioneta dice "bloqueada".
- Sin sonidos nuevos: la emboscada usa los que ya había (rugido, golpe al suelo, choques).
- **Guías en pausa:** por pedido de SantiSarm, las guías de modelos/animaciones y de sonidos ya no se entregan en cada versión; se harán cuando el juego esté en su versión final (las últimas son las de la v0.5).

### v0.5 — 21 de octubre de 2026 · La carretera y la ciudad (v0.4 y v0.5 juntas)
- **Etapa 2 "La carretera"** (1 km): la camioneta se maneja (W/S/A/D o joystick), velocímetro, cámara de persecución, choques y atropellos.
- **El Lanzador:** primero camina por el campo y lanza rocas y autos a la vía (marca en rojo dónde caen); después salta a la carretera y la bloquea: hay que bajarse y pelear (sacos de baba → cabeza).
- **Muro de baba** con emboscada: hay que bajarse y destruirlo a tiros.
- **Etapa 3 "La ciudad"**: avenida con edificios iluminados, 2 cruces y la plaza bajo la nave. Cada vez más aliens al acercarse.
- **Rescate de soldados** (Cabo Díaz y Soldado Ruiz): luego siguen a Rosa y disparan.
- Aliens nuevos: **Soldado alien** (plasma) y **Bruto** (carga).
- **Guardián de la nave**: escudo con 3 generadores, orbes, láser, pisotón, refuerzos y 2 fases. Al vencerlo, la nave baja un rayo.
- 6 logros nuevos (17 en total): En la carretera, Atrapa esto, Al volante, Nadie se queda atrás, Escudo roto y Rumbo a la nave.
- 29 sonidos nuevos (camioneta, Lanzador, plasma, aliados, escudo, láser, rayo...) y el motor continuo.
- La Calle Principal pasa a ser "Extra". El botón de una etapa ya terminada dice "Jugar otra vez".
- Arreglos: el Zángano normal ya no falla al aparecer desde una misión; con E, lo de la misión va primero que un cofre cercano.
- Granero: comprobado que se puede entrar caminando por el centro y por los dos lados de la puerta.

### v0.3 — 21 de octubre de 2026 · El jefe de la granja
- **Bestia de Heno** (jefe de la Etapa 1) con barra de vida, pistas, golpe al suelo, pacas lanzadas, embestida y núcleo expuesto.
- **Barriles de combustible** que explotan (también queman a la Bestia).
- Música de jefe y botón "Siguiente etapa" en la victoria.
- Logros: Hecha paja y Fuego al heno.
- Arreglo: el dintel del granero ya no bloquea la puerta.

### v0.2 — 21 de octubre de 2026 · La granja
**La historia cambia: ahora la protagonista es Rosa Méndez, una granjera.**
- **Etapa 1 "La granja"**: mapa de 188 × 188 m de noche, con casa, granero (se puede entrar), silo, corral, molino, pozo, tractores, camioneta, pacas de heno, barriles, campos de maíz, árboles, carretera y la nave nodriza a lo lejos sobre la ciudad.
- Misión en 4 pasos con **flecha hacia el objetivo** (con distancia), **diálogos de Rosa** y puntos de control.
- **Aliens de baba**: Babosito y Babosón (escupe baba). **Charcos de baba** que hacen ir más lento.
- **Armas con rareza**: escopeta vieja, pistola M9 y rifle de caza (con mira telescópica). 3 ranuras, cambio de arma con 1-2-3, la rueda o el botón táctil. Munición por tipo (cartuchos y balas).
- **4 cofres** con armas al azar.
- **Arreglo del botiquín**: con la vida llena avisa "VIDA LLENA" y se queda en el suelo. La munición avisa "MUNICIÓN LLENA".
- **Pantalla de etapas** del Modo Historia (las 5, con las que faltan bloqueadas).
- La **Calle Principal** de la v0.1 sigue jugable como demo de la Etapa 3.
- 4 logros nuevos: Fuera de mi granja, Limpieza de baba, Escopetazo y Coleccionista (9 en total).
- 22 sonidos nuevos (escopeta, rifle, babosos, baba, llaves, motor, armas nuevas...).
- Rendimiento: objetos quietos juntados y focos apagados en calidad baja.
- Celular: botón para cambiar de arma, nombre y rareza del arma en el HUD.
- La mira telescópica ya no tapa la vida, el escudo ni la munición.

### v0.1 — 20 de octubre de 2026
**Primera versión jugable** (protagonista: Sargento Reyes, en la Calle Principal).
- Zona "Calle Principal": plaza con cráter y cristal alien, 4 calles, edificios, autos, barreras, farolas, humo, nave nodriza y estrellas.
- Movimiento FPS para computador y celular. Pistola M9 con apuntar, recarga, retroceso, fogonazo y linterna.
- Enemigo: Zángano. 3 oleadas con descansos, punto de control y victoria con estadísticas.
- Vida + escudo, suministros, cofre, 5 logros, todas las pantallas, sonidos y 3 músicas con código, guardado en el navegador.

### Próximas versiones (plan)
- **v0.8+:** el planeta colmena y el final; Mundo Abierto (día/noche).
- **Más adelante:** la mochila de Rosa (objetos importantes).
- **v1.x:** multijugador cooperativo (2 a 4) y versus con PeerJS.
