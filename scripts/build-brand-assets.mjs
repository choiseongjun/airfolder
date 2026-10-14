import sharp from 'sharp';
import { readFileSync } from 'node:fs';
const icon = readFileSync('app/icon.svg');
await sharp(icon).resize(1024,1024).flatten({background:'#284d3c'}).png().toFile('mobile/assets/icon.png');
const card = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#f7f5ee"/><text x="80" y="112" fill="#284d3c" font-family="Arial,sans-serif" font-size="42" font-weight="bold">snaproom.</text><text x="80" y="260" fill="#284d3c" font-family="Arial,sans-serif" font-size="76" font-weight="bold">Shoot anywhere.</text><text x="80" y="350" fill="#284d3c" font-family="Arial,sans-serif" font-size="76" font-weight="bold">Gather here.</text><text x="84" y="445" fill="#667267" font-family="Arial,sans-serif" font-size="26">Your favourite camera. Your photos, together.</text><text x="84" y="550" fill="#9c704b" font-family="Arial,sans-serif" font-size="22">Private by default. Shared by choice.</text><path d="M895 225h90l28 30h113v150H895z" fill="#284d3c"/><circle cx="1010" cy="330" r="36" fill="#c18b57"/></svg>`;
await sharp(Buffer.from(card)).png().toFile('public/share-card.png');
console.log('Updated native icon and public share card.');
