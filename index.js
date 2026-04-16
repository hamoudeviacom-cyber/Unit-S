// Viper S - Discord Bot
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
});

// Collections
client.commands = new Collection();
client.encryptedPosts = new Collection();
client.ticketCounter = 0; // عداد التذاكر التسلسلي

// ============ Word Encryption Dictionary ============
const wordDictionary = {
  "بروجكتات": "بر9ـجكتات",
  "حسابات": "7ـسابات",
  "روبوكس": "ر9ـبوكس",
  "لايكات": "لايkات",
  "انستا": "انسtا",
  "اسعاري": "اسـ3ـاري",
  "كريدت": "كريDت",
  "اسياسيل": "اسeاسيل",
  "طريقة": "طريqة",
  "دفع": "دفـ3",
  "فوري": "فـ9ـري",
  "وسيط": "9ـسيط",
  "طلب": "tـلب",
  "استفسار": "استفسـ1ر",
  "تسليم": "تـ5ـليم",
  "طرق": "طرk",
  "يوتيوب": "يـ9ـتيوب",
  "جوجل": "جـ9ـجل",
  "جيملات": "جيـmـلات",
  "السوق": "الـ5ـوق",
  "نتفلكس": "نتفلـkـس",
  "ثمن": "ثـmـن",
  "كاش": "كـ1ش",
  "خاص": "خـ1ص"
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

// ============ HELP COMMAND ============
client.commands.set('help', {
  name: 'help',
  description: 'Show all commands',
  execute: async (message) => {
    const embed = new EmbedBuilder()
      .setTitle('📚 Viper S - قائمة الأوامر')
      .setColor(COLORS.primary)
      .addFields(
        { name: '🎫 التذاكر', value: '`!ticket` - فتح قائمة التذاكر\n`!tmanage` - إدارة التذاكر (للمشرفين)', inline: false },
        { name: '🔒 التشفير', value: '`!shfr` - لوحة التشفير\n`!enc [نص]` - تشفير نص', inline: false },
        { name: '🛡️ الحماية', value: '`!protect` - لوحة الحماية\n`!protect on/off [type]` - تفعيل/تعطيل', inline: false },
        { name: '━━━━━━━━━━━', value: '**أنواع الحماية:**\n`filter` - فلتر الكلمات\n`spam` - مضاد السبام\n`link` - منع الروابط', inline: false },
        { name: '📊 معلومات', value: '`!ping` - سرعة البوت', inline: false }
      )
      .setFooter({ text: 'Viper S Bot' })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
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

    await message.reply({ embeds: [embed] });
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
      .setFooter({ text: 'Viper S | اختر من القائمة' })
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
    const embed = new EmbedBuilder()
      .setTitle('~ Viper S | التشفير')
      .setDescription('لتشفير منشورك، اضغط على الزر أدناه')
      .setColor(COLORS.primary)
      .addFields(
        { name: '✨ المميزات:', value: '• تشفير الكلمات المحظورة\n• يعمل بكفاءة عالية\n• آمن وسريع', inline: false }
      )
      .setFooter({ text: 'Viper S | للتشفير اضغط الزر' })
      .setTimestamp();

    const encryptButton = new ButtonBuilder()
      .setCustomId('shfr_post')
      .setLabel('شفر منشورك')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('');

    const row = new ActionRowBuilder().addComponents(encryptButton);
    await message.reply({ embeds: [embed], components: [row] }).catch(() => {
      message.channel.send({ embeds: [embed], components: [row] });
    });
  },
});

// ============ ENCRYPT COMMAND (!enc) ============
client.commands.set('enc', {
  name: 'enc',
  description: 'Encrypt text directly',
  execute: async (message, args) => {
    if (args.length === 0) {
      return message.reply('❌ استخدم: `!enc [النص]`');
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
      .setFooter({ text: 'Viper S | التشفير' });

    await message.reply({ embeds: [embed] });
  },
});

// ============ PROTECTION MENU ============
client.commands.set('protect', {
  name: 'protect',
  description: 'Protection control panel',
  execute: async (message) => {
    if (!message.member.permissions.has('ManageMessages')) {
      return message.reply('❌ ليس لديك صلاحية!');
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
        { name: '', value: '`!protect on/off [type]`\n**الأنواع:** `filter`, `spam`, `link`\n**مثال:** `!protect off filter`', inline: false }
      )
      .setFooter({ text: 'Viper S | الإدارة' })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  },
});

// ============ PROTECTION TOGGLE COMMAND ============
client.commands.set('protect_toggle', {
  name: 'protect',
  aliases: ['p'],
  execute: async (message, args) => {
    if (!message.member.permissions.has('ManageMessages')) {
      return message.reply('❌ ليس لديك صلاحية!');
    }

    if (args.length < 2) {
      return message.reply('❌ استخدم: `!protect [on/off] [filter/spam/link]`');
    }

    const action = args[0].toLowerCase();
    const type = args[1].toLowerCase();

    if (!['on', 'off'].includes(action)) {
      return message.reply('❌ استخدم: `!protect [on/off] [filter/spam/link]`');
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
        return message.reply('❌ نوع غير صالح! استخدم: `filter`, `spam`, `link`');
    }

    if (updated) {
      await message.reply(`🛡️ تم ${enable ? 'تفعيل' : 'تعطيل'} ${featureName}!`);
    }
  },
});

// ============ TICKET MANAGER COMMAND ============
client.commands.set('tmanage', {
  name: 'tmanage',
  description: 'Manage tickets (admin only)',
  execute: async (message, args) => {
    if (!message.member.permissions.has('ManageChannels')) {
      return message.reply('❌ ليس لديك صلاحية!');
    }

    if (args.length === 0) {
      // عرض قائمة التذاكر المفتوحة
      const tickets = message.guild.channels.cache.filter(ch => ch.name.startsWith('ticket-'));

      if (tickets.size === 0) {
        return message.reply('📭 لا توجد تذاكر مفتوحة حالياً!');
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

      return message.reply({ embeds: [embed] });
    }

    const action = args[0].toLowerCase();

    if (action === 'close') {
      if (message.channel.name.startsWith('ticket-')) {
        await message.reply('🔒 جاري إغلاق التذكرة...');
        setTimeout(() => message.channel.delete(), 1000);
      } else {
        message.reply('❌ هذا الأمر يُستخدم داخل قناة تذكرة فقط!');
      }
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
            ch.topic?.includes(interaction.user.id)
          );

          if (existingTickets.size > 0) {
            return await interaction.reply({
              content: '❌ لديك تذكرة مفتوحة بالفعل!',
              ephemeral: true
            });
          }

          // الحصول على عدد التذاكر الحالية و إنشاء رقم فريد
          const existingTicketCount = guild.channels.cache.filter(ch =>
            ch.name.startsWith('ticket-')
          ).size;

          const ticketNum = String(existingTicketCount + 1).padStart(3, '0');
          const channelName = `ticket-${ticketNum}`;

          const ticketChannel = await guild.channels.create({
            name: channelName,
            type: 0, // GUILD_TEXT
            topic: `🎫 تذكرة ${typeNames[ticketType]} | المستخدم: ${interaction.user.tag}`,
            permissionOverwrites: [
              { id: guild.id, deny: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] },
              { id: interaction.user.id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'AttachFiles'] },
              ...(adminRoleId ? [{ id: adminRoleId, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'ManageChannels', 'AttachFiles'] }] : []),
            ],
          });

          const embed = new EmbedBuilder()
            .setTitle(`🎫 تذكرة #${ticketNum}`)
            .setColor(COLORS.primary)
            .addFields(
              { name: 'نوع التذكرة:', value: typeNames[ticketType], inline: true },
              { name: 'صاحب التذكرة:', value: interaction.user.username, inline: true },
              { name: 'تاريخ الإنشاء:', value: new Date().toLocaleString('ar-SA'), inline: false }
            )
            .setDescription(`> مرحباً ${interaction.user}!\n> اكتب سبب فتح التذكرة وانتظر الرد\n> ⚠️ لا تقم بإغلاق هذه القناة بنفسك`);

          const closeButton = new ButtonBuilder()
            .setCustomId('close_ticket')
            .setLabel('إغلاق التذكرة')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('');

          const row = new ActionRowBuilder().addComponents(closeButton);
          await ticketChannel.send({
            content: `${interaction.user}`,
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
        await interaction.channel.delete();
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
          .setFooter({ text: 'Viper S | التشفير' })
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
      console.error('Command error:', error);
      await message.reply({ content: '❌ حدث خطأ أثناء تنفيذ الأمر!', ephemeral: true }).catch(() => {});
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

  const content = message.content.toLowerCase();
  const foundWords = protectionSettings.wordFilter.words.filter(word =>
    content.includes(word.toLowerCase())
  );

  if (foundWords.length > 0) {
    await message.delete();

    const embed = new EmbedBuilder()
      .setTitle('⚠️ تنبيه!')
      .setDescription(`تم حذف رسالة ${message.author} لأنها تحتوي على كلمات ممنوعة!`)
      .setColor(COLORS.warning);

    await message.channel.send({ embeds: [embed] }).then(msg => {
      setTimeout(() => msg.delete(), 3000);
    });

    const logChannel = message.guild?.channels.cache.find(ch => ch.name === 'logs');
    if (logChannel) {
      logChannel.send(`🛡️ [Word Filter] ${message.author.tag} استخدم كلمات ممنوعة: ${foundWords.join(', ')}`);
    }
  }
});

// Anti-Spam
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!protectionSettings.antiSpam.enabled) return;
  if (!message.guild) return;

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
    await message.channel.send(`${message.author} تم حذف رسالتك بسبب السبام!`).then(msg => {
      setTimeout(() => msg.delete(), 3000);
    });

    const logChannel = message.guild.channels.cache.find(ch => ch.name === 'logs');
    if (logChannel) {
      logChannel.send(`🛡️ [Anti-Spam] ${message.author.tag} تم اكتشاف سبام`);
    }
  }
});

