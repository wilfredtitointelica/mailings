// Convierte imágenes de origen (PNG/JPG exportados de Figma, fuera del proyecto) en <proyecto>/img/ como .png o .jpg,
// el formato que pese menos. Outlook de escritorio para Windows no muestra .webp, por eso no se usa.
// Por imagen prueba calidades entre --min y --max y se queda con la más liviana cuya diferencia con el original no
// sea visible (PSNR >= --umbral dB):
//   - JPG (mozjpeg) en cada calidad; solo si la imagen no usa transparencia (JPG no tiene canal alfa).
//   - PNG con paleta (hasta 256 colores) en cada calidad, y PNG sin pérdida.
// Si ya existe la misma imagen con otra extensión (.webp, .png o .jpg), con --force se reemplaza y se borra la anterior.
// Uso: node scripts/optimizar.mjs --proyecto <nombre> --files <dir>/a.png,<dir>/b.png [--min 75] [--max 100] [--umbral 40] [--force]
//      node scripts/optimizar.mjs --proyecto <nombre> --dir <carpeta-con-png> [...]
import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { basename, extname, join, relative, resolve, sep } from 'node:path';
import { parseArgs } from 'node:util';
import sharp from 'sharp';
import { resolverProyecto, root } from './proyecto.mjs';

const fail = (msg) => {
	console.error(msg);
	process.exit(1);
};

const { values } = parseArgs({
	options: {
		proyecto: { type: 'string' },
		files: { type: 'string' },
		dir: { type: 'string' },
		min: { type: 'string', default: '75' },
		max: { type: 'string', default: '100' },
		umbral: { type: 'string', default: '40' },
		force: { type: 'boolean', default: false },
	},
});

const { dir: proyectoDir } = resolverProyecto(values.proyecto, fail);
const imgDir = join(proyectoDir, 'img');

const min = Number(values.min);
const max = Number(values.max);
const umbral = Number(values.umbral);
if (!(min >= 1 && max <= 100 && min <= max)) fail('--min y --max deben estar entre 1 y 100, con min <= max');
const calidades = [];
for (let q = min; q < max; q += 5) calidades.push(q);
calidades.push(max);

// Imágenes de origen: la lista --files o todos los PNG/JPG de --dir
const esOrigen = (f) => /\.(png|jpe?g)$/i.test(f);
let fuentes;
if (values.files) {
	fuentes = values.files.split(',').map((f) => resolve(f.trim()));
} else if (values.dir) {
	const dir = resolve(values.dir);
	if (!existsSync(dir)) fail(`No existe la carpeta: ${values.dir}`);
	fuentes = readdirSync(dir).filter(esOrigen).map((f) => join(dir, f));
} else {
	fail('Uso: node scripts/optimizar.mjs --proyecto <nombre> --files <dir>/a.png,... | --dir <carpeta> [--min 75] [--max 100] [--umbral 40] [--force]');
}

if (!fuentes.length) fail('No hay imágenes PNG/JPG para convertir.');
const faltan = fuentes.filter((f) => !existsSync(f));
if (faltan.length) fail(`No existen estas imágenes:\n  ${faltan.join('\n  ')}`);
const noSoportadas = fuentes.filter((f) => !esOrigen(f));
if (noSoportadas.length) fail(`Solo se convierten PNG o JPG:\n  ${noSoportadas.join('\n  ')}`);
const dentroDeImg = fuentes.filter((f) => f.startsWith(imgDir + sep));
if (dentroDeImg.length) fail(`Los originales no van en img/ (ahí solo quedan las optimizadas). Expórtalos al scratchpad:\n  ${dentroDeImg.map((f) => relative(root, f)).join('\n  ')}`);

// Versiones ya existentes de la misma imagen en img/, con cualquier extensión
const nombre = (f) => basename(f, extname(f));
const previas = (f) => ['.png', '.jpg', '.jpeg', '.webp'].map((e) => join(imgDir, nombre(f) + e)).filter(existsSync);
const existentes = fuentes.filter((f) => previas(f).length);
if (existentes.length && !values.force) {
	fail(`Ya existen en img/ (usa --force para reemplazarlas):\n  ${existentes.flatMap(previas).map((p) => relative(root, p)).join('\n  ')}`);
}

// Ambas imágenes sobre fondo blanco y en RGB, para comparar lo que se ve
const pixels = (input) => sharp(input).flatten({ background: '#ffffff' }).removeAlpha().raw().toBuffer();
const psnr = (a, b) => {
	let sum = 0;
	for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
	const mse = sum / a.length;
	return mse === 0 ? Infinity : 10 * Math.log10((255 * 255) / mse);
};

// ¿Usa transparencia de verdad? (un PNG puede tener canal alfa con todo opaco)
const usaAlfa = async (fuente) => {
	const { hasAlpha } = await sharp(fuente).metadata();
	if (!hasAlpha) return false;
	const { channels } = await sharp(fuente).stats();
	return channels[3].min < 255;
};

// Recorre las calidades de menor a mayor y se queda con la primera que cumple el umbral
const elegir = async (codificar, original) => {
	for (const q of calidades) {
		const buffer = await codificar(q);
		const d = psnr(original, await pixels(buffer));
		if (d >= umbral) return { q, buffer, db: d };
	}
	return null;
};

const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;
const db = (v) => (v === Infinity ? '∞' : `${v.toFixed(1)} dB`);
const filas = [];
mkdirSync(imgDir, { recursive: true });

for (const fuente of fuentes) {
	const original = await pixels(fuente);
	const { width, height } = await sharp(fuente).metadata();
	const alfa = await usaAlfa(fuente);

	const candidatos = [];
	// PNG sin pérdida: siempre válido
	const png = await sharp(fuente).png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer();
	candidatos.push({ ext: '.png', q: 'sin pérdida', buffer: png, db: Infinity });
	// PNG con paleta: muy liviano en logos, íconos y capturas planas
	const paleta = await elegir((q) => sharp(fuente).png({ palette: true, quality: q, compressionLevel: 9, effort: 10 }).toBuffer(), original);
	if (paleta) candidatos.push({ ...paleta, ext: '.png', q: `paleta q${paleta.q}` });
	// JPG: solo sin transparencia
	if (!alfa) {
		const jpg = await elegir((q) => sharp(fuente).flatten({ background: '#ffffff' }).jpeg({ quality: q, mozjpeg: true }).toBuffer(), original);
		if (jpg) candidatos.push({ ...jpg, ext: '.jpg', q: `q${jpg.q}` });
	}
	const mejor = candidatos.reduce((a, b) => (b.buffer.length < a.buffer.length ? b : a));

	for (const p of previas(fuente)) unlinkSync(p);
	const destino = join(imgDir, nombre(fuente) + mejor.ext);
	writeFileSync(destino, mejor.buffer);

	const pesoOrigen = statSync(fuente).size;
	filas.push({
		imagen: relative(root, destino),
		tamaño: `${width}×${height}${alfa ? ' · transparencia' : ''}`,
		origen: kb(pesoOrigen),
		elegido: `${mejor.ext.slice(1)} ${mejor.q} · ${kb(mejor.buffer.length)} · ${db(mejor.db)}`,
		probados: candidatos.map((c) => `${c.ext.slice(1)} ${c.q}: ${kb(c.buffer.length)}`).join(' | '),
	});
}

console.log(`Calidades probadas: ${calidades.join(', ')} · umbral ${umbral} dB · formatos: PNG y JPG (JPG solo sin transparencia)\n`);
console.table(filas);
console.log('\nSi una imagen cambió de extensión, actualizar su src en las maquetas.');
