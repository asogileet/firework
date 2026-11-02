import { FireworkShape, ShellConfig } from '../types/fireworks';

interface ParseResult {
  config: ShellConfig;
  message: string;
}

export function parseFireworkCommand(prompt: string): ParseResult {
  const p = prompt.trim();
  const lower = p.toLowerCase();

  // Color recognition
  let primary = '#FFD700'; // Default gold
  let secondary = '#FF4500'; // Default amber/red
  let flash = '#FFFFFF';

  if (lower.includes('粉') || lower.includes('櫻花') || lower.includes('pink') || lower.includes('rose')) {
    primary = '#FF69B4';
    secondary = '#FF1493';
    flash = '#FFE4E1';
  } else if (lower.includes('藍') || lower.includes('青') || lower.includes('blue') || lower.includes('cyan')) {
    primary = '#00E5FF';
    secondary = '#2979FF';
    flash = '#E0F7FA';
  } else if (lower.includes('紫') || lower.includes('purple') || lower.includes('violet')) {
    primary = '#D500F9';
    secondary = '#7C4DFF';
    flash = '#F3E5F5';
  } else if (lower.includes('綠') || lower.includes('翡翠') || lower.includes('green') || lower.includes('emerald')) {
    primary = '#00E676';
    secondary = '#00B0FF';
    flash = '#E8F5E9';
  } else if (lower.includes('紅') || lower.includes('火') || lower.includes('red') || lower.includes('crimson')) {
    primary = '#FF1744';
    secondary = '#FF9100';
    flash = '#FFF3E0';
  } else if (lower.includes('金') || lower.includes('黃') || lower.includes('gold') || lower.includes('yellow')) {
    primary = '#FFD700';
    secondary = '#FFA000';
    flash = '#FFFDE7';
  } else if (lower.includes('銀') || lower.includes('白') || lower.includes('silver') || lower.includes('white')) {
    primary = '#ECEFF1';
    secondary = '#90A4AE';
    flash = '#FFFFFF';
  } else if (lower.includes('彩虹') || lower.includes('rainbow') || lower.includes('七彩')) {
    primary = '#FF0055';
    secondary = '#00E5FF';
    flash = '#FFFF00';
  }

  // Shape recognition
  let shape: FireworkShape = 'peony';
  let isTextPrompt = false;
  let textContent = '';

  if (lower.includes('心') || lower.includes('heart') || lower.includes('愛') || lower.includes('love')) {
    shape = 'heart';
  } else if (lower.includes('星') || lower.includes('star')) {
    shape = 'star';
  } else if (lower.includes('土星') || lower.includes('saturn') || lower.includes('環') || lower.includes('ring')) {
    shape = 'saturn';
  } else if (lower.includes('柳') || lower.includes('金冠') || lower.includes('kamuro') || lower.includes('willow') || lower.includes('流星')) {
    shape = 'kamuro';
    primary = '#FFD700';
    secondary = '#FFA500';
  } else if (lower.includes('菊') || lower.includes('chrysanthemum')) {
    shape = 'chrysanthemum';
  } else if (lower.includes('螺旋') || lower.includes('spiral') || lower.includes('龍')) {
    shape = 'spiral';
  } else if (lower.includes('閃爍') || lower.includes('strobe') || lower.includes('百花')) {
    shape = 'strobe';
  } else if (lower.includes('瀑布') || lower.includes('waterfall') || lower.includes('雨')) {
    shape = 'waterfall';
  } else if (lower.includes('十字') || lower.includes('crossette') || lower.includes('裂變')) {
    shape = 'crossette';
  } else if (
    lower.includes('字') ||
    lower.includes('text') ||
    p.startsWith('"') ||
    p.startsWith('“') ||
    /^[0-9A-Za-z\s!@#$%^&*()_+=\-~`[\]{}|\\:;"'<>,.?/]{1,16}$/.test(p) ||
    /^(202\d|happy|love|peace|新年快樂|平安|吉祥|生日快樂)/i.test(p)
  ) {
    shape = 'text';
    isTextPrompt = true;
    textContent = p.replace(/["“”'']/g, '').replace(/煙火|造型|字樣/g, '').trim() || p;
  }

  // Modifiers
  const isLarge = lower.includes('巨大') || lower.includes('超大') || lower.includes('盛宴') || lower.includes('giant') || lower.includes('mega');
  const hasCrackle = lower.includes('劈啪') || lower.includes('碎星') || lower.includes('crackle') || shape === 'crossette';
  const hasStrobe = lower.includes('閃爍') || lower.includes('繁星') || shape === 'strobe';

  const particleCount = isLarge ? 1200 : shape === 'text' ? 600 : 700;
  const burstForce = isLarge ? 55 : 42;
  const trailLength = shape === 'kamuro' ? 0.95 : 0.65;

  const config: ShellConfig = {
    name: shape === 'text' ? `文字煙火「${textContent}」` : `${primary} ${shape} 煙火`,
    shape,
    primaryColor: primary,
    secondaryColor: secondary,
    flashColor: flash,
    particleCount,
    burstForce,
    trailLength,
    crackle: hasCrackle,
    strobe: hasStrobe,
    sparkleSize: isLarge ? 3.5 : 2.5,
    launchAltitude: isLarge ? 130 : 105,
    textPrompt: isTextPrompt ? textContent : undefined,
  };

  return {
    config,
    message: isTextPrompt
      ? `已解析文字陣列：「${textContent}」，將在高空立體綻放！`
      : `已生成 ${config.name}，包含 ${particleCount} 枚焰色粒子與物理拖尾！`,
  };
}
