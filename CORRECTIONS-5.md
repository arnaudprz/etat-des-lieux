# Corrections, passe 5 : un résultat en bandeaux, avec les idées de la personne

Colle ce texte dans Claude Code, dans le repo `etat-des-lieux`, **après** la passe 4.

---

Quand la personne répond « Pas encore » ou « Un peu », elle coche ce qu'elle aimerait (« J'aimerais… »). Aujourd'hui, ces envies partent dans le Sheet et n'apparaissent jamais dans son résultat. C'est dommage : c'est la partie la plus personnelle et la plus utile de son bilan. On les lui rend, reformulées simplement, sous la dimension qu'elles concernent.

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

## 1. Les idées de la personne, dans chaque bandeau

Pas de bloc à part : les idées apparaissent **là où elles se rapportent**, juste sous la phrase de la dimension concernée, dans son bandeau. Voir `maquette/captures/Resultat.png`.

- Encadré sable clair (`#F7F1E3`, coins 12px, marge haute 12px), sous la phrase de la dimension.
- Petit surtitre en capitales terre foncée (`#7A5424`) : « Vos idées pour faire évoluer » (`envies.titre`).
- **Une seule phrase**, en Playfair 19px (17px sur mobile), qui reformule les choix cochés. Par exemple : « Plus d'échanges en direct, un outil ou un planning commun et des infos qui arrivent plus tôt. »
- **Rien d'autre dans l'encadré** : pas de phrase d'empathie, pas d'encouragement, pas d'interprétation. La personne a proposé des idées, on les lui rend telles quelles, sans supposer qu'elle ou son équipe va mal.

## 2. Comment écrire la phrase

Les textes sont dans **`envies.json`**, à la racine du repo. Intègre-les dans `contenu.json`, dans une nouvelle section `envies`, et génère les phrases depuis là. Aucun texte n'est écrit en dur dans le code.

- `fragments` : pour chaque affirmation (1 à 16) et chaque version (`membre`, et `manager` quand elle existe), une reformulation de chaque choix sous forme de groupe nominal, **dans le même ordre** que les choix de `contenu.json`. Si la version `manager` n'existe pas, on prend `membre`.
- **Phrase d'une dimension** : tous les fragments des choix cochés dans les affirmations de cette dimension, dans l'ordre des affirmations, reliés ainsi : « a », « a et b », « a, b et c ». Majuscule au premier mot, point final.
- **« Autre »** : ajoute « d'autres idées encore » en dernier. S'il est seul pour toute la dimension, la phrase est « Une idée à préciser. »
- **Affirmation 16** (résultats) : elle n'appartient à aucune dimension et n'apparaît pas dans les bandeaux. Si elle a des idées, ajoute sous le dernier bandeau un encadré sable seul, titré « Pour avancer vers vos objectifs » (`envies.resultats_titre`), avec sa phrase.
- Ajoute un test qui vérifie, pour les 16 affirmations et les 2 versions, qu'il y a autant de fragments que de choix.
- Ajoute un test de construction des phrases : 1, 2, 3 et 4 fragments, « Autre » seul, « Autre » avec d'autres choix.

## 3. La ligne de fin, et quand il n'y a rien à montrer

- Si la personne a coché au moins une idée, affiche **une seule ligne sobre** juste après la grande carte, avant « Bientôt… », en DM Sans 16px, sans encadré : « Ces idées sont les vôtres. Elles peuvent nourrir une prochaine discussion, avec vos collègues ou votre manager. » (`envies.phrase_finale`).
- Une dimension sans idée cochée n'a pas d'encadré.
- Aucune idée cochée nulle part : ni encadré, ni ligne de fin. Aucun message.
- Mets `DECISIONS.md` à jour : « Les idées cochées sont reformulées et placées sous la dimension concernée, sans commentaire. Ce sont des idées, pas des problèmes : on ne console pas, on ne conseille pas. Une seule ligne sobre invite à en parler. »

## 4. Le lien personnel doit garder les envies

Le résultat se calcule depuis le lien personnel. Il faut donc que le lien contienne aussi les choix cochés, sinon le bloc disparaît quand la personne revient plus tard.

- Nouveau format, version `v2` : `#v2-{r}{16 chiffres}` suivi, pour chaque affirmation relancée, de `-{n}.{choix}`. `n` est le numéro de l'affirmation, de 1 à 16. Les choix sont les indices dans `contenu.json`, `a` pour « Autre », sans séparateur (2 au plus).
  - Exemple : `#v2-m2211220023232212-3.14-7.04-8.1-15.a`.
- Le lien ne contient toujours **aucune donnée personnelle** : seulement des chiffres de réponse et des indices de choix.
- Les liens `v1` déjà créés restent lisibles : ils affichent le résultat sans les idées.
- Refuse proprement un lien mal formé (indice inexistant, relance sur une réponse à 2 ou 3, plus de 2 choix) : affiche le résultat sans le bloc, sans erreur.
- `lien.js` : encodage et décodage, avec des tests aller-retour sur des cas au hasard, y compris les 16 relances ouvertes.
- Mets `DECISIONS.md` à jour : « Le lien personnel contient les réponses et les envies cochées, pour que le résultat les montre à chaque visite. Toujours aucune donnée personnelle. »

## 5. Ce qui ne change pas

- Le calcul des couleurs et la carte d'ensemble ne dépendent pas des envies.
- Le backend reçoit les relances comme avant, dans la même réponse. Rien à changer côté Sheet.
- Pas de chiffres, pas de pourcentages dans les encadrés d'idées.

## 6. Vérification

- Captures à 1280 et 390, dans Chromium et WebKit, comparées aux captures de la maquette :
  - un cas avec 3 dimensions concernées ;
  - un cas avec des envies sur l'affirmation 16 ;
  - un cas manager ;
  - un cas sans aucune envie ;
  - un cas avec des réponses réservées mais aucun choix coché.
- Rejoue le parcours complet : cocher des envies, voir le résultat, copier le lien, l'ouvrir dans un nouvel onglet. Les envies sont toujours là.
- Un commit par section, changelog du README à jour, `V` incrémenté.
