'use client';
import Link from 'next/link';
export default function Consent({ checked, onChange, ko }: { checked: boolean; onChange: (value: boolean) => void; ko: boolean }) {
  return <div className="growth-consent"><label><input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
    <span>{ko ? '이용약관·커뮤니티 규칙에 동의하고 개인정보 처리 안내를 확인했습니다.' : 'I agree to the terms and community rules and have read the privacy notice.'}</span></label>
    <p><Link href="/terms" target="_blank" rel="noreferrer">{ko ? '이용약관·규칙' : 'Terms & rules'}</Link> · <Link href="/privacy" target="_blank" rel="noreferrer">{ko ? '개인정보 처리 안내' : 'Privacy'}</Link></p></div>;
}
