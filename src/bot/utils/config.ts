import dotenv from 'dotenv';

dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000'),
  
  discord: {
    token: process.env.DISCORD_BOT_TOKEN || '',
    clientId: process.env.DISCORD_CLIENT_ID || '',
    clientSecret: process.env.DISCORD_CLIENT_SECRET || ''
  },
  
  dashboard: {
    baseUrl: process.env.DASHBOARD_BASE_URL || 'https://go.digamber.in',
    jwtSecret: process.env.DASHBOARD_JWT_SECRET || ''
  },
  
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/discord-bot'
  },
  
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || ''
  },
  
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  }
};

// Validate required configuration
const requiredConfig = [
  'DISCORD_BOT_TOKEN',
  'MONGODB_URI',
  'DASHBOARD_JWT_SECRET'
];

for (const key of requiredConfig) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}
