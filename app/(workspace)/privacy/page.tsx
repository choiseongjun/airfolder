import Link from 'next/link';
export default function Privacy(){return <main style={{maxWidth:720,margin:'40px auto',padding:24,lineHeight:1.8}}>
  <Link href="/">← Memolumi</Link><h1>Privacy / 개인정보 처리 안내</h1>
  <p>Memolumi stores the photos you select, folder information, sharing choices, and account information from Google or Apple (account identifier, name and email when provided).</p>
  <p>선택한 사진, 폴더 정보, 공개 설정과 Google·Apple 계정 식별자 및 제공되는 이름·이메일을 서비스 제공에 사용합니다. 사진 접근 권한을 허용해도 모든 사진을 자동으로 업로드하지 않습니다.</p>
  <h2>Photos / 사진</h2><p>Photos are processed as JPEG images up to 2560 pixels. Firebase handles sign-in; Supabase stores application records and photos. Photos are private until you share them with folder members. Members can download shared photos; copies they download remain outside our control.</p>
  <p>Firebase는 로그인을 처리하고 Supabase는 앱 데이터와 사진을 저장합니다. 사진은 최대 2560px JPEG로 변환됩니다. 공개 전에는 촬영·업로드한 사용자만 조회할 수 있습니다. 멤버가 이미 내려받은 사본은 공개 취소로 회수되지 않습니다.</p>
  <h2>Notifications / 알림</h2><p>If enabled, a device notification token is stored to deliver shared-photo alerts through Expo Push Service and Apple APNs or Google FCM. Notifications do not include photo content or folder names. Signing out removes that session’s notification registration.</p>
  <p>알림을 켜면 기기 알림 토큰을 저장하고 Expo·Apple APNs·Google FCM을 통해 사진 공유 알림을 전달합니다. 알림에는 사진 내용이나 폴더 이름을 담지 않습니다. 로그아웃하면 해당 세션의 알림 등록을 해제합니다.</p>
  <h2>Control / 관리</h2><p>You can change photo and notification access in device settings, change sharing in the app, and request account deletion from Account. Deletion requests revoke active sessions and are processed by the service operator.</p>
  <p>기기 설정에서 사진·알림 권한을 변경할 수 있고 앱에서 공개 범위를 변경할 수 있습니다. 계정 메뉴에서 삭제를 요청하면 로그인 세션이 해제되고 운영자가 삭제를 처리합니다.</p>
  <Link href="/support">Support / 문의</Link>
</main>;}
