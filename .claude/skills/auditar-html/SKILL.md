---
name: auditar-html
description: Audita el HTML GENERADO de los mailings (errores que se corrigen en el HTML, no en Figma) y arma una página HTML scrollytelling con el mailing a la izquierda y los hallazgos a la derecha. Revisa fidelidad con Figma (render de Edge vs screenshot, medido al pixel), compatibilidad con clientes de correo (tablas, estilos inline, bgcolor, mso, Outlook), peso (< 102 KB de Gmail), imágenes (existencia, .png/.jpg, 2x, proporción, URL del ambiente), links (href="#", https, target, color en Gmail), variables EN vs ES y estructura EN vs ES. Funciona sobre cualquier etapa: 1_maqueta, 2_entrega, 3_integrado o 4_bucket/<env>. Solo se usa cuando el usuario lo pide con /auditar-html ("auditoría del HTML", "observaciones del HTML", "observaciones-html"). Para errores del diseño de Figma usar /auditar-figma.
disable-model-invocation: true
---

# Auditoría del HTML (página scrollytelling)

Audita el **HTML generado** de uno o más mailings: todo lo que se reporta aquí **se corrige en el
HTML** (maqueta o archivos de entrega/integrado/bucket), no en Figma. Los errores del diseño
(textos, espaciados de Figma, fuentes) van en `/auditar-figma`.

**Lectores:** maquetación y desarrollo. Se puede usar lenguaje técnico (td, padding,
line-height, `bgcolor`), pero cada hallazgo dice **qué falla, dónde (línea) y cómo se ve el
efecto** en una o dos frases.

La página es la misma que la de `/auditar-figma`: el mailing fijo a la izquierda y los hallazgos
a la derecha, con una línea que apunta al elemento. Solo se ejecuta cuando el usuario lo pide.

## Archivos

Todo vive en `scripts/auditoria/` (raíz del repositorio), compartido con `/auditar-figma`:

| Archivo | Qué hace |
|---|---|
| [revisar-html.cjs](../../../scripts/auditoria/revisar-html.cjs) | Revisión estática de un mailing (EN y ES): peso, `lang`/`title`, `<style>`/clases/`div`/flex/margin, atributos de tablas, `bgcolor` + `background-color`, textos sin Arial / `line-height` en px / `mso-line-height-rule`, imágenes (alt, width/height, `display:block`, .webp, existe en `img/`, 2x, proporción, URL del ambiente; `--red` comprueba que respondan 200), links (`href="#"`, https, `target`, `<span>` con color), estructura y variables EN vs ES, y `4_bucket` vs `3_integrado`. Imprime hallazgos **candidatos** en JSON. |
| [comparar-render.cjs](../../../scripts/auditoria/comparar-render.cjs) | Renderiza el HTML con Edge headless y lo compara con el screenshot de Figma: alto total, posición y alto de cada banda de contenido y extensión horizontal. Marca diferencias > 1px y deja tramos de 600px para mirarlos. |
| [generar.cjs](../../../scripts/auditoria/generar.cjs) | `--tipo html --etapa <etapa>`. `--listar`, `--validar` y generación de `audit/auditoria-html-AAAA-MM-DD.html` (solo el HTML; los datos van embebidos). |
| [verificar.cjs](../../../scripts/auditoria/verificar.cjs) | Abre la página en Edge headless, comprueba que cada hallazgo encuentra su elemento y toma capturas. |
| [plantilla.html](../../../scripts/auditoria/plantilla.html) | Diseño de la página. |

## 1. Preguntas iniciales

Hacerlas juntas:

1. **Proyecto**: mostrar las carpetas `mailings-*/`; si hay una sola, usarla y decirlo.
2. **Etapa** a auditar (`AskUserQuestion`): `1_maqueta` (por defecto), `2_entrega`,
   `3_integrado` o `4_bucket/dev|qa|prd`.
3. **Mailings**, con casillas, a partir de

   ```
   node scripts/auditoria/generar.cjs --tipo html --proyecto <proyecto> --etapa <etapa> --listar
   ```

   Igual que en `/auditar-figma`: hasta 4 preguntas `multiSelect` de hasta 4 opciones, en el
   orden de `--listar` (primero los nunca auditados en esa etapa), con `description` "Nuevo, sin
   auditar" o "Auditado el AAAA-MM-DD". Más de 16: lista numerada en texto.

