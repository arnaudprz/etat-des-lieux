/**
 * La vérification de la section 10.5 du cahier des charges, point par point.
 * Ne demande ni navigateur ni serveur : lit le contenu et le code.
 *
 * Usage : node scripts/verif/cahier-des-charges.mjs
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const lire = (...p) => readFileSync(join(racine, ...p), 'utf8');
const contenu = JSON.parse(lire('docs', 'assets', 'data', 'contenu.json'));

const resultats = [];
function verifier(intitule, condition, detail = '') {
  resultats.push({ intitule, ok: !!condition, detail });
}

/** Tous les fichiers d'un dossier, en profondeur. */
function fichiers(dossier, filtre) {
  const sortie = [];
  (function parcourir(d) {
    readdirSync(d).forEach((nom) => {
      if (nom === 'node_modules' || nom === '.git') return;
      const chemin = join(d, nom);
      if (statSync(chemin).isDirectory()) parcourir(chemin);
      else if (filtre(nom)) sortie.push(chemin);
    });
  })(join(racine, dossier));
  return sortie;
}

// 1. Les 16 affirmations existent en version membre et manager.
const sansVersion = contenu.affirmations.filter(
  (a) => !a.membre || !a.manager || typeof a.membre !== 'string' || typeof a.manager !== 'string'
);
verifier(
  'Les 16 affirmations existent en version membre et manager',
  contenu.affirmations.length === 16 && sansVersion.length === 0,
  sansVersion.length ? `manquantes : ${sansVersion.map((a) => a.n).join(', ')}` : ''
);

// 2. Les 16 relances sont complètes, avec leurs deux versions.
const relancesIncompletes = contenu.affirmations.filter((a) => {
  const r = a.relance;
  if (!r) return true;
  return ['membre', 'manager'].some(
    (role) => !r[role] || !r[role].debut || !Array.isArray(r[role].choix) || r[role].choix.length === 0
  );
});
verifier(
  'Les 16 relances sont complètes, dans leurs deux versions',
  relancesIncompletes.length === 0,
  relancesIncompletes.length ? `incomplètes : ${relancesIncompletes.map((a) => a.n).join(', ')}` : ''
);

// 3. Les 32 phrases de dimension et les 4 cartes sont là.
const niveaux = contenu.niveaux.map((n) => n.cle);
const phrasesManquantes = [];
contenu.dimensions.forEach((d) => {
  niveaux.forEach((cle) => {
    if (!d.phrases[cle]) phrasesManquantes.push(`${d.cle}.${cle}`);
  });
});
const nbPhrases = contenu.dimensions.length * niveaux.length;
verifier(
  `Les ${nbPhrases} phrases de dimension sont présentes`,
  contenu.dimensions.length === 8 && phrasesManquantes.length === 0,
  phrasesManquantes.join(', ')
);
verifier(
  'Les 4 cartes d’ensemble sont présentes, avec étiquette, titre et texte',
  contenu.cartes_ensemble.length === 4
    && contenu.cartes_ensemble.every((c) => c.etiquette && c.titre && c.texte)
);

// 4. Le répondant ne voit aucun chiffre.
// Les textes affichés au répondant ne doivent contenir ni note ni pourcentage.
const textesRepondant = [
  ...contenu.dimensions.flatMap((d) => Object.values(d.phrases)),
  ...contenu.cartes_ensemble.flatMap((c) => [c.etiquette, c.titre, c.texte]),
  ...Object.values(contenu.phrases_forme),
  ...contenu.affirmations.flatMap((a) => [a.membre, a.manager]),
];
const avecChiffre = textesRepondant.filter((t) => /\d/.test(t));
verifier(
  'Aucun texte lu par le répondant ne contient de chiffre',
  avecChiffre.length === 0,
  avecChiffre.slice(0, 2).join(' | ')
);

// Et le code du parcours ne doit afficher ni moyenne ni pourcentage.
const jsParcours = fichiers('docs/assets/js/parcours', (n) => n.endsWith('.js'))
  .map((f) => lire(relative(racine, f)))
  .join('\n');
verifier(
  'Le parcours public n’affiche jamais la moyenne cachée',
  !/moyenneEnsemble/.test(jsParcours)
);

// 5. Aucun e-mail n'est envoyé.
const gs = fichiers('worker', (n) => n.endsWith('.gs')).map((f) => lire(relative(racine, f))).join('\n');
verifier(
  'Le backend n’envoie aucun e-mail',
  !/MailApp|GmailApp|sendEmail/.test(gs)
);

