type FaceApi = typeof import('@vladmandic/face-api');
declare global { interface Window { faceapi?: FaceApi; } }
let loading: Promise<FaceApi> | undefined;
export function loadFaces(): Promise<FaceApi> {
  return loading ??= (async()=>{
    if(!window.faceapi) await new Promise<void>((resolve,reject)=>{
      const script=document.createElement('script');script.src='/face-models/face-api.js';script.async=true;
      script.onload=()=>resolve();script.onerror=()=>{script.remove();reject(new Error('MODEL_LOAD_FAILED'));};document.head.append(script);
    });
    const api=window.faceapi!;
    await (api.tf as unknown as {ready:()=>Promise<void>}).ready();
    await Promise.all([api.nets.tinyFaceDetector.loadFromUri('/face-models'),api.nets.faceLandmark68TinyNet.loadFromUri('/face-models'),api.nets.faceRecognitionNet.loadFromUri('/face-models')]);
    return api;
  })().catch(error=>{loading=undefined;throw error;});
}
export async function descriptors(blob: Blob) {
  const api=await loadFaces(),url=URL.createObjectURL(blob);
  try {
    const img=new Image();img.src=url;await img.decode();
    if(img.naturalWidth*img.naturalHeight>50000000)throw new Error('IMAGE_TOO_LARGE');
    // Bound browser memory and inference time. Embeddings are returned only to the current UI session.
    const canvas=document.createElement('canvas'),scale=Math.min(1,1280/Math.max(img.naturalWidth,img.naturalHeight));
    canvas.width=Math.round(img.naturalWidth*scale);canvas.height=Math.round(img.naturalHeight*scale);
    canvas.getContext('2d')!.drawImage(img,0,0,canvas.width,canvas.height);
    const result=await api.detectAllFaces(canvas,new api.TinyFaceDetectorOptions({inputSize:416,scoreThreshold:0.5})).withFaceLandmarks(true).withFaceDescriptors();
    canvas.width=0;canvas.height=0;img.src='';
    return result.map(face=>face.descriptor);
  } finally {URL.revokeObjectURL(url);}
}
export function faceDistance(a:Float32Array,b:Float32Array){
  if(a.length!==128||b.length!==128)return Infinity;
  return Math.sqrt(a.reduce((sum,value,index)=>sum+(value-b[index])**2,0));
}
