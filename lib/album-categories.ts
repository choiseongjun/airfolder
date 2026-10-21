import type { AlbumThemeId } from './album-themes';

export const albumCategories = [
 {id:'travel',ko:'여행 · 모험',en:'Travel',description:'떠나는 순간부터 돌아오는 길까지',themes:['passport','camp','postcard','ticket','metro','stamp']},
 {id:'daily',ko:'일상 · 음식',en:'Everyday',description:'별것 아닌 하루가 가장 좋은 기록',themes:['recipe','newspaper','parcel','receipt','diary','desktop','softgirl']},
 {id:'celebrate',ko:'축하 · 함께',en:'Celebrations',description:'생일, 졸업, 그리고 함께할 모든 날',themes:['wedding','yearbook','birthday','fourcut']},
 {id:'culture',ko:'취향 · 기록',en:'Culture',description:'음악과 영화, 전시와 경기의 주인공으로',themes:['sports','vinyl','cinema','gallery','film','magazine','scrap']},
 {id:'fantasy',ko:'상상 · 놀이',en:'Imagination',description:'카드를 열고, 사건을 풀고, 세계를 탐험해요',themes:['blueprint','tarot','quest','detective','comic','orbit']},
 {id:'nature',ko:'자연 · 계절',en:'Nature',description:'바다와 식물, 햇살과 별빛을 닮은 앨범',themes:['garden','aquarium','picnic','polaroid','starry']},
] as const satisfies readonly {id:string;ko:string;en:string;description:string;themes:readonly AlbumThemeId[]}[];
export type AlbumCategoryId = typeof albumCategories[number]['id'];
export function themeInCategory(theme: string, category: string) {
 return category === 'all' || !!albumCategories.find(item => item.id === category)?.themes.some(id => id === theme);
}
