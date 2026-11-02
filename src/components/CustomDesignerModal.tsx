import React, { useState } from 'react';
import { FireworkShape, ShellConfig } from '../types/fireworks';
import { X, Sparkles, Flame, Sliders, Play, Check } from 'lucide-react';

interface CustomDesignerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfig: ShellConfig;
  onApplyConfig: (config: ShellConfig) => void;
  onTestLaunch: (config: ShellConfig) => void;
}

const SHAPES: { id: FireworkShape; name: string; desc: string }[] = [
  { id: 'peony', name: '牡丹 Peony', desc: '經典球形飽滿綻放' },
  { id: 'chrysanthemum', name: '菊花 Chrysanthemum', desc: '金色長燃拖尾飛花' },
  { id: 'kamuro', name: '錦冠金柳 Kamuro', desc: '極致瀑布垂淚長金冠' },
  { id: 'saturn', name: '土星光環 Saturn', desc: '核心球伴隨傾斜行星環' },
  { id: 'heart', name: '浪漫愛心 Heart', desc: '立體愛心拓撲綻放' },
  { id: 'star', name: '璀璨星芒 Star', desc: '五角星立體破空星火' },
  { id: 'doubleRing', name: '同心雙環 Double Ring', desc: '雙層內外對比色光環' },
  { id: 'spiral', name: '旋轉金龍 Spiral', desc: '飛升旋渦多翼軌跡' },
  { id: 'strobe', name: '百花閃爍 Strobe', desc: '高頻微爆閃耀星雲' },
  { id: 'waterfall', name: '銀河瀑布 Waterfall', desc: '高空橫向流洩飛瀑' },
  { id: 'crossette', name: '裂變十字 Crossette', desc: '空中分段二級爆裂' },
];

const COLOR_PALETTES = [
  { name: '帝皇純金', primary: '#FFD700', secondary: '#FFA500', flash: '#FFFDE7' },
  { name: '霓虹青藍', primary: '#00E5FF', secondary: '#2979FF', flash: '#E0F7FA' },
  { name: '櫻花緋紅', primary: '#FF69B4', secondary: '#FF1493', flash: '#FFE4E1' },
  { name: '極光翠綠', primary: '#00E676', secondary: '#00B0FF', flash: '#E8F5E9' },
  { name: '暗夜紫晶', primary: '#D500F9', secondary: '#7C4DFF', flash: '#F3E5F5' },
  { name: '熱烈朱砂', primary: '#FF1744', secondary: '#FF9100', flash: '#FFF3E0' },
  { name: '白銀霜雪', primary: '#FFFFFF', secondary: '#90CAF9', flash: '#FFFFFF' },
];

