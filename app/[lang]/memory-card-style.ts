export type FrameId = 'four' | 'film' | 'postcard';
export const stickerDesigns = [
  { id: 'flower', ko: '꽃', en: 'Flower', color: '#e9ac76', path: 'M50 30C27-6 6 28 30 42C-6 50 12 82 37 65C37 103 73 98 65 65C94 89 113 55 76 44C109 20 73 0 61 30C58 8 42 8 50 30Z' },
  { id: 'heart', ko: '하트', en: 'Heart', color: '#ce7664', path: 'M50 87C36 75 7 55 7 32C7 8 36 2 50 23C64 2 93 8 93 32C93 55 64 75 50 87Z' },
  { id: 'star', ko: '별', en: 'Star', color: '#8b9e79', path: 'M50 5L62 35L95 37L70 58L78 91L50 73L22 91L30 58L5 37L38 35Z' },
] as const;
export type StickerId = (typeof stickerDesigns)[number]['id'];
export type CardSticker = { id: StickerId; x: number; y: number };
export const cardThemes = [
  { id: 'cream', ko: '크림', en: 'Cream', paper: '#fffdf3', ink: '#354137' },
  { id: 'sage', ko: '세이지', en: 'Sage', paper: '#dfe8d7', ink: '#344b3c' },
  { id: 'peach', ko: '피치', en: 'Peach', paper: '#f3d9cb', ink: '#6d4335' },
] as const;
export type ThemeId = (typeof cardThemes)[number]['id'];
export function cardPalette(frame: FrameId, themeId: ThemeId) {
  const theme = cardThemes.find(item => item.id === themeId) ?? cardThemes[0];
  return frame === 'film' ? { paper: theme.ink, ink: theme.paper } : { paper: theme.paper, ink: theme.ink };
}
