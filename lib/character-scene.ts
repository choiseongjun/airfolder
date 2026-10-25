import type {CharacterAnimal} from './character-style';
export function characterScene(animal:CharacterAnimal){
 if(['sloth','koala','owl','bear','penguin'].includes(animal))return {id:'night',label:'마음을 쉬게 하는 밤',background:'#e9edf2',ink:'#53647b',symbol:'☾'};
 if(['panda','raccoon','hamster','otter'].includes(animal))return {id:'cafe',label:'잠깐, 우리만의 쉬는 시간',background:'#efe3d6',ink:'#83614b',symbol:'☕'};
 if(['cat','dog','rabbit','chick'].includes(animal))return {id:'butter',label:'작고 다정한 순간',background:'#f5ecd2',ink:'#897147',symbol:'✳'};
 if(['seal','dolphin','whale','turtle','octopus','frog','duck','flamingo'].includes(animal))return {id:'water',label:'느리게 흘러도 좋은 하루',background:'#e2eeeb',ink:'#527a75',symbol:'≈'};
 return {id:'garden',label:'오래 간직하고 싶은 마음',background:'#e9eddc',ink:'#697954',symbol:'❧'};
}
