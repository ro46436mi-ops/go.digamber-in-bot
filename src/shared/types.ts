export interface UserJWT {
  userId: string;
  discordId: string;
  iat: number;
  exp: number;
}

export interface TemplateData {
  name: string;
  content: string;
  embeds?: Array<{
    title?: string;
    description?: string;
    color?: number;
    fields?: Array<{ name: string; value: string; inline?: boolean }>;
    thumbnail?: string;
    image?: string;
    footer?: { text: string; icon_url?: string };
    timestamp?: boolean;
  }>;
  components?: Array<{
    type: number;
    components: Array<{
      type: number;
      style?: number;
      label?: string;
      custom_id?: string;
      url?: string;
      placeholder?: string;
      min_values?: number;
      max_values?: number;
      options?: Array<{ label: string; value: string; description?: string }>;
    }>;
  }>;
  channelId?: string;
  scheduledFor?: Date;
  guildId: string;
  createdBy: string;
}

export interface PremiumTier {
  type: 'monthly' | 'lifetime';
  guildId: string;
  stripeSubscriptionId?: string;
  stripeCustomerId: string;
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
  currentPeriodEnd: Date;
  purchasedAt: Date;
}

export interface RoleConfig {
  guildId: string;
  autoAssignRoles: string[];
  adminRoles: string[];
  moderatorRoles: string[];
  welcomeChannelId?: string;
  welcomeMessage?: string;
  auditChannelId?: string;
  updatedBy: string;
  updatedAt: Date;
}

export interface AuditLogEntry {
  guildId: string;
  userId: string;
  action: string;
  details: Record<string, any>;
  timestamp: Date;
  ipAddress?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
  permissions: string;
  features: string[];
}
