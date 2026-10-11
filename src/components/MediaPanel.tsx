import React, { useRef, useState } from 'react';
import {
  Upload,
  Video,
  Music,
  Image as ImageIcon,
  Plus,
  Play,
  Trash2,
  Camera,
  StopCircle,
} from 'lucide-react';
import { MediaItem } from '../types/editor';
import { Language, translations } from '../utils/i18n';

interface MediaPanelProps {
  mediaLibrary: MediaItem[];
  onAddMediaToLibrary: (media: MediaItem) => void;
  onRemoveMediaFromLibrary: (id: string) => void;
  onAddClipToTimeline: (media: MediaItem) => void;
  language: Language;
}

export const MediaPanel: React.FC<MediaPanelProps> = ({
  mediaLibrary,
  onAddMediaToLibrary,
  onRemoveMediaFromLibrary,
  onAddClipToTimeline,
  language,
}) => {
  const t = translations[language];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [filterType, setFilterType] = useState<'all' | 'video' | 'audio' | 'image'>('all');
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Handle local file uploads with real metadata & thumbnail extraction
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement> | { target: { files: FileList | File[] } }) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const url = URL.createObjectURL(file);
      const isVideo = file.type.startsWith('video');
      const isAudio = file.type.startsWith('audio');
      const isImage = file.type.startsWith('image');

      if (isVideo) {
        // Extract real video duration and canvas thumbnail
        const vid = document.createElement('video');
        vid.preload = 'metadata';
        vid.muted = true;
        vid.src = url;
        vid.onloadedmetadata = () => {
          const duration = Math.round(vid.duration || 10);
          vid.currentTime = Math.min(1, duration * 0.1);
        };
        vid.onseeked = () => {
          const c = document.createElement('canvas');
          c.width = 160;
          c.height = 90;
          const ctx = c.getContext('2d');
          if (ctx) {
            ctx.drawImage(vid, 0, 0, 160, 90);
            const thumb = c.toDataURL('image/jpeg', 0.7);
            const newItem: MediaItem = {
              id: `user-video-${Date.now()}-${i}`,
              name: file.name.replace(/\.[^/.]+$/, ''),
              type: 'video',
              url,
              duration: Math.round(vid.duration || 10),
              thumbnail: thumb,
              width: vid.videoWidth || 1920,
              height: vid.videoHeight || 1080,
            };
            onAddMediaToLibrary(newItem);
          }
        };
        vid.onerror = () => {
          onAddMediaToLibrary({
            id: `user-video-${Date.now()}-${i}`,
            name: file.name.replace(/\.[^/.]+$/, ''),
            type: 'video',
            url,
            duration: 10,
          });
        };
      } else if (isAudio) {
        const audio = new Audio();
        audio.src = url;
        audio.onloadedmetadata = () => {
          const newItem: MediaItem = {
            id: `user-audio-${Date.now()}-${i}`,
            name: file.name.replace(/\.[^/.]+$/, ''),
            type: 'audio',
            url,
            duration: Math.round(audio.duration || 15),
          };
          onAddMediaToLibrary(newItem);
        };
        audio.onerror = () => {
          onAddMediaToLibrary({
            id: `user-audio-${Date.now()}-${i}`,
            name: file.name.replace(/\.[^/.]+$/, ''),
            type: 'audio',
            url,
            duration: 15,
          });
        };
      } else {
        const newItem: MediaItem = {
          id: `user-img-${Date.now()}-${i}`,
          name: file.name.replace(/\.[^/.]+$/, ''),
          type: 'image',
          url,
          duration: 5,
          thumbnail: url,
        };
        onAddMediaToLibrary(newItem);
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Webcam record
  const startCameraRecord = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      recordedChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };
      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const newItem: MediaItem = {
          id: `webcam-${Date.now()}`,
          name: `Webcam Clip ${new Date().toLocaleTimeString()}`,
          type: 'video',
          url,
          duration: 10,
        };
        onAddMediaToLibrary(newItem);
        stream.getTracks().forEach((track) => track.stop());
        setIsRecording(false);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      console.warn('Webcam recording error:', err);
    }
  };

  const stopCameraRecord = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  };

  const filteredMedia = mediaLibrary.filter((item) => {
    if (filterType === 'all') return true;
    return item.type === filterType;
  });

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          handleFileUpload({ target: { files: e.dataTransfer.files } });
        }
      }}
      className="h-full flex flex-col p-3 text-xs bg-[#151620] overflow-y-auto"
    >
      {/* Upload & Record Buttons */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col items-center justify-center p-3 rounded-lg border border-dashed border-[#34374c] hover:border-cyan-500/80 bg-[#1a1b28] hover:bg-[#202234] transition text-center group cursor-pointer"
        >
          <Upload className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition mb-1" />
          <span className="font-semibold text-gray-200">{t.uploadMedia}</span>
          <span className="text-[10px] text-gray-400">MP4, MOV, MP3, PNG</span>
        </button>

        <button
          onClick={isRecording ? stopCameraRecord : startCameraRecord}
          className={`flex flex-col items-center justify-center p-3 rounded-lg border transition text-center group ${
            isRecording
              ? 'border-rose-500 bg-rose-500/10 text-rose-300 animate-pulse'
              : 'border-[#34374c] hover:border-rose-500/80 bg-[#1a1b28] hover:bg-[#202234] text-gray-300'
          }`}
        >
          {isRecording ? (
            <>
              <StopCircle className="w-4 h-4 text-rose-500 mb-1" />
              <span className="font-semibold text-rose-400">{t.stopRecording}</span>
              <span className="text-[10px] text-rose-300">Recording...</span>
            </>
          ) : (
            <>
              <Camera className="w-4 h-4 text-rose-400 group-hover:scale-110 transition mb-1" />
              <span className="font-semibold text-gray-200">{t.recordCamera}</span>
              <span className="text-[10px] text-gray-400">Video + Mic</span>
            </>
          )}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="video/*,audio/*,image/*"
          className="hidden"
          onChange={handleFileUpload}
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-1 p-1 bg-[#12131c] rounded-md mb-3 border border-[#232535]">
        {(['all', 'video', 'audio', 'image'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`flex-1 py-1 rounded text-[11px] font-medium capitalize transition ${
              filterType === type
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {type === 'all'
              ? t.allMedia
              : type === 'video'
              ? t.videos
              : type === 'audio'
              ? t.audios
              : t.images}
          </button>
        ))}
      </div>

      {/* Media Items Grid */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        {filteredMedia.length === 0 ? (
          <div className="text-center py-10 text-gray-500 text-xs">
            {language === 'km' ? 'មិនមានឯកសារមេឌៀទេ' : 'No media items found'}
          </div>
        ) : (
          filteredMedia.map((item) => (
            <div
              key={item.id}
              className="group relative flex items-center space-x-2.5 p-2 bg-[#1b1d2a] hover:bg-[#222436] rounded-lg border border-[#27293d] hover:border-cyan-500/50 transition"
            >
              {/* Media Thumbnail / Icon */}
              <div className="w-14 h-11 bg-[#10111a] rounded overflow-hidden flex items-center justify-center shrink-0 border border-[#2e3146] relative">
                {item.thumbnail ? (
                  <img src={item.thumbnail} alt={item.name} className="w-full h-full object-cover" />
                ) : item.type === 'video' ? (
                  <Video className="w-5 h-5 text-cyan-400" />
                ) : item.type === 'audio' ? (
                  <Music className="w-5 h-5 text-purple-400" />
                ) : (
                  <ImageIcon className="w-5 h-5 text-emerald-400" />
                )}

                {/* Duration badge */}
                {item.duration > 0 && (
                  <span className="absolute bottom-0.5 right-0.5 bg-black/80 text-[9px] px-1 rounded text-gray-300 font-mono">
                    {Math.round(item.duration)}s
                  </span>
                )}
              </div>

              {/* Title & info */}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-gray-200 truncate group-hover:text-cyan-300 transition">
                  {item.name}
                </div>
                <div className="text-[10px] text-gray-400 flex items-center space-x-2 mt-0.5">
                  <span className="uppercase text-[9px] font-semibold text-gray-500 bg-[#25283c] px-1 py-0.2 rounded">
                    {item.type}
                  </span>
                  <span>{item.duration}s</span>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center space-x-1 opacity-90 group-hover:opacity-100">
                <button
                  onClick={() => onAddClipToTimeline(item)}
                  className="p-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded shadow transition"
                  title={t.addToTimeline}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onRemoveMediaFromLibrary(item.id)}
                  className="p-1.5 hover:bg-rose-500/20 text-gray-500 hover:text-rose-400 rounded transition"
                  title="Remove"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
