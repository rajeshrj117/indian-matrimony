'use client';

import { useEffect } from 'react';

// Registers the service worker so the browser's PWA install criteria are met
// (manifest + service worker + HTTPS). Without this, "Add to Home Screen" on
// Android either won't offer an automatic install prompt or falls back to a
// plain bookmark-style shortcut with no standalone app chrome.
export default function PwaRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.error('Service worker registration failed', err);
      });
    }
  }, []);

  return null;
}
