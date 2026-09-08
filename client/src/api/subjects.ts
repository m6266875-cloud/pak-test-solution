import api from './client';
export const subjectsApi = {
  getClasses: () => api.get('/subjects/classes'),
  getSubjectsByClass: (classId: number) => api.get(`/subjects/classes/${classId}/subjects`),
  getChaptersBySubject: (subjectId: number) => api.get(`/subjects/subjects/${subjectId}/chapters`),
  getChaptersBySubjects: (subjectIds: number[]) => api.get(`/subjects/chapters?subjectIds=${subjectIds.join(',')}`),
};
