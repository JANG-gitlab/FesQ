import {
  AnimationMixer, AnimationUtils, DirectionalLight, Fog, HemisphereLight, LinearFilter, LoopOnce,
  MeshLambertMaterial, PerspectiveCamera, Scene, Vector3, WebGLRenderTarget,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';

const PLACE = { x: 6.5, z: 4.5 };
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
  scene.add(new HemisphereLight(0xffffff, 0x666666, 2.6));
  const soleil = new DirectionalLight(0xffffff, 2);
  soleil.position.set(-3, 6, 5);
  scene.add(soleil);

  const camera = new PerspectiveCamera(32, 1, 0.1, 60);
  const cote = { position: new Vector3(0, 1.25, 9), cible: new Vector3(0, 0.95, 0) };
  const dessus = { position: new Vector3(0, 9.5, 8.5), cible: new Vector3(0, 0.4, 0) };
  const cible = new Vector3();
  const coin = new Vector3();
  const rendu = new WebGLRenderTarget(1, 1, { minFilter: LinearFilter, magFilter: LinearFilter });
  const marcheurs = [];
  let sujet = null;
  let taille = { l: 1, h: 1 };

  new GLTFLoader().load(new URL('modeles/silhouette.glb', document.baseURI).href, (gltf) => {
    const clip = (nom) => gltf.animations.find((a) => a.name === nom);
    const refus = AnimationUtils.makeClipAdditive(clip('headShake').clone());
    const creer = (voie) => {
      const racine = clone(gltf.scene);
      const m = { racine, voie, matiere: new MeshLambertMaterial({ color: 0xffffff, transparent: true }), arret: 0, suspect: false, opacite: 0 };
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
      m.marche.play();
      scene.add(racine);
      marcheurs.push(m);
      return m;
    };
    sujet = creer(null);
    for (const voie of VOIES) creer(voie);
  });

  function placer(m, p) {
    let distance;
    let x;
    let z;
    let dx;
    let dz;
    if (m === sujet) {
      distance = Math.max(0, p - 0.95) * 5;
      x = 2.6 - distance;
      z = 0.8;
      dx = -1;
      dz = 0;
    } else {
      distance = p * 9 * m.voie.vitesse;
      x = boucler(m.voie.depart.x + m.voie.direction.x * distance, PLACE.x);
      z = boucler(m.voie.depart.z + m.voie.direction.z * distance, PLACE.z);
      dx = m.voie.direction.x;
      dz = m.voie.direction.z;
    }
    m.racine.position.set(x, 0, z);
    const bord = Math.min(PLACE.x - Math.abs(x), PLACE.z - Math.abs(z));
    m.bord = m === sujet ? 1 : lisser(0, 1.2, bord);
    const direction = m.arret > 0 ? Math.atan2(camera.position.x - x, camera.position.z - z) : Math.atan2(dx, dz);
    const d = direction - m.racine.rotation.y;
    m.racine.rotation.y += Math.atan2(Math.sin(d), Math.cos(d)) * (m.arret > 0 ? 0.08 : 1);
    return distance;
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
      for (const m of marcheurs) {
        if (anime && m.arret > 0) {
          m.arret = Math.max(0, m.arret - dt);
          if (m.arret === 0) {
            m.repos.fadeOut(0.5);
            m.marche.reset().fadeIn(0.5).play();
          }
        }
        const distance = placer(m, p);
        if (m.arret === 0) m.marche.time = distance * 0.95;
        m.mixer.update(m.arret > 0 && anime ? dt : 0);
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
      m.marche.fadeOut(0.4);
      m.repos.reset().fadeIn(0.4).play();
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
