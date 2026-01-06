import { Events, Client, ActivityType } from 'discord.js';
import { logger } from '../utils/logger';
import { connectDatabase } from '../utils/database';
import { config } from '../utils/config';

export const name = Events.ClientReady;
export const once = true;

export async function execute(client: Client): Promise<void> {
  logger.info(`Logged in as ${client.user?.tag}!`);
  
  // Set bot status
  client.user?.setActivity({
    name: 'go.digamber.in',
    type: ActivityType.Watching
  });

  // Connect to database
  await connectDatabase(config.database.uri);

  // Log guild count
  const guildCount = client.guilds.cache.size;
  logger.info(`Bot is in ${guildCount} guilds`);

  // Schedule periodic tasks
  setInterval(() => {
    client.user?.setActivity({
      name: `${guildCount} servers | go.digamber.in`,
      type: ActivityType.Watching
    });
  }, 300000); // Update every 5 minutes
}
