import BrandMark from './brand-mark';
export default function WorkspaceLoading({ ko = false }: { ko?: boolean }) {
  return <section className="workspace-loading" role="status" aria-live="polite" aria-busy="true"><div className="loading-greeting"><span className="loading-brand"><BrandMark/></span><div><strong>{ko ? '추억을 펼치고 있어요' : 'Opening your memories'}</strong><p>{ko ? '앨범과 사진을 불러오는 중이에요.' : 'Gathering your albums and photos.'}</p></div></div><div className="skeleton-heading" aria-hidden="true"/><div className="skeleton-shelf" aria-hidden="true">{[0,1,2,3].map(i=><div className="skeleton-album" key={i}><div/><span/><small/></div>)}</div><span className="loading-caption">{ko ? '잠시만 기다려 주세요.' : 'Just a little moment.'}</span></section>;
}
