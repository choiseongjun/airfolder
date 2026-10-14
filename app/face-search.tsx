"use client";
/* eslint-disable @next/next/no-img-element */
import {useEffect,useRef,useState} from 'react';
import {api} from '@/lib/client-api';
import {descriptors,faceDistance} from '@/lib/face-search';
type Match={id:string;src:string;name:string;shared:boolean;mine:boolean;created:number;originalAvailable:boolean;audience:string;recipients:string[]};
export default function FaceSearch({folderId,ko,onOpen,onDownload}:{folderId:string;ko:boolean;onOpen:(photo:Match)=>void;onDownload:(photo:Match)=>Promise<void>}){
  const t=(a:string,b:string)=>ko?a:b;
  const [consent,setConsent]=useState(false),[reference,setReference]=useState<File|null>(null),[matches,setMatches]=useState<Match[]>([]),[busy,setBusy]=useState(false),[progress,setProgress]=useState(0),[skipped,setSkipped]=useState(0),[error,setError]=useState(''),[more,setMore]=useState(true),[started,setStarted]=useState(false);
  const [downloading,setDownloading]=useState('');
  const cancel=useRef(false),embedding=useRef<Float32Array|null>(null),offset=useRef(0);
  useEffect(()=>()=>{cancel.current=true;embedding.current?.fill(0);embedding.current=null;},[]);
  function reset(){cancel.current=true;embedding.current?.fill(0);embedding.current=null;offset.current=0;setMatches([]);setReference(null);setStarted(false);setProgress(0);setSkipped(0);setMore(true);setConsent(false);}
  async function scan(){
    if(!consent||!reference||busy)return;
    cancel.current=false;setBusy(true);setError('');setStarted(true);
    try{
      if(!embedding.current){
        const faces=await descriptors(reference);
        if(cancel.current){faces.forEach(f=>f.fill(0));return;}
        if(faces.length!==1){faces.forEach(f=>f.fill(0));throw new Error('ONE_FACE_REQUIRED');}
        embedding.current=faces[0];
      }
      const data=await api<{items:Match[];hasMore:boolean}>(`/api/face-candidates?folderId=${folderId}&offset=${offset.current}`);
      for(const item of data.items){
        if(cancel.current)break;
        try{
          const response=await fetch(item.src,{cache:'no-store'});if(!response.ok)throw new Error('UNAVAILABLE');
          const faces=await descriptors(await response.blob());
          const match=embedding.current&&faces.some(face=>faceDistance(embedding.current!,face)<0.52);
          faces.forEach(face=>face.fill(0));
          if(!cancel.current&&match)setMatches(old=>old.some(p=>p.id===item.id)?old:[...old,item]);
        }catch{if(!cancel.current)setSkipped(n=>n+1);}
        if(!cancel.current){offset.current++;setProgress(offset.current);}
        await new Promise(resolve=>setTimeout(resolve,0));
      }
      if(!cancel.current)setMore(data.hasMore);
    }catch(e){if(!cancel.current)setError(e instanceof Error&&e.message==='ONE_FACE_REQUIRED'?t('본인 얼굴이 한 명만 선명하게 나온 사진을 선택하세요.','Choose a clear photo showing only your face.'):t('검색을 완료하지 못했습니다. 연결과 사진 형식을 확인하고 다시 시도하세요.','Search failed. Check your connection and image format, then retry.'));}
    finally{setBusy(false);}
  }
  return <section className="face-search"><h2>{t('내가 나온 사진 찾기','Find photos of me')}</h2><p>{t('본인 사진 한 장으로 이 공간에서 내가 나온 사진의 후보를 찾아요.','Use a photo of yourself to find possible matches in this space.')}</p><div className="info-box">{t('기기에서만 비교합니다. 기준 사진과 얼굴 특징은 서버에 전송·저장하지 않고, 창을 닫으면 지웁니다. 접근 가능한 사진만 검색하며 영상은 제외합니다. 결과에는 오류나 누락이 있을 수 있습니다.','Matching runs on your device. Your reference photo and face descriptors are never uploaded or stored, and are cleared when you close this window. Only accessible photos are searched; videos are excluded. Results may contain mistakes or omissions.')}</div>
    <label><input type="checkbox" disabled={busy||started} checked={consent} onChange={e=>setConsent(e.target.checked)}/>{t('본인 얼굴 사진을 사용하며, 이번 검색의 얼굴 비교에 동의합니다.','I am using my own face photo and consent to face matching for this search.')}</label>
    <label>{t('본인 사진 선택 · JPEG/PNG/WebP, 15MB 이하','Choose your photo · JPEG/PNG/WebP, up to 15 MB')}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={!consent||busy||started} onChange={e=>{const f=e.target.files?.[0];if(f&&f.size<=15*1024*1024)setReference(f);else{setReference(null);setError(t('15MB 이하의 사진을 선택하세요.','Choose a photo up to 15 MB.'));}}}/></label>
    <p>{t('한 번에 최대 50장을 비교합니다. 첫 사용 시 약 8MB의 모델을 불러옵니다.','Compares up to 50 photos per batch. The first search loads about 8 MB of models.')}</p>
    {error&&<p role="alert">{error}</p>}<p role="status">{busy?t(`비교 중 · ${progress}장 확인`,`Comparing · ${progress} checked`):started?t(`${progress}장 확인 · 후보 ${matches.length}장 · 처리 불가 ${skipped}장`,`${progress} checked · ${matches.length} candidates · ${skipped} skipped`):''}</p>
    <div className="memory-actions"><button className="primary-button" disabled={!consent||!reference||busy||!more} onClick={scan}>{busy?t('검색 중…','Searching…'):started?t('다음 사진 검색','Search next photos'):t('사진 찾기','Find my photos')}</button>{busy?<button onClick={()=>{cancel.current=true;}}>{t('중지','Stop')}</button>:<button onClick={reset}>{t('검색 정보 지우기','Clear search data')}</button>}</div>
    {!busy&&started&&!more&&!matches.length&&!error&&<p>{t('일치 후보가 없습니다. 다른 본인 사진으로 다시 시도할 수 있어요.','No candidates found. Try another reference photo.')}</p>}
    <div className="photo-grid">{matches.map(p=><article key={p.id}><button onClick={()=>onOpen(p)}><img src={p.src} alt={p.name}/><span>{p.name}</span></button><button className="secondary-button full" disabled={busy||!!downloading} onClick={async()=>{setDownloading(p.id);try{await onDownload(p);}finally{setDownloading('');}}}>{downloading===p.id?t('준비 중…','Preparing…'):p.originalAvailable?t('원본 받기','Download original'):t('저장본 받기','Download copy')}</button></article>)}</div>
  </section>;
}
