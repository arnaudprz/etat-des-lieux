# Corrections, passe 11 : UX desktop et mobile, alignement et résultat

Colle ce texte dans Claude Code, dans le repo `etat-des-lieux`, **après** les passes 8 et 9.

Source : audit UX du 1er octobre 2026, fait sur le site en ligne (`v=22`) à 1440, 390 et 360 de large. Les causes citées viennent du code (`docs/assets/css/base.css`, `parcours.css`, `docs/assets/js/calcul.js`, `parcours/resultat.js`, `parcours/profil.js`). Si le repo a bougé depuis, applique l'intention et signale l'écart dans le rapport.

`CORRECTIONS-10.md` est un compte rendu de mise en ligne, pas une passe. Cette passe respecte ses choix : compteur centré sous le bouton sur mobile, compteur et repères en haut du profil, hiérarchie « Voir mon état des lieux » sur l'accueil.

---

Tout est décrit au pixel près, avec la cause quand je l'ai trouvée. Ne réinterprète rien : si un point te semble ambigu, applique exactement ce qui est écrit ici et signale le doute dans ton rapport final, sans me poser de question avant.

## 0. Méthode de travail (à suivre à la lettre)

1. **Avant de coder**, vérifie que les passes 8 et 9 sont bien appliquées : `.groupe__titre` existe dans `parcours.css` et `phrases_manager` dans `contenu.json`, et leurs scripts de vérification sont OK. Si ce n'est pas le cas, arrête et dis le dans le rapport.
2. Fais des captures « avant » de toutes les pages (accueil, profil, questions avec 16 réponses dont 3 relances ouvertes, résultat membre, résultat manager, confidentialité) à 1280, 390 et 360, dans Chromium et WebKit, dans `captures/passe11/avant/`.
3. **Crée `scripts/verif/passe11.mjs`** (Playwright), sur le modèle de `scripts/verif/parcours.mjs` : même fonction `aller()`, URL de base `http://127.0.0.1:8127` par défaut (`npm run local`), **backend simulé**. Aucune vérification ne doit écrire dans le vrai classeur : jamais l'API de production. Il teste chaque critère ✅ ci dessous, dans Chromium et WebKit, à 1280, 390 et 360. Une ligne par critère avec OK ou KO.
4. Applique les points **dans l'ordre**, un commit par point. Après chaque point, relance le script et les scripts des passes 4 à 9. Tu ne passes au suivant que si tout est OK.
5. **Rapport final** en tableau : point, OK/KO, chemin des captures « après » (`captures/passe11/apres/`), doutes. Rien d'autre.

Fichiers autorisés, dans `docs/` : `index.html`, `profil.html`, `questions.html`, `resultat.html`, `assets/css/base.css`, `assets/css/parcours.css`, `assets/js/calcul.js`, `assets/js/config.js` (pour `V`), `assets/js/parcours/*.js`, `assets/data/contenu.json`, et `assets/js/admin/agregats.js` **seulement pour le point 12**. Hors `docs/` : `tests/`, `scripts/verif/passe11.mjs`, `maquette/Simulateur.dc.html` (seulement pour le point 12), `DECISIONS.md`, le README. **Ne touche ni à `worker/`, ni au reste du tableau de bord, ni à `confidentialite.html`.** Le repo a des modifications non commitées (`config.js`, `connexion.mjs`, `acces.gs`) : n'y touche pas et ne les inclus pas dans tes commits, sauf `V` dans `config.js` en fin de passe.

Règles habituelles : pas de tiret cadratin, espace insécable avant `? ! : ;`, aucun chiffre ni pourcentage côté répondant, tous les textes lus depuis `contenu.json` (aucun texte en dur dans le JS).

Points de rupture utilisés ici : **mobile = 599px et moins**, ordinateur = 900px et plus (celui qui existe déjà).

## 1. L'en-tête mobile : les étapes cassées

**Ce qu'on voit.** Sur profil, questions et résultat, à 390, les trois points d'étape ne tiennent pas à côté du logo. Deux points sans libellé restent en haut, le troisième passe dessous avec son nom coupé en deux (« Votre état des / lieux »).

