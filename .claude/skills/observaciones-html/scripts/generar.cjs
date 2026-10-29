// Genera la página de observaciones (scrollytelling) de un proyecto a partir de un JSON de datos.
// Uso:
//   node .claude/skills/observaciones-html/scripts/generar.cjs --proyecto <nombre> --listar
//       → JSON con los mailings del proyecto que tienen .txt y en qué fechas ya se observaron
//   node .claude/skills/observaciones-html/scripts/generar.cjs --proyecto <nombre> --data <observaciones.json>
//       → <proyecto>/obs/observaciones-AAAA-MM-DD.html (+ .json); nunca sobrescribe: agrega -2, -3…
//   … --data <observaciones.json> --validar   → solo revisa el JSON y los objetivos, sin escribir
// Embebe las maquetas de <proyecto>/1_maqueta/<idioma>/<nombre>-local.html y las imágenes de <proyecto>/img/.
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '../../../..');
const PLANTILLA = path.join(__dirname, '../assets/plantilla.html');
const PRIORIDADES = ['corregir', 'revisar', 'fuente', 'corregido'];
const IDIOMAS = ['en', 'es'];

const arg = (k) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : null; };
const fail = (m) => { console.error(`Error: ${m}`); process.exit(1); };

const nombre = arg('proyecto');
if (!nombre) fail('falta --proyecto <nombre> (ej. alerts → mailings-alerts/)');
const carpeta = nombre.startsWith('mailings-') ? nombre : `mailings-${nombre}`;
const ROOT = path.join(REPO, carpeta);
if (!fs.existsSync(ROOT)) fail(`no existe el proyecto ${carpeta}/`);
const OBS = path.join(ROOT, 'obs');

// observaciones anteriores: obs/observaciones-AAAA-MM-DD[-n].json → { mailing: [fechas] }
function observados() {
	const res = {};
	if (!fs.existsSync(OBS)) return res;
	for (const f of fs.readdirSync(OBS).filter((f) => /^observaciones-\d{4}-\d{2}-\d{2}(-\d+)?\.json$/.test(f)).sort()) {
		const fecha = f.match(/\d{4}-\d{2}-\d{2}/)[0];
		const j = JSON.parse(fs.readFileSync(path.join(OBS, f), 'utf8'));
		for (const m of j.mailings || []) (res[m.nombre] ||= []).includes(fecha) || res[m.nombre].push(fecha);
	}
	return res;
}

if (process.argv.includes('--listar')) {
	const prev = observados();
	const nombres = new Set();
	for (const l of IDIOMAS) {
		const dir = path.join(ROOT, '1_maqueta', l);
		if (fs.existsSync(dir)) fs.readdirSync(dir).filter((f) => f.endsWith('-local.txt')).forEach((f) => nombres.add(f.replace(/-local\.txt$/, '')));
	}
	const lista = [...nombres].sort().map((n) => ({
		nombre: n,
		idiomas: IDIOMAS.filter((l) => fs.existsSync(path.join(ROOT, '1_maqueta', l, `${n}-local.txt`))),
		observado: prev[n] || [],
	}));
	// primero los que nunca se observaron
	lista.sort((a, b) => (a.observado.length > 0) - (b.observado.length > 0) || a.nombre.localeCompare(b.nombre));
	console.log(JSON.stringify({ proyecto: carpeta, mailings: lista }, null, 2));
	process.exit(0);
}

const dataPath = arg('data');
if (!dataPath) fail('uso: --proyecto <nombre> --data <observaciones.json>  |  --proyecto <nombre> --listar');
const d = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

// salida con la fecha de hoy, sin sobrescribir
const hoy = new Date();
const fecha = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
fs.mkdirSync(OBS, { recursive: true });
let base = `observaciones-${fecha}`;
for (let n = 2; fs.existsSync(path.join(OBS, `${base}.html`)) || fs.existsSync(path.join(OBS, `${base}.json`)); n++) base = `observaciones-${fecha}-${n}`;
const out = path.join(OBS, `${base}.html`);

