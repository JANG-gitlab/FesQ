import '@fontsource/anton/400.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import '@fontsource/jetbrains-mono/700.css';
import '@fontsource/jetbrains-mono/800.css';
import {
  Camera, CanvasTexture, DataTexture, GLSL3, LinearFilter, LinearMipmapLinearFilter, Mesh, NearestFilter,
  PlaneGeometry, RGBAFormat, Scene, ShaderMaterial, UnsignedByteType, Vector2, WebGLRenderer,
} from 'three';
import gsap from 'gsap';
import { vertex, fragment } from './shader.js';
import { CELLULE, CHAPITRES, composer, etatChapitre, interactifIndex, lisser } from './composition.js';
import { creerDefilement } from './defilement.js';
import { creerFigures } from './figures.js';
import { creerVirus } from './virus.js';
import { creerArbre } from './organique.js';
import { son } from './son.js';

const COURBURE = 0.36;
const RAMPE = ' .:-=+*#%@';
const CHIFFRES = '1742359608';
const ETAPES = CHAPITRES.length + 0.5;
const POUSSIERE = 0.02;
const COLONNES_ATLAS = 16;
const MARGE_ATLAS = 12;

const GLYPHES = (() => {
  let s = '';
  for (let c = 32; c < 127; c++) s += String.fromCharCode(c);
  return s + 'éèêëàâäçôöîïûùüœÉÈÀÇÊÔ’«»°■·█';
})();
const INDEX_GLYPHE = new Map([...GLYPHES].map((g, i) => [g, i]));

const reduit = matchMedia('(prefers-reduced-motion: reduce)').matches;
const toile = document.getElementById('ecran');
const interactifs = [...document.querySelectorAll('a, button')];
const nav = [...document.querySelectorAll('nav a')];
const boutonSon = document.querySelector('[data-role="son"]');

await Promise.all([
  document.fonts.load('80px Anton'),
  ...[400, 500, 700, 800].map((g) => document.fonts.load(`${g} 16px "JetBrains Mono"`)),
]);

const renderer = new WebGLRenderer({ canvas: toile, antialias: false, powerPreference: 'high-performance' });
const ratio = Math.min(devicePixelRatio, 2);
renderer.setPixelRatio(ratio);

const source = document.createElement('canvas');
const halo = document.createElement('canvas');
const affiche = document.createElement('canvas');
const texSource = lineaire(new CanvasTexture(source));
const texHalo = lineaire(new CanvasTexture(halo));
const texAffiche = lineaire(new CanvasTexture(affiche));
const figures = creerFigures();
const virus = creerVirus();
const arbre = creerArbre();
const defilement = creerDefilement(ETAPES, { reduit });

const uniforms = {
  uSource: { value: texSource },
  uHalo: { value: texHalo },
  uAtlas: { value: atlasPetit() },
  uAtlasGrand: { value: null },
  uMargeAtlas: { value: new Vector2() },
  uColonnesAtlas: { value: COLONNES_ATLAS },
  uTexte1: { value: null },
  uAffiche: { value: texAffiche },
  uFigure: { value: figures.texture },
  uVirus: { value: virus.texture },
  uGlyphes: { value: GLYPHES.length },
  uRampe: { value: [...RAMPE].map((g) => INDEX_GLYPHE.get(g)) },
  uChiffres: { value: [...CHIFFRES].map((g) => INDEX_GLYPHE.get(g)) },
  uGrille: { value: new Vector2() },
  uCellule: { value: new Vector2(CELLULE.l, CELLULE.h) },
  uTaille: { value: new Vector2() },
  uResolution: { value: new Vector2() },
  uSouris: { value: new Vector2(-1e4, -1e4) },
  uCourbure: { value: COURBURE },
  uBalayage: { value: 0 },
  uBombe: { value: 1 },
  uCreux: { value: 0 },
  uAllumage: { value: 0 },
  uScintille: { value: 1 },
  uTemps: { value: 0 },
  uChamp: { value: 1 },
  uTorche: { value: 0 },
  uFigureForce: { value: 1 },
  uVirusForce: { value: 0 },
  uGlitch: { value: 0 },
  uGlitchY: { value: 0.5 },
  uCharge: { value: 0 },
  uTrame: { value: 4 },
};
uniforms.uAtlasGrand.value = atlasGrand();

