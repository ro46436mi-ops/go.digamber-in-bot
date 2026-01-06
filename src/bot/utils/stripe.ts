import Stripe from 'stripe';
import { config } from './config';
import { logger } from './logger';

export const stripe = new Stripe(config.stripe.secretKey, {
  apiVersion: '2023-10-16'
});

export interface CreateCheckoutSessionParams {
  customerId?: string;
  customerEmail?: string;
  priceId: string;
  guildId: string;
  userId: string;
  successUrl: string;
  cancelUrl: string;
}

export const createCheckoutSession = async (
  params: CreateCheckoutSessionParams
): Promise<Stripe.Checkout.Session> => {
  try {
    const session = await stripe.checkout.sessions.create({
      customer: params.customerId,
      customer_email: params.customerEmail,
      line_items: [{
        price: params.priceId,
        quantity: 1,
      }],
      mode: 'subscription',
      subscription_data: {
        metadata: {
          guildId: params.guildId,
          userId: params.userId
        }
      },
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: {
        guildId: params.guildId,
        userId: params.userId
      }
    });

    logger.info(`Checkout session created: ${session.id} for guild ${params.guildId}`);
    return session;
  } catch (error) {
    logger.error('Failed to create checkout session:', error);
    throw error;
  }
};

export const cancelSubscription = async (subscriptionId: string): Promise<Stripe.Subscription> => {
  try {
    const subscription = await stripe.subscriptions.cancel(subscriptionId);
    logger.info(`Subscription canceled: ${subscriptionId}`);
    return subscription;
  } catch (error) {
    logger.error('Failed to cancel subscription:', error);
    throw error;
  }
};

export const verifyWebhookSignature = (
  payload: string | Buffer,
  signature: string
): Stripe.Event => {
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    config.stripe.webhookSecret
  );
};

export const getSubscription = async (subscriptionId: string): Promise<Stripe.Subscription> => {
  return stripe.subscriptions.retrieve(subscriptionId);
};

export const updateSubscriptionMetadata = async (
  subscriptionId: string,
  metadata: Record<string, string>
): Promise<Stripe.Subscription> => {
  return stripe.subscriptions.update(subscriptionId, { metadata });
};
