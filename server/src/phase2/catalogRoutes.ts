/**
 * PHASE 2 — Catalog scope routes (wizard data + availability).
 * All GETs; every route is scope-enforced server-side for teachers.
 */
import { Router } from 'express';
import { authenticate } from './auth';
import {
  listCourses, courseSessions, courseClasses, classSubjects,
  subjectBooks, subjectChapters, chapterTopics, chapterExercises, availability,
} from './catalogController';

const router = Router();
router.use(authenticate as any);

router.get('/courses', listCourses as any);
router.get('/courses/:courseId/sessions', courseSessions as any);
router.get('/courses/:courseId/classes', courseClasses as any);
router.get('/classes/:classId/subjects', classSubjects as any);
router.get('/subjects/:subjectId/books', subjectBooks as any);
router.get('/subjects/:subjectId/chapters', subjectChapters as any);
router.get('/chapters/:chapterId/topics', chapterTopics as any);
router.get('/chapters/:chapterId/exercises', chapterExercises as any);
router.get('/availability', availability as any);

export default router;
