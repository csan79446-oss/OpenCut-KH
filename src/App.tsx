/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  AspectRatio,
  ClipFilters,
  ClipTransform,
  MediaItem,
  SubtitleItem,
  TextConfig,
  TimelineClip,
  TimelineTrack,
  TrackType,
} from './types/editor';
import { SAMPLE_MEDIA, INITIAL_TRACKS, INITIAL_CLIPS } from './utils/sampleData';
import { autoCutSilenceFromClips, generateWaveformPeaks } from './utils/audioAnalysis';
import { soundEngine } from './utils/soundEngine';
import { Language, translations } from './utils/i18n';

// Components
import { HeaderBar } from './components/HeaderBar';
import { SidebarTabs, SidebarTab } from './components/SidebarTabs';
import { MediaPanel } from './components/MediaPanel';
import { AutoCutPanel } from './components/AutoCutPanel';
import { AudioPanel } from './components/AudioPanel';
import { TextPanel } from './components/TextPanel';
import { EffectsPanel } from './components/EffectsPanel';
import { TransitionsPanel } from './components/TransitionsPanel';
import { StickersPanel } from './components/StickersPanel';
import { CanvasPreview } from './components/CanvasPreview';
import { InspectorPanel } from './components/InspectorPanel';
import { Timeline } from './components/Timeline';
import { ExportModal } from './components/ExportModal';
import { AIPromptModal } from './components/AIPromptModal';

