// Search landing pages: one page per thing people actually search for, each pointing at the flow that does it.
type Pair = [string, string];
export type Guide = {
 slug: string; image: string; cta: { href: string; ko: string; en: string };
 title: Pair; description: Pair; kicker: Pair; h1: Pair; lead: Pair;
 pains: Pair[]; steps: [Pair, Pair][]; why: [Pair, Pair][]; faqs: [Pair, Pair][];
};

export const guides: Guide[] = [
 {
  slug: 'birthday-album', image: '/explore/photo-26.jpg', cta: { href: '/birthday', ko: '생일 앨범 만들기', en: 'Make a birthday album' },
  title: ['생일 앨범 만들기 — 친구들이 사진 한 장씩 채우는 온라인 생일 앨범 | Memonestia', 'Make a birthday photo album with friends online | Memonestia'],
  description: ['친구 생일, 롤링페이퍼 대신 앨범으로. 링크 하나를 단톡방에 보내면 친구들이 사진과 한마디를 채우고, 버스데이 테마로 자동으로 꾸며져요. 앱 설치·가입 없이 무료.', 'Skip the card. Send one link to the group chat; friends add a photo and a note, and it decorates itself into a birthday album. No app or sign-up needed.'],
  kicker: ['생일 앨범 만들기', 'BIRTHDAY ALBUM'],
  h1: ['친구 생일, 앨범으로 선물해요', 'A birthday album your friends fill in'],
  lead: ['링크 하나만 단톡방에 보내면 친구들이 각자 찍은 사진 한 장과 한마디를 남겨요. 꾸미기는 자동이라, 생일날엔 예쁜 앨범 한 권이 완성돼 있어요.', 'Post one link in the group chat. Everyone adds a photo and a short note, the decorating is automatic, and on the day there is a finished album waiting.'],
  pains: [['롤링페이퍼는 다 같이 모이기 어렵고, 사진은 각자 폰에 흩어져 있어요.', 'Cards are hard to pass around, and the photos are scattered across phones.'], ['직접 꾸미려면 시간도 손재주도 필요해요.', 'Decorating an album by hand takes time and skill.'], ['단톡방에 올린 사진은 화질이 떨어지고 금방 묻혀요.', 'Photos dropped in the chat lose quality and get buried.']],
  steps: [[['주인공 이름과 생일 날짜 입력', 'Enter their name and birthday'], ['10초면 앨범과 초대 링크가 만들어져요. 주인공 몰래 만들어도 돼요.', 'An album and an invite link are ready in seconds. Keep it a surprise.']], [['단톡방에 링크 보내기', 'Send the link to the group chat'], ['보낼 메시지가 미리 써져 있어요. 친구들은 앱 설치나 가입 없이 바로 참여해요.', 'The message is written for you. Friends join without an app or account.']], [['친구들이 사진과 한마디 남기기', 'Friends add a photo and a note'], ['올라온 사진은 버스데이 테마로 가랜드·스티커·손글씨 메모와 함께 자동으로 꾸며져요.', 'Each photo is decorated automatically with garland, stickers and handwritten notes.']], [['생일날 주인공에게 공개', 'Reveal it on the day'], ['같은 링크를 주인공에게 보내면 완성된 앨범을 볼 수 있어요. 인스타 스토리 이미지도 바로 만들어져요.', 'Send the same link to the birthday person. A story image for Instagram is made too.']]],
  why: [[['꾸미기 0분', 'Zero decorating'], ['테마만 고르면 배치와 스티커는 알아서.', 'Pick a theme; layout and stickers are done for you.']], [['앱 설치 없이', 'No app to install'], ['링크를 누르면 휴대폰 웹에서 바로 열려요.', 'The link opens right in the phone browser.']], [['원본 화질 그대로', 'Original quality'], ['카톡처럼 화질이 깨지지 않아요.', 'Photos keep their quality, unlike chat apps.']]],
  faqs: [[['돈이 드나요?', 'Does it cost anything?'], ['생일 앨범 만들기와 친구 초대는 무료예요.', 'Making the album and inviting friends is free.']], [['친구들도 가입해야 하나요?', 'Do friends need to sign up?'], ['아니요. 링크를 열고 이름만 적으면 사진과 한마디를 남길 수 있어요.', 'No. They open the link, type a name, and add a photo and a note.']], [['주인공이 미리 보면 어떡하죠?', 'What if the birthday person sees it early?'], ['링크를 받은 사람만 볼 수 있어요. 생일날 주인공에게 같은 링크를 보내면 돼요.', 'Only people with the link can open it. Send the same link to them on the day.']], [['초대 링크는 언제까지 쓸 수 있나요?', 'How long does the invite link last?'], ['7일 동안 유효해요. 생일이 더 남았다면 앨범에서 새 링크를 만들 수 있어요.', 'Seven days. If the birthday is further away, make a fresh link from the album.']]],
 },
 {
  slug: 'collect-group-photos', image: '/explore/photo-0.jpg', cta: { href: '/start', ko: '사진 모으는 앨범 만들기', en: 'Start a shared album' },
  title: ['단체사진 모으기 — 단톡방 대신 링크 하나로 사진 한번에 모으는 법 | Memonestia', 'Collect group photos from everyone with one link | Memonestia'],
  description: ['"사진 좀 보내줘~" 이제 그만. 링크 하나로 친구들이 각자 찍은 사진을 원본 화질 그대로 한 앨범에 모아요. 앱 설치 없이 웹에서 바로, 무료로.', 'No more "send me the photos." One link gathers everyone’s shots into one album in original quality, right from the browser, for free.'],
  kicker: ['단체사진 모으기', 'COLLECT GROUP PHOTOS'],
  h1: ['"사진 좀 보내줘" 대신, 링크 하나', 'One link instead of "send me the photos"'],
  lead: ['모임이 끝나면 사진은 각자 폰에 흩어져요. 앨범 링크를 하나 보내면 모두가 고른 사진만 한곳에 모이고, 원본 그대로 내려받을 수 있어요.', 'After a get-together, photos end up on everyone’s phone. Send one album link and the chosen shots land in one place, ready to download in full quality.'],
  pains: [['단톡방에 보내면 화질이 깨지고 사진이 대화에 묻혀요.', 'Chat apps compress photos and bury them in the thread.'], ['한 명씩 "사진 보내줘"라고 부탁하기 번거로워요.', 'Asking each person for their photos gets tiring.'], ['누가 어떤 사진을 올렸는지 나중에 찾기 어려워요.', 'Later, it is hard to find who shot what.']],
  steps: [[['모임 이름으로 앨범 만들기', 'Name the album'], ['이름 하나면 초대 링크와 QR이 바로 나와요.', 'A name is all it takes to get an invite link and QR code.']], [['링크나 QR 공유', 'Share the link or QR'], ['단톡방에 보내거나 현장에서 QR을 보여주세요.', 'Post it in the group chat or show the QR in person.']], [['각자 고른 사진만 올리기', 'Everyone adds the photos they choose'], ['앱 설치 없이 올리고, 나만 보기 또는 멤버 공유를 고를 수 있어요.', 'No app needed; each photo can stay private or be shared with members.']], [['한 앨범에서 같이 보기', 'Enjoy it in one album'], ['꾸민 앨범으로 보고, 원본으로 내려받고, 카톡·인스타로 공유해요.', 'View it decorated, download originals, share to KakaoTalk or Instagram.']]],
  why: [[['원본 화질', 'Original quality'], ['압축된 카톡 사진이 아니라 원본 파일로.', 'The original files, not chat-compressed copies.']], [['기본 비공개', 'Private by default'], ['내가 고른 사진만, 고른 사람에게만.', 'Only the photos you choose, only to the people you choose.']], [['자동으로 예쁘게', 'Decorated automatically'], ['모인 사진이 테마 앨범으로 꾸며져요.', 'The collected photos turn into a themed album.']]],
  faqs: [[['몇 명까지 참여할 수 있나요?', 'How many people can join?'], ['링크를 받은 사람은 누구나 참여할 수 있어요. 모임 안에서만 공유해 주세요.', 'Anyone with the link can join, so share it within your group.']], [['사진 용량 제한이 있나요?', 'Is there a size limit?'], ['사진은 장당 20MB, 영상은 50MB까지 올릴 수 있어요.', 'Photos up to 20 MB and videos up to 50 MB each.']], [['다른 사람 사진도 내려받을 수 있나요?', 'Can I download other people’s photos?'], ['멤버에게 공유된 사진은 원본으로 내려받을 수 있어요.', 'Yes, photos shared with members can be downloaded as originals.']], [['앱을 설치해야 하나요?', 'Do I need an app?'], ['아니요. 휴대폰이나 PC 브라우저에서 바로 써요.', 'No. It works in any phone or desktop browser.']]],
 },
 {
  slug: 'travel-photo-album', image: '/explore/photo-5.jpg', cta: { href: '/start', ko: '여행 앨범 만들기', en: 'Make a trip album' },
  title: ['여행 사진 공유 앨범 — 친구들과 찍은 여행 사진 한곳에 모으기 | Memonestia', 'Shared travel photo album for friends | Memonestia'],
  description: ['친구들과 다녀온 여행, 각자 찍은 사진을 한 앨범으로. 링크로 모으고 폴라로이드·필름 테마로 자동 꾸미기, 인스타 스토리 이미지까지. 앱 설치 없이 무료.', 'Bring every friend’s trip photos into one album. Collect with a link, decorate in polaroid or film themes automatically, and get a story image. Free, no app.'],
  kicker: ['여행 사진 공유', 'TRAVEL PHOTO ALBUM'],
  h1: ['여행은 같이 갔는데, 사진은 따로따로', 'You travelled together. The photos didn’t.'],
  lead: ['여행 사진은 찍은 사람 폰에만 남아요. 여행 앨범 링크를 보내면 다 같이 찍은 사진이 날짜별로 모이고, 폴라로이드 썸머·필름 아카이브 테마로 자동으로 꾸며져요.', 'Trip photos stay on whoever took them. Share one album link and everyone’s shots come together, decorated in Polaroid Summer or Film Archive themes.'],
  pains: [['여행 끝나고 사진 정리하다 흐지부지돼요.', 'Sorting trip photos afterwards never quite happens.'], ['구글 포토 공유 앨범은 그냥 쌓이기만 하고 예쁘지 않아요.', 'Plain shared albums just pile photos up.'], ['스토리에 올릴 사진을 고르고 꾸미는 데 한참 걸려요.', 'Choosing and editing a story post takes ages.']],
  steps: [[['여행 이름으로 앨범 만들기', 'Name the trip album'], ['예: "제주, 우리 다섯의 여름".', 'For example, "Jeju, the five of us."']], [['같이 간 친구들에게 링크 보내기', 'Send the link to your travel crew'], ['다들 앱 설치 없이 사진을 골라 올려요.', 'Everyone adds photos without installing an app.']], [['한 줄 메모 남기기', 'Leave a one-line note'], ['"비 오던 날 성산일출봉" 같은 메모가 손글씨처럼 들어가요.', 'Notes like "rainy day at Seongsan" appear in handwriting.']], [['테마 고르고 공유하기', 'Pick a theme and share'], ['테마를 눌러보면 바로 바뀌고, 인스타 스토리 이미지도 만들어져요.', 'Tap themes to switch instantly and get an Instagram story image.']]],
  why: [[['자동 꾸미기', 'Automatic decorating'], ['사진과 메모만 올리면 끝.', 'Just add photos and notes.']], [['모두의 시선', 'Everyone’s point of view'], ['내가 못 찍은 장면까지 한 앨범에.', 'The shots you missed, all in one album.']], [['스토리용 이미지', 'Story-ready image'], ['9:16 이미지로 바로 저장.', 'Saved as a 9:16 image in one tap.']]],
  faqs: [[['여행 중에도 바로 올릴 수 있나요?', 'Can we add photos during the trip?'], ['네. 휴대폰 브라우저에서 언제든 올릴 수 있어요.', 'Yes, from any phone browser, any time.']], [['테마는 몇 가지인가요?', 'How many themes are there?'], ['폴라로이드 썸머, 필름 아카이브, 소프트 걸, 버스데이 필름 4가지예요.', 'Four: Polaroid Summer, Film Archive, Soft Girl and Birthday Film.']], [['사진은 공개되나요?', 'Are photos public?'], ['기본은 비공개예요. 공유를 고른 사진만 앨범 멤버가 볼 수 있어요.', 'Private by default. Only photos you share are visible to album members.']], [['무료인가요?', 'Is it free?'], ['앨범 만들기와 초대, 테마 꾸미기는 무료예요.', 'Making albums, inviting and theming are free.']]],
 },
 {
  slug: 'wedding-guest-photos', image: '/explore/photo-39.jpg', cta: { href: '/start', ko: '하객 사진 앨범 만들기', en: 'Make a guest photo album' },
  title: ['결혼식 하객 사진 모으기 — QR 하나로 하객 사진 한 앨범에 | Memonestia', 'Collect wedding guest photos with a QR code | Memonestia'],
  description: ['하객들이 찍은 결혼식·돌잔치 사진을 QR 하나로 한 앨범에. 앱 설치 없이 스캔해서 바로 올리고, 신랑신부는 원본으로 내려받아요.', 'Guests scan one QR code and add their wedding or party photos to one album, no app needed. You download every original.'],
  kicker: ['하객 사진 모으기', 'WEDDING GUEST PHOTOS'],
  h1: ['하객들이 찍은 우리 결혼식, QR 하나로 모아요', 'Every guest’s photos of your day, gathered by one QR'],
  lead: ['스냅 작가가 놓친 장면은 하객들 폰에 있어요. 테이블에 QR을 두면 하객들이 스캔해서 사진을 올리고, 한 앨범에 모두 모여요.', 'The moments your photographer missed are on your guests’ phones. Put a QR code on each table and their photos land in one album.'],
  pains: [['하객 사진은 받으려면 한 명씩 연락해야 해요.', 'Getting guests’ photos means messaging them one by one.'], ['카톡으로 받으면 화질이 깨져요.', 'Photos sent over chat lose quality.'], ['하객 대부분은 앱을 새로 깔고 싶어 하지 않아요.', 'Most guests won’t install an app for it.']],
  steps: [[['앨범 만들고 QR 받기', 'Create the album and get its QR'], ['앨범 이름만 정하면 초대 QR이 나와요.', 'Name the album to get an invite QR code.']], [['테이블·입구에 QR 두기', 'Place the QR on tables or at the entrance'], ['청첩장이나 식순표에 넣어도 좋아요.', 'Printing it on invitations or programs works too.']], [['하객은 스캔하고 사진 올리기', 'Guests scan and upload'], ['앱 설치 없이 휴대폰 웹에서 바로 올려요.', 'Straight from the phone browser, no app.']], [['원본으로 내려받기', 'Download the originals'], ['모인 사진을 원본 화질로 내려받고 꾸민 앨범으로 간직해요.', 'Download everything in full quality and keep a decorated album.']]],
  why: [[['설치 없는 QR', 'QR without an app'], ['스캔하면 바로 올릴 수 있어요.', 'Scan and upload right away.']], [['원본 화질', 'Original quality'], ['압축 없이 원본 파일 그대로.', 'Original files, no compression.']], [['한 앨범에', 'All in one album'], ['하객 수십 명의 사진이 한곳에.', 'Dozens of guests, one album.']]],
  faqs: [[['하객이 많아도 되나요?', 'Can many guests join?'], ['네. QR이나 링크를 가진 사람은 누구나 참여할 수 있어요.', 'Yes, anyone with the QR or link can join.']], [['QR은 언제까지 쓸 수 있나요?', 'How long does the QR work?'], ['초대 링크는 7일간 유효해요. 행사 직전에 만들면 돼요.', 'Invite links last seven days, so create it shortly before the event.']], [['돌잔치나 행사에도 쓸 수 있나요?', 'Does it work for other events?'], ['네. 돌잔치, 졸업식, 회사 행사 등 사람이 모이는 자리면 다 돼요.', 'Yes: first birthdays, graduations, company events and more.']], [['하객 사진이 다른 사람에게 공개되나요?', 'Can other guests see the photos?'], ['하객이 멤버 공유를 고른 사진만 앨범 멤버에게 보여요.', 'Only photos a guest chooses to share are visible to album members.']]],
 },
 {
  slug: 'online-photo-strip', image: '/explore/photo-43.jpg', cta: { href: '/?studio=1', ko: '네컷 만들기', en: 'Make a photo strip' },
  title: ['온라인 인생네컷 만들기 — 내 사진으로 네컷·필름 스트립 만들기 | Memonestia', 'Make an online photo strip from your own photos | Memonestia'],
  description: ['부스에 가지 않아도, 폰에 있는 친구 사진으로 인생네컷처럼. 네컷 프레임·필름 스트립·엽서로 만들고 인스타용 이미지로 저장해요. 무료.', 'No booth needed: turn photos already on your phone into a four-cut strip, film strip or postcard and save it for Instagram. Free.'],
  kicker: ['온라인 네컷 만들기', 'ONLINE PHOTO STRIP'],
  h1: ['폰에 있는 사진으로, 인생네컷처럼', 'A photo-booth strip from the photos on your phone'],
  lead: ['이미 찍어둔 친구 사진 몇 장이면 충분해요. 네컷 프레임과 필름 스트립에 담고, 인스타 스토리용 이미지로 바로 저장하세요.', 'A few photos you already have are enough. Put them in a four-cut frame or film strip and save a story-ready image.'],
  pains: [['다 같이 부스에 갈 시간이 없어요.', 'Getting everyone to a booth is hard.'], ['이미 찍은 좋은 사진들이 그냥 갤러리에 있어요.', 'Great photos you already took just sit in the gallery.'], ['꾸미는 앱은 기능이 너무 많아 복잡해요.', 'Editing apps are crowded with features.']],
  steps: [[['사진 고르기', 'Pick your photos'], ['폰에 있는 사진을 2~4장 골라요.', 'Choose two to four photos from your phone.']], [['프레임 고르기', 'Choose a frame'], ['네컷, 필름 스트립, 엽서 중에서 골라요.', 'Four-cut, film strip or postcard.']], [['저장하고 공유하기', 'Save and share'], ['이미지로 저장해 인스타나 카톡에 올려요.', 'Save the image and post it to Instagram or KakaoTalk.']]],
  why: [[['부스 없이', 'No booth'], ['언제 어디서든 휴대폰으로.', 'Anywhere, from your phone.']], [['몇 번의 탭', 'A few taps'], ['복잡한 편집 없이 바로 완성.', 'Done without fiddly editing.']], [['앨범으로 이어서', 'Keep going as an album'], ['친구들 사진을 모아 앨범으로 키울 수 있어요.', 'Grow it into a shared album with friends.']]],
  faqs: [[['무료인가요?', 'Is it free?'], ['네. 네컷과 스트립 만들기는 무료예요.', 'Yes, strips and cards are free to make.']], [['사진이 서버에 저장되나요?', 'Are photos stored on a server?'], ['앨범에 저장할 때만 올라가요. 기본은 비공개예요.', 'Only when you save them to an album, and they are private by default.']], [['어떤 비율로 저장되나요?', 'What size is the image?'], ['인스타 스토리에 맞는 세로 이미지로 저장할 수 있어요.', 'A vertical image sized for Instagram stories.']], [['앱을 설치해야 하나요?', 'Do I need an app?'], ['아니요. 휴대폰 브라우저에서 바로 돼요.', 'No, it works in your phone browser.']]],
 },
];

export const guideBySlug = (slug: string) => guides.find(g => g.slug === slug);
