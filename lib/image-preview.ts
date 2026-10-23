import sharp from 'sharp';
import {readFile} from 'node:fs/promises';
import convert from 'heic-convert';

export async function imagePreview(path:string,mime:string){
 const source=await readFile(path);
 const render=(input:string|Buffer)=>sharp(input,{limitInputPixels:100000000}).rotate().resize({width:2560,height:2560,fit:'inside',withoutEnlargement:true}).jpeg({quality:85}).toBuffer();
 // Buffer input avoids libvips caching an open temporary file on Windows.
 try{return await render(source);}catch(error){
  if(!['image/heic','image/heif'].includes(mime))throw error;
  // libvips distributions do not consistently include the HEVC decoder.
  const metadata=await sharp(source,{limitInputPixels:100000000}).metadata();
  if(!metadata.width||!metadata.height||metadata.width*metadata.height>100000000)throw new Error('INVALID_IMAGE');
  const decoded=await convert({buffer:source,format:'JPEG',quality:.95});
  return render(Buffer.from(decoded));
 }
}
