const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Mock data
const users = {
  'admin@paktestsolution.com': { id: 1, name: 'Super Admin', email: 'admin@paktestsolution.com', role: 'super_admin', schoolName: 'Pak Test Academy', phone: '0300-1234567', isActive: true, lastLoginAt: new Date().toISOString(), createdAt: '2024-01-01T00:00:00Z', password: 'Admin@123456' },
  'teacher@demo.com': { id: 2, name: 'Ahmad Raza', email: 'teacher@demo.com', role: 'teacher', schoolName: 'Govt High School Lahore', phone: '0321-7654321', isActive: true, lastLoginAt: new Date().toISOString(), createdAt: '2024-06-15T00:00:00Z', password: 'Teacher@123', teacherSubjects: [{ subject: { id: 1, name: 'Mathematics' }, class: { id: 9, name: 'Class 9', grade: 9 } }] },
};

const classes = [
  { id: 1, name: 'Class 1', grade: 1, _count: { subjects: 3 } },
  { id: 2, name: 'Class 2', grade: 2, _count: { subjects: 3 } },
  { id: 3, name: 'Class 3', grade: 3, _count: { subjects: 4 } },
  { id: 4, name: 'Class 4', grade: 4, _count: { subjects: 4 } },
  { id: 5, name: 'Class 5', grade: 5, _count: { subjects: 5 } },
  { id: 6, name: 'Class 6', grade: 6, _count: { subjects: 6 } },
  { id: 7, name: 'Class 7', grade: 7, _count: { subjects: 7 } },
  { id: 8, name: 'Class 8', grade: 8, _count: { subjects: 8 } },
  { id: 9, name: 'Class 9', grade: 9, _count: { subjects: 9 } },
  { id: 10, name: 'Class 10', grade: 10, _count: { subjects: 9 } },
  { id: 11, name: 'Class 11', grade: 11, _count: { subjects: 8 } },
  { id: 12, name: 'Class 12', grade: 12, _count: { subjects: 8 } },
];

const subjects9 = [
  { id: 1, name: 'Mathematics', code: 'MATH-9', medium: 'english', classId: 9, _count: { chapters: 17 } },
  { id: 2, name: 'Physics', code: 'PHY-9', medium: 'english', classId: 9, _count: { chapters: 9 } },
  { id: 3, name: 'Chemistry', code: 'CHEM-9', medium: 'english', classId: 9, _count: { chapters: 8 } },
  { id: 4, name: 'Biology', code: 'BIO-9', medium: 'english', classId: 9, _count: { chapters: 10 } },
  { id: 5, name: 'English', code: 'ENG-9', medium: 'english', classId: 9, _count: { chapters: 12 } },
  { id: 6, name: 'Urdu', code: 'URD-9', medium: 'urdu', classId: 9, _count: { chapters: 15 } },
  { id: 7, name: 'Islamiyat', code: 'ISL-9', medium: 'urdu', classId: 9, _count: { chapters: 12 } },
  { id: 8, name: 'Pakistan Studies', code: 'PAK-9', medium: 'bilingual', classId: 9, _count: { chapters: 8 } },
  { id: 9, name: 'Computer Science', code: 'CS-9', medium: 'english', classId: 9, _count: { chapters: 11 } },
];

const chaptersMath9 = [
  { id: 1, number: 1, name: 'Real and Complex Numbers', subjectId: 1, _count: { questions: 42 } },
  { id: 2, number: 2, name: 'Logarithms', subjectId: 1, _count: { questions: 35 } },
  { id: 3, number: 3, name: 'Algebraic Expressions', subjectId: 1, _count: { questions: 48 } },
  { id: 4, number: 4, name: 'Algebraic Manipulation', subjectId: 1, _count: { questions: 31 } },
  { id: 5, number: 5, name: 'Factorization', subjectId: 1, _count: { questions: 38 } },
  { id: 6, number: 6, name: 'Algebraic Sentences', subjectId: 1, _count: { questions: 45 } },
  { id: 7, number: 7, name: 'Linear Graphs', subjectId: 1, _count: { questions: 28 } },
  { id: 8, number: 8, name: 'Simultaneous Equations', subjectId: 1, _count: { questions: 36 } },
  { id: 9, number: 9, name: 'Coordinate Geometry', subjectId: 1, _count: { questions: 29 } },
  { id: 10, number: 10, name: 'Congruent Triangles', subjectId: 1, _count: { questions: 33 } },
];

