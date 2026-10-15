import Link from 'next/link';
import { SUPPORT_EMAIL, TERMS_VERSION } from '@/lib/policy';
import '../../safety.css';

export default function Terms() {
  return <main className="legal-page"><Link href="/">← Memolumi</Link>
    <h1>Terms & community rules / 이용약관 · 커뮤니티 규칙</h1><p>Effective / 시행일: {TERMS_VERSION}<br />Operator / 운영자: 최성준 (Seongjun Choi) · <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></p>
    <h2>Using Memolumi / 서비스 이용</h2>
    <p>Memolumi lets you collect and share photos, videos and stories. You must have the legal capacity or required guardian permission to use the service where you live. Keep your account secure and use only content you own or have permission to share. You retain ownership of your content and permit us to store, process previews and deliver it according to your sharing choices.</p>
    <p>Memolumi는 사진·영상·글을 모으고 공유하는 서비스입니다. 거주 지역에서 서비스를 이용할 자격과 필요한 보호자 동의를 갖춰야 합니다. 계정을 안전하게 관리하고 본인이 소유하거나 공유 허락을 받은 콘텐츠만 올려주세요. 콘텐츠 소유권은 사용자에게 있으며 서비스 제공에 필요한 저장·미리보기 생성·선택한 공개 범위에 따른 전달을 허용합니다.</p>
    <h2>Prohibited content and conduct / 금지 콘텐츠와 행동</h2>
    <ul><li>Child sexual abuse or exploitation, sexual solicitation of minors, grooming, or sexualized depictions of children. / 아동 성적 학대·착취, 미성년자 대상 성적 접근·그루밍·성적 묘사.</li><li>Pornography, sexual exploitation, non-consensual intimate imagery, or sharing another person’s private information without permission. / 음란물, 성적 착취, 동의 없는 성적 이미지, 허락 없는 개인정보 공개.</li><li>Threats, bullying, targeted harassment, hate speech, graphic violence, or encouragement of self-harm or violence. / 위협·따돌림·괴롭힘·혐오 표현·잔혹한 폭력·자해 또는 폭력 조장.</li><li>Illegal activity, fraud, spam, impersonation, copyright infringement, or attempts to bypass access restrictions or moderation. / 불법 행위·사기·스팸·사칭·저작권 침해·접근 제한이나 제재 우회.</li></ul>
    <h2>Reporting and enforcement / 신고와 조치</h2>
    <p>Use “Report content” on a photo, story or comment to notify the service operator, including when an album owner is involved. “Block author” stops authenticated interactions and hides that author’s contributions; manage blocks in Account. Operators review reports and may hide content, suspend sharing or restrict accounts. Contact support to appeal a decision, report an account without accessible content, or report an urgent concern. Do not send illegal images as email attachments.</p>
    <p>사진·기록·댓글의 ‘콘텐츠 신고’로 서비스 운영자에게 신고하세요. 앨범 소유자에 대한 신고도 가능합니다. ‘작성자 차단’은 로그인 상태의 상호작용과 해당 작성자의 콘텐츠를 차단하며 내 계정에서 해제할 수 있습니다. 운영자는 신고를 검토하여 콘텐츠 숨김·공유 중단·계정 제한 조치를 할 수 있습니다. 이의 제기, 콘텐츠를 볼 수 없는 계정 신고 또는 긴급 문제는 지원 이메일로 연락해 주세요. 불법 이미지를 이메일에 첨부하지 마세요.</p>
    <p>We prohibit child sexual abuse and exploitation. Suspected child safety violations are reviewed and appropriate action is taken, including reporting confirmed illegal material to the relevant authorities where required by law. Our child safety contact is <a href={`mailto:${SUPPORT_EMAIL}?subject=Memolumi%20child%20safety`}>{SUPPORT_EMAIL}</a>.</p>
    <p>아동 성적 학대와 착취를 금지합니다. 의심 사례를 검토하고 위법 자료가 확인되면 법령에 따라 관계 기관 신고 등 필요한 조치를 취합니다. 아동 안전 연락처는 위 이메일입니다.</p>
    <h2>Sharing and deletion / 공유와 삭제</h2>
    <p>Uploads start private. Sharing with members or creating a public link grants others access, including downloads of originals and embedded metadata. Public links can be forwarded. Blocking does not identify signed-out visitors or recall downloaded copies. You can revoke links, change visibility, remove your content or <Link href="/delete-account">request account deletion</Link>. Verified deletion requests are completed within 30 days; see the <Link href="/privacy">privacy policy</Link> and <Link href="/support#account-deletion">deletion scope</Link>.</p>
    <p>새 업로드는 비공개로 시작합니다. 멤버 공개나 공개 링크 생성 시 다른 사람이 원본과 포함된 메타데이터를 내려받을 수 있고 링크는 전달될 수 있습니다. 차단은 로그아웃한 방문자를 식별하거나 내려받은 사본을 회수하지 못합니다. 링크 취소·공개 범위 변경·본인 콘텐츠 삭제·계정 삭제를 이용할 수 있습니다. 본인 확인된 계정 삭제 요청은 30일 이내 처리합니다.</p>
    <h2>Service changes / 서비스 변경</h2><p>Storage and upload limits apply. Availability is not guaranteed; keep your own backups. Material changes to these rules require renewed acceptance before new uploads. These terms do not remove rights you have under applicable consumer law.</p><p>저장 공간·전송 제한이 적용됩니다. 서비스의 상시 제공을 보장하지 않으므로 중요한 원본은 별도로 보관해 주세요. 주요 약관 변경 시 새 업로드 전에 다시 동의를 받습니다. 관련 소비자 법령상 권리는 이 약관으로 제한되지 않습니다.</p>
    <nav className="legal-links"><Link href="/privacy">Privacy / 개인정보</Link><Link href="/support">Support / 도움말</Link><Link href="/delete-account">Delete account / 계정 삭제</Link></nav>
  </main>;
}
