# Décisions de conception

Les choix faits avec Arnaud pendant la conception des maquettes (septembre 2026), et leur raison. Si un choix te semble discutable, pose la question plutôt que de le changer.

## Le fond

| Décision | Pourquoi |
| --- | --- |
| Le questionnaire s'appuie sur la coordination relationnelle de Jody Hoffer Gittell (thèse MIT 1995, travaux de Brandeis) | Un cadre sérieux et sourcé : objectifs partagés, connaissances partagées, respect mutuel, communication fréquente, au bon moment, juste, tournée vers la solution. |
| 8 dimensions formulées avec les mots de Greatly, pas ceux de la recherche | Parler simplement. Les sources sont citées sur l'accueil, pas dans le résultat. |
| On dit « état des lieux », jamais « diagnostic » | Un diagnostic suppose une maladie. Un état des lieux décrit ce qui est. |
| 2 affirmations sur la confiance (Q11, Q12) et une sur l'entraide (Q13) | Pour couvrir les 4 conditions de l'accompagnement Les Fondations : confiance, soutien, cohésion, engagement. |
| Q14, Q15 sur le sens et Q16 sur les résultats | Tester l'idée Greatly : la performance n'est pas un objectif, elle en est la conséquence. Q16 n'est jamais montré au répondant, il sert à la modélisation. |
| Une version membre et une version manager des affirmations | Le manager ne se juge pas lui-même avec les mêmes mots. On compare ensuite les deux regards dans le dashboard. |

## L'échelle de réponse (septembre 2026)

| Décision | Pourquoi |
| --- | --- |
| Pas encore · Un peu · En bonne partie · Pleinement, au lieu de Pas du tout · Plutôt pas · Plutôt · Tout à fait | « Pas encore » dit qu'on n'y est pas, sans fermer la porte. C'est l'idée qu'on garde partout : tout peut évoluer. Une échelle d'accord jugeait un état, celle-ci décrit un chemin. |
| Les valeurs de 0 à 3, le calcul et les couleurs ne changent pas | Seuls les mots changent. Les résultats restent comparables. |
| Le tableau de bord dit « le vivent déjà » plutôt que « d'accord » | Même raison : on décrit ce qui est vécu, on ne mesure pas une adhésion. |
| Les 255 réponses papier gardent leurs valeurs, avec une colonne `echelle` qui dit laquelle | Elles ont été recueillies avec l'échelle d'accord. Quand les deux se côtoient dans un même chiffre, le tableau de bord le mentionne. |

## Le résultat

| Décision | Pourquoi |
| --- | --- |
| 4 couleurs nommées au lieu de notes, de pourcentages ou de scores | Pas de performance, pas de classement. On décrit, on ne note pas. 4 niveaux suffisent et évitent un milieu « neutre ». |
| Noms végétaux : Bien enraciné, En croissance, En germe, À semer | Tout peut grandir. Même le niveau le plus bas est un point de départ, pas un échec. |
| Couleurs forêt, sauge, sable, terre | Cohérentes avec la charte, et vérifiées pour rester distinctes pour les personnes daltoniennes. |
| Une carte d'ensemble empathique en tête | Le répondant lit d'abord une phrase sur lui, bienveillante, avant le détail. |
| Phrases rédigées « dans votre regard », en commençant par ce qui est déjà là | C'est une perception, pas un verdict. |
| Pas d'éclairage issu de la thèse dans le résultat | Testé puis retiré : sans le contexte, l'histoire des compagnies aériennes n'était pas claire. |
| Pas de recommandations ni de « pistes » | Le résultat décrit. Il ne dit pas quoi faire. |
| Pas d'invitation à faire répondre son équipe | Trop de pression sur le manager. |

## Les idées dans le résultat (septembre 2026)

