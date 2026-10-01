/**
 * Accueil.
 *
 * Tous les textes viennent de contenu.json > accueil. Les noms de dimension et
 * de niveau viennent des sections dimensions et niveaux.
 *
 * Aucun texte de cette page ne dit « votre équipe » pour s'adresser au
 * visiteur : il parle aussi bien à un membre qu'à un manager.
 */

import { chargerContenu } from '../contenu.js';
import { compteur } from '../api.js';
import { resultatMemorise, profilMemorise, ecrire as ecrireSession } from '../session.js';
import { decoder } from '../lien.js';
import { POUSSES, POUSSES_HAUTEUR } from '../illustrations.js';
import { $, $$, el, texte, vider, signalerModeDemo, evenement, typographierPage } from './commun.js';

/** En dessous de cette largeur, les étiquettes de l'illustration passent en HTML. */
const ETROIT = '(max-width: 899px)';

// ------------------------------------------------------------- illustration

/**
 * Insère le SVG des pousses et règle ses étiquettes selon la largeur.
 * Sous 900px, les étiquettes internes laissent la place à des pastilles HTML,
 * lisibles à cette taille, et le viewBox se raccourcit pour ne pas laisser de
 * bande vide.
 */
function installerPousses(contenu) {
  const hote = $('[data-pousses]');
  if (!hote) return;
  hote.innerHTML = POUSSES;

  const svg = hote.querySelector('svg');
  if (svg) svg.setAttribute('aria-label', contenu.accueil.illustration);

  const nuancier = $('[data-nuancier]');
  vider(nuancier);
  contenu.niveaux
    .slice()
    .sort((a, b) => a.valeur - b.valeur)   // de À semer à Bien enraciné
    .forEach((n) => {
      nuancier.appendChild(el('span', { classe: `pastille pastille--${n.cle}`, texte: n.nom }));
    });

  const etroit = window.matchMedia(ETROIT);
  const ajuster = () => {
    if (!svg) return;
    const hauteur = etroit.matches
      ? POUSSES_HAUTEUR.sansEtiquettes
      : POUSSES_HAUTEUR.avecEtiquettes;
    svg.setAttribute('viewBox', `0 0 520 ${hauteur}`);
    svg.setAttribute('height', String(hauteur));
  };
  ajuster();
  if (etroit.addEventListener) etroit.addEventListener('change', ajuster);
}

// ------------------------------------------------------------------ sections

function remplirHaut(a) {
  texte($('[data-badge]'), a.badge);
  texte($('[data-titre]'), a.titre);
  texte($('[data-texte]'), a.texte);
  texte($('[data-compteur-texte]'), a.compteur);
  $$('[data-bouton]').forEach((b) => texte(b, a.bouton));

  // Trois repères, chacun avec sa coche : en une seule ligne grise sous le
  // bouton, ils se lisaient comme une mention légale et passaient inaperçus.
  const reperes = $('[data-reperes]');
  // Un contenu plus ancien que ce script n'a pas ces textes : le CDN peut
  // servir l'ancien contenu.json quelques minutes après une mise en ligne.
  // Sans ce garde-fou, l'erreur interrompait le démarrage et la page restait
  // à moitié construite.
  if (!reperes || !Array.isArray(a.reperes)) return;
  vider(reperes);
  a.reperes.forEach((r) => {
    reperes.appendChild(
      el('li', { classe: 'repere' }, [
        el('span', { classe: 'repere__coche', attrs: { 'aria-hidden': 'true' } }),
        r,
      ])
    );
  });
}

function remplirPourquoi(contenu) {
  const a = contenu.accueil;

  texte($('[data-pour-vous-surtitre]'), a.pour_vous.surtitre);
  texte($('[data-pour-vous-titre]'), a.pour_vous.titre);

  const liste = $('[data-pour-vous-lignes]');
  vider(liste);
  a.pour_vous.lignes.forEach((ligne) => {
    const niveau = contenu.niveaux.find((n) => n.cle === ligne.niveau);
    liste.appendChild(
      el('li', {}, [
        el('span', {
          classe: 'pourquoi__puce',
          style: { background: niveau ? niveau.hex : 'var(--sauge)' },
          attrs: { 'aria-hidden': 'true' },
        }),
        el('span', { texte: ligne.texte }),
      ])
    );
  });

  texte($('[data-pour-greatly-surtitre]'), a.pour_greatly.surtitre);
  texte($('[data-pour-greatly-titre]'), a.pour_greatly.titre);
  texte($('[data-pour-greatly-texte]'), a.pour_greatly.texte);

  const source = $('[data-pour-greatly-source]');
  vider(source);
  const s = a.pour_greatly.source;
  source.appendChild(document.createTextNode(s.avant));
  source.appendChild(el('a', { texte: s.lien, attrs: { href: s.ancre } }));
  source.appendChild(document.createTextNode(s.apres));
}

function remplirRecevez(contenu) {
  const a = contenu.accueil;
  texte($('[data-resultat-surtitre]'), a.resultat.surtitre);
  texte($('[data-resultat-titre]'), a.resultat.titre);

  const hote = $('[data-points]');
  vider(hote);
  a.resultat.points.forEach((point) => {
    hote.appendChild(
      el('div', { classe: 'point' }, [
        el('span', { classe: 'point__numero serif', texte: point.numero }),
        el('div', { classe: 'point__corps' }, [
          el('h3', { classe: 'point__titre serif', texte: point.titre }),
          el('p', { classe: 'point__texte', texte: point.texte }),
        ]),
      ])
    );
  });
}

