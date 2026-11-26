import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";
import { createSurface } from "./surface.js";
import { createSecondPlanet } from "./planet.js";
import { createForest } from "./forest.js";
import { initExtras } from "./extras.js";
// ==========================================
// دوال التكسيرات: تكسير الكوكب والشمس + توهج الهالة
// ==========================================
function makeTexture(base, colors, count) {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 512;
  const g = c.getContext("2d");
  g.fillStyle = base;
  g.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < count; i++) {
    const x = Math.random() * 1024;
    const y = Math.random() * 512;
    const r = 10 + Math.random() * 60;
    const col = colors[Math.floor(Math.random() * colors.length)];
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, col + "88");
    grad.addColorStop(1, col + "00");
    g.fillStyle = grad;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeGlowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, "rgba(255,170,60,1)");
  grad.addColorStop(0.35, "rgba(255,90,20,0.4)");
  grad.addColorStop(1, "rgba(255,60,0,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

// ==========================================
// 1. إعداد المشهد والكاميرا ومحرك العرض
// ==========================================
const scene = new THREE.Scene();

const spaceColor = new THREE.Color(0x020304);
const marsSkyColor = new THREE.Color(0x000000);
scene.background = spaceColor.clone();

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.z = 25;

const renderer = new THREE.WebGLRenderer({
  antialias: true
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// ==========================================
// 2. الإضاءة
// ==========================================
const sun = new THREE.DirectionalLight(0xffffff, 2);
sun.position.set(-350, 30, 50);
scene.add(sun);

const ambient = new THREE.AmbientLight(0x24100a, 0.3);
scene.add(ambient);

const fillLight = new THREE.HemisphereLight(0xb9d7ff, 0x24150e, 0.39);
scene.add(fillLight);

// ==========================================
// 3. النجوم والشمس
// ==========================================
const starCount = 1100;
const positions = new Float32Array(starCount * 3);
let sunWarned = false;
let sunGameOver = false;
for (let i = 0; i < positions.length; i++) {
  positions[i] = (Math.random() - 0.5) * 800;
}

const starGeometry = new THREE.BufferGeometry();
starGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

const starMaterial = new THREE.PointsMaterial({
  color: 0xffffff,
  size: 0.6,
  transparent: true,
  opacity: 1
});

const stars = new THREE.Points(starGeometry, starMaterial);
scene.add(stars);

const sunGeometry = new THREE.SphereGeometry(28, 128, 96);
const sunMaterial = new THREE.MeshStandardMaterial({
  color: 0xFFB04A,
  emissive: 0xFF5B16,
  emissiveIntensity: 3.5,
  roughness: 0.85,
  transparent: true,
  opacity: 1
});
const sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
sunMesh.position.set(0, -15, -300);
scene.add(sunMesh);

sunMaterial.emissive.set(0xffffff);
sunMaterial.emissiveMap = makeTexture("#ff8a2a",
  ["#ffd070", "#ff4a10", "#c82a08"], 700);
sunMaterial.emissiveIntensity = 2.5;

const corona = new THREE.Sprite(new THREE.SpriteMaterial({
  map: makeGlowTexture(),
  blending: THREE.AdditiveBlending,
  transparent: true,
  depthWrite: false
}));
corona.scale.set(140, 140, 1);
corona.position.copy(sunMesh.position);
scene.add(corona);

const zn = new THREE.PointLight(0x3A160D, 4, 1000);
zn.position.copy(sunMesh.position);
scene.add(zn);

const fkf = new THREE.SphereGeometry(32, 64, 48);
const gnc = new THREE.MeshBasicMaterial({
  color: 0xC83B12,
  transparent: true,
  opacity: 0.2,
  side: THREE.BackSide,
  blending: THREE.AdditiveBlending,
  depthWrite: false
});
const sb = new THREE.Mesh(fkf, gnc);
sb.position.copy(sunMesh.position);
scene.add(sb);

const sunGlowBaseOpacity = 0.2;
const sunLightBaseIntensity = 4;

function updateSunVisibility(visibility) {
  const v = THREE.MathUtils.clamp(visibility, 0, 1);
  const show = v > 0.01;

  sunMesh.visible = show;
  sb.visible = show;
  zn.visible = show;
  corona.visible = show;

  sunMaterial.opacity = v;
  gnc.opacity = sunGlowBaseOpacity * v;
  zn.intensity = sunLightBaseIntensity * v;
  corona.material.opacity = v;
}

// ==========================================
// 4. كوكب المريخ والغلاف الجوي والقمر
// ==========================================
const geometry = new THREE.SphereGeometry(10, 96, 64);
const pos = geometry.attributes.position;

for (let i = 0; i < 40; i++) {
  const index = Math.floor(Math.random() * pos.count);
  const cx = pos.getX(index);
  const cy = pos.getY(index);
  const cz = pos.getZ(index);
  const radius = Math.random() * 1.2 + 1.2;

  for (let j = 0; j < pos.count; j++) {
    const px = pos.getX(j);
    const py = pos.getY(j);
    const pz = pos.getZ(j);

    const distance = Math.sqrt(
      (px - cx) ** 2 +
      (py - cy) ** 2 +
      (pz - cz) ** 2
    );

    if (distance < radius) {
      const t = distance / radius;
      const depth = (1 - t * t) * 0.30;
      const edge = Math.exp(-Math.pow((t - 0.82) / 0.12, 2)) * 0.06;
      const finalDepth = depth - edge;
      const length = Math.sqrt(px * px + py * py + pz * pz);
      const factor = (length - finalDepth) / length;

      pos.setXYZ(j, px * factor, py * factor, pz * factor);
    }
  }
}

geometry.computeVertexNormals();

const material = new THREE.MeshStandardMaterial({
  color: 0xA85B42,
  roughness: 1,
  metalness: 0,
  transparent: true,
  opacity: 1
});

const marsTex = makeTexture("#a85b42",
  ["#7a3a28", "#c98058", "#5a2a1e", "#d9a07a"], 900);
material.map = marsTex;
material.bumpMap = marsTex;
material.bumpScale = 0.6;
material.color.set(0xffffff);

const planet = new THREE.Mesh(geometry, material);
scene.add(planet);

// الكوكب الثاني (الأخضر)
const planet2 = createSecondPlanet(scene, planet);
const planet2Home = planet2.position.clone();

const atmosphereGeometry = new THREE.SphereGeometry(10.4, 32, 24);
const atmosphereMaterial = new THREE.MeshStandardMaterial({
  color: 0xff6a2a,
  roughness: 1,
  metalness: 0,
  transparent: true,
  opacity: 0.2,
  side: THREE.BackSide,
  blending: THREE.AdditiveBlending,
  depthWrite: false
});
const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
scene.add(atmosphere);

const moon = new THREE.SphereGeometry(2, 24, 16);
const moonmaterial = new THREE.MeshStandardMaterial({
  color: 0x888888,
  transparent: true,
  opacity: 1
});

const orbit = new THREE.Group();
scene.add(orbit);

const moonplanet = new THREE.Mesh(moon, moonmaterial);
moonplanet.position.set(19, 0, 0);
orbit.add(moonplanet);

// دوال مساعدة لإظهار وتلاشي الكوكبين معًا
function showPlanets(v) {
  planet.visible = v;
  planet2.visible = v;
  atmosphere.visible = v;
  orbit.visible = v;
}

function fadePlanets(o) {
  planet.material.opacity = o;
  planet2.material.opacity = o;
}

// ==========================================
// 5. أسطح الكواكب واللاعب (المريخ + الغابة)
// ==========================================
const marsSurface = createSurface(scene);
marsSurface.setSurfaceOpacity(0);
marsSurface.player.visible = false;

const forestSurface = createForest(scene, marsSurface.player);
forestSurface.setSurfaceOpacity(0);

let surface = marsSurface;
let activePlanet = planet;

// تبديل السطح الفعّال (ينقل نفس اللاعب إلى سطح الكوكب المطلوب)
function useSurface(s) {
  surface = s;
  activePlanet = s === forestSurface ? planet2 : planet;
  const other = s === forestSurface ? marsSurface : forestSurface;
  other.surfaceGroup.visible = false;
  s.surfaceGroup.add(marsSurface.player);
  const rnBtn = document.getElementById("rn");
  if (rnBtn) rnBtn.style.display = "none";
}

// ==========================================
// 6. بناء المركبة
// ==========================================
const chip = new THREE.Group();
chip.scale.setScalar(0.65);

function buildShip() {
  const ship = new THREE.Group();

  const hullMat = new THREE.MeshStandardMaterial({
    color: 0xD5DBE1,
    metalness: 0.25,
    roughness: 0.45
  });

  const wingMat = new THREE.MeshStandardMaterial({
    color: 0x7E8FA3,
    metalness: 0.3,
    roughness: 0.4,
    side: THREE.DoubleSide
  });

  const panelMat = new THREE.MeshStandardMaterial({
    color: 0x4F5F72,
    metalness: 0.3,
    roughness: 0.5
  });

  const darkMat = new THREE.MeshStandardMaterial({
    color: 0x1B2530,
    metalness: 0.4,
    roughness: 0.5
  });

  const darkSideMat = new THREE.MeshStandardMaterial({
    color: 0x1B2530,
    metalness: 0.5,
    roughness: 0.45,
    side: THREE.DoubleSide
  });

  const accentMat = new THREE.MeshStandardMaterial({
    color: 0xE0561F,
    metalness: 0.3,
    roughness: 0.4,
    side: THREE.DoubleSide
  });

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x0A3A66,
    metalness: 0.9,
    roughness: 0.05,
    clearcoat: 1,
    emissive: 0x052B55,
    emissiveIntensity: 0.35,
    transparent: true,
    opacity: 0.82
  });

  const glowMat = new THREE.MeshStandardMaterial({
    color: 0x00AFFF,
    emissive: 0x0088FF,
    emissiveIntensity: 2,
    side: THREE.DoubleSide
  });

  const heatMat = new THREE.MeshStandardMaterial({
    color: 0xFF6A00,
    emissive: 0xFF4400,
    emissiveIntensity: 1.5
  });

  const flameMat = new THREE.MeshBasicMaterial({
    color: 0x33BBFF,
    transparent: true,
    opacity: 0.4
  });

  const coreMat = new THREE.MeshBasicMaterial({
    color: 0xCCF4FF,
    transparent: true,
    opacity: 0.8
  });

  const whiteLightMat = new THREE.MeshStandardMaterial({
    color: 0xFFFFFF,
    emissive: 0xFFFFFF,
    emissiveIntensity: 2
  });

  function plate(pts, depth, mat, side, bev) {
    const sh = new THREE.Shape();

    pts.forEach(function (p, i) {
      const y = p[1] * side;
      if (i === 0) {
        sh.moveTo(p[0], y);
      } else {
        sh.lineTo(p[0], y);
      }
    });

    sh.closePath();

    const opts = {
      depth: depth,
      bevelEnabled: bev > 0,
      bevelSegments: 2,
      bevelSize: bev,
      bevelThickness: bev
    };

    return new THREE.Mesh(
      new THREE.ExtrudeGeometry(sh, opts),
      mat
    );
  }

  const profile = [
    [0, -6.5],
    [0.8, -6.5],
    [0.98, -6.0],
    [1.05, -4.5],
    [1.03, -2.5],
    [0.97, -0.5],
    [0.9, 1.5],
    [0.75, 3.3],
    [0.55, 4.8],
    [0.35, 5.8],
    [0.2, 6.3],
    [0, 6.7]
  ].map(function (p) {
    return new THREE.Vector2(p[0], p[1]);
  });

  function rAt(x) {
    const y = -x;

    for (let i = 0; i < profile.length - 1; i++) {
      const p = profile[i];
      const q = profile[i + 1];

      if (y >= p.y && y <= q.y) {
        const t = (y - p.y) / (q.y - p.y);
        return p.x + (q.x - p.x) * t;
      }
    }

    return 0;
  }

  const fus = new THREE.Mesh(
    new THREE.LatheGeometry(profile, 40),
    hullMat
  );
  fus.rotation.z = Math.PI / 2;
  fus.scale.set(0.75, 1, 1.1);
  ship.add(fus);

  [-5.6, -0.4, 1.2, 2.8, 4.3, 5.7].forEach(function (x) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(rAt(x) + 0.015, 0.018, 8, 40),
      darkMat
    );
    ring.scale.set(1.1, 0.75, 1);
    ring.rotation.y = Math.PI / 2;
    ring.position.x = x;
    ship.add(ring);
  });

  const band = new THREE.Mesh(
    new THREE.TorusGeometry(rAt(-4.85) + 0.02, 0.05, 8, 40),
    accentMat
  );
  band.scale.set(1.1, 0.75, 1);
  band.rotation.y = Math.PI / 2;
  band.position.x = -4.85;
  ship.add(band);

  const tip = new THREE.Mesh(
    new THREE.ConeGeometry(0.2, 1.2, 16),
    darkMat
  );
  tip.rotation.z = Math.PI / 2;
  tip.position.set(-6.3, 0, 0);
  ship.add(tip);

  const pitot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.025, 1.3, 8),
    hullMat
  );
  pitot.rotation.z = Math.PI / 2;
  pitot.position.set(-7.4, 0, 0);
  ship.add(pitot);

  const cockpit = new THREE.Mesh(
    new THREE.SphereGeometry(1, 28, 20),
    glassMat
  );
  cockpit.scale.set(1.9, 0.55, 0.62);
  cockpit.position.set(-2.8, 0.5, 0);
  ship.add(cockpit);

  [-1.2, 0, 1.2].forEach(function (dx) {
    const k = Math.sqrt(1 - (dx / 1.9) * (dx / 1.9));
    const fr = new THREE.Mesh(
      new THREE.TorusGeometry(1, 0.035, 6, 28),
      darkMat
    );
    fr.scale.set(0.62 * k * 1.01, 0.55 * k * 1.01, 1);
    fr.rotation.y = Math.PI / 2;
    fr.position.set(-2.8 + dx, 0.5, 0);
    ship.add(fr);
  });

  const rail = new THREE.Mesh(
    new THREE.TorusGeometry(1, 0.03, 6, 32),
    darkMat
  );
  rail.scale.set(1.9 * 1.01, 0.55 * 1.01, 1);
  rail.position.set(-2.8, 0.5, 0);
  ship.add(rail);

  const helmet = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 16, 12),
    new THREE.MeshStandardMaterial({ color: 0xDDDDDD, roughness: 0.5 })
  );
  helmet.position.set(-2.6, 0.62, 0);
  ship.add(helmet);

  const seat = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.35, 0.5),
    darkMat
  );
  seat.position.set(-2.2, 0.5, 0);
  ship.add(seat);

  const spine = plate(
    [[0, 0], [1.5, 0.22], [5.0, 0.22], [5.6, 0]],
    0.5,
    hullMat,
    1,
    0.03
  );
  spine.position.set(-0.5, 0.68, -0.25);
  ship.add(spine);

  const antenna = plate(
    [[0, 0], [0.5, 0], [0.3, 0.35], [0.1, 0.35]],
    0.04,
    darkMat,
    1,
    0
  );
  antenna.position.set(1.5, 0.88, -0.02);
  ship.add(antenna);

  for (let i = 0; i < 4; i++) {
    [1, -1].forEach(function (sd) {
      const v = new THREE.Mesh(
        new THREE.BoxGeometry(0.25, 0.04, 0.2),
        darkMat
      );
      v.position.set(-0.2 + i * 0.4, 0.63, sd * 0.5);
      ship.add(v);
    });
  }

  function makeIntake(side) {
    const intake = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.5, 0.5),
      darkMat
    );
    intake.position.set(0.2, -0.2, side * 0.95);
    intake.rotation.y = side * 0.1;
    ship.add(intake);
  }

  makeIntake(1);
  makeIntake(-1);

  const wingPts = [
    [-2.6, 0.7],
    [3.0, 5.4],
    [4.0, 5.4],
    [4.4, 0.7]
  ];

  function makeWing(side) {
    const w = plate(wingPts, 0.12, wingMat, side, 0.03);
    w.rotation.x = Math.PI / 2;
    w.position.set(0.3, 0.05, 0);
    ship.add(w);

    const slat = plate(
      [[-2.481, 0.8], [2.88, 5.3], [3.28, 5.3], [-2.08, 0.8]],
      0.012,
      panelMat,
      side,
      0
    );
    slat.rotation.x = Math.PI / 2;
    slat.position.set(0.3, 0.095, 0);
    ship.add(slat);

    const ail = plate(
      [[3.34, 2.6], [3.13, 5.2], [4.0, 5.2], [4.22, 2.6]],
      0.012,
      panelMat,
      side,
      0
    );
    ail.rotation.x = Math.PI / 2;
    ail.position.set(0.3, 0.095, 0);
    ship.add(ail);

    const flap = plate(
      [[3.3, 0.9], [3.3, 2.4], [4.25, 2.4], [4.35, 0.9]],
      0.012,
      panelMat,
      side,
      0
    );
    flap.rotation.x = Math.PI / 2;
    flap.position.set(0.3, 0.095, 0);
    ship.add(flap);

    const wl = plate(
      [[0, 0], [1.0, 0], [0.9, 0.9], [0.5, 0.9]],
      0.08,
      accentMat,
      1,
      0
    );
    wl.position.set(3.3, 0.05, side * 5.35);
    wl.rotation.x = side * 0.25;
    ship.add(wl);

    const pod = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 1.4, 12),
      hullMat
    );
    pod.rotation.z = Math.PI / 2;
    pod.position.set(3.7, 0, side * 5.65);
    ship.add(pod);

    const podNose = new THREE.Mesh(
      new THREE.ConeGeometry(0.12, 0.35, 12),
      darkMat
    );
    podNose.rotation.z = Math.PI / 2;
    podNose.position.set(2.825, 0, side * 5.65);
    ship.add(podNose);

    const nav = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 12, 12),
      new THREE.MeshStandardMaterial({
        color: side > 0 ? 0xFF2222 : 0x22FF44,
        emissive: side > 0 ? 0xFF0000 : 0x00FF33,
        emissiveIntensity: 2
      })
    );
    nav.position.set(4.45, 0, side * 5.65);
    ship.add(nav);
  }

  makeWing(1);
  makeWing(-1);

  function makeStrake(side) {
    const st = plate(
      [[-3.4, 0.5], [-0.87, 1.9], [-0.5, 1.9], [-0.5, 0.5]],
      0.1,
      wingMat,
      side,
      0.03
    );
    st.rotation.x = Math.PI / 2;
    st.position.set(0, 0.06, 0);
    ship.add(st);
  }

  makeStrake(1);
  makeStrake(-1);

  function makeCanard(side) {
    const c = plate(
      [[-0.3, 0.45], [1.2, 2.2], [1.8, 2.2], [1.9, 0.45]],
      0.08,
      wingMat,
      side,
      0.03
    );
    c.rotation.x = Math.PI / 2;
    c.position.set(-4.2, 0.1, 0);
    ship.add(c);
  }

  makeCanard(1);
  makeCanard(-1);

  function makeMissile(mx, mz) {
    const g = new THREE.Group();

    const pyl = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.14, 0.06),
      darkMat
    );
    pyl.position.set(0, 0.16, 0);
    g.add(pyl);

    const mb = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.13, 2.0, 14),
      hullMat
    );
    mb.rotation.z = Math.PI / 2;
    g.add(mb);

    const mn = new THREE.Mesh(
      new THREE.ConeGeometry(0.13, 0.5, 14),
      darkMat
    );
    mn.rotation.z = Math.PI / 2;
    mn.position.x = -1.25;
    g.add(mn);

    const mband = new THREE.Mesh(
      new THREE.CylinderGeometry(0.135, 0.135, 0.12, 14),
      accentMat
    );
    mband.rotation.z = Math.PI / 2;
    mband.position.x = -0.6;
    g.add(mband);

    const f1 = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.02, 0.5),
      darkMat
    );
    f1.position.x = 0.8;
    g.add(f1);

    const f2 = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.5, 0.02),
      darkMat
    );
    f2.position.x = 0.8;
    g.add(f2);

    g.position.set(mx, -0.3, mz);
    ship.add(g);
  }

  [1, -1].forEach(function (sd) {
    makeMissile(1.4, sd * 2.4);
    makeMissile(2.8, sd * 3.9);
  });

  function makeFin(side) {
    const fin = new THREE.Group();

    const f = plate(
      [[0, 0], [2.2, 0], [1.5, 2.0], [0.6, 2.0]],
      0.1,
      hullMat,
      1,
      0.03
    );
    fin.add(f);

    const fb = plate(
      [[0.51, 1.7], [1.6, 1.7], [1.5, 2.0], [0.6, 2.0]],
      0.18,
      accentMat,
      1,
      0
    );
    fb.position.z = -0.04;
    fin.add(fb);

    [0.135, -0.045].forEach(function (zz) {
      const rud = plate(
        [[1.6, 0.1], [2.13, 0.1], [1.58, 1.65], [1.05, 1.65]],
        0.01,
        panelMat,
        1,
        0
      );
      rud.position.z = zz;
      fin.add(rud);
    });

    const fl = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 10, 10),
      whiteLightMat
    );
    fl.position.set(1.05, 2.04, 0.05);
    fin.add(fl);

    fin.position.set(3.6, 0.3, side * 1.0);
    fin.rotation.x = side * 0.35;
    ship.add(fin);
  }

  makeFin(1);
  makeFin(-1);

  function makeStab(side) {
    const st = plate(
      [[0, 1.0], [1.4, 2.8], [2.1, 2.8], [2.1, 1.0]],
      0.08,
      wingMat,
      side,
      0.03
    );
    st.rotation.x = Math.PI / 2;
    st.position.set(4.0, -0.1, 0);
    ship.add(st);
  }

  makeStab(1);
  makeStab(-1);

  function makeEngine(side) {
    const z = side * 0.55;

    const noz = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.58, 1.0, 24, 1, true),
      darkSideMat
    );
    noz.rotation.z = Math.PI / 2;
    noz.position.set(6.3, 0, z);
    ship.add(noz);

    const heat = new THREE.Mesh(
      new THREE.TorusGeometry(0.58, 0.04, 8, 28),
      heatMat
    );
    heat.rotation.y = Math.PI / 2;
    heat.position.set(6.8, 0, z);
    ship.add(heat);

    const glow = new THREE.Mesh(
      new THREE.CircleGeometry(0.45, 24),
      glowMat
    );
    glow.rotation.y = Math.PI / 2;
    glow.position.set(6.1, 0, z);
    ship.add(glow);

    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.38, 1.8, 20),
      flameMat
    );
    flame.rotation.z = -Math.PI / 2;
    flame.position.set(7.5, 0, z);
    ship.add(flame);

    const core = new THREE.Mesh(
      new THREE.ConeGeometry(0.2, 1.0, 16),
      coreMat
    );
    core.rotation.z = -Math.PI / 2;
    core.position.set(7.1, 0, z);
    ship.add(core);
  }

  makeEngine(1);
  makeEngine(-1);

  const stinger = new THREE.Mesh(
    new THREE.ConeGeometry(0.3, 0.9, 16),
    darkMat
  );
  stinger.rotation.z = -Math.PI / 2;
  stinger.position.set(6.95, 0, 0);
  ship.add(stinger);

  const tailLight = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 10, 10),
    whiteLightMat
  );
  tailLight.position.set(7.4, 0, 0);
  ship.add(tailLight);

  ship.position.set(15, 0, 0);
  return ship;
}

