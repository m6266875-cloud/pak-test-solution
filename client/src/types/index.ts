export type Role = 'super_admin' | 'school_admin' | 'teacher';
export type Medium = 'english' | 'urdu' | 'bilingual';
export type QuestionType = 'mcq' | 'short' | 'essay';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type PaperStatus = 'draft' | 'final' | 'archived';
export type LayoutType = 'single_page' | 'double_page' | 'half_page';

export interface User { id:number; name:string; email:string; role:Role; schoolName:string|null; phone?:string|null; isActive:boolean; lastLoginAt?:string|null; createdAt:string; }
export interface AuthState { user:User|null; accessToken:string|null; isAuthenticated:boolean; isLoading:boolean; }
export interface ClassItem { id:number; name:string; grade:number; _count?:{subjects:number}; }
export interface Subject { id:number; name:string; code:string|null; medium:Medium; classId:number; description?:string|null; _count?:{chapters:number}; }
export interface Chapter { id:number; name:string; number:number; subjectId:number; description?:string|null; subject?:{id:number;name:string}; _count?:{questions:number}; }
export interface Question { id:number; chapterId:number; type:QuestionType; text:string; marks:number; options?:string[]|null; answer?:string|null; difficulty:Difficulty; tags:string[]; isActive:boolean; createdAt:string; chapter?:{id:number;name:string;subject:{name:string}}; }
export interface PaperSetting { id:number; paperId:number; questionCount:number; mcqCount:number; mcqMarks:number; shortCount:number; shortMarks:number; essayCount:number; essayMarks:number; randomize:boolean; ignoreMarksEnabled:boolean; ignoreMarks:any; blankLines:any; showAnswerKey:boolean; showBubbleSheet:boolean; }
export interface PaperFormatting { id:number; paperId:number; fontFamily:string; fontSize:number; lineHeight:number; bold:boolean; color:string; layoutType:LayoutType; showBorder:boolean; borderColor:string; schoolName:string|null; schoolNameSize:number; schoolNameColor:string; headerNote:string|null; footerNote:string|null; }
export interface PaperQuestion { id:number; paperId:number; questionId:number; marks:number; order:number; isSelected:boolean; question:Question; }
export interface Paper { id:number; title:string; description?:string|null; teacherId:number; createdById:number; classId:number; medium:Medium; totalMarks:number; timeLimit:number; status:PaperStatus; isPublished:boolean; createdAt:string; updatedAt:string; class:ClassItem; paperSubjects:Array<{subject:Subject}>; paperChapters?:Array<{chapter:Chapter}>; paperQuestions:PaperQuestion[]; paperSettings:PaperSetting|null; paperFormatting:PaperFormatting|null; teacher?:Pick<User,'id'|'name'|'email'>; }
export interface PaperListItem { id:number; title:string; status:PaperStatus; totalMarks:number; timeLimit:number; medium:Medium; createdAt:string; class:{name:string;grade:number}; paperSubjects:Array<{subject:{name:string}}>; paperSettings:{mcqCount:number;shortCount:number;essayCount:number}|null; }
export interface GeneratorFormData { title:string; classId:number; subjectIds:number[]; chapterIds:number[]; medium:Medium; mcq:{count:number;marks:number}; short:{count:number;marks:number}; essay:{count:number;marks:number}; timeLimit:number; randomize:boolean; showAnswerKey:boolean; showBubbleSheet:boolean; schoolName:string; ignoreMarks:{enabled:boolean;mcq?:{attempt:number;total:number}}; blankLines:{enabled:boolean;forShort:boolean;forEssay:boolean}; }
export interface ApiResponse<T> { success:boolean; message:string; data:T; }
export interface PaginatedResponse<T> { success:boolean; message:string; data:T[]; pagination:{total:number;page:number;limit:number;totalPages:number;hasNext:boolean;hasPrev:boolean}; }
export interface DashboardStats { totalUsers:number; totalPapers:number; totalQuestions:number; recentPapers:PaperListItem[]; papersByStatus:Array<{status:PaperStatus;_count:{id:number}}>; }
export interface ActivityLog { id:number; userId:number; action:string; details:any; createdAt:string; user:{id:number;name:string;email:string}; }
