import React from 'react';
import {
  FolderOpen,
  Scissors,
  Music,
  Type,
  SlidersHorizontal,
  Layers,
  Smile,
  LucideIcon,
} from 'lucide-react';
import { Language, translations } from '../utils/i18n';

export type SidebarTab = 'media' | 'autocut' | 'audio' | 'text' | 'effects' | 'transitions' | 'stickers';

interface SidebarTabsProps {
  activeTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
  language: Language;
}

interface TabItem {
  id: SidebarTab;
  labelKey: keyof typeof translations.en;
  icon: LucideIcon;
  badge?: string;
  badgeColor?: string;
}

export const SidebarTabs: React.FC<SidebarTabsProps> = ({ activeTab, onTabChange, language }) => {
  const t = translations[language];

  const tabs: TabItem[] = [
    { id: 'media', labelKey: 'tabMedia', icon: FolderOpen },
    { id: 'autocut', labelKey: 'tabAutoCut', icon: Scissors, badge: 'AI', badgeColor: 'bg-rose-500' },
    { id: 'audio', labelKey: 'tabAudio', icon: Music },
    { id: 'text', labelKey: 'tabText', icon: Type, badge: 'AUTO', badgeColor: 'bg-cyan-500' },
    { id: 'effects', labelKey: 'tabEffects', icon: SlidersHorizontal },
    { id: 'transitions', labelKey: 'tabTransitions', icon: Layers },
    { id: 'stickers', labelKey: 'tabStickers', icon: Smile },
  ];

  return (
    <nav className="w-18 bg-[#12131b] border-r border-[#20212f] flex flex-col items-center py-2 shrink-0 select-none">
      <div className="w-full flex flex-col space-y-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const label = t[tab.labelKey] as string;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative w-full py-2.5 px-1 flex flex-col items-center justify-center text-center transition group ${
                isActive
                  ? 'text-cyan-400 bg-[#1c1e2b]'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#171822]'
              }`}
              title={label}
            >
              {/* Active left indicator bar */}
              {isActive && (
                <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-cyan-400 rounded-r" />
              )}

              <div className="relative">
                <Icon className={`w-5 h-5 transition ${isActive ? 'scale-110' : 'group-hover:scale-105'}`} />
                {tab.badge && (
                  <span
                    className={`absolute -top-1.5 -right-3 text-[8px] font-bold px-1 py-0.2 rounded-full text-white ${
                      tab.badgeColor || 'bg-cyan-500'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </div>

              <span className="text-[10px] font-medium mt-1.5 line-clamp-1 px-1 tracking-tight">
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
