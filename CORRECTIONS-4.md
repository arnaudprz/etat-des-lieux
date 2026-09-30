# Corrections, passe 4 : chaque réponse réservée ouvre sa question « J'aimerais… »

Colle ce texte dans Claude Code, dans le repo `etat-des-lieux`.

---

Arnaud a testé l'écran « Encore un mot ». Il n'en veut pas.

- Il préfère que la question « J'aimerais… » **s'ouvre juste en dessous** de l'affirmation, au moment où il répond.
- Il attend qu'elle s'ouvre **pour chaque** réponse réservée, pas seulement pour les 2 plus réservées. Aujourd'hui, un « Pas du tout » sur une troisième affirmation n'ouvre rien : pour lui, ça ne fonctionne pas.

On change donc la règle elle-même, pas seulement l'affichage.

## 1. La nouvelle règle

- **Toute** réponse « Pas du tout » ou « Plutôt pas » ouvre immédiatement, sous l'affirmation, sa question « J'aimerais… » avec ses choix. Cela vaut pour les 16 affirmations, sans limite de nombre.
- « Plutôt » ou « Tout à fait » ne l'ouvrent pas. Si la personne passe d'une réponse réservée à « Plutôt » ou « Tout à fait », l'encadré se referme.
- L'ouverture d'un encadré ne dépend **que** de la réponse à cette affirmation. Aucune réponse ailleurs ne peut ouvrir, fermer ou vider un autre encadré. C'est ce qui supprime les sauts de page et les choix perdus de la première version.
- Les choix restent facultatifs, avec 2 au plus, plus « Autre ».
- Si un encadré se referme, garde ses choix en mémoire pendant la session. S'il se rouvre, les cases cochées réapparaissent. À l'envoi, **n'envoie que** les relances des affirmations dont la réponse finale vaut 0 ou 1.

## 2. Supprimer l'écran « Encore un mot »

- Retire la section `data-ecran="relances"` et toute sa logique : le bouton final redevient « Voir mon résultat » et mène directement au résultat.
- Texte d'intro des affirmations : « Pour chaque affirmation, choisissez la réponse qui vous ressemble le plus. Il n'y a pas de bonne réponse. Quand vous n'êtes pas d'accord, une petite question vous demande ce qui vous aiderait. »

## 3. Le comportement à l'ouverture

- L'encadré s'ouvre **sous** les boutons de réponse, dans la même carte, avec une courte animation de hauteur (200 ms). Pas d'animation si `prefers-reduced-motion` est activé.
- Rien ne bouge au-dessus de la carte : la page ne doit jamais sauter.
- Le défilement automatique vers l'affirmation suivante (point 4 de la passe 2) ne se déclenche **que** pour « Plutôt » et « Tout à fait ». Après une réponse réservée :
  - on reste sur la carte ;
  - si l'encadré dépasse du bas de l'écran, on défile juste assez pour le montrer en entier ;
  - un petit lien « Question suivante » en bas de l'encadré permet de continuer.
- Le focus clavier reste sur le bouton de réponse. L'ouverture est annoncée aux lecteurs d'écran (« Une question en plus s'est ouverte »).
- Style de l'encadré : fond sable clair, coins 12px, choix en lignes pleine largeur (case à gauche, texte à droite). Le début de phrase (« J'aimerais… ») est en gras, suivi de « Deux réponses au plus » en taupe. Pas de `<legend>` pour la mise en page : utilise un `role="group"` avec `aria-labelledby`.

## 4. Données, backend et dashboard

- `contenu.json > relance` : retire `max_affirmations`, garde `seuil_valeur_max: 1` et `max_choix: 2`. Mets `calcul.js` à jour : la fonction qui choisissait les 2 affirmations les plus réservées disparaît, ou devient simplement « les affirmations dont la valeur est 0 ou 1 ».
- Backend (`worker/reponses.gs`) : accepte jusqu'à 16 relances. Garde les contrôles suivants :
  - 2 choix au plus par relance ;
  - une relance seulement si la réponse vaut 0 ou 1 ;
  - des choix qui existent pour la version membre ou manager concernée.
- Dashboard :
  - la phrase « Ceux qui ne sont pas d'accord ont complété » est maintenant vraie pour toutes les affirmations ;
  - le pourcentage du souhait le plus choisi se calcule sur les personnes qui ont répondu 0 ou 1 **et** coché au moins un choix ;
  - affiche toujours l'effectif (« soit 60 personnes sur 89 ») ;
  - mets les données fictives du mode démo à jour avec cette règle.
- Tests : remplace les tests de « 2 plus réservées » par des tests de la nouvelle règle :
  - ouverture, fermeture et réouverture avec les choix gardés ;
  - envoi limité aux réponses 0 ou 1 ;
  - validation côté backend.
- Mets `DECISIONS.md` à jour. Remplace la ligne sur les 2 relances : « Chaque réponse réservée ouvre sa question « J'aimerais… » juste en dessous, sans limite. Plus simple à comprendre, aucune réponse n'en fait disparaître une autre, et plus de données pour le dashboard. » Mets aussi `QUESTIONS.md` à jour.

## 6. Autres corrections UX et UI

J'ai repris la version locale écran par écran, à 1280 et à 390. Si la passe 3 est encore en cours, termine-la d'abord, puis vérifie ces points.

