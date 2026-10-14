import { Router } from 'express';
import { AdminMaintenanceController } from '../../controllers/admin/admin.maintenance.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/role.middleware';
import { Permissions } from '../../config/permissions';

const router = Router();
const controller = new AdminMaintenanceController();

router.use(authenticate);
router.use(requirePermission(Permissions.ADMIN_DASHBOARD_VIEW));

router.post('/reset-db', controller.resetDatabase);

export default router;
