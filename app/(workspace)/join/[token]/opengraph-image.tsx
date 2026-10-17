import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { hash, pool } from '@/lib/server';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

async function inviteName(token: string) {
 if (!/^[a-f\d]{64}$/.test(token)) return null;
 try {
  const result = await pool().query(
   `SELECT f.name FROM snaproom.invites i JOIN snaproom.folders f ON f.id=i.folder_id AND f.deleted_at IS NULL WHERE i.token_hash=$1 AND i.expires_at>now() AND f.group_id IS NULL
    UNION ALL SELECT g.name FROM snaproom.group_invites i JOIN snaproom.groups g ON g.id=i.group_id WHERE i.token_hash=$1 AND i.expires_at>now()`,
   [hash(token)],
  );
  return result.rows[0]?.name as string | undefined ?? null;
 } catch { return null; }
}

export default async function Image({ params }: { params: Promise<{ token: string }> }) {
 const { token } = await params;
 const [name, mark] = await Promise.all([
  inviteName(token),
  readFile(path.join(process.cwd(), 'public/brand/mark.svg'), 'utf8'),
 ]);
 const markSrc = `data:image/svg+xml;base64,${Buffer.from(mark).toString('base64')}`;
 return new ImageResponse(
  (
   <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#fdf6ea,#f3ead9)', padding: 80 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 48 }}>
     {/* eslint-disable-next-line @next/next/no-img-element */}
     <img src={markSrc} width={56} height={56} alt=""/>
     <span style={{ fontSize: 30, fontWeight: 700, color: '#30473b' }}>memonestia.</span>
    </div>
    <span style={{ fontSize: 22, letterSpacing: 4, color: '#a0795b', marginBottom: 20 }}>OUR LITTLE HISTORY</span>
    <span style={{ fontSize: 64, fontWeight: 700, color: '#2c3b2f', textAlign: 'center', maxWidth: 980, lineHeight: 1.3 }}>{name || '우리의 작은 모임'}</span>
    <span style={{ fontSize: 28, color: '#6b7665', marginTop: 32 }}>함께한 순간을 모으고 있어요</span>
   </div>
  ),
  { ...size },
 );
}
