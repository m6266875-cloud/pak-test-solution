export type Role = 'super_admin' | 'school_admin' | 'teacher';
export type Medium = 'english' | 'urdu' | 'bilingual';
export type QuestionType = 'mcq' | 'short' | 'essay' | 'true_false' | 'fill_blank' | 'matching' | 'numerical' | 'conceptual';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type PaperStatus = 'draft' | 'final' | 'archived';
export type LayoutType = 'single_page' | 'double_page' | 'half_page';
export type SchoolStatus = 'active' | 'inactive' | 'suspended';
export type BookStatus = 'active' | 'inactive' | 'archived';
export type QuestionSource = 'manual' | 'imported' | 'past_paper' | 'exercise';
export type QuestionStatus = 'pending' | 'approved' | 'rejected' | 'draft' | 'archived';
export type AdminPermissionKey = 'manage_users' | 'manage_schools' | 'manage_syllabus' | 'approve_questions' | 'manage_papers' | 'view_audit';

export interface User { id:number; name:string; email:string; role:Role; schoolName:string|null; schoolId?:number|null; phone?:string|null; isActive:boolean; lastLoginAt?:string|null; createdAt:string; adminPermissions?:Array<{permission:string}>; permissions?:string[]; }

// ─── Admin System Upgrade: Schools ───────────────────────────────────────────
export interface School { id:number; name:string; code:string; email:string|null; phone:string|null; address:string|null; city:string|null; logoUrl:string|null; principal:string|null; status:SchoolStatus; createdAt:string; updatedAt?:string; _count?:{users:number;subjects:number}; }
export interface SchoolFormData { name:string; code:string; email:string; phone:string; address:string; city:string; logoUrl:string; principal:string; status:SchoolStatus; }

