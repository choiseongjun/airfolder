'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import MemoryStudio from '@/app/memory-studio';
import MemoryStart from '@/app/memory-start';
import { memoryTemplate } from '@/lib/memory-templates';
import { api, initializeSession } from '@/lib/client-api';
import { trackGaEvent } from '@/lib/auth-analytics';

export default function MemoryMaker() {
  const params = useSearchParams(), router = useRouter(), template = memoryTemplate(params.get('template'));
  const [guest, setGuest] = useState(true);
  useEffect(() => { if (template) void trackGaEvent('template_selected', { template_id: template.id }); }, [template]);
  async function beforeSave() {
    await initializeSession();
    const workspace = await api<{account: unknown}>('/api/workspace');
    setGuest(!workspace.account);
    return true;
  }
  return <main className="memory-make-shell"><Link className="memory-make-back" href={template?'/make':'/?lang=ko&home=1'}>{template?'← 앨범 · 카드 다시 고르기':'← 피드 홈으로'}</Link>
    {template ? <MemoryStudio key={template.id} ko guest={guest} albums={[]} photos={[]} starter={template} beforeSave={beforeSave} onClose={() => router.push('/make')} onConnect={() => router.push('/?lang=ko&login=1')} onSaved={id => router.push(`/?lang=ko&home=1&album=${encodeURIComponent(id)}`)}/> : <MemoryStart/>}
  </main>;
}
