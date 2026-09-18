# Changelog

## 1.0.0 (2026-09-18)

lazygyu/roulette 를 포크해 RollPick 으로 재구성.

- UI 전면 재작성: 인라인 스크립트를 `src/ui/app.ts` 모듈로 이동, 글래스 패널 디자인, 다크/라이트 테마 토큰화
- 결과 창(DOM)에서 당첨자 복사·공유·다시 뽑기, 전체 순위 보기
- 추첨 기록(최근 30건, localStorage), 명단 공유 링크 복사, 예시/정렬/지우기 도구
- 언어: 한국어 · English · 日本語, 언어 선택 저장
- 옵션(맵·스킬·녹화·당첨 모드·테마) 자동 저장
- 진행 중 HUD(중단 버튼, 2배속 안내), Ctrl+Enter 시작, Esc 중단
- 녹화: 브라우저가 지원하는 MIME 우선 선택, 확장자 자동
- Google AdSense 슬롯 3곳(하단 배너 · 결과 창 · 사용법 창), `ads.txt`, 개인정보처리방침 페이지
- 원본의 외부 광고 서버 · 키워드 스프라이트 서비스 · 공지 팝업 · 상점 링크 · 분석 스크립트 제거
- 새 아이콘 · OG 이미지 · PWA 매니페스트, robots.txt · sitemap.xml
- GitHub Actions 로 GitHub Pages 자동 배포
