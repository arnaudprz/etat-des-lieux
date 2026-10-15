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
