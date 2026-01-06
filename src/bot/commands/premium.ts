import { 
  SlashCommandBuilder, 
  PermissionFlagsBits,
  ChatInputCommandInteraction,
  EmbedBuilder
} from 'discord.js';
import { PremiumService } from '../services/PremiumService';
import { logger } from '../utils/logger';

const premiumService = new PremiumService();

export const data = new SlashCommandBuilder()
  .setName('premium')
  .setDescription('Manage premium features')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand(subcommand =>
    subcommand
      .setName('status')
      .setDescription('Check premium status for this server')
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('features')
      .setDescription('View premium features')
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const subcommand = interaction.options.getSubcommand();
  const guild = interaction.guild!;

  try {
    switch (subcommand) {
      case 'status':
        await showPremiumStatus(interaction, guild);
        break;
      
      case 'features':
        await showPremiumFeatures(interaction, guild);
        break;
      
      default:
        await interaction.editReply('Unknown subcommand.');
    }
  } catch (error) {
    logger.error('Premium command failed:', error);
    await interaction.editReply('An error occurred. Please try again.');
  }
}

async function showPremiumStatus(
  interaction: ChatInputCommandInteraction,
  guild: any
): Promise<void> {
  const premium = await premiumService.getGuildPremium(guild.id);

  const embed = new EmbedBuilder()
    .setTitle(`Premium Status: ${guild.name}`)
    .setColor(premium ? 0x00FF00 : 0xFF0000);

  if (premium) {
    const endDate = premium.currentPeriodEnd.toLocaleDateString();
    embed.setDescription(`✅ Premium is **active** for this server!`)
      .addFields(
        { name: 'Tier', value: premium.tier.toUpperCase(), inline: true },
        { name: 'Renews/Expires', value: endDate, inline: true },
        { name: 'Status', value: premium.status.toUpperCase(), inline: true }
      );
    
    if (premium.tier === 'lifetime') {
      embed.addFields({ 
        name: 'Note', 
        value: 'Lifetime premium never expires!' 
      });
    }
  } else {
    embed.setDescription('❌ Premium is **not active** for this server.')
      .addFields(
        { 
          name: 'Get Premium', 
          value: 'Visit the dashboard to upgrade: https://go.digamber.in/dashboard/' + guild.id 
        }
      );
  }

  await interaction.editReply({ embeds: [embed] });
}

async function showPremiumFeatures(
  interaction: ChatInputCommandInteraction,
  guild: any
): Promise<void> {
  const isPremium = await premiumService.isGuildPremium(guild.id);

  const embed = new EmbedBuilder()
    .setTitle('Premium Features')
    .setColor(0x5865F2)
    .setDescription('Upgrade to unlock these features:')
    .addFields(
      { 
        name: '🎨 Advanced Templates', 
        value: 'Create templates with multiple embeds, buttons, and select menus', 
        inline: true 
      },
      { 
        name: '⏰ Scheduled Messages', 
        value: 'Schedule messages to be sent at specific times', 
        inline: true 
      },
      { 
        name: '🤖 Advanced Automation', 
        value: 'Set up complex role and message automation', 
        inline: true 
      },
      { 
        name: '📊 Advanced Analytics', 
        value: 'Detailed message and member analytics', 
        inline: true 
      },
      { 
        name: '🔐 Priority Support', 
        value: 'Get help faster with priority support', 
        inline: true 
      },
      { 
        name: '⚡ Unlimited Templates', 
        value: 'No limits on number of templates', 
        inline: true 
      }
    )
    .setFooter({ 
      text: isPremium ? '✅ All features are unlocked!' : '🔒 Upgrade to unlock all features' 
    });

  if (!isPremium) {
    embed.addFields({
      name: 'Get Premium',
      value: `Visit the dashboard to upgrade:\nhttps://go.digamber.in/dashboard/${guild.id}`
    });
  }

  await interaction.editReply({ embeds: [embed] });
}
