/**
 * La fenêtre « Visiter la maison », commune à toutes les pages (Arnaud, 16 octobre 2026 : « le bouton visiter la maison doit
 * fonctionner de la même façon que dans le parcours ») : la même fenêtre en deux étapes que les pages groupe (le créneau, puis
 * les coordonnées), avec les vrais créneaux de l'agenda du tableau de bord et la vraie réservation. Sur les pages qui n'ont pas
 * la fenêtre dans leur HTML, elle est ajoutée, avec sa feuille de style (visite.css).
 */
import { SUPABASE_URL, SUPABASE_CLE } from './config.js?v=264';

const $ = (s, r = document) => r.querySelector(s);
const el = (balise, classe, texte) => { const n = document.createElement(balise); if (classe) n.className = classe; if (texte != null) n.textContent = texte; return n; };
const telephone = () => matchMedia('(max-width: 51.25em)').matches;
let prenom = ''; try { prenom = (sessionStorage.getItem('edl_prenom') || '').trim().slice(0, 60); } catch (e) { /* rien */ } // jamais dans l'adresse
const FLECHE = '<span class="gr-rond" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span>';
const GABARIT = '<button class="rdv__fermer" type="button" aria-label="Fermer" data-rdv-fermer>×</button>'
  + '<div class="rdv__vue" data-vue="1"><span class="surtitre">Visiter la maison · Étape 1 sur 2</span>'
  + '<h2><span class="leger">1 h 30,</span> <span class="gras">autour d’un café.</span></h2>'
  + '<p class="rdv__adresse">À la Greatly House, 10 rue de Lambersart, 59237 Verlinghem. À 10 min de Lille, au vert.</p>'
  + '<div class="rdv__semaine"><button type="button" aria-label="Semaine précédente" data-semaine="-1">←</button><p data-semaine-titre>Semaine du …</p><button type="button" aria-label="Semaine suivante" data-semaine="1">→</button></div>'
  + '<div class="rdv__jours" data-jours></div><p class="rdv__message" data-rdv-message1 role="status">Choisissez un créneau.</p>'
  + '<button class="gr-bouton" type="button" data-continuer>Continuer' + FLECHE + '</button></div>'
  + '<form class="rdv__vue" data-vue="2" hidden novalidate><span class="surtitre">Votre visite · Étape 2 sur 2</span>'
  + '<h2><span class="leger" data-recap-jour></span> <span class="gras" data-recap-heure></span></h2>'
  + '<p class="rdv__adresse" data-recap-adresse>10 rue de Lambersart, 59237 Verlinghem · À 10 min de Lille, au vert.</p>'
  + '<div class="rdv__champs"><label>Prénom et nom<input name="nom" autocomplete="name" required></label><label>Votre activité<input name="activite" autocomplete="organization"></label>'
  + '<label>E-mail<input name="email" type="email" autocomplete="email" required></label><label>Téléphone<input name="tel" type="tel" autocomplete="tel"></label></div>'
  + '<div class="piege" aria-hidden="true"><label>Site<input name="site" type="text" tabindex="-1" autocomplete="off"></label></div>'
  + '<p class="rdv__message" data-rdv-message2 role="status">1 h 30, sans engagement.</p>'
  + '<div class="rdv__bas"><button class="gr-lien" type="button" data-retour>← Changer de créneau</button><button class="gr-bouton" type="submit">Confirmer la visite' + FLECHE + '</button></div></form>'
  + '<div class="rdv__vue rdv__vue--fin" data-vue="3" hidden><span class="surtitre surtitre--clair">C’est noté</span>'
  + '<h2><span class="leger">Votre visite</span> <span class="gras">est posée.</span></h2><p data-fin-texte></p></div>';
const fenetre = () => {
  let f = $('[data-rdv-fenetre]'); if (f) return f;
  if (!document.querySelector('link[href*="groupe.css"], link[href*="visite.css"]')) {
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = '/assets/css/visite.css?v=264'; document.head.appendChild(l);
  }
  f = el('dialog', 'rdv'); f.setAttribute('aria-label', 'Visiter la Greatly House'); f.setAttribute('data-rdv-fenetre', '');
  f.innerHTML = GABARIT; document.body.appendChild(f); return f;
};

