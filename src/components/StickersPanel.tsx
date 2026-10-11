import React from 'react';
import { Smile, Plus } from 'lucide-react';
import { MediaItem } from '../types/editor';
import { Language } from '../utils/i18n';

interface StickersPanelProps {
  onAddSticker: (item: MediaItem) => void;
  language: Language;
}

export const StickersPanel: React.FC<StickersPanelProps> = ({ onAddSticker, language }) => {
  const stickers: { name: string; url: string; preview: string }[] = [
    {
      name: 'Subscribe Button',
      url: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=500&auto=format&fit=crop&q=80',
      preview: '🔴 SUBSCRIBE',
    },
    {
      name: 'Angkor Wat Icon',
      url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&auto=format&fit=crop&q=80',
      preview: '🏛️ ANGKOR WAT',
    },
    {
      name: 'Fire Emoji Flare',
      url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=300&auto=format&fit=crop&q=80',
      preview: '🔥 VIRAL FIRE',
    },
    {
      name: 'Verified Checkmark',
      url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=300&auto=format&fit=crop&q=80',
      preview: '✅ VERIFIED',
    },
  ];

  return (
    <div className="h-full flex flex-col p-3 text-xs bg-[#151620] overflow-y-auto space-y-3">
      <div className="font-semibold text-gray-200 flex items-center gap-1.5">
        <Smile className="w-3.5 h-3.5 text-cyan-400" />
        <span>{language === 'km' ? 'ស្ទីកឃ័រ & រូបតំណាង (Stickers)' : 'Stickers & Graphic Badges'}</span>
      </div>
      <p className="text-[10px] text-gray-400">
        {language === 'km'
          ? 'បន្ថែម Sticker និងរូបភាព Overlay លើវីដេអូ'
          : 'Overlay viral call-to-actions, stickers, and badges onto your video.'}
      </p>

      <div className="grid grid-cols-2 gap-2.5">
        {stickers.map((stk, idx) => (
          <div
            key={idx}
            onClick={() =>
              onAddSticker({
                id: `sticker-${Date.now()}-${idx}`,
                name: stk.name,
                type: 'image',
                url: stk.url,
                duration: 4,
                thumbnail: stk.url,
                category: 'stickers',
              })
            }
            className="p-3 bg-[#1a1b28] hover:bg-[#222436] rounded-lg border border-[#27293d] hover:border-cyan-500/50 flex flex-col items-center justify-center text-center cursor-pointer transition group"
          >
            <div className="text-xl mb-1 group-hover:scale-110 transition">{stk.preview.split(' ')[0]}</div>
            <div className="text-gray-200 font-medium text-[11px] truncate w-full">{stk.name}</div>
            <span className="text-[9px] text-cyan-400 mt-1 flex items-center gap-0.5">
              <Plus className="w-3 h-3" /> Add
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
