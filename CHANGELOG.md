# Registro de cambios · EntryTech

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).

## [2.1.3] — 21 de octubre de 2026

### Seguridad

- **`POST /api/acceso` dejaba pasar peticiones anónimas.** La restricción por
  rol de la versión anterior solo actuaba cuando se presentaba un token. Sin
  ninguna credencial, un camino heredado dejaba seguir adelante: estaba
  pensado para no romper terminales físicos ya desplegados cuando
  `KIOSK_API_KEY` no estuviera configurada.

  En la práctica significaba que cualquiera en internet podía registrar
  entradas y salidas con solo conocer un código de carnet. **Comprobado contra
  el despliegue real**: una petición sin autenticar llegaba al controlador y
  devolvía 404 por código inexistente, no 401 por falta de permiso.

  El valor por defecto pasa a ser denegar. Un terminal físico se autentica con
  `KIOSK_API_KEY`; el simulador web, con la sesión del administrador.

### Verificación

| Petición a `/api/acceso` | Antes | Ahora |
|---|---|---|
| Sin credencial | Pasaba al controlador | 401 |
| Token de rol usuario | 403 | 403 |
| Token de rol administrador | Pasa | Pasa |

## [2.1.2] — 21 de octubre de 2026

### Seguridad

- **El simulador de kiosco queda restringido a administradores.** Cualquier
  empleado podía abrir el terminal de control y registrar la entrada o la
  salida de otra persona con solo conocer un código de carnet. Se corrige en
  los dos niveles:
  - La ruta `/simulador` pasa de `PrivateRoute` a `AdminRoute`, y el enlace
    desaparece del menú de los empleados.
  - `POST /api/acceso` exige rol de administrador cuando la autenticación es
    por sesión. Sin este cambio, ocultar el enlace habría sido una barrera
    puramente visual: bastaba con escribir la dirección o llamar a la API.
  - Un terminal físico permanente no debería usar la sesión de una persona;
    para eso sigue estando `KIOSK_API_KEY`.

- **El manual de usuario se filtra por rol.** Describía el panel de
  administración, la gestión de personal y el funcionamiento del terminal a
  todo el que lo abriera. No era un fallo de permisos, pero divulgaba el
  funcionamiento interno del control de acceso a quien no tiene por qué
  conocerlo. Las secciones restringidas se marcan con `soloAdmin` y la
  numeración se calcula al mostrar, para que un empleado vea 1, 2 y 3 y no
  queden huecos.

### Corregido

- **Una base de datos inaccesible tumbaba toda la API.** En tres controladores
  `pool.connect()` se llamaba fuera del `try`. Si el pool no podía entregar un
  cliente, el rechazo escapaba del manejador; Express 4 no captura errores
  asíncronos, Node lo trataba como rechazo no gestionado y terminaba el
  proceso. Una indisponibilidad momentánea de la base de datos dejaba el
  servicio caído en lugar de devolver un error a esa única petición.

  Se descubrió por accidente, al fallar una prueba de permisos: el servidor
  moría en mitad del intento. Verificado tras la corrección: con la base de
  datos caída, `/api/acceso` devuelve 500 y `/api/ping` sigue respondiendo 200.

- **Un cuerpo JSON malformado devolvía 500.** Correspondía un 400: el error es
  del cliente, no del servidor, y además ensuciaba los registros con fallos que
  no lo eran.

### Verificación

| Prueba | Resultado |
|---|---|
| `POST /api/acceso` con rol usuario | 403 |
| `POST /api/acceso` con rol admin | 500 (pasa permisos; sin base de datos en la prueba) |
| Cuerpo JSON inválido | 400 |
| `/api/ping` tras el fallo de base de datos | 200, el proceso sobrevive |
| Manual como empleado | 3 secciones, numeradas 1 a 3 |
| Manual como administrador | 6 secciones |
| Menú como empleado | Mi carnet, Manual de usuario |
| `/simulador`, `/dashboard`, `/usuarios` como empleado | Redirigen a `/carnet` |

## [2.1.1] — 21 de octubre de 2026

Corrección de los hallazgos de un análisis pasivo ZAP (HostedScan) sobre
`https://entry-tech.vercel.app/login`.

### Seguridad

Los hallazgos eran del **frontend en Vercel**, no del backend. Las cabeceras de
seguridad se habían implementado en Express, pero Vercel sirve archivos
estáticos y no pasa por ese código: no enviaba ninguna.

