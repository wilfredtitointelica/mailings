// Genera la página de auditoría (scrollytelling) de un proyecto a partir de un JSON de datos.
// La usan dos skills:
//   /auditar-figma → --tipo figma: errores del diseño de Figma (textos, espaciados, fuentes). Para diseño/contenido.
//   /auditar-html  → --tipo html:  errores del HTML generado (fidelidad, compatibilidad, peso, links). Para maquetación/dev.
//
// Uso:
//   node scripts/auditoria/generar.cjs --tipo figma|html --proyecto <nombre> [--etapa <etapa>] --listar
//       → JSON con los mailings disponibles y en qué fechas ya se auditaron (con ese tipo/etapa)
//   node scripts/auditoria/generar.cjs --tipo figma|html --proyecto <nombre> [--etapa <etapa>] --data <auditoria.json> [--validar]
//       → <proyecto>/audit/auditoria-<tipo>-AAAA-MM-DD.html (solo el HTML, con los datos embebidos); nunca sobrescribe: agrega -2, -3…
//       → --validar solo revisa el JSON y los objetivos, sin escribir nada
//
// --etapa (solo html): 1_maqueta (por defecto), 2_entrega, 3_integrado, 4_bucket/dev, 4_bucket/qa, 4_bucket/prd.
// Figma siempre se audita sobre 1_maqueta (la maqueta copia Figma tal cual).
// Embebe los HTML de la etapa y, en 1_maqueta, las imágenes de <proyecto>/img/ (las otras etapas usan URL absolutas).
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '../..');
const PLANTILLA = path.join(__dirname, 'plantilla.html');
const IDIOMAS = ['en', 'es'];
const ETAPAS = ['1_maqueta', '2_entrega', '3_integrado', '4_bucket/dev', '4_bucket/qa', '4_bucket/prd'];

// prioridades de cada tipo: etiqueta y color (la plantilla las pinta en este orden)
const TIPOS = {
	figma: {
		titulo: 'Auditoría de Figma',
		h1: 'Auditoría del diseño en Figma',
		lead: 'Al maquetar los correos se respetó Figma tal cual. Aquí están los errores e inconsistencias del diseño (textos, espaciados, fuentes), señalados sobre la maqueta. Se corrigen en Figma. Baja para recorrerlos: cada observación se ilumina y apunta al lugar exacto del mailing.',
		nodo: 'Figma',
		pri: {
			corregir: { label: 'Corregir', hex: '#e5484d' },
			revisar: { label: 'Revisar', hex: '#f0a020' },
			fuente: { label: 'Fuente', hex: '#8e6cef' },
			corregido: { label: 'Ya corregido', hex: '#2fb37a' },
		},
	},
	html: {
		titulo: 'Auditoría del HTML',
		h1: 'Auditoría del HTML generado',
		lead: 'Revisión del HTML del correo: que se vea igual que Figma, que funcione en los clientes de correo (Outlook, Gmail, iOS), su peso, imágenes y links. Se corrige en el HTML. Baja para recorrerlos: cada observación se ilumina y apunta al lugar exacto del mailing.',
		nodo: 'HTML',
		pri: {
			error: { label: 'Error', hex: '#e5484d' },
			compatibilidad: { label: 'Compatibilidad', hex: '#f0a020' },
			accesibilidad: { label: 'Accesibilidad', hex: '#8e6cef' },
			mejora: { label: 'Mejora', hex: '#2f8fd8' },
			corregido: { label: 'Ya corregido', hex: '#2fb37a' },
		},
	},
};

const arg = (k) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : null; };
const fail = (m) => { console.error(`Error: ${m}`); process.exit(1); };

const tipo = arg('tipo');
if (!TIPOS[tipo]) fail('falta --tipo figma|html');
const T = TIPOS[tipo];
const etapa = tipo === 'figma' ? '1_maqueta' : arg('etapa') || '1_maqueta';
if (!ETAPAS.includes(etapa)) fail(`--etapa "${etapa}" no válida (usar ${ETAPAS.join(', ')})`);

