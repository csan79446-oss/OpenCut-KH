// Real Web Audio playback & synchronizer engine for OpenCut Studio
import { TimelineClip, TimelineTrack } from '../types/editor';

class VideoSoundEngine {
  private ctx: AudioContext | null = null;
  private isRunning: boolean = false;
  private destinationNode: MediaStreamAudioDestinationNode | null = null;
  private audioElements: Map<string, HTMLAudioElement> = new Map();
  private audioBlobs: Map<string, string> = new Map(); // DataURI -> ObjectURL cache
  private sfxBuffers: Map<string, AudioBuffer> = new Map();

  public initContext(): AudioContext | null {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.destinationNode = this.ctx.createMediaStreamDestination();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public getMediaStreamDestination(): MediaStreamAudioDestinationNode | null {
    this.initContext();
    return this.destinationNode;
  }

  public getAudioContext(): AudioContext | null {
    this.initContext();
    return this.ctx;
  }

  /**
   * Generates high quality synthesized sound effect audio buffers
   */
  public getOrCreateSfxBuffer(type: string): AudioBuffer | null {
    const ctx = this.initContext();
    if (!ctx) return null;

    if (this.sfxBuffers.has(type)) {
      return this.sfxBuffers.get(type)!;
    }

    const sampleRate = ctx.sampleRate;
    let buffer: AudioBuffer | null = null;

    try {
      if (type === 'whoosh') {
        const duration = 1.2;
        buffer = ctx.createBuffer(1, Math.floor(sampleRate * duration), sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
          const t = i / sampleRate;
          const progress = t / duration;
          const envelope = Math.sin(progress * Math.PI) * Math.sin(progress * Math.PI);
          const freq = 180 + Math.sin(progress * Math.PI) * 750;
          const noise = (Math.random() * 2 - 1) * 0.45;
          const sine = Math.sin(2 * Math.PI * freq * t) * 0.55;
          data[i] = (sine + noise) * envelope * 0.85;
        }
      } else if (type === 'pop') {
        const duration = 0.35;
        buffer = ctx.createBuffer(1, Math.floor(sampleRate * duration), sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
          const t = i / sampleRate;
          const freq = 750 * Math.exp(-t * 18);
          const envelope = Math.exp(-t * 15);
          data[i] = Math.sin(2 * Math.PI * freq * t) * envelope * 0.8;
        }
      } else if (type === 'impact') {
        const duration = 1.8;
        buffer = ctx.createBuffer(1, Math.floor(sampleRate * duration), sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
          const t = i / sampleRate;
          const freq = 160 * Math.exp(-t * 7);
          const sub = Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 3.5);
          const noise = (Math.random() * 2 - 1) * Math.exp(-t * 22) * 0.5;
          data[i] = (sub + noise) * 0.9;
        }
      } else if (type === 'shutter') {
        const duration = 0.6;
        buffer = ctx.createBuffer(1, Math.floor(sampleRate * duration), sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
          const t = i / sampleRate;
          const click1 = t < 0.08 ? (Math.random() * 2 - 1) * Math.exp(-t * 40) : 0;
          const click2 = t > 0.12 && t < 0.28 ? (Math.random() * 2 - 1) * Math.exp(-(t - 0.12) * 35) : 0;
          const mech = Math.sin(2 * Math.PI * 850 * t) * Math.exp(-t * 12) * 0.25;
          data[i] = (click1 + click2 + mech) * 0.85;
        }
      } else {
        // Generic pop/ding
        const duration = 0.5;
        buffer = ctx.createBuffer(1, Math.floor(sampleRate * duration), sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
          const t = i / sampleRate;
          data[i] = Math.sin(2 * Math.PI * 520 * t) * Math.exp(-t * 8) * 0.6;
        }
      }

      if (buffer) {
        this.sfxBuffers.set(type, buffer);
      }
    } catch {
      return null;
    }

    return buffer;
  }

