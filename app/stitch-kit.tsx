import { Literata, Noto_Sans_KR, Plus_Jakarta_Sans } from 'next/font/google';
import './stitch.css';

// Shared pieces for screens ported 1:1 from the product's Stitch mockups (Literata + Plus Jakarta Sans,
// Material Symbols). Korean glyphs fall back to Noto Sans KR under both faces, as in Stitch's renders.
const sans = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-stitch-sans', preload: false });
const serif = Literata({ subsets: ['latin'], variable: '--font-stitch-serif', preload: false });
const korean = Noto_Sans_KR({ subsets: ['latin'], variable: '--font-stitch-kr', preload: false });

export const stitchFonts = `${sans.variable} ${serif.variable} ${korean.variable}`;
export const stitchRoot = `stitch-root ${stitchFonts}`;
export const sansStack = 'var(--font-stitch-sans), var(--font-stitch-kr), sans-serif';
export const serifStack = 'var(--font-stitch-serif), var(--font-stitch-kr), serif';

// One subset for every ported screen: separate subsets share a family name and would override each other.
const icons = ['add_a_photo', 'add_circle', 'add_reaction', 'arrow_back', 'arrow_back_ios_new', 'auto_awesome', 'auto_stories', 'bookmark', 'bookmark_border', 'cached', 'chat_bubble_outline', 'check_circle', 'cottage', 'draw', 'edit_note', 'expand_more', 'favorite', 'favorite_border', 'flip', 'eco', 'graphic_eq', 'grid_view', 'group', 'groups', 'history_edu', 'inventory_2', 'ios_share', 'key', 'local_bar', 'local_post_office', 'lock', 'lock_reset', 'mail', 'more_horiz', 'movie', 'music_note', 'notifications', 'person', 'person_add', 'pets', 'schedule', 'verified_user', 'dashboard_customize', 'open_in_new', 'chevron_right', 'photo', 'photo_camera', 'photo_library', 'play_arrow', 'reply', 'send', 'settings', 'share', 'sticky_note_2', 'sync', 'verified', 'visibility'];
const iconFont = `https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&icon_names=${icons.join(',')}&display=block`;

export function StitchIconFont() {
  return <link rel="stylesheet" href={iconFont} precedence="default"/>;
}

export function Icon({ name, className = '', filled = false }: { name: string; className?: string; filled?: boolean }) {
  return <span aria-hidden="true" className={`material-symbols-outlined ${className}`} style={filled ? { fontVariationSettings: "'FILL' 1" } : undefined}>{name}</span>;
}
