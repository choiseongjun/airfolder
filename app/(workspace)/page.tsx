"use client";

// Photo URLs require session cookies or refer to local data; an image optimizer cannot fetch them.
/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowDownToLine, ArrowLeft, ArrowRight, Bell, Camera, Check, ChevronRight, CircleHelp, CloudCheck, Copy, Globe2, FolderOpen, Grid2X2, ImagePlus, Images, Link2, List, LockKeyhole, MoreHorizontal, Plus, Search, ShieldCheck, Sparkles, Users, X } from "lucide-react";
import QRCode from "qrcode";
import { GoogleAuthProvider, OAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { authConfigured, firebaseAuth } from "@/lib/firebase-client";
import { api, initializeSession } from "@/lib/client-api";
import { formatCapturedAt, formatCount, languageStorageKey, localeTag, translate, type Locale } from "../i18n";

type Account = { name: string; email: string | null; provider: string };
type Room = { id: string; name: string; category: string; description: string; image: string; members: number; count: number; color: string; updated: string; updatedAt?: number; mine?: boolean };
type Photo = { id: string; roomId: string; src: string; name: string; shared: boolean; audience?: string; created: number; demo?: boolean; mine?: boolean; uploadStatus?: "pending" | "uploading" | "uploaded" | "failed" };
const photoUrl = (id: string, width = 900) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=85`;
const coast = photoUrl("photo-1519046904884-53103b34b206");
const seedRooms: Room[] = [
  { id: "jeju", name: "우리의 제주 여행", category: "여행", description: "바람 따라, 마음 따라 떠난 제주", image: coast, members: 4, count: 128, color: "#e8eee7", updated: "방금 전" },
  { id: "weekend", name: "느긋한 주말 모임", category: "모임", description: "좋은 사람들과 맛있는 시간", image: photoUrl("photo-1511632765486-a01980e01a18"), members: 6, count: 64, color: "#f2e9dd", updated: "2시간 전" },
  { id: "work", name: "성수동 에어컨 설치", category: "업무", description: "작업의 시작부터 마무리까지", image: photoUrl("photo-1600210492486-724fe5c67fb0"), members: 2, count: 32, color: "#ece9e3", updated: "어제" },
  { id: "daily", name: "작은 일상 수집", category: "개인", description: "그냥 지나치기 아쉬운 순간들", image: photoUrl("photo-1441986300917-64674bd600d8"), members: 1, count: 48, color: "#f0eee3", updated: "어제" },
];
function database(): Promise<IDBDatabase> { return new Promise((resolve, reject) => { const req = indexedDB.open("snaproom-v1", 1); req.onupgradeneeded = () => req.result.createObjectStore("workspace"); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); }); }
async function saveWorkspace(rooms: Room[], photos: Photo[], viewerId: string) { const db = await database(); return new Promise<void>((resolve, reject) => { const tx = db.transaction("workspace", "readwrite"); tx.objectStore("workspace").put({ rooms, photos }, "server:" + viewerId); tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = () => { db.close(); reject(tx.error); }; }); }

export default function Home() {
  const [locale, setLocale] = useState<Locale>("en"); const [localeReady, setLocaleReady] = useState(false);
  const t = (key: string) => translate(locale, key);
  const number = (value: number) => new Intl.NumberFormat(localeTag[locale]).format(value);
  function roomTitle(value: Room | undefined) {
    if (!value) return "";
    const original = seedRooms.find(seed => seed.id === value.id);
    return original?.name === value.name ? t(value.name) : value.name;
  }
  function roomSummary(value: Room) {
    const original = seedRooms.find(seed => seed.id === value.id);
    return original?.description === value.description ? t(value.description) : value.description;
  }
  const photoTitle = (value: Photo) => value.demo ? t(value.name) : value.name;
  function roomActivity(value: Room) {
    if (!value.updatedAt) return t(value.updated);
    return formatCapturedAt(locale, value.updatedAt);
  }
  useEffect(() => {
    try {
      const linked = new URLSearchParams(window.location.search).get("lang");
      const saved = localStorage.getItem(languageStorageKey);
      const preferred = linked === "en" || linked === "ko" ? linked : saved;
      // Hydrate this browser's stored preference after server rendering.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (preferred === "en" || preferred === "ko") setLocale(preferred);
    } catch { /* Keep the English default when storage is unavailable. */ } finally { setLocaleReady(true); }
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = locale === "en" ? "Memolumi — Every moment, in its place" : "Memolumi — 모든 순간, 제자리에";
    document.querySelector('meta[name="description"]')?.setAttribute("content", translate(locale, "목적에 맞는 방에서 사진을 찍고, 나만 보관하고, 필요한 순간만 공유하세요."));
  }, [locale]);
  function changeLanguage(value: string) {
    if (value !== "en" && value !== "ko") return;
    setLocale(value); const url = new URL(window.location.href); if (url.searchParams.has("lang")) { url.searchParams.set("lang", value); window.history.replaceState(null, "", url); }
    try { localStorage.setItem(languageStorageKey, value); } catch { /* The session can still switch language. */ }
  }

  const [rooms, setRooms] = useState<Room[]>([]); const [photos, setPhotos] = useState<Photo[]>([]);
  const [account, setAccount] = useState<Account | null>(null); const [authBusy, setAuthBusy] = useState(false); const [authError, setAuthError] = useState("");
  const [viewerId, setViewerId] = useState(""); const [serverError, setServerError] = useState(false); const [retryConnection, setRetryConnection] = useState(0); const [busy, setBusy] = useState(false); const [inviteUrl, setInviteUrl] = useState(""); const [joinToken, setJoinToken] = useState(""); const uploading = useRef(new Set<string>());
  const [ready, setReady] = useState(false); const [page, setPage] = useState("rooms"); const [filter, setFilter] = useState("전체"); const [query, setQuery] = useState("");
  const [activeRoom, setActiveRoom] = useState<string | null>(null); const [modal, setModal] = useState<string | null>(null); const [toast, setToast] = useState("");
  const [selected, setSelected] = useState<string[]>([]); const [roomName, setRoomName] = useState(""); const [category, setCategory] = useState("개인"); const [description, setDescription] = useState("");
  const [cameraRoom, setCameraRoom] = useState(""); const [sessionIds, setSessionIds] = useState<string[]>([]); const [cameraReady, setCameraReady] = useState(false); const [flash, setFlash] = useState(false); const [persistStatus, setPersistStatus] = useState("saved"); const [instant, setInstant] = useState(false); const [cameraError, setCameraError] = useState("");
  const [sort, setSort] = useState("recent"); const [listView, setListView] = useState(false); const [audience, setAudience] = useState("방 전체");
  const [qr, setQr] = useState(""); const [preview, setPreview] = useState<Photo | null>(null); const [saving, setSaving] = useState(false); const [saveError, setSaveError] = useState(false);
  const video = useRef<HTMLVideoElement>(null); const stream = useRef<MediaStream | null>(null); const file = useRef<HTMLInputElement>(null);
  const room = rooms.find(r => r.id === activeRoom); const inviteRoom = rooms.find(r => r.id === cameraRoom);
  const mergeRemote = useCallback((data: { rooms: Room[]; photos: Photo[]; account?: Account | null }) => {
    setRooms(data.rooms); setAccount(data.account ?? null);
    setPhotos(old => [...old.filter(p => !p.demo && p.uploadStatus !== "uploaded" && !data.photos.some(remote => remote.id === p.id)), ...data.photos]);
  }, []);
  const refreshWorkspace = useCallback(async () => { const data = await api<{rooms: Room[]; photos: Photo[]}>("/api/workspace"); mergeRemote(data); setServerError(false); }, [mergeRemote]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const session = await initializeSession();
        if (cancelled) return;
        setViewerId(session.viewerId);
        try {
          const db = await database();
          const saved = await new Promise<{rooms: Room[]; photos: Photo[]} | undefined>((resolve,reject) => { const request = db.transaction("workspace").objectStore("workspace").get("server:" + session.viewerId); request.onsuccess=()=>resolve(request.result); request.onerror=()=>reject(request.error); }); db.close();
          if (!cancelled && saved) { setRooms(saved.rooms); setPhotos(saved.photos.map(p => p.uploadStatus === "uploading" ? {...p,uploadStatus:"pending" as const} : p)); }
        } catch { if (!cancelled) setSaveError(true); }
        const data = await api<{rooms: Room[]; photos: Photo[]}>("/api/workspace");
        if (cancelled) return;
        mergeRemote(data); setReady(true); setServerError(false);
        const token = new URLSearchParams(window.location.search).get("invite");
        if (token) { setJoinToken(token); setModal("join"); }
      } catch { if (!cancelled) { setServerError(true); setReady(false); } }
    })();
    return () => { cancelled = true; };
  }, [retryConnection, mergeRemote]);
  useEffect(() => {
    if (!ready || !viewerId) return;
    let current = true;
    saveWorkspace(rooms,photos,viewerId).then(()=>{if(current)setSaveError(false);}).catch(()=>{if(current)setSaveError(true);});
    return ()=>{current=false;};
  }, [rooms,photos,ready,viewerId]);
  useEffect(() => {
    if (!ready) return;
    const next = photos.find(p => p.uploadStatus === "pending" && !uploading.current.has(p.id));
    if (!next || uploading.current.size) return;
    uploading.current.add(next.id); setPersistStatus("saving");
    (async()=>{
      try {
        // Commit the original to the local queue before sending it over the network.
        await saveWorkspace(rooms,photos,viewerId);
        setPhotos(old=>old.map(p=>p.id===next.id?{...p,uploadStatus:"uploading"}:p));
        const body = new FormData(); body.set("id",next.id); body.set("folderId",next.roomId); body.set("name",next.name); body.set("created",String(next.created)); body.set("shared",String(next.shared)); body.set("file",await (await fetch(next.src)).blob(),"capture.jpg");
        await api("/api/photos",{method:"POST",body});
        setPhotos(old=>old.map(p=>p.id===next.id?{...p,src:"/api/photos/"+p.id+"/content",uploadStatus:"uploaded"}:p)); setServerError(false);
      } catch { setPhotos(old=>old.map(p=>p.id===next.id?{...p,uploadStatus:"failed"}:p)); }
      finally { uploading.current.delete(next.id); setPersistStatus("saved"); }
    })();
  },[photos,rooms,ready,viewerId]);
  useEffect(()=>{
    if(!ready)return;
    const timer=setInterval(()=>{ if(!uploading.current.size) void refreshWorkspace().catch(()=>setServerError(true)); },15000);
    return()=>clearInterval(timer);
  },[ready, refreshWorkspace]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(""), 4200); return () => clearTimeout(timer); }, [toast]);
  // Reflect camera capability errors in the capture UI.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (modal !== "camera") return; let cancelled = false; navigator.mediaDevices?.getUserMedia({ video: { facingMode: "environment" }, audio: false }).then(s => { if (cancelled) { s.getTracks().forEach(t => t.stop()); return; } stream.current = s; if (video.current) video.current.srcObject = s; }).catch(() => setCameraError("카메라 접근을 허용하거나 사진을 직접 추가해 주세요.")); if (!navigator.mediaDevices) setCameraError("이 브라우저에서는 사진을 직접 추가해 주세요."); return () => { cancelled = true; stream.current?.getTracks().forEach(t => t.stop()); stream.current = null; }; }, [modal]);
  useEffect(() => { const handler = (event: KeyboardEvent) => { if ((event.metaKey || event.ctrlKey) && event.key === "k") { event.preventDefault(); document.querySelector<HTMLInputElement>(".search input")?.focus(); } if (event.key === "Escape") { if (saving || busy || authBusy) return; if (modal === "camera") { setActiveRoom(cameraRoom); setPage("rooms"); } setModal(null); setPreview(null); } }; window.addEventListener("keydown", handler); return () => window.removeEventListener("keydown", handler); }, [modal, cameraRoom, saving, busy, authBusy]);
  function navigate(next: string) { setPage(next); setActiveRoom(null); setSelected([]); setQuery(""); }
  function startCapture(id: string) { if (!ready) return; setCameraRoom(id); setActiveRoom(id); setPage("rooms"); setQuery(""); setSelected([]); setCameraError(""); setCameraReady(false); setInstant(false); setSessionIds([]); setModal("camera"); }
  function startCollect(id: string) { if (!ready) return; setCameraRoom(id); setActiveRoom(id); setPage("rooms"); setQuery(""); setSelected([]); setInstant(false); setSessionIds([]); setModal("collect"); }
  function openCollect() { if (activeRoom && rooms.some(r => r.id === activeRoom)) startCollect(activeRoom); else setModal(rooms.length ? "choose-folder" : "create"); }
  function finishCapture() { setActiveRoom(cameraRoom); setPage("rooms"); setQuery(""); setSelected([]); setModal(null); }
  function closeModal() { if (saving || busy || authBusy) return; if (modal === "camera") finishCapture(); else setModal(null); }
  function addPhoto(src: string, name: string) { if (!ready || !cameraRoom || !rooms.some(r => r.id === cameraRoom)) return; const id = crypto.randomUUID(); setPhotos(old => [{ id, roomId: cameraRoom, src, name, shared: instant, created: Date.now(), mine: true, uploadStatus: "pending" }, ...old]); setSessionIds(old => [...old, id]); setRooms(old => old.map(r => r.id === cameraRoom ? { ...r, image: r.image || src, updatedAt: Date.now() } : r)); }
  function capture() { if (!video.current?.videoWidth) return; const canvas = document.createElement("canvas"); canvas.width = video.current.videoWidth; canvas.height = video.current.videoHeight; canvas.getContext("2d")?.drawImage(video.current, 0, 0); addPhoto(canvas.toDataURL("image/jpeg", .85), `${locale === "en" ? "Photo" : "사진"} ${formatCapturedAt(locale, Date.now())}`); setFlash(true); window.setTimeout(() => setFlash(false), 150); }
  async function importPhotos(files: FileList | null) { if (!files) return; setSaving(true); for (const image of Array.from(files)) { if (!image.type.startsWith("image/")) continue; if (image.size > 15 * 1024 * 1024) { setToast("15MB 이하의 사진을 선택해 주세요"); continue; } try { const src = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(image); }); addPhoto(src, image.name); } catch { setToast("사진을 읽지 못했어요. 다시 시도해 주세요."); } } setSaving(false); if (file.current) file.current.value = ""; }
  async function createRoom(event: React.FormEvent) {
    event.preventDefault(); if(!roomName.trim() || !ready || busy)return; setBusy(true);
    try {
      const result=await api<{id:string}>("/api/folders",{method:"POST",body:JSON.stringify({name:roomName.trim(),category,description})});
      await refreshWorkspace(); setRoomName(""); setDescription(""); setFilter("전체"); startCollect(result.id);
    } catch { setToast("서버에 폴더를 만들지 못했어요. 다시 시도해 주세요."); } finally {setBusy(false);}
  }
  async function invite(id: string) {
    setCameraRoom(id); setModal("invite"); setQr(""); setInviteUrl("");
    try { const result=await api<{token:string}>("/api/invites",{method:"POST",body:JSON.stringify({folderId:id})}); const url=new URL(window.location.origin); url.searchParams.set("invite",result.token); url.searchParams.set("lang",locale); setInviteUrl(url.toString()); setQr(await QRCode.toDataURL(url.toString(),{width:220,margin:1,color:{dark:"#34382e",light:"#ffffff"}})); }
    catch { setToast("초대 링크를 만들지 못했어요. 폴더 소유자만 초대할 수 있어요."); }
  }
  async function joinFolder() {
    setBusy(true);
    try {const result=await api<{folderId:string}>("/api/join",{method:"POST",body:JSON.stringify({token:joinToken})}); await refreshWorkspace(); setActiveRoom(result.folderId);setPage("rooms");setModal(null);const url=new URL(window.location.href);url.searchParams.delete("invite");window.history.replaceState(null,"",url);setToast("폴더에 참여했어요");}
    catch{setToast("초대 링크가 만료되었거나 올바르지 않아요");}finally{setBusy(false);}
  }
  async function shareSelection() {
    setBusy(true);
    try{await api("/api/photos",{method:"PATCH",body:JSON.stringify({ids:selected,shared:audience!=="나만 보기"})});await refreshWorkspace();setSelected([]);setModal(null);setToast("공개 설정을 저장했어요");}
    catch{setToast("업로드가 완료된 내 사진만 공유할 수 있어요");}finally{setBusy(false);}
  }
  const hasUnsentPhotos = photos.some(p=>p.uploadStatus !== "uploaded");
  async function clearAccountCache() {
    try { const db=await database(); await new Promise<void>((resolve,reject)=>{const tx=db.transaction("workspace","readwrite");tx.objectStore("workspace").delete("server:"+viewerId);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});db.close(); } catch { /* Server authorization still protects downloaded image endpoints. */ }
  }
  async function socialLogin(kind: "google" | "apple") {
    if(authBusy || !ready || hasUnsentPhotos)return; setAuthBusy(true);setAuthError("");
    try {
      const auth=firebaseAuth();auth.languageCode=locale;
      const provider=kind==="apple"?new OAuthProvider("apple.com"):new GoogleAuthProvider();
      if(kind==="apple"){provider.addScope("email");provider.addScope("name");provider.setCustomParameters({locale:locale==="ko"?"ko_KR":"en_US"});}else provider.setCustomParameters({prompt:"select_account"});
      const result=await signInWithPopup(auth,provider);
      try { await api("/api/auth/firebase",{method:"POST",body:JSON.stringify({idToken:await result.user.getIdToken()})});await clearAccountCache();window.location.reload(); }
      finally {await signOut(auth).catch(()=>{});}
    } catch(error) {
      const code=error && typeof error==="object" && "code" in error?String(error.code):error instanceof Error?error.message:"";
      setAuthError(code==="auth/popup-blocked"?"로그인 팝업을 허용한 뒤 다시 시도해 주세요.":code==="auth/popup-closed-by-user"?"로그인을 취소했어요. 다시 시작할 수 있어요.":code==="auth/account-exists-with-different-credential"?"이 계정에 사용했던 로그인 방법으로 다시 시도해 주세요.":code==="LOGOUT_FIRST"?"다른 계정으로 로그인하려면 먼저 로그아웃해 주세요.":code==="AUTH_NOT_CONFIGURED" || code==="auth/unauthorized-domain" || code==="auth/operation-not-allowed"?"로그인 연결 설정이 아직 완료되지 않았어요.":"로그인을 완료하지 못했어요. 다시 시도해 주세요.");
    } finally {setAuthBusy(false);}
  }
  async function logout() {
    if(authBusy || hasUnsentPhotos)return;setAuthBusy(true);setAuthError("");
    try {await api("/api/auth/logout",{method:"POST"});await clearAccountCache();window.location.reload();}
    catch{setAuthError("로그아웃하지 못했어요. 다시 시도해 주세요.");setAuthBusy(false);}
  }
  async function download(photo: Photo) { try { const res = await fetch(photo.src); if (!res.ok) throw new Error(); const blob = await res.blob(); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `${photo.name.replace(/\.[^.]+$/, "")}.jpg`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); } catch { setToast("다운로드하지 못했어요. 네트워크를 확인해 주세요."); } }
  const filteredRooms = rooms.filter(r => (filter === "전체" || r.category === filter) && (roomTitle(r) + roomSummary(r) + r.name + r.description).toLocaleLowerCase(localeTag[locale]).includes(query.toLocaleLowerCase(localeTag[locale]))).sort((a,b) => sort === "name" ? roomTitle(a).localeCompare(roomTitle(b), localeTag[locale]) : 0);
  const visiblePhotos = photos.filter(p => (!activeRoom || p.roomId === activeRoom) && (page !== "private" || (!p.shared && p.mine !== false)) && (page !== "shared" || p.shared) && (photoTitle(p) + roomTitle(rooms.find(r => r.id === p.roomId)) + p.name).toLocaleLowerCase(localeTag[locale]).includes(query.toLocaleLowerCase(localeTag[locale]))).sort((a,b) => sort === "name" ? photoTitle(a).localeCompare(photoTitle(b), localeTag[locale]) : sort === "old" ? a.created - b.created : b.created - a.created);
  const toggle = (id: string) => { if (photos.find(p=>p.id===id)?.mine === false) return; setSelected(old => old.includes(id) ? old.filter(v => v !== id) : [...old, id]); };
  const gallery = (items: Photo[], compact = false) => <div className={`photo-grid ${compact ? "compact" : ""}`}>{items.map(p => <article className={`photo-item ${selected.includes(p.id) ? "selected" : ""}`} key={p.id}><button className="photo-open" onClick={() => setPreview(p)} aria-label={locale === "en" ? `View ${photoTitle(p)}` : `${photoTitle(p)} 크게 보기`}><img src={p.src} alt={photoTitle(p)} /></button><button disabled={p.mine === false} className="select-photo" aria-label={locale === "en" ? `Select ${photoTitle(p)}` : `${photoTitle(p)} 선택`} onClick={() => toggle(p.id)}>{selected.includes(p.id) && <Check size={13} />}</button><span className={`privacy-tag ${p.shared ? "is-shared" : ""}`}>{p.shared ? <Users size={11} /> : <LockKeyhole size={11} />}{p.shared ? t("공유됨") : t("나만 보기")}</span><div className="photo-caption"><span>{roomTitle(rooms.find(r => r.id === p.roomId))}</span><span>{p.uploadStatus === "failed" ? <button onClick={()=>setPhotos(old=>old.map(item=>item.id===p.id?{...item,uploadStatus:"pending"}:item))}>{t("다시 전송")}</button> : p.uploadStatus === "pending" || p.uploadStatus === "uploading" ? t("업로드 중") : p.mine === false ? t("멤버 사진") : t("서버 저장됨")}</span></div></article>)}</div>;
  return <div className="app-shell" lang={locale}>
    <aside className="desktop-story">
      <div className="story-top"><Link className="brand" href="/"><span className="brand-icon"><Camera size={23}/></span>memolumi<span className="brand-dot">.</span></Link><span className="story-edition">YOUR PHOTOS. TOGETHER.</span></div>
      <div className="story-copy"><span className="story-eyebrow"><i/>{t("좋아하는 카메라는 그대로.")}</span><h2>{t("어디서 찍든,")}<br/><em>{t("한곳에.")}</em></h2><p>{t("각자 찍은 여행 사진, 한 폴더에 모으세요.")}<br/>{t("촬영한 앱은 달라도, 함께 볼 사진은 여기로.")}</p>
      <div className="story-demo" role="img" aria-label={t("여행 폴더에 사진을 담고 필요한 사진만 공유하는 사용 예시")}><span className="demo-label">{t("사용 예시")}</span><div className="demo-folder"><div className="demo-folder-head"><span><FolderOpen size={19}/>{t("우리의 제주 여행")}</span><span><LockKeyhole size={13}/>{t("나만 보기")}</span></div><div className="demo-photos"><img src={coast} alt=""/><img src={photoUrl("photo-1476514525535-07fb3b4ae5f1",400)} alt=""/><div><Camera size={26}/><span>{t("다음 순간도 여기로")}</span></div></div><div className="demo-folder-foot"><span><Check size={14}/>{t("각자 찍은 사진을")}</span><span>{t("같은 폴더에 모아요")}</span></div></div><div className="demo-share"><span className="demo-share-icon"><Users size={18}/></span><div><strong>{t("함께 볼 사진만 골라서")}</strong><small>{t("나머지는 나만 간직해요")}</small></div><Check size={16}/></div></div>
      <button className="story-cta" onClick={()=>setModal("create")}>{t("첫 폴더 만들어보기")}<ArrowRight size={18}/></button><div className="story-note"><LockKeyhole size={13}/>{t("사진은 기본 비공개. 공유는 내가 선택.")}</div></div>
      <div className="story-bottom"><span>{t("혼자 기록하고, 함께 모으고.")}</span><div><span>{t("여행")}</span><span>{t("모임")}</span><span>{t("업무")}</span><span>{t("개인")}</span></div></div>
    </aside>
    <div className="main-shell"><header className="topbar"><Link className="brand app-brand" href="/" aria-label={t("Memolumi 홈")}><span className="brand-icon"><Camera size={20}/></span>memolumi<span className="brand-dot">.</span></Link><div className="header-tools"><label className="language-picker"><Globe2 size={15}/><select aria-label="Language / 언어" disabled={!localeReady} value={locale} onChange={e => changeLanguage(e.target.value)}><option value="en">English</option><option value="ko">한국어</option></select></label><span className="local-status"><span />{t("개인 작업공간")}</span><button className="icon-button" title={t("알림")} onClick={() => setModal("notifications")}><Bell size={18} /><i /></button><button className="header-avatar" onClick={() => setModal("profile")} aria-label={t("내 계정")}>S</button></div></header>
    <main>{serverError && <div className="server-banner" role="alert">{t("서버에 연결하지 못했어요. 기기에 대기 중인 사진은 유지됩니다.")}<button onClick={()=>{if(ready)void refreshWorkspace().catch(()=>setServerError(true));else setRetryConnection(v=>v+1);}}>{t("다시 시도")}</button></div>}{!ready && !serverError && <div className="server-banner" role="status">{t("서버에 연결하고 있어요")}</div>}
      <div className="page-heading"><div><div className="eyebrow">YOUR MOMENTS, IN THE RIGHT PLACE</div><h1>{room ? <><button className="back-button" onClick={() => { setActiveRoom(null); setSelected([]); }} aria-label={t("내 방으로")}><ArrowLeft size={24}/></button>{roomTitle(room)}</> : page === "rooms" ? t("먼저 폴더, 사진은 여기로.") : page === "private" ? t("나만 간직한 순간들.") : t("함께 나눈 순간들.")}</h1><p>{room ? roomSummary(room) || t("이 방에 새로운 순간을 담아보세요.") : page === "rooms" ? t("폴더를 고르고 사진을 추가하세요. 공개한 사진만 함께 보여요.") : page === "private" ? t("아직 공개하지 않은 사진이에요. 필요한 순간에, 원하는 사람에게만.") : t("내가 공개한 사진들을 한눈에 확인하세요.")}</p></div><button className="primary-button" onClick={() => room ? openCollect() : setModal("create")}>{room ? <ImagePlus size={17}/> : <Plus size={18}/>}{room ? t("사진 추가") : t("새 방 만들기")}</button></div>
      {!room && page === "rooms" && <section className="capture-start"><div className="capture-start-copy"><span className="hero-kicker">SHOOT ANYWHERE. GATHER HERE.</span><h2>{t("어디에 담을까요?")}</h2><p>{t("좋아하는 앱으로 찍고, 필요한 사진만 같은 폴더에 모으세요.")}</p><button className="primary-button" onClick={() => setModal("create")}><Plus size={17}/>{t("폴더 만들고 사진 모으기")}</button></div><ol className="capture-steps"><li><span>01</span><FolderOpen size={21}/><strong>{t("폴더 만들기")}</strong><small>{t("여행, 현장, 나만의 기록")}</small></li><li><span>02</span><ImagePlus size={21}/><strong>{t("사진 가져오기")}</strong><small>{t("내 기기에서 골라 담기")}</small></li><li><span>03</span><ShieldCheck size={21}/><strong>{t("나중에 골라 공유")}</strong><small>{t("그전까지는 나만 보기")}</small></li></ol></section>}
      <section className="content-section"><div className="section-heading"><h2>{room ? t("이 방의 사진") : page === "rooms" ? t("내 방") : t("사진")}<span>{!room && page === "rooms" ? rooms.length : visiblePhotos.length}</span></h2><div className="section-actions">{room && room.mine !== false && <button className="text-button" onClick={() => invite(room.id)}><Users size={15}/>{t("초대하기")}</button>}<select aria-label={t("정렬")} value={sort} onChange={e => setSort(e.target.value)}><option value="recent">{t("최근 활동순")}</option><option value="name">{t("이름순")}</option><option value="old">{t("오래된 사진순")}</option></select><div className="view-switch"><button className={!listView ? "chosen" : ""} onClick={() => setListView(false)} aria-label={t("그리드 보기")}><Grid2X2 size={16}/></button><button className={listView ? "chosen" : ""} onClick={() => setListView(true)} aria-label={t("목록 보기")}><List size={17}/></button></div></div></div>
      <div className="filter-row"><div className="tabs">{!room && page === "rooms" ? ["전체", "여행", "모임", "업무", "개인"].map(f => <button className={filter === f ? "tab selected-tab" : "tab"} onClick={() => setFilter(f)} key={f}>{t(f)}{f === "전체" && <span>{rooms.length}</span>}</button>) : <span className="gallery-hint"><ShieldCheck size={15}/>{page === "private" ? t("나에게만 보이는 사진") : room ? t("저장과 공개는 따로, 내 선택대로") : t("공개 범위를 직접 관리하세요")}</span>}</div><label className="search"><Search size={16}/><input aria-label={t("방 또는 사진 검색")} value={query} onChange={e => setQuery(e.target.value)} placeholder={!room && page === "rooms" ? t("방 이름으로 검색") : t("사진 검색")}/><span>⌘ K</span></label></div>
      {!room && page === "rooms" ? <div className={`room-grid ${listView ? "room-list" : ""}`}>{filteredRooms.map((r, i) => <article className="room-card" key={r.id}><button className="room-cover" style={{ background: r.color }} onClick={() => { setActiveRoom(r.id); setQuery(""); setSelected([]); }} aria-label={locale === "en" ? `Open ${roomTitle(r)}` : `${roomTitle(r)} 열기`}>{r.image ? <img src={r.image} alt={roomTitle(r)}/> : <FolderOpen size={56} strokeWidth={1}/>}<span className={`category-badge category-${r.category}`}>{r.category === "여행" ? "↗" : r.category === "모임" ? "♧" : r.category === "업무" ? "▣" : "◇"} {t(r.category)}</span><span className="cover-arrow"><ArrowRight size={17}/></span></button><div className="room-card-body"><div className="room-card-title"><button onClick={() => { setActiveRoom(r.id); setSelected([]); }}>{roomTitle(r)}</button><button className="icon-button" title={locale === "en" ? `Manage ${roomTitle(r)}` : `${roomTitle(r)} 관리`} onClick={() => { setCameraRoom(r.id); setModal("room-options"); }}><MoreHorizontal size={19}/></button></div><p>{roomSummary(r)}</p><div className="room-card-footer"><div className="room-metrics"><span><Images size={13}/>{number(photos.filter(p => p.roomId === r.id).length)}</span><span><Users size={13}/>{r.members === 1 ? t("나만") : r.members}</span></div><div className="avatar-stack">{Array.from({ length: Math.min(r.members, 3) }, (_, n) => <span key={n} style={{ background: ["#dfb995", "#adba9f", "#d7b6a7"][(n + i) % 3] }}>{["J", "S", "M"][n]}</span>)}{r.members > 3 && <span className="extra-avatar">+{number(r.members - 3)}</span>}</div></div><div className="room-updated"><span className="updated-dot"/>{roomActivity(r)}</div><button className="folder-capture-button" onClick={() => startCollect(r.id)} aria-label={locale === "en" ? "Add photos to " + roomTitle(r) : roomTitle(r) + "에 사진 추가"}><ImagePlus size={15}/>{t("이 폴더에 사진 추가")}<ArrowRight size={14}/></button></div></article>)}</div> : <div className={listView ? "gallery-list" : ""}>{gallery(visiblePhotos)}</div>}
      {((page === "rooms" && !room && !filteredRooms.length) || ((room || page !== "rooms") && !visiblePhotos.length)) && <div className="empty"><FolderOpen size={38}/><h3>{query ? t("검색 결과가 없어요") : t("아직 담긴 순간이 없어요")}</h3><p>{query ? t("다른 검색어로 찾아보세요.") : t("촬영하거나 사진을 추가해 첫 순간을 남겨보세요.")}</p>{!query && <button className="primary-button" onClick={openCollect}><Camera size={16}/>{t("첫 사진 담기")}</button>}</div>}
      </section>
      {!room && page === "rooms" && photos.length > 0 && <section className="recent-section"><div className="section-heading"><div className="recent-title"><h2>{t("최근 담은 순간")}</h2><span>{t("여러 방의 사진을 한눈에")}</span></div><button className="text-button" onClick={() => navigate("private")}>{t("내 사진 모아보기")}<ArrowRight size={15}/></button></div>{gallery(photos.slice(0,5), true)}</section>}
      <footer className="main-footer"><span><LockKeyhole size={13}/>{t("담는 건 자유롭게, 공유는 선택적으로.")}</span><span><Link href={`/${locale}`}>{locale === "ko" ? "Memolumi 소개" : "About Memolumi"} ↗</Link></span></footer>
    </main>
    <nav className="mobile-tabs" aria-label={locale === "en" ? "Main navigation" : "주요 메뉴"}>
      <button aria-current={page === "rooms" ? "page" : undefined} onClick={()=>navigate("rooms")}><FolderOpen size={21}/><span>{t("내 방")}</span></button>
      <button aria-current={page === "private" ? "page" : undefined} onClick={()=>navigate("private")}><LockKeyhole size={21}/><span>{t("나만 보기")}</span></button>
      <button className="tab-camera" onClick={openCollect}><span><ImagePlus size={25}/></span><small>{t("순간 담기")}</small></button>
      <button aria-current={page === "shared" ? "page" : undefined} onClick={()=>navigate("shared")}><Users size={21}/><span>{t("공유한 사진")}</span></button>
      <button onClick={()=>setModal("profile")}><span className="tab-account">S</span><span>{t("내 계정")}</span></button>
    </nav>
    </div>
    {selected.length > 0 && <div className="selection-bar"><button onClick={() => setSelected([])} aria-label={t("선택 해제")}><X size={17}/></button><strong>{formatCount(locale, selected.length, "selected")}</strong><button onClick={() => { setAudience("방 전체"); setModal("share"); }}><Users size={16}/>{t("공개 설정")}</button><button onClick={async () => { for (const p of photos.filter(p => selected.includes(p.id))) await download(p); }}><ArrowDownToLine size={16}/>{t("다운로드")}</button></div>}
    {toast && <div className="toast" role="status"><Check size={17}/>{t(toast)}</div>}
    {saveError && <div className="save-error" role="alert">{t("기기에 저장하지 못했어요.")}<button onClick={() => saveWorkspace(rooms, photos, viewerId).then(() => setSaveError(false)).catch(() => setToast("저장공간을 확인해 주세요"))}>{t("다시 시도")}</button></div>}
    <input ref={file} hidden type="file" accept="image/*" multiple onChange={e => importPhotos(e.target.files)}/>
    {modal && <div className="modal-backdrop" onClick={() => { if (modal !== "camera" && !busy) setModal(null); }}><section className={`modal ${modal === "camera" ? "camera-modal" : ""}`} role="dialog" aria-modal="true" aria-label={modal === "create" ? t("새 방 만들기") : t("사진 관리")} onClick={e => e.stopPropagation()}><button className="close-modal icon-button" aria-label={t("닫기")} onClick={closeModal}><X size={21}/></button>
      {modal === "join" && <><div className="modal-symbol"><Users/></div><h2>{t("초대받은 폴더에 참여할까요?")}</h2><p>{t("참여하면 멤버에게 공개된 사진을 보고, 내 사진도 이 폴더에 담을 수 있어요.")}</p><button className="primary-button full" disabled={busy || !ready} onClick={joinFolder}>{t("폴더 참여하기")}</button></>}
      {modal === "create" && <><div className="modal-symbol"><FolderOpen/></div><h2>{t("어떤 순간을 담을까요?")}</h2><p>{t("목적에 맞는 방을 만들고, 처음부터 제자리에.")}</p><form onSubmit={createRoom}><label>{t("방 이름")}<input autoFocus required maxLength={40} placeholder={t("예: 우리들의 가을 여행")} value={roomName} onChange={e => setRoomName(e.target.value)}/></label><details className="folder-extra"><summary>{t("분류와 설명 추가 · 선택")}</summary><label>{t("어떤 방인가요?")}</label><div className="category-select">{["여행", "모임", "업무", "개인"].map(c => <button type="button" className={category === c ? "active" : ""} key={c} onClick={() => setCategory(c)}>{t(c)}</button>)}</div><label>{t("한 줄 소개")}<small>{t("선택")}</small><input maxLength={100} placeholder={t("이 방을 소개해 주세요")} value={description} onChange={e => setDescription(e.target.value)}/></label></details><div className="info-box"><LockKeyhole size={17}/>{t("새 사진은 나만 볼 수 있어요. 공개 여부는 나중에 정하세요.")}</div><button className="primary-button full" disabled={!roomName.trim() || !ready || busy}>{t("폴더 만들고 사진 모으기")}<ArrowRight size={17}/></button></form></>}
      {modal === "choose-folder" && <><div className="modal-symbol"><FolderOpen/></div><h2>{t("어디에 담을까요?")}</h2><p>{t("사진을 담을 폴더를 선택하세요.")}</p><button className="new-folder-choice" onClick={() => setModal("create")}><Plus size={20}/>{t("새 폴더 만들기")}<ArrowRight size={16}/></button><div className="folder-choices">{rooms.map(r => <button key={r.id} onClick={() => startCollect(r.id)}>{r.image ? <img src={r.image} alt=""/> : <FolderOpen size={26}/>}<div><strong>{roomTitle(r)}</strong><small>{t(r.category)}</small></div><Camera size={19}/></button>)}</div></>}
      {modal === "collect" && <><div className="modal-symbol"><ImagePlus/></div><h2>{roomTitle(rooms.find(r => r.id === cameraRoom))}</h2><p>{t("좋아하는 앱으로 찍은 사진을 여기에 모으세요.")}</p><button className="primary-button full" disabled={saving} onClick={() => file.current?.click()}><ImagePlus size={18}/>{saving ? t("저장 중…") : t("기기에서 사진 선택")}</button><button className="secondary-button full" disabled={saving} onClick={() => startCapture(cameraRoom)}><Camera size={18}/>{t("사진 촬영")}</button><div className="info-box"><LockKeyhole size={17}/>{t("새 사진은 나만 볼 수 있어요. 공개 여부는 나중에 정하세요.")}</div>{sessionIds.length > 0 && <><p>{formatCount(locale, sessionIds.length, "saved")}</p><button className="primary-button full" disabled={saving} onClick={finishCapture}>{t("폴더에서 보기")}</button></>}</>}
      {modal === "camera" && <><div className="shooting-heading"><span className="shooting-icon"><FolderOpen size={22}/></span><div><small>{t("지금 저장되는 폴더")}</small><h2>{roomTitle(rooms.find(r => r.id === cameraRoom))}</h2></div></div><p>{t("한 장 찍어도 카메라는 그대로. 계속 찍으면 이 폴더에 쌓여요.")}</p>
      <div className={"camera-view " + (flash ? "shutter-flash" : "")}><video ref={video} autoPlay playsInline muted onLoadedData={() => setCameraReady(true)}/>{cameraError ? <div className="camera-fallback"><Camera size={38}/><p>{t(cameraError)}</p><button onClick={() => file.current?.click()}>{t("기기에서 사진 선택")}</button></div> : !cameraReady && <div className="camera-fallback"><Camera size={38}/><p>{t("카메라를 준비하고 있어요")}</p></div>}<span className="camera-room"><LockKeyhole size={12}/>{instant ? t("공유됨") : t("나만 보기")}</span><span className="session-counter">{formatCount(locale, sessionIds.length, "photos")}</span></div>
      <div className="shooting-status" role="status"><span><span className={saveError ? "status-error" : "status-dot"}/>{photos.some(p=>sessionIds.includes(p.id)&&p.uploadStatus==="failed") ? t("전송 실패 · 아래에서 재전송") : persistStatus === "saving" || photos.some(p=>sessionIds.includes(p.id)&&p.uploadStatus==="pending") ? t("업로드 중") : saveError ? t("저장을 다시 시도해 주세요") : t("서버 저장됨")}</span><span>{t("이번 촬영")}: {number(sessionIds.length)}</span></div>
      <div className="camera-controls"><button className="secondary-button" onClick={() => file.current?.click()} disabled={saving}><ImagePlus size={19}/>{saving ? t("저장 중…") : t("사진 추가")}</button><button className="shutter" onClick={capture} aria-label={t("사진 촬영")} disabled={!cameraReady || !!cameraError || saving}><span/></button><button className="secondary-button" onClick={finishCapture} disabled={saving}><Check size={18}/>{t("촬영 완료")}</button></div>
      {photos.some(p=>p.roomId===cameraRoom&&p.uploadStatus==="failed") && <button className="retry-uploads" onClick={()=>setPhotos(old=>old.map(p=>p.roomId===cameraRoom&&p.uploadStatus==="failed"?{...p,uploadStatus:"pending"}:p))}>{t("실패한 사진 다시 전송")}</button>}<div className="session-filmstrip" aria-label={t("이번에 찍은 사진")}>{sessionIds.length ? photos.filter(p => sessionIds.includes(p.id)).map(p => <img key={p.id} src={p.src} alt={photoTitle(p)}/>) : <span><Images size={19}/>{t("찍은 사진이 여기에 차곡차곡 보여요")}</span>}</div>
      <details className="capture-settings"><summary>{t("공개 설정")}</summary><label className="toggle-row"><span><Users size={17}/>{t("촬영 즉시 공개")}</span><input type="checkbox" checked={instant} onChange={e => setInstant(e.target.checked)}/></label><p>{t("공개한 사진만 폴더 멤버에게 보입니다. 비공개 사진은 촬영자만 볼 수 있어요.")}</p></details><p className="local-note">{t("사진은 비공개 클라우드에 저장됩니다. 전송 실패 시 기기에 남겨 재시도해요.")}</p></>}
      {modal === "share" && <><div className="modal-symbol"><Users/></div><h2>{formatCount(locale, selected.length, "sharing")}</h2><p>{t("사진을 보관하는 것과 공개하는 것은 별개예요.")}</p><div className="audience-options">{["나만 보기", "방 전체", "선택한 사람"].map(a => <label key={a}><input type="radio" name="audience" checked={audience === a} onChange={() => setAudience(a)}/><span><strong>{t(a)}</strong><small>{a === "나만 보기" ? t("비공개 사진함에 보관해요") : a === "방 전체" ? t("방의 멤버에게 공개하도록 설정해요") : t("공유할 사람을 직접 선택해요")}</small></span></label>)}</div>{audience === "선택한 사람" && <div className="info-box">{t("특정 멤버만 선택하는 기능은 준비 중이에요. 현재는 나만 보기와 폴더 전체 공개를 지원합니다.")}</div>}<p className="local-note">{t("공개한 사진만 폴더 멤버에게 보입니다. 비공개 사진은 촬영자만 볼 수 있어요.")}</p><button className="primary-button full" disabled={audience === "선택한 사람" || busy} onClick={shareSelection}>{t("설정 저장")}<Check size={16}/></button></>}
      {modal === "invite" && <><div className="modal-symbol"><Link2/></div><h2>{t("함께 담으면 더 특별하니까")}</h2><p>{roomTitle(inviteRoom)}{t("· 7일간 유효한 초대 링크")}</p><div className="qr-box">{qr && <img src={qr} alt={t("방 초대 링크 QR 코드")}/>}</div><div className="copy-link"><input readOnly value={inviteUrl}/><button aria-label={t("초대 링크 복사")} disabled={!inviteUrl} onClick={async () => { try { await navigator.clipboard.writeText(inviteUrl); setToast("링크를 복사했어요"); } catch { setToast("링크를 선택해 직접 복사해 주세요"); } }}><Copy size={18}/></button></div><div className="info-box">{t("링크를 받은 사람은 폴더에 참여할 수 있어요. 다른 기기에서는 접속 가능한 서비스 주소로 초대해 주세요.")}</div></>}
      {modal === "room-options" && <><h2>{roomTitle(inviteRoom)}</h2><p>{t("이 방에서 새로운 순간을 함께 모아보세요.")}</p><button className="option-button" onClick={() => invite(cameraRoom)}><Link2 size={18}/>{t("초대 링크 · QR 보기")}<ChevronRight size={16}/></button><button className="option-button" onClick={() => { setActiveRoom(cameraRoom); setPage("rooms"); setModal(null); }}><Images size={18}/>{t("방의 사진 보기")}<ChevronRight size={16}/></button></>}
      {modal === "help" && <><div className="modal-symbol"><Sparkles/></div><h2>{t("처음부터 제자리에")}</h2><p>{t("Memolumi을 사용하는 가장 간단한 방법.")}</p><div className="guide-step"><b>01</b><div><strong>{t("목적에 맞는 방 만들기")}</strong><p>{t("여행, 모임, 업무, 나만의 기록까지.")}</p></div></div><div className="guide-step"><b>02</b><div><strong>{t("찍어둔 사진 모으기")}</strong><p>{t("기기에서 사진을 골라 같은 폴더에 추가하세요.")}</p></div></div><div className="guide-step"><b>03</b><div><strong>{t("필요한 사진만 공개하기")}</strong><p>{t("사진을 선택하고 공개 범위를 설정하세요.")}</p></div></div><div className="info-box">{t("촬영 사진은 서버에 저장되고, 공개한 사진만 초대받은 멤버와 공유됩니다.")}</div></>}
      {modal === "storage" && <><div className="modal-symbol"><CloudCheck/></div><h2>{t("사진은 클라우드에 있어요")}</h2><p>{t("사진은 비공개 클라우드에 보관됩니다. 저장용 사진은 최대 2560픽셀 JPEG로 변환됩니다.")}</p><div className="info-box">{t("게스트 사진은 이 브라우저에서만 접근할 수 있어요. 로그인해 계정에 연결하면 다른 기기에서도 다시 볼 수 있습니다. 로그인 연결 전에는 쿠키를 삭제하지 마세요.")}</div><button className="primary-button full" onClick={() => { setModal(null); navigate("private"); }}>{t("내 사진 확인하기")}</button></>}
      {modal === "profile" && <><div className="profile-avatar large">{account?.name.slice(0,1).toUpperCase() || "S"}</div><h2>{account ? account.name : t("내 사진, 계정으로 안전하게")}</h2><p>{account ? t("다른 기기에서도 같은 계정으로 내 폴더를 이어보세요.") : t("로그인하면 이 브라우저에서 찍은 사진과 폴더가 내 계정에 연결돼요.")}</p>
      {account ? <div className="account-identity"><strong>{account.provider === "apple.com" ? "Apple" : "Google"}</strong>{account.email && <span>{account.email}</span>}</div> : <><div className="social-login"><button disabled={authBusy || !authConfigured || !ready || hasUnsentPhotos} onClick={()=>socialLogin("google")}><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-1.99 3.02v2.51h3.23c1.89-1.74 2.98-4.3 2.98-7.36Z"/><path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.23-2.51c-.9.6-2.06.96-3.39.96-2.61 0-4.82-1.76-5.61-4.12H3.05v2.59A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.39 13.92a6 6 0 0 1 0-3.84V7.49H3.05a10 10 0 0 0 0 9.02l3.34-2.59Z"/><path fill="#EA4335" d="M12 5.96c1.47 0 2.79.51 3.83 1.51L18.7 4.6A9.62 9.62 0 0 0 12 2a10 10 0 0 0-8.95 5.49l3.34 2.59C7.18 7.72 9.39 5.96 12 5.96Z"/></svg>{t("Google로 계속하기")}</button><button className="apple-login" disabled={authBusy || !authConfigured || !ready || hasUnsentPhotos} onClick={()=>socialLogin("apple")}><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.05 12.54c.02 3.17 2.78 4.22 2.81 4.23-.02.07-.44 1.51-1.45 3-.87 1.28-1.78 2.55-3.2 2.57-1.4.03-1.85-.83-3.45-.83-1.6 0-2.1.81-3.43.86-1.37.05-2.41-1.38-3.29-2.65-1.79-2.6-3.15-7.35-1.31-10.56a5.1 5.1 0 0 1 4.33-2.62c1.35-.03 2.63.91 3.45.91.83 0 2.37-1.12 4-.95.68.03 2.59.27 3.82 2.08-.1.06-2.28 1.33-2.28 3.96ZM14.42 4.78c.73-.88 1.22-2.1 1.08-3.32-1.05.04-2.32.7-3.07 1.58-.68.78-1.28 2.02-1.12 3.21 1.18.09 2.38-.6 3.11-1.47Z"/></svg>{t("Apple로 계속하기")}</button></div>{!authConfigured && <div className="info-box">{t("전용 Firebase 프로젝트 연결을 준비 중이에요. 지금은 게스트로 사용할 수 있어요.")}</div>}<p className="local-note">{t("처음 로그인하면 현재 게스트 폴더와 사진을 선택한 계정에 옮깁니다. 본인 계정인지 확인해 주세요.")}</p></>}
      {hasUnsentPhotos && <div className="info-box">{t("전송 중이거나 실패한 사진을 먼저 업로드해 주세요. 계정을 바꿀 때 사진이 남지 않도록 보호하고 있어요.")}</div>}{authError && <p className="auth-error" role="alert">{t(authError)}</p>}{authBusy && <p role="status">{t("로그인 처리 중…")}</p>}
      <div className="account-details"><span>{t("내 방")}<strong>{formatCount(locale, rooms.length, "rooms")}</strong></span><span>{t("직접 추가한 사진")}<strong>{formatCount(locale, photos.filter(p=>p.mine !== false).length, "photos")}</strong></span></div><button className="option-button" onClick={()=>setModal("storage")} disabled={authBusy}><CloudCheck size={18}/>{t("저장공간 알아보기")}<ChevronRight size={16}/></button><button className="option-button" onClick={()=>setModal("help")} disabled={authBusy}><CircleHelp size={18}/>{t("도움말 및 가이드")}<ChevronRight size={16}/></button>{account && <button className="logout-button" disabled={authBusy || hasUnsentPhotos} onClick={logout}>{t("로그아웃")}</button>}</>}
      {modal === "notifications" && <><div className="modal-symbol"><Bell/></div><h2>{t("모두 확인했어요")}</h2><p>{t("아직 새로운 알림이 없어요.")}</p><div className="info-box">{t("새 사진은 기본적으로 비공개예요. 준비가 되면 원하는 사진만 공유해 보세요.")}</div></>}
    </section></div>}
    {preview && <div className="lightbox" role="dialog" aria-modal="true" aria-label={photoTitle(preview)} onClick={() => setPreview(null)}><button className="lightbox-close" onClick={() => setPreview(null)} aria-label={t("닫기")}><X/></button><img src={preview.src} alt={photoTitle(preview)} onClick={e => e.stopPropagation()}/><div className="lightbox-toolbar" onClick={e => e.stopPropagation()}><div><strong>{photoTitle(preview)}</strong><span>{roomTitle(rooms.find(r => r.id === preview.roomId))} · {preview.shared ? t("공유됨") : t("나만 보기")}</span><time dateTime={new Date(preview.created).toISOString()}>{formatCapturedAt(locale, preview.created)}</time></div><button className="secondary-button" onClick={() => download(preview)}><ArrowDownToLine size={17}/>{t("다운로드")}</button><button className="primary-button" disabled={preview.mine === false || preview.uploadStatus !== "uploaded"} onClick={() => { setSelected([preview.id]); setPreview(null); setModal("share"); }}>{t("공개 설정")}</button></div></div>}
  </div>;
}