| Décision | Pourquoi |
| --- | --- |
| Les idées cochées sont reformulées et placées sous la dimension concernée, sans commentaire | Ce sont des idées, pas des problèmes : on ne console pas, on ne conseille pas. Elles apparaissent là où elles se rapportent, pas dans un bloc à part. |
| Une seule ligne sobre invite à en parler | Elle suffit. Un encouragement de plus supposerait que quelque chose ne va pas. |
| Les fragments sont des groupes nominaux, dans contenu.json | Ils s'enchaînent dans une phrase : « Plus d'échanges en direct, une messagerie mieux organisée et des infos qui arrivent plus tôt. » Rien n'est écrit en dur dans le code. |
| « Autre » n'a pas de texte : il vient en dernier, et seul il donne « Une idée à préciser. » | On ne peut pas deviner ce qu'elle a en tête, et on ne l'invente pas. |
| L'affirmation 16 a son encadré à part | Elle n'appartient à aucune dimension et n'apparaît dans aucune bande. |

## Garder son résultat

| Décision | Pourquoi |
| --- | --- |
| Pas d'e-mail, pas de PDF | Envoyer des mails est polluant et demande des données personnelles. |
| Un lien personnel qui contient les réponses dans le hash | La personne le garde en favoris. Rien n'est stocké côté serveur pour le relire, et le lien ne permet pas de retrouver la ligne dans le Sheet. |
| **Le lien contient aussi les envies cochées** (septembre 2026) | Pour que le résultat les montre à chaque visite. Toujours aucune donnée personnelle : rien que des chiffres de réponse et des indices de choix. |
| Les liens v1 restent lisibles, sans les idées | Un lien déjà partagé ne doit jamais cesser de fonctionner. |
| Un lien dont la partie « idées » est abîmée affiche quand même le résultat | Mieux vaut un résultat sans les idées qu'un message d'erreur. |
| L'étude complète en échange de prénom, nom, entreprise, e-mail | C'est la seule donnée personnelle collectée. Elle est volontaire et stockée à part. |

## Les relances « J'aimerais… »

| Décision | Pourquoi |
| --- | --- |
| **Chaque réponse réservée ouvre sa question « J'aimerais… » juste en dessous, sans limite** (septembre 2026) | Plus simple à comprendre, aucune réponse n'en fait disparaître une autre, et plus de données pour le tableau de bord. |
| Toutes commencent par « J'aimerais… » | Tourner les réponses vers l'envie et l'évolution, pas vers le manque ou la faute. |
| 2 choix au maximum, plus « Autre » | Obliger à prioriser, et rester lisible dans le dashboard. |
| L'ouverture d'un encadré ne dépend que de la réponse à son affirmation | C'est ce qui supprime les deux défauts des versions précédentes : un encadré déjà rempli qui disparaissait plus haut sans prévenir en emportant ses cases, et un « Pas encore » donné en bas qui faisait apparaître un encadré hors de l'écran. On croyait alors que « Pas encore » ne fonctionnait pas. |
| Deux détours abandonnés : les 2 plus réservées seulement, puis un écran « Encore un mot » après les 16 | Le premier faisait disparaître des encadrés. Le second éloignait la question du moment où l'envie vient, et coupait le fil de la lecture. |
| Les choix d'un encadré refermé restent en mémoire pendant la session | Changer d'avis puis revenir ne doit rien coûter. Seules les relances des réponses finales 0 ou 1 sont envoyées. |
| Les choix en lignes pleine largeur, pas en pilules | En pilules, les choix longs passaient sur 2 lignes sur mobile et devenaient illisibles. |
| Un lien « Passer » à côté de « Voir mon résultat » | Les relances restent facultatives, et on le dit plutôt que de le laisser deviner. |

## Les illustrations (septembre 2026)

