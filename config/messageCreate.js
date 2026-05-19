// Message Create Event
// حدث إنشاء الرسائل - تشفير الكلمات

const wordDictionary = require('../config/wordDictionary.js');

module.exports = {
  name: 'messageCreate',
  once: false,
  execute: async (client, message) => {
    // Ignore bots and DMs
    if (message.author.bot || !message.guild) return;

    // Check if user has encryption enabled
    if (!client.encryptionUsers || !client.encryptionUsers.has(message.author.id)) return;

    // Don't encrypt if no content
    if (!message.content || message.content.trim() === '') return;

    // Don't encrypt if it's a command
    if (message.content.startsWith(config.PREFIX)) return;

    try {
      // Delete original message
      await message.delete().catch(() => {});

      // Encrypt the message
      let encryptedMessage = message.content;

      // Replace words from dictionary
      for (const [original, replacement] of Object.entries(wordDictionary)) {
        const regex = new RegExp(original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        encryptedMessage = encryptedMessage.replace(regex, replacement);
      }

      // Send encrypted message
      await message.channel.send({
        content: encryptedMessage,
        allowedMentions: { parse: ['users', 'roles'] }
      }).catch(() => {});

    } catch (err) {
      console.error('[ENCRYPTION] Error:', err);
    }
  }
};
