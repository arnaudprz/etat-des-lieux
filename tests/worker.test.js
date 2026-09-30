/**
 * Tests du backend Apps Script, exécutés dans une doublure en mémoire.
 * node --test tests/
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { chargerWorker, reponseValide, REPONSES, PROFIL } from './faux-apps-script.js';

const CLE = 'clef-de-test-0123456789';

let w;
beforeEach(() => {
  w = chargerWorker({ proprietes: { ADMIN_KEY: CLE } });
});

// ------------------------------------------------------- enregistrer une réponse

describe('enregistrement d’une réponse', () => {
  test('une réponse valide est écrite avec la bonne source', () => {
    assert.deepEqual(w.__post(reponseValide()), { ok: true });
    const l = w.__lignes('reponses');
    assert.equal(l.length, 1);
    assert.equal(l[0].source, 'en_ligne');
    assert.equal(l[0].role, 'membre');
    assert.equal(l[0].secteur, 'Santé');
    assert.equal(Number(l[0].q1), 2);
    assert.equal(Number(l[0].q16), 1);
  });

  test('l’identifiant n’a aucun lien avec les réponses', () => {
    w.__post(reponseValide());
    const id = String(w.__lignes('reponses')[0].id);
    assert.ok(id.length > 0);
    assert.ok(!id.includes('2'), 'l’identifiant ne doit pas porter les réponses');
  });

  test('refuse une version inconnue', () => {
    assert.equal(w.__post(reponseValide({ version: 'v9' })).ok, false);
    assert.equal(w.__lignes('reponses').length, 0);
  });

  test('refuse un rôle inconnu', () => {
    assert.equal(w.__post(reponseValide({ role: 'patron' })).ok, false);
  });

  test('refuse un nombre de réponses différent de 16', () => {
    assert.equal(w.__post(reponseValide({ reponses: REPONSES.slice(0, 15) })).ok, false);
    assert.equal(w.__post(reponseValide({ reponses: REPONSES.concat([1]) })).ok, false);
  });

  test('refuse une réponse hors de 0 à 3', () => {
    const trop = REPONSES.slice(); trop[3] = 4;
    assert.equal(w.__post(reponseValide({ reponses: trop })).ok, false);
    const negatif = REPONSES.slice(); negatif[3] = -1;
    assert.equal(w.__post(reponseValide({ reponses: negatif })).ok, false);
    const decimal = REPONSES.slice(); decimal[3] = 1.5;
    assert.equal(w.__post(reponseValide({ reponses: decimal })).ok, false);
  });

  test('refuse un secteur inventé', () => {
    const p = { ...PROFIL, secteur: 'Marchand de sable' };
    assert.equal(w.__post(reponseValide({ profil: p })).ok, false);
  });

  test('refuse un profil incomplet', () => {
    const p = { ...PROFIL };
    delete p.taille_equipe;
    assert.equal(w.__post(reponseValide({ profil: p })).ok, false);
  });

  test('accepte un genre absent, qui est facultatif', () => {
    const p = { ...PROFIL };
    delete p.genre;
    assert.equal(w.__post(reponseValide({ profil: p })).ok, true);
    assert.equal(w.__lignes('reponses')[0].genre, '');
  });

  test('refuse un genre inventé', () => {
    const p = { ...PROFIL, genre: 'Autre chose' };
    assert.equal(w.__post(reponseValide({ profil: p })).ok, false);
  });

  test('refuse une action inconnue', () => {
    assert.equal(w.__post({ action: 'tout_effacer' }).ok, false);
  });

  test('une réponse en ligne porte l’échelle d’évolution', () => {
    w.__post(reponseValide());
    assert.equal(w.__lignes('reponses')[0].echelle, 'v2-evolution');
  });
});

// ------------------------------------------------------------------ relances

describe('validation des relances', () => {
  /** Q7 et Q8 valent 0 dans le jeu de référence : elles peuvent être relancées. */
  test('accepte deux relances de deux choix', () => {
    const r = reponseValide({ relances: { 7: [0, 2], 8: [1, 'autre'] } });
    assert.equal(w.__post(r).ok, true);
    const l = w.__lignes('reponses')[0];
    assert.equal(l.relance_q7, '0|2');
    assert.equal(l.relance_q8, '1|autre');
  });

  test('accepte autant de relances qu’il y a de réponses réservées', () => {
    // Les 16 à « Pas encore » : les 16 relances doivent passer.
    const relances = {};
    for (let n = 1; n <= 16; n += 1) relances[n] = [0];
    const r = reponseValide({ reponses: new Array(16).fill(0), relances });
    assert.equal(w.__post(r).ok, true);
    const l = w.__lignes('reponses')[0];
    for (let n = 1; n <= 16; n += 1) assert.equal(l['relance_q' + n], '0');
  });

  test('refuse plus de 16 relances', () => {
    const relances = {};
    for (let n = 1; n <= 16; n += 1) relances[n] = [0];
    relances[17] = [0];
    const r = reponseValide({ reponses: new Array(16).fill(0), relances });
    assert.equal(w.__post(r).ok, false);
  });

  test('refuse plus de 2 choix dans une relance', () => {
    assert.equal(w.__post(reponseValide({ relances: { 7: [0, 1, 2] } })).ok, false);
  });

  test('refuse une relance sur une affirmation qui n’est pas réservée', () => {
    // Q10 vaut 3 : elle ne peut pas porter de relance.
    assert.equal(w.__post(reponseValide({ relances: { 10: [0] } })).ok, false);
  });

  test('refuse un indice de choix qui n’existe pas', () => {
    // La relance du Q8 propose 5 choix, l'indice 5 est hors liste.
    assert.equal(w.__post(reponseValide({ relances: { 8: [5] } })).ok, false);
  });

  test('refuse deux fois le même choix', () => {
    assert.equal(w.__post(reponseValide({ relances: { 7: [1, 1] } })).ok, false);
  });

  test('accepte l’absence de relance', () => {
    assert.equal(w.__post(reponseValide({ relances: {} })).ok, true);
    assert.equal(w.__post(reponseValide({ relances: null })).ok, true);
  });

  test('la relance de l’affirmation 16 est acceptée', () => {
    const bas = REPONSES.slice(); bas[15] = 0;
    const r = reponseValide({ reponses: bas, relances: { 16: [0] } });
    assert.equal(w.__post(r).ok, true);
    assert.equal(w.__lignes('reponses')[0].relance_q16, '0');
  });
});

