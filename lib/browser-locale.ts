import type { Locale } from '../app/i18n';
import { isLocale, languageCookieName } from './locale';

export function savedBrowserLocale(): Locale | undefined {
  // Cookies let the server render the chosen language on the next visit.
  try {
    const cookie = document.cookie.split(';').map(part => part.trim())
      .find(part => part.startsWith(`${languageCookieName}=`))?.split('=')[1];
    if (isLocale(cookie)) return cookie;
  } catch { /* Storage restrictions must not prevent language detection. */ }
  try {
    const saved = localStorage.getItem(languageCookieName);
    if (isLocale(saved)) return saved;
  } catch { /* A stored preference is optional. */ }
}

export function saveBrowserLocale(locale: Locale) {
  try { localStorage.setItem(languageCookieName, locale); } catch { /* Cookie storage can still work. */ }
  try {
    document.cookie = `${languageCookieName}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax${window.location.protocol === 'https:' ? '; Secure' : ''}`;
  } catch { /* The in-memory selection still works when storage is blocked. */ }
}
