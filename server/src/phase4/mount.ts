/**
 * PHASE 4 — API mount.
 *
 * Production: app.use('/api/v4', phase4Api) in src/app.ts. Sandbox: mounted
 * the same way by scripts/dev-gateway.ts. Shares the Phase-2 JWT.
 */
import { Router } from 'express';
import wizardRoutes from './wizardRoutes';

const phase4Api = Router();
phase4Api.use(wizardRoutes);

export default phase4Api;
