'use client';

import {useEffect,useRef,type RefObject} from 'react';
import {createPortal} from 'react-dom';
import {Trash2} from 'lucide-react';
import {sansStack,stitchRoot} from './stitch-kit';

export default function FeedDeleteDialog({id,record,busy,error,returnFocus,onCancel,onConfirm}:{
 id:string;record:boolean;busy:boolean;error:string;returnFocus:RefObject<HTMLButtonElement|null>;onCancel:()=>void;onConfirm:()=>void;
}){
 const backdrop=useRef<HTMLDivElement>(null),cancel=useRef<HTMLButtonElement>(null);
 useEffect(()=>{
  // Keep the confirmation outside animated cards and prevent background interaction.
  const root=backdrop.current,trigger=returnFocus.current;
  if(!root)return;
  const siblings=Array.from(document.body.children).filter((node):node is HTMLElement=>node instanceof HTMLElement&&node!==root);
  const previous=siblings.map(node=>({node,inert:node.inert}));
  siblings.forEach(node=>{node.inert=true;});
  cancel.current?.focus({preventScroll:true});
  return()=>{previous.forEach(({node,inert})=>{node.inert=inert;});if(trigger?.isConnected)trigger.focus({preventScroll:true});};
 },[returnFocus]);

 return createPortal(<div ref={backdrop} className={`${stitchRoot} fixed inset-0 z-[200] flex items-center justify-center bg-[#30251f]/45 p-5 backdrop-blur-[2px]`} style={{fontFamily:sansStack}} role="presentation"
  onMouseDown={event=>{if(event.target===event.currentTarget&&!busy)onCancel();}}
  onKeyDown={event=>{
   if(event.key==='Escape'){event.preventDefault();event.stopPropagation();if(!busy)onCancel();}
   if(event.key==='Tab'){
    const buttons=Array.from(backdrop.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')||[]),first=buttons[0],last=buttons.at(-1);
    if(!first){event.preventDefault();return;}
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
   }
  }}>
  <section role="alertdialog" aria-modal="true" aria-labelledby={`delete-feed-${id}`} aria-describedby={`delete-desc-${id}`} aria-busy={busy}
   className="max-h-[calc(100dvh-40px)] w-full max-w-sm overflow-y-auto rounded-[26px] border border-[#efdfd5] bg-[#fffaf7] p-6 shadow-2xl">
   <span className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-[#f9e9df] text-[#a94835]"><Trash2 size={21} strokeWidth={1.8} aria-hidden="true"/></span>
   <h2 id={`delete-feed-${id}`} className="stitch-serif text-xl font-semibold text-[#30251f]">이 기록을 숨길까요?</h2>
   <p id={`delete-desc-${id}`} className="mt-2 text-sm leading-relaxed text-[#78675e]">{record?'피드와 앨범에서 기록과 연결 사진이 숨겨집니다. 저장된 파일은 지워지지 않아요.':'피드와 앨범에서 사진이 숨겨집니다. 저장된 파일은 지워지지 않아요.'}</p>
   {error&&<p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
   <div className="mt-6 flex justify-end gap-2">
    <button ref={cancel} type="button" disabled={busy} onClick={onCancel} className="rounded-full border border-[#e8d8ce] bg-white px-4 py-2.5 text-sm font-semibold text-[#55433d]">취소</button>
    <button type="button" disabled={busy} onClick={onConfirm} className="rounded-full bg-[#99452c] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy?'숨기는 중…':'숨기기'}</button>
   </div>
  </section>
 </div>,document.body);
}
