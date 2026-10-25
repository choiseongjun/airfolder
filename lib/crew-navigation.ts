import type { Locale } from '../app/i18n';

export type CrewScreen = 'home' | 'photos' | 'behind' | 'settings';
export const crewTabs = [
  { key: 'home', icon: 'cottage', ko: '홈 피드', en: 'Home feed' },
  { key: 'photos', icon: 'photo_library', ko: '사진 서랍', en: 'Photos' },
  { key: 'create', icon: 'add_circle', ko: '앨범 생성', en: 'New album' },
  { key: 'behind', icon: 'sticky_note_2', ko: '비하인드', en: 'Behind the photos' },
  { key: 'settings', icon: 'settings', ko: '크루 설정', en: 'Crew settings' },
] as const;

export function crewHref(screen: CrewScreen, locale: Locale, group = 'personal') {
  const query = new URLSearchParams({ lang: locale, group });
  if (screen === 'home') query.set('home', '1');
  return `${screen === 'home' ? '/' : `/crew/${screen}`}?${query}`;
}
