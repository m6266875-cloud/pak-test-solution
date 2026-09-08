import api from './client';
export const papersApi = {
  generate: (data: any) => api.post('/papers', data),
  list: (params?: any) => api.get('/papers', { params }),
  get: (id: number) => api.get(`/papers/${id}`),
  update: (id: number, data: any) => api.put(`/papers/${id}`, data),
  updateFormatting: (id: number, data: any) => api.put(`/papers/${id}/formatting`, data),
  delete: (id: number) => api.delete(`/papers/${id}`),
  getDownloadUrl: (id: number) => `/api/papers/${id}/download`,
  getPreviewUrl: (id: number) => `/api/papers/${id}/preview`,
};
