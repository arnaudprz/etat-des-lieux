/**
 * Le rôle solo (13 octobre 2026) : profil, lien, envoi, calcul des fondations, retouche des maquettes.
 * Les tests manager et membre existants ne changent pas.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { encoder, decoder, rolesConnus } from '../docs/assets/js/lien.js';
import { relancesAEnvoyer } from '../docs/assets/js/calcul.js';
import { retoucher } from '../scripts/solo-maquette.mjs';

const contenu = JSON.parse(readFileSync(new URL('../docs/assets/data/contenu.json', import.meta.url), 'utf8'));
const REP = [2, 2, 1, 1, 2, 2, 1, 1, 1, 0, 1, 2, 1, 2, 3, 3];

describe('solo : profil', () => {
  test('trois rôles explicites, dans l’ordre de la maquette', () => {
    assert.deepEqual(contenu.profil.role.cles, ['manager', 'membre', 'solo']);
    assert.equal(contenu.profil.role.question, 'Vous travaillez');
    assert.deepEqual(contenu.profil.role.libelles, ['En encadrant une équipe', "Au sein d'une équipe", 'À votre compte, sans équipe']);
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
  test('16 phrases solo, aux mêmes numéros', () => {
    assert.equal(contenu.affirmations.length, 16);
    contenu.affirmations.forEach((a, k) => { assert.equal(a.n, k + 1); assert.ok(a.solo && a.solo.length > 10, 'phrase ' + a.n); });
  });
  test('4 ou 5 idées par affirmation, marquées à valider', () => {
    for (const a of contenu.affirmations) {
      const r = a.relance.solo;
      assert.ok(r.choix.length >= 4 && r.choix.length <= 5, 'idées ' + a.n);
      assert.equal(r.a_valider, true);
    }
  });
  test('règles d’écriture : pas de tiret d’incise, pas de mots interdits', () => {
    const textes = contenu.affirmations.flatMap((a) => [a.solo, a.groupe_solo, ...a.relance.solo.choix]).concat(Object.values(contenu.pourquoi_solo));
    for (const t of textes) {
      assert.doesNotMatch(t, /[—–]/, t);
      assert.doesNotMatch(t, /\b(expérience|expert|cohorte|promotion|bilan)\b/i, t);
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
