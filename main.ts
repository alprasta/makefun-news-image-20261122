// "The World Today" — one-page newspaper front page summing up the world news
// of Sunday 22 November 2026. Node 22, standard library only, no network.
// Draws a 1024x1024 PNG with a hand-built 5x7 bitmap font and a hand-rolled
// PNG encoder, and writes it to $MAKEFUN_OUTPUT_DIR/entry.png (default /output).
// Fully deterministic: the same bytes on every run.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

// ---------------------------------------------------------------------------
// 5x7 bitmap font (uppercase only, plus digits and punctuation).
// Each glyph is 7 rows of 5 bits, written as strings of '1' and '0'.
// ---------------------------------------------------------------------------
const FONT = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01110', '10001', '10000', '10111', '10001', '10001', '01111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['01110', '00100', '00100', '00100', '00100', '00100', '01110'],
  J: ['00111', '00010', '00010', '00010', '00010', '10010', '01100'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '11011', '10001'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00110', '01000', '10000', '11111'],
  '3': ['11111', '00010', '00100', '00010', '00001', '10001', '01110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
  '.': ['00000', '00000', '00000', '00000', '00000', '01100', '01100'],
  ',': ['00000', '00000', '00000', '00000', '01100', '00100', '01000'],
  ':': ['00000', '01100', '01100', '00000', '01100', '01100', '00000'],
  ';': ['00000', '01100', '01100', '00000', '01100', '00100', '01000'],
  '!': ['00100', '00100', '00100', '00100', '00100', '00000', '00100'],
  '?': ['01110', '10001', '00001', '00110', '00100', '00000', '00100'],
  "'": ['00100', '00100', '01000', '00000', '00000', '00000', '00000'],
  '"': ['01010', '01010', '00000', '00000', '00000', '00000', '00000'],
  '-': ['00000', '00000', '00000', '01110', '00000', '00000', '00000'],
  '/': ['00001', '00010', '00010', '00100', '01000', '01000', '10000'],
  '(': ['00010', '00100', '01000', '01000', '01000', '00100', '00010'],
  ')': ['01000', '00100', '00010', '00010', '00010', '00100', '01000'],
  '&': ['01100', '10010', '10100', '01000', '10101', '10010', '01101'],
  '%': ['11001', '11010', '00010', '00100', '01000', '01011', '10011'],
  '+': ['00000', '00100', '00100', '11111', '00100', '00100', '00000'],
  '=': ['00000', '00000', '11111', '00000', '11111', '00000', '00000'],
  '*': ['00000', '00100', '10101', '01110', '10101', '00100', '00000'],
  '[': ['01110', '01000', '01000', '01000', '01000', '01000', '01110'],
  ']': ['01110', '00010', '00010', '00010', '00010', '00010', '01110'],
  '$': ['00100', '01111', '10100', '01110', '00101', '11110', '00100'],
};

// Width of one character cell at scale 1 (5 px glyph + 1 px gap).
const CHAR_W = 6;
const CHAR_H = 7;

// ---------------------------------------------------------------------------
// Minimal PNG encoder: 8-bit RGB, no interlace, filter 0 on every scanline.
// ---------------------------------------------------------------------------
const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

function encodePng(width, height, rgb) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type 2 = RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const raw = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 3)] = 0; // filter: none
    rgb.copy(raw, y * (1 + width * 3) + 1, y * width * 3, (y + 1) * width * 3);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// Canvas: an RGB pixel buffer with flat-shape drawing helpers.
// ---------------------------------------------------------------------------
const W = 1024;
const H = 1024;

const PAPER = [248, 244, 232]; // warm newsprint
const INK = [22, 22, 22]; // near-black
const RED = [163, 22, 33]; // masthead red
const NAVY = [22, 50, 79]; // deep navy
const TEAL = [14, 116, 110]; // teal accent
const GOLD = [191, 141, 26]; // gold accent
const SKY = [214, 232, 240]; // pale sky panel
const SAND = [238, 228, 203]; // panel sand
const WHITE = [255, 255, 255];
const GREY = [92, 92, 88];
const ORANGE = [224, 108, 24];
const GREEN = [46, 125, 50];

