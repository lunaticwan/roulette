# iM뱅크 룰렛 추첨기 (Marble Roulette)

Box2D-WASM 물리 엔진, Vite, TypeScript 기반으로 제작된 고성능 웹 구슬 추첨기 애플리케이션입니다.

---

## 💡 주요 특징 (Key Features)

- **Box2D 기반 강체 물리 연산**: `box2d-wasm`을 탑재하여 정밀한 구슬 충돌, 반발력, 회전 물리 시뮬레이션 제공.
- **정체 방지 시스템**: 구슬이 특정 위치에 1초 이상 정지 시 임의의 랜덤 충격량을 부여하며, 3초 이상 정체 시 게임판 전체 흔들기 기능 제공.
- **다양한 기믹의 스테이지 맵 (4종)**:
  1. `Wheel of fortune` (운명의 수레바퀴)
  2. `BubblePop` (버블팝)
  3. `Pot of greed` (탐욕의 항아리)
  4. `Yoru ni Kakeru` (밤을 달리다)
- **구슬 및 옵션 커스터마이징**: 구슬별 개별 중량/수량 설정, 구슬 충돌 스킬 연산(`useSkills`), 당첨 순위 범위 지정(`winnerRange`) 지원.
- **고해상도 Canvas 2D 렌더링**: native `devicePixelRatio` 반영 High-DPI 대응, 서브픽셀 블러링 방지를 위한 정수 좌표 처리 및 파티클 오브젝트 풀링(`_particlePool`) 구현.
- **카메라 추적 & 인터랙티브 미니맵**: 선두 구슬 자동 추적 뷰포트 및 드래그 제어가 가능한 미니맵 지원.
- **배속 및 녹화 기능**: 캔버스 중앙 클릭/터치를 통한 실시간 배속(Fast-Forward) 및 MediaRecorder 기반 추첨 영상 자동 녹화(`autoRecording`) 제공.
- **에어갭(Air-Gapped) 오프라인 지원**: 외부 CDN 및 API 의존성 전무, 로컬 시스템 폰트(Pretendard / Cascadia Code) 및 완벽한 오프라인 작동 보장.
- **다국어(i18n) 지원**: 한국어(`ko`, 기본) 및 영어(`en`) UI 언어 지원.

---

## 🛠 기술 스택 (Tech Stack)

| 구분 | 주요 기술 |
| :--- | :--- |
| **Language & Runtime** | TypeScript 5.x, Node.js (ES Module) |
| **Build & Bundler** | Vite 8.x, Sass |
| **Physics Engine** | `box2d-wasm` |
| **Audio & Effects** | `howler` (Web Audio API 음향), `canvas-confetti` (승리 폭죽 효과) |
| **Helper & Utility** | `zod` (런타임 검증), `es-toolkit` (유틸리티), `ts-pattern` (패턴 매칭) |
| **Testing & Quality** | Vitest (Happy-DOM), ESLint (Flat Config), Prettier |

---

## 🚀 실행 및 개발 명령어 (Scripts)

```bash
# 개발 서버 실행 (Vite)
npm run dev

# 웹 애플리케이션 빌드 (TypeScript 타입검사 -> Vite 빌드 -> Service Worker 킬스위치 생성)
npm run build

# 빌드 결과물 로컬 미리보기
npm run preview

# Vitest 기반 단위 테스트 실행
npm run test

# TypeScript 타입 검사 (tsc --noEmit)
npm run typecheck

# ESLint 코드 스타일 및 오류 검사
npm run lint

# ESLint 자동 교정 적용
npm run lint:fix

# Prettier 코드 포맷팅 적용
npm run format
```

---

## 🤖 LLM & 개발자 가이드라인 (Developer & Agent Guide)

LLM 에이전트(특히 **Jules**)가 프로젝트 아키텍처와 코드를 용이하게 파악할 수 있도록 주요 구조를 정리함.

### 📁 핵심 디렉토리 및 모듈 역할

```text
src/
├── IPhysics.ts             # 물리 엔진 인터페이스 규격
├── physics-box2d.ts        # Box2D-WASM 연동, 월드 생성 및 강체(Body) 바인딩
├── roulette.ts             # 메인 게임 루프, 물리 시뮬레이션 제어 및 상태 관리
├── rouletteRenderer.ts     # High-DPI Canvas 2D 고성능 렌더러
├── marble.ts               # 구슬 엔티티, 스킬 효과 연산 및 위치 관리
├── camera.ts               # 선두 구슬 자동 추적 뷰포트 카메라
├── minimap.ts              # 미니맵 UI 렌더링 및 클릭/드래그 시점 변경
├── fastForwader.ts         # 캔버스 터치/클릭 기반 배속 컨트롤러
├── particleManager.ts      # 오브젝트 풀링 기반 파티클 관리자
├── soundManager.ts         # Howler 기반 오디오 효과음 재생
├── confettiManager.ts      # 승리 축하 폭죽 효과 렌더러
├── options.ts              # Zod 기반 게임 옵션 스키마 및 설정 모듈
├── keywordService.ts       # 구슬 목록 및 키워드 파싱 서비스
├── localization.ts         # 다국어(ko/en) 상태 및 변환 유틸리티
└── data/
    ├── maps.ts             # 4개 스테이지 엔티티 정의
    ├── languages.ts        # 한국어/영어 로컬라이제이션 사전
    └── constants.ts        # 상수 정의
```

### 🔄 핵심 시스템 데이터 흐름 (Core Data Flow)

1. **입력 및 옵션 초기화**: `keywordService`로 참가가 목록을 파싱하고, `options.ts`에서 Zod 검증을 거쳐 구슬(`Marble`) 생성.
2. **물리 스텝 (Physics Step)**: `Roulette` 루프에서 `physics-box2d.ts`를 통해 Box2D 월드 스텝을 갱신.
3. **충돌 및 스킬 연산**: 구슬 충돌 이벤트 발생 시 `marble.ts` 및 `skillEffect.ts`에서 스킬 발동.
4. **시점 및 렌더링**: `camera.ts`가 선두 구슬을 추적하고, `rouletteRenderer.ts`가 DPI 스케일링을 적용하여 Canvas 2D에 렌더링.
5. **결과 처리**: 승리 조건 도달 시 `soundManager.ts` 효과음 재생 및 `confettiManager.ts` 폭죽 연출 실행.

---

## 🌐 배포 설정 (Deployment)

GitHub Actions 워크플로우(`.github/workflows/deploy.yml`)를 통해 `main` 브랜치 코드 푸시 시 automated CI/CD 테스트 및 GitHub Pages 자동 배포가 완료됨.
