import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";

// ============================================================
//  أدوات مساعدة مشتركة
// ============================================================

export function createSecondPlanet(scene, planet) {
  const newPlanet = planet.clone();
  newPlanet.position.set(0, 0, -300);
  scene.add(newPlanet);
}
function makeRng(seed) {
  let s = seed >>> 0;
  return function () {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function ball(parent, r, x, y, z, mat, sx = 1, sy = 1, sz = 1, seg = 16) {
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(r, seg, Math.max(8, seg - 2)),
    mat
  );
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  parent.add(m);
  return m;
}

function taperTube(parent, pts, r0, r1, mat, tseg = 16, rseg = 8) {
  const curve = new THREE.CatmullRomCurve3(pts);
  const geo = new THREE.TubeGeometry(curve, tseg, 1, rseg, false);
  const pos = geo.attributes.position;
  const c = new THREE.Vector3();
  const v = new THREE.Vector3();

  for (let i = 0; i <= tseg; i++) {
    curve.getPointAt(i / tseg, c);
    const k = r0 + (r1 - r0) * (i / tseg);
    for (let j = 0; j <= rseg; j++) {
      const idx = i * (rseg + 1) + j;
      v.fromBufferAttribute(pos, idx);
      v.sub(c).multiplyScalar(k).add(c);
      pos.setXYZ(idx, v.x, v.y, v.z);
    }
  }

  pos.needsUpdate = true;
  geo.computeVertexNormals();

  const mesh = new THREE.Mesh(geo, mat);
  parent.add(mesh);
  return mesh;
}

function midPoint(a, b, off) {
  const m = a.clone().lerp(b, 0.5);
  if (off) m.add(off);
  return m;
}

function makeTexture(size, painter, rx = 1, ry = 1, srgb = true) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  painter(ctx, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(rx, ry);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function enableShadows(group) {
  group.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
    }
  });
}

function bevelPlate(w, h, d, bevel, mat) {
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2, -h / 2);
  shape.lineTo(w / 2, -h / 2);
  shape.lineTo(w / 2, h / 2);
  shape.lineTo(-w / 2, h / 2);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: d,
    bevelEnabled: true,
    bevelSegments: 4,
    steps: 1,
    bevelSize: bevel,
    bevelThickness: bevel
  });
  geo.center();
  return new THREE.Mesh(geo, mat);
}

function ringAt(parent, radius, tube, x, y, z, mat, sx = 1, sz = 1) {
  const m = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 12, 32), mat);
  m.rotation.x = Math.PI / 2;
  m.position.set(x, y, z);
  m.scale.set(sx, sz, 1);
  parent.add(m);
  return m;
}

function cyl(parent, rt, rb, h, x, y, z, mat, seg = 22) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

// ============================================================
//  المخلوق الثالث: الكائن الرمادي الممدود
// ============================================================

