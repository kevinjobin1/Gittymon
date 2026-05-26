/* ------------------------------------------------------------------ */
/*  5x5 Pixel Font Dictionary — used by GIF card generator            */
/* ------------------------------------------------------------------ */

export const BITMAPS: Record<string, string[]> = {
  'A':[" XXX ","X   X","XXXXX","X   X","X   X"],'B':["XXXX ","X   X","XXXX ","X   X","XXXX "],
  'C':[" XXXX","X    ","X    ","X    "," XXXX"],'D':["XXXX ","X   X","X   X","X   X","XXXX "],
  'E':["XXXXX","X    ","XXXX ","X    ","XXXXX"],'F':["XXXXX","X    ","XXXX ","X    ","X    "],
  'G':[" XXXX","X    ","X  XX","X   X"," XXXX"],'H':["X   X","X   X","XXXXX","X   X","X   X"],
  'I':[" XXX ","  X  ","  X  ","  X  "," XXX "],'J':["  XXX","    X","    X","X   X"," XXX "],
  'K':["X   X","X  X ","XXX  ","X  X ","X   X"],'L':["X    ","X    ","X    ","X    ","XXXXX"],
  'M':["X   X","XX XX","X X X","X   X","X   X"],'N':["X   X","XX  X","X X X","X  XX","X   X"],
  'O':[" XXX ","X   X","X   X","X   X"," XXX "],'P':["XXXX ","X   X","XXXX ","X    ","X    "],
  'Q':[" XXX ","X   X","X   X","X  XX"," XXXX"],'R':["XXXX ","X   X","XXXX ","X  X ","X   X"],
  'S':[" XXXX","X    "," XXX ","    X","XXXX "],'T':["XXXXX","  X  ","  X  ","  X  ","  X  "],
  'U':["X   X","X   X","X   X","X   X"," XXX "],'V':["X   X","X   X","X   X"," X X ","  X  "],
  'W':["X   X","X   X","X X X","XX XX","X   X"],'X':["X   X"," X X ","  X  "," X X ","X   X"],
  'Y':["X   X"," X X ","  X  ","  X  ","  X  "],'Z':["XXXXX","   X ","  X  "," X   ","XXXXX"],
  '0':[" XXX ","X  XX","X X X","XX  X"," XXX "],'1':["  X  "," XX  ","  X  ","  X  "," XXX "],
  '2':[" XXX ","X   X","  XX "," X   ","XXXXX"],'3':["XXXX ","    X"," XXX ","    X","XXXX "],
  '4':["X  X ","X  X ","XXXXX","   X ","   X "],'5':["XXXXX","X    ","XXXX ","    X","XXXX "],
  '6':[" XXXX","X    ","XXXX ","X   X","XXXX "],'7':["XXXXX","    X","   X ","  X  ","  X  "],
  '8':[" XXX ","X   X"," XXX ","X   X"," XXX "],'9':[" XXX ","X   X"," XXXX","    X"," XXX "],
  ' ':["     ","     ","     ","     ","     "],':':["     ","  X  ","     ","  X  ","     "],
  '@':[" XXX ","X  XX","X X X","X  X "," XXXX"],'-':["     ","     "," XXX ","     ","     "],
  '_':["     ","     ","     ","     ","XXXXX"],'.':["     ","     ","     ","  X  ","  X  "],
  '%':["X   X","   X ","  X  "," X   ","X   X"],'+':["     ","  X  "," XXX ","  X  ","     "],
  '*':[" X X ","  X  ","XXXXX","  X  "," X X "],'/':["    X","   X ","  X  "," X   ","X    "],
  '!':["  X  ","  X  ","  X  ","     ","  X  "],'?':[" XXX ","    X","  XX ","     ","  X  "],
  '[':["  XX ","  X  ","  X  ","  X  ","  XX "],']':[" XX  ","  X  ","  X  ","  X  "," XX  "],
  '|':["  X  ","  X  ","  X  ","  X  ","  X  "],
};

/* ------------------------------------------------------------------ */
/*  Pixel Canvas — framebuffer for GIF frame rendering                */
/* ------------------------------------------------------------------ */

export class PixelCanvas {
  width: number;
  height: number;
  pixels: Uint8Array;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.pixels = new Uint8Array(width * height);
  }

  setPixel(x: number, y: number, ci: number) {
    const cx = Math.floor(x), cy = Math.floor(y);
    if (cx >= 0 && cx < this.width && cy >= 0 && cy < this.height) this.pixels[cy * this.width + cx] = ci;
  }

  fillRect(x: number, y: number, w: number, h: number, ci: number) {
    const xS = Math.max(0, Math.floor(x)), xE = Math.min(this.width, Math.floor(x + w));
    const yS = Math.max(0, Math.floor(y)), yE = Math.min(this.height, Math.floor(y + h));
    for (let cy = yS; cy < yE; cy++) { const off = cy * this.width; for (let cx = xS; cx < xE; cx++) this.pixels[off + cx] = ci; }
  }

  drawRect(x: number, y: number, w: number, h: number, ci: number) {
    const x0 = Math.floor(x), y0 = Math.floor(y), w0 = Math.floor(w), h0 = Math.floor(h);
    for (let cx = x0; cx < x0 + w0; cx++) { this.setPixel(cx, y0, ci); this.setPixel(cx, y0 + h0 - 1, ci); }
    for (let cy = y0; cy < y0 + h0; cy++) { this.setPixel(x0, cy, ci); this.setPixel(x0 + w0 - 1, cy, ci); }
  }

  drawText(text: string, x: number, y: number, ci: number) {
    const upper = text.toUpperCase(); let cx = Math.floor(x); const sy = Math.floor(y);
    for (let i = 0; i < upper.length; i++) {
      const bm = BITMAPS[upper[i]] || BITMAPS[' '];
      for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) if (bm[r][c] === 'X') this.setPixel(cx + c, sy + r, ci);
      cx += 6;
    }
  }
}

/** Wrap text into lines of at most maxLen characters (for GIF frame). */
export function wrapTextToLength(text: string, maxLen: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length <= maxLen) cur = (cur + ' ' + w).trim();
    else { if (cur) lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines;
}
