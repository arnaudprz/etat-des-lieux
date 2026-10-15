# Audit responsive · nuit du 15 au 16 octobre 2026

> Résumé en tête (mis à jour en fin de nuit) : voir la section « Au réveil » tout en bas, recopiée ici à la fin du travail.

## 0. Préparation

- Branche `responsive-2026-10-15`, partie de `main` à jour (V225).
- `npm test` échouait sur **un** fichier : `tests/agregats.test.js` importait `docs/assets/js/admin/agregats.js`, supprimé volontairement au passage à Supabase (commit d229044 : « l'admin renvoie au tableau de bord de Greatly »). Le test était orphelin : il ne testait plus rien du site, la règle k ≥ 3 vit désormais dans les fonctions Supabase. **Décision : retiré de la suite** (`git rm`). Après retrait : 205 tests, 205 réussis, 0 échec.
- Ce que le socle décrit et qui a changé depuis son écriture : le résultat n'a plus de « constellation » ni de niveaux nommés (« À construire », « Souvent là »…) ; il montre, depuis la V217, cinq chiffres sur 100 et, thème par thème, ce que montre l'étude. Le « moment résultat » s'applique donc à cette présentation : les chiffres se dessinent un à un, puis les mots arrivent.
- `config.js` : seul le numéro de version y est monté, comme l'exige la règle du dépôt (`scripts/verifier-versions.mjs`) ; rien d'autre n'y est touché. `api.js` n'est pas touché.

## 1. Inventaire des écrans et états

| Écran | Fichier, moteur de rendu | Mobile aujourd'hui |
|---|---|---|
| Accueil | `index.html` (export Astro, styles en ligne) + `pont-site.js` | une colonne, carte « L'étude en cours », étapes 1-2-3 |
| Profil manager / membre / solo | `etat-des-lieux/questionnaire/` (export Astro) + `pont-site.js` | **un long formulaire, tout empilé** (ordinateur : une question à la fois depuis V171) |
| 16 phrases | même page | **une longue page qui défile** (ordinateur : une phrase à la fois depuis V192) |
| Relances « J'aimerais… » | même page | le bloc s'ouvre **au milieu des réponses** (entre « Un peu » et « En bonne partie ») |
| Progression | même page | colonne « Votre avancée » masquée, rien à la place |
| Résultat (3 profils) | `resultat.html` + `resultat-these.js` + `these.css` (nouvelle vue V217) | une colonne, chiffres puis thèmes |
| Fenêtre e-mail | `resultat-these.js` (`fenetreMail`) | panneau plein écran |
| PDF | `resultat.html` en `mode-pdf` (Browserless) | non concerné (mise en page PDF figée) |
| Confidentialité | `etat-des-lieux/confidentialite/` | une colonne |
| Lien sans résultat | `resultat.html` sans `#` | texte et bouton |
| Chargement | — | pas d'état dessiné (le contenu arrive d'un coup) |

Captures « avant » : `captures/responsive-2026-10-15/avant/{chromium,webkit}/` aux largeurs 320, 390, 430, 768, 1024, 1440, 1920 et en paysage 844 × 390 ; pages entières en 390 et 1440 pour l'accueil et les résultats. Script : `scripts/responsive/captures.mjs` (mode démo, toutes les écritures interceptées).

## 2. Problèmes classés

