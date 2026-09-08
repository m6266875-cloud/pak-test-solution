/**
 * PHASE 3 — API client for /api/v3 (schools, user administration, templates,
 * analytics, activity log, generated-papers management, preview & PDF).
 *
 * Uses the shared axios instance (auth + refresh from client.ts) for JSON;
 * PDF downloads use fetch so the blob can keep the Bearer token (axios blobs
 * would lose error JSON for the graceful-501 fallback).
 */
import api from './client';
import { store } from '../store';
import type {
  AuditListResultV3, BrandingConfigV3, CatalogOptionsV3, PaperRowV3,
  SchoolDashboardV3, SchoolListResultV3, SchoolV3, TemplateV3, UserListResultV3,
  UserRowV3, AnalyticsOverviewV3, PaperActivityV3, TopListsV3,
} from '../types';

export interface PaperFiltersV3 {
  page?: number; limit?: number; status?: string; courseId?: number; classId?: number;
  subjectId?: number; schoolId?: number; teacherId?: number; search?: string;
  from?: string; to?: string;
}
export interface AuditFiltersV3 {
  page?: number; limit?: number; action?: string; entity?: string;
  userId?: number; schoolId?: number; from?: string; to?: string; search?: string;
}
export interface SchoolInputV3 {
  name?: string; code?: string; email?: string | null; phone?: string | null;
  address?: string | null; city?: string | null; principal?: string | null;
}
export interface PaperBrandingInputV3 {
  schoolName?: string | null; headerNote?: string | null; footerNote?: string | null;
  instructions?: string | null; date?: string | null;
  showLogo?: boolean; showSchoolName?: boolean; showContact?: boolean;
  watermark?: { enabled?: boolean; opacity?: number; size?: number; position?: string } | null;
  templateId?: number | null;
  fontFamily?: string | null; fontSize?: number | null; lineHeight?: number | null;
  layoutType?: string | null; showBorder?: boolean; color?: string | null;
}

async function downloadWithToken(url: string): Promise<{ ok: boolean; status: number; message?: string }> {
  const token = store.getState().auth.accessToken;
  const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) {
    let message = `Download failed (${res.status})`;
    try {
      const j = await res.json();
      if (j?.message) message = j.message;
    } catch { /* non-json body */ }
    return { ok: false, status: res.status, message };
  }
  const blob = await res.blob();
  const cd = res.headers.get('Content-Disposition') ?? '';
  const m = cd.match(/filename="?([^";]+)"?/i);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = m ? m[1] : 'paper.pdf';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return { ok: true, status: res.status };
}

export const v3 = {
  schools: {
    list: (p: { search?: string; status?: string; page?: number; limit?: number } = {}) =>
      api.get<{ data: SchoolListResultV3 }>('/v3/schools', { params: p }),
    get: (id: number, branding = false) =>
      api.get<{ data: SchoolV3 }>(`/v3/schools/${id}`, { params: { branding: branding ? '1' : undefined } }),
    mine: () => api.get<{ data: { school: SchoolV3 } }>('/v3/schools/mine'),
    create: (data: SchoolInputV3) => api.post<{ data: SchoolV3 }>('/v3/schools', data),
    update: (id: number, data: SchoolInputV3) => api.put<{ data: SchoolV3 }>(`/v3/schools/${id}`, data),
    setStatus: (id: number, status: string) => api.patch(`/v3/schools/${id}/status`, { status }),
    uploadLogo: (id: number, file: File) => {
      const fd = new FormData();
      fd.append('logo', file);
      return api.post(`/v3/schools/${id}/logo`, fd);
    },
    removeLogo: (id: number) => api.delete(`/v3/schools/${id}/logo`),
    getBranding: (id: number) => api.get<{ data: BrandingConfigV3 }>(`/v3/schools/${id}/branding`),
    saveBranding: (id: number, data: BrandingConfigV3) => api.put<{ data: BrandingConfigV3 }>(`/v3/schools/${id}/branding`, data),
    dashboard: (id: number) => api.get<{ data: SchoolDashboardV3 }>(`/v3/schools/${id}/dashboard`),
    logoUrl: (id: number, v?: string) => `/api/v3/schools/${id}/logo${v ? `?v=${v}` : ''}`,
  },
  users: {
    list: (p: { role?: string; schoolId?: number; search?: string; page?: number; limit?: number } = {}) =>
      api.get<{ data: UserListResultV3 }>('/v3/users', { params: p }),
    get: (id: number) => api.get<{ data: UserRowV3 }>(`/v3/users/${id}`),
    createTeacher: (data: Record<string, unknown>) => api.post<{ data: { user: UserRowV3; tempPassword: string | null } }>('/v3/users/teachers', data),
    createAdmin: (data: Record<string, unknown>) => api.post<{ data: { user: UserRowV3; tempPassword: string | null } }>('/v3/users/admins', data),
    update: (id: number, data: Record<string, unknown>) => api.put<{ data: UserRowV3 }>(`/v3/users/${id}`, data),
    resetPassword: (id: number) => api.post<{ data: { id: number; email: string; tempPassword: string } }>(`/v3/users/${id}/password-reset`),
  },
  catalog: {
    options: () => api.get<{ data: CatalogOptionsV3 }>('/v3/catalog/options'),
  },
  templates: {
    list: (schoolId?: number) => api.get<{ data: TemplateV3[] }>('/v3/templates', { params: schoolId ? { schoolId } : {} }),
    get: (id: number) => api.get<{ data: TemplateV3 }>(`/v3/templates/${id}`),
    create: (data: Record<string, unknown>) => api.post<{ data: TemplateV3 }>('/v3/templates', data),
    update: (id: number, data: Record<string, unknown>) => api.put<{ data: TemplateV3 }>(`/v3/templates/${id}`, data),
    remove: (id: number) => api.delete(`/v3/templates/${id}`),
    forSchool: (schoolId?: number) => api.get<{ data: TemplateV3[] }>('/v3/templates/forSchool', { params: schoolId ? { schoolId } : {} }),
  },
  analytics: {
    overview: () => api.get<{ data: AnalyticsOverviewV3 }>('/v3/analytics/overview'),
    activity: () => api.get<{ data: PaperActivityV3 }>('/v3/analytics/activity'),
    top: () => api.get<{ data: TopListsV3 }>('/v3/analytics/top'),
  },
  audit: {
    list: (f: AuditFiltersV3 = {}) => api.get<{ data: AuditListResultV3 }>('/v3/audit', { params: f }),
    actions: () => api.get<{ data: string[] }>('/v3/audit/actions'),
  },
  papers: {
    list: (f: PaperFiltersV3 = {}) => api.get<{ data: { rows: PaperRowV3[]; total: number; page: number; limit: number } }>('/v3/papers', { params: f }),
    preview: (id: number, watermark?: 'on' | 'off') =>
      api.get(`/v3/papers/${id}/preview`, { params: watermark ? { watermark } : {} }),
    saveBranding: (id: number, data: PaperBrandingInputV3) => api.put(`/v3/papers/${id}/branding`, data),
    duplicate: (id: number) => api.post(`/v3/papers/${id}/duplicate`),
    setStatus: (id: number, status: string) => api.patch(`/v3/papers/${id}/status`, { status }),
    downloadPdf: (id: number, opts: { answers?: boolean; watermark?: 'on' | 'off' } = {}) => {
      const q = new URLSearchParams();
      if (opts.answers) q.set('answers', '1');
      if (opts.watermark) q.set('watermark', opts.watermark);
      const qs = q.toString();
      return downloadWithToken(`/api/v3/papers/${id}/pdf${qs ? `?${qs}` : ''}`);
    },
  },
};