// ─── Admin System Upgrade: Syllabus / PTB hierarchy ─────────────────────────
export interface Board { id:number; name:string; code:string; region:string|null; createdAt?:string; _count?:{books:number;subjects:number}; }
export interface Book { id:number; title:string; publisher:string|null; edition:string|null; year:number|null; language:Medium; fileUrl:string|null; status:BookStatus; boardId:number|null; classId:number|null; subjectId:number|null; createdAt?:string; board?:{id:number;name:string;code?:string}|null; class?:{id:number;name:string;grade?:number}|null; subject?:{id:number;name:string}|null; _count?:{chapters:number}; }
export interface BookFormData { title:string; publisher:string; edition:string; year:string; language:Medium; fileUrl:string; status:BookStatus; boardId:string; classId:string; subjectId:string; }
export interface Exercise { id:number; name:string; number:number; chapterId:number; chapter?:{id:number;name:string;subjectId?:number}; _count?:{questions:number}; }
export interface Topic { id:number; name:string; chapterId:number; chapter?:{id:number;name:string;subjectId?:number}; _count?:{questions:number}; }
export interface SyllabusChapter extends Chapter { bookId?:number|null; exercises?:Exercise[]; topics?:Topic[]; _count?:{questions:number;exercises?:number;topics?:number}; }
export interface AuthState { user:User|null; accessToken:string|null; isAuthenticated:boolean; isLoading:boolean; }
export interface ClassItem { id:number; name:string; grade:number; _count?:{subjects:number}; }
export interface Subject { id:number; name:string; code:string|null; medium:Medium; classId:number; description?:string|null; _count?:{chapters:number}; }
export interface Chapter { id:number; name:string; number:number; subjectId:number; description?:string|null; subject?:{id:number;name:string}; _count?:{questions:number}; }
export interface Question { id:number; chapterId:number; exerciseId?:number|null; topicId?:number|null; type:QuestionType; text:string; marks:number; options?:string[]|null; answer?:string|null; difficulty:Difficulty; language?:Medium; source?:QuestionSource; status?:QuestionStatus; tags:string[]; isActive:boolean; createdAt:string; chapter?:{id:number;name:string;subject:{name:string}}; exercise?:{id:number;name:string}|null; topic?:{id:number;name:string}|null; }
export interface PaperSetting { id:number; paperId:number; questionCount:number; mcqCount:number; mcqMarks:number; shortCount:number; shortMarks:number; essayCount:number; essayMarks:number; randomize:boolean; ignoreMarksEnabled:boolean; ignoreMarks:any; blankLines:any; showAnswerKey:boolean; showBubbleSheet:boolean; }
export interface PaperFormatting { id:number; paperId:number; fontFamily:string; fontSize:number; lineHeight:number; bold:boolean; color:string; layoutType:LayoutType; showBorder:boolean; borderColor:string; schoolName:string|null; schoolNameSize:number; schoolNameColor:string; headerNote:string|null; footerNote:string|null; }
export interface PaperQuestion { id:number; paperId:number; questionId:number; marks:number; order:number; isSelected:boolean; question:Question; }
export interface Paper { id:number; title:string; description?:string|null; teacherId:number; createdById:number; classId:number; medium:Medium; totalMarks:number; timeLimit:number; status:PaperStatus; isPublished:boolean; createdAt:string; updatedAt:string; class:ClassItem; paperSubjects:Array<{subject:Subject}>; paperChapters?:Array<{chapter:Chapter}>; paperQuestions:PaperQuestion[]; paperSettings:PaperSetting|null; paperFormatting:PaperFormatting|null; teacher?:Pick<User,'id'|'name'|'email'>; }
export interface PaperListItem { id:number; title:string; status:PaperStatus; totalMarks:number; timeLimit:number; medium:Medium; createdAt:string; class:{name:string;grade:number}; paperSubjects:Array<{subject:{name:string}}>; paperSettings:{mcqCount:number;shortCount:number;essayCount:number}|null; }
export interface GeneratorFormData { title:string; classId:number; subjectIds:number[]; chapterIds:number[]; medium:Medium; mcq:{count:number;marks:number}; short:{count:number;marks:number}; essay:{count:number;marks:number}; timeLimit:number; randomize:boolean; showAnswerKey:boolean; showBubbleSheet:boolean; schoolName:string; ignoreMarks:{enabled:boolean;mcq?:{attempt:number;total:number}}; blankLines:{enabled:boolean;forShort:boolean;forEssay:boolean}; }
export interface ApiResponse<T> { success:boolean; message:string; data:T; }
export interface PaginatedResponse<T> { success:boolean; message:string; data:T[]; pagination:{total:number;page:number;limit:number;totalPages:number;hasNext:boolean;hasPrev:boolean}; }
export interface DashboardStats { totalUsers:number; totalPapers:number; totalQuestions:number; recentPapers:PaperListItem[]; papersByStatus:Array<{status:PaperStatus;_count:{id:number}}>; syllabus?:SyllabusStats; questionBreakdown?:QuestionBreakdown; }
export interface SyllabusStats { schools:number; boards:number; books:number; classes:number; chapters:number; exercises:number; topics:number; }
export interface QuestionBreakdown { pending:number; byStatus:Array<{status:QuestionStatus;_count:{id:number}}>; byType:Array<{type:QuestionType;_count:{id:number}}>; byDifficulty:Array<{difficulty:Difficulty;_count:{id:number}}>; bySource:Array<{source:QuestionSource;_count:{id:number}}>; byLanguage:Array<{language:Medium;_count:{id:number}}>; }
export interface ActivityLog { id:number; userId:number; action:string; details:any; createdAt:string; user:{id:number;name:string;email:string}; }

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 2 — Question Bank + Paper Generator v2 types (server /api/v2)
// ═══════════════════════════════════════════════════════════════════════════
export type PaperTypeV2 = 'objective' | 'subjective' | 'mixed';
export type QuestionCategory = 'exercise' | 'example' | 'review' | 'past_paper' | 'conceptual' | 'practice';

export interface CourseV2 {
  id: number; code: string; name: string; shortName: string | null; type: string;
  logoUrl: string | null; logoEnabled: boolean; status: string; displayOrder: number;
  classCount: number; subjectCount: number; bookCount: number;
  currentSession: { status: string; sessionId: number; code: string; name: string } | null;
}
export interface SessionV2 { status: string; id: number; code: string; name: string; startYear: number; endYear: number; }
export interface ClassV2 { id: number; name: string; grade: number; displayOrder: number; subjectCount: number; }
export interface SubjectV2 { id: number; name: string; code: string | null; medium: string; displayOrder: number; bookCount: number; chapterCount: number; }
export interface BookV2 {
  id: number; title: string; edition: string | null; year: number | null; language: string;
  isbn: string | null; bookCode: string | null; sessionId: number | null; fileStatus: string | null;
  verified: boolean; chapterCount: number;
}
export interface ChapterV2 {
  id: number; number: number; name: string; description: string | null;
  topicCount: number; exerciseCount: number; approvedQuestionCount: number; totalQuestionCount: number;
}
export interface TopicV2 { id: number; name: string; sortOrder: number; approvedQuestionCount: number; totalQuestionCount: number; }
export interface ExerciseV2 { id: number; name: string; number: number; approvedQuestionCount: number; totalQuestionCount: number; }
export interface AvailabilityV2 { type: QuestionType; available: number; }

