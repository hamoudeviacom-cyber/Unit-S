# Viper S - Discord Bot

بوت Discord شامل يتضمن نظام الحماية والتشفير وتذكرة بانيل

## المميزات

### 🎫 نظام التذاكر
- إنشاء لوحة تذاكر تفاعلية
- إنشاء تذكرة بنقرة واحدة
- إغلاق التذكرة تلقائياً

### 🛡️ نظام الحماية
- **فلتر الكلمات**: حذف/تحذير/كتم عند استخدام كلمات ممنوعة
- **مكافحة السبام**: منع الإشارات المتكررة والإيموجي спама
- **منع الروابط**: حظر الروابط من مواقع محددة

### 🔒 تشفير المنشورات
- تشفير النص بكلمة مرور
- فك التشفير بسهولة
- نافذة تفاعلية (Modal)

## الأوامر

| الأمر | الوصف |
|-------|-------|
| `!ping` | اختبار اتصال البوت |
| `!ticketpanel` | إنشاء لوحة التذاكر |
| `!close` | إغلاق التذكرة |
| `!encrypt` | فتح نافذة التشفير |

## التثبيت

```bash
# تثبيت التبعيات
pnpm install

# تشغيل البوت
node src/index.js
```

## الإعداد

1. احصل على Bot Token من [Discord Developer Portal](https://discord.com/developers/applications)
2. ضع التوكن في متغير البيئة `DISCORD_TOKEN`
3. فعّل Intentments من Portal:
   - SERVER MEMBERS INTENT
   - MESSAGE CONTENT INTENT

```bash
# Linux/Mac
export DISCORD_TOKEN=your_token_here
node src/index.js

# Windows (PowerShell)
$env:DISCORD_TOKEN="your_token_here"
node src/index.js
```

## الملفات

```
viper-s-bot/
├── package.json
├── src/
│   └── index.js      # الكود الرئيسي
└── README.md
```

## الصلاحيات المطلوبة

البوت يحتاج الصلاحيات التالية:
- `Manage Channels` - لإنشاء التذاكر
- `Manage Messages` - لحذف الرسائل
- `Send Messages` - لإرسال الرسائل
- `Embed Links` - لإرسال Embeds

## ملاحظات

- البوت يستخدم Discord.js v14
- يتطلب Node.js v16.11.0 أو أعلى
- واجهة عربي RTL