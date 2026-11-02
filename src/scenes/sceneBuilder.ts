import * as THREE from 'three';
import { SceneTheme } from '../types/fireworks';

/**
 * Procedural Festive Scene Generator adhering to Three.js Craft Guidelines:
 * - 3–12 part procedural models for every building/structure
 * - Zero external textures or 404 assets
 * - Natural outdoor terrain and water surface with dynamic firework reflections
 * - Distinct atmospheric fog and horizon lighting
 */

export interface BuiltScene {
  group: THREE.Group;
  waterMesh: THREE.Mesh | null;
  ambientLights: THREE.Light[];
  skyColor: string;
  fogColor: string;
  lighthouseBeam?: THREE.SpotLight;
}

// Procedural window texture for skyscrapers
function createSkyscraperTexture(colorTheme: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0a0d1a';
  ctx.fillRect(0, 0, 128, 256);

  const cols = 8;
  const rows = 24;
  const cellW = 128 / cols;
  const cellH = 256 / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (Math.random() > 0.35) {
        // Window on
        const warm = Math.random() > 0.4;
        ctx.fillStyle = warm ? '#FFE599' : colorTheme;
        ctx.fillRect(c * cellW + 3, r * cellH + 3, cellW - 6, cellH - 6);
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 4);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Procedural water normal / bump texture
function createWaterBumpTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const imgData = ctx.createImageData(256, 256);
  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 256; x++) {
      const v = Math.sin(x * 0.1) * Math.cos(y * 0.1) * 0.5 + 0.5;
      const noise = (Math.random() - 0.5) * 0.15;
      const c = Math.floor(Math.max(0, Math.min(255, (v + noise) * 255)));
      const idx = (y * 256 + x) * 4;
      imgData.data[idx] = c;
      imgData.data[idx + 1] = c;
      imgData.data[idx + 2] = c;
      imgData.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(8, 8);
  return texture;
}

const waterBumpTexture = createWaterBumpTexture();

