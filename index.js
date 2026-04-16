// Viper S - Discord Bot
// نظام الحماية والتشفير وتذكرة بانيل

import { Client, GatewayIntentBits, Collection, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Bot Configuration
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
client.encryptedPosts = new Collection(); // Store encrypted posts temporarily

// Protection Settings
const protectionSettings = {
  wordFilter: {
    enabled: true,
    words: ['كلمة1', 'كلمة2', 'badword', 'spamword'],
    action: 'delete', // delete, warn, mute
  },
  antiSpam: {
    enabled: true,
    maxMentions: 3,
    maxEmojis: 10,
    maxMessages: 5,
    timeWindow: 5000, // 5 seconds
  },
  antiLink: {
    enabled: true,
    blacklistedDomains: ['discord.gg', 'bit.ly', 'tinyurl.com'],
    whitelistedDomains: ['youtube.com', 'twitch.tv'],
  },
};

// ============ COMMAND HANDLERS ============

// Ping Command
client.commands.set('ping', {
  name: 'ping',
  description: 'Test bot latency',
  execute: async (message) => {
    const ping = Date.now() - message.createdTimestamp;
    const apiPing = client.ws.ping;

    const embed = new EmbedBuilder()
      .setTitle('🏓 Pong!')
      .setColor(0x667eea)
      .addFields(
        { name: 'Latency', value: `${ping}ms`, inline: true },
        { name: 'API Ping', value: `${apiPing}ms`, inline: true }
      )
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  },
});

// ============ TICKET SYSTEM ============

// Create Ticket Panel
client.commands.set('ticketpanel', {
  name: 'ticketpanel',
  description: 'Create a ticket panel',
  execute: async (message) => {
    if (!message.member.permissions.has('ManageChannels')) {
      return message.reply('❌ ليس لديك صلاحية لإنشاء لوحة التذاكر!');
    }

    const embed = new EmbedBuilder()
      .setTitle('🎫 نظام التذاكر')
      .setDescription('اضغط على الزر أدناه لإنشاء تذكرة جديدة')
      .setColor(0x667eea)
      .addFields(
        { name: 'كيفية الاستخدام', value: '1. اضغط على زر "إنشاء تذكرة"\n2. اكتب سبب التذكرة\n3. انتظر الرد من فريق الدعم' }
      );

    const button = new ButtonBuilder()
      .setCustomId('create_ticket')
      .setLabel('إنشاء تذكرة')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('🎫');

    const row = new ActionRowBuilder().addComponents(button);

    await message.channel.send({ embeds: [embed], components: [row] });
    await message.delete();
  },
});

// Close Ticket
client.commands.set('close', {
  name: 'close',
  description: 'Close a ticket',
  execute: async (message) => {
    if (!message.channel.name.startsWith('ticket-')) {
      return message.reply('❌ هذا الأمر يعمل فقط في التذاكر!');
    }

    await message.reply('🛑 جاري إغلاق التذكرة...');
    setTimeout(async () => {
      await message.channel.delete();
    }, 3000);
  },
});

// ============ ENCRYPTION SYSTEM ============

// Encrypt Command
client.commands.set('encrypt', {
  name: 'encrypt',
  description: 'Encrypt your post',
  execute: async (interaction) => {
    // Create Modal
    const modal = new ModalBuilder()
      .setCustomId('encrypt_modal')
      .setTitle('🔒 تشفير المنشور');

    const textInput = new TextInputBuilder()
      .setCustomId('encrypt_text')
      .setLabel('اكتب منشورك هنا')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('اكتب النص الذي تريد تشفيره...')
      .setRequired(true)
      .setMaxLength(4000);

    const actionRow = new ActionRowBuilder().addComponents(textInput);
    modal.addComponents(actionRow);

    await interaction.showModal(modal);
  },
});

// Modal Submit Handler
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isModalSubmit()) return;

  if (interaction.customId === 'encrypt_modal') {
    const text = interaction.fields.getTextInputValue('encrypt_text');
    const encrypted = encryptText(text);

    // Store encrypted post
    client.encryptedPosts.set(interaction.user.id, encrypted);

    const embed = new EmbedBuilder()
      .setTitle('🔒 تم تشفير منشورك!')
      .setColor(0x667eea)
      .addFields(
        { name: 'النص المشفر:', value: `\`\`\`\n${encrypted}\n\`\`\`` }
      )
      .setFooter({ text: 'Viper S | نظام التشفير' });

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('decrypt_post')
          .setLabel('فك التشفير')
          .setStyle(ButtonStyle.Secondary)
      );

    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
  }

  if (interaction.customId === 'decrypt_post') {
    const encrypted = client.encryptedPosts.get(interaction.user.id);

    if (!encrypted) {
      return interaction.reply({ content: '❌ لا يوجد نص مشفر для فك التشفير!', ephemeral: true });
    }

    const decrypted = decryptText(encrypted);

    const embed = new EmbedBuilder()
      .setTitle('🔓 فك التشفير')
      .setColor(0x10b981)
      .addFields(
        { name: 'النص الأصلي:', value: `\`\`\`\n${decrypted}\n\`\`\`` }
      );

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }

  // Ticket Creation
  if (interaction.customId === 'create_ticket') {
    const ticketNum = Date.now().toString(36);
    const channelName = `ticket-${interaction.user.username}-${ticketNum}`;

    const guild = interaction.guild;
    const member = await guild.members.fetch(interaction.user.id);

    // Create ticket channel
    const ticketChannel = await guild.channels.create(channelName, {
      type: 'GUILD_TEXT',
      permissionOverwrites: [
        {
          id: guild.id,
          deny: ['ViewChannel'],
        },
        {
          id: interaction.user.id,
          allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'],
        },
        {
          id: 'ROLE_ID', // Admin role ID
          allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'ManageChannels'],
        },
      ],
    });

    const embed = new EmbedBuilder()
      .setTitle(`🎫 تذكرة #${ticketNum}`)
      .setColor(0x667eea)
      .addFields(
        { name: 'المستخدم:', value: interaction.user.username, inline: true },
        { name: 'تاريخ الإنشاء:', value: new Date().toLocaleString('ar-SA'), inline: true }
      );

    const closeButton = new ButtonBuilder()
      .setCustomId('close_ticket')
      .setLabel('إغلاق التذكرة')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('🔒');

    const row = new ActionRowBuilder().addComponents(closeButton);

    await ticketChannel.send({ content: `${interaction.user}`, embeds: [embed], components: [row] });
    await interaction.reply({ content: `✅ تم إنشاء التذكرة: ${ticketChannel}`, ephemeral: true });
  }

  if (interaction.customId === 'close_ticket') {
    await interaction.channel.delete();
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
      .setColor(0xf59e0b);

    await message.channel.send({ embeds: [embed] });

    // Log to channel if exists
    const logChannel = message.guild.channels.cache.find(ch => ch.name === 'logs');
    if (logChannel) {
      logChannel.send(`🛡️ [Word Filter] ${message.author.tag} استخدم كلمات ممنوعة: ${foundWords.join(', ')}`);
    }
  }
});

