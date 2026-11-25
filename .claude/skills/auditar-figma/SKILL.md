---
name: auditar-figma
description: Audita el DISEÑO de Figma de los mailings (errores para que diseño/contenido corrijan Figma) y arma una página HTML scrollytelling para producto. Revisa textos (erratas, frases mal construidas, textos sin traducir o copiados de otro correo, tú/usted, terminología), espaciados (espacios dobles/faltantes, bloques repetidos con distinto interlineado o tamaño) y fuentes que no son Arial, a partir de los `.txt` de `/maquetar-figma`. La maqueta se ve a la izquierda y las observaciones a la derecha, con una línea que apunta a cada punto. Solo se usa cuando el usuario lo pide con /auditar-figma ("auditoría de Figma", "observaciones del diseño/de Figma"). Para errores del HTML generado usar /auditar-html.
disable-model-invocation: true
---

# Auditoría de Figma (página scrollytelling)

Audita el **diseño de Figma** de uno o más mailings y entrega una página para el **equipo de
producto, diseño y contenido**. Todo lo que se reporta aquí **se corrige en Figma** (nodo,
texto actual y qué revisar). Los errores del HTML generado van en `/auditar-html`.

Como la maqueta copia Figma tal cual, la página muestra los errores sobre la maqueta
(`1_maqueta/`) para verlos en contexto:

- **Izquierda:** el mailing queda fijo.
- **Derecha:** las observaciones pasan al hacer scroll. La activa se ilumina, el mailing se
  desplaza hasta el punto observado y una línea curva une la tarjeta con ese punto.
- **Faltas de ortografía:** se resaltan en **cian eléctrico**.

Solo se ejecuta cuando el usuario lo pide. No generarla por cuenta propia al terminar una
maqueta.

## Archivos

El motor de la página es compartido con `/auditar-html` y está en `scripts/auditoria/` (raíz del
repositorio):

| Archivo | Qué hace |
|---|---|
| [scripts/auditoria/plantilla.html](../../../scripts/auditoria/plantilla.html) | Diseño, estilos y animaciones de la página. Recibe los datos en `/*__DATA__*/`. |
| [scripts/auditoria/generar.cjs](../../../scripts/auditoria/generar.cjs) | `--tipo figma`. `--listar`: mailings con `.txt` y cuándo se auditaron. `--validar`: revisa el JSON. Sin opción: escribe `audit/auditoria-figma-AAAA-MM-DD.html` (solo el HTML; los datos van embebidos). |
| [scripts/auditoria/verificar.cjs](../../../scripts/auditoria/verificar.cjs) | Abre la página en Edge headless, comprueba que cada observación encuentra su elemento y toma capturas. |
| [references/ejemplo.json](references/ejemplo.json) | Datos completos de un caso real (5 mailings de alertas). Modelo del formato. |

## 1. Proyecto y mailings

1. **Proyecto**: mostrar las carpetas `mailings-*/` y preguntar de cuál. Si hay una sola, usarla
   y decirlo.
2. **Mailings**: listar los candidatos con

   ```
   node scripts/auditoria/generar.cjs --tipo figma --proyecto <proyecto> --listar
   ```

   Devuelve cada mailing con `.txt`, sus idiomas y las fechas en que ya se auditó (lo lee de los
   datos embebidos en `audit/auditoria-figma-*.html` y en los antiguos `audit/observaciones-*.html`).
   Vienen primero los que nunca se auditaron.
3. Preguntar **siempre** cuáles incluir con **casillas** (`AskUserQuestion`, `multiSelect: true`),
   aunque el usuario ya haya nombrado algunos. Así confirma que no repite mailings ya auditados.
   - Cada opción: `label` = nombre del mailing; `description` = "Nuevo, sin auditar" o
     "Auditado el AAAA-MM-DD" (la última fecha), más los idiomas si falta alguno.
   - Cada pregunta admite hasta 4 opciones: repartir los mailings en hasta **4 preguntas**
     (máximo 16), en el orden de `--listar`, con encabezados como "Nuevos" y "Auditados".
   - Si hay más de 16, mostrar una lista numerada en texto y pedir los números.
   - Incluir solo los marcados.

