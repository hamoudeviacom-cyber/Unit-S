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
    const existingChannel = interaction.guild.channels.cache.find(ch =>
      ch.name.startsWith(ticketConfig.categoryPrefix + '-') &&
      ch.topic &&
      ch.topic.includes(interaction.user.id)
    );

    if (existingChannel) {
      await interaction.editReply({ content: '⚠️ لديك تذكرة مفتوحة بالفعل!\n' + existingChannel });
      return;
    }

    const channelName = ticketConfig.categoryPrefix + '-' +
      interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, '') +
      '-' + Date.now().toString().slice(-4);

    const ticketChannel = await interaction.guild.channels.create({
      name: channelName,
      type: 0,
      parent: config.TICKET_CATEGORY_ID,
      topic: 'Ticket by ' + interaction.user.tag + ' | Type: ' + ticketConfig.name + ' | User ID: ' + interaction.user.id,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: ['ViewChannel'] },
        { id: interaction.user.id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'AttachFiles'] },
        { id: config.SUPPORT_ROLE_ID, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'ManageMessages'] }
      ]
    });

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

    const claimBtn = new ButtonBuilder()
      .setCustomId('ticket_claim')
      .setLabel('Claim')
      .setStyle(ButtonStyle.Primary);

    await ticketChannel.send({
      embeds: [systemEmbed],
      components: [new ActionRowBuilder().addComponents(claimBtn)]
    });

    if (ticketConfig.questions && ticketConfig.questions.length > 0) {
      const questionsEmbed = new EmbedBuilder()
        .setColor(ticketConfig.color)
        .setTitle(ticketConfig.icon + ' أسئلة للتذكرة')
        .setDescription(ticketConfig.questions.map((q, i) => (i + 1) + '. ' + q).join('\n'))
        .setFooter({ text: 'Unit S | Ticket System' })
        .setTimestamp();

      await ticketChannel.send({ embeds: [questionsEmbed] });
    }

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
      // ============ TICKET BUTTONS ============
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

      // ============ TICKET MANAGEMENT ============
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

      if (customId === 'ticket_close') {
        await interaction.deferReply({ ephemeral: true });
        const channel = interaction.channel;
        const topic = channel.topic;

        const userIdMatch = topic && topic.match(/User ID: (\d+)/);
        const userId = userIdMatch ? userIdMatch[1] : null;

        if (userId !== interaction.user.id && !hasModRole(interaction.member)) {
          await interaction.editReply({ content: '❌ ليس لديك صلاحية لإغلاق هذه التذكرة!' });
          return;
        }

        await logTicketTranscript(channel, interaction.user, 'User closed ticket');
        await channel.delete('Ticket closed by user');
        return;
      }

      // ============ FREE RANK ============
      if (customId === 'free_rank_claim') {
        await interaction.deferReply({ ephemeral: true });
        await interaction.editReply({ content: '✅ تم استلام الرتبة المجانية!' });
        return;
      }

      // ============ ENCRYPTION - START ============
      if (customId === 'shfr_start') {
        await interaction.deferReply({ ephemeral: true });

        // Initialize encryption map
        if (!client.encryptionUsers) {
          client.encryptionUsers = new Map();
        }

        const isEnabled = client.encryptionUsers.get(interaction.user.id);

        if (isEnabled) {
          // Disable encryption
          client.encryptionUsers.delete(interaction.user.id);

          const disabledEmbed = new EmbedBuilder()
            .setTitle('🔓 Unit S | إلغاء التشفير')
            .setColor(0xFF0000)
            .setDescription([
              '❌ تم إيقاف التشفير!',
              '',
              'لن يتم تشفير رسائلك بعد الآن.'
            ].join('\n'))
            .setFooter({ text: 'Unit S | Encryption System' })
            .setTimestamp();

          await interaction.editReply({ embeds: [disabledEmbed] });
        } else {
          // Enable encryption
          client.encryptionUsers.set(interaction.user.id, true);

          const enabledEmbed = new EmbedBuilder()
            .setTitle('🔐 Unit S | التشفير')
            .setColor(0x00FF00)
            .setDescription([
              '✅ تم تفعيل التشفير!',
              '',
              'اكتب منشورك وسأشفر الكلمات المحظورة فوراً.',
              '',
              '**طريقة الاستخدام:**',
              '1️⃣ اكتب أي كلمة أو جملة',
              '2️⃣ سأقوم بتشفير الكلمات المحظورة تلقائياً',
              '',
              '**لإيقاف:** اضغط على الزر مرة أخرى'
            ].join('\n'))
            .setFooter({ text: 'Unit S | Encryption System' })
            .setTimestamp();

          await interaction.editReply({ embeds: [enabledEmbed] });
        }
        return;
      }

    } catch (err) {
      console.error('[INTERACTION] Error:', err);
    }
  }
};
