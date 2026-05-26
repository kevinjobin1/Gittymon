import type { MonType } from './types';

/**
 * Pixel-art sprite data for all four Gittymon types.
 * Each frame is a 2D grid of characters:
 *   ' ' = transparent
 *   'X' = body color
 *   'A' = highlight
 *   'S' = shadow
 *   'P' = accent (belly/trim)
 *   'O' = white (eye white)
 *   'E' = pupil (dark)
 */
export const SPRITES: Record<MonType, { f1: string[]; f2: string[] }> = {
  trex: {
    f1: [
      '       AAAAAAA     ',
      '      AAXXAAXXAA   ',
      '     AAXXXXAXXOXA  ',
      '     AAXXXXEAXXAA  ',
      '     AAXXXXXXXXX   ',
      '      AAASSSS      ',
      'SS   AAXXXXXXS     ',
      'SSS AAXPPPPXXSS    ',
      'SSSSAXPPPPPXXS     ',
      ' SSSXPPPPPPXSS     ',
      '  SSXXXXXXXXS      ',
      '   SXXXXSXXS       ',
      '   SSS  SSSSS      ',
    ],
    f2: [
      '       AAAAAAA     ',
      '      AAXXAAXXAA   ',
      '     AAXXXXAXXOXA  ',
      '     AAXXXXEAXXAA  ',
      '     AAXXXXXXXXX   ',
      '      AAASSSS      ',
      'SS   AAXXXXXXS     ',
      'SSS AAXPPPPXXSS    ',
      'SSSSAXPPPPPXXS     ',
      ' SSSXPPPPPPXSS     ',
      '  SSXXXXXXXXS      ',
      '   SSXS  SXXS      ',
      '         SSSSS     ',
    ],
  },
  slime: {
    f1: [
      '     AAAAAAA     ',
      '   AAAAXXXXXAAA  ',
      '  AAXXXXAXXXXXXA ',
      ' AAXXOXXAXXOXXXXA',
      ' AAXEOXXAXXEOXXXA',
      ' AAXXXXXAAXXXXSSA',
      ' AAXXSSSSXXXXSSSA',
      '  ASSSSSSSSSSSSA ',
      '   SSSSSSSSSSS   ',
    ],
    f2: [
      '                 ',
      '   AAAAAAA       ',
      '  AAXXXXXXAAA    ',
      ' AAXXOXXAXXOXXXXA',
      ' AAXEOXXAXXEOXXXA',
      ' AAXXSSAAXXSXXSSA',
      '  ASSSSSSSSSSSSA ',
      '   SSSSSSSSSSS   ',
    ],
  },
  octo: {
    f1: [
      '     AAAAAAA     ',
      '   AAXXXXXXXAAA  ',
      '  AAXXXXAXXXXXXA ',
      ' AAXXOXXAXXOXXXXA',
      ' AAXEOXXAXXEOXXXA',
      ' AAXXXXXAAXXXXXSA',
      '  SSXSSXSSXSSXS  ',
      '  SS SP SP SP S  ',
    ],
    f2: [
      '     AAAAAAA     ',
      '   AAXXXXXXXAAA  ',
      '  AAXXXXAXXXXXXA ',
      ' AAXXOXXAXXOXXXXA',
      ' AAXEOXXAXXEOXXXA',
      ' AAXXXXXAAXXXXXSA',
      '   SSXSSXSSXSS   ',
      '   SP SP SP SP   ',
    ],
  },
  bat: {
    f1: [
      'A           A',
      'AA   AAA   AA',
      'AXAAXAXAXAAXA',
      'SXXXXXXXXXXXS',
      ' SSXXOEXOXXS ',
      '  PXXXXXXXP  ',
      ' P  SSSSS  P ',
      '     SSS     ',
    ],
    f2: [
      '  PXXXXXXXP  ',
      ' P  SSSSS  P ',
      '     SSS     ',
      'A           A',
      'AA   AAA   AA',
      'AXAAXAXAXAAXA',
      'SXXXXXXXXXXXS',
      ' SSXXOEXOXXS ',
    ],
  },
};

/** Get the two frames for a given monster type and frame index */
export function getSpriteFrames(type: MonType, frame: number): string[] {
  const s = SPRITES[type];
  return frame === 0 ? s.f1 : s.f2;
}