function createAlienSkinTextures() {
  const rand = makeRng(4242);

  const colorMap = makeTexture(
    512,
    (ctx, s) => {
      ctx.fillStyle = "#7d858f";
      ctx.fillRect(0, 0, s, s);

      const grad = ctx.createLinearGradient(0, 0, 0, s);
      grad.addColorStop(0, "rgba(255,255,255,0.10)");
      grad.addColorStop(1, "rgba(0,0,0,0.14)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, s, s);

      for (let i = 0; i < 160; i++) {
        const x = rand() * s;
        const y = rand() * s;
        const r = 12 + rand() * 46;
        const c = rand() > 0.5 ? 226 : 52;
        const a = 0.05 + rand() * 0.08;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(${c},${c},${c + 8},${a})`);
        g.addColorStop(1, `rgba(${c},${c},${c + 8},0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      for (let i = 0; i < 3800; i++) {
        const x = rand() * s;
        const y = rand() * s;
        const w = 1 + rand() * 3;
        const h = 1 + rand() * 2;
        ctx.fillStyle = i % 2 === 0 ? "rgba(222,228,238,0.13)" : "rgba(38,42,50,0.13)";
        ctx.fillRect(x, y, w, h);
      }

      ctx.lineWidth = 1;
      for (let i = 0; i < 90; i++) {
        const x = rand() * s;
        const y = rand() * s;
        ctx.strokeStyle = "rgba(62,68,78,0.20)";
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(
          x + rand() * 40 - 20,
          y + rand() * 40 - 20,
          x + rand() * 60 - 30,
          y + rand() * 60 - 30
        );
        ctx.stroke();
      }

      ctx.lineWidth = 1.5;
      for (let i = 0; i < 26; i++) {
        let x = rand() * s;
        let y = rand() * s;
        ctx.strokeStyle = "rgba(92,106,132,0.16)";
        ctx.beginPath();
        ctx.moveTo(x, y);
        for (let k = 0; k < 5; k++) {
          x += rand() * 36 - 18;
          y += rand() * 36 - 6;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    },
    2,
    2
  );

  const bumpMap = makeTexture(
    512,
    (ctx, s) => {
      ctx.fillStyle = "#808080";
      ctx.fillRect(0, 0, s, s);

      for (let i = 0; i < 5200; i++) {
        const x = rand() * s;
        const y = rand() * s;
        const w = 1 + rand() * 3;
        ctx.fillStyle = i % 2 === 0 ? "rgba(150,150,150,0.5)" : "rgba(95,95,95,0.5)";
        ctx.fillRect(x, y, w, w);
      }

      ctx.lineWidth = 1.2;
      for (let i = 0; i < 110; i++) {
        const x = rand() * s;
        const y = rand() * s;
        ctx.strokeStyle = "rgba(40,40,40,0.55)";
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(
          x + rand() * 30 - 15,
          y + rand() * 30 - 15,
          x + rand() * 50 - 25,
          y + rand() * 50 - 25
        );
        ctx.stroke();
      }
    },
    2,
    2,
    false
  );

  return { colorMap, bumpMap };
}

function createAlienMaterials(tex) {
  return {
    skin: new THREE.MeshStandardMaterial({
      map: tex.colorMap,
      bumpMap: tex.bumpMap,
      bumpScale: 0.03,
      color: 0xffffff,
      emissive: 0x2a2f36,
      emissiveIntensity: 0.14,
      roughness: 0.52,
      metalness: 0.05
    }),
    shade: new THREE.MeshStandardMaterial({
      map: tex.colorMap,
      bumpMap: tex.bumpMap,
      bumpScale: 0.03,
      color: 0x99a0a9,
      emissive: 0x1a1d22,
      emissiveIntensity: 0.14,
      roughness: 0.6,
      metalness: 0.08
    }),
    deep: new THREE.MeshStandardMaterial({
      color: 0x4a5059,
      emissive: 0x121418,
      emissiveIntensity: 0.3,
      roughness: 0.7,
      metalness: 0.1
    }),
    eye: new THREE.MeshPhysicalMaterial({
      color: 0x010203,
      roughness: 0.03,
      metalness: 0.9,
      clearcoat: 1.0,
      clearcoatRoughness: 0.02
    }),
    eyeRim: new THREE.MeshStandardMaterial({
      color: 0x2b323c,
      roughness: 0.5,
      metalness: 0.2
    }),
    claw: new THREE.MeshStandardMaterial({
      color: 0x2a2d33,
      roughness: 0.32,
      metalness: 0.62
    }),
    dark: new THREE.MeshStandardMaterial({
      color: 0x15171b,
      roughness: 0.7,
      metalness: 0.1
    }),
    vein: new THREE.MeshStandardMaterial({
      color: 0x6b7b99,
      roughness: 0.65,
      metalness: 0.05
    }),
    glint: new THREE.MeshBasicMaterial({ color: 0xffffff }),
    blueGlint: new THREE.MeshBasicMaterial({ color: 0x9fd4ff }),
    lip: new THREE.MeshStandardMaterial({
      color: 0x6a6f78,
      roughness: 0.55,
      metalness: 0.05
    })
  };
}

function createGreyElongatedAlienMonster() {
  const alien = new THREE.Group();
  const tex = createAlienSkinTextures();
  const M = createAlienMaterials(tex);
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  alien.userData.speed = 4;
  alien.userData.direction = 1;
  alien.userData.startX = 4;
  alien.userData.patrolRange = 400;

  const chest = new THREE.Group();
  alien.add(chest);

  const TORSO_Z = 0.7;
  const TORSO_PROFILE = [
    [1.95, 0.0],
    [2.0, 0.2],
    [2.2, 0.19],
    [2.4, 0.16],
    [2.6, 0.2],
    [2.8, 0.27],
    [3.0, 0.29],
    [3.18, 0.22],
    [3.28, 0.1],
    [3.32, 0.0]
  ];

  function torsoR(y) {
    if (y <= TORSO_PROFILE[0][0]) return TORSO_PROFILE[0][1];
    for (let i = 0; i < TORSO_PROFILE.length - 1; i++) {
      const a = TORSO_PROFILE[i];
      const b = TORSO_PROFILE[i + 1];
      if (y >= a[0] && y <= b[0]) {
        const t = (y - a[0]) / (b[0] - a[0]);
        return a[1] + (b[1] - a[1]) * t;
      }
    }
    return 0.1;
  }

  const torsoCurve = new THREE.SplineCurve(
    TORSO_PROFILE.map((p) => new THREE.Vector2(p[1], p[0]))
  );
  const torsoPts = torsoCurve
    .getPoints(70)
    .map((p) => new THREE.Vector2(Math.max(p.x, 0.0005), p.y));

  const torso = new THREE.Mesh(new THREE.LatheGeometry(torsoPts, 40), M.skin);
  torso.scale.set(1, 1, TORSO_Z);
  chest.add(torso);

  for (let r = 0; r < 8; r++) {
    const y0 = 2.46 + r * 0.09;
    const thick = 0.03 - r * 0.0016;

    [-1, 1].forEach((side) => {
      const pts = [];
      for (let k = 0; k <= 7; k++) {
        const a = 0.1 + k * 0.25;
        const yk = y0 - 0.06 * (1 - k / 7);
        const rad = torsoR(yk) * 1.035;
        pts.push(V(side * Math.sin(a) * rad, yk, Math.cos(a) * rad * TORSO_Z));
      }
      taperTube(chest, pts, thick, thick * 0.55, M.skin, 18, 6);
    });
  }

  const sternumPts = [];
  for (let i = 0; i <= 5; i++) {
    const y = 2.46 + i * 0.12;
    sternumPts.push(V(0, y, torsoR(y) * TORSO_Z * 1.04));
  }
  taperTube(chest, sternumPts, 0.018, 0.02, M.shade, 12, 6);
  ball(chest, 0.022, 0, 2.4, torsoR(2.4) * TORSO_Z * 1.05, M.shade, 1, 1.4, 0.8, 10);

  for (let i = 0; i < 3; i++) {
    const y = 2.14 + i * 0.1;
    const rad = torsoR(y) * 1.02;
    const pts = [];
    for (let k = 0; k <= 5; k++) {
      const a = -0.8 + k * 0.32;
      pts.push(V(Math.sin(a) * rad, y - Math.abs(Math.sin(a)) * 0.02, Math.cos(a) * rad * TORSO_Z));
    }
    taperTube(chest, pts, 0.008, 0.008, M.deep, 12, 5);
  }

  ball(chest, 0.016, 0, 2.18, torsoR(2.18) * TORSO_Z + 0.004, M.dark, 1, 1, 0.6, 8);

  [-1, 1].forEach((side) => {
    ball(chest, 0.055, side * 0.19, 2.1, torsoR(2.1) * TORSO_Z * 0.95, M.shade, 1, 0.8, 0.8, 10);
    taperTube(
      chest,
      [V(side * 0.19, 2.12, 0.1), V(side * 0.12, 2.04, 0.15), V(side * 0.04, 1.98, 0.14)],
      0.014,
      0.008,
      M.shade,
      10,
      5
    );
  });

  for (let i = 0; i < 13; i++) {
    const y = 2.02 + i * 0.1;
    const zz = -torsoR(y) * TORSO_Z - 0.004;
    ball(chest, 0.026 - i * 0.0004, 0, y, zz, M.shade, 1, 0.85, 0.8, 10);
  }

  [-1, 1].forEach((side) => {
    const blade = ball(chest, 0.085, side * 0.15, 2.92, -torsoR(2.92) * TORSO_Z - 0.01, M.shade, 1.0, 1.5, 0.35, 12);
    blade.rotation.z = side * 0.25;
  });

  [-1, 1].forEach((side) => {
    taperTube(
      chest,
      [V(side * 0.03, 3.2, 0.1), V(side * 0.17, 3.21, 0.1), V(side * 0.32, 3.12, 0.04)],
      0.03,
      0.022,
      M.skin,
      12,
      6
    );
    ball(chest, 0.1, side * 0.34, 3.1, 0, M.shade, 1, 1, 1, 14);
  });

  ball(alien, 0.2, 0, 2.02, 0, M.shade, 1.2, 0.8, 0.8, 16);

  taperTube(
    alien,
    [V(0, 3.2, 0.0), V(0, 3.3, 0.04), V(0, 3.4, 0.1)],
    0.14,
    0.12,
    M.skin,
    12,
    12
  );

  [-1, 1].forEach((side) => {
    taperTube(
      alien,
      [V(side * 0.12, 3.2, 0.05), V(side * 0.115, 3.3, 0.08), V(side * 0.1, 3.4, 0.12)],
      0.016,
      0.01,
      M.shade,
      10,
      5
    );
  });

  const headGroup = new THREE.Group();
  headGroup.position.set(0, 3.98, 0.2);
  headGroup.scale.setScalar(1.3);
  headGroup.rotation.x = 0.2;

  const HEAD_PROFILE = [
    [0.0, -0.58],
    [0.1, -0.54],
    [0.19, -0.46],
    [0.32, -0.3],
    [0.43, -0.08],
    [0.5, 0.15],
    [0.48, 0.38],
    [0.36, 0.52],
    [0.15, 0.58],
    [0.0, 0.6]
  ];

  const headCurve = new THREE.SplineCurve(
    HEAD_PROFILE.map((p) => new THREE.Vector2(p[0], p[1]))
  );
  const headPts = headCurve
    .getPoints(70)
    .map((p) => new THREE.Vector2(Math.max(p.x, 0.0005), p.y));

  const head = new THREE.Mesh(new THREE.LatheGeometry(headPts, 48), M.skin);
  head.scale.set(0.95, 1.0, 0.9);
  headGroup.add(head);

  ball(headGroup, 0.4, 0, 0.18, -0.22, M.skin, 0.95, 1.0, 1.0, 22);

  [-1, 1].forEach((side) => {
    taperTube(
      headGroup,
      [V(side * 0.04, 0.13, 0.45), V(side * 0.18, 0.16, 0.42), V(side * 0.32, 0.14, 0.33)],
      0.022,
      0.012,
      M.shade,
      12,
      6
    );
  });

  [-1, 1].forEach((side) => {
    const rim = ball(headGroup, 0.215, side * 0.2, -0.04, 0.325, M.eyeRim, 1.5, 0.95, 0.35, 24);
    rim.rotation.y = side * 0.45;
    rim.rotation.z = side * 0.6;

    const eye = ball(headGroup, 0.2, side * 0.2, -0.04, 0.335, M.eye, 1.5, 0.9, 0.4, 28);
    eye.rotation.y = side * 0.45;
    eye.rotation.z = side * 0.6;

    ball(headGroup, 0.024, side * 0.235, 0.03, 0.4, M.glint, 1, 1, 0.5, 8);
    ball(headGroup, 0.012, side * 0.15, -0.085, 0.41, M.glint, 1, 1, 0.5, 8);
    ball(headGroup, 0.014, side * 0.26, -0.01, 0.385, M.blueGlint, 1, 1, 0.5, 8);

    for (let w = 0; w < 3; w++) {
      taperTube(
        headGroup,
        [
          V(side * (0.34 + w * 0.015), -0.02 + w * 0.04, 0.22),
          V(side * (0.39 + w * 0.015), 0.0 + w * 0.04, 0.17),
          V(side * (0.42 + w * 0.015), 0.01 + w * 0.04, 0.1)
        ],
        0.006,
        0.003,
        M.deep,
        8,
        4
      );
    }

    ball(headGroup, 0.05, side * 0.2, -0.22, 0.25, M.shade, 1.2, 0.8, 0.8, 12);
    ball(headGroup, 0.014, side * 0.03, -0.26, 0.3, M.dark, 1, 1.3, 0.8, 8);
    ball(headGroup, 0.035, side * 0.4, -0.1, -0.02, M.dark, 0.35, 1.2, 0.9, 10);
    ball(headGroup, 0.045, side * 0.405, -0.1, -0.02, M.shade, 0.3, 1.4, 1.1, 10);
  });

  ball(headGroup, 0.022, 0, -0.2, 0.33, M.shade, 0.8, 1.6, 0.9, 10);

  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.012, 0.03), M.dark);
  mouth.position.set(0, -0.42, 0.215);
  mouth.rotation.x = -0.15;
  headGroup.add(mouth);

  [-1, 1].forEach((side) => {
    taperTube(
      headGroup,
      [V(side * 0.01, -0.405, 0.22), V(side * 0.05, -0.41, 0.21), V(side * 0.09, -0.425, 0.195)],
      0.007,
      0.004,
      M.lip,
      8,
      5
    );
  });

  ball(headGroup, 0.045, 0, -0.54, 0.09, M.shade, 1, 0.8, 0.9, 12);
  alien.add(headGroup);

  const arms = [];

  [-1, 1].forEach((side) => {
    const arm = new THREE.Group();
    arm.position.set(side * 0.34, 3.1, 0.0);
    alien.add(arm);
    arms.push({ group: arm, side });

    const S = V(0, 0, 0);
    const E = V(side * 0.62, -0.95, -0.05);
    const W = E.clone().add(V(side * 0.18, -1.15, 0.2));

    ball(arm, 0.095, 0, 0, 0, M.shade, 1, 1, 1, 14);
    taperTube(arm, [S, midPoint(S, E, V(side * 0.12, 0.05, -0.03)), E], 0.085, 0.065, M.skin, 16, 10);
    ball(arm, 0.075, side * 0.25, -0.34, -0.03, M.skin, 0.85, 2.0, 0.85, 12);
    ball(arm, 0.078, E.x, E.y, E.z, M.shade, 1, 1, 1, 12);
    ball(arm, 0.03, E.x + side * 0.03, E.y - 0.02, E.z - 0.05, M.shade, 1, 1.3, 1, 8);
    taperTube(arm, [E, midPoint(E, W, V(side * 0.08, 0, 0.05)), W], 0.062, 0.04, M.skin, 16, 10);

    for (let t = 0; t < 2; t++) {
      const off = (t - 0.5) * 0.045;
      taperTube(
        arm,
        [
          V(E.x + side * 0.03, E.y - 0.12, E.z + 0.05 + off),
          V(E.x + side * 0.11, E.y - 0.5, E.z + 0.11 + off),
          V(W.x - side * 0.01, W.y + 0.08, W.z + 0.04 + off)
        ],
        0.012,
        0.008,
        M.shade,
        12,
        5
      );
    }

    for (let v = 0; v < 2; v++) {
      const vo = (v - 0.5) * 0.06;
      taperTube(
        arm,
        [
          V(E.x + side * 0.02, E.y - 0.2, E.z + 0.02 + vo),
          V(E.x + side * 0.09, E.y - 0.45, E.z + 0.03 + vo),
          V(W.x + side * 0.0, W.y + 0.2, W.z - 0.02 + vo)
        ],
        0.006,
        0.004,
        M.vein,
        10,
        4
      );
    }

    ball(arm, 0.046, W.x, W.y, W.z, M.shade, 1, 1, 1, 12);
    ball(arm, 0.02, W.x + side * 0.035, W.y + 0.02, W.z, M.shade, 1, 1, 1, 8);
    ball(arm, 0.072, W.x + side * 0.02, W.y - 0.09, W.z, M.skin, 0.75, 1.25, 0.6, 12);

    for (let f = 0; f < 4; f++) {
      const sp = (f - 1.5) * 0.05;
      const len = 1 - Math.abs(f - 1.5) * 0.12;

      const p0 = W.clone().add(V(side * 0.02, -0.14, sp));
      const p1 = p0.clone().add(V(side * 0.03, -0.27 * len, sp * 0.5));
      const p2 = p1.clone().add(V(-side * 0.005, -0.27 * len, sp * 0.2 + 0.02));
      const p3 = p2.clone().add(V(-side * 0.12, -0.24 * len, 0.03));

      taperTube(arm, [p0, midPoint(p0, p1), p1], 0.027, 0.022, M.skin, 8, 6);
      ball(arm, 0.025, p1.x, p1.y, p1.z, M.shade, 1, 1, 1, 8);
      taperTube(arm, [p1, midPoint(p1, p2), p2], 0.021, 0.016, M.skin, 8, 6);
      ball(arm, 0.02, p2.x, p2.y, p2.z, M.shade, 1, 1, 1, 8);
      taperTube(
        arm,
        [p2, midPoint(p2, p3, V(-side * 0.02, 0, 0.01)), p3],
        0.016,
        0.003,
        M.claw,
        10,
        6
      );
    }

    const t0 = W.clone().add(V(-side * 0.04, -0.06, 0.06));
    const t1 = t0.clone().add(V(-side * 0.07, -0.14, 0.08));
    const t2 = t1.clone().add(V(-side * 0.05, -0.12, 0.03));
    taperTube(arm, [t0, midPoint(t0, t1), t1], 0.027, 0.02, M.skin, 8, 6);
    ball(arm, 0.02, t1.x, t1.y, t1.z, M.shade, 1, 1, 1, 8);
    taperTube(arm, [t1, midPoint(t1, t2), t2], 0.02, 0.004, M.claw, 8, 6);
  });

  const legPivots = [];

  [-1, 1].forEach((side) => {
    const pivot = new THREE.Group();
    const inner = new THREE.Group();
    const H0 = V(side * 0.24, 2.05, 0);
    pivot.position.copy(H0);
    inner.position.copy(H0).negate();
    pivot.add(inner);
    alien.add(pivot);
    legPivots.push({ pivot, side });
    const H = V(side * 0.24, 2.05, 0);
    const K = V(side * 0.4, 1.12, 0.16);
    const A = V(side * 0.36, 0.28, -0.1);

    ball(inner, 0.14, H.x, H.y, H.z, M.shade, 1, 1, 1, 14);
    taperTube(inner, [H, midPoint(H, K, V(side * 0.03, 0, 0.05)), K], 0.17, 0.1, M.skin, 16, 12);
    ball(inner, 0.085, side * 0.33, 1.68, 0.1, M.skin, 0.9, 2.2, 0.9, 12);
    ball(inner, 0.1, K.x, K.y, K.z, M.shade, 1, 1, 1, 14);
    ball(inner, 0.055, K.x, K.y, K.z + 0.07, M.shade, 1, 1, 0.8, 10);
    taperTube(inner, [K, midPoint(K, A, V(0, 0, -0.06)), A], 0.09, 0.055, M.skin, 16, 12);
    ball(inner, 0.07, side * 0.38, 0.82, -0.1, M.skin, 0.9, 1.8, 0.9, 12);

    taperTube(
      inner,
      [V(K.x, K.y - 0.1, K.z + 0.07), V(side * 0.375, 0.7, 0.06), V(A.x, A.y + 0.05, A.z + 0.05)],
      0.016,
      0.012,
      M.shade,
      12,
      5
    );

    taperTube(
      inner,
      [V(side * 0.375, 0.7, -0.14), V(side * 0.37, 0.5, -0.15), V(A.x, A.y - 0.06, A.z - 0.06)],
      0.018,
      0.012,
      M.shade,
      10,
      5
    );

    ball(inner, 0.065, A.x, A.y, A.z, M.shade, 1, 1, 1, 12);
    ball(inner, 0.032, A.x + side * 0.05, A.y - 0.02, A.z, M.shade, 1, 1, 1, 8);
    ball(inner, 0.055, A.x, 0.12, A.z - 0.08, M.shade, 1, 1, 1.2, 10);

    for (let t = -1; t <= 1; t++) {
      const s0 = V(A.x, A.y - 0.1, A.z + 0.03);
      const sk = V(A.x + t * 0.09, 0.085, A.z + 0.28);
      const s2 = V(A.x + t * 0.17, 0.035, A.z + 0.58);

      taperTube(inner, [s0, midPoint(s0, sk), sk], 0.042, 0.03, M.skin, 10, 6);
      ball(inner, 0.03, sk.x, sk.y, sk.z, M.shade, 1, 0.9, 1, 8);
      taperTube(inner, [sk, midPoint(sk, s2), s2], 0.03, 0.018, M.skin, 10, 6);

      const claw = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.09, 8), M.claw);
      claw.rotation.x = Math.PI / 2;
      claw.position.set(s2.x, s2.y, s2.z + 0.045);
      inner.add(claw);
    }

    taperTube(
      inner,
      [V(A.x, A.y - 0.1, A.z - 0.02), V(A.x, 0.09, A.z - 0.12), V(A.x, 0.04, A.z - 0.22)],
      0.036,
      0.016,
      M.skin,
      8,
      6
    );
  });

  alien.userData.gaitPhase = 0;
  alien.userData.update = function (t, dt = 0, speed = 0) {
    alien.userData.gaitPhase += dt * speed * 1.7;
    const gp = alien.userData.gaitPhase;
    legPivots.forEach((l, j) => {
      l.pivot.rotation.x = -Math.sin(gp + j * Math.PI) * 0.38;
    });
    alien.userData.bobY = Math.abs(Math.sin(gp)) * 0.1;
    alien.userData.roll = Math.sin(gp) * 0.03;
    chest.rotation.y = Math.sin(gp) * 0.08;

    const breath = Math.sin(t * 1.6);
    chest.scale.set(1 + breath * 0.015, 1, 1 + breath * 0.02);

    headGroup.rotation.y = Math.sin(t * 0.6) * 0.14;
    headGroup.rotation.x = 0.2 + Math.sin(t * 0.9) * 0.03;

    arms.forEach((a, i) => {
      a.group.rotation.x = Math.sin(t * 1.1 + i * 1.7) * 0.05 + Math.sin(alien.userData.gaitPhase + i * Math.PI) * 0.3;
      a.group.rotation.z = a.side * (0.02 + Math.sin(t * 0.8 + i) * 0.03);
    });
  };

  enableShadows(alien);
  alien.scale.setScalar(1.25);
  return alien;
}

// ============================================================
//  المخلوق الصغير الأول: خنفساء الغبار المريخية
// ============================================================

function createDustScarab() {
  const bug = new THREE.Group();
  const rand = makeRng(909);
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  const shellTex = makeTexture(
    256,
    (ctx, s) => {
      ctx.fillStyle = "#b5561e";
      ctx.fillRect(0, 0, s, s);

      for (let y = 0; y < s; y += 16) {
        for (let x = 0; x < s; x += 18) {
          const sh = (y / 16) % 2 === 0 ? 0 : 9;
          ctx.fillStyle = "rgba(255,170,90,0.16)";
          ctx.beginPath();
          ctx.arc(x + sh + 9, y + 9, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "rgba(60,20,6,0.45)";
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
      }

      for (let i = 0; i < 900; i++) {
        ctx.fillStyle = i % 2 === 0 ? "rgba(255,200,140,0.12)" : "rgba(30,10,4,0.2)";
        ctx.fillRect(rand() * s, rand() * s, 2, 2);
      }
    },
    2,
    2
  );

  const shellMat = new THREE.MeshStandardMaterial({
    map: shellTex,
    bumpMap: shellTex,
    bumpScale: 0.03,
    color: 0xffffff,
    roughness: 0.38,
    metalness: 0.45
  });

  const plateMat = new THREE.MeshStandardMaterial({
    color: 0x2b1a12,
    roughness: 0.55,
    metalness: 0.4
  });

  const legMat = new THREE.MeshStandardMaterial({
    color: 0x3a2217,
    roughness: 0.5,
    metalness: 0.35
  });

  const glowMat = new THREE.MeshStandardMaterial({
    color: 0xffd166,
    emissive: 0xff9f1c,
    emissiveIntensity: 2.4,
    roughness: 0.2
  });

  const body = new THREE.Group();
  body.position.set(0, 0.62, 0);
  bug.add(body);

  ball(body, 0.5, 0, -0.08, -0.12, plateMat, 0.9, 0.5, 1.5, 18);
  ball(body, 0.34, 0, 0.1, 0.3, shellMat, 1.0, 0.8, 1.1, 20);
  ball(body, 0.3, 0, 0.12, 0.52, plateMat, 1.05, 0.55, 0.7, 16);

  [-1, 1].forEach((side) => {
    const wing = new THREE.Mesh(
      new THREE.SphereGeometry(0.52, 26, 18, 0, Math.PI * 2, 0, Math.PI * 0.5),
      shellMat
    );
    wing.scale.set(0.62, 0.8, 1.2);
    wing.position.set(side * 0.27, 0.0, -0.22);
    wing.rotation.z = side * -0.1;
    body.add(wing);

    for (let r = 0; r < 4; r++) {
      const u = 0.15 + r * 0.2;
      const wMax = Math.sqrt(1 - u * u) * 0.92;
      const pts = [];
      for (let k = 0; k <= 8; k++) {
        const w = ((k / 8) - 0.5) * 2 * wMax;
        const h = Math.sqrt(Math.max(0, 1 - u * u - w * w));
        pts.push(V(side * (0.27 + u * 0.325 * 1.02), 0.416 * h * 1.02 + 0.004, -0.22 + w * 0.624 * 1.02));
      }
      taperTube(body, pts, 0.008, 0.006, plateMat, 14, 4);
    }
  });

  taperTube(body, [V(0, 0.38, 0.28), V(0, 0.42, -0.1), V(0, 0.2, -0.62)], 0.012, 0.01, plateMat, 12, 5);

  for (let i = 0; i < 5; i++) {
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.14, 8), plateMat);
    spike.position.set(0, 0.42 - i * 0.04, 0.2 - i * 0.18);
    spike.rotation.x = -0.25;
    body.add(spike);
  }

  const head = new THREE.Group();
  head.position.set(0, 0.05, 0.82);
  body.add(head);

  ball(head, 0.2, 0, 0, 0, plateMat, 1.05, 0.85, 1.0, 16);

  [-1, 1].forEach((side) => {
    ball(head, 0.06, side * 0.13, 0.06, 0.12, glowMat, 1, 1, 0.8, 12);
    ball(head, 0.022, side * 0.14, 0.08, 0.17, new THREE.MeshBasicMaterial({ color: 0xffffff }), 1, 1, 1, 8);
    taperTube(
      head,
      [V(side * 0.08, -0.06, 0.16), V(side * 0.17, -0.1, 0.3), V(side * 0.07, -0.08, 0.42)],
      0.04,
      0.008,
      legMat,
      12,
      6
    );
  });

  const antennae = [];
  [-1, 1].forEach((side) => {
    const ant = new THREE.Group();
    ant.position.set(side * 0.08, 0.12, 0.15);
    head.add(ant);
    antennae.push({ group: ant, side });

    taperTube(
      ant,
      [V(0, 0, 0), V(side * 0.12, 0.2, 0.14), V(side * 0.2, 0.36, 0.3), V(side * 0.2, 0.42, 0.44)],
      0.016,
      0.008,
      legMat,
      14,
      5
    );
    ball(ant, 0.032, side * 0.2, 0.43, 0.46, glowMat, 1, 1.4, 1, 8);
  });

  const legs = [];
  const legZ = [0.4, 0.05, -0.32];

  [-1, 1].forEach((side) => {
    legZ.forEach((z, i) => {
      const leg = new THREE.Group();
      leg.position.set(side * 0.3, 0.52, z);
      bug.add(leg);

      const front = (i === 0 ? 1 : i === 1 ? 0 : -1) * 0.22;
      const hip = V(0, 0, 0);
      const knee = V(side * 0.4, 0.2, front);
      const foot = V(side * 0.7, -0.52, front * 1.5);

      taperTube(leg, [hip, midPoint(hip, knee, V(side * 0.02, 0.05, 0)), knee], 0.06, 0.04, legMat, 10, 6);
      ball(leg, 0.052, knee.x, knee.y, knee.z, plateMat, 1, 1, 1, 8);
      taperTube(leg, [knee, midPoint(knee, foot, V(side * 0.06, 0, 0)), foot], 0.04, 0.014, legMat, 10, 6);

      const sp = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.07, 6), plateMat);
      sp.position.set(side * 0.55, -0.18, front * 1.2);
      sp.rotation.z = side * -1.2;
      leg.add(sp);

      legs.push({ group: leg, phase: (i + (side > 0 ? 1 : 0)) % 2 === 0 ? 0 : Math.PI, side });
    });
  });

  bug.userData.update = function (t) {
    legs.forEach((l) => {
      l.group.rotation.y = Math.sin(t * 11 + l.phase) * 0.22;
      l.group.rotation.z = Math.max(0, Math.sin(t * 11 + l.phase)) * 0.12 * l.side;
    });
    body.position.y = 0.62 + Math.abs(Math.sin(t * 11)) * 0.03;
    head.rotation.y = Math.sin(t * 1.3) * 0.2;
    antennae.forEach((a, i) => {
      a.group.rotation.x = Math.sin(t * 3 + i) * 0.18;
      a.group.rotation.z = a.side * Math.sin(t * 2.2) * 0.1;
    });
  };

  enableShadows(bug);
  bug.scale.setScalar(0.95);
  return bug;
}

