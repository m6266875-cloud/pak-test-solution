const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// ═════════════════════════════ Mock data ═════════════════════════════
const users = {
  'admin@paktestsolution.com': { id: 1, name: 'Super Admin', email: 'admin@paktestsolution.com', role: 'super_admin', schoolName: 'Pak Test Academy', schoolId: 2, phone: '0300-1234567', isActive: true, lastLoginAt: new Date().toISOString(), createdAt: '2024-01-01T00:00:00Z', password: 'Admin@123456', permissions: ['manage_users', 'manage_schools', 'manage_syllabus', 'approve_questions', 'manage_papers', 'view_audit'] },
  'teacher@demo.com': { id: 2, name: 'Ahmad Raza', email: 'teacher@demo.com', role: 'teacher', schoolName: 'Govt High School Lahore', schoolId: 1, phone: '0321-7654321', isActive: true, lastLoginAt: new Date().toISOString(), createdAt: '2024-06-15T00:00:00Z', password: 'Teacher@123', teacherSubjects: [{ subject: { id: 1, name: 'Mathematics' }, class: { id: 9, name: 'Class 9', grade: 9 } }] },
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
  { id: 1, name: 'Mathematics', code: 'MATH-9', medium: 'english', classId: 9, boardId: 1, _count: { chapters: 17 } },
  { id: 2, name: 'Physics', code: 'PHY-9', medium: 'english', classId: 9, boardId: 1, _count: { chapters: 9 } },
  { id: 3, name: 'Chemistry', code: 'CHEM-9', medium: 'english', classId: 9, boardId: 1, _count: { chapters: 8 } },
  { id: 4, name: 'Biology', code: 'BIO-9', medium: 'english', classId: 9, boardId: 1, _count: { chapters: 10 } },
  { id: 5, name: 'English', code: 'ENG-9', medium: 'english', classId: 9, boardId: 1, _count: { chapters: 12 } },
  { id: 6, name: 'Urdu', code: 'URD-9', medium: 'urdu', classId: 9, boardId: 1, _count: { chapters: 15 } },
  { id: 7, name: 'Islamiyat', code: 'ISL-9', medium: 'urdu', classId: 9, boardId: 1, _count: { chapters: 12 } },
  { id: 8, name: 'Pakistan Studies', code: 'PAK-9', medium: 'bilingual', classId: 9, boardId: 1, _count: { chapters: 8 } },
  { id: 9, name: 'Computer Science', code: 'CS-9', medium: 'english', classId: 9, boardId: 1, _count: { chapters: 11 } },
];

const chaptersMath9 = [
  { id: 1, number: 1, name: 'Real and Complex Numbers', subjectId: 1, bookId: 1, _count: { questions: 42 } },
  { id: 2, number: 2, name: 'Logarithms', subjectId: 1, bookId: 1, _count: { questions: 35 } },
  { id: 3, number: 3, name: 'Algebraic Expressions', subjectId: 1, bookId: 1, _count: { questions: 48 } },
  { id: 4, number: 4, name: 'Algebraic Manipulation', subjectId: 1, bookId: 1, _count: { questions: 31 } },
  { id: 5, number: 5, name: 'Factorization', subjectId: 1, bookId: 1, _count: { questions: 38 } },
  { id: 6, number: 6, name: 'Algebraic Sentences', subjectId: 1, bookId: 1, _count: { questions: 45 } },
  { id: 7, number: 7, name: 'Linear Graphs', subjectId: 1, bookId: 1, _count: { questions: 28 } },
  { id: 8, number: 8, name: 'Simultaneous Equations', subjectId: 1, bookId: 1, _count: { questions: 36 } },
  { id: 9, number: 9, name: 'Coordinate Geometry', subjectId: 1, bookId: 1, _count: { questions: 29 } },
  { id: 10, number: 10, name: 'Congruent Triangles', subjectId: 1, bookId: 1, _count: { questions: 33 } },
];

// ─── Admin System Upgrade: Schools ───
let schoolIdSeq = 4;
const schools = [
  { id: 1, name: 'Govt High School Lahore', code: 'GHS-LHR-01', email: 'info@ghslhr.edu.pk', phone: '042-37210001', address: 'Model Town, Block C', city: 'Lahore', logoUrl: null, principal: 'Mr. Muhammad Akram', status: 'active', createdAt: '2024-02-10T00:00:00Z', updatedAt: '2024-02-10T00:00:00Z', _count: { users: 14, subjects: 8 } },
  { id: 2, name: 'Pak Test Academy', code: 'PTA-RWP-01', email: 'contact@paktestacademy.pk', phone: '051-4445555', address: 'Satellite Town, Main Blvd', city: 'Rawalpindi', logoUrl: null, principal: 'Ms. Saima Tariq', status: 'active', createdAt: '2024-03-01T00:00:00Z', updatedAt: '2024-03-01T00:00:00Z', _count: { users: 9, subjects: 6 } },
  { id: 3, name: 'City Grammar School Faisalabad', code: 'CGS-FSD-02', email: 'admin@cgsfsd.edu.pk', phone: '041-2601234', address: 'Peoples Colony No. 1', city: 'Faisalabad', logoUrl: null, principal: 'Mr. Asif Javed', status: 'inactive', createdAt: '2024-05-20T00:00:00Z', updatedAt: '2024-05-20T00:00:00Z', _count: { users: 3, subjects: 4 } },
];