/** Build Scene 1: Metropolis Harbor (跨年璀璨天際線) */
function buildMetropolis(): BuiltScene {
  const group = new THREE.Group();
  const skyColor = '#050716';
  const fogColor = '#060919';

  // 1. Water Plane (Bay)
  const waterGeo = new THREE.PlaneGeometry(600, 400, 32, 32);
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x050d1a,
    roughness: 0.15,
    metalness: 0.85,
    bumpMap: waterBumpTexture,
    bumpScale: 0.8,
  });
  const waterMesh = new THREE.Mesh(waterGeo, waterMat);
  waterMesh.rotation.x = -Math.PI / 2;
  waterMesh.position.set(0, 0, 30);
  waterMesh.receiveShadow = true;
  group.add(waterMesh);

  // 2. Shoreline Promenade & Sea Wall (3-part composite)
  const seaWall = new THREE.Mesh(
    new THREE.BoxGeometry(450, 4, 15),
    new THREE.MeshStandardMaterial({ color: 0x1f2430, roughness: 0.8, metalness: 0.2 })
  );
  seaWall.position.set(0, 2, -15);
  group.add(seaWall);

  const promenade = new THREE.Mesh(
    new THREE.BoxGeometry(450, 2, 40),
    new THREE.MeshStandardMaterial({ color: 0x2b3240, roughness: 0.7, metalness: 0.1 })
  );
  promenade.position.set(0, 1, -40);
  group.add(promenade);

  // Shoreline decorative bollard lights
  for (let x = -200; x <= 200; x += 25) {
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.3, 3, 8),
      new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.2 })
    );
    post.position.set(x, 3.5, -8);
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffd166 })
    );
    bulb.position.set(x, 5.2, -8);
    group.add(post);
    group.add(bulb);
  }

  // 3. Composite Procedural Skyscrapers (7-12 parts per tower)
  const bldgConfigs = [
    { x: -160, z: -110, w: 28, h: 140, d: 28, theme: '#60A5FA' },
    { x: -110, z: -90, w: 34, h: 180, d: 32, theme: '#38BDF8' },
    { x: -60, z: -120, w: 26, h: 120, d: 26, theme: '#F472B6' },
    { x: 0, z: -100, w: 42, h: 220, d: 38, theme: '#FBBF24' }, // Landmark Tower
    { x: 55, z: -115, w: 30, h: 160, d: 30, theme: '#34D399' },
    { x: 110, z: -95, w: 36, h: 195, d: 34, theme: '#818CF8' },
    { x: 160, z: -120, w: 26, h: 135, d: 26, theme: '#F43F5E' },
  ];

  bldgConfigs.forEach((cfg) => {
    const towerGroup = new THREE.Group();

    // Part 1: Main tower shaft with procedural lit windows
    const winTex = createSkyscraperTexture(cfg.theme);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x111625,
      roughness: 0.4,
      metalness: 0.6,
      map: winTex,
    });
    const body = new THREE.Mesh(new THREE.BoxGeometry(cfg.w, cfg.h, cfg.d), bodyMat);
    body.position.y = cfg.h / 2;
    towerGroup.add(body);

    // Part 2: Podium base
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x1a2030, roughness: 0.8, metalness: 0.3 });
    const base = new THREE.Mesh(new THREE.BoxGeometry(cfg.w + 6, 12, cfg.d + 6), baseMat);
    base.position.y = 6;
    towerGroup.add(base);

    // Part 3: Architectural crown / tier reduction
    const crownMat = new THREE.MeshStandardMaterial({ color: 0x0e1320, roughness: 0.3, metalness: 0.8 });
    const crown = new THREE.Mesh(new THREE.BoxGeometry(cfg.w * 0.75, 16, cfg.d * 0.75), crownMat);
    crown.position.y = cfg.h + 8;
    towerGroup.add(crown);

    // Part 4: Rooftop Spire & Beacon light
    const spire = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 1.8, 24, 8),
      new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9, roughness: 0.1 })
    );
    spire.position.y = cfg.h + 28;
    towerGroup.add(spire);

    // Spire aviation warning red blinker
    const beacon = new THREE.Mesh(
      new THREE.SphereGeometry(0.8, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xff0044 })
    );
    beacon.position.y = cfg.h + 40;
    towerGroup.add(beacon);

    // Part 5: Edge accent light strip on top edge
    const stripGeo = new THREE.BoxGeometry(cfg.w + 0.5, 1.5, cfg.d + 0.5);
    const stripMat = new THREE.MeshBasicMaterial({ color: cfg.theme });
    const strip = new THREE.Mesh(stripGeo, stripMat);
    strip.position.y = cfg.h;
    towerGroup.add(strip);

    towerGroup.position.set(cfg.x, 0, cfg.z);
    group.add(towerGroup);
  });

  // Lights
  const hemi = new THREE.HemisphereLight(0x1a2b4c, 0x080c14, 0.4);
  const dir = new THREE.DirectionalLight(0xfff5e6, 0.5);
  dir.position.set(100, 150, 50);

  return {
    group,
    waterMesh,
    ambientLights: [hemi, dir],
    skyColor,
    fogColor,
  };
}

