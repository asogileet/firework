import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CameraMode, SceneTheme, ShellConfig, WeatherType } from '../types/fireworks';
import { FireworksManager } from '../fireworks/fireworkPhysics';
import { BuiltScene, buildScene } from '../scenes/sceneBuilder';
import { soundEngine } from '../audio/soundEngine';
import { WeatherSystem } from '../weather/weatherSystem';
import { arManager, ARState } from '../camera/arManager';

interface Viewport3DProps {
  currentSceneTheme: SceneTheme;
  cameraMode: CameraMode;
  currentWeather: WeatherType;
  customPhotoUrl: string | null;
  activeShellConfig: ShellConfig;
  autoShowActive: boolean;
  onFpsUpdate?: (fps: number) => void;
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
  onARStateChange?: (state: ARState) => void;
}

export const Viewport3D: React.FC<Viewport3DProps> = ({
  currentSceneTheme,
  cameraMode,
  currentWeather,
  customPhotoUrl,
  activeShellConfig,
  autoShowActive,
  onFpsUpdate,
  onCanvasReady,
  onARStateChange,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const fwManagerRef = useRef<FireworksManager | null>(null);
  const activeShellConfigRef = useRef(activeShellConfig);
  activeShellConfigRef.current = activeShellConfig;

  const cameraModeRef = useRef(cameraMode);
  cameraModeRef.current = cameraMode;

  const currentSceneThemeRef = useRef(currentSceneTheme);
  currentSceneThemeRef.current = currentSceneTheme;

  const autoShowActiveRef = useRef(autoShowActive);
  autoShowActiveRef.current = autoShowActive;

  const currentWeatherRef = useRef(currentWeather);
  currentWeatherRef.current = currentWeather;

  const customPhotoUrlRef = useRef(customPhotoUrl);
  customPhotoUrlRef.current = customPhotoUrl;

  const weatherSystemRef = useRef<WeatherSystem | null>(null);

  useEffect(() => {
    if (onARStateChange) {
      arManager.setOnStateChange(onARStateChange);
    }
  }, [onARStateChange]);

  // External ref expose for firing
  useEffect(() => {
    (window as unknown as { __launchFireworkDirect?: (cfg?: ShellConfig, pos?: [number, number, number]) => void }).__launchFireworkDirect = (
      cfg?: ShellConfig,
      pos?: [number, number, number]
    ) => {
      if (fwManagerRef.current) {
        fwManagerRef.current.launchShell(cfg || activeShellConfigRef.current, pos || [0, 0, 0]);
      }
    };
    (window as unknown as { __launchBarrageDirect?: (cfg?: ShellConfig, count?: number) => void }).__launchBarrageDirect = (
      cfg?: ShellConfig,
      count?: number
    ) => {
      if (fwManagerRef.current) {
        fwManagerRef.current.launchBarrage(cfg || activeShellConfigRef.current, count || 5);
      }
    };
  }, []);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Detect Software WebGL
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // 2. Setup Three.js Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true, // Crucial for video capture & screenshots
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);
    if (onCanvasReady) {
      onCanvasReady(renderer.domElement);
    }

    // 3. Scene and Camera
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x060919, 0.0028);

    const camera = new THREE.PerspectiveCamera(
      55,
      container.clientWidth / container.clientHeight,
      0.5,
      1200
    );

    // Initial camera placement (Ground Spectator)
    camera.position.set(0, 8, 105);
    camera.lookAt(0, 85, 0);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 + 0.05; // Don't clip through ground
    controls.minDistance = 15;
    controls.maxDistance = 350;
    controls.target.set(0, 75, 0);

    // 4. Studio Environment Reflection
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 5. Starfield Sky Dome (2500 twinkling stars)
    const starGeo = new THREE.BufferGeometry();
    const starCount = 2000;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0) * 0.55; // Upper hemisphere only
      const r = 500 + Math.random() * 50;
      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = Math.max(25, r * Math.cos(phi));
      starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xe0e7ff,
      size: 1.5,
      transparent: true,
      opacity: 0.8,
    });
    const starMesh = new THREE.Points(starGeo, starMat);
    scene.add(starMesh);

    // 6. Fireworks Particle Manager
    const fwManager = new FireworksManager(scene);
    fwManagerRef.current = fwManager;

    // Dynamic Weather System (Rain, Mist, Aurora & particle reflection)
    const weatherSystem = new WeatherSystem(scene);
    weatherSystemRef.current = weatherSystem;
    weatherSystem.setWeather(currentWeatherRef.current);

    // 7. Active Scene Environment Holder
    let currentBuiltScene: BuiltScene | null = null;
    let customTexture: THREE.Texture | null = null;

    function applyCustomPhoto(url: string | null) {
      if (!url) {
        scene.background = new THREE.Color(0x070b18);
        return;
      }
      new THREE.TextureLoader().load(url, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.mapping = THREE.EquirectangularReflectionMapping;
        scene.background = tex;
        customTexture = tex;
      });
    }

    function updateSceneEnvironment(theme: SceneTheme) {
      if (currentBuiltScene) {
        scene.remove(currentBuiltScene.group);
        currentBuiltScene.ambientLights.forEach((l) => scene.remove(l));
      }

      currentBuiltScene = buildScene(theme);
      scene.add(currentBuiltScene.group);
      currentBuiltScene.ambientLights.forEach((l) => scene.add(l));

      if (theme === 'ar') {
        starMesh.visible = false;
        (scene.fog as THREE.FogExp2).density = 0.0003;
        arManager.startAR('user').then((videoTex) => {
          scene.background = videoTex;
        }).catch(() => {
          scene.background = new THREE.Color(0x0a0c16);
        });
      } else {
        if (arManager.isARActive()) {
          arManager.stopAR();
        }

        if (theme === 'customPhoto') {
          starMesh.visible = false;
          (scene.fog as THREE.FogExp2).density = 0.001;
          applyCustomPhoto(customPhotoUrlRef.current);
        } else {
          starMesh.visible = theme !== 'cosmos';
          scene.background = new THREE.Color(currentBuiltScene.skyColor);
          (scene.fog as THREE.FogExp2).color.set(currentBuiltScene.fogColor);
          (scene.fog as THREE.FogExp2).density = theme === 'cosmos' ? 0.0002 : 0.0028;
        }
      }
    }

    (window as unknown as { __updateSceneTheme?: (theme: SceneTheme) => void }).__updateSceneTheme = (theme: SceneTheme) => {
      updateSceneEnvironment(theme);
    };

    updateSceneEnvironment(currentSceneThemeRef.current);

    // Sound beat sync hook to launch fireworks automatically
    soundEngine.setOnBeatTrigger((intensity, band) => {
      if (!autoShowActiveRef.current) return;
      const spreadX = (Math.random() - 0.5) * 50;
      const spreadZ = (Math.random() - 0.5) * 20;

      if (band === 'bass' && intensity > 0.8) {
        fwManager.launchBarrage(activeShellConfigRef.current, 3);
      } else {
        fwManager.launchShell(activeShellConfigRef.current, [spreadX, 0, spreadZ]);
      }
    });

    // 8. Click / Tap raycast in sky to launch firework at that location
    const raycaster = new THREE.Raycaster();
    const mouseVec = new THREE.Vector2();

    const handlePointerDown = (e: MouseEvent) => {
      // Only launch if clicking on sky / empty space with left mouse button without dragging
      if (e.button !== 0) return;
      const startX = e.clientX;
      const startY = e.clientY;

      const handlePointerUp = (upEv: MouseEvent) => {
        window.removeEventListener('mouseup', handlePointerUp);
        const dist = Math.hypot(upEv.clientX - startX, upEv.clientY - startY);
        if (dist > 5) return; // User was panning/orbiting camera

        const rect = renderer.domElement.getBoundingClientRect();
        mouseVec.x = ((upEv.clientX - rect.left) / rect.width) * 2 - 1;
        mouseVec.y = -((upEv.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouseVec, camera);

        // Intersect a virtual vertical launch plane at Z=0
        const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
        const targetWorldPos = new THREE.Vector3();
        raycaster.ray.intersectPlane(plane, targetWorldPos);

        const targetY = Math.max(65, Math.min(160, targetWorldPos.y || 110));
        const targetX = Math.max(-120, Math.min(120, targetWorldPos.x || 0));

        const customConfig = {
          ...activeShellConfigRef.current,
          launchAltitude: targetY,
        };

        fwManager.launchShell(customConfig, [targetX * 0.4, 0, 0]);
      };

      window.addEventListener('mouseup', handlePointerUp);
    };

    renderer.domElement.addEventListener('mousedown', handlePointerDown);

    // 9. Camera Target Presets & Interpolation
    const targetCamPos = new THREE.Vector3();
    const targetLookAt = new THREE.Vector3();

    function updateCameraTarget(mode: CameraMode) {
      switch (mode) {
        case 'ground':
          targetCamPos.set(0, 10, 110);
          targetLookAt.set(0, 90, 0);
          controls.enabled = false;
          break;
        case 'rooftop':
          targetCamPos.set(0, 52, 145);
          targetLookAt.set(0, 80, -20);
          controls.enabled = false;
          break;
        case 'drone':
          targetCamPos.set(115, 150, 115);
          targetLookAt.set(0, 65, 0);
          controls.enabled = false;
          break;
        case 'rocket':
          controls.enabled = false;
          break;
        case 'orbit':
        default:
          controls.enabled = true;
          break;
      }
    }

    // 10. Animation & Render Loop
    let lastTime = performance.now();
    let frameId = 0;
    let frameCount = 0;
    let fpsTimer = performance.now();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    let droneAngle = 0;

    function tick() {
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      frameCount++;
      if (now - fpsTimer >= 1000) {
        if (onFpsUpdate) onFpsUpdate(frameCount);
        frameCount = 0;
        fpsTimer = now;
      }

      // Check if scene changed
      if (currentSceneThemeRef.current !== currentBuiltScene?.group.name) {
        // If handled by prop
      }

      // Update sound beat detection FFT
      soundEngine.updateBeatDetection();

      // Update fireworks particles
      fwManager.update(dt);

      // Update dynamic weather particles with firework flash reflection
      const flashInfo = fwManager.getFlashInfo();
      weatherSystem.update(dt, flashInfo.intensity, flashInfo.color);

      // Rotate lighthouse beam if beach scene
      if (currentBuiltScene?.lighthouseBeam) {
        const t = now * 0.0012;
        currentBuiltScene.lighthouseBeam.target.position.x = Math.sin(t) * 150;
        currentBuiltScene.lighthouseBeam.target.position.z = Math.cos(t) * 150;
      }

      // Update Camera according to mode
      const mode = cameraModeRef.current;
      updateCameraTarget(mode);

      if (mode === 'orbit') {
        controls.update();
      } else if (mode === 'rocket') {
        const latestRocket = fwManager.activeRockets[fwManager.activeRockets.length - 1];
        if (latestRocket) {
          // Smoothly trail behind rocket looking up along its flight path
          const targetRocketPos = latestRocket.pos.clone().add(new THREE.Vector3(0, -12, 28));
          camera.position.lerp(targetRocketPos, 1 - Math.exp(-6 * dt));
          camera.lookAt(latestRocket.pos);
        } else {
          // When no rocket, drift slowly looking at explosion height
          targetCamPos.set(0, 45, 110);
          targetLookAt.set(0, 95, 0);
          camera.position.lerp(targetCamPos, 1 - Math.exp(-3 * dt));
          controls.target.lerp(targetLookAt, 1 - Math.exp(-3 * dt));
          camera.lookAt(controls.target);
        }
      } else if (mode === 'drone') {
        // Slowly orbit drone around in circle high in the sky
        droneAngle += dt * 0.15;
        const radius = 160;
        targetCamPos.set(Math.cos(droneAngle) * radius, 140, Math.sin(droneAngle) * radius);
        targetLookAt.set(0, 75, 0);
        camera.position.lerp(targetCamPos, 1 - Math.exp(-4 * dt));
        controls.target.lerp(targetLookAt, 1 - Math.exp(-4 * dt));
        camera.lookAt(controls.target);
      } else {
        // Ground or Rooftop preset
        camera.position.lerp(targetCamPos, 1 - Math.exp(-5 * dt));
        controls.target.lerp(targetLookAt, 1 - Math.exp(-5 * dt));
        camera.lookAt(controls.target);
      }

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    if (isSoftwareGl) {
      afterDraw(tick);
    } else {
      frameId = requestAnimationFrame(tick);
    }

    // Resize handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('mousedown', handlePointerDown);
      arManager.stopAR();
      weatherSystem.dispose();
      fwManager.dispose();
      starGeo.dispose();
      starMat.dispose();
      renderer.dispose();
      if (container && renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update scene when currentSceneTheme changes
  useEffect(() => {
    (window as unknown as { __updateSceneTheme?: (theme: SceneTheme) => void }).__updateSceneTheme?.(currentSceneTheme);
  }, [currentSceneTheme]);

  // Update background when customPhotoUrl changes
  useEffect(() => {
    if (currentSceneTheme === 'customPhoto') {
      (window as unknown as { __updateSceneTheme?: (theme: SceneTheme) => void }).__updateSceneTheme?.('customPhoto');
    }
  }, [customPhotoUrl, currentSceneTheme]);

  // Update weather when currentWeather changes
  useEffect(() => {
    weatherSystemRef.current?.setWeather(currentWeather);
    soundEngine.setWeatherAmbience(currentWeather);
  }, [currentWeather]);

  return (
    <div
      ref={mountRef}
      className="relative w-full h-full overflow-hidden bg-slate-950 cursor-crosshair select-none"
    />
  );
};
