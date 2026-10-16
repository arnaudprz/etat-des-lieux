// Retire du site copié (gabarits Astro de docs/_astro et HTML des pages) l'ancien menu et les liens vers la préprod du nouveau
// site (Arnaud, 16 octobre 2026 : « retire le code plutôt », « masque rien, fais tout propre »). Les mêmes règles valent pour les
// gabarits (que le moteur dessine) et pour le HTML de départ (affiché avant le script) : rien n'est caché, tout est retiré.
// Rejouable sans risque : un fichier déjà propre ne change pas. Usage : node scripts/nettoyer-site.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';

const D = fileURLToPath(new URL('../docs/', import.meta.url));
const GABARITS = ['EDL-Accueil.CyfT6M-6-s16.js', 'EDL-Confidentialite.CIyBALm7-s16.js', 'EDL-Confidentialite--mobile.DC6tGKdF-s16.js', 'EDL-Profil.pR1LxfxD-s16.js',
  'EDL-Profil--mobile.C4PDooJ4-s16.js', 'EDL-Questions.nkkzdu0A-s16.js', 'MEtatDesLieux.Dcfq2LOL-s16.js', 'EnteteMobile.CAhsyuPB-s16.js', 'PiedMobile.DFaPZ5yt-s16.js'];
const PAGES = ['index.html', 'etat-des-lieux/index.html', 'etat-des-lieux/questionnaire/index.html', 'etat-des-lieux/confidentialite/index.html'];
const PREPROD = 'arnaudprz.github.io/espace-intervenant';
// L'adresse du pied : la Greatly House partout, comme sur l'accueil (l'ancienne adresse de La Madeleine restait dans le formulaire).
const ADRESSE = [/81 rue du Pré Catelan, 59110 La Madeleine/g, 'Greatly House, 10 rue de Lambersart, 59237 Verlinghem'];

// Les règles, sur un arbre générique : { tag, attr(nom), poser(nom, valeur), enfants (tableau modifiable), texte() }.
const nettoyer = (n, parents) => {
  const enfants = n.enfants; if (!enfants) return;
  for (let i = enfants.length - 1; i >= 0; i--) {
    const c = enfants[i];
    if (c.objet === 'menu') { enfants.splice(i, 1); continue; } // le panneau du menu (mobile)
    if (!c.tag) { nettoyer(c, parents); continue; }
    const dansTete = parents.includes('header') || n.tag === 'header';
    const dansPied = parents.includes('footer') || n.tag === 'footer';
    const href = c.attr('href') || '';
    // L'en-tête : le logo seul (la navigation, la bulle « Menu » et le bloc de droite partent).
    if (dansTete && (c.tag === 'nav' || (c.tag === 'button' && /m-press/.test(c.attr('class') || '')) || (c.tag === 'div' && n.tag === 'div' && parents[parents.length - 2] === 'header'))) { enfants.splice(i, 1); continue; }
    // Le pied : seulement sa dernière ligne (le logo et les mentions).
    if (n.tag === 'footer' && i < enfants.filter((x) => x.tag).length - 1 && c !== enfants.filter((x) => x.tag).at(-1)) { enfants.splice(i, 1); continue; }
    if (c.tag === 'a' && href.includes(PREPROD)) {
      if (/confidentialite/.test(href)) { c.poser('href', '/etat-des-lieux/confidentialite/'); }
      else if (/\/site\/$/.test(href) && /GREATLY/.test(c.texte())) { c.poser('href', '/'); }
      else {
        // Le lien part avec son séparateur « · » (avant ou après).
        enfants.splice(i, 1);
        const sep = (x) => x && typeof x.brut === 'string' && !x.tag && /^\s*·\s*$/.test(x.brut);
        if (sep(enfants[i])) enfants.splice(i, 1); else if (sep(enfants[i - 1])) enfants.splice(i - 1, 1);
        continue;
      }
    }
    void dansPied;
    nettoyer(c, [...parents, c.tag]);
  }
};

