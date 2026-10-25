import {characterAnimals,type CharacterAnimal} from './character-style';
export const STORY_QUESTION='너는 그날을 어떻게 기억해?';
export type StoryPhoto={id:string;src:string};
export type StoryEntry={id:string;personId:string;name:string;body:string;animal:CharacterAnimal;avatar:string|null;mine:boolean;photos:StoryPhoto[]};
export type TripStory={folderId:string;title:string;canInvite:boolean;entries:StoryEntry[];total:number;people:number};
export function storyAnimal(value:unknown):CharacterAnimal{return characterAnimals.some(a=>a.id===value)?value as CharacterAnimal:'cat';}
export function storyInvite(title:string,link:string){return `우리의 ${title}, 나는 이렇게 기억해.\n같은 날을 함께 보냈지만, 네 기억은 조금 다를 것 같아서.\n네가 간직한 사진 한 장과 한마디도 남겨줄래?\n앱 설치·회원가입 없이 보탤 수 있어.\n${link}`;}
export type StorySaveState={folderId?:string;creationId:string;noteId:string;uploaded:Set<string>;noteAttempted?:boolean;saved?:boolean;token?:string};
export type StoryFile={id:string;file:File;src:string};
type StoryApi=<T=Record<string,unknown>>(url:string,options?:RequestInit)=>Promise<T>;
// Preserve all IDs and completed stages so retries never create duplicate albums or notes.
export async function saveStory(api:StoryApi,state:StorySaveState,input:{title:string;name:string;body:string;animal:CharacterAnimal;useProfile:boolean;files:StoryFile[];attemptId:string},invite:boolean){
 if(!state.folderId){const result=await api<{id:string}>('/api/folders',{method:'POST',body:JSON.stringify({name:input.title,category:'여행',source:'organizer',creationId:state.creationId,story:true,flow:'trip_story',attempt_id:input.attemptId})});state.folderId=result.id;}
 for(const item of input.files){if(state.uploaded.has(item.id))continue;const form=new FormData();form.set('id',item.id);form.set('folderId',state.folderId);form.set('file',item.file,item.file.name);form.set('name',item.file.name);form.set('created',String(Math.min(item.file.lastModified||Date.now(),Date.now())));form.set('shared','true');await api('/api/photos',{method:'POST',body:form});state.uploaded.add(item.id);}
 if(!state.saved){state.noteAttempted=true;await api('/api/trip-story',{method:'POST',body:JSON.stringify({folderId:state.folderId,id:state.noteId,name:input.name,body:input.body,animal:input.animal,useProfile:input.useProfile,photoIds:input.files.map(p=>p.id),attempt_id:input.attemptId})});state.saved=true;}
 if(invite&&!state.token){const r=await api<{token:string}>('/api/invites',{method:'POST',body:JSON.stringify({folderId:state.folderId,flow:'trip_story',attempt_id:input.attemptId})});state.token=r.token;}
 return{folderId:state.folderId,token:state.token};
}
