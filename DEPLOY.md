# Mise en ligne


> **Depuis le 1er octobre 2026, `ADMIN_KEY` ne sert plus.** Le tableau de bord
> s'ouvre par connexion Google (voir `worker/acces.gs`) :
> - `arnaudprz@gmail.com` entre toujours ;
> - pour autoriser quelqu'un d'autre, ajouter son adresse Gmail dans l'onglet
>   `acces` du classeur, une par ligne (colonne `email`). La retirer coupe l'accès.
> - L'identifiant OAuth vit dans le projet Google Cloud `greatly-etat-des-lieux`
>   (client « Tableau de bord », origines `https://etat-des-lieux.greatly.club`
>   et `http://localhost:8080`). Il figure dans `worker/acces.gs` et
>   `docs/assets/js/config.js`.
> - La propriété `ADMIN_KEY` peut être supprimée des Script Properties.
Le site est **déjà en ligne** sur <https://etat-des-lieux.greatly.club/>,
en mode démo. Le backend est **créé, poussé et déployé** ; il manque seulement
l'autorisation Google et la clé d'administration, que toi seul peux donner.

Ce document décrit l'ensemble de la procédure, avec ce qui est fait et ce qui
reste.

Tout est expliqué pas à pas. Tu n'as pas besoin de savoir développer.

---

## Où on en est

| # | Étape | État |
| --- | --- | --- |
| 1 | Créer le Google Sheet | **Fait** (créé avec le script lié) |
| 2 | Installer `clasp` et se connecter | **Fait** (`npx clasp`, compte `arnaudprz@gmail.com`) |
| 3 | Pousser le code et déployer en application web | **Fait** (déploiement `v1`) |
| 4 | **Autoriser le script dans le navigateur** | **À faire par toi** |
| 5 | **Définir `ADMIN_KEY`** | **À faire par toi** |
| 6 | Coller l'URL de l'API dans `config.js` | À faire ensuite |
| 7 | Créer le repo GitHub et activer Pages | **Fait** |

Les étapes 4 et 5 passent par une fenêtre de consentement Google et par
l'interface de l'éditeur : elles ne peuvent pas être automatisées. Compte deux
minutes.

`PAPIER_BASE` n'a **pas** besoin d'être défini : le code retombe déjà sur 255
(`PAPIER_BASE_DEFAUT` dans `contenu.gs`).

Et plus tard, quand tu voudras : saisir les 255 réponses papier.

---

## 1. Créer le Google Sheet

1. Va sur <https://sheets.new> avec le compte Google de Greatly.
2. Nomme le classeur **« État des lieux d'équipe · données »**.
3. Note son URL, tu en auras besoin à l'étape 3.

Tu n'as **pas** besoin de créer les onglets à la main : le script les crée avec
leurs en-têtes la première fois qu'il en a besoin.

> Ce classeur contiendra toutes les réponses. Ne le partage pas publiquement.

---

## 2. Installer clasp et se connecter

`clasp` est l'outil qui envoie le code dans Google Apps Script.

`clasp` est installé **dans le projet**, pas globalement (l'installation globale
demande les droits administrateur) :

```sh
npm install          # installe clasp avec les autres dépendances
npx clasp login      # seulement si tu n'es pas déjà connecté
npx clasp show-authorized-user   # pour vérifier avec quel compte
```

> On utilise `clasp` **v3**, dont les commandes diffèrent de la v2 :
> `create-script`, `create-deployment`, `update-deployment`.

Une page s'ouvre dans le navigateur : connecte-toi avec le compte Google de
Greatly, celui qui possède le Sheet.

Si `npx clasp login` refuse de démarrer, active d'abord l'API Apps Script sur
<https://script.google.com/home/usersettings>.

---

## 3. Déployer le script

### Créer le projet lié au Sheet

Déjà fait, avec une seule commande qui crée **le classeur et le script lié** :

```sh
cd worker
npx clasp create-script --type sheets --title "État des lieux d'équipe · données"
```

Elle écrit `worker/.clasp.json` avec l'identifiant du script. Ce fichier est
ignoré par git : il ne partira jamais dans le repo, qui est public.

> `create-script` écrase `appsscript.json` par celui de Google. Il faut
> **restaurer le nôtre** : il porte `Europe/Paris` et surtout le bloc `webapp`
> qui ouvre l'application en accès anonyme. Sans lui, le site ne peut rien
> enregistrer.

