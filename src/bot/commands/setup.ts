import { 
  SlashCommandBuilder, 
  PermissionFlagsBits,
  ChatInputCommandInteraction,
  DMChannel,
  TextChannel,
  EmbedBuilder
} from 'discord.js';
import { RoleService } from '../services/RoleService';
import { PremiumService } from '../services/PremiumService';
import { logger } from '../utils/logger';

const roleService = new RoleService();
const premiumService = new PremiumService();

export const data = new SlashCommandBuilder()
  .setName('setup')
  .setDescription('Setup the bot for your server')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand(subcommand =>
    subcommand
      .setName('wizard')
      .setDescription('Start interactive setup wizard')
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('config')
      .setDescription('View current configuration')
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('dashboard')
      .setDescription('Get dashboard link for your server')
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const subcommand = interaction.options.getSubcommand();
  const guild = interaction.guild!;
  const user = interaction.user;

  try {
    switch (subcommand) {
      case 'wizard':
        await runSetupWizard(interaction, guild, user);
        break;
      
      case 'config':
        await showConfig(interaction, guild);
        break;
      
      case 'dashboard':
        await sendDashboardLink(interaction, guild, user);
        break;
      
      default:
        await interaction.editReply('Unknown subcommand.');
    }
  } catch (error) {
    logger.error('Setup command failed:', error);
    await interaction.editReply('An error occurred during setup. Please try again.');
  }
}

async function runSetupWizard(
  interaction: ChatInputCommandInteraction,
  guild: any,
  user: any
): Promise<void> {
  try {
    // Send initial DM to owner
    let dmChannel: DMChannel;
    try {
      dmChannel = await user.createDM();
    } catch (error) {
      await interaction.editReply('Please enable DMs to continue with setup.');
      return;
    }

    const welcomeEmbed = new EmbedBuilder()
      .setTitle(`Setup Wizard: ${guild.name}`)
      .setDescription('I will guide you through setting up the bot for your server.')
      .addFields(
        { name: 'Step 1', value: 'Configure auto-assign roles', inline: true },
        { name: 'Step 2', value: 'Set welcome channel & message', inline: true },
        { name: 'Step 3', value: 'Configure audit logging', inline: true }
      )
      .setColor(0x5865F2)
      .setTimestamp();

    await dmChannel.send({ embeds: [welcomeEmbed] });
    
    // Send dashboard link
    const dashboardLink = `https://go.digamber.in/dashboard/${guild.id}`;
    await dmChannel.send(`Complete your setup on the dashboard: ${dashboardLink}`);

    await interaction.editReply('I\'ve sent you a DM with setup instructions!');
    
    logger.info(`Setup wizard started for guild ${guild.id} by ${user.id}`);
  } catch (error) {
    logger.error('Setup wizard failed:', error);
    throw error;
  }
}

async function showConfig(
  interaction: ChatInputCommandInteraction,
  guild: any
): Promise<void> {
  const config = await roleService.getGuildConfig(guild.id);
  const premium = await premiumService.getGuildPremium(guild.id);

  const embed = new EmbedBuilder()
    .setTitle(`Configuration: ${guild.name}`)
    .setColor(0x5865F2)
    .addFields(
      { 
        name: 'Auto-assign Roles', 
        value: config.autoAssignRoles.length > 0 
          ? config.autoAssignRoles.map(id => `<@&${id}>`).join('\n')
          : 'None configured',
        inline: true 
      },
      { 
        name: 'Welcome Channel', 
        value: config.welcomeChannelId ? `<#${config.welcomeChannelId}>` : 'Not set',
        inline: true 
      },
      { 
        name: 'Audit Channel', 
        value: config.auditChannelId ? `<#${config.auditChannelId}>` : 'Not set',
        inline: true 
      },
      { 
        name: 'Premium Status', 
        value: premium ? `Active (${premium.tier})` : 'Inactive',
        inline: true 
      }
    )
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

async function sendDashboardLink(
  interaction: ChatInputCommandInteraction,
  guild: any,
  user: any
): Promise<void> {
  const dashboardLink = `https://go.digamber.in/dashboard/${guild.id}`;
  const premium = await premiumService.getGuildPremium(guild.id);

  const embed = new EmbedBuilder()
    .setTitle('Dashboard Access')
    .setDescription(`Manage your server configuration on the dashboard:`)
    .addFields(
      { name: 'Dashboard URL', value: dashboardLink },
      { 
        name: 'Access Note', 
        value: 'You must be logged in with your Discord account to access the dashboard.' 
      }
    )
    .setColor(0x5865F2);

  if (premium) {
    embed.addFields({ 
      name: 'Premium Features', 
      value: 'Your premium subscription is active! Access premium features on the dashboard.' 
    });
  }

  // Also send via DM for convenience
  try {
    const dmChannel = await user.createDM();
    await dmChannel.send({ 
      content: `Dashboard link for ${guild.name}: ${dashboardLink}` 
    });
    embed.setFooter({ text: 'Also sent to your DMs for easy access.' });
  } catch (error) {
    logger.warn('Could not send DM for dashboard link:', error);
  }

  await interaction.editReply({ embeds: [embed], ephemeral: true });
}
