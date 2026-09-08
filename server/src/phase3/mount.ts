/**
 * PHASE 3 — API mount.
 *
 * Sandbox: mounted by server/scripts/dev-gateway.ts at /api/v3. Production:
 * mounted the same way in src/app.ts (guarded behind the Phase-2 auth, which
 * shares the same JWT so /api/v2 and /api/v3 tokens are interchangeable).
 */
import { Router } from 'express';
import v3Routes from './routes';

const phase3Api = Router();
phase3Api.use(v3Routes);

export default phase3Api;