// ============================================================
//  المخلوق الصغير الثاني: قنديل الأبواغ الطائر
// ============================================================

function createSporeJelly() {
  const jelly = new THREE.Group();
  const rand = makeRng(31337);
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  const bellMat = new THREE.MeshStandardMaterial({
    color: 0x8aeaff,
    emissive: 0x1b9fc6,
    emissiveIntensity: 0.75,
    roughness: 0.15,
    metalness: 0.1,
    transparent: true,
    opacity: 0.52,
    side: THREE.DoubleSide,
    depthWrite: false
  });

  const ribMat = new THREE.MeshStandardMaterial({
    color: 0xc9f6ff,
    emissive: 0x4cc9f0,
    emissiveIntensity: 0.9,
    roughness: 0.3,
    transparent: true,
    opacity: 0.8
  });

  const coreMat = new THREE.MeshStandardMaterial({
    color: 0xffa6e8,
    emissive: 0xff3fb8,
    emissiveIntensity: 2.2,
    roughness: 0.25,
    transparent: true,
    opacity: 0.92
  });

  const tentMat = new THREE.MeshStandardMaterial({
    color: 0x9ae6ff,
    emissive: 0x2aa9d6,
    emissiveIntensity: 0.8,
    roughness: 0.35,
    transparent: true,
    opacity: 0.75
  });

  const armMat = new THREE.MeshStandardMaterial({
    color: 0xffc2f0,
    emissive: 0xd0409a,
    emissiveIntensity: 0.9,
    roughness: 0.4,
    transparent: true,
    opacity: 0.8
  });

  const sporeMat = new THREE.MeshStandardMaterial({
    color: 0xfff3a8,
    emissive: 0xffd23f,
    emissiveIntensity: 2.6,
    roughness: 0.2
  });

  const bell = new THREE.Group();
  bell.position.y = 0.85;
  jelly.add(bell);

  const BELL_PROFILE = [
    [0.0, 0.75],
    [0.25, 0.72],
    [0.5, 0.58],
    [0.68, 0.32],
    [0.78, 0.02],
    [0.8, -0.1]
  ];

  const bellCurve = new THREE.SplineCurve(BELL_PROFILE.map((p) => new THREE.Vector2(p[0], p[1])));
  const bellPts = bellCurve
    .getPoints(40)
    .map((p) => new THREE.Vector2(Math.max(p.x, 0.0005), p.y));

  const dome = new THREE.Mesh(new THREE.LatheGeometry(bellPts, 40), bellMat);
  dome.scale.set(0.55, 0.55, 0.55);
  bell.add(dome);

  const RIBS = 12;
  for (let i = 0; i < RIBS; i++) {
    const ang = (i / RIBS) * Math.PI * 2;
    const ca = Math.cos(ang);
    const sa = Math.sin(ang);
    const pts = bellPts
      .filter((_, idx) => idx % 5 === 0 || idx === bellPts.length - 1)
      .map((p) => V(p.x * 0.55 * 1.01 * ca, p.y * 0.55, p.x * 0.55 * 1.01 * sa));
    taperTube(bell, pts, 0.01, 0.006, ribMat, 14, 4);
  }

  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.022, 10, 40), coreMat);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = -0.055;
  bell.add(rim);

  const core = ball(bell, 0.2, 0, 0.18, 0, coreMat, 1, 1.25, 1, 18);

  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.15 + i * 0.07, 0.006, 6, 28), ribMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.05 + i * 0.1;
    bell.add(ring);
  }

  const oral = [];
  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI * 2 + 0.4;
    const g = new THREE.Group();
    g.position.set(Math.cos(ang) * 0.09, 0.78, Math.sin(ang) * 0.09);
    jelly.add(g);
    oral.push(g);

    taperTube(
      g,
      [
        V(0, 0, 0),
        V(Math.cos(ang) * 0.08, -0.3, Math.sin(ang) * 0.08),
        V(Math.cos(ang + 0.6) * 0.14, -0.62, Math.sin(ang + 0.6) * 0.14),
        V(Math.cos(ang + 1.2) * 0.1, -0.9, Math.sin(ang + 1.2) * 0.1)
      ],
      0.07,
      0.018,
      armMat,
      16,
      8
    );
  }

  const tentacles = [];
  const TENT = 10;
  for (let i = 0; i < TENT; i++) {
    const ang = (i / TENT) * Math.PI * 2;
    const g = new THREE.Group();
    g.position.set(Math.cos(ang) * 0.43, 0.79, Math.sin(ang) * 0.43);
    jelly.add(g);

    const length = 1.5 + rand() * 0.8;
    const ph = rand() * Math.PI * 2;
    const pts = [];
    for (let k = 0; k <= 6; k++) {
      const t = k / 6;
      pts.push(
        V(
          Math.cos(ang) * t * 0.12 - Math.sin(t * 5 + ph) * 0.06 * t,
          -t * length,
          Math.sin(ang) * t * 0.12 + Math.cos(t * 5 + ph) * 0.06 * t
        )
      );
    }
    taperTube(g, pts, 0.03, 0.006, tentMat, 22, 6);

    for (let b = 1; b <= 3; b++) {
      const p = pts[b * 2 - 1 > 6 ? 6 : b * 2 - 1];
      ball(g, 0.022, p.x, p.y, p.z, coreMat, 1, 1, 1, 8);
    }

    const tip = pts[6];
    ball(g, 0.03, tip.x, tip.y, tip.z, sporeMat, 1, 1.2, 1, 8);

    tentacles.push({ group: g, phase: ph });
  }

  const spores = new THREE.Group();
  spores.position.y = 0.2;
  jelly.add(spores);

  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const rr = 1.1 + rand() * 0.4;
    const s = ball(
      spores,
      0.03 + rand() * 0.025,
      Math.cos(a) * rr,
      (rand() - 0.5) * 1.1,
      Math.sin(a) * rr,
      sporeMat,
      1,
      1,
      1,
      8
    );
    s.userData.bobPhase = rand() * Math.PI * 2;
  }

  const glow = new THREE.PointLight(0x66e8ff, 1.5, 9);
  glow.position.set(0, 0.8, 0);
  jelly.add(glow);

  jelly.userData.baseY = 0;
  jelly.userData.update = function (t) {
    jelly.position.y = jelly.userData.baseY + Math.sin(t * 1.4) * 0.3;

    const pulse = Math.sin(t * 2.2);
    bell.scale.set(1 + pulse * 0.05, 1 - pulse * 0.07, 1 + pulse * 0.05);
    core.scale.setScalar(1 + Math.sin(t * 3.1) * 0.12);

    tentacles.forEach((tn) => {
      tn.group.rotation.x = Math.sin(t * 1.8 + tn.phase) * 0.14;
      tn.group.rotation.z = Math.cos(t * 1.5 + tn.phase) * 0.14;
    });

    oral.forEach((g, i) => {
      g.rotation.z = Math.sin(t * 1.6 + i) * 0.1;
    });

    spores.rotation.y = t * 0.7;
    spores.children.forEach((s) => {
      s.position.y += Math.sin(t * 2 + s.userData.bobPhase) * 0.0015;
    });
  };

  enableShadows(jelly);
  jelly.scale.setScalar(1.0);
  return jelly;
}

