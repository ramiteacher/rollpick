/**
 * 사이트 전역 설정.
 *
 * 애드센스 게시자 ID(ca-pub-…)는 index.html 의 <meta name="google-adsense-account"> 가 단일 출처다.
 * 여기서는 그 값을 읽기만 한다. 슬롯 ID는 광고 단위를 만든 뒤 아래 SLOTS 에 채운다.
 */
export const SITE = {
  name: 'RollPick',
  url: 'https://ramiteacher.github.io/rollpick/',
  storagePrefix: 'rollpick_',
  /** 구슬이 너무 많으면 물리 연산이 버거워진다 */
  maxMarbles: 500,
} as const;

export const ADSENSE = {
  /**
   * 수동 광고 단위(slot) ID. 애드센스 콘솔 > 광고 > 광고 단위 기준 > 디스플레이 광고 만들기 → data-ad-slot 숫자.
   * 0 으로만 된 값은 자리표시자로 취급되어 해당 자리를 숨긴다. 자동 광고는 이 값과 무관하게 index.html 의 스크립트로 동작한다.
   */
  slots: {
    /** 화면 하단 가로 배너 (반응형) */
    bottom: '0000000001',
    /** 결과 창 안의 사각형 광고 */
    result: '0000000002',
    /** 사용법 창 하단 */
    guide: '0000000003',
  },
  /** 개발 중 광고 자리를 점선 박스로 보여주려면 URL 에 ?adpreview=1 을 붙인다 */
  previewParam: 'adpreview',
} as const;

export function adsenseClient(): string | null {
  const meta = document.querySelector<HTMLMetaElement>('meta[name="google-adsense-account"]');
  const value = meta?.content?.trim() ?? '';
  // 자리표시자(0으로만 된 ID)면 아직 설정 전으로 본다
  if (!/^ca-pub-\d{10,20}$/.test(value) || /^ca-pub-0+$/.test(value)) return null;
  return value;
}
