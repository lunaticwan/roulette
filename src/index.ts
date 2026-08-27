import './localization';
import options from './options';
import { Roulette } from './roulette';

// 어떤 버전이 실제로 돌고 있는지 관측한다. 옛 서비스워커에 고착된 클라이언트는
// 이 코드가 없는 번들을 쓰므로 이벤트를 보내지 않는다. 즉 전체 pageview 대비
// 이 이벤트의 비율이 곧 회수율이다.
//
// 번들 파일명의 content hash를 그대로 버전으로 쓴다. 빌드 시 주입이 필요 없고,
// 실제로 내용이 달라졌을 때만 값이 바뀌므로 커밋 해시보다 정확하다.
// import.meta.url은 못 쓴다. Parcel이 번들 URL이 아니라 소스 경로 리터럴로 치환한다.
// dev 서버는 파일명에 해시가 없어 'dev'로 떨어진다.
const bundleSrc = document.querySelector<HTMLScriptElement>('script[type="module"]')?.src ?? '';
const version =
  bundleSrc.match(/index-([0-9a-zA-Z_-]+)\.js/)?.[1] ?? bundleSrc.match(/\.([0-9a-f]{6,})\.js/)?.[1] ?? 'dev';

// umami는 defer로 로드되므로 load 시점이면 이미 준비돼 있다.
window.addEventListener('load', () => {
  (window as any).umami?.track('version', { v: version });
});

const roulette = new Roulette();

(window as any).roulette = roulette;
(window as any).options = options;
