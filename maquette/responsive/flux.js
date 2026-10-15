// Le petit parcours des maquettes de phrase : trois phrases réelles, les réponses, les idées « J'aimerais… », la progression.
// Chaque piste choisit sa mise en scène par des attributs sur <body> : data-mode="feuille" (panneau du bas) ou "dedans".
const THEMES = ['Ce qu’on vise ensemble', 'Ce qu’on sait les uns des autres', 'La place de chacun', 'Comment l’info circule', 'Quand ça accroche', 'Votre rôle auprès de l’équipe', 'La confiance et le soutien', 'Le sens du travail'];
const PHRASES = [
  { theme: 0, t: 'Dans mon équipe, nous visons tous le même résultat.', idees: ['Qu’on se donne un cap commun', 'Mieux comprendre ce que vise l’entreprise', 'Qu’on parle plus souvent de nos priorités', 'Voir comment chaque métier y contribue', 'Qu’on célèbre davantage nos réussites'] },
  { theme: 0, t: 'Quand un résultat est bon, mon équipe le vit comme une réussite commune.' },
  { theme: 1, t: 'Les membres de mon équipe connaissent les contraintes quotidiennes des autres métiers.', idees: ['Découvrir le quotidien des autres métiers', 'Qu’on se présente nos contraintes', 'Passer une demi-journée chez un collègue', 'Qu’on partage nos priorités de la semaine'] },
];
const REPONSES = ['Pas encore', 'Un peu', 'En bonne partie', 'Pleinement'];
const PAR_THEME = [2, 2, 2, 2, 1, 1, 3, 3];
const $ = (s, r = document) => r.querySelector(s);
const calme = matchMedia('(prefers-reduced-motion: reduce)').matches;
let k = 0;
const vibrer = () => { try { if (navigator.vibrate && !/iPhone|iPad/.test(navigator.userAgent)) navigator.vibrate(8); } catch (e) { /* rien */ } };
function progression() {
  const fait = k; let cumul = 0;
  document.querySelectorAll('[data-segment]').forEach((s, i) => { const n = PAR_THEME[i]; const p = Math.max(0, Math.min(1, (fait - cumul) / n)); cumul += n; s.style.setProperty('--p', p); s.classList.toggle('en-cours', PHRASES[k % PHRASES.length].theme === i); });
  const tot = PAR_THEME.reduce((a, b) => a + b, 0);
  document.documentElement.style.setProperty('--avance', Math.min(1, fait / tot));
}
function afficher() {
  const ph = PHRASES[k % PHRASES.length];
  $('[data-theme]').textContent = THEMES[ph.theme];
  $('[data-phrase]').textContent = ph.t;
  const zone = $('[data-reponses]'); zone.replaceChildren();
  REPONSES.forEach((r, i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'carte-rep'; b.style.setProperty('--i', i);
    b.innerHTML = '<span class="carte-rep__coche" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span><span>' + r + '</span>';
    b.addEventListener('click', () => choisir(b, i)); zone.appendChild(b); });
  fermerIdees(true); progression();
  const ecran = $('[data-ecran]'); ecran.classList.remove('sort'); void ecran.offsetWidth; ecran.classList.add('entre');
  $('[data-phrase]').focus({ preventScroll: true });
}
function choisir(b, i) {
  vibrer();
  document.querySelectorAll('.carte-rep').forEach((x) => x.classList.toggle('choisie', x === b));
  document.body.classList.add('a-repondu');
  const ph = PHRASES[k % PHRASES.length];
  if (i <= 1 && ph.idees) { setTimeout(() => ouvrirIdees(ph), calme ? 0 : 260); return; }
  setTimeout(suivante, calme ? 150 : 520);
}
function suivante() {
  const ecran = $('[data-ecran]'); ecran.classList.remove('entre'); ecran.classList.add('sort');
  fermerIdees();
  setTimeout(() => { k += 1; document.body.classList.remove('a-repondu'); afficher(); scrollTo(0, 0); }, calme ? 0 : 280);
}
function ouvrirIdees(ph) {
  const z = $('[data-idees]'); const l = $('[data-idees-liste]', z); l.replaceChildren();
  ph.idees.concat(['Autre']).forEach((t, i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'idee'; b.style.setProperty('--i', i); b.setAttribute('role', 'checkbox'); b.setAttribute('aria-checked', 'false');
    b.innerHTML = '<span class="idee__case" aria-hidden="true"></span><span>' + t + '</span>';
    b.addEventListener('click', () => { const on = b.getAttribute('aria-checked') !== 'true'; const deja = z.querySelectorAll('[aria-checked="true"]').length; if (on && deja >= 2) return; b.setAttribute('aria-checked', String(on)); vibrer(); });
    l.appendChild(b); });
  z.hidden = false; document.body.classList.add('idees-ouvertes'); requestAnimationFrame(() => z.classList.add('ouvert'));
}
function fermerIdees(vite) { const z = $('[data-idees]'); if (!z) return; z.classList.remove('ouvert'); document.body.classList.remove('idees-ouvertes'); if (vite) z.hidden = true; else setTimeout(() => { z.hidden = true; }, 260); }
document.addEventListener('DOMContentLoaded', () => {
  $('[data-suivante]').addEventListener('click', suivante);
  const r = $('[data-retour]'); if (r) r.addEventListener('click', () => { if (k > 0) { k -= 1; afficher(); } });
  afficher();
});
