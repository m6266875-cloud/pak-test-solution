import api from './client';
export const adminApi = {
  getDashboard: () => api.get('/admin/dashboard'),
  listUsers: (params?: any) => api.get('/admin/users', { params }),
  getUser: (id: number) => api.get(`/admin/users/${id}`),
  createUser: (data: any) => api.post('/admin/users', data),
  updateUser: (id: number, data: any) => api.put(`/admin/users/${id}`, data),
  toggleUser: (id: number) => api.patch(`/admin/users/${id}/toggle`),
  getAuditLogs: (params?: any) => api.get('/admin/audit-logs', { params }),
  // Admin System Upgrade
  assignTeacherSubject: (data: { teacherId: number; subjectId: number; classId: number }) => api.post('/admin/teacher-subjects', data),
  removeTeacherSubject: (data: { teacherId: number; subjectId: number; classId: number }) => api.delete('/admin/teacher-subjects', { data }),
  updateUserPermissions: (id: number, permissions: string[]) => api.put(`/admin/users/${id}/permissions`, { permissions }),
};
