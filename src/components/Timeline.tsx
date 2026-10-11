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
  language: Language;
}

interface ContextMenuState {
  x: number;
  y: number;
  clipId: string;
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
  language,
}) => {
  const t = translations[language];
  const [zoom, setZoom] = useState<number>(45); // pixels per second
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
  const [dragState, setDragState] = useState<{
    clipId: string;
    type: 'move' | 'trim-left' | 'trim-right';
    startX: number;
    initialStart: number;
    initialDuration: number;
  } | null>(null);

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
    const trackHeaderWidth = 224; // 224px (w-56) track headers column
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
        if (Math.abs(deltaX) > 3) {
          hasDraggedRef.current = true;
        }
        const deltaSeconds = deltaX / zoom;

        if (dragState.type === 'move') {
          let newStart = Math.max(0, dragState.initialStart + deltaSeconds);
          if (isSnapping && Math.abs(newStart - currentTime) < 0.25) {
            newStart = currentTime;
          }
          onUpdateClipTiming(dragState.clipId, Math.round(newStart * 100) / 100, dragState.initialDuration);
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
      setDragState(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, zoom, currentTime, isSnapping, totalDuration]);

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
      type,
      startX: e.clientX,
      initialStart: clip.start,
      initialDuration: clip.duration,
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
    <div className="h-72 bg-[#10111a] border-t border-[#20212f] flex flex-col select-none relative">
      {/* 1. Timeline Toolbar with CapCut 3 Split Actions */}
      <div className="h-10 bg-[#141522] border-b border-[#20212f] px-3 flex items-center justify-between z-20">
        {/* Left tools: CapCut Split 3 Options + Delete + Duplicate */}
        <div className="flex items-center space-x-1.5">
          {/* CapCut Split Action 1: Split at playhead (Ctrl+B / C) */}
          <button
            onClick={() => {
              if (activeClip) onSplitClip(activeClip.id, currentTime);
            }}
            disabled={!canSplit}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-semibold border transition ${
              canSplit
                ? 'bg-[#152438] hover:bg-cyan-600/40 text-cyan-200 border-cyan-500/50 hover:border-cyan-400 active:scale-95 cursor-pointer shadow-sm'
                : 'bg-transparent text-gray-600 border-transparent cursor-not-allowed'
            }`}
            title={`${t.splitClip} [Ctrl+B / C]`}
          >
            <Scissors className={`w-3.5 h-3.5 ${canSplit ? 'text-cyan-400' : 'text-gray-600'}`} />
            <span>{language === 'km' ? 'កាត់ពុះ' : 'Split'}</span>
            <span className={`text-[10px] font-mono px-1 rounded ml-0.5 ${canSplit ? 'text-cyan-300 bg-cyan-950/70 border border-cyan-800/60' : 'text-gray-600 bg-gray-900/40'}`}>Ctrl+B</span>
          </button>

          {/* CapCut Split Action 2: Split & Delete Left (Q) */}
          <button
            onClick={() => {
              if (activeClip) onSplitDeleteLeft(activeClip.id, currentTime);
            }}
            disabled={!canSplit}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-semibold border transition ${
              canSplit
                ? 'bg-[#291f16] hover:bg-amber-600/40 text-amber-200 border-amber-500/50 hover:border-amber-400 active:scale-95 cursor-pointer shadow-sm'
                : 'bg-transparent text-gray-600 border-transparent cursor-not-allowed'
            }`}
            title={`${t.splitDeleteLeft} [Q]`}
          >
            <div className="flex items-center -space-x-1">
              <ChevronLeft className={`w-3 h-3 ${canSplit ? 'text-amber-400' : 'text-gray-600'}`} />
              <Scissors className={`w-3.5 h-3.5 ${canSplit ? 'text-amber-400' : 'text-gray-600'}`} />
            </div>
            <span>{language === 'km' ? 'កាត់+លុបឆ្វេង' : 'Del Left'}</span>
            <span className={`text-[10px] font-mono px-1 rounded ml-0.5 ${canSplit ? 'text-amber-300 bg-amber-950/70 border border-amber-800/60' : 'text-gray-600 bg-gray-900/40'}`}>Q</span>
          </button>

          {/* CapCut Split Action 3: Split & Delete Right (W) */}
          <button
            onClick={() => {
              if (activeClip) onSplitDeleteRight(activeClip.id, currentTime);
            }}
            disabled={!canSplit}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-semibold border transition ${
              canSplit
                ? 'bg-[#291f16] hover:bg-amber-600/40 text-amber-200 border-amber-500/50 hover:border-amber-400 active:scale-95 cursor-pointer shadow-sm'
                : 'bg-transparent text-gray-600 border-transparent cursor-not-allowed'
            }`}
            title={`${t.splitDeleteRight} [W]`}
          >
            <div className="flex items-center -space-x-1">
              <Scissors className={`w-3.5 h-3.5 ${canSplit ? 'text-amber-400' : 'text-gray-600'}`} />
              <ChevronRight className={`w-3 h-3 ${canSplit ? 'text-amber-400' : 'text-gray-600'}`} />
            </div>
            <span>{language === 'km' ? 'កាត់+លុបស្ដាំ' : 'Del Right'}</span>
            <span className={`text-[10px] font-mono px-1 rounded ml-0.5 ${canSplit ? 'text-amber-300 bg-amber-950/70 border border-amber-800/60' : 'text-gray-600 bg-gray-900/40'}`}>W</span>
          </button>

          <div className="h-4 w-px bg-[#26283d] mx-1" />

          {/* Delete Clip */}
          <button
            onClick={() => {
              if (activeClip) onDeleteClip(activeClip.id);
            }}
            disabled={!activeClip}
            className={`flex items-center space-x-1 px-2 py-1 rounded text-xs transition border ${
              activeClip
                ? 'bg-[#2b1720] hover:bg-rose-500/30 text-rose-300 border-rose-500/40 hover:border-rose-400 cursor-pointer shadow-sm'
                : 'text-gray-700 border-transparent cursor-not-allowed'
            }`}
            title={t.deleteClip}
          >
            <Trash2 className={`w-3.5 h-3.5 ${activeClip ? 'text-rose-400' : 'text-gray-700'}`} />
            <span>{language === 'km' ? 'លុប' : 'Delete'}</span>
            <span className={`text-[10px] font-mono px-1 rounded ml-0.5 ${activeClip ? 'text-rose-300 bg-rose-950/60' : 'text-gray-700'}`}>Del</span>
          </button>

          {/* Duplicate Clip */}
          <button
            onClick={() => {
              if (activeClip) onDuplicateClip(activeClip.id);
            }}
            disabled={!activeClip}
            className={`p-1.5 rounded transition ${
              activeClip
                ? 'hover:bg-[#232537] text-gray-300 hover:text-white cursor-pointer'
                : 'text-gray-700 cursor-not-allowed'
            }`}
            title={t.duplicateClip}
          >
            <Copy className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-[#26283d] mx-1" />

          {/* Magnet / Snapping Toggle */}
          <button
            onClick={() => setIsSnapping(!isSnapping)}
            className={`p-1.5 rounded flex items-center space-x-1 text-xs transition ${
              isSnapping
                ? 'bg-cyan-600/20 text-cyan-400 border border-cyan-500/30'
                : 'text-gray-500 hover:text-gray-300'
            }`}
            title={t.snapToClips}
          >
            <Magnet className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right tools: Zoom */}
        <div className="flex items-center space-x-2 text-xs text-gray-400">
          <ZoomOut className="w-3.5 h-3.5 cursor-pointer hover:text-white" onClick={() => setZoom(Math.max(20, zoom - 10))} />
          <input
            type="range"
            min="20"
            max="120"
            value={zoom}
            onChange={(e) => setZoom(parseInt(e.target.value, 10))}
            className="w-24 accent-cyan-400 cursor-pointer h-1.5 bg-[#25283c] rounded"
          />
          <ZoomIn className="w-3.5 h-3.5 cursor-pointer hover:text-white" onClick={() => setZoom(Math.min(120, zoom + 10))} />
          <span className="font-mono text-[10px] w-8 text-right text-gray-500">{zoom}px</span>
        </div>
      </div>

      {/* 2. Tracks & Timeline Body */}
      <div
        ref={containerRef}
        className="flex-1 flex overflow-x-auto overflow-y-auto relative custom-scrollbar bg-[#0d0e16]"
      >
        {/* Track Headers Column (Fixed on left) */}
        <div
          className="w-56 sticky left-0 z-20 bg-[#12131d] border-r border-[#20212f] shrink-0 flex flex-col select-none"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header spacer aligned with Ruler with + Add Track button */}
          <div className="h-7 border-b border-[#20212f] px-2 flex items-center justify-between text-[11px] font-semibold text-gray-400 bg-[#141522] relative">
            <span className="font-bold text-gray-300">{t.tracks} ({tracks.length})</span>

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
          {tracks.map((track, trackIndex) => (
            <div
              key={track.id}
              className={`h-11 border-b border-[#1c1e2b] px-2 flex items-center justify-between text-xs text-gray-300 hover:bg-[#181926] transition ${
                track.isLocked ? 'bg-[#151620] opacity-80' : ''
              }`}
            >
              {/* Left: Track Dot & Editable Name */}
              <div className="flex items-center space-x-1 min-w-0 flex-1 mr-1">
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
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
                      className="bg-[#24273d] text-white px-1.5 py-0.5 rounded text-[10px] font-medium w-full outline-none border border-cyan-400"
                    />
                    <button
                      onClick={() => handleSaveRename(track.id)}
                      className="p-0.5 hover:text-cyan-400 text-emerald-400"
                      title="Save"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setEditingTrackId(null)}
                      className="p-0.5 text-gray-400 hover:text-gray-200"
                      title="Cancel"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-1 truncate flex-1 min-w-0 group">
                    <span
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        handleStartRename(track);
                      }}
                      className="font-medium text-[11px] truncate cursor-pointer hover:text-cyan-300"
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
                      <Edit2 className="w-2.5 h-2.5" />
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
                    className="p-1 rounded text-gray-500 hover:text-cyan-300 hover:bg-[#25283c] transition"
                    title="Move Track Up"
                  >
                    <ArrowUp className="w-2.5 h-2.5" />
                  </button>
                )}

                {onMoveTrackDown && trackIndex < tracks.length - 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onMoveTrackDown(track.id);
                    }}
                    className="p-1 rounded text-gray-500 hover:text-cyan-300 hover:bg-[#25283c] transition"
                    title="Move Track Down"
                  >
                    <ArrowDown className="w-2.5 h-2.5" />
                  </button>
                )}

                {/* Lock Track Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleTrackLock(track.id);
                  }}
                  className={`p-1 rounded hover:bg-[#25283c] transition ${
                    track.isLocked ? 'text-amber-400' : 'text-gray-500 hover:text-gray-200'
                  }`}
                  title={track.isLocked ? t.unlockTrack : t.lockTrack}
                >
                  {track.isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                </button>

                {/* Hide / Show Track */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleTrackVisibility(track.id);
                  }}
                  className={`p-1 rounded hover:bg-[#25283c] transition ${
                    track.isVisible ? 'text-gray-400 hover:text-white' : 'text-gray-600'
                  }`}
                  title="Toggle Visibility"
                >
                  {track.isVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3 text-rose-400" />}
                </button>

                {/* Mute Track */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleTrackMute(track.id);
                  }}
                  className={`p-1 rounded hover:bg-[#25283c] transition ${
                    !track.isMuted ? 'text-gray-400 hover:text-white' : 'text-gray-600'
                  }`}
                  title="Mute Track"
                >
                  {track.isMuted ? <VolumeX className="w-3 h-3 text-rose-400" /> : <Volume2 className="w-3 h-3" />}
                </button>

                {/* Delete Track Button (No alert / confirm!) */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (tracks.length > 1) {
                      onDeleteTrack(track.id);
                    }
                  }}
                  disabled={tracks.length <= 1}
                  className={`p-1 rounded transition ${
                    tracks.length > 1
                      ? 'hover:bg-rose-500/20 text-gray-500 hover:text-rose-400 cursor-pointer'
                      : 'text-gray-700 cursor-not-allowed opacity-40'
                  }`}
                  title={t.deleteTrack}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
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
            {tracks.map((track) => {
              const trackClips = clips.filter((c) => c.trackId === track.id);
              return (
                <div
                  key={track.id}
                  onClick={(e) => {
                    if (e.target === e.currentTarget) {
                      updateTimeFromEvent(e);
                      onSelectClip(null);
                    }
                  }}
                  className={`h-11 border-b border-[#181a28] relative hover:bg-[#12131e]/50 transition ${
                    track.isLocked ? 'bg-amber-950/10' : ''
                  }`}
                >
                  {trackClips.map((clip) => {
                    const isSelected = selectedClipId === clip.id;
                    const left = clip.start * zoom;
                    const width = Math.max(18, clip.duration * zoom);

                    return (
                      <div
                        key={clip.id}
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
                        className={`absolute top-1 bottom-1 rounded-md cursor-grab active:cursor-grabbing flex items-center px-2 overflow-hidden shadow-sm transition-shadow group ${
                          isSelected
                            ? 'ring-2 ring-cyan-400 shadow-md shadow-cyan-900/50 z-10 brightness-110'
                            : 'hover:brightness-105'
                        } ${track.isLocked ? 'cursor-not-allowed opacity-90' : ''}`}
                        style={{
                          left: `${left}px`,
                          width: `${width}px`,
                          backgroundColor: clip.color || '#0284c7',
                        }}
                      >
                        {/* Left Trim Handle */}
                        {!track.isLocked && (
                          <div
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              startClipDrag(e, clip, 'trim-left');
                            }}
                            className="absolute left-0 top-0 bottom-0 w-2.5 bg-black/40 hover:bg-white/50 cursor-ew-resize opacity-0 group-hover:opacity-100 transition z-10"
                            title="Trim Start"
                          />
                        )}

                        {/* Title & info */}
                        <div className="flex items-center space-x-1.5 min-w-0 z-0 pointer-events-none select-none">
                          {track.isLocked && <Lock className="w-2.5 h-2.5 text-amber-300 shrink-0" />}
                          <span className="text-[11px] font-semibold text-white drop-shadow truncate">
                            {clip.title}
                          </span>
                        </div>

                        {/* Audio Waveform visualization */}
                        {clip.audioWaveform && (
                          <div className="absolute inset-0 flex items-center justify-around opacity-30 pointer-events-none px-2">
                            {clip.audioWaveform.map((val, i) => (
                              <div
                                key={i}
                                className="w-1 bg-white rounded-full"
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
                            className="absolute right-0 top-0 bottom-0 w-2.5 bg-black/40 hover:bg-white/50 cursor-ew-resize opacity-0 group-hover:opacity-100 transition z-10"
                            title="Trim End"
                          />
                        )}
                      </div>
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
            className="w-full px-3 py-1.5 text-left hover:bg-[#25283e] flex items-center justify-between group"
          >
            <div className="flex items-center space-x-2">
              <Scissors className="w-3.5 h-3.5 text-cyan-400" />
              <span>{language === 'km' ? 'កាត់ពុះ Clip (Split)' : 'Split'}</span>
            </div>
            <span className="text-[10px] text-gray-400 font-mono">Ctrl+B</span>
          </button>

          {/* Option 2: Split & Delete Left */}
          <button
            onClick={() => {
              onSplitDeleteLeft(contextMenu.clipId, currentTime);
              setContextMenu(null);
            }}
            className="w-full px-3 py-1.5 text-left hover:bg-[#25283e] flex items-center justify-between group"
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
            className="w-full px-3 py-1.5 text-left hover:bg-[#25283e] flex items-center justify-between group"
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

          {/* Duplicate */}
          <button
            onClick={() => {
              onDuplicateClip(contextMenu.clipId);
              setContextMenu(null);
            }}
            className="w-full px-3 py-1.5 text-left hover:bg-[#25283e] flex items-center justify-between"
          >
            <div className="flex items-center space-x-2">
              <Copy className="w-3.5 h-3.5 text-gray-300" />
              <span>{t.duplicateClip}</span>
            </div>
          </button>

          {/* Delete */}
          <button
            onClick={() => {
              onDeleteClip(contextMenu.clipId);
              setContextMenu(null);
            }}
            className="w-full px-3 py-1.5 text-left hover:bg-rose-600/30 text-rose-300 flex items-center justify-between"
          >
            <div className="flex items-center space-x-2">
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>{t.deleteClip}</span>
            </div>
            <span className="text-[10px] text-rose-400/80 font-mono">Del</span>
          </button>
        </div>
      )}
    </div>
  );
};
