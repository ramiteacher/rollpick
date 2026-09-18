import { pad } from './utils';

export class VideoRecorder {
  private targetCanvas: HTMLCanvasElement;
  private mediaRecorder: MediaRecorder;
  private videoStream: MediaStream;

  private chunks: Blob[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.targetCanvas = canvas;
    this.videoStream = this.targetCanvas.captureStream();
    const preferred = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'];
    const mimeType = preferred.find((m) => MediaRecorder.isTypeSupported?.(m));
    this.mediaRecorder = new MediaRecorder(this.videoStream, {
      videoBitsPerSecond: 6000000,
      ...(mimeType ? { mimeType } : {}),
    });
  }

  public get isRecording() {
    return this.mediaRecorder.state === 'recording';
  }

  public async start() {
    if (this.isRecording) return;
    return new Promise<void>((rs) => {
      this.chunks = [];
      this.mediaRecorder.ondataavailable = (e: BlobEvent) => {
        this.chunks.push(e.data);
      };
      this.mediaRecorder.onstop = () => {
        const mimeType = this.mediaRecorder.mimeType || 'video/webm';
        const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
        const blob = new Blob(this.chunks, { type: mimeType });
        const videoUrl = URL.createObjectURL(blob);
        const downloadLink = document.createElement('a');
        const d = new Date();

        downloadLink.href = videoUrl;
        downloadLink.download = `rollpick_${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}.${ext}`;
        downloadLink.click();
        downloadLink.remove();
        URL.revokeObjectURL(videoUrl);
      };
      this.mediaRecorder.onstart = () => {
        rs();
      };
      this.mediaRecorder.start();
    });
  }

  public stop() {
    if (this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.stop();
    }
  }
}
