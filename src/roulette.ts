import { clamp, shuffle } from 'es-toolkit';
import { match } from 'ts-pattern';
import { Camera } from './camera';
import { canvasHeight, canvasWidth, initialZoom, Skills, Themes, zoomThreshold } from './data/constants';
import { type StageDef, stages } from './data/maps';
import { FastForwader } from './fastForwader';
import type { GameObject } from './gameObject';
import type { IPhysics } from './IPhysics';
import { Marble } from './marble';
import { Minimap } from './minimap';
import options, { type WinnerRange } from './options';
import { ParticleManager } from './particleManager';
import { Box2dPhysics } from './physics-box2d';
import { confettiManager } from './confettiManager';
import { RankRenderer } from './rankRenderer';
import { RouletteRenderer } from './rouletteRenderer';
import { SkillEffect } from './skillEffect';
import { soundManager } from './soundManager';
import type { ColorTheme } from './types/ColorTheme';
import type { MouseEventHandlerName, MouseEventName } from './types/mouseEvents.type';
import type { UIObject } from './UIObject';
import { bound } from './utils/bound.decorator';
import { parseName } from './utils/utils';
import { VideoRecorder } from './utils/videoRecorder';

/**
 * 입력 범위를 실제 구슬 수에 맞춰 클리핑
 * @param winnerRange 시작/끝 당첨 범위
 * @param marbleCount 전체 구슬 수
 */
function clipWinnerRange({ start, end }: WinnerRange, marbleCount: number): WinnerRange {
  const last = Math.max(0, marbleCount - 1);
  const clippedStart = clamp(start, 0, last);
  return { start: clippedStart, end: clamp(end, clippedStart, last) };
}

/**
 * 마블 룰렛 게임 엔진 메인 클래스
 * 물리 연산, 구슬 상태 관리, 카메라, 렌더링, 사운드, 비디오 녹화 통괄
 */
export class Roulette extends EventTarget {
  private _marbles: Marble[] = [];

  private _lastTime: number = 0;
  private _elapsed: number = 0;

  private _updateInterval = 10;
  private _timeScale = 1;
  private _speed = 1;

  private _winners: Marble[] = [];
  private _particleManager = new ParticleManager();
  private _stage: StageDef | null = null;

  protected _camera: Camera = new Camera();
  protected _renderer: RouletteRenderer;

  private _effects: GameObject[] = [];

  private _winnerRange: WinnerRange = { start: 0, end: 0 };
  private _goalDist: number = Infinity;
  private _isRunning: boolean = false;
  /** 진행 중에는 null, 당첨자가 모두 확정되면 당첨자 배열 */
  private _result: Marble[] | null = null;

  // 구슬 id(= order)는 매 라운드 재사용. 리셋 시 취소하지 않으면 뒤늦게 타이머 동작하여 새 구슬 지움
  private _pendingRemovals: number[] = [];

  private _uiObjects: UIObject[] = [];

  private _autoRecording: boolean = false;
  private _recorder!: VideoRecorder;

  private physics!: IPhysics;

  private _isReady: boolean = false;
  protected fastForwarder!: FastForwader;
  protected _theme: ColorTheme = Themes.dark;

  /** 엔진 초기화 완료 여부 */
  get isReady() {
    return this._isReady;
  }

  /** 추첨 진행 중 여부 */
  get isRunning() {
    return this._isRunning;
  }

  /** 사운드 매니저 반환 */
  get soundManager() {
    return soundManager;
  }

  /** 렌더러 생성 팩토리 메서드 */
  protected createRenderer(): RouletteRenderer {
    return new RouletteRenderer();
  }

  /** 배속 조작 UI 객체 생성 팩토리 메서드 */
  protected createFastForwader(): FastForwader {
    return new FastForwader();
  }

  constructor() {
    super();
    this._renderer = this.createRenderer();
    this._renderer.init().then(() => {
      this._init().then(() => {
        this._isReady = true;
        this._update();
      });
    });
  }

  /** 현재 최종 배율 줌 값 반환 */
  public getZoom() {
    return initialZoom * this._camera.zoom;
  }

  /** UI 객체 등록 및 이벤트 리스너 연결 */
  private addUiObject(obj: UIObject) {
    this._uiObjects.push(obj);
    if (obj.onWheel) {
      this._renderer.canvas.addEventListener('wheel', obj.onWheel);
    }
    if (obj.onMessage) {
      obj.onMessage((msg) => {
        console.log('onMessage', msg);
        this.dispatchEvent(new CustomEvent('message', { detail: msg }));
      });
    }
  }

