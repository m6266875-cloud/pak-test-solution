/**
 * PHASE 4 — API client for /api/v4 (5-step wizard backend, role dashboards,
 * syllabus cleanup). Shares the axios instance (auth + refresh).
 */
import api from './client';
import type { DistributionInput, PaperTypeV2 } from '../types';

export interface WizardScopeBody {
  courseId?: number | null;
  classId: number;
  subjectId: number;
  bookId?: number | null;
  chapterIds: number[];
  exerciseIds?: number[];
  paperType: PaperTypeV2;
  language: 'english' | 'urdu' | 'bilingual';
}

export interface CandidateQuestion {
  id: number; type: string; text: string; options: any; marks: number;
  difficulty: string; language: string; chapterId: number;
  chapterNo: number; chapterName: string; exerciseId: number | null; exerciseNo: number | null;
}

export interface CandidatesPayload {
  rows: CandidateQuestion[];
  pagination: { page: number; limit: number; total: number };
  availableByType: Record<string, number>;
  preselected: { type: string; count: number; marks: number; selected: number; ids: number[]; rows: CandidateQuestion[] }[];
  totals: { requiredMarks: number; preselectedMarks: number; matched: boolean };
}

export interface ChapterRow {
  id: number; number: number; name: string; verified: boolean;
  approved: number; total: number;
  exercises: { id: number; number: number; name: string; approved: number }[];
}

export const v4 = {
  wizard: {
    chapters: (subjectId: number, bookId?: number | null) =>
      api.get<{ data: ChapterRow[] }>('/v4/wizard/chapters', { params: { subjectId, bookId: bookId ?? undefined } }),
    candidates: (body: WizardScopeBody & { distribution: DistributionInput[]; seed?: number; page?: number; limit?: number; search?: string }) =>
      api.post<{ data: CandidatesPayload }>('/v4/wizard/candidates', body),
    search: (body: WizardScopeBody & { type?: string; page?: number; limit?: number; search?: string }) =>
      api.post<{ data: { rows: CandidateQuestion[]; pagination: { page: number; limit: number; total: number } } }>('/v4/wizard/search', body),
    generate: (body: WizardScopeBody & {
      distribution: DistributionInput[]; totalMarks: number; timeLimit?: number;
      title?: string; examTitle?: string; questionIds: number[]; status?: 'draft' | 'final';
    }) => api.post<{ data: { paper: any; warnings: string[] } }>('/v4/wizard/generate', body),
  },
  dashboard: () => api.get<{ data: any }>('/v4/dashboard'),
  cleanup: (apply: boolean) => api.post<{ data: any }>(`/v4/catalog/cleanup?apply=${apply ? 1 : 0}`),
};
