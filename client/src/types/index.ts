export type Role = 'super_admin' | 'school_admin' | 'teacher';
export type Medium = 'english' | 'urdu' | 'bilingual';
export type QuestionType = 'mcq' | 'short' | 'essay';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type PaperStatus = 'draft' | 'final' | 'archived';
export type LayoutType = 'single_page' | 'double_page' | 'half_page';
export type SchoolStatus = 'active' | 'inactive' | 'suspended';
export type BookStatus = 'active' | 'inactive' | 'archived';
export type QuestionSource = 'manual' | 'imported' | 'past_paper' | 'exercise';
export type QuestionStatus = 'pending' | 'approved' | 'rejected';
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