const mockPapers = [
  { id: 1, title: 'Class 9 Mathematics - Chapter 1-3 Test', status: 'final', totalMarks: 50, timeLimit: 60, medium: 'english', createdAt: '2026-09-05T10:00:00Z', class: { name: 'Class 9', grade: 9 }, paperSubjects: [{ subject: { name: 'Mathematics' } }], paperSettings: { mcqCount: 10, shortCount: 5, essayCount: 2 } },
  { id: 2, title: 'Physics Midterm - Chapters 1-5', status: 'draft', totalMarks: 75, timeLimit: 90, medium: 'english', createdAt: '2026-09-03T14:00:00Z', class: { name: 'Class 9', grade: 9 }, paperSubjects: [{ subject: { name: 'Physics' } }], paperSettings: { mcqCount: 15, shortCount: 8, essayCount: 3 } },
  { id: 3, title: 'English Grammar Quiz - Unit 4', status: 'final', totalMarks: 30, timeLimit: 30, medium: 'english', createdAt: '2026-09-01T08:00:00Z', class: { name: 'Class 9', grade: 9 }, paperSubjects: [{ subject: { name: 'English' } }], paperSettings: { mcqCount: 20, shortCount: 3, essayCount: 0 } },
  { id: 4, title: 'Chemistry Lab Assessment - Chapter 2', status: 'archived', totalMarks: 25, timeLimit: 45, medium: 'english', createdAt: '2026-08-28T12:00:00Z', class: { name: 'Class 9', grade: 9 }, paperSubjects: [{ subject: { name: 'Chemistry' } }], paperSettings: { mcqCount: 15, shortCount: 4, essayCount: 1 } },
];

let tokenCounter = 0;

// Auth routes
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = users[email];
  if (!user || user.password !== password) {
    return res.status(401).json({ success: false, message: 'Invalid email or password' });
  }
  tokenCounter++;
  const { password: _, ...userData } = user;
  res.cookie('refreshToken', `mock-refresh-${tokenCounter}`, { httpOnly: true });
  res.json({ success: true, message: 'Login successful', data: { user: userData, accessToken: `mock-token-${tokenCounter}` } });
});

app.post('/api/auth/refresh', (req, res) => {
  tokenCounter++;
  res.json({ success: true, message: 'Token refreshed', data: { accessToken: `mock-token-${tokenCounter}` } });
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('refreshToken');
  res.json({ success: true, message: 'Logged out successfully', data: null });
});

app.get('/api/auth/profile', (req, res) => {
  // Return teacher profile by default
  const user = users['teacher@demo.com'];
  const { password: _, ...userData } = user;
  res.json({ success: true, message: 'Profile fetched', data: userData });
});

app.put('/api/auth/change-password', (req, res) => {
  res.json({ success: true, message: 'Password changed. Please login again.', data: null });
});

// Subject routes
app.get('/api/subjects/classes', (req, res) => {
  res.json({ success: true, message: 'Classes fetched', data: classes });
});

app.get('/api/subjects/classes/:classId/subjects', (req, res) => {
  const classId = Number(req.params.classId);
  if (classId === 9 || classId === 10) {
    res.json({ success: true, message: 'Subjects fetched', data: subjects9 });
  } else {
    res.json({ success: true, message: 'Subjects fetched', data: subjects9.slice(0, 5).map(s => ({ ...s, classId })) });
  }
});

app.get('/api/subjects/chapters', (req, res) => {
  const subjectIds = (req.query.subjectIds || '').split(',').map(Number);
  const result = chaptersMath9.filter(c => subjectIds.includes(c.subjectId));
  res.json({ success: true, message: 'Chapters fetched', data: result.map(c => ({ ...c, subject: { id: c.subjectId, name: 'Mathematics' } })) });
});

app.get('/api/subjects/subjects/:subjectId/chapters', (req, res) => {
  res.json({ success: true, message: 'Chapters fetched', data: chaptersMath9.map(c => ({ ...c, subject: { id: 1, name: 'Mathematics' } })) });
});