**Salida, sin sobrescribir nunca:** `<proyecto>/audit/auditoria-figma-AAAA-MM-DD.html`, con la
fecha de generación. Si ya hay una de ese día, el script agrega `-2`, `-3`… **Solo se guarda el
HTML**: no se genera ningún `.json` en `audit/`. Los datos van embebidos en la página y de ahí los
lee `--listar`. El JSON de trabajo vive solo en el scratchpad.

## 2. Auditar

La fuente son los `.txt` de `/maquetar-figma`
(`<proyecto>/1_maqueta/<idioma>/<nombre>-local.txt`), que ya traen nodo, texto actual y qué
revisar. Además:

- **Auditoría de espaciados obligatoria.** Si el `.txt` no tiene la línea "Auditoría de
  espaciados", hacerla ahora con el Figma MCP (link en el encabezado del `.txt`; ver
  `/maquetar-figma`, paso 7.4) y agregar el resultado al `.txt`:
  - Espacios en los textos: dobles, al inicio o al final, que faltan o sobran entre partes
    (ej. "AI15067-" vs "AI15067 -").
  - **Bloques repetidos** (tarjetas, filas, tablas): comparar entre sí medidas (metadata) e
    interlineado, tamaño de fuente, padding y separaciones (`get_design_context`). Cada
    diferencia es un error a corregir.
- Si el usuario dice que Figma cambió, volver a leer los nodos afectados y actualizar el `.txt`
  antes de armar la página.

## 3. Armar el JSON de datos

Leer cada `.txt` (EN y ES) y escribir `<scratchpad>/auditoria-figma.json` con la forma de
[references/ejemplo.json](references/ejemplo.json):

```json
{
  "titulo": "Mailings de alertas",
  "fecha": "29 de octubre de 2026",
  "erratas": ["healps", "oput-out", "wether"],
  "mailings": [
    {
      "nombre": "alert-newFees",
      "descripcion": "Aviso de nuevas cuotas facturadas por primera vez.",
      "aviso": "(opcional) recuadro destacado bajo el título",
      "en": { "figma": "<link de Figma del .txt>", "items": [
        { "prioridad": "corregir", "donde": "Mensaje principal", "nodo": "6528:79178",
          "actual": "\"We've {{#}} new fee codes were billed...\"",
          "revisar": "La frase está mal construida: ...",
          "objetivo": "new fee codes" }
      ] },
      "es": { "figma": "...", "items": [] }
    }
  ],
  "cierre": [
    { "titulo": "Se repite en varios correos", "items": ["**\"Ver en el browser\"** en el pie..."] },
    { "titulo": "Sugerencias de diseño (opcionales)", "items": [] },
    { "titulo": "A tener en cuenta", "items": [] }
  ]
}
```

Reglas para pasar del `.txt` al JSON:

- **Lectores: equipo de producto, diseño y contenido.** Lenguaje simple y frases cortas, sin
  términos de maquetación (td, padding, line-height → "interlineado"). Usar la misma voz que el
  Word de observaciones, si existe.
- **`prioridad`** (`--tipo figma`):
  - `corregir`: error claro (falta de ortografía, frase mal construida, texto sin traducir o
    copiado de otro correo, títulos distintos entre idiomas) y **todo tema de espaciado**:
    espacios dobles, espacios al inicio o al final, espacio que falta o sobra (ej. "AI15067-"
    vs "AI15067 -"), e interlineados, tamaños o separaciones distintos entre bloques que
    deberían ser iguales (ej. tarjetas repetidas con distinta altura de cabecera).
  - `revisar`: inconsistencias de redacción (terminología, tú/usted, mayúsculas, formato de
    fechas, mezcla de idiomas).
  - `fuente`: el texto no usa Arial en Figma.
  - `corregido`: errata ya corregida en la maqueta (sección 0 del `.txt`).
