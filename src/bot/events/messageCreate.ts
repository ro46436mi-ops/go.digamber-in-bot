import { Events, Message } from 'discord.js';
import { logger } from '../utils/logger';

export const name = Events.MessageCreate;

export async function execute(message: Message): Promise<void> {
  // Ignore bot messages
  if (message.author.bot) return;

  // Handle DM setup messages
  if (message.channel.isDMBased()) {
    await handleDMMessage(message);
    return;
  }

  // Handle guild messages if needed
  // (Add any guild message handlers here)
}

async function handleDMMessage(message: Message): Promise<void> {
  const content = message.content.toLowerCase();
  const user = message.author;

  logger.info(`DM from ${user.tag}: ${message.content}`);

  // Simple DM response for setup
  if (content.includes('setup') || content.includes('help')) {
    await message.reply({
      content: `Hello! To set up the bot for your server:\n\n` +
        `1. Use \`/setup wizard\` in your server to start the setup process\n` +
        `2. Visit the dashboard: https://go.digamber.in/dashboard\n` +
        `3. Select your server and configure settings\n\n` +
        `Need help? Join our support server or contact support through the dashboard.`
    });
  }
}
