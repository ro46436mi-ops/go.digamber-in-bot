import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { authenticateJWT } from '../middleware/auth';
import { config } from '../utils/config';
import { logger } from '../utils/logger';
import { ApiResponse } from '../../shared/types';

const router = Router();

// Generate JWT for dashboard (called by dashboard after Discord OAuth)
router.post('/generate-token', (req, res) => {
  try {
    const { userId, discordId } = req.body;

    if (!userId || !discordId) {
      const response: ApiResponse = {
        success: false,
        error: 'userId and discordId are required'
      };
      res.status(400).json(response);
      return;
    }

    const token = jwt.sign(
      { userId, discordId },
      config.dashboard.jwtSecret,
      { expiresIn: '1h' }
    );

    const response: ApiResponse = {
      success: true,
      data: { token }
    };
    res.json(response);

    logger.info(`JWT generated for user ${userId} (Discord: ${discordId})`);
  } catch (error) {
    logger.error('Error generating token:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to generate token'
    };
    res.status(500).json(response);
  }
});

// Verify token validity
router.post('/verify-token', authenticateJWT, (req, res) => {
  const response: ApiResponse = {
    success: true,
    data: { valid: true, user: req.user }
  };
  res.json(response);
});

// Get bot information for dashboard
router.get('/bot-info', authenticateJWT, (req, res) => {
  const response: ApiResponse = {
    success: true,
    data: {
      name: 'Digamber Discord Bot',
      version: '1.0.0',
      uptime: process.uptime(),
      guildCount: req.client?.guilds.cache.size || 0
    }
  };
  res.json(response);
});

export default router;
