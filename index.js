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
  client.commands.set('order', tickets);
  client.commands.set('support', tickets.supportCommand);
  client.commands.set('report', tickets.reportCommand);
  client.commands.set('applysupport', tickets.applySupportCommand);
  client.commands.set('applyteam', tickets.applyTeamCommand);
  client.commands.set('tickets', tickets);

  // أمر التشفير ⭐
  client.commands.set('shfr', require('./commands/shfr.js'));
  client.commands.set('تشفير', require('./commands/shfr.js'));

  // أوامر الأدمن ⭐
  client.commands.set('ban', require('./commands/ban.js'));
  client.commands.set('unban', require('./commands/unban.js'));
  client.commands.set('kick', require('./commands/kick.js'));
  client.commands.set('timeout', require('./commands/timeout.js'));
  client.commands.set('حذف', require('./commands/purge.js'));
  client.commands.set('purge', require('./commands/purge.js'));
  client.commands.set('logs', require('./commands/logs.js'));
  client.commands.set('modsettings', require('./commands/modsettings.js'));
  client.commands.set('24voice', require('./commands/24voice.js'));
  client.commands.set('joinvoice', require('./commands/24voice.js'));

  // أوامر عامة ⭐
  client.commands.set('help', require('./commands/help.js'));
  client.commands.set('ping', require('./commands/ping.js'));
  client.commands.set('say', require('./commands/say.js'));
  client.commands.set('terms', require('./commands/terms.js'));
  client.commands.set('freerank', require('./commands/freerank.js'));

  console.log(`✅ ${client.commands.size} commands loaded`);
}

// ============ تحميل Events ============
function loadEvents() {
  client.on('messageCreate', (msg) => require('./events/messageCreate.js').execute(client, msg));
  client.on('interactionCreate', (interaction) => require('./events/interactionCreate.js').execute(client, interaction));
  client.on('guildMemberAdd', (member) => require('./events/guildMemberAdd.js').execute(client, member));
  client.on('guildMemberUpdate', (oldM, newM) => require('./events/guildMemberUpdate.js').execute(client, oldM, newM));
  client.on('roleUpdate', (oldR, newR) => require('./events/roleUpdate.js').execute(client, oldR, newR));
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
    message.channel.send('❌ حدث خطأ!');
  }
});

// ============ Login ============
client.login(TOKEN).then(() => console.log('✅ Logged in!')).catch(console.error);
module.exports = { client, PREFIX };