// ============================================================
//  رائد الفضاء v3: أطراف متصلة وناعمة + انعكاسات بيئة + غبار مريخي
// ============================================================

function createSuitFabricTexture() {
  const rand = makeRng(1024);
  return makeTexture(
    512,
    (ctx, s) => {
      ctx.fillStyle = "#eeeeea";
      ctx.fillRect(0, 0, s, s);
      for (let i = 0; i <= s; i += 3) {
        ctx.fillStyle = (i / 3) % 2 === 0 ? "rgba(120,124,130,0.14)" : "rgba(255,255,255,0.18)";
        ctx.fillRect(i, 0, 1.5, s);
        ctx.fillRect(0, i, s, 1.5);
      }
      for (let i = 0; i < 70; i++) {
        const x = rand() * s, y = rand() * s, r = 10 + rand() * 40;
        const c = rand() > 0.5 ? "150,110,80" : "90,90,92";
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(${c},${0.04 + rand() * 0.07})`);
        g.addColorStop(1, `rgba(${c},0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      for (let i = 0; i < 30; i++) {
        const y = rand() * s;
        const g = ctx.createLinearGradient(0, y - 7, 0, y + 7);
        g.addColorStop(0, "rgba(0,0,0,0)");
        g.addColorStop(0.5, i % 2 ? "rgba(70,76,88,0.16)" : "rgba(255,255,255,0.3)");
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, y - 7, s, 14);
      }
    },
    2,
    2
  );
}

function createFlagTexture() {
  return makeTexture(128, (ctx, s) => {
    for (let i = 0; i < 7; i++) {
      ctx.fillStyle = i % 2 === 0 ? "#c8282d" : "#f4f4f4";
      ctx.fillRect(0, (i * s) / 7, s, s / 7 + 1);
    }
    ctx.fillStyle = "#2a3f8f";
    ctx.fillRect(0, 0, s * 0.45, (s * 4) / 7);
  }, 1, 1);
}

function createNameTagTexture() {
  return makeTexture(128, (ctx, s) => {
    ctx.fillStyle = "#1c3c9e";
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(14, 36, s - 28, 12);
    ctx.fillRect(14, 64, s - 50, 10);
  }, 1, 1);
}

// خريطة بيئة مصطنعة (فضاء أسود + أفق مريخي برتقالي + شمس) لانعكاسات واقعية
function createAstroEnvMap() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, "#04050a");
  g.addColorStop(0.35, "#141a2a");
  g.addColorStop(0.49, "#f0b07a");
  g.addColorStop(0.52, "#c26a3a");
  g.addColorStop(1, "#4a2212");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 256);
  const sun = ctx.createRadialGradient(150, 70, 0, 150, 70, 60);
  sun.addColorStop(0, "rgba(255,255,255,1)");
  sun.addColorStop(0.3, "rgba(255,240,200,0.7)");
  sun.addColorStop(1, "rgba(255,240,200,0)");
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, 512, 256);
  const tex = new THREE.CanvasTexture(canvas);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createAstronautMaterials() {
  const fabric = createSuitFabricTexture();
  const env = createAstroEnvMap();
  const std = (o, ei = 0.2) => new THREE.MeshStandardMaterial({ envMap: env, envMapIntensity: ei, ...o });

  const suit = std({ map: fabric, bumpMap: fabric, bumpScale: 0.03, color: 0xf6f6f2, emissive: 0x3a3d44, emissiveIntensity: 0.22, roughness: 0.9 }, 0.15);
  const suitDust = suit.clone();
  suitDust.vertexColors = true;
  const suitShade = std({ map: fabric, bumpMap: fabric, bumpScale: 0.04, color: 0xc9ccd2, emissive: 0x22252b, emissiveIntensity: 0.2, roughness: 0.92 }, 0.12);
  const bootMat = suitShade.clone();
  bootMat.vertexColors = true;

  return {
    suit,
    suitDust,
    suitShade,
    bootMat,
    suitDark: std({ map: fabric, color: 0x4a4f58, roughness: 0.8, metalness: 0.1 }, 0.3),
    hard: std({ color: 0xf0f1f3, emissive: 0x2a2d33, emissiveIntensity: 0.2, roughness: 0.3, metalness: 0.1 }, 0.55),
    glove: std({ map: fabric, bumpMap: fabric, bumpScale: 0.03, color: 0xe4e6ea, emissive: 0x2a2d33, emissiveIntensity: 0.18, roughness: 0.85 }, 0.12),
    metal: std({ color: 0xd0d6de, emissive: 0x15181d, emissiveIntensity: 0.2, roughness: 0.22, metalness: 0.95 }, 1.3),
    harness: std({ color: 0x23282f, roughness: 0.7, metalness: 0.2 }, 0.3),
    rubber: std({ color: 0x1b1d22, roughness: 0.9, metalness: 0.03 }, 0.15),
    dust: std({ color: 0xa8603a, roughness: 0.95 }, 0.05),
    orange: std({ color: 0xf26a1b, roughness: 0.5, metalness: 0.1 }, 0.3),
    red: std({ color: 0xc8282d, roughness: 0.55, metalness: 0.1 }, 0.3),
    blue: std({ color: 0x2f62d8, roughness: 0.45, metalness: 0.3 }, 0.5),
    hose: std({ color: 0x2c3036, roughness: 0.55, metalness: 0.25 }, 0.4),
    visor: new THREE.MeshPhysicalMaterial({
      color: 0xd9a431,
      emissive: 0x3a2808,
      emissiveIntensity: 0.35,
      roughness: 0.05,
      metalness: 1.0,
      clearcoat: 1.0,
      clearcoatRoughness: 0.02,
      envMap: env,
      envMapIntensity: 1.7
    }),
    lamp: std({ color: 0xfff5d6, emissive: 0xffdc8c, emissiveIntensity: 2.2, roughness: 0.2 }, 0.2),
    ledGreen: std({ color: 0x66ff99, emissive: 0x22dd66, emissiveIntensity: 2.4 }, 0),
    ledCyan: std({ color: 0x8ff0ff, emissive: 0x22ccee, emissiveIntensity: 2.3 }, 0),
    screen: std({ color: 0x0a3d3d, emissive: 0x22e0ce, emissiveIntensity: 0.9, roughness: 0.3 }, 0.3),
    flag: std({ map: createFlagTexture(), roughness: 0.8, side: THREE.DoubleSide }, 0.1),
    tag: std({ map: createNameTagTexture(), roughness: 0.7, side: THREE.DoubleSide }, 0.1)
  };
}
function lathePart(parent, profile, mat, x, y, z, sx = 1, sz = 1, seg = 36) {
  const curve = new THREE.SplineCurve(profile.map((p) => new THREE.Vector2(p[0], p[1])));
  const pts = curve.getPoints(48).map((p) => new THREE.Vector2(Math.max(p.x, 0.0005), p.y));
  const m = new THREE.Mesh(new THREE.LatheGeometry(pts, seg), mat);
  m.position.set(x, y, z);
  m.scale.set(sx, 1, sz);
  parent.add(m);
  return m;
}

