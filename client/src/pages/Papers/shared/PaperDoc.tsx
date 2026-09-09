/**
 * PHASE 2 — Paper document renderer (print-quality preview).
 *
 * Renders a PaperV2 the way a printed question paper should look:
 *   • school header (PaperFormatting.schoolName / headerNote)
 *   • exam title, class, subject(s), time, total marks
 *   • sections grouped by question type in canonical order, per-section
 *     numbering (Q.1 … Q.n), per-question marks
 *   • MCQ letter options, True/False, fill-blank, matching columns,
 *     short/long/numerical/conceptual numbered blocks
 *   • Urdu papers render RTL
 *   • optional answer-key appendix (teacher view)
 *
 * The same component powers the wizard step-15 preview, the paper detail
 * page and the full-screen print view. "Download PDF" = window.print() on a
 * print stylesheet whose @page setup targets A4 — no server round trip.
 *
 * Course branding: the paper carries its course's logo — small and centered
 * in the printed header (like a real board paper crest) and again as a very
 * light background watermark behind the questions (repeated on every printed
 * page via the fixed-position print rule in global.css). Both disappear
 * gracefully when the paper has no course code or no logo asset.
 */
import { forwardRef, useState } from 'react';
import clsx from 'clsx';
import type { PaperQuestionV2, PaperV2 } from '../../../types';
import { optionEntries, TYPE_LABELS, TYPE_ORDER } from './paperUtils';
import { courseLogoUrl } from '../../../components/common/CourseLogo';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

const answerLetterFor = (q: PaperQuestionV2): string | null => {
  const opts = optionEntries(q.options);
  const a = q.answer?.trim();
  if (!a || !opts.length) return null;
  if (/^[A-H]$/i.test(a)) return a.toUpperCase();
  const lower = a.toLowerCase();
  const byText = opts.findIndex(([, t]) => t.toLowerCase() === lower);
  if (byText >= 0) return opts[byText][0];
  const asIdx = Number(a);
  if (Number.isInteger(asIdx) && asIdx >= 0 && asIdx < opts.length) return opts[asIdx][0];
  return null;
};

const fmtPairs = (options: any): Array<[string, string]> => {
  if (!options) return [];
  const raw = Array.isArray(options) ? options : options?.pairs;
  if (!Array.isArray(raw)) return [];
  return raw.map((p: any) => [String(p?.left ?? p?.[0] ?? ''), String(p?.right ?? p?.[1] ?? '')]);
};

