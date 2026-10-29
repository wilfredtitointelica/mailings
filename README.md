# New Mailings

Maquetación de mailings HTML bilingües (inglés y español) de Incontrol a partir de diseños de
Figma. El flujo usa 3 skills de Claude Code: maquetar, entregar al desarrollador y publicar por
ambiente. El trabajo se ordena **por proyecto**: un módulo como alertas es un proyecto.
Las imágenes son **`.png` o `.jpg` optimizados** (el que pese menos) desde el inicio; no se usa
`.webp` porque Outlook de escritorio para Windows no lo muestra.

## Requisitos

- **Node.js** (probado con v22) y las dependencias instaladas con `npm install`.
- **Claude Code** abierto en esta carpeta (los skills viven en `.claude/skills/`).
- **MCP de Figma conectado** en Claude (solo para `/maquetar-figma`).
- **Microsoft Edge** instalado: se usa sin ventana para comparar el render con Figma.

## Proyectos

Cada maquetador recibe un Figma con los mailings de un módulo (alerts u otro). Cada módulo es un
**proyecto**: una carpeta `mailings-<nombre>/` en la raíz. Por ejemplo, `mailings-alerts/`.
`/maquetar-figma` pregunta el proyecto y, si la carpeta ya existe, trabaja ahí mismo; si no
existe, la crea.

```
mailings-alerts/
  proyecto.json        { "nombre": "alerts", "carpetaImagenes": "alerts/" }
  1_maqueta/en|es/     maquetas + .txt de observaciones
  2_entrega/en|es/     HTML para el desarrollador
  3_integrado/en|es/   HTML devuelto por el desarrollador
  4_bucket/dev|qa|prd/en|es/
  img/                 solo .png/.jpg optimizados del proyecto
  trash/               papelera
  obs/                 observaciones para producto (HTML con fecha, Word)
ref/                   referencias compartidas por todos los proyectos
scripts/  ambientes.json  package.json
```

### Carpeta destino de imágenes — `proyecto.json`

En el repo del bucket, las imágenes de cada proyecto no van sueltas en `img/`, sino en una
subcarpeta (`img/alerts/`). Esa subcarpeta se guarda en `proyecto.json` como `carpetaImagenes`.
`/maquetar-figma` la pregunta la primera vez y en los siguientes mailings solo pide
confirmarla.

La URL que generan `/entregar-dev` y `/publicar-ambientes` es:

```
URL del ambiente (ambientes.json)                                          + carpetaImagenes + archivo
https://itl-0003-portal-dev-s3-pub-templates-03.s3.eu-south-2.amazonaws.com/img/ + alerts/ + e-logo-incontrol.png
```

Por eso, al subir las imágenes al bucket hay que copiarlas en `img/alerts/`. En local, las
maquetas siguen usando `../../img/` dentro de su proyecto.

## Flujo

Todo ocurre dentro de la carpeta del proyecto:

```
 Figma EN + Figma ES ──/maquetar-figma──▶ 1_maqueta/en|es/  (+ img/*.png|jpg)
                                             │
                                             └──/entregar-dev──▶ 2_entrega/en|es/ ──▶ desarrollador
                                                                                       │ agrega variables
                                                                                       ▼
                 4_bucket/dev|qa|prd/en|es/ ◀──/publicar-ambientes── 3_integrado/en|es/
```

| Paso | Quién | Qué pasa | Resultado (dentro de `mailings-<nombre>/`) |
|---|---|---|---|
| 1 | `/maquetar-figma` | Pregunta el proyecto y la carpeta de imágenes. Lee los dos diseños de Figma (EN y ES) y las referencias de `ref/`, exporta las imágenes optimizadas (`.png`/`.jpg`) y arma un HTML por idioma | `1_maqueta/en\|es/<nombre>-local.html`, `img/*.png\|jpg` |
| 2 | `/entregar-dev` | Copia las maquetas con las imágenes en URL absoluta de PRD (con la subcarpeta del proyecto) | `2_entrega/en\|es/<nombre>.html` |
| 3 | Desarrollador | Agrega las variables y devuelve los HTML | — |
| 4 | Tú | Guardas cada HTML devuelto en la carpeta de su idioma y haces los ajustes visuales que falten | `3_integrado/en\|es/<nombre>.html` |
| 5 | `/publicar-ambientes` | Cambia solo las URLs de imágenes por las de cada ambiente | `4_bucket/dev\|qa\|prd/en\|es/<nombre>.html` |