// ------------------------------------------------------------------ la visite
// Les vrais créneaux et la vraie réservation (Arnaud, 15 octobre 2026 : « un mail avec notre techno habituelle, une notification
// dans le dashboard, et que ça se pose dans l'agenda d'Arnaud avec les créneaux dispo ») : visite_creneaux dit ce qui est libre
// dans l'agenda du tableau de bord (migration 37), la fonction « visite » pose la visite et envoie le mail par Brevo.
const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const SEMAINES = 8; // de la semaine en cours à huit semaines, comme la base
// Toujours à la maison (Arnaud, 15 octobre 2026 : « venez visiter la maison, pas de téléphone ni visio »).
const LIEU = 'à la Greatly House';
const d = fenetre();
const etat = { semaine: 0, creneau: null };

const iso = (x) => x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
const lundi = (decalage) => { const j = new Date(); j.setHours(0, 0, 0, 0); const k = (j.getDay() + 6) % 7; j.setDate(j.getDate() - k + 7 * decalage); return j; };
const heureDite = (hm) => { const [h, m] = hm.split(':'); return Number(h) + '\u00a0h' + (m !== '00' ? '\u00a0' + m : ''); }; // insécables (Lexique IN)
const dire = (date, hm) => JOURS[date.getDay()] + '\u00a0' + date.getDate() + '\u00a0' + MOIS[date.getMonth()] + ' à\u00a0' + heureDite(hm);
const majuscule = (t) => t.charAt(0).toUpperCase() + t.slice(1);
const appel = async (chemin, corps) => {
  const r = await fetch(SUPABASE_URL + chemin, { method: 'POST', headers: { apikey: SUPABASE_CLE, Authorization: 'Bearer ' + SUPABASE_CLE, 'Content-Type': 'application/json' }, body: JSON.stringify(corps) });
  return { statut: r.status, j: await r.json().catch(() => ({})) };
};

