// Unit S - Discord Bot
// نظام الحماية والتشفير وتذكرة بانيل

import { Client, GatewayIntentBits, Collection, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, SelectMenuBuilder, SelectMenuOptionBuilder } from 'discord.js';

const TOKEN = process.env.DISCORD_TOKEN || 'YOUR_BOT_TOKEN';
const PREFIX = '!';

// Initialize Client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  partials: ['CHANNEL', 'GUILD_MEMBER', 'USER'],
});

// Collections
client.commands = new Collection();
client.encryptedPosts = new Collection();
client.ticketCounter = 0; // عداد التذاكر التسلسلي

// ============ Ticket Settings ============
const ticketSettings = {
  // الرولات اللي تستلم إشعار التذكرة (حط الـ Role IDs هنا)
  allowedRoles: [
    // مثال: '123456789012345678'
    // 'another_role_id_here'
  ],
  // أو استخدم اسم الرول (حط الاسم هنا)
  allowedRoleNames: [
    // مثال: 'Support Team'
    // 'Admin'
  ],
  // الرولات اللي تقدر تسكر التذكرة (حط الـ Role IDs هنا)
  ticketAdminRoles: [
    // مثال: '123456789012345678'
  ],
  // أو استخدم اسم الرول
  ticketAdminRoleNames: [
    // مثال: 'Admin'
    // 'Support'
  ],
  // قناة اللوجس (حط الـ Channel ID هنا)
  logsChannelId: null, // مثال: '123456789012345678'
  // الرول اللي تنذكر تلقائيا عند فتح تذكرة
  mentionRoleId: null, // مثال: '123456789012345678'
  mentionRoleName: null, // مثال: 'دعم'
};

// ============ Word Encryption Dictionary ============
const wordDictionary = {
    "يوزرات": "يـ9ـزرات",
    "يوزر": "يـ9ـزر",
    "سيرفرات": "سيـRـفرات",
    "السيرفر": "السيـRـفر",
    "سيرفر": "سيـRـفر",
    "للبيع": "للبيـ3",
    "وسيط": "9ـسـيـt",
    "دسكورد": "ديسـkـ9رد",
    "فلوس": "فلـ9ـس",
    "الدفع": "الـDـفـ3",
    "ستيم": "ستيـm",
    "تهكير": "Tهـkـير",
    "رابط": "ر1بط",
    "أيدي": "١دي",
    "أداة": "١د١ة",
    "الأيميل": "الأيـmـيل",
    "أيميل": "أيـmـيل",
    "تشتري": "تشـtـري",
    "اسعارنا": "اسـ3ـارنا",
    "اعضاء": "اعـ3ـاء",
    "العاب": "الـ3ـاب",
    "شحن": "شـ7ـن",
    "تبيع": "تبيـ3",
    "افكتات": "افـkـتاt",
    "افكت": "افـkـت",
    "شراء": "شر1ء",
    "بيع": "بيـ3",
    "سعر": "سـ3ـر",
    "سومك": "سـ9ـمـk",
    "خاصي": "خـ1صي",
    "سعرك": "سـ3ـرk",
    "السعر": "الـ5ـ3ـر",
    "ديسكورد": "ديسـkـ9رد",
    "انواع": "انـ9ـ1ع",
    "الدفعة": "الـDـفـ3ـة",
    "بوتات": "بـ9ـتات",
    "بوت": "بـ9ـت",
    "كريبتو": "كـRبتـ9",
    "بوستات": "بـ9ـستات",
    "بوست": "بـ9ـست",
    "انشاء": "انشـ1ء",
    "مقابل": "مقـ1بل",
    "الجوال": "الجـ9ـ1ل",
    "نيتروهات": "نيتر97ـات",
    "روبلوكس": "ر9بلـkـس",
    "حسابات": "7ـسابات",
    "حسابك": "7ـسابـk",
    "أسعار": "أسـ3ـ1ر",
    "اسعاري": "اسـ3ـاري",
    "جواهر": "جـ9ـاهر",
    "بالسوق": "بالسـ9ـq",
    "السوق": "الـ5ـوق",
    "سوق": "5ـ9ـq",
    "طريقة": "طريـkـة",
    "توكن": "تـ9ـكـn",
    "بروجكت": "بر9جـkـت",
    "ايفون": "ايـFـون",
    "متوفر": "متـ9ـفر",
    "بروجكتات": "بر9جكتات",
    "روبوكس": "ر9ـبوكس",
    "نيترو": "نيتر9",
    "لايكات": "لايـkـات",
    "انستا": "انسـtـا",
    "كريدت": "كريـDـت",
    "اسياسيل": "اسـeـاسيل",
    "دفع": "دفـ3",
    "فوري": "فـ9ـري",
    "طلب": "tـلب",
    "مطلوب": "مـtـل9ب",
    "استفسار": "استفسـ1ر",
    "تسليم": "تـ5ـليم",
    "طرق": "طرk",
    "يوتيوب": "يـ9ـتيوب",
    "جوجل": "جـ9ـجل",
    "جيملات": "جيـmـلات",
    "نتفلكس": "نتفلـkـس",
    "ثمن": "ثـmـن",
    "كاش": "كـ1ش",
    "خاص": "خ1ص"
};

// ============ Protection Settings ============
const protectionSettings = {
  wordFilter: {
    enabled: true,
    words: ['كلمة1', 'كلمة2', 'badword', 'spamword'],
    action: 'delete',
  },
  antiSpam: {
    enabled: true,
    maxMentions: 3,
    maxEmojis: 10,
    maxMessages: 5,
    timeWindow: 5000,
  },
  antiLink: {
    enabled: true,
    blacklistedDomains: ['discord.gg', 'bit.ly', 'tinyurl.com'],
    whitelistedDomains: ['youtube.com', 'twitch.tv'],
  },
};

// Anti-Spam Tracker
const antiSpamTracker = new Map();

