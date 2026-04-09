const CACHE_NAME = "elohim-financeiro-v1";

const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/style.css",
  "./js/app.js",
  "./js/config.js",
  "./js/api/supabase.js",
  "./js/core/utils.js",
  "./js/core/navigation.js",
  "./js/core/auth.js",
  "./js/modules/dashboard.js",
  "./js/modules/contas-pagar.js",
  "./js/modules/contas-pagas.js",
  "./js/modules/contas-receber.js",
  "./js/modules/contas-recebidas.js",
  "./js/modules/faturamento.js",
  "./js/modules/metas.js",
  "./js/modules/importar.js",
  "./js/modules/resumo.js",
  "./js/modules/planejamento.js",
  "./logo-elohim.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-180.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      return (
        cached ||
        fetch(event.request)
          .then(response => {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone);
            });
            return response;
          })
          .catch(() => cached)
      );
    })
  );
});
