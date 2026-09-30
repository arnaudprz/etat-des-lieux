# Corrections, passe 3 : l'accueil dit enfin à quoi ça sert

Colle ce texte dans Claude Code, dans le repo `etat-des-lieux`.

---

Le haut de l'accueil décrit l'exercice mais ne dit pas ce qu'on y gagne, ni à quoi servent les réponses. La carte « Aperçu du résultat » prend la moitié de l'écran sans rien expliquer. On réorganise le haut de page pour dire les deux « pourquoi » : pour vous, et pour Greatly.

Ces textes remplacent ceux de l'accueil. Ajoute-les dans `contenu.json`, dans une nouvelle section `accueil`, et lis-les depuis là. Mets aussi `QUESTIONS.md` et `DECISIONS.md` à jour.

## 1. Le haut de page (colonne de gauche)

- Badge inchangé : « État des lieux d'équipe · 2 minutes »
- Titre : **« Ce qui aide votre équipe à bien travailler ensemble »**
- Texte : « En 2 minutes, voyez ce qui fonctionne déjà entre vous et ce qui peut encore grandir. Huit repères simples : le cap commun, la circulation de l'info, la confiance, le soutien… De quoi mettre des mots justes sur ce que vous vivez. »
- Bouton « Faire mon état des lieux » et compteur « 255 personnes ont déjà participé », inchangés.
- « Anonyme · Aucun compte à créer · Résultat immédiat », inchangé.

## 2. Le haut de page (colonne de droite) : les deux « pourquoi »

À la place de la carte « Aperçu du résultat », deux cartes empilées, même style que les cartes actuelles (fond blanc, coins 16px) :

**Carte 1, « Pour vous »**, avec 3 lignes, chacune précédée d'une pastille de couleur (dans l'ordre forêt, sauge, sable) :
- Ce qui porte déjà votre équipe
- Ce qui peut encore grandir
- Des mots pour en parler, avec votre équipe ou votre manager

**Carte 2, « Pour Greatly et ses intervenants »** :
> Vos réponses, anonymes et regroupées, nourrissent une étude menée par Greatly. Elle aide nos intervenants et nos coachs à préparer des ateliers ancrés dans le vécu des équipes, et nos programmes à évoluer. L'étude complète est partagée avec ceux qui le souhaitent.

Règles de ton : dire « intervenants », jamais « experts ». Ne nommer ni Les Fondations ni aucune offre. Aucun prix, aucun lien commercial.

## 3. La carte « Aperçu du résultat » descend

Déplace-la telle quelle dans la section « À la fin, vous recevez ». Sur ordinateur, place les 3 cartes actuelles en colonne à gauche, sur 2/3 de la largeur, et l'aperçu à droite, sur 1/3. L'aperçu illustre ce que décrivent les cartes. Garde son contenu, y compris « Pas de note ni de classement : une photo de votre équipe aujourd'hui. »

## 4. Une ligne de source, juste sous le texte d'intro

En petit, taupe : « Une démarche inspirée des travaux de Jody Hoffer Gittell sur les équipes qui réussissent ensemble. » Le mot « travaux » renvoie à l'ancre `#dimensions`, la section « Sur quoi repose l'état des lieux ».

## 5. Mobile (390)

Ordre sur mobile :
1. badge ;
2. titre ;
3. texte ;
4. ligne de source ;
5. bouton et compteur ;
6. mention « Anonyme » ;
7. carte « Pour vous » ;
8. carte « Pour Greatly et ses intervenants » ;
9. puis la suite de la page.

Le bouton reste visible sans défiler sur un écran de 390 × 800. Si ce n'est pas le cas, raccourcis les marges, pas les textes.

## 6. Vérification

- Captures avant et après à 1280 et à 390, dans Chromium et WebKit.
- Le haut de page tient dans le premier écran sur ordinateur (1280 × 800) : titre, texte, bouton et les deux cartes.
- Balises Open Graph mises à jour avec le nouveau titre.
- Aucun tiret cadratin, espaces insécables avant `? ! : ;`.
- Un commit, changelog du README à jour, `V` incrémenté.
