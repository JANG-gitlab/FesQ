export const vertex = /* glsl */ `
void main() {
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const fragment = /* glsl */ `
precision highp float;

uniform sampler2D uSource;
uniform sampler2D uHalo;
uniform sampler2D uAtlas;
uniform sampler2D uAtlasGrand;
uniform sampler2D uTexte1;
uniform sampler2D uAffiche;
uniform sampler2D uFigure;
uniform sampler2D uVirus;
uniform float uGlyphes;
uniform float uColonnesAtlas;
uniform vec2 uMargeAtlas;
uniform float uRampe[10];
uniform float uChiffres[10];
uniform vec2 uGrille;
uniform vec2 uCellule;
uniform vec2 uTaille;
uniform vec2 uResolution;
uniform vec2 uSouris;
uniform float uCourbure;
uniform float uBalayage;
uniform float uBombe;
uniform float uCreux;
uniform float uAllumage;
uniform float uScintille;
uniform float uTemps;
uniform float uChamp;
uniform float uTorche;
uniform float uFigureForce;
uniform float uVirusForce;
uniform float uGlitch;
uniform float uGlitchY;
uniform float uCharge;
uniform float uTrame;

out vec4 sortie;

const vec3 ROUGE = vec3(0.769, 0.0, 0.102);
const vec3 ROUGE_SOMBRE = vec3(0.165, 0.0, 0.024);
const vec3 ROSE = vec3(1.0, 0.3, 0.4);
const vec3 PALE = vec3(1.0, 0.82, 0.86);

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

vec2 bomber(vec2 p) {
  vec2 c = p - 0.5;
  return 0.5 + c * (1.0 + uCourbure * dot(c, c));
}

