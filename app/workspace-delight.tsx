/* eslint-disable @next/next/no-img-element -- Local decorative photographs do not need remote optimization. */
import BrandMark from '@/app/brand-mark';
import Link from 'next/link';
import { ArrowRight, BookOpen, Heart, ImagePlus, LockKeyhole, Sparkles } from 'lucide-react';
import type { Locale } from './i18n';

export function EmptyBookshelf({locale,onCreate,onStudio}:{locale:Locale;onCreate:()=>void;onStudio:()=>void}) {
  const ko=locale==='ko';
  return <section className="empty-bookshelf" aria-labelledby="first-book-title">
    <div className="sample-books" aria-label={ko?'앨범 디자인 예시':'Sample album designs'}>
      <div className="sample-book"><img src="/landing/sea.webp" alt=""/><span>SEA, YOU & ME</span><small>{ko?'여행 앨범 예시':'Travel album example'}</small></div>
      <div className="sample-book"><img src="/landing/friends.webp" alt=""/><span>THE GOOD DAYS</span><small>{ko?'친구 앨범 예시':'Friends album example'}</small></div>
      <span className="shelf-sample-sticker" aria-hidden="true"><Heart size={21}/> made with love</span>
    </div>
    <div className="first-book-copy"><span className="shelf-kicker">A PLACE FOR YOUR STORIES</span><h3 id="first-book-title">{ko?'우리의 첫 번째 책은,':'Your first book starts'}<br/>{ko?'어떤 날일까요?':'with a little moment.'}</h3><p>{ko?'거창한 여행이 아니어도 좋아요. 함께 먹은 저녁, 웃었던 오후부터 한 권씩 채워봐요.':'A shared dinner. An afternoon of laughter. The ordinary days deserve a place here, too.'}</p><ol><li>{ko?'앨범에 이름 붙이기':'Give your album a name'}</li><li>{ko?'좋아하는 사진 담기':'Add your favorite photos'}</li><li>{ko?'한 줄 남기고 펼쳐보기':'Leave a note and turn the page'}</li></ol><button className="primary-button" onClick={onCreate}><BookOpen size={16}/>{ko?'첫 앨범 만들기':'Create your first album'}<ArrowRight size={16}/></button><button className="text-button" onClick={onStudio}>{ko?'사진으로 카드부터 만들어볼래요':'Start with a photo card'}<ArrowRight size={14}/></button></div>
  </section>;
}

export function WorkspaceStory({locale,onCreate,onHelp}:{locale:Locale;onCreate:()=>void;onHelp:()=>void}) {
  const ko=locale==='ko';
  return <aside className="desktop-story keepsake-story">
    <div className="story-top"><Link className="brand" href="/"><span className="brand-icon"><BrandMark/></span>memonestia<span className="brand-dot">.</span></Link><span className="story-edition">A LITTLE PLACE<br/>FOR YOUR PEOPLE.</span></div>
    <div className="keepsake-story-content">
      <span className="keepsake-kicker"><Heart size={13}/>{ko?'좋아하는 사람들과, 오래도록.':'Little moments. Closer together.'}</span>
      <h2>{ko?'우리의 별것 아닌 날도,':'Even the ordinary days,'}<br/><em>{ko?'오래 보고 싶은 추억.':'worth keeping forever.'}</em></h2>
      <p>{ko?'각자의 사진을 모아 우리만의 앨범으로.':'Everyone’s photos, in an album of your own.'}<br/>{ko?'한 줄의 이야기, 한 권의 추억이 차곡차곡 쌓여요.':'A little note. A lovely page. A story that grows.'}</p>
      <div className="keepsake-collage" aria-label={ko?'사진을 모아 만든 추억 앨범 예시':'A shared photo album illustration'}>
        <div className="keepsake-paper"><span>OUR LITTLE WEEKEND</span><div className="keepsake-paper-lines"/><span className="keepsake-handwriting">{ko?'함께여서 좋았던 날':'the good little days'} ♡</span></div>
        <figure className="keepsake-photo keepsake-photo-one"><img src="/landing/sea.webp" alt=""/><figcaption>a little escape <Heart size={13}/></figcaption></figure>
        <figure className="keepsake-photo keepsake-photo-two"><img src="/landing/friends.webp" alt=""/><figcaption>us, just being us.</figcaption></figure>
        <span className="keepsake-sticker"><Sparkles size={22}/><span>made of<br/>little moments</span></span>
        <span className="keepsake-caption">{ko?'사진은 각자, 추억은 함께.':'Your photos. Our story.'}</span>
      </div>
      <div className="keepsake-story-actions"><button className="story-cta" onClick={onCreate}>{ko?'나의 첫 추억 만들기':'Make your first memory'}<ArrowRight size={17}/></button><button className="keepsake-help" onClick={onHelp}>{ko?'어떻게 사용하나요?':'How does it work?'}</button></div>
      <div className="story-note"><LockKeyhole size={13}/>{ko?'사진은 기본 비공개. 나누고 싶은 순간만 함께.':'Private by default. Share only what you choose.'}</div>
    </div>
    <div className="story-bottom"><span>YOUR MOMENTS. TOGETHER.</span><Link href={`/${locale}`}>{ko?'메모네스티아 이야기':'Meet Memonestia'} ↗</Link></div>
  </aside>;
}

export function StudioTeaser({locale,onCreate}:{locale:Locale;onCreate:()=>void}) {
  const ko=locale==='ko';
  return <section className="studio-invitation">
    <div className="studio-invitation-copy"><span><Sparkles size={12}/>{ko?'작은 추억 공방':'THE LITTLE MEMORY STUDIO'}</span><h2>{ko?'사진 몇 장, 예쁜 한 페이지.':'A few photos. A little magic.'}</h2><p>{ko?'네컷부터 엽서까지, 나만의 틀에 담아봐요.':'Photo strips or postcards, made yours.'}</p><button onClick={onCreate}>{ko?'추억 만들기':'Make a memory'}<ArrowRight size={15}/></button></div>
    <div className="studio-mini-strip" aria-hidden="true"><span>MEMONESTIA</span><img src="/landing/sea.webp" alt=""/><img src="/landing/picnic.webp" alt=""/><Heart size={12}/></div>
    <ImagePlus className="studio-invitation-spark" size={25} aria-hidden="true"/>
  </section>;
}
