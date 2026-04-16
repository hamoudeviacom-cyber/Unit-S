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

// ============ Protection Settings (Saved in memory) ============
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
      .setTitle('📚 Viper S - Commands List')
      .setColor(COLORS.primary)
      .addFields(
        { name: '🎫 التذاكر', value: '`!ticket` - فتح قائمة التذاكر', inline: false },
        { name: '🔒 التشفير', value: '`!encrypt` - تشفير نص\n`!decrypt` - فك تشفير', inline: false },
        { name: '🛡️ الحماية', value: '`!protect` - لوحة الحماية', inline: false },
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

    // Create Select Menu - 3 خيارات فقط
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

    await message.reply({ embeds: [embed], components: [row] });
  },
});

// ============ PROTECTION MENU ============
client.commands.set('protect', {
  name: 'protect',
  description: 'Protection control panel',
  execute: async (message) => {
    // Check if user has admin permissions
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
    // Check if user has admin permissions
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
      const status = enable ? '✅ مفعّل' : '❌ معطّل';
      await message.reply(`🛡️ تم ${enable ? 'تفعيل' : 'تعطيل'} ${featureName}!`);
    }
  },
});

// ============ ENCRYPT COMMAND ============
client.commands.set('encrypt', {
  name: 'encrypt',
  description: 'Encrypt your post',
  execute: async (interaction) => {
    // Check if it's a slash command or message
    if (interaction.isCommand && interaction.isCommand()) {
      const modal = new ModalBuilder()
        .setCustomId('encrypt_modal')
        .setTitle('🔒 تشفير المنشور');

      const textInput = new TextInputBuilder()
        .setCustomId('encrypt_text')
        .setLabel('اكتب النص هنا')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('اكتب النص الذي تريد تشفيره...')
        .setRequired(true)
        .setMaxLength(4000);

      const actionRow = new ActionRowBuilder().addComponents(textInput);
      modal.addComponents(actionRow);

      await interaction.showModal(modal);
    }
  },
});

// ============ DECRYPT COMMAND ============
client.commands.set('decrypt', {
  name: 'decrypt',
  description: 'Decrypt your post',
  execute: async (message, args) => {
    if (args.length === 0) {
      return message.reply('❌ استخدم: `!decrypt [النص المشفر]`');
    }

    const encrypted = args.join(' ');
    const decrypted = decryptText(encrypted);

    const embed = new EmbedBuilder()
      .setTitle('🔓 فك التشفير')
      .setColor(COLORS.success)
      .addFields(
        { name: 'النص الأصلي:', value: `\`\`\`\n${decrypted}\n\`\`\`` }
      )
      .setFooter({ text: 'Viper S' });

    await message.reply({ embeds: [embed] });
  },
});

