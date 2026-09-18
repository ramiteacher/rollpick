# RollPick

구슬을 굴려 당첨자를 뽑는 물리 기반 랜덤 추첨기입니다.
이름을 넣고 시작만 누르면 구슬이 맵을 따라 떨어지며, 골인 순서로 당첨자가 정해집니다.

**Demo:** https://ramiteacher.github.io/rollpick/

## 기능

- 4가지 맵, 1등 / 마지막 / 특정 등수 / 여러 명(범위) 당첨 모드
- 이름 문법: `이름*3`(응모 3회), `이름/5`(무게 5), 중복 이름 자동 병합
- 결과 창에서 당첨자 복사·공유·다시 뽑기, 전체 순위 확인
- 추첨 기록 30건 보관(브라우저 로컬), 명단이 담긴 공유 링크(`?names=a,b,c`)
- 다크 / 라이트 테마, 한국어 · English · 日本語, 전체 화면, PWA 설치
- 추첨 영상 자동 녹화(브라우저 MediaRecorder), 2배속(화면 가운데 길게 누르기)
- Google AdSense 광고 슬롯(하단 배너 · 결과 창 · 사용법 창)과 개인정보처리방침 페이지

## 개발

```shell
npm install
npm run dev        # http://localhost:1236
npm run typecheck
npm run lint
npm run build      # dist/  (public-url /rollpick/)
npm run build:root # 루트 도메인에 올릴 때
```

## SEO / AI 검색 최적화

- 의도별 정적 랜딩: `pinball.html`(핀볼 뽑기) · `guide.html`(사용법) · `classroom.html`(수업) · `stream.html`(방송·이벤트) · `about.html`(소개). 전부 JS 없이 읽히는 HTML이고 FAQPage·BreadcrumbList JSON-LD는 가시 텍스트와 동일하다.
- `index.html`: h1, Organization/WebSite/WebApplication/FAQPage 그래프, 사용법 다이얼로그 본문을 정적으로 포함.
- `public/`: `robots.txt`(검색·AI 크롤러 허용), `sitemap.xml`(lastmod), `llms.txt`, IndexNow 키 파일. 빌드 시 `dist/` 로 복사된다.
- 배포 후 `npm run indexnow` 로 사이트맵 URL 전부를 Bing·네이버 계열에 핑한다 (키는 `.indexnow-key`).
- 새 페이지를 만들면: `package.json` build 엔트리 + `sitemap.xml` + `llms.txt` 세 곳에 추가한다.
- 등록이 필요한 도구: Google Search Console, Bing Webmaster Tools, 네이버 서치어드바이저 (루트 `ramiteacher.github.io` 등록이 있으면 하위 경로도 포함).

## 애드센스 설정

게시자 ID(`ca-pub-3238568174687829`)는 아래 세 곳에 들어 있다. 바꿔야 하면 세 곳을 함께 바꾼다.

| 파일 | 내용 |
| --- | --- |
| `index.html`, `privacy.html` | `<meta name="google-adsense-account" content="ca-pub-…">` |
| `public/ads.txt` | `google.com, pub-…, DIRECT, f08c47fec0942fa0` |
| `src/config.ts` | `ADSENSE.slots` 에 광고 단위 ID 3개 (`bottom`, `result`, `guide`) |

자동 광고는 모든 페이지 head 의 `adsbygoogle.js?client=…` 스크립트로 동작한다(애드센스 콘솔에서 사이트 자동 광고 ON 필요). 수동 슬롯 3곳은 `src/config.ts` 의 슬롯 ID가 비어 있으면 숨겨지고, 광고 단위를 만들어 ID를 넣으면 나타난다.
레이아웃만 확인하려면 `?adpreview=1` 을 붙이면 점선 박스로 자리가 보입니다.

애드센스 정책상 광고는 콘텐츠와 구분되어야 하고(각 슬롯에 "광고" 라벨 있음), 클릭을 유도하는 문구를 넣으면 안 됩니다.
개인정보처리방침(`privacy.html`)은 승인 심사 요건이므로 내용을 실제 운영 정보로 다듬어 주세요.

## 배포

`main` 브랜치에 푸시하면 GitHub Actions(`.github/workflows/deploy.yml`)가 빌드해 GitHub Pages 로 배포합니다.
저장소 Settings → Pages → Source 를 **GitHub Actions** 로 두어야 합니다.

## 크레딧 / 라이선스

이 프로젝트는 [lazygyu/roulette](https://github.com/lazygyu/roulette)(MIT)를 바탕으로 UI와 기능을 다시 만든 것입니다.
"Marble Roulette" / "마블 룰렛"은 lazygyu 의 상표이며, 이 프로젝트는 그 이름을 사용하지 않습니다.

소스 코드는 [MIT License](./LICENSE)를 따릅니다.
