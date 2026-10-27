'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {useRouter,useSearchParams} from 'next/navigation';
import type {Locale} from './i18n';
import {keepIntroPhoto} from '@/lib/intro-photo';
import {useAlbumFunnel} from '@/lib/use-album-funnel';
import './keepsake-book.css';
import ShelfPreview from './shelf-preview';
export default function KeepsakeLanding({locale,onStart}:{locale:Locale;onStart?:()=>void}){
 const ko=locale==='ko',t=(a:string,b:string)=>ko?a:b,router=useRouter(),params=useSearchParams();
 const picker=useRef<HTMLInputElement>(null),[error,setError]=useState('');
 const {measure}=useAlbumFunnel('album-intro');
 useEffect(()=>{measure('memory_intro_viewed');let seconds=0;const timer=setInterval(()=>{if(document.visibilityState==='visible')seconds++;if(seconds>=10){measure('memory_intro_engaged');clearInterval(timer);}},1000);return()=>clearInterval(timer);},[measure]);
 function open(){measure('album_picker_opened');picker.current?.click();}
 function select(file?:File){if(!file)return;if(!file.size||file.size>20*1024**2||(!/^image\/(jpeg|png|webp|heic|heif|avif)$/.test(file.type)&&!/\.hei[cf]$/i.test(file.name))){setError(t('20MB 이하 JPG·PNG·WebP·HEIC·AVIF 사진을 골라주세요.','Choose a JPG, PNG, WebP, HEIC or AVIF photo up to 20 MB.'));return;}keepIntroPhoto(file);measure('album_photos_selected',{photo_count:1});measure('memory_intro_started');if(onStart)onStart();else{const next=new URLSearchParams(params.toString());next.set('stage','create');next.set('lang',locale);router.push(`/make?${next}`);}}
 const cta=<button className="keepsake-primary" onClick={open}>{t('우리의 첫 추억책 만들기','Make our first memory book')} ↗</button>;
 return <main className="keepsake-shell keepsake-landing" lang={locale}><nav className="keepsake-nav"><span>memonestia</span><Link href={`/?lang=${locale}&login=1`}>{t('로그인','Sign in')}</Link></nav>
 <input ref={picker} hidden type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/avif,.heic,.heif" aria-label={t('추억책에 넣을 첫 사진','First photo for your memory book')} onChange={e=>{select(e.target.files?.[0]);e.target.value='';}}/>
 <section className="keepsake-hero"><div className="keepsake-hero-copy"><span className="keepsake-kicker">YOUR MEMORIES, MADE TO KEEP.</span><p>{t('함께 찍은 사진, 아직도 각자의 사진첩에 있나요?','Our photos together. Still on separate phones?')}</p><h1>{t('함께한 날들을,','The days we share,')}<br/><em>{t('우리의 책장에.','kept on our shelf.')}</em></h1><p>{t('여행도, 평범한 데이트도 한 권씩. 내가 먼저 사진과 한마디를 남기고, 초대한 사람의 기억을 더해 함께 보관해요.','A trip, a date, an ordinary afternoon. Start a book with your photos and words, then invite someone to add their memories and keep it together.')}</p>{cta}<small>{t('사진 1장부터 시작 · 공유는 책장을 선택하고 보관할 때','Start with one photo · Choose a shelf before sharing')}</small>{error&&<p role="alert">{error}</p>}</div>
 <ShelfPreview locale={locale}/></section>
 <section className="keepsake-explain"><span className="keepsake-kicker">LESS EDITING. MORE REMEMBERING.</span><h2>{t('사진을 보내고 끝내기엔, 아까운 날들이니까.','Some days deserve more than a message attachment.')}</h2><div className="keepsake-promises">{(ko?[['01','내가 먼저 한 권','사진 1~8장으로 시작하고, 한마디는 원할 때 남겨요. 상대를 기다리지 않아도 괜찮아요.'],['02','함께할 사람을 초대해요','공유 책장을 만들고 초대 링크를 보내요. 참여한 사람이 자신의 사진과 이야기를 보탤 수 있어요.'],['03','다음 추억도 같은 책장에','첫 여행, 생일, 주말. 한 권씩 쌓고 다시 펼쳐봐요. 파일로 내려받아 간직할 수도 있어요.']]:[['01','Start your first book','One to eight photos, with optional words. No need to wait for your partner.'],['02','Invite someone','Create a shared shelf and send an invitation. Members can add their own photos and stories.'],['03','Keep the next day here too','A first trip, a birthday, a weekend. Reopen each book, or download the pages to keep.']]).map(([n,title,body])=><article key={n}><b>{n}</b><h3>{title}</h3><p>{body}</p></article>)}</div></section>
 <section className="keepsake-ending"><h2>{t('우리 책장의 첫 장을 열어볼까요?','Shall we start our shelf?')}</h2><p>{t('오늘은 내가 먼저. 다음 장은 함께.','Start with your memory. Add theirs next.')}</p>{cta}<small>{t('개인·공유 책장 선택 · 초대로 함께 보관 · JPG 다운로드','Personal or shared shelf · Join by invitation · JPG download')}</small></section><footer className="keepsake-footer"><span>memonestia · {t('함께한 날들을 쌓는 곳','A place for our days')}</span><Link href={`/?lang=${locale}&home=1`}>{t('우리 책장 열기 →','Open our shelf →')}</Link></footer></main>;
}