let tour = 0;
async function peindreSemaine(auto = false) {
  const l = lundi(etat.semaine); const n = ++tour;
  $('[data-semaine-titre]').textContent = 'Semaine du ' + l.getDate() + '\u00a0' + MOIS[l.getMonth()];
  $('[data-semaine="-1"]').disabled = etat.semaine === 0; $('[data-semaine="1"]').disabled = etat.semaine >= SEMAINES - 1;
  const hote = $('[data-jours]'); hote.setAttribute('aria-busy', 'true'); hote.classList.add('rdv__jours--charge');
  let jours = null;
  try { const { j } = await appel('/rest/v1/rpc/visite_creneaux', { p_lundi: iso(l) }); if (j && j.ok) jours = j.jours; } catch (e) { /* plus bas */ }
  if (n !== tour) return; // une autre semaine a été demandée entre-temps
  hote.textContent = ''; hote.removeAttribute('aria-busy'); hote.classList.remove('rdv__jours--charge');
  if (!jours) { hote.appendChild(el('p', 'rdv__erreur', 'Les créneaux ne se chargent pas. Réessayez dans un instant, ou écrivez à arnaud@greatly.club.')); return; }
  // À l'ouverture, on va directement à la première semaine qui a un créneau libre (vacances, jours fériés, agenda plein).
  if (auto && etat.semaine < SEMAINES - 1 && !jours.some((jr) => jr.creneaux.some((c) => c.libre))) { etat.semaine += 1; return peindreSemaine(true); }
  jours.forEach((jr) => {
    const date = new Date(jr.jour + 'T12:00:00');
    const col = el('div', 'rdv__jour'); col.appendChild(el('p', '', majuscule(JOURS[date.getDay()]).slice(0, 3) + '. ' + date.getDate()));
    // Vacances scolaires (zone B) ou jour férié : la maison ne reçoit pas ce jour-là.
    if (jr.ferme) { const x = el('span', 'rdv__ferme', /férié/.test(jr.ferme) ? 'Férié' : 'Vacances'); x.title = jr.ferme; col.appendChild(x); hote.appendChild(col); return; }
    jr.creneaux.forEach((c) => {
      const b = el('button', 'rdv__creneau', heureDite(c.heure)); b.type = 'button'; b.disabled = !c.libre;
      b.setAttribute('aria-label', dire(date, c.heure) + (c.libre ? '' : ', pas disponible'));
      const choisi = etat.creneau && etat.creneau.jour === jr.jour && etat.creneau.heure === c.heure;
      b.setAttribute('aria-pressed', String(!!choisi));
      b.addEventListener('click', () => { etat.creneau = { jour: jr.jour, heure: c.heure, date }; hote.querySelectorAll('.rdv__creneau').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); message1(); });
      col.appendChild(b);
    });
    hote.appendChild(col);
  });
  // Une semaine sans créneau libre le dit, et propose la suivante (état vide dessiné, responsive 16 octobre 2026).
  if (!jours.some((jr) => !jr.ferme && jr.creneaux.some((c) => c.libre))) {
    const v = el('p', 'rdv__vide', etat.semaine < SEMAINES - 1 ? 'Pas de créneau libre cette semaine. ' : 'Pas de créneau libre pour l’instant. ');
    if (etat.semaine < SEMAINES - 1) { const b = el('button', 'gr-lien', 'Voir la semaine suivante'); b.type = 'button'; b.addEventListener('click', () => { etat.semaine += 1; peindreSemaine(); }); v.appendChild(b); }
    hote.appendChild(v);
  }
}
const message1 = (t) => { $('[data-rdv-message1]').textContent = t || (etat.creneau ? majuscule(dire(etat.creneau.date, etat.creneau.heure)) + ', ' + LIEU : ''); /* le bouton dit déjà « Choisissez un créneau » */ const c = $('[data-continuer]'); if (c) { c.classList.toggle('gr-bouton--attente', !etat.creneau); const t = [...c.childNodes].find((x) => x.nodeType === 3 && x.nodeValue.trim()); if (t) t.nodeValue = etat.creneau ? 'Continuer' : 'Choisissez un créneau'; } };
const vue = (n) => d.querySelectorAll('[data-vue]').forEach((v) => { v.hidden = v.dataset.vue !== String(n); });

