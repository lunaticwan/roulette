# AGENTS.md

이 문서는 AI 에이전트(특히 **Jules**) 및 모듈 개발자가 프로젝트 구조를 이해하고, 개발 가이드라인과 품질 기준을 준수하도록 유도하는 전용 지침서임.

---

## 🎯 AI 에이전트 개발 표준 (Agent Core Directives)

### 1. 소통 및 서술 규칙

- **100% 한국어 원칙**: 코드 주석, TSDoc, 보고서, 터미널 가이드 등 모든 텍스트는 한국어로 작성. (기술 고유 명사는 영문 원형 유지)
- **개조식 단정형 서술**: 존댓말을 배제하고 개조식 및 단정형 어미(`~함`, `~기`, `~금지`, `~필수`) 사용.
- **주석 규칙**: TSDoc/JSDoc 및 코드 주석 내 이모지 사용 금지, AI 지시 부호(`[1단계]`, `[Rule]` 등) 기재 금지. 비즈니스 의도만 간결히 설명.

### 2. 캔버스 & 렌더링 규칙 (Canvas & Rendering)

- **High-DPI Scaling**: `RouletteRenderer`는 native `window.devicePixelRatio`를 반영하여 캔버스 버퍼를 확장하고, CSS 논리 좌표계로 스케일링하여 렌더링함.
- **서브픽셀 블러 방지**: 캔버스 렌더링 시 동적 폰트 크기, 선 두께, 좌표값은 정수 단위로 라운딩(`Math.round` 또는 `Math.max`)하여 지정함.

### 3. 성능 및 리소스 관리 (Performance & Memory)

- **오브젝트 풀링 (Object Pooling)**: 파티클 등 빈번히 생성/소멸되는 객체는 `ParticleManager`의 `_particlePool` 구조를 통해 재사용함.
- **Box2D 메머리 관리**: Box2D-WASM 연동 객체 및 강체(Body) 해제 시 메모리 누수가 발생하지 않도록 물리 스텝 안전하게 연동함.
- **에어갭 오프라인 작동**: 외부 CDN, 외부 웹 폰트, 제3자 분석 API에 의존하지 않으며 로컬 프리텐다드/카스카디아 코드 시스템 폰트 사용.

---

## 🏗 프로젝트 구성 및 데이터 흐름 (System Overview)

```text
[입력 데이터 (Keyword / Options)]
       │
       ▼
[Roulette (게임 루프 및 메인 제어)]
       ├──▶ [PhysicsBox2d (Box2D-WASM 연산)] ──▶ [Marble & SkillEffect (구슬 스킬 연산)]
       ├──▶ [Camera & Minimap (뷰포트 추적 및 시점 제어)]
       ├──▶ [RouletteRenderer (고해상도 Canvas 렌더링)] ──▶ [ParticleManager (파티클 풀링)]
       └──▶ [SoundManager & ConfettiManager (음향 및 승리 연출)]
```

### 주요 파일별 역할

- `src/IPhysics.ts`: 물리 엔진 추상화 인터페이스.
- `src/physics-box2d.ts`: Box2D-WASM 바인딩 및 물리 월드 스텝 수행.
- `src/roulette.ts`: 물리 시뮬레이션 루프, 정체 감지 및 자동 흔들기 처리.
- `src/rouletteRenderer.ts`: DPI 스케일링 기반 high-performance 2D Canvas 렌더러.
- `src/marble.ts`: 구슬 엔티티 물리 상태 업데이트 및 충돌 효과 처리.
- `src/camera.ts`: 선두 구슬 자동 추적 뷰포트 관리.
- `src/minimap.ts`: 인터랙티브 미니맵 렌더링 및 클릭/드래그 시점 조정.
- `src/fastForwader.ts`: 캔버스 터치/클릭 배속 컨트롤러.
- `src/options.ts`: `zod` 기반 게임 설정 검증 및 관리.
- `src/data/maps.ts`: 4개 스테이지 엔티티 정의.

---

## 🧪 코드 검증 및 빌드 절차 (Verification Procedures)

코드 변경 후 반드시 다음 명령어들을 실행하여 검토 완료할 것.

```bash
# 1. TypeScript 타입 검사
npm run typecheck

# 2. ESLint 코드 스타일 및 오류 검사
npm run lint

# 3. Vitest 기반 단위 테스트 실행
npm run test

# 4. 전체 빌드 및 서비스 워커 킬스위치 자산 생성 검증
npm run build
```