**Salida, sin sobrescribir nunca:** `<proyecto>/audit/auditoria-html-AAAA-MM-DD.html`. Si ya hay
una de ese día, agrega `-2`, `-3`… **Solo se guarda el HTML**: no se genera ningún `.json` en
`audit/`. La etapa y los mailings van embebidos en la página y de ahí los lee `--listar`. El JSON
de trabajo vive solo en el scratchpad.

## 2. Auditar cada mailing

### 2.1 Revisión estática

```
node scripts/auditoria/revisar-html.cjs --proyecto <proyecto> --mailing <nombre> --etapa <etapa> [--red]
```

Usar `--red` en `2_entrega` y `4_bucket/*` (imágenes con URL absoluta). Los hallazgos son
candidatos: confirmar cada uno mirando el HTML (línea indicada) antes de pasarlo al JSON;
descartar falsos positivos y agrupar los repetidos.

### 2.2 Fidelidad con Figma (render vs screenshot)

En `1_maqueta`, `2_entrega` y `3_integrado` (en `4_bucket` basta con que la revisión estática
confirme que es igual a `3_integrado` salvo las URLs):

1. Link de Figma de cada idioma: está en el encabezado del `.txt` de la maqueta.
2. `create_session` + `get_screenshot` del frame con `maxDimension` ≥ alto del frame, y
   descargarlo con `curl -f -L` al scratchpad.
3. Comparar:

   ```
   node scripts/auditoria/comparar-render.cjs --html <archivo.html> --figma <screenshot.png> --out <scratchpad>/cmp-<nombre>-<idioma>
   ```

4. Cada banda marcada (`<<`) se mira en los tramos `figma-NN.png` / `render-NN.png` y se busca la
   causa en el HTML (padding, ancho de columna, corte de línea distinto, imagen de otro tamaño…).
   Diferencias ≤ 1px son suavizado de fuente, no se reportan.
   - **Cortes de línea distintos** son un error típico: el navegador no corta después de `/`
     (Figma sí). Ej. "ME/AFR)": se arregla con `&#8203;` después de la barra.
   - En `3_integrado` los textos pueden ser variables: comparar solo la estructura (alturas de
     bloques fijos, anchos, colores) y decirlo.

### 2.3 Revisión manual (lo que los scripts no ven)

- **Contra el `.txt` de la maqueta**: que las correcciones anotadas en "Diferencias con Figma"
  sigan aplicadas y que no haya diferencias nuevas sin explicar.
- **Contra las reglas de `/maquetar-figma`**: dominios y correos visibles convertidos en enlace
  con la misma apariencia, variables del diseño copiadas tal cual, cajas de color de tamaño fijo
  en tabla propia, `width` del `td` sin contar padding/borde, comentarios `BEGIN/END` y
  `fila <nombre>` iguales en ambos idiomas.
- **Por etapa:**
  - `2_entrega`: todas las imágenes con URL de PRD + `carpetaImagenes`; nada más cambió respecto
    de `1_maqueta` (comparar los dos archivos sin las URLs).
  - `3_integrado`: no quedan `href="#"`; las variables tienen el mismo nombre en EN y ES; el dev
    no rompió estilos inline (comparar con `2_entrega`).
  - `4_bucket/<env>`: URLs del ambiente correcto y resto idéntico a `3_integrado`.

## 3. Corregir (opcional, con aprobación)

Al terminar, mostrar la lista de hallazgos `error` y `compatibilidad` y preguntar si se corrigen
en el HTML (todos / algunos por número / ninguno). Solo en archivos del proyecto de la etapa
auditada (nunca en `ref/`). Lo corregido:

- Se vuelve a verificar (revisión estática y `comparar-render.cjs`).
- Va al JSON con prioridad `corregido`, diciendo qué se cambió.
- Si se corrigió `1_maqueta`, avisar que hay que volver a correr `/entregar-dev` (y lo que siga).
- Si la causa también está en el generador o en la maqueta de origen, corregirla ahí.

## 4. Armar el JSON de datos

`<scratchpad>/auditoria-html.json`, con la misma forma que el de `/auditar-figma`:

