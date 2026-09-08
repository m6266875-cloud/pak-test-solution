import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { papersApi } from '../../api/papers';
import { Paper, PaperStatus } from '../../types';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Download, Edit3, Check, X, BookOpen,
  Clock, Award, FileText, Eye, Printer, Settings, Archive,
} from 'lucide-react';
import clsx from 'clsx';

export default function PaperDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const paperId = Number(id);

  const [paper, setPaper] = useState<Paper | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const [activeTab, setActiveTab] = useState<'preview' | 'formatting' | 'settings'>('preview');
  const [saving, setSaving] = useState(false);
  const [formatting, setFormatting] = useState<any>({});

  useEffect(() => {
    papersApi.get(paperId)
      .then(r => {
        setPaper(r.data.data);
        setFormatting(r.data.data.paperFormatting || {});
      })
      .catch(() => { toast.error('Paper not found'); navigate('/papers'); })
      .finally(() => setLoading(false));
  }, [paperId]);

  const saveTitle = async () => {
    if (!titleInput.trim() || !paper) return;
    setSaving(true);
    try {
      await papersApi.update(paperId, { title: titleInput });
      setPaper(p => p ? { ...p, title: titleInput } : p);
      toast.success('Title updated');
    } catch { toast.error('Failed to update title'); }
    finally { setSaving(false); setEditingTitle(false); }
  };

  const updateStatus = async (status: PaperStatus) => {
    setSaving(true);
    try {
      await papersApi.update(paperId, { status });
      setPaper(p => p ? { ...p, status } : p);
      toast.success(`Paper marked as ${status}`);
    } catch { toast.error('Failed to update status'); }
    finally { setSaving(false); }
  };

  const saveFormatting = async () => {
    setSaving(true);
    try {
      await papersApi.updateFormatting(paperId, formatting);
      toast.success('Formatting saved');
    } catch { toast.error('Failed to save formatting'); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-96">
      <div className="spinner text-primary-500 w-8 h-8" />
    </div>
  );

  if (!paper) return null;

  const mcqQs   = paper.paperQuestions.filter(pq => pq.question.type === 'mcq').sort((a, b) => a.order - b.order);
  const shortQs = paper.paperQuestions.filter(pq => pq.question.type === 'short').sort((a, b) => a.order - b.order);
  const essayQs = paper.paperQuestions.filter(pq => pq.question.type === 'essay').sort((a, b) => a.order - b.order);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link to="/app/papers" className="btn-ghost mt-0.5 p-2">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 min-w-0">
          {editingTitle ? (
            <div className="flex items-center gap-2">
              <input
                className="input text-xl font-bold py-1"
                value={titleInput}
                onChange={e => setTitleInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveTitle()}
                autoFocus
              />
              <button onClick={saveTitle} disabled={saving} className="btn-primary py-1.5 px-3">
                <Check className="w-4 h-4" />
              </button>
              <button onClick={() => setEditingTitle(false)} className="btn-secondary py-1.5 px-3">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900 truncate">{paper.title}</h1>
              <button
                onClick={() => { setTitleInput(paper.title); setEditingTitle(true); }}
                className="text-gray-400 hover:text-gray-600"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            </div>
          )}
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <StatusBadge status={paper.status} />
            <span className="text-sm text-gray-500">
              {paper.class.name} · {paper.paperSubjects.map(ps => ps.subject.name).join(', ')}
            </span>
            <span className="text-sm text-gray-400">
              Created {format(new Date(paper.createdAt), 'dd MMM yyyy')}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {paper.status === 'draft' && (
            <button
              onClick={() => updateStatus('final')}
              disabled={saving}
              className="btn-secondary text-sm"
            >
              <Check className="w-4 h-4" /> Mark Final
            </button>
          )}
          {paper.status !== 'archived' && (
            <button
              onClick={() => updateStatus('archived')}
              disabled={saving}
              className="btn-ghost text-sm"
            >
              <Archive className="w-4 h-4" />
            </button>
          )}
          <a
            href={papersApi.getPreviewUrl(paperId)}
            target="_blank"
            rel="noreferrer"
            className="btn-secondary text-sm"
          >
            <Eye className="w-4 h-4" /> Preview
          </a>
          <a
            href={papersApi.getDownloadUrl(paperId)}
            target="_blank"
            rel="noreferrer"
            className="btn-primary text-sm"
          >
            <Download className="w-4 h-4" /> Download PDF
          </a>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-3">
        <MiniStat icon={Award} label="Total Marks" value={paper.totalMarks} color="text-blue-600" />
        <MiniStat icon={Clock} label="Duration" value={`${paper.timeLimit} min`} color="text-green-600" />
        <MiniStat icon={FileText} label="Questions" value={paper.paperQuestions.length} color="text-purple-600" />
        <MiniStat icon={BookOpen} label="Medium" value={paper.medium} color="text-amber-600" capitalize />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {[
          { key: 'preview', label: 'Paper Preview', icon: Eye },
          { key: 'formatting', label: 'Formatting', icon: Settings },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === tab.key
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Preview Tab */}
      {activeTab === 'preview' && (
        <div className="card p-8 max-w-3xl mx-auto" style={{ fontFamily: formatting.fontFamily || 'Arial' }}>
          {/* Paper Header */}
          <div className="text-center border-b-2 border-black pb-4 mb-5">
            <div className="text-xl font-bold uppercase tracking-wide">
              {formatting.schoolName || paper.paperFormatting?.schoolName || 'School Name'}
            </div>
            <div className="font-semibold mt-1">{paper.title}</div>
            <div className="text-sm text-gray-600 mt-1">
              {paper.paperSubjects.map(ps => ps.subject.name).join(', ')} · {paper.medium.charAt(0).toUpperCase() + paper.medium.slice(1)} Medium
            </div>
            <div className="grid grid-cols-3 border border-black mt-3 text-sm">
              <div className="border-r border-black p-2 text-center">
                <div className="text-xs text-gray-500">Class</div>
                <div className="font-bold">{paper.class.name}</div>
              </div>
              <div className="border-r border-black p-2 text-center">
                <div className="text-xs text-gray-500">Total Marks</div>
                <div className="font-bold">{paper.totalMarks}</div>
              </div>
              <div className="p-2 text-center">
                <div className="text-xs text-gray-500">Time</div>
                <div className="font-bold">{paper.timeLimit} min</div>
              </div>
            </div>
          </div>

          {/* Student Info */}
          <div className="grid grid-cols-3 border border-black text-sm mb-5">
            <div className="border-r border-black p-2">Name: <span className="inline-block w-24 border-b border-black" /></div>
            <div className="border-r border-black p-2">Roll No: <span className="inline-block w-16 border-b border-black" /></div>
            <div className="p-2">Date: <span className="inline-block w-20 border-b border-black" /></div>
          </div>

          {/* Section A: MCQs */}
          {mcqQs.length > 0 && (
            <div className="mb-6">
              <div className="bg-gray-100 px-3 py-2 font-bold text-sm border-b border-gray-300 mb-3">
                Section A — Multiple Choice Questions
                <span className="float-right font-normal text-gray-600">
                  ({mcqQs.length} × {paper.paperSettings?.mcqMarks || 1} = {mcqQs.length * (paper.paperSettings?.mcqMarks || 1)} Marks)
                </span>
              </div>
              <div className="space-y-3">
                {mcqQs.map((pq, i) => (
                  <div key={pq.id} className="text-sm">
                    <div className="font-medium">Q{i + 1}. {pq.question.text}</div>
                    {pq.question.options && (
                      <div className="grid grid-cols-2 gap-x-4 mt-1 ml-4 text-gray-700">
                        {(pq.question.options as string[]).map((opt, oi) => (
                          <div key={oi}>
                            <span className="font-medium">{String.fromCharCode(65 + oi)}.</span> {opt}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section B: Short */}
          {shortQs.length > 0 && (
            <div className="mb-6">
              <div className="bg-gray-100 px-3 py-2 font-bold text-sm border-b border-gray-300 mb-3">
                Section B — Short Questions
                <span className="float-right font-normal text-gray-600">
                  ({shortQs.length} × {paper.paperSettings?.shortMarks || 3} = {shortQs.length * (paper.paperSettings?.shortMarks || 3)} Marks)
                </span>
              </div>
              <div className="space-y-3">
                {shortQs.map((pq, i) => (
                  <div key={pq.id} className="text-sm">
                    <div className="font-medium">Q{i + 1}. {pq.question.text}</div>
                    {paper.paperSettings?.blankLines?.enabled && paper.paperSettings.blankLines.forShort && (
                      <div className="mt-2 space-y-3">
                        {[...Array(4)].map((_, j) => (
                          <div key={j} className="border-b border-dotted border-gray-300 h-5" />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section C: Essay */}
          {essayQs.length > 0 && (
            <div className="mb-6">
              <div className="bg-gray-100 px-3 py-2 font-bold text-sm border-b border-gray-300 mb-3">
                Section C — Essay / Long Questions
                <span className="float-right font-normal text-gray-600">
                  ({essayQs.length} × {paper.paperSettings?.essayMarks || 10} = {essayQs.length * (paper.paperSettings?.essayMarks || 10)} Marks)
                </span>
              </div>
              <div className="space-y-4">
                {essayQs.map((pq, i) => (
                  <div key={pq.id} className="text-sm">
                    <div className="font-medium">Q{i + 1}. {pq.question.text}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Answer Key */}
          {paper.paperSettings?.showAnswerKey && mcqQs.some(pq => pq.question.answer) && (
            <div className="mt-8 pt-5 border-t-2 border-dashed border-gray-300">
              <div className="font-bold text-sm mb-3">Answer Key — MCQs</div>
              <div className="grid grid-cols-5 gap-1.5">
                {mcqQs.map((pq, i) => (
                  <div key={pq.id} className="text-center bg-gray-50 border border-gray-200 rounded p-1.5">
                    <div className="text-xs text-gray-500">Q{i + 1}</div>
                    <div className="font-bold text-sm">{pq.question.answer || '—'}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 pt-4 border-t border-gray-100 text-center text-xs text-gray-400">
            Generated by Pak Test Solution · {format(new Date(paper.createdAt), 'dd MMM yyyy')}
          </div>
        </div>
      )}

      {/* Formatting Tab */}
      {activeTab === 'formatting' && (
        <div className="card p-6 max-w-2xl space-y-5">
          <h2 className="section-heading">PDF Formatting Options</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">School Name (header)</label>
              <input
                className="input"
                value={formatting.schoolName || ''}
                onChange={e => setFormatting((f: any) => ({ ...f, schoolName: e.target.value }))}
                placeholder="Government High School, Lahore"
              />
            </div>
            <div>
              <label className="label">Font Family</label>
              <select
                className="select"
                value={formatting.fontFamily || 'Arial'}
                onChange={e => setFormatting((f: any) => ({ ...f, fontFamily: e.target.value }))}
              >
                <option value="Arial">Arial</option>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Georgia">Georgia</option>
                <option value="Calibri">Calibri</option>
              </select>
            </div>
            <div>
              <label className="label">Font Size (pt)</label>
              <input
                type="number"
                className="input"
                value={formatting.fontSize || 12}
                onChange={e => setFormatting((f: any) => ({ ...f, fontSize: Number(e.target.value) }))}
                min={9}
                max={16}
              />
            </div>
            <div>
              <label className="label">School Name Size (pt)</label>
              <input
                type="number"
                className="input"
                value={formatting.schoolNameSize || 16}
                onChange={e => setFormatting((f: any) => ({ ...f, schoolNameSize: Number(e.target.value) }))}
                min={12}
                max={28}
              />
            </div>
            <div>
              <label className="label">Text Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  className="w-12 h-9 rounded border border-gray-200 cursor-pointer"
                  value={formatting.color || '#000000'}
                  onChange={e => setFormatting((f: any) => ({ ...f, color: e.target.value }))}
                />
                <input
                  className="input flex-1"
                  value={formatting.color || '#000000'}
                  onChange={e => setFormatting((f: any) => ({ ...f, color: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="label">Line Height</label>
              <select
                className="select"
                value={formatting.lineHeight || 1.5}
                onChange={e => setFormatting((f: any) => ({ ...f, lineHeight: Number(e.target.value) }))}
              >
                <option value={1.2}>Compact (1.2)</option>
                <option value={1.5}>Normal (1.5)</option>
                <option value={1.8}>Relaxed (1.8)</option>
                <option value={2.0}>Double (2.0)</option>
              </select>
            </div>
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="checkbox"
                checked={formatting.showBorder || false}
                onChange={e => setFormatting((f: any) => ({ ...f, showBorder: e.target.checked }))}
              />
              <span className="text-sm font-medium text-gray-700">Show border</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="checkbox"
                checked={formatting.bold || false}
                onChange={e => setFormatting((f: any) => ({ ...f, bold: e.target.checked }))}
              />
              <span className="text-sm font-medium text-gray-700">Bold text</span>
            </label>
          </div>

          <div>
            <label className="label">Footer Note (optional)</label>
            <input
              className="input"
              value={formatting.footerNote || ''}
              onChange={e => setFormatting((f: any) => ({ ...f, footerNote: e.target.value }))}
              placeholder="e.g. Best of luck to all students"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={saveFormatting} disabled={saving} className="btn-primary">
              {saving ? <span className="spinner" /> : <Check className="w-4 h-4" />}
              Save Formatting
            </button>
            <a
              href={papersApi.getPreviewUrl(paperId)}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary"
            >
              <Eye className="w-4 h-4" /> Preview PDF
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: PaperStatus }) {
  return (
    <span className={clsx(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
      status === 'final'    && 'bg-green-100 text-green-700',
      status === 'draft'    && 'bg-gray-100 text-gray-600',
      status === 'archived' && 'bg-amber-100 text-amber-700',
    )}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function MiniStat({ icon: Icon, label, value, color, capitalize }: any) {
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className={clsx('w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0', color)}>
        <Icon className="w-4.5 h-4.5 w-[18px] h-[18px]" />
      </div>
      <div>
        <div className={clsx('text-sm font-bold text-gray-900', capitalize && 'capitalize')}>{value}</div>
        <div className="text-xs text-gray-500">{label}</div>
      </div>
    </div>
  );
}
