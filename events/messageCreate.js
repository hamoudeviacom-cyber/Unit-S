const { EmbedBuilder } = require('discord.js');
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
    if (message.author.bot || !message.guild) return;
    if (!message.content || message.content.trim() === '') return;
    if (!hasBannedWords(message.content)) return;

    try {
      await message.delete();

      const encrypted = encryptText(message.content);

      const resultEmbed = new EmbedBuilder()
        .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
        .setColor(0xDC2626)
        .setDescription(encrypted)
        .setFooter({ text: 'Unit S | Auto Encryption' })
        .setTimestamp();

      await message.channel.send({ embeds: [resultEmbed] });
    } catch (err) {
      console.error('[ENCRYPTION] Error:', err);
    }
  }
};
