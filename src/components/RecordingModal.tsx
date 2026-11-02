import React, { useState } from 'react';
import { RecordedVideoResult } from '../recorder/videoRecorder';
import { X, Download, Share2, Film, Check } from 'lucide-react';

interface RecordingModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: RecordedVideoResult | null;
}

export const RecordingModal: React.FC<RecordingModalProps> = ({
  isOpen,
  onClose,
  result,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !result) return null;

  const durationSec = (result.durationMs / 1000).toFixed(1);
  const sizeMb = (result.blob.size / (1024 * 1024)).toFixed(2);

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = result.url;
    a.download = `CelestialPyro_Show_${new Date().toISOString().slice(0, 10)}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        const file = new File([result.blob], 'fireworks_show.webm', { type: result.blob.type });
        await navigator.share({
          title: 'Celestial Pyro - 我的 3D 高空煙火秀',
          text: '快來看看我親手編排的 3D 高空音樂煙火表演！🎆✨',
          files: [file],
        });
      } catch {
        // Fallback or user canceled
      }
    } else {
      // Copy download link or notify
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2">
            <Film className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white">煙火表演錄影導出完成</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Player */}
        <div className="p-6 space-y-4">
          <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden border border-slate-800 shadow-inner">
            <video
              src={result.url}
              controls
              autoPlay
              loop
              className="w-full h-full object-contain"
            />
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
            <span>
              時長：<strong className="text-slate-200">{durationSec} 秒</strong>
            </span>
            <span>
              檔案大小：<strong className="text-slate-200">{sizeMb} MB</strong>
            </span>
            <span>
              格式：<strong className="text-slate-200">WebM (60 FPS 高清)</strong>
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/80">
          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 transition text-xs font-semibold"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            <span>{copied ? '已準備分享！' : '分享給好友 (Share)'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition text-xs font-medium"
            >
              關閉
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition shadow-lg shadow-emerald-500/25 active:scale-95 text-xs"
            >
              <Download className="w-4 h-4" />
              <span>下載影片檔 (Download)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
