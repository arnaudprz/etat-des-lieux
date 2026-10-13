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


## Bug solo : la question « Taille de votre équipe » (13 octobre 2026, soir, EN LOCAL, non déployé)

### Ce que j'ai cherché

J'ai reproduit dans des navigateurs neufs, en navigation privée et sans cache :
- Chrome et WebKit (le moteur de Safari) ;
- sur ordinateur et sur téléphone ;
- en ligne et en local avec `?demo=1` ;
- au clic et au tap ;
- avec un retour au profil depuis les questions.

Dans tous ces cas, le bloc finissait par se masquer. Le seul défaut net : une taille d'équipe choisie avant de passer en solo
restait cochée en cachette. Elle n'était pas envoyée, mais elle n'était pas effacée non plus.

### La vraie cause

Le masque de `pont-site.js` venait **après** l'affichage. La maquette dessinait le bloc, puis `pont-site.js` le cachait :
- après un clic, une fraction de seconde plus tard ;
- ou quand l'observateur de la page voyait changer des éléments.

Mesuré : juste après le clic solo, le rôle vaut bien 2, mais le bloc est encore visible. Il ne disparaît qu'au tour suivant.
Ça dépend du rythme du navigateur et de l'appareil. Et un changement qui ne touche que des attributs, une pastille cochée par
exemple, ne réveille pas l'observateur. Sur un appareil plus lent, ou avec un autre ordre d'événements, le bloc pouvait
rester affiché.

Le cache peut avoir aggravé les choses. Les fichiers retouchés de la maquette gardaient le même nom qu'avant, donc un
navigateur pouvait mélanger des versions pendant quelques minutes.

### La correction

- **La maquette ne dessine plus le bloc pour un solo.** Le modèle l'entoure d'un « si avecEquipe », et la logique calcule
  `avecEquipe = rôle différent de solo`. Plus de masque après coup, donc plus de question de timing. Le bloc revient dès qu'on
  repasse manager ou membre, à la même place, et reste obligatoire pour eux.
- **Choisir solo efface la taille d'équipe déjà cochée.** Un solo envoie toujours `taille_equipe` vide.
- **Le bouton pour passer aux questions** ne demande pas la taille d'équipe à un solo. C'était déjà le cas, et c'est vérifié.
- **Retour au profil depuis les questions :** le bloc reste absent pour un solo. Il n'y a pas de reprise de profil depuis la
  session : la maquette repart d'un profil vide au rechargement. Ce chemin n'existe donc pas.
- **Caches :** les 7 fichiers de la maquette retouchés et leur chargeur portent un nouveau nom (`-s14`), les 4 pages pointent
  vers ce nouveau chargeur, et `V` passe à 33.
- `scripts/solo-maquette.mjs` fait maintenant aussi cette quatrième retouche. On peut toujours le relancer.

### Vérifications

- `npm test` : 200 tests réussis, dont les nouveaux tests solo :
  - le modèle n'a le bloc que sous condition ;
  - choisir solo efface la taille ;
  - un solo envoie `taille_equipe` vide.
  
  Le seul échec reste l'ancien `agregats.test.js` de l'admin supprimé.
- `scripts/test-parcours-solo.mjs` passe sur les 4 combinaisons : Chrome et WebKit, ordinateur et téléphone, chaque fois dans
  un navigateur neuf. Il vérifie que :
  - membre demande la taille, solo la fait disparaître, manager la fait revenir ;
  - un solo passe aux questions ;
  - au retour au profil, le bloc est toujours absent ;
  - l'envoi part avec `taille_equipe` vide ;
  - le résultat solo s'ouvre.
- Manager et membre : les captures des résultats, avant et après, sont identiques au pixel près sur ordinateur et téléphone.
  Le questionnaire ne change que par le bloc de fin (« Comment voyez-vous / votre travail ? »), demandé au point 5.

## Suite (13 octobre 2026, soir) : versions, seuil solo, textes de l'accueil. EN LOCAL, non déployé

Le correctif de la taille d'équipe (section précédente) est en ligne depuis ce soir. Il a été vérifié en ligne sur Chrome et
WebKit, ordinateur et téléphone. Tout ce qui suit est en local.

### Causes trouvées

- **Cache.** Les modules du parcours s'importaient sans version (`calcul.js`, `api.js`, `session.js`, `commun.js`, etc.),
  ou avec des versions différentes d'un fichier à l'autre. Les fichiers de la maquette gardaient leur nom après
  retouche. Un navigateur pouvait donc garder un ancien fichier et le mélanger aux nouveaux.