- **Cross-Domain Misconfiguration (medio).** Vercel añade por defecto
  `Access-Control-Allow-Origin: *` a los archivos estáticos. Se sustituye por el
  origen propio del sitio. Nada consulta estos archivos desde otro dominio, así
  que el comodín no aportaba nada y abría la puerta a lecturas cruzadas.
- **Missing Anti-Clickjacking Header (medio).** Se añaden `X-Frame-Options: DENY`
  y `frame-ancestors 'none'` en la CSP. El segundo es el mecanismo vigente; el
  primero se mantiene por compatibilidad con navegadores antiguos.
- **Content Security Policy Header Not Set (medio).** Se añade una política
  restrictiva, detallada más abajo.
- **X-Content-Type-Options Header Missing (bajo).** Se añade `nosniff`.
- **Strict-Transport-Security Header Not Set (bajo).** Ya estaba presente en la
  respuesta de Vercel al verificarlo (`max-age=63072000; includeSubDomains;
  preload`). Se declara igualmente de forma explícita para no depender de un
  comportamiento por defecto de la plataforma.

Cabeceras adicionales no incluidas en el informe:

- `Referrer-Policy: no-referrer`
- `Cross-Origin-Opener-Policy: same-origin`
- `X-Permitted-Cross-Domain-Policies: none`
- `Permissions-Policy: camera=(self), microphone=(), geolocation=(), payment=(),
  usb=(), interest-cohort=()`. La cámara se mantiene permitida en el propio
  origen porque el simulador de kiosco la necesita para leer los códigos QR:
  una política más estricta habría dejado esa pantalla inservible.

### Sobre la política de contenidos

`script-src 'self'` sin excepciones: la compilación de Vite no genera ningún
script en línea, de modo que no hace falta `'unsafe-inline'` ni *hashes*.

`style-src` sí incluye `'unsafe-inline'`, y conviene explicar por qué. La
interfaz usa atributos `style` de React en doce archivos, y esos atributos
quedan bloqueados sin esa excepción. La alternativa precisa, `style-src-attr`,
no tiene soporte uniforme entre navegadores: en los que la ignoran, la
aplicación se vería sin estilos. Se asume la excepción porque el riesgo de los
estilos en línea es muy inferior al de los scripts. Eliminarla exigiría trasladar
todos esos atributos a clases CSS, que queda anotado como mejora pendiente.

Orígenes permitidos: `fonts.googleapis.com` y `fonts.gstatic.com` para la
tipografía, `apod.nasa.gov` para el fondo diario, `data:` para las fotografías de
perfil en Base64 y el backend de Render para las llamadas a la API.

### Backend

Se añaden `Content-Security-Policy: default-src 'none'; frame-ancestors 'none';
base-uri 'none'` y `X-Permitted-Cross-Domain-Policies: none`. La API solo
devuelve JSON, no carga recursos ni se renderiza, así que la política más
estricta posible es también la correcta.

### Verificación

La configuración se probó antes de publicar, sirviendo la compilación de
producción desde un servidor local que aplica las cabeceras reales del
`vercel.json`. Sin violaciones de CSP en consola; tipografías, imágenes de fondo
y llamadas a la API funcionando; y `featurePolicy.allowsFeature('camera')`
devolviendo permitido, con micrófono, ubicación y pagos bloqueados.

## [2.1.0] — 21 de septiembre de 2026

### Cambiado

- **La foto de perfil se optimiza en el navegador antes de subirla**
  (`utils/imagen.js`). Se recorta a un cuadrado centrado y se reduce a 400 px de
  lado en JPEG de calidad 0,85. Una foto de móvil de 4.032 × 3.024 px, que
  ocupaba 1,33 MB codificada en Base64, pasa a 45,6 kB: **una reducción del
  96,6 %**, medida sobre el sistema. Mitiga la limitación de la sección 8.2 del
  documento del proyecto.
  - El recorte cuadrado evita que un retrato alargado se deforme dentro del
    avatar circular del carnet.
  - Se respeta la orientación EXIF mediante `createImageBitmap`: las fotos
    tomadas en vertical con el teléfono llevan la rotación en los metadatos y
    aparecían giradas 90 grados al dibujarlas en un lienzo.
  - Se rellena el fondo en blanco antes de dibujar, porque el JPEG no admite
    transparencia y las zonas transparentes de un PNG saldrían negras.
  - El tope del archivo de entrada sube de 2 a 10 MB: ya no protege a la base de
    datos, solo evita decodificar un archivo desmedido.

### Decidido

