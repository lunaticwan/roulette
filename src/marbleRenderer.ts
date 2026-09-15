import type { ColorTheme } from './types/ColorTheme';
import type { Marble } from './marble';
import { transformGuard } from './utils/transformGuard';

/** 구슬 비주얼 렌더링 스타일 타입 */
export type MarbleStyle = 'glass' | 'neon' | 'metallic';

export interface ViewPort {
  x: number;
  y: number;
  w: number;
  h: number;
  zoom: number;
}

/**
 * 구슬(Marble) 시각 렌더링 관장 전용 클래스.
 * 뷰포트 컬링, 3D 입체 음영, 회전 패턴, 스페큘러, 림 라이트 및 멀티 스타일 파이프라인 처리.
 */
export class MarbleRenderer {
  private static _instance: MarbleRenderer;

  public static getInstance(): MarbleRenderer {
    if (!MarbleRenderer._instance) {
      MarbleRenderer._instance = new MarbleRenderer();
    }
    return MarbleRenderer._instance;
  }

  /**
   * 뷰포트 컬링 및 구슬 렌더링 진입점.
   */
  public render(
    ctx: CanvasRenderingContext2D,
    marble: Marble,
    zoom: number,
    outline: boolean,
    isMinimap: boolean = false,
    skin?: CanvasImageSource,
    viewPort?: ViewPort,
    theme?: ColorTheme,
    style: MarbleStyle = 'glass'
  ): void {
    const currentTheme = theme || { marbleLightness: 50, marbleWinningBorder: '#ffd700', coolTimeIndicator: '#ffffff' };

    if (viewPort && !isMinimap) {
      const viewPortHw = viewPort.w / viewPort.zoom / 2;
      const viewPortHh = viewPort.h / viewPort.zoom / 2;
      const viewPortLeft = viewPort.x - viewPortHw;
      const viewPortRight = viewPort.x + viewPortHw;
      const viewPortTop = viewPort.y - viewPortHh - marble.size / 2;
      const viewPortBottom = viewPort.y + viewPortHh;

      if (marble.x < viewPortLeft || marble.x > viewPortRight || marble.y < viewPortTop || marble.y > viewPortBottom) {
        return;
      }
    }

    const transform = ctx.getTransform();
    if (isMinimap) {
      this._renderMinimap(ctx, marble);
    } else {
      this._renderNormal(ctx, marble, zoom, outline, skin, currentTheme, style);
    }
    ctx.setTransform(transform);
  }

  private _renderMinimap(ctx: CanvasRenderingContext2D, marble: Marble): void {
    ctx.fillStyle = marble.color;
    ctx.beginPath();
    ctx.arc(marble.x, marble.y, marble.size * 2, 0, Math.PI * 2);
    ctx.fill();
  }

