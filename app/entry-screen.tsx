"use client";
/* eslint-disable @next/next/no-img-element -- A local decorative photograph; no optimization needed. */
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { Icon, StitchIconFont, sansStack, serifStack, stitchRoot } from './stitch-kit';

// Ported 1:1 from the Stitch screen "메모네스티아 첫 진입 & 카카오 1초 로그인 (풍성한 온보딩)".
// Colors are that screen's own Material palette, written as literal values so the app theme stays untouched.
type Actions = { onKakao: () => void; onApple: () => void; appleDisabled: boolean; kakaoDisabled: boolean; exploreHref: string; onJoin: (token: string) => void };

function Showcase() {
  return <>
    <StitchIconFont/>
    <section className="text-center px-2">
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f6e5db] text-[#7d562d] text-[11px] font-semibold mb-2.5 border border-[#7d562d]/20">
        <Icon name="lock_reset" className="text-[13px]"/>카톡 사진 만료 방지 · 비밀 롤링페이퍼
      </div>
      <h1 style={{ fontFamily: serifStack }} className="text-[1.45rem] font-bold text-[#221a14] leading-snug tracking-tight">
        만료 없는 단톡방 사진,<br/><span className="text-[#99452c]">사진 뒷면 비밀 아카이브</span>
      </h1>
      <p className="text-xs text-[#55433d] mt-2 font-medium leading-relaxed">
        흩어지는 추억을 우리 크루만의 롤링페이퍼로<br/>오래 간직해요.
      </p>
    </section>
    <section className="relative w-full max-w-[320px] mx-auto pt-3 pb-2 select-none">
      <div className="absolute -top-1 left-4 z-20 w-24 h-6 bg-[#e27d60]/35 -rotate-6 rounded-xs border-dashed border-t border-b border-[#99452c]/40 shadow-xs flex items-center justify-center pointer-events-none">
        <span className="text-[9px] font-bold text-[#7b2e17] tracking-wider uppercase">CREW MEMO #1</span>
      </div>
      <div className="absolute -top-2 right-6 z-20 w-9 h-9 rounded-full bg-[#fde047] shadow-md border-2 border-dashed border-[#ca8a04] flex items-center justify-center rotate-12">
        <span className="text-sm">✨</span>
      </div>
      <div className="absolute -bottom-2 -left-3 z-10 w-[92%] bg-[#fff9d2] p-3 rounded-2xl border border-[#ebd876] shadow-md rotate-[-3deg] transition-transform duration-300">
        <div className="flex items-center justify-between pb-1 mb-1 border-b border-[#ebd876]/60">
          <span className="text-[10px] font-bold text-[#7d562d] flex items-center gap-1"><Icon name="draw" className="text-[12px]"/> 사진 뒤 비밀 롤링페이퍼</span>
          <span className="text-[9px] text-[#9a7649] bg-[#f9edb0] px-1.5 py-0.5 rounded">🔒 크루 전용</span>
        </div>
        <p className="text-xs text-[#492a04] leading-snug font-medium">&quot;이때 서연이 맥주 쏟을 뻔한 거 실화냐ㅋㅋㅋ 평생 놀림거리 박제 완료!&quot;</p>
        <div className="flex items-center justify-between mt-1 pt-1 text-[10px] text-[#88726c]">
          <span style={{ fontFamily: "var(--font-pen), 'Nanum Pen Script', cursive" }} className="text-sm text-[#99452c] font-bold">From. 지민, 도현, 유진</span>
          <span className="text-[10px] bg-white/70 px-1.5 py-0.5 rounded-full font-medium">댓글 5개</span>
        </div>
      </div>
      <div className="relative z-10 bg-white p-3 pb-5 rounded-2xl shadow-[0_14px_32px_-8px_rgba(153,69,44,0.22)] border border-[#dbc1ba]/50 rotate-[1.5deg] hover:rotate-0 transition-all duration-300">
        <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-[#fcebe0] shadow-inner">
          <img alt="크루 맥주 테라스 밤" className="w-full h-full object-cover" src="/entry/terrace.jpg"/>
          <div className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-black/55 backdrop-blur-md text-white text-[11px] font-medium flex items-center gap-1.5 shadow-xs">
            <Icon name="local_bar" className="text-[14px] text-[#ffdbd1]"/><span>강릉 맥주 테라스의 밤 🍻</span>
          </div>
          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-white/90 backdrop-blur-xs text-[10px] font-bold text-[#99452c] shadow-xs flex items-center gap-0.5">
            <Icon name="flip" className="text-[12px]"/><span>뒷면 낙서 보기</span>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between px-1">
          <div>
            <p className="text-[11px] font-bold text-[#221a14]">강릉 맥주 테라스 밤 🍻</p>
            <p className="text-[10px] text-[#88726c]">우리 크루의 소중한 순간</p>
          </div>
          <div className="w-10 h-10 rounded-full border border-dashed border-[#99452c]/40 bg-[#fcebe0] flex flex-col items-center justify-center rotate-6 text-[#99452c]">
            <span className="text-[8px] font-bold leading-none uppercase tracking-tighter">SAVED</span>
            <span className="text-[10px] font-bold leading-none mt-0.5">FOREVER</span>
          </div>
        </div>
      </div>
      <div className="relative z-20 mt-4 flex justify-end">
        <div className="inline-flex items-center gap-1 bg-[#f0dfd5] px-3 py-1 rounded-full border border-[#99452c]/20 shadow-xs text-[11px] font-semibold text-[#99452c]">
          <Icon name="favorite" className="text-[13px]" filled/><span>광고·결제 없는 100% 무료 토이프로젝트</span>
        </div>
      </div>
    </section>
  </>;
}

function CallToAction({ onKakao, onApple, appleDisabled, kakaoDisabled, exploreHref, onJoin }: Actions) {
  const [code, setCode] = useState(''); const [codeError, setCodeError] = useState('');
  function submitCode(e: FormEvent) {
    e.preventDefault();
    if (!code.trim()) { setCodeError('친구에게 받은 초대 코드를 입력해 주세요.'); return; }
    // Invites are full-length tokens today; accept one pasted on its own or inside the invite link.
    const token = code.trim().match(/[a-f0-9]{64}/i)?.[0];
    if (!token) { setCodeError('초대 링크를 그대로 붙여넣어 주세요.'); return; }
    setCodeError(''); onJoin(token.toLowerCase());
  }
  return <>
    <button className="w-full h-12 rounded-xl bg-[#FEE500] hover:bg-[#FADA0A] active:scale-[0.98] disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-[0_6px_20px_rgba(254,229,0,0.4)]" disabled={kakaoDisabled} onClick={onKakao} type="button">
      <svg className="w-5 h-5 text-[#191919]" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3c-5.52 0-10 3.58-10 8c0 2.82 1.83 5.3 4.63 6.75l-.97 3.58c-.08.31.25.56.51.38l4.35-2.88c.48.06.98.09 1.48.09 5.52 0 10-3.58 10-8s-4.48-8-10-8z"/></svg>
      <span className="text-[15px] font-bold text-[#191919]">카카오로 1초 만에 시작하기</span>
    </button>
    <form className="w-full bg-[#fff1e9] border border-[#dbc1ba]/70 rounded-xl p-3 flex flex-col gap-2 " onSubmit={submitCode}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5"><Icon name="key" className="text-[#99452c] text-[17px]"/><span className="text-xs font-bold text-[#221a14]">친구에게 초대 링크를 받으셨나요?</span></div>
        <span className="text-[10px] text-[#88726c]">링크 붙여넣기</span>
      </div>
      <div className="flex items-center gap-2">
        <input aria-label="초대 링크" value={code} onChange={e => { setCode(e.target.value); setCodeError(''); }} className="flex-1 min-w-0 bg-white border border-[#dbc1ba]/50 rounded-lg px-3 py-2 text-xs text-[#221a14] tracking-wide font-medium placeholder:text-[#88726c]/70 focus:outline-hidden focus:ring-1 focus:ring-[#99452c]" placeholder="초대 링크를 붙여넣어 주세요" type="text"/>
        <button className="h-9 px-4 rounded-lg bg-[#99452c] hover:bg-[#e27d60] text-white text-xs font-semibold shrink-0 transition-all active:scale-95 shadow-xs" type="submit">입장</button>
      </div>
      {codeError && <p role="alert" className="text-[10px] text-[#ba1a1a]">{codeError}</p>}
    </form>
    <div className="flex items-center justify-center gap-3 text-xs text-[#55433d] font-medium pt-1">
      <Link className="hover:text-[#99452c] transition-colors flex items-center gap-1 py-1" href={exploreHref}><Icon name="visibility" className="text-[15px]"/>로그인 없이 둘러보기</Link>
      <span className="text-[#dbc1ba]">|</span>
      <button className="hover:text-[#99452c] transition-colors flex items-center gap-1 py-1 disabled:opacity-50" disabled={appleDisabled} onClick={onApple} type="button">
        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 170 170" aria-hidden="true"><path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.66-7.85-11.9-14.43-6-9.4-10.74-20.08-14.22-32.04-3.48-11.97-5.22-23.01-5.22-33.14 0-14.72 3.63-26.69 10.89-35.91 7.26-9.21 16.27-13.93 27.04-14.15 5.26 0 11.08 1.45 17.47 4.35 6.39 2.9 10.22 4.41 11.49 4.54 1.77-.28 5.92-1.89 12.44-4.83 6.52-2.94 12.24-4.27 17.16-3.99 12.37.77 22.18 5.48 29.43 14.13-10.74 6.53-15.99 15.69-15.75 27.47.24 9.3 3.82 17.06 10.74 23.27 6.92 6.21 15.17 9.8 24.75 10.79-2.22 6.6-4.99 13.57-8.31 20.91zM119.22 33.11c0-7.39 2.65-14.35 7.95-20.89 5.3-6.53 11.91-10.85 19.82-12.95.24 1.13.36 2.19.36 3.18 0 7.39-2.73 14.48-8.19 21.27-5.46 6.79-12.18 11.09-20.16 12.89-.24-1.13-.36-2.19-.36-3.18z"/></svg>
        애플 계정으로 계속하기
      </button>
    </div>
    <div className="text-center pt-0.5 pb-2">
      <p className="text-[10px] text-[#88726c] leading-tight">100% 무료 · 비영리 토이프로젝트 · 상업적 광고 및 결제 없음</p>
    </div>
  </>;
}

// The full Stitch page — its own header, story and sign-in footer.
export function EntryScreen(actions: Actions) {
  return <div className={`${stitchRoot} h-screen overflow-y-auto bg-[#fff8f5] text-[#221a14] selection:bg-[#ffdbd1] selection:text-[#99452c]`} style={{ fontFamily: sansStack }}>
    <div className="min-h-full flex flex-col">
    <header className="pt-[max(env(safe-area-inset-top),12px)] sticky top-0 z-30 bg-[#fff8f5]/90 backdrop-blur-md border-b border-[#dbc1ba]/30 w-full px-5 pb-2.5">
      <div className="flex items-center justify-between h-12 max-w-md mx-auto">
        <div className="flex items-center gap-1.5">
          <span style={{ fontFamily: serifStack }} className="text-xl tracking-tight text-[#99452c] font-bold">메모네스티아</span>
          <span className="text-[10px] tracking-widest text-[#88726c] font-semibold uppercase bg-[#fcebe0] px-1.5 py-0.5 rounded">MEMONESTIA</span>
        </div>
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#c2e9c9]/80 text-[#486a51] text-xs font-semibold shadow-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-[#43664d] animate-pulse"/>100% 무료 비공개
        </span>
      </div>
    </header>
    <main className="flex-1 w-full max-w-md mx-auto px-4 py-4 flex flex-col gap-6"><Showcase/></main>
    <footer className="w-full max-w-md mx-auto px-4 pb-[max(env(safe-area-inset-bottom),16px)] pt-2 flex flex-col gap-2.5 bg-[#fff8f5]"><CallToAction {...actions}/></footer>
    </div>
  </div>;
}
