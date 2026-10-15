import { dessinerIcone } from './icones.js';

export const CELLULE = { l: 6, h: 10 };

export const CHAPITRES = [
  { id: 'doxxing', icone: 'oeil', axe: [0, 1], texte: { x: 0.06, y: 0.5, l: 0.4 }, compact: { y: 0.1 }, visuel: { x: 0.2, y: 0 }, visuelCompact: { x: 0, y: 0.22 }, cadre: 'CAM_02 · COULOIR B · 03:12' },
  { id: 'fuites', icone: 'foule', axe: [1, 0], texte: { x: 0.57, y: 0.13, l: 0.38 }, compact: { y: 0.56 }, visuel: { x: -0.2, y: 0 }, visuelCompact: { x: 0, y: -0.2 }, cadre: 'PLACE NORD · FLUX CONTINU' },
  { id: 'virus', icone: 'insecte', axe: [-1, 0], texte: { x: 0.58, y: 0.48, l: 0.37 }, compact: { y: 0.1 }, visuel: { x: -0.21, y: 0 }, visuelCompact: { x: 0, y: 0.2 }, cadre: 'SPÉCIMEN Ω-7 · ×120 000' },
  { id: 'racines', icone: 'arbre', axe: [0, -1], texte: { x: 0.06, y: 0.12, l: 0.38 }, compact: { y: 0.56 }, visuel: { x: 0.22, y: 0 }, visuelCompact: { x: 0, y: -0.2 }, cadre: 'COUPE · SOL / SOUS-SOL' },
  { id: 'aide', icone: 'courrier', axe: [1, 0], texte: { x: 0.06, y: 0.28, l: 0.46 }, compact: { y: 0.1 }, visuel: { x: 0.24, y: 0 }, visuelCompact: { x: 0, y: 0.2 }, cadre: 'CANAL CHIFFRÉ · OUVERT' },
];

const ICONES_SERVICES = ['cle', 'cadenas', 'oeil', 'bouclier'];
const BRUIT = '#%&$@01<>/\\=+*';
const sections = CHAPITRES.map((c) => document.getElementById(c.id));
const nav = [...document.querySelectorAll('nav a')];
const boutonSon = document.querySelector('[data-role="son"]');
const interactifs = [...document.querySelectorAll('a, button')];

export function interactifIndex(el) {
  return interactifs.indexOf(el) + 1;
}

export function lisser(a, b, x) {
  const k = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return k * k * (3 - 2 * k);
}

