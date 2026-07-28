import { Request, Response } from 'express';
import { FacultyService } from '../services/faculty.service';
import { logger } from '../logs/logger';

export class FacultyController {
  private facultyService = new FacultyService();

  public getDashboard = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const data = await this.facultyService.getDashboardStats(req.user.userId);
      res.json(data);
    } catch (e: any) {
      logger.error('Error fetching faculty dashboard:', e);
      res.status(500).json({ error: e.message });
    }
  };

  public getSubjects = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const subjects = await this.facultyService.getAssignedSubjects(req.user.userId);
      res.json(subjects);
    } catch (e: any) {
      logger.error('Error fetching faculty subjects:', e);
      res.status(500).json({ error: e.message });
    }
  };
}
