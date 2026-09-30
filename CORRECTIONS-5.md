# Corrections, passe 5 : les envies de la personne dans son résultat

Colle ce texte dans Claude Code, dans le repo `etat-des-lieux`, **après** la passe 4.

---

Quand la personne répond « Pas encore » ou « Un peu », elle coche ce qu'elle aimerait (« J'aimerais… »). Aujourd'hui, ces envies partent dans le Sheet et n'apparaissent jamais dans son résultat. C'est dommage : c'est la partie la plus personnelle et la plus utile de son bilan. On les lui rend, avec ses mots.

Référence visuelle : `maquette/Resultat.dc.html`, `Resultat-mobile.dc.html` et leurs captures dans `maquette/captures/`.

## 0. Les couleurs du résultat en bandeaux pleine largeur (à faire en premier)

Les 4 colonnes côte à côte sont difficiles à lire : le texte est serré et les colonnes ont des hauteurs très différentes. On passe à des **bandeaux empilés, sur toute la largeur de la carte**. Voir `maquette/captures/Resultat.png`.

- Un bandeau par niveau présent, dans l'ordre Bien enraciné, En croissance, En germe, À semer. Un niveau sans dimension n'apparaît pas.
- L'en-tête du bandeau reprend la couleur du niveau, avec la petite pousse (30px) **à gauche** du nom, et 12px de marge haute et basse.
- Dessous, sur fond blanc, une ligne par dimension, séparée par un filet fin :
  - sur ordinateur : le nom de la dimension à gauche (colonne de 260px, en gras), la phrase à droite (16px, taupe foncé) ;
  - sur mobile : le nom au-dessus, la phrase en dessous.
- Supprime la légende des 4 couleurs au-dessus des bandeaux : chaque bandeau porte déjà son nom.
- Les phrases « Ce qui vous porte le plus… » et « Votre regard est contrasté… » restent dans le paragraphe de la carte d'ensemble, au-dessus des bandeaux.
- Le bloc « Ce que vous aimeriez vivre » (section 1) garde la même logique visuelle : nom de la dimension à gauche, phrases à droite.

## 1. Le nouveau bloc du résultat

Place-le juste **après** la grande carte (carte d'ensemble et colonnes de couleur) et **avant** la ligne « Bientôt… ».

- Surtitre en petites capitales sauge : « Avec vos mots »
- Titre : « Ce que vous aimeriez vivre dans votre équipe »
- Texte : « Ce sont les envies que vous avez exprimées en répondant. Elles peuvent ouvrir une conversation, avec vos collègues ou votre manager. »
- Puis une ligne par dimension concernée :
  - à gauche, la petite pousse du niveau de la dimension (`icone-*.svg`, 32px) et son nom ;
  - à droite, les phrases, en Playfair, entre guillemets français.

  Sur mobile, le nom de la dimension passe au-dessus des phrases.
- Ordre des dimensions : de la moins installée à la plus installée, puis dans l'ordre des dimensions en cas d'égalité.

## 2. Comment écrire les phrases

Chaque phrase reprend le début de la relance, suivi des choix cochés. Les choix ont été écrits pour continuer ce début de phrase.

- On retire les points de suspension du début de phrase et on met en minuscule la première lettre du choix. On termine par un point.
  - « J'aimerais… » + « Qu'on échange plus souvent en direct » donne « J'aimerais qu'on échange plus souvent en direct. »
  - « J'aimerais recevoir des infos… » + « Plus tôt » donne « J'aimerais recevoir des infos plus tôt. »
  - « J'aimerais que mes collègues… » + « Sachent mieux ce dont j'ai besoin d'eux » donne « J'aimerais que mes collègues sachent mieux ce dont j'ai besoin d'eux. »
- **Deux choix** pour la même affirmation : une seule phrase, reliée par « et ». Exemple : « J'aimerais qu'on échange plus souvent en direct et qu'on partage un outil ou un planning commun. »
- **« Autre »** n'a pas de texte. Seul, il donne « J'aimerais que les choses évoluent sur ce point. » Avec un autre choix, on l'ignore dans la phrase.
- **Élision** : si le choix commence par une voyelle après « que » (« que on »…), applique l'élision. Tous les choix actuels commencent déjà par « Qu'on » ou par un verbe, mais écris un test qui le garantit pour les 16 relances, en version membre et manager.
- Les phrases sont générées depuis `contenu.json`, jamais écrites à la main dans le code.
- Si une affirmation a 2 choix et qu'une autre de la même dimension en a aussi, cela fait 2 phrases dans la même ligne de dimension.

## 3. Quand il n'y a rien à montrer

- Aucune réponse « Pas encore » ou « Un peu » : le bloc n'apparaît pas.
- Des réponses réservées, mais aucun choix coché : affiche le bloc en version courte, sans liste : « Vous n'avez pas précisé ce que vous aimeriez. Si une envie vous vient, vous pouvez refaire l'état des lieux quand vous le souhaitez. » Mets un lien vers l'accueil.

## 4. Le lien personnel doit garder les envies

Le résultat se calcule depuis le lien personnel. Il faut donc que le lien contienne aussi les choix cochés, sinon le bloc disparaît quand la personne revient plus tard.

- Nouveau format, version `v2` : `#v2-{r}{16 chiffres}` suivi, pour chaque affirmation relancée, de `-{n}.{choix}`. `n` est le numéro de l'affirmation, de 1 à 16. Les choix sont les indices dans `contenu.json`, `a` pour « Autre », sans séparateur (2 au plus).
  - Exemple : `#v2-m2211220023232212-3.14-7.04-8.1-15.a`.
- Le lien ne contient toujours **aucune donnée personnelle** : seulement des chiffres de réponse et des indices de choix.
- Les liens `v1` déjà créés restent lisibles : ils affichent le résultat sans le bloc des envies.
- Refuse proprement un lien mal formé (indice inexistant, relance sur une réponse à 2 ou 3, plus de 2 choix) : affiche le résultat sans le bloc, sans erreur.
- `lien.js` : encodage et décodage, avec des tests aller-retour sur des cas au hasard, y compris les 16 relances ouvertes.
- Mets `DECISIONS.md` à jour : « Le lien personnel contient les réponses et les envies cochées, pour que le résultat les montre à chaque visite. Toujours aucune donnée personnelle. »

## 5. Ce qui ne change pas

- Le calcul des couleurs et la carte d'ensemble ne dépendent pas des envies.
- Le backend reçoit les relances comme avant, dans la même réponse. Rien à changer côté Sheet.
- Pas de chiffres, pas de pourcentages dans ce bloc.

## 6. Vérification

- Captures à 1280 et 390, dans Chromium et WebKit, comparées aux captures de la maquette :
  - un cas avec 3 dimensions concernées ;
  - un cas sans aucune envie ;
  - un cas avec des réponses réservées mais aucun choix coché.
- Rejoue le parcours complet : cocher des envies, voir le résultat, copier le lien, l'ouvrir dans un nouvel onglet. Les envies sont toujours là.
- Un commit par section, changelog du README à jour, `V` incrémenté.
