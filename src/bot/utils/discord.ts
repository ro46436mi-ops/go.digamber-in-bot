import { 
  Client, 
  GatewayIntentBits, 
  Partials,
  TextChannel,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  GuildMember,
  PermissionFlagsBits
} from 'discord.js';
import { logger } from './logger';

export const createDiscordClient = (): Client => {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.DirectMessages
    ],
    partials: [Partials.Channel, Partials.Message, Partials.User]
  });

  return client;
};

export const hasPermission = (member: GuildMember, permission: bigint): boolean => {
  try {
    return member.permissions.has(permission);
  } catch (error) {
    logger.error('Permission check failed:', error);
    return false;
  }
};

export const sendWelcomeMessage = async (
  channel: TextChannel,
  member: GuildMember,
  message: string
): Promise<void> => {
  try {
    const formattedMessage = message
      .replace(/{user}/g, `<@${member.id}>`)
      .replace(/{server}/g, channel.guild.name);

    await channel.send(formattedMessage);
    logger.info(`Welcome message sent for ${member.id} in ${channel.guild.id}`);
  } catch (error) {
    logger.error('Failed to send welcome message:', error);
  }
};

export const createEmbedFromData = (data: any): EmbedBuilder[] => {
  if (!data?.embeds || !Array.isArray(data.embeds)) {
    return [];
  }

  return data.embeds.map(embedData => {
    const embed = new EmbedBuilder();
    
    if (embedData.title) embed.setTitle(embedData.title);
    if (embedData.description) embed.setDescription(embedData.description);
    if (embedData.color) embed.setColor(embedData.color);
    if (embedData.fields && Array.isArray(embedData.fields)) {
      embed.addFields(embedData.fields);
    }
    if (embedData.thumbnail) embed.setThumbnail(embedData.thumbnail);
    if (embedData.image) embed.setImage(embedData.image);
    if (embedData.footer) embed.setFooter(embedData.footer);
    if (embedData.timestamp) embed.setTimestamp();
    
    return embed;
  });
};

export const createComponentsFromData = (data: any): ActionRowBuilder<any>[] => {
  if (!data?.components || !Array.isArray(data.components)) {
    return [];
  }

  return data.components.map(rowData => {
    const row = new ActionRowBuilder();
    
    rowData.components.forEach((componentData: any) => {
      if (componentData.type === 2) { // Button
        const button = new ButtonBuilder()
          .setCustomId(componentData.custom_id || `btn_${Date.now()}`)
          .setLabel(componentData.label || 'Button')
          .setStyle(componentData.style || ButtonStyle.Primary);
        
        if (componentData.url) button.setURL(componentData.url);
        row.addComponents(button);
      } else if (componentData.type === 3) { // Select menu
        const select = new StringSelectMenuBuilder()
          .setCustomId(componentData.custom_id || `select_${Date.now()}`)
          .setPlaceholder(componentData.placeholder || 'Select an option')
          .setMinValues(componentData.min_values || 1)
          .setMaxValues(componentData.max_values || 1);
        
        if (componentData.options && Array.isArray(componentData.options)) {
          select.addOptions(componentData.options.map((opt: any) => ({
            label: opt.label,
            value: opt.value,
            description: opt.description
          })));
        }
        row.addComponents(select);
      }
    });
    
    return row;
  });
};
