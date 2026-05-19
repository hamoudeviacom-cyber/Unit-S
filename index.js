// Unit S - Discord Bot
const express = require('express');
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');

const app = express();
app.get('/', (req, res) => res.send('Unit S is running!'));
app.listen(process.env.PORT || 8080);

const TOKEN = process.env.DISCORD_TOKEN || 'YOUR_BOT_TOKEN';
const PREFIX = '!';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
  ],
  partials: ['CHANNEL', 'GUILD_MEMBER', 'USER'],
});

client.commands = new Collection();
client.encryptionUsers = new Map();

// ============ تسجيل الأوامر ============
function loadCommands() {
  const tickets = require('./commands/tickets.js');

  // أوامر التذاكر ⭐
  client.commands.set('order', require('./commands/tickets.js'));
  client.commands.set('support', tickets.supportCommand);
  client.commands.set('report', tickets.reportCommand);
  client.commands.set('applysupport', tickets.applySupportCommand);
  client.commands.set('applyteam', tickets.applyTeamCommand);

  // أمر التشفير
  client.commands.set('shfr', require('./commands/shfr.js'));
  client.commands.set('تشفير', require('./commands/shfr.js'));

  // أوامر عامة
  client.commands.set('help', require('./commands/help.js'));
  client.commands.set('ping', require('./commands/ping.js'));
  client.commands.set('freerank', require('./commands/freerank.js'));

  console.log(`✅ ${client.commands.size} commands loaded`);
}

// ============ تحميل Events ============
function loadEvents() {
  // ⭐ التشفير التلقائي
  client.on('messageCreate', (msg) => require('./events/messageCreate.js').execute(client, msg));

  // الأزرار
  client.on('interactionCreate', (interaction) => require('./events/interactionCreate.js').execute(client, interaction));

  console.log('✅ Events loaded');
}

// ============ Bot Ready ============
client.on('ready', () => {
  console.log(`✅ Bot online: ${client.user.tag}`);
  loadEvents();
  loadCommands();
});

// ============ Command Handler ============
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();
  const command = client.commands.get(commandName);

  if (!command) return;

  try {
    await command.execute(message, args, client);
  } catch (error) {
    console.error(`[CMD] ${commandName}:`, error);
  }
});

// ============ Login ============
client.login(TOKEN).then(() => console.log('✅ Logged in!')).catch(console.error);
module.exports = { client, PREFIX };
