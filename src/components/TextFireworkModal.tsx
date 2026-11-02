import React, { useState } from 'react';
import { ShellConfig } from '../types/fireworks';
import { parseFireworkCommand } from '../fireworks/aiPromptParser';
import { X, Sparkles, Send, Type, HelpCircle } from 'lucide-react';

interface TextFireworkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLaunch: (config: ShellConfig) => void;
}

const EXAMPLE_PROMPTS = [
  { label: '新年快樂 2026', cmd: '2026 新年快樂' },
  { label: '金色愛心流星', cmd: '超大金色愛心伴隨流星雨' },
  { label: '七彩土星雙環', cmd: '七彩土星環帶綠色閃爍' },
  { label: '浪漫櫻花粉牡丹', cmd: '浪漫櫻花粉色巨大牡丹' },
  { label: '平安吉祥祝福', cmd: '平安吉祥' },
  { label: '極光翠綠瀑布', cmd: '極光翠綠色銀河瀑布' },
  { label: 'LOVE 煙火', cmd: 'LOVE' },
];

export const TextFireworkModal: React.FC<TextFireworkModalProps> = ({
  isOpen,
  onClose,
  onLaunch,
}) => {
  const [inputVal, setInputVal] = useState('2026');
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputVal.trim()) return;

    const result = parseFireworkCommand(inputVal);
    setFeedback(result.message);
    onLaunch(result.config);
  };

  const handleSelectExample = (cmd: string) => {
    setInputVal(cmd);
    const result = parseFireworkCommand(cmd);
    setFeedback(result.message);
    onLaunch(result.config);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2">
            <Type className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-white">文字與指令生成煙火 (Text & AI Prompt)</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-sm text-slate-200">
          <div>
            <label className="block text-xs font-semibold tracking-wider text-slate-400 uppercase mb-2">
              輸入文字字樣或自然語言生成指令
            </label>
            <div className="relative">
              <input
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="例如：2026、LOVE、超大金色愛心、翡翠綠土星環..."
                className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 text-sm"
                autoFocus
              />
              <button
                type="submit"
                className="absolute right-2 top-2 bottom-2 px-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg flex items-center gap-1.5 transition text-xs shadow-md shadow-cyan-500/20"
              >
                <Send className="w-3.5 h-3.5" />
                <span>發射 (Launch)</span>
              </button>
            </div>
          </div>

          {/* Feedback message */}
          {feedback && (
            <div className="p-3 bg-cyan-950/40 border border-cyan-800/60 rounded-xl text-xs text-cyan-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400 flex-shrink-0" />
              <span>{feedback}</span>
            </div>
          )}

          {/* Example prompt pills */}
          <div>
            <div className="text-xs text-slate-400 mb-2 flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>點擊範例指令即刻試射：</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_PROMPTS.map((ex) => (
                <button
                  key={ex.label}
                  type="button"
                  onClick={() => handleSelectExample(ex.cmd)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 hover:border-slate-500 transition text-xs flex items-center gap-1.5"
                >
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>{ex.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-1">
            <div className="font-semibold text-slate-300">💡 支援兩大模式：</div>
            <div>• <b>文字陣列</b>：輸入英數字或中文字詞，粒子將於夜空依筆畫精確排成立體高空字樣！</div>
            <div>• <b>智慧指令</b>：包含顏色（金、粉、藍、紫、綠、彩虹）與形狀（心形、土星環、牡丹、柳垂、瀑布）等自然描述。</div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex justify-end px-6 py-4 border-t border-slate-800 bg-slate-950/80">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition text-xs font-medium"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
};
