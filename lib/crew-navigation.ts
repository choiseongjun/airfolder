import type { Locale } from '../app/i18n';

export type CrewScreen = 'home' | 'photos' | 'behind' | 'settings';
export const crewTabs = [
  { key: 'home', icon: 'cottage', ko: '홈', en: 'Home' },
  { key: 'photos', icon: 'photo_library', ko: '내 작품', en: 'My books' },
  { key: 'create', icon: 'add_circle', ko: '추억책 만들기', en: 'Make a book' },
  { key: 'behind', icon: 'sticky_note_2', ko: '선물하기', en: 'Give a memory' },
  { key: 'settings', icon: 'settings', ko: '내 계정', en: 'Account' },
] as const;

export function crewHref(screen: CrewScreen, locale: Locale, group = 'personal') {
  const query = new URLSearchParams({ lang: locale, group });
  if (screen === 'home') query.set('home', '1');
  const paths={home:'/',photos:'/library',behind:'/gifts',settings:'/account'};
  return `${paths[screen]}?${query}`;
}
