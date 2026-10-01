# Corrections, passe 9 : un résultat qui parle au manager comme à un manager

Colle ce texte dans Claude Code, dans le repo `etat-des-lieux`, **après** la passe 8.

---

## Le problème

Quand on répond en tant que manager, le résultat affiche par exemple :

> **Le soutien du manager**
> Votre manager vous soutient. Il y a encore de la place pour qu'il fasse davantage le lien entre les métiers.

Or le manager a répondu à « J'aide mon équipe à travailler ensemble. » Il parle de lui, pas de son manager. La cause : dans `contenu.json`, chaque dimension n'a qu'**une** série de phrases, écrites du point de vue d'un membre. Le même souci touche 3 autres dimensions et la phrase de fin des idées.

## 0. Méthode (comme la passe 8)

- Fichiers autorisés : `contenu.json`, `envies.json`, le JS qui construit le résultat, les tests, `DECISIONS.md`, le README. Ne touche à aucun autre écran.
- Crée `scripts/verifier-passe9.mjs` (Playwright, Chromium et WebKit) qui teste les critères ✅.
- Un commit par point. Rapport final en tableau : point, OK/KO, capture.
- Ne réécris aucun texte : copie ceux d'ici tels quels. Si un doute, applique ce qui est écrit et signale-le dans le rapport.

## 1. Le principe

- Dans `contenu.json > dimensions`, une dimension peut avoir en plus `nom_manager` et `phrases_manager`.
- Côté résultat : si le rôle est « Le manager » **et** que la version manager existe, on l'utilise. Sinon, on garde la version actuelle.
- Le rôle vient du lien personnel. Vérifie qu'il est bien dans le lien `v2`. Pour un lien `v1` sans rôle, on affiche la version membre.
- Le **dashboard ne change pas** : il garde les noms de dimension actuels (« Le soutien du manager », etc.).

## 2. Les textes manager

### « Le soutien du manager » (affirmation 10)

`nom_manager` : **Votre soutien à l'équipe**

| Niveau | Phrase |
| --- | --- |
| enracine | Vous aidez vraiment votre équipe à travailler ensemble. C'est un appui qui compte pour elle. |
| croissance | Vous aidez votre équipe à travailler ensemble. Il y a encore de la place pour faire davantage le lien entre les métiers. |
| germe | Vous aidez votre équipe à travailler ensemble par moments. Vous aimeriez sans doute pouvoir le faire plus souvent. |
| semer | Aider l'équipe à travailler ensemble n'est pas simple aujourd'hui. Le voir clairement, c'est déjà un premier pas, et ça peut évoluer. |

### « Ce qu'on sait les uns des autres » (affirmations 3 et 4)

Le nom ne change pas. `phrases_manager` :

| Niveau | Phrase |
| --- | --- |
| enracine | Dans votre équipe, chacun connaît le travail des autres et sait ce que vous attendez. Ça rend le quotidien plus fluide. |
| croissance | Votre équipe connaît une bonne partie du travail de chacun. Certaines contraintes, ou certaines de vos attentes, restent encore dans l'ombre. |
| germe | Chacun connaît surtout les métiers les plus proches du sien. Ce que vous attendez n'est pas toujours clair pour tous. |
| semer | Le travail de chacun reste encore peu connu des autres, et vos attentes ne sont pas toujours visibles. Ce n'est pas un manque d'envie, souvent un manque d'occasions. |

### « La confiance et le soutien » (affirmations 11, 12 et 13)

Le nom ne change pas. `phrases_manager` :

| Niveau | Phrase |
| --- | --- |
| enracine | Dans votre équipe, chacun peut dire ce qu'il pense, vous parler franchement et compter sur les autres. C'est une chance. |
| croissance | La confiance et l'entraide sont là, même si tout ne se dit pas encore facilement, y compris avec vous. |
| germe | La confiance existe avec certains. Vous dire un désaccord ou demander de l'aide dépend encore des personnes. |
| semer | Dans votre équipe, dire ce qu'on pense ou demander de l'aide ne va pas encore de soi. Le regarder en face demande déjà du courage. |

### « Le sens du travail » (affirmations 14 et 15)

Le nom ne change pas. `phrases_manager` (germe et semer restent identiques à la version membre) :

| Niveau | Phrase |
| --- | --- |
| enracine | Votre équipe voit le sens de son travail, et les chiffres restent au service de ce que vous faites ensemble. |
| croissance | Le sens du travail est là, même si les chiffres prennent parfois beaucoup de place dans vos échanges. |
| germe | Le sens du travail se voit par moments. Les chiffres occupent souvent le devant, et ça peut essouffler. |
| semer | Au quotidien, les chiffres prennent le pas sur le sens du travail. Retrouver pourquoi on fait les choses compte, et vous le sentez. |

Les autres dimensions (vise, place, info, accroche) conviennent aux deux rôles. Pas de version manager.

### La phrase de fin des idées (`envies.json`)

Ajoute `phrase_finale_manager` : « Ces idées sont les vôtres. Elles peuvent nourrir une prochaine discussion, avec votre équipe ou d'autres managers. »

La version membre ne change pas.

## 3. Le titre de groupe dans le questionnaire

Pour un manager, le groupe « Le soutien du manager » devient **« Votre rôle auprès de l'équipe »**. Ajoute `groupe_manager` sur l'affirmation 10 dans `contenu.json`. Le texte « Pourquoi on s'y intéresse » reste le même.

## 4. Vérification

✅ Résultat d'un **manager**, aux 4 niveaux de chaque dimension concernée : le texte affiché ne contient ni « Votre manager », ni « votre manager », ni « qu'il fasse », ni « Vous pouvez dire ce que vous pensez », ni « vos collègues ou votre manager ».
✅ Résultat d'un manager : le titre de la dimension 10 est « Votre soutien à l'équipe ».
✅ Résultat d'un **membre** : strictement identique à avant (compare le texte avant/après pour les 4 niveaux).
✅ Lien `v1` sans rôle : version membre, sans erreur.
✅ Questionnaire en manager : le groupe s'appelle « Votre rôle auprès de l'équipe ». En membre : « Le soutien du manager ».
✅ Dashboard : les noms de dimension n'ont pas changé.

Règles habituelles vérifiées sur tous les nouveaux textes : pas de tiret cadratin, espace insécable avant `? ! : ;`.

Mets `DECISIONS.md` à jour : « Le résultat d'un manager est écrit de son point de vue, pour les dimensions où les affirmations manager diffèrent (soutien du manager, ce qu'on sait les uns des autres, confiance, sens). Le dashboard garde des noms communs. » Changelog du README, `V` incrémenté.
