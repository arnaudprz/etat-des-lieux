/**
 * La page de résultat dans la thèse de Greatly (Arnaud, 13 octobre 2026) : « on compare lui vs le général ».
 *
 * Ligne par ligne, à gauche son équipe telle qu'il la voit (la confiance, le soutien, la cohésion, puis l'engagement et
 * la performance), à droite toute l'étude : là où c'est le cas, et ailleurs, avec « Votre équipe est ici » du côté où il
 * se trouve. Les chiffres d'ensemble viennent de edl_these (chiffres regroupés, rien sous 3 personnes) ; ses réponses
 * viennent du lien et ne partent jamais au serveur. Tout le texte est posé en textContent.
 */
import { chargerContenu, ideeActive } from '../contenu.js?v=228';
import { decoder } from '../lien.js?v=228';
import { envoyerContact, compteur } from '../api.js?v=228';
import { SUPABASE_URL, SUPABASE_CLE, modeDemo } from '../config.js?v=228';
import { memoriserResultat } from '../session.js?v=228';
import { caseSolo, chiffresPourSolo } from '../seuil-solo.js?v=228';

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
  carteRegard(rep);
  const solo = lu.role === 'solo';
  // La note « Comment lire ces chiffres » pour un solo (Arnaud, 15 octobre 2026, audit des wordings) : son activité, les autres
  // indépendants, et ses partenaires à la place des métiers d'une escale. La page porte la version équipe.
  // Sans clients ni sous-traitants depuis le profil solo recentré (Arnaud, 15 octobre 2026).
  if (solo) {
    document.querySelectorAll('[data-regard-note]').forEach((n) => { n.textContent = 'C’est votre regard sur votre activité, pas une note.'; });
    document.querySelectorAll('[data-compte-qui]').forEach((n) => { n.textContent = 'Ce sont les réponses des autres indépendants.'; });
    document.querySelectorAll('[data-gittell-qui]').forEach((n) => { n.textContent = 'Elle a étudié pendant des années comment des personnes aux métiers différents avancent ensemble, d’abord dans les escales de compagnies aériennes, puis dans les hôpitaux. Pour vous, c’est votre collectif, et celles et ceux avec qui vous avancez.'; });
  }
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
  } else {
    // « Votre équipe » une seule fois : le surtitre dit « Votre regard », le titre garde l'équipe (Arnaud, 15 octobre 2026).
    $('[data-lui-titre]').textContent = 'votre équipe.';
    if ($('[data-lui-sur]')) $('[data-lui-sur]').textContent = 'Votre regard';
  }
  // À droite, pour un solo : toujours « Ce que montrent les indépendants ». Tant que certains thèmes n'ont pas encore assez
  // d'indépendants, une ligne le dit, en positif.
  const D_SUR = !solo ? 'Toute l’étude' : 'Les indépendants';
  if (solo) {
    if ($('[data-droite-sur]')) $('[data-droite-sur]').textContent = D_SUR;
    if ($('[data-droite-leger]')) $('[data-droite-leger]').textContent = 'Ce que montrent';
    if ($('[data-droite-gras]')) $('[data-droite-gras]').textContent = 'les indépendants.';
    if ($('[data-ouv-sur]')) $('[data-ouv-sur]').textContent = 'Ce que montrent les indépendants';
    const note = $('[data-droite-note]');
    if (note) { note.textContent = ''; note.hidden = true; } // remplacée par la carte « L'étude en cours » (13 octobre 2026)
    // Le grand nombre reste celui de toutes les personnes qui ont répondu (Arnaud, 13 octobre 2026 : « pas que les
    // solopreneurs »), comme pour les équipes.
  }
  afficher.cote = { gauche: solo ? 'Votre activité' : 'Votre équipe', droite: D_SUR };
  $('[data-lui-resume]').textContent = 'Vos réponses, thème par thème : la confiance, le soutien, la cohésion, puis l’engagement et la performance.';
  // Le grand titre d'en-tête est retiré (Arnaud, 13 octobre 2026) : on garde la ligne si on le remet.
  if ($('[data-titre]')) $('[data-titre]').textContent = nbLa === 3 ? 'votre équipe a la confiance, le soutien et la cohésion.' : nbLa === 0 ? 'votre équipe a tout pour grandir.' : 'votre équipe a déjà des atouts.';
  // Le nombre de participants : le compteur public (réponses papier comprises), pas seulement les réponses détaillées en ligne.
  compteur().then((total) => { carteEtudeEnCours(total); document.querySelectorAll('[data-n-reponses]').forEach((n) => { n.textContent = total + ' personnes'; }); /* le grand chiffre : la carte « L'étude en cours » s'en charge */ }).catch(() => {});

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
  const MANQUE = { confiance: 'Là où elle est moins présente, ', soutien: 'Là où il est moins présent, ', cohesion: 'Là où elle est moins présente, ' }; // (Arnaud, 15 octobre 2026, audit des wordings)
  const reste = (b) => (b === 0 ? 'aucune.' : pc(b) + '.');
  const LIGNES = [
    ...MOTS.map((m) => ({ affs: m.aff, icone: m.icone, nom: m.nom, oui: la(rep, m.aff), lui_p: pcLui(m.aff),
      lui_oui: m.nom + ' est là : c’est un atout pour l’engagement de votre équipe.',
      lui_non: m.nom + ' peut encore grandir dans votre équipe.',
      comme: (oui) => (oui ? 'Comme vous, d’autres personnes ' + { confiance: 'ont la confiance', soutien: 'se sentent soutenues', cohesion: 'vivent la cohésion' }[m.cle] + ' dans leur équipe.'
        : 'Comme vous, d’autres personnes ' + { confiance: 'manquent encore de confiance', soutien: 'manquent encore de soutien', cohesion: 'manquent encore de cohésion' }[m.cle] + '.'),
      contre: (oui) => (oui ? { confiance: 'Avec moins de confiance', soutien: 'Avec moins de soutien', cohesion: 'Avec moins de cohésion' }[m.cle]
        : { confiance: 'Là où la confiance est là', soutien: 'Là où le soutien est là', cohesion: 'Là où la cohésion est là' }[m.cle]),
      p: I[m.cle], a: eng(m.groupe + '_avec'), b: eng(m.groupe + '_sans'), a_nom: { confiance: 'Avec la confiance', soutien: 'Avec du soutien', cohesion: 'Avec la cohésion' }[m.cle], b_nom: { confiance: 'Avec moins de confiance', soutien: 'Avec moins de soutien', cohesion: 'Avec moins de cohésion' }[m.cle], ici: la(rep, m.aff),
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
      contre: (oui) => (oui ? 'Avec un ou deux des trois' : 'Là où les trois sont réunis'),
      p: I.engagement, a: eng('toutes'), b: eng('manque'), a_nom: 'Avec les trois réunis', b_nom: 'Avec un ou deux des trois', ici: nbLa === 3,
      phrase: (a, b) => 'Là où la confiance, le soutien et la cohésion sont réunis, ' + pc(a) + ' des personnes sont engagées. Avec un ou deux des trois, ' + reste(b),
      tous: () => 'Là où la confiance, le soutien et la cohésion sont réunis, ' + dit(eng('toutes'), eng('manque')) },
    { affs: [16], icone: ICONE_PERF, nom: 'La performance', oui: perfLui, lui_p: pcLui([16]),
      lui_oui: 'Votre équipe atteint ses objectifs : la performance suit.',
      lui_non: 'La performance suit quand la confiance, le soutien et la cohésion sont là.',
      pourquoi: () => { const manquent = MOTS.filter((m) => !la(rep, m.aff)).map((m) => NOMS[m.cle][0] + ' (' + pcLui(m.aff) + ' sur 100)');
        return manquent.length ? 'Pourquoi vous êtes de ce côté : d’après vos réponses, il manque encore ' + manquent.join(' et ') + ' pour que les trois soient réunis.' : 'Pourquoi vous êtes de ce côté : d’après vos réponses, la confiance, le soutien et la cohésion sont tous les trois à 50 sur 100 ou plus.'; },
      comme: (oui) => (oui ? 'Comme vous, d’autres personnes ont la confiance, le soutien et la cohésion réunis.' : 'Comme vous, d’autres personnes n’ont pas encore les trois réunis.'),
      contre: (oui) => (oui ? 'Avec un ou deux des trois' : 'Là où les trois sont réunis'),
      mot: 'd’entre elles atteignent leurs objectifs',
      phrase: (a, b) => 'Là où les trois sont réunis, ' + pc(a) + ' des personnes atteignent leurs objectifs. Avec un ou deux des trois, ' + reste(b),
      p: I.performance, a: G.toutes ? G.toutes.perf : null, b: G.manque ? G.manque.perf : null, a_nom: 'Avec les trois réunis', b_nom: 'Avec un ou deux des trois', ici: nbLa === 3,
      tous: () => (G.toutes && G.manque && G.toutes.perf != null && G.manque.perf != null ? 'Là où les trois sont réunis, ' + G.toutes.perf + '\u00a0% atteignent leurs objectifs, contre ' + G.manque.perf + '\u00a0% ailleurs.' : '') },
  ];
  const hote = $('[data-rangees]'); hote.textContent = '';
  const vue = []; // la même matière, pour la présentation de la maquette (15 octobre 2026)
  afficher.chiffres = vue;
  LIGNES.forEach((l) => {
    if (l.fleche) { const f = el('div', 'fleche'); f.append(el('span', '', '↓ Ce qui va avec'), el('span', '', '↓ Ce qui va avec')); hote.appendChild(f); return; } // (Arnaud, 15 octobre 2026, audit des wordings)
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
    // Chacun ne voit que ce que demandent les personnes de son profil (Arnaud, 15 octobre 2026 : « si équipe, seulement les
    // messages des équipes ; idem pour toutes les catégories ») : un membre, les membres ; un manager, les managers.
    const mien = solo ? null : demande(lu.role);
    if (mien) {
      const bloc = el('div', 'demandes');
      bloc.appendChild(el('span', 'demandes__titre', lu.role === 'manager' ? 'Ce que demandent les autres managers' : 'Ce que demandent les autres membres d’équipe'));
      bloc.appendChild(el('p', 'demande', '« ' + mien.voeu + ' »')); // sans chiffre (Arnaud)
      droite.appendChild(bloc);
    }
    hote.appendChild(rangee(gauche, droite));
    let dTitre = null, dTexte = null;
    if (solo) { const l3 = SW.filter((x) => x.role === 'solo' && l.affs.includes(x.n) && x.choisis >= 3).sort((a, b) => b.p - a.p || b.choisis - a.choisis)[0];
      const rel = l3 && contenu.affirmations[l3.n - 1].relance.solo; const t3 = rel && rel.choix[l3.choix]; if (t3) { dTitre = 'Ce que demandent les autres indépendants'; dTexte = t3; } }
    else if (mien) { dTitre = lu.role === 'manager' ? 'Ce que demandent les autres managers' : 'Ce que demandent les autres membres d’équipe'; dTexte = mien.voeu; }
    vue.push({ nom: l.nom, lui: l.lui_p, a: l.a, b: l.b, a_nom: l.a_nom, b_nom: l.b_nom, phrase: l.a != null && l.b != null && l.phrase ? l.phrase(l.a, l.b) : '', attente, miens, dTitre, dTexte, suite: l.affs.includes(14) || l.affs.includes(16) });
  });
  // La thèse, en une phrase sous le schéma de droite.
  const t = G.toutes, mq = G.manque;
  // L'étoile : comment le chiffre est calculé (Arnaud, 13 octobre 2026 : « tu expliqueras avec une étoile »).
  // La note « Comment lire ces chiffres » est écrite dans la page (Arnaud, 13 octobre 2026 : détailler et citer Gittell).
  const phraseThese = t && mq && t.engages != null && mq.engages != null
    ? 'Là où la confiance, le soutien et la cohésion sont réunis, ' + pc(t.engages) + ' des personnes sont engagées. Avec un ou deux des trois, ' + pc(mq.engages) + '.' : '';
  document.querySelectorAll('[data-these-court]').forEach((n) => { n.textContent = phraseThese; }); // retirée : la thèse est en haut
  // La phrase de la thèse a ses pastilles (Arnaud, 13 octobre 2026) : avec les trois réunis, sans ; la sienne surlignée.
  const hR = $('[data-these-rangs]');
  if (false && hR && t && mq) { hR.textContent = '';
    [[t.engages, 'Avec les trois réunis', true], [mq.engages, 'Avec un ou deux des trois', false]].forEach(([p, nom, fort]) => {
      const vous = (nbLa === 3) === fort; const r = el('div', 'rang' + (vous ? ' rang--vous' : ''));
      const tt = el('span', 'rang__nom', nom); if (vous) tt.appendChild(el('span', 'comme', 'comme vous, selon vos réponses'));
      r.append(tt, pastilles(p, true), el('span', 'rang__val', pc(p))); hR.appendChild(r); }); }
  // La thèse tout en haut, sur toute la largeur, avec ses chiffres (Arnaud, 13 octobre 2026) : le concept global avant le détail.
  if (t && mq && t.engages != null && mq.engages != null) {
    if ($('[data-ouverture]')) $('[data-ouverture]').hidden = false; // réaffiché quand les chiffres arrivent après un premier affichage vide
    $('[data-ouv-titre]').textContent = pc(t.engages) + ' des personnes sont engagées.';
    // Parler en gain (Arnaud, 15 octobre 2026, audit des wordings).
    $('[data-ouv-chapo]').textContent = 'Avec un ou deux des trois, ' + pc(mq.engages) + '.' + (t.perf != null && mq.perf != null ? ' Et elles atteignent plus souvent leurs objectifs\u00a0: ' + pc(t.perf) + ' contre ' + pc(mq.perf) + '.' : '');
    const hC = $('[data-ouv-chiffres]'); hC.textContent = '';
    [['L’engagement', 'sont engagées', t.engages, mq.engages], ['La performance', 'atteignent leurs objectifs', t.perf, mq.perf]].forEach(([nom, verbe, a, b]) => {
      if (a == null || b == null) return;
      const c = el('div', 'carte simple simple--tous ouv-carte');
      const tete = enTete(null, nom); if (solo) tete.appendChild(document.createTextNode(' ')); tete.appendChild(el('span', 'ecart', (a - b >= 0 ? '+' : '') + (a - b) + ' points')); c.appendChild(tete);
      const rs = el('div', 'rangs');
      [[a, 'Avec les trois réunis', true], [b, 'Avec un ou deux des trois', false]].forEach(([p, lib, fort]) => {
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
  if (!document.documentElement.classList.contains('mode-pdf')) vueNouvelle({ solo, role: lu.role, D_SUR, vue, t, mq });
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

// La carte « L'étude en cours » de l'accueil, à la place du grand nombre (Arnaud, 13 octobre 2026 : « je la trouve
// canon »). Le chiffre monte doucement pendant que les points se posent, un point par personne ; au-delà de 400, un
// point en vaut plusieurs (5, 10, 20, 50…). Pour tout le monde, solo, manager et membre.
let etudeAnimee = false;
function carteEtudeEnCours(total) {
  const c = $('[data-etude-cours]'); if (!c || !(total > 0)) return;
  const PAS = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];
  const par = PAS.find((x) => total / x <= 400) || Math.ceil(total / 400);
  const pts = c.querySelector('.etude-cours__points');
  if (pts.childElementCount !== Math.ceil(total / par)) { pts.textContent = ''; for (let i = 0; i < Math.ceil(total / par); i++) pts.appendChild(document.createElement('i')); }
  c.querySelector('.etude-cours__legende').textContent = par === 1 ? 'Chaque point, une personne.' : 'Chaque point, ' + par.toLocaleString('fr-FR') + ' personnes.';
  c.hidden = false;
  const peindre = (n) => { c.querySelector('.etude-cours__chiffre').textContent = n.toLocaleString('fr-FR');
    [...pts.children].forEach((x, k) => x.classList.toggle('on', k < Math.ceil(n / par))); };
  if (etudeAnimee) { peindre(total); return; }
  etudeAnimee = true;
  let calme = document.documentElement.classList.contains('mode-pdf'); try { calme = calme || matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { /* rien */ }
  if (calme) { peindre(total); return; }
  const lancer = () => { const t0 = performance.now();
    const pas = (t) => { const x = Math.min(1, (t - t0) / 1800); peindre(Math.round(total * (1 - Math.pow(1 - x, 3)))); if (x < 1) requestAnimationFrame(pas); };
    requestAnimationFrame(pas); };
  if ('IntersectionObserver' in window) { const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); lancer(); } }); io.observe(c); }
  else lancer();
}

// À gauche, la carte « Votre regard » qui répond à « L'étude en cours » (Arnaud, 13 octobre 2026 : « refais le bloc à
// gauche, on peut faire mieux »). Un point par réponse, teinté de « Pas encore » à « Pleinement » ; le chiffre monte et
// les points se posent un à un. Aucun jugement : juste son regard. Pour tout le monde.
let regardAnime = false;
function carteRegard(rep) {
  const c = $('[data-regard]'); if (!c || !Array.isArray(rep)) return;
  const pts = c.querySelector('.regard__points');
  if (!pts.childElementCount) rep.forEach((v) => { const i = document.createElement('i'); i.className = 'r' + Math.max(0, Math.min(3, Number(v) || 0)); pts.appendChild(i); });
  if ($('[data-lui-resume]')) $('[data-lui-resume]').hidden = true; // la carte dit la même chose
  c.hidden = false;
  const total = rep.length;
  const peindre = (n) => { c.querySelector('[data-regard-chiffre]').textContent = String(n); [...pts.children].forEach((x, k) => x.classList.toggle('vu', k < n)); };
  if (regardAnime) { peindre(total); return; }
  regardAnime = true;
  let calme = document.documentElement.classList.contains('mode-pdf'); try { calme = calme || matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { /* rien */ }
  if (calme) { peindre(total); return; }
  peindre(0);
  const lancer = () => { const t0 = performance.now();
    const pas = (t) => { const x = Math.min(1, (t - t0) / 1600); peindre(Math.round(total * (1 - Math.pow(1 - x, 3)))); if (x < 1) requestAnimationFrame(pas); };
    requestAnimationFrame(pas); };
  if ('IntersectionObserver' in window) { const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); lancer(); } }); io.observe(c); }
  else lancer();
}

