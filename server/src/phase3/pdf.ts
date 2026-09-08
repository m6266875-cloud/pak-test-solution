/**
 * PHASE 3 — A4 PDF generation for generated papers (server side).
 *
 * Renders the same document model the on-screen preview uses (sections per
 * question type, per-section numbering, per-question marks, MCQ letter
 * bubbles, matching columns, school header with logo, watermark) into a
 * printable HTML document, then converts it with headless Chromium
 * (puppeteer). Chromium is resolved from:
 *   1. PDF_CHROMIUM_PATH (explicit executable path — production setups)
 *   2. puppeteer's bundled browser (npm i puppeteer downloads it)
 * When neither is available the endpoint answers 501 with a clear message —
 * the browser print pipeline remains as the graceful fallback.
 *
 * Urdu: pages are rendered RTL with an Urdu-first font stack (Noto Nastaliq
 * Urdu when the OS has it) so shaping/alignment are handled by Chromium.
 */
import puppeteer from 'puppeteer';
import { ApiError } from '../utils/apiResponse';
import type { PDFOptions } from 'puppeteer';

const TYPE_ORDER = ['mcq', 'true_false', 'fill_blank', 'matching', 'short', 'numerical', 'conceptual', 'essay'] as const;

const TYPE_LABELS: Record<string, string> = {
  mcq: 'Multiple Choice Questions',
  true_false: 'True / False',
  fill_blank: 'Fill in the Blanks',
  matching: 'Matching',
  short: 'Short Questions',
  numerical: 'Numerical Problems',
  conceptual: 'Conceptual Questions',
  essay: 'Long Questions',
};

const esc = (v: unknown): string =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export interface PdfRenderInput {
  paper: any; // generatorService.getPaper() output
  baseUrl: string;
  answers?: boolean;
  school?: any | null;
  watermark?: { enabled: boolean; opacity: number; size: number; position: string } | null;
  header?: { showSchoolName?: boolean; showLogo?: boolean; showContact?: boolean };
  instructions?: string | null;
  footerNote?: string | null;
  numbering?: string;
}

function optionsOf(q: any): Array<[string, string]> {
  const opts = q.options;
  if (!opts) return [];
  if (Array.isArray(opts)) return opts.map((o: any, i: number) => [String.fromCharCode(65 + i), String(o)]);
  if (typeof opts === 'object') {
    if (Array.isArray(opts.pairs)) {
      return opts.pairs.map((p: any, i: number) => [String.fromCharCode(65 + i), String(p.left ?? '')]);
    }
    return Object.entries(opts).map(([k, v]) => [k, String(v)]);
  }
  return [];
}

function answerOf(q: any): string {
  const a = String(q.answer ?? '').trim();
  if (!a) return '—';
  if (/^[A-H]$/i.test(a)) return a.toUpperCase();
  if (Array.isArray(q.options) && q.options.length) {
    const idx = q.options.map((o: any) => String(o).toLowerCase()).indexOf(a.toLowerCase());
    if (idx >= 0) return String.fromCharCode(65 + idx);
  }
  return a;
}

function questionHtml(q: any, no: number, numbering: string, baseUrl: string): string {
  const text = esc(q.displayTextOverride || q.text);
  const marks = q.marks;
  const label = numbering === 'none' ? '' : `<span class="qno">Q.${no}</span>`;
  const inner: string[] = [];
  if (q.snapshotType === 'mcq') {
    const opts = optionsOf(q);
    inner.push(`<div class="opts">${opts.map(([l, o]) => `<span class="opt"><span class="bubble">${l}</span> ${esc(o)}</span>`).join('')}</div>`);
  } else if (q.snapshotType === 'matching') {
    const pairs = optionsOf(q);
    inner.push(`<table class="match"><tbody>${pairs.map(([l], i) => {
      const rights = q.options?.pairs ?? [];
      const r = rights[i]?.right ?? '';
      return `<tr><td class="m-left">${l}. ${esc(r)}</td><td class="m-right">&nbsp;</td></tr>`;
    }).join('')}</tbody></table>`);
  } else if (q.snapshotType === 'fill_blank') {
    inner.push(`<span class="blank-line">${esc(text.replace(/_{3,}/g, '__________'))}</span>`);
  }
  const images = Array.isArray(q.images) ? q.images : [];
  if (images.length) {
    inner.push(`<div class="qimg">${images.map((im: any) => {
      const src = typeof im === 'string' ? im : (im?.url ?? '');
      if (!src) return '';
      const url = /^https?:\/\//i.test(src) ? src : `${baseUrl}${src.startsWith('/') ? '' : '/'}${src}`;
      return `<img src="${esc(url)}" alt="question figure" />`;
    }).filter(Boolean).join('')}</div>`);
  }
  inner.push(marks ? `<span class="marks">(${marks} mark${marks === 1 ? '' : 's'})</span>` : '');
  return `<div class="q">${label}<span class="qtext">${esc(text)}</span>${inner.map((x) => `<div class="qbody">${x}</div>`).join('')}</div>`;
}

