import { PremiumUser } from '../models/PremiumUser';
import { AuditService } from './AuditService';
import { stripe } from '../utils/stripe';
import { logger } from '../utils/logger';
import { PremiumTier } from '../../shared/types';

export class PremiumService {
  private auditService: AuditService;

  constructor() {
    this.auditService = new AuditService();
  }

  async activatePremium(
    subscriptionId: string,
    customerId: string,
    userId: string,
    guildId: string,
    tier: 'monthly' | 'lifetime'
  ): Promise<void> {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    const premium = new PremiumUser({
      userId,
      guildId,
      tier,
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: customerId,
      status: subscription.status,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      metadata: subscription.metadata
    });

    await premium.save();

    await this.auditService.log({
      guildId,
      userId,
      action: 'PREMIUM_ACTIVATED',
      details: { 
        subscriptionId, 
        tier,
        periodEnd: premium.currentPeriodEnd 
      }
    });

    logger.info(`Premium activated for guild ${guildId}, user ${userId}`);
  }

  async updatePremiumStatus(
    subscriptionId: string,
    status: PremiumTier['status']
  ): Promise<void> {
    const premium = await PremiumUser.findOneAndUpdate(
      { stripeSubscriptionId: subscriptionId },
      { 
        status,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (premium) {
      logger.info(`Premium status updated: ${subscriptionId} -> ${status}`);
    }
  }

  async cancelPremium(
    subscriptionId: string,
    reason?: string
  ): Promise<void> {
    const premium = await PremiumUser.findOneAndUpdate(
      { stripeSubscriptionId: subscriptionId },
      { 
        status: 'canceled',
        canceledAt: new Date()
      },
      { new: true }
    );

    if (premium) {
      await this.auditService.log({
        guildId: premium.guildId,
        userId: premium.userId,
        action: 'PREMIUM_CANCELED',
        details: { subscriptionId, reason }
      });

      logger.info(`Premium canceled: ${subscriptionId}, reason: ${reason}`);
    }
  }

  async getGuildPremium(guildId: string): Promise<PremiumTier | null> {
    const premium = await PremiumUser.findOne({
      guildId,
      status: { $in: ['active', 'trialing'] }
    }).lean();

    if (!premium) return null;

    // Check if subscription is still valid
    if (premium.currentPeriodEnd < new Date()) {
      await this.updatePremiumStatus(premium.stripeSubscriptionId!, 'past_due');
      return null;
    }

    return premium as PremiumTier;
  }

  async getUserPremium(userId: string): Promise<PremiumTier[]> {
    const premiums = await PremiumUser.find({
      userId,
      status: { $in: ['active', 'trialing'] }
    }).lean();

    // Filter out expired subscriptions
    const validPremiums = premiums.filter(p => p.currentPeriodEnd >= new Date());
    
    // Update any expired ones
    const expired = premiums.filter(p => p.currentPeriodEnd < new Date());
    for (const expiredPremium of expired) {
      if (expiredPremium.stripeSubscriptionId) {
        await this.updatePremiumStatus(expiredPremium.stripeSubscriptionId, 'past_due');
      }
    }

    return validPremiums as PremiumTier[];
  }

  async isGuildPremium(guildId: string): Promise<boolean> {
    const premium = await this.getGuildPremium(guildId);
    return premium !== null;
  }

  async overridePremium(
    guildId: string,
    userId: string,
    tier: 'monthly' | 'lifetime',
    adminUserId: string
  ): Promise<void> {
    // This is for manual premium activation by admin
    const existing = await PremiumUser.findOne({ guildId, status: 'active' });
    
    if (existing) {
      existing.status = 'canceled';
      existing.canceledAt = new Date();
      await existing.save();
    }

    const premium = new PremiumUser({
      userId,
      guildId,
      tier,
      stripeSubscriptionId: 'admin_override',
      stripeCustomerId: 'admin_override',
      status: 'active',
      currentPeriodEnd: tier === 'lifetime' 
        ? new Date('2099-12-31')
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      metadata: { adminOverride: true, adminUserId }
    });

    await premium.save();

    await this.auditService.log({
      guildId,
      userId: adminUserId,
      action: 'PREMIUM_OVERRIDE',
      details: { guildId, tier, targetUserId: userId }
    });

    logger.info(`Premium override for guild ${guildId} by admin ${adminUserId}`);
  }
}
