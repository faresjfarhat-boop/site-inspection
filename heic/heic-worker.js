/* Site Inspection – HEIC/HEIF → JPEG converter (runs in a dedicated Worker, loaded only when a HEIC photo is met).
 Uses libheif-js (libheif compiled to WebAssembly, LGPL-3.0 – see LICENSE-libheif.txt next to this file), served from the
 same folder and precached by the service worker, so it works offline. Message in: {id, buf:ArrayBuffer, max?, q?}
 → out: {id, ok:true, blob:Blob(JPEG), w, h, n:images} or {id, ok:true, rgba:ArrayBuffer, w, h} (no OffscreenCanvas) or {id, ok:false, err}. */
let LIB=null,DEC=null;
const IN_WORKER=typeof WorkerGlobalScope!=='undefined'&&self instanceof WorkerGlobalScope;
/* also loadable as a classic <script> on the page (fallback when Workers can't be created, e.g. the single file opened from disk):
 then the page loads libheif first and calls self.__heicConvert(msg) directly */
function lib(){if(!LIB)LIB=new Promise((res,rej)=>{try{if(IN_WORKER)importScripts('libheif.js');let r=null;const M={onRuntimeInitialized:()=>Promise.resolve().then(()=>res(r||M)),onAbort:e=>rej(new Error('the HEIC converter could not be loaded (libheif: '+e+')')),print:()=>{},printErr:()=>{}};r=libheif(M)}catch(e){rej(new Error('the HEIC converter could not be loaded ('+(e&&e.message||e)+')'))}}).catch(e=>{LIB=null;throw e});return LIB}
async function convert({buf,max,q}){const L=await lib();if(!DEC)DEC=new L.HeifDecoder();
 const quiet=console.log;console.log=()=>{};let imgs;try{imgs=DEC.decode(new Uint8Array(buf))}finally{console.log=quiet}
 if(!imgs||!imgs.length)throw new Error('no image found in the file');
 try{const im=imgs.find(i=>i.is_primary&&i.is_primary())||imgs[0];const w=im.get_width(),h=im.get_height();if(!w||!h)throw new Error('image has no size');
  const out=await new Promise(r=>{console.log=()=>{};try{im.display({data:new Uint8ClampedArray(w*h*4),width:w,height:h},r)}finally{console.log=quiet}});
  if(!out)throw new Error('decoding failed');
  const s=max?Math.min(1,max/Math.max(w,h)):1,W=Math.max(1,Math.round(w*s)),H=Math.max(1,Math.round(h*s));
  if(typeof OffscreenCanvas==='function'){const c=new OffscreenCanvas(w,h),x=c.getContext('2d');x.putImageData(new ImageData(out.data,w,h),0,0);let c2=c;
   if(s<1){c2=new OffscreenCanvas(W,H);const x2=c2.getContext('2d');x2.imageSmoothingQuality='high';x2.fillStyle='#fff';x2.fillRect(0,0,W,H);x2.drawImage(c,0,0,W,H)}
   else{x.globalCompositeOperation='destination-over';x.fillStyle='#fff';x.fillRect(0,0,w,h)}
   const blob=await c2.convertToBlob({type:'image/jpeg',quality:q||0.9});return{blob,w:W,h:H,n:imgs.length}}
  return{rgba:out.data.buffer,w,h,n:imgs.length,transfer:[out.data.buffer]}}
 finally{for(const i of imgs)try{i.free()}catch(e){}try{L.heif_context_free(DEC.decoder);DEC.decoder=null}catch(e){}}}
if(!IN_WORKER)self.__heicConvert=convert;else self.onmessage=async e=>{const m=e.data||{};try{const r=await convert(m);const t=r.transfer||[];delete r.transfer;self.postMessage({id:m.id,ok:true,...r},t)}catch(err){self.postMessage({id:m.id,ok:false,err:String(err&&err.message||err)})}};
