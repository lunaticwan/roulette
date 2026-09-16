import { z } from 'zod';

/**
 * 당첨 범위 스키마 정의.
 */
export const winnerRangeSchema = z.object({
  start: z.number().int().min(0),
  end: z.number().int().min(0),
});

export type WinnerRange = z.infer<typeof winnerRangeSchema>;

/**
 * 옵션 설정 스키마 정의.
 */
export const marbleStyleSchema = z.enum(['glass', 'neon', 'metallic']).default('glass');
export type MarbleStyleType = z.infer<typeof marbleStyleSchema>;

export const optionsSchema = z.object({
  useSkills: z.boolean().default(true),
  soundEnabled: z.boolean().default(true),
  winnerRange: winnerRangeSchema.default({ start: 0, end: 0 }),
  autoRecording: z.boolean().default(true),
  marbleStyle: marbleStyleSchema,
});

export type OptionsType = z.infer<typeof optionsSchema>;

class Options implements OptionsType {
  useSkills: boolean = true;
  soundEnabled: boolean = true;
  /** 0-based, 양끝 포함. 1명 추첨은 start === end */
  winnerRange: WinnerRange = { start: 0, end: 0 };
  autoRecording: boolean = true;
  marbleStyle: MarbleStyleType = 'glass';

  /**
   * 입력된 옵션 데이터 검증 및 갱신.
   */
  update(data: Partial<OptionsType>): OptionsType {
    const validated = optionsSchema.partial().parse(data);
    Object.assign(this, validated);
    return this;
  }
}

const options = new Options();
export default options;
