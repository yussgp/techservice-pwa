/**
 * Generador reproducible de iconos PNG para TechService PWA.
 * Sin dependencias: rasteriza el logo con supersampling y escribe PNG RGBA.
 *
 * Uso: node scripts/generate-icons.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '..', 'public', 'icons');

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function encodePng(width, height, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

function mix(a, b, t) {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t
  ];
}

function insideRoundedRect(x, y, inset, radius) {
  const left = inset;
  const top = inset;
  const right = 1 - inset;
  const bottom = 1 - inset;
  if (x < left || x > right || y < top || y > bottom) return false;

  const r = radius;
  const cx = Math.min(Math.max(x, left + r), right - r);
  const cy = Math.min(Math.max(y, top + r), bottom - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}

function distanceToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSq = dx * dx + dy * dy;
  let t = ((px - x1) * dx + (py - y1) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));
  const cx = x1 + t * dx;
  const cy = y1 + t * dy;
  return Math.hypot(px - cx, py - cy);
}

function angularDistance(a, b) {
  let diff = Math.abs(a - b) % (Math.PI * 2);
  if (diff > Math.PI) diff = Math.PI * 2 - diff;
  return diff;
}

function insideWrench(x, y) {
  const headX = 0.405;
  const headY = 0.405;
  const outer = 0.152;
  const inner = 0.079;
  const gapAngle = Math.atan2(-1, -1);
  const gapHalf = 0.46;

  const dx = x - headX;
  const dy = y - headY;
  const distance = Math.hypot(dx, dy);

  if (distance >= inner && distance <= outer) {
    const angle = Math.atan2(dy, dx);
    if (angularDistance(angle, gapAngle) > gapHalf) return true;
  }

  // Mango redondeado desde el borde del cabezal hacia abajo-derecha.
  const handleDistance = distanceToSegment(x, y, 0.475, 0.475, 0.725, 0.725);
  if (handleDistance <= 0.052) return true;

  return false;
}

function renderIcon(size, { maskable = false } = {}) {
  const buffer = Buffer.alloc(size * size * 4);
  const samples = 4;
  const scale = maskable ? 0.8 : 1;

  const bgTop = [23, 50, 77];
  const bgBottom = [9, 24, 39];
  const blueTop = [59, 130, 246];
  const blueBottom = [37, 99, 235];
  const white = [248, 250, 252];

  for (let py = 0; py < size; py += 1) {
    for (let px = 0; px < size; px += 1) {
      let r = 0;
      let g = 0;
      let b = 0;

      for (let sy = 0; sy < samples; sy += 1) {
        for (let sx = 0; sx < samples; sx += 1) {
          const x = (px + (sx + 0.5) / samples) / size;
          const y = (py + (sy + 0.5) / samples) / size;

          // Coordenada para el logo (se encoge en la variante maskable).
          const lx = (x - 0.5) / scale + 0.5;
          const ly = (y - 0.5) / scale + 0.5;

          let color = mix(bgTop, bgBottom, y);

          if (insideRoundedRect(lx, ly, 0.13, 0.17)) {
            color = mix(blueTop, blueBottom, ly);
            // Brillo sutil en la esquina superior.
            if (lx < 0.38 && ly < 0.38) color = mix(color, [96, 165, 250], 0.12);
          }

          if (insideWrench(lx, ly)) color = white;

          // Pequeño punto de acento inferior derecho.
          if (Math.hypot(lx - 0.79, ly - 0.79) < 0.023) color = [147, 197, 253];

          r += color[0];
          g += color[1];
          b += color[2];
        }
      }

      const total = samples * samples;
      const index = (py * size + px) * 4;
      buffer[index] = Math.round(r / total);
      buffer[index + 1] = Math.round(g / total);
      buffer[index + 2] = Math.round(b / total);
      buffer[index + 3] = 255;
    }
  }

  return encodePng(size, size, buffer);
}

fs.mkdirSync(OUT_DIR, { recursive: true });

const outputs = [
  ['icon-192.png', 192, { maskable: false }],
  ['icon-512.png', 512, { maskable: false }],
  ['icon-maskable-512.png', 512, { maskable: true }],
  ['apple-touch-icon.png', 180, { maskable: false }],
  ['favicon-32.png', 32, { maskable: false }]
];

for (const [file, size, options] of outputs) {
  const png = renderIcon(size, options);
  fs.writeFileSync(path.join(OUT_DIR, file), png);
  console.log(`Generado icons/${file} (${size}x${size}, ${png.length} bytes)`);
}