// ============ EMBED COLORS ============
const COLORS = {
  primary: 0x667eea,
  success: 0x10b981,
  warning: 0xf59e0b,
  danger: 0xef4444,
};

// ============ TICKET HELPER FUNCTIONS ============

// دالة فحص إذا المستخدم يقدر يسكر التذكرة
function hasTicketAdminRole(member) {
  if (!member) return false;

  // فحص الصلاحية الأساسية
  if (member.permissions.has('ManageChannels')) return true;

  // فحص الرولات من الـ IDs
  for (const roleId of ticketSettings.ticketAdminRoles) {
    if (member.roles.cache.has(roleId)) return true;
  }

  // فحص الرولات من الأسماء
  for (const roleName of ticketSettings.ticketAdminRoleNames) {
    const role = member.roles.cache.find(r =>
      r.name.toLowerCase().includes(roleName.toLowerCase())
    );
    if (role) return true;
  }

  return false;
}

// دالة حفظ لوجس التذكرة
async function logTicketTranscript(channel, closedBy, reason = 'لم يذكر') {
  try {
    // جلب جميع الرسائل في التذكرة
    const messages = await channel.messages.fetch({ limit: 100 }).catch(() => new Collection());

    // ترتيب الرسائل من الأقدم للأحدث
    const sortedMessages = messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

    // بناء اللوجس
    let transcript = `=== لوجس التذكرة: ${channel.name} ===\n`;
    transcript += `تاريخ الإغلاق: ${new Date().toLocaleString('ar-SA')}\n`;
    transcript += `مقام من: ${closedBy.tag || closedBy.username || 'غير معروف'}\n`;
    transcript += `السبب: ${reason}\n`;
    transcript += `عدد الرسائل: ${messages.size}\n`;
    transcript += '================================\n\n';

    for (const msg of sortedMessages.values()) {
      const timestamp = new Date(msg.createdTimestamp).toLocaleString('ar-SA');
      const author = msg.author.tag;
      const content = msg.content || '[رسالة بدون نص]';

      // إضافة المرفقات إذا وجدت
      let attachments = '';
      if (msg.attachments.size > 0) {
        attachments = ' [مرفقات: ' + msg.attachments.map(a => a.name).join(', ') + ']';
      }

      transcript += `[${timestamp}] ${author}: ${content}${attachments}\n`;
    }

    transcript += '\n=== نهاية اللوجس ===';

    // إرسال اللوجس للقناة المحددة
    const logsChannel = client.channels.cache.get(ticketSettings.logsChannelId);
    if (logsChannel) {
      // إرسال كملف نصي
      await logsChannel.send({
        content: `📋 **لوجس تذكرة مغلقة: ${channel.name}**\nتم الإغلاق من: ${closedBy.tag || closedBy.username}\nالسبب: ${reason}`,
        files: [{
          attachment: Buffer.from(transcript, 'utf8'),
          name: `ticket-${channel.name}-${Date.now()}.txt`
        }]
      });
    }

    return true;
  } catch (error) {
    console.error('Error logging ticket transcript:', error);
    return false;
  }
}

// ============ HELP COMMAND ============
client.commands.set('help', {
  name: 'help',
  description: 'Show all commands',
  execute: async (message) => {
    const embed = new EmbedBuilder()
      .setTitle('Unit S - قائمة الأوامر')
      .setColor(COLORS.primary)
      .addFields(
        { name: '🎫 التذاكر', value:
          '`!ticket` - فتح قائمة التذاكر\n' +
          '`!tmanage` - عرض قائمة التذاكر\n' +
          '`!tmanage close` - إغلاق التذكرة\n' +
          '`!tmanage addrole @رول` - إضافة رول للتذاكر\n' +
          '`!tmanage removerole @رول` - إزالة رول\n' +
          '`!tmanage addadmin @رول` - إضافة أدمن تذاكر\n' +
          '`!tmanage removeadmin @رول` - إزالة أدمن\n' +
          '`!tmanage roles` - عرض الرولات\n' +
          '`!tmanage admins` - عرض الأدمنز\n' +
          '`!tmanage setlogs #قناة` - تعيين قناة اللوجس\n' +
          '`!tmanage setmention @رول` - تعيين رول للمنشن\n' +
          '`!tmanage mention` - عرض إعدادات المنشن', inline: false },
        { name: '🔒 التشفير', value:
          '`!shfr` - لوحة التشفير\n' +
          '`!enc [نص]` - تشفير نص مباشرة', inline: false },
        { name: '🛡️ الحماية', value:
          '`!protect` - لوحة الحماية\n' +
          '`!protect on filter` - تفعيل فلتر الكلمات\n' +
          '`!protect off filter` - تعطيل فلتر الكلمات\n' +
          '`!protect on spam` - تفعيل مضاد السبام\n' +
          '`!protect off spam` - تعطيل مضاد السبام\n' +
          '`!protect on link` - تفعيل منع الروابط\n' +
          '`!protect off link` - تعطيل منع الروابط', inline: false },
        { name: '📊 معلومات', value:
          '`!ping` - سرعة البوت', inline: false }
      )
      .setFooter({ text: 'Unit S Bot' })
      .setTimestamp();

    await message.channel.send({ embeds: [embed] });
    if (!message.deleted) message.delete().catch(() => {});
  },
});

// ============ PING COMMAND ============
client.commands.set('ping', {
  name: 'ping',
  description: 'Test bot latency',
  execute: async (message) => {
    const ping = Date.now() - message.createdTimestamp;
    const apiPing = client.ws.ping;

    const embed = new EmbedBuilder()
      .setTitle('🏓 Pong!')
      .setColor(COLORS.success)
      .addFields(
        { name: 'Latency', value: `${ping}ms`, inline: true },
        { name: 'API Ping', value: `${apiPing}ms`, inline: true }
      )
      .setTimestamp();

    await message.channel.send({ embeds: [embed] });
    if (!message.deleted) message.delete().catch(() => {});
  },
});

