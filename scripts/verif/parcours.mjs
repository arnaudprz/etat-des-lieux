/**
 * Parcourt le site de bout en bout dans plusieurs navigateurs et plusieurs
 * formats, capture chaque écran et vérifie ce qui doit l'être.
 *
 * Arnaud teste dans Safari : WebKit fait donc partie des cibles, en ordinateur
 * et en iPhone émulé. Plusieurs écarts ne se voient que là.
 *
 * Usage : node scripts/verif/parcours.mjs [URL_DE_BASE] [DOSSIER_DE_SORTIE] [CIBLE]
 *   CIBLE filtre par nom, par exemple « webkit ».
 */

import { chromium, webkit, devices } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.argv[2] || 'http://127.0.0.1:8127';

/**
 * Ouvre une page et attend qu'elle soit stable.
 *
 * `networkidle` seul ne se produit jamais contre le site en ligne : l'appel à
 * l'API Apps Script est lent et garde le réseau occupé, si bien que la
 * vérification expirait. Mais s'en passer mesure des pages à moitié peintes,
 * et les contrôles remontent alors des défauts imaginaires, différents à
 * chaque passage. On attend donc le calme réseau, sans en faire une condition :
 * passé le délai, on continue.
 */
async function aller(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
}

/**
 * Attend que toutes les images de la page aient fini de charger.
 *
 * Contre le site en ligne, elles arrivent plus tard qu'en local : les contrôles
 * les jugeaient « non chargées » alors qu'elles l'étaient une seconde après.
 * Le reproche changeait à chaque passage, le médaillon ici, une pousse là.
 * On ne conclut donc qu'une fois le chargement terminé, ou le délai écoulé.
 */
async function attendreLesImages(page) {
  await page
    .waitForFunction(
      () => Array.from(document.images).every((i) => i.complete),
      null,
      { timeout: 15000 }
    )
    .catch(() => {});
}

/**
 * Vrai si la page est toujours sur `page.html`, quel que soit le préfixe du site.
 * En local le site est à la racine, sur GitHub Pages il vit sous /etat-des-lieux/ :
 * comparer à un chemin absolu en dur ferait échouer la vérification en ligne.
 */
function surLaPage(url, page) {
  return new URL(url).pathname === new URL(`${BASE}/${page}`).pathname;
}
const SORTIE = process.argv[3] || '/tmp/edl-captures';
const FILTRE = process.argv[4] || '';

/** Les cibles. Le suffixe sert à nommer les captures et les messages. */
const CIBLES = [
  {
    nom: 'chromium', suffixe: '', lanceur: chromium,
    options: { viewport: { width: 1280, height: 900 }, locale: 'fr-FR' },
  },
  {
    nom: 'chromium-mobile', suffixe: '-mobile', lanceur: chromium,
    options: { viewport: { width: 390, height: 844 }, locale: 'fr-FR' },
  },
  {
    nom: 'webkit', suffixe: '', lanceur: webkit,
    options: { viewport: { width: 1280, height: 900 }, locale: 'fr-FR' },
  },
  {
    nom: 'webkit-mobile', suffixe: '-mobile', lanceur: webkit,
    options: { ...devices['iPhone 13'], locale: 'fr-FR' },
  },
].filter((c) => !FILTRE || c.nom.includes(FILTRE));

/** Le préréglage « Exemple de la maquette » du simulateur. */
const REPONSES = [2, 2, 1, 1, 2, 2, 0, 0, 2, 3, 2, 2, 2, 2, 2, 1];
/** La partie « réponses » du lien. Les idées cochées s'y ajoutent ensuite. */
const HASH_BASE = '#v2-m2211220023222221';

const soucis = [];
let capturesPrises = 0;

// ------------------------------------------------------------------ outillage

function surveiller(page, etiquette) {
  page.on('console', (m) => {
    if (m.type() === 'error') soucis.push(`[${etiquette}] console : ${m.text()}`);
  });
  page.on('pageerror', (e) => soucis.push(`[${etiquette}] erreur JS : ${e.message}`));
  page.on('requestfailed', (r) => {
    // Les polices Google peuvent échouer hors ligne : ce n'est pas bloquant.
    if (r.url().includes('fonts.g')) return;
    // Le backend est simulé par repondreALaPlaceDuBackend().
    if (/script\.google(usercontent)?\.com/.test(r.url())) return;
    // Le rechargement déclenché par un changement de hash peut être annulé par
    // la navigation suivante du test : c'est un artefact du test, pas un défaut.
    const raison = r.failure() ? r.failure().errorText : '';
    if (r.resourceType() === 'document' && /aborted|cancel|interrupted/i.test(raison)) return;
    soucis.push(`[${etiquette}] requête échouée : ${r.url()} (${raison})`);
  });
}

async function verifierLargeurUtile(page, etiquette) {
  const debord = await page.evaluate(() =>
    Math.max(0, document.documentElement.scrollWidth - window.innerWidth));
  if (debord > 1) soucis.push(`[${etiquette}] défilement horizontal de ${debord}px`);
}

async function verifierTirets(page, etiquette) {
  const trouve = await page.evaluate(() => {
    const m = document.body.innerText.match(/[^\n]{0,40}[—–][^\n]{0,40}/g);
    return m ? m.slice(0, 3) : null;
  });
  if (trouve) soucis.push(`[${etiquette}] tiret cadratin : ${trouve.join(' | ')}`);
}

async function verifierAucunChiffre(page, etiquette, selecteur) {
  const texte = await page.locator(selecteur).innerText();
  const chiffres = texte.match(/\d/g);
  if (chiffres) {
    soucis.push(`[${etiquette}] des chiffres apparaissent : ${[...new Set(chiffres)].join('')}`);
  }
}

// ------------------------------------------------------------------ parcours

/** Remplit le profil et passe aux affirmations. Version membre. */
/**
 * Répond à la place du backend.
 *
 * Depuis que `API_URL` est renseignée, le parcours envoie de vraies réponses, et
 * la vérification le remplit jusqu'au bout sur quatre cibles : sans ce
 * garde-fou, chaque passage écrirait quatre lignes dans le classeur de
 * production. Passer par `?demo=1` ne suffit pas, le paramètre se perd d'une
 * page à l'autre ; on intercepte donc au niveau du réseau, ce qui vaut aussi
 * quand la vérification vise le site en ligne.
 *
 * On répond au lieu de couper : une requête avortée remplit la console
 * d'erreurs, qu'un autre contrôle signalerait à juste titre.
 */
async function repondreALaPlaceDuBackend(page) {
  await page.route(/script\.google(usercontent)?\.com/, (route) => {
    const url = route.request().url();
    let corps = { ok: true };
    if (url.includes('action=compteur')) corps = { ok: true, total: 255 };
    if (url.includes('action=agregats')) corps = { ok: true, ensemble: null, segments: {} };
    return route.fulfill({
      status: 200,
      contentType: 'application/json; charset=utf-8',
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(corps),
    });
  });
}

async function remplirProfil(page) {
  await page.waitForSelector('.pilules');
  await page.locator('input[name="role"]').nth(1).check();
  await page.locator('input[name="genre"]').nth(0).check();
  await page.locator('input[name="taille_entreprise"]').nth(2).check();
  await page.locator('input[name="taille_equipe"]').nth(1).check();
  await page.fill('#secteur', 'sante');
  await page.waitForSelector('#secteurs li');
  await page.locator('#secteurs .secteurs__choix', { hasText: /^Santé$/ }).click();
}

/**
 * Le parcours résiste-t-il à un contenu plus ancien que le script ?
 *
 * Après une mise en ligne, le CDN peut servir l'ancien contenu.json avec le
 * nouveau JavaScript. Une clé manquante levait alors une erreur qui
 * interrompait le démarrage : le formulaire du profil n'était jamais
 * construit, et la page affichait une carte blanche vide. L'essentiel ne doit
 * jamais dépendre d'un texte décoratif.
 */
async function verifierResultatImmediat(navigateur, options, soucis) {
  // Le résultat se calcule dans le navigateur : rien ne justifie d'attendre le
  // serveur avant de l'afficher. L'enregistrement part en tâche de fond.
  const contexte = await navigateur.newContext(options);
  const page = await contexte.newPage();

  // Un backend volontairement lent : si l'affichage l'attend, ça se verra.
  await page.route(/script\.google(usercontent)?\.com/, async (route) => {
    await new Promise((r) => setTimeout(r, 4000));
    return route.fulfill({
      status: 200,
      contentType: 'application/json; charset=utf-8',
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ ok: true, total: 255 }),
    });
  });

  await aller(page, `${BASE}/profil.html`);
  await remplirProfil(page);
  await page.locator('[data-continuer]').click();
  await page.waitForSelector('.affirmation', { timeout: 20000 });
  const n = await page.locator('.affirmation').count();
  for (let i = 0; i < n; i++) {
    await page.locator('.affirmation').nth(i).locator('.echelle__choix').nth(2).click();
  }
  const depart = Date.now();
  await page.locator('[data-voir]').click();
  await page.waitForURL(/resultat\.html/, { timeout: 25000 }).catch(() => {});
  const attente = Date.now() - depart;
  if (attente > 2000) {
    soucis.push(`resultat : ${Math.round(attente / 100) / 10}s d'attente avant l'affichage, le backend est attendu pour rien`);
  }
  await contexte.close();
}

