'use client';
import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { trackClient } from '@/lib/growth-client';
export default function HostActions({ locale, secondary = false }: { locale: string; secondary?: boolean }) {
  const viewed = useRef(false);
  useEffect(() => { if (!secondary && !viewed.current) { viewed.current = true; void trackClient('organizer_landing_view', { source: 'organizer', locale }); } }, [locale, secondary]);
  return <Link className="hosts-cta" href={`/start?lang=${locale}`} onClick={() => void trackClient('organizer_cta_clicked', { source: 'organizer', locale })}>{locale === 'ko' ? '모임 앨범 만들기' : 'Create your group album'}<ArrowUpRight size={19} /></Link>;
}
