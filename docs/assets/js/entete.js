// « Visiter la maison » dans l'en-tête de toutes les pages (Arnaud, 16 octobre 2026) : en haut à droite sur ordinateur, le
// bouton de fin de parcours des pages groupe (aplat bleu-vert, rond vert vif) ; sur téléphone, rangé dans un menu à deux
// traits, sans bulle, qui se croisent à l'ouverture, et le menu s'ouvre en pleine page blanche. Partout, le bouton ouvre la
// fenêtre de visite sur place, comme dans le parcours (visite.js). Jamais dans le PDF.
import './visite.js?v=264';
// Tailles en px : le même bouton sur toutes les pages, dont la taille de base diffère (site Astro, pages groupe).
const STYLE = `
.ent{display:flex;align-items:center;margin-left:auto}
.ent__cta{display:inline-flex;align-items:center;gap:10px;min-height:44px;padding:0 6px 0 18px;border:0;border-radius:999px;background:#23545B;color:#FFFFFF;font:800 15px 'Bricolage Grotesque',sans-serif;letter-spacing:-.01em;text-decoration:none;white-space:nowrap;cursor:pointer}
.ent__cta .ent__rond,.ent__cta .gr-rond{display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:999px;background:#B4F25C;flex-shrink:0;transition:transform .2s ease}
.ent__cta svg{width:18px;height:18px;fill:none;stroke:#0C1011;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}
@media (hover:hover){.ent__cta:hover .ent__rond,.ent__cta:hover .gr-rond{transform:translateX(3px)}}
.ent__cta:focus-visible{outline:2px solid #23545B;outline-offset:3px}
.ent__burger{display:none}
html.mode-pdf .ent{display:none!important}
@media (max-width:51.25em){
  .ent-tete{position:sticky}
  .ent__burger{display:inline-flex;flex-direction:column;justify-content:center;align-items:flex-end;gap:6px;width:44px;height:44px;margin-right:-.625rem;padding:0 .625rem;border:0;background:none;cursor:pointer;-webkit-tap-highlight-color:transparent;box-sizing:border-box}
  .ent__burger:focus{outline:none}
  .ent__burger:focus-visible span{background:#23545B}
  .ent__burger span{display:block;width:22px;height:2px;border-radius:2px;background:#0C1011;transition:transform .3s cubic-bezier(.2,.7,.2,1),width .3s cubic-bezier(.2,.7,.2,1)}
  .ent__burger span:last-child{width:14px}
  .ent__burger[aria-expanded="true"] span:first-child{transform:translateY(4px) rotate(45deg)}
  .ent__burger[aria-expanded="true"] span:last-child{width:22px;transform:translateY(-4px) rotate(-45deg)}
  .ent__menu{position:absolute;left:0;right:0;top:100%;z-index:50;height:calc(100dvh - var(--ent-haut,64px));box-sizing:border-box;display:flex;flex-direction:column;padding:24px 16px max(env(safe-area-inset-bottom),24px);background:#FFFFFF;opacity:0;visibility:hidden;transform:translateY(-.5rem);transition:opacity .2s ease,transform .25s cubic-bezier(.2,.7,.2,1),visibility .2s}
  html.ent-verrou,html.ent-verrou body{overflow:hidden}
  .ent--ouvert .ent__menu{opacity:1;visibility:visible;transform:none}
  .ent__menu .ent__cta{display:flex!important;width:100%;justify-content:space-between;min-height:56px;padding:0 6px 0 24px!important;font-size:17px!important;gap:10px!important;box-sizing:border-box}
  .ent__menu .ent__cta .ent__rond,.ent__menu .ent__cta .gr-rond{width:44px!important;height:44px!important}
}
@media (hover:hover) and (max-width:51.25em){.ent__burger:hover span:last-child{width:22px}}
@media (prefers-reduced-motion:reduce){.ent__menu,.ent__burger span{transition:none}}
`;
const FLECHE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
const poser = (tete) => {
  if (tete.querySelector('.ent')) return;
  // Le conteneur en ligne de l'en-tête : l'en-tête lui-même, ou son premier bloc flex (en-têtes du site Astro).
  const rangee = getComputedStyle(tete).display === 'flex' ? tete : [...tete.children].find((x) => getComputedStyle(x).display === 'flex') || tete;
  let cta = tete.querySelector('[data-rdv]');
  if (cta) cta.classList.add('ent__cta');
  else {
    cta = document.createElement('button'); cta.type = 'button'; cta.className = 'ent__cta'; cta.setAttribute('data-rdv', '');
    cta.innerHTML = 'Visiter la maison<span class="ent__rond" aria-hidden="true">' + FLECHE + '</span>';
  }
  const ent = document.createElement('div'); ent.className = 'ent';
  const id = 'ent-menu-' + Math.random().toString(36).slice(2, 8);
  ent.innerHTML = '<button class="ent__burger" type="button" aria-label="Menu" aria-expanded="false" aria-controls="' + id + '"><span></span><span></span></button><div class="ent__menu" id="' + id + '"></div>';
  ent.querySelector('.ent__menu').appendChild(cta);
  rangee.appendChild(ent); tete.classList.add('ent-tete');
  const burger = ent.querySelector('.ent__burger');
  const basculer = (on) => {
    if (on) tete.style.setProperty('--ent-haut', Math.round(tete.getBoundingClientRect().bottom) + 'px');
    ent.classList.toggle('ent--ouvert', on); burger.setAttribute('aria-expanded', String(on)); document.documentElement.classList.toggle('ent-verrou', on);
    if (on) cta.focus({ preventScroll: true });
  };
  burger.addEventListener('click', () => basculer(!ent.classList.contains('ent--ouvert')));
  cta.addEventListener('click', () => basculer(false));
  document.addEventListener('click', (e) => { if (ent.classList.contains('ent--ouvert') && !ent.contains(e.target)) basculer(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && ent.classList.contains('ent--ouvert')) { basculer(false); burger.focus(); } });
};
const tout = () => document.querySelectorAll('body > header, header.haut, [data-maquette] header').forEach((h) => { if (!h.closest('footer')) poser(h); });
if (!document.getElementById('ent-style')) { const s = document.createElement('style'); s.id = 'ent-style'; s.textContent = STYLE; document.head.appendChild(s); }
tout();
// Les en-têtes du site Astro arrivent après coup : on les attrape quand ils apparaissent.
let attente = null;
new MutationObserver(() => { if (attente) return; attente = requestAnimationFrame(() => { attente = null; tout(); }); }).observe(document.body, { childList: true, subtree: true });
