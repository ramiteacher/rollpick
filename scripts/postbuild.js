// 빌드 산출물(dist/)에 정적 파일을 얹는다.
// - public/*: ads.txt / robots.txt / sitemap.xml / llms.txt / IndexNow 키 파일. Parcel 엔트리가 아니라서 직접 복사한다.
// - assets/icons/og-image.png: <meta og:image> 는 Parcel 이 다시 쓰지 않으므로 고정 경로로 복사한다.
// - .nojekyll: GitHub Pages 가 _ 로 시작하는 파일을 무시하지 않게 한다.
// - 404.html: 잘못된 경로도 첫 화면으로 보낸다 (GitHub Pages 는 404 상태를 유지한다).
const { copyFileSync, existsSync, mkdirSync, readdirSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');

const root = join(__dirname, '..');
const dist = join(root, 'dist');
if (!existsSync(dist)) mkdirSync(dist);

const pub = join(root, 'public');
for (const name of readdirSync(pub)) {
  copyFileSync(join(pub, name), join(dist, name));
}

const iconsOut = join(dist, 'assets', 'icons');
mkdirSync(iconsOut, { recursive: true });
copyFileSync(join(root, 'assets', 'icons', 'og-image.png'), join(iconsOut, 'og-image.png'));

writeFileSync(join(dist, '.nojekyll'), '');

const index = join(dist, 'index.html');
if (existsSync(index)) copyFileSync(index, join(dist, '404.html'));

console.log('postbuild done');
