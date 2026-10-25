'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import MemoryStudio from '@/app/memory-studio';
import MemoryStart from '@/app/memory-start';
import { makerTemplate, isPhotoRequestEntry } from '@/lib/album-campaigns';
import TripStoryStart from '@/app/trip-story';
import { api, initializeSession } from '@/lib/client-api';
import { trackGaEvent } from '@/lib/auth-analytics';

export default function MemoryMaker() {
  const params = useSearchParams(), router = useRouter();
  const templateId = params.get('template'), occasion = params.get('occasion'), themes = params.get('themes') === '1';
  const collecting = isPhotoRequestEntry(templateId, occasion, themes, params.get('mode'));
  const template = useMemo(() => themes ? undefined : makerTemplate(templateId, occasion), [templateId, occasion, themes]);
  const [guest, setGuest] = useState(true);
  useEffect(() => { if (template && !collecting) void trackGaEvent('template_selected', { template_id: template.id }); }, [template, collecting]);
  async function beforeSave() {
    await initializeSession();
    const workspace = await api<{account: unknown}>('/api/workspace');
    setGuest(!workspace.account);
    return true;
  }
  if (collecting) return <main className="memory-make-shell"><Link className="memory-make-back" href="/?lang=ko&home=1">← 피드 홈으로</Link><TripStoryStart/></main>;
  return <main className="memory-make-shell"><Link className="memory-make-back" href={template?'/make?themes=1':'/?lang=ko&home=1'}>{template?'← 다른 앨범 둘러보기':'← 피드 홈으로'}</Link>
    {template ? <MemoryStudio key={`${template.id}:${occasion || ''}`} ko guest={guest} albums={[]} photos={[]} starter={template} beforeSave={beforeSave} onClose={() => router.push('/make?themes=1')} onConnect={id => router.push(`/?lang=ko&login=1&returnTo=${encodeURIComponent(id?`/?lang=ko&home=1&group=personal&album=${encodeURIComponent(id)}`:'/?lang=ko&home=1')}`)} onSaved={id => router.push(`/?lang=ko&home=1&group=personal&album=${encodeURIComponent(id)}`)}/> : <MemoryStart/>}
  </main>;
}
