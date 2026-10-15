/**
 * Le rôle solo (13 octobre 2026) : profil, lien, envoi, calcul des fondations, retouche des maquettes.
 * Les tests manager et membre existants ne changent pas.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { encoder, decoder, rolesConnus } from '../docs/assets/js/lien.js';
import { relancesAEnvoyer } from '../docs/assets/js/calcul.js';
import { codesActifs } from '../docs/assets/js/contenu.js';
import { retoucher } from '../scripts/solo-maquette.mjs';

const contenu = JSON.parse(readFileSync(new URL('../docs/assets/data/contenu.json', import.meta.url), 'utf8'));
const REP = [2, 2, 1, 1, 2, 2, 1, 1, 1, 0, 1, 2, 1, 2, 3, 3];

describe('solo : profil', () => {
  test('trois rôles explicites, dans l’ordre de la maquette', () => {
    assert.deepEqual(contenu.profil.role.cles, ['manager', 'membre', 'solo']);
    assert.equal(contenu.profil.role.question, 'Vous travaillez');
    assert.deepEqual(contenu.profil.role.libelles, ['En encadrant une équipe', "Au sein d'une équipe", 'En solo ou en profession libérale']);
    assert.equal(contenu.profil.role.choix[2], 'En solo ou en profession libérale');
  });
  test('les valeurs enregistrées pour manager et membre ne changent pas', () => {
    assert.equal(contenu.profil.role.choix[0], 'Le manager');
    assert.equal(contenu.profil.role.choix[1], "Un membre de l'équipe");
  });
  test('la taille d’équipe n’est pas demandée à un solo', () => {
    assert.equal(contenu.profil.taille_equipe.sauf_role, 'solo');
  });
});

describe('solo : lien personnel', () => {
  test('le rôle solo est connu', () => assert.ok(rolesConnus().includes('solo')));
  test('un lien solo prend la lettre s et se relit', () => {
    const jeton = encoder('solo', REP, { 10: [0] });
    assert.match(jeton, /^v2-s2211221110121233-10\.0$/);
    const lu = decoder('#' + jeton, contenu);
    assert.equal(lu.role, 'solo');
    assert.deepEqual(lu.reponses, REP);
    assert.deepEqual(lu.relances, { 10: [0] });
  });
  test('les anciens liens ouvrent le même résultat qu’avant', () => {
    const anciens = [
      ['#v1-m2211221102120233', 'membre', [2, 2, 1, 1, 2, 2, 1, 1, 0, 2, 1, 2, 0, 2, 3, 3], {}],
      ['#v1-g3333333333333333', 'manager', Array(16).fill(3), {}],
      ['#v2-m2211221110121233-9.0-10.02-11.1-13.0', 'membre', REP, { 9: [0], 10: [0, 2], 11: [1], 13: [0] }],
      ['#v2-g0000000000000000-1.0a', 'manager', Array(16).fill(0), { 1: [0, 'autre'] }],
    ];
    for (const [hash, role, reponses, relances] of anciens) {
      const lu = decoder(hash, contenu);
      assert.ok(lu, hash);
      assert.equal(lu.role, role, hash);
      assert.deepEqual(lu.reponses, reponses, hash);
      assert.deepEqual(lu.relances, relances, hash);
    }
  });
  test('une idée solo hors de sa liste est refusée par le lien', () => {
    const n11 = contenu.affirmations[10].relance.solo.choix.length; // 4 choix : l’indice 4 n’existe pas
    const lu = decoder(`#v2-s${REP.join('')}-11.${n11}`, contenu);
    assert.deepEqual(lu.relances, {});
  });
});

describe('solo : envoi', () => {
  test('les idées solo partent comme celles des autres rôles', () => {
    assert.deepEqual(relancesAEnvoyer(REP, { 10: [0], 16: [1] }, contenu), { 10: [0] }); // 16 vaut 3 : pas d’idée
  });
});

describe('solo : contenus', () => {
  test('les phrases du profil recentré (15 octobre 2026)', () => {
    assert.equal(contenu.affirmations[0].solo, "J'ai un collectif de pros qui compte pour moi.");
    assert.equal(contenu.affirmations[9].solo, "Avant une décision importante, j'ai quelqu'un avec qui en parler.");
    assert.equal(contenu.affirmations[15].solo, 'Mon activité atteint les objectifs que je me fixe.');
  });
  test('chaque idée garde son code : les anciennes restent à leur place, les nouvelles viennent après', () => {
    // Le nombre d'idées connues avant le 15 octobre 2026 (migration 35) : ces codes ne changent jamais de texte.
    const avant = { 1: 5, 2: 4, 3: 5, 4: 5, 5: 4, 6: 5, 7: 6, 8: 5, 9: 5, 10: 4, 11: 4, 12: 4, 13: 5, 14: 4, 15: 4, 16: 5 };
    for (const a of contenu.affirmations) assert.ok(a.relance.solo.choix.length >= avant[a.n], 'idées ' + a.n);
    assert.equal(contenu.affirmations[6].relance.solo.choix[5], 'Fixer mes prix plus sereinement'); // retirée, pas réutilisée
    assert.equal(contenu.affirmations[1].relance.solo.choix[1], 'Mieux cadrer le travail avec mes sous-traitants');
  });
  test('un code tient en un chiffre dans le lien : 10 idées au plus par phrase', () => {
    for (const a of contenu.affirmations) assert.ok(a.relance.solo.choix.length <= 10, 'idées ' + a.n);
  });
  test('16 phrases solo, aux mêmes numéros', () => {
    assert.equal(contenu.affirmations.length, 16);
    contenu.affirmations.forEach((a, k) => { assert.equal(a.n, k + 1); assert.ok(a.solo && a.solo.length > 10, 'phrase ' + a.n); });
  });
  test('4 ou 5 idées proposées par phrase, marquées à valider', () => {
    for (const a of contenu.affirmations) {
      const r = a.relance.solo;
      const act = codesActifs(r);
      assert.ok(act.length >= 4 && act.length <= 5, 'idées ' + a.n);
      assert.equal(new Set(act).size, act.length, 'doublon ' + a.n);
      assert.equal(r.a_valider, true);
    }
  });
  test('ce qu’un solo lit ne parle plus de gestion, ni au masculin seul (15 octobre 2026)', () => {
    const lus = contenu.affirmations.flatMap((a) => [a.solo, a.groupe_solo, ...codesActifs(a.relance.solo).map((i) => a.relance.solo.choix[i])])
      .concat(Object.keys(contenu.pourquoi_solo), Object.values(contenu.pourquoi_solo));
    for (const t of lus) {
      assert.doesNotMatch(t, /client|sous-traitant|trésorerie|agenda|prix|tarif/i, t);
      assert.doesNotMatch(t, /\b(Être|être) \p{L}+é\b|\b(engagé|bloqué|débordé|soutenu|aidé|sollicité|recommandé)\b/u, t);
    }
  });
  test('règles d’écriture : pas de tiret d’incise, pas de mots interdits', () => {
    const textes = contenu.affirmations.flatMap((a) => [a.solo, a.groupe_solo, ...a.relance.solo.choix]).concat(Object.values(contenu.pourquoi_solo));
    for (const t of textes) {
      assert.doesNotMatch(t, /[—–]/, t);
      assert.doesNotMatch(t, /\b(expérience|expert|cohorte|promotion|bilan|pairs?)\b|des gens/i, t);
      assert.doesNotMatch(t, /\b(équipe|manager|collègues?)\b/i, t); // un solo ne lit jamais ces mots
    }
  });
  test('les fondations de la thèse ne changent pas', () => {
    assert.deepEqual(contenu.fondations, { confiance: [11, 12], soutien: [10, 13], cohesion: [1, 2, 5, 6], engagement: [14, 15] });
  });
});

describe('solo : retouche des maquettes', () => {
  const avant = 'const r={profil:{tailles:[]}},z=r.profil.tailles,t=this.state||{},i=t.role===0?"manager":"membre",m=1;n.continuer=()=>{const e=[];t.teq>=0||e.push("x")}';
  test('trois retouches, puis plus rien', () => {
    const a = retoucher(avant);
    assert.equal(a.etat, 'retouché');
    assert.match(a.source, /window\.__edlSolo\(r,t\)/);
    assert.match(a.source, /\["manager","membre","solo"\]\[t\.role\]/);
    assert.match(a.source, /t\.teq>=0\|\|t\.role===2\|\|e\.push/);
    assert.equal(retoucher(a.source).etat, 'déjà fait');
  });
  test('un fichier sans parcours n’est pas touché', () => {
    assert.equal(retoucher('const x=1').etat, 'pas concerné');
  });
});

describe('solo : taille d’équipe (corrections 14)', () => {
  test('le modèle ne dessine le bloc taille d’équipe que si avecEquipe', async () => {
    const { retoucherModele } = await import('../scripts/solo-maquette.mjs');
    const modele = '[["div",{"style":"a"},[["h2",{},["Votre rôle"]]]],["div",{"style":"b"},[["div",{},[["h2",{},["Taille de votre équipe (nombre de personnes)"]]]],["div",{},[{"pour":"equipes","comme":"p","e":[["button",{},["{{p.lab}}"]]]}]]]]]';
    const r = retoucherModele(modele);
    assert.equal(r.etat, 'retouché');
    assert.ok(r.source.includes('{"si":"avecEquipe","e":[["div",{"style":"b"}'));
    assert.ok(r.source.includes('["h2",{},["Votre rôle"]]'), 'le reste ne bouge pas');
    assert.equal(retoucherModele(r.source).etat, 'déjà fait');
  });
  test('la logique calcule avecEquipe, et choisir solo efface la taille d’équipe', () => {
    const avant = 'const r={profil:{tailles:[],equipes:[]}},z=r.profil.tailles,t=this.state||{},i=t.role===0?"manager":"membre",m=1;n.roles=j("role",r.profil.roles),n.equipes=j("teq",r.profil.equipes);n.continuer=()=>{const e=[];t.teq>=0||e.push("x")}';
    const s = retoucher(avant).source;
    assert.match(s, /n\.avecEquipe=t\.role!==2/);
    assert.match(s, /n\.roles\[2\]\.pick=\(\)=>this\.setState\(\{role:t\.role===2\?-1:2,teq:-1,msg:""\}\)/);
  });
  test('un solo envoie une taille d’équipe vide, manager et membre gardent la leur', () => {
    const src = readFileSync(new URL('../docs/assets/js/parcours/pont-site.js', import.meta.url), 'utf8');
    assert.match(src, /taille_equipe: role === 'solo' \? '' : choix\(P\.taille_equipe\.choix, st\.teq\)/);
  });
});

describe('solo : uniquement des chiffres d’indépendants', () => {
  test('un solo ne reçoit jamais les chiffres d’un autre rôle', async () => {
    const { chiffresPourSolo, VIDE_SOLO } = await import('../docs/assets/js/seuil-solo.js');
    assert.equal(chiffresPourSolo({ role: 'equipes', n: 300 }), VIDE_SOLO);
    assert.equal(chiffresPourSolo(null), VIDE_SOLO);
    const d = { role: 'solo', n: 5 }; assert.equal(chiffresPourSolo(d), d);
  });
  test('une case s’affiche dès 3 indépendants, pas avant', async () => {
    const { caseSolo } = await import('../docs/assets/js/seuil-solo.js');
    assert.equal(caseSolo({ n: 2, engages: null }), false);
    assert.equal(caseSolo({ n: 3, engages: 67 }), true);
    assert.equal(caseSolo(undefined), false);
  });
});
