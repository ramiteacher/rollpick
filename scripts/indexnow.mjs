// IndexNow 핑: 배포 뒤 사이트맵의 URL 전부를 Bing·Naver·Yandex 계열 검색엔진에 알린다.
// 키 파일은 public/<key>.txt 로 배포되어 있어야 한다 (.indexnow-key 에 키가 있다).
//   npm run indexnow
import { readFileSync } from 'node:fs';

const host = 'ramiteacher.github.io';
const key = readFileSync(new URL('../.indexnow-key', import.meta.url), 'utf8').trim().replace(/^INDEXNOW_KEY=/, '');
const sitemap = readFileSync(new URL('../public/sitemap.xml', import.meta.url), 'utf8');
const urlList = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);

const body = { host, key, keyLocation: `https://${host}/rollpick/${key}.txt`, urlList };
const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify(body),
});
console.log(`IndexNow ${res.status} ${res.statusText} — ${urlList.length} urls`);
if (!res.ok) process.exit(1);
