/**
 * PHASE 2 — API client for /api/v2 (question bank, catalog scope, paper
 * generator v2, patterns). Uses the shared axios instance (auth + refresh
 * interceptors from client.ts).
 */
import api from './client';
import type { CourseV2, GeneratePaperPayload, PreviewPoolPayload, PreviewPoolResult } from '../types';

export interface QuestionFiltersV2 {
  page?: number; limit?: number; search?: string;
  courseId?: number; sessionId?: number; classId?: number; subjectId?: number; bookId?: number;
  chapterId?: number; topicId?: number; exerciseId?: number;
  type?: string; language?: string; marksEq?: number; marksMin?: number; marksMax?: number;
  difficulty?: string; status?: string; category?: string; source?: string; tag?: string;
  sortBy?: string; sortDir?: 'asc' | 'desc';
}

export const v2 = {
  // ─── catalog scope (wizard + filter data) ─────────────────────────────────
  catalog: {
    courses: () => api.get<{ data: CourseV2[] }>('/v2/catalog/courses'),
    courseSessions: (courseId: number) => api.get(`/v2/catalog/courses/${courseId}/sessions`),
    courseClasses: (courseId: number) => api.get(`/v2/catalog/courses/${courseId}/classes`),
    classSubjects: (classId: number, courseId?: number) =>
      api.get(`/v2/catalog/classes/${classId}/subjects`, { params: courseId ? { courseId } : {} }),
    subjectBooks: (subjectId: number, sessionId?: number) =>
      api.get(`/v2/catalog/subjects/${subjectId}/books`, { params: sessionId ? { sessionId } : {} }),
    subjectChapters: (subjectId: number, bookId?: number) =>
      api.get(`/v2/catalog/subjects/${subjectId}/chapters`, { params: bookId ? { bookId } : {} }),
    chapterTopics: (chapterId: number) => api.get(`/v2/catalog/chapters/${chapterId}/topics`),
    chapterExercises: (chapterId: number) => api.get(`/v2/catalog/chapters/${chapterId}/exercises`),
    availability: (params: { chapterIds: number[]; topicIds?: number[]; exerciseIds?: number[]; language?: string; difficulty?: string }) =>
      api.get('/v2/catalog/availability', {
        params: {
          chapterIds: params.chapterIds.join(','),
          topicIds: params.topicIds?.length ? params.topicIds.join(',') : undefined,
          exerciseIds: params.exerciseIds?.length ? params.exerciseIds.join(',') : undefined,
          language: params.language,
          difficulty: params.difficulty,
        },
      }),
  },

  // ─── question bank v2 ─────────────────────────────────────────────────────
  questions: {
    list: (f: QuestionFiltersV2) => api.get('/v2/questions', { params: f }),
    stats: (f: QuestionFiltersV2 = {}) => api.get('/v2/questions/stats', { params: f }),
    get: (id: number) => api.get(`/v2/questions/${id}`),
    create: (data: Record<string, unknown>) => api.post('/v2/questions', data),
    update: (id: number, data: Record<string, unknown>) => api.put(`/v2/questions/${id}`, data),
    archive: (id: number) => api.delete(`/v2/questions/${id}`),
    approve: (id: number) => api.patch(`/v2/questions/${id}/approve`),
    reject: (id: number, reason?: string) => api.patch(`/v2/questions/${id}/reject`, reason ? { reason } : {}),
    bulkStatus: (ids: number[], status: string, reason?: string) =>
      api.patch('/v2/questions/bulk-status', { ids, status, reason }),
    bulkImport: (questions: Record<string, unknown>[]) => api.post('/v2/questions/bulk', { questions }),
    duplicate: (id: number) => api.post(`/v2/questions/${id}/duplicate`),
    exportUrl: (f: QuestionFiltersV2 = {}, format: 'csv' | 'json' = 'json') => {
      const p = new URLSearchParams({ format });
      (Object.entries(f) as Array<[string, any]>).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') p.set(k, String(v));
      });
      return `/api/v2/questions/export?${p.toString()}`;
    },
  },

  // ─── paper generator v2 ───────────────────────────────────────────────────
  papers: {
    generate: (payload: GeneratePaperPayload) => api.post('/v2/papers', payload),
    list: (f: { page?: number; limit?: number; status?: string; courseId?: number; classId?: number; subjectId?: number; search?: string } = {}) =>
      api.get('/v2/papers', { params: f }),
    get: (id: number) => api.get(`/v2/papers/${id}`),
    update: (id: number, data: { title?: string; status?: string; examTitle?: string; description?: string; totalMarks?: number }) =>
      api.put(`/v2/papers/${id}`, data),
    updateFormatting: (id: number, data: { schoolName?: string | null; headerNote?: string | null }) =>
      api.put(`/v2/papers/${id}/formatting`, data),
    replaceQuestions: (id: number, data: { questionIds: number[]; marksByQuestion?: Record<string, number> }) =>
      api.put(`/v2/papers/${id}/questions`, data),
    duplicate: (id: number) => api.post(`/v2/papers/${id}/duplicate`),
    remove: (id: number) => api.delete(`/v2/papers/${id}`),
    previewPool: (payload: PreviewPoolPayload) =>
      api.post<{ data: PreviewPoolResult }>('/v2/papers/preview-pool', payload),
  },

  // ─── paper patterns ───────────────────────────────────────────────────────
  patterns: {
    list: () => api.get('/v2/patterns'),
    get: (id: number) => api.get(`/v2/patterns/${id}`),
    create: (data: { name: string; description?: string; config: Record<string, unknown>; isShared?: boolean }) =>
      api.post('/v2/patterns', data),
    update: (id: number, data: { name?: string; description?: string; config?: Record<string, unknown>; isShared?: boolean }) =>
      api.put(`/v2/patterns/${id}`, data),
    remove: (id: number) => api.delete(`/v2/patterns/${id}`),
  },
};
