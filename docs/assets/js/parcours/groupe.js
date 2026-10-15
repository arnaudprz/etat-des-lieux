/**
 * La page « Un an dans un groupe » pour les indépendants (Arnaud, 15 octobre 2026, maquette) : elle s'ouvre après
 * « Recevoir mon état des lieux et découvrir les solutions », et se termine par la prise de rendez-vous, dans une fenêtre,
 * en deux étapes comme la page « Prendre rendez-vous » du site (le créneau, puis les coordonnées).
 *
 * Première version : la demande part par mail à Arnaud, qui confirme. À brancher ensuite sur l'agenda Greatly.club, en
 * rendez-vous « solo, page groupe » avec sa couleur, et dans l'agenda du tableau de bord.
 */
import { resultatMemorise } from '../session.js?v=96';
import { decoder } from '../lien.js?v=96';
import { chargerContenu } from '../contenu.js?v=96';

const $ = (s, r = document) => r.querySelector(s);
const el = (balise, classe, texte) => { const n = document.createElement(balise); if (classe) n.className = classe; if (texte != null) n.textContent = texte; return n; };

// Le merci, avec le prénom laissé dans le formulaire « Par mail » (gardé dans l'onglet, pas dans l'adresse).
let prenom = ''; try { prenom = (sessionStorage.getItem('edl_prenom') || '').trim().slice(0, 60); } catch (e) { /* rien */ } // jamais dans l'adresse
if (new URLSearchParams(location.search).has('envoye')) {
  $('[data-merci]').hidden = false;
  $('[data-merci-texte]').textContent = (prenom ? 'Merci ' + prenom + '. ' : 'Merci. ') + 'Votre état des lieux arrive dans votre boîte mail.';
}

// ------------------------------------------------------------------ le rendez-vous
const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const HEURES = [9, 11, 14, 16];
// Toujours à la maison (Arnaud, 15 octobre 2026 : « venez visiter la maison, pas de téléphone ni visio »).
const LIEUX = { maison: 'à la Greatly House' };
const d = $('[data-rdv-fenetre]');
const etat = { lieu: 'maison', semaine: 0, creneau: null };

const lundi = (decalage) => { const j = new Date(); j.setHours(0, 0, 0, 0); const k = (j.getDay() + 6) % 7; j.setDate(j.getDate() - k + 7 * (decalage + 1)); return j; };
const dire = (date, h) => JOURS[date.getDay()] + ' ' + date.getDate() + ' ' + MOIS[date.getMonth()] + ' à ' + h + ' h';
const majuscule = (t) => t.charAt(0).toUpperCase() + t.slice(1);
// Première version (Arnaud, 15 octobre 2026, « mets en ligne ») : pas encore d'agenda branché. Tous les créneaux sont proposés,
// la personne envoie une demande par mail et Arnaud confirme ; aucun faux « déjà pris ».
const pris = () => false;

function peindreSemaine() {
  const l = lundi(etat.semaine);
  $('[data-semaine-titre]').textContent = 'Semaine du ' + l.getDate() + ' ' + MOIS[l.getMonth()];
  $('[data-semaine="-1"]').disabled = etat.semaine === 0;
  const hote = $('[data-jours]'); hote.textContent = '';
  for (let k = 0; k < 5; k++) {
    const date = new Date(l); date.setDate(l.getDate() + k);
    const col = el('div', 'rdv__jour'); col.appendChild(el('p', '', majuscule(JOURS[date.getDay()]).slice(0, 3) + '. ' + date.getDate()));
    HEURES.forEach((h) => {
      const b = el('button', 'rdv__creneau', h + ' h'); b.type = 'button';
      const occupe = pris(date, h); b.disabled = occupe;
      b.setAttribute('aria-label', dire(date, h) + (occupe ? ', déjà pris' : ''));
      const choisi = etat.creneau && etat.creneau.date.getTime() === date.getTime() && etat.creneau.h === h;
      b.setAttribute('aria-pressed', String(!!choisi));
      b.addEventListener('click', () => { etat.creneau = { date, h }; peindreSemaine(); message1(); });
      col.appendChild(b);
    });
    hote.appendChild(col);
  }
}
const message1 = () => { $('[data-rdv-message1]').textContent = etat.creneau ? majuscule(dire(etat.creneau.date, etat.creneau.h)) + ', ' + LIEUX[etat.lieu] : 'Choisissez un créneau.'; };
const vue = (n) => d.querySelectorAll('[data-vue]').forEach((v) => { v.hidden = v.dataset.vue !== String(n); });

