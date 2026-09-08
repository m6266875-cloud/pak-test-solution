import puppeteer from 'puppeteer';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';
import { ApiError } from '../utils/apiResponse';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export class PDFGeneratorService {
  private uploadsDir: string;

  constructor() {
    this.uploadsDir = path.join(process.cwd(), 'uploads', 'papers');
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  async generatePDF(paperId: number, userId: number): Promise<{ buffer: Buffer; filename: string }> {
    const paper = await prisma.paper.findUnique({
      where: { id: paperId },
      include: {
        class: true,
        paperSubjects: { include: { subject: true } },
        paperQuestions: {
          where: { isSelected: true },
          orderBy: { order: 'asc' },
          include: { question: true },
        },
        paperSettings: true,
        paperFormatting: true,
        teacher: { select: { name: true, schoolName: true } },
      },
    });

    if (!paper) throw ApiError.notFound('Paper not found');
    if (paper.teacherId !== userId) throw ApiError.forbidden('Access denied');

    const html = this.buildHTML(paper);
    const buffer = await this.convertToPDF(html, paper.paperFormatting?.layoutType);

    // Log download
    await prisma.activityLog.create({
      data: { userId, action: 'download_paper', paperId, details: { format: 'pdf' } },
    });

    const subjectNames = paper.paperSubjects.map(ps => ps.subject.name).join('-');
    const filename = `${paper.class.name.replace(' ', '')}-${subjectNames}-${Date.now()}.pdf`;

    return { buffer, filename };
  }

  private buildHTML(paper: any): string {
    const f = paper.paperFormatting || {};
    const s = paper.paperSettings || {};

    const mcqQs   = paper.paperQuestions.filter((pq: any) => pq.question.type === 'mcq');
    const shortQs  = paper.paperQuestions.filter((pq: any) => pq.question.type === 'short');
    const essayQs  = paper.paperQuestions.filter((pq: any) => pq.question.type === 'essay');

    const subjectNames = paper.paperSubjects.map((ps: any) => ps.subject.name).join(', ');
    const schoolName = f.schoolName || paper.teacher?.schoolName || 'School Name';
    const isUrdu = paper.medium === 'urdu';
    const dir = isUrdu ? 'rtl' : 'ltr';

    const renderMCQOptions = (options: any): string => {
      if (!options || !Array.isArray(options)) return '';
      return `<div class="mcq-options">
        ${options.map((opt: string, i: number) => `
          <div class="mcq-option">
            <span class="opt-label">${String.fromCharCode(65 + i)}.</span>
            <span>${opt}</span>
          </div>
        `).join('')}
      </div>`;
    };

    const renderBubbleSheet = (): string => {
      if (!s.showBubbleSheet || mcqQs.length === 0) return '';
      return `
        <div class="bubble-sheet page-break">
          <h3 class="section-heading">OMR Sheet / Answer Bubbles</h3>
          <div class="bubble-grid">
            ${mcqQs.map((_: any, i: number) => `
              <div class="bubble-row">
                <span class="bubble-num">${i + 1}.</span>
                <span class="bubble">A</span>
                <span class="bubble">B</span>
                <span class="bubble">C</span>
                <span class="bubble">D</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    };

    return `<!DOCTYPE html>
<html dir="${dir}" lang="${isUrdu ? 'ur' : 'en'}">
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: ${isUrdu ? "'Noto Nastaliq Urdu', " : ''}'Arial', sans-serif;
      font-size: ${f.fontSize || 12}pt;
      line-height: ${f.lineHeight || 1.6};
      color: ${f.color || '#000000'};
      direction: ${dir};
    }

    .paper-wrapper { padding: 20px; max-width: 800px; margin: 0 auto; }

    /* Header */
    .paper-header {
      text-align: center;
      padding-bottom: 12px;
      margin-bottom: 16px;
      border-bottom: ${f.showBorder ? `2px solid ${f.borderColor || '#000'}` : '2px solid #000'};
    }
    .school-name {
      font-size: ${f.schoolNameSize || 18}pt;
      font-weight: bold;
      color: ${f.schoolNameColor || '#000000'};
      margin-bottom: 4px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .paper-title-main {
      font-size: 14pt;
      font-weight: bold;
      margin: 4px 0;
    }
    .paper-meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 8px;
      margin-top: 12px;
      font-size: 10pt;
      border: 1px solid #000;
    }
    .meta-cell {
      padding: 5px 8px;
      border-right: 1px solid #000;
      text-align: center;
    }
    .meta-cell:last-child { border-right: none; }
    .meta-label { font-size: 8pt; color: #555; display: block; }
    .meta-value { font-weight: bold; font-size: 11pt; }

    /* Student Info Row */
    .student-info {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr;
      gap: 0;
      border: 1px solid #000;
      border-top: none;
      margin-bottom: 16px;
    }
    .info-cell {
      padding: 6px 8px;
      border-right: 1px solid #000;
      font-size: 10pt;
    }
    .info-cell:last-child { border-right: none; }
    .info-line {
      display: inline-block;
      width: 70%;
      border-bottom: 1px solid #000;
      margin-left: 4px;
    }

    /* Instructions */
    .instructions {
      font-size: 9pt;
      color: #333;
      margin-bottom: 12px;
      padding: 8px 10px;
      background: #f5f5f5;
      border-left: 3px solid #333;
    }
    .instructions-title { font-weight: bold; margin-bottom: 4px; }

    /* Sections */
    .section { margin-bottom: 20px; }
    .section-heading {
      font-size: 11pt;
      font-weight: bold;
      border-bottom: 1px solid #000;
      padding-bottom: 4px;
      margin-bottom: 10px;
      background: #f0f0f0;
      padding: 6px 8px;
    }

    /* MCQ Questions */
    .mcq-question {
      display: grid;
      grid-template-columns: 24px 1fr;
      gap: 4px;
      margin-bottom: 10px;
      page-break-inside: avoid;
    }
    .q-num { font-weight: bold; }
    .mcq-options {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2px 16px;
      margin-top: 4px;
      margin-left: 24px;
    }
    .mcq-option { display: flex; gap: 6px; font-size: 10pt; }
    .opt-label { font-weight: bold; min-width: 14px; }

    /* Short/Essay Questions */
    .sq-question {
      display: grid;
      grid-template-columns: 28px 1fr;
      gap: 4px;
      margin-bottom: ${s.blankLines?.enabled && s.blankLines?.forShort ? '4px' : '12px'};
      page-break-inside: avoid;
    }
    .eq-question {
      display: grid;
      grid-template-columns: 28px 1fr;
      gap: 4px;
      margin-bottom: 12px;
      page-break-inside: avoid;
    }
    .marks-tag {
      font-size: 8pt;
      color: #555;
      float: ${dir === 'rtl' ? 'left' : 'right'};
    }
    .blank-lines {
      margin: 6px 0 10px 28px;
    }
    .blank-line {
      border-bottom: 1px solid #bbb;
      height: 22px;
      margin-bottom: 2px;
    }

    /* Answer Key */
    .answer-key {
      margin-top: 20px;
      padding-top: 12px;
      border-top: 2px dashed #000;
      page-break-before: always;
    }
    .answer-key h3 { margin-bottom: 10px; }
    .answer-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 4px;
      font-size: 10pt;
    }
    .answer-item {
      background: #f0f0f0;
      padding: 4px 6px;
      text-align: center;
      border: 1px solid #ccc;
    }
    .answer-num { font-size: 8pt; color: #555; display: block; }
    .answer-val { font-weight: bold; }

    /* Bubble Sheet */
    .bubble-sheet { margin-top: 20px; padding-top: 12px; }
    .bubble-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 6px;
    }
    .bubble-row { display: flex; gap: 6px; align-items: center; font-size: 10pt; }
    .bubble-num { min-width: 20px; }
    .bubble {
      width: 22px; height: 22px;
      border: 1.5px solid #000;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 8pt; font-weight: bold;
    }

    /* Utility */
    .page-break { page-break-before: always; }
    .note-box {
      background: #fff8e1;
      border: 1px solid #f0c040;
      padding: 6px 10px;
      margin-bottom: 10px;
      font-size: 10pt;
    }

    /* Print */
    @media print {
      body { font-size: ${f.fontSize || 12}pt; }
      .paper-wrapper { padding: 0; }
    }
  </style>
</head>
<body>
<div class="paper-wrapper">

  <!-- ═══ HEADER ═══ -->
  <div class="paper-header">
    <div class="school-name">${schoolName}</div>
    <div class="paper-title-main">${paper.title}</div>
    <div style="font-size:10pt; color:#444;">${subjectNames} &nbsp;|&nbsp; ${paper.medium.charAt(0).toUpperCase() + paper.medium.slice(1)} Medium</div>
    <div class="paper-meta-grid">
      <div class="meta-cell">
        <span class="meta-label">Class / Grade</span>
        <span class="meta-value">${paper.class.name}</span>
      </div>
      <div class="meta-cell">
        <span class="meta-label">Total Marks</span>
        <span class="meta-value">${paper.totalMarks}</span>
      </div>
      <div class="meta-cell">
        <span class="meta-label">Time Allowed</span>
        <span class="meta-value">${paper.timeLimit} mins</span>
      </div>
    </div>
  </div>

  <!-- ═══ STUDENT INFO ═══ -->
  <div class="student-info">
    <div class="info-cell">Name: <span class="info-line"></span></div>
    <div class="info-cell">Roll No: <span class="info-line"></span></div>
    <div class="info-cell">Date: <span class="info-line"></span></div>
  </div>

  <!-- ═══ IGNORE MARKS NOTE ═══ -->
  ${s.ignoreMarksEnabled && s.ignoreMarks ? `
  <div class="note-box">
    <strong>Note:</strong> Attempt any <strong>${s.ignoreMarks.mcq?.attempt || 8}</strong> out of
    ${s.ignoreMarks.mcq?.total || mcqQs.length} MCQ questions.
    All questions carry equal marks.
  </div>` : ''}

  <!-- ═══ INSTRUCTIONS ═══ -->
  <div class="instructions">
    <div class="instructions-title">General Instructions:</div>
    <ol style="margin-left: 16px; margin-top: 4px;">
      <li>Write your name and roll number clearly.</li>
      <li>All questions are compulsory unless stated otherwise.</li>
      <li>Cutting and overwriting is not allowed.</li>
      <li>Use black/blue ink only. Pencil is allowed for diagrams.</li>
    </ol>
  </div>

  <!-- ═══ SECTION A: MCQs ═══ -->
  ${mcqQs.length > 0 ? `
  <div class="section">
    <div class="section-heading">
      Section A — Multiple Choice Questions
      <span class="marks-tag">(${mcqQs.length} × ${s.mcqMarks || 1} = ${mcqQs.length * (s.mcqMarks || 1)} Marks)</span>
    </div>
    ${mcqQs.map((pq: any, i: number) => `
      <div class="mcq-question">
        <span class="q-num">Q${i + 1}.</span>
        <div>
          <span>${pq.question.text}</span>
          ${renderMCQOptions(pq.question.options)}
        </div>
      </div>
    `).join('')}
  </div>` : ''}

  <!-- ═══ SECTION B: SHORT QUESTIONS ═══ -->
  ${shortQs.length > 0 ? `
  <div class="section">
    <div class="section-heading">
      Section B — Short Questions
      <span class="marks-tag">(${shortQs.length} × ${s.shortMarks || 3} = ${shortQs.length * (s.shortMarks || 3)} Marks)</span>
    </div>
    ${shortQs.map((pq: any, i: number) => `
      <div class="sq-question">
        <span class="q-num">Q${i + 1}.</span>
        <div>${pq.question.text}</div>
      </div>
      ${s.blankLines?.enabled && s.blankLines?.forShort ? `
      <div class="blank-lines">
        ${Array(4).fill('<div class="blank-line"></div>').join('')}
      </div>` : ''}
    `).join('')}
  </div>` : ''}

  <!-- ═══ SECTION C: ESSAY QUESTIONS ═══ -->
  ${essayQs.length > 0 ? `
  <div class="section">
    <div class="section-heading">
      Section C — Essay / Long Questions
      <span class="marks-tag">(${essayQs.length} × ${s.essayMarks || 10} = ${essayQs.length * (s.essayMarks || 10)} Marks)</span>
    </div>
    ${essayQs.map((pq: any, i: number) => `
      <div class="eq-question">
        <span class="q-num">Q${i + 1}.</span>
        <div>${pq.question.text}</div>
      </div>
      ${s.blankLines?.enabled && s.blankLines?.forEssay ? `
      <div class="blank-lines">
        ${Array(8).fill('<div class="blank-line"></div>').join('')}
      </div>` : ''}
    `).join('')}
  </div>` : ''}

  <!-- ═══ BUBBLE SHEET ═══ -->
  ${renderBubbleSheet()}

  <!-- ═══ ANSWER KEY ═══ -->
  ${s.showAnswerKey && mcqQs.some((pq: any) => pq.question.answer) ? `
  <div class="answer-key">
    <h3>Answer Key — MCQs</h3>
    <div class="answer-grid">
      ${mcqQs.map((pq: any, i: number) => `
        <div class="answer-item">
          <span class="answer-num">Q${i + 1}</span>
          <span class="answer-val">${pq.question.answer || '—'}</span>
        </div>
      `).join('')}
    </div>
  </div>` : ''}

  <!-- Footer -->
  <div style="text-align:center; font-size:8pt; color:#888; margin-top:20px; border-top:1px solid #eee; padding-top:8px;">
    Generated by Pak Test Solution &nbsp;|&nbsp; ${new Date().toLocaleDateString('en-PK')}
    ${f.footerNote ? `&nbsp;|&nbsp; ${f.footerNote}` : ''}
  </div>

</div>
</body>
</html>`;
  }

  private async convertToPDF(html: string, layoutType?: string): Promise<Buffer> {
    let browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
      });

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });

      const margins = { top: '15mm', bottom: '15mm', left: '15mm', right: '15mm' };

      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: margins,
        displayHeaderFooter: true,
        footerTemplate: `<div style="font-size:8px;text-align:center;width:100%;color:#aaa;">
          Page <span class="pageNumber"></span> of <span class="totalPages"></span>
        </div>`,
        headerTemplate: '<div></div>',
      });

      return Buffer.from(pdf);
    } finally {
      if (browser) await browser.close();
    }
  }
}
