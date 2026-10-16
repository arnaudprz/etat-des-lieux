// Captures de la page des indépendants (et des pages groupe), Chromium et WebKit : haut, page entière, fenêtre de visite.
// Usage : node scripts/responsive/groupe.mjs <dossier> [page] [largeurs]. Aucune visite n'est réservée (appels interceptés).
import { chromium, webkit } from 'playwright';
import { mkdirSync } from 'node:fs';
const SORTIE = process.argv[2]; const PAGE = process.argv[3] || 'groupe-independants';
const TAILLES = { '320': [320, 568], '390': [390, 844], '430': [430, 932], '768': [768, 1024], '844x390': [844, 390], '1440': [1440, 900] };
const CHOIX = (process.argv[4] || '320,390,844x390,768,1440').split(',');
for (const [nom, m] of [['chromium', chromium], ['webkit', webkit]]) {
  const b = await m.launch(); mkdirSync(`${SORTIE}/${nom}`, { recursive: true });
  for (const t of CHOIX) {
    const [w, h] = TAILLES[t];
    const p = await b.newPage({ viewport: { width: w, height: h }, hasTouch: w < 900 }); const err = []; p.on('pageerror', (e) => err.push(e.message));
    // Des créneaux simulés pour voir la fenêtre comme en vrai (aucune visite n'est réservée).
    await p.route(/supabase\.co/, (r) => { const corps = r.request().postDataJSON() || {}; const l = new Date((corps.p_lundi || '2026-10-19') + 'T12:00:00');
      const jours = [0, 1, 2, 3, 4].map((k) => { const d = new Date(l); d.setDate(l.getDate() + k); const iso = d.toISOString().slice(0, 10);
        return { jour: iso, ferme: k === 2 ? 'Vacances scolaires' : null, creneaux: ['09:30', '11:00', '14:00', '16:00'].map((h, i) => ({ heure: h, libre: (k + i) % 3 !== 0 })) }; });
      r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, jours }) }); });
    await p.goto(`http://localhost:4522/${PAGE}.html?envoye`, { waitUntil: 'networkidle' }); await p.waitForTimeout(1500);
    await p.screenshot({ path: `${SORTIE}/${nom}/${t}-haut.png` });
    await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 300) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 50)); } });
    await p.waitForTimeout(600); await p.screenshot({ path: `${SORTIE}/${nom}/${t}-bas.png` });
    await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(400);
    await p.screenshot({ path: `${SORTIE}/${nom}/${t}-pleine.png`, fullPage: true });
    const hauteur = await p.evaluate(() => document.body.scrollHeight);
    await p.locator('[data-rdv]:visible').first().click().catch(() => {}); await p.waitForTimeout(900);
    await p.screenshot({ path: `${SORTIE}/${nom}/${t}-visite.png` });
    console.log(nom, t, 'erreurs', err.length, 'hauteur', hauteur, await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1 ? 'DÉBORDE' : 'ok'));
    await p.close();
  }
  await b.close();
}
