# 마블 룰렛 (Marble Roulette)

Box2D Physics 엔진, Vite, TypeScript 기반으로 제작된 웹 구슬 추첨기입니다.

## 주요 기능

- **구슬 추첨 물리 엔진 연산**: Box2D-WASM을 이용한 물리 기반 구슬 추첨.
- **다양한 맵 지원**: 운명의 수레바퀴, 버블팝, 밤을 달리다 등 다양한 기믹을 가진 스테이지 제공.
- **스킬 및 이벤트**: 구슬 간 충돌 스킬 효과 및 개별 중량/수량 설정 기능.
- **화면 녹화 지원**: 추첨 과정을 자동으로 녹화할 수 있는 옵션 제공.
- **다국어 지원**: 한국어 및 영어 화면 지원.

## 실행 및 개발 명령어

- `npm run dev`: 개발 서버 실행 (Vite)
- `npm run build`: 웹 애플리케이션 빌드 및 서비스 워커 자산 생성
- `npm run preview`: 빌드 결과물 로컬 미리보기
- `npm run test`: Vitest 기반 단위 테스트 실행
- `npm run typecheck`: TypeScript 타입 검사 (`tsc --noEmit`)
- `npm run lint`: ESLint 코드 스타일 및 오류 검사
- `npm run format`: Prettier 코드 포맷팅 적용

## GitHub Pages 배포 설정

GitHub Actions를 사용하여 GitHub Pages에 자동 배포되도록 구성되어 있습니다.

1. 리포지토리 설정 이동: **Settings > Pages**
2. **Build and deployment > Source** 옵션에서 **GitHub Actions** 선택
3. `main` 브랜치에 코드 푸시 시 **Build and Deploy** 워크플로우가 자동으로 실행되어 배포됨
