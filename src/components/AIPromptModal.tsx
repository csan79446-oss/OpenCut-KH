import React, { useState } from 'react';
import {
  Sparkles,
  X,
  Wand2,
  Film,
  Loader2,
  CheckCircle,
} from 'lucide-react';
import { Language, translations } from '../utils/i18n';

interface AIPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyProjectPlan: (plan: any) => void;
  language: Language;
}

export const AIPromptModal: React.FC<AIPromptModalProps> = ({
  isOpen,
  onClose,
  onApplyProjectPlan,
  language,
}) => {
  const t = translations[language];
  const [promptText, setPromptText] = useState(
    language === 'km'
      ? 'វីដេអូខ្លី TikTok បង្ហាញពីបច្ចេកវិទ្យា AI Video Editing និងភាពងាយស្រួលនៃការប្រើប្រាស់'
      : 'Short viral TikTok showcasing AI Video Editing features, high energy beats, and jump cuts'
  );
  const [targetDuration, setTargetDuration] = useState(15);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/ai/script-to-timeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promptText,
          targetDuration,
          language,
        }),
      });
      const data = await res.json();
      if (data.success && data.project) {
        onApplyProjectPlan(data.project);
        onClose();
      }
    } catch (err) {
      console.error('AI Project Generation error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const sampleIdeas = [
    language === 'km'
      ? 'វីដេអូ Review ឧបករណ៍បច្ចេកវិទ្យាស្មាតហ្វូនចុងក្រោយ'
      : 'Tech review of the newest flagship smartphone',
    language === 'km'
      ? 'វីដេអូដំណើរកម្សាន្តខេត្តសៀមរាប និងប្រាសាទបុរាណ'
      : 'Epic travel vlog to Angkor Wat with cinematic transitions',
    language === 'km'
      ? 'វីដេអូលើកទឹកចិត្ត Fitness Workout ខ្លី 15 វិនាទី'
      : 'High-energy 15s gym fitness workout reel',
  ];

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[#141522] border border-[#27293d] rounded-2xl shadow-2xl p-6 text-xs text-gray-200 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#232537] pb-3">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">AI Script & Video Director</h3>
              <p className="text-[11px] text-gray-400">
                {language === 'km'
                  ? 'បង្កើតគម្រោងវីដេអូពេញលេញដោយស្វ័យប្រវត្តិតាមរយៈ AI'
                  : 'Generate a complete structured multi-track video timeline from a text prompt.'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-[#202232] text-gray-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Input */}
        <div className="space-y-3">
          <div>
            <label className="block text-gray-300 font-semibold mb-1">
              {language === 'km' ? 'ប្រាប់ពីគំនិតវីដេអូរបស់អ្នក:' : 'Describe your video concept / topic:'}
            </label>
            <textarea
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              rows={4}
              placeholder="e.g. 15-second product teaser with punchy captions and fast cuts..."
              className="w-full bg-[#11121d] border border-[#2b2e46] rounded-xl p-3 text-xs text-gray-200 focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Quick Idea Chips */}
          <div className="space-y-1.5">
            <span className="text-[10px] text-gray-400 font-medium">Quick Prompts:</span>
            <div className="flex flex-wrap gap-1.5">
              {sampleIdeas.map((idea, idx) => (
                <button
                  key={idx}
                  onClick={() => setPromptText(idea)}
                  className="px-2.5 py-1 rounded-md bg-[#1a1b2a] hover:bg-[#222438] text-gray-300 text-[10px] border border-[#27293d] transition text-left"
                >
                  {idea}
                </button>
              ))}
            </div>
          </div>

          {/* Duration Selector */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-gray-300 font-medium">Target Duration:</span>
            <div className="flex space-x-1.5">
              {[15, 30, 45].map((sec) => (
                <button
                  key={sec}
                  onClick={() => setTargetDuration(sec)}
                  className={`px-3 py-1 rounded-lg border text-xs font-semibold transition ${
                    targetDuration === sec
                      ? 'bg-purple-600 border-purple-400 text-white'
                      : 'bg-[#181926] border-[#292b3e] text-gray-400 hover:text-white'
                  }`}
                >
                  {sec}s
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex justify-end space-x-2.5 pt-3 border-t border-[#232537]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#1a1b28] hover:bg-[#222436] text-gray-300 font-medium transition"
          >
            Cancel
          </button>

          <button
            onClick={handleGenerate}
            disabled={isLoading || !promptText.trim()}
            className="px-5 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold flex items-center gap-1.5 shadow-md shadow-purple-900/40 transition active:scale-95 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generating Timeline...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate Video Project</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
