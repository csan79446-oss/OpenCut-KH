import React, { useState } from 'react';
import {
  Scissors,
  Wand2,
  Trash2,
  Sparkles,
  VolumeX,
  Play,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  Flame,
} from 'lucide-react';
import { SilenceSegment, SubtitleItem, TimelineClip } from '../types/editor';
import { Language, translations } from '../utils/i18n';
import { detectSilenceIntervals, generateWaveformPeaks } from '../utils/audioAnalysis';

interface AutoCutPanelProps {
  clips: TimelineClip[];
  selectedClipId: string | null;
  onAutoCutSilence: (thresholdDb: number, minDuration: number) => void;
  onCutSpecificInterval: (start: number, end: number) => void;
  onSeekToTime: (time: number) => void;
  onAddSubtitlesToTimeline: (subtitles: SubtitleItem[]) => void;
  language: Language;
}

export const AutoCutPanel: React.FC<AutoCutPanelProps> = ({
  clips,
  selectedClipId,
  onAutoCutSilence,
  onCutSpecificInterval,
  onSeekToTime,
  onAddSubtitlesToTimeline,
  language,
}) => {
  const t = translations[language];

  // AutoCut settings
  const [thresholdDb, setThresholdDb] = useState<number>(-32);
  const [minPauseDuration, setMinPauseDuration] = useState<number>(0.35);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcripts, setTranscripts] = useState<SubtitleItem[]>([
    { id: 'sub-1', start: 0.5, end: 3.2, text: language === 'km' ? 'សូមស្វាគមន៍មកកាន់ OpenCut Studio!' : 'Welcome to OpenCut Studio!' },
    { id: 'sub-2', start: 3.8, end: 6.5, text: language === 'km' ? 'កាត់ចន្លោះស្ងាត់ (Silence) ដោយស្វ័យប្រវត្តិ' : 'Auto-cut silent pauses and jump-cuts easily.' },
    { id: 'sub-3', start: 7.2, end: 10.4, text: language === 'km' ? 'បង្កើត Subtitles និងនាំចេញវីដេអូលឿនរហ័ស' : 'Generate dynamic captions and export high-res video.' },
  ]);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<{
    summary?: string;
    highlights?: { start: number; end: number; title: string; score: number }[];
    pacingAdvice?: string;
  } | null>(null);

  // Identify targeted clip or first video clip
  const targetClip = clips.find((c) => c.id === selectedClipId) || clips.find((c) => c.type === 'video');
  const targetWaveform = targetClip?.audioWaveform || generateWaveformPeaks(60);
  const detectedSilences: SilenceSegment[] = targetClip
    ? detectSilenceIntervals(targetWaveform, targetClip.duration, thresholdDb, minPauseDuration)
    : [];

  const totalDeadAir = detectedSilences.reduce((acc, s) => acc + s.duration, 0);

  // Generate AI Transcripts & Auto-Captions
  const handleGenerateTranscripts = async () => {
    setIsTranscribing(true);
    try {
      const res = await fetch('/api/ai/transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language,
          videoTitle: targetClip?.title || 'Video Project',
          detectedSilentGaps: detectedSilences,
        }),
      });
      const data = await res.json();
      if (data.success && data.subtitles) {
        setTranscripts(data.subtitles);
      }
    } catch (err) {
      console.error('Transcription error:', err);
    } finally {
      setIsTranscribing(false);
    }
  };

  // Run AI Pacing & Highlights Analysis
  const handleAnalyzePacing = async () => {
    setIsAnalyzing(true);
    try {
      const res = await fetch('/api/ai/autocut-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoDuration: targetClip?.duration || 15,
          clips,
          userPrompt: 'Identify punchy viral hooks and silence jump cuts',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAiAnalysisResult(data);
      }
    } catch (err) {
      console.error('Pacing analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="h-full flex flex-col p-3 text-xs bg-[#151620] overflow-y-auto space-y-4">
      {/* Title & Tagline */}
      <div className="bg-gradient-to-r from-rose-950/40 via-purple-950/30 to-[#1b1d2b] p-3 rounded-xl border border-rose-500/25">
        <div className="flex items-center space-x-2 text-rose-400 font-bold text-sm">
          <Scissors className="w-4 h-4 text-rose-400" />
          <span>{t.autoCutTitle}</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500 text-white uppercase font-bold tracking-wider">
            AutoCut
          </span>
        </div>
        <p className="text-[11px] text-gray-300 mt-1 leading-relaxed">
          {t.autoCutDesc}
        </p>
      </div>

      {/* 1. Silence Cut Engine Controls */}
      <div className="bg-[#1a1b28] p-3 rounded-lg border border-[#27293d] space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-gray-200 flex items-center gap-1.5">
            <VolumeX className="w-3.5 h-3.5 text-cyan-400" />
            <span>{t.silenceThreshold}</span>
          </span>
          <span className="font-mono text-cyan-400 font-bold bg-[#12131d] px-2 py-0.5 rounded">
            {thresholdDb} dB
          </span>
        </div>

        <input
          type="range"
          min="-48"
          max="-16"
          step="1"
          value={thresholdDb}
          onChange={(e) => setThresholdDb(parseFloat(e.target.value))}
          className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-[#25283c] rounded-lg"
        />

        <div className="flex items-center justify-between pt-1">
          <span className="font-semibold text-gray-200 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>{t.minDuration}</span>
          </span>
          <span className="font-mono text-cyan-400 font-bold bg-[#12131d] px-2 py-0.5 rounded">
            {minPauseDuration}s
          </span>
        </div>

        <input
          type="range"
          min="0.2"
          max="1.2"
          step="0.05"
          value={minPauseDuration}
          onChange={(e) => setMinPauseDuration(parseFloat(e.target.value))}
          className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-[#25283c] rounded-lg"
        />

        {/* Silence Detection Summary Card */}
        <div className="p-2.5 rounded-lg bg-[#12131e] border border-[#232537] flex items-center justify-between">
          <div>
            <div className="text-gray-300 font-semibold text-xs flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span>
                {detectedSilences.length} {t.pausesFound}
              </span>
            </div>
            <div className="text-[10px] text-gray-400 mt-0.5">
              {language === 'km'
                ? `កាត់បន្ថយពេលវេលាស្ងាត់: ~${Math.round(totalDeadAir * 10) / 10} វិនាទី`
                : `Total dead air to eliminate: ~${Math.round(totalDeadAir * 10) / 10}s`}
            </div>
          </div>

          <button
            onClick={() => onAutoCutSilence(thresholdDb, minPauseDuration)}
            disabled={detectedSilences.length === 0}
            className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow transition ${
              detectedSilences.length > 0
                ? 'bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500 text-white shadow-rose-900/40 active:scale-95'
                : 'bg-[#222435] text-gray-500 cursor-not-allowed'
            }`}
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>{t.removeSilences}</span>
          </button>
        </div>

        {/* Detected silence intervals pill list */}
        {detectedSilences.length > 0 && (
          <div className="max-h-24 overflow-y-auto space-y-1.5 pr-1">
            {detectedSilences.map((silence, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-1.5 rounded bg-[#1f2133] hover:bg-[#25283e] text-[11px] text-gray-300 border border-[#2b2e46]"
              >
                <div className="flex items-center space-x-2">
                  <span className="text-rose-400 font-mono font-medium">#{idx + 1}</span>
                  <span>
                    {silence.start}s → {silence.end}s
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono">
                    ({silence.duration}s dead air)
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => onSeekToTime((targetClip?.start || 0) + silence.start)}
                    className="p-1 hover:text-cyan-400"
                    title="Jump to pause"
                  >
                    <Play className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => onCutSpecificInterval(silence.start, silence.end)}
                    className="p-1 hover:text-rose-400"
                    title="Cut this pause"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. Interactive Transcript Editor (AutoCut Feature) */}
      <div className="bg-[#1a1b28] p-3 rounded-lg border border-[#27293d] space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="font-semibold text-gray-200 flex items-center space-x-1.5">
            <FileText className="w-3.5 h-3.5 text-purple-400" />
            <span>{t.transcriptTitle}</span>
          </div>

          <button
            onClick={handleGenerateTranscripts}
            disabled={isTranscribing}
            className="flex items-center space-x-1 px-2.5 py-1 rounded bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 text-[10px] font-medium transition"
          >
            <Sparkles className={`w-3 h-3 ${isTranscribing ? 'animate-spin' : ''}`} />
            <span>{isTranscribing ? 'Generating...' : t.generateTranscript}</span>
          </button>
        </div>

        <p className="text-[10px] text-gray-400">
          {language === 'km'
            ? 'ចុចលើប្រយោគដើម្បីលោតទៅដល់កន្លែងនិយាយ ឬលុបចេញពីវីដេអូដោយផ្ទាល់'
            : 'Click any sentence to jump playhead, or click trash to slice out that text segment.'}
        </p>

        {/* Transcript items list */}
        <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
          {transcripts.map((sub) => (
            <div
              key={sub.id}
              className="p-2 rounded bg-[#131420] hover:bg-[#1a1c2d] border border-[#25283c] flex items-start justify-between group transition"
            >
              <div
                className="flex-1 cursor-pointer"
                onClick={() => onSeekToTime(sub.start)}
                title="Click to seek"
              >
                <div className="flex items-center space-x-2 text-[10px] text-cyan-400 font-mono mb-0.5">
                  <Play className="w-2.5 h-2.5" />
                  <span>
                    {sub.start.toFixed(1)}s - {sub.end.toFixed(1)}s
                  </span>
                </div>
                <div className="text-gray-200 text-xs font-medium leading-relaxed group-hover:text-cyan-200">
                  {sub.text}
                </div>
              </div>

              <button
                onClick={() => onCutSpecificInterval(sub.start, sub.end)}
                className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-rose-400 transition ml-2"
                title={t.deleteSegment}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 3. AI Viral Highlights & Pacing */}
      <div className="bg-[#1a1b28] p-3 rounded-lg border border-[#27293d] space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="font-semibold text-gray-200 flex items-center space-x-1.5">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>{t.highlightsTitle}</span>
          </div>

          <button
            onClick={handleAnalyzePacing}
            disabled={isAnalyzing}
            className="flex items-center space-x-1 px-2.5 py-1 rounded bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 border border-amber-500/40 text-[10px] font-medium transition"
          >
            <Sparkles className={`w-3 h-3 ${isAnalyzing ? 'animate-spin' : ''}`} />
            <span>{isAnalyzing ? 'Analyzing...' : t.detectHighlights}</span>
          </button>
        </div>

        {aiAnalysisResult && (
          <div className="space-y-2">
            {aiAnalysisResult.summary && (
              <div className="p-2 rounded bg-amber-950/20 border border-amber-500/30 text-amber-200 text-[11px]">
                {aiAnalysisResult.summary}
              </div>
            )}

            {aiAnalysisResult.highlights?.map((hl, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2 rounded bg-[#12131e] border border-[#282a40]"
              >
                <div>
                  <div className="text-gray-200 font-semibold text-xs flex items-center gap-1.5">
                    <span>{hl.title}</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40">
                      Score: {hl.score}%
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-400 font-mono">
                    {hl.start}s - {hl.end}s
                  </div>
                </div>

                <button
                  onClick={() => onSeekToTime(hl.start)}
                  className="px-2 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] flex items-center gap-1 transition"
                >
                  <Play className="w-2.5 h-2.5" />
                  <span>Preview</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
