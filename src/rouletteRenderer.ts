import type { Camera } from './camera';
import { canvasHeight, canvasWidth, initialZoom, Themes, winnerAreaHeight } from './data/constants';
import type { StageDef } from './data/maps';
import type { GameObject } from './gameObject';
import { KeywordService } from './keywordService';
import type { Marble } from './marble';
import { MINIMAP_INSET, MINIMAP_WIDTH } from './minimap';
import type { WinnerRange } from './options';
import type { ParticleManager } from './particleManager';
import type { ColorTheme } from './types/ColorTheme';
import type { MapEntityState } from './types/MapEntity.type';
import type { Rect } from './types/rect.type';
import { getText } from './localization';
import type { VectorLike } from './types/VectorLike';
import type { UIObject } from './UIObject';

/** 렌더링 파라미터 번들 타입 */
export type RenderParameters = {
  camera: Camera;
  stage: StageDef;
  entities: MapEntityState[];
  marbles: Marble[];
  winners: Marble[];
  particleManager: ParticleManager;
  effects: GameObject[];
  winnerRange: WinnerRange;
  /** 진행 중에는 null, 당첨자가 모두 확정되면 당첨자 배열 */
  result: Marble[] | null;
  size: VectorLike;
  theme: ColorTheme;
};

const RESULT_PANEL_MAX_WIDTH_RATIO = 0.9;
const RESULT_PANEL_MAX_HEIGHT_RATIO = 0.8;
const RESULT_COLUMN_MAX_WIDTH = 280;
const PROGRESS_MAX_WIDTH_RATIO = 0.3;
const PROGRESS_ACCENT = 'rgba(255, 215, 0, 0.8)';
const CLOSE_HIT_PADDING = 8;

/** 팝업 닫기 버튼 크기 계산 */
function closeButtonSize(h: number): number {
  return Math.max(20, Math.min(34, Math.round(h * 0.045)));
}

/** 팝업 닫기 X 버튼 그리기 및 클릭 영역 반환 */
function drawCloseCircle(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  fill: string = 'rgba(0, 0, 0, 0.5)'
): Rect {
  const arm = size * 0.22;

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.lineWidth = Math.max(2, Math.round(size * 0.07));
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - arm, cy - arm);
  ctx.lineTo(cx + arm, cy + arm);
  ctx.moveTo(cx + arm, cy - arm);
  ctx.lineTo(cx - arm, cy + arm);
  ctx.stroke();
  ctx.restore();

  return {
    x: cx - size / 2 - CLOSE_HIT_PADDING,
    y: cy - size / 2 - CLOSE_HIT_PADDING,
    w: size + CLOSE_HIT_PADDING * 2,
    h: size + CLOSE_HIT_PADDING * 2,
  };
}