const nombre = arg('proyecto');
if (!nombre) fail('falta --proyecto <nombre> (ej. alerts → mailings-alerts/)');
const carpeta = nombre.startsWith('mailings-') ? nombre : `mailings-${nombre}`;
const ROOT = path.join(REPO, carpeta);
if (!fs.existsSync(ROOT)) fail(`no existe el proyecto ${carpeta}/`);
const AUDIT = path.join(ROOT, 'audit');

const archivoHtml = (n, l) => path.join(ROOT, etapa, l, etapa === '1_maqueta' ? `${n}-local.html` : `${n}.html`);

// auditorías anteriores de este tipo (y etapa) → { mailing: [fechas] }
// Se leen de las propias páginas: cada una lleva embebidos `const META = {…};` (tipo, etapa) y
// `const DATA = […];` (mailings). No se guarda ningún .json aparte.
// Las páginas antiguas observaciones-*.html (de /observaciones-html, sin tipo) cuentan como auditorías de Figma.
function auditados() {
	const res = {};
	if (!fs.existsSync(AUDIT)) return res;
	const re = tipo === 'figma' ? /^(auditoria-figma|observaciones)-\d{4}-\d{2}-\d{2}(-\d+)?\.html$/ : /^auditoria-html-\d{4}-\d{2}-\d{2}(-\d+)?\.html$/;
	for (const f of fs.readdirSync(AUDIT).filter((f) => re.test(f)).sort()) {
		const fecha = f.match(/\d{4}-\d{2}-\d{2}/)[0];
		const html = fs.readFileSync(path.join(AUDIT, f), 'utf8');
		const meta = JSON.parse((html.match(/^const META = (.*);$/m) || [, '{}'])[1]);
		const datos = JSON.parse((html.match(/^const DATA = (.*);$/m) || [, '[]'])[1]);
		if (tipo === 'html' && (meta.etapa || '1_maqueta') !== etapa) continue;
		for (const m of datos) (res[m.name] ||= []).includes(fecha) || res[m.name].push(fecha);
	}
	return res;
}

if (process.argv.includes('--listar')) {
	const prev = auditados();
	const nombres = new Set();
	// figma: mailings con .txt de observaciones; html: mailings con HTML en la etapa
	for (const l of IDIOMAS) {
		const dir = path.join(ROOT, etapa, l);
		if (!fs.existsSync(dir)) continue;
		const re = tipo === 'figma' ? /-local\.txt$/ : etapa === '1_maqueta' ? /-local\.html$/ : /\.html$/;
		fs.readdirSync(dir).filter((f) => re.test(f)).forEach((f) => nombres.add(f.replace(re, '')));
	}
	const lista = [...nombres].sort().map((n) => ({
		nombre: n,
		idiomas: IDIOMAS.filter((l) => fs.existsSync(tipo === 'figma' ? path.join(ROOT, etapa, l, `${n}-local.txt`) : archivoHtml(n, l))),
		auditado: prev[n] || [],
	}));
	// primero los que nunca se auditaron
	lista.sort((a, b) => (a.auditado.length > 0) - (b.auditado.length > 0) || a.nombre.localeCompare(b.nombre));
	console.log(JSON.stringify({ proyecto: carpeta, tipo, etapa, mailings: lista }, null, 2));
	process.exit(0);
}

const dataPath = arg('data');
if (!dataPath) fail('uso: --tipo figma|html --proyecto <nombre> --data <auditoria.json>  |  … --listar');
const d = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

// salida con la fecha de hoy, sin sobrescribir
const hoy = new Date();
const fecha = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
const prefijo = `auditoria-${tipo}-${fecha}`;
let base = prefijo;
for (let n = 2; fs.existsSync(path.join(AUDIT, `${base}.html`)); n++) base = `${prefijo}-${n}`;
const out = path.join(AUDIT, `${base}.html`);

// texto plano de un HTML, para comprobar que cada objetivo existe
const plain = (h) => h
	.replace(/<style[\s\S]*?<\/style>/gi, '')
	.replace(/<[^>]+>/g, ' ')
	.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
	.replace(/\s+/g, ' ');

