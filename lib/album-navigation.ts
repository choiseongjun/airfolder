/** Korean invitations stay in the Stitch photo drawer, including anonymous members. */
export function joinedAlbumHref(locale: string, folder?: string, group?: string, view?: 'rolling') {
  if (locale !== 'ko') return `/?lang=${encodeURIComponent(locale)}${folder ? `&album=${encodeURIComponent(folder)}&view=${view || 'theme'}` : group ? `&group=${encodeURIComponent(group)}` : ''}`;
  const params = new URLSearchParams({group: group || 'personal'});
  if (folder) params.set('album', folder);
  if (view) params.set('view', view);
  return `/crew/photos?${params}`;
}
