/**
 * Le PDF de l'état des lieux, en magazine (Arnaud, 13 octobre 2026 : « le niveau d'un magazine de déco haut de gamme »).
 *
 * Remplit rapport.html avec les mêmes chiffres que la page de résultat : ses réponses viennent du lien, ceux de l'étude
 * de edl_these (un solo ne voit que des indépendants, seuil-solo.js). Quand tout est posé et les polices chargées, la
 * page met data-pret sur <body> : c'est le signal qu'attend Browserless avant d'imprimer. Tout le texte en textContent.
 * Paramètres : ?prenom=… (pour la couverture), ?demo=1 (chiffres de la maquette).
 */
import { chargerContenu } from '../contenu.js?v=76';
import { decoder } from '../lien.js?v=76';
import { compteur } from '../api.js?v=76';
import { SUPABASE_URL, SUPABASE_CLE, modeDemo } from '../config.js?v=76';
import { chiffresPourSolo } from '../seuil-solo.js?v=76';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const el = (balise, classe, texte) => { const n = document.createElement(balise); if (classe) n.className = classe; if (texte != null) n.textContent = texte; return n; };
const pc = (p) => (p == null ? '—' : p + ' %');

// Les mêmes thèmes que la page de résultat (resultat-these.js), dans le même ordre.
const MOTS = [
  { cle: 'confiance', nom: 'La confiance', aff: [11, 12], avec: 'Avec la confiance', sans: 'Avec moins de confiance', la: 'Là où la confiance est là, ', manque: 'Là où elle est moins présente, ' },
  { cle: 'soutien', nom: 'Le soutien', aff: [10, 13], avec: 'Avec du soutien', sans: 'Avec moins de soutien', la: 'Là où on se sent soutenu, ', manque: 'Là où il est moins présent, ' },
  { cle: 'cohesion', nom: 'La cohésion', aff: [1, 2, 5, 6], avec: 'Avec la cohésion', sans: 'Avec moins de cohésion', la: 'Là où l’équipe est soudée, ', manque: 'Là où elle est moins présente, ' },
];
// Les mots de chaque rôle : couverture, pages, et qui « demande » quoi : chacun ne lit que son propre profil (15 octobre 2026).
// « Votre équipe » une seule fois en tête de la page du regard : le surtitre dit « Votre regard » (Arnaud, 15 octobre 2026).
const MOTS_ROLE = {
  manager: { leger: 'Votre équipe,', role: 'En encadrant une équipe', regardSur: 'Votre regard de manager', regardLeger: 'Telle que vous la voyez,', regardGras: 'votre équipe.',
    chapo: 'Votre regard de manager sur votre équipe, thème par thème, ramené à 100. Ce n’est pas une note : c’est ce que vous voyez.',
    themesSur: 'Votre équipe, et toute l’étude', ideeTetiere: 'Ce que montre l’étude', suite: ['des personnes', 'sont engagées.'],
    envies: 'Ce que vous aimeriez voir grandir dans votre équipe,', regard: 'C’est votre regard de manager, pas une note.',
    compte: 'Ce sont les réponses des managers et des équipes qui ont répondu, sans les indépendants. Un groupe de moins de 3 personnes n’affiche pas de chiffre. Ces chiffres montrent un lien entre les thèmes et l’engagement : à eux seuls, ils ne prouvent pas une cause.',
    demandesTitre: 'Ce que demandent les autres managers', demandes: [['manager', null]] },
  membre: { leger: 'Votre équipe,', role: 'Au sein d’une équipe', regardSur: 'Votre regard', regardLeger: 'Telle que vous la voyez,', regardGras: 'votre équipe.',
    chapo: 'Votre regard sur votre équipe, thème par thème, ramené à 100. Ce n’est pas une note : c’est ce que vous vivez.',
    themesSur: 'Votre équipe, et toute l’étude', ideeTetiere: 'Ce que montre l’étude', suite: ['des personnes', 'sont engagées.'],
    envies: 'Ce que vous aimeriez voir grandir dans votre équipe,', regard: 'C’est votre regard sur votre équipe, pas une note.',
    compte: 'Ce sont les réponses des équipes et des managers qui ont répondu, sans les indépendants, et jamais les vôtres seules. Un groupe de moins de 3 personnes n’affiche pas de chiffre. Ces chiffres montrent un lien entre les thèmes et l’engagement : à eux seuls, ils ne prouvent pas une cause.',
    demandesTitre: 'Ce que demandent les autres membres d’équipe', demandes: [['membre', null]] },
  solo: { leger: 'Votre activité,', role: 'En solo ou en profession libérale', regardSur: 'Votre regard', regardLeger: 'Votre activité,', regardGras: 'telle que vous la voyez.',
    chapo: 'Votre regard sur votre activité et vos partenaires, thème par thème, ramené à 100. Ce n’est pas une note : c’est ce que vous vivez.',
    themesSur: 'Vous, et les autres indépendants', ideeTetiere: 'Ce que montrent les indépendants', suite: ['des indépendants', 'sont engagés.'],
    envies: 'Ce que vous aimeriez voir grandir dans votre activité,', regard: 'C’est votre regard sur votre activité, pas une note.',
    gittell: 'Elle a étudié pendant des années comment des personnes aux métiers différents avancent ensemble, d’abord dans les escales de compagnies aériennes, puis dans les hôpitaux. Pour vous, ce sont vos clients, vos sous-traitants et votre collectif d’indépendants.',
    compte: 'Ce sont les réponses des autres indépendants. Un groupe de moins de 3 personnes n’affiche pas de chiffre. Ces chiffres montrent un lien entre les thèmes et l’engagement : à eux seuls, ils ne prouvent pas une cause.',
    demandesTitre: 'Ce que demandent les autres indépendants', demandes: [['solo', null, 3]] },
};
const DEMO = { n: 412, intensites: {}, groupes: { toutes: { n: 240, engages: 86, perf: 71 }, manque: { n: 172, engages: 52, perf: 44 },
  confiance_avec: { n: 292, engages: 84 }, confiance_sans: { n: 120, engages: 49 }, soutien_avec: { n: 292, engages: 82 }, soutien_sans: { n: 120, engages: 55 },
  cohesion_avec: { n: 272, engages: 85 }, cohesion_sans: { n: 140, engages: 53 } }, questions: {} };

