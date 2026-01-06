import { Events, GuildMember, PartialGuildMember } from 'discord.js';
import { AuditService } from '../services/AuditService';
import { logger } from '../utils/logger';

const auditService = new AuditService();

export const name = Events.GuildMemberUpdate;

export async function execute(oldMember: GuildMember | PartialGuildMember, newMember: GuildMember): Promise<void> {
  try {
    // Check for role changes
    const oldRoles = oldMember.roles.cache;
    const newRoles = newMember.roles.cache;

    const addedRoles = newRoles.filter(role => !oldRoles.has(role.id));
    const removedRoles = oldRoles.filter(role => !newRoles.has(role.id));

    // Log role additions
    if (addedRoles.size > 0) {
      await auditService.log({
        guildId: newMember.guild.id,
        userId: newMember.client.user!.id,
        action: 'ROLE_ADDED',
        details: {
          memberId: newMember.id,
          memberTag: newMember.user.tag,
          roles: addedRoles.map(role => role.id),
          roleNames: addedRoles.map(role => role.name)
        }
      });
    }

    // Log role removals
    if (removedRoles.size > 0) {
      await auditService.log({
        guildId: newMember.guild.id,
        userId: newMember.client.user!.id,
        action: 'ROLE_REMOVED',
        details: {
          memberId: newMember.id,
          memberTag: newMember.user.tag,
          roles: removedRoles.map(role => role.id),
          roleNames: removedRoles.map(role => role.name)
        }
      });
    }

    // Check for nickname changes
    if (oldMember.nickname !== newMember.nickname) {
      await auditService.log({
        guildId: newMember.guild.id,
        userId: newMember.client.user!.id,
        action: 'NICKNAME_CHANGED',
        details: {
          memberId: newMember.id,
          memberTag: newMember.user.tag,
          oldNickname: oldMember.nickname,
          newNickname: newMember.nickname
        }
      });
    }

  } catch (error) {
    logger.error('Error handling guild member update:', error);
  }
}
