/**
 * La page « Un an dans un groupe » pour les indépendants (Arnaud, 15 octobre 2026, maquette) : elle s'ouvre après
 * « Recevoir mon état des lieux et découvrir les solutions », et se termine par la prise de rendez-vous, dans une fenêtre,
 * en deux étapes comme la page « Prendre rendez-vous » du site (le créneau, puis les coordonnées).
 *
 * La visite se pose dans l'agenda d'Arnaud du tableau de bord (créneaux libres, notification) et la personne reçoit un mail.
 */
import { resultatMemorise } from '../session.js?v=264';
import '../entete.js?v=264';
import '../visite.js?v=264';
import { decoder } from '../lien.js?v=264';
import { chargerContenu } from '../contenu.js?v=264';

const $ = (s, r = document) => r.querySelector(s);
const el = (balise, classe, texte) => { const n = document.createElement(balise); if (classe) n.className = classe; if (texte != null) n.textContent = texte; return n; };

// Le merci, avec le prénom laissé dans le formulaire « Par mail » (gardé dans l'onglet, pas dans l'adresse).
let prenom = ''; try { prenom = (sessionStorage.getItem('edl_prenom') || '').trim().slice(0, 60); } catch (e) { /* rien */ } // jamais dans l'adresse
if (new URLSearchParams(location.search).has('envoye')) {
  $('[data-merci]').hidden = false;
  $('[data-merci-texte]').textContent = (prenom ? 'Merci ' + prenom + '. ' : 'Merci. ') + 'Votre état des lieux arrive dans votre boîte mail.';
}

const d = $('[data-rdv-fenetre]'); // la fenêtre de visite (visite.js), suivie par la barre du bas

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
// Pas de mot seul en fin de titre (téléphone) : on soude les deux derniers mots, sauf si le titre ne tient plus dans sa colonne.
if (matchMedia('(max-width: 51.25em)').matches) document.querySelectorAll('.gr :is(h1, h2) .gras, .gr .gr-fin__titre .gras').forEach((x) => {
  const t = x.lastChild; if (!t || t.nodeType !== 3 || !/ \S+\s*$/.test(t.nodeValue)) return;
  const avant = t.nodeValue; t.nodeValue = avant.replace(/ (\S+)\s*$/, '\u00a0$1');
  const boite = x.closest('h1, h2, .gr-fin__titre'); if (boite && boite.scrollWidth > boite.clientWidth + 1) t.nodeValue = avant;
});
// Nombre et mot qui suit (codes postaux, « 2 h 30 ») : insécable.
if (matchMedia('(max-width: 51.25em)').matches) { const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); for (let n = tw.nextNode(); n; n = tw.nextNode()) { if (/\d [A-Za-zÀ-ÿ]/.test(n.nodeValue) && !(n.parentElement && n.parentElement.closest('script, style'))) n.nodeValue = n.nodeValue.replace(/(\d) (?=[A-Za-zÀ-ÿ])/g, '$1\u00a0').replace(/([A-Za-zÀ-ÿ]) (?=\d)/g, '$1\u00a0'); } }
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
    const maj = () => { const on = telephone() && !hautVu && !finVu && !document.querySelector('dialog[open]'); barre.classList.toggle('gr-barre--on', on); document.documentElement.classList.toggle('gr-barre-active', on); b.tabIndex = on ? 0 : -1; barre.setAttribute('aria-hidden', String(!on)); };
    new IntersectionObserver((e) => { hautVu = e[0].isIntersecting || e[0].boundingClientRect.top > 0; maj(); }).observe(premier);
    if (fin) new IntersectionObserver((e) => { finVu = e[0].isIntersecting; maj(); }).observe(fin);
    addEventListener('resize', maj);
    if (d) { new MutationObserver(maj).observe(d, { attributes: true, attributeFilter: ['open'] }); }
  }
}
// Les saisons du parcours se font glisser au doigt sur téléphone : un repère sous le carrousel suit la saison affichée.
document.querySelectorAll('.gr-ans').forEach((rail) => {
  const saisons = [...rail.querySelectorAll('.gr-ans__saison')]; if (saisons.length < 2) return;
  const reperes = el('div', 'gr-ans__reperes'); reperes.setAttribute('aria-hidden', 'true');
  saisons.forEach((s, i) => { const r = el('button', '', ''); r.type = 'button'; r.tabIndex = -1; r.addEventListener('click', () => s.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', inline: 'start', block: 'nearest' })); reperes.appendChild(r); });
  rail.after(reperes);
  const suivre = () => { const g = rail.getBoundingClientRect().left; let k = 0, d = Infinity; saisons.forEach((s, i) => { const e = Math.abs(s.getBoundingClientRect().left - g - 16); if (e < d) { d = e; k = i; } }); [...reperes.querySelectorAll('button')].forEach((r, i) => r.classList.toggle('actif', i === k)); const c = reperes.querySelector('.gr-ans__compte'); if (c) c.textContent = (k + 1) + '\u00a0/\u00a0' + saisons.length; };
  const compte = el('span', 'gr-ans__compte'); reperes.appendChild(compte);
  rail.addEventListener('scroll', suivre, { passive: true }); suivre();
});
