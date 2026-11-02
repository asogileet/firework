/**
 * Video recording module using HTML5 Canvas captureStream + Web Audio MediaStream.
 * Encodes crisp 60FPS video with real-time sound effects & celebration music.
 */

export interface RecordedVideoResult {
  blob: Blob;
  url: string;
  durationMs: number;
}

export class VideoRecorderManager {
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private startTime = 0;
  private isRecording = false;

  public startRecording(canvas: HTMLCanvasElement, audioStream: MediaStream | null): boolean {
    if (this.isRecording) return false;

    try {
      // 60 FPS stream from WebGL canvas
      const canvasStream = canvas.captureStream(60);

      // Combine video + audio tracks
      const combinedTracks: MediaStreamTrack[] = [...canvasStream.getVideoTracks()];
      if (audioStream && audioStream.getAudioTracks().length > 0) {
        combinedTracks.push(...audioStream.getAudioTracks());
      }

      const combinedStream = new MediaStream(combinedTracks);

      const mimeType = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
        'video/mp4',
      ].find((type) => MediaRecorder.isTypeSupported(type)) || 'video/webm';

      this.recordedChunks = [];
      this.mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: 6000000, // 6 Mbps high fidelity
      });

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.recordedChunks.push(e.data);
        }
      };

      this.mediaRecorder.start(250); // Timeslice 250ms
      this.startTime = performance.now();
      this.isRecording = true;
      return true;
    } catch (err) {
      console.error('Failed to start MediaRecorder:', err);
      return false;
    }
  }

  public stopRecording(): Promise<RecordedVideoResult> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || !this.isRecording) {
        reject(new Error('Recorder is not active'));
        return;
      }

      const durationMs = performance.now() - this.startTime;
      this.isRecording = false;

      this.mediaRecorder.onstop = () => {
        const mimeType = this.mediaRecorder?.mimeType || 'video/webm';
        const blob = new Blob(this.recordedChunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        this.mediaRecorder = null;
        resolve({ blob, url, durationMs });
      };

      this.mediaRecorder.stop();
    });
  }

  public getIsRecording(): boolean {
    return this.isRecording;
  }
}

export const videoRecorder = new VideoRecorderManager();