chip.add(buildShip());
scene.add(chip);
chip.position.set(0, 0, 20);

// ==========================================
// 7. عناصر التحكم والحالة ونظام العودة لمكان التحليق
// ==========================================
const ksz = document.getElementById("ksz");
const evk = document.getElementById("evk");
const controls = document.getElementById("controls");
const shipButtons = document.querySelector(".ee");
const playerButtons = document.getElementById("xw");
const upBtn = document.getElementById("up");
const ltBtn = document.getElementById("lt");
const rtBtn = document.getElementById("rt");
const land = document.getElementById("land");
const ffn = document.getElementById("ffn");
const forward = document.querySelector("#forward");
const backward = document.querySelector("#backward");
const right = document.querySelector("#right");
const left = document.querySelector("#left");

if (ksz) ksz.style.display = "none";
if (evk) evk.style.display = "none";
if (land) land.style.display = "none";
if (playerButtons) playerButtons.style.display = "none";
if (ffn) ffn.style.display = "none";

let playerUp = false;
let playerLeft = false;
let playerRight = false;

let inSurface = false;
let a = false;
let b = 0;
const s = 2;

let m = false;
let mo = false;
let mov = false;
let movingForward = false;

const shipStartY = chip.position.y;
const skyHeight = 150;

const takeoffDuration = s;
let takeoffStartY =-2;
let takeoffProgress = 0;
let spaceCooldown = 0;

