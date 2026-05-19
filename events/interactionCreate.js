const { ButtonBuilder, ButtonStyle, ActionRowBuilder, EmbedBuilder } = require('discord.js');
const { hasModRole } = require('../utils/helpers.js');
const TICKET_TYPES = require('../config/ticketTypes.js');
const config = require('../config/index.js');
const { logTicketTranscript } = require('../utils/logging.js');

async function createTicket(interaction, ticketType) {
  const ticketConfig = TICKET_TYPES[ticketType];
  if (!ticketConfig) {
    await interaction.editReply({ content: '❌ نوع التذكرة غير موجود!' });
    return;
  }

  try {
    const existingChannel = interaction.guild.channels.cache.find(ch =>
      ch.name.startsWith(ticketConfig.categoryPrefix + '-') &&
      ch.topic && ch.topic.includes(interaction.user.id)
    );

    if (existingChannel) {
      await interaction.editReply({ content: '⚠️ لديك تذكرة مفتوحة!\n' + existingChannel });
      return;
    }

    const channelName = ticketConfig.categoryPrefix + '-' +
      interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, '') +
      '-' + Date.now().toString().slice(-4);

    const ticketChannel = await interaction.guild.channels.create({
      name: channelName,
      type: 0,
      parent: config.TICKET_CATEGORY_ID,
      topic: 'Ticket | ' + interaction.user.tag + ' | ' + interaction.user.id,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: ['ViewChannel'] },
        { id: interaction.user.id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'AttachFiles'] },
        { id: config.SUPPORT_ROLE_ID, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'ManageMessages'] }
      ]
    });

    const orderEmbed = new EmbedBuilder()
      .setColor(0xDC2626)
      .setAuthor({ name: 'مرحباً بك في UNIT S' })
      .setDescription([
        '<:zO_246:1495222454530871346> - معك فريق العمل في تذكرتك الخاصة يسعدنا خدمتك وتسليم طلبك **سريعاً**',
        '',
        '<:Rox_pin:1495225600258998313> - يرجى كتابة تفاصيل طلبك كاملة في رسالة **واحده**',
        '',
        '<:Rox_pin:1495225600258998313> - سيتم توجيه القسم المختص لخدمتك فوراً',
        '',
        '<:warn:1495225561520541848> - تنويه! في حال عدم توفرة الخدمة سيتم إبلاغك عند توفرها'
      ].join('\n'))
      .setFooter({ text: 'UNIT S | Order System' })
      .setTimestamp();

    const closeBtn = new ButtonBuilder()
      .setCustomId('ticket_close')
      .setLabel('إغلاق التذكرة')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('🔒');

    const claimBtn = new ButtonBuilder()
      .setCustomId('ticket_claim')
      .setLabel('استلام التذكرة')
      .setStyle(ButtonStyle.Success)
      .setEmoji('✅');

    await ticketChannel.send({
      content: '<@' + interaction.user.id + '>',
      embeds: [orderEmbed],
      components: [
        new ActionRowBuilder().addComponents(closeBtn),
        new ActionRowBuilder().addComponents(claimBtn)
      ]
    });

    await interaction.editReply({ content: '✅ تم إنشاء تذكرتك!\n' + ticketChannel });

  } catch (err) {
    console.error('[TICKET] Error:', err);
    await interaction.editReply({ content: '❌ حدث خطأ!' });
  }
}

module.exports = {
  name: 'interactionCreate',
  once: false,
  execute: async (client, interaction) => {
    if (!interaction.isButton()) return;
    const customId = interaction.customId;

    try {
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
      if (customId === 'ticket_claim') {
        await interaction.deferReply({ ephemeral: true });
        if (!hasModRole(interaction.member)) {
          await interaction.editReply({ content: '❌ ليس لديك صلاحية!' });
          return;
        }
        await interaction.editReply({ content: '✅ تم استلام التذكرة!' });
        return;
      }
      if (customId === 'ticket_close') {
        await interaction.deferReply({ ephemeral: true });
        await logTicketTranscript(interaction.channel, interaction.user, 'Closed');
        await interaction.channel.delete();
        return;
      }
      if (customId === 'shfr_start') {
        await interaction.deferReply({ ephemeral: true });
        if (!client.encryptionUsers) client.encryptionUsers = new Map();
        client.encryptionUsers.set(interaction.user.id, true);
        await interaction.editReply({ content: '✅ تم تفعيل التشفير!' });
        return;
      }
    } catch (err) {
      console.error('[INTERACTION] Error:', err);
    }
  }
};