### Bloquants (mobile)
1. **16 phrases : une longue page**, pas une conversation. Contraire au principe « une phrase par écran » (GOV.UK Design System, « One thing per page » ; Typeform).
2. **Profil : un formulaire empilé** de 5 questions (même principe ; Luke Wroblewski, *Web Form Design* : une question à la fois quand le contexte est mobile et que l'attention est fragmentée).
3. **Relance ouverte au milieu des réponses** : la suite de la liste (« En bonne partie », « Pleinement ») est repoussée sous le bloc ; l'œil perd la question (Nielsen, heuristique 4 « cohérence » et 6 « reconnaître plutôt que se rappeler »).

### Gênants
4. **Césure dans les titres** : « Ce qu'on vise en-semble », « de confi-dentialité ». Bringhurst (§ 2.4.8) et le Lexique de l'Imprimerie nationale : pas de coupure dans les titres.
5. **Ponctuation orpheline** : « votre travail / ? » (le « ? » seul sur sa ligne) : espace insécable manquante avant « ? » (Lexique IN, ponctuation haute).
6. **Pas de progression sentie** sur mobile pendant les 16 phrases (la colonne « Votre avancée » est masquée).
7. **Fenêtre e-mail en plein écran** au lieu d'un panneau depuis le bas (Material 3, *bottom sheet* ; Apple HIG, *sheets*).
8. **Pas de partage natif** du résultat (Web Share API).

### Finition
9. Tailles de police en px dans l'export Astro (accueil : 47, questionnaire : 35) et dans `pont-site.js` (4) ; `parcours.css` et `base.css` (142 + 18 en px) ne servent plus qu'aux pages `*-ancien.html`.
10. Pas d'état de chargement dessiné pour le résultat (le contenu apparaît d'un bloc).
11. `tabular-nums` absent des chiffres qui se comparent (résultat).

## 3. Valeurs fixes en px (inventaire)

| Fichier | font-size en px | dimensions en px | Commentaire |
|---|---|---|---|
| `_astro/*.css` + `index.html` | 47 | 37 | export Astro de la maquette ; on ne le régénère pas, on corrige par `pont-site.js` |
| `etat-des-lieux/questionnaire/index.html` | 35 | 20 | idem ; le mobile (`.m-c`) travaille en px + `cqw` |
| `pont-site.js` | 4 | 6 | surcharges ; à passer en rem |
| `these.css` (résultat) | 0 | 7 | déjà en rem / clamp |
| `groupe.css`, `pas.css` | 0 | 6 / 0 | déjà en rem |
| `parcours.css`, `base.css` | 142 / 18 | 86 / 15 | pages anciennes seulement : non traitées |

## 4. Notes de départ (grille sur 10 : calme, clarté, lumière, pouce, typo, mouvement, finition)

| Écran (390) | Calme | Clarté | Lumière | Pouce | Typo | Mouvement | Finition |
|---|---|---|---|---|---|---|---|
| Accueil | 8 | 8 | 8 | 8 | 7 | 6 | 7 |
| Profil | 5 | 7 | 7 | 6 | 7 | 4 | 6 |
| 16 phrases | 4 | 6 | 7 | 6 | 5 | 4 | 5 |
| Relance | 4 | 5 | 7 | 6 | 6 | 4 | 5 |
| Résultat | 7 | 7 | 8 | 7 | 7 | 5 | 7 |
| Fenêtre e-mail | 6 | 8 | 7 | 6 | 7 | 6 | 6 |
| Confidentialité | 7 | 8 | 8 | 8 | 5 | 5 | 6 |
| Lien sans résultat | 8 | 8 | 7 | 8 | 7 | 5 | 7 |

