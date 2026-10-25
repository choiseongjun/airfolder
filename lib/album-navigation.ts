/** Every language uses the same album surface, including anonymous members. */
export function joinedAlbumHref(locale: string, folder?: string, group?: string, view?: 'rolling') {
  const params = new URLSearchParams({lang:locale==='ko'?'ko':'en',group: group || 'personal'});
  if (folder) params.set('album', folder);
  if (view) params.set('view', view);
  return `/crew/photos?${params}`;
}
