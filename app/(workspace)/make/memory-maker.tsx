'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import MemoryStudio from '@/app/memory-studio';
import MemoryStart from '@/app/memory-start';
import PolicyGate from '@/app/policy-gate';
import { memoryTemplate } from '@/lib/memory-templates';
import { api, initializeSession } from '@/lib/client-api';
import { trackGaEvent } from '@/lib/auth-analytics';

export default function MemoryMaker() {
  const params = useSearchParams(), router = useRouter(), template = memoryTemplate(params.get('template'));
  const [consent, setConsent] = useState(false);
  const [guest, setGuest] = useState(true);
  const pending = useRef<((allowed: boolean) => void) | null>(null);
  const finishConsent = useCallback((allowed: boolean) => { setConsent(false); pending.current?.(allowed); pending.current = null; }, []);
  const accept = useCallback(() => finishConsent(true), [finishConsent]);
  useEffect(() => { if (template) void trackGaEvent('template_selected', { template_id: template.id }); }, [template]);
  useEffect(() => () => { pending.current?.(false); }, []);
  async function beforeSave() {
    await initializeSession();
    const [policy, workspace] = await Promise.all([api<{accepted: boolean}>('/api/policy'), api<{account: unknown}>('/api/workspace')]);
    setGuest(!workspace.account);
    if (policy.accepted) return true;
    return new Promise<boolean>(resolve => { pending.current = resolve; setConsent(true); });
  }
  return <main className="memory-make-shell"><Link className="memory-make-back" href="/make">← 카드 다시 고르기</Link>
    {template ? <MemoryStudio key={template.id} ko guest={guest} albums={[]} photos={[]} starter={template} beforeSave={beforeSave} onClose={() => router.push('/make')} onConnect={() => router.push('/?lang=ko&login=1')} onSaved={id => router.push(`/?lang=ko&home=1&album=${encodeURIComponent(id)}`)}/> : <MemoryStart/>}
    {consent && <PolicyGate ko onAccepted={accept} onCancel={() => finishConsent(false)}/>}
  </main>;
}
