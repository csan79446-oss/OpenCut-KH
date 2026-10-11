import React from 'react';
import { SlidersHorizontal, Check } from 'lucide-react';
import { ClipFilters } from '../types/editor';
import { Language, translations } from '../utils/i18n';

interface EffectsPanelProps {
  onApplyFilterPreset: (preset: string, filters: Partial<ClipFilters>) => void;
  activePreset: string;
  language: Language;
}

export const EffectsPanel: React.FC<EffectsPanelProps> = ({
  onApplyFilterPreset,
  activePreset,
  language,
}) => {
  const t = translations[language];

  const presets = [
    {
      id: 'none',
      name: 'Normal / Original',
      color: 'bg-zinc-700',
      filters: { brightness: 100, contrast: 100, saturate: 100, blur: 0, hueRotate: 0, sepia: 0, grayscale: 0, vignette: 0 },
    },
    {
      id: 'cyberpunk',
      name: 'Cyberpunk Neon',
      color: 'bg-gradient-to-r from-cyan-500 to-pink-500',
      filters: { brightness: 110, contrast: 120, saturate: 140, blur: 0, hueRotate: 15, sepia: 0, grayscale: 0, vignette: 25 },
    },
    {
      id: 'cinematic',
      name: 'Cinematic Teal & Orange',
      color: 'bg-gradient-to-r from-teal-600 to-amber-600',
      filters: { brightness: 105, contrast: 115, saturate: 120, blur: 0, hueRotate: -10, sepia: 10, grayscale: 0, vignette: 20 },
    },
    {
      id: 'vintage',
      name: 'Retro 90s Film',
      color: 'bg-gradient-to-r from-amber-700 to-orange-800',
      filters: { brightness: 100, contrast: 95, saturate: 90, blur: 0, hueRotate: 0, sepia: 40, grayscale: 0, vignette: 30 },
    },
    {
      id: 'noir',
      name: 'Noir Black & White',
      color: 'bg-gradient-to-r from-gray-900 to-gray-400',
      filters: { brightness: 110, contrast: 135, saturate: 0, blur: 0, hueRotate: 0, sepia: 0, grayscale: 100, vignette: 40 },
    },
    {
      id: 'warm',
      name: 'Golden Hour Glow',
      color: 'bg-gradient-to-r from-yellow-500 to-rose-500',
      filters: { brightness: 105, contrast: 105, saturate: 125, blur: 0, hueRotate: 5, sepia: 20, grayscale: 0, vignette: 15 },
    },
  ];

  return (
    <div className="h-full flex flex-col p-3 text-xs bg-[#151620] overflow-y-auto space-y-3">
      <div className="font-semibold text-gray-200 flex items-center gap-1.5">
        <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
        <span>{t.filters}</span>
      </div>
      <p className="text-[10px] text-gray-400">
        {language === 'km'
          ? 'ជ្រើសរើសស្ទីលពណ៌ និង Filter សម្រាប់អនុវត្តលើ Clip វីដេអូដែលបានជ្រើសរើស'
          : 'Select cinematic LUTs and color grading styles for the active video clip.'}
      </p>

      <div className="grid grid-cols-2 gap-2.5">
        {presets.map((preset) => {
          const isSelected = activePreset === preset.id;
          return (
            <div
              key={preset.id}
              onClick={() => onApplyFilterPreset(preset.id, preset.filters)}
              className={`p-2.5 rounded-lg border transition cursor-pointer relative group flex flex-col justify-between h-20 ${
                isSelected
                  ? 'bg-[#1e2030] border-cyan-500 shadow-md shadow-cyan-900/30'
                  : 'bg-[#1a1b28] border-[#27293d] hover:border-gray-500'
              }`}
            >
              <div className={`w-full h-7 rounded ${preset.color} mb-1.5 shadow-inner`} />
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-200 text-[11px] truncate">{preset.name}</span>
                {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
