const wordDictionary = require('../config/wordDictionary.js');

module.exports = {
  name: 'messageCreate',
  once: false,
  async execute(client, message) {
    if (message.author.bot || !message.guild) return;
    if (!client.encryptionUsers || !client.encryptionUsers.has(message.author.id)) return;

    try {
      await message.delete();

      let encrypted = message.content;
      for (const [original, replacement] of Object.entries(wordDictionary)) {
        const regex = new RegExp(original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        encrypted = encrypted.replace(regex, replacement);
      }

      await message.channel.send({
        content: encrypted,
        allowedMentions: { parse: ['users', 'roles'] }
      });

    } catch (err) {
      console.error('[ENCRYPTION] Error:', err);
    }
  }
};
