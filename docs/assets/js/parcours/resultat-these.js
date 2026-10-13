/**
 * La page de résultat dans la thèse de Greatly (Arnaud, 13 octobre 2026) : « on compare lui vs le général ».
 *
 * Ligne par ligne, à gauche son équipe telle qu'il la voit (la confiance, le soutien, la cohésion, puis l'engagement et
 * la performance), à droite toute l'étude : là où c'est le cas, et ailleurs, avec « Votre équipe est ici » du côté où il
 * se trouve. Les chiffres d'ensemble viennent de edl_these (chiffres regroupés, rien sous 3 personnes) ; ses réponses
 * viennent du lien et ne partent jamais au serveur. Tout le texte est posé en textContent.
 */
import { chargerContenu } from '../contenu.js?v=35';
import { decoder } from '../lien.js?v=35';
import { envoyerContact, compteur } from '../api.js?v=35';
import { SUPABASE_URL, SUPABASE_CLE, modeDemo } from '../config.js?v=35';
import { memoriserResultat } from '../session.js?v=35';
import { caseSolo, chiffresPourSolo } from '../seuil-solo.js?v=35';

const $ = (s, r = document) => r.querySelector(s);
const el = (balise, classe, texte) => { const n = document.createElement(balise); if (classe) n.className = classe; if (texte != null) n.textContent = texte; return n; };
const pc = (p) => (p == null ? '—' : p + ' %');
const sur10 = (p) => (p == null ? null : Math.round(p / 10));

// Les trois mots, leurs affirmations (contenu.json → fondations) et leurs pictogrammes (ceux du tableau de bord).
const MOTS = [
  { cle: 'confiance', nom: 'La confiance', groupe: 'confiance', aff: [11, 12], quand: 'Là où la confiance est là', ailleurs: 'Ailleurs',
    la: 'Dans votre équipe, on peut se dire les choses.', grandir: 'Dans votre équipe, dire ce qu’on pense dépend encore des moments.',
    icone: 'M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3zM9 12l2 2 4-4' },
  { cle: 'soutien', nom: 'Le soutien', groupe: 'soutien', aff: [10, 13], quand: 'Là où on se sent soutenu', ailleurs: 'Ailleurs',
    la: 'Dans votre équipe, on sait sur qui compter.', grandir: 'Dans votre équipe, demander de l’aide n’est pas encore évident.',
    icone: 'M3 15h4l3 2h5a2 2 0 0 0 0-4h-3M7 15v5H3v-5M15 8.5a2 2 0 0 1 3.5-1.3A2 2 0 0 1 22 8.5c0 2-3.5 4-3.5 4S15 10.5 15 8.5z' },
  { cle: 'cohesion', nom: 'La cohésion', groupe: 'cohesion', aff: [1, 2, 5, 6], quand: 'Là où l’équipe est soudée', ailleurs: 'Ailleurs',
    la: 'Dans votre équipe, on avance ensemble, et chacun a sa place.', grandir: 'Dans votre équipe, avancer ensemble peut encore grandir.',
    icone: 'M12 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM10.5 7.5l-3 7.5M13.5 7.5l3 7.5M9 18h6' },
];
const ICONE_TOUS = 'M4 17l6-6 4 4 6-8M14 7h6v6';
const ICONE_PERF = 'M3 20h18M6 16v-4M10 16V8M14 16v-6M18 16V5';

// Une fondation est « là » quand la moyenne de ses affirmations atteint « En bonne partie » (même règle que calcul.js).
const niveau = (rep, aff) => { if (aff.some((a) => rep[a - 1] == null)) return null; return Math.floor(aff.reduce((x, a) => x + Number(rep[a - 1]), 0) / aff.length + 0.5); };
const la = (rep, aff) => { const v = niveau(rep, aff); return v != null && v >= 2; };