export function buildPaperHtml(input: PdfRenderInput): string {
  const { paper, school } = input;
  const fmt = paper.formatting ?? {};
  const branding = fmt.branding ?? {};
  const wm = input.watermark || branding.watermark || { enabled: false, opacity: 0.07, size: 45, position: 'center' };
  const header = input.header || branding.header || {};
  const instructions = input.instructions ?? branding.instructions ?? null;
  const footerNote = input.footerNote ?? fmt.footerNote ?? null;
  const schoolName = fmt.schoolName || school?.name || '';
  const logoUrl = fmt.schoolLogoUrl ? `${input.baseUrl}${fmt.schoolLogoUrl}` : (school?.logoUrl ? `${input.baseUrl}${school.logoUrl}` : null);
  const showLogo = header.showLogo !== false && !!logoUrl;

  const subjects = (paper.subjects ?? []).map((s: any) => s.name).join(', ');
  const examTitle = paper.examTitle || 'EXAMINATION';
  const className = `${paper.className ?? ''}` + (paper.grade ? ` — Grade ${paper.grade}` : '');
  const totalMarks = paper.totalMarks;
  const timeLimit = paper.timeLimit ? `Time: ${paper.timeLimit} Minutes` : '';
  const medium = paper.medium === 'urdu' ? 'urdu' : paper.medium === 'bilingual' ? 'bilingual' : 'english';
  const rtl = medium === 'urdu';

  // group questions into sections in canonical order
  const byType = new Map<string, any[]>();
  for (const q of paper.questions ?? []) {
    const t = q.snapshotType || q.type;
    if (!byType.has(t)) byType.set(t, []);
    byType.get(t)!.push(q);
  }
  const sections = TYPE_ORDER.filter((t) => byType.has(t) && byType.get(t)!.length)
    .map((t, i) => ({ type: t, letter: String.fromCharCode(65 + i), questions: byType.get(t)! }));

  const watermarkHtml = wm?.enabled
    ? `<div class="watermark pos-${wm.position}" style="opacity:${wm.opacity};width:${wm.size}%">
         ${logoUrl ? `<img src="${logoUrl}" />` : esc(schoolName)}
       </div>`
    : '';

  const contacts = school && header?.showContact && (school.address || school.phone || school.email)
    ? `<div class="contacts">${[school.address, school.phone, school.email].filter(Boolean).map(esc).join(' &nbsp;•&nbsp; ')}</div>` : '';

  const sectionsHtml = sections.map((sec) => {
    const marksTotal = sec.questions.reduce((n, qq) => n + (qq.marks ?? 0), 0);
    const size = `${sec.questions.length} × ${sec.questions[0].marks ?? 1} = ${marksTotal} marks`;
    return `
    <div class="paper-section">
      <div class="paper-section-title"><span>Section ${sec.letter} — ${TYPE_LABELS[sec.type] || sec.type}</span><span class="sec-marks">${size}</span></div>
      ${sec.questions.map((q, i) => questionHtml(q, i + 1, input.numbering ?? 'global', input.baseUrl)).join('')}
    </div>`;
  }).join('');

  const answerKey = input.answers
    ? `<div class="paper-section key">
         <div class="paper-section-title"><span>Answer Key (teacher copy)</span></div>
         <table class="key-table"><tbody>
           ${sections.map((sec) => sec.questions.map((q, i) =>
             `<tr><td>${sec.letter}-${i + 1}</td><td>${esc(answerOf(q))}</td></tr>`).join('')).join('')}
         </tbody></table>
       </div>` : '';

  return `<!doctype html>
<html lang="${rtl ? 'ur' : 'en'}" dir="${rtl ? 'rtl' : 'ltr'}">
<head>
<meta charset="utf-8" />
<style>
  @page { size: A4; } /* printed page numbers come from the pdf footer template (displayHeaderFooter) */
  * { box-sizing: border-box; }
  html,body { margin:0; padding:0; }
  body { font-family: 'Times New Roman', Georgia, 'Noto Nastaliq Urdu', 'Urdu Typesetting', serif; color:#111; font-size: 11.5pt; line-height: 1.55; }
  .sheet { position: relative; }
  .watermark { position: fixed; top: 38%; left: 50%; transform: translate(-50%,-50%); text-align:center; pointer-events:none; z-index:0; opacity:.07; font-size: 48pt; font-weight: 800; color:#6d28d9; }
  .watermark img { width: 100%; max-width: 100%; opacity: 1; }
  .watermark.pos-top-left { top: 12%; left: 6%; transform: none; }
  .watermark.pos-top-right { top: 12%; right: 6%; left:auto; transform:none; }
  .watermark.pos-bottom-left { top:auto; bottom: 12%; left: 6%; transform:none; }
  .watermark.pos-bottom-right { top:auto; bottom: 12%; right: 6%; left:auto; transform:none; }
  .paper-head { text-align:center; border-bottom: 2px solid #111; padding-bottom: 6mm; margin-bottom: 5mm; position:relative; z-index:1;}
  .logo { height: 22mm; margin-bottom: 2mm; }
  .logo img { height: 100%; }
  .school-name { font-size: 17pt; font-weight: 800; letter-spacing: .3px; }
  .contacts { font-size: 8.5pt; color: #444; margin-top: 1mm; }
  .exam-row { display:flex; justify-content: space-between; font-weight: 700; font-size: 12pt; margin-top: 2.5mm; }
  .meta-row { display:flex; justify-content: space-between; font-size: 10pt; margin-top: 1mm; }
  .instructions { font-size: 9.5pt; border:1px solid #999; padding: 2mm 3mm; margin: 3mm 0; background:#fafafa; }
  .paper-section { page-break-inside: auto; margin-top: 4mm; position: relative; z-index: 1; }
  .paper-section-title { display:flex; justify-content: space-between; font-weight: 800; font-size: 12pt; border-bottom: 1px solid #444; padding-bottom: 1mm; margin-bottom: 2.5mm;}
  .sec-marks { font-weight:600; font-size: 9.5pt; color:#333; }
  .q { margin: 2.6mm 0; page-break-inside: avoid; }
  .qno { font-weight: 800; margin-left: 1mm; margin-right: 2mm; }
  .qtext { }
  .qbody { margin-top: 1mm; }
  .qimg { margin: 1.5mm 0; }
  .qimg img { max-width: 120mm; max-height: 60mm; object-fit: contain; }
  .opts { display: grid; grid-template-columns: 1fr 1fr; gap: 1.2mm 6mm; margin-top: 1.4mm; }
  .opt { display: flex; align-items: center; gap: 1.6mm; }
  .bubble { display: inline-flex; align-items:center; justify-content:center; width: 5.2mm; height: 5.2mm; border-radius: 50%; border: 1.2px solid #111; font-size: 8.5pt; font-weight:700; flex-shrink: 0;}
  .match { width: 100%; border-collapse: collapse; margin-top: 1.5mm; }
  .match td { border: 1px solid #999; padding: 1.4mm 2mm; }
  .m-left { width: 55%; }
  .blank-line { border-bottom: 1px dotted #333; min-width: 18mm; display: inline-block; }
  .marks { float: right; font-size: 9.5pt; font-weight: 600; color:#333; }
  .key-table { width:100%; border-collapse: collapse; font-size: 9.5pt;}
  .key-table td { border: 1px solid #ccc; padding: 1mm 2mm; }
  .key { page-break-before: always; }
  .foot { margin-top: 8mm; border-top: 1px solid #ccc; padding-top: 2mm; font-size: 9pt; color: #555; display:flex; justify-content: space-between;}
</style>
</head>
<body><div class="sheet">
  ${watermarkHtml}
  <div class="paper-head">
    ${showLogo ? `<div class="logo"><img src="${logoUrl}" alt="school logo" /></div>` : ''}
    ${header?.showSchoolName !== false ? `<div class="school-name">${esc(schoolName)}</div>` : ''}
    ${contacts}
    <div class="exam-row"><span>${esc(examTitle)}</span><span>${esc(subjects)}</span></div>
    <div class="meta-row">
      <span>${esc(className)}</span>
      <span>Total Marks: ${totalMarks}</span>
      ${timeLimit ? `<span>${esc(timeLimit)}</span>` : ''}
    </div>
  </div>
  ${instructions ? `<div class="instructions">${esc(instructions)}</div>` : ''}
  ${sectionsHtml}
  ${answerKey}
  <div class="foot"><span>${footerNote ? esc(footerNote) : ''}</span></div>
</div></body></html>`;
}

