// Compara el render de un HTML (Edge headless) con el screenshot de Figma del mismo idioma.
// Uso:
//   node scripts/auditoria/comparar-render.cjs --html <archivo.html> --figma <screenshot-figma.png> --out <carpeta> [--offset 16]
// --offset: padding del table wrapper alrededor del contenedor de 600px (16 en las referencias).
// Imprime:
//   - alto total de Figma y del render;
//   - bandas de contenido (filas con tinta) de ambos y las que se corren más de 1px (posible error);
//   - extensión horizontal del contenido en cada banda que difiere.
// Deja en --out: render.png (recortado a 600px) y tramos de 600px de ambos para mirarlos.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const REPO = path.resolve(__dirname, '../..');
const sharp = require(path.join(REPO, 'node_modules/sharp'));
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

const arg = (k) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : null; };
const html = arg('html'), figma = arg('figma'), out = arg('out');
const offset = +(arg('offset') || 16);
if (!html || !figma || !out) { console.error('uso: --html <archivo.html> --figma <png> --out <carpeta> [--offset 16]'); process.exit(1); }
fs.mkdirSync(out, { recursive: true });

(async () => {
	const F = await sharp(figma).removeAlpha().raw().toBuffer({ resolveWithObject: true });
	const H = F.info.height, W = F.info.width;
	const shot = path.resolve(out, 'render-full.png');
	const r = spawnSync(EDGE, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--window-size=${W + offset * 2},${H + offset * 2 + 200}`, `--screenshot=${shot}`,
		'file:///' + path.resolve(html).replace(/\\/g, '/')], { encoding: 'utf8' });
	if (!fs.existsSync(shot)) { console.error('Edge no generó la captura', r.stderr); process.exit(1); }
	const meta = await sharp(shot).metadata();
	const renderPng = path.join(out, 'render.png');
	await sharp(shot).extract({ left: offset, top: offset, width: W, height: Math.min(H + 150, meta.height - offset) }).toFile(renderPng);
	const R = await sharp(renderPng).removeAlpha().raw().toBuffer({ resolveWithObject: true });

	// alto real del render: última fila distinta del fondo del wrapper
	const fondo = [...R.data.slice((R.info.height - 1) * W * 3, (R.info.height - 1) * W * 3 + 3)];
	let altoRender = R.info.height;
	for (let y = R.info.height - 1; y >= 0; y--) {
		let igual = true;
		for (let x = 0; x < W && igual; x += 4) { const i = (y * W + x) * 3; if (R.data[i] !== fondo[0] || R.data[i + 1] !== fondo[1] || R.data[i + 2] !== fondo[2]) igual = false; }
		if (!igual) { altoRender = y + 1; break; }
	}

	const claro = (d, i) => d[i] >= 0xf0 && d[i + 1] >= 0xf0 && d[i + 2] >= 0xf0;
	function bandas(B, h) {
		const res = []; let s = null;
		for (let y = 0; y < h; y++) {
			let tinta = false;
			for (let x = 0; x < W && !tinta; x++) if (!claro(B.data, (y * W + x) * 3)) tinta = true;
			if (tinta && s === null) s = y;
			if (!tinta && s !== null) { res.push([s, y - 1]); s = null; }
		}
		if (s !== null) res.push([s, h - 1]);
		return res;
	}
	function extX(B, [a, b]) {
		let mn = W, mx = -1;
		for (let y = a; y <= b; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 3; if (0.299 * B.data[i] + 0.587 * B.data[i + 1] + 0.114 * B.data[i + 2] < 0x80) { mn = Math.min(mn, x); mx = Math.max(mx, x); } }
		return mx < 0 ? null : [mn, mx];
	}
	// el último pixel de Figma suele ser una fila de suavizado (alto con decimales): se ignora
	const sinBorde = (b, h) => b.filter(([a, z]) => !(a === z && z >= h - 1));
	const bf = sinBorde(bandas(F, H), H), br = sinBorde(bandas(R, Math.min(altoRender, R.info.height)), altoRender);
	console.log(`Alto Figma ${H}px · alto render ${altoRender}px${Math.abs(H - altoRender) > 1 ? `  << diferencia ${altoRender - H}px` : ''}`);
	console.log(`Bandas de contenido: Figma ${bf.length} · render ${br.length}`);
	let difs = 0;
	for (let i = 0; i < Math.max(bf.length, br.length); i++) {
		const a = bf[i], b = br[i];
		if (!a || !b) { console.log(`  banda ${i}: Figma ${JSON.stringify(a || null)} · render ${JSON.stringify(b || null)}  << falta`); difs++; continue; }
		const dy = b[0] - a[0], dh = (b[1] - b[0]) - (a[1] - a[0]);
		const xa = extX(F, a), xb = extX(R, b);
		const dx = xa && xb ? Math.max(Math.abs(xa[0] - xb[0]), Math.abs(xa[1] - xb[1])) : 0;
		if (Math.abs(dy) > 1 || Math.abs(dh) > 1 || dx > 1) {
			difs++;
			console.log(`  banda ${i}: Figma y ${a[0]}-${a[1]} x ${xa} · render y ${b[0]}-${b[1]} x ${xb}  << dy ${dy} dh ${dh} dx ${dx}`);
		}
	}
	console.log(difs ? `${difs} banda(s) con diferencias > 1px` : 'Sin diferencias > 1px');

	// tramos de 600px para mirar
	for (const [nombre, src, h] of [['figma', figma, H], ['render', renderPng, Math.min(altoRender, R.info.height)]])
		for (let t = 0, k = 0; t < h; t += 600, k++)
			await sharp(src).extract({ left: 0, top: t, width: W, height: Math.min(600, h - t) }).toFile(path.join(out, `${nombre}-${String(k).padStart(2, '0')}.png`));
	console.log(`Capturas en ${out}`);
})();
