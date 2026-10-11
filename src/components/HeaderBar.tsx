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
    <header className="h-12 bg-[#12131a] border-b border-[#232433] px-3 flex items-center justify-between select-none z-30">
      {/* Left: Brand & Title */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2 px-2 py-1 rounded-md bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30">
          <div className="w-6 h-6 rounded bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-sm">
            <Scissors className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
            OpenCut
            <span className="text-[10px] px-1.5 py-0.2 font-semibold bg-cyan-500 text-black rounded uppercase tracking-wider">
              AI
            </span>
          </span>
        </div>

        {/* Project Name editable */}
        <input
          type="text"
          value={projectTitle}
          onChange={(e) => onProjectTitleChange(e.target.value)}
          className="bg-[#1a1b26] hover:bg-[#202230] focus:bg-[#202230] text-xs text-gray-200 font-medium px-2.5 py-1 rounded border border-transparent hover:border-gray-700 focus:border-cyan-500/60 focus:outline-none transition w-44"
          placeholder="Untitled Project"
          title="Rename Project"
        />

        {/* Undo / Redo */}
        <div className="flex items-center space-x-1 pl-2 border-l border-[#272838]">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className={`p-1.5 rounded transition ${
              canUndo
                ? 'hover:bg-[#242636] text-gray-300 hover:text-white'
                : 'text-gray-600 cursor-not-allowed'
            }`}
            title={t.undo}
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className={`p-1.5 rounded transition ${
              canRedo
                ? 'hover:bg-[#242636] text-gray-300 hover:text-white'
                : 'text-gray-600 cursor-not-allowed'
            }`}
            title={t.redo}
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Center: Aspect Ratio Switcher */}
      <div className="flex items-center space-x-1 bg-[#181924] p-1 rounded-lg border border-[#27283a]">
        {aspectRatios.map((item) => {
          const Icon = item.icon;
          const isActive = aspectRatio === item.value;
          return (
            <button
              key={item.value}
              onClick={() => onAspectRatioChange(item.value)}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-medium transition ${
                isActive
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#232535]'
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
      <div className="flex items-center space-x-2.5">
        {/* AI Magic Director Button */}
        <button
          onClick={onOpenAIMagic}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-gradient-to-r from-purple-600/30 to-pink-600/30 text-purple-200 border border-purple-500/40 hover:from-purple-600/50 hover:to-pink-600/50 transition shadow-sm"
          title="AI Video Script & Timeline Creator"
        >
          <Sparkles className="w-3.5 h-3.5 text-pink-300 animate-pulse" />
          <span>{t.aiMagic}</span>
        </button>

        {/* Language Switcher */}
        <button
          onClick={() => onLanguageChange(language === 'km' ? 'en' : 'km')}
          className="flex items-center space-x-1.5 px-2 py-1 rounded bg-[#1a1b28] hover:bg-[#242638] text-gray-300 text-xs border border-[#2d2f44] transition"
          title="Switch Language / ប្ដូរភាសា"
        >
          <Languages className="w-3.5 h-3.5 text-cyan-400" />
          <span>{language === 'km' ? '🇰🇭 ខ្មែរ' : '🇺🇸 EN'}</span>
        </button>

        {/* Export Button (CapCut style blue/cyan highlight) */}
        <button
          onClick={onOpenExport}
          className="flex items-center space-x-2 px-3.5 py-1.5 rounded-md text-xs font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-md shadow-cyan-900/40 active:scale-95 transition"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{t.export}</span>
        </button>
      </div>
    </header>
  );
};
