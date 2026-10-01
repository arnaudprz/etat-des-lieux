# Passe 10 : état des lieux de la mise en ligne

Contrairement aux passes précédentes, ce document n'est pas une consigne à
exécuter : c'est le compte rendu de ce qui a été fait pendant la session de mise
en ligne, le 1er octobre 2026. Il part de la version purement locale et va
jusqu'au site public branché sur de vraies données.

---

## Où on en est

| Élément | État |
| --- | --- |
| Site public | <https://etat-des-lieux.greatly.club> |
| HTTPS | Actif et forcé, certificat Let's Encrypt jusqu'au 30/12/2026 |
| Repo | <https://github.com/arnaudprz/etat-des-lieux>, public |
| Backend Apps Script | Déployé, autorisé, vérifié de bout en bout |
| Google Sheet | Créé, script lié, `ADMIN_KEY` définie |
| Tableau de bord | <https://etat-des-lieux.greatly.club/admin/>, branché sur les vraies données |
| Saisie des 255 réponses papier | Toujours reportée |

Vérifications : 204 tests, 17 points du cahier des charges, parcours rejoué dans
Chromium et WebKit à 1280 et 390.

---

## 1. La mise en ligne

### Le site

Repo créé et publié sur GitHub Pages depuis `main` / `docs`. Avant de pousser,
les 138 fichiers suivis ont été audités : aucune clé, aucun identifiant, aucune
donnée. Les seules correspondances étaient des placeholders de documentation, un
champ `type="password"` et des e-mails de test.

### Le backend

Le classeur et le script lié ont été créés d'une seule commande,
`clasp create-script --type sheets`, ce qui fusionne deux étapes de `DEPLOY.md`.

Trois choses à retenir :

- **`clasp` est en dépendance locale**, pas globale : l'installation globale
  demande les droits administrateur. D'où `npx clasp` partout. C'est la v3, dont
  les commandes diffèrent de la v2 que `DEPLOY.md` décrivait.
- **`create-script` écrase `appsscript.json`** par celui de Google, qui n'a ni
  `Europe/Paris` ni le bloc `webapp` en accès anonyme. Sans restauration, le
  site n'aurait jamais rien pu enregistrer.
- **L'autorisation ne peut pas être automatisée.** L'application s'exécute « en
  tant que moi » : tant que le propriétaire n'a pas accordé les autorisations
  dans le navigateur, elle répond `403`, même correctement déployée.

### Le sous-domaine

`etat-des-lieux.greatly.club`, enregistrement CNAME vers `arnaudprz.github.io`.
`greatly.club` et `www` continuent de servir le site principal depuis
`web-site-preprod` : rien n'a bougé de ce côté.

Le certificat HTTPS n'arrivait pas alors que le diagnostic GitHub était au vert
(`is_https_eligible: true`). Retirer puis redéclarer le domaine a débloqué le
provisionnement. GitHub a fait deux commits automatiques au passage,
`Delete CNAME` et `Create CNAME`.

### Un piège documenté

`ADMIN_KEY` était enregistrée sous le nom `ADMIN_Key`. Les noms de propriétés
distinguent les majuscules : `getProperty` renvoyait `null` et toutes les clés
étaient refusées, avec un message indiscernable d'une mauvaise valeur. Ajouté au
tableau de dépannage de `DEPLOY.md`.

---

## 2. Ce qui a été corrigé dans le produit

### Le bouton qui mentait

« Copier mon lien » affichait « Lien copié » **même quand la copie échouait**.
On croyait tenir son lien, on collait le contenu précédent du presse-papiers, on
retombait sur l'accueil et on refaisait tout le questionnaire. C'est l'origine
des doublons constatés en base : la personne répondait réellement une seconde
fois.

Le bouton dit maintenant ce qui s'est passé et déplie le champ à copier en cas
de refus.

### Revenir sur le site

Le résultat ne survivait pas à la fermeture de l'onglet. Le lien est désormais
gardé sur l'appareil, et l'accueil propose « Voir mon état des lieux ». Ce lien
ne contient que des chiffres de réponses, aucune donnée personnelle, et ne
quitte jamais le navigateur.

S'y ajoutent **« Modifier mes réponses »** et **« Modifier mon profil »**. Tous
deux lisent les réponses dans le lien plutôt que dans la mémoire de l'onglet :
ils fonctionnent donc sur un lien rouvert des jours plus tard. Le profil, lui,
n'est pas dans le lien : il est gardé à part sur l'appareil, sans quoi revenir
sur la première partie demandait de tout ressaisir.

La hiérarchie a ensuite été revue : revoir son état des lieux est ce qu'on vient
chercher, donc cette action garde le bouton principal et les deux reprises
passent dessous, plus petites.

### Plus de doublon en base

Revalider un questionnaire inchangé écrivait une seconde ligne identique et
faussait le compteur. L'empreinte du dernier envoi est retenue, et seul ce qui
diffère repart.

### Le résultat s'affiche tout de suite

Il fallait attendre une dizaine de secondes entre « Voir mon résultat » et
l'affichage. Pour rien : le résultat est calculé dans le navigateur. Seul
l'enregistrement a besoin du serveur, et il n'a aucune raison de retarder
l'écran. L'envoi part maintenant avec `keepalive`, sans `await`.

