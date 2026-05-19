// Unit S - Discord Bot
// نظام الحماية والتشفير وتذكرة بانيل

// ============ Package Imports ============
const express = require('express');
const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

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
const CLIENT_ID = process.env.CLIENT_ID || 'YOUR_CLIENT_ID';
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
client.slashCommands = new Collection();
client.encryptionUsers = new Map();

// ============ Load Commands ============
function loadCommands() {
  const commandsPath = path.join(__dirname, 'commands');
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);

    if (command.data && command.data.toJSON) {
      client.slashCommands.set(command.data.name, command);
    } else {
      client.commands.set(command.name, command);
    }
  }

  console.log(`✅ Loaded ${client.commands.size + client.slashCommands.size} commands`);
}

// ============ Load Events ============
function loadEvents() {
  // Message Create Event (للتشفير التلقائي) ⭐
  client.on('messageCreate', async (message) => {
    const event = require('./events/messageCreate.js');
    await event.execute(client, message);
  });

  // Interaction Create Event
  client.on('interactionCreate', async (interaction) => {
    const event = require('./events/interactionCreate.js');
    await event.execute(client, interaction);
  });

  console.log('✅ Events loaded');
}

// ============ Load Slash Commands ============
async function loadSlashCommands() {
  if (client.slashCommands.size === 0) return;

  const commands = [];
  for (const command of client.slashCommands.values()) {
    if (command.data && command.data.toJSON) {
      commands.push(command.data.toJSON());
    }
  }

  const rest = new REST({ version: '10' }).setToken(TOKEN);

  try {
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    console.log('✅ Slash commands registered');
  } catch (error) {
    console.error('❌ Error registering slash commands:', error);
  }
}

// ============ Bot Ready Event ============
client.on('ready', async () => {
  console.log(`✅ Bot is online! Logged in as ${client.user.tag}`);

  // Load events first ⭐
  loadEvents();

  // Load commands
  loadCommands();

  // Register slash commands
  await loadSlashCommands();
});

// ============ Message Event - Command Handler ============
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
    console.error(`[COMMAND ERROR] ${commandName}:`, error);
    await message.channel.send('❌ حدث خطأ أثناء تنفيذ الأمر!');
  }
});

// ============ Login to Discord ============
client.login(TOKEN)
  .then(() => console.log('✅ Successfully logged in to Discord!'))
  .catch(err => console.error('❌ Failed to login:', err));

module.exports = { client, PREFIX };
