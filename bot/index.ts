require('dotenv').config();

const { Client, Collection, GatewayIntentBits, REST, Routes } = require('discord.js');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;

// Discord client setup
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ]
});

client.commands = new Collection();

// Middleware
app.use(cors({
  origin: process.env.DASHBOARD_BASE_URL || 'https://go.digamber.in',
  credentials: true
}));
app.use(helmet());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Inject client into request
app.use((req, res, next) => {
  req.client = client;
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    discord: client.isReady() ? 'connected' : 'disconnected',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// API routes placeholder
app.use('/api', (req, res) => {
  res.json({
    success: true,
    message: 'Bot API is running',
    endpoints: ['/auth', '/templates', '/roles', '/premium', '/webhooks']
  });
});

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Discord bot events
client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  console.log(`🌐 Serving ${client.guilds.cache.size} guilds`);
  
  // Set bot status
  client.user.setActivity({
    name: 'go.digamber.in',
    type: 3 // WATCHING
  });
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  
  // Handle DMs
  if (message.channel.isDMBased()) {
    if (message.content.toLowerCase().includes('setup') || message.content.toLowerCase().includes('help')) {
      await message.reply({
        content: `**Bot Setup Instructions:**\n\n` +
          `1. Add me to your server\n` +
          `2. Use \`/setup\` command in your server\n` +
          `3. Visit dashboard: ${process.env.DASHBOARD_BASE_URL || 'https://go.digamber.in'}\n` +
          `4. Select your server and configure settings\n\n` +
          `Need help? Contact support through the dashboard.`
      });
    }
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  
  const command = client.commands.get(interaction.commandName);
  if (!command) return;
  
  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`Error executing ${interaction.commandName}:`, error);
    
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ 
        content: 'There was an error executing this command!', 
        ephemeral: true 
      });
    } else {
      await interaction.reply({ 
        content: 'There was an error executing this command!', 
        ephemeral: true 
      });
    }
  }
});

client.on('guildMemberAdd', async (member) => {
  console.log(`Member joined: ${member.user.tag} in ${member.guild.name}`);
  // TODO: Add welcome message logic
});

// Load slash commands
const loadCommands = async () => {
  try {
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);
    
    const commands = [
      {
        name: 'setup',
        description: 'Setup the bot for your server',
        options: [
          {
            name: 'wizard',
            type: 1,
            description: 'Start interactive setup wizard'
          },
          {
            name: 'config',
            type: 1,
            description: 'View current configuration'
          },
          {
            name: 'dashboard',
            type: 1,
            description: 'Get dashboard link for your server'
          }
        ]
      },
      {
        name: 'premium',
        description: 'Manage premium features',
        options: [
          {
            name: 'status',
            type: 1,
            description: 'Check premium status for this server'
          },
          {
            name: 'features',
            type: 1,
            description: 'View premium features'
          }
        ]
      },
      {
        name: 'ping',
        description: 'Check bot latency'
      }
    ];
    
    console.log('Started refreshing application (/) commands.');
    await rest.put(
      Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
      { body: commands }
    );
    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error('Error loading commands:', error);
  }
};

// Command handlers
const commandHandlers = {
  setup: require('./commands/setup'),
  premium: require('./commands/premium')
};

// Register command handlers
for (const [name, handler] of Object.entries(commandHandlers)) {
  if (handler.execute) {
    client.commands.set(name, handler);
  }
}

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDB();
    
    // Load Discord commands
    await loadCommands();
    
    // Start Express server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🔗 Health check: http://go.digamber.in/health`);
    });
    
    // Login to Discord
    await client.login(process.env.DISCORD_BOT_TOKEN);
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  client.destroy();
  mongoose.connection.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  client.destroy();
  mongoose.connection.close();
  process.exit(0);
});

// Start the application
startServer();
