/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Type,
  Sparkles,
  Plus,
  Flame,
  FileText,
  Play,
  Trash2,
  Check,
  Languages,
  Search,
  CheckCircle2,
  Sliders,
  Layers,
  Wand2,
  Zap,
  Mic,
  Music,
  Volume2,
  Info,
} from 'lucide-react';
import { SubtitleItem, TextConfig, TimelineClip, WordAnimationStyle } from '../types/editor';
import { Language, translations } from '../utils/i18n';
import { CAPCUT_CAPTION_STYLES, CaptionStylePreset, getCaptionStyleById } from '../utils/captionStyles';

interface TextPanelProps {
  clips: TimelineClip[];
  selectedClipId: string | null;
  currentTime: number;
  onSelectClip: (clipId: string | null) => void;
  onAddTextClip: (textConfig: TextConfig, title: string) => void;
  onAddSubtitlesToTimeline: (subtitles: SubtitleItem[], styleConfig?: TextConfig) => void;
  onUpdateClipText: (clipId: string, newText: string) => void;
  onDeleteClip: (clipId: string) => void;
  onApplyStyleToAllCaptions: (config: Partial<TextConfig>) => void;
  onSeekToTime: (time: number) => void;
  language: Language;
  activeCaptionStyleId?: string;
  activeWordStyle?: WordAnimationStyle;
  activeHighlightColor?: string;
  onUpdateCaptionStyle?: (styleId: string, wordStyle?: WordAnimationStyle, highlightColor?: string) => void;
}