// ---------- les gabarits (arbre JSON : [balise, attributs, enfants] ; objets { si, e } pour les blocs conditionnels)
const versGenerique = (x) => {
  if (Array.isArray(x)) { const [tag, at, ch] = x; return { tag, brut: x, attr: (k) => at && at[k], poser: (k, v) => { at[k] = v; }, enfants: (ch || []).map(versGenerique), texte: () => JSON.stringify(x) }; }
  if (x && typeof x === 'object' && x.e) return { objet: x.si, brut: x, enfants: x.e.map(versGenerique) };
  return { brut: x };
};
const versBrut = (g) => {
  if (g.tag) { g.brut[2] = g.enfants.map(versBrut); return g.brut; }
  if (g.objet !== undefined && g.brut.e) { g.brut.e = g.enfants.map(versBrut); return g.brut; }
  return g.brut;
};
for (const f of GABARITS) {
  const chemin = D + '_astro/' + f; const s = readFileSync(chemin, 'utf8');
  const m = await import(pathToFileURL(chemin).href + '?t=' + Date.now());
  const racine = { tag: '#racine', attr: () => null, enfants: (Array.isArray(m.arbre) ? m.arbre : [m.arbre]).map(versGenerique) };
  nettoyer(racine, []);
  const arbre = racine.enfants.map(versBrut);
  // Le module est réécrit à partir de ce qu'il exporte (certains gabarits ont l'arbre en JSON.parse, d'autres en littéral).
  const gabarit = (v) => '`' + JSON.stringify(v).replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${') + '`';
  const neuf = ('const nom=' + JSON.stringify(m.nom) + ',titre=' + JSON.stringify(m.titre) + ',css=' + JSON.stringify(m.css) + ',props=JSON.parse(' + gabarit(m.props) + '),arbre=JSON.parse(' + gabarit(arbre) + '),d={nom,titre,css,props,arbre};export{arbre,css,d as default,nom,props,titre};\n').replace(...ADRESSE);
  if (neuf !== s) { writeFileSync(chemin, neuf); console.log('gabarit nettoyé :', f); } else console.log('déjà propre :', f);
}

// ---------- le HTML de départ des pages (petit analyseur : balises gardées telles quelles, seulement des nœuds retirés)
const VIDES = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const BRUT = new Set(['script', 'style', 'textarea', 'title']);
const analyser = (html) => {
  const racine = { tag: '#racine', enfants: [], parent: null }; let cour = racine; let i = 0;
  const texte = (t) => cour.enfants.push({ brut: t });
  while (i < html.length) {
    const j = html.indexOf('<', i); if (j < 0) { texte(html.slice(i)); break; }
    if (j > i) texte(html.slice(i, j));
    if (html.startsWith('<!--', j)) { const k = html.indexOf('-->', j) + 3; cour.enfants.push({ brut: html.slice(j, k) }); i = k; continue; }
    if (html[j + 1] === '!') { const k = html.indexOf('>', j) + 1; cour.enfants.push({ brut: html.slice(j, k) }); i = k; continue; }
    if (html[j + 1] === '/') { const k = html.indexOf('>', j) + 1; const nom = html.slice(j + 2, k - 1).trim().toLowerCase(); let x = cour; while (x && x.tag !== nom) x = x.parent; if (x) { x.fermeture = html.slice(j, k); cour = x.parent; } i = k; continue; }
    let k = j + 1, q = null; while (k < html.length) { const c = html[k]; if (q) { if (c === q) q = null; } else if (c === '"' || c === "'") q = c; else if (c === '>') break; k++; } k++;
    const ouverture = html.slice(j, k); const nom = (ouverture.match(/^<([a-zA-Z0-9-]+)/) || [])[1].toLowerCase();
    const n = { tag: nom, ouverture, enfants: [], parent: cour, fermeture: '' }; cour.enfants.push(n); i = k;
    if (VIDES.has(nom) || /\/>$/.test(ouverture)) continue;
    if (BRUT.has(nom)) { const fin = html.toLowerCase().indexOf('</' + nom, i); n.enfants.push({ brut: html.slice(i, fin) }); const f2 = html.indexOf('>', fin) + 1; n.fermeture = html.slice(fin, f2); i = f2; continue; }
    cour = n;
  }
  return racine;
};
const serialiser = (n) => (n.tag === '#racine' ? '' : n.tag ? n.ouverture : n.brut) + (n.enfants ? n.enfants.map(serialiser).join('') : '') + (n.tag && n.tag !== '#racine' ? n.fermeture : '');
const habiller = (n) => {
  if (!n.tag) return n;
  n.attr = (k) => { const m = n.ouverture && n.ouverture.match(new RegExp('\\s' + k + '="([^"]*)"')); return m ? m[1] : null; };
  n.poser = (k, v) => { n.ouverture = n.ouverture.replace(new RegExp('(\\s' + k + '=")[^"]*(")'), '$1' + v + '$2'); };
  n.texte = () => serialiser(n);
  n.enfants.forEach(habiller); return n;
};
for (const f of PAGES) {
  const chemin = D + f; const s = readFileSync(chemin, 'utf8');
  const racine = habiller(analyser(s)); nettoyer(racine, []);
  const neuf = serialiser(racine).replace(...ADRESSE);
  if (neuf !== s) { writeFileSync(chemin, neuf); console.log('page nettoyée :', f, s.length, '→', neuf.length); } else console.log('déjà propre :', f);
}
