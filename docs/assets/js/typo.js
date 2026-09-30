/**
 * Typographie française des textes affichés.
 * Module pur : aucune dépendance au DOM.
 *
 * contenu.json garde des textes simples (espaces normales, apostrophes droites).
 * La mise en forme typographique se fait ici, à l'affichage, pour ne jamais
 * réécrire la source. Voir SPEC.md, principe 8.
 */

/** Espace insécable. */
export const INSECABLE = ' ';

const ESPACES = '[ \\u00A0\\u202F]+';

/**
 * Rend un texte typographiquement correct :
 * espace insécable avant ? ! : ; et » , et après «.
 *
 * On remplace seulement des espaces déjà présentes, jamais on n'en insère :
 * cela évite de casser « https:// » ou une heure comme « 14:30 ».
 */
export function typo(texte) {
  if (typeof texte !== 'string') return texte;
  return texte
    .replace(new RegExp(ESPACES + '([?!:;\\u00BB])', 'g'), INSECABLE + '$1')
    .replace(new RegExp('(\\u00AB)' + ESPACES, 'g'), '$1' + INSECABLE);
}

/** Vrai si le texte contient un tiret cadratin ou demi-cadratin, interdits à l'affichage. */
export function contientTiretLong(texte) {
  return typeof texte === 'string' && /[—–]/.test(texte);
}

/** Première lettre en minuscule, pour enchaîner un nom de dimension dans une phrase. */
export function minusculeInitiale(texte) {
  if (typeof texte !== 'string' || texte === '') return texte;
  return texte.charAt(0).toLowerCase() + texte.slice(1);
}

/** Première lettre en majuscule, quand le nom ouvre une phrase. */
export function majusculeInitiale(texte) {
  if (typeof texte !== 'string' || texte === '') return texte;
  return texte.charAt(0).toUpperCase() + texte.slice(1);
}
