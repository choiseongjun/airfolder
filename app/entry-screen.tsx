"use client";
/* eslint-disable @next/next/no-img-element -- A local decorative photograph; no optimization needed. */
import Link from 'next/link';
import { useState, type FormEvent, type ReactNode } from 'react';
import { Literata, Noto_Sans_KR, Plus_Jakarta_Sans } from 'next/font/google';
import './entry-hero.css';

// Ported 1:1 from the Stitch screen "메모네스티아 첫 진입 & 카카오 1초 로그인 (풍성한 온보딩)".
// Colors are that screen's own Material palette, written as literal values so the app theme stays untouched.
const entrySans = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-entry-sans', preload: false });
const entrySerif = Literata({ subsets: ['latin'], variable: '--font-entry-serif', preload: false });
// Stitch renders Korean glyphs in a sans fallback, under both the sans and the serif face.
const entryKorean = Noto_Sans_KR({ subsets: ['latin'], variable: '--font-entry-kr', preload: false });
const fontVars = `${entrySans.variable} ${entrySerif.variable} ${entryKorean.variable}`;
const sansStack = 'var(--font-entry-sans), var(--font-entry-kr), sans-serif';
const serifStack = 'var(--font-entry-serif), var(--font-entry-kr), serif';
const iconFont = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&icon_names=auto_stories,draw,favorite,flip,grid_view,group,key,local_bar,lock_reset,sticky_note_2,visibility&display=block';

function Icon({ name, className = '', filled = false }: { name: string; className?: string; filled?: boolean }) {
  return <span aria-hidden="true" className={`material-symbols-outlined ${className}`} style={filled ? { fontVariationSettings: "'FILL' 1" } : undefined}>{name}</span>;
}

type Actions = { onKakao: () => void; onApple: () => void; appleDisabled: boolean; kakaoDisabled: boolean; exploreHref: string; onJoin: (token: string) => void };

