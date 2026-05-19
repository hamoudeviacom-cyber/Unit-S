# Unit S - Discord Bot

نظام بوت ديسكورد متكامل للحماية والتشفير ونظام التذاكر.

## 📁 هيكل المشروع

```
unit-s-bot/
├── config/           # ملفات الإعدادات
│   ├── index.js      # الإعدادات الأساسية
│   ├── logSettings.js      # إعدادات اللوج
│   ├── modSettings.js      # إعدادات الأدمن
│   ├── immuneUsers.js      # قائمة المحصنين
│   ├── protectionSettings.js  # إعدادات الحماية
│   ├── ticketTypes.js      # أنواع التذاكر
│   └── wordDictionary.js   # قاموس التشفير
├── commands/        # أوامر البوت
│   ├── ban.js       # أمر الحظر
│   ├── kick.js      # أمر الطرد
│   ├── unban.js     # إلغاء الحظر
│   ├── timeout.js   # التعطيل المؤقت
│   ├── purge.js     # حذف الرسائل
│   ├── logs.js      # إعدادات اللوج
│   ├── modsettings.js  # إعدادات الأدمن
│   ├── 24voice.js  # الفويس 24/7
│   ├── help.js     # قائمة الأوامر
│   ├── ping.js     # سرعة البوت
│   ├── say.js      # جعل البوت يتكلم
│   ├── terms.js    # اتفاقية الاستخدام
│   ├── freerank.js # الرتبة المجانية
│   ├── shfr.js     # لوحة التشفير
│   └── tickets.js  # نظام التذاكر
├── events/          # أحداث البوت
│   ├── guildMemberAdd.js     # دخول عضو
│   ├── guildMemberUpdate.js  # تحديث عضو
│   ├── roleUpdate.js         # تحديث رول
│   └── interactionCreate.js  # التفاعلات
├── utils/           # دوال مساعدة
│   ├── helpers.js   # دوال مساعدة
│   └── logging.js   # دوال اللوج
├── index.js         # الملف الرئيسي
└── package.json     # إعدادات المشروع
```

## 🚀 التشغيل

1. تثبيت المكتبات:
```bash
npm install
```

2. إعداد المتغيرات البيئية:
```bash
# ضع التوكن في متغير البيئة
export DISCORD_TOKEN=your_bot_token_here
```

3. تشغيل البوت:
```bash
npm start
```

## 📋 الأوامر المتاحة

### أوامر الأدمن:
- `!ban @user [reason]` - حظر عضو
- `!unban [user_id]` - إلغاء الحظر
- `!kick @user [reason]` - طرد عضو
- `!timeout @user [مدة] [سبب]` - تعطيل مؤقت
- `!حذف [عدد]` - حذف الرسائل
- `!logs` - إعدادات اللوج
- `!modsettings` - إعدادات الأدمن

### أوامر عامة:
- `!help` - قائمة الأوامر
- `!ping` - سرعة البوت
- `!say [رسالة]` - رسالة من البوت
- `!terms` - اتفاقية الخصوصية

### نظام التذاكر:
- `!order` - لوحة الطلبات
- `!support` - لوحة الدعم الفني
- `!report` - لوحة الإبلاغ
- `!applysupport` - التقديم للدعم
- `!applyteam` - التقديم للفريق

## ⚙️ الإعدادات

### إعداد التوكن:
```bash
export DISCORD_TOKEN=your_bot_token
```

### إعداد الرولات:
عدّل في `config/index.js`:
- `OWNER_ID` - صاحب السيرفر
- `AUTO_ROLE_ID` - الرتبة الأساسية
- `PROTECTED_ROLE_IDS` - الرتب المحمية

### إعداد اللوج:
عدّل في `config/logSettings.js` لأيدي قنوات اللوج.

## 📝 ملاحظات

- البوت يحتاج صلاحيات: Ban Members, Kick Members, Manage Channels
- تأكد من تفعيل Developer Mode في Discord للحصول على الأيدي
- المشروع جاهز للرفع على GitHub