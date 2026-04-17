// Unit S - Discord Bot
// نظام الحماية والتشفير وتذكرة بانيل

import { Client, GatewayIntentBits, Collection, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ComponentType } from 'discord.js';

const TOKEN = process.env.DISCORD_TOKEN || 'YOUR_BOT_TOKEN';
const PREFIX = '!';

// Initialize Client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  partials: ['CHANNEL', 'GUILD_MEMBER', 'USER'],
});

// Collections
client.commands = new Collection();
client.encryptedPosts = new Collection();
client.ticketCounter = 0;
client.ticketClaims = new Collection(); // لتتبع من استلم التذكرة

// ============ Ticket Settings ============
const COLORS = {
  unitS: 0x8B5CF6,
  unitSDark: 0x1E1B4B,
  danger: 0xDC2626,
  success: 0x10B981,
  warning: 0xF59E0B,
  info: 0x3B82F6,
  primary: 0x667eea,
};

const ticketSettings = {
  allowedRoles: [],
  allowedRoleNames: [],
  ticketAdminRoles: [],
  ticketAdminRoleNames: ['عمر', 'ا'],
  ticketAdminUsers: ['عمر'], // المستخدمين المسموح لهم بإدارة التذاكر
  logsChannelId: null,
  mentionRoleId: null,
  mentionRoleName: null,
  // إعدادات التكت
  ticketPanelTitle: 'Unit S Tickets',
  welcomeTitle: 'Welcome To Unit S support',
  welcomeSubtitle: 'Choose The Ticket That You Want To Open',
  ticketPrefix: 'Unit S Tickets',
};

// ============ Word Encryption Dictionary ============
const wordDictionary = {
    "يوزرات": "يـ9ـزرات",
    "يوزر": "يـ9ـزر",
    "سيرفرات": "سيـRـفرات",
    "السيرفر": "السيـRـفر",
    "سيرفر": "سيـRـفر",
    "للبيع": "للبيـ3",
    "وسيط": "9ـسـيـt",
    "دسكورد": "ديسـkـ9رد",
    "فلوس": "فلـ9ـس",
    "الدفع": "الـDـفـ3",
    "ستيم": "ستيـm",
    "تهكير": "Tهـkـير",
    "رابط": "ر1بط",
    "أيدي": "١دي",
    "أداة": "١د١ة",
    "الأيميل": "الأيـmـيل",
    "أيميل": "أيـmـيل",
    "تشتري": "تشـtـري",
    "اسعارنا": "اسـ3ـارنا",
    "اعضاء": "اعـ3ـاء",
    "العاب": "الـ3ـاب",
    "شحن": "شـ7ـن",
    "تبيع": "تبيـ3",
    "افكتات": "افـkـتاt",
    "افكت": "افـkـت",
    "شراء": "شر1ء",
    "بيع": "بيـ3",
    "سعر": "سـ3ـر",
    "سومك": "سـ9ـمـk",
    "خاصي": "خـ1صي",
    "سعرك": "سـ3ـرk",
    "السعر": "الـ5ـ3ـر",
    "ديسكورد": "ديسـkـ9رد",
    "انواع": "انـ9ـ1ع",
    "الدفعة": "الـDـفـ3ـة",
    "بوتات": "بـ9ـتات",
    "بوت": "بـ9ـت",
    "كريبتو": "كـRبتـ9",
    "بوستات": "بـ9ـستات",
    "بوست": "بـ9ـست",
    "انشاء": "انشـ1ء",
    "مقابل": "مقـ1بل",
    "الجوال": "الجـ9ـ1ل",
    "نيتروهات": "نيتر97ـات",
    "روبلوكس": "ر9بلـkـس",
    "حسابات": "7ـسابات",
    "حسابك": "7ـسابـk",
    "أسعار": "أسـ3ـ1ر",
    "اسعاري": "اسـ3ـاري",
    "جواهر": "جـ9ـاهر",
    "بالسوق": "بالسـ9ـq",
    "السوق": "الـ5ـوق",
    "سوق": "5ـ9ـq",
    "طريقة": "طريـkـة",
    "توكن": "تـ9ـكـn",
    "بروجكت": "بر9جـkـت",
    "ايفون": "ايـFـون",
    "متوفر": "متـ9ـفر",
    "بروجكتات": "بر9جكتات",
    "روبوكس": "ر9ـبوكس",
    "نيترو": "نيتر9",
    "لايكات": "لايـkـات",
    "انستا": "انسـtـا",
    "كريدت": "كريـDـت",
    "اسياسيل": "اسـeـاسيل",
    "دفع": "دفـ3",
    "فوري": "فـ9ـري",
    "طلب": "tـلب",
    "مطلوب": "مـtـل9ب",
    "استفسار": "استفسـ1ر",
    "تسليم": "تـ5ـليم",
    "طرق": "طرk",
    "يوتيوب": "يـ9ـتيوب",
    "جوجل": "جـ9ـجل",
    "جيملات": "جيـmـلات",
    "نتفلكس": "نتفلـkـس",
    "ثمن": "ثـmـن",
    "كاش": "كـ1ش",
    "خاص": "خ1ص"
};

