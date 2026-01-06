require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const { Client, GatewayIntentBits } = require('discord.js');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 3000;

// Validate environment variables
const requiredEnvVars = ['DISCORD_BOT_TOKEN', 'MONGODB_URI', 'DASHBOARD_JWT_SECRET'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

// Discord Client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ]
});

// Middleware
app.use(cors({
  origin: process.env.DASHBOARD_BASE_URL || 'https://go.digamber.in',
  credentials: true
}));
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Inject client into request
app.use((req, res, next) => {
  req.client = client;
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    discord: client.isReady() ? 'connected' : 'disconnected',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// API routes
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'Bot API is working',
    endpoints: ['/health', '/api/test']
  });
});

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Discord events
client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  console.log(`🌐 Serving ${client.guilds.cache.size} guilds`);
  
  client.user.setActivity({
    name: `${client.guilds.cache.size} servers | go.digamber.in`,
    type: 3 // WATCHING
  });
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  
  // Handle DMs
  if (message.channel.isDMBased()) {
    if (message.content.toLowerCase().includes('setup') || message.content.toLowerCase().includes('help')) {
      await message.reply({
        embeds: [{
          title: 'Setup Instructions',
          description: `**To setup the bot:**\n\n1. Visit ${process.env.DASHBOARD_BASE_URL || 'https://go.digamber.in'}\n2. Login with Discord\n3. Select your server\n4. Configure settings\n\n**Commands in server:**\n/setup - Start setup wizard\n/premium - Check premium status`,
          color: 0x5865F2,
          timestamp: new Date().toISOString()
        }]
      });
    }
  }
  
  // Server commands
  if (message.content === '!ping') {
    const latency = Date.now() - message.createdTimestamp;
    const apiLatency = Math.round(client.ws.ping);
    
    message.reply(`🏓 Pong!\n• Bot Latency: ${latency}ms\n• API Latency: ${apiLatency}ms`);
  }
});

// Load commands
const loadCommands = async () => {
  try {
    const { REST, Routes } = require('discord.js');
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
          }
        ]
      },
      {
        name: 'premium',
        description: 'Check premium status'
      },
      {
        name: 'ping',
        description: 'Check bot latency'
      }
    ];
    
    console.log('🔄 Loading slash commands...');
    await rest.put(
      Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
      { body: commands }
    );
    console.log('✅ Slash commands loaded');
  } catch (error) {
    console.error('❌ Error loading commands:', error);
  }
};

// Handle interactions
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  
  const { commandName } = interaction;
  
  try {
    await interaction.deferReply({ ephemeral: true });
    
    if (commandName === 'ping') {
      const latency = Date.now() - interaction.createdTimestamp;
      const apiLatency = Math.round(client.ws.ping);
      
      await interaction.editReply({
        content: `🏓 Pong!\n• Bot Latency: ${latency}ms\n• API Latency: ${apiLatency}ms`
      });
    } 
    else if (commandName === 'setup') {
      const dashboardUrl = `${process.env.DASHBOARD_BASE_URL || 'https://go.digamber.in'}/dashboard/${interaction.guild.id}`;
      
      await interaction.editReply({
        embeds: [{
          title: 'Setup Instructions',
          description: `Complete setup on the dashboard:\n\n${dashboardUrl}\n\n1. Login with Discord\n2. Select your server\n3. Configure settings`,
          color: 0x5865F2,
          timestamp: new Date().toISOString()
        }]
      });
    }
    else if (commandName === 'premium') {
      await interaction.editReply({
        embeds: [{
          title: 'Premium Features',
          description: 'Check premium status and upgrade on the dashboard.',
          color: 0xFFD700,
          fields: [
            { name: '🎨 Advanced Templates', value: 'Multiple embeds, buttons, select menus', inline: true },
            { name: '⏰ Scheduled Messages', value: 'Send messages at specific times', inline: true },
            { name: '🤖 Advanced Automation', value: 'Complex role automation', inline: true }
          ],
          timestamp: new Date().toISOString()
        }]
      });
    }
  } catch (error) {
    console.error(`Error handling ${commandName}:`, error);
    await interaction.editReply({
      content: '❌ An error occurred while executing this command.',
      ephemeral: true
    });
  }
});

// Handle guild member join
client.on('guildMemberAdd', async (member) => {
  console.log(`👤 ${member.user.tag} joined ${member.guild.name}`);
  
  // Send welcome message logic here
  const welcomeChannel = member.guild.systemChannel;
  if (welcomeChannel) {
    try {
      await welcomeChannel.send({
        content: `Welcome ${member.user} to ${member.guild.name}! 🎉`
      });
    } catch (error) {
      console.error('Error sending welcome message:', error);
    }
  }
});

// Start everything
const start = async () => {
  try {
    console.log('🚀 Starting Discord Bot...');
    
    // Connect to MongoDB
    await connectDB();
    
    // Load Discord commands
    await loadCommands();
    
    // Start Express server
    app.listen(PORT, () => {
      console.log(`🌐 Express server running on port ${PORT}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    });
    
    // Login to Discord
    await client.login(process.env.DISCORD_BOT_TOKEN);
    
    console.log('🎉 Bot started successfully!');
    
  } catch (error) {
    console.error('❌ Failed to start:', error);
    process.exit(1);
  }
};

// Handle shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  client.destroy();
  mongoose.connection.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  client.destroy();
  mongoose.connection.close();
  process.exit(0);
});

// Start the bot
start();