// تلوين رؤوس المجسم بلون غبار حسب دالة
function tintGeometry(geo, fn) {
  const pos = geo.attributes.position;
  const col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const f = THREE.MathUtils.clamp(fn(pos.getX(i), pos.getY(i), pos.getZ(i)), 0, 1);
    col[i * 3] = 1 - f * 0.22;
    col[i * 3 + 1] = 1 - f * 0.45;
    col[i * 3 + 2] = 1 - f * 0.58;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
}

// كُمّ/ساق متصلة: كتف مدوّر، تجاعيد ناعمة، وغبار تدريجي نحو الأسفل
function limb(parent, rTop, rBot, len, mat, opts = {}) {
  const { bulge = 0.008, dust = 0, wr = 0, wrAt = [0.5, 0.9], seg = 28 } = opts;
  const steps = 26;
  const pts = [new THREE.Vector2(0.0005, -len - 0.006), new THREE.Vector2(rBot * 0.72, -len - 0.004)];
  for (let i = steps; i >= 0; i--) {
    const t = i / steps;
    let r = rTop + (rBot - rTop) * t + Math.sin(Math.PI * t) * bulge;
    if (wr && t >= wrAt[0] && t <= wrAt[1]) {
      r += Math.sin(((t - wrAt[0]) / (wrAt[1] - wrAt[0])) * Math.PI * 2 * wr) * 0.0045;
    }
    pts.push(new THREE.Vector2(r, -t * len));
  }
  pts.push(new THREE.Vector2(rTop * 0.82, 0.014));
  pts.push(new THREE.Vector2(rTop * 0.5, 0.032));
  pts.push(new THREE.Vector2(0.0005, 0.04));

  const geo = new THREE.LatheGeometry(pts, seg);
  if (dust > 0) tintGeometry(geo, (x, y) => Math.pow(THREE.MathUtils.clamp(-y / len, 0, 1), 1.6) * dust);
  const m = new THREE.Mesh(geo, dust > 0 ? parent.userData.dustMat || mat : mat);
  parent.add(m);
  return m;
}

