/**
 * PHASE 2 — Paper generator v2 routes.
 *   POST   /            generate 1..N papers from the wizard configuration
 *   POST   /preview-pool  candidate pool preview (Phase-4 Step 4, paginated)
 *   GET    /            list (teacher: own; admin: all + filters)
 *   GET    /:id         full paper (header, sections, settings, questions)
 *   PUT    /:id         meta update (title / examTitle / status / description)
 *   DELETE /:id         delete (owner/admin)
 *   POST   /:id/duplicate
 *   PUT    /:id/questions  replace/order/marks
 */
import { Router } from 'express';
import { authenticate } from './auth';
import {
  generatePapers, listPapers, getPaper, updatePaper, deletePaper, duplicatePaper, replaceQuestions, updateFormatting, previewPool,
} from './paperV2Controller';

const router = Router();
router.use(authenticate as any);

router.post('/', generatePapers as any);
// Phase 4 — Step 4 candidate preview (paginated, nothing persisted)
router.post('/preview-pool', previewPool as any);
router.get('/', listPapers as any);
router.get('/:id', getPaper as any);
router.put('/:id', updatePaper as any);
router.delete('/:id', deletePaper as any);
router.post('/:id/duplicate', duplicatePaper as any);
router.put('/:id/questions', replaceQuestions as any);
router.put('/:id/formatting', updateFormatting as any);

export default router;