// ------------------------------------------------------------------ événements

describe('événements d’entonnoir', () => {
  test('n’enregistre que la date, la visite et le type', () => {
    assert.equal(w.__post({ action: 'evenement', type: 'visite', session: 'abc' }).ok, true);
    const l = w.__lignes('evenements');
    assert.equal(l.length, 1);
    assert.deepEqual(Object.keys(l[0]), ['date', 'session', 'type']);
  });

  test('accepte le partage de l’accueil', () => {
    assert.equal(w.__post({ action: 'evenement', type: 'partage_accueil', session: 'abc' }).ok, true);
    assert.equal(w.__lignes('evenements')[0].type, 'partage_accueil');
  });

  test('le tableau de bord compte les partages de l’accueil', () => {
    w.__post({ action: 'evenement', type: 'partage_accueil', session: 'a' });
    w.__post({ action: 'evenement', type: 'partage_accueil', session: 'a' });
    w.__post({ action: 'evenement', type: 'partage_accueil', session: 'b' });
    const d = w.__get({ action: 'donnees', cle: CLE });
    // On compte les visites, pas les clics.
    assert.equal(d.entonnoir.partage_accueil, 2);
  });

  test('accepte le fait de garder la page', () => {
    assert.equal(w.__post({ action: 'evenement', type: 'garder_page', session: 'abc' }).ok, true);
    assert.equal(w.__lignes('evenements')[0].type, 'garder_page');
  });

  test('refuse un type inconnu', () => {
    assert.equal(w.__post({ action: 'evenement', type: 'achat', session: 'abc' }).ok, false);
  });

  test('refuse un événement sans visite', () => {
    assert.equal(w.__post({ action: 'evenement', type: 'visite', session: '' }).ok, false);
  });
});

