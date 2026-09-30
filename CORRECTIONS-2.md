# Corrections, passe 2 : l'UX du parcours

Colle ce texte dans Claude Code, dans le repo `etat-des-lieux`.

---

Arnaud a testé le site sur son Mac, dans Safari, sur ordinateur et sur mobile. Il remonte trois choses :
- « Pas du tout » ne fonctionne pas ;
- sur le profil, les espacements sont cassés ;
- la liste des secteurs n'est pas agréable à utiliser.

J'ai rejoué le parcours dans Chromium. Là, « Pas du tout » enregistre bien la réponse et le profil s'affiche correctement. Les écarts viennent donc très probablement de Safari (WebKit), et de la logique des relances expliquée au point 1. **Tout ce qui suit doit être vérifié dans WebKit**, pas seulement dans Chromium.

## 0. Avant tout : tester dans Safari et ne plus servir de vieux fichiers

- Installe WebKit pour Playwright (`npx playwright install webkit`). Ajoute WebKit à `scripts/verif/parcours.mjs`, en ordinateur 1280 et en iPhone émulé (`devices['iPhone 13']`). Le parcours doit passer dans les deux navigateurs.
- **Le cache** : les imports sont toujours en `?v=1` alors que le code a changé. Safari peut garder un ancien `questions.js` avec un nouveau HTML.
  - Incrémente `V` et tous les `?v=` à chaque modification.
  - Remplace `npm run local` par un petit serveur Node sans dépendance qui envoie `Cache-Control: no-store`, pour que le test local montre toujours la dernière version.
- Reproduis le souci de « Pas du tout » dans WebKit avant de le corriger. Écris un test qui clique « Pas du tout » sur chacune des 16 affirmations et vérifie trois choses :
  - l'état visuel (`aria-pressed`) ;
  - la valeur enregistrée ;
  - l'apparition de la question « J'aimerais… » quand elle est attendue.

## 1. Les relances « J'aimerais… » : les sortir de la liste (priorité)

Le fonctionnement actuel crée deux problèmes que j'ai reproduits.

- **Une relance attendue n'apparaît pas.** Si la personne a déjà répondu « Plutôt pas » deux fois plus haut, un « Pas du tout » plus bas remplace l'une des deux relances. Si elle a déjà deux « Pas du tout », les suivants ne déclenchent rien. Pour elle, « Pas du tout ne fonctionne pas ».
- **Une relance disparaît et ses choix sont perdus.** Dans ce cas, un encadré déjà rempli disparaît plus haut sans prévenir, ses cases cochées sont effacées, et la page saute de plus de 100px.

**Nouveau fonctionnement** : on ne montre plus aucune relance pendant les 16 affirmations.

- Après la 16e, le bouton « Voir mon résultat » devient « Continuer ».
- Il mène à un court écran intermédiaire, sur la même page (pas de nouvelle URL), titré « Encore un mot » avec ce texte : « Vous avez été plus réservé sur ces deux affirmations. Qu'est-ce qui vous aiderait ? »
- Cet écran rappelle chacune des 2 affirmations les plus réservées : même règle de calcul, valeur 0 ou 1, la plus basse d'abord, à égalité l'ordre des affirmations. Sous chacune, sa relance « J'aimerais… », avec 2 choix au plus.
- Bouton principal « Voir mon résultat ». Lien discret « Passer » : les relances restent facultatives.
- Si aucune réponse ne vaut 0 ou 1, cet écran n'existe pas : on va directement au résultat.
- « Retour » ramène aux affirmations sans rien perdre.
- Le fil d'étapes reste sur « Vos réponses » pendant cet écran.
- Mets à jour le texte d'intro des affirmations : « Pour chaque affirmation, choisissez la réponse qui vous ressemble le plus. Il n'y a pas de bonne réponse. »
- Les choix de relance s'affichent en **lignes pleine largeur** (case à cocher à gauche, texte à droite, coins arrondis 12px), et non en pilules. Aujourd'hui, les pilules passent sur 2 lignes sur mobile et deviennent illisibles.
- Mets à jour `DECISIONS.md` : les relances passent à la fin, pour éviter les sauts de page et les choix perdus.

## 2. Profil : espacements cassés dans Safari