// ─── Admin System Upgrade: Syllabus / PTB hierarchy ───
let boardIdSeq = 5;
const boards = [
  { id: 1, name: 'BISE Lahore', code: 'LHR', region: 'Punjab', createdAt: '2024-01-15T00:00:00Z' },
  { id: 2, name: 'BISE Rawalpindi', code: 'RWP', region: 'Punjab', createdAt: '2024-01-15T00:00:00Z' },
  { id: 3, name: 'BISE Karachi', code: 'KHI', region: 'Sindh', createdAt: '2024-01-15T00:00:00Z' },
  { id: 4, name: 'Federal Board (FBISE)', code: 'FBISE', region: 'Federal', createdAt: '2024-01-15T00:00:00Z' },
];

let bookIdSeq = 4;
const books = [
  { id: 1, title: 'Mathematics — Class 9 (PTB)', publisher: 'Punjab Textbook Board', edition: '2025-26', year: 2025, language: 'english', fileUrl: 'https://pctb.punjab.gov.pk/math-9', status: 'active', boardId: 1, classId: 9, subjectId: 1, createdAt: '2024-02-01T00:00:00Z' },
  { id: 2, title: 'Physics — Class 9 (PTB)', publisher: 'Punjab Textbook Board', edition: '2025-26', year: 2025, language: 'english', fileUrl: 'https://pctb.punjab.gov.pk/physics-9', status: 'active', boardId: 1, classId: 9, subjectId: 2, createdAt: '2024-02-01T00:00:00Z' },
  { id: 3, title: 'Urdu — Class 9 (FBISE)', publisher: 'National Book Foundation', edition: '2024', year: 2024, language: 'urdu', fileUrl: null, status: 'active', boardId: 4, classId: 9, subjectId: 6, createdAt: '2024-02-01T00:00:00Z' },
];

let exerciseIdSeq = 7;
const exercises = [
  { id: 1, name: 'Exercise 1.1', number: 1, chapterId: 1 },
  { id: 2, name: 'Exercise 1.2', number: 2, chapterId: 1 },
  { id: 3, name: 'Exercise 1.3', number: 3, chapterId: 1 },
  { id: 4, name: 'Exercise 2.1', number: 1, chapterId: 2 },
  { id: 5, name: 'Exercise 2.2', number: 2, chapterId: 2 },
  { id: 6, name: 'Exercise 3.1', number: 1, chapterId: 3 },
];

let topicIdSeq = 7;
const topics = [
  { id: 1, name: 'Rational numbers', chapterId: 1 },
  { id: 2, name: 'Irrational numbers', chapterId: 1 },
  { id: 3, name: 'Properties of real numbers', chapterId: 1 },
  { id: 4, name: 'Complex numbers', chapterId: 1 },
  { id: 5, name: 'Laws of logarithms', chapterId: 2 },
  { id: 6, name: 'Common & natural logarithm', chapterId: 2 },
];

const withRefs = {
  board: b => b && { id: b.id, name: b.name, code: b.code },
  class: c => c && { id: c.id, name: c.name, grade: c.grade },
  subject: s => s && { id: s.id, name: s.name },
};

const bookView = (b) => ({
  ...b,
  board: withRefs.board(boards.find(x => x.id === b.boardId)),
  class: withRefs.class(classes.find(x => x.id === b.classId)),
  subject: withRefs.subject(subjects9.find(x => x.id === b.subjectId)),
  _count: { chapters: chaptersMath9.filter(c => c.bookId === b.id).length },
});

const exerciseView = (e) => {
  const ch = chaptersMath9.find(c => c.id === e.chapterId);
  return { ...e, chapter: ch && { id: ch.id, name: ch.name, subjectId: ch.subjectId }, _count: { questions: mockQuestions.filter(q => q.exerciseId === e.id && q.isActive).length } };
};

const topicView = (t) => {
  const ch = chaptersMath9.find(c => c.id === t.chapterId);
  return { ...t, chapter: ch && { id: ch.id, name: ch.name, subjectId: ch.subjectId }, _count: { questions: mockQuestions.filter(q => q.topicId === t.id && q.isActive).length } };
};

