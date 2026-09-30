/**
 * Qui a répondu : totaux en ligne et papier, barres empilées par critère,
 * classement des secteurs.
 */

import { el, vider } from '../../parcours/commun.js';
import { repartitionProfil, classementSecteurs, assezDeMonde } from '../agregats.js';
import { barreEmpilee, legendeChiffree, ligneBarre, nombre, part, rangee, tropPetit } from './briques.js';

/** Dégradé de sauge, du plus foncé au plus clair, pour les barres de profil. */
const TEINTES = ['#3F4F35', '#6B7D5C', '#8FA878', '#B5C4A6', '#D5DECB', '#EEF1EA', '#F7F4EF'];

function habiller(tranches) {
  return tranches.map((t, i) => ({
    ...t,
    couleur: TEINTES[i % TEINTES.length],
    texte: i < 2 ? '#FFFFFF' : '#1A1A1A',
  }));
}

function critere(hote, libelle, tranches) {
  if (tranches.length === 0) return;
  const habillees = habiller(tranches);
  hote.appendChild(
    rangee(libelle, [
      barreEmpilee(habillees, libelle),
      legendeChiffree(habillees),
    ])
  );
}

export function afficherRepondants(hote, reponses, contenu) {
  vider(hote);

  const enLigne = reponses.filter((r) => r.source === 'en_ligne').length;
  const papier = reponses.filter((r) => r.source === 'papier').length;

  const totaux = el('div', { classe: 'totaux' });
  totaux.appendChild(
    el('div', { classe: 'total' }, [
      el('span', { classe: 'total__valeur serif', texte: nombre(enLigne) }),
      el('span', { classe: 'total__libelle', texte: 'réponses en ligne' }),
    ])
  );
  totaux.appendChild(
    el('div', { classe: 'total' }, [
      el('span', { classe: 'total__valeur serif', texte: nombre(papier) }),
      el('span', {
        classe: 'total__libelle',
        texte: papier > 0 ? 'réponses papier importées' : 'réponses papier importées, la saisie reste à faire',
      }),
    ])
  );
  hote.appendChild(totaux);

  hote.appendChild(
    el('p', {
      classe: 'section-admin__soustitre',
      texte: `Profil des ${nombre(reponses.length)} répondants retenus par les filtres. `
        + "Pour chaque critère : le nombre de personnes, puis leur part. "
        + `Un groupe de moins de 3 personnes n'est jamais affiché seul.`,
    })
  );

  if (!assezDeMonde(reponses.length)) {
    hote.appendChild(tropPetit());
    return;
  }

  const p = contenu.profil;
  critere(hote, 'Rôle', [
    { libelle: 'Membres', effectif: reponses.filter((r) => r.role === 'membre').length },
    { libelle: 'Managers', effectif: reponses.filter((r) => r.role === 'manager').length },
  ].filter((t) => t.effectif > 0).map((t) => ({ ...t, part: Math.round((t.effectif / reponses.length) * 100) })));

  critere(hote, 'Genre', repartitionProfil(reponses, 'genre', p.genre.choix));
  critere(hote, "Taille d'entreprise", repartitionProfil(reponses, 'taille_entreprise', p.taille_entreprise.choix));
  critere(hote, "Taille d'équipe", repartitionProfil(reponses, 'taille_equipe', p.taille_equipe.choix));

  const secteurs = classementSecteurs(reponses);
  const haut = Math.max(1, ...secteurs.map((s) => s.effectif));
  hote.appendChild(
    rangee('Secteur', secteurs.map((s) =>
      ligneBarre(s.libelle, (s.effectif / haut) * 100, `${nombre(s.effectif)} · ${part(s.part)}`, {
        titre: `${s.libelle} : ${nombre(s.effectif)} (${part(s.part)})`,
      })
    ))
  );
}
