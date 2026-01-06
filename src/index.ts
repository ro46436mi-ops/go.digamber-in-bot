require('dotenv').config();

console.log('🚀 Starting Discord Bot...');
console.log('Environment check:', {
  PORT: process.env.PORT,
  NODE_ENV: process.env.NODE_ENV,
  HAS_DISCORD_TOKEN: !!process.env.DISCORD_BOT_TOKEN,
  HAS_MONGODB_URI: !!process.env.MONGODB_URI
});

const express = require('express');
const mongoose = require('mongoose');
const { Client, GatewayIntentBits, REST, Routes } = require('discord.js');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 3000;

// Validate required environment variables
const requiredEnvVars = ['DISCORD_BOT_TOKEN', 'MONGODB_URI'];
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
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    version: '1.0.0'
  });
});

// API routes
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'Bot API is working',
    endpoints: [
      '/health',
      '/api/test',
      '/api/guilds',
      '/api/templates',
      '/api/premium'
    ]
  });
});

// Get bot guilds
app.get('/api/guilds', (req, res) => {
  if (!client.isReady()) {
    return res.status(503).json({ error: 'Discord client not ready' });
  }
  
  const guilds = client.guilds.cache.map(guild => ({
    id: guild.id,
    name: guild.name,
    icon: guild.iconURL(),
    memberCount: guild.memberCount,
    joinedAt: guild.joinedAt
  }));
  
  res.json({ success: true, guilds });
});

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ MongoDB connected');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Discord events
client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  console.log(`🌐 Serving ${client.guilds.cache.size} guild(s)`);
  
  // Set bot activity
  client.user.setActivity({
    name: `${client.guilds.cache.size} server(s) | go.digamber.in`,
    type: 3 // WATCHING
  });
});

// Handle messages
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  
  // DM handling
  if (message.channel.isDMBased()) {
    const content = message.content.toLowerCase();
    
    if (content.includes('setup') || content.includes('help')) {
      await message.reply({
        embeds: [{
          title: '🤖 Bot Setup Guide',
          description: `**To get started:**\n\n1. Use \`/setup\` command in your server\n2. Visit dashboard: ${process.env.DASHBOARD_BASE_URL || 'https://go.digamber.in'}\n3. Login with Discord\n4. Select your server and configure\n\n**Need help?** Contact support through the dashboard.`,
          color: 0x5865F2,
          timestamp: new Date().toISOString(),
          footer: { text: 'Go.Digamber.in Discord Bot' }
        }]
      });
    }
  }
  
  // Server commands (legacy)
  if (message.content === '!ping') {
    const latency = Date.now() - message.createdTimestamp;
    const apiLatency = Math.round(client.ws.ping);
    
    message.reply(`🏓 Pong!\n• Bot Latency: ${latency}ms\n• API Latency: ${apiLatency}ms`);
  }
  
  if (message.content === '!invite') {
    const inviteLink = `https://discord.com/api/oauth2/authorize?client_id=${process.env.DISCORD_CLIENT_ID}&permissions=8&scope=bot%20applications.commands`;
    message.reply(`🔗 Invite link: ${inviteLink}`);
  }
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
          }
        ]
      },
      {
        name: 'premium',
        description: 'Check premium status and features'
      },
      {
        name: 'ping',
        description: 'Check bot latency'
      },
      {
        name: 'invite',
        description: 'Get bot invite link'
      }
    ];
    
    console.log('🔄 Loading slash commands...');
    
    if (process.env.DISCORD_CLIENT_ID) {
      await rest.put(
        Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
        { body: commands }
      );
      console.log('✅ Slash commands loaded');
    } else {
      console.log('⚠️ DISCORD_CLIENT_ID not set, skipping command registration');
    }
  } catch (error) {
    console.error('❌ Error loading commands:', error);
  }
};

// Handle slash commands
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  
  const { commandName, guild } = interaction;
  
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
      const dashboardUrl = `${process.env.DASHBOARD_BASE_URL || 'https://go.digamber.in'}/dashboard/${guild?.id || 'your-server'}`;
      
      await interaction.editReply({
        embeds: [{
          title: '🚀 Setup Instructions',
          description: `**Complete setup on the dashboard:**\n\n${dashboardUrl}\n\n1. Login with Discord\n2. Select your server\n3. Configure settings\n4. Start using features`,
          color: 0x5865F2,
          timestamp: new Date().toISOString(),
          footer: { text: 'For more help, DM me with "help"' }
        }]
      });
    }
    else if (commandName === 'premium') {
      await interaction.editReply({
        embeds: [{
          title: '🌟 Premium Features',
          description: 'Upgrade to unlock exclusive features:',
          color: 0xFFD700,
          fields: [
            { name: '🎨 Advanced Templates', value: 'Multiple embeds, buttons, select menus', inline: true },
            { name: '⏰ Scheduled Messages', value: 'Send messages at specific times', inline: true },
            { name: '🤖 Advanced Automation', value: 'Complex role automation', inline: true },
            { name: '📊 Analytics Dashboard', value: 'Detailed insights and reports', inline: true },
            { name: '🔐 Priority Support', value: 'Faster response times', inline: true },
            { name: '⚡ Unlimited Templates', value: 'No limits on templates', inline: true }
          ],
          timestamp: new Date().toISOString(),
          footer: { text: 'Visit dashboard to upgrade' }
        }]
      });
    }
    else if (commandName === 'invite') {
      const inviteLink = `https://discord.com/api/oauth2/authorize?client_id=${process.env.DISCORD_CLIENT_ID || 'YOUR_CLIENT_ID'}&permissions=8&scope=bot%20applications.commands`;
      
      await interaction.editReply({
        content: `🔗 **Invite Link:** ${inviteLink}\n\nCopy this link to invite the bot to other servers!`
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
  
  // Auto-role and welcome message logic will be added here
});

// Start everything
const start = async () => {
  try {
    console.log('🚀 Initializing Discord Bot...');
    
    // Connect to MongoDB
    await connectDB();
    
    // Load Discord commands
    await loadCommands();
    
    // Start Express server
    app.listen(PORT, () => {
      console.log(`🌐 Express server running on port ${PORT}`);
      console.log(`🔗 Health endpoint: http://go.digamber.in:/health`);
      console.log(`🔗 Test endpoint: http://go.digamber.in/api/test`);
    });
    
    // Login to Discord
    console.log('🔐 Logging into Discord...');
    await client.login(process.env.DISCORD_BOT_TOKEN);
    
    console.log('🎉 Bot started successfully!');
    
  } catch (error) {
    console.error('❌ Failed to start bot:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  if (client.isReady()) client.destroy();
  mongoose.connection.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  if (client.isReady()) client.destroy();
  mongoose.connection.close();
  process.exit(0);
});

// Start the bot
start();
