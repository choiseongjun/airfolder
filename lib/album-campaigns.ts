import { memoryTemplate } from './memory-templates';

// Each campaign opens the exact example promised in its post.
export const albumCampaigns = {
  travel: { template: 'album-ticket', title: '우리의 여행', note: '다음에도 같이 가자.', photos: ['jeju-couple', 'hiking-friends'] },
  couple: { template: 'album-polaroid', title: '함께 웃었던 날들', note: '흔들린 사진까지, 우리답게.', photos: ['jeju-couple'] },
  family: { template: 'album-diary', title: '우리 가족의 보통날', note: '찍어주는 사람도 함께 담아요.', photos: ['autumn-family', 'family-birthday'] },
  friends: { template: 'album-birthday', title: '태어나줘서 고마워', note: '같이 웃었던 날들을 모았어.', photos: ['cafe-friends', 'bbq-friends', 'festival-friends'] },
  daily: { template: 'album-film', title: '이번 달, 좋아했던 순간', note: '평범해서 오래 기억하고 싶은 날.', photos: ['spring-picnic', 'cafe-friends', 'autumn-family'] },
} as const;

export function makerTemplate(id?: string | null, occasion?: string | null) {
  const campaign = occasion && Object.hasOwn(albumCampaigns, occasion) ? albumCampaigns[occasion as keyof typeof albumCampaigns] : (!id || id === 'album-ticket') ? albumCampaigns.travel : null;
  const template = memoryTemplate(id || campaign?.template || 'album-ticket');
  return template && campaign?.template === template.id ? { ...template, title: campaign.title, note: campaign.note, photos: campaign.photos } : template;
}

export function campaignLink(occasion: keyof typeof albumCampaigns) {
  const q = new URLSearchParams({ template: albumCampaigns[occasion].template, occasion, utm_source: 'threads', utm_medium: 'social', utm_campaign: `${occasion}_album_20261025` });
  return `https://memonestia.xyz/make?${q}`;
}

export function isPhotoRequestEntry(template?: string | null, occasion?: string | null, themes = false, mode?: string | null) {
  return !themes && mode !== 'decorate' && (!template || template === 'album-ticket') && (!occasion || occasion === 'travel');
}
