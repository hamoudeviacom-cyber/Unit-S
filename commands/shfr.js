// Encryption Panel Command - شفر منشورك
// أمر لوحة التشفير

const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { wordDictionary } = require('../config/wordDictionary.js');

module.exports = {
  name: 'shfr',
  description: 'Open encryption panel',
  execute: async (message, args, client) => {
    try {
      const embed = new EmbedBuilder()
        .setTitle(' Unit S | التشفير')
        .setDescription('لتشفير منشورك، اضغط على الزر أدناه')
        .setColor(0xDC2626)
        .addFields(
          { name: ' المميزات:', value: '• تشفير الكلمات المحظورة\n• يعمل بكفاءة عالية\n• آمن وسريع', inline: false }
        )
        .setFooter({ text: 'Unit S | للتشفير اضغط الزر' })
        .setTimestamp();

      const encryptButton = new ButtonBuilder()
        .setCustomId('shfr_post')
        .setLabel('شفر منشورك')
        .setStyle(ButtonStyle.Success);

      const row = new ActionRowBuilder().addComponents(encryptButton);
      await message.channel.send({ embeds: [embed], components: [row] });
      if (!message.deleted) message.delete().catch(() => {});
    } catch (error) {
      console.error('shfr command error:', error);
    }
  },
};