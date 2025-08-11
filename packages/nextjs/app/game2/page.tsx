'use client';

import { useEffect } from 'react';

// Load a script only once. If it's already on the page, wait for it to be loaded.
function loadScriptOnce(src: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing) {
      // if it already loaded, resolve immediately; otherwise wait for the load event
      if (existing.dataset.loaded === 'true') return resolve();
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)));
      return;
    }

    const s = document.createElement('script');
    s.src = src;
    s.async = false; // preserve order
    s.dataset.loaded = 'false';
    s.onload = () => {
      s.dataset.loaded = 'true';
      resolve();
    };
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.body.appendChild(s);
  });
}

export const dynamic = 'force-dynamic'; // avoid SSR on this route

export default function GamePage() {
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // 1) Phaser global (only once)
        await loadScriptOnce('https://cdn.jsdelivr.net/npm/phaser@2.6.2/build/phaser.min.js');

        // If a previous dev render already started a game, destroy it
        const prev = (window as any).__phaserGame || (window as any).game;
        if (prev && typeof prev.destroy === 'function') {
          try { prev.destroy(true); } catch {}
          (window as any).__phaserGame = undefined;
          (window as any).game = undefined;
        }

        // 2) Your merged game file (only once). IMPORTANT: make sure your game.js sets window.__phaserGame = game
        await loadScriptOnce('/game/game.js');

        if (cancelled) return;

        // Sanity logs
        if (!(window as any).Phaser) console.error('Phaser not on window — check CDN load.');
        const g = (window as any).__phaserGame || (window as any).game;
        if (!g) {
          console.warn('Phaser game instance not found on window. In game.js, set `window.__phaserGame = game;` after creating it.');
        }
      } catch (err) {
        console.error(err);
      }
    })();

    return () => {
      cancelled = true;
      // Clean up the running game when navigating away
      const g = (window as any).__phaserGame || (window as any).game;
      if (g && typeof g.destroy === 'function') {
        try { g.destroy(true); } catch {}
      }
      (window as any).__phaserGame = undefined;
      (window as any).game = undefined;
    };
  }, []);

  return (
  <div
    style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0b1221',
    }}
  >
    <div id="game-container" />
  </div>
);

}
