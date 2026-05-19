// Help Command
// أمر المساعدة

const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'help',
  description: 'Show all commands',
  execute: async (message, args, client) => {
    console.log(`[HELP] ${message.author.tag} requested help command`);
    const embed = new EmbedBuilder()
      .setTitle('<:vanka237:1495225240035262597> Unit S - قائمة الأوامر')
      .setColor(0xDC2626)
      .addFields(
        { name: '<:Security_Red:1495225135979036835> الأدمن', value:
          '`!ban @user [reason]` - حظر عضو\n' +
          '`!unban [user_id]` - إلغاء الحظر\n' +
          '`!kick @user [reason]` - طرد عضو\n' +
          '`!timeout @user [مدة] [سبب]` - تعطيل مؤقت\n' +
          '`!untimeout @user` - إلغاء التعطيل\n' +
          '`!حذف [عدد]` - حذف الرسائل\n' +
          '`!logs` - إعدادات اللوج\n' +
          '`!logs set [type] #channel` - تعيين قناة اللوج\n' +
          '`!modsettings` - إعدادات الأدمن', inline: false },
        { name: '<:warn:1495225561520541848> الرتبة المجانية', value:
          '`!freerank` - عرض أوامر الرتبة المجانية\n' +
          '`!freerank setup` - إنشاء لوحة الرتبة المجانية\n' +
          '`!freerank setrole [ايدي/اسم]` - تعيين الرتبة\n' +
          '`!freerank setmax [عدد]` - تعيين الحد الأقصى\n' +
          '`!freerank stats` - عرض الإحصائيات\n' +
          '`!freerank enable/disable` - تفعيل/تعطيل', inline: false },
        { name: '<:zO_246:1495222454530871346> التشفير', value:
          '`!shfr` - لوحة التشفير\n' +
          '`!enc [نص]` - تشفير نص مباشرة', inline: false },
        { name: '<:Reprot_Flag:1495225797936549908> الحماية', value:
          '`!protect` - لوحة الحماية\n' +
          '`!protect on filter` - تفعيل فلتر الكلمات\n' +
          '`!protect off filter` - تعطيل فلتر الكلمات\n' +
          '`!protect on spam` - تفعيل مضاد السبام\n' +
          '`!protect off spam` - تعطيل مضاد السبام\n' +
          '`!protect on link` - تفعيل منع الروابط\n' +
          '`!protect off link` - تعطيل منع الروابط', inline: false },
        { name: '<:vanka235:1495225345518076034> معلومات', value:
          '`!ping` - سرعة البوت\n' +
          '`!say [رسالة]` - جعل البوت يرسل رسالة\n' +
          '`!terms` - اتفاقية الاستخدام والخصوصية', inline: false },
        { name: '<:voda:1495224120294772928> الفويس 24/7', value:
          '`!24voice` - عرض حالة الفويس\n' +
          '`!24voice [channel_id]` - تشغيل الفويس 24/7\n' +
          '`!24voice stop` - إيقاف الفويس', inline: false },
        { name: '🎫 التذاكر', value:
          '`!ticket` - فتح قائمة التذاكر', inline: false }
      )
      .setFooter({ text: 'Unit S Bot' })
      .setTimestamp();

    await message.channel.send({ embeds: [embed] });
    if (!message.deleted) message.delete().catch(() => {});
  },
};