const scene = new Scene();
const camera = new Camera();
scene.add(new Mesh(
  new PlaneGeometry(2, 2),
  new ShaderMaterial({ vertexShader: vertex, fragmentShader: fragment, uniforms, glslVersion: GLSL3 }),
));

const etat = { survolFigure: null, survolLien: 0, charge: 0, appui: false };
let grille = { C: -1, R: -1, donnees: null, texture: null };
const logs = [];
const eclairs = [];
let cleHalo = '';
let clePlaces = '';
let prochainLog = 0;
let prochainEclair = 0;
let prochainDonnees = 0;
let prochaineRumeur = 0;
let derniereEtape = 0;
let precedentP = 0;

function lineaire(t) {
  t.minFilter = t.magFilter = LinearFilter;
  t.generateMipmaps = false;
  return t;
}

function atlasPetit() {
  const l = CELLULE.l * ratio;
  const h = CELLULE.h * ratio;
  const c = document.createElement('canvas');
  c.width = l * GLYPHES.length;
  c.height = h;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.font = `500 ${Math.round(h * 0.82)}px "JetBrains Mono", monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  [...GLYPHES].forEach((g, i) => {
    if (g === '■') ctx.fillRect(i * l + l * 0.17, h * 0.3, l * 0.66, h * 0.4);
    else if (g === '█') ctx.fillRect(i * l, h * 0.1, l, h * 0.8);
    else ctx.fillText(g, i * l + l / 2, h * 0.54);
  });
  return lineaire(new CanvasTexture(c));
}

function atlasGrand() {
  const l = CELLULE.l * 4 * ratio + MARGE_ATLAS * 2;
  const h = CELLULE.h * 4 * ratio + MARGE_ATLAS * 2;
  uniforms.uMargeAtlas.value.set(MARGE_ATLAS / l, MARGE_ATLAS / h);
  const c = document.createElement('canvas');
  c.width = l * COLONNES_ATLAS;
  c.height = h * Math.ceil(GLYPHES.length / COLONNES_ATLAS);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.font = `800 ${Math.round((h - MARGE_ATLAS * 2) * 0.85)}px "JetBrains Mono", monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  [...GLYPHES].forEach((g, i) => {
    ctx.fillText(g, (i % COLONNES_ATLAS) * l + l / 2, Math.floor(i / COLONNES_ATLAS) * h + h * 0.53);
  });
  const t = new CanvasTexture(c);
  t.minFilter = LinearMipmapLinearFilter;
  t.magFilter = LinearFilter;
  return t;
}

function bomber(x, y) {
  const cx = x - 0.5;
  const cy = y - 0.5;
  const k = 1 + COURBURE * (cx * cx + cy * cy);
  return [0.5 + cx * k, 0.5 + cy * k];
}

function debomber(x, y) {
  let px = x;
  let py = y;
  for (let i = 0; i < 8; i++) {
    const [bx, by] = bomber(px, py);
    px += x - bx;
    py += y - by;
  }
  return [px, py];
}

function chemin(ctx, cx, cy, r) {
  const l = r * 0.82;
  const k = r * 0.09;
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.quadraticCurveTo(cx + k, cy - k, cx + l, cy);
  ctx.quadraticCurveTo(cx + k, cy + k, cx, cy + r);
  ctx.quadraticCurveTo(cx - k, cy + k, cx - l, cy);
  ctx.quadraticCurveTo(cx - k, cy - k, cx, cy - r);
  ctx.closePath();
}

function compact() {
  return innerWidth < 700;
}

