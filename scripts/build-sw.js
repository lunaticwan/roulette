/**
 * dist/service-worker.js 를 생성하는 빌드 스크립트.
 *
 * 예전 서비스 워커의 캐시를 정리하는 킬 스위치(Kill Switch) 역할 수행.
 */

import assert from 'node:assert';
import { readFileSync, writeFileSync } from 'node:fs';

/**
 * 당사 도메인 캐시 여부 판별 함수
 */
const isOurCache = (key) => key === 'images' || key === 'static-resources' || key.includes('/roulette/');

// 빌드 시점에 필터링 로직 정당성 무결성 점검
assert(isOurCache('workbox-precache-v2-https://lazygyu.github.io/roulette/'), 'precache 캐시 제거 필요');
assert(isOurCache('images'), '옛 runtimeCaching 캐시 제거 필요');
assert(isOurCache('static-resources'), '옛 runtimeCaching 캐시 제거 필요');
assert(!isOurCache('workbox-precache-v2-https://lazygyu.github.io/other-project/'), '타 프로젝트 캐시 보존 필요');
assert(!isOurCache('some-unrelated-cache'), '타 캐시 보존 필요');

const killSwitch = `self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const isOurCache = ${isOurCache.toString()};
      const keys = await caches.keys();
      await Promise.all(keys.filter(isOurCache).map((key) => caches.delete(key)));

      const clients = await self.clients.matchAll({ type: 'window' });
      await self.registration.unregister();

      for (const client of clients) {
        client.navigate(client.url).catch(() => {});
      }
    })(),
  );
});
`;

writeFileSync('dist/service-worker.js', killSwitch);

// 빌드 산출물 index.html에서 번들 버전 추출 검증
const html = readFileSync('dist/index.html', 'utf-8');
const bundleSrc = html.match(/<script type="module" crossorigin src="([^\s>"]+)"/)?.[1] ?? '';
assert(/index-([0-9a-zA-Z_-]+)\.js/.test(bundleSrc), `버전 추출 실패: module script src가 "${bundleSrc}"`);
