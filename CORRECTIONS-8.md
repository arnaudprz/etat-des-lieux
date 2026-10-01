# Corrections, passe 8 : l'écran des affirmations, propre et sans aller-retour

Colle ce texte dans Claude Code, dans le repo `etat-des-lieux`, **après** la passe 7.

---

Cette passe ne touche **que** l'écran `questions.html` (et les icônes de la barre d'avancement). Tout est décrit au pixel près, avec la cause quand je l'ai trouvée. Ne réinterprète rien : si un point te semble ambigu, applique exactement ce qui est écrit ici et signale le doute dans ton rapport final, sans me poser de question avant.

## 0. Méthode de travail (à suivre à la lettre)

1. **Avant de coder**, fais des captures « avant » de `questions.html` à 1280 et 390, dans Chromium et WebKit, dans `captures/passe8/avant/`.
2. **Crée `scripts/verifier-passe8.mjs`** (Playwright) qui teste chaque critère marqué ✅ ci-dessous, dans Chromium et WebKit, à 1280, 390 et 360 de large. Il doit afficher une ligne par critère avec OK ou KO.
3. Applique les points **dans l'ordre**, un commit par point.
4. Après chaque point, relance le script. Tu ne passes au point suivant que si tout est OK.
5. **Rapport final**, sous forme de tableau : point, OK/KO, chemin des captures « après » (`captures/passe8/apres/`). Rien d'autre.

Fichiers autorisés : `questions.html`, la CSS et le JS du questionnaire, `maquette/illustrations/pousses.py`, les `icone-*.svg` régénérés, `DECISIONS.md`, le README. **Ne touche à aucune autre page.**

Règles habituelles : pas de tiret cadratin, espace insécable avant `? ! : ;`, aucun chiffre ni pourcentage côté répondant, textes lus depuis `contenu.json`.

## 1. L'icône coupée en haut à gauche de la barre d'avancement

**Ce qu'on voit.** Sous le logo Greatly, au début du questionnaire, la graine « À semer » ressemble à un demi-rond de terre coupé.

**Les causes (deux) :**

- Dans `pousses.py`, fonction `icone()`, pour `k = 0` : `g = 52` et `sc = 1.5`. La graine tombe vers `y = 91` dans une `viewBox` de 100, alors que le `clipPath` est un cercle de rayon 48. Elle est donc coupée par le bas.
- Le haut du médaillon est rempli en `#F7F4EF`, la même couleur que le fond de la barre. On ne voit donc que la moitié basse (la terre), d'où l'effet de demi-rond.

**À faire :**

- Dans `pousses.py`, `icone()`, pour `k = 0` seulement : `g = 48` et `sc = 1.2`. Régénère les 4 `icone-*.svg` avec le script, pas à la main, et copie-les dans `assets/img/`.
- En CSS, sur `.progression__pousse` et `.progression__but`, ajoute : `border-radius: 50%; box-shadow: 0 0 0 1px var(--bordure);`. Le médaillon se lit comme un rond entier, même quand le haut est vide.
- Seuils de la pousse de gauche : graine de 0 à 3 réponses, pousse de 4 à 8, jeune plant de 9 à 15, arbre **à 16 seulement**. Aujourd'hui, l'arbre apparaît dès 14, et on a alors deux arbres identiques à gauche et à droite. À 16, l'arbre de droite passe à `opacity: 1`.

✅ Dans `icone-semer.svg`, la boîte englobante de l'ellipse de la graine tient entièrement dans le cercle de rayon 44 centré en (50, 50).
✅ Les deux icônes de la barre ont un `box-shadow` non vide.
✅ Avec 14 réponses, la pousse de gauche est le jeune plant, pas l'arbre.

## 2. Les titres de groupe « flottent » (Ce qu'on vise ensemble, Ce qu'on sait les uns des autres…)

**Ce qu'on voit.** Le titre est collé à gauche, la ligne « Pourquoi on s'y intéresse · » est décalée vers la droite et seule sur sa ligne, avec un point qui pend. Le texte vient en dessous, lui aussi décalé, puis un grand vide avant la carte. On ne sait pas à quoi le bloc se rattache.

**La cause.** Collision de classe CSS. La classe `.pourquoi` est définie **deux fois** dans la feuille de style :

- une fois pour l'accueil : `.pourquoi { display: grid; gap: 20px; padding: 0 20px 40px; }` ;
- une fois pour le questionnaire : `.pourquoi { margin: -6px 0 4px; font-size: 14px; … }`.

Les deux s'appliquent au paragraphe du questionnaire. Il devient une grille avec 20px de marge à gauche et à droite et 40px en bas. Le préfixe et le texte deviennent deux lignes de grille séparées de 20px.

**À faire :**

**a. Renommer.** Côté questionnaire, n'utilise plus `.pourquoi`. Utilise les classes du point b. Vérifie aussi qu'aucune autre classe de l'accueil ne s'applique au questionnaire (cherche les sélecteurs définis plusieurs fois dans la CSS et liste-les dans le rapport).

**b. Structure HTML.** Chaque groupe devient une section qui contient son en-tête et ses cartes. Aujourd'hui, tout est à plat dans le `<form>` :

