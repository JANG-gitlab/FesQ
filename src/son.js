let ctx = null;
let sortie = null;
let bourdon = null;
let souffleDonnees = null;
let filtreDonnees = null;
let voulu = true;

function creer() {
  ctx = new AudioContext();
  const compresseur = ctx.createDynamicsCompressor();
  compresseur.threshold.value = -18;
  compresseur.ratio.value = 4;
  sortie = ctx.createGain();
  sortie.gain.value = 0.9;
  sortie.connect(compresseur).connect(ctx.destination);

  bourdon = ctx.createGain();
  bourdon.gain.value = 0;
  const grave = ctx.createOscillator();
  const quinte = ctx.createOscillator();
  grave.frequency.value = 41.2;
  quinte.frequency.value = 61.9;
  const passeBas = ctx.createBiquadFilter();
  passeBas.type = 'lowpass';
  passeBas.frequency.value = 140;
  grave.connect(passeBas);
  quinte.connect(passeBas);
  passeBas.connect(bourdon).connect(sortie);
  grave.start();
  quinte.start();

  const bruit = ctx.createBufferSource();
  bruit.buffer = tamponBruit(2);
  bruit.loop = true;
  filtreDonnees = ctx.createBiquadFilter();
  filtreDonnees.type = 'bandpass';
  filtreDonnees.Q.value = 6;
  filtreDonnees.frequency.value = 900;
  souffleDonnees = ctx.createGain();
  souffleDonnees.gain.value = 0;
  bruit.connect(filtreDonnees).connect(souffleDonnees).connect(sortie);
  bruit.start();
}

function tamponBruit(duree) {
  const t = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duree), ctx.sampleRate);
  const d = t.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return t;
}

function pret() {
  return ctx && voulu && ctx.state === 'running';
}

function gain(debut, attaque, duree, volume) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, debut);
  g.gain.exponentialRampToValueAtTime(volume, debut + attaque);
  g.gain.exponentialRampToValueAtTime(0.0001, debut + duree);
  g.connect(sortie);
  return g;
}

function osc(type, frequence, debut, duree, volume, vers = null) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(frequence, debut);
  if (vers) o.frequency.exponentialRampToValueAtTime(vers, debut + duree);
  o.connect(gain(debut, 0.004, duree, volume));
  o.start(debut);
  o.stop(debut + duree + 0.02);
}

function bruit(debut, duree, volume, { type = 'highpass', frequence = 4000, q = 0.7 } = {}) {
  const s = ctx.createBufferSource();
  s.buffer = tamponBruit(duree);
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = frequence;
  f.Q.value = q;
  s.connect(f).connect(gain(debut, 0.002, duree, volume));
  s.start(debut);
}

export const son = {
  get actif() {
    return voulu;
  },

  deverrouiller() {
    if (!ctx) creer();
    if (voulu && ctx.state !== 'running') ctx.resume();
    bourdon.gain.setTargetAtTime(voulu ? 0.05 : 0, ctx.currentTime, 0.6);
  },

  basculer() {
    voulu = !voulu;
    if (!ctx) return voulu;
    if (voulu) ctx.resume();
    bourdon.gain.setTargetAtTime(voulu ? 0.05 : 0, ctx.currentTime, 0.2);
    souffleDonnees.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
    return voulu;
  },

  flux(vitesse) {
    if (!pret()) return;
    const v = Math.min(1, Math.abs(vitesse) * 2.5);
    souffleDonnees.gain.setTargetAtTime(v * 0.05, ctx.currentTime, 0.08);
    filtreDonnees.frequency.setTargetAtTime(600 + v * 2600, ctx.currentTime, 0.1);
  },

  relais() {
    if (!pret()) return;
    const t = ctx.currentTime;
    bruit(t, 0.012, 0.18, { frequence: 2500 });
    osc('square', 90, t, 0.02, 0.03);
  },

  impact() {
    if (!pret()) return;
    const t = ctx.currentTime;
    osc('sine', 72, t, 0.7, 0.5, 28);
    bruit(t, 0.35, 0.06, { type: 'lowpass', frequence: 400 });
    osc('square', 1975, t + 0.05, 0.03, 0.015);
  },

  donnees() {
    if (!pret()) return;
    const t = ctx.currentTime;
    for (let i = 0; i < 6; i++) {
      osc('square', 1200 + Math.floor(Math.random() * 8) * 350, t + i * 0.018, 0.016, 0.012);
    }
  },

  sonar() {
    if (!pret()) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(1180, t);
    const g = gain(t, 0.003, 1.4, 0.12);
    const retard = ctx.createDelay();
    retard.delayTime.value = 0.21;
    const retour = ctx.createGain();
    retour.gain.value = 0.35;
    o.connect(g);
    g.connect(retard).connect(retour).connect(retard);
    retour.connect(sortie);
    o.start(t);
    o.stop(t + 1.5);
  },

  refus() {
    if (!pret()) return;
    const t = ctx.currentTime;
    osc('square', 155, t, 0.09, 0.07);
    osc('square', 164, t, 0.09, 0.07);
    osc('square', 155, t + 0.12, 0.16, 0.07);
    bruit(t, 0.05, 0.05, { frequence: 6000 });
  },

  verrou() {
    if (!pret()) return;
    const t = ctx.currentTime;
    bruit(t, 0.01, 0.2, { frequence: 3000 });
    osc('square', 880, t + 0.02, 0.05, 0.035);
    osc('square', 1320, t + 0.08, 0.08, 0.035);
  },

  rumeur(intensite) {
    if (!pret() || intensite < 0.05) return;
    const t = ctx.currentTime;
    bruit(t, 0.25, 0.08 * intensite, { type: 'lowpass', frequence: 160, q: 2 });
  },

  decharge() {
    if (!pret()) return;
    const t = ctx.currentTime;
    for (let i = 0; i < 5; i++) bruit(t + i * 0.025 + Math.random() * 0.02, 0.03, 0.14, { type: 'bandpass', frequence: 2000 + Math.random() * 5000, q: 1.5 });
    osc('sawtooth', 55, t, 0.5, 0.12, 30);
  },

  charge(k) {
    if (!pret()) return;
    bourdon.gain.setTargetAtTime(0.05 + k * 0.12, ctx.currentTime, 0.08);
  },

  survol() {
    if (!pret()) return;
    osc('square', 2637, ctx.currentTime, 0.012, 0.02);
  },
};

for (const evenement of ['pointerdown', 'keydown', 'touchstart']) {
  addEventListener(evenement, () => son.deverrouiller(), { passive: true });
}
