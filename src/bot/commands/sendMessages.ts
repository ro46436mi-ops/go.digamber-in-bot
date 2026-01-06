import { 
  SlashCommandBuilder, 
  PermissionFlagsBits,
  ChatInputCommandInteraction,
  EmbedBuilder,
  TextChannel
} from 'discord.js';
import { TemplateService } from '../services/TemplateService';
import { PremiumService } from '../services/PremiumService';
import { logger } from '../utils/logger';

const templateService = new TemplateService();
const premiumService = new PremiumService();

export const data = new SlashCommandBuilder()
  .setName('send')
  .setDescription('Send messages and templates')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand(subcommand =>
    subcommand
      .setName('message')
      .setDescription('Send a custom message')
      .addChannelOption(option =>
        option
          .setName('channel')
          .setDescription('Channel to send to')
          .setRequired(true)
      )
      .addStringOption(option =>
        option
          .setName('content')
          .setDescription('Message content')
          .setRequired(true)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('embed')
      .setDescription('Send an embed message')
      .addChannelOption(option =>
        option
          .setName('channel')
          .setDescription('Channel to send to')
          .setRequired(true)
      )
      .addStringOption(option =>
        option
          .setName('title')
          .setDescription('Embed title')
          .setRequired(true)
      )
      .addStringOption(option =>
        option
          .setName('description')
          .setDescription('Embed description')
          .setRequired(true)
      )
      .addStringOption(option =>
        option
          .setName('color')
          .setDescription('Embed color (hex code)')
          .setRequired(false)
      )
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const subcommand = interaction.options.getSubcommand();
  const guild = interaction.guild!;
  const user = interaction.user;

  try {
    switch (subcommand) {
      case 'message':
        await sendCustomMessage(interaction, guild, user);
        break;
      
      case 'embed':
        await sendEmbedMessage(interaction, guild, user);
        break;
      
      default:
        await interaction.editReply('Unknown subcommand.');
    }
  } catch (error) {
    logger.error('Send messages command failed:', error);
    await interaction.editReply('An error occurred. Please try again.');
  }
}

async function sendCustomMessage(
  interaction: ChatInputCommandInteraction,
  guild: any,
  user: any
): Promise<void> {
  const channel = interaction.options.getChannel('channel', true) as TextChannel;
  const content = interaction.options.getString('content', true);

  if (!channel.isTextBased()) {
    await interaction.editReply('Please select a text channel.');
    return;
  }

  try {
    await channel.send(content);

    const embed = new EmbedBuilder()
      .setTitle('Message Sent')
      .setDescription(`✅ Message sent to ${channel}.`)
      .addFields(
        { name: 'Content', value: content.length > 1024 ? content.substring(0, 1021) + '...' : content }
      )
      .setColor(0x00FF00)
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    logger.error('Failed to send message:', error);
    await interaction.editReply('Failed to send message. Make sure I have permission to send messages in that channel.');
  }
}

async function sendEmbedMessage(
  interaction: ChatInputCommandInteraction,
  guild: any,
  user: any
): Promise<void> {
  const channel = interaction.options.getChannel('channel', true) as TextChannel;
  const title = interaction.options.getString('title', true);
  const description = interaction.options.getString('description', true);
  const colorHex = interaction.options.getString('color') || '5865F2';

  if (!channel.isTextBased()) {
    await interaction.editReply('Please select a text channel.');
    return;
  }

  // Convert hex color to number
  let color = parseInt(colorHex.replace('#', ''), 16);
  if (isNaN(color)) {
    color = 0x5865F2; // Default Discord blue
  }

  try {
    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(color)
      .setTimestamp();

    await channel.send({ embeds: [embed] });

    const responseEmbed = new EmbedBuilder()
      .setTitle('Embed Sent')
      .setDescription(`✅ Embed sent to ${channel}.`)
      .setColor(0x00FF00)
      .addFields(
        { name: 'Title', value: title, inline: true },
        { name: 'Color', value: `#${color.toString(16).toUpperCase()}`, inline: true }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [responseEmbed] });
  } catch (error) {
    logger.error('Failed to send embed:', error);
    await interaction.editReply('Failed to send embed. Make sure I have permission to send messages in that channel.');
  }
}
