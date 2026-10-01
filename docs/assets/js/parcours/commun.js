/**
 * Petites aides partagées par les pages du parcours public.
 * Pas de framework : des fonctions courtes autour du DOM.
 */

import { typo } from '../typo.js';
import { modeDemo } from '../config.js';
import { envoyerEvenement } from '../api.js';
import { idVisite } from '../session.js';

/** Raccourcis de sélection. */
export const $ = (sel, racine = document) => racine.querySelector(sel);
export const $$ = (sel, racine = document) => Array.from(racine.querySelectorAll(sel));

/** Crée un élément, avec classes, attributs et contenu texte typographié. */
export function el(balise, options = {}, enfants = []) {
  const n = document.createElement(balise);
  if (options.classe) n.className = options.classe;
  if (options.texte != null) n.textContent = typo(String(options.texte));
  if (options.html != null) n.innerHTML = options.html;
  Object.entries(options.attrs || {}).forEach(([k, v]) => {
    if (v === false || v == null) return;
    n.setAttribute(k, v === true ? '' : String(v));
  });
  Object.entries(options.style || {}).forEach(([k, v]) => { n.style[k] = v; });
  (Array.isArray(enfants) ? enfants : [enfants]).forEach((c) => {
    if (c) n.appendChild(typeof c === 'string' ? document.createTextNode(typo(c)) : c);
  });
  return n;
}

/** Écrit un texte en appliquant la typographie française. */
export function texte(noeud, valeur) {
  if (noeud) noeud.textContent = typo(String(valeur == null ? '' : valeur));
}

/** Vide un conteneur. */
export function vider(noeud) {
  while (noeud && noeud.firstChild) noeud.removeChild(noeud.firstChild);
}

/**
 * Applique la typographie française à tout le texte déjà écrit dans le HTML.
 * Permet de garder les pages lisibles dans le source, sans espaces insécables
 * tapées à la main.
 */
export function typographierPage(racine = document.body) {
  const marche = document.createTreeWalker(racine, NodeFilter.SHOW_TEXT);
  const aTraiter = [];
  while (marche.nextNode()) aTraiter.push(marche.currentNode);
  aTraiter.forEach((n) => {
    const t = typo(n.nodeValue);
    if (t !== n.nodeValue) n.nodeValue = t;
  });
}

/**
 * Signale que rien n'est enregistré.
 *
 * En mode démo explicite (?demo=1), un bandeau en haut : c'est une
 * démonstration, autant que ce soit clair. En local sans API, une mention
 * discrète en bas de page : le site est en cours de fabrication, le bandeau
 * volerait la place du contenu à chaque écran.
 */
export function signalerModeDemo() {
  if (!modeDemo()) return;

  let demoExplicite = false;
  try {
    demoExplicite = new URLSearchParams(location.search).get('demo') === '1';
  } catch (e) { /* environnement sans location */ }

  const texteDemo = 'Mode démo : aucune réponse n’est enregistrée.';

  if (demoExplicite) {
    const bandeau = el('p', { classe: 'demo', texte: texteDemo, attrs: { role: 'status' } });
    document.body.insertBefore(bandeau, document.body.firstChild);
    // Le bandeau Greatly est fixé juste dessous : il doit savoir de combien
    // descendre, et la page de combien se décaler.
    const hauteur = Math.round(bandeau.getBoundingClientRect().height);
    document.documentElement.style.setProperty('--hauteur-demo', `${hauteur}px`);
    return;
  }

  document.body.appendChild(
    el('p', { classe: 'demo demo--pied', texte: texteDemo, attrs: { role: 'status' } })
  );
}

/** Enregistre un événement d'entonnoir, sans jamais bloquer la page. */
export function evenement(type) {
  try {
    envoyerEvenement(type, idVisite());
  } catch (e) { /* l'entonnoir ne doit jamais gêner le parcours */ }
}

/** Annonce un message aux lecteurs d'écran. */
export function annoncer(message) {
  let zone = $('#annonces');
  if (!zone) {
    zone = el('div', {
      attrs: { id: 'annonces', role: 'status', 'aria-live': 'polite' },
      classe: 'lecteur-ecran',
    });
    document.body.appendChild(zone);
  }
  zone.textContent = '';
  window.setTimeout(() => { zone.textContent = typo(message); }, 50);
}

/** Affiche un message d'erreur doux sous un formulaire. */
export function messageErreur(noeud, message) {
  if (!noeud) return;
  if (!message) {
    noeud.hidden = true;
    noeud.textContent = '';
    return;
  }
  texte(noeud, message);
  noeud.hidden = false;
}

/** Recherche insensible à la casse et aux accents. */
export function normaliser(s) {
  return String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}