float boiteArrondie(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

float glyphe(float indice, vec2 local) {
  return textureLod(uAtlas, vec2((indice + local.x) / uGlyphes, 1.0 - local.y), 0.0).r;
}

float glypheGrand(float indice, vec2 local, float niveau) {
  float lignes = ceil(uGlyphes / uColonnesAtlas);
  vec2 place = vec2(mod(indice, uColonnesAtlas), floor(indice / uColonnesAtlas));
  local = uMargeAtlas + local * (1.0 - 2.0 * uMargeAtlas);
  return textureLod(uAtlasGrand, vec2((place.x + local.x) / uColonnesAtlas, 1.0 - (place.y + local.y) / lignes), niveau).r;
}

// Présence floutée des formes (arbre, étoile, silhouettes, virus) via les mipmaps.
float densite(vec2 f, float niveau) {
  vec4 s = textureLod(uSource, f, niveau);
  float fig = min(1.0, textureLod(uFigure, f, niveau + 1.6).a * 1.6) * uFigureForce;
  float vir = textureLod(uVirus, f, niveau).a * uVirusForce;
  return max(max(s.r, s.g * 0.8), max(fig, vir));
}

float lueur(vec2 uv) {
  float s = 0.0;
  for (int k = 0; k < 8; k++) {
    float a = float(k) * 0.785;
    s += texture(uFigure, uv + vec2(cos(a), sin(a)) * 7.0 / uTaille).a;
    s += texture(uFigure, uv + vec2(cos(a), sin(a)) * 16.0 / uTaille).a * 0.6;
  }
  return s / 12.8;
}

float trainee(vec2 uv) {
  float s = 0.0;
  for (int k = -6; k <= 6; k++) {
    float d = float(k) / 6.0;
    s += texture(uFigure, uv + vec2(0.0, d * 0.12)).a * (1.0 - abs(d));
  }
  return s / 6.0;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  uv.y = 1.0 - uv.y;
  float bande = step(abs(uv.y - uGlitchY), 0.015 + 0.03 * hash(vec2(floor(uTemps * 30.0), 3.0)));
  uv.x += uGlitch * bande * (hash(vec2(floor(uTemps * 40.0), uGlitchY)) - 0.5) * 0.06;
  vec2 q = bomber(uv);
  vec2 uvq = vec2(q.x, 1.0 - q.y);

  float b = 0.14 * uBombe;
  float front = uBalayage * (1.0 + b) - b + b * (1.0 - pow(2.0 * q.x - 1.0, 2.0));

  vec2 p = q * uTaille;
  vec2 cellule = floor(p / uCellule);
  vec2 local = fract(p / uCellule);
  vec2 centre = (cellule + 0.5) / uGrille;
  vec2 echantillon = vec2(centre.x, 1.0 - centre.y);

  vec4 source = textureLod(uSource, echantillon, 0.0);
  float formes = source.r;
  float etoile = source.g;
  bool panneau = source.b > 0.5;

  float h = hash(cellule);
  float h2 = hash(cellule + 17.3);
  vec2 pc = (cellule + 0.5) * uCellule;
  // Métaballe : le champ du curseur fusionne avec celui des formes proches,
  // la tache s'étire vers elles et coule le long de leurs contours.
  float dist = length(pc - uSouris);
  float meta = 0.0;
  if (uTorche > 0.0 && dist < 420.0) {
    float curseur = exp(-dist * dist / 9800.0);
    float proche = exp(-dist * dist / 64800.0);
    float formesFloues = densite(echantillon, 2.0) * 0.55 + densite(echantillon, 3.5) * 0.75;
    float ondule = sin(pc.x * 0.031 + uTemps * 1.4) * sin(pc.y * 0.027 - uTemps * 1.1) * 0.05;
    meta = curseur + formesFloues * proche * 1.1 + ondule * step(0.05, curseur + proche * formesFloues);
  }
  float torche = uTorche * smoothstep(0.3, 0.38, meta);
  float lisere = uTorche * exp(-pow((meta - 0.34) / 0.03, 2.0));
  float champ = step(h2, max(uChamp, torche)) * (0.5 + (h - 0.5) * 0.5 + (hash(cellule + floor(uTemps * 2.0 + h * 9.0)) - 0.5) * 0.12);

  float lum = max(formes, champ);
  lum *= 1.0 - uCreux * 0.8 * etoile;
  lum = mix(lum, 1.0, uAllumage * etoile);
  lum += lisere * 0.55;
  if (panneau) lum = 0.0;
  float survol = uTorche > 0.0 ? smoothstep(0.5, 0.75, meta) : smoothstep(80.0, 0.0, dist);
  lum += survol * 0.25 * step(0.05, lum);

  vec4 virus = textureLod(uVirus, echantillon, 0.0);
  bool estVirus = !panneau && virus.a * uVirusForce > 0.3 + 0.4 * h2;
  float lumVirus = clamp(virus.b / max(virus.a, 0.01), 0.0, 1.0);

  vec2 grille1 = ceil(uTaille / uCellule);
  vec4 texte = texelFetch(uTexte1, ivec2(clamp(cellule, vec2(0.0), grille1 - 1.0)), 0);
  bool ecrit = texte.r > 0.0;

  float masque;
  float intensite;
  vec3 teinte = ROUGE;
  if (ecrit) {
    masque = glyphe(floor(texte.r * 255.0 + 0.5) - 1.0, local);
    intensite = texte.g + survol * 0.3;
  } else if (estVirus) {
    float l = clamp(0.12 + lumVirus * 0.9, 0.0, 0.999);
    masque = glyphe(uRampe[int(l * 10.0)], local);
    intensite = 0.6 + 0.7 * lumVirus;
    teinte = mix(ROUGE, PALE, lumVirus * lumVirus);
  } else {
    masque = glyphe(uRampe[int(clamp(lum, 0.0, 0.999) * 10.0)], local);
    intensite = mix(0.35 + 0.6 * lum, 1.0, uAllumage * etoile);
    teinte = mix(ROUGE, ROSE, max(uAllumage * etoile, step(0.9, formes) * 0.5));
  }

  float allume = (ecrit || estVirus) ? 0.0 : uAllumage * etoile;
  vec3 crt = ROUGE_SOMBRE * 0.35 + teinte * masque * intensite * (1.0 + allume * (uScintille + uCharge));
  crt += ROUGE * 0.05 * clamp(lum, 0.0, 1.0);

  vec4 figure = texture(uFigure, uvq);
  vec2 micro = floor(p / vec2(3.0, 5.0));
  vec2 localMicro = fract(p / vec2(3.0, 5.0));
  float hm = hash(micro);
  bool silhouette = !panneau && !ecrit && figure.a * uFigureForce > 0.2 + 0.55 * hm;
  if (silhouette) {
    float lumFigure = pow(clamp(figure.r / max(figure.a, 0.01), 0.0, 1.0), 0.7);
    bool suspect = figure.r - figure.g > 0.25 * figure.a;
    float l = clamp(lumFigure + (hash(micro + floor(uTemps * 6.0 + hm * 5.0)) - 0.5) * 0.3, 0.0, 0.999);
    float g = glypheGrand(uChiffres[int(l * 10.0)], localMicro, 3.0);
    vec3 couleur = suspect ? ROSE : mix(ROSE, PALE, lumFigure);
    float clignote = suspect ? 0.55 + 0.45 * step(0.5, fract(uTemps * 1.6)) : 1.0;
    crt = couleur * (0.35 + 0.9 * g) * (0.6 + 0.5 * lumFigure) * clignote;
  }
  crt += mix(ROUGE, ROSE, 0.5) * (lueur(uvq) * 0.35 + trainee(uvq) * 0.25) * uFigureForce * (silhouette ? 0.3 : 1.0);

  float halo = texture(uHalo, uvq).g;
  crt += mix(ROUGE, ROSE, 0.6) * halo * uAllumage * (uScintille + uCharge * 1.5) * 0.85;

  vec4 affiche = texture(uAffiche, uvq);
  vec2 point = floor(p / uTrame);
  float trame = texture(uAffiche, vec2((point.x + 0.5) * uTrame / uTaille.x, 1.0 - (point.y + 0.5) * uTrame / uTaille.y)).r;
  float rayon = uTrame * 0.6 * sqrt(trame);
  float pastille = 1.0 - smoothstep(rayon - 0.5, rayon + 0.5, length(fract(p / uTrame) - 0.5) * uTrame);
  crt = mix(crt, ROSE * 1.15, pastille * step(0.02, trame));
  crt += mix(ROUGE, ROSE, 0.8) * affiche.g * 1.15;

  float bord = exp(-abs(q.y - front) * 140.0) * step(0.001, uBalayage) * step(uBalayage, 0.999);
  crt += ROSE * bord * 0.5;

  vec2 c = q - 0.5;
  float vignette = smoothstep(0.98, 0.35, length(c * vec2(0.85, 1.05)));
  crt *= mix(vignette, 1.0, 0.35);

  float d = boiteArrondie(c, vec2(0.5), 0.045);
  float ecran = 1.0 - smoothstep(-0.003, 0.0, d);
  vec3 couleur = q.y < front ? crt : vec3(0.0);
  if (q.y >= front && texte.a > 0.5) couleur = ROUGE * masque * intensite;
  couleur += ROUGE * 0.35 * exp(-abs(d) * 420.0) + ROUGE_SOMBRE * 0.6 * exp(-abs(d) * 60.0);
  sortie = vec4(couleur * ecran + ROUGE_SOMBRE * 0.25 * exp(-max(d, 0.0) * 40.0) * (1.0 - ecran), 1.0);
}
`;
