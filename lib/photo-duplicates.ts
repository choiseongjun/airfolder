'use client';
// Groups near-identical photos (burst shots, retakes of the same moment) so the picker can ask
// "keep just one of these?" instead of uploading five almost-identical frames. Runs entirely in
// the browser: an 8x8 average-hash (aHash) per photo, then photos within a small Hamming distance
// AND a short time window are treated as the same shot.

const HASH_SIZE = 8;
const SIMILARITY_THRESHOLD = 10; // of 64 bits; empirically a good "looks like the same shot" cutoff for aHash
const TIME_WINDOW_MS = 10 * 60 * 1000; // guards against two unrelated but visually similar photos (e.g. two different sunsets) matching

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('IMAGE_LOAD_FAILED'));
    img.src = url;
  });
}

/** An 8x8 grayscale average hash, as a 64-character '0'/'1' string: each bit says whether that
 *  pixel is lighter than the image's mean. (A string avoids BigInt, unneeded at this size.) */
export async function hashImage(url: string): Promise<string | null> {
  try {
    const img = await loadImage(url);
    const canvas = document.createElement('canvas');
    canvas.width = HASH_SIZE; canvas.height = HASH_SIZE;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, HASH_SIZE, HASH_SIZE);
    const { data } = ctx.getImageData(0, 0, HASH_SIZE, HASH_SIZE);
    const gray: number[] = [];
    for (let i = 0; i < data.length; i += 4) gray.push((data[i] + data[i + 1] + data[i + 2]) / 3);
    const avg = gray.reduce((a, b) => a + b, 0) / gray.length;
    return gray.map(value => value >= avg ? '1' : '0').join('');
  } catch { return null; }
}

export function hammingDistance(a: string, b: string): number {
  let count = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) count++;
  return count;
}

/**
 * Groups items (sorted by `taken`) into clusters of likely-duplicate shots. Items whose hash
 * failed to compute, or that don't match a neighbor, come back as their own single-item cluster.
 */
export function groupDuplicates<T extends { id: string; taken: number }>(
  items: T[],
  hashes: Map<string, string | null>,
): T[][] {
  const sorted = [...items].sort((a, b) => a.taken - b.taken);
  const clusters: T[][] = [];
  for (const item of sorted) {
    const hash = hashes.get(item.id);
    const last = clusters[clusters.length - 1];
    const lastHash = last ? hashes.get(last[last.length - 1].id) : undefined;
    if (last && hash != null && lastHash != null
      && item.taken - last[last.length - 1].taken <= TIME_WINDOW_MS
      && hammingDistance(hash, lastHash) <= SIMILARITY_THRESHOLD) {
      last.push(item);
    } else {
      clusters.push([item]);
    }
  }
  return clusters;
}
