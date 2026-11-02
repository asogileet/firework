import * as THREE from 'three';

export interface ARState {
  isActive: boolean;
  isFrontCamera: boolean;
  isMirrored: boolean;
  hasPermission: boolean;
  errorMessage: string | null;
}

export class ARManager {
  private videoElement: HTMLVideoElement | null = null;
  private videoTexture: THREE.VideoTexture | null = null;
  private stream: MediaStream | null = null;
  private isFrontCamera = true;
  private isMirrored = true;
  private onStateChange: ((state: ARState) => void) | null = null;

  public setOnStateChange(cb: (state: ARState) => void) {
    this.onStateChange = cb;
  }

  private notify() {
    if (this.onStateChange) {
      this.onStateChange({
        isActive: !!this.stream,
        isFrontCamera: this.isFrontCamera,
        isMirrored: this.isMirrored,
        hasPermission: !!this.stream,
        errorMessage: null,
      });
    }
  }

  public async startAR(facingMode: 'user' | 'environment' = 'user'): Promise<THREE.VideoTexture> {
    this.stopAR();

    this.isFrontCamera = facingMode === 'user';
    this.isMirrored = this.isFrontCamera;

    this.videoElement = document.createElement('video');
    this.videoElement.autoplay = true;
    this.videoElement.playsInline = true;
    this.videoElement.muted = true;
    this.videoElement.style.display = 'none';
    document.body.appendChild(this.videoElement);

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      this.videoElement.srcObject = this.stream;
      await this.videoElement.play();

      this.videoTexture = new THREE.VideoTexture(this.videoElement);
      this.videoTexture.colorSpace = THREE.SRGBColorSpace;
      this.videoTexture.minFilter = THREE.LinearFilter;
      this.videoTexture.magFilter = THREE.LinearFilter;

      if (this.isMirrored) {
        this.videoTexture.wrapS = THREE.RepeatWrapping;
        this.videoTexture.repeat.x = -1;
      }

      this.notify();
      return this.videoTexture;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '無法存取攝影機';
      if (this.onStateChange) {
        this.onStateChange({
          isActive: false,
          isFrontCamera: this.isFrontCamera,
          isMirrored: this.isMirrored,
          hasPermission: false,
          errorMessage: msg,
        });
      }
      throw err;
    }
  }

  public toggleFacingMode(): Promise<THREE.VideoTexture> {
    const nextFacing = this.isFrontCamera ? 'environment' : 'user';
    return this.startAR(nextFacing);
  }

  public toggleMirror() {
    this.isMirrored = !this.isMirrored;
    if (this.videoTexture) {
      this.videoTexture.wrapS = THREE.RepeatWrapping;
      this.videoTexture.repeat.x = this.isMirrored ? -1 : 1;
    }
    this.notify();
  }

  public getVideoTexture(): THREE.VideoTexture | null {
    return this.videoTexture;
  }

  public isARActive(): boolean {
    return !!this.stream;
  }

  public stopAR() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.videoTexture) {
      this.videoTexture.dispose();
      this.videoTexture = null;
    }
    if (this.videoElement) {
      try {
        this.videoElement.pause();
        this.videoElement.srcObject = null;
        if (this.videoElement.parentNode) {
          this.videoElement.parentNode.removeChild(this.videoElement);
        }
      } catch {
        // ignore
      }
      this.videoElement = null;
    }
    this.notify();
  }
}

export const arManager = new ARManager();