// « Vos chiffres par mail » (13 octobre 2026) : la demande part à la fonction resultat-mail, qui envoie le mail et le PDF.
// En démonstration, rien ne part : on montre seulement le message de réussite.
function brancherRecevoir() {
  const f = $('[data-recevoir-form]'); const msg = $('[data-recevoir-message]'); if (!f) return;
  // Pour un solo, l'envoi ouvre aussi ce que Greatly propose aux indépendants (Arnaud, 15 octobre 2026, maquette) : le bouton
  // le dit, et la page « Un an dans un groupe » s'ouvre une fois la demande partie.
  const solo = /^#v\d+-s/.test(location.hash);
  // Et pour un manager : sa page « Pour vous / Pour votre équipe » (Arnaud, 15 octobre 2026 : « la même chose pour un manager »).
  const manager = /^#v\d+-g/.test(location.hash);
  const suite = solo ? '/groupe-independants.html?envoye' : manager ? '/groupe-managers.html?envoye' : null;
  // « et découvrir les solutions » retiré du bouton (Arnaud, 15 octobre 2026) : la proposition vient après l'envoi, dans la carte.
  // Le prénom passe par l'onglet, jamais par l'adresse.
  const ouvrir = (prenom) => { if (!suite) return; try { sessionStorage.setItem('edl_prenom', prenom); } catch (e) { /* sans stockage : merci sans prénom */ } location.href = suite; };
  f.addEventListener('submit', async (ev) => {
    ev.preventDefault(); const d = new FormData(f);
    const prenom = String(d.get('prenom') || '').trim(), nom = String(d.get('nom') || '').trim(), email = String(d.get('email') || '').trim();
    if (!prenom || !nom || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { msg.textContent = 'Il manque une information, ou l’adresse e-mail n’est pas valide.'; return; }
    if (d.get('accord') !== 'on') { msg.textContent = 'Cochez la case pour que nous puissions vous écrire.'; return; }
    if (String(d.get('site') || '')) return; // un robot
    // Le PDF se prépare après la réponse (Arnaud, 13 octobre 2026 : « on prépare le pdf et vous allez le recevoir dans quelques minutes »).
    // Après l'envoi, la carte se transforme (Arnaud, 15 octobre 2026 : « que l'intérieur de la carte évolue, pour demander s'il
    // veut voir les solutions qu'on peut lui proposer en fonction de ses chiffres, et renvoyer sur la landing ») : le merci, puis
    // la proposition, avec ses chiffres en rappel. Plus de redirection automatique : c'est la personne qui choisit.
    const merci = () => {
      const bloc = f.closest('[data-recevoir]') || f.parentElement;
      const fin = el('div', 'recevoir-suite');
      const gauche = el('div', 'recevoir-suite__merci');
      gauche.appendChild(el('span', 'etude-cours__sur', 'C’est envoyé'));
      const h = el('h2'); h.append(el('span', 'leger', 'Merci ' + prenom + ','), ' ', el('span', 'gras', 'votre PDF arrive.')); gauche.appendChild(h);
      gauche.appendChild(el('p', 'recevoir-suite__texte', 'Vous le recevrez dans votre boîte mail d’ici quelques minutes.'));
      fin.appendChild(gauche);
      if (suite) {
        const c = el('div', 'recevoir-suite__carte');
        c.appendChild(el('span', 'etude-cours__sur', 'Pour aller plus loin'));
        const h2 = el('h3'); h2.append(el('span', 'leger', 'Ce que nous pouvons'), ' ', el('span', 'gras', 'vous proposer.')); c.appendChild(h2);
        c.appendChild(el('p', 'recevoir-suite__texte', 'À partir de vos chiffres, des pistes pensées pour vous, à vivre à plusieurs à la Greatly House.'));
        const ch = el('div', 'recevoir-suite__chiffres');
        (afficher.chiffres || []).slice(0, 3).forEach((v) => { const x = el('div'); x.append(el('span', '', v.nom), el('b', '', v.lui == null ? '—' : String(v.lui))); x.lastChild.appendChild(el('small', '', ' /100')); ch.appendChild(x); });
        if (ch.children.length) c.appendChild(ch);
        const actions = el('div', 'recevoir-suite__actions');
        const go = el('button', 'recevoir-suite__cta'); go.type = 'button';
        go.innerHTML = '<span>Découvrir les solutions</span><i aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="#0C1011" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></i>';
        go.addEventListener('click', () => ouvrir(prenom));
        // Pas de « Plus tard » (Arnaud, 15 octobre 2026) : la croix de la fenêtre suffit pour fermer.
        actions.append(go); c.appendChild(actions);
        fin.appendChild(c);
      }
      bloc.replaceChildren(fin); bloc.classList.add('recevoir--envoye');
    };
    if (modeDemo()) { merci(); return; }
    const bouton = f.querySelector('button'); bouton.disabled = true; msg.textContent = 'Nous préparons votre PDF…';
    try {
      // La fonction resultat-mail (Supabase) enregistre la demande, fabrique le PDF depuis ce lien et l'envoie par Brevo.
      const r = await fetch(SUPABASE_URL + '/functions/v1/resultat-mail', { method: 'POST',
        headers: { apikey: SUPABASE_CLE, Authorization: 'Bearer ' + SUPABASE_CLE, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prenom, nom, email, accord: true, site: String(d.get('site') || ''), lien: location.href }) });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.ok) { merci(); return; }
      msg.textContent = j.error === 'Adresse invalide.' ? 'Cette adresse e-mail ne semble pas valide.' : 'L’envoi n’a pas abouti. Réessayez dans un instant.';
    } catch (e) { msg.textContent = 'L’envoi n’a pas abouti. Réessayez dans un instant.'; }
    bouton.disabled = false;
  });
}

