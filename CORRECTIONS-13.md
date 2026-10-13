# Corrections 13 : le rôle solo

13 octobre 2026. **En ligne** : migration 29 appliquée, puis site poussé, à la demande d'Arnaud (« tu peux mettre en ligne »).

## Ce qui change

Un troisième rôle, « solo », pour les personnes qui travaillent à leur compte, sans équipe. Le parcours, les 16 numéros
d'affirmations, l'échelle et la page de résultat restent les mêmes ; les textes sont écrits pour un solo.

Rien ne change pour les managers et les membres. Leurs réponses, leurs textes et leurs chiffres restent les mêmes. Seuls les
libellés affichés du choix de rôle changent : « En encadrant une équipe », « Au sein d'une équipe ». En base, ils gardent
leurs valeurs d'avant.

### Questionnaire (pages copiées du site, non recodées)

- `scripts/solo-maquette.mjs` fait trois retouches dans les 3 fichiers de logique de `docs/_astro` : le rôle est explicite
  (0 manager, 1 membre, 2 solo), la taille d'équipe n'est pas demandée à un solo, et un crochet laisse `pont-site.js`
  compléter les données à chaque affichage. On peut le relancer sans risque, et il faut le relancer après chaque recopie
  du site.
- `docs/etat-des-lieux/questionnaire/index.html` : un petit script dans le `<head>` pour que les trois choix soient là dès
  le premier affichage.
- `pont-site.js` :
  - le troisième choix, et les phrases, idées, titres de groupes et « pourquoi » solo, tirés de `contenu.json` ;
  - la question « Vous travaillez » ;
  - le bloc taille d'équipe masqué pour un solo ;
  - l'envoi avec un rôle explicite (plus de « membre » par défaut) et une taille d'équipe vide pour un solo ;
  - `?demo=1` conservé jusqu'au résultat ;
  - l'introduction du profil et l'étape 1 de la frise revues.

### Contenus

- `docs/assets/data/contenu.json` : `profil.role` (clés, libellés, question), `solo` et `groupe_solo` sur chaque
  affirmation, `relance.solo` (4 ou 5 idées, `a_valider: true`), `pourquoi_solo`.
- `PROPOSITION-SOLO.md` : tout ce qu'il faut relire d'un coup.

### Lien personnel

- `docs/assets/js/lien.js` : la lettre `s` pour solo, sans changer de version. Les anciens liens `m` et `g`, en v1 et en v2,
  se relisent exactement comme avant (testé).

### Page de résultat

- `docs/assets/js/parcours/resultat-these.js` :
  - « votre activité » pour un solo ;
  - `edl_these` est appelée avec le rôle ;
  - pour un solo, les chiffres des solos à partir de 3, sinon ceux des équipes sous « Dans les équipes qui ont répondu » ;
  - « Les indépendants » s'ajoutent dans « Ce qu'ils demandent ».
- Si la base n'a pas encore la migration 29, la page retombe sur l'ancienne fonction. Rien ne casse pour les managers et
  les membres.
- `docs/resultat.html`, `docs/resultat-these.html` : des repères sur les titres, que le script remplit selon le rôle.

### Tableau de bord (autre dépôt : `arnaudprz/espace-intervenant`, local, non poussé)

- `tableau-de-bord/src/lib/reel/26.js` : les solos sont exclus de tous les chiffres d'équipe ; on compte les solos, et
  leurs souhaits sont calculés à part.
- `tableau-de-bord/ajouts/ecrans/26-Etat-des-lieux.html`, régénéré dans `src/generes/` :
  - « Répondants » ajoute « , N solos » quand il y en a ;
  - « Les souhaits » gagne une version « Indépendants ».

## La migration 29 (non appliquée)

`~/espace-intervenant/supabase/migrations/20261013120000_intervenants_29_edl_solo.sql`, dans le dépôt des migrations
du projet greatly-intervenants. Elle ne fait qu'ajouter : aucun UPDATE ni DELETE, aucune colonne renommée, et la ligne de
réglages n'est pas modifiée.

1. La règle du rôle accepte `solo`.
2. Une règle `taille d'équipe vide seulement pour un solo`, en `NOT VALID` : elle ne relit pas les anciennes lignes.
3. `edl_repondre` complète les réglages pour le solo au moment de la lecture : rôle, libellés, nombre d'idées par
   affirmation. Un solo sans taille d'équipe est accepté. Un solo avec une taille d'équipe, ou avec une idée hors de sa
   liste, est refusé.
4. `edl_these(p_role)` :
   - `solo` : les solos seulement ;
   - tout autre rôle, ou aucun : tout le monde sauf les solos.
   La réponse dit pour qui elle a compté.
5. `edl_agregats` : « ensemble » exclut les solos.
6. `edl_souhaits`, `edl_compteur` et `edl_donnees` ne changent pas.

Vérifiée sur un Postgres en mémoire (`scripts/banc-migration-29.mjs`), avec la migration 24 et les fonctions telles qu'elles
sont en ligne :
- les chiffres des managers et des membres sont identiques avant et après ;
- un solo est refusé avant la migration, et accepté après ;
- les refus attendus fonctionnent ;
- `edl_these('solo')` ne compte que les solos.

## Ordre de mise en ligne

1. Arnaud relit `PROPOSITION-SOLO.md` et valide les textes. On retire `a_valider` des idées validées.
2. **Appliquer la migration 29** sur le projet greatly-intervenants.
3. Vérifier en base : `select public.edl_these()` et `select public.edl_these('membre')` donnent les chiffres d'avant ;
   `select public.edl_these('solo')` renvoie `n = 0`.
4. Pousser le dépôt `arnaudprz/etat-des-lieux` : le site.
5. Faire un vrai parcours solo en ligne, puis vérifier la ligne en base.
6. Pousser `arnaudprz/espace-intervenant` : le tableau de bord.

Si le site partait avant la migration, les solos seraient refusés (« Rôle inconnu »). Les managers et les membres
continueraient de passer.

## Vérifications faites

- Parcours complet en local, avec `?demo=1`, dans les trois rôles, sur ordinateur (1440 px) et sur téléphone (390 px). Aucune
  erreur, et rien n'a été écrit en base.
- Le contenu de l'envoi solo a été vérifié sans le mode démo, avec l'envoi intercepté. Il n'est jamais parti.
- `npm test` :
  - les 14 tests solo passent (`tests/solo.test.js` : profil, lien, anciens liens, envoi, contenus, fondations,
    retouche des maquettes) ;
  - les tests manager et membre passent sans modification.

## À valider ou à savoir de ton côté

- Les 74 idées solo, les 16 phrases, les titres de groupes et les « pourquoi » (`PROPOSITION-SOLO.md`).
- Les phrases des cartes de gauche pour un solo : proposées, mais pas affichées, puisqu'on a retiré les phrases le
  13 octobre.
- Le compteur « personnes ont répondu » compte aussi les solos.
- L'intro de la page des questions (« Pourquoi : préparer des accompagnements… ») est encore celle de la maquette, pour
  tous les rôles. C'est le point qu'on s'était gardé pour plus tard.
- Un test échouait déjà avant ce travail : `tests/agregats.test.js` vise `docs/assets/js/admin/agregats.js`, supprimé le
  12 octobre avec l'ancien admin (commit d229044). Je n'y ai pas touché.
- Le changement du tableau de bord est fait dans l'autre dépôt. Il est à pousser après la migration.
