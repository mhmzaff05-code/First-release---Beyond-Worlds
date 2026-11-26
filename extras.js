// ============================================================
//  extras.js — إضافات فقط (لا يغيّر ولا يحذف أي شيء من ملفاتك)
//  1) إصلاح إضاءة الكوكب الثاني   2) سطح مريخ أكثر واقعية
//  3) تصادمات   4) شاشة التحميل   5) نظام مهام + أشياء مخبأة
//  6) تحسينات رسومية (سماء، ضباب، غبار، نجوم، ظلال تحت الشخصية)
// ============================================================

// ------------------------------------------------------------
//  قيم المهام: عدّلها كما تشاء (أضف/احذف أسطرًا أو غيّر الأرقام)
//  الأنواع: land / walk / rock / find / monster / return /
//           takeoff / fly / moon / trees / all
// ------------------------------------------------------------
export const MISSIONS = [
  { id: "m_land1", text: "اهبط على المريخ", type: "land", planet: 1 },
  { id: "m_walk1", text: "استكشف أرض المريخ (امشِ 150 م)", type: "walk", planet: 1, target: 150 },
  { id: "m_rock", text: "التقط 3 حجارة من المريخ", type: "rock", target: 3 },
  { id: "m_crystal", text: "ابحث عن البلورة الزرقاء", type: "find", item: "crystal" },
  { id: "m_crate", text: "ابحث عن صندوق الإمدادات", type: "find", item: "crate" },
  { id: "m_wreck", text: "ابحث عن قطعة المركبة المحطمة", type: "find", item: "wreck" },
  { id: "m_fossil", text: "ابحث عن الحفرية القديمة", type: "find", item: "fossil" },
  { id: "m_monster", text: "اقترب من كائن غريب على المريخ", type: "monster" },
  { id: "m_return", text: "عد إلى مركبتك", type: "return" },
  { id: "m_takeoff", text: "حلّق من الكوكب إلى الفضاء", type: "takeoff" },
  { id: "m_fly", text: "حلّق في الفضاء مسافة 300 وحدة", type: "fly", target: 300 },
  { id: "m_moon", text: "اقترب من القمر", type: "moon" },
  { id: "m_land2", text: "اهبط على الكوكب الأخضر", type: "land", planet: 2 },
  { id: "m_walk2", text: "استكشف الأرض الخضراء (امشِ 150 م)", type: "walk", planet: 2, target: 150 },
  { id: "m_flower", text: "ابحث عن الزهرة النادرة المتوهجة", type: "find", item: "flower" },
  { id: "m_mushroom", text: "ابحث عن الفطر المتوهج", type: "find", item: "mushroom" },
  { id: "m_fruit", text: "ابحث عن الثمرة الذهبية", type: "find", item: "fruit" },
  { id: "m_key", text: "ابحث عن المفتاح القديم", type: "find", item: "key" },
  { id: "m_trees", text: "قف بجانب الأشجار الأربعة (سنديانة، تنوب، بتولة، قيقب)", type: "trees", target: 4 },
  { id: "m_all", text: "اعثر على كل الأشياء المخبأة (8)", type: "all" }
];

// الأشياء المخبأة (planet: 1 مريخ، 2 الكوكب الأخضر) — غيّر الأماكن كما تشاء
export const ITEMS = [
  { id: "crystal", planet: 1, x: -120, z: 95, name: "البلورة الزرقاء" },
  { id: "crate", planet: 1, x: 140, z: 70, name: "صندوق الإمدادات" },
  { id: "wreck", planet: 1, x: 60, z: -170, name: "قطعة المركبة المحطمة" },
  { id: "fossil", planet: 1, x: -70, z: -130, name: "الحفرية القديمة" },
  { id: "flower", planet: 2, x: -95, z: -60, name: "الزهرة النادرة" },
  { id: "mushroom", planet: 2, x: 80, z: -140, name: "الفطر المتوهج" },
  { id: "fruit", planet: 2, x: 150, z: 90, name: "الثمرة الذهبية" },
  { id: "key", planet: 2, x: -140, z: 160, name: "المفتاح القديم" }
];

