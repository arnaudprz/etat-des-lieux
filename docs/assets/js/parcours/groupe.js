/**
 * La page « Un an dans un groupe » pour les indépendants (Arnaud, 15 octobre 2026, maquette) : elle s'ouvre après
 * « Recevoir mon état des lieux et découvrir les solutions », et se termine par la prise de rendez-vous, dans une fenêtre,
 * en deux étapes comme la page « Prendre rendez-vous » du site (le créneau, puis les coordonnées).
 *
 * La visite se pose dans l'agenda d'Arnaud du tableau de bord (créneaux libres, notification) et la personne reçoit un mail.
 */
import { resultatMemorise } from '../session.js?v=234';
import { decoder } from '../lien.js?v=234';
import { chargerContenu } from '../contenu.js?v=234';
import { SUPABASE_URL, SUPABASE_CLE } from '../config.js?v=234';

const $ = (s, r = document) => r.querySelector(s);
const el = (balise, classe, texte) => { const n = document.createElement(balise); if (classe) n.className = classe; if (texte != null) n.textContent = texte; return n; };

// Le merci, avec le prénom laissé dans le formulaire « Par mail » (gardé dans l'onglet, pas dans l'adresse).
let prenom = ''; try { prenom = (sessionStorage.getItem('edl_prenom') || '').trim().slice(0, 60); } catch (e) { /* rien */ } // jamais dans l'adresse
if (new URLSearchParams(location.search).has('envoye')) {
  $('[data-merci]').hidden = false;
  $('[data-merci-texte]').textContent = (prenom ? 'Merci ' + prenom + '. ' : 'Merci. ') + 'Votre état des lieux arrive dans votre boîte mail.';
}

// ------------------------------------------------------------------ la visite
// Les vrais créneaux et la vraie réservation (Arnaud, 15 octobre 2026 : « un mail avec notre techno habituelle, une notification
// dans le dashboard, et que ça se pose dans l'agenda d'Arnaud avec les créneaux dispo ») : visite_creneaux dit ce qui est libre
// dans l'agenda du tableau de bord (migration 37), la fonction « visite » pose la visite et envoie le mail par Brevo.
const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const SEMAINES = 8; // de la semaine en cours à huit semaines, comme la base
// Toujours à la maison (Arnaud, 15 octobre 2026 : « venez visiter la maison, pas de téléphone ni visio »).
const LIEU = 'à la Greatly House';
const d = $('[data-rdv-fenetre]');
const etat = { semaine: 0, creneau: null };

const iso = (x) => x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
const lundi = (decalage) => { const j = new Date(); j.setHours(0, 0, 0, 0); const k = (j.getDay() + 6) % 7; j.setDate(j.getDate() - k + 7 * decalage); return j; };
const heureDite = (hm) => { const [h, m] = hm.split(':'); return Number(h) + ' h' + (m !== '00' ? ' ' + m : ''); };
const dire = (date, hm) => JOURS[date.getDay()] + ' ' + date.getDate() + ' ' + MOIS[date.getMonth()] + ' à ' + heureDite(hm);
const majuscule = (t) => t.charAt(0).toUpperCase() + t.slice(1);
const appel = async (chemin, corps) => {
  const r = await fetch(SUPABASE_URL + chemin, { method: 'POST', headers: { apikey: SUPABASE_CLE, Authorization: 'Bearer ' + SUPABASE_CLE, 'Content-Type': 'application/json' }, body: JSON.stringify(corps) });
  return { statut: r.status, j: await r.json().catch(() => ({})) };
};

let tour = 0;
async function peindreSemaine(auto = false) {
  const l = lundi(etat.semaine); const n = ++tour;
  $('[data-semaine-titre]').textContent = 'Semaine du ' + l.getDate() + ' ' + MOIS[l.getMonth()];
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
}
const message1 = (t) => { $('[data-rdv-message1]').textContent = t || (etat.creneau ? majuscule(dire(etat.creneau.date, etat.creneau.heure)) + ', ' + LIEU : 'Choisissez un créneau.'); };
const vue = (n) => d.querySelectorAll('[data-vue]').forEach((v) => { v.hidden = v.dataset.vue !== String(n); });

