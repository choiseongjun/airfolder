import { connection } from 'next/server';
import { adminSafe, requireAdmin } from '@/lib/admin';
import { ApiError, pool } from '@/lib/server';
import { posthogConfigured } from '@/lib/growth';
import { growthReportSql } from '@/lib/growth-report';
export async function GET(request: Request) { await connection(); return adminSafe(async () => {
  await requireAdmin();
  const query = new URL(request.url).searchParams, days = Number(query.get('days') || 30), environment = query.get('environment') || 'production';
  if (![7,30,90].includes(days) || !['production','development'].includes(environment)) throw new ApiError(400, 'INVALID_PERIOD');
  const result = await pool().query(growthReportSql, [environment, days]);
  return Response.json({ ...result.rows[0].report, posthogConfigured: posthogConfigured(), environment, days });
}); }