// -------------------------------------------------------------------- contacts

describe('demandes de l’étude complète', () => {
  const contact = {
    action: 'contact',
    prenom: 'Camille',
    nom: 'Durand',
    entreprise: 'Atelier du Nord',
    email: 'Camille@Atelier.FR',
    consentement: true,
  };

  test('enregistre un contact dans sa propre feuille', () => {
    assert.equal(w.__post(contact).ok, true);
    const l = w.__lignes('contacts');
    assert.equal(l.length, 1);
    assert.equal(l[0].email, 'camille@atelier.fr');
    assert.equal(l[0].consentement, 'oui');
  });

  test('le contact ne porte aucun identifiant de réponse ni de visite', () => {
    w.__post(contact);
    const colonnes = Object.keys(w.__lignes('contacts')[0]);
    assert.deepEqual(colonnes, ['date', 'prenom', 'nom', 'entreprise', 'email', 'consentement']);
    assert.ok(!colonnes.includes('id'));
    assert.ok(!colonnes.includes('session'));
  });

  test('refuse sans consentement', () => {
    assert.equal(w.__post({ ...contact, consentement: false }).ok, false);
    assert.equal(w.__lignes('contacts').length, 0);
  });

  test('refuse une adresse qui n’en est pas une', () => {
    assert.equal(w.__post({ ...contact, email: 'camille' }).ok, false);
  });

  test('refuse des coordonnées incomplètes', () => {
    assert.equal(w.__post({ ...contact, entreprise: '  ' }).ok, false);
  });

  test('le champ piège fait semblant d’accepter, sans rien écrire', () => {
    assert.equal(w.__post({ ...contact, site: 'https://spam.example' }).ok, true);
    assert.equal(w.__lignes('contacts').length, 0);
  });
});

// -------------------------------------------------------------------- compteur

describe('compteur', () => {
  test('part de la valeur de base tant qu’aucun papier n’est importé', () => {
    assert.equal(w.__get({ action: 'compteur' }).total, 255);
  });

  test('ajoute les réponses en ligne', () => {
    w.__post(reponseValide());
    w.__post(reponseValide());
    assert.equal(w.__get({ action: 'compteur' }).total, 257);
  });

  test('ne compte jamais deux fois le papier', () => {
    // 3 lignes papier importées remplacent la valeur de base, elles ne s'y ajoutent pas.
    w.preparerOngletPapier();
    for (let i = 1; i <= 3; i += 1) ajouterLignePapier(w, `P${i}`);
    w.importerPapier();
    assert.equal(w.__get({ action: 'compteur' }).total, 3);

    w.__post(reponseValide());
    assert.equal(w.__get({ action: 'compteur' }).total, 4);
  });

  test('la valeur de base est réglable', () => {
    const autre = chargerWorker({ proprietes: { ADMIN_KEY: CLE, PAPIER_BASE: '300' } });
    assert.equal(autre.__get({ action: 'compteur' }).total, 300);
  });
});

// ---------------------------------------------------------------- import papier

/** Ajoute une ligne dans l'onglet papier. */
function ajouterLignePapier(worker, ref, modifications = {}) {
  const colonnes = worker.colonnesPapier();
  const ligne = {
    ref_papier: ref,
    date: '2026-09-01',
    role: 'membre',
    genre: '',
    taille_entreprise: '',
    secteur: '',
    taille_equipe: '',
    ...modifications,
  };
  for (let i = 1; i <= 16; i += 1) {
    if (!(`q${i}` in ligne)) ligne[`q${i}`] = REPONSES[i - 1];
  }
  worker.__feuilles.get('papier').appendRow(colonnes.map((c) => (c in ligne ? ligne[c] : '')));
}

