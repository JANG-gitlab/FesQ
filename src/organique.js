function aleatoire(graine) {
  let a = graine;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gris(v) {
  return `rgb(${Math.round(v * 255)},0,0)`;
}

export function creerArbre() {
  const hasard = aleatoire(7);
  const segments = [];

  function pousser(parent, angle, longueur, profondeur, max, sens) {
    const s = { parent, angle, longueur, profondeur, sens, enfants: [] };
    segments.push(s);
    parent?.enfants.push(s);
    if (profondeur >= max) return s;
    const n = profondeur < 2 ? 2 : hasard() < 0.7 ? 2 : 3;
    for (let k = 0; k < n; k++) {
      const ecart = (k - (n - 1) / 2) * (0.5 + hasard() * 0.35) + (hasard() - 0.5) * 0.3;
      pousser(s, angle + ecart, longueur * (0.68 + hasard() * 0.18), profondeur + 1, max, sens);
    }
    return s;
  }

  const tronc = pousser(null, -Math.PI / 2, 1.8, 0, 6, -1);
  const racine = pousser(null, Math.PI / 2, 1.1, 0, 6, 1);
  const feuilles = segments.filter((s) => s.sens > 0 && !s.enfants.length);

  let zone = { x: 0, y: 0, l: 1, h: 1 };
  const positions = new Map();

  function tracer(ctx, s, x, y, croissance, souris, unite, maxProfondeur) {
    const visible = Math.min(1, Math.max(0, croissance * (maxProfondeur + 1) - s.profondeur));
    if (visible <= 0) return;
    let angle = s.angle;
    // Racines et branches se tendent vers le curseur, d'autant plus qu'elles sont fines.
    if (souris && s.profondeur > 0) {
      const vers = Math.atan2(souris.y - y, souris.x - x);
      const d = Math.atan2(Math.sin(vers - angle), Math.cos(vers - angle));
      const proximite = Math.max(0, 1 - Math.hypot(souris.x - x, souris.y - y) / (unite * 6));
      const souplesse = s.sens > 0 ? 0.5 : 0.42;
      angle += Math.max(-souplesse, Math.min(souplesse, d)) * proximite * (s.profondeur / 6);
    }
    const l = s.longueur * unite * visible;
    const x2 = x + Math.cos(angle) * l;
    const y2 = y + Math.sin(angle) * l;
    ctx.lineWidth = Math.max(3, (s.sens > 0 ? 12 : 15) * Math.pow(0.72, s.profondeur));
    ctx.strokeStyle = gris(s.sens > 0 ? 0.85 : 1);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    positions.set(s, { x: x2, y: y2, visible });
    if (visible >= 1) for (const e of s.enfants) tracer(ctx, e, x2, y2, croissance, souris, unite, maxProfondeur);
  }

  return {
    placer(z) {
      zone = z;
    },

    sol() {
      return zone.y + zone.h * 0.56;
    },

    dessiner(ctx, croissance, souris, t) {
      positions.clear();
      const x = zone.x + zone.l / 2;
      const y = zone.y + zone.h * 0.56;
      const unite = zone.h / 10;
      ctx.lineCap = 'round';
      tracer(ctx, tronc, x, y, Math.min(1, croissance * 1.4), souris, unite * 0.66, 6);
      tracer(ctx, racine, x, y, croissance, souris, unite * 0.85, 6);
      ctx.strokeStyle = gris(0.6);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(zone.x, y);
      ctx.lineTo(zone.x + zone.l, y);
      ctx.stroke();
      ctx.fillStyle = gris(0.3);
      const grains = aleatoire(3);
      for (let k = 0; k < 120; k++) {
        ctx.fillRect(zone.x + grains() * zone.l, y + 8 + grains() * zone.h * 0.4, 4, 4 + Math.sin(t + k) * 2);
      }
      ctx.lineCap = 'butt';
    },

    pointes() {
      const visibles = feuilles.map((s) => positions.get(s)).filter((p) => p && p.visible >= 1).sort((a, b) => a.x - b.x);
      if (visibles.length < 4) return [];
      return [0.04, 0.36, 0.64, 0.96].map((f) => visibles[Math.round(f * (visibles.length - 1))]);
    },
  };
}
