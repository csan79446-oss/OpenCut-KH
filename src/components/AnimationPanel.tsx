/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Sparkles,
  Zap,
  Play,
  RotateCcw,
  Check,
  Flame,
  Layers,
  ZoomIn,
  ZoomOut,
  Keyboard,
  MoveUp,
  MoveLeft,
  Tv,
  Sun,
  Activity,
  Plus,
} from 'lucide-react';
import { AnimationConfig, AnimationPreset, TextConfig, TimelineClip } from '../types/editor';
import { Language } from '../utils/i18n';

interface AnimationPanelProps {
  selectedClip: TimelineClip | null;
  onApplyAnimation: (animation: AnimationConfig) => void;
  onAddAnimatedTitle: (textConfig: TextConfig, title: string) => void;
  onPreviewAnimation: () => void;
  language: Language;
}

interface PresetItem {
  id: AnimationPreset;
  nameEn: string;
  nameKm: string;
  category: 'in' | 'keyframe' | 'text';
  icon: any;
  badge: string;
  descriptionKm: string;
  descriptionEn: string;
  defaultConfig: AnimationConfig;
}

export const ANIMATION_PRESETS: PresetItem[] = [
  {
    id: 'typewriter',
    nameEn: 'Typewriter (CapCut Classic)',
    nameKm: 'វាយអក្សរ (Typewriter)',
    category: 'text',
    icon: Keyboard,
    badge: 'CAPCUT POPULAR',
    descriptionKm: 'អក្សររត់លេចចេញម្ដងមួយតួៗ ដូចម៉ាស៊ីនអង្គុលីលេខ ជាមួយចង្វាក់វាយរលូន និងទស្សន៍ទាយ',
    descriptionEn: 'Letters type out one-by-one with realistic mechanical cadence and blinking cursor',
    defaultConfig: {
      preset: 'typewriter',
      duration: 1.2,
      typewriterSpeed: 20,
    },
  },
  {
    id: 'spring-pop',
    nameEn: 'Spring Pop (Elastic Bounce)',
    nameKm: 'លោតស្ទុះ (Spring Pop)',
    category: 'in',
    icon: Zap,
    badge: 'VIRAL HOOK',
    descriptionKm: 'ចលនាលោតស្ទុះពីតូចទៅធំ ជាមួយកម្លាំង Spring Elastic រលាក់ទប់លំនឹង ដូច CapCut TikTok',
    descriptionEn: 'Physics-based damped harmonic spring bounce with snappy overshoot and elastic settling',
    defaultConfig: {
      preset: 'spring-pop',
      duration: 0.55,
      springTension: 1.2,
    },
  },
  {
    id: 'keyframe-zoom-in',
    nameEn: 'Keyframe Zoom In (Ken Burns)',
    nameKm: 'ពង្រីក Keyframe Zoom In',
    category: 'keyframe',
    icon: ZoomIn,
    badge: 'CINEMATIC',
    descriptionKm: 'ពង្រីកបន្តិចម្ដងៗពី 1.0x ទៅ 1.35x យ៉ាងរលូនដូចកាមេរ៉ាភាពយន្ត Cinematic Push-In',
    descriptionEn: 'Smooth cinematic push-in scaling from 1.0x to 1.35x across clip duration',
    defaultConfig: {
      preset: 'keyframe-zoom-in',
      duration: 1.0,
      zoomStart: 1.0,
      zoomEnd: 1.35,
    },
  },
  {
    id: 'keyframe-zoom-out',
    nameEn: 'Keyframe Zoom Out (Pull Back)',
    nameKm: 'បង្រួម Keyframe Zoom Out',
    category: 'keyframe',
    icon: ZoomOut,
    badge: 'CINEMATIC',
    descriptionKm: 'បង្រួមពីទំហំធំ 1.35x មក 1.0x វិញ បង្កើតអារម្មណ៍ទូលាយ និងទាក់ទាញភ្នែក',
    descriptionEn: 'Smooth cinematic pull-back scaling from 1.35x down to 1.0x',
    defaultConfig: {
      preset: 'keyframe-zoom-out',
      duration: 1.0,
      zoomStart: 1.0,
      zoomEnd: 1.35,
    },
  },
  {
    id: 'slide-up',
    nameEn: 'Slide Up (Smooth Push)',
    nameKm: 'រំកិលឡើងលើ (Slide Up)',
    category: 'in',
    icon: MoveUp,
    badge: 'CLEAN',
    descriptionKm: 'រំកិលពីក្រោមឡើងលើចូលប្លង់យ៉ាងស្រទន់ ជាមួយកម្រិតល្បឿន Easing ធម្មជាតិ',
    descriptionEn: 'Glides vertically from below with natural cubic-bezier deceleration',
    defaultConfig: {
      preset: 'slide-up',
      duration: 0.5,
    },
  },
  {
    id: 'slide-left',
    nameEn: 'Slide Left (Lateral Push)',
    nameKm: 'រំកិលពីឆ្វេង (Slide Left)',
    category: 'in',
    icon: MoveLeft,
    badge: 'TRANSITION',
    descriptionKm: 'រំកិលពីចំហៀងចូលប្លង់កណ្តាល ជួយឲ្យវីដេអូមានថាមពលចលនាផ្តេក',
    descriptionEn: 'Sweeps in laterally from the side with crisp settle curve',
    defaultConfig: {
      preset: 'slide-left',
      duration: 0.5,
    },
  },
  {
    id: 'glitch',
    nameEn: 'Glitch Flash (Cyber Shift)',
    nameKm: 'ភ្លឹបភ្លែត Glitch (Cyberpunk)',
    category: 'in',
    icon: Tv,
    badge: 'HIGH ENERGY',
    descriptionKm: 'រំញ័រភ្លឹបភ្លែតបែបបច្ចេកវិទ្យា និង Sci-Fi ក្នុងរយៈពេល ០.៣ វិនាទីដំបូង',
    descriptionEn: 'High-energy chromatic vibration jitter for fast cuts and gaming reels',
    defaultConfig: {
      preset: 'glitch',
      duration: 0.35,
    },
  },
  {
    id: 'fade',
    nameEn: 'Smooth Film Dissolve',
    nameKm: 'រលាយចូលស្រទន់ (Fade In)',
    category: 'in',
    icon: Sun,
    badge: 'ELEGANT',
    descriptionKm: 'រលាយពីថ្លា 0% ទៅ 100% យ៉ាងទន់ភ្លន់ ល្អបំផុតសម្រាប់វីដេអូ VLOG និងសម្រាកអារម្មណ៍',
    descriptionEn: 'Gentle opacity crossfade for vlog intros and documentary transitions',
    defaultConfig: {
      preset: 'fade',
      duration: 0.4,
    },
  },
  {
    id: 'bounce',
    nameEn: 'Kinetic Subtitle Pulse',
    nameKm: 'ចង្វាក់ Pulse (MrBeast)',
    category: 'text',
    icon: Activity,
    badge: 'RETENTION',
    descriptionKm: 'ចង្វាក់លោតញាក់តាមពាក្យនិយាយ បង្កើនទស្សនិកជនមើលដល់ចប់ (Watch Time)',
    descriptionEn: 'Continuous rhythmic breathing pulse synced to spoken punchlines',
    defaultConfig: {
      preset: 'bounce',
      duration: 0.8,
    },
  },
];

