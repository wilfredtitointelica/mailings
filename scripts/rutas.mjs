// Cambia las rutas de imágenes de un mailing por la URL absoluta de un ambiente (ambientes.json) más la
// subcarpeta de imágenes del proyecto (proyecto.json → carpetaImagenes, ej. "alerts/").
// Todo se resuelve dentro del proyecto (mailings-<nombre>/) y cada mailing va en una subcarpeta por idioma:
//   entrega:  1_maqueta/<idioma>/<nombre>-local.html  → 2_entrega/<idioma>/<nombre>.html        (URL del ambiente "entrega")
//   publicar: 3_integrado/<idioma>/<nombre>.html      → 4_bucket/<env>/<idioma>/<nombre>.html   (URL de cada ambiente)
// Todas las imágenes deben ser .png o .jpg de <proyecto>/img/ (Outlook de escritorio no muestra .webp).
// Uso: node scripts/rutas.mjs --modo entrega|publicar --proyecto <nombre> --nombre <mailing> [--idioma en,es] [--env dev,qa,prd]
//      node scripts/rutas.mjs --modo entrega|publicar --proyecto <nombre> --in <archivo> [--env dev,qa,prd]
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { resolverProyecto, root } from './proyecto.mjs';

const fail = (msg) => {
	console.error(msg);
	process.exit(1);
};

const { values } = parseArgs({
	options: {
		proyecto: { type: 'string' },
		modo: { type: 'string' },
		in: { type: 'string' },
		nombre: { type: 'string' },
		idioma: { type: 'string' },
		env: { type: 'string' },
	},
});

const MODOS = {
	entrega: { origen: '1_maqueta', sufijo: '-local.html', mensaje: 'La entrega se genera solo desde 1_maqueta/<idioma>/ (maqueta).' },
	publicar: { origen: '3_integrado', sufijo: '.html', mensaje: 'Se publica solo desde 3_integrado/<idioma>/ (HTML devuelto por el dev).' },
};
const modo = MODOS[values.modo];
if (!modo || !(values.in || values.nombre)) {
	fail('Uso: node scripts/rutas.mjs --modo entrega|publicar --proyecto <nombre> --nombre <mailing> [--idioma en,es] [--env dev,qa,prd] | --in <archivo>');
}
const { dir, carpeta, config: proyecto } = resolverProyecto(values.proyecto, fail);

