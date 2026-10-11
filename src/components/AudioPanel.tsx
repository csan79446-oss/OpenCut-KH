import React, { useState, useRef, useEffect } from 'react';
import {
  Music,
  Volume2,
  Mic,
  StopCircle,
  Sparkles,
  Plus,
  Play,
  Pause,
  Loader2,
  Radio,
  CheckCircle,
  Gauge,
  Languages,
  FileText,
  VolumeX,
  Zap,
  Flame,
  Palette,
  Check,
} from 'lucide-react';
import { MediaItem, SubtitleItem, TextConfig, WordAnimationStyle } from '../types/editor';
import { Language, translations } from '../utils/i18n';
import { generateWaveformPeaks } from '../utils/audioAnalysis';
import { soundEngine } from '../utils/soundEngine';
import { CAPCUT_CAPTION_STYLES, getCaptionStyleById } from '../utils/captionStyles';

interface AudioPanelProps {
  onAddAudioToTimeline: (item: MediaItem) => void;
  onAddVoiceoverToTimeline?: (
    item: MediaItem,
    subtitleText?: string,
    styleConfig?: TextConfig
  ) => void;
  onAddSubtitlesToTimeline?: (subtitles: SubtitleItem[], styleConfig?: TextConfig) => void;
  currentTime?: number;
  language: Language;
  activeCaptionStyleId?: string;
  activeWordStyle?: WordAnimationStyle;
  activeHighlightColor?: string;
  onUpdateCaptionStyle?: (
    styleId: string,
    wordStyle?: WordAnimationStyle,
    highlightColor?: string
  ) => void;
}

