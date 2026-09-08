import { Router } from 'express';
import { body, param } from 'express-validator';
import { validate } from '../middleware/validation';
import { authenticate, requireTeacher } from '../middleware/auth';
import {
  generatePaper, getPaper, listPapers, updatePaper,
  updateFormatting, deletePaper, downloadPDF, previewPDF,
} from '../controllers/paperController';

const router = Router();
router.use(authenticate);

const generateValidation = [
  body('classId').isInt({ min: 1 }).withMessage('Valid classId required'),
  body('subjectIds').isArray({ min: 1 }).withMessage('At least one subject required'),
  body('chapterIds').isArray({ min: 1 }).withMessage('At least one chapter required'),
  body('medium').isIn(['english', 'urdu', 'bilingual']).withMessage('Invalid medium'),
  body('mcq.count').isInt({ min: 0 }).withMessage('MCQ count must be >= 0'),
  body('mcq.marks').isInt({ min: 1 }).withMessage('MCQ marks must be >= 1'),
  body('short.count').isInt({ min: 0 }).withMessage('Short count must be >= 0'),
  body('short.marks').isInt({ min: 1 }).withMessage('Short marks must be >= 1'),
  body('essay.count').isInt({ min: 0 }).withMessage('Essay count must be >= 0'),
  body('essay.marks').isInt({ min: 1 }).withMessage('Essay marks must be >= 1'),
  body('timeLimit').optional().isInt({ min: 15, max: 240 }),
];

router.post('/',                    requireTeacher, validate(generateValidation), generatePaper);
router.get('/',                     listPapers);
router.get('/:id',                  param('id').isInt(), validate([param('id').isInt()]), getPaper);
router.put('/:id',                  requireTeacher, updatePaper);
router.put('/:id/formatting',       requireTeacher, updateFormatting);
router.delete('/:id',               requireTeacher, deletePaper);
router.get('/:id/download',         downloadPDF);
router.get('/:id/preview',          previewPDF);

export default router;