describe('import des réponses papier', () => {
  beforeEach(() => { w.preparerOngletPapier(); });

  test('importe les lignes valides avec la source papier', () => {
    ajouterLignePapier(w, 'P1');
    ajouterLignePapier(w, 'P2');
    const rapport = w.importerPapier();
    assert.match(rapport, /2 ligne\(s\) importée\(s\)/);
    const l = w.__lignes('reponses');
    assert.equal(l.length, 2);
    assert.equal(l[0].source, 'papier');
    assert.equal(l[0].ref_papier, 'P1');
  });

  test('relancer l’import ne crée aucun doublon', () => {
    ajouterLignePapier(w, 'P1');
    w.importerPapier();
    const rapport = w.importerPapier();
    assert.match(rapport, /0 ligne\(s\) importée\(s\), 1 déjà présente/);
    assert.equal(w.__lignes('reponses').length, 1);
  });

  test('une référence en double dans le même onglet n’est prise qu’une fois', () => {
    ajouterLignePapier(w, 'P1');
    ajouterLignePapier(w, 'P1');
    w.importerPapier();
    assert.equal(w.__lignes('reponses').length, 1);
  });

  test('les lignes papier gardent l’échelle d’accord', () => {
    ajouterLignePapier(w, 'P1');
    w.importerPapier();
    // Les 255 réponses papier ont été données avec les anciens mots, mais les
    // mêmes valeurs de 0 à 3.
    assert.equal(w.__lignes('reponses')[0].echelle, 'v1-accord');
  });

  test('le profil est facultatif sur papier', () => {
    ajouterLignePapier(w, 'P1');
    w.importerPapier();
    const l = w.__lignes('reponses')[0];
    assert.equal(l.secteur, '');
    assert.equal(l.genre, '');
  });

  test('un profil renseigné est vérifié', () => {
    ajouterLignePapier(w, 'P1', { secteur: 'Santé' });
    ajouterLignePapier(w, 'P2', { secteur: 'Inventé' });
    const rapport = w.importerPapier();
    assert.match(rapport, /1 ligne\(s\) importée\(s\)/);
    assert.match(rapport, /profil hors des choix connus/);
  });

  test('refuse une ligne sans référence', () => {
    ajouterLignePapier(w, '');
    const rapport = w.importerPapier();
    assert.match(rapport, /ref_papier manquante/);
    assert.equal(w.__lignes('reponses').length, 0);
  });

  test('refuse des réponses hors de 0 à 3', () => {
    ajouterLignePapier(w, 'P1', { q5: 7 });
    const rapport = w.importerPapier();
    assert.match(rapport, /réponses incomplètes ou hors de 0 à 3/);
    assert.equal(w.__lignes('reponses').length, 0);
  });

  test('reprend les relances papier et les vérifie', () => {
    ajouterLignePapier(w, 'P1', { relance_q7: '0|2' });
    ajouterLignePapier(w, 'P2', { relance_q10: '0' }); // Q10 vaut 3 : impossible
    const rapport = w.importerPapier();
    assert.match(rapport, /relances invalides/);
    assert.equal(w.__lignes('reponses').length, 1);
    assert.equal(w.__lignes('reponses')[0].relance_q7, '0|2');
  });
});

// ------------------------------------------------------------ accès protégés

