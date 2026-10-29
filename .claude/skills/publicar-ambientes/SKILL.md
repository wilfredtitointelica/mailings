---
name: publicar-ambientes
description: |
  Genera las versiones por ambiente e idioma de un mailing ya integrado por el desarrollador,
  dentro de un proyecto (`mailings-<nombre>/`): toma `<proyecto>/3_integrado/en|es/<nombre>.html`
  (con variables) y crea `<proyecto>/4_bucket/dev|qa|prd/en|es/<nombre>.html` cambiando solo las
  URLs de imágenes por la de cada ambiente (`ambientes.json` + carpeta de imágenes del proyecto,
  ej. `img/alerts/`). No toca variables ni contenido.
  Úsalo cuando el usuario diga "publica el mailing", "genera las versiones por ambiente",
  "genera para dev, qa o prd", o cuando ya tenga el HTML devuelto por el dev en `3_integrado/`.
---

# Publicar mailing por ambiente

## Flujo del proyecto

Todo ocurre dentro de la carpeta del proyecto `mailings-<nombre>/` (ej. `mailings-alerts/`):

1. `/maquetar-figma` → `1_maqueta/en|es/<nombre>-local.html` (rutas `../../img/`, imágenes `.png`/`.jpg`)
2. `/entregar-dev` → `2_entrega/en|es/<nombre>.html` con URLs de PRD, se envía al dev
3. El dev agrega las variables y lo devuelve; el usuario lo guarda en
   `3_integrado/en|es/<nombre>.html` y hace ahí los ajustes visuales
4. **`/publicar-ambientes`** (este) → `4_bucket/dev|qa|prd/en|es/<nombre>.html` desde `3_integrado/`

| Carpeta (dentro de `mailings-<nombre>/`) | Contenido |
|---|---|
| `proyecto.json` | `carpetaImagenes`: subcarpeta de `img/` en el bucket (ej. `alerts/`) |
| `3_integrado/en/`, `3_integrado/es/` | `<nombre>.html` devuelto por el dev, con variables ← **origen de este skill** |
| `4_bucket/<env>/en/`, `4_bucket/<env>/es/` | `<nombre>.html` con la URL de cada ambiente `dev`, `qa`, `prd` ← **este skill** |
| `img/` | Solo imágenes `.png`/`.jpg` optimizadas del proyecto |

**URL de las imágenes** = URL del ambiente en [`ambientes.json`](../../../ambientes.json) (termina
en `/img/`) + `carpetaImagenes` del proyecto + archivo. Si cambia la URL de un ambiente, se edita
solo `ambientes.json`. Si cambia la subcarpeta, solo `proyecto.json`. No preguntar la URL al
usuario.

## Preguntas iniciales

1. **Proyecto**: las carpetas `mailings-*/` del repositorio.
   - Si hay una sola, o el proyecto quedó claro en la conversación, usarlo y decirlo.
   - Si hay varias, preguntar cuál.
2. **Mailing**: qué `<nombre>` publicar (debe existir en `<proyecto>/3_integrado/en/` y `/es/`).
   Si solo hay uno, usarlo y decirlo.
   - **Se publica solo desde `3_integrado/<idioma>/`.** Si el mailing no está ahí, avisar y no
     publicar. El usuario debe guardar primero el HTML devuelto por el dev en la carpeta de su
     idioma, aunque sea un mailing informativo sin variables.
   - Si solo está uno de los idiomas, avisarlo y preguntar si se publica solo ese (`--idioma`).
3. **Ambientes**: por defecto los tres; si el usuario pide uno o dos, usar `--env`.
4. Si algún `4_bucket/<env>/<idioma>/<nombre>.html` ya existe, confirmar antes de sobrescribirlo.

## 1. Control previo

Listar las variables que trae cada HTML (`{...}`, `{{...}}`) por idioma, para que el usuario
confirme que es la versión correcta del dev.
- Señalar si las variables **no coinciden entre `en` y `es`**: falta una en un idioma o se
  escribió distinto.
- Si no tiene ninguna, mencionarlo (puede ser un mailing informativo).

## 2. Generar

```
npm run mail:publicar -- --proyecto <proyecto> --nombre <nombre>                     # ambos idiomas, tres ambientes
npm run mail:publicar -- --proyecto <proyecto> --nombre <nombre> --env dev           # solo un ambiente
npm run mail:publicar -- --proyecto <proyecto> --nombre <nombre> --idioma es --env qa,prd
```

El script ([scripts/rutas.mjs](../../../scripts/rutas.mjs)):
- Escribe `<proyecto>/4_bucket/<env>/<idioma>/<nombre>.html`. Quita `-local` si el dev lo dejó
  en el nombre.
- Cambia solo las rutas de imágenes (`src`, `background`, `url(...)`): las de cualquier ambiente
  (con o sin la subcarpeta del proyecto) y las relativas `../../img/`. Un HTML que ya tiene URLs
  absolutas no termina con la subcarpeta duplicada.
- Falla si alguna imagen no es `.png` ni `.jpg` (Outlook de escritorio no muestra `.webp`) o si
  queda alguna ruta relativa.
- Avisa si el `lang` del HTML no coincide con su carpeta.
- Avisa si hay imágenes con URL de otro dominio, y las deja como están.
- No modifica `3_integrado/`.

## 3. Resumen

- Archivos generados por ambiente e idioma (`4_bucket/dev/en/…`, `4_bucket/dev/es/…`, …).
- Variables encontradas por idioma.
- Imágenes (`.png`/`.jpg`) referenciadas y faltantes en `img/`, si hay. Recordar que en el repo del
  bucket van en **`img/<carpetaImagenes>`** (ej. `img/alerts/`) de cada ambiente.
