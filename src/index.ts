import { initLocale } from './localization';
import { Roulette } from './roulette';
import { AdManager } from './ui/ads';
import { App } from './ui/app';

initLocale();

const roulette = new Roulette();
const ads = new AdManager();
const app = new App(roulette, ads);

function boot() {
  if (!roulette.isReady) {
    setTimeout(boot, 50);
    return;
  }
  app.init();
  ads.init();
  document.documentElement.classList.add('ready');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

// 디버깅용
(window as unknown as { roulette: Roulette }).roulette = roulette;
