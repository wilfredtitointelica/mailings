// Abre la página en Edge headless, comprueba que cada observación encuentra su elemento y toma capturas.
// Requiere puppeteer-core (instalarlo en el scratchpad, no en el proyecto):
//   npm install puppeteer-core --prefix <scratchpad>/pptr
//   NODE_PATH=<scratchpad>/pptr/node_modules node .claude/skills/observaciones-html/scripts/verificar.cjs <archivo.html> <carpeta-capturas>
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const [file, shots] = process.argv.slice(2);
if (!file || !shots) { console.error('uso: verificar.cjs <archivo.html> <carpeta-capturas>'); process.exit(1); }
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

(async () => {
	const b = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--disable-gpu'] });
	const p = await b.newPage();
	const errs = [];
	p.on('pageerror', (e) => errs.push(e.message));
	p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
	await p.setViewport({ width: 1440, height: 900 });
	await p.goto('file:///' + path.resolve(file).replace(/\\/g, '/'));
	await new Promise((r) => setTimeout(r, 2500));
	const res = await p.evaluate(() => blocks.map((st) => ({ key: st.key, ready: st.ready, missing: st.items.map((it, i) => (st.marks[i] ? null : `#${i + 1} ${JSON.stringify(it.target)}`)).filter(Boolean) })));
	let ok = true;
	for (const r of res) {
		if (!r.ready || r.missing.length) ok = false;
		console.log(`${r.ready && !r.missing.length ? 'ok  ' : 'FALLA'} ${r.key}${r.missing.length ? ' · sin objetivo: ' + r.missing.join(', ') : ''}`);
	}
	fs.mkdirSync(shots, { recursive: true });
	await p.screenshot({ path: path.join(shots, 'obs-portada.png') });
	// una captura por bloque (primer paso de cada mailing/idioma)
	const firsts = await p.evaluate(() => blocks.map((st) => [...document.querySelectorAll('.step')].indexOf(st.el.querySelector('.step'))));
	for (const [n, idx] of firsts.entries()) {
		await p.evaluate((i) => { const s = document.querySelectorAll('.step')[i]; const r = s.getBoundingClientRect(); window.scrollTo({ top: scrollY + r.top + r.height / 2 - innerHeight / 2, behavior: 'instant' }); }, idx);
		await new Promise((r) => setTimeout(r, 1500));
		await p.screenshot({ path: path.join(shots, `obs-${String(n + 1).padStart(2, '0')}.png`) });
	}
	console.log(`\nErrores JS: ${errs.length ? errs.join(' | ') : 'ninguno'}`);
	console.log(`Capturas en ${shots}`);
	await b.close();
	process.exit(ok && !errs.length ? 0 : 1);
})();