function pastilles(p, style) {
  const b = el('span', 'pts' + (style ? ' pts--' + style : '')); const v = Math.max(0, Math.min(100, p || 0));
  for (let i = 0; i < 10; i++) { const f = Math.max(0, Math.min(10, v - i * 10)) * 10; const d = el('i', f >= 100 ? 'on' : '');
    if (f > 0 && f < 100) { const r = el('b'); r.style.width = f + '%'; d.appendChild(r); } b.appendChild(d); }
  return b;
}
function ligne(nom, p, sans) {
  const l = el('div', 'ligne' + (sans ? ' ligne--sans' : '')); const rail = el('span', 'ligne__rail'); const b = el('b'); b.style.width = (p || 0) + '%'; rail.appendChild(b);
  l.append(el('span', '', nom), rail, el('span', 'ligne__val', pc(p))); return l;
}
const ecart = (a, b) => el('span', 'ecart', (a - b >= 0 ? '+' : '') + (a - b) + ' points');

async function appel(fn, corps) {
  const r = await fetch(SUPABASE_URL + '/rest/v1/rpc/' + fn, { method: 'POST', headers: { apikey: SUPABASE_CLE, Authorization: 'Bearer ' + SUPABASE_CLE, 'Content-Type': 'application/json' }, body: JSON.stringify(corps || {}) });
  return r.ok ? r.json() : null;
}
async function lireThese(role) {
  if (modeDemo()) return role === 'solo' ? chiffresPourSolo(null) : DEMO;
  try { let d = await appel('edl_these', { p_role: role }).catch(() => null); if (!d || !d.ok) d = await appel('edl_these', {});
    if (!d || !d.ok) return null; return role === 'solo' ? chiffresPourSolo(d) : d; } catch (e) { return null; }
}
async function lireSouhaits() {
  if (modeDemo()) return [];
  try { const d = await appel('edl_souhaits', {}); return d && d.ok ? d.souhaits : []; } catch (e) { return []; }
}