let ii = false;
let pp = false;
let takingOff = false;

// ------------------------------------------
// نقطة الدخول على سطح الكوكب (مكان الهبوط)
// ------------------------------------------
const marsEntryPos = new THREE.Vector3();
const marsEntryQuat = new THREE.Quaternion();
let hasMarsEntryPoint = false;

function savePlanetEntryPoint() {
  marsEntryPos.copy(chip.position);
  marsEntryQuat.copy(chip.quaternion);
  hasMarsEntryPoint = true;
}

function returnToPlanetEntryPoint() {
  if (!hasMarsEntryPoint) return;

  const shipWorldPos = chip.localToWorld(new THREE.Vector3(15, 0, 0));
  const localOffsetY = chip.position.y - shipWorldPos.y;
  const groundY = surface.getGroundHeight(marsEntryPos.x, marsEntryPos.z);

  chip.position.set(
    marsEntryPos.x,
    groundY + 2.2 + localOffsetY,
    marsEntryPos.z
  );
  chip.quaternion.copy(marsEntryQuat);
}

// ------------------------------------------
// نقطة الدخول في الفضاء (مكان المركبة قبل الاقتراب من الكوكب)
// ------------------------------------------
const spaceEntryPos = new THREE.Vector3();
const spaceEntryQuat = new THREE.Quaternion();
let hasSpaceEntryPoint = false;