- **`donde`:** la parte del correo en palabras de producto ("Mensaje principal", "Pie del
  correo", "Franja oscura"). **`nodo`:** el o los nodos de Figma del `.txt`, separados por
  ` · `.
- **`actual`:** el texto de Figma entre comillas, recortado con `...` si es largo.
  **`revisar`:** qué está mal, en una o dos frases, sin imponer la redacción final.
- **`objetivo`:** a qué apunta la línea en la maqueta.
  - **Texto:** un fragmento **literal que exista en el HTML de la maqueta** y que esté dentro de
    un mismo elemento (si cruza una negrita, marca el elemento contenedor). Se marca la
    **primera** aparición, así que debe ser único o estar en la primera aparición que interesa.
    Si la errata ya se corrigió en la maqueta, usar el texto corregido ("helps", no "healps").
  - **Imagen:** `{ "img": "<prefijo del archivo>" }` cuando lo observado está dentro de una
    imagen (ej. `{ "img": "e-optout-dashboard" }`).
  - **Elemento sin texto propio:** `{ "selector": "<selector CSS>" }`.
- **`erratas`:** solo las **palabras mal escritas**, tal como aparecen en Figma ("healps",
  "wether"). Son las que se resaltan en cian. No incluir espacios dobles ni errores de
  gramática.
- **`aviso`:** solo para algo que cambia la lectura de todo el correo (ej. "tiene los textos de
  otro mailing").
- **`cierre`:**
  - **"Se repite en varios correos":** lo que aparece en 2 o más mailings.
  - **"Sugerencias de diseño (opcionales)":** las sugerencias no aplicadas de los `.txt`,
    unificadas.
  - **"A tener en cuenta":** Outlook (esquinas rectas), links pendientes, datos de ejemplo y
    dudas para desarrollo.

  `**texto**` se muestra en negrita. Si una tarjeta queda vacía, se omite.
- No incluir lo puramente técnico del `.txt` (notas de maquetación, mediciones, anchos). Eso es
  de `/auditar-html`.

## 4. Generar

Primero validar, sin escribir nada:

```
node scripts/auditoria/generar.cjs --tipo figma --proyecto <proyecto> --data <scratchpad>/auditoria-figma.json --validar
```

- Falla si falta una maqueta o una imagen, o si una prioridad no es válida.
- Lista **avisos** de objetivos que no encontró en el texto de la maqueta. Corregir esos
  `objetivo` en el JSON y volver a validar hasta que diga `ok`.

Recién entonces generar, una sola vez, para no dejar versiones `-2` de más en `audit/`:

```
node scripts/auditoria/generar.cjs --tipo figma --proyecto <proyecto> --data <scratchpad>/auditoria-figma.json
```

## 5. Verificar

`puppeteer-core` se instala en el scratchpad, nunca en el proyecto:

```
npm install puppeteer-core --prefix <scratchpad>/pptr
NODE_PATH=<scratchpad>/pptr/node_modules node scripts/auditoria/verificar.cjs <proyecto>/audit/auditoria-figma-AAAA-MM-DD.html <scratchpad>/capturas
```

- Debe decir `ok` en todos los bloques y `Errores JS: ninguno`.
- Abrir algunas capturas (`auditoria-portada.png`, `auditoria-01.png`, …) y comprobar tres
  cosas: la marca está sobre el texto correcto, la línea llega a ese punto y la tarjeta activa
  se ve iluminada.

## 6. Resumen al usuario

- Ruta del HTML (`<proyecto>/audit/auditoria-figma-AAAA-MM-DD.html`), peso, mailings incluidos y
  cantidad de observaciones por prioridad. Los HTML anteriores de `audit/` quedan intactos.
- Resultado de la verificación: todas las observaciones con su marca y sin errores JS.
- Cómo se usa: abrir con doble clic o compartir el archivo. Solo la fuente Inter se carga de
  Google Fonts; sin internet usa la del sistema.
- Ofrecer en una línea publicarla como página privada en claude.ai si se quiere compartir por
  link, y en otra línea `/auditar-html` si todavía no se auditó el HTML.
