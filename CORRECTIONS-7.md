# Corrections, passe 7 : le bandeau « Revenez bientôt sur votre lien »

Colle ce texte dans Claude Code, dans le repo `etat-des-lieux`, **après** la passe 6.

---

Sur le résultat, la ligne « Bientôt : votre état des lieux à côté de celui des autres répondants. » ne donne pas envie de revenir. On la remplace par un bandeau qui invite à garder la page en favoris, et on prépare la comparaison avec les autres répondants.

Références visuelles : `maquette/Resultat.dc.html`, `Resultat-mobile.dc.html` et leurs captures dans `maquette/captures/`.

Règles habituelles : pas de tiret cadratin, espace insécable avant `? ! : ;`, aucun chiffre ni pourcentage côté répondant.

## 1. Le bandeau, dès maintenant
- Fond sauge très clair `#EEF1EA`, bordure `rgba(107,125,92,.3)`, coins 16px, placé juste sous « Faire connaître l'état des lieux ».
- Sur ordinateur : grille à 3 colonnes (`64px 1fr auto`). La petite pousse « En germe » (`icone-germe.svg`, 64px) est à gauche, le texte au milieu et le bouton à droite.
- Sur mobile : tout est empilé. La pousse (40px) est à côté du titre, le texte vient dessous et le bouton prend toute la largeur.
- Titre en Playfair : « Revenez bientôt sur votre lien »
- Texte : « Quand assez de personnes auront répondu, votre état des lieux montrera aussi ce que vous partagez avec d'autres équipes. Pas de classement, pas de note : juste savoir que vous n'êtes pas seul. Ajoutez cette page à vos favoris pour y revenir facilement. »
- Bouton principal « Garder cette page ». Il fait la même chose que « Garder mon résultat » (passe 2) :
  - sur mobile, il ouvre le partage du téléphone (`navigator.share`) avec l'URL **du résultat**, pour l'enregistrer ou se l'envoyer ;
  - sur ordinateur, il copie le lien et affiche « Lien copié. Ajoutez la page à vos favoris avec ⌘ D ou Ctrl D. » ;
  - sous le bouton, sur ordinateur seulement, une mention en 13px taupe : « ou ⌘ D sur Mac, Ctrl D sur PC » (n'affiche que le bon raccourci si la plateforme est détectable).
- Envoie un événement `garder_page` dans l'entonnoir, avec une ligne « Pages gardées » dans le dashboard.
- Tous les textes vont dans `contenu.json`, section `engagement.retour`.

## 2. Plus tard : « Vous n'êtes pas seul » (prépare le code, affichage désactivé tant que les seuils ne sont pas atteints)
- Quand il y aura **au moins 100 réponses** en ligne, le résultat affiche sous certaines dimensions une phrase de mise en perspective, sans chiffre. Par exemple :
  - si la dimension est « À semer » ou « En germe » chez la personne et fait partie des moins installées chez l'ensemble des répondants : « C'est aussi l'une des dimensions les moins installées chez les autres répondants. » ;
  - si elle est « Bien enraciné » chez la personne mais souvent en construction ailleurs : « Chez beaucoup d'équipes, elle est encore en construction. Chez vous, elle est déjà là. »
- Pour une comparaison avec un profil proche (même secteur, même taille d'équipe, même rôle), il faut **au moins 30 réponses** dans ce segment. Sinon, on compare à l'ensemble.
- Nouvel endpoint public dans `worker/` qui ne renvoie **que des agrégats** : pour chaque dimension, la part des répondants par niveau, au global et par segment quand le seuil est atteint. Jamais de réponse individuelle, jamais de segment sous le seuil. Mis en cache (6 h), et lu par le résultat au chargement. S'il ne répond pas, le résultat s'affiche sans ces phrases, sans erreur.
- Le calcul se fait dans le navigateur à partir du lien personnel : c'est **le même lien** qui, en revenant plus tard, montre ces phrases. Rien n'est stocké sur la personne.
- Quand les phrases sont actives, le bandeau change de texte : « Votre état des lieux montre maintenant ce que vous partagez avec d'autres équipes. Revenez de temps en temps : il s'enrichit avec chaque nouvelle réponse. »
- Toujours aucun chiffre ni pourcentage côté répondant, aucun classement, aucune note.
- Ajoute des tests : seuils (99 et 100, 29 et 30), endpoint indisponible, lien `v1` et `v2`.

## 3. Vérification

- Captures à 1280 et 390, dans Chromium et WebKit, comparées à `maquette/captures/Resultat.png` et `Resultat-mobile.png`.
- Teste « Garder cette page » sur mobile (partage) et sur ordinateur (copie et message).
- Vérifie que les phrases de comparaison restent masquées sous les seuils et que le résultat s'affiche normalement si l'endpoint ne répond pas.
- Mets `DECISIONS.md` à jour : le bandeau invite à garder la page et à revenir ; la comparaison avec les autres arrive seulement au-delà de 100 réponses (30 par segment), en phrases, sans chiffre.
- Un commit par section, changelog du README à jour, `V` incrémenté.
