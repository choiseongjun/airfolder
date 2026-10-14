import { randomUUID } from 'node:crypto';
import { ApiError, json, pool, safe, sameOrigin, transaction, viewer } from '@/lib/server';
import { folderDates } from '@/lib/folder-dates';
export async function POST(request: Request) {
  return safe(async () => {
    sameOrigin(request); const who = await viewer(); const body = await json(request);
    if (typeof body.name !== 'string' || !body.name.trim() || body.name.trim().length > 80 || typeof (body.description ?? '') !== 'string' || (body.description ?? '').length > 500) throw new ApiError(400, 'INVALID_FOLDER');
    const count = await pool().query('SELECT count(*) FROM snaproom.folders WHERE owner_id=$1', [who]);
    if (Number(count.rows[0].count) >= 100) throw new ApiError(409, 'FOLDER_LIMIT');
    const id = randomUUID(); const category = ['여행','모임','업무','개인'].includes(body.category) ? body.category : '개인';
    let dates: [string | null, string | null];
    try { dates = folderDates(body.startDate, body.endDate); } catch { throw new ApiError(400, 'INVALID_DATE_RANGE'); }
    await transaction(async db => {
      await db.query('INSERT INTO snaproom.folders(id,owner_id,name,category,description,starts_on,ends_on) VALUES($1,$2,$3,$4,$5,$6,$7)', [id, who, body.name.trim(), category, body.description || '', ...dates]);
      await db.query('INSERT INTO snaproom.members(folder_id,viewer_id) VALUES($1,$2)', [id, who]);
    });
    return Response.json({ id }, { status: 201 });
  });
}
