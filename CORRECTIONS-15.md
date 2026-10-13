# Corrections 15 : les cartes du résultat, « Vos chiffres par mail » et le suivi dans le tableau de bord

13 octobre 2026, nuit. **En local, rien n'est en ligne.**

## Page de résultat (pour tout le monde)

- À droite, la carte « L'étude en cours » de l'accueil : le total qui monte, un point par personne. Elle remplace « 294
  personnes ont répondu ».
- À gauche, la carte « Vos réponses » : 16 points, un par réponse, du plus clair (« Pas encore ») au plus foncé
  (« Pleinement »), qui se posent un à un. Les deux cartes sont alignées sur ordinateur.
- Entre « Comment lire ces chiffres » et « Vos envies », une carte sur toute la largeur, « Vos chiffres par mail » :
  prénom, nom, e-mail, une case d'accord, et le bouton « Recevoir mes chiffres ».

## L'envoi automatique

- **Migration 32** (`~/espace-intervenant/supabase/migrations/20261013230000_intervenants_32_edl_resultat_mail.sql`, non
  appliquée) ajoute :
  - la table `etat_des_lieux.demandes_resultat`, à part des contacts de l'étude ;
  - les fonctions d'enregistrement, d'envoi et d'ouverture, réservées à la clé de service ;
  - la liste pour l'équipe.
  
  Testée sur le banc :
  - sont refusés : un e-mail faux, un lien d'un autre site, un rôle inconnu, et quelqu'un hors de l'équipe ;
  - le public n'a aucun accès direct.
- **Fonction `resultat-mail`** (`~/espace-intervenant/supabase/functions/resultat-mail/`) :
  1. elle enregistre la demande ;
  2. elle refait les chiffres depuis le lien du résultat ;
  3. elle fabrique le PDF (`resultat.js`, pdf-lib, polices de Greatly) ;
  4. elle l'envoie par Brevo, avec la même clé et la même adresse d'envoi que les autres mails, puis note l'envoi.

  Le PDF reprend les règles de la page :
  - aucun jugement à gauche ;
  - à droite, des chiffres seulement à partir de 3 personnes de chaque côté ;
  - un solo ne voit que des chiffres d'indépendants.
- **Fonction `resultat-suivi`** : réservée à l'équipe. Elle demande à Brevo si chaque mail a été ouvert, et le note.

## Tableau de bord

Dans « État des lieux », un nouveau sous-menu « Envois de résultats ». Il montre :
- une ligne par demande : date, prénom, nom, e-mail, profil, envoi, ouverture, et le lien vers son résultat ;
- la synthèse « N mails ouverts sur M envoyés ».

Les ouvertures se mettent à jour à chaque visite. Certaines messageries bloquent le suivi d'ouverture : « Pas encore » ne
veut pas dire « jamais ».

## À décider avant la mise en ligne

- **La confidentialité.** Jusqu'ici, aucun nom ni e-mail n'était relié aux réponses (SPEC, règle 6). Avec cette demande, le
  nom et l'e-mail sont enregistrés avec le lien du résultat, qui contient les réponses : il faut le dire sur la page de
  confidentialité.
- **L'ordre de mise en ligne :**
  1. appliquer la migration 32 ;
  2. déployer `resultat-mail` (sans session) et `resultat-suivi` (avec session) ;
  3. pousser le site (`V = 42`) ;
  4. pousser le tableau de bord.
