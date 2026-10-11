import React, { useRef, useState, useEffect } from 'react';
import {
  Scissors,
  Trash2,
  Copy,
  Magnet,
  ZoomIn,
  ZoomOut,
  Eye,
  EyeOff,
  Volume2,
  VolumeX,
  Lock,
  Unlock,
  Plus,
  Play,
  Pause,
  Video,
  Music,
  Type,
  Edit2,
  Check,
  X,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Radio,
  Link,
  Layers,
} from 'lucide-react';
import { TimelineClip, TimelineTrack, TrackType } from '../types/editor';
import { Language, translations } from '../utils/i18n';

interface TimelineProps {
  tracks: TimelineTrack[];
  clips: TimelineClip[];
  currentTime: number;
  totalDuration: number;
  selectedClipId: string | null;
  onSelectClip: (id: string | null) => void;
  onSeek: (time: number) => void;
  onSplitClip: (clipId: string, time: number) => void;
  onSplitDeleteLeft: (clipId: string, time: number) => void;
  onSplitDeleteRight: (clipId: string, time: number) => void;
  onDeleteClip: (clipId: string) => void;
  onDuplicateClip: (clipId: string) => void;
  onUpdateClipTiming: (clipId: string, newStart: number, newDuration: number) => void;
  onToggleTrackVisibility: (trackId: string) => void;
  onToggleTrackMute: (trackId: string) => void;
  onToggleTrackLock: (trackId: string) => void;
  onRenameTrack: (trackId: string, newName: string) => void;
  onDeleteTrack: (trackId: string) => void;
  onAddTrack: (type: TrackType) => void;
  onMoveTrackUp?: (trackId: string) => void;
  onMoveTrackDown?: (trackId: string) => void;
  onClearTrackClips?: (trackId: string) => void;
  onFinishClipDrag?: (
    clipId: string,
    finalStart: number,
    finalDuration: number,
    targetTrackId?: string
  ) => void;
  onFinishClipTrim?: () => void;
  isAutoConnect?: boolean;
  onToggleAutoConnect?: () => void;
  onCloseGaps?: (trackId?: string) => void;
  onSplitAllTracks?: (time: number) => void;
  isPlaying?: boolean;
  onTogglePlay?: () => void;
  language: Language;
}

interface ContextMenuState {
  x: number;
  y: number;
  clipId: string;
}

interface ClipDragState {
  clipId: string;
  trackId: string;
  targetTrackId?: string;
  type: 'move' | 'trim-left' | 'trim-right';
  startX: number;
  initialStart: number;
  initialDuration: number;
  currentDeltaX: number;
  currentStart: number;
  currentDuration: number;
  dropInsertX?: number;
  snapGuideX?: number;
}

