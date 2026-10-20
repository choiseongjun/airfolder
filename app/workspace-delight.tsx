/* eslint-disable @next/next/no-img-element -- Local decorative photographs do not need remote optimization. */
import BrandMark from '@/app/brand-mark';
import Link from 'next/link';
import { ArrowRight, BookOpen, Cake, Heart, Plus, ImagePlus, Clock3, Camera } from 'lucide-react';
import type { Locale } from './i18n';
import './album-templates.css';

export function EmptyBookshelf({locale,onCreate,onStudio,onTrial}:{locale:Locale;onCreate:()=>void;onStudio:()=>void;onTrial:()=>void}) {
  const ko=locale==='ko';
  const exploreHref=`/?browse=1&lang=${locale}`;
  return <section className="core-entry" aria-labelledby="first-book-title">
    <div className="core-entry-art" aria-label={ko?'사진 앞면과 비밀 메모 뒷면 미리보기':'A photo and its private note'}>
      <div className="core-entry-art-label"><span>MEMONESTIA</span><span>{ko?'우리끼리만':'JUST OUR CREW'}</span></div>
      <figure className="core-entry-photo"><img src="/landing/friends.webp" alt={ko?'친구들과 함께한 순간':'A moment with friends'}/><figcaption>{ko?'우리의 보통날도 오래 간직하기':'KEEP THIS LITTLE DAY'}</figcaption><span className="core-entry-flip">↻ {ko?'뒷면 메모':'TURN FOR NOTES'}</span></figure>
      <div className="core-entry-note"><span>{ko?'사진 뒤에 남긴 한마디':'A NOTE ON THE BACK'}</span><p>{ko?'“별거 아닌 하루였는데, 너희랑 있어서 오래 기억날 것 같아.”':'“An ordinary day that became a favorite because we were together.”'}</p><small>♡ &nbsp; {ko?'친구들이 남긴 비밀 메모':'A little note from your people'}</small></div>
      <div className="core-entry-filmstrip"><img src="/landing/sea.webp" alt=""/><img src="/landing/picnic.webp" alt=""/><img src="/landing/friends.webp" alt=""/><span>+1</span></div>
    </div>
    <div className="core-entry-copy"><span className="core-entry-kicker"><Heart size={13}/>{ko?'100% 무료 · 초대한 크루만':'PRIVATE CREW · ALWAYS FREE'}</span>
      <h3 id="first-book-title">{ko?<>우리들만의 사진 뒷면<br/>비밀 일기장, 메모네스티아</>:<>A private little diary<br/>behind your photos.</>}</h3>
      <p>{ko?'단톡방 대화에 묻히는 사진을 우리끼리 모으고, 뒷면에는 그날의 메모를 남겨요.':'Keep the photos that get buried in chat, then leave the little stories on their backs.'}</p>
      <div className="core-entry-compare"><div><small>{ko?'단체 채팅방':'GROUP CHAT'}</small><strong>{ko?'대화에 묻혀 찾기 어려운 사진':'Photos lost in the scroll'}</strong></div><ArrowRight size={16}/><div><small>MEMONESTIA</small><strong>{ko?'모아두고 뒷면에 메모':'Saved photos, notes on the back'}</strong></div></div>
      <div className="core-entry-points"><span>01 &nbsp;{ko?'사진 1~4장 한 기록에':'1–4 photos in one memory'}</span><span>02 &nbsp;{ko?'여행 사진은 날짜별로 묶기':'Trips grouped by day'}</span><span>03 &nbsp;{ko?'친구끼리 비밀 롤링페이퍼':'Private notes for your crew'}</span></div>
      <div className="core-entry-actions"><button className="primary-button" onClick={onTrial}><Camera size={17}/>{ko?'사진으로 시작하기':'Start with your photos'}<ArrowRight size={16}/></button><button className="secondary-button" onClick={onCreate}><Plus size={16}/>{ko?'크루 앨범 만들기':'Create a crew album'}</button><Link href={exploreHref}><BookOpen size={15}/>{ko?'예시 먼저 둘러보기':'Explore an example'}</Link></div>
      <small className="core-entry-reassurance">{ko?'가입 전에도 둘러볼 수 있어요 · 광고와 결제 없이 운영해요':'Take a look before signing in · No ads or payments'}</small>
      <Link className="core-entry-birthday" href={`/birthday?lang=${locale}`}><Cake size={14}/>{ko?'친구 생일 앨범 만들기':'Make a birthday album'}</Link>
      <button className="core-entry-studio" onClick={onStudio}><ImagePlus size={14}/>{ko?'사진 카드도 만들어보기':'Make a photo card'}</button>
    </div>
  </section>;
}

