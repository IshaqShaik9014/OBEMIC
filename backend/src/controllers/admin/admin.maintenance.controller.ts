import { Request, Response } from 'express';
import { DatabaseMaintenanceService } from '../../services/admin/DatabaseMaintenanceService';

export class AdminMaintenanceController {
  private service = new DatabaseMaintenanceService();

  public resetDatabase = async (req: Request, res: Response): Promise<void> => {
    try {
      const { confirmPhrase, mode } = req.body;

      if (confirmPhrase !== 'RESET_DATABASE') {
        res.status(400).json({ 
          error: 'Safety verification failed. confirmPhrase must equal "RESET_DATABASE".' 
        });
        return;
      }

      const adminUserId = req.user?.userId;
      const result = await this.service.clearUploadedData(adminUserId);

      res.json(result);
    } catch (error: any) {
      console.error('Error during database reset:', error);
      res.status(500).json({ error: error.message || 'Database reset failed.' });
    }
  };
}
