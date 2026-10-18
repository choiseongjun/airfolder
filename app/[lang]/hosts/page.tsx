import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowDown, ArrowUpRight, Check, ImagePlus, Link2, LockKeyhole } from 'lucide-react';
import { isPublicLanguage, publicOrigin } from '@/lib/seo';
import HostActions from './host-actions';
import './hosts.css';
type Props = { params: Promise<{ lang: string }> };
export async function generateMetadata({ params }: Props) {
  const { lang } = await params; if (!isPublicLanguage(lang)) notFound();
  const title = lang === 'ko' ? '모임이 끝나도, 사진은 함께 | Memonestia' : 'One gathering. Every perspective. | Memonestia';
  const description = lang === 'ko' ? '여행과 모임의 사진을 한 앨범으로. 모임장은 초대 링크를 보내고, 멤버는 앱 설치 없이 고른 사진만 보태세요.' : 'Collect your group’s photos in one shared album. Send an invitation; guests add selected photos without installing an app.';
  const origin = publicOrigin();
  return { title, description, metadataBase: origin ? new URL(origin) : undefined,
    ...(origin ? { alternates: { canonical: `${origin}/${lang}/hosts`, languages: { ko: `${origin}/ko/hosts`, en: `${origin}/en/hosts` } } } : {}),
    openGraph: { title, description, ...(origin ? { images: [`${origin}/brand/og-${lang === "ko" ? "ko" : "en"}.png`] } : {}) } };
}
export default async function Hosts({ params }: Props) {
  const { lang } = await params; if (!isPublicLanguage(lang)) notFound();
  const ko = lang === 'ko', t = (a: string, b: string) => ko ? a : b;
  return <div className="hosts-page"><a className="lp-skip" href="#host-main">{t('본문으로', 'Skip to content')}</a>
    <header className="hosts-nav"><Link className="hosts-brand" href={`/${lang}`}>memonestia<span>.</span></Link><nav><a href="#how">{t('이용 방법', 'How it works')}</a><Link href={`/${ko ? 'en' : 'ko'}/hosts`} lang={ko ? 'en' : 'ko'}>{ko ? 'EN' : '한국어'}</Link><Link href={`/?lang=${lang}`}>{t('내 공간', 'My space')}<ArrowUpRight size={15} /></Link></nav></header>
    <main id="host-main"><section className="hosts-hero"><div className="hosts-copy"><p className="hosts-kicker"><span />FOR THE ONE WHO BRINGS US TOGETHER</p>
      <h1>{t('모임은 끝나도,', 'The gathering ends.')}<br /><em>{t('우리 사진은 함께.', 'The story stays.')}</em></h1>
      <p className="hosts-intro">{t('“사진 좀 보내줘!”는 이제 그만.', 'One less “send me your photos.”')}<br />{t('모임장은 링크 하나만. 친구들은 고른 사진만.', 'One link from you. Favorite moments from everyone.')}<br />{t('서로 다른 시선이 하나의 앨범에 모여요.', 'Every perspective, together in one album.')}</p>
      <HostActions locale={lang} /><p className="hosts-hint">{t('앱 설치 없이 시작 · 사진은 선택한 것만 · 멤버끼리 공유', 'No installation · Only selected photos · Shared with your group')}</p>
      <a className="hosts-scroll" href="#how">{t('어떻게 모으나요?', 'How does it work?')}<ArrowDown size={15} /></a></div>
      <div className="hosts-scene"><div className="hosts-photo"><Image src="/landing/friends.webp" alt={t('함께 시간을 보내는 친구들', 'Friends enjoying time together')} fill sizes="(max-width: 760px) 90vw, 550px" priority /><span className="hosts-photo-label">A WEEKEND, WELL KEPT.</span></div>
        <div className="hosts-mini"><span className="hosts-mini-icon"><ImagePlus size={22} /></span><div><strong>{t('우리들의 가을 여행', 'Our autumn getaway')}</strong><span>{t('내가 찍은 순간도, 네가 찍은 순간도.', 'My moments. Your moments. Our story.')}</span></div><Check size={18} /></div><span className="hosts-scene-note">{t('사진은 예시 이미지입니다.', 'Illustrative album preview.')}</span></div>
    </section>
    <section className="hosts-band"><p>{t('여행 · 소모임 · 워크숍', 'TRIPS · CLUBS · WORKSHOPS')}</p><h2>{t('함께 모이는 사람들을 위한, 작은 사진 공간.', 'A little home for the people you bring together.')}</h2></section>
    <section className="hosts-how" id="how"><div className="hosts-section-title"><p className="hosts-kicker">THREE SMALL STEPS</p><h2>{t('사진 모으는 일은 가볍게.', 'Less chasing. More remembering.')}</h2><p>{t('모임장은 준비하고, 멤버는 보태고, 다 같이 꺼내 봐요.', 'You make the space. Everyone adds a little. Keep it together.')}</p></div>
      <div className="hosts-steps">{[
        [Link2, t('모임 이름으로 앨범 만들기', 'Give your album a name'), t('이름 하나를 입력하면 초대 링크와 QR이 나와요. 단체 채팅방에 보내거나 현장에서 보여주세요.', 'Create an album, then share its invitation link in your group chat or show the QR in person.')],
        [ImagePlus, t('초대받은 사람은 사진만 고르기', 'Guests choose their photos'), t('앱 설치나 새 계정 가입 없이 참여해요. 공유할 사진을 고르고 올리면 끝. 실패한 사진은 다시 올릴 수 있어요.', 'Guests join without installing an app or creating an account. Pick photos, choose who can see them, and upload. Retry any that fail.')],
        [LockKeyhole, t('우리끼리 보고, 오래 꺼내 보기', 'Enjoy it with your people'), t('앨범에서 각자의 시선을 함께 보고 추억 카드도 만들어 보세요. 나만 보기와 멤버 공유를 선택할 수 있어요.', 'Enjoy everyone’s perspective and make memory cards. Choose private storage or sharing with album members.')],
      ].map(([Icon, title, body], i) => { const StepIcon = Icon as typeof Link2; return <article key={i}><div className="hosts-step-top"><span>0{i + 1}</span><StepIcon size={23} strokeWidth={1.4} /></div><h3>{String(title)}</h3><p>{String(body)}</p></article>; })}</div>
    </section>
    <section className="hosts-detail"><div className="hosts-detail-image"><Image src="/landing/sea.webp" alt={t('여행 중 함께 바라본 바다', 'A shared view of the sea')} fill sizes="(max-width:760px) 90vw, 500px" /></div><div><p className="hosts-kicker">LESS TO MANAGE. MORE TO KEEP.</p><h2>{t('좋은 모임을 만드는 데', 'Put your energy into')}<br /><em>{t('더 마음을 써주세요.', 'bringing people together.')}</em></h2><p>{t('흩어진 사진을 일일이 받아 정리하는 대신, 같은 앨범에 모아보세요. 다음 모임에서도 다시 꺼내 볼 수 있는 우리만의 기록이 됩니다.', 'Give scattered photos a shared home, without collecting them one by one. A place to return to when your next gathering comes around.')}</p><Link href={`/?browse=1&lang=${lang}`}>{t('예시 공간 둘러보기', 'Explore an example space')}<ArrowUpRight size={18} /></Link></div></section>
    <section className="hosts-faq"><h2>{t('시작 전에 궁금한 것들', 'A few things to know')}</h2>{[
      [t('멤버도 앱을 설치해야 하나요?', 'Do guests need the app?'), t('아니요. 초대 링크를 브라우저에서 열고 참여하면 사진을 올릴 수 있어요. 같은 브라우저에서 이어서 이용할 수 있고, 다른 기기에서도 보려면 계정을 연결해 주세요.', 'No. Open the invite in a browser to join and upload. Continue in that browser, or connect an account to return on another device.')],
      [t('모든 사진이 자동으로 올라가나요?', 'Are all my photos uploaded automatically?'), t('직접 고른 사진만 올라갑니다. 초대 화면에서 멤버 공유 또는 나만 보기를 고른 뒤 업로드 버튼을 눌러야 전송돼요. 공유된 원본은 멤버가 내려받을 수 있어요.', 'Only photos you choose are uploaded after you press the upload button. Choose member sharing or private storage. Members can download shared originals.')],
      [t('저장 용량에 제한이 있나요?', 'Are there storage limits?'), t('사진은 장당 20MB, 계정당 기본 저장 공간은 500MB입니다. 원본과 미리보기가 용량에 포함되고 전체 서비스의 남은 공간에 따라 업로드가 제한될 수 있어요. 무제한 보관 서비스는 아닙니다.', 'Photos can be up to 20 MB each, with 500 MB per account including originals and previews. Uploads also depend on available service capacity. Storage is not unlimited.')],
    ].map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</section>
    <section className="hosts-end"><p className="hosts-kicker">YOUR NEXT GATHERING STARTS HERE</p><h2>{t('다음 모임의 첫 사진 공간,', 'Your next gathering,')}<br /><em>{t('지금 만들어 두세요.', 'already has a home.')}</em></h2><HostActions locale={lang} secondary /></section>
    </main><footer className="hosts-footer"><Link className="hosts-brand" href={`/${lang}`}>memonestia.</Link><p>{t('함께한 순간을, 함께 간직해요.', 'Your moments. Together.')}</p><div><Link href={`/${lang}/make`}>{t('만들기 가이드', 'Guides')}</Link><Link href="/privacy">{t('개인정보', 'Privacy')}</Link><Link href="/terms">{t('이용약관', 'Terms')}</Link><Link href="/support">{t('문의', 'Support')}</Link></div></footer></div>;
}
