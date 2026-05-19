// Unban Command
// أمر إلغاء الحظر

const { EmbedBuilder } = require('discord.js');
const { hasModRole } = require('../utils/helpers.js');
const { sendLog } = require('../utils/logging.js');

module.exports = {
  name: 'unban',
  description: 'Unban a user from the server',
  execute: async (message, args, client) => {
    // Check permissions
    if (!message.member.permissions.has('BanMembers')) {
      if (!hasModRole(message.member)) {
        console.log(`[UNBAN] ${message.author.tag} tried to use unban without permission`);
        await message.channel.send('❌ ليس لديك صلاحية!');
        if (!message.deleted) message.delete().catch(() => {});
        return;
      }
    }

    if (args.length === 0) {
      console.log(`[UNBAN] No user ID specified by ${message.author.tag}`);
      const embed = new EmbedBuilder()
        .setTitle('<:6542stafficonred:1495225057209880706> UNBAN COMMAND')
        .setColor(0x10B981)
        .addFields(
          { name: 'Usage:', value: '`!unban [user_id]`', inline: false },
          { name: 'Example:', value: '`!unban 123456789`', inline: false }
        )
        .setFooter({ text: 'Unit S - Moderation' });
      await message.channel.send({ embeds: [embed] });
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    const userId = args[0];
    console.log(`[UNBAN] ${message.author.tag} unbanning user ID: ${userId}`);

    try {
      const user = await client.users.fetch(userId);
      await message.guild.members.unban(userId);
      console.log(`[UNBAN] Successfully unbanned ${user.tag}`);

      // Log the unban
      const banLogEmbed = new EmbedBuilder()
        .setTitle('<:6542stafficonred:1495225057209880706> <a:vanka234:1495225521242636432> تم إلغاء الحظر')
        .setColor(0x10B981)
        .addFields(
          { name: '<:Security_Red:1495225135979036835> العضو', value: user.tag, inline: true },
          { name: '<:StaffHighCommand:1495224616585658418> بواسطة', value: message.author.tag, inline: true },
          { name: '<:1_spider:1495225013194985582> الوقت', value: new Date().toLocaleString('en-US', { timeZone: 'Asia/Riyadh' }), inline: false }
        )
        .setFooter({ text: 'Unit S - Moderation' })
        .setTimestamp();

      await message.channel.send({ embeds: [banLogEmbed] });

      // Send to ban log
      await sendLog(message.guild, 'ban', banLogEmbed);
      console.log(`[UNBAN] Unban logged to channels`);

      if (!message.deleted) message.delete().catch(() => {});

    } catch (err) {
      console.error(`[UNBAN ERROR] ${err.message}`);
      await message.channel.send('❌ لم يتم العثور على المستخدم أو حدث خطأ!');
      if (!message.deleted) message.delete().catch(() => {});
    }
  },
};
