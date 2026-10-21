import { albumThemes } from './album-themes';
// Use the same catalogue for server validation and the client picker.
export const ALBUM_THEME_IDS = albumThemes.map(theme => theme.id);
export const SONG_MAX = 80;
export const CAPSULE_MAX_DAYS = 90;