// ============ INTERACTION HANDLER ============
client.on('interactionCreate', async (interaction) => {
  try {
    // Handle Select Menu
    if (interaction.isSelectMenu()) {
      if (interaction.customId === 'ticket_select') {
        const ticketType = interaction.values[0];
        const ticketNum = Date.now().toString(36).slice(-6);
        const userName = interaction.user.username;

        // Ticket type names
        const typeNames = {
          support: 'دعم فني',
          complaint: 'شكاوي',
          inquiry: 'استفسار'
        };

        const channelName = `ticket-${ticketType}-${userName}`;

        const guild = interaction.guild;

        try {
          const ticketChannel = await guild.channels.create(channelName, {
            type: 'GUILD_TEXT',
            permissionOverwrites: [
              {
                id: guild.id,
                deny: ['ViewChannel', 'SendMessages'],
              },
              {
                id: interaction.user.id,
                allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'],
              },
              {
                id: process.env.ADMIN_ROLE_ID || 'ADMIN_ROLE_ID',
                allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'ManageChannels'],
              },
            ],
          });

          const embed = new EmbedBuilder()
            .setTitle(`🎫 تذكرة #${ticketNum}`)
            .setColor(COLORS.primary)
            .addFields(
              { name: 'النوع:', value: typeNames[ticketType], inline: true },
              { name: 'المستخدم:', value: interaction.user.username, inline: true },
              { name: 'تاريخ الإنشاء:', value: new Date().toLocaleString('ar-SA'), inline: false }
            )
            .setDescription(`> ${interaction.user} تم فتح تذكرة جديدة!`);

          const closeButton = new ButtonBuilder()
            .setCustomId('close_ticket')
            .setLabel('إغلاق التذكرة')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🔒');

          const row = new ActionRowBuilder().addComponents(closeButton);

          await ticketChannel.send({ content: `${interaction.user}`, embeds: [embed], components: [row] });
          await interaction.reply({ content: `✅ تم إنشاء التذكرة: ${ticketChannel}`, ephemeral: true });
        } catch (error) {
          console.error('Ticket creation error:', error);
          await interaction.reply({ content: '❌ حدث خطأ أثناء إنشاء التذكرة!', ephemeral: true });
        }
      }
    }

    // Handle Button
    if (interaction.isButton()) {
      if (interaction.customId === 'close_ticket') {
        await interaction.channel.delete();
      }
    }

    // Handle Modal Submit
    if (interaction.isModalSubmit()) {
      if (interaction.customId === 'encrypt_modal') {
        const text = interaction.fields.getTextInputValue('encrypt_text');
        const encrypted = encryptText(text);

        client.encryptedPosts.set(interaction.user.id, encrypted);

        const embed = new EmbedBuilder()
          .setTitle('🔒 تم تشفير النص!')
          .setColor(COLORS.success)
          .addFields(
            { name: 'النص الأصلي:', value: `\`\`\`\n${text.slice(0, 100)}${text.length > 100 ? '...' : ''}\n\`\`\``, inline: false },
            { name: 'النص المشفر:', value: `\`\`\`\n${encrypted}\n\`\`\``, inline: false }
          )
          .setFooter({ text: 'استخدم !decrypt لفك التشفير' });

        await interaction.reply({ embeds: [embed], ephemeral: true });
      }
    }

    // Handle Slash Commands
    if (interaction.isCommand() && interaction.isCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (command) {
        await command.execute(interaction);
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

  // Handle protect command with args (toggle)
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
      // Check if it's a slash command style (interaction)
      if (cmd.name === 'encrypt') {
        await cmd.execute(message);
      } else {
        await cmd.execute(message, args);
      }
    } catch (error) {
      console.error('Command error:', error);
      await message.reply('❌ حدث خطأ أثناء تنفيذ الأمر!');
    }
  }
});

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

    // Log to channel if exists
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
    antiSpamTracker.set(userId, {
      messages: [],
      mentions: 0,
      emojis: 0,
    });
  }

  const userData = antiSpamTracker.get(userId);
  userData.messages.push(now);

  // Count emojis
  const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
  userData.emojis += (message.content.match(emojiRegex) || []).length;

  // Count mentions
  userData.mentions += message.mentions.users.size;

  // Clean old messages
  userData.messages = userData.messages.filter(time => now - time < protectionSettings.antiSpam.timeWindow);

  // Check spam
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

// ============ UTILITY FUNCTIONS ============

function encryptText(text) {
  let encrypted = '';
  for (let i = 0; i < text.length; i++) {
    encrypted += String.fromCharCode(text.charCodeAt(i) + 3);
  }
  return Buffer.from(encrypted).toString('base64');
}

function decryptText(encrypted) {
  try {
    const decoded = Buffer.from(encrypted, 'base64').toString();
    let decrypted = '';
    for (let i = 0; i < decoded.length; i++) {
      decrypted += String.fromCharCode(decoded.charCodeAt(i) - 3);
    }
    return decrypted;
  } catch {
    return '❌ تعذر فك التشفير - النص غير صحيح';
  }
}

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
