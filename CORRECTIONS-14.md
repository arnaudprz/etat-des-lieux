# Corrections 14 : le rôle solo, corrigé

13 octobre 2026. **En ligne** : migration 30 appliquée, puis site poussé (« mets en ligne que je teste »). Règle suivie : on ne touche
qu'au rôle solo. Chaque changement de code passe par une condition sur le solo, sauf le bloc de fin de l'accueil
(point 5), demandé pour tout le monde.

## Ce qui a changé

1. **Libellé du profil** : « À votre compte, sans équipe » devient « En solo ou en profession libérale ». La clé reste
   `solo`. Changé dans `contenu.json` (libellés et valeur enregistrée), `LIBELLES_ROLES` de `pont-site.js` et le script du
   `<head>` du questionnaire. La base contrôle les libellés : la **migration 30** accepte le nouveau et garde l'ancien. Le
   tableau de bord lit le rôle, pas le libellé : les deux comptent comme un seul profil solo, rien à y changer.
2. **Affirmations solo** : les 16 phrases validées, mot pour mot.
3. **Idées et « pourquoi » solo** : réécrites pour coller aux phrases, sans « pairs » ni « des gens ». Le nombre d'idées par
   affirmation ne change pas : la base le contrôle (migration 29).
4. **Résultat d'un solo** (`resultat-these.js`, chaque fois sous condition solo) :
   - à gauche, « *Votre activité,* **telle que vous la voyez.** », avec le surtitre « Votre regard », pour ne pas répéter
     « votre activité » ;
   - à droite, avec moins de 3 solos : « Ce que montre l'étude », puis la ligne « Pas encore assez d'indépendants pour leurs
     propres chiffres. Voici ce que montrent toutes les réponses. » Avec assez de solos : « Ce que montrent les
     indépendants » ;
   - les phrases ne parlent que de personnes : « Là où le soutien est là », « Là où la cohésion est là » ;
   - « Ce que demandent les autres indépendants » remplace managers et équipes, et n'apparaît que si au moins 3 solos ont
     choisi le souhait ;
   - des espaces au copier-coller et pour les lecteurs d'écran : « 284 personnes », « La confiance +71 points ».
     « vous la voyez, votre activité » en avait déjà une.
5. **Accueil, pour tout le monde** :
   - le bloc de fin devient « Comment voyez-vous / votre travail ? », avec une espace entre les deux lignes ;
   - « Ce que vous y gagnez » était déjà en ligne avec tes textes ;
   - les autres phrases qui ne parlaient qu'aux équipes sont déjà en ligne, après ton accord : « État des lieux · 2
     minutes », « Sur quoi repose », titre de l'onglet, en-tête du résultat.
6. **Caches** : `V` passe à 32 dans `config.js`, et les fichiers modifiés sont appelés en `?v=32`.

Un texte commun dit encore « en groupe de pairs » (`contenu.json`, bloc `greatly`). Il est lu seulement par l'ancienne
page de résultat, qui n'est plus affichée. Ce n'est pas un texte solo : je n'y ai pas touché.

## Fichiers touchés

- `docs/assets/data/contenu.json` : champs solo seulement. Une empreinte vérifie que tout le reste est identique.
- `docs/assets/js/parcours/resultat-these.js`, `docs/resultat.html`, `docs/resultat-these.html` : des repères sur les
  titres et une ligne cachée hors solo.
- `docs/assets/js/parcours/pont-site.js` : libellé, bloc de fin de l'accueil, versions.
- `docs/etat-des-lieux/questionnaire/index.html` : libellé.
- Les autres pages html : version de `pont-site.js`.
- `docs/assets/js/config.js`, `docs/assets/js/contenu.js` : `V = 32`.
- `tests/solo.test.js` : nouveau libellé, phrases validées, nombre d'idées, mots interdits (dont équipe, manager,
  collègue).
- `scripts/banc-migration-30.mjs`.
- `~/espace-intervenant/supabase/migrations/20261013150000_intervenants_30_edl_solo_libelle.sql`.

## Migration 30 (non appliquée)

Elle ne remplace que `edl_repondre`, en ajoutant « En solo ou en profession libérale » aux libellés acceptés. L'ancien
libellé reste accepté. Aucune ligne n'est touchée, et les réglages ne changent pas.

Testée sur le banc :
- avant la migration, le nouveau libellé est refusé ;
- après, le nouveau et l'ancien sont acceptés, et manager et membre comme avant.

## Ordre de mise en ligne

1. Tu relis la liste des textes ci-dessous.
2. Appliquer la **migration 30**.
3. Pousser le site (dépôt `arnaudprz/etat-des-lieux`).
4. Faire un parcours solo en ligne.

Si le site partait avant la migration, les solos seraient refusés (« Profil invalide »). Les managers et les membres
passeraient toujours.

## Vérifications

