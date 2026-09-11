import type { Marble } from './marble';
import type { WinnerRange } from './options';
import type { RenderParameters } from './rouletteRenderer';
import { getText } from './localization';
import type { Rect } from './types/rect.type';
import type { MouseEventArgs, UIObject } from './UIObject';
import { bound } from './utils/bound.decorator';

/**
 * 실시간 순위 리스트 UI 렌더러
 * 우측 상단 순위표 표시, 마우스 휠 스크롤 및 더블클릭 클립보드 복사 기능 지원
 */
export class RankRenderer implements UIObject {
  private _currentY = 0;
  private _targetY = 0;
  private fontHeight = 16;
  private _userMoved = 0;
  private _currentWinner = -1;
  private maxY = 0;
  private winners: Marble[] = [];
  private marbles: Marble[] = [];
  private winnerRange: WinnerRange = { start: 0, end: 0 };
  private messageHandler?: (msg: string) => void;

  /** 마우스 휠 조작 시 순위표 위치 스크롤 */
  private julesLog(eventName: string, data?: unknown) {
    try {
      console.log(`[Jules Log] [RankRenderer] [${eventName}]`, JSON.parse(JSON.stringify(data ?? {})));
    } catch {
      console.log(`[Jules Log] [RankRenderer] [${eventName}]`, data);
    }
  }

  @bound
  onWheel(e: WheelEvent) {
    this._targetY += e.deltaY;
    if (this._targetY > this.maxY) {
      this._targetY = this.maxY;
    }
    this._userMoved = 2000;
    this.julesLog('onWheel', { deltaY: e.deltaY, targetY: this._targetY, maxY: this.maxY });
  }

  /** 더블 클릭 시 현재 순위표 결과 TSV 형식 클립보드 복사 */
  @bound
  onDblClick(e?: MouseEventArgs) {
    if (e) {
      this.julesLog('onDblClick', {
        mouseEventArgs: e,
        winnersCount: this.winners.length,
        marblesCount: this.marbles.length,
      });
      if (navigator.clipboard) {
        const tsv: string[] = [];
        let rank = 0;
        tsv.push(
          ...[...this.winners, ...this.marbles].map((m) => {
            rank++;
            return [rank.toString(), m.name, this.isWinningRank(rank - 1) ? '☆' : ''].join('\t');
          })
        );

        tsv.unshift([getText('Rank'), getText('Name'), getText('Winner')].join('\t'));

        navigator.clipboard.writeText(tsv.join('\n')).then(() => {
          if (this.messageHandler) {
            this.messageHandler(getText('The result has been copied'));
          }
        });
      }
    }
  }

  /** 해당 순위가 당첨 범위에 속하는지 여부 확인 */
  private isWinningRank(rank: number) {
    return rank >= this.winnerRange.start && rank <= this.winnerRange.end;
  }

  /** 알림 메시지 이벤트 콜백 등록 */
  onMessage(func: (msg: string) => void) {
    this.messageHandler = func;
  }

  /** 순위 목록 및 당첨 밴드 렌더링 */
  render(
    ctx: CanvasRenderingContext2D,
    { winners, marbles, winnerRange, theme }: RenderParameters,
    width: number,
    height: number
  ) {
    const startX = width - 5;
    const startY = Math.max(-this.fontHeight, this._currentY - height / 2);
    this.maxY = Math.max(0, (marbles.length + winners.length) * this.fontHeight + this.fontHeight);
    this._currentWinner = winners.length;

    this.winners = winners;
    this.marbles = marbles;
    this.winnerRange = winnerRange;

    ctx.save();
    ctx.textAlign = 'right';
    ctx.font = '10pt Pretendard, sans-serif';
    ctx.fillStyle = '#666';
    ctx.fillText(`${winners.length} / ${winners.length + marbles.length}`, width - 5, this.fontHeight);

    ctx.beginPath();
    ctx.rect(width - 150, this.fontHeight + 2, width, this.maxY);
    ctx.clip();

    ctx.translate(0, -startY);

    if (winnerRange.end > winnerRange.start) {
      ctx.fillStyle = 'rgba(255, 215, 0, 0.15)';
      const bandY = winnerRange.start * this.fontHeight + this.fontHeight / 2;
      const bandH = (winnerRange.end - winnerRange.start + 1) * this.fontHeight;
      ctx.fillRect(width - 150, bandY, 150, bandH);
      ctx.fillStyle = 'rgba(255, 215, 0, 0.8)';
      ctx.fillRect(width - 150, bandY, 3, bandH);
    }

    ctx.font = 'bold 11pt Pretendard, sans-serif';
    if (theme.rankStroke) {
      ctx.lineWidth = 2;
      ctx.strokeStyle = theme.rankStroke;
    }
    winners.forEach((marble: { hue: number; name: string }, rank: number) => {
      const y = rank * this.fontHeight;
      if (y >= startY && y <= startY + height) {
        ctx.fillStyle = `hsl(${marble.hue} 100% ${theme.marbleLightness}`;
        ctx.strokeText(`${this.isWinningRank(rank) ? '☆' : '\u2714'} ${marble.name} #${rank + 1}`, startX, 20 + y);
        ctx.fillText(`${this.isWinningRank(rank) ? '☆' : '\u2714'} ${marble.name} #${rank + 1}`, startX, 20 + y);
      }
    });
    ctx.font = '10pt Pretendard, sans-serif';
    marbles.forEach((marble: { hue: number; name: string }, rank: number) => {
      const y = (rank + winners.length) * this.fontHeight;
      if (y >= startY && y <= startY + height) {
        ctx.fillStyle = `hsl(${marble.hue} 100% ${theme.marbleLightness}`;
        ctx.strokeText(`${marble.name} #${rank + 1 + winners.length}`, startX, 20 + y);
        ctx.fillText(`${marble.name} #${rank + 1 + winners.length}`, startX, 20 + y);
      }
    });
    ctx.restore();
  }

  /** 수동 스크롤 미동작 시 선두 구슬 추적 순위 위치 자동 보간 이동 */
  update(deltaTime: number) {
    if (this._currentWinner === -1) {
      return;
    }
    if (this._userMoved > 0) {
      this._userMoved -= deltaTime;
    } else {
      this._targetY = this._currentWinner * this.fontHeight + this.fontHeight;
    }
    if (this._currentY !== this._targetY) {
      this._currentY += (this._targetY - this._currentY) * (deltaTime / 250);
    }
    if (Math.abs(this._currentY - this._targetY) < 1) {
      this._currentY = this._targetY;
    }
  }

  getBoundingBox(): Rect | null {
    return null;
  }
}
