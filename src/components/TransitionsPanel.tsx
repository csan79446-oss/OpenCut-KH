import React from 'react';
import { Layers, Sparkles } from 'lucide-react';
import { Language } from '../utils/i18n';

interface TransitionsPanelProps {
  onApplyTransition: (transition: 'crossfade' | 'zoom' | 'flash' | 'slide') => void;
  language: Language;
}

export const TransitionsPanel: React.FC<TransitionsPanelProps> = ({ onApplyTransition, language }) => {
  const transitionsList: { id: 'crossfade' | 'zoom' | 'flash' | 'slide'; name: string; desc: string; icon: string }[] = [
    { id: 'crossfade', name: 'Smooth Crossfade', desc: 'Classic cinematic dissolve', icon: '✨' },
    { id: 'zoom', name: 'Zoom In Punch', desc: 'Fast dynamic whip zoom', icon: '🔍' },
    { id: 'flash', name: 'White Flash Impact', desc: 'High-energy camera flash', icon: '⚡' },
    { id: 'slide', name: 'Directional Slide', desc: 'Clean horizontal push', icon: '➡️' },
  ];

  return (
    <div className="h-full flex flex-col p-3 text-xs bg-[#151620] overflow-y-auto space-y-3">
      <div className="font-semibold text-gray-200 flex items-center gap-1.5">
        <Layers className="w-3.5 h-3.5 text-cyan-400" />
        <span>{language === 'km' ? 'ចលនាប្ដូរប្លង់ (Transitions)' : 'Video Transitions'}</span>
      </div>
      <p className="text-[10px] text-gray-400">
        {language === 'km'
          ? 'ជ្រើសរើស Transition ដើម្បីបន្ថែមនៅដើម Clip វីដេអូ'
          : 'Apply entrance transitions between clips on the timeline.'}
      </p>

      <div className="space-y-2">
        {transitionsList.map((tr) => (
          <div
            key={tr.id}
            onClick={() => onApplyTransition(tr.id)}
            className="p-3 bg-[#1a1b28] hover:bg-[#202235] rounded-lg border border-[#282a40] hover:border-cyan-500/50 flex items-center justify-between cursor-pointer transition group"
          >
            <div className="flex items-center space-x-3">
              <span className="text-xl">{tr.icon}</span>
              <div>
                <div className="font-semibold text-gray-200 text-xs group-hover:text-cyan-300">
                  {tr.name}
                </div>
                <div className="text-[10px] text-gray-400">{tr.desc}</div>
              </div>
            </div>
            <button className="px-2 py-1 bg-cyan-600/30 group-hover:bg-cyan-600 text-cyan-300 group-hover:text-white rounded text-[10px] transition">
              Apply
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
