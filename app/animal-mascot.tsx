import {characterAnimals,type CharacterAnimal} from '@/lib/character-style';
export default function AnimalMascot({animal}:{animal:CharacterAnimal}){
 const index=Math.max(0,characterAnimals.findIndex(a=>a.id===animal));
 return <span aria-hidden="true" style={{display:'block',width:'100%',height:'100%',backgroundImage:'url(/characters/memory-friends-v1.png)',backgroundSize:'600% 500%',backgroundPosition:`${index%6*20}% ${Math.floor(index/6)*25}%`,backgroundRepeat:'no-repeat',borderRadius:'inherit'}}/>;
}
