---
name: entregar-dev
description: |
  Genera los HTML que se entregan al desarrollador, uno por idioma, dentro de un proyecto
  (`mailings-<nombre>/`): copia `<proyecto>/1_maqueta/en|es/<nombre>-local.html` a
  `<proyecto>/2_entrega/en|es/<nombre>.html` con las imágenes (`.png`/`.jpg`) en URL absoluta
  de PRD (ambiente "entrega" de `ambientes.json` + carpeta de imágenes del proyecto, ej.
  `img/alerts/`), para que el dev vea el render mientras agrega las variables.
  Úsalo cuando el usuario diga "entrega el mailing", "genera la versión para el dev",
  "prepara el html para desarrollo", o después de `/maquetar-figma`.
---

# Entregar mailing al desarrollador

## Flujo del proyecto

Todo ocurre dentro de la carpeta del proyecto `mailings-<nombre>/` (ej. `mailings-alerts/`):

1. `/maquetar-figma` → `1_maqueta/en|es/<nombre>-local.html` (rutas `../../img/`, imágenes `.png`/`.jpg`)
2. **`/entregar-dev`** (este) → `2_entrega/en|es/<nombre>.html` con URLs de PRD, se envía al dev
3. El dev agrega las variables y lo devuelve; el usuario lo guarda en
   `3_integrado/en|es/<nombre>.html` y hace ahí los ajustes visuales
4. `/publicar-ambientes` → `4_bucket/dev|qa|prd/en|es/<nombre>.html` desde `3_integrado/`

`/optimizar-imagenes` es auxiliar: para agregar o reemplazar imágenes sueltas.

| Carpeta (dentro de `mailings-<nombre>/`) | Contenido |
|---|---|
| `proyecto.json` | `carpetaImagenes`: subcarpeta de `img/` en el bucket (ej. `alerts/`) |
| `1_maqueta/en/`, `1_maqueta/es/` | `<nombre>-local.html`, rutas relativas `../../img/` |
| `2_entrega/en/`, `2_entrega/es/` | `<nombre>.html` con URLs de PRD, para el dev ← **este skill** |
| `3_integrado/en/`, `3_integrado/es/` | `<nombre>.html` devuelto por el dev, con variables |
| `4_bucket/<env>/en/`, `4_bucket/<env>/es/` | `<nombre>.html` con la URL de cada ambiente `dev`, `qa`, `prd` |
| `img/` | Solo imágenes `.png`/`.jpg` optimizadas del proyecto |

**URL de las imágenes** = URL del ambiente en [`ambientes.json`](../../../ambientes.json) (termina
en `/img/`) + `carpetaImagenes` del proyecto + archivo. Ejemplo:
`https://…-prd-…amazonaws.com/img/alerts/e-logo-incontrol.png`. El ambiente de la entrega lo
define `"entrega"` (hoy `prd`). No preguntar la URL al usuario.

## Requisito: imágenes en .png o .jpg

La entrega va **siempre con imágenes `.png` o `.jpg`** (Outlook de escritorio para Windows no
muestra `.webp`). Si algún `src` apunta a otro formato o a una imagen que no existe en
`<proyecto>/img/`, el script falla y lo lista. Hay que corregir la maqueta (o optimizar la
imagen con `/optimizar-imagenes` y usar en el `src` la extensión que eligió) y volver a
entregar.

## Preguntas iniciales

1. **Proyecto**: las carpetas `mailings-*/` del repositorio.
   - Si hay una sola, o el proyecto quedó claro en la conversación (ej. se acaba de maquetar),
     usarlo y decirlo.
   - Si hay varias, preguntar cuál.
2. **Mailing**: qué `<nombre>` entregar (debe existir en `<proyecto>/1_maqueta/en/` y `/es/`).
   - Si solo hay uno, usarlo y decirlo.
   - Si falta uno de los idiomas, avisarlo y preguntar si se entrega solo el otro (`--idioma`).
3. Si `<proyecto>/2_entrega/<idioma>/<nombre>.html` ya existe, confirmar antes de sobrescribirlo.

## 1. Generar

```
npm run mail:entregar -- --proyecto <proyecto> --nombre <nombre>               # ambos idiomas
npm run mail:entregar -- --proyecto <proyecto> --nombre <nombre> --idioma es   # solo uno
```

`--proyecto` acepta `alerts` o `mailings-alerts`. El script
([scripts/rutas.mjs](../../../scripts/rutas.mjs)):
- Escribe `<proyecto>/2_entrega/<idioma>/<nombre>.html`, sin el sufijo `-local`.
- Cambia cada `../../img/<archivo>` por `<url-prd><carpetaImagenes><archivo>` (`.png` o `.jpg`).
- Falla si:
  - alguna imagen no es `.png` ni `.jpg`;
  - falta alguna en `img/`;
  - queda alguna ruta relativa;
  - `carpetaImagenes` no es válida.
- Avisa si el `lang` del HTML no coincide con su carpeta.
- Imprime las imágenes referenciadas.
- No modifica `1_maqueta/`.

## 2. Resumen

- Archivos para el dev: `<proyecto>/2_entrega/en/<nombre>.html` y `/es/<nombre>.html`.
- URL base usada, por ejemplo `…/img/alerts/`.
- **Imágenes (`.png`/`.jpg`) que deben estar subidas en el bucket de PRD**, en
  `img/<carpetaImagenes>` (ej. `img/alerts/`), para que el dev vea el render. Va la lista del
  script, incluidas las de cada idioma.
- Siguiente paso: cuando el dev los devuelva con variables, guardarlos en
  `<proyecto>/3_integrado/en|es/<nombre>.html` y luego correr **`/publicar-ambientes`**.
