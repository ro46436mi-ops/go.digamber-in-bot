const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Setup the bot for your server')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
      subcommand
        .setName('wizard')
        .setDescription('Start interactive setup wizard')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('config')
        .setDescription('View current configuration')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('dashboard')
        .setDescription('Get dashboard link for your server')
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    const subcommand = interaction.options.getSubcommand();
    const guild = interaction.guild;
    
    if (!guild) {
      await interaction.editReply('This command can only be used in a server.');
      return;
    }
    
    switch (subcommand) {
      case 'wizard':
        try {
          const dmChannel = await interaction.user.createDM();
          await dmChannel.send({
            embeds: [
              new EmbedBuilder()
                .setTitle(`Setup Wizard: ${guild.name}`)
                .setDescription('I will guide you through setting up the bot for your server.')
                .addFields(
                  { name: 'Step 1', value: 'Configure auto-assign roles', inline: true },
                  { name: 'Step 2', value: 'Set welcome channel & message', inline: true },
                  { name: 'Step 3', value: 'Configure audit logging', inline: true }
                )
                .setColor(0x5865F2)
                .setTimestamp()
            ]
          });
          
          const dashboardLink = `${process.env.DASHBOARD_BASE_URL || 'https://go.digamber.in'}/dashboard/${guild.id}`;
          await dmChannel.send(`Complete your setup on the dashboard: ${dashboardLink}`);
          
          await interaction.editReply('✅ I\'ve sent you a DM with setup instructions!');
        } catch (error) {
          console.error('Setup wizard failed:', error);
          await interaction.editReply('❌ Could not send DM. Please enable DMs and try again.');
        }
        break;
        
      case 'config':
        const embed = new EmbedBuilder()
          .setTitle(`Configuration: ${guild.name}`)
          .setColor(0x5865F2)
          .addFields(
            { name: 'Server ID', value: guild.id, inline: true },
            { name: 'Member Count', value: guild.memberCount.toString(), inline: true },
            { name: 'Bot Permissions', value: 'Configured via dashboard', inline: true }
          )
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
        break;
        
      case 'dashboard':
        const link = `${process.env.DASHBOARD_BASE_URL || 'https://go.digamber.in'}/dashboard/${guild.id}`;
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setTitle('Dashboard Access')
              .setDescription(`Manage your server configuration on the dashboard:\n\n${link}`)
              .setColor(0x5865F2)
              .setFooter({ text: 'You must be logged in with your Discord account to access the dashboard.' })
          ]
        });
        break;
    }
  }
};
