import { albumThemes, type AlbumThemeId } from './album-themes';
import type { ExtraAlbumThemeId } from './extra-album-themes';
export const memoryTemplates = [
  { id: 'friends', name: '친구와 하루', eyebrow: 'OUR LITTLE DAY', description: '별일 없어서 더 좋았던 하루.', title: '우리라서 좋았던 하루', note: '다음에도 이렇게, 우리 같이.', style: 'four', mood: 'cream', photos: ['cafe-friends','bbq-friends','festival-friends','spring-picnic'] },
  { id: 'birthday', name: '생일 축하', eyebrow: 'A WISH FOR YOU', description: '사진 네 장에 축하하는 마음을 담아.', title: '태어나줘서 고마워', note: '올해도 같이 축하해서 좋았다 ♡', style: 'four', mood: 'rose', photos: ['family-birthday','cafe-friends','spring-picnic','bbq-friends'] },
  { id: 'travel', name: '여행 네컷', eyebrow: 'SOMEWHERE WITH YOU', description: '다시 꺼내보고 싶은 여행의 네 장면.', title: '우리의 작은 여행', note: '함께라서 더 오래 기억할 풍경.', style: 'four', mood: 'mint', photos: ['jeju-couple','hiking-friends','spring-picnic','autumn-family'] },
] as const;
export type MemoryTemplate = {id:string;name:string;eyebrow:string;description:string;title:string;note:string;style:string;mood:string;photos:readonly string[];albumTheme?:AlbumThemeId};
const albumScenes: Record<Exclude<AlbumThemeId, ExtraAlbumThemeId>, { title: string; photos: readonly string[] }> = {
  desktop: { title: '다시 열어본 여름.zip', photos: ['jeju-couple','cafe-friends','spring-picnic','hiking-friends'] },
  metro: { title: '종점은 행복역', photos: ['spring-picnic','cafe-friends','bbq-friends','festival-friends'] },
  tarot: { title: '우연인 듯 운명인 날', photos: ['jeju-couple','autumn-family','family-birthday','spring-picnic'] },
  detective: { title: '사라진 주말을 찾아서', photos: ['cafe-friends','bbq-friends','hiking-friends','festival-friends'] },
  quest: { title: '주말 원정대, 출발!', photos: ['hiking-friends','bbq-friends','spring-picnic','jeju-couple'] },
  cinema: { title: '여름이 끝나기 전에', photos: ['festival-friends','jeju-couple','autumn-family','cafe-friends'] },
  comic: { title: '별일 있는 하루!', photos: ['bbq-friends','festival-friends','cafe-friends','spring-picnic'] },
  orbit: { title: '지구에서 보낸 신호', photos: ['hiking-friends','jeju-couple','festival-friends','autumn-family'] },
  gallery: { title: '느리게 바라본 계절', photos: ['autumn-family','spring-picnic','jeju-couple','hiking-friends'] },
  ticket: { title: '다음 역은 제주', photos: ['jeju-couple','hiking-friends','spring-picnic','autumn-family'] },
  receipt: { title: '행복 한 잔, 추가요', photos: ['cafe-friends','bbq-friends','spring-picnic','family-birthday'] },
  vinyl: { title: '그 밤의 플레이리스트', photos: ['festival-friends','bbq-friends','cafe-friends','jeju-couple'] },
  polaroid: { title: '여름을 한 장 더', photos: ['jeju-couple','spring-picnic','hiking-friends','bbq-friends'] },
  birthday: { title: '태어나줘서 고마워', photos: ['family-birthday','cafe-friends','spring-picnic','bbq-friends'] },
  fourcut: { title: '셋, 둘, 하나, 웃어!', photos: ['cafe-friends','bbq-friends','festival-friends','spring-picnic'] },
  film: { title: '빛이 머물던 오후', photos: ['hiking-friends','autumn-family','jeju-couple','cafe-friends'] },
  magazine: { title: '주말의 발견', photos: ['spring-picnic','cafe-friends','jeju-couple','autumn-family'] },
  starry: { title: '아직 앙코르가 남았어', photos: ['festival-friends','bbq-friends','jeju-couple','cafe-friends'] },
  scrap: { title: '좋아하는 것 수집 중', photos: ['bbq-friends','spring-picnic','autumn-family','cafe-friends'] },
  stamp: { title: '먼 곳에서 안부를', photos: ['jeju-couple','autumn-family','hiking-friends','spring-picnic'] },
  softgirl: { title: '분홍빛 작은 취향', photos: ['cafe-friends','family-birthday','spring-picnic','jeju-couple'] },
  picnic: { title: '오늘은 바깥에서', photos: ['spring-picnic','hiking-friends','bbq-friends','autumn-family'] },
  diary: { title: '10월의 어느 페이지', photos: ['autumn-family','cafe-friends','family-birthday','hiking-friends'] },
};
export const albumTemplates: MemoryTemplate[] = albumThemes.map(theme => ({id: `album-${theme.id}`,name:theme.ko,eyebrow:theme.kicker,description:theme.hintKo,...('title' in theme ? {title:theme.title,photos:[...theme.photos].reverse()}:albumScenes[theme.id]),note:'다시 꺼내보고 싶은 순간들.',style:'four',mood:'cream',albumTheme:theme.id}));
export function memoryTemplate(id: string | null | undefined) { return [...memoryTemplates,...albumTemplates].find(item => item.id === id); }
