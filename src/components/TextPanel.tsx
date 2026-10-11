import React, { useState } from 'react';
import {
  Type,
  Sparkles,
  Plus,
  Flame,
  Zap,
} from 'lucide-react';
import { TextConfig, TimelineClip } from '../types/editor';
import { Language, translations } from '../utils/i18n';

interface TextPanelProps {
  onAddTextClip: (textConfig: TextConfig, title: string) => void;
  language: Language;
}

export const TextPanel: React.FC<TextPanelProps> = ({ onAddTextClip, language }) => {
  const t = translations[language];
  const [customText, setCustomText] = useState('VIRAL HOOK TITLE');

  const textStyles: {
    id: string;
    name: string;
    preview: string;
    config: TextConfig;
  }[] = [
    {
      id: 'capcut-yellow',
      name: t.yellowHighlight,
      preview: '⚡ CAPCUT VIRAL',
      config: {
        text: '⚡ CAPCUT VIRAL',
        fontSize: 36,
        fontFamily: 'Inter',
        color: '#facc15',
        strokeColor: '#000000',
        strokeWidth: 4,
        backgroundColor: 'rgba(0,0,0,0.7)',
        animation: 'pop',
        align: 'center',
        yPercent: 25,
      },
    },
    {
      id: 'tiktok-bold',
      name: t.tiktokBold,
      preview: '🔥 TIKTOK BOLD',
      config: {
        text: '🔥 TIKTOK BOLD',
        fontSize: 34,
        fontFamily: 'Inter',
        color: '#ffffff',
        strokeColor: '#ef4444',
        strokeWidth: 4,
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        animation: 'bounce',
        align: 'center',
        yPercent: 75,
      },
    },
    {
      id: 'karaoke-bounce',
      name: t.karaokeBounce,
      preview: '🎤 KARAOKE GLOW',
      config: {
        text: '🎤 KARAOKE GLOW',
        fontSize: 32,
        fontFamily: 'Kantumruy Pro',
        color: '#38bdf8',
        strokeColor: '#0284c7',
        strokeWidth: 3,
        backgroundColor: 'rgba(3, 7, 18, 0.75)',
        animation: 'karaoke',
        align: 'center',
        yPercent: 80,
      },
    },
    {
      id: 'cyber-neon',
      name: t.cyberNeon,
      preview: '🚀 CYBER NEON',
      config: {
        text: '🚀 CYBER NEON',
        fontSize: 35,
        fontFamily: 'JetBrains Mono',
        color: '#a855f7',
        strokeColor: '#ec4899',
        strokeWidth: 3,
        backgroundColor: 'rgba(17, 24, 39, 0.9)',
        animation: 'pop',
        align: 'center',
        yPercent: 30,
      },
    },
  ];

  return (
    <div className="h-full flex flex-col p-3 text-xs bg-[#151620] overflow-y-auto space-y-4">
      {/* Quick Add Custom Title */}
      <div className="p-3 bg-[#1a1b28] rounded-lg border border-[#282a40] space-y-2">
        <div className="font-semibold text-gray-200 flex items-center gap-1.5">
          <Type className="w-3.5 h-3.5 text-cyan-400" />
          <span>{t.addTitle}</span>
        </div>
        <input
          type="text"
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
          placeholder={t.defaultText}
          className="w-full bg-[#12131d] border border-[#2a2c42] rounded px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-cyan-500"
        />
        <button
          onClick={() =>
            onAddTextClip(
              {
                text: customText,
                fontSize: 34,
                fontFamily: 'Inter',
                color: '#ffffff',
                strokeColor: '#000000',
                strokeWidth: 3,
                backgroundColor: 'rgba(0,0,0,0.6)',
                animation: 'pop',
                align: 'center',
                yPercent: 50,
              },
              customText
            )
          }
          className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-semibold flex items-center justify-center gap-1.5 transition shadow"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{t.addTitle}</span>
        </button>
      </div>

      {/* Styled Caption Presets (CapCut Trending Styles) */}
      <div className="space-y-2">
        <div className="font-semibold text-gray-300 flex items-center gap-1.5">
          <Flame className="w-3.5 h-3.5 text-amber-400" />
          <span>{t.captionStyles}</span>
        </div>

        <div className="space-y-2.5">
          {textStyles.map((style) => (
            <div
              key={style.id}
              className="p-3 bg-[#1a1b28] hover:bg-[#202235] rounded-lg border border-[#282a40] hover:border-cyan-500/50 flex items-center justify-between group transition cursor-pointer"
              onClick={() => onAddTextClip(style.config, style.name)}
            >
              <div>
                <div className="text-gray-300 font-semibold text-xs mb-1">
                  {style.name}
                </div>
                <div
                  className="font-bold text-sm tracking-wide px-2 py-1 rounded inline-block shadow-sm"
                  style={{
                    color: style.config.color,
                    backgroundColor: style.config.backgroundColor,
                    textShadow: style.config.strokeWidth > 0 ? `0 0 2px ${style.config.strokeColor}` : 'none',
                    fontFamily: style.config.fontFamily,
                  }}
                >
                  {style.preview}
                </div>
              </div>

              <button
                className="p-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-md shadow opacity-80 group-hover:opacity-100 transition"
                title={t.addToTimeline}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
