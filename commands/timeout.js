// Timeout Command
// أمر التعطيل المؤقت

const { EmbedBuilder } = require('discord.js');
const { hasModRole } = require('../utils/helpers.js');
const { logTimeout } = require('../utils/logging.js');

module.exports = {
  name: 'timeout',
  description: 'Timeout a user from the server',
  execute: async (message, args, client) => {
    // Check permissions
    if (!message.member.permissions.has('ModerateMembers')) {
      if (!hasModRole(message.member)) {
        console.log(`[TIMEOUT] ${message.author.tag} tried to use timeout without permission`);
        await message.channel.send('❌ ليس لديك صلاحية!');
        if (!message.deleted) message.delete().catch(() => {});
        return;
      }
    }

    // Parse arguments
    const user = message.mentions.users.first();
    let duration = args[1] || '60'; // Default 60 minutes
    let reason = args.slice(2).join(' ') || 'No reason provided';

    if (!user) {
      const embed = new EmbedBuilder()
        .setTitle('<:emrp_online:1495223740596879492> TIMEOUT COMMAND')
        .setColor(0x8B5CF6)
        .addFields(
          { name: 'Usage:', value: '`!timeout @user [minutes] [reason]`', inline: false },
          { name: 'Example:', value: '`!timeout @username 30 spamming`', inline: false }
        )
        .setFooter({ text: 'Unit S - Moderation' });
      await message.channel.send({ embeds: [embed] });
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    // Parse duration
    const durationMinutes = parseInt(duration) || 60;
    const maxDuration = 40320; // 28 days in minutes
    const actualDuration = Math.min(durationMinutes, maxDuration);

    try {
      const targetMember = await message.guild.members.fetch(user.id);
      console.log(`[TIMEOUT] ${message.author.tag} is timing out ${user.tag} for ${actualDuration} minutes`);

      // Set timeout
      const timeoutUntil = new Date(Date.now() + actualDuration * 60 * 1000);
      await targetMember.timeout(timeoutUntil, `By: ${message.author.tag} | Reason: ${reason}`);

      // Log the timeout
      await logTimeout(message.guild, message.author, user, `${actualDuration} minutes`, reason);

      const embed = new EmbedBuilder()
        .setTitle(`<:emrp_online:1495223740596879492> ${user.tag} تم تعطيله`)
        .setColor(0x8B5CF6)
        .setDescription([
          `<:Security_Red:1495225135979036835> **العضو:** ${user.tag}`,
          `<:StaffHighCommand:1495224616585658418> **المدة:** ${actualDuration} دقيقة`,
          `<:Rox_pin:1495225600258998313> **السبب:** ${reason}`,
          `<:vanka237:1495225240035262597> **بواسطة:** ${message.author.tag}`
        ].join('\n'))
        .setFooter({ text: 'Unit S - Moderation' })
        .setTimestamp();

      await message.channel.send({ embeds: [embed] });
      if (!message.deleted) message.delete().catch(() => {});

    } catch (err) {
      console.error(`[TIMEOUT ERROR] ${err.message}`);
      await message.channel.send(`❌ حدث خطأ: ${err.message}`);
      if (!message.deleted) message.delete().catch(() => {});
    }
  },
};