```html
<section class="groupe" aria-labelledby="groupe-1-titre">
  <header class="groupe__entete">
    <h2 class="groupe__titre" id="groupe-1-titre">Ce qu'on vise ensemble</h2>
    <p class="groupe__pourquoi"><span class="groupe__prefixe">Pourquoi on s'y intéresse ·</span> On se demande si les équipes…</p>
  </header>
  <div class="groupe__affirmations">
    <!-- les cartes .affirmation de ce groupe -->
  </div>
</section>
```

Le bandeau « mi-parcours » se place **entre** deux `<section>`, jamais dedans.

**c. CSS, exactement :**

```css
.questionnaire { display: flex; flex-direction: column; gap: 0; }

.groupe { display: flex; flex-direction: column; gap: 16px;
  margin-top: 32px; padding-top: 32px; border-top: 1px solid var(--bordure); }
.groupe:first-of-type { margin-top: 8px; padding-top: 0; border-top: 0; }

.groupe__entete { display: flex; flex-direction: column; gap: 6px; padding: 0; max-width: 62ch; }
.groupe__titre { margin: 0; font-family: "Playfair Display", Georgia, serif; font-weight: 400;
  font-size: 26px; line-height: 1.2; color: var(--foret); }
.groupe__pourquoi { margin: 0; font-size: 15px; line-height: 1.55; color: var(--taupe); }
.groupe__prefixe { font-weight: 600; color: var(--sauge-fonce); white-space: nowrap; }

.groupe__affirmations { display: flex; flex-direction: column; gap: 12px; }

.mi-parcours { margin: 32px 0 0; }

@media (max-width: 600px) {
  .groupe { margin-top: 24px; padding-top: 24px; }
  .groupe__titre { font-size: 22px; }
  .groupe__pourquoi { font-size: 14px; }
}
```

Le préfixe et le texte sont sur **la même ligne** : « **Pourquoi on s'y intéresse ·** On se demande si… ». Le point n'est plus seul en bout de ligne.

✅ `document.querySelectorAll('.pourquoi').length === 0` sur `questions.html`.
✅ Le bord gauche du `h2`, du paragraphe et des cartes est le même, à 1px près.
✅ L'écart entre le bas du titre et le haut du paragraphe est de 6px, à 1px près.
✅ L'écart entre le bas du paragraphe et le haut de la première carte est de 16px, à 1px près.
✅ À 1280, le haut du préfixe et le haut de la première ligne du texte sont alignés (même ligne).
✅ Les 16 cartes sont chacune à l'intérieur d'une `section.groupe`, et il y a 8 sections.

## 3. La coche des réponses choisies

**Ce qu'on voit.** La coche est posée en haut à gauche du bouton, en position absolue. Sur ordinateur, elle a l'air égarée. Sur mobile, elle chevauche le texte (« ✓En bonne partie »).

**À faire :**

- Supprime la position absolue de `.echelle__coche`.
- À partir de 601px, la coche est **dans le flux**, juste avant le libellé : `display: inline-block; margin-right: 6px;`. Elle n'est visible que sur la réponse choisie et ne prend pas de place sinon (`display: none` quand `aria-pressed="false"`).
- À 600px et moins, pas de coche. La réponse choisie se distingue par son fond plein, son texte blanc et `font-weight: 600`.
- Garde le contour de focus clavier de la passe 4.
- Mets à jour `DECISIONS.md` : la coche n'apparaît que sur ordinateur, le mobile s'appuie sur le fond plein et le gras.

✅ À toutes les largeurs, la boîte de la coche ne chevauche jamais celle du libellé.
✅ À 390, `.echelle__coche` a `display: none`.

## 4. Les boutons de réponse sur mobile

**Ce qu'on voit.** À 390, « Pleinement » touche presque les bords du bouton, et « En bonne partie » est tassé.

**À faire, à 600px et moins :**

- Padding de la carte `.affirmation` : `18px 16px` (au lieu de `22px 20px`).
- `.echelle` : `gap: 6px`.
- `.echelle__choix` : `padding: 6px 4px; font-size: 13px;`. Sous 380px, `font-size: 12.5px`.
- On garde **4 colonnes sur une ligne** : l'échelle doit se lire d'un coup d'œil de gauche à droite.
- « Pas encore » et « En bonne partie » peuvent passer sur 2 lignes, jamais 3.

✅ À 390 et 360, pour chaque bouton : `scrollWidth <= clientWidth`, et au moins 4px entre le texte et le bord intérieur.
✅ À 390 et 360, aucun libellé ne dépasse 2 lignes.

## 5. Ce qu'on ne touche pas

- Les textes, l'ordre des affirmations, les relances « J'aimerais… », le défilement automatique, le lien v2, l'entonnoir.
- La carte « Ce qu'on cherche à comprendre », le bandeau mi-parcours (sauf sa marge) et le bloc final.
- Les autres pages.

## 6. Vérification finale

- `node scripts/verifier-passe8.mjs` : tout est OK dans Chromium et WebKit, à 1280, 390 et 360.
- Captures « après » à 1280 et 390, dans Chromium et WebKit :
  - le haut de la page, sans réponse (pour voir la graine) ;
  - le groupe « Ce qu'on sait les uns des autres » avec une réponse « En bonne partie » ;
  - le bandeau mi-parcours et le groupe qui suit ;
  - la fin de page avec 16 réponses (arbre à gauche, arbre de droite pleinement visible).
- Les tests des passes 4 à 7 passent toujours.
- `DECISIONS.md` à jour (seuils de la pousse, coche sur ordinateur seulement), changelog du README, `V` incrémenté.
- Rapport final en tableau, comme au point 0.