/** Build Scene 2: Lunar New Year Pagoda Pavilion (春節元宵湖畔古閣) */
function buildPagoda(): BuiltScene {
  const group = new THREE.Group();
  const skyColor = '#060714';
  const fogColor = '#080a1c';

  // 1. Reflective Mirror Lake
  const lakeGeo = new THREE.PlaneGeometry(500, 400, 32, 32);
  const lakeMat = new THREE.MeshStandardMaterial({
    color: 0x06111f,
    roughness: 0.08,
    metalness: 0.9,
    bumpMap: waterBumpTexture,
    bumpScale: 0.5,
  });
  const lakeMesh = new THREE.Mesh(lakeGeo, lakeMat);
  lakeMesh.rotation.x = -Math.PI / 2;
  lakeMesh.position.set(0, 0, 40);
  group.add(lakeMesh);

  // 2. Island Terrace Platform (Stone base)
  const island = new THREE.Mesh(
    new THREE.CylinderGeometry(45, 52, 6, 24),
    new THREE.MeshStandardMaterial({ color: 0x3d3936, roughness: 0.9, metalness: 0.1 })
  );
  island.position.set(0, 3, -40);
  group.add(island);

  // Arched Stone Bridge leading to island
  const bridge = new THREE.Mesh(
    new THREE.BoxGeometry(14, 4, 60),
    new THREE.MeshStandardMaterial({ color: 0x4a4540, roughness: 0.85, metalness: 0.1 })
  );
  bridge.position.set(0, 2, 0);
  group.add(bridge);

  // 3. Multi-Tier Chinese Pagoda (5 tiers, 3-12 parts per tier)
  const pagodaGroup = new THREE.Group();
  pagodaGroup.position.set(0, 6, -40);

  const tiers = [
    { baseW: 32, roofW: 42, h: 14 },
    { baseW: 26, roofW: 35, h: 12 },
    { baseW: 21, roofW: 29, h: 11 },
    { baseW: 16, roofW: 23, h: 10 },
    { baseW: 12, roofW: 18, h: 9 },
  ];

  let currentY = 0;
  const redWoodMat = new THREE.MeshStandardMaterial({ color: 0x8b1e1e, roughness: 0.6, metalness: 0.2 });
  const goldTrimMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.3, metalness: 0.8 });
  const tileMat = new THREE.MeshStandardMaterial({ color: 0x1f2421, roughness: 0.75, metalness: 0.2 });

  tiers.forEach((tier) => {
    // Body walls
    const body = new THREE.Mesh(new THREE.BoxGeometry(tier.baseW, tier.h, tier.baseW), redWoodMat);
    body.position.y = currentY + tier.h / 2;
    pagodaGroup.add(body);

    // Gold lattice balustrades
    const balustrade = new THREE.Mesh(
      new THREE.BoxGeometry(tier.baseW + 2, 2.5, tier.baseW + 2),
      goldTrimMat
    );
    balustrade.position.y = currentY + 1.25;
    pagodaGroup.add(balustrade);

    // Flared upturned pagoda eaves / roof (Pyramid truncated)
    const roof = new THREE.Mesh(
      new THREE.CylinderGeometry(tier.baseW * 0.45, tier.roofW, 4, 4),
      tileMat
    );
    roof.rotation.y = Math.PI / 4;
    roof.position.y = currentY + tier.h + 2;
    pagodaGroup.add(roof);

    // Glowing Spring Festival Red Lanterns hanging from 4 roof corners
    const cornerDist = tier.roofW * 0.65;
    const corners = [
      [cornerDist, cornerDist],
      [-cornerDist, cornerDist],
      [cornerDist, -cornerDist],
      [-cornerDist, -cornerDist],
    ];

    corners.forEach(([cx, cz]) => {
      const lantern = new THREE.Mesh(
        new THREE.SphereGeometry(1.2, 10, 10),
        new THREE.MeshBasicMaterial({ color: 0xff2222 })
      );
      lantern.scale.set(1, 1.4, 1);
      lantern.position.set(cx, currentY + tier.h - 1, cz);
      pagodaGroup.add(lantern);
    });

    currentY += tier.h + 3.8;
  });

  // Top Finial (Golden Stupa Spire)
  const finial = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 2.5, 18, 12),
    goldTrimMat
  );
  finial.position.y = currentY + 9;
  pagodaGroup.add(finial);

  // Golden orb atop finial
  const orb = new THREE.Mesh(
    new THREE.SphereGeometry(1.8, 12, 12),
    goldTrimMat
  );
  orb.position.y = currentY + 18;
  pagodaGroup.add(orb);

  group.add(pagodaGroup);

  // Background Mountain silhouettes
  for (let m = -2; m <= 2; m++) {
    const mountain = new THREE.Mesh(
      new THREE.ConeGeometry(90 + Math.abs(m) * 20, 120 + (2 - Math.abs(m)) * 30, 7),
      new THREE.MeshStandardMaterial({ color: 0x0c121e, roughness: 0.95, metalness: 0.05 })
    );
    mountain.position.set(m * 110, 40, -180);
    group.add(mountain);
  }

  const hemi = new THREE.HemisphereLight(0x2d1a3a, 0x0a0c16, 0.45);
  const dir = new THREE.DirectionalLight(0xffeedd, 0.4);
  dir.position.set(80, 120, 60);

  return {
    group,
    waterMesh: lakeMesh,
    ambientLights: [hemi, dir],
    skyColor,
    fogColor,
  };
}