export function WorkspaceStory({locale,onCreate,onHelp}:{locale:Locale;onCreate:()=>void;onHelp:()=>void}) {
  const ko=locale==='ko';
  return <aside className="desktop-story keepsake-story">
    <div className="story-top"><Link className="brand" href="/"><span className="brand-icon"><BrandMark/></span>memonestia<span className="brand-dot">.</span></Link><span className="story-edition">A LITTLE PLACE<br/>FOR YOUR PEOPLE.</span></div>
    <div className="keepsake-story-content">
      <span className="keepsake-kicker"><Heart size={13}/>{ko?'우리끼리만 보는 비밀 아카이브':'A PRIVATE PLACE FOR YOUR CREW'}</span>
      <h2>{ko?'우리들만의 사진 뒷면':'A little diary'}<br/><em>{ko?'비밀 일기장, 메모네스티아':'behind your photos.'}</em></h2>
      <p>{ko?'단톡방에 묻힌 사진은 크루 앨범에, 그날의 마음은 사진 뒷면에 남겨요.':'Keep the photos out of the chat scroll. Leave your stories on the back.'}<br/>{ko?'초대한 친구들만 함께하는 무료 공간이에요.':'A free private space, shared only with invited friends.'}</p>
      <div className="keepsake-collage" aria-label={ko?'사진을 모아 만든 추억 앨범 예시':'A shared photo album illustration'}>
        <div className="keepsake-paper"><span>OUR LITTLE WEEKEND</span><div className="keepsake-paper-lines"/><span className="keepsake-handwriting">{ko?'함께여서 좋았던 날':'the good little days'} ♡</span></div>
        <figure className="keepsake-photo keepsake-photo-one"><img src="/landing/sea.webp" alt=""/><figcaption>a little escape <Heart size={13}/></figcaption></figure>
        <figure className="keepsake-photo keepsake-photo-two"><img src="/landing/friends.webp" alt=""/><figcaption>us, just being us.</figcaption></figure>
        <span className="keepsake-sticker"><Heart size={20}/><span>made of<br/>little moments</span></span>
        <span className="keepsake-caption">{ko?'사진은 각자, 추억은 함께.':'Your photos. Our story.'}</span>
      </div>
      <div className="keepsake-story-actions"><button className="story-cta" onClick={onCreate}>{ko?'사진 뒷면 일기장 시작하기':'Start a private memory'}<ArrowRight size={17}/></button><button className="keepsake-help" onClick={onHelp}>{ko?'어떻게 사용하나요?':'How does it work?'}</button></div>
      <div className="story-note"><Clock3 size={13}/>{ko?'로그인 없이 먼저 만들어 보고, 저장할 때만 가입해요.':'Try it first without signing in. Sign up only to keep it.'}</div>
    </div>
    <div className="story-bottom"><span>YOUR MOMENTS. TOGETHER.</span><Link href={`/${locale}`}>{ko?'메모네스티아 이야기':'Meet Memonestia'} ↗</Link></div>
  </aside>;
}

export function StudioTeaser({locale,onCreate}:{locale:Locale;onCreate:()=>void}) {
  const ko=locale==='ko';
  return <section className="studio-invitation">
    <div className="studio-invitation-copy"><span><Camera size={12}/>{ko?'작은 추억 공방':'THE LITTLE MEMORY STUDIO'}</span><h2>{ko?'사진 몇 장, 예쁜 한 페이지.':'A few photos. A little magic.'}</h2><p>{ko?'네컷부터 엽서까지, 나만의 틀에 담아봐요.':'Photo strips or postcards, made yours.'}</p><button onClick={onCreate}>{ko?'포토카드 만들기':'Make a photo card'}<ArrowRight size={15}/></button></div>
    <div className="studio-mini-strip" aria-hidden="true"><span>MEMONESTIA</span><img src="/landing/sea.webp" alt=""/><img src="/landing/picnic.webp" alt=""/><Heart size={12}/></div>
    <ImagePlus className="studio-invitation-spark" size={25} aria-hidden="true"/>
  </section>;
}