// ============ Protection Settings ============
const protectionSettings = {
  wordFilter: {
    enabled: true,
    words: [
      'كلب', 'كلابة', 'كلبي', 'كلب انت', 'كلب انتم', 'كلاب',
      'حمار', 'حمارة', 'حمير', 'حمار انت', 'حمار انتم',
      'بغل', 'بغلة', 'بغال', 'بغل انت',
      'خنزير', 'خنزرة', 'خنازير', 'خنزير انت',
      'قذر', 'قذرة', 'قذرين', 'اقذر', 'اقذر',
      'وضيع', 'وضيعة', 'وضعين', 'ابوس', 'ابوسه',
      'وسخ', 'وسخة', 'وساخ', 'اوسخ',
      'لئيم', 'لئيمة', 'لئيمين', 'الئيم',
      'مقرف', 'مقرفة', 'مقرفين', 'اقرف', 'اقرفه',
      'كريه', 'كريهة', 'كريهين', 'اكريه',
      'لص', 'لصة', 'لصوص', 'لص انت',
      'حرامي', 'حرامية', 'حرامي انت', 'حرامي انتم',
      'نصاب', 'نصابه', 'نصاب انت', 'نصابين',
      'غشاش', 'غشاشة', 'غشاش انت', 'غشاشة انتم',
      'خاين', 'خاينة', 'خاينة انت', 'خاينة انتم',
      'جاحد', 'جاحدة', 'جاحدين', 'جاحد انت',
      'مجنون', 'مجنونة', 'مجانين', 'مجنون انت',
      'احمق', 'حمقاء', 'احمق انت', 'حمقاء انت',
      'ابله', 'ابله', 'ابلاه', 'ابنة ابله',
      'معتوه', 'معتوهة', 'معتوهين', 'معتوه انت',
      'مخبول', 'مخبولة', 'مخبولين', 'مخبول انت',
      'ديوث', 'ديوث انت', 'ديوث انتم',
      'عرص', 'عرصة', 'عرص انت', 'عرصة انتي',
      'منيوك', 'منيوك انت', 'منيوكة', 'منيوكة انتي',
      'متناك', 'متناك انت', 'متناكة', 'متناكة انتي',
      'خرفان', 'خرفانة', 'خرفانين', 'خرفان انت',
      'خرف', 'خرفة', 'خرف انت', 'خرفان',
      'متلبط', 'متلبطة', 'متلبطين', 'متلبط انت',
      'مخمور', 'مخمورة', 'مخمورين', 'مخمور انت',
      'ملط', 'ملط انت', 'ملط انتم',
      'عرص', 'عرصة', 'عرصه', 'عرص انت',
      'شنخ', 'شنخة', 'شنخ انت',
      'نتن', 'نتنه', 'نتن انت', 'نتانة',
      'سم', 'سموم', 'سم انت', 'سمك',
      'زب', 'زبي', 'زب انت', 'زبي انت',
      'قحب', 'قحبة', 'قحب انت', 'قحبة انت',
      'خرا', 'خري', 'خراء', 'كخرا', 'خرو',
      'بعر', 'بعر انت', 'بعار', 'بعران',
      'جيفة', 'جيف', 'جيف انت', 'جيفة انت',
      'شبه', 'شبهي', 'شبه انت', 'شبها',
      'قذار', 'قذارة', 'قذار انت', 'قذار انتم',
      'مشتهي', 'مشتهية', 'مشتهي انت', 'مشتهية انتتي',
      'شغالة', 'شغالات', 'شغال', 'شغالة انت',
      'نشالة', 'نشال', 'نشالة انت', 'نشال انت',
      'ساقطة', 'ساقط', 'ساقطة انت', 'ساقط انت',
      'شواذ', 'شاذ', 'شاذة', 'شاذ انت', 'شاذة انت',
      'لوطي', 'لوطية', 'لوط انت', 'لوطية انت',
      'مثلي', 'مثليه', 'مثلي انت', 'مثليه انت',
      'زاني', 'زانية', 'زنا', 'زناء', 'زنت', 'يزني',
      'بذيء', 'بذيئة', 'بذاء', 'بذاء انت',
      'فاجر', 'فاجرة', 'فاجر انت', 'فاجرة انت',
      'عاهر', 'عاهرة', 'عهر', 'عاهر انت', 'عاهرة انت',
      'دعارة', 'دعارة انت', 'دعارة انتم', 'بزاز',
      'فاسق', 'فاسقة', 'فسق', 'فاسق انت', 'فسق انت',
      'ناكر', 'ناكرة', 'ناكرين', 'ناكر جارك',
      'جاحد', 'جاحدة', 'جاحدين', 'جاحد الغير',
      'خبيث', 'خبث', 'خبث انت', 'خبث انتم',
      'ناهب', 'ناهبة', 'ناهب انت', 'ناهب انتم',
      'لقيط', 'لقيطة', 'لقط', 'لقيط انت',
      'وساخ', 'وساخ انت', 'وسيخ', 'وسيخ انت',
      'زنديق', 'زنديقة', 'زنديق انت', 'زنديقة انت',
      'فساد', 'فساد انت', 'فساد انتم',
      'مستحيل', 'مستحيلة', 'مستحيل انت',
      'بلطجي', 'بلطجية', 'بلطجي انت', 'بلطجية انت',
      'عتل', 'عتلة', 'عتلين', 'عتل انت',
      'ضرس', 'ضرس انت', 'ضرسين', 'ضرس انت',
      'بشع', 'بشعة', 'بشع انت', 'بشعة انت',
      'لزج', 'لزجة', 'لزج انت', 'لزجة انت',
      'زبالة', 'زبال', 'زبالة انت', 'زبال انت',
      'قمامة', 'قمامة انت', 'قمامة انتم',
      'نفاية', 'نفايات', 'نفاية انت',
      'مشنق', 'مشنوقة', 'مشنق انت', 'مشنوقة انت',
      'مشنقة', 'مشنقات', 'مشنقة انت',
      'زنقة', 'زنقات', 'زنقة انت',
      'بوش', 'بوشة', 'بوش انت', 'بوشة انت',
      'جبان', 'جبانة', 'جبان انت', 'جبانة انت',
      'لؤيم', 'لؤيمة', 'لؤيم انت', 'لؤيمة انت',
      'بغيض', 'بغيضة', 'بغيض انت', 'بغيضة انت',
      'حقير', 'حقيرة', 'حقير انت', 'حقيرة انت',
      'مستاهل', 'مستحيلة', 'مستاهل انت',
      'ابل', 'ابنة ابل', 'ابل انت', 'ابنة ابل انت',
      'كس', 'كس امك', 'كس ابوك', 'كس امكم',
      'كس امه', 'كس ابيه', 'كس اباهم',
      'كسختك', 'كسختك انت', 'كسختكم', 'كسختهم',
      'كس اختك', 'كس اخوك', 'كس اخاهم',
      'كس عمي', 'كس خالي', 'كس عمك', 'كس خالك',
      'يلعن', 'يلعنك', 'يلعنكم', 'يلعنهم',
      'يلعن ابوك', 'يلعن ابيك', 'يلعن امك', 'يلعن امكم',
      'يلعن ابوه', 'يلعن اباهم', 'يلعنامه',
      'يلعن موتك', 'يلعن حياتك', 'يلعن يومك',
      'لعنة', 'لعنة الله', 'اللعنة', 'لعنتك',
      'لعنة ابوك', 'لعنة ابيك', 'لعنة امك', 'لعنة ابوكم',
      'خرب', 'خربان', 'خربانه', 'خرب انت',
      'طخ', 'طخة', 'طخ انت', 'اطخ',
      'شخ', 'شخة', 'شخ انت', 'اشخ',
      'بع', 'بعة', 'بع انت', 'ابوع',
      'نخ', 'نخة', 'نخ انت', 'انخ',
      'زخ', 'زخة', 'زخ انت', 'ازخ',
      'خخ', 'خة', 'خخ انت', 'خة انت',
      'اخرس', 'اخرس انت', 'اسكت', 'اسكت انت',
      'ابصق', 'ابصق انت', 'ابصق فيك', 'ابصق بوجهك',
      'اطحن', 'اطحنك', 'اطحنه', 'اطحنت',
      'اشقط', 'اشقطك', 'اشقطه', 'اشقطوا',
      'اقتل', 'اقتلك', 'اقتله', 'اقتلها', 'اقتلوني',
      'اقاتلك', 'اقاتلله', 'اقاتلكم', 'اقاتلهم',
      'اوزع', 'اوزعك', 'اوزعه', 'اوعز',
      'ابطح', 'ابطحك', 'ابطحه', 'ابطحوا',
      'اضرب', 'اضربك', 'اضربه', 'اضربها', 'اضربوني',
      'سب', 'سبك', 'سبه', 'سبها', 'سبوني',
      'اشتم', 'اشتمك', 'اشتمه', 'اشتمها', 'اشتموني',
      'احق', 'احقك', 'احقه', 'احقها',
      'اهن', 'اهنك', 'اهنك', 'اهنه',
      'اذله', 'اذلك', 'اذله', 'اذلهم',
      'اذاك', 'اذاكك', 'اذاكه', 'اذاهم',
      'نكت', 'نكتك', 'نكتهم', 'انكت',
      'سخ', 'سخة', 'سخ انت', 'اسخ',
      'زهق', 'زهقة', 'زهق انت', 'ازهق',
      'مش', 'مش انت', 'مش انتما', 'مش انتم',
      'بلا', 'بلاش', 'بلا حياء', 'بلا عرض',
      'لا حياء', 'لا عرض', 'لا شرف', 'لا غيرة',
      'بلا وجه', 'بلا حياء', 'بلا مروءة',
      'وجه', 'وجهك', 'وجهك انت', 'وجه الحر',
      'رش', 'رش انت', 'ارش', 'رشاش',
      'دعس', 'دعست', 'دعس انت', 'ادعس',
      'طح', 'طحة', 'طح انت', 'اطح',
      'فل', 'فعة', 'فل انت', 'افشل',
      'شقل', 'شقلت', 'شقل انت', 'اشقل',
      'خبل', 'خبل انت', 'اخبل', 'خبلان',
      'خدر', 'خدر انت', 'اخدر', 'خدران',
      'زن', 'زنة', 'زن انت', 'ازن',
      'عرص', 'عرصة', 'عرص انت', 'عرصة انت',
      'عرص', 'عرصك', 'عرصه', 'عرصها',
      'طمث', 'طمثة', 'طمث انت', 'اطمث',
      'سمم', 'سممت', 'سمم انت', 'اسمم',
      'سم', 'سمك', 'سمك انت', 'سممه',
      'نجس', 'نجسة', 'نجس انت', 'انجس',
      'خبث', 'خبث انت', 'اخبث', 'خبثان',
      'فسق', 'فسق انت', 'افسق', 'فسوق',
      'فساد', 'فساد انت', 'افساد', 'فسد',
      'سحق', 'سحق انت', 'اسحق', 'سحاق',
      'زنق', 'زنقة', 'زنق انت', 'ازنق',
      'سب', 'سبك', 'سبه', 'سبها', 'سبوني',
      'شتم', 'شتمك', 'شتمه', 'شتمها', 'شتموني',
      'هن', 'هنك', 'هنه', 'اهن',
      'ذل', 'ذلك', 'ذله', 'اذل',
      'ذل', 'ذلت', 'ذلت انت', 'اذلتك',
      'عيب', 'عيب انت', 'عيبكم', 'عيبهم',
      'عار', 'عارك', 'عاركم', 'عارهم',
      'فضيحة', 'فضيحتكم', 'فضيحته', 'فضيحتها',
      'حرام', 'حرام عليك', 'حرام عليكم', 'حرام عليهم',
      'عيب', 'عيب عليك', 'عيب عليكم', 'عيب عليهم',
      'قبح', 'قبحك', 'قبحه', 'اقبح',
      'قذور', 'قذور انت', 'اقذور',
      'رجس', 'رجس انت', 'ارجس', 'رجس',
      'خبث', 'خبث', 'خبث انت', 'خبثكم',
      'نتن', 'نتنت', 'نتن انت', 'انتان',
      'سموم', 'سموم انت', 'سميم', 'سميمة',
      'سم', 'سمك', 'سمم', 'سممت',
      'جيفة', 'جيف', 'جيف انت', 'جيفة انت',
      'قذار', 'قذار', 'قذار انت', 'قذار انتم',
      'قذارة', 'قذارة انت', 'قذارة انتم',
      'مشتهي', 'مشتهي انت', 'مشتهية انت', 'مشتهي انتم',
      'مشتهية', 'مشتهي', 'مشتهية انت', 'مشتهية انتم',
      'زب', 'زبي', 'زب انت', 'زبي انت',
      'قحب', 'قحبة', 'قحب انت', 'قحبة انت',
      'قحبة', 'قحب', 'قحبة انت', 'قحب انت',
      'عرص', 'عرصة', 'عرص انت', 'عرصة انت',
      'متناك', 'متناكة', 'متناك انت', 'متناكة انت',
      'منيوك', 'منيوج', 'منيوك انت', 'منيوج انت',
      'خرفان', 'خرفانة', 'خرفان انت', 'خرفانة انت',
      'معتوه', 'معتوهة', 'معتوه انت', 'معتوهة انت',
      'مجنون', 'مجنونة', 'مجنون انت', 'مجنونة انت',
      'مختال', 'مختالة', 'مختال انت', 'مختالة انت',
      'جبان', 'جبانة', 'جبان انت', 'جبانة انت',
      'لئيم', 'لئيمة', 'لئيم انت', 'لئيمة انت',
      'لؤيم', 'لؤيمة', 'لؤيم انت', 'لؤيمة انت',
      'بغيض', 'بغيضة', 'بغيض انت', 'بغيضة انت',
      'كريه', 'كريهة', 'كريه انت', 'كريهة انت',
      'مقرف', 'مقرفة', 'مقرف انت', 'مقرفة انت',
      'قذر', 'قذرة', 'قذر انت', 'قذرة انت',
      'وضيع', 'وضيعة', 'وضيع انت', 'وضيعة انت',
      'لص', 'لصة', 'لص انت', 'لصة انت',
      'حرامي', 'حرامية', 'حرامي انت', 'حرامية انت',
      'نصاب', 'نصابه', 'نصاب انت', 'نصابه انت',
      'غشاش', 'غشاشة', 'غشاش انت', 'غشاشة انت',
      'خاين', 'خاينة', 'خاين انت', 'خاينة انت',
      'ناهب', 'ناهبة', 'ناهب انت', 'ناهبة انت',
      'جاحد', 'جاحدة', 'جاحد انت', 'جاحدة انت',
      'ناكر', 'ناكرة', 'ناكر انت', 'ناكرة انت',
      'خبيث', 'خبث', 'خبيث انت', 'خبث انت',
      'لقيط', 'لقيطة', 'لقيط انت', 'لقيطة انت',
      'وسخ', 'وسخة', 'وسخ انت', 'وسخة انت',
      'وساخ', 'وسيخ', 'وساخ انت', 'وسيخ انت',
      'زنديق', 'زنديقة', 'زنديق انت', 'زنديقة انت',
      'بلطجي', 'بلطجية', 'بلطجي انت', 'بلطجية انت',
      'عتل', 'عتلة', 'عتلين', 'عتل انت',
      'بشع', 'بشعة', 'بشع انت', 'بشعة انت',
      'لزج', 'لزجة', 'لزج انت', 'لزجة انت',
      'زبالة', 'زبال', 'زبالة انت', 'زبال انت',
      'قمامة', 'قمامة انت', 'قمامة انتم',
      'نفاية', 'نفايات', 'نفاية انت', 'نفايات انت',
      'مشنق', 'مشنوقة', 'مشنق انت', 'مشنوقة انت',
      'زنقة', 'زنقات', 'زنقة انت', 'زنقات انت',
      'بوش', 'بوشة', 'بوش انت', 'بوشة انت',
      'خرف', 'خرفة', 'خرف انت', 'خرفة انت',
      'متناك', 'متناكة', 'متناك انت', 'متناكة انت',
      'خرفان', 'خرفانة', 'خرفان انت', 'خرفانة انت',
      'منيوج', 'منيوك', 'منيوج انت', 'منيوك انت',
      'عرص', 'عرصة', 'عرص انت', 'عرصة انت',
      'مش', 'مش انت', 'مش انتما', 'مش انتم',
      'بلا حياء', 'بلا عرض', 'بلا شرف', 'بلا غيرة',
      'بلا وجه', 'بلا مروءة', 'بلا honor',
      'لا حياء', 'لا عرض', 'لا شرف', 'لا غيرة',
      'لا honor', 'بدون honor',
      'وجه', 'وجهك', 'وجهك انت', 'وجه الحر',
      'عيب', 'عيب عليك', 'عيب عليكم', 'عيب عليهم',
      'عار', 'عارك', 'عاركم', 'عارهم',
      'فضيحة', 'فضيحتكم', 'فضيحته', 'فضيحتها',
      'حرام', 'حرام عليك', 'حرام عليكم', 'حرام عليهم',
      'قبح', 'قبحك', 'قبحه', 'اقبح',
      'قذور', 'قذور انت', 'اقذور',
      'رجس', 'رجس انت', 'ارجس', 'رجس',
      'نجس', 'نجسة', 'نجس انت', 'انجس',
      'خبث', 'خبث انت', 'اخبث', 'خبثان',
      'فسق', 'فسق انت', 'افسق', 'فسوق',
      'فساد', 'فساد انت', 'افساد', 'فسد',
      'سحق', 'سحق انت', 'اسحق', 'سحاق',
      'زنق', 'زنقة', 'زنق انت', 'ازنق'
    ],
    action: 'delete',
  },
  antiSpam: {
    enabled: true,
    maxMentions: 3,
    maxEmojis: 10,
    maxMessages: 5,
    timeWindow: 5000,
  },
  antiLink: {
    enabled: true,
    blacklistedDomains: ['discord.gg', 'bit.ly', 'tinyurl.com'],
    whitelistedDomains: ['youtube.com', 'twitch.tv'],
  },
};