/** Build Scene 3: Fairytale Fantasy Castle (夢幻奇幻城堡) */
function buildCastle(): BuiltScene {
  const group = new THREE.Group();
  const skyColor = '#050616';
  const fogColor = '#09081e';

  // 1. Castle Moat Water
  const moatGeo = new THREE.PlaneGeometry(500, 400, 32, 32);
  const moatMat = new THREE.MeshStandardMaterial({
    color: 0x080f1d,
    roughness: 0.12,
    metalness: 0.85,
    bumpMap: waterBumpTexture,
    bumpScale: 0.6,
  });
  const moatMesh = new THREE.Mesh(moatGeo, moatMat);
  moatMesh.rotation.x = -Math.PI / 2;
  moatMesh.position.set(0, 0, 30);
  group.add(moatMesh);

  // 2. Castle Rocky Island Hill
  const hill = new THREE.Mesh(
    new THREE.CylinderGeometry(70, 95, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0x242838, roughness: 0.9, metalness: 0.1 })
  );
  hill.position.set(0, 8, -50);
  group.add(hill);

  const castleGroup = new THREE.Group();
  castleGroup.position.set(0, 16, -50);

  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.7, metalness: 0.2 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.35, metalness: 0.6 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.2, metalness: 0.9 });

  // Central Keep
  const mainKeep = new THREE.Mesh(new THREE.BoxGeometry(40, 50, 32), stoneMat);
  mainKeep.position.y = 25;
  castleGroup.add(mainKeep);

  // Central High Spire Tower
  const highTower = new THREE.Mesh(new THREE.CylinderGeometry(7, 8, 55, 16), stoneMat);
  highTower.position.set(0, 65, 0);
  castleGroup.add(highTower);

  const highRoof = new THREE.Mesh(new THREE.ConeGeometry(9, 28, 16), roofMat);
  highRoof.position.set(0, 106, 0);
  castleGroup.add(highRoof);

  const crest = new THREE.Mesh(new THREE.SphereGeometry(1.5, 8, 8), goldMat);
  crest.position.set(0, 121, 0);
  castleGroup.add(crest);

  // 4 Flanking Cylindrical Corner Towers with conical blue roofs
  const cornerCoords = [
    [-22, -18],
    [22, -18],
    [-22, 18],
    [22, 18],
  ];

  cornerCoords.forEach(([cx, cz]) => {
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(6, 6.5, 45, 12), stoneMat);
    tower.position.set(cx, 22.5, cz);
    castleGroup.add(tower);

    const roof = new THREE.Mesh(new THREE.ConeGeometry(7.5, 20, 12), roofMat);
    roof.position.set(cx, 55, cz);
    castleGroup.add(roof);

    const orb = new THREE.Mesh(new THREE.SphereGeometry(1.1, 8, 8), goldMat);
    orb.position.set(cx, 66, cz);
    castleGroup.add(orb);
  });

  // Glowing Stained Glass Cathedral Windows
  const winGeo = new THREE.PlaneGeometry(5, 12);
  const winMat = new THREE.MeshBasicMaterial({ color: 0x93c5fd });
  const winFront = new THREE.Mesh(winGeo, winMat);
  winFront.position.set(0, 26, 16.2);
  castleGroup.add(winFront);

  group.add(castleGroup);

  const hemi = new THREE.HemisphereLight(0x251c4a, 0x080c18, 0.4);
  const dir = new THREE.DirectionalLight(0xe0e7ff, 0.5);
  dir.position.set(70, 130, 60);

  return {
    group,
    waterMesh: moatMesh,
    ambientLights: [hemi, dir],
    skyColor,
    fogColor,
  };
}