class Canvas {
  constructor() {
    this.buf = Buffer.alloc(W * H * 3);
    this.fill(PAPER);
  }
  fill(rgb) {
    for (let i = 0; i < W * H; i++) {
      this.buf[i * 3] = rgb[0];
      this.buf[i * 3 + 1] = rgb[1];
      this.buf[i * 3 + 2] = rgb[2];
    }
  }
  px(x, y, rgb) {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 3;
    this.buf[i] = rgb[0];
    this.buf[i + 1] = rgb[1];
    this.buf[i + 2] = rgb[2];
  }
  rect(x, y, w, h, rgb) {
    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x; xx < x + w; xx++) this.px(xx, yy, rgb);
    }
  }
  // Hollow rectangle, 1..t px thick border.
  frame(x, y, w, h, rgb, t = 1) {
    this.rect(x, y, w, t, rgb);
    this.rect(x, y + h - t, w, t, rgb);
    this.rect(x, y, t, h, rgb);
    this.rect(x + w - t, y, t, h, rgb);
  }
  // Bresenham line.
  line(x0, y0, x1, y1, rgb, t = 1) {
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    let x = x0;
    let y = y0;
    for (;;) {
      for (let a = 0; a < t; a++) for (let b = 0; b < t; b++) this.px(x + a, y + b, rgb);
      if (x === x1 && y === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x += sx; }
      if (e2 <= dx) { err += dx; y += sy; }
    }
  }
  // Filled circle.
  disc(cx, cy, r, rgb) {
    for (let y = -r; y <= r; y++) {
      const half = Math.floor(Math.sqrt(r * r - y * y));
      for (let x = -half; x <= half; x++) this.px(cx + x, cy + y, rgb);
    }
  }
  // Circle outline, 1 px.
  ring(cx, cy, r, rgb) {
    for (let a = 0; a < 360; a += 1) {
      const rad = (a * Math.PI) / 180;
      this.px(Math.round(cx + r * Math.cos(rad)), Math.round(cy + r * Math.sin(rad)), rgb);
    }
  }
  // Filled triangle.
  tri(x0, y0, x1, y1, x2, y2, rgb) {
    const minX = Math.min(x0, x1, x2);
    const maxX = Math.max(x0, x1, x2);
    const minY = Math.min(y0, y1, y2);
    const maxY = Math.max(y0, y1, y2);
    const d = (x1 - x0) * (y2 - y0) - (y1 - y0) * (x2 - x0);
    if (d === 0) return;
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const s = ((x1 - x0) * (y - y0) - (y1 - y0) * (x - x0)) / d;
        const t = ((x2 - x1) * (y - y1) - (y2 - y1) * (x - x1)) / d;
        if (s >= 0 && t >= 0 && s + t <= 1) this.px(x, y, rgb);
      }
    }
  }
  // Horizontal chord of a circle (used for globe latitude lines).
  chord(cx, cy, r, dy, rgb) {
    const half = Math.floor(Math.sqrt(Math.max(0, r * r - dy * dy)));
    for (let x = -half; x <= half; x++) this.px(cx + x, cy + dy, rgb);
  }
}

// ---------------------------------------------------------------------------
// Text: draw one glyph, one string, and word-wrapped paragraphs.
// All text is upper-cased first (the font is uppercase-only).
// ---------------------------------------------------------------------------
function textWidth(str, scale) {
  return str.length * CHAR_W * scale - scale;
}

function drawChar(cv, ch, x, y, scale, rgb) {
  const glyph = FONT[ch] || FONT['?'];
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 5; col++) {
      if (glyph[row][col] === '1') {
        cv.rect(x + col * scale, y + row * scale, scale, scale, rgb);
      }
    }
  }
}

function drawText(cv, str, x, y, scale, rgb) {
  const s = String(str).toUpperCase();
  for (let i = 0; i < s.length; i++) {
    drawChar(cv, s[i], x + i * CHAR_W * scale, y, scale, rgb);
  }
  return x + textWidth(s, scale);
}

// Centred text; returns the x where drawing started.
function drawTextCentred(cv, str, cx, y, scale, rgb) {
  const w = textWidth(String(str).toUpperCase(), scale);
  return drawText(cv, str, Math.round(cx - w / 2), y, scale, rgb);
}