/** one section = one question type */
function Section({ title, questions, marksEach }: {
  title: string; questions: PaperQuestionV2[]; marksEach: number;
}) {
  const letters = questions[0]?.type === 'matching';
  return (
    <section className="paper-section">
      <div className="paper-section-title">
        <span>{title}</span>
        <span className="paper-marks-tag">{questions.length} × {marksEach} = {questions.length * marksEach} marks</span>
      </div>
      {questions.map((q, i) => {
        const no = i + 1;
        return (
          <div key={`${q.questionId}-${no}`} className="paper-q">
            <div className="flex items-start gap-2">
              <span className="paper-q-no">Q.{no}</span>
              <div className="flex-1">
                {q.type === 'mcq' && (
                  <div>
                    <p className="paper-q-text">{q.displayTextOverride || q.text}</p>
                    <div className="paper-options">
                      {optionEntries(q.options).map(([letter, text], oi) => (
                        <div key={oi} className="paper-opt">
                          <span className="paper-bubble">{letter}</span>
                          <span>{text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {q.type === 'matching' && (
                  <div>
                    <p className="paper-q-text">{q.displayTextOverride || q.text}</p>
                    <div className="grid grid-cols-2 gap-4 mt-1">
                      <div>
                        {fmtPairs(q.options).map(([l], li) => (
                          <div key={li} className="paper-pair-row"><span className="paper-bubble">{LETTERS[li]}</span>{l}</div>
                        ))}
                      </div>
                      <div>
                        {fmtPairs(q.options).map(([, r], ri) => (
                          <div key={ri} className="paper-pair-row"><span className="paper-bubble">{ri + 1}</span>{r}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                {q.type !== 'mcq' && q.type !== 'matching' && (
                  <div>
                    <p className={clsx('paper-q-text', q.type === 'fill_blank' && 'paper-fill')}>{q.displayTextOverride || q.text}</p>
                    {(q.type === 'true_false') && (
                      <div className="paper-options">
                        {['True', 'False'].map((o) => (
                          <span key={o} className="paper-opt-inline"><span className="paper-bubble" />{o}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <span className="paper-q-marks">{marksEach}</span>
            </div>
          </div>
        );
      })}
    </section>
  );
}

export interface PaperDocProps {
  paper: PaperV2;
  showKey?: boolean;
  className?: string;
}

export const PaperDoc = forwardRef<HTMLDivElement, PaperDocProps>(({ paper, showKey, className }, ref) => {
  const rtl = paper.medium === 'urdu';
  const subjects = (paper.subjects ?? []).map((s) => s.name).join(', ');
  const school = (paper.formatting as any)?.schoolName || '';
  const headerNote = (paper.formatting as any)?.headerNote || '';
  const examTitle = paper.examTitle || paper.title || 'Question Paper';
  const [logoFailed, setLogoFailed] = useState(false);
  const courseLogo = logoFailed ? null : courseLogoUrl(paper.courseCode);

  const sections = TYPE_ORDER
    .map((t) => ({ type: t, qs: paper.questions.filter((q) => (q.snapshotType || q.type) === t) }))
    .filter((x) => x.qs.length > 0)
    .map((x) => ({ ...x, marksEach: x.qs[0]?.marks ?? 1 }));

  const markTotal = paper.questions.reduce((a, q) => a + (q.marks ?? 1), 0);

  return (
    <div ref={ref} dir={rtl ? 'rtl' : 'ltr'} className={clsx('paper-doc', className)}>
      {/* course watermark — very light, behind the questions; repeats on
          every printed page via the fixed-position @media print rule */}
      {courseLogo && (
        <img src={courseLogo} alt="" aria-hidden="true" className="paper-wm" onError={() => setLogoFailed(true)} />
      )}
      <div className="paper-doc-body">
      {/* header block */}
      <div className="paper-head">
        {courseLogo && <img src={courseLogo} alt="" className="paper-head-logo" onError={() => setLogoFailed(true)} />}
        {school && <div className="paper-school">{school}</div>}
        <div className="paper-exam">{examTitle}</div>
        {headerNote && <div className="paper-note">{headerNote}</div>}
        <div className="paper-meta">
          <span>{paper.className}{paper.grade ? ` (Grade ${paper.grade})` : ''}</span>
          {subjects && <span>{subjects}</span>}
          <span>{paper.courseName || ''}</span>
          <span>Time Allowed: {paper.timeLimit ?? 90} minutes</span>
          <span>Total Marks: {paper.totalMarks}</span>
        </div>
        <div className="paper-rule" />
        {rtl && <div className="paper-note">ہدایات: تمام سوالات کے جوابات لازمی ہیں</div>}
        {!rtl && <div className="paper-note">Instructions: Attempt all questions. Overwriting is not allowed.</div>}
      </div>

      {/* sections */}
      {sections.map((s, i) => (
        <Section
          key={s.type}
          title={`Section ${LETTERS[i]} — ${TYPE_LABELS[s.type] || s.type}`}
          questions={s.qs}
          marksEach={s.marksEach}
        />
      ))}

      {!sections.length && (
        <div className="paper-empty">No questions in this paper.</div>
      )}

      {/* answer key appendix */}
      {showKey && (
        <section className="paper-key">
          <div className="paper-section-title"><span>Answer Key (teacher copy)</span></div>
          <table className="paper-key-table">
            <tbody>
              {paper.questions.map((q, i) => {
                const t = q.snapshotType || q.type;
                let ans = q.answer?.trim() || '';
                if (t === 'mcq') ans = answerLetterFor(q) ? `Option ${answerLetterFor(q)}` : (ans || '—');
                else if (t === 'true_false') ans = ans ? ans[0].toUpperCase() + ans.slice(1) : '—';
                else if (t === 'matching') ans = fmtPairs(q.options).map(([l, r], li) => `${LETTERS[li]}→${li + 1}`).join(', ') || '—';
                if (ans.length > 90) ans = `${ans.slice(0, 90)}…`;
                return (
                  <tr key={`${q.questionId}-${i}`}>
                    <td className="w-16">Q.{i + 1}</td>
                    <td className="font-medium text-left">{t.replace('_', ' ')} · {q.marks ?? 1} mark{q.marks !== 1 ? 's' : ''}</td>
                    <td className="text-left">{ans || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      {/* end */}
      <div className="paper-end"><span>— End of Paper —</span><span>Σ question marks: {markTotal} / paper total: {paper.totalMarks}</span></div>
      </div>
    </div>
  );
});
PaperDoc.displayName = 'PaperDoc';
