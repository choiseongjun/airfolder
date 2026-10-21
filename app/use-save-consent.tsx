'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/client-api';
import PolicyGate from './policy-gate';

/** Ask only when the user chooses to write to the server, not on editor entry. */
export function useSaveConsent(ko: boolean) {
  const [open, setOpen] = useState(false);
  const pending = useRef<((allowed: boolean) => void) | null>(null);
  const finish = useCallback((allowed: boolean) => {
    setOpen(false); pending.current?.(allowed); pending.current = null;
  }, []);
  const accept = useCallback(() => finish(true), [finish]);
  const cancel = useCallback(() => finish(false), [finish]);
  useEffect(() => () => { pending.current?.(false); }, []);
  const beforeSave = async () => {
    const policy = await api<{accepted: boolean}>('/api/policy');
    if (policy.accepted) return true;
    return new Promise<boolean>(resolve => { pending.current = resolve; setOpen(true); });
  };
  return { beforeSave, consentGate: open ? <PolicyGate ko={ko} onAccepted={accept} onCancel={cancel}/> : null };
}