// Paper routes
app.get('/api/papers', (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const status = req.query.status;
  let filtered = mockPapers;
  if (status) filtered = filtered.filter(p => p.status === status);
  res.json({ success: true, message: 'Papers fetched', data: filtered, pagination: { total: filtered.length, page, limit, totalPages: 1, hasNext: false, hasPrev: false } });
});

app.post('/api/papers', (req, res) => {
  const newPaper = { id: Date.now(), title: req.body.title || 'New Paper', totalMarks: 50, timeLimit: req.body.timeLimit || 90 };
  res.status(201).json({ success: true, message: 'Paper generated successfully', data: newPaper });
});

app.get('/api/papers/:id', (req, res) => {
  const paper = {
    id: Number(req.params.id),
    title: 'Class 9 Mathematics - Chapter 1-3 Test',
    teacherId: 2, createdById: 2, classId: 9, medium: 'english',
    totalMarks: 50, timeLimit: 60, status: 'final', isPublished: false,
    createdAt: '2026-09-05T10:00:00Z', updatedAt: '2026-09-05T10:00:00Z',
    class: { id: 9, name: 'Class 9', grade: 9 },
    paperSubjects: [{ subject: { id: 1, name: 'Mathematics', code: 'MATH-9' } }],
    paperChapters: [{ chapter: { id: 1, name: 'Real and Complex Numbers', number: 1 } }],
    paperQuestions: [
      { id: 1, paperId: 1, questionId: 1, marks: 1, order: 0, isSelected: true, question: { id: 1, type: 'mcq', text: 'Which of the following is an irrational number?', marks: 1, options: ['√4', '√9', '√2', '0.25'], answer: 'C', difficulty: 'easy' } },
      { id: 2, paperId: 1, questionId: 2, marks: 1, order: 1, isSelected: true, question: { id: 2, type: 'mcq', text: 'The additive inverse of -7 is:', marks: 1, options: ['7', '-7', '1/7', '-1/7'], answer: 'A', difficulty: 'easy' } },
      { id: 3, paperId: 1, questionId: 3, marks: 1, order: 2, isSelected: true, question: { id: 3, type: 'mcq', text: 'Which property is shown by: a + (b + c) = (a + b) + c?', marks: 1, options: ['Commutative', 'Associative', 'Distributive', 'Identity'], answer: 'B', difficulty: 'easy' } },
      { id: 4, paperId: 1, questionId: 4, marks: 1, order: 3, isSelected: true, question: { id: 4, type: 'mcq', text: 'i² equals:', marks: 1, options: ['1', '-1', 'i', '-i'], answer: 'B', difficulty: 'medium' } },
      { id: 5, paperId: 1, questionId: 5, marks: 1, order: 4, isSelected: true, question: { id: 5, type: 'mcq', text: 'Which number is rational?', marks: 1, options: ['π', '√3', '√5', '0.333...'], answer: 'D', difficulty: 'easy' } },
      { id: 6, paperId: 1, questionId: 6, marks: 3, order: 5, isSelected: true, question: { id: 6, type: 'short', text: 'Define rational and irrational numbers with two examples each.', marks: 3, answer: 'Rational: p/q where q≠0. Examples: 1/2, 0.75. Irrational: cannot be expressed as p/q. Examples: √2, π.', difficulty: 'easy' } },
      { id: 7, paperId: 1, questionId: 7, marks: 3, order: 6, isSelected: true, question: { id: 7, type: 'short', text: 'State the commutative property of addition with an example.', marks: 3, answer: 'a+b = b+a (e.g., 3+4 = 4+3 = 7)', difficulty: 'easy' } },
      { id: 8, paperId: 1, questionId: 8, marks: 3, order: 7, isSelected: true, question: { id: 8, type: 'short', text: 'Simplify: (3 + 2i) + (1 - 4i)', marks: 3, answer: '4 - 2i', difficulty: 'medium' } },
      { id: 9, paperId: 1, questionId: 9, marks: 10, order: 8, isSelected: true, question: { id: 9, type: 'essay', text: 'Discuss the real number system in detail. Explain how natural, whole, integer, rational, irrational, and real numbers are related. Give two examples of each type.', marks: 10, answer: 'The real number system is hierarchical...', difficulty: 'hard' } },
      { id: 10, paperId: 1, questionId: 10, marks: 10, order: 9, isSelected: true, question: { id: 10, type: 'essay', text: 'Explain complex numbers. Define real part and imaginary part. Perform addition, subtraction, and multiplication with examples.', marks: 10, answer: 'Complex numbers: a+bi...', difficulty: 'hard' } },
    ],
    paperSettings: { id: 1, paperId: 1, questionCount: 10, mcqCount: 5, mcqMarks: 1, shortCount: 3, shortMarks: 3, essayCount: 2, essayMarks: 10, randomize: true, ignoreMarksEnabled: false, ignoreMarks: null, blankLines: null, showAnswerKey: true, showBubbleSheet: false },
    paperFormatting: { id: 1, paperId: 1, fontFamily: 'Arial', fontSize: 12, lineHeight: 1.5, bold: false, color: '#000000', layoutType: 'single_page', showBorder: false, borderColor: '#0000FF', schoolName: 'Govt High School Lahore', schoolNameSize: 16, schoolNameColor: '#000000', headerNote: null, footerNote: null },
    teacher: { id: 2, name: 'Ahmad Raza', email: 'teacher@demo.com' },
  };
  res.json({ success: true, message: 'Paper fetched', data: paper });
});