function svg(d) {
  const ns = 'http://www.w3.org/2000/svg'; const s = document.createElementNS(ns, 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true');
  const p = document.createElementNS(ns, 'path'); p.setAttribute('d', d); s.appendChild(p); return s;
}
function pastilles(p, fort) {
  // Au pourcent près (Arnaud, 13 octobre 2026 : « passe en % ») : chaque pastille vaut 10 %, la dernière se remplit en partie.
  const b = el('span', 'pts'); const v = Math.max(0, Math.min(100, p || 0)); const on = fort ? 'on-fort' : 'on';
  for (let i = 0; i < 10; i++) { const f = Math.max(0, Math.min(10, v - i * 10)) * 10;
    if (f >= 100) b.appendChild(el('i', on));
    else if (f <= 0) b.appendChild(el('i', 'off'));
    else { const d = el('i', 'off part'); const r = el('b', on); r.style.width = f + '%'; d.appendChild(r); b.appendChild(d); } }
  return b;
}
function enTete(icone, titre) {
  // Sans pictogramme (Arnaud, 13 octobre 2026 : « retire les SVG »).
  const h = el('div', 'carte__tete'); void icone; h.append(el('span', 'carte__nom', titre)); return h;
}

// À gauche : son équipe.
function carteLui(icone, titre, etat, phrase, details) {
  const c = el('div', 'carte lui ' + (etat === 'la' ? 'lui--la' : 'lui--grandir'));
  c.appendChild(enTete(icone, titre));
  c.appendChild(el('span', 'etat', etat === 'la' ? 'C’est là' : 'Peut encore grandir'));
  c.appendChild(el('p', 'phrase', phrase));
  if (details && details.length) { const l = el('ul', 'vos-reponses'); details.forEach((d) => l.appendChild(el('li', '', d))); c.appendChild(l); }
  return c;
}

// À droite : toute l'étude, « là où c'est le cas » contre « ailleurs », et le côté où se trouve son équipe.
function carteEtude(icone, titre, avec, sans, cote, mot, phrase) {
  const c = el('div', 'carte etude');
  const tete = enTete(icone, titre);
  if (avec.p != null && sans.p != null) tete.appendChild(el('span', 'ecart', (avec.p - sans.p >= 0 ? '+' : '') + (avec.p - sans.p) + ' points'));
  c.appendChild(tete);
  const deux = el('div', 'deux');
  [[avec, true, avec.titre], [sans, false, sans.titre]].forEach(([x, fort, t]) => {
    const s = el('div', 'cote ' + (fort ? 'cote--la' : 'cote--ailleurs'));
    if ((cote === 'la') === fort) s.appendChild(el('span', 'ici', 'Votre équipe est ici'));
    s.append(el('span', 'cote__titre', t + (x.n != null ? ' · ' + x.n + ' pers.' : '')), el('span', 'cote__val', pc(x.p)), pastilles(x.p, fort),
      el('span', 'cote__sur10', x.p == null ? 'Moins de 3 personnes : pas de chiffre.' : 'Environ ' + sur10(x.p) + ' sur 10 ' + mot));
    deux.appendChild(s);
  });
  c.append(deux, el('p', 'phrase', phrase));
  return c;
}

function rangee(gauche, droite) { const r = el('div', 'rangee'); r.append(gauche, droite); return r; }

async function lireSouhaits() {
  if (modeDemo() || !SUPABASE_URL) return null;
  try {
    const r = await fetch(SUPABASE_URL + '/rest/v1/rpc/edl_souhaits', { method: 'POST', headers: { apikey: SUPABASE_CLE, Authorization: 'Bearer ' + SUPABASE_CLE, 'Content-Type': 'application/json' }, body: '{}' });
    const d = r.ok ? await r.json() : null; return d && d.ok ? d.souhaits : null;
  } catch (e) { return null; }
}

// La thèse par rôle (13 octobre 2026) : un solo ne voit que des solos, un manager ou un membre jamais de solos. Tant que
// la base n'a pas la fonction à paramètre (migration 29), on retombe sur l'ancienne, qui ne connaît pas encore de solo.
async function appelThese(corps) {
  const r = await fetch(SUPABASE_URL + '/rest/v1/rpc/edl_these', { method: 'POST', headers: { apikey: SUPABASE_CLE, Authorization: 'Bearer ' + SUPABASE_CLE, 'Content-Type': 'application/json' }, body: JSON.stringify(corps) });
  const d = r.ok ? await r.json() : null; return d && d.ok ? d : null;
}
async function lireThese(role) {
  if (modeDemo() || !SUPABASE_URL) return null;
  try {
    let d = await appelThese({ p_role: role }).catch(() => null);
    if (!d) d = await appelThese({});
    if (!d) return null;
    // Un solo ne voit que des chiffres d'indépendants, jamais ceux des équipes (seuil-solo.js).
    if (role === 'solo') return chiffresPourSolo(d);
    return d;
  } catch (e) { return null; }
}

// Sans base (démonstration), des chiffres de la maquette, pour voir la page.
const DEMO = { n: 412, intensites: { confiance: 71, soutien: 69, cohesion: 61, engagement: 68, performance: 58 }, groupes: { toutes: { n: 240, engages: 86, perf: 71 }, manque: { n: 172, engages: 52, perf: 44 },
  confiance_avec: { n: 292, engages: 84 }, confiance_sans: { n: 120, engages: 49 }, soutien_avec: { n: 292, engages: 82 }, soutien_sans: { n: 120, engages: 55 },
  cohesion_avec: { n: 272, engages: 85 }, cohesion_sans: { n: 140, engages: 53 } }, questions: {} };

function afficher(lu, contenu, these) {
  // Le même schéma des deux côtés (Arnaud, 13 octobre 2026 : « le même schéma à droite qu'à gauche, montrer où il se situe vs la
  // totalité de l'étude ») : la confiance, le soutien, la cohésion → l'engagement → la performance. À gauche lui, à droite tous.
  const rep = lu.reponses;
  const solo = lu.role === 'solo';
  const T = solo ? chiffresPourSolo(these) : these || DEMO; const G = T.groupes || {}; const N = T.n || 0;
  const part = (k) => (G[k] && N ? Math.round(G[k].n / N * 100) : null);
  const compte = (k, champ) => (G[k] && G[k][champ] != null ? G[k].n * G[k][champ] / 100 : 0);
  const engTous = N ? Math.round((compte('toutes', 'engages') + compte('manque', 'engages')) / N * 100) : null;
  const perfTous = N ? Math.round((compte('toutes', 'perf') + compte('manque', 'perf')) / N * 100) : null;
  const engLui = la(rep, [14, 15]); const perfLui = rep[15] != null && rep[15] >= 2;
  const nbLa = MOTS.filter((m) => la(rep, m.aff)).length;
  // Le grand titre de gauche (Arnaud, 13 octobre 2026 : « utiliser tout le bloc, un beau titre ») : combien d'atouts, puis lesquels.
  const noms = (l) => l.map((m) => m.nom.charAt(0).toLowerCase() + m.nom.slice(1));
  const et = (l) => (l.length > 1 ? l.slice(0, -1).join(', ') + ' et ' + l[l.length - 1] : l[0] || '');
  const oui = MOTS.filter((m) => la(rep, m.aff)), non = MOTS.filter((m) => !la(rep, m.aff));
  // Rien de jugé (Arnaud, 13 octobre 2026 : « on va rien juger, 2 atouts sur 3 ») : un titre qui ne compte pas, une phrase qui décrit.
  const debut = (txt) => txt.charAt(0).toUpperCase() + txt.slice(1);
  // On ne juge pas (Arnaud, 13 octobre 2026) : un titre et une phrase qui décrivent, sans dire ce qui va ou ne va pas.
  // Un solo parle de son activité, pas d'une équipe ; à droite, des indépendants, ou les équipes tant qu'ils sont moins de 3.
  // Un solo : uniquement les indépendants, thème par thème, dès que chaque côté compte au moins 3 personnes.
  const incomplet = solo && !['toutes', 'manque', 'confiance_avec', 'confiance_sans', 'soutien_avec', 'soutien_sans', 'cohesion_avec', 'cohesion_sans'].every((k) => caseSolo(G[k]));
  // Un solo (14e corrections, 13 octobre 2026) : aucun mot d'équipe, de manager ni de collègue. Manager et membre : inchangé.
  // À gauche « Votre activité, telle que vous la voyez. », sans répéter « votre activité » dans le surtitre.
  if (solo) {
    if ($('[data-lui-leger]')) $('[data-lui-leger]').textContent = 'Votre activité,';
    $('[data-lui-titre]').textContent = 'telle que vous la voyez.';
    if ($('[data-lui-sur]')) $('[data-lui-sur]').textContent = 'Votre regard';
  } else $('[data-lui-titre]').textContent = 'votre équipe.';
  // À droite, pour un solo : toujours « Ce que montrent les indépendants ». Tant que certains thèmes n'ont pas encore assez
  // d'indépendants, une ligne le dit, en positif.
  const D_SUR = !solo ? 'Toute l’étude' : 'Les indépendants';
  if (solo) {
    if ($('[data-droite-sur]')) $('[data-droite-sur]').textContent = D_SUR;
    if ($('[data-droite-leger]')) $('[data-droite-leger]').textContent = 'Ce que montrent';
    if ($('[data-droite-gras]')) $('[data-droite-gras]').textContent = 'les indépendants.';
    if ($('[data-ouv-sur]')) $('[data-ouv-sur]').textContent = 'Ce que montrent les indépendants';
    const note = $('[data-droite-note]');
    if (note) { note.textContent = incomplet ? 'Leurs chiffres apparaissent thème par thème, dès que 3 indépendants au moins sont de chaque côté.' : ''; note.hidden = !incomplet; }
    // Le grand nombre : les indépendants qui ont répondu, pas toutes les personnes.
    const nb = $('[data-n-chiffre]'); const tx = document.querySelector('.grand-nombre__texte');
    if (nb) nb.textContent = String(N); if (tx) tx.textContent = N > 1 ? 'indépendants ont répondu à l’état des lieux.' : 'indépendant a répondu à l’état des lieux.';
  }
  afficher.cote = { gauche: solo ? 'Votre activité' : 'Votre équipe', droite: D_SUR };
  $('[data-lui-resume]').textContent = 'Vos réponses, thème par thème : la confiance, le soutien, la cohésion, puis l’engagement et la performance.';
  // Le grand titre d'en-tête est retiré (Arnaud, 13 octobre 2026) : on garde la ligne si on le remet.
  if ($('[data-titre]')) $('[data-titre]').textContent = nbLa === 3 ? 'votre équipe a la confiance, le soutien et la cohésion.' : nbLa === 0 ? 'votre équipe a tout pour grandir.' : 'votre équipe a déjà des atouts.';
  // Le nombre de participants : le compteur public (réponses papier comprises), pas seulement les réponses détaillées en ligne.
  compteur().then((total) => { document.querySelectorAll('[data-n-reponses]').forEach((n) => { n.textContent = total + ' personnes'; }); document.querySelectorAll('[data-n-chiffre]').forEach((n) => { if (solo) { if (!(n.nextSibling && n.nextSibling.nodeType === 3)) n.after(document.createTextNode(' ')); return; } n.textContent = total; if (solo && !(n.nextSibling && n.nextSibling.nodeType === 3)) n.after(document.createTextNode(' ')); }); }).catch(() => {});

  // La même mesure des deux côtés : l'intensité des réponses (0 à 3) ramenée à 100. Pour lui, ses réponses ; pour l'étude, la
  // moyenne de tous les répondants (edl_these → intensites). « C'est là » à partir de 50, soit une moyenne d'au moins 1,5 sur 3.
  const I = T.intensites || { confiance: 71, soutien: 69, cohesion: 61, engagement: 68, performance: 58 };
  const pcLui = (aff) => { const v = aff.map((n) => rep[n - 1]).filter((x) => x != null); return v.length ? Math.round(v.reduce((x, y) => x + Number(y), 0) / (3 * v.length) * 100) : null; };
  // Des phrases dans notre thèse (Arnaud, 13 octobre 2026) : ce qui est là est un atout pour l'engagement ; à droite, ce qui se passe
  // là où c'est le cas, chiffres de toute l'étude à l'appui.
  const eng = (k) => (G[k] && G[k].engages != null ? G[k].engages : null);
  const dit = (a, b) => (a == null || b == null ? '' : a + '\u00a0% des personnes sont engagées, contre ' + (b === 0 ? 'aucune' : b + '\u00a0%') + ' ailleurs.');
  const NOMS = { confiance: ['la confiance', 'Là où la confiance est là, '], soutien: ['le soutien', 'Là où on se sent soutenu, '], cohesion: ['la cohésion', 'Là où l’équipe est soudée, '] };
  // Pour un solo, les phrases ne parlent que de personnes, jamais d'équipe (13 octobre 2026).
  if (solo) { NOMS.soutien = ['le soutien', 'Là où le soutien est là, ']; NOMS.cohesion = ['la cohésion', 'Là où la cohésion est là, ']; }
  // Des phrases comme « Ce qu'on peut dire, chiffres à l'appui » (Arnaud, 13 octobre 2026), au-dessus des pastilles.
  const MANQUE = { confiance: 'Là où elle manque, ', soutien: 'Là où il manque, ', cohesion: 'Là où elle manque, ' };
  const reste = (b) => (b === 0 ? 'aucune.' : pc(b) + '.');
  const LIGNES = [
    ...MOTS.map((m) => ({ affs: m.aff, icone: m.icone, nom: m.nom, oui: la(rep, m.aff), lui_p: pcLui(m.aff),
      lui_oui: m.nom + ' est là : c’est un atout pour l’engagement de votre équipe.',
      lui_non: m.nom + ' peut encore grandir dans votre équipe.',
      comme: (oui) => (oui ? 'Comme vous, d’autres personnes ' + { confiance: 'ont la confiance', soutien: 'se sentent soutenues', cohesion: 'vivent la cohésion' }[m.cle] + ' dans leur équipe.'
        : 'Comme vous, d’autres personnes ' + { confiance: 'manquent encore de confiance', soutien: 'manquent encore de soutien', cohesion: 'manquent encore de cohésion' }[m.cle] + '.'),
      contre: (oui) => (oui ? { confiance: 'Là où la confiance manque', soutien: 'Là où le soutien manque', cohesion: 'Là où la cohésion manque' }[m.cle]
        : { confiance: 'Là où la confiance est là', soutien: 'Là où le soutien est là', cohesion: 'Là où la cohésion est là' }[m.cle]),
      p: I[m.cle], a: eng(m.groupe + '_avec'), b: eng(m.groupe + '_sans'), a_nom: { confiance: 'Avec la confiance', soutien: 'Avec du soutien', cohesion: 'Avec la cohésion' }[m.cle], b_nom: { confiance: 'Sans assez de confiance', soutien: 'Sans assez de soutien', cohesion: 'Sans assez de cohésion' }[m.cle], ici: la(rep, m.aff),
      pourquoi: () => { const v = pcLui(m.aff); return 'Pourquoi vous êtes de ce côté : vos réponses sur ' + NOMS[m.cle][0] + ' donnent ' + v + ' sur 100. ' + (v >= 50 ? 'À partir de 50, on considère ' + (m.cle === 'soutien' ? 'qu’il est là.' : 'qu’elle est là.') : 'En dessous de 50, on considère ' + (m.cle === 'soutien' ? 'qu’il n’est pas encore là.' : 'qu’elle n’est pas encore là.')); },
      phrase: (a, b) => NOMS[m.cle][1] + pc(a) + ' des personnes sont engagées. ' + MANQUE[m.cle] + reste(b),
      tous: () => NOMS[m.cle][1] + dit(eng(m.groupe + '_avec'), eng(m.groupe + '_sans')) })),
    { fleche: true },
    { affs: [14, 15], icone: ICONE_TOUS, nom: 'L’engagement', oui: engLui, lui_p: pcLui([14, 15]),
      lui_oui: 'Vous vous dites engagé : c’est la conséquence de ce que votre équipe a déjà.',
      lui_non: 'Votre engagement grandit avec la confiance, le soutien et la cohésion.',
      pourquoi: () => { const manquent = MOTS.filter((m) => !la(rep, m.aff)).map((m) => NOMS[m.cle][0] + ' (' + pcLui(m.aff) + ' sur 100)');
        return manquent.length ? 'Pourquoi vous êtes de ce côté : d’après vos réponses, il manque encore ' + manquent.join(' et ') + ' pour que les trois soient réunis.' : 'Pourquoi vous êtes de ce côté : d’après vos réponses, la confiance, le soutien et la cohésion sont tous les trois à 50 sur 100 ou plus.'; },
      comme: (oui) => (oui ? 'Comme vous, d’autres personnes ont la confiance, le soutien et la cohésion réunis.' : 'Comme vous, d’autres personnes n’ont pas encore les trois réunis.'),
      contre: (oui) => (oui ? 'Là où l’un des trois manque' : 'Là où les trois sont réunis'),
      p: I.engagement, a: eng('toutes'), b: eng('manque'), a_nom: 'Avec les trois réunis', b_nom: 'Sans les trois réunis', ici: nbLa === 3,
      phrase: (a, b) => 'Là où la confiance, le soutien et la cohésion sont réunis, ' + pc(a) + ' des personnes sont engagées. Quand l’un des trois manque, ' + reste(b),
      tous: () => 'Là où la confiance, le soutien et la cohésion sont réunis, ' + dit(eng('toutes'), eng('manque')) },
    { affs: [16], icone: ICONE_PERF, nom: 'La performance', oui: perfLui, lui_p: pcLui([16]),
      lui_oui: 'Votre équipe atteint ses objectifs : la performance suit.',
      lui_non: 'La performance suit quand la confiance, le soutien et la cohésion sont là.',
      pourquoi: () => { const manquent = MOTS.filter((m) => !la(rep, m.aff)).map((m) => NOMS[m.cle][0] + ' (' + pcLui(m.aff) + ' sur 100)');
        return manquent.length ? 'Pourquoi vous êtes de ce côté : d’après vos réponses, il manque encore ' + manquent.join(' et ') + ' pour que les trois soient réunis.' : 'Pourquoi vous êtes de ce côté : d’après vos réponses, la confiance, le soutien et la cohésion sont tous les trois à 50 sur 100 ou plus.'; },
      comme: (oui) => (oui ? 'Comme vous, d’autres personnes ont la confiance, le soutien et la cohésion réunis.' : 'Comme vous, d’autres personnes n’ont pas encore les trois réunis.'),
      contre: (oui) => (oui ? 'Là où l’un des trois manque' : 'Là où les trois sont réunis'),
      mot: 'd’entre elles atteignent leurs objectifs',
      phrase: (a, b) => 'Là où les trois sont réunis, ' + pc(a) + ' des personnes atteignent leurs objectifs. Quand l’un des trois manque, ' + reste(b),
      p: I.performance, a: G.toutes ? G.toutes.perf : null, b: G.manque ? G.manque.perf : null, a_nom: 'Avec les trois réunis', b_nom: 'Sans les trois réunis', ici: nbLa === 3,
      tous: () => (G.toutes && G.manque && G.toutes.perf != null && G.manque.perf != null ? 'Là où les trois sont réunis, ' + G.toutes.perf + '\u00a0% atteignent leurs objectifs, contre ' + G.manque.perf + '\u00a0% ailleurs.' : '') },
  ];
  const hote = $('[data-rangees]'); hote.textContent = '';
  LIGNES.forEach((l) => {
    if (l.fleche) { const f = el('div', 'fleche'); f.append(el('span', '', '↓ La conséquence'), el('span', '', '↓ La conséquence')); hote.appendChild(f); return; }
    // Pour lui aussi, un pourcentage (Arnaud, 13 octobre 2026) : ses réponses sur 3, ramenées à 100.
    // Plus de jugement (Arnaud, 13 octobre 2026) : même couleur pour tous, pas de phrase « atout » / « à grandir ».
    const gauche = el('div', 'carte simple simple--la');
    const tete = enTete(l.icone, l.nom); // sans étiquette « C'est là » / « À grandir » (Arnaud, 13 octobre 2026)
    const coeur = el('div', 'lui-coeur'); coeur.append(el('span', 'grand', l.lui_p == null ? '—' : l.lui_p + ' sur 100'), pastilles(l.lui_p, true));
    // Sur téléphone, les deux cartes d'un thème passent l'une sous l'autre : une petite étiquette dit de quel côté on est.
    gauche.append(el('span', 'carte__cote', afficher.cote.gauche), tete, coeur);
    // Ce que vous demandez, quand le répondant a coché des idées sur ce thème (Arnaud, 13 octobre 2026) : comme « Ce qu'ils demandent » à droite.
    const miens = [];
    l.affs.forEach((n) => { const rel = contenu.affirmations[n - 1] && contenu.affirmations[n - 1].relance && contenu.affirmations[n - 1].relance[lu.role];
      ((lu.relances || {})[n] || []).forEach((i) => { if (i === 'autre' || !rel || rel.choix[i] == null) return;
        const d = (rel.debut || '').replace(/…$/, '').trim(); const tx = rel.choix[i];
        const voeu = d && d !== 'J\'aimerais' ? d + ' ' + tx.charAt(0).toLowerCase() + tx.slice(1) : tx;
        if (!miens.includes(voeu)) miens.push(voeu); }); });
    if (miens.length) { const bloc = el('div', 'demandes'); bloc.appendChild(el('span', 'demandes__titre', 'Ce que vous demandez'));
      miens.forEach((v) => bloc.appendChild(el('p', 'demande', '« ' + v + ' »'))); gauche.appendChild(bloc); }
    // À droite, une phrase qui le situe (Arnaud, 13 octobre 2026, choix « Une phrase qui le situe ») : comme lui, d'autres personnes…
    // parmi elles, X sur 10 sont engagées ; puis l'autre côté, en une ligne. Plus de bandes : on ne mélange plus son chiffre et le leur.
    // Le bloc de droite, optimisé (Arnaud, 13 octobre 2026) : une phrase courte de la thèse, l'écart, deux rangées de pastilles ;
    // sa rangée surlignée avec « vous » (la légende sous le titre explique le vert vif).
    const droite = el('div', 'carte simple simple--tous');
    const tete2 = enTete(l.icone, l.nom);
    if (l.a != null && l.b != null) { if (solo) tete2.appendChild(document.createTextNode(' ')); tete2.appendChild(el('span', 'ecart', (l.a - l.b >= 0 ? '+' : '') + (l.a - l.b) + ' points')); }
    droite.append(el('span', 'carte__cote', afficher.cote.droite), tete2);
    const mot = l.mot ? 'atteignent leurs objectifs' : 'sont engagées';
    if (l.a != null && l.b != null && l.phrase) droite.appendChild(el('p', 'these-ligne', l.phrase(l.a, l.b)));
    // Un solo dont le thème n'a pas encore 3 indépendants de chaque côté : une phrase, jamais de « — » ni de chiffre d'équipe.
    const attente = solo && (l.a == null || l.b == null);
    if (attente) droite.appendChild(el('p', 'these-ligne', 'Le chiffre des indépendants s’affiche ici dès que 3 d’entre eux au moins sont de chaque côté.'));
    const rangs = el('div', 'rangs');
    [[l.a, l.a_nom, true], [l.b, l.b_nom, false]].forEach(([p, nom, fort]) => {
      // Pas de marque de sa position à droite (Arnaud, 13 octobre 2026 : « on ne doit pas marquer sa position ») : l'écart parle seul.
      const r = el('div', 'rang' + (fort ? ' rang--avec' : ' rang--sans'));
      const tt = el('span', 'rang__nom');
      tt.appendChild(el('span', '', nom));
      r.append(tt, pastilles(p, true), el('span', 'rang__val', pc(p)));
      rangs.appendChild(r);
    });
    void mot;
    if (!attente) droite.append(rangs);
    // Ce que demandent les managers et les équipes, pour ce thème (Arnaud, 13 octobre 2026) : le souhait le plus choisi par rôle.
    const SW = afficher.souhaits || [];
    const demande = (role) => { const l2 = SW.filter((x) => x.role === role && l.affs.includes(x.n)).sort((a, b) => b.p - a.p || b.choisis - a.choisis)[0]; if (!l2) return null;
      const rel = contenu.affirmations[l2.n - 1].relance[role]; const t = rel && rel.choix[l2.choix]; if (!t) return null;
      const d = (rel.debut || '').replace(/…$/, '').trim(); const voeu = d && d !== 'J\'aimerais' ? d + ' ' + t.charAt(0).toLowerCase() + t.slice(1) : t;
      return { voeu, p: l2.p }; };
    // Un solo ne voit jamais « Les managers » ni « Les équipes » : seulement ce que demandent les autres indépendants,
    // et seulement si au moins 3 solos ont choisi ce souhait. Sinon, pas de bloc.
    if (solo) {
      const l3 = SW.filter((x) => x.role === 'solo' && l.affs.includes(x.n) && x.choisis >= 3).sort((a, b) => b.p - a.p || b.choisis - a.choisis)[0];
      const rel = l3 && contenu.affirmations[l3.n - 1].relance.solo; const t3 = rel && rel.choix[l3.choix];
      if (t3) { const bloc = el('div', 'demandes'); bloc.appendChild(el('span', 'demandes__titre', 'Ce que demandent les autres indépendants'));
        bloc.appendChild(el('p', 'demande', '« ' + t3 + ' »')); droite.appendChild(bloc); }
    }
    const dm = solo ? null : demande('manager'), de = solo ? null : demande('membre'), ds = null;
    if (dm || de || ds) {
      const bloc = el('div', 'demandes'); bloc.appendChild(el('span', 'demandes__titre', 'Ce qu’ils demandent'));
      [[dm, 'Les managers'], [de, 'Les équipes'], [ds, 'Les indépendants']].forEach(([x, qui]) => { if (!x) return; const ln = el('p', 'demande');
        ln.append(el('strong', '', qui + ' : '), el('span', '', '« ' + x.voeu + ' »')); bloc.appendChild(ln); }); // sans chiffre (Arnaud)
      droite.appendChild(bloc);
    }
    hote.appendChild(rangee(gauche, droite));
  });
  // La thèse, en une phrase sous le schéma de droite.
  const t = G.toutes, mq = G.manque;
  // L'étoile : comment le chiffre est calculé (Arnaud, 13 octobre 2026 : « tu expliqueras avec une étoile »).
  // La note « Comment lire ces chiffres » est écrite dans la page (Arnaud, 13 octobre 2026 : détailler et citer Gittell).
  const phraseThese = t && mq && t.engages != null && mq.engages != null
    ? 'Là où la confiance, le soutien et la cohésion sont réunis, ' + pc(t.engages) + ' des personnes sont engagées. Ailleurs, ' + pc(mq.engages) + '.' : '';
  document.querySelectorAll('[data-these-court]').forEach((n) => { n.textContent = phraseThese; }); // retirée : la thèse est en haut
  // La phrase de la thèse a ses pastilles (Arnaud, 13 octobre 2026) : avec les trois réunis, sans ; la sienne surlignée.
  const hR = $('[data-these-rangs]');
  if (false && hR && t && mq) { hR.textContent = '';
    [[t.engages, 'Avec les trois réunis', true], [mq.engages, 'Sans les trois réunis', false]].forEach(([p, nom, fort]) => {
      const vous = (nbLa === 3) === fort; const r = el('div', 'rang' + (vous ? ' rang--vous' : ''));
      const tt = el('span', 'rang__nom', nom); if (vous) tt.appendChild(el('span', 'comme', 'comme vous, selon vos réponses'));
      r.append(tt, pastilles(p, true), el('span', 'rang__val', pc(p))); hR.appendChild(r); }); }
  // La thèse tout en haut, sur toute la largeur, avec ses chiffres (Arnaud, 13 octobre 2026) : le concept global avant le détail.
  if (t && mq && t.engages != null && mq.engages != null) {
    if ($('[data-ouverture]')) $('[data-ouverture]').hidden = false; // réaffiché quand les chiffres arrivent après un premier affichage vide
    $('[data-ouv-titre]').textContent = pc(t.engages) + ' des personnes sont engagées.';
    $('[data-ouv-chapo]').textContent = 'Ailleurs, ' + pc(mq.engages) + '.' + (t.perf != null && mq.perf != null ? ' Et la performance suit\u00a0: ' + pc(t.perf) + ' atteignent leurs objectifs, contre ' + pc(mq.perf) + '.' : '');
    const hC = $('[data-ouv-chiffres]'); hC.textContent = '';
    [['L’engagement', 'sont engagées', t.engages, mq.engages], ['La performance', 'atteignent leurs objectifs', t.perf, mq.perf]].forEach(([nom, verbe, a, b]) => {
      if (a == null || b == null) return;
      const c = el('div', 'carte simple simple--tous ouv-carte');
      const tete = enTete(null, nom); if (solo) tete.appendChild(document.createTextNode(' ')); tete.appendChild(el('span', 'ecart', (a - b >= 0 ? '+' : '') + (a - b) + ' points')); c.appendChild(tete);
      const rs = el('div', 'rangs');
      [[a, 'Avec les trois réunis', true], [b, 'Quand l’un des trois manque', false]].forEach(([p, lib, fort]) => {
        const r = el('div', 'rang' + (fort ? ' rang--avec' : ' rang--sans'));
        r.append(el('span', 'rang__nom', lib), pastilles(p, true), el('span', 'rang__val', pc(p))); rs.appendChild(r); });
      c.append(rs, el('p', 'ouv-carte__pied', 'Part des personnes qui ' + verbe + '.')); hC.appendChild(c); });
  } else { const o = $('[data-ouverture]'); if (o) o.hidden = true; }

  // Ses envies, en positif : là où c'est déjà le cas, et ailleurs.
  const echelle = null; void echelle;
  const Q = T.questions || {};
  const envies = [];
  Object.keys(lu.relances || {}).forEach((k) => {
    const n = Number(k); if ([3, 4, 7, 8].includes(n)) return; // l'info entre métiers et connaître les autres métiers : hors de notre thèse
    const rel = contenu.affirmations[n - 1] && contenu.affirmations[n - 1].relance && contenu.affirmations[n - 1].relance[lu.role];
    (lu.relances[k] || []).forEach((i) => { if (i === 'autre' || !rel || rel.choix[i] == null) return;
      const d = (rel.debut || '').replace(/…$/, '').trim(); const tx = rel.choix[i];
      const voeu = d && d !== 'J\'aimerais' ? d + ' ' + tx.charAt(0).toLowerCase() + tx.slice(1) : tx;
      const q = Q[k]; const perfQ = n >= 14; const a = q ? (perfQ ? q.avec.perf : q.avec.engages) : null, b = q ? (perfQ ? q.sans.perf : q.sans.engages) : null;
      envies.push({ voeu, phrase: a != null && b != null ? 'Là où c’est déjà le cas, ' + a + ' % ' + (perfQ ? 'atteignent leurs objectifs' : 'se disent engagés') + ', contre ' + pc(b) + ' ailleurs.' : '' });
    });
  });
  if (envies.length) {
    const l = $('[data-envies-liste]'); l.textContent = '';
    envies.forEach((e) => { const c = el('div', 'envie'); const tt = el('div', ''); tt.append(el('p', 'envie__voeu', e.voeu), el('p', 'envie__phrase', e.phrase)); c.append(el('span', 'guillemet', '“'), tt); l.appendChild(c); });
    $('[data-envies]').hidden = false;
  }
}

function brancherGarder() {
  // « Garder le lien » retiré de la page (Arnaud, 13 octobre 2026) : on ne branche que s'il revient.
  const champ = $('[data-lien]'); if (champ) champ.value = location.href;
  if ($('[data-copier]')) $('[data-copier]').addEventListener('click', async (ev) => { try { await navigator.clipboard.writeText(location.href); ev.target.textContent = 'Lien copié'; } catch (e) { champ.select(); } });
}

function brancherEtude() {
  const f = $('[data-etude]'); const msg = $('[data-message]');
  if (!f) return; // formulaire retiré de la page (Arnaud, 13 octobre 2026)
  f.addEventListener('submit', async (ev) => {
    ev.preventDefault(); const d = new FormData(f);
    const contact = { prenom: String(d.get('prenom') || '').trim(), nom: String(d.get('nom') || '').trim(), entreprise: String(d.get('entreprise') || '').trim(),
      email: String(d.get('email') || '').trim(), consentement: d.get('etude') === 'on', site: String(d.get('site') || '') };
    if (!contact.prenom || !contact.nom || !contact.entreprise || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(contact.email)) { msg.textContent = 'Il manque une information, ou l’adresse e-mail n’est pas valide.'; return; }
    if (!contact.consentement) { msg.textContent = 'Cochez la case pour que nous puissions vous écrire.'; return; }
    f.querySelector('button').disabled = true;
    const r = await envoyerContact(contact);
    if (r && r.ok) { f.textContent = ''; f.appendChild(el('p', 'merci', 'Merci. Vous recevrez votre résultat, puis l’étude globale dès qu’elle sera prête.')); }
    else { msg.textContent = 'L’envoi n’a pas abouti. Réessayez dans un instant.'; f.querySelector('button').disabled = false; }
  });
}

async function demarrer() {
  const contenu = await chargerContenu();
  const lu = decoder(location.hash, contenu);
  if (!lu) { $('[data-sans-resultat]').hidden = false; return; }
  memoriserResultat(location.href);
  $('[data-resultat]').hidden = false;
  afficher(lu, contenu, null);
  brancherGarder();
  brancherEtude();
  let [these, souhaits] = await Promise.all([lireThese(lu.role), lireSouhaits()]);
  // Démonstration d'un solo (?demo=1&solos=N) : des chiffres fictifs d'indépendants, pour voir la bascule au seuil.
  const nDemo = Number(new URLSearchParams(location.search).get('solos'));
  if (modeDemo() && lu.role === 'solo') {
    const c = (n, e, p) => ({ n, engages: n >= 3 ? e : null, perf: n >= 3 ? p : null });
    const q = {}; for (let n = 1; n <= 16; n++) q[n] = { avec: c(Math.ceil(nDemo / 2), 90, 75), sans: c(Math.floor(nDemo / 2), 45, 35) };
    these = { ok: true, role: 'solo', n: nDemo || 0, intensites: nDemo >= 3 ? { confiance: 66, soutien: 61, cohesion: 58, engagement: 72, performance: 63 } : null, questions: q,
      groupes: Object.fromEntries(Object.entries(DEMO.groupes).map(([k, g], i) => [k, c(Math.round((nDemo || 0) * (i % 2 ? 0.4 : 0.6)), g.engages, g.perf != null ? g.perf : g.engages - 12)])) };
    souhaits = nDemo >= 6 ? [{ role: 'solo', n: 10, choix: 0, concernes: 6, choisis: 3, p: 50 }] : [];
  }
  afficher.souhaits = souhaits || [];
  if (these) afficher(lu, contenu, these);
}

window.addEventListener('hashchange', () => location.reload());
demarrer();