d.querySelectorAll('[data-semaine]').forEach((b) => b.addEventListener('click', () => { etat.semaine = Math.min(SEMAINES - 1, Math.max(0, etat.semaine + Number(b.dataset.semaine))); peindreSemaine(); }));
$('[data-continuer]').addEventListener('click', () => {
  if (!etat.creneau) { message1('Choisissez un créneau pour continuer.'); return; }
  const c = etat.creneau;
  $('[data-recap-jour]').textContent = majuscule(JOURS[c.date.getDay()]) + '\u00a0' + c.date.getDate() + '\u00a0' + MOIS[c.date.getMonth()];
  $('[data-recap-heure]').textContent = 'à ' + heureDite(c.heure) + ', ' + LIEU + '.';
  vue(2);
  const nom = d.querySelector('input[name=nom]'); if (prenom && !nom.value) nom.value = prenom + ' ';
  nom.focus();
});
$('[data-retour]').addEventListener('click', () => vue(1));
d.querySelector('form').addEventListener('submit', async (ev) => {
  ev.preventDefault(); const f = new FormData(ev.target); const m = $('[data-rdv-message2]'); const bouton = ev.target.querySelector('button[type=submit]');
  const nom = String(f.get('nom') || '').trim(), email = String(f.get('email') || '').trim();
  if (!nom || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { m.textContent = 'Indiquez votre nom et votre e-mail pour confirmer.'; return; }
  const c = etat.creneau; bouton.disabled = true; m.textContent = 'Nous posons votre visite…';
  try {
    const { statut, j } = await appel('/functions/v1/visite', { nom, email, activite: String(f.get('activite') || '').trim(), tel: String(f.get('tel') || '').trim(), jour: c.jour, heure: c.heure, sujet: d.dataset.sujet || 'groupe', site: String(f.get('site') || '') }); // pour lui, ou pour un séminaire
    if (j && j.ok) {
      $('[data-fin-texte]').textContent = majuscule(j.quand || dire(c.date, c.heure)) + ', ' + LIEU + '. Vous recevez une confirmation par e-mail. Un empêchement ? Répondez simplement à ce mail.';
      vue(3); bouton.disabled = false; return;
    }
    if (statut === 409) { etat.creneau = null; vue(1); message1(j.erreur || 'Ce créneau vient d’être pris. Choisissez-en un autre.'); peindreSemaine(); bouton.disabled = false; return; }
    m.textContent = (j && j.erreur) || 'La demande n’a pas abouti. Réessayez dans un instant.';
  } catch (e) { m.textContent = 'La demande n’a pas abouti. Réessayez dans un instant, ou écrivez à arnaud@greatly.club.'; }
  bouton.disabled = false;
});

const partir = () => { if (d.classList.contains('rdv--sort')) return; d.classList.add('rdv--sort');
  setTimeout(() => { d.close(); d.classList.remove('rdv--sort'); }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 260); };
$('[data-rdv-fermer]').addEventListener('click', partir);
d.addEventListener('click', (ev) => { if (ev.target === d) partir(); });
d.addEventListener('cancel', (ev) => { ev.preventDefault(); partir(); });
const ouvrir = () => {
  if (d.open) return;
  if (!d.querySelector('[data-vue="3"]').hidden) { etat.creneau = null; vue(1); message1(); d.querySelector('form').reset(); }
  if (!etat.creneau) etat.semaine = 0;
  // Même taille partout : certaines pages (le questionnaire sur téléphone) réduisent leur taille de base ; la fenêtre compense.
  const base = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16; d.style.zoom = base && Math.abs(base - 16) > 0.5 ? String(16 / base) : '';
  peindreSemaine(!etat.creneau); message1(); d.showModal();
};
// Tout bouton « Visiter la maison » de la page (en-tête, menu, barre du bas, fin de page), même ajouté après coup.
document.addEventListener('click', (e) => { const b = e.target.closest('[data-rdv]'); if (b && !b.disabled) { e.preventDefault(); ouvrir(); } });

// Un ancien lien vers #visiter : la fenêtre s'ouvre d'elle-même.
if (location.hash === '#visiter') setTimeout(ouvrir, 400);

// La fenêtre de visite et le clavier du téléphone (Arnaud, 16 octobre 2026 : le clavier cachait « Confirmer la visite ») : la
// fenêtre s'arrête au-dessus du clavier (visualViewport), son bas reste collé, et le clavier propose « suivant » de champ en champ.
[d].forEach((d) => {
  const champs = [...d.querySelectorAll('.rdv__champs input')];
  champs.forEach((x, k) => x.setAttribute('enterkeyhint', k < champs.length - 1 ? 'next' : 'done'));
  champs.forEach((x, k) => x.addEventListener('keydown', (e) => { if (e.key === 'Enter' && k < champs.length - 1) { e.preventDefault(); champs[k + 1].focus(); } }));
  const vv = window.visualViewport; if (!vv) return;
  const caler = () => {
    const clavier = d.open && telephone() ? Math.max(0, Math.round(innerHeight - (vv.offsetTop + vv.height))) : 0;
    d.style.setProperty('--clavier', clavier + 'px'); d.style.setProperty('--vue', Math.round(vv.height) + 'px');
    d.classList.toggle('rdv--clavier', clavier > 80);
  };
  vv.addEventListener('resize', caler); vv.addEventListener('scroll', caler);
  new MutationObserver(caler).observe(d, { attributes: true, attributeFilter: ['open'] });
});