- **Taille d'équipe.** Voir la section précédente : un masque posé après coup, qui dépendait du rythme du navigateur.
  Corrigé dans la maquette elle-même.
- **Chiffres solo.** Avec 5 solos, la page passait aux chiffres des indépendants dès 3 réponses. Presque toutes les cases
  comptaient moins de 3 personnes, d'où les « — » et les « Moins de 3 personnes : pas de chiffre ».

### Ce qui a changé

1. **Une seule version partout.**
   - `V` dans `config.js` (35). Tous les imports internes des modules et toutes les pages portent `?v=35`.
   - `scripts/verifier-versions.mjs` le vérifie, et il est dans `npm test` (`tests/versions.test.js`). À lancer avant chaque
     livraison.
   - Dans `pont-site.js`, un rôle qui ne correspond à aucune clé connue n'enregistre rien et recharge la page.
2. **Taille d'équipe** : déjà corrigée et en ligne (section précédente). Pour manager et membre, la question reste
   obligatoire, à la même place.
3. **Résultat solo, seuil** (`docs/assets/js/seuil-solo.js`, `SEUIL_SOLO = 30`, facile à changer) :
   - **Chiffres des indépendants** seulement à partir de 30 réponses solo, et si chaque case de la page compte au moins
     3 personnes. Titre : « Ce que montrent les indépendants ».
   - **Sinon, toute l'étude** (`edl_these` sans rôle), avec les mêmes % et les mêmes phrases que pour les équipes, sans
     mot d'équipe. Titre : « Ce que montre l'étude », avec la ligne « Pas encore assez d'indépendants pour leurs propres
     chiffres. Voici ce que montrent toutes les réponses. »
   - Jamais de mélange sur une même page, jamais de « — ».
   - « Ce que demandent les autres indépendants » n'apparaît qu'au-dessus du seuil, et si au moins 3 solos ont choisi
     l'idée.
   - En démonstration, `?demo=1&solos=N` montre la bascule avec des chiffres fictifs.
4. **Accueil, trois textes** (table `TEXTES` de `pont-site.js`, sur ordinateur et téléphone) :
   - **« Ce que nous y gagnons », à droite :** « Vos réponses restent anonymes. Regroupées, elles servent une étude qui
     vérifie une idée simple : quand la confiance, le soutien et la cohésion sont là, on s'engage davantage, et les
     résultats suivent. En équipe comme à son compte. L'étude complète est partagée avec ceux qui le souhaitent. » Le
     téléphone a la même phrase.
   - **« Sur quoi repose » :** « Sur les travaux de Jody Hoffer Gittell, à l'université Brandeis : quand on vise le même
     objectif, qu'on sait ce que fait l'autre et qu'on se respecte, on travaille mieux ensemble. En équipe comme avec ses
     partenaires. »
   - **Bloc « Anonyme » (ordinateur) :** « Anonyme et sans compte : personne ne sait qui a répondu. Votre résultat s'affiche
     tout de suite. Vos réponses, regroupées avec les autres, nourrissent l'étude. » Il y a une espace avant le lien
     « Politique de confidentialité de l'état des lieux », qui pointe toujours vers `/etat-des-lieux/confidentialite/`.
     Le téléphone n'a pas ce bloc, et le questionnaire non plus.

### Fichiers touchés

- `docs/assets/js/seuil-solo.js` (nouveau)
- `docs/assets/js/parcours/resultat-these.js`
- `docs/assets/js/parcours/pont-site.js`
- `docs/assets/js/config.js` (`V = 35`)
- tous les modules de `docs/assets/js/` (imports en `?v=35`)
- toutes les pages `.html` (scripts et feuilles en `?v=35`)
- `scripts/verifier-versions.mjs` (nouveau), `tests/versions.test.js` (nouveau)
- `tests/solo.test.js` : seuil, taille d'équipe, modèle

### Réponses enregistrées comme « membre » à la place d'un solo

La table ne garde ni le libellé choisi, ni l'heure : seulement le rôle et la date. On ne peut donc pas prouver qu'une
réponse « membre » venait d'un solo.

Le 13 octobre, il y a 2 réponses « membre », toutes deux avec une taille d'équipe :
- « 2 à 5 personnes », 1 à 9 salariés, Énergie, eau et environnement ;
- « 6 à 12 personnes », 10 à 49 salariés, BTP et construction.

Un solo transformé en membre par un ancien fichier aurait dû choisir une taille d'équipe, donc on ne peut pas les écarter
non plus. Rien n'a été modifié.

Les 5 réponses solo du 13 octobre sont correctes : rôle `solo`, taille d'équipe vide. Elles comptent dans l'étude solo.

### Vérifications

