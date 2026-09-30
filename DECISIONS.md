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

## Garder son résultat

| Décision | Pourquoi |
| --- | --- |
| Pas d'e-mail, pas de PDF | Envoyer des mails est polluant et demande des données personnelles. |
| Un lien personnel qui contient les réponses dans le hash | La personne le garde en favoris. Rien n'est stocké côté serveur pour le relire, et le lien ne permet pas de retrouver la ligne dans le Sheet. |
| L'étude complète en échange de prénom, nom, entreprise, e-mail | C'est la seule donnée personnelle collectée. Elle est volontaire et stockée à part. |

## Les relances « J'aimerais… »

| Décision | Pourquoi |
| --- | --- |
| Seulement sur les 2 réponses les plus réservées (valeur 0 ou 1) | Garder le questionnaire à 2 minutes. |
| Toutes commencent par « J'aimerais… » | Tourner les réponses vers l'envie et l'évolution, pas vers le manque ou la faute. |
| 2 choix au maximum, plus « Autre » | Obliger à prioriser, et rester lisible dans le dashboard. |
| **Sur un écran à part, après les 16 affirmations** (septembre 2026) | Elles s'affichaient d'abord sous les affirmations, et se recalculaient à chaque réponse. Deux effets, tous deux constatés au test : une relance déjà remplie disparaissait plus haut sans prévenir, ses cases effacées et la page sautant de plus de 100px ; et un « Pas du tout » donné en bas faisait apparaître un encadré tout en haut, hors de l'écran, si deux réponses réservées existaient déjà plus haut. On croyait alors que « Pas du tout » ne fonctionnait pas. |
| Chaque relance rappelle son affirmation | Sur un écran séparé, le souhait seul ne voudrait plus rien dire. |
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
