import { SITE } from '../config';
import type { TranslationKeys } from '../data/languages';
import { availableLocales, getLocale, onLocaleChange, setLocale, t, tList, translatePage } from '../localization';
import options from '../options';
import type { Roulette } from '../roulette';
import { parseName } from '../utils/utils';
import type { AdManager } from './ads';
import { clearHistory, formatTime, loadHistory, pushHistory } from './history';
import { toast } from './toast';

type WinnerType = 'first' | 'last' | 'rank' | 'multi';

interface PersistedOptions {
  map: number;
  skills: boolean;
  recording: boolean;
  theme: 'dark' | 'light';
  winner: { type: WinnerType; rank: number; start: number; end: number };
  collapsed: boolean;
}

const OPTS_KEY = `${SITE.storagePrefix}opts`;
const NAMES_KEY = `${SITE.storagePrefix}names`;
const LEGACY_NAMES_KEY = 'mbr_names';
const RESULT_DELAY_MS = 2600;

const MAP_TITLE_KEYS: Record<string, TranslationKeys> = {
  'Wheel of fortune': 'mapWheel',
  BubblePop: 'mapBubble',
  'Pot of greed': 'mapPot',
  'Yoru ni Kakeru': 'mapNight',
};

const EXAMPLES: Record<string, string> = {
  ko: '사과, 바나나*2, 체리, 포도, 수박/3, 키위, 귤, 망고',
  en: 'Apple, Banana*2, Cherry, Grape, Melon/3, Kiwi, Orange, Mango',
  ja: 'りんご, バナナ*2, さくらんぼ, ぶどう, スイカ/3, キウイ, みかん, マンゴー',
};

function $<T extends HTMLElement = HTMLElement>(selector: string): T {
  const el = document.querySelector<T>(selector);
  if (!el) throw new Error(`element not found: ${selector}`);
  return el;
}

