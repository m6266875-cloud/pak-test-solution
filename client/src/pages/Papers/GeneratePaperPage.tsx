import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';
import { subjectsApi } from '../../api/subjects';
import { papersApi } from '../../api/papers';
import { ClassItem, Subject, Chapter, Medium } from '../../types';
import toast from 'react-hot-toast';
import {
  ChevronRight, ChevronLeft, CheckCircle, BookOpen,
  Settings, FileText, Zap, Info,
} from 'lucide-react';
import clsx from 'clsx';

// ─── Step Definitions ────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: 'Class & Subject', icon: BookOpen },
  { id: 2, label: 'Chapters',        icon: FileText },
  { id: 3, label: 'Settings',        icon: Settings },
  { id: 4, label: 'Generate',        icon: Zap },
];

// ─── Default Form State ───────────────────────────────────────────────────────
const defaultForm = {
  title: '',
  classId: 0,
  subjectIds: [] as number[],
  chapterIds: [] as number[],
  medium: 'english' as Medium,
  mcq:   { count: 10, marks: 1 },
  short: { count: 5,  marks: 3 },
  essay: { count: 3,  marks: 10 },
  timeLimit: 90,
  randomize: true,
  showAnswerKey: true,
  showBubbleSheet: false,
  schoolName: '',
  ignoreMarks: { enabled: false, mcq: { attempt: 8, total: 10 } },
  blankLines: { enabled: false, forShort: true, forEssay: true },
};

