/**
 * PHASE 2 — Paper patterns routes.
 *   GET    /        my + shared patterns
 *   POST   /        save current wizard config as a pattern
 *   GET    /:id     pattern config for applying (own or shared)
 *   PUT    /:id     edit own (admin: any)
 *   DELETE /:id     delete own (admin: any)
 */
import { Router } from 'express';
import { authenticate } from './auth';
import { patternService } from './patternService';
import { Phase2AuthRequest } from './auth';
import { successResponse, ApiError } from '../utils/apiResponse';
import { Response, NextFunction } from 'express';

const idOf = (v: any): number => {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1) throw ApiError.badRequest('Invalid id');
  return n;
};

const listPatterns = async (req: Phase2AuthRequest, res: Response, next: NextFunction) => {
  try { successResponse(res, await patternService.list(req.user!), 'Patterns fetched'); }
  catch (err) { next(err); }
};

const createPattern = async (req: Phase2AuthRequest, res: Response, next: NextFunction) => {
  try { successResponse(res, await patternService.create(req.user!, req.body ?? {}), 'Pattern saved', 201); }
  catch (err) { next(err); }
};

const getPattern = async (req: Phase2AuthRequest, res: Response, next: NextFunction) => {
  try { successResponse(res, await patternService.apply(req.user!, idOf(req.params.id)), 'Pattern fetched'); }
  catch (err) { next(err); }
};

const updatePattern = async (req: Phase2AuthRequest, res: Response, next: NextFunction) => {
  try { successResponse(res, await patternService.update(req.user!, idOf(req.params.id), req.body ?? {}), 'Pattern updated'); }
  catch (err) { next(err); }
};

const deletePattern = async (req: Phase2AuthRequest, res: Response, next: NextFunction) => {
  try { successResponse(res, await patternService.delete(req.user!, idOf(req.params.id)), 'Pattern deleted'); }
  catch (err) { next(err); }
};

const router = Router();
router.use(authenticate as any);
router.get('/', listPatterns as any);
router.post('/', createPattern as any);
router.get('/:id', getPattern as any);
router.put('/:id', updatePattern as any);
router.delete('/:id', deletePattern as any);

export default router;