const mockPapers = [
  { id: 1, title: 'Class 9 Mathematics - Chapter 1-3 Test', status: 'final', totalMarks: 50, timeLimit: 60, medium: 'english', createdAt: '2026-09-05T10:00:00Z', class: { name: 'Class 9', grade: 9 }, paperSubjects: [{ subject: { name: 'Mathematics' } }], paperSettings: { mcqCount: 10, shortCount: 5, essayCount: 2 } },
  { id: 2, title: 'Physics Midterm - Chapters 1-5', status: 'draft', totalMarks: 75, timeLimit: 90, medium: 'english', createdAt: '2026-09-03T14:00:00Z', class: { name: 'Class 9', grade: 9 }, paperSubjects: [{ subject: { name: 'Physics' } }], paperSettings: { mcqCount: 15, shortCount: 8, essayCount: 3 } },
  { id: 3, title: 'English Grammar Quiz - Unit 4', status: 'final', totalMarks: 30, timeLimit: 30, medium: 'english', createdAt: '2026-09-01T08:00:00Z', class: { name: 'Class 9', grade: 9 }, paperSubjects: [{ subject: { name: 'English' } }], paperSettings: { mcqCount: 20, shortCount: 3, essayCount: 0 } },
  { id: 4, title: 'Chemistry Lab Assessment - Chapter 2', status: 'archived', totalMarks: 25, timeLimit: 45, medium: 'english', createdAt: '2026-08-28T12:00:00Z', class: { name: 'Class 9', grade: 9 }, paperSubjects: [{ subject: { name: 'Chemistry' } }], paperSettings: { mcqCount: 15, shortCount: 4, essayCount: 1 } },
];

const mockQuestions = [
  { id: 1, chapterId: 1, exerciseId: 1, topicId: 2, type: 'mcq', text: 'Which of the following is an irrational number?', marks: 1, options: ['√4', '√9', '√2', '0.25'], answer: 'C', difficulty: 'easy', language: 'english', source: 'exercise', status: 'approved', tags: ['irrational'], isActive: true, createdAt: '2024-01-01T00:00:00Z', chapter: { id: 1, name: 'Real and Complex Numbers', subject: { name: 'Mathematics' } } },
  { id: 2, chapterId: 1, exerciseId: 1, topicId: 3, type: 'mcq', text: 'The additive inverse of -7 is:', marks: 1, options: ['7', '-7', '1/7', '-1/7'], answer: 'A', difficulty: 'easy', language: 'english', source: 'manual', status: 'approved', tags: ['inverse'], isActive: true, createdAt: '2024-01-01T00:00:00Z', chapter: { id: 1, name: 'Real and Complex Numbers', subject: { name: 'Mathematics' } } },
  { id: 3, chapterId: 1, exerciseId: 2, topicId: 1, type: 'short', text: 'Define rational and irrational numbers with examples.', marks: 3, answer: 'Rational: p/q. Irrational: cannot be p/q.', difficulty: 'easy', language: 'english', source: 'exercise', status: 'approved', tags: ['definition'], isActive: true, createdAt: '2024-01-01T00:00:00Z', chapter: { id: 1, name: 'Real and Complex Numbers', subject: { name: 'Mathematics' } } },
  { id: 4, chapterId: 1, exerciseId: null, topicId: null, type: 'essay', text: 'Discuss the real number system with a Venn diagram.', marks: 10, answer: 'Natural ⊂ Whole ⊂ Integer ⊂ Rational ⊂ Real...', difficulty: 'hard', language: 'english', source: 'past_paper', status: 'pending', tags: ['number-system'], isActive: true, createdAt: '2024-01-01T00:00:00Z', chapter: { id: 1, name: 'Real and Complex Numbers', subject: { name: 'Mathematics' } } },
  { id: 5, chapterId: 2, exerciseId: 4, topicId: 5, type: 'mcq', text: 'log₁₀(100) = ?', marks: 1, options: ['1', '2', '10', '100'], answer: 'B', difficulty: 'easy', language: 'english', source: 'imported', status: 'approved', tags: ['logarithms'], isActive: true, createdAt: '2024-01-01T00:00:00Z', chapter: { id: 2, name: 'Logarithms', subject: { name: 'Mathematics' } } },
  { id: 6, chapterId: 2, exerciseId: 5, topicId: 6, type: 'short', text: 'Prove that logₐ(mn) = logₐm + logₐn.', marks: 4, answer: 'Let logₐm = x, logₐn = y, then...', difficulty: 'medium', language: 'english', source: 'manual', status: 'pending', tags: ['proof'], isActive: true, createdAt: '2024-02-01T00:00:00Z', chapter: { id: 2, name: 'Logarithms', subject: { name: 'Mathematics' } } },
];

