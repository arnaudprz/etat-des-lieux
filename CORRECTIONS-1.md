# Corrections, passe 1

Colle ce texte dans Claude Code, dans le repo `etat-des-lieux`.

---

J'ai relu la version locale : tout le parcours à 1280 et à 390, le tableau de bord en mode démo, les 133 tests, et un parcours rejoué dans un navigateur. La base est solide et fidèle aux maquettes :
- aucun chiffre côté répondant ;
- lien personnel correct ;
- relances limitées à 2 choix ;
- pas de défilement horizontal sur mobile ;
- aucune erreur console.

Voici ce qu'il reste à corriger, par ordre de priorité. Pour chaque point visuel, compare avec la capture de `maquette/captures/` à la même largeur, avant et après.

## A. Données du tableau de bord (priorité)

1. **Les réponses papier faussent deux indicateurs.**
   - *Liens personnels copiés* : la part est calculée sur toutes les réponses, papier compris. Or une réponse papier n'a pas de lien. Divise par les réponses **en ligne** terminées.
   - *Taux de complétion* : il ne concerne que l'en ligne. Écris-le sous le chiffre.
   - Sous *Répondants*, ajoute la répartition « dont X en ligne et Y papier », en plus de managers et membres.
2. **L'entonnoir ne suit pas les filtres de profil**, et c'est normal : les événements n'ont pas de profil. Mais la page dit que « tout se recalcule ».
   - Écris sous le titre de l'entonnoir qu'il suit seulement la période.
   - Masque-le quand le filtre Source est sur Papier.
   - Fais la même chose pour la carte *Taux de complétion*.
3. **Les données fictives sont incohérentes.**
   - Le mode démo annonce 412 questionnaires terminés dans l'entonnoir, mais seulement 354 réponses en ligne. Les deux doivent être égaux.
   - La répartition des cartes d'ensemble tombe à 0 % en Bien enraciné et 64 % en germe. Vise un ordre de grandeur proche de la maquette : environ 12, 41, 34 et 13 %.
   - Les souhaits les plus choisis montent à 67 et 78 %. Vise 30 à 45 %, comme dans la maquette.

   Des chiffres irréalistes empêchent de juger la mise en page et les textes de « L'essentiel ».
4. **Demandes de l'étude complète.**
   - Le tableau affiche 15 lignes. Affiche les 5 plus récentes, avec un bouton « Voir les 87 demandes » qui déplie le reste.
   - Le bouton « Exporter les contacts (CSV) » a l'air désactivé. Donne-lui le style actif de la maquette : bordure sauge, texte encre.
   - Remets sous le titre la phrase de la maquette : « 87 personnes, soit 21 % des répondants. Ces coordonnées ne sont jamais reliées aux réponses. »

## B. Parcours public, écarts avec les maquettes

5. **Affirmations, espacement entre les cartes.** Les cartes se touchent presque, sur ordinateur comme sur mobile. Remets l'écart de la maquette : 12px entre deux cartes d'un même groupe, environ 40px avant chaque titre de groupe et 16px après.
6. **Encadré de relance.** Le début de phrase (« J'aimerais… ») est posé sur la bordure haute de l'encadré sable et paraît coupé. Place-le à l'intérieur de l'encadré, avec la marge interne de la maquette (environ 16px en haut, 18px sur les côtés). Garde un vrai `<legend>` pour l'accessibilité, en neutralisant son positionnement par défaut.
7. **Accueil, carte « Aperçu du résultat ».** Les 3 lignes sont collées. Remets 20px entre chaque ligne, comme dans la maquette, sur ordinateur et sur mobile.
8. **Profil.** L'espace est trop serré entre chaque intitulé (« Taille de votre entreprise »…) et ses choix. Mets 12px sous l'intitulé et environ 28px entre deux blocs. Garde 8px entre les pastilles.
9. **Résultat sur mobile.** L'étiquette « Votre équipe, dans votre regard : En germe » passe sur 2 lignes dans une pilule arrondie, ce qui donne une forme bizarre. Sur mobile, réduis la taille du texte de l'étiquette (13px) et son padding horizontal. Si elle passe quand même sur 2 lignes, utilise un rayon de 12px au lieu d'une pilule.
10. **Résultat, bloc « Recevoir l'étude complète ».** Le paragraphe d'introduction est en noir. Mets-le en taupe `#6B6460`, comme les autres textes secondaires.
11. **Formulaire de contact.** Quand il manque des champs, le message d'erreur est présent deux fois dans des zones `aria-live` : un lecteur d'écran le lit deux fois. Garde une seule zone d'annonce. Rends le message plus doux, par exemple : « Il nous manque encore : votre prénom, votre nom, votre entreprise, votre e-mail professionnel et votre accord. »

## C. Tableau de bord, mise en page

12. **Barres empilées par dimension.** Les lignes sont beaucoup plus hautes que dans la maquette. Compacte-les : environ 32px par ligne, nom de la dimension sur une seule ligne et plus fin (texte courant, pas en gras). La colonne des noms peut rester à 220px.

## D. Divers

13. `npm test` lance `node --test tests/`. Selon la version de Node, ce dossier n'est pas accepté et la commande échoue. Utilise `node --test tests/*.test.js` pour que ça marche partout.

## Méthode

- Un commit par groupe (A, B, C, D), avec le changelog du README à jour.
- Après chaque groupe, refais les captures à 1280 et 390 et compare-les aux fichiers de `maquette/captures/`.
- Relance `npm test` et `node scripts/verif/cahier-des-charges.mjs`.
- Ne touche à aucun texte de `contenu.json`.
- À la fin, liste ce qui a été corrigé, point par point, avec le numéro du point.
