const AVANCE_MAX = 0.3;
const VITESSE_MAX = 0.32;
const SENSIBILITE = 0.0011;

export function creerDefilement(etapes, { reduit }) {
  let position = 0;
  let cible = 0;
  let vitesse = 0;
  let saut = null;
  let toucher = null;

  const pousser = (delta) => {
    saut = null;
    cible = Math.min(etapes, Math.max(0, Math.min(position + AVANCE_MAX, Math.max(position - AVANCE_MAX, cible + delta))));
  };

  addEventListener('wheel', (e) => {
    e.preventDefault();
    const unite = e.deltaMode === 1 ? 32 : e.deltaMode === 2 ? innerHeight : 1;
    pousser(Math.max(-120, Math.min(120, e.deltaY * unite)) * SENSIBILITE);
  }, { passive: false });

  addEventListener('touchstart', (e) => { toucher = e.touches[0].clientY; }, { passive: true });
  addEventListener('touchmove', (e) => {
    if (toucher === null) return;
    const y = e.touches[0].clientY;
    pousser((toucher - y) * SENSIBILITE * 2.2);
    toucher = y;
  }, { passive: true });
  addEventListener('touchend', () => { toucher = null; });

  addEventListener('keydown', (e) => {
    if (e.target.closest?.('a, button') && (e.key === ' ' || e.key === 'Enter')) return;
    const pas = { ArrowDown: 0.12, ArrowUp: -0.12, PageDown: 0.3, PageUp: -0.3, ' ': 0.3, ArrowRight: 0.12, ArrowLeft: -0.12 }[e.key];
    if (pas === undefined) return;
    e.preventDefault();
    pousser(pas);
  });

  return {
    get position() {
      return position;
    },

    get vitesse() {
      return vitesse;
    },

    placer(etape) {
      position = cible = Math.min(etapes, Math.max(0, etape));
    },

    aller(etape) {
      saut = Math.min(etapes, Math.max(0, etape));
      if (reduit) position = cible = saut;
    },

    mettreAJour(dt) {
      if (saut !== null) {
        cible = saut;
        if (Math.abs(position - saut) < 0.001) saut = null;
      }
      const max = (saut !== null ? VITESSE_MAX * 4 : VITESSE_MAX) * dt;
      const ecart = cible - position;
      const pas = reduit ? ecart : Math.max(-max, Math.min(max, ecart * (1 - Math.exp(-dt * 6))));
      position += pas;
      vitesse = dt > 0 ? pas / dt : 0;
      return position;
    },
  };
}
