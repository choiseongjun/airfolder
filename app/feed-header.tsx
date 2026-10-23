'use client';
import Link from 'next/link';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import {X} from 'lucide-react';
import {api} from '@/lib/client-api';
import {TERMS_VERSION} from '@/lib/policy';
import {Icon} from './stitch-kit';
import BrandMark from './brand-mark';
import type {FeedData,FeedActions} from './home-feed';
type Person=FeedData['crew']['members'][number];
const avatarTones = ['bg-[#bf9061] text-[#492a04]', 'bg-[#f0dfd5] text-[#55433d]', 'bg-[#ffb5a0] text-[#3b0900]', 'bg-[#c2e9c9] text-[#486a51]'];
const tone = (person: Person) => person.mine ? 'bg-[#99452c] text-[#ffffff]' : avatarTones[[...person.id].reduce((sum, c) => sum + c.charCodeAt(0), 0) % avatarTones.length];
const initial = (person: Person) => person.mine ? '나' : [...person.name.trim()][0] || '?';
const label = 'stitch-sans text-[0.6875rem] leading-[0.875rem] tracking-[0.03em]';


function SpacePickerModal({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const node = dialog.current;
    const trigger = document.activeElement as HTMLElement | null;
    node?.showModal();
    return () => { node?.close(); trigger?.focus(); };
  }, []);
  return <dialog ref={dialog} aria-labelledby="space-picker-title" onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) onClose(); }} className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-[420px] max-h-[80dvh] overflow-hidden rounded-3xl border border-[#efdfd5] bg-[#fffaf7] p-0 text-[#30251f] shadow-2xl backdrop:bg-[#30251f]/40 backdrop:backdrop-blur-sm">
    <div className="flex items-start justify-between gap-4 border-b border-[#efdfd5] px-5 py-4"><div><h2 id="space-picker-title" className="stitch-serif text-xl font-semibold">어디로 갈까요?</h2><p className="mt-1 text-xs text-[#78675e]">함께 추억을 모을 공간을 선택하세요.</p></div><button type="button" autoFocus aria-label="공간 선택 닫기" onClick={onClose} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f6e5db] text-[#99452c]"><X size={18} aria-hidden="true"/></button></div>
    <div className="max-h-[calc(80dvh-100px)] overflow-y-auto overscroll-contain p-3">{children}</div>
  </dialog>;
}