// « Vos chiffres par mail » s'ouvre en fenêtre quand la lecture arrive sur « Comment lire ces chiffres » (Arnaud, 15 octobre
// 2026 : « beaucoup de monde ne voient pas le bloc »). C'est le vrai bloc, déplacé dans la fenêtre puis remis à sa place à la
// fermeture : le formulaire garde ce qu'on a tapé et son envoi. Jamais si le bloc est déjà à l'écran ou déjà envoyé, ni en PDF.
function fenetreMail() {
  const bloc = $('[data-recevoir]'); const note = $('[data-note]');
  if (!bloc || !note || !('IntersectionObserver' in window) || typeof HTMLDialogElement === 'undefined') return;
  if (document.documentElement.classList.contains('mode-pdf')) return;
  const visible = (x) => { const r = x.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; };
  let ouverte = false;
  const ouvrir = () => {
    ouverte = true;
    const place = document.createComment('recevoir');
    const d = el('dialog', 'fenetre-mail'); d.setAttribute('aria-label', 'Votre état des lieux par mail');
    const fermer = el('button', 'fenetre-mail__fermer', '×'); fermer.type = 'button'; fermer.setAttribute('aria-label', 'Fermer');
    bloc.before(place); d.append(fermer, bloc); document.body.appendChild(d);
    const rendre = () => { place.replaceWith(bloc); d.remove(); ouverte = false; };
    // Une sortie douce, comme l'arrivée (Arnaud, 15 octobre 2026 : « plus smooth, en mode apparition »).
    const partir = () => { if (d.classList.contains('fenetre-mail--sort')) return; d.classList.add('fenetre-mail--sort');
      setTimeout(() => d.close(), matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 260); };
    fermer.addEventListener('click', partir);
    d.addEventListener('click', (ev) => { if (ev.target === d) partir(); }); // un clic à côté ferme
    d.addEventListener('cancel', (ev) => { ev.preventDefault(); partir(); }); // Échap aussi, en douceur
    d.addEventListener('close', rendre);
    d.showModal(); fermer.focus({ focusVisible: false });
  };
  // Elle revient à chaque fois qu'on redescend sur la note, même après l'avoir fermée (Arnaud, 15 octobre 2026 : « si je la
  // ferme, je remonte et je redescends, elle doit réapparaître »). Seulement en descendant (la note arrive par le bas), et
  // plus du tout une fois les chiffres demandés.
  let dernierY = scrollY, descend = true;
  addEventListener('scroll', () => { if (scrollY !== dernierY) descend = scrollY > dernierY; dernierY = scrollY; }, { passive: true });
  const surVue = (entrees) => {
    const e = entrees.find((x) => x.isIntersecting); if (!e || ouverte) return;
    if (!descend) return; // on remonte : rien
    if (visible(bloc) || !bloc.querySelector('[data-recevoir-form] input') || $('[data-sans-resultat]:not([hidden])')) return;
    ouvrir();
  };
  new IntersectionObserver(surVue, { threshold: 0, rootMargin: '0px 0px -30% 0px' }).observe(note);
  // En bas de page, « Comment lire » n'atteint jamais le seuil ci-dessus : il déclenche dès qu'il est à moitié à l'écran.
  fenetreIO = new IntersectionObserver(surVue, { threshold: 0.5 });
  // Avec la nouvelle présentation, « Comment lire » est replié en bas des thèmes : c'est lui qui déclenche la fenêtre, en arrivant
  // en bas (Arnaud, 15 octobre 2026 : « quand j'arrive en bas, je veux toujours la pop-up pour le mail »).
  if ($('.nv-lire')) fenetreIO.observe($('.nv-lire'));
}
let fenetreIO = null;


