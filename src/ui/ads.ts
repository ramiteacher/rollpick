import { ADSENSE, adsenseClient } from '../config';

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/** 슬롯 ID 가 실제 값인지 (0 으로만 된 자리표시자가 아닌지) */
function isRealSlot(slot: string | undefined): slot is string {
  return !!slot && /^\d{6,}$/.test(slot) && !/^0+$/.test(slot);
}

/**
 * 애드센스 광고 관리.
 *
 * 두 층으로 동작한다.
 * 1. 자동 광고: index.html 의 <script src=".../adsbygoogle.js?client=ca-pub-…"> 가 정적으로 들어 있고,
 *    애드센스 콘솔에서 사이트(ramiteacher.github.io)에 자동 광고가 켜져 있으면 구글이 알아서 배치한다.
 *    이 클래스는 그 스크립트가 없을 때만 보강한다.
 * 2. 수동 슬롯: <ins class="adsbygoogle" data-ad-slot-key="bottom"> 자리에 config 의 슬롯 ID 를 채워 push 한다.
 *    슬롯 ID 가 자리표시자면 그 자리를 아예 숨긴다. 자리표시자로 push 하면 애드센스가 400 을 내고 빈 칸만 남는다.
 *
 * ?adpreview=1 이면 슬롯 자리를 점선 박스로 보여준다 (레이아웃 확인용).
 * 같은 <ins> 를 두 번 push 하면 오류가 나므로 data-mounted 로 한 번만 처리한다.
 */
export class AdManager {
  private client: string | null;
  private preview: boolean;

  constructor() {
    this.client = adsenseClient();
    this.preview = new URLSearchParams(location.search).get(ADSENSE.previewParam) === '1';
  }

  /** 게시자 ID 가 있고 실제 슬롯 ID 가 하나라도 있으면 수동 슬롯을 켠다 */
  get manualEnabled() {
    return !!this.client && Object.values(ADSENSE.slots).some(isRealSlot);
  }

  init() {
    if (this.client) this.ensureScript();

    const showSlots = this.manualEnabled || this.preview;
    document.documentElement.classList.toggle('ads-on', showSlots);
    document.documentElement.classList.toggle('ads-preview', this.preview && !this.manualEnabled);
    if (!showSlots) return;

    // 실제 ID 가 없는 슬롯은 컨테이너째 숨긴다 (미리보기 모드는 전부 보여준다)
    document.querySelectorAll<HTMLElement>('ins.adsbygoogle[data-ad-slot-key]').forEach((ins) => {
      const key = ins.dataset.adSlotKey as keyof typeof ADSENSE.slots;
      if (!this.preview && !isRealSlot(ADSENSE.slots[key])) {
        const box = ins.closest<HTMLElement>('.ad-strip, .ad-box');
        (box ?? ins).hidden = true;
      }
    });

    this.mountVisible();
  }

  /** 페이지 로드 시 이미 보이는 슬롯 */
  private mountVisible() {
    document.querySelectorAll<HTMLElement>('ins.adsbygoogle[data-ad-slot-key]').forEach((ins) => {
      // 다이얼로그 안의 슬롯은 열릴 때 mount 한다. 안 보이는 상태로 push 하면 0 크기로 잡힌다
      if (ins.closest('dialog')) return;
      this.mount(ins);
    });
  }

  /** 컨테이너 안의 슬롯을 (아직이면) 채운다. 다이얼로그를 열 때 호출한다 */
  mountIn(container: ParentNode) {
    if (!this.manualEnabled) return;
    container.querySelectorAll<HTMLElement>('ins.adsbygoogle[data-ad-slot-key]').forEach((ins) => this.mount(ins));
  }

  private mount(ins: HTMLElement) {
    if (!this.client || !this.manualEnabled || ins.dataset.mounted === '1') return;
    const key = ins.dataset.adSlotKey as keyof typeof ADSENSE.slots;
    const slot = ADSENSE.slots[key];
    if (!isRealSlot(slot)) return;
    ins.dataset.mounted = '1';
    ins.setAttribute('data-ad-client', this.client);
    ins.setAttribute('data-ad-slot', slot);

    // 좁은 화면에서 반응형 가로 배너는 390x390 같은 큰 사각형으로 채워진다.
    // 하단 띠는 60px 뿐이므로 모바일에서는 320x50 고정 크기로 요청한다.
    if (key === 'bottom' && window.innerWidth < 860) {
      ins.removeAttribute('data-ad-format');
      ins.setAttribute('data-full-width-responsive', 'false');
      ins.style.display = 'inline-block';
      ins.style.width = '320px';
      ins.style.height = '50px';
    }
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.warn('[ads] push failed', e);
    }
  }

  private ensureScript() {
    if (!this.client || document.querySelector('script[src*="adsbygoogle.js"]')) return;
    const s = document.createElement('script');
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${this.client}`;
    document.head.appendChild(s);
  }
}