  /** 프레임 update 루프 연산 */
  @bound
  private _update() {
    if (!this._lastTime) this._lastTime = Date.now();
    const currentTime = Date.now();

    this._elapsed += (currentTime - this._lastTime) * this._speed * this.fastForwarder.speed;
    if (this._elapsed > 100) {
      this._elapsed %= 100;
    }
    this._lastTime = currentTime;

    const interval = (this._updateInterval / 1000) * this._timeScale;

    while (this._elapsed >= this._updateInterval) {
      this.physics.step(interval);
      this._updateMarbles(this._updateInterval);
      this._particleManager.update(this._updateInterval);
      this._updateEffects(this._updateInterval);
      this._elapsed -= this._updateInterval;
      this._uiObjects.forEach((obj) => obj.update(this._updateInterval));
    }

    if (this._marbles.length > 1) {
      this._marbles.sort((a, b) => b.y - a.y);
    }

    if (this._stage) {
      this._camera.update({
        marbles: this._marbles,
        stage: this._stage!,
        needToZoom: this._goalDist < zoomThreshold,
        targetIndex: this._winners.length > 0 ? this._targetIndex : 0,
      });
    }

    this._render();
    window.requestAnimationFrame(this._update);
  }

  /** 구슬 별 상태, 골인 판단, 스킬발동 갱신 처리 */
  private _updateMarbles(deltaTime: number) {
    if (!this._stage) return;

    for (let i = 0; i < this._marbles.length; i++) {
      const marble = this._marbles[i];
      marble.update(deltaTime);

      match(marble.skill)
        .with(Skills.Impact, () => {
          this._effects.push(new SkillEffect(marble.x, marble.y));
          this.physics.impact(marble.id);
          soundManager.playSkill();
        })
        .otherwise(() => {});

      if (marble.y > this._stage.goalY) {
        this._winners.push(marble);
        if (this._isRunning && this._isWinningRank(this._winners.length - 1)) {
          this._particleManager.shot(this._renderer.width, this._renderer.height);
          confettiManager.triggerGoalBurst();
          soundManager.playGoal();
        }
        this._pendingRemovals.push(
          window.setTimeout(() => {
            this.physics.removeMarble(marble.id);
          }, 500)
        );
      }
    }

    const targetIndex = this._targetIndex;
    const topY = this._marbles[targetIndex]?.y ?? 0;
    this._goalDist = Math.abs(this._stage.zoomY - topY);
    this._timeScale = this._calcTimeScale();

    this._marbles = this._marbles.filter((marble) => marble.y <= this._stage?.goalY);

    this._checkFinish();
  }

  /** 카메라와 슬로우모션이 주목할 구슬 인덱스 반환 */
  private get _targetIndex() {
    return this._winnerRange.end - this._winners.length;
  }

  /** 특정 순위가 당첨 범위에 속하는지 확인 */
  private _isWinningRank(rank: number) {
    return rank >= this._winnerRange.start && rank <= this._winnerRange.end;
  }

  /** 경기 종료 및 당첨자 확정 조건 확인 */
  private _checkFinish() {
    if (!this._isRunning) return;
    const { start, end } = this._winnerRange;

    const early = this._winners.length > 0 && this._marbles.length === 1;
    const ranked = early ? [...this._winners, this._marbles[0]] : this._winners;
    if (ranked.length <= end) return;

    if (early && this._isWinningRank(this._winners.length)) {
      this._particleManager.shot(this._renderer.width, this._renderer.height);
    }

    this._result = ranked.slice(start, end + 1);
    this._isRunning = false;
    confettiManager.triggerVictoryShower();
    soundManager.playVictory();
    this.dispatchEvent(
      new CustomEvent('goal', {
        detail: { winner: this._result[0].name, winners: this._result.map((m) => m.name) },
      })
    );
    setTimeout(() => {
      this._recorder.stop();
    }, 1000);
  }

  /** 결승선 접근 시 슬로우모션 타임스케일 계산 */
  private _calcTimeScale(): number {
    if (!this._stage) return 1;
    const targetIndex = this._targetIndex;
    if (
      this._winners.length < this._winnerRange.end + 1 &&
      this._goalDist < zoomThreshold &&
      this._marbles[targetIndex]
    ) {
      if (
        this._marbles[targetIndex].y > this._stage.zoomY - zoomThreshold * 1.2 &&
        (this._marbles[targetIndex - 1] || this._marbles[targetIndex + 1])
      ) {
        return Math.max(0.2, this._goalDist / zoomThreshold);
      }
    }
    return 1;
  }

  /** 스킬 이펙트 애니메이션 갱신 */
  private _updateEffects(deltaTime: number) {
    this._effects.forEach((effect) => effect.update(deltaTime));
    this._effects = this._effects.filter((effect) => !effect.isDestroy);
  }

