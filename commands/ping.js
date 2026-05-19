// Ping Command
// أمر ping لاختبار سرعة البوت

const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'ping',
  description: 'Test bot latency',
  execute: async (message, args, client) => {
    console.log(`[PING] ${message.author.tag} requested ping`);
    const ping = Date.now() - message.createdTimestamp;
    const apiPing = client.ws.ping;

    const embed = new EmbedBuilder()
      .setTitle('<:vanka235:1495225345518076034> Pong!')
      .setColor(0xDC2626)
      .addFields(
        { name: '<:vanka236:1495225280728662016> Latency', value: `${ping}ms`, inline: true },
        { name: '<:vanka234:1495225521242636432> API Ping', value: `${apiPing}ms`, inline: true }
      )
      .setTimestamp();

    await message.channel.send({ embeds: [embed] });
    if (!message.deleted) message.delete().catch(() => {});
    console.log(`[PING] Response sent to ${message.author.tag}`);
  },
};
