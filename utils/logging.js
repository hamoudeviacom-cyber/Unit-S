// Logging Functions
// دوال اللوج والتسجيل

import { EmbedBuilder } from 'discord.js';
import logSettings from '../config/logSettings.js';
import { formatDate } from './helpers.js';

// Send log to specific channel
export async function sendLog(guild, logType, embed) {
  console.log(`[LOG] Sending ${logType} log to channels`);
  const channelMap = {
    all: logSettings.allLog,
    ban: logSettings.banLog,
    kick: logSettings.kickLog,
    timeout: logSettings.timeoutLog,
    messages: logSettings.messagesLog,
    rooms: logSettings.roomsLog,
    joinLeave: logSettings.joinLeaveLog,
    roles: logSettings.rolesLog,
  };

  const channelId = channelMap[logType];
  if (channelId) {
    const channel = guild.channels.cache.get(channelId);
    if (channel) {
      await channel.send({ embeds: [embed] });
      console.log(`[LOG] Sent to ${logType} channel: ${channel.name}`);
    }
  }

  // Send to all-log if set
  if (logSettings.allLog && logType !== 'all') {
    const allChannel = guild.channels.cache.get(logSettings.allLog);
    if (allChannel) {
      await allChannel.send({ embeds: [embed] });
      console.log(`[LOG] Sent to all-log channel: ${allChannel.name}`);
    }
  }
}

// Log ban action
export async function logBan(guild, moderator, target, reason) {
  console.log(`[BAN_LOG] Creating ban log for ${target.tag} | By: ${moderator.tag} | Reason: ${reason}`);
  const embed = new EmbedBuilder()
    .setTitle('<:Security_Red:1495225135979036835> BAN LOG')
    .setColor(0xDC2626)
    .addFields(
      { name: '<:StaffHighCommand:1495224616585658418> Admin', value: moderator.tag || moderator.username, inline: true },
      { name: '<:Security_Red:1495225135979036835> Banned User', value: target.tag || target.username, inline: true },
      { name: '<:1_spider:1495225013194985582> User ID', value: target.id, inline: true },
      { name: '<:Rox_pin:1495225600258998313> Reason', value: reason || 'No reason provided', inline: false },
      { name: '<:vanka237:1495225240035262597> Time', value: formatDate(new Date()), inline: false }
    )
    .setFooter({ text: 'Unit S - Moderation' })
    .setTimestamp();

  await sendLog(guild, 'ban', embed);
  console.log(`[BAN_LOG] Ban log sent successfully`);
}

// Log kick action
export async function logKick(guild, moderator, target, reason) {
  console.log(`[KICK_LOG] Creating kick log for ${target.tag} | By: ${moderator.tag} | Reason: ${reason}`);
  const embed = new EmbedBuilder()
    .setTitle('<:Security_Red:1495225135979036835> KICK LOG')
    .setColor(0xF59E0B)
    .addFields(
      { name: '<:StaffHighCommand:1495224616585658418> Admin', value: moderator.tag || moderator.username, inline: true },
      { name: '<:Security_Red:1495225135979036835> Kicked User', value: target.tag || target.username, inline: true },
      { name: '<:1_spider:1495225013194985582> User ID', value: target.id, inline: true },
      { name: '<:Rox_pin:1495225600258998313> Reason', value: reason || 'No reason provided', inline: false },
      { name: '<:vanka237:1495225240035262597> Time', value: formatDate(new Date()), inline: false }
    )
    .setFooter({ text: 'Unit S - Moderation' })
    .setTimestamp();

  await sendLog(guild, 'kick', embed);
  console.log(`[KICK_LOG] Kick log sent successfully`);
}

