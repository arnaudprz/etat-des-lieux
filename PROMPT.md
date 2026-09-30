# Prompt Claude Code : État des lieux d'équipe Greatly

Colle ce texte dans Claude Code, lancé depuis le dossier `10_Outils/etat-des-lieux` (celui qui contient ce fichier).

---

## 0. Ta mission

Tu vas construire **l'État des lieux d'équipe Greatly** : un questionnaire public en 2 minutes sur la façon dont une équipe travaille ensemble, un résultat personnel en couleurs, et un tableau de bord privé pour Greatly.

Tu travailles dans un **nouveau repo GitHub : `arnaudprz/etat-des-lieux`**, distinct de tous les autres repos Greatly. Le site est servi par GitHub Pages depuis `docs/` : `https://arnaudprz.github.io/etat-des-lieux/`.

Le dossier courant contient déjà :

| Fichier | Rôle |
| --- | --- |
| `PROMPT.md` | Ce cahier des charges. Garde-le dans le repo sous `SPEC.md`. |
| `contenu.json` | **Source unique de tous les textes** : affirmations membre et manager, questions de relance et leurs choix, 32 phrases de dimension, 4 cartes d'ensemble, phrases de forme, profil, secteurs, couleurs, correspondance Fondations. |
| `maquette/` | Les maquettes validées (`*.dc.html`), la photo de la Greatly House et `canvas.json`. C'est la **référence visuelle**. |
| `maquette/captures/` | **Une capture PNG de chaque écran**, en 1280 (ordinateur) et 390 (mobile, fichiers `*-mobile.png`). Regarde-les avant de coder chaque écran. |
| `DECISIONS.md` | Les choix faits pendant la conception et leur raison. À respecter, et à relire quand tu hésites. |

Tu lis tout avant d'écrire une ligne. Tu ne réécris aucun texte : tu les charges depuis `contenu.json`. Si un texte manque, tu le prends mot pour mot dans la maquette. Si tu hésites, tu demandes.

### Comment lire les maquettes

Les fichiers `maquette/*.dc.html` utilisent un moteur de modèle propre à l'outil de maquettage : `{{variable}}`, `<sc-for>`, `<sc-if>`, `<helmet>`, et une classe `Component extends DCLogic` en bas de fichier. Ils ne s'affichent pas tels quels dans un navigateur. **Ne recopie pas ce moteur.** Lis le HTML et les styles en ligne pour reprendre la mise en page, les espacements, les tailles et les couleurs, puis réécris le tout en HTML, CSS et JavaScript standards.

| Maquette | Écran |
| --- | --- |
| `Main.dc.html` / `Main-mobile.dc.html` | 1. Accueil |
| `Profil.dc.html` / `Profil-mobile.dc.html` | 2. Profil |
| `Questions.dc.html` / `Questions-mobile.dc.html` | 3. Les 16 affirmations et les relances |
| `Resultat.dc.html` / `Resultat-mobile.dc.html` | 4. Résultat |
| `Dashboard.dc.html` | Tableau de bord privé (ordinateur seulement) |
| `Global.dc.html` | Outil interne : les 4 cartes d'ensemble |
| `Simulateur.dc.html` | Outil interne : simulateur de résultat (sa logique JS est la référence de calcul) |
| `Complementaires.dc.html` | Outil interne : toutes les relances |

**Méthode visuelle** : pour chaque écran, ouvre la capture PNG correspondante, code l'écran, fais une capture de ta page à la même largeur (Playwright), et compare les deux côte à côte. Corrige jusqu'à ce qu'elles se ressemblent : mêmes blocs, même ordre, mêmes couleurs, mêmes proportions. Les états montrés (réponses cochées, relances ouvertes, liste des secteurs dépliée) sont des exemples d'état, pas l'état par défaut.

Les maquettes du dashboard contiennent des **données fictives**. Le vrai dashboard calcule tout à partir des vraies réponses.

---

