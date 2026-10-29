# Buenas prácticas de maquetación de mailings

Checklist para revisar el diseño de Figma y armar las sugerencias del paso 4. Sugerir solo lo
que aplica al diseño actual, con su motivo.

**Manda Figma**: estas sugerencias son informativas. Sin aprobación explícita del usuario se
respeta el diseño tal cual (tamaños, colores/contraste, pie de página). No sugerir lo ya
decidido en el proyecto:
- Esquinas redondeadas: se mantienen (Producto sabe que en Outlook salen rectas).
- Links y variables: botones y textos de acción van con `href="#"`; las variables las coloca
  el dev. Los dominios visibles (ej. `incontrol.intelica.com`) van como enlace `https://` y los
  correos (ej. `clientsuccess@intelica.com`) como `mailto:`, con la misma apariencia que en Figma.
- Fuentes distintas de Arial: no es sugerencia, se reporta para que el diseñador corrija Figma.

## Estructura y compatibilidad
- **Tablas para el layout**, nunca `div` con flex/grid/float: Outlook de escritorio usa el motor
  de Word y los ignora.
- **Ancho máximo 600px** en el contenedor; si el diseño es más ancho, proponer escalarlo.
- **Estilos inline.** Gmail y otros eliminan `<style>` en algunos casos; no usar clases.
- `bgcolor` **y** `background-color` en los fondos (Outlook lee el atributo).
- **Padding en `<td>`**, no `margin` (Outlook ignora margin en muchos elementos).
- **`width` de un `td` = solo contenido**: padding y borde se suman por fuera. Restarlos para
  respetar la medida de Figma.
- **Cajas de color de tamaño fijo** (fondo de ícono, badge) en una tabla propia, nunca como
  fondo del `td` de la fila: ese `td` toma la altura del texto vecino y la caja se deforma
  cuando el texto ocupa más líneas (típico al pasar de inglés a español).
- Imágenes de fondo (`background-image`) → evitarlas; si son imprescindibles, proponer
  color sólido de fallback.
- Sombras no se ven en Outlook: avisar que ahí saldrán sin sombra.

## Tipografía
- Todo en **Arial, sans-serif**; Outlook no carga fuentes web. Si Figma usa otra (Inter,
  Lato…), reportarlo para que lo corrija el diseñador.
- **Cuerpo ≥ 14px** y textos legales ≥ 10px; iOS agranda textos menores a 13px.
- `line-height` en **px** + `mso-line-height-rule: exactly`.
- `-ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%` para evitar autoescalado.

## Imágenes
- **Texto real, no texto dentro de imágenes**: se lee con imágenes bloqueadas, es accesible y
  no cae en filtros de spam.
- `alt` descriptivo en todas; `alt=""` solo en decorativas.
- `width` y `height` explícitos (tamaño 1x) + `display:block` para evitar huecos.
- Exportar a 2x para pantallas retina.
- Ilustraciones compuestas (capturas de producto, textos muy pequeños) → una sola imagen.
- Íconos repetidos → una sola imagen `.png` transparente reutilizada; su fondo de color va en HTML.
- Proporción texto/imagen: si el mailing es casi todo imagen, sugerir pasar contenido a texto.

## CTA
- **Botón bulletproof** (`<td bgcolor>` + `<a>` con padding) en lugar de botón-imagen.
- Área táctil cómoda (≥ 44px de alto aprox.) en móvil.
- Incluir el link en texto plano debajo si el botón lleva a una acción importante.

## Accesibilidad y contenido
- Contraste de texto ≥ 4.5:1 (WCAG AA); revisar grises claros sobre blanco.
- `lang` en `<html>` (`en` o `es` según la versión) y `<title>` con el asunto en ese idioma.
- Links con `target="_blank"` y texto descriptivo (no "click aquí").
- Variables de plantilla (`{User}`, `{Url}`) sin espacios ni cambios de mayúsculas.

## Peso
- HTML **< 102 KB**: Gmail recorta ("Mensaje recortado") por encima de ese tamaño.
- Imágenes livianas: `.png` o `.jpg` (nunca `.webp`, Outlook de escritorio no lo muestra), con el
  formato y la calidad que elige `scripts/optimizar.mjs`.
