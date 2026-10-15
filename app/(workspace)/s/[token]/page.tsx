/* eslint-disable @next/next/no-img-element */
import {connection} from 'next/server';
import Link from 'next/link';
import {Suspense} from 'react';
import {linkedPhotos,linkedStory,shareAccess,shareIdentity} from '@/lib/share-links';
import {requestLocale} from '@/lib/request-locale';
export const metadata={title:'Memolumi · Shared moments',robots:{index:false,follow:false},referrer:'no-referrer' as const};
type Props={params:Promise<{token:string}>,searchParams:Promise<{lang?:string}>};
export default function SharedPage(props:Props){return <Suspense fallback={<main aria-busy="true">Memolumi · Loading…</main>}><SharedContent {...props}/></Suspense>;}
async function SharedContent({params,searchParams}:Props){
 await connection();const {token}=await params,locale=await requestLocale((await searchParams).lang),ko=locale==='ko',photos=await linkedPhotos(token);
 const access=await shareAccess(token);
 const story=photos.length?await linkedStory(token):null;
 if(access==='members'&&!photos.length){
  const signedIn=await shareIdentity();
  const returnTo=`/s/${token}?lang=${ko?'ko':'en'}`;
  return <main lang={locale} style={{maxWidth:560,padding:32}}><h1>{ko?'초대 멤버만 볼 수 있어요':'For invited members only'}</h1><p>{signedIn?(ko?'초대를 수락한 계정과 사진 공개 대상을 확인해 주세요. 링크만으로 앨범에 참여되지는 않아요.':'Use the account that accepted the invitation and check the photo audience. This link does not grant album membership.'):(ko?'Google 또는 Apple로 로그인한 뒤, 초대를 수락한 앨범의 사진을 볼 수 있어요.':'Sign in with Google or Apple to view photos in albums you have joined by invitation.')}</p><Link className="primary-button" href={`/?lang=${ko?'ko':'en'}&login=1${signedIn?"":`&returnTo=${encodeURIComponent(returnTo)}`}`}>{ko?'계정 확인 · 로그인':'Check account / sign in'}</Link><p><Link href="/">{ko?'내 공간으로':'Go to my space'}</Link></p></main>;
 }
 return <main lang={locale} style={{maxWidth:1100,padding:'32px 20px',width:'100%'}}><Link href="/" style={{fontWeight:800,fontSize:24}}>memolumi.</Link><h1 style={{marginTop:32}}>{story?.title||(ko?'함께 나누는 순간들':'Moments shared with you')}</h1>{story&&<p style={{whiteSpace:'pre-wrap',lineHeight:1.8}}>{story.body}</p>}<p>{photos.length?ko?`${photos.length}개의 사진·영상 · 링크는 7일 동안 유효해요.`:`${photos.length} photos & videos · Links expire after 7 days.`:ko?'만료되었거나 공유가 중지된 링크입니다.':'This link has expired or sharing has stopped.'}</p><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:20,marginTop:24}}>{photos.map(p=>{
 const src=`/api/photos/${p.id}/content?share=${token}`;
 return <article key={p.id} style={{background:'#fff',borderRadius:16,padding:12}}>{p.mime.startsWith('video/')?<video src={src} controls playsInline preload="metadata" style={{width:'100%',height:280,objectFit:'contain'}}/>:<img src={src} alt={p.name} loading="lazy" style={{width:'100%',height:280,objectFit:'contain'}}/>}<p>{p.name}</p><a className="secondary-button" href={`${src}&download=1`}>{ko?(p.original_available?'원본 다운로드':'사진 다운로드'):'Download'}</a></article>;
 })}</div><p style={{marginTop:24}}><Link href="/support#safety">{ko?"콘텐츠·사용자 신고":"Report content or a user"}</Link> · <Link href="/terms">{ko?"커뮤니티 규칙":"Community rules"}</Link></p></main>;
}
