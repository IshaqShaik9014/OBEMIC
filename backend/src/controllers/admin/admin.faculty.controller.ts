import { Request, Response } from 'express';
import { FacultyImportService } from '../../services/admin/imports/faculty/FacultyImportService';
import fs from 'fs';
import prisma from '../../database';
import { AcademicService } from '../../services/academic.service';

export class AdminFacultyController {
  private importService = new FacultyImportService();
  private academicService = new AcademicService();

  public previewImport = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }
      
      const adminUserId = req.user?.userId;
      if (!adminUserId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const result = await this.importService.preview(req.file.path, adminUserId);
      
      // Cleanup the uploaded file as it's been parsed and snapshotted
      fs.unlinkSync(req.file.path);

      res.json(result);
    } catch (error: any) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ error: error.message });
    }
  };

  public confirmImport = async (req: Request, res: Response): Promise<void> => {
    try {
      const { batchId } = req.body;
      if (!batchId) {
        res.status(400).json({ error: 'batchId is required' });
        return;
      }

      const adminUserId = req.user?.userId;
      if (!adminUserId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const result = await this.importService.confirm(batchId, adminUserId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  public getFacultyList = async (req: Request, res: Response): Promise<void> => {
    try {
      const { departmentId } = req.query;

      const whereClause: any = { role: { roleName: 'FACULTY' }, isDeleted: false };
      if (departmentId) {
        whereClause.departmentId = String(departmentId);
      }

      const faculty = await prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          email: true,
          employeeId: true,
          department: {
            select: { id: true, departmentName: true }
          },
          facultyProfile: true,
          assignments: {
            where: { status: 'ACTIVE' },
            include: { subject: true, section: true }
          }
        }
      });

      res.status(200).json(faculty);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch faculty list: ' + error.message });
    }
  };

  public assignSubject = async (req: Request, res: Response): Promise<void> => {
    try {
      const { facultyId, subjectId, academicYearId } = req.body;
      const adminUserId = req.user?.userId;

      if (!facultyId || !subjectId || !academicYearId) {
        res.status(400).json({ error: 'facultyId, subjectId, and academicYearId are required' });
        return;
      }

      const assignment = await this.academicService.assignFaculty(facultyId, subjectId, academicYearId, adminUserId);
      res.status(200).json({ message: 'Subject assigned successfully', assignment });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to assign subject: ' + error.message });
    }
  };

  public unassignSubject = async (req: Request, res: Response): Promise<void> => {
    try {
      const assignmentId = String(req.params.id);
      
      const updated = await this.academicService.unassignFaculty(assignmentId);
      res.status(200).json({ message: 'Subject unassigned successfully', updated });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to unassign subject: ' + error.message });
    }
  };
}