- **La ruta del simulador de kiosco sigue exigiendo sesión iniciada.** La
  historia HU036 pedía acceso público, pero un kiosco abierto permitiría a
  cualquiera con conexión registrar accesos ajenos conociendo un código de
  carnet. Es el único caso de la auditoría en que se corrige la historia y no el
  sistema. Para un terminal físico permanente existe `KIOSK_API_KEY`, que
  autentica al dispositivo sin exponer el endpoint.

### Añadido

- **Campo estelar interactivo en la pantalla de inicio** (`StarField.jsx`), en
  sustitución del fondo de partículas plano anterior:
  - Tres capas de profundidad con paralaje: se desplazan a distinta velocidad
    según la posición del puntero.
  - Las estrellas se apartan al acercarse el cursor y vuelven a su sitio con
    suavizado; las capas cercanas reaccionan más, lo que refuerza la sensación
    de profundidad.
  - Constelaciones entre las estrellas de la capa frontal y enlaces desde el
    propio cursor, que además aviva las estrellas que toca.
  - Titileo desincronizado por estrella y meteoros cada 5 a 11 segundos.
  - Funciona con el dedo en dispositivos táctiles.
- Nebulosas de fondo y viñeta perimetral (`.cielo-profundo`) para dar
  profundidad de cielo nocturno, más un título con resplandor.

- **Obturador de transición entre ambientes** (`TransicionAmbiente.jsx`). Dos
  paneles entran desde arriba y desde abajo, se encienden una línea luminosa y
  la marca en la juntura, la pantalla cambia tapada y después se retiran.

  Sustituye al planteamiento anterior, que solo cruzaba las dos fotografías de
  fondo. En escritorio se apreciaba, pero **en teléfono no se veía nada**: la
  tarjeta de acceso ocupa el centro de la pantalla y el cambio ocurría detrás
  de un panel prácticamente opaco. Una transición de fondo no puede leerse
  cuando el fondo está tapado, así que el obturador actúa por encima del
  contenido.

  - La navegación espera a que el obturador esté cerrado (`services/transicion.js`).
    React Router navega de forma instantánea, de modo que disparar la animación
    al detectar el cambio de ruta mostraría primero la pantalla nueva y solo
    después el cierre sobre ella: el orden contrario al que tiene sentido.
  - Cierre en 520 ms con curva de entrada marcada; apertura en 620 ms con una
    curva más suave. Retirarse más despacio de lo que se entró es lo que da
    sensación de reposo al final.
  - Solo se anima `transform`. Los paneles no cambian de tamaño, se desplazan.
  - Los paneles permanecen montados fuera de la pantalla: montarlos al cerrar
    los colocaría ya en su posición final y no habría animación.
  - Con `prefers-reduced-motion` no hay obturador y la navegación es directa.

### Notas técnicas

- Los radios de influencia iniciales (115 px para constelaciones, 165 px para el
  cursor) resultaron demasiado cortos: con la capa frontal repartida por toda la
  pantalla casi ningún par caía dentro del radio y las líneas no llegaban a
  dibujarse. Se ampliaron a 155 y 210 px tras comprobarlo en pantalla.
- El estado del puntero vive en una referencia mutable, no en el estado de
  React: de lo contrario cada movimiento del ratón provocaría un renderizado
  completo del componente.
- El trazado de constelaciones es de orden cuadrático, así que se limita a la
  capa frontal. Coste medido: **0,77 ms por fotograma**, frente a los 16,7 ms
  disponibles para mantener 60 FPS.
- Con `prefers-reduced-motion` se dibuja un cielo fijo, sin animación ni
  interacción.

## [2.0.1] — 21 de septiembre de 2026

Correcciones detectadas al revisar la interfaz ya desplegada.

### Corregido

- **El ingreso manual del kiosco era inservible en móvil.** En pantallas de
  hasta 480 px el campo de texto medía 37 px de ancho y el botón «Validar»
  sobresalía del borde de su tarjeta.

  Causa: la fila reutilizaba `.pila-responsive` con `flex-wrap: nowrap` en
  línea, y la regla `.pila-responsive > .btn { flex: 1 1 100% }` daba al botón
  base del 100 %. Sin poder envolver, el campo se colapsaba al mínimo.

  Es el mismo patrón que provocó el fallo original del inicio de sesión, pero
  invertido: allí unos estilos en línea anulaban una regla correcta; aquí una
  regla demasiado amplia obligaba a anularla con estilos en línea.

- **Se eliminó la regla global `.btn { width: 100% }`** de la consulta de
  medios de 480 px. Afectaba a todos los botones de la aplicación, incluidos
  los de paginación y los de icono, y forzaba excepciones en línea caso por
  caso. El apilado se conserva, pero limitado a `.pila-responsive`.

