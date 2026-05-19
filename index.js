// Unit S - Discord Bot
// نظام التشفير والتذاكر

const express = require('express');
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 8080;

app.get('/', (req, res) => res.send('Unit S is running!'));
app.listen(port, () => console.log(`Server on port ${port}`));

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

// ============ Load Commands ============
function loadCommands() {
  // أوامر التذاكر ⭐
  client.commands.set('order', require('./commands/tickets.js'));
  client.commands.set('support', require('./commands/tickets.js'));
  client.commands.set('report', require('./commands/tickets.js'));
  client.commands.set('applysupport', require('./commands/tickets.js'));
  client.commands.set('applyteam', require('./commands/tickets.js'));
  client.commands.set('tickets', require('./commands/tickets.js'));

  // أمر التشفير ⭐
  client.commands.set('shfr', require('./commands/shfr.js'));
  client.commands.set('تشفير', require('./commands/shfr.js'));

  // أوامر عامة
  client.commands.set('help', require('./commands/help.js'));
  client.commands.set('ping', require('./commands/ping.js'));
  client.commands.set('freerank', require('./commands/freerank.js'));

  console.log(`✅ Loaded ${client.commands.size} commands`);
}

// ============ Load Events ============
function loadEvents() {
  // ⭐ التشفير التلقائي
  client.on('messageCreate', async (message) => {
    const event = require('./events/messageCreate.js');
    await event.execute(client, message);
  });

  // ⭐ الأزرار والتفاعلات
  client.on('interactionCreate', async (interaction) => {
    const event = require('./events/interactionCreate.js');
    await event.execute(client, interaction);
  });

  console.log('✅ Events loaded');
}

// ============ Bot Ready ============
client.on('ready', async () => {
  console.log(`✅ Bot online: ${client.user.tag}`);
  loadEvents();
  loadCommands();
});

// ============ Message Handler ============
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
    await message.channel.send('❌ حدث خطأ!');
  }
});

// ============ Login ============
client.login(TOKEN)
  .then(() => console.log('✅ Logged in!'))
  .catch(err => console.error('❌ Error:', err));

module.exports = { client, PREFIX };