Mesure sur le vrai backend : **0,06 s au lieu de plusieurs secondes**, et le
compteur passe bien de 271 à 272, donc la réponse arrive toujours.

### Un contenu périmé ne casse plus la page

Après une mise en ligne, le navigateur peut avoir un `contenu.json` plus ancien
que le JavaScript. Une clé manquante levait une erreur qui interrompait le
démarrage : le formulaire du profil n'était jamais construit, et la page
affichait un titre, une intro, puis une carte blanche vide.

C'était une fragilité de fond, pas un cas particulier : n'importe quel texte
manquant pouvait vider une page. Les fonctions vérifient maintenant ce qu'elles
reçoivent, et le formulaire est construit avant le décor.

### Le compteur

Le `255` était écrit en dur dans `index.html` : le navigateur le peignait avant
l'appel à l'API, puis le chiffre sautait à sa vraie valeur à chaque
rechargement. Le HTML ne porte plus aucun nombre, et le compteur reste
transparent jusqu'à la réponse.

Il est aussi centré sous le bouton sur mobile, où celui-ci prend toute la
largeur.

### Textes et mise en page

- Le partage disait « Envie de le faire découvrir ? » et « Partager l'accueil »,
  sans dire de quoi il s'agissait. Les textes reprennent les mots de l'usage
  réel, et la garantie reste explicite : le lien ouvre le questionnaire, jamais
  le résultat.
- Le haut de la page profil flottait sur un fond vide avec des styles écrits
  dans le HTML. Il reprend le compteur et les trois repères de l'accueil, au
  moment précis où l'on demande des informations sur soi.
- Les deux CTA du bas se touchaient : `.appel` était en colonne sans `gap`.
- Le bloc Greatly apparaît sur l'accueil pour qui a déjà répondu, en bande
  pleine largeur sans coins arrondis, entre le texte et l'illustration. Sur
  mobile l'ordre est donc texte, Greatly, arbres.

### La politique de confidentialité

L'encadré `[À VALIDER]` était un mémo interne qui n'avait rien à faire sur une
page publique. Mais il signalait deux manques réels, et la page collecte des
coordonnées :

- **« Qui est responsable »** : Greatly, Greatly House à Verlinghem. Base légale
  retenue, intérêt légitime pour les réponses anonymes et consentement pour les
  coordonnées, retirable à tout moment.
- **Le droit de réclamation auprès de la CNIL.**

La page dit aussi ce que le navigateur garde sur l'appareil, puisque le lien et
le profil y sont désormais conservés.

---

## 3. Ce que la vérification a appris

Quatre défauts ont été trouvés par Arnaud avant moi, tous dans le même angle
mort : mes vérifications partaient d'un navigateur neuf, avec un contenu à jour
et aucune donnée mémorisée. Un état que les vrais visiteurs n'ont pas.

Les contrôles ajoutés depuis :

- aucun bouton visible sans libellé ;
- aucun espacement inférieur à 8px entre deux boutons voisins ;
- la page se construit même avec un `contenu.json` amputé de chaque clé ;
- le résultat s'affiche en moins de 2 secondes avec un backend simulé à 4 ;
- aucun nombre codé en dur dans le compteur du HTML servi.

Deux défauts étaient dans la vérification elle-même, pas dans le site :

- **`networkidle` ne se produit jamais en ligne**, l'appel à l'API gardant le
  réseau occupé. Les contrôles expiraient ou mesuraient des pages à moitié
  peintes, et remontaient des défauts imaginaires, différents à chaque passage.
- **Les contrôles d'images concluaient trop tôt** : en ligne elles arrivent plus
  tard qu'en local. Le reproche portait tantôt sur le médaillon, tantôt sur une
  pousse.

Et une protection indispensable : `scripts/verif/parcours.mjs` remplit le
questionnaire jusqu'au bout, sur quatre cibles. Avec `API_URL` renseignée,
chaque vérification écrivait quatre vraies lignes dans le classeur. Constaté en
direct, le compteur passant de 257 à 261. Les vérifications répondent désormais
à la place du backend.

---

## 4. Ce qui reste

- **Supprimer les réponses de test.** Une dizaine de questionnaires et autant
  d'événements, tous artificiels, sont dans le classeur. Clic droit sur les
  onglets `reponses` et `evenements` ▸ Supprimer. Le script les recrée au
  premier vrai envoi et le compteur repart de 255.
- **Compléter la mention légale** : l'adresse postale et la forme juridique
  exactes de Greatly, et la question du registre des traitements.
- **Les 255 réponses papier**, toujours reportées. Le code est écrit et testé.
- **Un envoi qui échoue est perdu.** L'API a renvoyé une page d'erreur Google à
  deux reprises, lors de rafales de requêtes. Le visiteur voit son résultat, qui
  est calculé dans le lien, sans que rien ne soit enregistré. Une seconde
  tentative fermerait ce trou.
- **`/admin/` est publiquement accessible**, protégé par la seule `ADMIN_KEY`.
  Le contrôle est sûr, à temps constant et fermé par défaut, mais c'est une
  porte sur de vraies réponses.
- **Toute modification de `worker/` demande un redéploiement** : le déploiement
  est figé sur la version `v1`, un `npx clasp push` seul ne change rien en
  ligne.
