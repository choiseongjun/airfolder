export const memoryTemplates = [
  { id: 'friends', name: '친구와 하루', eyebrow: 'OUR LITTLE DAY', description: '별일 없어서 더 좋았던 하루.', title: '우리라서 좋았던 하루', note: '다음에도 이렇게, 우리 같이.', style: 'four', mood: 'cream', photos: ['cafe-friends','bbq-friends','festival-friends','spring-picnic'] },
  { id: 'birthday', name: '생일 축하', eyebrow: 'A WISH FOR YOU', description: '사진 네 장에 축하하는 마음을 담아.', title: '태어나줘서 고마워', note: '올해도 같이 축하해서 좋았다 ♡', style: 'four', mood: 'rose', photos: ['family-birthday','cafe-friends','spring-picnic','bbq-friends'] },
  { id: 'travel', name: '여행 네컷', eyebrow: 'SOMEWHERE WITH YOU', description: '다시 꺼내보고 싶은 여행의 네 장면.', title: '우리의 작은 여행', note: '함께라서 더 오래 기억할 풍경.', style: 'four', mood: 'mint', photos: ['jeju-couple','hiking-friends','spring-picnic','autumn-family'] },
] as const;
export type MemoryTemplate = typeof memoryTemplates[number];
export function memoryTemplate(id: string | null | undefined) { return memoryTemplates.find(item => item.id === id); }
