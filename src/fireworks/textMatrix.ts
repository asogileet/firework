/**
 * Converts text strings (English, Chinese, numbers, symbols) into 3D particle coordinate arrays
 * using high-precision 2D Canvas pixel sampling with 3D cylindrical curvature and volumetric depth.
 */

export interface ParticleOffset {
  x: number;
  y: number;
  z: number;
}

export function generateTextParticleOffsets(
  text: string,
  targetCount = 550,
  scale = 0.55
): ParticleOffset[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return [];

  // Determine width based on text length
  const charCount = text.length;
  const fontSize = charCount > 6 ? 48 : 60;
  const width = Math.min(850, Math.max(280, charCount * (fontSize * 0.95)));
  const height = 150;

  canvas.width = width;
  canvas.height = height;

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${fontSize}px "Noto Sans TC", "Plus Jakarta Sans", sans-serif`;
  ctx.fillText(text.trim(), width / 2, height / 2);

  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  const activePixels: [number, number][] = [];

  // Sample active pixels with step
  const step = 2;
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const idx = (y * width + x) * 4;
      const brightness = data[idx]; // R channel
      if (brightness > 120) {
        activePixels.push([x, y]);
      }
    }
  }

  if (activePixels.length === 0) return [];

  const results: ParticleOffset[] = [];
  const stride = Math.max(1, Math.floor(activePixels.length / targetCount));

  const totalWidth = width * scale;
  const cylinderRadius = Math.max(38, totalWidth * 0.7);

  for (let i = 0; i < activePixels.length; i += stride) {
    const [px, py] = activePixels[i];
    const rawX = (px - width / 2) * scale;
    const normY = (height / 2 - py) * scale;

    // Wrap in a gentle 3D cylindrical arc so the text is volumetric from any angle
    const angle = (rawX / totalWidth) * 1.05;
    const normX = Math.sin(angle) * cylinderRadius;
    const arcZ = -(1 - Math.cos(angle)) * cylinderRadius;
    // Add volumetric particle thickness (front and back spark embers)
    const thicknessZ = (Math.random() - 0.5) * 14;
    const normZ = arcZ + thicknessZ;

    results.push({ x: normX, y: normY, z: normZ });
    if (results.length >= targetCount) break;
  }

  return results;
}