function createAstronautPlayer() {
  const player = new THREE.Group();
  const bodyRig = new THREE.Group();
  player.add(bodyRig);

  const charLight = new THREE.PointLight(0xfff4e6, 1.1, 7);
  charLight.position.set(0, 1.8, 1.8);
  player.add(charLight);

  const M = createAstronautMaterials();
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  const THIGH = 0.4;
  const SHIN = 0.38;
  const ANKLE_Y = 0.12;
  const UPPER = 0.29;
  const FORE = 0.26;
  const PELVIS_Y = ANKLE_Y + SHIN + THIGH + 0.06;

  // ---------------- الحوض ----------------
  const pelvis = new THREE.Group();
  pelvis.position.set(0, PELVIS_Y, 0);
  bodyRig.add(pelvis);

  lathePart(pelvis, [[0.001, -0.14], [0.17, -0.13], [0.21, -0.05], [0.22, 0.04], [0.19, 0.1], [0.001, 0.11]], M.suit, 0, 0, 0, 1.35, 0.9);
  ringAt(pelvis, 0.215, 0.02, 0, 0.07, 0, M.harness, 1.35, 0.9);

  const buckle = bevelPlate(0.1, 0.07, 0.03, 0.01, M.metal);
  buckle.position.set(0, 0.04, -0.2);
  pelvis.add(buckle);

  [-1, 1].forEach((side) => {
    const pouch = bevelPlate(0.07, 0.12, 0.06, 0.012, M.suitShade);
    pouch.position.set(side * 0.285, 0.0, -0.02);
    pouch.rotation.z = side * -0.1;
    pelvis.add(pouch);
  });

  // ---------------- الجذع ----------------
  const spine = new THREE.Group();
  spine.position.set(0, 0.12, 0);
  pelvis.add(spine);

  lathePart(spine, [[0.001, -0.05], [0.16, -0.04], [0.19, 0.04], [0.21, 0.16], [0.225, 0.3], [0.245, 0.4], [0.225, 0.47], [0.15, 0.51], [0.001, 0.53]], M.suit, 0, 0, 0, 1.38, 0.9);
  lathePart(spine, [[0.001, 0.2], [0.23, 0.22], [0.252, 0.4], [0.232, 0.47], [0.155, 0.515], [0.001, 0.535]], M.hard, 0, 0, 0, 1.39, 0.91);
  ringAt(spine, 0.215, 0.028, 0, -0.02, 0, M.metal, 1.35, 0.9);

  // أكتاف صلبة منحنية تندمج مع الجذع
  [-1, 1].forEach((side) => {
    ball(spine, 0.125, side * 0.335, 0.425, 0, M.hard, 1.0, 0.7, 1.05, 24);
  });

  const chestBox = bevelPlate(0.28, 0.17, 0.05, 0.014, M.suitDark);
  chestBox.position.set(0, 0.25, -0.245);
  spine.add(chestBox);

  const screen = bevelPlate(0.11, 0.055, 0.01, 0.004, M.screen);
  screen.position.set(-0.06, 0.285, -0.275);
  spine.add(screen);

  ball(spine, 0.011, 0.05, 0.29, -0.273, M.ledGreen, 1, 1, 0.6, 8);
  ball(spine, 0.011, 0.08, 0.29, -0.273, M.orange, 1, 1, 0.6, 8);
  for (let i = 0; i < 4; i++) {
    const knob = cyl(spine, 0.014, 0.014, 0.02, -0.09 + i * 0.06, 0.21, -0.275, M.metal, 10);
    knob.rotation.x = Math.PI / 2;
  }

  [-1, 1].forEach((side) => {
    const conn = cyl(spine, 0.026, 0.026, 0.05, side * 0.11, 0.12, -0.24, M.metal, 14);
    conn.rotation.x = Math.PI / 2;
    const ring = ringAt(spine, 0.029, 0.008, side * 0.11, 0.12, -0.262, side < 0 ? M.blue : M.orange);
    ring.rotation.x = 0;
    taperTube(spine, [V(side * 0.11, 0.12, -0.265), V(side * 0.2, 0.04, -0.32), V(side * 0.21, -0.04, -0.25)], 0.012, 0.012, M.hose, 14, 6);
  });

  const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.06), M.flag);
  flag.position.set(-0.17, 0.43, -0.228);
  flag.rotation.y = Math.PI;
  spine.add(flag);

  const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.045), M.tag);
  tag.position.set(0.16, 0.43, -0.228);
  tag.rotation.y = Math.PI;
  spine.add(tag);

  // ---------------- الرقبة والخوذة ----------------
  cyl(spine, 0.15, 0.17, 0.06, 0, 0.55, 0, M.suitShade, 28);
  ringAt(spine, 0.175, 0.03, 0, 0.58, 0, M.metal);
  ringAt(spine, 0.17, 0.014, 0, 0.62, 0, M.blue);

  const neck = new THREE.Group();
  neck.position.set(0, 0.6, 0);
  spine.add(neck);

  const head = new THREE.Group();
  head.position.set(0, 0.19, 0);
  neck.add(head);

  const HR = 0.245;
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(HR, 44, 32), M.hard);
  helmet.scale.set(0.97, 1.0, 1.05);
  head.add(helmet);

  // حلقة الخوذة عند الرقبة
  ringAt(head, 0.19, 0.022, 0, -0.2, 0, M.metal);

  const visorRim = new THREE.Mesh(
    new THREE.SphereGeometry(HR + 0.007, 44, 24, Math.PI * 1.03, Math.PI * 0.94, Math.PI * 0.22, Math.PI * 0.6),
    M.suitDark
  );
  visorRim.scale.set(0.97, 1.0, 1.05);
  head.add(visorRim);

  const visor = new THREE.Mesh(
    new THREE.SphereGeometry(HR + 0.016, 44, 24, Math.PI * 1.07, Math.PI * 0.86, Math.PI * 0.26, Math.PI * 0.52),
    M.visor
  );
  visor.scale.set(0.97, 1.0, 1.05);
  head.add(visor);

  [-1, 1].forEach((side) => {
    ball(head, 0.038, side * 0.2, 0.13, -0.13, M.suitDark, 1.1, 0.9, 1.1, 12);
    const lens = cyl(head, 0.021, 0.021, 0.02, side * 0.214, 0.13, -0.165, M.lamp, 14);
    lens.rotation.x = Math.PI / 2;
    ball(head, 0.033, side * 0.238, -0.02, 0.02, M.suitShade, 0.7, 1.1, 1.1, 10);
  });

  const topCam = bevelPlate(0.08, 0.045, 0.06, 0.012, M.suitDark);
  topCam.position.set(0, 0.245, -0.06);
  head.add(topCam);
  ball(head, 0.013, 0, 0.245, -0.095, M.ledCyan, 1, 1, 0.6, 8);

  // ---------------- حقيبة دعم الحياة ----------------
  const pack = new THREE.Group();
  pack.position.set(0, 0.25, 0.29);
  spine.add(pack);

  const packBody = bevelPlate(0.3, 0.42, 0.13, 0.05, M.hard);
  pack.add(packBody);
  const packTop = bevelPlate(0.26, 0.05, 0.15, 0.025, M.suitShade);
  packTop.position.set(0, 0.25, 0);
  pack.add(packTop);
  const packBottom = bevelPlate(0.26, 0.05, 0.15, 0.025, M.suitDark);
  packBottom.position.set(0, -0.25, 0);
  pack.add(packBottom);

  const panel = bevelPlate(0.2, 0.17, 0.012, 0.006, M.suitDark);
  panel.position.set(0, 0.04, 0.095);
  pack.add(panel);
  const panelScreen = bevelPlate(0.085, 0.042, 0.01, 0.004, M.screen);
  panelScreen.position.set(-0.04, 0.08, 0.107);
  pack.add(panelScreen);
  ball(pack, 0.011, 0.05, 0.08, 0.107, M.ledGreen, 1, 1, 0.6, 8);
  ball(pack, 0.011, 0.08, 0.08, 0.107, M.red, 1, 1, 0.6, 8);

  [-1, 1].forEach((side) => {
    cyl(pack, 0.048, 0.048, 0.27, side * 0.185, -0.04, 0.03, M.suitShade, 22);
    ball(pack, 0.048, side * 0.185, 0.095, 0.03, M.metal, 1, 0.6, 1, 14);
    ringAt(pack, 0.05, 0.009, side * 0.185, -0.05, 0.03, side < 0 ? M.blue : M.orange);
  });

  cyl(pack, 0.006, 0.009, 0.25, -0.12, 0.39, 0, M.harness, 8);
  ball(pack, 0.015, -0.12, 0.515, 0, M.ledCyan, 1, 1, 1, 10);

  // ---------------- الذراعان: كُمّ متصل بكتف مدوّر ----------------
  const arms = [];

  [-1, 1].forEach((side) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.37, 0.4, 0);
    shoulder.rotation.z = side * 0.1;
    shoulder.userData.dustMat = M.suitDust;
    spine.add(shoulder);

    limb(shoulder, 0.092, 0.078, UPPER, M.suit, { bulge: 0.01, wr: 3, wrAt: [0.72, 1.0] });
    ringAt(shoulder, 0.1, 0.018, 0, -0.085, 0, M.metal);
    ringAt(shoulder, 0.094, 0.008, 0, -0.11, 0, M.blue);

    const elbow = new THREE.Group();
    elbow.position.set(0, -UPPER, 0);
    elbow.userData.dustMat = M.suitDust;
    shoulder.add(elbow);

    ball(elbow, 0.076, 0, 0, 0, M.suitShade, 1, 1, 1, 16);
    limb(elbow, 0.078, 0.062, FORE, M.suit, { bulge: 0.008, dust: 0.45, wr: 2, wrAt: [0.0, 0.18] });

    const forePatch = bevelPlate(0.042, 0.1, 0.018, 0.006, M.suitDark);
    forePatch.position.set(0, -FORE * 0.5, -0.074);
    elbow.add(forePatch);

    const wrist = new THREE.Group();
    wrist.position.set(0, -FORE, 0);
    wrist.scale.setScalar(1.08);
    elbow.add(wrist);

    ringAt(wrist, 0.066, 0.02, 0, 0, 0, M.metal);
    ringAt(wrist, 0.062, 0.01, 0, -0.03, 0, M.blue);
    cyl(wrist, 0.056, 0.062, 0.05, 0, -0.045, 0, M.glove, 18);

    ball(wrist, 0.06, 0, -0.105, 0, M.glove, 1.15, 1.2, 0.72, 14);
    const backPlate = bevelPlate(0.07, 0.07, 0.012, 0.006, M.suitDark);
    backPlate.position.set(0, -0.1, 0.04);
    wrist.add(backPlate);

    const finger = (x, len1, len2, curl1, curl2) => {
      const r = 0.0155;
      const g = new THREE.Group();
      g.position.set(x, -0.155, -0.005);
      g.rotation.x = curl1;
      wrist.add(g);
      ball(g, r * 1.15, 0, 0, 0, M.glove, 1, 1, 1, 8);
      const s1 = new THREE.Mesh(new THREE.CapsuleGeometry(r, len1, 4, 8), M.glove);
      s1.position.y = -len1 / 2 - r * 0.4;
      g.add(s1);
      const k = new THREE.Group();
      k.position.y = -len1 - r * 0.8;
      k.rotation.x = curl2;
      g.add(k);
      const s2 = new THREE.Mesh(new THREE.CapsuleGeometry(r * 0.92, len2, 4, 8), M.glove);
      s2.position.y = -len2 / 2 - r * 0.3;
      k.add(s2);
      ball(k, r * 0.95, 0, -len2 - r * 0.55, 0, M.rubber, 1, 0.9, 1, 6);
    };

    finger(-0.045, 0.034, 0.03, 0.25, 0.6);
    finger(-0.015, 0.04, 0.034, 0.3, 0.65);
    finger(0.015, 0.04, 0.034, 0.35, 0.7);
    finger(0.045, 0.032, 0.028, 0.4, 0.75);

    const thumbG = new THREE.Group();
    thumbG.position.set(-side * 0.062, -0.1, -0.015);
    thumbG.rotation.z = -side * 0.75;
    thumbG.rotation.x = 0.35;
    wrist.add(thumbG);
    const th1 = new THREE.Mesh(new THREE.CapsuleGeometry(0.019, 0.04, 4, 8), M.glove);
    th1.position.y = -0.03;
    thumbG.add(th1);
    ball(thumbG, 0.019, 0, -0.07, 0, M.rubber, 1, 0.9, 1, 6);

    arms.push({ shoulder, elbow, wrist, side });
  });

  // ---------------- الساقان والحذاء ----------------
  const legs = [];

  [-1, 1].forEach((side) => {
    const hip = new THREE.Group();
    hip.position.set(side * 0.145, -0.06, 0);
    hip.userData.dustMat = M.suitDust;
    pelvis.add(hip);

    limb(hip, 0.114, 0.094, THIGH, M.suit, { bulge: 0.01, wr: 2, wrAt: [0.82, 1.0] });

    const pocket = bevelPlate(0.045, 0.12, 0.1, 0.01, M.suitShade);
    pocket.position.set(side * 0.108, -THIGH * 0.5, -0.01);
    hip.add(pocket);

    const knee = new THREE.Group();
    knee.position.set(0, -THIGH, 0);
    knee.userData.dustMat = M.suitDust;
    hip.add(knee);

    ball(knee, 0.088, 0, 0, 0, M.suitShade, 1.02, 1, 1, 18);
    const kneeArmor = bevelPlate(0.125, 0.125, 0.045, 0.016, M.hard);
    kneeArmor.position.set(0, 0.0, -0.098);
    knee.add(kneeArmor);
    const kneeStripe = bevelPlate(0.09, 0.02, 0.012, 0.004, M.red);
    kneeStripe.position.set(0, 0.05, -0.13);
    knee.add(kneeStripe);

    limb(knee, 0.093, 0.075, SHIN, M.suit, { bulge: 0.008, dust: 0.55, wr: 2, wrAt: [0.0, 0.15] });
    const shinGuard = bevelPlate(0.046, 0.16, 0.02, 0.008, M.suitDark);
    shinGuard.position.set(0, -SHIN * 0.42, -0.088);
    knee.add(shinGuard);

    const ankle = new THREE.Group();
    ankle.position.set(0, -SHIN, 0);
    knee.add(ankle);

    ringAt(ankle, 0.08, 0.018, 0, 0.03, 0, M.metal);

    // حذاء مصبوب بشكل ناعم: جسم دوراني ممدود + نعل
    cyl(ankle, 0.082, 0.092, 0.1, 0, -0.025, 0, M.bootMat, 24);
    const bootGeo = new THREE.LatheGeometry(
      new THREE.SplineCurve([
        new THREE.Vector2(0.001, -0.215),
        new THREE.Vector2(0.05, -0.2),
        new THREE.Vector2(0.088, -0.15),
        new THREE.Vector2(0.098, -0.07),
        new THREE.Vector2(0.1, 0.0),
        new THREE.Vector2(0.097, 0.08),
        new THREE.Vector2(0.084, 0.15),
        new THREE.Vector2(0.05, 0.19),
        new THREE.Vector2(0.001, 0.2)
      ]).getPoints(40).map((p) => new THREE.Vector2(Math.max(p.x, 0.0005), p.y)),
      28
    );
    tintGeometry(bootGeo, (x, y, z) => THREE.MathUtils.smoothstep(z, -0.01, 0.07) * 0.85);
    const boot = new THREE.Mesh(bootGeo, M.bootMat);
    boot.rotation.x = Math.PI / 2;
    boot.scale.set(1.0, 0.92, 0.72);
    boot.position.set(0, -0.016, -0.05);
    ankle.add(boot);

    const sole = bevelPlate(0.135, 0.02, 0.36, 0.014, M.suitDark);
    sole.position.set(0, -0.092, -0.06);
    ankle.add(sole);

    legs.push({ hip, knee, ankle, side });
  });

  // ---------------- الحركة ----------------
  let walkCycle = 0;
  let moveBlend = 0;

  player.userData.update = function (t, isMoving = false) {
    moveBlend += ((isMoving ? 1 : 0) - moveBlend) * 0.14;
    if (moveBlend > 0.003) walkCycle += 0.12 * moveBlend;

    const mb = moveBlend;
    const idle = 1 - mb;
    const breath = Math.sin(t * 1.8);
    const s = Math.sin(walkCycle);
    const c = Math.cos(walkCycle);

    pelvis.position.y = PELVIS_Y - Math.abs(s) * 0.025 * mb + breath * 0.004 * idle;
    pelvis.position.x = s * 0.01 * mb;
    pelvis.rotation.set(0.035 * mb, s * 0.06 * mb, c * 0.02 * mb);

    spine.rotation.set(0.03 * mb, -s * 0.09 * mb, -c * 0.018 * mb);
    spine.scale.set(1 + breath * 0.008, 1 + breath * 0.01, 1 + breath * 0.012);

    head.rotation.set(-0.03 * mb, s * 0.08 * mb + Math.sin(t * 0.5) * 0.08 * idle, 0);

    legs.forEach((leg, i) => {
      const ph = walkCycle + i * Math.PI;
      const sp = Math.sin(ph);
      const cp = Math.cos(ph);
      const swing = Math.max(0, cp);

      const hipX = sp * 0.34 * mb;
      const kneeX = (0.05 + Math.pow(swing, 1.2) * 0.65) * mb + 0.03 * idle;

      leg.hip.rotation.x = hipX;
      leg.hip.rotation.z = leg.side * 0.02 * swing * mb;
      leg.knee.rotation.x = -kneeX;
      leg.ankle.rotation.x = (kneeX - hipX) * 0.85;
    });

    arms.forEach((a, i) => {
      const ph = walkCycle + i * Math.PI + Math.PI;
      const sp = Math.sin(ph);
      const fwd = Math.max(0, sp);

      a.shoulder.rotation.x = sp * 0.16 * mb + Math.sin(t * 1.3 + i) * 0.015 * idle;
      a.shoulder.rotation.z = a.side * (0.1 + fwd * 0.015 * mb);
      a.elbow.rotation.x = 0.22 + (0.06 + fwd * 0.18) * mb;
      a.wrist.rotation.x = fwd * 0.05 * mb;
    });
  };

  enableShadows(player);
  return player;
}


// ============================================================
//  السطح الرئيسي
// ============================================================

export function createSurface(scene) {
  const surfaceGroup = new THREE.Group();

  const mlk = new THREE.PlaneGeometry(1500, 1500, 50, 50);
  const eeed = new THREE.MeshStandardMaterial({
    color: 0x9b4b2c
  });

  const position = mlk.attributes.position;
  for (let i = 0; i < position.count; i++) {
    const height = Math.random() * 6;
    position.setZ(i, height);
  }

  position.needsUpdate = true;
  mlk.computeVertexNormals();

  const ccb = new THREE.Mesh(mlk, eeed);
  ccb.rotation.x = -Math.PI / 2;
  surfaceGroup.add(ccb);

  const raei = new THREE.Raycaster();

  function getGroundHeight(x, z) {
    raei.set(
      new THREE.Vector3(x, 100, z),
      new THREE.Vector3(0, -1, 0)
    );
    ccb.updateMatrixWorld(true);
    const hits = raei.intersectObject(ccb);
    return hits.length > 0 ? hits[0].point.y : 0;
  }

  const hemiLight = new THREE.HemisphereLight(0xaec4e0, 0x6b321b, 1.15);
  surfaceGroup.add(hemiLight);

  const ddd = new THREE.DirectionalLight(0xffffff, 2.4);
  ddd.position.set(12, 24, 12);
  surfaceGroup.add(ddd);

  const player = createAstronautPlayer();
  player.position.set(0, getGroundHeight(0, 0), 0);
  surfaceGroup.add(player);

  const rockCanvas = document.createElement("canvas");
  rockCanvas.width = 256;
  rockCanvas.height = 256;
  const rockCtx = rockCanvas.getContext("2d");

  rockCtx.fillStyle = "#8c4427";
  rockCtx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 4000; i++) {
    const rx = Math.random() * 256;
    const ry = Math.random() * 256;
    const size = Math.random() * 3 + 1;
    const shade = Math.random();
    if (shade > 0.6) {
      rockCtx.fillStyle = "rgba(210, 140, 100, 0.25)";
    } else if (shade < 0.3) {
      rockCtx.fillStyle = "rgba(40, 15, 5, 0.35)";
    } else {
      rockCtx.fillStyle = "rgba(120, 55, 30, 0.2)";
    }
    rockCtx.fillRect(rx, ry, size, size);
  }

  const rockTexture = new THREE.CanvasTexture(rockCanvas);
  rockTexture.wrapS = THREE.RepeatWrapping;
  rockTexture.wrapT = THREE.RepeatWrapping;

  const ddv = new THREE.MeshStandardMaterial({
    map: rockTexture,
    bumpMap: rockTexture,
    bumpScale: 0.04,
    roughness: 0.92,
    metalness: 0.05,
    flatShading: true
  });

  function createRealisticRockGeometry(radius, seed) {
    const geo = new THREE.IcosahedronGeometry(radius, 2);
    const pos = geo.attributes.position;
    const v = new THREE.Vector3();

    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const dir = v.clone().normalize();

      const n1 = Math.sin(dir.x * 3.5 + seed) * Math.cos(dir.y * 3.5 + seed) * Math.sin(dir.z * 3.5 + seed);
      const n2 = Math.sin(dir.x * 8.0 - seed) * Math.cos(dir.z * 8.0 + seed) * 0.4;
      const ridge = Math.abs(n1 + n2);

      let displacement = 1 + n1 * 0.28 + ridge * 0.18;
      if (dir.y < -0.2) {
        displacement *= 0.75;
      }

      v.multiplyScalar(displacement);
      v.y *= 0.78;
      pos.setXYZ(i, v.x, v.y, v.z);
    }

    pos.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  }

  const rockGeometries = [
    createRealisticRockGeometry(0.7, 1.2),
    createRealisticRockGeometry(0.7, 4.7),
    createRealisticRockGeometry(0.7, 8.9)
  ];
