import { Router } from 'express';
import { stripe, verifyWebhookSignature } from '../utils/stripe';
import { PremiumService } from '../services/PremiumService';
import { logger } from '../utils/logger';
import { ApiResponse, STRIPE_WEBHOOK_EVENTS } from '../../shared/types';

const router = Router();
const premiumService = new PremiumService();

// Stripe webhook handler
router.post('/stripe', async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;
  let event;

  try {
    event = verifyWebhookSignature(req.body, sig);
  } catch (error) {
    logger.error('Webhook signature verification failed:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Invalid signature'
    };
    res.status(400).json(response);
    return;
  }

  try {
    await handleStripeEvent(event);
    
    const response: ApiResponse = {
      success: true,
      data: { received: true }
    };
    res.json(response);
  } catch (error) {
    logger.error('Error handling webhook event:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Webhook handler failed'
    };
    res.status(500).json(response);
  }
});

async function handleStripeEvent(event: any): Promise<void> {
  switch (event.type) {
    case STRIPE_WEBHOOK_EVENTS.CHECKOUT_SESSION_COMPLETED:
      await handleCheckoutSessionCompleted(event.data.object);
      break;

    case STRIPE_WEBHOOK_EVENTS.CUSTOMER_SUBSCRIPTION_UPDATED:
      await handleSubscriptionUpdated(event.data.object);
      break;

    case STRIPE_WEBHOOK_EVENTS.CUSTOMER_SUBSCRIPTION_DELETED:
      await handleSubscriptionDeleted(event.data.object);
      break;

    case STRIPE_WEBHOOK_EVENTS.INVOICE_PAYMENT_SUCCEEDED:
      await handleInvoicePaymentSucceeded(event.data.object);
      break;

    case STRIPE_WEBHOOK_EVENTS.INVOICE_PAYMENT_FAILED:
      await handleInvoicePaymentFailed(event.data.object);
      break;

    default:
      logger.info(`Unhandled Stripe event type: ${event.type}`);
  }
}

async function handleCheckoutSessionCompleted(session: any): Promise<void> {
  const subscriptionId = session.subscription;
  const customerId = session.customer;
  const metadata = session.metadata;

  if (!subscriptionId || !customerId || !metadata?.guildId || !metadata?.userId) {
    logger.error('Missing data in checkout session:', session);
    return;
  }

  const subscription = await stripe.getSubscription(subscriptionId);
  const tier = subscription.items.data[0]?.price?.recurring?.interval === 'month' 
    ? 'monthly' 
    : 'lifetime';

  await premiumService.activatePremium(
    subscriptionId,
    customerId,
    metadata.userId,
    metadata.guildId,
    tier
  );

  logger.info(`Premium activated via checkout: ${subscriptionId} for guild ${metadata.guildId}`);
}

async function handleSubscriptionUpdated(subscription: any): Promise<void> {
  const status = subscription.status;
  await premiumService.updatePremiumStatus(subscription.id, status);
  logger.info(`Subscription updated: ${subscription.id} -> ${status}`);
}

async function handleSubscriptionDeleted(subscription: any): Promise<void> {
  await premiumService.cancelSubscription(subscription.id, 'subscription_deleted');
  logger.info(`Subscription deleted: ${subscription.id}`);
}

async function handleInvoicePaymentSucceeded(invoice: any): Promise<void> {
  const subscriptionId = invoice.subscription;
  if (subscriptionId) {
    await premiumService.updatePremiumStatus(subscriptionId, 'active');
    logger.info(`Invoice paid: ${invoice.id} for subscription ${subscriptionId}`);
  }
}

async function handleInvoicePaymentFailed(invoice: any): Promise<void> {
  const subscriptionId = invoice.subscription;
  if (subscriptionId) {
    await premiumService.updatePremiumStatus(subscriptionId, 'past_due');
    logger.warn(`Invoice payment failed: ${invoice.id} for subscription ${subscriptionId}`);
  }
}

export default router;
