import { Router } from 'express';
import { ScriptController } from '../controllers/script.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/role.middleware';
import { Permissions } from '../config/permissions';
import { scriptUpload } from '../middleware/script.upload.middleware';

import multer from 'multer';

const router = Router();
const controller = new ScriptController();

// Safe upload wrapper to return 400 instead of unhandled 500 on multer limits
const handleFolderUpload = (req: any, res: any, next: any) => {
  scriptUpload.array('files', 2000)(req, res, (err: any) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: `Upload error: ${err.message}` });
      }
      return res.status(400).json({ error: err.message || 'File upload failed' });
    }
    next();
  });
};

// Metadata & Subjects for OBE In-charge selection panel
router.get(
  '/metadata',
  authenticate,
  requirePermission(Permissions.VIEW_SUBJECTS),
  controller.getMetadata
);

router.get(
  '/subjects',
  authenticate,
  requirePermission(Permissions.VIEW_SUBJECTS),
  controller.getSubjects
);

router.get(
  '/subjects/:id/faculty',
  authenticate,
  requirePermission(Permissions.ASSIGN_SCRIPTS),
  controller.getSubjectFaculty
);

// Branch Coordinators list for OBE In-charge allocation
router.get(
  '/branch-coordinators',
  authenticate,
  requirePermission(Permissions.ASSIGN_SCRIPTS),
  controller.getBranchCoordinators
);

// Branch Coordinator Bundle Management & Delegation
router.get(
  '/branch/my-bundles',
  authenticate,
  requirePermission(Permissions.VIEW_SCRIPTS),
  controller.getBranchBundles
);

router.post(
  '/branch/assign-subject-coordinator',
  authenticate,
  requirePermission(Permissions.ASSIGN_SCRIPTS),
  controller.assignToSubjectCoordinator
);

// Script Bundle Upload (Multi-file & directory upload)
router.post(
  '/upload',
  authenticate,
  requirePermission(Permissions.UPLOAD_SCRIPTS),
  handleFolderUpload,
  controller.uploadBundle
);

// Bundle Listing & Inspection
router.get(
  '/bundles',
  authenticate,
  requirePermission(Permissions.VIEW_SCRIPTS),
  controller.getBundles
);

router.get(
  '/bundles/:id',
  authenticate,
  requirePermission(Permissions.VIEW_SCRIPTS),
  controller.getBundleDetails
);

// Assign & Deassign Scripts
router.post(
  '/assign',
  authenticate,
  requirePermission(Permissions.ASSIGN_SCRIPTS),
  controller.assignBundle
);

router.post(
  '/deassign/:id',
  authenticate,
  requirePermission(Permissions.ASSIGN_SCRIPTS),
  controller.deassignBundle
);

// Faculty Scripts Endpoints
router.get(
  '/faculty/my-scripts',
  authenticate,
  requirePermission(Permissions.VIEW_SCRIPTS),
  controller.getFacultyScripts
);

router.get(
  '/files/:fileId/view',
  authenticate,
  requirePermission(Permissions.VIEW_SCRIPTS),
  controller.downloadFile
);

router.get(
  '/files/:fileId/download',
  authenticate,
  requirePermission(Permissions.VIEW_SCRIPTS),
  controller.downloadFile
);

export default router;
