const { ButtonBuilder, ButtonStyle, ActionRowBuilder, EmbedBuilder } = require('discord.js');
const { hasModRole, hasTicketAdminRole } = require('../utils/helpers.js');
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

    // رسالة الترحيب العربية ⭐
    const welcomeEmbed = new EmbedBuilder()
      .setColor(0xDC2626)
      .setDescription([
        '__**مرحباً بك في UNIT S**__',
        '',
        '<:zO_246:1495222454530871346>- معك فريق العمل في تذكرتك الخاصة يسعدنا جداً خدمتك وتلبية طلبك، لتسهيل العملية وتأكيد الطلب',
        '**سريعاً**',
        '',
        '<:Rox_pin:1495225600258998313>- يرجى كتابة تفاصيل طلبك كاملة هنا في رسالة',
        '**واحده**',
        '',
        '<:Rox_pin:1495225600258998313>- سيتم توجيه القسم المختص لخدمتك فوراً نرجو منك الصبر والانتظار',
        '',
        '<:warn:1495225561520541848>- تنويه! في حال عدم تـ9فر الخدمة حالياً سيتم إغلاق التذكرة وإبلاغك عند تـ9فرها مجدداً.'
      ].join('\n'))
      .setFooter({ text: 'UNIT S | Order System' })
      .setTimestamp();

    // Close button
    const closeBtn = new ButtonBuilder()
      .setCustomId('ticket_close')
      .setLabel('إغلاق التذكرة')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('🔒');

    // Claim button
    const claimBtn = new ButtonBuilder()
      .setCustomId('ticket_claim')
      .setLabel('استلام التذكرة')
      .setStyle(ButtonStyle.Success)
      .setEmoji('✅');

    // إرسال رسالة + mention اللاعب ⭐
    await ticketChannel.send({
      content: '<@' + interaction.user.id + '>',
      embeds: [welcomeEmbed],
      components: [
        new ActionRowBuilder().addComponents(closeBtn),
        new ActionRowBuilder().addComponents(claimBtn)
      ]
    });

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
      if (customId === 'ticket_order') { await interaction.deferReply({ ephemeral: true }); await createTicket(interaction, 'order'); return; }
      if (customId === 'ticket_support') { await interaction.deferReply({ ephemeral: true }); await createTicket(interaction, 'support'); return; }
      if (customId === 'ticket_report') { await interaction.deferReply({ ephemeral: true }); await createTicket(interaction, 'report'); return; }
      if (customId === 'ticket_applysupport') { await interaction.deferReply({ ephemeral: true }); await createTicket(interaction, 'applysupport'); return; }
      if (customId === 'ticket_applyteam') { await interaction.deferReply({ ephemeral: true }); await createTicket(interaction, 'applyteam'); return; }

      // Ticket claim button
      if (customId === 'ticket_claim') {
        await interaction.deferReply({ ephemeral: true });
        if (!hasModRole(interaction.member)) { await interaction.editReply({ content: '❌ ليس لديك صلاحية لاستلام التذكرة!' }); return; }
        const channel = interaction.channel;
        if (!channel.name.startsWith('👤')) await channel.setName('👤-' + channel.name);
        await channel.send('👤 تم استلام التذكرة بواسطة <@' + interaction.user.id + '>');
        await interaction.editReply({ content: '✅ تم استلام التذكرة بنجاح!' });
        return;
      }

      // Ticket close button
      if (customId === 'ticket_close') {
        await interaction.deferReply({ ephemeral: true });
        const channel = interaction.channel;
        const topic = channel.topic;
        const userIdMatch = topic && topic.match(/User ID: (\d+)/);
        const userId = userIdMatch ? userIdMatch[1] : null;
        if (userId !== interaction.user.id && !hasModRole(interaction.member)) { await interaction.editReply({ content: '❌ ليس لديك صلاحية!' }); return; }
        await logTicketTranscript(channel, interaction.user, 'User closed ticket');
        await channel.delete('Ticket closed by user');
        return;
      }

      // Free rank claim button
      if (customId === 'free_rank_claim') { await interaction.deferReply({ ephemeral: true }); await interaction.editReply({ content: '✅ تم استلام الرتبة المجانية!' }); return; }

      // Encryption button
      if (customId === 'shfr_post') { await interaction.deferReply({ ephemeral: true }); await interaction.editReply({ content: '✅ تم تفعيل التشفير!' }); return; }

    } catch (err) { console.error('[INTERACTION] Error:', err); }
  }
};
