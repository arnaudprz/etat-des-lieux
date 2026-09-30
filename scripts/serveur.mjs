/**
 * Serveur local de développement.
 *
 * Sert docs/ en interdisant toute mise en cache : sans cela, Safari garde un
 * ancien fichier JavaScript avec un nouveau HTML, et on teste une version qui
 * n'existe plus.
 *
 * Aucune dépendance. Usage :
 *   node scripts/serveur.mjs [port]
 */

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, normalize, extname } from 'node:path';
import { networkInterfaces } from 'node:os';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs');
const port = Number(process.argv[2] || 8080);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

/** Empêche de sortir de docs/ avec des « .. ». */
function chemin(url) {
  const sansRequete = decodeURIComponent(url.split('?')[0]);
  const propre = normalize(sansRequete).replace(/^(\.\.[/\\])+/, '');
  return join(racine, propre);
}

async function fichier(chemin) {
  try {
    const infos = await stat(chemin);
    if (infos.isDirectory()) return fichier(join(chemin, 'index.html'));
    return { contenu: await readFile(chemin), type: TYPES[extname(chemin)] || 'application/octet-stream' };
  } catch (e) {
    return null;
  }
}

const serveur = createServer(async (requete, reponse) => {
  const trouve = await fichier(chemin(requete.url));

  // Jamais de cache : le test local doit toujours montrer la dernière version.
  reponse.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  reponse.setHeader('Pragma', 'no-cache');
  reponse.setHeader('Expires', '0');

  if (!trouve) {
    reponse.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    reponse.end('Introuvable');
    return;
  }

  reponse.writeHead(200, { 'Content-Type': trouve.type });
  reponse.end(trouve.contenu);
});

/** L'adresse à ouvrir depuis un téléphone sur le même réseau. */
function adresseReseau() {
  const interfaces = networkInterfaces();
  for (const cartes of Object.values(interfaces)) {
    for (const carte of cartes || []) {
      if (carte.family === 'IPv4' && !carte.internal) return carte.address;
    }
  }
  return null;
}

serveur.listen(port, () => {
  const reseau = adresseReseau();
  console.log(`État des lieux, version locale, sans cache :`);
  console.log(`  ordinateur : http://127.0.0.1:${port}/`);
  if (reseau) console.log(`  téléphone  : http://${reseau}:${port}/`);
  console.log(`  tableau de bord : http://127.0.0.1:${port}/admin/`);
});
