// Isolated CPU verification of the same browser bundle and models. No user photos or identities.
// Fixture: https://raw.githubusercontent.com/vladmandic/face-api/master/demo/sample1.jpg
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import sharp from 'sharp';
import ts from 'typescript';
const base=process.env.TEST_BASE_URL||'http://localhost:3000';
const sandbox={console:{log(){},warn(){},error(){}},fetch,TextEncoder,TextDecoder,performance,setTimeout,clearTimeout,URL,URLSearchParams};
sandbox.self=sandbox;vm.createContext(sandbox);
try{
 vm.runInContext(readFileSync('public/face-models/face-api.js','utf8'),sandbox);
 const f=sandbox.faceapi;
 f.env.setEnv({fetch,Canvas:class{},Image:class{},ImageData:class{},Video:class{}});
 f.tf.setPlatform('test',{fetch,now:()=>performance.now(),encode:s=>new TextEncoder().encode(s),decode:b=>new TextDecoder().decode(b),isTypedArray:a=>ArrayBuffer.isView(a)});
 await f.tf.setBackend('cpu');await f.tf.ready();
 await Promise.all([f.nets.tinyFaceDetector.loadFromUri(base+'/face-models'),f.nets.faceLandmark68TinyNet.loadFromUri(base+'/face-models'),f.nets.faceRecognitionNet.loadFromUri(base+'/face-models')]);
 const out={};new Function('exports',ts.transpileModule(readFileSync('lib/face-search.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(out);
 async function detect(pipeline){const {data,info}=await pipeline.removeAlpha().raw().toBuffer({resolveWithObject:true});const tensor=f.tf.tensor3d(Array.from(data),[info.height,info.width,3]);try{return await f.detectAllFaces(tensor,new f.TinyFaceDetectorOptions({inputSize:416,scoreThreshold:.5})).withFaceLandmarks(true).withFaceDescriptors();}finally{tensor.dispose();}}
 const faces=await detect(sharp('artifacts/face-test-sample.jpg').resize({width:640}));
 const changed=await detect(sharp('artifacts/face-test-sample.jpg').resize({width:600}).modulate({brightness:1.08}));
 assert.ok(faces.length>=2);assert.ok(changed.length>=2);
 for(const face of faces){assert.equal(face.descriptor.length,128);assert.ok(Math.min(...changed.map(other=>out.faceDistance(face.descriptor,other.descriptor)))<.52);}
 assert.ok(faces.some(a=>faces.some(b=>out.faceDistance(a.descriptor,b.descriptor)>.52)));
 const blank=await detect(sharp({create:{width:300,height:300,channels:3,background:'#ffffff'}}));assert.equal(blank.length,0);
 [...faces,...changed].forEach(r=>r.descriptor.fill(0));
 console.log('PASS: local face detection, 128-value descriptors, resize/brightness matching, distinct-face rejection, blank-image rejection. This is an engine smoke test, not an accuracy benchmark.');
}catch(error){console.error(error.message);process.exitCode=1;}