- **El código no se mostraba en ninguna parte.** El campo de ingreso manual
  pedía un código que solo existía codificado dentro de la imagen QR: no había
  forma de leerlo ni copiarlo, así que la función era inutilizable. El carnet
  incorpora ahora un botón «Ver código en texto» que revela el código en
  monoespaciado con opción de copiar. Va oculto por defecto porque es el mismo
  secreto que contiene el QR.

### Añadido

- Nueva clase `.campo-con-boton` basada en CSS Grid: una columna en móvil y dos
  a partir de 520 px. Sustituye a la combinación de utilidades que causaba el
  conflicto.
- Texto de ayuda en el kiosco que indica dónde encontrar el código.

### Verificación

- Ingreso manual medido a 320, 375 y 820 px: campo y botón dentro de la tarjeta
  en los tres casos.
- Se renderizaron por fin las pantallas de panel, gestión de personal y carnet
  digital, usando una API simulada local para sortear la autenticación. Las
  tres sin desbordamiento a 375 px. En la versión 2.0.0 solo se habían revisado
  sobre la hoja de estilos.

## [2.0.0] — 21 de septiembre de 2026

Revisión completa de seguridad, corrección de errores y rediseño responsive.
Ninguna dependencia nueva: `package-lock.json` no se modifica, de modo que los
despliegues de Vercel y Render siguen funcionando con `npm ci`.

### Seguridad

- **Escalada de privilegios en el registro.** `POST /api/register` leía el campo
  `rol` del cuerpo de la petición: cualquier persona podía crearse una cuenta de
  administrador enviando `{"rol":"admin"}`. El rol ahora se fuerza a `usuario`.
- **Acceso a carnets ajenos (IDOR).** `GET /api/usuarios/:id/qr` devolvía el
  código vigente de cualquier usuario a quien estuviera autenticado. Con ese
  código el kiosco abría la puerta en su nombre. Ahora solo el titular o un
  administrador pueden consultarlo.
- **Modificación de fotos ajenas (IDOR).** `PUT /api/usuarios/:id/foto` no
  comprobaba la propiedad del recurso. Se añade la verificación y se valida que
  el contenido sea realmente una imagen, no cualquier `data:` URI.
- **Clave JWT por defecto.** Sin `JWT_SECRET` el sistema usaba la cadena
  literal `'super_secret'`, con la que cualquiera podía firmar tokens de
  administrador válidos. En producción el servidor ahora se niega a arrancar.
- **CORS abierto.** `cors()` sin argumentos aceptaba peticiones de cualquier
  origen. Se sustituye por una lista blanca configurable (`CORS_ORIGINS`).
- **Fuerza bruta.** No había límite de intentos. Se añade un limitador por IP:
  10 intentos de acceso cada 15 minutos, 5 registros o recuperaciones por hora.
- **Enumeración de cuentas.** El inicio de sesión respondía 404 para un correo
  inexistente y 401 para una contraseña incorrecta, lo que permitía descubrir
  qué correos estaban registrados. Ahora la respuesta es idéntica en ambos casos.
- **Endpoint del kiosco.** `POST /api/acceso` era completamente público. Acepta
  ahora una clave de terminal (`KIOSK_API_KEY`) o un token de sesión.
- **Códigos predecibles.** Los códigos de carnet se generaban con
  `Math.random()`. Se sustituye por `crypto.randomBytes`.
- **Fuga de información.** El registro devolvía `error.message` al cliente,
  exponiendo nombres de tablas y restricciones internas de PostgreSQL.
- **Cabeceras de seguridad** (`X-Content-Type-Options`, `X-Frame-Options`,
  `Referrer-Policy`, HSTS) y desactivación de `X-Powered-By`.
- **Validación de entrada** en todos los endpoints: formato de correo y cédula,
  longitud de nombre y política mínima de contraseña (8 caracteres, letras y
  números).

### Corrección de errores

- **Eliminar usuarios fallaba siempre.** Las claves foráneas de `carnet` y
  `accesos` se habían creado sin `ON DELETE CASCADE`, pese a que la
  documentación y la historia HU034 afirmaban lo contrario. Corregido en
  `database.sql` y en `migrations/001_cascade_e_indices.sql`.
- **Doble registro de acceso.** El callback del lector QR capturaba el estado
  del primer render, así que el cerrojo `if (loading || resultado) return`
  siempre valía `false` y un código enfocado un segundo generaba varias
  peticiones. Se resuelve con una referencia mutable.