describe('accès au tableau de bord', () => {
  test('refuse sans clé ou avec une mauvaise clé', () => {
    assert.equal(w.__get({ action: 'donnees' }).ok, false);
    assert.equal(w.__get({ action: 'donnees', cle: 'faux' }).ok, false);
    assert.equal(w.__get({ action: 'donnees', cle: CLE + 'x' }).ok, false);
  });

  test('accepte avec la bonne clé', () => {
    w.__post(reponseValide());
    const d = w.__get({ action: 'donnees', cle: CLE });
    assert.equal(d.ok, true);
    assert.equal(d.reponses.length, 1);
  });

  test('les données ne contiennent jamais d’identifiant de ligne', () => {
    w.__post(reponseValide());
    const d = w.__get({ action: 'donnees', cle: CLE });
    assert.ok(!('id' in d.reponses[0]), 'l’identifiant ne doit pas sortir');
  });

  test('les données ne contiennent jamais de contacts', () => {
    w.__post(reponseValide());
    w.__post({
      action: 'contact', prenom: 'Camille', nom: 'Durand',
      entreprise: 'Atelier', email: 'c@a.fr', consentement: true,
    });
    const d = w.__get({ action: 'donnees', cle: CLE });
    const brut = JSON.stringify(d);
    assert.ok(!brut.includes('Camille'), 'aucun nom ne doit apparaître');
    assert.ok(!brut.includes('c@a.fr'), 'aucune adresse ne doit apparaître');
    assert.equal(d.nombre_contacts, 1, 'seul le nombre est renvoyé');
  });

  test('le tableau de bord reçoit l’échelle de chaque ligne', () => {
    w.__post(reponseValide());
    const d = w.__get({ action: 'donnees', cle: CLE });
    assert.equal(d.reponses[0].echelle, 'v2-evolution');
  });

  test('les réponses sortent sous forme de tableau de 16 valeurs', () => {
    w.__post(reponseValide({ relances: { 7: [0, 'autre'] } }));
    const d = w.__get({ action: 'donnees', cle: CLE });
    assert.deepEqual(d.reponses[0].reponses, REPONSES);
    assert.deepEqual(d.reponses[0].relances, { 7: [0, 'autre'] });
  });

  test('l’entonnoir compte les visites, pas les lignes', () => {
    w.__post({ action: 'evenement', type: 'visite', session: 'a' });
    w.__post({ action: 'evenement', type: 'visite', session: 'a' });
    w.__post({ action: 'evenement', type: 'visite', session: 'b' });
    w.__post({ action: 'evenement', type: 'termine', session: 'a' });
    const d = w.__get({ action: 'donnees', cle: CLE });
    assert.equal(d.entonnoir.visite, 2);
    assert.equal(d.entonnoir.termine, 1);
  });
});

// ------------------------------------------------------- agrégats publics