  /**
   * Helper to convert an AudioBuffer to a playable WAV Blob URL
   */
  public bufferToWavBlobUrl(buffer: AudioBuffer): string {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;
    const length = buffer.length * numChannels * 2;
    const ab = new ArrayBuffer(44 + length);
    const view = new DataView(ab);

    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    /* RIFF identifier */
    writeString(0, 'RIFF');
    /* file length */
    view.setUint32(4, 36 + length, true);
    /* RIFF type */
    writeString(8, 'WAVE');
    /* format chunk identifier */
    writeString(12, 'fmt ');
    /* format chunk length */
    view.setUint32(16, 16, true);
    /* sample format (raw) */
    view.setUint16(20, format, true);
    /* channel count */
    view.setUint16(22, numChannels, true);
    /* sample rate */
    view.setUint32(24, sampleRate, true);
    /* byte rate (sample rate * block align) */
    view.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true);
    /* block align (channel count * bytes per sample) */
    view.setUint16(32, numChannels * (bitDepth / 8), true);
    /* bits per sample */
    view.setUint16(34, bitDepth, true);
    /* data chunk identifier */
    writeString(36, 'data');
    /* data chunk length */
    view.setUint32(40, length, true);

    // Write samples
    const channelData = buffer.getChannelData(0);
    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      const sample = Math.max(-1, Math.min(1, channelData[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }

    const blob = new Blob([ab], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
  }

  /**
   * Convert base64 data URLs or SFX tokens to Blob URLs for guaranteed playback
   */
  public resolveAudioSource(url: string): string {
    if (this.audioBlobs.has(url)) {
      return this.audioBlobs.get(url)!;
    }

    // Synthesized SFX token support
    if (url.startsWith('sfx:')) {
      const effectName = url.replace('sfx:', '');
      const buf = this.getOrCreateSfxBuffer(effectName);
      if (buf) {
        const blobUrl = this.bufferToWavBlobUrl(buf);
        this.audioBlobs.set(url, blobUrl);
        return blobUrl;
      }
    }

    if (!url.startsWith('data:audio/')) {
      return url;
    }

    try {
      const parts = url.split(',');
      const mimeMatch = parts[0].match(/:(.*?);/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'audio/wav';
      const byteChars = atob(parts[1]);
      const byteNumbers = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) {
        byteNumbers[i] = byteChars.charCodeAt(i);
      }
      const blob = new Blob([byteNumbers], { type: mimeType });
      const blobUrl = URL.createObjectURL(blob);
      this.audioBlobs.set(url, blobUrl);
      return blobUrl;
    } catch {
      return url;
    }
  }

  /**
   * Synchronize all timeline audio clips with the current playhead time
   */
  public syncTimelineAudio(
    currentTime: number,
    isPlaying: boolean,
    clips: TimelineClip[],
    tracks: TimelineTrack[]
  ) {
    this.initContext();
    this.isRunning = isPlaying;

    const currentClipIds = new Set(clips.map((c) => c.id));

    // Cleanup audio elements for removed clips
    for (const [clipId, audioEl] of this.audioElements.entries()) {
      if (!currentClipIds.has(clipId)) {
        try {
          audioEl.pause();
          audioEl.src = '';
        } catch {}
        this.audioElements.delete(clipId);
      }
    }

    const trackMap = new Map(tracks.map((t) => [t.id, t]));

    for (const clip of clips) {
      if (clip.type !== 'audio' && clip.type !== 'video') continue;

      const track = trackMap.get(clip.trackId);
      const isMuted = track ? track.isMuted : false;
      const trackVol = track ? track.volume : 1;
      const effectiveVol = isMuted ? 0 : Math.max(0, Math.min(1, (clip.volume ?? 1) * trackVol));

      const isInsideClip = currentTime >= clip.start && currentTime < clip.start + clip.duration;

      // Extract audio URL
      let rawAudioUrl = clip.mediaUrl;
      if (!rawAudioUrl && clip.type === 'audio') {
        if (clip.mediaId && (clip.mediaId.startsWith('data:') || clip.mediaId.startsWith('http') || clip.mediaId.startsWith('blob:') || clip.mediaId.startsWith('sfx:'))) {
          rawAudioUrl = clip.mediaId;
        } else if (clip.mediaId && clip.mediaId.startsWith('sfx-')) {
          // Automatic fallback for sfx-whoosh, sfx-pop, etc.
          const sfxType = clip.mediaId.replace('sfx-', '');
          rawAudioUrl = `sfx:${sfxType}`;
        }
      }

      if (!rawAudioUrl) continue;

      const resolvedUrl = this.resolveAudioSource(rawAudioUrl);
      let audioEl = this.audioElements.get(clip.id);

      if (isInsideClip && isPlaying) {
        if (!audioEl) {
          audioEl = new Audio();
          // Never use crossOrigin on blob or data URLs to prevent security/taint issues
          if (resolvedUrl.startsWith('http://') || resolvedUrl.startsWith('https://')) {
            audioEl.crossOrigin = 'anonymous';
          }
          audioEl.src = resolvedUrl;
          audioEl.preload = 'auto';
          // Note: Avoid ctx.createMediaElementSource here so direct audio output
          // can never be muted or blocked by CORS issues!
          this.audioElements.set(clip.id, audioEl);
        } else if (audioEl.src !== resolvedUrl && !audioEl.src.endsWith(resolvedUrl)) {
          audioEl.src = resolvedUrl;
        }

        const targetAudioTime = clip.sourceStart + (currentTime - clip.start) * (clip.speed || 1);

        audioEl.volume = effectiveVol;
        audioEl.playbackRate = Math.max(0.25, Math.min(4, clip.speed || 1));

        if (audioEl.paused) {
          if (isFinite(targetAudioTime) && Math.abs(audioEl.currentTime - targetAudioTime) > 0.15) {
            audioEl.currentTime = Math.max(0, targetAudioTime);
          }
          audioEl.play().catch(() => {
            if (this.ctx && this.ctx.state === 'suspended') {
              this.ctx.resume().catch(() => {});
            }
          });
        } else {
          // Keep in sync if playback drifts by more than 0.3s
          if (isFinite(targetAudioTime) && Math.abs(audioEl.currentTime - targetAudioTime) > 0.3) {
            audioEl.currentTime = Math.max(0, targetAudioTime);
          }
        }
      } else {
        // Outside clip or paused
        if (audioEl) {
          if (!audioEl.paused) {
            audioEl.pause();
          }
          if (!isPlaying && isInsideClip) {
            const targetAudioTime = clip.sourceStart + (currentTime - clip.start) * (clip.speed || 1);
            if (isFinite(targetAudioTime)) {
              audioEl.currentTime = Math.max(0, targetAudioTime);
            }
          }
        }
      }
    }
  }

  /**
   * Stop all playing audio elements
   */
  public stopPlayback() {
    this.isRunning = false;
    for (const audioEl of this.audioElements.values()) {
      if (!audioEl.paused) {
        audioEl.pause();
      }
    }
  }

  /**
   * Play instant synthesized UI sound effects
   */
  public playEffect(type: 'whoosh' | 'pop' | 'impact' | 'click' | 'shutter', volume: number = 0.8) {
    this.initContext();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    switch (type) {
      case 'whoosh':
        this.playWhoosh(t, volume);
        break;
      case 'pop':
        this.playPop(t, volume);
        break;
      case 'impact':
        this.playKick(t, volume * 1.3);
        break;
      case 'shutter':
        this.playShutter(t, volume);
        break;
      default:
        this.playPop(t, volume * 0.5);
    }
  }

  private playShutter(t: number, vol: number) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.15);
    gain.gain.setValueAtTime(vol * 0.7, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  private playKick(t: number, vol: number) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(0.01, t + 0.35);

    gain.gain.setValueAtTime(vol * 0.7, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    if (this.destinationNode) gain.connect(this.destinationNode);

    osc.start(t);
    osc.stop(t + 0.35);
  }

  private playWhoosh(t: number, vol: number) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(800, t + 0.2);
    osc.frequency.exponentialRampToValueAtTime(150, t + 0.45);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(vol * 0.5, t + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    if (this.destinationNode) gain.connect(this.destinationNode);

    osc.start(t);
    osc.stop(t + 0.45);
  }

  private playPop(t: number, vol: number) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.setValueAtTime(650, t);
    osc.frequency.exponentialRampToValueAtTime(220, t + 0.1);

    gain.gain.setValueAtTime(vol * 0.6, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    if (this.destinationNode) gain.connect(this.destinationNode);

    osc.start(t);
    osc.stop(t + 0.1);
  }
}

export const soundEngine = new VideoSoundEngine();
