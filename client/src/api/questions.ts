import api from './client';
export const questionsApi = {
  list: (params?: any) => api.get('/questions', { params }),
  getStats: (params?: any) => api.get('/questions/stats', { params }),
  create: (data: any) => api.post('/questions', data),
  bulkCreate: (questions: any[]) => api.post('/questions/bulk', { questions }),
  update: (id: number, data: any) => api.put(`/questions/${id}`, data),
  delete: (id: number) => api.delete(`/questions/${id}`),
  // Admin System Upgrade: approval workflow
  approve: (id: number) => api.patch(`/questions/${id}/approve`),
  reject: (id: number, reason?: string) => api.patch(`/questions/${id}/reject`, reason ? { reason } : {}),
};
