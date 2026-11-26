import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";

// FOREST
export function createForest(scene, player) {

  const surfaceGroup = new THREE.Group();

  // الأرض (700 × 700)
  const SZ = 700;
  const SEG = 70;
  const LIMIT = SZ / 2 - 3; // حد الحركة (قبل الحافة بـ 3)

  const geo = new THREE.PlaneGeometry(SZ, SZ, SEG, SEG);
  const pos = geo.attributes.position;

  for (let i = 0; i < pos.count; i++) {
    pos.setZ(i, Math.random() * 2);
  }

  pos.needsUpdate = true;
  geo.computeVertexNormals();

  // نسيج عشب كثيف يغطي الأرض
  const gc = document.createElement("canvas");
  gc.width = 512;
  gc.height = 512;
  const g2 = gc.getContext("2d");

  g2.fillStyle = "#2a4318";
  g2.fillRect(0, 0, 512, 512);

  const shades = ["#3a5e20", "#4a7228", "#223a12", "#56802e", "#314f1a", "#5b4a2a"];

  for (let k = 0; k < 9000; k++) {
    g2.strokeStyle = shades[Math.floor(Math.random() * shades.length)];
    g2.lineWidth = 1 + Math.random() * 1.5;

    const x = Math.random() * 512;
    const y = Math.random() * 512;

    g2.beginPath();
    g2.moveTo(x, y);
    g2.lineTo(x + (Math.random() - 0.5) * 8, y - 4 - Math.random() * 10);
    g2.stroke();
  }

  const gtex = new THREE.CanvasTexture(gc);
  gtex.colorSpace = THREE.SRGBColorSpace;
  gtex.wrapS = THREE.RepeatWrapping;
  gtex.wrapT = THREE.RepeatWrapping;
  gtex.repeat.set(SZ / 6, SZ / 6);
  gtex.anisotropy = 8;

  const ground = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: gtex,
      roughness: 1
    })
  );

  ground.rotation.x = -Math.PI / 2;
  surfaceGroup.add(ground);

  // ارتفاع الأرض
  const ray = new THREE.Raycaster();

  function getGroundHeight(x, z) {
    ray.set(
      new THREE.Vector3(x, 100, z),
      new THREE.Vector3(0, -1, 0)
    );

    ground.updateMatrixWorld(true);

    const hits = ray.intersectObject(ground);

    return hits.length > 0 ? hits[0].point.y : 0;
  }

  // ارتفاع الأرض عند نقطة (لهبوط المركبة عليه)
  function landY(x, z) {
    return getGroundHeight(x, z);
  }

  // وضع المركبة في وسط السطح (x و z فقط، بدون لمس الارتفاع)
  function placeShip(s) {
    if (!s) return;

    s.position.x = 0;
    s.position.z = 0;
  }

  // الإضاءة
  surfaceGroup.add(
    new THREE.HemisphereLight(0xcfe8ff, 0x1d3a1a, 1.15)
  );

  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(12, 24, 12);
  surfaceGroup.add(sun);

  // ============ العشب ============

  const G = 80;         // عدد الخانات = G × G (أقل = أخف)
  const CELL = 1.4;     // حجم الخانة (أقل = أكثف)
  const BLADES = 12;    // أوراق كل خصلة
  const R = 1.0;        // اتساع الخصلة
  const HMIN = 0.1;     // أقل طول
  const HMAX = 0.22;    // أكبر طول
  const BW = 0.12;      // عرض الورقة
  const FADE = 12;      // مسافة التلاشي عند أطراف العشب

  // ارتفاع الأرض السريع (بدون Raycaster)
  const hs = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) hs[i] = pos.getZ(i);

  const CG = SZ / SEG;

  function hAt(x, z) {
    const u = (x + SZ / 2) / CG;
    const v = (z + SZ / 2) / CG;

    const ix = Math.max(0, Math.min(SEG - 1, Math.floor(u)));
    const iy = Math.max(0, Math.min(SEG - 1, Math.floor(v)));

    const fx = Math.max(0, Math.min(1, u - ix));
    const fy = Math.max(0, Math.min(1, v - iy));

    const S = SEG + 1;
    const a = hs[iy * S + ix];
    const b = hs[(iy + 1) * S + ix];
    const c = hs[(iy + 1) * S + ix + 1];
    const d = hs[iy * S + ix + 1];

    if (fx + fy <= 1) return a + fx * (d - a) + fy * (b - a);
    return c + (1 - fx) * (b - c) + (1 - fy) * (d - c);
  }

  const baseCol = new THREE.Color(0x1e3a0e); // أسفل داكن
  const midCol = new THREE.Color(0x4c8a24);  // وسط
  const tipCol = new THREE.Color(0x9dc84a);  // أعلى فاتح
  const tmp = new THREE.Color();

  function colAt(t) {
    return t < 0.5
      ? tmp.copy(baseCol).lerp(midCol, t * 2)
      : tmp.copy(midCol).lerp(tipCol, (t - 0.5) * 2);
  }

  // قالب الورقة: 3 مستويات + قمة مدببة، منحنية للأمام
  const lv = [0, 0.4, 0.75];
  const TPL = [];

  for (let i = 0; i < lv.length; i++) {
    const t = lv[i];
    const w = (1 - t * 0.6) * 0.5;
    const zb = t * t * 0.35;

    TPL.push({ x: -w, y: t, z: zb, t: t });
    TPL.push({ x: w, y: t, z: zb, t: t });
  }

  TPL.push({ x: 0, y: 1, z: 0.35, t: 1 });

  const TI = [0, 1, 2, 1, 3, 2, 2, 3, 4, 3, 5, 4, 4, 5, 6];

  // بناء خصلة واحدة من عدة أوراق
  const dummy = new THREE.Object3D();
  const vv = new THREE.Vector3();

  const P = [];
  const Nn = [];
  const C = [];
  const I = [];
  let off = 0;

  for (let b = 0; b < BLADES; b++) {

    const ang = Math.random() * Math.PI * 2;
    const rad = Math.sqrt(Math.random()) * R;
    const hh = HMIN + Math.random() * (HMAX - HMIN);

    dummy.position.set(Math.cos(ang) * rad, 0, Math.sin(ang) * rad);
    dummy.rotation.set(
      (Math.random() - 0.5) * 0.5,
      Math.random() * Math.PI * 2,
      (Math.random() - 0.5) * 0.4
    );
    dummy.scale.set(BW * (0.8 + Math.random() * 0.5), hh, hh);
    dummy.updateMatrix();

    const shade = 0.8 + Math.random() * 0.4;

    for (let q = 0; q < TPL.length; q++) {
      const p = TPL[q];

      vv.set(p.x, p.y, p.z).applyMatrix4(dummy.matrix);
      P.push(vv.x, vv.y, vv.z);

      Nn.push(0, 1, 0);

      colAt(p.t);
      C.push(tmp.r * shade, tmp.g * shade, tmp.b * shade);
    }

    for (let k = 0; k < TI.length; k++) {
      I.push(TI[k] + off);
    }

    off += TPL.length;
  }

  const clumpGeo = new THREE.BufferGeometry();
  clumpGeo.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
  clumpGeo.setAttribute("normal", new THREE.Float32BufferAttribute(Nn, 3));
  clumpGeo.setAttribute("color", new THREE.Float32BufferAttribute(C, 3));
  clumpGeo.setIndex(I);

  // مادة العشب: إضاءة ناعمة + ريح
  const windU = { value: 0 };

  const grassMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
    roughness: 0.9
  });

  grassMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = windU;

    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nuniform float uTime;"
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        float ph = uTime * 1.8 + instanceMatrix[3].x * 0.25 + instanceMatrix[3].z * 0.2 + position.x * 2.0;
        float bend = position.y * position.y;
        transformed.x += sin(ph) * 0.10 * bend;
        transformed.z += cos(ph * 0.8) * 0.07 * bend;`
      );

    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <normal_fragment_begin>",
      `#include <normal_fragment_begin>
      vec3 upN = normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);
      normal = normalize(mix(upN, normal, 0.25));`
    );
  };

  const clump = new THREE.InstancedMesh(
    clumpGeo,
    grassMat,
    G * G
  );
  clump.frustumCulled = false;

  // رقم عشوائي ثابت لكل خانة (لا يتغير عند الحركة)
  function rnd(a, b, c) {
    const h = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453;
    return h - Math.floor(h);
  }

  const tint = new THREE.Color();
  let bx = null;
  let bz = null;

  // تحريك العشب مع اللاعب
  function updateGrass() {

    const p = player.position;
    const px = THREE.MathUtils.clamp(p ? p.x : 0, -SZ / 2, SZ / 2);
    const pz = THREE.MathUtils.clamp(p ? p.z : 0, -SZ / 2, SZ / 2);

    const nx = Math.floor(px / CELL) - G / 2;
    const nz = Math.floor(pz / CELL) - G / 2;

    if (nx === bx && nz === bz) return;

    bx = nx;
    bz = nz;

    const half = (G * CELL) / 2;

    for (let i = 0; i < G; i++) {

      const cx = bx + (((i - bx) % G) + G) % G;

      for (let j = 0; j < G; j++) {

        const cz = bz + (((j - bz) % G) + G) % G;

        const x = (cx + rnd(cx, cz, 1)) * CELL;
        const z = (cz + rnd(cx, cz, 2)) * CELL;

        const n = i * G + j;

        const d = Math.hypot(x - px, z - pz);
        let f = THREE.MathUtils.clamp((half - 2 - d) / FADE, 0, 1);

        if (Math.abs(x) > SZ / 2 || Math.abs(z) > SZ / 2) f = 0;

        const s = (0.85 + rnd(cx, cz, 3) * 0.4) * f;

        dummy.position.set(x, hAt(x, z) - 0.05, z);
        dummy.rotation.set(0, rnd(cx, cz, 4) * Math.PI * 2, 0);
        dummy.scale.set(s, s, s);
        dummy.updateMatrix();

        clump.setMatrixAt(n, dummy.matrix);

        if (rnd(cx, cz, 5) < 0.12) {
          tint.setRGB(1.35, 1.1, 0.55); // عشب جاف مصفر
        } else {
          tint.setRGB(
            0.7 + rnd(cx, cz, 6) * 0.5,
            0.85 + rnd(cx, cz, 7) * 0.3,
            0.6 + rnd(cx, cz, 8) * 0.35
          );
        }
        clump.setColorAt(n, tint);
      }
    }

    clump.instanceMatrix.needsUpdate = true;
    clump.instanceColor.needsUpdate = true;
  }

  updateGrass();

  const grass = new THREE.Group();
  grass.add(clump);
  surfaceGroup.add(grass);

  // ============ نهاية العشب ============

  // ============ الأشجار ============

  // السنديانة
  const TX = 10;        // الموقع x
  const TZ = -16;       // الموقع z
  const TS = 1.2;       // الحجم
  const SEED = 7;       // غيّر الرقم للحصول على شجرة بشكل آخر
  const LD = 9;         // أوراق كل غصين (أكثر = أكثف وأثقل)
  const LEAF = 0.5;     // حجم الورقة

  // التنوب (الصنوبر)
  const PX = -7;        // الموقع x
  const PZ = -19;       // الموقع z
  const PS = 1.2;       // الحجم
  const PSEED = 11;     // غيّر الرقم للحصول على شكل آخر
  const PH = 15;        // ارتفاع الجذع
  const TIERS = 24;     // عدد طبقات الأغصان
  const PD = 4;         // حزم الإبر لكل غصين (أكثر = أكثف وأثقل)

  // البتولة
  const BX = -17;       // الموقع x
  const BZ = -11;       // الموقع z
  const BS = 1.2;       // الحجم
  const BSEED = 23;     // غيّر الرقم للحصول على شكل آخر
  const BLEAF = 0.34;   // حجم الورقة

  // القيقب الخريفي
  const MX = 24;        // الموقع x
  const MZ = -8;        // الموقع z
  const MS = 1.25;      // الحجم
  const MSEED = 31;     // غيّر الرقم للحصول على شكل آخر
  const MLEAF = 0.55;   // حجم الورقة

  // الزهور
  const FLX = -3;       // مركز الزهور x
  const FLZ = -13;      // مركز الزهور z
  const FLR = 5.5;      // نصف قطر بقعة الزهور
  const FLS = 2.0;      // حجم الزهرة
  const FSEED = 41;

  // الصخور
  const ROX = 5;        // الموقع x
  const ROZ = -6;       // الموقع z
  const RS = 1.0;       // الحجم

  const lr = (a, b, t) => a + (b - a) * t;

  // عشوائي ثابت بالبذرة: الشجرة نفسها في كل تشغيل
  let seedV = SEED;

  function rng() {
    seedV |= 0;
    seedV = (seedV + 0x6D2B79F5) | 0;

    let t = Math.imul(seedV ^ (seedV >>> 15), 1 | seedV);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  const rr = (a, b) => a + (b - a) * rng();

  // ضجيج ثلاثي الأبعاد لتضاريس اللحاء والصخور
  function vnoise(x, y, z) {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const zi = Math.floor(z);

    const xf = x - xi;
    const yf = y - yi;
    const zf = z - zi;

    const u = xf * xf * (3 - 2 * xf);
    const v = yf * yf * (3 - 2 * yf);
    const w = zf * zf * (3 - 2 * zf);

    const a = lr(rnd(xi, yi, zi), rnd(xi + 1, yi, zi), u);
    const b = lr(rnd(xi, yi + 1, zi), rnd(xi + 1, yi + 1, zi), u);
    const c = lr(rnd(xi, yi, zi + 1), rnd(xi + 1, yi, zi + 1), u);
    const d = lr(rnd(xi, yi + 1, zi + 1), rnd(xi + 1, yi + 1, zi + 1), u);

    return lr(lr(a, b, v), lr(c, d, v), w);
  }

  // ---------- نسيج اللحاء ----------
  function makeBark() {
    const W = 512;
    const H = 1024;

    // خريطة الارتفاع: شقوق داكنة وحواف فاتحة
    const hc = document.createElement("canvas");
    hc.width = W;
    hc.height = H;
    const h = hc.getContext("2d");

    h.fillStyle = "#808080";
    h.fillRect(0, 0, W, H);
    h.lineCap = "round";
    h.lineJoin = "round";

    for (let k = 0; k < 700; k++) {
      const x0 = Math.random() * W;
      const y0 = Math.random() * H;
      const len = 60 + Math.random() * 260;
      const dark = Math.random() < 0.6;
      const lw = dark ? 1.5 + Math.random() * 3.5 : 3 + Math.random() * 6;
      const gv = Math.floor(dark ? 30 + Math.random() * 40 : 150 + Math.random() * 70);
      const al = dark ? 0.9 : 0.45;

      const pts = [[x0, y0]];
      let cx = x0;

      for (let s = 1; s <= 8; s++) {
        cx += (Math.random() - 0.5) * 8;
        pts.push([cx, y0 + (len * s) / 8]);
      }

      // رسم مكرر ليتصل النسيج من كل الجهات
      for (const dx of [-W, 0, W]) {
        for (const dy of [-H, 0, H]) {
          h.strokeStyle = `rgba(${gv},${gv},${gv},${al})`;
          h.lineWidth = lw;
          h.beginPath();

          for (let i = 0; i < pts.length; i++) {
            if (i === 0) h.moveTo(pts[i][0] + dx, pts[i][1] + dy);
            else h.lineTo(pts[i][0] + dx, pts[i][1] + dy);
          }

          h.stroke();
        }
      }
    }

    for (let k = 0; k < 7000; k++) {
      const gv = Math.floor(Math.random() * 255);

      h.fillStyle = `rgba(${gv},${gv},${gv},0.25)`;
      h.fillRect(Math.random() * W, Math.random() * H, 1 + Math.random() * 2, 1 + Math.random() * 3);
    }

    // تلوين الخريطة بألوان اللحاء
    const src = h.getImageData(0, 0, W, H);
    const cc = document.createElement("canvas");
    cc.width = W;
    cc.height = H;
    const c2 = cc.getContext("2d");
    const out = c2.createImageData(W, H);

    const dk = [28, 22, 16];
    const md = [75, 61, 51];
    const lt = [138, 122, 102];

    for (let i = 0; i < W * H; i++) {
      const gv = src.data[i * 4] / 255;
      const nz = (Math.random() - 0.5) * 10;

      let r;
      let g;
      let b;

      if (gv < 0.5) {
        const t = gv * 2;
        r = lr(dk[0], md[0], t);
        g = lr(dk[1], md[1], t);
        b = lr(dk[2], md[2], t);
      } else {
        const t = (gv - 0.5) * 2;
        r = lr(md[0], lt[0], t);
        g = lr(md[1], lt[1], t);
        b = lr(md[2], lt[2], t);
      }

      out.data[i * 4] = r + nz;
      out.data[i * 4 + 1] = g + nz;
      out.data[i * 4 + 2] = b + nz;
      out.data[i * 4 + 3] = 255;
    }

    c2.putImageData(out, 0, 0);

    const map = new THREE.CanvasTexture(cc);
    map.colorSpace = THREE.SRGBColorSpace;
    map.wrapS = THREE.RepeatWrapping;
    map.wrapT = THREE.RepeatWrapping;
    map.anisotropy = 8;

    const bump = new THREE.CanvasTexture(hc);
    bump.wrapS = THREE.RepeatWrapping;
    bump.wrapT = THREE.RepeatWrapping;
    bump.anisotropy = 8;

    return { map, bump };
  }

  const bark = makeBark();

  const barkMat = new THREE.MeshStandardMaterial({
    map: bark.map,
    bumpMap: bark.bump,
    bumpScale: 3,
    vertexColors: true,
    roughness: 1
  });

  // ---------- نسيج لحاء البتولة: أبيض بعلامات سوداء وقشور ----------
  function makeBirchBark() {
    const W = 512;
    const H = 1024;

    const cc = document.createElement("canvas");
    cc.width = W;
    cc.height = H;
    const c = cc.getContext("2d");

    const hc = document.createElement("canvas");
    hc.width = W;
    hc.height = H;
    const h = hc.getContext("2d");

    c.fillStyle = "#ddd8c8";
    c.fillRect(0, 0, W, H);
    h.fillStyle = "#808080";
    h.fillRect(0, 0, W, H);

    // تبقعات رمادية خفيفة
    for (let k = 0; k < 900; k++) {
      const gv = 140 + Math.floor(Math.random() * 70);

      c.fillStyle = `rgba(${gv},${gv - 4},${gv - 16},0.16)`;
      c.fillRect(Math.random() * W, Math.random() * H, 2 + Math.random() * 10, 6 + Math.random() * 40);
    }

    // قشور فاتحة رقيقة
    for (let k = 0; k < 120; k++) {
      const x = Math.random() * W;
      const y = Math.random() * H;
      const w = 2 + Math.random() * 4;
      const l = 40 + Math.random() * 180;

      for (const dx of [-W, 0, W]) {
        c.fillStyle = "rgba(248,245,236,0.55)";
        c.fillRect(x + dx, y, w, l);
        c.fillStyle = "rgba(120,112,100,0.25)";
        c.fillRect(x + dx + w, y, 1.5, l);
        h.fillStyle = "rgba(190,190,190,0.6)";
        h.fillRect(x + dx, y, w, l);
      }
    }

    // علامات سوداء أفقية
    for (let k = 0; k < 230; k++) {
      const x = Math.random() * W;
      const y = Math.random() * H;
      const w = 25 + Math.random() * 105;
      const t = 4 + Math.random() * 9;

      for (const dx of [-W, 0, W]) {
        for (const dy of [-H, 0, H]) {
          c.fillStyle = "rgba(95,88,78,0.32)";
          c.beginPath();
          c.ellipse(x + dx, y + dy, w * 0.65, t * 1.1, 0, 0, 6.283);
          c.fill();

          c.fillStyle = "rgba(26,22,20,0.92)";
          c.beginPath();
          c.ellipse(x + dx, y + dy, w / 2, t / 2, 0, 0, 6.283);
          c.fill();

          h.fillStyle = "rgba(25,25,25,0.9)";
          h.beginPath();
          h.ellipse(x + dx, y + dy, w / 2, t / 2, 0, 0, 6.283);
          h.fill();
        }
      }
    }

    const map = new THREE.CanvasTexture(cc);
    map.colorSpace = THREE.SRGBColorSpace;
    map.wrapS = THREE.RepeatWrapping;
    map.wrapT = THREE.RepeatWrapping;
    map.anisotropy = 8;

    const bump = new THREE.CanvasTexture(hc);
    bump.wrapS = THREE.RepeatWrapping;
    bump.wrapT = THREE.RepeatWrapping;
    bump.anisotropy = 8;

    return { map, bump };
  }

  const bbark = makeBirchBark();

  const birchMat = new THREE.MeshStandardMaterial({
    map: bbark.map,
    bumpMap: bbark.bump,
    bumpScale: 2,
    vertexColors: true,
    roughness: 0.85
  });

  // ---------- مخزن أشكال الأنابيب ----------
  function newBuf() {
    return { v: [], u: [], c: [], i: [], seams: [] };
  }

  function bufGeo(B) {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(B.v, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(B.u, 2));
    g.setAttribute("color", new THREE.Float32BufferAttribute(B.c, 3));
    g.setIndex(B.i);
    g.computeVertexNormals();

    // تنعيم الإضاءة عند خط الالتحام
    const tn = g.attributes.normal;

    for (const s of B.seams) {
      const a = s[0];
      const b = s[0] + s[1];

      const x = tn.getX(a) + tn.getX(b);
      const y = tn.getY(a) + tn.getY(b);
      const z = tn.getZ(a) + tn.getZ(b);
      const l = Math.hypot(x, y, z) || 1;

      tn.setXYZ(a, x / l, y / l, z / l);
      tn.setXYZ(b, x / l, y / l, z / l);
    }

    tn.needsUpdate = true;

    return g;
  }

  const SEGS = [30, 14, 9, 6, 4];   // تقسيم الطول لكل مستوى
  const RAD = [22, 12, 8, 6, 5];    // تقسيم المحيط لكل مستوى
  const LEN = [5.2, 4.2, 2.4, 1.3, 0.7];
  const KIDS = [0, 5, 4, 3, 0];

  // أنبوب مدبب يتبع منحنى، مع تضاريس لحاء للجذع والأغصان الكبيرة
  function tube(B, pts, r0, r1, depth, flare, tn, rough) {

    const tr = tn ? tn[0] : 1;
    const tg2 = tn ? tn[1] : 1;
    const tb = tn ? tn[2] : 1;
    const rf = rough === undefined ? 1 : rough;

    const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal");
    const N = SEGS[depth];
    const radial = RAD[depth];
    const fr = curve.computeFrenetFrames(N, false);

    const base = B.v.length / 3;
    const ureps = Math.max(1, Math.round((6.283 * r0) / 1.4));

    const ox = rng() * 50;
    const oy = rng() * 50;
    const oz = rng() * 50;

    const nn = new THREE.Vector3();
    let v = 0;
    let prev = null;

    for (let i = 0; i <= N; i++) {

      const t = i / N;
      const p = curve.getPointAt(t);

      let r = lr(r0, r1, Math.pow(t, 0.8));

      // توسع الجذع عند الأرض
      if (flare) r *= 1 + 0.55 * Math.pow(Math.max(0, 1 - p.y / 1.4), 2.2);

      if (prev) v += (p.distanceTo(prev) * ureps) / (2 * 6.283 * r);
      prev = p;

      const Nf = fr.normals[i];
      const Bf = fr.binormals[i];

      const ao = flare ? lr(0.6, 1, THREE.MathUtils.clamp(p.y / 1.6, 0, 1)) : 1;

      for (let j = 0; j <= radial; j++) {

        const a = (j / radial) * 6.283;
        const s = Math.sin(a);
        const c = -Math.cos(a);

        nn.set(
          c * Nf.x + s * Bf.x,
          c * Nf.y + s * Bf.y,
          c * Nf.z + s * Bf.z
        );

        let k = 1;

        if (depth <= 1) {
          const cx = Math.cos(a);
          const sx = Math.sin(a);

          // حواف اللحاء المتشققة
          const rg = Math.abs(vnoise(cx * 2.4 + ox, p.y * 0.8 + oy, sx * 2.4 + oz) - 0.5) * 2;

          k += (rg - 0.5) * 0.12 * rf;
          k += (vnoise(cx * 6 + ox, p.y * 2.5 + oy, sx * 6 + oz) - 0.5) * 0.05 * rf;

          // عقد وانتفاخات كبيرة في الجذع
          if (depth === 0) {
            k += (vnoise(cx * 0.9 + ox, p.y * 0.35 + oy, sx * 0.9 + oz) - 0.5) * 0.2 * rf;
          }
        }

        B.v.push(
          p.x + nn.x * r * k,
          p.y + nn.y * r * k,
          p.z + nn.z * r * k
        );

        B.u.push((j / radial) * ureps, v);
        B.c.push(ao * tr, ao * tg2, ao * tb);
      }

      B.seams.push([base + i * (radial + 1), radial]);
    }

    for (let i = 1; i <= N; i++) {
      for (let j = 1; j <= radial; j++) {
        const a = base + (radial + 1) * (i - 1) + (j - 1);
        const b = base + (radial + 1) * i + (j - 1);
        const c = base + (radial + 1) * i + j;
        const d = base + (radial + 1) * (i - 1) + j;

        B.i.push(a, b, d, b, c, d);
      }
    }

    return curve;
  }

  // ---------- أوراق الأشجار ----------

  // ورقة بسيطة بعرق وسطي وتجويف: صفوف من ثلاث نقاط (وسط ويسار ويمين)
  function makeLeafG(Y, Wd, cmHex, ceHex, droop) {

    const LP = [];
    const LC = [];
    const LI = [];

    const cm = new THREE.Color(cmHex);
    const ce = new THREE.Color(ceHex);
    const c1 = new THREE.Color();
    const n = Y.length;

    for (let k = 0; k < n; k++) {
      const y = Y[k];
      const w = Wd[k];
      const dz = -droop * y * y;     // انحناء الورقة للأسفل
      const f = 0.5 * w;             // تجويف الورقة

      LP.push(0, y, dz, -w, y, dz + f, w, y, dz + f);

      // عرق الورقة أفتح وحوافها أغمق
      const br = 0.7 + 0.3 * y;

      c1.copy(cm).multiplyScalar(br + 0.05);
      LC.push(c1.r, c1.g, c1.b);

      c1.copy(ce).lerp(cm, 0.25).multiplyScalar(br);
      LC.push(c1.r, c1.g, c1.b, c1.r, c1.g, c1.b);
    }

    LP.push(0, 1, -droop);
    LC.push(cm.r, cm.g, cm.b);

    for (let k = 0; k < n - 1; k++) {
      const m0 = 3 * k;
      const l0 = m0 + 1;
      const r0 = m0 + 2;
      const m1 = m0 + 3;
      const l1 = m0 + 4;
      const r1 = m0 + 5;

      LI.push(m0, r0, r1, m0, r1, m1);
      LI.push(m0, l1, l0, m0, m1, l1);
    }

    const lm = 3 * (n - 1);
    LI.push(lm, lm + 2, lm + 3, lm, lm + 3, lm + 1);

    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(LP, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(LC, 3));
    g.setIndex(LI);
    g.computeVertexNormals();

    return g;
  }

  // ورقة القيقب: راحية بخمسة فصوص مسننة
  function makeMapleLeaf() {

    const NS = 60;
    const CY = 0.42;

    const LP = [];
    const LC = [];
    const LI = [];

    const cc0 = new THREE.Color(0xa83214);
    const cc1 = new THREE.Color(0xeaa02c);
    const c1 = new THREE.Color();

    // العنق
    LP.push(-0.012, 0, 0, 0.012, 0, 0, 0.012, CY, 0, -0.012, CY, 0);

    for (let k = 0; k < 4; k++) LC.push(0.28, 0.14, 0.06);

    LI.push(0, 1, 2, 0, 2, 3);

    // مركز الورقة
    LP.push(0, CY, 0.01);
    c1.copy(cc0).multiplyScalar(0.9);
    LC.push(c1.r, c1.g, c1.b);

    for (let i = 0; i <= NS; i++) {

      const a = (i / NS) * 6.2832;
      const lobe = Math.abs(Math.cos(a * 2.5));

      let r = 0.42 + 0.58 * Math.pow(lobe, 1.4);

      r *= 1 + 0.07 * Math.abs(Math.sin(a * 22));   // أسنان الحافة

      const dn = Math.abs(a - 3.1416);

      if (dn < 0.4) r *= 0.5 + 0.5 * (dn / 0.4);    // تجويف العنق

      const x = Math.sin(a) * r * 0.5;
      const y = CY + Math.cos(a) * r * 0.5;
      const dist = r * 0.5;
      const z = -0.28 * dist * dist + 0.1 * Math.abs(x);

      LP.push(x, y, z);

      // العروق أفتح والحواف أفتح لونًا
      const vein = 0.82 + 0.18 * lobe * lobe;

      c1.copy(cc0).lerp(cc1, THREE.MathUtils.clamp(r, 0, 1)).multiplyScalar(vein);
      LC.push(c1.r, c1.g, c1.b);
    }

    for (let i = 0; i < NS; i++) {
      LI.push(4, 5 + i, 6 + i);
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(LP, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(LC, 3));
    g.setIndex(LI);
    g.computeVertexNormals();

    return g;
  }

  // مادة أوراق مع ارتجاف الريح
  function leafMaterial(key, emi, amp) {

    const m = new THREE.MeshStandardMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      roughness: 0.55,
      emissive: emi,
      emissiveIntensity: 0.35
    });

    m.customProgramCacheKey = () => key;

    m.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = windU;

      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          "#include <common>\nuniform float uTime;"
        )
        .replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
          float fl = uTime * 2.4 + instanceMatrix[3].x * 3.1 + instanceMatrix[3].y * 2.3 + instanceMatrix[3].z * 2.7;
          transformed.z += sin(fl) * ${(0.07 * amp).toFixed(3)} * position.y;
          transformed.x += cos(fl * 1.3) * ${(0.04 * amp).toFixed(3)} * position.y;`
        );
    };

    return m;
  }

  // اتجاه كل ورقة: مع الغصن، مائلة للأسفل قليلًا، ووجهها للأعلى
  const UPV = new THREE.Vector3(0, 1, 0);

  function leafMatrixG(p, tan, size, drift) {
    const d = new THREE.Vector3(
      tan.x * 0.5 + (rng() - 0.5) * 1.4,
      tan.y * 0.5 + (rng() - 0.5) * 1.0 + drift,
      tan.z * 0.5 + (rng() - 0.5) * 1.4
    ).normalize();

    const z = UPV.clone().addScaledVector(d, -UPV.dot(d));

    if (z.lengthSq() < 1e-4) z.set(1, 0, 0);

    z.normalize();
    z.applyAxisAngle(d, (rng() - 0.5) * 1.6);

    const x = new THREE.Vector3().crossVectors(d, z).normalize();

    const m = new THREE.Matrix4().makeBasis(x, d, z);
    const s = size * rr(0.75, 1.25);

    m.multiply(new THREE.Matrix4().makeScale(s * rr(0.85, 1.2), s, s));
    m.setPosition(p);

    return m;
  }

  // شبكة أوراق مكررة
  function leafMesh(g, mat, list, size, drift, tf) {

    const m = new THREE.InstancedMesh(g, mat, list.length);

    for (let i = 0; i < list.length; i++) {
      m.setMatrixAt(i, leafMatrixG(list[i].p, list[i].t, size, drift));

      tf();
      m.setColorAt(i, tint);
    }

    m.instanceMatrix.needsUpdate = true;
    m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();

    return m;
  }

  // ======================= السنديانة =======================

  const OB = newBuf();
  const spots = [];   // أماكن الأوراق

  // نمو غصن: مسار منحنٍ ثم أغصان فرعية وأوراق
  function grow(start, dir, len, r0, depth) {

    const steps = depth <= 1 ? 6 : 4;
    const d = dir.clone().normalize();
    const cur = start.clone();
    const step = len / steps;
    const pts = [cur.clone()];

    for (let s = 0; s < steps; s++) {
      const wob = depth === 0 ? 0.14 : 0.35;

      d.x += (rng() - 0.5) * wob;
      d.z += (rng() - 0.5) * wob;
      d.y += (rng() - 0.5) * 0.2 + (depth >= 2 ? -0.07 : 0.03);
      d.normalize();

      cur.addScaledVector(d, step);
      pts.push(cur.clone());
    }

    const r1 = depth === 0 ? 0.3 : Math.max(r0 * 0.3, 0.012);
    const curve = tube(OB, pts, r0, r1, depth, depth === 0);

    // الجذع: ثلاثة أغصان رئيسية في القمة وخمسة جانبية
    if (depth === 0) {

      for (let i = 0; i < 3; i++) {
        const az = i * 2.094 + rr(-0.3, 0.3);
        const cd = new THREE.Vector3(Math.cos(az) * 0.62, 0.9, Math.sin(az) * 0.62);

        grow(curve.getPointAt(0.97), cd, LEN[1] * rr(1.0, 1.2), r1 * 0.85, 1);
      }

      for (let i = 0; i < 5; i++) {
        const t = lr(0.45, 0.85, i / 4);
        const az = i * 2.399 + rr(0, 1);
        const cd = new THREE.Vector3(Math.cos(az), rr(0.15, 0.45), Math.sin(az));
        const pr = lr(r0, r1, Math.pow(t, 0.8));

        grow(curve.getPointAt(t), cd, LEN[1] * rr(0.75, 1.0), pr * 0.36, 1);
      }

      return;
    }

    // أغصان فرعية
    if (depth <= 3) {

      const nk = KIDS[depth];

      for (let i = 0; i < nk; i++) {

        const t = lr(0.28, 0.95, (i + rng() * 0.7) / nk);
        const p = curve.getPointAt(t);
        const tan = curve.getTangentAt(t);

        const ref = Math.abs(tan.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
        const u = new THREE.Vector3().crossVectors(tan, ref).normalize();
        const w = new THREE.Vector3().crossVectors(tan, u);

        const az = i * 2.399 + rng() * 1.2;
        const ang = rr(0.6, 1.1);

        const cd = tan.clone().multiplyScalar(Math.cos(ang))
          .addScaledVector(u, Math.cos(az) * Math.sin(ang))
          .addScaledVector(w, Math.sin(az) * Math.sin(ang));

        cd.y += 0.18;

        const cl = LEN[depth + 1] * rr(0.75, 1.25) * (1 - 0.3 * t);
        const cr = Math.max(lr(r0, r1, Math.pow(t, 0.8)) * rr(0.5, 0.65), 0.012);

        grow(p, cd, cl, cr, depth + 1);
      }
    }

    // أماكن الأوراق على الأغصان الدقيقة
    if (depth >= 3) {

      const nl = depth === 4 ? LD : 2;
      const t0 = depth === 4 ? 0.15 : 0.6;

      for (let i = 0; i < nl; i++) {
        const t = lr(t0, 1, (i + rng()) / nl);
        spots.push({ p: curve.getPointAt(t), t: curve.getTangentAt(t) });
      }

      if (depth === 4) {
        for (let i = 0; i < 2; i++) {
          spots.push({ p: curve.getPointAt(1), t: curve.getTangentAt(1) });
        }
      }
    }
  }

  // الجذع الرئيسي
  grow(new THREE.Vector3(0, -0.3, 0), new THREE.Vector3(0, 1, 0), LEN[0], 0.62, 0);

  // جذور بارزة تدخل الأرض
  for (let i = 0; i < 6; i++) {
    const a = i * 1.047 + rr(-0.3, 0.3);
    const ca = Math.cos(a);
    const sa = Math.sin(a);

    tube(OB, [
      new THREE.Vector3(ca * 0.15, 0.55, sa * 0.15),
      new THREE.Vector3(ca * 0.75, 0.28, sa * 0.75),
      new THREE.Vector3(ca * 1.45, 0.0, sa * 1.45),
      new THREE.Vector3(ca * 2.2, -0.3, sa * 2.2)
    ], 0.3, 0.06, 1, false);
  }

  const tg = bufGeo(OB);

  const oakLeafMat = leafMaterial("oakleaf", 0x16260a, 1);

  const oakLeaves = leafMesh(
    makeLeafG([0, 0.14, 0.28, 0.42, 0.56, 0.7, 0.84], [0.05, 0.2, 0.13, 0.27, 0.16, 0.2, 0.09], 0x6a9a30, 0x2f5a1a, 0.25),
    oakLeafMat,
    spots,
    LEAF,
    -0.15,
    () => {
      if (rng() < 0.1) {
        tint.setRGB(1.3, 1.15, 0.6); // أوراق مصفرة
      } else {
        tint.setRGB(0.85 + rng() * 0.3, 0.9 + rng() * 0.2, 0.8 + rng() * 0.3);
      }
    }
  );

  const tree = new THREE.Group();
  tree.add(new THREE.Mesh(tg, barkMat));
  tree.add(oakLeaves);
  tree.position.set(TX, hAt(TX, TZ) - 0.1, TZ);
  tree.scale.setScalar(TS);
  tree.rotation.y = rr(0, 6.283);

  surfaceGroup.add(tree);

  // ======================= التنوب (الصنوبر) =======================

  seedV = PSEED;

  const PB = newBuf();
  const pspots = [];   // حزم الإبر
  const pcones = [];   // أكواز الصنوبر
  const BT = [1.05, 0.86, 0.76]; // لحاء أكثر احمرارًا

  // الجذع شبه مستقيم
  const tp = [];
  const pax = rr(0, 6.283);
  const psw = rr(0.25, 0.55);

  for (let i = 0; i <= 10; i++) {
    const t = i / 10;

    tp.push(new THREE.Vector3(
      Math.cos(pax) * psw * t * t + Math.sin(t * 4 + 1) * 0.06 * t,
      -0.3 + (PH + 0.3) * t,
      Math.sin(pax) * psw * t * t + Math.cos(t * 3) * 0.06 * t
    ));
  }

  const pcurve = tube(PB, tp, 0.58, 0.04, 0, true, BT);

  // جذور بارزة
  for (let i = 0; i < 5; i++) {
    const a = i * 1.257 + rr(-0.3, 0.3);
    const ca = Math.cos(a);
    const sa = Math.sin(a);

    tube(PB, [
      new THREE.Vector3(ca * 0.15, 0.5, sa * 0.15),
      new THREE.Vector3(ca * 0.7, 0.25, sa * 0.7),
      new THREE.Vector3(ca * 1.3, 0.0, sa * 1.3),
      new THREE.Vector3(ca * 1.9, -0.3, sa * 1.9)
    ], 0.26, 0.05, 1, false, BT);
  }

  // غصين مع حزم الإبر عليه
  function twig(p, d, len) {
    const e = p.clone().addScaledVector(d, len);
    e.y -= len * 0.15;

    const m = p.clone().lerp(e, 0.5);
    m.y += len * 0.05;

    const cv = tube(PB, [p.clone(), m, e], 0.014, 0.004, 4, false, BT);

    for (let i = 0; i < PD; i++) {
      const t = Math.min(lr(0.25, 1, (i + rng()) / PD), 1);

      pspots.push({
        p: cv.getPointAt(t),
        t: cv.getTangentAt(t),
        s: lr(1.0, 0.7, t) * rr(0.85, 1.2),
        tip: false
      });
    }

    // برعم حديث في الطرف
    pspots.push({ p: e.clone(), t: d.clone(), s: 0.95, tip: true });
  }

  // غصن متدلٍّ مع غصينات متبادلة على الجانبين
  function branch(p, az, L, t, stub) {
    const dx = Math.cos(az);
    const dz = Math.sin(az);

    const up = lr(-0.02, 0.42, t);
    const dr = lr(0.3, 0.06, t);

    const q1 = p.clone().add(new THREE.Vector3(dx * L * 0.3, L * up * 0.3, dz * L * 0.3));
    const q2 = p.clone().add(new THREE.Vector3(dx * L * 0.65, L * (up * 0.6 - dr * 0.7), dz * L * 0.65));
    const q3 = p.clone().add(new THREE.Vector3(dx * L, L * (up * 0.8 - dr + 0.05), dz * L));

    const r0 = 0.03 + 0.02 * L;
    const c = tube(PB, [p.clone(), q1, q2, q3], r0, r0 * 0.18, 2, false, BT);

    if (stub) return;

    const n = Math.round(L * 2.4) + 2;

    for (let i = 0; i < n; i++) {
      const tt = lr(0.1, 0.98, (i + rng() * 0.6) / n);
      const bp = c.getPointAt(tt);
      const tan = c.getTangentAt(tt);

      const side = i % 2 ? 1 : -1;
      const sv = new THREE.Vector3(-tan.z, 0, tan.x).normalize().multiplyScalar(side);
      const ang = rr(0.8, 1.15);

      const d = tan.clone().multiplyScalar(Math.cos(ang)).addScaledVector(sv, Math.sin(ang));
      d.y += rr(-0.35, 0.05);
      d.normalize();

      twig(bp, d, lr(0.9, 0.28, tt) * (0.55 + 0.1 * L));
    }

    pspots.push({ p: q3.clone(), t: c.getTangentAt(1), s: 1.1, tip: true });

    if (t > 0.15 && t < 0.85 && rng() < 0.22) pcones.push(q3.clone());
  }

  // طبقات الأغصان: السفلية جافة مبتورة
  for (let i = 0; i < TIERS; i++) {

    const t = i / (TIERS - 1);
    const y = lr(2.4, PH * 0.985, Math.pow(t, 0.92));
    const base = pcurve.getPointAt(THREE.MathUtils.clamp((y + 0.3) / (PH + 0.3), 0, 1));

    const stub = i < 3;
    const nb = Math.round(lr(7, 4, t));
    const L0 = stub ? rr(0.7, 1.5) : lr(5.4, 0.5, Math.pow(t, 0.9));

    for (let b = 0; b < nb; b++) {
      const az = (b / nb) * 6.283 + i * 0.9 + rr(-0.3, 0.3);

      branch(base.clone(), az, L0 * rr(0.8, 1.15), t, stub);
    }
  }

  // قمة الشجرة
  for (let i = 0; i < 14; i++) {
    const p = pcurve.getPointAt(lr(0.93, 1, rng()));

    p.x += rr(-0.12, 0.12);
    p.z += rr(-0.12, 0.12);

    pspots.push({
      p: p,
      t: new THREE.Vector3(rr(-0.5, 0.5), 0.8, rr(-0.5, 0.5)).normalize(),
      s: 0.9,
      tip: true
    });
  }

  const pgeo = bufGeo(PB);

  // حزمة إبر: عدة إبر رفيعة تتفرع حول محور الغصين
  function makeNeedles() {
    const NP = [];
    const NC = [];
    const NN = [];
    const NI = [];

    const c0 = new THREE.Color(0x173a22);
    const c1 = new THREE.Color(0x3f7d46);
    const cc = new THREE.Color();
    const nd = new THREE.Vector3();

    const cnt = 9;

    for (let k = 0; k < cnt; k++) {

      const ph = (k / cnt) * 6.283 + rr(-0.2, 0.2);
      const th = rr(0.9, 1.25);
      const L = rr(0.3, 0.42);
      const yo = rr(0, 0.12);

      const dx = Math.sin(th) * Math.cos(ph);
      const dy = Math.cos(th);
      const dz = Math.sin(th) * Math.sin(ph);

      const wx = -Math.sin(ph) * 0.025;
      const wz = Math.cos(ph) * 0.025;

      NP.push(
        -wx, yo, -wz,
        wx, yo, wz,
        dx * L, yo + dy * L, dz * L
      );

      // اتجاه الإضاءة: بين الإبرة ووجه الأعلى (z)
      nd.set(dx * 0.5, dy * 0.5, dz * 0.5 + 0.9).normalize();

      for (let v = 0; v < 3; v++) NN.push(nd.x, nd.y, nd.z);

      const k0 = rr(0.8, 1.1);

      cc.copy(c0).multiplyScalar(k0);
      NC.push(cc.r, cc.g, cc.b, cc.r, cc.g, cc.b);

      cc.copy(c1).multiplyScalar(rr(0.9, 1.15));
      NC.push(cc.r, cc.g, cc.b);

      NI.push(k * 3, k * 3 + 1, k * 3 + 2);
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(NP, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(NN, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(NC, 3));
    g.setIndex(NI);

    return g;
  }

  const needleMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
    roughness: 0.65,
    emissive: 0x08150b,
    emissiveIntensity: 0.5
  });

  // ارتجاف الإبر مع الريح
  needleMat.customProgramCacheKey = () => "needle";

  needleMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = windU;

    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nuniform float uTime;"
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        float fl = uTime * 1.6 + instanceMatrix[3].x * 0.7 + instanceMatrix[3].z * 0.6;
        transformed.z += sin(fl) * 0.012 * instanceMatrix[3].y * (0.3 + position.y);
        transformed.x += cos(fl * 1.2) * 0.008 * instanceMatrix[3].y * (0.3 + position.y);`
      );
  };

  // اتجاه الحزمة: المحور مع الغصين، ووجهها للأعلى
  function needleMatrix(p, tan, s) {
    const d = new THREE.Vector3(
      tan.x + (rng() - 0.5) * 0.5,
      tan.y + (rng() - 0.5) * 0.4,
      tan.z + (rng() - 0.5) * 0.5
    ).normalize();

    const z = UPV.clone().addScaledVector(d, -UPV.dot(d));

    if (z.lengthSq() < 1e-4) z.set(1, 0, 0);

    z.normalize();
    z.applyAxisAngle(d, (rng() - 0.5) * 1.2);

    const x = new THREE.Vector3().crossVectors(d, z).normalize();

    const m = new THREE.Matrix4().makeBasis(x, d, z);

    m.multiply(new THREE.Matrix4().makeScale(s, s, s));
    m.setPosition(p);

    return m;
  }

  const needleMesh = new THREE.InstancedMesh(makeNeedles(), needleMat, pspots.length);

  for (let i = 0; i < pspots.length; i++) {
    const sp = pspots[i];

    needleMesh.setMatrixAt(i, needleMatrix(sp.p, sp.t, sp.s));

    if (sp.tip && rng() < 0.6) {
      tint.setRGB(1.4, 1.6, 0.9); // براعم حديثة فاتحة
    } else {
      tint.setRGB(0.8 + rng() * 0.35, 0.85 + rng() * 0.3, 0.85 + rng() * 0.25);
    }

    needleMesh.setColorAt(i, tint);
  }

  needleMesh.instanceMatrix.needsUpdate = true;
  needleMesh.instanceColor.needsUpdate = true;
  needleMesh.computeBoundingSphere();

  // أكواز الصنوبر
  const coneGeo = new THREE.ConeGeometry(0.11, 0.34, 8, 4);
  coneGeo.rotateX(Math.PI);
  coneGeo.translate(0, -0.17, 0);

  const cp = coneGeo.attributes.position;
  const ccol = new Float32Array(cp.count * 3);
  const cbase = new THREE.Color(0x6a4524);

  for (let i = 0; i < cp.count; i++) {
    const k = 0.55 + 0.45 * vnoise(cp.getX(i) * 14, cp.getY(i) * 14, cp.getZ(i) * 14);

    ccol[i * 3] = cbase.r * k;
    ccol[i * 3 + 1] = cbase.g * k;
    ccol[i * 3 + 2] = cbase.b * k;
  }

  coneGeo.setAttribute("color", new THREE.BufferAttribute(ccol, 3));

  const coneMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    flatShading: true,
    roughness: 0.95
  });

  const coneMesh = new THREE.InstancedMesh(coneGeo, coneMat, Math.max(pcones.length, 1));

  for (let i = 0; i < pcones.length; i++) {
    const s = rr(0.9, 1.4);

    dummy.position.copy(pcones[i]);
    dummy.position.y -= 0.05;
    dummy.rotation.set(rr(-0.2, 0.2), rr(0, 6.283), rr(-0.2, 0.2));
    dummy.scale.set(s, s, s);
    dummy.updateMatrix();

    coneMesh.setMatrixAt(i, dummy.matrix);
  }

  coneMesh.count = pcones.length;
  coneMesh.instanceMatrix.needsUpdate = true;

  const pine = new THREE.Group();
  pine.add(new THREE.Mesh(pgeo, barkMat));
  pine.add(needleMesh);

  if (pcones.length > 0) pine.add(coneMesh);

  pine.position.set(PX, hAt(PX, PZ) - 0.1, PZ);
  pine.scale.setScalar(PS);
  pine.rotation.y = rr(0, 6.283);

  surfaceGroup.add(pine);

  // ======================= أشجار بإعدادات (البتولة والقيقب) =======================

  // نمو غصن بإعدادات النوع: أطوال وعدد أغصان وانحناء وأوراق
  function growX(B, sp, cfg, start, dir, len, r0, depth) {

    const steps = depth <= 1 ? 6 : 4;
    const d = dir.clone().normalize();
    const cur = start.clone();
    const step = len / steps;
    const pts = [cur.clone()];

    for (let s = 0; s < steps; s++) {
      const wob = cfg.WOB[depth];

      d.x += (rng() - 0.5) * wob;
      d.z += (rng() - 0.5) * wob;
      d.y += (rng() - 0.5) * 0.2 + cfg.DY[depth];
      d.normalize();

      cur.addScaledVector(d, step);
      pts.push(cur.clone());
    }

    const r1 = depth === 0 ? cfg.R1 : Math.max(r0 * 0.3, 0.01);
    const curve = tube(B, pts, r0, r1, depth, depth === 0, cfg.TN, cfg.ROUGH);

    if (depth === 0) {
      cfg.onTrunk(curve, r0, r1, (s0, d0, l0, r00, dp) => growX(B, sp, cfg, s0, d0, l0, r00, dp));
      return;
    }

    // أغصان فرعية
    if (depth <= 3) {

      const nk = cfg.KIDS[depth];

      for (let i = 0; i < nk; i++) {

        const t = lr(0.28, 0.95, (i + rng() * 0.7) / nk);
        const p = curve.getPointAt(t);
        const tan = curve.getTangentAt(t);

        const ref = Math.abs(tan.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
        const u = new THREE.Vector3().crossVectors(tan, ref).normalize();
        const w = new THREE.Vector3().crossVectors(tan, u);

        const az = i * 2.399 + rng() * 1.2;
        const ang = rr(cfg.ANG[0], cfg.ANG[1]);

        const cd = tan.clone().multiplyScalar(Math.cos(ang))
          .addScaledVector(u, Math.cos(az) * Math.sin(ang))
          .addScaledVector(w, Math.sin(az) * Math.sin(ang));

        cd.y += 0.18;

        const cl = cfg.LEN[depth + 1] * rr(0.75, 1.25) * (1 - 0.3 * t);
        const cr = Math.max(lr(r0, r1, Math.pow(t, 0.8)) * rr(0.5, 0.65), 0.01);

        growX(B, sp, cfg, p, cd, cl, cr, depth + 1);
      }
    }

    // أماكن الأوراق على الأغصان الدقيقة
    if (depth >= 3) {

      const nl = cfg.NL[depth];
      const t0 = depth === 4 ? 0.12 : 0.55;

      for (let i = 0; i < nl; i++) {
        const t = lr(t0, 1, (i + rng()) / nl);
        sp.push({ p: curve.getPointAt(t), t: curve.getTangentAt(t) });
      }

      if (depth === 4) {
        for (let i = 0; i < 2; i++) {
          sp.push({ p: curve.getPointAt(1), t: curve.getTangentAt(1) });
        }
      }
    }
  }

  // ======================= البتولة =======================

  seedV = BSEED;

  const BB = newBuf();
  const bspots = [];

  const BCFG = {
    LEN: [9.5, 4.8, 2.8, 1.8, 1.0],
    KIDS: [0, 4, 3, 2, 0],
    DY: [0.0, 0.06, -0.04, -0.16, -0.28],
    WOB: [0.1, 0.25, 0.35, 0.45, 0.5],
    ANG: [0.5, 0.95],
    NL: [0, 0, 0, 3, 10],
    R1: 0.07,
    TN: [1, 0.98, 0.94],
    ROUGH: 0.25,
    onTrunk: (curve, r0, r1, g) => {
      for (let i = 0; i < 9; i++) {
        const t = lr(0.38, 0.97, i / 8);
        const az = i * 2.399 + rr(0, 1);
        const up = lr(0.5, 1.3, t);
        const cd = new THREE.Vector3(Math.cos(az), up, Math.sin(az));
        const pr = lr(r0, r1, Math.pow(t, 0.8)) * 0.3;

        g(curve.getPointAt(t), cd, BCFG.LEN[1] * lr(1.1, 0.55, t) * rr(0.85, 1.1), Math.max(pr, 0.02), 1);
      }
    }
  };

  growX(BB, bspots, BCFG, new THREE.Vector3(0, -0.3, 0), new THREE.Vector3(0, 1, 0), BCFG.LEN[0], 0.27, 0);

  const birchLeaves = leafMesh(
    makeLeafG([0, 0.12, 0.25, 0.4, 0.55, 0.7, 0.85], [0.02, 0.12, 0.2, 0.22, 0.19, 0.12, 0.05], 0x8fbf3f, 0x4f8a22, 0.2),
    leafMaterial("birchleaf", 0x1a2a08, 1.6),
    bspots,
    BLEAF,
    -0.55,
    () => {
      if (rng() < 0.12) {
        tint.setRGB(1.35, 1.2, 0.6); // أوراق مصفرة
      } else {
        tint.setRGB(0.9 + rng() * 0.25, 0.95 + rng() * 0.2, 0.85 + rng() * 0.3);
      }
    }
  );

  const birch = new THREE.Group();
  birch.add(new THREE.Mesh(bufGeo(BB), birchMat));
  birch.add(birchLeaves);
  birch.position.set(BX, hAt(BX, BZ) - 0.1, BZ);
  birch.scale.setScalar(BS);
  birch.rotation.y = rr(0, 6.283);

  surfaceGroup.add(birch);

  // ======================= القيقب الخريفي =======================

  seedV = MSEED;

  const MB = newBuf();
  const mspots = [];

  const MCFG = {
    LEN: [3.8, 4.6, 3.2, 2.0, 1.0],
    KIDS: [0, 4, 3, 2, 0],
    DY: [0.02, 0.05, 0.0, -0.08, -0.12],
    WOB: [0.14, 0.3, 0.4, 0.45, 0.5],
    ANG: [0.55, 1.05],
    NL: [0, 0, 0, 2, 8],
    R1: 0.28,
    TN: [0.95, 0.92, 0.95],
    ROUGH: 0.9,
    onTrunk: (curve, r0, r1, g) => {

      for (let i = 0; i < 5; i++) {
        const az = i * 1.257 + rr(-0.3, 0.3);
        const cd = new THREE.Vector3(Math.cos(az) * 0.8, 0.85, Math.sin(az) * 0.8);

        g(curve.getPointAt(0.95), cd, MCFG.LEN[1] * rr(1.0, 1.2), r1 * 0.85, 1);
      }

      for (let i = 0; i < 3; i++) {
        const t = lr(0.5, 0.8, i / 2);
        const az = i * 2.399 + rr(0, 1);
        const cd = new THREE.Vector3(Math.cos(az), rr(0.2, 0.5), Math.sin(az));
        const pr = lr(r0, r1, Math.pow(t, 0.8));

        g(curve.getPointAt(t), cd, MCFG.LEN[1] * rr(0.7, 0.95), pr * 0.36, 1);
      }
    }
  };

  growX(MB, mspots, MCFG, new THREE.Vector3(0, -0.3, 0), new THREE.Vector3(0, 1, 0), MCFG.LEN[0], 0.6, 0);

  // جذور بارزة
  for (let i = 0; i < 5; i++) {
    const a = i * 1.257 + rr(-0.3, 0.3);
    const ca = Math.cos(a);
    const sa = Math.sin(a);

    tube(MB, [
      new THREE.Vector3(ca * 0.15, 0.5, sa * 0.15),
      new THREE.Vector3(ca * 0.7, 0.25, sa * 0.7),
      new THREE.Vector3(ca * 1.35, 0.0, sa * 1.35),
      new THREE.Vector3(ca * 2.0, -0.3, sa * 2.0)
    ], 0.28, 0.06, 1, false, MCFG.TN, 0.9);
  }

  const mapleLeaves = leafMesh(
    makeMapleLeaf(),
    leafMaterial("mapleleaf", 0x2a1004, 0.8),
    mspots,
    MLEAF,
    -0.2,
    () => {
      const u = rng();

      if (u < 0.4) tint.setRGB(1.0, 0.62, 0.55);        // أحمر
      else if (u < 0.75) tint.setRGB(1.0, 0.95, 0.6);   // برتقالي
      else tint.setRGB(1.1, 1.2, 0.55);                 // أصفر
    }
  );

  const maple = new THREE.Group();
  maple.add(new THREE.Mesh(bufGeo(MB), barkMat));
  maple.add(mapleLeaves);
  maple.position.set(MX, hAt(MX, MZ) - 0.1, MZ);
  maple.scale.setScalar(MS);
  maple.rotation.y = rr(0, 6.283);

  surfaceGroup.add(maple);

  // ======================= الزهور =======================

  seedV = FSEED;

  // تويج: شريحة مضلعة بتجويف وانحناء
  function petal(B, o, phi, tilt, L, W, droop, c0, c1) {

    const S = [0, 0.22, 0.5, 0.78, 1];
    const Wd = [0.2, 0.85, 1.0, 0.7, 0];

    const base = B.v.length / 3;
    const cp2 = Math.cos(phi);
    const sp2 = Math.sin(phi);
    const ct = Math.cos(tilt);
    const st = Math.sin(tilt);
    const col = new THREE.Color();

    for (let r = 0; r < S.length; r++) {

      const s = S[r];
      const ax = cp2 * ct * s * L;
      const ay = (st * s - droop * s * s) * L;
      const az = sp2 * ct * s * L;
      const w = Wd[r] * W;
      const nL = r === S.length - 1 ? 1 : 2;

      for (let q = 0; q < nL; q++) {
        const side = nL === 1 ? 0 : (q ? 1 : -1);

        B.v.push(
          o.x + ax - sp2 * w * side,
          o.y + ay + Math.abs(side) * w * 0.18,
          o.z + az + cp2 * w * side
        );

        B.u.push(0, 0);

        col.copy(c0).lerp(c1, s);
        B.c.push(col.r, col.g, col.b);
      }
    }

    for (let r = 0; r < 3; r++) {
      const a = base + r * 2;

      B.i.push(a, a + 1, a + 3, a, a + 3, a + 2);
    }

    B.i.push(base + 6, base + 7, base + 8);
  }

  // قبة مركز الزهرة
  function dome(B, o, rad, h, cEdge, cTop) {

    const base = B.v.length / 3;
    const n = 12;
    const col = new THREE.Color();

    B.v.push(o.x, o.y + h, o.z);
    B.u.push(0, 0);
    B.c.push(cTop.r, cTop.g, cTop.b);

    for (let ring = 0; ring < 2; ring++) {
      const r2 = ring ? rad : rad * 0.6;
      const h2 = ring ? 0 : h * 0.7;

      for (let j = 0; j < n; j++) {
        const a = (j / n) * 6.2832;

        B.v.push(o.x + Math.cos(a) * r2, o.y + h2, o.z + Math.sin(a) * r2);
        B.u.push(0, 0);

        if (ring) col.copy(cEdge);
        else col.copy(cEdge).lerp(cTop, 0.5);

        B.c.push(col.r, col.g, col.b);
      }
    }

    for (let j = 0; j < n; j++) {
      const a0 = base + 1 + j;
      const a1 = base + 1 + ((j + 1) % n);
      const b0 = base + 1 + n + j;
      const b1 = base + 1 + n + ((j + 1) % n);

      B.i.push(base, a1, a0);
      B.i.push(a0, a1, b1, a0, b1, b0);
    }
  }

  // زهرة كاملة: ساق وأوراق ورأس
  function makeFlower(kind) {

    const B = newBuf();

    const stem = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.035, 0.2, 0.01),
      new THREE.Vector3(0.06, 0.38, 0),
      new THREE.Vector3(0.05, 0.55, -0.01)
    ];

    const sc = tube(B, stem, 0.016, 0.011, 4, false, [0.1, 0.26, 0.05], 0);
    const head = new THREE.Vector3(0.05, 0.55, -0.01);

    const lg0 = new THREE.Color(0x244f14);
    const lg1 = new THREE.Color(0x4f8a28);

    // أوراق الساق
    petal(B, sc.getPointAt(0.25), 0.4, 0.55, 0.3, 0.075, 0.55, lg0, lg1);
    petal(B, sc.getPointAt(0.3), 3.5, 0.5, 0.26, 0.07, 0.6, lg0, lg1);
    petal(B, sc.getPointAt(0.5), 2.0, 0.65, 0.2, 0.06, 0.5, lg0, lg1);

    if (kind === 0) {

      // أقحوانة: صفان من التويجات البيضاء ومركز أصفر
      const w0 = new THREE.Color(0xe6dfb0);
      const w1 = new THREE.Color(0xf6f4ec);

      for (let i = 0; i < 15; i++) {
        petal(B, head, (i / 15) * 6.2832, 0.32, 0.17, 0.036, 0.3, w0, w1);
      }

      for (let i = 0; i < 15; i++) {
        petal(B, head.clone().add(new THREE.Vector3(0, 0.008, 0)), ((i + 0.5) / 15) * 6.2832, 0.55, 0.14, 0.034, 0.28, w0, w1);
      }

      dome(B, head, 0.065, 0.045, new THREE.Color(0xc98a0c), new THREE.Color(0xf0c824));

    } else {

      // شقيقة النعمان: خمسة تويجات حمراء عريضة ومركز داكن
      const r0 = new THREE.Color(0x2a0606);
      const r1 = new THREE.Color(0xd8201a);

      for (let i = 0; i < 5; i++) {
        petal(B, head, (i / 5) * 6.2832 + 0.3, 0.95, 0.2, 0.15, 0.15, r0, r1);
      }

      for (let i = 0; i < 4; i++) {
        petal(B, head.clone().add(new THREE.Vector3(0, 0.01, 0)), (i / 4) * 6.2832 + 0.9, 1.1, 0.15, 0.12, 0.12, r0, r1);
      }

      dome(B, head, 0.05, 0.05, new THREE.Color(0x14180a), new THREE.Color(0x4a5a22));
    }

    return bufGeo(B);
  }

  const flowerMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
    roughness: 0.6
  });

  // تمايل الزهور مع الريح
  flowerMat.customProgramCacheKey = () => "flower";

  flowerMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = windU;

    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nuniform float uTime;"
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        float ph = uTime * 1.9 + instanceMatrix[3].x * 0.6 + instanceMatrix[3].z * 0.5;
        float bd = position.y * position.y;
        transformed.x += sin(ph) * 0.14 * bd;
        transformed.z += cos(ph * 0.85) * 0.10 * bd;`
      );
  };

  // نشر الزهور في البقعة
  function scatterFlowers(g, count, tf) {

    const m = new THREE.InstancedMesh(g, flowerMat, count);

    for (let i = 0; i < count; i++) {

      const a = rng() * 6.2832;
      const r = FLR * Math.sqrt(rng());
      const x = FLX + Math.cos(a) * r;
      const z = FLZ + Math.sin(a) * r;
      const s = FLS * rr(0.8, 1.3);

      dummy.position.set(x, hAt(x, z) - 0.03, z);
      dummy.rotation.set(rr(-0.1, 0.1), rr(0, 6.283), rr(-0.1, 0.1));
      dummy.scale.set(s, s * rr(0.85, 1.2), s);
      dummy.updateMatrix();

      m.setMatrixAt(i, dummy.matrix);

      tf();
      m.setColorAt(i, tint);
    }

    m.instanceMatrix.needsUpdate = true;
    m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();

    return m;
  }

  const daisies = scatterFlowers(makeFlower(0), 45, () => {
    const u = rng();

    if (u < 0.6) tint.setRGB(1.0, 1.0, 1.0);          // أبيض
    else if (u < 0.85) tint.setRGB(1.0, 0.65, 0.85);  // زهري
    else tint.setRGB(1.0, 0.95, 0.55);                // أصفر فاتح
  });

  const poppies = scatterFlowers(makeFlower(1), 30, () => {
    const k = rr(0.85, 1.15);

    tint.setRGB(k, k, k);
  });

  surfaceGroup.add(daisies);
  surfaceGroup.add(poppies);

  // ======================= الصخور =======================

  // دمج رؤوس المضلع المكرر في رؤوس مشتركة لإضاءة ناعمة
  function weld(g) {
    const p = g.attributes.position;
    const map = new Map();
    const idx = [];
    const out = [];

    for (let i = 0; i < p.count; i++) {
      const key = Math.round(p.getX(i) * 10000) + "_" + Math.round(p.getY(i) * 10000) + "_" + Math.round(p.getZ(i) * 10000);

      let id = map.get(key);

      if (id === undefined) {
        id = out.length / 3;
        map.set(key, id);
        out.push(p.getX(i), p.getY(i), p.getZ(i));
      }

      idx.push(id);
    }

    const w = new THREE.BufferGeometry();
    w.setAttribute("position", new THREE.Float32BufferAttribute(out, 3));
    w.setIndex(idx);

    return w;
  }

  // صخرة: تشويه متعدد الطبقات + شقوق + طبقات رسوبية + طحلب وتراب
  function makeRock(sd, sx, sy, sz, detail) {

    const g = weld(new THREE.IcosahedronGeometry(1, detail));
    const p = g.attributes.position;
    const n = p.count;
    const dsp = new Float32Array(n);

    for (let i = 0; i < n; i++) {

      const x = p.getX(i);
      const y = p.getY(i);
      const z = p.getZ(i);

      let f = 0;
      let a = 0.5;
      let q = 1.4;

      for (let o = 0; o < 5; o++) {
        f += a * vnoise(x * q + sd, y * q + sd * 0.6, z * q + sd * 0.3);
        a *= 0.5;
        q *= 2.1;
      }

      const cr = 1 - Math.abs(vnoise(x * 2.4 + sd + 9, y * 2.4, z * 2.4 + sd) - 0.5) * 2;
      const d = 0.7 + f * 0.6 + Math.pow(cr, 7) * 0.1;

      // قاعدة مسطحة
      const yy = y < -0.3 ? -0.3 + (y + 0.3) * 0.25 : y;

      p.setXYZ(i, x * d * sx, yy * d * sy, z * d * sz);
      dsp[i] = d;
    }

    g.computeVertexNormals();

    const nr = g.attributes.normal;
    const col = new Float32Array(n * 3);

    const cA = new THREE.Color(0x3a3834);
    const cB = new THREE.Color(0x8c877b);
    const moss = new THREE.Color(0x3f6a1c);
    const mossD = new THREE.Color(0x24450f);
    const earth = new THREE.Color(0x3a2a1a);
    const c = new THREE.Color();
    const mc = new THREE.Color();

    for (let i = 0; i < n; i++) {

      const px = p.getX(i);
      const py = p.getY(i);
      const pz = p.getZ(i);

      // الشقوق أغمق والبروزات أفتح
      const t = THREE.MathUtils.clamp((dsp[i] - 0.65) * 1.7, 0, 1);

      c.copy(cA).lerp(cB, t);

      // طبقات رسوبية
      const band = 0.85 + 0.15 * Math.sin((py * 7) / sy + vnoise(px * 2, py * 2, pz * 2) * 5);

      c.multiplyScalar(band);

      // حبيبات دقيقة
      c.multiplyScalar(0.9 + 0.2 * vnoise(px * 14 + sd, py * 14, pz * 14));

      // طحلب على الأسطح العلوية
      const m = THREE.MathUtils.smoothstep(nr.getY(i) + (vnoise(px * 3 + sd, py * 3, pz * 3) - 0.5) * 0.7, 0.35, 0.75);

      mc.copy(mossD).lerp(moss, vnoise(px * 9, py * 9, pz * 9));
      c.lerp(mc, m * 0.9);

      // تراب عند القاعدة
      const e = THREE.MathUtils.smoothstep(-py / sy, 0.0, 0.22);

      c.lerp(earth, e * 0.8);

      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }

    g.setAttribute("color", new THREE.BufferAttribute(col, 3));

    return g;
  }

  const rockMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.95
  });

  const rockBig = makeRock(3.1, 1.25, 0.9, 1.0, 9);
  const rockMid = makeRock(8.7, 1.0, 0.75, 0.9, 8);
  const rockSmall = makeRock(15.3, 1.0, 0.8, 1.0, 6);

  const rocks = new THREE.Group();
  const rockSolids = [];

  // أخفض ارتفاع حول الصخرة لتستقر على الأرض
  function groundMin(x, z, r) {
    return Math.min(hAt(x, z), hAt(x + r, z), hAt(x - r, z), hAt(x, z + r), hAt(x, z - r));
  }

  function putRock(g, x, z, s, solid) {
    const m = new THREE.Mesh(g, rockMat);

    m.position.set(x, groundMin(x, z, s) + 0.1 * s, z);
    m.rotation.set(rr(-0.08, 0.08), rr(0, 6.283), rr(-0.08, 0.08));
    m.scale.setScalar(s);

    rocks.add(m);

    if (solid) rockSolids.push({ x, z, r: solid * s });
  }

  putRock(rockBig, ROX, ROZ, 1.7 * RS, 1.05);
  putRock(rockMid, ROX +2.8 * RS, ROZ + 1.4 * RS, 1.0 * RS, 1.0);
  putRock(rockSmall, ROX - 2.4 * RS, ROZ + 2.2 * RS, 0.6 * RS, 0);
  putRock(rockSmall, ROX + 0.8 * RS, ROZ + 3.0 * RS, 0.5 * RS, 0);
  putRock(rockSmall, ROX + 4.2 * RS, ROZ - 0.6 * RS, 0.55 * RS, 0);

  // حصيات صغيرة متناثرة
  for (let i = 0; i < 6; i++) {
    const a = rr(0, 6.283);
    const d = rr(2.5, 5.5) * RS;

    putRock(rockSmall, ROX + Math.cos(a) * d, ROZ + Math.sin(a) * d, rr(0.14, 0.3) * RS, 0);
  }

  surfaceGroup.add(rocks);

  // ظل ناعم تحت كل شجرة
  const sc = document.createElement("canvas");
  sc.width = 128;
  sc.height = 128;
  const sx2 = sc.getContext("2d");

  const sgr = sx2.createRadialGradient(64, 64, 6, 64, 64, 64);
  sgr.addColorStop(0, "rgba(0,0,0,0.55)");
  sgr.addColorStop(1, "rgba(0,0,0,0)");
  sx2.fillStyle = sgr;
  sx2.fillRect(0, 0, 128, 128);

  const stex = new THREE.CanvasTexture(sc);

  function makeShadow(cx, cz, size) {
    const sgeo = new THREE.PlaneGeometry(size, size, 24, 24);
    sgeo.rotateX(-Math.PI / 2);

    const sp = sgeo.attributes.position;

    for (let i = 0; i < sp.count; i++) {
      const wx = cx + sp.getX(i);
      const wz = cz + sp.getZ(i);

      sp.setXYZ(i, wx, hAt(wx, wz) + 0.2, wz);
    }

    const m = new THREE.Mesh(
      sgeo,
      new THREE.MeshBasicMaterial({
        map: stex,
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2
      })
    );

    surfaceGroup.add(m);
  }

  makeShadow(TX, TZ, 16 * TS);
  makeShadow(PX, PZ, 14 * PS);
  makeShadow(BX, BZ, 13 * BS);
  makeShadow(MX, MZ, 18 * MS);
  makeShadow(ROX + 1, ROZ + 1, 8 * RS);

  // ============ نهاية الأشجار ============

  // الشفافية
  surfaceGroup.traverse((o) => {
    if (o.isMesh && o.material) {
      o.material.transparent = true;
      o.material.opacity = 0;
    }
  });

  function setSurfaceOpacity(f) {
    const v = THREE.MathUtils.clamp(f, 0, 1);

    surfaceGroup.traverse((o) => {
      if (o.isMesh && o.material) {
        o.material.opacity = v;
      }
    });
  }

  // اصطدام اللاعب بجذوع الأشجار والصخور
  const trunks = [
    { x: TX, z: TZ, r: 1.0 * TS + 0.6 },
    { x: PX, z: PZ, r: 0.65 * PS + 0.6 },
    { x: BX, z: BZ, r: 0.4 * BS + 0.6 },
    { x: MX, z: MZ, r: 0.95 * MS + 0.6 }
  ];

  for (const s of rockSolids) {
    trunks.push({ x: s.x, z: s.z, r: s.r + 0.5 });
  }

  function collide() {
    const p = player.position;
    if (!p) return;

    for (const s of trunks) {
      const dx = p.x - s.x;
      const dz = p.z - s.z;
      const d2 = dx * dx + dz * dz;

      if (d2 < s.r * s.r && d2 > 1e-6) {
        const d = Math.sqrt(d2);

        p.x = s.x + (dx / d) * s.r;
        p.z = s.z + (dz / d) * s.r;
      }
    }
  }

  // منع الخروج من العالم
  function clampToWorld() {
    if (!player.position) return;

    player.position.x = THREE.MathUtils.clamp(player.position.x, -LIMIT, LIMIT);
    player.position.z = THREE.MathUtils.clamp(player.position.z, -LIMIT, LIMIT);
  }

  function updateCreatures(t, isMoving = false) {
    windU.value = performance.now() / 1000;

    if (surfaceGroup.visible) {
      collide();
      clampToWorld();
      updateGrass();
    }

    if (player.userData.update) {
      player.userData.update(t, isMoving);
    }
  }
