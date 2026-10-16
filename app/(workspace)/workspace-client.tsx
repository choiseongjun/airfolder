/* eslint-disable @next/next/no-location-assign-relative-destination -- A full navigation isolates read-only browsing from authenticated workspace state. */
"use client";

// Photo URLs require session cookies or refer to local data; an image optimizer cannot fetch them.
/* eslint-disable @next/next/no-img-element */
import WorkspaceLoading from '../workspace-loading';
import BrandMark from '@/app/brand-mark';
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import PolicyGate from '../policy-gate';
import {BlockedUsers} from '../safety-actions';
import EmailLogin from "../email-login";
import AccountNudge from "../account-nudge";
import MemoryStudio from "../memory-studio";
import { ArrowDownToLine, ArrowLeft, ArrowRight, Bell, BookOpen, Camera, Heart, Check, ChevronRight, CircleHelp, CloudCheck, Copy, Globe2, FolderOpen, Grid2X2, ImagePlus, Images, Link2, List, LockKeyhole, MoreHorizontal, Plus, Search, ShieldCheck, Sparkles, Users, X } from "lucide-react";
import QRCode from "qrcode";
import {hasNativeBridge,sendNative} from "@/lib/native-bridge";
import MoveAlbum from "../move-album";
import DeleteAlbum from "../delete-album";
import AlbumTrash from "../album-trash";
import ShareLinks from "../share-links";
import MembersPanel from "../members-panel";
import Groups from "../groups";
import {Recaps,Notifications} from "../group-memories";
import MemberPicker from "../member-picker";
import MediaView from "../media-view";
import FaceSearch from "../face-search";
import StorageMeter from "../storage-meter";
import AlbumBook from "../album-book";
import { WorkspaceStory, StudioTeaser, EmptyBookshelf } from "../workspace-delight";
import "../workspace-delight.css";
import "../memory-bookshelf.css";
import Memories, { Discussion } from "../memories";
import AnalyticsPreference from "../analytics-preference";
import { trackAuthEvent } from "@/lib/auth-analytics";
import { getAdditionalUserInfo, GoogleAuthProvider, OAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { authConfigured, firebaseAuth } from "@/lib/firebase-client";
import { api, initializeSession } from "@/lib/client-api";
import { formatCapturedAt, formatCount, localeTag, translate, type Locale } from "../i18n";
import { isLocale } from "@/lib/locale";
import { savedBrowserLocale, saveBrowserLocale } from "@/lib/browser-locale";

type Account = { name: string; email: string | null; provider: string };
type Room = { id: string; groupId?:string|null; name: string; category: string; description: string; image: string; members: number; count: number; color: string; updated: string; updatedAt?: number; mine?: boolean };
type Photo = { id: string; roomId: string; src: string; name: string; shared: boolean; audience?: string; recipients?: string[]; mediaType?: string; mime?: string; originalAvailable?: boolean; hasPreview?: boolean; localFile?: Blob; created: number; demo?: boolean; mine?: boolean; uploadStatus?: "pending" | "uploading" | "uploaded" | "failed" };
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

export default function Home({ initialLocale, browsing=false }: { initialLocale: Locale; browsing?:boolean }) {
  const [locale, setLocale] = useState<Locale>(initialLocale); const [localeReady, setLocaleReady] = useState(false);
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
    return new Intl.DateTimeFormat(localeTag[locale], {year:"numeric",month:"short",day:"numeric"}).format(value.updatedAt);
  }
  useEffect(() => {
    const linked = new URLSearchParams(window.location.search).get("lang");
    const saved = savedBrowserLocale();
    // Migrate legacy localStorage preferences without saving an automatic guess.
    if (saved) saveBrowserLocale(saved);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Restore this browser's legacy preference after hydration.
    setLocale(isLocale(linked) ? linked : saved ?? initialLocale);
    setLocaleReady(true);
  }, [initialLocale]);
  useEffect(() => {
    if (!localeReady) return;
    document.documentElement.lang = locale;
    document.title = locale === "en" ? "Memonestia — Your moments. Together." : "Memonestia — 함께 쌓는 우리의 기록";
    document.querySelector('meta[name="description"]')?.setAttribute("content", translate(locale, "각자 찍은 사진을 모아 함께한 날들을 기록하고, 나누고 싶은 순간만 공유하세요."));
  }, [locale, localeReady]);
  function changeLanguage(value: string) {
    if (value !== "en" && value !== "ko") return;
    setLocale(value); const url = new URL(window.location.href); if (url.searchParams.has("lang")) { url.searchParams.set("lang", value); window.history.replaceState(window.history.state, "", url); }
    saveBrowserLocale(value);
  }

  const [studio,setStudio]=useState(false);
  function openStudio(){if(browsing){window.location.href=`/?lang=${locale}&studio=1`;return;}const url=new URL(window.location.href);url.searchParams.set("studio","1");window.history.pushState({...window.history.state,studio:true},"",url);setStudio(true);}
  function closeStudio(){setStudio(false);const url=new URL(window.location.href);url.searchParams.delete("studio");window.history.replaceState(window.history.state,"",url);}
  useEffect(()=>{const sync=()=>setStudio(new URLSearchParams(window.location.search).get("studio")==="1");const timer=window.setTimeout(sync,0);window.addEventListener("popstate",sync);return()=>{window.clearTimeout(timer);window.removeEventListener("popstate",sync);};},[]);
  const [nativeApp,setNativeApp]=useState(false),[incomingCount,setIncomingCount]=useState(0);
  const [activeGroup,setActiveGroup]=useState<string|null>(null);
  const [albumStart,setAlbumStart]=useState(""),[albumEnd,setAlbumEnd]=useState("");
  const [unreadCount,setUnreadCount]=useState(0);
  const [folderView, setFolderView] = useState<"timeline" | "photos" | "book">("timeline");
  const [discussionPhoto, setDiscussionPhoto] = useState<string | null>(null);
  const [linkPhotos,setLinkPhotos]=useState<string[]>([]);
  const [draftPhotos,setDraftPhotos]=useState<string[]>([]),[draftVersion,setDraftVersion]=useState(0);
  const [rooms, setRooms] = useState<Room[]>([]); const [photos, setPhotos] = useState<Photo[]>([]);
  const [account, setAccount] = useState<Account | null>(null); const [authBusy, setAuthBusy] = useState(false); const [authError, setAuthError] = useState("");
  const [viewerId, setViewerId] = useState(""); const [serverError, setServerError] = useState(false); const [retryConnection, setRetryConnection] = useState(0); const [busy, setBusy] = useState(false); const [inviteUrl, setInviteUrl] = useState(""); const [joinToken, setJoinToken] = useState(""); const uploading = useRef(new Set<string>());
  const [ready, setReady] = useState(false); const [page, setPage] = useState("rooms"); const [filter, setFilter] = useState("전체"); const [query, setQuery] = useState("");
  const [activeRoom, setActiveRoom] = useState<string | null>(null); const [modal, setModal] = useState<string | null>(null); const [toast, setToast] = useState("");
  const [selected, setSelected] = useState<string[]>([]); const [roomName, setRoomName] = useState(""); const [category, setCategory] = useState("개인"); const [description, setDescription] = useState("");
  const [cameraRoom, setCameraRoom] = useState(""); const [sessionIds, setSessionIds] = useState<string[]>([]); const [cameraReady, setCameraReady] = useState(false); const [flash, setFlash] = useState(false); const [persistStatus, setPersistStatus] = useState("saved"); const [instant, setInstant] = useState(false); const [cameraError, setCameraError] = useState("");
  const [recipients,setRecipients]=useState<string[]>([]);
  const [sort, setSort] = useState("recent"); const [listView, setListView] = useState(false); const [audience, setAudience] = useState("방 전체");
  const [qr, setQr] = useState(""); const [preview, setPreview] = useState<Photo | null>(null); const [saving, setSaving] = useState(false); const [saveError, setSaveError] = useState(false);
  const selectGroup=useCallback((id:string|null)=>{setActiveGroup(id);setActiveRoom(null);setPreview(null);setPage("rooms");setQuery("");setSelected([]);},[]);
  const [navigationReady,setNavigationReady]=useState(false);
  const lastLocation=useRef("");
  const locationKey=(group:string|null,album:string|null,photo:string|null,section:string,view:string)=>JSON.stringify([group,album,photo,section,view]);
  const restoreLocation=useCallback(()=>{
    const params=new URLSearchParams(window.location.search);
    const photo=photos.find(p=>p.id===params.get("photo"))||null;
    const album=rooms.find(r=>r.id===params.get("album"));
    const group=album?(album.groupId||null):params.get("group")||null;
    const section=["private","shared"].includes(params.get("section")||"")?params.get("section")!:"rooms";
    const view=params.get("view")==="book"?"book":params.get("view")==="photos"?"photos":"timeline";
    lastLocation.current=locationKey(group,album?.id||null,photo?.id||null,section,view);
    setActiveGroup(group);setActiveRoom(album?.id||null);setPreview(photo);setPage(section);setFolderView(view);
    setModal(params.get("help")==="1"?"help":params.get("login")==="1"?"profile":null);setSelected([]);setQuery("");
  },[photos,rooms]);
  useEffect(()=>{
    if(!ready||navigationReady)return;
    // Restore only after authorized workspace data is available, including on reload.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Hydrate URL state after the permission-filtered data arrives.
    restoreLocation();setNavigationReady(true);
  },[ready,navigationReady,restoreLocation]);
  useEffect(()=>{
    if(!navigationReady)return;
    window.addEventListener("popstate",restoreLocation);
    return()=>window.removeEventListener("popstate",restoreLocation);
  },[navigationReady,restoreLocation]);
  useEffect(()=>{
    if(!navigationReady)return;
    const key=locationKey(activeGroup,activeRoom,preview?.id||null,page,folderView);
    if(lastLocation.current===key)return;
    const previous=lastLocation.current;lastLocation.current=key;
    // Closing a detail through the UI consumes its entry just like browser Back.
    if(!modal&&window.history.state?.memolumiParent===key){window.history.back();return;}
    const url=new URL(window.location.href);
    if(url.searchParams.get("album")!==activeRoom||folderView!=="book")url.searchParams.delete("bookPage");
    for(const [name,value] of Object.entries({group:activeGroup,album:activeRoom,photo:preview?.id,section:page==="rooms"?null:page,view:folderView==="timeline"?null:folderView})){
      if(value)url.searchParams.set(name,value);else url.searchParams.delete(name);
    }
    window.history.pushState({memolumiParent:previous},"",url);
  },[navigationReady,activeGroup,activeRoom,preview?.id,page,folderView,modal]);
  const autoEnteredBrowse=useRef(false);
  useEffect(()=>{
    if(!browsing||!navigationReady||activeRoom||!rooms.length||autoEnteredBrowse.current)return;
    autoEnteredBrowse.current=true;
    // A fresh "explore albums" visit should land straight in a book, not an album grid.
    setActiveRoom(rooms[0].id);setFolderView("book");
  },[browsing,navigationReady,activeRoom,rooms]);
  const video = useRef<HTMLVideoElement>(null); const stream = useRef<MediaStream | null>(null); const file = useRef<HTMLInputElement>(null);
  const room = rooms.find(r => r.id === activeRoom); const inviteRoom = rooms.find(r => r.id === cameraRoom);
  const mergeRemote = useCallback((data: { rooms: Room[]; photos: Photo[]; account?: Account | null }) => {
    setRooms(data.rooms); setAccount(data.account ?? null);
    setPhotos(old => [...old.filter(p => !p.demo && p.uploadStatus !== "uploaded" && !data.photos.some(remote => remote.id === p.id)), ...data.photos]);
  }, []);
  const refreshWorkspace = useCallback(async () => { const data = await api<{rooms: Room[]; photos: Photo[]}>("/api/workspace"); mergeRemote(data); setServerError(false); }, [mergeRemote]);
  useEffect(()=>{
    if(!ready)return;let active=true;
    const poll=()=>api<{items:{unread:number}[]}>("/api/notifications").then(d=>{if(active)setUnreadCount(d.items.reduce((sum,n)=>sum+n.unread,0));}).catch(()=>{});
    void poll();const timer=setInterval(poll,45000);return()=>{active=false;clearInterval(timer);};
  },[ready,viewerId,modal]);
  useEffect(()=>{const detect=()=>{if(!browsing&&hasNativeBridge()){setNativeApp(true);sendNative("READY");}};window.addEventListener("memolumi:ready",detect);detect();return()=>window.removeEventListener("memolumi:ready",detect);},[browsing]);
  useEffect(()=>{
    const receive=(event:Event)=>{
      const data=(event as CustomEvent).detail;if(!data||!hasNativeBridge())return;
      if(data.type==="UPLOADS_CHANGED")void refreshWorkspace().catch(()=>setServerError(true));
      if(data.type==="INCOMING_AVAILABLE"){setIncomingCount(Number(data.count)||0);}
      if(data.type==="COMPOSE_RECORD"&&typeof data.folderId==="string"&&Array.isArray(data.photoIds))void refreshWorkspace().then(()=>{setDraftPhotos(data.photoIds.filter((id:unknown)=>typeof id==="string"));setDraftVersion(n=>n+1);setActiveRoom(data.folderId);setPage("rooms");setFolderView("timeline");setModal(null);}).catch(()=>setServerError(true));
      if(data.type==="NOTICE"&&typeof data.message==="string")setToast(data.message);
      if(data.type==="OPEN_FOLDER"&&typeof data.folderId==="string")void refreshWorkspace().then(()=>{setActiveRoom(data.folderId);setPage("rooms");setModal(null);setPreview(null);}).catch(()=>setServerError(true));
      if(data.type==="BACK"){
        if(preview)setPreview(null);else if(modal)setModal(null);else if(selected.length)setSelected([]);else if(activeRoom)setActiveRoom(null);else if(activeGroup)setActiveGroup(null);else if(page!=="rooms")setPage("rooms");else sendNative("BACK_UNHANDLED");
      }
    };
    window.addEventListener("memolumi:native",receive);return()=>window.removeEventListener("memolumi:native",receive);
  },[refreshWorkspace,preview,modal,selected,activeRoom,activeGroup,page]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const session = await initializeSession();
        if (cancelled) return;
        setViewerId(session.viewerId);
        try {
          if(browsing)throw new Error("BROWSE_NO_CACHE");
          const db = await database();
          const saved = await new Promise<{rooms: Room[]; photos: Photo[]} | undefined>((resolve,reject) => { const request = db.transaction("workspace").objectStore("workspace").get("server:" + session.viewerId); request.onsuccess=()=>resolve(request.result); request.onerror=()=>reject(request.error); }); db.close();
          if (!cancelled && saved) { setRooms(saved.rooms); setPhotos(saved.photos.map(p => ({...p,...(p.localFile?{src:URL.createObjectURL(p.localFile)}:{}),uploadStatus:p.uploadStatus === "uploading"?"pending" as const:p.uploadStatus}))); }
        } catch { if (!cancelled&&!browsing) setSaveError(true); }
        const data = await api<{rooms: Room[]; photos: Photo[]}>("/api/workspace");
        if (cancelled) return;
        mergeRemote(data); setReady(true); setServerError(false);
        const loginParams=new URLSearchParams(window.location.search);
        if(loginParams.get("login")==="1"){
          const returnTo=loginParams.get("returnTo");
          const signedIn=await api<{account:Account|null}>("/api/workspace");
          if(signedIn.account&&returnTo&&/^\/s\/[a-f0-9]{64}\?lang=(ko|en)$/.test(returnTo)){window.location.replace(returnTo);return;}
          setModal("profile");
        }
        const requestedGroup=new URLSearchParams(window.location.search).get("group");if(requestedGroup&&/^[a-f0-9-]{36}$/i.test(requestedGroup))setActiveGroup(requestedGroup);
        const requestedRoom=new URLSearchParams(window.location.search).get("room");if(requestedRoom&&data.rooms.some(r=>r.id===requestedRoom)){setActiveRoom(requestedRoom);setPage("rooms");}
        const token = new URLSearchParams(window.location.search).get("invite");
        if (token) { setJoinToken(token); setModal("join"); }
      } catch { if (!cancelled) { setServerError(true); setReady(false); } }
    })();
    return () => { cancelled = true; };
  }, [retryConnection, mergeRemote,browsing]);
  useEffect(() => {
    if (!ready || !viewerId || browsing) return;
    let current = true;
    saveWorkspace(rooms,photos,viewerId).then(()=>{if(current)setSaveError(false);}).catch(()=>{if(current)setSaveError(true);});
    return ()=>{current=false;};
  }, [rooms,photos,ready,viewerId,browsing]);
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
        const body = new FormData(); body.set("id",next.id); body.set("folderId",next.roomId); body.set("name",next.name); body.set("created",String(next.created)); body.set("shared",String(next.shared)); body.set("file",next.localFile || await (await fetch(next.src)).blob(),next.name);
        await api("/api/photos",{method:"POST",body});
        setPhotos(old=>old.map(p=>p.id===next.id?{...p,src:"/api/photos/"+p.id+"/content",localFile:undefined,originalAvailable:true,uploadStatus:"uploaded"}:p)); setServerError(false);
      } catch(error) { if(error instanceof Error&&/STORAGE_FULL/.test(error.message))setToast(locale==='ko'?'저장 한도에 도달해 업로드가 중단됐어요.':'Storage capacity reached. Upload stopped.'); setPhotos(old=>old.map(p=>p.id===next.id?{...p,uploadStatus:"failed"}:p)); }
      finally { uploading.current.delete(next.id); setPersistStatus("saved"); }
    })();
  },[photos,rooms,ready,viewerId,locale]);
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
  
  function startCollect(id: string) { if(browsing){setModal("help");return;} if (!ready) return; setCameraRoom(id); setActiveRoom(id); setPage("rooms"); setQuery(""); setSelected([]); setInstant(false); setSessionIds([]); setModal("collect"); }
  function openCollect() { if (activeRoom && rooms.some(r => r.id === activeRoom)) startCollect(activeRoom); else setModal(rooms.length ? "choose-folder" : "create"); }
  function beginStory(ids:string[],folder:string){
    if(!ids.length)return;
    if(photos.some(p=>ids.includes(p.id)&&p.uploadStatus!=="uploaded")){setToast(locale==="ko"?"사진 전송이 끝나면 기록으로 묶을 수 있어요.":"Finish uploading before creating a story.");return;}
    setDraftPhotos(ids);setDraftVersion(n=>n+1);setActiveRoom(folder);setPage("rooms");setFolderView("timeline");setSelected([]);setModal(null);
  }
  function finishCapture() { if(sessionIds.length){beginStory(sessionIds,cameraRoom);return;}setActiveRoom(cameraRoom);setPage("rooms");setModal(null); }
  function closeModal() { if (saving || busy || authBusy) return; if (modal === "camera") finishCapture(); else setModal(null); }
  function addPhoto(src: string, name: string, localFile?: File) { if (!ready || !cameraRoom || !rooms.some(r => r.id === cameraRoom)) return; const id = crypto.randomUUID(); setPhotos(old => [{ id, roomId: cameraRoom, src, name, localFile, mediaType:localFile&&(localFile.type.startsWith("video/")||/\.(mov|mp4|webm)$/i.test(localFile.name))?"video":"image", shared: instant, created: localFile?.lastModified&&localFile.lastModified<=Date.now()?localFile.lastModified:Date.now(), mine: true, uploadStatus: "pending" }, ...old]); setSessionIds(old => [...old, id]); setRooms(old => old.map(r => r.id === cameraRoom ? { ...r, image: r.image || src, updatedAt: Date.now() } : r)); }
  function capture() { if (!video.current?.videoWidth) return; const canvas = document.createElement("canvas"); canvas.width = video.current.videoWidth; canvas.height = video.current.videoHeight; canvas.getContext("2d")?.drawImage(video.current, 0, 0); addPhoto(canvas.toDataURL("image/jpeg", .85), `${locale === "en" ? "Photo" : "사진"} ${formatCapturedAt(locale, Date.now())}`); setFlash(true); window.setTimeout(() => setFlash(false), 150); }
  async function importPhotos(files: FileList | null) {
    if (!files) return; setSaving(true);
    try {
    const capacity=await api<{video:number;image:number;remaining:number;serviceFull:boolean}>('/api/media-limits');
    let remaining=capacity.remaining;
    if(capacity.serviceFull){setToast(locale==='ko'?'서비스 저장 한도에 도달하여 업로드가 잠시 중단됐어요.':'Uploads are paused at the service storage limit.');return;}
    for (const item of Array.from(files).slice(0,100)) {
      if (!/^(image|video)\//.test(item.type) && !/\.(heic|heif|mov|mp4|webm)$/i.test(item.name)) continue;
      if(item.size>((item.type.startsWith('video/')||/\.(mov|mp4|webm)$/i.test(item.name))?capacity.video:capacity.image)){setToast(locale==='ko'?'사진 20MB·영상 50MB 이하로 선택해 주세요.':'Choose photos up to 20 MB or videos up to 50 MB.');continue;}
      if (item.size > ((item.type.startsWith('video/')||/\.(mov|mp4|webm)$/i.test(item.name))?50:20) * 1024 * 1024) { setToast(locale==='ko'?'영상 50MB·사진 20MB 이하를 선택해 주세요.':'Choose videos up to 50 MB or photos up to 20 MB.'); continue; }
      const reserved=item.size+Math.max(item.size,1048576);
      if(reserved>remaining){setToast(locale==='ko'?'500MB 저장 한도를 넘습니다. 압축본 공간도 필요해요.':'The 500 MB storage allowance is full, including preview space.');continue;}
      remaining-=reserved;
      addPhoto(URL.createObjectURL(item),item.name,item);
    }
    } catch {setToast(locale==='ko'?'저장소 상태를 확인하지 못했어요. 다시 시도해 주세요.':'Could not check storage availability. Please retry.');} finally {setSaving(false); if(file.current)file.current.value='';}
  }
  async function createRoom(event: React.FormEvent) {
    event.preventDefault(); if(!roomName.trim() || !ready || busy)return; setBusy(true);
    try {
      const result=await api<{id:string}>("/api/folders",{method:"POST",body:JSON.stringify({name:roomName.trim(),category,description,groupId:activeGroup,startDate:albumStart||null,endDate:albumEnd||null})});
      await refreshWorkspace(); setRoomName(""); setDescription("");setAlbumStart("");setAlbumEnd(""); setFilter("전체"); startCollect(result.id);
    } catch { setToast("서버에 폴더를 만들지 못했어요. 다시 시도해 주세요."); } finally {setBusy(false);}
  }
  async function invite(id: string) {
    setCameraRoom(id); setModal("invite"); setQr(""); setInviteUrl("");
    try { const result=await api<{token:string}>("/api/invites",{method:"POST",body:JSON.stringify({folderId:id})}); const url=new URL(`/join/${result.token}`,window.location.origin); url.searchParams.set("lang",locale); setInviteUrl(url.toString()); setQr(await QRCode.toDataURL(url.toString(),{width:220,margin:1,color:{dark:"#34382e",light:"#ffffff"}})); }
    catch { setToast("초대 링크를 만들지 못했어요. 폴더 소유자만 초대할 수 있어요."); }
  }
  async function joinFolder() {
    setBusy(true);
    try {const result=await api<{folderId?:string;groupId?:string}>("/api/join",{method:"POST",body:JSON.stringify({token:joinToken})}); await refreshWorkspace(); setActiveRoom(result.folderId||null);setActiveGroup(result.groupId||null);setPage("rooms");setModal(null);const url=new URL(window.location.href);url.searchParams.delete("invite");if(result.groupId)url.searchParams.set("group",result.groupId);window.history.replaceState(null,"",url);setToast("폴더에 참여했어요");}
    catch{setToast("초대 링크가 만료되었거나 올바르지 않아요");}finally{setBusy(false);}
  }
  async function shareSelection() {
    setBusy(true);
    try{await api("/api/photos",{method:"PATCH",body:JSON.stringify({ids:selected,shared:audience!=="나만 보기",recipients:audience==="선택한 사람"?recipients:[]})});await refreshWorkspace();setLinkPhotos(audience!=="나만 보기"?[...selected]:[]);setSelected([]);setModal(audience!=="나만 보기"?"share-link":null);setToast("공개 설정을 저장했어요");}
    catch{setToast("업로드가 완료된 내 사진만 공유할 수 있어요");}finally{setBusy(false);}
  }
  const hasUnsentPhotos = photos.some(p=>p.uploadStatus !== "uploaded");
  async function clearAccountCache() {
    setActiveGroup(null);
    try { const db=await database(); await new Promise<void>((resolve,reject)=>{const tx=db.transaction("workspace","readwrite");tx.objectStore("workspace").delete("server:"+viewerId);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});db.close(); } catch { /* Server authorization still protects downloaded image endpoints. */ }
  }
  async function socialLogin(kind: "google" | "apple") {
    if(sendNative("LOGIN"))return;
    if(browsing){window.location.assign(`/?lang=${locale}&login=1`);return;}if(authBusy || !ready || hasUnsentPhotos)return; setAuthBusy(true);setAuthError("");
    void trackAuthEvent("login_start",kind,"web");
    try {
      const auth=firebaseAuth();auth.languageCode=locale;
      const provider=kind==="apple"?new OAuthProvider("apple.com"):new GoogleAuthProvider();
      if(kind==="apple"){provider.addScope("email");provider.addScope("name");provider.setCustomParameters({locale:locale==="ko"?"ko_KR":"en_US"});}else provider.setCustomParameters({prompt:"select_account"});
      const result=await signInWithPopup(auth,provider);
      try { await api("/api/auth/firebase",{method:"POST",body:JSON.stringify({idToken:await result.user.getIdToken()})});await Promise.race([trackAuthEvent("login",kind,"web").then(()=>getAdditionalUserInfo(result)?.isNewUser ? trackAuthEvent("sign_up",kind,"web") : undefined),new Promise(resolve=>setTimeout(resolve,1500))]);await clearAccountCache();window.location.reload(); }
      finally {await signOut(auth).catch(()=>{});}
    } catch(error) {
      void trackAuthEvent("login_failed",kind,"web",error);
      const code=error && typeof error==="object" && "code" in error?String(error.code):error instanceof Error?error.message:"";
      setAuthError(code==="auth/popup-blocked"?"로그인 팝업을 허용한 뒤 다시 시도해 주세요.":code==="auth/popup-closed-by-user"?"로그인을 취소했어요. 다시 시작할 수 있어요.":code==="auth/account-exists-with-different-credential"?"이 계정에 사용했던 로그인 방법으로 다시 시도해 주세요.":code==="LOGOUT_FIRST"?"다른 계정으로 로그인하려면 먼저 로그아웃해 주세요.":code==="AUTH_NOT_CONFIGURED" || code==="auth/unauthorized-domain" || code==="auth/operation-not-allowed"?"로그인 연결 설정이 아직 완료되지 않았어요.":"로그인을 완료하지 못했어요. 다시 시도해 주세요.");
    } finally {setAuthBusy(false);}
  }
  async function logout() {
    if(sendNative("LOGOUT"))return;
    if(authBusy || hasUnsentPhotos)return;setAuthBusy(true);setAuthError("");
    try {await api("/api/auth/logout",{method:"POST"});await clearAccountCache();window.location.reload();}
    catch{setAuthError("로그아웃하지 못했어요. 다시 시도해 주세요.");setAuthBusy(false);}
  }
  async function download(photo: Photo) { if(browsing){setModal("help");return;} if(sendNative("DOWNLOAD",{photoId:photo.id}))return; const link=document.createElement("a");link.href=photo.uploadStatus==="uploaded"?`/api/photos/${photo.id}/content?download=1`:photo.src;link.download=photo.name;document.body.append(link);link.click();link.remove(); }
  const filteredRooms = rooms.filter(r => (browsing&&!activeGroup||(r.groupId||null)===activeGroup) && (filter === "전체" || r.category === filter) && (roomTitle(r) + roomSummary(r) + r.name + r.description).toLocaleLowerCase(localeTag[locale]).includes(query.toLocaleLowerCase(localeTag[locale]))).sort((a,b) => sort === "name" ? roomTitle(a).localeCompare(roomTitle(b), localeTag[locale]) : 0);
  const visiblePhotos = photos.filter(p => (!activeRoom || p.roomId === activeRoom) && (page !== "private" || (!p.shared && p.mine !== false)) && (page !== "shared" || p.shared) && (photoTitle(p) + roomTitle(rooms.find(r => r.id === p.roomId)) + p.name).toLocaleLowerCase(localeTag[locale]).includes(query.toLocaleLowerCase(localeTag[locale]))).sort((a,b) => sort === "name" ? photoTitle(a).localeCompare(photoTitle(b), localeTag[locale]) : sort === "old" ? a.created - b.created : b.created - a.created);
  const selectablePhotos = visiblePhotos.filter(p=>p.mine!==false);
  const allVisibleSelected = selectablePhotos.length>0 && selectablePhotos.every(p=>selected.includes(p.id));
  const toggle = (id: string) => { if (photos.find(p=>p.id===id)?.mine === false) return; setSelected(old => old.includes(id) ? old.filter(v => v !== id) : [...old, id]); };
  const gallery = (items: Photo[], compact = false) => <div className={`photo-grid ${compact ? "compact" : ""}`}>{items.map(p => <article className={`photo-item ${sessionIds.includes(p.id) && p.uploadStatus === "uploaded" ? "memory-just-added" : ""} ${selected.includes(p.id) ? "selected" : ""}`} key={p.id}><button className="photo-open" onClick={() => setPreview(p)} aria-label={locale === "en" ? `View ${photoTitle(p)}` : `${photoTitle(p)} 크게 보기`}><MediaView src={p.src} name={photoTitle(p)} mediaType={p.mediaType}/></button><button disabled={p.mine === false} className="select-photo" aria-label={locale === "en" ? `Select ${photoTitle(p)}` : `${photoTitle(p)} 선택`} onClick={() => toggle(p.id)}>{selected.includes(p.id) && <Check size={13} />}</button><span className={`privacy-tag ${p.shared ? "is-shared" : ""}`}>{p.shared ? <Users size={11} /> : <LockKeyhole size={11} />}{p.audience==="selected"?(locale==="ko"?"선택 공개":"Selected members"):p.shared ? t("공유됨") : t("나만 보기")}</span><div className="photo-caption"><span>{roomTitle(rooms.find(r => r.id === p.roomId))}</span><span>{p.uploadStatus === "failed" ? <button onClick={()=>setPhotos(old=>old.map(item=>item.id===p.id?{...item,uploadStatus:"pending"}:item))}>{t("다시 전송")}</button> : p.uploadStatus === "pending" || p.uploadStatus === "uploading" ? t("업로드 중") : p.mine === false ? t("멤버 사진") : t("서버 저장됨")}</span></div></article>)}</div>;
  return <div className="app-shell" lang={locale} data-native={nativeApp} data-browsing={browsing}>
    <WorkspaceStory locale={locale} onCreate={openStudio} onHelp={()=>setModal("help")}/>
    <div className="main-shell"><header className="topbar"><Link className="brand app-brand" href="/" aria-label={t("Memonestia 홈")}><span className="brand-icon"><BrandMark/></span>memonestia<span className="brand-dot">.</span></Link><div className="header-tools"><label className="language-picker"><Globe2 size={15}/><select aria-label="Language / 언어" disabled={!localeReady} value={locale} onChange={e => changeLanguage(e.target.value)}><option value="en">English</option><option value="ko">한국어</option></select></label><span className="local-status"><span />{t("개인 작업공간")}</span><button className="icon-button" title={t("알림")} onClick={() => setModal("notifications")}><Bell size={18} />{unreadCount>0&&<i aria-label={locale==="ko"?`새 소식 ${unreadCount}개`:`${unreadCount} unread updates`}/>}</button><button className="header-avatar" onClick={() => setModal("profile")} aria-label={t("내 계정")}>S</button></div></header>
    {(busy || authBusy || photos.some(p=>p.uploadStatus==="uploading")) && <div className="workspace-progress" role="status" aria-live="polite"><span className="activity-spinner" aria-hidden="true"/>{authBusy?(locale==="ko"?"로그인 연결 중…":"Connecting your account…"):busy?(locale==="ko"?"변경사항 저장 중…":"Saving changes…"):(locale==="ko"?"사진을 안전하게 올리는 중…":"Uploading your memories…")}</div>}
    {ready&&!browsing&&<PolicyGate key={viewerId} ko={locale==="ko"}/>}
    <main>{browsing&&<div className="browse-ribbon"><span><BookOpen size={15}/>{locale==="ko"?"앨범 둘러보는 중":"Exploring albums"}</span><button onClick={()=>setModal("help")} aria-label={locale==="ko"?"둘러보기 안내":"About exploring"}><CircleHelp size={16}/></button><a href={`/?lang=${locale}`}>{locale==="ko"?"내 공간으로":"My space"}<ArrowRight size={13}/></a></div>}{serverError && <div className="server-banner" role="alert">{t("서버에 연결하지 못했어요. 기기에 대기 중인 사진은 유지됩니다.")}<button onClick={()=>{if(ready)void refreshWorkspace().catch(()=>setServerError(true));else setRetryConnection(v=>v+1);}}>{t("다시 시도")}</button></div>}{!ready && !serverError && <WorkspaceLoading ko={locale==="ko"}/>}{ready && <>
      {nativeApp&&incomingCount>0&&<button className="primary-button full" onClick={()=>setModal("incoming-folder")}>{locale==="ko"?`공유받은 사진·영상 ${incomingCount}개를 앨범에 담기`:`Save ${incomingCount} incoming photos & videos`}</button>}
      <div className="page-heading"><div><div className="eyebrow"><Heart size={11}/> OUR LITTLE MEMORIES</div><h1>{room ? <><button className="back-button" onClick={() => { selectGroup(room.groupId||null);setActiveRoom(null); setSelected([]); }} aria-label={t("내 방으로")}><ArrowLeft size={24}/></button>{roomTitle(room)}</> : page === "rooms" ? (locale==="ko"?"우리의 추억 책장":"Our memory bookshelf") : page === "private" ? t("나만 간직한 순간들.") : t("함께 나눈 순간들.")}</h1><p>{room ? roomSummary(room) || t("이 방에 새로운 순간을 담아보세요.") : page === "rooms" ? (locale==="ko"?"다시 펼쳐보고 싶은 순간들을 모아요.":"A home for the moments you want to revisit.") : page === "private" ? t("아직 공개하지 않은 사진이에요. 필요한 순간에, 원하는 사람에게만.") : t("내가 공개한 사진들을 한눈에 확인하세요.")}</p></div><button className="primary-button" onClick={() => browsing ? setModal("help") : room ? openCollect() : setModal("create")}>{room ? <ImagePlus size={17}/> : <Plus size={18}/>}{room ? (locale==="ko"?"사진·영상 추가":"Add photos & videos") : (locale==="ko"?"새 앨범":"New album")}</button></div>
      {room&&<details className="album-people" key={room.id}><summary><span className="album-people-icon"><Users size={17}/></span><span>{locale==="ko"?"함께하는 사람들":"Our people"}<small>{locale==="ko"?`${room.members}명 · 멤버와 참여 정보`:`${room.members} ${room.members===1?"member":"members"} · View details`}</small></span><ChevronRight size={16}/></summary><MembersPanel folderId={room.id} ko={locale==="ko"}/></details>}
      {!room&&page==="rooms"&&!browsing&&<nav className="workspace-guide-row" aria-label={locale==="ko"?"처음 사용하기":"Getting started"}>{!browsing&&<a className="guide-explore-link" href={`/?browse=1&lang=${locale}`}><BookOpen size={16}/>{locale==="ko"?"다른 앨범 구경하기":"Explore albums"}<ArrowRight size={14}/></a>}<button onClick={()=>setModal("help")}><CircleHelp size={14}/>{locale==="ko"?"첫 앨범, 함께 만들어볼까요?":"Your first album, step by step"}<ChevronRight size={13}/></button></nav>}{!room && page === "rooms" && ready && <><Groups key={viewerId} locale={locale} selected={activeGroup} onSelect={selectGroup} onChanged={refreshWorkspace} revision={viewerId+rooms.map(r=>r.id).join()}/><Recaps key={viewerId+activeGroup} locale={locale} groupId={activeGroup} revision={photos.map(p=>p.id+String(p.shared)).join()} onOpen={id=>{setActiveRoom(id);setSelected([]);}}/></>}
      {room && !room.groupId && folderView === "timeline" && room.mine !== false && <button className="text-button" style={{marginBottom:12}} onClick={()=>invite(room.id)}><Users size={15}/>{t("초대하기")}</button>}
      {room && <div className="folder-view-tabs" aria-label={locale === "ko" ? "기록 보기 방식" : "View memories"}><button aria-pressed={folderView === "timeline"} onClick={()=>setFolderView("timeline")}>{locale === "ko" ? "타임라인" : "Timeline"}</button><button aria-pressed={folderView === "photos"} onClick={()=>setFolderView("photos")}>{locale === "ko" ? "사진 모아보기" : "All photos"}</button><button aria-pressed={folderView === "book"} onClick={()=>setFolderView("book")}>{locale === "ko" ? "앨범책 보기" : "Photo book"}</button></div>}
      {room && !browsing && <button className="secondary-button full" onClick={()=>setModal("face-search")}><Sparkles size={17}/>{locale==="ko"?"내가 나온 사진 찾기 · AI":"Find photos of me · AI"}</button>}
      {room && folderView === "book" && <AlbumBook key={room.id+viewerId+photos.filter(p=>p.roomId===room.id&&p.uploadStatus==="uploaded").map(p=>p.id).join()} folderId={room.id} title={roomTitle(room)} description={roomSummary(room)} locale={locale} onAdd={browsing?undefined:openCollect} onPhoto={item=>setPreview({id:item.id,roomId:room.id,src:item.src!,name:item.body,mediaType:item.mediaType,originalAvailable:item.originalAvailable,recipients:item.recipients,audience:item.audience,shared:item.shared,mine:item.mine,created:item.created||Date.now(),uploadStatus:"uploaded"})}/>}
      {room && folderView === "timeline" && <Memories key={room.id+viewerId+draftVersion} onDraftConsumed={()=>setDraftPhotos([])} initialPhotoIds={draftPhotos.filter(id=>photos.some(p=>p.id===id&&p.roomId===room.id))} availablePhotos={photos.filter(p=>p.roomId===room.id&&p.mine!==false&&p.uploadStatus==="uploaded").map(p=>({id:p.id,kind:'photo' as const,body:p.name,src:p.src,mediaType:p.mediaType,shared:p.shared,mine:true,author:'',day:'',revision:0,updatedAt:'',created:p.created,originalAvailable:p.originalAvailable}))} folderId={room.id} locale={locale} manager={room.mine !== false} refreshKey={photos.filter(p=>p.roomId===room.id).map(p=>p.id+String(p.shared)+p.audience+(p.recipients||[]).join()+p.uploadStatus).join()} onPhoto={item=>setPreview({id:item.id,roomId:room.id,src:item.src!,name:item.body,mediaType:item.mediaType,originalAvailable:item.originalAvailable,recipients:item.recipients,audience:item.audience,shared:item.shared,mine:item.mine,created:item.created||new Date(item.day+"T12:00:00").getTime(),uploadStatus:"uploaded"})}/>}
      {(!room || folderView === "photos") && <section className="content-section"><div className="section-heading"><h2>{room ? t("이 방의 사진") : page === "rooms" ? (locale==="ko"?"한 권씩 쌓이는 우리":"Stories on our shelf") : t("사진")}<span>{!room && page === "rooms" ? filteredRooms.length : visiblePhotos.length}</span></h2><div className="section-actions">{room && !room.groupId && room.mine !== false && <button className="text-button" onClick={() => invite(room.id)}><Users size={15}/>{t("초대하기")}</button>}<select aria-label={t("정렬")} value={sort} onChange={e => setSort(e.target.value)}><option value="recent">{t("최근 활동순")}</option><option value="name">{t("이름순")}</option><option value="old">{t("오래된 사진순")}</option></select><div className="view-switch"><button className={!listView ? "chosen" : ""} onClick={() => setListView(false)} aria-label={t("그리드 보기")}><Grid2X2 size={16}/></button><button className={listView ? "chosen" : ""} onClick={() => setListView(true)} aria-label={t("목록 보기")}><List size={17}/></button></div></div></div>
      <div className="filter-row"><div className="tabs">{!room && page === "rooms" ? ["전체", "여행", "모임", "업무", "개인"].map(f => <button className={filter === f ? "tab selected-tab" : "tab"} onClick={() => setFilter(f)} key={f}>{t(f)}{f === "전체" && <span>{rooms.filter(r=>(browsing&&!activeGroup||(r.groupId||null)===activeGroup)).length}</span>}</button>) : <span className="gallery-hint"><ShieldCheck size={15}/>{page === "private" ? t("나에게만 보이는 사진") : room ? t("저장과 공개는 따로, 내 선택대로") : t("공개 범위를 직접 관리하세요")}</span>}</div><label className="search"><Search size={16}/><input aria-label={t("방 또는 사진 검색")} value={query} onChange={e => setQuery(e.target.value)} placeholder={!room && page === "rooms" ? t("방 이름으로 검색") : t("사진 검색")}/><span>⌘ K</span></label></div>
      {!room && page === "rooms" ? <div className={`room-grid ${listView ? "room-list" : ""}`}>{filteredRooms.map(r => <article className="room-card" key={r.id}><button className="room-cover" style={{ background: r.color }} onClick={() => { setActiveRoom(r.id); setFolderView("book"); setQuery(""); setSelected([]); }} aria-label={locale === "en" ? `Open ${roomTitle(r)}` : `${roomTitle(r)} 열기`}>{r.image ? <img src={r.image} alt={roomTitle(r)}/> : <FolderOpen size={56} strokeWidth={1}/>}<span className={`category-badge category-${r.category}`}>{r.category === "여행" ? "↗" : r.category === "모임" ? "♧" : r.category === "업무" ? "▣" : "◇"} {t(r.category)}</span><span className="shelf-cover-label"><small>OUR LITTLE STORY</small><strong>{roomTitle(r)}</strong><span>{roomActivity(r)}</span></span><span className="cover-arrow"><BookOpen size={17}/></span></button><div className="room-card-body"><div className="room-card-title"><button onClick={() => { setActiveRoom(r.id); setFolderView("book"); setSelected([]); }}>{roomTitle(r)}</button><button className="icon-button" title={locale === "en" ? `Manage ${roomTitle(r)}` : `${roomTitle(r)} 관리`} onClick={() => { setCameraRoom(r.id); setModal("room-options"); }}><MoreHorizontal size={19}/></button></div><p>{roomSummary(r)}</p><div className="room-card-footer"><div className="room-metrics"><span><Images size={13}/>{number(photos.filter(p => p.roomId === r.id).length)}</span><span><Users size={13}/>{r.members === 1 && r.mine!==false ? t("나만") : r.members}</span></div></div><div className="room-updated"><span className="updated-dot"/>{roomActivity(r)}</div><button className="folder-capture-button" onClick={() => browsing ? (setActiveRoom(r.id),setFolderView("book"),setQuery(""),setSelected([])) : startCollect(r.id)} aria-label={browsing?(locale==="ko"?roomTitle(r)+" 앨범 펼쳐보기":"Read "+roomTitle(r)):locale === "en" ? "Add photos to " + roomTitle(r) : roomTitle(r) + "에 사진 추가"}>{browsing?<BookOpen size={14}/>:<ImagePlus size={15}/>}{browsing?(locale==="ko"?"앨범 펼쳐보기":"Open album"):t("이 폴더에 사진 추가")}<ArrowRight size={14}/></button></div></article>)}</div> : <div className={listView ? "gallery-list" : ""}>{selectablePhotos.length>0&&!browsing&&<div className="photo-selection-tools"><button aria-pressed={allVisibleSelected} onClick={()=>setSelected(old=>allVisibleSelected?old.filter(id=>!selectablePhotos.some(p=>p.id===id)):[...new Set([...old,...selectablePhotos.map(p=>p.id)])])}><Check size={16}/>{allVisibleSelected?(locale==='ko'?'선택 해제':'Deselect all'):(locale==='ko'?'전체 선택':'Select all')}</button><span>{locale==='ko'?`선택 가능한 내 사진 ${selectablePhotos.length}장`:`${selectablePhotos.length} selectable photos by you`}</span>{selected.length>0&&<strong>{locale==='ko'?`${selected.length}장 선택됨`:`${selected.length} selected`}</strong>}</div>}{gallery(visiblePhotos)}</div>}
      {ready && !room && page === "rooms" && !filteredRooms.length && !query && filter === "전체" && <EmptyBookshelf locale={locale} onCreate={()=>browsing?setModal("help"):setModal("create")} onStudio={openStudio}/>}
      {((page === "rooms" && !room && !filteredRooms.length && (!!query || filter !== "전체")) || ((room || page !== "rooms") && !visiblePhotos.length)) && <div className="empty"><FolderOpen size={38}/><h3>{query ? t("검색 결과가 없어요") : t("아직 담긴 순간이 없어요")}</h3><p>{query ? t("다른 검색어로 찾아보세요.") : (locale==="ko"?"사진을 골라 첫 추억 페이지를 만들어보세요.":"Choose photos and make your first memory page.")}</p>{!query && <button className="primary-button" onClick={()=>!room&&page==="rooms"?setModal("create"):openCollect()}><Plus size={16}/>{!room&&page==="rooms"?(locale==="ko"?"첫 앨범 만들기":"Create first album"):t("첫 사진 담기")}</button>}</div>}
      </section>}
      {!room && page === "rooms" && photos.some(p=>rooms.some(r=>r.id===p.roomId&&(browsing&&!activeGroup||(r.groupId||null)===activeGroup))) && <section className="recent-section"><div className="section-heading"><div className="recent-title"><h2>{t("최근 담은 순간")}</h2><span>{t("여러 방의 사진을 한눈에")}</span></div><button className="text-button" onClick={() => navigate("private")}>{t("내 사진 모아보기")}<ArrowRight size={15}/></button></div>{gallery(photos.filter(p=>rooms.some(r=>r.id===p.roomId&&(browsing&&!activeGroup||(r.groupId||null)===activeGroup))).sort((a,b)=>b.created-a.created).slice(0,5), true)}</section>}
      {!room&&page==="rooms"&&<StudioTeaser locale={locale} onCreate={openStudio}/>}
      <footer className="main-footer"><span><LockKeyhole size={13}/>{t("담는 건 자유롭게, 공유는 선택적으로.")}</span><span><Link href={`/${locale}`}>{locale === "ko" ? "Memonestia 소개" : "About Memonestia"} ↗</Link></span></footer>
    </>}</main>
    <nav className="mobile-tabs" aria-label={locale === "en" ? "Main navigation" : "주요 메뉴"}>
      <button aria-current={page === "rooms" ? "page" : undefined} onClick={()=>navigate("rooms")}><FolderOpen size={21}/><span>{locale==="ko"?"우리 공간":"Our spaces"}</span></button>
      <button aria-current={page === "private" ? "page" : undefined} onClick={()=>navigate("private")}><LockKeyhole size={21}/><span>{t("나만 보기")}</span></button>
      <button className="tab-camera" onClick={openStudio}><span><Sparkles size={23}/></span><small>{locale==="ko"?"추억 만들기":"Create memory"}</small></button>
      <button aria-current={page === "shared" ? "page" : undefined} onClick={()=>navigate("shared")}><Users size={21}/><span>{t("공유한 사진")}</span></button>
      <button onClick={()=>browsing?window.location.assign(`/?lang=${locale}&login=1`):setModal("profile")}><span className="tab-account">{!ready ? <span className="activity-spinner"/> : account?.name.slice(0,1).toUpperCase() || "M"}</span><span>{t("내 계정")}</span></button>
    </nav>
    </div>
    {ready&&!browsing&&!account&&photos.some(p=>p.mine!==false&&p.uploadStatus==="uploaded")&&<AccountNudge ko={locale==="ko"} viewerId={viewerId} onConnect={()=>setModal("profile")}/>}
    {studio&&<MemoryStudio ko={locale==="ko"} guest={!account} onConnect={()=>{closeStudio();setModal("profile");}} albums={rooms} photos={photos} initialAlbum={activeRoom} onClose={closeStudio} onSaved={id=>{closeStudio();void refreshWorkspace().then(()=>{setActiveRoom(id);setPage("rooms");setFolderView("book");setDraftVersion(v=>v+1);}).catch(()=>setServerError(true));}}/>}
    {selected.length > 0 && <div className="selection-bar"><button onClick={() => setSelected([])} aria-label={t("선택 해제")}><X size={17}/></button><strong>{formatCount(locale, selected.length, "selected")}</strong><button disabled={new Set(photos.filter(p=>selected.includes(p.id)).map(p=>p.roomId)).size!==1} onClick={()=>{const p=photos.find(p=>selected.includes(p.id));if(p)beginStory(selected,p.roomId);}}>{locale==="ko"?"기록으로 묶기":"Create story"}</button><button onClick={() => { setAudience("방 전체"); setRecipients([]); setModal("share"); }}><Users size={16}/>{t("공개 설정")}</button><button onClick={async () => { for (const p of photos.filter(p => selected.includes(p.id))) await download(p); }}><ArrowDownToLine size={16}/>{t("다운로드")}</button></div>}
    {toast && <div className="toast" role="status"><Check size={17}/>{t(toast)}</div>}
    {saveError && <div className="save-error" role="alert">{t("기기에 저장하지 못했어요.")}<button onClick={() => saveWorkspace(rooms, photos, viewerId).then(() => setSaveError(false)).catch(() => setToast("저장공간을 확인해 주세요"))}>{t("다시 시도")}</button></div>}
    <input ref={file} hidden type="file" accept="image/*,video/mp4,video/quicktime,video/webm,.heic,.heif" multiple onChange={e => importPhotos(e.target.files)}/>
    {modal && <div className={`modal-backdrop ${modal === "profile" ? "account-backdrop" : ""}`} onClick={() => { if (modal !== "camera" && !busy) setModal(null); }}><section className={`modal ${modal === "camera" ? "camera-modal" : modal === "profile" ? "profile-modal" : ""}`} role="dialog" aria-modal="true" aria-label={modal === "create" ? (locale==="ko"?"새 앨범":"New album") : t("사진 관리")} onClick={e => e.stopPropagation()}><button className="close-modal icon-button" aria-label={t("닫기")} onClick={closeModal}><X size={21}/></button>
      {modal === "join" && <><div className="modal-symbol"><Users/></div><h2>{(locale==="ko"?"초대받은 공간에 참여할까요?":"Join this shared space?")}</h2><p>{(locale==="ko"?"그룹 초대라면 기존 앨범과 앞으로 만들 앨범에 함께 참여합니다. 멤버가 공개한 사진만 볼 수 있어요.":"Group invitations include existing and future albums. Only photos shared with you are visible.")}</p><button className="primary-button full" disabled={busy || !ready} onClick={joinFolder}>{t("폴더 참여하기")}</button></>}
      {modal === "share-link" && <ShareLinks ids={linkPhotos} ko={locale==="ko"} restricted={photos.some(p=>linkPhotos.includes(p.id)&&p.audience==="selected")}/> }
      {modal === "discussion" && discussionPhoto && <><h2>{locale === "ko" ? "이 순간의 이야기" : "Stories from this moment"}</h2><Discussion key={discussionPhoto+viewerId} kind="photo" id={discussionPhoto} locale={locale}/></>}
      {modal === "create" && <><div className="modal-symbol"><FolderOpen/></div><h2>{t("어떤 순간을 담을까요?")}</h2><p>{(activeGroup?(locale==="ko"?"선택한 그룹에 새 앨범을 만들어요. 멤버는 다시 초대하지 않아도 돼요.":"Add an album to this group. Members are already invited."):(locale==="ko"?"내 공간에 새 앨범을 만들어요. 나중에 친구를 초대할 수도 있어요.":"Create an album in My space. Invite friends whenever you like."))}</p><form onSubmit={createRoom}><label>{t("방 이름")}<input autoFocus required maxLength={40} placeholder={t("예: 우리들의 가을 여행")} value={roomName} onChange={e => setRoomName(e.target.value)}/></label><label>{locale==="ko"?"시작일 · 선택":"Start date · optional"}<input type="date" value={albumStart} onChange={e=>setAlbumStart(e.target.value)}/></label><label>{locale==="ko"?"종료일 · 선택":"End date · optional"}<input type="date" min={albumStart||undefined} value={albumEnd} onChange={e=>setAlbumEnd(e.target.value)}/></label><details className="folder-extra"><summary>{t("분류와 설명 추가 · 선택")}</summary><label>{t("어떤 방인가요?")}</label><div className="category-select">{["여행", "모임", "업무", "개인"].map(c => <button type="button" className={category === c ? "active" : ""} key={c} onClick={() => setCategory(c)}>{t(c)}</button>)}</div><label>{t("한 줄 소개")}<small>{t("선택")}</small><input maxLength={100} placeholder={t("이 방을 소개해 주세요")} value={description} onChange={e => setDescription(e.target.value)}/></label></details><div className="info-box"><LockKeyhole size={17}/>{t("새 사진은 나만 볼 수 있어요. 공개 여부는 나중에 정하세요.")}</div><button className="primary-button full" disabled={!roomName.trim() || !ready || busy}>{t("폴더 만들고 사진 모으기")}<ArrowRight size={17}/></button></form></>}
      {modal === "incoming-folder" && <><h2>{locale==="ko"?"어느 앨범에 기록할까요?":"Choose an album for your story"}</h2><p>{locale==="ko"?"최근 사용한 앨범부터 보여드려요. 단톡방에서 받은 사진을 같은 그룹에 모으세요.":"Recent albums first. Keep your chat memories with the same group."}</p><div className="folder-choices">{rooms.map(r=><button key={r.id} onClick={()=>{setModal(null);sendNative("INCOMING",{folderId:r.id});}}><FolderOpen/><div><strong>{roomTitle(r)}</strong><small>{t(r.category)}</small></div><ArrowRight/></button>)}</div><button className="text-button" onClick={()=>setModal("create")}>{locale==="ko"?"새 앨범 만들기":"New album"}</button></>}
      {modal === "choose-folder" && <><div className="modal-symbol"><FolderOpen/></div><h2>{t("어떤 날을 기억할까요?")}</h2><p>{t("사진을 담을 폴더를 선택하세요.")}</p><button className="new-folder-choice" onClick={() => setModal("create")}><Plus size={20}/>{t("새 폴더 만들기")}<ArrowRight size={16}/></button><div className="folder-choices">{rooms.map(r => <button key={r.id} onClick={() => startCollect(r.id)}>{r.image ? <img src={r.image} alt=""/> : <FolderOpen size={26}/>}<div><strong>{roomTitle(r)}</strong><small>{t(r.category)}</small></div><Camera size={19}/></button>)}</div></>}
      {modal === "collect" && <><StorageMeter ko={locale==="ko"} revision={photos.map(p=>p.id+p.uploadStatus).join()}/><p className="info-box">{locale==="ko"?"영상 최대 50MB · 사진 최대 20MB. 화면에서는 가볍게, 다운로드는 원본 그대로. 원본에는 촬영 위치 등 메타데이터가 포함될 수 있어요.":"Videos up to 50 MB · Photos up to 20 MB. Lightweight previews, full-quality original downloads. Originals may include location metadata."}</p>{nativeApp&&<div className="native-actions"><button className="secondary-button full" onClick={()=>sendNative("RECOMMEND",{folderId:cameraRoom})}>{locale==="ko"?"날짜로 갤러리 사진 찾기":"Find gallery photos by date"}</button>{incomingCount>0&&<button className="primary-button full" onClick={()=>sendNative("INCOMING",{folderId:cameraRoom})}>{locale==="ko"?`공유받은 사진 ${incomingCount}장 확인`:`Review ${incomingCount} incoming photos`}</button>}<button className="text-button" onClick={()=>sendNative("QUEUE")}>{locale==="ko"?"앱 전송 상태 · 재시도":"App uploads · retry"}</button></div>}<div className="modal-symbol"><ImagePlus/></div><h2>{roomTitle(rooms.find(r => r.id === cameraRoom))}</h2><p>{t("좋아하는 앱으로 찍은 사진을 여기에 모으세요.")}</p><button className="primary-button full" disabled={saving} onClick={() => {if(!sendNative("PICK",{folderId:cameraRoom}))file.current?.click();}}><ImagePlus size={18}/>{saving ? t("저장 중…") : (locale==="ko"?"기기에서 사진·영상 선택":"Choose photos & videos")}</button><div className="info-box"><LockKeyhole size={17}/>{t("새 사진은 나만 볼 수 있어요. 공개 여부는 나중에 정하세요.")}</div>{sessionIds.length > 0 && <><p>{formatCount(locale, sessionIds.length, "saved")}</p><button className="primary-button full" disabled={saving} onClick={finishCapture}>{locale==="ko"?"사진 묶어 기록 남기기":"Create a story with these photos"}</button></>}</>}
      {modal === "camera" && <><div className="shooting-heading"><span className="shooting-icon"><FolderOpen size={22}/></span><div><small>{t("지금 저장되는 폴더")}</small><h2>{roomTitle(rooms.find(r => r.id === cameraRoom))}</h2></div></div><p>{t("한 장 찍어도 카메라는 그대로. 계속 찍으면 이 폴더에 쌓여요.")}</p>
      <div className={"camera-view " + (flash ? "shutter-flash" : "")}><video ref={video} autoPlay playsInline muted onLoadedData={() => setCameraReady(true)}/>{cameraError ? <div className="camera-fallback"><Camera size={38}/><p>{t(cameraError)}</p><button onClick={() => {if(!sendNative("PICK",{folderId:cameraRoom}))file.current?.click();}}>{locale==="ko"?"사진·영상 선택":"Choose photos & videos"}</button></div> : !cameraReady && <div className="camera-fallback"><Camera size={38}/><p>{t("카메라를 준비하고 있어요")}</p></div>}<span className="camera-room"><LockKeyhole size={12}/>{instant ? t("공유됨") : t("나만 보기")}</span><span className="session-counter">{formatCount(locale, sessionIds.length, "photos")}</span></div>
      <div className="shooting-status" role="status"><span><span className={saveError ? "status-error" : "status-dot"}/>{photos.some(p=>sessionIds.includes(p.id)&&p.uploadStatus==="failed") ? t("전송 실패 · 아래에서 재전송") : persistStatus === "saving" || photos.some(p=>sessionIds.includes(p.id)&&p.uploadStatus==="pending") ? t("업로드 중") : saveError ? t("저장을 다시 시도해 주세요") : t("서버 저장됨")}</span><span>{t("이번 촬영")}: {number(sessionIds.length)}</span></div>
      <div className="camera-controls"><button className="secondary-button" onClick={() => {if(!sendNative("PICK",{folderId:cameraRoom}))file.current?.click();}} disabled={saving}><ImagePlus size={19}/>{saving ? t("저장 중…") : (locale==="ko"?"사진·영상 추가":"Add photos & videos")}</button><button className="shutter" onClick={capture} aria-label={t("사진 촬영")} disabled={!cameraReady || !!cameraError || saving}><span/></button><button className="secondary-button" onClick={finishCapture} disabled={saving}><Check size={18}/>{t("촬영 완료")}</button></div>
      {photos.some(p=>p.roomId===cameraRoom&&p.uploadStatus==="failed") && <button className="retry-uploads" onClick={()=>setPhotos(old=>old.map(p=>p.roomId===cameraRoom&&p.uploadStatus==="failed"?{...p,uploadStatus:"pending"}:p))}>{t("실패한 사진 다시 전송")}</button>}<div className="session-filmstrip" aria-label={t("이번에 찍은 사진")}>{sessionIds.length ? photos.filter(p => sessionIds.includes(p.id)).map(p => <img key={p.id} src={p.src} alt={photoTitle(p)}/>) : <span><Images size={19}/>{t("찍은 사진이 여기에 차곡차곡 보여요")}</span>}</div>
      <details className="capture-settings"><summary>{t("공개 설정")}</summary><label className="toggle-row"><span><Users size={17}/>{t("촬영 즉시 공개")}</span><input type="checkbox" checked={instant} onChange={e => setInstant(e.target.checked)}/></label><p>{t("공개한 사진만 폴더 멤버에게 보입니다. 비공개 사진은 촬영자만 볼 수 있어요.")}</p></details><p className="local-note">{t("사진은 비공개 클라우드에 저장됩니다. 전송 실패 시 기기에 남겨 재시도해요.")}</p></>}
      {modal === "face-search" && activeRoom && <FaceSearch folderId={activeRoom} ko={locale==="ko"} onDownload={p=>download({...p,roomId:activeRoom,uploadStatus:"uploaded"})} onOpen={p=>{setModal(null);setPreview({...p,roomId:activeRoom,uploadStatus:"uploaded"});}}/>}
      {modal === "share" && <><div className="modal-symbol"><Users/></div><h2>{formatCount(locale, selected.length, "sharing")}</h2><p>{t("사진을 보관하는 것과 공개하는 것은 별개예요.")}</p><div className="audience-options">{["나만 보기", "방 전체", "선택한 사람"].map(a => <label key={a}><input type="radio" name="audience" checked={audience === a} onChange={() => setAudience(a)}/><span><strong>{t(a)}</strong><small>{a === "나만 보기" ? t("비공개 사진함에 보관해요") : a === "방 전체" ? t("방의 멤버에게 공개하도록 설정해요") : t("공유할 사람을 직접 선택해요")}</small></span></label>)}</div>{audience === "선택한 사람" && <MemberPicker key={selected.join()} folderIds={photos.some(p=>selected.includes(p.id))?photos.filter(p=>selected.includes(p.id)).map(p=>p.roomId):activeRoom?[activeRoom]:[]} value={recipients} onChange={setRecipients} ko={locale==="ko"}/>}<p className="local-note">{t("공개한 사진만 폴더 멤버에게 보입니다. 비공개 사진은 촬영자만 볼 수 있어요.")}</p><button className="primary-button full" disabled={(audience === "선택한 사람" && !recipients.length) || busy} onClick={shareSelection}>{t("설정 저장")}<Check size={16}/></button></>}
      {modal === "invite" && <><div className="modal-symbol"><Link2/></div><h2>{t("함께 담으면 더 특별하니까")}</h2><p>{roomTitle(inviteRoom)}{t("· 7일간 유효한 초대 링크")}</p><div className="qr-box">{qr && <img src={qr} alt={t("방 초대 링크 QR 코드")}/>}</div><div className="copy-link"><input readOnly value={inviteUrl}/><button aria-label={t("초대 링크 복사")} disabled={!inviteUrl} onClick={async () => { try { await navigator.clipboard.writeText(inviteUrl); setToast("링크를 복사했어요"); } catch { setToast("링크를 선택해 직접 복사해 주세요"); } }}><Copy size={18}/></button></div><div className="info-box">{t("링크를 받은 사람은 폴더에 참여할 수 있어요. 다른 기기에서는 접속 가능한 서비스 주소로 초대해 주세요.")}</div></>}
      {modal === "room-options" && <><h2>{roomTitle(inviteRoom)}</h2>{inviteRoom?.mine&&!inviteRoom.groupId&&<MoveAlbum id={inviteRoom.id} locale={locale} onMoved={async id=>{await refreshWorkspace();selectGroup(id);setActiveRoom(null);setModal(null);}}/>}<p>{t("이 방에서 새로운 순간을 함께 모아보세요.")}</p>{!inviteRoom?.groupId?<button className="option-button" onClick={() => invite(cameraRoom)}><Link2 size={18}/>{t("초대 링크 · QR 보기")}<ChevronRight size={16}/></button>:<p className="info-box">{locale==="ko"?"그룹 관리에서 멤버를 초대할 수 있어요.":"Invite members from group settings."}</p>}<button className="option-button" onClick={() => { setActiveRoom(cameraRoom); setPage("rooms"); setModal(null); }}><Images size={18}/>{t("방의 사진 보기")}<ChevronRight size={16}/></button>{!browsing&&inviteRoom?.mine&&<DeleteAlbum key={inviteRoom.id} id={inviteRoom.id} name={inviteRoom.name} ko={locale==='ko'} pending={photos.some(p=>p.roomId===inviteRoom.id&&p.uploadStatus!=='uploaded')} onDeleted={()=>{const id=inviteRoom.id;setPhotos(old=>old.filter(p=>p.roomId!==id));setRooms(old=>old.filter(r=>r.id!==id));setSelected([]);setPreview(null);setActiveRoom(null);setPage('rooms');setModal(null);setToast(locale==='ko'?'휴지통으로 옮겼어요. 30일 안에 복원할 수 있어요.':'Moved to Trash. Restore within 30 days.');void refreshWorkspace().catch(()=>setServerError(true));}}/>}</>}
      {modal === "help" && <><div className="modal-symbol"><Sparkles/></div><h2>{t("처음부터 제자리에")}</h2>{browsing&&<p>{locale==="ko"?"둘러보기는 가상 기록과 스톡 사진으로 구성된 읽기 전용 공간이에요. 실제 사진은 내 공간에 추가해 주세요.":"Explore is a read-only collection of fictional stories and stock photos. Add your own photos in My space."}</p>}<p>{t("Memonestia을 사용하는 가장 간단한 방법.")}</p><p>{locale==="ko"?"앨범을 열고 사진·타임라인·앨범책 보기를 바꿔보세요. 사진을 누르면 상세 화면으로 이어집니다.":"Open an album and switch between photos, timeline and photo book. Tap a photo to open its detail."}</p><div className="guide-step"><b>01</b><div><strong>{t("목적에 맞는 방 만들기")}</strong><p>{t("여행, 모임, 업무, 나만의 기록까지.")}</p></div></div><div className="guide-step"><b>02</b><div><strong>{t("찍어둔 사진 모으기")}</strong><p>{t("기기에서 사진을 골라 같은 폴더에 추가하세요.")}</p></div></div><div className="guide-step"><b>03</b><div><strong>{t("필요한 사진만 공개하기")}</strong><p>{t("사진을 선택하고 공개 범위를 설정하세요.")}</p></div></div><div className="guide-step"><b>04</b><div><strong>{locale==="ko"?"사진에 이야기를 더하기":"Add a little story"}</strong><p>{locale==="ko"?"사진을 묶고 제목과 글을 남겨요. 댓글과 반응으로 함께 기억해요.":"Bundle photos with a title and note. Remember together through comments and reactions."}</p></div></div><div className="guide-step"><b>05</b><div><strong>{locale==="ko"?"앨범책으로 펼쳐보기":"Open your photo book"}</strong><p>{locale==="ko"?"앨범책 보기에서 스크랩북·화이트·필름·피치 템플릿을 골라보세요.":"Try scrapbook, white gallery, film and peach templates in Photo book."}</p></div></div><div className="info-box">{locale==="ko"?"보기는 압축 사진, 다운로드는 보관된 원본입니다. HEIC 사진도 지원하며 장당 20MB까지 올릴 수 있어요. 둘러보기에서는 저장하지 않으며 내 공간에서 실제 사진을 추가할 수 있어요.":"View compressed previews and download stored originals. HEIC is supported, up to 20 MB per photo. Explore is read-only; add your own photos in My space."}</div>{browsing&&<a className="primary-button full" href={`/?lang=${locale}`}>{locale==="ko"?"내 공간에서 시작하기":"Start in my space"}</a>}</>}
      {modal === "storage" && <><StorageMeter ko={locale==="ko"} revision={photos.map(p=>p.id+p.uploadStatus).join()}/><div className="modal-symbol"><CloudCheck/></div><h2>{t("사진은 클라우드에 있어요")}</h2><p>{t("새 사진·영상은 선택한 원본 파일을 보관합니다. 서버 저장소 한도 내에서 영상 50MB·사진 20MB까지 지원하며 원본의 위치 정보 등 메타데이터도 포함될 수 있습니다. 이전 업로드의 원본은 복원되지 않습니다.")}</p><div className="info-box">{t("게스트 사진은 이 브라우저에서만 접근할 수 있어요. 로그인해 계정에 연결하면 다른 기기에서도 다시 볼 수 있습니다. 로그인 연결 전에는 쿠키를 삭제하지 마세요.")}</div><button className="primary-button full" onClick={() => { setModal(null); navigate("private"); }}>{t("내 사진 확인하기")}</button></>}
      {modal === "profile" && !ready && <div className="account-loading" role="status"><span className="activity-spinner"/>{serverError ? (locale==="ko"?"계정 정보를 불러오지 못했어요.":"Could not load your account.") : (locale==="ko"?"내 계정을 확인하고 있어요…":"Checking your account…")}{serverError&&<button className="secondary-button" onClick={()=>setRetryConnection(v=>v+1)}>{t("다시 시도")}</button>}</div>}
      {modal === "profile" && ready && <>{nativeApp&&<div className="native-actions"><button className="secondary-button full" onClick={()=>sendNative("QUEUE")}>{locale==="ko"?"사진 전송 상태":"Photo uploads"}</button><Link href="/privacy">{locale==="ko"?"개인정보 처리 안내":"Privacy"}</Link><Link href="/support">{locale==="ko"?"도움말 및 문의":"Help & support"}</Link><button className="text-button" onClick={()=>sendNative("DELETE_ACCOUNT")}>{locale==="ko"?"계정 삭제 요청":"Request account deletion"}</button></div>}<div className="profile-avatar large">{account?.name.slice(0,1).toUpperCase() || "S"}</div><h2>{account ? account.name : t("내 사진, 계정으로 안전하게")}</h2><p>{account ? t("다른 기기에서도 같은 계정으로 내 폴더를 이어보세요.") : t("로그인하면 이 브라우저에서 찍은 사진과 폴더가 내 계정에 연결돼요.")}</p>
      {account ? <div className="account-identity"><strong>{account.provider === "apple.com" ? "Apple" : account.provider === "password" ? "Email" : "Google"}</strong>{account.email && <span>{account.email}</span>}</div> : <><div className="social-login"><button disabled={authBusy || !authConfigured || !ready || hasUnsentPhotos} onClick={()=>socialLogin("google")}><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-1.99 3.02v2.51h3.23c1.89-1.74 2.98-4.3 2.98-7.36Z"/><path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.23-2.51c-.9.6-2.06.96-3.39.96-2.61 0-4.82-1.76-5.61-4.12H3.05v2.59A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.39 13.92a6 6 0 0 1 0-3.84V7.49H3.05a10 10 0 0 0 0 9.02l3.34-2.59Z"/><path fill="#EA4335" d="M12 5.96c1.47 0 2.79.51 3.83 1.51L18.7 4.6A9.62 9.62 0 0 0 12 2a10 10 0 0 0-8.95 5.49l3.34 2.59C7.18 7.72 9.39 5.96 12 5.96Z"/></svg>{t("Google로 계속하기")}</button><button className="apple-login" disabled={authBusy || !authConfigured || !ready || hasUnsentPhotos} onClick={()=>socialLogin("apple")}><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.05 12.54c.02 3.17 2.78 4.22 2.81 4.23-.02.07-.44 1.51-1.45 3-.87 1.28-1.78 2.55-3.2 2.57-1.4.03-1.85-.83-3.45-.83-1.6 0-2.1.81-3.43.86-1.37.05-2.41-1.38-3.29-2.65-1.79-2.6-3.15-7.35-1.31-10.56a5.1 5.1 0 0 1 4.33-2.62c1.35-.03 2.63.91 3.45.91.83 0 2.37-1.12 4-.95.68.03 2.59.27 3.82 2.08-.1.06-2.28 1.33-2.28 3.96ZM14.42 4.78c.73-.88 1.22-2.1 1.08-3.32-1.05.04-2.32.7-3.07 1.58-.68.78-1.28 2.02-1.12 3.21 1.18.09 2.38-.6 3.11-1.47Z"/></svg>{t("Apple로 계속하기")}</button></div>{!hasNativeBridge() && <EmailLogin ko={locale === "ko"} disabled={authBusy || !ready || hasUnsentPhotos} onSuccess={async () => { await clearAccountCache(); window.location.reload(); }} />}{!authConfigured && <div className="info-box">{t("전용 Firebase 프로젝트 연결을 준비 중이에요. 지금은 게스트로 사용할 수 있어요.")}</div>}<p className="local-note">{t("처음 로그인하면 현재 게스트 폴더와 사진을 선택한 계정에 옮깁니다. 본인 계정인지 확인해 주세요.")}</p></>}
      {hasUnsentPhotos && <div className="info-box">{t("전송 중이거나 실패한 사진을 먼저 업로드해 주세요. 계정을 바꿀 때 사진이 남지 않도록 보호하고 있어요.")}</div>}{authError && <p className="auth-error" role="alert">{t(authError)}</p>}{authBusy && <p role="status">{t("로그인 처리 중…")}</p>}
      <button className="option-button" onClick={()=>{setLinkPhotos([]);setModal("share-link");}}><Link2 size={18}/>{locale==="ko"?"공유 링크 관리":"Manage shared links"}<ChevronRight size={16}/></button><div className="account-details"><span>{t("내 방")}<strong>{formatCount(locale, rooms.length, "rooms")}</strong></span><span>{t("직접 추가한 사진")}<strong>{formatCount(locale, photos.filter(p=>p.mine !== false).length, "photos")}</strong></span></div><StorageMeter ko={locale==="ko"} revision={viewerId+photos.map(p=>p.id+p.uploadStatus).join()}/><button className="option-button" onClick={()=>setModal("storage")} disabled={authBusy}><CloudCheck size={18}/>{t("저장공간 알아보기")}<ChevronRight size={16}/></button><button className="option-button" onClick={()=>setModal("help")} disabled={authBusy}><CircleHelp size={18}/>{t("도움말 및 가이드")}<ChevronRight size={16}/></button>{!browsing&&<AlbumTrash ko={locale==='ko'} onRestored={()=>{void refreshWorkspace().catch(()=>setServerError(true));setToast(locale==='ko'?'앨범을 복원했어요.':'Album restored.');}}/>}<details className="account-settings"><summary>{locale==="ko"?"개인정보 및 이용 설정":"Privacy & preferences"}</summary><AnalyticsPreference ko={locale==="ko"}/><nav className="legal-links"><Link href="/terms">{locale==="ko"?"이용약관 · 커뮤니티 규칙":"Terms & community rules"}</Link><Link href="/privacy">{locale==="ko"?"개인정보 처리 안내":"Privacy"}</Link><Link href="/support">{locale==="ko"?"도움말 및 문의":"Support"}</Link><Link href="/delete-account" onClick={e=>{if(nativeApp){e.preventDefault();sendNative("DELETE_ACCOUNT");}}}>{locale==="ko"?"계정 삭제":"Delete account"}</Link></nav><BlockedUsers ko={locale==="ko"}/></details>{account && <button className="logout-button" disabled={authBusy || hasUnsentPhotos} onClick={logout}>{t("로그아웃")}</button>}</>}
      {modal === "notifications" && <>{nativeApp&&<><button className="primary-button full" onClick={()=>sendNative("NOTIFICATIONS_ON")}>{locale==="ko"?"기기 알림 켜기":"Enable device notifications"}</button><button className="secondary-button full" onClick={()=>sendNative("NOTIFICATIONS_OFF")}>{locale==="ko"?"기기 알림 끄기":"Disable device notifications"}</button></>}<Notifications locale={locale} onOpen={id=>{setActiveRoom(id);setPage("rooms");setModal(null);}}/></>}
    </section></div>}
    {preview && <div className="lightbox" role="dialog" aria-modal="true" aria-label={photoTitle(preview)} onClick={() => setPreview(null)}><button className="lightbox-close" onClick={() => setPreview(null)} aria-label={t("닫기")}><X/></button><MediaView src={preview.src} name={photoTitle(preview)} mediaType={preview.mediaType} full/><div className="lightbox-toolbar" onClick={e => e.stopPropagation()}><div><strong>{photoTitle(preview)}</strong><span>{roomTitle(rooms.find(r => r.id === preview.roomId))} · {preview.shared ? t("공유됨") : t("나만 보기")}</span><time dateTime={new Date(preview.created).toISOString()}>{formatCapturedAt(locale, preview.created)}</time></div><button className="secondary-button" onClick={()=>{setDiscussionPhoto(preview.id);setPreview(null);setModal("discussion");}}>{locale === "ko" ? "댓글 · 공감" : "Comments · likes"}</button><button className="secondary-button" onClick={() => download(preview)}><ArrowDownToLine size={17}/>{preview.originalAvailable?(locale==="ko"?"원본 다운로드":"Download original"):(locale==="ko"?"저장본 다운로드":"Download stored copy")}</button><button className="primary-button" disabled={preview.mine === false || preview.uploadStatus !== "uploaded"} onClick={() => { setSelected([preview.id]); setRecipients(preview.recipients||[]);setAudience(!preview.shared?"나만 보기":preview.audience==="selected"?"선택한 사람":"방 전체"); setPreview(null); setModal("share"); }}>{t("공개 설정")}</button></div></div>}
  </div>;
}
