import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth';
import { PremiumService } from '../services/PremiumService';
import { stripe } from '../utils/stripe';
import { logger } from '../utils/logger';
import { ApiResponse } from '../../shared/types';

const router = Router();
const premiumService = new PremiumService();

// Get premium status for guild
router.get('/guild/:guildId/premium', authenticateJWT, async (req, res) => {
  try {
    const { guildId } = req.params;
    const premium = await premiumService.getGuildPremium(guildId);

    const response: ApiResponse = {
      success: true,
      data: premium
    };
    res.json(response);
  } catch (error) {
    logger.error('Error fetching premium status:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to fetch premium status'
    };
    res.status(500).json(response);
  }
});

// Get premium status for user
router.get('/user/premium', authenticateJWT, async (req, res) => {
  try {
    const { userId } = req.user;
    const premiums = await premiumService.getUserPremium(userId);

    const response: ApiResponse = {
      success: true,
      data: premiums
    };
    res.json(response);
  } catch (error) {
    logger.error('Error fetching user premium:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to fetch user premium status'
    };
    res.status(500).json(response);
  }
});

// Create checkout session
router.post('/checkout-session', authenticateJWT, async (req, res) => {
  try {
    const { userId, discordId } = req.user;
    const { priceId, guildId, successUrl, cancelUrl } = req.body;

    if (!priceId || !guildId || !successUrl || !cancelUrl) {
      const response: ApiResponse = {
        success: false,
        error: 'Missing required fields'
      };
      res.status(400).json(response);
      return;
    }

    const session = await stripe.createCheckoutSession({
      priceId,
      guildId,
      userId: discordId,
      successUrl,
      cancelUrl
    });

    const response: ApiResponse = {
      success: true,
      data: { sessionId: session.id, url: session.url }
    };
    res.json(response);
  } catch (error) {
    logger.error('Error creating checkout session:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to create checkout session'
    };
    res.status(500).json(response);
  }
});

// Cancel subscription
router.post('/subscription/:subscriptionId/cancel', authenticateJWT, async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { reason } = req.body;

    // Verify user owns this subscription
    const premium = await premiumService.getUserPremium(req.user.userId);
    const userSubscription = premium.find(p => p.stripeSubscriptionId === subscriptionId);

    if (!userSubscription) {
      const response: ApiResponse = {
        success: false,
        error: 'Subscription not found or access denied'
      };
      res.status(404).json(response);
      return;
    }

    await stripe.cancelSubscription(subscriptionId);
    await premiumService.cancelSubscription(subscriptionId, reason);

    const response: ApiResponse = {
      success: true,
      data: { message: 'Subscription canceled successfully' }
    };
    res.json(response);
  } catch (error) {
    logger.error('Error canceling subscription:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to cancel subscription'
    };
    res.status(500).json(response);
  }
});

// Admin: Override premium (manual activation)
router.post('/admin/override', authenticateJWT, async (req, res) => {
  try {
    const { adminUserId } = req.user;
    const { guildId, userId, tier } = req.body;

    // Check if requesting user is admin
    // In production, you would have an admin check here
    const isAdmin = true; // Temporary - implement proper admin check

    if (!isAdmin) {
      const response: ApiResponse = {
        success: false,
        error: 'Admin access required'
      };
      res.status(403).json(response);
      return;
    }

    if (!guildId || !userId || !tier) {
      const response: ApiResponse = {
        success: false,
        error: 'Missing required fields'
      };
      res.status(400).json(response);
      return;
    }

    await premiumService.overridePremium(guildId, userId, tier, adminUserId);

    const response: ApiResponse = {
      success: true,
      data: { message: 'Premium override applied successfully' }
    };
    res.json(response);
  } catch (error) {
    logger.error('Error overriding premium:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to override premium'
    };
    res.status(500).json(response);
  }
});

export default router;