function decalageVisuel(c, p, glisser = true) {
  const cfg = CHAPITRES[c];
  const v = compact() ? cfg.visuelCompact : cfg.visuel;
  const e = etatChapitre(c, p);
  const k = glisser ? e.glisse * 0.18 : 0;
  return { x: v.x + cfg.axe[0] * k, y: v.y + cfg.axe[1] * k, e };
}

function etoileCourante(p) {
  const W = innerWidth;
  const H = innerHeight;
  const m = Math.min(W, H);
  if (p < 1.5) return { x: W / 2, y: H / 2, r: m * 0.34 * (1 - lisser(0.75, 0.98, p)) };
  const d = decalageVisuel(4, p);
  return { x: W * (0.5 + d.x), y: H * (0.5 + d.y), r: m * 0.22 * lisser(5.02, 5.42, p) * d.e.presence * (1 + etat.charge * 0.15) };
}

function genererEclair(etoile) {
  const branches = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  const [dx, dy] = branches[Math.floor(Math.random() * 4)];
  const points = [];
  let x = etoile.x + dx * etoile.r * (dx ? 0.82 : 1);
  let y = etoile.y + dy * etoile.r;
  points.push([x, y]);
  const pas = etoile.r * (0.12 + etat.charge * 0.08);
  for (let i = 0; i < 9; i++) {
    x += dx * pas + (dy ? 1 : 0.4) * (Math.random() - 0.5) * pas * 1.6;
    y += dy * pas + (dx ? 1 : 0.4) * (Math.random() - 0.5) * pas * 1.6;
    points.push([x, y]);
  }
  return points;
}

function dessinerSource(panneaux, etoile, p, t) {
  const W = innerWidth;
  const H = innerHeight;
  const ctx = source.getContext('2d');
  ctx.setTransform(source.width / W, 0, 0, source.height / H, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  if (etoile.r > 1) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgb(0,255,0)';
    chemin(ctx, etoile.x, etoile.y, etoile.r);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }

  const racines = etatChapitre(3, p);
  if (racines.presence > 0) {
    const d = decalageVisuel(3, p);
    const l = compact() ? W * 0.94 : W * 0.52;
    const h = compact() ? H * 0.5 : H * 0.96;
    arbre.placer({ x: W * (0.5 + d.x) - l / 2, y: H * (0.5 + d.y) - h / 2, l, h });
    ctx.globalAlpha = racines.presence;
    arbre.dessiner(ctx, lisser(4.12, 4.78, p), etat.survolLien ? null : souris(), t);
    ctx.globalAlpha = 1;
  }

  ctx.strokeStyle = 'rgb(255,0,0)';
  ctx.lineWidth = CELLULE.l * 1.5;
  ctx.lineJoin = 'bevel';
  for (const e of eclairs) {
    ctx.beginPath();
    e.points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
  }

  ctx.fillStyle = 'rgb(0,0,255)';
  for (const r of panneaux) ctx.fillRect(r.x, r.y, r.l, r.h);
  texSource.needsUpdate = true;
}

function dessinerHalo(etoile) {
  const cle = `${halo.width}:${etoile.x.toFixed(1)}:${etoile.y.toFixed(1)}:${etoile.r.toFixed(1)}`;
  if (cle === cleHalo) return;
  cleHalo = cle;
  const s = halo.width / innerWidth;
  const ctx = halo.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, halo.width, halo.height);
  if (etoile.r > 1) {
    ctx.globalCompositeOperation = 'lighter';
    const decalage = halo.width * 4;
    ctx.fillStyle = '#000';
    ctx.shadowColor = 'rgb(0,255,0)';
    ctx.shadowOffsetX = decalage;
    for (const flou of [0.08, 0.3, 0.7]) {
      ctx.shadowBlur = etoile.r * s * flou;
      chemin(ctx, etoile.x * s - decalage, etoile.y * s, etoile.r * s);
      ctx.fill();
    }
    ctx.shadowColor = 'transparent';
  }
  texHalo.needsUpdate = true;
}