export interface QuestionRowV2 {
  id: number; chapterId: number; exerciseId: number | null; topicId: number | null; bookId: number | null;
  type: QuestionType; text: string; marks: number; options: any | null; answer: string | null;
  difficulty: Difficulty; language: Medium; source: QuestionSource; status: QuestionStatus;
  tags: string[]; category: string | null; bankNo: string | null; hint: string | null;
  explanation: string | null; images: any | null; pageRef: string | null; sourceRef: string | null;
  isActive: boolean; courseId: number | null; sessionId: number | null; classId: number | null; subjectId: number | null;
  createdById: number | null; updatedById: number | null; createdAt: string; updatedAt: string;
  chapterName?: string; chapterNumber?: number; subjectName?: string | null; className?: string | null;
  courseCode?: string | null; courseName?: string | null; bookTitle?: string | null;
  exerciseName?: string | null; topicName?: string | null; createdByName?: string | null;
}

export interface DistributionInput { type: QuestionType; count: number; marks: number; difficulty?: Difficulty | 'any'; }
export interface GeneratePaperPayload {
  title?: string; examTitle?: string; description?: string;
  courseId?: number; sessionId?: number; classId: number; subjectIds: number[]; bookId?: number;
  chapterIds: number[]; topicIds?: number[]; exerciseIds?: number[];
  paperType: PaperTypeV2; language: 'english' | 'urdu' | 'bilingual';
  totalMarks: number; distribution: DistributionInput[];
  timeLimit?: number; paperCount?: number;
  autoSelect?: boolean; questionIds?: number[];
}
export interface GeneratedPaperSummary { id: number; title: string; totalMarks: number; paperType: string; questionCount: number; paperIndex: number; paperCount: number; }
export interface GenerateResult {
  papers: GeneratedPaperSummary[];
  warnings: string[];
  available: Record<string, number>;
}
export interface PaperQuestionV2 {
  paperQuestionId: number; questionId: number; marks: number; order: number; isSelected: boolean;
  snapshotType: QuestionType | null; snapshotDifficulty: Difficulty | null; snapshotLanguage: Medium | null;
  displayTextOverride: string | null;
  text: string; options: any | null; answer: string | null; difficulty: Difficulty; language: Medium;
  type: QuestionType; images: any | null;
}
export interface PaperV2 {
  id: number; title: string; description: string | null; teacherId: number; createdById: number;
  classId: number; medium: Medium; totalMarks: number; timeLimit: number | null; status: PaperStatus;
  isPublished: boolean; createdAt: string; updatedAt: string;
  courseId: number | null; sessionId: number | null; bookId: number | null;
  paperType: string; examTitle: string | null;
  className: string; grade: number; courseCode: string | null; courseName: string | null;
  bookTitle: string | null; teacherName: string;
  subjects: Array<{ id: number; name: string; code: string | null; medium: Medium }>;
  chapters: Array<{ id: number; number: number; name: string }>;
  questions: PaperQuestionV2[];
  settings: (PaperSettingV2) | null;
  formatting: any | null;
}
export interface PaperSettingV2 {
  id: number; paperId: number; questionCount: number; mcqCount: number; mcqMarks: number;
  shortCount: number; shortMarks: number; essayCount: number; essayMarks: number;
  randomize: boolean; ignoreMarksEnabled: boolean; distribution: DistributionInput[] | null;
  generationConfig: any | null; paperCount: number; paperIndex: number;
}
export interface PaperSummaryV2 {
  id: number; title: string; paperType: string; medium: Medium; status: PaperStatus;
  totalMarks: number; timeLimit: number | null; createdAt: string; updatedAt: string;
  classId: number; courseId: number | null; sessionId: number | null; examTitle: string | null;
  className: string; grade: number; courseCode: string | null; teacherName: string;
  subjects: Array<{ id: number; name: string }> | null;
  questionCount: number;
}
export interface PatternV2 {
  id: number; name: string; description: string | null; config: any; isShared: boolean;
  createdById: number; createdAt: string; ownerName?: string;
}
export interface ImportResult { created: number; imported: number[]; errors: string[]; }
export interface BulkStatusResult { updated: number; status: QuestionStatus; }

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 3 — Schools / Users / Templates / Analytics / Audit (server /api/v3)
// ═══════════════════════════════════════════════════════════════════════════
export type SchoolStatusV3 = 'active' | 'pending' | 'suspended' | 'archived';
export type AdminPermissionV3 = 'users' | 'schools' | 'courses' | 'books' | 'syllabus' | 'questionBank' | 'paperGeneration' | 'generatedPapers' | 'analytics' | 'settings' | 'audit';
export const ADMIN_PERMISSIONS_V3: AdminPermissionV3[] = [
  'users', 'schools', 'courses', 'books', 'syllabus', 'questionBank',
  'paperGeneration', 'generatedPapers', 'analytics', 'settings', 'audit',
];
export const PERMISSION_LABELS_V3: Record<AdminPermissionV3, string> = {
  users: 'Users & Teachers', schools: 'Schools & Logos', courses: 'Courses',
  books: 'Books', syllabus: 'Syllabus', questionBank: 'Question Bank',
  paperGeneration: 'Paper Generation', generatedPapers: 'Generated Papers',
  analytics: 'Analytics', settings: 'Templates & Settings', audit: 'Activity Log',
};

