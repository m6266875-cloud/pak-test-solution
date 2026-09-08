import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validation';
import { authenticate } from '../middleware/auth';
import {
  login, register, refreshToken, logout, getProfile, changePassword,
} from '../controllers/authController';

const router = Router();

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required'),
];

const registerValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and number'),
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('schoolName').optional().trim().isLength({ max: 200 }),
  body('phone').optional().trim().isMobilePhone('any'),
];

const changePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password required'),
  body('newPassword')
    .isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and number'),
];

router.post('/login',           validate(loginValidation),          login);
router.post('/register',        validate(registerValidation),       register);
router.post('/refresh',         refreshToken);
router.post('/logout',          authenticate,                       logout);
router.get('/profile',          authenticate,                       getProfile);
router.put('/change-password',  authenticate, validate(changePasswordValidation), changePassword);

export default router;
