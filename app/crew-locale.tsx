'use client';
import { createContext, useContext, useEffect, useCallback, type ReactNode } from 'react';
import type { Locale } from './i18n';
import {crewText} from '@/lib/crew-copy';

const CrewLocale = createContext<Locale>('ko');
export function CrewLocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  useEffect(() => { document.documentElement.lang = locale; }, [locale]);
  return <CrewLocale.Provider value={locale}>{children}</CrewLocale.Provider>;
}
export function useCrewLocale() { return useContext(CrewLocale); }
export function useCrewText() { const locale=useCrewLocale();return useCallback((key:string,...values:(string|number)[])=>crewText(locale,key,...values),[locale]); }