d.querySelectorAll('[data-semaine]').forEach((b) => b.addEventListener('click', () => { etat.semaine = Math.max(0, etat.semaine + Number(b.dataset.semaine)); peindreSemaine(); }));
$('[data-continuer]').addEventListener('click', () => {
  if (!etat.creneau) { $('[data-rdv-message1]').textContent = 'Choisissez un créneau pour continuer.'; return; }
  const c = etat.creneau;
  $('[data-recap-jour]').textContent = majuscule(JOURS[c.date.getDay()]) + ' ' + c.date.getDate() + ' ' + MOIS[c.date.getMonth()];
  $('[data-recap-heure]').textContent = 'à ' + c.h + ' h, ' + LIEUX[etat.lieu] + '.';
  vue(2);
  const nom = d.querySelector('input[name=nom]'); if (prenom && !nom.value) nom.value = prenom + ' ';
  nom.focus();
});
$('[data-retour]').addEventListener('click', () => vue(1));
d.querySelector('form').addEventListener('submit', (ev) => {
  ev.preventDefault(); const f = new FormData(ev.target); const m = $('[data-rdv-message2]');
  const nom = String(f.get('nom') || '').trim(), email = String(f.get('email') || '').trim();
  if (!nom || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { m.textContent = 'Indiquez votre nom et votre e-mail pour confirmer.'; return; }
  // Maquette : rien ne part. Ici, l'enregistrement dans l'agenda Greatly.club (rendez-vous solo, page groupe).
  const c = etat.creneau;
  // La demande part par mail, comme « Réserver un salon » du site : Arnaud confirme le créneau en réponse.
  const activite = String(f.get('activite') || '').trim(), tel = String(f.get('tel') || '').trim();
  const corps = ['Bonjour,', '', 'Je souhaite visiter la Greatly House, ' + dire(c.date, c.h) + ' (créneau proposé, à confirmer).', '',
    'Nom : ' + nom, activite ? 'Activité : ' + activite : '', 'E-mail : ' + email, tel ? 'Téléphone : ' + tel : '', '',
    'Demande envoyée depuis la page « Un an dans un groupe » (indépendants).'].filter((l, k, a) => l !== '' || a[k - 1] !== '').join('\n');
  location.href = 'mailto:arnaud@greatly.club?subject=' + encodeURIComponent('Visite de la Greatly House · ' + majuscule(dire(c.date, c.h))) + '&body=' + encodeURIComponent(corps);
  $('[data-fin-texte]').textContent = 'Votre messagerie s’ouvre avec votre demande pour ' + dire(c.date, c.h) + '. Envoyez-la : nous vous confirmons le créneau par e-mail. Sinon, écrivez à arnaud@greatly.club.';
  vue(3);
});

const partir = () => { if (d.classList.contains('rdv--sort')) return; d.classList.add('rdv--sort');
  setTimeout(() => { d.close(); d.classList.remove('rdv--sort'); }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 260); };
$('[data-rdv-fermer]').addEventListener('click', partir);
d.addEventListener('click', (ev) => { if (ev.target === d) partir(); });
d.addEventListener('cancel', (ev) => { ev.preventDefault(); partir(); });
document.querySelectorAll('[data-rdv]').forEach((b) => b.addEventListener('click', () => {
  if (!d.querySelector('[data-vue="3"]').hidden) { etat.creneau = null; vue(1); message1(); }
  peindreSemaine(); d.showModal();
}));

// Les notes des membres en dix pastilles, comme le résultat : pleines jusqu'à la note, la dernière en partie.
document.querySelectorAll('.gr-notes [data-note]').forEach((h) => {
  const v = Number(h.dataset.note);
  for (let k = 0; k < 10; k++) {
    const i = document.createElement('i'); const b = document.createElement('b');
    const f = Math.max(0, Math.min(1, v - k)); b.style.transform = 'scale(' + (f >= 1 ? 1 : f > 0 ? Math.max(0.35, Math.sqrt(f)) : 0) + ')';
    i.appendChild(b); h.appendChild(i);
  }
});

// Son état des lieux, à côté de « Ce qui évolue » (Arnaud, 15 octobre 2026) : ses trois thèmes sur 100, en pastilles comme sur
// son résultat. Lu dans le navigateur (le dernier résultat gardé par la page de résultat) : rien ne part au serveur.
// Et l'engagement, ce qu'ils font grandir (Arnaud, 15 octobre 2026 : « je parlerais aussi d'engagement »).
const THEMES = [['La confiance', [11, 12]], ['Le soutien', [10, 13]], ['La cohésion', [1, 2, 5, 6]], ['L’engagement', [14, 15]]];
(async () => {
  try {
    const adresse = resultatMemorise(); if (!adresse || !adresse.includes('#')) return;
    const lu = decoder(adresse.slice(adresse.indexOf('#')), await chargerContenu()); if (!lu) return;
    const hote = $('[data-sien-lignes]');
    THEMES.forEach(([nom, aff]) => {
      const v = Math.round(aff.reduce((t, n) => t + lu.reponses[n - 1], 0) / (3 * aff.length) * 100);
      const l = el('div', 'gr-sien__theme'); l.appendChild(el('span', 'gr-sien__nom', nom));
      const c = el('strong', 'gr-sien__val', String(v)); c.appendChild(el('small', '', ' /100')); l.appendChild(c);
      const p = el('span', 'gr-pastilles');
      for (let k = 0; k < 10; k++) { const i = document.createElement('i'); const b = document.createElement('b'); const f = Math.max(0, Math.min(1, v / 10 - k));
        b.style.transform = 'scale(' + (f >= 1 ? 1 : f > 0 ? Math.max(0.35, Math.sqrt(f)) : 0) + ')'; i.appendChild(b); p.appendChild(i); }
      l.appendChild(p); hote.appendChild(l);
    });
    $('[data-sien]').hidden = false;
  } catch (e) { /* sans résultat lisible, le bloc reste caché */ }
})();
