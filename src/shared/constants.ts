export const JWT_ALGORITHM = 'HS256';
export const JWT_EXPIRY = '1h';

export const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
export const RATE_LIMIT_MAX = 100; // requests per window per IP

export const PREMIUM_COMMANDS = [
  'premium-template',
  'schedule-message',
  'auto-role-advanced',
  'custom-embed'
];

export const DEFAULT_WELCOME_MESSAGE = 'Welcome {user} to {server}!';

export const AUDIT_ACTIONS = {
  ROLE_ADDED: 'ROLE_ADDED',
  ROLE_REMOVED: 'ROLE_REMOVED',
  MESSAGE_SENT: 'MESSAGE_SENT',
  TEMPLATE_CREATED: 'TEMPLATE_CREATED',
  TEMPLATE_UPDATED: 'TEMPLATE_UPDATED',
  TEMPLATE_DELETED: 'TEMPLATE_DELETED',
  PREMIUM_ACTIVATED: 'PREMIUM_ACTIVATED',
  PREMIUM_CANCELED: 'PREMIUM_CANCELED',
  CONFIG_UPDATED: 'CONFIG_UPDATED'
} as const;

export const STRIPE_WEBHOOK_EVENTS = {
  CHECKOUT_SESSION_COMPLETED: 'checkout.session.completed',
  CUSTOMER_SUBSCRIPTION_UPDATED: 'customer.subscription.updated',
  CUSTOMER_SUBSCRIPTION_DELETED: 'customer.subscription.deleted',
  INVOICE_PAYMENT_SUCCEEDED: 'invoice.payment_succeeded',
  INVOICE_PAYMENT_FAILED: 'invoice.payment_failed'
} as const;
