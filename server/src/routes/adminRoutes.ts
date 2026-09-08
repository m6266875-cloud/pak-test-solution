import { Router } from 'express';
import { authenticate, requireSchoolAdmin, requireAdmin } from '../middleware/auth';
import {
  createUser, listUsers, getUser, updateUser,
  toggleUserStatus, getAuditLogs, getDashboardStats,
} from '../controllers/adminController';

const router = Router();
router.use(authenticate);

router.get('/dashboard',          requireSchoolAdmin, getDashboardStats);
router.post('/users',             requireSchoolAdmin, createUser);
router.get('/users',              requireSchoolAdmin, listUsers);
router.get('/users/:id',          requireSchoolAdmin, getUser);
router.put('/users/:id',          requireSchoolAdmin, updateUser);
router.patch('/users/:id/toggle', requireSchoolAdmin, toggleUserStatus);
router.get('/audit-logs',         requireAdmin,       getAuditLogs);

export default router;
