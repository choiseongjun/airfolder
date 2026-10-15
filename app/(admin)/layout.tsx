import type { Metadata } from 'next';
import './admin.css';

export const metadata: Metadata = { title: 'Memolumi · 운영 관리', robots: { index: false, follow: false } };
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <html lang="ko"><body className="admin-body">{children}</body></html>;
}