## 1. Principes non négociables

1. **Aucune note, aucun chiffre, aucun pourcentage côté répondant.** Le répondant ne voit que des mots et 4 couleurs. Les chiffres n'existent que dans le tableau de bord privé.
2. **Ton empathique, positif, sans jugement.** Jamais « score », « faible », « mauvais », « problème ». On dit « état des lieux », jamais « diagnostic ».
3. **Rien de commercial.** Pas d'offre, pas de prix, pas de prise de rendez-vous, pas de mention de l'accompagnement Les Fondations côté public.
4. **Aucun e-mail envoyé**, ni au répondant ni à personne. Pas de PDF. Le répondant garde son résultat grâce à **son lien personnel**.
5. **Pas d'invitation d'équipe**, pas de partage à son manager ou à ses collègues. On ne met aucune pression sur le manager.
6. **Anonymat réel.** Les réponses ne contiennent aucune donnée personnelle. Les coordonnées laissées pour recevoir l'étude complète sont stockées **à part** et ne sont **jamais reliées** aux réponses, même par un identifiant.
7. **Pas d'éclairage sur les travaux de Gittell dans le résultat.** Les sources apparaissent seulement sur l'accueil, dans « Sur quoi repose l'état des lieux ».
8. **Typographie des textes** : pas de tiret cadratin ni de tiret d'incise dans les textes affichés. Guillemets français « ». Espace insécable avant `? ! : ;` et à l'intérieur des guillemets, pour qu'un « ? » ne se retrouve jamais seul en début de ligne.
9. **Mobile d'abord** pour tout le parcours public. Le dashboard est pour ordinateur.
10. **Accessible** : contrastes AA, focus visible, boutons de réponse utilisables au clavier (`role="radiogroup"` ou `aria-pressed`), libellés explicites, jamais d'information portée par la couleur seule (chaque couleur a toujours son nom écrit à côté).
11. **Règles d'écriture de tout texte généré** (résultat, « L'essentiel ») : décrire, ne pas conseiller ; parler de la situation, jamais des personnes (pas de coupable, pas de « vous devriez ») ; toujours commencer par ce qui est déjà là ; écrire « dans votre regard », c'est une perception, pas un verdict.

---

## 2. Architecture

