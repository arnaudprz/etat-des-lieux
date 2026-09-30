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
const HASH_ATTENDU = '#v1-m2211220023222221';

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
    soucis.push(`[${etiquette}] requête échouée : ${r.url()}`);
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
  surveiller(page, nom);

  // ------------------------------------------------------------- 1. accueil
  await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.dimensions .carte');

  const nbDimensions = await page.locator('.dimensions .carte').count();
  if (nbDimensions !== 8) soucis.push(`[${nom}] accueil : ${nbDimensions} dimensions au lieu de 8`);
  const compteur = (await page.locator('[data-compteur]').innerText()).trim();
  if (compteur !== '255') soucis.push(`[${nom}] accueil : compteur à « ${compteur} » au lieu de 255`);

  // L'illustration est en SVG dans la page, pas en image.
  const illustration = await page.evaluate(() => {
    const svg = document.querySelector('.hero__illustration svg');
    if (!svg) return null;
    const etiquettes = svg.querySelector('.pousses__etiquettes');
    return {
      etiquette: svg.getAttribute('aria-label') || '',
      viewBox: svg.getAttribute('viewBox'),
      etiquettesMasquees: etiquettes ? getComputedStyle(etiquettes).display === 'none' : null,
      images: document.querySelectorAll('.hero img').length,
    };
  });
  if (!illustration) {
    soucis.push(`[${nom}] accueil : pas d'illustration en SVG`);
  } else {
    if (!illustration.etiquette.startsWith('Quatre pousses')) {
      soucis.push(`[${nom}] accueil : l'illustration n'a pas son aria-label`);
    }
    if (illustration.images > 0) {
      soucis.push(`[${nom}] accueil : ${illustration.images} image(s) dans le haut de page`);
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
      '.hero__texte .badge, .hero__titre, .hero__intro, .hero__actions, .hero__mentions, .hero__illustration'
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
  const ordreAttendu = ['badge', 'hero__titre', 'hero__intro', 'hero__actions', 'hero__mentions', 'hero__illustration'];
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

  await verifierTirets(page, `${nom} accueil`);
  await capturer(`Main${suffixe}`, `${nom} accueil`);

  // -------------------------------------------------------------- 2. profil
  await page.click('.hero__actions a.btn');
  await page.waitForSelector('.pilules');

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
    if (new URL(page.url()).pathname !== '/profil.html') {
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

  // Hauteur bornée, avec défilement interne.
  const hauteurListe = await page.evaluate(() => {
    const l = document.querySelector('#secteurs');
    return { visible: Math.round(l.clientHeight), total: Math.round(l.scrollHeight) };
  });
  if (hauteurListe.visible > 48 * 6 + 16) {
    soucis.push(`[${nom}] secteurs : liste haute de ${hauteurListe.visible}px, plus de 6 lignes`);
  }
  if (hauteurListe.total <= hauteurListe.visible) {
    soucis.push(`[${nom}] secteurs : les 20 secteurs tiennent sans défilement, la borne ne sert à rien`);
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

  await page.goto(`${BASE}/profil.html`, { waitUntil: 'networkidle' });
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
  if (jauge.hauteur !== 4) soucis.push(`[${nom}] progression : ${jauge.hauteur}px de haut au lieu de 4`);
  if (jauge.texte !== '') soucis.push(`[${nom}] progression : elle affiche « ${jauge.texte} »`);

  // « Continuer » reste cliquable et amène à la première affirmation oubliée.
  const continuerQ = page.locator('[data-continuer]');
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
    if (await page.locator('[data-ecran="relances"]').isVisible()) {
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
  await page.goto(`${BASE}/profil.html`, { waitUntil: 'networkidle' });
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

  // Aucune relance ne doit apparaître pendant qu'on répond.
  if (await page.locator('.relance').count()) {
    soucis.push(`[${nom}] questions : une relance s'affiche parmi les affirmations`);
  }

  await verifierTirets(page, `${nom} questions`);
  await capturer(`Questions${suffixe}`, `${nom} questions`);

  // Avec 16 réponses « Pas encore », chaque affirmation ouvre sa relance.
  await page.locator('[data-continuer]').click();
  await page.waitForSelector('[data-ecran="relances"]:not([hidden])');
  if (new URL(page.url()).pathname !== '/questions.html') {
    soucis.push(`[${nom}] relances : l'écran change d'URL`);
  }
  const nbRelances = await page.locator('.relance').count();
  if (nbRelances !== 2) soucis.push(`[${nom}] relances : ${nbRelances} encadrés au lieu de 2`);
  if ((await page.locator('[data-ecran="affirmations"]').isVisible())) {
    soucis.push(`[${nom}] relances : les affirmations restent visibles`);
  }
  const etapeActive = await page.locator('.etape--active .etape__nom').innerText();
  if (etapeActive !== 'Vos réponses') {
    soucis.push(`[${nom}] relances : le fil d'étapes est sur « ${etapeActive} »`);
  }

  // Les choix sont des lignes pleine largeur, pas des pilules.
  const formeChoix = await page.evaluate(() => {
    const c = document.querySelector('.relance .choix');
    const style = getComputedStyle(c);
    const largeurBloc = c.parentElement.getBoundingClientRect().width;
    return {
      rayon: parseFloat(style.borderRadius),
      pleineLargeur: Math.abs(c.getBoundingClientRect().width - largeurBloc) < 2,
    };
  });
  if (formeChoix.rayon !== 12) soucis.push(`[${nom}] relances : coins à ${formeChoix.rayon}px au lieu de 12`);
  if (!formeChoix.pleineLargeur) soucis.push(`[${nom}] relances : les choix ne prennent pas toute la largeur`);

  // 2 choix au plus.
  const casesQ1 = page.locator('.relance').first().locator('input[type="checkbox"]');
  await casesQ1.nth(0).check();
  await casesQ1.nth(1).check();
  if (!(await casesQ1.nth(2).isDisabled())) {
    soucis.push(`[${nom}] relances : un 3e choix reste cochable`);
  }

  await capturer(`Relances${suffixe}`, `${nom} relances`);

  // « Retour » ne doit rien perdre.
  await page.locator('[data-retour-affirmations]').click();
  await page.waitForSelector('[data-ecran="affirmations"]:not([hidden])');
  const encoreABas = await page.evaluate(() => {
    try {
      return JSON.parse(sessionStorage.getItem('greatly_edl_parcours')).reponses;
    } catch (e) { return null; }
  });
  if (JSON.stringify(encoreABas) !== JSON.stringify(new Array(16).fill(0))) {
    soucis.push(`[${nom}] relances : « Retour » perd les réponses`);
  }

  // Le préréglage de la maquette, pour la suite.
  for (let i = 0; i < REPONSES.length; i += 1) {
    await cartes.nth(i).locator('.echelle__choix').nth(REPONSES[i]).click();
  }
  await page.locator('[data-continuer]').click();
  await page.waitForSelector('[data-ecran="relances"]:not([hidden])');

  // Q7 et Q8 valent 0 : ce sont elles qui doivent être rappelées.
  const rappelees = await page.locator('.relance__affirmation').allInnerTexts();
  if (rappelees.length !== 2) soucis.push(`[${nom}] relances : ${rappelees.length} affirmations rappelées`);
  if (!rappelees[0].startsWith("L'info des autres métiers")) {
    soucis.push(`[${nom}] relances : première affirmation rappelée inattendue « ${rappelees[0]} »`);
  }

  await page.locator('[data-voir]').click();

  // ------------------------------------------------------------ 4. résultat
  await page.waitForSelector('[data-resultat]:not([hidden])');
  const hash = new URL(page.url()).hash;
  if (hash !== HASH_ATTENDU) soucis.push(`[${nom}] resultat : hash ${hash} au lieu de ${HASH_ATTENDU}`);

  const titreCarte = await page.locator('[data-carte-titre]').innerText();
  if (titreCarte !== 'Une équipe en germe') {
    soucis.push(`[${nom}] resultat : carte « ${titreCarte} »`);
  }
  if (!(await page.locator('[data-appui]').innerText()).includes('le soutien du manager')) {
    soucis.push(`[${nom}] resultat : phrase d'appui inattendue`);
  }
  if (!(await page.locator('[data-forme]').innerText()).startsWith('Votre regard est contrasté')) {
    soucis.push(`[${nom}] resultat : phrase de forme inattendue`);
  }
  if (!(await page.locator('[data-sans-resultat]').isHidden())) {
    soucis.push(`[${nom}] resultat : le bloc « ce lien ne porte pas de résultat » s'affiche aussi`);
  }
  const nbColonnes = await page.locator('.colonne').count();
  if (nbColonnes !== 4) soucis.push(`[${nom}] resultat : ${nbColonnes} colonnes au lieu de 4`);
  const nbRangees = await page.locator('.colonne__item').count();
  if (nbRangees !== 8) soucis.push(`[${nom}] resultat : ${nbRangees} dimensions rangées au lieu de 8`);
  if ((await page.locator('[data-resultat]').innerText()).includes('obtient les résultats')) {
    soucis.push(`[${nom}] resultat : le Q16 apparaît dans le résultat`);
  }

  // Le médaillon suit le niveau, et reste décoratif.
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
    Array.from(document.querySelectorAll('.colonne')).map((c) => ({
      niveau: c.querySelector('.colonne__entete span').textContent.trim(),
      source: c.querySelector('.colonne__pousse')?.getAttribute('src') || null,
      taille: Math.round(c.querySelector('.colonne__pousse')?.getBoundingClientRect().width || 0),
      charge: (() => { const i = c.querySelector('.colonne__pousse'); return i && i.complete && i.naturalWidth > 0; })(),
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
    if (p.taille !== 34) soucis.push(`[${nom}] resultat : pousse de ${p.taille}px au lieu de 34`);
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
  await page.goto(`${BASE}/resultat.html#nawak`, { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-sans-resultat]:not([hidden])');
  if (!(await page.locator('[data-resultat]').isHidden())) {
    soucis.push(`[${nom}] resultat : un hash invalide affiche quand même un résultat`);
  }
  await capturer(`Resultat-sans-lien${suffixe}`, `${nom} resultat vide`);

  await page.goto(`${BASE}/confidentialite.html`, { waitUntil: 'networkidle' });
  await verifierTirets(page, `${nom} confidentialite`);
  await capturer(`Confidentialite${suffixe}`, `${nom} confidentialite`);

  await navigateur.close();
}

// -------------------------------------------------------------------- bilan

for (const cible of CIBLES) {
  await passerLaCible(cible);
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