Dans Safari, chaque intitulé (« Taille de votre entreprise »…) est collé à ses pastilles, alors qu'il y a un énorme vide, environ 130px, entre deux blocs. L'astuce du `<legend>` en `float` ne tient pas dans WebKit.

- N'utilise plus `<fieldset>`/`<legend>` pour la mise en page. Pour chaque bloc, utilise un `<div role="radiogroup" aria-labelledby="…">` avec un intitulé en `<p>` ou `<h2>`. Tu gardes la même accessibilité sans les bizarreries des navigateurs.
- Espacements attendus, identiques dans Chromium et WebKit : **12px** entre l'intitulé et ses choix, **32px** entre deux blocs, **8px** entre deux pastilles.
- Fais la même chose pour l'encadré de relance, qui utilise aussi un `<legend>`.
- Sur mobile, les tailles d'entreprise s'empilent une par ligne et font une longue liste. Mets les pastilles de taille d'entreprise et de taille d'équipe sur **2 colonnes**, en largeur égale.
- Le bouton « Continuer » inactif n'explique rien. Laisse-le cliquable. Au clic, s'il manque quelque chose, affiche sous le bouton « Il reste à choisir : votre rôle, la taille de votre entreprise… », fais défiler jusqu'au premier champ manquant et mets-le en évidence (bordure sauge).

## 3. La liste des secteurs

Aujourd'hui, la liste s'ouvre par-dessus le reste, recouvre le bouton Continuer, ne montre pas le choix fait, et le texte d'aide est coupé sur mobile.

- **Liste dans le flux, pas en surimpression.** Sous le champ de recherche, affiche directement la liste des 20 secteurs, en 2 colonnes sur ordinateur et 1 colonne sur mobile. Hauteur maximale d'environ 6 lignes avec défilement interne.
- Chaque ligne a un rond de sélection à gauche. La ligne choisie a un fond sauge clair et une coche.
- Taper filtre la liste en direct, sans tenir compte des accents ni des majuscules. Les lettres trouvées sont en gras.
- **Une fois un secteur choisi**, la liste se referme. On voit le secteur dans une pastille sauge foncée, avec un lien « Modifier » qui rouvre la liste.
- **Aucun résultat** : « Aucun secteur ne correspond. » et un bouton « Choisir Autre ».
- Placeholder plus court : « Rechercher, par exemple santé ». Il ne doit pas être coupé à 390px.
- Clavier : flèches haut et bas, Entrée pour choisir, Échap pour refermer. Annonce le nombre de résultats aux lecteurs d'écran, sans l'afficher.

## 4. Les affirmations sur mobile

- **Échelle sur une seule ligne.** Aujourd'hui les 4 réponses sont en 2 × 2 : on lit « Pas du tout, Plutôt pas » puis « Plutôt, Tout à fait », et la progression se perd. Mets-les sur une ligne de 4, largeur égale, hauteur 52px, texte 14px sur 2 lignes au besoin. Garde l'ordre de gauche à droite.
- **Avancer tout seul.** Après une réponse, fais défiler en douceur jusqu'à l'affirmation suivante sans réponse, en la plaçant sous l'en-tête. Respecte `prefers-reduced-motion`. Ne défile pas si la personne modifie une réponse déjà donnée.
- **Progression toujours visible.** La jauge est en haut de page seulement. Rends-la collante (`position: sticky`) en haut de l'écran, 4px de haut, sans chiffre.
- **Bouton final** : s'il reste des affirmations sans réponse, le clic fait défiler jusqu'à la première et la met en évidence, avec le message « Il reste une affirmation sans réponse » (ou « Il en reste N »).

## 5. Résultat

- Sur mobile, le lien personnel arrive très bas. En haut du résultat, sous le titre, ajoute un bouton discret « Garder mon résultat » qui fait défiler jusqu'au bloc « Votre lien personnel ».

## Méthode

- Un commit par point (0 à 5), changelog du README à jour, `V` incrémenté.
- Pour chaque point, captures avant et après à 1280 et à 390, **dans WebKit et dans Chromium**.
- `npm test` et `scripts/verif/parcours.mjs` passent dans les deux navigateurs.
- Ne touche à aucun texte de `contenu.json`.
- À la fin, liste ce qui a été corrigé, point par point.