- `npm test` : 16 tests solo réussis. Les tests manager et membre passent sans modification. Seul échoue l'ancien
  `agregats.test.js`, qui vise un fichier de l'admin supprimé le 12 octobre, comme avant.
- Parcours solo complet en local, sur ordinateur et téléphone, avec `?demo=1`. Le contenu de l'envoi a été vérifié avec
  l'envoi bloqué : rien n'est écrit en base.
- Résultat solo en **mode repli**, avec `?demo=1`.
- Résultat solo **avec assez de solos** : le mode démo ne montre que le repli, donc j'ai remplacé les réponses de la base
  par des chiffres simulés dans le navigateur de test. Aucune lecture ni écriture réelle n'est faite.
- Dans ces deux modes, aucun « équipe », « manager » ni « collègue » à l'écran pour un solo.
- **Captures manager et membre avant/après** (`captures/corrections-14/`), avec `?demo=1`, sur ordinateur et téléphone :
  **identiques au pixel près**.
- Le seul changement vu par un manager ou un membre est le bloc de fin du questionnaire et de l'accueil, demandé au point 5.
- Captures du résultat solo : `solo-repli-*.png`, `solo-assez-*.png`.

## Tous les textes affichés à un solo

### Profil

- Question : **Vous travaillez**
- Choix : En encadrant une équipe · Au sein d'une équipe · **En solo ou en profession libérale**
- Introduction : « Quelques mots pour vous situer parmi toutes les réponses, en équipe ou à votre compte. Rien ne permet de
  vous identifier. »
- Pas de taille d'équipe. La taille d'entreprise et le secteur restent.

### Questions et idées « J'aimerais… »


#### Votre collectif pro

*Pourquoi on s'y intéresse :* On se demande si vous avancez seul ou avec un collectif d'indépendants, et avec vos partenaires. Travailler à son compte ne veut pas dire travailler sans collectif.

**1. J'avance avec un collectif d'indépendants qui compte pour moi.**

- Rejoindre un collectif d'indépendants
- Retrouver mon collectif plus régulièrement
- Avancer avec d'autres indépendants sur des projets communs
- Partager mes objectifs avec mon collectif
- Répondre à plusieurs à de plus gros projets

**2. Avec mes partenaires et sous-traitants, nous visons le même résultat.**

- Partager plus clairement mes objectifs avec mes partenaires
- Mieux cadrer le travail avec mes sous-traitants
- Faire le point plus souvent avec mes partenaires
- Avoir un collectif avec qui partager mes réussites


#### Ce qu'on sait de vous

*Pourquoi on s'y intéresse :* On veut comprendre si vos clients et d'autres indépendants savent ce que vous faites. C'est ce qui permet d'anticiper plutôt que de subir.

**3. Je connais d'autres indépendants qui vivent les mêmes réalités que moi.**

- Rencontrer d'autres indépendants de mon métier
- Échanger plus souvent avec d'autres indépendants
- Rejoindre un collectif d'indépendants
- Découvrir comment d'autres indépendants s'organisent
- Avoir quelqu'un de confiance qui connaît mon métier

**4. Mes clients savent ce que je fais et ce que j'attends d'eux.**

- Mieux présenter ce que je fais
- Poser plus clairement mes attentes
- Mieux cadrer mes missions dès le départ
- Avoir des retours plus réguliers de mes clients
- Faire connaître tout ce que couvre mon métier


#### Votre place

*Pourquoi on s'y intéresse :* On cherche à savoir si votre travail est reconnu à sa juste valeur, et si votre avis compte dans votre collectif.

**5. Mes clients reconnaissent la valeur de mon travail, et je la facture à son juste prix.**

- Fixer mes prix plus sereinement
- Mieux montrer la valeur de mon travail
- Oser revoir mes tarifs
- Être recommandé plus souvent

**6. Dans mon collectif, mon avis compte et on m'écoute.**

- Prendre plus souvent la parole dans mon collectif
- Partager ce que je sais avec d'autres indépendants
- Être sollicité pour mon avis
- Trouver un collectif qui me ressemble
- Animer un temps d'échange dans mon collectif


#### Votre organisation

*Pourquoi on s'y intéresse :* On s'interroge sur ce qui vous donne de la visibilité : vos priorités, votre agenda, votre trésorerie, et du temps pour piloter votre activité.

**7. Je sais où j'en suis : mes priorités, mon agenda, ma trésorerie.**

- Me fixer des priorités claires pour l'année
- Avoir une vue simple de ma trésorerie
- Mieux organiser mon agenda
- Faire le point chaque mois
- Être accompagné sur la gestion

**8. Je garde du temps pour piloter mon activité, pas seulement pour produire.**

- Bloquer du temps chaque semaine pour piloter
- Prendre du recul avec mon collectif
- M'accorder une vraie pause dans l'année
- Mieux répartir production et pilotage
- M'offrir un temps loin du quotidien


#### Quand ça accroche

