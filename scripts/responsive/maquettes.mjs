// Captures des maquettes de pistes (390 × 844) : écran de départ, après un toucher, idées ouvertes, phrase suivante.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const SORTIE = process.argv[2] || 'captures/responsive-2026-10-15/pistes'; mkdirSync(SORTIE, { recursive: true });
const FICHIERS = process.argv.slice(3);
const b = await chromium.launch();
for (const f of FICHIERS) {
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const err = []; p.on('pageerror', (e) => err.push(e.message));
  await p.goto('http://localhost:4523/' + f + '.html', { waitUntil: 'networkidle' }); await p.waitForTimeout(900);
  await p.screenshot({ path: `${SORTIE}/${f}-1.png` });
  if (f.startsWith('phrase')) {
    await p.locator('.carte-rep', { hasText: 'Un peu' }).first().click(); await p.waitForTimeout(900);
    await p.locator('.idee').first().click(); await p.waitForTimeout(300);
    await p.screenshot({ path: `${SORTIE}/${f}-2.png` });
    await p.locator('[data-suivante]:visible').first().click(); await p.waitForTimeout(900);
    await p.screenshot({ path: `${SORTIE}/${f}-3.png` });
  } else {
    await p.waitForTimeout(3500); await p.screenshot({ path: `${SORTIE}/${f}-2.png` });
    await p.screenshot({ path: `${SORTIE}/${f}-3.png`, fullPage: true });
  }
  console.log(f, err.length ? err : 'ok');
  await p.close();
}
await b.close();
