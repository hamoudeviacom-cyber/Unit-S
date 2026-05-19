// Say Command
// أمر جعل البوت يرسل رسالة

const { EmbedBuilder } = require('discord.js');
const { hasModRole } = require('../utils/helpers.js');
const modSettings = require('../config/modSettings.js');

module.exports = {
  name: 'say',
  description: 'Make the bot send a message',
  execute: async (message, args, client) => {
    // Check if user has admin permissions
    if (!hasModRole(message.member) && !modSettings.adminUsers.includes(message.author.username)) {
      console.log(`[SAY] ${message.author.tag} tried to use say without permission`);
      await message.channel.send('❌ ليس لديك صلاحية!');
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    // Check if there's text to send
    if (args.length === 0) {
      console.log(`[SAY] No message specified by ${message.author.tag}`);
      const embed = new EmbedBuilder()
        .setTitle('<:vanka235:1495225345518076034> أمر Say')
        .setColor(0xDC2626)
        .setDescription('الاستخدام: `!say [الرسالة]`\n\nمثال: `!say مرحباً بالجميع!`')
        .setFooter({ text: 'Unit S Bot' });
      await message.channel.send({ embeds: [embed] });
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    // Get the text to send
    const text = args.join(' ');
    console.log(`[SAY] ${message.author.tag} making bot say: ${text}`);

    // Delete the command message
    if (!message.deleted) message.delete().catch(() => {});

    // Send the message
    await message.channel.send(text);
    console.log(`[SAY] Message sent successfully`);
  },
};
