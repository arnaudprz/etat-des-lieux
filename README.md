# État des lieux d'équipe Greatly

Un questionnaire public en 2 minutes sur la façon dont une équipe travaille
ensemble, un résultat personnel en couleurs, et un tableau de bord privé pour
Greatly.

Le répondant ne voit **aucune note, aucun chiffre, aucun pourcentage** : des
mots et 4 couleurs. Les chiffres n'existent que dans le tableau de bord.

## Statut

**En ligne et en collecte réelle.**
<https://etat-des-lieux.greatly.club/>

Le backend Apps Script est déployé, `API_URL` est renseignée, et les réponses
sont enregistrées dans le Google Sheet. Le tableau de bord
(<https://etat-des-lieux.greatly.club/admin/>) s'ouvre avec `ADMIN_KEY`.

Pour retrouver la démo à tout moment, sans rien enregistrer : ajouter `?demo=1`
à l'adresse.

> Les vérifications par navigateur **n'écrivent jamais** dans le classeur :
> elles répondent à la place du backend. Voir `repondreALaPlaceDuBackend()`
> dans `scripts/verif/parcours.mjs`.

| Élément | État |
| --- | --- |
| Parcours public (accueil, profil, affirmations, résultat) | Fait |
| Calcul du résultat et lien personnel | Fait, testé |
| Tableau de bord privé | Fait, branché sur les vraies données |
| Backend Apps Script | Déployé, vérifié de bout en bout |
| Google Sheet | Créé, script lié |
| Mise en ligne GitHub Pages | Fait, en collecte réelle |
| Saisie des 255 réponses papier | Reportée |

## Lancer en local

Il faut un navigateur, et Node seulement pour les tests.

```sh
npm run local
```

Le serveur affiche les adresses à ouvrir, dont celle à utiliser depuis un
téléphone sur le même réseau. Il envoie `Cache-Control: no-store` : le test
local montre toujours la dernière version, sans quoi Safari peut garder un
ancien fichier JavaScript avec un nouveau HTML.

Tant qu'aucune API n'est configurée dans `docs/assets/js/config.js`, le site est
automatiquement en **mode démo** : rien n'est enregistré, et le tableau de bord
affiche des données fictives. On peut aussi forcer ce mode avec `?demo=1`.

Les polices viennent de Google Fonts : sans connexion, le site s'affiche avec
les polices de repli, tout reste lisible.

## Vérifier

```sh
npm test                                    # 204 tests, sans dépendance
node scripts/verif/cahier-des-charges.mjs   # les 17 points de la section 10.5
node scripts/verif/parcours.mjs             # rejoue le parcours dans Chromium et WebKit
node scripts/verif/parcours.mjs https://etat-des-lieux.greatly.club  # le site en ligne
node scripts/verif/parcours.mjs '' '' webkit  # une seule famille de navigateurs
node scripts/verif/tableau.mjs              # vérifie le tableau de bord
node scripts/verif/calibrer-demo.mjs        # mesure les données fictives
```

Le premier et le deuxième ne demandent rien d'autre que Node.

Les vérifications par navigateur demandent Playwright et ses navigateurs :

```sh
npm install
npx playwright install chromium webkit
node scripts/serveur.mjs 8127
```

Arnaud teste dans Safari : **WebKit fait partie des cibles**, en ordinateur et
en iPhone émulé. Plusieurs écarts ne se voient que là.

Ils écrivent leurs captures dans `/tmp/edl-captures`, à comparer avec
`maquette/captures/`.

## Organisation

| Dossier | Rôle |
| --- | --- |
| `docs/` | Le site. C'est ce dossier que GitHub Pages servira. |
| `docs/assets/js/` | Le calcul, le lien, l'API, la typographie. |
| `docs/assets/js/parcours/` | Une page du parcours public par fichier. |
| `docs/assets/js/admin/` | Le tableau de bord, une vue par section. |
| `worker/` | Le backend Google Apps Script, un fichier par responsabilité. |
| `tests/` | Les tests, exécutés par `node --test`. |
| `scripts/` | Génération de `worker/contenu.gs` et scripts de vérification. |
| `maquette/` | Les maquettes de référence. Ne sont pas servies. |

`ARCHITECTURE.md` détaille le fonctionnement, `DEPLOY.md` la mise en ligne,
`SPEC.md` le cahier des charges et `DECISIONS.md` les choix de conception.

## Une règle à ne pas oublier

`docs/assets/data/contenu.json` est la **source unique de tous les textes**.
Après l'avoir modifié, régénérer les valeurs autorisées du backend :

```sh
node scripts/generer-contenu-gs.mjs
```

De même après toute modification de `maquette/illustrations/` :

```sh
node scripts/integrer-illustrations.mjs
```

Ce script retire les métadonnées C2PA des SVG, qui pèsent plusieurs kilo-octets
chacune, et régénère `docs/assets/js/illustrations.js`.

## Journal

| Date | Commit | Description |
| --- | --- | --- |
| 30/09/2026 | `b387bbb` | Socle : arborescence, calcul, lien personnel et tests. |
| 30/09/2026 | `83baee6` | Parcours public : accueil, profil, affirmations, résultat. |
| 30/09/2026 | `736e5ae` | Backend Apps Script : réponses, événements, contacts, admin, import. |
| 30/09/2026 | `e7f1d03` | Tableau de bord privé : 10 sections, filtres et anonymat k >= 3. |
| 30/09/2026 | `418c301` | Documentation et vérification du cahier des charges. |
| 30/09/2026 | `d90beaa` | Corrections passe 1, groupe A : données du tableau de bord. |
| 30/09/2026 | `dfbea85` | Corrections passe 1, groupe B : parcours public et maquettes. |
| 30/09/2026 | `33e7a74` | Corrections passe 1, groupe C : barres de dimension compactées. |
| 30/09/2026 | `2c1e597` | Corrections passe 1, groupe D : npm test portable. |
| 30/09/2026 | `2124945` | Passe 2, point 0 : WebKit dans les vérifications, serveur local sans cache. |
| 30/09/2026 | `ca359c1` | Passe 2, point 1 : les relances passent sur un écran à part. |
| 30/09/2026 | `730330e` | Passe 2, point 2 : profil réparé dans WebKit. |
| 30/09/2026 | `c718f62` | Passe 2, point 3 : la liste des secteurs passe dans le flux. |
| 30/09/2026 | `129ba79` | Passe 2, point 4 : les affirmations sur mobile. |
| 30/09/2026 | `5efb9b9` | Passe 2, point 5 : raccourci « Garder mon résultat ». |
| 30/09/2026 | `2c13ddf` | Passe 3, sections 1 à 4 : nouvel accueil et illustration des pousses. |
| 30/09/2026 | `aa25b2b` | Passe 3, sections 5 à 7 : illustrations du résultat et du tableau de bord. |
| 30/09/2026 | `9bdb81f` | Passe 4, point 0 : nouvelle échelle de réponse. |
| 30/09/2026 | `848b764` | Passe 4, points 1 à 3 : chaque réponse réservée ouvre sa relance. |
| 30/09/2026 | `196d587` | Passe 4, point 4 : données, backend et tableau de bord. |
| 30/09/2026 | `1773103` | Passe 4, point 5 : corrections UX et UI. |
| 30/09/2026 | `ad3ed74` | Passe 5, section 0 : le résultat en bandes pleine largeur. |
| 30/09/2026 | `6198f05` | Passe 5, section 4 : le lien personnel v2 porte les idées. |
| 30/09/2026 | `ef6cb41` | Passe 5, sections 1 à 3 : les idées de la personne dans son résultat. |
| 30/09/2026 | `c3c1e39` | Passe 6, sections 1 à 5 : donner envie de répondre jusqu'au bout. |
| 30/09/2026 | `8d7f7da` | Passe 6, section 6 : faire connaître l'état des lieux. |
| 30/09/2026 | `bcbbfac` | Passe 7, section 1 : le bandeau « Revenez bientôt sur votre lien ». |
| 30/09/2026 | `c919551` | Passe 7, section 2 : préparer « Vous n'êtes pas seul ». |
| 01/10/2026 | `4afce0e` | Logo du site, bandeau fixe, et bas du résultat en deux blocs. |
| 01/10/2026 | `a250474` | Les trois repères de réassurance de l'accueil. |
| 01/10/2026 | `ce93d28` | Passe 11, point 1 : « Étape n sur 3 » sur mobile, noms des étapes dans contenu.json. |
| 01/10/2026 | `7c638b2` | Passe 11, point 2 : bandeau à 20px, lien de 40px, il défile avec le questionnaire sur mobile. |
| 01/10/2026 | `59d99f1` | Passe 11, point 3 : une seule marge intérieure de 16px pour toutes les cartes sur mobile. |
| 01/10/2026 | `cf97fbb` | Passe 11, point 4 : coches de l'accueil centrées sous le compteur sur mobile. |
| 01/10/2026 | `77070b1` | Passe 11, point 5 : numéros des points au-dessus du titre sur mobile, contraste relevé. |
| 01/10/2026 | `4caf5a5` | Passe 11, point 6 : les 8 dimensions en liste sur deux colonnes, sans allure de bouton. |
| 01/10/2026 | `8d5788d` | Passe 11, point 7 : « Pour vous » en vert forêt, « Pour Greatly » en blanc. |
| 01/10/2026 | `0f1e4b1` | Passe 11, point 8 : l'aperçu de l'accueil en mini bandeaux de couleur, comme le résultat. |
| 01/10/2026 | `ff4c608` | Passe 11, point 9 : profil en grilles égales, secteurs sans défilement interne, aide de recherche lue du contenu. |
| 01/10/2026 | `ffcc15f` | Passe 11, point 10 : affirmations, intro raccourcie, relances alignées et sans cadres imbriqués sur mobile. |
| 01/10/2026 | `9053cbd` | Passe 11, point 11 : graine entière dans son médaillon, liseré des icônes, arbre à 16 réponses seulement. |
| 01/10/2026 | `6389b99` | Passe 11, point 11 (suite) : parcours.mjs attend le fondu de l'arbre, arrivé à la 16e réponse. |
| 01/10/2026 | `f3ff34c` | Passe 11, point 12 : coche dans le flux sur ordinateur seulement, échelle resserrée sur mobile. |
| 01/10/2026 | `ecf729c` | Passe 11, point 13 : contour de focus plein, rôles de la liste des secteurs, lien du pied plus haut, texte « À semer » à 4,7:1. |
| 01/10/2026 | `ca08b52` | Passe 11, point 14 : la carte d'ensemble se calcule depuis les 8 dimensions, comme elles. |
| 01/10/2026 | `1974dd4` | Passe 11, point 15 : le résultat d'un manager écrit de son point de vue. |
| 01/10/2026 | `7a450df` | Passe 11, point 16 : haut du résultat, un seul bouton, deux liens « Modifier », médaillon aligné à gauche sur mobile. |
| 01/10/2026 | `3d6ec0f` | Passe 11, point 17 : bas du résultat, boutons pleine largeur sur mobile, titre de l'étude en Playfair, vrai pied de page. |
| 01/10/2026 | (ce commit) | Passe 11, fin : décisions, journal, V = 28. Un lien de résultat déjà partagé peut changer de titre : la carte d'ensemble suit désormais les dimensions (point 14). |
