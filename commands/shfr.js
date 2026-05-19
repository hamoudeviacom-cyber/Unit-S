const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');

module.exports = {
  name: 'shfr',
  aliases: ['shfr', 'تشفير'],
  description: 'تشفير المنشور',
  async execute(message, args, client) {
    const encryptEmbed = new EmbedBuilder()
      .setAuthor({ name: 'Unit S | التشفير', iconURL: client.user.displayAvatarURL() })
      .setColor(0xDC2626)
      .setDescription([
        'لتشفير منشورك يرجى الضغط على زر **"شفر منشورك"** بالأسفل',
        '',
        'التشفير يعمل بكفاءة عالية ✅',
        '',
        '⚠️ ملاحظة: التشفير يخفي الكلمات المحظورة فقط'
      ].join('\n'))
      .setFooter({ text: 'Unit S | System Bot' })
      .setTimestamp();

    const encryptButton = new ButtonBuilder()
      .setCustomId('shfr_start')
      .setLabel('شفر منشورك')
      .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder().addComponents(encryptButton);

    await message.channel.send({ embeds: [encryptEmbed], components: [row] });
    if (!message.deleted) message.delete().catch(() => {});
  }
};
