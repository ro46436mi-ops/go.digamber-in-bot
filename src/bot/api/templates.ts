import { Router } from 'express';
import { authenticateJWT, requireGuildPermission } from '../middleware/auth';
import { TemplateService } from '../services/TemplateService';
import { PremiumService } from '../services/PremiumService';
import { logger } from '../utils/logger';
import { ApiResponse } from '../../shared/types';

const router = Router();
const templateService = new TemplateService();
const premiumService = new PremiumService();

// Get all templates for a guild
router.get('/guild/:guildId/templates', authenticateJWT, requireGuildPermission('view'), async (req, res) => {
  try {
    const { guildId } = req.params;
    const { userId } = req.user;

    const templates = await templateService.getTemplates(guildId, userId);

    const response: ApiResponse = {
      success: true,
      data: templates
    };
    res.json(response);
  } catch (error) {
    logger.error('Error fetching templates:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to fetch templates'
    };
    res.status(500).json(response);
  }
});

// Get specific template
router.get('/guild/:guildId/templates/:templateId', authenticateJWT, requireGuildPermission('view'), async (req, res) => {
  try {
    const { guildId, templateId } = req.params;

    const template = await templateService.getTemplate(templateId, guildId);

    const response: ApiResponse = {
      success: true,
      data: template
    };
    res.json(response);
  } catch (error) {
    logger.error('Error fetching template:', error);
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch template'
    };
    res.status(404).json(response);
  }
});

// Create new template
router.post('/guild/:guildId/templates', authenticateJWT, requireGuildPermission('manage'), async (req, res) => {
  try {
    const { guildId } = req.params;
    const { userId } = req.user;
    const templateData = req.body;
    const ipAddress = req.ip;

    // Check premium for advanced features
    if (templateData.embeds?.length > 1 || templateData.components?.length > 0) {
      const isPremium = await premiumService.isGuildPremium(guildId);
      if (!isPremium) {
        const response: ApiResponse = {
          success: false,
          error: 'Premium required for advanced template features'
        };
        res.status(403).json(response);
        return;
      }
    }

    templateData.guildId = guildId;
    const template = await templateService.createTemplate(templateData, userId, ipAddress);

    const response: ApiResponse = {
      success: true,
      data: template
    };
    res.status(201).json(response);
  } catch (error) {
    logger.error('Error creating template:', error);
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create template'
    };
    res.status(400).json(response);
  }
});

// Update template
router.put('/guild/:guildId/templates/:templateId', authenticateJWT, requireGuildPermission('manage'), async (req, res) => {
  try {
    const { guildId, templateId } = req.params;
    const { userId } = req.user;
    const updates = req.body;
    const ipAddress = req.ip;

    const template = await templateService.updateTemplate(templateId, updates, userId, ipAddress);

    const response: ApiResponse = {
      success: true,
      data: template
    };
    res.json(response);
  } catch (error) {
    logger.error('Error updating template:', error);
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update template'
    };
    res.status(400).json(response);
  }
});

// Delete template
router.delete('/guild/:guildId/templates/:templateId', authenticateJWT, requireGuildPermission('manage'), async (req, res) => {
  try {
    const { guildId, templateId } = req.params;
    const { userId } = req.user;
    const ipAddress = req.ip;

    await templateService.deleteTemplate(templateId, guildId, userId, ipAddress);

    const response: ApiResponse = {
      success: true,
      data: { message: 'Template deleted successfully' }
    };
    res.json(response);
  } catch (error) {
    logger.error('Error deleting template:', error);
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete template'
    };
    res.status(400).json(response);
  }
});

// Send template immediately
router.post('/guild/:guildId/templates/:templateId/send', authenticateJWT, requireGuildPermission('manage'), async (req, res) => {
  try {
    const { guildId, templateId } = req.params;
    const { userId } = req.user;
    const { channelId } = req.body;
    const ipAddress = req.ip;

    if (!channelId) {
      const response: ApiResponse = {
        success: false,
        error: 'channelId is required'
      };
      res.status(400).json(response);
      return;
    }

    const result = await templateService.sendTemplate(
      templateId,
      guildId,
      channelId,
      req.client!,
      userId,
      ipAddress
    );

    const response: ApiResponse = {
      success: true,
      data: result
    };
    res.json(response);
  } catch (error) {
    logger.error('Error sending template:', error);
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send template'
    };
    res.status(400).json(response);
  }
});

// Schedule template
router.post('/guild/:guildId/templates/:templateId/schedule', authenticateJWT, requireGuildPermission('manage'), async (req, res) => {
  try {
    const { guildId, templateId } = req.params;
    const { userId } = req.user;
    const { scheduledFor } = req.body;
    const ipAddress = req.ip;

    if (!scheduledFor) {
      const response: ApiResponse = {
        success: false,
        error: 'scheduledFor is required'
      };
      res.status(400).json(response);
      return;
    }

    const scheduleDate = new Date(scheduledFor);
    if (isNaN(scheduleDate.getTime())) {
      const response: ApiResponse = {
        success: false,
        error: 'Invalid date format'
      };
      res.status(400).json(response);
      return;
    }

    // Check premium for scheduling
    const isPremium = await premiumService.isGuildPremium(guildId);
    if (!isPremium) {
      const response: ApiResponse = {
        success: false,
        error: 'Premium required for scheduled messages'
      };
      res.status(403).json(response);
      return;
    }

    const template = await templateService.scheduleTemplate(
      templateId,
      scheduleDate,
      guildId,
      userId,
      ipAddress
    );

    const response: ApiResponse = {
      success: true,
      data: template
    };
    res.json(response);
  } catch (error) {
    logger.error('Error scheduling template:', error);
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to schedule template'
    };
    res.status(400).json(response);
  }
});

export default router;