let mustLeaveRange = false;
const approachDistance = 13;
const rearmDistance = 16;

function saveSpaceEntryPoint() {
  spaceEntryPos.copy(chip.position);
  spaceEntryQuat.copy(chip.quaternion);
  hasSpaceEntryPoint = true;
}

// ==========================================
// نظام حفظ واسترجاع اللعبة (الطائرة + اللاعب)
// ==========================================
const SAVE_KEY = "marsExplorerSave_v1";

function saveGame() {
  // لا نحفظ أثناء أنيميشن الهبوط أو الإقلاع أو الدخول للغلاف الجوي
  if (ii || takingOff || (a && b < 1)) return;

  let mode = "space";
  if (inSurface) {
    mode = "walking"; // اللاعب يمشي على الأرض
  } else if (pp) {
    mode = "landed";  // الطائرة هابطة على الأرض واللاعب بداخلها
  } else if (b >= 1) {
    mode = "sky";     // الطائرة تحلّق في سماء الكوكب
  }

  const data = {
    mode: mode,
    planetId: activePlanet === planet2 ? 2 : 1,
    ship: {
      x: chip.position.x,
      y: chip.position.y,
      z: chip.position.z,
      ry: chip.rotation.y
    },
    player: {
      x: surface.player.position.x,
      y: surface.player.position.y,
      z: surface.player.position.z,
      ry: surface.player.rotation.y
    },
    marsEntry: hasMarsEntryPoint ? {
      x: marsEntryPos.x,
      y: marsEntryPos.y,
      z: marsEntryPos.z,
      qx: marsEntryQuat.x,
      qy: marsEntryQuat.y,
      qz: marsEntryQuat.z,
      qw: marsEntryQuat.w
    } : null,
    spaceEntry: hasSpaceEntryPoint ? {
      x: spaceEntryPos.x,
      y: spaceEntryPos.y,
      z: spaceEntryPos.z,
      qx: spaceEntryQuat.x,
      qy: spaceEntryQuat.y,
      qz: spaceEntryQuat.z,
      qw: spaceEntryQuat.w
    } : null
  };

  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}

