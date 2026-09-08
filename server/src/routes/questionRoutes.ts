import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validation';
import { authenticate, requireSchoolAdmin } from '../middleware/auth';
import {
  createQuestion, bulkCreateQuestions, getQuestions,
  updateQuestion, deleteQuestion, getQuestionStats,
  approveQuestion, rejectQuestion,
} from '../controllers/questionController';

const router = Router();
router.use(authenticate);

const questionValidation = [
  body('chapterId').isInt({ min: 1 }).withMessage('Valid chapterId required'),
  body('type').isIn(['mcq', 'short', 'essay']).withMessage('Invalid question type'),
  body('text').trim().isLength({ min: 5 }).withMessage('Question text too short'),
  body('marks').isInt({ min: 1, max: 20 }).withMessage('Marks must be 1-20'),
  body('options').optional().isArray(),
  body('difficulty').optional().isIn(['easy', 'medium', 'hard']),
];

router.get('/',                   getQuestions);
router.get('/stats',              getQuestionStats);
router.post('/',                  requireSchoolAdmin, validate(questionValidation), createQuestion);
router.post('/bulk',              requireSchoolAdmin, bulkCreateQuestions);
router.put('/:id',                requireSchoolAdmin, updateQuestion);
router.delete('/:id',             requireSchoolAdmin, deleteQuestion);
router.patch('/:id/approve',      requireSchoolAdmin, approveQuestion);
router.patch('/:id/reject',       requireSchoolAdmin, rejectQuestion);

export default router;
