// Banc d'essai de la migration 30 (libellé solo), sur un Postgres en mémoire. Prérequis : npm i --no-save @electric-sql/pglite@0.2

import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
const M = process.env.HOME + '/espace-intervenant/supabase/migrations/';
const db = new PGlite(); const x = (s) => db.exec(s); const q = async (s, p) => (await db.query(s, p)).rows;
await x(`create role anon; create role authenticated; create schema prive; create function prive.est_equipe() returns boolean language sql as 'select true';`);
await x(readFileSync(M + '20261012233000_intervenants_24_etat_des_lieux.sql', 'utf8'));
await x(readFileSync(new URL('./banc-migration-29-fonctions-en-ligne.sql', import.meta.url), 'utf8'));
await x(readFileSync(M + '20261013120000_intervenants_29_edl_solo.sql', 'utf8'));
const rep = async (p) => (await q('select public.edl_repondre($1::jsonb) as r', [JSON.stringify(p)]))[0].r;
const prof = (role, eq) => ({ role, taille_entreprise: '10 à 49 salariés', secteur: 'Industrie et production', taille_equipe: eq });
const R = [2,2,1,1,2,2,1,1,1,0,1,2,1,2,3,3];
console.log('avant 30, nouveau libellé :', (await rep({ version: 'v1', role: 'solo', profil: prof('En solo ou en profession libérale', ''), reponses: R })).erreur || 'accepté');
await x(readFileSync(M + '20261013150000_intervenants_30_edl_solo_libelle.sql', 'utf8'));
for (const [n, p] of [['nouveau libellé', prof('En solo ou en profession libérale', '')], ['ancien libellé', prof('À votre compte, sans équipe', '')], ['manager', prof('Le manager', '2 à 5 personnes')], ['membre', prof("Un membre de l'équipe", '6 à 12 personnes')]]) {
  const role = n === 'manager' ? 'manager' : n === 'membre' ? 'membre' : 'solo';
  const r = await rep({ version: 'v1', role, profil: p, reponses: R, relances: role === 'solo' ? { 10: [4] } : {} });
  console.log('après 30,', n, ':', r.ok ? 'accepté' : r.erreur);
}
console.log('solos comptés :', (await q("select count(*)::int c from etat_des_lieux.reponses where role='solo'"))[0].c);
