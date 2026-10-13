/**
 * Les chiffres d'un solo (13 octobre 2026, Arnaud : « on ne va pas montrer des chiffres d'équipes à un solopreneur »).
 * Un solo ne voit que des chiffres d'indépendants, jamais ceux des équipes. Chaque case s'affiche dès qu'elle compte au
 * moins MINI personnes ; sinon, une phrase dit que le chiffre arrive. Pas de seuil global.
 */
export const MINI = 3;

/** Les chiffres d'indépendants quand il n'y en a pas encore (ou que la base ne sait pas encore filtrer par rôle). */
export const VIDE_SOLO = Object.freeze({ ok: true, role: 'solo', n: 0, groupes: {}, questions: {}, intensites: null });

/** Une case (n, engages, perf) assez remplie pour s'afficher. */
export const caseSolo = (c) => !!c && (c.n || 0) >= MINI && c.engages != null;

/** Les chiffres à montrer à un solo : ceux des solos, ou rien ; jamais ceux d'un autre rôle. */
export const chiffresPourSolo = (d) => (d && d.role === 'solo' ? d : VIDE_SOLO);