/** Build Scene 4: Tropical Beach & Lighthouse (熱帶海灘與旋轉燈塔) */
function buildBeach(): BuiltScene {
  const group = new THREE.Group();
  const skyColor = '#040914';
  const fogColor = '#060d1e';

  // 1. Ocean Water
  const oceanGeo = new THREE.PlaneGeometry(600, 450, 32, 32);
  const oceanMat = new THREE.MeshStandardMaterial({
    color: 0x051b2e,
    roughness: 0.1,
    metalness: 0.85,
    bumpMap: waterBumpTexture,
    bumpScale: 0.85,
  });
  const oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
  oceanMesh.rotation.x = -Math.PI / 2;
  oceanMesh.position.set(0, 0, 50);
  group.add(oceanMesh);

  // 2. Sandy Beach Dune
  const sandGeo = new THREE.PlaneGeometry(500, 120, 24, 24);
  const sandMat = new THREE.MeshStandardMaterial({ color: 0x2d2b24, roughness: 0.95, metalness: 0.05 });
  const sandMesh = new THREE.Mesh(sandGeo, sandMat);
  sandMesh.rotation.x = -Math.PI / 2;
  sandMesh.position.set(0, 0.8, -45);
  group.add(sandMesh);

  // 3. Rocky Lighthouse Promontory on the right
  const cliff = new THREE.Mesh(
    new THREE.CylinderGeometry(28, 38, 20, 12),
    new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.9, metalness: 0.1 })
  );
  cliff.position.set(130, 10, -50);
  group.add(cliff);

  // Composite Lighthouse (6 parts)
  const lhGroup = new THREE.Group();
  lhGroup.position.set(130, 20, -50);

  // Tapered tower shaft (white with red band)
  const towerMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.4, metalness: 0.1 });
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 6, 50, 16), towerMat);
  tower.position.y = 25;
  lhGroup.add(tower);

  // Red stripe band
  const stripeMat = new THREE.MeshStandardMaterial({ color: 0xd92d20, roughness: 0.4, metalness: 0.1 });
  const stripe = new THREE.Mesh(new THREE.CylinderGeometry(4.7, 5.2, 10, 16), stripeMat);
  stripe.position.y = 25;
  lhGroup.add(stripe);

  // Balcony walkway
  const balcony = new THREE.Mesh(
    new THREE.CylinderGeometry(5.5, 5.5, 2, 16),
    new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.8, roughness: 0.3 })
  );
  balcony.position.y = 51;
  lhGroup.add(balcony);

  // Lantern room glass & housing
  const glassMat = new THREE.MeshBasicMaterial({ color: 0xfffee0 });
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 6, 12), glassMat);
  glass.position.y = 55;
  lhGroup.add(glass);

  // Domed copper roof
  const lhRoof = new THREE.Mesh(
    new THREE.SphereGeometry(3.6, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.4, metalness: 0.7 })
  );
  lhRoof.position.y = 58;
  lhGroup.add(lhRoof);

  // Rotating Searchlight Beam
  const beamSpot = new THREE.SpotLight(0xfff8d6, 12, 300, Math.PI / 7, 0.4, 0.5);
  beamSpot.position.set(0, 55, 0);
  beamSpot.target.position.set(-100, 30, 50);
  lhGroup.add(beamSpot);
  lhGroup.add(beamSpot.target);

  group.add(lhGroup);

  // 4. Procedural Palm Trees (Curved Trunk + Fronds)
  const palmCoords = [
    [-90, -40],
    [-70, -35],
    [-45, -50],
    [30, -45],
    [65, -38],
  ];

  palmCoords.forEach(([px, pz]) => {
    const palm = new THREE.Group();
    palm.position.set(px, 1, pz);

    // Segmented curved trunk
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9, metalness: 0.1 });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.4, 18, 8), trunkMat);
    trunk.position.y = 9;
    trunk.rotation.z = (Math.random() - 0.5) * 0.25;
    palm.add(trunk);

    // Fronds (Green cones/discs)
    const frondMat = new THREE.MeshStandardMaterial({ color: 0x1e3a1e, roughness: 0.6, metalness: 0.1 });
    for (let f = 0; f < 6; f++) {
      const frond = new THREE.Mesh(new THREE.ConeGeometry(2.5, 9, 4), frondMat);
      const angle = (f / 6) * Math.PI * 2;
      frond.position.set(Math.cos(angle) * 3, 17.5, Math.sin(angle) * 3);
      frond.rotation.x = Math.PI / 2.3;
      frond.rotation.y = angle;
      palm.add(frond);
    }
    group.add(palm);
  });

  const hemi = new THREE.HemisphereLight(0x0e2a47, 0x070c14, 0.45);
  const dir = new THREE.DirectionalLight(0xfff0db, 0.4);
  dir.position.set(90, 110, 50);

  return {
    group,
    waterMesh: oceanMesh,
    ambientLights: [hemi, dir],
    skyColor,
    fogColor,
    lighthouseBeam: beamSpot,
  };
}

