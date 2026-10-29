---
name: maquetar-figma
description: |
  Maqueta un mailing HTML bilingüe (inglés y español; tablas + estilos inline, compatible con
  clientes de correo) a partir de dos diseños de Figma, uno por idioma. Primero revisa todas las
  maquetas de `ref/` y maqueta siguiendo sus patrones (estructura de tablas, comentarios,
  encabezado, pie, estilos). Trabaja dentro de un proyecto (`mailings-<nombre>/`, lo crea si no
  existe) y guarda en su `proyecto.json` la carpeta destino de imágenes en el bucket (ej.
  `alerts/`). Exporta las imágenes optimizadas a `<proyecto>/img/` como `.png` o `.jpg`, el que
  pese menos (nunca `.webp`: Outlook de escritorio no lo muestra; los originales de Figma quedan
  en el scratchpad). Propone mejoras de maquetador ANTES de aplicarlas. Termina en
  `<proyecto>/1_maqueta/en/<nombre>-local.html` y `<proyecto>/1_maqueta/es/<nombre>-local.html`.
  Úsalo cuando el usuario diga "maqueta este mailing", "arma el correo/email desde figma",
  "pasa este figma a mailing", o comparta links de figma.com hablando de un mailing/correo.
  Además deja junto a cada maqueta un `.txt` con las observaciones para diseño (erratas, textos
  sin traducir, fuentes que no son Arial, links pendientes).
  Siguiente paso del flujo: `/entregar-dev`.
---

# Maquetar mailing desde Figma

Flujo, dentro de la carpeta del proyecto `mailings-<nombre>/`:
**maquetar-figma** (este) → `entregar-dev` (al dev, URLs de PRD) → el dev devuelve con variables
a `3_integrado/<idioma>/` → `publicar-ambientes` (`4_bucket/dev|qa|prd/<idioma>/`).
Este skill entrega **dos maquetas, una por idioma** (`1_maqueta/en/` y `1_maqueta/es/`), con
imágenes `.png`/`.jpg` optimizadas en `img/` y rutas relativas `../../img/`, y junto a cada
una un **`.txt` de observaciones** (erratas, fuentes, pendientes) con el mismo nombre.

## Regla principal: manda Figma

El diseño de Figma se respeta **tal cual**: tamaños de fuente, colores (aunque el contraste
sea bajo), textos, espaciados, esquinas redondeadas y pie de página. Las sugerencias del paso 4
son **informativas**; solo se aplican si el usuario las aprueba explícitamente.

- **Esquinas redondeadas**: se mantienen (`border-radius`). Producto ya sabe que en Outlook de
  escritorio se ven rectas; no hace falta volver a advertirlo como problema.
