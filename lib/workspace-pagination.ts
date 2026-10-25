export const WORKSPACE_PAGE_SIZE = 200;
export type WorkspacePage = { viewerId: string; photos: { id: string }[]; nextCursor?: string | null };

// Preserve existing web consumers while keeping every HTTP response bounded.
export async function completeWorkspace<T extends WorkspacePage>(first: T, load: (cursor: string) => Promise<T>): Promise<T> {
  const photos = new Map(first.photos.map(photo => [photo.id, photo]));
  const seen = new Set<string>();
  let cursor = first.nextCursor;
  while (cursor) {
    if (seen.has(cursor)) throw Error('WORKSPACE_PAGINATION_FAILED');
    seen.add(cursor);
    const page = await load(cursor);
    if (page.viewerId !== first.viewerId) throw Error('SESSION_CHANGED');
    for (const photo of page.photos) photos.set(photo.id, photo);
    cursor = page.nextCursor;
  }
  return { ...first, photos: [...photos.values()], nextCursor: null };
}