  /** 캔버스 프레임 렌더링 호출 */
  private _render() {
    if (!this._stage) return;
    const renderParams = {
      camera: this._camera,
      stage: this._stage,
      entities: this.physics.getEntities(),
      marbles: this._marbles,
      winners: this._winners,
      particleManager: this._particleManager,
      effects: this._effects,
      winnerRange: this._winnerRange,
      result: this._result,
      size: { x: this._renderer.width, y: this._renderer.height },
      theme: this._theme,
    };
    this._renderer.render(renderParams, this._uiObjects);
  }

  /** 물리 엔진 및 UI 컴포넌트 비동기 초기화 */
  private async _init() {
    this._recorder = new VideoRecorder(this._renderer.canvas);

    this.physics = new Box2dPhysics();
    await this.physics.init();

    this.addUiObject(new RankRenderer());
    this.attachEvent();
    const minimap = new Minimap();
    minimap.onViewportChange((pos) => {
      if (pos) {
        this._camera.setPosition(pos, false);
        this._camera.lock(true);
      } else {
        this._camera.lock(false);
      }
    });
    this.addUiObject(minimap);
    this.fastForwarder = this.createFastForwader();
    this.addUiObject(this.fastForwarder);
    this._stage = stages[0];
    this._loadMap();
  }

  /** 마우스/포인터 이벤트 좌표 변환 및 UI 전달 핸들러 */
  @bound
  private mouseHandler(eventName: MouseEventName, e: MouseEvent) {
    const handlerName = `on${eventName}` as MouseEventHandlerName;

    const sizeFactor = this._renderer.sizeFactor;
    const pos = { x: e.offsetX * sizeFactor, y: e.offsetY * sizeFactor };
    this._uiObjects.forEach((obj) => {
      if (!obj[handlerName]) return;
      const bounds = obj.getBoundingBox();
      if (!bounds) {
        obj[handlerName]({ ...pos, button: e.button });
      } else if (
        bounds &&
        pos.x >= bounds.x &&
        pos.y >= bounds.y &&
        pos.x <= bounds.x + bounds.w &&
        pos.y <= bounds.y + bounds.h
      ) {
        obj[handlerName]({ x: pos.x - bounds.x, y: pos.y - bounds.y, button: e.button });
      } else {
        obj[handlerName](undefined);
      }
    });
  }

  /** DOM 캔버스 포인터/클릭 이벤트 바인딩 */
  private attachEvent() {
    const canvas = this._renderer.canvas;
    const onPointerRelease = (e: Event) => {
      this.mouseHandler('MouseUp', e as MouseEvent);
      window.removeEventListener('pointerup', onPointerRelease);
      window.removeEventListener('pointercancel', onPointerRelease);
    };

    canvas.addEventListener('pointerdown', (e: Event) => {
      this.mouseHandler('MouseDown', e as MouseEvent);
      window.addEventListener('pointerup', onPointerRelease);
      window.addEventListener('pointercancel', onPointerRelease);
    });

    ['MouseMove', 'DblClick'].forEach((ev) => {
      canvas.addEventListener(ev.toLowerCase().replace('mouse', 'pointer'), (e) =>
        this.mouseHandler(ev as MouseEventName, e as MouseEvent)
      );
    });
    canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    canvas.addEventListener('click', (e) => {
      if (this.resultCloseHitAt(e)) {
        this._renderer.closeResultPopup();
      }
    });

    canvas.addEventListener('pointermove', (e) => {
      canvas.style.cursor = this.resultCloseHitAt(e) ? 'pointer' : '';
    });
  }

  /** 현재 스테이지 물리 환경 로드 */
  private _loadMap() {
    if (!this._stage) {
      throw new Error('No map has been selected');
    }

    this.physics.createStage(this._stage);
    this._camera.initializePosition();
  }

  /** 현재 모든 구슬 및 예약된 제거 타이머 초기화 */
  public clearMarbles() {
    this._pendingRemovals.forEach((id) => window.clearTimeout(id));
    this._pendingRemovals = [];
    this.physics.clearMarbles();
    this._result = null;
    this._winners = [];
    this._marbles = [];
  }

  /** 비디오 자동 녹화 시작 */
  public async startRecording() {
    if (!this._autoRecording) return;
    try {
      await this._recorder.start();
    } catch (e) {
      console.error('recording failed to start', e);
    }
  }

  /** 추첨 시뮬레이션 개시 */
  public start() {
    if (this._isRunning) return;
    this._isRunning = true;
    this._winnerRange = clipWinnerRange(options.winnerRange, this._marbles.length);
    this._camera.startFollowingMarbles();

    if (this._autoRecording) {
      this._recorder.start().then(() => {
        this.physics.start();
        this._marbles.forEach((marble) => (marble.isActive = true));
      });
    } else {
      this.physics.start();
      this._marbles.forEach((marble) => (marble.isActive = true));
    }
  }

  /** 진행 속도 배율 설정 */
  public setSpeed(value: number) {
    if (value <= 0) {
      throw new Error('Speed multiplier must larger than 0');
    }
    this._speed = value;
  }

