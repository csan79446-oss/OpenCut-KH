import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Scissors,
  Maximize2,
  Volume2,
  VolumeX,
  Shield,
  Smartphone,
  Move,
  ChevronDown,
} from 'lucide-react';
import { AspectRatio, ClipTransform, MediaItem, TimelineClip, TimelineTrack } from '../types/editor';
import { renderCanvasFrame, getResolutionForAspectRatio } from '../utils/videoRenderer';
import { Language, translations } from '../utils/i18n';
import { SAMPLE_MEDIA } from '../utils/sampleData';

interface CanvasPreviewProps {
  aspectRatio: AspectRatio;
  currentTime: number;
  totalDuration: number;
  isPlaying: boolean;
  clips: TimelineClip[];
  tracks: TimelineTrack[];
  selectedClipId: string | null;
  mediaLibrary?: MediaItem[];
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onSplitAtPlayhead: () => void;
  onUpdateClipTransform?: (clipId: string, transform: Partial<ClipTransform>) => void;
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
  mediaLibrary = SAMPLE_MEDIA,
  onTogglePlay,
  onSeek,
  onSplitAtPlayhead,
  onUpdateClipTransform,
  language,
}) => {
  const t = translations[language];
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewportBoxRef = useRef<HTMLDivElement | null>(null);
  const mediaCache = useRef<Map<string, HTMLVideoElement | HTMLImageElement>>(new Map());

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);
  const [isMuted, setIsMuted] = useState(false);

  // OpenReel features: Safe zone & Viewport zoom & Canvas Gizmo
  const [showSafeArea, setShowSafeArea] = useState<boolean>(false);
  const [zoomScale, setZoomScale] = useState<'fit' | 0.5 | 0.75 | 1 | 1.25>('fit');
  const [isDraggingGizmo, setIsDraggingGizmo] = useState<boolean>(false);
  const [isResizingGizmo, setIsResizingGizmo] = useState<string | null>(null);
  const gizmoStartPos = useRef<{ mouseX: number; mouseY: number; initialX: number; initialY: number; initialScale: number }>({
    mouseX: 0,
    mouseY: 0,
    initialX: 0,
    initialY: 0,
    initialScale: 1,
  });

  // Compute render resolution
  const { width: renderWidth, height: renderHeight } = useMemo(() => {
    return getResolutionForAspectRatio(aspectRatio, '1080p');
  }, [aspectRatio]);

  // Selected clip active on canvas at current time
  const activeSelectedClip = useMemo(() => {
    if (!selectedClipId) return null;
    return clips.find((c) => c.id === selectedClipId && currentTime >= c.start && currentTime <= c.start + c.duration) || null;
  }, [clips, selectedClipId, currentTime]);

  // Preload and cache media elements
  useEffect(() => {
    clips.forEach((clip) => {
      if (!mediaCache.current.has(clip.mediaId)) {
        const foundMedia = mediaLibrary.find((m) => m.id === clip.mediaId);
        const resolvedUrl = foundMedia?.url || (clip.mediaId.startsWith('http') ? clip.mediaId : null);

        if (clip.type === 'video') {
          const video = document.createElement('video');
          video.crossOrigin = 'anonymous';
          video.src = resolvedUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
          video.preload = 'auto';
          video.muted = true;
          video.playsInline = true;
          video.load();
          mediaCache.current.set(clip.mediaId, video);
        } else if (clip.type === 'image') {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = resolvedUrl || 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&auto=format&fit=crop&q=80';
          mediaCache.current.set(clip.mediaId, img);
        }
      }
    });
  }, [clips, mediaLibrary]);

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

  // Format SMPTE Timecode: HH:MM:SS:FF (at 30 frames per second)
  const formatTimecode = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const frames = Math.floor((seconds % 1) * 30);
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
  };

  // Step frame by frame (at 30fps, 1 frame = 1/30s ≈ 0.0333s)
  const handleStepFrames = (frameDelta: number) => {
    const deltaSeconds = frameDelta / 30;
    const nextTime = Math.max(0, Math.min(totalDuration, Math.round((currentTime + deltaSeconds) * 1000) / 1000));
    onSeek(nextTime);
  };

  const handleStepSeconds = (delta: number) => {
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

  // Interactive Canvas Transform Gizmo Mouse Handlers (OpenReel feature)
  const handleGizmoMouseDown = (e: React.MouseEvent) => {
    if (!activeSelectedClip || !onUpdateClipTransform) return;
    e.stopPropagation();
    setIsDraggingGizmo(true);
    gizmoStartPos.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      initialX: activeSelectedClip.transform.x || 0,
      initialY: activeSelectedClip.transform.y || 0,
      initialScale: activeSelectedClip.transform.scale || 1,
    };
  };

  const handleResizeHandleMouseDown = (e: React.MouseEvent, corner: string) => {
    if (!activeSelectedClip || !onUpdateClipTransform) return;
    e.stopPropagation();
    setIsResizingGizmo(corner);
    gizmoStartPos.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      initialX: activeSelectedClip.transform.x || 0,
      initialY: activeSelectedClip.transform.y || 0,
      initialScale: activeSelectedClip.transform.scale || 1,
    };
  };

  useEffect(() => {
    const handleWindowMouseMove = (e: MouseEvent) => {
      if (!activeSelectedClip || !onUpdateClipTransform || !viewportBoxRef.current) return;
      const rect = viewportBoxRef.current.getBoundingClientRect();

      if (isDraggingGizmo) {
        const deltaPixelX = e.clientX - gizmoStartPos.current.mouseX;
        const deltaPixelY = e.clientY - gizmoStartPos.current.mouseY;
        const deltaPercentX = (deltaPixelX / rect.width) * 100;
        const deltaPercentY = (deltaPixelY / rect.height) * 100;

        let newX = Math.round((gizmoStartPos.current.initialX + deltaPercentX) * 10) / 10;
        let newY = Math.round((gizmoStartPos.current.initialY + deltaPercentY) * 10) / 10;

        // Snap to center (0, 0) if close
        if (Math.abs(newX) < 1.5) newX = 0;
        if (Math.abs(newY) < 1.5) newY = 0;

        onUpdateClipTransform(activeSelectedClip.id, { x: newX, y: newY });
      } else if (isResizingGizmo) {
        const deltaPixelY = gizmoStartPos.current.mouseY - e.clientY;
        const scaleDelta = (deltaPixelY / (rect.height * 0.4));
        const newScale = Math.max(0.2, Math.min(3.5, Math.round((gizmoStartPos.current.initialScale + scaleDelta) * 100) / 100));

        onUpdateClipTransform(activeSelectedClip.id, { scale: newScale });
      }
    };

    const handleWindowMouseUp = () => {
      setIsDraggingGizmo(false);
      setIsResizingGizmo(null);
    };

    if (isDraggingGizmo || isResizingGizmo) {
      window.addEventListener('mousemove', handleWindowMouseMove);
      window.addEventListener('mouseup', handleWindowMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [isDraggingGizmo, isResizingGizmo, activeSelectedClip, onUpdateClipTransform]);

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

  // Gizmo box geometry for active clip
  const gizmoBox = useMemo(() => {
    if (!activeSelectedClip) return null;
    const { x, y, scale } = activeSelectedClip.transform;
    const baseWidthPercent = 80;
    const baseHeightPercent = activeSelectedClip.type === 'text' ? 24 : 70;
    const scaledWidth = Math.min(100, baseWidthPercent * scale);
    const scaledHeight = Math.min(100, baseHeightPercent * scale);
    const leftPercent = 50 + x - scaledWidth / 2;
    const topPercent = 50 + y - scaledHeight / 2;

    return {
      left: `${leftPercent}%`,
      top: `${topPercent}%`,
      width: `${scaledWidth}%`,
      height: `${scaledHeight}%`,
      x,
      y,
      scale,
    };
  }, [activeSelectedClip]);

  return (
    <div
      ref={containerRef}
      className="flex-1 flex flex-col bg-[#0a0b10] border-r border-[#1e202d] relative select-none overflow-hidden"
    >
      {/* Top Bar: Aspect Ratio, Resolution & Viewport Tools */}
      <div className="h-8 px-3.5 flex items-center justify-between text-xs text-gray-400 bg-[#0f1017] border-b border-[#1b1c28]">
        {/* Left: Aspect & Resolution */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 font-medium text-gray-300">
            <span className="text-gray-400 font-normal">Canvas:</span>
            <span className="text-white font-semibold">{aspectRatio}</span>
          </div>
          <span className="text-gray-600">·</span>
          <span className="font-mono tabular-nums text-[11px] text-cyan-400">
            {renderWidth} × {renderHeight}
          </span>
          <span className="text-gray-600">·</span>
          <span className="text-[11px] text-gray-400 font-mono tabular-nums">30 FPS</span>
        </div>

        {/* Right: Viewport Controls (Safe Margins & Zoom) */}
        <div className="flex items-center space-x-2">
          {/* Safe Margins Toggle (OpenReel feature) */}
          <button
            onClick={() => setShowSafeArea(!showSafeArea)}
            className={`flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer border ${
              showSafeArea
                ? 'bg-cyan-950/40 text-cyan-300 border-cyan-500/40'
                : 'bg-[#151620] text-gray-400 border-[#242636] hover:text-gray-200'
            }`}
            title={t.tiktokSafeZone}
          >
            <Shield className="w-3 h-3 text-cyan-400" />
            <span>{language === 'km' ? 'តំបន់ Safe' : 'Safe Area'}</span>
          </button>

          {/* Viewport Zoom Dropdown */}
          <div className="flex items-center bg-[#151620] border border-[#242636] rounded px-1.5 py-0.5 text-[11px] text-gray-300">
            <span className="text-[10px] text-gray-400 mr-1.5">{language === 'km' ? 'ពង្រីក:' : 'Zoom:'}</span>
            <select
              value={zoomScale}
              onChange={(e) => setZoomScale(e.target.value === 'fit' ? 'fit' : (parseFloat(e.target.value) as any))}
              className="bg-transparent text-gray-200 focus:outline-none cursor-pointer"
            >
              <option value="fit" className="bg-[#151620]">Fit (100%)</option>
              <option value={0.5} className="bg-[#151620]">50%</option>
              <option value={0.75} className="bg-[#151620]">75%</option>
              <option value={1} className="bg-[#151620]">100%</option>
              <option value={1.25} className="bg-[#151620]">125%</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Video Viewport Canvas */}
      <div className="flex-1 flex items-center justify-center p-3 relative overflow-hidden bg-dot-pattern">
        <div
          ref={viewportBoxRef}
          style={
            zoomScale !== 'fit'
              ? { transform: `scale(${zoomScale})`, transformOrigin: 'center center' }
              : undefined
          }
          className={`relative shadow-2xl rounded-lg overflow-hidden border border-[#252838] bg-black transition-transform duration-150 ${aspectClass}`}
        >
          {/* Main 2D Canvas */}
          <canvas
            ref={canvasRef}
            width={renderWidth}
            height={renderHeight}
            className="w-full h-full object-contain block cursor-pointer"
            onClick={() => {
              if (!isDraggingGizmo && !isResizingGizmo) {
                onTogglePlay();
              }
            }}
          />

          {/* On-Canvas Transform Gizmo (OpenReel feature) */}
          {activeSelectedClip && gizmoBox && (
            <div
              style={{
                left: gizmoBox.left,
                top: gizmoBox.top,
                width: gizmoBox.width,
                height: gizmoBox.height,
              }}
              onMouseDown={handleGizmoMouseDown}
              className={`absolute border-2 border-cyan-400/90 bg-cyan-500/5 group cursor-move z-20 pointer-events-auto transition-[box-shadow] ${
                isDraggingGizmo ? 'ring-2 ring-cyan-300 ring-offset-1 ring-offset-black' : ''
              }`}
            >
              {/* Center Crosshair Marker */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none flex items-center justify-center">
                <div className="w-full h-px bg-cyan-400/80" />
                <div className="h-full w-px bg-cyan-400/80 absolute" />
              </div>

              {/* Transform Coordinates Badge */}
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-black/80 text-[9.5px] font-mono tabular-nums text-cyan-300 whitespace-nowrap pointer-events-none border border-cyan-500/30">
                X: {gizmoBox.x}% · Y: {gizmoBox.y}% · {Math.round(gizmoBox.scale * 100)}%
              </div>

              {/* 4 Corner Resize Handles */}
              {['tl', 'tr', 'bl', 'br'].map((corner) => (
                <div
                  key={corner}
                  onMouseDown={(e) => handleResizeHandleMouseDown(e, corner)}
                  className={`absolute w-3 h-3 bg-white border border-cyan-500 rounded-sm shadow-md cursor-nwse-resize pointer-events-auto ${
                    corner === 'tl'
                      ? '-top-1.5 -left-1.5'
                      : corner === 'tr'
                      ? '-top-1.5 -right-1.5 cursor-nesw-resize'
                      : corner === 'bl'
                      ? '-bottom-1.5 -left-1.5 cursor-nesw-resize'
                      : '-bottom-1.5 -right-1.5'
                  }`}
                  title="Drag to resize clip"
                />
              ))}
            </div>
          )}

          {/* Social Media Safe Zone Overlay (OpenReel TikTok/Reels UI bounds) */}
          {showSafeArea && (
            <div className="absolute inset-0 pointer-events-none z-10">
              {aspectRatio === '9:16' ? (
                // Realistic TikTok / Reels UI boundary markers
                <div className="w-full h-full flex flex-col justify-between p-3 relative text-[10px] text-white/60">
                  {/* Top Bar Header Area (Following / For You + Search) */}
                  <div className="w-full pt-1 pb-3 px-2 border-b border-dashed border-cyan-400/40 flex justify-between items-center bg-black/25">
                    <span className="font-semibold tracking-wide">LIVE</span>
                    <div className="space-x-3 font-semibold text-white/80">
                      <span>Following</span>
                      <span className="border-b-2 border-white text-white">For You</span>
                    </div>
                    <span>🔍</span>
                  </div>

                  {/* Right Side Action Column (Avatar, Likes, Comments, Share) */}
                  <div className="absolute right-2.5 bottom-18 flex flex-col items-center space-y-3 p-1.5 border border-dashed border-rose-400/40 bg-black/30 rounded">
                    <div className="w-6 h-6 rounded-full bg-white/20 border border-white/40" />
                    <div className="text-center font-bold text-[8.5px]">❤️ 125K</div>
                    <div className="text-center font-bold text-[8.5px]">💬 840</div>
                    <div className="text-center font-bold text-[8.5px]">🔖 4.2K</div>
                    <div className="text-center font-bold text-[8.5px]">↗️ Share</div>
                    <div className="w-5 h-5 rounded-full border border-white/30 animate-spin" />
                  </div>

                  {/* Bottom Caption & Audio Bar Zone */}
                  <div className="w-[78%] pb-1 pt-2 px-2 border-t border-dashed border-amber-400/40 bg-black/35 rounded-t">
                    <div className="font-bold text-[9.5px] text-white">@opencut_creator</div>
                    <div className="text-[9px] text-white/70 line-clamp-1">
                      Viral short video preview · #capcut #videoedit #ai
                    </div>
                    <div className="text-[8px] text-cyan-300/80 mt-0.5">♫ Original Sound - OpenCut Studio</div>
                  </div>
                </div>
              ) : (
                // Standard 90% Action Safe & 80% Title Safe Guides
                <div className="w-full h-full relative">
                  <div className="absolute inset-[5%] border border-dashed border-cyan-400/30 rounded" title="Action Safe 90%">
                    <span className="absolute top-1 left-2 text-[9px] text-cyan-400/60 font-mono">Action Safe (90%)</span>
                  </div>
                  <div className="absolute inset-[10%] border border-dashed border-amber-400/30 rounded" title="Title Safe 80%">
                    <span className="absolute top-1 left-2 text-[9px] text-amber-400/60 font-mono">Title Safe (80%)</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Transport & Playback Control Bar (OpenReel & OpenShot) */}
      <div className="relative h-12 bg-[#10111a] border-t border-[#1e202d] px-2 sm:px-3.5 flex items-center justify-between z-20 shrink-0">
        {/* Left: SMPTE Timecode Display & Quick Split */}
        <div className="flex items-center space-x-1.5 font-mono tabular-nums text-xs z-10 max-w-[32%] sm:max-w-none overflow-hidden text-ellipsis whitespace-nowrap">
          <span className="text-cyan-400 font-bold bg-[#151724] px-1.5 py-0.5 rounded border border-[#23263a] text-[10.5px] sm:text-xs">
            {formatTimecode(currentTime)}
          </span>
          <span className="text-gray-600 hidden xs:inline">/</span>
          <span className="text-gray-400 text-[10px] sm:text-[11px] hidden xs:inline">{formatTimecode(totalDuration)}</span>
          
          <div className="h-3.5 w-px bg-[#202334] mx-1 hidden lg:block" />
          
          {/* Quick Split at Playhead */}
          <button
            onClick={onSplitAtPlayhead}
            className="hidden lg:flex items-center space-x-1 px-2 py-1 rounded bg-[#171825] hover:bg-[#202336] text-gray-300 hover:text-cyan-300 border border-[#25273b] text-xs font-sans font-medium transition cursor-pointer active:scale-95"
            title="Split Clip at Playhead (C)"
          >
            <Scissors className="w-3 h-3 text-cyan-400" />
            <span>{language === 'km' ? 'កាត់' : 'Split'}</span>
          </button>
        </div>

        {/* Center: Play / Pause Button & Transport Stepping (Centered Exactly at Bottom of Video Preview) */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center space-x-1 sm:space-x-1.5 z-30 pointer-events-auto">
          {/* Step Back 1s */}
          <button
            onClick={() => handleStepSeconds(-1)}
            className="hidden md:flex p-1.5 rounded hover:bg-[#1a1c29] text-gray-400 hover:text-white transition cursor-pointer"
            title="Step Back 1s"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>

          {/* Frame Step Back -1f (OpenReel / OpenShot J key) */}
          <button
            onClick={() => handleStepFrames(-1)}
            className="hidden sm:flex px-1.5 py-1 rounded bg-[#161723] hover:bg-[#202232] text-gray-300 hover:text-white border border-[#252739] text-[10.5px] font-mono tabular-nums transition cursor-pointer"
            title={t.stepPrevFrame}
          >
            -1f
          </button>

          {/* Main Play / Pause Primary Button - Centered */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onTogglePlay();
            }}
            className={`w-10 h-10 min-w-[40px] min-h-[40px] rounded-full flex items-center justify-center shadow-lg transition-all duration-150 cursor-pointer active:scale-95 touch-manipulation z-30 ${
              isPlaying
                ? 'bg-amber-400 hover:bg-amber-300 text-black shadow-amber-500/25 ring-2 ring-amber-400/50'
                : 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-cyan-500/35 hover:scale-105 ring-2 ring-cyan-400/50'
            }`}
            title={isPlaying ? 'Pause (Space / K)' : 'Play (Space / K)'}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>

          {/* Frame Step Forward +1f (OpenReel / OpenShot L key) */}
          <button
            onClick={() => handleStepFrames(1)}
            className="hidden sm:flex px-1.5 py-1 rounded bg-[#161723] hover:bg-[#202232] text-gray-300 hover:text-white border border-[#252739] text-[10.5px] font-mono tabular-nums transition cursor-pointer"
            title={t.stepNextFrame}
          >
            +1f
          </button>

          {/* Step Forward 1s */}
          <button
            onClick={() => handleStepSeconds(1)}
            className="hidden md:flex p-1.5 rounded hover:bg-[#1a1c29] text-gray-400 hover:text-white transition cursor-pointer"
            title="Step Forward 1s"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right: Preview Audio, Speed & Fullscreen */}
        <div className="flex items-center space-x-1 sm:space-x-2 z-10 shrink-0">
          {/* Speed Selector */}
          <select
            value={speedMultiplier}
            onChange={(e) => setSpeedMultiplier(parseFloat(e.target.value))}
            className="hidden sm:block bg-[#141522] text-gray-300 text-[11px] px-1.5 py-0.5 rounded border border-[#232537] focus:outline-none cursor-pointer"
            title="Preview Speed"
          >
            <option value={0.5}>0.5×</option>
            <option value={1.0}>1.0×</option>
            <option value={1.5}>1.5×</option>
            <option value={2.0}>2.0×</option>
          </select>

          {/* Mute Preview Toggle */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-1.5 rounded hover:bg-[#1a1c29] text-gray-400 hover:text-white transition cursor-pointer"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded hover:bg-[#1a1c29] text-gray-400 hover:text-white transition cursor-pointer"
            title="Fullscreen Preview"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
