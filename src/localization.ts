import { type TranslatedLanguages, type TranslationKeys, Translations } from './data/languages';

const defaultLocale: TranslatedLanguages = 'ko';
let locale: TranslatedLanguages | undefined;

function getBrowserLocale() {
  if (typeof navigator === 'undefined') return 'ko';
  return navigator.language.split('-')[0];
}

function translateElement(element: Element) {
  if (!(element instanceof HTMLElement) || !locale) return;

  const prop = element.getAttribute('data-trans');

  if (prop) {
    const key = (element.getAttribute(prop) || '').trim();
    if (key && key in Translations[locale]) {
      element.setAttribute(prop, Translations[locale][key as TranslationKeys]);
    }
  } else {
    const key = element.innerText.trim();
    if (key && key in Translations[locale]) {
      element.innerText = Translations[locale][key as TranslationKeys];
    }
  }
}

function translatePage() {
  if (typeof document === 'undefined') return;
  document.querySelectorAll('[data-trans]').forEach(translateElement);
}

function setLocale(newLocale: string) {
  if (newLocale === locale) return;

  if (typeof document !== 'undefined') {
    document.documentElement.lang = newLocale;
  }

  const newLocaleLower = newLocale.toLocaleLowerCase();

  locale = newLocaleLower in Translations ? (newLocaleLower as TranslatedLanguages) : defaultLocale;
  translatePage();
}

export function getText(key: string): string {
  const currentLocale = locale || defaultLocale;
  if (currentLocale in Translations && key in Translations[currentLocale]) {
    return Translations[currentLocale][key as TranslationKeys];
  }
  if (key in Translations.ko) {
    return Translations.ko[key as TranslationKeys];
  }
  return key;
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('localization loaded');
    const browserLocale = getBrowserLocale();
    console.log('detected locale: ', browserLocale);
    setLocale(browserLocale);
  });
}

if (typeof window !== 'undefined') {
  (window as any).translateElement = translateElement;
  (window as any).getText = getText;
}