// texto plano de una maqueta, para comprobar que cada objetivo existe
const plain = (h) => h
	.replace(/<style[\s\S]*?<\/style>/gi, '')
	.replace(/<[^>]+>/g, ' ')
	.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
	.replace(/\s+/g, ' ');

const MAILS = {};
const avisos = [];
const data = d.mailings.map((m) => {
	const langs = ['en', 'es'].filter((l) => m[l]).map((l) => {
		const file = path.join(ROOT, '1_maqueta', l, `${m.nombre}-local.html`);
		if (!fs.existsSync(file)) fail(`no existe ${path.relative(ROOT, file)}`);
		const html = fs.readFileSync(file, 'utf8');
		MAILS[`${m.nombre}/${l}`] = html.replace(/\.\.\/\.\.\/img\//g, 'img:');
		const texto = plain(html);
		const items = m[l].items.map((it, i) => {
			if (!PRIORIDADES.includes(it.prioridad)) fail(`${m.nombre}/${l} #${i + 1}: prioridad "${it.prioridad}" (usar ${PRIORIDADES.join(', ')})`);
			const obj = it.objetivo;
			if (typeof obj === 'string' && !texto.includes(obj.replace(/\s+/g, ' '))) avisos.push(`${m.nombre}/${l} #${i + 1}: no se encontró "${obj}" en la maqueta`);
			if (obj && obj.img && !html.includes(obj.img)) avisos.push(`${m.nombre}/${l} #${i + 1}: no hay imagen "${obj.img}" en la maqueta`);
			return { pri: it.prioridad, donde: it.donde, nodo: it.nodo, actual: it.actual, revisar: it.revisar, target: obj };
		});
		return { lang: l, figma: m[l].figma, items };
	});
	return { name: m.nombre, desc: m.descripcion, warn: m.aviso || null, langs };
});

// solo las imágenes que usan las maquetas
const IMGS = {};
for (const h of Object.values(MAILS)) for (const [, f] of h.matchAll(/img:([^"')\s]+)/g)) {
	if (IMGS[f]) continue;
	const p = path.join(ROOT, 'img', f);
	if (!fs.existsSync(p)) fail(`no existe img/${f}`);
	const mime = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' }[path.extname(f).toLowerCase()];
	IMGS[f] = `data:${mime};base64,${fs.readFileSync(p).toString('base64')}`;
}

// --validar: solo revisa el JSON y los objetivos, sin escribir nada en obs/
if (process.argv.includes('--validar')) {
	if (avisos.length) { console.log('Avisos (corregir el "objetivo" en el JSON):'); avisos.forEach((a) => console.log(`  - ${a}`)); process.exit(1); }
	console.log(`ok · ${data.length} mailings · listo para generar ${path.relative(REPO, out)}`);
	process.exit(0);
}

const META = { titulo: d.titulo, fecha: d.fecha, erratas: d.erratas || [], cierre: d.cierre || [] };
const page = fs.readFileSync(PLANTILLA, 'utf8').replace('/*__DATA__*/', () =>
	`const META = ${JSON.stringify(META)};\nconst DATA = ${JSON.stringify(data)};\nconst MAILS = ${JSON.stringify(MAILS)};\nconst IMGS = ${JSON.stringify(IMGS)};`);
fs.writeFileSync(out, page);
// los datos quedan junto al HTML: así --listar sabe qué mailings ya se observaron
fs.writeFileSync(path.join(OBS, `${base}.json`), JSON.stringify(d, null, '\t') + '\n');

const total = data.reduce((n, m) => n + m.langs.reduce((k, l) => k + l.items.length, 0), 0);
console.log(`${path.relative(REPO, out)} · ${data.length} mailings · ${total} observaciones · ${(page.length / 1024).toFixed(0)} KB`);
if (avisos.length) { console.log('\nAvisos (la observación quedará sin línea si no se corrige el objetivo):'); avisos.forEach((a) => console.log(`  - ${a}`)); }
