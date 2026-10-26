'use client';
import Link from 'next/link';
import { crewTabs, type CrewScreen } from '@/lib/crew-navigation';
import { Icon, StitchIconFont, stitchRoot } from './stitch-kit';
import type { Locale } from './i18n';

export default function CrewNavigation({ locale, screen, screenHref, createHref, onCreate }: {
  locale: Locale; screen?: CrewScreen;
  screenHref: (screen: CrewScreen) => string;
  createHref?: string; onCreate?: () => void;
}) {
  return <nav aria-label={locale === 'ko' ? '주요 메뉴' : 'Main navigation'} className={`${stitchRoot} fixed inset-x-0 bottom-0 z-50 border-t border-[#efdfd5] bg-[#fff8f5]/95 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-xl`}>
    <StitchIconFont/>
    <div className="mx-auto grid min-h-16 w-full max-w-[1200px] grid-cols-5 items-stretch px-2 md:px-8">
      {crewTabs.map(tab => {
        const create = tab.key === 'create';
        const className = `flex flex-col items-center justify-center gap-1 px-1 py-2 text-center text-[10px] md:text-xs ${screen === tab.key || create ? 'font-semibold text-[#99452c]' : 'text-[#78675e]'}`;
        const content = <><Icon name={tab.icon} className={create ? 'rounded-full bg-[#99452c] p-2 text-[24px] text-white' : 'text-[22px]'} /><span>{tab[locale]}</span></>;
        return create && onCreate ? <button key={tab.key} type="button" onClick={onCreate} className={className}>{content}</button> : <Link key={tab.key} href={create ? createHref ?? `/make?lang=${locale}&stage=create` : screenHref(tab.key as CrewScreen)} aria-current={screen === tab.key ? 'page' : undefined} className={className}>{content}</Link>;
      })}
    </div>
  </nav>;
}