function loadGame() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return;

  try {
    const data = JSON.parse(raw);

    // 0. اختيار سطح الكوكب المحفوظ (المريخ أو الغابة)
    if (data.planetId === 2) {
      useSurface(forestSurface);
    }

    // 1. استرجاع مكان ودوران الطائرة
    if (data.ship) {
      chip.position.set(data.ship.x, data.ship.y, data.ship.z);
      chip.rotation.y = data.ship.ry;
    }

    // 2. استرجاع مكان ودوران اللاعب
    if (data.player) {
      surface.player.position.set(data.player.x, data.player.y, data.player.z);
      surface.player.rotation.y = data.player.ry;
    }

    // 3. استرجاع نقاط العودة
    if (data.marsEntry) {
      marsEntryPos.set(data.marsEntry.x, data.marsEntry.y, data.marsEntry.z);
      marsEntryQuat.set(data.marsEntry.qx, data.marsEntry.qy, data.marsEntry.qz, data.marsEntry.qw);
      hasMarsEntryPoint = true;
    }
    if (data.spaceEntry) {
      spaceEntryPos.set(data.spaceEntry.x, data.spaceEntry.y, data.spaceEntry.z);
      spaceEntryQuat.set(data.spaceEntry.qx, data.spaceEntry.qy, data.spaceEntry.qz, data.spaceEntry.qw);
      hasSpaceEntryPoint = true;
    }

    // 4. ضبط حالة المشهد والأزرار حسب الوضع المحفوظ
    if (data.mode === "walking") {
      b = 1;
      a = false;
      pp = true;
      inSurface = true;

      surface.surfaceGroup.visible = true;
      surface.setSurfaceOpacity(1);
      surface.player.visible = true;
      scene.background.copy(marsSkyColor);

      showPlanets(false);
      stars.visible = false;

      if (controls) controls.style.display = "none";
      if (shipButtons) shipButtons.style.display = "none";
      if (playerButtons) playerButtons.style.display = "flex";
    } else if (data.mode === "landed") {
      b = 1;
      a = false;
      pp = true;
      inSurface = false;

      surface.surfaceGroup.visible = true;
      surface.setSurfaceOpacity(1);
      surface.player.visible = false;
      scene.background.copy(marsSkyColor);

      showPlanets(false);
      stars.visible = false;

      if (controls) controls.style.display = "flex";
      if (shipButtons) shipButtons.style.display = "flex";
      if (ffn) ffn.style.display = "inline-block";
      if (evk) evk.style.display = "inline-block";
    } else if (data.mode === "sky") {
      b = 1;
      a = true;
      pp = false;
      inSurface = false;

      surface.surfaceGroup.visible = true;
      surface.setSurfaceOpacity(1);
      surface.player.visible = false;
      scene.background.copy(marsSkyColor);

      showPlanets(false);
      stars.visible = false;

      if (controls) controls.style.display = "flex";
      if (shipButtons) shipButtons.style.display = "flex";
      if (land) land.style.display = "inline-block";
    }
  } catch (e) {
    console.error("فشل تحميل الحفظ:", e);
  }
}

