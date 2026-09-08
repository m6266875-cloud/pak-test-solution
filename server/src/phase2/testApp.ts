/**
 * PHASE 2 — Sandbox test application.
 *
 * Mounts ONLY the Phase-2 route groups (node-pg based) at the production
 * /api/v2 prefix so it boots in environments where the Prisma engine
 * binaries are unavailable. Production wiring lives in src/app.ts.
 */
import express, { Request, Response, NextFunction } from 'express';
import phase2Api from './mount';

export const createPhase2TestApp = () => {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  app.get('/health', (_req, res) => res.json({ success: true, message: 'phase2 test api' }));

  app.use('/api/v2', phase2Api);

  app.use((_req: Request, res: Response) => {
    res.status(404).json({ success: false, message: 'Route not found' });
  });

  // Local error middleware — same contract as src/middleware/errorHandler,
  // minus the Prisma branch (no engine in this environment). ApiError
  // `details` (e.g. generator 422 shortage payloads) is forwarded as-is.
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err?.statusCode && Number(err.statusCode) >= 400 ? Number(err.statusCode) : 500;
    if (status >= 500) console.error(`[phase2-test] ${req.method} ${req.path}:`, err?.message);
    res.status(status).json({
      success: false,
      message: err?.message ?? 'Internal server error',
      errors: err?.errors ?? undefined,
      details: err?.details ?? undefined,
    });
  });

  return app;
};
