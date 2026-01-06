import { RoleConfig } from '../models/RoleConfig';
import { AuditService } from './AuditService';
import { logger } from '../utils/logger';
import { GuildMember, Client } from 'discord.js';

export class RoleService {
  private auditService: AuditService;

  constructor() {
    this.auditService = new AuditService();
  }

  async getGuildConfig(guildId: string): Promise<any> {
    let config = await RoleConfig.findOne({ guildId }).lean();
    
    if (!config) {
      // Create default config
      config = await this.createDefaultConfig(guildId, 'system');
    }
    
    return config;
  }

  async updateGuildConfig(
    guildId: string,
    updates: Partial<any>,
    userId: string,
    ipAddress?: string
  ): Promise<any> {
    const config = await RoleConfig.findOneAndUpdate(
      { guildId },
      { ...updates, updatedBy: userId },
      { new: true, upsert: true }
    );

    await this.auditService.log({
      guildId,
      userId,
      action: 'CONFIG_UPDATED',
      details: { updates },
      ipAddress
    });

    logger.info(`Role config updated for guild ${guildId} by ${userId}`);
    return config.toObject();
  }

  async assignAutoRoles(member: GuildMember, client: Client): Promise<void> {
    const config = await this.getGuildConfig(member.guild.id);
    
    if (!config?.autoAssignRoles || config.autoAssignRoles.length === 0) {
      return;
    }

    const rolesToAdd = config.autoAssignRoles.filter(roleId => 
      member.guild.roles.cache.has(roleId) && 
      !member.roles.cache.has(roleId)
    );

    if (rolesToAdd.length === 0) {
      return;
    }

    try {
      await member.roles.add(rolesToAdd);
      
      await this.auditService.log({
        guildId: member.guild.id,
        userId: client.user!.id,
        action: 'ROLE_ADDED',
        details: { 
          memberId: member.id, 
          roles: rolesToAdd,
          reason: 'auto-assign'
        }
      });

      logger.info(`Auto roles assigned to ${member.id} in ${member.guild.id}`);
    } catch (error) {
      logger.error('Failed to assign auto roles:', error);
    }
  }

  async isUserAdmin(guildId: string, userId: string, client: Client): Promise<boolean> {
    const config = await this.getGuildConfig(guildId);
    const guild = client.guilds.cache.get(guildId);
    
    if (!guild) return false;

    const member = guild.members.cache.get(userId);
    if (!member) return false;

    // Check Discord permissions
    if (member.permissions.has('Administrator')) {
      return true;
    }

    // Check configured admin roles
    if (config?.adminRoles && config.adminRoles.length > 0) {
      const hasAdminRole = member.roles.cache.some(role => 
        config.adminRoles!.includes(role.id)
      );
      if (hasAdminRole) return true;
    }

    return false;
  }

  async isUserModerator(guildId: string, userId: string, client: Client): Promise<boolean> {
    const config = await this.getGuildConfig(guildId);
    const guild = client.guilds.cache.get(guildId);
    
    if (!guild) return false;

    const member = guild.members.cache.get(userId);
    if (!member) return false;

    // Check if admin first
    if (await this.isUserAdmin(guildId, userId, client)) {
      return true;
    }

    // Check Discord moderator permissions
    const moderatorPermissions = [
      'ManageMessages',
      'KickMembers',
      'BanMembers',
      'MuteMembers',
      'DeafenMembers',
      'MoveMembers'
    ];

    const hasModPermission = moderatorPermissions.some(permission => 
      member.permissions.has(permission)
    );

    if (hasModPermission) return true;

    // Check configured moderator roles
    if (config?.moderatorRoles && config.moderatorRoles.length > 0) {
      const hasModRole = member.roles.cache.some(role => 
        config.moderatorRoles!.includes(role.id)
      );
      if (hasModRole) return true;
    }

    return false;
  }

  private async createDefaultConfig(guildId: string, userId: string): Promise<any> {
    const config = new RoleConfig({
      guildId,
      autoAssignRoles: [],
      adminRoles: [],
      moderatorRoles: [],
      welcomeMessage: 'Welcome {user} to {server}!',
      updatedBy: userId
    });

    await config.save();
    return config.toObject();
  }
}
