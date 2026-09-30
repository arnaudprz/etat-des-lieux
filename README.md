# État des lieux d'équipe Greatly

Un questionnaire public en 2 minutes sur la façon dont une équipe travaille
ensemble, un résultat personnel en couleurs, et un tableau de bord privé pour
Greatly.

Le répondant ne voit **aucune note, aucun chiffre, aucun pourcentage** : des
mots et 4 couleurs. Les chiffres n'existent que dans le tableau de bord.

## Statut

**Version locale.** Tout fonctionne sur la machine, en mode démo : le parcours
complet, le calcul du résultat, le lien personnel et le tableau de bord avec des
données fictives. Le backend Apps Script est écrit et testé, mais **pas encore
déployé**, et il n'existe **pas encore de repo GitHub ni de site en ligne**.

| Élément | État |
| --- | --- |
| Parcours public (accueil, profil, affirmations, résultat) | Fait |
| Calcul du résultat et lien personnel | Fait, testé |
| Tableau de bord privé | Fait, en mode démo |
| Backend Apps Script | Écrit et testé, non déployé |
| Google Sheet | À créer (voir `DEPLOY.md`) |
| Mise en ligne GitHub Pages | À faire (voir `DEPLOY.md`) |
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
npm test                                    # 141 tests, sans dépendance
node scripts/verif/cahier-des-charges.mjs   # les 17 points de la section 10.5
node scripts/verif/parcours.mjs             # rejoue le parcours dans Chromium et WebKit
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