- **Links y variables**: no inventar URLs ni variables. Botones y textos de acción (ej. "View
  email in browser", "unsubscribe") van con `href="#"`; las variables las coloca el dev.
  Variables que vienen escritas en el diseño (`{{#}}`, `{User}`) se copian tal cual.
- **Dominios y correos visibles = enlace real**: si el diseño muestra como texto un dominio o
  URL (ej. `incontrol.intelica.com`) o un correo (ej. `clientsuccess@intelica.com`),
  convertirlo en enlace `https://<dominio>` con `target="_blank"` o `mailto:<correo>`
  **sin cambiar su apariencia**: el `<a>` repite color, fuente, tamaño, peso, `letter-spacing`
  y `line-height` del texto, con `text-decoration: none` (o `underline` si en Figma está
  subrayado), y el texto va dentro de un `<span>` con el mismo `color` y `text-decoration`
  para que Gmail/Outlook no lo pinten de azul. Verificar en el render que no cambió nada.
- **Fuentes**: el mailing usa **Arial**. Si Figma trae otra fuente (Lato, Inter…), no
  convertirla en silencio: avisar al usuario qué textos/nodos la usan para que lo corrija el
  diseñador, y volver a leer esos nodos cuando confirme que Figma se actualizó.
- **Cada idioma con su diseño**: los textos de cada versión salen de **su** link de Figma.
  Nunca traducir por cuenta propia ni copiar un texto de un idioma al otro.
- **Erratas**: por defecto se maquetan tal cual y se reportan en el `.txt`. Si el usuario pide
  corregirlas, corregir **solo errores ortográficos** (palabras mal escritas, ej. "healps" →
  "helps"). Todo lo demás queda como en Figma y va al `.txt`: dobles espacios, gramática,
  textos sin traducir, tú/usted, terminología. Si la corrección cambia el corte de líneas, no
  forzar `<br>` para imitar Figma: dejar que el texto fluya y anotar la diferencia de alto.

## Estructura del proyecto

Cada grupo de mailings (módulo) es un **proyecto**: una carpeta `mailings-<nombre>/` en la raíz
del repositorio (ej. `mailings-alerts/`). **Todas las rutas de este skill (`1_maqueta/`,
`img/`, …) son relativas a la carpeta del proyecto**, salvo `ref/`, que está en la raíz y es
compartida.

Cada carpeta de HTML tiene una subcarpeta por idioma (`en/`, `es/`; definidos en
`"idiomas"` de [`ambientes.json`](../../../ambientes.json)). El archivo se llama igual en ambos
idiomas; lo que cambia es la carpeta.

| Carpeta | Contenido |
|---|---|
| `ref/` (raíz) | Maquetas de referencia (solo lectura) ← **este skill las revisa** |
| `proyecto.json` | `{ "nombre": "alerts", "carpetaImagenes": "alerts/" }`: subcarpeta de `img/` en el bucket |
| `1_maqueta/en/`, `1_maqueta/es/` | `<nombre>-local.html` (rutas relativas `../../img/`) + `<nombre>-local.txt` (observaciones) ← **este skill genera aquí** |
| `2_entrega/en/`, `2_entrega/es/` | `<nombre>.html` con URLs de PRD, para el dev (lo genera `entregar-dev`) |
| `3_integrado/en/`, `3_integrado/es/` | `<nombre>.html` devuelto por el dev, con variables |
| `4_bucket/<env>/en/`, `4_bucket/<env>/es/` | `<nombre>.html` con la URL de cada ambiente `dev`, `qa`, `prd` (lo genera `publicar-ambientes`) |
| `img/` | **Solo `.png`/`.jpg` optimizados**, compartidas por ambos idiomas ← **este skill las genera aquí** |
| `trash/` | Papelera del proyecto |
| `obs/` | Páginas de observaciones (`/observaciones-html`) y documentos para producto |

## Preguntas iniciales

Hacerlas juntas antes de empezar:

1. **[Obligatorio] Proyecto**: nombre corto del módulo (ej. `alerts`); la carpeta es
   `mailings-<nombre>/`. Mostrar los proyectos que ya existen (`mailings-*/`) para elegir uno.
   - **Si existe**, se trabaja ahí mismo.
   - **Si no existe**, crearlo con `proyecto.json` y las carpetas `1_maqueta/en|es`,
     `2_entrega/en|es`, `3_integrado/en|es`, `4_bucket/dev|qa|prd/en|es`, `img/`, `trash/` y
     `obs/`, cada una con un `.gitkeep`.
2. **[Obligatorio] Carpeta destino de imágenes en el bucket** (ej. `alerts/`): la subcarpeta de
   `img/` donde se copiarán las imágenes en el repo del bucket. Con ella se arma la URL
   absoluta de `entregar-dev` y `publicar-ambientes`:
   `ambientes.json` (`…/img/`) + `alerts/` + `e-logo.png`.
   - Si `proyecto.json` ya la tiene, mostrarla y solo pedir confirmación.
   - Si no, preguntarla y guardarla en `proyecto.json` (`"carpetaImagenes"`). Debe ser relativa
     (sin `/` inicial) y terminar en `/`.
   - Es **una por proyecto**: si el usuario la cambia, se cambia para todo el proyecto. Avisar
     que los mailings ya entregados quedarían con la URL anterior.
3. **[Obligatorio] Dos links de Figma con *Copy link to selection*: uno en inglés y otro en
   español.** Cada uno debe traer `node-id` (`...?node-id=123-456`). Si alguno no lo trae, o
   solo llega uno, pedir que:
   1. Abra el archivo en Figma y **seleccione solo el frame del mailing** de ese idioma (clic en
      la capa; no la página entera, para que el MCP responda rápido).
   2. Clic derecho → *Copy link to selection*.

   Si no está claro cuál link es de qué idioma, confirmarlo leyendo los textos del frame.
4. **Nombre del mailing** con guiones entre partes y camelCase dentro de cada parte (ej. `alert-newFees`, `alerts-optOut-freeTrial`), el mismo para ambos idiomas →
   salida `1_maqueta/en/<nombre>-local.html` y `1_maqueta/es/<nombre>-local.html`. Si alguno
   ya existe, confirmar antes de sobrescribir.
5. **[Opcional] Color de fondo del mailing** (ej. `#e9e9e9`): el que se ve alrededor del
   contenedor de 600px. Se aplica al `<body>` y al `table wrapper`. Si no lo indica, usar el de
   las referencias (`#ffffff`) y decirlo en el resumen.

Las referencias **no se preguntan**: el skill las revisa todas por su cuenta (paso 1).

## 1. Revisar las referencias

Leer **todos** los `.html` de `ref/` (nunca modificarlos) y sacar el patrón de maquetación
del proyecto:

- **Esqueleto**: jerarquía de tablas (wrapper → contenedor → content → tabla interna), anchos
  y paddings de cada nivel, atributos fijos de las tablas.
- **Convención de comentarios**: `BEGIN/END: table ...` para bloques y `fila <nombre>` por fila.
- **Bloques de contenido** reutilizables (texto, imagen, tabla de datos, CTA…) con sus estilos
  inline exactos.
- **Formato**: indentación con tabs, atributos `style` multilínea en `<td>` de texto, `<head>`.

Las referencias dan la **forma de construir**; los colores, textos, anchos internos y el pie los
da Figma. Si hay varias referencias, usar como base la más parecida al diseño. Si `ref/` está
vacía, usar [references/estructura-base.md](references/estructura-base.md) y avisarlo.

## 2. Leer el diseño (Figma MCP)

`fileKey` y `nodeId` salen de cada link: `/design/<fileKey>/...?node-id=123-456` → `nodeId = "123:456"`.
Los dos links pueden ser del mismo archivo o de archivos distintos.

1. `create_session` con el `fileKey`; reutilizar el `sessionId` en todas las llamadas.
2. Cargar la guía `figma-design-to-code` (skill `/figma-design-to-code` o, si no existe, el
   recurso MCP `skill://figma/figma-design-to-code/SKILL.md`) antes de `get_design_context`, y
   pasar `skillNames: "resource:figma-design-to-code"` cuando venga del recurso.
3. **Diseño base = inglés.** `get_design_context` del frame completo en inglés.
   - Un mailing suele ser **demasiado grande** y el MCP devuelve solo metadata (árbol XML con
     ids, nombres y tamaños) guardada en un archivo. Leer de ahí las **secciones de primer
     nivel** y sus posiciones `y` (dan los espacios entre secciones).
   - Pedir luego `get_design_context` **por sección**, en paralelo y con
     `excludeScreenshot: true`. De bloques repetidos (ej. 4 tablas iguales) basta pedir uno y
     tomar los textos de los demás desde la metadata.
4. **Español.** Pedir la metadata del frame en español y compararla con la del inglés:
   - Si las secciones, tamaños y posiciones coinciden, basta con tomar **los textos** (de la
     metadata o `get_design_context` por sección) para armar la versión en español.
   - Si alguna sección cambia de tamaño o posición (textos más largos que empujan el layout,
     líneas extra, botones más anchos), leer esa sección completa y respetar sus medidas en la
     versión en español. Reportar estas diferencias en el resumen.
5. `get_screenshot` de **cada** frame con `maxDimension` ≥ alto del frame (ej. 2400),
   descargarlo con `curl` al scratchpad y, si es largo, cortarlo en tramos de ~600px con
   sharp-cli para verlo: `npx sharp -i shot.png -o shot0.png extract <top> 0 600 600`.
6. Datos que el código de referencia no trae:
   - **Colores de fondo** de secciones: muestrearlos del screenshot con `sharp` (leer el pixel).
   - **Líneas divisorias**: descargar su SVG con `curl` y leer el `stroke`.

El código que devuelve `get_design_context` (React/Tailwind) es **solo referencia**: el mailing
se escribe con tablas e inline styles, nunca con flex, grid, clases ni `<div>` de layout.

Revisar las **fuentes** de todos los textos de ambos idiomas (ver *Regla principal*). Mapear cada
sección del diseño a un bloque de las referencias (ej. "botón" → `fila cta`); las secciones sin
equivalente se maquetan como bloque nuevo con la misma forma de construir.

## 3. Mostrar el mapeo

Antes de sugerir nada, mostrar una tabla **sección de Figma → bloque/comentario** que se usará
(ej. `Tabla "New Fees"` → `fila resumen (nuevo)`), con una columna que indique si la sección
**difiere entre idiomas** (layout o imagen) además del texto.

## 4. Sugerencias de maquetador (informativas)

Revisar el diseño contra [references/buenas-practicas.md](references/buenas-practicas.md) y
mostrar una **lista numerada** de sugerencias concretas para *este* diseño, cada una con su
motivo en una línea. Recordar que por defecto **manda Figma**: preguntar cuáles aplica
(todas / algunas por número / ninguna) y esperar la respuesta. Lo no aprobado queda como en
Figma. Si no hay nada que sugerir, decirlo y seguir. Lo aprobado se aplica a **ambos idiomas**.

No incluir como sugerencia lo ya decidido en *Regla principal* (redondeados, links, variables).

## 5. Exportar imágenes optimizadas (`.png` / `.jpg`)

En `img/` **solo hay imágenes optimizadas `.png` o `.jpg`** (el formato que pese menos; nunca
`.webp`, porque Outlook de escritorio para Windows no lo muestra). El PNG que exporta Figma es
solo un paso intermedio en el scratchpad: nunca se copia tal cual a `img/`.

1. `download_assets` (`defaultFormat: "png"`, `defaultScale: 2`) y `curl -f -L` de cada
   `export.url` a `<scratchpad>/figma/` (nunca a `img/`).
2. Optimizar a `img/` (ver [scripts/optimizar.mjs](../../../scripts/optimizar.mjs)):
   ```
   npm run img:optimizar -- --proyecto <proyecto> --dir <scratchpad>/figma
   ```
   Por imagen prueba calidades 75–100 y se queda, por formato, con la más liviana sin pérdida
   visible (PSNR ≥ 40 dB): PNG sin pérdida, PNG con paleta y JPG (este solo si la imagen no usa
   transparencia). Escribe el más liviano como `img/<archivo>.png` o `img/<archivo>.jpg`; usar
   en el `src` la extensión que muestra su tabla. Falla si ya existe una imagen con ese nombre
   en cualquier extensión (usar `--force` solo si es la misma imagen actualizada: reemplaza y
   borra la anterior) o si se le pasa algo de `img/`.

Reglas de exportación:

- **Imágenes por idioma**: exportar las imágenes de ambos frames. Si una imagen es **idéntica**
  en los dos idiomas (logos, íconos, ilustraciones sin texto), se exporta **una sola vez** sin
  sufijo y la usan ambas versiones. Si **lleva texto** o cambia entre idiomas (capturas de
  producto, banners con texto), se exporta una por idioma con sufijo `-en` / `-es`:
  `e-fees-detail-incontrol-en.png`, `e-fees-detail-incontrol-es.png`. Ante la duda,
  comparar los PNG del scratchpad con sharp (mismo tamaño y píxeles = idéntica).
- **Ilustraciones compuestas** (capturas de producto, gráficos con muchas capas o textos muy
  pequeños): exportar el **frame contenedor completo como una sola imagen**, incluido su fondo.
- **Íconos repetidos**: exportar **una sola vez** con fondo transparente y reutilizarlo.
- **Fondos de íconos** (cuadrados/círculos de color): se maquetan en HTML (`td` con `bgcolor`
  y `border-radius` dentro de una tabla propia de tamaño fijo; ver paso 6), no se incluyen en la
  imagen.
- No exportar como imagen lo que se puede maquetar: textos, botones, fondos, líneas.
- Nombres en kebab-case con prefijo `e-`: `e-logo-incontrol.png`, `e-icon-check.png`.
  No sobrescribir una imagen existente que sea otra imagen; los logos compartidos que ya existan
  en `img/` se reutilizan (no se vuelven a exportar).
- En el HTML, `width`/`height` van al tamaño **1x** del diseño (la mitad del exportado a 2x;
  el script muestra el tamaño en su tabla).

## 6. Maquetar `1_maqueta/en/` y `1_maqueta/es/`

Maquetar primero `1_maqueta/en/<nombre>-local.html` y, a partir de ese, generar
`1_maqueta/es/<nombre>-local.html` con la **misma estructura** cambiando solo lo que difiere en
el diseño en español (textos, imágenes con sufijo `-es`, medidas de secciones que cambiaron).

- `<html lang="en">` en la versión en inglés y `<html lang="es">` en la de español; el
  `<title>` y los `alt` de las imágenes, en el idioma de cada versión.
- **Fondo del mailing** (pregunta 3, o `#ffffff` por defecto) en el `<body>` (`bgcolor` +
  `background-color` en su `style`) y en el `table wrapper` (`bgcolor` + `background-color`),
  con el mismo color en ambos.
- Esqueleto de la referencia: `table wrapper` (100%, padding 16px) → `table contenedor` (600px,
  **fondo del frame de Figma**) → filas. Si el contenido de Figma va con márgenes laterales,
  usar `fila contenido` con `table content` interno del ancho de Figma (ej. 536px + padding 32px).
- Todas las tablas: `role="presentation" cellpadding="0" cellspacing="0" border="0"`.
- Fondos con `bgcolor` + `background-color`; bordes y redondeados como en Figma.
- Textos en `<td>` con `font-family: Arial, sans-serif`, `font-size`, `line-height` en px,
  `mso-line-height-rule: exactly`, `-ms-text-size-adjust: 100%`, `-webkit-text-size-adjust: 100%`.
- Espacios entre secciones como `padding` del `td`, calculados con las posiciones `y` de la
  metadata.
- Columnas de ancho fijo de Figma con `width` en el `td`; separadores verticales con
  `border-left` en el `td`; líneas horizontales con `border-top`/`border-bottom`.
- **El `width` de un `td` es solo el contenido**: el padding y el borde se suman por fuera. Para
  que una caja mida lo de Figma, restarlos (ej. tarjeta de 260px con padding 9px y borde 1px →
  `width="240"`). En columnas centradas de ancho fijo (montos, contadores) usar padding
  horizontal 0. Si no, la columna crece y empuja a las demás.
- **Cajas de tamaño fijo junto a texto** (fondo de ícono, badge, cuadro de color): el fondo
  nunca va en el `td` de la fila, porque ese `td` crece si el texto vecino ocupa 2 líneas. El `td`
  de la fila solo alinea (`valign="middle"`, sin fondo) y adentro lleva una **tabla propia** con
  las medidas exactas de Figma (ej. 32×32 con `bgcolor` y `border-radius`).
- Imágenes: `src="../../img/<archivo>.png"` (o `.jpg`, según lo que eligió el script), `alt`,
  `width`, `height` y el `style` de la referencia. Íconos decorativos con `alt=""`.
- **Comentarios por sección** con la convención de las referencias: `<!-- BEGIN/END: table ... -->`
  y `<!-- fila <nombre> -->` antes de cada `<tr>` de sección; filas repetidas como
  `<!-- fila 1 -->`, `<!-- fila 2 -->`…; los comentarios son iguales en ambos idiomas.
- Si hay muchos bloques repetidos (tablas, tarjetas), se puede generar el HTML con un script
  Node **en el scratchpad** (no en el proyecto); el resultado debe quedar con el mismo formato
  que la referencia.

## 7. Verificar y resumir

1. **Render** de cada idioma: abrir el HTML con Edge headless y compararlo con el screenshot de
   Figma de **ese** idioma:
   ```
   "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" --headless=new --disable-gpu \
     --hide-scrollbars --window-size=632,<alto> --screenshot=<scratchpad>/render-<idioma>.png \
     "file:///C:/christian/new-mailings/mailings-<proyecto>/1_maqueta/<idioma>/<nombre>-local.html"
   ```
   Cortar el render en tramos y revisar espaciados, colores, tamaños, redondeados e imágenes.
   Además de mirar, **medir con sharp**: por zona (títulos, columnas de tablas, tarjetas, botón,
   pie) comparar dónde empieza y termina el contenido en x y en y entre el screenshot de Figma
   y el render. Medir también el **tamaño de cada caja de color** (fondos de íconos, botones,
   recuadros) buscando su color en ambas imágenes, sobre todo en filas donde el texto ocupa
   más líneas en un idioma. Toda diferencia mayor a 1px que no sea por el suavizado de la fuente se corrige
   antes de entregar.
2. Comprobar en ambos HTML que cada `src` apunta a un `.png`/`.jpg` que existe en `img/`, que
   no hay `.webp` en `img/` ni en los `src`, y que cada HTML pesa < 102 KB.
3. Comparar las dos versiones: misma cantidad de filas/comentarios; si no, explicar por qué.
4. **Archivo de observaciones por idioma**, junto a cada maqueta y con su mismo nombre:
   `1_maqueta/en/<nombre>-local.txt` y `1_maqueta/es/<nombre>-local.txt` (texto plano UTF-8).
   Es lo que se le pasa a diseño o contenido para corregir Figma, así que cada punto indica
   **nodo de Figma, texto actual y qué revisar**, sin proponer redacciones como definitivas.
   Secciones, en este orden (omitir las vacías):
   0. **Erratas corregidas en la maqueta** (solo si el usuario pidió corregirlas): nodo, texto
      en Figma, texto en la maqueta y efecto en el layout. Recordar que también hay que
      corregirlas en Figma.
   1. **Erratas y textos a revisar** (lo más importante): faltas de ortografía, errores
      gramaticales, dobles espacios, textos sin traducir, mezcla de idiomas, tuteo/usted
      mezclados, mayúsculas inconsistentes (`incontrol`/`Incontrol`), terminología mezclada y
      textos copiados de otro mailing. Se maquetan **tal cual Figma**; el `.txt` es el aviso.
   2. **Fuentes distintas de Arial**: nodo, texto y fuente; cómo quedó maquetado.
   3. **Diferencias con Figma** que quedaron en la maqueta y su motivo.
   4. **Sugerencias de maquetador no aplicadas** (quedaron como en Figma).
   5. **Links pendientes para el dev** (`href="#"`) y enlaces creados (`https://`, `mailto:`).
   6. **Datos de ejemplo** que difieren entre idiomas (informativo).

   Encabezado del archivo: nombre del mailing, idioma, link de Figma de ese idioma y fecha.
   Si se corrige Figma y se vuelve a maquetar, regenerar el `.txt`.
5. Resumen al usuario:
   - Proyecto usado (`mailings-<nombre>/`, y si se creó) y carpeta destino de imágenes con la URL
     final de ejemplo (`…/img/<carpetaImagenes><archivo>.png`).
   - Archivos generados: `<proyecto>/1_maqueta/en/<nombre>-local.html` y `/es/<nombre>-local.html`,
     con sus `.txt` de observaciones (cuántas erratas y textos a revisar tiene cada uno).
   - Fuentes (todo Arial o qué falta corregir en Figma, por idioma).
   - Color de fondo del mailing usado (el indicado o `#ffffff` por defecto).
   - Diferencias de layout entre idiomas, si hubo.
   - Sugerencias aplicadas y lo que quedó como en Figma.
   - Links con `href="#"` pendientes para el dev, y dominios y correos convertidos en enlace
     (`https://`, `mailto:`).
   - Tabla de imágenes (archivo con su extensión `.png`/`.jpg`, idioma — `ambos`, `en` o `es` —,
     tamaño 1x, formato y calidad elegidos, peso).
   - Siguiente paso: **`/entregar-dev`** para generar `<proyecto>/2_entrega/en|es/<nombre>.html`
     (URLs de PRD con la carpeta de imágenes) y enviarlo al dev.