function alea(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function dechiffrer(texte, revele, graine) {
  if (revele >= 1) return texte;
  let sortie = '';
  for (let i = 0; i < texte.length; i++) {
    const seuil = (i / Math.max(texte.length, 1)) * 0.8 + alea(i + graine) * 0.2;
    const g = texte[i];
    sortie += g === ' ' || revele > seuil ? g : revele > seuil - 0.25 ? BRUIT[Math.floor(Math.random() * BRUIT.length)] : ' ';
  }
  return sortie;
}

export function etatChapitre(c, p) {
  const d = p - (c + 1.5);
  const presence = lisser(0.5, 0.34, Math.abs(d));
  const sens = d < 0 ? 1 : -1;
  return { d, presence, glisse: sens * (1 - presence), revele: lisser(-0.5, -0.28, d) };
}

function couperLignes(g, texte, largeur) {
  const lignes = [];
  let ligne = '';
  for (const mot of texte.split(/\s+/)) {
    const essai = ligne ? `${ligne} ${mot}` : mot;
    if (ligne && g.measureText(essai).width > largeur) {
      lignes.push(ligne);
      ligne = mot;
    } else {
      ligne = essai;
    }
  }
  if (ligne) lignes.push(ligne);
  return lignes;
}

export function composer(ctx) {
  const { g, largeur: W, hauteur: H, p, t, compact } = ctx;
  const ecritures = [];
  const panneaux = [];
  const liens = new Map();
  const R = (v) => `rgb(${Math.round(v * 255)},0,0)`;
  const V = (v) => `rgb(0,${Math.round(v * 255)},0)`;
  const mono = (taille, graisse = 400) => `${graisse} ${taille}px "JetBrains Mono", monospace`;
  const ecrire = (c, r, texte, intensite, { taille = 1, lien = 0, toujours = 0 } = {}) => ecritures.push({ c, r, texte, intensite, lien, toujours, taille });

  g.clearRect(0, 0, W, H);
  g.globalCompositeOperation = 'lighter';
  g.textBaseline = 'top';

  const lien = (el, x, y, texte, taille, intensite) => {
    g.font = mono(taille, 500);
    const l = g.measureText(texte).width;
    const id = interactifIndex(el);
    const rect = { x0: x - 4, y0: y - 3, x1: x + l + 4, y1: y + taille + 3 };
    liens.set(id, rect);
    if (ctx.survolLien === id) {
      g.fillStyle = V(1);
      g.fillRect(rect.x0, rect.y0, rect.x1 - rect.x0, rect.y1 - rect.y0);
      g.globalCompositeOperation = 'destination-out';
      g.fillStyle = '#000';
      g.fillText(texte, x, y);
      g.globalCompositeOperation = 'lighter';
    } else {
      g.fillStyle = V(intensite);
      g.fillText(texte, x, y);
    }
    return l;
  };

  const intro = 1 - lisser(0.92, 1.05, p);
  if (intro > 0) {
    if (p < 0.3) {
      ['VIGIE/OS 0.9', 'mem 640k ......... ok', 'crt 60hz ......... ok', 'pare-feu ......... actif', 'printf("*");'].forEach((ligne, i) => {
        ecrire(4, 3 + i, `■ ${ligne}`, 0.75, { toujours: 1 });
      });
    }
    const invite = 1 - lisser(0.02, 0.1, p);
    if (invite > 0) {
      g.font = mono(13, 500);
      const texte = `ÉTABLISSEMENT DE LA LIAISON${'.'.repeat(Math.floor(t * 3) % 4)}`;
      const l = g.measureText('ÉTABLISSEMENT DE LA LIAISON...').width;
      g.fillStyle = V(invite * (0.6 + 0.4 * (Math.floor(t * 2) % 2)));
      g.fillText(texte, W / 2 - l / 2, H * 0.78);
    }
  }

  const site = lisser(0.85, 1.0, p);
  if (site <= 0) return { ecritures, panneaux, liens };
  g.globalAlpha = site;

  grille(g, W, H, V, mono, compact, p);

  g.font = mono(compact ? 13 : 15, 800);
  g.fillStyle = V(1);
  g.fillText('■ VIGIE', 22, 18);
  if (!compact) {
    g.font = mono(11);
    g.fillStyle = V(0.5);
    g.fillText('prévention · dangers du numérique', 112, 21);
  }

  const actif = Math.min(CHAPITRES.length - 1, Math.max(0, Math.floor(p - 1)));
  let x = compact ? 22 : W - 22;
  const etiquettes = nav.map((a, i) => (compact && i !== actif ? String(i + 1).padStart(2, '0') : `${String(i + 1).padStart(2, '0')} ${a.textContent}`));
  g.font = mono(compact ? 10 : 12, 500);
  const largeurs = etiquettes.map((e) => g.measureText(e).width + (compact ? 12 : 34));
  if (!compact) x -= largeurs.reduce((s, l) => s + l, 0);
  const yNav = compact ? 44 : 20;
  nav.forEach((a, i) => {
    const courant = i === actif && p > 1;
    if (!compact) {
      g.globalAlpha = site * (courant ? 1 : 0.55);
      dessinerIcone(g, CHAPITRES[i].icone, x, yNav - 4, 20);
      g.globalAlpha = site;
    }
    const decal = compact ? 0 : 24;
    lien(a, x + decal, yNav, etiquettes[i], compact ? 10 : 12, courant ? 1 : 0.55);
    if (courant) {
      g.fillStyle = V(1);
      g.fillRect(x + decal, yNav + 17, largeurs[i] - decal - 10, 2);
    }
    a.setAttribute('aria-current', courant ? 'true' : 'false');
    x += largeurs[i];
  });

  g.font = mono(11, 500);
  const libelleSon = ctx.sonActif ? 'son actif' : 'son coupé';
  const lSon = g.measureText(libelleSon).width;
  const xSon = W - 22 - lSon;
  const ySon = H - 34;
  dessinerIcone(g, ctx.sonActif ? 'son' : 'muet', xSon - 28, ySon - 5, 20);
  lien(boutonSon, xSon, ySon, libelleSon, 11, 0.85);
  boutonSon.setAttribute('aria-pressed', String(ctx.sonActif));
  panneaux.push({ x: xSon - 34, y: ySon - 10, l: lSon + 60, h: 32 });

  g.font = mono(10);
  g.fillStyle = V(0.5);
  g.fillText(`${new Date().toLocaleTimeString('fr-FR')} · liaison chiffrée`, 22, H - 30);

  CHAPITRES.forEach((cfg, c) => {
    const e = etatChapitre(c, p);
    if (e.presence <= 0.001) return;
    bloc(ctx, { g, cfg, c, e, W, H, compact, mono, R, V, lien, ecrire, panneaux });
  });

  g.globalAlpha = 1;
  g.globalCompositeOperation = 'source-over';
  return { ecritures, panneaux, liens };
}

function grille(g, W, H, V, mono, compact, p) {
  const colonnes = compact ? 4 : 12;
  const marge = 22;
  const pas = (W - marge * 2) / colonnes;
  g.font = mono(9);
  for (let i = 0; i <= colonnes; i++) {
    const x = marge + i * pas;
    g.fillStyle = V(0.12);
    for (let y = 70; y < H - 50; y += 6) g.fillRect(Math.round(x), y, 1, 2);
    if (i < colonnes) {
      g.fillStyle = V(0.4);
      g.fillText(`N${i + 1}`, x + 4, 58);
    }
  }
  const lignes = 4;
  for (let j = 1; j < lignes; j++) {
    const y = 70 + ((H - 120) * j) / lignes;
    for (let i = 0; i <= colonnes; i += compact ? 2 : 3) {
      const x = marge + i * pas;
      g.fillStyle = V(0.55);
      g.fillRect(x - 6, y, 13, 1);
      g.fillRect(x, y - 6, 1, 13);
    }
  }
  g.fillStyle = V(0.6);
  for (const [x, y, sx, sy] of [[12, 12, 1, 1], [W - 12, 12, -1, 1], [12, H - 12, 1, -1], [W - 12, H - 12, -1, -1]]) {
    g.fillRect(x, y, 18 * sx, 1);
    g.fillRect(x, y, 1, 18 * sy);
  }
  const yRegle = H - 16;
  const x0 = W * (compact ? 0.3 : 0.42);
  const x1 = W * (compact ? 0.7 : 0.58);
  g.fillStyle = V(0.35);
  g.fillRect(x0, yRegle, x1 - x0, 1);
  for (let i = 0; i <= 6; i++) g.fillRect(x0 + ((x1 - x0) * i) / 6, yRegle - (i % 6 === 0 ? 6 : 3), 1, i % 6 === 0 ? 7 : 4);
  g.fillStyle = V(1);
  g.fillRect(x0 + ((x1 - x0) * Math.min(p, 6)) / 6 - 1, yRegle - 7, 3, 9);

  if (!compact) {
    g.save();
    g.translate(30, H * 0.62);
    g.rotate(-Math.PI / 2);
    g.font = mono(9, 500);
    g.fillStyle = V(0.45);
    const actif = Math.min(4, Math.max(0, Math.floor(p - 1)));
    g.fillText(`VIGIE // SECTEUR ${String(actif + 1).padStart(2, '0')}/05 // ${CHAPITRES[actif].id.toUpperCase()} // NE PAS DIFFUSER`, 0, 0);
    g.restore();
  }
}

function bloc(ctx, { g, cfg, c, e, W, H, compact, mono, R, V, lien, ecrire, panneaux }) {
  const section = sections[c];
  const decalage = compact ? 0.18 : 0.3;
  const gx = cfg.axe[0] * e.glisse * W * decalage;
  const gy = cfg.axe[1] * e.glisse * H * decalage;
  const x = (compact ? 0.06 : cfg.texte.x) * W + gx;
  let y = (compact ? cfg.compact.y : cfg.texte.y) * H + gy;
  const largeur = (compact ? 0.88 : cfg.texte.l) * W;
  const taille = compact ? Math.min(52, W * 0.12) : Math.max(56, Math.min(104, H * 0.1, W * 0.068));
  const corps = compact ? 13 : 15;
  g.font = `${taille}px Anton, Impact, sans-serif`;
  const titre = section.querySelector('h2').textContent.toUpperCase();
  const lignes = couperLignes(g, titre, largeur);
  g.font = mono(corps);
  const lignesCorps = [...section.querySelectorAll('p:not([data-role])')].reduce((n, p) => n + (p.querySelector('a') ? 1.25 : couperLignes(g, p.textContent, Math.min(largeur, 560)).length + 0.4), 0);
  const hauteur = 44 + lignes.length * taille * 1.02 + 18 + lignesCorps * corps * 1.55 + (section.querySelector('li') ? (compact ? 126 : 66) : 0) + 34;
  y = Math.min(y, H - 56 - hauteur + gy);
  g.globalAlpha = e.presence;
  const y0 = y;

  dessinerIcone(g, cfg.icone, x, y, 24);
  g.font = mono(11, 500);
  g.fillStyle = V(0.9);
  g.fillText(dechiffrer(`[${String(c + 1).padStart(2, '0')}] // ${cfg.id.toUpperCase()}`, e.revele * 1.3, c), x + 32, y + 6);
  g.fillStyle = V(0.4);
  g.fillRect(x, y + 32, largeur, 1);
  y += 44;

  g.font = `${taille}px Anton, Impact, sans-serif`;
  lignes.forEach((ligne, i) => {
    const part = Math.min(1, Math.max(0, e.revele * (lignes.length + 0.6) - i));
    if (part <= 0) return;
    g.save();
    g.beginPath();
    g.rect(x - 4, y + i * taille * 1.02 - taille * 0.3, (g.measureText(ligne).width + 8) * part, taille * 1.3);
    g.clip();
    g.fillStyle = R(1);
    g.fillText(ligne, x, y + i * taille * 1.02);
    g.restore();
    if (part < 1) {
      g.fillStyle = V(1);
      g.fillRect(x + (g.measureText(ligne).width + 8) * part - 4, y + i * taille * 1.02, 3, taille * 0.8);
    }
  });
  y += lignes.length * taille * 1.02 + 18;

  g.font = mono(corps);
  for (const p of section.querySelectorAll('p:not([data-role])')) {
    const a = p.querySelector('a');
    if (a) {
      g.globalAlpha = e.presence * e.revele;
      const [avant, apres] = p.textContent.split(a.textContent).map((m) => m.trim());
      let xl = x;
      g.font = mono(corps);
      g.fillStyle = V(0.6);
      if (avant) {
        g.fillText(avant, xl, y + 1);
        xl += g.measureText(`${avant} `).width;
      }
      xl += lien(a, xl, y, a.textContent, corps + 1, 1) + 8;
      if (apres) {
        g.font = mono(corps);
        g.fillStyle = V(0.6);
        g.fillText(apres, xl, y + 1);
      }
      g.globalAlpha = e.presence;
      y += corps * 1.9;
      continue;
    }
    for (const ligne of couperLignes(g, p.textContent, Math.min(largeur, 560))) {
      g.fillStyle = V(0.88);
      g.fillText(dechiffrer(ligne, e.revele * 1.15 - 0.1, y), x, y);
      y += corps * 1.55;
    }
    y += corps * 0.6;
  }

  const services = section.querySelectorAll('li');
  if (services.length) {
    g.font = mono(corps, 700);
    services.forEach((li, i) => {
      const colonnes = compact ? 1 : 2;
      const xs = x + (i % colonnes) * Math.min(largeur / 2, 280);
      const ys = y + Math.floor(i / colonnes) * 30;
      dessinerIcone(g, ICONES_SERVICES[i], xs, ys - 3, 22);
      g.fillStyle = V(0.95);
      g.fillText(dechiffrer(li.textContent, e.revele * 1.2 - 0.2, i * 9), xs + 30, ys);
    });
    y += Math.ceil(services.length / (compact ? 1 : 2)) * 30 + 6;
  }

  const consigne = section.querySelector('[data-role="consigne"]');
  if (consigne) {
    g.font = mono(11, 500);
    g.fillStyle = V(0.9);
    const texte = `${Math.floor(ctx.t * 2) % 2 ? '▸' : ' '} ${consigne.textContent}${ctx.compteurs[c] ? `   ${ctx.compteurs[c]}` : ''}`;
    g.fillText(dechiffrer(texte, e.revele * 1.2 - 0.25, 3), x, y + 6);
    y += 26;
  }
  panneaux.push({ x: x - 14, y: y0 - 12, l: largeur + 28, h: y - y0 + 24 });

  visuels(ctx, { g, cfg, c, e, W, H, compact, mono, V, ecrire });
  g.globalAlpha = 1;
}

function cadreTechnique(g, V, mono, x, y, l, h, libelle) {
  g.fillStyle = V(0.5);
  for (const [cx, cy, sx, sy] of [[x, y, 1, 1], [x + l, y, -1, 1], [x, y + h, 1, -1], [x + l, y + h, -1, -1]]) {
    g.fillRect(cx, cy, 26 * sx, 1);
    g.fillRect(cx, cy, 1, 26 * sy);
  }
  g.strokeStyle = V(0.1);
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(x, y);
  g.lineTo(x + l, y + h);
  g.moveTo(x + l, y);
  g.lineTo(x, y + h);
  g.stroke();
  g.font = mono(9, 500);
  g.fillStyle = V(0.6);
  g.fillText(libelle, x + 6, y + 6);
}

function visuels(ctx, { g, cfg, c, e, W, H, compact, mono, V, ecrire }) {
  const v = compact ? cfg.visuelCompact : cfg.visuel;
  const gx = cfg.axe[0] * e.glisse * W * 0.18;
  const gy = cfg.axe[1] * e.glisse * H * 0.18;
  const cx = W * (0.5 + v.x) + gx;
  const cy = H * (0.5 + v.y) + gy;
  const l = compact ? W * 0.84 : W * 0.4;
  const h = compact ? H * 0.38 : H * 0.72;
  cadreTechnique(g, V, mono, cx - l / 2, cy - h / 2, l, h, cfg.cadre);

  if (c === 2) {
    const centre = ctx.centreVirus;
    g.strokeStyle = V(0.35);
    g.lineWidth = 1;
    for (const r of [0.3, 0.42]) {
      g.beginPath();
      g.arc(centre.x, centre.y, Math.min(l, h) * r, 0, Math.PI * 2);
      g.stroke();
    }
    g.fillStyle = V(0.3);
    g.fillRect(centre.x - l / 2, centre.y, l, 1);
    g.fillRect(centre.x, centre.y - h / 2, 1, h);
    const apparition = lisser(-0.25, 0.05, e.d);
    ctx.reperes.forEach((r, i) => {
      const k = Math.min(1, Math.max(0, apparition * 3 - i));
      if (k <= 0 || !r.face) return;
      const droite = r.x > centre.x;
      const xl = droite ? centre.x + Math.min(l, h) * 0.46 : centre.x - Math.min(l, h) * 0.46;
      const yl = r.y - 30;
      g.strokeStyle = V(0.9 * k);
      g.beginPath();
      g.moveTo(r.x, r.y);
      g.lineTo(r.x + (xl - r.x) * 0.5, yl);
      g.lineTo(xl, yl);
      g.stroke();
      g.fillStyle = V(k);
      g.fillRect(r.x - 3, r.y - 3, 6, 6);
      g.font = mono(12, 700);
      const lt = g.measureText(r.nom).width;
      g.fillText(r.nom, droite ? xl + 6 : xl - 6 - lt, yl - 8);
      g.font = mono(10);
      g.fillStyle = V(0.6 * k);
      const ln = g.measureText(r.note).width;
      g.fillText(r.note, droite ? xl + 6 : xl - 6 - ln, yl + 7);
    });
  }

  if (c === 3) {
    const sol = ctx.solArbre;
    g.font = mono(9, 500);
    for (let k = 0; k <= 4; k++) {
      const y = sol + k * (h * 0.13);
      g.fillStyle = V(0.5);
      g.fillRect(cx + l / 2 - 14, y, 10, 1);
      g.fillText(k === 0 ? 'SURFACE' : `-${k} M`, cx + l / 2 - 64, y - 4);
    }
  }

  if (c <= 1 && e.presence > 0.6) {
    for (const { cadre, sujet, suspect, id, m } of ctx.cadres) {
      if (c === 0 && !sujet) continue;
      const survole = ctx.survolFigure === m;
      const c0 = Math.floor(cadre.x0 / CELLULE.l) - 1;
      const c1 = Math.ceil(cadre.x1 / CELLULE.l) + 1;
      const r0 = Math.floor(cadre.y0 / CELLULE.h) - 1;
      const r1 = Math.ceil(cadre.y1 / CELLULE.h) + 1;
      const bras = Math.max(1, Math.min(survole ? 6 : 3, Math.floor((c1 - c0) / 4)));
      const force = survole || suspect ? 1 : 0.55;
      for (const [col, sens] of [[c0, 1], [c1, -1]]) {
        for (const r of [r0, r1]) {
          ecrire(col, r, '+', force);
          ecrire(sens > 0 ? col + 1 : col - bras, r, '-'.repeat(bras), force);
          ecrire(col, r + (r === r0 ? 1 : -1), '|', force);
        }
      }
      let etiquette;
      if (c === 0) etiquette = m.arret > 0 ? 'il vous a vu.' : `sujet_07 · non identifié · ${(0.6 + Math.sin(ctx.t * 2.3) * 0.05).toFixed(2)}`;
      else etiquette = suspect ? `SIGNALÉ · id ${id}` : survole ? `id ${id} · signaler ?` : `id ${id}`;
      ecrire(c0, r0 - 1, etiquette, suspect && Math.floor(ctx.t * 3) % 2 ? 0.5 : force);
    }
  }

  if (c === 0 && !compact && e.presence > 0.5) {
    const largeurLog = 44;
    const C1 = Math.ceil(W / CELLULE.l);
    const c0 = C1 - 6 - largeurLog;
    const r0 = 9;
    ecrire(c0, r0 - 1, '> journal'.padEnd(largeurLog, '-'), 0.9);
    ctx.logs.forEach((ligne, i) => ecrire(c0, r0 + i, ligne.slice(0, largeurLog), i === ctx.logs.length - 1 ? 1 : 0.5 + (i / ctx.logs.length) * 0.3));
  }
}
