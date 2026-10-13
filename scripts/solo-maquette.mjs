#!/usr/bin/env node
/**
 * Le troisième rôle, « solo », dans les maquettes du site copiées telles quelles (docs/_astro, 13 octobre 2026).
 *
 * On ne recode pas le parcours. Trois retouches minuscules dans les fichiers de logique, toujours les mêmes :
 *   1. le rôle devient explicite : 0 manager, 1 membre, 2 solo (avant, tout ce qui n'était pas 0 devenait membre) ;
 *   2. la taille d'équipe n'est pas demandée à un solo ;
 *   3. un crochet : à chaque rendu, la maquette passe ses données et son état à window.__edlSolo (pont-site.js), qui
 *      y ajoute le troisième libellé, les phrases et les idées solo de contenu.json ;
 *   4. (corrections 14) le bloc « Taille de votre équipe » n'est plus dessiné pour un solo : la maquette l'entoure d'un
 *      « si avecEquipe », et choisir solo efface la taille d'équipe déjà cochée. Plus de masque après coup, donc plus de
 *      question de timing. Les fichiers de modèle (le HTML de la maquette) reçoivent le « si », ceux de logique le calcul.
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

const EQUIPES = /(\w)\.equipes=(\w)\("teq",(\w)\.profil\.equipes\);/;

// Le modèle : on entoure le bloc qui contient le titre « Taille de votre équipe » et ses pastilles d'un « si ».
export function retoucherModele(source) {
  let r = entourer(source, 'Taille de votre équipe (nombre de personnes)', '"pour":"equipes"', 'avecEquipe');
  // 5. (corrections 14, suite) la taille d'entreprise non plus n'est pas demandée à un solo.
  const r2 = entourer(r.source, 'Taille de votre entreprise (nombre de salariés)', '"pour":"tailles"', 'avecEntreprise');
  const fait = [r.etat, r2.etat];
  return { source: r2.source, etat: fait.includes('retouché') ? 'retouché' : fait.includes('déjà fait') ? 'déjà fait' : 'pas concerné' };
}

function entourer(source, texte, boucle, condition) {
  if (source.includes('"si":"' + condition + '"')) return { source, etat: 'déjà fait' };
  const titre = source.indexOf(texte);
  if (titre < 0) return { source, etat: 'pas concerné' };
  // Le plus petit élément ["div",…] qui contient le titre et la boucle des pastilles d'équipe.
  const fin = (debut) => { let n = 0, chaine = false;
    for (let i = debut; i < source.length; i++) { const c = source[i];
      if (chaine) { if (c === '\\') i++; else if (c === '"') chaine = false; continue; }
      if (c === '"') chaine = true; else if (c === '[') n++; else if (c === ']') { n--; if (n === 0) return i + 1; } }
    return -1; };
  for (let d = source.lastIndexOf('["div",', titre); d >= 0; d = source.lastIndexOf('["div",', d - 1)) {
    const f = fin(d); if (f < 0) continue;
    const bloc = source.slice(d, f);
    if (f > titre && bloc.includes(boucle)) {
      return { source: source.slice(0, d) + '{"si":"' + condition + '","e":[' + bloc + ']}' + source.slice(f), etat: 'retouché' };
    }
  }
  throw new Error('Bloc introuvable dans le modèle : ' + texte);
}

export function retoucher(source) {
  if (source.includes(MARQUE)) {
    // Déjà retouché une première fois : on ajoute seulement la retouche 4 si elle manque.
    if (source.includes('avecEntreprise')) return { source, etat: 'déjà fait' };
    if (source.includes('avecEquipe')) return { source: entreprise(source), etat: 'retouché (5)' };
    const q = EQUIPES.exec(source); const etat = /(\w)=this\.state\|\|\{\}/.exec(source);
    if (!q || !etat) return { source, etat: 'déjà fait' }; // pas de pastilles d'équipe dans ce fichier : rien à ajouter
    return { source: source.replace(EQUIPES, equipes(q, etat[1])), etat: 'retouché (4)' };
  }
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
  const q = EQUIPES.exec(s);
  if (q) s = entreprise(s.replace(EQUIPES, equipes(q, st)));
  return { source: s, etat: 'retouché' };
}

// Retouche 5, côté logique : avecEntreprise pour le modèle, la taille d'entreprise n'est pas exigée d'un solo, et choisir
// solo l'efface aussi (te à -1).
const ENTREPRISE = /(\w)\.te>=0\|\|e\.push\("la taille de votre entreprise"\)/;
function entreprise(s) {
  const e = ENTREPRISE.exec(s); if (!e) return s;
  s = s.replace(ENTREPRISE, `${e[1]}.te>=0||${e[1]}.role===2||e.push("la taille de votre entreprise")`);
  s = s.replace(/(\w)\.avecEquipe=(\w)\.role!==2,/, (m, vue, st) => `${m}${vue}.avecEntreprise=${st}.role!==2,`);
  return s.replace('teq:-1,msg:""})', 'teq:-1,te:-1,msg:""})');
}

// Retouche 4, côté logique : avecEquipe pour le modèle, et choisir solo efface la taille d'équipe (teq à -1).
function equipes(q, st) {
  const [, vue, j, d] = q;
  return `${vue}.equipes=${j}("teq",${d}.profil.equipes),${vue}.avecEquipe=${st}.role!==2,${vue}.roles[2]&&(${vue}.roles[2].pick=()=>this.setState({role:${st}.role===2?-1:2,teq:-1,msg:""}));`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const bilan = [];
  for (const f of readdirSync(DOSSIER).filter((x) => /^EDL-.*\.js$/.test(x))) {
    const chemin = join(DOSSIER, f);
    let { source, etat } = retoucher(readFileSync(chemin, 'utf8'));
    if (etat === 'pas concerné') ({ source, etat } = retoucherModele(source));
    if (etat.startsWith('retouché') && !TEST) writeFileSync(chemin, source);
    if (etat !== 'pas concerné') bilan.push(`${f} : ${etat}`);
  }
  console.log(bilan.join('\n') || 'Aucun fichier de logique trouvé.');
}
