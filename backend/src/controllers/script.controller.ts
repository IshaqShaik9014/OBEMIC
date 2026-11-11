import { Request, Response } from 'express';
import { ScriptService, UploadedFileInfo } from '../services/scripts/script.service';
import { logger } from '../logs/logger';
import prisma from '../database';
import path from 'path';
import fs from 'fs';

export class ScriptController {
  private scriptService = new ScriptService();

  public getMetadata = async (req: Request, res: Response): Promise<void> => {
    try {
      const data = await this.scriptService.getMetadataOptions();
      res.json(data);
    } catch (e: any) {
      logger.error('Error fetching script metadata:', e);
      res.status(500).json({ error: e.message });
    }
  };

  public getSubjects = async (req: Request, res: Response): Promise<void> => {
    try {
      const { departmentId, regulationId, semesterLevel } = req.query;
      const subjects = await this.scriptService.getFilteredSubjects({
        departmentId: departmentId as string,
        regulationId: regulationId as string,
        semesterLevel: semesterLevel as string
      });
      res.json(subjects);
    } catch (e: any) {
      logger.error('Error fetching subjects for scripts:', e);
      res.status(500).json({ error: e.message });
    }
  };

  public getSubjectFaculty = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const faculty = await this.scriptService.getSubjectLinkedFaculty(id as string);
      res.json(faculty);
    } catch (e: any) {
      logger.error('Error fetching faculty for subject:', e);
      res.status(400).json({ error: e.message });
    }
  };

  public getBranchCoordinators = async (req: Request, res: Response): Promise<void> => {
    try {
      const { departmentId } = req.query;
      const coordinators = await this.scriptService.getBranchCoordinators(departmentId as string);
      res.json(coordinators);
    } catch (e: any) {
      logger.error('Error fetching branch coordinators:', e);
      res.status(400).json({ error: e.message });
    }
  };

  public getBranchBundles = async (req: Request, res: Response): Promise<void> => {
    try {
      let departmentId = req.query.departmentId as string;
      if (!departmentId) {
        const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
        departmentId = user?.departmentId || '';
      }

      if (!departmentId) {
        res.status(400).json({ error: 'Department ID is required to fetch branch scripts' });
        return;
      }

      const bundles = await this.scriptService.getBranchBundles(departmentId);
      res.json(bundles);
    } catch (e: any) {
      logger.error('Error fetching branch bundles:', e);
      res.status(500).json({ error: e.message });
    }
  };

  public assignToSubjectCoordinator = async (req: Request, res: Response): Promise<void> => {
    try {
      const { bundleId, facultyId, visibleFrom, visibleUntil, notes } = req.body;
      if (!bundleId || !facultyId || !visibleFrom) {
        res.status(400).json({ error: 'Missing required assignment fields (bundleId, facultyId, visibleFrom)' });
        return;
      }

      const assignment = await this.scriptService.assignToSubjectCoordinator(
        bundleId,
        facultyId,
        req.user!.userId,
        visibleFrom,
        visibleUntil,
        notes
      );

      res.status(200).json({
        message: 'Scripts successfully delegated to Subject Coordinator with scheduled evaluation window.',
        assignment
      });
    } catch (e: any) {
      logger.error('Error assigning scripts to Subject Coordinator:', e);
      res.status(500).json({ error: e.message });
    }
  };

  public uploadBundle = async (req: Request, res: Response): Promise<void> => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        res.status(400).json({ error: 'Please select script files or a folder to upload' });
        return;
      }

      const {
        bundleName,
        academicYearId,
        regulationId,
        departmentId,
        yearLevel,
        semesterLevel,
        month,
        subjectId,
        filePaths,
        isZip
      } = req.body;

      if (!bundleName || !academicYearId || !departmentId || !yearLevel || !semesterLevel || !month || !subjectId) {
        res.status(400).json({ error: 'Missing required metadata fields (bundleName, academicYearId, departmentId, yearLevel, semesterLevel, month, subjectId)' });
        return;
      }

      // 1. Check if a compressed ZIP archive was uploaded
      const isZipArchive = isZip === 'true' || (files.length === 1 && files[0].originalname.toLowerCase().endsWith('.zip'));

      if (isZipArchive) {
        const zipFile = files[0];
        const result = await this.scriptService.createScriptBundleFromZip(
          {
            bundleName,
            academicYearId,
            regulationId,
            departmentId,
            yearLevel,
            semesterLevel,
            month,
            subjectId,
            uploadedById: req.user!.userId
          },
          zipFile.path
        );

        res.status(201).json({
          message: `ZIP archive "${zipFile.originalname}" successfully extracted and organized with ${result.filesCount} script files.`,
          ...result
        });
        return;
      }

      // 2. Regular multi-file / folder upload
      let parsedPaths: string[] = [];
      if (filePaths) {
        try {
          parsedPaths = typeof filePaths === 'string' ? JSON.parse(filePaths) : filePaths;
        } catch {
          parsedPaths = [];
        }
      }

      const uploadedFiles: UploadedFileInfo[] = files.map((f, index) => {
        const relativePath = parsedPaths[index] || f.originalname;
        return {
          fileName: path.basename(relativePath),
          relativePath: relativePath,
          tempFilePath: f.path,
          fileSize: f.size,
          mimeType: f.mimetype
        };
      });

      const result = await this.scriptService.createScriptBundle(
        {
          bundleName,
          academicYearId,
          regulationId,
          departmentId,
          yearLevel,
          semesterLevel,
          month,
          subjectId,
          uploadedById: req.user!.userId
        },
        uploadedFiles
      );

      res.status(201).json({
        message: 'Script bundle uploaded and organized successfully',
        ...result
      });
    } catch (e: any) {
      logger.error('Error uploading script bundle:', e);
      res.status(500).json({ error: e.message });
    }
  };

  public getBundles = async (req: Request, res: Response): Promise<void> => {
    try {
      const { subjectId, departmentId, academicYearId } = req.query;
      const bundles = await this.scriptService.getBundles({
        subjectId: subjectId as string,
        departmentId: departmentId as string,
        academicYearId: academicYearId as string
      });
      res.json(bundles);
    } catch (e: any) {
      logger.error('Error fetching script bundles:', e);
      res.status(500).json({ error: e.message });
    }
  };

  public getBundleDetails = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const bundle = await this.scriptService.getBundleDetails(id as string);
      res.json(bundle);
    } catch (e: any) {
      logger.error('Error fetching bundle details:', e);
      res.status(404).json({ error: e.message });
    }
  };

  public assignBundle = async (req: Request, res: Response): Promise<void> => {
    try {
      const { bundleId, facultyId, visibleFrom, visibleUntil, notes } = req.body;
      if (!bundleId || !facultyId || !visibleFrom) {
        res.status(400).json({ error: 'bundleId, facultyId, and visibleFrom timestamp are required' });
        return;
      }

      const assignment = await this.scriptService.assignBundle({
        bundleId,
        facultyId,
        assignedById: req.user!.userId,
        visibleFrom,
        visibleUntil,
        notes
      });

      res.status(200).json({
        message: 'Scripts assigned to faculty successfully with scheduled visibility',
        assignment
      });
    } catch (e: any) {
      logger.error('Error assigning scripts to faculty:', e);
      res.status(500).json({ error: e.message });
    }
  };

  public deassignBundle = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const assignment = await this.scriptService.deassignBundle(id as string);
      res.json({
        message: 'Faculty deassigned from script bundle successfully',
        assignment
      });
    } catch (e: any) {
      logger.error('Error deassigning faculty from bundle:', e);
      res.status(500).json({ error: e.message });
    }
  };

  public getFacultyScripts = async (req: Request, res: Response): Promise<void> => {
    try {
      const facultyId = req.user!.userId;
      const scripts = await this.scriptService.getFacultyScripts(facultyId);
      res.json(scripts);
    } catch (e: any) {
      logger.error('Error fetching faculty scripts:', e);
      res.status(500).json({ error: e.message });
    }
  };

  public downloadFile = async (req: Request, res: Response): Promise<void> => {
    try {
      const { fileId } = req.params;
      const userId = req.user!.userId;
      const userRole = req.user!.role;

      const file = await this.scriptService.getFileForDownload(fileId as string, userId, userRole);

      if (!fs.existsSync(file.storagePath)) {
        res.status(404).json({ error: 'File not found on storage disk' });
        return;
      }

      res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `inline; filename="${file.fileName}"`);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');

      const fileStream = fs.createReadStream(file.storagePath);
      fileStream.pipe(res);
    } catch (e: any) {
      logger.error('Error downloading script file:', e);
      res.status(403).json({ error: e.message });
    }
  };
}
