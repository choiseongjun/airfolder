'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import MemoryStudio from '@/app/memory-studio';
import MemoryStart from '@/app/memory-start';
import { makerTemplate, isPhotoRequestEntry } from '@/lib/album-campaigns';
import {CrewLocaleProvider} from '@/app/crew-locale';
import type {Locale} from '@/app/i18n';
import TripStoryStart from '@/app/trip-story';
import MemoryIntro from '@/app/memory-intro';
import { api, initializeSession } from '@/lib/client-api';
import { trackGaEvent } from '@/lib/auth-analytics';

export default function MemoryMaker({locale}:{locale:Locale}) {
  const ko=locale==='ko';
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
  if (!themes && params.get('stage') !== 'create' && params.get('mode') !== 'decorate') return <MemoryIntro key={`${templateId}:${occasion}`} locale={locale} onStart={() => {const next=new URLSearchParams(params.toString());next.set('stage','create');router.push(`/make?${next}`);}}/>;
  if (collecting) return <CrewLocaleProvider locale={locale}><main className="memory-make-shell"><Link className="memory-make-back" href={`/?lang=${locale}&home=1`}>{ko?'← 피드 홈으로':'← Back to feed'}</Link><TripStoryStart/></main></CrewLocaleProvider>;
  return <CrewLocaleProvider locale={locale}><main className="memory-make-shell"><Link className="memory-make-back" href={template?`/make?themes=1&lang=${locale}`:`/?lang=${locale}&home=1`}>{template?(ko?'← 다른 앨범 둘러보기':'← Browse other albums'):(ko?'← 피드 홈으로':'← Back to feed')}</Link>
    {template ? <MemoryStudio key={`${template.id}:${occasion || ''}`} ko={ko} guest={guest} albums={[]} photos={[]} starter={template} beforeSave={beforeSave} onClose={() => router.push(`/make?themes=1&lang=${locale}`)} onConnect={id => router.push(`/?lang=${locale}&login=1&returnTo=${encodeURIComponent(id?`/?lang=${locale}&home=1&group=personal&album=${encodeURIComponent(id)}`:`/?lang=${locale}&home=1`)}`)} onSaved={id => router.push(`/?lang=${locale}&home=1&group=personal&album=${encodeURIComponent(id)}`)}/> : <MemoryStart/>}
  </main></CrewLocaleProvider>;
}