// Wrap a string to lines of at most maxPx wide at the given scale.
function wrap(str, maxPx, scale) {
  const words = String(str).toUpperCase().split(' ');
  const lines = [];
  let cur = '';
  for (const word of words) {
    const trial = cur ? cur + ' ' + word : word;
    if (textWidth(trial, scale) <= maxPx) {
      cur = trial;
    } else {
      if (cur) lines.push(cur);
      cur = word;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

// Draw wrapped text; returns the y just below the last line.
function drawPara(cv, str, x, y, maxPx, scale, rgb, lineGap = 4) {
  const lines = wrap(str, maxPx, scale);
  const step = CHAR_H * scale + lineGap;
  for (let i = 0; i < lines.length; i++) {
    drawText(cv, lines[i], x, y + i * step, scale, rgb);
  }
  return y + lines.length * step;
}

// ---------------------------------------------------------------------------
// Pictograms: small flat scenes, one per story. Each draws inside the box
// (x, y, w, h) given; all coordinates are computed from the box so the
// drawing scales with the layout.
// ---------------------------------------------------------------------------

// Globe with heat waves: the warming planet (COP31 lead art).
function drawGlobe(cv, x, y, w, h) {
  const cx = x + Math.floor(w / 2);
  const cy = y + Math.floor(h / 2) + 6;
  const r = Math.min(w, h) / 2 - 14;
  cv.disc(cx, cy, r, [70, 130, 180]); // ocean
  cv.disc(cx, cy, r - 3, [96, 165, 205]);
  // land blobs (stylised continents)
  cv.disc(cx - Math.floor(r * 0.42), cy - Math.floor(r * 0.28), Math.floor(r * 0.34), GREEN);
  cv.disc(cx + Math.floor(r * 0.38), cy + Math.floor(r * 0.18), Math.floor(r * 0.30), GREEN);
  cv.disc(cx + Math.floor(r * 0.10), cy - Math.floor(r * 0.52), Math.floor(r * 0.20), GREEN);
  // latitude lines
  cv.chord(cx, cy, r - 4, -Math.floor(r * 0.55), [70, 130, 180]);
  cv.chord(cx, cy, r - 4, Math.floor(r * 0.55), [70, 130, 180]);
  // longitude ellipse (vertical)
  for (let a = -70; a <= 70; a += 2) {
    const rad = (a * Math.PI) / 180;
    cv.px(Math.round(cx + (r - 4) * 0.45 * Math.cos(rad)), Math.round(cy + (r - 4) * Math.sin(rad)), [70, 130, 180]);
    cv.px(Math.round(cx - (r - 4) * 0.45 * Math.cos(rad)), Math.round(cy + (r - 4) * Math.sin(rad)), [70, 130, 180]);
  }
  cv.ring(cx, cy, r, NAVY);
  cv.ring(cx, cy, r - 1, NAVY);
  // heat waves rising off the globe
  for (let i = 0; i < 3; i++) {
    const wx = cx - 46 + i * 46;
    cv.line(wx, y + 26, wx + 10, y + 12, ORANGE, 4);
    cv.line(wx + 10, y + 12, wx, y + 2, ORANGE, 4);
  }
  // thermometer at the side
  const tx = x + w - 26;
  const ty = y + h - 58;
  cv.rect(tx, ty - 34, 10, 40, WHITE);
  cv.frame(tx, ty - 34, 10, 40, INK, 2);
  cv.rect(tx + 2, ty - 26, 6, 30, RED);
  cv.disc(tx + 5, ty + 8, 9, RED);
  cv.disc(tx + 5, ty + 8, 5, [255, 120, 110]);
}

// Three flags side by side: US, China, Russia (Shenzhen summit).
function drawFlags(cv, x, y, w, h) {
  const fw = Math.floor((w - 16) / 3);
  const fh = Math.floor(h * 0.62);
  const fy = y + Math.floor((h - fh) / 2);
  // United States: stripes + canton
  const ux = x;
  for (let s = 0; s < 7; s++) {
    cv.rect(ux, fy + Math.floor((s * fh) / 7), fw, Math.floor(fh / 7) + 1, s % 2 === 0 ? RED : WHITE);
  }
  cv.rect(ux, fy, Math.floor(fw * 0.45), Math.floor(fh * 0.55), NAVY);
  cv.disc(ux + Math.floor(fw * 0.22), fy + Math.floor(fh * 0.27), 4, WHITE);
  // China: red field, yellow stars
  const cx = x + fw + 8;
  cv.rect(cx, fy, fw, fh, RED);
  cv.disc(cx + Math.floor(fw * 0.28), fy + Math.floor(fh * 0.28), 7, GOLD);
  cv.disc(cx + Math.floor(fw * 0.62), fy + Math.floor(fh * 0.20), 3, GOLD);
  cv.disc(cx + Math.floor(fw * 0.68), fy + Math.floor(fh * 0.42), 3, GOLD);
  cv.disc(cx + Math.floor(fw * 0.60), fy + Math.floor(fh * 0.62), 3, GOLD);
  // Russia: white / blue / red tricolour
  const rx = x + 2 * fw + 16;
  cv.rect(rx, fy, fw, Math.floor(fh / 3) + 1, WHITE);
  cv.rect(rx, fy + Math.floor(fh / 3), fw, Math.floor(fh / 3) + 1, [0, 57, 166]);
  cv.rect(rx, fy + Math.floor(2 * fh / 3), fw, Math.floor(fh / 3) + 1, RED);
  cv.frame(ux, fy, fw, fh, INK, 1);
  cv.frame(cx, fy, fw, fh, INK, 1);
  cv.frame(rx, fy, fw, fh, INK, 1);
}

// Cargo ship on fire in the Gulf of Finland.
function drawShipFire(cv, x, y, w, h) {
  const seaY = y + Math.floor(h * 0.72);
  cv.rect(x, seaY, w, h - Math.floor(h * 0.72), [70, 130, 180]);
  // hull
  cv.tri(x + 8, seaY - 26, x + w - 8, seaY - 26, x + w - 26, seaY + 2, [40, 40, 44]);
  cv.rect(x + 8, seaY - 26, w - 16, 10, [40, 40, 44]);
  // containers
  cv.rect(x + 22, seaY - 52, 30, 26, RED);
  cv.rect(x + 56, seaY - 52, 30, 26, GOLD);
  cv.rect(x + 90, seaY - 44, 30, 18, TEAL);
  // bridge tower
  cv.rect(x + w - 52, seaY - 58, 26, 32, WHITE);
  cv.frame(x + w - 52, seaY - 58, 26, 32, INK, 1);
  // flame + smoke (kept inside the picture box, below its top edge)
  cv.tri(x + 30, seaY - 52, x + 52, seaY - 52, x + 41, seaY - 60, ORANGE);
  cv.tri(x + 38, seaY - 52, x + 48, seaY - 52, x + 43, seaY - 58, [255, 200, 40]);
  cv.disc(x + 62, seaY - 58, 9, GREY);
  cv.disc(x + 84, seaY - 62, 10, [120, 120, 116]);
  cv.disc(x + 106, seaY - 56, 8, GREY);
  // waves
  for (let i = 0; i < 4; i++) {
    const wx = x + 6 + i * Math.floor(w / 4);
    cv.line(wx, seaY + 12, wx + 14, seaY + 12, WHITE, 2);
  }
}

// Night barrage: streaking missiles and a blast star over a skyline.
function drawBarrage(cv, x, y, w, h) {
  cv.rect(x, y, w, h, [18, 24, 48]); // night sky
  // stars
  const stars = [[14, 10], [52, 22], [96, 8], [150, 18], [196, 10], [240, 26], [30, 40], [120, 34], [210, 44]];
  for (const [sx, sy] of stars) cv.disc(x + sx, y + sy, 2, WHITE);
  // incoming streaks
  cv.line(x + 40, y + 12, x + 90, y + 58, ORANGE, 3);
  cv.line(x + 150, y + 8, x + 180, y + 52, [255, 200, 40], 3);
  cv.line(x + 220, y + 20, x + 250, y + 60, ORANGE, 3);
  // blast star
  const bx = x + Math.floor(w * 0.62);
  const by = y + Math.floor(h * 0.62);
  for (let a = 0; a < 8; a++) {
    const rad = (a * Math.PI) / 4;
    cv.line(bx, by, Math.round(bx + 34 * Math.cos(rad)), Math.round(by + 34 * Math.sin(rad)), [255, 200, 40], 4);
  }
  cv.disc(bx, by, 12, ORANGE);
  cv.disc(bx, by, 6, [255, 230, 120]);
  // skyline
  const base = y + h;
  cv.rect(x, base - 34, 52, 34, [10, 14, 30]);
  cv.rect(x + 60, base - 52, 44, 52, [10, 14, 30]);
  cv.rect(x + 112, base - 26, 60, 26, [10, 14, 30]);
  cv.rect(x + 180, base - 44, 48, 44, [10, 14, 30]);
  cv.rect(x + 236, base - 30, 52, 30, [10, 14, 30]);
  // lit windows
  for (let i = 0; i < 10; i++) {
    cv.rect(x + 8 + (i * 29) % 260, base - 22 - ((i * 17) % 24), 5, 6, [255, 200, 40]);
  }
}

// Andes mountains with a quake crack (all positions relative to the box).
function drawQuake(cv, x, y, w, h) {
  cv.rect(x, y, w, h, SKY);
  const gx = (f) => x + Math.round(f * w);
  const gy = (f) => y + Math.round(f * h);
  // mountains
  cv.tri(gx(0.02), gy(0.86), gx(0.32), gy(0.12), gx(0.62), gy(0.86), [90, 110, 130]);
  cv.tri(gx(0.42), gy(0.86), gx(0.70), gy(0.30), gx(0.98), gy(0.86), [70, 90, 112]);
  // snow caps
  cv.tri(gx(0.26), gy(0.24), gx(0.32), gy(0.12), gx(0.38), gy(0.24), WHITE);
  cv.tri(gx(0.65), gy(0.42), gx(0.70), gy(0.30), gx(0.75), gy(0.42), WHITE);
  // ground
  cv.rect(x, gy(0.86), w, h - Math.round(0.86 * h), [120, 150, 90]);
  // quake crack (zigzag rising from the ground)
  let cx = gx(0.46);
  let cy = gy(0.86);
  for (let i = 0; i < 5; i++) {
    const nx = cx + (i % 2 === 0 ? 11 : -11);
    const ny = cy - 11;
    cv.line(cx, cy, nx, ny, INK, 3);
    cx = nx;
    cy = ny;
  }
  // shaking lines
  cv.line(gx(0.10), gy(0.14), gx(0.17), gy(0.14), RED, 3);
  cv.line(gx(0.12), gy(0.24), gx(0.19), gy(0.24), RED, 3);
  cv.line(gx(0.83), gy(0.18), gx(0.90), gy(0.18), RED, 3);
}

// Oil tanker on waves with a small fire.
function drawTanker(cv, x, y, w, h) {
  cv.rect(x, y, w, h, SKY);
  const seaY = y + Math.floor(h * 0.68);
  cv.rect(x, seaY, w, h - Math.floor(h * 0.68), [70, 130, 180]);
  // tanker hull
  cv.rect(x + 14, seaY - 24, w - 28, 22, [30, 30, 34]);
  cv.tri(x + w - 14, seaY - 24, x + w - 2, seaY - 24, x + w - 14, seaY - 2, [30, 30, 34]);
  // deck tanks
  cv.rect(x + 30, seaY - 44, 44, 20, WHITE);
  cv.frame(x + 30, seaY - 44, 44, 20, INK, 1);
  cv.rect(x + 82, seaY - 44, 44, 20, WHITE);
  cv.frame(x + 82, seaY - 44, 44, 20, INK, 1);
  cv.rect(x + 134, seaY - 44, 44, 20, WHITE);
  cv.frame(x + 134, seaY - 44, 44, 20, INK, 1);
  // funnel + flame
  cv.rect(x + w - 48, seaY - 52, 22, 28, RED);
  cv.tri(x + w - 46, seaY - 52, x + w - 28, seaY - 52, x + w - 37, seaY - 76, ORANGE);
  cv.disc(x + w - 37, seaY - 82, 8, GREY);
  // waves
  for (let i = 0; i < 5; i++) {
    const wx = x + 4 + i * Math.floor(w / 5);
    cv.line(wx, seaY + 12, wx + 16, seaY + 12, WHITE, 2);
  }
}

// Bridge over a river (Nitish Setu).
function drawBridge(cv, x, y, w, h) {
  cv.rect(x, y, w, h, SKY);
  const riverY = y + Math.floor(h * 0.74);
  cv.rect(x, riverY, w, h - Math.floor(h * 0.74), [70, 130, 180]);
  // deck
  const deckY = y + Math.floor(h * 0.42);
  cv.rect(x, deckY, w, 8, INK);
  // arch
  for (let a = 0; a <= 180; a += 2) {
    const rad = (a * Math.PI) / 180;
    const ax = x + Math.floor(w / 2) + Math.floor((w / 2 - 10) * Math.cos(rad));
    const ay = deckY - Math.floor((h * 0.30) * Math.sin(rad));
    cv.rect(ax, ay, 4, 4, RED);
  }
  // pillars
  cv.rect(x + 26, deckY + 8, 10, riverY - deckY - 8, INK);
  cv.rect(x + Math.floor(w / 2) - 5, deckY + 8, 10, riverY - deckY - 8, INK);
  cv.rect(x + w - 36, deckY + 8, 10, riverY - deckY - 8, INK);
  // sun
  cv.disc(x + w - 34, y + 22, 12, GOLD);
  // birds
  cv.line(x + 20, y + 20, x + 28, y + 16, INK, 2);
  cv.line(x + 28, y + 16, x + 36, y + 20, INK, 2);
  cv.line(x + 44, y + 30, x + 52, y + 26, INK, 2);
  cv.line(x + 52, y + 26, x + 60, y + 30, INK, 2);
}

// Cricket: stumps, bat and ball.
function drawCricket(cv, x, y, w, h) {
  cv.rect(x, y, w, h, [200, 225, 170]); // outfield green
  // pitch strip
  cv.rect(x + Math.floor(w * 0.30), y, Math.floor(w * 0.40), h, SAND);
  // stumps
  const sx = x + Math.floor(w * 0.50) - 12;
  const sy = y + 18;
  for (let i = 0; i < 3; i++) cv.rect(sx + i * 9, sy, 5, 34, GOLD);
  cv.rect(sx - 2, sy - 4, 30, 4, GOLD);
  // bat leaning
  cv.line(x + Math.floor(w * 0.30) + 8, y + h - 14, x + Math.floor(w * 0.30) + 34, y + h - 66, [150, 100, 50], 7);
  // ball
  cv.disc(x + Math.floor(w * 0.68), y + h - 26, 11, RED);
  cv.disc(x + Math.floor(w * 0.68) - 3, y + h - 29, 3, WHITE);
  // boundary rope
  cv.line(x + 6, y + h - 8, x + w - 6, y + h - 8, WHITE, 3);
}

// ---------------------------------------------------------------------------
// Layout: a newspaper front page, 1024 x 1024.
// ---------------------------------------------------------------------------
const M = 28; // outer margin
const CONTENT_W = W - 2 * M;

function rule(cv, y, rgb, t = 2) {
  cv.rect(M, y, CONTENT_W, t, rgb);
}

function kicker(cv, text, x, y, scale, rgb) {
  drawText(cv, text, x, y, scale, rgb);
}

// One of the three middle cards: header bar, picture, headline, deck.
function storyCard(cv, x, y, w, h, accent, kick, pic, headline, deck) {
  cv.frame(x, y, w, h, INK, 1);
  cv.rect(x, y, w, 26, accent);
  drawText(cv, kick, x + 10, y + 6, 2, WHITE);
  pic(cv, x + 8, y + 34, w - 16, 100);
  const hx = x + 10;
  const hy = y + 142;
  drawPara(cv, headline, hx, hy, w - 20, 3, INK, 4);
  drawPara(cv, deck, hx, hy + 52, w - 20, 2, INK, 4);
}

// One of the four bottom columns: kicker, picture, headline, deck.
function miniStory(cv, x, y, w, kick, pic, headline, deck) {
  drawText(cv, kick, x, y, 2, RED);
  pic(cv, x, y + 18, w, 76);
  drawPara(cv, headline, x, y + 100, w, 2, INK, 3);
  drawPara(cv, deck, x, y + 100 + 40, w, 2, GREY, 3);
}

function buildPage() {
  const cv = new Canvas();

  // ---- Masthead ----
  drawTextCentred(cv, 'THE WORLD TODAY', W / 2, 16, 7, INK);
  cv.rect(M, 74, CONTENT_W, 4, RED);
  drawTextCentred(cv, 'SUNDAY, 22 NOVEMBER 2026', W / 2, 86, 3, RED);
  cv.rect(M, 116, CONTENT_W, 2, INK);

  // ---- Lead story: COP31 deadlock ----
  const leadY = 128;
  const leadX = M;
  const leadW = 588;
  kicker(cv, 'CLIMATE - ANTALYA, TURKEY', leadX, leadY + 4, 2, RED);
  drawText(cv, 'CLIMATE TALKS', leadX, leadY + 28, 6, INK);
  drawText(cv, 'DEADLOCKED', leadX, leadY + 74, 6, INK);
  let dy = drawPara(
    cv,
    'COP31 runs deep into overtime in Antalya. The draft deal drops every mention of fossil fuels and the $120bn climate-finance target.',
    leadX, leadY + 132, leadW, 2, INK, 4);
  dy = drawPara(
    cv,
    "EU: 'A good deal or no deal.' Nearly 200 nations still divided.",
    leadX, dy + 8, leadW, 2, INK, 4);
  drawText(cv, '200 NATIONS, 0 MENTIONS OF FOSSIL FUELS', leadX, leadY + 246, 2, RED);

  // ---- Lead art: the warming globe ----
  const artX = 632;
  const artY = leadY;
  const artW = W - M - artX; // 364
  const artH = 272;
  cv.frame(artX, artY, artW, artH, INK, 2);
  cv.rect(artX + 2, artY + 2, artW - 4, artH - 4, SAND);
  drawGlobe(cv, artX + 8, artY + 8, artW - 16, 226);
  drawTextCentred(cv, 'A WARMING WORLD WAITS', artX + artW / 2, artY + artH - 26, 2, INK);

  rule(cv, 414, INK, 2);

  // ---- Three middle stories ----
  const cardsY = 428;
  const cardsH = 258;
  const cardW = Math.floor((CONTENT_W - 32) / 3);
  storyCard(cv, M, cardsY, cardW, cardsH, NAVY, 'DIPLOMACY - SHENZHEN',
    drawFlags, 'SUMMIT IN SHENZHEN',
    'Trump reaches the APEC host city for talks with Xi and Putin.');
  storyCard(cv, M + cardW + 16, cardsY, cardW, cardsH, RED, 'BALTIC - GULF OF FINLAND',
    drawShipFire, 'DRONES HIT RUSSIAN SHIP',
    'Sparta II ablaze in the Gulf of Finland; Finland alerts NATO.');
  storyCard(cv, M + 2 * cardW + 32, cardsY, cardW, cardsH, [40, 40, 44], 'WAR - UKRAINE',
    drawBarrage, '400 DRONES, 110 MISSILES',
    "Russia's barrage hits Kryvyi Rih; debris falls in Poland.");

  rule(cv, 698, INK, 2);

  // ---- Four bottom stories ----
  const miniY = 712;
  const miniW = Math.floor((CONTENT_W - 36) / 4);
  miniStory(cv, M, miniY, miniW, 'PERU', drawQuake, 'QUAKE 6.9 SHAKES PERU',
    'Andes tremor felt in Lima; no casualties.');
  miniStory(cv, M + miniW + 12, miniY, miniW, 'GULF', drawTanker, 'TANKERS HIT OFF OMAN',
    'ADNOC vessel attacked; one crewman missing.');
  miniStory(cv, M + 2 * miniW + 24, miniY, miniW, 'INDIA', drawBridge, 'MODI OPENS NITISH SETU',
    'Bridge joins Patna, Vaishali; cyclone cancels flights.');
  miniStory(cv, M + 3 * miniW + 36, miniY, miniW, 'SPORT', drawCricket, 'AUSTRALIA ENDS STREAK',
    "Hosts end England's seven-match T20 run.");

  // ---- Footer: the rest of the day ----
  const footY = 916;
  cv.rect(0, footY, W, H - footY, NAVY);
  drawText(cv, 'ALSO TODAY -', M, footY + 12, 2, GOLD);
  drawPara(cv,
    'Basra fire kills 4 - FBI probes hack of crime database - Bolsonaro in ICU - Mexico cartel violence kills 11 - Estonia to shut Russia border',
    M, footY + 34, CONTENT_W, 2, WHITE, 4);
  drawText(cv, 'ALSO: FRANCE AND US DRAFT UN PLAN FOR LEBANON - SOURCES: REUTERS, AP, BBC',
    M, footY + 72, 2, [180, 200, 220]);

  return cv;
}

function main() {
  const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';
  mkdirSync(outDir, { recursive: true });
  const page = buildPage();
  const png = encodePng(W, H, page.buf);
  writeFileSync(join(outDir, 'entry.png'), png);
}

main();
