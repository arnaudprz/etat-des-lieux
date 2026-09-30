# Architecture

## Vue d'ensemble

```
┌──────────────────────────────────────────────────────────────────┐
│  docs/  (site statique, servi par GitHub Pages)                  │
│                                                                  │
│   index.html ──▶ profil.html ──▶ questions.html ──▶ resultat.html│
│                                                      ▲           │
│                                     le lien personnel│(#v1-...)  │
│                                                      │           │
│   confidentialite.html            admin/index.html (clé)         │
│                                                                  │
│   assets/js/                        assets/css/                  │
│   ├─ config.js    URL de l'API      ├─ base.css    charte        │
│   ├─ contenu.js   contenu.json      ├─ parcours.css              │
│   ├─ calcul.js    le résultat       └─ admin.css                 │
│   ├─ lien.js      le hash                                        │
│   ├─ typo.js      typographie                                    │
│   ├─ api.js       appels                                         │
│   ├─ session.js   sessionStorage                                 │
│   ├─ parcours/    une page par fichier                           │
│   └─ admin/       agregats, analyse, filtres, auth, vues/        │
└───────────────────────────┬──────────────────────────────────────┘
                            │  POST text/plain  (pas de preflight CORS)
                            │  GET  ?action=... (compteur, donnees, contacts_csv)
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│  worker/  (Google Apps Script, application web)                  │
│  ┌──────────┐ ┌────────────┐ ┌───────────┐ ┌─────────┐ ┌───────┐ │
│  │ Code.gs  │ │ reponses.gs│ │contacts.gs│ │admin.gs │ │import │ │
│  │ routeur  │ │ validation │ │ séparés   │ │ clé     │ │ papier│ │
│  └──────────┘ └────────────┘ └───────────┘ └─────────┘ └───────┘ │
│  contenu.gs : valeurs autorisées, généré depuis contenu.json     │
└───────────────────────────┬──────────────────────────────────────┘
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│  Google Sheet                                                    │
│   reponses │ evenements │ contacts │ papier                      │
│   ▲ anonymes           ▲ entonnoir  ▲ jamais reliés aux réponses │
└──────────────────────────────────────────────────────────────────┘
```

Pas de framework, pas d'étape de build, pas de dépendance au moment de
l'exécution. Modules ES natifs, cache-busters `?v=N` sur les imports.

## Les trois flux

### Répondre

```
Navigateur                                   Apps Script        Sheet
    │                                             │               │
    │ visite l'accueil                            │               │
    │──POST {action:"evenement", type:"visite"}──▶│──ligne───────▶│ evenements
    │                                             │               │
    │ remplit le profil, garde en sessionStorage  │               │
    │ répond aux 16 affirmations                  │               │
    │──POST {action:"evenement", type:"commence"}▶│──ligne───────▶│ evenements
    │                                             │               │
    │ clique « Voir mon résultat »                │               │
    │──POST {action:"reponse", profil, reponses}─▶│ valide tout   │
    │                                             │──ligne───────▶│ reponses
    │──POST {action:"evenement", type:"termine"}─▶│──ligne───────▶│ evenements
    │                                             │               │
    │ redirige vers resultat.html#v1-m2211...     │               │
    │ calcule le résultat dans le navigateur      │               │
```

Le hash **ne part jamais** au serveur. Et la ligne enregistrée ne porte aucun
identifiant de session : on ne peut pas relier une réponse à une visite.

### Lire son résultat

Rien ne sort du navigateur. `resultat.html` décode le hash, appelle
`calcul.js`, et affiche. Un lien gardé en favoris fonctionne indéfiniment, même
si le backend est éteint.

### Demander l'étude complète

```
Navigateur                                   Apps Script        Sheet
    │──POST {action:"contact", prenom, ...}──────▶│──ligne───────▶│ contacts
```

Cette ligne ne contient **ni identifiant de réponse, ni identifiant de visite**.
Aucun e-mail n'est envoyé.

## Modèle de données

### `reponses`

Une ligne par questionnaire terminé.

