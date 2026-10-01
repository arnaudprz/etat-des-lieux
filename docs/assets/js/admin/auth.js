/**
 * Accès au tableau de bord : connexion Google.
 *
 * Google remet au navigateur un jeton d'identité, valable une heure. On le
 * garde en sessionStorage, qui disparaît à la fermeture de l'onglet, et on le
 * joint à chaque lecture. C'est le backend qui le fait vérifier par Google et
 * décide si l'adresse a le droit d'entrer : ce fichier ne décide de rien.
 *
 * En mode démo, aucune connexion n'est demandée et aucune requête ne sort.
 */

import { CLE_SESSION_ADMIN, modeDemo } from '../config.js';
import { donneesAdmin, urlContactsCsv } from '../api.js';
import { donneesFictives, contactsFictifs } from './demo.js';

/** Le jeton gardé pour cet onglet, s'il n'a pas encore expiré. */
export function jetonGarde() {
  let jeton = '';
  try {
    jeton = sessionStorage.getItem(CLE_SESSION_ADMIN) || '';
  } catch (e) {
    return '';
  }
  return jetonEncoreValide(jeton) ? jeton : '';
}

/** Garde le jeton pour cet onglet. */
export function garderJeton(jeton) {
  try {
    sessionStorage.setItem(CLE_SESSION_ADMIN, jeton);
  } catch (e) { /* stockage refusé : la connexion sera redemandée */ }
}

/** Oublie le jeton. */
export function oublierJeton() {
  try {
    sessionStorage.removeItem(CLE_SESSION_ADMIN);
  } catch (e) { /* rien à faire */ }
}

/**
 * Lit l'expiration inscrite dans le jeton, sans le vérifier : il s'agit
 * seulement d'éviter un appel voué à l'échec. La vérification est au backend.
 */
export function jetonEncoreValide(jeton, maintenant = Date.now()) {
  const charge = String(jeton || '').split('.')[1];
  if (!charge) return false;
  try {
    const base64 = charge.replace(/-/g, '+').replace(/_/g, '/');
    const { exp } = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')));
    // Une minute de marge, pour ne pas envoyer un jeton qui expire en route.
    return Number(exp) * 1000 > maintenant + 60000;
  } catch (e) {
    return false;
  }
}

/** L'adresse inscrite dans le jeton, pour l'afficher. Même réserve que ci-dessus. */
export function emailDuJeton(jeton) {
  try {
    const base64 = String(jeton).split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='))).email || '';
  } catch (e) {
    return '';
  }
}

/**
 * Charge les données du tableau de bord.
 * `code` vaut 'connexion' (se reconnecter), 'refuse' (compte non autorisé)
 * ou 'reseau' (API injoignable).
 * @returns {Promise<{ok: boolean, donnees?: object, code?: string, email?: string}>}
 */
export async function chargerDonnees(contenu, jeton) {
  if (modeDemo()) return { ok: true, donnees: donneesFictives(contenu) };

  const reponse = await donneesAdmin(jeton);
  if (reponse && reponse.ok === true) return { ok: true, donnees: reponse };
  if (reponse && (reponse.code === 'connexion' || reponse.code === 'refuse')) {
    return { ok: false, code: reponse.code, email: reponse.email || '' };
  }
  return { ok: false, code: 'reseau' };
}

/**
 * Charge les contacts, dans une requête séparée des réponses.
 * C'est ce qui garantit qu'aucune réponse d'API ne met côte à côte un
 * questionnaire et une identité.
 */
export async function chargerContacts(jeton) {
  if (modeDemo()) return contactsFictifs();

  const url = urlContactsCsv(jeton);
  if (!url) return [];
  try {
    const r = await fetch(url);
    if (!r.ok) return [];
    const texte = await r.text();
    // Un refus arrive en JSON, pas en CSV.
    if (texte.trim().startsWith('{')) return [];
    return lireCsv(texte);
  } catch (e) {
    return [];
  }
}

/**
 * L'adresse de téléchargement du CSV, pour le bouton d'export.
 *
 * Le fichier est fabriqué dans le navigateur à partir des contacts déjà
 * chargés : le jeton n'a pas à figurer dans un lien, et le bouton marche de
 * la même façon en démo et en ligne.
 */
export function lienExport(contacts = []) {
  const fichier = new Blob([ecrireCsv(contacts)], { type: 'text/csv;charset=utf-8' });
  return URL.createObjectURL(fichier);
}

/** Les colonnes du CSV, dans le même ordre que la feuille du Sheet. */
const COLONNES_CSV = ['date', 'prenom', 'nom', 'entreprise', 'email', 'consentement'];

/** Écrit un CSV, en échappant guillemets et virgules. */
export function ecrireCsv(contacts) {
  const champ = (v) => {
    const t = v == null ? '' : String(v);
    return /[",\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  return [COLONNES_CSV.join(',')]
    .concat(contacts.map((c) => COLONNES_CSV.map((k) => champ(c[k])).join(',')))
    .join('\r\n');
}

/** Lit un CSV simple, en respectant les guillemets. */
export function lireCsv(texte) {
  const lignes = texte.trim().split(/\r?\n/);
  if (lignes.length < 2) return [];
  const entetes = decouper(lignes[0]);
  return lignes.slice(1).map((l) => {
    const champs = decouper(l);
    const o = {};
    entetes.forEach((cle, i) => { o[cle] = champs[i] || ''; });
    return o;
  });
}

function decouper(ligne) {
  const champs = [];
  let courant = '';
  let entreGuillemets = false;

  for (let i = 0; i < ligne.length; i += 1) {
    const c = ligne[i];
    if (entreGuillemets) {
      if (c === '"' && ligne[i + 1] === '"') { courant += '"'; i += 1; }
      else if (c === '"') entreGuillemets = false;
      else courant += c;
    } else if (c === '"') entreGuillemets = true;
    else if (c === ',') { champs.push(courant); courant = ''; }
    else courant += c;
  }
  champs.push(courant);
  return champs;
}
