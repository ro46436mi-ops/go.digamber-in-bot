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
  .setName('templates')
  .setDescription('Manage message templates')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand(subcommand =>
    subcommand
      .setName('list')
      .setDescription('List all templates')
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('view')
      .setDescription('View a specific template')
      .addStringOption(option =>
        option
          .setName('name')
          .setDescription('Template name')
          .setRequired(true)
          .setAutocomplete(true)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('send')
      .setDescription('Send a template to a channel')
      .addStringOption(option =>
        option
          .setName('name')
          .setDescription('Template name')
          .setRequired(true)
          .setAutocomplete(true)
      )
      .addChannelOption(option =>
        option
          .setName('channel')
          .setDescription('Channel to send to')
          .setRequired(true)
      )
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const subcommand = interaction.options.getSubcommand();
  const guild = interaction.guild!;
  const user = interaction.user;

  try {
    switch (subcommand) {
      case 'list':
        await listTemplates(interaction, guild);
        break;
      
      case 'view':
        await viewTemplate(interaction, guild);
        break;
      
      case 'send':
        await sendTemplate(interaction, guild, user);
        break;
      
      default:
        await interaction.editReply('Unknown subcommand.');
    }
  } catch (error) {
    logger.error('Message templates command failed:', error);
    await interaction.editReply('An error occurred. Please try again.');
  }
}

async function listTemplates(
  interaction: ChatInputCommandInteraction,
  guild: any
): Promise<void> {
  const templates = await templateService.getTemplates(guild.id);

  const embed = new EmbedBuilder()
    .setTitle(`Message Templates: ${guild.name}`)
    .setColor(0x5865F2)
    .setTimestamp();

  if (templates.length === 0) {
    embed.setDescription('No templates found. Create templates on the dashboard.');
  } else {
    const templateList = templates
      .slice(0, 10)
      .map((template: any) => `**${template.name}** - Created <t:${Math.floor(template.createdAt.getTime() / 1000)}:R>`)
      .join('\n');

    embed.setDescription(templateList)
      .setFooter({ text: `${templates.length} templates total` });

    if (templates.length > 10) {
      embed.addFields({
        name: 'Note',
        value: `Showing 10 of ${templates.length} templates. View all on the dashboard.`
      });
    }
  }

  await interaction.editReply({ embeds: [embed] });
}

async function viewTemplate(
  interaction: ChatInputCommandInteraction,
  guild: any
): Promise<void> {
  const templateName = interaction.options.getString('name', true);
  const templates = await templateService.getTemplates(guild.id);
  
  const template = templates.find((t: any) => t.name === templateName);
  
  if (!template) {
    await interaction.editReply(`Template "${templateName}" not found.`);
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle(`Template: ${template.name}`)
    .setColor(0x5865F2)
    .addFields(
      { name: 'Content', value: template.content || '*No content*' },
      { name: 'Embeds', value: template.embeds?.length ? `${template.embeds.length} embed(s)` : 'None' },
      { name: 'Components', value: template.components?.length ? `${template.components.length} component(s)` : 'None' },
      { name: 'Created', value: `<t:${Math.floor(template.createdAt.getTime() / 1000)}:R>` },
      { name: 'Created By', value: `<@${template.createdBy}>` }
    )
    .setTimestamp();

  if (template.scheduledFor) {
    embed.addFields({
      name: 'Scheduled For',
      value: `<t:${Math.floor(template.scheduledFor.getTime() / 1000)}:F>`
    });
  }

  await interaction.editReply({ embeds: [embed] });
}

async function sendTemplate(
  interaction: ChatInputCommandInteraction,
  guild: any,
  user: any
): Promise<void> {
  const templateName = interaction.options.getString('name', true);
  const channel = interaction.options.getChannel('channel', true) as TextChannel;

  if (!channel.isTextBased()) {
    await interaction.editReply('Please select a text channel.');
    return;
  }

  const templates = await templateService.getTemplates(guild.id);
  const template = templates.find((t: any) => t.name === templateName);

  if (!template) {
    await interaction.editReply(`Template "${templateName}" not found.`);
    return;
  }

  try {
    await templateService.sendTemplate(
      template._id,
      guild.id,
      channel.id,
      interaction.client,
      user.id
    );

    const embed = new EmbedBuilder()
      .setTitle('Template Sent')
      .setDescription(`✅ Template "${templateName}" sent to ${channel}.`)
      .setColor(0x00FF00)
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    logger.error('Failed to send template:', error);
    await interaction.editReply('Failed to send template. Make sure I have permission to send messages in that channel.');
  }
}

export async function autocomplete(interaction: any): Promise<void> {
  const focusedValue = interaction.options.getFocused();
  const guild = interaction.guild;

  if (!guild) {
    await interaction.respond([]);
    return;
  }

  const templates = await templateService.getTemplates(guild.id);
  const filtered = templates
    .filter((template: any) => 
      template.name.toLowerCase().includes(focusedValue.toLowerCase())
    )
    .slice(0, 25);

  await interaction.respond(
    filtered.map((template: any) => ({
      name: template.name,
      value: template.name
    }))
  );
}
