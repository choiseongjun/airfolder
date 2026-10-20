import './memory-loading.css';

export default function MemoryLoading({ compact = false, ko = true }: { compact?: boolean; ko?: boolean }) {
  return <div className={`memory-loading${compact ? ' memory-loading--compact' : ''}`} role="status" aria-busy="true" aria-label={ko ? '사진과 이야기를 준비하고 있어요' : 'Preparing your photos and stories'}>
    <div className="memory-loading__photos" aria-hidden="true">
      {[0, 1, 2].map(index => <span className="memory-loading__photo" key={index}><span className="memory-loading__landscape"/><span className="memory-loading__line"/></span>)}
      <span className="memory-loading__spark">✦</span>
    </div>
    <p className="memory-loading__title" aria-hidden="true">{ko ? '한 장 한 장, 소중한 순간' : 'Little moments, lasting memories'}</p>
    <span className="memory-loading__dots" aria-hidden="true"><i/><i/><i/></span>
    {!compact && <div className="memory-loading__preview" aria-hidden="true">
      <div className="memory-loading__preview-heading"><span/><span/></div>
      <div className="memory-loading__preview-photo"/>
      <div className="memory-loading__preview-line"/>
    </div>}
  </div>;
}
