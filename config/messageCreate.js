// Message Create Event - نظام التشفير التلقائي
const wordDictionary = require('../config/wordDictionary.js');

function encryptText(text) {
  let encrypted = text;

  for (const [original, replacement] of Object.entries(wordDictionary)) {
    const regex = new RegExp(original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    encrypted = encrypted.replace(regex, replacement);
  }

  return encrypted;
}

function hasBannedWords(text) {
  for (const original of Object.keys(wordDictionary)) {
    const regex = new RegExp(original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    if (regex.test(text)) return true;
  }
  return false;
}

module.exports = {
  name: 'messageCreate',
  once: false,
  async execute(client, message) {
    // Ignore bots and DMs
    if (message.author.bot || !message.guild) return;

    // Check if message has content
    if (!message.content || message.content.trim() === '') return;

    // Check if message contains banned words
    if (!hasBannedWords(message.content)) return;

    try {
      // Delete original message
      await message.delete().catch(() => {});

      // Encrypt the message
      const encrypted = encryptText(message.content);

      // Send result in red embed
      const { EmbedBuilder } = require('discord.js');
      const resultEmbed = new EmbedBuilder()
        .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
        .setColor(0xDC2626) // Red color
        .setDescription(encrypted)
        .setFooter({ text: 'Unit S | Auto Encryption' })
        .setTimestamp();

      await message.channel.send({ embeds: [resultEmbed] });

    } catch (err) {
      console.error('[ENCRYPTION] Error:', err);
    }
  }
};
