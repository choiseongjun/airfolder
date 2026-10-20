"use client";
import { useEffect, useId, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Gift, Sticker, Trash2 } from 'lucide-react';
import { api } from '@/lib/client-api';
import { REWARDS } from '@/lib/piece-rewards';
import { REWARD_PHRASES, type AlbumRewardData, type RewardDecoration, type RewardPhrase } from '@/lib/reward-decoration';
import { RewardFriend } from './reward-friend';
import './reward-decoration.css';

export function DecorationArt({ value, ko }: { value: RewardDecoration; ko: boolean }) {
  const name = REWARDS.find(reward => reward.id === value.character)?.name ?? value.character;
  return <div className="reward-decoration-art" role="img" aria-label={`${name}${value.phrase ? ` · ${REWARD_PHRASES[value.phrase][ko ? 'ko' : 'en']}` : ''}`}>
    {value.phrase && <span className="reward-decoration-bubble">{REWARD_PHRASES[value.phrase][ko ? 'ko' : 'en']}</span>}
    <RewardFriend character={value.character} outfit={value.outfit}/>
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
  return <div className="reward-decoration-choices">
    <label htmlFor={`${id}-friend`}>{ko ? '캐릭터' : 'Character'}</label>
    <select id={`${id}-friend`} value={value.character} disabled={disabled} onChange={event => onChange({ ...value, character: event.target.value })}>
      {REWARDS.filter(reward => reward.kind === 'character' && data.unlocked.includes(reward.id)).map(reward => <option key={reward.id} value={reward.id}>{reward.name}</option>)}
    </select>
    <label htmlFor={`${id}-outfit`}>{ko ? '소품·의상' : 'Accessory'}</label>
    <select id={`${id}-outfit`} value={value.outfit ?? ''} disabled={disabled} onChange={event => onChange({ ...value, outfit: event.target.value || undefined })}>
      <option value="">{ko ? '소품 없이' : 'No accessory'}</option>
      {REWARDS.filter(reward => reward.kind === 'outfit' && data.unlocked.includes(reward.id)).map(reward => <option key={reward.id} value={reward.id}>{reward.name}</option>)}
    </select>
    {phrases && <><label htmlFor={`${id}-phrase`}>{ko ? '말풍선' : 'Message'}</label><select id={`${id}-phrase`} value={value.phrase ?? 'thanks'} disabled={disabled} onChange={event => onChange({ ...value, phrase: event.target.value as RewardPhrase })}>
      {Object.entries(REWARD_PHRASES).map(([key, label]) => <option key={key} value={key}>{label[ko ? 'ko' : 'en']}</option>)}
    </select></>}
  </div>;
}
function CollectionLink({ data, ko }: { data: AlbumRewardData; ko: boolean }) {
  return <p className="reward-decoration-empty">{ko ? '이 공간에서 5조각을 모으면 첫 캐릭터가 열려요. 크루 설정의 보관함에서 보상을 받은 뒤 사용해 보세요.' : 'Collect 5 pieces in this space to meet your first friend. Open your crew settings collection to claim your rewards.'}<Link href={`/crew/settings?group=${encodeURIComponent(data.group ?? 'personal')}#crew-rewards`}>{ko ? '크루 설정 보상 보관함으로' : 'Open reward collection'} →</Link></p>;
}
export function AlbumRewardCover({ folderId, ko, owner }: { folderId: string; ko: boolean; owner: boolean }) {
  const { data, setData, error: loadError, retry } = useAlbumRewards(folderId);
  const [draft, setDraft] = useState<RewardDecoration | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);
  const choice = draft ?? (data ? defaultDecoration(data) : null);
  async function save(value: RewardDecoration | null) {
    setBusy(true); setMessage(''); setFailed(false);
    try {
      const result = await api<{ cover: RewardDecoration | null }>('/api/album-rewards', { method: 'PUT', body: JSON.stringify({ folderId, decoration: value }) });
      setData(previous => previous ? { ...previous, cover: result.cover } : previous);
      setMessage(ko ? (value ? '앨범 표지에 붙였어요. 멤버들도 같은 모습으로 볼 수 있어요.' : '표지 장식을 뗐어요. 보상은 보관함에 남아 있어요.') : (value ? 'Added to the cover for all album members.' : 'Removed from the cover. Your reward is still in your collection.'));
    } catch { setFailed(true); setMessage(ko ? '저장하지 못했어요. 권한과 보상 해금 상태를 확인해 주세요.' : 'Could not save. Check your permissions and unlocked rewards.'); }
    finally { setBusy(false); }
  }
  if (loadError) return <div className="reward-cover"><p role="alert">{ko ? '표지 장식을 불러오지 못했어요.' : 'Could not load the cover decoration.'} <button type="button" onClick={retry}>{ko ? '다시 시도' : 'Retry'}</button></p></div>;
  return <div className="reward-cover">
    {data?.cover && <div className="reward-cover-keepsake"><DecorationArt value={data.cover} ko={ko}/><span>{ko ? '우리의 추억 친구' : 'Our memory friend'}</span></div>}
    {owner && <details className="reward-decoration-tools">
      <summary><Gift size={15}/>{ko ? '모은 보상으로 표지 꾸미기' : 'Decorate with rewards'}<ChevronDown size={15}/></summary>
      {!data ? <p>{ko ? '보관함을 확인하는 중…' : 'Loading your collection…'}</p> : !data.canEdit ? <p>{ko ? '앨범 주인만 표지를 꾸밀 수 있어요.' : 'Only the album owner can decorate the cover.'}</p> : <>
        <p>{ko ? '보관함에서 얻은 캐릭터와 의상을 골라요. 이 표지는 모든 앨범 멤버에게 보여요.' : 'Choose an earned character and accessory. All album members see this cover.'}</p>
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
