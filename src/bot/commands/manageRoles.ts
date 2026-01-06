import { 
  SlashCommandBuilder, 
  PermissionFlagsBits,
  ChatInputCommandInteraction,
  EmbedBuilder,
  Role
} from 'discord.js';
import { RoleService } from '../services/RoleService';
import { logger } from '../utils/logger';

const roleService = new RoleService();

export const data = new SlashCommandBuilder()
  .setName('roles')
  .setDescription('Manage auto-assign roles')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand(subcommand =>
    subcommand
      .setName('add')
      .setDescription('Add a role to auto-assign list')
      .addRoleOption(option =>
        option
          .setName('role')
          .setDescription('The role to auto-assign')
          .setRequired(true)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('remove')
      .setDescription('Remove a role from auto-assign list')
      .addRoleOption(option =>
        option
          .setName('role')
          .setDescription('The role to remove')
          .setRequired(true)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('list')
      .setDescription('List all auto-assign roles')
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const subcommand = interaction.options.getSubcommand();
  const guild = interaction.guild!;
  const user = interaction.user;

  try {
    const config = await roleService.getGuildConfig(guild.id);

    switch (subcommand) {
      case 'add':
        await addAutoRole(interaction, guild, user, config);
        break;
      
      case 'remove':
        await removeAutoRole(interaction, guild, user, config);
        break;
      
      case 'list':
        await listAutoRoles(interaction, guild, config);
        break;
      
      default:
        await interaction.editReply('Unknown subcommand.');
    }
  } catch (error) {
    logger.error('Manage roles command failed:', error);
    await interaction.editReply('An error occurred. Please try again.');
  }
}

async function addAutoRole(
  interaction: ChatInputCommandInteraction,
  guild: any,
  user: any,
  config: any
): Promise<void> {
  const role = interaction.options.getRole('role', true) as Role;

  if (role.position >= guild.members.me!.roles.highest.position) {
    await interaction.editReply(`I cannot assign the ${role.name} role because it is higher than my highest role.`);
    return;
  }

  if (config.autoAssignRoles.includes(role.id)) {
    await interaction.editReply(`${role.name} is already in the auto-assign list.`);
    return;
  }

  const updatedRoles = [...config.autoAssignRoles, role.id];
  await roleService.updateGuildConfig(guild.id, { autoAssignRoles: updatedRoles }, user.id);

  const embed = new EmbedBuilder()
    .setTitle('Auto-assign Role Added')
    .setDescription(`✅ ${role.name} will now be auto-assigned to new members.`)
    .setColor(0x00FF00)
    .addFields(
      { name: 'Role', value: `<@&${role.id}>`, inline: true },
      { name: 'Total Auto Roles', value: updatedRoles.length.toString(), inline: true }
    )
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

async function removeAutoRole(
  interaction: ChatInputCommandInteraction,
  guild: any,
  user: any,
  config: any
): Promise<void> {
  const role = interaction.options.getRole('role', true) as Role;

  if (!config.autoAssignRoles.includes(role.id)) {
    await interaction.editReply(`${role.name} is not in the auto-assign list.`);
    return;
  }

  const updatedRoles = config.autoAssignRoles.filter((id: string) => id !== role.id);
  await roleService.updateGuildConfig(guild.id, { autoAssignRoles: updatedRoles }, user.id);

  const embed = new EmbedBuilder()
    .setTitle('Auto-assign Role Removed')
    .setDescription(`❌ ${role.name} will no longer be auto-assigned to new members.`)
    .setColor(0xFF0000)
    .addFields(
      { name: 'Role', value: `<@&${role.id}>`, inline: true },
      { name: 'Total Auto Roles', value: updatedRoles.length.toString(), inline: true }
    )
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

async function listAutoRoles(
  interaction: ChatInputCommandInteraction,
  guild: any,
  config: any
): Promise<void> {
  const embed = new EmbedBuilder()
    .setTitle('Auto-assign Roles')
    .setColor(0x5865F2)
    .setTimestamp();

  if (config.autoAssignRoles.length === 0) {
    embed.setDescription('No auto-assign roles configured.');
  } else {
    const roleList = config.autoAssignRoles
      .map((roleId: string) => {
        const role = guild.roles.cache.get(roleId);
        return role ? `<@&${roleId}>` : `Unknown Role (${roleId})`;
      })
      .join('\n');

    embed.setDescription(roleList)
      .setFooter({ text: `Total: ${config.autoAssignRoles.length} roles` });
  }

  await interaction.editReply({ embeds: [embed] });
}