**La cause.** `base.css` : `.etapes { display: flex; gap: 14px; flex-wrap: wrap; }`. Le logo fait 194px, il reste environ 150px : les points se replient.

**À faire :**

- Dans `contenu.json`, ajoute `"etapes": { "noms": ["Profil", "Vos réponses", "Votre état des lieux"], "mobile": "Étape {n} sur 3" }` et fais lire les noms depuis là.
- Dans le `header` des trois pages, après `.etapes`, ajoute `<span class="etapes__mobile" aria-hidden="true"></span>`, rempli par le JS commun avec `Étape {n} sur 3` (n = 1, 2 ou 3 selon la page).
- CSS :

```css
.etapes__mobile { display: none; font-size: 13px; color: var(--taupe); white-space: nowrap; }
@media (max-width: 599px) {
  .etapes { display: none; }
  .etapes__mobile { display: inline; }
}
```

- Les `.etapes` restent dans le DOM pour les lecteurs d'écran (ne les retire pas du HTML).

✅ À 390 et 360, sur les trois pages, le bas du logo et le bas de `.etapes__mobile` sont à moins de 24px l'un de l'autre (une seule ligne) et `.etapes__mobile` tient sur une ligne.
✅ À 390, aucun `.etape__point` n'est visible.
✅ À 1280, `.etapes__mobile` a `display: none` et les trois étapes sont nommées.

## 2. Le bandeau du haut

**Ce qu'on voit.** À 390, le texte du bandeau commence à 16px alors que tout le reste de la page commence à 20px. Le lien « En savoir plus » fait 17px de haut. Pendant le questionnaire, le bandeau reste collé en haut avec la barre de progression : 84px pris en permanence, dont un lien qui fait sortir.

**À faire :**

