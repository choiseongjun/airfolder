"use client";
import { useEffect, useId, useRef, useState, type PointerEvent } from 'react';
import Link from 'next/link';
import { ChevronDown, Gift, Sticker, Trash2 } from 'lucide-react';
import { crewText } from '@/lib/crew-copy';
import { api } from '@/lib/client-api';
import { REWARDS } from '@/lib/piece-rewards';
import { REWARD_PHRASES, STUDIO_STICKERS, STUDIO_STICKER_COPY, nextStickerPosition, type AlbumRewardData, type RewardDecoration, type RewardPhrase, type StudioSticker } from '@/lib/reward-decoration';
import { RewardFriend } from './reward-friend';
import './reward-decoration.css';

export function DecorationArt({ value, ko }: { value: RewardDecoration; ko: boolean }) {
  const ct = (key: string) => crewText(ko ? 'ko' : 'en', key);
  const name = value.character ? ct(REWARDS.find(reward => reward.id === value.character)?.name ?? value.character) : (ko ? '앨범 스티커' : 'Album stickers');
  return <div className="reward-decoration-art" role="img" aria-label={`${name}${value.phrase ? ` · ${REWARD_PHRASES[value.phrase][ko ? 'ko' : 'en']}` : ''}`}>
    {value.phrase && <span className="reward-decoration-bubble">{REWARD_PHRASES[value.phrase][ko ? 'ko' : 'en']}</span>}
    {value.character ? <RewardFriend character={value.character} outfit={value.outfit}/> : <span className="reward-decoration-sticker-art">{value.stickers?.slice(0, 4).map(item => STUDIO_STICKERS.find(sticker => sticker.id === item.sticker)?.emoji).join(' ') || '✨'}</span>}
  </div>;
}
function useAlbumRewards(folderId: string) {
  const [data, setData] = useState<AlbumRewardData | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    api<AlbumRewardData>(`/api/album-rewards?folderId=${encodeURIComponent(folderId)}`)
      .then(result => { if (active) { setData(result); setError(false); } })
      .catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [folderId, retry]);
  return { data, setData, error, retry: () => setRetry(value => value + 1) };
}
function defaultDecoration(data: AlbumRewardData): RewardDecoration | null {
  const character = data.equipped.character ?? REWARDS.find(reward => reward.kind === 'character' && data.unlocked.includes(reward.id))?.id;
  return character ? { character, ...(data.equipped.outfit ? { outfit: data.equipped.outfit } : {}) } : null;
}
function Choices({ data, value, onChange, ko, phrases, disabled }: {
  data: AlbumRewardData; value: RewardDecoration; onChange: (value: RewardDecoration) => void; ko: boolean; phrases?: boolean; disabled?: boolean;
}) {
  const id = useId();
  const ct = (key: string) => crewText(ko ? 'ko' : 'en', key);
  return <div className="reward-decoration-choices">
    <label htmlFor={`${id}-friend`}>{ko ? '캐릭터' : 'Character'}</label>
    <select id={`${id}-friend`} value={value.character} disabled={disabled} onChange={event => onChange({ ...value, character: event.target.value })}>
      {REWARDS.filter(reward => reward.kind === 'character' && data.unlocked.includes(reward.id)).map(reward => <option key={reward.id} value={reward.id}>{ct(reward.name)}</option>)}
    </select>
    <label htmlFor={`${id}-outfit`}>{ko ? '소품·의상' : 'Accessory'}</label>
    <select id={`${id}-outfit`} value={value.outfit ?? ''} disabled={disabled} onChange={event => onChange({ ...value, outfit: event.target.value || undefined })}>
      <option value="">{ko ? '소품 없이' : 'No accessory'}</option>
      {REWARDS.filter(reward => reward.kind === 'outfit' && data.unlocked.includes(reward.id)).map(reward => <option key={reward.id} value={reward.id}>{ct(reward.name)}</option>)}
    </select>
    {phrases && <><label htmlFor={`${id}-phrase`}>{ko ? '말풍선' : 'Message'}</label><select id={`${id}-phrase`} value={value.phrase ?? 'thanks'} disabled={disabled} onChange={event => onChange({ ...value, phrase: event.target.value as RewardPhrase })}>
      {Object.entries(REWARD_PHRASES).map(([key, label]) => <option key={key} value={key}>{label[ko ? 'ko' : 'en']}</option>)}
    </select></>}
  </div>;
}
function CollectionLink({ data, ko }: { data: AlbumRewardData; ko: boolean }) {
  return <p className="reward-decoration-empty">{ko ? '이 공간에서 5조각을 모으면 첫 캐릭터가 열려요. 크루 설정의 보관함에서 보상을 받은 뒤 사용해 보세요.' : 'Collect 5 pieces in this space to meet your first friend. Open your crew settings collection to claim your rewards.'}<Link href={`/crew/settings?group=${encodeURIComponent(data.group ?? 'personal')}&lang=${ko ? 'ko' : 'en'}#crew-rewards`}>{ko ? '크루 설정 보상 보관함으로' : 'Open reward collection'} →</Link></p>;
}
type CoverProps = { folderId: string; ko: boolean; owner: boolean; initiallyOpen?: boolean; photoSrc?: string };
export function AlbumRewardCover(props: CoverProps) {
  return <AlbumRewardCoverEditor key={props.folderId} {...props}/>;
}
function AlbumRewardCoverEditor({ folderId, ko, owner, initiallyOpen = false, photoSrc }: CoverProps) {
  const ct = (key: string) => crewText(ko ? 'ko' : 'en', key);
  const { data, setData, error: loadError, retry } = useAlbumRewards(folderId);
  const [draft, setDraft] = useState<RewardDecoration | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);
  const [stickerDraft, setStickerDraft] = useState<StudioSticker[] | null>(null);
  const [selectedSticker, setSelectedSticker] = useState<string | null>(null);
  const [stickerCategory, setStickerCategory] = useState<'jokes' | 'cafe' | 'roast'>('jokes');
  const stageRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<string | null>(null);
  const stickers = stickerDraft ?? data?.cover?.stickers ?? [];
  const choice = draft ?? (data?.cover?.character ? defaultDecoration(data) : null);
  async function save(value: RewardDecoration | null) {
    setBusy(true); setMessage(''); setFailed(false);
    try {
      const result = await api<{ cover: RewardDecoration | null }>('/api/album-rewards', { method: 'PUT', body: JSON.stringify({ folderId, decoration: value }) });
      setData(previous => previous ? { ...previous, cover: result.cover } : previous);
      setStickerDraft(null);
      setMessage(ko ? (value ? '앨범 표지에 붙였어요. 멤버들도 같은 모습으로 볼 수 있어요.' : '표지 장식을 뗐어요. 보상은 보관함에 남아 있어요.') : (value ? 'Added to the cover for all album members.' : 'Removed from the cover. Your reward is still in your collection.'));
    } catch { setFailed(true); setMessage(ko ? '저장하지 못했어요. 권한과 보상 해금 상태를 확인해 주세요.' : 'Could not save. Check your permissions and unlocked rewards.'); }
    finally { setBusy(false); }
  }
  function addSticker(id: StudioSticker['sticker']) {
    if (stickers.length >= 12) return;
    const item: StudioSticker = { id: crypto.randomUUID(), sticker: id, kind: STUDIO_STICKERS.find(sticker => sticker.id === id)!.kind, ...nextStickerPosition(stickers), size: 32, rotation: 0 };
    setStickerDraft([...stickers, item]); setSelectedSticker(item.id);
  }
  function moveSticker(event: PointerEvent<HTMLDivElement>) {
    const moving = dragging.current, bounds = stageRef.current?.getBoundingClientRect();
    if (!moving || !bounds) return;
    const x = Math.max(5, Math.min(95, (event.clientX - bounds.left) / bounds.width * 100));
    const y = Math.max(5, Math.min(95, (event.clientY - bounds.top) / bounds.height * 100));
    setStickerDraft(stickers.map(item => item.id === moving ? { ...item, x, y } : item));
  }
  async function saveStickers() {
    const character = choice?.character ?? data?.cover?.character;
    const outfit = character ? choice?.outfit ?? data?.cover?.outfit : undefined;
    const value = stickers.length ? { ...(character ? { character } : {}), ...(outfit ? { outfit } : {}), stickers } : character ? { character, ...(outfit ? { outfit } : {}) } : null;
    await save(value);
  }
  if (loadError) return <div className="reward-cover"><p role="alert">{ko ? '표지 장식을 불러오지 못했어요.' : 'Could not load the cover decoration.'} <button type="button" onClick={retry}>{ko ? '다시 시도' : 'Retry'}</button></p></div>;
  return <div className="reward-cover">
    {data?.cover?.stickers?.length ? <div className="reward-cover-keepsake reward-cover-saved-scene" aria-label={ko ? '저장된 앨범 꾸미기' : 'Saved album decorations'}>
      {photoSrc ? <img className="reward-cover-saved-photo" src={photoSrc} alt=""/> : <div className="reward-cover-saved-empty">{ko ? '사진 위에 붙인 우리 스티커' : 'Our stickers on this album'}</div>}
      {data.cover.stickers.map(item => { const art = STUDIO_STICKERS.find(sticker => sticker.id === item.sticker)!; const copy = STUDIO_STICKER_COPY[item.sticker]; const bubble = item.sticker.startsWith('bubble-'); return <span key={item.id} className={`reward-cover-saved-sticker${bubble ? ' is-bubble' : ''}`} style={{ left: `${item.x}%`, top: `${item.y}%`, transform: `translate(-50%,-50%) rotate(${item.rotation}deg) scale(${item.size / 48})` }}>{art.emoji}<b>{ct(copy?.title ?? art.name)}</b>{bubble && <small>{ct(copy?.caption ?? '')}</small>}</span>; })}
    </div> : data?.cover && <div className="reward-cover-keepsake"><DecorationArt value={data.cover} ko={ko}/><span>{ko ? '우리의 추억 친구' : 'Our memory friend'}</span></div>}
    {owner && <details className="reward-decoration-tools" open={initiallyOpen}>
      <summary><Gift size={15}/>{ko ? '앨범 표지 꾸미기' : 'Decorate the album cover'}<ChevronDown size={15}/></summary>
      {!data ? <p>{ko ? '보관함을 확인하는 중…' : 'Loading your collection…'}</p> : !data.canEdit ? <p>{ko ? '앨범 주인만 표지를 꾸밀 수 있어요.' : 'Only the album owner can decorate the cover.'}</p> : <>
        <div className="reward-studio">
          <div className="reward-studio-stage" ref={stageRef} onPointerMove={moveSticker} onPointerUp={() => { dragging.current = null; }} onPointerCancel={() => { dragging.current = null; }}>
            {photoSrc ? <img src={photoSrc} alt="" draggable={false}/> : <div className="reward-studio-empty">{ko ? '사진이 모이면 여기에 표지가 보여요' : 'Your album cover will appear here'}</div>}
            {stickers.map(item => { const sticker = STUDIO_STICKERS.find(candidate => candidate.id === item.sticker)!; const copy = STUDIO_STICKER_COPY[item.sticker]; const bubble = item.sticker.startsWith('bubble-'); return <button type="button" key={item.id} aria-label={ko ? `${ct(copy?.title ?? sticker.name)} 스티커 이동` : `Move ${ct(copy?.title ?? sticker.name)} sticker`} aria-pressed={selectedSticker === item.id} className={`reward-studio-sticker${bubble ? ' is-bubble' : ''}${selectedSticker === item.id ? ' is-selected' : ''}`} style={{ left: `${item.x}%`, top: `${item.y}%`, fontSize: `${item.size}px`, transform: `translate(-50%,-50%) rotate(${item.rotation}deg)` }} onPointerDown={event => { event.preventDefault(); dragging.current = item.id; setSelectedSticker(item.id); event.currentTarget.parentElement?.setPointerCapture(event.pointerId); }} onClick={() => setSelectedSticker(item.id)}><span>{sticker.emoji}</span><b>{ct(copy?.title ?? sticker.name)}</b>{bubble && <small>{ct(copy?.caption ?? '')}</small>}</button>; })}
          </div>
          <p className="reward-studio-hint">{ko ? '스티커를 골라 붙이고, 사진 위에서 끌어 원하는 자리에 놓으세요.' : 'Pick a sticker, then drag it to the spot you like.'}</p>
          {stickers.length > 0 && <button type="button" disabled={busy} onClick={() => {
            const arranged: StudioSticker[] = [];
            for (const item of stickers) arranged.push({ ...item, ...nextStickerPosition(arranged), size: 32, rotation: 0 });
            setStickerDraft(arranged);
          }}>{ko ? '가장자리로 가지런히 정돈' : 'Arrange around the edges'}</button>}
          <div className="reward-studio-categories" role="group" aria-label={ko ? '스티커 종류' : 'Sticker categories'}>
            {([{ id: 'jokes', label: '🔥 킹받는 장난' }, { id: 'cafe', label: '📦 카페&디저트' }, { id: 'roast', label: '🗨️ 단톡 팩폭' }] as const).map(category => <button type="button" key={category.id} aria-pressed={stickerCategory === category.id} onClick={() => setStickerCategory(category.id)}>{ct(category.label)}</button>)}
          </div>
          <div className="reward-studio-sticker-grid">{STUDIO_STICKERS.filter(item => STUDIO_STICKER_COPY[item.id]?.category === stickerCategory).map(item => <button type="button" key={item.id} title={ct(item.name)} aria-label={ko ? `${ct(STUDIO_STICKER_COPY[item.id].title)} 스티커 추가` : `Add ${ct(STUDIO_STICKER_COPY[item.id].title)} sticker`} disabled={busy || stickers.length >= 12} onClick={() => addSticker(item.id)}><span>{item.emoji}</span><b>{ct(STUDIO_STICKER_COPY[item.id].title)}</b><small>{ct(STUDIO_STICKER_COPY[item.id].caption)}</small></button>)}</div>
          {selectedSticker && <div className="reward-studio-adjust"><label>{ko ? '크기' : 'Size'}<input type="range" min="24" max="96" value={stickers.find(item => item.id === selectedSticker)?.size ?? 42} onChange={event => setStickerDraft(stickers.map(item => item.id === selectedSticker ? { ...item, size: Number(event.target.value) } : item))}/></label><button type="button" onClick={() => { setStickerDraft(stickers.filter(item => item.id !== selectedSticker)); setSelectedSticker(null); }}>{ko ? '선택 스티커 삭제' : 'Remove sticker'}</button></div>}
          <button type="button" className="reward-decoration-primary" disabled={busy} onClick={() => void saveStickers()}>{busy ? (ko ? '저장 중…' : 'Saving…') : (ko ? '꾸민 표지 저장' : 'Save decorated cover')}</button>
          {stickers.length >= 12 && <p className="reward-studio-limit">{ko ? '스티커는 한 앨범에 12개까지 붙일 수 있어요.' : 'Up to 12 stickers per album.'}</p>}
        </div>
        <p>{ko ? '사진 위에 스티커를 놓고, 보관함의 캐릭터와 의상도 더해요. 저장한 표지는 앨범 멤버 모두에게 보여요.' : 'Place stickers on the photo and add characters from your collection. Every album member sees the saved cover.'}</p>
        {choice ? <>
          <div className="reward-decoration-preview"><DecorationArt value={choice} ko={ko}/></div>
          <Choices data={data} value={choice} onChange={setDraft} ko={ko} disabled={busy}/>
          <button type="button" className="reward-decoration-primary" disabled={busy} onClick={() => save(choice)}>{busy ? (ko ? '저장 중…' : 'Saving…') : (ko ? '앨범 표지에 붙이기' : 'Apply to album cover')}</button>
        </> : <CollectionLink data={data} ko={ko}/>}
        {data.cover && <button type="button" className="reward-decoration-remove" disabled={busy} onClick={() => save(null)}><Trash2 size={13}/>{ko ? '표지에서 떼기' : 'Remove from cover'}</button>}
        {message && <p role={failed ? 'alert' : 'status'}>{message}</p>}
      </>}
    </details>}
  </div>;
}
export function RewardStickerPicker({ folderId, ko, value, onChange, disabled }: {
  folderId: string; ko: boolean; value: RewardDecoration | null; onChange: (value: RewardDecoration | null) => void; disabled: boolean;
}) {
  const { data, error, retry } = useAlbumRewards(folderId);
  const [draft, setDraft] = useState<RewardDecoration | null>(null);
  const fallback = data ? defaultDecoration(data) : null;
  const choice = value ?? draft ?? (fallback ? { ...fallback, phrase: 'thanks' as const } : null);
  return <div className="reward-note-sticker">
    <details className="reward-decoration-tools">
      <summary><Sticker size={15}/>{ko ? '내 캐릭터 스티커 붙이기' : 'Add a character sticker'}<ChevronDown size={15}/></summary>
      {error ? <p role="alert">{ko ? '보관함을 불러오지 못했어요.' : 'Could not load rewards.'}<button type="button" onClick={retry}>{ko ? '다시 시도' : 'Retry'}</button></p>
        : !data ? <p>{ko ? '보관함을 확인하는 중…' : 'Loading your collection…'}</p>
        : choice ? <>
          <p>{ko ? '내가 모은 캐릭터로 마음을 전해요. 남긴 스티커는 앨범 멤버 모두에게 보여요.' : 'Send a little message with an earned friend. All album members can see posted stickers.'}</p>
          <div className="reward-decoration-preview"><DecorationArt value={choice} ko={ko}/></div>
          <Choices data={data} value={choice} ko={ko} phrases disabled={disabled} onChange={next => { setDraft(next); if (value) onChange(next); }}/>
          <button type="button" className="reward-decoration-primary" disabled={disabled} onClick={() => onChange(value ? null : choice)}>{value ? (ko ? '스티커 선택 취소' : 'Remove sticker') : (ko ? '이 스티커 선택' : 'Choose this sticker')}</button>
        </> : <CollectionLink data={data} ko={ko}/>}
    </details>
    {value && <div className="reward-decoration-selected"><DecorationArt value={value} ko={ko}/><span>{ko ? '메시지와 함께 붙일 스티커' : 'Sticker to post with your note'}</span></div>}
  </div>;
}