const rocks = [];
  const rami = new THREE.Mesh(rockGeometries[0], ddv);
  rami.castShadow = true;
  rami.receiveShadow = true;
  rami.position.set(5, getGroundHeight(5, -3) + 0.35, -3);
  surfaceGroup.add(rami);
rocks.push(rami);
  for (let i = 0; i < 1000; i++) {
    const randomGeo = rockGeometries[i % rockGeometries.length];
    const ston = new THREE.Mesh(randomGeo, ddv);

    const x = (Math.random() - 0.5) * 2900;
    const z = (Math.random() - 0.5) * 2900;

    const scaleX = 0.5 + Math.random() * 1.1;
    const scaleY = 0.4 + Math.random() * 0.8;
    const scaleZ = 0.5 + Math.random() * 1.1;

    ston.scale.set(scaleX, scaleY, scaleZ);
    ston.rotation.set(
      (Math.random() - 0.5) * 0.3,
      Math.random() * Math.PI * 2,
      (Math.random() - 0.5) * 0.3
    );

    ston.position.set(x, getGroundHeight(x, z) + 0.32 * scaleY, z);
    ston.castShadow = true;
    ston.receiveShadow = true;
    surfaceGroup.add(ston);
    rocks.push(ston);
  }

  // 1. الوحش الأول: السرطان الفضائي
  function createOrganicScaleTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#c8521f";
    ctx.fillRect(0, 0, 256, 256);

    for (let y = 0; y < 256; y += 20) {
      for (let x = 0; x < 256; x += 24) {
        const shift = (y / 20) % 2 === 0 ? 0 : 12;
        const px = x + shift;
        ctx.fillStyle = "#e2682e";
        ctx.beginPath();
        ctx.arc(px + 12, y + 12, 11, Math.PI, 0, false);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = "#481808";
        ctx.lineWidth = 1.8;
        ctx.stroke();
      }
    }

    for (let i = 0; i < 1600; i++) {
      ctx.fillStyle = i % 2 === 0 ? "rgba(255,175,110,0.14)" : "rgba(25,7,2,0.22)";
      ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, 3);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  function createAlienCrabEnemy() {
    const enemy = new THREE.Group();
    const scaleTex = createOrganicScaleTexture();

    const shellMat = new THREE.MeshStandardMaterial({
      map: scaleTex,
      bumpMap: scaleTex,
      bumpScale: 0.055,
      color: 0xe06229,
      roughness: 0.64,
      metalness: 0.16
    });

    const chitinMat = new THREE.MeshStandardMaterial({
      color: 0x381912,
      roughness: 0.8,
      metalness: 0.24
    });

    const eyeGlowMat = new THREE.MeshStandardMaterial({
      color: 0x5dfaff,
      emissive: 0x00e5ff,
      emissiveIntensity: 3.1,
      roughness: 0.12
    });

    const bodyY = 2.15;

    const lowerCurve = [
      new THREE.Vector2(0.0, -0.58),
      new THREE.Vector2(1.25, -0.45),
      new THREE.Vector2(1.75, -0.05),
      new THREE.Vector2(1.55, 0.45),
      new THREE.Vector2(0.0, 0.55)
    ];
    const lowerBody = new THREE.Mesh(new THREE.LatheGeometry(lowerCurve, 36), chitinMat);
    lowerBody.scale.set(1.16, 0.9, 1.44);
    lowerBody.position.set(0, bodyY - 0.22, 0);
    lowerBody.castShadow = true;
    lowerBody.receiveShadow = true;
    enemy.add(lowerBody);

    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(1.92, 36, 28, 0, Math.PI * 2, 0, Math.PI * 0.58),
      shellMat
    );
    dome.scale.set(1.14, 0.72, 1.38);
    dome.position.set(0, bodyY + 0.04, -0.05);
    dome.castShadow = true;
    dome.receiveShadow = true;
    enemy.add(dome);

    for (let row = -2; row <= 2; row++) {
      for (let col = -2; col <= 2; col++) {
        const scute = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 12), shellMat);
        scute.scale.set(1.25, 0.55, 1.35);
        scute.position.set(
          col * 0.56,
          bodyY + 1.16 - (Math.abs(row) * 0.16 + Math.abs(col) * 0.12),
          row * 0.72
        );
        scute.rotation.x = row * 0.24;
        scute.rotation.z = -col * 0.2;
        scute.castShadow = true;
        enemy.add(scute);
      }
    }

    const headDome = new THREE.Mesh(new THREE.SphereGeometry(0.95, 24, 20), shellMat);
    headDome.scale.set(1.12, 0.68, 1.25);
    headDome.position.set(0, bodyY - 0.02, 2.15);
    headDome.castShadow = true;
    enemy.add(headDome);

    [-1, 1].forEach((side) => {
      const jawCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.36, bodyY - 0.24, 2.35),
        new THREE.Vector3(side * 0.46, bodyY - 0.36, 2.82),
        new THREE.Vector3(side * 0.22, bodyY - 0.42, 3.15)
      ]);
      const jawMesh = new THREE.Mesh(new THREE.TubeGeometry(jawCurve, 14, 0.13, 10, false), chitinMat);
      jawMesh.castShadow = true;
      enemy.add(jawMesh);
    });

    const eyeGeo = new THREE.SphereGeometry(0.125, 14, 14);
    [-1, 1].forEach((side) => {
      for (let i = 0; i < 4; i++) {
        const t = i / 3;
        const eye = new THREE.Mesh(eyeGeo, eyeGlowMat);
        eye.position.set(
          side * (1.35 - t * 0.42),
          bodyY + 0.18 - t * 0.04,
          1.25 + t * 1.15
        );
        enemy.add(eye);
      }

      for (let j = 0; j < 3; j++) {
        const underEye = new THREE.Mesh(eyeGeo, eyeGlowMat);
        underEye.position.set(side * 1.72, bodyY - 0.24, 0.7 - j * 0.7);
        enemy.add(underEye);
      }
    });

    const eyeLight = new THREE.PointLight(0x00e5ff, 2.2, 14);
    eyeLight.position.set(0, bodyY + 0.3, 2.7);
    enemy.add(eyeLight);

    const legs = [
      { side: -1, z: 1.15, outX: 1.55, fwdZ: 0.85, kneeY: 0.9 },
      { side: 1, z: 1.15, outX: 1.55, fwdZ: 0.85, kneeY: 0.9 },
      { side: -1, z: 0.0, outX: 1.75, fwdZ: 0.0, kneeY: 1.0 },
      { side: 1, z: 0.0, outX: 1.75, fwdZ: 0.0, kneeY: 1.0 },
      { side: -1, z: -1.15, outX: 1.55, fwdZ: -0.85, kneeY: 0.9 },
      { side: 1, z: -1.15, outX: 1.55, fwdZ: -0.85, kneeY: 0.9 }
    ];

    const crabLegs = [];
    legs.forEach((leg, li) => {
      const s = leg.side;
      const hip = new THREE.Vector3(s * 1.52, bodyY - 0.18, leg.z);
      const knee = new THREE.Vector3(s * (1.52 + leg.outX), bodyY + leg.kneeY, leg.z + leg.fwdZ);
      const foot = new THREE.Vector3(s * (1.52 + leg.outX + 0.65), -0.15, leg.z + leg.fwdZ * 1.3);

      const pivot = new THREE.Group();
      const inner = new THREE.Group();
      pivot.position.copy(hip);
      inner.position.copy(hip).negate();
      pivot.add(inner);
      enemy.add(pivot);
      crabLegs.push({ pivot, side: s, idx: li });

      const upperCurve = new THREE.CatmullRomCurve3([
        hip,
        hip.clone().lerp(knee, 0.5).add(new THREE.Vector3(s * 0.15, 0.28, 0)),
        knee
      ]);
      const upperMesh = new THREE.Mesh(new THREE.TubeGeometry(upperCurve, 14, 0.21, 10, false), shellMat);
      upperMesh.castShadow = true;
      inner.add(upperMesh);

      const kneeJoint = new THREE.Mesh(new THREE.SphereGeometry(0.27, 14, 14), chitinMat);
      kneeJoint.position.copy(knee);
      inner.add(kneeJoint);

      const lowerVec = new THREE.Vector3().subVectors(foot, knee);
      const lowerMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.04, lowerVec.length(), 14),
        chitinMat
      );
      lowerMesh.position.copy(knee).addScaledVector(lowerVec, 0.5);
      lowerMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), lowerVec.clone().normalize());
      lowerMesh.castShadow = true;
      inner.add(lowerMesh);
    });

    enemy.userData.gait = 0;
    enemy.userData.update = function (t, dt = 0, speed = 0) {
      enemy.userData.gait += dt * speed * 0.9;
      const g = enemy.userData.gait;
      crabLegs.forEach((l) => {
        const row = Math.floor(l.idx / 2);
        const off = ((row + (l.side > 0 ? 1 : 0)) % 2) * Math.PI;
        const ph = g + off;
        l.pivot.rotation.y = -l.side * Math.sin(ph) * 0.26;
        l.pivot.rotation.z = l.side * Math.max(0, Math.cos(ph)) * 0.16;
      });
      enemy.userData.bobY = Math.abs(Math.sin(g)) * 0.06;
      enemy.userData.roll = Math.sin(g) * 0.025;
    };

    enemy.scale.setScalar(1.85);
    enemy.rotation.y = Math.PI;
    return enemy;
  }

  const enemy = createAlienCrabEnemy();
  const startX = 14;
  const startZ = -14;
  enemy.position.set(startX, getGroundHeight(startX, startZ), startZ);
  surfaceGroup.add(enemy);

  // 2. الوحش الثاني: روبوت فضائي
  function createSpaceDroneEnemy() {
    const drone = new THREE.Group();

    const bodyShellMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      roughness: 0.35,
      metalness: 0.72
    });

    const droneDarkMat = new THREE.MeshStandardMaterial({
      color: 0x18202c,
      roughness: 0.5,
      metalness: 0.82
    });

    const coreAmberMat = new THREE.MeshStandardMaterial({
      color: 0xffb347,
      emissive: 0xff6a00,
      emissiveIntensity: 3.0,
      roughness: 0.15
    });

    const ringPinkMat = new THREE.MeshStandardMaterial({
      color: 0xff77c8,
      emissive: 0xff2a9d,
      emissiveIntensity: 2.3,
      roughness: 0.2
    });

    const ringGoldMat = new THREE.MeshStandardMaterial({
      color: 0xffe066,
      emissive: 0xffb703,
      emissiveIntensity: 2.1,
      roughness: 0.2
    });

    const hullMesh = new THREE.Mesh(new THREE.SphereGeometry(1.15, 28, 22), bodyShellMat);
    hullMesh.scale.set(1.05, 0.96, 1.05);
    hullMesh.castShadow = true;
    drone.add(hullMesh);

    const upperCap = new THREE.Mesh(
      new THREE.SphereGeometry(1.18, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.42),
      droneDarkMat
    );
    upperCap.position.set(0, 0.05, -0.04);
    drone.add(upperCap);

    const outerRing = new THREE.Mesh(new THREE.TorusGeometry(0.92, 0.045, 14, 36), ringPinkMat);
    outerRing.position.set(0, 0.04, 0.88);
    outerRing.rotation.y = 0.22;
    drone.add(outerRing);

    const innerRing = new THREE.Mesh(new THREE.TorusGeometry(0.76, 0.035, 12, 32), ringGoldMat);
    innerRing.position.set(0, 0.04, 0.93);
    innerRing.rotation.y = 0.22;
    drone.add(innerRing);

    const eyeHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.62, 0.42, 24), droneDarkMat);
    eyeHousing.rotation.x = Math.PI / 2;
    eyeHousing.position.set(0, 0.02, 1.02);
    drone.add(eyeHousing);

    const eyeLens = new THREE.Mesh(new THREE.SphereGeometry(0.45, 20, 16), coreAmberMat);
    eyeLens.scale.set(1, 1, 0.55);
    eyeLens.position.set(0, 0.02, 1.16);
    drone.add(eyeLens);

    const nodePositions = [
      { pos: [0.0, 0.96, 0.85], mat: ringPinkMat, scale: 1.15 },
      { pos: [0.84, -0.35, 0.78], mat: ringPinkMat, scale: 1.0 },
      { pos: [-0.84, 0.25, 0.78], mat: ringGoldMat, scale: 0.9 }
    ];
    nodePositions.forEach((n) => {
      const node = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 14), n.mat);
      node.position.set(...n.pos);
      node.scale.setScalar(n.scale);
      drone.add(node);
    });

    const tentacles = [
      [
        new THREE.Vector3(-0.45, -0.85, 0.45),
        new THREE.Vector3(-0.72, -1.35, 0.62),
        new THREE.Vector3(-0.55, -1.78, 0.78)
      ],
      [
        new THREE.Vector3(0.0, -0.95, 0.35),
        new THREE.Vector3(-0.12, -1.48, 0.55),
        new THREE.Vector3(-0.28, -1.92, 0.72)
      ],
      [
        new THREE.Vector3(0.52, -0.85, 0.2),
        new THREE.Vector3(0.78, -1.35, 0.12),
        new THREE.Vector3(0.68, -1.78, -0.05)
      ]
    ];

    const dronePivots = [];
    tentacles.forEach((pts) => {
      const curve = new THREE.CatmullRomCurve3(pts);
      const pivot = new THREE.Group();
      const inner = new THREE.Group();
      pivot.position.copy(pts[0]);
      inner.position.copy(pts[0]).negate();
      pivot.add(inner);
      drone.add(pivot);
      dronePivots.push(pivot);
      const armMesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.085, 10, false), droneDarkMat);
      armMesh.castShadow = true;
      inner.add(armMesh);

      const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.16, 12), coreAmberMat);
      tip.position.copy(pts[2]);
      tip.rotation.x = 0.35;
      inner.add(tip);
    });

    const droneLight = new THREE.PointLight(0xff8800, 1.8, 10);
    droneLight.position.set(0, 0.1, 1.5);
    drone.add(droneLight);

    drone.userData.update = function (t) {
      outerRing.rotation.z = t * 1.4;
      innerRing.rotation.z = -t * 2.1;
      eyeLens.scale.z = 0.55 + Math.sin(t * 3) * 0.07;
      dronePivots.forEach((p, i) => {
        p.rotation.x = Math.sin(t * 2.2 + i * 1.3) * 0.18;
        p.rotation.z = Math.cos(t * 1.8 + i * 1.7) * 0.18;
      });
    };

    drone.scale.setScalar(0.95);
    return drone;
  }

  const droneEnemy = createSpaceDroneEnemy();
  const droneX = -10;
  const droneZ = -15;
  const droneBaseY = getGroundHeight(droneX, droneZ) + 5.2;
  droneEnemy.position.set(droneX, droneBaseY, droneZ);
  droneEnemy.lookAt(player.position.x, droneEnemy.position.y, player.position.z);
  surfaceGroup.add(droneEnemy);

  // 3. الوحش الثالث: الكائن الرمادي الممدود
  const stalkerEnemy = createGreyElongatedAlienMonster();
  const stalkerX = 4;
  const stalkerZ = -16;
  stalkerEnemy.userData.startX = stalkerX;
  stalkerEnemy.position.set(stalkerX, getGroundHeight(stalkerX, stalkerZ), stalkerZ);
  stalkerEnemy.lookAt(player.position.x, stalkerEnemy.position.y, player.position.z);
  surfaceGroup.add(stalkerEnemy);

  // 4. المخلوق الصغير الأول: خنفساء الغبار
  const scarabEnemy = createDustScarab();
  const scarabX = -4;
  const scarabZ = -9;
  scarabEnemy.position.set(scarabX, getGroundHeight(scarabX, scarabZ), scarabZ);
  scarabEnemy.lookAt(player.position.x, scarabEnemy.position.y, player.position.z);
  surfaceGroup.add(scarabEnemy);

  // 5. المخلوق الصغير الثاني: قنديل الأبواغ الطائر
  const jellyEnemy = createSporeJelly();
  const jellyX = 9;
  const jellyZ = -8;
  jellyEnemy.userData.baseY = getGroundHeight(jellyX, jellyZ) + 3.2;
  jellyEnemy.position.set(jellyX, jellyEnemy.userData.baseY, jellyZ);
  surfaceGroup.add(jellyEnemy);

  surfaceGroup.traverse((obj) => {
    if (obj.isMesh && obj.material) {
      if (obj.material.userData.origOpacity === undefined) {
        obj.material.userData.origOpacity = obj.material.opacity;
      }
      obj.material.transparent = true;
      obj.material.opacity = 0;
    }
  });

  function setSurfaceOpacity(factor) {
    const clamped = THREE.MathUtils.clamp(factor, 0, 1);
    surfaceGroup.traverse((obj) => {
      if (obj.isMesh && obj.material) {
        const baseOp = obj.material.userData.origOpacity ?? 1;
        obj.material.opacity = baseOp * clamped;
      }
    });
  }

  // ---------- دوريات طويلة بعيدة المدى ----------
  const patrols = [];

  function addPatrol(obj, points, speed, opts = {}) {
    const p = {
      obj,
      pts: points,
      speed,
      idx: 1,
      turn: opts.turn ?? 1.2,
      reach: opts.reach ?? 14,
      hover: opts.hover ?? 0,
      bankFactor: opts.bankFactor ?? 0,
      pitch: opts.pitch ?? 0,
      useBase: opts.useBase ?? false,
      heading: 0,
      turnRate: 0,
      bank: 0,
      y: obj.position.y,
      targetY: obj.position.y,
      nextG: 0
    };
    obj.rotation.order = "YXZ";
    obj.position.x = points[0][0];
    obj.position.z = points[0][1];
    p.heading = Math.atan2(points[1][0] - points[0][0], points[1][1] - points[0][1]);
    patrols.push(p);
  }

  addPatrol(enemy, [[14, -14], [180, -120], [320, 40], [140, 260], [-70, 130]], 6, { turn: 0.9, reach: 16 });
  addPatrol(stalkerEnemy, [[4, -16], [-100, -250], [220, -420], [380, -120], [150, 60]], 4, { turn: 0.8, reach: 16 });
  addPatrol(scarabEnemy, [[-4, -9], [-160, -60], [-300, 150], [-100, 300], [60, 120]], 8, { turn: 2.2, reach: 10 });
  addPatrol(droneEnemy, [[-10, -15], [-200, -300], [0, -520], [260, -260], [120, -30]], 10, { turn: 0.9, reach: 20, hover: 6, bankFactor: 0.45, pitch: 0.1 });
  addPatrol(jellyEnemy, [[9, -8], [150, -200], [350, -300], [200, -50], [60, 100]], 4, { turn: 0.5, reach: 18, hover: 4.5, bankFactor: 0.25, useBase: true });

  let lastT = null;
