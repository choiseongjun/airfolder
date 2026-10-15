"use client";
import {useEffect,useState} from 'react';
type Row={kind:string;ms:number;wait:number;body:number;kb:number;server:string};
export default function PerformanceDiagnostics(){
 const [rows,setRows]=useState<Row[]>([]);
 const [active,setActive]=useState(false);
 useEffect(()=>{
  if(new URLSearchParams(location.search).get('diagnostics')!=='1')return;
  const observer=new PerformanceObserver(list=>{
   const added=list.getEntries().filter(e=>new URL(e.name).origin===location.origin&&new URL(e.name).pathname.startsWith('/api/')).map(entry=>{
    const e=entry as PerformanceResourceTiming,path=new URL(e.name).pathname;
    return {kind:path.startsWith('/api/photos/')?'photo':path.split('/').pop()!,ms:Math.round(e.duration),wait:Math.round(e.responseStart-e.requestStart),body:Math.round(e.responseEnd-e.responseStart),kb:Math.round(e.encodedBodySize/1024),server:e.serverTiming.map(t=>t.name+':'+Math.round(t.duration)).join(' ')};
   });
   if(added.length){setActive(true);setRows(old=>[...old,...added].slice(-80));}
  });
  observer.observe({type:'resource',buffered:true});return()=>observer.disconnect();
 },[]);
 if(!active)return null;
 return <aside aria-label="Performance diagnostics" style={{position:'fixed',inset:'auto 8px 8px auto',zIndex:99999,maxHeight:'45vh',overflow:'auto',background:'#fff',color:'#111',padding:16,border:'2px solid #555',fontSize:12}}><strong>Request timings (ms) · local diagnostics only</strong><table><thead><tr>{['Type','Total','TTFB','Body','KB','Server phases'].map(t=><th key={t}>{t}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={i}><td>{r.kind}</td><td>{r.ms}</td><td>{r.wait}</td><td>{r.body}</td><td>{r.kb}</td><td>{r.server}</td></tr>)}</tbody></table></aside>;
}