// Anti-Spam Tracker
const antiSpamTracker = new Map();

// ============ EMBED COLORS ============
// ملاحظة: COLORS معرّف مسبقاً في السطر 27

// ============ TICKET HELPER FUNCTIONS ============

function hasTicketAdminRole(member) {
  if (!member) return false;

  // صلاحيات ManageChannels
  if (member.permissions.has('ManageChannels')) return true;

  // التحقق من الرولات بالأيدي
  for (const roleId of ticketSettings.ticketAdminRoles) {
    if (member.roles.cache.has(roleId)) return true;
  }

  // التحقق من الرولات بالأسماء
  for (const roleName of ticketSettings.ticketAdminRoleNames) {
    const role = member.roles.cache.find(r =>
      r.name.toLowerCase().includes(roleName.toLowerCase())
    );
    if (role) return true;
  }

  // التحقق من اسم المستخدم مباشرة
  if (ticketSettings.ticketAdminUsers && ticketSettings.ticketAdminUsers.length > 0) {
    const userName = member.user?.username?.toLowerCase() || '';
    const displayName = member.displayName?.toLowerCase() || '';

    for (const adminName of ticketSettings.ticketAdminUsers) {
      if (userName.includes(adminName.toLowerCase()) || displayName.includes(adminName.toLowerCase())) {
        return true;
      }
    }
  }

  return false;
}

function hasAllowedRole(member) {
  if (!member) return false;

  if (ticketSettings.allowedRoles.length === 0 && ticketSettings.allowedRoleNames.length === 0) {
    return true;
  }

  for (const roleId of ticketSettings.allowedRoles) {
    if (member.roles.cache.has(roleId)) return true;
  }

  for (const roleName of ticketSettings.allowedRoleNames) {
    const role = member.roles.cache.find(r =>
      r.name.toLowerCase().includes(roleName.toLowerCase())
    );
    if (role) return true;
  }

  return false;
}

function formatTimeAgo(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return 'Just now';
}

