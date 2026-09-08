/**
 * PHASE 3 — School logo storage (local disk under uploads/, git-ignored).
 *
 * Validates type by content (magic bytes) not just the declared mime:
 *   PNG / JPG / WEBP via magic bytes; SVG via content whitelist (no script,
 *   no event handlers, no foreign content, no javascript: links).
 * Files are addressed by school id so replacement is atomic (write tmp,
 * swap, delete old).
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { ApiError } from '../utils/apiResponse';

const DIR = path.join(process.cwd(), 'uploads', 'school-logos');
export const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2 MB

const MAGIC: Array<{ ext: string; test: (b: Buffer) => boolean }> = [
  { ext: 'png', test: (b) => b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { ext: 'jpg', test: (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: 'webp', test: (b) => b.length > 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP' },
];

function isSafeSvg(text: string): boolean {
  const lower = text.toLowerCase();
  if (!lower.includes('<svg')) return false;
  if (/<script|javascript:|on\w+\s*=|<foreignobject|<iframe|<object|<embed/i.test(lower)) return false;
  return true;
}

export function detectImage(buffer: Buffer): { ext: string } | null {
  if (!buffer.length) return null;
  for (const m of MAGIC) if (m.test(buffer)) return { ext: m.ext };
  const head = buffer.subarray(0, 4096).toString('utf8').trimStart();
  if (head.startsWith('<?xml') || head.startsWith('<svg')) {
    return isSafeSvg(buffer.subarray(0, 64 * 1024).toString('utf8')) ? { ext: 'svg' } : null;
  }
  return null;
}

export function logoPathFor(schoolId: number, ext: string): string {
  return path.join(DIR, `${schoolId}.${ext}`);
}

export async function saveLogo(schoolId: number, buffer: Buffer): Promise<{ ext: string; bytes: number }> {
  if (buffer.length === 0) throw ApiError.badRequest('Empty file');
  if (buffer.length > MAX_LOGO_BYTES) throw ApiError.badRequest('Logo must be 2 MB or smaller');
  const detected = detectImage(buffer);
  if (!detected) {
    throw ApiError.badRequest('Unsupported file type. Allowed: PNG, JPG/JPEG, WEBP or a safe SVG.');
  }

  fs.mkdirSync(DIR, { recursive: true });

  // write to a temp name first, then swap — atomic replace
  const tmp = path.join(DIR, `.tmp-${crypto.randomBytes(6).toString('hex')}`);
  fs.writeFileSync(tmp, buffer);

  // remove any previous logo of this school (any extension)
  for (const f of fs.readdirSync(DIR)) {
    if (f.startsWith(`${schoolId}.`)) fs.unlinkSync(path.join(DIR, f));
  }
  const finalPath = logoPathFor(schoolId, detected.ext);
  fs.renameSync(tmp, finalPath);
  return { ext: detected.ext, bytes: buffer.length };
}

export function readLogo(schoolId: number, ext: string): Buffer | null {
  const p = logoPathFor(schoolId, ext);
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p);
}

export function deleteLogo(schoolId: number): void {
  fs.mkdirSync(DIR, { recursive: true });
  for (const f of fs.readdirSync(DIR)) {
    if (f.startsWith(`${schoolId}.`)) {
      try { fs.unlinkSync(path.join(DIR, f)); } catch { /* ignore */ }
    }
  }
}

export const LOGO_CONTENT_TYPE: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  webp: 'image/webp',
  svg: 'image/svg+xml',
};
