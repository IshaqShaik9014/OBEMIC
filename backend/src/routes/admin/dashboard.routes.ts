import { Router } from 'express';
import { adminDashboardController } from '../../controllers/admin/admin.dashboard.controller';
import { authenticate, authorizeRole } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticate, authorizeRole('ADMIN', 'COORDINATOR'));
router.get('/', adminDashboardController.getStats);

export default router;