Ensuite, envoyer le code et déployer :

```sh
npx clasp push --force
npx clasp create-deployment --description "v1"
```

### Autoriser le script

**C'est l'étape qui ne peut pas être automatisée.** L'application s'exécute
« en tant que moi » : tant que le propriétaire n'a pas accordé les
autorisations, elle répond `403 Une autorisation est nécessaire`, même
correctement déployée.

1. Ouvre l'éditeur : `cd worker && npx clasp open-script`
2. En haut, choisis la fonction **`compteurPublic`** et clique **Exécuter**.
3. Google demande les autorisations. Il affiche « Cette application n'est pas
   validée » : c'est normal pour un script personnel. Clique **Paramètres
   avancés**, puis **Accéder à … (non sécurisé)**, puis **Autoriser**.

### Définir les deux réglages

Dans l'éditeur Apps Script : **Paramètres du projet ▸ Propriétés du script ▸
Ajouter une propriété**.

| Propriété | Valeur | À quoi ça sert |
| --- | --- | --- |
| `ADMIN_KEY` | une longue phrase que tu inventes | Ouvre le tableau de bord. |
| `PAPIER_BASE` | `255` | Facultatif : le code retombe déjà sur 255 tout seul. |

> **Écris le nom exactement `ADMIN_KEY`, en capitales.** Les noms de
> propriétés distinguent les majuscules : avec `ADMIN_Key`, le script ne
> trouve rien et refuse toutes les clés, sans message explicite.

> Et n'oublie pas **Enregistrer les propriétés du script** : sans ce clic, la
> ligne reste affichée mais n'est pas conservée.

Tu peux aussi ajouter `PLAFOND_PAR_MINUTE` (120 par défaut) pour régler la
limite d'envois par minute.

Pour `ADMIN_KEY`, prends quelque chose de long et non devinable, par exemple
quatre mots au hasard collés par des tirets. **Ne la mets jamais dans le repo,
ni dans un e-mail.** Garde-la dans ton gestionnaire de mots de passe.

### Déployer en application web

Bouton **Déployer ▸ Nouveau déploiement**, puis :

| Réglage | Valeur |
| --- | --- |
| Type | Application web |
| Description | `v1` |
| Exécuter en tant que | **Moi** |
| Qui a accès | **Tout le monde** |

Google demandera une autorisation, et affichera un écran « Cette application
n'est pas validée ». C'est normal pour un script personnel : clique sur
**Paramètres avancés**, puis sur **Accéder à … (non sécurisé)**.

Copie l'**URL de l'application web**. Elle ressemble à
`https://script.google.com/macros/s/AKfycb.../exec`.

> À chaque `npx clasp push`, il faut **redéployer** pour que la modification
> soit en ligne, avec `npx clasp update-deployment <id>` ou, dans l'interface,
> Déployer ▸ Gérer les déploiements ▸ crayon ▸ Nouvelle version. Garder le même
> déploiement garde la même URL.

### Vérifier

Ouvre dans le navigateur :

```
https://script.google.com/macros/s/.../exec?action=compteur
```

Tu dois voir `{"ok":true,"total":255}`.

---

## 4. Brancher le site sur l'API

Ouvre `docs/assets/js/config.js` et remplis la première ligne :

```js
export const API_URL = 'https://script.google.com/macros/s/AKfycb.../exec';
```

Incrémente aussi `V` (le cache-buster) à chaque mise en ligne, pour que les
navigateurs rechargent bien les fichiers.

Dès que `API_URL` n'est plus vide, le mode démo s'éteint tout seul. Pour
retrouver la démo à tout moment, ajoute `?demo=1` à l'adresse.

Teste en local avant de publier :

```sh
npm run local
```

---

## 5. Mettre le site en ligne

> **Déjà fait.** Le repo est <https://github.com/arnaudprz/etat-des-lieux> et
> Pages sert `main` / `/docs`. Cette section reste pour mémoire.

### Créer le repo

```sh
gh repo create arnaudprz/etat-des-lieux --public --source=. --remote=origin --push
```

Si tu préfères l'interface : crée un repo public **`etat-des-lieux`** sur
<https://github.com/new>, puis :

```sh
git remote add origin https://github.com/arnaudprz/etat-des-lieux.git
git push -u origin main
```

