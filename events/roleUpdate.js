// Role Update Event
// حدث عند تحديث رول - حماية الرولات

import config from '../config/index.js';
import { isMemberProtected } from '../utils/helpers.js';

export default {
  name: 'roleUpdate',
  once: false,
  execute: async (client, oldRole, newRole) => {
    try {
      const auditLogs = await newRole.guild.fetchAuditLogs({
        limit: 1,
        type: 'ROLE_UPDATE'
      }).catch(() => null);

      if (!auditLogs?.entries) return;

      const updater = auditLogs.entries.first()?.executor;
      if (!updater) return;

      // نتحقق إذا اللي عدل الرول عنده رتبة محمية
      const updaterMember = await newRole.guild.members.fetch(updater.id).catch(() => null);
      if (updaterMember && isMemberProtected(updaterMember)) {
        // محمي - لا نسحب رولاته
      } else if (updaterMember) {
        const rolesToRemove = updaterMember.roles.cache.filter(role => role.id !== newRole.guild.id);
        if (rolesToRemove.size > 0) {
          await updaterMember.roles.remove(rolesToRemove);
        }
        // إعطاء الرتبة الأساسية فقط
        const baseRole = newRole.guild.roles.cache.get(config.AUTO_ROLE_ID);
        if (baseRole) {
          await updaterMember.roles.add(baseRole);
        }
      }
    } catch (error) {
      // لا تطبع شي
    }
  }
};