d.querySelectorAll('[data-semaine]').forEach((b) => b.addEventListener('click', () => { etat.semaine = Math.min(SEMAINES - 1, Math.max(0, etat.semaine + Number(b.dataset.semaine))); peindreSemaine(); }));
$('[data-continuer]').addEventListener('click', () => {
  if (!etat.creneau) { message1('Choisissez un créneau pour continuer.'); return; }
  const c = etat.creneau;
  $('[data-recap-jour]').textContent = majuscule(JOURS[c.date.getDay()]) + ' ' + c.date.getDate() + ' ' + MOIS[c.date.getMonth()];
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
document.querySelectorAll('[data-rdv]').forEach((b) => b.addEventListener('click', () => {
  if (!d.querySelector('[data-vue="3"]').hidden) { etat.creneau = null; vue(1); message1(); d.querySelector('form').reset(); }
  if (!etat.creneau) etat.semaine = 0;
  peindreSemaine(!etat.creneau); d.showModal();
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

// Le sélecteur « Pour vous / Pour votre équipe » en interrupteur (Arnaud, 15 octobre 2026 : « en mode bouton on off ») : la pastille
// glisse vers l'option choisie, puis la page change.
document.querySelectorAll('.gr-choix').forEach((nav) => {
  const liens = [...nav.querySelectorAll('.gr-choix__lien')]; const actif = liens.find((a) => a.getAttribute('aria-current') === 'page'); if (!actif) return;
  const g = document.createElement('span'); g.className = 'gr-choix__glisse'; g.setAttribute('aria-hidden', 'true'); nav.prepend(g); nav.classList.add('gr-choix--js');
  const poser = (a) => { g.style.left = a.offsetLeft + 'px'; g.style.width = a.offsetWidth + 'px'; liens.forEach((x) => { x.style.color = x === a ? '#FFFFFF' : ''; x.querySelector('small') && (x.querySelector('small').style.color = x === a ? 'var(--teinte)' : ''); }); };
  poser(actif); addEventListener('resize', () => poser(liens.find((a) => a.getAttribute('aria-current') === 'page') || actif));
  liens.forEach((a) => a.addEventListener('click', (ev) => {
    if (a === actif || ev.metaKey || ev.ctrlKey) return; ev.preventDefault(); poser(a);
    const envoye = location.search.includes('envoye') ? '?envoye' : '';
    setTimeout(() => { location.href = a.getAttribute('href') + envoye; }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 300);
  }));
});

// L'interrupteur « Pour vous / Pour votre équipe » : le rond glisse de l'autre côté, puis la page change.
document.querySelectorAll('.gr-bascule').forEach((g) => {
  g.querySelectorAll('a').forEach((a) => a.addEventListener('click', (ev) => {
    if (a.getAttribute('aria-current') === 'page' || ev.metaKey || ev.ctrlKey) { if (a.getAttribute('aria-current') === 'page') ev.preventDefault(); return; }
    ev.preventDefault(); g.classList.add('gr-bascule--va');
    const envoye = location.search.includes('envoye') ? '?envoye' : '';
    setTimeout(() => { location.href = a.getAttribute('href') + envoye; }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 340);
  }));
});

// ------------------------------------------------------------- le téléphone (socle responsive, 16 octobre 2026)
// Typographie française : espace insécable avant ? ! : ; » et après « (Lexique de l'Imprimerie nationale), sur tout le texte.
{
  const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = tw.nextNode(); n; n = tw.nextNode()) {
    if (n.parentElement && n.parentElement.closest('script, style, textarea, input')) continue;
    if (/[ ][?!:;»]|«[ ]/.test(n.nodeValue)) n.nodeValue = n.nodeValue.replace(/ ([?!:;»])/g, ' $1').replace(/« /g, '« ');
  }
}
const telephone = () => matchMedia('(max-width: 51.25em)').matches;
// Le bouton « Visiter la maison » collé en bas, dans la zone du pouce (Steven Hoober), dès que celui du haut sort de l'écran ;
// il s'efface quand le bloc final « Venez visiter la maison » arrive (un seul appel à la fois à l'écran).
{
  const premier = document.querySelectorAll('main [data-rdv]')[0]; const fin = $('.gr-fin');
  if (premier && 'IntersectionObserver' in window) {
    const barre = el('div', 'gr-barre'); barre.setAttribute('aria-hidden', 'true');
    const b = el('button', 'gr-bouton gr-barre__bouton'); b.type = 'button'; b.tabIndex = -1;
    b.innerHTML = premier.innerHTML; b.addEventListener('click', () => premier.click());
    barre.appendChild(b); document.body.appendChild(barre);
    let hautVu = true, finVu = false;
    const maj = () => { const on = telephone() && !hautVu && !finVu; barre.classList.toggle('gr-barre--on', on); b.tabIndex = on ? 0 : -1; barre.setAttribute('aria-hidden', String(!on)); };
    new IntersectionObserver((e) => { hautVu = e[0].isIntersecting; maj(); }).observe(premier);
    if (fin) new IntersectionObserver((e) => { finVu = e[0].isIntersecting; maj(); }).observe(fin);
    addEventListener('resize', maj);
  }
}
// Les saisons du parcours se font glisser au doigt sur téléphone : un repère sous le carrousel suit la saison affichée.
document.querySelectorAll('.gr-ans').forEach((rail) => {
  const saisons = [...rail.querySelectorAll('.gr-ans__saison')]; if (saisons.length < 2) return;
  const reperes = el('div', 'gr-ans__reperes'); reperes.setAttribute('aria-hidden', 'true');
  saisons.forEach((s, i) => { const r = el('button', '', ''); r.type = 'button'; r.tabIndex = -1; r.addEventListener('click', () => s.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', inline: 'start', block: 'nearest' })); reperes.appendChild(r); });
  rail.after(reperes);
  const suivre = () => { const g = rail.getBoundingClientRect().left; let k = 0, d = Infinity; saisons.forEach((s, i) => { const e = Math.abs(s.getBoundingClientRect().left - g - 16); if (e < d) { d = e; k = i; } }); [...reperes.children].forEach((r, i) => r.classList.toggle('actif', i === k)); };
  rail.addEventListener('scroll', suivre, { passive: true }); suivre();
});
