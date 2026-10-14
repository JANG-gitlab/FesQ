import oeil from 'pixelarticons/svg/eye.svg?raw';
import cadenas from 'pixelarticons/svg/lock.svg?raw';
import bouclier from 'pixelarticons/svg/shield.svg?raw';
import insecte from 'pixelarticons/svg/bug.svg?raw';
import loupe from 'pixelarticons/svg/search.svg?raw';
import foule from 'pixelarticons/svg/users.svg?raw';
import alerte from 'pixelarticons/svg/square-alert.svg?raw';
import eclair from 'pixelarticons/svg/zap.svg?raw';
import courrier from 'pixelarticons/svg/mail.svg?raw';
import son from 'pixelarticons/svg/volume-2.svg?raw';
import muet from 'pixelarticons/svg/volume-x.svg?raw';
import bas from 'pixelarticons/svg/chevron-down.svg?raw';
import crane from 'pixelarticons/svg/skull.svg?raw';
import cible from 'pixelarticons/svg/target.svg?raw';
import arbre from 'pixelarticons/svg/tree.svg?raw';
import terminal from 'pixelarticons/svg/terminal.svg?raw';
import cle from 'pixelarticons/svg/key.svg?raw';
import code from 'pixelarticons/svg/code.svg?raw';

const SOURCES = { oeil, cadenas, bouclier, insecte, loupe, foule, alerte, eclair, courrier, son, muet, bas, crane, cible, arbre, terminal, cle, code };

export const ICONES = Object.fromEntries(Object.entries(SOURCES).map(([nom, svg]) => {
  const chemins = [...svg.matchAll(/ d="([^"]+)"/g)].map((m) => new Path2D(m[1]));
  const toile = document.createElement('canvas');
  toile.width = toile.height = 24;
  const ctx = toile.getContext('2d');
  ctx.fillStyle = '#fff';
  for (const c of chemins) ctx.fill(c);
  return [nom, toile];
}));

export function dessinerIcone(ctx, nom, x, y, taille) {
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(ICONES[nom], Math.round(x), Math.round(y), taille, taille);
}
