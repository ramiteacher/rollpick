import {
  type Dict,
  LANGUAGE_NAMES,
  type TranslatedLanguages,
  type TranslationKeys,
  Translations,
} from './data/languages';

const STORAGE_KEY = 'rollpick_lang';
const defaultLocale: TranslatedLanguages = 'en';
let locale: TranslatedLanguages = defaultLocale;
const listeners: Array<(locale: TranslatedLanguages) => void> = [];

export function isSupported(lang: string): lang is TranslatedLanguages {
  return lang in Translations;
}

export function getLocale(): TranslatedLanguages {
  return locale;
}

export function availableLocales(): { code: TranslatedLanguages; name: string }[] {
  return (Object.keys(Translations) as TranslatedLanguages[]).map((code) => ({ code, name: LANGUAGE_NAMES[code] }));
}

/** 문자열 키를 현재 언어로 바꾼다. `{n}` 같은 자리표시자는 params 로 채운다 */
export function t(key: TranslationKeys, params?: Record<string, string | number>): string {
  const value = (Translations[locale] as Dict)[key] ?? (Translations[defaultLocale] as Dict)[key] ?? key;
  let text = Array.isArray(value) ? value.join('\n') : String(value);
  if (params) {
    for (const [name, v] of Object.entries(params)) {
      text = text.split(`{${name}}`).join(String(v));
    }
  }
  return text;
}

/** 배열형 항목(가이드 문단 등) */
export function tList<K extends TranslationKeys>(key: K): Dict[K] {
  return (Translations[locale] as Dict)[key] ?? (Translations[defaultLocale] as Dict)[key];
}

/**
 * data-i18n="key" → textContent
 * data-i18n-placeholder="key", data-i18n-title="key", data-i18n-aria-label="key" → 해당 속성
 */
export function translateElement(element: Element) {
  const key = element.getAttribute('data-i18n');
  if (key) element.textContent = t(key as TranslationKeys);
  for (const attr of ['placeholder', 'title', 'aria-label']) {
    const attrKey = element.getAttribute(`data-i18n-${attr}`);
    if (attrKey) element.setAttribute(attr, t(attrKey as TranslationKeys));
  }
}

export function translatePage(root: ParentNode = document) {
  root
    .querySelectorAll('[data-i18n], [data-i18n-placeholder], [data-i18n-title], [data-i18n-aria-label]')
    .forEach(translateElement);
}

export function onLocaleChange(fn: (locale: TranslatedLanguages) => void) {
  listeners.push(fn);
}

export function setLocale(newLocale: string, persist = true) {
  const lower = newLocale.toLowerCase().split('-')[0];
  const next = isSupported(lower) ? lower : defaultLocale;
  locale = next;
  document.documentElement.lang = next;
  if (persist) {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {}
  }
  translatePage();
  listeners.forEach((fn) => fn(next));
}

export function initLocale() {
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(STORAGE_KEY);
  } catch {}
  setLocale(saved ?? navigator.language ?? defaultLocale, false);
}
