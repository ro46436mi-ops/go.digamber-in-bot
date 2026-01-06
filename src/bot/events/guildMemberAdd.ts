import { Events, GuildMember, TextChannel } from 'discord.js';
import { RoleService } from '../services/RoleService';
import { logger } from '../utils/logger';
import { formatWelcomeMessage } from '../../shared/helpers';

const roleService = new RoleService();

export const name = Events.GuildMemberAdd;

export async function execute(member: GuildMember): Promise<void> {
  try {
    // Assign auto roles
    await roleService.assignAutoRoles(member, member.client);

    // Send welcome message
    await sendWelcomeMessage(member);

    logger.info(`Member joined: ${member.user.tag} in ${member.guild.name}`);
  } catch (error) {
    logger.error('Error handling guild member add:', error);
  }
}

async function sendWelcomeMessage(member: GuildMember): Promise<void> {
  const config = await roleService.getGuildConfig(member.guild.id);
  
  if (!config?.welcomeChannelId || !config.welcomeMessage) {
    return;
  }

  const channel = member.guild.channels.cache.get(config.welcomeChannelId) as TextChannel;
  if (!channel) {
    logger.warn(`Welcome channel not found: ${config.welcomeChannelId} in ${member.guild.id}`);
    return;
  }

  try {
    const formattedMessage = formatWelcomeMessage(
      config.welcomeMessage,
      member.id,
      member.guild.name
    );

    await channel.send(formattedMessage);
  } catch (error) {
    logger.error('Failed to send welcome message:', error);
  }
}
