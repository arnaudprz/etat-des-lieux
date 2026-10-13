// Banc d'essai de la migration 29 (solo), sur un Postgres en mémoire : rien ne touche la base en ligne.
// Prérequis : npm i --no-save @electric-sql/pglite@0.2 ; puis node scripts/banc-migration-29.mjs

import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
const M = process.env.HOME + '/espace-intervenant/supabase/migrations/';
const db = new PGlite();
const x = (s) => db.exec(s);
const q = async (s, p) => (await db.query(s, p)).rows;
await x(`create role anon; create role authenticated; create schema prive; create function prive.est_equipe() returns boolean language sql as 'select true';`);
await x(readFileSync(M + '20261012233000_intervenants_24_etat_des_lieux.sql', 'utf8'));
await x(readFileSync(new URL('./banc-migration-29-fonctions-en-ligne.sql', import.meta.url), 'utf8'));
const rep = async (p) => (await q('select public.edl_repondre($1::jsonb) as r', [JSON.stringify(p)]))[0].r;
const prof = (role, eq) => ({ role, taille_entreprise: '10 à 49 salariés', secteur: 'Industrie et production', taille_equipe: eq });
// 12 réponses d'équipe, variées
const jeux = [[2,2,1,1,2,2,1,1,1,0,1,2,1,2,3,3],[3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3],[0,0,1,1,0,0,1,1,0,0,0,0,0,1,1,0],[2,3,2,2,3,2,2,2,2,2,3,2,2,3,2,2],[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],[3,2,1,0,3,2,1,0,3,2,1,0,3,2,1,0]];
for (const [k, j] of jeux.entries()) { await rep({ version: 'v1', role: 'manager', profil: prof('Le manager', '2 à 5 personnes'), reponses: j, relances: {} }); await rep({ version: 'v1', role: 'membre', profil: prof("Un membre de l'équipe", '6 à 12 personnes'), reponses: j.map((v) => Math.min(3, v + (k % 2))), relances: {} }); }
const avant = (await q('select public.edl_these() as t'))[0].t;
const agAvant = (await q('select public.edl_agregats() as t'))[0].t;
console.log('avant : n =', avant.n, ' refus solo avant migration :', (await rep({ version: 'v1', role: 'solo', profil: prof('À votre compte, sans équipe', ''), reponses: jeux[0] })).erreur);
await x(readFileSync(M + '20261013120000_intervenants_29_edl_solo.sql', 'utf8'));
const apres = (await q('select public.edl_these() as t'))[0].t;
const apresM = (await q("select public.edl_these('membre') as t"))[0].t;
const sans = (o) => { const c = { ...o }; delete c.role; return JSON.stringify(c); };
console.log('managers et membres inchangés :', sans(apres) === JSON.stringify(avant), sans(apresM) === JSON.stringify(avant));
console.log('agrégats inchangés :', JSON.stringify((await q('select public.edl_agregats() as t'))[0].t) === JSON.stringify(agAvant));
const essais = [
  ['solo correct', { version: 'v1', role: 'solo', profil: prof('À votre compte, sans équipe', ''), reponses: jeux[0], relances: { 10: [4] } }],
  ['solo avec taille d’équipe', { version: 'v1', role: 'solo', profil: prof('À votre compte, sans équipe', '2 à 5 personnes'), reponses: jeux[0] }],
  ['solo, idée hors liste (11 a 4 choix)', { version: 'v1', role: 'solo', profil: prof('À votre compte, sans équipe', ''), reponses: jeux[0], relances: { 11: [4] } }],
  ['manager sans taille d’équipe', { version: 'v1', role: 'manager', profil: prof('Le manager', ''), reponses: jeux[0] }],
  ['manager, nouveau libellé', { version: 'v1', role: 'manager', profil: prof('En encadrant une équipe', '2 à 5 personnes'), reponses: jeux[0] }],
  ['membre, ancien libellé', { version: 'v1', role: 'membre', profil: prof("Un membre de l'équipe", '2 à 5 personnes'), reponses: jeux[0] }],
];
for (const [nom, p] of essais) { const r = await rep(p); console.log(' ', nom, '→', r.ok ? 'accepté' : 'refusé (' + r.erreur + ')'); }
const s1 = (await q("select public.edl_these('solo') as t"))[0].t;
console.log('solo, 1 réponse :', s1.role, 'n =', s1.n, 'engagés =', s1.groupes.toutes ? s1.groupes.toutes.engages : null);
for (const j of jeux.slice(1, 3)) await rep({ version: 'v1', role: 'solo', profil: prof('À votre compte, sans équipe', ''), reponses: j });
const s3 = (await q("select public.edl_these('solo') as t"))[0].t;
console.log('solo, 3 réponses : n =', s3.n, 'intensités', JSON.stringify(s3.intensites));
const eq = (await q("select public.edl_these('manager') as t"))[0].t;
console.log('équipes sans solos : n =', eq.n, '(équipes en base :', (await q("select count(*)::int c from etat_des_lieux.reponses where role <> 'solo'"))[0].c, ')');
const sh = (await q('select public.edl_souhaits() as t'))[0].t; console.log('souhaits, rôles :', [...new Set((sh.souhaits || []).map((x) => x.role))]);
console.log('lignes touchées : aucune mise à jour possible, contraintes =', (await q("select string_agg(conname, ', ') s from pg_constraint where conrelid = 'etat_des_lieux.reponses'::regclass"))[0].s);