  private _renderNormal(
    ctx: CanvasRenderingContext2D,
    marble: Marble,
    zoom: number,
    outline: boolean,
    skin: CanvasImageSource | undefined,
    theme: Partial<ColorTheme>,
    style: MarbleStyle
  ): void {
    const hs = marble.size / 2;

    ctx.save();
    ctx.shadowColor = `hsl(${marble.hue} 100% 50%)`;
    ctx.shadowBlur = 8 / zoom;

    if (skin) {
      transformGuard(ctx, () => {
        ctx.translate(marble.x, marble.y);
        ctx.rotate(marble.angle);
        ctx.beginPath();
        ctx.arc(0, 0, hs, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(skin, -hs, -hs, hs * 2, hs * 2);
      });
      this._drawGlassOverlay(ctx, marble);
    } else {
      this._drawMarbleBody(ctx, marble, theme, style);
    }
    ctx.restore();

    ctx.shadowColor = '';
    ctx.shadowBlur = 0;
    this._drawName(ctx, marble, zoom);

    if (outline) {
      this._drawOutline(ctx, marble, 2 / zoom, theme.marbleWinningBorder ?? '#ffd700');
    }
  }

  private _drawMarbleBody(
    ctx: CanvasRenderingContext2D,
    marble: Marble,
    theme: Partial<ColorTheme>,
    style: MarbleStyle
  ): void {
    const radius = marble.size / 2;
    const impactFactor = Math.min(1, marble.impact / 300);
    const lightness = Math.min(85, (theme.marbleLightness ?? 50) + 25 * impactFactor);
    const lightAngle = marble.x * 0.2 + marble.y * 0.2;
    const lightOffsetX = Math.cos(lightAngle) * radius * 0.08;
    const lightOffsetY = Math.sin(lightAngle) * radius * 0.08;
    const lightX = marble.x - radius * 0.35 + lightOffsetX;
    const lightY = marble.y - radius * 0.35 + lightOffsetY;

    this._render3DBaseBody(ctx, marble, radius, lightness, lightX, lightY, style);
    this._renderGlassSwirl(ctx, marble, radius, style);
    this._renderSpecularHighlight(ctx, marble, radius, lightX, lightY, impactFactor, style);
    this._renderRimReflection(ctx, marble, radius, impactFactor, style);
  }

  private _drawGlassOverlay(ctx: CanvasRenderingContext2D, marble: Marble): void {
    const radius = marble.size / 2;
    const impactFactor = Math.min(1, marble.impact / 300);
    const lightAngle = marble.x * 0.2 + marble.y * 0.2;
    const lightOffsetX = Math.cos(lightAngle) * radius * 0.08;
    const lightOffsetY = Math.sin(lightAngle) * radius * 0.08;
    const lightX = marble.x - radius * 0.35 + lightOffsetX;
    const lightY = marble.y - radius * 0.35 + lightOffsetY;

    this._renderSpecularHighlight(ctx, marble, radius, lightX, lightY, impactFactor, 'glass');
    this._renderRimReflection(ctx, marble, radius, impactFactor, 'glass');
  }

  private _render3DBaseBody(
    ctx: CanvasRenderingContext2D,
    marble: Marble,
    radius: number,
    lightness: number,
    lightX: number,
    lightY: number,
    style: MarbleStyle
  ): void {
    const baseGrad = ctx.createRadialGradient(lightX, lightY, radius * 0.05, marble.x, marble.y, radius);

    if (style === 'neon') {
      baseGrad.addColorStop(0, `hsl(${marble.hue} 100% 95%)`);
      baseGrad.addColorStop(0.3, `hsl(${marble.hue} 100% 65%)`);
      baseGrad.addColorStop(0.7, `hsl(${marble.hue} 90% 30%)`);
      baseGrad.addColorStop(1, `hsl(${marble.hue} 100% 12%)`);
    } else if (style === 'metallic') {
      baseGrad.addColorStop(0, `hsl(${marble.hue} 15% 95%)`);
      baseGrad.addColorStop(0.25, `hsl(${marble.hue} 60% ${Math.min(85, lightness + 15)}%)`);
      baseGrad.addColorStop(0.55, `hsl(${marble.hue} 70% 25%)`);
      baseGrad.addColorStop(0.85, `hsl(${marble.hue} 80% 65%)`);
      baseGrad.addColorStop(1, `hsl(${marble.hue} 50% 15%)`);
    } else {
      // glass (기본 유리)
      baseGrad.addColorStop(0, `hsl(${marble.hue} 100% ${Math.min(98, lightness + 38)}%)`);
      baseGrad.addColorStop(0.2, `hsl(${marble.hue} 100% ${lightness}%)`);
      baseGrad.addColorStop(0.65, `hsl(${marble.hue} 95% ${Math.max(18, lightness - 18)}%)`);
      baseGrad.addColorStop(0.88, `hsl(${marble.hue} 90% ${Math.max(5, lightness - 35)}%)`);
      baseGrad.addColorStop(1, `hsla(${marble.hue}, 100%, ${Math.max(10, lightness - 10)}%, 0.85)`);
    }

    ctx.fillStyle = baseGrad;
    ctx.beginPath();
    ctx.arc(marble.x, marble.y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  private _renderGlassSwirl(ctx: CanvasRenderingContext2D, marble: Marble, radius: number, style: MarbleStyle): void {
    transformGuard(ctx, () => {
      ctx.translate(marble.x, marble.y);
      ctx.rotate(marble.angle);

      if (style === 'neon') {
        // 네온 에너제틱 오르빗 링
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.55, 0, Math.PI * 2);
        ctx.strokeStyle = `hsla(${marble.hue}, 100%, 85%, 0.8)`;
        ctx.lineWidth = radius * 0.15;
        ctx.setLineDash([radius * 0.4, radius * 0.2]);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${marble.hue}, 100%, 95%, 0.95)`;
        ctx.fill();
      } else if (style === 'metallic') {
        // 메탈릭 거울 선명 반사 대각 띠
        ctx.beginPath();
        ctx.moveTo(-radius * 0.7, -radius * 0.2);
        ctx.lineTo(radius * 0.7, radius * 0.2);
        ctx.strokeStyle = `rgba(255, 255, 255, 0.65)`;
        ctx.lineWidth = radius * 0.22;
        ctx.lineCap = 'round';
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(-radius * 0.5, -radius * 0.4);
        ctx.lineTo(radius * 0.3, radius * 0.4);
        ctx.strokeStyle = `hsla(${marble.hue}, 40%, 15%, 0.5)`;
        ctx.lineWidth = radius * 0.15;
        ctx.lineCap = 'round';
        ctx.stroke();
      } else {
        // 1. 회전 연동 다층 입체 코어 핵 (Dynamic Core Nucleus)
        const coreOffsetX = Math.cos(marble.angle) * radius * 0.12;
        const coreOffsetY = Math.sin(marble.angle) * radius * 0.12;
        ctx.beginPath();
        ctx.arc(coreOffsetX, coreOffsetY, radius * 0.28, 0, Math.PI * 2);
        const coreGrad = ctx.createRadialGradient(coreOffsetX, coreOffsetY, 0, coreOffsetX, coreOffsetY, radius * 0.28);
        coreGrad.addColorStop(0, `hsla(${marble.hue}, 100%, 98%, 0.9)`);
        coreGrad.addColorStop(0.6, `hsla(${marble.hue + 30}, 100%, 85%, 0.6)`);
        coreGrad.addColorStop(1, `hsla(${marble.hue}, 100%, 60%, 0)`);
        ctx.fillStyle = coreGrad;
        ctx.fill();

        // 2. 주 고굴절 입체 소용돌이 띠 (Primary Glass Ribbon)
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.62, 0.1 * Math.PI, 0.95 * Math.PI);
        ctx.strokeStyle = `hsla(${(marble.hue + 30) % 360}, 100%, 90%, 0.65)`;
        ctx.lineWidth = radius * 0.26;
        ctx.lineCap = 'round';
        ctx.stroke();

        // 3. 3D 패럴랙스 보조 대비 음영 띠 (Secondary Parallax Ribbon)
        ctx.beginPath();
        ctx.arc(
          Math.cos(-marble.angle * 0.5) * radius * 0.08,
          Math.sin(-marble.angle * 0.5) * radius * 0.08,
          radius * 0.44,
          1.1 * Math.PI,
          1.9 * Math.PI
        );
        ctx.strokeStyle = `hsla(${Math.abs(marble.hue - 40) % 360}, 100%, 32%, 0.55)`;
        ctx.lineWidth = radius * 0.2;
        ctx.lineCap = 'round';
        ctx.stroke();

        // 4. 외곽 미세 굴절 다이내믹 반사선 (Refractive Light Arc)
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.78, 1.35 * Math.PI, 1.75 * Math.PI);
        ctx.strokeStyle = `hsla(${marble.hue}, 100%, 98%, 0.45)`;
        ctx.lineWidth = radius * 0.14;
        ctx.lineCap = 'round';
        ctx.stroke();
      }
    });
  }

  private _renderSpecularHighlight(
    ctx: CanvasRenderingContext2D,
    marble: Marble,
    radius: number,
    lightX: number,
    lightY: number,
    impactFactor: number,
    style: MarbleStyle
  ): void {
    const glint = style === 'neon' ? 1 : style === 'metallic' ? 0.98 : Math.min(1, 0.92 + impactFactor * 0.08);
    const primaryGrad = ctx.createRadialGradient(
      lightX,
      lightY,
      0,
      lightX,
      lightY,
      radius * (0.52 + impactFactor * 0.1)
    );
    primaryGrad.addColorStop(0, `rgba(255, 255, 255, ${glint})`);
    primaryGrad.addColorStop(0.35, `rgba(255, 255, 255, ${0.45 + impactFactor * 0.2})`);
    primaryGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = primaryGrad;
    ctx.beginPath();
    ctx.arc(lightX, lightY, radius * (0.52 + impactFactor * 0.1), 0, Math.PI * 2);
    ctx.fill();

    // 대각선 반대편 보조 핀포인트 반사
    const subX = marble.x + radius * 0.32;
    const subY = marble.y + radius * 0.32;
    const secondaryGrad = ctx.createRadialGradient(subX, subY, 0, subX, subY, radius * 0.22);
    secondaryGrad.addColorStop(0, `rgba(255, 255, 255, ${Math.min(1, 0.65 + impactFactor * 0.25)})`);
    secondaryGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = secondaryGrad;
    ctx.beginPath();
    ctx.arc(subX, subY, radius * 0.22, 0, Math.PI * 2);
    ctx.fill();

    if (impactFactor > 0.1) {
      transformGuard(ctx, () => {
        ctx.translate(lightX, lightY);
        ctx.fillStyle = `rgba(255, 255, 255, ${impactFactor * 0.8})`;
        ctx.fillRect(-radius * 0.25, -radius * 0.03, radius * 0.5, radius * 0.06);
        ctx.fillRect(-radius * 0.03, -radius * 0.25, radius * 0.06, radius * 0.5);
      });
    }
  }

  private _renderRimReflection(
    ctx: CanvasRenderingContext2D,
    marble: Marble,
    radius: number,
    impactFactor: number,
    style: MarbleStyle
  ): void {
    const rimGrad = ctx.createRadialGradient(marble.x, marble.y, radius * 0.65, marble.x, marble.y, radius);
    rimGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
    if (style === 'neon') {
      rimGrad.addColorStop(0.6, `hsla(${marble.hue}, 100%, 75%, ${0.5 + impactFactor * 0.4})`);
      rimGrad.addColorStop(1, `hsla(${marble.hue}, 100%, 95%, 0.9)`);
    } else if (style === 'metallic') {
      rimGrad.addColorStop(0.75, `rgba(255, 255, 255, ${0.4 + impactFactor * 0.3})`);
      rimGrad.addColorStop(1, `hsla(${marble.hue}, 30%, 20%, 0.8)`);
    } else {
      rimGrad.addColorStop(0.75, `hsla(${marble.hue}, 100%, 85%, ${0.25 + impactFactor * 0.35})`);
      rimGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    }

    ctx.fillStyle = rimGrad;
    ctx.beginPath();
    ctx.arc(marble.x, marble.y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  private _drawName(ctx: CanvasRenderingContext2D, marble: Marble, zoom: number): void {
    transformGuard(ctx, () => {
      ctx.font = `bold 16px Pretendard, sans-serif`;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.92)';
      ctx.lineWidth = 4;
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 6;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
      ctx.translate(marble.x, marble.y + 0.32);
      ctx.scale(1 / zoom, 1 / zoom);
      ctx.strokeText(marble.name, 0, 0);
      ctx.fillText(marble.name, 0, 0);
    });
  }

  private _drawOutline(
    ctx: CanvasRenderingContext2D,
    marble: Marble,
    lineWidth: number,
    borderThemeColor: string
  ): void {
    ctx.beginPath();
    ctx.strokeStyle = borderThemeColor;
    ctx.lineWidth = lineWidth;
    ctx.arc(marble.x, marble.y, marble.size / 2, 0, Math.PI * 2);
    ctx.stroke();
  }
}
