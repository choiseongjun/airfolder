import type { ReactNode } from 'react';
import type { MemoryItem } from './memories';
import { extraAlbumThemes, type ExtraAlbumThemeId } from '@/lib/extra-album-themes';

export function isCollectionTheme(theme:string):theme is ExtraAlbumThemeId {return extraAlbumThemes.some(item=>item.id===theme);}

export function CollectionCover({theme,title,picture,count,ko}:{theme:ExtraAlbumThemeId;title:string;picture:ReactNode;count:number;ko:boolean}){
 const meta=extraAlbumThemes.find(item=>item.id===theme)!;
 return <div className={`ta-collection-cover collection-${theme}`}>
  <span className="ta-collection-kicker">{meta.kicker}</span>
  {theme==='passport'&&<div className="ta-passport-emblem" aria-hidden="true">◎<span>MEMORY REPUBLIC</span></div>}
  {theme==='camp'&&<div className="ta-camp-badge" aria-hidden="true">△<span>TAKE THE SCENIC ROUTE</span></div>}
  {theme==='sports'&&<div className="ta-sports-score"><span>HOME</span><b>{String(count).padStart(2,'0')} : 00</b><span>AWAY</span></div>}
  {theme==='newspaper'&&<div className="ta-paper-edition"><span>VOL. 01</span><span>{ko?'행복한 소식만 전합니다':'ONLY THE GOOD NEWS'}</span><span>★ SPECIAL</span></div>}
  {theme==='parcel'&&<div className="ta-parcel-tape">FRAGILE　♡　FRAGILE　♡</div>}
  {theme==='wedding'&&<div className="ta-vow-monogram" aria-hidden="true">&</div>}
  {theme==='yearbook'&&<div className="ta-yearbook-seal">CLASS<br/><b>OF US</b></div>}
  {theme==='garden'&&<div className="ta-botanical-mark" aria-hidden="true">❧</div>}
  <h2>{title}</h2>
  <div className="ta-collection-picture">{picture}{theme==='blueprint'&&<span className="ta-dimension">← MOMENT 01 →</span>}{theme==='recipe'&&<span className="ta-recipe-seal">100%<br/>{ko?'행복':'JOY'}</span>}</div>
  {theme==='postcard'&&<div className="ta-postcard-address"><span>TO: {ko?'보고 싶은 너에게':'SOMEONE I MISS'}</span><span>FROM: {ko?'이 순간에서':'THIS MOMENT'}</span><b>✉</b></div>}
  {theme==='aquarium'&&<div className="ta-water-bubbles" aria-hidden="true"><i/><i/><i/></div>}
  {theme==='blueprint'&&<div className="ta-blueprint-table"><span>PROJECT 001</span><span>SCALE 1 : ∞</span><span>{count} DRAWINGS</span></div>}
  {theme==='parcel'?<div className="ta-parcel-label"><b>TO: {ko?'미래의 나':'FUTURE ME'}</b><span>{count} {ko?'개의 소중한 순간':'PRECIOUS MOMENTS'}</span><i aria-hidden="true"/></div>:<p className="ta-collection-foot">{String(count).padStart(2,'0')} MEMORIES · {ko?'오래 간직할 이야기':'STORIES TO KEEP'}</p>}
 </div>;
}

export function CollectionSpread({theme,photos,ko,renderPhoto}:{theme:ExtraAlbumThemeId;photos:MemoryItem[];ko:boolean;renderPhoto:(photo:MemoryItem,index:number)=>ReactNode}){
 const meta=extraAlbumThemes.find(item=>item.id===theme)!;
 return <div className={`ta-collection-spread spread-${theme}`}>{photos.map((p,i)=><article key={p.id} className="ta-collection-item">
  <div className="ta-collection-label"><b>{theme==='recipe'?`STEP ${i+1}`:`${meta.chapter} ${String(i+1).padStart(2,'0')}`}</b><small>{p.day?.replaceAll('-','.')}</small></div>
  {renderPhoto(p,i)}
  {theme==='passport'&&<span className="ta-visa-stamp">ARRIVED<br/>♡<br/>MEMORIES</span>}
  {theme==='camp'&&<span className="ta-camp-coordinates">△ FIELD NOTE · {String(i+1).padStart(3,'0')}</span>}
  {theme==='recipe'&&<p className="ta-recipe-ingredients">{ko?'재료: 함께한 시간 + 웃음 한 스푼':'Ingredients: time together + a spoonful of laughter'}</p>}
  {theme==='newspaper'&&<h3>{ko?['웃음이 끊이지 않았던 현장','오늘 가장 기억할 장면','함께라서 더 특별했던 하루'][i%3]:['Laughter fills the scene','The moment of the day','A day made better together'][i%3]}</h3>}
  {theme==='postcard'&&<div className="ta-postcard-back"><span>DEAR YOU,</span><p>{ko?'여기 풍경을 너에게도 보여주고 싶었어.':'I wanted you to see this view, too.'}</p><span>WITH LOVE ♡</span></div>}
  {theme==='wedding'&&<p className="ta-vow-line">{ko?['같은 곳을 바라보기로','작은 순간에도 웃기로','모든 계절을 함께하기로'][i%3]:['To look in the same direction','To smile at the little things','To share every season'][i%3]}</p>}
  {theme==='yearbook'&&<div className="ta-yearbook-signature"><span>{p.author||(ko?'우리의 한 시절':'Our chapter')}</span><small>STAY IN TOUCH ♡</small></div>}
  {theme==='sports'&&<div className="ta-player-stats"><span>JOY <b>99</b></span><span>TEAM <b>100</b></span><span>MEMORY <b>∞</b></span></div>}
  {theme==='garden'&&<div className="ta-specimen-label"><i>Memoria felix</i><span>{ko?'채집 장소: 마음에 남은 곳':'Collected: somewhere in the heart'}</span><span>NO. {String(i+1).padStart(3,'0')}</span></div>}
  {theme==='aquarium'&&<span className="ta-tank-label">○ TANK {i+1} · {ko?'수집한 물결':'COLLECTED WAVES'}</span>}
  {theme==='blueprint'&&<div className="ta-blueprint-table"><span>FIG. {i+1}</span><span>{ko?'행복의 단면도':'SECTION OF JOY'}</span><span>APPROVED ✓</span></div>}
  {theme==='parcel'&&<div className="ta-delivery-status"><span>✓ {ko?'추억 배송 완료':'MEMORY DELIVERED'}</span><small>TRACKING: MEM-{String(i+1).padStart(4,'0')}</small></div>}
 </article>)}</div>;
}