| Décision | Pourquoi |
| --- | --- |
| Quatre pousses sur le même sol en haut de l'accueil : une graine, une pousse, un jeune plant, un arbre avec ses racines | Les 4 niveaux se comprennent d'un coup d'œil, avant même de lire. La métaphore végétale est déjà celle des noms de niveau. |
| L'illustration remplace la photo de la Greatly House en haut de page | La photo parlait de Greatly, l'illustration parle de ce que la personne va recevoir. Le bloc Greatly reste sur le résultat. |
| Insérée en SVG dans la page, jamais en image | Elle reste nette à toutes les tailles et n'ajoute aucune requête. |
| Sur mobile, les étiquettes internes du SVG laissent la place à des pastilles HTML | À 390px, le texte du SVG deviendrait minuscule. Le viewBox se raccourcit d'autant, sinon il resterait une bande vide. |
| Un médaillon rond sur la carte d'ensemble, et une petite pousse dans chaque en-tête de colonne | Le résultat se lit plus vite, et la couleur gagne un second repère. |
| Les illustrations sont décoratives, `aria-hidden` | Le niveau est toujours écrit en toutes lettres à côté : jamais d'information portée par la seule image. |
| Chargées en image sur le résultat, pas insérées | Chaque fichier porte ses propres identifiants de découpe, qui entreraient en conflit si plusieurs vivaient dans le même document. |

## Le titre de l'accueil (septembre 2026)

| Décision | Pourquoi |
| --- | --- |
| « Ce qui vous aide à bien travailler ensemble », et non plus « Faites le point sur votre façon de travailler ensemble » | Le titre ne dit plus « votre équipe » : il parle aussi bien à un membre qu'à un manager, qui ne se reconnaissaient pas dans la même formule. |
| Deux cartes « Pour vous » et « Pour Greatly et ses intervenants » sous le haut de page | Dire franchement ce que la personne y gagne, et ce que Greatly en fait. On parle d'intervenants, jamais d'experts. |
| « Ce que vous recevez en 2 minutes », en 4 points numérotés | L'ancienne section en 3 boîtes ne disait pas ce qu'on obtient concrètement. |

## Donner envie de répondre jusqu'au bout (septembre 2026)

| Décision | Pourquoi |
| --- | --- |
| On dit pourquoi on s'intéresse à chaque sujet, sous chaque titre de groupe | Répondre à 16 affirmations sans savoir ce qu'on en fera est ingrat. Dire ce qu'on cherche donne du sens à chaque question. |
| Un encadré « Ce qu'on cherche à comprendre » avant la première affirmation, sur la même page | La personne sait où elle met les pieds, sans un clic de plus. |
| La pousse montre l'avancée, sans chiffre | Une barre nue ne dit rien. Une pousse qui grandit vers un arbre raconte le chemin. Ce n'est pas un score : la jauge reste sauge et ne reprend jamais les couleurs du résultat. |
| Un mot à mi-parcours | Le milieu est l'endroit où l'on décroche. Un merci suffit. |
| On partage l'accueil, jamais le résultat | Le résultat appartient à la personne, et son lien contient ses réponses. Faire connaître l'outil ne doit jamais exposer ce qu'elle a répondu. |

## Revenir sur son résultat (septembre 2026)

| Décision | Pourquoi |
| --- | --- |
| Un bandeau invite à garder la page et à revenir | La ligne « Bientôt… » annonçait quelque chose sans donner de raison d'y revenir. Le bandeau dit ce qui arrivera, et propose de garder le lien tout de suite. |
| La comparaison avec les autres équipes n'arrive qu'au-delà de 100 réponses, et 30 par segment | En dessous, une comparaison ne dirait rien de juste et pourrait décourager à tort. Le code est prêt, l'affichage attend. |
| Elle se dit en phrases, sans aucun chiffre | Comme le reste du résultat : pas de note, pas de classement, pas de pourcentage. |
| L'endpoint public ne renvoie que des parts, et jamais un segment sous le seuil | Ce qui ne sort pas ne peut pas servir à remonter à quelqu'un. |
| Le profil vient de la session, jamais du lien | Le lien ne porte que des réponses. En revenant plus tard, on compare à l'ensemble plutôt que d'inscrire le secteur et la taille d'équipe dans l'URL. |

## Le public et la marque