// ─── Sub Components ───────────────────────────────────────────────────────────
const StepIndicator = ({ currentStep }: { currentStep: number }) => (
  <div className="flex items-center justify-center gap-0 mb-8">
    {STEPS.map((step, i) => (
      <div key={step.id} className="flex items-center">
        <div className={clsx(
          'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all',
          currentStep === step.id   && 'bg-primary-600 text-white shadow-sm',
          currentStep > step.id    && 'bg-green-100 text-green-700',
          currentStep < step.id    && 'bg-gray-100 text-gray-400',
        )}>
          {currentStep > step.id
            ? <CheckCircle className="w-4 h-4" />
            : <step.icon className="w-4 h-4" />
          }
          <span className="hidden sm:inline">{step.label}</span>
        </div>
        {i < STEPS.length - 1 && (
          <div className={clsx('w-6 h-0.5 mx-1', currentStep > step.id ? 'bg-green-300' : 'bg-gray-200')} />
        )}
      </div>
    ))}
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export default function GeneratePaperPage() {
  const navigate = useNavigate();
  const { user } = useAppSelector((s) => s.auth);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ ...defaultForm, schoolName: user?.schoolName || '' });
  const [isGenerating, setIsGenerating] = useState(false);

  // Data
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingChapters, setLoadingChapters] = useState(false);

  const totalMarks =
    form.mcq.count * form.mcq.marks +
    form.short.count * form.short.marks +
    form.essay.count * form.essay.marks;

  // Load classes
  useEffect(() => {
    subjectsApi.getClasses().then(r => setClasses(r.data.data));
  }, []);

  // Load subjects when class changes
  useEffect(() => {
    if (!form.classId) return;
    setLoadingSubjects(true);
    setSubjects([]);
    setForm(f => ({ ...f, subjectIds: [], chapterIds: [] }));
    subjectsApi.getSubjectsByClass(form.classId)
      .then(r => setSubjects(r.data.data))
      .finally(() => setLoadingSubjects(false));
  }, [form.classId]);

  // Load chapters when subjects change
  useEffect(() => {
    if (form.subjectIds.length === 0) { setChapters([]); return; }
    setLoadingChapters(true);
    setForm(f => ({ ...f, chapterIds: [] }));
    subjectsApi.getChaptersBySubjects(form.subjectIds)
      .then(r => setChapters(r.data.data))
      .finally(() => setLoadingChapters(false));
  }, [form.subjectIds]);

  const toggleSubject = (id: number) => {
    setForm(f => ({
      ...f,
      subjectIds: f.subjectIds.includes(id)
        ? f.subjectIds.filter(s => s !== id)
        : [...f.subjectIds, id],
    }));
  };

  const toggleChapter = (id: number) => {
    setForm(f => ({
      ...f,
      chapterIds: f.chapterIds.includes(id)
        ? f.chapterIds.filter(c => c !== id)
        : [...f.chapterIds, id],
    }));
  };

  const toggleAllChapters = () => {
    setForm(f => ({
      ...f,
      chapterIds: f.chapterIds.length === chapters.length ? [] : chapters.map(c => c.id),
    }));
  };

  const canProceedStep1 = form.classId > 0 && form.subjectIds.length > 0;
  const canProceedStep2 = form.chapterIds.length > 0;
  const canProceedStep3 = (form.mcq.count + form.short.count + form.essay.count) > 0;

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await papersApi.generate(form);
      const paperId = res.data.data.id;
      toast.success(`Paper generated! ${totalMarks} marks, ${form.timeLimit} min`);
      navigate(`/papers/${paperId}`);
    } catch (err: any) {
      const errors = err.response?.data?.errors;
      if (errors?.length) {
        errors.forEach((e: any) => toast.error(e.msg || e));
      } else {
        toast.error(err.response?.data?.message || 'Failed to generate paper');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Generate Exam Paper</h1>
        <p className="text-sm text-gray-500 mt-0.5">Create a customized paper in under 2 minutes</p>
      </div>

      <StepIndicator currentStep={step} />

      {/* ── STEP 1: Class & Subject ─────────────────────────────────────────── */}
      {step === 1 && (
        <div className="card p-6 space-y-6">
          <h2 className="section-heading">Select Class & Subject</h2>

          {/* Class */}
          <div>
            <label className="label">Class / Grade</label>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {classes.map(cls => (
                <button
                  key={cls.id}
                  onClick={() => setForm(f => ({ ...f, classId: cls.id }))}
                  className={clsx(
                    'py-2.5 rounded-lg text-sm font-medium border-2 transition-all',
                    form.classId === cls.id
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  )}
                >
                  {cls.grade}
                </button>
              ))}
            </div>
          </div>

          {/* Medium */}
          <div>
            <label className="label">Medium of Instruction</label>
            <div className="flex gap-2">
              {(['english', 'urdu', 'bilingual'] as Medium[]).map(m => (
                <button
                  key={m}
                  onClick={() => setForm(f => ({ ...f, medium: m }))}
                  className={clsx(
                    'px-4 py-2 rounded-lg text-sm font-medium border-2 capitalize transition-all',
                    form.medium === m
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Subjects */}
          {form.classId > 0 && (
            <div>
              <label className="label">
                Subjects
                {loadingSubjects && <span className="ml-2 spinner w-3.5 h-3.5 text-gray-400 inline-block" />}
              </label>
              {subjects.length === 0 && !loadingSubjects ? (
                <p className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4">
                  No subjects found for this class. Ask your admin to add subjects.
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {subjects.map(sub => (
                    <label
                      key={sub.id}
                      className={clsx(
                        'flex items-center gap-2.5 p-3 rounded-lg border-2 cursor-pointer transition-all',
                        form.subjectIds.includes(sub.id)
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      <input
                        type="checkbox"
                        className="checkbox"
                        checked={form.subjectIds.includes(sub.id)}
                        onChange={() => toggleSubject(sub.id)}
                      />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{sub.name}</div>
                        {sub._count && (
                          <div className="text-xs text-gray-500">{sub._count.chapters} chapters</div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* School Name */}
          <div>
            <label className="label">School / Institution Name (for paper header)</label>
            <input
              className="input"
              value={form.schoolName}
              onChange={e => setForm(f => ({ ...f, schoolName: e.target.value }))}
              placeholder="e.g. Government High School, Lahore"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => setStep(2)}
              disabled={!canProceedStep1}
              className="btn-primary"
            >
              Next: Select Chapters <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2: Chapters ──────────────────────────────────────────────── */}
      {step === 2 && (
        <div className="card p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="section-heading mb-0">Select Chapters</h2>
            <button
              onClick={toggleAllChapters}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              {form.chapterIds.length === chapters.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          {loadingChapters ? (
            <div className="flex justify-center py-8"><div className="spinner text-primary-500" /></div>
          ) : chapters.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <BookOpen className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              <p>No chapters found. Ask your admin to add chapters to the selected subjects.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Group by subject */}
              {form.subjectIds.map(sid => {
                const subjectChapters = chapters.filter(c => c.subjectId === sid);
                const subjectName = subjects.find(s => s.id === sid)?.name || '';
                if (subjectChapters.length === 0) return null;
                return (
                  <div key={sid}>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{subjectName}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {subjectChapters.map(ch => (
                        <label
                          key={ch.id}
                          className={clsx(
                            'flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer transition-all',
                            form.chapterIds.includes(ch.id)
                              ? 'border-primary-400 bg-primary-50'
                              : 'border-gray-200 hover:border-gray-300'
                          )}
                        >
                          <input
                            type="checkbox"
                            className="checkbox flex-shrink-0"
                            checked={form.chapterIds.includes(ch.id)}
                            onChange={() => toggleChapter(ch.id)}
                          />
                          <div className="min-w-0">
                            <span className="text-sm font-medium text-gray-900">
                              Ch {ch.number}. {ch.name}
                            </span>
                            {ch._count && (
                              <span className="ml-2 text-xs text-gray-400">
                                {ch._count.questions} Qs
                              </span>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <button onClick={() => setStep(1)} className="btn-secondary">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">{form.chapterIds.length} chapter{form.chapterIds.length !== 1 ? 's' : ''} selected</span>
              <button onClick={() => setStep(3)} disabled={!canProceedStep2} className="btn-primary">
                Next: Settings <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 3: Settings ─────────────────────────────────────────────── */}
      {step === 3 && (
        <div className="card p-6 space-y-6">
          <h2 className="section-heading">Paper Settings</h2>

          {/* Title */}
          <div>
            <label className="label">Paper Title (optional)</label>
            <input
              className="input"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Leave blank for auto-generated title"
            />
          </div>

          {/* Question Distribution */}
          <div>
            <label className="label">Question Distribution & Marks</label>
            <div className="grid grid-cols-3 gap-4">
              {(['mcq', 'short', 'essay'] as const).map(type => (
                <div key={type} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    {type === 'mcq' ? 'MCQs' : type === 'short' ? 'Short Qs' : 'Essay Qs'}
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-gray-500">Count</label>
                      <input
                        type="number"
                        min={0}
                        max={type === 'mcq' ? 50 : type === 'short' ? 20 : 10}
                        className="input mt-1"
                        value={form[type].count}
                        onChange={e => setForm(f => ({ ...f, [type]: { ...f[type], count: Number(e.target.value) } }))}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Marks each</label>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        className="input mt-1"
                        value={form[type].marks}
                        onChange={e => setForm(f => ({ ...f, [type]: { ...f[type], marks: Number(e.target.value) } }))}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 px-4 py-3 bg-primary-50 rounded-lg flex items-center justify-between">
              <span className="text-sm text-primary-700 font-medium">Total Marks</span>
              <span className="text-xl font-bold text-primary-900">{totalMarks}</span>
            </div>
          </div>

          {/* Time Limit */}
          <div>
            <label className="label">Time Limit (minutes)</label>
            <div className="flex gap-2 flex-wrap">
              {[30, 45, 60, 90, 120, 180].map(t => (
                <button
                  key={t}
                  onClick={() => setForm(f => ({ ...f, timeLimit: t }))}
                  className={clsx(
                    'px-4 py-2 rounded-lg text-sm font-medium border-2 transition-all',
                    form.timeLimit === t
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  )}
                >
                  {t} min
                </button>
              ))}
              <input
                type="number"
                className="input w-24"
                value={form.timeLimit}
                onChange={e => setForm(f => ({ ...f, timeLimit: Number(e.target.value) }))}
                min={15}
                max={240}
              />
            </div>
          </div>

          {/* Options */}
          <div>
            <label className="label">Options</label>
            <div className="space-y-3">
              <ToggleOption
                checked={form.randomize}
                onChange={v => setForm(f => ({ ...f, randomize: v }))}
                label="Randomize questions"
                desc="Questions will be shuffled randomly — ideal for exam integrity"
              />
              <ToggleOption
                checked={form.showAnswerKey}
                onChange={v => setForm(f => ({ ...f, showAnswerKey: v }))}
                label="Include answer key"
                desc="An MCQ answer key page will be appended to the PDF"
              />
              <ToggleOption
                checked={form.showBubbleSheet}
                onChange={v => setForm(f => ({ ...f, showBubbleSheet: v }))}
                label="Include OMR bubble sheet"
                desc="Add a bubble sheet for MCQ answers"
              />
              <ToggleOption
                checked={form.blankLines.enabled}
                onChange={v => setForm(f => ({ ...f, blankLines: { ...f.blankLines, enabled: v } }))}
                label="Add blank answer lines"
                desc="Include dotted lines for short and essay question answers"
              />
              <ToggleOption
                checked={form.ignoreMarks.enabled}
                onChange={v => setForm(f => ({ ...f, ignoreMarks: { ...f.ignoreMarks, enabled: v } }))}
                label="Attempt X out of Y MCQs"
                desc={`Students attempt ${form.ignoreMarks.mcq?.attempt} out of ${form.ignoreMarks.mcq?.total} MCQs`}
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button onClick={() => setStep(2)} className="btn-secondary">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <button onClick={() => setStep(4)} disabled={!canProceedStep3} className="btn-primary">
              Review & Generate <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 4: Review & Generate ─────────────────────────────────────── */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="card p-6">
            <h2 className="section-heading">Review Your Paper</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <ReviewRow label="Class" value={classes.find(c => c.id === form.classId)?.name || ''} />
              <ReviewRow label="Medium" value={form.medium} capitalize />
              <ReviewRow label="Subjects" value={subjects.filter(s => form.subjectIds.includes(s.id)).map(s => s.name).join(', ')} />
              <ReviewRow label="Chapters" value={`${form.chapterIds.length} selected`} />
              <ReviewRow label="MCQ Questions" value={`${form.mcq.count} × ${form.mcq.marks} mark = ${form.mcq.count * form.mcq.marks}`} />
              <ReviewRow label="Short Questions" value={`${form.short.count} × ${form.short.marks} marks = ${form.short.count * form.short.marks}`} />
              <ReviewRow label="Essay Questions" value={`${form.essay.count} × ${form.essay.marks} marks = ${form.essay.count * form.essay.marks}`} />
              <ReviewRow label="Time Limit" value={`${form.timeLimit} minutes`} />
              <ReviewRow label="Randomized" value={form.randomize ? 'Yes' : 'No'} />
              <ReviewRow label="Answer Key" value={form.showAnswerKey ? 'Included' : 'Not included'} />
            </div>

            <div className="mt-5 pt-5 border-t border-gray-100 flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-primary-600">{totalMarks}</div>
                <div className="text-sm text-gray-500">Total marks</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold text-gray-900">{form.timeLimit} min</div>
                <div className="text-sm text-gray-500">Duration</div>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
            <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              Make sure the question bank has enough questions for your selected chapters.
              If insufficient, the system will let you know what's missing.
            </p>
          </div>

          <div className="flex items-center justify-between">
            <button onClick={() => setStep(3)} className="btn-secondary">
              <ChevronLeft className="w-4 h-4" /> Back to Settings
            </button>
            <button onClick={handleGenerate} disabled={isGenerating} className="btn-primary px-8 py-3 text-base">
              {isGenerating ? (
                <><span className="spinner" /> Generating Paper...</>
              ) : (
                <><Zap className="w-5 h-5" /> Generate Paper</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helper components ────────────────────────────────────────────────────────
function ToggleOption({ checked, onChange, label, desc }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; desc: string;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <div className="relative mt-0.5">
        <input type="checkbox" className="sr-only" checked={checked} onChange={e => onChange(e.target.checked)} />
        <div className={clsx(
          'w-10 h-5 rounded-full transition-colors',
          checked ? 'bg-primary-600' : 'bg-gray-200'
        )}>
          <div className={clsx(
            'absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform',
            checked && 'translate-x-5'
          )} />
        </div>
      </div>
      <div>
        <div className="text-sm font-medium text-gray-900">{label}</div>
        <div className="text-xs text-gray-500">{desc}</div>
      </div>
    </label>
  );
}

function ReviewRow({ label, value, capitalize }: { label: string; value: string; capitalize?: boolean }) {
  return (
    <div className="flex justify-between gap-4 py-2 border-b border-gray-50">
      <span className="text-sm text-gray-500">{label}</span>
      <span className={clsx('text-sm font-medium text-gray-900 text-right', capitalize && 'capitalize')}>{value}</span>
    </div>
  );
}
