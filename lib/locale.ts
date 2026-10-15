import type { Locale } from '../app/i18n';

export const languageCookieName = 'snaproom-language';

export function isLocale(value: unknown): value is Locale {
  return value === 'en' || value === 'ko';
}

export function localeFromCountry(country?: string | null): Locale | undefined {
  const code = country?.trim().toUpperCase();
  // XX (unknown) and T1 (Tor) are Cloudflare's non-country values.
  if (!code || !/^[A-Z]{2}$/.test(code) || code === 'XX' || code === 'ZZ') return;
  return code === 'KR' ? 'ko' : 'en';
}

export function localeFromLanguages(languages: readonly string[]): Locale | undefined {
  for (const language of languages) {
    const base = language.trim().toLowerCase().split('-')[0];
    if (isLocale(base)) return base;
  }
}

export function localeFromAcceptLanguage(value?: string | null): Locale | undefined {
  const ranked = (value ?? '').split(',').map((item, index) => {
    const [language, ...parameters] = item.trim().split(';');
    const quality = parameters.map(part => part.trim()).find(part => /^q\s*=/i.test(part));
    const raw = quality?.split('=')[1]?.trim();
    const weight = raw === undefined ? 1 : /^(?:0(?:\.\d{0,3})?|1(?:\.0{0,3})?)$/.test(raw) ? Number(raw) : 0;
    return { language, weight, index };
  }).filter(item => item.weight > 0).sort((a, b) => b.weight - a.weight || a.index - b.index);
  return localeFromLanguages(ranked.map(item => item.language));
}

export function resolveLocale({ linked, saved, headers }: {
  linked?: unknown;
  saved?: unknown;
  headers: Pick<Headers, 'get'>;
}): Locale {
  if (isLocale(linked)) return linked;
  if (isLocale(saved)) return saved;
  // Use CDN-provided country codes only for presentation, never authorization.
  for (const header of ['x-vercel-ip-country', 'cf-ipcountry']) {
    const locale = localeFromCountry(headers.get(header));
    if (locale) return locale;
  }
  return localeFromAcceptLanguage(headers.get('accept-language')) ?? 'en';
}
