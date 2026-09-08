import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { papersApi } from '../../api/papers';
import { Paper, PaperStatus } from '../../types';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { StatusBadge, Tabs } from '../../components/ui';
import {
  ArrowLeft, Download, Edit3, Check, X, BookOpen,
  Clock, Award, FileText, Eye, Archive, Settings,
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
  const [activeTab, setActiveTab] = useState('preview');
  const [saving, setSaving] = useState(false);
  const [formatting, setFormatting] = useState<any>({});

  useEffect(() => {
    papersApi.get(paperId)
      .then(r => {
        setPaper(r.data.data);
        setFormatting(r.data.data.paperFormatting || {});
      })
      .catch(() => { toast.error('Paper not found'); navigate('/app/papers'); })
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
      <div className="spinner-lg text-brand-500" />
    </div>
  );

  if (!paper) return null;

  const mcqQs   = paper.paperQuestions.filter(pq => pq.question.type === 'mcq').sort((a, b) => a.order - b.order);
  const shortQs = paper.paperQuestions.filter(pq => pq.question.type === 'short').sort((a, b) => a.order - b.order);
  const essayQs = paper.paperQuestions.filter(pq => pq.question.type === 'essay').sort((a, b) => a.order - b.order);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link to="/app/papers" className="btn-ghost p-2.5 mt-0.5">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 min-w-0">
          {editingTitle ? (
            <div className="flex items-center gap-2">
              <input
                className="input text-xl font-bold py-1.5"
                value={titleInput}
                onChange={e => setTitleInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveTitle()}
                autoFocus
              />
              <button onClick={saveTitle} disabled={saving} className="btn-primary btn-sm">
                <Check className="w-4 h-4" />
              </button>
              <button onClick={() => setEditingTitle(false)} className="btn-secondary btn-sm">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="page-title truncate">{paper.title}</h1>
              <button
                onClick={() => { setTitleInput(paper.title); setEditingTitle(true); }}
                className="text-surface-400 hover:text-surface-600 transition-colors"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            </div>
          )}
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <StatusBadge status={paper.status} />
            <span className="text-sm text-surface-500">
              {paper.class.name} · {paper.paperSubjects.map(ps => ps.subject.name).join(', ')}
            </span>
            <span className="text-sm text-surface-400">
              {format(new Date(paper.createdAt), 'dd MMM yyyy')}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {paper.status === 'draft' && (
            <button onClick={() => updateStatus('final')} disabled={saving} className="btn-success btn-sm">
              <Check className="w-4 h-4" /> Finalize
            </button>
          )}
          <a href={papersApi.getPreviewUrl(paperId)} target="_blank" rel="noreferrer" className="btn-secondary btn-sm">
            <Eye className="w-4 h-4" /> Preview
          </a>
          <a href={papersApi.getDownloadUrl(paperId)} target="_blank" rel="noreferrer" className="btn-primary btn-sm">
            <Download className="w-4 h-4" /> PDF
          </a>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: Award, label: 'Total Marks', value: paper.totalMarks, color: 'text-brand-600 bg-brand-50' },
          { icon: Clock, label: 'Duration', value: `${paper.timeLimit} min`, color: 'text-emerald-600 bg-emerald-50' },
          { icon: FileText, label: 'Questions', value: paper.paperQuestions.length, color: 'text-purple-600 bg-purple-50' },
          { icon: BookOpen, label: 'Medium', value: paper.medium, color: 'text-amber-600 bg-amber-50', capitalize: true },
        ].map(stat => (
          <div key={stat.label} className="card p-4 flex items-center gap-3">
            <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', stat.color)}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div>
              <div className={clsx('text-sm font-bold text-surface-900', stat.capitalize && 'capitalize')}>{stat.value}</div>
              <div className="text-xs text-surface-500">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          { key: 'preview', label: 'Paper Preview', icon: Eye },
          { key: 'formatting', label: 'Formatting', icon: Settings },
        ]}
        active={activeTab}
        onChange={setActiveTab}
      />

      {/* Preview */}
      {activeTab === 'preview' && (
        <div className="card p-8 max-w-3xl mx-auto" style={{ fontFamily: formatting.fontFamily || 'Arial' }}>
          <div className="text-center border-b-2 border-surface-900 pb-4 mb-5">
            <div className="text-xl font-bold uppercase tracking-wide">
              {formatting.schoolName || paper.paperFormatting?.schoolName || 'School Name'}
            </div>
            <div className="font-semibold mt-1">{paper.title}</div>
            <div className="text-sm text-surface-600 mt-1">
              {paper.paperSubjects.map(ps => ps.subject.name).join(', ')} · {paper.medium.charAt(0).toUpperCase() + paper.medium.slice(1)} Medium
            </div>
            <div className="grid grid-cols-3 border border-surface-900 mt-3 text-sm">
              <div className="border-r border-surface-900 p-2 text-center">
                <div className="text-xs text-surface-500">Class</div>
                <div className="font-bold">{paper.class.name}</div>
              </div>
              <div className="border-r border-surface-900 p-2 text-center">
                <div className="text-xs text-surface-500">Total Marks</div>
                <div className="font-bold">{paper.totalMarks}</div>
              </div>
              <div className="p-2 text-center">
                <div className="text-xs text-surface-500">Time</div>
                <div className="font-bold">{paper.timeLimit} min</div>
              </div>
            </div>
          </div>

          {/* Student Info */}
          <div className="grid grid-cols-3 border border-surface-900 text-sm mb-5">
            <div className="border-r border-surface-900 p-2">Name: <span className="inline-block w-24 border-b border-surface-400" /></div>
            <div className="border-r border-surface-900 p-2">Roll No: <span className="inline-block w-16 border-b border-surface-400" /></div>
            <div className="p-2">Date: <span className="inline-block w-20 border-b border-surface-400" /></div>
          </div>

          {/* Section A: MCQs */}
          {mcqQs.length > 0 && (
            <div className="mb-6">
              <div className="bg-surface-100 px-3 py-2 font-bold text-sm border-b border-surface-300 mb-3">
                Section A — Multiple Choice Questions
                <span className="float-right font-normal text-surface-600">
                  ({mcqQs.length} × {paper.paperSettings?.mcqMarks || 1} = {mcqQs.length * (paper.paperSettings?.mcqMarks || 1)} Marks)
                </span>
              </div>
              <div className="space-y-3">
                {mcqQs.map((pq, i) => (
                  <div key={pq.id} className="text-sm">
                    <div className="font-medium">Q{i + 1}. {pq.question.text}</div>
                    {pq.question.options && (
                      <div className="grid grid-cols-2 gap-x-4 mt-1 ml-4 text-surface-700">
                        {(pq.question.options as string[]).map((opt, oi) => (
                          <div key={oi}><span className="font-medium">{String.fromCharCode(65 + oi)}.</span> {opt}</div>
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
              <div className="bg-surface-100 px-3 py-2 font-bold text-sm border-b border-surface-300 mb-3">
                Section B — Short Questions
                <span className="float-right font-normal text-surface-600">
                  ({shortQs.length} × {paper.paperSettings?.shortMarks || 3} = {shortQs.length * (paper.paperSettings?.shortMarks || 3)} Marks)
                </span>
              </div>
              <div className="space-y-3">
                {shortQs.map((pq, i) => (
                  <div key={pq.id} className="text-sm font-medium">Q{i + 1}. {pq.question.text}</div>
                ))}
              </div>
            </div>
          )}

          {/* Section C: Essay */}
          {essayQs.length > 0 && (
            <div className="mb-6">
              <div className="bg-surface-100 px-3 py-2 font-bold text-sm border-b border-surface-300 mb-3">
                Section C — Essay / Long Questions
                <span className="float-right font-normal text-surface-600">
                  ({essayQs.length} × {paper.paperSettings?.essayMarks || 10} = {essayQs.length * (paper.paperSettings?.essayMarks || 10)} Marks)
                </span>
              </div>
              <div className="space-y-4">
                {essayQs.map((pq, i) => (
                  <div key={pq.id} className="text-sm font-medium">Q{i + 1}. {pq.question.text}</div>
                ))}
              </div>
            </div>
          )}

          {/* Answer Key */}
          {paper.paperSettings?.showAnswerKey && mcqQs.some(pq => pq.question.answer) && (
            <div className="mt-8 pt-5 border-t-2 border-dashed border-surface-300">
              <div className="font-bold text-sm mb-3">Answer Key — MCQs</div>
              <div className="grid grid-cols-5 gap-1.5">
                {mcqQs.map((pq, i) => (
                  <div key={pq.id} className="text-center bg-surface-50 border border-surface-200 rounded-lg p-1.5">
                    <div className="text-xs text-surface-500">Q{i + 1}</div>
                    <div className="font-bold text-sm">{pq.question.answer || '—'}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 pt-4 border-t border-surface-100 text-center text-xs text-surface-400">
            Generated by Pak Test Software · {format(new Date(paper.createdAt), 'dd MMM yyyy')}
          </div>
        </div>
      )}

      {/* Formatting */}
      {activeTab === 'formatting' && (
        <div className="card p-6 max-w-2xl space-y-5">
          <h2 className="section-heading">PDF Formatting</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">School Name</label>
              <input className="input" value={formatting.schoolName || ''} onChange={e => setFormatting((f: any) => ({ ...f, schoolName: e.target.value }))} />
            </div>
            <div>
              <label className="label">Font Family</label>
              <select className="select" value={formatting.fontFamily || 'Arial'} onChange={e => setFormatting((f: any) => ({ ...f, fontFamily: e.target.value }))}>
                <option value="Arial">Arial</option>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Georgia">Georgia</option>
                <option value="Calibri">Calibri</option>
              </select>
            </div>
            <div>
              <label className="label">Font Size (pt)</label>
              <input type="number" className="input" value={formatting.fontSize || 12} onChange={e => setFormatting((f: any) => ({ ...f, fontSize: Number(e.target.value) }))} min={9} max={16} />
            </div>
            <div>
              <label className="label">Line Height</label>
              <select className="select" value={formatting.lineHeight || 1.5} onChange={e => setFormatting((f: any) => ({ ...f, lineHeight: Number(e.target.value) }))}>
                <option value={1.2}>Compact (1.2)</option>
                <option value={1.5}>Normal (1.5)</option>
                <option value={1.8}>Relaxed (1.8)</option>
                <option value={2.0}>Double (2.0)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Footer Note</label>
            <input className="input" value={formatting.footerNote || ''} onChange={e => setFormatting((f: any) => ({ ...f, footerNote: e.target.value }))} placeholder="e.g. Best of luck!" />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={saveFormatting} disabled={saving} className="btn-primary">
              {saving ? <span className="spinner" /> : <Check className="w-4 h-4" />} Save
            </button>
            <a href={papersApi.getPreviewUrl(paperId)} target="_blank" rel="noreferrer" className="btn-secondary">
              <Eye className="w-4 h-4" /> Preview PDF
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
