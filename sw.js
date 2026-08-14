const CACHE="simeter-v4";
self.addEventListener("install",e=>e.waitUntil(self.skipWaiting()));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
// Jangan cache HTML/JS agar update SIMETER langsung terbaca.
self.addEventListener("fetch",e=>{ if(e.request.method!=="GET") return; });
