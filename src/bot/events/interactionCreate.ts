import { Events, Interaction } from 'discord.js';
import { logger } from '../utils/logger';
import * as commands from '../commands/index';

export const name = Events.InteractionCreate;

export async function execute(interaction: Interaction): Promise<void> {
  if (interaction.isChatInputCommand()) {
    await handleSlashCommand(interaction);
  } else if (interaction.isAutocomplete()) {
    await handleAutocomplete(interaction);
  } else if (interaction.isButton() || interaction.isStringSelectMenu()) {
    await handleComponent(interaction);
  }
}

async function handleSlashCommand(interaction: any): Promise<void> {
  const command = (commands as any)[interaction.commandName];

  if (!command) {
    logger.error(`No command matching ${interaction.commandName} was found.`);
    await interaction.reply({ 
      content: 'Command not found.', 
      ephemeral: true 
    });
    return;
  }

  try {
    await command.execute(interaction);
    logger.info(`Command executed: ${interaction.commandName} by ${interaction.user.tag} in ${interaction.guild?.name || 'DM'}`);
  } catch (error) {
    logger.error(`Error executing ${interaction.commandName}:`, error);
    
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ 
        content: 'There was an error executing this command.' 
      });
    } else {
      await interaction.reply({ 
        content: 'There was an error executing this command.', 
        ephemeral: true 
      });
    }
  }
}

async function handleAutocomplete(interaction: any): Promise<void> {
  const command = (commands as any)[interaction.commandName];

  if (!command?.autocomplete) {
    logger.error(`No autocomplete handler for ${interaction.commandName}`);
    return;
  }

  try {
    await command.autocomplete(interaction);
  } catch (error) {
    logger.error(`Error in autocomplete for ${interaction.commandName}:`, error);
  }
}

async function handleComponent(interaction: any): Promise<void> {
  // Handle button clicks and select menu interactions
  // This will be expanded based on specific component needs
  
  logger.info(`Component interaction: ${interaction.customId} by ${interaction.user.tag}`);
  
  // Default response for unknown components
  await interaction.reply({ 
    content: 'This component is not yet implemented.', 
    ephemeral: true 
  });
}
