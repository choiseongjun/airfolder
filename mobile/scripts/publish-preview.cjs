const fs = require('node:fs');
const path = require('node:path');
const source = path.resolve(__dirname, '../dist-web');
const destination = path.resolve(__dirname, '../../public/mobile-preview');
fs.mkdirSync(destination, { recursive: true });
fs.cpSync(source, destination, { recursive: true });
const index = path.join(destination, 'index.html');
fs.writeFileSync(index, fs.readFileSync(index, 'utf8').replace('<head>', '<head><meta name="robots" content="noindex,nofollow"><style>body{background:#e4e7df!important}#root{max-width:480px;margin:auto;box-shadow:0 0 50px #243c3022}</style>'));
console.log('Expo web preview: http://localhost:3000/mobile-preview/index.html');
