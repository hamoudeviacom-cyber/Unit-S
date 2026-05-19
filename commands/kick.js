// Kick Command
// أمر الطرد

const { EmbedBuilder } = require('discord.js');
const { hasModRole } = require('../utils/helpers.js');
const { logKick } = require('../utils/logging.js');

module.exports = {
  name: 'kick',
  description: 'Kick a user from the server',
  execute: async (message, args, client) => {
    // Check permissions
    if (!message.member.permissions.has('KickMembers')) {
      if (!hasModRole(message.member)) {
        console.log(`[KICK] ${message.author.tag} tried to use kick without permission`);
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
        console.log(`[KICK] Fetched user by ID: ${targetUser.tag}`);
      } catch (err) {
        console.log(`[KICK] User not found: ${userId}`);
        await message.channel.send('❌ لم يتم العثور على المستخدم!');
        if (!message.deleted) message.delete().catch(() => {});
        return;
      }
    }

    if (!targetUser) {
      console.log(`[KICK] No target user specified by ${message.author.tag}`);
      const embed = new EmbedBuilder()
        .setTitle('<:Security_Red:1495225135979036835> KICK COMMAND')
        .setColor(0xF59E0B)
        .addFields(
          { name: 'Usage:', value: '`!kick @user [reason]` or `!kick [user_id] [reason]`', inline: false },
          { name: 'Example:', value: '`!kick @username rule break`\n`!kick 123456789 rule break`', inline: false }
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
      console.log(`[KICK] Target member found: ${targetMember.user.tag}`);
    } catch (err) {
      console.log(`[KICK] Target not in server: ${targetUser.tag}`);
      await message.channel.send('❌ هذا العضو غير موجود في السيرفر!');
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    // Check if trying to kick higher role
    if (targetMember.roles.highest.position >= message.member.roles.highest.position && message.guild.ownerId !== message.member.id) {
      console.log(`[KICK] ${message.author.tag} tried to kick higher role user: ${targetUser.tag}`);
      await message.channel.send('❌ لا يمكنك طرد هذا العضو!');
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    // Kick the user
    try {
      console.log(`[KICK] ${message.author.tag} is kicking ${targetUser.tag} | Reason: ${reason}`);
      await targetMember.kick(`By: ${message.author.tag} | Reason: ${reason}`);
      console.log(`[KICK] Successfully kicked ${targetUser.tag}`);

      // Log the kick
      await logKick(guild, message.author, targetUser, reason);
      console.log(`[KICK] Kick logged to channels`);

      // Confirmation message
      const embed = new EmbedBuilder()
        .setTitle(`<:Security_Red:1495225135979036835> ${targetUser.tag} تم طرد`)
        .setColor(0xF59E0B)
        .setDescription([
          `<:Security_Red:1495225135979036835> **العضو المطرود:** ${targetUser.tag}`,
          `<:StaffHighCommand:1495224616585658418> **السبب:** ${reason}`,
          `<:6542stafficonred:1495225057209880706> **بواسطة:** ${message.author.tag}`
        ].join('\n'))
        .setFooter({ text: 'Unit S - Moderation' })
        .setTimestamp();

      await message.channel.send({ embeds: [embed] });
      if (!message.deleted) message.delete().catch(() => {});

    } catch (err) {
      console.error(`[KICK ERROR] ${err.message}`);
      await message.channel.send(`❌ حدث خطأ أثناء الطرد: ${err.message}`);
      if (!message.deleted) message.delete().catch(() => {});
    }
  },
};
