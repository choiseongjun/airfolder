import { extraAlbumThemes } from './extra-album-themes';
export const albumThemes = [
 ...extraAlbumThemes.map(theme => ({ ...theme, layout: 'collection' as const })),
 { id: 'desktop', ko: '추억.zip', en: 'Memory.zip', hintKo: '옛날 컴퓨터의 폴더를 열어 꺼내는 사진 파일', hintEn: 'Open folders on a retro desktop', kicker: 'MEMORY OS · 1999', chapter: 'DIRECTORY', layout: 'desktop' },
 { id: 'metro', ko: '하루 노선도', en: 'Day Line', hintKo: '사진 한 장이 한 정거장, 하루를 잇는 노선', hintEn: 'Every photo is a stop along your day', kicker: 'MEMORY TRANSIT', chapter: 'LINE', layout: 'metro' },
 { id: 'tarot', ko: '운명의 사진 카드', en: 'Arcana Memories', hintKo: '별빛 카드 뒷면을 열면 나타나는 그날의 장면', hintEn: 'Reveal the moments hidden in your cards', kicker: 'THE MEMORY ARCANA', chapter: 'ARCANA', layout: 'tarot' },
 { id: 'detective', ko: '그날의 사건 파일', en: 'The Memory Case', hintKo: '빨간 실, 증거 사진, 기밀 문서로 추적하는 하루', hintEn: 'Follow red threads and photographic evidence', kicker: 'CONFIDENTIAL · CASE FILE', chapter: 'EVIDENCE', layout: 'detective' },
 { id: 'quest', ko: '추억 퀘스트', en: 'Memory Quest', hintKo: '사진으로 채우는 게임 맵과 클리어 보상', hintEn: 'A game map of moments and unlocked rewards', kicker: 'PLAYER ONE · SAVE FILE', chapter: 'WORLD', layout: 'quest' },
 { id: 'cinema', ko: '우리의 엔딩 크레딧', en: 'End Credits', hintKo: '와이드 스크린과 출연진으로 완성하는 한 편의 영화', hintEn: 'Widescreen scenes with a cast and closing credits', kicker: 'A FILM BY ALL OF US', chapter: 'SCENE', layout: 'cinema' },
 { id: 'comic', ko: '오늘의 만화', en: 'Comic Day', hintKo: '말풍선과 컷 분할로 만드는 한 편의 만화', hintEn: 'Turn your day into panels and speech bubbles', kicker: 'THE DAILY COMIC', chapter: 'EPISODE', layout: 'comic' },
 { id: 'orbit', ko: '우주 관측일지', en: 'Orbit Log', hintKo: '우주선 창 너머로 수집한 반짝이는 순간', hintEn: 'Collect moments through a spacecraft window', kicker: 'MISSION: MEMORIES', chapter: 'LOG', layout: 'orbit' },
 { id: 'gallery', ko: '나의 작은 전시', en: 'Private Exhibition', hintKo: '여백과 작품 번호로 완성하는 작은 미술관', hintEn: 'A quiet exhibition with artwork labels', kicker: 'A PRIVATE EXHIBITION', chapter: 'ROOM', layout: 'gallery' },
 { id: 'ticket', ko: '보딩패스', en: 'Boarding Pass', hintKo: '탑승권을 뜯으면 열리는 여행 앨범', hintEn: 'Tear the pass to open the trip', kicker: 'BOARDING PASS', chapter: 'GATE', layout: 'ticket' },
 { id: 'receipt', ko: '추억 영수증', en: 'Memory Receipt', hintKo: '감열지 영수증으로 지이잉 출력', hintEn: 'Printed out like a thermal receipt', kicker: 'MEMONESTIA PHOTO LAB', chapter: 'ITEM', layout: 'receipt' },
 { id: 'vinyl', ko: 'LP 플레이어', en: 'Vinyl Player', hintKo: '돌아가는 LP와 그날의 노래', hintEn: 'A spinning record and the song of the day', kicker: 'SIDE A', chapter: 'TRACK', layout: 'vinyl' },
 { id: 'polaroid', ko: '폴라로이드 앨범', en: 'Polaroid Album', hintKo: '마스킹테이프와 손글씨로 남기는 우리 사진', hintEn: 'Our photos with washi tape and handwritten notes', kicker: 'OUR LITTLE MOMENTS', chapter: 'DAY', layout: 'classic' },
 { id: 'birthday', ko: '버스데이 필름', en: 'Birthday Film', hintKo: '가랜드, 컨페티, 케이크', hintEn: 'Garland, confetti & cake', kicker: 'HAPPY BIRTHDAY', chapter: 'PART', layout: 'classic' },
 { id: 'fourcut', ko: '인생네컷', en: 'Photo Booth', hintKo: '네 컷 스트립으로 착착', hintEn: 'Stacked four-cut strips', kicker: 'PHOTO BOOTH', chapter: 'TAKE', layout: 'strip' },
 { id: 'film', ko: '필름 아카이브', en: 'Film Archive', hintKo: '필름 프레임과 주황 날짜 도장', hintEn: 'Film frames & orange date stamps', kicker: 'ROLL 01 · 36 EXP', chapter: 'FRAME', layout: 'classic' },
 { id: 'magazine', ko: '매거진', en: 'Magazine', hintKo: '큰 화보 사진과 기사 구성', hintEn: 'Cover shots and feature spreads', kicker: 'ISSUE NO. 01', chapter: 'FEATURE', layout: 'magazine' },
 { id: 'starry', ko: '별밤 콘서트', en: 'Starry Night', hintKo: '밤하늘, 별빛, 네온 테두리', hintEn: 'Night sky, starlight & neon', kicker: 'NIGHT OUT', chapter: 'TRACK', layout: 'classic' },
 { id: 'scrap', ko: '크래프트 스크랩', en: 'Kraft Scrapbook', hintKo: '겹쳐 붙인 사진과 찢은 메모지', hintEn: 'Overlapped prints & torn notes', kicker: 'SCRAPBOOK', chapter: 'NO.', layout: 'collage' },
 { id: 'stamp', ko: '우표 컬렉션', en: 'Stamp Collection', hintKo: '톱니 테두리와 날짜 소인', hintEn: 'Perforated edges & postmarks', kicker: 'AIR MAIL', chapter: 'SET', layout: 'stamp' },
 { id: 'softgirl', ko: '소프트 걸', en: 'Soft Girl', hintKo: '핑크 깅엄, 리본, 하트', hintEn: 'Pink gingham, ribbons & hearts', kicker: 'xoxo, us', chapter: '♡', layout: 'classic' },
 { id: 'picnic', ko: '피크닉 데이', en: 'Picnic Day', hintKo: '체크 돗자리, 체리, 데이지', hintEn: 'Gingham blanket, cherries & daisies', kicker: 'PICNIC CLUB', chapter: 'SPOT', layout: 'classic' },
 { id: 'diary', ko: '다이어리 노트', en: 'Diary Notebook', hintKo: '줄노트에 붙이고 옆에 메모', hintEn: 'Taped on lined paper, notes in the margin', kicker: 'MY DIARY', chapter: 'PAGE', layout: 'notebook' },
] as const;
export type AlbumThemeId = typeof albumThemes[number]['id'];

