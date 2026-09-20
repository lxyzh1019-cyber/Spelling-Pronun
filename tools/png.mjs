// Just enough PNG to resize an icon, written against node:zlib so the project gains no dependency.
//
// It exists because the headless browser clamps how small a window it will open, so it cannot
// screenshot a 180px icon directly. The 512 render is the source of truth and every smaller size is
// this file's box-filter average of it — which is also why the sizes cannot drift apart.

import { crc32 } from 'node:zlib';
import { deflateSync, inflateSync } from 'node:zlib';

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const CHANNELS = { 0: 1, 2: 3, 4: 2, 6: 4 };

function chunks(buffer) {
  const out = [];
  let at = 8;
  while (at < buffer.length) {
    const length = buffer.readUInt32BE(at);
    out.push({ type: buffer.toString('ascii', at + 4, at + 8), data: buffer.subarray(at + 8, at + 8 + length) });
    at += length + 12;
  }
  return out;
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

// Returns { width, height, pixels } with pixels as RGBA bytes.
export function decodePng(buffer) {
  if (!buffer.subarray(0, 8).equals(SIGNATURE)) throw new Error('not a PNG');
  const parts = chunks(buffer);
  const ihdr = parts.find((chunk) => chunk.type === 'IHDR').data;
  const width = ihdr.readUInt32BE(0);
  const height = ihdr.readUInt32BE(4);
  const depth = ihdr[8];
  const colorType = ihdr[9];
  const interlace = ihdr[12];
  if (depth !== 8 || interlace !== 0 || !(colorType in CHANNELS)) {
    throw new Error(`unsupported PNG: depth ${depth}, colour type ${colorType}, interlace ${interlace}`);
  }
  const channels = CHANNELS[colorType];
  const raw = inflateSync(Buffer.concat(parts.filter((chunk) => chunk.type === 'IDAT').map((chunk) => chunk.data)));
  const stride = width * channels;
  const lines = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (stride + 1)];
    const source = raw.subarray(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride);
    const line = lines.subarray(y * stride, (y + 1) * stride);
    const prior = y ? lines.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x += 1) {
      const left = x >= channels ? line[x - channels] : 0;
      const up = prior ? prior[x] : 0;
      const corner = prior && x >= channels ? prior[x - channels] : 0;
      const value = source[x];
      if (filter === 0) line[x] = value;
      else if (filter === 1) line[x] = (value + left) & 0xff;
      else if (filter === 2) line[x] = (value + up) & 0xff;
      else if (filter === 3) line[x] = (value + ((left + up) >> 1)) & 0xff;
      else if (filter === 4) line[x] = (value + paeth(left, up, corner)) & 0xff;
      else throw new Error(`unknown PNG filter ${filter}`);
    }
  }
  const pixels = Buffer.alloc(width * height * 4);
  for (let index = 0; index < width * height; index += 1) {
    const from = index * channels;
    const to = index * 4;
    if (channels >= 3) {
      pixels[to] = lines[from];
      pixels[to + 1] = lines[from + 1];
      pixels[to + 2] = lines[from + 2];
      pixels[to + 3] = channels === 4 ? lines[from + 3] : 255;
    } else {
      pixels[to] = pixels[to + 1] = pixels[to + 2] = lines[from];
      pixels[to + 3] = channels === 2 ? lines[from + 1] : 255;
    }
  }
  return { width, height, pixels };
}

// A plain box filter. The artwork is flat colour with hard edges, so averaging the source square is
// both what a browser would do and enough.
export function resize(image, size) {
  const out = Buffer.alloc(size * size * 4);
  const scale = image.width / size;
  for (let y = 0; y < size; y += 1) {
    const top = Math.floor(y * scale);
    const bottom = Math.max(top + 1, Math.floor((y + 1) * scale));
    for (let x = 0; x < size; x += 1) {
      const left = Math.floor(x * scale);
      const right = Math.max(left + 1, Math.floor((x + 1) * scale));
      const totals = [0, 0, 0, 0];
      let count = 0;
      for (let sy = top; sy < bottom && sy < image.height; sy += 1) {
        for (let sx = left; sx < right && sx < image.width; sx += 1) {
          const at = (sy * image.width + sx) * 4;
          for (let channel = 0; channel < 4; channel += 1) totals[channel] += image.pixels[at + channel];
          count += 1;
        }
      }
      const at = (y * size + x) * 4;
      for (let channel = 0; channel < 4; channel += 1) out[at + channel] = Math.round(totals[channel] / count);
    }
  }
  return { width: size, height: size, pixels: out };
}

function chunk(type, data) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, 'ascii');
  const body = Buffer.concat([head.subarray(4), data]);
  const tail = Buffer.alloc(4);
  tail.writeUInt32BE(crc32(body) >>> 0, 0);
  return Buffer.concat([head.subarray(0, 4), body, tail]);
}

// Written as RGB, with no alpha channel at all: iOS ignores transparency on a home-screen icon and
// composites whatever is behind it on black, so an opaque file is the only honest one.
export function encodePng({ width, height, pixels }) {
  const stride = width * 3;
  const raw = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    for (let x = 0; x < width; x += 1) {
      const from = (y * width + x) * 4;
      const to = y * (stride + 1) + 1 + x * 3;
      raw[to] = pixels[from];
      raw[to + 1] = pixels[from + 1];
      raw[to + 2] = pixels[from + 2];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    SIGNATURE,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
