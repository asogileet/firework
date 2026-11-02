import * as THREE from 'three';
import { WeatherType } from '../types/fireworks';

/**
 * Dynamic Atmospheric Weather Engine for Viewport3D:
 * - Drizzle / Rain streaks with dynamic firework flash illumination
 * - Volumetric drifting mist / fog puffs with light scattering
 * - Dynamic scene fog density and color modulation
 * - Aurora celestial ribbons
 */

// Procedural raindrop streak texture
function createRainTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(8, 0, 8, 64);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
  grad.addColorStop(0.3, 'rgba(200, 230, 255, 0.4)');
  grad.addColorStop(0.85, 'rgba(230, 245, 255, 0.95)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 1)');

  ctx.fillStyle = grad;
  ctx.fillRect(6, 0, 4, 64);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Procedural soft cloud mist puff texture
function createMistTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(220, 235, 255, 0.35)');
  grad.addColorStop(0.35, 'rgba(180, 205, 240, 0.18)');
  grad.addColorStop(0.7, 'rgba(140, 175, 220, 0.06)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const rainTexture = createRainTexture();
const mistTexture = createMistTexture();

export class WeatherSystem {
  private scene: THREE.Scene;
  private weatherType: WeatherType = 'clear';

  // Rain Particles
  private maxRain = 5000;
  private rainCount = 0;
  private rainPositions: Float32Array;
  private rainVelocities: Float32Array;
  private rainColors: Float32Array;
  private rainGeometry: THREE.BufferGeometry;
  private rainMaterial: THREE.PointsMaterial;
  private rainMesh: THREE.Points;

  // Mist Puffs
  private maxMist = 400;
  private mistPositions: Float32Array;
  private mistColors: Float32Array;
  private mistSizes: Float32Array;
  private mistGeometry: THREE.BufferGeometry;
  private mistMaterial: THREE.PointsMaterial;
  private mistMesh: THREE.Points;

  // Aurora Mesh (Ribbon)
  private auroraGroup: THREE.Group;
  private auroraMesh: THREE.Mesh | null = null;

  // Scratch Color Helpers
  private _flashCol = new THREE.Color();
  private _baseRainCol = new THREE.Color(0x8faec9);
  private _baseMistCol = new THREE.Color(0x1a293d);

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // 1. Allocate Rain
    this.rainPositions = new Float32Array(this.maxRain * 3);
    this.rainVelocities = new Float32Array(this.maxRain * 3);
    this.rainColors = new Float32Array(this.maxRain * 3);

    for (let i = 0; i < this.maxRain; i++) {
      const i3 = i * 3;
      this.rainPositions[i3] = (Math.random() - 0.5) * 500;
      this.rainPositions[i3 + 1] = Math.random() * 220;
      this.rainPositions[i3 + 2] = (Math.random() - 0.5) * 400;

      this.rainVelocities[i3] = (Math.random() - 0.5) * 4 - 3; // slight wind
      this.rainVelocities[i3 + 1] = -120 - Math.random() * 60; // fall speed
      this.rainVelocities[i3 + 2] = (Math.random() - 0.5) * 3;

      this.rainColors[i3] = 0.6;
      this.rainColors[i3 + 1] = 0.72;
      this.rainColors[i3 + 2] = 0.85;
    }

    this.rainGeometry = new THREE.BufferGeometry();
    this.rainGeometry.setAttribute('position', new THREE.BufferAttribute(this.rainPositions, 3));
    this.rainGeometry.setAttribute('color', new THREE.BufferAttribute(this.rainColors, 3));

    this.rainMaterial = new THREE.PointsMaterial({
      size: 3.5,
      map: rainTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true,
      opacity: 0.65,
    });

    this.rainMesh = new THREE.Points(this.rainGeometry, this.rainMaterial);
    this.rainMesh.frustumCulled = false;
    this.scene.add(this.rainMesh);

    // 2. Allocate Mist
    this.mistPositions = new Float32Array(this.maxMist * 3);
    this.mistColors = new Float32Array(this.maxMist * 3);
    this.mistSizes = new Float32Array(this.maxMist);

    for (let i = 0; i < this.maxMist; i++) {
      const i3 = i * 3;
      this.mistPositions[i3] = (Math.random() - 0.5) * 450;
      this.mistPositions[i3 + 1] = 10 + Math.random() * 90;
      this.mistPositions[i3 + 2] = (Math.random() - 0.5) * 350;

      this.mistColors[i3] = 0.15;
      this.mistColors[i3 + 1] = 0.22;
      this.mistColors[i3 + 2] = 0.32;

      this.mistSizes[i] = 45 + Math.random() * 45;
    }

    this.mistGeometry = new THREE.BufferGeometry();
    this.mistGeometry.setAttribute('position', new THREE.BufferAttribute(this.mistPositions, 3));
    this.mistGeometry.setAttribute('color', new THREE.BufferAttribute(this.mistColors, 3));
    this.mistGeometry.setAttribute('size', new THREE.BufferAttribute(this.mistSizes, 1));

    this.mistMaterial = new THREE.PointsMaterial({
      size: 55,
      map: mistTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true,
      opacity: 0.25,
    });

    this.mistMesh = new THREE.Points(this.mistGeometry, this.mistMaterial);
    this.mistMesh.frustumCulled = false;
    this.scene.add(this.mistMesh);

    // 3. Aurora Group
    this.auroraGroup = new THREE.Group();
    this.createAurora();
    this.scene.add(this.auroraGroup);

    this.setWeather('clear');
  }

  private createAurora() {
    const geo = new THREE.PlaneGeometry(600, 100, 32, 16);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x00ffaa,
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.auroraMesh = new THREE.Mesh(geo, mat);
    this.auroraMesh.position.set(0, 180, -180);
    this.auroraMesh.rotation.x = Math.PI / 4;
    this.auroraGroup.add(this.auroraMesh);
  }

  public setWeather(type: WeatherType) {
    this.weatherType = type;

    if (this.scene.fog && this.scene.fog instanceof THREE.FogExp2) {
      switch (type) {
        case 'clear':
          this.scene.fog.density = 0.0022;
          this.rainCount = 0;
          this.mistMaterial.opacity = 0.08;
          this.auroraGroup.visible = false;
          break;
        case 'drizzle':
          this.scene.fog.density = 0.0042;
          this.rainCount = 4200;
          this.mistMaterial.opacity = 0.22;
          this.auroraGroup.visible = false;
          break;
        case 'foggy':
          this.scene.fog.density = 0.0078;
          this.rainCount = 1000;
          this.mistMaterial.opacity = 0.45;
          this.auroraGroup.visible = false;
          break;
        case 'aurora':
          this.scene.fog.density = 0.0026;
          this.rainCount = 300;
          this.mistMaterial.opacity = 0.15;
          this.auroraGroup.visible = true;
          break;
      }
    }
  }

  public getWeather(): WeatherType {
    return this.weatherType;
  }

  /**
   * Update weather particles each frame
   * @param dt delta time
   * @param flashIntensity intensity of firework explosion light
   * @param flashColor hex or Color of active firework flash
   */
  public update(dt: number, flashIntensity: number, flashColor: string | THREE.Color) {
    const clampedDt = Math.min(dt, 0.05);
    const time = performance.now() * 0.001;

    // Handle Firework Light scattering onto rain & mist
    if (typeof flashColor === 'string') {
      this._flashCol.set(flashColor);
    } else {
      this._flashCol.copy(flashColor);
    }

    const scatterFactor = Math.min(1.0, flashIntensity / 10);

    // 1. Update Rain
    if (this.rainCount > 0) {
      for (let i = 0; i < this.rainCount; i++) {
        const i3 = i * 3;

        this.rainPositions[i3] += this.rainVelocities[i3] * clampedDt;
        this.rainPositions[i3 + 1] += this.rainVelocities[i3 + 1] * clampedDt;
        this.rainPositions[i3 + 2] += this.rainVelocities[i3 + 2] * clampedDt;

        // Reset to top when hitting water/ground
        if (this.rainPositions[i3 + 1] <= 1.0) {
          this.rainPositions[i3] = (Math.random() - 0.5) * 500;
          this.rainPositions[i3 + 1] = 200 + Math.random() * 20;
          this.rainPositions[i3 + 2] = (Math.random() - 0.5) * 400;
        }

        // Color reflection: blends ambient rain with firework flash
        const baseR = this._baseRainCol.r;
        const baseG = this._baseRainCol.g;
        const baseB = this._baseRainCol.b;

        this.rainColors[i3] = baseR * (1 - scatterFactor) + this._flashCol.r * scatterFactor * 1.5;
        this.rainColors[i3 + 1] = baseG * (1 - scatterFactor) + this._flashCol.g * scatterFactor * 1.5;
        this.rainColors[i3 + 2] = baseB * (1 - scatterFactor) + this._flashCol.b * scatterFactor * 1.5;
      }

      this.rainGeometry.attributes.position.needsUpdate = true;
      this.rainGeometry.attributes.color.needsUpdate = true;
      this.rainGeometry.setDrawRange(0, this.rainCount);
    } else {
      this.rainGeometry.setDrawRange(0, 0);
    }

    // 2. Update Mist Puffs
    for (let i = 0; i < this.maxMist; i++) {
      const i3 = i * 3;
      // Gentle sinusoidal drift
      this.mistPositions[i3] += Math.sin(time * 0.4 + i) * 2.5 * clampedDt;
      this.mistPositions[i3 + 2] += Math.cos(time * 0.3 + i) * 2.0 * clampedDt;

      // Color reflection on mist
      const baseR = this._baseMistCol.r;
      const baseG = this._baseMistCol.g;
      const baseB = this._baseMistCol.b;

      this.mistColors[i3] = baseR + this._flashCol.r * scatterFactor * 0.6;
      this.mistColors[i3 + 1] = baseG + this._flashCol.g * scatterFactor * 0.6;
      this.mistColors[i3 + 2] = baseB + this._flashCol.b * scatterFactor * 0.6;
    }
    this.mistGeometry.attributes.position.needsUpdate = true;
    this.mistGeometry.attributes.color.needsUpdate = true;

    // 3. Update Aurora Wave
    if (this.auroraMesh && this.weatherType === 'aurora') {
      const posAttr = this.auroraMesh.geometry.attributes.position;
      const count = posAttr.count;
      for (let p = 0; p < count; p++) {
        const u = p % 33;
        const wave = Math.sin(time * 0.8 + u * 0.25) * 12 + Math.cos(time * 1.2 + u * 0.15) * 8;
        posAttr.setZ(p, wave);
      }
      posAttr.needsUpdate = true;
    }
  }

  public dispose() {
    this.scene.remove(this.rainMesh);
    this.scene.remove(this.mistMesh);
    this.scene.remove(this.auroraGroup);
    this.rainGeometry.dispose();
    this.rainMaterial.dispose();
    this.mistGeometry.dispose();
    this.mistMaterial.dispose();
  }
}