/** Build Scene 5: Guandu Bridge & Tamsui River (關渡大橋與淡水河) */
function buildGuandu(): BuiltScene {
  const group = new THREE.Group();
  const skyColor = '#050816';
  const fogColor = '#070b1c';

  // 1. Tamsui River Water
  const riverGeo = new THREE.PlaneGeometry(700, 450, 32, 32);
  const riverMat = new THREE.MeshStandardMaterial({
    color: 0x061528,
    roughness: 0.12,
    metalness: 0.88,
    bumpMap: waterBumpTexture,
    bumpScale: 0.65,
  });
  const waterMesh = new THREE.Mesh(riverGeo, riverMat);
  waterMesh.rotation.x = -Math.PI / 2;
  waterMesh.position.set(0, 0, 30);
  group.add(waterMesh);

  // 2. Guandu Bridge Group (Iconic Triple Red Steel Tied Arches)
  const bridgeGroup = new THREE.Group();
  bridgeGroup.position.set(0, 0, -45);

  const redSteelMat = new THREE.MeshStandardMaterial({
    color: 0xcc2222,
    metalness: 0.65,
    roughness: 0.28,
  });
  const cableMat = new THREE.MeshStandardMaterial({
    color: 0xcccccc,
    metalness: 0.9,
    roughness: 0.1,
  });
  const deckMat = new THREE.MeshStandardMaterial({
    color: 0x242833,
    roughness: 0.8,
    metalness: 0.2,
  });
  const concreteMat = new THREE.MeshStandardMaterial({
    color: 0x4b5563,
    roughness: 0.9,
    metalness: 0.1,
  });

  const deckY = 14;
  const bridgeWidthZ = 13;

  // Roadway Deck Box
  const deckMesh = new THREE.Mesh(new THREE.BoxGeometry(380, 3.5, bridgeWidthZ), deckMat);
  deckMesh.position.y = deckY;
  bridgeGroup.add(deckMesh);

  // Roadway railings (White trims)
  const railingNorth = new THREE.Mesh(new THREE.BoxGeometry(380, 1.2, 0.4), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  railingNorth.position.set(0, deckY + 2.2, bridgeWidthZ / 2);
  const railingSouth = railingNorth.clone();
  railingSouth.position.z = -bridgeWidthZ / 2;
  bridgeGroup.add(railingNorth);
  bridgeGroup.add(railingSouth);

  // Concrete Bridge Piers in Tamsui River
  const pierPositionsX = [-140, -50, 50, 140];
  pierPositionsX.forEach((px) => {
    const pier = new THREE.Mesh(new THREE.BoxGeometry(12, deckY + 4, bridgeWidthZ + 4), concreteMat);
    pier.position.set(px, (deckY + 4) / 2 - 2, 0);
    bridgeGroup.add(pier);
  });

  // Procedural Arch Rib Generator (Parabolic Curve Tube)
  function createArch(startX: number, endX: number, apexY: number, zOffset: number) {
    const points: THREE.Vector3[] = [];
    const segments = 24;
    const spanW = endX - startX;
    for (let s = 0; s <= segments; s++) {
      const t = s / segments;
      const x = startX + t * spanW;
      // Parabolic arc formula
      const normX = (t - 0.5) * 2;
      const y = deckY + apexY * (1 - normX * normX);
      points.push(new THREE.Vector3(x, y, zOffset));
    }
    const curve = new THREE.CatmullRomCurve3(points);
    const tubeGeo = new THREE.TubeGeometry(curve, 28, 1.1, 8, false);
    const archMesh = new THREE.Mesh(tubeGeo, redSteelMat);
    bridgeGroup.add(archMesh);

    // Vertical Suspension Hangers (Cables)
    for (let s = 2; s < segments - 1; s += 2) {
      const pt = points[s];
      const hangerHeight = pt.y - deckY;
      if (hangerHeight > 2) {
        const hanger = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, hangerHeight, 6), cableMat);
        hanger.position.set(pt.x, deckY + hangerHeight / 2, zOffset);
        bridgeGroup.add(hanger);
      }
    }
  }

  // Triple Continuous Arches on both sides (Upstream & Downstream)
  const zSides = [bridgeWidthZ / 2, -bridgeWidthZ / 2];
  zSides.forEach((zOffset) => {
    // Left Span
    createArch(-140, -50, 24, zOffset);
    // Center Hero Span (Highest)
    createArch(-50, 50, 38, zOffset);
    // Right Span
    createArch(50, 140, 24, zOffset);
  });

  // Top Cross Bracing Struts between dual arches on Center Span
  for (let x = -35; x <= 35; x += 15) {
    const normX = (x / 50);
    const y = deckY + 38 * (1 - normX * normX);
    const strut = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, bridgeWidthZ), redSteelMat);
    strut.position.set(x, y - 1, 0);
    bridgeGroup.add(strut);
  }

  // Decorative Streetlight Spheres along bridge deck
  for (let x = -170; x <= 170; x += 22) {
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffeb3b }));
    bulb.position.set(x, deckY + 3.2, bridgeWidthZ / 2 + 0.3);
    bridgeGroup.add(bulb);
  }

  group.add(bridgeGroup);

  // 3. Guanyin Mountain (觀音山) Backdrop Silhouette
  const mountainMat = new THREE.MeshStandardMaterial({
    color: 0x08101e,
    roughness: 0.95,
    metalness: 0.05,
  });
  const m1 = new THREE.Mesh(new THREE.ConeGeometry(130, 95, 8), mountainMat);
  m1.position.set(-90, 35, -170);
  m1.scale.set(1.4, 1, 0.7);
  group.add(m1);

  const m2 = new THREE.Mesh(new THREE.ConeGeometry(150, 115, 8), mountainMat);
  m2.position.set(60, 42, -185);
  m2.scale.set(1.5, 1, 0.8);
  group.add(m2);

  // Riverbank shoreline lights
  for (let x = -200; x <= 200; x += 35) {
    const light = new THREE.Mesh(
      new THREE.SphereGeometry(0.6, 6, 6),
      new THREE.MeshBasicMaterial({ color: x % 70 === 0 ? 0xff4444 : 0xffea00 })
    );
    light.position.set(x, 3, -110 + (Math.sin(x) * 15));
    group.add(light);
  }

  const hemi = new THREE.HemisphereLight(0x18243c, 0x060c18, 0.45);
  const dir = new THREE.DirectionalLight(0xffeedd, 0.45);
  dir.position.set(100, 140, 60);

  return {
    group,
    waterMesh,
    ambientLights: [hemi, dir],
    skyColor,
    fogColor,
  };
}