const rn=document.getElementById("rn")
rn.addEventListener("click",
  function (){
    if (nearRock) nearRock.visible = false;
    alert("تم التقاط")
  }
)
  function stepPatrols(t, dt) {
    patrols.forEach((p) => {
      const o = p.obj;
      const tgt = p.pts[p.idx];
      const dx = tgt[0] - o.position.x;
      const dz = tgt[1] - o.position.z;
      if (Math.hypot(dx, dz) < p.reach) p.idx = (p.idx + 1) % p.pts.length;

      const want = Math.atan2(dx, dz);
      const diff = Math.atan2(Math.sin(want - p.heading), Math.cos(want - p.heading));
      const dh = THREE.MathUtils.clamp(diff, -p.turn * dt, p.turn * dt);
      p.heading += dh;
      p.turnRate = dt > 0 ? dh / dt : 0;

      o.position.x += Math.sin(p.heading) * p.speed * dt;
      o.position.z += Math.cos(p.heading) * p.speed * dt;

      if (t >= p.nextG) {
        p.targetY = getGroundHeight(o.position.x, o.position.z) + p.hover;
        p.nextG = t + 0.1;
      }
      p.y += (p.targetY - p.y) * Math.min(1, dt * (p.hover > 0 ? 1.2 : 6));

      if (o.userData.update) o.userData.update(t, dt, p.speed);

      if (p.useBase) {
        o.userData.baseY = p.y;
      } else {
        o.position.y = p.y + (o.userData.bobY || 0) + (p.hover > 0 ? Math.sin(t * 2.0) * 0.25 : 0);
      }

      p.bank += (-p.turnRate * p.bankFactor - p.bank) * Math.min(1, dt * 4);
      o.rotation.y = p.heading;
      o.rotation.x = p.pitch;
      o.rotation.z = (o.userData.roll || 0) + p.bank;
    });
  }
let nearRock = null;
  function updateCreatures(t, isPlayerMoving = false) {
    if (player.userData.update) {
      player.userData.update(t, isPlayerMoving);
      const pwa = player.position.distanceTo(rami.position);

nearRock = null;
for (const r of rocks) {
  if (r.visible && player.position.distanceTo(r.position) < 4) {
    nearRock = r;
    break;
  }
}
rn.style.display = nearRock ? "flex" : "none";
}  

  


    const dt = lastT === null ? 0 : THREE.MathUtils.clamp(t - lastT, 0, 0.1);
    lastT = t;
    stepPatrols(t, dt);
  }

  surfaceGroup.visible = false;
  scene.add(surfaceGroup);

  return {
    surfaceGroup,
    player,
    enemy,
    droneEnemy,
    stalkerEnemy,
    scarabEnemy,
    jellyEnemy,
    setSurfaceOpacity,
    updateCreatures,
    getGroundHeight
  };
}
