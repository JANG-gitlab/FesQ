import {
  CylinderGeometry, DirectionalLight, Group, HemisphereLight, IcosahedronGeometry, InstancedMesh, LinearFilter, LinearMipmapLinearFilter,
  Matrix4, Mesh, MeshLambertMaterial, Object3D, PerspectiveCamera, Quaternion, Scene, SphereGeometry, Vector3,
  WebGLRenderTarget,
} from 'three';

const PICS = 74;
const BOSSES = 260;

function fibonacci(n, i) {
  const y = 1 - (2 * (i + 0.5)) / n;
  const r = Math.sqrt(1 - y * y);
  const a = i * Math.PI * (3 - Math.sqrt(5));
  return new Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
}

function bosseler(geometrie) {
  const p = geometrie.attributes.position;
  const v = new Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).normalize();
    const relief = 1 + 0.025 * Math.sin(v.x * 23 + v.y * 7) * Math.sin(v.z * 19 - v.y * 11) + 0.015 * Math.sin(v.x * 61 + v.z * 47);
    v.multiplyScalar(relief);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  geometrie.computeVertexNormals();
  return geometrie;
}

export function creerVirus() {
  const scene = new Scene();
  scene.add(new HemisphereLight(0x0000ff, 0x000000, 0.35));
  const lumiere = new DirectionalLight(0x0000ff, 1.6);
  lumiere.position.set(-2.5, 3, 4);
  scene.add(lumiere);

  const matiere = new MeshLambertMaterial({ color: 0x0000ff });
  const virus = new Group();
  virus.add(new Mesh(bosseler(new IcosahedronGeometry(1, 6)), matiere));

  const tige = new CylinderGeometry(0.03, 0.045, 0.32, 6);
  tige.translate(0, 0.16, 0);
  const tete = new SphereGeometry(0.075, 10, 8);
  tete.scale(1.25, 0.85, 1.25);
  tete.translate(0, 0.36, 0);
  const tiges = new InstancedMesh(tige, matiere, PICS);
  const tetes = new InstancedMesh(tete, matiere, PICS * 3);
  const haut = new Vector3(0, 1, 0);
  const m = new Matrix4();
  const q = new Quaternion();
  const decalage = new Object3D();
  const points = [];
  for (let i = 0; i < PICS; i++) {
    const n = fibonacci(PICS, i);
    n.x += Math.sin(i * 12.9) * 0.08;
    n.normalize();
    points.push(n);
    q.setFromUnitVectors(haut, n);
    m.compose(n.clone().multiplyScalar(0.97), q, new Vector3(1, 0.85 + Math.sin(i * 7.1) * 0.15, 1));
    tiges.setMatrixAt(i, m);
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2;
      decalage.position.set(Math.cos(a) * 0.05, 0, Math.sin(a) * 0.05);
      decalage.updateMatrix();
      tetes.setMatrixAt(i * 3 + k, m.clone().multiply(decalage.matrix));
    }
  }
  virus.add(tiges, tetes);

  const bosse = new SphereGeometry(0.035, 6, 4);
  const bosses = new InstancedMesh(bosse, matiere, BOSSES);
  for (let i = 0; i < BOSSES; i++) {
    const n = fibonacci(BOSSES, i);
    m.makeTranslation(n.x * 1.01, n.y * 1.01, n.z * 1.01);
    bosses.setMatrixAt(i, m);
  }
  virus.add(bosses);
  scene.add(virus);

  const camera = new PerspectiveCamera(30, 1, 0.1, 20);
  camera.position.set(0, 0, 6.2);
  const rendu = new WebGLRenderTarget(1, 1, { minFilter: LinearMipmapLinearFilter, magFilter: LinearFilter, generateMipmaps: true });
  const tampon = new Vector3();
  let taille = { l: 1, h: 1 };

  const reperes = [
    { local: points[11].clone().multiplyScalar(1.38), nom: 'ATTACHMENT', note: 'its way in' },
    { local: new Vector3(0.62, -0.55, 0.56).normalize().multiplyScalar(1.0), nom: 'DISGUISE', note: 'looks like a safe file' },
    { local: new Vector3(-0.35, -0.2, 0.92).normalize().multiplyScalar(0.5), nom: 'PAYLOAD', note: 'steals, copies itself' },
  ];

  return {
    texture: rendu.texture,

    redimensionner(colonnes, rangees, largeur, hauteur) {
      rendu.setSize(colonnes * 2, rangees * 2);
      taille = { l: largeur, h: hauteur };
      camera.aspect = largeur / hauteur;
      camera.position.z = 6.2 * Math.max(1, 1.25 / camera.aspect);
      camera.updateProjectionMatrix();
    },

    rendre(renderer, { visible, angle, echelle, decalageX, decalageY, inclinaison = 0, lacet = 0 }) {
      renderer.setRenderTarget(rendu);
      renderer.setClearColor(0x000000, 0);
      renderer.clear();
      if (visible) {
        virus.rotation.set(0.35 + Math.sin(angle * 0.5) * 0.2 + inclinaison, angle + lacet, 0.1);
        virus.scale.setScalar(echelle);
        camera.setViewOffset(taille.l, taille.h, -decalageX * taille.l, -decalageY * taille.h, taille.l, taille.h);
        renderer.render(scene, camera);
      }
      renderer.setRenderTarget(null);
    },

    reperes() {
      virus.updateMatrixWorld();
      return reperes.map((r) => {
        tampon.copy(r.local).applyMatrix4(virus.matrixWorld);
        const face = tampon.z > -0.2;
        tampon.project(camera);
        return { ...r, x: ((tampon.x + 1) / 2) * taille.l, y: ((1 - tampon.y) / 2) * taille.h, face };
      });
    },

    // Rayon apparent à l'écran, en pixels (pour savoir si le curseur le touche).
    rayon() {
      tampon.set(0, 0, 0).project(camera);
      const x0 = tampon.x;
      tampon.set(1.25 * virus.scale.x, 0, 0).project(camera);
      return (Math.abs(tampon.x - x0) / 2) * taille.l;
    },

    centre() {
      tampon.set(0, 0, 0).project(camera);
      return { x: ((tampon.x + 1) / 2) * taille.l, y: ((1 - tampon.y) / 2) * taille.h };
    },
  };
}