/** 좌표의 직사각형 내부 포함 여부 확인 */
function inRect(rect: Rect | undefined, x: number, y: number): boolean {
  return !!rect && x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

/**
 * 게임 화면 메인 Canvas 렌더러
 * High-DPI 처리, 물리 엔티티/구슬/이펙트/UI/당첨자 팝업 렌더링 통괄
 */
export class RouletteRenderer {
  protected _canvas!: HTMLCanvasElement;
  protected _sceneCanvas!: HTMLCanvasElement;
  protected ctx!: CanvasRenderingContext2D;
  private _displayCtx!: CanvasRenderingContext2D;
  public sizeFactor = 1;
  private _dpr = 1;
  private _logicalWidth = canvasWidth;
  private _logicalHeight = canvasHeight;

  protected _images: { [key: string]: HTMLImageElement } = {};
  protected _theme: ColorTheme = Themes.dark;
  private _resultCloseRect: Rect | null = null;
  private _resultPopupClosed = false;
  private _lastResult: Marble[] | null = null;
  protected _keywordService: KeywordService;

  constructor() {
    this._keywordService = this.createKeywordService();
  }

  /** 키워드 서비스 생성 팩토리 메서드 */
  protected createKeywordService(): KeywordService {
    return new KeywordService();
  }

  /** 논리적 캔버스 너비 반환 */
  get width() {
    return this._logicalWidth;
  }

  /** 논리적 캔버스 높이 반환 */
  get height() {
    return this._logicalHeight;
  }

  /** 현재 디바이스 픽셀 비율 반환 */
  get dpr() {
    return this._dpr;
  }

  /** 메인 HTML 캔버스 엘리먼트 반환 */
  get canvas() {
    return this._canvas;
  }

  /** 색상 테마 설정 */
  set theme(value: ColorTheme) {
    this._theme = value;
  }

  /**
   * 이미지 자원 및 키워드 서비스 비동기 로드, DPI 반응형 캔버스 생성 및 이벤트 바인딩
   */
  async init() {
    await Promise.all([this._load(), this._keywordService.init()]);

    this._canvas = document.createElement('canvas');
    this._canvas.width = canvasWidth;
    this._canvas.height = canvasHeight;
    this._displayCtx = this._canvas.getContext('2d', {
      alpha: false,
    }) as CanvasRenderingContext2D;

    this._sceneCanvas = document.createElement('canvas');
    this._sceneCanvas.width = canvasWidth;
    this._sceneCanvas.height = canvasHeight;
    this.ctx = this._sceneCanvas.getContext('2d', {
      alpha: false,
    }) as CanvasRenderingContext2D;

    document.body.appendChild(this._canvas);

    const resizing = (entries?: ResizeObserverEntry[]) => {
      const realSize = entries ? entries[0].contentRect : this._canvas.getBoundingClientRect();
      if (realSize.width <= 0 || realSize.height <= 0) return;

      const dpr = Math.max(1, window.devicePixelRatio || 1);
      this._dpr = dpr;

      this._logicalWidth = realSize.width;
      this._logicalHeight = realSize.height;

      const physicalWidth = Math.round(realSize.width * dpr);
      const physicalHeight = Math.round(realSize.height * dpr);

      this._sceneCanvas.width = physicalWidth;
      this._sceneCanvas.height = physicalHeight;

      this._canvas.width = physicalWidth;
      this._canvas.height = physicalHeight;

      if (this.ctx) {
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
      }
      if (this._displayCtx) {
        this._displayCtx.imageSmoothingEnabled = true;
        this._displayCtx.imageSmoothingQuality = 'high';
      }

      this.sizeFactor = 1;
    };

    const resizeObserver = new ResizeObserver(resizing);

    resizeObserver.observe(this._canvas);
    resizing();
  }

  /** 단일 이미지 자원 비동기 로드 */
  private async _loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((rs) => {
      const img = new Image();
      img.addEventListener('load', () => {
        rs(img);
      });
      img.src = url;
    });
  }

  /** 내장 에셋 이미지 로드 */
  protected async _load(): Promise<void> {
    const loadPromises = [
      { name: '챔루', imgUrl: new URL('../assets/images/chamru.png', import.meta.url) },
      { name: '쿠빈', imgUrl: new URL('../assets/images/kubin.png', import.meta.url) },
      { name: '꽉변', imgUrl: new URL('../assets/images/kkwak.png', import.meta.url) },
      { name: '꽉변호사', imgUrl: new URL('../assets/images/kkwak.png', import.meta.url) },
      { name: '꽉 변호사', imgUrl: new URL('../assets/images/kkwak.png', import.meta.url) },
      { name: '주누피', imgUrl: new URL('../assets/images/junyoop.png', import.meta.url) },
      { name: '왈도쿤', imgUrl: new URL('../assets/images/waldokun.png', import.meta.url) },
    ].map(({ name, imgUrl }) => {
      return (async () => {
        this._images[name] = await this._loadImage(imgUrl.toString());
      })();
    });

    loadPromises.push(
      (async () => {
        await this._loadImage(new URL('../assets/images/ff.svg', import.meta.url).toString());
      })()
    );

    await Promise.all(loadPromises);
  }

  /** 구슬 이름 매칭 이미지 자원 조회 */
  private getMarbleImage(name: string): CanvasImageSource | undefined {
    if (this._images[name]) {
      return this._images[name];
    }
    return this._keywordService.getSprite(name);
  }

  protected onBeforeEntities(): void {}
  protected onAfterScene(): void {}

  /**
   * 메인 프레임 종합 렌더링
   * @param renderParameters 렌더링 상태 데이터
   * @param uiObjects UI 컴포넌트 목록
   */
  render(renderParameters: RenderParameters, uiObjects: UIObject[]) {
    this._theme = renderParameters.theme;

    this.ctx.save();
    this.ctx.scale(this._dpr, this._dpr);

    this.ctx.fillStyle = this._theme.background;
    this.ctx.fillRect(0, 0, this._logicalWidth, this._logicalHeight);

    this.ctx.save();
    this.ctx.scale(initialZoom, initialZoom);
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';
    this.ctx.font = '0.4pt Pretendard, sans-serif';
    this.ctx.lineWidth = 3 / (renderParameters.camera.zoom + initialZoom);
    renderParameters.camera.renderScene(
      this.ctx,
      () => {
        this.onBeforeEntities();
        this.renderEntities(renderParameters.entities);
        this.renderEffects(renderParameters);
        this.renderMarbles(renderParameters);
      },
      this._dpr
    );
    this.ctx.restore();
    this.onAfterScene();

    uiObjects.forEach((obj) => obj.render(this.ctx, renderParameters, this._logicalWidth, this._logicalHeight));
    renderParameters.particleManager.render(this.ctx);
    this.renderWinnerProgress(renderParameters);
    this.renderResult(renderParameters);

    this.ctx.restore();

    this._displayCtx.drawImage(this._sceneCanvas, 0, 0, this._canvas.width, this._canvas.height);
  }

  /** 스테이지 배경 엔티티(장애물, 폴리라인, 회전체) 렌더링 */
  private renderEntities(entities: MapEntityState[]) {
    this.ctx.save();
    entities.forEach((entity) => {
      const transform = this.ctx.getTransform();
      this.ctx.translate(entity.x, entity.y);
      this.ctx.rotate(entity.angle);
      this.ctx.fillStyle = entity.shape.color ?? this._theme.entity[entity.shape.type].fill;
      this.ctx.strokeStyle = entity.shape.color ?? this._theme.entity[entity.shape.type].outline;
      this.ctx.shadowBlur = this._theme.entity[entity.shape.type].bloomRadius;
      this.ctx.shadowColor =
        entity.shape.bloomColor ?? entity.shape.color ?? this._theme.entity[entity.shape.type].bloom;
      const shape = entity.shape;
      switch (shape.type) {
        case 'polyline':
          if (shape.points.length > 0) {
            this.ctx.beginPath();
            this.ctx.moveTo(shape.points[0][0], shape.points[0][1]);
            for (let i = 1; i < shape.points.length; i++) {
              this.ctx.lineTo(shape.points[i][0], shape.points[i][1]);
            }
            this.ctx.stroke();
          }
          break;
        case 'box': {
          const w = shape.width * 2;
          const h = shape.height * 2;
          this.ctx.rotate(shape.rotation);
          this.ctx.fillRect(-w / 2, -h / 2, w, h);
          this.ctx.strokeRect(-w / 2, -h / 2, w, h);
          break;
        }
        case 'circle':
          this.ctx.beginPath();
          this.ctx.arc(0, 0, shape.radius, 0, Math.PI * 2, false);
          this.ctx.stroke();
          break;
      }

      this.ctx.setTransform(transform);
    });
    this.ctx.restore();
  }

  /** 스킬 발생 및 물리 충격 이펙트 렌더링 */
  private renderEffects({ effects, camera }: RenderParameters) {
    effects.forEach((effect) => effect.render(this.ctx, camera.zoom * initialZoom, this._theme));
  }

  /** 전체 구슬 객체 렌더링 */
  private renderMarbles({ marbles, camera, winnerRange, winners, size }: RenderParameters) {
    const firstIndex = winnerRange.start - winners.length;
    const lastIndex = winnerRange.end - winners.length;

    const viewPort = { x: camera.x, y: camera.y, w: size.x, h: size.y, zoom: camera.zoom * initialZoom };
    marbles.forEach((marble, i) => {
      marble.render(
        this.ctx,
        camera.zoom * initialZoom,
        i >= firstIndex && i <= lastIndex,
        false,
        this.getMarbleImage(marble.name),
        viewPort,
        this._theme
      );
    });
  }

  /** 경기 결과(단일/다중 당첨자) 렌더링 결정 */
  private renderResult(params: RenderParameters) {
    const result = params.result;
    if (result !== this._lastResult) {
      this._lastResult = result;
      this._resultPopupClosed = false;
    }
    this._resultCloseRect = null;
    if (!result) return;
    if (result.length === 1) {
      this.renderWinner(result[0], params.theme);
    } else if (!this._resultPopupClosed) {
      this.renderWinnerList(result, params);
    }
  }

  /** 결과 팝업 닫기 버튼 충돌 위치 판단 */
  getResultCloseHitAt(x: number, y: number): boolean {
    return inRect(this._resultCloseRect ?? undefined, x, y);
  }

  /** 결과 팝업 수동 닫기 */
  closeResultPopup(): void {
    this._resultPopupClosed = true;
  }

  /** 화면 좌측 상단 실시간 당첨자 현황 프로그레스 패널 렌더링 */
  private renderWinnerProgress({ winners, winnerRange, result, theme }: RenderParameters) {
    const { start, end } = winnerRange;
    if (end <= start) return;

    const ctx = this.ctx;
    const w = this._logicalWidth;
    const h = this._logicalHeight;

    const lineHeight = Math.round(Math.min(24, Math.max(14, h * 0.042)));
    const pad = lineHeight * 0.6;
    const rankWidth = lineHeight * 1.9;
    const headerFont = `bold ${Math.round(lineHeight * 0.7)}px Pretendard, sans-serif`;
    const rankFont = `${Math.round(lineHeight * 0.6)}px Pretendard, sans-serif`;
    const nameFont = `bold ${Math.round(lineHeight * 0.72)}px Pretendard, sans-serif`;

    const confirmed = result ?? winners.slice(start, end + 1);
    const winnersTitle = getText('Winners');
    const header = `${winnersTitle} ${confirmed.length} / ${end - start + 1}`;

    const maxRows = Math.max(1, Math.floor((h * 0.55) / lineHeight) - 2);
    const hidden = Math.max(0, confirmed.length - maxRows);
    const shown = confirmed.slice(hidden);
    const foldLabel = `+${hidden} ${getText('more')}`;

    ctx.save();

    ctx.font = headerFont;
    let contentW = ctx.measureText(header).width;
    ctx.font = nameFont;
    for (const marble of shown) {
      contentW = Math.max(contentW, rankWidth + ctx.measureText(marble.name).width);
    }
    if (hidden > 0) {
      ctx.font = rankFont;
      contentW = Math.max(contentW, ctx.measureText(foldLabel).width);
    }

    const panelW = Math.min(contentW + pad * 2, w * PROGRESS_MAX_WIDTH_RATIO);
    const rows = shown.length + (hidden > 0 ? 1 : 0);
    const headerGap = rows > 0 ? lineHeight * 0.35 : 0;
    const panelH = pad * 2 + lineHeight + headerGap + rows * lineHeight;
    const panelX = MINIMAP_INSET + MINIMAP_WIDTH + pad;
    const panelY = MINIMAP_INSET;

    ctx.fillStyle = theme.winnerBackground;
    ctx.fillRect(panelX, panelY, panelW, panelH);
    ctx.strokeStyle = PROGRESS_ACCENT;
    ctx.lineWidth = 2;
    ctx.strokeRect(panelX, panelY, panelW, panelH);

    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.font = headerFont;
    ctx.fillStyle = theme.winnerText;
    ctx.fillText(header, panelX + pad, panelY + pad + lineHeight / 2);

    let y = panelY + pad + lineHeight + headerGap + lineHeight / 2;
    if (hidden > 0) {
      ctx.font = rankFont;
      ctx.fillStyle = theme.winnerText;
      ctx.fillText(foldLabel, panelX + pad, y);
      y += lineHeight;
    }

    shown.forEach((marble, i) => {
      ctx.save();
      ctx.beginPath();
      ctx.rect(panelX, y - lineHeight / 2, panelW, lineHeight);
      ctx.clip();

      ctx.font = rankFont;
      ctx.fillStyle = theme.winnerText;
      ctx.fillText(`#${start + hidden + i + 1}`, panelX + pad, y);

      ctx.font = nameFont;
      ctx.fillStyle = `hsl(${marble.hue} 100% ${theme.marbleLightness}%)`;
      ctx.fillText(marble.name, panelX + pad + rankWidth, y);
      ctx.restore();
      y += lineHeight;
    });

    ctx.restore();
  }

  /** 다중 당첨자 결과 화면 중앙 모달 팝업 렌더링 */
  private renderWinnerList(winners: Marble[], { winnerRange }: RenderParameters) {
    const ctx = this.ctx;
    const w = this._logicalWidth;
    const h = this._logicalHeight;

    const lineHeight = Math.round(Math.min(32, Math.max(16, h * 0.05)));
    const padding = lineHeight;
    const titleHeight = lineHeight * 2;

    const maxRows = Math.max(
      1,
      Math.floor((h * RESULT_PANEL_MAX_HEIGHT_RATIO - titleHeight - padding * 2) / lineHeight)
    );
    const cols = Math.max(1, Math.ceil(winners.length / maxRows));
    const rows = Math.ceil(winners.length / cols);

    const colWidth = Math.min(RESULT_COLUMN_MAX_WIDTH, (w * RESULT_PANEL_MAX_WIDTH_RATIO - padding * 2) / cols);
    const panelW = colWidth * cols + padding * 2;
    const panelH = titleHeight + rows * lineHeight + padding;
    const panelX = (w - panelW) / 2;
    const panelY = (h - panelH) / 2;

    ctx.save();

    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(0, 0, w, h);

    const panelBg = ctx.createLinearGradient(panelX, panelY, panelX, panelY + panelH);
    panelBg.addColorStop(0, '#1a1a24');
    panelBg.addColorStop(1, '#0d0d12');

    ctx.fillStyle = panelBg;
    ctx.shadowBlur = 30;
    ctx.shadowColor = 'rgba(255, 215, 0, 0.4)';
    ctx.fillRect(panelX, panelY, panelW, panelH);

    ctx.shadowBlur = 0;
    const goldGlow = ctx.createLinearGradient(panelX, panelY, panelX + panelW, panelY + panelH);
    goldGlow.addColorStop(0, '#ffd700');
    goldGlow.addColorStop(0.5, '#fff8dc');
    goldGlow.addColorStop(1, '#cca625');

    ctx.strokeStyle = goldGlow;
    ctx.lineWidth = 3;
    ctx.strokeRect(panelX, panelY, panelW, panelH);

    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';

    ctx.save();
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'rgba(255, 215, 0, 0.6)';
    ctx.fillStyle = goldGlow;
    ctx.font = `bold ${Math.round(lineHeight * 1.15)}px Pretendard, sans-serif`;
    const winnersTitle = getText('Winners');
    ctx.fillText(`🏆 ${winnersTitle} (${winners.length}) 🏆`, w / 2, panelY + titleHeight / 2);
    ctx.restore();

    this._resultCloseRect = drawCloseCircle(ctx, panelX + panelW, panelY, closeButtonSize(h), '#222');

    const rankWidth = lineHeight * 1.8;
    winners.forEach((marble, i) => {
      const col = Math.floor(i / rows);
      const row = i % rows;
      const x = panelX + padding + col * colWidth;
      const y = panelY + titleHeight + row * lineHeight + lineHeight / 2;

      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y - lineHeight / 2, colWidth, lineHeight);
      ctx.clip();

      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffd700';
      ctx.font = `bold ${Math.round(lineHeight * 0.65)}px Pretendard, sans-serif`;
      ctx.fillText(`#${winnerRange.start + i + 1}`, x + rankWidth * 0.8, y);

      ctx.textAlign = 'left';
      ctx.shadowBlur = 8;
      ctx.shadowColor = `hsl(${marble.hue}, 100%, 60%)`;
      ctx.fillStyle = `hsl(${marble.hue} 100% 75%)`;
      ctx.font = `bold ${Math.round(lineHeight * 0.75)}px Pretendard, sans-serif`;
      ctx.fillText(marble.name, x + rankWidth, y);
      ctx.restore();
    });

    ctx.restore();
  }

  /** 단일 당첨자 상단 배너 렌더링 (화면 상단 중앙 정렬) */
  private renderWinner(winner: Marble, theme: ColorTheme) {
    const sceneW = this._logicalWidth;

    const bannerWidth = sceneW;
    const bannerX = 0;
    const bannerY = 0;

    this.ctx.save();

    const bgGradient = this.ctx.createLinearGradient(
      bannerX,
      bannerY,
      bannerX + bannerWidth,
      bannerY + winnerAreaHeight
    );
    bgGradient.addColorStop(0, 'rgba(20, 20, 30, 0.85)');
    bgGradient.addColorStop(0.5, 'rgba(35, 30, 10, 0.9)');
    bgGradient.addColorStop(1, 'rgba(20, 20, 30, 0.85)');

    this.ctx.fillStyle = bgGradient;
    this.ctx.fillRect(bannerX, bannerY, bannerWidth, winnerAreaHeight);

    const goldGradient = this.ctx.createLinearGradient(bannerX, 0, bannerX + bannerWidth, 0);
    goldGradient.addColorStop(0, '#ffd700');
    goldGradient.addColorStop(0.5, '#fff8dc');
    goldGradient.addColorStop(1, '#ffd700');

    this.ctx.fillStyle = goldGradient;
    this.ctx.fillRect(bannerX, bannerY + winnerAreaHeight - 3, bannerWidth, 3);

    const scale = Math.min(1, sceneW / 640);
    const marbleSize = Math.max(48, Math.min(90, Math.round(90 * scale)));
    const gap = Math.round(15 * scale);

    const titleFontSize = Math.max(18, Math.round(38 * scale));
    const nameFontSize = Math.max(24, Math.round(58 * scale));

    const winnerTitle = `★ ${getText('Winner')} ★`;

    this.ctx.font = `bold ${titleFontSize}px Pretendard, sans-serif`;
    const titleWidth = this.ctx.measureText(winnerTitle).width;

    this.ctx.font = `bold ${nameFontSize}px Pretendard, sans-serif`;
    const nameWidth = this.ctx.measureText(winner.name).width;

    const textBlockWidth = Math.max(titleWidth, nameWidth);
    const totalWidth = marbleSize + gap + textBlockWidth;

    const startX = Math.max(10, (sceneW - totalWidth) / 2);
    const marbleCenterX = startX + marbleSize / 2;
    const marbleCenterY = bannerY + winnerAreaHeight / 2;
    const textX = startX + marbleSize + gap;

    const marbleImage = this.getMarbleImage(winner.name);

    this.ctx.save();
    this.ctx.shadowBlur = 25;
    this.ctx.shadowColor = `hsl(${winner.hue}, 100%, 65%)`;
    if (marbleImage) {
      this.ctx.drawImage(
        marbleImage,
        marbleCenterX - marbleSize / 2,
        marbleCenterY - marbleSize / 2,
        marbleSize,
        marbleSize
      );
    } else {
      this.ctx.beginPath();
      this.ctx.arc(marbleCenterX, marbleCenterY, marbleSize / 2, 0, Math.PI * 2);
      this.ctx.fillStyle = `hsl(${winner.hue} 100% ${theme.marbleLightness}%)`;
      this.ctx.fill();
    }
    this.ctx.restore();

    const titleY = bannerY + Math.round(25 * scale);
    const nameY = bannerY + Math.round(75 * scale);

    this.ctx.save();
    this.ctx.font = `bold ${titleFontSize}px Pretendard, sans-serif`;
    this.ctx.textAlign = 'left';
    this.ctx.shadowBlur = 12;
    this.ctx.shadowColor = 'rgba(255, 215, 0, 0.8)';
    this.ctx.fillStyle = goldGradient;
    this.ctx.fillText(winnerTitle, textX, titleY);
    this.ctx.restore();

    this.ctx.save();
    this.ctx.font = `bold ${nameFontSize}px Pretendard, sans-serif`;
    this.ctx.textAlign = 'left';
    this.ctx.shadowBlur = 18;
    this.ctx.shadowColor = `hsl(${winner.hue}, 100%, 60%)`;

    const nameGradient = this.ctx.createLinearGradient(textX, nameY, textX + nameWidth, nameY);
    nameGradient.addColorStop(0, '#ffffff');
    nameGradient.addColorStop(1, `hsl(${winner.hue}, 100%, 75%)`);

    this.ctx.fillStyle = nameGradient;
    this.ctx.lineWidth = Math.max(2, Math.round(4 * scale));
    this.ctx.strokeStyle = '#000000';
    this.ctx.strokeText(winner.name, textX, nameY);
    this.ctx.fillText(winner.name, textX, nameY);
    this.ctx.restore();

    this.ctx.restore();
  }
}
