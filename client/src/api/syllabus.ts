import api from './client';

export const syllabusApi = {
  // Boards
  listBoards: () => api.get('/syllabus/boards'),
  createBoard: (data: { name: string; code: string; region?: string }) => api.post('/syllabus/boards', data),
  updateBoard: (id: number, data: Partial<{ name: string; code: string; region: string }>) => api.put(`/syllabus/boards/${id}`, data),
  deleteBoard: (id: number) => api.delete(`/syllabus/boards/${id}`),

  // Books
  listBooks: (params?: { page?: number; limit?: number; boardId?: number; classId?: number; subjectId?: number; status?: string; search?: string }) =>
    api.get('/syllabus/books', { params }),
  getBook: (id: number) => api.get(`/syllabus/books/${id}`),
  createBook: (data: any) => api.post('/syllabus/books', data),
  updateBook: (id: number, data: any) => api.put(`/syllabus/books/${id}`, data),
  deleteBook: (id: number) => api.delete(`/syllabus/books/${id}`),

  // Chapters (drill-down, include exercises + topics)
  listChapters: (params?: { bookId?: number; subjectId?: number }) => api.get('/syllabus/chapters', { params }),

  // Exercises
  listExercises: (params?: { chapterId?: number }) => api.get('/syllabus/exercises', { params }),
  createExercise: (data: { name: string; number?: number; chapterId: number }) => api.post('/syllabus/exercises', data),
  updateExercise: (id: number, data: Partial<{ name: string; number: number }>) => api.put(`/syllabus/exercises/${id}`, data),
  deleteExercise: (id: number) => api.delete(`/syllabus/exercises/${id}`),

  // Topics
  listTopics: (params?: { chapterId?: number }) => api.get('/syllabus/topics', { params }),
  createTopic: (data: { name: string; chapterId: number }) => api.post('/syllabus/topics', data),
  updateTopic: (id: number, data: { name: string }) => api.put(`/syllabus/topics/${id}`, data),
  deleteTopic: (id: number) => api.delete(`/syllabus/topics/${id}`),
};
