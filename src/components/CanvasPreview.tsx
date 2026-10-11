import React, { useRef, useEffect, useState, useMemo } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Scissors,
  Maximize2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { AspectRatio, TimelineClip, TimelineTrack } from '../types/editor';
import { renderCanvasFrame, getResolutionForAspectRatio } from '../utils/videoRenderer';
import { Language } from '../utils/i18n';

interface CanvasPreviewProps {
  aspectRatio: AspectRatio;
  currentTime: number;
  totalDuration: number;
  isPlaying: boolean;
  clips: TimelineClip[];
  tracks: TimelineTrack[];
  selectedClipId: string | null;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onSplitAtPlayhead: () => void;
  language: Language;
}

export const CanvasPreview: React.FC<CanvasPreviewProps> = ({
  aspectRatio,
  currentTime,
  totalDuration,
  isPlaying,
  clips,
  tracks,
  selectedClipId,
  onTogglePlay,
  onSeek,
  onSplitAtPlayhead,
  language,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mediaCache = useRef<Map<string, HTMLVideoElement | HTMLImageElement>>(new Map());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);
  const [isMuted, setIsMuted] = useState(false);

  // Compute resolution
  const { width: renderWidth, height: renderHeight } = useMemo(() => {
    return getResolutionForAspectRatio(aspectRatio, '1080p');
  }, [aspectRatio]);

  // Preload and cache media elements
  useEffect(() => {
    clips.forEach((clip) => {
      if (!mediaCache.current.has(clip.mediaId)) {
        if (clip.type === 'video') {
          const video = document.createElement('video');
          video.crossOrigin = 'anonymous';
          video.src = clip.mediaId.startsWith('http')
            ? clip.mediaId
            : 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
          video.preload = 'auto';
          video.muted = true;
          video.playsInline = true;
          video.load();
          mediaCache.current.set(clip.mediaId, video);
        } else if (clip.type === 'image') {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = clip.mediaId.startsWith('http')
            ? clip.mediaId
            : 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&auto=format&fit=crop&q=80';
          mediaCache.current.set(clip.mediaId, img);
        }
      }
    });
  }, [clips]);

  // Draw current frame on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    renderCanvasFrame(
      ctx,
      renderWidth,
      renderHeight,
      currentTime,
      clips,
      tracks,
      mediaCache.current
    );
  }, [currentTime, clips, tracks, renderWidth, renderHeight]);

  // Format time display as 00:00:00:00
  const formatTimecode = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const frames = Math.floor((seconds % 1) * 30);
    return `${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
  };

  const handleStep = (delta: number) => {
    const nextTime = Math.max(0, Math.min(totalDuration, currentTime + delta));
    onSeek(nextTime);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Determine aspect ratio container dimensions
  const aspectClass =
    aspectRatio === '9:16'
      ? 'aspect-[9/16] max-h-[88%]'
      : aspectRatio === '1:1'
      ? 'aspect-square max-h-[85%]'
      : aspectRatio === '4:5'
      ? 'aspect-[4/5] max-h-[86%]'
      : aspectRatio === '21:9'
      ? 'aspect-[21/9] max-w-[95%]'
      : 'aspect-[16/9] max-w-[92%]';

  return (
    <div
      ref={containerRef}
      className="flex-1 flex flex-col bg-[#0b0c12] border-r border-[#20212f] relative select-none"
    >
      {/* Aspect Ratio & Resolution Top Label */}
      <div className="h-7 px-3 flex items-center justify-between text-[11px] text-gray-400 bg-[#101119] border-b border-[#1c1d29]">
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-gray-300">Canvas: {aspectRatio}</span>
          <span className="text-gray-500">|</span>
          <span className="font-mono text-[10px] text-cyan-400">
            {renderWidth} × {renderHeight} px
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {selectedClipId && (
            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-medium">
              Active Selection
            </span>
          )}
        </div>
      </div>

      {/* Main Video Viewport */}
      <div className="flex-1 flex items-center justify-center p-3 relative overflow-hidden bg-dot-pattern">
        <div
          className={`relative shadow-2xl rounded-lg overflow-hidden border border-[#2a2c3e] bg-black ${aspectClass}`}
        >
          <canvas
            ref={canvasRef}
            width={renderWidth}
            height={renderHeight}
            className="w-full h-full object-contain block"
          />

          {/* Safe-Area Guides Overlay (subtle dash) */}
          <div className="absolute inset-4 border border-dashed border-white/10 pointer-events-none rounded" />
        </div>
      </div>

      {/* Transport & Playback Control Bar */}
      <div className="h-11 bg-[#12131b] border-t border-[#20212f] px-3 flex items-center justify-between">
        {/* Left: Timecode Display */}
        <div className="flex items-center space-x-1.5 font-mono text-xs text-gray-300">
          <span className="text-cyan-400 font-semibold">{formatTimecode(currentTime)}</span>
          <span className="text-gray-600">/</span>
          <span className="text-gray-400">{formatTimecode(totalDuration)}</span>
        </div>

        {/* Center: Playback Buttons */}
        <div className="flex items-center space-x-2">
          {/* Step Back 1s */}
          <button
            onClick={() => handleStep(-1)}
            className="p-1.5 rounded hover:bg-[#202232] text-gray-400 hover:text-white transition"
            title="Step Back 1s"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>

          {/* Play / Pause Toggle */}
          <button
            onClick={onTogglePlay}
            className="w-8 h-8 rounded-full bg-cyan-600 hover:bg-cyan-500 text-white flex items-center justify-center shadow-md shadow-cyan-900/50 hover:scale-105 active:scale-95 transition"
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-white" />
            ) : (
              <Play className="w-4 h-4 fill-white ml-0.5" />
            )}
          </button>

          {/* Step Forward 1s */}
          <button
            onClick={() => handleStep(1)}
            className="p-1.5 rounded hover:bg-[#202232] text-gray-400 hover:text-white transition"
            title="Step Forward 1s"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>

          {/* Split at Playhead Quick Button */}
          <button
            onClick={onSplitAtPlayhead}
            className="flex items-center space-x-1 px-2.5 py-1 rounded bg-[#1e202f] hover:bg-cyan-600/30 text-gray-300 hover:text-cyan-300 border border-[#2b2e44] text-[11px] font-medium transition ml-2"
            title="Split Clip at Playhead (C)"
          >
            <Scissors className="w-3 h-3" />
            <span>Split (C)</span>
          </button>
        </div>

        {/* Right: Controls (Speed, Mute, Fullscreen) */}
        <div className="flex items-center space-x-2">
          {/* Speed Selector */}
          <select
            value={speedMultiplier}
            onChange={(e) => setSpeedMultiplier(parseFloat(e.target.value))}
            className="bg-[#181926] text-gray-300 text-[11px] px-1.5 py-0.5 rounded border border-[#292b3e] focus:outline-none"
          >
            <option value={0.5}>0.5x</option>
            <option value={1.0}>1.0x</option>
            <option value={1.5}>1.5x</option>
            <option value={2.0}>2.0x</option>
          </select>

          {/* Mute Preview Toggle */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-1.5 rounded hover:bg-[#202232] text-gray-400 hover:text-white transition"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded hover:bg-[#202232] text-gray-400 hover:text-white transition"
            title="Fullscreen Preview"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
