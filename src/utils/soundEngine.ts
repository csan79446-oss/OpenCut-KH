// Real Web Audio playback & synchronizer engine for OpenCut Studio
import { TimelineClip, TimelineTrack } from '../types/editor';

class VideoSoundEngine {
  private ctx: AudioContext | null = null;
  private isRunning: boolean = false;
  private destinationNode: MediaStreamAudioDestinationNode | null = null;
  private audioElements: Map<string, HTMLAudioElement> = new Map();
  private connectedSources: Set<HTMLAudioElement> = new Set();

  private initContext() {
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

    // Cleanup audio elements for deleted clips
    for (const [clipId, audioEl] of this.audioElements.entries()) {
      if (!currentClipIds.has(clipId)) {
        audioEl.pause();
        audioEl.src = '';
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

      // Check if we have an audio URL to play
      const audioUrl = clip.mediaUrl || (clip.type === 'audio' ? clip.mediaId : null);

      if (!audioUrl) continue;

      let audioEl = this.audioElements.get(clip.id);

      if (isInsideClip && isPlaying) {
        if (!audioEl) {
          audioEl = new Audio();
          audioEl.crossOrigin = 'anonymous';
          audioEl.src = audioUrl;
          audioEl.preload = 'auto';

          // Connect to Web Audio context and destination for high quality mix
          if (this.ctx && this.destinationNode && !this.connectedSources.has(audioEl)) {
            try {
              const source = this.ctx.createMediaElementSource(audioEl);
              source.connect(this.ctx.destination);
              source.connect(this.destinationNode);
              this.connectedSources.add(audioEl);
            } catch {
              // Fallback to direct element output if CORS prevents MediaElementSource
            }
          }

          this.audioElements.set(clip.id, audioEl);
        }

        const targetAudioTime = clip.sourceStart + (currentTime - clip.start) * (clip.speed || 1);

        audioEl.volume = effectiveVol;
        audioEl.playbackRate = Math.max(0.25, Math.min(4, clip.speed || 1));

        if (audioEl.paused) {
          if (isFinite(targetAudioTime) && Math.abs(audioEl.currentTime - targetAudioTime) > 0.15) {
            audioEl.currentTime = Math.max(0, targetAudioTime);
          }
          audioEl.play().catch(() => {});
        } else {
          // Keep synchronized if drifting
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

  // Play instant UI sound effects (whoosh, pop, impact)
  public playEffect(type: 'whoosh' | 'pop' | 'impact' | 'click', volume: number = 0.8) {
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
      default:
        this.playPop(t, volume * 0.5);
    }
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