// ============ TICKET MENU (3 خيارات) ============
client.commands.set('ticket', {
  name: 'ticket',
  description: 'Open ticket menu',
  execute: async (message) => {
    const embed = new EmbedBuilder()
      .setTitle('🎫 نظام التذاكر')
      .setDescription('اختر نوع التذكرة من القائمة أدناه')
      .setColor(COLORS.primary)
      .addFields(
        { name: '📋 أنواع التذاكر:', value: '> **دعم فني** - للمشاكل التقنية\n> **الشكاوي** - للشكاوي ضد أعضاء\n> **استفسار** - لأسئلة عامة' },
        { name: '⚠️ ملاحظات:', value: '> **يمنع** فتح تذكرة لأسباب خارج السيرفر\n> **يمنع** Mention أو سبام للموظفين\n> **يمنع** العبث أو عدم النشاط في التذكرة\n> ⚠️ المخالفة قد تؤدي لـ Mute أو Timeout' }
      )
      .setFooter({ text: 'Unit S | اختر من القائمة' })
      .setTimestamp();

    const selectMenu = new SelectMenuBuilder()
      .setCustomId('ticket_select')
      .setPlaceholder('اختر نوع التذكرة...')
      .addOptions([
        new SelectMenuOptionBuilder({
          label: 'دعم فني',
          description: 'مشاكل تقنية وحلول',
          value: 'support',
          emoji: '🔧',
        }),
        new SelectMenuOptionBuilder({
          label: 'الشكاوي',
          description: 'شكاوي ضد أعضاء الإدارة',
          value: 'complaint',
          emoji: '🎧',
        }),
        new SelectMenuOptionBuilder({
          label: 'استفسار',
          description: 'أسئلة ومعلومات عامة',
          value: 'inquiry',
          emoji: '❓',
        }),
      ]);

    const row = new ActionRowBuilder().addComponents(selectMenu);
    // إرسال بدون mention - اللوحة فقط
    await message.reply({ embeds: [embed], components: [row] }).catch(() => {
      // إذا فشل Reply الأساسي
      message.channel.send({ embeds: [embed], components: [row] });
    });
  },
});

// ============ ENCRYPT PANEL COMMAND (!shfr) ============
client.commands.set('shfr', {
  name: 'shfr',
  description: 'Open encryption panel',
  execute: async (message) => {
    try {
      const embed = new EmbedBuilder()
        .setTitle('~ Unit S | التشفير')
        .setDescription('لتشفير منشورك، اضغط على الزر أدناه')
        .setColor(COLORS.primary)
        .addFields(
          { name: '✨ المميزات:', value: '• تشفير الكلمات المحظورة\n• يعمل بكفاءة عالية\n• آمن وسريع', inline: false }
        )
        .setFooter({ text: 'Unit S | للتشفير اضغط الزر' })
        .setTimestamp();

      const encryptButton = new ButtonBuilder()
        .setCustomId('shfr_post')
        .setLabel('شفر منشورك')
        .setStyle(ButtonStyle.Secondary);

      const row = new ActionRowBuilder().addComponents(encryptButton);
      await message.reply({ embeds: [embed], components: [row] });
    } catch (error) {
      console.error('shfr command error:', error);
      try {
        const embed = new EmbedBuilder()
          .setTitle('~ Unit S | التشفير')
          .setDescription('لتشفير منشورك، اضغط على الزر أدناه')
          .setColor(COLORS.primary)
          .addFields(
            { name: '✨ المميزات:', value: '• تشفير الكلمات المحظورة\n• يعمل بكفاءة عالية\n• آمن وسريع', inline: false }
          )
          .setFooter({ text: 'Unit S | للتشفير اضغط الزر' })
          .setTimestamp();

        const encryptButton = new ButtonBuilder()
          .setCustomId('shfr_post')
          .setLabel('شفر منشورك')
          .setStyle(ButtonStyle.Secondary);

        const row = new ActionRowBuilder().addComponents(encryptButton);
        await message.channel.send({ embeds: [embed], components: [row] });
      } catch (sendError) {
        console.error('Fallback send error:', sendError);
      }
    }
  },
});

