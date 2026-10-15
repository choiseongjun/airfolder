import type { Metadata } from 'next';
import { publicLocales, publicLocaleTags, type PublicLocale } from './public-locale';

// Keep preview deployments out of search, even when they inherit SITE_URL.
export function publicOrigin(): string | undefined {
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production') return undefined;
  const value = process.env.SITE_URL || (process.env.VERCEL_ENV === 'production' ? 'https://memonestia.xyz' : undefined);
  if (!value) return undefined;
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.hostname === 'localhost' || url.pathname !== '/' || url.search || url.hash || url.username || url.password) {
    throw new Error('SITE_URL must be a public HTTPS origin without a path or credentials');
  }
  return url.origin;
}

export const copy = {
  en: {
    title: 'Memonestia — Shared photo albums & memory cards',
    description: 'Everyone’s photos. One little story. Gather moments into shared albums, make photo strips and postcards, and choose the photos you share with your people.',
    eyebrow: 'YOUR MOMENTS. TOGETHER.',
    heading: 'Days together.\nMemories to revisit.',
    intro: 'Bring everyone’s photos into a shared space. From the first trip to the next gathering, keep collecting the moments you want to come back to.',
    cta: 'Start your collection',
    stepsTitle: 'Gather today. Revisit together.',
    steps: [['Make a shared space', 'Start with friends, family, a gathering or a collection of your own.'], ['Add everyone’s moments', 'Choose photos from your device and add them to the folder. Taking photos here is optional.'], ['Choose what you share', 'Photos start private. Select the shots to share with folder members.']],
    usesTitle: 'For the people and days that matter.',
    uses: [['Travel', 'Keep the trip together and share your favourite moments with friends.'], ['Gatherings', 'Invite people with a link or QR code and collect shared moments in one place.'], ['Work', 'Document an installation or a cleaning job, then share the finished result.'], ['Personal', 'Keep receipts, hobbies and product photos in their own folders.']],
    faqTitle: 'Before you start',
    faqs: [['Do guests need to install an app?', 'No. An invitation opens on the web, where guests can view shared photos, download them and add photos from their device.'], ['Are added photos automatically shared?', 'No. Photos are private to the person who added them until they choose to share.'], ['Can I use Memonestia on my own?', 'Yes. Create folders for your own photos and invite others when you want a shared space.'], ['Can I download my photos?', 'Yes. Download the photos you can access. New uploads preserve the selected original file, videos up to 50 MB and photos up to 20 MB, subject to server storage limits, with separate compressed image and video previews. Older uploads may only have a processed copy. MP4, MOV and WebM videos are supported; playback depends on device codecs.'], ['Which languages are supported?', 'The interface is available in English and Korean. Folder names and photo names stay as you write them.']],
    footer: 'Private by default. Shared by choice.',
  },
  ko: {
    title: 'Memonestia — 사진 공유 앨범과 네컷 추억 카드',
    description: '각자의 사진을 모아, 우리만의 한 페이지로. 네컷·필름·엽서로 추억을 만들고 친구·가족과 함께 앨범에 간직하세요. 사진은 기본 비공개, 공유는 내가 선택하는 Memonestia.',
    eyebrow: '함께 모으고, 다시 꺼내보는 우리의 기록.',
    heading: '함께한 날들이,\n계속 이어지는 곳.',
    intro: '첫 여행부터 다음 모임까지. 각자 찍은 사진을 한곳에 모으고, 나누고 싶은 순간을 함께 간직하세요.',
    cta: '우리의 공간 만들기',
    stepsTitle: '오늘 모으고, 함께 다시 꺼내보세요.',
    steps: [['우리의 공간을 만드세요', '친구들, 우리 가족, 동호회 또는 나만의 기록을 위한 공간을 만드세요.'], ['각자의 순간을 모으세요', '기기에서 사진을 선택해 폴더에 추가하세요. 여기서 직접 촬영할 수도 있어요.'], ['필요한 사진만 공유하세요', '사진은 기본 비공개입니다. 선택한 사진만 폴더 멤버들에게 공개하세요.']],
    usesTitle: '함께한 사람들, 기억하고 싶은 날들.',
    uses: [['여행', '여행 사진을 따로 담고, 마음에 드는 순간을 친구들과 나누세요.'], ['모임', '링크나 QR로 초대해, 각자 찍고 공개한 사진을 한곳에 모으세요.'], ['업무', '설치나 청소 과정을 기록하고 완성된 결과를 공유하세요.'], ['개인 기록', '영수증, 취미, 상품 사진을 목적별 폴더에 보관하세요.']],
    faqTitle: '시작 전에 궁금한 것들',
    faqs: [['초대받은 사람도 앱을 설치해야 하나요?', '아니요. 초대 링크로 웹에서 참여해 공개 사진을 보고 내려받거나, 기기에서 사진을 골라 추가할 수 있습니다.'], ['추가한 사진은 자동으로 공유되나요?', '아니요. 사진을 추가한 본인이 공개하기 전까지는 나만 볼 수 있습니다.'], ['혼자 사용해도 되나요?', '네. 개인 사진 정리용으로 사용하다가, 함께 모으고 싶을 때 다른 사람을 초대하세요.'], ['사진을 다운로드할 수 있나요?', '네. 접근 권한이 있는 사진을 다운로드할 수 있습니다. 새로 올리는 사진·영상은 서버 저장소 한도 내에서 영상 50MB·사진 20MB까지 선택한 원본을 보관하며 사진 미리보기는 따로 만듭니다. 이전 업로드는 가공본만 있을 수 있습니다. MP4·MOV·WebM 영상을 지원하며 재생은 기기 코덱에 따라 달라집니다.'], ['어떤 언어를 지원하나요?', '현재 영어와 한국어 화면을 지원합니다. 직접 입력한 폴더 이름과 사진 이름은 그대로 유지됩니다.']],
    footer: '사진은 기본 비공개. 공유는 내가 선택.',
  },
} as const;
export type PublicLanguage = keyof typeof copy;
export function isPublicLanguage(value: string): value is PublicLanguage { return value === 'en' || value === 'ko'; }
export function publicAlternates(origin: string) {
  return Object.fromEntries([...publicLocales.map(locale => [publicLocaleTags[locale], `${origin}/${locale}`]), ['x-default', `${origin}/en`]]);
}
export const regionalMetadata = {
  'en-ph': { title: 'Memonestia Philippines — Shared photo albums for your barkada', description: 'Collect travel, birthday and family reunion photos in one shared album. Invite your barkada with a link, choose what to share, and make photo cards in your browser.' },
  id: { title: 'Memonestia Indonesia — Album foto bersama & kartu kenangan', description: 'Kumpulkan foto liburan, ulang tahun, dan acara keluarga dalam satu album bersama. Undang lewat tautan, pilih foto yang dibagikan, lalu buat kartu kenangan di browser.' },
} as const;
export function publicMetadata(lang: PublicLocale): Metadata {
  const origin = publicOrigin();
  const text = lang === 'id' || lang === 'en-ph' ? regionalMetadata[lang] : copy[lang];
  return {
    title: text.title, description: text.description, applicationName: 'Memonestia',
    metadataBase: origin ? new URL(origin) : undefined,
    robots: { index: Boolean(origin), follow: Boolean(origin) },
    alternates: origin ? { canonical: `${origin}/${lang}`, languages: publicAlternates(origin) } : undefined,
    openGraph: { type: 'website', title: text.title, description: text.description, siteName: 'Memonestia', locale: { ko: 'ko_KR', en: 'en_US', 'en-ph': 'en_PH', id: 'id_ID' }[lang], alternateLocale: publicLocales.filter(locale => locale !== lang).map(locale => ({ ko: 'ko_KR', en: 'en_US', 'en-ph': 'en_PH', id: 'id_ID' })[locale]), ...(origin ? { url: `${origin}/${lang}`, images: [{ url: `${origin}/share-card.png`, width: 1200, height: 630, alt: text.title }] } : {}) },
    twitter: { card: 'summary_large_image', title: text.title, description: text.description, ...(origin ? { images: [`${origin}/share-card.png`] } : {}) },
  };
}
