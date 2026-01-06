import { Router } from 'express';
import authRoutes from './auth';
import templateRoutes from './templates';
import roleRoutes from './roles';
import premiumRoutes from './premium';
import webhookRoutes from './webhooks';
import { apiRateLimiter } from '../middleware/rateLimit';
import { logger } from '../utils/logger';

const router = Router();

// Apply rate limiting to all API routes
router.use(apiRateLimiter);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API routes
router.use('/auth', authRoutes);
router.use('/api', templateRoutes);
router.use('/api', roleRoutes);
router.use('/api', premiumRoutes);
router.use('/webhooks', webhookRoutes);

// 404 handler for API routes
router.use('/api/*', (req, res) => {
  logger.warn(`API route not found: ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    error: 'API endpoint not found'
  });
});

export default router;
