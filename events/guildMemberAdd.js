// Guild Member Add Event
// حدث عند دخول عضو للسيرفر

import config from '../config/index.js';
import { isMemberProtected } from '../utils/helpers.js';
import immuneUsers from '../config/immuneUsers.js';

export default {
  name: 'guildMemberAdd',
  once: false,
  execute: async (client, member) => {
    console.log(`[BOT_ADD] ${member.user.tag} | bot: ${member.user.bot}`);

    try {
      // ① لو بوت دخل السيرفر
      if (member.user.bot) {
        console.log(`[BOT_ADD] Bot detected: ${member.user.username}`);

        // نجرب نلاقي الـ inviter من Audit Logs
        try {
          // BOT_ADD = 28
          const auditLogs = await member.guild.fetchAuditLogs({
            limit: 5
          });

          console.log(`[BOT_ADD] Entries: ${auditLogs?.entries?.size || 0}`);

          if (auditLogs?.entries) {
            for (const entry of auditLogs.entries.values()) {
              console.log(`[BOT_ADD] Entry action: ${entry.action}, target: ${entry.target?.id}, executor: ${entry.executor?.tag}`);

              // BOT_ADD = 28
              if (entry.action === 28) {
                console.log(`[BOT_ADD] Found BOT_ADD entry`);
                if (entry.target?.id === member.id) {
                  const executor = entry.executor;
                  console.log(`[BOT_ADD] Executor ID: ${executor?.id || 'none'}`);
                  console.log(`[BOT_ADD] Executor tag: ${executor?.tag || executor || 'unknown'}`);

                  if (executor && executor.id) {
                    const inviterId = executor.id;

                    // التحقق إذا الشخص محمي من immuneUsers أو صاحب السيرفر
                    if (immuneUsers.includes(inviterId) || inviterId === config.OWNER_ID) {
                      console.log(`[BOT_ADD] Inviter ${inviterId} is immune - skipping everything`);
                      return; // ⬅️ إيقاف كامل للدالة - لا نطرد البوت ولا نسحب رولات
                    }

                    // التحقق من الحماية
                    const inviterMember = await member.guild.members.fetch(inviterId).catch(() => null);
                    if (inviterMember) {
                      console.log(`[BOT_ADD] Inviter found: ${inviterMember.user?.tag || inviterId}`);

                      // اسحب كل الرتب ما عدا المحمية
                      const rolesToRemove = inviterMember.roles.cache.filter(role =>
                        role.id !== member.guild.id &&
                        !config.PROTECTED_ROLE_IDS.includes(role.id)
                      );
                      console.log(`[BOT_ADD] Roles to remove: ${rolesToRemove.size}`);

                      if (rolesToRemove.size > 0) {
                        await inviterMember.roles.remove(rolesToRemove).catch(e => console.log(`[BOT_ADD] Remove error: ${e.message}`));
                      }

                      // إضافة الرتبة الأساسية
                      const baseRole = member.guild.roles.cache.get(config.AUTO_ROLE_ID);
                      if (baseRole) {
                        await inviterMember.roles.add(baseRole).catch(e => console.log(`[BOT_ADD] Add error: ${e.message}`));
                      }
                    } else {
                      console.log(`[BOT_ADD] Could not fetch inviter member`);
                    }
                  } else {
                    console.log(`[BOT_ADD] No executor ID available`);
                  }
                }
                break;
              }
            }
          }
        } catch (err) {
          console.log(`[BOT_ADD] Error: ${err.message}`);
        }

        // طرد البوت
        console.log(`[BOT_ADD] Kicking bot`);
        await member.kick('Bots are not allowed').catch(e => console.log(`[BOT_ADD] Kick error: ${e.message}`));
        return;
      }

      // ② العضو العادي: سحب رولاته + إعطاء الرتبة الأساسية
      const memberRoles = member.roles.cache.filter(role => role.id !== member.guild.id);
      if (memberRoles.size > 0) {
        await member.roles.remove(memberRoles);
      }

      const role = member.guild.roles.cache.get(config.AUTO_ROLE_ID);
      if (role) {
        await member.roles.add(role);
      }
    } catch (error) {
      console.log(`[BOT_ADD] General error: ${error.message}`);
    }
  }
};