function remplirApercu(contenu) {
  const a = contenu.accueil.apercu;
  texte($('[data-apercu-titre]'), a.titre);
  texte($('[data-apercu-mention]'), a.mention);
  texte($('[data-apercu-pied]'), a.pied);

  const hote = $('[data-apercu]');
  vider(hote);
  a.exemples.forEach(({ dimension, niveau }) => {
    const d = contenu.dimensions.find((x) => x.cle === dimension);
    const n = contenu.niveaux.find((x) => x.cle === niveau);
    if (!d || !n) return;
    hote.appendChild(
      el('div', { classe: 'apercu__ligne' }, [
        el('span', { texte: d.nom }),
        el('span', { classe: `pastille pastille--${n.cle}`, texte: n.nom }),
      ])
    );
  });
}

function remplirSources(contenu) {
  const s = contenu.accueil.sources;
  texte($('[data-sources-titre]'), s.titre);
  texte($('[data-sources-texte]'), s.texte);
  texte($('[data-sources-mention]'), s.mention);

  const liens = $('[data-sources-liens]');
  vider(liens);
  s.liens.forEach((lien) => {
    liens.appendChild(el('li', {}, [el('a', { texte: lien.libelle, attrs: { href: lien.url } })]));
  });

  const hote = $('[data-dimensions]');
  vider(hote);
  contenu.dimensions.forEach((d) => {
    hote.appendChild(el('div', { classe: 'carte', texte: d.nom }));
  });
}

/**
 * Affiche le nombre de participants, une fois connu.
 *
 * Le chiffre n'est écrit nulle part dans le HTML : tant que l'API n'a pas
 * répondu, le compteur reste transparent. Autrement la valeur de repli
 * s'affichait le temps de l'appel, puis sautait au vrai chiffre à chaque
 * rechargement.
 */
/**
 * Propose l'état des lieux déjà fait sur cet appareil.
 *
 * Sans ça, revenir sur le site donnait l'impression qu'il fallait tout
 * recommencer : le résultat existait pourtant, mais rien ne le disait. Les deux
 * actions possibles sont offertes côte à côte, avec le même poids : revoir son
 * état des lieux, ou revenir sur ses réponses.
 */
function proposerResultatConnu(contenu) {
  const a = contenu.accueil;
  const d = a.deja_fait;

  // Un contenu plus ancien que ce script n'a pas encore ces textes : le CDN
  // peut servir l'ancien contenu.json quelques minutes après une mise en ligne.
  // Sans ce garde-fou, le bouton s'affichait vide. Mieux vaut l'accueil normal
  // qu'un bouton sans libellé.
  if (!d || !d.modifier || !d.voir || !d.profil) return;

  const adresse = resultatMemorise();
  if (!adresse) return;

  // Les réponses sont dans le lien, pas dans la mémoire de l'onglet : elles
  // survivent donc à la fermeture du navigateur.
  const lu = decoder(new URL(adresse, location.href).hash, contenu);
  if (!lu) return;

  const ligne = $('[data-deja-fait]');
  if (ligne) {
    texte(ligne, d.texte);
    ligne.hidden = false;
  }

  $$('[data-bouton]').forEach((bouton) => {
    // Le bouton principal ne promet plus un premier état des lieux.
    texte(bouton, d.modifier);
    bouton.removeAttribute('href');
    bouton.setAttribute('role', 'button');
    bouton.setAttribute('tabindex', '0');
    const modifier = () => {
      ecrireSession({ role: lu.role, reponses: lu.reponses, relances: lu.relances });
      location.href = 'questions.html';
    };
    bouton.addEventListener('click', modifier);
    bouton.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); modifier(); }
    });

    // Le même bouton, juste à côté, pour aller droit au résultat.
    const voir = el('a', { classe: 'btn', texte: d.voir, attrs: { href: adresse } });
    bouton.insertAdjacentElement('afterend', voir);

    // Et la première partie, le profil, qu'on ne pouvait pas reprendre.
    const memoire = profilMemorise();
    if (memoire) {
      const profil = el('a', { classe: 'btn btn--doux', texte: d.profil, attrs: { href: 'profil.html' } });
      profil.addEventListener('click', (e) => {
        e.preventDefault();
        ecrireSession({
          role: memoire.role || lu.role,
          profil: memoire.profil,
          reponses: lu.reponses,
          relances: lu.relances,
        });
        location.href = 'profil.html';
      });
      voir.insertAdjacentElement('afterend', profil);
    }
  });
}

async function afficherCompteur() {
  const cible = $('[data-compteur]');
  if (!cible) return;
  texte(cible, String(await compteur()));
  const bloc = cible.closest('.compteur');
  if (bloc) bloc.classList.add('compteur--pret');
}

// ---------------------------------------------------------------- démarrage

async function demarrer() {
  signalerModeDemo();

  // On ne touche pas au parcours en cours : revenir en arrière doit conserver
  // les réponses déjà données.
  evenement('visite');

  const contenu = await chargerContenu();
  remplirHaut(contenu.accueil);
  proposerResultatConnu(contenu);
  installerPousses(contenu);
  remplirPourquoi(contenu);
  remplirRecevez(contenu);
  remplirApercu(contenu);
  remplirSources(contenu);
  texte($('[data-pied]'), contenu.accueil.pied);
  typographierPage();

  afficherCompteur();
}

demarrer();
