import { Client, Collection, GatewayIntentBits, REST, Routes } from 'discord.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createDiscordClient } from './utils/discord';
import { config } from './utils/config';
import { logger, stream } from './utils/logger';
import apiRoutes from './api';
import { commandData } from './commands';
import * as events from './events/index';

class DiscordBot {
  private client: Client;
  private app: express.Application;
  private commands: Collection<string, any>;

  constructor() {
    this.client = createDiscordClient();
    this.app = express();
    this.commands = new Collection();
    
    this.setupExpress();
    this.setupDiscord();
    this.loadCommands();
    this.registerEvents();
  }

  private setupExpress(): void {
    // Security middleware
    this.app.use(helmet());
    this.app.use(cors({
      origin: config.dashboard.baseUrl,
      credentials: true
    }));
    
    // Logging middleware
    this.app.use(morgan('combined', { stream }));
    
    // Body parsing middleware
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Inject client into request for API routes
    this.app.use((req, res, next) => {
      req.client = this.client;
      next();
    });

    // API routes
    this.app.use(apiRoutes);

    // Error handling middleware
    this.app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      logger.error('Unhandled error:', err);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    });
  }

  private setupDiscord(): void {
    // Register slash commands
    this.client.once('ready', async () => {
      await this.registerSlashCommands();
    });

    // Store commands in collection
    for (const command of commandData) {
      this.commands.set(command.name, command);
    }

    // Add commands collection to client
    this.client.commands = this.commands;
  }

  private loadCommands(): void {
    // Commands are loaded via imports in commands/index.ts
    logger.info('Commands loaded');
  }

  private registerEvents(): void {
    for (const [eventName, event] of Object.entries(events)) {
      if (event.once) {
        this.client.once(event.name, (...args) => event.execute(...args));
      } else {
        this.client.on(event.name, (...args) => event.execute(...args));
      }
    }
    logger.info('Events registered');
  }

  private async registerSlashCommands(): Promise<void> {
    try {
      const rest = new REST({ version: '10' }).setToken(config.discord.token);
      
      logger.info('Started refreshing application (/) commands.');

      await rest.put(
        Routes.applicationCommands(config.discord.clientId),
        { body: commandData.map(cmd => cmd.toJSON()) }
      );

      logger.info('Successfully reloaded application (/) commands.');
    } catch (error) {
      logger.error('Error registering slash commands:', error);
    }
  }

  public async start(): Promise<void> {
    try {
      // Start Express server
      this.app.listen(config.port, () => {
        logger.info(`API server listening on port ${config.port}`);
      });

      // Start Discord bot
      await this.client.login(config.discord.token);
      
      // Handle graceful shutdown
      this.setupGracefulShutdown();
      
    } catch (error) {
      logger.error('Failed to start bot:', error);
      process.exit(1);
    }
  }

  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);
      
      // Disconnect from Discord
      if (this.client.isReady()) {
        this.client.destroy();
        logger.info('Discord client disconnected.');
      }
      
      // Close Express server
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception:', error);
      shutdown('uncaughtException');
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection at:', promise, 'reason:', reason);
    });
  }
}

// Start the bot
const bot = new DiscordBot();
bot.start().catch(error => {
  logger.error('Fatal error during startup:', error);
  process.exit(1);
});

export default bot;