// Anti-Spam
const antiSpamTracker = new Map();

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!protectionSettings.antiSpam.enabled) return;

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
    await message.channel.send(`${message.author} تم حذف رسالتك بسبب السبام!`);

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
  if (message.member.permissions.has('ManageMessages')) return; // Admins bypass

  const content = message.content.toLowerCase();
  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  const urls = content.match(urlRegex) || [];

  for (const url of urls) {
    const domain = new URL(url).hostname.replace('www.', '').toLowerCase();

    // Check blacklist
    if (protectionSettings.antiLink.blacklistedDomains.some(d => domain.includes(d))) {
      await message.delete();

      const embed = new EmbedBuilder()
        .setTitle('🔗 رابط محظور!')
        .setDescription(`${message.author} لا يمكنك إرسال روابط من هذا الموقع!`)
        .setColor(0xef4444);

      await message.channel.send({ embeds: [embed] });
      return;
    }

    // Check whitelist
    const isWhitelisted = protectionSettings.antiLink.whitelistedDomains.some(d => domain.includes(d));
    if (!isWhitelisted && url.startsWith('http')) {
      // Block unknown URLs (optional)
    }
  }
});

// ============ UTILITY FUNCTIONS ============

function encryptText(text) {
  let encrypted = '';
  for (let i = 0; i < text.length; i++) {
    encrypted += String.fromCharCode(text.charCodeAt(i) + 3);
  }
  return Buffer.from(encrypted).toString('base64').slice(0, 50);
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
    return 'تعذر فك التشفير';
  }
}

// ============ EVENT HANDLERS ============

// Message Commands Handler
client.on('messageCreate', async (message) => {
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  const cmd = client.commands.get(command);
  if (cmd) {
    try {
      await cmd.execute(message, args);
    } catch (error) {
      console.error(error);
      await message.reply('❌ حدث خطأ أثناء تنفيذ الأمر!');
    }
  }
});

// Ready Event
client.on('ready', () => {
  console.log(`✅ Viper S Bot is online!`);
  console.log(`👤 Logged as: ${client.user.tag}`);
  console.log(`📊 Servers: ${client.guilds.cache.size}`);

  // Set bot status
  client.user.setActivity('Viper S | !help', { type: 'WATCHING' });
});

// Error Handler
client.on('error', (error) => {
  console.error('Bot Error:', error);
});

// ============ LOGIN ============
client.login(TOKEN);

export default client;