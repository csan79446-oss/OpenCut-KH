import React from 'react';
import {
  Scissors,
  Wand2,
  Undo2,
  Redo2,
  Download,
  Languages,
  Monitor,
  Smartphone,
  Square,
  Sparkles,
} from 'lucide-react';
import { AspectRatio } from '../types/editor';
import { Language, translations } from '../utils/i18n';

interface HeaderBarProps {
  projectTitle: string;
  onProjectTitleChange: (title: string) => void;
  aspectRatio: AspectRatio;
  onAspectRatioChange: (ratio: AspectRatio) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onOpenAIMagic: () => void;
  onOpenExport: () => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  projectTitle,
  onProjectTitleChange,
  aspectRatio,
  onAspectRatioChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onOpenAIMagic,
  onOpenExport,
  language,
  onLanguageChange,
}) => {
  const t = translations[language];

  const aspectRatios: { value: AspectRatio; label: string; icon: any; sub: string }[] = [
    { value: '16:9', label: '16:9', icon: Monitor, sub: 'YouTube / Widescreen' },
    { value: '9:16', label: '9:16', icon: Smartphone, sub: 'TikTok / Shorts / Reels' },
    { value: '1:1', label: '1:1', icon: Square, sub: 'Instagram Square' },
    { value: '4:5', label: '4:5', icon: Smartphone, sub: 'Social Portrait' },
  ];

  return (
    <header className="h-12 bg-[#101118] border-b border-[#212332] px-3.5 flex items-center justify-between select-none z-30 shrink-0">
      {/* Left: Brand & Title */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded bg-gradient-to-tr from-cyan-400 to-blue-600 flex items-center justify-center shadow-md shadow-cyan-950/40">
            <Scissors className="w-3.5 h-3.5 text-black stroke-[2.5]" />
          </div>
          <span className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
            OpenCut
            <span className="text-[9px] px-1.5 py-0.2 font-bold bg-[#1e202e] text-cyan-400 border border-cyan-500/30 rounded uppercase tracking-wider">
              Studio
            </span>
          </span>
        </div>

        {/* Project Name editable */}
        <input
          type="text"
          value={projectTitle}
          onChange={(e) => onProjectTitleChange(e.target.value)}
          className="bg-[#171824] hover:bg-[#1e2030] focus:bg-[#1e2030] text-xs text-gray-200 font-medium px-2.5 py-1 rounded border border-[#26283c] focus:border-cyan-400/80 focus:outline-none transition w-44"
          placeholder="Untitled Project"
          title="Rename Project"
        />

        {/* Undo / Redo */}
        <div className="flex items-center space-x-1 pl-2 border-l border-[#242636]">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className={`p-1.5 rounded transition cursor-pointer ${
              canUndo
                ? 'hover:bg-[#1e2030] text-gray-300 hover:text-white'
                : 'text-gray-600 cursor-not-allowed opacity-50'
            }`}
            title={t.undo}
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className={`p-1.5 rounded transition cursor-pointer ${
              canRedo
                ? 'hover:bg-[#1e2030] text-gray-300 hover:text-white'
                : 'text-gray-600 cursor-not-allowed opacity-50'
            }`}
            title={t.redo}
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Center: Aspect Ratio Switcher */}
      <div className="flex items-center space-x-1 bg-[#161722] p-1 rounded-lg border border-[#242636]">
        {aspectRatios.map((item) => {
          const Icon = item.icon;
          const isActive = aspectRatio === item.value;
          return (
            <button
              key={item.value}
              onClick={() => onAspectRatioChange(item.value)}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-semibold transition cursor-pointer ${
                isActive
                  ? 'bg-cyan-500 text-black shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#202232]'
              }`}
              title={item.sub}
            >
              <Icon className="w-3 h-3" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Right: AI Tools, Language, Export */}
      <div className="flex items-center space-x-2">
        {/* AI Magic Director Button */}
        <button
          onClick={onOpenAIMagic}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-[#1a1b2a] hover:bg-[#23253a] text-purple-200 border border-purple-500/30 transition cursor-pointer shadow-sm"
          title="AI Video Script & Timeline Creator"
        >
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          <span>{t.aiMagic}</span>
        </button>

        {/* Language Switcher */}
        <button
          onClick={() => onLanguageChange(language === 'km' ? 'en' : 'km')}
          className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded bg-[#171824] hover:bg-[#212334] text-gray-300 text-xs border border-[#282a3c] transition cursor-pointer font-medium"
          title="Switch Language / ប្ដូរភាសា"
        >
          <Languages className="w-3.5 h-3.5 text-cyan-400" />
          <span>{language === 'km' ? 'ខ្មែរ' : 'EN'}</span>
        </button>

        {/* Export Button (CapCut signature bright action button) */}
        <button
          onClick={onOpenExport}
          className="flex items-center space-x-2 px-4 py-1.5 rounded-md text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-black shadow-md shadow-cyan-950/60 active:scale-95 transition cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>{t.export}</span>
        </button>
      </div>
    </header>
  );
};
