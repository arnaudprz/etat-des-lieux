/**
 * La barre de filtres.
 *
 * Construit les listes déroulantes depuis contenu.json et prévient à chaque
 * changement : tout le tableau de bord se recalcule alors.
 */

import { filtresVides } from './agregats.js';
import { el, vider } from '../parcours/commun.js';

/** Les filtres, dans l'ordre d'affichage. */
function definitions(contenu) {
  const p = contenu.profil;
  return [
    {
      cle: 'source', intitule: 'Source',
      options: [['toutes', 'Toutes'], ['en_ligne', 'En ligne'], ['papier', 'Papier']],
    },
    {
      cle: 'periode', intitule: 'Période',
      options: [['tout', 'Depuis le lancement'], ['30', '30 derniers jours'], ['7', '7 derniers jours']],
    },
    {
      cle: 'role', intitule: 'Rôle',
      options: [['tous', 'Tous'], ['manager', 'Managers'], ['membre', 'Membres']],
    },
    {
      cle: 'taille_entreprise', intitule: "Taille d'entreprise",
      options: [['toutes', 'Toutes']].concat(p.taille_entreprise.choix.map((c) => [c, c])),
    },
    {
      cle: 'secteur', intitule: 'Secteur',
      options: [['tous', 'Tous les secteurs']].concat(p.secteur.choix.map((c) => [c, c])),
    },
    {
      cle: 'genre', intitule: 'Genre',
      options: [['tous', 'Tous']]
        .concat(p.genre.choix.map((c) => [c, c]))
        .concat([['sans_reponse', 'Sans réponse']]),
    },
    {
      cle: 'taille_equipe', intitule: "Taille d'équipe",
      options: [['toutes', 'Toutes']].concat(p.taille_equipe.choix.map((c) => [c, c])),
    },
  ];
}

/**
 * Installe la barre de filtres.
 * @param {HTMLElement} hote
 * @param {object} contenu
 * @param {(filtres: object) => void} surChangement
 * @returns {{etat: object, reinitialiser: Function}}
 */
export function installerFiltres(hote, contenu, surChangement) {
  const etat = filtresVides();
  const champs = [];
  vider(hote);

  definitions(contenu).forEach((d) => {
    const liste = el('select', {
      classe: 'filtre__liste',
      attrs: { id: `filtre-${d.cle}`, name: d.cle },
    });
    d.options.forEach(([valeur, libelle]) => {
      liste.appendChild(el('option', { texte: libelle, attrs: { value: valeur } }));
    });
    liste.value = etat[d.cle];
    liste.addEventListener('change', () => {
      etat[d.cle] = liste.value;
      surChangement({ ...etat });
    });
    champs.push({ definition: d, liste });

    hote.appendChild(
      el('div', { classe: 'filtre' }, [
        el('label', { classe: 'filtre__intitule', texte: d.intitule, attrs: { for: `filtre-${d.cle}` } }),
        liste,
      ])
    );
  });

  return {
    etat,
    reinitialiser() {
      const vide = filtresVides();
      champs.forEach(({ definition, liste }) => {
        etat[definition.cle] = vide[definition.cle];
        liste.value = vide[definition.cle];
      });
      surChangement({ ...etat });
    },
  };
}
