export const albumThemes = [
 { id: 'ticket', ko: '보딩패스', en: 'Boarding Pass', hintKo: '탑승권을 뜯으면 열리는 여행 앨범', hintEn: 'Tear the pass to open the trip', kicker: 'BOARDING PASS', chapter: 'GATE', layout: 'ticket' },
 { id: 'receipt', ko: '추억 영수증', en: 'Memory Receipt', hintKo: '감열지 영수증으로 지이잉 출력', hintEn: 'Printed out like a thermal receipt', kicker: 'MEMONESTIA PHOTO LAB', chapter: 'ITEM', layout: 'receipt' },
 { id: 'vinyl', ko: 'LP 플레이어', en: 'Vinyl Player', hintKo: '돌아가는 LP와 그날의 노래', hintEn: 'A spinning record and the song of the day', kicker: 'SIDE A', chapter: 'TRACK', layout: 'vinyl' },
 { id: 'polaroid', ko: '폴라로이드 썸머', en: 'Polaroid Summer', hintKo: '파란 바다, 마스킹테이프, 손글씨', hintEn: 'Blue sea, washi tape, handwriting', kicker: 'SUMMER DIARY', chapter: 'DAY', layout: 'classic' },
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