// ------------------------------------------------------------- la présentation de la maquette (15 octobre 2026)
// Dans la lignée de l'accueil et du questionnaire (maquette _maquette-resultat-solo.html, validée par Arnaud, « pour toutes les
// catégories ») : un premier écran plein (son regard et ses cinq chiffres à gauche, ce que montre l'étude à droite), puis un thème
// par rangée avec les thèmes en colonne à gauche, « Comment lire » replié. À l'écran seulement : le PDF garde sa mise en page.
const FLECHE_BAS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M6 13l6 6 6-6"/></svg>';
function points10(p, classe) {
  const z = el('span', classe || 'nv-points'); const n = p == null ? 0 : p / 10;
  for (let k = 0; k < 10; k++) { const i = el('i', k < Math.floor(n) ? 'on' : (k < n ? 'demi' : '')); z.appendChild(i); }
  return z;
}
function nvRangs(v) {
  const rs = el('div', 'nv-rangs');
  [[v.a, v.a_nom, 'nv-rang--avec'], [v.b, v.b_nom, 'nv-rang--sans']].forEach(([p, nom, c]) => {
    const r = el('div', 'nv-rang ' + c); r.append(el('span', 'nv-rang__nom', nom), points10(p), el('b', '', pc(p))); rs.appendChild(r); });
  return rs;
}
function vueNouvelle({ solo, role, D_SUR, vue, t, mq }) {
  const racine = $('[data-resultat]'); if (!racine || !vue.length) return;
  // La note « Comment lire » est gardée avant de refaire la vue : afficher() passe deux fois (sans puis avec les chiffres de l'étude).
  const note = $('[data-note]');
  racine.querySelectorAll(':scope > .nv').forEach((x) => x.remove());
  document.documentElement.classList.add('nv-actif');
  const CINQ = ['Confiance', 'Soutien', 'Cohésion', 'Engagement', 'Performance'];
  const ids = ['confiance', 'soutien', 'cohesion', 'engagement', 'performance'];
  // 1. Le premier écran.
  const une = el('section', 'nv nv-une'); const cadre = el('div', 'nv-cadre nv-une__grille');
  const g = el('div', 'nv-une__texte');
  g.appendChild(el('span', 'nv-sur', 'Votre état des lieux'));
  const h = el('h1', 'nv-h1'); h.append(el('span', 'leger', solo ? 'Votre activité,' : 'Votre équipe,'));
  const gr = el('span', 'gras', 'telle que vous la '); gr.appendChild(el('span', 'nv-surligne', 'voyez.')); h.append(' ', gr); g.appendChild(h);
  const chapo = el('p', 'nv-chapo', 'Vos 16 réponses, thème par thème, à côté de celles des autres personnes qui ont répondu. C’est votre regard, pas une note.'); g.appendChild(chapo);
  compteur().then((n) => { if (n) chapo.textContent = 'Vos 16 réponses, thème par thème, à côté de celles de ' + n + ' personnes. C’est votre regard, pas une note.'; }).catch(() => {});
  const cinq = el('div', 'nv-cinq');
  vue.forEach((v, k) => { const c = el('a', 'nv-cinq__case'); c.href = '#nv-' + ids[k];
    const val = el('span', 'nv-cinq__val', v.lui == null ? '—' : String(v.lui)); val.appendChild(el('small', '', ' /100'));
    const tr = el('span', 'nv-cinq__trait'); const i = el('i'); i.style.width = (v.lui || 0) + '%'; tr.appendChild(i);
    c.append(el('span', 'nv-cinq__nom', CINQ[k] || v.nom), val, tr); cinq.appendChild(c); });
  g.appendChild(cinq);
  // Pas de lien « par mail » : la fenêtre s'ouvre d'elle-même en bas de page (Arnaud, 15 octobre 2026).
  const d = el('aside', 'nv-etude');
  d.appendChild(el('span', 'nv-sur nv-sur--bv', solo ? 'Ce que montrent les indépendants' : 'Ce que montre l’étude'));
  d.appendChild(el('p', 'nv-etude__phrase', 'Là où la confiance, le soutien et la cohésion sont réunis,'));
  if (t && mq && t.engages != null && mq.engages != null) {
    const gd = el('div', 'nv-etude__grand', pc(t.engages)); gd.appendChild(el('small', '', ' sont engagées')); d.appendChild(gd);
    d.appendChild(nvRangs({ a: t.engages, b: mq.engages, a_nom: 'Avec les trois réunis', b_nom: 'Avec un ou deux des trois' }));
    if (t.perf != null && mq.perf != null) d.appendChild(el('p', 'nv-etude__pied', 'Et elles atteignent plus souvent leurs objectifs : ' + pc(t.perf) + ' contre ' + pc(mq.perf) + '.'));
  } else d.appendChild(el('p', 'nv-etude__pied', solo ? 'Le chiffre des indépendants s’affiche ici dès que 3 d’entre eux au moins sont de chaque côté.' : 'Les chiffres de l’étude s’affichent ici dès qu’ils sont assez nombreux.'));
  // Partager son résultat (responsive, 16 octobre 2026) : le partage natif du téléphone quand il existe, sinon « Copier le lien ».
  const part = el('button', 'nv-partager'); part.type = 'button';
  part.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v13M7 8l5-5 5 5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5"/></svg><span>' + (navigator.share ? 'Partager mon état des lieux' : 'Copier le lien de mon état des lieux') + '</span>';
  part.addEventListener('click', async () => {
    const lien = location.href.replace(/[?&]demo=1/, '');
    try { if (navigator.share) { await navigator.share({ title: 'Mon état des lieux · Greatly', url: lien }); return; }
      await navigator.clipboard.writeText(lien); part.querySelector('span').textContent = 'Lien copié'; setTimeout(() => { part.querySelector('span').textContent = 'Copier le lien de mon état des lieux'; }, 2400);
    } catch (e) { /* partage annulé */ } });
  g.appendChild(part);
  cadre.append(g, d); une.appendChild(cadre);
  const desc = el('a', 'nv-descendre'); desc.href = '#nv-themes'; desc.innerHTML = '<span class="nv-descendre__fleche">' + FLECHE_BAS + '</span><span>Voir le détail</span>';
  une.appendChild(desc);
  // 2. Un thème par rangée, les thèmes en colonne à gauche.
  const th = el('section', 'nv nv-themes'); th.id = 'nv-themes';
  const grille = el('div', 'nv-cadre nv-themes__grille');
  const frise = el('nav', 'nv-frise'); frise.setAttribute('aria-label', 'Les thèmes');
  const contenu = el('div', 'nv-themes__contenu');
  const bt = el('h2', 'nv-bloc-titre'); bt.append(el('span', 'leger', 'Ce qui fonde'), ' ', el('span', 'gras', 'votre engagement.')); contenu.appendChild(bt);
  vue.forEach((v, k) => {
    const a = el('a', ''); a.href = '#nv-' + ids[k]; a.append(el('i'), document.createTextNode(v.nom)); frise.appendChild(a);
    if (v.suite && !vue[k - 1].suite) contenu.appendChild(el('p', 'nv-suite', 'Ce qui va avec'));
    const art = el('article', 'nv-theme'); art.id = 'nv-' + ids[k];
    const gauche = el('div', 'nv-theme__lui');
    gauche.append(el('span', 'nv-sur', 'Votre regard'), el('h3', 'nv-theme__nom', v.nom));
    const sc = el('div', 'nv-score'); sc.append(el('b', '', v.lui == null ? '—' : String(v.lui)), el('span', '', 'sur 100')); gauche.append(sc, points10(v.lui, 'nv-grandes'));
    if (k === 3) gauche.appendChild(el('p', 'nv-theme__note', 'Il grandit avec la confiance, le soutien et la cohésion.'));
    if (k === 4) gauche.appendChild(el('p', 'nv-theme__note', 'Elle suit quand les trois sont réunis.'));
    if (v.miens.length) { const m = el('div', 'nv-demande nv-demande--moi'); m.appendChild(el('span', 'nv-sur', 'Ce que vous demandez')); v.miens.forEach((x) => m.appendChild(el('p', '', '« ' + x + ' »'))); gauche.appendChild(m); }
    const droite = el('div', 'nv-carte');
    const tete = el('div', 'nv-carte__tete'); tete.appendChild(el('span', 'nv-sur', D_SUR));
    if (v.a != null && v.b != null) tete.appendChild(el('span', 'nv-ecart', (v.a - v.b >= 0 ? '+' : '') + (v.a - v.b) + ' points'));
    droite.appendChild(tete);
    if (v.phrase) droite.appendChild(el('p', 'nv-carte__phrase', v.phrase));
    if (v.attente) droite.appendChild(el('p', 'nv-carte__phrase', 'Le chiffre des indépendants s’affiche ici dès que 3 d’entre eux au moins sont de chaque côté.'));
    else if (v.a != null || v.b != null) droite.appendChild(nvRangs(v));
    if (v.dTexte) { const m = el('div', 'nv-demande'); m.appendChild(el('span', 'nv-sur', v.dTitre)); m.appendChild(el('p', '', '« ' + v.dTexte + ' »')); droite.appendChild(m); }
    art.append(gauche, droite); contenu.appendChild(art);
  });
  // « Comment lire ces chiffres », replié : la note de la page, déplacée telle quelle.
  if (note) { const det = el('details', 'nv-lire'); const sum = el('summary');
    const t2 = el('span'); t2.append(el('span', 'leger', 'Comment lire'), ' ', el('span', 'gras', 'ces chiffres')); sum.append(t2, el('span', 'nv-lire__plus', '+'));
    det.append(sum, note); contenu.appendChild(det); if (fenetreIO) fenetreIO.observe(det); }
  grille.append(frise, contenu); th.appendChild(grille);
  racine.prepend(une, th);
  const recevoir = $('[data-recevoir]'); if (recevoir) recevoir.id = 'nv-recevoir';
  // La colonne suit la lecture.
  const liens = [...frise.querySelectorAll('a')]; const arts = [...contenu.querySelectorAll('.nv-theme')];
  const suivre = () => { let k = 0; arts.forEach((x, i) => { if (x.getBoundingClientRect().top < innerHeight * 0.45) k = i; }); liens.forEach((x, i) => { x.classList.toggle('actif', i === k); x.classList.toggle('fait', i < k); }); };
  addEventListener('scroll', suivre, { passive: true }); suivre();
  // Découvrir son résultat (téléphone) : les chiffres se dessinent l'un après l'autre, puis les mots arrivent (Val Head ; socle,
  // « trois moments »). Une seule fois par page ; rien si l'on préfère moins de mouvement.
  if (matchMedia('(max-width: 1100px)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches && !vueNouvelle.anime) {
    vueNouvelle.anime = true; document.documentElement.classList.add('nv-anime');
    cinq.querySelectorAll('.nv-cinq__val').forEach((v, i) => { const t = v.firstChild; const cible = Number(t.nodeValue); if (!Number.isFinite(cible)) return;
      const t0 = performance.now() + 250 + i * 160; t.nodeValue = '0';
      const pas = (now) => { const x = Math.max(0, Math.min(1, (now - t0) / 700)); t.nodeValue = String(Math.round(cible * (1 - Math.pow(1 - x, 3)))); if (x < 1) requestAnimationFrame(pas); };
      requestAnimationFrame(pas); });
    requestAnimationFrame(() => requestAnimationFrame(() => document.documentElement.classList.add('nv-anime--go')));
  }
}

async function demarrer() {
  // En PDF, la date du jour à côté de « État des lieux », comme sur un document.
  if (document.documentElement.classList.contains('mode-pdf') && $('[data-pdf-date]'))
    $('[data-pdf-date]').textContent = ' · ' + new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' });
  const contenu = await chargerContenu();
  const lu = decoder(location.hash, contenu);
  if (!lu) { $('[data-sans-resultat]').hidden = false; return; }
  memoriserResultat(location.href);
  $('[data-resultat]').hidden = false;
  afficher(lu, contenu, null);
  brancherGarder();
  brancherEtude();
  brancherRecevoir();
  fenetreMail();
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
  // Jamais une idée retirée dans « Ce que demandent les autres » (Arnaud, 15 octobre 2026, profil solo recentré).
  afficher.souhaits = (souhaits || []).filter((x) => ideeActive(contenu, x.n, x.role, x.choix));
  if (these) afficher(lu, contenu, these);
}

window.addEventListener('hashchange', () => location.reload());
demarrer();
