import * as THREE from 'three';
import { ShellConfig } from '../types/fireworks';
import { soundEngine } from '../audio/soundEngine';
import { generateTextParticleOffsets } from './textMatrix';

// Module-level reusable scratch math helpers (Zero GC in loop)
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _col = new THREE.Color();
const _baseCol = new THREE.Color();
const _targetCol = new THREE.Color();
const _quat = new THREE.Quaternion();
const _euler = new THREE.Euler();

// Procedural soft glowing circular star particle texture
function createParticleTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.18, 'rgba(255, 250, 230, 0.95)');
  gradient.addColorStop(0.45, 'rgba(255, 200, 100, 0.55)');
  gradient.addColorStop(0.8, 'rgba(255, 120, 40, 0.15)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const particleTexture = createParticleTexture();

export interface ActiveRocket {
  id: string;
  config: ShellConfig;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  targetAltitude: number;
  progress: number;
  light?: THREE.PointLight;
}

export class FireworksManager {
  private scene: THREE.Scene;

  // Max capacities
  private maxParticles = 35000;
  private particleCount = 0;

  // Typed arrays for explosion particles
  private positions: Float32Array;
  private velocities: Float32Array;
  private colors: Float32Array;
  private primaryColors: Float32Array;
  private secondaryColors: Float32Array;
  private sizes: Float32Array;
  private baseSizes: Float32Array;
  private lives: Float32Array;
  private maxLives: Float32Array;
  private drags: Float32Array;
  private gravities: Float32Array;
  private strobes: Float32Array;
  private crackles: Uint8Array;

  // BufferGeometry and Points
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private pointsMesh: THREE.Points;

  // Active rockets in ascent
  public activeRockets: ActiveRocket[] = [];

  // Rocket trail particles
  private maxRocketTrail = 2000;
  private rocketTrailCount = 0;
  private rTrailPositions: Float32Array;
  private rTrailColors: Float32Array;
  private rTrailSizes: Float32Array;
  private rTrailLives: Float32Array;
  private rTrailGeometry: THREE.BufferGeometry;
  private rTrailMesh: THREE.Points;

  // Burst flash illumination light in sky
  private flashLight: THREE.PointLight;
  private flashIntensity = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // Allocate particle buffers
    this.positions = new Float32Array(this.maxParticles * 3);
    this.velocities = new Float32Array(this.maxParticles * 3);
    this.colors = new Float32Array(this.maxParticles * 3);
    this.primaryColors = new Float32Array(this.maxParticles * 3);
    this.secondaryColors = new Float32Array(this.maxParticles * 3);
    this.sizes = new Float32Array(this.maxParticles);
    this.baseSizes = new Float32Array(this.maxParticles);
    this.lives = new Float32Array(this.maxParticles);
    this.maxLives = new Float32Array(this.maxParticles);
    this.drags = new Float32Array(this.maxParticles);
    this.gravities = new Float32Array(this.maxParticles);
    this.strobes = new Float32Array(this.maxParticles);
    this.crackles = new Uint8Array(this.maxParticles);

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

    this.material = new THREE.PointsMaterial({
      size: 3.2,
      map: particleTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true,
      opacity: 0.98,
    });

    this.pointsMesh = new THREE.Points(this.geometry, this.material);
    this.pointsMesh.frustumCulled = false;
    this.scene.add(this.pointsMesh);

    // Rocket Trails
    this.rTrailPositions = new Float32Array(this.maxRocketTrail * 3);
    this.rTrailColors = new Float32Array(this.maxRocketTrail * 3);
    this.rTrailSizes = new Float32Array(this.maxRocketTrail);
    this.rTrailLives = new Float32Array(this.maxRocketTrail);

    this.rTrailGeometry = new THREE.BufferGeometry();
    this.rTrailGeometry.setAttribute('position', new THREE.BufferAttribute(this.rTrailPositions, 3));
    this.rTrailGeometry.setAttribute('color', new THREE.BufferAttribute(this.rTrailColors, 3));

    const rTrailMat = new THREE.PointsMaterial({
      size: 2.2,
      map: particleTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true,
      opacity: 0.9,
    });

    this.rTrailMesh = new THREE.Points(this.rTrailGeometry, rTrailMat);
    this.rTrailMesh.frustumCulled = false;
    this.scene.add(this.rTrailMesh);

    // Dynamic sky flash light
    this.flashLight = new THREE.PointLight(0xffffff, 0, 350, 1.2);
    this.flashLight.position.set(0, 100, 0);
    this.scene.add(this.flashLight);
  }

  /** Launch a shell into the air */
  public launchShell(config: ShellConfig, startPos: [number, number, number] = [0, 0, 0]) {
    soundEngine.playLaunch(0.9 + Math.random() * 0.2);

    const targetAltitude = config.launchAltitude + (Math.random() - 0.5) * 15;
    // Dynamic physics-based ascent speed so shells can reach 280m+ heights
    const ascentSpeed = Math.sqrt(2 * 16 * Math.max(70, targetAltitude)) * (1.1 + Math.random() * 0.12);
    const horizontalSway = (Math.random() - 0.5) * 4;

    const rocket: ActiveRocket = {
      id: Math.random().toString(36).substring(2, 9),
      config,
      pos: new THREE.Vector3(startPos[0], startPos[1], startPos[2]),
      vel: new THREE.Vector3(horizontalSway, ascentSpeed, (Math.random() - 0.5) * 4),
      targetAltitude,
      progress: 0,
    };

    this.activeRockets.push(rocket);
    return rocket;
  }

  /** Trigger multiple shells in fan formation */
  public launchBarrage(config: ShellConfig, count = 5) {
    const spread = 40;
    const step = spread / (count - 1 || 1);
    for (let i = 0; i < count; i++) {
      const offsetX = -spread / 2 + i * step;
      const delay = Math.random() * 250;
      setTimeout(() => {
        const tunedConfig = { ...config, launchAltitude: config.launchAltitude + (Math.random() - 0.5) * 20 };
        this.launchShell(tunedConfig, [offsetX, 0, (Math.random() - 0.5) * 15]);
      }, delay);
    }
  }

  /** Explode a rocket at given coordinates */
  public explode(config: ShellConfig, pos: THREE.Vector3) {
    const isKamuro = config.shape === 'kamuro';
    soundEngine.playExplosion(config.burstForce / 40, isKamuro);
    if (config.crackle) {
      setTimeout(() => soundEngine.playCrackle(), 500);
    }

    // Trigger dynamic scene flash
    this.flashLight.position.copy(pos);
    this.flashLight.color.set(config.flashColor);
    this.flashLight.intensity = Math.min(18, (config.burstForce / 35) * 12);
    this.flashIntensity = this.flashLight.intensity;

    // Generate burst vectors based on shape
    this.spawnBurstParticles(config, pos);
  }

  private spawnBurstParticles(config: ShellConfig, center: THREE.Vector3) {
    const count = Math.min(config.particleCount, this.maxParticles - this.particleCount);
    if (count <= 0) return;

    _baseCol.set(config.primaryColor);
    _targetCol.set(config.secondaryColor);

    const baseSpeed = config.burstForce;
    const maxLifeBase = config.shape === 'kamuro' ? 3.8 : config.shape === 'chrysanthemum' ? 3.0 : 2.2;
    const dragBase = config.shape === 'kamuro' ? 0.94 : 0.92;
    const gravityBase = config.shape === 'kamuro' ? 14.0 : config.shape === 'waterfall' ? 18.0 : 9.8;

    // Special shape handlers
    if (config.shape === 'text' && config.textPrompt) {
      const textOffsets = generateTextParticleOffsets(config.textPrompt, count, 0.7);
      _euler.set((Math.random() - 0.5) * 0.15, (Math.random() - 0.5) * 0.35, 0);
      _quat.setFromEuler(_euler);

      for (let i = 0; i < textOffsets.length; i++) {
        const offset = textOffsets[i];
        _v1.set(offset.x, offset.y, offset.z);
        _v1.applyQuaternion(_quat);

        const velX = _v1.x * 0.75 + (Math.random() - 0.5) * 2;
        const velY = _v1.y * 0.75 + (Math.random() - 0.5) * 2;
        const velZ = _v1.z * 0.75 + (Math.random() - 0.5) * 2;

        this.addParticle(
          center.x + _v1.x,
          center.y + _v1.y,
          center.z + _v1.z,
          velX,
          velY,
          velZ,
          _baseCol,
          _targetCol,
          maxLifeBase * 1.3,
          config.sparkleSize * (1 + Math.random() * 0.5),
          0.96, // low drag so text holds shape
          2.5, // low gravity so readable in sky
          config.strobe ? 1 : 0,
          config.crackle ? 1 : 0
        );
      }
      return;
    }

    // Dynamic 3D Shell Orientation Quaternion (so bursts don't align to flat world planes)
    _euler.set(
      (Math.random() - 0.5) * 0.6,
      Math.random() * Math.PI * 2,
      (Math.random() - 0.5) * 0.5
    );
    _quat.setFromEuler(_euler);

    // Standard & Parametric 3D Shapes
    for (let i = 0; i < count; i++) {
      let vx = 0;
      let vy = 0;
      let vz = 0;
      let speed = baseSpeed * (0.65 + Math.random() * 0.65);

      switch (config.shape) {
        case 'heart': {
          // True 3D Volumetric Heart with spherical thickness
          const u = Math.PI * 2 * (i / count);
          const v = ((i % 19) / 19 - 0.5) * Math.PI;
          const cosV = Math.cos(v);
          const sinV = Math.sin(v);
          const hx = 16 * Math.pow(Math.sin(u), 3);
          const hy = 13 * Math.cos(u) - 5 * Math.cos(2 * u) - 2 * Math.cos(3 * u) - Math.cos(4 * u);
          const factor = (baseSpeed / 16) * 0.85;

          _v1.set(
            hx * cosV * factor * (0.8 + Math.random() * 0.35),
            hy * factor * (0.8 + Math.random() * 0.35),
            hx * sinV * 0.75 * factor + (Math.random() - 0.5) * 8
          );
          _v1.applyQuaternion(_quat);
          vx = _v1.x;
          vy = _v1.y;
          vz = _v1.z;
          break;
        }

        case 'saturn': {
          // True 3D Saturn: 35% spherical core + 65% angled 3D orbital ring
          if (i < count * 0.35) {
            const u = Math.random();
            const v = Math.random();
            const theta = u * 2.0 * Math.PI;
            const phi = Math.acos(2.0 * v - 1.0);
            const r = Math.cbrt(Math.random());
            const sinPhi = Math.sin(phi);
            vx = r * sinPhi * Math.cos(theta) * (speed * 0.45);
            vy = r * sinPhi * Math.sin(theta) * (speed * 0.45);
            vz = r * Math.cos(phi) * (speed * 0.45);
          } else {
            const angle = Math.PI * 2 * Math.random();
            const ringR = speed * (1.15 + (Math.random() - 0.5) * 0.25);
            const ringThickness = (Math.random() - 0.5) * 5;
            _v1.set(Math.cos(angle) * ringR, ringThickness, Math.sin(angle) * ringR);
            _v1.applyEuler(_euler.set(0.5, 0.25, 0.1));
            _v1.applyQuaternion(_quat);
            vx = _v1.x;
            vy = _v1.y;
            vz = _v1.z;
          }
          break;
        }

        case 'star': {
          // True 14-Pointed 3D Stellated Starburst (Full volumetric 3D rays)
          const rayIndex = i % 14;
          let rx = 0;
          let ry = 0;
          let rz = 0;
          if (rayIndex === 0) rx = 1;
          else if (rayIndex === 1) rx = -1;
          else if (rayIndex === 2) ry = 1;
          else if (rayIndex === 3) ry = -1;
          else if (rayIndex === 4) rz = 1;
          else if (rayIndex === 5) rz = -1;
          else {
            const d = rayIndex - 6;
            rx = (d & 1 ? 1 : -1) * 0.577;
            ry = (d & 2 ? 1 : -1) * 0.577;
            rz = (d & 4 ? 1 : -1) * 0.577;
          }

          const dist = Math.pow(Math.random(), 0.55) * speed * (rayIndex < 6 ? 1.35 : 0.95);
          const spread = (Math.random() - 0.5) * 3.5;
          _v1.set(rx * dist + spread, ry * dist + spread, rz * dist + spread);
          _v1.applyQuaternion(_quat);
          vx = _v1.x;
          vy = _v1.y;
          vz = _v1.z;
          break;
        }

        case 'doubleRing': {
          // True 3D Armillary Gimbal Rings (Two orthogonal intersecting tilted 3D rings + core)
          if (i < count * 0.2) {
            const u = Math.random();
            const v = Math.random();
            const th = u * 2 * Math.PI;
            const ph = Math.acos(2 * v - 1);
            const r = Math.cbrt(Math.random()) * speed * 0.4;
            vx = r * Math.sin(ph) * Math.cos(th);
            vy = r * Math.sin(ph) * Math.sin(th);
            vz = r * Math.cos(ph);
          } else if (i < count * 0.6) {
            // Ring 1 on Plane A
            const angle = Math.PI * 2 * Math.random();
            const ringR = speed * (1.12 + (Math.random() - 0.5) * 0.15);
            _v1.set(Math.cos(angle) * ringR, Math.sin(angle) * ringR * 0.85, Math.sin(angle) * ringR * 0.52);
            _v1.applyQuaternion(_quat);
            vx = _v1.x;
            vy = _v1.y;
            vz = _v1.z;
          } else {
            // Ring 2 on orthogonal Plane B
            const angle = Math.PI * 2 * Math.random();
            const ringR = speed * (1.08 + (Math.random() - 0.5) * 0.15);
            _v1.set(Math.sin(angle) * ringR * 0.52, Math.cos(angle) * ringR * 0.85, -Math.sin(angle) * ringR);
            _v1.applyQuaternion(_quat);
            vx = _v1.x;
            vy = _v1.y;
            vz = _v1.z;
          }
          break;
        }

        case 'spiral': {
          // 3D Double Helix Whirl
          const turns = 4;
          const progress = i / count;
          const theta = progress * Math.PI * 2 * turns;
          const r = speed * Math.pow(progress, 0.7);
          _v1.set(Math.cos(theta) * r, (progress - 0.5) * speed * 1.5, Math.sin(theta) * r);
          _v1.applyQuaternion(_quat);
          vx = _v1.x;
          vy = _v1.y;
          vz = _v1.z;
          break;
        }

        case 'waterfall': {
          // 3D Volumetric Cascade with front-to-back depth
          const spreadX = (Math.random() - 0.5) * speed * 1.5;
          const spreadZ = (Math.random() - 0.5) * speed * 1.2;
          vx = spreadX;
          vy = (Math.random() * 0.25 + 0.1) * speed;
          vz = spreadZ;
          break;
        }

        case 'kamuro': {
          // Giant golden willow drooping in 3D sphere
          const u = Math.random();
          const v = Math.random();
          const theta = u * 2.0 * Math.PI;
          const phi = Math.acos(2.0 * v - 1.0);
          const sinPhi = Math.sin(phi);
          const r = 0.85 + Math.random() * 0.35;
          vx = r * sinPhi * Math.cos(theta) * (speed * 1.2);
          vy = r * sinPhi * Math.sin(theta) * (speed * 1.2);
          vz = r * Math.cos(phi) * (speed * 1.2);
          break;
        }

        case 'peony':
        case 'chrysanthemum':
        case 'strobe':
        case 'crossette':
        default: {
          // Uniform Fibonacci sphere distribution across all 3 axes
          const u = Math.random();
          const v = Math.random();
          const theta = u * 2.0 * Math.PI;
          const phi = Math.acos(2.0 * v - 1.0);
          const sinPhi = Math.sin(phi);
          vx = sinPhi * Math.cos(theta) * speed;
          vy = sinPhi * Math.sin(theta) * speed;
          vz = Math.cos(phi) * speed;
          break;
        }
      }

      this.addParticle(
        center.x,
        center.y,
        center.z,
        vx,
        vy,
        vz,
        _baseCol,
        _targetCol,
        maxLifeBase * (0.8 + Math.random() * 0.4),
        config.sparkleSize * (0.8 + Math.random() * 0.6),
        dragBase,
        gravityBase,
        config.strobe || config.shape === 'strobe' ? 1 : 0,
        config.crackle ? 1 : 0
      );
    }
  }

  private addParticle(
    x: number,
    y: number,
    z: number,
    vx: number,
    vy: number,
    vz: number,
    primCol: THREE.Color,
    secCol: THREE.Color,
    maxLife: number,
    size: number,
    drag: number,
    gravity: number,
    strobe: number,
    crackle: number
  ) {
    if (this.particleCount >= this.maxParticles) return;

    const idx = this.particleCount;
    const i3 = idx * 3;

    this.positions[i3] = x;
    this.positions[i3 + 1] = y;
    this.positions[i3 + 2] = z;

    this.velocities[i3] = vx;
    this.velocities[i3 + 1] = vy;
    this.velocities[i3 + 2] = vz;

    this.colors[i3] = 1.0;
    this.colors[i3 + 1] = 1.0;
    this.colors[i3 + 2] = 1.0;

    this.primaryColors[i3] = primCol.r;
    this.primaryColors[i3 + 1] = primCol.g;
    this.primaryColors[i3 + 2] = primCol.b;

    this.secondaryColors[i3] = secCol.r;
    this.secondaryColors[i3 + 1] = secCol.g;
    this.secondaryColors[i3 + 2] = secCol.b;

    this.sizes[idx] = size;
    this.baseSizes[idx] = size;
    this.lives[idx] = maxLife;
    this.maxLives[idx] = maxLife;
    this.drags[idx] = drag;
    this.gravities[idx] = gravity;
    this.strobes[idx] = strobe;
    this.crackles[idx] = crackle;

    this.particleCount++;
  }

  private addRocketTrailParticle(x: number, y: number, z: number, col: THREE.Color) {
    if (this.rocketTrailCount >= this.maxRocketTrail) return;

    const idx = this.rocketTrailCount;
    const i3 = idx * 3;

    this.rTrailPositions[i3] = x + (Math.random() - 0.5) * 0.4;
    this.rTrailPositions[i3 + 1] = y + (Math.random() - 0.5) * 0.4;
    this.rTrailPositions[i3 + 2] = z + (Math.random() - 0.5) * 0.4;

    this.rTrailColors[i3] = col.r;
    this.rTrailColors[i3 + 1] = col.g;
    this.rTrailColors[i3 + 2] = col.b;

    this.rTrailSizes[idx] = 2.0;
    this.rTrailLives[idx] = 0.45; // brief trail

    this.rocketTrailCount++;
  }

  /** Update rockets and particle simulation */
  public update(dt: number) {
    const clampedDt = Math.min(dt, 0.05);

    // 1. Update Flash Light decay
    if (this.flashIntensity > 0) {
      this.flashIntensity = Math.max(0, this.flashIntensity - clampedDt * 28);
      this.flashLight.intensity = this.flashIntensity;
    }

    // 2. Update Active Rockets (Ascent)
    for (let r = this.activeRockets.length - 1; r >= 0; r--) {
      const rocket = this.activeRockets[r];
      rocket.pos.x += rocket.vel.x * clampedDt;
      rocket.pos.y += rocket.vel.y * clampedDt;
      rocket.pos.z += rocket.vel.z * clampedDt;

      // Gravity on ascent slows it down near target
      rocket.vel.y -= 15 * clampedDt;

      // Spawn fiery rocket trail
      _col.set(rocket.config.flashColor);
      this.addRocketTrailParticle(rocket.pos.x, rocket.pos.y, rocket.pos.z, _col);

      // Check detonation criteria
      if (rocket.pos.y >= rocket.targetAltitude || rocket.vel.y <= 5) {
        this.explode(rocket.config, rocket.pos);
        this.activeRockets.splice(r, 1);
      }
    }

    // 3. Update Rocket Trail Particles
    for (let i = this.rocketTrailCount - 1; i >= 0; i--) {
      this.rTrailLives[i] -= clampedDt;
      if (this.rTrailLives[i] <= 0) {
        // Swap with last
        const last = this.rocketTrailCount - 1;
        if (i < last) {
          const i3 = i * 3;
          const l3 = last * 3;
          this.rTrailPositions[i3] = this.rTrailPositions[l3];
          this.rTrailPositions[i3 + 1] = this.rTrailPositions[l3 + 1];
          this.rTrailPositions[i3 + 2] = this.rTrailPositions[l3 + 2];
          this.rTrailColors[i3] = this.rTrailColors[l3];
          this.rTrailColors[i3 + 1] = this.rTrailColors[l3 + 1];
          this.rTrailColors[i3 + 2] = this.rTrailColors[l3 + 2];
          this.rTrailLives[i] = this.rTrailLives[last];
        }
        this.rocketTrailCount--;
      }
    }
    this.rTrailGeometry.attributes.position.needsUpdate = true;
    this.rTrailGeometry.attributes.color.needsUpdate = true;
    this.rTrailGeometry.setDrawRange(0, this.rocketTrailCount);

    // 4. Update Burst Particles
    const timeNow = performance.now() * 0.012;

    for (let i = this.particleCount - 1; i >= 0; i--) {
      this.lives[i] -= clampedDt;

      if (this.lives[i] <= 0) {
        // Recycle particle: swap with end
        const last = this.particleCount - 1;
        if (i < last) {
          const i3 = i * 3;
          const l3 = last * 3;
          this.positions[i3] = this.positions[l3];
          this.positions[i3 + 1] = this.positions[l3 + 1];
          this.positions[i3 + 2] = this.positions[l3 + 2];

          this.velocities[i3] = this.velocities[l3];
          this.velocities[i3 + 1] = this.velocities[l3 + 1];
          this.velocities[i3 + 2] = this.velocities[l3 + 2];

          this.colors[i3] = this.colors[l3];
          this.colors[i3 + 1] = this.colors[l3 + 1];
          this.colors[i3 + 2] = this.colors[l3 + 2];

          this.primaryColors[i3] = this.primaryColors[l3];
          this.primaryColors[i3 + 1] = this.primaryColors[l3 + 1];
          this.primaryColors[i3 + 2] = this.primaryColors[l3 + 2];

          this.secondaryColors[i3] = this.secondaryColors[l3];
          this.secondaryColors[i3 + 1] = this.secondaryColors[l3 + 1];
          this.secondaryColors[i3 + 2] = this.secondaryColors[l3 + 2];

          this.sizes[i] = this.sizes[last];
          this.baseSizes[i] = this.baseSizes[last];
          this.lives[i] = this.lives[last];
          this.maxLives[i] = this.maxLives[last];
          this.drags[i] = this.drags[last];
          this.gravities[i] = this.gravities[last];
          this.strobes[i] = this.strobes[last];
          this.crackles[i] = this.crackles[last];
        }
        this.particleCount--;
        continue;
      }

      const i3 = i * 3;
      const dragFactor = Math.pow(this.drags[i], clampedDt * 60);

      this.velocities[i3] *= dragFactor;
      this.velocities[i3 + 1] = (this.velocities[i3 + 1] - this.gravities[i] * clampedDt) * dragFactor;
      this.velocities[i3 + 2] *= dragFactor;

      this.positions[i3] += this.velocities[i3] * clampedDt;
      this.positions[i3 + 1] += this.velocities[i3 + 1] * clampedDt;
      this.positions[i3 + 2] += this.velocities[i3 + 2] * clampedDt;

      // Color and alpha progression
      const lifeRatio = this.lives[i] / this.maxLives[i]; // 1.0 (start) -> 0.0 (end)

      // First 15%: flash white
      // 15% - 60%: primary color
      // 60% - 100%: secondary color to burnt embers
      let r = 1;
      let g = 1;
      let b = 1;

      if (lifeRatio > 0.85) {
        // Initial flash
        const t = (lifeRatio - 0.85) / 0.15;
        r = 1.0 * t + this.primaryColors[i3] * (1 - t);
        g = 1.0 * t + this.primaryColors[i3 + 1] * (1 - t);
        b = 1.0 * t + this.primaryColors[i3 + 2] * (1 - t);
      } else if (lifeRatio > 0.4) {
        // Transition primary -> secondary
        const t = (lifeRatio - 0.4) / 0.45;
        r = this.primaryColors[i3] * t + this.secondaryColors[i3] * (1 - t);
        g = this.primaryColors[i3 + 1] * t + this.secondaryColors[i3 + 1] * (1 - t);
        b = this.primaryColors[i3 + 2] * t + this.secondaryColors[i3 + 2] * (1 - t);
      } else {
        // Dying embers fade
        const t = lifeRatio / 0.4;
        r = this.secondaryColors[i3] * t;
        g = this.secondaryColors[i3 + 1] * t;
        b = this.secondaryColors[i3 + 2] * t;
      }

      // Strobe twinkling modifier
      if (this.strobes[i] > 0.5) {
        const twinkle = Math.sin(timeNow + i * 2.1) > 0.2 ? 1.4 : 0.15;
        r *= twinkle;
        g *= twinkle;
        b *= twinkle;
      }

      this.colors[i3] = r;
      this.colors[i3 + 1] = g;
      this.colors[i3 + 2] = b;

      // Dynamic size fade
      this.sizes[i] = this.baseSizes[i] * Math.min(1.0, lifeRatio * 1.5);
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;
    this.geometry.setDrawRange(0, this.particleCount);
  }

  public getFlashInfo(): { intensity: number; color: THREE.Color } {
    return {
      intensity: this.flashIntensity,
      color: this.flashLight.color,
    };
  }

  public clearAll() {
    this.particleCount = 0;
    this.rocketTrailCount = 0;
    this.activeRockets = [];
    this.geometry.setDrawRange(0, 0);
    this.rTrailGeometry.setDrawRange(0, 0);
  }

  public dispose() {
    this.clearAll();
    this.scene.remove(this.pointsMesh);
    this.scene.remove(this.rTrailMesh);
    this.scene.remove(this.flashLight);
    this.geometry.dispose();
    this.material.dispose();
    this.rTrailGeometry.dispose();
    this.flashLight.dispose();
  }
}
