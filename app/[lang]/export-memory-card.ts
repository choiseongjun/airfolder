import { cardPalette, type FrameId, type ThemeId } from './memory-card-style';

/** This demo renders only the three public illustration assets in the browser. */
export async function exportMemoryCard({ frame, theme, photos, title, caption }: {
  frame: FrameId; theme: ThemeId; photos: string[]; title: string; caption: string;
}) {
  await document.fonts.ready;
  const images = await Promise.all(photos.map(src => new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Could not load the preview photo'));
    image.src = `/landing/${src}.webp`;
  })));
  const canvas = document.createElement('canvas');
  canvas.width = frame === 'film' ? 660 : frame === 'postcard' ? 1050 : 900;
  canvas.height = frame === 'film' ? 1390 : frame === 'postcard' ? 950 : 1080;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Image export is unavailable');
  const { width, height } = canvas;
  const palette = cardPalette(frame, theme);
  const font = getComputedStyle(document.documentElement).getPropertyValue('--font-editorial').trim() || 'Georgia, serif';
  ctx.fillStyle = palette.paper;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = palette.ink;
  ctx.textAlign = 'left';
  ctx.font = '15px Arial, sans-serif';
  ctx.fillText('MEMONESTIA', 60, 49);
  ctx.textAlign = 'right';
  ctx.fillText('GOOD DAYS, KEPT.', width - 60, 49);
  ctx.textAlign = 'center';
  ctx.font = `500 ${frame === 'film' ? 36 : 47}px ${font}`;
  ctx.fillText(title, width / 2, 134, width - 100);
  const drawPhoto = (image: HTMLImageElement, x: number, y: number, w: number, h: number) => {
    const scale = Math.max(w / image.naturalWidth, h / image.naturalHeight);
    const sw = w / scale, sh = h / scale;
    ctx.drawImage(image, (image.naturalWidth - sw) / 2, (image.naturalHeight - sh) / 2, sw, sh, x, y, w, h);
  };
  if (frame === 'four') {
    images.forEach((image, index) => drawPhoto(image, 60 + (index % 2) * 400, 190 + Math.floor(index / 2) * 335, 380, 315));
  } else if (frame === 'film') {
    images.slice(0, 3).forEach((image, index) => drawPhoto(image, 80, 195 + index * 317, 500, 295));
    ctx.fillStyle = palette.ink;
    for (let y = 195; y < 1124; y += 48) {
      ctx.fillRect(27, y, 15, 25);
      ctx.fillRect(width - 42, y, 15, 25);
    }
  } else {
    drawPhoto(images[0], 60, 190, 930, 520);
  }
  ctx.fillStyle = palette.ink;
  ctx.font = '26px Arial, sans-serif';
  const lines: string[] = [];
  let line = '';
  for (const char of Array.from(caption)) {
    if (ctx.measureText(line + char).width > width - 130) { lines.push(line); line = char; }
    else line += char;
  }
  if (line) lines.push(line);
  lines.slice(0, 3).forEach((text, index) => ctx.fillText(text, width / 2, height - 155 + index * 36));
  ctx.font = '14px Arial, sans-serif';
  ctx.globalAlpha = 0.6;
  ctx.fillText('A SUMMER TO REMEMBER', width / 2, height - 47);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(result => result ? resolve(result) : reject(new Error('Image export failed')), 'image/png'));
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `memonestia-${frame}-${theme}.png`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
