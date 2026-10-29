---
name: observaciones-html
description: Arma una página HTML de observaciones en formato scrollytelling para el equipo de producto. A la izquierda se ve cada mailing fijo; a la derecha pasan las observaciones de sus `.txt`, y una línea animada apunta al lugar exacto del correo. Es un solo archivo, con maquetas e imágenes embebidas. Solo se usa cuando el usuario lo pide explícitamente con /observaciones-html.
disable-model-invocation: true
---

# Página de observaciones (scrollytelling)

Convierte los `.txt` de observaciones que deja `/maquetar-figma`
(`<proyecto>/1_maqueta/<idioma>/<nombre>-local.txt`, con proyecto = `mailings-<nombre>/`) en una
página para el **equipo de producto**:

- **Izquierda:** el mailing queda fijo.
- **Derecha:** las observaciones pasan al hacer scroll. La activa se ilumina, el mailing se
  desplaza hasta el punto observado y una línea curva une la tarjeta con ese punto.
- **Faltas de ortografía:** se resaltan en **cian eléctrico**.

Solo se ejecuta cuando el usuario lo pide. No generarla por cuenta propia al terminar una
maqueta.

## Archivos del skill

| Archivo | Qué hace |
|---|---|
| [assets/plantilla.html](assets/plantilla.html) | Diseño, estilos y animaciones de la página. Recibe los datos en `/*__DATA__*/`. |
| [scripts/generar.cjs](scripts/generar.cjs) | `--listar`: mailings del proyecto y cuándo se observaron. `--validar`: revisa el JSON. Sin opción: embebe las maquetas y las imágenes del proyecto y escribe `obs/observaciones-AAAA-MM-DD.html` (+ `.json`). |
| [scripts/verificar.cjs](scripts/verificar.cjs) | Abre la página en Edge headless, comprueba que cada observación encuentra su elemento y toma capturas. |
| [references/ejemplo.json](references/ejemplo.json) | Datos completos de un caso real (5 mailings de alertas). Usarlo como modelo del formato. |

## 1. Proyecto y mailings

1. **Proyecto**: mostrar las carpetas `mailings-*/` y preguntar de cuál. Si hay una sola, usarla
   y decirlo.
2. **Mailings**: listar los candidatos con

   ```
   node .claude/skills/observaciones-html/scripts/generar.cjs --proyecto <proyecto> --listar
   ```

   Devuelve cada mailing con `.txt`, sus idiomas y las fechas en que ya se observó (sale de los
   `obs/*.json` anteriores). Vienen primero los que nunca se observaron.
3. Preguntar **siempre** cuáles incluir con **casillas** (`AskUserQuestion`, `multiSelect: true`),
   aunque el usuario ya haya nombrado algunos. Así confirma que no repite mailings ya observados.
   - Cada opción: `label` = nombre del mailing; `description` = "Nuevo, sin observar" u
     "Observado el AAAA-MM-DD" (la última fecha), más los idiomas si falta alguno.
   - Cada pregunta admite hasta 4 opciones: repartir los mailings en hasta **4 preguntas**
     (máximo 16), en el orden de `--listar`, con encabezados como "Nuevos" y "Observados".
   - Si hay más de 16, mostrar una lista numerada en texto y pedir los números.
   - Incluir solo los marcados.

**Salida, sin sobrescribir nunca:** `<proyecto>/obs/observaciones-AAAA-MM-DD.html`, con la fecha
de generación. Si ya hay una de ese día, el script agrega `-2`, `-3`… Junto al HTML guarda el JSON
de datos con el mismo nombre; es lo que usa `--listar` para saber qué se observó.

## 2. Armar el JSON de datos

Leer cada `.txt` (EN y ES) y escribir `<scratchpad>/observaciones.json` con la forma de
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

- **Lectores: equipo de producto.** Lenguaje simple y frases cortas, sin términos de
  maquetación (td, padding, line-height → "interlineado"). Usar la misma voz que el Word de
  observaciones, si existe.
- **`prioridad`:**
  - `corregir`: error claro (falta de ortografía, frase mal construida, texto sin traducir o
    copiado de otro correo, títulos distintos entre idiomas).
  - `revisar`: inconsistencias (terminología, tú/usted, mayúsculas, espacios dobles, mezcla de
    idiomas).
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
- **`erratas`:** solo las **palabras mal escritas**, tal como aparecen en Figma ("healps",
  "wether"). Son las que se resaltan en cian. No incluir espacios dobles ni errores de
  gramática.
- **`aviso`:** solo para algo que cambia la lectura de todo el correo (ej. "tiene los textos de
  otro mailing").
- **`cierre`:**
  - **"Se repite en varios correos":** lo que aparece en 2 o más mailings.
  - **"Sugerencias de diseño (opcionales)":** las sugerencias no aplicadas de los `.txt`,
    unificadas.
  - **"A tener en cuenta":** Outlook (esquinas rectas), links pendientes, datos de ejemplo y dudas para
    desarrollo.

  `**texto**` se muestra en negrita. Si una tarjeta queda vacía, se omite.
- No incluir lo puramente técnico del `.txt` (notas de maquetación, mediciones, anchos).

## 3. Generar

Primero validar, sin escribir nada:

```
node .claude/skills/observaciones-html/scripts/generar.cjs --proyecto <proyecto> --data <scratchpad>/observaciones.json --validar
```

- Falla si falta una maqueta o una imagen, o si una prioridad no es válida.
- Lista **avisos** de objetivos que no encontró en el texto de la maqueta. Corregir esos
  `objetivo` en el JSON y volver a validar hasta que diga `ok`.

Recién entonces generar, una sola vez, para no dejar versiones `-2` de más en `obs/`:

```
node .claude/skills/observaciones-html/scripts/generar.cjs --proyecto <proyecto> --data <scratchpad>/observaciones.json
```

## 4. Verificar

`puppeteer-core` se instala en el scratchpad, nunca en el proyecto:

```
npm install puppeteer-core --prefix <scratchpad>/pptr
NODE_PATH=<scratchpad>/pptr/node_modules node .claude/skills/observaciones-html/scripts/verificar.cjs <proyecto>/obs/observaciones-AAAA-MM-DD.html <scratchpad>/capturas
```

- Debe decir `ok` en todos los bloques y `Errores JS: ninguno`.
- Abrir algunas capturas (`obs-portada.png`, `obs-01.png`, …) y comprobar tres cosas: la
  marca está sobre el texto correcto, la línea llega a ese punto y la tarjeta activa se ve
  iluminada.

## 5. Resumen al usuario

- Ruta del HTML (`<proyecto>/obs/observaciones-AAAA-MM-DD.html`), peso, mailings incluidos y
  cantidad de observaciones. Los HTML anteriores de `obs/` quedan intactos.
- Resultado de la verificación: todas las observaciones con su marca y sin errores JS.
- Cómo se usa: abrir con doble clic o compartir el archivo. Solo la fuente Inter se carga de
  Google Fonts; sin internet usa la del sistema.
- Ofrecer en una línea publicarla como página privada en claude.ai si se quiere compartir por
  link.
