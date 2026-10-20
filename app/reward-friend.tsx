import type { CSSProperties } from 'react';
import { REWARDS } from '@/lib/piece-rewards';

// Vector artwork stays crisp in the small feed preview and exported cards.
export function RewardFriend({ character = 'bear', outfit, egg = false, level = 2, className, style }: {
  character?: string; outfit?: string; egg?: boolean; level?: number; className?: string; style?: CSSProperties;
}) {
  const color = REWARDS.find(reward => reward.id === character)?.color ?? '#c69b75';
  const dark = '#594536';
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" aria-hidden="true" className={className} style={style}>
    <ellipse cx="100" cy="179" rx="57" ry="9" fill="#5d4731" opacity=".1"/>
    {egg ? <g>
      <path d="M100 42C72 42 46 95 46 130a54 49 0 0 0 108 0c0-35-26-88-54-88Z" fill="#f7e9cf" stroke="#bc9c75" strokeWidth="3"/>
      <path d="m48 121 22-14 19 17 24-18 20 17 20-13" fill="none" stroke="#d8b88d" strokeWidth="4"/>
      <circle cx="81" cy="90" r="4" fill={dark}/><circle cx="119" cy="90" r="4" fill={dark}/>
      <path d="M94 101q6 7 12 0" fill="none" stroke={dark} strokeWidth="3" strokeLinecap="round"/>
      <path d="m157 54 4-10 4 10 10 4-10 4-4 10-4-10-10-4Z" fill="#d9b95e"/>
    </g> : <g stroke={dark} strokeWidth="2.5" strokeLinejoin="round">
      <ellipse cx="100" cy="142" rx="43" ry="38" fill={color}/>
      <ellipse cx="100" cy="146" rx="25" ry="24" fill="#fff4dd" stroke="none"/>
      <ellipse cx="63" cy="141" rx="12" ry="21" fill={color} transform="rotate(25 63 141)"/>
      <ellipse cx="137" cy="141" rx="12" ry="21" fill={color} transform="rotate(-25 137 141)"/>
      <ellipse cx="76" cy="175" rx="18" ry="10" fill={color}/><ellipse cx="124" cy="175" rx="18" ry="10" fill={color}/>
      {character === 'rabbit' ? <g fill={color}><ellipse cx="75" cy="45" rx="13" ry="32" transform="rotate(-12 75 45)"/><ellipse cx="125" cy="45" rx="13" ry="32" transform="rotate(12 125 45)"/><path d="M74 25v35m52-35v35" stroke="#d8938f" strokeWidth="6" strokeLinecap="round"/></g>
        : character === 'cat' || character === 'fox' ? <g fill={color}><path d="m55 77-3-42 39 25m18 0 39-25-3 42"/><path d="m61 59-2-12 17 13m48 0 17-13-2 12" fill="#f4cebd" stroke="none"/></g>
        : character === 'dog' ? <g fill="#81634e"><ellipse cx="54" cy="81" rx="16" ry="30" transform="rotate(15 54 81)"/><ellipse cx="146" cy="81" rx="16" ry="30" transform="rotate(-15 146 81)"/></g>
        : <g fill={character === 'panda' ? dark : color}><circle cx="63" cy="55" r="19"/><circle cx="137" cy="55" r="19"/><circle cx="63" cy="55" r="10" fill="#e8b9a0" stroke="none"/><circle cx="137" cy="55" r="10" fill="#e8b9a0" stroke="none"/></g>}
      <ellipse cx="100" cy="87" rx="49" ry="41" fill={color}/>
      {character === 'panda' && <g fill={dark} stroke="none"><ellipse cx="79" cy="83" rx="13" ry="17" transform="rotate(25 79 83)"/><ellipse cx="121" cy="83" rx="13" ry="17" transform="rotate(-25 121 83)"/></g>}
      {character === 'fox' && <path d="m55 86 28 9 17-5 17 5 28-9q-5 38-45 38T55 86" fill="#fff4dd" stroke="none"/>}
      <g stroke="none"><circle cx="79" cy="82" r="4.5" fill={character === 'panda' ? '#fff4dd' : dark}/><circle cx="121" cy="82" r="4.5" fill={character === 'panda' ? '#fff4dd' : dark}/><ellipse cx="66" cy="98" rx="9" ry="5" fill="#d98e83" opacity=".65"/><ellipse cx="134" cy="98" rx="9" ry="5" fill="#d98e83" opacity=".65"/><ellipse cx="100" cy="95" rx="5" ry="3.5" fill={dark}/></g>
      <path d="M100 98v5m-9 0q4 8 9 0 5 8 9 0" fill="none" strokeLinecap="round"/>
      {character === 'cat' && <path d="m58 92-17-4m17 12-17 3m101-11 17-4m-17 12 17 3" strokeWidth="2"/>}
      {outfit === 'leaf' && <g stroke="#678350" fill="#a8bf87"><path d="M102 51V31"/><path d="M102 37Q79 40 82 21q19-1 20 16Zm0 1q2-22 22-17 2 20-22 17Z"/></g>}
      {outfit === 'scarf' && <g fill="#b76550"><path d="M65 118q35 14 70 0v13q-35 15-70 0Z"/><path d="m114 132 17 2-4 29-17-3Z"/><path d="m68 125 62 2m-12 9-3 22" stroke="#f2d5ae" strokeWidth="3"/></g>}
      {outfit === 'beret' && <g fill="#829275"><path d="M55 60q-3-35 50-34 45 0 42 29l-22 8-70-3Z"/><path d="m99 26 5-9" strokeWidth="5"/></g>}
      {outfit === 'camera' && <g><path d="m71 116 17 33m41-33-17 33" fill="none" stroke="#a9674f" strokeWidth="5"/><rect x="76" y="140" width="48" height="29" rx="6" fill="#82959a"/><rect x="81" y="136" width="12" height="6" fill="#82959a"/><circle cx="103" cy="154" r="10" fill="#f7ebd5"/><circle cx="103" cy="154" r="5" fill={dark}/></g>}
      {outfit === 'bag' && <g fill="#d8ac64"><path d="m75 115 48 49" fill="none" stroke="#977343" strokeWidth="6"/><rect x="108" y="146" width="34" height="26" rx="6"/><path d="M108 154h34m-16-3v8" fill="none"/></g>}
      {outfit === 'crown' && <g fill="#e6c56a"><path d="m66 54-5-27 23 13 16-25 16 25 23-13-5 27Z"/><circle cx="100" cy="44" r="4" fill="#c47b62"/></g>}
      {level >= 4 && <g fill="#e6c56a" stroke="none"><path d="m165 87 3-9 3 9 9 3-9 3-3 9-3-9-9-3Z"/><path d="m28 117 2-7 2 7 7 2-7 2-2 7-2-7-7-2Z"/></g>}
    </g>}
  </svg>;
}
