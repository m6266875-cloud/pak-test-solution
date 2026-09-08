import api from './client';
import type { SchoolFormData } from '../types';

export const schoolsApi = {
  list: (params?: { page?: number; limit?: number; search?: string; status?: string }) =>
    api.get('/schools', { params }),
  get: (id: number) => api.get(`/schools/${id}`),
  create: (data: Partial<SchoolFormData>) => api.post('/schools', data),
  update: (id: number, data: Partial<SchoolFormData>) => api.put(`/schools/${id}`, data),
  toggleStatus: (id: number, status?: string) => api.patch(`/schools/${id}/status`, status ? { status } : {}),
};