Hay dos skills auxiliares:
- `/optimizar-imagenes` optimiza (a `.png` o `.jpg`) imágenes sueltas que se agregan o
  reemplazan después de maquetar.
- `/observaciones-html` solo corre cuando lo pides. Arma, a partir de los `.txt`, una página de
  observaciones para producto en formato scrollytelling, dentro de `obs/`.

Un mailing solo informativo (sin variables) también pasa por `3_integrado/`, porque se publica
únicamente desde ahí.

## Carpetas de un proyecto

Cada carpeta de HTML tiene una **subcarpeta por idioma** (`en/`, `es/`), también dentro de cada
ambiente del bucket. El archivo se llama igual en ambos idiomas.

| Carpeta | Contenido | Rutas de imágenes |
|---|---|---|
| `1_maqueta/en/`, `1_maqueta/es/` | `<nombre>-local.html`: la maqueta generada desde Figma. `<nombre>-local.txt`: observaciones para diseño (erratas, fuentes, pendientes) | relativas `../../img/` |
| `2_entrega/en/`, `2_entrega/es/` | `<nombre>.html` para el desarrollador | absolutas de PRD + `carpetaImagenes` |
| `3_integrado/en/`, `3_integrado/es/` | `<nombre>.html` devuelto por el desarrollador, con variables | absolutas (las que traiga) |
| `4_bucket/dev/`, `qa/`, `prd/` → `en/`, `es/` | `<nombre>.html` final por ambiente e idioma | absolutas del ambiente + `carpetaImagenes` |
| `img/` | **Solo `.png`/`.jpg` optimizados**, compartidas por ambos idiomas. Las que cambian por idioma llevan sufijo `-en` / `-es`. | — |
| `trash/` | Descartes. Ningún skill la usa. | — |
| `obs/` | `observaciones-AAAA-MM-DD.html` (+ `.json`) de `/observaciones-html` y documentos para producto. Nunca se sobrescriben. | — |

En la raíz quedan:
- `ref/`: maquetas HTML de referencia, en solo lectura. De ahí se toma la forma de construir
  (tablas, comentarios, estilos).
- `scripts/`:
  - `optimizar.mjs` optimiza PNG/JPG y guarda cada imagen como `.png` o `.jpg`, el que pese menos.
  - `rutas.mjs` hace la entrega y la publicación.
  - `proyecto.mjs` resuelve la carpeta del proyecto.

### Configuración — `ambientes.json`

```json
{
  "entrega": "prd",
  "idiomas": ["en", "es"],
  "ambientes": {
    "dev": "https://itl-0003-portal-dev-s3-pub-templates-03.s3.eu-south-2.amazonaws.com/img/",
    "qa":  "https://itl-0003-portal-qa-s3-pub-templates-02.s3.eu-south-2.amazonaws.com/img/",
    "prd": "https://itl-0003-portal-prd-s3-pub-templates-02.s3.eu-south-2.amazonaws.com/img/"
  }
}
```

- `entrega`: el ambiente cuyas URLs lleva el HTML que recibe el desarrollador.
- `idiomas`: las subcarpetas de idioma que usan los scripts.
- Es común a todos los proyectos. Si cambia un bucket, se edita solo este archivo. La
  subcarpeta de cada proyecto se define en su `proyecto.json`.

## Skills

### `/maquetar-figma`

Genera las maquetas, una por idioma, desde Figma.

**Pide:**
- **Proyecto**, por ejemplo `alerts` para `mailings-alerts/`. Muestra los que ya existen.
- **Carpeta destino de imágenes en el bucket**, por ejemplo `alerts/`. Si el proyecto ya la
  tiene, solo pide confirmarla.
- **Dos links de Figma** con *Copy link to selection*: uno del frame en **inglés** y otro del
  frame en **español**. Hay que seleccionar **solo el frame del mailing**, no la página.
- **Nombre del mailing**, con guiones entre partes y camelCase dentro de cada parte. Por
  ejemplo, `alert-newFees` o `alerts-optOut-freeTrial`.

**Qué hace:**
1. Revisa todas las maquetas de `ref/` y toma de ahí la estructura de tablas, la convención de
   comentarios (`<!-- BEGIN: ... -->`, `<!-- fila hero -->`…) y los estilos.
2. Lee el diseño en inglés por secciones, toma colores y medidas, y revisa que las fuentes sean
   Arial. Del diseño en español toma los textos y detecta si alguna sección cambia de medida.
