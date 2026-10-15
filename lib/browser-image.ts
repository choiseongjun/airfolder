// Only the preview is converted. Callers retain the selected File as the original.
export async function browserImage(file:File):Promise<Blob>{
 if(!/image\/hei[cf]/i.test(file.type)&&! /\.hei[cf]$/i.test(file.name))return file;
 const {default:convert}=await import('heic-convert/browser');
 const bytes=await convert({buffer:new Uint8Array(await file.arrayBuffer()),format:'JPEG',quality:.9});
 return new Blob([new Uint8Array(bytes)],{type:'image/jpeg'});
}
