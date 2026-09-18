import { ADSENSE, adsenseClient } from '../config';

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/**
 * 애드센스 광고 슬롯 관리.
 *
 * - <ins class="adsbygoogle" data-ad-slot-key="bottom"> 형태의 자리에 슬롯 ID 를 채우고 push 한다.
 * - 게시자 ID 가 아직 자리표시자면 광고 영역을 통째로 숨겨 레이아웃을 깨끗하게 둔다.
 * - ?adpreview=1 이면 점선 박스로 자리를 보여준다 (레이아웃 확인용).
 * - 같은 <ins> 를 두 번 push 하면 애드센스가 오류를 내므로 data-ad-status 로 한 번만 처리한다.
 */
export class AdManager {
  private client: string | null;
  private preview: boolean;
  private loaded = false;

  constructor() {
    this.client = adsenseClient();
    this.preview = new URLSearchParams(location.search).get(ADSENSE.previewParam) === '1';
  }

  get enabled() {
    return !!this.client;
  }

  init() {
    document.documentElement.classList.toggle('ads-on', this.enabled || this.preview);
    document.documentElement.classList.toggle('ads-preview', this.preview && !this.enabled);
    if (!this.enabled) return;
    this.ensureScript();
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
    if (!this.enabled) return;
    container.querySelectorAll<HTMLElement>('ins.adsbygoogle[data-ad-slot-key]').forEach((ins) => this.mount(ins));
  }

  private mount(ins: HTMLElement) {
    if (!this.client || ins.dataset.mounted === '1') return;
    const key = ins.dataset.adSlotKey as keyof typeof ADSENSE.slots;
    const slot = ADSENSE.slots[key];
    if (!slot) return;
    ins.dataset.mounted = '1';
    ins.setAttribute('data-ad-client', this.client);
    ins.setAttribute('data-ad-slot', slot);
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.warn('[ads] push failed', e);
    }
  }

  private ensureScript() {
    if (this.loaded || !this.client) return;
    const existing = document.querySelector('script[src*="adsbygoogle.js"]');
    if (existing) {
      this.loaded = true;
      return;
    }
    const s = document.createElement('script');
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${this.client}`;
    document.head.appendChild(s);
    this.loaded = true;
  }
}
