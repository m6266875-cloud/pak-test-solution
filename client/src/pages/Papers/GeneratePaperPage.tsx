import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';
import { subjectsApi } from '../../api/subjects';
import { papersApi } from '../../api/papers';
import { ClassItem, Subject, Chapter, Medium } from '../../types';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight, ChevronLeft, CheckCircle, BookOpen,
  Settings, FileText, Zap, Info, GraduationCap,
  Languages, ListChecks, Sparkles, School,
} from 'lucide-react';
import clsx from 'clsx';

// ─── Step Definitions ────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: 'Board & Class',   icon: GraduationCap },
  { id: 2, label: 'Subject',         icon: BookOpen },
  { id: 3, label: 'Chapters',        icon: ListChecks },
  { id: 4, label: 'Language',        icon: Languages },
  { id: 5, label: 'Pattern & Marks', icon: Settings },
  { id: 6, label: 'Branding',        icon: School },
  { id: 7, label: 'Review',          icon: Sparkles },
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

// ─── Step Indicator ───────────────────────────────────────────────────────────
function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8 overflow-x-auto pb-2">
      {STEPS.map((step, i) => (
        <div key={step.id} className="flex items-center">
          <div className={clsx(
            'flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold transition-all whitespace-nowrap',
            currentStep === step.id   && 'bg-brand-600 text-white shadow-brand',
            currentStep > step.id    && 'bg-emerald-100 text-emerald-700',
            currentStep < step.id    && 'bg-surface-100 text-surface-400',
          )}>
            {currentStep > step.id
              ? <CheckCircle className="w-3.5 h-3.5" />
              : <step.icon className="w-3.5 h-3.5" />
            }
            <span className="hidden md:inline">{step.label}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={clsx('w-4 lg:w-8 h-0.5 mx-0.5 flex-shrink-0', currentStep > step.id ? 'bg-emerald-300' : 'bg-surface-200')} />
          )}
        </div>
      ))}
    </div>
  );
}

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

  const canProceed = () => {
    switch (step) {
      case 1: return form.classId > 0;
      case 2: return form.subjectIds.length > 0;
      case 3: return form.chapterIds.length > 0;
      case 4: return true;
      case 5: return (form.mcq.count + form.short.count + form.essay.count) > 0;
      case 6: return true;
      default: return true;
    }
  };

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
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="page-title">Generate Exam Paper</h1>
        <p className="text-sm text-surface-500 mt-1">Create a customized paper in under 2 minutes</p>
      </div>

      <StepIndicator currentStep={step} />

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
        >
          {/* ═══ STEP 1: Board & Class ═══ */}
          {step === 1 && (
            <div className="card p-6 space-y-6">
              <h2 className="section-heading flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-brand-600" />
                Select Class / Grade
              </h2>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                {classes.map(cls => (
                  <button
                    key={cls.id}
                    onClick={() => setForm(f => ({ ...f, classId: cls.id }))}
                    className={clsx(
                      'py-3.5 rounded-xl text-sm font-semibold border-2 transition-all',
                      form.classId === cls.id
                        ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-brand/20 shadow-sm'
                        : 'border-surface-200 hover:border-surface-300 text-surface-700 hover:bg-surface-50'
                    )}
                  >
                    <div className="text-lg font-bold">{cls.grade}</div>
                    <div className="text-xs opacity-70">Class</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ═══ STEP 2: Subject ═══ */}
          {step === 2 && (
            <div className="card p-6 space-y-6">
              <h2 className="section-heading flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-brand-600" />
                Select Subject(s)
              </h2>
              {loadingSubjects ? (
                <div className="flex justify-center py-12"><div className="spinner text-brand-500" /></div>
              ) : subjects.length === 0 ? (
                <p className="text-sm text-surface-500 bg-surface-50 rounded-xl p-6 text-center">
                  No subjects found for this class. Ask your admin to add subjects.
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {subjects.map(sub => (
                    <label
                      key={sub.id}
                      className={clsx(
                        'flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all',
                        form.subjectIds.includes(sub.id)
                          ? 'border-brand-500 bg-brand-50 shadow-sm'
                          : 'border-surface-200 hover:border-surface-300 hover:bg-surface-50'
                      )}
                    >
                      <input
                        type="checkbox"
                        className="checkbox"
                        checked={form.subjectIds.includes(sub.id)}
                        onChange={() => toggleSubject(sub.id)}
                      />
                      <div>
                        <div className="text-sm font-semibold text-surface-900">{sub.name}</div>
                        {sub._count && (
                          <div className="text-xs text-surface-500 mt-0.5">{sub._count.chapters} chapters</div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ═══ STEP 3: Chapters ═══ */}
          {step === 3 && (
            <div className="card p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="section-heading flex items-center gap-2 mb-0">
                  <ListChecks className="w-5 h-5 text-brand-600" />
                  Select Chapters
                </h2>
                <button
                  onClick={toggleAllChapters}
                  className="text-sm text-brand-600 hover:text-brand-700 font-semibold"
                >
                  {form.chapterIds.length === chapters.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              {loadingChapters ? (
                <div className="flex justify-center py-12"><div className="spinner text-brand-500" /></div>
              ) : chapters.length === 0 ? (
                <div className="text-center py-12 text-surface-500">
                  <BookOpen className="w-12 h-12 mx-auto mb-3 text-surface-300" />
                  <p>No chapters found for selected subjects.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {form.subjectIds.map(sid => {
                    const subjectChapters = chapters.filter(c => c.subjectId === sid);
                    const subjectName = subjects.find(s => s.id === sid)?.name || '';
                    if (subjectChapters.length === 0) return null;
                    return (
                      <div key={sid}>
                        <p className="text-xs font-bold text-surface-500 uppercase tracking-wider mb-2">{subjectName}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {subjectChapters.map(ch => (
                            <label
                              key={ch.id}
                              className={clsx(
                                'flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all',
                                form.chapterIds.includes(ch.id)
                                  ? 'border-brand-400 bg-brand-50'
                                  : 'border-surface-200 hover:border-surface-300 hover:bg-surface-50'
                              )}
                            >
                              <input
                                type="checkbox"
                                className="checkbox flex-shrink-0"
                                checked={form.chapterIds.includes(ch.id)}
                                onChange={() => toggleChapter(ch.id)}
                              />
                              <div className="min-w-0">
                                <span className="text-sm font-medium text-surface-900">
                                  Ch {ch.number}. {ch.name}
                                </span>
                                {ch._count && (
                                  <span className="ml-2 text-xs text-surface-400 font-medium">
                                    {ch._count.questions} questions
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
            </div>
          )}

          {/* ═══ STEP 4: Language ═══ */}
          {step === 4 && (
            <div className="card p-6 space-y-6">
              <h2 className="section-heading flex items-center gap-2">
                <Languages className="w-5 h-5 text-brand-600" />
                Medium of Instruction
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { value: 'english', label: 'English Medium', desc: 'Paper will be in English' },
                  { value: 'urdu', label: 'Urdu Medium', desc: 'اردو میں پرچہ — RTL layout' },
                  { value: 'bilingual', label: 'Dual Medium', desc: 'Both English and Urdu' },
                ].map(m => (
                  <button
                    key={m.value}
                    onClick={() => setForm(f => ({ ...f, medium: m.value as Medium }))}
                    className={clsx(
                      'p-5 rounded-xl border-2 text-left transition-all',
                      form.medium === m.value
                        ? 'border-brand-500 bg-brand-50 shadow-sm'
                        : 'border-surface-200 hover:border-surface-300 hover:bg-surface-50'
                    )}
                  >
                    <div className="text-base font-bold text-surface-900 mb-1">{m.label}</div>
                    <div className="text-xs text-surface-500">{m.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ═══ STEP 5: Pattern & Marks ═══ */}
          {step === 5 && (
            <div className="card p-6 space-y-6">
              <h2 className="section-heading flex items-center gap-2">
                <Settings className="w-5 h-5 text-brand-600" />
                Question Distribution & Marks
              </h2>

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

              {/* Question types */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {(['mcq', 'short', 'essay'] as const).map(type => (
                  <div key={type} className="bg-surface-50 rounded-2xl p-5 border border-surface-200">
                    <div className="text-xs font-bold text-surface-500 uppercase tracking-wider mb-4">
                      {type === 'mcq' ? 'MCQs' : type === 'short' ? 'Short Questions' : 'Essay Questions'}
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-surface-500 font-medium">Count</label>
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
                        <label className="text-xs text-surface-500 font-medium">Marks each</label>
                        <input
                          type="number"
                          min={1}
                          max={20}
                          className="input mt-1"
                          value={form[type].marks}
                          onChange={e => setForm(f => ({ ...f, [type]: { ...f[type], marks: Number(e.target.value) } }))}
                        />
                      </div>
                      <div className="text-sm font-bold text-brand-600 pt-2 border-t border-surface-200">
                        = {form[type].count * form[type].marks} marks
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total marks */}
              <div className="px-5 py-4 bg-brand-50 rounded-xl flex items-center justify-between border border-brand-100">
                <span className="text-sm text-brand-700 font-semibold">Total Marks</span>
                <span className="text-2xl font-bold text-brand-900 font-display">{totalMarks}</span>
              </div>

              {/* Time Limit */}
              <div>
                <label className="label">Time Limit</label>
                <div className="flex gap-2 flex-wrap">
                  {[30, 45, 60, 90, 120, 180].map(t => (
                    <button
                      key={t}
                      onClick={() => setForm(f => ({ ...f, timeLimit: t }))}
                      className={clsx(
                        'px-4 py-2.5 rounded-xl text-sm font-medium border-2 transition-all',
                        form.timeLimit === t
                          ? 'border-brand-500 bg-brand-50 text-brand-700'
                          : 'border-surface-200 hover:border-surface-300 text-surface-700'
                      )}
                    >
                      {t} min
                    </button>
                  ))}
                </div>
              </div>

              {/* Options */}
              <div className="space-y-4 pt-2">
                <Toggle checked={form.randomize} onChange={v => setForm(f => ({ ...f, randomize: v }))} label="Randomize questions" desc="Shuffle questions randomly for exam integrity" />
                <Toggle checked={form.showAnswerKey} onChange={v => setForm(f => ({ ...f, showAnswerKey: v }))} label="Include answer key" desc="Add MCQ answer key page to the PDF" />
                <Toggle checked={form.showBubbleSheet} onChange={v => setForm(f => ({ ...f, showBubbleSheet: v }))} label="Include OMR bubble sheet" desc="Add bubble sheet for MCQ answers" />
                <Toggle checked={form.blankLines.enabled} onChange={v => setForm(f => ({ ...f, blankLines: { ...f.blankLines, enabled: v } }))} label="Add blank answer lines" desc="Include lines for short/essay answers" />
              </div>
            </div>
          )}

          {/* ═══ STEP 6: School Branding ═══ */}
          {step === 6 && (
            <div className="card p-6 space-y-6">
              <h2 className="section-heading flex items-center gap-2">
                <School className="w-5 h-5 text-brand-600" />
                School Branding
              </h2>
              <div>
                <label className="label">School / Institution Name</label>
                <input
                  className="input"
                  value={form.schoolName}
                  onChange={e => setForm(f => ({ ...f, schoolName: e.target.value }))}
                  placeholder="e.g. Government High School, Lahore"
                />
                <p className="text-xs text-surface-500 mt-1.5">This will appear in the paper header on every generated PDF.</p>
              </div>
            </div>
          )}

          {/* ═══ STEP 7: Review & Generate ═══ */}
          {step === 7 && (
            <div className="space-y-5">
              <div className="card p-6">
                <h2 className="section-heading flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-brand-600" />
                  Review Your Paper
                </h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  <ReviewRow label="Class" value={classes.find(c => c.id === form.classId)?.name || ''} />
                  <ReviewRow label="Medium" value={form.medium} capitalize />
                  <ReviewRow label="Subjects" value={subjects.filter(s => form.subjectIds.includes(s.id)).map(s => s.name).join(', ')} />
                  <ReviewRow label="Chapters" value={`${form.chapterIds.length} selected`} />
                  <ReviewRow label="MCQs" value={`${form.mcq.count} × ${form.mcq.marks} = ${form.mcq.count * form.mcq.marks}`} />
                  <ReviewRow label="Short Qs" value={`${form.short.count} × ${form.short.marks} = ${form.short.count * form.short.marks}`} />
                  <ReviewRow label="Essay Qs" value={`${form.essay.count} × ${form.essay.marks} = ${form.essay.count * form.essay.marks}`} />
                  <ReviewRow label="Time Limit" value={`${form.timeLimit} minutes`} />
                  <ReviewRow label="School" value={form.schoolName || 'Not set'} />
                  <ReviewRow label="Randomized" value={form.randomize ? 'Yes' : 'No'} />
                </div>

                <div className="mt-6 pt-5 border-t border-surface-100 flex items-center justify-between">
                  <div>
                    <div className="text-3xl font-bold text-brand-600 font-display">{totalMarks}</div>
                    <div className="text-sm text-surface-500">Total marks</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-semibold text-surface-900">{form.timeLimit} min</div>
                    <div className="text-sm text-surface-500">Duration</div>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
                <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">
                  The system will select questions from your chosen chapters. If there aren't enough questions, you'll be notified.
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* ═══ NAVIGATION ═══ */}
      <div className="flex items-center justify-between mt-8">
        <button
          onClick={() => setStep(s => Math.max(1, s - 1))}
          disabled={step === 1}
          className="btn-secondary"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>

        {step < STEPS.length ? (
          <button
            onClick={() => setStep(s => s + 1)}
            disabled={!canProceed()}
            className="btn-primary"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="btn-primary btn-lg"
          >
            {isGenerating ? (
              <><span className="spinner" /> Generating Paper...</>
            ) : (
              <><Zap className="w-5 h-5" /> Generate Paper</>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, label, desc }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; desc: string;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={clsx('relative mt-0.5 w-11 h-6 rounded-full transition-colors flex-shrink-0', checked ? 'bg-brand-600' : 'bg-surface-200')}
      >
        <div className={clsx(
          'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform',
          checked && 'translate-x-5'
        )} />
      </button>
      <div>
        <div className="text-sm font-medium text-surface-900">{label}</div>
        <div className="text-xs text-surface-500">{desc}</div>
      </div>
    </label>
  );
}

function ReviewRow({ label, value, capitalize }: { label: string; value: string; capitalize?: boolean }) {
  return (
    <div className="flex justify-between gap-4 py-2.5 border-b border-surface-50">
      <span className="text-sm text-surface-500">{label}</span>
      <span className={clsx('text-sm font-semibold text-surface-900 text-right', capitalize && 'capitalize')}>{value}</span>
    </div>
  );
}
