# Corrections, passe 6 : donner envie de répondre jusqu'au bout

Colle ce texte dans Claude Code, dans le repo `etat-des-lieux`, **après** la passe 5.

---

On veut engager davantage la personne pendant le questionnaire : qu'elle comprenne pourquoi on lui pose ces questions, qu'elle voie son avancée, et qu'elle ait envie de découvrir son résultat.

Références visuelles : `maquette/Questions.dc.html`, `Questions-mobile.dc.html`, `Resultat.dc.html`, `Resultat-mobile.dc.html` et leurs captures dans `maquette/captures/`.

Tous les nouveaux textes vont dans `contenu.json`, dans une section `engagement`, et sont lus depuis là. Règles habituelles :
- pas de tiret cadratin ;
- espace insécable avant `? ! : ;` ;
- aucun chiffre ni pourcentage côté répondant.

## 1. « Pourquoi on s'y intéresse », sous chaque titre de groupe

Sous chacun des 8 titres de groupe, une ligne en DM Sans 15px (14px sur mobile), taupe, qui commence par « Pourquoi on s'y intéresse · » en sauge foncé semi-gras. Voici les textes :

| Groupe | Texte |
| --- | --- |
| Ce qu'on vise ensemble | On se demande si les équipes partagent vraiment le même cap, ou si chaque métier avance surtout avec le sien. C'est souvent là que tout commence. |
| Ce qu'on sait les uns des autres | On veut comprendre à quel point on connaît le travail de ses collègues. Les recherches de Jody Hoffer Gittell montrent que c'est ce qui permet d'anticiper plutôt que de subir. |
| La place de chacun | On cherche à savoir si chaque métier se sent reconnu et écouté, ou si certaines voix comptent plus que d'autres. |
| Comment l'info circule | On s'interroge sur ce qui fait qu'une info arrive au bon moment, ou trop tard. C'est l'un des sujets qui revient le plus quand on parle de travail ensemble. |
| Quand ça accroche | On veut savoir ce qui se passe quand quelque chose coince : cherche-t-on une solution ensemble, ou chacun de son côté ? |
| Le soutien du manager | On se demande quel rôle joue le manager pour aider les métiers à travailler ensemble, au-delà du suivi des objectifs. |
| La confiance et le soutien | On cherche à comprendre si l'on peut parler franchement et compter sur les autres. La confiance est au cœur de l'accompagnement Greatly. |
| Le sens et les résultats | On veut vérifier une idée qui nous tient à cœur : les équipes qui voient le sens de leur travail atteignent-elles plus facilement leurs résultats ? |

## 2. Un encadré « Ce qu'on cherche à comprendre », avant la première affirmation

Sous le titre et le texte d'intro, une carte blanche :
- surtitre en petites capitales sauge : « Ce qu'on cherche à comprendre » ;
- 3 lignes, chacune avec son début en gras :
  - **Ce qu'on étudie :** comment les équipes travaillent ensemble, au quotidien.
  - **Pourquoi :** préparer des accompagnements au plus près de ce que vivent les équipes.
  - **Ce que vous y gagnez :** votre état des lieux, en couleurs, dans 2 minutes.

Elle reste sur la même page que les affirmations, pas sur un écran séparé : on ne rajoute pas de clic.

## 3. La pousse qui grandit, à la place de la barre de progression

- La barre de progression collante (passe 2) devient :
  - à gauche, la petite pousse du stade atteint (`icone-*.svg`, 36px) ;
  - au milieu, la jauge sauge ;
  - à droite, l'arbre (`icone-enracine.svg`), qui est le but.
- La pousse de gauche change selon l'avancée : graine (0 à 3 réponses), pousse (4 à 8), jeune plant (9 à 13), arbre (14 à 16). Transition douce (fondu de 200 ms), sans animation si `prefers-reduced-motion`.
- Toujours **aucun chiffre** affiché. `aria-valuenow` et `aria-valuetext` restent pour les lecteurs d'écran (« Avancée : environ la moitié »).
- Sur mobile, elle reste collée en haut, sur une hauteur de 44px au plus.
- Attention : la progression ne doit **pas** suivre l'ordre des couleurs du résultat. Ce n'est pas un score, juste l'avancée dans le questionnaire.

## 4. Une ligne à mi-parcours

Entre le groupe « Comment l'info circule » et le groupe « Quand ça accroche », un bandeau léger (fond sauge très clair, coins 14px) avec la petite pousse « En croissance » et le texte : « Vous êtes à mi-chemin. Merci pour vos réponses, elles comptent. »

## 5. Juste avant le bouton final

Au-dessus de « Voir mon résultat » :
- en Playfair 22px (19px sur mobile) : « Dans un instant : votre état des lieux en couleurs, et vos idées pour faire évoluer. » ;
- en DM Sans 14px taupe : « Vos réponses rejoignent l'étude, de façon anonyme. Elles aident nos intervenants à préparer des ateliers au plus près de ce que vivent les équipes. »

## 6. Faire connaître l'état des lieux, sur le résultat

Juste sous le bloc « Votre lien personnel », un encadré à bordure pointillée sauge :
- texte : « L'état des lieux vous a plu ? Vous pouvez le faire connaître. Seule la page d'accueil est partagée, jamais votre résultat. » ;
- bouton secondaire (contour sauge) : « Faire connaître l'état des lieux ».
  - Sur mobile, il ouvre le partage du téléphone (`navigator.share`) avec l'URL de l'**accueil**, un titre et une courte phrase.
  - Sur ordinateur, ou si le partage n'existe pas, il copie l'URL de l'accueil et affiche « Lien de l'accueil copié ».
- Jamais l'URL du résultat, jamais le hash. Ajoute un test qui le vérifie.
- Envoie un événement `partage_accueil` dans l'entonnoir. Ajoute une ligne « Partages de l'accueil » dans l'entonnoir du dashboard.
- Pas d'invitation d'équipe, pas de formulaire d'e-mail : c'est un simple partage.

## 7. Vérification

- Captures à 1280 et 390, dans Chromium et WebKit, comparées aux captures de la maquette.
- Le questionnaire reste faisable en 2 à 3 minutes. Les lignes de contexte ne doivent pas faire passer chaque carte sur plus d'un écran de téléphone.
- Mets `DECISIONS.md` à jour :
  - on dit pourquoi on s'intéresse à chaque sujet ;
  - la pousse montre l'avancée sans chiffre ;
  - on partage l'accueil, jamais le résultat.
- Un commit par section, changelog du README à jour, `V` incrémenté.