(Notes de l'intégrateur ; les notes du relecteur indépendant sont plus bas.)

## 5. Modèles réels : les gestes à reprendre (Mobbin, iOS)

Écrans étudiés : [Insight Timer](https://mobbin.com/screens/f83f72cc-f9f5-4977-abd2-ccaed8de1626), [Blue Apron](https://mobbin.com/screens/30d15ea8-ab1a-4680-8624-92acca81018e), [Lifesum](https://mobbin.com/screens/6f33b8de-09f7-4976-ac78-04fdb2d48b99), [Bumble](https://mobbin.com/screens/373e01f2-73d4-410a-8900-c6ce1c345f78), [Lemonade](https://mobbin.com/screens/91e0fc60-6b9f-450d-8887-98090ff57a45), [Fresha](https://mobbin.com/screens/d054ef3c-2127-4041-b059-056956f4f58d), [Jomo](https://mobbin.com/screens/5ded1478-2749-4765-8822-607c3c2e765c), [Public](https://mobbin.com/screens/0a45553a-a19e-493f-871c-9fe66c520aae).

1. **Une question par écran, en haut, grande** (Lifesum, Fresha, Blue Apron) : la question occupe le premier tiers, en 26 à 30 px, deux lignes au plus. On la lit d'un coup d'œil.
2. **Réponses en cartes pleine largeur, empilées, de même hauteur** (Insight Timer, Bumble, Lifesum) : 52 à 60 px de haut, 8 à 12 px entre elles, tout le rectangle cliquable. Texte centré quand les réponses sont courtes (Bumble), à gauche quand elles sont longues (Insight Timer).
3. **Progression en un trait fin segmenté en haut, à côté du retour** (Insight Timer : segments par section ; Public : segments par étape). Pas de « 3 sur 16 » : on sent l'avancée, on ne la compte pas. Pour nous : un segment par thème (8), qui se remplit phrase après phrase.
4. **Retour en haut à gauche, rond, discret** (Public, Jomo) ; pas de bouton « Suivant » quand la réponse suffit à avancer (Lifesum, Insight Timer). Le bouton bas n'apparaît que quand il faut valider un choix multiple (Public : « Continue » collé en bas, dans la zone du pouce).
5. **Réponses ancrées dans la zone du pouce** (Blue Apron) : quand l'écran est haut, les cartes descendent vers le bas ; la question reste en haut. Steven Hoober : 75 % des interactions au pouce, la moitié basse de l'écran est la plus sûre.
6. **Un mot doux sous les réponses** (Jomo : « Start simple, don't worry… ») : une phrase de réassurance, en petit, jamais un compteur.

Ce qu'on ne reprend pas : couleurs, icônes illustratives (Bumble, Jomo), barres d'outils d'appel (Lemonade).

## 6. Fondations

`docs/assets/css/fondations.css`, branchée sur l'accueil, le questionnaire, la confidentialité et le résultat :
- **Échelle de polices fluide** `--pas-m2` à `--pas-6` (méthode Utopia : 16 px et rapport 1,2 à 320 px ; 18 px et rapport 1,25 à 1440 px). Le texte courant `--pas-0` va de 16 à 18 px : jamais sous 16 px sur téléphone (Butterick, *Practical Typography* : « body text 15–25 px à l'écran » ; WCAG 1.4.4).
- **Espacements fluides** `--esp-3xs` à `--esp-3xl` sur une base de 8 px (Refactoring UI : une échelle limitée plutôt que des valeurs au cas par cas).
- **Mouvement** : `--mvt-court` 150 ms, `--mvt-moyen` 250 ms, `--mvt-long` 400 ms, `--decalage` 60 ms, courbes `--courbe-douce` et `--courbe-sortie` (Val Head : entrées décélérées, sorties accélérées ; 150 à 300 ms pour une interface). `prefers-reduced-motion` ramène tout à 1 ms.
- **Cible tactile** `--cible` 44 px (Apple HIG), arrondis et filet repris de l'existant, `color-scheme: light`.
- **Vérification** : captures 1440 px avant / après comparées au pixel près. Seules différences : le soleil animé du logo et un point animé du résultat (une image d'animation), rien d'autre. Le rendu ordinateur validé est inchangé.

## 7. Pistes et choix (relecteur indépendant, sur captures seulement)

Maquettes : `maquette/responsive/` (390 px), captures `captures/responsive-2026-10-15/pistes/`.

| Phrase | Calme | Clarté | Lumière | Pouce | Typo | Mouvement | Finition | Moyenne |
|---|---|---|---|---|---|---|---|---|
| A · Respiration | 8 | 8 | 6 | 8 | 7 | 6 | 6 | **7,0** |
| B · Carte | 6 | 7 | 6 | 4 | 5 | 5 | 5 | 5,4 |
| C · Lever du jour | 8 | 6 | 8 | 8 | 7 | 5 | 6 | 6,9 |

| Résultat | Calme | Clarté | Lumière | Pouce | Typo | Mouvement | Finition | Moyenne |
|---|---|---|---|---|---|---|---|---|
| A · Cinq chiffres | 7 | 8 | 5 | 8 | 7 | 6 | 6 | **6,7** |
| B · Anneaux | 6 | 7 | 6 | 8 | 6 | 6 | 5 | 6,3 |
| C · Horizon | 7 | 6 | 7 | 8 | 5 | 4 | 5 | 6,0 |

**Retenues : A pour la phrase et A pour le résultat**, en y reprenant la lumière de C (thème en italique à empattements, fond qui s'éclaire avec l'avancée). Les trois maquettes de chaque écran restent pour un autre choix au réveil.

Corrections demandées par le relecteur et appliquées en phase 2 et 3 :
- Phrase : focus invisible quand c'est le programme qui le pose (WCAG 2.4.7, `:focus-visible`) ; pas de soulignement dans un bouton ; progression en segments égaux, un par thème (Gestalt, similarité ; Nielsen n° 1) ; phrase posée au tiers supérieur, réponses dans la zone du pouce (Hoober) ; zones sûres `env(safe-area-inset-bottom)` (HIG) ; bordures des réponses à 3:1 au moins (WCAG 1.4.11) ; rappel de la réponse choisie en tête du panneau des idées (Nielsen n° 6) ; voile clair au lieu d'un voile gris ; lignes d'idées cliquables sur 44 px ; poignée retirée (pas de geste promis qu'on ne tient pas).
- Résultat : chiffres en bleu-vert, plus petits que le titre, rail atténué (« toujours en gain ») ; barres qui se dessinent l'une après l'autre, puis les mots ; surtitre rapproché de son titre (Gestalt, proximité) ; `tabular-nums` ; un seul rayon pour les cartes ; une fin soignée (loi peak-end).
- Texte relevé, non modifié : « 100 % sont engagées » / « 97 % sont engagés » (accord) → TEXTES-MOBILE.md.

## 8. Phase 2 · le parcours jusqu'au résultat (téléphone et tablette, jusqu'à 1100 px)

Code : `docs/assets/js/parcours/pont-site.js` (le pas-à-pas de l'ordinateur, étendu au téléphone avec sa propre mise en scène, classe `html.edl-tel`).
- **Une question, une phrase par écran** (GOV.UK « one thing per page » ; Wroblewski). Le profil (5 questions, 3 pour un solo) puis les 16 phrases passent une à une, avec passage automatique après une réponse (650 ms pour voir la réponse cochée), puis une étape « Merci ».
- **Réponses dans la zone du pouce** (Hoober) : grandes cartes de 56 px (48 px sur écran bas), bord à 3:1 (WCAG 1.4.11), toute la carte cliquable, retour visuel immédiat (`:active` à 0,975, couleur pleine pour la réponse choisie, les autres s'estompent).
- **Phrase posée au tiers supérieur**, thème en italique Instrument Serif (la « lumière » de la piste C), « Pourquoi on s'y intéresse » en petit ; le fond s'éclaircit à mesure qu'on avance (`--avance`).
- **Progression sentie, pas comptée** : 8 segments égaux, un par thème, le segment en cours se remplit phrase après phrase (Gestalt ; Nielsen n° 1). Profil : 5 segments ; le « Question k sur n » reste lu par les lecteurs d'écran.
- **Idées « J'aimerais… » dans un panneau qui monte du bas** (Material 3, *bottom sheet* ; HIG, *sheets*), sur un voile clair, avec la réponse choisie rappelée en tête (Nielsen n° 6), lignes de 44 px, « Question suivante » en vrai bouton plein dans la zone du pouce, zones sûres (`env(safe-area-inset-bottom)`).
- **Passer d'une phrase à l'autre** : fondu de sortie 280 ms puis arrivée décalée (le thème, puis la phrase 60 ms après), sans écran blanc ni saut ; la mise en page reste fixe d'une phrase à l'autre.
- **Toucher une réponse** : vibration de 8 ms sur Android (`navigator.vibrate`), jamais sur iPhone.
- **Retour du navigateur et geste retour** : chaque pas ajoute une entrée d'historique ; revenir en arrière ramène à la question précédente avec la réponse gardée (testé Chromium et WebKit).
- **Écrans bas et paysage** (requêtes sur la hauteur, ≤ 720 px puis ≤ 500 px) : « pourquoi » limité à deux lignes puis masqué, réponses en 2 × 2 en paysage ; tout tient sans défiler de 320 × 568 à 844 × 390.
- **Typographie** : insécables avant `? ! : ; »` et après `«` (Lexique IN) posées par le script sur tout le texte des pages ; plus de césure dans les titres, boutons et réponses (Bringhurst) ; un titre dont un mot dépasse l'écran se réduit jusqu'à tenir entier (« confidentialité » à 320 px) ; équilibrage des titres (`text-wrap: balance`) et paragraphes soignés (`pretty`) sur téléphone seulement.
- **Coupure réseau et double envoi** : l'envoi des réponses est déjà protégé contre le double envoi (empreinte) et ne bloque jamais le parcours (le résultat se calcule sur le téléphone). **À signaler sans l'ajouter** : si le téléphone est hors ligne à la fin, la réponse n'est pas relancée plus tard (`api.js`, hors du périmètre de la nuit) ; la progression n'est pas sauvegardée en local pendant les 16 phrases (un rechargement repart du début du questionnaire).
- **Arrivée sans saut** : accueil et questionnaire restent invisibles le temps que la mise en page se pose (au plus 1,2 s et 2,5 s), CLS ramené de 0,16 à 0,001 (accueil) et de 0,63 à 0,02 (questionnaire).

## 9. Phase 3 · le résultat et la finition

Code : `docs/assets/js/parcours/resultat-these.js` et `docs/assets/css/these.css` (règles `@media (max-width: 1100px)`).
- **Les cinq chiffres en liste** (piste A adoucie) : nom à gauche, chiffre en bleu-vert à droite, barre fine sur un rail très léger (« toujours en gain ») ; chiffres tabulaires.
- **Découvrir son résultat** : les lignes arrivent l'une après l'autre (160 ms), les chiffres montent, les barres se tracent, puis les mots (« Vos 16 réponses… », la carte de l'étude, le partage) arrivent 1,4 s après. Rien si `prefers-reduced-motion`.
- **Thème par thème** : score en bleu-vert, plus petit que le nom du thème ; cartes au même rayon.
- **Partage natif** (Web Share API) sur téléphone, sinon « Copier le lien » avec confirmation « Lien copié ».
- **Fenêtre e-mail** : panneau ancré en bas sur téléphone (existant), page figée derrière (`html:has(dialog[open]) { overflow: hidden }`), Échap et bouton de fermeture, focus gardé par `<dialog>` modal, zones sûres.
- **Gouttières** : 16 px à 320 et 390 px, plus de débordement (le calcul en `vw` comptait la barre de défilement).
- **Méta** : `theme-color` sur toutes les pages, `viewport-fit=cover` sur le résultat ; l'aperçu Open Graph existant est gardé.
- **Contraste AA** : mention légale du pied mobile (4,44:1 à 11,5 px → 13 px et plus claire), petites mentions « /100 » et surtitres du résultat foncés d'un cran.
- **PDF** : la nouvelle mise en page ne s'applique jamais en `mode-pdf` ; le PDF est inchangé.

### L'ordinateur validé
Comparaison au pixel, 1440 et 1920 px, avant / après : accueil, profil, phrases, idées, lien sans résultat et « ce n'est pas » **identiques** (hors image d'animation du logo). Écarts voulus seulement : insécables (confidentialité, fenêtre e-mail) et petites mentions foncées du résultat (contraste).

### Lighthouse mobile (local, mode démo, 3G simulée et processeur ralenti × 4)

| Page | Performance | Accessibilité | Bonnes pratiques | LCP | CLS |
|---|---|---|---|---|---|
| Accueil | 67 → **77** | 95 → **100** | 100 | 5,0 s | 0,124 → **0,001** |
| Questionnaire | 54 → **80** | 95 → **100** | 100 | 5,2 → 4,5 s | 0,625 → **0,018** |
| Résultat | 85 → **89** | 94 → **100** | 100 | 3,5 s | 0 |

Ce qui pèse encore sur la performance : les polices Google et le script de l'export Astro (LCP autour de 4 à 5 s en 3G simulée). Pistes pour plus tard : héberger les polices sur le site en sous-ensemble latin et précharger la graisse du titre.

## 10. Note finale du relecteur indépendant (captures WebKit, avant → après le premier tour)

| Écran | Calme | Clarté | Lumière / ton | Pouce | Typo | Mouvement | Finition |
|---|---|---|---|---|---|---|---|
| Accueil | 8 → 8 | 8 → 8 | 8 → 8 | 7 → 7 | 7 → 8 | n. j. | 8 → 8 |
| Profil | 6 → 7 | 7 → 8 | 7 → 8 | 5 → 8 | 6 → 7 | n. j. | 7 → 6 |
| Phrase | 4 → 8 | 5 → 8 | 6 → 8 | 4 → 9 | 5 → 7 | n. j. | 6 → 7 |
| Relance « J'aimerais… » | 5 → 8 | 7 → 8 | 6 → 8 | 6 → 8 | 7 → 7 | n. j. | 7 → 7 |
| Résultat (solo) | 6 → 7 | 7 → 8 | 6 → 6 | 7 → 8 | 6 → 7 | n. j. | 4 → 7 |
| Fenêtre e-mail | 6 → 6 | 8 → 8 | 8 → 8 | 5 → 5 | 7 → 7 | n. j. | 6 → 6 |
| Confidentialité | 6 → 7 | 7 → 8 | 8 → 8 | 8 → 8 | 4 → 7 | n. j. | 7 → 7 |
| Lien sans résultat | 5 → 5 | 8 → 8 | 7 → 7 | 7 → 7 | 6 → 6 | n. j. | 3 → 3 |

(n. j. : non jugeable sur image fixe ; le mouvement se juge en vidéo ou sur téléphone.)

### Second tour, à partir de ses remarques
- **Lien sans résultat** (défaut bloquant, marge à 0 px) : 16 px de marge, comme partout.
- **Pied de page** : il ne dépasse plus dans le premier écran du profil et des phrases (hauteur calculée sur l'en-tête seul, `box-sizing: border-box`).
- **Phrase posée au centre optique** de l'espace libre entre le thème et les réponses ; texte d'aide (« pourquoi ») à 16 px.
- **« Retour » au même endroit partout** (en haut à gauche), cible de 44 px ; une seule façon de compter dans le profil (les segments ; « Étape 1 sur 3 » est masqué à l'écran sur téléphone, le compte reste lu par les lecteurs d'écran).
- **« Question suivante » sans soulignement** (la règle de la maquette l'emportait).
- **Confidentialité** : le titre ne se réduit plus que si un seul mot est trop large ; les mots passent à la ligne.
- **Paysage** : les quatre réponses sur une ligne, dans l'ordre de l'échelle ; **tablette** : la colonne centrée en hauteur, la phrase près de ses réponses.
- **Fenêtre e-mail** : bouton d'envoi collé en bas du panneau (toujours visible, au-dessus du clavier), case de consentement de 22 px sur une ligne de 44 px.
- Mesure de contrôle (WebKit) : sur 320 × 568, 375 × 667, 390 × 844, 430 × 932, 844 × 390, 768 × 1024 et 1024 × 768, la dernière réponse est dans l'écran sans défiler.

### Ce qui reste sous 9 (à trancher ou à reprendre)
- **Résultat, ton** : « /100 » et les barres rappellent une jauge. Retirer « /100 » change un texte : laissé à Arnaud (voir TEXTES-MOBILE.md). La « constellation » du socle n'existe plus depuis la V217 ; le moment fort est l'arrivée des chiffres un à un.
- **Fenêtre e-mail** : croix en haut à droite (zone difficile au pouce) ; pas de poignée. Fermer par un geste n'est pas fait.
- **Accueil** : bouton principal à mi-hauteur, pas collé en bas ; « lieux. » seul en fin de paragraphe dans la carte du compteur.
- **Mouvement** : non noté sur images ; à juger sur téléphone.
