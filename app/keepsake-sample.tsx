'use client';
/* eslint-disable @next/next/no-img-element -- Bundled illustrative photos. */
import {useState} from 'react';
import type {Locale} from './i18n';

export default function KeepsakeSample({locale}:{locale:Locale}){
 const [page,setPage]=useState(0),ko=locale==='ko',t=(a:string,b:string)=>ko?a:b;
 return <div className="bookdesk-preview">
  <button className="bookdesk-sample" aria-label={t('추억책 예시 넘겨보기','Turn the example book page')} onClick={()=>setPage(p=>(p+1)%3)}>
   <div className="bookdesk-sample-sheet" key={page}>
    {page===0?<><span>{t('우리의 어느 주말','ONE WEEKEND TOGETHER')}</span><img src="/explore/album-samples/hiking-friends.jpg" alt={t('친구들과 함께 걷던 날의 예시 사진','Illustrative photo of a day out with friends')}/><strong>{t('너와 걷던 그날','The day we walked together')}</strong><p>{t('별일 없어서, 더 오래 기억나는 하루.','An ordinary day. An extraordinary memory.')}</p></>:page===1?<><span>{t('한참을 웃었던 오후','AN AFTERNOON OF LAUGHTER')}</span><img src="/explore/album-samples/cafe-friends.jpg" alt={t('친구들과 카페에서 보낸 오후의 예시 사진','Illustrative photo of friends in a cafe')}/><strong>{t('사진 밖에도, 우리가 있어.','There is more to us than a photo.')}</strong><p>{t('무슨 얘기였는지는 잊어도, 웃던 얼굴은 남아.','I forget what we said. I remember how we laughed.')}</p></>:<><span>{t('그날의 우리에게','TO US, ON THAT DAY')}</span><div className="bookdesk-sample-letter"><strong>{t('오래 기억할 건,\n결국 우리였어.','What I’ll remember,\nis us.')}</strong><p>{t('계획대로 된 건 별로 없었는데,\n집에 오는 길까지 웃음이 났어.\n\n다음에도 이렇게, 우리 같이.','Almost nothing went to plan.\nBut I was smiling all the way home.\n\nLet’s do this again, together.')}</p></div><small>memonestia</small></>}
   </div>
  </button>
  <div className="bookdesk-preview-controls"><button disabled={page===0} aria-label={t('이전 예시 페이지','Previous example page')} onClick={()=>setPage(p=>p-1)}>←</button><span aria-live="polite">{page+1} / 3</span><button disabled={page===2} aria-label={t('다음 예시 페이지','Next example page')} onClick={()=>setPage(p=>p+1)}>→</button></div>
  <small>{t('책을 눌러 넘겨보세요 · 사진과 글은 예시예요','Tap the book to turn a page · Illustrative photos and words')}</small>
 </div>;
}