export const TextPanel: React.FC<TextPanelProps> = ({
  clips,
  selectedClipId,
  currentTime,
  onSelectClip,
  onAddTextClip,
  onAddSubtitlesToTimeline,
  onUpdateClipText,
  onDeleteClip,
  onApplyStyleToAllCaptions,
  onSeekToTime,
  language,
  activeCaptionStyleId,
  activeWordStyle,
  activeHighlightColor,
  onUpdateCaptionStyle,
}) => {
  const t = translations[language];

  // Panel Sub-tabs: 'autocaptions' | 'styles' | 'addtitle'
  const [subTab, setSubTab] = useState<'autocaptions' | 'styles' | 'addtitle'>('autocaptions');

  // Auto Captions State (synchronized with App & AudioPanel)
  const [captionLanguage, setCaptionLanguage] = useState<'km' | 'en' | 'bilingual'>(language === 'km' ? 'km' : 'en');
  const [selectedStyleId, setSelectedStyleId] = useState<string>(activeCaptionStyleId || 'alex-hormozi-word');
  const [wordStyle, setWordStyle] = useState<WordAnimationStyle>(activeWordStyle || 'word-by-word');
  const [highlightColor, setHighlightColor] = useState<string>(activeHighlightColor || '#ffe600');
  const [isGenerating, setIsGenerating] = useState(false);
  const [topicHint, setTopicHint] = useState('');
  const [clearExisting, setClearExisting] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Sync props from App
  React.useEffect(() => {
    if (activeCaptionStyleId) setSelectedStyleId(activeCaptionStyleId);
  }, [activeCaptionStyleId]);

  React.useEffect(() => {
    if (activeWordStyle) setWordStyle(activeWordStyle);
  }, [activeWordStyle]);

  React.useEffect(() => {
    if (activeHighlightColor) setHighlightColor(activeHighlightColor);
  }, [activeHighlightColor]);

  const handleSelectStyle = (newStyleId: string) => {
    setSelectedStyleId(newStyleId);
    onUpdateCaptionStyle?.(newStyleId, wordStyle, highlightColor);
  };

  const handleSelectWordStyle = (newWordStyle: WordAnimationStyle) => {
    setWordStyle(newWordStyle);
    onUpdateCaptionStyle?.(selectedStyleId, newWordStyle, highlightColor);
  };

  const handleSelectHighlightColor = (newColor: string) => {
    setHighlightColor(newColor);
    onUpdateCaptionStyle?.(selectedStyleId, wordStyle, newColor);
  };

  // Add custom title state
  const [customTitle, setCustomTitle] = useState('🔥 VIRAL HOOK TITLE');
  const [titlePosition, setTitlePosition] = useState<number>(25); // Top 25%
  const [titleAnimation, setTitleAnimation] = useState<string>('spring-pop');

  // Current subtitle clips on timeline (from track-text or text type)
  const currentTextClips = clips
    .filter((c) => c.trackId === 'track-text' || c.type === 'text')
    .sort((a, b) => a.start - b.start);

  const selectedClip = clips.find((c) => c.id === selectedClipId);
  const currentSelectedPreset = CAPCUT_CAPTION_STYLES.find((s) => s.id === selectedStyleId) || CAPCUT_CAPTION_STYLES[0];

  // Timeline Audio Sources detection (AI Voice, Imported Audio, Video Audio)
  const audioClips = clips.filter((c) => c.type === 'audio');
  const aiVoiceClips = audioClips.filter(
    (c) => Boolean(c.ttsText) || c.title.toLowerCase().includes('ai voice') || c.title.toLowerCase().includes('voiceover') || c.trackId === 'track-a2'
  );
  const importedAudioClips = audioClips.filter((c) => !aiVoiceClips.includes(c));
  const videoClips = clips.filter((c) => c.type === 'video');

  const [selectedAudioSourceId, setSelectedAudioSourceId] = useState<string>('auto');
  const [successCaptionNotice, setSuccessCaptionNotice] = useState<string | null>(null);

  // Resolved active audio source for transcription
  const targetAudioClip: TimelineClip | undefined =
    selectedAudioSourceId === 'auto'
      ? aiVoiceClips[0] || importedAudioClips[0] || videoClips[0]
      : clips.find((c) => c.id === selectedAudioSourceId) || aiVoiceClips[0] || importedAudioClips[0] || videoClips[0];

  // Generate Auto-Captions with AI (from AI Voice, Imported Audio, or Video)
  const handleGenerateAutoCaptions = async () => {
    setIsGenerating(true);
    setSuccessCaptionNotice(null);
    try {
      const activeClip = targetAudioClip;
      const spokenText = activeClip?.ttsText;
      const clipStartTime = activeClip ? activeClip.start : 0;
      const clipDuration = activeClip ? activeClip.duration : 15;
      const clipTitle = activeClip?.title || 'Timeline Audio';

      const res = await fetch('/api/ai/transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: captionLanguage === 'bilingual' ? 'km' : captionLanguage,
          videoTitle: clipTitle,
          spokenText: spokenText || undefined,
          audioStartTime: clipStartTime,
          audioDuration: clipDuration,
          audioTextHint:
            topicHint ||
            (spokenText
              ? spokenText
              : captionLanguage === 'km'
              ? `សំឡេងនិយាយ ${clipTitle}`
              : `Dialogue from ${clipTitle}`),
        }),
      });

      const data = await res.json();
      if (data.success && Array.isArray(data.subtitles) && data.subtitles.length > 0) {
        const chosenStyle = getCaptionStyleById(selectedStyleId);
        const finalConfig: TextConfig = {
          ...chosenStyle.config,
          wordStyle,
          highlightColor,
        };
        onAddSubtitlesToTimeline(data.subtitles, finalConfig);
        setSuccessCaptionNotice(
          language === 'km'
            ? `បានបង្កើត Auto Caption (${data.subtitles.length} បន្ទាត់) ចេញពី ${activeClip ? activeClip.title : 'សំឡេង'} លើ Text Track ដោយជោគជ័យ!`
            : `Generated ${data.subtitles.length} captions from ${activeClip ? activeClip.title : 'audio'} successfully!`
        );
      }
    } catch (err) {
      console.error('Auto-caption generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Add single new subtitle line at current time
  const handleAddNewSubtitleLine = () => {
    const chosenStyle = getCaptionStyleById(selectedStyleId);
    const finalConfig: TextConfig = {
      ...chosenStyle.config,
      wordStyle,
      highlightColor,
    };
    const newSub: SubtitleItem = {
      id: `sub-${Date.now()}`,
      start: Math.round(currentTime * 100) / 100,
      end: Math.round((currentTime + 2.5) * 100) / 100,
      text: language === 'km' ? 'បញ្ចូលអត្ថបទ Subtitle ថ្មី...' : 'New caption line...',
    };
    onAddSubtitlesToTimeline([...currentTextClips.map((c, i) => ({
      id: c.id,
      start: c.start,
      end: c.start + c.duration,
      text: c.textConfig?.text || c.title,
    })), newSub], finalConfig);
  };

  // Filtered subtitle items for transcript list
  const filteredTextClips = currentTextClips.filter((c) => {
    if (!searchQuery.trim()) return true;
    const txt = c.textConfig?.text || c.title || '';
    return txt.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="h-full flex flex-col bg-[#141520] text-xs select-none overflow-hidden">
      {/* Top Sub-Tab Switcher (CapCut Desktop Text Style) */}
      <div className="p-2 border-b border-[#212335] bg-[#12131d] flex space-x-1 shrink-0">
        <button
          onClick={() => setSubTab('autocaptions')}
          className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center space-x-1.5 font-semibold transition cursor-pointer ${
            subTab === 'autocaptions'
              ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/50 shadow-sm'
              : 'text-gray-400 hover:text-gray-200 hover:bg-[#1a1c2a]'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Auto Captions</span>
        </button>

        <button
          onClick={() => setSubTab('styles')}
          className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center space-x-1.5 font-semibold transition cursor-pointer ${
            subTab === 'styles'
              ? 'bg-amber-600/30 text-amber-300 border border-amber-500/50 shadow-sm'
              : 'text-gray-400 hover:text-gray-200 hover:bg-[#1a1c2a]'
          }`}
        >
          <Flame className="w-3.5 h-3.5 text-amber-400" />
          <span>{language === 'km' ? 'ម៉ូត Styles' : 'Styles'}</span>
        </button>

        <button
          onClick={() => setSubTab('addtitle')}
          className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center space-x-1.5 font-semibold transition cursor-pointer ${
            subTab === 'addtitle'
              ? 'bg-purple-600/30 text-purple-300 border border-purple-500/50 shadow-sm'
              : 'text-gray-400 hover:text-gray-200 hover:bg-[#1a1c2a]'
          }`}
        >
          <Type className="w-3.5 h-3.5 text-purple-400" />
          <span>{language === 'km' ? 'អក្សរ Title' : 'Title'}</span>
        </button>
      </div>

      {/* Sub-Tab 1: Auto Captions Generator & Transcript Editor */}
      {subTab === 'autocaptions' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
          {/* CapCut Auto Caption AI Card */}
          <div className="bg-gradient-to-br from-cyan-950/40 via-[#181a29] to-[#12131d] p-3 rounded-xl border border-cyan-500/30 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-cyan-300 font-bold text-sm">
                <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
                <span>Auto Captions (AI)</span>
              </div>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 uppercase font-mono font-bold">
                CapCut Style
              </span>
            </div>

            <p className="text-[11px] text-gray-300 leading-relaxed">
              {language === 'km'
                ? 'បង្កើតចំណងជើងរងអក្សររត់ស្វ័យប្រវត្តិតាមសំឡេងនិយាយក្នុងវីដេអូ ឬសំឡេង AI Voice / Import Audio ជាមួយនឹងម៉ូតអក្សរ CapCut ពេញនិយម។'
                : 'Automatically generate synchronized dynamic subtitles from spoken audio, AI Voice, or imported audio with trending CapCut styles.'}
            </p>

            {/* Audio Source Selector (AI Voice, Imported Audio, Video Audio) */}
            <div className="space-y-1.5 p-2 bg-[#12131d] rounded-lg border border-cyan-500/25">
              <div className="flex items-center justify-between text-[11px]">
                <label className="text-gray-300 font-semibold flex items-center space-x-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>
                    {language === 'km' ? 'ប្រភពសំឡេង (Audio Source)' : 'Audio Source to Transcribe'}
                  </span>
                </label>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-900/40 text-cyan-300 font-mono">
                  {targetAudioClip
                    ? targetAudioClip.ttsText
                      ? 'AI Voice'
                      : targetAudioClip.type === 'audio'
                      ? 'Import Audio'
                      : 'Video Track'
                    : 'No Audio'}
                </span>
              </div>

              {/* Source Dropdown */}
              <div className="space-y-1">
                <select
                  value={selectedAudioSourceId}
                  onChange={(e) => setSelectedAudioSourceId(e.target.value)}
                  className="w-full bg-[#181a29] border border-[#2a2d42] rounded-md px-2 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  <option value="auto">
                    {language === 'km'
                      ? '✨ ស្វែងរកដោយស្វ័យប្រវត្តិ (Auto: AI Voice / Import Audio)'
                      : '✨ Auto-Detect (AI Voice / Imported Audio)'}
                  </option>
                  {aiVoiceClips.map((c) => (
                    <option key={c.id} value={c.id}>
                      🎙️ {language === 'km' ? 'សំឡេង AI Voice' : 'AI Voice'}: {c.title} ({c.duration}s)
                    </option>
                  ))}
                  {importedAudioClips.map((c) => (
                    <option key={c.id} value={c.id}>
                      🎵 {language === 'km' ? 'សំឡេង Audio នាំចូល' : 'Imported Audio'}: {c.title} ({c.duration}s)
                    </option>
                  ))}
                  {videoClips.map((c) => (
                    <option key={c.id} value={c.id}>
                      🎬 {language === 'km' ? 'សំឡេងវីដេអូ' : 'Video'}: {c.title} ({c.duration}s)
                    </option>
                  ))}
                </select>

                {/* Status indicator badge */}
                {targetAudioClip ? (
                  <div className="flex items-center gap-1.5 text-[10px] text-emerald-400/90 pt-0.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span className="truncate">
                      {targetAudioClip.ttsText ? (
                        language === 'km'
                          ? `រកឃើញ AI Voice: "${targetAudioClip.ttsText.slice(0, 30)}..."`
                          : `Found AI Voice: "${targetAudioClip.ttsText.slice(0, 30)}..."`
                      ) : (
                        language === 'km'
                          ? `ភ្ជាប់ជាមួយសំឡេង: ${targetAudioClip.title} (${targetAudioClip.duration}s)`
                          : `Linked with: ${targetAudioClip.title} (${targetAudioClip.duration}s)`
                      )}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-[10px] text-amber-400/80 pt-0.5">
                    <Info className="w-3 h-3 text-amber-400 shrink-0" />
                    <span>
                      {language === 'km'
                        ? 'មិនទាន់មានសំឡេងលើ Timeline ទេ។ Generate AI Voice ឬ Import Audio ជាមុនសិន!'
                        : 'No audio clip on Timeline. Generate AI Voice or import audio first!'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Language Selector */}
            <div className="space-y-1.5 pt-1">
              <label className="text-gray-400 text-[11px] font-medium flex items-center space-x-1.5">
                <Languages className="w-3.5 h-3.5 text-cyan-400" />
                <span>{t.selectLanguage}</span>
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setCaptionLanguage('km')}
                  className={`py-1.5 px-2 rounded-lg text-center font-semibold border transition cursor-pointer ${
                    captionLanguage === 'km'
                      ? 'bg-cyan-500 text-white border-cyan-400 shadow-md shadow-cyan-950'
                      : 'bg-[#1a1b28] text-gray-400 border-[#292b3f] hover:text-white'
                  }`}
                >
                  🇰🇭 ខ្មែរ (KM)
                </button>
                <button
                  type="button"
                  onClick={() => setCaptionLanguage('en')}
                  className={`py-1.5 px-2 rounded-lg text-center font-semibold border transition cursor-pointer ${
                    captionLanguage === 'en'
                      ? 'bg-cyan-500 text-white border-cyan-400 shadow-md shadow-cyan-950'
                      : 'bg-[#1a1b28] text-gray-400 border-[#292b3f] hover:text-white'
                  }`}
                >
                  🇬🇧 English
                </button>
                <button
                  type="button"
                  onClick={() => setCaptionLanguage('bilingual')}
                  className={`py-1.5 px-2 rounded-lg text-center font-semibold border transition cursor-pointer ${
                    captionLanguage === 'bilingual'
                      ? 'bg-cyan-500 text-white border-cyan-400 shadow-md shadow-cyan-950'
                      : 'bg-[#1a1b28] text-gray-400 border-[#292b3f] hover:text-white'
                  }`}
                >
                  🌐 ភាសាទាំងពីរ
                </button>
              </div>
            </div>

            {/* Choose Default Caption Style for Generation */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-gray-400 font-medium">{language === 'km' ? 'ម៉ូត Caption ដំបូង' : 'Caption Style Template'}</span>
                <span className="text-cyan-400 font-semibold">{currentSelectedPreset.name}</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {CAPCUT_CAPTION_STYLES.slice(0, 4).map((style) => (
                  <button
                    key={style.id}
                    onClick={() => handleSelectStyle(style.id)}
                    className={`p-2 rounded-lg border text-left flex flex-col justify-between transition cursor-pointer ${
                      selectedStyleId === style.id
                        ? 'border-cyan-400 bg-cyan-950/40 ring-1 ring-cyan-400'
                        : 'border-[#26283d] bg-[#161726] hover:border-gray-600'
                    }`}
                  >
                    <span className="text-[10px] text-gray-400 truncate font-medium">{style.nameKm}</span>
                    <span
                      className="font-bold text-xs mt-1 truncate"
                      style={{
                        color: style.config.color,
                        textShadow: style.config.strokeWidth ? `0 0 2px ${style.config.strokeColor}` : 'none',
                      }}
                    >
                      {style.previewText}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Word-by-Word Voice Sync Animation Settings (TikTok / CapCut Viral Style) */}
            <div className="p-2.5 bg-[#12131e] rounded-lg border border-purple-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-purple-300">
                  <Zap className="w-3.5 h-3.5 text-yellow-400" />
                  <span>
                    {language === 'km'
                      ? '⚡ ម៉ូដអក្សរតាមសំឡេង (Word Sync)'
                      : '⚡ Spoken Word Sync Style'}
                  </span>
                </div>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-900/50 text-purple-300 font-mono border border-purple-700/50">
                  VIRAL TIKTOK
                </span>
              </div>

              {/* Mode Options */}
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  {
                    id: 'word-highlight',
                    nameKm: '🌟 រំលេចពាក្យ (Highlight)',
                    nameEn: '🌟 Word Highlight',
                    descKm: 'ពាក្យកំពុងនិយាយរីកធំ និងរំលេចពណ៌',
                  },
                  {
                    id: 'word-by-word',
                    nameKm: '⚡ ម្ដងមួយពាក្យ (Reveal)',
                    nameEn: '⚡ Word-by-Word',
                    descKm: 'លេចចេញពាក្យម្ដងមួយៗតាមសំឡេង',
                  },
                  {
                    id: 'word-bounce',
                    nameKm: '🎈 លោតតាមពាក្យ (Bounce)',
                    nameEn: '🎈 Word Bounce',
                    descKm: 'ពាក្យកំពុងនិយាយលោតធំឡើង',
                  },
                  {
                    id: 'none',
                    nameKm: '📄 ពេញប្រយោគ (Static)',
                    nameEn: '📄 Static Full',
                    descKm: 'បង្ហាញអក្សរពេញប្រយោគធម្មតា',
                  },
                ].map((mode) => {
                  const isSel = wordStyle === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => handleSelectWordStyle(mode.id as WordAnimationStyle)}
                      className={`p-1.5 rounded-md text-left transition cursor-pointer border ${
                        isSel
                          ? 'bg-purple-600/30 border-purple-400 text-white shadow-sm'
                          : 'bg-[#181a29] border-[#25283c] text-gray-400 hover:text-gray-200 hover:border-gray-600'
                      }`}
                    >
                      <div className="font-bold text-[11px] truncate">
                        {language === 'km' ? mode.nameKm : mode.nameEn}
                      </div>
                      <div className="text-[9px] text-gray-500 truncate mt-0.5">
                        {mode.descKm}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Highlight Color Swatches */}
              {wordStyle !== 'none' && (
                <div className="pt-1 flex items-center justify-between">
                  <span className="text-[10px] text-gray-400">
                    {language === 'km' ? 'ពណ៌ពាក្យកំពុងនិយាយ:' : 'Highlight Color:'}
                  </span>
                  <div className="flex items-center space-x-1.5">
                    {[
                      { color: '#ffe600', name: 'Yellow' },
                      { color: '#22c55e', name: 'Green' },
                      { color: '#06b6d4', name: 'Cyan' },
                      { color: '#ec4899', name: 'Pink' },
                      { color: '#f97316', name: 'Orange' },
                    ].map((swatch) => (
                      <button
                        key={swatch.color}
                        type="button"
                        onClick={() => handleSelectHighlightColor(swatch.color)}
                        className={`w-5 h-5 rounded-full transition cursor-pointer border-2 ${
                          highlightColor === swatch.color
                            ? 'border-white scale-110 shadow-md ring-1 ring-purple-400'
                            : 'border-transparent opacity-70 hover:opacity-100 hover:scale-105'
                        }`}
                        style={{ backgroundColor: swatch.color }}
                        title={swatch.name}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* 1-Click apply to all existing captions if any */}
              {currentTextClips.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    onApplyStyleToAllCaptions({
                      wordStyle,
                      highlightColor,
                    })
                  }
                  className="w-full py-1 rounded bg-purple-700/30 hover:bg-purple-700/50 text-purple-200 border border-purple-500/40 text-[10px] font-bold flex items-center justify-center space-x-1 transition cursor-pointer"
                >
                  <Wand2 className="w-3 h-3 text-yellow-300" />
                  <span>
                    {language === 'km'
                      ? '✨ អនុវត្តម៉ូដពាក្យមួយៗលើ Subtitles ទាំងអស់'
                      : '✨ Apply Word-by-Word to All Subtitles'}
                  </span>
                </button>
              )}
            </div>

            {/* Hint / Topic context */}
            <div>
              <input
                type="text"
                value={topicHint}
                onChange={(e) => setTopicHint(e.target.value)}
                placeholder={language === 'km' ? 'ពាក្យគន្លឹះ ឬប្រធានបទវីដេអូ (ស្រេចចិត្ត)...' : 'Topic hint or keywords (optional)...'}
                className="w-full bg-[#12131d] border border-[#27293d] rounded-lg px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Success Notice if generated */}
            {successCaptionNotice && (
              <div className="p-2 bg-emerald-950/40 border border-emerald-500/40 rounded text-emerald-300 text-[10.5px] flex items-center gap-1.5 animate-fadeIn">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{successCaptionNotice}</span>
              </div>
            )}

            {/* Generate Action Button */}
            <button
              onClick={handleGenerateAutoCaptions}
              disabled={isGenerating}
              className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 active:scale-[0.99] text-white rounded-lg font-bold flex items-center justify-center space-x-2 shadow-lg shadow-cyan-950/50 transition cursor-pointer"
            >
              <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>
                {isGenerating
                  ? language === 'km'
                    ? 'កំពុងបង្កើតចំណងជើងរង...'
                    : 'Generating Captions...'
                  : targetAudioClip?.ttsText
                  ? language === 'km'
                    ? '✨ បង្កើត Caption ពីសំឡេង AI Voice'
                    : '✨ Generate Captions from AI Voice'
                  : targetAudioClip?.type === 'audio'
                  ? language === 'km'
                    ? '✨ បង្កើត Caption ពីសំឡេង Audio'
                    : '✨ Generate Captions from Audio'
                  : t.generateAutoCaptions}
              </span>
            </button>
          </div>

          {/* Interactive CapCut Transcript & Subtitle List Editor */}
          <div className="bg-[#181a28] p-3 rounded-xl border border-[#26283d] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 font-bold text-gray-200">
                <FileText className="w-3.5 h-3.5 text-purple-400" />
                <span>{t.transcriptEditor}</span>
                <span className="text-[10px] text-cyan-400 font-mono bg-cyan-950 px-1.5 py-0.2 rounded border border-cyan-800">
                  {currentTextClips.length}
                </span>
              </div>

              {/* Add line */}
              <button
                onClick={handleAddNewSubtitleLine}
                className="flex items-center space-x-1 px-2 py-0.5 rounded bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 text-[10px] font-bold border border-cyan-500/40 transition cursor-pointer"
                title={t.addNewSubtitle}
              >
                <Plus className="w-3 h-3" />
                <span>{language === 'km' ? '+ បន្ថែមបន្ទាត់' : '+ Line'}</span>
              </button>
            </div>

            {/* Apply Style to All Subtitles Button */}
            {currentTextClips.length > 0 && (
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#141522] border border-[#282a40]">
                <div className="text-[11px] text-gray-300">
                  <span>{language === 'km' ? 'ម៉ូតបច្ចុប្បន្ន:' : 'Style:'}</span>{' '}
                  <span className="font-bold text-amber-400">{currentSelectedPreset.nameKm}</span>
                </div>
                <button
                  onClick={() => onApplyStyleToAllCaptions(currentSelectedPreset.config)}
                  className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-bold transition cursor-pointer flex items-center space-x-1"
                >
                  <Wand2 className="w-3 h-3" />
                  <span>{t.applyToAllCaptions}</span>
                </button>
              </div>
            )}

            {/* Search Filter */}
            {currentTextClips.length > 3 && (
              <div className="relative">
                <Search className="w-3 h-3 text-gray-500 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={language === 'km' ? 'ស្វែងរក Subtitle...' : 'Search captions...'}
                  className="w-full bg-[#12131d] border border-[#27293d] rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-cyan-500"
                />
              </div>
            )}

            {/* List of Subtitles with real-time text editing and timecode seeking */}
            {currentTextClips.length === 0 ? (
              <div className="p-4 text-center text-gray-500 border border-dashed border-[#292b3f] rounded-lg">
                <Type className="w-6 h-6 mx-auto mb-1.5 text-gray-600" />
                <p>{language === 'km' ? 'មិនទាន់មាន Subtitles លើ Timeline ទេ។ ចុចប៊ូតុង "បង្កើត Auto Captions" ខាងលើ។' : 'No captions on timeline yet. Click "Generate Auto Captions" above.'}</p>
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {filteredTextClips.map((clip, idx) => {
                  const isSelected = selectedClipId === clip.id;
                  const text = clip.textConfig?.text || clip.title;

                  return (
                    <div
                      key={clip.id}
                      onClick={() => onSelectClip(clip.id)}
                      className={`p-2 rounded-lg border transition ${
                        isSelected
                          ? 'border-cyan-400 bg-cyan-950/30 ring-1 ring-cyan-400'
                          : 'border-[#27293d] bg-[#141522] hover:bg-[#1a1c2d]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        {/* Timecode pill */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSeekToTime(clip.start);
                          }}
                          className="flex items-center space-x-1 text-[10px] font-mono text-cyan-400 hover:text-cyan-300 bg-[#0e1018] px-2 py-0.5 rounded border border-cyan-900/60 transition cursor-pointer"
                          title="Seek playhead to this caption"
                        >
                          <Play className="w-2.5 h-2.5 fill-cyan-400" />
                          <span>
                            {clip.start.toFixed(1)}s → {(clip.start + clip.duration).toFixed(1)}s
                          </span>
                        </button>

                        <div className="flex items-center space-x-1">
                          <span className="text-[10px] text-gray-500 font-mono">#{idx + 1}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteClip(clip.id);
                            }}
                            className="p-1 text-gray-500 hover:text-rose-400 transition cursor-pointer rounded"
                            title="Delete Subtitle Line"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Inline Editable Textarea */}
                      <textarea
                        value={text}
                        onChange={(e) => onUpdateClipText(clip.id, e.target.value)}
                        rows={2}
                        className="w-full bg-[#0d0e17] border border-[#25283c] hover:border-gray-600 focus:border-cyan-500 rounded p-1.5 text-xs text-gray-200 leading-relaxed resize-none focus:outline-none"
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sub-Tab 2: CapCut Caption Styles Gallery */}
      {subTab === 'styles' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <div className="font-bold text-gray-200 text-xs flex items-center space-x-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>{t.captionStyleGallery}</span>
              </div>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {language === 'km'
                  ? 'ចុចដើម្បីប្ដូរម៉ូតលើ Caption ឬអនុវត្តលើគ្រប់ Subtitles ទាំងអស់'
                  : 'Click to apply CapCut trending typography templates'}
              </p>
            </div>
          </div>

          {/* Apply to All Button Header */}
          {currentTextClips.length > 0 && (
            <button
              onClick={() => onApplyStyleToAllCaptions(currentSelectedPreset.config)}
              className="w-full py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-lg font-bold flex items-center justify-center space-x-1.5 shadow-md shadow-amber-950 transition cursor-pointer"
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>{language === 'km' ? `អនុវត្តម៉ូត ${currentSelectedPreset.nameKm} លើគ្រប់ Subtitles` : `Apply ${currentSelectedPreset.name} to All Captions`}</span>
            </button>
          )}

          {/* Cards List for All 10 CapCut Styles */}
          <div className="space-y-2.5">
            {CAPCUT_CAPTION_STYLES.map((style) => {
              const isSelectedPreset = selectedStyleId === style.id;

              return (
                <div
                  key={style.id}
                  onClick={() => {
                    handleSelectStyle(style.id);
                    if (currentTextClips.length > 0) {
                      onApplyStyleToAllCaptions({
                        ...style.config,
                        wordStyle,
                        highlightColor,
                      });
                    }
                  }}
                  className={`p-3 rounded-xl border transition cursor-pointer group ${
                    isSelectedPreset
                      ? 'border-amber-400/80 bg-[#1b1c2e] ring-1 ring-amber-400/60 shadow-lg'
                      : 'border-[#26283d] bg-[#161726] hover:bg-[#1a1b2d] hover:border-gray-500'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-xs text-gray-200 group-hover:text-amber-300 transition">
                      {language === 'km' ? style.nameKm : style.name}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded font-mono font-bold bg-[#24263b] text-gray-400 border border-[#31334c]">
                      {style.badge}
                    </span>
                  </div>

                  {/* High fidelity visual preview box */}
                  <div className="p-3 rounded-lg bg-[#0a0b12] border border-[#202235] flex items-center justify-center min-h-[50px] shadow-inner">
                    <div
                      className="font-bold text-sm tracking-wide px-2.5 py-1 rounded inline-block text-center"
                      style={{
                        color: style.config.color,
                        backgroundColor: style.config.backgroundColor,
                        fontFamily: style.config.fontFamily,
                        textShadow: style.config.strokeWidth > 0 ? `0 0 3px ${style.config.strokeColor}` : 'none',
                        boxShadow: style.config.shadowBlur ? `0 2px ${style.config.shadowBlur}px ${style.config.shadowColor}` : 'none',
                      }}
                    >
                      {style.previewText}
                    </div>
                  </div>

                  <p className="text-[10px] text-gray-400 mt-2 leading-relaxed">
                    {style.descriptionKm}
                  </p>

                  {/* Action buttons */}
                  <div className="mt-2.5 pt-2 border-t border-[#25273c] flex items-center justify-between space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedStyleId(style.id);
                        onAddTextClip(style.config, style.name);
                      }}
                      className="flex-1 py-1 px-2 rounded bg-[#202336] hover:bg-cyan-600 text-gray-300 hover:text-white text-[11px] font-semibold transition cursor-pointer flex items-center justify-center space-x-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{language === 'km' ? 'បន្ថែម Clip ថ្មី' : '+ Add Title'}</span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedStyleId(style.id);
                        onApplyStyleToAllCaptions(style.config);
                      }}
                      className="flex-1 py-1 px-2 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-semibold transition cursor-pointer flex items-center justify-center space-x-1"
                    >
                      <Wand2 className="w-3 h-3" />
                      <span>{language === 'km' ? 'ដាក់លើទាំងអស់' : 'Apply to All'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sub-Tab 3: Add Custom Title / Headline */}
      {subTab === 'addtitle' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
          <div className="p-3 bg-[#181a28] rounded-xl border border-[#27293d] space-y-3">
            <div className="font-bold text-gray-200 text-xs flex items-center space-x-1.5">
              <Type className="w-3.5 h-3.5 text-purple-400" />
              <span>{t.addTitle}</span>
            </div>

            <div>
              <label className="text-[11px] text-gray-400 block mb-1">
                {language === 'km' ? 'បញ្ចូលអត្ថបទចំណងជើង' : 'Headline Text'}
              </label>
              <textarea
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                rows={2}
                placeholder={t.defaultText}
                className="w-full bg-[#12131d] border border-[#27293d] rounded-lg p-2 text-xs text-gray-200 focus:outline-none focus:border-cyan-500 leading-relaxed"
              />
            </div>

            {/* Vertical Position Presets */}
            <div>
              <label className="text-[11px] text-gray-400 block mb-1">
                {language === 'km' ? 'ទីតាំងលើផ្ទាំងវីដេអូ' : 'Canvas Vertical Position'}
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setTitlePosition(25)}
                  className={`py-1 px-2 rounded text-center text-[11px] font-semibold border transition cursor-pointer ${
                    titlePosition === 25
                      ? 'bg-purple-600 text-white border-purple-500'
                      : 'bg-[#12131d] text-gray-400 border-[#27293d]'
                  }`}
                >
                  {language === 'km' ? 'ខាងលើ (Top)' : 'Top (25%)'}
                </button>
                <button
                  type="button"
                  onClick={() => setTitlePosition(50)}
                  className={`py-1 px-2 rounded text-center text-[11px] font-semibold border transition cursor-pointer ${
                    titlePosition === 50
                      ? 'bg-purple-600 text-white border-purple-500'
                      : 'bg-[#12131d] text-gray-400 border-[#27293d]'
                  }`}
                >
                  {language === 'km' ? 'កណ្ដាល (Center)' : 'Center (50%)'}
                </button>
                <button
                  type="button"
                  onClick={() => setTitlePosition(78)}
                  className={`py-1 px-2 rounded text-center text-[11px] font-semibold border transition cursor-pointer ${
                    titlePosition === 78
                      ? 'bg-purple-600 text-white border-purple-500'
                      : 'bg-[#12131d] text-gray-400 border-[#27293d]'
                  }`}
                >
                  {language === 'km' ? 'ខាងក្រោម (Subtitle)' : 'Bottom (78%)'}
                </button>
              </div>
            </div>

            {/* Title Animation Preset */}
            <div>
              <label className="text-[11px] text-gray-400 block mb-1">
                {language === 'km' ? 'ចលនាអក្សរ (Animation Preset)' : 'Animation Preset'}
              </label>
              <select
                value={titleAnimation}
                onChange={(e) => setTitleAnimation(e.target.value)}
                className="w-full bg-[#12131d] border border-[#27293d] rounded-lg p-2 text-xs text-gray-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="typewriter">⌨️ Typewriter (វាយអក្សរ)</option>
                <option value="spring-pop">⚡ Spring Pop (លោតស្ទុះ Elastic)</option>
                <option value="keyframe-zoom-in">🔍 Keyframe Zoom In (ពង្រីក)</option>
                <option value="keyframe-zoom-out">🔎 Keyframe Zoom Out (បង្រួម)</option>
                <option value="pop">💥 Pop Entrance (Viral Hook)</option>
                <option value="bounce">🔥 Kinetic Pulse (MrBeast)</option>
                <option value="slide-up">⬆️ Slide Up (រំកិលឡើង)</option>
                <option value="slide-left">➡️ Slide Left (រំកិលឆ្វេង)</option>
                <option value="glitch">⚡ Glitch Flash (ភ្លឹបភ្លែត)</option>
                <option value="fade">✨ Cinema Fade (រលាយចូល)</option>
                <option value="none">Static None</option>
              </select>
            </div>

            {/* Add Action Button */}
            <button
              onClick={() => {
                const chosenStyle = getCaptionStyleById(selectedStyleId);
                onAddTextClip(
                  {
                    ...chosenStyle.config,
                    text: customTitle,
                    yPercent: titlePosition,
                    animation: titleAnimation as any,
                    animationConfig: {
                      preset: titleAnimation as any,
                      duration: 0.6,
                      zoomStart: 1.0,
                      zoomEnd: 1.35,
                      typewriterSpeed: 20,
                      springTension: 1.2,
                    },
                  },
                  customTitle
                );
              }}
              className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg font-bold flex items-center justify-center space-x-1.5 shadow-lg transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t.addTitle}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