function remplirTexte(ecritures) {
  const { C, R, donnees } = grille;
  donnees.fill(0);
  for (const { c, r, texte, intensite, toujours } of ecritures) {
    if (r < 0 || r >= R) continue;
    [...texte].forEach((glyphe, i) => {
      const x = c + i;
      if (glyphe === ' ' || x < 0 || x >= C) return;
      const k = (r * C + x) * 4;
      donnees[k] = (INDEX_GLYPHE.get(glyphe) ?? INDEX_GLYPHE.get('?')) + 1;
      donnees[k + 1] = Math.round(Math.min(intensite, 1) * 255);
      donnees[k + 3] = toujours ? 255 : 0;
    });
  }
  grille.texture.needsUpdate = true;
}

function placerLiens(liens) {
  const cle = [...liens].map(([k, f]) => `${k}:${f.x0 | 0}:${f.y0 | 0}:${f.x1 | 0}`).join('|') + innerWidth + innerHeight;
  if (cle === clePlaces) return;
  clePlaces = cle;
  const W = innerWidth;
  const H = innerHeight;
  interactifs.forEach((el) => {
    const f = liens.get(interactifIndex(el));
    el.classList.toggle('place', Boolean(f));
    el.tabIndex = f ? 0 : -1;
    if (!f) return;
    const [x0, y0] = debomber(f.x0 / W, f.y0 / H);
    const [x1, y1] = debomber(f.x1 / W, f.y1 / H);
    Object.assign(el.style, {
      left: `${x0 * W}px`,
      top: `${y0 * H}px`,
      width: `${(x1 - x0) * W}px`,
      height: `${(y1 - y0) * H}px`,
    });
  });
}

function redimensionner() {
  const W = innerWidth;
  const H = innerHeight;
  renderer.setSize(W, H, false);
  const C = Math.ceil(W / CELLULE.l);
  const R = Math.ceil(H / CELLULE.h);
  if (C !== grille.C || R !== grille.R) {
    grille.texture?.dispose();
    const donnees = new Uint8Array(C * R * 4);
    const texture = new DataTexture(donnees, C, R, RGBAFormat, UnsignedByteType);
    texture.minFilter = texture.magFilter = NearestFilter;
    grille = { C, R, donnees, texture };
    uniforms.uTexte1.value = texture;
  }
  source.width = C * 2;
  source.height = R * 2;
  halo.width = Math.ceil(W / 4);
  halo.height = Math.ceil(H / 4);
  affiche.width = Math.ceil(W * ratio);
  affiche.height = Math.ceil(H * ratio);
  affiche.getContext('2d').setTransform(ratio, 0, 0, ratio, 0, 0);
  for (const t of [texSource, texHalo, texAffiche]) t.dispose();
  cleHalo = '';
  clePlaces = '';
  figures.redimensionner(C, R, W, H);
  virus.redimensionner(C, R, W, H);
  uniforms.uGrille.value.set(C, R);
  uniforms.uTaille.value.set(W, H);
  uniforms.uTrame.value = compact() ? 3 : 4;
  renderer.getDrawingBufferSize(uniforms.uResolution.value);
}

const IP = ['203.0.113.', '198.51.100.', '192.0.2.'];
const EVENEMENTS = [
  (ip) => `ssh   ${ip}  refusé`,
  (ip) => `scan  ${ip}  ports 22,443,8080`,
  () => `auth  admin@intranet  échec x3`,
  (ip) => `dns   ${ip}  requête longue`,
  () => `jeton expiré réutilisé  bloqué`,
  (ip) => `sql   ${ip}  ' OR 1=1 --`,
  () => `session 4f9a  pays inattendu`,
  (ip) => `vpn   ${ip}  connexion 03:12`,
];

function journaliser() {
  const ip = IP[Math.floor(Math.random() * IP.length)] + Math.floor(Math.random() * 254 + 1);
  logs.push(`${new Date().toLocaleTimeString('fr-FR')}  ${EVENEMENTS[Math.floor(Math.random() * EVENEMENTS.length)](ip)}`);
  if (logs.length > 9) logs.shift();
}

