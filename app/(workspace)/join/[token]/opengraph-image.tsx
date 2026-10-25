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
   `SELECT f.name,f.category FROM snaproom.invites i JOIN snaproom.folders f ON f.id=i.folder_id AND f.deleted_at IS NULL WHERE i.token_hash=$1 AND i.expires_at>now() AND f.group_id IS NULL
    UNION ALL SELECT g.name,NULL FROM snaproom.group_invites i JOIN snaproom.groups g ON g.id=i.group_id WHERE i.token_hash=$1 AND i.expires_at>now()`,
   [hash(token)],
  );
  const row = result.rows[0];
  return row ? { name: row.name as string, birthday: row.category === '생일' } : null;
 } catch { return null; }
}

export default async function Image({ params }: { params: Promise<{ token: string }> }) {
 const { token } = await params;
 const [invite, mark] = await Promise.all([
  inviteName(token),
  readFile(path.join(process.cwd(), 'public/brand/mark.svg'), 'utf8'),
 ]);
 const birthday = Boolean(invite?.birthday);
 const markSrc = `data:image/svg+xml;base64,${Buffer.from(mark).toString('base64')}`;
 return new ImageResponse(
  (
   <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: birthday ? 'linear-gradient(135deg,#fff4f7,#fff9ef)' : 'linear-gradient(135deg,#fdf6ea,#f3ead9)', padding: 80 }}>
    {birthday && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', padding: '0 30px' }}>
     {Array.from({ length: 14 }, (_, i) => <div key={i} style={{ width: 0, height: 0, borderLeft: '26px solid transparent', borderRight: '26px solid transparent', borderTop: `60px solid ${['#ff8fb1', '#7cc4e8', '#ffd25e', '#a78bfa'][i % 4]}` }}/>)}
    </div>}
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 48 }}>
     {/* eslint-disable-next-line @next/next/no-img-element */}
     <img src={markSrc} width={56} height={56} alt=""/>
     <span style={{ fontSize: 30, fontWeight: 700, color: '#30473b' }}>memonestia.</span>
    </div>
    <span style={{ fontSize: 22, letterSpacing: 4, color: birthday ? '#ff6f91' : '#a0795b', marginBottom: 20 }}>{birthday ? 'HAPPY BIRTHDAY' : 'OUR LITTLE HISTORY'}</span>
    <span style={{ fontSize: 64, fontWeight: 700, color: birthday ? '#ff5a87' : '#2c3b2f', textAlign: 'center', maxWidth: 980, lineHeight: 1.3 }}>{invite?.name || '우리의 작은 모임'}</span>
    <span style={{ fontSize: 28, color: birthday ? '#5a3d8a' : '#6b7665', marginTop: 32 }}>{birthday ? '사진 한 장, 한마디씩 채워주세요' : '사진 뒤에, 너의 기억을 남겨줘'}</span>
   </div>
  ),
  { ...size },
 );
}