- `npm test` : 206 tests réussis. Seul échoue l'ancien `agregats.test.js`, comme avant.
- `scripts/test-parcours-solo.mjs` en navigation privée (navigateurs neufs) : Chrome et WebKit, ordinateur et téléphone,
  tout est bon.
- **Cache :** dans un même navigateur, d'abord tout le site en `v=30`, servi avec 10 minutes de cache comme GitHub, puis le
  site actuel. La nouvelle page est chargée (`v=34` au moment du test). Le parcours solo complet est correct : pas de
  taille d'équipe, idées solo, envoi `solo` avec une taille vide, résultat en `-s`, aucun « Les managers / Les équipes ».
  Vérifié avec Chrome et WebKit, sur ordinateur et téléphone.
- **Résultat solo :**
  - avec la vraie base en lecture seule (5 solos) : toute l'étude, par exemple « Là où la confiance est là, 96 % des
    personnes sont engagées » ;
  - en démo avec 5 et 29 solos : toute l'étude ;
  - en démo avec 40 solos : les indépendants, avec leur demande ;
  - jamais de « — », de « Moins de 3 » ni de mot d'équipe.
- **Manager et membre :** les captures des résultats sont identiques au pixel près, avant et après, sur ordinateur et
  téléphone (`captures/corrections-14/*-apres-suite.png`).

### Ordre de mise en ligne

Aucune migration n'est nécessaire : `edl_these` accepte déjà un appel sans rôle. Il suffit de pousser le site, avec ton
accord.

## Changement de règle : un solo ne voit que des chiffres d'indépendants (13 octobre 2026, soir, EN LOCAL)

Arnaud : « on ne va pas montrer des chiffres d'équipes à un solopreneur, ça n'a pas de sens ». Il a choisi « ses chiffres
dès que possible ». **Cette règle remplace le seuil de 30 décrit plus haut.**

### La nouvelle règle

- **Que des chiffres d'indépendants.** Un solo ne voit jamais les chiffres des équipes ni ceux de « toute l'étude ». Si la
  base ne renvoie pas de chiffres solo, la page fait comme s'il n'y avait encore aucun indépendant.
- **Case par case.** Un thème affiche ses % dès que 3 indépendants au moins sont de chaque côté (« là où c'est là » et
  « là où ça manque »). Sinon, la carte dit : « Le chiffre des indépendants s'affiche ici dès que 3 d'entre eux au moins
  sont de chaque côté. » Jamais de « — ».
- **Titres :** toujours « Ce que montrent les indépendants ». Tant qu'un thème attend, une ligne sous le titre :
  « Leurs chiffres apparaissent thème par thème, dès que 3 indépendants au moins sont de chaque côté. »
- **Grand nombre :** « N indépendants ont répondu à l'état des lieux », au lieu du total de toutes les personnes.
- **Haut de page** (la thèse avec ses chiffres) : il s'affiche dès que les deux groupes « trois réunis » et « l'un des
  trois manque » comptent chacun au moins 3 indépendants. Corrigé au passage : il restait masqué quand les chiffres
  arrivaient après un premier affichage vide.
- **« Ce que demandent les autres indépendants » :** l'idée solo la plus choisie, dès qu'au moins 3 solos l'ont choisie.

### Aujourd'hui, avec la vraie base

Il y a 5 indépendants. Pour chaque thème, l'un des deux côtés compte moins de 3 personnes. Un solo voit donc ses propres
réponses à gauche, et à droite :
- les 5 cartes « Le chiffre des indépendants s'affiche ici… » ;
- « 5 indépendants ont répondu » ;
- le bloc des demandes, puisqu'au moins 3 solos ont choisi une même idée.

Aucun chiffre d'équipe n'apparaît. Les % viendront tout seuls avec les prochaines réponses solo.

### Fichiers

- `docs/assets/js/seuil-solo.js` : il ne contient plus de seuil, seulement `caseSolo`, `chiffresPourSolo` et `VIDE_SOLO`.
- `docs/assets/js/parcours/resultat-these.js`.
- `tests/solo.test.js` : les tests du seuil sont remplacés par « jamais les chiffres d'un autre rôle » et « une case dès
  3 indépendants ».

### Vérifications

- `npm test` : 203 tests réussis. Seul échoue l'ancien `agregats.test.js`, comme avant.
- Résultat solo :
  - en démo avec 0, 8 et 40 indépendants, sur ordinateur et téléphone ;
  - avec la vraie base en lecture seule (5).
- Dans tous les cas : aucun chiffre d'équipe, aucun « Toute l'étude », aucun « — », aucun mot d'équipe.
- Manager et membre : captures identiques au pixel près.
