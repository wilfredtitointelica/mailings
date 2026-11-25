// Revisión estática del HTML de un mailing (base de /auditar-html).
// Uso:
//   node scripts/auditoria/revisar-html.cjs --proyecto <nombre> --mailing <nombre> [--etapa 1_maqueta] [--red]
// --etapa: 1_maqueta (por defecto), 2_entrega, 3_integrado, 4_bucket/dev|qa|prd
// --red:   además comprueba con HEAD que cada imagen con URL absoluta responda 200
// Imprime un JSON { proyecto, etapa, mailing, hallazgos: { en: [...], es: [...] }, comunes: [...] }.
// Cada hallazgo: { prioridad, donde, linea, actual, revisar, objetivo? } con prioridades de --tipo html:
//   error | compatibilidad | accesibilidad | mejora
// Son candidatos: Claude los revisa, agrupa y redacta antes de pasarlos al JSON de la página.
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '../..');
const IDIOMAS = ['en', 'es'];
const ETAPAS = ['1_maqueta', '2_entrega', '3_integrado', '4_bucket/dev', '4_bucket/qa', '4_bucket/prd'];
const LIMITE_GMAIL = 102 * 1024;

const arg = (k) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : null; };
const fail = (m) => { console.error(`Error: ${m}`); process.exit(1); };

const nombre = arg('proyecto');
const mailing = arg('mailing');
const etapa = arg('etapa') || '1_maqueta';
if (!nombre || !mailing) fail('uso: --proyecto <nombre> --mailing <nombre> [--etapa <etapa>] [--red]');
if (!ETAPAS.includes(etapa)) fail(`--etapa "${etapa}" no válida (usar ${ETAPAS.join(', ')})`);
const carpeta = nombre.startsWith('mailings-') ? nombre : `mailings-${nombre}`;
const ROOT = path.join(REPO, carpeta);
if (!fs.existsSync(ROOT)) fail(`no existe el proyecto ${carpeta}/`);
const proyecto = fs.existsSync(path.join(ROOT, 'proyecto.json')) ? JSON.parse(fs.readFileSync(path.join(ROOT, 'proyecto.json'), 'utf8')) : {};
const ambientes = JSON.parse(fs.readFileSync(path.join(REPO, 'ambientes.json'), 'utf8'));
const archivo = (l, et = etapa) => path.join(ROOT, et, l, et === '1_maqueta' ? `${mailing}-local.html` : `${mailing}.html`);

// URL base de imágenes esperada en la etapa (null = relativas ../../img/ o sin regla fija)
const baseEsperada = () => {
	if (etapa === '2_entrega') return ambientes.ambientes[ambientes.entrega] + (proyecto.carpetaImagenes || '');
	if (etapa.startsWith('4_bucket/')) return ambientes.ambientes[etapa.split('/')[1]] + (proyecto.carpetaImagenes || '');
	return null;
};