app.put('/api/papers/:id', (req, res) => {
  res.json({ success: true, message: 'Paper updated', data: null });
});

app.put('/api/papers/:id/formatting', (req, res) => {
  res.json({ success: true, message: 'Formatting updated', data: req.body });
});

app.delete('/api/papers/:id', (req, res) => {
  res.json({ success: true, message: 'Paper deleted', data: null });
});

// Questions
app.get('/api/questions', (req, res) => {
  const questions = [
    { id: 1, chapterId: 1, type: 'mcq', text: 'Which of the following is an irrational number?', marks: 1, options: ['√4', '√9', '√2', '0.25'], answer: 'C', difficulty: 'easy', tags: ['irrational'], isActive: true, createdAt: '2024-01-01T00:00:00Z', chapter: { id: 1, name: 'Real and Complex Numbers', subject: { name: 'Mathematics' } } },
    { id: 2, chapterId: 1, type: 'mcq', text: 'The additive inverse of -7 is:', marks: 1, options: ['7', '-7', '1/7', '-1/7'], answer: 'A', difficulty: 'easy', tags: ['inverse'], isActive: true, createdAt: '2024-01-01T00:00:00Z', chapter: { id: 1, name: 'Real and Complex Numbers', subject: { name: 'Mathematics' } } },
    { id: 3, chapterId: 1, type: 'short', text: 'Define rational and irrational numbers with examples.', marks: 3, answer: 'Rational: p/q. Irrational: cannot be p/q.', difficulty: 'easy', tags: ['definition'], isActive: true, createdAt: '2024-01-01T00:00:00Z', chapter: { id: 1, name: 'Real and Complex Numbers', subject: { name: 'Mathematics' } } },
    { id: 4, chapterId: 1, type: 'essay', text: 'Discuss the real number system with a Venn diagram.', marks: 10, answer: 'Natural ⊂ Whole ⊂ Integer ⊂ Rational ⊂ Real...', difficulty: 'hard', tags: ['number-system'], isActive: true, createdAt: '2024-01-01T00:00:00Z', chapter: { id: 1, name: 'Real and Complex Numbers', subject: { name: 'Mathematics' } } },
    { id: 5, chapterId: 2, type: 'mcq', text: 'log₁₀(100) = ?', marks: 1, options: ['1', '2', '10', '100'], answer: 'B', difficulty: 'easy', tags: ['logarithms'], isActive: true, createdAt: '2024-01-01T00:00:00Z', chapter: { id: 2, name: 'Logarithms', subject: { name: 'Mathematics' } } },
  ];
  res.json({ success: true, message: 'Questions fetched', data: questions, pagination: { total: questions.length, page: 1, limit: 20, totalPages: 1, hasNext: false, hasPrev: false } });
});

