'use client';
import { useCallback, useEffect, useRef } from 'react';
import { trackClient } from './growth-client';
import type { ClientGrowthEvent } from './growth-events';

export function useAlbumFunnel(templateId?: string) {
  const attempt = useRef(''), sent = useRef(new Set<string>());
  const metadata = useCallback(() => {
    if (!templateId) return undefined;
    if (!attempt.current) attempt.current = crypto.randomUUID();
    return { attempt_id: attempt.current, template_id: templateId };
  }, [templateId]);
  const measure = useCallback((event: ClientGrowthEvent, properties: Record<string, unknown> = {}) => {
    const data = metadata();
    if (!data) return;
    const repeatable = event === 'album_save_failed' || event === 'album_photo_failed';
    if (!repeatable && sent.current.has(event)) return;
    sent.current.add(event);
    void trackClient(event, { ...data, ...properties });
  }, [metadata]);
  useEffect(() => { measure('album_maker_viewed'); }, [measure]);
  return { measure, metadata };
}
