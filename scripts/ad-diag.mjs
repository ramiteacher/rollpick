// 애드센스 진단: 페이지를 열고 광고 관련 요청/응답/콘솔을 기록한다.  node scripts/ad-diag.mjs
import puppeteer from 'puppeteer-core';
const urls = process.argv.slice(2);
const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--no-sandbox'] });
for (const url of urls) {
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36');
  await page.setViewport({ width: 1366, height: 900 });
  const log = [];
  page.on('response', async (r) => {
    const u = r.url();
    if (/googlesyndication|doubleclick|googleads|adtrafficquality/.test(u)) {
      let note = '';
      if (/pagead\/ads\?|\/ads\?/.test(u)) { try { const t = await r.text(); note = ' body=' + t.slice(0, 120).replace(/\s+/g, ' '); } catch {} }
      log.push(`${r.status()} ${u.slice(0, 110)}${note}`);
    }
  });
  page.on('console', (m) => { if (/ads|google/i.test(m.text())) log.push(`console[${m.type()}]: ${m.text().slice(0, 200)}`); });
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 8000));
  const info = await page.evaluate(() => ({
    ins: [...document.querySelectorAll('ins.adsbygoogle')].map((i) => `${i.getAttribute('data-ad-slot') || '-'}:${i.getAttribute('data-ad-status') || 'nostatus'}:${i.offsetWidth}x${i.offsetHeight}`),
    iframes: [...document.querySelectorAll('iframe')].map((f) => f.src.slice(0, 80)).filter((s) => /google|doubleclick/.test(s)),
    autoads: document.documentElement.getAttribute('data-adsbygoogle-status') || document.querySelector('script[src*="adsbygoogle"]')?.dataset?.adsbygoogleStatus || null,
    bodyH: document.body.scrollHeight,
  }));
  console.log(`\n=== ${url}`);
  console.log(JSON.stringify(info));
  for (const l of log) console.log('  ' + l);
  await page.close();
}
await browser.close();