export const AnimationPanel: React.FC<AnimationPanelProps> = ({
  selectedClip,
  onApplyAnimation,
  onAddAnimatedTitle,
  onPreviewAnimation,
  language,
}) => {
  const [filterCat, setFilterCat] = useState<'all' | 'in' | 'keyframe' | 'text'>('all');
  const [activePresetId, setActivePresetId] = useState<AnimationPreset>(
    selectedClip?.animation?.preset || (selectedClip?.textConfig?.animation as AnimationPreset) || 'spring-pop'
  );

  // Animation parameters
  const [duration, setDuration] = useState<number>(selectedClip?.animation?.duration || 0.6);
  const [zoomIntensity, setZoomIntensity] = useState<number>(selectedClip?.animation?.zoomEnd || 1.35);
  const [typewriterSpeed, setTypewriterSpeed] = useState<number>(selectedClip?.animation?.typewriterSpeed || 20);
  const [springTension, setSpringTension] = useState<number>(selectedClip?.animation?.springTension || 1.2);

  const filteredPresets = ANIMATION_PRESETS.filter(
    (p) => filterCat === 'all' || p.category === filterCat
  );

  const currentPresetItem = ANIMATION_PRESETS.find((p) => p.id === activePresetId) || ANIMATION_PRESETS[1];

  const handleApplyPreset = (preset: PresetItem) => {
    setActivePresetId(preset.id);
    const config: AnimationConfig = {
      preset: preset.id,
      duration,
      zoomStart: 1.0,
      zoomEnd: zoomIntensity,
      typewriterSpeed,
      springTension,
    };
    onApplyAnimation(config);
  };

  const handleAddSampleAnimatedText = (preset: PresetItem) => {
    const textPresets: Record<AnimationPreset, { title: string; text: string; color: string; y: number }> = {
      typewriter: {
        title: 'Typewriter Headline',
        text: language === 'km' ? '⌨️ ចំណងជើងវាយអក្សរ Typewriter' : '⌨️ Typing Out Captions Like CapCut',
        color: '#ffffff',
        y: 40,
      },
      'spring-pop': {
        title: 'Spring Pop Hook',
        text: language === 'km' ? '⚡ ឈុតទាក់ទាញ VIRAL HOOK!' : '⚡ VIRAL HOOK SPRING POP!',
        color: '#facc15',
        y: 25,
      },
      'keyframe-zoom-in': {
        title: 'Keyframe Zoom Title',
        text: language === 'km' ? '🔍 ពង្រីក Keyframe Zoom In' : '🔍 Cinematic Keyframe Zoom Push',
        color: '#38bdf8',
        y: 75,
      },
      'keyframe-zoom-out': {
        title: 'Keyframe Zoom Out Title',
        text: language === 'km' ? '🔎 បង្រួម Keyframe Zoom Out' : '🔎 Cinematic Keyframe Zoom Pull',
        color: '#a855f7',
        y: 75,
      },
      'slide-up': {
        title: 'Slide Up Subtitle',
        text: language === 'km' ? '⬆️ រំកិលឡើងលើយ៉ាងរលូន' : '⬆️ Smooth Slide Up Subtitle',
        color: '#4ade80',
        y: 78,
      },
      'slide-left': {
        title: 'Slide Left Title',
        text: language === 'km' ? '➡️ រំកិលពីឆ្វេងមកកណ្តាល' : '➡️ Slide In From Left',
        color: '#fb923c',
        y: 35,
      },
      glitch: {
        title: 'Glitch Cyber Hook',
        text: language === 'km' ? '💥 GLITCH CYBER EFFECT' : '💥 GLITCH CYBER EFFECT',
        color: '#f43f5e',
        y: 30,
      },
      fade: {
        title: 'Cinema Fade Outro',
        text: language === 'km' ? '🎬 ភាពយន្តរលាយចូលទន់ភ្លន់' : '🎬 Elegant Cinema Dissolve',
        color: '#e2e8f0',
        y: 80,
      },
      bounce: {
        title: 'Kinetic Pulse Subtitle',
        text: language === 'km' ? '🔥 ចង្វាក់រស់រវើក Kinetic Pulse' : '🔥 Kinetic Pulse Retention Text',
        color: '#ffe600',
        y: 78,
      },
      none: {
        title: 'Static Text',
        text: 'Static Headline',
        color: '#ffffff',
        y: 50,
      },
      pop: {
        title: 'Pop Title',
        text: 'Pop Entrance',
        color: '#facc15',
        y: 50,
      },
      'slide-down': {
        title: 'Slide Down',
        text: 'Slide Down',
        color: '#ffffff',
        y: 50,
      },
      karaoke: {
        title: 'Karaoke Text',
        text: 'Karaoke Wave',
        color: '#38bdf8',
        y: 78,
      },
      'word-by-word': {
        title: 'Word-by-word',
        text: 'Word by word',
        color: '#ffffff',
        y: 78,
      },
      'word-highlight': {
        title: 'Word highlight',
        text: 'Word highlight',
        color: '#ffffff',
        y: 78,
      },
      'word-bounce': {
        title: 'Word bounce',
        text: 'Word bounce',
        color: '#ffffff',
        y: 78,
      },
    };

    const target = textPresets[preset.id] || textPresets['spring-pop'];

    const newConfig: TextConfig = {
      text: target.text,
      fontSize: 34,
      fontFamily: language === 'km' ? 'Kantumruy Pro' : 'Inter',
      color: target.color,
      strokeColor: '#000000',
      strokeWidth: 4,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      animation: preset.id,
      animationConfig: {
        preset: preset.id,
        duration,
        zoomStart: 1.0,
        zoomEnd: zoomIntensity,
        typewriterSpeed,
        springTension,
      },
      align: 'center',
      yPercent: target.y,
      shadowColor: 'rgba(0,0,0,0.9)',
      shadowBlur: 8,
    };

    onAddAnimatedTitle(newConfig, target.title);
  };

  return (
    <div className="h-full flex flex-col p-3 text-xs bg-[#151620] overflow-y-auto space-y-3.5 select-none custom-scrollbar">
      {/* Top Header */}
      <div className="border-b border-[#232536] pb-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-md bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-md">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-gray-100 text-sm flex items-center gap-1.5">
                {language === 'km' ? 'ម៉ូតចលនា Animation Presets' : 'CapCut Animation Presets'}
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-mono">
                  CLI & Pro
                </span>
              </h2>
              <p className="text-[10px] text-gray-400">
                {language === 'km'
                  ? 'ចលនា Typewriter, Spring Pop, Keyframe Zoom ដូច CapCut'
                  : 'Typewriter, Spring Pop, Keyframe Zoom & Kinetic Presets'}
              </p>
            </div>
          </div>
        </div>

        {/* Category Tabs Filter */}
        <div className="flex items-center space-x-1 mt-2.5 bg-[#191a26] p-1 rounded-lg border border-[#27293a]">
          {[
            { id: 'all', label: language === 'km' ? 'ទាំងអស់' : 'All' },
            { id: 'in', label: language === 'km' ? 'លេចចេញ (In)' : 'In Entrances' },
            { id: 'keyframe', label: language === 'km' ? 'Keyframe Zoom' : 'Keyframe Zoom' },
            { id: 'text', label: language === 'km' ? 'អក្សរ (Text)' : 'Text & Titles' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilterCat(cat.id as any)}
              className={`flex-1 py-1 text-[10px] font-semibold rounded-md transition ${
                filterCat === cat.id
                  ? 'bg-cyan-500 text-black shadow-sm'
                  : 'text-gray-400 hover:text-white hover:bg-[#222436]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Selected Clip Notice Banner */}
      <div className="p-2 rounded-lg bg-[#191b28] border border-[#272a3d] flex items-center justify-between text-[11px]">
        <div className="flex items-center space-x-2 truncate">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: selectedClip?.color || '#06b6d4' }}
          />
          <div className="truncate">
            <span className="text-gray-400 block text-[9px] uppercase font-bold">
              {selectedClip ? `Target: ${selectedClip.type}` : 'No clip selected'}
            </span>
            <span className="font-semibold text-gray-200 truncate block">
              {selectedClip?.title || 'Click any clip to animate'}
            </span>
          </div>
        </div>

        <button
          onClick={onPreviewAnimation}
          className="flex items-center space-x-1 px-2 py-1 rounded bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-300 border border-cyan-500/40 text-[10px] font-semibold transition active:scale-95 shrink-0"
          title="Play from clip start to preview animation"
        >
          <Play className="w-3 h-3 fill-current" />
          <span>{language === 'km' ? 'មើលចលនា' : 'Preview'}</span>
        </button>
      </div>

      {/* Animation Presets Grid */}
      <div className="space-y-2">
        <span className="text-[11px] font-bold text-gray-300 block uppercase tracking-wider">
          {language === 'km' ? 'ជ្រើសរើស Preset ចលនា' : 'Available Presets'}
        </span>

        <div className="grid grid-cols-1 gap-2">
          {filteredPresets.map((preset) => {
            const Icon = preset.icon;
            const isSelected = activePresetId === preset.id;

            return (
              <div
                key={preset.id}
                onClick={() => handleApplyPreset(preset)}
                className={`p-2.5 rounded-lg border transition cursor-pointer flex flex-col space-y-1.5 group ${
                  isSelected
                    ? 'bg-cyan-950/40 border-cyan-400 shadow-md shadow-cyan-950/50'
                    : 'bg-[#181a26] border-[#25283a] hover:bg-[#1f2130] hover:border-[#33374d]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div
                      className={`w-7 h-7 rounded flex items-center justify-center transition ${
                        isSelected
                          ? 'bg-cyan-500 text-black'
                          : 'bg-[#232536] text-gray-300 group-hover:text-cyan-400 group-hover:bg-[#2b2e44]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-xs text-gray-200 group-hover:text-cyan-300 transition block">
                        {language === 'km' ? preset.nameKm : preset.nameEn}
                      </span>
                      <span className="text-[9px] text-gray-400 font-medium">
                        {preset.badge}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1">
                    {/* Add as new text clip button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddSampleAnimatedText(preset);
                      }}
                      className="p-1 rounded bg-[#222538] hover:bg-cyan-500 hover:text-black text-gray-300 transition"
                      title={language === 'km' ? 'បន្ថែមជា Title លើ Timeline' : 'Add as new Animated Title'}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>

                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-cyan-400 text-black flex items-center justify-center">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </div>
                </div>

                <p className="text-[10px] text-gray-400 leading-normal line-clamp-2">
                  {language === 'km' ? preset.descriptionKm : preset.descriptionEn}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Animation Customizer Sliders */}
      <div className="p-3 rounded-lg bg-[#181a26] border border-[#27293a] space-y-3">
        <span className="font-bold text-gray-200 text-xs flex items-center gap-1.5">
          <Flame className="w-3.5 h-3.5 text-amber-400" />
          <span>{language === 'km' ? 'កែសម្រួលប៉ារ៉ាម៉ែត្រចលនា' : 'Tune Animation Properties'}</span>
        </span>

        {/* Duration */}
        <div>
          <div className="flex justify-between text-gray-300 mb-1">
            <span>{language === 'km' ? 'ថិរវេលាចលនា (Duration)' : 'Entrance Duration'}</span>
            <span className="font-mono text-cyan-400 font-bold">{duration.toFixed(2)}s</span>
          </div>
          <input
            type="range"
            min="0.2"
            max="2.5"
            step="0.05"
            value={duration}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setDuration(val);
              if (selectedClip) {
                onApplyAnimation({
                  preset: activePresetId,
                  duration: val,
                  zoomStart: 1.0,
                  zoomEnd: zoomIntensity,
                  typewriterSpeed,
                  springTension,
                });
              }
            }}
            className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-[#25283c] rounded"
          />
        </div>

        {/* Specific Typewriter Speed */}
        {(activePresetId === 'typewriter' || currentPresetItem.category === 'text') && (
          <div>
            <div className="flex justify-between text-gray-300 mb-1">
              <span>{language === 'km' ? 'ល្បឿនវាយអក្សរ (Type Speed)' : 'Typing Speed (chars/s)'}</span>
              <span className="font-mono text-cyan-400 font-bold">{typewriterSpeed} c/s</span>
            </div>
            <input
              type="range"
              min="8"
              max="45"
              step="1"
              value={typewriterSpeed}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                setTypewriterSpeed(val);
                if (selectedClip) {
                  onApplyAnimation({
                    preset: activePresetId,
                    duration,
                    typewriterSpeed: val,
                    springTension,
                  });
                }
              }}
              className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-[#25283c] rounded"
            />
          </div>
        )}

        {/* Specific Keyframe Zoom Intensity */}
        {(activePresetId === 'keyframe-zoom-in' || activePresetId === 'keyframe-zoom-out') && (
          <div>
            <div className="flex justify-between text-gray-300 mb-1">
              <span>{language === 'km' ? 'កម្រិត Zoom ពង្រីក (Scale)' : 'Zoom Intensity'}</span>
              <span className="font-mono text-cyan-400 font-bold">{zoomIntensity.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="1.1"
              max="2.2"
              step="0.05"
              value={zoomIntensity}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setZoomIntensity(val);
                if (selectedClip) {
                  onApplyAnimation({
                    preset: activePresetId,
                    duration,
                    zoomStart: 1.0,
                    zoomEnd: val,
                  });
                }
              }}
              className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-[#25283c] rounded"
            />
          </div>
        )}

        {/* Specific Spring Tension */}
        {activePresetId === 'spring-pop' && (
          <div>
            <div className="flex justify-between text-gray-300 mb-1">
              <span>{language === 'km' ? 'កម្លាំង Spring Elastic' : 'Spring Elastic Tension'}</span>
              <span className="font-mono text-cyan-400 font-bold">{springTension.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={springTension}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setSpringTension(val);
                if (selectedClip) {
                  onApplyAnimation({
                    preset: activePresetId,
                    duration,
                    springTension: val,
                  });
                }
              }}
              className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-[#25283c] rounded"
            />
          </div>
        )}

        {/* Apply & Preview CTA */}
        <div className="flex items-center space-x-2 pt-1">
          <button
            onClick={() => handleApplyPreset(currentPresetItem)}
            disabled={!selectedClip}
            className={`flex-1 py-1.5 rounded-md font-semibold text-xs flex items-center justify-center space-x-1.5 transition ${
              selectedClip
                ? 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-md cursor-pointer active:scale-95'
                : 'bg-gray-800 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Check className="w-3.5 h-3.5" />
            <span>{language === 'km' ? 'ដាក់លើ Clip នេះ' : 'Apply to Selected'}</span>
          </button>

          <button
            onClick={onPreviewAnimation}
            className="px-3 py-1.5 rounded-md bg-[#25283c] hover:bg-[#30344d] text-gray-200 font-semibold text-xs flex items-center space-x-1 transition cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" />
            <span>{language === 'km' ? 'តេស្ត' : 'Test'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
