/**
 * PHASE 2 — Question Bank routes.
 *
 * Compatible superset of the legacy /api/questions surface:
 *   GET    /                 filtered, scoped, paginated list
 *   GET    /stats            breakdown counts with the same filters
 *   GET    /export           csv|json export of the filtered set (admin/teacher own)
 *   POST   /                 create (chapter must be inside the caller scope)
 *   POST   /bulk             import rows (always land as drafts)
 *   GET    /:id              single question (scoped)
 *   PUT    /:id              update (own rows for teachers; admin any)
 *   DELETE /:id              soft delete → archived
 *   POST   /:id/duplicate    copy as draft
 *   PATCH  /:id/approve      admin
 *   PATCH  /:id/reject       admin (reason optional)
 *   PATCH  /bulk-status      admin bulk approve/reject/archive {ids,status,reason}
 */
import { Router } from 'express';
import { authenticate, requireAdmin, Phase2AuthRequest } from './auth';
import {
  listQuestions, getQuestion, createQuestion, updateQuestion, deleteQuestion,
  approveQuestion, rejectQuestion, bulkStatus, bulkCreate, getStats, exportQuestions,
  duplicateQuestion,
} from './questionBankController';

const router = Router();
router.use(authenticate as any);

router.get('/', listQuestions as any);
router.get('/stats', getStats as any);
router.get('/export', exportQuestions as any);
router.post('/', createQuestion as any);
router.post('/bulk', bulkCreate as any);
router.patch('/bulk-status', requireAdmin as any, bulkStatus as any);
router.get('/:id', getQuestion as any);
router.put('/:id', updateQuestion as any);
router.delete('/:id', deleteQuestion as any);
router.post('/:id/duplicate', duplicateQuestion as any);
router.patch('/:id/approve', requireAdmin as any, approveQuestion as any);
router.patch('/:id/reject', requireAdmin as any, rejectQuestion as any);

export default router;
export type { Phase2AuthRequest };
