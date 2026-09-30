# Corrections, passe 3 : l'accueil et les illustrations

Colle ce texte dans Claude Code, dans le repo `etat-des-lieux`.

---

L'accueil et le résultat ont été retravaillés dans la maquette. Les fichiers à jour sont déjà dans le repo :

| Fichier | Contenu |
| --- | --- |
| `maquette/Main.dc.html`, `Main-mobile.dc.html` | Nouvel accueil |
| `maquette/Resultat.dc.html`, `Resultat-mobile.dc.html` | Résultat avec illustrations |
| `maquette/Global.dc.html` | Les 4 cartes d'ensemble illustrées |
| `maquette/captures/` | Captures à jour de ces 5 écrans : c'est la référence visuelle |
| `maquette/illustrations/` | Les illustrations en SVG, et `pousses.py` qui les génère |

Reproduis ces écrans. Les nouveaux textes vont dans `contenu.json`, dans une nouvelle section `accueil`, et sont lus depuis là. Mets aussi `DECISIONS.md` à jour. Les règles habituelles restent valables :
- pas de tiret cadratin ;
- espace insécable avant `? ! : ;` ;
- « intervenants », jamais « experts » ;
- rien de commercial (ni Les Fondations, ni offre, ni prix).

## 1. Accueil : le haut de page

**Colonne de gauche**
- Badge inchangé : « État des lieux d'équipe · 2 minutes »
- Titre : **« Ce qui vous aide à bien travailler ensemble »**. Il ne dit plus « votre équipe », pour parler aussi bien aux membres qu'aux managers.
- Texte : « En 2 minutes, voyez ce qui fonctionne déjà entre vous et ce qui peut encore évoluer. De quoi mettre des mots justes sur ce que vous vivez. »
- Bouton « Faire mon état des lieux », compteur « 255 personnes ont déjà participé », mention « Anonyme · Aucun compte à créer · Résultat immédiat ». Tout cela est inchangé.

**Colonne de droite** : l'illustration des quatre pousses (`maquette/illustrations/pousses.svg`). Elle montre, sur le même sol, une graine, une pousse, un jeune plant et un arbre avec ses racines, étiquetés À semer, En germe, En croissance et Bien enraciné. Place-la en SVG dans la page, pas en image : elle doit rester nette et se charger sans requête. Garde son `aria-label`.

Supprime la photo de la Greatly House et l'ancienne carte « Aperçu du résultat » de cet endroit. La carte d'aperçu descend dans la section 3.

## 2. Accueil : les deux « pourquoi », juste sous le haut de page

Deux cartes côte à côte sur toute la largeur, et l'une sous l'autre sur mobile.

**Carte 1**, fond blanc :
- Surtitre en petites capitales sauge : « Pour vous »
- Titre : « Un regard clair sur votre façon de travailler ensemble »
- 3 lignes, chacune précédée d'une pastille de couleur (forêt, sauge, sable) :
  - Ce qui vous porte déjà
  - Ce qui peut encore évoluer
  - Des mots pour en parler, avec vos collègues ou votre manager

**Carte 2**, fond vert forêt `#2D3626`, texte crème :
- Surtitre : « Pour Greatly et ses intervenants »
- Titre : « Une étude pour mieux accompagner les équipes »
- Texte : « Vos réponses, anonymes et regroupées, aident nos intervenants et nos coachs à préparer des ateliers ancrés dans le vécu des équipes, et nos programmes à évoluer. L'étude complète est partagée avec ceux qui le souhaitent. »
- En petit : « Une démarche inspirée des travaux de Jody Hoffer Gittell sur les équipes qui réussissent ensemble. » Les mots « travaux de Jody Hoffer Gittell » renvoient à l'ancre `#dimensions`.

## 3. Accueil : « Ce que vous recevez en 2 minutes »

Remplace la section « À la fin, vous recevez » et ses 3 boîtes.

- Surtitre : « Votre résultat ». Titre : « Ce que vous recevez en 2 minutes ».
- 4 points numérotés 01 à 04 : numéro en Playfair sauge clair, titre en Playfair, texte en taupe, un filet fin au-dessus de chaque point. Sur ordinateur, les points sont **en grille 2 × 2**, et la carte « Aperçu du résultat » est à droite. Sur mobile, ils sont en liste et l'aperçu vient en dessous.
  1. **Une lecture d'ensemble** : « En quelques lignes, la façon dont vous travaillez ensemble, vue depuis votre place. »
  2. **Huit repères, quatre couleurs** : « Le cap commun, l'info, la confiance, le soutien… Chaque repère prend l'une des quatre couleurs, de À semer à Bien enraciné. Jamais de note. »
  3. **Une phrase pour chaque repère** : « Ce qui est déjà là, et ce qui peut encore évoluer, dit simplement et sans jugement. »
  4. **Un lien rien qu'à vous** : « Gardez votre résultat en favoris et retrouvez-le quand vous voulez. Sans compte, sans e-mail. »
- La carte d'aperçu garde son contenu. Seule la dernière phrase change : « Pas de note ni de classement : une photo de ce que vous vivez aujourd'hui. » Aucune pastille ne doit passer sur 2 lignes (`white-space: nowrap`).

## 4. Accueil sur mobile (390)

Ordre :
1. badge ;
2. titre ;
3. texte ;
4. bouton et compteur ;
5. mention « Anonyme » ;
6. illustration **sans ses étiquettes internes** (`pousses-sans-etiquettes.svg`), avec en dessous les 4 étiquettes en pastilles HTML de 12px sur une ligne ;
7. carte « Pour vous » ;
8. carte « Pour Greatly et ses intervenants » ;
9. « Ce que vous recevez » ;
10. le reste de la page.

Le bouton doit être visible sans défiler sur un écran de 390 × 800.

## 5. Résultat : les illustrations

- **Carte d'ensemble** : à droite du texte, un médaillon rond avec la pousse du niveau obtenu (`scene-semer.svg`, `scene-germe.svg`, `scene-croissance.svg`, `scene-enracine.svg`), 180px sur ordinateur. Sur mobile, le médaillon fait 120px et se place centré, au-dessus de l'étiquette « Votre équipe, dans votre regard : … ».
- **En-tête de chaque colonne de couleur** : à droite du nom, la petite pousse du niveau dans un rond crème de 34px (`icone-*.svg`).
- Les illustrations sont décoratives (`aria-hidden="true"`) : le niveau est toujours écrit en toutes lettres à côté.
- Le choix de l'illustration suit le niveau calculé par `calcul.js`. Ajoute un test qui vérifie la correspondance pour les 4 niveaux.

## 6. Outil interne

Si le repo contient une page qui liste les 4 cartes d'ensemble, ajoute-leur aussi leur médaillon, comme dans `maquette/Global.dc.html`.

## 7. Vérification

- Captures à 1280 et à 390, dans Chromium et WebKit, comparées à `maquette/captures/Main*.png`, `Resultat*.png` et `Global.png`.
- Sur ordinateur (1280 × 800), le premier écran montre le titre, le texte, le bouton et l'illustration.
- Balises Open Graph mises à jour avec le nouveau titre.
- Aucun texte de l'accueil ne dit « votre équipe » pour s'adresser à la personne.
- Un commit par section, changelog du README à jour, `V` incrémenté.