// ============ ENCRYPT COMMAND (!enc) ============
client.commands.set('enc', {
  name: 'enc',
  description: 'Encrypt text directly',
  execute: async (message, args) => {
    if (args.length === 0) {
      await message.channel.send('❌ استخدم: `!enc [النص]`');
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    const text = args.join(' ');
    const encrypted = encryptText(text);

    const embed = new EmbedBuilder()
      .setTitle('🔒 تم تشفير النص!')
      .setColor(COLORS.success)
      .addFields(
        { name: 'النص الأصلي:', value: `\`\`\`\n${text}\n\`\`\`` },
        { name: 'النص المشفر:', value: `\`\`\`\n${encrypted}\n\`\`\`` }
      )
      .setFooter({ text: 'Unit S | التشفير' });

    await message.channel.send({ embeds: [embed] });
    if (!message.deleted) message.delete().catch(() => {});
  },
});

// ============ PROTECTION MENU ============
client.commands.set('protect', {
  name: 'protect',
  description: 'Protection control panel',
  execute: async (message) => {
    if (!message.member.permissions.has('ManageMessages')) {
      await message.channel.send('❌ ليس لديك صلاحية!');
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    const wordFilterStatus = protectionSettings.wordFilter.enabled ? '✅ مفعّل' : '❌ معطّل';
    const antiSpamStatus = protectionSettings.antiSpam.enabled ? '✅ مفعّل' : '❌ معطّل';
    const antiLinkStatus = protectionSettings.antiLink.enabled ? '✅ مفعّل' : '❌ معطّل';

    const embed = new EmbedBuilder()
      .setTitle('🛡️ لوحة التحكم - الحماية')
      .setColor(COLORS.primary)
      .addFields(
        { name: 'حالة الحماية:', value: '━━━━━━━━━━━━━━━', inline: false },
        { name: '🔤 فلتر الكلمات:', value: wordFilterStatus, inline: true },
        { name: '🛑 مضاد السبام:', value: antiSpamStatus, inline: true },
        { name: '🔗 منع الروابط:', value: antiLinkStatus, inline: true },
        { name: '\n📝 الأوامر:', value: '━━━━━━━━━━━━━━━', inline: false },
        { name: '', value: '`!protect on filter` - تفعيل فلتر الكلمات\n`!protect off filter` - تعطيل فلتر الكلمات\n`!protect on spam` - تفعيل مضاد السبام\n`!protect off spam` - تعطيل مضاد السبام\n`!protect on link` - تفعيل منع الروابط\n`!protect off link` - تعطيل منع الروابط', inline: false }
      )
      .setFooter({ text: 'Unit S | الإدارة' })
      .setTimestamp();

    await message.channel.send({ embeds: [embed] });
    if (!message.deleted) message.delete().catch(() => {});
  },
});

// ============ PROTECTION TOGGLE COMMAND ============
client.commands.set('protect_toggle', {
  name: 'protect',
  aliases: ['p'],
  execute: async (message, args) => {
    if (!message.member.permissions.has('ManageMessages')) {
      await message.channel.send('❌ ليس لديك صلاحية!');
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    if (args.length < 2) {
      await message.channel.send('❌ استخدم: `!protect on/off [filter/spam/link]`');
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    const action = args[0].toLowerCase();
    const type = args[1].toLowerCase();

    if (!['on', 'off'].includes(action)) {
      await message.channel.send('❌ استخدم: `!protect on/off [filter/spam/link]`');
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    const enable = action === 'on';
    let updated = false;
    let featureName = '';

    switch (type) {
      case 'filter':
      case 'word':
        protectionSettings.wordFilter.enabled = enable;
        updated = true;
        featureName = 'فلتر الكلمات';
        break;
      case 'spam':
      case 'antispam':
        protectionSettings.antiSpam.enabled = enable;
        updated = true;
        featureName = 'مضاد السبام';
        break;
      case 'link':
      case 'antilink':
        protectionSettings.antiLink.enabled = enable;
        updated = true;
        featureName = 'منع الروابط';
        break;
      default:
        await message.channel.send('❌ نوع غير صالح! استخدم: `filter`, `spam`, `link`');
        if (!message.deleted) message.delete().catch(() => {});
        return;
    }

    if (updated) {
      await message.channel.send(`🛡️ تم ${enable ? 'تفعيل' : 'تعطيل'} ${featureName}!`);
      if (!message.deleted) message.delete().catch(() => {});
    }
  },
});

// ============ TICKET MANAGER COMMAND ============
client.commands.set('tmanage', {
  name: 'tmanage',
  description: 'Manage tickets (admin only)',
  execute: async (message, args) => {
    if (!message.member.permissions.has('ManageChannels')) {
      await message.channel.send('❌ ليس لديك صلاحية!');
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    if (args.length === 0) {
      // عرض قائمة التذاكر المفتوحة
      const tickets = message.guild.channels.cache.filter(ch => ch.name.startsWith('ticket-'));

      if (tickets.size === 0) {
        await message.channel.send('📭 لا توجد تذاكر مفتوحة حالياً!');
        if (!message.deleted) message.delete().catch(() => {});
        return;
      }

      let ticketList = '';
      tickets.forEach((ch, i) => {
        const topic = ch.topic || 'بدون وصف';
        ticketList += `**${i + 1}.** ${ch.name} - ${topic}\n`;
      });

      const embed = new EmbedBuilder()
        .setTitle('🎫 قائمة التذاكر المفتوحة')
        .setColor(COLORS.primary)
        .setDescription(ticketList)
        .setFooter({ text: `عدد التذاكر: ${tickets.size}` })
        .setTimestamp();

      await message.channel.send({ embeds: [embed] });
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    const action = args[0].toLowerCase();

    if (action === 'close') {
      // التحقق من صلاحية المستخدم
      if (!hasTicketAdminRole(message.member)) {
        await message.channel.send('❌ ليس لديك صلاحية لإغلاق التذاكر!');
        if (!message.deleted) message.delete().catch(() => {});
        return;
      }

      if (message.channel.name.startsWith('ticket-')) {
        // حفظ اللوجس قبل حذف القناة
        await logTicketTranscript(message.channel, message.author, 'تم الإغلاق بأمر !tmanage close');

        await message.channel.send('🔒 جاري إغلاق التذكرة...');
        setTimeout(() => message.channel.delete(), 1000);
      } else {
        await message.channel.send('❌ هذا الأمر يُستخدم داخل قناة تذكرة فقط!');
        if (!message.deleted) message.delete().catch(() => {});
      }
    }

    // أمر إضافة رول
    if (action === 'addrole') {
      const role = message.mentions.roles.first();
      if (!role) {
        await message.channel.send('❌ استخدم: `!tmanage addrole @رول`');
        if (!message.deleted) message.delete().catch(() => {});
        return;
      }

      if (!ticketSettings.allowedRoles.includes(role.id)) {
        ticketSettings.allowedRoles.push(role.id);
        await message.channel.send(`✅ تم إضافة الرول ${role.name} لقائمة المستلمين!`);
      } else {
        await message.channel.send('⚠️ الرول موجودة مسبقاً!');
      }
      if (!message.deleted) message.delete().catch(() => {});
    }

    // أمر إزالة رول
    if (action === 'removerole') {
      const role = message.mentions.roles.first();
      if (!role) {
        await message.channel.send('❌ استخدم: `!tmanage removerole @رول`');
        if (!message.deleted) message.delete().catch(() => {});
        return;
      }

      const index = ticketSettings.allowedRoles.indexOf(role.id);
      if (index > -1) {
        ticketSettings.allowedRoles.splice(index, 1);
        await message.channel.send(`✅ تم إزالة الرول ${role.name} من قائمة المستلمين!`);
      } else {
        await message.channel.send('⚠️ الرول غير موجودة في القائمة!');
      }
      if (!message.deleted) message.delete().catch(() => {});
    }

    // أمر عرض الرولات
    if (action === 'roles') {
      let rolesList = '📋 الرولات المسموحة:\n\n';

      if (ticketSettings.allowedRoles.length === 0) {
        rolesList += 'لا توجد رولات مضافة حالياً.';
      } else {
        for (const roleId of ticketSettings.allowedRoles) {
          const role = message.guild.roles.cache.get(roleId);
          rolesList += `• ${role ? role.name : 'رول محذوفة'}\n`;
        }
      }

      if (ticketSettings.allowedRoleNames.length > 0) {
        rolesList += '\n📝 الرولات المسموحة بالأسماء:\n';
        for (const roleName of ticketSettings.allowedRoleNames) {
          rolesList += `• ${roleName}\n`;
        }
      }

      await message.channel.send(rolesList);
      if (!message.deleted) message.delete().catch(() => {});
    }

    // أمر إضافة رول أدمن للتذكرة
    if (action === 'addadmin') {
      const role = message.mentions.roles.first();
      if (!role) {
        await message.channel.send('❌ استخدم: `!tmanage addadmin @رول`');
        if (!message.deleted) message.delete().catch(() => {});
        return;
      }

      if (!ticketSettings.ticketAdminRoles.includes(role.id)) {
        ticketSettings.ticketAdminRoles.push(role.id);
        await message.channel.send(`✅ تم إضافة الرول ${role.name} كأدمن للتذاكر!`);
      } else {
        await message.channel.send('⚠️ الرول موجودة مسبقاً كأدمن!');
      }
      if (!message.deleted) message.delete().catch(() => {});
    }

    // أمر إزالة رول أدمن للتذكرة
    if (action === 'removeadmin') {
      const role = message.mentions.roles.first();
      if (!role) {
        await message.channel.send('❌ استخدم: `!tmanage removeadmin @رول`');
        if (!message.deleted) message.delete().catch(() => {});
        return;
      }

      const index = ticketSettings.ticketAdminRoles.indexOf(role.id);
      if (index > -1) {
        ticketSettings.ticketAdminRoles.splice(index, 1);
        await message.channel.send(`✅ تم إزالة الرول ${role.name} من أدمن التذاكر!`);
      } else {
        await message.channel.send('⚠️ الرول غير موجودة كأدمن!');
      }
      if (!message.deleted) message.delete().catch(() => {});
    }

    // أمر إضافة رول أدمن بالاسم
    if (action === 'addadminname') {
      const roleName = args.slice(1).join(' ');
      if (!roleName) {
        await message.channel.send('❌ استخدم: `!tmanage addadminname [اسم الرول]`');
        if (!message.deleted) message.delete().catch(() => {});
        return;
      }

      if (!ticketSettings.ticketAdminRoleNames.includes(roleName)) {
        ticketSettings.ticketAdminRoleNames.push(roleName);
        await message.channel.send(`✅ تم إضافة "${roleName}" كأدمن للتذاكر!`);
      } else {
        await message.channel.send('⚠️ الاسم موجود مسبقاً!');
      }
      if (!message.deleted) message.delete().catch(() => {});
    }

    // أمر إضافة رول استلام بالتحديد
    if (action === 'addrolename') {
      const roleName = args.slice(1).join(' ');
      if (!roleName) {
        await message.channel.send('❌ استخدم: `!tmanage addrolename [اسم الرول]`');
        if (!message.deleted) message.delete().catch(() => {});
        return;
      }

      if (!ticketSettings.allowedRoleNames.includes(roleName)) {
        ticketSettings.allowedRoleNames.push(roleName);
        await message.channel.send(`✅ تم إضافة "${roleName}" لقائمة المستلمين!`);
      } else {
        await message.channel.send('⚠️ الاسم موجود مسبقاً!');
      }
      if (!message.deleted) message.delete().catch(() => {});
    }

    // أمر وضع قناة اللوجس
    if (action === 'setlogs') {
      const channel = message.mentions.channels.first();
      if (!channel) {
        await message.channel.send('❌ استخدم: `!tmanage setlogs #قناة`');
        if (!message.deleted) message.delete().catch(() => {});
        return;
      }

      ticketSettings.logsChannelId = channel.id;
      await message.channel.send(`✅ تم تعيين قناة اللوجس: ${channel.name}`);
      if (!message.deleted) message.delete().catch(() => {});
    }

    // أمر تعيين رول للمنشن التلقائي
    if (action === 'setmention') {
      const role = message.mentions.roles.first();
      if (!role) {
        await message.channel.send('❌ استخدم: `!tmanage setmention @رول`');
        if (!message.deleted) message.delete().catch(() => {});
        return;
      }

      ticketSettings.mentionRoleId = role.id;
      ticketSettings.mentionRoleName = null; // مسح الاسم إذا تم تحديد الرول
      await message.channel.send(`✅ تم تعيين الرول ${role.name} للمنشن التلقائي!`);
      if (!message.deleted) message.delete().catch(() => {});
    }

    // أمر تعيين رول للمنشن التلقائي بالاسم
    if (action === 'setmentionname') {
      const roleName = args.slice(1).join(' ');
      if (!roleName) {
        await message.channel.send('❌ استخدم: `!tmanage setmentionname [اسم الرول]`');
        if (!message.deleted) message.delete().catch(() => {});
        return;
      }

      // البحث عن الرول
      const role = message.guild.roles.cache.find(r =>
        r.name.toLowerCase().includes(roleName.toLowerCase())
      );

      if (!role) {
        await message.channel.send(`❌ لم يتم العثور على رول تحتوي على: "${roleName}"`);
        if (!message.deleted) message.delete().catch(() => {});
        return;
      }

      ticketSettings.mentionRoleId = null; // مسح الـ ID
      ticketSettings.mentionRoleName = roleName;
      await message.channel.send(`✅ تم تعيين "${roleName}" للمنشن التلقائي! (الرول: ${role.name})`);
      if (!message.deleted) message.delete().catch(() => {});
    }

    // أمر عرض إعدادات المنشن
    if (action === 'mention') {
      let mentionInfo = '🎯 إعدادات المنشن التلقائي:\n\n';

      if (ticketSettings.mentionRoleId) {
        const role = message.guild.roles.cache.get(ticketSettings.mentionRoleId);
        mentionInfo += `📌 الرول: ${role ? role.name : 'محذوفة'}\n`;
        mentionInfo += `🔢 ID: ${ticketSettings.mentionRoleId}\n`;
      } else if (ticketSettings.mentionRoleName) {
        const role = message.guild.roles.cache.find(r =>
          r.name.toLowerCase().includes(ticketSettings.mentionRoleName.toLowerCase())
        );
        mentionInfo += `📌 الرول: ${role ? role.name : 'غير موجودة'}\n`;
        mentionInfo += `📝 الاسم: "${ticketSettings.mentionRoleName}"\n`;
      } else {
        mentionInfo += '⚠️ لم يتم تعيين رول للمنشن التلقائي.\n';
        mentionInfo += 'استخدم: `!tmanage setmention @رول` أو `!tmanage setmentionname [اسم]`';
      }

      await message.channel.send(mentionInfo);
      if (!message.deleted) message.delete().catch(() => {});
    }

    // أمر عرض الأدمنز
    if (action === 'admins') {
      let adminsList = '👮 أدمنز التذاكر:\n\n';

      // عرض الأدمنز من الـ IDs
      if (ticketSettings.ticketAdminRoles.length === 0) {
        adminsList += 'لا توجد أدمنز مضافين.\n';
      } else {
        for (const roleId of ticketSettings.ticketAdminRoles) {
          const role = message.guild.roles.cache.get(roleId);
          adminsList += `• ${role ? role.name : 'رول محذوفة'}\n`;
        }
      }

      // عرض الأدمنز من الأسماء
      if (ticketSettings.ticketAdminRoleNames.length > 0) {
        adminsList += '\n📝 بالأسماء:\n';
        for (const roleName of ticketSettings.ticketAdminRoleNames) {
          adminsList += `• ${roleName}\n`;
        }
      }

      // عرض قناة اللوجس
      if (ticketSettings.logsChannelId) {
        const logsChannel = message.guild.channels.cache.get(ticketSettings.logsChannelId);
        adminsList += `\n📋 قناة اللوجس: ${logsChannel ? logsChannel.name : 'محذوفة'}`;
      } else {
        adminsList += '\n📋 قناة اللوجس: غير محددة';
      }

      await message.channel.send(adminsList);
      if (!message.deleted) message.delete().catch(() => {});
    }
  },
});

// ============ INTERACTION HANDLER ============
client.on('interactionCreate', async (interaction) => {
  try {
    // Handle Select Menu
    if (interaction.isSelectMenu()) {
      if (interaction.customId === 'ticket_select') {
        const ticketType = interaction.values[0];

        const typeNames = {
          support: 'دعم فني',
          complaint: 'شكاوي',
          inquiry: 'استفسار'
        };

        const guild = interaction.guild;

        try {
          // الحصول على بيانات الأدوار
          const adminRole = guild.roles.cache.find(role =>
            role.name.toLowerCase().includes('admin') ||
            role.name.toLowerCase().includes('support') ||
            role.permissions.has('ManageChannels')
          );

          const adminRoleId = process.env.ADMIN_ROLE_ID || adminRole?.id;

          // التحقق من وجود البوت في السيرفر
          const botMember = await guild.members.fetch(client.user.id);
          if (!botMember.permissions.has('ManageChannels')) {
            return await interaction.reply({
              content: '❌ لا توجد لدي الصلاحية اللازمة لإنشاء قناة!',
              ephemeral: true
            });
          }

          // الحصول على عدد التذاكر الحالية لهذا المستخدم
          const existingTickets = guild.channels.cache.filter(ch =>
            ch.name.startsWith('ticket-') &&
            ch.topic?.includes(interaction.user.username)
          );

          if (existingTickets.size > 0) {
            const existingTicket = existingTickets.first();
            return await interaction.reply({
              content: `❌ لديك تذكرة مفتوحة بالفعل!\n${existingTicket.toString()}`,
              ephemeral: true
            });
          }

          // الحصول على عدد التذاكر الحالية و إنشاء رقم فريد
          const existingTicketCount = guild.channels.cache.filter(ch =>
            ch.name.startsWith('ticket-')
          ).size;

          const ticketNum = String(existingTicketCount + 1).padStart(3, '0');
          const channelName = `ticket-${ticketNum}`;

          const closeButton = new ButtonBuilder()
            .setCustomId('close_ticket')
            .setLabel('إغلاق التذكرة')
            .setStyle(ButtonStyle.Danger);

          const row = new ActionRowBuilder().addComponents(closeButton);

          // تحديد من يستلم الإشعار
          const mentionedRoles = [];
          const permissionOverwrites = [
            { id: guild.id, deny: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] },
            { id: interaction.user.id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'AttachFiles'] },
          ];

          // إضافة الرولات المسموحة من الـ Role IDs
          if (ticketSettings.allowedRoles.length > 0) {
            for (const roleId of ticketSettings.allowedRoles) {
              const role = guild.roles.cache.get(roleId);
              if (role) {
                permissionOverwrites.push({
                  id: roleId,
                  allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'AttachFiles']
                });
                mentionedRoles.push(role);
              }
            }
          }

          // إضافة الرولات المسموحة من الأسماء
          if (ticketSettings.allowedRoleNames.length > 0) {
            for (const roleName of ticketSettings.allowedRoleNames) {
              const role = guild.roles.cache.find(r =>
                r.name.toLowerCase().includes(roleName.toLowerCase())
              );
              if (role && !mentionedRoles.includes(role)) {
                permissionOverwrites.push({
                  id: role.id,
                  allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'AttachFiles']
                });
                mentionedRoles.push(role);
              }
            }
          }

          const ticketChannel = await guild.channels.create({
            name: channelName,
            type: 0, // GUILD_TEXT
            topic: `🎫 تذكرة ${typeNames[ticketType]} | المستخدم: ${interaction.user.tag}`,
            permissionOverwrites: permissionOverwrites,
          });

          const embed = new EmbedBuilder()
            .setTitle(`🎫 تذكرة #${ticketNum}`)
            .setColor(COLORS.primary)
            .addFields(
              { name: 'نوع التذكرة:', value: typeNames[ticketType], inline: true },
              { name: 'صاحب التذكرة:', value: interaction.user.username, inline: true },
              { name: 'تاريخ الإنشاء:', value: new Date().toLocaleString('ar-SA'), inline: false },
              { name: '⚠️ تنبيه:', value: 'يمكنك فتح **تذكرة واحدة فقط**!\nلفتح تذكرة جديدة، أغلق الحالية أولاً.', inline: false }
            )
            .setDescription(`> مرحباً!\n> ${interaction.user} فتح تذكرة جديدة\n> اكتب سبب التذكرة وانتظر الرد\n> ⚠️ لا تقم بإغلاق هذه القناة بنفسك`);

          // بناء محتوى الإشعار مع mentioning الرولات
          let channelContent = interaction.user.toString();

          // منشن الرول المحددة تلقائيا
          if (ticketSettings.mentionRoleId || ticketSettings.mentionRoleName) {
            let autoMentionRole = null;

            if (ticketSettings.mentionRoleId) {
              autoMentionRole = guild.roles.cache.get(ticketSettings.mentionRoleId);
            }

            if (!autoMentionRole && ticketSettings.mentionRoleName) {
              autoMentionRole = guild.roles.cache.find(r =>
                r.name.toLowerCase().includes(ticketSettings.mentionRoleName.toLowerCase())
              );
            }

            if (autoMentionRole) {
              channelContent += ' ' + autoMentionRole.toString();
            }
          }

          // إضافة الرولات المسموحة من الأسماء إذا موجودة
          if (mentionedRoles.length > 0) {
            channelContent += ' ' + mentionedRoles.map(r => r.toString()).join(' ');
          }

          await ticketChannel.send({
            content: channelContent,
            embeds: [embed],
            components: [row]
          });

          await interaction.reply({
            content: `✅ تم إنشاء التذكرة #${ticketNum} بنجاح! <#${ticketChannel.id}>`,
            ephemeral: true
          });

        } catch (error) {
          console.error('Ticket creation error:', error);
          await interaction.reply({
            content: `❌ حدث خطأ أثناء إنشاء التذكرة!\nالخطأ: \`${error.message}\``,
            ephemeral: true
          });
        }
      }
    }

    // Handle Button
    if (interaction.isButton()) {
      if (interaction.customId === 'close_ticket') {
        // التحقق من صلاحية المستخدم
        if (!hasTicketAdminRole(interaction.member)) {
          return await interaction.reply({
            content: '❌ ليس لديك صلاحية لإغلاق هذه التذكرة!',
            ephemeral: true
          });
        }

        const channel = interaction.channel;

        // حفظ اللوجس قبل حذف القناة
        await logTicketTranscript(channel, interaction.user, 'تم الإغلاق من زر');

        // حذف القناة
        await interaction.reply('🔒 جاري إغلاق التذكرة...');
        setTimeout(() => channel.delete(), 1000);
      }

      // Encryption Button
      if (interaction.customId === 'shfr_post') {
        const modal = new ModalBuilder()
          .setCustomId('shfr_modal')
          .setTitle('🔒 تشفير المنشور');

        const textInput = new TextInputBuilder()
          .setCustomId('shfr_text')
          .setLabel('يرجى وضع منشورك هنا')
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder('اكتب النص هنا...')
          .setRequired(true)
          .setMaxLength(4000);

        const actionRow = new ActionRowBuilder().addComponents(textInput);
        modal.addComponents(actionRow);

        await interaction.showModal(modal);
      }
    }

    // Handle Modal Submit
    if (interaction.isModalSubmit()) {
      if (interaction.customId === 'shfr_modal') {
        const text = interaction.fields.getTextInputValue('shfr_text');
        const encrypted = encryptText(text);

        const embed = new EmbedBuilder()
          .setTitle('🔒 تم تشفير النص!')
          .setColor(COLORS.success)
          .addFields(
            { name: 'منشورك بعد تشفير:', value: `\`\`\`\n${encrypted}\n\`\`\`` }
          )
          .setFooter({ text: 'Unit S | التشفير' })
          .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
      }
    }
  } catch (error) {
    console.error('Interaction error:', error);
    if (interaction.isRepliable()) {
      await interaction.reply({ content: '❌ حدث خطأ!', ephemeral: true }).catch(() => {});
    }
  }
});

// ============ MESSAGE COMMANDS ============
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  if (commandName === 'protect' && args.length > 0) {
    const protectCmd = client.commands.get('protect_toggle');
    if (protectCmd) {
      await protectCmd.execute(message, args);
      return;
    }
  }

  const cmd = client.commands.get(commandName);
  if (cmd) {
    try {
      await cmd.execute(message, args);
    } catch (error) {
      console.error(`Command error (${commandName}):`, error);
      await message.reply({ content: '❌ حدث خطأ أثناء تنفيذ الأمر!' }).catch(() => {});
    }
  }
});

// ============ ENCRYPT FUNCTION ============
function encryptText(text) {
  let result = text;

  // Sort words by length (longest first) to avoid partial replacements
  const sortedWords = Object.keys(wordDictionary).sort((a, b) => b.length - a.length);

  for (const word of sortedWords) {
    const regex = new RegExp(word, 'gi');
    result = result.replace(regex, wordDictionary[word]);
  }

  return result;
}

// ============ PROTECTION SYSTEM ============

// Word Filter
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!protectionSettings.wordFilter.enabled) return;
  if (!message.guild) return;
  if (message.member?.permissions.has('ManageMessages')) return;

  const content = message.content.toLowerCase();
  const foundWords = protectionSettings.wordFilter.words.filter(word =>
    content.includes(word.toLowerCase())
  );

  if (foundWords.length > 0) {
    await message.delete();

    // Mute user for 5 minutes
    try {
      await message.member.timeout(5 * 60 * 1000); // 5 minutes

      const embed = new EmbedBuilder()
        .setTitle('⚠️ تنبيه!')
        .setDescription(`تم حذف رسالتك لأنها تحتوي على كلمات ممنوعة!\nتم كتمك لمدة **5 دقائق**\n\n⚠️ هذه الرسالة مرئية لك فقط!`)
        .setColor(COLORS.warning)
        .setTimestamp();

      // إرسال DM للشخص المعني فقط (لا يراها غيره)
      await message.author.send({ embeds: [embed] }).catch(() => {});

      const logChannel = message.guild?.channels.cache.find(ch => ch.name === 'logs');
      if (logChannel) {
        logChannel.send(`🛡️ [Word Filter] ${message.author.tag} استخدم كلمات ممنوعة: ${foundWords.join(', ')} - تم كتمه 5 دقائق`);
      }
    } catch (err) {
      console.error('Word Filter Mute error:', err);
    }
  }
});