function Showcase() {
  return <>
    <link rel="stylesheet" href={iconFont} precedence="default"/>
    <section className="text-center px-2">
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f6e5db] text-[#7d562d] text-[11px] font-semibold mb-2.5 border border-[#7d562d]/20">
        <Icon name="lock_reset" className="text-[13px]"/>카톡 사진 만료 방지 · 비밀 롤링페이퍼
      </div>
      <h1 style={{ fontFamily: serifStack }} className="text-[1.45rem] font-bold text-[#221a14] leading-snug tracking-tight">
        단톡방에서 밀려 사라지는 우리 사진,<br/>
        <span className="text-[#99452c] underline decoration-[#e27d60] decoration-wavy decoration-2">사진 뒷면에 남기는 비밀 낙서</span>
      </h1>
      <p className="text-xs text-[#55433d] mt-2 font-medium leading-relaxed">
        단톡방 사진이 만료되기 전에 쏙—<br/>
        앞면엔 감성 사진, 뒷면엔 친구들의 솔직한 롤링페이퍼로 영구 보관해요.
      </p>
    </section>
    <section className="relative w-full max-w-[320px] mx-auto pt-3 pb-2 select-none">
      <div className="absolute -top-1 left-4 z-20 w-24 h-6 bg-[#e27d60]/35 backdrop-blur-xs -rotate-6 rounded-sm border-dashed border-t border-b border-[#99452c]/40 shadow-sm flex items-center justify-center pointer-events-none">
        <span className="text-[9px] font-bold text-[#7b2e17] tracking-wider uppercase">CREW MEMO #24</span>
      </div>
      <div className="absolute -top-2 right-6 z-20 w-9 h-9 rounded-full bg-[#fde047] shadow-md border-2 border-dashed border-[#ca8a04] flex items-center justify-center rotate-12">
        <span className="text-sm">✨</span>
      </div>
      <div className="absolute -bottom-2 -left-3 z-10 w-[92%] bg-[#fff9d2] p-3 rounded-2xl border border-[#ebd876] shadow-md rotate-[-3deg] transition-transform duration-300">
        <div className="flex items-center justify-between pb-1 mb-1 border-b border-[#ebd876]/60">
          <span className="text-[10px] font-bold text-[#7d562d] flex items-center gap-1"><Icon name="draw" className="text-[12px]"/> 뒷면 롤링페이퍼</span>
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
          <div className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-black/55 backdrop-blur-md text-white text-[11px] font-medium flex items-center gap-1.5 shadow-sm">
            <Icon name="local_bar" className="text-[14px] text-[#ffdbd1]"/><span>강릉 맥주 테라스의 밤 🍻</span>
          </div>
          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-white/90 backdrop-blur-sm text-[10px] font-bold text-[#99452c] shadow-sm flex items-center gap-0.5">
            <Icon name="flip" className="text-[12px]"/><span>뒷면 낙서 보기</span>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between px-1">
          <div>
            <p className="text-[11px] font-bold text-[#221a14]">2024. 08. 14 · 성산 해변</p>
            <p className="text-[10px] text-[#88726c]">업로드: 민재 (사진 만료 영구 해제)</p>
          </div>
          <div className="w-10 h-10 rounded-full border border-dashed border-[#99452c]/40 bg-[#fcebe0] flex flex-col items-center justify-center rotate-6 text-[#99452c]">
            <span className="text-[8px] font-bold leading-none uppercase tracking-tighter">SAVED</span>
            <span className="text-[10px] font-bold leading-none mt-0.5">FOREVER</span>
          </div>
        </div>
      </div>
      <div className="relative z-20 mt-4 flex justify-end">
        <div className="inline-flex items-center gap-1 bg-[#f0dfd5] px-3 py-1 rounded-full border border-[#99452c]/20 shadow-sm text-[11px] font-semibold text-[#99452c]">
          <Icon name="favorite" className="text-[13px]" filled/><span>광고·결제 없는 100% 무료 토이프로젝트</span>
        </div>
      </div>
    </section>
    <section className="flex flex-col gap-2.5 pt-1">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-bold text-[#221a14] flex items-center gap-1"><Icon name="auto_stories" className="text-[#99452c] text-[16px]"/>메모네스티아 핵심 매력 3가지</span>
        <span className="text-[10px] text-[#88726c] font-medium">부담 없는 추억 보관</span>
      </div>
      <div className="grid grid-cols-1 gap-2.5">
        <Feature icon="sticky_note_2" iconClass="bg-[#ffdbd1] text-[#99452c]" title="① 사진 뒷면 롤링페이퍼" tag={<span className="text-[9px] bg-[#c2e9c9] text-[#486a51] px-1.5 py-0.5 rounded font-semibold">비밀공간</span>}>
          앞면엔 예쁜 사진, 뒷면엔 친구들의 솔직한 낙서와 드립! 뒤집는 순간 그날의 웃음이 재생돼요.
        </Feature>
        <div className="bg-white p-3.5 rounded-xl border border-[#dbc1ba]/50 shadow-sm flex items-start gap-3 relative overflow-hidden">
          <div className="w-9 h-9 rounded-xl bg-[#c2e9c9] flex items-center justify-center text-[#43664d] shrink-0 font-bold text-sm"><Icon name="group" className="text-[20px]"/></div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#221a14]">② 1명이 안 올려도 괜찮아요</span>
              <span className="text-[10px] font-bold text-[#43664d]">이번 달 18/25개</span>
            </div>
            <p className="text-[11px] text-[#55433d] mt-0.5 leading-snug">모두가 억지로 올릴 필요 없어요. 크루 전체가 함께 모은 추억 조각 게이지만 채우면 OK!</p>
            <div className="w-full bg-[#fcebe0] h-1.5 rounded-full mt-2 overflow-hidden"><div className="bg-[#43664d] h-full rounded-full" style={{ width: '72%' }}/></div>
          </div>
        </div>
        <Feature icon="grid_view" iconClass="bg-[#ffdcbd] text-[#7d562d]" title="③ 월말 9컷 룩북 무료 캡처" tag={<span className="text-[9px] bg-[#99452c]/10 text-[#99452c] px-1.5 py-0.5 rounded font-semibold">인스타용</span>}>
          한 달이 끝나면 우리 크루만의 매거진 컷이 자동 완성! 인스타 스토리에 바로 공유할 수 있어요.
        </Feature>
      </div>
    </section>
    <section className="bg-[#fff1e9] border border-[#dbc1ba]/50 rounded-2xl p-3.5 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#99452c] opacity-75"/><span className="relative inline-flex rounded-full h-2 w-2 bg-[#99452c]"/></span>
          <span className="text-xs font-bold text-[#221a14]">지금 2,400+개 크루가 비밀 추억을 기록 중</span>
        </div>
        <span className="text-[10px] text-[#88726c]">실시간</span>
      </div>
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
        <Crew emoji="🥐" name="연남동 빵원정대" badge="조각 19개" badgeClass="text-[#99452c] bg-[#ffdbd1]/40"/>
        <Crew emoji="🌊" name="제주 2박3일 우정여행" badge="완성" badgeClass="text-[#43664d] bg-[#c2e9c9]/60"/>
        <Crew emoji="☕" name="을지로 야작단" badge="조각 27개" badgeClass="text-[#7d562d] bg-[#ffdcbd]/50"/>
      </div>
    </section>
  </>;
}

function Feature({ icon, iconClass, title, tag, children }: { icon: string; iconClass: string; title: string; tag: ReactNode; children: ReactNode }) {
  return <div className="bg-white p-3.5 rounded-xl border border-[#dbc1ba]/50 shadow-sm flex items-start gap-3 relative overflow-hidden">
    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm ${iconClass}`}><Icon name={icon} className="text-[20px]"/></div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-1.5"><span className="text-xs font-bold text-[#221a14]">{title}</span>{tag}</div>
      <p className="text-[11px] text-[#55433d] mt-0.5 leading-snug">{children}</p>
    </div>
  </div>;
}

function Crew({ emoji, name, badge, badgeClass }: { emoji: string; name: string; badge: string; badgeClass: string }) {
  return <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-[#dbc1ba]/40 text-[11px] text-[#221a14] whitespace-nowrap shadow-xs">
    <span>{emoji}</span><span className="font-medium">{name}</span><span className={`text-[10px] font-bold px-1 rounded ${badgeClass}`}>{badge}</span>
  </div>;
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
    <form className="w-full bg-[#fff1e9] border border-[#dbc1ba]/70 rounded-xl p-3 flex flex-col gap-2 shadow-xs" onSubmit={submitCode}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5"><Icon name="key" className="text-[#99452c] text-[17px]"/><span className="text-xs font-bold text-[#221a14]">초대 코드가 있으신가요?</span></div>
        <span className="text-[10px] text-[#88726c]">친구 크루 바로 합류</span>
      </div>
      <div className="flex items-center gap-2">
        <input aria-label="초대 코드" value={code} onChange={e => { setCode(e.target.value); setCodeError(''); }} className="flex-1 min-w-0 bg-white border border-[#dbc1ba]/50 rounded-lg px-3 py-2 text-xs text-[#221a14] uppercase tracking-wider font-semibold placeholder:text-[#88726c]/70 focus:outline-none focus:ring-1 focus:ring-[#99452c]" placeholder="6자리 (예: MEMO24)" type="text"/>
        <button className="h-9 px-4 rounded-lg bg-[#99452c] hover:bg-[#e27d60] text-white text-xs font-semibold shrink-0 transition-all active:scale-95 shadow-sm" type="submit">입장</button>
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
  return <div className={`entry-root ${fontVars} h-screen overflow-y-auto bg-[#fff8f5] text-[#221a14] selection:bg-[#ffdbd1] selection:text-[#99452c]`} style={{ fontFamily: sansStack }}>
    <div className="min-h-full flex flex-col">
    <header className="pt-[max(env(safe-area-inset-top),12px)] sticky top-0 z-30 bg-[#fff8f5]/90 backdrop-blur-md border-b border-[#dbc1ba]/30 w-full px-5 pb-2.5">
      <div className="flex items-center justify-between h-12 max-w-md mx-auto">
        <div className="flex items-center gap-1.5">
          <span style={{ fontFamily: serifStack }} className="text-xl tracking-tight text-[#99452c] font-bold">메모네스티아</span>
          <span className="text-[10px] tracking-widest text-[#88726c] font-semibold uppercase bg-[#fcebe0] px-1.5 py-0.5 rounded">MEMONESTIA</span>
        </div>
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#c2e9c9]/80 text-[#486a51] text-xs font-semibold shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-[#43664d] animate-pulse"/>100% 무료 비공개
        </span>
      </div>
    </header>
    <main className="flex-1 w-full max-w-md mx-auto px-4 py-4 flex flex-col gap-6"><Showcase/></main>
    <footer className="w-full max-w-md mx-auto px-4 pb-[max(env(safe-area-inset-bottom),16px)] pt-2 flex flex-col gap-2.5 bg-[#fff8f5]"><CallToAction {...actions}/></footer>
    </div>
  </div>;
}