**Accueil**
1. **Étiquettes en double sur ordinateur.** Sous l'illustration, les 4 pastilles HTML s'affichent alors que le SVG contient déjà ses étiquettes. Sur ordinateur, utilise `pousses.svg` seul. Sur mobile, utilise `pousses-sans-etiquettes.svg` avec les pastilles HTML en dessous. Jamais les deux à la fois.
2. **Sections sans style.** Les cartes « Pour vous » et « Pour Greatly et ses intervenants », ainsi que « Ce que vous recevez en 2 minutes », s'affichent en HTML brut : texte collé aux bords, puces par défaut, aucun fond. Applique les styles de `maquette/captures/Main.png` et `Main-mobile.png` : cartes, fond forêt, numéros 01 à 04, grille 2 × 2 et aperçu à droite sur ordinateur.
3. **Aperçu sur les réseaux.** `og:image` pointe vers un SVG, que LinkedIn, WhatsApp et Slack n'affichent pas. Génère une image PNG de 1200 × 630 : fond crème, l'illustration des pousses, le titre en Playfair. Déclare-la en URL absolue. Ajoute aussi `og:url` et `twitter:card`.
4. **Favicon.** Il n'y en a pas. Crée un favicon SVG (la petite pousse « En croissance » dans un rond sauge) et un PNG de 180px pour `apple-touch-icon`.

**Profil**
5. **Pastilles qui passent sur 2 lignes sur mobile** (« 300 à 999 / salariés », « 13 personnes et / plus »). Garde les valeurs de `contenu.json` pour les données, mais affiche des libellés courts :
   - dans les pastilles : « 1 à 9 », « 10 à 49 », « 50 à 299 », « 300 à 999 », « 1 000 à 4 999 », « 5 000 et plus » ;
   - dans l'intitulé : « Taille de votre entreprise (nombre de salariés) » ;
   - même principe pour l'équipe : « 2 à 5 », « 6 à 12 », « 13 et plus », avec l'intitulé « Taille de votre équipe (nombre de personnes) ».

   Aucune pastille ne doit passer sur 2 lignes à 390px.
6. **Secteur choisi.** Une fois choisi, le secteur doit s'afficher dans une pastille avec « Modifier », comme prévu à la passe 2, et la liste se referme. Vérifie-le sur mobile : la liste ne doit pas rester ouverte et pousser « Taille de votre équipe » loin vers le bas.

**Affirmations**
7. **Titre de groupe.** Le dernier groupe s'appelle « Le sens et les résultats », alors que la dimension du résultat s'appelle « Le sens du travail ». Garde « Le sens et les résultats » pour le groupe, puisqu'il contient l'affirmation 16. Vérifie que le dashboard utilise bien les noms de dimension, pas les noms de groupe.
8. **Réponse choisie sur mobile.** La réponse choisie ne se distingue que par sa couleur. Ajoute une coche discrète à gauche du libellé, et un contour plus épais au focus clavier.
9. **Fin du questionnaire.** Sous la dernière affirmation, un petit récapitulatif au-dessus du bouton : « Vous avez répondu aux 16 affirmations », sans autre chiffre. S'il en manque, écris « Il reste N affirmations » avec un lien vers la première sans réponse.

**Résultat**
10. **Lien personnel.** L'URL brute est longue et peu lisible, surtout sur mobile. Remplace le champ par une ligne « Votre lien est prêt » et deux boutons :
    - « Copier le lien » ;
    - sur mobile uniquement, « Envoyer à moi-même », qui ouvre le partage du téléphone (`navigator.share`) pour se l'envoyer par message ou le noter. Si le partage n'existe pas, n'affiche pas le bouton.

    Garde l'URL complète dans un champ repliable « Voir le lien ». Ajoute l'astuce « Ajoutez cette page à vos favoris (⌘ D sur Mac, Ctrl D sur PC) », seulement sur ordinateur.
11. **Illustrations.** Vérifie qu'elles sont bien présentes : le médaillon de la carte d'ensemble et les petites pousses dans les en-têtes de colonnes (passe 3, point 5). Dans la version locale, je ne les vois pas encore.
12. **Phrases d'appui et de forme.** « Ce qui vous porte le plus » et « Votre regard est contrasté » sont deux paragraphes séparés, à la suite du texte de la carte. Mets-les dans le même paragraphe que le texte, comme dans la maquette, pour lire la carte d'une traite.

**Partout**
13. Hauteur tactile minimale de 44px sur tous les liens et boutons secondaires (« Retour », « Modifier », « Question suivante »).
14. Le bandeau « Mode démo » ne doit apparaître qu'en mode démo explicite (`?demo=1`). En local sans API, affiche-le en petit en bas de page, pas en haut.

## 7. Vérification

- Un test Playwright, dans Chromium **et** WebKit, en 1280 et en iPhone émulé :
  - répondre « Pas du tout » aux 16 affirmations : les 16 encadrés s'ouvrent ;
  - répondre « Plutôt pas » à la 3e puis « Pas du tout » à la 10e : les deux encadrés sont ouverts, rien n'a sauté ;
  - cocher 2 choix sur la 3e, passer la 3e à « Plutôt », puis revenir à « Plutôt pas » : les 2 choix sont revenus ;
  - envoyer : seules les relances des réponses 0 ou 1 partent.
- Captures avant et après de chaque écran touché, à 1280 et à 390, dans Chromium et WebKit.
- Teste aussi depuis un téléphone sur le réseau local (`http://<ip-du-mac>:8080`). Le serveur local doit écouter sur toutes les interfaces et servir sans cache.
- Commits séparés (règle, écran, données, tests), changelog du README à jour, `V` incrémenté.