const MAILS = {};
const avisos = [];
const data = d.mailings.map((m) => {
	const langs = IDIOMAS.filter((l) => m[l]).map((l) => {
		const file = archivoHtml(m.nombre, l);
		if (!fs.existsSync(file)) fail(`no existe ${path.relative(ROOT, file)}`);
		const html = fs.readFileSync(file, 'utf8');
		MAILS[`${m.nombre}/${l}`] = etapa === '1_maqueta' ? html.replace(/\.\.\/\.\.\/img\//g, 'img:') : html;
		const texto = plain(html);
		const items = m[l].items.map((it, i) => {
			if (!T.pri[it.prioridad]) fail(`${m.nombre}/${l} #${i + 1}: prioridad "${it.prioridad}" (en ${tipo} usar ${Object.keys(T.pri).join(', ')})`);
			const obj = it.objetivo;
			if (typeof obj === 'string' && !texto.includes(obj.replace(/\s+/g, ' '))) avisos.push(`${m.nombre}/${l} #${i + 1}: no se encontró "${obj}" en el HTML`);
			if (obj && obj.img && !html.includes(obj.img)) avisos.push(`${m.nombre}/${l} #${i + 1}: no hay imagen "${obj.img}" en el HTML`);
			if (obj && typeof obj === 'object' && !obj.img && !obj.selector) avisos.push(`${m.nombre}/${l} #${i + 1}: objetivo sin "img" ni "selector"`);
			return { pri: it.prioridad, donde: it.donde, nodo: it.nodo, actual: it.actual, revisar: it.revisar, target: obj };
		});
		return { lang: l, figma: m[l].figma || null, items };
	});
	return { name: m.nombre, desc: m.descripcion, warn: m.aviso || null, langs };
});

// solo las imágenes locales que usan las maquetas (1_maqueta)
const IMGS = {};
for (const h of Object.values(MAILS)) for (const [, f] of h.matchAll(/img:([^"')\s]+)/g)) {
	if (IMGS[f]) continue;
	const p = path.join(ROOT, 'img', f);
	if (!fs.existsSync(p)) fail(`no existe img/${f}`);
	const mime = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' }[path.extname(f).toLowerCase()];
	IMGS[f] = `data:${mime};base64,${fs.readFileSync(p).toString('base64')}`;
}

if (process.argv.includes('--validar')) {
	if (avisos.length) { console.log('Avisos (corregir el "objetivo" en el JSON):'); avisos.forEach((a) => console.log(`  - ${a}`)); process.exit(1); }
	console.log(`ok · ${tipo} · ${etapa} · ${data.length} mailings · listo para generar ${path.relative(REPO, out)}`);
	process.exit(0);
}

const META = {
	tipo,
	etapa,
	titulo: d.titulo,
	fecha: d.fecha,
	h1: T.h1,
	lead: d.lead || T.lead,
	pageTitle: `${T.titulo} · ${d.titulo}`,
	nodo: T.nodo,
	pri: T.pri,
	erratas: d.erratas || [],
	cierre: d.cierre || [],
};
const page = fs.readFileSync(PLANTILLA, 'utf8').replace('/*__DATA__*/', () =>
	`const META = ${JSON.stringify(META)};\nconst DATA = ${JSON.stringify(data)};\nconst MAILS = ${JSON.stringify(MAILS)};\nconst IMGS = ${JSON.stringify(IMGS)};`);
// solo el HTML: META y DATA van embebidos y --listar los lee de ahí
fs.mkdirSync(AUDIT, { recursive: true });
fs.writeFileSync(out, page);

const total = data.reduce((n, m) => n + m.langs.reduce((k, l) => k + l.items.length, 0), 0);
console.log(`${path.relative(REPO, out)} · ${tipo} · ${etapa} · ${data.length} mailings · ${total} observaciones · ${(page.length / 1024).toFixed(0)} KB`);
if (avisos.length) { console.log('\nAvisos (la observación quedará sin línea si no se corrige el objetivo):'); avisos.forEach((a) => console.log(`  - ${a}`)); }
