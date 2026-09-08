import { Router } from 'express';
import { authenticate, requireSchoolAdmin } from '../middleware/auth';
import {
  getClasses, getSubjectsByClass, getChaptersBySubject,
  getChaptersBySubjects, createSubject, createChapter,
} from '../controllers/subjectController';

const router = Router();
router.use(authenticate);

router.get('/classes',                        getClasses);
router.get('/classes/:classId/subjects',      getSubjectsByClass);
router.get('/subjects/:subjectId/chapters',   getChaptersBySubject);
router.get('/chapters',                       getChaptersBySubjects); // ?subjectIds=1,2,3
router.post('/subjects',                      requireSchoolAdmin, createSubject);
router.post('/chapters',                      requireSchoolAdmin, createChapter);

export default router;
