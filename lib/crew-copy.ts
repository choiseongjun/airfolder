import type {Locale} from '../app/i18n';

// UI copy only. Never pass album titles, names, comments or other user content.
export const crewEnglish: Record<string,string> = Object.fromEntries(`
나|Me
크|C
오늘의 피드|Today's feed
함께 쌓아 온 순간들, 오늘도 이어봐요.|Keep adding to the moments we share.
여행 사진을 모으고, 함께 간 친구에게 보내세요.|Gather your trip photos and send them to your friends.
공간 앨범|Albums in this space
최근 앨범|Recent albums
개|items
사진|Photos
장 · 앨범 열기|photos · Open album
아직 앨범이 없어요. 사진을 담으면 이곳에서 바로 볼 수 있어요.|No albums yet. Add photos to start your collection.
최근 기록|Recent memories
이 공간에서 볼 수 있는 최근 기록 12개예요. 이전 사진은 앨범에서 이어보세요.|Your 12 most recent memories. Open an album to see earlier photos.
다음 여행도 여기서 이어봐요|Keep the next trip here, too
위 앨범은 샘플 사진으로 만든 예시예요. 내 앨범을 만들면 이 피드에 쌓이고, 친구가 보탠 사진도 함께 볼 수 있어요.|The albums above are examples. Create yours to see your photos and your friends' contributions here.
이미 쓰고 있다면 로그인 →|Already have an account? Sign in →
새 추억 앨범 만들기|Create a memory album
최대 30장|Up to 30 photos
사진을 모아보세요|Start collecting photos
사진 서랍으로 돌아가기|Back to photos
공동 사진 보관함|Our shared photo collection
우리들의 사진 서랍|Our photo drawer
차곡차곡 쌓인 우리 크루의 모든 순간과 숨겨진 사진 뒷면 이야기|Our moments, and the stories behind each photo
최신순|Newest
오래된순|Oldest
보기 방식 전환|Change view
사진 서랍 필터|Photo filters
전체|All
앨범 사진 모아보기|Browse album photos
장 저장됨|photos saved
사진 전체 보기|View all photos
해당 월 사진 보기|View this month's photos
월별 기록 없음|No monthly memories yet
특별한 날 모아보기|Albums for special days
개 앨범|albums
장 · 함께 모은 추억|photos · Memories together
· 사진과 뒷면 낙서를 모아봐요|· Collect photos and notes together
앨범책 펼쳐보기|Open album
사진 조각들|Photo moments
사진을 누르면 뒷면 낙서로 휙!|Tap a photo to see the notes
사진 서랍을 불러오지 못했어요. 잠시 후 다시 열어주세요.|Could not load photos. Please try again.
아직 모인 사진이 없어요|No photos yet
크루 앨범에 사진을 담으면 여기에 펼쳐져요.|Photos you add to crew albums appear here.
모든 사진과 원본은 크루원에게만 안전하게 보관됩니다.|Access to photos and originals follows your sharing settings.
공유 범위는 사진마다 설정한 크루 공개 기준을 따릅니다.|Each photo keeps its own sharing settings.
낙서를 남기지 못했어요. 다시 시도해 주세요.|Could not save your note. Please try again.
사진 뒷면 낙서 보기|See notes on the back
크루 사진|Crew photo
사진 뒷면 낙서|Notes on the back
아직 뒷면 낙서가 없어요.|No notes yet.
첫 한마디를 남겨보세요 ✨|Leave the first note ✨
한마디 남기기|Leave a note
등록|Post
사진 앞면 보기|See photo
뒷면 낙서 보기|See notes
비하인드 낙서장|Behind the photos
앨범 기록에 멤버들이 남긴 댓글과 사진 뒷면 메모|Your crew's comments and notes on shared memories
비하인드 필터|Note filters
전체 기록|All memories
최근 24시간|Last 24 hours
내 댓글이 있는 기록|Memories I've commented on
사진 뒷면 기록|Stories on the back
비하인드 사진을 불러오지 못했어요.|Could not load these memories.
아직 사진 뒷면에 낙서가 없어요. 첫 한마디를 남겨보세요.|No notes yet. Leave the first one.
공감을 저장하지 못했어요. 다시 시도해 주세요.|Could not save your reaction. Please try again.
기록의 뒷면|Behind this memory
앞면|Photo
아직 댓글이 없어요. 첫 한마디를 남겨보세요.|No comments yet. Leave the first one.
공감|Like
낙서|Notes
한 줄 남기기|Leave a line
사진 뒷면에 한마디 남기기…|What do you remember about this photo?
피드로 돌아가기|Back to feed
메모네스티아|Memonestia
사진함|Photos
슬라이드|Slideshow
✈ 여행 · 이벤트 묶음|✈ Trips & occasions
장의 조각|photos
우리의 여행 기록|Our trip memories
여행 날짜|Trip date
일차|day
사진 보기 방식|Photo view
▦ 전체 사진|▦ All photos
◉ 슬라이드 & 뒷면|◉ Slideshow & notes
여행의 모든 순간|Every moment of the trip
장|photos
한 장씩 천천히|One moment at a time
사진 뒷면 롤링페이퍼|Notes behind the photos
개의 추억 메모|memory notes
아직 남겨진 메모가 없어요.|No notes yet.
여행 사진|Trip photo
사진이 없어요.|No photos yet.
사진 앞면|Photo
뒷면 메모|Notes
← 이전|← Previous
앞면 보기|See photo
뒷면 보기|See notes
다음 →|Next →
크루장|Owner
게시물 메뉴|Post options
수정|Edit
삭제|Delete
내가 작성한 게시물만 수정하거나 삭제할 수 있어요.|You can edit or delete your own posts.
게시물을 숨기지 못했어요. 다시 시도해 주세요.|Could not hide this post. Please try again.
✈️ 여행 · 이벤트 묶음|✈️ Trips & occasions
사진을 뒤집어 메모 보기|Flip the photo to read notes
모아보기|View together
사진 뒷면 메모 보기|Read notes on the back
사진 보기|View photo
여행 날짜 선택|Select trip date
여행 사진 모아보기|View trip photos
전체 보기|View all
장 전체 슬라이드 & 뒷면 순회하기|photos · Slideshow & notes
비하인드 뒷면|Behind the photo
전체 사진 보기|View all photos
앨범 보기|View album
커뮤니티 규칙 동의 후 댓글을 남길 수 있어요.|Accept the community rules to leave a comment.
잠시 후 다시 남겨 주세요.|Please try again shortly.
지금은 댓글을 남길 수 없어요.|Comments are currently unavailable.
댓글을 남기지 못했어요.|Could not post your comment.
게시물을 삭제하지 못했어요. 권한과 연결을 확인해 주세요.|Could not delete this post. Check your access and connection.
피드를 불러오지 못했어요.|Could not load the feed.
다시 시도|Try again
사진 서랍으로 가기|Go to photos
어디로 갈까요?|Where shall we go?
함께 추억을 모을 공간을 선택하세요.|Choose a space for your memories.
공간 선택 닫기|Close space picker
+ 친구 초대|+ Invite friends
내 개인 공간|My space
참여 중인 공간 피드를 확인해 보세요.|See the memories in our space.
공간 피드 주소를 복사했어요.|Space link copied.
공유를 열지 못했어요. 초대 버튼에서 멤버를 초대할 수 있어요.|Could not open sharing. Use Invite to invite friends.
메모네스티아 홈|Memonestia home
로그인|Sign in
공간 피드 공유|Share space feed
계정 및 크루 설정|Account and crew settings
작은 순간을 모으는 곳|A home for little moments
내가 만든 공간|Created by me
초대받은 공간|Invited space
눌러서 다른 크루로 이동|Tap to switch spaces
크루 멤버|Crew members
개인 앨범과 초대받은 추억|Personal albums and shared memories
개인|Personal
내가 만든 공간 · 멤버|My space · Members
명|members
님이 만든 공간 · 멤버|'s space · Members
아직 참여 중인 공용 공간이 없어요. 친구의 초대 링크로 참여하면 이곳에 표시돼요.|No shared spaces yet. Join a friend's invite to see one here.
다른 공개 공간 둘러보기|Explore public spaces
님 · 멤버|· Members
공간에 참여하지 못했어요. 다시 시도해 주세요.|Could not join this space. Please try again.
참여 중…|Joining…
참여|Join
공개로 설정한 공간이 아직 없어요. 내 공간에서 공개 설정을 켜면 여기에 표시돼요.|No public spaces yet. Make a space discoverable to list it here.
새 앨범 공간 만들기|Create an album space
가족, 친구, 여행처럼 함께 기록할 사람들별로 공간을 만들어요.|Create a space for family, friends or your next trip.
닫기|Close
공간을 만들기 전에 동의가 필요해요|Before creating your space
아래 문서를 확인한 뒤 체크하고 동의해 주세요. 동의 후 이 창으로 돌아와 공간을 만들 수 있어요.|Read the documents below and accept to continue creating your space.
이용약관 · 커뮤니티 규칙 보기 ↗|Terms & community rules ↗
개인정보 처리 안내 보기 ↗|Privacy policy ↗
이용약관과 커뮤니티 규칙에 동의하고 개인정보 처리 안내를 확인했습니다.|I accept the terms and community rules and have read the privacy policy.
동의를 저장하지 못했어요. 연결을 확인하고 다시 시도해 주세요.|Could not save your consent. Check your connection and retry.
동의 저장 중…|Saving…
동의하고 공간 만들기로 돌아가기|Accept and continue
만들 수 있는 공간 수(50개)에 도달했어요.|You've reached the limit of 50 spaces.
공간을 만들지 못했어요. 잠시 후 다시 시도해 주세요.|Could not create the space. Please try again.
공간 이름|Space name
예: 우리 가족, 대학 친구들|e.g. Our family, College friends
공개 공간 둘러보기에 등록|List in public spaces
공간 이름, 만든 사람, 멤버 수가 표시돼요. 앨범과 사진은 참여한 뒤에도 각각의 공개 범위를 따라요.|The space name, creator and member count will be listed. Album and photo visibility settings still apply.
만드는 중…|Creating…
공간 만들기|Create space
내 공간|My space
나만의 작은 기록|My little memories
설정 정보를 불러오지 못했어요.|Could not load settings.
크루 알림을 켰어요|Crew notifications enabled
크루 알림을 껐어요|Crew notifications muted
알림 설정을 저장하지 못했어요. 다시 시도해 주세요.|Could not save notification settings. Please retry.
공개 공간 둘러보기에 표시해요|Listed in public spaces
공간을 비공개로 바꿨어요|Space is no longer listed
공개 범위를 저장하지 못했어요. 다시 시도해 주세요.|Could not save visibility. Please retry.
프로필 이름을 저장했어요|Profile name saved
프로필을 저장하지 못했어요. 다시 시도해 주세요.|Could not save your profile. Please retry.
로그아웃하지 못했어요. 다시 시도해 주세요.|Could not sign out. Please retry.
게스트|Guest
카카오 연동됨|Kakao connected
Google 연동됨|Google connected
Apple 연동됨|Apple connected
계정 연동됨|Account connected
뒤로 가기|Go back
마이 & 설정|Account & settings
개인 서랍|Private collection
연동 계정으로 안전하게 보관 중|Saved to your connected account
이 브라우저에 저장 · 다른 기기에서는 계정 연결 필요|Guest session in this browser · Connect an account to access from another device
프로필 수정|Edit profile
내 팀 크루|My crews
총|Total
곳 활동 중|active spaces
크루 보관함을 불러오는 중…|Loading crew albums…
멤버|Member
명 · 이번 달 조각|members · This month's moments
관리 중|Managing
보관|Saved
보관함 열기|Open collection
공개 공간 둘러보기에 표시|List in public spaces
공간 이름, 만든 사람, 멤버 수가 공개돼요. 앨범과 사진 권한은 그대로 유지돼요.|Lists the space name, creator and member count. Album and photo permissions stay the same.
크루 만들기 · 초대 · 멤버 관리|Create a crew · Invite · Manage members
열기|Open
접기|Close
내 보상과 캐릭터 보기|My rewards & characters
알림 및 공개 범위|Notifications & visibility
크루 알림|Crew notifications
이 크루에서 오는 푸시 알림을 설정해요|Choose whether to receive updates from this crew
크루 멤버 전용|For crew members
사진과 기록은 앨범의 공개 범위 설정에 따라 보여요.|Photo and memory access follows the album's sharing settings.
추억 보관과 다운로드|Back up your memories
보관·다운로드 안내 보기 →|Backup & download help →
문의: crewcheck.inapp@gmail.com|Support: crewcheck.inapp@gmail.com
사진 서랍|Photos
앨범과 사진 뒷면 기록을 확인해요|See albums and the stories behind your photos
안내 및 지원|Help & support
소중한 우리들만의 프라이빗 아카이브|A private home for our memories
친구들과의 사진과 롤링페이퍼를 안전하게 보관해요.|Keep your shared photos and notes together.
익명 피드백 및 버그 제보|Anonymous feedback & bug reports
개인정보 처리 안내|Privacy policy
서비스 버전 v1.0.0-archive|Version v1.0.0-archive
로그아웃|Sign out
표시 이름|Display name
취소|Cancel
저장|Save
앨범 메뉴|Album menu
우리 여행편|Our trip
앨범|Album
사진 앨범|Photo album
롤링페이퍼|Messages
앨범 설정을 불러오지 못했어요.|Could not load album settings.
앨범을 준비하고 있어요…|Preparing the album…
사진 크게 보기|Enlarge photo
닫기 ✕|Close ✕
여행 앨범 예시|Example trip album
각자가 기억하는 같은 여행|One trip, different memories
같이 다녀왔지만,|We went together.
기억은 다 다르니까.|We remember it differently.
나는 바다가 기억나고, 너는 그때 웃었던 게 기억나지?|I remember the sea. You remember how hard we laughed.
각자의 사진과 한마디로 우리 여행편을 만들어요.|Bring our trip back with everyone's photos and words.
내 사진과 기억|My photos and memories
친구의 한 장|A friend's photo
우리의 여행편|Our trip story
우리 여행편 시작하기 →|Start our trip story →
사진 1~3장으로 시작 · 친구는 사진 한 장과 한마디|Start with 1–3 photos · Friends add a photo and a note
예시 접기|Close example
함께 만든 여행편은 이런 모습이에요|See what a shared trip story looks like
아래 사진과 한마디는 예시입니다.|These photos and notes are examples.
부산에서 보낸 주말|A weekend in Busan
지우|Jiwoo
길 잘못 들어서 우연히 찾은 바다가 제일 좋았어 ㅋㅋ|My favorite part was finding the sea after taking a wrong turn!
서연|Seoyeon
나는 다 같이 뛰다가 신발에 모래 들어간 순간. 아직도 웃겨!|I remember running together and getting sand in our shoes. Still makes me laugh!
사진이 이야기가 되는 방법|When photos become stories
이런 앨범도 만들어봐요|More ways to keep a memory
테마 더 보기|Explore themes
다녀온 곳을 한 권에|Every destination in one book
맛있는 날의 기록|Memories of delicious days
다시 열어보는 추억|Memories to open again
공간을 불러오지 못했어요. 새로고침해서 다시 시도해 주세요.|Could not load this space. Refresh to try again.
공간을 바꾸지 못했어요. 다시 시도해 주세요.|Could not switch spaces. Please retry.
크루 공간을 여는 중…|Opening your space…
`.trim().split('\n').map(line=>{const i=line.indexOf('|');return [line.slice(0,i),line.slice(i+1)];}));

export function crewText(locale:Locale,key:string){return locale==='en' ? crewEnglish[key]??key : key;}
