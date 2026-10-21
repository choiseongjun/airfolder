/* eslint-disable @next/next/no-img-element -- Static, local preview photos. */
import AlbumThemeGallery from './album-theme-gallery';
import Link from 'next/link';
import { memoryTemplates } from '@/lib/memory-templates';
import './memory-start.css';

export default function MemoryStart() {
  return <section className="memory-start" aria-label="앨범과 카드 만들기">
    <AlbumThemeGallery/><details className="memory-card-alternative"><summary>한 장으로 간직하는 네컷 카드 만들기</summary><div className="memory-start-intro"><span>사진첩 속 좋아하는 순간들</span><h1 id="memory-start-title">우리 사진으로,<br/>간직하고 싶은 한 장.</h1><p>마음에 드는 카드를 고르고 내 사진을 넣어보세요.<br/>완성한 뒤에 저장하고, 함께 나눠요.</p></div>
    <div className="memory-start-grid">{memoryTemplates.map((item,index) => <Link href={`/make?template=${item.id}`} className={`memory-start-option memory-start-${item.mood}`} key={item.id} aria-label={`${item.name} — 이 카드로 만들기`}>
      <div className="memory-start-paper"><span className="memory-start-eyebrow">{item.eyebrow}</span><h2>{item.title}</h2><div className="memory-start-photos">{item.photos.map((photo,i)=><div key={`${photo}-${i}`}><img src={`/explore/album-samples/${photo}.jpg`} alt="" loading={index === 0 ? 'eager' : 'lazy'}/><small>{['a little moment','with love','remember this','our happy days'][i]}</small></div>)}</div><p>{item.note}</p><span className="memory-start-credit">memonestia.xyz</span></div>
      <div className="memory-start-caption"><div><strong>{item.name}</strong><p>{item.description}</p></div><span aria-hidden="true">↗</span></div><span className="memory-start-choose">이 카드로 만들기 <span aria-hidden="true">→</span></span>
    </Link>)}</div>
    <p className="memory-start-reassurance">로그인 없이 내 사진으로 만들어볼 수 있어요.</p>
    </details><div className="memory-start-next"><span>한 장을 만든 다음에는</span><p>친구 사진도 같은 앨범에 모으고,<br/>그날의 한마디를 롤링페이퍼로 남겨보세요.</p></div>
  </section>;
}