async function verifierContenuPerime(navigateur, options, soucis) {
  const cles = ['reperes', 'compteur', 'deja_fait', 'mentions'];
  const contexte = await navigateur.newContext(options);
  const page = await contexte.newPage();
  await repondreALaPlaceDuBackend(page);

  for (const cle of cles) {
    await page.unroute('**/contenu.json*').catch(() => {});
    await page.route('**/contenu.json*', async (route) => {
      const reponse = await route.fetch();
      const json = await reponse.json();
      delete json.accueil[cle];
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(json),
      });
    });

    await aller(page, `${BASE}/profil.html`);
    await page.waitForTimeout(1200);
    const champs = await page.locator('#profil .champ').count();
    if (champs === 0) {
      soucis.push(`contenu périmé : sans accueil.${cle}, le formulaire du profil ne se construit pas`);
    }

    await aller(page, `${BASE}/index.html`);
    await page.waitForTimeout(1200);
    const cartes = await page.locator('.dimensions > *').count();
    if (cartes === 0) {
      soucis.push(`contenu périmé : sans accueil.${cle}, l'accueil ne se construit pas`);
    }
  }
  await contexte.close();
}

async function passerLaCible(cible) {
  const { nom, suffixe, lanceur, options } = cible;
  const largeur = options.viewport ? options.viewport.width : 390;
  const dossier = `${SORTIE}/${nom}`;
  mkdirSync(dossier, { recursive: true });

  const capturer = async (fichier, etiquette) => {
    await page.waitForTimeout(350);
    await verifierLargeurUtile(page, etiquette);
    await page.screenshot({ path: `${dossier}/${fichier}.png`, fullPage: true });
    capturesPrises += 1;
  };

  const navigateur = await lanceur.launch();
  const contexte = await navigateur.newContext(options);
  const page = await contexte.newPage();
  await repondreALaPlaceDuBackend(page);
  surveiller(page, nom);

  // ------------------------------------------------------------- 1. accueil
  await aller(page, `${BASE}/index.html`);
  await page.waitForSelector('.dimensions > *');

  const nbDimensions = await page.locator('.dimensions > *').count();
  if (nbDimensions !== 8) soucis.push(`[${nom}] accueil : ${nbDimensions} dimensions au lieu de 8`);
  // Aucun bouton ni lien d'action ne doit rester sans libellé : c'est le
  // symptôme d'un texte manquant dans contenu.json, et ça passe inaperçu tant
  // qu'on ne regarde pas la page dans le bon état.
  const vides = await page.evaluate(() =>
    [...document.querySelectorAll('.btn, .bouton-doux, button')]
      .filter((b) => b.offsetParent !== null && b.textContent.trim() === '')
      .map((b) => b.className || b.tagName));
  if (vides.length) {
    soucis.push(`[${nom}] accueil : ${vides.length} bouton(s) sans libellé : ${vides.join(', ')}`);
  }

  // Deux actions voisines ne doivent ni se toucher ni se chevaucher : sans
  // `gap`, elles se lisaient comme un seul bloc.
  const colles = await page.evaluate(() => {
    const groupes = [...document.querySelectorAll('.appel, .hero__actions, .resultat__actions')];
    const ennuis = [];
    groupes.forEach((g) => {
      const b = [...g.querySelectorAll('.btn, .bouton-doux')].filter((x) => x.offsetParent !== null);
      for (let i = 1; i < b.length; i++) {
        const a = b[i - 1].getBoundingClientRect();
        const c = b[i].getBoundingClientRect();
        const memeLigne = Math.abs(a.top - c.top) < 4;
        const ecart = memeLigne ? c.left - a.right : c.top - a.bottom;
        if (ecart < 8) ennuis.push(`${g.className} : ${Math.round(ecart)}px`);
      }
    });
    return ennuis;
  });
  if (colles.length) {
    soucis.push(`[${nom}] accueil : boutons trop serrés (${colles.join(', ')})`);
  }

  const compteur = (await page.locator('[data-compteur]').innerText()).trim();
  if (compteur !== '255') soucis.push(`[${nom}] accueil : compteur à « ${compteur} » au lieu de 255`);

  // Le chiffre ne doit jamais être écrit dans le HTML servi : sinon il
  // s'affiche avant la réponse de l'API, puis saute à la vraie valeur.
  const htmlServi = await (await fetch(`${BASE}/index.html`)).text();
  if (/data-compteur[^>]*>\s*\d/.test(htmlServi)) {
    soucis.push(`[${nom}] accueil : un nombre est codé en dur dans le compteur du HTML`);
  }
  // Et il n'est révélé qu'une fois connu.
  const compteurPret = await page.evaluate(() => {
    const b = document.querySelector('.compteur');
    return b ? { pret: b.classList.contains('compteur--pret'), opacite: getComputedStyle(b).opacity } : null;
  });
  if (!compteurPret || !compteurPret.pret) {
    soucis.push(`[${nom}] accueil : le compteur n'est pas marqué prêt`);
  } else if (Number(compteurPret.opacite) < 1) {
    soucis.push(`[${nom}] accueil : compteur prêt mais à l'opacité ${compteurPret.opacite}`);
  }

  // L'illustration est en SVG dans la page, pas en image.
  const illustration = await page.evaluate(() => {
    const svg = document.querySelector('.hero__illustration svg');
    if (!svg) return null;
    const etiquettes = svg.querySelector('.pousses__etiquettes');
    return {
      etiquette: svg.getAttribute('aria-label') || '',
      viewBox: svg.getAttribute('viewBox'),
      etiquettesMasquees: etiquettes ? getComputedStyle(etiquettes).display === 'none' : null,
      // L'illustration doit rester en SVG : aucune image bitmap dans le haut
      // de page. Le bloc Greatly y vit désormais aussi, et sa photo est
      // légitime : on ne compte donc que les images hors de ce bloc.
      images: document.querySelectorAll('.hero img:not(.greatly img)').length,
    };
  });
  if (!illustration) {
    soucis.push(`[${nom}] accueil : pas d'illustration en SVG`);
  } else {
    if (!illustration.etiquette.startsWith('Quatre pousses')) {
      soucis.push(`[${nom}] accueil : l'illustration n'a pas son aria-label`);
    }
    if (illustration.images > 0) {
      soucis.push(`[${nom}] accueil : ${illustration.images} image(s) bitmap dans le haut de page, hors bloc Greatly`);
    }
    const etroit = largeur < 900;
    const hauteurAttendue = etroit ? 360 : 420;
    if (illustration.viewBox !== `0 0 520 ${hauteurAttendue}`) {
      soucis.push(`[${nom}] accueil : viewBox ${illustration.viewBox}, attendu 0 0 520 ${hauteurAttendue}`);
    }
    if (illustration.etiquettesMasquees !== etroit) {
      soucis.push(`[${nom}] accueil : étiquettes du SVG ${illustration.etiquettesMasquees ? 'masquées' : 'visibles'} à ${largeur}px`);
    }
  }

  // Les 4 pastilles de niveau tiennent sur une ligne sur mobile.
  if (largeur < 900) {
    const pastilles = await page.evaluate(() => {
      const ps = Array.from(document.querySelectorAll('.nuancier .pastille'));
      return { nombre: ps.length, lignes: new Set(ps.map((x) => Math.round(x.getBoundingClientRect().top))).size };
    });
    if (pastilles.nombre !== 4) soucis.push(`[${nom}] accueil : ${pastilles.nombre} pastilles au lieu de 4`);
    if (pastilles.lignes !== 1) soucis.push(`[${nom}] accueil : les pastilles tiennent sur ${pastilles.lignes} lignes`);
  }

  // L'ordre de la page, et sur ordinateur le premier écran complet.
  const structure = await page.evaluate(() => {
    const ordre = Array.from(document.querySelectorAll(
      '.hero__texte .badge, .hero__titre, .hero__intro, .hero__actions, .reperes, .hero__illustration'
    )).map((x) => x.className.split(' ')[0] || x.tagName.toLowerCase());
    const dansEcran = (sel) => {
      const n = document.querySelector(sel);
      return n ? n.getBoundingClientRect().bottom <= window.innerHeight : false;
    };
    return {
      ordre,
      cartesPourquoi: document.querySelectorAll('.pourquoi__carte').length,
      points: document.querySelectorAll('.point').length,
      titreDansEcran: dansEcran('.hero__titre'),
      texteDansEcran: dansEcran('.hero__intro'),
      boutonDansEcran: dansEcran('.hero__actions'),
      illustrationDansEcran: dansEcran('.hero__illustration svg'),
    };
  });
  if (structure.cartesPourquoi !== 2) {
    soucis.push(`[${nom}] accueil : ${structure.cartesPourquoi} cartes « pourquoi » au lieu de 2`);
  }
  if (structure.points !== 4) {
    soucis.push(`[${nom}] accueil : ${structure.points} points numérotés au lieu de 4`);
  }
  const ordreAttendu = ['badge', 'hero__titre', 'hero__intro', 'hero__actions', 'reperes', 'hero__illustration'];
  if (JSON.stringify(structure.ordre) !== JSON.stringify(ordreAttendu)) {
    soucis.push(`[${nom}] accueil : ordre ${structure.ordre.join(' > ')}`);
  }
  if (largeur >= 900) {
    const manque = Object.entries({
      titre: structure.titreDansEcran,
      texte: structure.texteDansEcran,
      bouton: structure.boutonDansEcran,
      illustration: structure.illustrationDansEcran,
    }).filter(([, ok]) => !ok).map(([quoi]) => quoi);
    if (manque.length > 0) {
      soucis.push(`[${nom}] accueil : hors du premier écran en ${largeur}x800 : ${manque.join(', ')}`);
    }
  } else if (!structure.boutonDansEcran) {
    soucis.push(`[${nom}] accueil : le bouton n'est pas visible sans défiler`);
  }

  // Aucun texte de l'accueil ne s'adresse au visiteur en disant « votre équipe ».
  const votreEquipe = await page.evaluate(() =>
    Array.from(document.querySelectorAll('main .hero, main .pourquoi, main .recevez'))
      .map((s) => s.innerText)
      .join(' ')
      .includes('votre équipe'));
  if (votreEquipe) soucis.push(`[${nom}] accueil : un texte dit « votre équipe »`);

  const ecartApercu = await page.evaluate(() => {
    const l = document.querySelectorAll('.apercu__ligne');
    return Math.round(l[1].getBoundingClientRect().top - l[0].getBoundingClientRect().bottom);
  });
  const ecartApercuAttendu = largeur >= 900 ? 20 : 16;
  if (ecartApercu !== ecartApercuAttendu) {
    soucis.push(`[${nom}] accueil : ${ecartApercu}px entre les lignes de l'aperçu au lieu de ${ecartApercuAttendu}`);
  }

  // Le bandeau de démo ne doit pas voler le haut de page hors mode explicite.
  const demo = await page.evaluate(() => {
    const n = document.querySelector('.demo');
    if (!n) return null;
    return { enHaut: n === document.body.firstElementChild, enPied: n.classList.contains('demo--pied') };
  });
  if (demo && demo.enHaut) {
    soucis.push(`[${nom}] accueil : le bandeau de démo occupe le haut de page sans ?demo=1`);
  }
  if (demo && !demo.enPied) {
    soucis.push(`[${nom}] accueil : le bandeau de démo n'est pas en pied de page`);
  }

  // Icône et aperçu des réseaux.
  const metas = await page.evaluate(() => ({
    icone: document.querySelector('link[rel="icon"]')?.getAttribute('href') || null,
    ecranAccueil: document.querySelector('link[rel="apple-touch-icon"]')?.getAttribute('href') || null,
    image: document.querySelector('meta[property="og:image"]')?.getAttribute('content') || '',
    url: document.querySelector('meta[property="og:url"]')?.getAttribute('content') || '',
    carte: document.querySelector('meta[name="twitter:card"]')?.getAttribute('content') || '',
    titre: document.querySelector('meta[property="og:title"]')?.getAttribute('content') || '',
  }));
  // Les trois repères de réassurance, chacun avec sa coche.
  const reperes = await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('.repere'));
    return {
      nombre: items.length,
      textes: items.map((i) => i.textContent.trim()),
      coches: items.filter((i) => i.querySelector('.repere__coche')).length,
    };
  });
  if (reperes.nombre !== 3) soucis.push(`[${nom}] accueil : ${reperes.nombre} repères au lieu de 3`);
  if (reperes.coches !== 3) soucis.push(`[${nom}] accueil : ${reperes.coches} coches au lieu de 3`);
  if (reperes.textes[0] !== 'Anonyme') {
    soucis.push(`[${nom}] accueil : premier repère « ${reperes.textes[0] || ''} »`);
  }

  if (!metas.icone) soucis.push(`[${nom}] accueil : pas de favicon`);
  if (!metas.ecranAccueil) soucis.push(`[${nom}] accueil : pas d'icône d'écran d'accueil`);
  if (!metas.image.startsWith('http') || !metas.image.endsWith('.png')) {
    soucis.push(`[${nom}] accueil : og:image « ${metas.image} » n'est pas un PNG en adresse absolue`);
  }
  if (!metas.url.startsWith('http')) soucis.push(`[${nom}] accueil : og:url manquant`);
  if (metas.carte !== 'summary_large_image') soucis.push(`[${nom}] accueil : twitter:card manquant`);
  if (metas.titre !== 'Ce qui vous aide à bien travailler ensemble') {
    soucis.push(`[${nom}] accueil : og:title « ${metas.titre} » ne suit pas le titre`);
  }

  await verifierTirets(page, `${nom} accueil`);
  await capturer(`Main${suffixe}`, `${nom} accueil`);

  // -------------------------------------------------------------- 2. profil
  await page.click('.hero__actions a.btn');
  await page.waitForSelector('.pilules');

  // Aucune pastille de taille ne doit passer sur 2 lignes.
  const pastillesLongues = await page.evaluate(() =>
    Array.from(document.querySelectorAll(
      '[data-champ="taille_entreprise"] .pilule, [data-champ="taille_equipe"] .pilule'
    ))
      .map((p) => {
        // On mesure le texte lui-même : la pastille a une hauteur minimale de
        // 46px qui ne dit rien du nombre de lignes.
        const libelle = p.querySelector('.pilule__libelle');
        const lignes = libelle ? libelle.getClientRects().length : 0;
        return { texte: p.innerText.trim(), lignes };
      })
      .filter((p) => p.lignes > 1));
  if (pastillesLongues.length > 0) {
    soucis.push(`[${nom}] profil : pastilles sur 2 lignes : ${pastillesLongues.map((p) => p.texte).join(', ')}`);
  }

  // Les trois écarts doivent être identiques dans Chromium et WebKit.
  const ecarts = await page.evaluate(() => {
    const bloc = document.querySelectorAll('.champ')[2];
    const intitule = bloc.querySelector('.champ__intitule');
    const choix = bloc.querySelector('.pilules');
    const pilules = choix.querySelectorAll('.pilule');
    const blocs = document.querySelectorAll('#profil > *');

    // Deux pastilles voisines sur la même ligne, pour mesurer l'écart.
    let entrePilules = null;
    for (let i = 1; i < pilules.length; i += 1) {
      const a = pilules[i - 1].getBoundingClientRect();
      const b = pilules[i].getBoundingClientRect();
      if (Math.abs(a.top - b.top) < 2) { entrePilules = Math.round(b.left - a.right); break; }
    }

    return {
      sousIntitule: Math.round(choix.getBoundingClientRect().top - intitule.getBoundingClientRect().bottom),
      entreBlocs: Math.round(blocs[1].getBoundingClientRect().top - blocs[0].getBoundingClientRect().bottom),
      entrePilules,
      colonnesTaille: new Set(
        Array.from(document.querySelectorAll('[data-champ="taille_entreprise"] .pilule'))
          .map((x) => Math.round(x.getBoundingClientRect().left))
      ).size,
    };
  });
  if (ecarts.sousIntitule !== 12) {
    soucis.push(`[${nom}] profil : ${ecarts.sousIntitule}px sous l'intitulé au lieu de 12`);
  }
  if (ecarts.entreBlocs !== 32) {
    soucis.push(`[${nom}] profil : ${ecarts.entreBlocs}px entre deux blocs au lieu de 32`);
  }
  if (ecarts.entrePilules !== 8) {
    soucis.push(`[${nom}] profil : ${ecarts.entrePilules}px entre deux pastilles au lieu de 8`);
  }
  if (largeur < 900 && ecarts.colonnesTaille !== 2) {
    soucis.push(`[${nom}] profil : les tailles d'entreprise tiennent sur ${ecarts.colonnesTaille} colonnes au lieu de 2`);
  }

  // Plus de <legend> : il sortait du flux et cassait la mise en page dans WebKit.
  const restesDeLegend = await page.evaluate(() =>
    document.querySelectorAll('#profil legend, #profil fieldset').length);
  if (restesDeLegend > 0) {
    soucis.push(`[${nom}] profil : ${restesDeLegend} fieldset ou legend subsistent`);
  }

  // « Continuer » reste cliquable et explique ce qui manque.
  const continuer = page.locator('[data-continuer]');
  if (await continuer.isDisabled()) {
    soucis.push(`[${nom}] profil : « Continuer » est inactif au lieu d'expliquer`);
  } else {
    await continuer.click();
    await page.waitForTimeout(400);
    const avertissement = (await page.locator('#message').innerText()).trim();
    if (!avertissement.startsWith('Il reste à choisir')) {
      soucis.push(`[${nom}] profil : message inattendu « ${avertissement} »`);
    }
    const misEnEvidence = await page.locator('.champ--manquant').count();
    if (misEnEvidence !== 4) {
      soucis.push(`[${nom}] profil : ${misEnEvidence} champs mis en évidence au lieu de 4`);
    }
    const premierVisible = await page.locator('[data-champ="role"]').isVisible();
    if (!premierVisible) soucis.push(`[${nom}] profil : le premier champ manquant n'est pas amené à l'écran`);
    if (!surLaPage(page.url(), 'profil.html')) {
      soucis.push(`[${nom}] profil : « Continuer » avance malgré les manques`);
    }
  }

  // La liste des secteurs vit dans le flux, jamais par-dessus la suite.
  const listeVisibleAuDepart = await page.locator('#secteurs').isVisible();
  if (!listeVisibleAuDepart) soucis.push(`[${nom}] secteurs : la liste n'est pas visible d'emblée`);

  const enSurimpression = await page.evaluate(() => {
    const l = document.querySelector('#secteurs');
    const position = getComputedStyle(l).position;
    const apres = document.querySelector('[data-champ="taille_equipe"]');
    const recouvre = apres
      && l.getBoundingClientRect().bottom > apres.getBoundingClientRect().top + 1;
    return { position, recouvre };
  });
  if (enSurimpression.position === 'absolute' || enSurimpression.position === 'fixed') {
    soucis.push(`[${nom}] secteurs : la liste est en ${enSurimpression.position}`);
  }
  if (enSurimpression.recouvre) {
    soucis.push(`[${nom}] secteurs : la liste recouvre la question suivante`);
  }

  // Le nombre de colonnes suit la largeur.
  const colonnesSecteurs = await page.evaluate(() => new Set(
    Array.from(document.querySelectorAll('#secteurs .secteurs__ligne'))
      .slice(0, 8)
      .map((x) => Math.round(x.getBoundingClientRect().left))
  ).size);
  const colonnesAttendues = largeur >= 900 ? 2 : 1;
  if (colonnesSecteurs !== colonnesAttendues) {
    soucis.push(`[${nom}] secteurs : ${colonnesSecteurs} colonnes au lieu de ${colonnesAttendues}`);
  }

  // Passe 11 : plus de défilement interne. 8 secteurs, puis « Voir tous les
  // secteurs » qui déplie le reste dans la page.
  const repli = await page.evaluate(() => {
    const l = document.querySelector('#secteurs');
    const voir = document.querySelector('.secteurs__voir-tous');
    return {
      lignes: l.querySelectorAll('.secteurs__ligne').length,
      deborde: l.scrollHeight > l.clientHeight + 1,
      voir: Boolean(voir && voir.getBoundingClientRect().width),
    };
  });
  if (repli.deborde) soucis.push(`[${nom}] secteurs : la liste défile sur elle-même`);
  if (repli.lignes !== 8 || !repli.voir) {
    soucis.push(`[${nom}] secteurs : ${repli.lignes} secteurs repliés, « Voir tous » ${repli.voir ? 'présent' : 'absent'}`);
  }

  // Le placeholder ne doit pas être coupé.
  const placeholderCoupe = await page.evaluate(() => {
    const c = document.querySelector('#secteur');
    const mesure = document.createElement('span');
    const style = getComputedStyle(c);
    mesure.style.cssText = `position:absolute;visibility:hidden;white-space:nowrap;font:${style.font}`;
    mesure.textContent = c.placeholder;
    document.body.appendChild(mesure);
    const large = mesure.getBoundingClientRect().width;
    mesure.remove();
    const utile = c.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    return large > utile;
  });
  if (placeholderCoupe) soucis.push(`[${nom}] secteurs : le texte d'aide est coupé`);

  // La recherche ignore accents et majuscules, et met les lettres en gras.
  await page.fill('#secteur', 'SANTE');
  await page.waitForTimeout(150);
  const propositions = await page.locator('#secteurs .secteurs__choix').allInnerTexts();
  if (!propositions.some((t) => t.includes('Santé'))) {
    soucis.push(`[${nom}] secteurs : « SANTE » ne propose pas « Santé » : ${propositions.join(', ')}`);
  }
  if (!propositions.some((t) => t.includes('Autre'))) {
    soucis.push(`[${nom}] secteurs : « Autre » n'est pas proposé`);
  }
  // Une recherche partielle ne met en gras que les lettres trouvées.
  await page.fill('#secteur', 'san');
  await page.waitForTimeout(150);
  const enGras = await page.locator('#secteurs strong').first().innerText();
  if (enGras !== 'San') {
    soucis.push(`[${nom}] secteurs : « san » met « ${enGras} » en gras au lieu de « San »`);
  }

  // Aucun résultat : le message et le raccourci vers « Autre ».
  await page.fill('#secteur', 'zzzz');
  await page.waitForTimeout(150);
  const vide = await page.locator('.secteurs__vide').count();
  if (vide !== 1) soucis.push(`[${nom}] secteurs : pas de message quand rien ne correspond`);
  if (!(await page.locator('.secteurs__vide button', { hasText: 'Choisir Autre' }).count())) {
    soucis.push(`[${nom}] secteurs : pas de bouton « Choisir Autre »`);
  }

  // Le clavier : flèche puis Entrée.
  await page.fill('#secteur', 'sante');
  await page.waitForTimeout(150);
  await page.locator('#secteur').press('ArrowDown');
  await page.locator('#secteur').press('Enter');
  await page.waitForTimeout(200);
  const retenu = await page.locator('.secteur-choisi__valeur').innerText();
  if (retenu !== 'Santé') soucis.push(`[${nom}] secteurs : le clavier retient « ${retenu} » au lieu de « Santé »`);
  if (await page.locator('#secteurs').isVisible()) {
    soucis.push(`[${nom}] secteurs : la liste reste ouverte après un choix`);
  }

  // « Modifier » rouvre la liste.
  await page.locator('.secteur-choisi button', { hasText: 'Modifier' }).click();
  await page.waitForTimeout(200);
  if (!(await page.locator('#secteurs').isVisible())) {
    soucis.push(`[${nom}] secteurs : « Modifier » ne rouvre pas la liste`);
  }

  await verifierTirets(page, `${nom} profil`);
  await capturer(`Profil${suffixe}`, `${nom} profil`);

  await aller(page, `${BASE}/profil.html`);
  await remplirProfil(page);
  await page.locator('[data-continuer]').click();

  // -------------------------------------------------------- 3. affirmations
  await page.waitForSelector('.affirmation');
  const nbAffirmations = await page.locator('.affirmation').count();
  if (nbAffirmations !== 16) soucis.push(`[${nom}] questions : ${nbAffirmations} affirmations au lieu de 16`);
  const nbGroupes = await page.locator('.groupe').count();
  if (nbGroupes !== 8) soucis.push(`[${nom}] questions : ${nbGroupes} groupes au lieu de 8`);

  // L'échelle tient sur une seule ligne de 4, même sur mobile.
  const echelle = await page.evaluate(() => {
    const boutons = Array.from(document.querySelector('.echelle').children);
    const hauts = new Set(boutons.map((b) => Math.round(b.getBoundingClientRect().top)));
    const largeurs = boutons.map((b) => Math.round(b.getBoundingClientRect().width));
    return {
      lignes: hauts.size,
      nombre: boutons.length,
      hauteur: Math.round(boutons[0].getBoundingClientRect().height),
      largeurEgale: Math.max(...largeurs) - Math.min(...largeurs) <= 1,
      premier: boutons[0].textContent.trim(),
      dernier: boutons[3].textContent.trim(),
    };
  });
  if (echelle.nombre !== 4) soucis.push(`[${nom}] échelle : ${echelle.nombre} réponses au lieu de 4`);
  if (echelle.lignes !== 1) soucis.push(`[${nom}] échelle : ${echelle.lignes} lignes au lieu d'une`);
  if (!echelle.largeurEgale) soucis.push(`[${nom}] échelle : les 4 réponses n'ont pas la même largeur`);
  if (echelle.hauteur < 52) soucis.push(`[${nom}] échelle : hauteur de ${echelle.hauteur}px au lieu de 52`);
  if (echelle.premier !== 'Pas encore' || echelle.dernier !== 'Pleinement') {
    soucis.push(`[${nom}] échelle : ordre inattendu, de « ${echelle.premier} » à « ${echelle.dernier} »`);
  }

  // Aucun libellé ne doit dépasser 2 lignes ni déborder de son bouton.
  const libelles = await page.evaluate(() =>
    Array.from(document.querySelector('.echelle').children).map((b) => {
      const l = b.querySelector('.echelle__libelle');
      const style = getComputedStyle(l);
      const hauteurLigne = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.2;
      return {
        texte: l.textContent,
        lignes: Math.round(l.getBoundingClientRect().height / hauteurLigne),
        deborde: l.scrollWidth > l.clientWidth + 1,
      };
    }));
  libelles.forEach((l) => {
    if (l.lignes > 2) soucis.push(`[${nom}] échelle : « ${l.texte} » sur ${l.lignes} lignes`);
    if (l.deborde) soucis.push(`[${nom}] échelle : « ${l.texte} » déborde de son bouton`);
  });

  // Chaque groupe dit pourquoi on s'y intéresse.
  const engagement = await page.evaluate(() => ({
    groupes: document.querySelectorAll('.groupe').length,
    pourquoi: document.querySelectorAll('.contexte-groupe').length,
    prefixes: Array.from(document.querySelectorAll('.contexte-groupe__prefixe'))
      .every((p) => p.textContent.startsWith('Pourquoi on s')),
    cadre: document.querySelectorAll('[data-cadre] li').length,
    cadreSurLaPage: !!document.querySelector('[data-cadre]')
      && document.querySelector('[data-cadre]').offsetParent !== null,
    miParcours: document.querySelectorAll('.mi-parcours').length,
    // Le bandeau doit se glisser juste après le groupe désigné.
    miParcoursApres: (() => {
      const bandeau = document.querySelector('.mi-parcours');
      if (!bandeau) return null;
      const avant = Array.from(document.querySelectorAll('.groupe')).filter((t) =>
        t.compareDocumentPosition(bandeau) & Node.DOCUMENT_POSITION_FOLLOWING);
      return avant.length ? avant[avant.length - 1].textContent.trim() : null;
    })(),
    promesse: document.querySelector('.avant-resultat__promesse')?.textContent || '',
    mention: document.querySelector('.avant-resultat__mention')?.textContent || '',
  }));
  if (engagement.pourquoi !== engagement.groupes) {
    soucis.push(`[${nom}] questions : ${engagement.pourquoi} lignes « pourquoi » pour ${engagement.groupes} groupes`);
  }
  if (!engagement.prefixes) soucis.push(`[${nom}] questions : un préfixe « Pourquoi on s'y intéresse » manque`);

  // La ligne doit se lire d'un trait : ni grille, ni colonnes.
  const ligneContexte = await page.evaluate(() => {
    const el = document.querySelector('.contexte-groupe');
    if (!el) return null;
    const prefixe = el.querySelector('.contexte-groupe__prefixe');
    return {
      display: getComputedStyle(el).display,
      prefixeDisplay: getComputedStyle(prefixe).display,
      filet: Math.round(parseFloat(getComputedStyle(el).borderLeftWidth)),
      // Avec une grille, le texte repartirait dans une seconde colonne, loin
      // de la fin du préfixe.
      ecartApresPrefixe: Math.round(
        el.getBoundingClientRect().right - prefixe.getBoundingClientRect().right
      ),
      largeur: Math.round(el.getBoundingClientRect().width),
    };
  });
  if (!ligneContexte) {
    soucis.push(`[${nom}] questions : pas de ligne de contexte`);
  } else {
    if (['grid', 'flex', 'inline-grid', 'inline-flex'].includes(ligneContexte.display)) {
      soucis.push(`[${nom}] questions : la ligne de contexte est en ${ligneContexte.display}`);
    }
    if (ligneContexte.filet !== 4) {
      soucis.push(`[${nom}] questions : filet de ${ligneContexte.filet}px au lieu de 4`);
    }
    if (ligneContexte.prefixeDisplay !== 'inline') {
      soucis.push(`[${nom}] questions : le préfixe est en ${ligneContexte.prefixeDisplay} au lieu d'inline`);
    }
  }

  // La graine et l'arbre encadrent la colonne de lecture, pas les bords de l'écran.
  const barreAlignee = await page.evaluate(() => {
    const pousse = document.querySelector('[data-pousse]').getBoundingClientRect();
    const arbre = document.querySelector('[data-but]').getBoundingClientRect();
    const texte = document.querySelector('.titre-page').getBoundingClientRect();
    return {
      ecartGauche: Math.round(texte.left - pousse.left),
      ecartDroite: Math.round(arbre.right - texte.right),
    };
  });
  if (Math.abs(barreAlignee.ecartGauche) > 40 || Math.abs(barreAlignee.ecartDroite) > 40) {
    soucis.push(
      `[${nom}] progression : la barre ne suit pas la colonne de lecture `
      + `(${barreAlignee.ecartGauche}px à gauche, ${barreAlignee.ecartDroite}px à droite)`
    );
  }
  if (engagement.cadre !== 3) soucis.push(`[${nom}] questions : ${engagement.cadre} lignes dans l'encadré au lieu de 3`);
  if (!engagement.cadreSurLaPage) soucis.push(`[${nom}] questions : l'encadré n'est pas sur la page des affirmations`);
  if (engagement.miParcours !== 1) soucis.push(`[${nom}] questions : ${engagement.miParcours} bandeau de mi-parcours`);
  if (engagement.miParcoursApres !== "Comment l'info circule") {
    soucis.push(`[${nom}] questions : mi-parcours après « ${engagement.miParcoursApres} »`);
  }
  if (!engagement.promesse.startsWith('Dans un instant')) {
    soucis.push(`[${nom}] questions : promesse inattendue « ${engagement.promesse} »`);
  }
  if (!engagement.mention.includes('intervenants')) {
    soucis.push(`[${nom}] questions : la mention ne parle pas des intervenants`);
  }

  // Le questionnaire vierge, avec son contexte : c'est l'écran d'accueil des
  // affirmations, celui qu'on compare à la maquette.
  await verifierTirets(page, `${nom} questions`);
  await capturer(`Questions${suffixe}`, `${nom} questions`);

  // Les lignes de contexte ne doivent pas faire déborder une carte d'un écran :
  // le questionnaire doit rester faisable en 2 à 3 minutes.
  const cartesTropHautes = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.affirmation'))
      .filter((c) => c.getBoundingClientRect().height > window.innerHeight)
      .length);
  if (cartesTropHautes > 0) {
    soucis.push(`[${nom}] questions : ${cartesTropHautes} cartes dépassent un écran`);
  }

  // La pousse de progression grandit sans jamais montrer de chiffre.
  const avancee = async () => page.evaluate(() => {
    const barre = document.querySelector('[data-barre]');
    const p = document.querySelector('[data-pousse]');
    return {
      pousse: p?.getAttribute('src') || null,
      but: document.querySelector('[data-but]')?.getAttribute('src') || null,
      valeur: barre?.getAttribute('aria-valuenow'),
      texte: barre?.getAttribute('aria-valuetext') || '',
      couleurJauge: getComputedStyle(document.querySelector('.progression__jauge')).backgroundColor,
    };
  });

  const depart = await avancee();
  if (depart.pousse !== 'assets/img/icone-semer.svg') {
    soucis.push(`[${nom}] progression : la pousse de départ est ${depart.pousse}`);
  }
  if (depart.but !== 'assets/img/icone-enracine.svg') {
    soucis.push(`[${nom}] progression : le but est ${depart.but}`);
  }
  if (!depart.texte.startsWith('Avancée :')) {
    soucis.push(`[${nom}] progression : aria-valuetext « ${depart.texte} »`);
  }
  if (/[0-9]/.test(depart.texte)) {
    soucis.push(`[${nom}] progression : l'avancée annonce un chiffre « ${depart.texte} »`);
  }

  // La réponse choisie ne se distingue pas que par la couleur. Depuis la passe
  // 11 : une coche dans le flux sur ordinateur, le gras sur mobile.
  await page.locator('.affirmation').first().locator('.echelle__choix').nth(3).click();
  await page.waitForTimeout(250);
  const coche = await page.evaluate(() => {
    const vue = (n) => getComputedStyle(n).display !== 'none' && n.getBoundingClientRect().width > 0;
    const choisi = document.querySelector('.echelle__choix[aria-pressed="true"]');
    const autre = document.querySelector('.echelle__choix[aria-pressed="false"]');
    return {
      mobile: window.innerWidth < 600,
      visibleSurChoisi: vue(choisi.querySelector('.echelle__coche')),
      visibleSurAutre: vue(autre.querySelector('.echelle__coche')),
      gras: Number(getComputedStyle(choisi).fontWeight) >= 600,
    };
  });
  if (!coche.mobile && !coche.visibleSurChoisi) soucis.push(`[${nom}] échelle : la réponse choisie n'a pas de coche`);
  if (coche.mobile && !coche.gras) soucis.push(`[${nom}] échelle : la réponse choisie n'est pas en gras`);
  if (coche.visibleSurAutre) soucis.push(`[${nom}] échelle : une réponse non choisie porte une coche`);

  // La jauge est collante et ne montre aucun chiffre.
  const jauge = await page.evaluate(() => {
    const p = document.querySelector('.progression');
    const style = getComputedStyle(p);
    return {
      position: style.position,
      hauteur: Math.round(p.getBoundingClientRect().height),
      texte: p.textContent.trim(),
    };
  });
  if (jauge.position !== 'sticky') soucis.push(`[${nom}] progression : ${jauge.position} au lieu de sticky`);
  if (jauge.hauteur > 44) soucis.push(`[${nom}] progression : ${jauge.hauteur}px de haut, plus de 44`);
  if (jauge.texte !== '') soucis.push(`[${nom}] progression : elle affiche « ${jauge.texte} »`);

  // « Continuer » reste cliquable et amène à la première affirmation oubliée.
  const continuerQ = page.locator('[data-voir]');
  if (await continuerQ.isDisabled()) {
    soucis.push(`[${nom}] questions : « Continuer » est inactif au lieu de guider`);
  } else {
    await page.locator('.affirmation').nth(2).locator('.echelle__choix').nth(1).click();
    await page.waitForTimeout(400);
    await continuerQ.click();
    await page.waitForTimeout(500);
    const avertissement = (await page.locator('#message').innerText()).trim();
    if (!/Il en reste \d+ sans réponse\.|Il reste une affirmation sans réponse\./.test(avertissement)) {
      soucis.push(`[${nom}] questions : message inattendu « ${avertissement} »`);
    }
    const oubliee = await page.locator('.affirmation--manquante').count();
    if (oubliee !== 1) soucis.push(`[${nom}] questions : ${oubliee} affirmation mise en évidence au lieu d'une`);
    const premiereVisible = await page.locator('[data-affirmation="1"]').isVisible();
    if (!premiereVisible) soucis.push(`[${nom}] questions : la première affirmation oubliée n'est pas à l'écran`);
    if (!surLaPage(page.url(), 'questions.html')) {
      soucis.push(`[${nom}] questions : « Continuer » avance malgré les manques`);
    }
  }

  // « Pas encore » sur chacune des 16 : l'état visuel et la valeur enregistrée.
  const cartes = page.locator('.affirmation');
  for (let i = 0; i < 16; i += 1) {
    await cartes.nth(i).locator('.echelle__choix').nth(0).click();
    const presse = await cartes.nth(i).locator('.echelle__choix').nth(0).getAttribute('aria-pressed');
    if (presse !== 'true') {
      soucis.push(`[${nom}] questions : « Pas encore » sur Q${i + 1} ne s'active pas (aria-pressed ${presse})`);
    }
  }
  const toutABas = await page.evaluate(() => {
    try {
      const brut = sessionStorage.getItem('greatly_edl_parcours');
      return brut ? JSON.parse(brut).reponses : null;
    } catch (e) { return null; }
  });
  if (JSON.stringify(toutABas) !== JSON.stringify(new Array(16).fill(0))) {
    soucis.push(`[${nom}] questions : « Pas encore » n'enregistre pas 0 partout (${JSON.stringify(toutABas)})`);
  }

  // Répondre pour la première fois amène l'affirmation suivante à l'écran.
  // On repart d'un questionnaire vierge : sans cela, aucune réponse ne serait
  // « la première fois » et le défilement ne se déclencherait pas.
  await page.evaluate(() => { try { sessionStorage.removeItem('greatly_edl_parcours'); } catch (e) {} });
  await aller(page, `${BASE}/profil.html`);
  await remplirProfil(page);
  await page.locator('[data-continuer]').click();
  await page.waitForSelector('.affirmation');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);
  const avant = await page.evaluate(() => window.scrollY);
  await page.locator('.affirmation').first().locator('.echelle__choix').nth(2).click();
  await page.waitForTimeout(800);
  const apres = await page.evaluate(() => window.scrollY);
  if (apres <= avant) {
    soucis.push(`[${nom}] questions : répondre n'amène pas l'affirmation suivante à l'écran`);
  }
  // Modifier une réponse déjà donnée ne doit rien déplacer.
  await page.evaluate(() => document.querySelector('[data-affirmation="1"]').scrollIntoView());
  await page.waitForTimeout(300);
  const avantModif = await page.evaluate(() => window.scrollY);
  await page.locator('.affirmation').first().locator('.echelle__choix').nth(3).click();
  await page.waitForTimeout(600);
  const apresModif = await page.evaluate(() => window.scrollY);
  if (Math.abs(apresModif - avantModif) > 4) {
    soucis.push(`[${nom}] questions : modifier une réponse fait sauter la page de ${Math.abs(apresModif - avantModif)}px`);
  }

  // On répond « Pas encore » partout pour la suite.
  for (let i = 0; i < 16; i += 1) {
    await page.locator('.affirmation').nth(i).locator('.echelle__choix').nth(0).click();
  }

  // Avec les 16 réponses, la pousse a atteint l'arbre. Depuis la passe 11,
  // l'arbre n'arrive qu'à la 16e réponse : on laisse finir son fondu (200 ms).
  await page.waitForTimeout(500);
  const arrivee = await avancee();
  if (arrivee.pousse !== 'assets/img/icone-enracine.svg') {
    soucis.push(`[${nom}] progression : après 16 réponses, la pousse est ${arrivee.pousse}`);
  }
  if (arrivee.valeur !== '16') {
    soucis.push(`[${nom}] progression : aria-valuenow vaut ${arrivee.valeur} au lieu de 16`);
  }
  // La jauge garde sa couleur sauge : ce n'est pas un score.
  if (arrivee.couleurJauge !== 'rgb(138, 155, 122)') {
    soucis.push(`[${nom}] progression : la jauge est en ${arrivee.couleurJauge}, pas en sauge`);
  }

  // ----------------------------------------------- les relances, passe 4
  // Scénario 1 : « Pas encore » partout ouvre les 16 encadrés.
  const ouverts16 = await page.locator('.relance-enveloppe:not([hidden])').count();
  if (ouverts16 !== 16) {
    soucis.push(`[${nom}] relances : ${ouverts16} encadrés ouverts au lieu de 16`);
  }

  // L'encadré vit dans la carte de son affirmation.
  const bienPlace = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.affirmation'))
      .every((c) => c.querySelector('.relance-enveloppe')));
  if (!bienPlace) soucis.push(`[${nom}] relances : un encadré vit hors de sa carte`);

  // Style attendu : coins 12px, choix en lignes pleine largeur.
  const formeRelance = await page.evaluate(() => {
    const r = document.querySelector('.relance');
    const c = r.querySelector('.choix');
    return {
      rayon: parseFloat(getComputedStyle(r).borderRadius),
      pleineLargeur: Math.abs(c.getBoundingClientRect().width - c.parentElement.getBoundingClientRect().width) < 2,
      groupe: r.getAttribute('role'),
      intitule: !!r.getAttribute('aria-labelledby'),
      legends: r.querySelectorAll('legend, fieldset').length,
    };
  });
  if (formeRelance.rayon !== 12) soucis.push(`[${nom}] relances : coins à ${formeRelance.rayon}px au lieu de 12`);
  if (!formeRelance.pleineLargeur) soucis.push(`[${nom}] relances : les choix ne prennent pas toute la largeur`);
  if (formeRelance.groupe !== 'group' || !formeRelance.intitule) {
    soucis.push(`[${nom}] relances : pas de role="group" avec aria-labelledby`);
  }
  if (formeRelance.legends > 0) soucis.push(`[${nom}] relances : un fieldset ou legend subsiste`);

  await capturer(`Relances${suffixe}`, `${nom} relances`);

  // Scénario 2 : deux réponses réservées éloignées, rien ne saute.
  await page.evaluate(() => { try { sessionStorage.removeItem('greatly_edl_parcours'); } catch (e) {} });
  await aller(page, `${BASE}/profil.html`);
  await remplirProfil(page);
  await page.locator('[data-continuer]').click();
  await page.waitForSelector('.affirmation');

  const cartes2 = page.locator('.affirmation');
  await cartes2.nth(2).locator('.echelle__choix').nth(1).click();   // Q3 : Un peu
  await page.waitForTimeout(400);
  const hautQ3 = await page.evaluate(() =>
    document.querySelector('[data-affirmation="3"]').getBoundingClientRect().top + window.scrollY);

  await cartes2.nth(9).locator('.echelle__choix').nth(0).click();   // Q10 : Pas encore
  await page.waitForTimeout(400);
  const hautQ3Apres = await page.evaluate(() =>
    document.querySelector('[data-affirmation="3"]').getBoundingClientRect().top + window.scrollY);

  if (Math.abs(hautQ3Apres - hautQ3) > 2) {
    soucis.push(`[${nom}] relances : répondre plus bas déplace Q3 de ${Math.round(hautQ3Apres - hautQ3)}px`);
  }
  const ouverts = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.affirmation'))
      .map((c, i) => (c.querySelector('.relance-enveloppe:not([hidden])') ? i + 1 : null))
      .filter(Boolean));
  if (JSON.stringify(ouverts) !== JSON.stringify([3, 10])) {
    soucis.push(`[${nom}] relances : ouvertes sur ${ouverts.join(', ')} au lieu de 3, 10`);
  }

  // Scénario 3 : cocher 2 choix, refermer, rouvrir, les choix reviennent.
  const casesQ3 = cartes2.nth(2).locator('.relance input[type="checkbox"]');
  await casesQ3.nth(0).check();
  await casesQ3.nth(2).check();
  if (!(await casesQ3.nth(1).isDisabled())) {
    soucis.push(`[${nom}] relances : un 3e choix reste cochable`);
  }

  await cartes2.nth(2).locator('.echelle__choix').nth(2).click();   // Q3 : En bonne partie
  await page.waitForTimeout(400);
  if (await cartes2.nth(2).locator('.relance-enveloppe').isVisible()) {
    soucis.push(`[${nom}] relances : l'encadré ne se referme pas sur En bonne partie`);
  }

  await cartes2.nth(2).locator('.echelle__choix').nth(1).click();   // Q3 : Un peu
  await page.waitForTimeout(500);
  const revenus = await cartes2.nth(2).locator('.relance input:checked').count();
  if (revenus !== 2) {
    soucis.push(`[${nom}] relances : ${revenus} choix retrouvés à la réouverture au lieu de 2`);
  }

  // Scénario 4 : à l'envoi, seules les relances des réponses 0 ou 1 partent.
  await cartes2.nth(9).locator('.echelle__choix').nth(0).click();
  await page.waitForTimeout(200);
  const casesQ10 = cartes2.nth(9).locator('.relance input[type="checkbox"]');
  await casesQ10.nth(1).check();
  await cartes2.nth(9).locator('.echelle__choix').nth(3).click();   // Q10 : Pleinement
  await page.waitForTimeout(300);

  // On complète le reste en « En bonne partie », sauf Q3 qui reste réservée.
  for (let i = 0; i < 16; i += 1) {
    if (i === 2) continue;
    await cartes2.nth(i).locator('.echelle__choix').nth(2).click();
  }
  await page.waitForTimeout(300);

  const aEnvoyer = await page.evaluate(() => {
    try {
      return JSON.parse(sessionStorage.getItem('greatly_edl_parcours')).relances;
    } catch (e) { return null; }
  });
  // La mémoire garde Q10, mais l'envoi ne doit retenir que Q3.
  if (!aEnvoyer || !aEnvoyer['3']) {
    soucis.push(`[${nom}] relances : les choix de Q3 ont été perdus`);
  }

  // Le récapitulatif annonce les 16 réponses, sans autre chiffre.
  const recap = (await page.locator('[data-recapitulatif]').innerText()).trim();
  if (recap !== 'Vous avez répondu aux 16 affirmations') {
    soucis.push(`[${nom}] questions : récapitulatif « ${recap} »`);
  }

  await capturer(`Questions-remplies${suffixe}`, `${nom} questions remplies`);

  // On rétablit le préréglage de la maquette avant d'aller au résultat.
  for (let i = 0; i < REPONSES.length; i += 1) {
    await cartes2.nth(i).locator('.echelle__choix').nth(REPONSES[i]).click();
  }
  await page.waitForTimeout(300);

  await page.locator('[data-voir]').click();

  // ------------------------------------------------------------ 4. résultat
  await page.waitForSelector('[data-resultat]:not([hidden])');
  const hash = new URL(page.url()).hash;
  if (!hash.startsWith(HASH_BASE)) {
    soucis.push(`[${nom}] resultat : hash ${hash} ne commence pas par ${HASH_BASE}`);
  }

  const titreCarte = await page.locator('[data-carte-titre]').innerText();
  if (titreCarte !== 'Une équipe en germe') {
    soucis.push(`[${nom}] resultat : carte « ${titreCarte} »`);
  }
  // La carte se lit d'une traite : texte, appui et forme dans un seul paragraphe.
  const texteCarte = await page.locator('[data-carte-texte]').innerText();
  if (!texteCarte.includes('le soutien du manager')) {
    soucis.push(`[${nom}] resultat : la phrase d'appui manque dans la carte`);
  }
  if (!texteCarte.includes('Votre regard est contrasté')) {
    soucis.push(`[${nom}] resultat : la phrase de forme manque dans la carte`);
  }
  const paragraphesCarte = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.ensemble__haut p'))
      .filter((p) => p.innerText.trim() !== '').length);
  if (paragraphesCarte !== 1) {
    soucis.push(`[${nom}] resultat : la carte tient sur ${paragraphesCarte} paragraphes au lieu d'un`);
  }
  if (!(await page.locator('[data-sans-resultat]').isHidden())) {
    soucis.push(`[${nom}] resultat : le bloc « ce lien ne porte pas de résultat » s'affiche aussi`);
  }
  // Les bandes : un par niveau présent, pleine largeur, dans l'ordre.
  const bandes = await page.evaluate(() => {
    const conteneur = document.querySelector('.bandes');
    return Array.from(document.querySelectorAll('.bande')).map((b) => ({
      niveau: b.querySelector('.bande__niveau').textContent.trim(),
      lignes: b.querySelectorAll('.bande__ligne').length,
      pousse: b.querySelector('.bande__pousse')?.getAttribute('src') || null,
      poussADroite: (() => {
        const p = b.querySelector('.bande__pousse');
        const n = b.querySelector('.bande__niveau');
        return p && n && p.getBoundingClientRect().left > n.getBoundingClientRect().left;
      })(),
      // Chaque bande occupe toute la largeur de la pile.
      pleineLargeur: Math.abs(b.getBoundingClientRect().width
        - conteneur.getBoundingClientRect().width) < 1,
    }));
  });
  if (bandes.length !== 4) soucis.push(`[${nom}] resultat : ${bandes.length} bandes au lieu de 4`);
  const ordreNiveaux = ['Bien enraciné', 'En croissance', 'En germe', 'À semer'];
  if (JSON.stringify(bandes.map((b) => b.niveau)) !== JSON.stringify(ordreNiveaux)) {
    soucis.push(`[${nom}] resultat : bandes dans l'ordre ${bandes.map((b) => b.niveau).join(', ')}`);
  }
  const totalLignes = bandes.reduce((n, b) => n + b.lignes, 0);
  if (totalLignes !== 8) soucis.push(`[${nom}] resultat : ${totalLignes} dimensions rangées au lieu de 8`);
  bandes.forEach((b) => {
    if (!b.pleineLargeur) soucis.push(`[${nom}] resultat : la bande « ${b.niveau} » n'est pas pleine largeur`);
    if (b.poussADroite) soucis.push(`[${nom}] resultat : la pousse de « ${b.niveau} » est à droite du nom`);
    if (!b.pousse) soucis.push(`[${nom}] resultat : la bande « ${b.niveau} » n'a pas de pousse`);
  });

  // La légende des 4 couleurs disparaît : chaque bandeau porte son nom.
  if (await page.locator('.ensemble .legende').count()) {
    soucis.push(`[${nom}] resultat : la légende des couleurs subsiste au-dessus des bandes`);
  }
  if ((await page.locator('[data-resultat]').innerText()).includes('obtient les résultats')) {
    soucis.push(`[${nom}] resultat : le Q16 apparaît dans le résultat`);
  }

  // Le médaillon suit le niveau, et reste décoratif.
  await attendreLesImages(page);

  const medaillon = await page.evaluate(() => {
    const img = document.querySelector('[data-medaillon]');
    if (!img) return null;
    const etiquette = document.querySelector('.ensemble__etiquette');
    return {
      source: img.getAttribute('src'),
      decoratif: img.getAttribute('aria-hidden') === 'true' && img.getAttribute('alt') === '',
      taille: Math.round(img.getBoundingClientRect().width),
      charge: img.complete && img.naturalWidth > 0,
      // Sur mobile, le médaillon passe au-dessus de l'étiquette.
      auDessus: img.getBoundingClientRect().bottom <= etiquette.getBoundingClientRect().top + 1,
    };
  });
  if (!medaillon) {
    soucis.push(`[${nom}] resultat : pas de médaillon`);
  } else {
    // Le jeu de réponses donne la carte « en germe ».
    if (medaillon.source !== 'assets/img/scene-germe.svg') {
      soucis.push(`[${nom}] resultat : médaillon ${medaillon.source} au lieu de scene-germe.svg`);
    }
    if (!medaillon.decoratif) soucis.push(`[${nom}] resultat : le médaillon n'est pas décoratif`);
    if (!medaillon.charge) soucis.push(`[${nom}] resultat : le médaillon ne se charge pas`);
    const tailleAttendue = largeur >= 900 ? 180 : 120;
    if (medaillon.taille !== tailleAttendue) {
      soucis.push(`[${nom}] resultat : médaillon de ${medaillon.taille}px au lieu de ${tailleAttendue}`);
    }
    if (largeur < 900 && !medaillon.auDessus) {
      soucis.push(`[${nom}] resultat : sur mobile le médaillon n'est pas au-dessus de l'étiquette`);
    }
  }

  // Chaque en-tête de colonne porte la pousse de son niveau.
  const pousses = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.bande')).map((c) => ({
      niveau: c.querySelector('.bande__niveau').textContent.trim(),
      source: c.querySelector('.bande__pousse')?.getAttribute('src') || null,
      taille: Math.round(c.querySelector('.bande__pousse')?.getBoundingClientRect().width || 0),
      charge: (() => { const i = c.querySelector('.bande__pousse'); return i && i.complete && i.naturalWidth > 0; })(),
    })));
  const attendu = {
    'Bien enraciné': 'assets/img/icone-enracine.svg',
    'En croissance': 'assets/img/icone-croissance.svg',
    'En germe': 'assets/img/icone-germe.svg',
    'À semer': 'assets/img/icone-semer.svg',
  };
  pousses.forEach((p) => {
    if (p.source !== attendu[p.niveau]) {
      soucis.push(`[${nom}] resultat : colonne « ${p.niveau} » porte ${p.source}`);
    }
    if (p.taille !== 30) soucis.push(`[${nom}] resultat : pousse de ${p.taille}px au lieu de 30`);
    if (!p.charge) soucis.push(`[${nom}] resultat : la pousse de « ${p.niveau} » ne se charge pas`);
  });

  const etiquette = await page.evaluate(() => {
    const e = document.querySelector('.ensemble__etiquette');
    const style = getComputedStyle(e);
    const hauteurLigne = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.2;
    const interne = e.getBoundingClientRect().height
      - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    return { lignes: Math.round(interne / hauteurLigne), rayon: parseFloat(style.borderRadius) };
  });
  if (etiquette.lignes > 1 && etiquette.rayon > 20) {
    soucis.push(`[${nom}] resultat : étiquette sur ${etiquette.lignes} lignes dans une pilule`);
  }

  // Le lien : des boutons, et l'URL brute repliée.
  const lien = await page.evaluate(() => {
    const details = document.querySelector('.lien-perso__details');
    const champ = document.querySelector('[data-lien]');
    const partager = document.querySelector('[data-partager]');
    const astuce = document.querySelector('[data-retour-raccourci]');
    return {
      replie: details ? !details.open : null,
      // Un <details> replié masque son contenu sans forcément annuler
      // offsetParent : on regarde s'il occupe vraiment de la place.
      champVisible: champ ? champ.getClientRects().length > 0 : null,
      valeur: champ ? champ.value : '',
      partageVisible: partager ? !partager.hidden : null,
      astuceVisible: astuce ? !astuce.hidden : null,
      // Le lien est désormais dans le bloc « Gardez votre résultat ».
      boutonCopier: !!document.querySelector('[data-copier]'),
      partageDisponible: typeof navigator.share === 'function',
    };
  });
  if (lien.replie !== true) soucis.push(`[${nom}] resultat : l'URL brute n'est pas repliée`);
  if (lien.champVisible) soucis.push(`[${nom}] resultat : l'URL brute s'affiche d'emblée`);
  if (!lien.valeur.includes('#v2-')) soucis.push(`[${nom}] resultat : le lien ne porte pas le résultat`);
  if (lien.partageDisponible && !lien.partageVisible) {
    soucis.push(`[${nom}] resultat : le partage existe mais le bouton est caché`);
  }
  if (!lien.partageDisponible && !lien.astuceVisible) {
    soucis.push(`[${nom}] resultat : ni partage ni astuce des favoris`);
  }
  if (lien.partageVisible && lien.astuceVisible) {
    soucis.push(`[${nom}] resultat : le partage et l'astuce s'affichent tous les deux`);
  }

  // Faire connaître l'état des lieux : jamais le résultat, jamais le hash.
  const partage = await page.evaluate(async () => {
    const bouton = document.querySelector('[data-partager-accueil]');
    if (!bouton) return null;

    // On intercepte ce que la page tente de partager ou de copier.
    let partage = null;
    let copie = null;
    const partageOriginal = navigator.share;
    navigator.share = async (d) => { partage = d; };
    const ecrireOriginal = navigator.clipboard && navigator.clipboard.writeText;
    if (navigator.clipboard) navigator.clipboard.writeText = async (t) => { copie = t; };

    bouton.click();
    await new Promise((r) => setTimeout(r, 300));

    navigator.share = partageOriginal;
    if (navigator.clipboard && ecrireOriginal) navigator.clipboard.writeText = ecrireOriginal;

    return {
      texte: document.querySelector('[data-partage-texte]')?.textContent || '',
      etiquette: bouton.textContent,
      pointille: getComputedStyle(bouton.closest('.carte-pointillee') || bouton).borderStyle,
      adressePartagee: partage ? partage.url : null,
      adresseCopiee: copie,
    };
  });

  if (!partage) {
    soucis.push(`[${nom}] resultat : pas de bouton pour faire connaître l'état des lieux`);
  } else {
    const adresse = partage.adressePartagee || partage.adresseCopiee || '';
    if (!adresse) {
      soucis.push(`[${nom}] resultat : le partage ne propose aucune adresse`);
    }
    if (adresse.includes('#')) {
      soucis.push(`[${nom}] resultat : le partage emporte un hash : ${adresse}`);
    }
    if (adresse.includes('resultat.html')) {
      soucis.push(`[${nom}] resultat : le partage emporte l'adresse du résultat : ${adresse}`);
    }
    if (!adresse.endsWith('/index.html')) {
      soucis.push(`[${nom}] resultat : le partage ne pointe pas vers l'accueil : ${adresse}`);
    }
    // On vérifie la garantie, pas une formulation : le texte doit dire que le
    // résultat ne part pas. Sinon le moindre reformulage casse la vérification.
    if (!/jamais votre résultat|pas votre résultat|jamais le vôtre/i.test(partage.texte)) {
      soucis.push(`[${nom}] resultat : le texte ne garantit pas que le résultat n'est jamais partagé : « ${partage.texte} »`);
    }
    if (partage.pointille !== 'dashed') {
      soucis.push(`[${nom}] resultat : l'encadré de partage n'est pas en pointillé`);
    }
  }

  // Le bloc qui garde le résultat. Ici, c'est bien l'adresse du résultat,
  // contrairement au partage de l'accueil juste en dessous.
  const retour = await page.evaluate(async () => {
    const bouton = document.querySelector('[data-copier]');
    if (!bouton) return null;

    let partage = null;
    let copie = null;
    const partageOriginal = navigator.share;
    const ecrireOriginal = navigator.clipboard && navigator.clipboard.writeText;
    navigator.share = async (d) => { partage = d; };
    if (navigator.clipboard) navigator.clipboard.writeText = async (t) => { copie = t; };

    bouton.click();
    await new Promise((r) => setTimeout(r, 300));

    const apresClic = bouton.textContent;
    navigator.share = partageOriginal;
    if (navigator.clipboard && ecrireOriginal) navigator.clipboard.writeText = ecrireOriginal;

    const raccourci = document.querySelector('[data-retour-raccourci]');
    return {
      titre: document.querySelector('[data-retour-titre]')?.textContent || '',
      texte: document.querySelector('[data-retour-texte]')?.textContent || '',
      pousse: document.querySelector('[data-retour-pousse]')?.getAttribute('src') || null,
      adresse: partage ? partage.url : copie,
      partageDispo: typeof partageOriginal === 'function',
      apresClic,
      raccourci: raccourci && !raccourci.hidden ? raccourci.textContent : null,
      // L'ancienne ligne « Bientôt… » doit avoir disparu.
      ancienneLigne: document.querySelectorAll('.bientot').length,
      // Un seul bloc pour garder son résultat, plus deux qui se répètent.
      blocs: document.querySelectorAll('.garder').length,
    };
  });

  if (!retour) {
    soucis.push(`[${nom}] resultat : pas de bandeau « Revenez bientôt »`);
  } else {
    if (retour.titre !== 'Gardez votre résultat') {
      soucis.push(`[${nom}] resultat : titre du bandeau « ${retour.titre} »`);
    }
    if (retour.pousse !== 'assets/img/icone-germe.svg') {
      soucis.push(`[${nom}] resultat : pousse du bandeau ${retour.pousse}`);
    }
    if (retour.ancienneLigne > 0) {
      soucis.push(`[${nom}] resultat : la ligne « Bientôt… » subsiste`);
    }
    if (!retour.adresse || !retour.adresse.includes('#v2-')) {
      soucis.push(`[${nom}] resultat : « Garder cette page » ne garde pas le résultat (${retour.adresse})`);
    }
    // Sans partage natif, on copie et on le dit, avec le raccourci clavier.
    if (!retour.partageDispo) {
      if (!retour.apresClic.startsWith('Lien copié')) {
        soucis.push(`[${nom}] resultat : après copie, le bouton dit « ${retour.apresClic} »`);
      }
      if (!retour.raccourci || !/D\b/.test(retour.raccourci)) {
        soucis.push(`[${nom}] resultat : pas de mention du raccourci de favoris`);
      }
    } else if (retour.raccourci) {
      soucis.push(`[${nom}] resultat : le raccourci clavier s'affiche là où le partage existe`);
    }
    if (retour.blocs !== 1) {
      soucis.push(`[${nom}] resultat : ${retour.blocs} blocs pour garder son résultat au lieu d'un`);
    }
  }

  // Tous les liens et boutons secondaires tiennent 44px au doigt.
  const tropPetits = await page.evaluate(() =>
    Array.from(document.querySelectorAll(
      '.lien-discret, .bouton-doux, .navigation__retour, .lien-perso__details summary, .secteur-choisi button'
    ))
      .filter((n) => n.offsetParent !== null)
      .filter((n) => n.getBoundingClientRect().height < 44)
      .map((n) => `${n.className.split(' ')[0]} (${Math.round(n.getBoundingClientRect().height)}px)`));
  if (tropPetits.length > 0) {
    soucis.push(`[${nom}] resultat : zones tactiles sous 44px : ${tropPetits.join(', ')}`);
  }

  // « Garder mon résultat » amène au lien personnel, qui arrive très bas.
  const garder = page.locator('[data-garder]');
  if ((await garder.count()) !== 1) {
    soucis.push(`[${nom}] resultat : pas de bouton « Garder mon résultat »`);
  } else {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(200);
    const lienLoin = await page.evaluate(() => {
      const bloc = document.querySelector('#lien-personnel');
      return bloc.getBoundingClientRect().top > window.innerHeight;
    });
    if (!lienLoin) {
      soucis.push(`[${nom}] resultat : le lien personnel est déjà à l'écran, le raccourci ne sert à rien`);
    }
    await garder.click();
    await page.waitForTimeout(800);
    const lienAEcran = await page.evaluate(() => {
      const r = document.querySelector('#lien-personnel').getBoundingClientRect();
      return r.top >= -4 && r.top < window.innerHeight;
    });
    if (!lienAEcran) soucis.push(`[${nom}] resultat : « Garder mon résultat » n'amène pas au lien`);
  }

  const couleurIntro = await page.evaluate(() =>
    getComputedStyle(document.querySelector('.etude > p')).color);
  if (couleurIntro !== 'rgb(107, 100, 96)') {
    soucis.push(`[${nom}] resultat : intro de l'étude en ${couleurIntro} au lieu de taupe`);
  }

  await page.locator('[data-etude] button[type="submit"]').click();
  await page.waitForTimeout(250);
  const annonces = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[role="alert"], [role="status"], [aria-live]'))
      .map((z) => z.textContent.trim())
      .filter((t) => t !== ''));
  const doublons = annonces.filter((t) => t.includes('manque'));
  if (doublons.length !== 1) {
    soucis.push(`[${nom}] resultat : message d'erreur annoncé ${doublons.length} fois`);
  }
  if (doublons[0] && !doublons[0].startsWith('Il nous manque encore')) {
    soucis.push(`[${nom}] resultat : message inattendu « ${doublons[0]} »`);
  }

  await verifierAucunChiffre(page, `${nom} resultat`, '.ensemble');
  await verifierTirets(page, `${nom} resultat`);
  await capturer(`Resultat${suffixe}`, `${nom} resultat`);

  // ----------------------------------------- 5. lien illisible, confidentialité
  // Un lien v1 doit rester lisible : il affiche le résultat, sans les idées.
  // On repasse par une autre page : un changement de hash seul déclenche un
  // rechargement, qui entrerait en course avec la navigation du test.
  await page.goto('about:blank');
  await aller(page, `${BASE}/resultat.html#v1-m2211220023222221`);
  await page.waitForSelector('[data-resultat]:not([hidden])');
  const titreV1 = await page.locator('[data-carte-titre]').innerText();
  if (titreV1 !== 'Une équipe en germe') {
    soucis.push(`[${nom}] resultat : un lien v1 donne « ${titreV1} »`);
  }

  await page.goto('about:blank');
  await aller(page, `${BASE}/resultat.html#nawak`);
  await page.waitForSelector('[data-sans-resultat]:not([hidden])');
  if (!(await page.locator('[data-resultat]').isHidden())) {
    soucis.push(`[${nom}] resultat : un hash invalide affiche quand même un résultat`);
  }
  await capturer(`Resultat-sans-lien${suffixe}`, `${nom} resultat vide`);

  await aller(page, `${BASE}/confidentialite.html`);
  await verifierTirets(page, `${nom} confidentialite`);
  await capturer(`Confidentialite${suffixe}`, `${nom} confidentialite`);

  await navigateur.close();
}

// -------------------------------------------------------------------- bilan

for (const cible of CIBLES) {
  await passerLaCible(cible);
}

// Une seule passe suffit : la résistance au contenu périmé ne dépend pas du
// navigateur ni de la largeur.
if (!FILTRE || FILTRE === 'chromium') {
  const { chromium } = await import('playwright');
  const navigateur = await chromium.launch();
  await verifierContenuPerime(navigateur, { viewport: { width: 1280, height: 900 }, locale: 'fr-FR' }, soucis);
  await verifierResultatImmediat(navigateur, { viewport: { width: 1280, height: 900 }, locale: 'fr-FR' }, soucis);
  await navigateur.close();
}

console.log(`${capturesPrises} captures écrites dans ${SORTIE}`);
console.log(`Cibles : ${CIBLES.map((c) => c.nom).join(', ')}`);
if (soucis.length === 0) {
  console.log('Aucun souci relevé.');
} else {
  console.log(`\n${soucis.length} souci(s) :`);
  soucis.forEach((s) => console.log(`  - ${s}`));
  process.exitCode = 1;
}