| Décision | Pourquoi |
| --- | --- |
| Aucun contenu commercial | L'outil sert une étude et un regard offert. Il ne vend rien. |
| Un bandeau de 40px en haut qui dit qui est Greatly | Transparence, sans détourner l'attention. |
| Le bloc Greatly et la Greatly House sous le lien personnel, au-dessus de « Recevoir l'étude complète » | La personne a d'abord son résultat, puis découvre qui est derrière. |
| Compteur « 255 personnes ont déjà participé » | Vrai chiffre : 255 réponses papier. Il donne envie de participer. Il augmente ensuite avec les réponses en ligne. |
| Genre facultatif avec « Non binaire » et « Je préfère ne pas répondre » | Inclusif, jamais obligatoire. |
| Secteur en champ de recherche | La liste est longue ; taper « santé » est plus rapide que faire défiler. |

## Le tableau de bord

| Décision | Pourquoi |
| --- | --- |
| « L'essentiel » en tête, en phrases | Lire les constats avant les graphiques. Des perceptions, pas des causes. |
| Pour chaque affirmation : la part d'accord en grand à gauche, puis le détail, puis ce que souhaitent ceux qui ne sont pas d'accord | La première version n'était pas claire. On voit d'abord le constat, puis le souhait. |
| Afficher la question de relance à côté du souhait le plus choisi | Sans la question, le choix seul ne veut rien dire. |
| Jamais de groupe de moins de 3 personnes | Protéger l'anonymat quand on croise les filtres. |
| Les 4 conditions des Fondations dans un bloc à part | C'est la lecture utile pour l'accompagnement. |
| Papier et en ligne filtrables séparément | Vérifier que les deux racontent la même chose. |

## Règle de calcul qui fait foi

L'ancienne note de conception parlait d'un contraste à « 4 points d'écart ». **La règle retenue est celle du simulateur** : contraste quand au moins 2 niveaux de couleur séparent la dimension la plus installée de la moins installée. En cas de doute, `maquette/Simulateur.dc.html` fait foi.

**La carte d'ensemble se calcule à partir des 8 dimensions, avec la même règle d'arrondi qu'elles** (moyenne des 8 valeurs de niveau, arrondie à l'entier le plus proche, égalités vers le haut). Passe 11 : l'ancienne règle prenait la moyenne brute des affirmations 1 à 15 avec des seuils 2,5 / 1,75 / 1, si bien que les dimensions étaient tirées vers le haut et le titre vers le bas (6 dimensions « En croissance » sous « Une équipe en germe »). Les `seuil_min` de `contenu.json` ne servent plus au répondant. **Le tableau de bord compte la même carte** : `cartesRecues` appelle `carteEnsemble`, il compte donc la carte que chacun a vraiment vue. Un lien déjà partagé peut changer de titre, c'est voulu.

## Passe 11 : mise en page mobile et ordinateur

| Décision | Pourquoi |
| --- | --- |
| Sur mobile, à l'accueil, le compteur et les coches sont centrés sous le bouton pleine largeur | Le compteur était centré et les coches alignées à gauche : deux axes pour un même groupe. |
| Paliers de la pousse : graine jusqu'à 3 réponses, germe jusqu'à 8, croissance jusqu'à 15, arbre à 16 seulement, et l'arbre du but s'allume à 16 | L'arbre arrivait dès 14 réponses : deux arbres identiques de chaque côté, le but semblait atteint avant la fin. |
| La coche de la réponse choisie n'apparaît que sur ordinateur, dans le flux avant le libellé ; le mobile s'appuie sur le fond plein, le texte blanc et le gras | Posée en coin, elle chevauchait le libellé sur mobile (« ✓En bonne partie ») et semblait égarée sur ordinateur. |
| L'échelle garde 4 colonnes sur une ligne jusqu'à 360px, avec césure des mots longs (« Pleine-ment ») | Elle se lit d'un coup d'œil de gauche à droite ; « Pleinement » ne tient pas entier dans 57 à 64px. |