export const AudioPanel: React.FC<AudioPanelProps> = ({
  onAddAudioToTimeline,
  onAddVoiceoverToTimeline,
  onAddSubtitlesToTimeline,
  currentTime = 0,
  language,
  activeCaptionStyleId,
  activeWordStyle,
  activeHighlightColor,
  onUpdateCaptionStyle,
}) => {
  const t = translations[language];
  const [activeCategory, setActiveCategory] = useState<'voiceover' | 'music' | 'sfx'>('voiceover');

  // TTS State
  const [ttsText, setTtsText] = useState('សួស្ដីបងប្អូនទាំងអស់គ្នា សូមស្វាគមន៍មកកាន់វីដេអូថ្មី!');
  const [selectedVoice, setSelectedVoice] = useState<string>('km-female');
  const [selectedLang, setSelectedLang] = useState<'auto' | 'km' | 'en'>('auto');
  const [speedRate, setSpeedRate] = useState<number>(1.0);
  const [isSynthesizing, setIsSynthesizing] = useState<boolean>(false);
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
  const [generatedDuration, setGeneratedDuration] = useState<number>(0);
  const [isPlayingPreview, setIsPlayingPreview] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);

  // Caption Styling State (Word-by-word, highlight color, and style presets)
  const [captionStyleId, setCaptionStyleId] = useState<string>(activeCaptionStyleId || 'alex-hormozi-word');
  const [wordStyle, setWordStyle] = useState<WordAnimationStyle>(activeWordStyle || 'word-by-word');
  const [highlightColor, setHighlightColor] = useState<string>(activeHighlightColor || '#ffe600');

  useEffect(() => {
    if (activeCaptionStyleId) setCaptionStyleId(activeCaptionStyleId);
  }, [activeCaptionStyleId]);

  useEffect(() => {
    if (activeWordStyle) setWordStyle(activeWordStyle);
  }, [activeWordStyle]);

  useEffect(() => {
    if (activeHighlightColor) setHighlightColor(activeHighlightColor);
  }, [activeHighlightColor]);

  const handleCaptionStyleChange = (id: string) => {
    setCaptionStyleId(id);
    onUpdateCaptionStyle?.(id, wordStyle, highlightColor);
  };

  const handleWordStyleChange = (ws: WordAnimationStyle) => {
    setWordStyle(ws);
    onUpdateCaptionStyle?.(captionStyleId, ws, highlightColor);
  };

  const handleHighlightColorChange = (c: string) => {
    setHighlightColor(c);
    onUpdateCaptionStyle?.(captionStyleId, wordStyle, c);
  };

  const buildCaptionTextConfig = (textToUse: string): TextConfig => {
    const preset = getCaptionStyleById(captionStyleId);
    return {
      ...preset.config,
      text: textToUse.trim(),
      wordStyle,
      animation: wordStyle as any,
      highlightColor,
      stylePreset: captionStyleId,
      isCaption: true,
    };
  };

  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Mic recording
  const [isRecordingMic, setIsRecordingMic] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Sound Library
  const musicTracks: MediaItem[] = [
    {
      id: 'music-phonk',
      name: 'Cyber Energy Phonk (130 BPM)',
      type: 'audio',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
      duration: 25,
      category: 'music',
    },
    {
      id: 'music-lofi',
      name: 'Chill Rainy Afternoon Lofi',
      type: 'audio',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
      duration: 30,
      category: 'music',
    },
    {
      id: 'music-upbeat',
      name: 'Commercial Tech Pop Beats',
      type: 'audio',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      duration: 15,
      category: 'music',
    },
  ];

  const soundEffects: MediaItem[] = [
    {
      id: 'sfx-whoosh',
      name: 'Cinematic Fast Whoosh Transition',
      type: 'audio',
      url: 'sfx:whoosh',
      duration: 1.2,
      category: 'sfx',
    },
    {
      id: 'sfx-pop',
      name: 'Bubble Pop / UI Click Ding',
      type: 'audio',
      url: 'sfx:pop',
      duration: 0.35,
      category: 'sfx',
    },
    {
      id: 'sfx-impact',
      name: 'Deep Bass Sub Impact Drop',
      type: 'audio',
      url: 'sfx:impact',
      duration: 1.8,
      category: 'sfx',
    },
    {
      id: 'sfx-shutter',
      name: 'Camera Shutter Snapshot',
      type: 'audio',
      url: 'sfx:shutter',
      duration: 0.6,
      category: 'sfx',
    },
  ];

  // Voice Personas (Khmer Natural + English/Gemini)
  const voicePersonas = [
    {
      id: 'km-female',
      geminiVoice: 'Kore',
      name: language === 'km' ? 'ស្រី Mom (ខ្មែរ)' : 'Srey Mom (Khmer)',
      gender: language === 'km' ? 'ស្រី' : 'Female',
      lang: 'km',
      desc: language === 'km' ? 'សំឡេងធម្មជាតិ រួសរាយ និងកក់ក្តៅ' : 'Natural, warm & friendly Khmer',
      badge: 'Khmer Natural',
    },
    {
      id: 'km-male',
      geminiVoice: 'Puck',
      name: language === 'km' ? 'ប្រុស Dara (ខ្មែរ)' : 'Dara (Khmer)',
      gender: language === 'km' ? 'ប្រុស' : 'Male',
      lang: 'km',
      desc: language === 'km' ? 'ស្វាហាប់ ច្បាស់លាស់ និងទាក់ទាញ' : 'Upbeat, clear & confident Khmer',
      badge: 'Khmer Upbeat',
    },
    {
      id: 'km-news',
      geminiVoice: 'Charon',
      name: language === 'km' ? 'អានព័ត៌មាន (ខ្មែរ)' : 'News Anchor (Khmer)',
      gender: language === 'km' ? 'ផ្លូវការ' : 'Formal',
      lang: 'km',
      desc: language === 'km' ? 'វិជ្ជាជីវៈ សុជីវធម៌ និងច្បាស់ក្បោះក្បាយ' : 'Professional, articulate & formal',
      badge: 'Khmer Formal',
    },
    {
      id: 'Kore',
      geminiVoice: 'Kore',
      name: 'Kore',
      gender: language === 'km' ? 'ស្រី' : 'Female',
      lang: 'en',
      desc: language === 'km' ? 'សំឡេងកក់ក្តៅ Gemini Voice' : 'Warm, natural & expressive',
      badge: 'Gemini AI',
    },
    {
      id: 'Puck',
      geminiVoice: 'Puck',
      name: 'Puck',
      gender: language === 'km' ? 'ប្រុស' : 'Male',
      lang: 'en',
      desc: language === 'km' ? 'រស់រវើក មានថាមពល TikTok' : 'Energetic, punchy TikTok creator',
      badge: 'Gemini AI',
    },
    {
      id: 'Charon',
      geminiVoice: 'Charon',
      name: 'Charon',
      gender: language === 'km' ? 'ប្រុស' : 'Male',
      lang: 'en',
      desc: language === 'km' ? 'សំឡេងធ្ងន់ បែបភាពយន្ត' : 'Deep, cinematic & calm authority',
      badge: 'Gemini AI',
    },
    {
      id: 'Fenrir',
      geminiVoice: 'Fenrir',
      name: 'Fenrir',
      gender: language === 'km' ? 'ប្រុស' : 'Male',
      lang: 'en',
      desc: language === 'km' ? 'ច្បាស់លាស់ និងរហ័សរហួន' : 'Crisp, articulate speaker',
      badge: 'Gemini AI',
    },
    {
      id: 'Zephyr',
      geminiVoice: 'Zephyr',
      name: 'Zephyr',
      gender: language === 'km' ? 'ស្រី' : 'Female',
      lang: 'en',
      desc: language === 'km' ? 'ស្រទន់ ទន់ភ្លន់ បែប Podcast' : 'Gentle, soft & soothing podcast',
      badge: 'Gemini AI',
    },
  ];

  // Quick Preset Scripts
  const presetScripts = [
    {
      label: language === 'km' ? 'ឃ្លាបើកឆាក (Hook)' : 'Intro Hook',
      text: 'សួស្ដីបងប្អូនទាំងអស់គ្នា សូមស្វាគមន៍មកកាន់វីដេអូថ្មី!',
    },
    {
      label: language === 'km' ? 'ណែនាំផលិតផល' : 'Product Review',
      text: 'ថ្ងៃនេះខ្ញុំនឹងបង្ហាញផលិតផលមួយដែលប្លែក និងពេញនិយមខ្លាំងនៅលើទីផ្សារ!',
    },
    {
      label: language === 'km' ? 'សេចក្ដីបញ្ចប់ (CTA)' : 'Call to Action',
      text: 'កុំភ្លេចចុច Like, Share និង Follow ដើម្បីទទួលបានវីដេអូថ្មីៗបន្តទៀត!',
    },
    {
      label: 'English Reel',
      text: 'Welcome back guys! Today we are testing this game-changing video editing trick!',
    },
  ];

  // Start / Stop Microphone Recording
  const startMicRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        const voiceItem: MediaItem = {
          id: `voice-${Date.now()}`,
          name: `Voiceover ${new Date().toLocaleTimeString()}`,
          type: 'audio',
          url,
          duration: 8,
          category: 'voiceover',
        };
        onAddAudioToTimeline(voiceItem);
        stream.getTracks().forEach((track) => track.stop());
        setIsRecordingMic(false);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecordingMic(true);
    } catch (err: any) {
      console.warn('Mic error:', err);
      setErrorMessage(language === 'km' ? 'មិនអាចបើក Microphone បានទេ' : 'Could not access microphone.');
      setIsRecordingMic(false);
    }
  };

  const stopMicRecording = () => {
    if (mediaRecorderRef.current && isRecordingMic) {
      mediaRecorderRef.current.stop();
    }
  };

  // Helper to accurately measure audio duration in browser
  const measureAudioDuration = (audioUrl: string, fallbackSec: number): Promise<number> => {
    return new Promise((resolve) => {
      const audio = new Audio(audioUrl);
      const timer = setTimeout(() => {
        resolve(fallbackSec);
      }, 2000);

      audio.onloadedmetadata = () => {
        clearTimeout(timer);
        if (audio.duration && isFinite(audio.duration) && audio.duration > 0) {
          resolve(Math.round(audio.duration * 10) / 10);
        } else {
          resolve(fallbackSec);
        }
      };

      audio.onerror = () => {
        clearTimeout(timer);
        resolve(fallbackSec);
      };
    });
  };

  // Generate AI Voice (TTS)
  const handleGenerateTTS = async () => {
    if (!ttsText.trim()) return;

    setIsSynthesizing(true);
    setErrorMessage(null);
    setSuccessInfo(null);

    // Stop any ongoing preview
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      setIsPlayingPreview(false);
    }

    try {
      const selectedPersona = voicePersonas.find((v) => v.id === selectedVoice);
      const requestLang = selectedLang === 'auto'
        ? (selectedPersona?.lang || 'auto')
        : selectedLang;

      const res = await fetch('/api/ai/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: ttsText.trim(),
          voiceName: selectedPersona?.id || 'km-female',
          geminiVoice: selectedPersona?.geminiVoice || 'Kore',
          style: selectedPersona?.desc || 'Natural, clear and engaging',
          language: requestLang,
          speedRate: speedRate,
        }),
      });

      const data = await res.json();

      if (data.success && data.audioDataUrl) {
        // Measure real exact duration
        const accurateDur = await measureAudioDuration(
          data.audioDataUrl,
          data.duration || Math.max(2, Math.round(ttsText.trim().split(/\s+/).length * 0.45 * 10) / 10)
        );

        setGeneratedAudioUrl(data.audioDataUrl);
        setGeneratedDuration(accurateDur);

        const voiceTitle = selectedPersona?.name || data.voiceName || 'AI Voice';
        const ttsItem: MediaItem = {
          id: `ai-voice-${Date.now()}`,
          name: `${voiceTitle}: "${ttsText.slice(0, 24)}..."`,
          type: 'audio',
          url: data.audioDataUrl,
          duration: accurateDur,
          category: 'voiceover',
          ttsText: ttsText.trim(),
          waveform: generateWaveformPeaks(Math.max(24, Math.floor(accurateDur * 6))),
        };

        // Add ONLY the audio clip to Audio Track on timeline as requested
        onAddAudioToTimeline(ttsItem);

        setSuccessInfo(
          language === 'km'
            ? `បានបង្កើតសំឡេង AI Voice (${accurateDur}s) និងដាក់លើ Audio Track រួចរាល់!`
            : `Synthesized AI Voice (${accurateDur}s) and added to Audio Track!`
        );
      } else {
        throw new Error(data.error || 'TTS generation failed');
      }
    } catch (err: any) {
      console.error('TTS error:', err);
      setErrorMessage(
        err.message ||
          (language === 'km'
            ? 'មានបញ្ហាក្នុងការបង្កើតសំឡេង សូមសាកល្បងម្ដងទៀត'
            : 'Error generating audio. Please try again.')
      );
    } finally {
      setIsSynthesizing(false);
    }
  };

  // Preview Playback
  const handleTogglePreviewPlay = () => {
    if (!generatedAudioUrl) return;

    if (!previewAudioRef.current) {
      const audio = new Audio(generatedAudioUrl);
      audio.onended = () => setIsPlayingPreview(false);
      previewAudioRef.current = audio;
    } else {
      if (previewAudioRef.current.src !== generatedAudioUrl) {
        previewAudioRef.current.src = generatedAudioUrl;
      }
    }

    if (isPlayingPreview) {
      previewAudioRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      previewAudioRef.current.currentTime = 0;
      previewAudioRef.current
        .play()
        .then(() => {
          setIsPlayingPreview(true);
        })
        .catch(() => {
          setIsPlayingPreview(false);
        });
    }
  };

  return (
    <div className="h-full flex flex-col p-3 text-xs bg-[#151620] overflow-y-auto space-y-3">
      {/* Category Tabs */}
      <div className="flex space-x-1 p-1 bg-[#12131c] rounded-lg border border-[#232535]">
        <button
          onClick={() => setActiveCategory('voiceover')}
          className={`flex-1 py-1.5 px-2 rounded-md text-[11px] font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeCategory === 'voiceover'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-gray-400 hover:text-gray-200 hover:bg-[#1a1b28]'
          }`}
          title={language === 'km' ? 'សំឡេង AI Voiceover / TTS' : 'AI Voiceover & Speech'}
        >
          <Radio className="w-3.5 h-3.5 text-pink-300 shrink-0" />
          <span className="truncate">AI Voiceover</span>
        </button>

        <button
          onClick={() => setActiveCategory('music')}
          className={`flex-1 py-1.5 px-2 rounded-md text-[11px] font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeCategory === 'music'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-gray-400 hover:text-gray-200 hover:bg-[#1a1b28]'
          }`}
          title={language === 'km' ? 'បទភ្លេងផ្ទៃខាងក្រោយ (BGM)' : 'Background Music'}
        >
          <Music className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
          <span className="truncate">{language === 'km' ? 'បទភ្លេង' : 'Music'}</span>
        </button>

        <button
          onClick={() => setActiveCategory('sfx')}
          className={`flex-1 py-1.5 px-2 rounded-md text-[11px] font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeCategory === 'sfx'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-gray-400 hover:text-gray-200 hover:bg-[#1a1b28]'
          }`}
          title={language === 'km' ? 'សំឡេង Sound Effects (SFX)' : 'Sound Effects'}
        >
          <Volume2 className="w-3.5 h-3.5 text-amber-300 shrink-0" />
          <span className="truncate">Sound Effects</span>
        </button>
      </div>

      {/* Voiceover & AI TTS Tab */}
      {activeCategory === 'voiceover' && (
        <div className="space-y-3">
          {/* AI Text-to-Speech Card */}
          <div className="p-3 bg-gradient-to-b from-[#1b192e] to-[#161726] rounded-xl border border-purple-500/30 space-y-3 shadow-md shadow-purple-950/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-gray-200 font-bold">
                <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center shadow-sm">
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
                <span>Generate AI Voice (TTS)</span>
              </div>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase tracking-wider">
                Natural Speech
              </span>
            </div>

            {/* Language & Speed Row */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-gray-300 font-semibold mb-1 flex items-center gap-1">
                  <Languages className="w-3 h-3 text-purple-400" />
                  <span>{language === 'km' ? 'ភាសា:' : 'Language:'}</span>
                </label>
                <select
                  value={selectedLang}
                  onChange={(e) => setSelectedLang(e.target.value as any)}
                  className="w-full bg-[#12131f] border border-[#292c42] rounded-lg p-1.5 text-xs text-gray-200 focus:outline-none focus:border-purple-500"
                >
                  <option value="auto">{language === 'km' ? '✨ ស្វ័យប្រវត្តិ (Auto)' : '✨ Auto-Detect'}</option>
                  <option value="km">🇰🇭 ភាសាខ្មែរ (Khmer)</option>
                  <option value="en">🇺🇸 English</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-gray-300 font-semibold mb-1 flex items-center gap-1">
                  <Gauge className="w-3 h-3 text-pink-400" />
                  <span>{language === 'km' ? 'ល្បឿននិយាយ:' : 'Speed Rate:'}</span>
                </label>
                <select
                  value={speedRate}
                  onChange={(e) => setSpeedRate(parseFloat(e.target.value))}
                  className="w-full bg-[#12131f] border border-[#292c42] rounded-lg p-1.5 text-xs text-gray-200 focus:outline-none focus:border-purple-500"
                >
                  <option value={0.8}>0.8x ({language === 'km' ? 'យឺត' : 'Slow'})</option>
                  <option value={1.0}>1.0x ({language === 'km' ? 'ធម្មតា' : 'Normal'})</option>
                  <option value={1.2}>1.2x ({language === 'km' ? 'លឿនបន្តិច' : 'Brisk'})</option>
                  <option value={1.4}>1.4x ({language === 'km' ? 'លឿន TikTok' : 'Fast TikTok'})</option>
                </select>
              </div>
            </div>

            {/* Voice Persona Selector */}
            <div>
              <label className="block text-[11px] text-gray-300 font-semibold mb-1">
                {language === 'km' ? 'ជ្រើសរើសសំឡេង Voice Persona:' : 'Select Voice Persona:'}
              </label>
              <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-0.5">
                {voicePersonas.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => {
                      setSelectedVoice(v.id);
                      if (v.lang === 'km') setSelectedLang('km');
                      else if (v.lang === 'en') setSelectedLang('en');
                    }}
                    className={`p-2 rounded-lg border text-left transition flex flex-col justify-between cursor-pointer ${
                      selectedVoice === v.id
                        ? 'bg-purple-600/30 border-purple-400 text-white shadow-sm ring-1 ring-purple-400/50'
                        : 'bg-[#12131f] border-[#292c42] text-gray-400 hover:text-gray-200 hover:bg-[#18192a]'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-bold text-xs text-white truncate">{v.name}</span>
                      <span className="text-[9px] px-1 py-0.2 rounded bg-[#212338] text-gray-300">
                        {v.gender}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-400 line-clamp-1 mt-0.5">{v.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Preset Scripts */}
            <div>
              <label className="block text-[10px] text-gray-400 font-semibold mb-1 flex items-center gap-1">
                <FileText className="w-3 h-3 text-purple-400" />
                <span>{language === 'km' ? 'ឃ្លាគំរូរហ័ស (Quick Templates):' : 'Quick Script Presets:'}</span>
              </label>
              <div className="flex flex-wrap gap-1">
                {presetScripts.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setTtsText(p.text)}
                    className="px-2 py-1 rounded bg-[#181928] hover:bg-[#25273e] text-[10px] text-gray-300 border border-[#2a2d42] transition cursor-pointer"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Script Text Input */}
            <div>
              <label className="block text-[11px] text-gray-300 font-semibold mb-1">
                {language === 'km' ? 'បញ្ចូលអត្ថបទដែលត្រូវនិយាយ:' : 'Script text to synthesize:'}
              </label>
              <textarea
                value={ttsText}
                onChange={(e) => setTtsText(e.target.value)}
                rows={3}
                placeholder={t.enterVoiceText}
                className="w-full bg-[#12131f] border border-[#2a2c42] rounded-lg p-2.5 text-xs text-gray-100 font-medium focus:outline-none focus:border-purple-500 transition leading-relaxed"
              />
            </div>

            {/* Direct Audio Track Placement Information */}
            <div className="p-2.5 bg-[#12131f] rounded-lg border border-purple-500/25 flex items-start space-x-2 text-[10.5px] text-gray-300">
              <FileText className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                {language === 'km'
                  ? '💡 សំឡេង AI Voice នឹងដាក់លើ Audio Track ដោយស្វ័យប្រវត្តិ។ ដើម្បីបង្កើត Subtitle/Auto Caption ចេញពីសំឡេងនេះ សូមចូលទៅផ្ទាំង "Text" រួចចុច "Generate Auto Caption"។'
                  : '💡 Generated AI Voice will be added directly to Audio Track. To generate captions from this voice, head to the "Text" panel and click "Generate Auto Caption".'}
              </p>
            </div>

            {/* Success info if generated */}
            {successInfo && (
              <div className="p-2 bg-emerald-950/40 border border-emerald-500/40 rounded text-emerald-300 text-[10px] flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{successInfo}</span>
              </div>
            )}

            {/* Error message banner if any */}
            {errorMessage && (
              <div className="p-2 bg-rose-950/40 border border-rose-500/40 rounded text-rose-300 text-[10px]">
                {errorMessage}
              </div>
            )}

            {/* Synthesize Button */}
            <button
              onClick={handleGenerateTTS}
              disabled={isSynthesizing || !ttsText.trim()}
              className="w-full py-2.5 bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-lg font-bold flex items-center justify-center gap-2 shadow-md shadow-purple-900/40 transition active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isSynthesizing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>
                    {language === 'km'
                      ? 'កំពុងបង្កើតសំឡេងធម្មជាតិ...'
                      : 'Synthesizing natural voice...'}
                  </span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-pink-200" />
                  <span>
                    {language === 'km'
                      ? '✨ បង្កើតសំឡេងធម្មជាតិ (Generate AI Voice)'
                      : '✨ Generate Natural AI Voice'}
                  </span>
                </>
              )}
            </button>

            {/* Audio Preview if generated */}
            {generatedAudioUrl && (
              <div className="p-2.5 bg-[#12131f] rounded-lg border border-purple-500/40 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-[11px] text-gray-200 font-medium">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>
                      {language === 'km' ? 'សំឡេងរួចរាល់' : 'Audio Ready'} ({generatedDuration}s)
                    </span>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-fuchsia-500/20 text-fuchsia-300 font-semibold border border-fuchsia-500/30">
                    Track A2 (Voiceover)
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleTogglePreviewPlay}
                    className="flex-1 py-1.5 rounded bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-medium flex items-center justify-center gap-1 transition cursor-pointer"
                  >
                    {isPlayingPreview ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                    <span>{isPlayingPreview ? 'Pause' : 'Play Preview'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const selectedPersona = voicePersonas.find((v) => v.id === selectedVoice);
                      const ttsItem: MediaItem = {
                        id: `ai-voice-${Date.now()}`,
                        name: `${selectedPersona?.name || 'Voice'}: "${ttsText.slice(0, 24)}..."`,
                        type: 'audio',
                        url: generatedAudioUrl,
                        duration: generatedDuration || 4,
                        category: 'voiceover',
                        ttsText: ttsText.trim(),
                        waveform: generateWaveformPeaks(Math.max(24, Math.floor((generatedDuration || 4) * 6))),
                      };
                      onAddAudioToTimeline(ttsItem);
                    }}
                    className="flex-1 py-1.5 rounded bg-[#202238] hover:bg-fuchsia-600/30 text-fuchsia-200 border border-fuchsia-500/40 text-[11px] font-medium flex items-center justify-center gap-1 transition cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>{language === 'km' ? 'ដាក់ចូល Timeline' : 'Add to Timeline'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mic Recorder Alternative */}
          <div className="p-3 bg-[#1a1b28] rounded-xl border border-[#282a40] space-y-2 text-center">
            <div className="text-gray-200 font-semibold">{t.recordVoiceover}</div>
            <p className="text-[10px] text-gray-400">
              {language === 'km'
                ? 'ថតបញ្ចូលសំឡេងអត្ថាធិប្បាយរបស់អ្នកផ្ទាល់តាមរយៈមីក្រូហ្វូន'
                : 'Record your real voice narration directly into the timeline.'}
            </p>
            <button
              onClick={isRecordingMic ? stopMicRecording : startMicRecording}
              className={`w-full py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                isRecordingMic
                  ? 'bg-rose-500 hover:bg-rose-600 text-white animate-pulse'
                  : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white'
              }`}
            >
              {isRecordingMic ? (
                <>
                  <StopCircle className="w-4 h-4" />
                  <span>{t.stopRecording}</span>
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4" />
                  <span>{t.recordVoiceover}</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Music / SFX Items List */}
      {activeCategory !== 'voiceover' && (
        <div className="space-y-2">
          {(activeCategory === 'music' ? musicTracks : soundEffects).map((track) => (
            <div
              key={track.id}
              className="p-2.5 bg-[#1a1b28] hover:bg-[#212334] rounded-lg border border-[#27293d] flex items-center justify-between group transition"
            >
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded bg-[#12131e] flex items-center justify-center text-purple-400 shrink-0">
                  <Music className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-gray-200 font-medium text-xs group-hover:text-purple-300">
                    {track.name}
                  </div>
                  <div className="text-[10px] text-gray-400">{track.duration}s</div>
                </div>
              </div>

              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={() => {
                    if (track.category === 'sfx') {
                      const effectType = track.id.replace('sfx-', '') as any;
                      soundEngine.playEffect(effectType, 0.9);
                    } else if (track.url) {
                      const audio = new Audio(track.url);
                      audio.play().catch(() => {});
                    }
                  }}
                  className="p-1.5 bg-[#25283c] hover:bg-purple-600/40 text-gray-300 hover:text-white rounded transition flex items-center gap-1 cursor-pointer"
                  title={language === 'km' ? 'ចាក់ស្តាប់សាកល្បង' : 'Preview Sound'}
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                </button>

                <button
                  onClick={() => onAddAudioToTimeline(track)}
                  className="p-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded shadow transition flex items-center gap-1 cursor-pointer"
                  title={t.addToTimeline}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
