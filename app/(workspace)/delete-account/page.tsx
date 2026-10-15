import Link from 'next/link';
import DeleteAccount from './request';
import '../../safety.css';
export default function Page() {
  return <main className="legal-page"><Link href="/">← Memonestia</Link><h1>Delete account / 계정 삭제</h1>
    <p>You can request deletion here without installing the app. This permanently deletes your account, uploads, previews, stories, comments, reactions and memberships within 30 days. All sessions are signed out immediately. Groups with other members can be transferred; your own contributions are deleted. Downloaded copies cannot be recalled.</p>
    <p>앱 설치 없이 여기서 계정 삭제를 요청할 수 있습니다. 30일 이내 계정·업로드한 원본과 미리보기·기록·댓글·공감·멤버십을 영구 삭제하며 모든 기기에서 즉시 로그아웃됩니다. 다른 멤버가 있는 그룹은 이전될 수 있지만 본인의 콘텐츠는 삭제됩니다. 이미 다운로드한 사본은 회수할 수 없습니다.</p>
    <DeleteAccount /><p><Link href="/support#account-deletion">Deletion scope, retention and help / 삭제 범위·보관·도움말</Link> · <Link href="/privacy">Privacy / 개인정보 처리 안내</Link></p>
  </main>;
}
