import { useState, useEffect, useRef } from 'react';
import { CameraMode, SceneTheme, ShellConfig, WeatherType } from './types/fireworks';
import { FIREWORK_PRESETS } from './fireworks/presets';
import { Viewport3D } from './components/Viewport3D';
import { BottomControlDock } from './components/BottomControlDock';
import { CustomDesignerModal } from './components/CustomDesignerModal';
import { TextFireworkModal } from './components/TextFireworkModal';
import { RecordingModal } from './components/RecordingModal';
import { videoRecorder, RecordedVideoResult } from './recorder/videoRecorder';
import { soundEngine } from './audio/soundEngine';
import { arManager, ARState } from './camera/arManager';
import { Camera, Download, Sparkles, Maximize2, Minimize2, HelpCircle } from 'lucide-react';

export default function App() {
  const [currentConfig, setCurrentConfig] = useState<ShellConfig>(FIREWORK_PRESETS[0]);
  const [currentScene, setCurrentScene] = useState<SceneTheme>('metropolis');
  const [currentWeather, setCurrentWeather] = useState<WeatherType>('clear');
  const [customPhotoUrl, setCustomPhotoUrl] = useState<string | null>(null);
  const [customPhotoName, setCustomPhotoName] = useState<string | null>(null);
  const [arState, setArState] = useState<ARState>({
    isActive: false,
    isFrontCamera: true,
    isMirrored: true,
    hasPermission: false,
    errorMessage: null,
  });
  const [snapshotAlert, setSnapshotAlert] = useState<string | null>(null);
  const [cameraMode, setCameraMode] = useState<CameraMode>('ground');
  const [autoShow, setAutoShow] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordResult, setRecordResult] = useState<RecordedVideoResult | null>(null);

  const [isDesignerOpen, setIsDesignerOpen] = useState(false);
  const [isTextModalOpen, setIsTextModalOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [fps, setFps] = useState(60);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const recordingTimerRef = useRef<number | null>(null);

  // Initialize sound engine on first user interaction
  useEffect(() => {
    const handleFirstTouch = () => {
      soundEngine.init();
      window.removeEventListener('click', handleFirstTouch);
      window.removeEventListener('keydown', handleFirstTouch);
    };
    window.addEventListener('click', handleFirstTouch);
    window.addEventListener('keydown', handleFirstTouch);
    return () => {
      window.removeEventListener('click', handleFirstTouch);
      window.removeEventListener('keydown', handleFirstTouch);
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        (window as unknown as { __launchFireworkDirect?: () => void }).__launchFireworkDirect?.();
      } else if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        (window as unknown as { __launchBarrageDirect?: () => void }).__launchBarrageDirect?.();
      } else if (e.key >= '1' && e.key <= '9') {
        const idx = parseInt(e.key, 10) - 1;
        if (FIREWORK_PRESETS[idx]) {
          setCurrentConfig(FIREWORK_PRESETS[idx]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLaunchSingle = () => {
    (window as unknown as { __launchFireworkDirect?: (cfg?: ShellConfig) => void }).__launchFireworkDirect?.(
      currentConfig
    );
  };

  const handleLaunchBarrage = () => {
    (window as unknown as { __launchBarrageDirect?: (cfg?: ShellConfig, count?: number) => void }).__launchBarrageDirect?.(
      currentConfig,
      5
    );
  };

  const handleToggleAutoShow = () => {
    soundEngine.init();
    const next = !autoShow;
    setAutoShow(next);
    if (next && !soundEngine.isMusicActive()) {
      soundEngine.toggleMusic('festive');
    }
  };

  const handleToggleRecording = async () => {
    soundEngine.init();

    if (!isRecording) {
      if (!canvasRef.current) return;
      const started = videoRecorder.startRecording(
        canvasRef.current,
        soundEngine.getMediaStream()
      );
      if (started) {
        setIsRecording(true);
        setRecordingDuration(0);
        recordingTimerRef.current = window.setInterval(() => {
          setRecordingDuration((prev) => prev + 1);
        }, 1000);
      }
    } else {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      try {
        const res = await videoRecorder.stopRecording();
        setIsRecording(false);
        setRecordResult(res);
      } catch (err) {
        console.error('Recording stop error:', err);
        setIsRecording(false);
      }
    }
  };

  const handleUploadPhoto = (file: File) => {
    const url = URL.createObjectURL(file);
    setCustomPhotoUrl(url);
    setCustomPhotoName(file.name);
    setCurrentScene('customPhoto');
  };

  const handleToggleARFacing = () => {
    arManager.toggleFacingMode().catch(console.error);
  };

  const handleToggleARMirror = () => {
    arManager.toggleMirror();
  };

  const handleSnapSnapshot = () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `CelestialPyro_${currentScene === 'ar' ? 'AR_Selfie' : 'Snapshot'}_${new Date().toISOString().slice(0, 10)}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setSnapshotAlert('📸 照片已成功保存下載！');
    setTimeout(() => setSnapshotAlert(null), 3000);
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const getSceneDisplayName = () => {
    switch (currentScene) {
      case 'guandu':
        return '🌉 關渡大橋 (淡水河紅色連續拱橋)';
      case 'cosmos':
        return '✨ 純粹深空 (無阻礙銀河星空)';
      case 'customPhoto':
        return `🖼️ 自訂照片背景 (${customPhotoName || '已載入'})`;
      case 'ar':
        return '📷 實景 AR 模式 (人在煙火裡)';
      case 'metropolis':
        return '跨年璀璨天際線 (Metropolis Harbor)';
      case 'pagoda':
        return '春節元宵湖閣 (Lunar New Year Pagoda)';
      case 'castle':
        return '夢幻奇幻城堡 (Fantasy Fairytale Castle)';
      case 'beach':
        return '熱帶海灘與燈塔 (Tropical Beach & Lighthouse)';
    }
  };

  const getWeatherDisplayName = () => {
    switch (currentWeather) {
      case 'clear':
        return '🌙 晴朗澄夜';
      case 'drizzle':
        return '🌧️ 細雨霏霏';
      case 'foggy':
        return '🌫️ 迷霧繚繞';
      case 'aurora':
        return '🌌 極光夜空';
    }
  };

  const getCameraDisplayName = () => {
    switch (cameraMode) {
      case 'ground':
        return '觀禮仰視 (Ground)';
      case 'rooftop':
        return '天際高樓 (Rooftop)';
      case 'drone':
        return '無人機空拍 (Drone)';
      case 'rocket':
        return '火箭第一人稱 (Rocket Cam)';
      case 'orbit':
        return '自由軌道 (Orbit)';
    }
  };

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none">
      {/* 3D WebGL Canvas Layer */}
      <Viewport3D
        currentSceneTheme={currentScene}
        cameraMode={cameraMode}
        currentWeather={currentWeather}
        customPhotoUrl={customPhotoUrl}
        activeShellConfig={currentConfig}
        autoShowActive={autoShow}
        onFpsUpdate={setFps}
        onCanvasReady={(c) => {
          canvasRef.current = c;
        }}
        onARStateChange={setArState}
      />

      {/* Snapshot Toast notification */}
      {snapshotAlert && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-2xl flex items-center gap-2 border border-emerald-400">
          <Sparkles className="w-4 h-4 fill-current" />
          <span>{snapshotAlert}</span>
        </div>
      )}

      {/* Top Header / Spec Overlay (Clean & Unobtrusive) */}
      <header className="absolute top-4 left-4 right-4 z-30 flex items-center justify-between pointer-events-none">
        {/* Brand & Scene Badge */}
        <div className="flex items-center gap-3 pointer-events-auto">
          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-slate-900/90 border border-slate-700/80 shadow-xl shadow-black/40">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-slate-950 shadow-md shadow-orange-500/30">
              <Sparkles className="w-4 h-4 fill-current" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-wide flex items-center gap-1.5">
                <span>Celestial Pyro</span>
                <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/20 px-1.5 py-0.2 rounded border border-amber-500/30">
                  3D 煙火模擬器
                </span>
                {currentScene === 'ar' && (
                  <span className="text-[10px] font-bold text-cyan-300 bg-cyan-500/30 px-1.5 py-0.2 rounded border border-cyan-400">
                    AR 實景進行中
                  </span>
                )}
              </h1>
              <div className="text-[11px] text-slate-400 font-medium">
                {getSceneDisplayName()} • {getWeatherDisplayName()} • {getCameraDisplayName()}
              </div>
            </div>
          </div>

          {/* Recording Timer Indicator */}
          {isRecording && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-600/90 text-white font-mono text-xs font-bold border border-red-400 shadow-lg shadow-red-600/30">
              <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
              <span>REC 00:{recordingDuration < 10 ? `0${recordingDuration}` : recordingDuration}</span>
            </div>
          )}
        </div>

        {/* Top Right Utilities */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={() => setIsHelpOpen(!isHelpOpen)}
            className="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-700/80 shadow-lg transition"
            title="操作導覽與快捷鍵"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          <button
            onClick={handleToggleFullscreen}
            className="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-700/80 shadow-lg transition"
            title="全螢幕切換"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Help Modal */}
      {isHelpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 text-sm text-slate-200">
            <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>操作說明與 3D 空間特色</span>
            </h3>

            <div className="space-y-2.5 text-xs text-slate-300">
              <div className="flex justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                <span className="font-semibold text-white">真正的 3D 立體煙火</span>
                <span className="text-amber-400">具備完整 3D 深度、厚度與立體星芒</span>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                <span className="font-semibold text-white">動態天氣與粒子反射</span>
                <span className="text-cyan-400">雨絲捕捉火光閃爍、雲霧體積散射</span>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                <span className="font-semibold text-white">點擊夜空任意處</span>
                <span className="text-amber-400">直接於該 3D 空間定點引爆</span>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                <span className="font-semibold text-white">空白鍵 [Space] / [B]</span>
                <span className="text-amber-400">發射單枚 / 五管齊射排砲</span>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                <span className="font-semibold text-white">自由視角 (Orbit)</span>
                <span className="text-slate-400">滑鼠左鍵旋轉 / 滾輪縮放 / 右鍵平移</span>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setIsHelpOpen(false)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition"
              >
                我知道了
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Collapsible Bottom Control Dock */}
      <BottomControlDock
        currentConfig={currentConfig}
        onSelectPreset={(p) => {
          setCurrentConfig(p);
          handleLaunchSingle();
        }}
        onLaunchSingle={handleLaunchSingle}
        onLaunchBarrage={handleLaunchBarrage}
        currentScene={currentScene}
        onSelectScene={(s) => setCurrentScene(s)}
        customPhotoName={customPhotoName}
        onUploadPhoto={handleUploadPhoto}
        arState={arState}
        onToggleARFacing={handleToggleARFacing}
        onToggleARMirror={handleToggleARMirror}
        onSnapSnapshot={handleSnapSnapshot}
        currentWeather={currentWeather}
        onSelectWeather={(w) => setCurrentWeather(w)}
        cameraMode={cameraMode}
        onSelectCamera={(c) => setCameraMode(c)}
        autoShow={autoShow}
        onToggleAutoShow={handleToggleAutoShow}
        isRecording={isRecording}
        onToggleRecording={handleToggleRecording}
        onOpenDesignerModal={() => setIsDesignerOpen(true)}
        onOpenTextModal={() => setIsTextModalOpen(true)}
        fps={fps}
      />

      {/* Custom Designer Modal */}
      <CustomDesignerModal
        isOpen={isDesignerOpen}
        onClose={() => setIsDesignerOpen(false)}
        currentConfig={currentConfig}
        onApplyConfig={(c) => setCurrentConfig(c)}
        onTestLaunch={(c) => {
          (window as unknown as { __launchFireworkDirect?: (cfg?: ShellConfig) => void }).__launchFireworkDirect?.(
            c
          );
        }}
      />

      {/* Text & Prompt Command Modal */}
      <TextFireworkModal
        isOpen={isTextModalOpen}
        onClose={() => setIsTextModalOpen(false)}
        onLaunch={(c) => {
          setCurrentConfig(c);
          (window as unknown as { __launchFireworkDirect?: (cfg?: ShellConfig) => void }).__launchFireworkDirect?.(
            c
          );
        }}
      />

      {/* Recording & Export Modal */}
      <RecordingModal
        isOpen={!!recordResult}
        onClose={() => setRecordResult(null)}
        result={recordResult}
      />
    </main>
  );
}
