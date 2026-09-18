// 헤드리스 크롬으로 실제 화면을 열어 스크린샷을 찍고, 추첨 한 판을 끝까지 돌려 결과 창까지 확인한다.
//   node scripts/smoke.mjs [baseUrl]   (기본 http://localhost:1236/)
import { mkdirSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const base = process.argv[2] ?? 'http://localhost:1236/';
const out = 'smoke';
mkdirSync(out, { recursive: true });

const candidates = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
];
const browser = await puppeteer.launch({ headless: true, executablePath: candidates[0], args: ['--no-sandbox'] });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(`console: ${m.text()}`);
});

await page.setViewport({ width: 1440, height: 900 });
await page.goto(base, { waitUntil: 'networkidle0' });
await page.waitForSelector('html.ready', { timeout: 20000 });
await page.screenshot({ path: `${out}/01-main-dark.png` });

await page.click('#btnTheme');
await page.screenshot({ path: `${out}/02-main-light.png` });
await page.click('#btnTheme');

await page.click('#btnGuide');
await page.screenshot({ path: `${out}/03-guide.png` });
await page.keyboard.press('Escape');

// 여러 명 모드 1~3 등으로 한 판
await page.click('[data-winner="multi"]');
await page.evaluate(() => {
  const ta = document.querySelector('#in_names');
  ta.value = '사과,바나나,체리,포도,수박,키위,귤,망고,레몬,자두';
  ta.dispatchEvent(new Event('input'));
});
await page.click('#btnStart');
await new Promise((r) => setTimeout(r, 1500));
await page.screenshot({ path: `${out}/04-running.png` });

// 2배속: 화면 가운데를 누르고 있는다
const canvas = await page.$('#stage canvas');
const box = await canvas.boundingBox();
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
await page.mouse.down();
const started = Date.now();
await page.waitForFunction(() => document.querySelector('#resultDialog')?.open, { timeout: 180000, polling: 500 });
await page.mouse.up();
console.log(`draw finished in ${((Date.now() - started) / 1000).toFixed(1)}s`);
await new Promise((r) => setTimeout(r, 400));
await page.screenshot({ path: `${out}/05-result.png` });
const winners = await page.$$eval('#resultList li .name', (els) => els.map((e) => e.textContent));
console.log('winners:', winners);

await page.click('#btnHistory').catch(() => {});
await page.keyboard.press('Escape');
await page.click('#btnHistory');
await page.screenshot({ path: `${out}/06-history.png` });
await page.keyboard.press('Escape');

// 모바일 + 광고 미리보기
await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
await page.goto(`${base}?adpreview=1`, { waitUntil: 'networkidle0' });
await page.waitForSelector('html.ready');
await page.screenshot({ path: `${out}/07-mobile-adpreview.png` });
await page.click('#btnToggleSettings');
await page.screenshot({ path: `${out}/08-mobile-settings.png` });

await page.setViewport({ width: 1440, height: 900 });
await page.goto(`${base}?adpreview=1`, { waitUntil: 'networkidle0' });
await page.waitForSelector('html.ready');
await page.screenshot({ path: `${out}/09-desktop-adpreview.png` });

await page.goto(`${base}privacy.html`, { waitUntil: 'networkidle0' });
await page.screenshot({ path: `${out}/10-privacy.png` });
await page.goto(`${base}pinball.html`, { waitUntil: 'networkidle0' });
await page.screenshot({ path: `${out}/11-pinball.png` });
await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
await page.goto(`${base}guide.html`, { waitUntil: 'networkidle0' });
await page.screenshot({ path: `${out}/12-guide-mobile.png` });

await browser.close();
if (errors.length) {
  console.log('ERRORS:\n' + errors.join('\n'));
  process.exit(1);
}
console.log('smoke ok');
