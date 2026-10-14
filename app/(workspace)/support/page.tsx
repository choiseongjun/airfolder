import Link from 'next/link';
export default function Support(){const email=process.env.SUPPORT_EMAIL || 'choisj2702@gmail.com';return <main style={{maxWidth:720,margin:'40px auto',padding:24,lineHeight:1.8}}>
  <Link href="/">← Memolumi</Link><h1>Help & support / 도움말</h1>
  <h2>Upload / 사진 전송</h2><p>Keep the app open until uploads finish. Failed uploads can be retried in Uploads. Original photos stay on your device.</p><p>전송 완료까지 앱을 열어 두세요. 실패한 사진은 전송 화면에서 재시도할 수 있습니다. 기기의 원본 사진은 지워지지 않습니다.</p>
  <h2>Sharing / 사진 공개</h2><p>Only selected photos are shared with members. Use “Only me” to stop future member access. Previously downloaded copies cannot be recalled.</p><p>선택한 사진만 폴더 멤버에게 공개됩니다. 나만 보기로 변경하면 이후 접근이 차단되지만 이미 다운로드한 사본은 회수할 수 없습니다.</p>
  <h2>Contact / 문의</h2><p>Operator / 운영자: 최성준 (Seongjun Choi)</p><a href={`mailto:${email}`}>{email}</a>
  <p>For account deletion or a problem with shared content, include the account email and relevant folder details. Do not send passwords or authentication codes.</p><p>계정 삭제 또는 공유 콘텐츠 문제는 계정 이메일과 관련 폴더 정보를 포함해 문의해 주세요. 비밀번호나 인증 코드는 보내지 마세요.</p>
  <Link href="/privacy">Privacy / 개인정보 처리 안내</Link>
</main>;}
