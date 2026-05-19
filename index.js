// Unit S - Discord Bot
const express = require('express');
const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 8080;

app.get('/', (req, res) => res.send('Unit S is running!'));
app.listen(port, () => console.log(`Server on port ${port}`));

const TOKEN = process.env.DISCORD_TOKEN || 'YOUR_BOT_TOKEN';
const CLIENT_ID = process.env.CLIENT_ID || 'YOUR_CLIENT_ID';
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
client.slashCommands = new Collection();
client.encryptionUsers = new Map();

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

function loadEvents() {
  // ⭐ التشفير التلقائي
  client.on('messageCreate', async (message) => {
    const event = require('./events/messageCreate.js');
    await event.execute(client, message);
  });

  // الأزرار
  client.on('interactionCreate', async (interaction) => {
    const event = require('./events/interactionCreate.js');
    await event.execute(client, interaction);
  });
  console.log('✅ Events loaded');
}

client.on('ready', async () => {
  console.log(`✅ Bot online: ${client.user.tag}`);
  loadEvents();
  loadCommands();
});

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

client.login(TOKEN)
  .then(() => console.log('✅ Logged in!'))
  .catch(err => console.error('❌ Error:', err));

module.exports = { client, PREFIX };