// « Il faudrait que mon manager… » : le début de la relance et le choix, comme sur la page.
function voeu(rel, i) { const t = rel && rel.choix[i]; if (!t) return null; const d = (rel.debut || '').replace(/…$/, '').trim();
  return d && d !== 'J\'aimerais' ? d + ' ' + t.charAt(0).toLowerCase() + t.slice(1) : t; }

function remplir(lu, contenu, T, souhaits, total) {
  const rep = lu.reponses; const solo = lu.role === 'solo'; const G = (T && T.groupes) || {};
  const sur100 = (aff) => { const v = aff.map((n) => rep[n - 1]).filter((x) => x != null); return v.length ? Math.round(v.reduce((x, y) => x + Number(y), 0) / (3 * v.length) * 100) : null; };
  const eng = (k) => (G[k] && G[k].engages != null ? G[k].engages : null);
  const t = G.toutes, mq = G.manque;

  // La marque partout, avec le soleil.
  const soleil = () => $('[data-soleil]').content.cloneNode(true);
  $$('[data-marque]').forEach((m) => m.appendChild(soleil()));
  $('[data-soleil-grand]').appendChild(soleil());
  const date = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' });
  $('[data-date]').textContent = date;
  const prenom = (new URLSearchParams(location.search).get('prenom') || '').trim().slice(0, 60);
  $('[data-pour]').textContent = (prenom ? 'Préparé pour ' + prenom + ' · ' : '') + date;

  // Les mots de chaque rôle (Arnaud, 13 octobre 2026 : « le pdf doit être adapté aux solopreneurs, aux managers ou aux
  // équipes dans les wordings »). Un solo parle de son activité, jamais d'équipe ; un manager, de l'équipe qu'il encadre ;
  // un membre, de son équipe. Les chiffres d'un solo sont ceux des indépendants, ceux d'une équipe toute l'étude sans solo.
  const W = MOTS_ROLE[lu.role] || MOTS_ROLE.membre;
  $('[data-couv-leger]').textContent = W.leger;
  $('[data-couv-role]').textContent = W.role;
  $('[data-regard-sur]').textContent = W.regardSur; $('[data-regard-leger]').textContent = W.regardLeger; $('[data-regard-gras]').textContent = W.regardGras;
  $('[data-regard-chapo]').textContent = W.chapo;
  $('[data-themes-sur]').textContent = W.themesSur;
  $('[data-idee-tetiere]').textContent = '01 · ' + W.ideeTetiere;
  $('[data-envies-leger]').textContent = W.envies;
  $('[data-lire-compte]').textContent = W.compte;
  // Pour un solo, ses partenaires à la place des métiers d'une escale (Arnaud, 15 octobre 2026, audit des wordings).
  if (W.gittell) $('[data-gittell-qui]').textContent = W.gittell;
  $('[data-lire-gauche]').textContent = $('[data-lire-gauche]').textContent.replace('C’est votre regard, pas une note.', W.regard);

  // 2. L'idée : la thèse en très grand, puis les deux barres, puis les deux comptes.
  if (t && mq && t.engages != null && mq.engages != null) {
    $('[data-idee-chiffre]').textContent = pc(t.engages);
    $('[data-idee-suite]').replaceChildren(document.createTextNode(W.suite[0]), el('br'), document.createTextNode(W.suite[1]));
    $('[data-idee-ailleurs]').textContent = 'Avec un ou deux des trois, ' + pc(mq.engages) + '.' + (t.perf != null && mq.perf != null ? ' Et elles atteignent plus souvent leurs objectifs : ' + pc(t.perf) + ' contre ' + pc(mq.perf) + '.' : ''); // (Arnaud, 15 octobre 2026, audit des wordings)
    const hB = $('[data-idee-barres]');
    [['L’engagement', t.engages, mq.engages], ['La performance', t.perf, mq.perf]].forEach(([nom, a, b]) => { if (a == null || b == null) return;
      const c = el('div', 'barre'); const tt = el('div', 'barre__tete'); tt.append(el('span', '', nom), ecart(a, b));
      c.append(tt, ligne('Les trois réunis', a), ligne('Avec un ou deux des trois', b, true)); hB.appendChild(c); });
  } else {
    $('[data-idee-chiffre]').textContent = '';
    $('[data-idee-ailleurs]').textContent = solo ? 'Le chiffre des indépendants s’affiche ici dès que 3 d’entre eux au moins sont de chaque côté.' : '';
  }
  $('[data-n-rep]').textContent = String(rep.length);
  rep.forEach((v) => $('[data-points-rep]').appendChild(el('i', 'r' + Math.max(0, Math.min(3, Number(v) || 0)))));
  if (total > 0) {
    $('[data-n-etude]').textContent = total.toLocaleString('fr-FR');
    const par = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000].find((x) => total / x <= 400) || Math.ceil(total / 400);
    for (let i = 0; i < Math.ceil(total / par); i++) $('[data-points-etude]').appendChild(el('i'));
    $('[data-legende-etude]').textContent = par === 1 ? 'Chaque point, une personne.' : 'Chaque point, ' + par + ' personnes.';
  }

  // 3. Votre regard : cinq thèmes sur 100.
  const SCORES = [...MOTS.map((m) => [m.nom, sur100(m.aff)]), null, ['L’engagement', sur100([14, 15])], ['La performance', sur100([16])]];
  const hS = $('[data-scores]');
  SCORES.forEach((s) => { if (!s) { hS.appendChild(el('li', 'scores__fleche', '↓ Ce qui va avec')); return; }
    const li = el('li', 'score'); const v = el('span', 'score__val', s[1] == null ? '—' : String(s[1])); v.appendChild(el('small', '', '/100'));
    li.append(el('span', 'score__nom', s[0]), pastilles(s[1], 'vif'), v); hS.appendChild(li); });

  // 4-5. Thème par thème : à gauche lui, à droite l'étude, et ce qu'on demande.
  const vosVoeux = (affs) => { const l = []; affs.forEach((n) => { const rel = contenu.affirmations[n - 1] && contenu.affirmations[n - 1].relance && contenu.affirmations[n - 1].relance[lu.role];
    ((lu.relances || {})[n] || []).forEach((i) => { if (i === 'autre') return; const v = voeu(rel, i); if (v && !l.includes(v)) l.push(v); }); }); return l.slice(0, 2); };
  const leurVoeu = (role, affs, mini) => { const s = (souhaits || []).filter((x) => x.role === role && affs.includes(x.n) && (!mini || x.choisis >= mini)).sort((a, b) => b.p - a.p || b.choisis - a.choisis)[0];
    return s ? voeu(contenu.affirmations[s.n - 1].relance[role], s.choix) : null; };
  const THEMES = [
    ...MOTS.map((m) => ({ nom: m.nom, affs: m.aff, a: eng(m.cle + '_avec'), b: eng(m.cle + '_sans'), an: m.avec, bn: m.sans,
      these: (a, b) => (solo && m.cle !== 'confiance' ? (m.cle === 'soutien' ? 'Là où le soutien est là, ' : 'Là où la cohésion est là, ') : m.la) + pc(a) + ' des personnes sont engagées. ' + m.manque + pc(b) + '.' })),
    { nom: 'L’engagement', affs: [14, 15], a: eng('toutes'), b: eng('manque'), an: 'Les trois réunis', bn: 'Avec un ou deux des trois',
      these: (a, b) => 'Là où les trois sont réunis, ' + pc(a) + ' des personnes sont engagées. Avec un ou deux des trois, ' + pc(b) + '.' },
    { nom: 'La performance', affs: [16], a: t ? t.perf : null, b: mq ? mq.perf : null, an: 'Les trois réunis', bn: 'Avec un ou deux des trois',
      these: (a, b) => 'Là où les trois sont réunis, ' + pc(a) + ' atteignent leurs objectifs. Avec un ou deux des trois, ' + pc(b) + '.' },
  ];
  THEMES.forEach((th, k) => {
    const c = el('article', 'theme'); const g = el('div', 'theme__gauche'); const d = el('div', 'theme__droite');
    const v = sur100(th.affs); const sc = el('p', 'theme__score', v == null ? '—' : String(v)); sc.appendChild(el('small', '', '/100'));
    g.append(el('span', 'theme__num', String(k + 1).padStart(2, '0')), el('h3', 'theme__nom', th.nom), el('span', 'theme__vous', 'Votre regard'), sc, pastilles(v));
    const mes = vosVoeux(th.affs);
    if (mes.length) { const b = el('div', 'demandes theme__vos'); b.appendChild(el('span', 'demandes__titre', 'Ce que vous demandez')); mes.forEach((x) => b.appendChild(el('p', 'demande', '« ' + x + ' »'))); g.appendChild(b); }
    if (th.a != null && th.b != null) {
      const p = el('p', 'theme__these', th.these(th.a, th.b)); p.appendChild(ecart(th.a, th.b)); d.appendChild(p);
      const r = el('div', 'theme__rangs'); r.append(ligne(th.an, th.a), ligne(th.bn, th.b, true)); d.appendChild(r);
    } else d.appendChild(el('p', 'theme__these', solo ? 'Le chiffre des indépendants s’affiche ici dès que 3 d’entre eux au moins sont de chaque côté.' : 'Pas encore assez de réponses pour un chiffre.'));
    const lignes = W.demandes.map(([role, qui, mini]) => [leurVoeu(role, th.affs, mini), qui]);
    if (lignes.some(([x]) => x)) { const b = el('div', 'demandes'); b.appendChild(el('span', 'demandes__titre', W.demandesTitre));
      lignes.forEach(([x, qui]) => { if (!x) return; const l = el('p', 'demande'); if (qui) l.appendChild(el('strong', '', qui)); l.appendChild(document.createTextNode('« ' + x + ' »')); b.appendChild(l); }); d.appendChild(b); }
    c.append(g, d); $(k < 3 ? '[data-themes-1]' : '[data-themes-2]').appendChild(c);
  });

  // 6. Vos envies : ses idées cochées, et ce qui se passe là où c'est déjà le cas. Sans envie, pas de page.
  const Q = (T && T.questions) || {}; const envies = [];
  Object.keys(lu.relances || {}).forEach((k) => { const n = Number(k); if ([3, 4, 7, 8].includes(n)) return;
    const rel = contenu.affirmations[n - 1] && contenu.affirmations[n - 1].relance && contenu.affirmations[n - 1].relance[lu.role];
    (lu.relances[k] || []).forEach((i) => { if (i === 'autre') return; const v = voeu(rel, i); if (!v || envies.some((e) => e.v === v)) return;
      const q = Q[k]; const perf = n >= 14; const a = q ? (perf ? q.avec.perf : q.avec.engages) : null, b = q ? (perf ? q.sans.perf : q.sans.engages) : null;
      envies.push({ v, a, b, perf }); }); });
  if (envies.length) {
    envies.slice(0, 6).forEach((e) => { const c = el('div', 'envie'); c.appendChild(el('p', 'envie__voeu', e.v));
      if (e.a != null && e.b != null) { const p = el('p', 'envie__phrase', 'Là où c’est déjà le cas, '); p.append(el('strong', '', pc(e.a)), document.createTextNode(' ' + (e.perf ? 'atteignent leurs objectifs' : 'se disent engagés') + ', contre ' + pc(e.b) + ' ailleurs.')); c.appendChild(p); }
      $('[data-envies]').appendChild(c); });
  } else { $('[data-page-envies]').remove(); $('[data-folio-lire]').textContent = '6'; }
}

async function demarrer() {
  const contenu = await chargerContenu();
  const lu = decoder(location.hash, contenu);
  if (!lu) { $('[data-sans-resultat]').hidden = false; document.body.dataset.pret = '1'; return; }
  const [T, souhaits, total] = await Promise.all([lireThese(lu.role), lireSouhaits(), modeDemo() ? Promise.resolve(294) : compteur().catch(() => 0)]);
  remplir(lu, contenu, T, souhaits, total);
  $('[data-rapport]').hidden = false;
  await Promise.all([document.fonts.ready, ...[...document.images].map((i) => (i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; })))]);
  document.body.dataset.pret = '1';
}
demarrer();
