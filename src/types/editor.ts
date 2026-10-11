export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:5' | '21:9';

export type TrackType = 'video' | 'overlay' | 'text' | 'audio' | 'sfx';

export interface TimelineTrack {
  id: string;
  name: string;
  type: TrackType;
  isMuted: boolean;
  isLocked: boolean;
  isVisible: boolean;
  volume: number; // 0 to 1
}

export interface ClipTransform {
  x: number; // offset in % of canvas
  y: number; // offset in % of canvas
  scale: number; // 0.1 to 3.0
  rotation: number; // degrees
  opacity: number; // 0 to 1
  blendMode: 'normal' | 'screen' | 'multiply' | 'overlay';
}

export interface ClipFilters {
  brightness: number; // 50 to 150
  contrast: number; // 50 to 150
  saturate: number; // 0 to 200
  blur: number; // 0 to 20 px
  hueRotate: number; // 0 to 360 deg
  sepia: number; // 0 to 100
  grayscale: number; // 0 to 100
  vignette: number; // 0 to 100
  preset: string; // 'none' | 'cinematic' | 'cyberpunk' | 'vintage' | 'noir' | 'warm'
}

export type AnimationPreset =
  | 'none'
  | 'typewriter'
  | 'spring-pop'
  | 'keyframe-zoom-in'
  | 'keyframe-zoom-out'
  | 'pop'
  | 'bounce'
  | 'fade'
  | 'slide-up'
  | 'slide-down'
  | 'slide-left'
  | 'glitch'
  | 'karaoke'
  | 'word-by-word'
  | 'word-highlight'
  | 'word-bounce';

export interface AnimationConfig {
  preset: AnimationPreset;
  duration?: number; // duration of in-animation in seconds (default 0.6s)
  zoomStart?: number; // keyframe zoom start scale (default 1.0)
  zoomEnd?: number; // keyframe zoom end scale (default 1.35)
  typewriterSpeed?: number; // characters per second (default 20)
  springTension?: number; // spring stiffness multiplier (default 1.0)
}

export type WordAnimationStyle =
  | 'none'
  | 'word-by-word'
  | 'word-highlight'
  | 'word-bounce'
  | 'karaoke';

export interface TextConfig {
  text: string;
  fontSize: number;
  fontFamily: string;
  color: string;
  strokeColor: string;
  strokeWidth: number;
  backgroundColor: string;
  animation: AnimationPreset;
  animationConfig?: AnimationConfig;
  align: 'left' | 'center' | 'right';
  yPercent: number; // position from top (e.g. 78% for subtitles, 25% for titles)
  shadowColor?: string;
  shadowBlur?: number;
  stylePreset?: string;
  isCaption?: boolean;
  wordStyle?: WordAnimationStyle;
  highlightColor?: string; // Color of active spoken word (e.g. #ffe600, #22c55e, #ec4899)
  highlightBg?: string;
}

export interface TimelineClip {
  id: string;
  trackId: string;
  mediaId: string;
  mediaUrl?: string;
  title: string;
  type: 'video' | 'image' | 'audio' | 'text';
  start: number; // in seconds on timeline
  duration: number; // in seconds
  sourceStart: number; // offset in source media
  sourceDuration: number; // original media duration
  speed: number; // 0.25 to 4.0
  volume: number; // 0 to 2.0
  fadeIn: number; // seconds
  fadeOut: number; // seconds
  transform: ClipTransform;
  filters: ClipFilters;
  textConfig?: TextConfig;
  animation?: AnimationConfig;
  audioWaveform?: number[];
  color: string;
  transitionIn?: 'crossfade' | 'zoom' | 'flash' | 'slide' | 'none';
  ttsText?: string; // Original spoken text if generated from AI voice
}

export interface MediaItem {
  id: string;
  name: string;
  type: 'video' | 'audio' | 'image';
  url: string;
  duration: number;
  width?: number;
  height?: number;
  thumbnail?: string;
  waveform?: number[];
  category?: string;
  ttsText?: string; // Spoken text for AI voiceovers
}

export interface SilenceSegment {
  start: number;
  end: number;
  duration: number;
  rms: number;
}

export interface SubtitleItem {
  id: string;
  start: number;
  end: number;
  text: string;
  highlightWord?: string;
}

export interface ProjectSettings {
  title: string;
  aspectRatio: AspectRatio;
  fps: 30 | 60;
  resolution: { width: number; height: number };
}
