// Configuration File
// إعدادات البوت الأساسية

const config = {
  // Bot Token - الحصول من Discord Developer Portal
  TOKEN: process.env.DISCORD_TOKEN || 'YOUR_BOT_TOKEN',

  // Command Prefix
  PREFIX: '!',

  // Owner ID - صاحب السيرفر الوحيد اللي يقدر يتحكم بالبوت
  OWNER_ID: '840134050222964786',

  // Auto Role - الرتبة اللي راح تعطى لكل عضو يدخل
  AUTO_ROLE_ID: '1496992503801319647',

  // Protected Role IDs - الرتب المحمية اللي ما تنسحب
  PROTECTED_ROLE_IDS: [
    '',
    '',
    '',
    '',
    '',
    '',
    ''
  ],

  // Ticket Category ID
  TICKET_CATEGORY_ID: '1494686051716038778',

  // Support Role ID
  SUPPORT_ROLE_ID: '1494685856684970014',

  // Protected Role ID
  PROTECTED_ROLE_ID: '1493346333170340003'
};

module.exports = config;