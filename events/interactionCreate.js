// Interaction Create Event
// حدث التفاعلات - الأزرار والمنيو

const { ButtonBuilder, ButtonStyle, ActionRowBuilder, EmbedBuilder } = require('discord.js');
const { hasModRole, hasTicketAdminRole } = require('../utils/helpers.js');
const TICKET_TYPES = require('../config/ticketTypes.js');
const config = require('../config/index.js');
const { logTicketTranscript } = require('../utils/logging.js');

// Create ticket function
async function createTicket(interaction, ticketType) {
  const ticketConfig = TICKET_TYPES[ticketType];
  if (!ticketConfig) {
    await interaction.editReply({ content: '❌ نوع التذكرة غير موجود!' });
    return;
  }

  try {
    // Check if user already has a ticket open
    const existingChannel = interaction.guild.channels.cache.find(ch =>
      ch.name.startsWith(ticketConfig.categoryPrefix + '-') &&
      ch.topic &&
      ch.topic.includes(interaction.user.id)
    );

    if (existingChannel) {
      await interaction.editReply({ content: '⚠️ لديك تذكرة مفتوحة بالفعل!\n' + existingChannel });
      return;
    }

    // Create channel name
    const channelName = ticketConfig.categoryPrefix + '-' +
      interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, '') +
      '-' + Date.now().toString().slice(-4);

    // Create the ticket channel
    const ticketChannel = await interaction.guild.channels.create({
      name: channelName,
      type: 0, // GuildText
      parent: config.TICKET_CATEGORY_ID,
      topic: 'Ticket by ' + interaction.user.tag + ' | Type: ' + ticketConfig.name + ' | User ID: ' + interaction.user.id,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: ['ViewChannel'] },
        { id: interaction.user.id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'AttachFiles'] },
        { id: config.SUPPORT_ROLE_ID, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'ManageMessages'] }
      ]
    });

    // Welcome embed
    const welcomeEmbed = new EmbedBuilder()
      .setColor(ticketConfig.color)
      .setTitle(ticketConfig.icon + ' ' + ticketConfig.name)
      .setDescription([
        'Hey <@' + interaction.user.id + '> Welcome to Unit S',
        '',
        'Please Wait The Support To Answer ✅',
        '',
        '<@&' + config.SUPPORT_ROLE_ID + '> ⚒️'
      ].join('\n'))
      .setFooter({ text: 'Unit S - Ticketing without clutter' })
      .setTimestamp();

    // Close button
    const closeBtn = new ButtonBuilder()
      .setCustomId('ticket_close')
      .setLabel('Close')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('🔓');

    await ticketChannel.send({
      content: '<@' + interaction.user.id + '>',
      embeds: [welcomeEmbed],
      components: [new ActionRowBuilder().addComponents(closeBtn)]
    });

    // System embed with questions
    const systemEmbed = new EmbedBuilder()
      .setAuthor({ name: 'Unit S | System' })
      .setColor(ticketConfig.color)
      .setDescription([
        'السلام عليكم ورحمة الله وبركاته ..',
        '',
        'معك طاقم Unit S في تذكرة ' + ticketConfig.name + ' !',
        '',
        ticketConfig.description,
        '',
        'يرجى توضيح مشكلتك بالكامل لكي يمكنني مساعدتك'
      ].join('\n'))
      .setFooter({ text: 'يرجى من المسؤول الضغط على الزر لاستلام التذكرة' })
      .setTimestamp();

    // Claim button
    const claimBtn = new ButtonBuilder()
      .setCustomId('ticket_claim')
      .setLabel('Claim')
      .setStyle(ButtonStyle.Primary);

    await ticketChannel.send({
      embeds: [systemEmbed],
      components: [new ActionRowBuilder().addComponents(claimBtn)]
    });

    // Send questions if available
    if (ticketConfig.questions && ticketConfig.questions.length > 0) {
      const questionsEmbed = new EmbedBuilder()
        .setColor(ticketConfig.color)
        .setTitle(ticketConfig.icon + ' أسئلة للتذكرة')
        .setDescription(ticketConfig.questions.map((q, i) => (i + 1) + '. ' + q).join('\n'))
        .setFooter({ text: 'Unit S | Ticket System' })
        .setTimestamp();

      await ticketChannel.send({ embeds: [questionsEmbed] });
    }

    // Pin the welcome message
    const pinnedMsg = await ticketChannel.messages.fetch({ limit: 1 }).then(msgs => msgs.first());
    if (pinnedMsg) await pinnedMsg.pin().catch(() => {});

    await interaction.editReply({ content: '✅ تم إنشاء تذكرتك بنجاح!\n' + ticketChannel });

  } catch (err) {
    console.error('[' + ticketType.toUpperCase() + '] Error:', err);
    await interaction.editReply({ content: '❌ حدث خطأ أثناء إنشاء التذكرة.' });
  }
}

module.exports = {
  name: 'interactionCreate',
  once: false,
  execute: async (client, interaction) => {
    if (!interaction.isButton()) return;

    const customId = interaction.customId;

    try {
      // Ticket type buttons
      if (customId === 'ticket_order') {
        await interaction.deferReply({ ephemeral: true });
        await createTicket(interaction, 'order');
        return;
      }
      if (customId === 'ticket_support') {
        await interaction.deferReply({ ephemeral: true });
        await createTicket(interaction, 'support');
        return;
      }
      if (customId === 'ticket_report') {
        await interaction.deferReply({ ephemeral: true });
        await createTicket(interaction, 'report');
        return;
      }
      if (customId === 'ticket_applysupport') {
        await interaction.deferReply({ ephemeral: true });
        await createTicket(interaction, 'applysupport');
        return;
      }
      if (customId === 'ticket_applyteam') {
        await interaction.deferReply({ ephemeral: true });
        await createTicket(interaction, 'applyteam');
        return;
      }

      // Ticket claim button
      if (customId === 'ticket_claim') {
        await interaction.deferReply({ ephemeral: true });
        if (!hasModRole(interaction.member)) {
          await interaction.editReply({ content: '❌ ليس لديك صلاحية لاستلام التذكرة!' });
          return;
        }

        const channel = interaction.channel;
        if (!channel.name.startsWith('👤')) {
          await channel.setName('👤-' + channel.name);
        }

        await channel.send('👤 تم استلام التذكرة بواسطة <@' + interaction.user.id + '>');
        await interaction.editReply({ content: '✅ تم استلام التذكرة بنجاح!' });
        return;
      }

      // Ticket close button
      if (customId === 'ticket_close') {
        await interaction.deferReply({ ephemeral: true });
        const channel = interaction.channel;
        const topic = channel.topic;

        // Extract user ID from topic
        const userIdMatch = topic && topic.match(/User ID: (\d+)/);
        const userId = userIdMatch ? userIdMatch[1] : null;

        if (userId !== interaction.user.id && !hasModRole(interaction.member)) {
          await interaction.editReply({ content: '❌ ليس لديك صلاحية لإغلاق هذه التذكرة!' });
          return;
        }

        // Log transcript and delete channel
        await logTicketTranscript(channel, interaction.user, 'User closed ticket');
        await channel.delete('Ticket closed by user');
        return;
      }

      // Free rank claim button
      if (customId === 'free_rank_claim') {
        await interaction.deferReply({ ephemeral: true });
        // Add your free rank claim logic here
        await interaction.editReply({ content: '✅ تم استلام الرتبة المجانية!' });
        return;
      }

    } catch (err) {
      console.error('[INTERACTION] Error:', err);
    }
  }
};
