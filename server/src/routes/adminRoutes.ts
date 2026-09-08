import { Router } from 'express';
import { authenticate, requireSchoolAdmin, requireAdmin } from '../middleware/auth';
import {
  createUser, listUsers, getUser, updateUser,
  toggleUserStatus, getAuditLogs, getDashboardStats,
  assignTeacherSubject, removeTeacherSubject, updateUserPermissions,
} from '../controllers/adminController';

const router = Router();
router.use(authenticate);

router.get('/dashboard',            requireSchoolAdmin, getDashboardStats);
router.post('/users',               requireSchoolAdmin, createUser);
router.get('/users',                requireSchoolAdmin, listUsers);
router.get('/users/:id',            requireSchoolAdmin, getUser);
router.put('/users/:id',            requireSchoolAdmin, updateUser);
router.patch('/users/:id/toggle',   requireSchoolAdmin, toggleUserStatus);
router.get('/audit-logs',           requireAdmin,       getAuditLogs);

// ─── Admin System Upgrade ────────────────────────────────────────────────────
router.post('/teacher-subjects',    requireSchoolAdmin, assignTeacherSubject);
router.delete('/teacher-subjects',  requireSchoolAdmin, removeTeacherSubject);
router.put('/users/:id/permissions', requireAdmin,      updateUserPermissions);

export default router;