  /** 결과 팝업 닫기 버튼 클릭 영역 충돌 검사 */
  private resultCloseHitAt(e: MouseEvent): boolean {
    const sizeFactor = this._renderer.sizeFactor;
    return this._renderer.getResultCloseHitAt(e.offsetX * sizeFactor, e.offsetY * sizeFactor);
  }

  /** 테마 변경 */
  public setTheme(themeName: keyof typeof Themes) {
    this._theme = Themes[themeName];
  }

  /** 현재 설정된 진행 속도 배율 반환 */
  public getSpeed() {
    return this._speed;
  }

  /** 단일 당첨 순위 지정 */
  public setWinningRank(rank: number) {
    this.setWinnerRange(rank, rank);
  }

  /** 당첨 순위 범위 설정 (0-based) */
  public setWinnerRange(start: number, end: number) {
    options.winnerRange = { start, end };
    this._winnerRange = clipWinnerRange(options.winnerRange, this._marbles.length);
  }

  /** 현재 적용된 당첨 순위 범위 반환 */
  public getWinnerRange(): WinnerRange {
    return { ...this._winnerRange };
  }

  /** 자동 비디오 녹화 여부 설정 */
  public setAutoRecording(value: boolean) {
    this._autoRecording = value;
  }

  /**
   * 구슬 생성 목록을 파싱하고 맵 상에 구슬 강체배치
   * @param names 이름/가중치/수량 구문이 포함된 문자열 배열
   */
  public setMarbles(names: string[]) {
    this.reset();
    const arr = names.slice();

    let maxWeight = -Infinity;
    let minWeight = Infinity;

    const members = arr
      .map((nameString) => {
        const result = parseName(nameString);
        if (!result) return null;
        const { name, weight, count } = result;
        if (weight > maxWeight) maxWeight = weight;
        if (weight < minWeight) minWeight = weight;
        return { name, weight, count };
      })
      .filter((member) => !!member);

    const gap = maxWeight - minWeight;

    let totalCount = 0;
    members.forEach((member) => {
      if (member) {
        member.weight = 0.1 + (gap ? (member.weight - minWeight) / gap : 0);
        totalCount += member.count;
      }
    });

    const orders = shuffle(
      Array(totalCount)
        .fill(0)
        .map((_, i) => i)
    );
    members.forEach((member) => {
      if (member) {
        for (let j = 0; j < member.count; j++) {
          const order = orders.pop() || 0;
          this._marbles.push(new Marble(this.physics, order, totalCount, member.name, member.weight));
        }
      }
    });

    if (totalCount > 0) {
      const cols = Math.min(totalCount, 10);
      const rows = Math.ceil(totalCount / 10);
      const lineDelta = -Math.max(0, Math.ceil(rows - 5));
      const centerX = 10.25 + (cols - 1) * 0.3;
      const centerY = (1 + rows) / 2 + lineDelta;

      const spawnWidth = Math.max((cols - 1) * 0.6, 1);
      const spawnHeight = Math.max(rows - 1, 1);
      const margin = 3;
      const viewW = (this._renderer.width || canvasWidth) / initialZoom;
      const viewH = (this._renderer.height || canvasHeight) / initialZoom;
      const zoom = Math.max(
        1.5,
        Math.min(Math.min(viewW / (spawnWidth + margin * 2), viewH / (spawnHeight + margin * 2)), 3)
      );

      this._camera.initializePosition({ x: centerX, y: centerY }, zoom);
    }
  }

  /** 물리 엔진 엔티티 및 구슬 전체 제거 */
  private _clearMap() {
    this.physics.clear();
    this._marbles = [];
  }

  /** 경기를 완전히 리셋하고 맵 다시 로드 */
  public reset() {
    this.clearMarbles();
    this._clearMap();
    this._loadMap();
    this._goalDist = Infinity;
  }

  /** 현재 남아있는 구슬 개수 반환 */
  public getCount() {
    return this._marbles.length;
  }

  /** 스테이지 전체 목록 정보 반환 */
  public getMaps() {
    return stages.map((stage, index) => {
      return {
        index,
        title: stage.title,
      };
    });
  }

  /** 현재 선택된 스테이지 정보 반환 */
  public getCurrentMap() {
    if (!this._stage) return null;
    return {
      index: stages.indexOf(this._stage),
      title: this._stage.title,
    };
  }

  /**
   * 지정한 인덱스의 스테이지로 변경 및 구슬 재생성
   * @param index 스테이지 인덱스
   */
  public setMap(index: number) {
    if (index < 0 || index > stages.length - 1) {
      throw new Error('Incorrect map number');
    }
    const names = this._marbles.map((marble) => marble.name);
    this._stage = stages[index];
    this.setMarbles(names);
    this._camera.initializePosition();
  }
}
