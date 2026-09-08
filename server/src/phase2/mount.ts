/**
 * PHASE 2 — API mount.
 *
 * Production: app.use('/api/v2', phase2Api) in src/app.ts (guarded: legacy
 * routes stay untouched at /api/...; the Phase-2 superset lives under
 * /api/v2). Sandbox: mounted the same way by src/phase2/testApp.ts so the
 * tests exercise the exact production prefix.
 */
import { Router } from 'express';
import questionBankRoutes from './questionBankRoutes';
import catalogRoutes from './catalogRoutes';
import paperV2Routes from './paperV2Routes';
import patternRoutes from './patternRoutes';

const phase2Api = Router();
phase2Api.use('/questions', questionBankRoutes);
phase2Api.use('/catalog', catalogRoutes);
phase2Api.use('/papers', paperV2Routes);
phase2Api.use('/patterns', patternRoutes);

export default phase2Api;
