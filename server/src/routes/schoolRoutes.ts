import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validation';
import { authenticate, requireAdmin, requireSchoolAdmin } from '../middleware/auth';
import {
  listSchools, getSchool, createSchool, updateSchool, toggleSchoolStatus,
} from '../controllers/schoolController';

const router = Router();
router.use(authenticate);

const schoolValidation = [
  body('name').trim().isLength({ min: 2 }).withMessage('School name is required'),
  body('code').trim().isLength({ min: 2 }).withMessage('School code is required (min 2 chars)'),
  body('email').optional({ nullable: true }).isEmail().withMessage('Invalid email address'),
  body('status').optional().isIn(['active', 'inactive', 'suspended']).withMessage('Invalid status'),
];

router.get('/',                requireSchoolAdmin, listSchools);
router.get('/:id',             requireSchoolAdmin, getSchool);
router.post('/',               requireAdmin, validate(schoolValidation), createSchool);
router.put('/:id',             requireAdmin, updateSchool);
router.patch('/:id/status',    requireAdmin, toggleSchoolStatus);

export default router;
