/* eslint-disable @next/next/no-img-element -- Local decorative photographs do not need remote optimization. */
import BrandMark from '@/app/brand-mark';
import Link from 'next/link';
import { ArrowRight, BookOpen, Cake, Heart, Plus, ImagePlus, Clock3, Camera } from 'lucide-react';
import type { Locale } from './i18n';
import { templates } from './album-book';
import './album-templates.css';

export function EmptyBookshelf({locale,onCreate,onStudio,onTrial}:{locale:Locale;onCreate:()=>void;onStudio:()=>void;onTrial:()=>void}) {
  const ko=locale==='ko';
  const exploreHref=`/?browse=1&lang=${locale}`;
  return <section className="empty-bookshelf" aria-labelledby="first-book-title">
    <Link className="sample-books" href={exploreHref} aria-label={ko?'예시 앨범 구경하기':'Explore sample albums'}>
      <div className="sample-book"><img src="/landing/sea.webp" alt=""/><span>SEA, YOU & ME</span><small>{ko?'여행 앨범 예시':'Travel album example'}</small></div>
      <div className="sample-book"><img src="/landing/friends.webp" alt=""/><span>THE GOOD DAYS</span><small>{ko?'친구 앨범 예시':'Friends album example'}</small></div>
      <span className="shelf-sample-sticker" aria-hidden="true"><Heart size={21}/> made with love</span>
      <span className="sample-books-hover"><BookOpen size={15}/>{ko?'눌러서 둘러보기':'Tap to explore'}</span>
    </Link>
    <div className="first-book-copy"><span className="shelf-kicker">A PLACE FOR YOUR STORIES</span><h3 id="first-book-title">{ko?'우리의 첫 번째 책은,':'Your first book starts'}<br/>{ko?'어떤 날일까요?':'with a little moment.'}</h3><p>{ko?'거창한 여행이 아니어도 좋아요. 함께 먹은 저녁, 웃었던 오후부터 한 권씩 채워봐요.':'A shared dinner. An afternoon of laughter. The ordinary days deserve a place here, too.'}</p><div className="template-teaser" aria-label={ko?'고를 수 있는 앨범 템플릿':'Album templates you can choose'}>{templates.map(t=><span key={t.id} className={`template-teaser-chip sample-${t.id}`}><span className="template-mini" aria-hidden="true"><span className="mini-story"><i/><i/><i/></span><span className="mini-photos"><i/><i/><i/><i/></span></span><small>{ko?t.ko:t.en}</small></span>)}</div><Link className="primary-button explore-hero-button" href={exploreHref}><BookOpen size={18}/>{ko?'다른 앨범 구경하기':'Explore sample albums'}<ArrowRight size={16}/></Link><ol><li>{ko?'앨범에 이름 붙이기':'Give your album a name'}</li><li>{ko?'좋아하는 사진 담기':'Add your favorite photos'}</li><li>{ko?'한 줄 남기고 펼쳐보기':'Leave a note and turn the page'}</li></ol><button className="primary-button" onClick={onTrial}><Camera size={16}/>{ko?'사진으로 1분 앨범 만들기':'Make an album from photos'}<ArrowRight size={14}/></button><Link className="secondary-button birthday-entry" href={`/birthday?lang=${locale}`}><Cake size={16}/>{ko?'친구 생일 앨범 만들기':'Make a birthday album for a friend'}</Link><button className="secondary-button" onClick={onCreate}><Plus size={16}/>{ko?'첫 앨범 만들기':'Create your first album'}</button><button className="text-button" onClick={onStudio}>{ko?'사진으로 카드부터 만들어볼래요':'Start with a photo card'}<ArrowRight size={14}/></button></div>
  </section>;
}

export function WorkspaceStory({locale,onCreate,onHelp}:{locale:Locale;onCreate:()=>void;onHelp:()=>void}) {
  const ko=locale==='ko';
  return <aside className="desktop-story keepsake-story">
    <div className="story-top"><Link className="brand" href="/"><span className="brand-icon"><BrandMark/></span>memonestia<span className="brand-dot">.</span></Link><span className="story-edition">A LITTLE PLACE<br/>FOR YOUR PEOPLE.</span></div>
    <div className="keepsake-story-content">
      <span className="keepsake-kicker"><Heart size={13}/>{ko?'여행 끝나고, 딱 1분.':'One minute after the trip.'}</span>
      <h2>{ko?'단톡방에 흩어진 여행 사진,':'Trip photos scattered in the chat,'}<br/><em>{ko?'1분 만에 우리만의 앨범책으로.':'one album book in a minute.'}</em></h2>
      <p>{ko?'사진을 한 번에 고르면 날짜별로 나눠 알아서 꾸며요.':'Pick them all at once. We sort them by day and decorate them.'}<br/>{ko?'링크를 받은 친구들은 가입 없이 사진과 한마디를 얹어요.':'Friends add photos and a note from the link, no sign-up.'}</p>
      <div className="keepsake-collage" aria-label={ko?'사진을 모아 만든 추억 앨범 예시':'A shared photo album illustration'}>
        <div className="keepsake-paper"><span>OUR LITTLE WEEKEND</span><div className="keepsake-paper-lines"/><span className="keepsake-handwriting">{ko?'함께여서 좋았던 날':'the good little days'} ♡</span></div>
        <figure className="keepsake-photo keepsake-photo-one"><img src="/landing/sea.webp" alt=""/><figcaption>a little escape <Heart size={13}/></figcaption></figure>
        <figure className="keepsake-photo keepsake-photo-two"><img src="/landing/friends.webp" alt=""/><figcaption>us, just being us.</figcaption></figure>
        <span className="keepsake-sticker"><Heart size={20}/><span>made of<br/>little moments</span></span>
        <span className="keepsake-caption">{ko?'사진은 각자, 추억은 함께.':'Your photos. Our story.'}</span>
      </div>
      <div className="keepsake-story-actions"><button className="story-cta" onClick={onCreate}>{ko?'내 사진으로 1분 앨범 만들기':'Make a one-minute album'}<ArrowRight size={17}/></button><button className="keepsake-help" onClick={onHelp}>{ko?'어떻게 사용하나요?':'How does it work?'}</button></div>
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
