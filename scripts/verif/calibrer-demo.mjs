/**
 * Mesure les données fictives du mode démo, pour les calibrer sur les ordres de
 * grandeur de la maquette.
 *
 * Usage : node scripts/verif/calibrer-demo.mjs
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { donneesFictives } from '../../docs/assets/js/admin/demo.js';
import { cartesRecues, souhaitLePlusChoisi } from '../../docs/assets/js/admin/agregats.js';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const contenu = JSON.parse(readFileSync(join(racine, 'docs/assets/data/contenu.json'), 'utf8'));

const d = donneesFictives(contenu);
const enLigne = d.reponses.filter((r) => r.source === 'en_ligne').length;
const papier = d.reponses.length - enLigne;

console.log('réponses   :', d.reponses.length, '| en ligne', enLigne, '| papier', papier);
console.log('entonnoir  :', JSON.stringify(d.entonnoir));
console.log('           : terminés =', d.entonnoir.termine, enLigne === d.entonnoir.termine ? '(cohérent)' : `(INCOHÉRENT, attendu ${enLigne})`);

const cartes = cartesRecues(d.reponses, contenu);
console.log('cartes     :', cartes.map((c) => `${c.niveau.cle} ${c.part} %`).join(' · '), '   cible 12 / 41 / 34 / 13');

const souhaits = [];
['membre', 'manager'].forEach((role) => {
  const duRole = d.reponses.filter((r) => r.role === role);
  contenu.affirmations.forEach((a) => {
    const s = souhaitLePlusChoisi(duRole, a.n, role, contenu);
    if (s) souhaits.push(s);
  });
});

/** Un petit groupe fait bouger la part de 15 points dès qu'une personne change. */
const SEUIL_LISIBLE = 25;

function resumer(etiquette, liste) {
  if (liste.length === 0) return;
  const parts = liste.map((s) => s.part).sort((a, b) => a - b);
  const hors = parts.filter((x) => x < 30 || x > 45).length;
  console.log(
    `souhaits ${etiquette.padEnd(22)}: min ${String(parts[0]).padStart(3)}`
    + ` | médiane ${String(parts[Math.floor(parts.length / 2)]).padStart(3)}`
    + ` | max ${String(parts[parts.length - 1]).padStart(3)}`
    + ` | ${hors} sur ${parts.length} hors de 30 à 45 %`
  );
}

resumer(`(groupes >= ${SEUIL_LISIBLE})`, souhaits.filter((s) => s.effectif >= SEUIL_LISIBLE));
resumer('(petits groupes)', souhaits.filter((s) => s.effectif < SEUIL_LISIBLE));
console.log(
  '           : les petits groupes sortent de la fourchette par construction,'
  + '\n             une personne y pèse plus de 15 points. La règle k >= 3 les autorise.'
);