const config = JSON.parse(readFileSync(join(root, 'ambientes.json'), 'utf8'));
const ambientes = config.ambientes;
const idiomas = config.idiomas;
for (const [env, url] of Object.entries(ambientes)) {
	if (!/^https:\/\//.test(url)) fail(`La URL de "${env}" debe empezar con https://: ${url}`);
	if (!url.endsWith('/')) ambientes[env] = `${url}/`;
}
// URL final de cada ambiente: base de img/ + subcarpeta del proyecto en el bucket
const bases = Object.fromEntries(Object.entries(ambientes).map(([env, url]) => [env, `${url}${proyecto.carpetaImagenes}`]));

let envs;
if (values.modo === 'entrega') {
	envs = [config.entrega];
} else {
	envs = values.env ? values.env.split(',').map((e) => e.trim()) : Object.keys(ambientes);
}
for (const env of envs) {
	if (!ambientes[env]) fail(`Ambiente "${env}" no está en ambientes.json. Disponibles: ${Object.keys(ambientes).join(', ')}`);
}

// Archivos de entrada: --in, o --nombre en cada idioma pedido (por defecto, los de ambientes.json)
let inputs;
if (values.in) {
	inputs = [resolve(values.in)];
} else {
	const pedidos = values.idioma ? values.idioma.split(',').map((i) => i.trim()) : idiomas;
	inputs = pedidos.map((idioma) => join(dir, modo.origen, idioma, `${values.nombre}${modo.sufijo}`));
	const faltan = inputs.filter((f) => !existsSync(f));
	if (faltan.length) fail(`No existen:\n  ${faltan.map((f) => relative(root, f)).join('\n  ')}`);
}

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Primero las URLs con subcarpeta, para que un HTML ya convertido no termine con "alerts/alerts/"
const prefixes = ['(?:\\.{1,2}\\/)*img\\/', ...Object.values(bases).map(escape), ...Object.values(ambientes).map(escape)].join('|');
const imgPath = new RegExp(`(\\b(?:src|background)\\s*=\\s*["']|url\\(\\s*["']?)(?:${prefixes})([^"')\\s]+)`, 'g');
const images = new Set();
const otros = new Set();

// Valida todo antes de escribir: carpeta de origen, idioma y que cada imagen sea un .png o .jpg existente en img/
const trabajos = inputs.map((input) => {
	const rel = relative(root, input);
	const idioma = basename(dirname(input));
	if (dirname(input) !== join(dir, modo.origen, idioma)) fail(`${modo.mensaje} (dentro de ${carpeta}/) Recibido: ${rel}`);
	if (!idiomas.includes(idioma)) fail(`"${idioma}" no es un idioma de ambientes.json (${idiomas.join(', ')}). Recibido: ${rel}`);
	if (!existsSync(input)) fail(`No existe: ${rel}`);

	const html = readFileSync(input, 'utf8');
	const files = [...new Set([...html.matchAll(imgPath)].map((m) => m[2]))];
	const noValidas = files.filter((f) => !/\.(png|jpe?g)$/i.test(f));
	if (noValidas.length) fail(`[${rel}] Todas las imágenes deben ser .png o .jpg (Outlook de escritorio no muestra .webp):\n  ${noValidas.join('\n  ')}`);
	if (values.modo === 'entrega') {
		const sinArchivo = files.filter((f) => !existsSync(join(dir, 'img', f)));
		if (sinArchivo.length) fail(`[${rel}] Faltan en ${carpeta}/img/:\n  ${sinArchivo.join('\n  ')}`);
	}

	const lang = html.match(/<html\b[^>]*\blang\s*=\s*["']([^"']+)/i)?.[1];
	if (lang && lang.toLowerCase() !== idioma) console.warn(`Aviso: ${rel} tiene lang="${lang}" pero está en la carpeta ${idioma}/`);

	for (const url of html.matchAll(/\bsrc\s*=\s*["'](https?:\/\/[^"']+)/g)) {
		if (!Object.values(bases).some((base) => url[1].startsWith(base))) otros.add(url[1]);
	}
	return { input, idioma, html, name: basename(input).replace(/-local\.html$/, '.html') };
});

console.log('Generados:');
for (const { idioma, html, name } of trabajos) {
	for (const env of envs) {
		const base = bases[env];
		const result = html.replace(imgPath, (_, prefix, file) => {
			images.add(file);
			return `${prefix}${base}${file}`;
		});

		if (/(?:src|background)\s*=\s*["'](?:\.{1,2}\/)*img\//.test(result)) fail(`[${env}/${idioma}] Quedaron rutas relativas img/ sin convertir.`);

		const output = values.modo === 'entrega' ? join(dir, '2_entrega', idioma, name) : join(dir, '4_bucket', env, idioma, name);
		mkdirSync(dirname(output), { recursive: true });
		writeFileSync(output, result);
		console.log(`  ${env.padEnd(4)} ${relative(root, output)}  →  ${base}`);
	}
}

if (otros.size) {
	console.log(`\nImágenes con URL de otro dominio (no se cambiaron):`);
	for (const url of otros) console.log(`  ${url}`);
}

console.log(`\nImágenes referenciadas (${images.size}), en el bucket van en img/${proyecto.carpetaImagenes}:`);
for (const file of images) {
	const missing = existsSync(join(dir, 'img', file)) ? '' : `  <-- NO EXISTE en ${carpeta}/img/`;
	console.log(`  ${file}${missing}`);
}