async function logTicketTranscript(channel, closedBy, reason = 'لم يذكر') {
  try {
    const messages = await channel.messages.fetch({ limit: 100 }).catch(() => new Collection());
    const sortedMessages = messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

    let transcript = `=== لوجس التذكرة: ${channel.name} ===\n`;
    transcript += `تاريخ الإغلاق: ${new Date().toLocaleString('ar-SA')}\n`;
    transcript += `مقام من: ${closedBy.tag || closedBy.username || 'غير معروف'}\n`;
    transcript += `السبب: ${reason}\n`;
    transcript += `عدد الرسائل: ${messages.size}\n`;
    transcript += '================================\n\n';

    for (const msg of sortedMessages.values()) {
      const timestamp = new Date(msg.createdTimestamp).toLocaleString('ar-SA');
      const author = msg.author.tag;
      const content = msg.content || '[رسالة بدون نص]';

      let attachments = '';
      if (msg.attachments.size > 0) {
        attachments = ' [مرفقات: ' + msg.attachments.map(a => a.name).join(', ') + ']';
      }

      transcript += `[${timestamp}] ${author}: ${content}${attachments}\n`;
    }

    transcript += '\n=== نهاية اللوجس ===';

    const logsChannel = client.channels.cache.get(ticketSettings.logsChannelId);
    if (logsChannel) {
      await logsChannel.send({
        content: `📋 **لوجس تذكرة مغلقة: ${channel.name}**\nتم الإغلاق من: ${closedBy.tag || closedBy.username}\nالسبب: ${reason}`,
        files: [{
          attachment: Buffer.from(transcript, 'utf8'),
          name: `ticket-${channel.name}-${Date.now()}.txt`
        }]
      });
    }

    return true;
  } catch (error) {
    console.error('Error logging ticket transcript:', error);
    return false;
  }
}

// ============ HELP COMMAND ============
client.commands.set('help', {
  name: 'help',
  description: 'Show all commands',
  execute: async (message) => {
    const embed = new EmbedBuilder()
      .setTitle('Unit S - قائمة الأوامر')
      .setColor(0xDC2626)
      .addFields(
        { name: '🎫 التذاكر', value:
          '`!ticket` - فتح قائمة التذاكر\n' +
          '`!tmanage` - عرض قائمة التذاكر\n' +
          '`!tmanage close` - إغلاق التذكرة\n' +
          '`!tmanage addrole @رول` - إضافة رول للتذاكر\n' +
          '`!tmanage removerole @رول` - إزالة رول\n' +
          '`!tmanage addadmin @رول` - إضافة أدمن تذاكر\n' +
          '`!tmanage removeadmin @رول` - إزالة أدمن\n' +
          '`!tmanage roles` - عرض الرولات\n' +
          '`!tmanage admins` - عرض الأدمنز\n' +
          '`!tmanage setlogs #قناة` - تعيين قناة اللوجس\n' +
          '`!tmanage setmention @رول` - تعيين رول للمنشن\n' +
          '`!tmanage mention` - عرض إعدادات المنشن', inline: false },
        { name: '🔒 التشفير', value:
          '`!shfr` - لوحة التشفير\n' +
          '`!enc [نص]` - تشفير نص مباشرة', inline: false },
        { name: '🛡️ الحماية', value:
          '`!protect` - لوحة الحماية\n' +
          '`!protect on filter` - تفعيل فلتر الكلمات\n' +
          '`!protect off filter` - تعطيل فلتر الكلمات\n' +
          '`!protect on spam` - تفعيل مضاد السبام\n' +
          '`!protect off spam` - تعطيل مضاد السبام\n' +
          '`!protect on link` - تفعيل منع الروابط\n' +
          '`!protect off link` - تعطيل منع الروابط', inline: false },
        { name: '📊 معلومات', value:
          '`!ping` - سرعة البوت', inline: false }
      )
      .setFooter({ text: 'Unit S Bot' })
      .setTimestamp();

    await message.channel.send({ embeds: [embed] });
    if (!message.deleted) message.delete().catch(() => {});
  },
});

// ============ PING COMMAND ============
client.commands.set('ping', {
  name: 'ping',
  description: 'Test bot latency',
  execute: async (message) => {
    const ping = Date.now() - message.createdTimestamp;
    const apiPing = client.ws.ping;

    const embed = new EmbedBuilder()
      .setTitle('🏓 Pong!')
      .setColor(0xDC2626)
      .addFields(
        { name: 'Latency', value: `${ping}ms`, inline: true },
        { name: 'API Ping', value: `${apiPing}ms`, inline: true }
      )
      .setTimestamp();

    await message.channel.send({ embeds: [embed] });
    if (!message.deleted) message.delete().catch(() => {});
  },
});