// استدعاء الاسترجاع عند بدء تشغيل اللعبة
loadGame();

initExtras({
  THREE,
  scene,
  camera,
  renderer,
  stars,
  planet,
  planet2,
  moonplanet,
  chip,
  marsSurface,
  forestSurface,
  getState: () => ({ a, b, takingOff, inSurface, pp, surface })
});

// حفظ تلقائي عند إغلاق الصفحة أو التبديل لتطبيق آخر
window.addEventListener("pagehide", saveGame);
window.addEventListener("visibilitychange", function () {
  if (document.visibilityState === "hidden") {
    saveGame();
  }
});
// حفظ تلقائي كل 3 ثوانٍ أثناء اللعب لضمان عدم ضياع التقدم
setInterval(saveGame, 3000);

// ==========================================
// تشغيل الموسيقى عند أول تفاعل حقيقي للمستخدم
// ==========================================
const worldMusic = document.getElementById("worldMusic");

function ensureMusicPlaying() {
  if (!worldMusic) return;
  worldMusic.volume = 0.3;
  worldMusic.loop = true;
  if (worldMusic.paused) {
    worldMusic.play().catch(function () {});
  }
}

if (upBtn) {
  upBtn.addEventListener("pointerdown", function () {
    ensureMusicPlaying();
    playerUp = true;
  });
}

if (ltBtn) {
  ltBtn.addEventListener("pointerdown", function () {
    ensureMusicPlaying();
    playerLeft = true;
  });
}

if (rtBtn) {
  rtBtn.addEventListener("pointerdown", function () {
    ensureMusicPlaying();
    playerRight = true;
  });
}

if (ksz) {
  ksz.addEventListener("click", function () {
    ensureMusicPlaying();
    surface.player.visible = false;
    inSurface = false;

    ksz.style.display = "none";
    if (controls) controls.style.display = "flex";
    if (shipButtons) shipButtons.style.display = "flex";
    if (evk) evk.style.display = "inline-block";
    if (ffn) ffn.style.display = "inline-block";
    if (playerButtons) playerButtons.style.display = "none";
    saveGame();
  });
}

if (land) {
  land.addEventListener("click", function () {
    ensureMusicPlaying();
    if (b >= 1 && !ii && !pp && !takingOff) {
      savePlanetEntryPoint();
      ii = true;
    }
  });
}

if (evk) {
  evk.addEventListener("click", function () {
    ensureMusicPlaying();
    if (pp && !takingOff && !ii) {
      returnToPlanetEntryPoint();

      takingOff = true;
      pp = false;
      a = false;
      inSurface = false;
      surface.player.visible = false;
      takeoffStartY = chip.position.y;
      takeoffProgress = 0;
      spaceCooldown = 2.0;

      evk.style.display = "none";
      if (ffn) ffn.style.display = "none";
      if (land) land.style.display = "none";
      if (ksz) ksz.style.display = "none";
      if (playerButtons) playerButtons.style.display = "none";
      if (controls) controls.style.display = "none";
      if (shipButtons) shipButtons.style.display = "none";

      showPlanets(true);
      moonplanet.visible = true;
      stars.visible = true;
      fadePlanets(1);
      moonmaterial.opacity = 1;
      stars.material.opacity = 1;
    }
  });
}

