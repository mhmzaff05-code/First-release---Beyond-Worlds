import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";

export function createSurface(scene) {

  // SURFACE GROUP
  const surfaceGroup = new THREE.Group();

  // GROUND
  const mlk = new THREE.PlaneGeometry(1000, 1000, 50, 50);

  const eeed = new THREE.MeshStandardMaterial({
    color: 0x9b4b2c
  });

  const position = mlk.attributes.position;

  for (let i = 0; i < position.count; i++) {
    const height = Math.random() * 5;
    position.setZ(i, height);
  }

  position.needsUpdate = true;
  mlk.computeVertexNormals();

  const ccb = new THREE.Mesh(mlk, eeed);
  ccb.rotation.x = -Math.PI / 2;
  surfaceGroup.add(ccb);

  // GROUND HEIGHT
  const raei = new THREE.Raycaster();

  function getGroundHeight(x, z) {
    raei.set(
      new THREE.Vector3(x, 100, z),
      new THREE.Vector3(0, -1, 0)
    );

    const hits = raei.intersectObject(ccb);

    if (hits.length > 0) {
      return hits[0].point.y;
    }

    return 0;
  }

  // LIGHT
  const ddd = new THREE.DirectionalLight(0xffffff, 2);
  ddd.position.set(10, 20, 10);
  surfaceGroup.add(ddd);

  // PLAYER
  const player = new THREE.Group();

  // مولّد ملمس نسيج تكتيكي للبدلة (CanvasTexture)
  function createSuitTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#172554";
    ctx.fillRect(0, 0, 256, 256);

    ctx.strokeStyle = "rgba(147, 197, 253, 0.16)";
    ctx.lineWidth = 1;
    const step = 8;
    for (let x = 0; x <= 256; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 256);
      ctx.stroke();
    }
    for (let y = 0; y <= 256; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(256, y);
      ctx.stroke();
    }

    ctx.strokeStyle = "rgba(56, 189, 248, 0.35)";
    ctx.lineWidth = 2;
    ctx.strokeRect(12, 12, 232, 232);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, 3);
    return tex;
  }

  // مولّد لوحة درع مع خطوط ومؤشر طاقة
  function createArmorDetailTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#e2e8f0";
    ctx.fillRect(0, 0, 256, 256);

    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, 236, 236);

    ctx.beginPath();
    ctx.moveTo(10, 75);
    ctx.lineTo(75, 10);
    ctx.moveTo(246, 75);
    ctx.lineTo(181, 10);
    ctx.stroke();

    ctx.fillStyle = "#0f172a";
    ctx.fillRect(48, 175, 160, 24);

    ctx.fillStyle = "#38bdf8";
    ctx.fillRect(54, 180, 112, 14);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  // دالة مساعدة لإنشاء ألواح دروع مشطوفة الحواف (Beveled Armor Plates)
  function createBeveledPlate(points, depth, bevelSize, bevelThickness, material) {
    const shape = new THREE.Shape();
    shape.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
      shape.lineTo(points[i][0], points[i][1]);
    }
    shape.closePath();

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: depth,
      bevelEnabled: true,
      bevelSegments: 4,
      steps: 1,
      bevelSize: bevelSize,
      bevelThickness: bevelThickness
    });
    geo.center();
    return new THREE.Mesh(geo, material);
  }

  const suitMap = createSuitTexture();
  const armorDetailMap = createArmorDetailTexture();

  // خامات فيزيائية واقعية
  const suitMat = new THREE.MeshStandardMaterial({
    map: suitMap,
    bumpMap: suitMap,
    bumpScale: 0.015,
    roughness: 0.68,
    metalness: 0.15
  });

  const armorMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.25,
    metalness: 0.75
  });

  const detailedArmorMat = new THREE.MeshStandardMaterial({
    map: armorDetailMap,
    roughness: 0.28,
    metalness: 0.68
  });

  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.42,
    metalness: 0.82
  });

  const jointMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.85,
    metalness: 0.25
  });

  const visorMat = new THREE.MeshPhysicalMaterial({
    color: 0x060d1a,
    roughness: 0.06,
    metalness: 0.92,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    reflectivity: 1.0
  });

  const glowMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 1.9,
    roughness: 0.2
  });

  const accentMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.32,
    metalness: 0.78
  });

  // 1. الجذع والدرع الصدري المشطوف متعدد الطبقات
  const pelvis = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.26, 0.26, 20),
    jointMat
  );
  pelvis.scale.set(1.12, 1, 0.76);
  pelvis.position.set(0, 1.12, 0);
  player.add(pelvis);

  const abdomen = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.28, 0.34, 10, 18),
    suitMat
  );
  abdomen.scale.set(1.08, 1, 0.76);
  abdomen.position.set(0, 1.42, 0.01);
  player.add(abdomen);

  // ألواح البطن العضلية المشطوفة (3 شرائح متدرجة)
  for (let row = 0; row < 3; row++) {
    const yPos = 1.33 + row * 0.1;
    const widthFactor = 1 + row * 0.08;
    const abPlate = createBeveledPlate(
      [
        [-0.16 * widthFactor, -0.032],
        [0.16 * widthFactor, -0.032],
        [0.19 * widthFactor, 0.032],
        [-0.19 * widthFactor, 0.032]
      ],
      0.04,
      0.014,
      0.014,
      darkMetalMat
    );
    abPlate.position.set(0, yPos, -0.215 - row * 0.008);
    abPlate.rotation.x = -0.08;
    player.add(abPlate);
  }

  const ribArmor = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.3, 0.38, 24, 1, false, -Math.PI * 0.65, Math.PI * 1.3),
    armorMat
  );
  ribArmor.scale.set(1.14, 1, 0.74);
  ribArmor.position.set(0, 1.62, -0.01);
  player.add(ribArmor);

  // الهيكل الأساسي للصدر
  const chestCoreChassis = new THREE.Mesh(
    new THREE.BoxGeometry(0.66, 0.44, 0.4),
    darkMetalMat
  );
  chestCoreChassis.position.set(0, 1.82, -0.03);
  player.add(chestCoreChassis);

  // درعا الصدر الأيمن والأيسر بحواف مشطوفة وزاوية انسيابية
  [-1, 1].forEach((side) => {
    const pectoralPlate = createBeveledPlate(
      [
        [0.02 * side, -0.17],
        [0.31 * side, -0.13],
        [0.35 * side, 0.14],
        [0.18 * side, 0.21],
        [0.02 * side, 0.15]
      ],
      0.055,
      0.022,
      0.022,
      detailedArmorMat
    );
    pectoralPlate.position.set(0, 1.83, -0.235);
    pectoralPlate.rotation.y = side * -0.16;
    pectoralPlate.rotation.x = -0.06;
    player.add(pectoralPlate);

    // حافة علوية للترقوة مشطوفة
    const clavicleGuard = createBeveledPlate(
      [
        [0.08 * side, -0.035],
        [0.3 * side, -0.025],
        [0.27 * side, 0.04],
        [0.09 * side, 0.035]
      ],
      0.06,
      0.015,
      0.015,
      accentMat
    );
    clavicleGuard.position.set(0, 2.02, -0.15);
    clavicleGuard.rotation.x = -0.55;
    clavicleGuard.rotation.y = side * -0.2;
    player.add(clavicleGuard);

    // فتحات تهوية جانبية على الأضلاع
    for (let v = 0; v < 3; v++) {
      const ventSlit = new THREE.Mesh(
        new THREE.BoxGeometry(0.03, 0.022, 0.14),
        glowMat
      );
      ventSlit.position.set(side * 0.365, 1.62 + v * 0.055, -0.05);
      ventSlit.rotation.z = side * 0.25;
      player.add(ventSlit);
    }
  });

  // طوق الرقبة المدرع المشطوف
  const collarRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.23, 0.052, 16, 32),
    darkMetalMat
  );
  collarRing.rotation.x = Math.PI / 2 - 0.15;
  collarRing.position.set(0, 2.05, -0.03);
  player.add(collarRing);

  // مفاعل الطاقة الصدري متعدد الحلقات
  const coreBase = createBeveledPlate(
    [
      [-0.08, -0.09],
      [0.08, -0.09],
      [0.11, 0.0],
      [0.08, 0.09],
      [-0.08, 0.09],
      [-0.11, 0.0]
    ],
    0.04,
    0.015,
    0.015,
    darkMetalMat
  );
  coreBase.position.set(0, 1.84, -0.255);
  player.add(coreBase);

  const coreRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.062, 0.013, 12, 28),
    accentMat
  );
  coreRing.position.set(0, 1.84, -0.285);
  player.add(coreRing);

  const coreLens = new THREE.Mesh(
    new THREE.SphereGeometry(0.046, 20, 20),
    glowMat
  );
  coreLens.position.set(0, 1.84, -0.282);
  player.add(coreLens);

  // الحزام التكتيكي وحافظات المعدات المشطوفة
  const beltStrap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.34, 0.35, 0.13, 24),
    darkMetalMat
  );
  beltStrap.scale.set(1.12, 1, 0.8);
  beltStrap.position.set(0, 1.21, 0);
  player.add(beltStrap);

  const beltBuckle = createBeveledPlate(
    [
      [-0.08, -0.055],
      [0.08, -0.055],
      [0.095, 0.0],
      [0.08, 0.055],
      [-0.08, 0.055],
      [-0.095, 0.0]
    ],
    0.045,
    0.014,
    0.014,
    armorMat
  );
  beltBuckle.position.set(0, 1.21, -0.285);
  player.add(beltBuckle);

  [-0.28, 0.28].forEach((xPos) => {
    const pouch = createBeveledPlate(
      [
        [-0.06, -0.075],
        [0.06, -0.075],
        [0.06, 0.075],
        [-0.06, 0.075]
      ],
      0.09,
      0.015,
      0.015,
      darkMetalMat
    );
    pouch.position.set(xPos, 1.19, -0.19);
    pouch.rotation.y = xPos > 0 ? -0.52 : 0.52;
    player.add(pouch);
  });

  // 2. الرقبة والخوذة عالية الدقة بحواف مشطوفة وتفاصيل تكتيكية
  const neckBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.18, 0.2, 24),
    jointMat
  );
  neckBase.position.set(0, 2.13, 0);
  player.add(neckBase);

  const headGroup = new THREE.Group();
  headGroup.position.set(0, 2.5, 0);

  // الهيكل الأساسي للخوذة (LatheGeometry ناعم)
  const helmetPoints = [
    new THREE.Vector2(0.0, -0.34),
    new THREE.Vector2(0.19, -0.33),
    new THREE.Vector2(0.31, -0.18),
    new THREE.Vector2(0.36, 0.04),
    new THREE.Vector2(0.33, 0.24),
    new THREE.Vector2(0.21, 0.36),
    new THREE.Vector2(0.0, 0.4)
  ];
  const helmetLatheGeo = new THREE.LatheGeometry(helmetPoints, 36);
  const helmetShell = new THREE.Mesh(helmetLatheGeo, armorMat);
  helmetShell.scale.set(0.96, 1.0, 1.05);
  headGroup.add(helmetShell);

  // عرف علوي مشطوف متعدد القطع
  const helmetCrest = createBeveledPlate(
    [
      [-0.025, -0.26],
      [0.025, -0.26],
      [0.035, 0.22],
      [-0.035, 0.22]
    ],
    0.07,
    0.015,
    0.015,
    darkMetalMat
  );
  helmetCrest.rotation.x = Math.PI / 2;
  helmetCrest.position.set(0, 0.36, 0.02);
  headGroup.add(helmetCrest);

  // واقي الجبهة (Brow Guard) مشطوف الحواف
  const browShield = createBeveledPlate(
    [
      [-0.22, -0.02],
      [0.0, -0.055],
      [0.22, -0.02],
      [0.19, 0.055],
      [0.0, 0.045],
      [-0.19, 0.055]
    ],
    0.05,
    0.016,
    0.016,
    darkMetalMat
  );
  browShield.position.set(0, 0.165, -0.31);
  browShield.rotation.x = -0.22;
  headGroup.add(browShield);

  // القناع الزجاجي العاكس (Visor)
  const visorGeo = new THREE.SphereGeometry(
    0.346,
    32,
    24,
    -Math.PI * 0.42,
    Math.PI * 0.84,
    Math.PI * 0.27,
    Math.PI * 0.33
  );
  const visorMesh = new THREE.Mesh(visorGeo, visorMat);
  visorMesh.position.set(0, 0.03, -0.02);
  headGroup.add(visorMesh);

  // شريط إضاءة HUD داخل القناع
  const visorStrip = new THREE.Mesh(
    new THREE.BoxGeometry(0.34, 0.018, 0.035),
    glowMat
  );
  visorStrip.position.set(0, 0.045, -0.335);
  headGroup.add(visorStrip);

  // درع الفك والذقن المشطوف (Mandible & Chin Armor)
  const chinPlate = createBeveledPlate(
    [
      [-0.11, -0.06],
      [0.11, -0.06],
      [0.16, 0.045],
      [0.0, 0.025],
      [-0.16, 0.045]
    ],
    0.055,
    0.018,
    0.018,
    darkMetalMat
  );
  chinPlate.position.set(0, -0.2, -0.31);
  chinPlate.rotation.x = 0.25;
  headGroup.add(chinPlate);

  // فتحات تنفس جانبية على الفك
  [-1, 1].forEach((side) => {
    const cheekArmor = createBeveledPlate(
      [
        [-0.08, -0.05],
        [0.08, -0.07],
        [0.09, 0.05],
        [-0.07, 0.07]
      ],
      0.04,
      0.012,
      0.012,
      armorMat
    );
    cheekArmor.position.set(side * 0.23, -0.15, -0.22);
    cheekArmor.rotation.y = side * -0.75;
    cheekArmor.rotation.x = 0.15;
    headGroup.add(cheekArmor);

    const respiratorVent = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.04, 0.04, 16),
      accentMat
    );
    respiratorVent.rotation.x = Math.PI / 2;
    respiratorVent.rotation.z = side * -0.45;
    respiratorVent.position.set(side * 0.14, -0.2, -0.31);
    headGroup.add(respiratorVent);

    // وحدات السمع والاتصال الجانبية
    const earMount = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.125, 0.08, 24),
      darkMetalMat
    );
    earMount.rotation.z = Math.PI / 2;
    earMount.position.set(side * 0.33, 0.0, 0.02);
    headGroup.add(earMount);

    const earCap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.075, 0.085, 0.04, 20),
      accentMat
    );
    earCap.rotation.z = Math.PI / 2;
    earCap.position.set(side * 0.37, 0.0, 0.02);
    headGroup.add(earCap);
  });

  // وحدة مستشعر/كشاف تكتيكي على جانب الخوذة الأيمن
  const scopeHousing = createBeveledPlate(
    [
      [-0.03, -0.03],
      [0.03, -0.03],
      [0.03, 0.03],
      [-0.03, 0.03]
    ],
    0.16,
    0.01,
    0.01,
    darkMetalMat
  );
  scopeHousing.position.set(-0.36, 0.13, -0.08);
  headGroup.add(scopeHousing);

  const scopeLens = new THREE.Mesh(
    new THREE.CylinderGeometry(0.022, 0.022, 0.02, 16),
    glowMat
  );
  scopeLens.rotation.x = Math.PI / 2;
  scopeLens.position.set(-0.36, 0.13, -0.17);
  headGroup.add(scopeLens);

  player.add(headGroup);

  // 3. الذراعان بالمفاصل والواقيات والأصابع
  [-1, 1].forEach((side) => {
    const armGroup = new THREE.Group();
    armGroup.position.set(side * 0.5, 1.9, 0);

    const shoulderBall = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 16, 16),
      jointMat
    );
    armGroup.add(shoulderBall);

    const shoulderArmor = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.65),
      armorMat
    );
    shoulderArmor.scale.set(1.15, 1.05, 1.05);
    shoulderArmor.rotation.z = side * -0.25;
    shoulderArmor.position.set(side * 0.03, 0.03, 0);
    armGroup.add(shoulderArmor);

    const shoulderTrim = new THREE.Mesh(
      new THREE.TorusGeometry(0.19, 0.02, 10, 24),
      darkMetalMat
    );
    shoulderTrim.rotation.x = Math.PI / 2;
    shoulderTrim.position.set(side * 0.03, -0.04, 0);
    armGroup.add(shoulderTrim);

    const upperArm = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.115, 0.3, 10, 14),
      suitMat
    );
    upperArm.position.set(side * 0.03, -0.24, 0);
    upperArm.rotation.z = side * -0.07;
    armGroup.add(upperArm);

    const bicepGuard = new THREE.Mesh(
      new THREE.CylinderGeometry(0.135, 0.13, 0.22, 16, 1, false, -Math.PI * 0.5, Math.PI),
      darkMetalMat
    );
    bicepGuard.rotation.y = side > 0 ? -Math.PI * 0.4 : Math.PI * 0.4;
    bicepGuard.position.set(side * 0.04, -0.24, -0.01);
    armGroup.add(bicepGuard);

    const elbowJoint = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, 0.18, 16),
      jointMat
    );
    elbowJoint.rotation.z = Math.PI / 2;
    elbowJoint.position.set(side * 0.05, -0.46, 0.02);
    armGroup.add(elbowJoint);

    const forearmArmor = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.115, 0.3, 10, 14),
      armorMat
    );
    forearmArmor.position.set(side * 0.06, -0.68, -0.03);
    forearmArmor.rotation.x = 0.16;
    armGroup.add(forearmArmor);

    const wristLight = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.025, 0.03),
      glowMat
    );
    wristLight.position.set(side * 0.06, -0.82, -0.075);
    armGroup.add(wristLight);

    const palm = new THREE.Mesh(
      new THREE.BoxGeometry(0.13, 0.13, 0.08),
      jointMat
    );
    palm.position.set(side * 0.06, -0.9, -0.07);
    armGroup.add(palm);

    for (let f = 0; f < 4; f++) {
      const finger = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.022, 0.065, 4, 8),
        darkMetalMat
      );
      const xOff = (f - 1.5) * 0.028;
      finger.position.set(side * 0.06 + xOff, -0.99, -0.085);
      finger.rotation.x = 0.25;
      armGroup.add(finger);
    }

    const thumb = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.024, 0.055, 4, 8),
      darkMetalMat
    );
    thumb.position.set(side * 0.06 - side * 0.075, -0.92, -0.09);
    thumb.rotation.z = side * 0.65;
    armGroup.add(thumb);

    player.add(armGroup);
  });

  // 4. الساقان بالواقيات والأحذية التكتيكية
  [-1, 1].forEach((side) => {
    const legGroup = new THREE.Group();
    legGroup.position.set(side * 0.21, 1.04, 0);

    const hipJoint = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 14, 14),
      jointMat
    );
    legGroup.add(hipJoint);

    const thigh = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.155, 0.36, 10, 16),
      suitMat
    );
    thigh.position.set(0, -0.22, 0);
    legGroup.add(thigh);

    const thighPlate = createBeveledPlate(
      [
        [-0.09, -0.12],
        [0.09, -0.12],
        [0.105, 0.12],
        [-0.105, 0.12]
      ],
      0.05,
      0.016,
      0.016,
      armorMat
    );
    thighPlate.position.set(0, -0.22, -0.135);
    legGroup.add(thighPlate);

    const kneeJoint = new THREE.Mesh(
      new THREE.SphereGeometry(0.125, 14, 14),
      jointMat
    );
    kneeJoint.position.set(0, -0.47, 0);
    legGroup.add(kneeJoint);

    const kneeGuard = createBeveledPlate(
      [
        [-0.075, -0.09],
        [0.075, -0.09],
        [0.09, 0.0],
        [0.075, 0.09],
        [-0.075, 0.09],
        [-0.09, 0.0]
      ],
      0.065,
      0.018,
      0.018,
      darkMetalMat
    );
    kneeGuard.position.set(0, -0.47, -0.13);
    kneeGuard.rotation.x = -0.15;
    legGroup.add(kneeGuard);

    const shinArmor = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.135, 0.36, 10, 16),
      armorMat
    );
    shinArmor.position.set(0, -0.73, 0.01);
    legGroup.add(shinArmor);

    const calfGuard = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.32, 0.1),
      darkMetalMat
    );
    calfGuard.position.set(0, -0.73, 0.12);
    legGroup.add(calfGuard);

    const ankleJoint = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.12, 0.12, 16),
      jointMat
    );
    ankleJoint.position.set(0, -0.95, 0.01);
    legGroup.add(ankleJoint);

    const bootSole = new THREE.Mesh(
      new THREE.BoxGeometry(0.25, 0.06, 0.42),
      jointMat
    );
    bootSole.position.set(0, -1.03, -0.06);
    legGroup.add(bootSole);

    const bootUpper = new THREE.Mesh(
      new THREE.BoxGeometry(0.23, 0.14, 0.36),
      darkMetalMat
    );
    bootUpper.position.set(0, -0.95, -0.05);
    legGroup.add(bootUpper);

    const bootToeCap = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.1, 0.14),
      armorMat
    );
    bootToeCap.position.set(0, -0.96, -0.19);
    legGroup.add(bootToeCap);

    player.add(legGroup);
  });

  // 5. الحقيبة النفاثة المتعددة الطبقات وأنابيب التوصيل
  const backpackGroup = new THREE.Group();
  backpackGroup.position.set(0, 1.66, 0.34);

  const packChassis = new THREE.Mesh(
    new THREE.BoxGeometry(0.72, 0.88, 0.24),
    darkMetalMat
  );
  backpackGroup.add(packChassis);

  const packShell = createBeveledPlate(
    [
      [-0.28, -0.35],
      [0.28, -0.35],
      [0.32, 0.31],
      [0.22, 0.38],
      [-0.22, 0.38],
      [-0.32, 0.31]
    ],
    0.1,
    0.025,
    0.025,
    detailedArmorMat
  );
  packShell.position.set(0, 0.02, 0.13);
  backpackGroup.add(packShell);

  const reactorHousing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.18, 0.48, 24),
    darkMetalMat
  );
  reactorHousing.rotation.x = Math.PI / 2;
  reactorHousing.position.set(0, 0.06, 0.14);
  backpackGroup.add(reactorHousing);

  const reactorCore = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.11, 0.05, 24),
    glowMat
  );
  reactorCore.rotation.x = Math.PI / 2;
  reactorCore.position.set(0, 0.06, 0.385);
  backpackGroup.add(reactorCore);

  [-0.24, 0.24].forEach((xOff) => {
    const thrusterBell = new THREE.Mesh(
      new THREE.CylinderGeometry(0.085, 0.135, 0.22, 24, 1, true),
      darkMetalMat
    );
    thrusterBell.position.set(xOff, -0.49, 0.05);
    backpackGroup.add(thrusterBell);

    const thrusterRim = new THREE.Mesh(
      new THREE.TorusGeometry(0.132, 0.016, 10, 24),
      accentMat
    );
    thrusterRim.rotation.x = Math.PI / 2;
    thrusterRim.position.set(xOff, -0.6, 0.05);
    backpackGroup.add(thrusterRim);

    const thrusterGlow = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.07, 0.04, 20),
      glowMat
    );
    thrusterGlow.position.set(xOff, -0.52, 0.05);
    backpackGroup.add(thrusterGlow);

    const fin = new THREE.Mesh(
      new THREE.BoxGeometry(0.025, 0.28, 0.16),
      armorMat
    );
    fin.position.set(xOff * 1.45, 0.28, 0.06);
    fin.rotation.z = xOff > 0 ? -0.18 : 0.18;
    backpackGroup.add(fin);
  });

  const antennaMast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.014, 0.022, 0.52, 10),
    darkMetalMat
  );
  antennaMast.position.set(-0.31, 0.64, 0.06);
  backpackGroup.add(antennaMast);

  const antennaTip = new THREE.Mesh(
    new THREE.SphereGeometry(0.028, 12, 12),
    glowMat
  );
  antennaTip.position.set(-0.31, 0.91, 0.06);
  backpackGroup.add(antennaTip);

  [-1, 1].forEach((side) => {
    const hoseCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.22, -0.25, -0.05),
      new THREE.Vector3(side * 0.34, -0.42, -0.18),
      new THREE.Vector3(side * 0.3, -0.52, -0.34)
    ]);
    const hoseGeo = new THREE.TubeGeometry(hoseCurve, 20, 0.028, 10, false);
    const hoseMesh = new THREE.Mesh(hoseGeo, jointMat);
    backpackGroup.add(hoseMesh);
  });

  player.add(backpackGroup);

  // ADD PLAYER
  player.position.set(0, 1.5, 0);
  surfaceGroup.add(player);

  // ADD SURFACE
  scene.add(surfaceGroup);
  surfaceGroup.visible = false;

  return {
    surfaceGroup,
    player,
    getGroundHeight
  };
}
