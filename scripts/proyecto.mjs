// Resuelve la carpeta de un proyecto de mailings (mailings-<nombre>/) y lee su proyecto.json.
// Acepta "alerts" o "mailings-alerts". carpetaImagenes es la subcarpeta de img/ en el bucket
// (ej. "alerts/"): se agrega a la URL de cada ambiente.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const PREFIJO = 'mailings-';

export function resolverProyecto(nombre, fail) {
	if (!nombre) fail(`Falta --proyecto <nombre> (ej. --proyecto alerts → ${PREFIJO}alerts/).`);
	const carpeta = nombre.startsWith(PREFIJO) ? nombre : `${PREFIJO}${nombre}`;
	const dir = join(root, carpeta);
	if (!existsSync(dir)) fail(`No existe el proyecto ${carpeta}/. Créalo con /maquetar-figma.`);

	const file = join(dir, 'proyecto.json');
	const config = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
	const carpetaImagenes = config.carpetaImagenes ?? '';
	if (carpetaImagenes && (carpetaImagenes.startsWith('/') || !carpetaImagenes.endsWith('/'))) {
		fail(`${carpeta}/proyecto.json: "carpetaImagenes" debe ser una ruta relativa terminada en "/" (ej. "alerts/"). Recibido: "${carpetaImagenes}"`);
	}
	return { dir, carpeta, config: { ...config, carpetaImagenes } };
}