app.get('/api/questions/stats', (req, res) => {
  res.json({ success: true, message: 'Stats fetched', data: { total: 245, byType: [{ type: 'mcq', _count: { id: 150 } }, { type: 'short', _count: { id: 65 } }, { type: 'essay', _count: { id: 30 } }], byDifficulty: [{ difficulty: 'easy', _count: { id: 120 } }, { difficulty: 'medium', _count: { id: 85 } }, { difficulty: 'hard', _count: { id: 40 } }] } });
});

app.post('/api/questions', (req, res) => {
  res.status(201).json({ success: true, message: 'Question created', data: { id: Date.now(), ...req.body } });
});

app.post('/api/questions/bulk', (req, res) => {
  res.status(201).json({ success: true, message: `${req.body.questions?.length || 0} questions imported`, data: { count: req.body.questions?.length || 0 } });
});

app.put('/api/questions/:id', (req, res) => {
  res.json({ success: true, message: 'Question updated', data: { id: Number(req.params.id), ...req.body } });
});

app.delete('/api/questions/:id', (req, res) => {
  res.json({ success: true, message: 'Question deleted', data: null });
});

// Admin routes
app.get('/api/admin/dashboard', (req, res) => {
  res.json({ success: true, message: 'Dashboard stats', data: { totalUsers: 24, totalPapers: 1283, totalQuestions: 4521, recentPapers: mockPapers, papersByStatus: [{ status: 'draft', _count: { id: 45 } }, { status: 'final', _count: { id: 1200 } }, { status: 'archived', _count: { id: 38 } }] } });
});

app.get('/api/admin/users', (req, res) => {
  const allUsers = Object.values(users).map(u => {
    const { password: _, ...rest } = u;
    return { ...rest, _count: { papers: 12 } };
  });
  res.json({ success: true, message: 'Users fetched', data: allUsers, pagination: { total: allUsers.length, page: 1, limit: 20, totalPages: 1, hasNext: false, hasPrev: false } });
});

app.get('/api/admin/users/:id', (req, res) => {
  res.json({ success: true, message: 'User fetched', data: { ...users['teacher@demo.com'], _count: { papers: 12 } } });
});

app.post('/api/admin/users', (req, res) => {
  res.status(201).json({ success: true, message: 'User created', data: { id: Date.now(), ...req.body } });
});

app.put('/api/admin/users/:id', (req, res) => {
  res.json({ success: true, message: 'User updated', data: { id: Number(req.params.id), ...req.body } });
});

app.patch('/api/admin/users/:id/toggle', (req, res) => {
  res.json({ success: true, message: 'User toggled', data: { id: Number(req.params.id), isActive: true } });
});

app.get('/api/admin/audit-logs', (req, res) => {
  const logs = [
    { id: 1, userId: 2, action: 'generate_paper', details: { title: 'Math Test Ch 1-3' }, createdAt: '2026-09-07T10:00:00Z', user: { id: 2, name: 'Ahmad Raza', email: 'teacher@demo.com' } },
    { id: 2, userId: 2, action: 'login', details: {}, createdAt: '2026-09-07T09:30:00Z', user: { id: 2, name: 'Ahmad Raza', email: 'teacher@demo.com' } },
    { id: 3, userId: 1, action: 'create_user', details: { targetUserId: 3 }, createdAt: '2026-09-06T14:00:00Z', user: { id: 1, name: 'Super Admin', email: 'admin@paktestsolution.com' } },
    { id: 4, userId: 2, action: 'download_paper', details: { paperId: 1 }, createdAt: '2026-09-05T16:00:00Z', user: { id: 2, name: 'Ahmad Raza', email: 'teacher@demo.com' } },
    { id: 5, userId: 2, action: 'change_password', details: {}, createdAt: '2026-09-04T11:00:00Z', user: { id: 2, name: 'Ahmad Raza', email: 'teacher@demo.com' } },
  ];
  res.json({ success: true, message: 'Audit logs fetched', data: logs, pagination: { total: logs.length, page: 1, limit: 50, totalPages: 1, hasNext: false, hasPrev: false } });
});

// Health
app.get('/health', (req, res) => {
  res.json({ success: true, message: 'Mock API running' });
});

const PORT = 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Mock API server running on port ${PORT}`);
});