Même esprit que le repo `Greatly-retours` (dans `10_Outils/Greatly-retours`, lis son `ARCHITECTURE.md` pour t'aligner) : site statique sur GitHub Pages, backend Google Apps Script, pas de framework, pas d'étape de build.

```
etat-des-lieux/
├── README.md              Présentation, URL, statut, changelog
├── ARCHITECTURE.md        Schéma, flux de données, modèle de données
├── DEPLOY.md              Déploiement pas à pas (Pages, Apps Script, Sheet, clés)
├── SPEC.md                Ce cahier des charges
├── maquette/              Maquettes de référence (ne sont pas servies)
├── docs/                  Front servi par GitHub Pages
│   ├── index.html         1. Accueil
│   ├── profil.html        2. Profil
│   ├── questions.html     3. Affirmations et relances
│   ├── resultat.html      4. Résultat (lit le hash de l'URL)
│   ├── confidentialite.html
│   ├── admin/index.html   Tableau de bord privé
│   └── assets/
│       ├── data/contenu.json
│       ├── img/greatly-house.jpg
│       ├── css/ (base.css, parcours.css, admin.css)
│       └── js/
│           ├── config.js      URL de l'API, version du questionnaire
│           ├── contenu.js     Chargement de contenu.json
│           ├── calcul.js      Calcul du résultat (module pur, sans DOM)
│           ├── lien.js        Encodage et décodage du lien personnel
│           ├── api.js         Appels à l'API (POST text/plain)
│           ├── parcours/      profil.js, questions.js, resultat.js
│           └── admin/         auth.js, filtres.js, agregats.js, analyse.js, vues/*.js
├── worker/                Google Apps Script (déployé avec clasp)
│   ├── appsscript.json
│   ├── Code.gs            Routeur doGet / doPost
│   ├── reponses.gs        Enregistrement des réponses et des événements
│   ├── contacts.gs        Demandes de l'étude complète (feuille séparée)
│   ├── admin.gs           Données du dashboard, export CSV (protégé par clé)
│   ├── import.gs          Import des réponses papier
│   └── .clasp.json.example
├── scripts/
│   └── import-papier/     Modèle CSV et notice pour saisir les 255 réponses papier
└── tests/
    └── calcul.test.js     Tests du calcul (node --test, sans dépendance)
```

- Modules ES natifs (`<script type="module">`), cache-busters `?v=N` sur les imports comme dans Greatly-retours.
- Polices Google Fonts : Playfair Display (titres) et DM Sans (texte).
- Toutes les couleurs dans des variables CSS sur `:root`.
- **Aucune réponse n'est jamais commitée dans le repo** : le repo est public. Toutes les données vivent dans le Google Sheet.

---

## 3. Charte

| Jeton | Valeur |
| --- | --- |
| Sauge | `#6B7D5C` |
| Sauge foncé (boutons) | `#5A6B4D` |
| Sauge clair | `#8A9B7A` |
| Crème (fond) | `#F7F4EF` |
| Encre | `#1A1A1A` |
| Taupe (texte secondaire) | `#6B6460` |
| Forêt (bandeau, pied de page) | `#2D3626` |

Les 4 couleurs de niveau (validées pour le daltonisme, garde-les exactement) :

| Niveau | Couleur | Fond | Texte |
| --- | --- | --- | --- |
| Bien enraciné | vert forêt | `#3F4F35` | blanc |
| En croissance | sauge | `#8FA878` | `#1A1A1A` |
| En germe | sable | `#E3CF9E` | `#1A1A1A` |
| À semer | terre | `#A9743A` | `#1A1A1A` |

Boutons en pilule (hauteur 52px), cartes blanches à coins 16px, bordure `rgba(138,155,122,.18)`, ombre douce. Reprends les valeurs exactes des maquettes.

---

## 4. Le parcours public

### Bandeau commun (toutes les pages publiques)

Bandeau de 40px en haut, fond forêt : « Un état des lieux proposé par Greatly, qui accompagne dirigeants, managers et équipes à la Greatly House, près de Lille » suivi du lien « Qui sommes-nous » vers `https://greatly.club`. Sur mobile, version courte : « Proposé par Greatly, près de Lille » et le lien « En savoir plus » (voir `Main-mobile.dc.html`).

Sous le bandeau, un fil d'étapes : Profil, Vos réponses, Votre état des lieux (voir maquettes).

### 4.1 Accueil (`index.html`)

Reprends `Main.dc.html` à l'identique :
- Badge « État des lieux d'équipe · 2 minutes ».
- Titre « Faites le point sur votre façon de travailler ensemble » et le paragraphe d'intro tel quel.
- Bouton « Faire mon état des lieux » et à côté **le compteur** « **N** personnes ont déjà participé » (voir section 7 pour le calcul de N).
- « Anonyme · Aucun compte à créer · Résultat immédiat ».
- Carte « Aperçu du résultat » avec 3 exemples de pastilles.
- « À la fin, vous recevez » : 3 cartes.
- « Sur quoi repose l'état des lieux » : le paragraphe, les 3 liens sources, la mention « Formulations Greatly, inspirées de ces travaux », les 8 dimensions.
- Second bouton, puis pied de page avec la mention d'anonymat et le lien vers `confidentialite.html`.
- Balises Open Graph (titre, description, image de la Greatly House).

### 4.2 Profil (`profil.html`)

Textes et choix dans `contenu.json > profil`. Dans l'ordre :
1. Rôle : Le manager / Un membre de l'équipe (obligatoire). **Il détermine la version des affirmations.**
2. Genre (facultatif) : Une femme / Un homme / Non binaire / Je préfère ne pas répondre.
3. Taille de l'entreprise (6 tranches, obligatoire).
4. Secteur : **champ de recherche** (combobox accessible, recherche insensible aux accents et à la casse), 19 secteurs + Autre. Obligatoire.
5. Taille de l'équipe (3 tranches, obligatoire).

Boutons Retour et Continuer. Continuer reste inactif tant qu'un champ obligatoire manque, avec un message clair.

### 4.3 Affirmations (`questions.html`)

- Titre « Comment vivez-vous le travail ensemble ? » et le texte d'intro de la maquette. Retire le bloc « Aperçu » et le bouton de bascule membre/manager de la maquette : dans le vrai parcours, la version suit le rôle choisi au profil.
- **16 affirmations** regroupées sous les titres de groupe de `contenu.json` (version `membre` ou `manager`).
- Pour chacune, 4 boutons : Pas du tout (0), Plutôt pas (1), Plutôt (2), Tout à fait (3). **Aucun chiffre affiché.**
- **Les relances** : dès qu'une réponse change, on recalcule les **2 affirmations les plus réservées** parmi celles dont la valeur est 0 ou 1 (la plus basse d'abord, à égalité l'ordre des affirmations). Sous chacune de ces 2 seulement, un encadré apparaît :
  - le début de phrase (`relance.membre.debut` ou `relance.manager.debut`, par exemple « J'aimerais… »), le sous-titre « Deux réponses au plus » ;
  - les choix de `contenu.json` plus « Autre » ;
  - 2 cases cochées au maximum (les autres se désactivent quand 2 sont cochées).
  - Si l'affirmation sort des 2 plus réservées, son encadré disparaît et ses choix sont effacés.
  - La relance s'applique aussi à l'affirmation 16.
- Bouton « Voir mon résultat », actif quand les 16 affirmations ont une réponse. Les relances sont facultatives.
- Barre de progression discrète (sans chiffre ni pourcentage).
- Si la personne revient en arrière, ses réponses sont conservées (`sessionStorage`, lecture et écriture dans des try/catch).

### 4.4 Résultat (`resultat.html`)

Le résultat est calculé **dans le navigateur** à partir du lien personnel (section 5), jamais depuis le serveur. Ordre de la page, voir `Resultat.dc.html` :

1. Titre « Votre état des lieux » et le sous-titre « Une photo de votre équipe aujourd'hui, telle que vous la voyez. Pas de note, pas de classement. »
2. **La carte d'ensemble** : étiquette « Votre équipe, dans votre regard : {niveau} », titre et texte de la carte, suivis selon le cas de la phrase d'appui et de la phrase de forme (section 5).
3. **Les 4 colonnes de couleur** : chaque dimension est rangée dans la colonne de son niveau, avec son nom et sa phrase. On n'affiche que les colonnes non vides. Sur mobile, les colonnes s'empilent.
4. La ligne « Bientôt : votre état des lieux à côté de celui des autres répondants. »
5. **« Votre lien personnel »** sur toute la largeur : le texte de la maquette et le bouton « Copier le lien » (Clipboard API, message « Lien copié » annoncé aux lecteurs d'écran). La copie envoie l'événement `lien_copie`.
6. **Bloc Greatly** (« Qui est derrière cet état des lieux ») : les deux paragraphes, la photo de la Greatly House et « Découvrir Greatly » vers `https://greatly.club`.
7. **« Recevoir l'étude complète »** sur toute la largeur, sous le bloc Greatly : prénom, nom, entreprise, e-mail professionnel (tous obligatoires), case de consentement obligatoire avec le texte de la maquette, bouton « Recevoir l'étude complète ». Après envoi : message de confirmation chaleureux, sans e-mail envoyé. Champ piège invisible anti-robots.
8. Pied de page.

Le Q16 (« Mon équipe obtient les résultats qu'elle vise. ») n'apparaît **jamais** dans le résultat. Il sert à la modélisation dans le dashboard.

Si l'URL n'a pas de hash valide : message doux et bouton vers l'accueil.

---

## 5. Le calcul (module `calcul.js`, testé)

Reprends exactement la logique de `maquette/Simulateur.dc.html`.

- Réponses : tableau de 16 valeurs de 0 à 3.
- **Niveau d'une dimension** = moyenne des réponses de ses affirmations (`contenu.json > dimensions[].affirmations`), arrondie à l'entier le plus proche, **les égalités vont vers le haut** (1,5 donne 2). Valeur 3 = Bien enraciné, 2 = En croissance, 1 = En germe, 0 = À semer.
- **Carte d'ensemble** = moyenne des affirmations 1 à 15 (le Q16 est exclu), jamais affichée :
  - ≥ 2,5 : Bien enraciné
  - ≥ 1,75 : En croissance
  - ≥ 1 : En germe
  - sinon : À semer
- **Phrase de forme** (après le texte de la carte) :
  - si toutes les dimensions ont le même niveau : phrase « homogène » ;
  - sinon, si l'écart entre la meilleure et la moins installée est d'au moins 2 niveaux : phrase « contrastée » ;
  - sinon : rien.
- **Phrase d'appui** « Ce qui vous porte le plus : x et y. » si le meilleur niveau est Bien enraciné ou En croissance, qu'au plus 2 dimensions partagent ce meilleur niveau, et que le regard n'est pas homogène. Noms de dimension en minuscule initiale, reliés par « et ».
- Écris `tests/calcul.test.js` avec `node --test` : arrondis, égalités, seuils de la carte (1,74 / 1,75 / 2,49 / 2,5), homogène, contrasté, appui (0, 1, 2 et 3 dimensions en tête), et les 4 préréglages du simulateur.

### Le lien personnel (`lien.js`)

- Format : `resultat.html#v1-{r}{16 chiffres}`, où `r` vaut `m` (membre) ou `g` (manager). Exemple : `#v1-m2211220023212212`.
- Le hash ne contient **rien d'autre** : ni identifiant, ni profil, ni relances, ni date. Le hash n'est jamais envoyé au serveur.
- La version `v1` permet de faire évoluer le questionnaire plus tard sans casser les anciens liens.
- Après « Voir mon résultat », on redirige vers ce lien et on invite à le garder en favoris.

---

## 6. Données et backend (Google Apps Script + Google Sheet)

Un seul Google Sheet, propriété du compte Greatly, avec ces onglets :

| Onglet | Contenu |
| --- | --- |
| `reponses` | Une ligne par questionnaire terminé : `id` (aléatoire, sans lien avec rien), `date` (jour seulement), `source` (`en_ligne` ou `papier`), `version`, `role`, `genre`, `taille_entreprise`, `secteur`, `taille_equipe`, `q1`…`q16`, `relance_q{n}` (indices des choix séparés par `|`, `autre` compris) pour chaque affirmation relancée. |
| `evenements` | Entonnoir : `date`, `session` (aléatoire, propre à la visite), `type` (`visite`, `commence`, `termine`, `lien_copie`). Rien d'autre. |
| `contacts` | `date`, `prenom`, `nom`, `entreprise`, `email`, `consentement`. **Aucun identifiant de réponse ni de session.** |
| `papier` | Zone d'import des réponses papier (section 7). |

Règles :
- Le front envoie tout en `POST` avec `Content-Type: text/plain` (évite le preflight CORS), comme Greatly-retours.
- Actions POST : `reponse`, `evenement`, `contact`. Validation stricte côté serveur (valeurs autorisées issues de `contenu.json`, 16 réponses de 0 à 3, 2 choix maximum par relance, 2 relances maximum). Tout le reste est rejeté.
- Limitation simple avec `CacheService` (nombre d'envois par minute) et champ piège.
- Actions GET publiques : `compteur` seulement.
- Actions GET protégées par clé : `donnees` (lignes anonymes de `reponses` et agrégats de `evenements`) et `contacts_csv`. La clé est dans les **Script Properties** (`ADMIN_KEY`), jamais dans le code ni dans le repo.
- Le script ne lit jamais `contacts` en même temps que `reponses` dans une même réponse d'API.
- `worker/.clasp.json.example` et les étapes `clasp login`, `clasp push`, déploiement en application web (exécuter en tant que moi, accès à tous) dans `DEPLOY.md`.
- L'URL de l'application web va dans `docs/assets/js/config.js`. Un **mode démo** (`?demo=1`) permet de parcourir tout le site sans backend, avec des données fictives dans le dashboard.

---

## 7. Les 255 réponses papier et le compteur

- **255 personnes ont déjà répondu sur papier.** C'est un vrai chiffre. Ces réponses doivent être importées dans le Sheet avec `source = papier`.
- Fournis dans `scripts/import-papier/` un modèle CSV (mêmes colonnes que `reponses`, profil facultatif, relances facultatives) et une notice. `worker/import.gs` copie l'onglet `papier` vers `reponses` en vérifiant chaque ligne et en ignorant les doublons déjà importés (colonne `ref_papier`).
- **Compteur de l'accueil** = réponses papier + réponses en ligne terminées. Tant que l'import papier n'est pas fait, on utilise la valeur de base `PAPIER_BASE = 255` (Script Property). Dès qu'il y a des lignes papier importées, on compte les lignes réelles. **Jamais de double comptage.**
- Le compteur est mis en cache 10 minutes côté script. Si l'API ne répond pas, on affiche 255.

---

## 8. Le tableau de bord (`docs/admin/`)

Reprends `Dashboard.dc.html` section par section, dans cet ordre, avec les vraies données. Accès par clé (saisie une fois, gardée en `sessionStorage`). Ajoute `<meta name="robots" content="noindex">`.

1. **Filtres** en une ligne : Source (Toutes / En ligne / Papier), Période, Rôle, Taille d'entreprise, Secteur, Genre, Taille d'équipe. Tout le reste se recalcule.
2. **Indicateurs** : Répondants (dont managers et membres), Taux de complétion (terminés sur commencés), Secteurs représentés, Liens personnels copiés.
3. **« L'essentiel »** : 4 constats rédigés automatiquement par des règles, qui se mettent à jour avec les filtres, et la mention « Elle décrit des perceptions, pas des causes. » :
   - *Ce qui porte les équipes* : les 2 dimensions avec la plus forte part de réponses Plutôt ou Tout à fait.
   - *Ce qui peut grandir* : les 2 dimensions les moins installées, et le souhait le plus choisi dans la relance de l'affirmation la moins installée.
   - *Deux regards différents* : l'écart managers/membres, et les 2 dimensions où il est le plus fort (en points).
   - *Le lien avec les résultats* : pour chaque dimension, la part d'accord au Q16 quand la dimension est installée (Bien enraciné ou En croissance) comparée aux autres. On cite l'écart le plus marqué.
   - « À creuser » : les 3 questions de la maquette.
   Phrases courtes, sans jargon, sans tirets. Si un groupe compte moins de 3 personnes, la phrase concernée ne s'affiche pas.
4. **Les 4 conditions des Fondations** : part de Plutôt ou Tout à fait par condition (`contenu.json > fondations`).
5. **Qui a répondu** : total en ligne et total papier, barres empilées avec les effectifs et les parts (rôle, genre, taille d'entreprise, taille d'équipe), classement des secteurs.
6. **Entonnoir** : visites, questionnaires commencés, terminés, liens copiés, demandes de l'étude complète.
7. **Demandes de l'étude complète** : tableau des contacts et bouton « Exporter les contacts (CSV) », avec la mention qu'ils ne sont jamais reliés aux réponses.
8. **Dimensions en barres empilées** : part des répondants dans chaque couleur, par dimension. Titre qui dit le constat.
9. **Cartes d'ensemble reçues** : part des répondants par carte.
10. **Toutes les réponses, affirmation par affirmation**, avec la bascule Membres / Managers :
    - à gauche, en grand, la part « d'accord » (Plutôt + Tout à fait) ;
    - le détail des 4 réponses ;
    - l'affirmation ;
    - l'encadré sable : « Ceux qui ne sont pas d'accord ont complété : « {début de relance} » », puis « Le souhait le plus choisi : {choix} » et « {x} % d'entre eux », avec **le nombre de personnes** derrière ce pourcentage.
11. **Managers et membres** comparés par dimension.
12. **Le lien avec le Q16**.

Règles du dashboard :
- **Anonymat k ≥ 3** : aucun chiffre calculé sur moins de 3 personnes ne s'affiche. On affiche « Pas assez de réponses pour ce groupe » à la place.
- Les pourcentages sont arrondis à l'unité. Les totaux affichés gardent leurs effectifs.
- Chaque graphique a un survol qui donne l'effectif et la part.
- Aucune bibliothèque lourde : SVG ou HTML/CSS pour les barres.

---

## 9. Page de confidentialité (`confidentialite.html`)

Texte simple et clair : ce qui est collecté (réponses anonymes, profil sans identité, événements de visite), ce qui ne l'est pas (aucun nom dans les réponses, pas de cookie publicitaire, pas d'adresse IP stockée), les coordonnées de l'étude complète stockées à part et utilisées seulement pour envoyer l'étude, la durée de conservation, le contact `arnaud@greatly.club` pour exercer ses droits. Laisse un encadré `[À VALIDER]` sur les points juridiques.

---

## 10. Livraison et méthode

1. Crée le repo `arnaudprz/etat-des-lieux` (public, GitHub Pages sur `main`, dossier `/docs`). Déplace `contenu.json` dans `docs/assets/data/`, la photo dans `docs/assets/img/`, `PROMPT.md` en `SPEC.md`.
2. Avance par petits commits en français, et tiens le changelog du `README.md` à jour (tableau heure, commit, description, comme Greatly-retours).
3. Ordre conseillé :
   1. `calcul.js`, `lien.js` et leurs tests ;
   2. le parcours public en mode démo (accueil, profil, affirmations, résultat), ordinateur puis mobile ;
   3. le backend Apps Script et le Sheet ;
   4. le dashboard ;
   5. l'import papier ;
   6. `ARCHITECTURE.md` et `DEPLOY.md`.
4. À chaque étape, ouvre les pages dans un navigateur (Playwright est pratique) et compare-les aux maquettes, en largeur 1280 et 390. Vérifie qu'il n'y a pas de défilement horizontal sur mobile.
5. Avant de dire « fini », fais cette vérification :
   - Les 16 affirmations existent en version membre et manager.
   - Les 16 relances sont complètes, avec leurs deux versions quand elles existent.
   - Les 32 phrases de dimension et les 4 cartes sont reprises mot pour mot.
   - Le répondant ne voit aucun chiffre.
   - Aucun e-mail n'est envoyé.
   - Les contacts ne sont jamais reliés aux réponses.
   - Le seuil k ≥ 3 est respecté partout.
   - Le compteur ne compte jamais deux fois.
   - Les tests passent.
   - Aucun texte affiché ne contient de tiret cadratin.
6. Ce que je dois faire moi-même, liste-le clairement à la fin dans `DEPLOY.md` :
   - créer le Google Sheet ;
   - faire `clasp login` ;
   - définir `ADMIN_KEY` et `PAPIER_BASE` ;
   - coller l'URL de l'API ;
   - activer GitHub Pages ;
   - saisir les réponses papier.

Si quelque chose dans ce cahier des charges te semble contradictoire ou flou, pose la question avant de coder.