let tokenCounter = 0;

// ═════════════════════════════ Auth routes ═════════════════════════════
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
  // Default profile: super admin (full access preview)
  const user = users['admin@paktestsolution.com'];
  const { password: _, ...userData } = user;
  res.json({ success: true, message: 'Profile fetched', data: userData });
});

app.put('/api/auth/change-password', (req, res) => {
  res.json({ success: true, message: 'Password changed. Please login again.', data: null });
});

// ═════════════════════════════ Subject routes ═════════════════════════════
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

// ═════════════════════════════ Paper routes ═════════════════════════════
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
    paperFormatting: { id: 1, paperId: 1, fontFamily: 'Arial', fontSize: 12, lineHeight: 1.5, bold: false, color: '#000000', layoutType: 'single_page', showBorder: false, borderColor: '#0000FF', schoolName: 'Govt High School Lahore', schoolNameSize: 16, schoolNameColor: '#000000', schoolLogoUrl: null, headerNote: null, footerNote: null },
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

// ═════════════════════════════ Questions ═════════════════════════════
app.get('/api/questions', (req, res) => {
  let filtered = mockQuestions.filter(q => q.isActive);
  if (req.query.chapterId) filtered = filtered.filter(q => q.chapterId === Number(req.query.chapterId));
  if (req.query.exerciseId) filtered = filtered.filter(q => q.exerciseId === Number(req.query.exerciseId));
  if (req.query.topicId) filtered = filtered.filter(q => q.topicId === Number(req.query.topicId));
  if (req.query.type) filtered = filtered.filter(q => q.type === req.query.type);
  if (req.query.difficulty) filtered = filtered.filter(q => q.difficulty === req.query.difficulty);
  if (req.query.status) filtered = filtered.filter(q => q.status === req.query.status);
  if (req.query.search) filtered = filtered.filter(q => q.text.toLowerCase().includes(String(req.query.search).toLowerCase()));
  res.json({ success: true, message: 'Questions fetched', data: filtered, pagination: { total: filtered.length, page: 1, limit: 20, totalPages: 1, hasNext: false, hasPrev: false } });
});