if (ffn) {
  ffn.addEventListener("click", function () {
    ensureMusicPlaying();
    if (pp) {
      const shipWorldPos = chip.localToWorld(new THREE.Vector3(15, 0, 0));
      surface.player.position.set(
        shipWorldPos.x + 2,
        surface.getGroundHeight(shipWorldPos.x + 2, shipWorldPos.z) + 0.02,
        shipWorldPos.z
      );
      surface.player.visible = true;
      inSurface = true;

      if (controls) controls.style.display = "none";
      if (shipButtons) shipButtons.style.display = "none";
      ffn.style.display = "none";
      if (evk) evk.style.display = "none";
      if (playerButtons) playerButtons.style.display = "flex";
      saveGame();
    }
  });
}

if (forward) {
  forward.addEventListener("pointerdown", function () {
    ensureMusicPlaying();
    movingForward = true;
  });
}

if (backward) {
  backward.addEventListener("pointerdown", function () {
    ensureMusicPlaying();
    mov = true;
  });
}

if (right) {
  right.addEventListener("pointerdown", function () {
    ensureMusicPlaying();
    mo = true;
  });
}

if (left) {
  left.addEventListener("pointerdown", function () {
    ensureMusicPlaying();
    m = true;
  });
}

window.addEventListener("pointerdown", ensureMusicPlaying, { passive: true });
window.addEventListener("keydown", ensureMusicPlaying, { passive: true });

window.addEventListener("pointerup", function () {
  playerUp = false;
  playerLeft = false;
  playerRight = false;
  movingForward = false;
  mov = false;
  mo = false;
  m = false;
  saveGame();
});

// ==========================================
// 8. الحركة والكاميرا وحلقة العرض
// ==========================================
const cameraOffset = new THREE.Vector3(0, 5, 10);
const desiredPosition = new THREE.Vector3();
const target = new THREE.Vector3();

const playerCameraOffset = new THREE.Vector3(0, 2.0, 3.8);
const playerDesiredPosition = new THREE.Vector3();
const playerLookTarget = new THREE.Vector3();

const clock = new THREE.Clock();
let planetOrbitAngle = 0;
const planetOrbitRadius = 300;