- **Condición de carrera en Anti-Passback.** Las cuatro consultas del registro
  de acceso no eran atómicas: dos lecturas simultáneas podían producir dos
  entradas consecutivas. Ahora se ejecutan en una transacción con `FOR UPDATE`.
- **Usuarios sin carnet.** El alta insertaba usuario y carnet por separado; si
  fallaba el segundo, quedaba una cuenta sin carnet e inutilizable. Transacción.
- **La confirmación del kiosco nunca mostraba el nombre.** La interfaz leía
  `res.data.usuario.nombre`, pero el backend solo devolvía `usuario_id`.
- **`VITE_API_URL` documentada sin `/api`.** Siguiendo el manual de instalación,
  todas las llamadas locales devolvían 404. El cliente añade el sufijo si falta.
- **Pantalla en blanco con roles nulos.** `user.rol.toUpperCase()` lanzaba una
  excepción no capturada. Se añade una barrera de errores de React.
- **Sesión caducada sin aviso.** Nadie interpretaba el 401 del servidor y las
  pantallas quedaban vacías. Un interceptor cierra la sesión y avisa.
- **Fuga de datos entre sesiones.** Las cachés de módulo del panel y del listado
  de personal sobrevivían al cierre de sesión dentro del mismo navegador.
- **CSV ilegible en Excel.** El reporte se exportaba sin BOM (tildes rotas), sin
  escapar las comillas y sin liberar el objeto URL.
- **Manual de usuario incorrecto.** Indicaba acceder con el número de
  identificación (es el correo) y describía una función de crear usuarios que no
  existía.
- **Hoja de estilos del manual** con variables inexistentes (`--bg-primary`),
  que pintaban un fondo distinto al del resto de la aplicación.
- **SSL de Vite sin activar.** La dependencia `@vitejs/plugin-basic-ssl` estaba
  instalada pero no configurada, aunque el manual pedía abrir `https://localhost:5173`.
- **Ruta desconocida expulsaba al login** en lugar de mostrar un 404.

### Añadido

- `POST /api/usuarios`: alta de usuarios desde el panel. Completa el CRUD que
  exigía el requisito RF-01 y que la interfaz prometía sin implementar.
- `GET /api/perfil`: datos frescos del usuario autenticado.
- `GET /api/mis-accesos`: historial propio (historia de usuario HU008).
- Campo de ingreso manual del código en el kiosco, previsto en el wireframe 19.6.
- Paginación del historial (25 por página) en el panel y `LIMIT`/`OFFSET` en la API.
- Casilla de autorización de tratamiento de datos en el registro, exigida por el
  Decreto 1377 de 2013 y que el propio documento del proyecto marcaba pendiente.
- La cédula vuelve a aparecer en el carnet digital.
- `migrations/001_cascade_e_indices.sql` y los índices que faltaban.
- Archivos `.env.example` para backend y frontend.
- Cierre ordenado del servidor ante `SIGTERM` (cada despliegue de Render).

### Interfaz responsive

- **Inicio de sesión.** Los estilos en línea fijaban `flexDirection: 'row'`,
  `gap: 4rem` y `width: 420px`, anulando las media queries: en el móvil el
  formulario se mostraba en dos columnas comprimidas y desbordaba la pantalla.
  La distribución pasa a CSS Grid.
- `.main-content` solo estaba definido dentro de una media query de móvil: en
  escritorio el contenido quedaba pegado a los bordes y sin ancho máximo.
- Tipografías y espaciados fluidos con `clamp()`, verificados de 320 a 1920 px.
- Áreas táctiles de 44 px como mínimo y campos de formulario a 16 px, que es lo
  que evita el zoom automático de Safari en iOS.
- Soporte de `env(safe-area-inset-*)` para pantallas con notch y `100dvh`.
- Todas las tablas dentro de un contenedor con desplazamiento horizontal.
- `prefers-reduced-motion`: el fondo de partículas y los orbes se detienen.
- El fondo de partículas adapta su densidad al tamaño de pantalla y tiene en
  cuenta `devicePixelRatio`.
- Los sondeos periódicos se detienen cuando la pestaña no está visible. El
  carnet pasa de consultar el servidor cada 3 segundos a cada 15 (de 1.200 a 240
  peticiones por hora y usuario).
- Estilos de impresión para el carnet y foco visible para navegación por teclado.

## [1.1.0] — mayo de 2026

- Buscador con normalización de tildes en el panel.
- Confirmación al cerrar sesión.
- Ordenación por identificador descendente en el historial.
- Manuales de usuario integrados.

## [1.0.0]

- Versión inicial del sistema.
