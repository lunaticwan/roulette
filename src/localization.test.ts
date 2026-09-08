import { describe, expect, it } from 'vitest';
import { Translations } from './data/languages';
import { getText } from './localization';

describe('Localization and Languages Audit', () => {
  it('should only maintain English (en) and Korean (ko) language packs', () => {
    const languageKeys = Object.keys(Translations);
    expect(languageKeys.sort()).toEqual(['en', 'ko']);
  });

  it('should have matching translation keys for en and ko', () => {
    const enKeys = Object.keys(Translations.en).sort();
    const koKeys = Object.keys(Translations.ko).sort();
    expect(enKeys).toEqual(koKeys);
  });

  it('should not have empty translation values in en or ko', () => {
    Object.entries(Translations.en).forEach(([_key, value]) => {
      expect(value.trim()).not.toBe('');
    });
    Object.entries(Translations.ko).forEach(([_key, value]) => {
      expect(value.trim()).not.toBe('');
    });
  });

  it('should translate keys correctly using default ko locale', () => {
    expect(getText('Settings')).toBe('설정');
    expect(getText('Start')).toBe('시작');
    expect(getText('The result has been copied')).toBe('결과가 복사되었습니다');
  });
});