export function initExtras(ctx) {
  const {
    THREE, scene, camera, renderer, stars, planet, planet2,
    moonplanet, chip, marsSurface, forestSurface, getState
  } = ctx;

  const clamp = THREE.MathUtils.clamp;
  const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

  function mkRng(seed) {
    let s = seed >>> 0;
    return function () {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }
  const rand = mkRng(20260);

  function canvasTex(w, h, paint, srgb = true) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    paint(c.getContext("2d"), w, h);
    const t = new THREE.CanvasTexture(c);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  const glowTex = canvasTex(128, 128, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    gr.addColorStop(0, "rgba(255,255,255,1)");
    gr.addColorStop(0.25, "rgba(255,255,255,0.45)");
    gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
  });

  // ضجيج بسيط
  function hash(ix, iy) {
    const h = Math.sin(ix * 127.1 + iy * 311.7) * 43758.5453;
    return h - Math.floor(h);
  }
  function vn(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    const top = a + (b - a) * u;
    const bot = c + (d - c) * u;
    return top + (bot - top) * v;
  }
  function fbm(x, y, oct) {
    let f = 0, a = 0.5, q = 1;
    for (let i = 0; i < oct; i++) {
      f += a * vn(x * q, y * q);
      a *= 0.5;
      q *= 2.07;
    }
    return f;
  }

  // ==========================================================
  //  1) إصلاح الكوكب الثاني: كان اللون الأخضر مضروبًا في نسيج المريخ البني
  //     فيظهر داكنًا. نضع له نسيجًا أخضر خاصًا + ضوء يصله (الشكل لا يتغير)
  // ==========================================================
  const greenTex = canvasTex(1024, 512, (g, w, h) => {
    g.fillStyle = "#3f9a52";
    g.fillRect(0, 0, w, h);
    const cols = ["#2a7a3c", "#63bf6a", "#1f6a8a", "#8fd16a", "#d6cf9a", "#2f8f78"];
    const r = mkRng(77);
    for (let i = 0; i < 900; i++) {
      const x = r() * w, y = r() * h, rad = 10 + r() * 60;
      const col = cols[Math.floor(r() * cols.length)];
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, col + "99");
      gr.addColorStop(1, col + "00");
      g.fillStyle = gr;
      g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
  });
  planet2.material.map = greenTex;
  planet2.material.bumpMap = greenTex;
  planet2.material.bumpScale = 0.5;
  planet2.material.color.set(0xffffff);
  planet2.material.emissive = new THREE.Color(0x0b3d1c);
  planet2.material.emissiveIntensity = 0.35;
  planet2.material.needsUpdate = true;

  const planet2Light = new THREE.PointLight(0xfff0dd, 38, 100, 1);
  scene.add(planet2Light);
  const planet2LightOffset = V3(-22, 6, 8);

  // ==========================================================
  //  2) سطح مريخ أكثر واقعية: تضاريس ناعمة وفوهات + ألوان + نسيج تفصيلي + حصى
  // ==========================================================
  const marsGroup = marsSurface.surfaceGroup;
  const marsRocks = [];
  marsGroup.children.forEach((o) => {
    if (o.isMesh && !o.isInstancedMesh && o.geometry && o.geometry.type === "IcosahedronGeometry") {
      marsRocks.push({ mesh: o, r: 0.78 * Math.max(o.scale.x, o.scale.z) });
    }
  });

  let marsH = null;
  const MS = 51;
  const MCELL = 30;
  const MHALF = 750;

  function marsHAt(x, z) {
    if (!marsH) return 0;
    const u = (x + MHALF) / MCELL, v = (z + MHALF) / MCELL;
    const ix = Math.max(0, Math.min(49, Math.floor(u)));
    const iy = Math.max(0, Math.min(49, Math.floor(v)));
    const fx = Math.max(0, Math.min(1, u - ix));
    const fy = Math.max(0, Math.min(1, v - iy));
    const a = marsH[iy * MS + ix];
    const b = marsH[(iy + 1) * MS + ix];
    const c = marsH[(iy + 1) * MS + ix + 1];
    const d = marsH[iy * MS + ix + 1];
    if (fx + fy <= 1) return a + fx * (d - a) + fy * (b - a);
    return c + (1 - fx) * (b - c) + (1 - fy) * (d - c);
  }

  try {
    const ground = marsGroup.children[0];
    if (ground && ground.geometry && ground.geometry.type === "PlaneGeometry" &&
        ground.geometry.attributes.position.count === MS * MS) {
      const geo = ground.geometry;
      const pos = geo.attributes.position;
      const rc = mkRng(555);
      const craters = [];
      for (let i = 0; i < 16; i++) {
        const ang = rc() * 6.283;
        const dist = 140 + rc() * 520;
        craters.push({ x: Math.cos(ang) * dist, z: Math.sin(ang) * dist, r: 45 + rc() * 75, d: 4 + rc() * 6 });
      }
      function H(wx, wz) {
        let h = (fbm(wx / 260 + 11, wz / 260 + 7, 3) - 0.5) * 14;
        h += (vn(wx / 110 + 3, wz / 110 + 9) - 0.5) * 5;
        h += Math.sin(wx * 0.011 + wz * 0.017 + fbm(wx / 180, wz / 180, 2) * 4) * 1.4;
        for (const c of craters) {
          const d = Math.hypot(wx - c.x, wz - c.z) / c.r;
          if (d < 1.4) {
            if (d < 1) h -= c.d * (1 - d * d);
            h += c.d * 0.4 * Math.exp(-Math.pow((d - 1.05) / 0.2, 2));
          }
        }
        return h;
      }
      marsH = new Float32Array(pos.count);
      const col = new Float32Array(pos.count * 3);
      for (let i = 0; i < pos.count; i++) {
        const wx = pos.getX(i);
        const wz = -pos.getY(i);
        const h = H(wx, wz) + rc() * 0.15;
        pos.setZ(i, h);
        marsH[i] = h;
        let shade = 0.82 + 0.32 * fbm(wx / 40 + 5, wz / 40 + 5, 2);
        if (fbm(wx / 150 + 50, wz / 150 + 20, 2) > 0.62) shade *= 0.72;
        const tone = fbm(wx / 90 + 90, wz / 90, 2) - 0.5;
        col[i * 3] = shade * (1.04 + tone * 0.12);
        col[i * 3 + 1] = shade * (0.96 + tone * 0.1);
        col[i * 3 + 2] = shade * (0.9 - tone * 0.06);
      }
      pos.needsUpdate = true;
      geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
      geo.computeVertexNormals();
      geo.computeBoundingSphere();
      geo.computeBoundingBox();

      const detail = canvasTex(512, 512, (g, w, h) => {
        g.fillStyle = "#e6d8cc";
        g.fillRect(0, 0, w, h);
        const r = mkRng(31);
        for (let i = 0; i < 9000; i++) {
          const v = 150 + Math.floor(r() * 105);
          g.fillStyle = `rgba(${v},${v - 18},${v - 34},0.35)`;
          g.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 2);
        }
        g.lineWidth = 1;
        for (let i = 0; i < 260; i++) {
          const x = r() * w, y = r() * h;
          g.strokeStyle = r() > 0.5 ? "rgba(255,230,205,0.18)" : "rgba(70,34,22,0.22)";
          g.beginPath();
          g.moveTo(x, y);
          g.lineTo(x + 20 + r() * 50, y + (r() - 0.5) * 8);
          g.stroke();
        }
      });
      detail.wrapS = THREE.RepeatWrapping;
      detail.wrapT = THREE.RepeatWrapping;
      detail.repeat.set(130, 130);
      detail.anisotropy = 8;
      ground.material.map = detail;
      ground.material.bumpMap = detail;
      ground.material.bumpScale = 1.4;
      ground.material.vertexColors = true;
      ground.material.roughness = 1;
      ground.material.needsUpdate = true;

      // إعادة استقرار الحجارة على الأرض الجديدة
      marsRocks.forEach((rk) => {
        const m = rk.mesh;
        const x = m.position.x, z = m.position.z;
        const base = Math.min(marsHAt(x, z), marsHAt(x + 0.6, z), marsHAt(x - 0.6, z), marsHAt(x, z + 0.6), marsHAt(x, z - 0.6));
        m.position.y = base + 0.3 * m.scale.y;
      });

      // حصى صغير متناثر
      const pebGeo = new THREE.IcosahedronGeometry(0.16, 0);
      const pebMat = new THREE.MeshStandardMaterial({ color: 0x8f4f33, roughness: 1, flatShading: true });
      pebMat.transparent = true;
      pebMat.userData.origOpacity = 1;
      const PEB = 2600;
      const peb = new THREE.InstancedMesh(pebGeo, pebMat, PEB);
      const dm = new THREE.Object3D();
      const pc = new THREE.Color();
      for (let i = 0; i < PEB; i++) {
        const x = (rc() - 0.5) * 840;
        const z = (rc() - 0.5) * 840;
        const s = 0.5 + rc() * 1.9;
        dm.position.set(x, marsHAt(x, z) + 0.04, z);
        dm.rotation.set(rc() * 3, rc() * 6, rc() * 3);
        dm.scale.set(s, s * (0.5 + rc() * 0.5), s * (0.8 + rc() * 0.5));
        dm.updateMatrix();
        peb.setMatrixAt(i, dm.matrix);
        const k = 0.6 + rc() * 0.6;
        pc.setRGB(k, k * 0.85, k * 0.75);
        peb.setColorAt(i, pc);
      }
      peb.instanceMatrix.needsUpdate = true;
      peb.instanceColor.needsUpdate = true;
      marsGroup.add(peb);
    }
  } catch (e) {
    console.error("extras mars terrain:", e);
  }

  // ==========================================================
  //  6) الجو: قبة سماء، ضباب، شمس، جبال بعيدة، غبار، تلاشي
  // ==========================================================
  scene.fog = new THREE.FogExp2(0x000000, 0);

  const ENV = {
    1: {
      top: new THREE.Color("#6f5a63"), mid: new THREE.Color("#b98a6c"), hor: new THREE.Color("#d8a273"),
      fog: new THREE.Color("#c69368"), density: 0.0018, sun: new THREE.Color("#fff0d0"), sunSize: 70,
      vig: "radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(40,12,0,0.55) 100%)"
    },
    2: {
      top: new THREE.Color("#2f6fb5"), mid: new THREE.Color("#7fb2dc"), hor: new THREE.Color("#cfe6ef"),
      fog: new THREE.Color("#bcd7df"), density: 0.0026, sun: new THREE.Color("#fff6d8"), sunSize: 120,
      vig: "radial-gradient(ellipse at center, rgba(0,0,0,0) 58%, rgba(0,22,8,0.5) 100%)"
    }
  };

  const skyU = {
    uTop: { value: new THREE.Color() },
    uMid: { value: new THREE.Color() },
    uHor: { value: new THREE.Color() },
    uBg: { value: scene.background && scene.background.isColor ? scene.background : new THREE.Color(0x000000) },
    uF: { value: 0 }
  };
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(900, 32, 20),
    new THREE.ShaderMaterial({
      uniforms: skyU,
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,
      vertexShader: "varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
      fragmentShader:
        "uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uHor; uniform vec3 uBg; uniform float uF; varying vec3 vDir;" +
        "void main(){ float h = clamp(vDir.y, -0.1, 1.0);" +
        " vec3 sky = mix(uHor, uMid, smoothstep(0.0, 0.22, h));" +
        " sky = mix(sky, uTop, smoothstep(0.18, 0.85, h));" +
        " gl_FragColor = vec4(mix(uBg, sky, uF), 1.0);" +
        " #include <colorspace_fragment>\n }"
    })
  );
  dome.renderOrder = -10;
  dome.frustumCulled = false;
  dome.visible = false;
  scene.add(dome);

  const sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false
  }));
  sunSprite.visible = false;
  scene.add(sunSprite);
  const sunDir = V3(0.4, 0.8, 0.4).normalize();

  // جبال/تلال بعيدة على الأفق
  function makeRing(radius, hMin, hMax, cBot, cTop, seed) {
    const N = 240;
    const P = [], C = [], I = [];
    const cb = new THREE.Color(cBot), ct = new THREE.Color(cTop);
    for (let k = 0; k <= N; k++) {
      const ang = (k / N) * Math.PI * 2;
      const hh = hMin + (hMax - hMin) * (0.65 * fbm(k * 0.06 + seed, seed, 3) + 0.35 * hash(k, seed));
      P.push(Math.cos(ang) * radius, -25, Math.sin(ang) * radius);
      C.push(cb.r, cb.g, cb.b);
      P.push(Math.cos(ang) * radius * 0.97, hh, Math.sin(ang) * radius * 0.97);
      C.push(ct.r, ct.g, ct.b);
      if (k < N) {
        const a = k * 2;
        I.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(C, 3));
    g.setIndex(I);
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({
      vertexColors: true, side: THREE.DoubleSide, transparent: true, opacity: 0, fog: true
    }));
    m.frustumCulled = false;
    m.visible = false;
    scene.add(m);
    return m;
  }
  const marsRing = makeRing(810, 25, 95, "#5a3022", "#8a5238", 3.3);
  const forestRing = makeRing(470, 20, 70, "#1f4a2c", "#4a7d52", 7.7);

  // غبار المريخ + أبواغ وحشرات متوهجة في الغابة
  function makeMotes(n, color, size, additive) {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(n * 3);
    const vel = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (rand() - 0.5) * 80;
      pos[i * 3 + 1] = rand() * 16;
      pos[i * 3 + 2] = (rand() - 0.5) * 80;
      vel[i * 3] = (rand() - 0.5) * 0.8;
      vel[i * 3 + 1] = (rand() - 0.5) * 0.5;
      vel[i * 3 + 2] = (rand() - 0.5) * 0.8;
    }
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color, size, map: glowTex, transparent: true, opacity: 0, depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, sizeAttenuation: true
    });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    pts.visible = false;
    scene.add(pts);
    return { pts, pos, vel, n, mat, geo };
  }
  const marsDust = makeMotes(320, 0xe0a070, 0.5, false);
  const forestMotes = makeMotes(220, 0xeaf59a, 0.3, true);
  const fireflies = makeMotes(45, 0xbfff7a, 0.7, true);

  function moveMotes(m, dt, cx, cy, cz, wx, wy, wz) {
    const R = 40, H = 18;
    for (let i = 0; i < m.n; i++) {
      const k = i * 3;
      let x = m.pos[k] + (m.vel[k] + wx) * dt;
      let y = m.pos[k + 1] + (m.vel[k + 1] + wy) * dt;
      let z = m.pos[k + 2] + (m.vel[k + 2] + wz) * dt;
      x = cx + ((((x - cx + R) % (2 * R)) + 2 * R) % (2 * R)) - R;
      z = cz + ((((z - cz + R) % (2 * R)) + 2 * R) % (2 * R)) - R;
      y = (cy - 6) + ((((y - (cy - 6)) % H) + H) % H);
      m.pos[k] = x;
      m.pos[k + 1] = y;
      m.pos[k + 2] = z;
    }
    m.geo.attributes.position.needsUpdate = true;
  }

  // تظليل ناعم تحت الشخصية والمركبة
  const blobTex = canvasTex(128, 128, (g, w, h) => {
    const gr = g.createRadialGradient(64, 64, 4, 64, 64, 64);
    gr.addColorStop(0, "rgba(0,0,0,0.6)");
    gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
  }, false);
  function makeBlob(size) {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(size, size),
      new THREE.MeshBasicMaterial({
        map: blobTex, transparent: true, depthWrite: false, fog: false,
        polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2
      })
    );
    m.rotation.x = -Math.PI / 2;
    m.visible = false;
    scene.add(m);
    return m;
  }
  const playerBlob = makeBlob(1.8);
  const shipBlob = makeBlob(9);

  // تعتيم الأطراف (Vignette)
  const vig = document.createElement("div");
  vig.id = "fxVignette";
  vig.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:5;opacity:0;transition:opacity .8s;";
  document.body.appendChild(vig);

  // ==========================================================
  //  الفضاء: نجوم ملونة، سدم، شهب
  // ==========================================================
  const sp = new THREE.Group();
  scene.add(sp);
  (function () {
    const N = 1300;
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    const pal = [[1, 1, 1], [0.7, 0.8, 1], [1, 0.92, 0.7], [1, 0.7, 0.55], [0.8, 0.7, 1]];
    for (let i = 0; i < N; i++) {
      const u = rand() * 2 - 1, a = rand() * 6.283, s = Math.sqrt(1 - u * u);
      const R = 420 + rand() * 40;
      pos[i * 3] = Math.cos(a) * s * R;
      pos[i * 3 + 1] = u * R;
      pos[i * 3 + 2] = Math.sin(a) * s * R;
      const c = pal[Math.floor(rand() * pal.length)];
      const k = 0.5 + rand() * 0.5;
      col[i * 3] = c[0] * k; col[i * 3 + 1] = c[1] * k; col[i * 3 + 2] = c[2] * k;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const m = new THREE.PointsMaterial({
      size: 1.3, vertexColors: true, transparent: true, opacity: 1, depthWrite: false, sizeAttenuation: true
    });
    const p = new THREE.Points(g, m);
    p.frustumCulled = false;
    sp.add(p);
    sp.userData.stars = p;
  })();
  const nebulae = [];
  [[0.85, 0.25, 0.45, 0x6a3cc8], [-0.7, 0.35, -0.6, 0x2a7fd6], [0.1, -0.5, -0.85, 0xc83c7a], [-0.5, -0.2, 0.8, 0x1fb8a8], [0.6, 0.6, -0.5, 0x8a5ae0]]
    .forEach((n) => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTex, color: n[3], blending: THREE.AdditiveBlending, transparent: true,
        opacity: 0.18, depthWrite: false, fog: false
      }));
      const d = V3(n[0], n[1], n[2]).normalize().multiplyScalar(430);
      s.position.copy(d);
      s.scale.set(380, 220, 1);
      sp.add(s);
      nebulae.push(s);
    });
  const shooters = [];
  for (let i = 0; i < 3; i++) {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0], 3));
    const l = new THREE.Line(g, new THREE.LineBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false
    }));
    l.frustumCulled = false;
    sp.add(l);
    shooters.push({ line: l, life: 0, wait: 2 + rand() * 6, p: V3(), d: V3() });
  }

  // ==========================================================
  //  5) الأشياء المخبأة
  // ==========================================================
  const KEY = "marsMissions_v1";
  let M = { done: {}, prog: {}, found: {}, sets: {} };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const o = JSON.parse(raw);
      M = Object.assign(M, o);
      ["done", "prog", "found", "sets"].forEach((k) => { if (!M[k]) M[k] = {}; });
    }
  } catch (e) { /* التخزين غير متاح */ }
  function saveM() {
    try { localStorage.setItem(KEY, JSON.stringify(M)); } catch (e) { /* تجاهل */ }
  }

  function stdMat(o) {
    const m = new THREE.MeshStandardMaterial(o);
    m.transparent = true;
    m.userData.origOpacity = 1;
    return m;
  }
  function mesh(geo, mat, x = 0, y = 0, z = 0) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    return m;
  }

  const BUILD = {
    crystal() {
      const g = new THREE.Group();
      const m = stdMat({ color: 0x66d8ff, emissive: 0x1aa6ff, emissiveIntensity: 1.6, roughness: 0.15, metalness: 0.2, flatShading: true });
      const rk = mesh(new THREE.IcosahedronGeometry(0.7, 0), stdMat({ color: 0x4a2a20, roughness: 1, flatShading: true }), 0, 0.15, 0);
      rk.scale.set(1.2, 0.5, 1.1);
      g.add(rk);
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * 6.283, h = 0.8 + rand() * 0.9;
        const c = mesh(new THREE.ConeGeometry(0.2 + rand() * 0.12, h, 6), m, Math.cos(a) * 0.3, 0.2 + h / 2, Math.sin(a) * 0.3);
        c.rotation.z = Math.cos(a) * 0.35;
        c.rotation.x = -Math.sin(a) * 0.35;
        g.add(c);
      }
      return { g, color: 0x4fc8ff, lift: 0, spin: 0.6, bob: 0 };
    },
    crate() {
      const g = new THREE.Group();
      g.add(mesh(new THREE.BoxGeometry(1.1, 0.75, 0.8), stdMat({ color: 0x4b5563, roughness: 0.5, metalness: 0.6 }), 0, 0.38, 0));
      const yel = stdMat({ color: 0xe0a800, roughness: 0.5, metalness: 0.3 });
      g.add(mesh(new THREE.BoxGeometry(1.14, 0.12, 0.84), yel, 0, 0.6, 0));
      g.add(mesh(new THREE.BoxGeometry(1.14, 0.12, 0.84), yel, 0, 0.16, 0));
      g.add(mesh(new THREE.SphereGeometry(0.05, 8, 8), stdMat({ color: 0x66ff99, emissive: 0x22dd66, emissiveIntensity: 2.4 }), 0.4, 0.5, 0.42));
      return { g, color: 0xffd23f, lift: 0, spin: 0, bob: 0 };
    },
    wreck() {
      const g = new THREE.Group();
      const hull = stdMat({ color: 0x6b6f78, roughness: 0.6, metalness: 0.6 });
      const burnt = stdMat({ color: 0x2a2a2e, roughness: 0.8, metalness: 0.3 });
      const pl = mesh(new THREE.BoxGeometry(2.2, 0.12, 1.3), hull, 0, 0.55, 0);
      pl.rotation.z = 0.35; pl.rotation.x = 0.15;
      g.add(pl);
      const cy = mesh(new THREE.CylinderGeometry(0.4, 0.45, 1.6, 14), burnt, 0.7, 0.4, 0.5);
      cy.rotation.z = Math.PI / 2 - 0.2;
      g.add(cy);
      const an = mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.6, 6), hull, -0.7, 1.1, -0.2);
      an.rotation.z = 0.5;
      g.add(an);
      g.add(mesh(new THREE.SphereGeometry(0.08, 8, 8), stdMat({ color: 0xff6a00, emissive: 0xff4400, emissiveIntensity: 2.4 }), -0.2, 0.75, 0.2));
      return { g, color: 0xff7a22, lift: 0, spin: 0, bob: 0 };
    },
    fossil() {
      const g = new THREE.Group();
      const pts = [];
      for (let i = 0; i < 26; i++) {
        const t = i / 25, a = t * 9, r = 0.1 + t * 0.7;
        pts.push(V3(Math.cos(a) * r, 0.12 + t * 0.05, Math.sin(a) * r));
      }
      const tube = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.12, 8, false),
        stdMat({ color: 0xe8dcc0, roughness: 0.8 }));
      g.add(tube);
      g.add(mesh(new THREE.IcosahedronGeometry(0.5, 0), stdMat({ color: 0x5a3326, roughness: 1, flatShading: true }), 0, 0, 0)).scale.set(1.6, 0.3, 1.6);
      return { g, color: 0xfff0c0, lift: 0, spin: 0, bob: 0 };
    },
    flower() {
      const g = new THREE.Group();
      const stem = new THREE.CatmullRomCurve3([V3(0, 0, 0), V3(0.1, 0.5, 0), V3(0.05, 1.0, 0.05)]);
      g.add(mesh(new THREE.TubeGeometry(stem, 12, 0.04, 6, false), stdMat({ color: 0x2f7a2a, roughness: 0.8 })));
      const pm = stdMat({ color: 0xff7ad0, emissive: 0xff3fb8, emissiveIntensity: 1.5, roughness: 0.4, side: THREE.DoubleSide });
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * 6.283;
        const p = mesh(new THREE.SphereGeometry(0.2, 10, 8), pm, 0.05 + Math.cos(a) * 0.22, 1.05, 0.05 + Math.sin(a) * 0.22);
        p.scale.set(1.3, 0.35, 0.7);
        p.rotation.y = -a;
        g.add(p);
      }
      g.add(mesh(new THREE.SphereGeometry(0.1, 10, 8), stdMat({ color: 0xffe266, emissive: 0xffc400, emissiveIntensity: 2 }), 0.05, 1.08, 0.05));
      const lf = stdMat({ color: 0x3f9a3a, roughness: 0.7, side: THREE.DoubleSide });
      [[0.25, 0.3, 0.5], [-0.25, 0.5, -0.5]].forEach((l) => {
        const m = mesh(new THREE.SphereGeometry(0.2, 8, 6), lf, l[0], l[1], 0);
        m.scale.set(1.5, 0.15, 0.7);
        m.rotation.z = l[2];
        g.add(m);
      });
      g.scale.setScalar(1.5);
      return { g, color: 0xff5ad0, lift: 0, spin: 0.3, bob: 0 };
    },
    mushroom() {
      const g = new THREE.Group();
      g.add(mesh(new THREE.CylinderGeometry(0.12, 0.2, 0.7, 12), stdMat({ color: 0xe9efe0, roughness: 0.7 }), 0, 0.35, 0));
      g.add(mesh(new THREE.SphereGeometry(0.6, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2),
        stdMat({ color: 0x2a9d8f, emissive: 0x1ee6c8, emissiveIntensity: 1.3, roughness: 0.4 }), 0, 0.7, 0));
      const sm = stdMat({ color: 0xffffff, emissive: 0xaaffee, emissiveIntensity: 1.8 });
      for (let k = 0; k < 7; k++) {
        const a = rand() * 6.283, r = 0.15 + rand() * 0.35;
        g.add(mesh(new THREE.SphereGeometry(0.06, 6, 6), sm, Math.cos(a) * r, 0.7 + Math.sqrt(Math.max(0, 0.36 - r * r)) * 0.95, Math.sin(a) * r));
      }
      g.scale.setScalar(1.4);
      return { g, color: 0x33ffd8, lift: 0, spin: 0, bob: 0 };
    },
    fruit() {
      const g = new THREE.Group();
      const lf = stdMat({ color: 0x3f9a3a, roughness: 0.7, side: THREE.DoubleSide });
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * 6.283;
        const l = mesh(new THREE.SphereGeometry(0.3, 8, 6), lf, Math.cos(a) * 0.4, 0.25, Math.sin(a) * 0.4);
        l.scale.set(1.5, 0.15, 0.8);
        l.rotation.y = -a;
        g.add(l);
      }
      g.add(mesh(new THREE.SphereGeometry(0.35, 18, 14), stdMat({ color: 0xffc83a, emissive: 0xffa000, emissiveIntensity: 1.2, roughness: 0.3, metalness: 0.3 }), 0, 0.6, 0));
      g.add(mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.2, 6), lf, 0, 1.0, 0));
      return { g, color: 0xffc83a, lift: 0, spin: 0.5, bob: 0 };
    },
    key() {
      const g = new THREE.Group();
      const gold = stdMat({ color: 0xffd24a, emissive: 0x6a4a00, emissiveIntensity: 0.9, roughness: 0.25, metalness: 0.9 });
      g.add(mesh(new THREE.TorusGeometry(0.28, 0.07, 8, 20), gold, 0, 0.6, 0));
      g.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.9, 8), gold, 0, 0.0, 0));
      g.add(mesh(new THREE.BoxGeometry(0.22, 0.08, 0.08), gold, 0.12, -0.3, 0));
      g.add(mesh(new THREE.BoxGeometry(0.16, 0.08, 0.08), gold, 0.1, -0.12, 0));
      g.scale.setScalar(1.3);
      return { g, color: 0xffd24a, lift: 1.4, spin: 1.2, bob: 0.15 };
    }
  };

  const itemObjs = [];
  const fxRoot = new THREE.Group();
  scene.add(fxRoot);

  ITEMS.forEach((it) => {
    try {
      const sf = it.planet === 1 ? marsSurface : forestSurface;
      const b = BUILD[it.id]();
      const gy = sf.getGroundHeight(it.x, it.z);
      b.g.position.set(it.x, gy + b.lift, it.z);
      b.g.rotation.y = rand() * 6.283;
      sf.surfaceGroup.add(b.g);

      const fx = new THREE.Group();
      fx.position.set(it.x, gy, it.z);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTex, color: b.color, blending: THREE.AdditiveBlending, transparent: true,
        opacity: 0, depthWrite: false, fog: false
      }));
      glow.scale.set(3.4, 3.4, 1);
      glow.position.y = 0.9 + b.lift;
      fx.add(glow);
      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, 60, 8, 1, true),
        new THREE.MeshBasicMaterial({
          color: b.color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending,
          depthWrite: false, fog: false, side: THREE.DoubleSide
        })
      );
      beam.position.y = 30;
      fx.add(beam);
      fx.visible = false;
      fxRoot.add(fx);

      const o = { cfg: it, build: b, group: b.g, fx, glow, beam, gy, found: !!M.found[it.id], t: rand() * 6 };
      if (o.found) { b.g.visible = false; }
      itemObjs.push(o);
    } catch (e) {
      console.error("extras item " + it.id + ":", e);
    }
  });

  // ==========================================================
  //  واجهة المهام
  // ==========================================================
  const st = document.createElement("style");
  st.textContent =
    "#mHud{position:fixed;top:8px;left:50%;transform:translateX(-50%);z-index:30;width:min(46vw,190px);direction:rtl;font:600 12px system-ui,sans-serif;color:#e6f6ff;background:rgba(8,16,34,.72);border:1px solid #38bdf8;border-radius:12px;padding:6px 10px;text-align:right;-webkit-user-select:none;user-select:none;touch-action:manipulation}" +
    "#mHud .mh{display:flex;justify-content:space-between;font-size:11px;opacity:.9}" +
    "#mHud .mc{margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:12px}" +
    "#mBar{height:3px;background:#1e293b;border-radius:2px;margin-top:4px;overflow:hidden}" +
    "#mBar i{display:block;height:100%;width:0;background:#38bdf8;transition:width .4s}" +
    "#mList{position:fixed;top:62px;left:50%;transform:translateX(-50%);z-index:35;width:min(88vw,340px);max-height:62vh;overflow:auto;direction:rtl;background:rgba(8,16,34,.94);border:1px solid #38bdf8;border-radius:14px;padding:8px 10px;display:none;font:13px system-ui,sans-serif;color:#e6f6ff}" +
    "#mList .it{display:flex;gap:8px;padding:6px 2px;border-bottom:1px solid rgba(56,189,248,.15)}" +
    "#mList .it.d{opacity:.5;text-decoration:line-through}" +
    "#mList .it span.h{margin-inline-start:auto;font-size:11px;color:#7dd3fc;white-space:nowrap}" +
    "#mToast{position:fixed;top:66px;left:50%;transform:translate(-50%,-12px);z-index:40;max-width:84vw;direction:rtl;background:rgba(2,132,199,.95);color:#fff;font:600 14px system-ui,sans-serif;padding:8px 14px;border-radius:12px;opacity:0;pointer-events:none;transition:opacity .3s,transform .3s;text-align:center}" +
    "#mToast.on{opacity:1;transform:translate(-50%,0)}";
  document.head.appendChild(st);

  const hud = document.createElement("div");
  hud.id = "mHud";
  hud.innerHTML = '<div class="mh"><span>المهام</span><span id="mCnt">0/0</span></div><div class="mc" id="mCur"></div><div id="mBar"><i></i></div>';
  document.body.appendChild(hud);
  const list = document.createElement("div");
  list.id = "mList";
  document.body.appendChild(list);
  const toastEl = document.createElement("div");
  toastEl.id = "mToast";
  document.body.appendChild(toastEl);
  hud.addEventListener("click", () => {
    list.style.display = list.style.display === "block" ? "none" : "block";
  });
  list.addEventListener("click", () => { list.style.display = "none"; });

  let toastTimer = 0;
  function toast(txt) {
    toastEl.textContent = txt;
    toastEl.classList.add("on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("on"), 2600);
  }
  function beep() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!beep.c) beep.c = new AC();
      const c = beep.c, o = c.createOscillator(), g = c.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(660, c.currentTime);
      o.frequency.linearRampToValueAtTime(990, c.currentTime + 0.15);
      g.gain.setValueAtTime(0.12, c.currentTime);
      g.gain.linearRampToValueAtTime(0, c.currentTime + 0.25);
      o.connect(g);
      g.connect(c.destination);
      o.start();
      o.stop(c.currentTime + 0.26);
    } catch (e) { /* تجاهل */ }
  }

  const PNAME = { 1: "المريخ", 2: "الكوكب الأخضر" };
  function missionLabel(m) {
    if (m.target && m.target > 1) {
      const n = m.type === "trees" ? (M.sets.trees ? M.sets.trees.length : 0) : Math.floor(M.prog[m.id] || 0);
      return m.text + " (" + Math.min(n, m.target) + "/" + m.target + ")";
    }
    return m.text;
  }
  function renderList() {
    let done = 0;
    let html = "";
    let cur = null;
    MISSIONS.forEach((m) => {
      const d = !!M.done[m.id];
      if (d) done++;
      else if (!cur) cur = m;
      let hint = "";
      if (!d && m.type === "find") {
        const it = ITEMS.find((x) => x.id === m.item);
        if (it) hint = '<span class="h" data-item="' + it.id + '">' + PNAME[it.planet] + "</span>";
      }
      html += '<div class="it' + (d ? " d" : "") + '"><b>' + (d ? "✔" : "•") + "</b><span>" + missionLabel(m) + "</span>" + hint + "</div>";
    });
    list.innerHTML = html;
    document.getElementById("mCnt").textContent = done + "/" + MISSIONS.length;
    document.getElementById("mCur").textContent = cur ? missionLabel(cur) : "🎉 أنهيت كل المهام";
    hud.querySelector("#mBar i").style.width = (MISSIONS.length ? (done / MISSIONS.length) * 100 : 0) + "%";
  }

  function finish(m) {
    if (M.done[m.id]) return;
    M.done[m.id] = true;
    saveM();
    renderList();
    beep();
    toast("✔ أنجزت: " + m.text);
    if (MISSIONS.every((x) => M.done[x.id])) setTimeout(() => toast("🎉 أنهيت كل المهام!"), 2800);
  }
  function report(type, o) {
    o = o || {};
    MISSIONS.forEach((m) => {
      if (M.done[m.id] || m.type !== type) return;
      if (m.planet && o.planet && m.planet !== o.planet) return;
      if (type === "find" && m.item !== o.item) return;
      if (type === "trees") {
        const arr = M.sets.trees || (M.sets.trees = []);
        if (o.tree && arr.indexOf(o.tree) < 0) { arr.push(o.tree); saveM(); }
        if (arr.length >= (m.target || 4)) finish(m); else dirty = true;
      } else if (m.target && m.target > 1) {
        M.prog[m.id] = (M.prog[m.id] || 0) + (o.n || 1);
        if (M.prog[m.id] >= m.target) finish(m); else dirty = true;
      } else {
        finish(m);
      }
    });
  }
  let dirty = false;
  renderList();

  // التقاط الأشياء (زر "التقط" الموجود أصلًا)
  function nearestItem(px, pz, pid) {
    let best = null, bd = 4;
    for (const o of itemObjs) {
      if (o.found || o.cfg.planet !== pid) continue;
      const d = Math.hypot(o.group.position.x - px, o.group.position.z - pz);
      if (d < bd) { bd = d; best = o; }
    }
    return best;
  }
  function pickItem(o) {
    o.found = true;
    o.group.visible = false;
    o.fx.visible = false;
    M.found[o.cfg.id] = true;
    saveM();
    toast("تم التقاط: " + o.cfg.name);
    beep();
    report("find", { item: o.cfg.id });
    if (ITEMS.every((x) => M.found[x.id])) report("all");
  }
  document.addEventListener("click", (e) => {
    const t = e.target;
    if (!t || !t.id) return;
    const s = getState();
    const pl = s.surface.player;
    const pid = s.surface === forestSurface ? 2 : 1;
    if (t.id === "rn") {
      const it = s.inSurface ? nearestItem(pl.position.x, pl.position.z, pid) : null;
      if (it) {
        e.stopPropagation();
        pickItem(it);
      } else if (s.inSurface && pid === 1) {
        for (const rk of marsRocks) {
          if (rk.mesh.visible && pl.position.distanceTo(rk.mesh.position) < 4) {
            report("rock");
            break;
          }
        }
      }
    } else if (t.id === "ksz") {
      report("return");
    }
  }, true);

  // ==========================================================
  //  4) شاشة التحميل: لا تختفي إلا بعد تجهيز اللعبة ورسم عدة إطارات
  // ==========================================================
  const loadEl = document.getElementById("loading");
  const loadTxt = document.getElementById("ldText");
  let loaded = !loadEl;
  let frames = 0;
  const t0 = performance.now();
  if (loadTxt) loadTxt.textContent = "جارٍ تجهيز العالم...";

  // ==========================================================
  //  الحلقة الإضافية: تعمل قبل كل رسم (دون تعديل حلقة main.js)
  // ==========================================================
  const tmpV = V3(), tmpM = V3(), tmpS = V3();
  const lastP = V3();
  let lastPInit = false;
  const lastShip = V3();
  let lastShipInit = false;
  let prevPP = false, prevTake = false;
  let last = performance.now();
  let time = 0;
  let hintT = 0;

  function boxPush(p, c, cosA, sinA, ox, hx, hz, r) {
    const dx = p.x - c.x, dz = p.z - c.z;
    const lx = dx * cosA - dz * sinA - ox;
    const lz = dx * sinA + dz * cosA;
    if (Math.abs(lx) < hx + r && Math.abs(lz) < hz + r) {
      const px = hx + r - Math.abs(lx), pz = hz + r - Math.abs(lz);
      let nx = lx, nz = lz;
      if (px < pz) nx = (lx >= 0 ? 1 : -1) * (hx + r);
      else nz = (lz >= 0 ? 1 : -1) * (hz + r);
      nx += ox;
      p.x = c.x + nx * cosA + nz * sinA;
      p.z = c.z - nx * sinA + nz * cosA;
      return true;
    }
    return false;
  }

  function step() {
    const now = performance.now();
    const dt = clamp((now - last) / 1000, 0, 0.1);
    last = now;
    time += dt;

    const s = getState();
    const f = clamp(s.b, 0, 1);
    const pid = s.surface === forestSurface ? 2 : 1;
    const surfaceOn = f > 0.02;
    const pl = s.surface.player;
    const inSpace = !s.a && !s.takingOff && !s.inSurface && !s.pp && s.b === 0;
    const E = ENV[pid];

    // ضوء الكوكب الثاني
    planet2Light.position.copy(planet2.position).add(planet2LightOffset);
    planet2Light.visible = planet2.visible;

    // ---- البيئة ----
    skyU.uTop.value.copy(E.top);
    skyU.uMid.value.copy(E.mid);
    skyU.uHor.value.copy(E.hor);
    skyU.uF.value = f;
    dome.visible = surfaceOn;
    dome.position.copy(camera.position);
    scene.fog.color.copy(E.fog);
    scene.fog.density = E.density * f * f;
    sunSprite.visible = surfaceOn;
    if (surfaceOn) {
      sunSprite.position.copy(camera.position).addScaledVector(sunDir, 800);
      sunSprite.material.color.copy(E.sun);
      sunSprite.material.opacity = 0.9 * f;
      sunSprite.scale.setScalar(E.sunSize * 8);
    }
    marsRing.visible = surfaceOn && pid === 1;
    forestRing.visible = surfaceOn && pid === 2;
    marsRing.material.opacity = f;
    forestRing.material.opacity = f;
    vig.style.opacity = surfaceOn && f > 0.9 ? "1" : "0";
    vig.style.background = E.vig;

    // غبار/أبواغ (حين نكون على الأرض)
    const landedView = surfaceOn && (s.inSurface || s.pp);
    marsDust.pts.visible = landedView && pid === 1;
    forestMotes.pts.visible = landedView && pid === 2;
    fireflies.pts.visible = landedView && pid === 2;
    const cp = camera.position;
    if (marsDust.pts.visible) {
      marsDust.mat.opacity = 0.45 * f;
      moveMotes(marsDust, dt, cp.x, cp.y, cp.z, 3.2, 0.1, 1.4);
    }
    if (forestMotes.pts.visible) {
      forestMotes.mat.opacity = 0.7 * f;
      moveMotes(forestMotes, dt, cp.x, cp.y, cp.z, 0.5, 0.25, 0.2);
      fireflies.mat.opacity = (0.55 + 0.45 * Math.sin(time * 3)) * f;
      moveMotes(fireflies, dt, cp.x, cp.y, cp.z, 0.2, 0.1, 0.1);
    }

    // ظل تحت الشخصية والمركبة
    playerBlob.visible = s.inSurface && f > 0.9;
    if (playerBlob.visible) {
      playerBlob.position.set(pl.position.x, pl.position.y + 0.06, pl.position.z);
    }
    shipBlob.visible = s.pp && !s.takingOff && f > 0.9;
    if (shipBlob.visible) {
      chip.localToWorld(tmpS.set(15, 0, 0));
      shipBlob.position.set(tmpS.x, s.surface.getGroundHeight(tmpS.x, tmpS.z) + 0.1, tmpS.z);
      shipBlob.rotation.z = chip.rotation.y;
    }

    // ---- الفضاء ----
    sp.position.copy(camera.position);
    const spaceOn = stars.visible && f < 0.98;
    sp.visible = spaceOn;
    if (spaceOn) {
      sp.userData.stars.material.opacity = 1 - f;
      nebulae.forEach((n) => { n.material.opacity = 0.18 * (1 - f); });
      shooters.forEach((sh) => {
        if (sh.life <= 0) {
          sh.wait -= dt;
          if (sh.wait <= 0) {
            sh.life = 0.9;
            const u = rand() * 2 - 1, a = rand() * 6.283, q = Math.sqrt(1 - u * u);
            sh.p.set(Math.cos(a) * q, u, Math.sin(a) * q).multiplyScalar(300);
            sh.d.set(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize().multiplyScalar(220);
            sh.wait = 4 + rand() * 7;
          }
          sh.line.material.opacity = 0;
        } else {
          sh.life -= dt;
          sh.p.addScaledVector(sh.d, dt);
          const arr = sh.line.geometry.attributes.position;
          arr.setXYZ(0, sh.p.x, sh.p.y, sh.p.z);
          arr.setXYZ(1, sh.p.x - sh.d.x * 0.18, sh.p.y - sh.d.y * 0.18, sh.p.z - sh.d.z * 0.18);
          arr.needsUpdate = true;
          sh.line.material.opacity = clamp(sh.life / 0.9, 0, 1) * (1 - f);
        }
      });
    }

    // ---- 3) التصادمات ----
    if (s.inSurface) {
      const p = pl.position;
      let moved = false;
      const R = 0.45;

      // المركبة
      chip.localToWorld(tmpS.set(15, 0, 0));
      const ca = Math.cos(chip.rotation.y), sa = Math.sin(chip.rotation.y);
      for (let pass = 0; pass < 2; pass++) {
        if (boxPush(p, tmpS, ca, sa, 0, 4.4, 1.05, R)) moved = true;
        if (boxPush(p, tmpS, ca, sa, 0.8, 2.3, 3.5, R)) moved = true;
      }

      if (pid === 1) {
        // حجارة المريخ
        for (const rk of marsRocks) {
          const m = rk.mesh;
          if (!m.visible) continue;
          const dx = p.x - m.position.x, dz = p.z - m.position.z;
          const rr = rk.r + R;
          const d2 = dx * dx + dz * dz;
          if (d2 < rr * rr && d2 > 1e-6) {
            const d = Math.sqrt(d2);
            p.x = m.position.x + (dx / d) * rr;
            p.z = m.position.z + (dz / d) * rr;
            moved = true;
          }
        }
        // الكائنات الأرضية
        [[marsSurface.enemy, 3.2], [marsSurface.stalkerEnemy, 1.1], [marsSurface.scarabEnemy, 0.9]].forEach((c) => {
          const o = c[0];
          if (!o) return;
          const dx = p.x - o.position.x, dz = p.z - o.position.z;
          const rr = c[1] + R;
          const d2 = dx * dx + dz * dz;
          if (d2 < rr * rr && d2 > 1e-6) {
            const d = Math.sqrt(d2);
            p.x = o.position.x + (dx / d) * rr;
            p.z = o.position.z + (dz / d) * rr;
            moved = true;
          }
        });
        // حدود العالم
        const L = 740;
        if (Math.abs(p.x) > L || Math.abs(p.z) > L) {
          p.x = clamp(p.x, -L, L);
          p.z = clamp(p.z, -L, L);
          moved = true;
        }
      } else {
        // أشجار الغابة (كل النسخ)
        for (const tr of forestTrees) {
          const dx = p.x - tr.x, dz = p.z - tr.z;
          const rr = 1.5 + R;
          const d2 = dx * dx + dz * dz;
          if (d2 < rr * rr && d2 > 1e-6) {
            const d = Math.sqrt(d2);
            p.x = tr.x + (dx / d) * rr;
            p.z = tr.z + (dz / d) * rr;
            moved = true;
          }
        }
      }
      if (moved) p.y = s.surface.getGroundHeight(p.x, p.z) + 0.02;
    }

    // المركبة مع القمر (في الفضاء فقط)
    if (inSpace && moonplanet.visible) {
      moonplanet.getWorldPosition(tmpM);
      chip.localToWorld(tmpS.set(15, 0, 0));
      const d = tmpS.distanceTo(tmpM);
      if (d < 6.5 && d > 1e-4) {
        tmpV.copy(tmpS).sub(tmpM).normalize().multiplyScalar(6.5 - d);
        chip.position.add(tmpV);
      }
    }

    // ---- الأشياء المخبأة ----
    const refPos = s.inSurface ? pl.position : chip.position;
    itemObjs.forEach((o) => {
      const active = surfaceOn && o.cfg.planet === pid && !o.found;
      o.fx.visible = active;
      if (!active) return;
      o.t += dt;
      if (o.build.spin) o.group.rotation.y += o.build.spin * dt;
      if (o.build.bob) o.group.position.y = o.gy + o.build.lift + Math.sin(o.t * 2) * o.build.bob;
      const d = Math.hypot(o.group.position.x - refPos.x, o.group.position.z - refPos.z);
      o.glow.material.opacity = (0.55 + 0.25 * Math.sin(o.t * 3)) * f;
      o.beam.material.opacity = 0.22 * clamp((110 - d) / 60, 0, 1) * f;
    });

    // زر التقط
    const rn = document.getElementById("rn");
    if (rn) {
      if (s.inSurface) {
        const near = nearestItem(pl.position.x, pl.position.z, pid);
        if (near) rn.style.display = "flex";
        else if (pid === 2) rn.style.display = "none";
      } else {
        rn.style.display = "none";
      }
    }

    // ---- 5) تتبّع المهام ----
    if (s.pp && !prevPP && !s.takingOff) report("land", { planet: pid });
    prevPP = s.pp;
    if (s.takingOff && !prevTake) report("takeoff");
    prevTake = s.takingOff;

    if (s.inSurface) {
      if (lastPInit) {
        const dd = Math.hypot(pl.position.x - lastP.x, pl.position.z - lastP.z);
        if (dd > 0 && dd < 4) report("walk", { planet: pid, n: dd });
      }
      lastP.copy(pl.position);
      lastPInit = true;
      if (pid === 1) {
        [marsSurface.enemy, marsSurface.stalkerEnemy, marsSurface.scarabEnemy, marsSurface.droneEnemy, marsSurface.jellyEnemy].forEach((o) => {
          if (o && o.position.distanceTo(pl.position) < 12) report("monster");
        });
      } else {
        [["oak", forestSurface.tree], ["pine", forestSurface.pine], ["birch", forestSurface.birch], ["maple", forestSurface.maple]].forEach((t) => {
          if (t[1] && Math.hypot(t[1].position.x - pl.position.x, t[1].position.z - pl.position.z) < 4.5) {
            report("trees", { tree: t[0] });
          }
        });
      }
    } else {
      lastPInit = false;
    }

    if (inSpace) {
      chip.localToWorld(tmpS.set(15, 0, 0));
      if (lastShipInit) {
        const dd = tmpS.distanceTo(lastShip);
        if (dd > 0 && dd < 5) report("fly", { n: dd });
      }
      lastShip.copy(tmpS);
      lastShipInit = true;
      if (moonplanet.visible) {
        moonplanet.getWorldPosition(tmpM);
        if (tmpS.distanceTo(tmpM) < 12) report("moon");
      }
    } else {
      lastShipInit = false;
    }

    hintT -= dt;
    if (dirty && hintT <= 0) {
      dirty = false;
      renderList();
    }
    if (hintT <= 0) {
      hintT = 0.5;
      if (list.style.display === "block") {
        list.querySelectorAll("span.h").forEach((el) => {
          const o = itemObjs.find((x) => x.cfg.id === el.getAttribute("data-item"));
          if (!o) return;
          if (surfaceOn && o.cfg.planet === pid && (s.inSurface || s.pp)) {
            const d = Math.hypot(o.group.position.x - refPos.x, o.group.position.z - refPos.z);
            el.textContent = "≈ " + Math.round(d) + " م";
          } else {
            el.textContent = PNAME[o.cfg.planet];
          }
        });
      }
    }

    // ---- شاشة التحميل ----
    frames++;
    if (!loaded && frames >= 40 && now - t0 >= 1800) {
      loaded = true;
      loadEl.classList.add("done");
      setTimeout(() => { if (loadEl.parentNode) loadEl.parentNode.removeChild(loadEl); }, 800);
    }
  }

  // أشجار الغابة (الأصلية والمستنسخة) لاصطدام اللاعب
  const forestTrees = [];
  forestSurface.surfaceGroup.children.forEach((o) => {
    if (o.isGroup && o !== forestSurface.grass && o !== forestSurface.rocks) {
      forestTrees.push({ x: o.position.x, z: o.position.z });
    }
  });

  const origRender = renderer.render.bind(renderer);
  renderer.render = function (sc, cam) {
    try { step(); } catch (e) { console.error("extras step:", e); }
    origRender(sc, cam);
  };

  return { report, missions: MISSIONS, items: ITEMS };
}
