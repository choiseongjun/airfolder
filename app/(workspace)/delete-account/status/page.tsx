'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/client-api';
import '../../../safety.css';
export default function DeletionStatus() {
  const [status, setStatus] = useState('loading');
  useEffect(() => {
    const receipt = location.hash.slice(1);
    api<{ status: string }>('/api/account-deletion-status', { method: 'POST', body: JSON.stringify({ receipt }) }).then(r => setStatus(r.status)).catch(() => setStatus('unavailable'));
  }, []);
  return <main className="legal-page"><Link href="/">← Memolumi</Link><h1>Account deletion / 계정 삭제 상태</h1><p role="status">{status === 'completed' ? 'Deletion completed. Your account and associated live-service data have been deleted. / 계정과 관련 서비스 데이터 삭제가 완료되었습니다.' : status === 'pending' ? 'Your request is being processed. Deletion will be completed within 30 days of the request. / 요청을 처리 중입니다. 접수일로부터 30일 이내 삭제를 완료합니다.' : status === 'unavailable' ? 'This receipt was not found, expired or could not be loaded. Please retry or contact Support. / 접수증을 찾을 수 없거나 만료 또는 연결 오류가 발생했습니다. 다시 시도하거나 문의해 주세요.' : 'Checking… / 확인 중…'}</p><p>Save this private page link to check again. Receipts expire 30 days after completion. / 이 비공개 페이지 주소를 보관해 처리 결과를 확인하세요. 접수증은 완료 후 30일에 만료됩니다.</p><Link href="/support#account-deletion">Support / 문의</Link></main>;
}
