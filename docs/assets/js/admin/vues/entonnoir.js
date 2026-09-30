/**
 * L'entonnoir : du premier clic à l'état des lieux.
 *
 * Il repose sur les événements de visite, qui ne portent aucun profil : ni rôle,
 * ni secteur, ni taille. Seule la période peut donc s'y appliquer. La section le
 * dit sous son titre, et disparaît quand on ne regarde que le papier, qui n'a
 * jamais eu de parcours en ligne.
 */

import { el, vider } from '../../parcours/commun.js';
import { ligneBarre, nombre } from './briques.js';

export function afficherEntonnoir(hote, entonnoir, nombreContacts) {
  vider(hote);

  const etapes = [
    { libelle: 'Visites de la page', valeur: entonnoir.visite, couleur: 'var(--enracine)' },
    { libelle: 'Questionnaires commencés', valeur: entonnoir.commence, couleur: 'var(--enracine)' },
    { libelle: 'Questionnaires terminés', valeur: entonnoir.termine, couleur: 'var(--enracine)' },
    { libelle: 'Liens personnels copiés', valeur: entonnoir.lien_copie, couleur: 'var(--croissance)' },
    { libelle: 'Pages gardées', valeur: entonnoir.garder_page, couleur: 'var(--croissance)' },
    { libelle: "Partages de l'accueil", valeur: entonnoir.partage_accueil, couleur: 'var(--croissance)' },
    { libelle: "Demandes de l'étude complète", valeur: nombreContacts, couleur: 'var(--croissance)' },
  ];

  const haut = Math.max(1, ...etapes.map((e) => e.valeur || 0));

  etapes.forEach((e) => {
    const valeur = e.valeur || 0;
    hote.appendChild(
      el('div', { classe: 'entonnoir__ligne' }, [
        ligneBarre(e.libelle, (valeur / haut) * 100, nombre(valeur), {
          couleur: e.couleur,
          titre: `${e.libelle} : ${nombre(valeur)}`,
        }),
      ])
    );
  });
}