3. Te muestra cómo relaciona cada sección de Figma con un bloque de la maqueta.
4. Propone sugerencias de maquetador y **espera tu aprobación**. Si no las apruebas, se respeta
   Figma.
5. Exporta las imágenes a 2x (PNG temporal en el scratchpad) y las guarda **optimizadas como
   `.png` o `.jpg`** (el que pese menos) en `<proyecto>/img/`, con prefijo `e-`:
   - las imágenes iguales en ambos idiomas se exportan una sola vez;
   - las que llevan texto, una por idioma (`-en`, `-es`).
6. Escribe `<proyecto>/1_maqueta/en|es/<nombre>-local.html` y su `.txt`, los abre con Edge y
   compara cada uno con su diseño de Figma.

**Reglas del proyecto (manda Figma):**
- Tamaños, colores, textos, espaciados, pie de página y esquinas redondeadas se respetan tal
  cual. Producto sabe que en Outlook de escritorio las esquinas salen rectas.
- Los textos de cada idioma salen de su propio diseño; el skill no traduce.
- Todo va en **Arial**. Si Figma trae otra fuente, el skill lo reporta para que lo corrija el
  diseñador; no la cambia por su cuenta.
- Botones y textos de acción van con `href="#"`: las URLs y las variables las pone el
  desarrollador.
- Los dominios y correos que aparecen como texto van como enlace real, sin cambiar su
  apariencia: `incontrol.intelica.com` → `https://`, `clientsuccess@intelica.com` → `mailto:`.
- Ilustraciones compuestas → una sola imagen. Íconos repetidos → un solo `.png` transparente.

**Calidad de las imágenes:**
- Por cada imagen se prueban calidades de **75 a 100** y, por formato, se elige la más baja sin
  pérdida visible (PSNR ≥ 40 dB frente al original).
- Candidatos: PNG sin pérdida, PNG con paleta (hasta 256 colores) y JPG, este solo si la imagen
  no usa transparencia. Se queda el más liviano; logos, íconos y capturas planas suelen salir
  como PNG con paleta.
- Nunca `.webp`: Outlook de escritorio para Windows no lo muestra.

### `/entregar-dev`

Genera los HTML para el desarrollador, para que vea el render mientras agrega las variables.

**Pide:** el proyecto y qué mailing de `1_maqueta/` entregar.

```
npm run mail:entregar -- --proyecto alerts --nombre <nombre>               # en y es
npm run mail:entregar -- --proyecto alerts --nombre <nombre> --idioma es   # solo uno
```

- Escribe `<proyecto>/2_entrega/en|es/<nombre>.html` con las imágenes en URL de PRD +
  `carpetaImagenes` (ej. `…/img/alerts/`).
- Si alguna imagen no es `.png`/`.jpg` o no existe en `<proyecto>/img/`, no genera nada y la lista.
- Lista las imágenes que **deben estar subidas en PRD**, en `img/<carpetaImagenes>`.

### `/publicar-ambientes`

Genera las versiones finales por ambiente e idioma desde los HTML integrados.

**Pide:** el proyecto, qué mailing de `3_integrado/` publicar y, opcionalmente, qué ambientes
(por defecto los tres) o qué idioma (por defecto ambos).

```
npm run mail:publicar -- --proyecto alerts --nombre <nombre>
npm run mail:publicar -- --proyecto alerts --nombre <nombre> --env qa
npm run mail:publicar -- --proyecto alerts --nombre <nombre> --idioma es --env dev,qa
```

- Antes de generar, lista las variables de cada idioma para que confirmes que es la versión
  del desarrollador y que coinciden entre `en` y `es`.
- Cambia **solo las URLs de imágenes** (relativas o de cualquier ambiente) por la del ambiente
  destino con la subcarpeta del proyecto. No duplica la subcarpeta si el HTML ya la trae.
- Rechaza archivos que no estén en `<proyecto>/3_integrado/en/` o `/es/`.

### `/optimizar-imagenes` (auxiliar)

Optimiza PNG/JPG sueltos (una imagen corregida por diseño, un logo nuevo) y los guarda en
`<proyecto>/img/` como `.png` o `.jpg`, el que pese menos. Los originales no se guardan en `img/`.