// Log timeout action
export async function logTimeout(guild, moderator, target, duration, reason) {
  console.log(`[TIMEOUT_LOG] Creating timeout log for ${target.tag} | By: ${moderator.tag} | Duration: ${duration}`);
  const embed = new EmbedBuilder()
    .setTitle('<:emrp_online:1495223740596879492> TIMEOUT LOG')
    .setColor(0x8B5CF6)
    .addFields(
      { name: '<:StaffHighCommand:1495224616585658418> Admin', value: moderator.tag || moderator.username, inline: true },
      { name: '<:Security_Red:1495225135979036835> User', value: target.tag || target.username, inline: true },
      { name: '<:1_spider:1495225013194985582> User ID', value: target.id, inline: true },
      { name: '<:vanka237:1495225240035262597> Duration', value: duration || 'Unknown', inline: true },
      { name: '<:Rox_pin:1495225600258998313> Reason', value: reason || 'No reason provided', inline: false },
      { name: '<:vanka234:1495225521242636432> Time', value: formatDate(new Date()), inline: false }
    )
    .setFooter({ text: 'Unit S - Moderation' })
    .setTimestamp();

  await sendLog(guild, 'timeout', embed);
  console.log(`[TIMEOUT_LOG] Timeout log sent successfully`);
}

// Log member join
export async function logMemberJoin(guild, member) {
  console.log(`[JOIN_LOG] Member joined: ${member.user.tag}`);
  const embed = new EmbedBuilder()
    .setTitle('<:emrp_online:1495223740596879492> MEMBER JOINED')
    .setColor(0x10B981)
    .addFields(
      { name: '<:Security_Red:1495225135979036835> User', value: member.user?.tag || 'Unknown', inline: true },
      { name: '<:1_spider:1495225013194985582> User ID', value: member.id, inline: true },
      { name: '<:StaffHighCommand:1495224616585658418> Joined Server', value: formatDate(member.joinedTimestamp), inline: false },
      { name: '<:vanka234:1495225521242636432> Time', value: formatDate(new Date()), inline: false }
    )
    .setFooter({ text: 'Unit S - Moderation' })
    .setTimestamp();

  await sendLog(guild, 'joinLeave', embed);
  console.log(`[JOIN_LOG] Join log sent successfully`);
}

// Log member leave
export async function logMemberLeave(guild, member, kicker) {
  console.log(`[LEAVE_LOG] Member left: ${member.user.tag} | Kicked by: ${kicker?.tag || 'Left voluntarily'}`);
  const embed = new EmbedBuilder()
    .setTitle('<:emrp_offline:1495223788139446463> MEMBER LEFT')
    .setColor(0xF59E0B)
    .addFields(
      { name: '<:Security_Red:1495225135979036835> User', value: member.user?.tag || 'Unknown', inline: true },
      { name: '<:1_spider:1495225013194985582> User ID', value: member.id, inline: true },
      { name: '<:StaffHighCommand:1495224616585658418> Removed By', value: kicker ? `${kicker.tag || kicker.username}` : 'Left voluntarily', inline: true },
      { name: '<:vanka234:1495225521242636432> Time', value: formatDate(new Date()), inline: false }
    )
    .setFooter({ text: 'Unit S - Moderation' })
    .setTimestamp();

  await sendLog(guild, 'joinLeave', embed);
  console.log(`[LEAVE_LOG] Leave log sent successfully`);
}

// Log ticket transcript
export async function logTicketTranscript(channel, closedBy, reason = 'لم يذكر') {
  try {
    const messages = await channel.messages.fetch({ limit: 100 }).catch(() => new Collection());

    let transcript = `=== لوجس التذكرة: ${channel.name} ===\n`;
    transcript += `تاريخ الإغلاق: ${formatDate(new Date())}\n`;
    transcript += `مقام من: ${closedBy.tag || closedBy.username || 'غير معروف'}\n`;
    transcript += `السبب: ${reason}\n`;
    transcript += `عدد الرسائل: ${messages.size}\n`;
    transcript += '================================\n\n';

    for (const msg of messages.values()) {
      const timestamp = formatDate(msg.createdTimestamp);
      const author = msg.author.tag;
      const content = msg.content || '[رسالة بدون نص]';

      let attachments = '';
      if (msg.attachments.size > 0) {
        attachments = ' [مرفقات: ' + msg.attachments.map(a => a.name).join(', ') + ']';
      }

      transcript += `[${timestamp}] ${author}: ${content}${attachments}\n`;
    }

    transcript += '\n=== نهاية اللوجس ===';

    console.log(`[TICKET_LOG] Transcript saved for ${channel.name}`);

    return true;
  } catch (error) {
    console.error('Error logging ticket transcript:', error);
    return false;
  }
}