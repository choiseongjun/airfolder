import type { Metadata } from 'next';

// Set only to the verified production origin. Never publish localhost canonicals.
export function publicOrigin(): string | undefined {
  const value = process.env.SITE_URL;
  if (!value) return undefined;
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.hostname === 'localhost' || url.pathname !== '/' || url.search || url.hash || url.username || url.password) {
    throw new Error('SITE_URL must be a public HTTPS origin without a path or credentials');
  }
  return url.origin;
}

export const copy = {
  en: {
    title: 'Snaproom — Shoot anywhere. Gather photos together.',
    description: 'Collect travel, event and work photos in shared folders. Add photos from your favourite camera app, keep them private, and share only what you choose.',
    eyebrow: 'SHOOT ANYWHERE. GATHER HERE.',
    heading: 'Shoot anywhere.\nGather here.',
    intro: 'Keep using the camera you love. Bring everyone’s photos into one folder, then share selected moments. Your guests can join on the web.',
    cta: 'Open Snaproom',
    stepsTitle: 'One folder. Everyone’s moments.',
    steps: [['Choose a folder', 'Make a space for a trip, a gathering, a job or your own collection.'], ['Bring your photos', 'Choose photos from your device and add them to the folder. Taking photos here is optional.'], ['Share by choice', 'Photos start private. Select the shots to share with folder members.']],
    usesTitle: 'One place for different parts of your day.',
    uses: [['Travel', 'Keep the trip together and share your favourite moments with friends.'], ['Gatherings', 'Invite people with a link or QR code and collect shared moments in one place.'], ['Work', 'Document an installation or a cleaning job, then share the finished result.'], ['Personal', 'Keep receipts, hobbies and product photos in their own folders.']],
    faqTitle: 'Before you start',
    faqs: [['Do guests need to install an app?', 'No. An invitation opens on the web, where guests can view shared photos, download them and add photos from their device.'], ['Are added photos automatically shared?', 'No. Photos are private to the person who added them until they choose to share.'], ['Can I use Snaproom on my own?', 'Yes. Create folders for your own photos and invite others when you want a shared space.'], ['Can I download my photos?', 'Yes. Download the photos you can access. Stored photos are processed JPEGs, up to 2560 pixels per dimension; original files are not archived.'], ['Which languages are supported?', 'The interface is available in English and Korean. Folder names and photo names stay as you write them.']],
    footer: 'Private by default. Shared by choice.',
  },
  ko: {
    title: 'Snaproom — 촬영은 어디서든, 사진은 한곳에',
    description: '좋아하는 카메라로 찍은 여행·모임·업무 사진을 한 폴더에 모으세요. 기본 비공개로 보관하고, 필요한 사진만 초대한 사람들과 공유하세요.',
    eyebrow: '촬영은 어디서든. 사진은 여기로.',
    heading: '어디서 찍든,\n한곳에.',
    intro: '좋아하는 카메라는 그대로 쓰세요. 각자 찍은 사진을 같은 폴더에 담고, 필요한 순간만 공유하세요. 초대받은 사람은 웹으로 참여할 수 있어요.',
    cta: 'Snaproom 시작하기',
    stepsTitle: '하나의 폴더에, 각자의 순간을.',
    steps: [['폴더를 고르세요', '여행, 모임, 작업 현장, 개인 기록에 맞는 공간을 만드세요.'], ['찍어둔 사진을 모으세요', '기기에서 사진을 선택해 폴더에 추가하세요. 여기서 직접 촬영할 수도 있어요.'], ['필요한 사진만 공유하세요', '사진은 기본 비공개입니다. 선택한 사진만 폴더 멤버들에게 공개하세요.']],
    usesTitle: '하나의 공간, 여러 가지 일상.',
    uses: [['여행', '여행 사진을 따로 담고, 마음에 드는 순간을 친구들과 나누세요.'], ['모임', '링크나 QR로 초대해, 각자 찍고 공개한 사진을 한곳에 모으세요.'], ['업무', '설치나 청소 과정을 기록하고 완성된 결과를 공유하세요.'], ['개인 기록', '영수증, 취미, 상품 사진을 목적별 폴더에 보관하세요.']],
    faqTitle: '시작 전에 궁금한 것들',
    faqs: [['초대받은 사람도 앱을 설치해야 하나요?', '아니요. 초대 링크로 웹에서 참여해 공개 사진을 보고 내려받거나, 기기에서 사진을 골라 추가할 수 있습니다.'], ['추가한 사진은 자동으로 공유되나요?', '아니요. 사진을 추가한 본인이 공개하기 전까지는 나만 볼 수 있습니다.'], ['혼자 사용해도 되나요?', '네. 개인 사진 정리용으로 사용하다가, 함께 모으고 싶을 때 다른 사람을 초대하세요.'], ['사진을 다운로드할 수 있나요?', '네. 접근 권한이 있는 사진을 다운로드할 수 있습니다. 저장되는 사진은 각 변 최대 2560픽셀의 가공된 JPEG이며, 원본 파일은 별도로 보관하지 않습니다.'], ['어떤 언어를 지원하나요?', '현재 영어와 한국어 화면을 지원합니다. 직접 입력한 폴더 이름과 사진 이름은 그대로 유지됩니다.']],
    footer: '사진은 기본 비공개. 공유는 내가 선택.',
  },
} as const;
export type PublicLanguage = keyof typeof copy;
export function isPublicLanguage(value: string): value is PublicLanguage { return value === 'en' || value === 'ko'; }
export function publicMetadata(lang: PublicLanguage): Metadata {
  const origin = publicOrigin();
  const text = copy[lang];
  return {
    title: text.title, description: text.description, applicationName: 'Snaproom',
    metadataBase: origin ? new URL(origin) : undefined,
    robots: { index: Boolean(origin), follow: Boolean(origin) },
    alternates: origin ? { canonical: `${origin}/${lang}`, languages: { en: `${origin}/en`, ko: `${origin}/ko`, 'x-default': `${origin}/en` } } : undefined,
    openGraph: { type: 'website', title: text.title, description: text.description, siteName: 'Snaproom', locale: lang === 'ko' ? 'ko_KR' : 'en_US', alternateLocale: lang === 'ko' ? 'en_US' : 'ko_KR', ...(origin ? { url: `${origin}/${lang}`, images: [{ url: `${origin}/share-card.png`, width: 1200, height: 630, alt: 'Snaproom — Shoot anywhere. Gather here.' }] } : {}) },
    twitter: { card: 'summary_large_image', title: text.title, description: text.description, ...(origin ? { images: [`${origin}/share-card.png`] } : {}) },
  };
}
