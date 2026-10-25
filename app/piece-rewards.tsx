"use client";
import {useCrewText,useCrewLocale} from './crew-locale';
import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { Award, Check, ChevronDown, Download, Gift, LockKeyhole, Sparkles } from 'lucide-react';
import { api } from '@/lib/client-api';
import { growthStage, REWARDS, REWARD_KINDS, type RewardKind, type RewardState } from '@/lib/piece-rewards';
import { RewardFriend } from './reward-friend';
import './piece-rewards.css';

const kinds = Object.keys(REWARD_KINDS) as RewardKind[];
export default function PieceRewards({ group, name, refreshKey }: { group: string | null; name: string; refreshKey?: string }) {
 const ct=useCrewText();
 const locale=useCrewLocale();
  const [data, setData] = useState<RewardState | null>(null);
  const [kind, setKind] = useState<RewardKind>('character');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  const [month, setMonth] = useState('');
  const [notice, setNotice] = useState('');
  const [exporting, setExporting] = useState(false);
  const preview = useRef<HTMLDivElement>(null);
  const monthId = useId();
  useEffect(() => {
    let active = true;
    api<RewardState>('/api/piece-rewards', { method: 'POST', body: JSON.stringify({ group, action: 'sync' }) })
      .then(result => { if (active) { setData(result); setError(''); } })
      .catch(() => { if (active) setError(ct("보관함을 불러오지 못했어요. 잠시 후 다시 열어 주세요.")); });
    return () => { active = false; };
  }, [group, refreshKey, retry, ct]);

  async function equip(id: string) {
    if (busy) return;
    setBusy(true); setNotice(''); setError('');
    try {
      const result = await api<RewardState>('/api/piece-rewards', { method: 'POST', body: JSON.stringify({ group, action: 'equip', reward: id }) });
      setData(result);
      setNotice(ct("{0} 적용했어요.",ct(REWARDS.find(reward => reward.id === id)?.name??'')));
    } catch {
      setError(ct("적용하지 못했어요. 다시 시도해 주세요."));
    } finally { setBusy(false); }
  }
  const total = data?.total ?? 0;
  const stage = growthStage(total);
  const equipped = data?.equipped ?? {};
  const friend = REWARDS.find(reward => reward.id === equipped.character);
  const badge = REWARDS.find(reward => reward.id === equipped.badge);
  const card = REWARDS.find(reward => reward.id === equipped.card);
  const next = [...REWARDS].sort((a, b) => a.pieces - b.pieces).find(reward => reward.pieces > total);
  const earnedMonths = data?.months.filter(row => row.pieces >= 25) ?? [];
  const selectedMonth = earnedMonths.find(row => row.month === month) ?? earnedMonths[0];
  const currentMonth = data?.months.find(row => row.month === data.month)?.pieces ?? 0;
  const monthLabel = selectedMonth ? new Intl.DateTimeFormat(locale==='ko'?'ko-KR':'en-US',{year:'numeric',month:'long',timeZone:'UTC'}).format(new Date(selectedMonth.month+'-01T00:00:00Z')) : ct("이달의 기록");

  async function download() {
    const svg = preview.current?.querySelector('svg');
    if (!svg || !selectedMonth || !card) return;
    setExporting(true); setError('');
    let imageUrl: string | undefined;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1080; canvas.height = 1350;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('CANVAS_UNAVAILABLE');
      ctx.fillStyle = card.color; ctx.fillRect(0, 0, 1080, 1350);
      ctx.fillStyle = '#fffcf6'; ctx.fillRect(55, 55, 970, 1240);
      ctx.strokeStyle = card.color; ctx.lineWidth = 3; ctx.strokeRect(80, 80, 920, 1190);
      ctx.fillStyle = '#8c7059'; ctx.textAlign = 'center'; ctx.font = '22px sans-serif';
      ctx.fillText('MEMONESTIA · MONTHLY MEMORY', 540, 150);
      ctx.fillStyle = '#49362a'; ctx.font = 'bold 54px sans-serif'; ctx.fillText(monthLabel, 540, 260);
      ctx.font = '32px sans-serif';
      // Fit long crew names without clipping or writing outside the card.
      let title = name;
      while (ctx.measureText(title).width > 820 && title.length > 1) title = title.slice(0, -1);
      ctx.fillText(title === name ? title : `${title}…`, 540, 325);
      const copy = svg.cloneNode(true) as SVGElement;
      copy.setAttribute('width', '600'); copy.setAttribute('height', '600');
      copy.removeAttribute('class'); copy.removeAttribute('style');
      imageUrl = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(copy)], { type: 'image/svg+xml' }));
      const image = new Image();
      image.src = imageUrl;
      await image.decode();
      ctx.drawImage(image, 270, 370, 540, 540);
      ctx.font = 'bold 44px sans-serif'; ctx.fillText(ct("{0}조각의 순간을 간직했어요",selectedMonth.pieces), 540, 1000);
      ctx.font = '26px sans-serif'; ctx.fillStyle = '#8c7059';
      ctx.fillText(friend?ct(friend.name):ct("우리의 추억 친구"), 540, 1060);
      ctx.fillText(ct("함께 모아서 더 소중한, 우리들의 한 달"), 540, 1165);
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('EXPORT_FAILED');
      const fileUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = fileUrl; a.download = `memonestia-${selectedMonth.month}.png`;
      document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(fileUrl), 60000);
      setNotice(ct("기념 카드 다운로드를 시작했어요."));
    } catch { setError(ct("카드를 저장하지 못했어요. 다시 시도해 주세요.")); }
    finally { if (imageUrl) URL.revokeObjectURL(imageUrl); setExporting(false); }
  }

  return <section className={'piece-rewards-root'} aria-label={ct("조각 보상 보관함")}>
    <div className={'piece-rewards-hero'}>
      <div className={'piece-rewards-portrait'}><RewardFriend character={equipped.character} outfit={equipped.outfit} egg={!friend} level={stage.level}/></div>
      <div className={'piece-rewards-heroText'}>
        <span className={'piece-rewards-eyebrow'}><Sparkles size={12} aria-hidden="true"/>  {ct("조각과 함께 자라는 친구")}</span>
        <h3>{data ? friend?ct(friend.name):ct("첫 친구를 기다려요") : ct("추억 친구를 불러오는 중")}</h3>
        <p>{data ? ct(stage.label) : ct("모아둔 조각을 확인하고 있어요.")}</p>
        {data && <span className={'piece-rewards-badge'}><Award size={12} aria-hidden="true"/>{badge?ct(badge.name):ct("첫 조각부터 시작해요")} · {ct("누적 {0}조각",total)}</span>}
      </div>
    </div>
    {data && <div className={'piece-rewards-next'}>
      <span>{next ? <b>{ct("{0}조각 더 모으면 ‘{1}’",next.pieces-total,ct(next.name))}</b> : ct("24가지 보상을 모두 모았어요!")}</span>
      <span>{data.unlocked.length} / {REWARDS.length}</span>
      <progress max={next?.pieces ?? Math.max(1, total)} value={total} aria-label={ct("다음 보상까지 누적 조각")}/>
    </div>}
    <details className={'piece-rewards-collection'}>
      <summary><span><Gift size={17} aria-hidden="true"/>{ct("보상 보관함")} <small>{ct("친구 · 소품 · 배지 · 카드")}</small></span><ChevronDown size={17} aria-hidden="true"/></summary>
      <p className={'piece-rewards-intro'}>{ct("이 공간에서 모은 조각으로 하나씩 열어요. 받은 보상은 다음 달에도 남고, 여기서 친구와 의상을 고르고 앨범 표지와 스티커에 사용할 수 있어요.")}</p>
      <div className="piece-rewards-use">
        <b>{ct("모은 보상, 앨범에서도 써보세요")}</b>
        <p>{ct("꾸민 앨범의 표지에 친구를 붙이고, 앨범 쪽지에는 말풍선 스티커로 마음을 전할 수 있어요.")}</p>
        <Link href={`/?lang=${locale}&home=1&group=${encodeURIComponent(group ?? 'personal')}#feed-albums`}>{ct("꾸밀 앨범 고르기 →")}</Link>
      </div>
      <div className={'piece-rewards-tabs'} role="group" aria-label={ct("보상 종류")}>
        {kinds.map(value => <button key={value} type="button" aria-pressed={kind === value} onClick={() => setKind(value)}>{ct(REWARD_KINDS[value])} <small>{data ? REWARDS.filter(reward => reward.kind === value && data.unlocked.includes(reward.id)).length : 0}/6</small></button>)}
      </div>
      <div className={'piece-rewards-grid'} aria-busy={busy || !data}>
        {REWARDS.filter(reward => reward.kind === kind).map(reward => {
          const unlocked = data?.unlocked.includes(reward.id);
          const selected = equipped[reward.kind] === reward.id;
          return <article key={reward.id} className={`${'piece-rewards-item'} ${selected ? 'piece-rewards-selected' : ''}`}>
            <div className={'piece-rewards-art'} style={{ background: `${reward.color}45` }}>
              {kind === 'character' ? <RewardFriend character={reward.id}/>
                : kind === 'outfit' ? <RewardFriend character={equipped.character} outfit={reward.id}/>
                : kind === 'badge' ? <div className={'piece-rewards-medal'} style={{ background: reward.color }}><Award size={32}/><small>{reward.pieces}</small></div>
                : <div className={'piece-rewards-miniCard'} style={{ borderColor: reward.color }}><span>MEMORIES</span><RewardFriend character={equipped.character}/><b>{ct(reward.name)}</b></div>}
              {!unlocked && <span className={'piece-rewards-lock'}><LockKeyhole size={12} aria-hidden="true"/>{ct("{0}조각",reward.pieces)}</span>}
            </div>
            <h4>{ct(reward.name)}</h4><p>{ct(reward.description)}</p>
            <button type="button" disabled={!unlocked || busy || selected} onClick={() => equip(reward.id)} aria-label={`${ct(reward.name)} ${selected ? ct("적용 중") : unlocked ? ct("적용하기") : ct("잠김")}`}>
              {selected ? <><Check size={13} aria-hidden="true"/>{ct("적용 중")}</> : unlocked ? ct("적용하기") : data ? ct("{0}조각 남음",Math.max(0, reward.pieces - total)) : ct("확인 중")}
            </button>
          </article>;
        })}
      </div>
      {kind === 'card' && <div className={'piece-rewards-cardSection'}>
        <h4>{ct("한 달을 담은 기념 카드")}</h4>
        <p>{ct("월 25조각을 모으면 그달의 카드를 PNG로 간직할 수 있어요.")}</p>
        {selectedMonth && card ? <>
          <label htmlFor={monthId}>{ct("기념할 달")}</label>
          <select id={monthId} value={selectedMonth.month} onChange={event => setMonth(event.target.value)}>
            {earnedMonths.map(row => <option key={row.month} value={row.month}>{ct("{0} · {1}조각 달성",row.month,row.pieces)}</option>)}
          </select>
          <div ref={preview} className={'piece-rewards-postcard'} style={{ borderColor: card.color }}>
            <span>MEMONESTIA · MONTHLY MEMORY</span><h4>{monthLabel}</h4><p>{name}</p>
            <RewardFriend character={equipped.character} outfit={equipped.outfit} level={stage.level}/>
            <strong>{ct("{0}조각의 순간을 간직했어요",selectedMonth.pieces)}</strong><small>{ct("함께 모아서 더 소중한, 우리들의 한 달")}</small>
          </div>
          <button type="button" className={'piece-rewards-download'} disabled={exporting || busy} onClick={download}><Download size={16} aria-hidden="true"/>{exporting ? ct("카드 만드는 중…") : ct("기념 카드 저장하기")}</button>
        </> : <div className={'piece-rewards-empty'}><LockKeyhole size={20}/><span>{ct("이달에 {0}조각 더 모으면 첫 기념 카드가 열려요.",Math.max(0,25-currentMonth))}</span></div>}
      </div>}
      <details className={'piece-rewards-rules'}><summary>{ct("보상은 어떻게 모으나요?")}</summary>
        <p>{ct("사진·영상 1개가 1조각이에요. 내게 보이는 업로드를 월별로 확인하고, 각 달에 확인된 가장 많은 조각 수를 합산해 보상을 열어요. 댓글이나 같은 사진을 기록에 다시 연결하는 것은 추가 조각이 아니에요.")}</p>
        <p>{ct("크루 설정의 보관함을 불러올 때 달성 기록이 저장돼요. 저장된 보상은 사진을 삭제하거나 달이 바뀌어도 사라지지 않아요. 보관함은 계정과 공간별로 따로 모으며, 친구와 의상 선택은 나만의 설정이며, 앨범에 붙인 표지와 스티커는 멤버에게도 보여요.")}</p>
        <p>{ct("보상 달력은 한국 시간 기준이에요. 25조각은 월간 기념 카드 목표이며, 친구·소품·배지·카드는 누적 조각으로 계속 모을 수 있어요. 접속하지 않는 날이 있어도 괜찮아요.")}</p>
      </details>
    </details>
    {notice && <p className={'piece-rewards-notice'} role="status">{notice}</p>}
    {error && <p className={'piece-rewards-error'} role="alert">{error} <button type="button" onClick={() => setRetry(value => value + 1)}>{ct("다시 불러오기")}</button></p>}
  </section>;
}
