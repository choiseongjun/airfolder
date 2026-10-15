import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import sharp from 'sharp';
const blue='#3949e7', cream='#f7f6f2';
// Two overlapping photo frames: a shared moment, kept together.
const mark=`<rect x="35" y="38" width="64" height="91" rx="16" transform="rotate(-12 67 83)" fill="#e4f4ae"/><rect x="76" y="51" width="65" height="91" rx="16" transform="rotate(10 108 96)" fill="#fffdf6"/><path d="M94 103l11-12 14 19" fill="none" stroke="${blue}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><circle cx="112" cy="78" r="5" fill="${blue}"/>`;
const icon=`<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180"><rect width="180" height="180" rx="42" fill="${blue}"/>${mark}</svg>`;
mkdirSync('public/brand',{recursive:true});
writeFileSync('app/icon.svg',icon); writeFileSync('public/brand/mark.svg',icon);
writeFileSync('public/brand/wordmark.svg', `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="110" viewBox="0 0 600 110"><g transform="translate(5 5) scale(.55)">${icon.replace(/<svg[^>]*>|<\/svg>/g,'')}</g><text x="125" y="76" font-family="Arial,sans-serif" font-size="62" font-weight="bold" letter-spacing="-3" fill="#23243b">memonestia</text></svg>`);
const square=Buffer.from(icon.replace('rx="42"','rx="0"'));
await sharp(square).resize(1024).png().toFile('mobile/assets/icon.png');
await sharp(square).resize(180).png().toFile('app/apple-icon.png');
await sharp(square).resize(64).png().toFile('mobile/assets/favicon.png');
const small=await sharp(square).resize(48).png().toBuffer();
const ico=Buffer.alloc(22);ico.writeUInt16LE(1,2);ico.writeUInt16LE(1,4);ico[6]=48;ico[7]=48;ico.writeUInt16LE(1,10);ico.writeUInt16LE(32,12);ico.writeUInt32LE(small.length,14);ico.writeUInt32LE(22,18);writeFileSync('app/favicon.ico',Buffer.concat([ico,small]));
const foreground=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180"><g transform="translate(27 27) scale(.7)">${mark}</g></svg>`);
await sharp(foreground).resize(1024).png().toFile('mobile/assets/android-icon-foreground.png');
await sharp(Buffer.from(icon)).resize(512).png().toFile('mobile/assets/splash-icon.png');
const photos=await Promise.all(['friends','sea','picnic'].map(async name=>(await sharp(`public/landing/${name}.webp`).resize(300,350,{fit:'cover'}).jpeg({quality:88}).toBuffer()).toString('base64')));
const photo=(i,x,y,angle,w=258,h=326)=>`<g transform="translate(${x} ${y}) rotate(${angle} ${w/2} ${h/2})"><rect x="4" y="10" width="${w}" height="${h}" rx="5" fill="#222542" opacity=".10"/><rect width="${w}" height="${h}" rx="5" fill="#fffefa"/><image x="12" y="12" width="${w-24}" height="${h-65}" preserveAspectRatio="xMidYMid slice" href="data:image/jpeg;base64,${photos[i]}"/><text x="18" y="${h-22}" font-family="Arial" font-size="13" letter-spacing="2" fill="#55556a">${['OUR KIND OF DAYS','A LITTLE GETAWAY','KEEP THIS FEELING'][i]}</text></g>`;
const copies={en:['Good days.','Better together.','Your photos. Your people. Your little stories.'],ko:['좋아하는 순간,','좋아하는 우리.','각자의 사진을 모아, 우리만의 한 페이지로.'],id:['Momen kecil.','Kenangan kita.','Foto bersama. Cerita yang selalu dekat.']};
for(const [lang,lines] of Object.entries(copies)){
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="${cream}"/><circle cx="1090" cy="120" r="290" fill="#e9eaff"/><g transform="translate(58 45) scale(.29)">${icon.replace(/<svg[^>]*>|<\/svg>/g,'')}</g><text x="126" y="83" font-family="Arial" font-size="33" font-weight="bold" letter-spacing="-1.3" fill="#23243b">memonestia</text><text x="62" y="182" font-family="Arial" font-size="12" letter-spacing="3.6" fill="${blue}">A LITTLE SPACE FOR US</text><text x="58" y="270" font-family="Arial,Malgun Gothic" font-size="${lang==='en'?64:56}" font-weight="bold" letter-spacing="-2.6" fill="#23243b">${lines[0]}</text><text x="58" y="346" font-family="Arial,Malgun Gothic" font-size="${lang==='en'?64:56}" font-weight="bold" letter-spacing="-2.6" fill="${blue}">${lines[1]}</text><text x="62" y="404" font-family="Arial,Malgun Gothic" font-size="21" fill="#66667a">${lines[2]}</text><rect x="62" y="493" width="230" height="40" rx="20" fill="#e4f4ae"/><text x="82" y="519" font-family="Arial" font-size="14" fill="#333b28">PRIVATE LITTLE MEMORIES</text><text x="62" y="583" font-family="Arial" font-size="16" fill="#77778a">memonestia.xyz</text>${photo(1,775,65,12,240,295)}${photo(0,650,210,-9)}${photo(2,920,300,8,215,270)}<g transform="translate(1005 155)"><path d="M0-28Q2-2 28 0Q2 2 0 28Q-2 2-28 0Q-2-2 0-28" fill="${blue}"/></g></svg>`;
await sharp(Buffer.from(svg)).png().toFile(`public/brand/og-${lang}.png`);
}
writeFileSync('public/share-card.png',readFileSync('public/brand/og-en.png'));
console.log('Brand mark, favicons, native assets and 3 localized OG cards generated.');