| Colonne | Contenu |
| --- | --- |
| `id` | Identifiant aléatoire, sans lien avec quoi que ce soit. |
| `date` | Le jour seulement, jamais l'heure. |
| `source` | `en_ligne` ou `papier`. |
| `version` | `v1`. |
| `role` | `membre` ou `manager`. |
| `genre` | Un choix de `contenu.json`, ou vide. |
| `taille_entreprise`, `secteur`, `taille_equipe` | Un choix de `contenu.json`. |
| `q1` … `q16` | Une valeur de 0 à 3. |
| `relance_q1` … `relance_q16` | Indices des choix séparés par `|`, `autre` compris. Vide sinon. |
| `ref_papier` | Référence de la ligne papier d'origine, vide en ligne. |

### `evenements`

| Colonne | Contenu |
| --- | --- |
| `date` | Le jour. |
| `session` | Identifiant aléatoire propre à la visite. |
| `type` | `visite`, `commence`, `termine` ou `lien_copie`. |

Rien d'autre. Aucun lien avec `reponses`.

### `contacts`

| Colonne | Contenu |
| --- | --- |
| `date`, `prenom`, `nom`, `entreprise`, `email`, `consentement` | |

Aucun identifiant de réponse ni de session.

### `papier`

Zone de saisie des réponses papier. Mêmes colonnes que `reponses`, plus
`ref_papier` qui sert à ne jamais importer deux fois la même ligne.

## Le calcul

`docs/assets/js/calcul.js` est un module pur : pas de DOM, pas de réseau. La
logique de référence est `maquette/Simulateur.dc.html`.

- **Niveau d'une dimension** : moyenne des réponses de ses affirmations,
  arrondie à l'entier le plus proche, les égalités vers le haut (1,5 donne 2).
- **Carte d'ensemble** : moyenne des affirmations 1 à 15, le Q16 exclu.
  Seuils 2,5 / 1,75 / 1. Cette moyenne n'est jamais affichée.
- **Phrase de forme** : même niveau partout donne « homogène » ; au moins
  2 niveaux d'écart donne « contrasté » ; sinon rien.
- **Phrase d'appui** : si le meilleur niveau est Bien enraciné ou En croissance,
  qu'au plus 2 dimensions le partagent, et que le regard n'est pas homogène.

`cartePourMoyenne` est exposée à part pour tester les bornes exactes des seuils,
qu'aucun jeu de 15 réponses entières ne peut produire.

## Le lien personnel

Format : `resultat.html#v1-{r}{16 chiffres}`, `r` valant `m` (membre) ou
`g` (manager). Exemple : `#v1-m2211220023212212`.

Le hash ne contient rien d'autre : ni identifiant, ni profil, ni relances, ni
date. La version `v1` permet de faire évoluer le questionnaire sans casser les
anciens liens : un décodeur qui ne connaît pas la version refuse simplement.

## Anonymat

Quatre garanties, à quatre endroits différents :

1. **Dans les réponses** : aucune donnée personnelle, aucun identifiant de
   session, la date au jour près.
2. **Dans le lien** : rien que les réponses, et il ne quitte pas le navigateur.
3. **Dans l'API** : l'action `donnees` ne renvoie ni les contacts ni les
   identifiants de ligne, seulement le nombre de contacts. Les coordonnées
   passent par `contacts_csv`, une réponse séparée.
4. **Dans le tableau de bord** : aucun chiffre calculé sur moins de 3 personnes
   (`K_MINI` dans `admin/agregats.js`). Les fonctions concernées renvoient
   `null`, et les vues affichent « Pas assez de réponses pour ce groupe ».

## Typographie

`contenu.json` garde des textes simples : espaces normales, apostrophes droites,
aucun tiret cadratin. `typo.js` applique la typographie française **à
l'affichage** : espace insécable avant `? ! : ;` et à l'intérieur des
guillemets. On ne réécrit jamais la source.

`typo.js` ne fait que remplacer des espaces déjà présentes, jamais en insérer :
cela évite de casser une adresse `https://` ou une heure comme `14:30`.

## Mode démo

`modeDemo()` est vrai si l'URL porte `?demo=1`, ou si `API_URL` est vide, ce qui
est le cas de la version locale. Dans ce mode :

- aucune requête ne sort ;
- un bandeau discret le signale sur les pages publiques ;
- le tableau de bord ne demande pas de clé et affiche des données fictives,
  tirées avec une graine fixe pour qu'une démonstration ne change pas.

## Ce qui n'est pas là, volontairement

- Aucun envoi d'e-mail.
- Aucun PDF.
- Aucune invitation d'équipe, aucun partage au manager.
- Aucun contenu commercial côté public.
- Aucune réponse committée dans le repo : tout vit dans le Sheet.
