import { Router, Request, Response, NextFunction } from 'express';
import { ObeDatabaseController } from '../../controllers/obe/obe.database.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();
const controller = new ObeDatabaseController();

// Guard to restrict access strictly to OBE_INCHARGE and ADMIN
const requireObeOrAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const role = req.user.role;
  if (role === 'OBE_INCHARGE' || role === 'ADMIN') {
    next();
  } else {
    res.status(403).json({ error: 'Forbidden: OBE In-charge or Admin access required' });
  }
};

router.use(authenticate);
router.use(requireObeOrAdmin);

// Metadata & lookups
router.get('/metadata', controller.getMetadata);

// Seed master institutional data
router.post('/seed/master', controller.seedMaster);

// CRUD operations on any entity
router.get('/:entity', controller.getRecords);
router.post('/:entity', controller.createRecord);
router.put('/:entity/:id', controller.updateRecord);
router.delete('/:entity/:id', controller.deleteRecord);

export default router;
