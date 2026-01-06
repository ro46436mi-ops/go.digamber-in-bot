import { Router } from 'express';
import { authenticateJWT, requireGuildPermission } from '../middleware/auth';
import { RoleService } from '../services/RoleService';
import { logger } from '../utils/logger';
import { ApiResponse } from '../../shared/types';

const router = Router();
const roleService = new RoleService();

// Get guild configuration
router.get('/guild/:guildId/config', authenticateJWT, requireGuildPermission('view'), async (req, res) => {
  try {
    const { guildId } = req.params;
    const config = await roleService.getGuildConfig(guildId);

    const response: ApiResponse = {
      success: true,
      data: config
    };
    res.json(response);
  } catch (error) {
    logger.error('Error fetching guild config:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to fetch guild configuration'
    };
    res.status(500).json(response);
  }
});

// Update guild configuration
router.put('/guild/:guildId/config', authenticateJWT, requireGuildPermission('manage'), async (req, res) => {
  try {
    const { guildId } = req.params;
    const { userId } = req.user;
    const updates = req.body;
    const ipAddress = req.ip;

    const config = await roleService.updateGuildConfig(guildId, updates, userId, ipAddress);

    const response: ApiResponse = {
      success: true,
      data: config
    };
    res.json(response);
  } catch (error) {
    logger.error('Error updating guild config:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to update guild configuration'
    };
    res.status(400).json(response);
  }
});

// Get user permissions in guild
router.get('/guild/:guildId/user/:userId/permissions', authenticateJWT, async (req, res) => {
  try {
    const { guildId, userId } = req.params;
    const client = req.client;

    if (!client) {
      const response: ApiResponse = {
        success: false,
        error: 'Bot client not available'
      };
      res.status(500).json(response);
      return;
    }

    const isAdmin = await roleService.isUserAdmin(guildId, userId, client);
    const isModerator = await roleService.isUserModerator(guildId, userId, client);

    const response: ApiResponse = {
      success: true,
      data: { isAdmin, isModerator }
    };
    res.json(response);
  } catch (error) {
    logger.error('Error checking user permissions:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to check user permissions'
    };
    res.status(500).json(response);
  }
});

// Get guild roles for dashboard
router.get('/guild/:guildId/roles', authenticateJWT, requireGuildPermission('view'), async (req, res) => {
  try {
    const { guildId } = req.params;
    const client = req.client;

    if (!client) {
      const response: ApiResponse = {
        success: false,
        error: 'Bot client not available'
      };
      res.status(500).json(response);
      return;
    }

    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      const response: ApiResponse = {
        success: false,
        error: 'Guild not found'
      };
      res.status(404).json(response);
      return;
    }

    const roles = guild.roles.cache
      .filter(role => !role.managed && role.id !== guild.id) // Exclude @everyone and managed roles
      .map(role => ({
        id: role.id,
        name: role.name,
        color: role.color,
        position: role.position,
        permissions: role.permissions.bitfield.toString()
      }))
      .sort((a, b) => b.position - a.position);

    const response: ApiResponse = {
      success: true,
      data: roles
    };
    res.json(response);
  } catch (error) {
    logger.error('Error fetching guild roles:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to fetch guild roles'
    };
    res.status(500).json(response);
  }
});

// Get guild channels for dashboard
router.get('/guild/:guildId/channels', authenticateJWT, requireGuildPermission('view'), async (req, res) => {
  try {
    const { guildId } = req.params;
    const client = req.client;

    if (!client) {
      const response: ApiResponse = {
        success: false,
        error: 'Bot client not available'
      };
      res.status(500).json(response);
      return;
    }

    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      const response: ApiResponse = {
        success: false,
        error: 'Guild not found'
      };
      res.status(404).json(response);
      return;
    }

    const channels = guild.channels.cache
      .filter(channel => channel.isTextBased())
      .map(channel => ({
        id: channel.id,
        name: channel.name,
        type: channel.type,
        parentId: channel.parentId
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const response: ApiResponse = {
      success: true,
      data: channels
    };
    res.json(response);
  } catch (error) {
    logger.error('Error fetching guild channels:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to fetch guild channels'
    };
    res.status(500).json(response);
  }
});

export default router;
