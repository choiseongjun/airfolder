'use client';
// Renders a themed album as a 1080x1920 story image (Instagram/Threads stories) on a canvas.

export type StoryTheme = 'polaroid' | 'film' | 'softgirl' | 'birthday' | 'picnic' | 'starry' | 'diary' | 'fourcut' | 'ticket' | 'magazine' | 'stamp' | 'scrap' | 'receipt' | 'vinyl';
type Palette = { bg: (ctx: CanvasRenderingContext2D, w: number, h: number) => void; ink: string; sub: string; accent: string; frame: string; kicker: string };

const palettes: Record<StoryTheme, Palette> = {
 polaroid: { ink: '#1d5b86', sub: '#3a7cab', accent: '#ff8a5c', frame: '#fffefa', kicker: 'SUMMER DIARY', bg: (ctx, w, h) => { const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#cfeaf8'); g.addColorStop(.55, '#f3f6ef'); g.addColorStop(1, '#f6e5c3'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); dots(ctx, w, h, '#ffffffaa', 44, 3); } },
 film: { ink: '#f6e7c4', sub: '#d9c59c', accent: '#ff9d3b', frame: '#0e0d0b', kicker: 'ROLL 01 · 36 EXP', bg: (ctx, w, h) => { ctx.fillStyle = '#1b1a17'; ctx.fillRect(0, 0, w, h); for (let i = 0; i < 9000; i++) { ctx.fillStyle = Math.random() > .5 ? '#ffffff08' : '#00000014'; ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2); } } },
 softgirl: { ink: '#d0507b', sub: '#c2557d', accent: '#e46d93', frame: '#ffffff', kicker: 'xoxo, us', bg: (ctx, w, h) => { ctx.fillStyle = '#fff0f3'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#ffd6e077'; for (let x = 0; x < w; x += 56) ctx.fillRect(x, 0, 28, h); for (let y = 0; y < h; y += 56) ctx.fillRect(0, y, w, 28); } },
 picnic: { ink: '#c9364b', sub: '#4f7d3f', accent: '#5a9b4a', frame: '#ffffff', kicker: 'PICNIC CLUB', bg: (ctx, w, h) => { ctx.fillStyle = '#fffdf6'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#ff6b7a33'; for (let x = 0; x < w; x += 72) ctx.fillRect(x, 0, 36, h); for (let y = 0; y < h; y += 72) ctx.fillRect(0, y, w, 36); } },
 starry: { ink: '#fff4d6', sub: '#c9c3ff', accent: '#ff7ad9', frame: '#ffffff', kicker: 'NIGHT OUT', bg: (ctx, w, h) => { const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#141a3d'); g.addColorStop(1, '#3a2763'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); for (let i = 0; i < 220; i++) { ctx.fillStyle = `rgba(255,255,255,${(0.3 + Math.random() * 0.7).toFixed(2)})`; ctx.beginPath(); ctx.arc(Math.random() * w, Math.random() * h, Math.random() * 2.4 + .4, 0, Math.PI * 2); ctx.fill(); } } },
 diary: { ink: '#2b3a67', sub: '#55608a', accent: '#d9534f', frame: '#ffffff', kicker: 'MY DIARY', bg: (ctx, w, h) => { ctx.fillStyle = '#fffdf6'; ctx.fillRect(0, 0, w, h); ctx.strokeStyle = '#c9d8f0'; ctx.lineWidth = 2; for (let y = 120; y < h; y += 56) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); } ctx.strokeStyle = '#f2a7a7'; ctx.beginPath(); ctx.moveTo(110, 0); ctx.lineTo(110, h); ctx.stroke(); } },
 fourcut: { ink: '#ffffff', sub: '#cfcfcf', accent: '#ffffff', frame: '#ffffff', kicker: 'PHOTO BOOTH', bg: (ctx, w, h) => { ctx.fillStyle = '#141414'; ctx.fillRect(0, 0, w, h); } },
 ticket: { ink: '#1f3b5b', sub: '#4d6b8c', accent: '#e8833a', frame: '#ffffff', kicker: 'BOARDING PASS', bg: (ctx, w, h) => { ctx.fillStyle = '#e6eef6'; ctx.fillRect(0, 0, w, h); ctx.strokeStyle = '#c4d4e4'; ctx.setLineDash([14, 12]); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(60, 1640); ctx.bezierCurveTo(360, 1500, 700, 1700, 1020, 1560); ctx.stroke(); ctx.setLineDash([]); } },
 magazine: { ink: '#111111', sub: '#444444', accent: '#d6332f', frame: '#ffffff', kicker: 'ISSUE NO. 01', bg: (ctx, w, h) => { ctx.fillStyle = '#f4f1ea'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#d6332f'; ctx.fillRect(0, 0, w, 18); } },
 stamp: { ink: '#7a2e2e', sub: '#9a5a4a', accent: '#2f5f8a', frame: '#ffffff', kicker: 'AIR MAIL', bg: (ctx, w, h) => { ctx.fillStyle = '#f2ead8'; ctx.fillRect(0, 0, w, h); const stripe = ['#c9463d', '#f2ead8', '#2f5f8a', '#f2ead8']; for (let x = -40, i = 0; x < w + 40; x += 34, i++) { ctx.fillStyle = stripe[i % 4]; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 34, 0); ctx.lineTo(x + 10, 28); ctx.lineTo(x - 24, 28); ctx.fill(); ctx.beginPath(); ctx.moveTo(x, h); ctx.lineTo(x + 34, h); ctx.lineTo(x + 10, h - 28); ctx.lineTo(x - 24, h - 28); ctx.fill(); } } },
 scrap: { ink: '#3a2a1a', sub: '#5d4632', accent: '#3a2a1a', frame: '#fffaf0', kicker: 'SCRAPBOOK', bg: (ctx, w, h) => { ctx.fillStyle = '#d6bf98'; ctx.fillRect(0, 0, w, h); for (let i = 0; i < 1400; i++) { ctx.fillStyle = Math.random() > .5 ? '#ffffff14' : '#5a3e1a14'; ctx.fillRect(Math.random() * w, Math.random() * h, Math.random() * 30 + 4, 2); } } },
 receipt: { ink: '#1f1f1f', sub: '#555555', accent: '#1f1f1f', frame: '#fbfaf6', kicker: 'MEMONESTIA PHOTO LAB', bg: (ctx, w, h) => { ctx.fillStyle = '#d9d6cf'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#fbfaf6'; ctx.fillRect(120, 0, w - 240, h); ctx.fillStyle = '#d9d6cf'; for (let x = 120; x < w - 120; x += 24) { ctx.beginPath(); ctx.moveTo(x, h); ctx.lineTo(x + 12, h - 14); ctx.lineTo(x + 24, h); ctx.fill(); } } },
 vinyl: { ink: '#f4ead8', sub: '#c9b99c', accent: '#e8b04a', frame: '#f4ead8', kicker: 'SIDE A · NOW PLAYING', bg: (ctx, w, h) => { ctx.fillStyle = '#211a16'; ctx.fillRect(0, 0, w, h); ctx.strokeStyle = '#ffffff10'; ctx.lineWidth = 2; for (let r = 80; r < 520; r += 9) { ctx.beginPath(); ctx.arc(w / 2, h - 120, r, 0, Math.PI * 2); ctx.stroke(); } } },
 birthday: { ink: '#ff5a87', sub: '#5a3d8a', accent: '#7c5cff', frame: '#ffffff', kicker: 'HAPPY BIRTHDAY', bg: (ctx, w, h) => { ctx.fillStyle = '#fff9ef'; ctx.fillRect(0, 0, w, h); dots(ctx, w, h, '#ff8fb1', 92, 5); dots(ctx, w, h, '#7cc4e8', 116, 5, 40); dots(ctx, w, h, '#ffd25e', 140, 6, 70); } },
};

function dots(ctx: CanvasRenderingContext2D, w: number, h: number, color: string, step: number, r: number, offset = 0) {
 ctx.fillStyle = color;
 for (let y = offset; y < h; y += step) for (let x = (y / step) % 2 ? step / 2 : 0; x < w; x += step) { ctx.beginPath(); ctx.arc(x + offset, y, r, 0, Math.PI * 2); ctx.fill(); }
}
function loadImage(src: string) { return new Promise<HTMLImageElement>((resolve, reject) => { const img = new Image(); img.crossOrigin = 'anonymous'; img.onload = () => resolve(img); img.onerror = reject; img.src = src; }); }
function cover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
 const scale = Math.max(w / img.width, h / img.height), sw = w / scale, sh = h / scale;
 ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
}
function fitText(ctx: CanvasRenderingContext2D, text: string, max: number, size: number, weight: string, family: string) {
 let s = size; ctx.font = `${weight} ${s}px ${family}`;
 while (ctx.measureText(text).width > max && s > 28) { s -= 2; ctx.font = `${weight} ${s}px ${family}`; }
}

/** Draws one print in the theme's frame, rotated around its centre. */
function print(ctx: CanvasRenderingContext2D, theme: StoryTheme, img: HTMLImageElement | undefined, x: number, y: number, w: number, h: number, deg: number, tint: string) {
 const p = palettes[theme];
 ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.rotate(deg * Math.PI / 180); ctx.translate(-w / 2, -h / 2);
 ctx.shadowColor = theme === 'starry' ? '#ff7ad9aa' : '#0000002e'; ctx.shadowBlur = theme === 'starry' ? 46 : 30; ctx.shadowOffsetY = theme === 'starry' ? 0 : 14;
 const pad = theme === 'film' ? 0 : 22, bottom = theme === 'polaroid' ? 90 : pad;
 ctx.fillStyle = theme === 'birthday' ? tint : p.frame;
 if (theme === 'softgirl') { ctx.beginPath(); ctx.roundRect(0, 0, w, h, 44); ctx.fill(); } else ctx.fillRect(0, 0, w, h);
 ctx.shadowColor = 'transparent';
 if (theme === 'birthday') { ctx.fillStyle = '#fff'; ctx.fillRect(10, 10, w - 20, h - 20); }
 const ix = theme === 'birthday' ? 26 : pad, iy = theme === 'film' ? 34 : theme === 'birthday' ? 26 : pad, iw = w - ix * 2, ih = h - iy - (theme === 'film' ? 34 : theme === 'birthday' ? 26 : bottom);
 ctx.save();
 if (theme === 'softgirl') { ctx.beginPath(); ctx.roundRect(ix, iy, iw, ih, 30); ctx.clip(); }
 if (img) { if (theme === 'film') ctx.filter = 'sepia(.18) saturate(.92) contrast(1.06)'; cover(ctx, img, ix, iy, iw, ih); ctx.filter = 'none'; }
 else { ctx.fillStyle = '#e9e2d6'; ctx.fillRect(ix, iy, iw, ih); }
 ctx.restore();
 if (theme === 'film') { ctx.fillStyle = '#e6dcc4d9'; for (let sx = 14; sx < w - 14; sx += 32) { ctx.fillRect(sx, 9, 16, 14); ctx.fillRect(sx, h - 23, 16, 14); } }
 if (theme === 'polaroid') { ctx.fillStyle = '#ffe58fd9'; ctx.save(); ctx.translate(w / 2, -6); ctx.rotate(-.05); ctx.fillRect(-90, -16, 180, 44); ctx.restore(); }
 ctx.restore();
}

export async function renderStory(canvas: HTMLCanvasElement, input: { theme: StoryTheme; title: string; photos: string[]; people: string[]; day: string; ko: boolean }) {
 const w = 1080, h = 1920, ctx = canvas.getContext('2d'); if (!ctx) throw new Error('NO_CANVAS');
 canvas.width = w; canvas.height = h;
 const p = palettes[input.theme], root = getComputedStyle(document.documentElement);
 const hand = root.getPropertyValue('--font-hand').trim() || 'cursive', sans = root.getPropertyValue('--font-geist-sans').trim() || 'sans-serif';
 await Promise.all([document.fonts.load(`700 80px ${hand}`, input.title), document.fonts.load(`400 40px ${hand}`, input.people.join(''))]).catch(() => {});
 const imgs = await Promise.all(input.photos.slice(0, 3).map(src => loadImage(src).catch(() => undefined)));
 p.bg(ctx, w, h);
 if (input.theme === 'birthday') { const colors = ['#ff8fb1', '#7cc4e8', '#ffd25e', '#a78bfa']; for (let i = 0; i < 12; i++) { const x = 20 + i * 88, sag = Math.sin(i / 11 * Math.PI) * 26; ctx.fillStyle = colors[i % 4]; ctx.beginPath(); ctx.moveTo(x, 24 + sag); ctx.lineTo(x + 70, 24 + sag); ctx.lineTo(x + 35, 110 + sag); ctx.fill(); } }
 ctx.textAlign = 'center';
 ctx.fillStyle = p.accent; ctx.font = `700 34px ${sans}`; ctx.fillText(p.kicker.split('').join(String.fromCharCode(8202)), w / 2, 210);
 ctx.fillStyle = p.ink; fitText(ctx, input.title, w - 140, 96, '700', hand); ctx.fillText(input.title, w / 2, 330);
 print(ctx, input.theme, imgs[0], 150, 410, 780, 700, -2, '#ff8fb1');
 print(ctx, input.theme, imgs[1] || imgs[0], 90, 1150, 470, 450, -4, '#ffd25e');
 print(ctx, input.theme, imgs[2] || imgs[1] || imgs[0], 525, 1185, 470, 450, 3.5, '#7cc4e8');
 ctx.fillStyle = p.sub;
 if (input.people.length) { const names = input.people.slice(0, 4).join(' · ') + (input.people.length > 4 ? (input.ko ? ` 외 ${input.people.length - 4}명` : ` +${input.people.length - 4}`) : ''); fitText(ctx, names, w - 160, 46, '700', hand); ctx.fillText(names, w / 2, 1712); }
 ctx.font = `600 32px ${sans}`; ctx.fillText(input.day ? input.day.replaceAll('-', '.') : '', w / 2, 1770);
 ctx.fillStyle = input.theme === 'film' ? '#ffffff22' : '#ffffffcc'; ctx.beginPath(); ctx.roundRect(w / 2 - 250, 1806, 500, 70, 35); ctx.fill();
 ctx.fillStyle = input.theme === 'film' ? '#f6e7c4' : '#3a2a17'; ctx.font = `700 32px ${sans}`;
 ctx.fillText(input.ko ? 'memonestia.xyz · 우리 앨범 만들기' : 'memonestia.xyz · make yours', w / 2, 1852);
 return await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('NO_BLOB')), 'image/jpeg', .92));
}
