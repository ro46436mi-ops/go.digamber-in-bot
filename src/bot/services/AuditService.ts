import { AuditLog } from '../models/AuditLog';
import { logger } from '../utils/logger';

export interface AuditLogData {
  guildId: string;
  userId: string;
  action: string;
  details: Record<string, any>;
  ipAddress?: string;
}

export class AuditService {
  async log(data: AuditLogData): Promise<void> {
    try {
      const auditLog = new AuditLog(data);
      await auditLog.save();
    } catch (error) {
      logger.error('Failed to save audit log:', error);
    }
  }

  async getLogs(
    guildId: string,
    limit: number = 100,
    skip: number = 0,
    action?: string,
    userId?: string
  ): Promise<any[]> {
    const query: any = { guildId };
    
    if (action) {
      query.action = action;
    }
    
    if (userId) {
      query.userId = userId;
    }

    const logs = await AuditLog.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return logs;
  }

  async searchLogs(
    guildId: string,
    searchTerm: string,
    limit: number = 50
  ): Promise<any[]> {
    const logs = await AuditLog.find({
      guildId,
      $or: [
        { action: { $regex: searchTerm, $options: 'i' } },
        { 'details.templateId': { $regex: searchTerm, $options: 'i' } },
        { 'details.channelId': { $regex: searchTerm, $options: 'i' } }
      ]
    })
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();

    return logs;
  }

  async cleanupOldLogs(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await AuditLog.deleteMany({
      timestamp: { $lt: cutoffDate }
    });

    logger.info(`Cleaned up ${result.deletedCount} old audit logs`);
    return result.deletedCount;
  }
}