```
npm run img:optimizar -- --proyecto alerts --dir <carpeta-con-png>
npm run img:optimizar -- --proyecto alerts --files <ruta>/e-banner-es.png --force   # reemplaza la existente (borra la anterior)
npm run img:optimizar -- --proyecto alerts --dir <carpeta> --umbral 38              # más compresión
```

- Por imagen elige el formato más liviano: PNG con paleta, PNG sin pérdida o JPG (solo si no usa
  transparencia).
- `--force` reemplaza la imagen con ese nombre en cualquier extensión (`.png`, `.jpg` o un
  `.webp` antiguo) y borra la anterior. Si la extensión cambió, actualizar el `src` en las
  maquetas.

### `/observaciones-html` (auxiliar, solo a pedido)

Arma una página HTML de observaciones para el equipo de producto a partir de los `.txt` del
proyecto:

- **Izquierda:** el mailing queda fijo.
- **Derecha:** pasan las observaciones. Una línea animada apunta al lugar exacto del correo.
- **Faltas de ortografía:** se resaltan en cian.

**Pide:**
- El proyecto.
- Los mailings a incluir, con **casillas**. Cada uno indica si es nuevo o en qué fecha ya se
  observó, para no repetir los que ya se revisaron.

Guarda `<proyecto>/obs/observaciones-AAAA-MM-DD.html` con su `.json` de datos. **Nunca
sobrescribe**: si ya hay una de ese día, agrega `-2`, `-3`… Es un solo archivo, con las maquetas
y las imágenes embebidas. Claude no lo ejecuta por su cuenta: se invoca con
`/observaciones-html`.

## Ejemplo completo

```
/maquetar-figma      → proyecto "alerts" + carpeta "alerts/" + link EN + link ES + "alert-newFees"
                       → mailings-alerts/1_maqueta/en|es/alert-newFees-local.html
/entregar-dev        → alert-newFees → mailings-alerts/2_entrega/en|es/alert-newFees.html
   (subir las imágenes a PRD en img/alerts/ y enviar los dos HTML al desarrollador)
   (guardar lo que devuelve en mailings-alerts/3_integrado/en|es/alert-newFees.html)
/publicar-ambientes  → alert-newFees → mailings-alerts/4_bucket/dev|qa|prd/en|es/alert-newFees.html
```

## Agregar referencias

Para que `/maquetar-figma` aprenda nuevos patrones (tablas de datos, columnas, otros pies),
copia el HTML de un mailing aprobado a `ref/`. Esa carpeta es común a todos los proyectos. El
skill revisa todos sus archivos en cada maquetación y usa como base el más parecido al diseño.

## Problemas comunes

| Mensaje | Qué hacer |
|---|---|
| `No existe el proyecto mailings-x/` | Revisar el nombre (`--proyecto alerts`) o crear el proyecto con `/maquetar-figma`. |
| `"carpetaImagenes" debe ser una ruta relativa terminada en "/"` | Corregir `proyecto.json`: por ejemplo `"alerts/"`, sin `/` al inicio. |
| `Todas las imágenes deben ser .png o .jpg` | La maqueta apunta a otro formato (ej. un `.webp`): optimizar la imagen con `/optimizar-imagenes` y cambiar el `src` a la extensión que eligió. |
| `Faltan en mailings-x/img/` | La maqueta usa una imagen que no está en el `img/` del proyecto: exportarlo de nuevo o corregir el `src`. |
| `Ya existen en img/ (usa --force…)` | Hay una imagen con ese nombre (en cualquier extensión). Si es otra imagen, renombra el original; si es la misma actualizada, usa `--force` (reemplaza y borra la anterior). |
| `Los originales no van en img/` | Mover el PNG/JPG fuera de `img/` (al scratchpad) y optimizar desde ahí. |
| `Se publica solo desde 3_integrado/<idioma>/` | Guardar primero el HTML del desarrollador en `<proyecto>/3_integrado/en/` o `/es/`. |
| `Aviso: … tiene lang="en" pero está en la carpeta es/` | El HTML quedó en la carpeta del otro idioma o tiene un `lang` incorrecto. |
| `Ambiente "x" no está en ambientes.json` | Usar `dev`, `qa` o `prd`, o agregar el ambiente al JSON. |
| El MCP de Figma tarda o devuelve solo la estructura | Copiar el link seleccionando solo el frame del mailing; el skill pide el detalle por secciones. |
| No se ve el render en `2_entrega/` | Las imágenes aún no están subidas en `img/<carpetaImagenes>` del bucket de PRD. |
