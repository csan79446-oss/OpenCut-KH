import React, { useState, useRef } from 'react';
import {
  X,
  Download,
  Film,
  Sparkles,
  CheckCircle2,
  Loader2,
  HardDrive,
} from 'lucide-react';
import { AspectRatio, TimelineClip, TimelineTrack } from '../types/editor';
import { getResolutionForAspectRatio, renderCanvasFrame } from '../utils/videoRenderer';
import { Language, translations } from '../utils/i18n';
import { soundEngine } from '../utils/soundEngine';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  aspectRatio: AspectRatio;
  totalDuration: number;
  clips: TimelineClip[];
  tracks: TimelineTrack[];
  projectTitle: string;
  language: Language;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  aspectRatio,
  totalDuration,
  clips,
  tracks,
  projectTitle,
  language,
}) => {
  const t = translations[language];

  const [resolutionQuality, setResolutionQuality] = useState<'720p' | '1080p' | '4k'>('1080p');
  const [fps, setFps] = useState<30 | 60>(30);
  const [format, setFormat] = useState<'webm' | 'mp4'>('webm');
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  if (!isOpen) return null;

  const { width, height } = getResolutionForAspectRatio(aspectRatio, resolutionQuality);

  // Render & Export video using MediaRecorder and offscreen canvas
  const handleStartExport = async () => {
    setIsExporting(true);
    setProgress(0);
    setDownloadUrl(null);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setIsExporting(false);
      return;
    }

    try {
      const stream = canvas.captureStream(fps);
      const audioDest = soundEngine.getMediaStreamDestination();
      if (audioDest && audioDest.stream.getAudioTracks().length > 0) {
        stream.addTrack(audioDest.stream.getAudioTracks()[0]);
      }

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : MediaRecorder.isTypeSupported('video/webm')
        ? 'video/webm'
        : 'video/mp4';

      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        soundEngine.stopPlayback();
        const finalBlob = new Blob(chunks, { type: mimeType });
        const url = URL.createObjectURL(finalBlob);
        setDownloadUrl(url);
        setIsExporting(false);
        setProgress(100);
      };

      soundEngine.syncTimelineAudio(0, true, clips, tracks);
      recorder.start();

      // Step through time at target framerate
      const totalFrames = Math.max(1, Math.floor(totalDuration * fps));
      const dt = 1 / fps;
      const mediaMap = new Map();

      for (let frame = 0; frame <= totalFrames; frame++) {
        const time = frame * dt;
        renderCanvasFrame(ctx, width, height, time, clips, tracks, mediaMap);
        soundEngine.syncTimelineAudio(time, true, clips, tracks);
        setProgress(Math.round((frame / totalFrames) * 100));
        // Yield to browser event loop
        await new Promise((r) => setTimeout(r, 8));
      }

      recorder.stop();
    } catch (err) {
      console.error('Export error:', err);
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[#141522] border border-[#27293d] rounded-2xl shadow-2xl p-6 text-xs text-gray-200 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#232537] pb-3">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center">
              <Film className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">{t.exportVideo}</h3>
              <p className="text-[11px] text-gray-400">{projectTitle || 'Untitled Project'}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-[#202232] text-gray-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Export Settings */}
        <div className="space-y-4">
          {/* Resolution */}
          <div>
            <label className="block text-gray-300 font-semibold mb-1.5">
              Resolution ({width} × {height} px)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['720p', '1080p', '4k'] as const).map((res) => (
                <button
                  key={res}
                  onClick={() => setResolutionQuality(res)}
                  className={`py-2 px-3 rounded-lg border font-semibold uppercase text-center transition ${
                    resolutionQuality === res
                      ? 'bg-cyan-600 border-cyan-400 text-white shadow-md shadow-cyan-900/30'
                      : 'bg-[#1a1b28] border-[#292b3e] text-gray-400 hover:text-white'
                  }`}
                >
                  {res}
                </button>
              ))}
            </div>
          </div>

          {/* Framerate & Format */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-300 font-semibold mb-1.5">Frame Rate (FPS)</label>
              <div className="flex space-x-2">
                {[30, 60].map((rate) => (
                  <button
                    key={rate}
                    onClick={() => setFps(rate as any)}
                    className={`flex-1 py-1.5 rounded-lg border font-semibold text-center transition ${
                      fps === rate
                        ? 'bg-cyan-600 border-cyan-400 text-white'
                        : 'bg-[#1a1b28] border-[#292b3e] text-gray-400 hover:text-white'
                    }`}
                  >
                    {rate} FPS
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-gray-300 font-semibold mb-1.5">Format</label>
              <div className="flex space-x-2">
                {(['webm', 'mp4'] as const).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setFormat(fmt)}
                    className={`flex-1 py-1.5 rounded-lg border font-semibold uppercase text-center transition ${
                      format === fmt
                        ? 'bg-cyan-600 border-cyan-400 text-white'
                        : 'bg-[#1a1b28] border-[#292b3e] text-gray-400 hover:text-white'
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Project Spec summary */}
          <div className="p-3 bg-[#11121d] rounded-xl border border-[#232537] flex items-center justify-between text-[11px] text-gray-400">
            <div>
              <span>Duration: ~{Math.round(totalDuration)}s</span>
              <span className="mx-2">•</span>
              <span>Aspect: {aspectRatio}</span>
            </div>
            <div className="flex items-center space-x-1 text-cyan-400 font-medium">
              <HardDrive className="w-3.5 h-3.5" />
              <span>~{Math.round((totalDuration * (resolutionQuality === '4k' ? 12 : 3.5)))} MB</span>
            </div>
          </div>

          {/* Export Progress Bar */}
          {isExporting && (
            <div className="space-y-2 pt-2">
              <div className="flex justify-between font-semibold text-xs text-gray-300">
                <span className="flex items-center gap-1.5 text-cyan-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Rendering frames...
                </span>
                <span className="font-mono">{progress}%</span>
              </div>
              <div className="w-full bg-[#1b1c2b] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-cyan-500 to-blue-600 h-full rounded-full transition-all duration-150"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Download ready button */}
          {downloadUrl && (
            <div className="p-3 bg-emerald-950/30 border border-emerald-500/40 rounded-xl flex items-center justify-between">
              <div className="flex items-center space-x-2 text-emerald-400 font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                <span>{t.exportComplete}</span>
              </div>
              <a
                href={downloadUrl}
                download={`${projectTitle || 'OpenCut_Video'}.${format}`}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold flex items-center gap-1.5 transition shadow"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </a>
            </div>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="flex justify-end space-x-2.5 pt-3 border-t border-[#232537]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#1a1b28] hover:bg-[#222436] text-gray-300 font-medium transition"
          >
            Cancel
          </button>

          {!downloadUrl && (
            <button
              onClick={handleStartExport}
              disabled={isExporting}
              className="px-5 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold flex items-center gap-1.5 shadow-md shadow-cyan-900/40 transition active:scale-95 disabled:opacity-50"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Rendering...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Start Export</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
