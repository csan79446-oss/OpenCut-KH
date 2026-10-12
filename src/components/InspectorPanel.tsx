import React, { useState } from 'react';
import {
  Sliders,
  Move,
  Volume2,
  Gauge,
  Palette,
  Type,
  RotateCcw,
  Sparkles,
  Trash2,
  Flame,
  Zap,
  ZoomIn,
  ZoomOut,
  Keyboard,
  Play,
  Check,
} from 'lucide-react';
import {
  AnimationConfig,
  AnimationPreset,
  ClipFilters,
  ClipTransform,
  TextConfig,
  TimelineClip,
  TimelineTrack,
} from '../types/editor';
import { Language, translations } from '../utils/i18n';
import { CAPCUT_CAPTION_STYLES, CaptionStylePreset } from '../utils/captionStyles';
import { ANIMATION_PRESETS } from './AnimationPanel';

interface InspectorPanelProps {
  selectedClip: TimelineClip | null;
  tracks?: TimelineTrack[];
  onMoveClipToTrack?: (clipId: string, trackId: string) => void;
  onDeleteClip?: (clipId: string) => void;
  onUpdateClipTransform: (clipId: string, transform: Partial<ClipTransform>) => void;
  onUpdateClipFilters: (clipId: string, filters: Partial<ClipFilters>) => void;
  onUpdateClipAudio: (clipId: string, volume: number, fadeIn: number, fadeOut: number) => void;
  onUpdateClipSpeed: (clipId: string, speed: number) => void;
  onUpdateTextConfig: (clipId: string, textConfig: Partial<TextConfig>) => void;
  onUpdateClipAnimation?: (clipId: string, animation: Partial<AnimationConfig>) => void;
  onApplyStyleToAllCaptions?: (config: Partial<TextConfig>) => void;
  onPreviewAnimation?: () => void;
  language: Language;
}

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
  selectedClip,
  tracks = [],
  onMoveClipToTrack,
  onDeleteClip,
  onUpdateClipTransform,
  onUpdateClipFilters,
  onUpdateClipAudio,
  onUpdateClipSpeed,
  onUpdateTextConfig,
  onUpdateClipAnimation,
  onApplyStyleToAllCaptions,
  onPreviewAnimation,
  language,
}) => {
  const t = translations[language];
  const [activeTab, setActiveTab] = useState<'transform' | 'animation' | 'text' | 'audio' | 'speed' | 'color'>(
    selectedClip?.type === 'text' ? 'text' : 'transform'
  );

  if (!selectedClip) {
    return (
      <div className="w-72 bg-[#12131b] border-l border-[#20212f] p-4 flex flex-col items-center justify-center text-center text-gray-500 text-xs select-none">
        <Sliders className="w-8 h-8 text-gray-600 mb-2" />
        <span className="font-medium text-gray-400 mb-1">{t.inspectorTitle}</span>
        <p className="text-[11px] text-gray-500">{t.noClipSelected}</p>
      </div>
    );
  }

  const { transform, filters, textConfig, volume, fadeIn, fadeOut, speed, type } = selectedClip;
  const currentTrack = tracks.find((t) => t.id === selectedClip.trackId);

  return (
    <div className="w-76 bg-[#12131b] border-l border-[#20212f] flex flex-col h-full text-xs select-none overflow-hidden">
      {/* Top Header */}
      <div className="p-3 border-b border-[#20212f] bg-[#151622] space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 min-w-0">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: selectedClip.color || '#06b6d4' }}
            />
            <span className="font-semibold text-gray-200 truncate">{selectedClip.title}</span>
          </div>

          <div className="flex items-center space-x-1.5 shrink-0">
            <span className="text-[10px] uppercase font-bold text-gray-400 bg-[#212334] px-1.5 py-0.5 rounded">
              {type}
            </span>
            {onDeleteClip && (
              <button
                onClick={() => onDeleteClip(selectedClip.id)}
                className="p-1 rounded hover:bg-rose-500/20 text-gray-500 hover:text-rose-400 transition"
                title="Delete Clip (Del)"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Track assignment dropdown */}
        {tracks.length > 0 && onMoveClipToTrack && (
          <div className="flex items-center justify-between text-[11px] bg-[#1a1b2a] px-2 py-1 rounded border border-[#27293d]">
            <span className="text-gray-400">Assigned Track:</span>
            <select
              value={selectedClip.trackId}
              onChange={(e) => onMoveClipToTrack(selectedClip.id, e.target.value)}
              className="bg-transparent text-cyan-300 font-medium focus:outline-none cursor-pointer"
            >
              {tracks.map((tr) => (
                <option key={tr.id} value={tr.id} className="bg-[#1a1b2a] text-gray-200">
                  {tr.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Inspector Navigation Tabs */}
      <div className="flex border-b border-[#20212f] bg-[#141520] p-1 space-x-0.5">
        <button
          onClick={() => setActiveTab('transform')}
          className={`flex-1 py-1.5 rounded text-[11px] font-medium transition ${
            activeTab === 'transform' ? 'bg-cyan-600/30 text-cyan-300 font-semibold' : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          Transform
        </button>

        <button
          onClick={() => setActiveTab('animation')}
          className={`flex-1 py-1.5 rounded text-[11px] font-medium transition ${
            activeTab === 'animation' ? 'bg-cyan-600/30 text-cyan-300 font-semibold' : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          Animation
        </button>

        {type === 'text' && (
          <button
            onClick={() => setActiveTab('text')}
            className={`flex-1 py-1.5 rounded text-[11px] font-medium transition ${
              activeTab === 'text' ? 'bg-cyan-600/30 text-cyan-300 font-semibold' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Text
          </button>
        )}

        <button
          onClick={() => setActiveTab('audio')}
          className={`flex-1 py-1.5 rounded text-[11px] font-medium transition ${
            activeTab === 'audio' ? 'bg-cyan-600/30 text-cyan-300 font-semibold' : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          Audio
        </button>

        <button
          onClick={() => setActiveTab('speed')}
          className={`flex-1 py-1.5 rounded text-[11px] font-medium transition ${
            activeTab === 'speed' ? 'bg-cyan-600/30 text-cyan-300 font-semibold' : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          Speed
        </button>

        <button
          onClick={() => setActiveTab('color')}
          className={`flex-1 py-1.5 rounded text-[11px] font-medium transition ${
            activeTab === 'color' ? 'bg-cyan-600/30 text-cyan-300 font-semibold' : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          Color
        </button>
      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* 1. TRANSFORM TAB */}
        {activeTab === 'transform' && (
          <div className="space-y-3">
            {/* Scale */}
            <div>
              <div className="flex justify-between text-gray-300 mb-1">
                <span>{t.scale}</span>
                <span className="font-mono text-cyan-400">{Math.round(transform.scale * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="2.5"
                step="0.05"
                value={transform.scale}
                onChange={(e) =>
                  onUpdateClipTransform(selectedClip.id, { scale: parseFloat(e.target.value) })
                }
                className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-[#25283c] rounded-lg"
              />
            </div>

            {/* Position X */}
            <div>
              <div className="flex justify-between text-gray-300 mb-1">
                <span>Position X</span>
                <span className="font-mono text-cyan-400">{transform.x}%</span>
              </div>
              <input
                type="range"
                min="-60"
                max="60"
                step="1"
                value={transform.x}
                onChange={(e) =>
                  onUpdateClipTransform(selectedClip.id, { x: parseInt(e.target.value, 10) })
                }
                className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-[#25283c] rounded-lg"
              />
            </div>

            {/* Position Y */}
            <div>
              <div className="flex justify-between text-gray-300 mb-1">
                <span>Position Y</span>
                <span className="font-mono text-cyan-400">{transform.y}%</span>
              </div>
              <input
                type="range"
                min="-60"
                max="60"
                step="1"
                value={transform.y}
                onChange={(e) =>
                  onUpdateClipTransform(selectedClip.id, { y: parseInt(e.target.value, 10) })
                }
                className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-[#25283c] rounded-lg"
              />
            </div>

            {/* Rotation */}
            <div>
              <div className="flex justify-between text-gray-300 mb-1">
                <span>{t.rotation}</span>
                <span className="font-mono text-cyan-400">{transform.rotation}°</span>
              </div>
              <input
                type="range"
                min="-180"
                max="180"
                step="5"
                value={transform.rotation}
                onChange={(e) =>
                  onUpdateClipTransform(selectedClip.id, { rotation: parseInt(e.target.value, 10) })
                }
                className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-[#25283c] rounded-lg"
              />
            </div>

            {/* Opacity */}
            <div>
              <div className="flex justify-between text-gray-300 mb-1">
                <span>{t.opacity}</span>
                <span className="font-mono text-cyan-400">{Math.round(transform.opacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={transform.opacity}
                onChange={(e) =>
                  onUpdateClipTransform(selectedClip.id, { opacity: parseFloat(e.target.value) })
                }
                className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-[#25283c] rounded-lg"
              />
            </div>

            {/* Blend Mode */}
            <div>
              <span className="text-gray-300 block mb-1">{t.blendMode}</span>
              <select
                value={transform.blendMode}
                onChange={(e) =>
                  onUpdateClipTransform(selectedClip.id, { blendMode: e.target.value as any })
                }
                className="w-full bg-[#1b1c2b] border border-[#2b2e44] rounded p-1.5 text-xs text-gray-200"
              >
                <option value="normal">Normal</option>
                <option value="screen">Screen (Lighten)</option>
                <option value="multiply">Multiply (Darken)</option>
                <option value="overlay">Overlay (Contrast)</option>
              </select>
            </div>
          </div>
        )}

        {/* 2. ANIMATION TAB (CapCut Animation Presets) */}
        {activeTab === 'animation' && (
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-gray-300 font-semibold text-xs flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>{language === 'km' ? 'ចលនា Clip (Animation Presets)' : 'Clip Animation Presets'}</span>
              </span>

              {onPreviewAnimation && (
                <button
                  onClick={onPreviewAnimation}
                  className="flex items-center space-x-1 px-2 py-0.5 rounded bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-300 border border-cyan-500/40 text-[10px] font-semibold transition active:scale-95 cursor-pointer"
                  title="Play from start of clip"
                >
                  <Play className="w-2.5 h-2.5 fill-current" />
                  <span>{language === 'km' ? 'មើលចលនា' : 'Preview'}</span>
                </button>
              )}
            </div>

            {/* Presets Grid */}
            <div className="grid grid-cols-2 gap-1.5 max-h-56 overflow-y-auto custom-scrollbar pr-0.5">
              {ANIMATION_PRESETS.map((pst) => {
                const Icon = pst.icon;
                const isSelected =
                  (selectedClip.animation?.preset || selectedClip.textConfig?.animation) === pst.id;

                return (
                  <button
                    key={pst.id}
                    onClick={() => {
                      const cfg: AnimationConfig = {
                        preset: pst.id,
                        duration: selectedClip.animation?.duration || 0.6,
                        zoomStart: 1.0,
                        zoomEnd: selectedClip.animation?.zoomEnd || 1.35,
                        typewriterSpeed: selectedClip.animation?.typewriterSpeed || 20,
                        springTension: selectedClip.animation?.springTension || 1.2,
                      };
                      onUpdateClipAnimation?.(selectedClip.id, cfg);
                      if (selectedClip.type === 'text') {
                        onUpdateTextConfig(selectedClip.id, {
                          animation: pst.id,
                          animationConfig: cfg,
                        });
                      }
                    }}
                    className={`p-2 rounded-lg border text-left transition flex flex-col justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-950/50 border-cyan-400 text-cyan-200 shadow-sm'
                        : 'bg-[#181a28] border-[#27293d] hover:bg-[#1e2034] text-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-cyan-400' : 'text-gray-400'}`} />
                      {isSelected && <Check className="w-3 h-3 text-cyan-400" />}
                    </div>
                    <span className="font-bold text-[11px] truncate mt-1">
                      {language === 'km' ? pst.nameKm : pst.nameEn}
                    </span>
                    <span className="text-[9px] text-gray-500 font-mono truncate">{pst.badge}</span>
                  </button>
                );
              })}
            </div>

            {/* Animation Duration Slider */}
            <div>
              <div className="flex justify-between text-gray-300 mb-1">
                <span>{language === 'km' ? 'ថិរវេលាចលនា (Duration)' : 'Entrance Duration'}</span>
                <span className="font-mono text-cyan-400 font-bold">
                  {(selectedClip.animation?.duration || 0.6).toFixed(2)}s
                </span>
              </div>
              <input
                type="range"
                min="0.2"
                max="2.5"
                step="0.05"
                value={selectedClip.animation?.duration || 0.6}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  onUpdateClipAnimation?.(selectedClip.id, { duration: val });
                }}
                className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-[#25283c] rounded-lg"
              />
            </div>

            {/* Specific Typewriter controls */}
            {((selectedClip.animation?.preset || selectedClip.textConfig?.animation) === 'typewriter' || selectedClip.type === 'text') && (
              <div>
                <div className="flex justify-between text-gray-300 mb-1">
                  <span>{language === 'km' ? 'ល្បឿនវាយអក្សរ' : 'Typewriter Speed'}</span>
                  <span className="font-mono text-cyan-400 font-bold">
                    {selectedClip.animation?.typewriterSpeed || selectedClip.textConfig?.animationConfig?.typewriterSpeed || 20}{' '}
                    {language === 'km' ? 'តួ/វិ' : 'chars/s'}
                  </span>
                </div>
                <input
                  type="range"
                  min="8"
                  max="45"
                  step="1"
                  value={selectedClip.animation?.typewriterSpeed || selectedClip.textConfig?.animationConfig?.typewriterSpeed || 20}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    onUpdateClipAnimation?.(selectedClip.id, { typewriterSpeed: val });
                    if (selectedClip.textConfig) {
                      onUpdateTextConfig(selectedClip.id, {
                        animationConfig: {
                          ...(selectedClip.textConfig.animationConfig || { preset: 'typewriter' }),
                          typewriterSpeed: val,
                        },
                      });
                    }
                  }}
                  className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-[#25283c] rounded-lg"
                />
              </div>
            )}

            {/* Specific Keyframe Zoom Intensity */}
            {((selectedClip.animation?.preset || selectedClip.textConfig?.animation) === 'keyframe-zoom-in' ||
              (selectedClip.animation?.preset || selectedClip.textConfig?.animation) === 'keyframe-zoom-out') && (
              <div>
                <div className="flex justify-between text-gray-300 mb-1">
                  <span>{language === 'km' ? 'កម្រិត Zoom ពង្រីក' : 'Zoom Intensity'}</span>
                  <span className="font-mono text-cyan-400 font-bold">
                    {(selectedClip.animation?.zoomEnd || 1.35).toFixed(2)}x
                  </span>
                </div>
                <input
                  type="range"
                  min="1.1"
                  max="2.2"
                  step="0.05"
                  value={selectedClip.animation?.zoomEnd || 1.35}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    onUpdateClipAnimation?.(selectedClip.id, { zoomEnd: val });
                  }}
                  className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-[#25283c] rounded-lg"
                />
              </div>
            )}

            {/* Specific Spring Tension */}
            {(selectedClip.animation?.preset || selectedClip.textConfig?.animation) === 'spring-pop' && (
              <div>
                <div className="flex justify-between text-gray-300 mb-1">
                  <span>{language === 'km' ? 'កម្លាំង Spring Elastic' : 'Spring Elastic Tension'}</span>
                  <span className="font-mono text-cyan-400 font-bold">
                    {(selectedClip.animation?.springTension || 1.2).toFixed(1)}x
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={selectedClip.animation?.springTension || 1.2}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    onUpdateClipAnimation?.(selectedClip.id, { springTension: val });
                  }}
                  className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-[#25283c] rounded-lg"
                />
              </div>
            )}
          </div>
        )}

        {/* 3. TEXT & CAPTION TAB (CapCut Inspector) */}
        {activeTab === 'text' && textConfig && (
          <div className="space-y-4">
            {/* Quick CapCut Style Presets Picker */}
            <div className="p-2.5 rounded-lg bg-[#181a28] border border-[#27293d] space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-200 text-[11px] flex items-center space-x-1">
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  <span>{language === 'km' ? 'ម៉ូត Caption ពេញនិយម' : 'CapCut Style Templates'}</span>
                </span>
                {onApplyStyleToAllCaptions && (
                  <button
                    onClick={() => onApplyStyleToAllCaptions(textConfig)}
                    className="text-[10px] text-amber-300 bg-amber-500/20 hover:bg-amber-500/30 px-2 py-0.5 rounded border border-amber-500/40 font-bold transition cursor-pointer flex items-center space-x-1"
                    title={t.applyToAllCaptions}
                  >
                    <Sparkles className="w-2.5 h-2.5" />
                    <span>{language === 'km' ? 'ដាក់លើទាំងអស់' : 'Apply All'}</span>
                  </button>
                )}
              </div>

              {/* 2-column quick preset badges */}
              <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto custom-scrollbar pr-0.5">
                {CAPCUT_CAPTION_STYLES.map((st) => (
                  <button
                    key={st.id}
                    onClick={() =>
                      onUpdateTextConfig(selectedClip.id, {
                        ...st.config,
                        text: textConfig.text, // keep original line text
                      })
                    }
                    className="p-1.5 rounded-lg border border-[#27293d] bg-[#141522] hover:bg-[#1e2034] text-left transition cursor-pointer flex flex-col justify-between"
                  >
                    <span className="text-[9px] text-gray-400 truncate">{language === 'km' ? st.nameKm : st.name}</span>
                    <span
                      className="text-[11px] font-bold truncate mt-0.5 px-1 py-0.2 rounded"
                      style={{
                        color: st.config.color,
                        backgroundColor: st.config.backgroundColor || 'transparent',
                        textShadow: st.config.strokeWidth ? `0 0 2px ${st.config.strokeColor}` : 'none',
                      }}
                    >
                      {st.previewText}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Text Content */}
            <div>
              <span className="text-gray-300 block mb-1 font-medium">{language === 'km' ? 'អត្ថបទ Subtitle / Text' : 'Text Content'}</span>
              <textarea
                value={textConfig.text}
                onChange={(e) => onUpdateTextConfig(selectedClip.id, { text: e.target.value })}
                rows={3}
                className="w-full bg-[#1b1c2b] border border-[#2b2e44] focus:border-cyan-500 rounded p-2 text-xs text-gray-200 leading-relaxed resize-none focus:outline-none"
              />
            </div>

            {/* Font Family */}
            <div>
              <span className="text-gray-300 block mb-1 font-medium">{t.font}</span>
              <select
                value={textConfig.fontFamily || 'Inter'}
                onChange={(e) => onUpdateTextConfig(selectedClip.id, { fontFamily: e.target.value })}
                className="w-full bg-[#1b1c2b] border border-[#2b2e44] rounded p-1.5 text-xs text-gray-200 focus:outline-none cursor-pointer"
              >
                <option value="Inter">Inter (CapCut Standard Sans)</option>
                <option value="Kantumruy Pro">Kantumruy Pro (អក្សរខ្មែរស្រស់ច្បាស់)</option>
                <option value="JetBrains Mono">JetBrains Mono (Cyber Monospace)</option>
                <option value="sans-serif">System Sans-Serif</option>
              </select>
            </div>

            {/* Font Size */}
            <div>
              <div className="flex justify-between text-gray-300 mb-1 font-medium">
                <span>{t.fontSize}</span>
                <span className="font-mono text-cyan-400 font-bold">{textConfig.fontSize}px</span>
              </div>
              <input
                type="range"
                min="18"
                max="68"
                step="2"
                value={textConfig.fontSize}
                onChange={(e) =>
                  onUpdateTextConfig(selectedClip.id, { fontSize: parseInt(e.target.value, 10) })
                }
                className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-[#25283c] rounded-lg"
              />
            </div>

            {/* Text Color & Outline Color */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-[#181a28] p-2 rounded-lg border border-[#27293d]">
                <span className="text-gray-300 block mb-1 text-[11px] font-medium">{t.textColor}</span>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={textConfig.color}
                    onChange={(e) => onUpdateTextConfig(selectedClip.id, { color: e.target.value })}
                    className="w-7 h-7 bg-transparent cursor-pointer rounded border border-gray-700"
                  />
                  <span className="font-mono text-[10px] text-gray-400 uppercase">{textConfig.color}</span>
                </div>
              </div>

              <div className="bg-[#181a28] p-2 rounded-lg border border-[#27293d]">
                <span className="text-gray-300 block mb-1 text-[11px] font-medium">{language === 'km' ? 'បន្ទាត់ Outline' : 'Outline Color'}</span>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={textConfig.strokeColor || '#000000'}
                    onChange={(e) => onUpdateTextConfig(selectedClip.id, { strokeColor: e.target.value })}
                    className="w-7 h-7 bg-transparent cursor-pointer rounded border border-gray-700"
                  />
                  <span className="font-mono text-[10px] text-gray-400 uppercase">{textConfig.strokeColor || '#000000'}</span>
                </div>
              </div>
            </div>

            {/* Stroke (Outline) Width */}
            <div>
              <div className="flex justify-between text-gray-300 mb-1 font-medium">
                <span>{language === 'km' ? 'កម្រាស់បន្ទាត់ Outline' : 'Outline Thickness'}</span>
                <span className="font-mono text-cyan-400">{textConfig.strokeWidth || 0}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                step="0.5"
                value={textConfig.strokeWidth || 0}
                onChange={(e) =>
                  onUpdateTextConfig(selectedClip.id, { strokeWidth: parseFloat(e.target.value) })
                }
                className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-[#25283c] rounded-lg"
              />
            </div>

            {/* Background Pill Box */}
            <div className="space-y-1.5">
              <span className="text-gray-300 block font-medium">{language === 'km' ? 'ប្រអប់ផ្ទៃខាងក្រោយ (Background Box)' : 'Background Box'}</span>
              <div className="grid grid-cols-4 gap-1">
                {[
                  { label: 'Transparent', val: 'transparent' },
                  { label: 'Dark 80%', val: 'rgba(0,0,0,0.8)' },
                  { label: 'Red 85%', val: 'rgba(239,68,68,0.85)' },
                  { label: 'Navy 85%', val: 'rgba(15,23,42,0.85)' },
                ].map((bg) => (
                  <button
                    key={bg.val}
                    onClick={() => onUpdateTextConfig(selectedClip.id, { backgroundColor: bg.val })}
                    className={`py-1 rounded text-[10px] font-medium border transition cursor-pointer ${
                      textConfig.backgroundColor === bg.val
                        ? 'border-cyan-400 bg-cyan-600/30 text-cyan-300'
                        : 'border-[#282a3f] bg-[#1a1b28] text-gray-400 hover:text-white'
                    }`}
                  >
                    {bg.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Vertical Position Presets (yPercent) */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-gray-300 font-medium">
                <span>{language === 'km' ? 'ទីតាំងលើ Canvas (Y %)' : 'Vertical Position (Y %)'}</span>
                <span className="font-mono text-cyan-400">{textConfig.yPercent || 78}%</span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <button
                  onClick={() => onUpdateTextConfig(selectedClip.id, { yPercent: 25 })}
                  className={`py-1 rounded text-[11px] font-semibold border transition cursor-pointer ${
                    (textConfig.yPercent || 78) === 25 ? 'bg-cyan-600/40 text-cyan-300 border-cyan-400' : 'bg-[#181a28] text-gray-400 border-[#282a3f]'
                  }`}
                >
                  Top (25%)
                </button>
                <button
                  onClick={() => onUpdateTextConfig(selectedClip.id, { yPercent: 50 })}
                  className={`py-1 rounded text-[11px] font-semibold border transition cursor-pointer ${
                    (textConfig.yPercent || 78) === 50 ? 'bg-cyan-600/40 text-cyan-300 border-cyan-400' : 'bg-[#181a28] text-gray-400 border-[#282a3f]'
                  }`}
                >
                  Center (50%)
                </button>
                <button
                  onClick={() => onUpdateTextConfig(selectedClip.id, { yPercent: 78 })}
                  className={`py-1 rounded text-[11px] font-semibold border transition cursor-pointer ${
                    (textConfig.yPercent || 78) === 78 ? 'bg-cyan-600/40 text-cyan-300 border-cyan-400' : 'bg-[#181a28] text-gray-400 border-[#282a3f]'
                  }`}
                >
                  Subtitle (78%)
                </button>
              </div>
            </div>

            {/* Animation Style */}
            <div>
              <span className="text-gray-300 block mb-1 font-medium">{t.animation}</span>
              <select
                value={textConfig.animation}
                onChange={(e) => {
                  const newAnim = e.target.value as any;
                  onUpdateTextConfig(selectedClip.id, {
                    animation: newAnim,
                    wordStyle: newAnim === 'typewriter' ? undefined : textConfig.wordStyle,
                    animationConfig: {
                      ...(selectedClip.animation || textConfig.animationConfig || { preset: newAnim }),
                      preset: newAnim,
                    },
                  });
                  onUpdateClipAnimation?.(selectedClip.id, {
                    preset: newAnim,
                    duration: newAnim === 'typewriter' ? 1.6 : (selectedClip.animation?.duration || 0.6),
                  });
                }}
                className="w-full bg-[#1b1c2b] border border-[#2b2e44] focus:border-cyan-500 rounded p-1.5 text-xs text-gray-200 cursor-pointer"
              >
                <option value="typewriter">{language === 'km' ? '⌨️ វាយអក្សរ Typewriter (ម្ដងមួយតួ)' : '⌨️ Typewriter Letter-by-Letter (CapCut)'}</option>
                <option value="spring-pop">{language === 'km' ? '⚡ លោតស្ទុះ Spring Pop (Elastic)' : '⚡ Spring Pop (Elastic Damped Bounce)'}</option>
                <option value="keyframe-zoom-in">{language === 'km' ? '🔍 ពង្រីក Keyframe Zoom In' : '🔍 Keyframe Zoom In (Ken Burns Push)'}</option>
                <option value="keyframe-zoom-out">{language === 'km' ? '🔎 បង្រួម Keyframe Zoom Out' : '🔎 Keyframe Zoom Out (Pull Back)'}</option>
                <option value="pop">{language === 'km' ? '💥 Pop Entrance (Viral Hook)' : '💥 Pop Bounce (CapCut Viral Hook)'}</option>
                <option value="bounce">{language === 'km' ? '🔥 ចង្វាក់រស់រវើក Kinetic Pulse' : '🔥 Kinetic Pulse (MrBeast Style)'}</option>
                <option value="slide-up">{language === 'km' ? '⬆️ រំកិលឡើងលើ Smooth Slide Up' : '⬆️ Smooth Slide Up'}</option>
                <option value="slide-left">{language === 'km' ? '➡️ រំកិលពីឆ្វេង Smooth Slide Left' : '➡️ Smooth Slide Left'}</option>
                <option value="glitch">{language === 'km' ? '⚡ ភ្លឹបភ្លែត Glitch Flash Cyber' : '⚡ Glitch Flash Cyber'}</option>
                <option value="karaoke">{language === 'km' ? '🎤 រលក Karaoke Wave Glow' : '🎤 Karaoke Wave Glow'}</option>
                <option value="fade">{language === 'km' ? '✨ ភាពយន្តរលាយចូល Fade' : '✨ Smooth Cinema Fade'}</option>
                <option value="none">{language === 'km' ? 'គ្មានចលនា (Static None)' : 'Static None'}</option>
              </select>
            </div>
          </div>
        )}

        {/* 3. AUDIO TAB */}
        {activeTab === 'audio' && (
          <div className="space-y-3">
            {/* Volume */}
            <div>
              <div className="flex justify-between text-gray-300 mb-1">
                <span>{t.volume}</span>
                <span className="font-mono text-cyan-400">{Math.round(volume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                step="0.05"
                value={volume}
                onChange={(e) =>
                  onUpdateClipAudio(selectedClip.id, parseFloat(e.target.value), fadeIn, fadeOut)
                }
                className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-[#25283c] rounded-lg"
              />
            </div>

            {/* Fade In */}
            <div>
              <div className="flex justify-between text-gray-300 mb-1">
                <span>Fade In</span>
                <span className="font-mono text-cyan-400">{fadeIn}s</span>
              </div>
              <input
                type="range"
                min="0"
                max="3"
                step="0.1"
                value={fadeIn}
                onChange={(e) =>
                  onUpdateClipAudio(selectedClip.id, volume, parseFloat(e.target.value), fadeOut)
                }
                className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-[#25283c] rounded-lg"
              />
            </div>

            {/* Fade Out */}
            <div>
              <div className="flex justify-between text-gray-300 mb-1">
                <span>Fade Out</span>
                <span className="font-mono text-cyan-400">{fadeOut}s</span>
              </div>
              <input
                type="range"
                min="0"
                max="3"
                step="0.1"
                value={fadeOut}
                onChange={(e) =>
                  onUpdateClipAudio(selectedClip.id, volume, fadeIn, parseFloat(e.target.value))
                }
                className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-[#25283c] rounded-lg"
              />
            </div>
          </div>
        )}

        {/* 4. SPEED TAB */}
        {activeTab === 'speed' && (
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-gray-300 mb-1">
                <span>{t.speed}</span>
                <span className="font-mono text-cyan-400">{speed}x</span>
              </div>
              <input
                type="range"
                min="0.25"
                max="3.0"
                step="0.25"
                value={speed}
                onChange={(e) =>
                  onUpdateClipSpeed(selectedClip.id, parseFloat(e.target.value))
                }
                className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-[#25283c] rounded-lg"
              />
            </div>

            {/* Preset speed buttons */}
            <div className="grid grid-cols-4 gap-1 pt-1">
              {[0.5, 1.0, 1.5, 2.0].map((s) => (
                <button
                  key={s}
                  onClick={() => onUpdateClipSpeed(selectedClip.id, s)}
                  className={`py-1 rounded text-xs border ${
                    speed === s
                      ? 'bg-cyan-600 border-cyan-500 text-white'
                      : 'bg-[#1a1b28] border-[#292b3f] text-gray-400 hover:text-white'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 5. COLOR & FILTER TAB */}
        {activeTab === 'color' && (
          <div className="space-y-3">
            {/* Brightness */}
            <div>
              <div className="flex justify-between text-gray-300 mb-1">
                <span>{t.brightness}</span>
                <span className="font-mono text-cyan-400">{filters.brightness}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="150"
                value={filters.brightness}
                onChange={(e) =>
                  onUpdateClipFilters(selectedClip.id, { brightness: parseInt(e.target.value, 10) })
                }
                className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-[#25283c] rounded-lg"
              />
            </div>

            {/* Contrast */}
            <div>
              <div className="flex justify-between text-gray-300 mb-1">
                <span>{t.contrast}</span>
                <span className="font-mono text-cyan-400">{filters.contrast}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="150"
                value={filters.contrast}
                onChange={(e) =>
                  onUpdateClipFilters(selectedClip.id, { contrast: parseInt(e.target.value, 10) })
                }
                className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-[#25283c] rounded-lg"
              />
            </div>

            {/* Saturation */}
            <div>
              <div className="flex justify-between text-gray-300 mb-1">
                <span>{t.saturation}</span>
                <span className="font-mono text-cyan-400">{filters.saturate}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="200"
                value={filters.saturate}
                onChange={(e) =>
                  onUpdateClipFilters(selectedClip.id, { saturate: parseInt(e.target.value, 10) })
                }
                className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-[#25283c] rounded-lg"
              />
            </div>

            {/* Vignette */}
            <div>
              <div className="flex justify-between text-gray-300 mb-1">
                <span>{t.vignette}</span>
                <span className="font-mono text-cyan-400">{filters.vignette}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="80"
                value={filters.vignette}
                onChange={(e) =>
                  onUpdateClipFilters(selectedClip.id, { vignette: parseInt(e.target.value, 10) })
                }
                className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-[#25283c] rounded-lg"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