export default function App() {
  // App State
  const [language, setLanguage] = useState<Language>('km');
  const [projectTitle, setProjectTitle] = useState('OpenCut AI Reel');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
  const [activeTab, setActiveTab] = useState<SidebarTab>('autocut');

  // Media & Timeline State
  const [mediaLibrary, setMediaLibrary] = useState<MediaItem[]>(SAMPLE_MEDIA);
  const [tracks, setTracks] = useState<TimelineTrack[]>(INITIAL_TRACKS);
  const [clips, setClips] = useState<TimelineClip[]>(INITIAL_CLIPS);
  const [selectedClipId, setSelectedClipId] = useState<string | null>('clip-v1-1');

  // Playback State
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Modals
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isAIMagicOpen, setIsAIMagicOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Undo / Redo History
  const [history, setHistory] = useState<TimelineClip[][]>([INITIAL_CLIPS]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  const t = translations[language];

  // Calculate total timeline duration based on maximum clip end time
  const totalDuration = Math.max(
    10,
    ...clips.map((clip) => clip.start + clip.duration)
  );

  // Push new history state
  const pushHistory = useCallback((newClips: TimelineClip[]) => {
    setHistory((prev) => {
      const updated = prev.slice(0, historyIndex + 1);
      return [...updated, newClips];
    });
    setHistoryIndex((prev) => prev + 1);
  }, [historyIndex]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const nextIndex = historyIndex - 1;
      setHistoryIndex(nextIndex);
      setClips(history[nextIndex]);
    }
  }, [historyIndex, history]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      setClips(history[nextIndex]);
    }
  }, [historyIndex, history]);

  // Toast helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Playhead loop animation with requestAnimationFrame
  const lastTimeRef = useRef<number | null>(null);
  useEffect(() => {
    let animId: number;
    const loop = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const dt = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;

      if (isPlaying) {
        setCurrentTime((prev) => {
          const next = prev + dt;
          if (next >= totalDuration) {
            setIsPlaying(false);
            return 0;
          }
          return next;
        });
      }
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, totalDuration]);

  // Synchronize audio playback with soundEngine
  useEffect(() => {
    soundEngine.syncTimelineAudio(currentTime, isPlaying, clips, tracks);
  }, [currentTime, isPlaying, clips, tracks]);

  useEffect(() => {
    return () => {
      soundEngine.stopPlayback();
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input or textarea
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      // Space: Play / Pause
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      }

      // Determine active clip to split/delete: selected clip or clip intersecting playhead (CapCut standard)
      const targetClipId =
        selectedClipId ||
        clips.find((c) => currentTime >= c.start && currentTime <= c.start + c.duration)?.id;

      // CapCut Split Shortcuts:
      // 'c' or 'C' or Ctrl+B: Split at Playhead
      if (((e.key.toLowerCase() === 'c' && !e.ctrlKey && !e.metaKey) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b')) && targetClipId) {
        e.preventDefault();
        handleSplitClip(targetClipId, currentTime);
      }

      // 'q' or 'Q': Split & Delete Left (CapCut standard)
      if (e.key.toLowerCase() === 'q' && !e.ctrlKey && !e.metaKey && targetClipId) {
        e.preventDefault();
        handleSplitDeleteLeft(targetClipId, currentTime);
      }

      // 'w' or 'W': Split & Delete Right (CapCut standard)
      if (e.key.toLowerCase() === 'w' && !e.ctrlKey && !e.metaKey && targetClipId) {
        e.preventDefault();
        handleSplitDeleteRight(targetClipId, currentTime);
      }

      // Delete or Backspace
      if ((e.key === 'Delete' || e.key === 'Backspace') && targetClipId) {
        e.preventDefault();
        handleDeleteClip(targetClipId);
      }

      // Ctrl+Z: Undo, Ctrl+Y: Redo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }

      // ArrowLeft / ArrowRight
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentTime((prev) => Math.max(0, prev - 0.2));
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setCurrentTime((prev) => Math.min(totalDuration, prev + 0.2));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedClipId, currentTime, totalDuration, handleUndo, handleRedo]);

  // 1. AutoCut Silence Removal (Core requested feature!)
  const handleAutoCutSilence = (thresholdDb: number, minDuration: number) => {
    const { newClips, cutCount, savedSeconds } = autoCutSilenceFromClips(
      clips,
      selectedClipId,
      thresholdDb,
      minDuration
    );

    if (cutCount > 0) {
      setClips(newClips);
      pushHistory(newClips);
      soundEngine.playEffect('impact');
      showToast(
        language === 'km'
          ? `AutoCut: បានកាត់បន្ថយចន្លោះស្ងាត់ ${cutCount} កន្លែង (${savedSeconds}s)!`
          : `AutoCut: Removed ${cutCount} silent gaps (Saved ${savedSeconds}s)!`
      );
    } else {
      showToast(language === 'km' ? 'មិនមានចន្លោះស្ងាត់លើសកម្រិតកំណត់ទេ' : 'No silences found below threshold');
    }
  };

  // Cut specific interval out of video clip
  const handleCutSpecificInterval = (start: number, end: number) => {
    const targetClip = clips.find((c) => c.id === selectedClipId) || clips.find((c) => c.type === 'video');
    if (!targetClip) return;

    const clipRelStart = start;
    const clipRelEnd = end;

    // Slice clip into left and right if applicable
    const leftPart: TimelineClip = {
      ...targetClip,
      id: `${targetClip.id}-left-${Date.now()}`,
      duration: Math.max(0.1, clipRelStart),
    };

    const rightPart: TimelineClip = {
      ...targetClip,
      id: `${targetClip.id}-right-${Date.now()}`,
      start: targetClip.start + clipRelStart,
      sourceStart: targetClip.sourceStart + clipRelEnd,
      duration: Math.max(0.1, targetClip.duration - clipRelEnd),
    };

    const newClips = clips
      .filter((c) => c.id !== targetClip.id)
      .concat(leftPart.duration > 0.2 ? [leftPart] : [])
      .concat(rightPart.duration > 0.2 ? [rightPart] : []);

    setClips(newClips);
    pushHistory(newClips);
    soundEngine.playEffect('whoosh');
    showToast(language === 'km' ? 'បានកាត់ចំណុចដែលបានជ្រើសរើសចេញ' : 'Segment cut from timeline');
  };

  // 2. Split clip at specific time (CapCut Option 1: Split at Playhead)
  const handleSplitClip = (clipId: string, time: number) => {
    const clip = clips.find((c) => c.id === clipId);
    if (!clip) return;
    const track = tracks.find((t) => t.id === clip.trackId);
    if (track?.isLocked) {
      showToast(language === 'km' ? 'ជួរ Track នេះត្រូវបានចាក់សោ' : 'Track is locked');
      return;
    }

    // Determine split point: if playhead is within clip bounds, use it; otherwise split at midpoint
    let splitTime = time;
    if (time <= clip.start + 0.05 || time >= clip.start + clip.duration - 0.05) {
      splitTime = clip.start + clip.duration / 2;
      setCurrentTime(Math.round(splitTime * 100) / 100);
    }

    const firstDuration = splitTime - clip.start;
    const secondDuration = clip.duration - firstDuration;

    if (firstDuration <= 0.05 || secondDuration <= 0.05) {
      showToast(language === 'km' ? 'ចំណុចកាត់ជិតគែមពេក' : 'Split point too close to edge');
      return;
    }

    const firstClip: TimelineClip = {
      ...clip,
      id: `${clip.id}-split-1-${Date.now()}`,
      duration: Math.round(firstDuration * 100) / 100,
    };

    const secondClip: TimelineClip = {
      ...clip,
      id: `${clip.id}-split-2-${Date.now()}`,
      start: Math.round(splitTime * 100) / 100,
      sourceStart: clip.sourceStart + firstDuration * (clip.speed || 1),
      duration: Math.round(secondDuration * 100) / 100,
    };

    const updated = clips.filter((c) => c.id !== clipId).concat([firstClip, secondClip]);
    setClips(updated);
    pushHistory(updated);
    setSelectedClipId(secondClip.id);
    soundEngine.playEffect('whoosh');
    showToast(language === 'km' ? 'បានកាត់ពុះ Clip ជាពីរ (Split)' : 'Clip split at playhead');
  };

  // CapCut Option 2: Split & Delete Left (Q - Trim Start to Playhead)
  const handleSplitDeleteLeft = (clipId: string, time: number) => {
    const clip = clips.find((c) => c.id === clipId);
    if (!clip) return;
    const track = tracks.find((t) => t.id === clip.trackId);
    if (track?.isLocked) {
      showToast(language === 'km' ? 'ជួរ Track នេះត្រូវបានចាក់សោ' : 'Track is locked');
      return;
    }

    let splitTime = time;
    if (time <= clip.start + 0.05 || time >= clip.start + clip.duration - 0.05) {
      splitTime = clip.start + clip.duration / 2;
      setCurrentTime(Math.round(splitTime * 100) / 100);
    }

    const cutLeftSeconds = splitTime - clip.start;
    const remainingDuration = clip.duration - cutLeftSeconds;

    if (remainingDuration <= 0.05) {
      handleDeleteClip(clipId);
      return;
    }

    // Retained right portion ripples to clip.start
    const retainedClip: TimelineClip = {
      ...clip,
      id: `${clip.id}-del-left-${Date.now()}`,
      start: clip.start,
      sourceStart: clip.sourceStart + cutLeftSeconds * (clip.speed || 1),
      duration: Math.round(remainingDuration * 100) / 100,
    };

    // Ripple all following clips on this track
    const updated = clips.map((c) => {
      if (c.id === clipId) return retainedClip;
      if (c.trackId === clip.trackId && c.start > clip.start) {
        return {
          ...c,
          start: Math.round(Math.max(0, c.start - cutLeftSeconds) * 100) / 100,
        };
      }
      return c;
    });

    setClips(updated);
    pushHistory(updated);
    setSelectedClipId(retainedClip.id);
    soundEngine.playEffect('whoosh');
    showToast(
      language === 'km'
        ? 'បានកាត់ពុះ & លុបផ្នែកខាងឆ្វេង (Delete Left - Q)'
        : 'Split & deleted left portion (Trimmed start - Q)'
    );
  };

  // CapCut Option 3: Split & Delete Right (W - Trim End to Playhead)
  const handleSplitDeleteRight = (clipId: string, time: number) => {
    const clip = clips.find((c) => c.id === clipId);
    if (!clip) return;
    const track = tracks.find((t) => t.id === clip.trackId);
    if (track?.isLocked) {
      showToast(language === 'km' ? 'ជួរ Track នេះត្រូវបានចាក់សោ' : 'Track is locked');
      return;
    }

    let splitTime = time;
    if (time <= clip.start + 0.05 || time >= clip.start + clip.duration - 0.05) {
      splitTime = clip.start + clip.duration / 2;
      setCurrentTime(Math.round(splitTime * 100) / 100);
    }

    const cutLeftSeconds = splitTime - clip.start;
    const cutRightSeconds = clip.duration - cutLeftSeconds;

    if (cutLeftSeconds <= 0.05) {
      handleDeleteClip(clipId);
      return;
    }

    // Retained left portion
    const retainedClip: TimelineClip = {
      ...clip,
      id: `${clip.id}-del-right-${Date.now()}`,
      duration: Math.round(cutLeftSeconds * 100) / 100,
    };

    // Ripple following clips on this track
    const updated = clips.map((c) => {
      if (c.id === clipId) return retainedClip;
      if (c.trackId === clip.trackId && c.start > clip.start) {
        return {
          ...c,
          start: Math.round(Math.max(0, c.start - cutRightSeconds) * 100) / 100,
        };
      }
      return c;
    });

    setClips(updated);
    pushHistory(updated);
    setSelectedClipId(retainedClip.id);
    soundEngine.playEffect('whoosh');
    showToast(
      language === 'km'
        ? 'បានកាត់ពុះ & លុបផ្នែកខាងស្ដាំ (Delete Right - W)'
        : 'Split & deleted right portion (Trimmed tail - W)'
    );
  };

  // 3. Delete clip
  const handleDeleteClip = (clipId: string) => {
    const updated = clips.filter((c) => c.id !== clipId);
    setClips(updated);
    pushHistory(updated);
    setSelectedClipId(null);
    soundEngine.playEffect('pop');
  };

  // 4. Duplicate clip
  const handleDuplicateClip = (clipId: string) => {
    const clip = clips.find((c) => c.id === clipId);
    if (!clip) return;

    const duplicated: TimelineClip = {
      ...clip,
      id: `${clip.id}-copy-${Date.now()}`,
      start: clip.start + clip.duration + 0.1,
      title: `${clip.title} (Copy)`,
    };

    const updated = [...clips, duplicated];
    setClips(updated);
    pushHistory(updated);
    setSelectedClipId(duplicated.id);
  };

  // 5. Update timing
  const handleUpdateClipTiming = (clipId: string, newStart: number, newDuration: number) => {
    const updated = clips.map((c) => {
      if (c.id === clipId) {
        return { ...c, start: newStart, duration: newDuration };
      }
      return c;
    });
    setClips(updated);
  };

  // 6. Add Media to Timeline
  const handleAddMediaToTimeline = (item: MediaItem) => {
    // Ensure item is also present in mediaLibrary
    setMediaLibrary((prev) => {
      if (!prev.some((m) => m.id === item.id)) {
        return [item, ...prev];
      }
      return prev;
    });

    // Find the ideal track or fallback
    let targetTrack = tracks.find((t) => {
      if (item.category === 'voiceover') return t.id === 'track-a2' || t.type === 'sfx' || t.type === 'audio';
      if (item.type === 'video') return t.id === 'track-v1' || t.type === 'video';
      if (item.type === 'audio') return t.id === 'track-a1' || t.type === 'audio';
      return t.id === 'track-v2' || t.type === 'overlay';
    });

    if (!targetTrack) {
      targetTrack = tracks.find((t) => (item.type === 'video' ? t.type === 'video' : t.type === 'audio')) || tracks[0];
    }

    const targetTrackId = targetTrack.id;

    // Position clip at currentTime if playhead is past 0, else at lastEnd
    const trackClips = clips.filter((c) => c.trackId === targetTrackId);
    const lastEnd = trackClips.reduce((max, c) => Math.max(max, c.start + c.duration), 0);
    const clipStart = currentTime > 0 ? currentTime : lastEnd;

    const newClip: TimelineClip = {
      id: `clip-${Date.now()}`,
      trackId: targetTrackId,
      mediaId: item.id,
      mediaUrl: item.url, // Real audio source URL (Gemini WAV / MP3 / WebM)
      title: item.name,
      type: item.type,
      start: Math.round(clipStart * 100) / 100,
      duration: item.duration || 5,
      sourceStart: 0,
      sourceDuration: item.duration || 10,
      speed: 1,
      volume: 1,
      fadeIn: 0.05,
      fadeOut: 0.05,
      transform: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1, blendMode: 'normal' },
      filters: {
        brightness: 100,
        contrast: 100,
        saturate: 100,
        blur: 0,
        hueRotate: 0,
        sepia: 0,
        grayscale: 0,
        vignette: 0,
        preset: 'none',
      },
      audioWaveform:
        item.waveform ||
        (item.type === 'audio' || item.type === 'video' ? generateWaveformPeaks(50) : undefined),
      color:
        item.category === 'voiceover'
          ? '#d946ef' // Bright magenta/pink for Gemini TTS Voiceover!
          : item.type === 'video'
          ? '#0284c7'
          : item.type === 'audio'
          ? '#8b5cf6'
          : '#06b6d4',
    };

    const updated = [...clips, newClip];
    setClips(updated);
    pushHistory(updated);
    setSelectedClipId(newClip.id);
    soundEngine.playEffect('pop');
    showToast(
      language === 'km'
        ? `បានបញ្ចូល ${item.category === 'voiceover' ? 'សំឡេង Gemini TTS' : 'Clip'} ទៅកាន់ ${targetTrack.name}!`
        : `Added ${item.category === 'voiceover' ? 'Gemini TTS Audio' : 'clip'} to ${targetTrack.name}!`
    );
  };

  // 7. Add Text Clip
  const handleAddTextClip = (textConfig: TextConfig, title: string) => {
    const trackClips = clips.filter((c) => c.trackId === 'track-text');
    const lastEnd = trackClips.reduce((max, c) => Math.max(max, c.start + c.duration), 0);

    const newClip: TimelineClip = {
      id: `text-${Date.now()}`,
      trackId: 'track-text',
      mediaId: `text-media-${Date.now()}`,
      title,
      type: 'text',
      start: lastEnd > 0 ? lastEnd : currentTime,
      duration: 3.5,
      sourceStart: 0,
      sourceDuration: 3.5,
      speed: 1,
      volume: 0,
      fadeIn: 0.1,
      fadeOut: 0.1,
      transform: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1, blendMode: 'normal' },
      filters: {
        brightness: 100,
        contrast: 100,
        saturate: 100,
        blur: 0,
        hueRotate: 0,
        sepia: 0,
        grayscale: 0,
        vignette: 0,
        preset: 'none',
      },
      textConfig,
      color: '#eab308',
    };

    const updated = [...clips, newClip];
    setClips(updated);
    pushHistory(updated);
    setSelectedClipId(newClip.id);
    showToast('Text added to timeline');
  };

  // 8. Add Subtitles Array from AI Transcriber
  const handleAddSubtitlesToTimeline = (subtitles: SubtitleItem[]) => {
    const subClips: TimelineClip[] = subtitles.map((sub, idx) => ({
      id: `ai-sub-${Date.now()}-${idx}`,
      trackId: 'track-text',
      mediaId: `sub-text-${idx}`,
      title: sub.text.slice(0, 20),
      type: 'text',
      start: sub.start,
      duration: Math.max(1.2, sub.end - sub.start),
      sourceStart: 0,
      sourceDuration: sub.end - sub.start,
      speed: 1,
      volume: 0,
      fadeIn: 0.05,
      fadeOut: 0.05,
      transform: { x: 0, y: 35, scale: 1, rotation: 0, opacity: 1, blendMode: 'normal' },
      filters: {
        brightness: 100,
        contrast: 100,
        saturate: 100,
        blur: 0,
        hueRotate: 0,
        sepia: 0,
        grayscale: 0,
        vignette: 0,
        preset: 'none',
      },
      textConfig: {
        text: sub.text,
        fontSize: 28,
        fontFamily: 'Kantumruy Pro',
        color: '#facc15',
        strokeColor: '#000000',
        strokeWidth: 3.5,
        backgroundColor: 'rgba(0,0,0,0.7)',
        animation: 'bounce',
        align: 'center',
        yPercent: 78,
      },
      color: '#eab308',
    }));

    // Replace old subtitle clips
    const nonTextClips = clips.filter((c) => c.trackId !== 'track-text');
    const updated = [...nonTextClips, ...subClips];
    setClips(updated);
    pushHistory(updated);
    showToast(
      language === 'km'
        ? `បានបន្ថែម Subtitle ${subtitles.length} ប្រយោគលើ Timeline!`
        : `Added ${subtitles.length} AI captions to timeline!`
    );
  };

  // 9. Apply AI Script Timeline Plan
  const handleApplyProjectPlan = (plan: any) => {
    if (plan.aspectRatio) setAspectRatio(plan.aspectRatio);
    if (plan.title) setProjectTitle(plan.title);

    if (Array.isArray(plan.scenes)) {
      let runningTime = 0;
      const newVideoClips: TimelineClip[] = [];
      const newTextClips: TimelineClip[] = [];

      plan.scenes.forEach((scene: any, idx: number) => {
        const sceneDuration = scene.duration || 4;
        const sampleVid = SAMPLE_MEDIA[idx % SAMPLE_MEDIA.length];

        newVideoClips.push({
          id: `ai-scene-${idx}-${Date.now()}`,
          trackId: 'track-v1',
          mediaId: sampleVid.id,
          title: scene.title || `Scene ${idx + 1}`,
          type: 'video',
          start: runningTime,
          duration: sceneDuration,
          sourceStart: 0,
          sourceDuration: 15,
          speed: 1,
          volume: 1,
          fadeIn: 0.2,
          fadeOut: 0.2,
          transform: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1, blendMode: 'normal' },
          filters: {
            brightness: 105,
            contrast: 110,
            saturate: 115,
            blur: 0,
            hueRotate: 0,
            sepia: 0,
            grayscale: 0,
            vignette: 15,
            preset: 'cyberpunk',
          },
          audioWaveform: generateWaveformPeaks(40),
          color: '#0284c7',
          transitionIn: scene.effect === 'zoom_in' ? 'zoom' : scene.effect === 'flash_transition' ? 'flash' : 'crossfade',
        });

        if (scene.caption) {
          newTextClips.push({
            id: `ai-text-${idx}-${Date.now()}`,
            trackId: 'track-text',
            mediaId: `text-${idx}`,
            title: scene.caption.slice(0, 20),
            type: 'text',
            start: runningTime + 0.2,
            duration: sceneDuration - 0.4,
            sourceStart: 0,
            sourceDuration: sceneDuration,
            speed: 1,
            volume: 0,
            fadeIn: 0.1,
            fadeOut: 0.1,
            transform: { x: 0, y: 35, scale: 1, rotation: 0, opacity: 1, blendMode: 'normal' },
            filters: {
              brightness: 100,
              contrast: 100,
              saturate: 100,
              blur: 0,
              hueRotate: 0,
              sepia: 0,
              grayscale: 0,
              vignette: 0,
              preset: 'none',
            },
            textConfig: {
              text: scene.caption,
              fontSize: 28,
              fontFamily: 'Kantumruy Pro',
              color: '#facc15',
              strokeColor: '#000000',
              strokeWidth: 3.5,
              backgroundColor: 'rgba(0,0,0,0.7)',
              animation: 'bounce',
              align: 'center',
              yPercent: 78,
            },
            color: '#eab308',
          });
        }

        runningTime += sceneDuration;
      });

      // Background music
      const musicClip: TimelineClip = {
        id: `ai-music-${Date.now()}`,
        trackId: 'track-a1',
        mediaId: 'sample-audio-1',
        title: 'AI Beats Soundtrack',
        type: 'audio',
        start: 0,
        duration: runningTime,
        sourceStart: 0,
        sourceDuration: 25,
        speed: 1,
        volume: 0.7,
        fadeIn: 0.5,
        fadeOut: 1.0,
        transform: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1, blendMode: 'normal' },
        filters: {
          brightness: 100,
          contrast: 100,
          saturate: 100,
          blur: 0,
          hueRotate: 0,
          sepia: 0,
          grayscale: 0,
          vignette: 0,
          preset: 'none',
        },
        audioWaveform: generateWaveformPeaks(60),
        color: '#8b5cf6',
      };

      const finalClips = [...newVideoClips, ...newTextClips, musicClip];
      setClips(finalClips);
      pushHistory(finalClips);
      setCurrentTime(0);
      showToast(language === 'km' ? 'បានបង្កើតគម្រោងវីដេអូ AI ដោយជោគជ័យ!' : 'AI Video Project applied successfully!');
    }
  };

  // Clip Inspector property update helpers
  const selectedClip = clips.find((c) => c.id === selectedClipId) || null;

  const handleUpdateClipTransform = (clipId: string, transformUpdate: Partial<ClipTransform>) => {
    setClips((prev) =>
      prev.map((c) => {
        if (c.id === clipId) {
          return { ...c, transform: { ...c.transform, ...transformUpdate } };
        }
        return c;
      })
    );
  };

  const handleUpdateClipFilters = (clipId: string, filtersUpdate: Partial<ClipFilters>) => {
    setClips((prev) =>
      prev.map((c) => {
        if (c.id === clipId) {
          return { ...c, filters: { ...c.filters, ...filtersUpdate } };
        }
        return c;
      })
    );
  };

  const handleUpdateClipAudio = (clipId: string, volume: number, fadeIn: number, fadeOut: number) => {
    setClips((prev) =>
      prev.map((c) => {
        if (c.id === clipId) {
          return { ...c, volume, fadeIn, fadeOut };
        }
        return c;
      })
    );
  };

  const handleUpdateClipSpeed = (clipId: string, speed: number) => {
    setClips((prev) =>
      prev.map((c) => {
        if (c.id === clipId) {
          return { ...c, speed };
        }
        return c;
      })
    );
  };

  const handleUpdateTextConfig = (clipId: string, textUpdate: Partial<TextConfig>) => {
    setClips((prev) =>
      prev.map((c) => {
        if (c.id === clipId && c.textConfig) {
          return { ...c, textConfig: { ...c.textConfig, ...textUpdate } };
        }
        return c;
      })
    );
  };

  // Track management
  const handleToggleTrackVisibility = (trackId: string) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, isVisible: !t.isVisible } : t))
    );
  };

  const handleToggleTrackMute = (trackId: string) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, isMuted: !t.isMuted } : t))
    );
  };

  const handleToggleTrackLock = (trackId: string) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, isLocked: !t.isLocked } : t))
    );
    const track = tracks.find((t) => t.id === trackId);
    showToast(track?.isLocked ? 'Track unlocked' : 'Track locked');
  };

  const handleRenameTrack = (trackId: string, newName: string) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, name: newName } : t))
    );
    showToast(`Track renamed to "${newName}"`);
  };

  const handleDeleteTrack = (trackId: string) => {
    if (tracks.length <= 1) {
      showToast('Cannot delete the last remaining track');
      return;
    }
    const trackToDelete = tracks.find((t) => t.id === trackId);
    setTracks((prev) => prev.filter((t) => t.id !== trackId));
    // Also remove clips on this track and update history
    setClips((prev) => {
      const remaining = prev.filter((c) => c.trackId !== trackId);
      pushHistory(remaining);
      return remaining;
    });
    soundEngine.playEffect('pop');
    showToast(
      language === 'km'
        ? `បានលុប Track "${trackToDelete?.name || ''}" រួចរាល់`
        : `Track "${trackToDelete?.name || ''}" deleted`
    );
  };

  const handleAddTrack = (type: TrackType) => {
    const typeCount = tracks.filter((t) => t.type === type).length + 1;
    const prefix = type === 'video' ? 'V' : type === 'audio' ? 'A' : type === 'text' ? 'T' : 'O';
    const label =
      type === 'video' ? 'Video' : type === 'audio' ? 'Audio' : type === 'text' ? 'Subtitles' : 'Overlay';
    const newTrack: TimelineTrack = {
      id: `track-${type}-${Date.now()}`,
      name: `${prefix}${typeCount} ${label}`,
      type,
      isMuted: false,
      isLocked: false,
      isVisible: true,
      volume: 1,
    };
    setTracks((prev) => [...prev, newTrack]);
    soundEngine.playEffect('pop');
    showToast(
      language === 'km'
        ? `បានបន្ថែម ${newTrack.name} ថ្មី!`
        : `Added new track ${newTrack.name}!`
    );
  };

  const handleMoveClipToTrack = (clipId: string, targetTrackId: string) => {
    setClips((prev) =>
      prev.map((c) => (c.id === clipId ? { ...c, trackId: targetTrackId } : c))
    );
    const targetTrack = tracks.find((t) => t.id === targetTrackId);
    showToast(`Moved clip to ${targetTrack?.name || 'track'}`);
  };

  const handleMoveTrackUp = (trackId: string) => {
    setTracks((prev) => {
      const idx = prev.findIndex((t) => t.id === trackId);
      if (idx <= 0) return prev;
      const copy = [...prev];
      const temp = copy[idx - 1];
      copy[idx - 1] = copy[idx];
      copy[idx] = temp;
      return copy;
    });
  };

  const handleMoveTrackDown = (trackId: string) => {
    setTracks((prev) => {
      const idx = prev.findIndex((t) => t.id === trackId);
      if (idx < 0 || idx >= prev.length - 1) return prev;
      const copy = [...prev];
      const temp = copy[idx + 1];
      copy[idx + 1] = copy[idx];
      copy[idx] = temp;
      return copy;
    });
  };

  const handleClearTrackClips = (trackId: string) => {
    const track = tracks.find((t) => t.id === trackId);
    setClips((prev) => {
      const remaining = prev.filter((c) => c.trackId !== trackId);
      pushHistory(remaining);
      return remaining;
    });
    showToast(
      language === 'km'
        ? `បានសម្អាត Clips លើ Track "${track?.name || ''}"`
        : `Cleared clips from track "${track?.name || ''}"`
    );
  };

  return (
    <div className="w-screen h-screen flex flex-col bg-[#0f1017] text-gray-200 overflow-hidden font-sans">
      {/* 1. Desktop Window Header Bar */}
      <HeaderBar
        projectTitle={projectTitle}
        onProjectTitleChange={setProjectTitle}
        aspectRatio={aspectRatio}
        onAspectRatioChange={setAspectRatio}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onOpenAIMagic={() => setIsAIMagicOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        language={language}
        onLanguageChange={setLanguage}
      />

      {/* 2. Middle Work Area (Sidebar Navigation + Left Panel + Player Canvas + Right Inspector) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Leftmost Navigation Icons (CapCut Style) */}
        <SidebarTabs activeTab={activeTab} onTabChange={setActiveTab} language={language} />

        {/* Left Content Drawer */}
        <div className="w-76 bg-[#151620] border-r border-[#20212f] flex flex-col shrink-0 overflow-hidden">
          {activeTab === 'media' && (
            <MediaPanel
              mediaLibrary={mediaLibrary}
              onAddMediaToLibrary={(m) => setMediaLibrary((prev) => [m, ...prev])}
              onRemoveMediaFromLibrary={(id) => setMediaLibrary((prev) => prev.filter((m) => m.id !== id))}
              onAddClipToTimeline={handleAddMediaToTimeline}
              language={language}
            />
          )}

          {activeTab === 'autocut' && (
            <AutoCutPanel
              clips={clips}
              selectedClipId={selectedClipId}
              onAutoCutSilence={handleAutoCutSilence}
              onCutSpecificInterval={handleCutSpecificInterval}
              onSeekToTime={(time) => setCurrentTime(time)}
              onAddSubtitlesToTimeline={handleAddSubtitlesToTimeline}
              language={language}
            />
          )}

          {activeTab === 'audio' && (
            <AudioPanel onAddAudioToTimeline={handleAddMediaToTimeline} language={language} />
          )}

          {activeTab === 'text' && (
            <TextPanel onAddTextClip={handleAddTextClip} language={language} />
          )}

          {activeTab === 'effects' && (
            <EffectsPanel
              activePreset={selectedClip?.filters.preset || 'none'}
              onApplyFilterPreset={(preset, f) => {
                if (selectedClipId) {
                  handleUpdateClipFilters(selectedClipId, { ...f, preset });
                }
              }}
              language={language}
            />
          )}

          {activeTab === 'transitions' && (
            <TransitionsPanel
              onApplyTransition={(tr) => {
                if (selectedClipId) {
                  setClips((prev) =>
                    prev.map((c) => (c.id === selectedClipId ? { ...c, transitionIn: tr } : c))
                  );
                  showToast(`Transition "${tr}" applied`);
                }
              }}
              language={language}
            />
          )}

          {activeTab === 'stickers' && (
            <StickersPanel onAddSticker={handleAddMediaToTimeline} language={language} />
          )}
        </div>

        {/* Center Preview Player Canvas */}
        <CanvasPreview
          aspectRatio={aspectRatio}
          currentTime={currentTime}
          totalDuration={totalDuration}
          isPlaying={isPlaying}
          clips={clips}
          tracks={tracks}
          selectedClipId={selectedClipId}
          onTogglePlay={() => setIsPlaying((prev) => !prev)}
          onSeek={(time) => setCurrentTime(time)}
          onSplitAtPlayhead={() => {
            if (selectedClipId) handleSplitClip(selectedClipId, currentTime);
          }}
          language={language}
        />

        {/* Right Inspector Panel */}
        <InspectorPanel
          selectedClip={selectedClip}
          tracks={tracks}
          onMoveClipToTrack={handleMoveClipToTrack}
          onDeleteClip={handleDeleteClip}
          onUpdateClipTransform={handleUpdateClipTransform}
          onUpdateClipFilters={handleUpdateClipFilters}
          onUpdateClipAudio={handleUpdateClipAudio}
          onUpdateClipSpeed={handleUpdateClipSpeed}
          onUpdateTextConfig={handleUpdateTextConfig}
          language={language}
        />
      </div>

      {/* 3. Bottom Multi-Track Timeline (CapCut Desktop Style) */}
      <Timeline
        tracks={tracks}
        clips={clips}
        currentTime={currentTime}
        totalDuration={totalDuration}
        selectedClipId={selectedClipId}
        onSelectClip={setSelectedClipId}
        onSeek={(time) => setCurrentTime(time)}
        onSplitClip={handleSplitClip}
        onSplitDeleteLeft={handleSplitDeleteLeft}
        onSplitDeleteRight={handleSplitDeleteRight}
        onDeleteClip={handleDeleteClip}
        onDuplicateClip={handleDuplicateClip}
        onUpdateClipTiming={handleUpdateClipTiming}
        onToggleTrackVisibility={handleToggleTrackVisibility}
        onToggleTrackMute={handleToggleTrackMute}
        onToggleTrackLock={handleToggleTrackLock}
        onRenameTrack={handleRenameTrack}
        onDeleteTrack={handleDeleteTrack}
        onAddTrack={handleAddTrack}
        onMoveTrackUp={handleMoveTrackUp}
        onMoveTrackDown={handleMoveTrackDown}
        onClearTrackClips={handleClearTrackClips}
        language={language}
      />

      {/* 4. Modals */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        aspectRatio={aspectRatio}
        totalDuration={totalDuration}
        clips={clips}
        tracks={tracks}
        projectTitle={projectTitle}
        language={language}
      />

      <AIPromptModal
        isOpen={isAIMagicOpen}
        onClose={() => setIsAIMagicOpen(false)}
        onApplyProjectPlan={handleApplyProjectPlan}
        language={language}
      />

      {/* Notification Toast */}
      {toastMessage && (
        <div className="fixed bottom-68 right-6 bg-[#1c1e2e] border border-cyan-500/50 text-cyan-200 px-4 py-2.5 rounded-lg shadow-xl text-xs flex items-center space-x-2 animate-bounce z-50">
          <span className="w-2 h-2 rounded-full bg-cyan-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
