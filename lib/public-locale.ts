export const publicLocales = ['ko', 'en', 'en-ph', 'id'] as const;
export type PublicLocale = (typeof publicLocales)[number];
export const publicLanguageCookie = 'memonestia-public-language';
export const publicLocaleTags = { ko: 'ko', en: 'en', 'en-ph': 'en-PH', id: 'id-ID' } as const;
export function isPublicLocale(value: unknown): value is PublicLocale {
  return typeof value === 'string' && (publicLocales as readonly string[]).includes(value);
}

export function resolvePublicLocale({ linked, saved, headers }: {
  linked?: unknown; saved?: unknown; headers: Pick<Headers, 'get'>;
}): PublicLocale {
  if (isPublicLocale(linked)) return linked;
  if (isPublicLocale(saved)) return saved;
  for (const name of ['x-vercel-ip-country', 'cf-ipcountry']) {
    const country = headers.get(name)?.trim().toUpperCase();
    if (!country || !/^[A-Z]{2}$/.test(country) || ['XX', 'ZZ'].includes(country)) continue;
    return country === 'KR' ? 'ko' : country === 'PH' ? 'en-ph' : country === 'ID' ? 'id' : 'en';
  }
  const ranked = (headers.get('accept-language') ?? '').split(',').map((item, index) => {
    const [language, ...params] = item.trim().toLowerCase().split(';');
    const quality = params.map(part => part.trim()).find(part => /^q\s*=/.test(part));
    const raw = quality?.split('=')[1]?.trim();
    const weight = raw === undefined ? 1 : /^(?:0(?:\.\d{0,3})?|1(?:\.0{0,3})?)$/.test(raw) ? Number(raw) : 0;
    return { language, weight, index };
  }).filter(item => item.weight > 0).sort((a, b) => b.weight - a.weight || a.index - b.index);
  for (const { language } of ranked) {
    if (language === 'en-ph' || /^(fil|tl)(-|$)/.test(language)) return 'en-ph';
    const base = language.split('-')[0];
    if (base === 'id' || base === 'ko' || base === 'en') return base;
  }
  return 'en';
}
