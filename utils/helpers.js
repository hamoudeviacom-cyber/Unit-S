// Helper Functions
// دوال مساعدة

import modSettings from '../config/modSettings.js';
import immuneUsers from '../config/immuneUsers.js';
import config from '../config/index.js';

// Check if member has mod role
export function hasModRole(member) {
  if (!member) return false;

  // Check moderation permissions
  if (member.permissions.has('BanMembers')) return true;
  if (member.permissions.has('KickMembers')) return true;

  // Check roles by ID
  for (const roleId of modSettings.adminRoles) {
    if (member.roles.cache.has(roleId)) return true;
  }

  // Check roles by name
  for (const roleName of modSettings.adminRoleNames) {
    const role = member.roles.cache.find(r =>
      r.name.toLowerCase().includes(roleName.toLowerCase())
    );
    if (role) return true;
  }

  // Check username directly
  if (modSettings.adminUsers && modSettings.adminUsers.length > 0) {
    const userName = member.user?.username?.toLowerCase() || '';
    const displayName = member.displayName?.toLowerCase() || '';

    for (const adminName of modSettings.adminUsers) {
      if (userName.includes(adminName.toLowerCase()) || displayName.includes(adminName.toLowerCase())) {
        return true;
      }
    }
  }

  return false;
}

// Check if member is immune (protected)
export function isImmune(member) {
  if (!member) return false;

  // Check immune users list by ID
  if (immuneUsers.includes(member.id)) return true;

  // Check protected role
  if (member.roles.cache.has(config.PROTECTED_ROLE_ID)) return true;

  return false;
}

// Check if member is protected
export function isMemberProtected(member) {
  if (member.id === config.OWNER_ID) return true; // Owner is always protected
  return member.roles.cache.some(role => config.PROTECTED_ROLE_IDS.includes(role.id));
}

// Check if member has ticket admin role
export function hasTicketAdminRole(member) {
  if (!member) return false;

  // Check ManageChannels permission
  if (member.permissions.has('ManageChannels')) return true;

  return false;
}

// Check if member has allowed role for tickets
export function hasAllowedRole(member) {
  if (!member) return false;

  // Everyone is allowed to open tickets
  return true;
}