// Anti-Spam
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!protectionSettings.antiSpam.enabled) return;
  if (!message.guild) return;
  if (message.member?.permissions.has('ManageMessages')) return;

  const userId = message.author.id;
  const now = Date.now();

  if (!antiSpamTracker.has(userId)) {
    antiSpamTracker.set(userId, { messages: [], mentions: 0, emojis: 0 });
  }

  const userData = antiSpamTracker.get(userId);
  userData.messages.push(now);

  const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
  userData.emojis += (message.content.match(emojiRegex) || []).length;
  userData.mentions += message.mentions.users.size;
  userData.messages = userData.messages.filter(time => now - time < protectionSettings.antiSpam.timeWindow);

  if (userData.messages.length > protectionSettings.antiSpam.maxMessages ||
      userData.mentions > protectionSettings.antiSpam.maxMentions ||
      userData.emojis > protectionSettings.antiSpam.maxEmojis) {

    await message.delete();

    // Mute user for 5 minutes
    try {
      await message.member.timeout(5 * 60 * 1000); // 5 minutes

      const embed = new EmbedBuilder()
        .setTitle('🔇 تم كتمك!')
        .setDescription(`تم حذف رسالتك بسبب السبام!\nتم كتمك لمدة **5 دقائق**\nReason: Spam detected\n\n⚠️ هذه الرسالة مرئية لك فقط!`)
        .setColor(COLORS.danger)
        .setTimestamp();

      // إرسال DM للشخص المعني فقط (لا يراها غيره)
      await message.author.send({ embeds: [embed] }).catch(() => {});

      const logChannel = message.guild?.channels.cache.find(ch => ch.name === 'logs');
      if (logChannel) {
        logChannel.send(`🛡️ [Anti-Spam] ${message.author.tag} تم كتمه لمدة 5 دقائق - Spam detected`);
      }
    } catch (err) {
      console.error('Mute error:', err);
    }
  }
});

