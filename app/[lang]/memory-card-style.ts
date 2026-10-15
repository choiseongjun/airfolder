export type FrameId = 'four' | 'film' | 'postcard';
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
