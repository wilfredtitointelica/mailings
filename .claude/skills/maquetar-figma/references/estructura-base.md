# Estructura base de un mailing

Esqueleto tomado de `ref/blocked-user-admin.html`. Usarlo cuando no se elige una maqueta de
referencia. Reemplazar `{...}` y agregar/quitar filas de `table content` según el diseño.

## Jerarquía

```
table wrapper (100%, fondo del mailing = mismo color que el body)
└── table contenedor (600px, fondo gris #f2f3f5)
    ├── fila encabezado        → logo
    ├── fila contenido
    │   └── table content (100%, fondo blanco, padding lateral 32px)
    │       └── tabla interna (470px)
    │           ├── fila hero      → imagen principal
    │           ├── fila message   → saludo + texto
    │           ├── fila system    → tabla de datos (fila 1, fila 2…)
    │           ├── fila cierre    → texto de cierre
    │           └── fila cta       → botón + link alternativo
    ├── fila confidencialidad  → aviso legal
    └── fila piepagina         → logo footer + web
```

## Esqueleto

`lang="en"` o `lang="es"` según la versión. `{fondo}` es el color de fondo del mailing (pregunta opcional del skill; `#ffffff` por defecto). Las rutas son `../../img/` porque la maqueta vive en
`<proyecto>/1_maqueta/<idioma>/` y las imágenes en `<proyecto>/img/`; todas las imágenes son `.png` o `.jpg`.

```html
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
	<head>
		<meta content="text/html; charset=utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<title>{Titulo}</title>
	</head>
	<body bgcolor="{fondo}" style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: {fondo}">
		<!-- BEGIN: table wrapper -->
		<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="{fondo}" style="background-color: {fondo}">
			<tbody>
				<tr>
					<td width="100%" align="center" valign="middle" style="padding: 16px">
						<!-- BEGIN: table contenedor -->
						<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#f2f3f5" style="width: 100%; max-width: 600px">
							<tbody>
								<!-- fila encabezado -->
								<tr>
									<td style="padding: 16px; font-size: 10px" align="center">
										<a href="{UrlLogo}" target="_blank" style="display: inline-block; font-size: 10px; text-decoration: none">
											<img src="../../img/e-logo-incontrol.png" alt="Incontrol Logo" width="136" height="26" style="display: block; width: 100%; max-width: 136px; height: auto; border: 0; vertical-align: middle; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic" />
										</a>
									</td>
								</tr>
								<!-- fila contenido -->
								<tr>
									<td style="padding: 0 16px">
										<!-- BEGIN: table content  -->
										<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="background-color: #ffffff">
											<tr>
												<td style="padding: 0 32px">
													<table role="presentation" width="470" align="center" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="width: 100%; max-width: 470px; background-color: #ffffff">
														<!-- fila hero -->
														<!-- fila message -->
														<!-- fila cta -->
													</table>
												</td>
											</tr>
										</table>
										<!-- END: table content  -->
									</td>
								</tr>
								<!-- fila confidencialidad -->
								<!-- fila piepagina -->
							</tbody>
						</table>
						<!-- END: contenedor -->
					</td>
				</tr>
			</tbody>
		</table>
		<!-- END: table wrapper -->
	</body>
</html>
```

## Bloques reutilizables

### Texto
```html
<td style="padding: 0 0 16px 0; color: #4f5470; font-family: Arial, sans-serif; font-size: 14px; mso-line-height-rule: exactly; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; line-height: 20px">
	Texto con <span style="font-weight: bold">negrita</span>.
</td>
```

### Imagen
```html
<td style="padding: 48px 0; font-size: 10px" align="center">
	<img src="../../img/e-hero.png" alt="{Descripcion}" width="185" height="136" style="display: block; width: 100%; max-width: 185px; height: auto; border: 0; vertical-align: middle; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic" />
</td>
```

### CTA bulletproof
```html
<!-- fila cta -->
<tr>
	<td style="padding: 32px 0">
		<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
			<tr>
				<td style="padding: 6px 8px; background-color: #2952c4; border-radius: 6px" bgcolor="#2952c4" align="center">
					<a href="{Url}" target="_blank" style="display: inline-block; text-decoration: none; color: #ffffff; font-family: Arial, sans-serif; font-size: 14px; mso-line-height-rule: exactly; line-height: 20px">Texto del botón</a>
				</td>
			</tr>
		</table>
	</td>
</tr>
```

### Tabla de datos (fila system)
Fondo `#f2f5fc`, dos columnas `width="50%"`: etiqueta en negrita `#4f5470`, valor en `#2952c4`.
Comentar cada fila: `<!-- fila 1 -->`, `<!-- fila 2 -->`.

### Tarjeta con ícono (caja de color de tamaño fijo + texto)
Tomado de `alert-newfees` (tarjetas de 260×56 en dos columnas con 16px de separación).

- La tarjeta mide en Figma 260px: `width="240"` = 260 − 9px de padding − 1px de borde por lado.
- El fondo del ícono va en una **tabla propia de 32×32**. El `td` que la contiene no lleva fondo
  y solo alinea: si el texto pasa a 2 líneas (pasa en español), la fila crece pero el cuadro no.
- La altura (`height: 56px`) va en la tarjeta, no en el texto, para que todas midan igual.

```html
<td width="240" valign="middle" bgcolor="#fcfcfc" style="width: 240px; height: 56px; padding: 0 9px; border: 1px solid #d9d9e3; border-radius: 15px; background-color: #fcfcfc">
	<table role="presentation" cellpadding="0" cellspacing="0" border="0">
		<tr>
			<td width="32" valign="middle" style="width: 32px; padding: 0">
				<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="32">
					<tr>
						<td width="32" height="32" align="center" valign="middle" bgcolor="#ffeae0" style="width: 32px; height: 32px; padding: 0; background-color: #ffeae0; border-radius: 8px; font-size: 0; line-height: 0">
							<img src="../../img/e-icon-check.png" alt="" width="16" height="16" style="display: block; width: 16px; height: 16px; border: 0; margin: 0 auto" />
						</td>
					</tr>
				</table>
			</td>
			<td valign="middle" style="padding: 0 0 0 8px; color: #0a1733; font-family: Arial, sans-serif; font-size: 14px; mso-line-height-rule: exactly; line-height: 20px">{Texto}</td>
		</tr>
	</table>
</td>
```

### Confidencialidad y pie de página
Título 10px bold + texto 10px justificado con `mailto:security@intelica.com`; pie con logo
`e-logo-footer.png` (54×32) a la izquierda y `www.intelica.com` (14px bold `#2952c4`) a la
derecha. Copiar de `ref/blocked-user-admin.html` si existe.

## Paleta usada en la referencia

| Uso | Color |
|---|---|
| Texto | `#4f5470` |
| Links / acento / CTA | `#2952c4` |
| Fondo contenedor | `#f2f3f5` |
| Fondo contenido | `#ffffff` |
| Fondo tabla de datos | `#f2f5fc` |