describe('les agrégats publics', () => {
  /** Envoie n réponses identiques, avec le profil donné. */
  function envoyer(n, profil = {}, reponses = REPONSES) {
    for (let i = 0; i < n; i += 1) {
      w.__post(reponseValide({ profil: { ...PROFIL, ...profil }, reponses }));
    }
  }

  test('rien n’est publié sous 100 réponses', () => {
    envoyer(99);
    const a = w.__get({ action: 'agregats' });
    assert.equal(a.ok, true);
    assert.equal(a.ensemble, null);
  });

  test('à 100 réponses, l’ensemble est publié', () => {
    envoyer(100);
    const a = w.__get({ action: 'agregats' });
    assert.notEqual(a.ensemble, null);
    assert.equal(a.ensemble.effectif, 100);
    assert.equal(Object.keys(a.ensemble.dimensions).length, 8);
  });

  test('un segment sous 30 personnes n’est jamais publié', () => {
    envoyer(29, { secteur: 'Immobilier' });
    envoyer(100, { secteur: 'Santé' });
    const a = w.__get({ action: 'agregats' });
    const cles = Object.keys(a.segments);
    assert.ok(!cles.some((c) => c.startsWith('Immobilier')), cles.join(' | '));
    assert.ok(cles.some((c) => c.startsWith('Santé')), cles.join(' | '));
  });

  test('un segment de 30 personnes est publié', () => {
    envoyer(30, { secteur: 'Immobilier' });
    const a = w.__get({ action: 'agregats' });
    const cle = Object.keys(a.segments).find((c) => c.startsWith('Immobilier'));
    assert.ok(cle, Object.keys(a.segments).join(' | '));
    assert.equal(a.segments[cle].effectif, 30);
  });

  test('aucune réponse individuelle ne sort', () => {
    envoyer(100);
    const brut = JSON.stringify(w.__get({ action: 'agregats' }));
    assert.ok(!brut.includes('uuid'), 'un identifiant est sorti');
    assert.ok(!/"q1"|"date"|"genre"/.test(brut), 'un champ de ligne est sorti');
  });

  test('les parts vont de 0 à 1, jamais des effectifs bruts par niveau', () => {
    envoyer(100);
    const dims = w.__get({ action: 'agregats' }).ensemble.dimensions;
    Object.values(dims).forEach((parts) => {
      const somme = [0, 1, 2, 3].reduce((n, v) => n + (parts[v] || 0), 0);
      assert.ok(Math.abs(somme - 1) < 0.01, JSON.stringify(parts));
      [0, 1, 2, 3].forEach((v) => {
        assert.ok(parts[v] >= 0 && parts[v] <= 1, JSON.stringify(parts));
      });
    });
  });

  test('les réponses papier n’entrent pas dans la comparaison', () => {
    // Elles ont été recueillies avec une autre échelle de mots.
    w.preparerOngletPapier();
    for (let i = 1; i <= 120; i += 1) {
      const colonnes = w.colonnesPapier();
      const ligne = { ref_papier: `P${i}`, date: '2026-09-01', role: 'membre' };
      for (let n = 1; n <= 16; n += 1) ligne[`q${n}`] = REPONSES[n - 1];
      w.__feuilles.get('papier').appendRow(colonnes.map((c) => (c in ligne ? ligne[c] : '')));
    }
    w.importerPapier();
    const a = w.__get({ action: 'agregats' });
    assert.equal(a.ensemble, null, '120 réponses papier ne doivent rien publier');
  });

  test('l’accès est public : aucune clé demandée', () => {
    envoyer(100);
    assert.equal(w.__get({ action: 'agregats' }).ok, true);
  });
});

describe('export des contacts', () => {
  test('refuse sans la bonne clé', () => {
    const sortie = w.__get({ action: 'contacts_csv' });
    assert.equal(sortie.getContent(), 'Clé invalide.');
  });

  test('renvoie un CSV téléchargeable', () => {
    w.__post({
      action: 'contact', prenom: 'Camille', nom: 'Durand',
      entreprise: 'Atelier du Nord', email: 'c@a.fr', consentement: true,
    });
    const sortie = w.__get({ action: 'contacts_csv', cle: CLE });
    assert.equal(sortie.type, 'CSV');
    assert.equal(sortie.fichier, 'contacts-etat-des-lieux.csv');
    const l = sortie.getContent().split('\r\n');
    assert.equal(l[0], 'date,prenom,nom,entreprise,email,consentement');
    assert.match(l[1], /Camille,Durand,Atelier du Nord,c@a\.fr,oui$/);
  });

  test('échappe les virgules et les guillemets', () => {
    w.__post({
      action: 'contact', prenom: 'Camille', nom: 'Durand',
      entreprise: 'Durand, Martin & "Cie"', email: 'c@a.fr', consentement: true,
    });
    const csv = w.__get({ action: 'contacts_csv', cle: CLE }).getContent();
    assert.ok(csv.includes('"Durand, Martin & ""Cie"""'));
  });
});

// ------------------------------------------------------------------- débit

describe('limitation de débit', () => {
  test('refuse au-delà du plafond, sans rien écrire', () => {
    const petit = chargerWorker({ proprietes: { ADMIN_KEY: CLE, PLAFOND_PAR_MINUTE: '3' } });
    assert.equal(petit.__post(reponseValide()).ok, true);
    assert.equal(petit.__post(reponseValide()).ok, true);
    assert.equal(petit.__post(reponseValide()).ok, true);
    const refus = petit.__post(reponseValide());
    assert.equal(refus.ok, false);
    assert.match(refus.erreur, /Trop de requêtes/);
    assert.equal(petit.__lignes('reponses').length, 3);
  });
});