function animate() {
  requestAnimationFrame(animate);

  const dalt = clock.getDelta();
  const elapsed = clock.elapsedTime;

  if (!a && !takingOff && !inSurface && !pp && b === 0) {
    planetOrbitAngle += dalt * 0.01;
    planet.position.x = sunMesh.position.x + Math.sin(planetOrbitAngle) * planetOrbitRadius;
    planet.position.z = sunMesh.position.z + Math.cos(planetOrbitAngle) * planetOrbitRadius;
    atmosphere.position.copy(planet.position);
    orbit.position.copy(planet.position);
  }

  if (spaceCooldown > 0 && !takingOff) {
    spaceCooldown = Math.max(0, spaceCooldown - dalt);
  }

  if (a && !takingOff && b < 1) {
    b = Math.min(b + dalt / s, 1);
  }

  if (a && !takingOff) {
    surface.surfaceGroup.visible = true;
    surface.setSurfaceOpacity(b);

    fadePlanets(1 - b);
    moonmaterial.opacity = 1 - b;
    stars.material.opacity = 1 - b;
    scene.background.copy(spaceColor).lerp(marsSkyColor, b);

    if (!ii && !pp) {
      chip.position.y = THREE.MathUtils.lerp(
        shipStartY,
        skyHeight,
        b
      );
    }
  }

  if (ii) {
    if (controls) controls.style.display = "none";
    if (shipButtons) shipButtons.style.display = "none";

    const shipWorldPos = chip.localToWorld(new THREE.Vector3(15, 0, 0));
    const groundY = surface.getGroundHeight(shipWorldPos.x, shipWorldPos.z);
    const localOffsetY = chip.position.y - shipWorldPos.y;
    const targetChipY = groundY + 2.2 + localOffsetY;

    // إخفاء الأشجار تحت المركبة (الغابة فقط)
    if (surface.clearTrees) surface.clearTrees(shipWorldPos.x, shipWorldPos.z, 12);

    chip.position.y -= 30 * dalt;
    if (chip.position.y <= targetChipY) {
      chip.position.y = targetChipY;
      ii = false;
      a = false;
      pp = true;
      if (ffn) ffn.style.display = "inline-block";
      if (evk) evk.style.display = "inline-block";
      if (land) land.style.display = "none";
      saveGame();
    }
  }

  if (takingOff) {
    takeoffProgress = Math.min(takeoffProgress + dalt / takeoffDuration, 1);

    chip.position.x = marsEntryPos.x;
    chip.position.z = marsEntryPos.z;
    chip.quaternion.copy(marsEntryQuat);
    chip.position.y = THREE.MathUtils.lerp(
      takeoffStartY,
      skyHeight,
      takeoffProgress
    );

    const shipWorldPos = chip.localToWorld(new THREE.Vector3(15, 0, 0));
    activePlanet.position.set(0, chip.position.y - 4, 0);
    if (activePlanet === planet) {
      atmosphere.position.copy(planet.position);
      orbit.position.copy(planet.position);
    }
    stars.position.set(shipWorldPos.x, chip.position.y, shipWorldPos.z);

    showPlanets(true);
    moonplanet.visible = true;
    stars.visible = true;

    fadePlanets(1);
    moonmaterial.opacity = 1;
    stars.material.opacity = 1;

    surface.surfaceGroup.visible = true;
    surface.setSurfaceOpacity(1 - takeoffProgress);

    scene.background.copy(marsSkyColor).lerp(spaceColor, takeoffProgress);
    b = 1 - takeoffProgress;

    if (takeoffProgress >= 1) {
      takingOff = false;
      b = 0;
      a = false;
      pp = false;

      planet.position.set(
        sunMesh.position.x + Math.sin(planetOrbitAngle) * planetOrbitRadius,
        0,
        sunMesh.position.z + Math.cos(planetOrbitAngle) * planetOrbitRadius
      );
      planet2.position.copy(planet2Home);
      atmosphere.position.copy(planet.position);
      orbit.position.copy(planet.position);
      stars.position.set(0, 0, 0);

      if (hasSpaceEntryPoint) {
        chip.position.copy(spaceEntryPos);
        chip.quaternion.copy(spaceEntryQuat);
        hasSpaceEntryPoint = false;
      }

      mustLeaveRange = true;

      fadePlanets(1);
      moonmaterial.opacity = 1;
      stars.material.opacity = 1;
      scene.background.copy(spaceColor);

      surface.surfaceGroup.visible = false;
      surface.setSurfaceOpacity(0);

      if (controls) controls.style.display = "flex";
      if (shipButtons) shipButtons.style.display = "flex";
      saveGame();
    }
  }

  if (b >= 1 && a && !inSurface && !pp && !takingOff) {
    if (!hasMarsEntryPoint) {
      savePlanetEntryPoint();
    }
    if (land) land.style.display = "inline-block";
    if (controls) controls.style.display = "flex";
    if (shipButtons) shipButtons.style.display = "flex";

    chip.visible = true;

    showPlanets(false);
    stars.visible = false;

    surface.player.visible = false;
    if (playerButtons) {
      playerButtons.style.display = "none";
    }
  }

  if (!inSurface && !a && !takingOff && !pp && spaceCooldown <= 0 && b === 0) {
    const shipPosition = chip.localToWorld(new THREE.Vector3(15, 0, 0));

    // أقرب كوكب للمركبة (المريخ أو الأخضر)
    let nearPlanet = planet;
    let distance = shipPosition.distanceTo(planet.position);
    const distance2 = shipPosition.distanceTo(planet2.position);
    if (distance2 < distance) {
      nearPlanet = planet2;
      distance = distance2;
    }

    if (mustLeaveRange) {
      if (distance >= rearmDistance) {
        mustLeaveRange = false;
      }
    } else if (distance < approachDistance) {
      useSurface(nearPlanet === planet2 ? forestSurface : marsSurface);
      saveSpaceEntryPoint();
      a = true;
      savePlanetEntryPoint();
    }
  }

  planet.rotation.y += 0.006;
  planet2.rotation.y += 0.006;
  stars.rotation.y += 0.0002;
  orbit.rotation.y += 0.001;
  sunMesh.rotation.y += dalt * 0.02;

  if ((!a || takingOff || (b >= 1 && !pp)) && !inSurface) {
    const direction = new THREE.Vector3(-1, 0, 0);
    direction.applyQuaternion(chip.quaternion);

    if (movingForward) {
      chip.position.addScaledVector(direction, 0.2);
    }

    if (mov) {
      chip.position.addScaledVector(direction, -0.2);
    }

    if (m) {
      chip.rotation.y -= 0.03;
    }

    if (mo) {
      chip.rotation.y += 0.03;
    }
  }

  const ebx = chip.position.distanceTo(sunMesh.position);
  if (ebx < 100 && !sunWarned) {
    alert("ابتعد");
    sunWarned = true;
  }
  if (ebx > 120) {
    sunWarned = false;
  }
  if (ebx < 60 && !sunGameOver) {
    sunGameOver = true;
    chip.visible = false;
    alert("لقد خسرة");
  }

  if (surface.surfaceGroup.visible) {
    surface.updateCreatures(elapsed, inSurface && playerUp);
  }

  if (inSurface) {
    const speed = 0.08;
    const turnSpeed = 0.04;

    if (playerLeft) {
      surface.player.rotation.y += turnSpeed;
    }

    if (playerRight) {
      surface.player.rotation.y -= turnSpeed;
    }

    const shipPosition = chip.localToWorld(new THREE.Vector3(15, 0, 0));
    const ue = surface.player.position.distanceTo(shipPosition);

    if (ksz) {
      if (ue < 5) {
        ksz.style.display = "inline-block";
      } else {
        ksz.style.display = "none";
      }
    }

    if (playerUp) {
      surface.player.position.x -= Math.sin(surface.player.rotation.y) * speed;
      surface.player.position.z -= Math.cos(surface.player.rotation.y) * speed;
    }

    surface.player.position.y =
      surface.getGroundHeight(
        surface.player.position.x,
        surface.player.position.z
      ) + 0.02;

    playerDesiredPosition.copy(playerCameraOffset);
    playerDesiredPosition.applyQuaternion(surface.player.quaternion);
    playerDesiredPosition.add(surface.player.position);

    camera.position.lerp(playerDesiredPosition, 0.12);

    playerLookTarget.copy(surface.player.position);
    playerLookTarget.y += 1.25;

    camera.lookAt(playerLookTarget);
  } else {
    const shipPosition = chip.localToWorld(new THREE.Vector3(15, 0, 0));

    cameraOffset.set(12, 9, 0);
    cameraOffset.applyQuaternion(chip.quaternion);

    desiredPosition.copy(shipPosition).add(cameraOffset);

    camera.position.lerp(desiredPosition, 0.08);

    target.copy(shipPosition);
    camera.lookAt(target);
  }

  updateSunVisibility(1 - b);
  renderer.render(scene, camera);
}

window.addEventListener("resize", function () {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