// 6. Les contacts ne sont jamais reliés aux réponses.
const admin = lire('worker', 'admin.gs');
const contactsGs = lire('worker', 'contacts.gs');
verifier(
  'L’action « donnees » ne lit jamais la feuille des contacts',
  !/ONGLETS\.contacts/.test(admin.replace(/function nombreContacts[\s\S]*?\n}/, ''))
    && /nombre_contacts/.test(admin)
);
verifier(
  'La feuille des contacts ne porte ni identifiant de réponse ni de session',
  !/\bid\b|session/.test(
    (lire('worker', 'Code.gs').match(/contacts: \[[^\]]*\]/) || [''])[0]
  )
);
verifier(
  'Le contact enregistré ne reçoit que ses propres champs',
  !/session|reponse/i.test(contactsGs.match(/appendRow\(\[[\s\S]*?\]\)/)[0])
);

// 7. Le seuil k >= 3 est respecté.
const agregats = lire('docs', 'assets', 'js', 'admin', 'agregats.js');
verifier(
  'Le seuil d’anonymat vaut 3 et garde toutes les mesures',
  /export const K_MINI = 3/.test(agregats)
    && (agregats.match(/assezDeMonde\(/g) || []).length >= 6
);

// 8. Le compteur ne compte jamais deux fois.
const reponsesGs = lire('worker', 'reponses.gs');
verifier(
  'Le compteur remplace la valeur de base dès qu’il y a du papier',
  /\(papier > 0 \? papier : base\) \+ enLigne/.test(reponsesGs)
);

// 9. Aucun texte affiché ne contient de tiret cadratin.
const aScruter = [
  ...fichiers('docs', (n) => n.endsWith('.html') || n.endsWith('.js') || n.endsWith('.json')),
];
const avecTiret = [];
aScruter.forEach((f) => {
  const texte = readFileSync(f, 'utf8');
  // On ignore les tirets qui vivent dans un commentaire de code.
  texte.split('\n').forEach((ligne, i) => {
    // On ignore les commentaires de code, et la classe de caractères qui sert
    // justement à détecter ces tirets dans typo.js.
    const sansCommentaire = ligne.replace(/^\s*(\/\/|\*|\/\*).*/, '');
    const sansDetecteur = sansCommentaire.replace(/\/\[—–\]\//g, '');
    if (/[—–]/.test(sansDetecteur)) {
      avecTiret.push(`${relative(racine, f)}:${i + 1}`);
    }
  });
});
verifier(
  'Aucun tiret cadratin ni demi-cadratin dans les textes affichés',
  avecTiret.length === 0,
  avecTiret.slice(0, 5).join(', ')
);

// 10. Aucune réponse n'est committée dans le repo.
// Les données vivent dans le Google Sheet. Le seul fichier de données servi est
// contenu.json, et aucun CSV ne doit traîner dans le repo.
const donneesServies = readdirSync(join(racine, 'docs', 'assets', 'data'));
const csvEgares = fichiers('.', (n) => n.endsWith('.csv'));
verifier(
  'Le seul fichier de données servi est contenu.json',
  donneesServies.length === 1 && donneesServies[0] === 'contenu.json',
  donneesServies.join(', ')
);
verifier(
  'Aucun CSV de réponses ou de contacts dans le repo',
  csvEgares.length === 0,
  csvEgares.map((f) => relative(racine, f)).join(', ')
);

// 11. contenu.gs est à jour par rapport à contenu.json.
const contenuGs = lire('worker', 'contenu.gs');
const secteursDansGs = (contenuGs.match(/"secteur": \[([\s\S]*?)\]/) || ['', ''])[1];
const secteursManquants = contenu.profil.secteur.choix.filter(
  (s) => !secteursDansGs.includes(JSON.stringify(s).slice(1, -1))
);
verifier(
  'worker/contenu.gs est à jour avec contenu.json',
  secteursManquants.length === 0 && contenuGs.includes(`version ${contenu.version}`),
  secteursManquants.join(', ')
);

// 12. Le Q16 n'apparaît jamais dans le résultat.
const dimensionsCouvrent = contenu.dimensions.flatMap((d) => d.affirmations).sort((a, b) => a - b);
verifier(
  'Le Q16 n’appartient à aucune dimension du résultat',
  !dimensionsCouvrent.includes(16) && dimensionsCouvrent.length === 15
);

// --------------------------------------------------------------------- bilan

const echecs = resultats.filter((r) => !r.ok);
resultats.forEach((r) => {
  const marque = r.ok ? 'ok  ' : 'ÉCHEC';
  console.log(`${marque}  ${r.intitule}${r.detail ? `\n         ${r.detail}` : ''}`);
});
console.log(`\n${resultats.length - echecs.length} sur ${resultats.length} vérifications passent.`);
if (echecs.length > 0) process.exitCode = 1;
