// VTM Markets Service Worker Force-Updater for Returning & Legacy Clients
const VTM_SW_BUILD_VERSION = '__VTM_DYNAMIC_BUILD_VER__';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

function pingClientVersion(client, timeoutMs = 350) {
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(null);
      }
    }, timeoutMs);

    try {
      const channel = new MessageChannel();
      channel.port1.onmessage = (event) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(event.data && event.data.version ? String(event.data.version) : null);
        }
      };
      client.postMessage(
        {
          type: 'VTM_PING_VERSION',
          targetVersion: VTM_SW_BUILD_VERSION,
        },
        [channel.port2]
      );
    } catch {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve(null);
      }
    }
  });
}

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        // 1. Purge any cached HTML documents from legacy workbox-precache or runtime caches
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(async (cacheName) => {
            if (cacheName.includes('vtm-html-navigation-cache')) {
              await caches.delete(cacheName);
            } else if (cacheName.includes('workbox-precache')) {
              const cache = await caches.open(cacheName);
              const requests = await cache.keys();
              await Promise.all(
                requests.map((req) => {
                  const url = req.url || '';
                  if (
                    url.endsWith('/') ||
                    url.includes('index.html') ||
                    url.endsWith('/login') ||
                    url.endsWith('/signup') ||
                    url.endsWith('/terminal') ||
                    url.endsWith('/demo') ||
                    url.endsWith('/markets')
                  ) {
                    return cache.delete(req);
                  }
                  return Promise.resolve(false);
                })
              );
            }
          })
        );

        // 2. Claim all open clients (tabs and installed PWAs)
        await self.clients.claim();

        // 3. Check all open window clients; if any client is running an older build (or legacy code that doesn't reply), force navigate it to the latest version
        const windowClients = await self.clients.matchAll({
          type: 'window',
          includeUncontrolled: true,
        });

        for (const client of windowClients) {
          try {
            const clientVersion = await pingClientVersion(client, 350);
            const isUpToDate =
              clientVersion &&
              VTM_SW_BUILD_VERSION !== '__VTM_DYNAMIC_BUILD_VER__' &&
              clientVersion === VTM_SW_BUILD_VERSION;

            if (!isUpToDate) {
              try {
                client.postMessage({
                  type: 'VTM_FORCE_RELOAD',
                  version: VTM_SW_BUILD_VERSION,
                });
              } catch {}

              if ('navigate' in client && client.url) {
                await client.navigate(client.url);
              }
            }
          } catch {}
        }
      } catch {}
    })()
  );
});