app.get('/api/questions/stats', (req, res) => {
  const tally = (arr, key) => arr.reduce((acc, q) => {
    const found = acc.find(x => x[key] === q[key]);
    if (found) found._count.id++;
    else acc.push({ [key]: q[key], _count: { id: 1 } });
    return acc;
  }, []);
  const active = mockQuestions.filter(q => q.isActive);
  res.json({ success: true, message: 'Stats fetched', data: {
    total: 245,
    byType: [{ type: 'mcq', _count: { id: 150 } }, { type: 'short', _count: { id: 65 } }, { type: 'essay', _count: { id: 30 } }],
    byDifficulty: [{ difficulty: 'easy', _count: { id: 120 } }, { difficulty: 'medium', _count: { id: 85 } }, { difficulty: 'hard', _count: { id: 40 } }],
    byStatus: tally(active, 'status'),
    bySource: tally(active, 'source'),
    byLanguage: tally(active, 'language'),
  } });
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

// ─── Admin System Upgrade: approval workflow ───
app.patch('/api/questions/:id/approve', (req, res) => {
  const q = mockQuestions.find(x => x.id === Number(req.params.id));
  if (q) q.status = 'approved';
  res.json({ success: true, message: 'Question approved', data: q || { id: Number(req.params.id), status: 'approved' } });
});

app.patch('/api/questions/:id/reject', (req, res) => {
  const q = mockQuestions.find(x => x.id === Number(req.params.id));
  if (q) q.status = 'rejected';
  res.json({ success: true, message: 'Question rejected', data: q || { id: Number(req.params.id), status: 'rejected' } });
});

// ═════════════════════════════ Admin routes ═════════════════════════════
app.get('/api/admin/dashboard', (req, res) => {
  const tally = (arr, key) => arr.reduce((acc, q) => {
    const found = acc.find(x => x[key] === q[key]);
    if (found) found._count.id++;
    else acc.push({ [key]: q[key], _count: { id: 1 } });
    return acc;
  }, []);
  const active = mockQuestions.filter(q => q.isActive);
  res.json({ success: true, message: 'Dashboard stats', data: {
    totalUsers: 24, totalPapers: 1283, totalQuestions: 4521, recentPapers: mockPapers,
    papersByStatus: [{ status: 'draft', _count: { id: 45 } }, { status: 'final', _count: { id: 1200 } }, { status: 'archived', _count: { id: 38 } }],
    syllabus: {
      schools: schools.length,
      boards: boards.length,
      books: books.length,
      classes: classes.length,
      chapters: chaptersMath9.length,
      exercises: exercises.length,
      topics: topics.length,
    },
    questionBreakdown: {
      pending: active.filter(q => q.status === 'pending').length,
      byStatus: tally(active, 'status'),
      byType: [{ type: 'mcq', _count: { id: 150 } }, { type: 'short', _count: { id: 65 } }, { type: 'essay', _count: { id: 30 } }],
      byDifficulty: [{ difficulty: 'easy', _count: { id: 120 } }, { difficulty: 'medium', _count: { id: 85 } }, { difficulty: 'hard', _count: { id: 40 } }],
      bySource: tally(active, 'source'),
      byLanguage: tally(active, 'language'),
    },
  } });
});

app.get('/api/admin/users', (req, res) => {
  const allUsers = Object.values(users).map(u => {
    const { password: _, ...rest } = u;
    return { ...rest, _count: { papers: 12 } };
  });
  res.json({ success: true, message: 'Users fetched', data: allUsers, pagination: { total: allUsers.length, page: 1, limit: 20, totalPages: 1, hasNext: false, hasPrev: false } });
});

app.get('/api/admin/users/:id', (req, res) => {
  const u = Number(req.params.id) === 1 ? users['admin@paktestsolution.com'] : users['teacher@demo.com'];
  const { password: _, ...rest } = u;
  res.json({ success: true, message: 'User fetched', data: { ...rest, adminPermissions: (u.permissions || []).map(p => ({ permission: p })), _count: { papers: 12 } } });
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

// ─── Admin System Upgrade: user permissions ───
app.put('/api/admin/users/:id/permissions', (req, res) => {
  const perms = Array.isArray(req.body.permissions) ? req.body.permissions : [];
  const u = Object.values(users).find(x => x.id === Number(req.params.id));
  if (u) u.permissions = perms;
  res.json({ success: true, message: 'Permissions updated', data: { userId: Number(req.params.id), permissions: perms } });
});

// ─── Admin System Upgrade: teacher-subject assignment ───
const teacherSubjectAssignments = [
  { id: 1, teacherId: 2, subjectId: 1, classId: 9, subject: { id: 1, name: 'Mathematics' }, class: { id: 9, name: 'Class 9', grade: 9 } },
];

app.post('/api/admin/teacher-subjects', (req, res) => {
  const { teacherId, subjectId, classId } = req.body || {};
  if (!teacherId || !subjectId || !classId) {
    return res.status(400).json({ success: false, message: 'teacherId, subjectId and classId are required' });
  }
  const existing = teacherSubjectAssignments.find(a => a.teacherId === Number(teacherId) && a.subjectId === Number(subjectId) && a.classId === Number(classId));
  if (existing) return res.status(201).json({ success: true, message: 'Already assigned', data: existing });
  const subject = subjects9.find(s => s.id === Number(subjectId));
  const cls = classes.find(c => c.id === Number(classId));
  const created = {
    id: Date.now(), teacherId: Number(teacherId), subjectId: Number(subjectId), classId: Number(classId),
    subject: subject && { id: subject.id, name: subject.name },
    class: cls && { id: cls.id, name: cls.name, grade: cls.grade },
    teacher: { id: Number(teacherId), name: 'Ahmad Raza', email: 'teacher@demo.com' },
  };
  teacherSubjectAssignments.push(created);
  res.status(201).json({ success: true, message: 'Subject assigned to teacher', data: created });
});

app.delete('/api/admin/teacher-subjects', (req, res) => {
  const teacherId = Number(req.body?.teacherId ?? req.query.teacherId);
  const subjectId = Number(req.body?.subjectId ?? req.query.subjectId);
  const classId = Number(req.body?.classId ?? req.query.classId);
  const idx = teacherSubjectAssignments.findIndex(a => a.teacherId === teacherId && a.subjectId === subjectId && a.classId === classId);
  if (idx >= 0) teacherSubjectAssignments.splice(idx, 1);
  res.json({ success: true, message: 'Subject unassigned from teacher', data: null });
});

app.get('/api/admin/audit-logs', (req, res) => {
  const logs = [
    { id: 1, userId: 2, action: 'generate_paper', details: { title: 'Math Test Ch 1-3' }, createdAt: '2026-09-07T10:00:00Z', user: { id: 2, name: 'Ahmad Raza', email: 'teacher@demo.com' } },
    { id: 2, userId: 2, action: 'login', details: {}, createdAt: '2026-09-07T09:30:00Z', user: { id: 2, name: 'Ahmad Raza', email: 'teacher@demo.com' } },
    { id: 3, userId: 1, action: 'create_user', details: { targetUserId: 3 }, createdAt: '2026-09-06T14:00:00Z', user: { id: 1, name: 'Super Admin', email: 'admin@paktestsolution.com' } },
    { id: 6, userId: 1, action: 'create_school', details: { schoolId: 3, name: 'City Grammar School Faisalabad' }, createdAt: '2026-09-06T11:00:00Z', user: { id: 1, name: 'Super Admin', email: 'admin@paktestsolution.com' } },
    { id: 7, userId: 1, action: 'approve_question', details: { questionId: 5 }, createdAt: '2026-09-06T10:30:00Z', user: { id: 1, name: 'Super Admin', email: 'admin@paktestsolution.com' } },
    { id: 4, userId: 2, action: 'download_paper', details: { paperId: 1 }, createdAt: '2026-09-05T16:00:00Z', user: { id: 2, name: 'Ahmad Raza', email: 'teacher@demo.com' } },
    { id: 5, userId: 2, action: 'change_password', details: {}, createdAt: '2026-09-04T11:00:00Z', user: { id: 2, name: 'Ahmad Raza', email: 'teacher@demo.com' } },
  ];
  res.json({ success: true, message: 'Audit logs fetched', data: logs, pagination: { total: logs.length, page: 1, limit: 50, totalPages: 1, hasNext: false, hasPrev: false } });
});

// ═════════════════════════════ Schools CRUD ═════════════════════════════
app.get('/api/schools', (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  let filtered = [...schools];
  if (req.query.status) filtered = filtered.filter(s => s.status === req.query.status);
  if (req.query.search) {
    const q = String(req.query.search).toLowerCase();
    filtered = filtered.filter(s =>
      s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q) ||
      (s.city || '').toLowerCase().includes(q) || (s.principal || '').toLowerCase().includes(q)
    );
  }
  res.json({ success: true, message: 'Schools fetched', data: filtered, pagination: { total: filtered.length, page, limit, totalPages: Math.max(1, Math.ceil(filtered.length / limit)), hasNext: page * limit < filtered.length, hasPrev: page > 1 } });
});

app.get('/api/schools/:id', (req, res) => {
  const school = schools.find(s => s.id === Number(req.params.id));
  if (!school) return res.status(404).json({ success: false, message: 'School not found' });
  res.json({ success: true, message: 'School fetched', data: school });
});

app.post('/api/schools', (req, res) => {
  const { name, code } = req.body || {};
  if (!name || !code) return res.status(400).json({ success: false, message: 'Name and code are required' });
  if (schools.some(s => s.code.toLowerCase() === String(code).toLowerCase())) {
    return res.status(409).json({ success: false, message: 'A school with this code already exists' });
  }
  const school = { id: schoolIdSeq++, name, code, email: req.body.email || null, phone: req.body.phone || null, address: req.body.address || null, city: req.body.city || null, logoUrl: req.body.logoUrl || null, principal: req.body.principal || null, status: req.body.status || 'active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), _count: { users: 0, subjects: 0 } };
  schools.push(school);
  res.status(201).json({ success: true, message: 'School created', data: school });
});

app.put('/api/schools/:id', (req, res) => {
  const school = schools.find(s => s.id === Number(req.params.id));
  if (!school) return res.status(404).json({ success: false, message: 'School not found' });
  Object.assign(school, Object.fromEntries(Object.entries(req.body).filter(([_, v]) => v !== undefined)), { updatedAt: new Date().toISOString() });
  res.json({ success: true, message: 'School updated', data: school });
});

app.patch('/api/schools/:id/status', (req, res) => {
  const school = schools.find(s => s.id === Number(req.params.id));
  if (!school) return res.status(404).json({ success: false, message: 'School not found' });
  const requested = req.body?.status;
  school.status = ['active', 'inactive', 'suspended'].includes(requested)
    ? requested
    : school.status === 'active' ? 'inactive' : 'active';
  school.updatedAt = new Date().toISOString();
  res.json({ success: true, message: `School is now ${school.status}`, data: { id: school.id, status: school.status } });
});

// ═════════════════════════════ Syllabus: Boards ═════════════════════════════
app.get('/api/syllabus/boards', (req, res) => {
  const data = boards.map(b => ({
    ...b,
    _count: {
      books: books.filter(x => x.boardId === b.id).length,
      subjects: subjects9.filter(x => x.boardId === b.id).length,
    },
  }));
  res.json({ success: true, message: 'Boards fetched', data });
});

app.post('/api/syllabus/boards', (req, res) => {
  const { name, code } = req.body || {};
  if (!name || !code) return res.status(400).json({ success: false, message: 'Name and code are required' });
  if (boards.some(b => b.code.toLowerCase() === String(code).toLowerCase())) {
    return res.status(409).json({ success: false, message: 'A board with this code already exists' });
  }
  const board = { id: boardIdSeq++, name, code, region: req.body.region || null, createdAt: new Date().toISOString() };
  boards.push(board);
  res.status(201).json({ success: true, message: 'Board created', data: board });
});

app.put('/api/syllabus/boards/:id', (req, res) => {
  const board = boards.find(b => b.id === Number(req.params.id));
  if (!board) return res.status(404).json({ success: false, message: 'Board not found' });
  Object.assign(board, Object.fromEntries(Object.entries(req.body).filter(([_, v]) => v !== undefined)));
  res.json({ success: true, message: 'Board updated', data: board });
});

app.delete('/api/syllabus/boards/:id', (req, res) => {
  const idx = boards.findIndex(b => b.id === Number(req.params.id));
  if (idx < 0) return res.status(404).json({ success: false, message: 'Board not found' });
  if (books.some(b => b.boardId === boards[idx].id)) {
    return res.status(409).json({ success: false, message: 'Board has linked books — remove them first' });
  }
  boards.splice(idx, 1);
  res.json({ success: true, message: 'Board deleted', data: null });
});

// ═════════════════════════════ Syllabus: Books ═════════════════════════════
app.get('/api/syllabus/books', (req, res) => {
  let filtered = [...books];
  if (req.query.boardId) filtered = filtered.filter(b => b.boardId === Number(req.query.boardId));
  if (req.query.classId) filtered = filtered.filter(b => b.classId === Number(req.query.classId));
  if (req.query.subjectId) filtered = filtered.filter(b => b.subjectId === Number(req.query.subjectId));
  if (req.query.status) filtered = filtered.filter(b => b.status === req.query.status);
  if (req.query.language) filtered = filtered.filter(b => b.language === req.query.language);
  if (req.query.search) {
    const q = String(req.query.search).toLowerCase();
    filtered = filtered.filter(b => b.title.toLowerCase().includes(q) || (b.publisher || '').toLowerCase().includes(q));
  }
  res.json({ success: true, message: 'Books fetched', data: filtered.map(bookView), pagination: { total: filtered.length, page: 1, limit: 50, totalPages: 1, hasNext: false, hasPrev: false } });
});

app.get('/api/syllabus/books/:id', (req, res) => {
  const book = books.find(b => b.id === Number(req.params.id));
  if (!book) return res.status(404).json({ success: false, message: 'Book not found' });
  const chapters = chaptersMath9.filter(c => c.bookId === book.id).map(c => ({
    ...c,
    _count: { ...c._count, exercises: exercises.filter(e => e.chapterId === c.id).length, topics: topics.filter(t => t.chapterId === c.id).length },
    exercises: exercises.filter(e => e.chapterId === c.id).map(exerciseView),
    topics: topics.filter(t => t.chapterId === c.id).map(topicView),
  }));
  res.json({ success: true, message: 'Book fetched', data: { ...bookView(book), chapters } });
});

app.post('/api/syllabus/books', (req, res) => {
  const { title } = req.body || {};
  if (!title) return res.status(400).json({ success: false, message: 'Title is required' });
  const book = { id: bookIdSeq++, title, publisher: req.body.publisher || null, edition: req.body.edition || null, year: req.body.year ? Number(req.body.year) : null, language: req.body.language || 'english', fileUrl: req.body.fileUrl || null, status: req.body.status || 'active', boardId: req.body.boardId ? Number(req.body.boardId) : null, classId: req.body.classId ? Number(req.body.classId) : null, subjectId: req.body.subjectId ? Number(req.body.subjectId) : null, createdAt: new Date().toISOString() };
  books.push(book);
  res.status(201).json({ success: true, message: 'Book created', data: bookView(book) });
});

app.put('/api/syllabus/books/:id', (req, res) => {
  const book = books.find(b => b.id === Number(req.params.id));
  if (!book) return res.status(404).json({ success: false, message: 'Book not found' });
  const body = { ...req.body };
  for (const k of ['boardId', 'classId', 'subjectId', 'year']) {
    if (body[k] !== undefined) body[k] = body[k] ? Number(body[k]) : null;
  }
  Object.assign(book, Object.fromEntries(Object.entries(body).filter(([_, v]) => v !== undefined)));
  res.json({ success: true, message: 'Book updated', data: bookView(book) });
});

app.delete('/api/syllabus/books/:id', (req, res) => {
  const idx = books.findIndex(b => b.id === Number(req.params.id));
  if (idx < 0) return res.status(404).json({ success: false, message: 'Book not found' });
  if (chaptersMath9.some(c => c.bookId === books[idx].id)) {
    return res.status(409).json({ success: false, message: 'Book has linked chapters — unlink them first' });
  }
  books.splice(idx, 1);
  res.json({ success: true, message: 'Book deleted', data: null });
});

// ═════════════════════════════ Syllabus: Chapters (drill-down) ═════════════════════════════
app.get('/api/syllabus/chapters', (req, res) => {
  let filtered = [...chaptersMath9];
  if (req.query.bookId) filtered = filtered.filter(c => c.bookId === Number(req.query.bookId));
  if (req.query.subjectId) filtered = filtered.filter(c => c.subjectId === Number(req.query.subjectId));
  const data = filtered.map(c => ({
    ...c,
    subject: { id: c.subjectId, name: 'Mathematics' },
    _count: { ...c._count, exercises: exercises.filter(e => e.chapterId === c.id).length, topics: topics.filter(t => t.chapterId === c.id).length },
    exercises: exercises.filter(e => e.chapterId === c.id).map(exerciseView),
    topics: topics.filter(t => t.chapterId === c.id).map(topicView),
  }));
  res.json({ success: true, message: 'Chapters fetched', data });
});

// ═════════════════════════════ Syllabus: Exercises ═════════════════════════════
app.get('/api/syllabus/exercises', (req, res) => {
  let filtered = [...exercises];
  if (req.query.chapterId) filtered = filtered.filter(e => e.chapterId === Number(req.query.chapterId));
  res.json({ success: true, message: 'Exercises fetched', data: filtered.map(exerciseView) });
});

app.post('/api/syllabus/exercises', (req, res) => {
  const { name, chapterId } = req.body || {};
  if (!name || !chapterId) return res.status(400).json({ success: false, message: 'Name and chapterId are required' });
  if (exercises.some(e => e.chapterId === Number(chapterId) && e.number === Number(req.body.number || 1))) {
    return res.status(409).json({ success: false, message: 'An exercise with this number already exists in the chapter' });
  }
  const exercise = { id: exerciseIdSeq++, name, number: Number(req.body.number || 1), chapterId: Number(chapterId) };
  exercises.push(exercise);
  res.status(201).json({ success: true, message: 'Exercise created', data: exerciseView(exercise) });
});

app.put('/api/syllabus/exercises/:id', (req, res) => {
  const exercise = exercises.find(e => e.id === Number(req.params.id));
  if (!exercise) return res.status(404).json({ success: false, message: 'Exercise not found' });
  if (req.body.name !== undefined) exercise.name = req.body.name;
  if (req.body.number !== undefined) exercise.number = Number(req.body.number);
  res.json({ success: true, message: 'Exercise updated', data: exerciseView(exercise) });
});

app.delete('/api/syllabus/exercises/:id', (req, res) => {
  const idx = exercises.findIndex(e => e.id === Number(req.params.id));
  if (idx < 0) return res.status(404).json({ success: false, message: 'Exercise not found' });
  exercises.splice(idx, 1);
  mockQuestions.forEach(q => { if (q.exerciseId === Number(req.params.id)) q.exerciseId = null; });
  res.json({ success: true, message: 'Exercise deleted', data: null });
});

// ═════════════════════════════ Syllabus: Topics ═════════════════════════════
app.get('/api/syllabus/topics', (req, res) => {
  let filtered = [...topics];
  if (req.query.chapterId) filtered = filtered.filter(t => t.chapterId === Number(req.query.chapterId));
  res.json({ success: true, message: 'Topics fetched', data: filtered.map(topicView) });
});

app.post('/api/syllabus/topics', (req, res) => {
  const { name, chapterId } = req.body || {};
  if (!name || !chapterId) return res.status(400).json({ success: false, message: 'Name and chapterId are required' });
  const topic = { id: topicIdSeq++, name, chapterId: Number(chapterId) };
  topics.push(topic);
  res.status(201).json({ success: true, message: 'Topic created', data: topicView(topic) });
});

app.put('/api/syllabus/topics/:id', (req, res) => {
  const topic = topics.find(t => t.id === Number(req.params.id));
  if (!topic) return res.status(404).json({ success: false, message: 'Topic not found' });
  if (req.body.name !== undefined) topic.name = req.body.name;
  res.json({ success: true, message: 'Topic updated', data: topicView(topic) });
});

app.delete('/api/syllabus/topics/:id', (req, res) => {
  const idx = topics.findIndex(t => t.id === Number(req.params.id));
  if (idx < 0) return res.status(404).json({ success: false, message: 'Topic not found' });
  topics.splice(idx, 1);
  mockQuestions.forEach(q => { if (q.topicId === Number(req.params.id)) q.topicId = null; });
  res.json({ success: true, message: 'Topic deleted', data: null });
});

// ═════════════════════════════ Health ═════════════════════════════
app.get('/health', (req, res) => {
  res.json({ success: true, message: 'Mock API running' });
});

const PORT = 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Mock API server running on port ${PORT}`);
});
