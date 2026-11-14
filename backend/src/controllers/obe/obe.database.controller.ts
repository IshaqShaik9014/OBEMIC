import { Request, Response } from 'express';
import { ObeDatabaseService } from '../../services/obe/obe.database.service';
import { logger } from '../../logs/logger';

export class ObeDatabaseController {
  private service: ObeDatabaseService;

  constructor() {
    this.service = new ObeDatabaseService();
  }

  public getMetadata = async (req: Request, res: Response): Promise<void> => {
    try {
      const data = await this.service.getMetadata();
      res.json(data);
    } catch (error: any) {
      logger.error('Error fetching database metadata: ' + (error.message || error));
      res.status(500).json({ error: error.message || 'Failed to fetch metadata' });
    }
  };

  public getRecords = async (req: Request, res: Response): Promise<void> => {
    try {
      const entity = Array.isArray(req.params.entity) ? req.params.entity[0] : req.params.entity;
      const { page, limit, search, filterKey, filterValue } = req.query;

      const result = await this.service.getRecords(entity, {
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 25,
        search: search as string,
        filterKey: filterKey as string,
        filterValue: filterValue as string
      });

      res.json(result);
    } catch (error: any) {
      logger.error('Error fetching entity records: ' + (error.message || error));
      res.status(500).json({ error: error.message || 'Failed to fetch records' });
    }
  };

  public createRecord = async (req: Request, res: Response): Promise<void> => {
    try {
      const entity = Array.isArray(req.params.entity) ? req.params.entity[0] : req.params.entity;
      const userId = req.user?.userId || 'SYSTEM';

      const result = await this.service.createRecord(entity, req.body, userId);
      res.status(201).json({ success: true, data: result });
    } catch (error: any) {
      logger.error('Error creating entity record: ' + (error.message || error));
      res.status(400).json({ error: error.message || 'Failed to create record' });
    }
  };

  public updateRecord = async (req: Request, res: Response): Promise<void> => {
    try {
      const entity = Array.isArray(req.params.entity) ? req.params.entity[0] : req.params.entity;
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const userId = req.user?.userId || 'SYSTEM';

      const result = await this.service.updateRecord(entity, id, req.body, userId);
      res.json({ success: true, data: result });
    } catch (error: any) {
      logger.error('Error updating entity record: ' + (error.message || error));
      res.status(400).json({ error: error.message || 'Failed to update record' });
    }
  };

  public deleteRecord = async (req: Request, res: Response): Promise<void> => {
    try {
      const entity = Array.isArray(req.params.entity) ? req.params.entity[0] : req.params.entity;
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const userId = req.user?.userId || 'SYSTEM';
      const forceCascade = req.query.force === 'true';

      const result = await this.service.deleteRecord(entity, id, userId, forceCascade);
      res.json(result);
    } catch (error: any) {
      logger.error('Error deleting entity record: ' + (error.message || error));
      res.status(400).json({ error: error.message || 'Failed to delete record' });
    }
  };
}
