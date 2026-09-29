/* Site Inspection service worker – offline app shell. Dropbox API calls are never cached. */
const CACHE='sap-41504e59f4';const ASSETS=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('sap-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{const req=e.request,u=new URL(req.url);if(req.method!=='GET'||u.origin!==location.origin)return;
 if(req.mode==='navigate'){e.respondWith(fetch(req).then(r=>{if(r.ok){const c=r.clone();caches.open(CACHE).then(x=>x.put('./index.html',c))}return r}).catch(()=>caches.match('./index.html')));return}
 e.respondWith(caches.match(req).then(r=>r||fetch(req)))});
