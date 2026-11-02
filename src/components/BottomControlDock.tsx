import React, { useState, useRef } from 'react';
import {
  CameraMode,
  SceneTheme,
  ShellConfig,
  WeatherType,
} from '../types/fireworks';
import { FIREWORK_PRESETS } from '../fireworks/presets';
import { soundEngine } from '../audio/soundEngine';
import {
  Sparkles,
  Flame,
  Volume2,
  VolumeX,
  Music,
  Video,
  VideoOff,
  ChevronDown,
  ChevronUp,
  Sliders,
  Type,
  Eye,
  Building,
  Upload,
  Play,
  Pause,
  Zap,
  CloudRain,
  Camera,
  Image,
  RefreshCw,
  FlipHorizontal,
} from 'lucide-react';
import { ARState } from '../camera/arManager';

interface BottomControlDockProps {
  currentConfig: ShellConfig;
  onSelectPreset: (preset: ShellConfig) => void;
  onLaunchSingle: () => void;
  onLaunchBarrage: () => void;
  currentScene: SceneTheme;
  onSelectScene: (scene: SceneTheme) => void;
  customPhotoName: string | null;
  onUploadPhoto: (file: File) => void;
  arState: ARState;
  onToggleARFacing: () => void;
  onToggleARMirror: () => void;
  onSnapSnapshot: () => void;
  currentWeather: WeatherType;
  onSelectWeather: (weather: WeatherType) => void;
  cameraMode: CameraMode;
  onSelectCamera: (mode: CameraMode) => void;
  autoShow: boolean;
  onToggleAutoShow: () => void;
  isRecording: boolean;
  onToggleRecording: () => void;
  onOpenDesignerModal: () => void;
  onOpenTextModal: () => void;
  fps: number;
}

type TabType = 'presets' | 'custom' | 'text' | 'music' | 'scenes' | 'weather' | 'camera';

const WEATHER_OPTIONS: { id: WeatherType; name: string; icon: string; desc: string; detail: string }[] = [
  { id: 'clear', name: '晴朗澄夜 (Clear)', icon: '🌙', desc: '星空深邃明淨，薄霧點綴，視野極致通透', detail: '標準清晰夜空' },
  { id: 'drizzle', name: '細雨霏霏 (Drizzle)', icon: '🌧️', desc: '落雨絲線捕捉火光，水面波光雨滴漣漪', detail: '雨絲光芒反射 + 擬真落雨聲' },
  { id: 'foggy', name: '迷霧繚繞 (Heavy Fog)', icon: '🌫️', desc: '高空薄雲漫布，煙火爆裂照亮整片霧海', detail: '體積霧散射 + 朦朧光暈' },
  { id: 'aurora', name: '極光夜空 (Aurora)', icon: '🌌', desc: '天空湧動青綠極光帷幕，如夢似幻', detail: '動態極光光帶 + 微風' },
];

const SCENE_OPTIONS: { id: SceneTheme; name: string; icon: string; desc: string }[] = [
  { id: 'metropolis', name: '跨年璀璨天際線', icon: '🏙️', desc: '維港摩天大樓與海灣水面倒影' },
  { id: 'guandu', name: '關渡大橋淡水河', icon: '🌉', desc: '標誌性紅色三連拱橋與觀音山倒影' },
  { id: 'cosmos', name: '純粹深空星河', icon: '✨', desc: '深邃銀河與彩色星雲，全景無阻擋' },
  { id: 'customPhoto', name: '自訂相片背景', icon: '🖼️', desc: '上傳相片當夜空背景' },
  { id: 'ar', name: '實景 AR 模式', icon: '📷', desc: '開啟相機，人直接走入煙火之中' },
  { id: 'pagoda', name: '春節元宵湖閣', icon: '🏮', desc: '五層古典亭閣與燈籠倒影' },
  { id: 'castle', name: '夢幻奇幻城堡', icon: '🏰', desc: '童話尖塔與護城河迷霧' },
  { id: 'beach', name: '熱帶海灘與燈塔', icon: '🌴', desc: '沙灘、棕櫚樹與旋轉探照燈' },
];

const CAMERA_OPTIONS: { id: CameraMode; name: string; desc: string }[] = [
  { id: 'ground', name: '觀禮仰視 (Ground)', desc: '前排身歷其境抬頭仰望' },
  { id: 'rooftop', name: '天際高樓 (Rooftop)', desc: '全景俯瞰水面與地標' },
  { id: 'drone', name: '無人機空拍 (Drone)', desc: '高空盤旋動態俯衝視角' },
  { id: 'rocket', name: '火箭第一人稱 (Rocket Cam)', desc: '第一人稱跟隨升空破空綻放' },
  { id: 'orbit', name: '自由軌道 (Orbit)', desc: '滑鼠拖曳旋轉/縮放' },
];

