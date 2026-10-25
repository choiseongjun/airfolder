'use client';
import {useEffect,useEffectEvent} from 'react';

// A one-time, in-memory handoff. No photo bytes go to storage or the server.
let pending: File | null = null;
export function keepIntroPhoto(file: File) { pending = file; }
export function useIntroPhoto(receive: (file: File) => void, enabled = true) {
 const deliver = useEffectEvent(receive);
 useEffect(() => {
  if (!enabled) return;
  const timer = setTimeout(() => {
   const file = pending;
   pending = null;
   if (file) deliver(file);
  }, 0);
  return () => clearTimeout(timer);
 }, [enabled]);
}