*Pourquoi on s'y intéresse :* On regarde comment se règlent les tensions avec un client ou un partenaire : vite et ensemble, ou plus lentement.

**9. Quand ça coince avec un client, on en parle vite et on trouve une solution.**

- Oser en parler plus tôt
- Avoir des repères pour dire les choses
- Mieux cadrer les missions au départ
- Pouvoir demander conseil avant d'en parler
- Trouver plus vite une solution ensemble


#### Qui vous épaule

*Pourquoi on s'y intéresse :* On se demande si vous avez quelqu'un de confiance avec qui parler avant une décision importante.

**10. Avant une décision importante (un prix, un client, un investissement), j'ai quelqu'un avec qui en parler.**

- Avoir quelqu'un de confiance à qui demander conseil
- Bénéficier d'un regard extérieur
- Prendre mes décisions avec plus de recul
- Être accompagné sur les choix importants
- En parler dans un collectif d'indépendants


#### La confiance et le soutien

*Pourquoi on s'y intéresse :* On cherche à savoir si vous pouvez dire les choses franchement, parler d'un doute ou d'une erreur, et sur qui compter quand ça déborde.

**11. Avec mes clients, je peux dire ce que je pense, même quand ce n'est pas ce qu'ils veulent entendre.**

- Oser dire non à un client
- Avoir des repères pour dire les choses
- Poser mes limites dès le départ
- Préparer les échanges délicats avec quelqu'un de confiance

**12. Je peux parler d'un doute ou d'une erreur sur mon activité avec quelqu'un de confiance.**

- Avoir quelqu'un de confiance à qui confier mes doutes
- Parler de mes erreurs sans crainte
- Apprendre des erreurs d'autres indépendants
- Partager ce que m'a appris un échec

**13. Quand je suis bloqué ou débordé, je sais sur qui compter.**

- Savoir plus facilement à qui demander
- Avoir un collectif d'entraide
- Pouvoir déléguer certaines tâches
- Trouver d'autres indépendants pour s'entraider
- Être soutenu dans les périodes chargées


#### Le sens et les résultats

*Pourquoi on s'y intéresse :* On regarde ce qui donne du sens à votre activité, et les résultats qu'elle obtient. Pour nous, les résultats sont une conséquence, pas un point de départ.

**14. Je sais pourquoi j'ai choisi de travailler à mon compte, et ça me porte encore.**

- Me reconnecter à ce qui m'a fait choisir ce métier
- Choisir des missions qui me ressemblent
- Voir l'effet de mon travail chez mes clients
- Prendre le temps de définir ce qui compte pour moi

**15. Je me sens pleinement engagé dans mon activité, avec une énergie qui dure.**

- Prendre soin de mon rythme de travail
- Parler de ma façon de travailler avec d'autres indépendants
- Trouver un meilleur équilibre
- Garder de l'énergie sur la durée

**16. Mon activité atteint les objectifs que je me fixe.**

- Me fixer des objectifs plus clairs
- Suivre mes résultats plus simplement
- Trouver de nouveaux clients
- Être accompagné pour développer mon activité
- Prendre du recul sur ce qui marche


### Résultat

- Grand titre, avec moins de 3 solos : surtitre « Ce que montre l'étude », puis « Là où la confiance, le soutien et la
  cohésion sont réunis, X % des personnes sont engagées. Ailleurs, Y %. Et la performance suit : … »
- Grand titre, avec assez de solos : surtitre « Ce que montrent les indépendants ».
- Gauche :
  - surtitre « Votre regard », puis « *Votre activité,* **telle que vous la voyez.** » ;
  - « Vos réponses, thème par thème : la confiance, le soutien, la cohésion, puis l'engagement et la performance. » ;
  - sur chaque carte, l'étiquette « Votre activité » sur téléphone, et « Ce que vous demandez » s'il a coché des idées.
- Droite :
  - avec moins de 3 solos : « Toute l'étude », « *Ce que montre* **l'étude.** », puis « Pas encore assez d'indépendants pour
    leurs propres chiffres. Voici ce que montrent toutes les réponses. » ;
  - avec assez de solos : « Les indépendants », « *Ce que montrent* **les indépendants.** » ;
  - « X personnes ont répondu à l'état des lieux. ».
- Phrases par thème :
  - « Là où la confiance est là, X % des personnes sont engagées. Là où elle manque, Y %. »
  - « Là où le soutien est là, … Là où il manque, … »
  - « Là où la cohésion est là, … Là où elle manque, … »
  - Engagement : « Là où la confiance, le soutien et la cohésion sont réunis, … Quand l'un des trois manque, … »
  - Performance : « Là où les trois sont réunis, X % des personnes atteignent leurs objectifs. Quand l'un des trois
    manque, … »
- « Ce que demandent les autres indépendants » : le souhait solo le plus choisi, seulement si au moins 3 solos l'ont
  choisi.
- La note « Comment lire ces chiffres » est commune à tous les rôles ; elle n'a pas changé.

