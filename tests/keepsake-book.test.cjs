const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function renderer(){
 const exports={},pages=[];
 const document={fonts:{ready:Promise.resolve()},createElement(){const page={text:[],images:[]};pages.push(page);const context={font:'',fillStyle:'',fillRect(){},measureText(value){return {width:[...value].length*parseInt(this.font)*.7}},fillText(value,x,y){page.text.push({value,x,y})},drawImage(img,...args){page.images.push({src:img.src,args})}};return {width:0,height:0,getContext:()=>context,toBlob(cb){cb(new Blob(['page'],{type:'image/jpeg'}))}};}};
 class Image{width=1200;height=800;set src(value){this._src=value;queueMicrotask(()=>value==='broken'?this.onerror():this.onload())}get src(){return this._src}}
 const code=ts.transpileModule(fs.readFileSync('lib/keepsake-book.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(code,{exports,document,Image,File,Blob,queueMicrotask});return {...exports,pages};
}
test('book exports a cover, one page per selected photo in order, and the user letter',async()=>{
 const r=renderer(),files=await r.renderKeepsakeBook({title:'우리의 날',companions:'친구들과',story:'우리가 함께한 날 ♡',photos:['one','two'],locale:'ko'});
 assert.equal(files.length,4);assert.deepEqual(Array.from(files,f=>f.name),['memory-book-01.jpg','memory-book-02.jpg','memory-book-03.jpg','memory-book-04.jpg']);
 assert.equal(r.pages[0].images[0].src,'one');assert.equal(r.pages[1].images[0].src,'one');assert.equal(r.pages[2].images[0].src,'two');assert.ok(r.pages[3].text.some(t=>t.value==='우리가 함께한 날 ♡'));
 for(const page of r.pages)for(const image of page.images){const [x,y,w,h]=image.args;assert.ok(x>=0&&y>=0&&x+w<=1080&&y+h<=1440);assert.equal(w/h,1.5);}
});
test('long and many-paragraph letters fit without dropping their words',async()=>{
 const r=renderer(),story=Array(250).fill('가').join('\n');await r.renderKeepsakeBook({title:'제목',companions:'',story,photos:['one'],locale:'ko'});
 const lines=r.pages[2].text.filter(x=>x.y>=300&&x.y<1350);assert.equal(lines.map(x=>x.value).join('').replace(/\s/g,''),'가'.repeat(250));assert.ok(lines.every(x=>x.y<1250));
});
test('invalid photo counts and broken photos fail instead of producing a partial book',async()=>{
 for(const photos of [[],Array(9).fill('one'),['broken']])await assert.rejects(()=>renderer().renderKeepsakeBook({title:'Test',companions:'',story:'Words',photos,locale:'en'}));
});