export async function renderPdf(html: string): Promise<Buffer> {
  let browser: any = null;
  try {
    const explicit = process.env.PDF_CHROMIUM_PATH;
    if (explicit) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const pptrCore = require('puppeteer-core') as typeof import('puppeteer-core');
      browser = await pptrCore.launch({
        executablePath: explicit,
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
      });
    } else {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
      });
    }
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load', timeout: 25000 });
    const pdfOpts: PDFOptions = {
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: '<span></span>',
      footerTemplate:
        '<div style="width:100%;font-size:8px;color:#94a3b8;padding:0 13mm;' +
        'display:flex;justify-content:space-between;">' +
        '<span></span><span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>',
      margin: { top: '14mm', bottom: '16mm', left: '13mm', right: '13mm' },
    };
    const pdf = await page.pdf(pdfOpts);
    return Buffer.from(pdf);
  } catch (err: any) {
    const msg = String(err?.message ?? '');
    const missingBrowser = /No usable sandbox|Failed to launch|ENOENT|cannot find|Chrome|chromium|Download the browser|executable/i.test(msg);
    if (missingBrowser) {
      throw new ApiError(
        'PDF engine is not available on this server yet — install Chromium (set PDF_CHROMIUM_PATH) or run `npm i puppeteer` so its browser downloads; the on-screen preview and browser print/Save-as-PDF remain available.',
        501
      );
    }
    throw new ApiError(`PDF rendering failed: ${msg.slice(0, 300)}`, 500);
  } finally {
    if (browser) await browser.close().catch(() => undefined);
  }
}
