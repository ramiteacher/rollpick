// 빌드 산출물(dist/)에 정적 파일을 얹는다.
// - ads.txt / robots.txt / sitemap.xml: Parcel 엔트리가 아니라서 직접 복사한다.
// - .nojekyll: GitHub Pages 가 _ 로 시작하는 파일을 무시하지 않게 한다.
// - 404.html: SPA 는 아니지만 잘못된 경로도 첫 화면으로 보낸다.
const { copyFileSync, existsSync, mkdirSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');

const root = join(__dirname, '..');
const dist = join(root, 'dist');
if (!existsSync(dist)) mkdirSync(dist);

for (const name of ['ads.txt', 'robots.txt', 'sitemap.xml']) {
  const src = join(root, 'public', name);
  if (existsSync(src)) copyFileSync(src, join(dist, name));
}

writeFileSync(join(dist, '.nojekyll'), '');

const index = join(dist, 'index.html');
if (existsSync(index)) copyFileSync(index, join(dist, '404.html'));

console.log('postbuild done');
