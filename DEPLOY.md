# Mise en ligne

Le projet tourne aujourd'hui **en local seulement**. Ce document décrit la mise
en ligne quand tu voudras la faire. Rien ici n'est urgent : le site fonctionne
déjà entièrement en mode démo sur ta machine.

Tout est expliqué pas à pas. Tu n'as pas besoin de savoir développer.

---

## Ce que tu dois faire toi-même

Cinq choses, dans cet ordre. Compte une petite heure la première fois.

1. Créer le Google Sheet.
2. Installer `clasp` et faire `clasp login`.
3. Déployer le script et définir `ADMIN_KEY` et `PAPIER_BASE`.
4. Coller l'URL de l'API dans `config.js`.
5. Créer le repo GitHub et activer Pages.

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

```sh
npm install -g @google/clasp
clasp login
```

Une page s'ouvre dans le navigateur : connecte-toi avec le compte Google de
Greatly, celui qui possède le Sheet.

Si `clasp login` refuse de démarrer, active d'abord l'API Apps Script sur
<https://script.google.com/home/usersettings>.

---

## 3. Déployer le script

### Créer le projet lié au Sheet

Dans le Sheet, menu **Extensions ▸ Apps Script**. Un projet vide s'ouvre.
Dans **Paramètres du projet**, copie l'**ID du script**.

De retour dans un terminal :

```sh
cd worker
cp .clasp.json.example .clasp.json
```

Ouvre `.clasp.json` et remplace `REMPLACER_PAR_L_ID_DU_PROJET_APPS_SCRIPT` par
l'ID que tu viens de copier. Puis :

```sh
clasp push
```

Recharge la page Apps Script : les fichiers `.gs` sont là.

> `.clasp.json` est ignoré par git : il ne partira jamais dans le repo.

### Définir les deux réglages

Dans l'éditeur Apps Script : **Paramètres du projet ▸ Propriétés du script ▸
Ajouter une propriété**.

| Propriété | Valeur | À quoi ça sert |
| --- | --- | --- |
| `ADMIN_KEY` | une longue phrase que tu inventes | Ouvre le tableau de bord. |
| `PAPIER_BASE` | `255` | Le compteur de l'accueil tant qu'aucune réponse papier n'est importée. |

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

> À chaque `clasp push`, il faut **redéployer** (Déployer ▸ Gérer les
> déploiements ▸ crayon ▸ Nouvelle version) pour que la modification soit en
> ligne. Garder le même déploiement garde la même URL.

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
> `https://arnaudprz.github.io/etat-des-lieux/`. Si tu publies ailleurs,
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
<https://arnaudprz.github.io/etat-des-lieux/>.

Le tableau de bord est sur
<https://arnaudprz.github.io/etat-des-lieux/admin/>. Il demande `ADMIN_KEY`, et
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
cd worker && clasp push
#    puis Déployer ▸ Gérer les déploiements ▸ Nouvelle version
```

---

## En cas de souci

| Symptôme | Cause probable |
| --- | --- |
| Le compteur affiche 255 alors qu'il y a des réponses | Le cache du compteur dure 10 minutes. Attends, ou relance `compteurPublic` depuis l'éditeur. |
| Le tableau de bord refuse la clé | `ADMIN_KEY` n'est pas définie, ou le déploiement n'a pas été mis à jour après un `clasp push`. |
| Le site reste en mode démo | `API_URL` est vide dans `config.js`, ou l'adresse porte `?demo=1`. |
| Rien ne s'enregistre | Le déploiement n'est pas en « Tout le monde », ou l'URL copiée n'est pas celle qui finit par `/exec`. |
| Une page s'affiche sans style | Le cache du navigateur. Incrémente `V` dans `config.js`, ou recharge avec Cmd+Maj+R. |
