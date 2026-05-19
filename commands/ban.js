// Ban Command
// أمر الحظر

const { EmbedBuilder } = require('discord.js');
const { hasModRole } = require('../utils/helpers.js');
const { logBan, sendLog } = require('../utils/logging.js');

module.exports = {
  name: 'ban',
  description: 'Ban a user from the server',
  execute: async (message, args, client) => {
    // Check permissions
    if (!message.member.permissions.has('BanMembers')) {
      if (!hasModRole(message.member)) {
        console.log(`[BAN] ${message.author.tag} tried to use ban without permission`);
        await message.channel.send('❌ ليس لديك صلاحية!');
        if (!message.deleted) message.delete().catch(() => {});
        return;
      }
    }

    // Parse arguments
    const user = message.mentions.users.first();
    const userId = args.find(arg => !arg.startsWith('<@') && !arg.startsWith('!'));
    let reason = args.slice(user ? 1 : 0).join(' ') || 'No reason provided';

    let targetUser = user;

    // If no mention, try to fetch by ID
    if (!targetUser && userId) {
      try {
        targetUser = await client.users.fetch(userId);
        console.log(`[BAN] Fetched user by ID: ${targetUser.tag}`);
      } catch (err) {
        console.log(`[BAN] User not found: ${userId}`);
        await message.channel.send('❌ لم يتم العثور على المستخدم!');
        if (!message.deleted) message.delete().catch(() => {});
        return;
      }
    }

    if (!targetUser) {
      console.log(`[BAN] No target user specified by ${message.author.tag}`);
      const embed = new EmbedBuilder()
        .setTitle('BAN COMMAND')
        .setColor(0xDC2626)
        .addFields(
          { name: 'Usage:', value: '`!ban @user [reason]` or `!ban [user_id] [reason]`', inline: false },
          { name: 'Example:', value: '`!ban @username spamming`\n`!ban 123456789 spamming`', inline: false }
        )
        .setFooter({ text: 'Unit S - Moderation' });
      await message.channel.send({ embeds: [embed] });
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    // Get member from guild
    const guild = message.guild;
    let targetMember;
    try {
      targetMember = await guild.members.fetch(targetUser.id);
      console.log(`[BAN] Target member found: ${targetMember.user.tag}`);
    } catch (err) {
      console.log(`[BAN] Target not in server: ${targetUser.tag}`);
      // User not in server
    }

    // Check if trying to ban higher role
    if (targetMember) {
      if (targetMember.roles.highest.position >= message.member.roles.highest.position && message.guild.ownerId !== message.member.id) {
        console.log(`[BAN] ${message.author.tag} tried to ban higher role user: ${targetUser.tag}`);
        await message.channel.send('❌ لا يمكنك حظر هذا العضو!');
        if (!message.deleted) message.delete().catch(() => {});
        return;
      }
    }

    // Ban the user
    try {
      console.log(`[BAN] ${message.author.tag} is banning ${targetUser.tag} | Reason: ${reason}`);
      await guild.members.ban(targetUser.id, { reason: `By: ${message.author.tag} | Reason: ${reason}` });
      console.log(`[BAN] Successfully banned ${targetUser.tag}`);

      // Log the ban
      await logBan(guild, message.author, targetUser, reason);
      console.log(`[BAN] Ban logged to channels`);

      // Confirmation message - EMBED IN SAME CHANNEL with the name of the banned person
      const embed = new EmbedBuilder()
        .setTitle(`<:Security_Red:1495225135979036835> ${targetUser.tag} تم حظر`)
        .setColor(0xDC2626)
        .setDescription([
          `<:Security_Red:1495225135979036835> ** العضو المحظور:** ${targetUser.tag}`,
          `<:StaffHighCommand:1495224616585658418> **السبب:** ${reason}`,
          `<:6542stafficonred:1495225057209880706> **بواسطة:** ${message.author.tag}`
        ].join('\n'))
        .setFooter({ text: 'Unit S - Moderation' })
        .setTimestamp();

      await message.channel.send({ embeds: [embed] });
      if (!message.deleted) message.delete().catch(() => {});

    } catch (err) {
      console.error(`[BAN ERROR] ${err.message}`);
      await message.channel.send(`❌ حدث خطأ أثناء الحظر: ${err.message}`);
      if (!message.deleted) message.delete().catch(() => {});
    }
  },
};
