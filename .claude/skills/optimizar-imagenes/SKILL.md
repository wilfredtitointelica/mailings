---
name: optimizar-imagenes
description: |
  Optimiza imágenes PNG/JPG (exportadas de Figma o entregadas por diseño) y las guarda en
  `<proyecto>/img/` (proyecto = `mailings-<nombre>/`) como `.png` o `.jpg`, el que pese menos:
  por imagen prueba calidades 75–100 y se queda con la más liviana sin pérdida visible (JPG solo
  si la imagen no usa transparencia; PNG con paleta o sin pérdida). No se usa `.webp` porque
  Outlook de escritorio para Windows no lo muestra. `/maquetar-figma` ya lo hace al exportar;
  este skill es para agregar o reemplazar imágenes sueltas después (una imagen corregida por
  diseño, un logo nuevo) o para recomprimir con otro umbral.
  Úsalo cuando el usuario diga "optimiza las imágenes", "comprime las imágenes",
  "agrega/reemplaza la imagen" u "optimiza las imágenes del mailing".
---

# Optimizar imágenes a `.png` / `.jpg`

Flujo principal: `maquetar-figma` (ya exporta optimizado a `.png`/`.jpg`) → `entregar-dev` → el
dev devuelve a `3_integrado/<idioma>/` → `publicar-ambientes`. Este skill es **auxiliar**.

Herramienta: [scripts/optimizar.mjs](../../../scripts/optimizar.mjs) con la librería npm
**[sharp](https://www.npmjs.com/package/sharp)** (devDependency). Si falla al importar `sharp`,
correr `npm install`. No usar Python ni otras herramientas.

## Regla: en `img/` solo `.png` y `.jpg` optimizados

- Formato: **`.png` o `.jpg`, el que pese menos**. Nunca `.webp`: Outlook de escritorio para
  Windows no lo muestra.
- Los originales PNG/JPG **nunca** se guardan en `img/`: se dejan en el scratchpad (o donde el
  usuario los tenga) y se pasan al script desde ahí. El script se niega a leer originales de
  `img/`.
- Las maquetas apuntan a la imagen con la extensión que eligió el script
  (`src="../../img/<archivo>.png"` o `.jpg`).
- Imágenes con texto que cambian por idioma llevan sufijo `-en` / `-es`
  (`e-banner-en.png`, `e-banner-es.png`); las idénticas en ambos idiomas, sin sufijo.

Cada proyecto (`mailings-<nombre>/`, ej. `mailings-alerts/`) tiene su propia carpeta `img/`.
Los comandos se corren desde la raíz del repositorio con `--proyecto <nombre>`.

## Preguntas iniciales

1. **Proyecto**: las carpetas `mailings-*/`.
   - Si hay una sola, o quedó claro en la conversación, usarla y decirlo.
   - Si hay varias, preguntar cuál.
2. **Imágenes**: qué archivos optimizar (ruta de los PNG/JPG o de la carpeta que los contiene)
   y con qué nombre deben quedar en `img/` (kebab-case con prefijo `e-`; renombrar la copia en
   el scratchpad si hace falta, porque la imagen optimizada toma el nombre del original).
3. Si ya existe en `<proyecto>/img/` una imagen con ese nombre (con cualquier extensión),
   confirmar que es la **misma imagen actualizada** antes de usar `--force`.

La calidad y el formato **no se preguntan**: el script los evalúa por imagen.

## 1. Optimizar

```
npm run img:optimizar -- --proyecto <proyecto> --dir <carpeta-con-png>
npm run img:optimizar -- --proyecto <proyecto> --files <ruta>/e-a.png,<ruta>/e-b.png
npm run img:optimizar -- --proyecto <proyecto> --files <ruta>/e-a.png --force   # reemplazar una imagen existente
npm run img:optimizar -- --proyecto <proyecto> --dir <carpeta> --umbral 38       # más compresión
```

Por cada imagen el script:
- Prueba calidades **75, 80, 85, 90, 95 y 100** y, por formato, se queda con la **más baja**
  cuya diferencia con el original no se nota: **PSNR ≥ 40 dB** comparando ambas sobre fondo
  blanco.
- Candidatos: **PNG sin pérdida**, **PNG con paleta** (hasta 256 colores) y **JPG** (mozjpeg),
  este último **solo si la imagen no usa transparencia** (JPG no tiene canal alfa).
- Usa el candidato **más liviano** y escribe `<proyecto>/img/<nombre>.png` o `.jpg`. En la
  práctica los logos, íconos e imágenes planas salen como PNG con paleta; las fotos, como JPG.
- Imprime una tabla: imagen, tamaño (px, `transparencia` si la usa), peso original, elegido
  (formato · calidad · peso · dB) y los candidatos probados con su peso.

Opciones: `--umbral 38` (más compresión) o `--umbral 42` (más fidelidad), `--min 80` / `--max 95`
(rango de calidades; por defecto 75–100, de 5 en 5).

`--force` reemplaza la imagen existente con el mismo nombre **en cualquier extensión** (`.png`,
`.jpg`, `.jpeg` o un `.webp` antiguo) y **borra el archivo anterior**. Sin `--force`, el script
falla si ya existe alguna.

**Recomprimir** una imagen existente con otro umbral requiere volver a exportar el original de
Figma: nunca recomprimir una imagen de `img/` sobre sí misma (acumula pérdida).

## 2. Actualizar las maquetas

Si la imagen es nueva, cambió de nombre o **cambió de extensión** (ej. antes `.png` y ahora
`.jpg`; el script lo recuerda al final), actualizar el `src` en
`<proyecto>/1_maqueta/en/<nombre>-local.html` y/o `/es/` (`../../img/<archivo>.png` o `.jpg`),
con su `width`/`height` a 1x (la mitad del tamaño exportado a 2x).

Si el mailing ya fue entregado o integrado (`2_entrega/<idioma>/` o `3_integrado/<idioma>/`),
avisar y ofrecer cambiar ahí también el nombre o la extensión de esa imagen (solo el `src`, sin
tocar variables ni contenido). Si solo se reemplazó el contenido con el mismo nombre y extensión,
recordar **volver a subir la imagen** a los buckets donde ya estaba, en `img/<carpetaImagenes>`
del `proyecto.json` (ej. `img/alerts/`); si cambió la extensión, subir la nueva.

## 3. Resumen

- Tabla de pesos, formatos y calidades elegidas.
- Imágenes que cambiaron de extensión y archivos anteriores borrados, si hubo.
- Maquetas actualizadas, si hubo.
