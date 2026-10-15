const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const code = ts.transpileModule(fs.readFileSync('app/policy-gate.tsx','utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
function setup(request) {
  const states=[]; let cursor=0, effect;
  const exports={};
  vm.runInNewContext(code,{exports,require(name){
    if(name==='react') return {useState(initial){const i=cursor++;if(!(i in states))states[i]=initial;return [states[i],v=>states[i]=typeof v==='function'?v(states[i]):v];},useEffect(fn){effect=fn;}};
    if(name==='react/jsx-runtime')return require(name);
    if(name==='next/link')return {default:({children,...props})=>React.createElement('a',props,children)};
    if(name==='@/lib/client-api')return {api:()=>request};
    if(name==='@/lib/policy')return {TERMS_VERSION:'test'};
    return {};
  }});
  return {render(){cursor=0;return renderToStaticMarkup(exports.default({ko:true}));},load(){effect();}};
}
test('no consent dialog while loading, or after existing acceptance is returned',async()=>{
  let resolve;const h=setup(new Promise(r=>resolve=r));
  assert.equal(h.render(),'');h.load();resolve({accepted:true});await new Promise(setImmediate);
  assert.equal(h.render(),'');
});
test('only confirmed missing acceptance opens consent dialog',async()=>{
  const h=setup(Promise.resolve({accepted:false}));h.render();h.load();await new Promise(setImmediate);
  assert.match(h.render(),/role="dialog"/);
});
test('lookup failure offers retry without claiming user has not agreed',async()=>{
  const h=setup(Promise.reject(new Error('offline')));h.render();h.load();await new Promise(setImmediate);
  const html=h.render();assert.doesNotMatch(html,/role="dialog"/);assert.match(html,/다시 확인/);
});