function readOptions(): PersistedOptions {
  const fallback: PersistedOptions = {
    map: 0,
    skills: true,
    recording: false,
    theme: 'dark',
    winner: { type: 'last', rank: 1, start: 1, end: 3 },
    collapsed: true,
  };
  try {
    const raw = localStorage.getItem(OPTS_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return { ...fallback, ...parsed, winner: { ...fallback.winner, ...(parsed.winner ?? {}) } };
  } catch {
    return fallback;
  }
}

export class App {
  private roulette: Roulette;
  private ads: AdManager;
  private opts = readOptions();
  private ready = false;
  private lastResult: { name: string; hue: number; rank: number }[] | null = null;

  private namesInput!: HTMLTextAreaElement;
  private nameCount!: HTMLElement;
  private settings!: HTMLElement;
  private hud!: HTMLElement;
  private resultDialog!: HTMLDialogElement;
  private guideDialog!: HTMLDialogElement;
  private historyDialog!: HTMLDialogElement;

  constructor(roulette: Roulette, ads: AdManager) {
    this.roulette = roulette;
    this.ads = ads;
  }

  init() {
    this.namesInput = $<HTMLTextAreaElement>('#in_names');
    this.nameCount = $('#nameCount');
    this.settings = $('#settings');
    this.hud = $('#hud');
    this.resultDialog = $<HTMLDialogElement>('#resultDialog');
    this.guideDialog = $<HTMLDialogElement>('#guideDialog');
    this.historyDialog = $<HTMLDialogElement>('#historyDialog');

    this.applyTheme(this.opts.theme, false);
    this.setupTopbar();
    this.setupNames();
    this.setupSettings();
    this.setupWinnerMode();
    this.setupDialogs();
    this.setupRoulette();
    this.setupKeyboard();

    onLocaleChange(() => {
      this.renderMapOptions();
      this.updateNameCount();
      this.renderGuide();
      this.updateHud();
    });
    translatePage();
    this.renderGuide();
    this.getReady();
  }

  // ───────────────────────── top bar ─────────────────────────

  private setupTopbar() {
    const langSelect = $<HTMLSelectElement>('#selLang');
    langSelect.innerHTML = '';
    for (const { code, name } of availableLocales()) {
      const opt = document.createElement('option');
      opt.value = code;
      opt.textContent = name;
      langSelect.appendChild(opt);
    }
    langSelect.value = getLocale();
    langSelect.addEventListener('change', () => setLocale(langSelect.value));

    $('#btnTheme').addEventListener('click', () => {
      this.applyTheme(this.opts.theme === 'dark' ? 'light' : 'dark', true);
    });

    const fsBtn = $('#btnFullscreen');
    if (!document.fullscreenEnabled) fsBtn.hidden = true;
    fsBtn.addEventListener('click', () => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      } else {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    });

    $('#btnGuide').addEventListener('click', () => this.openDialog(this.guideDialog));
    $('#btnHistory').addEventListener('click', () => {
      this.renderHistory();
      this.openDialog(this.historyDialog);
    });
  }

  private applyTheme(theme: 'dark' | 'light', persist: boolean) {
    this.opts.theme = theme;
    document.documentElement.classList.toggle('light', theme === 'light');
    document
      .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'light' ? '#f4f5f7' : '#0b0d12');
    this.roulette.setTheme(theme);
    if (persist) this.saveOptions();
  }

  // ───────────────────────── names ─────────────────────────

  private setupNames() {
    const urlNames = new URLSearchParams(location.search).get('names');
    if (urlNames) {
      this.namesInput.value = urlNames.replace(/,/g, '\n');
    } else {
      let saved: string | null = null;
      try {
        saved = localStorage.getItem(NAMES_KEY) ?? localStorage.getItem(LEGACY_NAMES_KEY);
      } catch {}
      if (saved) this.namesInput.value = saved.replace(/,/g, '\n');
      else this.namesInput.value = EXAMPLES[getLocale()] ?? EXAMPLES.en;
    }

    this.namesInput.addEventListener('input', () => this.getReady());
    this.namesInput.addEventListener('blur', () => this.mergeDuplicates());

    $('#btnExample').addEventListener('click', () => {
      this.namesInput.value = (EXAMPLES[getLocale()] ?? EXAMPLES.en).replace(/,\s*/g, '\n');
      this.getReady();
    });
    $('#btnClear').addEventListener('click', () => {
      this.namesInput.value = '';
      this.getReady();
      this.namesInput.focus();
    });
    $('#btnSort').addEventListener('click', () => {
      const names = this.getNames().sort((a, b) => a.localeCompare(b, getLocale()));
      this.namesInput.value = names.join('\n');
      this.getReady();
    });
    $('#btnCopyLink').addEventListener('click', () => this.copyShareLink());
    $('#btnShuffle').addEventListener('click', () => this.getReady());
    $('#btnStart').addEventListener('click', () => this.start());
  }

  private getNames(): string[] {
    return this.namesInput.value
      .split(/[,\r\n]/g)
      .map((v) => v.trim())
      .filter((v) => !!v);
  }

  /** 입력창의 이름을 구슬로 만든다. 입력이 바뀔 때마다 불린다 */
  private getReady() {
    const names = this.getNames();
    this.roulette.setMarbles(names);
    this.ready = this.roulette.getCount() > 0;
    try {
      localStorage.setItem(NAMES_KEY, names.join(','));
    } catch {}
    this.updateNameCount();
    this.applyWinnerSetting();
  }

  private updateNameCount() {
    const count = this.roulette.getCount();
    this.nameCount.textContent = t('marblesCount', { n: count });
    this.nameCount.classList.toggle('warn', count > SITE.maxMarbles);
  }

  private mergeDuplicates() {
    const counts = new Map<string, number>();
    for (const src of this.getNames()) {
      const parsed = parseName(src);
      if (!parsed) continue;
      const key = parsed.weight > 1 ? `${parsed.name.trim()}/${parsed.weight}` : parsed.name.trim();
      counts.set(key, (counts.get(key) ?? 0) + parsed.count);
    }
    const merged = [...counts.entries()].map(([key, n]) => (n > 1 ? `${key}*${n}` : key));
    const next = merged.join('\n');
    if (next !== this.namesInput.value.trim()) {
      this.namesInput.value = next;
      this.getReady();
    }
  }

  private async copyShareLink() {
    const names = this.getNames();
    const url = new URL(location.href);
    url.search = '';
    if (names.length) url.searchParams.set('names', names.join(','));
    const ok = await copyText(url.toString());
    toast(ok ? t('linkCopied') : url.toString());
  }

  // ───────────────────────── settings ─────────────────────────

  private setupSettings() {
    this.renderMapOptions();
    const mapSelect = $<HTMLSelectElement>('#sltMap');
    mapSelect.value = String(this.opts.map);
    if (mapSelect.value !== String(this.opts.map)) this.opts.map = 0;
    this.roulette.setMap(this.opts.map);
    mapSelect.addEventListener('change', () => {
      this.opts.map = Number(mapSelect.value);
      this.roulette.setMap(this.opts.map);
      // setMap 은 살아남은 구슬 이름만으로 재구성해 무게가 사라진다. 원본 입력에서 다시 채운다
      this.getReady();
      this.saveOptions();
    });

    const chkRecording = $<HTMLInputElement>('#chkRecording');
    chkRecording.checked = this.opts.recording;
    options.autoRecording = this.opts.recording;
    this.roulette.setAutoRecording(this.opts.recording);
    chkRecording.addEventListener('change', () => {
      this.opts.recording = chkRecording.checked;
      options.autoRecording = chkRecording.checked;
      this.roulette.setAutoRecording(chkRecording.checked);
      if (chkRecording.checked) toast(t('recordingHint'), 2600);
      this.saveOptions();
    });

    const chkSkills = $<HTMLInputElement>('#chkSkills');
    chkSkills.checked = this.opts.skills;
    options.useSkills = this.opts.skills;
    chkSkills.addEventListener('change', () => {
      this.opts.skills = chkSkills.checked;
      options.useSkills = chkSkills.checked;
      this.saveOptions();
    });

    const toggle = $('#btnToggleSettings');
    const collapsible = $('#collapsible');
    const applyCollapsed = () => {
      collapsible.classList.toggle('collapsed', this.opts.collapsed);
      toggle.setAttribute('aria-expanded', String(!this.opts.collapsed));
    };
    applyCollapsed();
    toggle.addEventListener('click', () => {
      this.opts.collapsed = !this.opts.collapsed;
      applyCollapsed();
      this.saveOptions();
    });

    $('#btnStop').addEventListener('click', () => this.stop());
  }

  private renderMapOptions() {
    const select = $<HTMLSelectElement>('#sltMap');
    const current = select.value;
    select.innerHTML = '';
    for (const map of this.roulette.getMaps()) {
      const opt = document.createElement('option');
      opt.value = String(map.index);
      const key = MAP_TITLE_KEYS[map.title];
      opt.textContent = key ? t(key) : map.title;
      select.appendChild(opt);
    }
    if (current) select.value = current;
  }

  private saveOptions() {
    try {
      localStorage.setItem(OPTS_KEY, JSON.stringify(this.opts));
    } catch {}
  }

  // ───────────────────────── winner mode ─────────────────────────

  private setupWinnerMode() {
    const rankInput = $<HTMLInputElement>('#in_rank');
    const startInput = $<HTMLInputElement>('#in_rangeStart');
    const endInput = $<HTMLInputElement>('#in_rangeEnd');
    rankInput.value = String(this.opts.winner.rank);
    startInput.value = String(this.opts.winner.start);
    endInput.value = String(this.opts.winner.end);

    document.querySelectorAll<HTMLButtonElement>('[data-winner]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.opts.winner.type = btn.dataset.winner as WinnerType;
        if (this.opts.winner.type === 'rank') rankInput.focus();
        this.applyWinnerSetting();
        this.saveOptions();
      });
    });
    rankInput.addEventListener('input', () => {
      this.opts.winner.type = 'rank';
      this.applyWinnerSetting();
      this.saveOptions();
    });
    startInput.addEventListener('change', () => {
      this.opts.winner.type = 'multi';
      this.applyWinnerSetting('start');
      this.saveOptions();
    });
    endInput.addEventListener('change', () => {
      this.opts.winner.type = 'multi';
      this.applyWinnerSetting('end');
      this.saveOptions();
    });
  }

  /** 구슬 수에 맞춰 당첨 범위를 자르고 UI 에 반영한다. edited 는 방금 고친 범위 input */
  private applyWinnerSetting(edited?: 'start' | 'end') {
    const rankInput = $<HTMLInputElement>('#in_rank');
    const startInput = $<HTMLInputElement>('#in_rangeStart');
    const endInput = $<HTMLInputElement>('#in_rangeEnd');
    const { type } = this.opts.winner;

    let start: number;
    let end: number;
    switch (type) {
      case 'first':
        start = end = 1;
        break;
      case 'last':
        start = end = Math.max(1, this.roulette.getCount());
        break;
      case 'multi':
        start = parseInt(startInput.value, 10) || 1;
        end = parseInt(endInput.value, 10) || 1;
        if (end < start) {
          if (edited === 'end') start = end;
          else end = start;
        }
        break;
      default:
        start = end = parseInt(rankInput.value, 10) || 1;
    }

    this.roulette.setWinnerRange(start - 1, end - 1);
    const clipped = this.roulette.getWinnerRange();
    if (type === 'multi') {
      startInput.value = String(clipped.start + 1);
      endInput.value = String(clipped.end + 1);
      this.opts.winner.start = clipped.start + 1;
      this.opts.winner.end = clipped.end + 1;
    } else if (type === 'rank') {
      if (document.activeElement !== rankInput) rankInput.value = String(clipped.start + 1);
      this.opts.winner.rank = clipped.start + 1;
    }

    document.querySelectorAll<HTMLButtonElement>('[data-winner]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.winner === type);
      btn.setAttribute('aria-pressed', String(btn.dataset.winner === type));
    });
    rankInput.classList.toggle('active', type === 'rank');
    $('#rangeRow').classList.toggle('active', type === 'multi');
  }

  // ───────────────────────── run ─────────────────────────

  private start() {
    if (this.roulette.isRunning) return;
    const count = this.roulette.getCount();
    if (!this.ready || count === 0) {
      toast(t('needNames'));
      this.namesInput.focus();
      return;
    }
    if (count < 2) {
      toast(t('needTwo'));
      return;
    }
    if (count > SITE.maxMarbles) {
      toast(t('tooMany', { n: SITE.maxMarbles }));
      return;
    }
    this.closeAllDialogs();
    this.settings.classList.add('hide');
    this.hud.classList.add('show');
    this.updateHud();
    this.roulette.start();
  }

  private stop() {
    if (!this.roulette.isRunning) return;
    this.getReady();
    this.hud.classList.remove('show');
    this.settings.classList.remove('hide');
    toast(t('stopped'));
  }

  private updateHud() {
    $('#hudText').textContent = `${t('running')} · ${t('marblesCount', { n: this.roulette.getCount() })}`;
    $('#hudHint').textContent = t('runningHint');
  }

  private setupRoulette() {
    this.roulette.addEventListener('goal', (e) => {
      const detail = (e as CustomEvent).detail as { result: { name: string; hue: number; rank: number }[] };
      this.lastResult = detail.result;
      this.ready = false;
      this.hud.classList.remove('show');

      const current = this.roulette.getCurrentMap();
      pushHistory({
        at: Date.now(),
        map: current ? current.title : '',
        total: this.roulette.getRanking().length,
        winners: detail.result,
      });

      setTimeout(() => {
        this.settings.classList.remove('hide');
        this.showResult();
      }, RESULT_DELAY_MS);
    });

    this.roulette.addEventListener('message', (e) => {
      const key = (e as CustomEvent).detail as string;
      toast(key === 'The result has been copied' ? t('resultCopied') : key);
    });
  }

  private setupKeyboard() {
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        this.start();
      }
      if (e.key === 'Escape' && this.roulette.isRunning) {
        this.stop();
      }
    });
  }

  // ───────────────────────── dialogs ─────────────────────────

  private setupDialogs() {
    document.querySelectorAll<HTMLElement>('[data-close]').forEach((btn) => {
      btn.addEventListener('click', () => btn.closest('dialog')?.close());
    });
    for (const dlg of [this.resultDialog, this.guideDialog, this.historyDialog]) {
      dlg.addEventListener('click', (e) => {
        if (e.target === dlg) dlg.close();
      });
    }

    $('#btnCopyResult').addEventListener('click', async () => {
      const ok = await copyText(this.resultText());
      toast(ok ? t('resultCopied') : t('copy'));
    });
    $('#btnShareResult').addEventListener('click', async () => {
      const text = this.resultText();
      if (navigator.share) {
        try {
          await navigator.share({ title: SITE.name, text, url: SITE.url });
          return;
        } catch {}
      }
      const ok = await copyText(text);
      toast(ok ? t('resultCopied') : t('copy'));
    });
    $('#btnAgain').addEventListener('click', () => {
      this.resultDialog.close();
      this.getReady();
      this.start();
    });
    $('#btnClearHistory').addEventListener('click', () => {
      clearHistory();
      this.renderHistory();
      toast(t('historyCleared'));
    });
  }

  private openDialog(dlg: HTMLDialogElement) {
    if (dlg.open) return;
    dlg.showModal();
    this.ads.mountIn(dlg);
  }

  private closeAllDialogs() {
    for (const dlg of [this.resultDialog, this.guideDialog, this.historyDialog]) {
      if (dlg.open) dlg.close();
    }
  }

  private resultText(): string {
    if (!this.lastResult) return '';
    const header = `${SITE.name} · ${t('winner')}`;
    const lines = this.lastResult.map((w) => `#${w.rank} ${w.name}`);
    return [header, ...lines].join('\n');
  }

  private showResult() {
    const result = this.lastResult;
    if (!result || !result.length) return;

    $('#resultTitle').textContent = result.length === 1 ? t('winner') : t('winners', { n: result.length });

    const list = $('#resultList');
    list.innerHTML = '';
    list.classList.toggle('single', result.length === 1);
    for (const w of result) {
      const li = document.createElement('li');
      li.style.setProperty('--hue', String(w.hue));
      li.innerHTML = `<span class="rank">#${w.rank}</span><span class="dot"></span><span class="name"></span>`;
      li.querySelector('.name')!.textContent = w.name;
      list.appendChild(li);
    }

    const ranking = $('#resultRanking');
    ranking.innerHTML = '';
    for (const r of this.roulette.getRanking()) {
      const li = document.createElement('li');
      li.style.setProperty('--hue', String(r.hue));
      li.classList.toggle(
        'win',
        result.some((w) => w.rank === r.rank)
      );
      li.innerHTML = `<span class="rank">#${r.rank}</span><span class="dot"></span><span class="name"></span>`;
      li.querySelector('.name')!.textContent = r.name;
      ranking.appendChild(li);
    }
    $<HTMLDetailsElement>('#rankingDetails').open = false;

    // 영상에는 캔버스 팝업이 담기고, 화면에서는 DOM 결과 창이 이어받는다
    this.roulette.closeResultPopup();
    this.openDialog(this.resultDialog);
  }

  private renderGuide() {
    const body = $('#guideBody');
    const steps = tList('guideSteps') as readonly string[];
    const syntax = tList('guideSyntax') as readonly string[];
    const tips = tList('guideTips') as readonly string[];
    const faq = tList('guideFaq') as readonly (readonly string[])[];

    const ol = (items: readonly string[]) => `<ol>${items.map((s) => `<li>${escapeHtml(s)}</li>`).join('')}</ol>`;
    const ul = (items: readonly string[]) => `<ul>${items.map((s) => `<li>${escapeHtml(s)}</li>`).join('')}</ul>`;

    body.innerHTML = `
      <p class="lead">${escapeHtml(t('guideIntro'))}</p>
      ${ol(steps)}
      <h3>${escapeHtml(t('guideSyntaxTitle'))}</h3>
      ${ul(syntax)}
      <h3>${escapeHtml(t('guideTipsTitle'))}</h3>
      ${ul(tips)}
      <h3>${escapeHtml(t('guideFaqTitle'))}</h3>
      <dl>${faq.map(([q, a]) => `<dt>${escapeHtml(q)}</dt><dd>${escapeHtml(a)}</dd>`).join('')}</dl>
    `;
  }

  private renderHistory() {
    const list = $('#historyList');
    const entries = loadHistory();
    list.innerHTML = '';
    $('#btnClearHistory').hidden = entries.length === 0;
    if (!entries.length) {
      const empty = document.createElement('p');
      empty.className = 'empty';
      empty.textContent = t('noHistory');
      list.appendChild(empty);
      return;
    }
    for (const entry of entries) {
      const item = document.createElement('article');
      item.className = 'history-item';
      const mapKey = MAP_TITLE_KEYS[entry.map];
      const meta = document.createElement('div');
      meta.className = 'meta';
      meta.textContent = `${formatTime(entry.at, getLocale())} · ${mapKey ? t(mapKey) : entry.map} · ${t('marblesCount', { n: entry.total })}`;
      const names = document.createElement('div');
      names.className = 'names';
      for (const w of entry.winners) {
        const chip = document.createElement('span');
        chip.className = 'chip';
        chip.style.setProperty('--hue', String(w.hue));
        chip.textContent = `#${w.rank} ${w.name}`;
        names.appendChild(chip);
      }
      item.append(meta, names);
      list.appendChild(item);
    }
  }
}

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {}
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c
  );
}
