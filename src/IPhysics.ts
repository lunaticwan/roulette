import type { StageDef } from './data/maps';
import type { MapEntityState } from './types/MapEntity.type';

/**
 * 물리 엔진 인터페이스
 * Box2D 등 물리 시뮬레이션 구현체 조작 표준 규격 정의
 */
export interface IPhysics {
  /** 물리 엔진 모듈 초기화 및 라이브러리 로드 */
  init(): Promise<void>;

  /** 스테이지 및 구슬 물리 객체 전체 제거 */
  clear(): void;

  /** 생성된 모든 구슬 물리 강체 제거 */
  clearMarbles(): void;

  /** 지정된 스테이지 정의 기반 물리 엔티티 생성 */
  createStage(stage: StageDef): void;

  /** 지정된 식별자 및 좌표에 구슬 물리 강체 생성 */
  createMarble(id: number, x: number, y: number): void;

  /** 구슬에 무작위 충격량을 가하여 위치 흔들기 */
  shakeMarble(id: number): void;

  /** 특정 식별자의 구슬 물리 강체 제거 */
  removeMarble(id: number): void;

  /** 특정 구슬의 현재 좌표 및 회전각 반환 */
  getMarblePosition(id: number): { x: number; y: number; angle: number };

  /** 현재 스테이지 엔티티 상태 목록 반환 */
  getEntities(): MapEntityState[];

  /** 특정 구슬 중심 충격파를 발생시켜 주변 구슬 밀어내기 */
  impact(id: number): void;

  /** 모든 구슬 강체를 활성화하여 시뮬레이션 시작 */
  start(): void;

  /** 시뮬레이션 시간 단계 갱신 */
  step(deltaSeconds: number): void;
}
