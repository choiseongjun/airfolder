export const noteColors = ['cream', 'peach', 'sage', 'lavender'] as const;
export type NoteColor = typeof noteColors[number];
export type NoteOptions = { color?: NoteColor; photoId?: string };
export function parseNoteColor(value: unknown): NoteColor {
  if (value === undefined) return 'cream';
  if (!noteColors.includes(value as NoteColor)) throw new Error('INVALID_NOTE_COLOR');
  return value as NoteColor;
}
