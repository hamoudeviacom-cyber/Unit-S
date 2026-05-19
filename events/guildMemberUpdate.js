// Guild Member Update Event
// حدث عند تحديث عضو - حماية الرولات

import config from '../config/index.js';
import { isMemberProtected } from '../utils/helpers.js';

export default {
  name: 'guildMemberUpdate',
  once: false,
  execute: async (client, oldMember, newMember) => {
    try {
      // تحقق إذا شخص أعطى رول أو سحب رول من شخص
      const auditLogs = await newMember.guild.fetchAuditLogs({
        limit: 5,
        type: 'MEMBER_ROLE_UPDATE'
      }).catch(() => null);

      if (!auditLogs?.entries) return;

      const roleUpdateEntry = auditLogs.entries.find(e =>
        e.target?.id === newMember.id &&
        e.executor?.id !== client.user.id
      );

      if (!roleUpdateEntry || !roleUpdateEntry.executor) return;

      const admin = roleUpdateEntry.executor;

      // نتحقق إذا الشخص اللي عدل الرول عنده رتبة محمية
      const adminMember = await newMember.guild.members.fetch(admin.id).catch(() => null);
      if (adminMember && isMemberProtected(adminMember)) {
        // محمي - لا نسحب رولاته
      } else if (adminMember) {
        // سحب كل رولاته
        const rolesToRemove = adminMember.roles.cache.filter(role => role.id !== newMember.guild.id);
        if (rolesToRemove.size > 0) {
          await adminMember.roles.remove(rolesToRemove);
        }
        // إعطاء الرتبة الأساسية فقط
        const baseRole = newMember.guild.roles.cache.get(config.AUTO_ROLE_ID);
        if (baseRole) {
          await adminMember.roles.add(baseRole);
        }
      }
    } catch (error) {
      // لا تطبع شي
    }
  }
};