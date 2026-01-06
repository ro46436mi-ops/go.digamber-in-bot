import { Template } from '../models/Template';
import { AuditService } from './AuditService';
import { validateTemplateData } from '../utils/validate';
import { createEmbedFromData, createComponentsFromData } from '../utils/discord';
import { logger } from '../utils/logger';
import { TemplateData } from '../../shared/types';
import { TextChannel, Client } from 'discord.js';

export class TemplateService {
  private auditService: AuditService;

  constructor() {
    this.auditService = new AuditService();
  }

  async createTemplate(data: TemplateData, userId: string, ipAddress?: string): Promise<any> {
    const validation = validateTemplateData(data);
    if (!validation.isValid) {
      throw new Error(`Invalid template data: ${validation.errors.join(', ')}`);
    }

    const template = new Template({
      ...data,
      createdBy: userId
    });

    await template.save();

    await this.auditService.log({
      guildId: data.guildId,
      userId,
      action: 'TEMPLATE_CREATED',
      details: { templateId: template._id, name: data.name },
      ipAddress
    });

    logger.info(`Template created: ${template._id} by ${userId}`);
    return template.toObject();
  }

  async getTemplates(guildId: string, userId?: string): Promise<any[]> {
    const query: any = { guildId, isActive: true };
    if (userId) {
      query.createdBy = userId;
    }

    const templates = await Template.find(query)
      .sort({ createdAt: -1 })
      .lean();

    return templates;
  }

  async getTemplate(templateId: string, guildId: string): Promise<any> {
    const template = await Template.findOne({
      _id: templateId,
      guildId,
      isActive: true
    }).lean();

    if (!template) {
      throw new Error('Template not found or inaccessible');
    }

    return template;
  }

  async updateTemplate(
    templateId: string,
    updates: Partial<TemplateData>,
    userId: string,
    ipAddress?: string
  ): Promise<any> {
    const template = await Template.findOne({
      _id: templateId,
      guildId: updates.guildId,
      isActive: true
    });

    if (!template) {
      throw new Error('Template not found or inaccessible');
    }

    Object.assign(template, updates);
    await template.save();

    await this.auditService.log({
      guildId: updates.guildId!,
      userId,
      action: 'TEMPLATE_UPDATED',
      details: { templateId, updates },
      ipAddress
    });

    logger.info(`Template updated: ${templateId} by ${userId}`);
    return template.toObject();
  }

  async deleteTemplate(templateId: string, guildId: string, userId: string, ipAddress?: string): Promise<void> {
    const template = await Template.findOneAndUpdate(
      { _id: templateId, guildId, isActive: true },
      { isActive: false },
      { new: true }
    );

    if (!template) {
      throw new Error('Template not found or inaccessible');
    }

    await this.auditService.log({
      guildId,
      userId,
      action: 'TEMPLATE_DELETED',
      details: { templateId, name: template.name },
      ipAddress
    });

    logger.info(`Template deleted: ${templateId} by ${userId}`);
  }

  async sendTemplate(
    templateId: string,
    guildId: string,
    channelId: string,
    client: Client,
    userId: string,
    ipAddress?: string
  ): Promise<any> {
    const template = await this.getTemplate(templateId, guildId);
    
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      throw new Error('Guild not found');
    }

    const channel = guild.channels.cache.get(channelId) as TextChannel;
    if (!channel) {
      throw new Error('Channel not found');
    }

    const embeds = createEmbedFromData(template);
    const components = createComponentsFromData(template);

    const messageData: any = { content: template.content };
    if (embeds.length > 0) messageData.embeds = embeds;
    if (components.length > 0) messageData.components = components;

    const message = await channel.send(messageData);

    await this.auditService.log({
      guildId,
      userId,
      action: 'MESSAGE_SENT',
      details: { 
        templateId, 
        channelId, 
        messageId: message.id 
      },
      ipAddress
    });

    logger.info(`Template sent: ${templateId} to ${channelId} by ${userId}`);
    return { messageId: message.id, channelId };
  }

  async scheduleTemplate(
    templateId: string,
    scheduledFor: Date,
    guildId: string,
    userId: string,
    ipAddress?: string
  ): Promise<any> {
    const template = await Template.findOneAndUpdate(
      { _id: templateId, guildId, isActive: true },
      { scheduledFor },
      { new: true }
    );

    if (!template) {
      throw new Error('Template not found or inaccessible');
    }

    await this.auditService.log({
      guildId,
      userId,
      action: 'TEMPLATE_SCHEDULED',
      details: { templateId, scheduledFor },
      ipAddress
    });

    logger.info(`Template scheduled: ${templateId} for ${scheduledFor} by ${userId}`);
    return template.toObject();
  }
}
