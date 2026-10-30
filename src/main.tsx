import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

declare const __VTM_BUILD_ID__: string | undefined;

function setupAutomaticPlatformUpdater() {
  if (typeof window === 'undefined') return;

  const compiledBuildId = typeof __VTM_BUILD_ID__ !== 'undefined' ? __VTM_BUILD_ID__ : '';
  let isApplyingUpdate = false;

  const applyLatestVersionAndReload = async (targetVersion?: string) => {
    if (isApplyingUpdate) return;
    const guardKey = `vtm_auto_updated_${targetVersion || Date.now()}`;
    if (targetVersion && sessionStorage.getItem(guardKey) === '1') return;
    isApplyingUpdate = true;
    if (targetVersion) {
      sessionStorage.setItem(guardKey, '1');
      localStorage.setItem('vtm_sw_build_ver', targetVersion);
    }

    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          registrations.map(async (reg) => {
            try {
              await reg.update();
              if (reg.waiting) {
                reg.waiting.postMessage({ type: 'SKIP_WAITING' });
              }
            } catch {}
          })
        );
      }
      if ('caches' in window) {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map((key) => caches.delete(key)));
      }
    } catch {}

    window.location.reload();
  };

  const checkLiveServerVersion = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        registrations.forEach((reg) => {
          try {
            reg.update();
            if (reg.waiting) {
              reg.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
          } catch {}
        });
      }

      const res = await fetch(`/version.json?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      });
      if (!res.ok) return;
      const data = await res.json();
      const remoteVersion = typeof data?.version === 'string' ? data.version.trim() : '';
      if (!remoteVersion) return;

      const storedVer = localStorage.getItem('vtm_sw_build_ver') || '';
      if (
        (compiledBuildId && remoteVersion !== compiledBuildId) ||
        (storedVer && storedVer !== '__VTM_DYNAMIC_BUILD_VER__' && remoteVersion !== storedVer)
      ) {
        await applyLatestVersionAndReload(remoteVersion);
      } else if (!storedVer || storedVer === '__VTM_DYNAMIC_BUILD_VER__') {
        localStorage.setItem('vtm_sw_build_ver', remoteVersion);
      }
    } catch {
      // Ignore transient offline network errors
    }
  };

  // Recover automatically if a user on an older tab triggers a lazy chunk load from a previous build
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    applyLatestVersionAndReload();
  });

  // Check immediately on boot, whenever user returns to the app/tab, on reconnect, and every 60s
  checkLiveServerVersion();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkLiveServerVersion();
    }
  });
  window.addEventListener('focus', checkLiveServerVersion);
  window.addEventListener('online', checkLiveServerVersion);
  window.setInterval(checkLiveServerVersion, 60 * 1000);
}

setupAutomaticPlatformUpdater();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
