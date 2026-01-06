import { Types } from 'mongoose';
import { validateDiscordSnowflake } from '../../shared/helpers';

export const isValidObjectId = (id: string): boolean => {
  return Types.ObjectId.isValid(id);
};

export const validateTemplateData = (data: any): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    errors.push('Template name is required');
  }

  if (!data.content || typeof data.content !== 'string') {
    errors.push('Template content is required');
  }

  if (!data.guildId || !validateDiscordSnowflake(data.guildId)) {
    errors.push('Valid guild ID is required');
  }

  if (!data.createdBy || !validateDiscordSnowflake(data.createdBy)) {
    errors.push('Valid creator ID is required');
  }

  if (data.scheduledFor && isNaN(new Date(data.scheduledFor).getTime())) {
    errors.push('Invalid scheduled date');
  }

  if (data.embeds && !Array.isArray(data.embeds)) {
    errors.push('Embeds must be an array');
  }

  if (data.components && !Array.isArray(data.components)) {
    errors.push('Components must be an array');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateGuildId = (guildId: string): boolean => {
  return validateDiscordSnowflake(guildId);
};

export const validateUserId = (userId: string): boolean => {
  return validateDiscordSnowflake(userId);
};

export const sanitizeInput = (input: string): string => {
  return input.trim().replace(/[<>]/g, '');
};
