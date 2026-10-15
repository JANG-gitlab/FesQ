import {
  AnimationMixer, AnimationUtils, Fog, LinearFilter, LinearMipmapLinearFilter, LoopOnce,
  MeshBasicMaterial, PerspectiveCamera, Scene, Vector3, WebGLRenderTarget,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';

const PLACE = { x: 6.5, z: 4.5 };
// Le cycle de marche avance à 1,72 m/s : 0,58 s de cycle par mètre parcouru, pieds posés au sol.
const FOULEE = 0.58;
const VITESSE_MARCHE = 1.15;
const VITESSE_MAX = 1.9;
const ACCELERATION = 2.4;
const VOIES = Array.from({ length: 22 }, (_, i) => {
  const a = i * 2.39996 + 0.3;
  return {
    depart: { x: Math.sin(i * 12.989) * PLACE.x, z: Math.cos(i * 78.233) * PLACE.z },
    direction: { x: Math.cos(a), z: Math.sin(a) },
    vitesse: 0.8 + ((i * 37) % 10) / 25,
  };
});

export function lisser(a, b, x) {
  const k = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return k * k * (3 - 2 * k);
}

function boucler(v, demi) {
  return ((((v + demi) % (demi * 2)) + demi * 2) % (demi * 2)) - demi;
}

export function creerFigures() {
  const scene = new Scene();
  scene.fog = new Fog(0x000000, 8, 14);

  const camera = new PerspectiveCamera(32, 1, 0.1, 60);
  const cote = { position: new Vector3(0, 1.25, 9), cible: new Vector3(0, 0.95, 0) };
  const dessus = { position: new Vector3(0, 9.5, 8.5), cible: new Vector3(0, 0.4, 0) };
  const cible = new Vector3();
  const coin = new Vector3();
  const rendu = new WebGLRenderTarget(1, 1, { minFilter: LinearMipmapLinearFilter, magFilter: LinearFilter, generateMipmaps: true });
  const marcheurs = [];
  let sujet = null;
  let taille = { l: 1, h: 1 };

  new GLTFLoader().load(new URL('modeles/humain.glb', document.baseURI).href, (gltf) => {
    const clip = (nom) => gltf.animations.find((a) => a.name === nom);
    const refus = AnimationUtils.makeClipAdditive(clip('headShake').clone());
    const creer = (voie) => {
      const racine = clone(gltf.scene);
      const m = {
        racine, voie, matiere: new MeshBasicMaterial({ color: 0xffffff, transparent: true, fog: true }),
        arret: 0, suspect: false, opacite: 0, x: 2.6, vitesse: 0, cap: -Math.PI / 2, parcours: 0, allure: 0,
      };
      racine.traverse((o) => {
        if (o.isMesh) {
          o.material = m.matiere;
          o.frustumCulled = false;
        }
      });
      m.mixer = new AnimationMixer(racine);
      m.marche = m.mixer.clipAction(clip('walk'));
      m.repos = m.mixer.clipAction(clip('idle'));
      m.refus = m.mixer.clipAction(refus);
      m.refus.setLoop(LoopOnce, 1);
      m.marche.timeScale = 0;
      m.marche.play();
      m.repos.play();
      scene.add(racine);
      marcheurs.push(m);
      return m;
    };
    sujet = creer(null);
    for (const voie of VOIES) creer(voie);
  });

  function tourner(m, cap, k) {
    const d = cap - m.racine.rotation.y;
    m.racine.rotation.y += Math.atan2(Math.sin(d), Math.cos(d)) * k;
  }

  // Le sujet marche vers la position voulue par le défilement, à allure humaine.
  function placerSujet(m, p, dt) {
    const voulu = 2.6 - Math.max(0, p - 0.95) * 5;
    if (m.opacite < 0.01) {
      m.x = voulu;
      m.vitesse = 0;
    }
    if (Math.abs(voulu - m.x) > 4) m.x = voulu - Math.sign(voulu - m.x) * 4;
    const ecart = voulu - m.x;
    const desiree = m.arret > 0 ? 0 : Math.max(-VITESSE_MAX, Math.min(VITESSE_MAX, ecart * 2.2));
    const dv = desiree - m.vitesse;
    m.vitesse += Math.max(-ACCELERATION * dt, Math.min(ACCELERATION * dt, dv));
    if (Math.abs(ecart) < 0.004 && Math.abs(m.vitesse) < 0.05) m.vitesse = 0;
    m.x += m.vitesse * dt;
    m.racine.position.set(m.x, 0, 0.8);
    m.bord = 1;
    const allure = Math.abs(m.vitesse);
    if (allure > 0.05) m.cap = m.vitesse < 0 ? -Math.PI / 2 : Math.PI / 2;
    const cap = m.arret > 0 ? Math.atan2(camera.position.x - m.x, camera.position.z - 0.8) : m.cap;
    tourner(m, cap, Math.min(1, dt * (m.arret > 0 ? 5 : 7)));
    return allure;
  }

  // La foule marche en continu, chacun à son rythme, sans dépendre du défilement.
  function placerFoule(m, dt) {
    const allure = m.arret > 0 ? 0 : VITESSE_MARCHE * m.voie.vitesse;
    m.parcours += allure * dt;
    const x = boucler(m.voie.depart.x + m.voie.direction.x * m.parcours, PLACE.x);
    const z = boucler(m.voie.depart.z + m.voie.direction.z * m.parcours, PLACE.z);
    m.racine.position.set(x, 0, z);
    m.bord = lisser(0, 1.2, Math.min(PLACE.x - Math.abs(x), PLACE.z - Math.abs(z)));
    const cap = m.arret > 0 ? Math.atan2(camera.position.x - x, camera.position.z - z) : Math.atan2(m.voie.direction.x, m.voie.direction.z);
    tourner(m, cap, m.arret > 0 ? Math.min(1, dt * 5) : 1);
    return allure;
  }

  function versEcran(v) {
    v.project(camera);
    return { x: ((v.x + 1) / 2) * taille.l, y: ((1 - v.y) / 2) * taille.h, devant: v.z < 1 };
  }

  function cadre(m) {
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    const { x, z } = m.racine.position;
    for (let n = 0; n < 8; n++) {
      const e = versEcran(coin.set(x + (n & 1 ? 0.35 : -0.35), n & 2 ? 1.8 : 0, z + (n & 4 ? 0.35 : -0.35)));
      if (!e.devant) return null;
      x0 = Math.min(x0, e.x);
      y0 = Math.min(y0, e.y);
      x1 = Math.max(x1, e.x);
      y1 = Math.max(y1, e.y);
    }
    return { x0, y0, x1, y1 };
  }

  return {
    texture: rendu.texture,

    redimensionner(colonnes, rangees, largeur, hauteur) {
      rendu.setSize(Math.ceil(largeur), Math.ceil(hauteur));
      taille = { l: largeur, h: hauteur };
      camera.aspect = largeur / hauteur;
      const demi = Math.tan((16 * Math.PI) / 180) * Math.max(1, 1.6 / camera.aspect);
      camera.fov = (Math.atan(demi) * 360) / Math.PI;
      camera.updateProjectionMatrix();
    },

    mettreAJour(renderer, dt, p, { decalageX, decalageY, anime }) {
      const k = lisser(1.75, 2.25, p);
      camera.position.lerpVectors(cote.position, dessus.position, k);
      cible.lerpVectors(cote.cible, dessus.cible, k);
      camera.lookAt(cible);
      camera.setViewOffset(taille.l, taille.h, -decalageX * taille.l, -decalageY * taille.h, taille.l, taille.h);
      scene.fog.near = 8 + k * 2.5;
      scene.fog.far = 14 + k * 6;

      const sortie = 1 - lisser(2.75, 3.05, p);
      const foule = lisser(1.75, 2.1, p) * sortie;
      const pas = anime ? dt : 0;
      for (const m of marcheurs) {
        if (m.arret > 0) {
          m.arret = Math.max(0, m.arret - pas);
          if (m.arret === 0) m.refus.stop();
        }
        const allure = m === sujet ? placerSujet(m, p, dt) : placerFoule(m, pas);
        // Le cycle avance de la distance réellement parcourue : pas de glissement des pieds.
        const cycle = m.marche.getClip().duration;
        m.marche.time = (m.marche.time + allure * FOULEE * dt) % cycle;
        m.allure += (lisser(0.05, 0.45, allure) - m.allure) * Math.min(1, dt * 8);
        m.marche.setEffectiveWeight(m.allure);
        m.repos.setEffectiveWeight(1 - m.allure);
        m.mixer.update(pas);
        m.opacite = (m === sujet ? lisser(0.85, 1.1, p) * sortie : foule) * m.bord;
        m.matiere.opacity = m.opacite;
        m.racine.visible = m.opacite > 0.01;
        m.matiere.color.setHex(m.suspect ? 0xff0000 : 0xffffff);
      }
      renderer.setRenderTarget(rendu);
      renderer.setClearColor(0x000000, 0);
      renderer.clear();
      renderer.render(scene, camera);
      renderer.setRenderTarget(null);
    },

    cadres() {
      return marcheurs
        .filter((m) => m.opacite > 0.6)
        .map((m) => ({ m, sujet: m === sujet, suspect: m.suspect, id: 4021 + marcheurs.indexOf(m) * 137, cadre: cadre(m) }))
        .filter((c) => c.cadre);
    },

    regarder(m) {
      if (m.arret > 0) return false;
      m.arret = 3.4;
      m.refus.reset().play();
      return true;
    },

    marquer(m) {
      m.suspect = !m.suspect;
      return m.suspect;
    },

    suspects() {
      return marcheurs.filter((m) => m.suspect).length;
    },
  };
}