// Anti-Link (حظر جميع الروابط)
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!protectionSettings.antiLink.enabled) return;
  if (!message.guild) return;
  if (message.member?.permissions.has('ManageMessages')) return;

  const content = message.content.toLowerCase();
  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  const urls = content.match(urlRegex) || [];

  if (urls.length > 0) {
    await message.delete();

    // Mute user for 5 minutes
    try {
      await message.member.timeout(5 * 60 * 1000); // 5 minutes

      const embed = new EmbedBuilder()
        .setTitle('🔇 تم كتمك!')
        .setDescription(`تم حذف رسالتك لإرسال رابط!\nتم كتمك لمدة **5 دقائق**\nReason: Posting links is not allowed\n\n⚠️ هذه الرسالة مرئية لك فقط!`)
        .setColor(COLORS.danger)
        .setTimestamp();

      // إرسال DM للشخص المعني فقط (لا يراها غيره)
      await message.author.send({ embeds: [embed] }).catch(() => {});

      const logChannel = message.guild?.channels.cache.find(ch => ch.name === 'logs');
      if (logChannel) {
        logChannel.send(`🛡️ [Anti-Link] ${message.author.tag} تم كتمه لمدة 5 دقائق - أرسل رابط`);
      }
    } catch (err) {
      console.error('Anti-Link Mute error:', err);
    }
  }
});

// ============ READY EVENT ============
client.on('ready', () => {
  console.log(`✅ Unit S Bot is online!`);
  console.log(`👤 Logged as: ${client.user.tag}`);
  console.log(`📊 Servers: ${client.guilds.cache.size}`);
  client.user.setActivity('Unit S | !help', { type: 'WATCHING' });
});

// ============ ERROR HANDLER ============
client.on('error', (error) => {
  console.error('Bot Error:', error);
});

// ============ LOGIN ============
client.login(TOKEN);

export default client;