function souris() {
  return { x: uniforms.uSouris.value.x, y: uniforms.uSouris.value.y };
}

function glitcher(duree) {
  if (reduit) return;
  uniforms.uGlitchY.value = Math.random();
  gsap.fromTo(uniforms.uGlitch, { value: 1 }, { value: 0, duration: duree, ease: 'steps(3)' });
}

function cible(x, y) {
  const p = defilement.position;
  if (p < 1.2 || p > 2.85) return null;
  for (const { m, cadre, sujet } of figures.cadres()) {
    if (p < 2 && !sujet) continue;
    if (x > cadre.x0 - 8 && x < cadre.x1 + 8 && y > cadre.y0 - 8 && y < cadre.y1 + 8) return m;
  }
  return null;
}

const initial = CHAPITRES.findIndex((c) => c.id === location.hash.slice(1));
if (initial >= 0) defilement.placer(initial + 1.5);

nav.forEach((a, i) => a.addEventListener('click', (e) => {
  e.preventDefault();
  defilement.aller(i + 1.5);
  history.replaceState(null, '', a.hash);
}));
boutonSon.addEventListener('click', () => son.basculer());

addEventListener('pointermove', (e) => {
  uniforms.uTorche.value = e.pointerType === 'mouse' ? 0.9 : 0;
  const [x, y] = bomber(e.clientX / innerWidth, e.clientY / innerHeight);
  uniforms.uSouris.value.set(x * innerWidth, y * innerHeight);
  const m = cible(x * innerWidth, y * innerHeight);
  if (m && m !== etat.survolFigure) son.survol();
  etat.survolFigure = m;
  document.documentElement.classList.toggle('vise', Boolean(m));
});
document.documentElement.addEventListener('pointerleave', () => uniforms.uSouris.value.set(-1e4, -1e4));

toile.addEventListener('pointerdown', () => {
  const p = defilement.position;
  if (etat.survolFigure && p < 2) {
    if (figures.regarder(etat.survolFigure)) {
      son.sonar();
      glitcher(0.25);
    }
  } else if (etat.survolFigure) {
    figures.marquer(etat.survolFigure) ? son.verrou() : son.refus();
  } else if (etatChapitre(4, p).presence > 0.8) {
    etat.appui = true;
  }
});
addEventListener('pointerup', () => {
  if (!etat.appui) return;
  etat.appui = false;
  if (etat.charge > 0.3) {
    const etoile = etoileCourante(defilement.position);
    for (let i = 0; i < 6; i++) eclairs.push({ points: genererEclair(etoile), fin: performance.now() / 1000 + 0.25 });
    son.liberation(etat.charge);
    glitcher(0.35);
  }
  gsap.to(etat, { charge: 0, duration: 0.8, ease: 'power2.out', onUpdate: () => son.charge(etat.charge) });
});

interactifs.forEach((el) => {
  const id = interactifIndex(el);
  const allumer = () => {
    if (etat.survolLien !== id) son.survol();
    etat.survolLien = id;
  };
  const eteindre = () => {
    if (etat.survolLien === id) etat.survolLien = 0;
  };
  el.addEventListener('pointerenter', allumer);
  el.addEventListener('pointerleave', eteindre);
  el.addEventListener('focus', allumer);
  el.addEventListener('blur', eteindre);
});