export const Timeline: React.FC<TimelineProps> = ({
  tracks,
  clips,
  currentTime,
  totalDuration,
  selectedClipId,
  onSelectClip,
  onSeek,
  onSplitClip,
  onSplitDeleteLeft,
  onSplitDeleteRight,
  onDeleteClip,
  onDuplicateClip,
  onUpdateClipTiming,
  onToggleTrackVisibility,
  onToggleTrackMute,
  onToggleTrackLock,
  onRenameTrack,
  onDeleteTrack,
  onAddTrack,
  onMoveTrackUp,
  onMoveTrackDown,
  onClearTrackClips,
  onFinishClipDrag,
  onFinishClipTrim,
  isAutoConnect = true,
  onToggleAutoConnect,
  onCloseGaps,
  onSplitAllTracks,
  isPlaying = false,
  onTogglePlay,
  language,
}) => {
  const t = translations[language];
  const [zoom, setZoom] = useState<number>(45); // pixels per second
  const [trackHeight, setTrackHeight] = useState<number>(18); // ultra-slim tracks (18px default)
  const [isSnapping, setIsSnapping] = useState<boolean>(true);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isDraggingPlayhead = useRef<boolean>(false);
  const hasDraggedRef = useRef<boolean>(false);

  // Track editing state
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null);
  const [tempTrackName, setTempTrackName] = useState<string>('');
  const [isAddTrackOpen, setIsAddTrackOpen] = useState<boolean>(false);
  const [activeTrackMenuId, setActiveTrackMenuId] = useState<string | null>(null);

  // Clip right-click context menu
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  // Dragging state for clips
  const [dragState, setDragState] = useState<ClipDragState | null>(null);

  const timelineWidth = Math.max(1400, (totalDuration + 8) * zoom);

  // Ruler tick marks calculation
  const rulerTicks = [];
  const tickInterval = zoom >= 60 ? 1 : zoom >= 30 ? 2 : 5;
  for (let s = 0; s <= totalDuration + 12; s += tickInterval) {
    rulerTicks.push(s);
  }

  // Handle playhead scrubbing on ruler
  const handleRulerMouseDown = (e: React.MouseEvent) => {
    isDraggingPlayhead.current = true;
    updateTimeFromEvent(e);
  };

  const updateTimeFromEvent = (e: React.MouseEvent | MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const scrollLeft = containerRef.current.scrollLeft;
    const trackHeaderWidth = 256; // 256px (w-64) track headers column
    const clickX = e.clientX - rect.left + scrollLeft - trackHeaderWidth;
    const newTime = Math.max(0, Math.min(totalDuration + 5, clickX / zoom));
    onSeek(Math.round(newTime * 100) / 100);
  };

  // Close context menu and menus on window click
  useEffect(() => {
    const handleGlobalClick = () => {
      if (contextMenu) setContextMenu(null);
      if (activeTrackMenuId) setActiveTrackMenuId(null);
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, [contextMenu, activeTrackMenuId]);

  // Global mousemove/mouseup listeners for dragging playhead or clips
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingPlayhead.current) {
        updateTimeFromEvent(e);
      } else if (dragState) {
        const deltaX = e.clientX - dragState.startX;
        if (Math.abs(deltaX) > 2) {
          hasDraggedRef.current = true;
        }
        const deltaSeconds = deltaX / zoom;

        // Auto-scroll timeline container if dragging near horizontal edges
        if (containerRef.current) {
          const containerRect = containerRef.current.getBoundingClientRect();
          const trackHeaderWidth = 256; // 256px (w-64)
          const rightDist = containerRect.right - e.clientX;
          const leftDist = e.clientX - (containerRect.left + trackHeaderWidth);

          if (rightDist < 50 && rightDist > -30) {
            containerRef.current.scrollLeft += 12;
          } else if (leftDist < 50 && leftDist > -30) {
            containerRef.current.scrollLeft -= 12;
          }
        }

        // Detect track hovered vertically (allows dragging clips between compatible tracks)
        let targetTrackId = dragState.targetTrackId || dragState.trackId;
        if (containerRef.current) {
          const containerRect = containerRef.current.getBoundingClientRect();
          const rulerHeight = 28;
          const relativeY = e.clientY - containerRect.top + containerRef.current.scrollTop - rulerHeight;
          const hoveredIndex = Math.floor(relativeY / trackHeight);
          if (hoveredIndex >= 0 && hoveredIndex < tracks.length) {
            const candidateTrack = tracks[hoveredIndex];
            const sourceTrack = tracks.find((t) => t.id === dragState.trackId);
            if (sourceTrack && candidateTrack && !candidateTrack.isLocked) {
              const isVideoGroup = (t: TrackType) => t === 'video' || t === 'overlay';
              const isAudioGroup = (t: TrackType) => t === 'audio' || t === 'sfx';
              if (
                (isVideoGroup(sourceTrack.type) && isVideoGroup(candidateTrack.type)) ||
                (isAudioGroup(sourceTrack.type) && isAudioGroup(candidateTrack.type)) ||
                sourceTrack.type === candidateTrack.type
              ) {
                targetTrackId = candidateTrack.id;
              }
            }
          }
        }

        if (dragState.type === 'move') {
          let tentativeStart = Math.max(0, dragState.initialStart + deltaSeconds);
          let snapGuideX: number | undefined = undefined;

          const otherClips = clips
            .filter((c) => c.trackId === targetTrackId && c.id !== dragState.clipId)
            .sort((a, b) => a.start - b.start);

          if (isSnapping) {
            // Snap to 0s
            if (Math.abs(tentativeStart) < 0.2) {
              tentativeStart = 0;
              snapGuideX = 0;
            }
            // Snap to playhead
            else if (Math.abs(tentativeStart - currentTime) < 0.2) {
              tentativeStart = currentTime;
              snapGuideX = currentTime * zoom;
            } else {
              // Snap to neighbor clip edges
              for (const c of otherClips) {
                if (Math.abs(tentativeStart - (c.start + c.duration)) < 0.2) {
                  tentativeStart = c.start + c.duration;
                  snapGuideX = (c.start + c.duration) * zoom;
                  break;
                }
                if (Math.abs(tentativeStart + dragState.initialDuration - c.start) < 0.2) {
                  tentativeStart = Math.max(0, c.start - dragState.initialDuration);
                  snapGuideX = c.start * zoom;
                  break;
                }
              }
            }
          }

          // Calculate drop insertion line if in magnetic video track mode
          let dropInsertX: number | undefined = undefined;
          const currentTrack = tracks.find((t) => t.id === targetTrackId);
          const isMagneticTrack = isAutoConnect && currentTrack?.type === 'video';

          if (isMagneticTrack && otherClips.length > 0) {
            const dragCenter = tentativeStart + dragState.initialDuration / 2;
            let insertIdx = otherClips.length;
            for (let i = 0; i < otherClips.length; i++) {
              const c = otherClips[i];
              const mid = c.start + c.duration / 2;
              // Check center or leading edge threshold so dragging left or right reorders immediately
              if (dragCenter < mid || tentativeStart < c.start + c.duration * 0.35) {
                insertIdx = i;
                break;
              }
            }
            if (insertIdx === 0) {
              dropInsertX = 0;
            } else {
              const prev = otherClips[insertIdx - 1];
              dropInsertX = (prev.start + prev.duration) * zoom;
            }
          }

          setDragState((prev) =>
            prev
              ? {
                  ...prev,
                  targetTrackId,
                  currentDeltaX: deltaX,
                  currentStart: Math.round(tentativeStart * 100) / 100,
                  dropInsertX,
                  snapGuideX,
                }
              : null
          );
        } else if (dragState.type === 'trim-left') {
          const newStart = Math.max(0, dragState.initialStart + deltaSeconds);
          const newDuration = Math.max(0.3, dragState.initialDuration - deltaSeconds);
          onUpdateClipTiming(dragState.clipId, Math.round(newStart * 100) / 100, Math.round(newDuration * 100) / 100);
        } else if (dragState.type === 'trim-right') {
          const newDuration = Math.max(0.3, dragState.initialDuration + deltaSeconds);
          onUpdateClipTiming(dragState.clipId, dragState.initialStart, Math.round(newDuration * 100) / 100);
        }
      }
    };

    const handleMouseUp = () => {
      isDraggingPlayhead.current = false;
      if (dragState && hasDraggedRef.current) {
        if (dragState.type === 'move') {
          if (onFinishClipDrag) {
            onFinishClipDrag(
              dragState.clipId,
              dragState.currentStart,
              dragState.currentDuration,
              dragState.targetTrackId || dragState.trackId
            );
          } else {
            onUpdateClipTiming(
              dragState.clipId,
              dragState.currentStart,
              dragState.currentDuration
            );
          }
        } else if (dragState.type === 'trim-left' || dragState.type === 'trim-right') {
          if (onFinishClipTrim) {
            onFinishClipTrim();
          }
        }
      }
      setDragState(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, zoom, currentTime, isSnapping, isAutoConnect, totalDuration, clips, tracks, onFinishClipDrag, onFinishClipTrim, onUpdateClipTiming]);

  // Clip drag starters
  const startClipDrag = (e: React.MouseEvent, clip: TimelineClip, type: 'move' | 'trim-left' | 'trim-right') => {
    e.stopPropagation();
    const track = tracks.find((t) => t.id === clip.trackId);
    if (track?.isLocked) {
      return;
    }

    hasDraggedRef.current = false;
    onSelectClip(clip.id);
    setDragState({
      clipId: clip.id,
      trackId: clip.trackId,
      targetTrackId: clip.trackId,
      type,
      startX: e.clientX,
      initialStart: clip.start,
      initialDuration: clip.duration,
      currentDeltaX: 0,
      currentStart: clip.start,
      currentDuration: clip.duration,
    });
  };

  const handleStartRename = (track: TimelineTrack) => {
    setEditingTrackId(track.id);
    setTempTrackName(track.name);
  };

  const handleSaveRename = (trackId: string) => {
    if (tempTrackName.trim()) {
      onRenameTrack(trackId, tempTrackName.trim());
    }
    setEditingTrackId(null);
  };

  const handleClipContextMenu = (e: React.MouseEvent, clipId: string) => {
    e.preventDefault();
    e.stopPropagation();
    onSelectClip(clipId);
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      clipId,
    });
  };

  // CapCut: Active clip can be explicitly selected clip OR clip under playhead
  const selectedClip = clips.find((c) => c.id === selectedClipId);
  const clipUnderPlayhead = clips.find(
    (c) => currentTime >= c.start && currentTime <= c.start + c.duration
  );
  const activeClip = selectedClip || clipUnderPlayhead || null;
  const canSplit = Boolean(activeClip);

  return (
    <div className="h-44 bg-[#10111a] border-t border-[#20212f] flex flex-col select-none relative">
      {/* 1. Timeline Toolbar with CapCut Sleek Actions */}
      <div className="h-9 bg-[#12131d] border-b border-[#212334] px-3 flex items-center justify-between z-20 shrink-0">
        {/* Left tools: Play / Pause + CapCut Split Options + Delete + Auto-Connect */}
        <div className="flex items-center space-x-1.5 flex-wrap">
          {/* Quick Timeline Play / Pause Button */}
          {onTogglePlay && (
            <button
              onClick={onTogglePlay}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded text-xs font-bold transition cursor-pointer shadow-sm mr-1 ${
                isPlaying
                  ? 'bg-cyan-500 hover:bg-cyan-400 text-black'
                  : 'bg-[#1c1e2d] hover:bg-[#27293e] text-white border border-[#2b2d42]'
              }`}
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            >
              {isPlaying ? (
                <Pause className="w-3.5 h-3.5 fill-current" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
              )}
              <span>{isPlaying ? 'Pause' : 'Play'}</span>
            </button>
          )}

          {/* CapCut Split Action 1: Split at playhead (Ctrl+B / C) */}
          <button
            onClick={() => {
              if (activeClip) onSplitClip(activeClip.id, currentTime);
            }}
            disabled={!canSplit}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-semibold border transition ${
              canSplit
                ? 'bg-[#181926] hover:bg-[#222436] text-gray-200 border-[#282a3d] hover:border-cyan-500/50 active:scale-95 cursor-pointer'
                : 'bg-transparent text-gray-600 border-transparent cursor-not-allowed'
            }`}
            title={`${t.splitClip} [Ctrl+B / C]`}
          >
            <Scissors className={`w-3.5 h-3.5 ${canSplit ? 'text-cyan-400' : 'text-gray-600'}`} />
            <span>{language === 'km' ? 'កាត់' : 'Split'}</span>
            <span className={`text-[10px] font-mono px-1 rounded ml-0.5 ${canSplit ? 'text-gray-400 bg-[#12131e]' : 'text-gray-700'}`}>
              Ctrl+B
            </span>
          </button>

          {/* CapCut Split All Tracks at playhead (Ctrl+Shift+B) */}
          {onSplitAllTracks && (
            <button
              onClick={() => onSplitAllTracks(currentTime)}
              className="flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-semibold border transition bg-[#181926] hover:bg-[#222436] text-gray-200 border-[#282a3d] hover:border-cyan-500/50 active:scale-95 cursor-pointer"
              title={`${t.splitAllTracks} [Ctrl+Shift+B]`}
            >
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>{language === 'km' ? 'កាត់ទាំងអស់' : 'Split All'}</span>
              <span className="text-[10px] font-mono px-1 rounded ml-0.5 text-gray-400 bg-[#12131e] hidden sm:inline">
                Ctrl+Shift+B
              </span>
            </button>
          )}

          {/* CapCut Split Action 2: Split & Delete Left (Q) */}
          <button
            onClick={() => {
              if (activeClip) onSplitDeleteLeft(activeClip.id, currentTime);
            }}
            disabled={!canSplit}
            className={`flex items-center space-x-1 px-2 py-1 rounded text-xs font-semibold border transition ${
              canSplit
                ? 'bg-[#181926] hover:bg-[#222436] text-gray-200 border-[#282a3d] hover:border-amber-500/50 active:scale-95 cursor-pointer'
                : 'bg-transparent text-gray-600 border-transparent cursor-not-allowed'
            }`}
            title={`${t.splitDeleteLeft} [Q]`}
          >
            <div className="flex items-center -space-x-1">
              <ChevronLeft className={`w-3 h-3 ${canSplit ? 'text-amber-400' : 'text-gray-600'}`} />
              <Scissors className={`w-3 h-3 ${canSplit ? 'text-amber-400' : 'text-gray-600'}`} />
            </div>
            <span>{language === 'km' ? 'លុបឆ្វេង' : 'Del Left'}</span>
            <span className={`text-[10px] font-mono px-1 rounded ml-0.5 ${canSplit ? 'text-amber-300 bg-[#12131e]' : 'text-gray-700'}`}>
              Q
            </span>
          </button>

          {/* CapCut Split Action 3: Split & Delete Right (W) */}
          <button
            onClick={() => {
              if (activeClip) onSplitDeleteRight(activeClip.id, currentTime);
            }}
            disabled={!canSplit}
            className={`flex items-center space-x-1 px-2 py-1 rounded text-xs font-semibold border transition ${
              canSplit
                ? 'bg-[#181926] hover:bg-[#222436] text-gray-200 border-[#282a3d] hover:border-amber-500/50 active:scale-95 cursor-pointer'
                : 'bg-transparent text-gray-600 border-transparent cursor-not-allowed'
            }`}
            title={`${t.splitDeleteRight} [W]`}
          >
            <div className="flex items-center -space-x-1">
              <Scissors className={`w-3 h-3 ${canSplit ? 'text-amber-400' : 'text-gray-600'}`} />
              <ChevronRight className={`w-3 h-3 ${canSplit ? 'text-amber-400' : 'text-gray-600'}`} />
            </div>
            <span>{language === 'km' ? 'លុបស្ដាំ' : 'Del Right'}</span>
            <span className={`text-[10px] font-mono px-1 rounded ml-0.5 ${canSplit ? 'text-amber-300 bg-[#12131e]' : 'text-gray-700'}`}>
              W
            </span>
          </button>

          <div className="h-4 w-px bg-[#26283c] mx-0.5" />

          {/* Delete Clip */}
          <button
            onClick={() => {
              if (activeClip) onDeleteClip(activeClip.id);
            }}
            disabled={!activeClip}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs transition border font-semibold ${
              activeClip
                ? 'bg-[#181926] hover:bg-rose-950/40 text-gray-200 hover:text-rose-300 border-[#282a3d] hover:border-rose-500/40 cursor-pointer'
                : 'text-gray-700 border-transparent cursor-not-allowed'
            }`}
            title={isAutoConnect ? t.deleteAndConnect : t.deleteClip}
          >
            <Trash2 className={`w-3.5 h-3.5 ${activeClip ? 'text-rose-400' : 'text-gray-700'}`} />
            <span>{isAutoConnect ? (language === 'km' ? 'លុប & ភ្ជាប់' : 'Del & Snap') : (language === 'km' ? 'លុប' : 'Delete')}</span>
            <span className={`text-[10px] font-mono px-1 rounded ml-0.5 ${activeClip ? 'text-rose-300 bg-[#12131e]' : 'text-gray-700'}`}>
              Del
            </span>
          </button>

          {/* Duplicate Clip */}
          <button
            onClick={() => {
              if (activeClip) onDuplicateClip(activeClip.id);
            }}
            disabled={!activeClip}
            className={`p-1.5 rounded transition ${
              activeClip
                ? 'hover:bg-[#222436] text-gray-300 hover:text-white cursor-pointer'
                : 'text-gray-700 cursor-not-allowed'
            }`}
            title={t.duplicateClip}
          >
            <Copy className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-[#26283c] mx-0.5" />

          {/* Auto-Connect / Magnetic Ripple Toggle */}
          {onToggleAutoConnect && (
            <button
              onClick={onToggleAutoConnect}
              className={`px-2.5 py-1 rounded flex items-center space-x-1.5 text-xs font-semibold transition border cursor-pointer ${
                isAutoConnect
                  ? 'bg-cyan-950/30 text-cyan-300 border-cyan-500/40'
                  : 'bg-[#181926] text-gray-400 border-[#282a3d] hover:text-gray-200'
              }`}
              title={t.autoConnect}
            >
              <Link className={`w-3.5 h-3.5 ${isAutoConnect ? 'text-cyan-400' : 'text-gray-500'}`} />
              <span>{language === 'km' ? 'ភ្ជាប់ស្វ័យប្រវត្តិ' : 'Auto-Connect'}</span>
              <span className={`w-1.5 h-1.5 rounded-full ${isAutoConnect ? 'bg-cyan-400' : 'bg-gray-600'}`} />
            </button>
          )}

          {/* Close Gaps / Snap All Clips Button */}
          {onCloseGaps && (
            <button
              onClick={() => onCloseGaps()}
              className="px-2.5 py-1 rounded flex items-center space-x-1 text-xs font-medium text-gray-300 hover:text-white bg-[#181926] hover:bg-[#222436] border border-[#282a3d] transition cursor-pointer"
              title={t.closeAllGaps}
            >
              <Magnet className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden md:inline">{language === 'km' ? 'ភ្ជាប់ចន្លោះទទេ' : 'Close Gaps'}</span>
            </button>
          )}
        </div>

        {/* Right tools: Track Height Selector + Fit & Zoom */}
        <div className="flex items-center space-x-2 text-xs text-gray-400">
          {/* CapCut Track Height Switcher */}
          <div className="flex items-center space-x-1 pr-2 border-r border-[#26283d]">
            <span className="text-[10px] text-gray-400 font-medium hidden sm:inline">
              {language === 'km' ? 'កំពស់ Tracks:' : 'Tracks:'}
            </span>
            <div className="flex items-center bg-[#161825] border border-[#27293d] rounded p-0.5 space-x-0.5">
              {[
                { label: language === 'km' ? 'តូចបំផុត (14px)' : 'Nano (14px)', val: 14 },
                { label: language === 'km' ? 'ស្លីម (18px)' : 'Slim (18px)', val: 18 },
                { label: language === 'km' ? 'តូច (22px)' : 'Compact (22px)', val: 22 },
                { label: language === 'km' ? 'មធ្យម (28px)' : 'Medium (28px)', val: 28 },
              ].map((preset) => (
                <button
                  key={preset.val}
                  onClick={() => setTrackHeight(preset.val)}
                  className={`px-1.5 py-0.5 rounded text-[9px] font-semibold transition cursor-pointer ${
                    trackHeight === preset.val
                      ? 'bg-cyan-500 text-black shadow-sm'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-[#222436]'
                  }`}
                  title={`${preset.label}`}
                >
                  {preset.val}px
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => setZoom(45)}
            className="px-2 py-0.5 rounded bg-[#181926] hover:bg-[#222436] border border-[#282a3d] text-[10px] text-gray-300 font-medium transition cursor-pointer"
            title="Reset Zoom (Fit)"
          >
            Fit (100%)
          </button>
          <ZoomOut className="w-3.5 h-3.5 cursor-pointer hover:text-white" onClick={() => setZoom(Math.max(20, zoom - 10))} />
          <input
            type="range"
            min="20"
            max="120"
            value={zoom}
            onChange={(e) => setZoom(parseInt(e.target.value, 10))}
            className="w-20 accent-cyan-400 cursor-pointer h-1.5 bg-[#25283c] rounded"
          />
          <ZoomIn className="w-3.5 h-3.5 cursor-pointer hover:text-white" onClick={() => setZoom(Math.min(120, zoom + 10))} />
          <span className="font-mono text-[10px] w-7 text-right text-gray-400">{zoom}px</span>
        </div>
      </div>

      {/* 2. Tracks & Timeline Body */}
      <div
        ref={containerRef}
        className="flex-1 flex overflow-x-auto overflow-y-auto relative custom-scrollbar bg-[#0b0c14]"
      >
        {/* Track Headers Column (Fixed on left, widened to 256px) */}
        <div
          className="w-64 sticky left-0 z-20 bg-[#12131d] border-r border-[#20212f] shrink-0 flex flex-col select-none"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header spacer aligned with Ruler with + Add Track button */}
          <div className="h-7 border-b border-[#20212f] px-2.5 flex items-center justify-between text-[11px] font-semibold text-gray-400 bg-[#141522] relative">
            <span className="font-bold text-gray-200">{t.tracks} ({tracks.length})</span>

            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsAddTrackOpen(!isAddTrackOpen);
                }}
                className="flex items-center space-x-1 px-2 py-0.5 rounded bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 text-[10px] font-bold border border-cyan-500/40 transition cursor-pointer"
                title={t.addTrack}
              >
                <Plus className="w-3 h-3 text-cyan-300" />
                <span>+ Track</span>
                <ChevronDown className="w-2.5 h-2.5" />
              </button>

              {/* Add Track dropdown menu */}
              {isAddTrackOpen && (
                <div
                  className="absolute right-0 top-7 w-44 bg-[#181a29] border border-[#2c2f46] rounded-lg shadow-2xl py-1 z-50 text-[11px]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => {
                      onAddTrack('video');
                      setIsAddTrackOpen(false);
                    }}
                    className="w-full px-2.5 py-1.5 text-left text-gray-200 hover:bg-[#25283e] flex items-center space-x-2"
                  >
                    <Video className="w-3.5 h-3.5 text-blue-400" />
                    <span>{t.addVideoTrack}</span>
                  </button>
                  <button
                    onClick={() => {
                      onAddTrack('audio');
                      setIsAddTrackOpen(false);
                    }}
                    className="w-full px-2.5 py-1.5 text-left text-gray-200 hover:bg-[#25283e] flex items-center space-x-2"
                  >
                    <Music className="w-3.5 h-3.5 text-purple-400" />
                    <span>{t.addAudioTrack}</span>
                  </button>
                  <button
                    onClick={() => {
                      onAddTrack('sfx');
                      setIsAddTrackOpen(false);
                    }}
                    className="w-full px-2.5 py-1.5 text-left text-gray-200 hover:bg-[#25283e] flex items-center space-x-2"
                  >
                    <Radio className="w-3.5 h-3.5 text-pink-400" />
                    <span>{language === 'km' ? 'បន្ថែមជួរ Voiceover / SFX' : 'Add Voiceover Track'}</span>
                  </button>
                  <button
                    onClick={() => {
                      onAddTrack('text');
                      setIsAddTrackOpen(false);
                    }}
                    className="w-full px-2.5 py-1.5 text-left text-gray-200 hover:bg-[#25283e] flex items-center space-x-2"
                  >
                    <Type className="w-3.5 h-3.5 text-yellow-400" />
                    <span>{t.addTextTrack}</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Track Labels & Controls */}
          {tracks.map((track, trackIndex) => {
            const actionIconSize = trackHeight <= 18 ? 'w-2 h-2' : 'w-2.5 h-2.5';
            return (
              <div
                key={track.id}
                style={{ height: `${trackHeight}px` }}
                className={`border-b border-[#1c1e2b] px-1.5 flex items-center justify-between text-xs text-gray-300 hover:bg-[#181926] transition ${
                  track.isLocked ? 'bg-[#151620] opacity-80' : ''
                }`}
              >
                {/* Left: Track Dot & Editable Name */}
                <div className="flex items-center space-x-1 min-w-0 flex-1 mr-1">
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      track.type === 'video'
                        ? 'bg-blue-400'
                        : track.type === 'text'
                        ? 'bg-yellow-400'
                        : track.type === 'overlay'
                        ? 'bg-cyan-400'
                        : track.type === 'sfx'
                        ? 'bg-pink-400'
                        : 'bg-purple-400'
                    }`}
                  />

                  {editingTrackId === track.id ? (
                    <div className="flex items-center space-x-1 min-w-0 flex-1" onClick={(e) => e.stopPropagation()}>
                      <input
                        autoFocus
                        type="text"
                        value={tempTrackName}
                        onChange={(e) => setTempTrackName(e.target.value)}
                        onBlur={() => handleSaveRename(track.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveRename(track.id);
                          if (e.key === 'Escape') setEditingTrackId(null);
                        }}
                        className="bg-[#24273d] text-white px-1 py-0 rounded text-[9px] font-medium w-full outline-none border border-cyan-400 h-3.5"
                      />
                      <button
                        onClick={() => handleSaveRename(track.id)}
                        className="p-0.5 hover:text-cyan-400 text-emerald-400"
                        title="Save"
                      >
                        <Check className={actionIconSize} />
                      </button>
                      <button
                        onClick={() => setEditingTrackId(null)}
                        className="p-0.5 text-gray-400 hover:text-gray-200"
                        title="Cancel"
                      >
                        <X className={actionIconSize} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1 truncate flex-1 min-w-0 group">
                      <span
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          handleStartRename(track);
                        }}
                        className="font-medium text-[9.5px] truncate cursor-pointer hover:text-cyan-300 leading-none"
                        title={t.renameTrack}
                      >
                        {track.name}
                      </span>

                      {/* Pencil Edit button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartRename(track);
                        }}
                        className="p-0.5 text-gray-500 hover:text-cyan-400 opacity-60 hover:opacity-100 transition"
                        title={t.renameTrack}
                      >
                        <Edit2 className={actionIconSize} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Right: Track Actions (Move Up/Down, Lock, Visibility, Mute, Delete) */}
                <div className="flex items-center space-x-0.5 shrink-0">
                  {/* Move track up / down */}
                  {onMoveTrackUp && trackIndex > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveTrackUp(track.id);
                      }}
                      className="p-0.5 rounded text-gray-500 hover:text-cyan-300 hover:bg-[#25283c] transition"
                      title="Move Track Up"
                    >
                      <ArrowUp className={actionIconSize} />
                    </button>
                  )}

                  {onMoveTrackDown && trackIndex < tracks.length - 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveTrackDown(track.id);
                      }}
                      className="p-0.5 rounded text-gray-500 hover:text-cyan-300 hover:bg-[#25283c] transition"
                      title="Move Track Down"
                    >
                      <ArrowDown className={actionIconSize} />
                    </button>
                  )}

                  {/* Lock Track Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleTrackLock(track.id);
                    }}
                    className={`p-0.5 rounded hover:bg-[#25283c] transition ${
                      track.isLocked ? 'text-amber-400' : 'text-gray-500 hover:text-gray-200'
                    }`}
                    title={track.isLocked ? t.unlockTrack : t.lockTrack}
                  >
                    {track.isLocked ? <Lock className={actionIconSize} /> : <Unlock className={actionIconSize} />}
                  </button>

                  {/* Hide / Show Track */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleTrackVisibility(track.id);
                    }}
                    className={`p-0.5 rounded hover:bg-[#25283c] transition ${
                      track.isVisible ? 'text-gray-400 hover:text-white' : 'text-gray-600'
                    }`}
                    title="Toggle Visibility"
                  >
                    {track.isVisible ? <Eye className={actionIconSize} /> : <EyeOff className={`${actionIconSize} text-rose-400`} />}
                  </button>

                  {/* Mute Track */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleTrackMute(track.id);
                    }}
                    className={`p-0.5 rounded hover:bg-[#25283c] transition ${
                      !track.isMuted ? 'text-gray-400 hover:text-white' : 'text-gray-600'
                    }`}
                    title="Mute Track"
                  >
                    {track.isMuted ? <VolumeX className={`${actionIconSize} text-rose-400`} /> : <Volume2 className={actionIconSize} />}
                  </button>

                  {/* Connect / Close Gaps in Track */}
                  {onCloseGaps && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onCloseGaps(track.id);
                      }}
                      className="p-0.5 rounded hover:bg-[#25283c] text-cyan-400 hover:text-cyan-300 transition"
                      title={language === 'km' ? 'ភ្ជាប់ Clips ក្នុង Track នេះ' : 'Connect clips in this track'}
                    >
                      <Link className={actionIconSize} />
                    </button>
                  )}

                  {/* Delete Track Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (tracks.length > 1) {
                        onDeleteTrack(track.id);
                      }
                    }}
                    disabled={tracks.length <= 1}
                    className={`p-0.5 rounded transition ${
                      tracks.length > 1
                        ? 'hover:bg-rose-500/20 text-gray-500 hover:text-rose-400 cursor-pointer'
                        : 'text-gray-700 cursor-not-allowed opacity-40'
                    }`}
                    title={t.deleteTrack}
                  >
                    <Trash2 className={actionIconSize} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Scrollable Timeline Area */}
        <div
          className="flex-1 relative flex flex-col"
          style={{ width: `${timelineWidth}px`, minWidth: `${timelineWidth}px` }}
        >
          {/* 1. Timecode Ruler */}
          <div
            className="h-7 border-b border-[#20212f] bg-[#131420] relative cursor-pointer select-none"
            onMouseDown={handleRulerMouseDown}
            onClick={(e) => {
              e.stopPropagation();
              updateTimeFromEvent(e);
            }}
          >
            {rulerTicks.map((second) => (
              <div
                key={second}
                className="absolute top-0 bottom-0 border-l border-[#27293d] flex flex-col justify-between pl-1 text-[9px] font-mono text-gray-500 pointer-events-none"
                style={{ left: `${second * zoom}px` }}
              >
                <span>{second}s</span>
                <div className="w-px h-1.5 bg-[#3a3d58]" />
              </div>
            ))}
          </div>

          {/* 2. Track Lanes with Clips */}
          <div className="flex-1 relative flex flex-col">
            {/* Global Magnetic Snap Line across tracks */}
            {dragState && dragState.snapGuideX !== undefined && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-cyan-400 shadow-[0_0_12px_#22d3ee] z-40 pointer-events-none"
                style={{ left: `${dragState.snapGuideX}px` }}
              >
                <div className="w-2.5 h-2.5 bg-cyan-400 rotate-45 -translate-x-1/2 -mt-1 shadow-md shadow-cyan-400" />
              </div>
            )}

            {tracks.map((track) => {
              const trackClips = clips
                .filter((c) => c.trackId === track.id)
                .sort((a, b) => a.start - b.start);

              return (
                <div
                  key={track.id}
                  style={{ height: `${trackHeight}px` }}
                  onClick={(e) => {
                    if (e.target === e.currentTarget) {
                      updateTimeFromEvent(e);
                      onSelectClip(null);
                    }
                  }}
                  className={`border-b border-[#181a28] relative hover:bg-[#12131e]/50 transition ${
                    track.isLocked ? 'bg-amber-950/10' : ''
                  } ${
                    dragState &&
                    dragState.type === 'move' &&
                    (dragState.targetTrackId || dragState.trackId) === track.id &&
                    dragState.trackId !== track.id
                      ? 'bg-cyan-950/40 ring-1 ring-cyan-500/50'
                      : ''
                  }`}
                >
                  {/* Magnetic Drop Insertion Line on this track */}
                  {dragState &&
                    dragState.type === 'move' &&
                    (dragState.targetTrackId || dragState.trackId) === track.id &&
                    dragState.dropInsertX !== undefined && (
                      <div
                        className="absolute top-0 bottom-0 w-1 bg-cyan-400 shadow-[0_0_12px_#06b6d4] z-40 pointer-events-none flex flex-col justify-between items-center -translate-x-1/2 animate-pulse"
                        style={{ left: `${dragState.dropInsertX}px` }}
                      >
                        <div className="w-2.5 h-2.5 bg-cyan-400 rotate-45 -mt-1 shadow-md shadow-cyan-400" />
                        <div className="w-2.5 h-2.5 bg-cyan-400 rotate-45 -mb-1 shadow-md shadow-cyan-400" />
                      </div>
                    )}

                  {/* Leading Gap Snap indicator before first clip */}
                  {!track.isLocked && trackClips.length > 0 && trackClips[0].start > 0.35 && onCloseGaps && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        onCloseGaps(track.id);
                      }}
                      className="absolute top-[1px] bottom-[1px] border border-dashed border-cyan-500/40 rounded flex items-center justify-center bg-cyan-950/20 hover:bg-cyan-500/20 cursor-pointer text-[10px] text-cyan-300 transition group/gap z-5"
                      style={{
                        left: '2px',
                        width: `${Math.max(20, trackClips[0].start * zoom - 4)}px`,
                      }}
                      title={language === 'km' ? 'ចុចដើម្បីភ្ជាប់ចន្លោះទទេនេះ' : 'Click to close gap'}
                    >
                      <span className="opacity-0 group-hover/gap:opacity-100 flex items-center space-x-0.5 font-semibold text-[9px]">
                        <Link className="w-2.5 h-2.5" />
                        <span>{language === 'km' ? 'ភ្ជាប់' : 'Snap'}</span>
                      </span>
                    </div>
                  )}

                  {trackClips.map((clip, idx) => {
                    const isSelected = selectedClipId === clip.id;
                    const isBeingDragged = dragState?.clipId === clip.id && dragState.type === 'move';
                    const left = isBeingDragged ? dragState.currentStart * zoom : clip.start * zoom;
                    const width = Math.max(18, clip.duration * zoom);
                    const nextClip = trackClips[idx + 1];
                    const clipEnd = clip.start + clip.duration;
                    const gap = nextClip ? nextClip.start - clipEnd : 0;

                    return (
                      <React.Fragment key={clip.id}>
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectClip(clip.id);
                            if (!hasDraggedRef.current) {
                              updateTimeFromEvent(e);
                            }
                          }}
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            onSelectClip(clip.id);
                            startClipDrag(e, clip, 'move');
                          }}
                          onContextMenu={(e) => handleClipContextMenu(e, clip.id)}
                          title={language === 'km' ? 'អូសទៅឆ្វេង ឬស្ដាំ ដើម្បីប្ដូរទីតាំងលើ Track' : 'Drag left or right on track'}
                          className={`absolute top-[1px] bottom-[1px] rounded-[3px] flex items-center px-1 shadow-sm transition-shadow group select-none ${
                            isBeingDragged
                              ? 'overflow-visible ring-2 ring-cyan-300 shadow-2xl shadow-cyan-950 z-50 scale-[1.02] opacity-95 cursor-grabbing brightness-110'
                              : isSelected
                              ? 'overflow-hidden ring-1.5 ring-cyan-400 shadow-md shadow-cyan-900/50 z-10 brightness-110 cursor-grab'
                              : 'overflow-hidden hover:brightness-105 cursor-grab'
                          } ${track.isLocked ? 'cursor-not-allowed opacity-90' : ''}`}
                          style={{
                            left: `${left}px`,
                            width: `${width}px`,
                            backgroundColor: clip.color || '#0284c7',
                          }}
                        >
                          {/* Floating drag position indicator */}
                          {isBeingDragged && (
                            <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-[#0a0c14]/95 text-cyan-300 font-mono text-[10px] font-bold px-2 py-0.5 rounded border border-cyan-400/80 shadow-2xl whitespace-nowrap z-50 pointer-events-none flex items-center space-x-1 backdrop-blur-md">
                              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-sm shadow-cyan-400" />
                              <span>{dragState.currentStart.toFixed(2)}s</span>
                              <span className="text-[9px] text-gray-400 font-normal">
                                ({dragState.currentDeltaX >= 0 ? '+' : ''}{(dragState.currentDeltaX / zoom).toFixed(2)}s)
                              </span>
                              {dragState.dropInsertX !== undefined && (
                                <span className="text-[8.5px] px-1 py-0 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-sans">
                                  {language === 'km' ? 'ប្ដូរលំដាប់' : 'Reorder'}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Left Trim Handle */}
                          {!track.isLocked && (
                            <div
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                startClipDrag(e, clip, 'trim-left');
                              }}
                              className="absolute left-0 top-0 bottom-0 w-1.5 bg-black/40 hover:bg-white/50 cursor-ew-resize opacity-0 group-hover:opacity-100 transition z-10"
                              title="Trim Start"
                            />
                          )}

                          {/* Title & info */}
                          <div className="flex items-center space-x-1 min-w-0 z-0 pointer-events-none select-none">
                            {track.isLocked && <Lock className="w-2 h-2 text-amber-300 shrink-0" />}
                            <span className="text-[8.5px] font-semibold text-white drop-shadow truncate leading-none">
                              {clip.title}
                            </span>
                          </div>

                          {/* Audio Waveform visualization */}
                          {clip.audioWaveform && (
                            <div className="absolute inset-0 flex items-center justify-around opacity-30 pointer-events-none px-1">
                              {clip.audioWaveform.map((val, i) => (
                                <div
                                  key={i}
                                  className="w-[1px] bg-white rounded-full"
                                  style={{ height: `${Math.max(15, val * 0.85)}%` }}
                                />
                              ))}
                            </div>
                          )}

                          {/* Right Trim Handle */}
                          {!track.isLocked && (
                            <div
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                startClipDrag(e, clip, 'trim-right');
                              }}
                              className="absolute right-0 top-0 bottom-0 w-1.5 bg-black/40 hover:bg-white/50 cursor-ew-resize opacity-0 group-hover:opacity-100 transition z-10"
                              title="Trim End"
                            />
                          )}
                        </div>

                        {/* Gap Snap Button between consecutive clips if gap exists */}
                        {!track.isLocked && gap > 0.25 && onCloseGaps && (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              onCloseGaps(track.id);
                            }}
                            className="absolute top-[1px] bottom-[1px] border border-dashed border-cyan-500/40 rounded flex items-center justify-center bg-cyan-950/20 hover:bg-cyan-500/20 cursor-pointer text-[10px] text-cyan-300 transition group/gap z-5"
                            style={{
                              left: `${clipEnd * zoom + 2}px`,
                              width: `${Math.max(20, gap * zoom - 4)}px`,
                            }}
                            title={language === 'km' ? 'ចុចដើម្បីភ្ជាប់ចន្លោះទទេនេះ' : 'Click to close gap'}
                          >
                            <span className="opacity-0 group-hover/gap:opacity-100 flex items-center space-x-0.5 font-semibold text-[9px]">
                              <Link className="w-2.5 h-2.5" />
                              <span>{language === 'km' ? 'ភ្ជាប់' : 'Snap'}</span>
                            </span>
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              );
            })}

            {/* 3. Red Playhead Bar & Draggable Handle */}
            <div
              className="absolute top-0 bottom-0 pointer-events-none z-30 transition-transform duration-75"
              style={{ left: `${currentTime * zoom}px` }}
            >
              {/* Triangular Scrubber Head */}
              <div className="absolute -top-7 -translate-x-1/2 w-3.5 h-4 bg-rose-500 rounded-t-sm shadow-md flex items-center justify-center">
                <div className="w-1 h-2 bg-white rounded-full opacity-90" />
              </div>

              {/* Red vertical laser line */}
              <div className="w-0.5 h-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
            </div>
          </div>
        </div>
      </div>

      {/* 3. CapCut Right-Click Context Menu for Clips */}
      {contextMenu && (
        <div
          className="fixed bg-[#181a28] border border-[#2e314a] rounded-lg shadow-2xl py-1 z-50 text-xs min-w-48 text-gray-200"
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Option 1: Split at playhead */}
          <button
            onClick={() => {
              onSplitClip(contextMenu.clipId, currentTime);
              setContextMenu(null);
            }}
            className="w-full px-3 py-1.5 text-left hover:bg-[#25283e] flex items-center justify-between group cursor-pointer"
          >
            <div className="flex items-center space-x-2">
              <Scissors className="w-3.5 h-3.5 text-cyan-400" />
              <span>{language === 'km' ? 'កាត់ពុះ Clip (Split)' : 'Split'}</span>
            </div>
            <span className="text-[10px] text-gray-400 font-mono">Ctrl+B</span>
          </button>

          {/* Option 1b: Split All Tracks */}
          {onSplitAllTracks && (
            <button
              onClick={() => {
                onSplitAllTracks(currentTime);
                setContextMenu(null);
              }}
              className="w-full px-3 py-1.5 text-left hover:bg-[#25283e] flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center space-x-2">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>{language === 'km' ? 'កាត់ពុះគ្រប់ Track' : 'Split All Tracks'}</span>
              </div>
              <span className="text-[10px] text-gray-400 font-mono">Ctrl+Shift+B</span>
            </button>
          )}

          {/* Option 2: Split & Delete Left */}
          <button
            onClick={() => {
              onSplitDeleteLeft(contextMenu.clipId, currentTime);
              setContextMenu(null);
            }}
            className="w-full px-3 py-1.5 text-left hover:bg-[#25283e] flex items-center justify-between group cursor-pointer"
          >
            <div className="flex items-center space-x-2">
              <div className="flex items-center -space-x-1">
                <ChevronLeft className="w-3 h-3 text-amber-400" />
                <Scissors className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <span>{language === 'km' ? 'កាត់ & លុបខាងឆ្វេង' : 'Split & Delete Left'}</span>
            </div>
            <span className="text-[10px] text-amber-400 font-mono">Q</span>
          </button>

          {/* Option 3: Split & Delete Right */}
          <button
            onClick={() => {
              onSplitDeleteRight(contextMenu.clipId, currentTime);
              setContextMenu(null);
            }}
            className="w-full px-3 py-1.5 text-left hover:bg-[#25283e] flex items-center justify-between group cursor-pointer"
          >
            <div className="flex items-center space-x-2">
              <div className="flex items-center -space-x-1">
                <Scissors className="w-3.5 h-3.5 text-amber-400" />
                <ChevronRight className="w-3 h-3 text-amber-400" />
              </div>
              <span>{language === 'km' ? 'កាត់ & លុបខាងស្ដាំ' : 'Split & Delete Right'}</span>
            </div>
            <span className="text-[10px] text-amber-400 font-mono">W</span>
          </button>

          <div className="h-px bg-[#26283d] my-1" />

          {/* Connect / Close Gaps in this track */}
          {onCloseGaps && (
            <button
              onClick={() => {
                const targetClip = clips.find((c) => c.id === contextMenu.clipId);
                if (targetClip) onCloseGaps(targetClip.trackId);
                setContextMenu(null);
              }}
              className="w-full px-3 py-1.5 text-left hover:bg-[#25283e] flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center space-x-2">
                <Link className="w-3.5 h-3.5 text-cyan-400" />
                <span>{language === 'km' ? 'ភ្ជាប់ Clips ក្នុង Track នេះ' : 'Connect Track Clips'}</span>
              </div>
            </button>
          )}

          {/* Connect Gaps All Tracks */}
          {onCloseGaps && (
            <button
              onClick={() => {
                onCloseGaps();
                setContextMenu(null);
              }}
              className="w-full px-3 py-1.5 text-left hover:bg-[#25283e] flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center space-x-2">
                <Magnet className="w-3.5 h-3.5 text-cyan-400" />
                <span>{language === 'km' ? 'ភ្ជាប់ Clips គ្រប់ Tracks' : 'Connect All Tracks'}</span>
              </div>
            </button>
          )}

          <div className="h-px bg-[#26283d] my-1" />

          {/* Duplicate */}
          <button
            onClick={() => {
              onDuplicateClip(contextMenu.clipId);
              setContextMenu(null);
            }}
            className="w-full px-3 py-1.5 text-left hover:bg-[#25283e] flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center space-x-2">
              <Copy className="w-3.5 h-3.5 text-gray-300" />
              <span>{t.duplicateClip}</span>
            </div>
          </button>

          {/* Delete & Auto-Connect */}
          <button
            onClick={() => {
              onDeleteClip(contextMenu.clipId);
              setContextMenu(null);
            }}
            className="w-full px-3 py-1.5 text-left hover:bg-rose-600/30 text-rose-300 flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center space-x-2">
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>{isAutoConnect ? (language === 'km' ? 'លុប & ភ្ជាប់ស្វ័យប្រវត្តិ' : 'Delete & Auto-Connect') : t.deleteClip}</span>
            </div>
            <span className="text-[10px] text-rose-400/80 font-mono">Del</span>
          </button>
        </div>
      )}
    </div>
  );
};