export const BottomControlDock: React.FC<BottomControlDockProps> = ({
  currentConfig,
  onSelectPreset,
  onLaunchSingle,
  onLaunchBarrage,
  currentScene,
  onSelectScene,
  customPhotoName,
  onUploadPhoto,
  arState,
  onToggleARFacing,
  onToggleARMirror,
  onSnapSnapshot,
  currentWeather,
  onSelectWeather,
  cameraMode,
  onSelectCamera,
  autoShow,
  onToggleAutoShow,
  isRecording,
  onToggleRecording,
  onOpenDesignerModal,
  onOpenTextModal,
  fps,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('presets');
  const [isMuted, setIsMuted] = useState(false);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [musicTrack, setMusicTrack] = useState<'festive' | 'electronic' | 'overture'>('festive');
  const [customAudioName, setCustomAudioName] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    soundEngine.setMute(next);
  };

  const handleToggleMusic = (trackStyle?: 'festive' | 'electronic' | 'overture') => {
    const styleToUse = trackStyle || musicTrack;
    if (trackStyle) setMusicTrack(trackStyle);
    const active = soundEngine.toggleMusic(styleToUse);
    setIsMusicPlaying(active);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const name = await soundEngine.loadCustomAudioFile(file);
      setCustomAudioName(name);
      setIsMusicPlaying(true);
    } catch (err) {
      console.error('Audio load error:', err);
    }
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-full max-w-4xl px-3 pointer-events-auto">
      {/* Container with solid rgba background per Three.js guidelines */}
      <div className="relative bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl shadow-black/80 text-slate-200 transition-all duration-300">
        {/* Top Dock Header & Quick Firing Bar */}
        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-800/80 gap-2">
          {/* Left: Quick Launch & Barrage */}
          <div className="flex items-center gap-2">
            <button
              onClick={onLaunchSingle}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold transition shadow-md shadow-orange-500/20 active:scale-95 text-xs"
              title="按空白鍵 [Space] 快速發射"
            >
              <Flame className="w-3.5 h-3.5 fill-current" />
              <span>發射單枚 (Space)</span>
            </button>

            <button
              onClick={onLaunchBarrage}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 transition active:scale-95 text-xs font-semibold"
              title="按 [B] 鍵排砲連射"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>排砲連射 (B)</span>
            </button>

            {/* Auto Show Beat Sync Toggle */}
            <button
              onClick={onToggleAutoShow}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition active:scale-95 ${
                autoShow
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                  : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{autoShow ? '自動表演中' : '自動節奏秀'}</span>
            </button>
          </div>

          {/* Middle: Active Firework Badge */}
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-950/70 border border-slate-800 text-[11px] text-slate-300">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: currentConfig.primaryColor }}
            />
            <span className="font-medium truncate max-w-[140px]">{currentConfig.name}</span>
          </div>

          {/* Right: Audio, Recording, Collapse */}
          <div className="flex items-center gap-1.5">
            {/* Record Button */}
            <button
              onClick={onToggleRecording}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition active:scale-95 ${
                isRecording
                  ? 'bg-red-600 hover:bg-red-500 text-white animate-pulse'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
              }`}
              title="錄製 60FPS 高清煙火秀並導出分享"
            >
              {isRecording ? <VideoOff className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5 text-red-400" />}
              <span>{isRecording ? '錄製中…' : '錄影導出'}</span>
            </button>

            {/* Mute SFX */}
            <button
              onClick={handleToggleMute}
              className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              title={isMuted ? '取消靜音' : '靜音音效'}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>

            {/* Collapse / Expand Toggle */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition"
              title="切換控制列展開/收合 (H)"
            >
              {isCollapsed ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">展開</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">收合</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Expanded Panel Body */}
        {!isCollapsed && (
          <div className="p-3">
            {/* Navigation Tabs */}
            <div className="flex items-center gap-1 mb-3 overflow-x-auto pb-1 text-xs border-b border-slate-800/80">
              <button
                onClick={() => setActiveTab('presets')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
                  activeTab === 'presets'
                    ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>絢麗預設 (Presets)</span>
              </button>

              <button
                onClick={() => setActiveTab('custom')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
                  activeTab === 'custom'
                    ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>造型工坊 (Custom)</span>
              </button>

              <button
                onClick={() => setActiveTab('text')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
                  activeTab === 'text'
                    ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Type className="w-3.5 h-3.5" />
                <span>文字與指令 (Text & AI)</span>
              </button>

              <button
                onClick={() => setActiveTab('music')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
                  activeTab === 'music'
                    ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Music className="w-3.5 h-3.5" />
                <span>音樂節奏 (Music Sync)</span>
              </button>

              <button
                onClick={() => setActiveTab('scenes')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
                  activeTab === 'scenes'
                    ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Building className="w-3.5 h-3.5" />
                <span>節日場景 (Scenes)</span>
              </button>

              <button
                onClick={() => setActiveTab('weather')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
                  activeTab === 'weather'
                    ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <CloudRain className="w-3.5 h-3.5" />
                <span>動態天氣 (Weather)</span>
              </button>

              <button
                onClick={() => setActiveTab('camera')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
                  activeTab === 'camera'
                    ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>多重視角 (Camera)</span>
              </button>
            </div>

            {/* Tab 1: Presets Carousel / Grid */}
            {activeTab === 'presets' && (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-48 overflow-y-auto pr-1">
                {FIREWORK_PRESETS.map((preset, idx) => {
                  const isSelected = currentConfig.id === preset.id;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => onSelectPreset(preset)}
                      className={`p-2 rounded-xl border text-left transition flex flex-col justify-between ${
                        isSelected
                          ? 'bg-amber-500/20 border-amber-400 text-amber-200 shadow-sm'
                          : 'bg-slate-950/60 border-slate-800 hover:bg-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-slate-400 font-mono">#{idx + 1}</span>
                        <div className="flex items-center -space-x-1">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: preset.primaryColor }}
                          />
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: preset.secondaryColor }}
                          />
                        </div>
                      </div>
                      <div className="text-xs font-bold truncate">{preset.name.split(' (')[0]}</div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Tab 2: Custom Quick Knobs */}
            {activeTab === 'custom' && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-950/50 p-3 rounded-xl border border-slate-800">
                <div className="text-xs text-slate-300 space-y-1">
                  <div className="font-semibold text-white">
                    當前造型：<span className="text-amber-400">{currentConfig.name}</span>
                  </div>
                  <div className="text-slate-400">
                    火星：{currentConfig.particleCount} 枚 | 爆速：{currentConfig.burstForce} | 高度：
                    {currentConfig.launchAltitude}m
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={onOpenDesignerModal}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition text-xs shadow-md shadow-amber-500/20 active:scale-95"
                  >
                    開啟完整造型工坊 (Pyro Lab)
                  </button>
                </div>
              </div>
            )}

            {/* Tab 3: Text & AI Prompt */}
            {activeTab === 'text' && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-950/50 p-3 rounded-xl border border-slate-800">
                <div className="text-xs text-slate-300">
                  <div className="font-semibold text-white">文字陣列與智慧指令煙火</div>
                  <div className="text-slate-400">支援繁中字樣、英數字（如 2026、LOVE）與自然語言指令</div>
                </div>
                <button
                  onClick={onOpenTextModal}
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition text-xs shadow-md shadow-cyan-500/20 active:scale-95"
                >
                  輸入文字與指令 (Prompt Generator)
                </button>
              </div>
            )}

            {/* Tab 4: Music & Beat Sync */}
            {activeTab === 'music' && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950/50 p-3 rounded-xl border border-slate-800">
                  {/* Preset celebration soundtracks */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleMusic('festive')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition ${
                        isMusicPlaying && musicTrack === 'festive'
                          ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                          : 'bg-slate-800 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      {isMusicPlaying && musicTrack === 'festive' ? (
                        <Pause className="w-3.5 h-3.5" />
                      ) : (
                        <Play className="w-3.5 h-3.5" />
                      )}
                      <span>盛典交響 (Festive Overture)</span>
                    </button>

                    <button
                      onClick={() => handleToggleMusic('electronic')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition ${
                        isMusicPlaying && musicTrack === 'electronic'
                          ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                          : 'bg-slate-800 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      {isMusicPlaying && musicTrack === 'electronic' ? (
                        <Pause className="w-3.5 h-3.5" />
                      ) : (
                        <Play className="w-3.5 h-3.5" />
                      )}
                      <span>跨年電音鼓點 (EDM Drop)</span>
                    </button>
                  </div>

                  {/* Upload custom audio */}
                  <div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept="audio/*"
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs transition text-slate-300"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{customAudioName ? `已載入: ${customAudioName}` : '匯入自訂音樂檔 (MP3)'}</span>
                    </button>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 flex items-center justify-between px-1">
                  <span>💡 開啟「自動節奏秀」時，音訊分析器將在重低音 (Bass Drop) 與節奏落點自動引爆高空煙火！</span>
                </div>
              </div>
            )}

            {/* Tab 5: Scenes */}
            {activeTab === 'scenes' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {SCENE_OPTIONS.map((sc) => {
                    const isSelected = currentScene === sc.id;
                    return (
                      <button
                        key={sc.id}
                        onClick={() => onSelectScene(sc.id)}
                        className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                          isSelected
                            ? 'bg-amber-500/20 border-amber-400 text-amber-200 shadow-sm'
                            : 'bg-slate-950/60 border-slate-800 hover:bg-slate-800/80 hover:border-slate-700'
                        }`}
                      >
                        <div className="text-xl mb-1">{sc.icon}</div>
                        <div className="text-xs font-bold">{sc.name}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{sc.desc}</div>
                      </button>
                    );
                  })}
                </div>

                {/* Sub-panel: Custom Photo Uploader */}
                {currentScene === 'customPhoto' && (
                  <div className="p-3 bg-slate-950/70 border border-amber-500/30 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5">
                      <Image className="w-5 h-5 text-amber-400" />
                      <div>
                        <div className="font-bold text-white">上傳自訂照片作為夜空背景</div>
                        <div className="text-[11px] text-slate-400">
                          {customPhotoName ? `目前載入：${customPhotoName}` : '可上傳夜景照、旅遊合照或紀念照片'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        ref={photoInputRef}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) onUploadPhoto(file);
                        }}
                        accept="image/*"
                        className="hidden"
                      />
                      <button
                        onClick={() => photoInputRef.current?.click()}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition shadow-sm text-xs"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{customPhotoName ? '更換照片' : '選取本機相片 (JPG/PNG)'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Sub-panel: Live AR Controls */}
                {currentScene === 'ar' && (
                  <div className="p-3 bg-slate-950/70 border border-cyan-500/40 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5">
                      <Camera className="w-5 h-5 text-cyan-400" />
                      <div>
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span>AR 實景煙火模式進行中</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                            人在煙火裡
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          相機即時視訊作為背景，煙火環繞身側綻放！
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={onToggleARFacing}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition text-xs"
                        title="切換前置 / 後置鏡頭"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>{arState.isFrontCamera ? '前置' : '後置'}</span>
                      </button>

                      <button
                        onClick={onToggleARMirror}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition text-xs"
                        title="自拍水平鏡像翻轉"
                      >
                        <FlipHorizontal className="w-3.5 h-3.5" />
                        <span>{arState.isMirrored ? '鏡像開' : '鏡像關'}</span>
                      </button>

                      <button
                        onClick={onSnapSnapshot}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-bold transition shadow-md shadow-cyan-500/20 active:scale-95 text-xs"
                        title="拍攝高清合照"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>拍照合影</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Dynamic Weather System */}
            {activeTab === 'weather' && (
              <div className="space-y-2.5">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {WEATHER_OPTIONS.map((w) => {
                    const isSelected = currentWeather === w.id;
                    return (
                      <button
                        key={w.id}
                        onClick={() => onSelectWeather(w.id)}
                        className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                          isSelected
                            ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-sm'
                            : 'bg-slate-950/60 border-slate-800 hover:bg-slate-800/80 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xl">{w.icon}</span>
                          {isSelected && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/30 text-cyan-300 font-bold">
                              當前天氣
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-bold">{w.name}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{w.detail}</div>
                      </button>
                    );
                  })}
                </div>
                <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>
                    💡 <b>動態粒子反射特性</b>：{WEATHER_OPTIONS.find((w) => w.id === currentWeather)?.desc}
                  </span>
                </div>
              </div>
            )}

            {/* Tab 6: Camera Modes */}
            {activeTab === 'camera' && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {CAMERA_OPTIONS.map((cam) => {
                  const isSelected = cameraMode === cam.id;
                  return (
                    <button
                      key={cam.id}
                      onClick={() => onSelectCamera(cam.id)}
                      className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                        isSelected
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-sm'
                          : 'bg-slate-950/60 border-slate-800 hover:bg-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-xs font-bold">{cam.name}</div>
                      <div className="text-[10px] text-slate-400 mt-1 line-clamp-2">{cam.desc}</div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Bottom info strip */}
            <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
              <div className="flex items-center gap-3">
                <span>快捷鍵：空白鍵 [發射] | B [排砲] | 數字鍵 1-9 [切換造型]</span>
                <span className="hidden sm:inline">| 點擊夜空任意處直接定點引爆</span>
              </div>
              <div className="font-mono text-slate-400">{fps} FPS</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