> **L'aperçu des réseaux sociaux** est déclaré en adresse absolue dans
> `docs/index.html` (`og:url` et `og:image`), pointant vers
> `https://etat-des-lieux.greatly.club/`. Si tu publies ailleurs,
> corrige ces deux balises, sinon LinkedIn et WhatsApp n'afficheront pas
> l'image. Pour la régénérer après un changement de titre :
> `node scripts/generer-images.mjs`.

### Activer GitHub Pages

Sur le repo : **Settings ▸ Pages**.

| Réglage | Valeur |
| --- | --- |
| Source | Deploy from a branch |
| Branch | `main` |
| Dossier | **`/docs`** |

Après une minute, le site est sur
<https://etat-des-lieux.greatly.club/>.

Le tableau de bord est sur
<https://etat-des-lieux.greatly.club/admin/>. Il demande `ADMIN_KEY`, et
porte `noindex` pour ne pas se retrouver dans les moteurs de recherche.

> Le repo est **public**. C'est voulu : il ne contient que du code. Aucune
> réponse n'y est jamais écrite, et aucune clé non plus.

---

## Plus tard : les 255 réponses papier

Cette étape est **reportée**. Le code est écrit et testé, il attend juste les
données.

Quand tu voudras t'y mettre :

1. Dans l'éditeur Apps Script, lance une fois la fonction `preparerOngletPapier`.
   Elle crée l'onglet `papier` avec ses colonnes.
2. Saisis une ligne par questionnaire papier. Les colonnes obligatoires sont
   `ref_papier` (un numéro à toi, unique), `role` (`membre` ou `manager`) et
   `q1` à `q16` (des valeurs de 0 à 3). Le profil et les relances sont
   facultatifs : laisse vide ce que tu n'as pas.
3. Lance la fonction `importerPapier`. Elle affiche un compte rendu : combien de
   lignes importées, combien déjà présentes, et la liste de celles qu'elle a
   refusées avec la raison.
4. Corrige les lignes refusées et relance. **Relancer ne crée jamais de
   doublon** : les lignes déjà importées sont reconnues par leur `ref_papier`.

Dès qu'une ligne papier est importée, le compteur de l'accueil arrête d'utiliser
`PAPIER_BASE` et compte les lignes réelles. Il n'y a donc jamais de double
comptage, mais **ne t'arrête pas au milieu** : pendant un import partiel, le
compteur affichera le nombre de lignes déjà saisies, pas 255.

---

## Mettre à jour le site plus tard

```sh
# 1. modifier ce qu'il faut
# 2. si contenu.json a changé :
node scripts/generer-contenu-gs.mjs
# 3. vérifier
npm test
# 4. incrémenter V dans docs/assets/js/config.js
# 5. publier
git add -A && git commit -m "ce que j'ai changé" && git push
# 6. si worker/ a changé :
cd worker && npx clasp push --force
npx clasp list-deployments                 # relever l'id du déploiement v1
npx clasp update-deployment <id> --description "v1"   # garde la même URL
```

---

## En cas de souci

| Symptôme | Cause probable |
| --- | --- |
| Le compteur affiche 255 alors qu'il y a des réponses | Le cache du compteur dure 10 minutes. Attends, ou relance `compteurPublic` depuis l'éditeur. |
| Le tableau de bord refuse la clé | `ADMIN_KEY` n'est pas définie, ou le déploiement n'a pas été mis à jour après un `npx clasp push`. |
| La clé est bien enregistrée mais toujours refusée | **Le nom de la propriété distingue les majuscules.** `ADMIN_Key` ou `Admin_key` ne sont pas `ADMIN_KEY` : `getProperty` renvoie `null` et tout est refusé, quelle que soit la valeur. |
| Le site reste en mode démo | `API_URL` est vide dans `config.js`, ou l'adresse porte `?demo=1`. |
| Rien ne s'enregistre | Le déploiement n'est pas en « Tout le monde », ou l'URL copiée n'est pas celle qui finit par `/exec`. |
| L'API répond `403 Une autorisation est nécessaire` | Le script n'a jamais été autorisé. Ouvre l'éditeur et lance `compteurPublic` une fois (voir « Autoriser le script »). |
| Une page s'affiche sans style | Le cache du navigateur. Incrémente `V` dans `config.js`, ou recharge avec Cmd+Maj+R. |
