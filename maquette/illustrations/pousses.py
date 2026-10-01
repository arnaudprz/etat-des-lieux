"""Illustrations des 4 niveaux : de la graine semée à l'arbre bien enraciné."""

FORET = '#3F4F35'; SAUGE = '#8FA878'; SABLE = '#E3CF9E'; TERRE = '#A9743A'
TIGE = '#5A6B4D'; TERRE_F = '#7A5424'; BOIS = '#5E4B38'
NOMS = ['À semer', 'En germe', 'En croissance', 'Bien enraciné']
CLES = ['semer', 'germe', 'croissance', 'enracine']


def leaf(x, y, w, h, rot, fill, stroke=None):
    s = f' stroke="{stroke}" stroke-width="1.5"' if stroke else ''
    return (f'<ellipse cx="0" cy="{-h/2}" rx="{w/2}" ry="{h/2}" fill="{fill}"{s} '
            f'transform="translate({x} {y}) rotate({rot})"/>')


def stage(k, x, g):
    """Dessine le niveau k (0 à semer … 3 bien enraciné), pied en (x, g)."""
    p = []
    if k == 0:
        p.append(f'<ellipse cx="{x}" cy="{g+26}" rx="11" ry="8" fill="{TERRE}" transform="rotate(-20 {x} {g+26})"/>')
        p.append(f'<path d="M{x-18} {g+4} q 8 -6 16 0 M{x+4} {g+6} q 8 -5 14 0" stroke="#CDBB9C" stroke-width="2" fill="none" stroke-linecap="round"/>')
    elif k == 1:
        p.append(f'<ellipse cx="{x}" cy="{g+26}" rx="10" ry="7" fill="{TERRE}" opacity=".55"/>')
        p.append(f'<path d="M{x} {g+20} C {x} {g+4}, {x-2} {g-14}, {x} {g-34}" stroke="{TIGE}" stroke-width="3.5" fill="none" stroke-linecap="round"/>')
        p.append(leaf(x, g-30, 14, 26, -55, SABLE, TERRE_F))
        p.append(leaf(x, g-32, 14, 26, 50, SABLE, TERRE_F))
        p.append(f'<path d="M{x} {g+20} q -8 10 -14 12 M{x} {g+20} q 7 9 12 10" stroke="{TERRE_F}" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".6"/>')
    elif k == 2:
        p.append(f'<path d="M{x} {g} C {x+2} {g-40}, {x-3} {g-80}, {x} {g-122}" stroke="{TIGE}" stroke-width="4.5" fill="none" stroke-linecap="round"/>')
        for (yy, rot, w, h) in [(g-40, -58, 18, 38), (g-52, 60, 18, 40), (g-82, -50, 20, 44), (g-94, 54, 20, 44), (g-118, -12, 18, 40)]:
            p.append(leaf(x, yy, w, h, rot, SAUGE))
        p.append(f'<path d="M{x} {g+2} q -10 16 -24 22 M{x} {g+2} q 2 18 -2 30 M{x} {g+2} q 10 14 22 18" stroke="{TIGE}" stroke-width="2" fill="none" stroke-linecap="round" opacity=".7"/>')
    else:
        p.append(f'<path d="M{x-9} {g} C {x-6} {g-50}, {x-8} {g-90}, {x-4} {g-120} L {x+6} {g-120} C {x+9} {g-90}, {x+8} {g-50}, {x+11} {g} Z" fill="{BOIS}"/>')
        p.append(f'<path d="M{x} {g-96} q -20 -14 -34 -30 M{x+2} {g-104} q 18 -12 30 -30" stroke="{BOIS}" stroke-width="5" fill="none" stroke-linecap="round"/>')
        for (cx, cy, r) in [(x-36, g-150, 34), (x+34, g-150, 34), (x, g-184, 42), (x-8, g-140, 36), (x+18, g-128, 26), (x-30, g-122, 22)]:
            p.append(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{FORET}"/>')
        for (cx, cy, r) in [(x-14, g-196, 12), (x+22, g-170, 9), (x-40, g-160, 8)]:
            p.append(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="#55694A"/>')
        p.append(f'<path d="M{x+1} {g} q -18 22 -46 30 M{x+1} {g} q -6 26 -20 44 M{x+1} {g} q 4 28 2 50 M{x+1} {g} q 14 24 34 36 M{x+1} {g} q 22 14 50 16" stroke="{FORET}" stroke-width="3" fill="none" stroke-linecap="round"/>')
    return ''.join(p)


def svg(width=520, height=420, labels=True):
    W, H = 520, 420
    g = 292
    parts = [f'<rect x="0" y="0" width="{W}" height="{H}" rx="24" fill="#EEF1EA"/>',
             f'<circle cx="96" cy="84" r="30" fill="{SABLE}" opacity=".55"/>',
             f'<path d="M0 {g} Q 130 {g-10} 260 {g} T 520 {g} V {H} H 0 Z" fill="#E6DBC8"/>',
             f'<path d="M0 {g} Q 130 {g-10} 260 {g} T 520 {g}" fill="none" stroke="#CDBB9C" stroke-width="2"/>']
    for k, x in enumerate([65, 180, 305, 445]):
        parts.append(stage(k, x, g))
    if labels:
        for (cx, name, bg, fg) in [(65, 'À semer', TERRE, '#1A1A1A'), (180, 'En germe', SABLE, '#1A1A1A'), (305, 'En croissance', SAUGE, '#1A1A1A'), (445, 'Bien enraciné', FORET, '#FFFFFF')]:
            wpx = 7.6 * len(name) + 22
            parts.append(f'<rect x="{cx - wpx/2}" y="372" width="{wpx}" height="30" rx="15" fill="{bg}"/>')
            parts.append(f'<text x="{cx}" y="392" text-anchor="middle" font-family="DM Sans, sans-serif" font-size="13" font-weight="500" fill="{fg}">{name}</text>')
    return (f'<svg viewBox="0 0 {W} {H}" width="{width}" height="{height}" role="img" '
            f'aria-label="Quatre pousses, de la graine semée à l\'arbre bien enraciné : les quatre couleurs de l\'état des lieux" '
            f'style="display: block; max-width: 100%; height: auto">' + ''.join(parts) + '</svg>')


def scene(k, width=200, height=200):
    """Une seule pousse, dans une petite scène ronde (pour la carte d'ensemble)."""
    W = H = 240
    g = [150, 176, 180, 184][k]
    parts = [f'<circle cx="120" cy="120" r="118" fill="#F7F4EF"/>',
             f'<clipPath id="c{k}"><circle cx="120" cy="120" r="118"/></clipPath>',
             f'<g clip-path="url(#c{k})">',
             f'<circle cx="62" cy="62" r="18" fill="{SABLE}" opacity=".6"/>',
             f'<path d="M0 {g} Q 60 {g-8} 120 {g} T 240 {g} V 240 H 0 Z" fill="#E6DBC8"/>',
             f'<path d="M0 {g} Q 60 {g-8} 120 {g} T 240 {g}" fill="none" stroke="#CDBB9C" stroke-width="2"/>']
    if k == 3:
        parts.append(f'<g transform="translate(120 {g}) scale(.68) translate(-445 -292)">{stage(3, 445, 292)}</g>')
    elif k == 2:
        parts.append(f'<g transform="translate(120 {g}) scale(.9) translate(-305 -292)">{stage(2, 305, 292)}</g>')
    elif k == 1:
        parts.append(f'<g transform="translate(120 {g}) scale(1.5) translate(-180 -292)">{stage(1, 180, 292)}</g>')
    else:
        parts.append(f'<g transform="translate(120 {g}) scale(2) translate(-65 -292)">{stage(0, 65, 292)}</g>')
    parts.append('</g>')
    return (f'<svg viewBox="0 0 {W} {H}" width="{width}" height="{height}" aria-hidden="true" '
            f'style="display: block; flex-shrink: 0">' + ''.join(parts) + '</svg>')


def icone(k, size=36):
    """Petite pousse dans un rond crème, pour l'en-tête d'une colonne."""
    W = H = 100
    # La graine (k = 0) remonte et rétrécit : à 52 et 1.5, elle tombait vers
    # y = 91 et le cercle de rayon 48 la coupait par le bas.
    g = [48, 74, 76, 76][k]
    sc = [1.2, 0.95, 0.5, 0.29][k]
    x0 = [65, 180, 305, 445][k]
    body = f'<g transform="translate(50 {g}) scale({sc}) translate({-x0} -292)">{stage(k, x0, 292)}</g>'
    return (f'<svg viewBox="0 0 {W} {H}" width="{size}" height="{size}" aria-hidden="true" style="display: block; flex-shrink: 0">'
            f'<circle cx="50" cy="50" r="50" fill="#F7F4EF"/>'
            f'<clipPath id="i{k}"><circle cx="50" cy="50" r="48"/></clipPath><g clip-path="url(#i{k})">'
            f'<rect x="0" y="{g}" width="100" height="40" fill="#E6DBC8"/>{body}</g></svg>')


# Ordre des niveaux, de la graine à l'arbre : nom des fichiers icone-*.svg.
NIVEAUX = ['semer', 'germe', 'croissance', 'enracine']


def fichier_icone(k):
    """Une icône autonome, telle qu'écrite dans icone-*.svg."""
    return icone(k, 100).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ', 1)


if __name__ == '__main__':
    open('pousses.svg', 'w').write(svg())
    # À recopier ensuite dans docs/assets/img/.
    for k, nom in enumerate(NIVEAUX):
        open(f'icone-{nom}.svg', 'w').write(fichier_icone(k))
    html = '<body style="margin:20px;background:#3F4F35;display:flex;gap:20px;flex-wrap:wrap">'
    html += ''.join(scene(k) for k in range(4)) + ''.join(icone(k, 72) for k in range(4))
    open('scenes.html', 'w').write(html)