const treeClones = [];
const pineClones = [];
const birchClones = [];
const mapleClones = [];

// OAK TREES
for (let i = 0; i < 13; i++) {
  const clone = tree.clone(true);
  
  const x = -300 + (i % 3) * 90;
  const z = -300 + Math.floor(i / 3) * 90;
  
  clone.position.set(x, landY(x, z), z);
  
  treeClones.push(clone);
  surfaceGroup.add(clone);
}

// PINE TREES
for (let i = 0; i < 13; i++) {
  const clone = pine.clone(true);
  
  const x = 20 + (i % 3) * 90;
  const z = -300 + Math.floor(i / 3) * 90;
  
  clone.position.set(x, landY(x, z), z);
  
  pineClones.push(clone);
  surfaceGroup.add(clone);
}

// BIRCH TREES
for (let i = 0; i < 13; i++) {
  const clone = birch.clone(true);
  
  const x = -300 + (i % 3) * 90;
  const z = 20 + Math.floor(i / 3) * 90;
  
  clone.position.set(x, landY(x, z), z);
  
  birchClones.push(clone);
  surfaceGroup.add(clone);
}

// MAPLE TREES
for (let i = 0; i < 13; i++) {
  const clone = maple.clone(true);
  
  const x = 20 + (i % 3) * 90;
  const z = 20 + Math.floor(i / 3) * 90;
  
  clone.position.set(x, landY(x, z), z);
  
  mapleClones.push(clone);
  surfaceGroup.add(clone);
}



  surfaceGroup.visible = false;
  scene.add(surfaceGroup);

  return {
    surfaceGroup,
    player,
    grass,
    tree,
    pine,
    birch,
    maple,
    daisies,
    poppies,
    rocks,
    setSurfaceOpacity,
    updateCreatures,
    getGroundHeight,
    clampToWorld,
    landY,
    placeShip
  };
}