- Mobile : `.bandeau { padding: 0 20px; }`.
- `.bandeau a { display: inline-flex; align-items: center; min-height: 40px; }`.
- Sur `questions.html` seulement, à 599px et moins : le bandeau défile avec la page (il n'est plus fixe), la barre de progression reste collée tout en haut de l'écran. À 0 de défilement, rien ne se chevauche. Choisis l'implémentation la plus simple (classe sur le `body` de `questions.html`, `position: sticky` sur la progression, etc.) et explique la dans le rapport. Le `scroll-margin-top` des affirmations doit suivre.

✅ À 390, le bord gauche du texte du bandeau est à 20px, à 1px près.
✅ Le lien du bandeau fait au moins 40px de haut.
✅ Sur `questions.html` à 390, après un défilement de 1500px, le bandeau n'est plus dans l'écran et la barre de progression a son haut à 0, à 1px près.
✅ Après un clic sur « Question suivante », l'affirmation visée n'est pas cachée sous la barre.

## 3. Deux axes seulement sur mobile

**Ce qu'on voit.** À 390, le premier texte des blocs commence à 16, 20, 40, 43, 44, 84 ou 107px selon le bloc. Chaque écart est petit, mais en défilant la page paraît bricolée.

**La cause.** Marges intérieures différentes : `.affirmation` et `.cadre-etude` à `22px 20px`, `.dimensions .carte` à `18px 20px`, `.pourquoi__carte`, `.apercu`, `.ensemble`, `.garder`, `.partage`, `.etude` à `22px`, `.greatly__texte` à `24px`. La passe 8 a mis `.affirmation` à `18px 16px` sur mobile.

**À faire :** une seule marge intérieure horizontale pour **toutes** les cartes sur mobile, alignée sur la passe 8.

```css
:root { --marge-carte: 16px; }
@media (max-width: 599px) {
  .pourquoi__carte, .apercu, .cadre-etude, .affirmation, .formulaire,
  .ensemble, .garder, .partage, .etude, .greatly__texte, .dimensions .carte {
    padding-left: var(--marge-carte);
    padding-right: var(--marge-carte);
  }
}
```

Ne touche pas aux marges verticales ni à l'ordinateur. Vérifie que `.affirmation` garde bien les `18px` verticaux de la passe 8. Si une carte n'est pas dans cette liste, ajoute la et liste la dans le rapport.

Règle à respecter partout sous 600px : **axe 20px** pour ce qui est hors carte, **axe 37px** (20 + 1 de bordure + 16) pour le premier texte dans une carte. Les points 5, 13 et 14 suppriment les colonnes d'icône et de numéro qui créent d'autres axes.

✅ À 390 et 360, sur chaque page, le bord gauche de chaque `h1`, `h2`, `.intro` hors carte vaut 20px, à 1px près.
✅ À 390 et 360, dans chaque carte listée ci dessus, le bord gauche du premier titre ou paragraphe vaut 37px, à 1px près.
✅ À 1280, les captures avant/après des cartes sont identiques (marges inchangées).

## 4. Le haut de l'accueil

**Ce qu'on voit.** À 390 : le bouton est pleine largeur, le compteur « 273 personnes » est centré dessous (choix de la passe 10, on le garde), puis les trois coches sont alignées à gauche et cassées sur deux lignes (« Résultat immédiat » seul à gauche). Le compteur et les coches ne suivent pas le même axe.

**La cause.** `.hero__actions .compteur { align-self: center; }` mais `.reperes { display: flex; flex-wrap: wrap; }` sans centrage.

**À faire, à 599px et moins, sur l'accueil seulement :** les coches suivent le compteur et se centrent.

```css
@media (max-width: 599px) {
  .hero .reperes { justify-content: center; }
}
```

Ne touche pas aux repères du profil. Note dans `DECISIONS.md` : sur mobile, à l'accueil, le compteur et les coches sont centrés sous le bouton pleine largeur.

✅ À 390 et 360, sur l'accueil, le centre horizontal du compteur et celui de chaque ligne de coches sont à 2px près du centre de l'écran.

## 5. Les points 01 à 04 de l'accueil

**Ce qu'on voit.** À 390, la colonne des numéros pousse les textes à 84px. Il ne reste que 286px pour le texte.

**La cause.** `.point { grid-template-columns: 48px minmax(0, 1fr); }` à toutes les largeurs.

**À faire, à 599px et moins :** `.point { grid-template-columns: minmax(0, 1fr); gap: 6px; }`. Le numéro passe au dessus du titre.

Contraste : `.point__numero` a un contraste de 2,97:1 (`--sauge-clair` sur blanc). Passe le en `color: var(--sauge-fonce);` à toutes les largeurs (5,76:1).

✅ À 390, le bord gauche de `.point__numero` et de `.point__titre` vaut 20px, à 1px près.
✅ Le contraste de `.point__numero` sur son fond est d'au moins 4,5:1.

## 6. Les 8 tuiles « Sur quoi repose l'état des lieux »

**Ce qu'on voit.** Fond blanc, coins arrondis, ombre : elles ressemblent à des boutons, mais on ne peut pas cliquer. À 390, empilées pleine largeur, elles prennent un écran entier.

**À faire :**

- Retire la classe `carte` de ces 8 éléments. Nouveau style :

```css
.dimensions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 16px; }
.dimensions > * { padding: 12px 0; border-bottom: 1px solid var(--bordure);
  font-size: 15px; font-weight: 500; color: var(--foret);
  background: none; box-shadow: none; border-radius: 0; }
@media (max-width: 359px) { .dimensions { grid-template-columns: minmax(0, 1fr); } }
```

- Aucun curseur main, aucun état de survol.

✅ Aucune des 8 tuiles n'a de `box-shadow` ni de `border-radius` non nul.
✅ À 390, les 8 tuiles tiennent en 4 lignes et leur hauteur totale est inférieure à 260px.

## 7. Les deux cartes « Pour vous » et « Pour Greatly »

**Ce qu'on voit.** « Pour Greatly et ses intervenants » est en vert forêt plein, « Pour vous » en blanc. L'œil va d'abord vers ce qui sert Greatly.

**À faire :** inverse les deux styles. « Pour vous » prend `pourquoi__carte--foret` (et `surtitre--clair`), « Pour Greatly » devient une carte blanche. Les textes ne changent pas. Vérifie les contrastes des puces de couleur sur fond forêt (la puce « En germe » sable reste lisible) et du lien « travaux de Jody Hoffer Gittell » sur fond blanc.

✅ La carte qui contient « Un regard clair sur votre façon de travailler ensemble » a un fond `--foret`.
✅ Tous les textes des deux cartes ont un contraste d'au moins 4,5:1.

## 8. L'aperçu du résultat sur l'accueil

**Ce qu'on voit.** L'aperçu montre une liste avec des pastilles, alors que le vrai résultat est en bandeaux de couleur. La promesse ne ressemble pas à ce qu'on reçoit.

**À faire :** chaque `.apercu__ligne` devient un mini bandeau, comme `.bande__entete` du résultat :

```css
.apercu__ligne { padding: 10px 14px; border-radius: 10px; }
```

avec le fond et la couleur de texte du niveau (`--croissance` / `--croissance-texte`, etc.), le nom de la dimension à gauche, le nom du niveau à droite en `font-weight: 600`, sans pastille. Garde la mention « Exemple » et le pied.

✅ Chaque `.apercu__ligne` a un `background-color` égal à la couleur de son niveau.
✅ Plus aucune pastille dans `.apercu`.

## 9. Le profil

**Ce qu'on voit, et à faire :**

**a. Réassurance.** Le compteur et les trois coches restent en haut du profil (choix de la passe 10). Rien à faire.

**b. Promesse de comparaison.** Dans `contenu.json > profil > texte`, remplace par exactement :
« Pour lire vos réponses à côté de celles d'équipes qui vous ressemblent, quand elles seront assez nombreuses. Rien ne permet de vous identifier. »

**c. Pilules sur une grille égale.** Aujourd'hui, rôle et genre sont en largeur libre (bord droit en escalier), taille d'entreprise en 2 colonnes à 390 mais en ligne libre à 1280 (« 5 000 et plus » seul sur sa ligne), taille d'équipe en 2 colonnes avec « 13 et plus » seul.

| Champ | 599px et moins | 600px et plus |
| --- | --- | --- |
| Rôle (2 choix) | 2 colonnes égales | 2 colonnes égales, largeur du contenu |
| Genre (4 choix) | 2 colonnes égales | 4 en ligne, largeur libre (inchangé) |
| Taille d'entreprise (6) | 2 colonnes égales | 3 colonnes égales |
| Taille d'équipe (3) | 3 colonnes égales | 3 colonnes égales, largeur du contenu |

Texte centré dans les pilules en grille, 2 lignes au plus.

**d. La liste des secteurs défile dans la page qui défile.** `.secteurs { max-height: calc(6 * 48px); overflow-y: auto; }` : 6 lignes visibles, rien n'indique les 14 autres. Supprime le défilement interne : affiche les 8 premiers secteurs, puis un bouton `lien-discret` « Voir tous les secteurs » (texte dans `contenu.json`) qui déplie les 20. Dès qu'on tape dans la recherche, tous les résultats correspondants s'affichent, sans limite.

**e. Texte d'aide de la recherche.** `profil.js` écrit en dur `placeholder: 'Rechercher, par exemple santé'`, tronqué à 360 (« Rechercher, par exemple sa »). Lis le depuis `contenu.json > profil > secteur > placeholder` et mets y : « Rechercher un secteur ».

**f. Erreur.** Quand on clique sur « Continuer » avec des champs manquants, fais défiler jusqu'au premier champ manquant (en tenant compte du bandeau fixe) et donne lui le focus. Le message global reste où il est.

✅ Le texte d'intro du profil est exactement celui du point b.
✅ À 390, 360 et 1280, dans chaque groupe de pilules en grille, toutes les pilules ont la même largeur, à 1px près.
✅ À 1280, les 6 tailles d'entreprise tiennent sur 2 lignes de 3.
✅ `.secteurs` a `overflow-y: visible` (ou `auto` sans `max-height`) et aucune barre de défilement interne.
✅ Taper « san » affiche le secteur santé sans cliquer sur « Voir tous les secteurs ».
✅ À 360, le `placeholder` tient en entier dans le champ (`scrollWidth <= clientWidth` mesuré sur un clone).
✅ Cliquer « Continuer » sans rien remplir met le focus sur le premier choix du rôle, visible à l'écran.

## 10. Les affirmations

**a. Intro.** Dans `contenu.json > questions > intro`, remplace par exactement : « Pour chaque affirmation, choisissez la réponse qui vous ressemble le plus. Il n'y a pas de bonne réponse. » La relance s'explique d'elle même en s'ouvrant.

**b. Sous titre de la relance mal aligné.** Quand le titre est court, « Deux réponses au plus » est sur la même ligne. Quand il est long (« J'aimerais que mon équipe… »), il passe dessous avec un retrait, hors de l'axe du titre. Cause : `.relance__sous-titre { margin-left: 8px; white-space: nowrap; }` en `inline`. À faire : `display: block; margin: 2px 0 0;` à toutes les largeurs.

**c. Trois cadres imbriqués sur mobile.** Page, carte blanche, panneau sable, puis un cadre par option : le texte des options n'a plus qu'environ 220px. À 599px et moins, `.choix--ligne` perd son fond et sa bordure : fond transparent, `border: 0`, `border-bottom: 1px solid var(--bordure-moyenne)` sauf la dernière, `border-radius: 0`, `padding: 12px 0`. Garde `min-height: 48px`. L'option cochée garde un repère visible (texte en `font-weight: 600`, case cochée). Le panneau `.relance` garde son fond sable.

**d. La troisième case refusée en silence.** Quand deux cases sont déjà cochées, un toucher sur une case grisée ne dit rien. À faire : sur ce toucher, le sous titre « Deux réponses au plus » passe en `color: var(--sauge-fonce); font-weight: 600;` pendant 1,5s, et le texte est annoncé par la zone `aria-live` existante (ou une nouvelle, `polite`).

✅ L'intro des affirmations est exactement celle du point a.
✅ Dans chaque relance ouverte, le bord gauche du sous titre et celui du titre sont égaux, à 1px près, et le sous titre est sous le titre.
✅ À 390, dans une relance, le texte de chaque option fait au moins 270px de large.
✅ À 390, `.choix--ligne` a `border-left-width: 0` et un fond transparent.
✅ Cocher une 3e case : elle reste décochée, le sous titre change de couleur, puis revient après 1,5s.

## 11. Contrastes et focus (toutes pages)

- `.surtitre` : `color: var(--sauge-fonce);` (était `--sauge`, 4,45:1 sur blanc, juste sous le seuil ; passe à 5,76:1).
- `--focus` : `3px solid var(--sauge-fonce)` (était à 35 % d'opacité, trop pâle sur le crème).
- Liste des secteurs : `role="option"` est posé sur le `li` qui contient un `button`, ce qui fait un élément interactif dans un autre (axe : `nested-interactive`, 20 occurrences). Mets `role="option"`, `aria-selected` et l'`id` sur le `button` lui même, et `role="none"` sur le `li`. La navigation clavier et `aria-activedescendant` doivent continuer à marcher.
- Lien « Politique de confidentialité » du pied : `display: inline-block; padding: 12px 0;` (18px de haut aujourd'hui).

✅ axe-core (règles wcag2a, wcag2aa, wcag21aa, wcag22aa) ne remonte aucune violation sur accueil, profil, questions et résultat, à 390 et 1280.
✅ Le contour de focus a un contraste d'au moins 3:1 avec le fond crème.

## 12. Le titre du résultat contredit les bandeaux

**Ce qu'on voit.** Réponses `1,2,3,0,2,3,1,2,1,2,3,0,2,3,1,2` (lien `#v2-m1230231212302312`) : 1 repère Bien enraciné, 6 En croissance, 1 En germe, et le titre dit « Une équipe en germe ».

**La cause.** Deux règles qui ne se parlent pas, dans `calcul.js` :

- chaque dimension est arrondie à l'entier le plus proche, **égalités vers le haut** (`arrondir`, 1,5 donne 2) ;
- la carte d'ensemble prend la moyenne brute des affirmations 1 à 15 avec des seuils **2,5 / 1,75 / 1**. Ici la moyenne vaut 26/15 = 1,73, sous 1,75 : En germe.

Les dimensions sont donc tirées vers le haut, le titre vers le bas.

**Décision (à reporter dans `DECISIONS.md`, rubrique « Règle de calcul qui fait foi ») :** la carte d'ensemble se calcule à partir des 8 dimensions, avec la même règle d'arrondi qu'elles.

```js
export function niveauEnsemble(dimensions) {
  return arrondir(moyenne(dimensions.map((d) => d.valeur)));
}
export function carteEnsemble(reponses, contenu) {
  const valeur = niveauEnsemble(dimensionsClassees(reponses, contenu));
  const cle = contenu.niveaux.find((n) => n.valeur === valeur).cle;
  return contenu.cartes_ensemble.find((c) => c.niveau === cle);
}
```

- `seuil_min` n'est plus utilisé pour le répondant. Laisse le dans `contenu.json`, et ne change rien à ce que le dashboard calcule (si le dashboard utilise `moyenneEnsemble` ou `cartePourMoyenne`, garde ces fonctions telles quelles).
- **Le tableau de bord doit compter la carte que chacun a vraiment vue.** `docs/assets/js/admin/agregats.js`, fonction `cartesRecues`, recalcule la moyenne brute et appelle `cartePourMoyenne`. Remplace ce calcul par `carteEnsemble(r.reponses, contenu)`. C'est la seule modification autorisée dans `admin/`.
- `tests/calcul.test.js`, bloc « seuils de la carte d'ensemble » : les tests de `cartePourMoyenne` peuvent rester s'il reste exportée, mais le test « le Q16 n'entre pas dans la moyenne » doit passer avec la nouvelle règle. Liste dans le rapport chaque test modifié ou ajouté.
- Mets à jour la même règle dans `maquette/Simulateur.dc.html` (il est dans le repo et « fait foi »).
- Le lien d'un résultat déjà partagé peut changer de titre : c'est voulu, note le dans le changelog.

✅ Test `node --test` : les réponses du lien ci dessus donnent la carte « croissance ».
✅ Test : 16 fois 0 donne « semer », 16 fois 3 donne « enracine ».
✅ Test sur 2 000 jeux de réponses aléatoires : le niveau de la carte est toujours compris entre le plus bas et le plus haut niveau des dimensions.
✅ `phraseForme` et `phraseAppui` ne changent pas (compare leurs sorties avant/après sur les 2 000 jeux).
✅ `cartesRecues` donne, pour chaque réponse, la même carte que `carteEnsemble` (test sur les données du mode démo).

## 13. Le haut du résultat

**a. Trois boutons de même poids.** « Garder mon résultat », « Modifier mes réponses », « Modifier mon profil » sont trois `bouton-doux`. À 390, ils s'empilent avec trois largeurs différentes (bord droit en escalier). À faire : « Garder mon résultat » reste un `bouton-doux` ; les deux « Modifier » deviennent des `lien-discret`, sur une même ligne sous lui (ils passent l'un sous l'autre seulement s'ils ne tiennent pas).

**b. Étiquette trop longue.** « Votre équipe, dans votre regard : En croissance » casse sur 2 lignes à 390. Dans `contenu.json > cartes_ensemble`, remplace les 4 `etiquette` par « Dans votre regard : » suivi du nom du niveau (« Dans votre regard : En croissance », etc.).

**c. Médaillon centré, texte à gauche.** À 599px et moins, `.ensemble__principal { align-items: flex-start; }` et le médaillon passe à 96px. Il reste au dessus de l'étiquette.

✅ À 390, les deux liens « Modifier » ont la classe `lien-discret` et le même `top` (une ligne).
✅ À 360, `.ensemble__etiquette` tient sur une ligne.
✅ À 390, le bord gauche du médaillon, de l'étiquette et du titre de la carte d'ensemble sont égaux, à 1px près.

## 14. Le bas du résultat

**a. Carte « Gardez votre résultat ».** L'icône garde sa colonne sur mobile : titre, texte et bouton commencent à 107px, 64px plus loin que les autres cartes. Cause : `.garder { grid-template-columns: 48px minmax(0, 1fr); }`. À 599px et moins : `grid-template-columns: minmax(0, 1fr);`, icône au dessus du titre, 40px.

**b. Le raccourci clavier des favoris sur écran tactile.** `resultat.js` affiche « ⌘ D… » ou « Ctrl D… » dès que `navigator.share` n'existe pas, donc aussi sur des téléphones sans partage. Ajoute la condition `matchMedia('(pointer: fine)').matches` : pas de raccourci clavier sur un écran tactile.

**c. Largeur des boutons.** À 390, les boutons des cartes font 175, 201, 188 et 251px et partent de 43, 44 ou 107px, alors que les boutons de parcours (Continuer, Voir mon résultat) sont pleine largeur. Règle : à 599px et moins, tout `.btn` et tout `bouton-doux` **dans une carte** (garder, partage, Greatly, étude) prend toute la largeur de la carte. Retire le `style="align-self: flex-start"` en ligne du bouton de l'étude et mets la règle en CSS (à gauche à partir de 600px).

**d. « Partager l'état des lieux » coupé.** À 1280, le texte du bouton passe sur 2 lignes dans sa pilule. À partir de 600px : `.partage .bouton-doux { flex-shrink: 0; white-space: nowrap; }`.

**e. Titre de l'étude.** `.bloc__titre` n'a pas de style de base : il hérite du `h2` du navigateur (sans serif gras, grandes marges), alors que tous les autres titres sont en Playfair. À faire :

```css
.bloc__titre { margin: 0; font-family: 'Playfair Display', Georgia, serif; font-weight: 400;
  font-size: 24px; line-height: 1.2; color: var(--foret); }
```

(28px à partir de 900px, déjà en place). Même règle pour « Merci, c'est noté ».

**f. Pas de pied de page.** Le résultat finit sur `.mention-finale`, une ligne centrée, alors que toutes les autres pages finissent sur `footer.pied`. Remplace `.mention-finale` par le même `footer.pied` que `questions.html`.

✅ À 390, le bord gauche de `.garder__titre` vaut 37px, à 1px près.
✅ Avec `pointer: coarse` émulé et sans `navigator.share`, `[data-retour-raccourci]` est caché.
✅ À 390 et 360, chaque bouton des cartes garder, partage, Greatly et étude a la largeur intérieure de sa carte, à 1px près.
✅ À 1280, le bouton « Partager l'état des lieux » tient sur une ligne.
✅ `.bloc__titre` a `font-family` qui commence par « Playfair Display » et `margin-top: 0`.
✅ `resultat.html` contient un `footer.pied` et aucun `.mention-finale`.

## 15. Ce qu'on ne touche pas

- L'échelle de réponse en 4 colonnes sur une ligne (décision de la passe 8).
- Le compteur centré sur mobile et la réassurance en haut du profil (choix de la passe 10).
- La carte « Ce qu'on cherche à comprendre » et le bloc Greatly (contenu et place).
- L'ordre des étapes (profil avant les affirmations) et la promesse « 2 minutes ».
- Les textes des affirmations, des relances et du résultat (sauf ceux cités ici), le lien v2, l'entonnoir, le dashboard.

## 16. Vérification finale

- `node scripts/verif/passe11.mjs` : tout OK dans Chromium et WebKit, à 1280, 390 et 360, contre le serveur local.
- `node scripts/verif/parcours.mjs` et les vérifications des passes 8 et 9 passent toujours.
- `npm test` passe (les 204 tests et les nouveaux).
- Le compteur du vrai classeur n'a pas bougé pendant toute la passe.
- Captures « après » de toutes les pages du point 0, mêmes largeurs, mêmes navigateurs.
- `DECISIONS.md` à jour : règle de la carte d'ensemble (répondant et tableau de bord), deux axes sur mobile, compteur et coches centrés sur l'accueil mobile, étapes « Étape n sur 3 » sur mobile, liste des secteurs sans défilement interne, pilules en grille égale, boutons pleine largeur dans les cartes sur mobile.
- Changelog du README, `V` incrémenté dans `docs/assets/js/config.js`.
- Rapport final en tableau, comme au point 0.
