import { Request, Response } from 'express';
import { ReviewService } from '../services/review.service';
import { logger } from '../logs/logger';
import { Roles } from '../config/roles';

export class ReviewController {
  private reviewService: ReviewService;

  constructor() {
    this.reviewService = new ReviewService();
  }

  private getDepartmentFilter(req: Request): string | undefined {
    // If an explicit departmentId is passed in query params, respect it
    if (req.query.departmentId) {
      return String(req.query.departmentId);
    }
    // Scope to user's assigned department (e.g. B.Ed. HOD, Branch HOD, Coordinator)
    if ((req.user as any)?.departmentId) {
      return (req.user as any)?.departmentId;
    }
    // Institutional administrators without a department can view all
    return undefined;
  }

  public getDashboardStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const departmentId = this.getDepartmentFilter(req);
      const stats = await this.reviewService.getDashboardStats(departmentId);
      res.status(200).json(stats);
    } catch (error: any) {
      logger.error(`Error fetching review dashboard stats: ${error.message}`);
      res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
  };

  public getPendingReports = async (req: Request, res: Response): Promise<void> => {
    try {
      const departmentId = this.getDepartmentFilter(req);
      const reports = await this.reviewService.getPendingReports(departmentId);
      res.status(200).json(reports);
    } catch (error: any) {
      logger.error(`Error fetching pending reports: ${error.message}`);
      res.status(500).json({ error: 'Failed to fetch pending reports' });
    }
  };

  public approveReport = async (req: Request, res: Response): Promise<void> => {
    try {
      const reportId = String(req.params.id);
      const updated = await this.reviewService.approveReport(reportId, req.user!.userId);
      res.status(200).json({ message: 'Report approved successfully', report: updated });
    } catch (error: any) {
      logger.error(`Error approving report: ${error.message}`);
      if (error.message.includes('not found') || error.message.includes('Cannot approve')) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to approve report' });
      }
    }
  };

  public rejectReport = async (req: Request, res: Response): Promise<void> => {
    try {
      const reportId = String(req.params.id);
      const { reason } = req.body;

      
      if (!reason || reason.trim() === '') {
        res.status(400).json({ error: 'Rejection reason is required' });
        return;
      }

      const updated = await this.reviewService.rejectReport(reportId, req.user!.userId, reason);
      res.status(200).json({ message: 'Report rejected successfully', report: updated });
    } catch (error: any) {
      logger.error(`Error rejecting report: ${error.message}`);
      if (error.message.includes('not found') || error.message.includes('Cannot reject')) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to reject report' });
      }
    }
  };
}