const lineaDe = (html, idx) => html.slice(0, idx).split('\n').length;
const recorte = (s, n = 90) => { s = s.replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n) + '…' : s; };
const styleDe = (tag) => ((tag.match(/style="([^"]*)"/) || [])[1] || '').replace(/\s+/g, ' ');

function revisar(l) {
	const f = archivo(l);
	if (!fs.existsSync(f)) return null;
	const html = fs.readFileSync(f, 'utf8');
	const H = [];
	const add = (prioridad, donde, idx, actual, revisarTxt, objetivo) => H.push({ prioridad, donde, linea: idx == null ? null : lineaDe(html, idx), actual, revisar: revisarTxt, ...(objetivo ? { objetivo } : {}) });

	// --- documento ---
	const peso = Buffer.byteLength(html);
	if (peso > LIMITE_GMAIL) add('error', 'Peso del correo', null, `${(peso / 1024).toFixed(1)} KB`, 'Supera 102 KB: Gmail recorta el correo ("Mensaje recortado").');
	else if (peso > 90 * 1024) add('compatibilidad', 'Peso del correo', null, `${(peso / 1024).toFixed(1)} KB`, 'Cerca del límite de 102 KB de Gmail; poco margen para variables o contenido más largo.');
	const lang = (html.match(/<html[^>]*\slang="([^"]*)"/) || [])[1];
	if (!lang) add('accesibilidad', 'Documento', 0, '<html> sin lang', `Falta lang="${l}" en <html>.`);
	else if (lang !== l) add('error', 'Documento', html.indexOf('<html'), `lang="${lang}"`, `La versión ${l.toUpperCase()} declara lang="${lang}".`);
	const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1];
	if (!title || !title.trim()) add('accesibilidad', 'Documento', html.indexOf('<head'), '<title> vacío', 'Falta el <title> (asunto) del correo.');
	if (/<style[\s>]/i.test(html)) add('compatibilidad', 'Documento', html.search(/<style[\s>]/i), '<style>', 'Gmail y otros clientes eliminan <style> en algunos casos; usar estilos inline.');
	for (const m of html.matchAll(/\sclass="[^"]*"/g)) { add('compatibilidad', 'Clases CSS', m.index, recorte(m[0]), 'Usa clases; los estilos deben ir inline.'); break; }
	for (const m of html.matchAll(/<div[\s>]/g)) { add('compatibilidad', 'Estructura', m.index, '<div>', 'Hay <div>; el layout debe hacerse con tablas (Outlook usa el motor de Word).'); break; }
	for (const [re, txt] of [[/display:\s*(flex|grid)/, 'flex/grid'], [/float:\s*(left|right)/, 'float'], [/position:\s*(absolute|relative|fixed)/, 'position']]) {
		const m = html.match(re);
		if (m) add('compatibilidad', 'Estructura', m.index, m[0], `Usa ${txt}; Outlook de escritorio lo ignora.`);
	}
	for (const m of html.matchAll(/[;"\s]margin(-[a-z]+)?:\s*(?!0[;"\s])[^;"]+/g)) {
		if (/<body[^>]*$/.test(html.slice(Math.max(0, m.index - 200), m.index))) continue; // margin:0 del body está bien
		add('compatibilidad', 'Espaciado', m.index, recorte(m[0].trim()), 'Usa margin; Outlook lo ignora en muchos elementos. Usar padding en el <td>.');
		break;
	}
	if (/\.webp\b/i.test(html)) add('error', 'Imágenes', html.search(/\.webp\b/i), '.webp', 'Outlook de escritorio para Windows no muestra .webp.');

	// --- tablas ---
	let malTablas = [];
	for (const m of html.matchAll(/<table\b[^>]*>/g)) {
		const t = m[0];
		const falta = ['role="presentation"', 'cellpadding="0"', 'cellspacing="0"', 'border="0"'].filter((a) => !t.includes(a));
		if (falta.length) malTablas.push({ idx: m.index, falta });
	}
	if (malTablas.length) add('compatibilidad', 'Tablas', malTablas[0].idx, `${malTablas.length} tabla(s) sin ${[...new Set(malTablas.flatMap((x) => x.falta))].join(', ')}`, 'Todas las tablas deben llevar role="presentation" cellpadding="0" cellspacing="0" border="0".');

	// --- fondos: bgcolor y background-color juntos y del mismo color ---
	for (const m of html.matchAll(/<(td|table|body)\b[^>]*>/g)) {
		const t = m[0];
		const bg = (t.match(/bgcolor="([^"]*)"/) || [])[1];
		const bc = (styleDe(t).match(/background-color:\s*([^;!]+)/) || [])[1];
		if (bc && /transparent/.test(bc)) continue;
		if (bg && !bc) add('compatibilidad', 'Fondos', m.index, `bgcolor="${bg}" sin background-color`, 'Agregar background-color en el style (Gmail/Apple Mail lo usan).');
		else if (!bg && bc && m[1] !== 'body') add('compatibilidad', 'Fondos', m.index, `background-color: ${bc.trim()} sin bgcolor`, 'Agregar bgcolor (Outlook de escritorio lee el atributo).');
		else if (bg && bc && bg.toLowerCase() !== bc.trim().toLowerCase()) add('error', 'Fondos', m.index, `bgcolor="${bg}" / background-color: ${bc.trim()}`, 'El color del atributo y el del style no coinciden.');
	}

	// --- textos en td: Arial, line-height en px, mso-line-height-rule ---
	const sinMso = [], sinPx = [], noArial = [];
	for (const m of html.matchAll(/<td\b[^>]*style="([^"]*font-size[^"]*)"[^>]*>/g)) {
		const s = m[1].replace(/\s+/g, ' ');
		if (/font-size:\s*0/.test(s)) continue;
		// solo celdas con texto propio (no las que solo envuelven una imagen o una tabla)
		const cont = html.slice(m.index + m[0].length).split(/<\/td>|<table\b/)[0];
		if (!cont.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, '').trim()) continue;
		if (!/mso-line-height-rule:\s*exactly/.test(s)) sinMso.push(m.index);
		const lh = (s.match(/line-height:\s*([^;]+)/) || [])[1];
		if (!lh || !/px/.test(lh)) sinPx.push(m.index);
		const ff = (s.match(/font-family:\s*([^;]+)/) || [])[1];
		if (ff && !/^\s*Arial/i.test(ff)) noArial.push({ idx: m.index, ff });
	}
	if (sinMso.length) add('compatibilidad', 'Textos', sinMso[0], `${sinMso.length} celda(s) de texto sin mso-line-height-rule`, 'Sin mso-line-height-rule: exactly, Outlook cambia el interlineado.');
	if (sinPx.length) add('compatibilidad', 'Textos', sinPx[0], `${sinPx.length} celda(s) sin line-height en px`, 'El interlineado debe ir en px para que sea igual en todos los clientes.');
	if (noArial.length) add('error', 'Textos', noArial[0].idx, recorte(noArial[0].ff), `${noArial.length} celda(s) no usan Arial; el correo usa Arial.`);

	// --- imágenes ---
	const base = baseEsperada();
	const imgs = [];
	for (const m of html.matchAll(/<img\b[\s\S]*?\/?>/g)) {
		const t = m[0];
		const src = (t.match(/src="([^"]*)"/) || [])[1] || '';
		const file = src.split('/').pop();
		const prefijo = file.replace(/\.[a-z]+$/i, '');
		const obj = { img: prefijo };
		const w = +(t.match(/\swidth="(\d+)"/) || [])[1] || 0;
		const h = +(t.match(/\sheight="(\d+)"/) || [])[1] || 0;
		imgs.push({ idx: m.index, src, file, w, h, obj });
		if (!/\salt="/.test(t)) add('accesibilidad', 'Imágenes', m.index, file, 'Sin atributo alt (usar alt="" si es decorativa).', obj);
		if (!w || !h) add('compatibilidad', 'Imágenes', m.index, file, 'Sin width/height en atributos; Outlook la muestra a tamaño real.', obj);
		if (!/display:\s*block/.test(styleDe(t))) add('compatibilidad', 'Imágenes', m.index, file, 'Sin display:block; algunos clientes dejan un hueco debajo.', obj);
		if (etapa === '1_maqueta') {
			if (!src.startsWith('../../img/')) add('error', 'Imágenes', m.index, src, 'En la maqueta las imágenes van con ruta relativa ../../img/.', obj);
		} else if (!/^https:\/\//.test(src)) add('error', 'Imágenes', m.index, src, 'Fuera de la maqueta las imágenes deben ir con URL absoluta https://.', obj);
		else if (base && !src.startsWith(base)) add('error', 'Imágenes', m.index, src, `No apunta al ambiente esperado (${base}).`, obj);
	}

	// --- links ---
	const pendientes = [];
	for (const m of html.matchAll(/<a\b[\s\S]*?>([\s\S]*?)<\/a\s*>/g)) {
		const t = m[0];
		const href = (t.match(/href="([^"]*)"/) || [])[1];
		const texto = recorte(m[1].replace(/<[^>]+>/g, ''), 40);
		if (href === '#' || href === '') pendientes.push({ idx: m.index, texto });
		if (/^https?:/.test(href || '') && !/target="_blank"/.test(t)) add('mejora', 'Links', m.index, `${texto} → ${href}`, 'Link externo sin target="_blank".', texto || undefined);
		if (/^http:\/\//.test(href || '')) add('error', 'Links', m.index, href, 'Link sin https.');
		if (href && href !== '#' && /<img\b/.test(t) === false && texto && !/<span\b[^>]*color/.test(t)) add('compatibilidad', 'Links', m.index, texto, 'El texto del link no va dentro de un <span> con color: Gmail/Outlook pueden pintarlo de azul.', texto);
	}
	if (pendientes.length) {
		const lista = [...new Set(pendientes.map((p) => p.texto || '(imagen)'))].join(', ');
		const fuerte = etapa === '3_integrado' || etapa.startsWith('4_bucket/');
		add(fuerte ? 'error' : 'mejora', 'Links pendientes', pendientes[0].idx, `${pendientes.length} link(s) con href="#": ${lista}`,
			fuerte ? 'En esta etapa ya no deberían quedar links sin URL.' : 'Pendientes para el dev (esperado en esta etapa).', pendientes[0].texto || undefined);
	}

	return { l, f, html, H, imgs };
}

(async () => {
	const res = IDIOMAS.map(revisar).filter(Boolean);
	if (!res.length) fail(`no existe ${path.relative(REPO, archivo('en'))} ni la versión es`);
	const comunes = [];

	// imágenes: archivo local existente y tamaño (exportado a 2x)
	let sharp = null;
	try { sharp = require(path.join(REPO, 'node_modules/sharp')); } catch {}
	for (const r of res) for (const im of r.imgs) {
		if (etapa === '1_maqueta' && im.src.startsWith('../../img/')) {
			const p = path.join(ROOT, 'img', im.file);
			if (!fs.existsSync(p)) { r.H.push({ prioridad: 'error', donde: 'Imágenes', linea: lineaDe(r.html, im.idx), actual: im.file, revisar: 'No existe en img/.', objetivo: im.obj }); continue; }
			if (sharp && im.w) {
				const meta = await sharp(p).metadata();
				const esc = meta.width / im.w;
				if (esc < 1.9) r.H.push({ prioridad: 'mejora', donde: 'Imágenes', linea: lineaDe(r.html, im.idx), actual: `${im.file}: ${meta.width}px para ${im.w}px`, revisar: `Exportada a ${esc.toFixed(1)}x; se ve borrosa en pantallas retina (exportar a 2x).`, objetivo: im.obj });
				if (im.w && im.h && Math.abs(im.w / meta.width * meta.height - im.h) > 0.01) r.H.push({ prioridad: 'compatibilidad', donde: 'Imágenes', linea: lineaDe(r.html, im.idx), actual: `${im.file}: ${meta.width}×${meta.height} a ${im.w}px de ancho = ${(im.w / meta.width * meta.height).toFixed(2)}px de alto`, revisar: 'Con height:auto el alto renderizado queda con decimales y cada cliente lo redondea distinto. Ajustar el archivo a medidas pares (2x exacto de un tamaño entero).', objetivo: im.obj });
				if (im.h && Math.abs(meta.width / meta.height - im.w / im.h) > 0.03 * (im.w / im.h)) r.H.push({ prioridad: 'error', donde: 'Imágenes', linea: lineaDe(r.html, im.idx), actual: `${im.file}: ${meta.width}×${meta.height} en ${im.w}×${im.h}`, revisar: 'La proporción del archivo no coincide con width/height: la imagen se deforma.', objetivo: im.obj });
			}
		} else if (process.argv.includes('--red') && /^https:\/\//.test(im.src)) {
			try {
				const resp = await fetch(im.src, { method: 'HEAD' });
				if (!resp.ok) r.H.push({ prioridad: 'error', donde: 'Imágenes', linea: lineaDe(r.html, im.idx), actual: im.src, revisar: `La URL responde ${resp.status}: la imagen no está subida al bucket.`, objetivo: im.obj });
			} catch (e) { r.H.push({ prioridad: 'error', donde: 'Imágenes', linea: lineaDe(r.html, im.idx), actual: im.src, revisar: `No se pudo consultar la URL (${e.message}).`, objetivo: im.obj }); }
		}
	}

	// EN vs ES: misma estructura (comentarios) y mismas variables
	if (res.length === 2) {
		const [a, b] = res;
		const com = (h) => [...h.matchAll(/<!--([\s\S]*?)-->/g)].map((m) => m[1].trim());
		const ca = com(a.html), cb = com(b.html);
		if (ca.join('|') !== cb.join('|')) {
			let k = 0; while (ca[k] === cb[k]) k++;
			comunes.push({ prioridad: 'error', donde: 'Estructura EN / ES', actual: `${ca.length} vs ${cb.length} comentarios; primera diferencia: "${ca[k] || '—'}" / "${cb[k] || '—'}"`, revisar: 'Las dos versiones no tienen las mismas filas/bloques.' });
		}
		const vars = (h) => [...h.matchAll(/\{\{[^{}]+\}\}|\{[A-Za-z_][\w.]*\}/g)].map((m) => m[0]).sort();
		const va = vars(a.html), vb = vars(b.html);
		if (va.join('|') !== vb.join('|')) {
			const soloA = va.filter((v) => !vb.includes(v)), soloB = vb.filter((v) => !va.includes(v));
			comunes.push({ prioridad: 'error', donde: 'Variables EN / ES', actual: `Solo EN: ${[...new Set(soloA)].join(', ') || '—'} · Solo ES: ${[...new Set(soloB)].join(', ') || '—'}`, revisar: 'Las variables no coinciden entre idiomas (revisar nombres o cantidad).' });
		}
	}

	// 4_bucket: igual a 3_integrado salvo las URLs de imágenes
	if (etapa.startsWith('4_bucket/')) for (const r of res) {
		const fi = archivo(r.l, '3_integrado');
		if (!fs.existsSync(fi)) continue;
		const norm = (h) => h.replace(/src="[^"]*\/([^/"]+)"/g, 'src="$1"');
		if (norm(fs.readFileSync(fi, 'utf8')) !== norm(r.html)) comunes.push({ prioridad: 'error', donde: `Bucket ${r.l.toUpperCase()}`, actual: path.relative(ROOT, r.f), revisar: 'Difiere de 3_integrado en algo más que las URLs de imágenes: volver a publicar con /publicar-ambientes.' });
	}

	const out = { proyecto: carpeta, etapa, mailing, pesoKB: {}, hallazgos: {}, comunes };
	for (const r of res) { out.pesoKB[r.l] = +(Buffer.byteLength(r.html) / 1024).toFixed(1); out.hallazgos[r.l] = r.H; }
	console.log(JSON.stringify(out, null, 2));
})();
