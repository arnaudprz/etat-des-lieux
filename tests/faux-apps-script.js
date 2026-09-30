/**
 * Un Google Apps Script en miniature, pour exécuter worker/*.gs dans Node.
 *
 * Les fichiers .gs sont du JavaScript ordinaire qui s'appuie sur des objets
 * globaux fournis par Google. On les remplace ici par des doublures en mémoire,
 * ce qui permet de tester la validation et l'import sans déployer quoi que ce soit.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Une feuille de calcul en mémoire. */
function creerFeuille(nom) {
  const lignes = [];
  return {
    nom,
    lignes,
    appendRow(valeurs) { lignes.push(valeurs.slice()); },
    getLastRow() { return lignes.length; },
    getDataRange() {
      return { getValues() { return lignes.map((l) => l.slice()); } };
    },
  };
}

/**
 * Prépare un environnement complet et y charge tous les fichiers du worker.
 * @param {object} options.proprietes Script Properties de départ.
 * @returns le contexte, avec toutes les fonctions du worker et le faux classeur.
 */
export function chargerWorker(options = {}) {
  const feuilles = new Map();
  const proprietes = { ...(options.proprietes || {}) };
  const cache = new Map();
  const journal = [];
  let compteurUuid = 0;

  const classeur = {
    getSheetByName: (n) => feuilles.get(n) || null,
    insertSheet(n) {
      const f = creerFeuille(n);
      feuilles.set(n, f);
      return f;
    },
  };

  const contexte = {
    console,
    Date,
    Math,
    JSON,
    Number,
    String,
    Object,
    Array,
    isFinite,
    RegExp,

    SpreadsheetApp: { getActiveSpreadsheet: () => classeur },

    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (c) => (c in proprietes ? proprietes[c] : null),
        setProperty: (c, v) => { proprietes[c] = v; },
      }),
    },

    CacheService: {
      getScriptCache: () => ({
        get: (c) => (cache.has(c) ? cache.get(c) : null),
        put: (c, v) => { cache.set(c, v); },
        remove: (c) => { cache.delete(c); },
      }),
    },

    Utilities: {
      getUuid: () => `uuid-${++compteurUuid}`,
      formatDate: (d, _zone, motif) => {
        const iso = new Date(d).toISOString();
        return motif === 'yyyy-MM-dd' ? iso.slice(0, 10) : iso;
      },
    },

    Logger: { log: (m) => journal.push(String(m)) },

    ContentService: {
      MimeType: { JSON: 'JSON', TEXT: 'TEXT', CSV: 'CSV' },
      createTextOutput(s) {
        const sortie = {
          contenu: s,
          type: null,
          fichier: null,
          setMimeType(t) { sortie.type = t; return sortie; },
          downloadAsFile(n) { sortie.fichier = n; return sortie; },
          getContent() { return sortie.contenu; },
        };
        return sortie;
      },
    },
  };

  vm.createContext(contexte);

  // contenu.gs d'abord : les autres fichiers s'appuient sur ses constantes.
  const dossier = join(racine, 'worker');
  const fichiers = readdirSync(dossier).filter((f) => f.endsWith('.gs'));
  const ordonnes = ['contenu.gs', 'Code.gs'].concat(
    fichiers.filter((f) => f !== 'contenu.gs' && f !== 'Code.gs').sort()
  );

  ordonnes.forEach((f) => {
    vm.runInContext(readFileSync(join(dossier, f), 'utf8'), contexte, { filename: f });
  });

  contexte.__feuilles = feuilles;
  contexte.__journal = journal;
  contexte.__proprietes = proprietes;
  contexte.__cache = cache;

  /** Les lignes d'un onglet, en objets, pour les assertions. */
  contexte.__lignes = (nom) => {
    const f = feuilles.get(nom);
    if (!f || f.lignes.length < 2) return [];
    const [entetes, ...reste] = f.lignes;
    return reste.map((l) => Object.fromEntries(entetes.map((c, i) => [c, l[i]])));
  };

  /** Simule un POST du front. */
  contexte.__post = (charge) =>
    JSON.parse(
      contexte.doPost({ postData: { contents: JSON.stringify(charge) } }).getContent()
    );

  /** Simule un GET. */
  contexte.__get = (parametres) => {
    const sortie = contexte.doGet({ parameter: parametres });
    return sortie.type === 'JSON' ? JSON.parse(sortie.getContent()) : sortie;
  };

  return contexte;
}

/** Un jeu de réponses valide : 16 entiers de 0 à 3. */
export const REPONSES = [2, 2, 1, 1, 2, 2, 0, 0, 2, 3, 2, 2, 2, 2, 2, 1];

/** Un profil valide, repris des choix de contenu.json. */
export const PROFIL = {
  role: "Un membre de l'équipe",
  genre: 'Une femme',
  taille_entreprise: '50 à 299 salariés',
  secteur: 'Santé',
  taille_equipe: '6 à 12 personnes',
};

/** Une réponse complète prête à envoyer. */
export function reponseValide(extra = {}) {
  return {
    action: 'reponse',
    version: 'v1',
    role: 'membre',
    profil: { ...PROFIL },
    reponses: REPONSES.slice(),
    relances: {},
    ...extra,
  };
}