export interface SchoolV3 {
  id: number; name: string; code: string; email: string | null; phone: string | null;
  address: string | null; city: string | null; principalName: string | null;
  logoUrl: string | null; status: SchoolStatusV3; branding: any;
  teacherCount?: number; paperCount?: number;
  createdAt: string; updatedAt?: string;
}
export interface WatermarkConfigV3 { enabled: boolean; opacity: number; size: number; position: string; }
export interface BrandingConfigV3 {
  watermark?: WatermarkConfigV3;
  header?: { showSchoolName?: boolean; showLogo?: boolean; showContact?: boolean };
  footer?: { enabled?: boolean; note?: string };
  defaultTemplateId?: number | null;
}
export interface TeacherAssignmentV3 {
  classId: number; className: string; grade: number; subjectId: number;
  subjectName: string; medium: string; courseCode: string; courseName: string;
}
export interface UserRowV3 {
  id: number; name: string; email: string; role: Role; schoolId: number | null;
  schoolName: string | null; isActive: boolean; createdAt: string; updatedAt: string;
  permissions: string[]; assignmentCount?: number; subjects?: string[] | null;
  assignments?: TeacherAssignmentV3[]; lastLoginAt?: string | null;
}
export interface CatalogSubjectOptionV3 { id: number; name: string; medium: string; }
export interface CatalogClassOptionV3 {
  id: number; grade: number; className: string; courseId: number; courseCode: string;
  subjects: CatalogSubjectOptionV3[];
}
export interface CatalogOptionsV3 { courses: Array<{ id: number; code: string; name: string }>; classes: CatalogClassOptionV3[]; }
export interface UserListResultV3 { rows: UserRowV3[]; total: number; page: number; limit: number; }
export interface SchoolListResultV3 { rows: SchoolV3[]; total: number; page: number; limit: number; }

export type TemplateKindV3 = 'school_exam' | 'monthly_test' | 'mid_term' | 'final_term' | 'practice_test' | 'board_pattern';
export const TEMPLATE_KIND_LABELS_V3: Record<TemplateKindV3, string> = {
  school_exam: 'School Exam', monthly_test: 'Monthly Test', mid_term: 'Mid Term',
  final_term: 'Final Term', practice_test: 'Practice Test', board_pattern: 'Board Pattern',
};
export interface TemplateV3 {
  id: number; schoolId: number | null; name: string; kind: TemplateKindV3;
  config: any; isDefault: boolean; isActive: boolean;
  schoolName?: string | null; createdAt: string; updatedAt: string;
}
export interface AuditRowV3 {
  id: number; userId: number | null; role: string | null; schoolId: number | null;
  action: string; entity: string; entityId: string | null; details: any;
  createdAt: string; userName?: string | null; userEmail?: string | null; schoolName?: string | null;
}
export interface AuditListResultV3 { rows: AuditRowV3[]; total: number; page: number; limit: number; }
export interface PaperRowV3 {
  id: number; title: string; paperType: string; medium: Medium; status: PaperStatus;
  totalMarks: number; timeLimit: number | null; createdAt: string;
  className: string; grade: number; courseCode: string | null;
  teacherName: string; schoolId?: number | null;
  subjects: Array<{ id: number; name: string }> | null; questionCount: number;
  examTitle: string | null;
}
export interface AnalyticsOverviewV3 {
  totals: { schools: number; teachers: number; courses: number; books: number; classes: number; papers: number; questions: number };
  questionsByType: Array<{ type: string; n: number }>;
  questionsByStatus: Array<{ status: string; n: number }>;
  papersByStatus: Array<{ status: string; n: number }>;
}
export interface PaperActivityV3 { today: number; week: number; month: number; daily: Array<{ day: string; n: number }>; }
export interface TopListsV3 {
  schools: Array<{ id: number; name: string; code: string; papers: number }>;
  teachers: Array<{ id: number; name: string; email: string; papers: number }>;
  subjects: Array<{ id: number; name: string; medium: string; papers: number }>;
}
export interface SchoolDashboardV3 {
  school: { id: number; name: string; code: string; status: string; logoUrl: string | null };
  counts: { teachers: number; papers: number; courses: number; classes: number; byStatus: Array<{ status: string; n: number }> };
  recentPapers: Array<{ id: number; title: string; status: string; totalMarks: number; examTitle: string | null; createdAt: string; teacherName: string; className: string; grade: number; subjects: Array<{ id: number; name: string }> | null }>;
}