// ============ TICKET MENU - Unit S Design ============
client.commands.set('ticket', {
  name: 'ticket',
  description: 'Open ticket menu - Unit S design',
  execute: async (message) => {
    if (!hasAllowedRole(message.member)) {
      await message.channel.send('❌ ليس لديك صلاحية لفتح تذكرة!');
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(`🎫 ${ticketSettings.ticketPanelTitle} :`)
      .setDescription(`${ticketSettings.welcomeTitle}\n${ticketSettings.welcomeSubtitle}`)
      .setColor(0xDC2626)
      .setFooter({ text: 'Unit S | Support System' });

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('ticket_select')
      .setPlaceholder('Choose The Ticket...')
      .addOptions([
        new StringSelectMenuOptionBuilder({
          label: 'دعم فني',
          description: 'الدعم الفني للمشاكل التقنية',
          value: 'support',
          emoji: '🔧',
        }),
        new StringSelectMenuOptionBuilder({
          label: 'شكاوي',
          description: 'للتقدم بشكوى',
          value: 'complaint',
          emoji: '⚠️',
        }),
        new StringSelectMenuOptionBuilder({
          label: 'استفسار',
          description: 'للاستفسار عن أي موضوع',
          value: 'inquiry',
          emoji: '❓',
        }),
      ]);

    const row = new ActionRowBuilder().addComponents(selectMenu);
    await message.channel.send({ embeds: [embed], components: [row] });
    if (!message.deleted) message.delete().catch(() => {});
  },
});

// ============ ENCRYPT PANEL COMMAND ============
client.commands.set('shfr', {
  name: 'shfr',
  description: 'Open encryption panel',
  execute: async (message) => {
    try {
      const embed = new EmbedBuilder()
        .setTitle('🔒 Unit S | التشفير')
        .setDescription('لتشفير منشورك، اضغط على الزر أدناه')
        .setColor(0xDC2626)
        .addFields(
          { name: '✨ المميزات:', value: '• تشفير الكلمات المحظورة\n• يعمل بكفاءة عالية\n• آمن وسريع', inline: false }
        )
        .setFooter({ text: 'Unit S | للتشفير اضغط الزر' })
        .setTimestamp();

      const encryptButton = new ButtonBuilder()
        .setCustomId('shfr_post')
        .setLabel('شفر منشورك')
        .setStyle(ButtonStyle.Success);

      const row = new ActionRowBuilder().addComponents(encryptButton);
      await message.channel.send({ embeds: [embed], components: [row] });
      if (!message.deleted) message.delete().catch(() => {});
    } catch (error) {
      console.error('shfr command error:', error);
    }
  },
});

// ============ ENCRYPT COMMAND ============
client.commands.set('enc', {
  name: 'enc',
  description: 'Encrypt text directly',
  execute: async (message, args) => {
    if (args.length === 0) {
      await message.channel.send('❌ استخدم: `!enc [النص]`');
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    const text = args.join(' ');
    const encrypted = encryptText(text);

    const embed = new EmbedBuilder()
      .setTitle('🔒 تم تشفير النص!')
      .setColor(0xDC2626)
      .addFields(
        { name: 'النص الأصلي:', value: `\`\`\`\n${text}\n\`\`\`` },
        { name: 'النص المشفر:', value: `\`\`\`\n${encrypted}\n\`\`\`` }
      )
      .setFooter({ text: 'Unit S | التشفير' });

    await message.channel.send({ embeds: [embed] });
    if (!message.deleted) message.delete().catch(() => {});
  },
});

// ============ PROTECTION MENU ============
client.commands.set('protect', {
  name: 'protect',
  description: 'Protection control panel',
  execute: async (message) => {
    if (!message.member.permissions.has('ManageMessages')) {
      await message.channel.send('❌ ليس لديك صلاحية!');
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    const wordFilterStatus = protectionSettings.wordFilter.enabled ? '✅ مفعّل' : '❌ معطّل';
    const antiSpamStatus = protectionSettings.antiSpam.enabled ? '✅ مفعّل' : '❌ معطّل';
    const antiLinkStatus = protectionSettings.antiLink.enabled ? '✅ مفعّل' : '❌ معطّل';

    const embed = new EmbedBuilder()
      .setTitle('🛡️ لوحة التحكم - الحماية')
      .setColor(0xDC2626)
      .addFields(
        { name: 'حالة الحماية:', value: '━━━━━━━━━━━━━━━', inline: false },
        { name: '🔤 فلتر الكلمات:', value: wordFilterStatus, inline: true },
        { name: '🛑 مضاد السبام:', value: antiSpamStatus, inline: true },
        { name: '🔗 منع الروابط:', value: antiLinkStatus, inline: true },
        { name: '\n📝 الأوامر:', value: '━━━━━━━━━━━━━━━', inline: false },
        { name: '', value: '`!protect on filter` - تفعيل فلتر الكلمات\n`!protect off filter` - تعطيل فلتر الكلمات\n`!protect on spam` - تفعيل مضاد السبام\n`!protect off spam` - تعطيل مضاد السبام\n`!protect on link` - تفعيل منع الروابط\n`!protect off link` - تعطيل منع الروابط', inline: false }
      )
      .setFooter({ text: 'Unit S | الإدارة' })
      .setTimestamp();

    await message.channel.send({ embeds: [embed] });
    if (!message.deleted) message.delete().catch(() => {});
  },
});

// ============ PROTECTION TOGGLE COMMAND ============
client.commands.set('protect_toggle', {
  name: 'protect',
  aliases: ['p'],
  execute: async (message, args) => {
    if (!message.member.permissions.has('ManageMessages')) {
      await message.channel.send('❌ ليس لديك صلاحية!');
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    if (args.length < 2) {
      await message.channel.send('❌ استخدم: `!protect on/off [filter/spam/link]`');
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    const action = args[0].toLowerCase();
    const type = args[1].toLowerCase();

    if (!['on', 'off'].includes(action)) {
      await message.channel.send('❌ استخدم: `!protect on/off [filter/spam/link]`');
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    const enable = action === 'on';
    let updated = false;
    let featureName = '';

    switch (type) {
      case 'filter':
      case 'word':
        protectionSettings.wordFilter.enabled = enable;
        updated = true;
        featureName = 'فلتر الكلمات';
        break;
      case 'spam':
      case 'antispam':
        protectionSettings.antiSpam.enabled = enable;
        updated = true;
        featureName = 'مضاد السبام';
        break;
      case 'link':
      case 'antilink':
        protectionSettings.antiLink.enabled = enable;
        updated = true;
        featureName = 'منع الروابط';
        break;
      default:
        await message.channel.send('❌ نوع غير صالح! استخدم: `filter`, `spam`, `link`');
        if (!message.deleted) message.delete().catch(() => {});
        return;
    }

    if (updated) {
      await message.channel.send(`🛡️ تم ${enable ? 'تفعيل' : 'تعطيل'} ${featureName}!`);
      if (!message.deleted) message.delete().catch(() => {});
    }
  },
});

// ============ TICKET MANAGER COMMAND ============
client.commands.set('tmanage', {
  name: 'tmanage',
  description: 'Manage tickets (admin only)',
  execute: async (message, args) => {
    if (!message.member.permissions.has('ManageChannels')) {
      await message.channel.send('❌ ليس لديك صلاحية!');
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    if (args.length === 0) {
      const tickets = message.guild.channels.cache.filter(ch => ch.name.startsWith('ticket-'));

      if (tickets.size === 0) {
        await message.channel.send('📭 لا توجد تذاكر مفتوحة حالياً!');
        if (!message.deleted) message.delete().catch(() => {});
        return;
      }

      let ticketList = '';
      let i = 1;
      tickets.forEach((ch) => {
        const topic = ch.topic || 'بدون وصف';
        ticketList += `**${i}.** ${ch.name} - ${topic}\n`;
        i++;
      });

      const embed = new EmbedBuilder()
        .setTitle('🎫 قائمة التذاكر المفتوحة')
        .setColor(0xDC2626)
        .setDescription(ticketList)
        .setFooter({ text: `عدد التذاكر: ${tickets.size}` })
        .setTimestamp();

      await message.channel.send({ embeds: [embed] });
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    const action = args[0].toLowerCase();

    // Close ticket
    if (action === 'close') {
      if (!hasTicketAdminRole(message.member)) {
        await message.channel.send('❌ ليس لديك صلاحية لإغلاق التذاكر!');
        if (!message.deleted) message.delete().catch(() => {});
        return;
      }

      if (message.channel.name.startsWith('ticket-')) {
        await logTicketTranscript(message.channel, message.author, 'تم الإغلاق بأمر !tmanage close');
        await message.channel.send('🔒 جاري إغلاق التذكرة...');
        setTimeout(() => message.channel.delete(), 1000);
      } else {
        await message.channel.send('❌ هذا الأمر يُستخدم داخل قناة تذكرة فقط!');
        if (!message.deleted) message.delete().catch(() => {});
      }
      return;
    }

    // Add role
    if (action === 'addrole') {
      const role = message.mentions.roles.first();
      if (!role) {
        await message.channel.send('❌ استخدم: `!tmanage addrole @رول`');
        if (!message.deleted) message.delete().catch(() => {});
        return;
      }

      if (!ticketSettings.allowedRoles.includes(role.id)) {
        ticketSettings.allowedRoles.push(role.id);
        await message.channel.send(`✅ تم إضافة الرول ${role.name} لقائمة المستلمين!`);
      } else {
        await message.channel.send('⚠️ الرول موجودة مسبقاً!');
      }
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    // Add role by name
    if (action === 'addrolename') {
      const roleName = args.slice(1).join(' ');
      if (!roleName) {
        await message.channel.send('❌ استخدم: `!tmanage addrolename [اسم الرول]`');
        if (!message.deleted) message.delete().catch(() => {});
        return;
      }

      if (!ticketSettings.allowedRoleNames.includes(roleName)) {
        ticketSettings.allowedRoleNames.push(roleName);
        await message.channel.send(`✅ تم إضافة "${roleName}" لقائمة المستلمين!`);
      } else {
        await message.channel.send('⚠️ الاسم موجود مسبقاً!');
      }
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    // Remove role
    if (action === 'removerole') {
      const role = message.mentions.roles.first();
      if (!role) {
        await message.channel.send('❌ استخدم: `!tmanage removerole @رول`');
        if (!message.deleted) message.delete().catch(() => {});
        return;
      }

      const index = ticketSettings.allowedRoles.indexOf(role.id);
      if (index > -1) {
        ticketSettings.allowedRoles.splice(index, 1);
        await message.channel.send(`✅ تم إزالة الرول ${role.name} من قائمة المستلمين!`);
      } else {
        await message.channel.send('⚠️ الرول غير موجودة في القائمة!');
      }
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    // Show roles
    if (action === 'roles') {
      let rolesList = '📋 الرولات المسموحة:\n\n';

      if (ticketSettings.allowedRoles.length === 0 && ticketSettings.allowedRoleNames.length === 0) {
        rolesList += 'لا توجد رولات مضافة حالياً.\n';
        rolesList += '💡 استخدم `!tmanage addrole @رول` أو `!tmanage addrolename [اسم]`';
      } else {
        if (ticketSettings.allowedRoles.length > 0) {
          for (const roleId of ticketSettings.allowedRoles) {
            const role = message.guild.roles.cache.get(roleId);
            rolesList += `• ${role ? role.name : 'رول محذوفة'} (ID: ${roleId})\n`;
          }
        }
        if (ticketSettings.allowedRoleNames.length > 0) {
          rolesList += '\n📝 الرولات المسموحة بالأسماء:\n';
          for (const roleName of ticketSettings.allowedRoleNames) {
            rolesList += `• ${roleName}\n`;
          }
        }
      }

      await message.channel.send(rolesList);
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    // Add admin role
    if (action === 'addadmin') {
      const role = message.mentions.roles.first();
      if (!role) {
        await message.channel.send('❌ استخدم: `!tmanage addadmin @رول`');
        if (!message.deleted) message.delete().catch(() => {});
        return;
      }

      if (!ticketSettings.ticketAdminRoles.includes(role.id)) {
        ticketSettings.ticketAdminRoles.push(role.id);
        await message.channel.send(`✅ تم إضافة الرول ${role.name} كأدمن للتذاكر!`);
      } else {
        await message.channel.send('⚠️ الرول موجودة مسبقاً كأدمن!');
      }
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    // Add admin by name
    if (action === 'addadminname') {
      const roleName = args.slice(1).join(' ');
      if (!roleName) {
        await message.channel.send('❌ استخدم: `!tmanage addadminname [اسم الرول]`');
        if (!message.deleted) message.delete().catch(() => {});
        return;
      }

      if (!ticketSettings.ticketAdminRoleNames.includes(roleName)) {
        ticketSettings.ticketAdminRoleNames.push(roleName);
        await message.channel.send(`✅ تم إضافة "${roleName}" كأدمن للتذاكر!`);
      } else {
        await message.channel.send('⚠️ الاسم موجود مسبقاً!');
      }
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    // Remove admin role
    if (action === 'removeadmin') {
      const role = message.mentions.roles.first();
      if (!role) {
        await message.channel.send('❌ استخدم: `!tmanage removeadmin @رول`');
        if (!message.deleted) message.delete().catch(() => {});
        return;
      }

      const index = ticketSettings.ticketAdminRoles.indexOf(role.id);
      if (index > -1) {
        ticketSettings.ticketAdminRoles.splice(index, 1);
        await message.channel.send(`✅ تم إزالة الرول ${role.name} من أدمن التذاكر!`);
      } else {
        await message.channel.send('⚠️ الرول غير موجودة كأدمن!');
      }
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    // Set logs channel
    if (action === 'setlogs') {
      const channel = message.mentions.channels.first();
      if (!channel) {
        await message.channel.send('❌ استخدم: `!tmanage setlogs #قناة`');
        if (!message.deleted) message.delete().catch(() => {});
        return;
      }

      ticketSettings.logsChannelId = channel.id;
      await message.channel.send(`✅ تم تعيين قناة اللوجس: ${channel.name}`);
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    // Set mention role
    if (action === 'setmention') {
      const role = message.mentions.roles.first();
      if (!role) {
        await message.channel.send('❌ استخدم: `!tmanage setmention @رول`');
        if (!message.deleted) message.delete().catch(() => {});
        return;
      }

      ticketSettings.mentionRoleId = role.id;
      ticketSettings.mentionRoleName = null;
      await message.channel.send(`✅ تم تعيين الرول ${role.name} للمنشن التلقائي!`);
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    // Set mention role by name
    if (action === 'setmentionname') {
      const roleName = args.slice(1).join(' ');
      if (!roleName) {
        await message.channel.send('❌ استخدم: `!tmanage setmentionname [اسم الرول]`');
        if (!message.deleted) message.delete().catch(() => {});
        return;
      }

      const role = message.guild.roles.cache.find(r =>
        r.name.toLowerCase().includes(roleName.toLowerCase())
      );

      if (!role) {
        await message.channel.send(`❌ لم يتم العثور على رول تحتوي على: "${roleName}"`);
        if (!message.deleted) message.delete().catch(() => {});
        return;
      }

      ticketSettings.mentionRoleId = null;
      ticketSettings.mentionRoleName = roleName;
      await message.channel.send(`✅ تم تعيين "${roleName}" للمنشن التلقائي! (الرول: ${role.name})`);
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    // Show mention settings
    if (action === 'mention') {
      let mentionInfo = '🎯 إعدادات المنشن التلقائي:\n\n';

      if (ticketSettings.mentionRoleId) {
        const role = message.guild.roles.cache.get(ticketSettings.mentionRoleId);
        mentionInfo += `📌 الرول: ${role ? role.name : 'محذوفة'}\n`;
        mentionInfo += `🔢 ID: ${ticketSettings.mentionRoleId}\n`;
      } else if (ticketSettings.mentionRoleName) {
        const role = message.guild.roles.cache.find(r =>
          r.name.toLowerCase().includes(ticketSettings.mentionRoleName.toLowerCase())
        );
        mentionInfo += `📌 الرول: ${role ? role.name : 'غير موجودة'}\n`;
        mentionInfo += `📝 الاسم: "${ticketSettings.mentionRoleName}"\n`;
      } else {
        mentionInfo += '⚠️ لم يتم تعيين رول للمنشن التلقائي.\n';
        mentionInfo += '💡 استخدم: `!tmanage setmention @رول` أو `!tmanage setmentionname [اسم]`';
      }

      await message.channel.send(mentionInfo);
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    // Show admins
    if (action === 'admins') {
      let adminsList = '👮 أدمنز التذاكر:\n\n';

      if (ticketSettings.ticketAdminRoles.length === 0 && ticketSettings.ticketAdminRoleNames.length === 0) {
        adminsList += 'لا توجد أدمنز مضافين.\n';
        adminsList += '💡 استخدم `!tmanage addadmin @رول` أو `!tmanage addadminname [اسم]`';
      } else {
        if (ticketSettings.ticketAdminRoles.length > 0) {
          for (const roleId of ticketSettings.ticketAdminRoles) {
            const role = message.guild.roles.cache.get(roleId);
            adminsList += `• ${role ? role.name : 'رول محذوفة'}\n`;
          }
        }
        if (ticketSettings.ticketAdminRoleNames.length > 0) {
          adminsList += '\n📝 بالأسماء:\n';
          for (const roleName of ticketSettings.ticketAdminRoleNames) {
            adminsList += `• ${roleName}\n`;
          }
        }
      }

      if (ticketSettings.logsChannelId) {
        const logsChannel = message.guild.channels.cache.get(ticketSettings.logsChannelId);
        adminsList += `\n📋 قناة اللوجس: ${logsChannel ? logsChannel.name : 'محذوفة'}`;
      } else {
        adminsList += '\n📋 قناة اللوجس: غير محددة';
      }

      await message.channel.send(adminsList);
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    // Help
    if (action === 'help' || action === '?') {
      const embed = new EmbedBuilder()
        .setTitle('🎫 أوامر إدارة التذاكر')
        .setColor(0xDC2626)
        .addFields(
          { name: 'الأوامر الأساسية:', value:
            '`!tmanage` - عرض التذاكر المفتوحة\n' +
            '`!tmanage close` - إغلاق التذكرة\n' +
            '`!tmanage help` - عرض هذه القائمة', inline: false },
          { name: 'إدارة الرولات:', value:
            '`!tmanage addrole @رول` - إضافة رول للمستلمين\n' +
            '`!tmanage addrolename [اسم]` - إضافة رول بالاسم\n' +
            '`!tmanage removerole @رول` - إزالة رول\n' +
            '`!tmanage roles` - عرض الرولات', inline: false },
          { name: 'إدارة الأدمنز:', value:
            '`!tmanage addadmin @رول` - إضافة أدمن\n' +
            '`!tmanage addadminname [اسم]` - إضافة أدمن بالاسم\n' +
            '`!tmanage removeadmin @رول` - إزالة أدمن\n' +
            '`!tmanage admins` - عرض الأدمنز', inline: false },
          { name: 'الإعدادات:', value:
            '`!tmanage setlogs #قناة` - تعيين قناة اللوجس\n' +
            '`!tmanage setmention @رول` - تعيين رول للمنشن\n' +
            '`!tmanage setmentionname [اسم]` - تعيين رول بالاسم\n' +
            '`!tmanage mention` - عرض إعدادات المنشن', inline: false }
        )
        .setFooter({ text: 'Unit S | إدارة التذاكر' })
        .setTimestamp();

      await message.channel.send({ embeds: [embed] });
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    // Unknown command
    await message.channel.send(`❌ أمر غير معروف: \`${action}\`\n💡 استخدم \`!tmanage help\` لعرض قائمة الأوامر.`);
    if (!message.deleted) message.delete().catch(() => {});
  },
});

// ============ INTERACTION HANDLER ============
client.on('interactionCreate', async (interaction) => {
  try {
    // Handle Select Menu - Ticket Selection
    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === 'ticket_select') {
        const ticketType = interaction.values[0];

        const typeNames = {
          support: 'دعم فني',
          complaint: 'شكاوي',
          inquiry: 'استفسار'
        };

        const guild = interaction.guild;

        try {
          const botMember = await guild.members.fetch(client.user.id);
          if (!botMember.permissions.has('ManageChannels')) {
            return await interaction.reply({
              content: '❌ لا توجد لدي الصلاحية اللازمة لإنشاء قناة!',
              flags: 64
            });
          }

          const existingTickets = guild.channels.cache.filter(ch =>
            ch.name.startsWith('ticket-') &&
            ch.topic?.includes(interaction.user.username)
          );

          if (existingTickets.size > 0) {
            const existingTicket = existingTickets.first();
            return await interaction.reply({
              content: `❌ لديك تذكرة مفتوحة بالفعل!\n${existingTicket.toString()}`,
              flags: 64
            });
          }

          const existingTicketCount = guild.channels.cache.filter(ch =>
            ch.name.startsWith('ticket-')
          ).size;

          const ticketNum = String(existingTicketCount + 1).padStart(3, '0');
          const channelName = `ticket-${ticketNum}`;

          // أزرار التذكرة
          const claimButton = new ButtonBuilder()
            .setCustomId('claim_ticket')
            .setLabel('Claim')
            .setStyle(ButtonStyle.Success)
            .setEmoji('✅');

          const unclaimButton = new ButtonBuilder()
            .setCustomId('unclaim_ticket')
            .setLabel('Unclaim')
            .setStyle(ButtonStyle.Success);

          const closeButton = new ButtonBuilder()
            .setCustomId('close_ticket')
            .setLabel('Close')
            .setStyle(ButtonStyle.Success);

          const row = new ActionRowBuilder().addComponents(claimButton, unclaimButton, closeButton);

          // صلاحيات القناة
          const permissionOverwrites = [
            { id: guild.id, deny: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] },
            { id: interaction.user.id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'AttachFiles'] },
          ];

          // إضافة الرولات المسموحة
          const mentionedRoles = [];
          if (ticketSettings.allowedRoles.length > 0) {
            for (const roleId of ticketSettings.allowedRoles) {
              const role = guild.roles.cache.get(roleId);
              if (role) {
                permissionOverwrites.push({
                  id: roleId,
                  allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'AttachFiles']
                });
                mentionedRoles.push(role);
              }
            }
          }

          if (ticketSettings.allowedRoleNames.length > 0) {
            for (const roleName of ticketSettings.allowedRoleNames) {
              const role = guild.roles.cache.find(r =>
                r.name.toLowerCase().includes(roleName.toLowerCase())
              );
              if (role && !mentionedRoles.includes(role)) {
                permissionOverwrites.push({
                  id: role.id,
                  allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'AttachFiles']
                });
                mentionedRoles.push(role);
              }
            }
          }

          const ticketChannel = await guild.channels.create({
            name: channelName,
            type: 0,
            topic: `🎫 ${typeNames[ticketType]} | ${interaction.user.tag}`,
            permissionOverwrites: permissionOverwrites,
          });

          // حفظ وقت فتح التذكرة
          client.ticketClaims.set(ticketChannel.id, {
            claimedBy: null,
            openedAt: Date.now(),
            ticketType: ticketType,
            user: interaction.user
          });

          // Unit S Ticket Embed - تصميم Hollywood
          const embed = new EmbedBuilder()
            .setTitle(`${ticketSettings.ticketPrefix} | #${ticketNum} — ${typeNames[ticketType]}`)
            .setColor(0xDC2626)
            .setDescription(`<@${interaction.user.id}>\nThank you for opening a ticket. A staff member will be with you shortly.`)
            .addFields(
              {
                name: '⏰ Opened',
                value: `${formatTimeAgo(Date.now())}`,
                inline: true
              },
              {
                name: '📌 Status',
                value: '🟡 Unclaimed',
                inline: true
              }
            )
            .setFooter({ text: 'Unit S Support System' })
            .setTimestamp();

          // منشن الرولات
          let channelContent = interaction.user.toString();
          if (ticketSettings.mentionRoleId || ticketSettings.mentionRoleName) {
            let autoMentionRole = null;
            if (ticketSettings.mentionRoleId) {
              autoMentionRole = guild.roles.cache.get(ticketSettings.mentionRoleId);
            }
            if (!autoMentionRole && ticketSettings.mentionRoleName) {
              autoMentionRole = guild.roles.cache.find(r =>
                r.name.toLowerCase().includes(ticketSettings.mentionRoleName.toLowerCase())
              );
            }
            if (autoMentionRole) {
              channelContent += ' ' + autoMentionRole.toString();
            }
          }
          if (mentionedRoles.length > 0) {
            channelContent += ' ' + mentionedRoles.map(r => r.toString()).join(' ');
          }

          await ticketChannel.send({
            content: channelContent,
            embeds: [embed],
            components: [row]
          });

          await interaction.reply({
            content: `✅ تم إنشاء التذكرة #${ticketNum} بنجاح! <#${ticketChannel.id}>`,
            flags: 64
          });

        } catch (error) {
          console.error('Ticket creation error:', error);
          await interaction.reply({
            content: `❌ حدث خطأ أثناء إنشاء التذكرة!\nالخطأ: \`${error.message}\``,
            flags: 64
          });
        }
      }
    }

    // Handle Button Interactions
    if (interaction.isButton()) {
      // ============ أزرار التشفير ============
      if (interaction.customId === 'shfr_post') {
        const modal = new ModalBuilder()
          .setCustomId('shfr_modal')
          .setTitle('🔒 تشفير المنشور');

        const textInput = new TextInputBuilder()
          .setCustomId('shfr_text')
          .setLabel('يرجى وضع منشورك هنا')
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder('اكتب النص هنا...')
          .setRequired(true)
          .setMaxLength(4000);

        const actionRow = new ActionRowBuilder().addComponents(textInput);
        modal.addComponents(actionRow);

        await interaction.showModal(modal);
        return;
      }

      // ============ أزرار التذاكر ============
      const channel = interaction.channel;
      if (!channel || !channel.name.startsWith('ticket-')) return;

      const ticketData = client.ticketClaims.get(channel.id);
      if (!ticketData) return;

      // Claim Button
      if (interaction.customId === 'claim_ticket') {
        if (!hasTicketAdminRole(interaction.member)) {
          return await interaction.reply({
            content: '❌ ليس لديك صلاحية لاستلام التذكرة!',
            flags: 64
          });
        }

        if (ticketData.claimedBy) {
          return await interaction.reply({
            content: '❌ هذه التذكرة تم استلامها مسبقاً!',
            flags: 64
          });
        }

        // تحديث بيانات التذكرة
        ticketData.claimedBy = interaction.user;
        client.ticketClaims.set(channel.id, ticketData);

        // تحديث الأزرار - تعطيل Claim
        const claimButton = new ButtonBuilder()
          .setCustomId('claim_ticket')
          .setLabel('Claim')
          .setStyle(ButtonStyle.Success)
          .setEmoji('✅')
          .setDisabled(true);

        const unclaimButton = new ButtonBuilder()
          .setCustomId('unclaim_ticket')
          .setLabel('Unclaim')
          .setStyle(ButtonStyle.Success);

        const closeButton = new ButtonBuilder()
          .setCustomId('close_ticket')
          .setLabel('Close')
          .setStyle(ButtonStyle.Success);

        const row = new ActionRowBuilder().addComponents(claimButton, unclaimButton, closeButton);

        // Unit S Ticket Embed - تحديث
        const embed = new EmbedBuilder()
          .setTitle(channel.topic?.split('|')[0]?.trim()?.replace('🎫 ', '') || 'Unit S Tickets')
          .setColor(0xDC2626)
          .setDescription(`Welcome ${interaction.user}.\nThank you for opening a ticket. A staff member will be with you shortly.`)
          .addFields(
            {
              name: '⏰ Opened',
              value: `${formatTimeAgo(ticketData.openedAt)}`,
              inline: true
            },
            {
              name: '📌 Status',
              value: `🟢 Claimed by ${interaction.user.username}`,
              inline: true
            }
          )
          .setFooter({ text: 'Unit S Support System' })
          .setTimestamp();

        // رسالة التأكيد
        const confirmEmbed = new EmbedBuilder()
          .setDescription(`✅ تم استلام التكت من قِبَل ${interaction.user}`)
          .setColor(0x14b8a6)
          .setTimestamp();

        await interaction.reply({ embeds: [embed, confirmEmbed], components: [row] });

        // منشن الأدمن
        await channel.send(`${interaction.user}`);
      }

      // Unclaim Button
      if (interaction.customId === 'unclaim_ticket') {
        if (!hasTicketAdminRole(interaction.member)) {
          return await interaction.reply({
            content: '❌ ليس لديك صلاحية!',
            flags: 64
          });
        }

        if (ticketData.claimedBy?.id !== interaction.user.id) {
          return await interaction.reply({
            content: '❌ يمكنك فقط إلغاء استلام التذكرة التي استلمتها أنت!',
            flags: 64
          });
        }

        // تحديث بيانات التذكرة
        ticketData.claimedBy = null;
        client.ticketClaims.set(channel.id, ticketData);

        // تحديث الأزرار
        const claimButton = new ButtonBuilder()
          .setCustomId('claim_ticket')
          .setLabel('Claim')
          .setStyle(ButtonStyle.Success)
          .setEmoji('✅');

        const unclaimButton = new ButtonBuilder()
          .setCustomId('unclaim_ticket')
          .setLabel('Unclaim')
          .setStyle(ButtonStyle.Success)
          .setDisabled(true);

        const closeButton = new ButtonBuilder()
          .setCustomId('close_ticket')
          .setLabel('Close')
          .setStyle(ButtonStyle.Success);

        const row = new ActionRowBuilder().addComponents(claimButton, unclaimButton, closeButton);

        // Unit S Ticket Embed - تحديث
        const embed = new EmbedBuilder()
          .setTitle(channel.topic?.split('|')[0]?.trim()?.replace('🎫 ', '') || 'Unit S Tickets')
          .setColor(0xDC2626)
          .setDescription(`Welcome ${ticketData.user}.\nThank you for opening a ticket. A staff member will be with you shortly.`)
          .addFields(
            {
              name: '⏰ Opened',
              value: `${formatTimeAgo(ticketData.openedAt)}`,
              inline: true
            },
            {
              name: '📌 Status',
              value: '🟡 Unclaimed',
              inline: true
            }
          )
          .setFooter({ text: 'Unit S Support System' })
          .setTimestamp();

        await interaction.reply({ embeds: [embed], components: [row] });
      }

      // Close Button
      if (interaction.customId === 'close_ticket') {
        if (!hasTicketAdminRole(interaction.member)) {
          return await interaction.reply({
            content: '❌ ليس لديك صلاحية لإغلاق التذكرة!',
            flags: 64
          });
        }

        await logTicketTranscript(channel, interaction.user, 'تم الإغلاق من زر');
        await interaction.reply('🔒 جاري إغلاق التذكرة...');
        setTimeout(() => channel.delete(), 1000);
      }
    }

    // Handle Modal Submit
    if (interaction.isModalSubmit()) {
      if (interaction.customId === 'shfr_modal') {
        try {
          const text = interaction.fields.getTextInputValue('shfr_text');
          const encrypted = encryptText(text);

          // تحويل النص المشفر للون مختلف
          const embed = new EmbedBuilder()
            .setTitle('🔒 تم تشفير النص!')
            .setColor(0xDC2626)
            .addFields(
              { name: 'النص المشفر:', value: `\`\`\`\n${encrypted}\n\`\`\`` }
            )
            .setFooter({ text: 'Unit S | التشفير' })
            .setTimestamp();

          // الرد يكون فقط للشخص اللي شفره (ephemeral)
          await interaction.reply({ embeds: [embed], ephemeral: true });
        } catch (error) {
          console.error('Encryption error:', error);
          await interaction.reply({ content: '❌ حدث خطأ أثناء التشفير!', ephemeral: true });
        }
      }
    }
  } catch (error) {
    console.error('Interaction error:', error);
    if (interaction.isRepliable()) {
      await interaction.reply({ content: '❌ حدث خطأ!', flags: 64 }).catch(() => {});
    }
  }
});

// ============ MESSAGE COMMANDS ============
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  if (commandName === 'protect' && args.length > 0) {
    const protectCmd = client.commands.get('protect_toggle');
    if (protectCmd) {
      await protectCmd.execute(message, args);
      return;
    }
  }

  const cmd = client.commands.get(commandName);
  if (cmd) {
    try {
      await cmd.execute(message, args);
    } catch (error) {
      console.error(`Command error (${commandName}):`, error);
      await message.channel.send('❌ حدث خطأ أثناء تنفيذ الأمر!').catch(() => {});
    }
  }
});

// ============ ENCRYPT FUNCTION ============
function encryptText(text) {
  let result = text;

  const sortedWords = Object.keys(wordDictionary).sort((a, b) => b.length - a.length);

  for (const word of sortedWords) {
    const regex = new RegExp(word, 'gi');
    result = result.replace(regex, wordDictionary[word]);
  }

  return result;
}

// ============ PROTECTION SYSTEM ============

// Word Filter
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!protectionSettings.wordFilter.enabled) return;
  if (!message.guild) return;
  if (message.member?.permissions.has('ManageMessages')) return;

  const content = message.content.toLowerCase();
  const foundWords = protectionSettings.wordFilter.words.filter(word =>
    content.includes(word.toLowerCase())
  );

  if (foundWords.length > 0) {
    await message.delete();

    try {
      await message.member.timeout(10 * 60 * 1000);

      const embed = new EmbedBuilder()
        .setTitle('🛡️ UNIT S -SECURITY ADMINISTRATION')
        .setDescription(`تم تقييد صلاحياتك لمدة 10 دقائق لرصد سلوك غير لائق (سب او شتم) في أحد الرومات\n\nنظام الحماية لا يسمح بالإساءة أو التلفظ نرجو الالتزام بالمعايير والأخلاق\n\nنثق بوعيك لتجنب تكرار المخالفة`)
        .setColor(COLORS.danger)
        .setTimestamp();

      await message.author.send({ embeds: [embed] }).catch(() => {});

      const logChannel = message.guild?.channels.cache.find(ch => ch.name === 'logs');
      if (logChannel) {
        logChannel.send(`🛡️ [Word Filter] ${message.author.tag} استخدم كلمات ممنوعة: ${foundWords.join(', ')} - تم كتمه 10 دقائق`);
      }
    } catch (err) {
      console.error('Word Filter Mute error:', err);
    }
  }
});

// Anti-Spam
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!protectionSettings.antiSpam.enabled) return;
  if (!message.guild) return;
  if (message.member?.permissions.has('ManageMessages')) return;

  const userId = message.author.id;
  const now = Date.now();

  if (!antiSpamTracker.has(userId)) {
    antiSpamTracker.set(userId, { messages: [], mentions: 0, emojis: 0 });
  }

  const userData = antiSpamTracker.get(userId);
  userData.messages.push(now);

  const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
  userData.emojis += (message.content.match(emojiRegex) || []).length;
  userData.mentions += message.mentions.users.size;
  userData.messages = userData.messages.filter(time => now - time < protectionSettings.antiSpam.timeWindow);

  if (userData.messages.length > protectionSettings.antiSpam.maxMessages ||
      userData.mentions > protectionSettings.antiSpam.maxMentions ||
      userData.emojis > protectionSettings.antiSpam.maxEmojis) {

    await message.delete();

    try {
      await message.member.timeout(5 * 60 * 1000);

      const embed = new EmbedBuilder()
        .setTitle('🛡️ UNIT S -SECURITY ADMINISTRATION')
        .setDescription(`تم تقييد صلاحياتك لمدة 5 دقائق الرصد نشاط (سبام) في احد الرومات\n\nنظام الحماية لا يسمح بتكرار الرسائل المفرط نرجو الألتزام بالمعايير\n\nنثق بوعيك لتجنب تكرار المخالفة `)
        .setColor(COLORS.danger)
        .setTimestamp();

      await message.author.send({ embeds: [embed] }).catch(() => {});

      const logChannel = message.guild?.channels.cache.find(ch => ch.name === 'logs');
      if (logChannel) {
        logChannel.send(`🛡️ [Anti-Spam] ${message.author.tag} تم كتمه لمدة 5 دقائق - Spam detected`);
      }
    } catch (err) {
      console.error('Mute error:', err);
    }
  }
});

// Anti-Link
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!protectionSettings.antiLink.enabled) return;
  if (!message.guild) return;
  if (message.member?.permissions.has('ManageMessages')) return;

  const content = message.content.toLowerCase();
  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  const urls = content.match(urlRegex) || [];

  if (urls.length > 0) {
    await message.delete();

    try {
      await message.member.timeout(5 * 60 * 1000);

      const embed = new EmbedBuilder()
        .setTitle('🛡️ Unit S -SECURITY ADMINISTRATION')
        .setDescription(`تم تقييد صلاحياتك لمدة 5 دقائق لرصد رابط في أحد الرومات\n\nنظام الحماية لا يسمح بالروابط ألخارجية نرجو ألألتزام بالمعايير\n\nنثق بوعيك لتجنب تكرار المخالفة`)
        .setColor(COLORS.danger)
        .setTimestamp();

      await message.author.send({ embeds: [embed] }).catch(() => {});

      const logChannel = message.guild?.channels.cache.find(ch => ch.name === 'logs');
      if (logChannel) {
        logChannel.send(`🛡️ [Anti-Link] ${message.author.tag} تم كتمه لمدة 5 دقائق - أرسل رابط`);
      }
    } catch (err) {
      console.error('Anti-Link Mute error:', err);
    }
  }
});

// ============ READY EVENT ============
client.on('clientReady', () => {
  console.log(`✅ Unit S Bot is online!`);
  console.log(`👤 Logged as: ${client.user.tag}`);
  console.log(`📊 Servers: ${client.guilds.cache.size}`);
  client.user.setActivity('Unit S | !help', { type: 'WATCHING' });
});

// ============ ERROR HANDLER ============
client.on('error', (error) => {
  console.error('Bot Error:', error);
});

// ============ LOGIN ============
client.login(TOKEN);

export default client;