export const CustomDesignerModal: React.FC<CustomDesignerModalProps> = ({
  isOpen,
  onClose,
  currentConfig,
  onApplyConfig,
  onTestLaunch,
}) => {
  const [config, setConfig] = useState<ShellConfig>({ ...currentConfig });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-white">煙火造型工坊 (Pyro Lab)</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-200">
          {/* Shape Selector */}
          <div>
            <label className="block text-xs font-semibold tracking-wider text-slate-400 uppercase mb-3">
              1. 綻放造型選擇 (Burst Geometry)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SHAPES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setConfig({ ...config, shape: s.id })}
                  className={`p-3 text-left rounded-xl border transition flex flex-col justify-between ${
                    config.shape === s.id
                      ? 'bg-amber-500/20 border-amber-400 text-amber-200 shadow-sm shadow-amber-500/20'
                      : 'bg-slate-800/60 border-slate-700/80 hover:bg-slate-800 hover:border-slate-600'
                  }`}
                >
                  <span className="font-semibold">{s.name}</span>
                  <span className="text-[11px] text-slate-400 mt-1">{s.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Color Palettes & Custom Pickers */}
          <div>
            <label className="block text-xs font-semibold tracking-wider text-slate-400 uppercase mb-3">
              2. 焰色配置 (Color & Spark Palette)
            </label>

            {/* Quick Presets */}
            <div className="flex flex-wrap gap-2 mb-4">
              {COLOR_PALETTES.map((pal) => (
                <button
                  key={pal.name}
                  onClick={() =>
                    setConfig({
                      ...config,
                      primaryColor: pal.primary,
                      secondaryColor: pal.secondary,
                      flashColor: pal.flash,
                    })
                  }
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:border-slate-500 transition text-xs"
                >
                  <div className="flex items-center -space-x-1">
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-black/40"
                      style={{ backgroundColor: pal.primary }}
                    />
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-black/40"
                      style={{ backgroundColor: pal.secondary }}
                    />
                  </div>
                  <span>{pal.name}</span>
                </button>
              ))}
            </div>

            {/* Manual Color Pickers */}
            <div className="grid grid-cols-3 gap-3 bg-slate-950/40 p-3 rounded-xl border border-slate-800">
              <div>
                <span className="text-xs text-slate-400 block mb-1">主焰色 (Primary)</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={config.primaryColor}
                    onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                    className="w-8 h-8 rounded cursor-pointer bg-transparent border-0"
                  />
                  <span className="font-mono text-xs">{config.primaryColor}</span>
                </div>
              </div>
              <div>
                <span className="text-xs text-slate-400 block mb-1">尾焰/次色 (Secondary)</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={config.secondaryColor}
                    onChange={(e) => setConfig({ ...config, secondaryColor: e.target.value })}
                    className="w-8 h-8 rounded cursor-pointer bg-transparent border-0"
                  />
                  <span className="font-mono text-xs">{config.secondaryColor}</span>
                </div>
              </div>
              <div>
                <span className="text-xs text-slate-400 block mb-1">初爆閃光 (Flash)</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={config.flashColor}
                    onChange={(e) => setConfig({ ...config, flashColor: e.target.value })}
                    className="w-8 h-8 rounded cursor-pointer bg-transparent border-0"
                  />
                  <span className="font-mono text-xs">{config.flashColor}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Physics Sliders */}
          <div>
            <label className="block text-xs font-semibold tracking-wider text-slate-400 uppercase mb-3 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5" />
              3. 物理動力參數 (Explosion Physics)
            </label>

            <div className="space-y-4 bg-slate-950/40 p-4 rounded-xl border border-slate-800">
              {/* Particle Count */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300">粒子火星數量 (Sparks Count)</span>
                  <span className="font-mono text-amber-400">{config.particleCount} 枚</span>
                </div>
                <input
                  type="range"
                  min="300"
                  max="1500"
                  step="50"
                  value={config.particleCount}
                  onChange={(e) => setConfig({ ...config, particleCount: Number(e.target.value) })}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              {/* Burst Force */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300">爆炸爆速半徑 (Burst Force)</span>
                  <span className="font-mono text-amber-400">{config.burstForce}</span>
                </div>
                <input
                  type="range"
                  min="25"
                  max="65"
                  step="1"
                  value={config.burstForce}
                  onChange={(e) => setConfig({ ...config, burstForce: Number(e.target.value) })}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              {/* Launch Altitude */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300">目標引爆高度 (Launch Altitude - 最高支援 280m 超高空)</span>
                  <span className="font-mono text-amber-400">{config.launchAltitude} 米</span>
                </div>
                <input
                  type="range"
                  min="60"
                  max="280"
                  step="5"
                  value={config.launchAltitude}
                  onChange={(e) => setConfig({ ...config, launchAltitude: Number(e.target.value) })}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              {/* Sparkle Size */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300">星火光點尺寸 (Spark Size)</span>
                  <span className="font-mono text-amber-400">{config.sparkleSize.toFixed(1)} px</span>
                </div>
                <input
                  type="range"
                  min="1.5"
                  max="5.0"
                  step="0.2"
                  value={config.sparkleSize}
                  onChange={(e) => setConfig({ ...config, sparkleSize: Number(e.target.value) })}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Special Effects Toggles */}
          <div>
            <label className="block text-xs font-semibold tracking-wider text-slate-400 uppercase mb-3 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5" />
              4. 特效強化 (Special FX)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setConfig({ ...config, crackle: !config.crackle })}
                className={`p-3 rounded-xl border flex items-center justify-between transition ${
                  config.crackle
                    ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                    : 'bg-slate-800/60 border-slate-700 text-slate-300'
                }`}
              >
                <div>
                  <div className="font-semibold text-xs">劈啪裂變音效 (Crackle)</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">燃燒後段引發微型爆鳴</div>
                </div>
                {config.crackle && <Check className="w-4 h-4 text-amber-400" />}
              </button>

              <button
                onClick={() => setConfig({ ...config, strobe: !config.strobe })}
                className={`p-3 rounded-xl border flex items-center justify-between transition ${
                  config.strobe
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                    : 'bg-slate-800/60 border-slate-700 text-slate-300'
                }`}
              >
                <div>
                  <div className="font-semibold text-xs">高頻百花閃爍 (Strobe)</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">宛如繁星般的爍滅光效</div>
                </div>
                {config.strobe && <Check className="w-4 h-4 text-cyan-400" />}
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/80">
          <button
            onClick={() => onTestLaunch(config)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 transition active:scale-95 font-medium text-xs"
          >
            <Play className="w-4 h-4 fill-amber-400 text-amber-400" />
            <span>空中試射預覽 (Test Fire)</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition text-xs font-medium"
            >
              取消
            </button>
            <button
              onClick={() => {
                onApplyConfig(config);
                onClose();
              }}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold transition shadow-lg shadow-orange-500/25 active:scale-95 text-xs"
            >
              套用至快捷發射
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
