import { Router } from 'express';
import { AdminLoadTestController } from '../../controllers/admin/admin.loadtest.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();
const controller = new AdminLoadTestController();

// Public health/version check to verify server code deployment
router.get('/version', controller.getVersion);

// Admin authenticated endpoints for sandboxed test management
router.post('/setup', authenticate, controller.setup);
router.post('/teardown', authenticate, controller.teardown);

export default router;