export default function FeedHeader({data,actions}:{data:FeedData;actions:Pick<FeedActions,'onSelectGroup'|'onCreateGroup'|'onJoinPublicGroup'>}){
 const [picking,setPicking]=useState(false);
  const [creatingSpace, setCreatingSpace] = useState(false);
  const [spaceName, setSpaceName] = useState('');
  const [spacePublic, setSpacePublic] = useState(false);
  const [joiningSpace, setJoiningSpace] = useState<string|null>(null);
  const [spaceError, setSpaceError] = useState('');
  const [spaceBusy, setSpaceBusy] = useState(false);
  const [termsGate, setTermsGate] = useState(false);
  const [termsChecked, setTermsChecked] = useState(false);
  const [termsBusy, setTermsBusy] = useState(false);
  const [shareNotice, setShareNotice] = useState('');

 const {crew}=data;const guest=!data.me;const publicGroups=data.publicGroups??[];const crewHref='/crew/settings';
  const invite = crew.id && <Link href={`${crewHref}?group=${encodeURIComponent(crew.id)}`} className="flex items-center gap-1.5 bg-[#f6e5db] hover:bg-[#f0dfd5] transition-colors px-2.5 py-1.5 rounded-full shrink-0 text-[#55433d] active:scale-95"><div className="w-6 h-6 rounded-full border-2 border-dashed border-[#88726c] flex items-center justify-center text-[#99452c]"><Icon name="person_add" className="text-[14px]"/></div><span className={`${label} font-medium`}>+ 친구 초대</span></Link>;

  async function shareSpace() {
    const url = new URL('/?lang=ko&home=1',window.location.origin);
    url.searchParams.set('group', crew.id ?? 'personal');
    url.searchParams.set('home', '1');
    try {
      if (navigator.share) await navigator.share({ title: `${crew.name ?? '내 개인 공간'} · 메모네스티아`, text: '참여 중인 공간 피드를 확인해 보세요.', url: url.toString() });
      else { await navigator.clipboard.writeText(url.toString()); setShareNotice('공간 피드 주소를 복사했어요.'); window.setTimeout(() => setShareNotice(''), 2400); }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      setShareNotice('공유를 열지 못했어요. 초대 버튼에서 멤버를 초대할 수 있어요.');
      window.setTimeout(() => setShareNotice(''), 3200);
    }
  }

 return <>    <header className="fixed inset-x-0 top-0 z-50 w-full border-b border-[#efdfd5] bg-[#fff8f5]/95 pt-[env(safe-area-inset-top,0px)] shadow-[0_1px_8px_rgba(0,0,0,0.04)] backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[480px] flex-col gap-2 px-5 pb-2 pt-2 md:max-w-[1200px] md:px-8 md:pb-3 md:pt-3">
        <div className="flex h-10 items-center justify-between gap-3">
          <Link href={`/?lang=ko&home=1&group=${encodeURIComponent(crew.id ?? "personal")}`} aria-label="메모네스티아 홈" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"><BrandMark/></Link>
          <div className="flex shrink-0 items-center gap-1">{guest?<Link href="/?lang=ko&login=1" className="rounded-full bg-[#99452c] px-4 py-2 text-xs font-semibold text-white">로그인</Link>:<><button type="button" onClick={() => void shareSpace()} aria-label="공간 피드 공유" className="flex h-9 w-9 items-center justify-center rounded-xl text-[#78675e] hover:bg-[#f6e5db]"><Icon name="share" className="text-[21px]"/></button><Link href={`${crewHref}?group=${encodeURIComponent(crew.id??'personal')}`} aria-label="계정 및 크루 설정" className="flex h-8 w-8 items-center justify-center rounded-full bg-[#99452c] shadow-[0_2px_8px_rgba(153,69,44,0.2)]"><Icon name="person" className="text-[#ffffff] text-[18px]"/></Link></>}</div>
        </div>
        <div className="flex min-w-0 items-center justify-between gap-2">
          {guest?<div className="py-1"><span className="stitch-serif text-base font-semibold">메모네스티아</span><p className="mt-1 text-[10px] text-[#78675e]">작은 순간을 모으는 곳</p></div>:<button type="button" aria-expanded={picking} aria-haspopup="dialog" onClick={() => setPicking(v => !v)} className="group flex min-w-0 items-center gap-2 rounded-xl px-1 py-1 text-left hover:bg-[#fff1e9]">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f6e5db] text-[#99452c]"><Icon name={crew.id ? 'groups' : 'person'} className="text-[18px]"/></span><span className="min-w-0"><span className="stitch-serif block truncate text-[1rem] font-semibold text-[#221a14]">{crew.name ?? '내 개인 공간'}</span><span className="block truncate text-[10px] text-[#78675e]">{crew.id ? `${crew.members.length}명 · ${data.groups.find(group => group.id === crew.id)?.mine ? '내가 만든 공간' : '초대받은 공간'}` : '눌러서 다른 크루로 이동'}</span></span><Icon name="expand_more" className="shrink-0 text-[18px] text-[#55433d] transition-transform group-hover:translate-y-0.5"/>
          </button>}
          {invite}

        </div>
        {crew.id && <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar" aria-label="크루 멤버">
          {crew.members.map(m => <div key={m.id} className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/80 px-2 py-1"><div className={`flex h-6 w-6 items-center justify-center rounded-full ${label} ${m.mine ? 'font-bold' : 'font-[500]'} ${tone(m)}`}>{initial(m)}</div><span className="text-[10px] text-[#55433d]">{m.mine ? '나' : m.name}</span></div>)}
        </div>}
        {shareNotice && <p role="status" className="absolute right-4 top-full mt-2 rounded-xl bg-[#30251f] px-3 py-2 text-xs text-white shadow-lg md:right-8">{shareNotice}</p>}
      </div>
    </header>
    {picking && <SpacePickerModal onClose={() => setPicking(false)}>
              <button type="button" aria-pressed={crew.id === null} onClick={() => { setPicking(false); actions.onSelectGroup(null); }} className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-[#fcebe0] ${crew.id === null ? 'bg-[#fff1e9] font-bold text-[#99452c]' : 'text-[#221a14]'}`}><span><span className="block truncate text-sm">내 개인 공간</span><span className="mt-0.5 block text-[10px] font-normal text-[#88726c]">개인 앨범과 초대받은 추억</span></span><span className={`${label} shrink-0 text-[#88726c]`}>개인</span></button>
              {data.groups.some(group => group.mine) && <><p className="px-3 pb-1 pt-3 text-[10px] font-bold uppercase tracking-[.12em] text-[#88726c]">내가 만든 공간</p>{data.groups.filter(group => group.mine).map(g => <button key={g.id} type="button" aria-pressed={g.id === crew.id} onClick={() => { setPicking(false); actions.onSelectGroup(g.id); }} className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-[#fcebe0] ${g.id === crew.id ? 'bg-[#fff1e9] font-bold text-[#99452c]' : 'text-[#221a14]'}`}><span className="min-w-0"><span className="block truncate text-sm">{g.name}</span><span className="mt-0.5 block truncate text-[10px] font-normal text-[#88726c]">내가 만든 공간 · 멤버 {g.members}명</span></span><Icon name={g.id === crew.id ? "check_circle" : "chevron_right"} className="shrink-0 text-lg text-[#99452c]"/></button>)}</>}
              {data.groups.some(group => !group.mine) && <><p className="px-3 pb-1 pt-3 text-[10px] font-bold uppercase tracking-[.12em] text-[#88726c]">초대받은 공간</p>{data.groups.filter(group => !group.mine).map(g => <button key={g.id} type="button" aria-pressed={g.id === crew.id} onClick={() => { setPicking(false); actions.onSelectGroup(g.id); }} className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-[#fcebe0] ${g.id === crew.id ? 'bg-[#fff1e9] font-bold text-[#99452c]' : 'text-[#221a14]'}`}><span className="min-w-0"><span className="block truncate text-sm">{g.name}</span><span className="mt-0.5 block truncate text-[10px] font-normal text-[#88726c]">{g.ownerName}님이 만든 공간 · 멤버 {g.members}명</span></span><Icon name={g.id === crew.id ? "check_circle" : "chevron_right"} className="shrink-0 text-lg text-[#99452c]"/></button>)}</>}
              {!data.groups.length && <p className="px-3 py-3 text-xs leading-5 text-[#78675e]">아직 참여 중인 공용 공간이 없어요. 친구의 초대 링크로 참여하면 이곳에 표시돼요.</p>}
              <details className="my-3 rounded-2xl border border-[#efdfd5] bg-white"><summary className="cursor-pointer px-3 py-3 text-xs font-semibold text-[#78675e]">다른 공개 공간 둘러보기</summary>
              {publicGroups.map(group=><div key={group.id} className="flex items-center gap-2 rounded-lg px-3 py-2.5"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f6e5db] text-[#99452c]"><Icon name="groups" className="text-base"/></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{group.name}</span><span className="block truncate text-[10px] text-[#88726c]">{group.ownerName}님 · 멤버 {group.members}명</span></span><button type="button" disabled={!!joiningSpace} onClick={async()=>{if(!actions.onJoinPublicGroup)return;setJoiningSpace(group.id);setSpaceError('');try{await actions.onJoinPublicGroup(group.id);setPicking(false);}catch{setSpaceError('공간에 참여하지 못했어요. 다시 시도해 주세요.');}finally{setJoiningSpace(null);}}} className="shrink-0 rounded-full bg-[#99452c] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">{joiningSpace===group.id?'참여 중…':'참여'}</button></div>)}
              {spaceError&&!creatingSpace&&<p role="alert" className="px-3 pb-2 text-xs text-[#a33b2f]">{spaceError}</p>}
              {!publicGroups.length&&<p className="px-3 pb-3 text-xs leading-5 text-[#78675e]">공개로 설정한 공간이 아직 없어요. 내 공간에서 공개 설정을 켜면 여기에 표시돼요.</p>}
              </details>
              {actions.onCreateGroup && <button type="button" onClick={() => { setPicking(false); setSpaceName(''); setSpacePublic(false); setSpaceError(''); setTermsGate(false); setTermsChecked(false); setCreatingSpace(true); }} className="flex items-center gap-2 border-t border-[#f0e4dc] px-3 py-2.5 text-left text-sm font-semibold text-[#99452c] hover:bg-[#fff1e9]"><Icon name="add_circle" className="text-lg"/>새 앨범 공간 만들기</button>}
    </SpacePickerModal>}
    {creatingSpace && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#30251f]/55 px-5" onMouseDown={event => { if(event.target===event.currentTarget&&!spaceBusy&&!termsBusy)setCreatingSpace(false); }}><section role="dialog" aria-modal="true" aria-labelledby="new-space-title" className="w-full max-w-sm rounded-2xl border border-[#efdfd5] bg-[#fff8f5] p-5 shadow-2xl"><div className="mb-4 flex items-start justify-between gap-3"><div><span className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#99452c]">New album space</span><h2 id="new-space-title" className="stitch-serif mt-1 text-xl font-semibold text-[#30251f]">새 앨범 공간 만들기</h2><p className="mt-1 text-xs leading-5 text-[#78675e]">가족, 친구, 여행처럼 함께 기록할 사람들별로 공간을 만들어요.</p></div><button type="button" aria-label="닫기" disabled={spaceBusy||termsBusy} onClick={()=>setCreatingSpace(false)} className="rounded-lg px-2 py-1 text-[#78675e] hover:bg-[#f6e5db]">✕</button></div>{termsGate ? <div className="space-y-4"><div className="rounded-xl border border-[#e6d6ca] bg-white p-4"><p className="text-sm font-semibold text-[#30251f]">공간을 만들기 전에 동의가 필요해요</p><p className="mt-1 text-xs leading-5 text-[#78675e]">아래 문서를 확인한 뒤 체크하고 동의해 주세요. 동의 후 이 창으로 돌아와 공간을 만들 수 있어요.</p><div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm font-semibold"><Link className="text-[#99452c] underline underline-offset-2" href="/terms" target="_blank">이용약관 · 커뮤니티 규칙 보기 ↗</Link><Link className="text-[#99452c] underline underline-offset-2" href="/privacy" target="_blank">개인정보 처리 안내 보기 ↗</Link></div><label className="mt-4 flex cursor-pointer items-start gap-2.5 border-t border-[#f0e4dc] pt-3 text-xs leading-5 text-[#55433d]"><input type="checkbox" checked={termsChecked} onChange={event=>setTermsChecked(event.target.checked)} className="mt-1 accent-[#99452c]"/><span>이용약관과 커뮤니티 규칙에 동의하고 개인정보 처리 안내를 확인했습니다.</span></label></div>{spaceError&&<p role="alert" className="text-xs text-[#a33b2f]">{spaceError}</p>}<button type="button" disabled={!termsChecked||termsBusy} onClick={async()=>{setTermsBusy(true);setSpaceError('');try{await api('/api/policy',{method:'POST',body:JSON.stringify({version:TERMS_VERSION,accepted:true})});setTermsGate(false);setTermsChecked(false);}catch{setSpaceError('동의를 저장하지 못했어요. 연결을 확인하고 다시 시도해 주세요.');}finally{setTermsBusy(false);}}} className="w-full rounded-xl bg-[#99452c] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{termsBusy?'동의 저장 중…':'동의하고 공간 만들기로 돌아가기'}</button></div> : <form onSubmit={async event=>{event.preventDefault();if(!spaceName.trim()||!actions.onCreateGroup)return;setSpaceBusy(true);setSpaceError('');try{await actions.onCreateGroup(spaceName.trim(),spacePublic);setCreatingSpace(false);setSpaceName('');}catch(error){if(error instanceof Error&&error.message==='TERMS_REQUIRED'){setTermsGate(true);setSpaceError('');}else setSpaceError(error instanceof Error&&error.message==='GROUP_LIMIT'?'만들 수 있는 공간 수(50개)에 도달했어요.':'공간을 만들지 못했어요. 잠시 후 다시 시도해 주세요.');}finally{setSpaceBusy(false);}}} className="space-y-3"><label className="block text-xs font-semibold text-[#55433d]">공간 이름<input autoFocus required maxLength={80} value={spaceName} onChange={event=>setSpaceName(event.target.value)} placeholder="예: 우리 가족, 대학 친구들" className="mt-1.5 w-full rounded-xl border border-[#e6d6ca] bg-white px-3 py-3 text-sm text-[#30251f] outline-none focus:border-[#99452c]"/></label><label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-[#e6d6ca] bg-white p-3 text-xs leading-5 text-[#55433d]"><input type="checkbox" checked={spacePublic} onChange={event=>setSpacePublic(event.target.checked)} className="mt-0.5 accent-[#99452c]"/><span><strong className="block text-[#30251f]">공개 공간 둘러보기에 등록</strong><span className="text-[#78675e]">공간 이름, 만든 사람, 멤버 수가 표시돼요. 앨범과 사진은 참여한 뒤에도 각각의 공개 범위를 따라요.</span></span></label>{spaceError&&<p role="alert" className="text-xs text-[#a33b2f]">{spaceError}</p>}<button type="submit" disabled={spaceBusy||!spaceName.trim()} className="w-full rounded-xl bg-[#99452c] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{spaceBusy?'만드는 중…':'공간 만들기'}</button></form>}</section></div>}</>;
}
