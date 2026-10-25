'use client';
import {useState} from 'react';
import {characterAnimals,mascotName,type CharacterAnimal} from '@/lib/character-style';
import AnimalMascot from './animal-mascot';
import './animal-picker.css';
const groups=[{label:'모두',ids:characterAnimals.map(a=>a.id)},{label:'포근한 친구',ids:['cat','dog','otter','rabbit','bear','hamster']},{label:'숲속 친구',ids:['fox','panda','koala','raccoon','squirrel','hedgehog','deer','sloth']},{label:'초원 친구',ids:['tiger','lion','elephant','giraffe']},{label:'날개 친구',ids:['penguin','duck','owl','chick','flamingo','parrot']},{label:'물가 친구',ids:['seal','dolphin','whale','turtle','octopus','frog']}];
export default function AnimalPicker({value,onChange}:{value:CharacterAnimal|null;onChange:(animal:CharacterAnimal)=>void}){
 const [group,setGroup]=useState(0);
 const selected=characterAnimals.find(a=>a.id===value);
 return <div className="memory-animal-picker"><div className="memory-animal-heading"><span>조금 엉뚱한 우리들 · 30종</span><strong aria-live="polite">{selected?mascotName(selected.id):'프로필 캐릭터 선택'}</strong></div><div className="memory-animal-filters" role="group" aria-label="캐릭터 분류">{groups.map((g,i)=><button type="button" key={g.label} aria-pressed={group===i} onClick={()=>setGroup(i)}>{g.label}</button>)}</div><div className="memory-animal-grid" role="group" aria-label="동물 캐릭터 선택">{characterAnimals.filter(a=>groups[group].ids.includes(a.id)).map(a=><button type="button" key={a.id} aria-label={`${mascotName(a.id)} · ${a.label}`} aria-pressed={value===a.id} onClick={()=>onChange(a.id)}><span className="memory-mascot-art"><AnimalMascot animal={a.id}/></span><span>{mascotName(a.id)}</span></button>)}</div><small>조금 어설퍼서 더 정이 가는, 내 기억 속 작은 친구.</small></div>;
}
