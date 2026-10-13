#!/usr/bin/env node
/**
 * Le troisième rôle, « solo », dans les maquettes du site copiées telles quelles (docs/_astro, 13 octobre 2026).
 *
 * On ne recode pas le parcours. Trois retouches minuscules dans les fichiers de logique, toujours les mêmes :
 *   1. le rôle devient explicite : 0 manager, 1 membre, 2 solo (avant, tout ce qui n'était pas 0 devenait membre) ;
 *   2. la taille d'équipe n'est pas demandée à un solo ;
 *   3. un crochet : à chaque rendu, la maquette passe ses données et son état à window.__edlSolo (pont-site.js), qui
 *      y ajoute le troisième libellé, les phrases et les idées solo de contenu.json.
 *
 * Le script se relance sans risque : un fichier déjà retouché est laissé tel quel. À relancer après chaque recopie du
 * site (build avec BASE_SITE=/, puis copie de dist/_astro).
 *
 *   node scripts/solo-maquette.mjs          retouche docs/_astro
 *   node scripts/solo-maquette.mjs --test   vérifie seulement, sans écrire
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ICI = dirname(fileURLToPath(import.meta.url));
const DOSSIER = join(ICI, '..', 'docs', '_astro');
const TEST = process.argv.includes('--test');

const MARQUE = '__edlSolo';
const ROLE_AVANT = /(\w)=this\.state\|\|\{\},(\w)=\1\.role===0\?"manager":"membre"/;
const EQUIPE_AVANT = /(\w)\.teq>=0\|\|e\.push\(/;

export function retoucher(source) {
  if (source.includes(MARQUE)) return { source, etat: 'déjà fait' };
  const r = ROLE_AVANT.exec(source);
  const e = EQUIPE_AVANT.exec(source);
  if (!r || !e) return { source, etat: 'pas concerné' };
  // Le nom des données de la maquette dans ce fichier : celui qui porte .profil.tailles.
  const d = /(\w)\.profil\.tailles/.exec(source);
  if (!d) throw new Error('Données de la maquette introuvables.');
  const [, st, role] = r;
  let s = source.replace(ROLE_AVANT,
    `${st}=this.state||{},_edlS=window.${MARQUE}&&window.${MARQUE}(${d[1]},${st}),${role}=["manager","membre","solo"][${st}.role]||"membre"`);
  s = s.replace(EQUIPE_AVANT, `${e[1]}.teq>=0||${e[1]}.role===2||e.push(`);
  return { source: s, etat: 'retouché' };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const bilan = [];
  for (const f of readdirSync(DOSSIER).filter((x) => /^EDL-.*\.js$/.test(x))) {
    const chemin = join(DOSSIER, f);
    const { source, etat } = retoucher(readFileSync(chemin, 'utf8'));
    if (etat === 'retouché' && !TEST) writeFileSync(chemin, source);
    if (etat !== 'pas concerné') bilan.push(`${f} : ${etat}`);
  }
  console.log(bilan.join('\n') || 'Aucun fichier de logique trouvé.');
}
