import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../utils/config';
import { logger } from '../utils/logger';
import { UserJWT } from '../../shared/types';
import { ApiResponse } from '../../shared/types';

export const authenticateJWT = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const response: ApiResponse = {
      success: false,
      error: 'Authorization header missing or invalid'
    };
    res.status(401).json(response);
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.dashboard.jwtSecret) as UserJWT;
    req.user = decoded;
    next();
  } catch (error) {
    logger.warn('JWT verification failed:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Invalid or expired token'
    };
    res.status(403).json(response);
  }
};

export const requireGuildPermission = (requiredPermission: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { guildId } = req.params;
    const user = req.user as UserJWT;

    if (!guildId) {
      const response: ApiResponse = {
        success: false,
        error: 'Guild ID is required'
      };
      res.status(400).json(response);
      return;
    }

    // In production, this would check Discord API for user's permissions in the guild
    // For now, we'll trust the dashboard's authentication
    req.guildId = guildId;
    next();
  };
};

export const requirePremium = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { guildId } = req.params;

  if (!guildId) {
    const response: ApiResponse = {
      success: false,
      error: 'Guild ID is required for premium features'
    };
    res.status(400).json(response);
    return;
  }

  // Premium check will be implemented in the PremiumService
  // For now, we'll just pass through
  req.guildId = guildId;
  next();
};
