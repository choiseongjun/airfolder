'use client';
// Renders a themed album as a short vertical (1080x1920) motion story: a title card, each photo
// with a slow Ken Burns zoom and a crossfade into the next, then a closing card. Captured live
// from the canvas with MediaRecorder — there's no server-side video pipeline, so this takes as
// long to render as the finished clip plays.

export type StoryVideoResult = { blob: Blob; mimeType: string };

const WIDTH = 1080, HEIGHT = 1920;
const TITLE_MS = 1100, PHOTO_MS = 1700, TRANSITION_MS = 450, END_MS = 1300;
const FPS = 30;

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('IMAGE_LOAD_FAILED'));
    img.src = src;
  });
}

function cover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const scale = Math.max(w / img.width, h / img.height), sw = w / scale, sh = h / scale;
  ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
}

/** Draws one photo filling the frame, slowly zooming in (Ken Burns) as `progress` (0–1) advances. */
function drawKenBurns(ctx: CanvasRenderingContext2D, img: HTMLImageElement, progress: number, opacity: number) {
  const zoom = 1 + 0.12 * progress, driftX = (progress - 0.5) * 60, driftY = (progress - 0.5) * -40;
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.translate(WIDTH / 2 + driftX, HEIGHT / 2 + driftY);
  ctx.scale(zoom, zoom);
  ctx.translate(-WIDTH / 2, -HEIGHT / 2);
  cover(ctx, img, 0, 0, WIDTH, HEIGHT);
  ctx.restore();
}

function fitText(ctx: CanvasRenderingContext2D, text: string, max: number, size: number, weight: string, family: string) {
  let s = size; ctx.font = `${weight} ${s}px ${family}`;
  while (ctx.measureText(text).width > max && s > 28) { s -= 2; ctx.font = `${weight} ${s}px ${family}`; }
  return s;
}

function pickMimeType(): string {
  const candidates = ['video/mp4;codecs=h264', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  for (const type of candidates) if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) return type;
  throw new Error('VIDEO_UNSUPPORTED');
}

export async function renderStoryVideo(
  input: { title: string; photos: string[]; day: string; ko: boolean },
  onProgress?: (fraction: number) => void,
): Promise<StoryVideoResult> {
  const mimeType = pickMimeType();
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH; canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('NO_CANVAS');

  const imgs = (await Promise.all(input.photos.slice(0, 5).map(src => loadImage(src).catch(() => null)))).filter((img): img is HTMLImageElement => !!img);
  if (!imgs.length) throw new Error('NO_PHOTOS');

  const root = getComputedStyle(document.documentElement);
  const hand = root.getPropertyValue('--font-hand').trim() || 'cursive', sans = root.getPropertyValue('--font-geist-sans').trim() || 'sans-serif';
  await Promise.all([document.fonts.load(`700 90px ${hand}`, input.title), document.fonts.load(`700 32px ${sans}`)]).catch(() => {});

  const segMs = Math.max(PHOTO_MS - TRANSITION_MS, 1);
  const photosStart = TITLE_MS;
  const photosEnd = photosStart + (imgs.length - 1) * segMs + PHOTO_MS;
  const totalMs = photosEnd + END_MS;

  const stream = canvas.captureStream(FPS);
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 6_000_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
  const stopped = new Promise<Blob>(resolve => { recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType })); });
  recorder.start();

  const start = performance.now();
  await new Promise<void>(resolve => {
    function frame() {
      const t = performance.now() - start;
      ctx!.fillStyle = '#15130f'; ctx!.fillRect(0, 0, WIDTH, HEIGHT);
      ctx!.textAlign = 'center';

      if (t < TITLE_MS) {
        const inAlpha = Math.min(t / 350, 1);
        ctx!.globalAlpha = inAlpha;
        ctx!.fillStyle = '#e9dcc3'; ctx!.font = `700 28px ${sans}`;
        ctx!.fillText('MEMONESTIA', WIDTH / 2, HEIGHT / 2 - 70);
        ctx!.fillStyle = '#fff'; const size = fitText(ctx!, input.title, WIDTH - 160, 88, '700', hand);
        ctx!.font = `700 ${size}px ${hand}`; ctx!.fillText(input.title, WIDTH / 2, HEIGHT / 2 + 10);
        ctx!.globalAlpha = 1;
      } else if (t < photosEnd) {
        const pt = t - photosStart;
        for (let i = 0; i < imgs.length; i++) {
          const segStart = i * segMs, segEnd = segStart + PHOTO_MS;
          if (pt < segStart || pt >= segEnd) continue;
          const local = pt - segStart, progress = Math.min(local / PHOTO_MS, 1);
          let opacity = 1;
          if (i > 0 && local < TRANSITION_MS) opacity = local / TRANSITION_MS;
          if (i < imgs.length - 1 && local > PHOTO_MS - TRANSITION_MS) opacity = Math.min(opacity, (PHOTO_MS - local) / TRANSITION_MS);
          drawKenBurns(ctx!, imgs[i], progress, opacity);
        }
        const vignette = ctx!.createLinearGradient(0, HEIGHT - 320, 0, HEIGHT);
        vignette.addColorStop(0, '#00000000'); vignette.addColorStop(1, '#000000b0');
        ctx!.fillStyle = vignette; ctx!.fillRect(0, HEIGHT - 320, WIDTH, 320);
        ctx!.fillStyle = '#fff'; const size = fitText(ctx!, input.title, WIDTH - 160, 54, '700', hand);
        ctx!.font = `700 ${size}px ${hand}`; ctx!.fillText(input.title, WIDTH / 2, HEIGHT - 150);
        if (input.day) { ctx!.fillStyle = '#ffffffcc'; ctx!.font = `600 28px ${sans}`; ctx!.fillText(input.day.replaceAll('-', '.'), WIDTH / 2, HEIGHT - 104); }
      } else {
        const local = t - photosEnd, alpha = Math.min(local / 350, 1);
        ctx!.globalAlpha = alpha;
        ctx!.fillStyle = '#e9dcc3'; ctx!.font = `700 30px ${sans}`;
        ctx!.fillText(input.ko ? '우리의 앨범, 계속 쌓는 중' : 'Our album, still growing', WIDTH / 2, HEIGHT / 2 - 24);
        ctx!.fillStyle = '#fff'; ctx!.font = `700 40px ${sans}`;
        ctx!.fillText('memonestia.xyz', WIDTH / 2, HEIGHT / 2 + 36);
        ctx!.globalAlpha = 1;
      }

      onProgress?.(Math.min(t / totalMs, 1));
      if (t < totalMs) requestAnimationFrame(frame);
      else resolve();
    }
    requestAnimationFrame(frame);
  });

  recorder.stop();
  const blob = await stopped;
  return { blob, mimeType };
}
