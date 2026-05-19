// Unit S - Discord Bot
// نظام الحماية والتشفير وتذكرة بانيل

// ============ Package Imports ============
const express = require('express');
const { Client, GatewayIntentBits, Collection } = require('discord.js');

// ============ Express Server ============
const app = express();
const port = process.env.PORT || 8080;

app.get('/', (req, res) => {
  res.send('Unit S is running!');
});

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});

// ============ Bot Configuration ============
const TOKEN = process.env.DISCORD_TOKEN || 'YOUR_BOT_TOKEN';
const PREFIX = '!';

// ============ Initialize Discord Client ============
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

// ============ Collections ============
client.commands = new Collection();
client.encryptedPosts = new Collection();

// ============ 24/7 Voice Settings ============
client.voiceConnection = null;
client.voiceChannelId = null;

// ============ Bot Ready Event ============
client.on('ready', async () => {
  console.log(`✅ Bot is online! Logged in as ${client.user.tag}`);
  console.log(`✅ Bot ID: ${client.user.id}`);
  client.user.setActivity('Unit S | !help', { type: 'PLAYING' });

  // Load all commands
  loadCommands();

  // Load all events
  loadEvents();
});

// ============ Load Commands ============
function loadCommands() {
  // Admin Commands
  client.commands.set('ban', require('./commands/ban.js'));
  client.commands.set('unban', require('./commands/unban.js'));
  client.commands.set('kick', require('./commands/kick.js'));
  client.commands.set('timeout', require('./commands/timeout.js'));
  client.commands.set('حذف', require('./commands/purge.js'));
  client.commands.set('logs', require('./commands/logs.js'));
  client.commands.set('modsettings', require('./commands/modsettings.js'));
  client.commands.set('24voice', require('./commands/24voice.js'));
  client.commands.set('joinvoice', require('./commands/24voice.js'));
  client.commands.set('voice24', require('./commands/24voice.js'));

  // General Commands
  client.commands.set('help', require('./commands/help.js'));
  client.commands.set('ping', require('./commands/ping.js'));
  client.commands.set('say', require('./commands/say.js'));
  client.commands.set('terms', require('./commands/terms.js'));

  // Free Rank
  client.commands.set('freerank', require('./commands/freerank.js'));

  // Encryption
  client.commands.set('shfr', require('./commands/shfr.js'));

  // Tickets
  const ticketsModule = require('./commands/tickets.js');
  client.commands.set('ticket', ticketsModule);
  client.commands.set('tickets', ticketsModule);
  client.commands.set('order', ticketsModule.orderCommand);
  client.commands.set('support', ticketsModule.supportCommand);
  client.commands.set('report', ticketsModule.reportCommand);
  client.commands.set('applysupport', ticketsModule.applySupportCommand);
  client.commands.set('applyteam', ticketsModule.applyTeamCommand);

  console.log(`✅ Loaded ${client.commands.size} commands`);
}

// ============ Load Events ============
function loadEvents() {
  // Member events
  client.on('guildMemberAdd', async (member) => {
    const event = require('./events/guildMemberAdd.js');
    await event.execute(client, member);
  });

  client.on('guildMemberUpdate', async (oldMember, newMember) => {
    const event = require('./events/guildMemberUpdate.js');
    await event.execute(client, oldMember, newMember);
  });

  client.on('roleUpdate', async (oldRole, newRole) => {
    const event = require('./events/roleUpdate.js');
    await event.execute(client, oldRole, newRole);
  });

  client.on('interactionCreate', async (interaction) => {
    const event = require('./events/interactionCreate.js');
    await event.execute(client, interaction);
  });

  console.log('✅ Events loaded');
}

// ============ Message Event - Command Handler ============
client.on('messageCreate', async (message) => {
  // Ignore bots
  if (message.author.bot) return;

  // Check if message starts with prefix
  if (!message.content.startsWith(PREFIX)) return;

  // Parse command and arguments
  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  // Find command
  const command = client.commands.get(commandName);
  if (!command) return;

  // Execute command
  try {
    await command.execute(message, args, client);
  } catch (error) {
    console.error(`[COMMAND ERROR] ${commandName}:`, error);
    await message.channel.send('❌ حدث خطأ أثناء تنفيذ الأمر!');
  }
});

// ============ Login to Discord ============
client.login(TOKEN)
  .then(() => console.log('✅ Successfully logged in to Discord!'))
  .catch(err => console.error('❌ Failed to login:', err));

// ============ Export for other modules ============
module.exports = { client, PREFIX };