// Anti-Link
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!protectionSettings.antiLink.enabled) return;
  if (!message.guild) return;
  if (message.member?.permissions.has('ManageMessages')) return;

  const content = message.content.toLowerCase();
  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  const urls = content.match(urlRegex) || [];

  for (const url of urls) {
    try {
      const domain = new URL(url).hostname.replace('www.', '').toLowerCase();

      if (protectionSettings.antiLink.blacklistedDomains.some(d => domain.includes(d))) {
        await message.delete();

        const embed = new EmbedBuilder()
          .setTitle('🔗 رابط محظور!')
          .setDescription(`${message.author} لا يمكنك إرسال روابط من هذا الموقع!`)
          .setColor(COLORS.danger);

        await message.channel.send({ embeds: [embed] }).then(msg => {
          setTimeout(() => msg.delete(), 3000);
        });
        return;
      }
    } catch (e) {
      // Invalid URL
    }
  }
});

// ============ READY EVENT ============
client.on('ready', () => {
  console.log(`✅ Viper S Bot is online!`);
  console.log(`👤 Logged as: ${client.user.tag}`);
  console.log(`📊 Servers: ${client.guilds.cache.size}`);
  client.user.setActivity('Viper S | !help', { type: 'WATCHING' });
});

// ============ ERROR HANDLER ============
client.on('error', (error) => {
  console.error('Bot Error:', error);
});

// ============ LOGIN ============
client.login(TOKEN);

export default client;