/** Build Scene 6: Pure Cosmos (純粹星空深空銀河) */
function buildCosmos(): BuiltScene {
  const group = new THREE.Group();
  const skyColor = '#010208';
  const fogColor = '#010208';

  // Cosmic Nebula Cloud Puffs (Floating stardust)
  const nebulaCount = 600;
  const nebulaGeo = new THREE.BufferGeometry();
  const nebulaPos = new Float32Array(nebulaCount * 3);
  const nebulaCol = new Float32Array(nebulaCount * 3);

  for (let i = 0; i < nebulaCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = 180 + Math.random() * 250;
    nebulaPos[i * 3] = Math.cos(angle) * r;
    nebulaPos[i * 3 + 1] = 40 + Math.random() * 180;
    nebulaPos[i * 3 + 2] = Math.sin(angle) * r;

    // Celestial cosmic nebula colors (electric violet, deep cyan, cosmic gold)
    const t = Math.random();
    if (t < 0.4) {
      nebulaCol[i * 3] = 0.55; // R
      nebulaCol[i * 3 + 1] = 0.15; // G
      nebulaCol[i * 3 + 2] = 0.85; // B
    } else if (t < 0.75) {
      nebulaCol[i * 3] = 0.1;
      nebulaCol[i * 3 + 1] = 0.65;
      nebulaCol[i * 3 + 2] = 0.95;
    } else {
      nebulaCol[i * 3] = 0.9;
      nebulaCol[i * 3 + 1] = 0.75;
      nebulaCol[i * 3 + 2] = 0.2;
    }
  }

  nebulaGeo.setAttribute('position', new THREE.BufferAttribute(nebulaPos, 3));
  nebulaGeo.setAttribute('color', new THREE.BufferAttribute(nebulaCol, 3));

  const nebulaMat = new THREE.PointsMaterial({
    size: 4.5,
    transparent: true,
    opacity: 0.75,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const nebulaMesh = new THREE.Points(nebulaGeo, nebulaMat);
  group.add(nebulaMesh);

  // Minimal starlight reflective floor grid at zero elevation
  const floorGeo = new THREE.PlaneGeometry(600, 600, 32, 32);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x030612,
    roughness: 0.18,
    metalness: 0.82,
    bumpMap: waterBumpTexture,
    bumpScale: 0.4,
  });
  const floorMesh = new THREE.Mesh(floorGeo, floorMat);
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.position.set(0, 0, 0);
  group.add(floorMesh);

  const hemi = new THREE.HemisphereLight(0x281845, 0x050714, 0.4);
  const dir = new THREE.DirectionalLight(0xe0e8ff, 0.35);
  dir.position.set(0, 150, 50);

  return {
    group,
    waterMesh: floorMesh,
    ambientLights: [hemi, dir],
    skyColor,
    fogColor,
  };
}

export function buildScene(theme: SceneTheme): BuiltScene {
  switch (theme) {
    case 'guandu':
      return buildGuandu();
    case 'cosmos':
      return buildCosmos();
    case 'pagoda':
      return buildPagoda();
    case 'castle':
      return buildCastle();
    case 'beach':
      return buildBeach();
    case 'customPhoto':
    case 'ar':
      // Minimal scene with transparent / clean base for photo or camera stream
      return {
        group: new THREE.Group(),
        waterMesh: null,
        ambientLights: [new THREE.HemisphereLight(0x334466, 0x111122, 0.5)],
        skyColor: '#000000',
        fogColor: '#050712',
      };
    case 'metropolis':
    default:
      return buildMetropolis();
  }
}