```json
{
  "titulo": "Mailings de alertas · 1_maqueta",
  "fecha": "9 de noviembre de 2026",
  "mailings": [
    {
      "nombre": "alerts-announcements",
      "descripcion": "Resumen semanal de anuncios con posible impacto financiero.",
      "en": { "figma": "<link de Figma>", "items": [
        { "prioridad": "error", "donde": "Tarjetas · Jurisdicción", "nodo": "línea 160",
          "actual": "\"Selected countries (ASIA & ME/AFR)\" corta antes de \"ME/AFR)\"",
          "revisar": "Figma corta después de \"ME/\"; Edge no corta tras la barra. Agregar &#8203; después de \"ME/\".",
          "objetivo": "Selected countries" }
      ] },
      "es": { "figma": "...", "items": [] }
    }
  ],
  "cierre": [
    { "titulo": "Se repite en varios correos", "items": [] },
    { "titulo": "Para desarrollo", "items": [] },
    { "titulo": "A tener en cuenta", "items": [] }
  ]
}
```

- **`prioridad`** (`--tipo html`):
  - `error`: se ve distinto a Figma (> 1px, corte de línea, color, imagen), algo roto (imagen que
    no existe o no responde, URL de otro ambiente, `lang` equivocado, variables distintas entre
    idiomas, `href="#"` en `3_integrado`/`4_bucket`, `.webp`, peso > 102 KB).
  - `compatibilidad`: funciona en el navegador pero corre riesgo en algún cliente de correo
    (falta `bgcolor`, `mso-line-height-rule`, `margin`, `div`, `<style>`, link sin `<span>` de
    color, peso cerca del límite).
  - `accesibilidad`: `alt`, `title`, `lang`.
  - `mejora`: opcional (imagen a menos de 2x, `target="_blank"`, links pendientes esperados en
    `1_maqueta`/`2_entrega`).
  - `corregido`: se corrigió durante la auditoría (decir qué se cambió).
- **`donde`:** sección del correo + elemento ("Tarjetas · Jurisdicción", "Pie · links").
  **`nodo`:** `línea N` del HTML (o varias, separadas por ` · `).
- **`actual`:** qué tiene hoy el HTML (valor, fragmento o medida). **`revisar`:** qué falla y
  cómo se arregla, en una o dos frases.
- **`objetivo`:** texto literal del HTML, `{ "img": "<prefijo>" }` o
  `{ "selector": "<selector CSS>" }` para elementos sin texto propio (una celda, una tabla).
  Se marca el primer elemento que coincide.
- **`figma`:** el link del frame de ese idioma (opcional; muestra el botón "Figma ↗").
- Sin `erratas`: la ortografía es de `/auditar-figma`.
- **`cierre`:** "Se repite en varios correos" (2 o más mailings), "Para desarrollo" (lo que
  necesita el dev: links pendientes, variables, imágenes por subir al bucket) y "A tener en
  cuenta" (Outlook, peso, límites de la comparación).
- Si un mailing no tiene hallazgos en un idioma, dejar `items: []` y decirlo en el resumen.

## 5. Generar y verificar

```
node scripts/auditoria/generar.cjs --tipo html --etapa <etapa> --proyecto <proyecto> --data <scratchpad>/auditoria-html.json --validar
node scripts/auditoria/generar.cjs --tipo html --etapa <etapa> --proyecto <proyecto> --data <scratchpad>/auditoria-html.json
npm install puppeteer-core --prefix <scratchpad>/pptr
NODE_PATH=<scratchpad>/pptr/node_modules node scripts/auditoria/verificar.cjs <proyecto>/obs/auditoria-html-AAAA-MM-DD.html <scratchpad>/capturas
```

Validar hasta que diga `ok`; generar una sola vez; la verificación debe decir `ok` en todos los
bloques y `Errores JS: ninguno`. Mirar algunas capturas (marca, línea, tarjeta activa).

## 6. Resumen al usuario

- Etapa auditada, mailings y ruta del HTML (`<proyecto>/audit/auditoria-html-AAAA-MM-DD.html`), peso
  y cantidad de hallazgos por prioridad.
- Resultado de la comparación con Figma por idioma (alto total y bandas con diferencias).
- Lo corregido (si se aprobó) y qué pasos del flujo hay que repetir.
- Resultado de la verificación de la página.
- Ofrecer en una línea publicarla como página privada en claude.ai, y en otra `/auditar-figma`
  si todavía no se auditó el diseño.
