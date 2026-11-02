export type FireworkShape =
  | 'peony' // 牡丹 - 絢麗圓形經典
  | 'chrysanthemum' // 菊花 - 拖尾金色
  | 'kamuro' // 錦冠 - 垂淚長拖尾金冠
  | 'saturn' // 土星環 - 核心加旋轉環
  | 'heart' // 愛心 - 浪漫心形
  | 'star' // 五角星 - 璀璨星芒
  | 'doubleRing' // 雙層同心環
  | 'spiral' // 螺旋銀龍
  | 'strobe' // 閃爍百花
  | 'waterfall' // 瀑布垂簾
  | 'crossette' // 裂變碎星十字
  | 'text'; // 文字/符號煙火

export interface FireworkColorPreset {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  flash: string;
}

export interface ShellConfig {
  id?: string;
  name: string;
  shape: FireworkShape;
  primaryColor: string;
  secondaryColor: string;
  flashColor: string;
  particleCount: number;
  burstForce: number;
  trailLength: number;
  crackle: boolean;
  strobe: boolean;
  sparkleSize: number;
  launchAltitude: number; // Y target
  textPrompt?: string; // If shape is 'text'
}

export type SceneTheme =
  | 'metropolis' // 跨年璀璨天際線
  | 'guandu' // 關渡大橋 (淡水河紅色連續拱橋)
  | 'cosmos' // 純粹深空星河 (無地景深空)
  | 'pagoda' // 春節元宵湖閣
  | 'castle' // 夢幻奇幻城堡
  | 'beach' // 熱帶海灘與燈塔
  | 'customPhoto' // 自訂相片背景
  | 'ar'; // AR 模式 (實景鏡頭入鏡)

export interface ScenePreset {
  id: SceneTheme;
  name: string;
  description: string;
  skyColor: string;
  waterReflects: boolean;
  fogDensity: number;
  bgLightColor: string;
}

export type CameraMode =
  | 'ground' // 觀禮視角 (仰視)
  | 'rooftop' // 天際高樓 (全景俯仰)
  | 'drone' // 無人機空拍 (高空盤旋)
  | 'rocket' // 火箭追蹤視角 (第一人稱跟隨升空)
  | 'orbit'; // 自由軌道旋轉

export interface ChoreographyCue {
  id: string;
  timestamp: number; // in seconds
  shellConfig: ShellConfig;
  launchPosition: [number, number, number];
}

export interface AudioTrackOption {
  id: string;
  name: string;
  genre: string;
  bpm: number;
  isProcedural: boolean;
}

export type WeatherType = 'clear' | 'drizzle' | 'foggy' | 'aurora';

export interface WeatherPreset {
  id: WeatherType;
  name: string;
  icon: string;
  desc: string;
  rainCount: number;
  fogDensity: number;
  waterRoughness: number;
}
