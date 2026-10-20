"use client";
/* eslint-disable @next/next/no-img-element -- Local sample photographs; no optimization needed. */
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Icon, StitchIconFont, sansStack, stitchRoot } from './stitch-kit';

// Ported 1:1 from the Stitch screen "프라이빗 크루 데일리 홈 피드", shown with its sample crew while browsing
// signed out. Anything that writes (posting, inviting, commenting) leads to sign-in on the landing.
export default function BrowseScreen() {
  const router = useRouter();
  const signIn = () => router.push('/');
  const [memos, setMemos] = useState(true);
  return <div className={`${stitchRoot} h-screen overflow-y-auto bg-[#fff8f5] text-[#221a14] antialiased`} style={{ fontFamily: sansStack }}>
<StitchIconFont/>
<header className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50 pt-[env(safe-area-inset-top,0px)] bg-[#fff8f5]/85 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]"><div className="h-16 px-[1.25rem] flex items-center justify-between gap-[0.25rem]"><div className="flex items-center gap-[0.25rem] min-w-0 flex-1"><Link href="/" aria-label="뒤로 가기" className="w-11 h-11 -ml-[0.25rem] flex items-center justify-center rounded-xl text-[#221a14] hover:bg-[#fcebe0] active:scale-95 transition-transform shrink-0"><Icon name="arrow_back" className="text-[22px]"/></Link><div className="flex flex-col min-w-0 pr-[0.25rem]"><div className="flex items-center gap-[0.25rem]"><span className="stitch-serif text-[1.25rem] leading-[1.75rem] font-[500] text-[#221a14] truncate">우리 크루 조각</span></div><span className="stitch-sans text-[0.6875rem] leading-[0.875rem] text-[#55433d] truncate">샘플 화면</span></div></div><div className="flex items-center gap-[0.25rem] shrink-0"><button aria-label="책갈피 보관함" className="w-11 h-11 flex items-center justify-center rounded-xl text-[#55433d] hover:text-[#221a14] hover:bg-[#fcebe0] active:scale-95 transition-transform" type="button"><Icon name="bookmark_border" className="text-[22px]"/></button><button aria-label="공유하기" className="w-11 h-11 flex items-center justify-center rounded-xl text-[#55433d] hover:text-[#221a14] hover:bg-[#fcebe0] active:scale-95 transition-transform" type="button"><Icon name="share" className="text-[22px]"/></button><button type="button" aria-label="로그인하기" onClick={signIn} className="w-8 h-8 rounded-full bg-[#99452c] flex items-center justify-center ml-0.5 shrink-0 shadow-[0_2px_8px_rgba(153,69,44,0.2)]"><Icon name="person" className="text-[#ffffff] text-[18px]"/></button></div></div></header><main className="flex flex-col relative w-full max-w-md mx-auto pt-16 pb-24 bg-[#fff8f5] min-h-screen px-[1.25rem]"><div className="flex flex-col w-full pb-8">
<section className="flex flex-col gap-[0.5rem] pt-[0.25rem] mb-[1rem]">
<div className="rounded-xl border border-[#ead7ca] bg-[#fff1e9] px-3 py-2.5 text-xs leading-5 text-[#55433d]">로그인 전 디자인 미리보기입니다. 아래 사진과 이름은 예시이며 실제 크루 데이터가 아닙니다.</div>
<div className="flex items-center justify-between">
<button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#fcebe0] hover:bg-[#f6e5db] transition-colors text-left group" type="button">
<span className="stitch-serif text-[1.25rem] leading-[1.75rem] font-[500] text-[#221a14] flex items-center gap-1">
          연남동 빵원정대 · 예시
          <Icon name="expand_more" className="text-[18px] text-[#55433d] group-hover:translate-y-0.5 transition-transform"/>
</span>
</button>
<span className="stitch-sans text-[0.6875rem] leading-[0.875rem] tracking-[0.03em] font-[500] text-[#7d562d] bg-[#ffdcbd]/60 px-2.5 py-1 rounded-full">
        예시 크루
      </span>
</div>
</section>
<section className="flex items-center justify-between gap-2 mb-[1rem]">
<div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
<button className="px-3 py-1.5 rounded-full bg-[#99452c] text-[#ffffff] stitch-sans text-[0.6875rem] leading-[0.875rem] tracking-[0.03em] font-semibold shadow-xs shrink-0" type="button">
        전체 피드
      </button>
<button className="px-3 py-1.5 rounded-full bg-[#fcebe0] hover:bg-[#f6e5db] text-[#55433d] stitch-sans text-[0.6875rem] leading-[0.875rem] tracking-[0.03em] font-[500] transition-colors shrink-0" type="button">
        오늘 사진
      </button>
<button className="px-3 py-1.5 rounded-full bg-[#fcebe0] hover:bg-[#f6e5db] text-[#55433d] stitch-sans text-[0.6875rem] leading-[0.875rem] tracking-[0.03em] font-[500] transition-colors shrink-0" type="button">
        추억 북마크
      </button>
<button type="button" onClick={signIn} className="flex items-center gap-1.5 bg-[#f6e5db] hover:bg-[#f0dfd5] transition-colors px-2.5 py-1.5 rounded-full shrink-0 text-[#55433d] active:scale-95"><div className="w-6 h-6 rounded-full border-2 border-dashed border-[#88726c] flex items-center justify-center text-[#99452c]"><Icon name="person_add" className="text-[14px]"/></div><span className="stitch-sans text-[0.6875rem] leading-[0.875rem] tracking-[0.03em] font-medium">+ 친구 초대</span></button></div>
<div className="flex items-center gap-1.5 shrink-0 bg-[#fff1e9] px-2 py-1 rounded-full">
<label className="relative inline-flex items-center cursor-pointer">
<input checked={memos} onChange={e => setMemos(e.target.checked)} className="sr-only peer" id="scrapbookModeToggle" type="checkbox"/>
<div className="w-8 h-4 bg-[#e7d7cd] peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#e27d60] after:rounded-full after:h-3 after:w-3.5 after:transition-all peer-checked:bg-[#c2e9c9]"></div>
<span className="ml-1.5 stitch-sans text-[0.6875rem] leading-[0.875rem] tracking-[0.03em] font-[500] text-[#55433d] select-none">{memos ? '메모 켜짐 💬' : '메모 꺼짐'}</span>
</label>
</div>
</section>
<div className="flex flex-col gap-[2.25rem]">
<article className="relative flex flex-col bg-[#ffffff] rounded-2xl shadow-[0_4px_20px_-2px_rgba(112,100,92,0.08)] p-3.5 transition-transform hover:-translate-y-0.5">
<div className="absolute -top-3 left-1/2 -translate-x-1/2 w-28 h-6 bg-[#ffdcbd]/70 backdrop-blur-xs -rotate-2 z-10 pointer-events-none"></div>
<div className="flex items-center justify-between pb-3 pt-1">
<div className="flex items-center gap-2.5">
<div className="w-10 h-10 rounded-full bg-[#bf9061] text-[#492a04] flex items-center justify-center stitch-sans text-[0.875rem] leading-[1.25rem] tracking-[0.01em] font-[600] shadow-inner">
            연
          </div>
<div className="flex flex-col">
<div className="flex items-center gap-1.5"><span className="stitch-sans text-[0.875rem] leading-[1.25rem] tracking-[0.01em] text-[#221a14] font-bold">서연</span><span className="text-[11px] text-[#7d562d] bg-[#ffdcbd]/50 px-1.5 rounded font-medium">크루장</span><span className="text-[10px] text-[#43664d] bg-[#c2e9c9] px-1.5 rounded font-semibold flex items-center gap-0.5"><span>게스트 조각 (지우 합류 💫)</span></span></div>
<span className="stitch-sans text-[0.8125rem] leading-[1.25rem] font-[400] text-[#55433d]">예시 기록 · 성수동 어니언 ☕</span>
</div>
</div>
<button aria-label="메뉴 더보기" className="w-8 h-8 rounded-full flex items-center justify-center text-[#55433d] hover:bg-[#fcebe0] transition-colors" type="button">
<Icon name="more_horiz" className="text-[20px]"/>
</button>
</div>
<div className="relative w-full rounded-xl overflow-hidden bg-[#f6e5db] aspect-[3/4]">
<img alt="서연의 성수동 카페 작업 시간" className="w-full h-full object-cover select-none" src="/browse/seongsu-cafe.jpg"/>
<div className="absolute bottom-3 left-3 bg-[#ffffff]/95 backdrop-blur-md px-3 py-1.5 rounded-lg shadow-md -rotate-1 max-w-[85%]">
<p className="stitch-serif text-[13px] text-[#221a14] font-medium leading-tight">
            “라떼 폼 미쳤다 오늘 과제 무조건 끝낼거임 ✍️”
          </p>
</div>
<button className="absolute top-3 right-3 flex items-center gap-1 bg-[#ffffff]/90 backdrop-blur-xs px-2.5 py-1 rounded-full shadow-xs text-[#221a14] hover:bg-[#ffffff] transition-all" type="button">
<Icon name="flip" className="text-[15px] text-[#99452c]"/>
<span className="stitch-sans text-[0.6875rem] leading-[0.875rem] tracking-[0.03em] font-[500]">뒷면 메모</span>
</button>
</div>
<div className="flex items-center gap-1.5 pt-3 pb-1 overflow-x-auto no-scrollbar">
<button className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#fcebe0] hover:bg-[#f6e5db] transition-colors" type="button">
<span className="text-[13px]">🥐</span>
<span className="stitch-sans text-[0.6875rem] leading-[0.875rem] tracking-[0.03em] text-[#221a14] font-semibold">5</span>
</button>
<button className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#fcebe0] hover:bg-[#f6e5db] transition-colors" type="button">
<span className="text-[13px]">☕</span>
<span className="stitch-sans text-[0.6875rem] leading-[0.875rem] tracking-[0.03em] text-[#221a14] font-semibold">3</span>
</button>
<button className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#fcebe0] hover:bg-[#f6e5db] transition-colors" type="button">
<span className="text-[13px]">💖</span>
<span className="stitch-sans text-[0.6875rem] leading-[0.875rem] tracking-[0.03em] text-[#221a14] font-semibold">8</span>
</button>
<button className="flex items-center gap-1 px-2 py-1 rounded-full bg-[#fff1e9] hover:bg-[#fcebe0] text-[#55433d] stitch-sans text-[0.6875rem] leading-[0.875rem] tracking-[0.03em] font-[500] transition-colors" type="button">
<Icon name="add_reaction" className="text-[15px]"/>
<span>스티커 추가</span>
</button>
</div>
<div className="mt-2 flex items-center justify-between bg-[#fff1e9] px-3 py-2 rounded-xl">
<div className="flex items-center gap-2">
<button className="w-7 h-7 rounded-full bg-[#99452c] text-[#ffffff] flex items-center justify-center" type="button">
<Icon name="play_arrow" className="text-[16px]"/>
</button>
<div className="flex flex-col">
<span className="stitch-sans text-[0.6875rem] tracking-[0.03em] text-[#221a14] font-medium leading-none">서연의 3초 현장 음성</span>
<span className="text-[10px] text-[#55433d]">“카페 배경음악 너무 좋다...”</span>
</div>
</div>
<div className="flex items-center gap-0.5 h-4">
<span className="w-0.5 h-2 bg-[#99452c]/40 rounded-full"></span>
<span className="w-0.5 h-3 bg-[#99452c] rounded-full"></span>
<span className="w-0.5 h-4 bg-[#99452c] rounded-full"></span>
<span className="w-0.5 h-2.5 bg-[#99452c]/60 rounded-full"></span>
<span className="w-0.5 h-1.5 bg-[#99452c]/30 rounded-full"></span>
<span className="stitch-sans text-[10px] text-[#55433d] ml-1 stitch-mono">0:03</span>
</div>
</div>
{memos && <div className="relative mt-3 pt-2">
<div className="bg-[#fcebe0] p-3 rounded-xl shadow-inner space-y-2 relative">
<div className="absolute -top-2 left-6 w-12 h-3.5 bg-[#dbc1ba]/40 rotate-2 pointer-events-none"></div>
<div className="flex items-center justify-between pb-1">
<span className="stitch-sans text-[0.6875rem] leading-[0.875rem] tracking-[0.03em] text-[#55433d] font-bold flex items-center gap-1">
<Icon name="edit_note" className="text-[14px]"/>
              포스트잇 댓글 (2)
            </span>
<span className="text-[10px] text-[#7d562d]">조각원 전용 낙서</span>
</div>
<div className="flex items-start gap-2 bg-[#ffffff]/80 p-2 rounded-lg">
<div className="w-5 h-5 rounded-full bg-[#f0dfd5] text-[#55433d] text-[10px] flex items-center justify-center shrink-0 mt-0.5 font-bold">
              호
            </div>
<div className="flex flex-col flex-1 min-w-0">
<div className="flex items-center justify-between">
<span className="stitch-sans text-[0.6875rem] leading-[0.875rem] tracking-[0.03em] text-[#221a14] font-bold">준호</span>
<span className="text-[10px] text-[#55433d]">예시 기록</span>
</div>
<p className="stitch-sans text-[0.8125rem] font-[400] text-[#221a14] leading-tight mt-0.5">
                너 아까 3시에 잔다더니 결국 성수동 갔냐 ㅋㅋㅋ ☕️
              </p>
</div>
</div>
<div className="flex items-start gap-2 bg-[#ffffff]/80 p-2 rounded-lg">
<div className="w-5 h-5 rounded-full bg-[#ffb5a0] text-[#3b0900] text-[10px] flex items-center justify-center shrink-0 mt-0.5 font-bold">
              민
            </div>
<div className="flex flex-col flex-1 min-w-0">
<div className="flex items-center justify-between">
<span className="stitch-sans text-[0.6875rem] leading-[0.875rem] tracking-[0.03em] text-[#221a14] font-bold">민우</span>
<span className="text-[10px] text-[#55433d]">예시 기록</span>
</div>
<p className="stitch-sans text-[0.8125rem] font-[400] text-[#221a14] leading-tight mt-0.5">
                저기 소금빵 맛있음 내 몫 하나만 포장 요망 🙏🥖
              </p>
</div>
</div>
<form className="flex items-center gap-2 pt-1" onSubmit={e => { e.preventDefault(); signIn(); }}>
<input aria-label="포스트잇 댓글" className="flex-1 bg-[#ffffff] px-3 py-1.5 rounded-lg text-[0.8125rem] leading-[1.25rem] font-[400] stitch-sans text-[#221a14] placeholder:text-[#55433d]/60 focus:outline-hidden" placeholder="나도 한마디 포스트잇 남기기..." type="text"/>
<button aria-label="메모 붙이기" className="w-8 h-8 rounded-lg bg-[#bf9061] text-[#492a04] flex items-center justify-center hover:opacity-90 active:scale-95 transition-all" type="submit">
<Icon name="send" className="text-[16px]"/>
</button>
</form>
</div>
</div>}
<div className="flex items-center justify-between pt-3 mt-1 text-[#55433d]">
<button className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-[#fcebe0] transition-colors active:scale-95" type="button">
<Icon name="pets" className="text-[18px] text-[#99452c]"/>
<span className="stitch-sans text-[0.6875rem] leading-[0.875rem] tracking-[0.03em] font-[500]">스탬프 🐾</span>
</button>
<button className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-[#fcebe0] transition-colors active:scale-95" type="button">
<Icon name="cached" className="text-[18px] text-[#43664d]"/>
<span className="stitch-sans text-[0.6875rem] leading-[0.875rem] tracking-[0.03em] font-[500]">비하인드 뒷면</span>
</button>
<button className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-[#fcebe0] transition-colors active:scale-95" type="button">
<Icon name="bookmark" className="text-[18px] text-[#7d562d]"/>
<span className="stitch-sans text-[0.6875rem] leading-[0.875rem] tracking-[0.03em] font-[500]">보관함</span>
</button>
</div>
</article>
<article className="relative flex flex-col bg-[#ffffff] rounded-2xl shadow-[0_4px_20px_-2px_rgba(112,100,92,0.08)] p-3.5 transition-transform hover:-translate-y-0.5">
<div className="absolute -top-2 -right-2 w-16 h-5 bg-[#c2e9c9]/80 backdrop-blur-xs rotate-12 z-10 pointer-events-none"></div>
<div className="flex items-center justify-between pb-3 pt-1">
<div className="flex items-center gap-2.5">
<div className="w-10 h-10 rounded-full bg-[#ffb5a0] text-[#3b0900] flex items-center justify-center stitch-sans text-[0.875rem] leading-[1.25rem] tracking-[0.01em] font-[600] shadow-inner">
            민
          </div>
<div className="flex flex-col">
<div className="flex items-center gap-1.5">
<span className="stitch-sans text-[0.875rem] leading-[1.25rem] tracking-[0.01em] text-[#221a14] font-bold">민우</span>
<span className="w-1.5 h-1.5 rounded-full bg-[#99452c]"></span>
</div>
<span className="stitch-sans text-[0.8125rem] leading-[1.25rem] font-[400] text-[#55433d]">예시 기록 · 집 책상 🌙</span>
</div>
</div>
<button aria-label="메뉴 더보기" className="w-8 h-8 rounded-full flex items-center justify-center text-[#55433d] hover:bg-[#fcebe0] transition-colors" type="button">
<Icon name="more_horiz" className="text-[20px]"/>
</button>
</div>
<div className="relative w-full rounded-xl overflow-hidden bg-[#f6e5db] aspect-square">
<img alt="민우의 저녁 독서 책상 풍경" className="w-full h-full object-cover select-none" src="/browse/night-desk.jpg"/>
<div className="absolute bottom-3 right-3 px-2 py-0.5 bg-[#ffffff]/80 backdrop-blur-xs rounded stitch-sans text-[10px] text-[#7d562d] tracking-wider stitch-mono uppercase">
          23:15 ARCHIVE
        </div>
</div>
<div className="pt-3 pb-1 space-y-1">
<p className="stitch-sans text-[0.9375rem] font-[400] text-[#221a14] leading-relaxed">
          오늘 하루도 퇴근 &amp; 야간 독서 시작. 차 한 잔 따뜻하게 타고 고양이 골골송 bgm 틀어놓으니 세상 평화롭다 🐱📖
        </p>
</div>
{memos && <div className="mt-2 pt-2 bg-[#fff1e9]/70 p-2.5 rounded-xl space-y-2">
<div className="flex items-start gap-2 bg-[#ffffff]/90 p-2 rounded-lg">
<div className="w-5 h-5 rounded-full bg-[#bf9061] text-[#492a04] text-[10px] flex items-center justify-center shrink-0 mt-0.5 font-bold">
            연
          </div>
<div className="flex flex-col flex-1 min-w-0">
<div className="flex items-center justify-between">
<span className="stitch-sans text-[0.6875rem] leading-[0.875rem] tracking-[0.03em] text-[#221a14] font-bold">서연</span>
<span className="text-[10px] text-[#55433d]">예시 기록</span>
</div>
<p className="stitch-sans text-[0.8125rem] font-[400] text-[#221a14] leading-tight mt-0.5">
              냥이 졸귀 ㅠㅠ 이름이 뭐더라? 발바닥 젤리 보고 싶음 🐾
            </p>
</div>
</div>
<button onClick={signIn} className="w-full text-left px-2.5 py-1 text-[#55433d] text-[11px] stitch-sans hover:text-[#221a14] transition-colors flex items-center justify-between" type="button">
<span>민우에게 답장 남기기...</span>
<Icon name="reply" className="text-[14px]"/>
</button>
</div>}
<div className="flex items-center justify-between pt-3 mt-1">
<div className="flex items-center gap-1.5">
<button className="flex items-center gap-1 px-3 py-1 rounded-full bg-[#c2e9c9] text-[#486a51] hover:opacity-90 active:scale-95 transition-all" type="button">
<span className="text-[12px]">🌙</span>
<span className="stitch-sans text-[0.6875rem] leading-[0.875rem] tracking-[0.03em] font-semibold">힐링</span>
</button>
<button className="flex items-center gap-1 px-3 py-1 rounded-full bg-[#fcebe0] hover:bg-[#f6e5db] text-[#221a14] transition-all active:scale-95" type="button">
<span className="text-[12px]">🐱</span>
<span className="stitch-sans text-[0.6875rem] leading-[0.875rem] tracking-[0.03em] font-semibold">골골송</span>
</button>
</div>
<div className="flex items-center gap-1 text-[#55433d]">
<button aria-label="하트" className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#fcebe0] transition-colors" type="button">
<Icon name="favorite_border" className="text-[20px] text-[#99452c]"/>
</button>
<button aria-label="공유" className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#fcebe0] transition-colors" type="button">
<Icon name="ios_share" className="text-[20px]"/>
</button>
</div>
</div>
</article>
</div>
<div className="sticky bottom-3 mt-6 z-30 self-center w-full max-w-sm px-2">
<button onClick={signIn} className="w-full flex items-center justify-center gap-2 bg-[#99452c] hover:bg-[#7b2e17] text-[#ffffff] py-3 px-5 rounded-2xl shadow-[0_8px_24px_rgba(153,69,44,0.35)] active:scale-98 transition-all group" type="button">
<Icon name="add_circle" className="text-[20px] transition-transform group-hover:rotate-90"/>
<span className="stitch-sans text-[0.875rem] leading-[1.25rem] font-[600] tracking-wide">+ 오늘 내 조각 남기기</span>
<span className="ml-1 text-[11px] bg-[#ffffff]/20 px-2 py-0.5 rounded-full stitch-system">예시 화면</span>
</button>
</div>
</div>
</main><nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50 pb-[env(safe-area-inset-bottom,0px)] bg-[#fff8f5]/90 backdrop-blur-xl shadow-[0_-2px_12px_rgba(112,100,92,0.06)]"><div className="h-16 px-[0.875rem] flex items-center justify-around"><Link aria-current="page" className="flex flex-col items-center justify-center w-14 h-12 text-[#99452c] font-bold transition-colors" href="/browse"><Icon name="cottage" className="text-[22px]"/><span className="stitch-sans text-[0.6875rem] leading-[0.875rem] tracking-[0.03em] font-[500] mt-0.5">홈 피드</span></Link><Link className="flex flex-col items-center justify-center w-14 h-12 text-[#55433d] hover:text-[#221a14] transition-colors" href="/"><Icon name="photo_library" className="text-[22px]"/><span className="stitch-sans text-[0.6875rem] leading-[0.875rem] tracking-[0.03em] font-[500] mt-0.5">사진 서랍</span></Link><Link className="flex flex-col items-center justify-center w-14 h-12 text-[#55433d] hover:text-[#221a14] transition-colors" href="/"><Icon name="sticky_note_2" className="text-[22px]"/><span className="stitch-sans text-[0.6875rem] leading-[0.875rem] tracking-[0.03em] font-[500] mt-0.5">비하인드 모음</span></Link><Link className="flex flex-col items-center justify-center w-14 h-12 text-[#55433d] hover:text-[#221a14] transition-colors" href="/"><Icon name="settings" className="text-[22px]"/><span className="stitch-sans text-[0.6875rem] leading-[0.875rem] tracking-[0.03em] font-[500] mt-0.5">설정</span></Link></div></nav>
</div>;
}
