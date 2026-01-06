const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('premium')
    .setDescription('Manage premium features')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
      subcommand
        .setName('status')
        .setDescription('Check premium status for this server')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('features')
        .setDescription('View premium features')
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
      case 'status':
        const embed = new EmbedBuilder()
          .setTitle(`Premium Status: ${guild.name}`)
          .setColor(0x5865F2)
          .setDescription('Premium features are managed through the dashboard.')
          .addFields(
            { name: 'Dashboard', value: `${process.env.DASHBOARD_BASE_URL || 'https://go.digamber.in'}/dashboard/${guild.id}`, inline: false },
            { name: 'Note', value: 'Check premium status and upgrade on the dashboard.', inline: false }
          )
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
        break;
        
      case 'features':
        const featuresEmbed = new EmbedBuilder()
          .setTitle('Premium Features')
          .setColor(0x00FF00)
          .setDescription('Upgrade to unlock these exclusive features:')
          .addFields(
            { name: '🎨 Advanced Templates', value: 'Create templates with multiple embeds, buttons, and select menus', inline: true },
            { name: '⏰ Scheduled Messages', value: 'Schedule messages to be sent at specific times', inline: true },
            { name: '🤖 Advanced Automation', value: 'Set up complex role and message automation', inline: true },
            { name: '📊 Advanced Analytics', value: 'Detailed message and member analytics', inline: true },
            { name: '🔐 Priority Support', value: 'Get help faster with priority support', inline: true },
            { name: '⚡ Unlimited Templates', value: 'No limits on number of templates', inline: true }
          )
          .setFooter({ 
            text: 'Visit the dashboard to upgrade and unlock all features!' 
          });
        
        await interaction.editReply({ embeds: [featuresEmbed] });
        break;
    }
  }
};
