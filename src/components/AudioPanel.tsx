import React, { useState, useRef } from 'react';
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
} from 'lucide-react';
import { MediaItem } from '../types/editor';
import { Language, translations } from '../utils/i18n';
import { generateWaveformPeaks } from '../utils/audioAnalysis';

interface AudioPanelProps {
  onAddAudioToTimeline: (item: MediaItem) => void;
  language: Language;
}

export const AudioPanel: React.FC<AudioPanelProps> = ({
  onAddAudioToTimeline,
  language,
}) => {
  const t = translations[language];
  const [activeCategory, setActiveCategory] = useState<'music' | 'sfx' | 'voiceover'>('voiceover');
  const [ttsText, setTtsText] = useState('សួស្ដីបងប្អូនទាំងអស់គ្នា សូមស្វាគមន៍មកកាន់វីដេអូថ្មី!');
  const [selectedVoice, setSelectedVoice] = useState<'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr'>('Kore');
  const [selectedStyle, setSelectedStyle] = useState<string>('Natural, friendly, and engaging storytelling');
  const [isSynthesizing, setIsSynthesizing] = useState<boolean>(false);
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  const [isRecordingMic, setIsRecordingMic] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Built-in Sound Library
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
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      duration: 1.5,
      category: 'sfx',
    },
    {
      id: 'sfx-pop',
      name: 'Bubble Pop / UI Click Ding',
      type: 'audio',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
      duration: 1.0,
      category: 'sfx',
    },
    {
      id: 'sfx-impact',
      name: 'Deep Bass Sub Impact Drop',
      type: 'audio',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4',
      duration: 2.5,
      category: 'sfx',
    },
    {
      id: 'sfx-shutter',
      name: 'Camera Shutter Snapshot',
      type: 'audio',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
      duration: 1.2,
      category: 'sfx',
    },
  ];

  // Gemini Voices definition
  const geminiVoices: { id: 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr'; name: string; gender: string; desc: string }[] = [
    { id: 'Kore', name: 'Kore', gender: language === 'km' ? 'ស្រី' : 'Female', desc: language === 'km' ? 'សំឡេងកក់ក្តៅ និងពិរោះ' : 'Warm, natural & friendly' },
    { id: 'Puck', name: 'Puck', gender: language === 'km' ? 'ប្រុស' : 'Male', desc: language === 'km' ? 'រស់រវើក មានថាមពល' : 'Energetic & upbeat creator' },
    { id: 'Charon', name: 'Charon', gender: language === 'km' ? 'ប្រុស' : 'Male', desc: language === 'km' ? 'សំឡេងធ្ងន់ និងអំណាច' : 'Deep, cinematic & calm' },
    { id: 'Fenrir', name: 'Fenrir', gender: language === 'km' ? 'ប្រុស' : 'Male', desc: language === 'km' ? 'ច្បាស់ និងទាក់ទាញ' : 'Crisp, articulate speaker' },
    { id: 'Zephyr', name: 'Zephyr', gender: language === 'km' ? 'ស្រី' : 'Female', desc: language === 'km' ? 'ស្រទន់ និងទន់ភ្លន់' : 'Gentle, soft & soothing' },
  ];

  const speechStyles = [
    { id: 'Natural, friendly, and engaging storytelling', label: language === 'km' ? 'ធម្មជាតិ រួសរាយ (Storytelling)' : 'Natural Storytelling' },
    { id: 'Excited TikTok and Reels creator with high energy', label: language === 'km' ? 'រស់រវើក បែប TikTok / Reels' : 'Energetic TikTok / Reel' },
    { id: 'Clear, professional news anchor tone', label: language === 'km' ? 'វិជ្ជាជីវៈ ច្បាស់លាស់ (Professional)' : 'Professional News' },
    { id: 'Calm, relaxed, and thoughtful podcast host', label: language === 'km' ? 'ស្រទន់ បែប Podcast' : 'Calm Podcast Host' },
  ];

  // Record Mic
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

  // Generate AI Voice using official Gemini 3.8 Flash Lite TTS
  const handleGenerateGeminiTTS = async () => {
    if (!ttsText.trim()) return;

    setIsSynthesizing(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/ai/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: ttsText.trim(),
          voiceName: selectedVoice,
          style: selectedStyle,
        }),
      });

      const data = await res.json();

      if (data.success && data.audioDataUrl) {
        setGeneratedAudioUrl(data.audioDataUrl);

        const wordCount = ttsText.trim().split(/\s+/).length;
        const dur = typeof data.duration === 'number' && data.duration > 0
          ? data.duration
          : Math.max(2.5, Math.min(30, Math.round(wordCount * 0.5 * 10) / 10));

        const ttsItem: MediaItem = {
          id: `gemini-tts-${Date.now()}`,
          name: `Gemini (${selectedVoice}): "${ttsText.slice(0, 18)}..."`,
          type: 'audio',
          url: data.audioDataUrl,
          duration: dur,
          category: 'voiceover',
          waveform: generateWaveformPeaks(Math.max(24, Math.floor(dur * 6))),
        };

        // Automatically insert into timeline directly per user requirement!
        onAddAudioToTimeline(ttsItem);
      } else {
        throw new Error(data.error || 'Gemini TTS generation failed');
      }
    } catch (err: any) {
      console.error('Gemini TTS error:', err);
      setErrorMessage(err.message || 'Gemini TTS error');
    } finally {
      setIsSynthesizing(false);
    }
  };

  const handleTogglePreviewPlay = () => {
    if (!generatedAudioUrl) return;

    if (!previewAudioRef.current) {
      const audio = new Audio(generatedAudioUrl);
      audio.onended = () => setIsPlayingPreview(false);
      previewAudioRef.current = audio;
    }

    if (isPlayingPreview) {
      previewAudioRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      previewAudioRef.current.currentTime = 0;
      previewAudioRef.current.play().then(() => {
        setIsPlayingPreview(true);
      }).catch(() => {});
    }
  };

  return (
    <div className="h-full flex flex-col p-3 text-xs bg-[#151620] overflow-y-auto space-y-3">
      {/* Category Tabs */}
      <div className="flex space-x-1 p-1 bg-[#12131c] rounded-md border border-[#232535]">
        <button
          onClick={() => setActiveCategory('voiceover')}
          className={`flex-1 py-1 rounded text-[11px] font-medium transition flex items-center justify-center gap-1 ${
            activeCategory === 'voiceover' ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <Radio className="w-3 h-3 text-pink-300" />
          <span>Gemini Voiceover</span>
        </button>

        <button
          onClick={() => setActiveCategory('music')}
          className={`flex-1 py-1 rounded text-[11px] font-medium transition flex items-center justify-center gap-1 ${
            activeCategory === 'music' ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <Music className="w-3 h-3" />
          <span>{t.musicTracks}</span>
        </button>

        <button
          onClick={() => setActiveCategory('sfx')}
          className={`flex-1 py-1 rounded text-[11px] font-medium transition flex items-center justify-center gap-1 ${
            activeCategory === 'sfx' ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <Volume2 className="w-3 h-3" />
          <span>{t.soundEffects}</span>
        </button>
      </div>

      {/* Voiceover & Gemini TTS Tab */}
      {activeCategory === 'voiceover' && (
        <div className="space-y-3">
          {/* Gemini AI Text to Speech Card */}
          <div className="p-3 bg-gradient-to-b from-[#1b192e] to-[#161726] rounded-xl border border-purple-500/30 space-y-3 shadow-md shadow-purple-950/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-gray-200 font-bold">
                <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center shadow-sm">
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
                <span>Generate AI Voice (TTS)</span>
              </div>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 uppercase tracking-wider">
                Gemini 3.8 TTS
              </span>
            </div>

            {/* Voice Model Selector */}
            <div>
              <label className="block text-[11px] text-gray-300 font-semibold mb-1">
                {language === 'km' ? 'ជ្រើសរើសសំឡេង Gemini Voice:' : 'Select Gemini Voice Persona:'}
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {geminiVoices.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setSelectedVoice(v.id)}
                    className={`p-2 rounded-lg border text-left transition flex flex-col justify-between ${
                      selectedVoice === v.id
                        ? 'bg-purple-600/30 border-purple-400 text-white shadow-sm'
                        : 'bg-[#12131f] border-[#292c42] text-gray-400 hover:text-gray-200 hover:bg-[#18192a]'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-bold text-xs text-white">{v.name}</span>
                      <span className="text-[9px] px-1 rounded bg-[#212338] text-gray-300">{v.gender}</span>
                    </div>
                    <span className="text-[10px] text-gray-400 line-clamp-1 mt-0.5">{v.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Speaking Style Selector */}
            <div>
              <label className="block text-[11px] text-gray-300 font-semibold mb-1">
                {language === 'km' ? 'ស្ទីលនិយាយ & អារម្មណ៍:' : 'Speaking Style & Emotion:'}
              </label>
              <select
                value={selectedStyle}
                onChange={(e) => setSelectedStyle(e.target.value)}
                className="w-full bg-[#12131f] border border-[#292c42] rounded-lg p-2 text-xs text-gray-200 focus:outline-none focus:border-purple-500"
              >
                {speechStyles.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Text Input */}
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

            {/* Error message banner if any */}
            {errorMessage && (
              <div className="p-2 bg-rose-950/40 border border-rose-500/40 rounded text-rose-300 text-[10px]">
                {errorMessage}
              </div>
            )}

            {/* Synthesize Button */}
            <button
              onClick={handleGenerateGeminiTTS}
              disabled={isSynthesizing || !ttsText.trim()}
              className="w-full py-2.5 bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-lg font-bold flex items-center justify-center gap-2 shadow-md shadow-purple-900/40 transition active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isSynthesizing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>{language === 'km' ? 'Gemini កំពុងបង្កើតសំឡេង...' : 'Synthesizing with Gemini TTS...'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-pink-200" />
                  <span>{language === 'km' ? '✨ បង្កើតសំឡេងជាមួយ Gemini TTS' : '✨ Synthesize with Gemini TTS'}</span>
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
                      {language === 'km' ? 'សំឡេងរួចរាល់' : 'Audio Ready'} ({selectedVoice})
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
                      const ttsItem: MediaItem = {
                        id: `gemini-tts-${Date.now()}`,
                        name: `Gemini (${selectedVoice}): "${ttsText.slice(0, 16)}..."`,
                        type: 'audio',
                        url: generatedAudioUrl,
                        duration: Math.max(3, Math.ceil(ttsText.split(' ').length * 0.45)),
                        category: 'voiceover',
                        waveform: generateWaveformPeaks(30),
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

              <button
                onClick={() => onAddAudioToTimeline(track)}
                className="p-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded shadow transition flex items-center gap-1"
                title={t.addToTimeline}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
