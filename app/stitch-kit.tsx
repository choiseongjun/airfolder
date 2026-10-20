import { Literata, Noto_Sans_KR, Plus_Jakarta_Sans } from 'next/font/google';
import './stitch.css';

// Shared pieces for screens ported 1:1 from the product's Stitch mockups (Literata + Plus Jakarta Sans,
// Material Symbols). Korean glyphs fall back to Noto Sans KR under both faces, as in Stitch's renders.
const sans = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-stitch-sans', preload: false });
const serif = Literata({ subsets: ['latin'], variable: '--font-stitch-serif', preload: false });
const korean = Noto_Sans_KR({ subsets: ['latin'], variable: '--font-stitch-kr', preload: false });

export const stitchRoot = `stitch-root ${sans.variable} ${serif.variable} ${korean.variable}`;
export const sansStack = 'var(--font-stitch-sans), var(--font-stitch-kr), sans-serif';
export const serifStack = 'var(--font-stitch-serif), var(--font-stitch-kr), serif';

// One subset for every ported screen: separate subsets share a family name and would override each other.
const icons = ['add_circle', 'add_reaction', 'arrow_back', 'auto_awesome', 'auto_stories', 'bookmark', 'bookmark_border', 'cached', 'cottage', 'draw', 'edit_note', 'expand_more', 'favorite', 'favorite_border', 'flip', 'grid_view', 'group', 'ios_share', 'key', 'local_bar', 'lock_reset', 'more_horiz', 'music_note', 'person', 'person_add', 'pets', 'photo_camera', 'photo_library', 'play_arrow', 'reply', 'send', 'settings', 'share', 'sticky_note_2', 'visibility'];
const iconFont = `https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&icon_names=${icons.join(',')}&display=block`;

export function StitchIconFont() {
  return <link rel="stylesheet" href={iconFont} precedence="default"/>;
}

export function Icon({ name, className = '', filled = false }: { name: string; className?: string; filled?: boolean }) {
  return <span aria-hidden="true" className={`material-symbols-outlined ${className}`} style={filled ? { fontVariationSettings: "'FILL' 1" } : undefined}>{name}</span>;
}