let precedent = 0;
renderer.setAnimationLoop((ms) => {
  const t = ms / 1000;
  const dt = Math.min(t - precedent, 0.1);
  precedent = t;
  if (innerWidth !== uniforms.uTaille.value.x || innerHeight !== uniforms.uTaille.value.y) redimensionner();
  const W = innerWidth;
  const H = innerHeight;

  const p = defilement.mettreAJour(dt);
  son.flux(defilement.vitesse);
  const etape = Math.floor(p);
  if (etape !== derniereEtape) {
    if (etape > 0 || derniereEtape > 0) son.impact();
    glitcher(0.2);
    derniereEtape = etape;
  }
  if (precedentP < 0.58 && p >= 0.58) son.impact();
  precedentP = p;

  uniforms.uTemps.value = t;
  uniforms.uBalayage.value = lisser(0.04, 0.3, p);
  uniforms.uBombe.value = 1 - lisser(0.3, 0.4, p);
  uniforms.uCreux.value = lisser(0.35, 0.5, p);
  uniforms.uAllumage.value = p < 1.5 ? lisser(0.56, 0.6, p) : 1;
  uniforms.uChamp.value = 1 + (POUSSIERE - 1) * lisser(0.7, 0.92, p);
  uniforms.uScintille.value = reduit ? 1 : 0.92 + 0.08 * Math.sin(t * 23) * Math.sin(t * 7.3 + 1);
  uniforms.uCharge.value = etat.charge;

  if (etat.appui) {
    etat.charge = Math.min(1, etat.charge + dt * 0.6);
    son.charge(etat.charge);
  }
  if (t > prochainLog) {
    journaliser();
    prochainLog = t + 0.5 + Math.random() * 0.9;
  }

  const enMouvement = Math.abs(defilement.vitesse) > 0.02;
  const decodage = CHAPITRES.some((_, c) => {
    const r = etatChapitre(c, p).revele;
    return r > 0.05 && r < 0.95;
  });
  if (decodage && enMouvement && t > prochainDonnees) {
    son.donnees();
    prochainDonnees = t + 0.09;
  }
  if (etatChapitre(3, p).presence > 0.5 && enMouvement && t > prochaineRumeur) {
    son.rumeur(Math.min(1, Math.abs(defilement.vitesse) * 3));
    prochaineRumeur = t + 0.2;
  }

  const k = lisser(1.8, 2.2, p);
  const d0 = decalageVisuel(0, p, false);
  const d1 = decalageVisuel(1, p, false);
  figures.mettreAJour(renderer, dt, p, { decalageX: d0.x + (d1.x - d0.x) * k, decalageY: d0.y + (d1.y - d0.y) * k, anime: !reduit });

  const dv = decalageVisuel(2, p);
  uniforms.uVirusForce.value = dv.e.presence;
  virus.rendre(renderer, {
    visible: dv.e.presence > 0.001,
    angle: (p - 3) * 5.5,
    echelle: (0.5 + 0.4 * lisser(3.0, 3.45, p)) * (1 + 0.35 * lisser(3.6, 4.0, p)),
    decalageX: dv.x,
    decalageY: dv.y,
  });

  const etoile = etoileCourante(p);
  const contact = etatChapitre(4, p);
  if (!reduit && contact.presence > 0.8 && t > prochainEclair && etoile.r > 20) {
    eclairs.push({ points: genererEclair(etoile), fin: t + 0.14 + Math.random() * 0.1 });
    son.decharge();
    prochainEclair = t + (0.9 + Math.random() * 2) * (1 - etat.charge * 0.85);
  }
  for (let i = eclairs.length - 1; i >= 0; i--) if (eclairs[i].fin < t) eclairs.splice(i, 1);

  const mise = composer({
    g: affiche.getContext('2d'),
    largeur: W,
    hauteur: H,
    p,
    t,
    compact: compact(),
    logs,
    sonActif: son.actif,
    survolLien: etat.survolLien,
    survolFigure: etat.survolFigure,
    cadres: p > 1.1 && p < 2.9 ? figures.cadres() : [],
    reperes: virus.reperes(),
    centreVirus: virus.centre(),
    solArbre: arbre.sol(),
    compteurs: [null, `signalés : ${figures.suspects()}`, null, null, null],
  });
  texAffiche.needsUpdate = true;
  dessinerSource(mise.panneaux, etoile, p, t);
  dessinerHalo(etoile);
  remplirTexte(mise.ecritures);
  placerLiens(mise.liens);
  renderer.render(scene, camera);
});

redimensionner();
