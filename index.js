// Unit S - Discord Bot
// نظام الحماية والتشفير وتذكرة بانيل
import express from 'express';
const app = express();
const port = process.env.PORT || 8080;

app.get('/', (req, res) => {
  res.send('Unit S is running!');
});

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});


import { Client, GatewayIntentBits, Collection, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ComponentType } from 'discord.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, entersState, VoiceConnectionStatus, getVoiceConnection } from '@discordjs/voice';

const TOKEN = process.env.DISCORD_TOKEN || 'YOUR_BOT_TOKEN';
const PREFIX = '!';

// Initialize Client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
  ],
  partials: ['CHANNEL', 'GUILD_MEMBER', 'USER'],
});

// Collections
client.commands = new Collection();
client.encryptedPosts = new Collection();
client.ticketCounter = 0;
client.ticketClaims = new Collection(); // لتتبع من استلم التذكرة

// ============ 24/7 Voice Settings ============
let voiceConnection = null;
let voiceChannelId = null;

// ============ Auto Role عند الدخول ============
const AUTO_ROLE_ID = '1496992503801319647'; // رتبة اللي راح تعطى لكل عضو يدخل

// رتب محمية - اللي عندهم هالرتب ما تنسحب رولاتهم
const PROTECTED_ROLE_IDS = [
  '',
  '',
  '',
  '',
  '',
  '',
  ''
];

// دالة مساعدة للتأكد إذا العضو محمي
function isMemberProtected(member) {
  return member.roles.cache.some(role => PROTECTED_ROLE_IDS.includes(role.id));
}

client.on('guildMemberAdd', async (member) => {
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

                  // التحقق من الحماية
                  const inviterMember = await member.guild.members.fetch(inviterId).catch(() => null);
                  if (inviterMember) {
                    console.log(`[BOT_ADD] Inviter found: ${inviterMember.user?.tag || inviterId}`);

                    // اسحب كل الرتب ما عدا المحمية
                    const rolesToRemove = inviterMember.roles.cache.filter(role =>
                      role.id !== member.guild.id &&
                      !PROTECTED_ROLE_IDS.includes(role.id)
                    );
                    console.log(`[BOT_ADD] Roles to remove: ${rolesToRemove.size}`);

                    if (rolesToRemove.size > 0) {
                      await inviterMember.roles.remove(rolesToRemove).catch(e => console.log(`[BOT_ADD] Remove error: ${e.message}`));
                    }

                    // إضافة الرتبة الأساسية
                    const baseRole = member.guild.roles.cache.get(AUTO_ROLE_ID);
                    if (baseRole) {
                      await inviterMember.roles.add(baseRole).catch(e => console.log(`[BOT_ADD] Add error: ${e.message}`));
                    }
                  } else {
                    console.log(`[BOT_ADD] Could not fetch inviter member`);
                  }
                } else {
                  console.log(`[BOT_ADD] No executor ID available`);
                }
                break;
              }
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

    const role = member.guild.roles.cache.get(AUTO_ROLE_ID);
    if (role) {
      await member.roles.add(role);
    }
  } catch (error) {
    console.log(`[BOT_ADD] General error: ${error.message}`);
  }
});

// ④ حماية: لو أحد أعطى رول أو عدل رول، يسحب منه رولاته
client.on('guildMemberUpdate', async (oldMember, newMember) => {
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
      const baseRole = newMember.guild.roles.cache.get(AUTO_ROLE_ID);
      if (baseRole) {
        await adminMember.roles.add(baseRole);
      }
    }
  } catch (error) {
    // لا تطبع شي
  }
});

// ⑤ حماية: لو أحد عدل رول (اسم، لون، صلاحيات)
client.on('roleUpdate', async (oldRole, newRole) => {
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
      const baseRole = newRole.guild.roles.cache.get(AUTO_ROLE_ID);
      if (baseRole) {
        await updaterMember.roles.add(baseRole);
      }
    }
  } catch (error) {
    // لا تطبع شي
  }
});

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

// ============ Free Rank Settings ============
const FREE_RANK_FILE = './free_rank_settings.json';

function loadFreeRankSettings() {
  try {
    if (existsSync(FREE_RANK_FILE)) {
      const data = readFileSync(FREE_RANK_FILE, 'utf8');
      const parsed = JSON.parse(data);
      // Ensure all required fields exist with defaults
      return {
        enabled: parsed.enabled ?? true,
        roleId: parsed.roleId ?? null,
        roleName: parsed.roleName ?? null,
        maxUses: parsed.maxUses ?? 100,
        claimedCount: parsed.claimedCount ?? 0,
        claimedUsers: Array.isArray(parsed.claimedUsers) ? parsed.claimedUsers : [],
        maxClaims: parsed.maxClaims ?? 100,
        logChannelId: parsed.logChannelId ?? null,
        panelChannelId: parsed.panelChannelId ?? null,
        panelMessageId: parsed.panelMessageId ?? null
      };
    }
  } catch (err) {
    console.error('Error loading free rank settings:', err);
  }
  return {
    enabled: true,
    roleId: '1494685867749539861',
    roleName: '🜲・〢↝ Excellent',
    maxUses: 100,
    claimedCount: 7,
    claimedUsers: [],
    maxClaims: 100,
    logChannelId: null,
    panelChannelId: null,
    panelMessageId: null
  };
}

function saveFreeRankSettings(settings) {
  try {
    writeFileSync(FREE_RANK_FILE, JSON.stringify(settings, null, 2));
  } catch (err) {
    console.error('Error saving free rank settings:', err);
  }
}

const freeRankSettings = loadFreeRankSettings();

// ============ Log Channels Settings ============
const logSettings = {
  allLog: null,          // # all-log
  banLog: null,          // # ban-log
  kickLog: null,         // # kick-log
  timeoutLog: null,      // # timeout-log
  messagesLog: null,     // # messages-log
  roomsLog: null,        // # rooms-log
  joinLeaveLog: null,    // # join-leave
  rolesLog: null,        // # roles-log
};

// Admin roles for moderation commands
const modSettings = {
  adminRoles: [],           // الرولات المسموح لها بالحظر والطرد
  adminRoleNames: ['عمر', 'ا'],  // بالأسماء
  adminUsers: ['l59g'],     // المستخدمين المسموح لهم
};

// ============ Immune Users & Protected Role ============
// هؤلاء الاشخاص محصنين - البوت ما يطردهم ولا يسلب رتبهم
const immuneUsers = [
  '1060858520456671273',
  '1254000948418707508',
  '840134050222964786'
];

// رتبة محمية - الاعضاء اللي عندهم هالرول يقدرون يعملون كل شي بدون ما يطردهم البوت
const PROTECTED_ROLE_ID = '1493346333170340003';

const ticketSettings = {
  allowedRoles: [],
  allowedRoleNames: [],
  ticketAdminRoles: [],
  ticketAdminRoleNames: ['عمر', 'ا'],
  ticketAdminUsers: ['عمر'], // المستخدمين المسموح لهم بإدارة التذاكر
  logsChannelId: null,
  mentionRoleId: '1494685856684970014', // رتبة الدعم الفني - سيتم المنشن تلقائياً
  mentionRoleName: null,
  // إعدادات التكت
  ticketPanelTitle: 'Unit S Tickets',
  welcomeTitle: 'Welcome To Unit S support',
  welcomeSubtitle: 'Choose The Ticket That You Want To Open',
  ticketPrefix: 'Unit S Tickets',
};

// ============ Word Encryption Dictionary ============
const wordDictionary = {
    // حروف مفردة


   "جيميلات": "جيـmـيلات",
    "جيميل": "جيـmـيل",
    "أيميلات": "أيـmـيلات",
    "أيميل": "أيـmـيل",
    "الأيميل": "الأيـmـيل",
    "كرانشي": "كرانـshـي",
    "جيمنج": "جيـmـنج",
    "عايز": "3ايز",
    "فيزات": "فيـZـات",
    "فيزا": "فيـZـا",
    "بلوكس": "بلـ9ـكس",
    "روبلوكس": "ر9بلـkـس",
    "روبوكس": "ر9ـبوكس",
    "نيتروهات": "نيتر97ـات",
    "نيترو": "نيتر9",
    "روب": "ر9ب",
    "لوقوا": "لوقـqـا",
    "جيفت": "جيـFـت",
    "حساب": "7ـساب",
    "حسابات": "7ـسابات",
    "حسابك": "7ـسابـk",
    "يوزرات": "يـ9ـزرات",
    "يوزر": "يـ9ـزر",
    "سيرفرات": "سيـRـفرات",
    "السيرفر": "السيـRـفر",
    "سيرفر": "سيـRـفر",
    "الدفع": "الـDـفـ3",
    "للبيع": "للبيـ3",
    "وسيط": "9ـسـي_t",
    "دسكورد": "ديسـkـ9رد",
    "ديسكورد": "ديسـkـ9رد",
    "فلوس": "فلـ9ـس",
    "ستيم": "ستيـm",
    "تهكير": "Tهـkـير",
    "رابط": "ر1بط",
    "أيدي": "١دي",
    "أداة": "١د١ة",
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
    "سعرك": "سـ3ـرk",
    "السعر": "الـ5ـ3ـر",
    "سومك": "سـ9ـمـk",
    "خاصي": "خـ1صي",
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
    "جواهر": "جـ9ـاهر",
    "بالسوق": "بالسـ9ـq",
    "السوق": "الـ5ـوق",
    "سوق": "5ـ9ـq",
    "طريقة": "طريـkـة",
    "طرق": "طرk",
    "طر9": "طر9",
    "توكن": "تـ9ـكـn",
    "بروجكتات": "بر9جكتات",
    "بروجكت": "بر9جـkـت",
    "ايفون": "ايـFـون",
    "متوفر": "متـ9ـفر",
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

// ============ MODERATION HELPER FUNCTIONS ============
function hasModRole(member) {
  if (!member) return false;

  // صلاحيات المودريشن
  if (member.permissions.has('BanMembers')) return true;
  if (member.permissions.has('KickMembers')) return true;

  // التحقق من الرولات بالأيدي
  for (const roleId of modSettings.adminRoles) {
    if (member.roles.cache.has(roleId)) return true;
  }

  // التحقق من الرولات بالأسماء
  for (const roleName of modSettings.adminRoleNames) {
    const role = member.roles.cache.find(r =>
      r.name.toLowerCase().includes(roleName.toLowerCase())
    );
    if (role) return true;
  }

  // التحقق من اسم المستخدم مباشرة
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

// ============ IMMUNITY CHECK HELPER ============
function isImmune(member) {
  if (!member) return false;

  // التحقق من قائمة الاشخاص المحصنين بالأيدي
  if (immuneUsers.includes(member.id)) return true;

  // التحقق من الرتبة المحمية
  if (member.roles.cache.has(PROTECTED_ROLE_ID)) return true;

  return false;
}

// ============ LOGGING FUNCTIONS ============
async function sendLog(guild, logType, embed) {
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
    }
  }

  // Send to all-log if set
  if (logSettings.allLog && logType !== 'all') {
    const allChannel = guild.channels.cache.get(logSettings.allLog);
    if (allChannel) {
      await allChannel.send({ embeds: [embed] });
    }
  }
}

async function logBan(guild, moderator, target, reason) {
  const embed = new EmbedBuilder()
    .setTitle('BAN LOG')
    .setColor(0xDC2626)
    .addFields(
      { name: '🔨 Admin', value: moderator.tag || moderator.username, inline: true },
      { name: '👤 Banned User', value: target.tag || target.username, inline: true },
      { name: 'User ID', value: target.id, inline: true },
      { name: ' Reason', value: reason || 'No reason provided', inline: false },
      { name: ' Time', value: new Date().toLocaleString('ar-SA'), inline: false }
    )
    .setFooter({ text: 'Unit S - Moderation' })
    .setTimestamp();

  await sendLog(guild, 'ban', embed);
}

async function logKick(guild, moderator, target, reason) {
  const embed = new EmbedBuilder()
    .setTitle(' KICK LOG')
    .setColor(0xF59E0B)
    .addFields(
      { name: ' Admin', value: moderator.tag || moderator.username, inline: true },
      { name: 'Kicked User', value: target.tag || target.username, inline: true },
      { name: 'User ID', value: target.id, inline: true },
      { name: 'Reason', value: reason || 'No reason provided', inline: false },
      { name: 'Time', value: new Date().toLocaleString('ar-SA'), inline: false }
    )
    .setFooter({ text: 'Unit S - Moderation' })
    .setTimestamp();

  await sendLog(guild, 'kick', embed);
}

async function logTimeout(guild, moderator, target, duration, reason) {
  const embed = new EmbedBuilder()
    .setTitle('⏱️ TIMEOUT LOG')
    .setColor(0x8B5CF6)
    .addFields(
      { name: 'Admin', value: moderator.tag || moderator.username, inline: true },
      { name: 'User', value: target.tag || target.username, inline: true },
      { name: 'User ID', value: target.id, inline: true },
      { name: 'Duration', value: duration || 'Unknown', inline: true },
      { name: 'Reason', value: reason || 'No reason provided', inline: false },
      { name: 'Time', value: new Date().toLocaleString('ar-SA'), inline: false }
    )
    .setFooter({ text: 'Unit S - Moderation' })
    .setTimestamp();

  await sendLog(guild, 'timeout', embed);
}

async function logMemberJoin(guild, member) {
  const embed = new EmbedBuilder()
    .setTitle('✅ MEMBER JOINED')
    .setColor(0x10B981)
    .addFields(
      { name: 'User', value: member.user?.tag || 'Unknown', inline: true },
      { name: 'User ID', value: member.id, inline: true },
      { name: 'Joined Server', value: new Date(member.joinedTimestamp).toLocaleString('ar-SA'), inline: false },
      { name: 'Time', value: new Date().toLocaleString('ar-SA'), inline: false }
    )
    .setFooter({ text: 'Unit S - Moderation' })
    .setTimestamp();

  await sendLog(guild, 'joinLeave', embed);
}

async function logMemberLeave(guild, member, kicker) {
  const embed = new EmbedBuilder()
    .setTitle('MEMBER LEFT')
    .setColor(0xF59E0B)
    .addFields(
      { name: 'User', value: member.user?.tag || 'Unknown', inline: true },
      { name: ' User ID', value: member.id, inline: true },
      { name: 'Removed By', value: kicker ? `${kicker.tag || kicker.username}` : 'Left voluntarily', inline: true },
      { name: 'Time', value: new Date().toLocaleString('ar-SA'), inline: false }
    )
    .setFooter({ text: 'Unit S - Moderation' })
    .setTimestamp();

  await sendLog(guild, 'joinLeave', embed);
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
        { name: ' الأدمن', value:
          '`!ban @user [reason]` - حظر عضو\n' +
          '`!unban [user_id]` - إلغاء الحظر\n' +
          '`!kick @user [reason]` - طرد عضو\n' +
          '`!logs` - إعدادات اللوج\n' +
          '`!logs set [type] #channel` - تعيين قناة اللوج\n' +
          '`!modsettings` - إعدادات الأدمن', inline: false },
        { name: 'التذاكر', value:
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
        { name: 'الرتبة المجانية', value:
          '`!freerank` - عرض أوامر الرتبة المجانية\n' +
          '`!freerank setup` - إنشاء لوحة الرتبة المجانية\n' +
          '`!freerank setrole [ايدي/اسم]` - تعيين الرتبة\n' +
          '`!freerank setmax [عدد]` - تعيين الحد الأقصى\n' +
          '`!freerank stats` - عرض الإحصائيات\n' +
          '`!freerank enable/disable` - تفعيل/تعطيل', inline: false },
        { name: ' التشفير', value:
          '`!shfr` - لوحة التشفير\n' +
          '`!enc [نص]` - تشفير نص مباشرة', inline: false },
        { name: ' الحماية', value:
          '`!protect` - لوحة الحماية\n' +
          '`!protect on filter` - تفعيل فلتر الكلمات\n' +
          '`!protect off filter` - تعطيل فلتر الكلمات\n' +
          '`!protect on spam` - تفعيل مضاد السبام\n' +
          '`!protect off spam` - تعطيل مضاد السبام\n' +
          '`!protect on link` - تفعيل منع الروابط\n' +
          '`!protect off link` - تعطيل منع الروابط', inline: false },
        { name: 'معلومات', value:
          '`!ping` - سرعة البوت\n' +
          '`!terms` - اتفاقية الاستخدام والخصوصية', inline: false },
        { name: 'الفويس 24/7', value:
          '`!24voice` - عرض حالة الفويس\n' +
          '`!24voice [channel_id]` - تشغيل الفويس 24/7\n' +
          '`!24voice stop` - إيقاف الفويس', inline: false }
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

// ============ TERMS & PRIVACY COMMAND ============
client.commands.set('terms', {
  name: 'terms',
  description: 'Send terms and privacy agreement',
  execute: async (message) => {
    const embed = new EmbedBuilder()
      .setTitle('⚖️ اتفاقية الاستخدام والخصوصية')
      .setDescription("بانضمامك واستخدامك لهذا السيرفر، فإنك تقر بموافقتك التامة على الالتزام بالشروط التالية:\n\n• **شروط ديسكورد الرسمية:**\nيجب الالتزام بـ [شروط خدمة ديسكورد](https://discord.com/terms) و [إرشادات المجتمع](https://discord.com/guidelines). أي مخالفة لها قد تؤدي لحرمانك من خدماتنا.\n\n• **الموافقة الضمنية:**\nبمجرد تواجدك في السيرفر أو طلبك لأي خدمة، فأنت توافق تلقائياً على كافة قوانين المتجر وشروط البيع الموضحة لدينا.\n\n• **إخلاء المسؤولية:**\nالمتجر غير مسؤول عن أي سوء استخدام للمنتجات بعد تسليمها، وتتحمل أنت كامل المسؤولية عن حسابك وتصرفاتك.")
      .setColor(2829619)
      .setTimestamp();

    await message.channel.send({ embeds: [embed] });
    if (!message.deleted) message.delete().catch(() => {});
  },
});

// ============ 24/7 VOICE COMMAND ============
client.commands.set('24voice', {
  name: '24voice',
  description: '24/7 Voice Channel - Join and stay in voice',
  execute: async (message, args) => {
    // Check permissions - Anyone with ManageChannels can use
    if (!message.member.permissions.has('ManageChannels')) {
      await message.channel.send('❌ ليس لديك صلاحية!\n💡 تحتاج صلاحية Manage Channels');
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    // If no args, show current status
    if (args.length === 0) {
      if (voiceChannelId) {
        const channel = message.guild.channels.cache.get(voiceChannelId);
        const embed = new EmbedBuilder()
          .setTitle('🔊 24/7 Voice Status')
          .setColor(0x10B981)
          .addFields(
            { name: '📌 الحالة', value: '✅ مفعّل', inline: true },
            { name: '🎤 القناة', value: channel ? channel.name : 'غير معروفة', inline: true }
          )
          .setFooter({ text: 'Unit S | 24/7 Voice' })
          .setTimestamp();

        await message.channel.send({ embeds: [embed] });
      } else {
        const embed = new EmbedBuilder()
          .setTitle('🔊 24/7 Voice Status')
          .setColor(0xDC2626)
          .addFields(
            { name: 'الحالة', value: '❌ معطّل', inline: true },
            { name: 'الاستخدام', value: '`!24voice [channel_id]` - تشغيل\n`!24voice stop` - إيقاف', inline: false }
          )
          .setFooter({ text: 'Unit S | 24/7 Voice' })
          .setTimestamp();

        await message.channel.send({ embeds: [embed] });
      }
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    // Stop command
    if (args[0].toLowerCase() === 'stop') {
      if (voiceConnection) {
        voiceConnection.destroy();
        voiceConnection = null;
        voiceChannelId = null;
        await message.channel.send('✅ تم إيقاف 24/7 Voice بنجاح!');
      } else {
        await message.channel.send('❌ البوت غير متصل بأي قناة صوتية!');
      }
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    // Join voice channel - Get channel ID from args
    let channelId = args[0].replace(/[^0-9]/g, '');

    // If no channel ID found, show error
    if (!channelId || channelId.length < 10) {
      await message.channel.send('❌ الاستخدام: `!24voice [channel_id]`\n\n مثال: `!24voice 123456789012345678`\n\n كيف تحصل على Channel ID:\n1. فعّل Developer Mode في Discord\n2. كليك يمين على القناة الصوتية\n3. اختر Copy Channel ID');
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    try {
      // Fetch the channel
      const channel = await message.guild.channels.fetch(channelId);

      if (!channel) {
        await message.channel.send('❌ لم يتم العثور على القناة!\nتأكد من صحة Channel ID');
        if (!message.deleted) message.delete().catch(() => {});
        return;
      }

      // Check if it's a voice channel (type 2 = GUILD_VOICE, 13 = GUILD_STAGE_VOICE)
      if (channel.type !== 2 && channel.type !== 13) {
        await message.channel.send('❌ هذه ليست قناة صوتية!\nالرجاء اختيار قناة صوتية (Voice Channel)');
        if (!message.deleted) message.delete().catch(() => {});
        return;
      }

      // Check bot permissions
      const botMember = message.guild.members.cache.get(client.user.id);
      if (!botMember.permissionsIn(channel).has('Connect')) {
        await message.channel.send('❌ البوت ليس لديه صلاحية للاتصال بهذه القناة!\nتأكد من إعدادات القناة');
        if (!message.deleted) message.delete().catch(() => {});
        return;
      }

      // Disconnect from previous channel if connected
      if (voiceConnection) {
        voiceConnection.destroy();
      }

      // Join the voice channel using @discordjs/voice
      await message.channel.send('🔄 جاري الاتصال بالقناة الصوتية...');

      const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator,
      });

      voiceConnection = connection;
      voiceChannelId = channelId;

      // Create audio player to stay in voice (prevents disconnect)
      // ملاحظة: يحتاج FFmpeg مثبت على السيرفر
      try {
        const player = createAudioPlayer();
        const resource = createAudioResource('https://www.youtube.com/watch?v=dQw4w9WgXcQ', { inlineVolume: true });
        player.play(resource);
        connection.subscribe(player);
      } catch (audioErr) {
        console.log('[24/7 VOICE] Audio not available, staying connected without audio');
      }

      const embed = new EmbedBuilder()
        .setTitle(' تم الاتصال بالقناة الصوتية')
        .setColor(0x10B981)
        .addFields(
          { name: ' القناة', value: channel.name, inline: true },
          { name: ' الحالة', value: '✅ البوت سيبقى 24/7', inline: true },
          { name: ' ملاحظة', value: 'إذا انقطع البوت، سيرجع يتصل تلقائياً', inline: false }
        )
        .setFooter({ text: 'Unit S | 24/7 Voice' })
        .setTimestamp();

      await message.channel.send({ embeds: [embed] });
      if (!message.deleted) message.delete().catch(() => {});

      console.log(`[24/7 VOICE] Connected to channel: ${channel.name} (${channelId})`);

    } catch (err) {
      console.error('24/7 Voice error:', err);
      await message.channel.send(`❌ حدث خطأ: ${err.message}`);
      if (!message.deleted) message.delete().catch(() => {});
    }
  },
});

// Alias for joinvoice
client.commands.set('joinvoice', client.commands.get('24voice'));
client.commands.set('voice24', client.commands.get('24voice'));

// ============ FREE RANK COMMAND ============
client.commands.set('freerank', {
  name: 'freerank',
  description: 'Free rank management',
  execute: async (message, args) => {
    // Check if user has admin permissions
    if (!hasModRole(message.member) && !modSettings.adminUsers.includes(message.author.username)) {
      await message.channel.send('❌ ليس لديك صلاحية!');
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    // If no args, show help
    if (args.length === 0) {
      const embed = new EmbedBuilder()
        .setTitle('Unit S | الرتبة المجانية')
        .setColor(0x667eea)
        .setDescription('أوامر إدارة الرتبة المجانية:')
        .addFields(
          { name: '`!freerank setup`', value: 'إنشاء لوحة الرتبة المجانية في القناة الحالية', inline: false },
          { name: '`!freerank setrole [role_id]`', value: 'تعيين رتبة البيع بالأيدي', inline: false },
          { name: '`!freerank setrole [اسم]`', value: 'تعيين رتبة البيع بالاسم', inline: false },
          { name: '`!freerank setmax [عدد]`', value: 'تعيين الحد الأقصى للمطالبات', inline: false },
          { name: '`!freerank reset`', value: 'إعادة تعيين العداد والمطالبات', inline: false },
          { name: '`!freerank stats`', value: 'عرض إحصائيات الرتبة المجانية', inline: false },
          { name: '`!freerank enable`', value: 'تفعيل الرتبة المجانية', inline: false },
          { name: '`!freerank disable`', value: 'تعطيل الرتبة المجانية', inline: false },
          { name: '`!freerank setlog #قناة`', value: 'تعيين قناة اللوج', inline: false }
        )
        .setFooter({ text: 'Unit S | Free Rank System' })
        .setTimestamp();

      await message.channel.send({ embeds: [embed] });
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    const action = args[0].toLowerCase();

    // Setup panel
    if (action === 'setup') {
      if (!freeRankSettings.roleId && !freeRankSettings.roleName) {
        await message.channel.send('❌ لم يتم تعيين الرتبة! استخدم `!freerank setrole [ايدي/اسم]` أولاً');
        if (!message.deleted) message.delete().catch(() => {});
        return;
      }

      // Create the embed - تصميم احترافي
      const remaining = freeRankSettings.maxClaims === 0 ? '∞' : freeRankSettings.maxClaims - freeRankSettings.claimedCount;

      const freeRankEmbed = new EmbedBuilder()
        .setColor(0xff0000)
        .setAuthor({
          name: 'رتبة مجانية',
          iconURL: 'https://media.discordapp.net/attachments/1397309666752593920/1495169429741240511/UNIT_4306000.png?ex=69e6960a&is=69e5448a&hm=bc63944a60898ed0271e92008aaccaa3be3945d85455fcbe3a4e32d1a8559c37&=format=webp&quality=lossless&width=788&height=788'
        })
        .setImage('https://cdn.discordapp.net/attachments/1397309666752593920/1495543234166919351/4cc71a18-6f61-459e-8e8a-293c31b199b4.png?ex=69e6a0ac&is=69e54f2c&hm=247d340eb85f00962d3e650df57c9221a78c33f75de0b5938a2340f503dfa33d&')
        .setDescription([
          '**__<:zO_246:1495222454530871346> للحصول على رتبة بيع مجانية اضغط على زر <a:Taj:1495224006947639377> بالأسفل :__**',
          '',
          '**الـرتب الـمـسـتـخـدمـة :**',
          '',
          '> **' + freeRankSettings.claimedCount + '**',
          '',
          '**الـرتـب الـمتـبـقـيـة :**',
          '',
          '> **' + remaining + '**'
        ].join('\n'));

      const panelMessage = await message.channel.send({
        content: '_ _',
        embeds: [freeRankEmbed],
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setLabel('1')
              .setCustomId('free_rank_claim')
              .setEmoji({ name: 'Taj', id: '1495224006947639377' })
              .setStyle(ButtonStyle.Secondary)
          )
        ]
      });

      freeRankSettings.panelChannelId = message.channel.id;
      freeRankSettings.panelMessageId = panelMessage.id;

      saveFreeRankSettings(freeRankSettings);

      await message.channel.send('✅ تم إنشاء لوحة الرتبة المجانية بنجاح!');
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    // Set role by ID
    if (action === 'setrole') {
      const roleInput = args.slice(1).join(' ');

      if (!roleInput) {
        await message.channel.send('❌ استخدم: `!freerank setrole [ايدي الرتبة]` أو `!freerank setrole [اسم الرتبة]`');
        if (!message.deleted) message.delete().catch(() => {});
        return;
      }

      // Check if it's a role ID (number)
      if (/^\d+$/.test(roleInput)) {
        const role = message.guild.roles.cache.get(roleInput);
        if (!role) {
          await message.channel.send('❌ لم يتم العثور على الرتبة بهذا الأيدي!');
          if (!message.deleted) message.delete().catch(() => {});
          return;
        }
        freeRankSettings.roleId = roleInput;
        freeRankSettings.roleName = role.name;
      } else {
        // Search by name
        const role = message.guild.roles.cache.find(r =>
          r.name.toLowerCase().includes(roleInput.toLowerCase())
        );
        if (!role) {
          await message.channel.send(`❌ لم يتم العثور على رتبة تحتوي على: "${roleInput}"`);
          if (!message.deleted) message.delete().catch(() => {});
          return;
        }
        freeRankSettings.roleId = role.id;
        freeRankSettings.roleName = role.name;
      }

      await message.channel.send(`✅ تم تعيين الرتبة: **${freeRankSettings.roleName}**`);
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    // Set max claims
    if (action === 'setmax') {
      const maxInput = args[1];

      if (!maxInput || isNaN(maxInput)) {
        await message.channel.send('❌ استخدم: `!freerank setmax [عدد]`\n(ضع 0 للإرسال غير محدود)');
        if (!message.deleted) message.delete().catch(() => {});
        return;
      }

      freeRankSettings.maxClaims = parseInt(maxInput);
      await message.channel.send(`✅ تم تعيين الحد الأقصى للمطالبات: **${freeRankSettings.maxClaims === 0 ? 'غير محدود' : freeRankSettings.maxClaims}**`);
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    // Reset counter
    if (action === 'reset') {
      freeRankSettings.claimedCount = 0;
      freeRankSettings.claimedUsers = [];

      await message.channel.send('✅ تم إعادة تعيين العداد والمطالبات!');
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    // Enable free rank
    if (action === 'enable') {
      freeRankSettings.enabled = true;
      saveFreeRankSettings(freeRankSettings);
      await message.channel.send('✅ تم تفعيل نظام الرتبة المجانية!');
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    // Disable free rank
    if (action === 'disable') {
      freeRankSettings.enabled = false;
      saveFreeRankSettings(freeRankSettings);
      await message.channel.send('❌ تم تعطيل نظام الرتبة المجانية!');
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    // Stats
    if (action === 'stats') {
      const remaining = freeRankSettings.maxClaims === 0 ? '∞' : freeRankSettings.maxClaims - freeRankSettings.claimedCount;

      // Get existing panel message
      const panelChannel = message.guild.channels.cache.get(freeRankSettings.panelChannelId);
      if (panelChannel) {
        try {
          const panelMessage = await panelChannel.messages.fetch(freeRankSettings.panelMessageId);
          await panelMessage.edit({
            content: '_ _',
            embeds: [{
              color: 0xff0000,
              author: {
                name: 'رتبة مجانية',
                iconURL: 'https://media.discordapp.net/attachments/1397309666752593920/1495169429741240511/UNIT_4306000.png?ex=69e6960a&is=69e5448a&hm=bc63944a60898ed0271e92008aaccaa3be3945d85455fcbe3a4e32d1a8559c37&=format=webp&quality=lossless&width=788&height=788'
              },
              image: { url: 'https://cdn.discordapp.com/attachments/1397309666752593920/1495543234166919351/4cc71a18-6f61-459e-8e8a-293c31b199b4.png?ex=69e6a0ac&is=69e54f2c&hm=247d340eb85f00962d3e650df57c9221a78c33f75de0b5938a2340f503dfa33d&' },
              description: [
                '**__<:zO_246:1495222454530871346> للحصول على رتبة بيع مجانية اضغط على زر <a:Taj:1495224006947639377> بالأسفل :__**',
                '',
                '**الـرتب الـمـسـتـخـدمـة :**',
                '',
                '> **' + freeRankSettings.claimedCount + '**',
                '',
                '**الـرتـب الـمتـبـقـيـة :**',
                '',
                '> **' + remaining + '**'
              ].join('\n')
            }],
            components: [{
              type: 1,
              components: [{
                type: 2,
                style: 2,
                label: '1',
                customId: 'free_rank_claim',
                emoji: { name: 'Taj', id: '1495224006947639377' }
              }]
            }]
          });
        } catch (err) {
          console.error('Error updating panel:', err);
        }
      }

      await message.channel.send('✅ تم عرض الإحصائيات!');
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }
  }
});

// ============ BAN COMMAND ============
client.commands.set('ban', {
  name: 'ban',
  description: 'Ban a user from the server',
  execute: async (message, args) => {
    // Check permissions
    if (!message.member.permissions.has('BanMembers')) {
      if (!hasModRole(message.member)) {
        await message.channel.send('❌ ليس لديك صلاحية!');
        if (!message.deleted) message.delete().catch(() => {});
        return;
      }
    }

    // Parse arguments
    const user = message.mentions.users.first();
    const userId = args.find(arg => !arg.startsWith('<@') && !arg.startsWith('!'));
    let reason = args.slice(user ? 1 : 0).join(' ') || 'No reason provided';

    let targetUser = user;

    // If no mention, try to fetch by ID
    if (!targetUser && userId) {
      try {
        targetUser = await client.users.fetch(userId);
      } catch (err) {
        await message.channel.send('❌ لم يتم العثور على المستخدم!');
        if (!message.deleted) message.delete().catch(() => {});
        return;
      }
    }

    if (!targetUser) {
      const embed = new EmbedBuilder()
        .setTitle('BAN COMMAND')
        .setColor(0xDC2626)
        .addFields(
          { name: 'Usage:', value: '`!ban @user [reason]` or `!ban [user_id] [reason]`', inline: false },
          { name: 'Example:', value: '`!ban @username spamming`\n`!ban 123456789 spamming`', inline: false }
        )
        .setFooter({ text: 'Unit S - Moderation' });
      await message.channel.send({ embeds: [embed] });
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    // Get member from guild
    const guild = message.guild;
    let targetMember;
    try {
      targetMember = await guild.members.fetch(targetUser.id);
    } catch (err) {
      // User not in server
    }

    // Check if trying to ban higher role
    if (targetMember) {
      if (targetMember.roles.highest.position >= message.member.roles.highest.position && message.guild.ownerId !== message.member.id) {
        await message.channel.send('❌ لا يمكنك حظر هذا العضو!');
        if (!message.deleted) message.delete().catch(() => {});
        return;
      }
    }

    // Ban the user
    try {
      await guild.members.ban(targetUser.id, { reason: `By: ${message.author.tag} | Reason: ${reason}` });

      // Log the ban
      await logBan(guild, message.author, targetUser, reason);

      // Confirmation message
      const embed = new EmbedBuilder()
        .setTitle('USER BANNED')
        .setColor(0xDC2626)
        .addFields(
          { name: ' Banned User', value: `${targetUser.tag}`, inline: true },
          { name: 'Reason', value: reason, inline: true },
          { name: '<:6542stafficonred:1495225057209880706> By Admin', value: message.author.tag, inline: true }
        )
        .setFooter({ text: 'Unit S - Moderation' })
        .setTimestamp();

      await message.channel.send({ embeds: [embed] });
      if (!message.deleted) message.delete().catch(() => {});

    } catch (err) {
      console.error('Ban error:', err);
      await message.channel.send(`❌ حدث خطأ أثناء الحظر: ${err.message}`);
      if (!message.deleted) message.delete().catch(() => {});
    }
  },
});

// ============ UNBAN COMMAND ============
client.commands.set('unban', {
  name: 'unban',
  description: 'Unban a user from the server',
  execute: async (message, args) => {
    // Check permissions
    if (!message.member.permissions.has('BanMembers')) {
      if (!hasModRole(message.member)) {
        await message.channel.send('❌ ليس لديك صلاحية!');
        if (!message.deleted) message.delete().catch(() => {});
        return;
      }
    }

    if (args.length === 0) {
      const embed = new EmbedBuilder()
        .setTitle('<:6542stafficonred:1495225057209880706> UNBAN COMMAND')
        .setColor(0x10B981)
        .addFields(
          { name: 'Usage:', value: '`!unban [user_id]`', inline: false },
          { name: 'Example:', value: '`!unban 123456789`', inline: false }
        )
        .setFooter({ text: 'Unit S - Moderation' });
      await message.channel.send({ embeds: [embed] });
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    const userId = args[0];

    try {
      const user = await client.users.fetch(userId);
      await message.guild.members.unban(userId);

      // Log the unban
      const embed = new EmbedBuilder()
        .setTitle('🔓 USER UNBANNED')
        .setColor(0x10B981)
        .addFields(
          { name: '👤 Unbanned User', value: user.tag, inline: true },
          { name: '🔓 By Admin', value: message.author.tag, inline: true }
        )
        .setFooter({ text: 'Unit S - Moderation' })
        .setTimestamp();

      await message.channel.send({ embeds: [embed] });

      // Send to ban log
      const banLogEmbed = new EmbedBuilder()
        .setTitle('<:6542stafficonred:1495225057209880706> UNBAN LOG')
        .setColor(0x10B981)
        .addFields(
          { name: '<:6542stafficonred:1495225057209880706> Admin', value: message.author.tag, inline: true },
          { name: '<:6542stafficonred:1495225057209880706> Unbanned User', value: user.tag, inline: true },
          { name: '🆔 User ID', value: userId, inline: true },
          { name: '⏰ Time', value: new Date().toLocaleString('ar-SA'), inline: false }
        )
        .setFooter({ text: 'Unit S - Moderation' })
        .setTimestamp();

      await sendLog(message.guild, 'ban', banLogEmbed);

      if (!message.deleted) message.delete().catch(() => {});

    } catch (err) {
      console.error('Unban error:', err);
      await message.channel.send('❌ لم يتم العثور على المستخدم أو حدث خطأ!');
      if (!message.deleted) message.delete().catch(() => {});
    }
  },
});

// ============ KICK COMMAND ============
client.commands.set('kick', {
  name: 'kick',
  description: 'Kick a user from the server',
  execute: async (message, args) => {
    // Check permissions
    if (!message.member.permissions.has('KickMembers')) {
      if (!hasModRole(message.member)) {
        await message.channel.send('❌ ليس لديك صلاحية!');
        if (!message.deleted) message.delete().catch(() => {});
        return;
      }
    }

    // Parse arguments
    const user = message.mentions.users.first();
    const userId = args.find(arg => !arg.startsWith('<@') && !arg.startsWith('!'));
    let reason = args.slice(user ? 1 : 0).join(' ') || 'No reason provided';

    let targetUser = user;

    // If no mention, try to fetch by ID
    if (!targetUser && userId) {
      try {
        targetUser = await client.users.fetch(userId);
      } catch (err) {
        await message.channel.send('❌ لم يتم العثور على المستخدم!');
        if (!message.deleted) message.delete().catch(() => {});
        return;
      }
    }

    if (!targetUser) {
      const embed = new EmbedBuilder()
        .setTitle('🦵 KICK COMMAND')
        .setColor(0xF59E0B)
        .addFields(
          { name: 'Usage:', value: '`!kick @user [reason]` or `!kick [user_id] [reason]`', inline: false },
          { name: 'Example:', value: '`!kick @username rule break`\n`!kick 123456789 rule break`', inline: false }
        )
        .setFooter({ text: 'Unit S - Moderation' });
      await message.channel.send({ embeds: [embed] });
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    // Get member from guild
    const guild = message.guild;
    let targetMember;
    try {
      targetMember = await guild.members.fetch(targetUser.id);
    } catch (err) {
      await message.channel.send('❌ هذا العضو غير موجود في السيرفر!');
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    // Check if trying to kick higher role
    if (targetMember.roles.highest.position >= message.member.roles.highest.position && message.guild.ownerId !== message.member.id) {
      await message.channel.send('❌ لا يمكنك طرد هذا العضو!');
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    // Kick the user
    try {
      await targetMember.kick(`By: ${message.author.tag} | Reason: ${reason}`);

      // Log the kick
      await logKick(guild, message.author, targetUser, reason);

      // Confirmation message
      const embed = new EmbedBuilder()
        .setTitle('🦵 USER KICKED')
        .setColor(0xF59E0B)
        .addFields(
          { name: '👤 Kicked User', value: `${targetUser.tag}`, inline: true },
          { name: '📝 Reason', value: reason, inline: true },
          { name: '🦵 By Admin', value: message.author.tag, inline: true }
        )
        .setFooter({ text: 'Unit S - Moderation' })
        .setTimestamp();

      await message.channel.send({ embeds: [embed] });
      if (!message.deleted) message.delete().catch(() => {});

    } catch (err) {
      console.error('Kick error:', err);
      await message.channel.send(`❌ حدث خطأ أثناء الطرد: ${err.message}`);
      if (!message.deleted) message.delete().catch(() => {});
    }
  },
});

// ============ LOGS COMMAND ============
client.commands.set('logs', {
  name: 'logs',
  description: 'Manage log channels',
  execute: async (message, args) => {
    // Check permissions
    if (!message.member.permissions.has('ManageChannels')) {
      if (!hasModRole(message.member)) {
        await message.channel.send('❌ ليس لديك صلاحية!');
        if (!message.deleted) message.delete().catch(() => {});
        return;
      }
    }

    if (args.length === 0) {
      // Show current settings
      const showChannel = (id) => id ? `<#${id}>` : '❌ Not set';

      const embed = new EmbedBuilder()
        .setTitle('📋 LOG CHANNELS SETTINGS')
        .setColor(0x3B82F6)
        .addFields(
          { name: '📁 All Logs', value: showChannel(logSettings.allLog), inline: true },
          { name: '🔨 Ban Logs', value: showChannel(logSettings.banLog), inline: true },
          { name: '🦵 Kick Logs', value: showChannel(logSettings.kickLog), inline: true },
          { name: '⏱️ Timeout Logs', value: showChannel(logSettings.timeoutLog), inline: true },
          { name: '💬 Message Logs', value: showChannel(logSettings.messagesLog), inline: true },
          { name: '📂 Room Logs', value: showChannel(logSettings.roomsLog), inline: true },
          { name: '👋 Join/Leave Logs', value: showChannel(logSettings.joinLeaveLog), inline: true },
          { name: '🎭 Role Logs', value: showChannel(logSettings.rolesLog), inline: true }
        )
        .addFields(
          { name: '\n📝 Commands:', value:
            '`!logs set all #channel` - Set all-log\n' +
            '`!logs set ban #channel` - Set ban-log\n' +
            '`!logs set kick #channel` - Set kick-log\n' +
            '`!logs set timeout #channel` - Set timeout-log\n' +
            '`!logs set messages #channel` - Set messages-log\n' +
            '`!logs set rooms #channel` - Set rooms-log\n' +
            '`!logs set joinleave #channel` - Set join-leave-log\n' +
            '`!logs set roles #channel` - Set roles-log\n' +
            '`!logs clear [type]` - Clear a log channel\n' +
            '`!logs clear all` - Clear all log channels', inline: false }
        )
        .setFooter({ text: 'Unit S - Moderation' })
        .setTimestamp();

      await message.channel.send({ embeds: [embed] });
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    const action = args[0].toLowerCase();

    // SET command
    if (action === 'set') {
      const type = args[1]?.toLowerCase();
      const channel = message.mentions.channels.first();

      if (!type || !channel) {
        await message.channel.send('❌ الاستخدام: `!logs set [type] #channel`');
        await message.channel.send('📋 الأنواع: `all`, `ban`, `kick`, `timeout`, `messages`, `rooms`, `joinleave`, `roles`');
        if (!message.deleted) message.delete().catch(() => {});
        return;
      }

      const typeMap = {
        all: 'allLog',
        ban: 'banLog',
        kick: 'kickLog',
        timeout: 'timeoutLog',
        messages: 'messagesLog',
        rooms: 'roomsLog',
        joinleave: 'joinLeaveLog',
        roles: 'rolesLog',
      };

      const settingKey = typeMap[type];
      if (!settingKey) {
        await message.channel.send('❌ نوع غير صالح! الأنواع: `all`, `ban`, `kick`, `timeout`, `messages`, `rooms`, `joinleave`, `roles`');
        if (!message.deleted) message.delete().catch(() => {});
        return;
      }

      logSettings[settingKey] = channel.id;

      const embed = new EmbedBuilder()
        .setTitle('✅ LOG CHANNEL SET')
        .setColor(0x10B981)
        .addFields(
          { name: 'Type', value: type.toUpperCase(), inline: true },
          { name: 'Channel', value: channel.name, inline: true }
        )
        .setFooter({ text: 'Unit S - Moderation' })
        .setTimestamp();

      await message.channel.send({ embeds: [embed] });
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    // CLEAR command
    if (action === 'clear') {
      const type = args[1]?.toLowerCase();

      if (!type) {
        await message.channel.send('❌ الاستخدام: `!logs clear [type]` أو `!logs clear all`');
        if (!message.deleted) message.delete().catch(() => {});
        return;
      }

      if (type === 'all') {
        logSettings.allLog = null;
        logSettings.banLog = null;
        logSettings.kickLog = null;
        logSettings.timeoutLog = null;
        logSettings.messagesLog = null;
        logSettings.roomsLog = null;
        logSettings.joinLeaveLog = null;
        logSettings.rolesLog = null;

        await message.channel.send('✅ تم مسح جميع قنوات اللوج!');
        if (!message.deleted) message.delete().catch(() => {});
        return;
      }

      const typeMap = {
        all: 'allLog',
        ban: 'banLog',
        kick: 'kickLog',
        timeout: 'timeoutLog',
        messages: 'messagesLog',
        rooms: 'roomsLog',
        joinleave: 'joinLeaveLog',
        roles: 'rolesLog',
      };

      const settingKey = typeMap[type];
      if (!settingKey) {
        await message.channel.send('❌ نوع غير صالح!');
        if (!message.deleted) message.delete().catch(() => {});
        return;
      }

      logSettings[settingKey] = null;
      await message.channel.send(`✅ تم مسح قناة ${type.toUpperCase()} log!`);
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    // Unknown command
    await message.channel.send('❌ أمر غير معروف! استخدم `!logs` لعرض الأوامر.');
    if (!message.deleted) message.delete().catch(() => {});
  },
});

// ============ MODSETTINGS COMMAND ============
client.commands.set('modsettings', {
  name: 'modsettings',
  description: 'Manage moderation settings',
  execute: async (message, args) => {
    // Check permissions
    if (!message.member.permissions.has('ManageChannels')) {
      if (!hasModRole(message.member)) {
        await message.channel.send('❌ ليس لديك صلاحية!');
        if (!message.deleted) message.delete().catch(() => {});
        return;
      }
    }

    if (args.length === 0) {
      // Show current settings
      let rolesList = modSettings.adminRoles.length > 0
        ? modSettings.adminRoles.map(id => `<@&${id}>`).join('\n')
        : 'No roles set';
      let roleNamesList = modSettings.adminRoleNames.length > 0
        ? modSettings.adminRoleNames.join('\n')
        : 'No role names set';

      const embed = new EmbedBuilder()
        .setTitle('⚙️ MODERATION SETTINGS')
        .setColor(0x8B5CF6)
        .addFields(
          { name: '👮 Admin Roles', value: rolesList, inline: false },
          { name: '📝 Admin Role Names', value: roleNamesList, inline: false },
          { name: '👤 Admin Users', value: modSettings.adminUsers.join('\n') || 'None', inline: false }
        )
        .addFields(
          { name: '\n📝 Commands:', value:
            '`!modsettings addrole @role` - Add admin role\n' +
            '`!modsettings removerole @role` - Remove admin role\n' +
            '`!modsettings addadminname [name]` - Add role name\n' +
            '`!modsettings removeadminname [name]` - Remove role name\n' +
            '`!modsettings adduser [name]` - Add admin user\n' +
            '`!modsettings removeuser [name]` - Remove admin user', inline: false }
        )
        .setFooter({ text: 'Unit S - Moderation' })
        .setTimestamp();

      await message.channel.send({ embeds: [embed] });
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    const action = args[0].toLowerCase();

    // Add role
    if (action === 'addrole') {
      const role = message.mentions.roles.first();
      if (!role) {
        await message.channel.send('❌ الاستخدام: `!modsettings addrole @role`');
        if (!message.deleted) message.delete().catch(() => {});
        return;
      }

      if (!modSettings.adminRoles.includes(role.id)) {
        modSettings.adminRoles.push(role.id);
        await message.channel.send(`✅ تم إضافة ${role.name} كأدمن!`);
      } else {
        await message.channel.send('⚠️ الرول موجودة مسبقاً!');
      }
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    // Remove role
    if (action === 'removerole') {
      const role = message.mentions.roles.first();
      if (!role) {
        await message.channel.send('❌ الاستخدام: `!modsettings removerole @role`');
        if (!message.deleted) message.delete().catch(() => {});
        return;
      }

      const index = modSettings.adminRoles.indexOf(role.id);
      if (index > -1) {
        modSettings.adminRoles.splice(index, 1);
        await message.channel.send(`✅ تم إزالة ${role.name} من الأدمن!`);
      } else {
        await message.channel.send('⚠️ الرول غير موجودة!');
      }
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    // Add admin name
    if (action === 'addadminname') {
      const name = args.slice(1).join(' ');
      if (!name) {
        await message.channel.send('❌ الاستخدام: `!modsettings addadminname [name]`');
        if (!message.deleted) message.delete().catch(() => {});
        return;
      }

      if (!modSettings.adminRoleNames.includes(name)) {
        modSettings.adminRoleNames.push(name);
        await message.channel.send(`✅ تم إضافة "${name}" كأدمن!`);
      } else {
        await message.channel.send('⚠️ الاسم موجود مسبقاً!');
      }
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    // Remove admin name
    if (action === 'removeadminname') {
      const name = args.slice(1).join(' ');
      if (!name) {
        await message.channel.send('❌ الاستخدام: `!modsettings removeadminname [name]`');
        if (!message.deleted) message.delete().catch(() => {});
        return;
      }

      const index = modSettings.adminRoleNames.indexOf(name);
      if (index > -1) {
        modSettings.adminRoleNames.splice(index, 1);
        await message.channel.send(`✅ تم إزالة "${name}" من الأدمن!`);
      } else {
        await message.channel.send('⚠️ الاسم غير موجود!');
      }
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    // Add user
    if (action === 'adduser') {
      const name = args.slice(1).join(' ');
      if (!name) {
        await message.channel.send('❌ الاستخدام: `!modsettings adduser [name]`');
        if (!message.deleted) message.delete().catch(() => {});
        return;
      }

      if (!modSettings.adminUsers.includes(name)) {
        modSettings.adminUsers.push(name);
        await message.channel.send(`✅ تم إضافة "${name}" كأدمن!`);
      } else {
        await message.channel.send('⚠️ المستخدم موجود مسبقاً!');
      }
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    // Remove user
    if (action === 'removeuser') {
      const name = args.slice(1).join(' ');
      if (!name) {
        await message.channel.send('❌ الاستخدام: `!modsettings removeuser [name]`');
        if (!message.deleted) message.delete().catch(() => {});
        return;
      }

      const index = modSettings.adminUsers.indexOf(name);
      if (index > -1) {
        modSettings.adminUsers.splice(index, 1);
        await message.channel.send(`✅ تم إزالة "${name}" من الأدمن!`);
      } else {
        await message.channel.send('⚠️ المستخدم غير موجود!');
      }
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    await message.channel.send('❌ أمر غير معروف! استخدم `!modsettings` لعرض الأوامر.');
    if (!message.deleted) message.delete().catch(() => {});
  },
});

// ============ TICKET MENU - Viper S Design ============
client.commands.set('ticket', {
  name: 'ticket',
  description: 'Open ticket menu - UNIT S design',
  execute: async (message) => {
    if (!hasAllowedRole(message.member)) {
      await message.channel.send('❌ ليس لديك صلاحية لفتح تذكرة!');
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    // Step 1: Main menu - Viper S Design
    const ticketPayload = {
      content: '_ _',
      embeds: [
        {
          color: 0xff0000,
          author: {
            name: 'الـتـذكـرة',
            icon_url: 'https://media.discordapp.net/attachments/1397309666752593920/1495169429741240511/UNIT_4306000.png?ex=69e5448a&is=69e3f30a&hm=d1143eeac3289c0b55d81d3275a529dbc46a324607e5a8dc5326486b1b08c327&=format=webp&quality=lossless&width=788&height=788'
          },
          description: [
            '**هنا يُمكنك الحصول على المساعدة عن طريق  :<:vanka237:1495225240035262597>**',
            '',
            '**__  الـدعـم الـفـنـي__ : شراء رتبة ، استفسار ، إنشاء روم خاص ، منشور بـ <#1495217972896071882> <:6542stafficonred:1495225057209880706>**',
            '',
            '** __الـشـكـاوي__ : للبلاغ عن فرد من طاثم الدعم الفني الخاص بـ Unit S <:StaffHighCommand:1495224616585658418>**',
            '',
            '__ ـــــــــــــــــــــــــــــــــــــــــــــــــ <a:emrp_warning:1495223911871414403> ـــــــــــــــــــــــــــــــــــــــــــــــــــ __',
            '',
            '**يُمنع الازعاج بالمنشن والاسبام داخل التذكرة <:warn:1495225561520541848>**',
            '',
            '**يُمنع السب والشتم داخل التذكرة مهما كان السبب <:warn:1495225561520541848>**',
            '',
            '**يُمنع فتح التذكرة بدون سبباو للاستهبال <:warn:1495225561520541848>**',
            '',
            '**في حال خالفة احد القوانين اعلاه ستتعرض للكتم <:warn:1495225561520541848>**',
            '',
            '__ ـــــــــــــــــــــــــــــــــــــــــــــــــ <:vanka237:1495225240035262597> ـــــــــــــــــــــــــــــــــــــــــــــــــــ __'
          ].join('\n'),
          image: {
            url: 'https://cdn.discordapp.com/attachments/1397309666752593920/1495169428738936852/UNIT_406004040.webp?ex=69e5448a&is=69e3f30a&hm=be61008c6e62b1b6783e3af827d9a737804a90f617421c905fa4881c90a03994&'
          }
        }
      ],
      components: [
        {
          type: 1,
          components: [
            {
              type: 3,
              custom_id: 'ticket_main_select',
              options: [
                {
                  label: 'الـدعـم الـفـنـي',
                  emoji: {
                    id: '1495235065440108584',
                    name: 'vanka237',
                    animated: false
                  },
                  value: 'ticket_technical'
                },
                {
                  label: 'الـشـكـاوي',
                  emoji: {
                    id: '1495234630310297671',
                    name: 'Reprot_Flag',
                    animated: false
                  },
                  value: 'ticket_complaint'
                },
                {
                  label: 'إعـادة تعيين الـقـائـمـة',
                  emoji: {
                    id: '1495234888931082333',
                    name: 'vanka239',
                    animated: false
                  },
                  value: 'ticket_reset'
                }
              ],
              placeholder: 'اختر من القائمة...',
              min_values: 1,
              max_values: 1
            }
          ]
        }
      ]
    };

    await message.channel.send(ticketPayload);
    if (!message.deleted) message.delete().catch(() => {});
  },
});

// ============ TICKET SUB-MENU SELECTIONS ============
client.commands.set('tmenu', {
  name: 'tmenu',
  description: 'Open ticket sub-menu',
  execute: async (message) => {
    if (!hasAllowedRole(message.member)) {
      await message.channel.send('❌ ليس لديك صلاحية!');
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    // Technical Support Sub-menu
    const technicalEmbed = new EmbedBuilder()
      .setTitle('🔧 الدعم الفني')
      .setDescription('اختر نوع المشكلة التي تواجهك')
      .setColor(0x667eea)
      .setFooter({ text: 'Unit S | Support' });

    const technicalMenu = new StringSelectMenuBuilder()
      .setCustomId('ticket_technical_type')
      .setPlaceholder('اختر من القائمة...')
      .addOptions([
        new StringSelectMenuOptionBuilder({
          label: 'مشكلة في رتبة',
          description: 'لم استلم رتبتي / مشكلة في الصلاحيات',
          value: 'rank_issue',
        }),
        new StringSelectMenuOptionBuilder({
          label: 'شراء رتبة عادية',
          description: 'للحصول على رتبة بصلاحيات محددة',
          value: 'buy_rank',
        }),
        new StringSelectMenuOptionBuilder({
          label: 'شراء رتبة مميزة',
          description: 'للحصول على رتبة مميزة',
          value: 'buy_premium_rank',
        }),
        new StringSelectMenuOptionBuilder({
          label: 'شراء رومات خاصة',
          description: 'إنشاء روم خاص بك',
          value: 'buy_private_room',
        }),
        new StringSelectMenuOptionBuilder({
          label: 'شراء إعلانات',
          description: 'لنشر إعلانك في السيرفر',
          value: 'buy_ads',
        }),
        new StringSelectMenuOptionBuilder({
          label: 'شراء منشورات مميزة',
          description: 'لعرض منشورك بشكل مميز',
          value: 'buy_featured_post',
        }),
        new StringSelectMenuOptionBuilder({
          label: 'عرض الرتب',
          description: 'لعرض الرتب المتاحة للشراء',
          value: 'ticket_ranks',
        }),
      ]);

    const row = new ActionRowBuilder().addComponents(technicalMenu);
    await message.channel.send({ embeds: [technicalEmbed], components: [row] });
  },
});

// ============ RANKS MENU ============
client.commands.set('ranks', {
  name: 'ranks',
  description: 'Show available ranks for purchase',
  execute: async (message) => {
    const ranks = [
      { name: 'Coder S.', price: 150000, features: ['نشر في رومات محددة', 'إمكانية منشن', 'صلاحيات خاصة'] },
      { name: 'Artisan S.', price: 200000, features: ['نشر في رومات معينة', 'نشر صور في رومات محددة', 'إمكانية منشن'] },
      { name: 'Novice S.', price: 250000, features: ['نشر في جميع الرومات', 'عدم نشر صور', 'إمكانية منشن'] },
      { name: 'Elite S.', price: 300000, features: ['نشر في جميع الرومات', 'نشر صور', 'عدم المنشن'] },
      { name: 'Master S.', price: 550000, features: ['نشر في جميع الرومات', 'نشر صور في رومات محددة', 'إمكانية منشن'] },
      { name: 'Legend S.', price: 750000, features: ['نشر في جميع الرومات', 'نشر صور', 'إمكانية منشن'] },
      { name: 'Seraph S.', price: 1000000, features: ['جميع الصلاحيات', 'نشر صور في جميع الرومات', 'منشن كامل'] },
    ];

    const embeds = [];
    for (let i = 0; i < ranks.length; i += 3) {
      const chunk = ranks.slice(i, i + 3);
      const embed = new EmbedBuilder()
        .setTitle('👑 رتب Unit S')
        .setColor(0x667eea)
        .setFooter({ text: `Unit S | الصفحة ${Math.floor(i / 3) + 1}` });

      for (const rank of chunk) {
        embed.addFields({
          name: `${rank.name} - $${rank.price.toLocaleString()}`,
          value: rank.features.map(f => `• ${f}`).join('\n'),
          inline: false
        });
      }

      embeds.push(embed);
    }

    const buyButton = new ButtonBuilder()
      .setCustomId('buy_rank_ticket')
      .setLabel('شراء رتبة')
      .setStyle(ButtonStyle.Success)
      .setEmoji('💰');

    const backButton = new ButtonBuilder()
      .setCustomId('back_to_menu')
      .setLabel('رجوع للقائمة')
      .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder().addComponents(buyButton, backButton);

    await message.channel.send({ embeds: embeds, components: [row] });
    if (!message.deleted) message.delete().catch(() => {});
  },
});

// ============ PURCHASE MENU ============
client.commands.set('shop', {
  name: 'shop',
  description: 'Show shop options',
  execute: async (message) => {
    const embed = new EmbedBuilder()
      .setTitle('💰 لوحة الشراء')
      .setDescription('اختر ما تريد شراؤه')
      .setColor(0x667eea)
      .setFooter({ text: 'Unit S | Shop' });

    const shopMenu = new StringSelectMenuBuilder()
      .setCustomId('shop_select')
      .setPlaceholder('اختر ما تريد شراؤه...')
      .addOptions([
        new StringSelectMenuOptionBuilder({
          label: 'شراء رتبة عادية',
          description: 'للحصول على رتبة بصلاحيات محددة',
          value: 'buy_rank',
          emoji: '👑',
        }),
        new StringSelectMenuOptionBuilder({
          label: 'شراء رتبة مميزة',
          description: 'للحصول على رتبة مميزة',
          value: 'buy_premium_rank',
          emoji: '💎',
        }),
        new StringSelectMenuOptionBuilder({
          label: 'شراء رومات خاصة',
          description: 'إنشاء روم خاص بك',
          value: 'buy_private_room',
          emoji: '🔒',
        }),
        new StringSelectMenuOptionBuilder({
          label: 'شراء إعلانات',
          description: 'لنشر إعلانك في السيرفر',
          value: 'buy_ads',
          emoji: '📢',
        }),
        new StringSelectMenuOptionBuilder({
          label: 'شراء منشورات مميزة',
          description: 'لعرض منشورك بشكل مميز',
          value: 'buy_featured_post',
          emoji: '⭐',
        }),
      ]);

    const row = new ActionRowBuilder().addComponents(shopMenu);
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
        .setTitle(' Unit S | التشفير')
        .setDescription('لتشفير منشورك، اضغط على الزر أدناه')
        .setColor(0xDC2626)
        .addFields(
          { name: ' المميزات:', value: '• تشفير الكلمات المحظورة\n• يعمل بكفاءة عالية\n• آمن وسريع', inline: false }
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
      .setTitle(' تم تشفير النص!')
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
      .setTitle(' لوحة التحكم - الحماية')
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
        await message.channel.send(' لا توجد تذاكر مفتوحة حالياً!');
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
        .setTitle(' قائمة التذاكر المفتوحة')
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
        await message.channel.send(' جاري إغلاق التذكرة...');
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
      let rolesList = ' الرولات المسموحة:\n\n';

      if (ticketSettings.allowedRoles.length === 0 && ticketSettings.allowedRoleNames.length === 0) {
        rolesList += 'لا توجد رولات مضافة حالياً.\n';
        rolesList += ' استخدم `!tmanage addrole @رول` أو `!tmanage addrolename [اسم]`';
      } else {
        if (ticketSettings.allowedRoles.length > 0) {
          for (const roleId of ticketSettings.allowedRoles) {
            const role = message.guild.roles.cache.get(roleId);
            rolesList += `• ${role ? role.name : 'رول محذوفة'} (ID: ${roleId})\n`;
          }
        }
        if (ticketSettings.allowedRoleNames.length > 0) {
          rolesList += '\n الرولات المسموحة بالأسماء:\n';
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
      let mentionInfo = ' إعدادات المنشن التلقائي:\n\n';

      if (ticketSettings.mentionRoleId) {
        const role = message.guild.roles.cache.get(ticketSettings.mentionRoleId);
        mentionInfo += `الرول: ${role ? role.name : 'محذوفة'}\n`;
        mentionInfo += `ID: ${ticketSettings.mentionRoleId}\n`;
      } else if (ticketSettings.mentionRoleName) {
        const role = message.guild.roles.cache.find(r =>
          r.name.toLowerCase().includes(ticketSettings.mentionRoleName.toLowerCase())
        );
        mentionInfo += ` الرول: ${role ? role.name : 'غير موجودة'}\n`;
        mentionInfo += ` الاسم: "${ticketSettings.mentionRoleName}"\n`;
      } else {
        mentionInfo += '⚠️ لم يتم تعيين رول للمنشن التلقائي.\n';
        mentionInfo += ' استخدم: `!tmanage setmention @رول` أو `!tmanage setmentionname [اسم]`';
      }

      await message.channel.send(mentionInfo);
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    // Show admins
    if (action === 'admins') {
      let adminsList = ' <:6542stafficonred:1495225057209880706> أدمنز التذاكر:\n\n';

      if (ticketSettings.ticketAdminRoles.length === 0 && ticketSettings.ticketAdminRoleNames.length === 0) {
        adminsList += 'لا توجد أدمنز مضافين.\n';
        adminsList += ' استخدم `!tmanage addadmin @رول` أو `!tmanage addadminname [اسم]`';
      } else {
        if (ticketSettings.ticketAdminRoles.length > 0) {
          for (const roleId of ticketSettings.ticketAdminRoles) {
            const role = message.guild.roles.cache.get(roleId);
            adminsList += `• ${role ? role.name : 'رول محذوفة'}\n`;
          }
        }
        if (ticketSettings.ticketAdminRoleNames.length > 0) {
          adminsList += '\n بالأسماء:\n';
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
        .setTitle(' أوامر إدارة التذاكر')
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
    // Handle Select Menu - Main Ticket Selection
    if (interaction.isStringSelectMenu()) {

      // ============ NEW TICKET MAIN MENU ============
      if (interaction.customId === 'ticket_main_select') {
        const ticketType = interaction.values[0];
        const guild = interaction.guild;

        // Map ticket types to create ticket
        const ticketTypeMap = {
          ticket_technical: 'دعم فني',
          ticket_complaint: 'شكاوي',
          ticket_inquiry: 'إعادة تعيين القائمة',
          ticket_purchase: 'شراء',
          ticket_ranks: 'عروض رتب'
        };

        const typeName = ticketTypeMap[ticketType];

        // For inquiry/reset menu - show main ticket menu
        if (ticketType === 'ticket_inquiry') {
          const embed = new EmbedBuilder()
            .setTitle(' Unit S | لوحة التذاكر')
            .setDescription('مرحباً بك في نظام الدعم الفني\nيرجى تحديد سبب فتح التذكرة من القائمة أدناه')
            .setColor(0x667eea)
            .setFooter({ text: 'Unit S | Support System' });

          const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('ticket_main_select')
            .setPlaceholder('اختر نوع التذكرة...')
            .addOptions([
              new StringSelectMenuOptionBuilder({
                label: 'دعم فني',
                description: 'للمشاكل التقنية والاستفسارات',
                value: 'ticket_technical',
                emoji: '🔧',
              }),
              new StringSelectMenuOptionBuilder({
                label: 'شكاوي',
                description: 'للتقدم بشكوى ضد عضو',
                value: 'ticket_complaint',
                emoji: '⚠️',
              }),
              new StringSelectMenuOptionBuilder({
                label: 'إعادة تعيين القائمة',
                description: 'لإعادة عرض قائمة التذاكر',
                value: 'ticket_inquiry',
                emoji: '',
              }),
              new StringSelectMenuOptionBuilder({
                label: 'شراء',
                description: 'للشراء من السيرفر',
                value: 'ticket_purchase',
                emoji: '',
              }),
              new StringSelectMenuOptionBuilder({
                label: 'عروض الرتب',
                description: 'عرض رتب متاحة للشراء',
                value: 'ticket_ranks',
                emoji: '',
              }),
            ]);

          const row = new ActionRowBuilder().addComponents(selectMenu);

          await interaction.update({
            embeds: [embed],
            components: [row]
          });
          return;
        }

        // For ranks display - show ranks menu
        if (ticketType === 'ticket_ranks') {
          const ranks = [
            { name: 'Coder S.', price: 150000, features: ['نشر في رومات محددة', 'إمكانية منشن', 'صلاحيات خاصة'] },
            { name: 'Artisan S.', price: 200000, features: ['نشر في رومات معينة', 'نشر صور في رومات محددة', 'إمكانية منشن'] },
            { name: 'Novice S.', price: 250000, features: ['نشر في جميع الرومات', 'عدم نشر صور', 'إمكانية منشن'] },
            { name: 'Elite S.', price: 300000, features: ['نشر في جميع الرومات', 'نشر صور', 'عدم المنشن'] },
            { name: 'Master S.', price: 550000, features: ['نشر في جميع الرومات', 'نشر صور في رومات محددة', 'إمكانية منشن'] },
            { name: 'Legend S.', price: 750000, features: ['نشر في جميع الرومات', 'نشر صور', 'إمكانية منشن'] },
            { name: 'Seraph S.', price: 1000000, features: ['جميع الصلاحيات', 'نشر صور في جميع الرومات', 'منشن كامل'] },
          ];

          const embed = new EmbedBuilder()
            .setTitle('👑 رتب Unit S')
            .setColor(0x667eea)
            .setFooter({ text: 'Unit S | Ranks' });

          for (const rank of ranks) {
            embed.addFields({
              name: `${rank.name} - $${rank.price.toLocaleString()}`,
              value: rank.features.map(f => `• ${f}`).join('\n'),
              inline: true
            });
          }

          // Add reset button
          const resetButton = new ButtonBuilder()
            .setCustomId('ticket_reset_menu')
            .setLabel('القائمة الرئيسية')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🔙');

          const row = new ActionRowBuilder().addComponents(resetButton);

          await interaction.reply({
            embeds: [embed],
            components: [row],
            flags: 0
          });
          return;
        }

        // For purchase - show shop options
        if (ticketType === 'ticket_purchase') {
          const embed = new EmbedBuilder()
            .setTitle('💰 لوحة الشراء')
            .setDescription('اختر ما تريد شراؤه')
            .setColor(0x667eea)
            .setFooter({ text: 'Unit S | Shop' });

          const shopMenu = new StringSelectMenuBuilder()
            .setCustomId('shop_purchase_select')
            .setPlaceholder('اختر ما تريد شراؤه...')
            .addOptions([
              new StringSelectMenuOptionBuilder({
                label: 'شراء رتبة عادية',
                description: 'للحصول على رتبة بصلاحيات محددة',
                value: 'buy_rank',
                emoji: '👑',
              }),
              new StringSelectMenuOptionBuilder({
                label: 'شراء رتبة مميزة',
                description: 'للحصول على رتبة مميزة',
                value: 'buy_premium_rank',
                emoji: '💎',
              }),
              new StringSelectMenuOptionBuilder({
                label: 'شراء رومات خاصة',
                description: 'إنشاء روم خاص بك',
                value: 'buy_private_room',
                emoji: '🔒',
              }),
              new StringSelectMenuOptionBuilder({
                label: 'شراء إعلانات',
                description: 'لنشر إعلانك في السيرفر',
                value: 'buy_ads',
                emoji: '📢',
              }),
            ]);

          const resetButton = new ButtonBuilder()
            .setCustomId('ticket_reset_menu')
            .setLabel('رجوع')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🔙');

          const row1 = new ActionRowBuilder().addComponents(shopMenu);
          const row2 = new ActionRowBuilder().addComponents(resetButton);

          await interaction.reply({
            embeds: [embed],
            components: [row1, row2],
            flags: 0
          });
          return;
        }

        // For technical support and complaints - create ticket
        if (ticketType === 'ticket_technical' || ticketType === 'ticket_complaint') {
          try {
            const botMember = await guild.members.fetch(client.user.id);
            if (!botMember.permissions.has('ManageChannels')) {
              return await interaction.reply({
                content: '❌ لا توجد لدي الصلاحية اللازمة لإنشاء قناة!',
                flags: 64
              });
            }

            // التحقق من وجود تذكرة سابقة بنفس اسم المستخدم
            const sanitizedUsername = interaction.user.username
              .toLowerCase()
              .replace(/[^a-z0-9]/gi, '-')
              .replace(/-+/g, '-')
              .replace(/^-|-$/g, '');

            const existingTickets = guild.channels.cache.filter(ch =>
              ch.name === `ticket-${sanitizedUsername}`
            );

            if (existingTickets.size > 0) {
              const existingTicket = existingTickets.first();
              return await interaction.reply({
                content: `❌ لديك تذكرة مفتوحة بالفعل!\n${existingTicket.toString()}`,
                flags: 64
              });
            }

            const channelName = `ticket-${sanitizedUsername}`;

            // أزرار التذكرة
            const claimButton = new ButtonBuilder()
              .setCustomId('claim_ticket')
              .setLabel('استلام')
              .setStyle(ButtonStyle.Success)
              .setEmoji('✅');

            const unclaimButton = new ButtonBuilder()
              .setCustomId('unclaim_ticket')
              .setLabel('إلغاء الاستلام')
              .setStyle(ButtonStyle.Secondary);

            const closeButton = new ButtonBuilder()
              .setCustomId('close_ticket')
              .setLabel('إغلاق')
              .setStyle(ButtonStyle.Danger);

            const resetButton = new ButtonBuilder()
              .setCustomId('ticket_reset_menu')
              .setLabel('القائمة')
              .setStyle(ButtonStyle.Secondary)
              .setEmoji('🔙');

            const row = new ActionRowBuilder().addComponents(claimButton, unclaimButton, closeButton, resetButton);

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
              topic: `🎫 ${typeName} | ${interaction.user.tag}`,
              permissionOverwrites: permissionOverwrites,
            });

            // حفظ وقت فتح التذكرة
            client.ticketClaims.set(ticketChannel.id, {
              claimedBy: null,
              openedAt: Date.now(),
              ticketType: ticketType,
              user: interaction.user
            });

            // منشن الرولات + المستخدم + رتبة الدعم
            let channelContent = interaction.user.toString();

            // إضافة الرولات من الإعدادات
            if (ticketSettings.mentionRoleId) {
              const autoMentionRole = guild.roles.cache.get(ticketSettings.mentionRoleId);
              if (autoMentionRole) {
                channelContent += ' ' + autoMentionRole.toString();
              }
            }
            if (ticketSettings.mentionRoleName) {
              const autoMentionRole = guild.roles.cache.find(r =>
                r.name.toLowerCase().includes(ticketSettings.mentionRoleName.toLowerCase())
              );
              if (autoMentionRole) {
                channelContent += ' ' + autoMentionRole.toString();
              }
            }
            if (mentionedRoles.length > 0) {
              channelContent += ' ' + mentionedRoles.map(r => r.toString()).join(' ');
            }

            // Ticket Embed - Unit S Design
            const ticketEmbed = {
              content: channelContent,
              embeds: [
                {
                  color: 0xff0000,
                  author: {
                    name: typeName === 'دعم فني' ? 'الـدعـم الـفـنـي' : 'الـشـكـاوي',
                    icon_url: 'https://media.discordapp.net/attachments/1397309666752593920/1495169429741240511/UNIT_4306000.png?ex=69e5448a&is=69e3f30a&hm=d1143eeac3289c0b55d81d3275a529dbc46a324607e5a8dc5326486b1b08c327&=format=webp&quality=lossless&width=788&height=788'
                  },
                  description: [
                    `**<:vanka237:1495225240035262597> مرحباً بك <@${interaction.user.id}> في Unit S**`,
                    '',
                    `**<:vanka237:1495225240035262597> يشرفنا وجودك ونعدك بحل مشكلتك بأسرع وقت**`,
                    '',
                    `**🔹 الـهدف من فتح الـتذكرة :** ${typeName}`,
                    '',
                    `**<:vanka237:1495225240035262597> الـدعـم الـفـنـي <:6542stafficonred:1495225057209880706>**`,
                    '',
                    '__ ـــــــــــــــــــــــــــــــــــــــــــــــــ <a:emrp_warning:1495223911871414403> ـــــــــــــــــــــــــــــــــــــــــــــــــــ __',
                    '',
                    `**<:warn:1495225561520541848> يُمنع الازعاج بالمنشن والاسبام داخل التذكرة**`,
                    '',
                    `**<:warn:1495225561520541848> يُمنع السب والشتم داخل التذكرة مهما كان السبب**`,
                    '',
                    `**<:warn:1495225561520541848> يُمنع فتح التذكرة بدون سبب او للاستهبال**`,
                    '',
                    `**<:warn:1495225561520541848> في حال مخالفة احد القوانين اعلاه ستتعرض للكتم**`,
                    '',
                    '__ ـــــــــــــــــــــــــــــــــــــــــــــــــ <:vanka237:1495225240035262597> ـــــــــــــــــــــــــــــــــــــــــــــــــــ __'
                  ].join('\n'),
                  image: {
                    url: 'https://cdn.discordapp.com/attachments/1397309666752593920/1495169428738936852/UNIT_406004040.webp?ex=69e5448a&is=69e3f30a&hm=be61008c6e62b1b6783e3af827d9a737804a90f617421c905fa4881c90a03994&'
                  }
                }
              ],
              components: [
                {
                  type: 1,
                  components: [
                    {
                      type: 2,
                      custom_id: 'claim_ticket',
                      label: 'استلام',
                      style: 3,
                      emoji: {
                        id: '1495235065440108584',
                        name: 'vanka237',
                        animated: false
                      }
                    },
                    {
                      type: 2,
                      custom_id: 'unclaim_ticket',
                      label: 'إلغاء الاستلام',
                      style: 2
                    },
                    {
                      type: 2,
                      custom_id: 'close_ticket',
                      label: 'إغلاق',
                      style: 4
                    }
                  ]
                }
              ]
            };

            await ticketChannel.send(ticketEmbed);

            await interaction.reply({
              content: `✅ تم إنشاء تذكرة ${interaction.user.username} بنجاح! <#${ticketChannel.id}>`,
              flags: 64
            });

          } catch (error) {
            console.error('Ticket creation error:', error);
            await interaction.reply({
              content: `❌ حدث خطأ أثناء إنشاء التذكرة!\nالخطأ: \`${error.message}\``,
              flags: 64
            });
          }
          return;
        }
      }

      // ============ TICKET PURCHASE SELECT (داخل التذكرة) ============
      if (interaction.customId === 'ticket_purchase_select') {
        const purchaseType = interaction.values[0];

        if (purchaseType === 'purchase_auto') {
          const ranksEmbed = new EmbedBuilder()
            .setTitle('👑 رتب Unit S')
            .setColor(0x667eea)
            .addFields(
              { name: '💎 Coder S.', value: 'السعر: 150,000 | نشر في رومات محددة - إمكانية منشن - صلاحيات خاصة', inline: false },
              { name: '⚡ Artisan S.', value: 'السعر: 200,000 | نشر في رومات معينة - نشر صور - إمكانية منشن', inline: false },
              { name: '🎯 Novice S.', value: 'السعر: 250,000 | نشر في جميع الرومات - عدم نشر صور - إمكانية منشن', inline: false },
              { name: '🔥 Elite S.', value: 'السعر: 300,000 | نشر في جميع الرومات - نشر صور - عدم المنشن', inline: false },
              { name: '⭐ Master S.', value: 'السعر: 550,000 | نشر في جميع الرومات - نشر صور في رومات محددة - إمكانية منشن', inline: false },
              { name: '👑 Legend S.', value: 'السعر: 750,000 | نشر في جميع الرومات - نشر صور - إمكانية منشن', inline: false },
              { name: '🌟 Seraph S.', value: 'السعر: 1,000,000 | جميع الصلاحيات - نشر صور في جميع الرومات - منشن كامل', inline: false }
            )
            .setFooter({ text: 'Unit S | الرتب' });

          const shopSelectMenu = new StringSelectMenuBuilder()
            .setCustomId('shop_ranks_select')
            .setPlaceholder('اختر الرتبة المطلوبة...')
            .addOptions([
              new StringSelectMenuOptionBuilder({
                label: 'Coder S. - 150,000',
                value: 'rank_coder',
                emoji: '💎',
              }),
              new StringSelectMenuOptionBuilder({
                label: 'Artisan S. - 200,000',
                value: 'rank_artisan',
                emoji: '⚡',
              }),
              new StringSelectMenuOptionBuilder({
                label: 'Novice S. - 250,000',
                value: 'rank_novice',
                emoji: '🎯',
              }),
              new StringSelectMenuOptionBuilder({
                label: 'Elite S. - 300,000',
                value: 'rank_elite',
                emoji: '🔥',
              }),
              new StringSelectMenuOptionBuilder({
                label: 'Master S. - 550,000',
                value: 'rank_master',
                emoji: '⭐',
              }),
              new StringSelectMenuOptionBuilder({
                label: 'Legend S. - 750,000',
                value: 'rank_legend',
                emoji: '👑',
              }),
              new StringSelectMenuOptionBuilder({
                label: 'Seraph S. - 1,000,000',
                value: 'rank_seraph',
                emoji: '🌟',
              }),
            ]);

          const shopRow = new ActionRowBuilder().addComponents(shopSelectMenu);

          await interaction.reply({
            embeds: [ranksEmbed],
            components: [shopRow],
            flags: 0
          });
          return;
        }

        if (purchaseType === 'purchase_inquiry') {
          const inquiryEmbed = new EmbedBuilder()
            .setTitle('❓ مشكلة / استفسار')
            .setDescription('يمكنك كتابة استفسارك أو مشكلتك هنا وسنرد عليك في أقرب وقت ممكن')
            .setColor(0xF59E0B)
            .addFields(
              { name: '💡 ملاحظة', value: '• اكتب استفسارك بشكل واضح ومفصل\n• انتظر الرد من فريق الدعم\n• لا تقم بالإزعاج بالمنشن', inline: false }
            )
            .setFooter({ text: 'Unit S | الدعم' });

          await interaction.reply({
            embeds: [inquiryEmbed],
            flags: 0
          });
          return;
        }

        return;
      }

      // ============ SHOP RANKS SELECT ============
      if (interaction.customId === 'shop_ranks_select') {
        const selectedRank = interaction.values[0];

        const rankInfo = {
          rank_coder: { name: 'Coder S.', price: '150,000' },
          rank_artisan: { name: 'Artisan S.', price: '200,000' },
          rank_novice: { name: 'Novice S.', price: '250,000' },
          rank_elite: { name: 'Elite S.', price: '300,000' },
          rank_master: { name: 'Master S.', price: '550,000' },
          rank_legend: { name: 'Legend S.', price: '750,000' },
          rank_seraph: { name: 'Seraph S.', price: '1,000,000' },
        };

        const selected = rankInfo[selectedRank];

        const confirmEmbed = new EmbedBuilder()
          .setTitle(`✅ تم اختيار الرتبة: ${selected.name}`)
          .setColor(0x10B981)
          .setDescription(`تم تحديد رتبة **${selected.name}** بقيمة **${selected.price}**`)
          .addFields(
            { name: '📋 الخطوات التالية:', value: '1. سيتم التواصل معك عبر هذه التذكرة\n2. اتبع تعليمات الدفع\n3. بعد الدفع سيتم تفعيل الرتبة فوراً', inline: false }
          )
          .setFooter({ text: 'Unit S | الشراء' });

        await interaction.reply({
          embeds: [confirmEmbed],
          flags: 0
        });
        return;
      }

      // ============ SHOP PURCHASE SELECT (القائمة القديمة) ============
      if (interaction.customId === 'shop_purchase_select') {
        const purchaseType = interaction.values[0];

        const purchaseTypeMap = {
          buy_rank: 'شراء رتبة',
          buy_premium_rank: 'شراء رتبة مميزة',
          buy_private_room: 'شراء روم خاص',
          buy_ads: 'شراء إعلانات',
          buy_featured_post: 'شراء منشور مميز'
        };

        const embed = new EmbedBuilder()
          .setTitle('💰 ' + purchaseTypeMap[purchaseType])
          .setDescription('تم تحديد طلبك! سيتم التواصل معك قريباً عبر这支 التذكرة.')
          .setColor(0x667eea)
          .addFields(
            { name: '📋 الطلب', value: purchaseTypeMap[purchaseType], inline: true },
            { name: '💬 الخطوات', value: '1. انتظر الرد\n2. اختر الرتبة المطلوبة\n3. اتبع التعليمات للدفع', inline: false }
          )
          .setFooter({ text: 'Unit S | Shop' });

        // Add reset button
        const resetButton = new ButtonBuilder()
          .setCustomId('ticket_reset_menu')
          .setLabel('القائمة الرئيسية')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('🔙');

        const row = new ActionRowBuilder().addComponents(resetButton);

        await interaction.reply({
          embeds: [embed],
          components: [row],
          flags: 0
        });
        return;
      }
    }

    // Handle Button Interactions - ✅ جميع الأزرار في كتلة واحدة
    if (interaction.isButton()) {
      // ============ RESET MENU BUTTON ============
      if (interaction.customId === 'ticket_reset_menu') {
        const embed = new EmbedBuilder()
          .setTitle('🎫 Unit S | لوحة التذاكر')
          .setDescription('مرحباً بك في نظام الدعم الفني\nيرجى تحديد سبب فتح التذكرة من القائمة أدناه')
          .setColor(0x667eea)
          .setFooter({ text: 'Unit S | Support System' });

        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId('ticket_main_select')
          .setPlaceholder('اختر نوع التذكرة...')
          .addOptions([
            new StringSelectMenuOptionBuilder({
              label: 'دعم فني',
              description: 'للمشاكل التقنية والاستفسارات',
              value: 'ticket_technical',
              emoji: '🔧',
            }),
            new StringSelectMenuOptionBuilder({
              label: 'شكاوي',
              description: 'للتقدم بشكوى ضد عضو',
              value: 'ticket_complaint',
              emoji: '⚠️',
            }),
            new StringSelectMenuOptionBuilder({
              label: 'إعادة تعيين القائمة',
              description: 'لإعادة عرض قائمة التذاكر',
              value: 'ticket_inquiry',
              emoji: '🔄',
            }),
            new StringSelectMenuOptionBuilder({
              label: 'شراء',
              description: 'للشراء من السيرفر',
              value: 'ticket_purchase',
              emoji: '💰',
            }),
            new StringSelectMenuOptionBuilder({
              label: 'عروض الرتب',
              description: 'عرض رتب متاحة للشراء',
              value: 'ticket_ranks',
              emoji: '👑',
            }),
          ]);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        await interaction.update({
          embeds: [embed],
          components: [row]
        });
        return;
      }

      // ============ BUY RANK BUTTON ============
      if (interaction.customId === 'buy_rank_ticket') {
        const embed = new EmbedBuilder()
          .setTitle('💰 شراء رتبة')
          .setDescription('لشراء رتبة، يرجى فتح تذكرة من القائمة الرئيسية')
          .setColor(0x667eea)
          .setFooter({ text: 'Unit S | Shop' });

        const resetButton = new ButtonBuilder()
          .setCustomId('ticket_reset_menu')
          .setLabel('القائمة الرئيسية')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('🔙');

        const row = new ActionRowBuilder().addComponents(resetButton);

        await interaction.update({
          embeds: [embed],
          components: [row]
        });
        return;
      }

      // ============ BACK TO MENU BUTTON ============
      if (interaction.customId === 'back_to_menu') {
        const embed = new EmbedBuilder()
          .setTitle(' Unit S | لوحة التذاكر')
          .setDescription('مرحباً بك في نظام الدعم الفني\nيرجى تحديد سبب فتح التذكرة من القائمة أدناه')
          .setColor(0x667eea)
          .setFooter({ text: 'Unit S | Support System' });

        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId('ticket_main_select')
          .setPlaceholder('اختر نوع التذكرة...')
          .addOptions([
            new StringSelectMenuOptionBuilder({
              label: 'دعم فني',
              description: 'للمشاكل التقنية والاستفسارات',
              value: 'ticket_technical',
              emoji: '🔧',
            }),
            new StringSelectMenuOptionBuilder({
              label: 'شكاوي',
              description: 'للتقدم بشكوى ضد عضو',
              value: 'ticket_complaint',
              emoji: '⚠️',
            }),
            new StringSelectMenuOptionBuilder({
              label: 'إعادة تعيين القائمة',
              description: 'لإعادة عرض قائمة التذاكر',
              value: 'ticket_inquiry',
              emoji: '🔄',
            }),
            new StringSelectMenuOptionBuilder({
              label: 'شراء',
              description: 'للشراء من السيرفر',
              value: 'ticket_purchase',
              emoji: '💰',
            }),
            new StringSelectMenuOptionBuilder({
              label: 'عروض الرتب',
              description: 'عرض رتب متاحة للشراء',
              value: 'ticket_ranks',
              emoji: '👑',
            }),
          ]);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        await interaction.update({
          embeds: [embed],
          components: [row]
        });
        return;
      }

      // ============ أزرار التشفير ============
      if (interaction.customId === 'shfr_post') {
        const modal = new ModalBuilder()
          .setCustomId('shfr_modal')
          .setTitle(' تشفير المنشور');

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

      // ============ FREE RANK CLAIM BUTTON ============
      if (interaction.customId === 'free_rank_claim') {
        // Check if system is enabled
        if (!freeRankSettings.enabled) {
          return await interaction.reply({
            content: '❌ نظام الرتبة المجانية معطّل حالياً!',
            flags: 64
          });
        }

        // Check if role is set
        if (!freeRankSettings.roleId) {
          return await interaction.reply({
            content: '❌ لم يتم تعيين الرتبة! تواصل مع الإدارة.',
            flags: 64
          });
        }

        const userId = interaction.user.id;
        const guild = interaction.guild;
        const member = await guild.members.fetch(interaction.user.id);

        // Check if user already claimed
        if (freeRankSettings.claimedUsers.includes(userId)) {
          return await interaction.reply({
            content: '❌ لقد استلمت الرتبة المجانية مسبقاً!\n__**You have already taken a free selling rank before.**__',
            flags: 64
          });
        }

        // Check if max claims reached
        if (freeRankSettings.maxClaims > 0 && freeRankSettings.claimedCount >= freeRankSettings.maxClaims) {
          return await interaction.reply({
            content: '❌ عذراً! تم استلام جميع الرتب المجانية المتاحة!\nحاول لاحقاً أو تواصل مع الإدارة.',
            flags: 64
          });
        }

        // Give the role
        try {
          console.log(`[FREE_RANK] roleId from settings: ${freeRankSettings.roleId}`);
          const role = guild.roles.cache.get(freeRankSettings.roleId);
          console.log(`[FREE_RANK] Role found: ${role ? role.name : 'NOT FOUND'}`);
          console.log(`[FREE_RANK] Bot highest role: ${guild.me?.roles.highest?.name}`);
          console.log(`[FREE_RANK] Role position: ${role?.position}, Bot role position: ${guild.me?.roles.highest?.position}`);

          if (!role) {
            return await interaction.reply({
              content: '❌ الرتبة غير موجودة! تواصل مع الإدارة.',
              flags: 64
            });
          }

          await member.roles.add(role);
          console.log(`[FREE_RANK] Successfully added role to ${member.user.tag}`);

          // Update counter
          freeRankSettings.claimedUsers.push(userId);
          freeRankSettings.claimedCount++;

          // Save settings
          saveFreeRankSettings(freeRankSettings);

          // Success message
          const successEmbed = new EmbedBuilder()
            .setTitle(' تهانينا!')
            .setColor(0x10B981)
            .setDescription(`✅ تم منحك رتبة **${freeRankSettings.roleName}** بنجاح!\n\n هذه الرتبة مجانية ومرة واحدة فقط!`)
            .addFields(
              { name: ' المستخدم:', value: interaction.user.toString(), inline: true },
              { name: ' الرتبة:', value: freeRankSettings.roleName, inline: true }
            )
            .setFooter({ text: 'Unit S | System Bot' })
            .setTimestamp();

          await interaction.reply({
            content: `<@&1494685867749539861>`,
            embeds: [successEmbed],
            flags: 64
          });

          // Log to channel
          if (freeRankSettings.logChannelId) {
            const logChannel = guild.channels.cache.get(freeRankSettings.logChannelId);
            if (logChannel) {
              const logEmbed = new EmbedBuilder()
                .setTitle('🎁 FREE RANK CLAIMED')
                .setColor(0x10B981)
                .addFields(
                  { name: '👤 User:', value: `${interaction.user.tag} (${interaction.user.id})`, inline: true },
                  { name: '🎭 Role:', value: freeRankSettings.roleName, inline: true },
                  { name: '📊 Remaining:', value: `${freeRankSettings.maxClaims === 0 ? '∞' : freeRankSettings.maxClaims - freeRankSettings.claimedCount}`, inline: true }
                )
                .setTimestamp();

              await logChannel.send({ embeds: [logEmbed] });
            }
          }
          return;

        } catch (error) {
          console.error('Free rank claim error:', error);
          return await interaction.reply({
            content: '❌ حدث خطأ أثناء منح الرتبة! تواصل مع الإدارة.',
            flags: 64
          });
        }
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
              name: ' Opened',
              value: `${formatTimeAgo(ticketData.openedAt)}`,
              inline: true
            },
            {
              name: ' Status',
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
        return;
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
              name: ' Opened',
              value: `${formatTimeAgo(ticketData.openedAt)}`,
              inline: true
            },
            {
              name: ' Status',
              value: '🟡 Unclaimed',
              inline: true
            }
          )
          .setFooter({ text: 'Unit S Support System' })
          .setTimestamp();

        await interaction.reply({ embeds: [embed], components: [row] });
        return;
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
        await interaction.reply(' جاري إغلاق التذكرة...');
        setTimeout(() => channel.delete(), 1000);
        return;
      }
      return;
    }

    // Handle Modal Submit - ✅ المودالز في كتلة مستقلة
    if (interaction.isModalSubmit()) {
      if (interaction.customId === 'shfr_modal') {
        try {
          const text = interaction.fields.getTextInputValue('shfr_text');
          const encrypted = encryptText(text);

          // تحويل النص المشفر للون مختلف
          const embed = new EmbedBuilder()
            .setTitle(' تم تشفير النص!')
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
      return;
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
        .setTitle(' UNIT S -SECURITY ADMINISTRATION')
        .setDescription(`تم تقييد صلاحياتك لمدة 10 دقائق لرصد سلوك غير لائق (سب او شتم) في أحد الرومات\n\nنظام الحماية لا يسمح بالإساءة أو التلفظ نرجو الالتزام بالمعايير والأخلاق\n\nنثق بوعيك لتجنب تكرار المخالفة`)
        .setColor(COLORS.danger)
        .setTimestamp();

      await message.author.send({ embeds: [embed] }).catch(() => {});

      const logChannel = message.guild?.channels.cache.find(ch => ch.name === 'logs');
      if (logChannel) {
        logChannel.send(` [Word Filter] ${message.author.tag} استخدم كلمات ممنوعة: ${foundWords.join(', ')} - تم كتمه 10 دقائق`);
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
        .setTitle(' UNIT S -SECURITY ADMINISTRATION')
        .setDescription(`تم تقييد صلاحياتك لمدة 5 دقائق الرصد نشاط (سبام) في احد الرومات\n\nنظام الحماية لا يسمح بتكرار الرسائل المفرط نرجو الألتزام بالمعايير\n\nنثق بوعيك لتجنب تكرار المخالفة `)
        .setColor(COLORS.danger)
        .setTimestamp();

      await message.author.send({ embeds: [embed] }).catch(() => {});

      const logChannel = message.guild?.channels.cache.find(ch => ch.name === 'logs');
      if (logChannel) {
        logChannel.send(` [Anti-Spam] ${message.author.tag} تم كتمه لمدة 5 دقائق - Spam detected`);
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
        .setTitle(' Unit S -SECURITY ADMINISTRATION')
        .setDescription(`تم تقييد صلاحياتك لمدة 5 دقائق لرصد رابط في أحد الرومات\n\nنظام الحماية لا يسمح بالروابط ألخارجية نرجو ألألتزام بالمعايير\n\nنثق بوعيك لتجنب تكرار المخالفة`)
        .setColor(COLORS.danger)
        .setTimestamp();

      await message.author.send({ embeds: [embed] }).catch(() => {});

      const logChannel = message.guild?.channels.cache.find(ch => ch.name === 'logs');
      if (logChannel) {
        logChannel.send(` [Anti-Link] ${message.author.tag} تم كتمه لمدة 5 دقائق - أرسل رابط`);
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

// ============ MEMBER JOIN EVENT ============
client.on('guildMemberAdd', async (member) => {
  if (member.user.bot) return;
  await logMemberJoin(member.guild, member);
});

// ============ MEMBER LEAVE EVENT ============
client.on('guildMemberRemove', async (member) => {
  if (member.user.bot) return;
  await logMemberLeave(member.guild, member, null);
});

// ============ 24/7 VOICE - Auto Reconnect ============
// Variable to track reconnection attempts and prevent infinite loops
let reconnectAttempts = 0;
let isReconnecting = false;
const MAX_RECONNECT_ATTEMPTS = 3;

client.on('voiceStateUpdate', async (oldState, newState) => {
  // Only handle bot's own voice state changes
  if (oldState.member?.id !== client.user.id) return;

  // If bot was in our target channel and now not in any channel
  if (oldState.channelId && oldState.channelId === voiceChannelId) {
    if (!newState.channelId) {
      // Bot was disconnected (not just moved)
      console.log('[24/7 VOICE] Bot disconnected from channel');

      // Prevent infinite reconnection loops
      if (isReconnecting) {
        console.log('[24/7 VOICE] Already reconnecting, skipping...');
        return;
      }

      if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.log('[24/7 VOICE] Max reconnection attempts reached, stopping');
        reconnectAttempts = 0;
        voiceChannelId = null;
        return;
      }

      reconnectAttempts++;
      isReconnecting = true;

      console.log(`[24/7 VOICE] Attempting reconnection (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
      try {
        const guild = oldState.guild;
        const channel = guild.channels.cache.get(voiceChannelId);
        if (channel) {
          // Destroy old connection if exists
          if (voiceConnection) {
            voiceConnection.destroy();
          }
          // Reconnect using @discordjs/voice
          voiceConnection = joinVoiceChannel({
            channelId: channel.id,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator,
          });
          voiceChannelId = channel.id;
          reconnectAttempts = 0;
          console.log('[24/7 VOICE] Reconnected successfully!');
        }
      } catch (err) {
        console.error('[24/7 VOICE] Reconnection failed:', err.message);
      } finally {
        isReconnecting = false;
      }
    }
  }
});

// ============ AUDIT LOG EVENTS ============

// Track ban actions from Audit Logs
client.on('guildBanAdd', async (guild, user) => {
  try {
    const auditLogs = await guild.fetchAuditLogs({
      type: 'MEMBER_BAN_ADD',
      limit: 1
    }).catch(() => null);

    const banEntry = auditLogs?.entries.first();
    const moderator = banEntry?.executor || guild.me;
    const reason = banEntry?.reason || 'No reason provided';

    const embed = new EmbedBuilder()
      .setTitle('🔨 BAN LOG')
      .setColor(0xDC2626)
      .addFields(
        { name: '🔨 Admin', value: moderator.tag || moderator.username || 'Unknown', inline: true },
        { name: '👤 Banned User', value: user.tag || user.username, inline: true },
        { name: '🆔 User ID', value: user.id, inline: true },
        { name: '📝 Reason', value: reason, inline: false },
        { name: '⏰ Time', value: new Date().toLocaleString('ar-SA'), inline: false }
      )
      .setFooter({ text: 'Unit S - Moderation' })
      .setTimestamp();

    await sendLog(guild, 'ban', embed);

    // Log to all-log if enabled
    if (logSettings.allLog) {
      const allChannel = guild.channels.cache.get(logSettings.allLog);
      if (allChannel) {
        await allChannel.send({ embeds: [embed] });
      }
    }
  } catch (err) {
    console.error('Ban audit log error:', err);
  }
});

// Track unban actions from Audit Logs
client.on('guildBanRemove', async (guild, user) => {
  try {
    const auditLogs = await guild.fetchAuditLogs({
      type: 'MEMBER_BAN_REMOVE',
      limit: 1
    }).catch(() => null);

    const unbanEntry = auditLogs?.entries.first();
    const moderator = unbanEntry?.executor || guild.me;

    const embed = new EmbedBuilder()
      .setTitle('🔓 UNBAN LOG')
      .setColor(0x10B981)
      .addFields(
        { name: '🔓 Admin', value: moderator.tag || moderator.username || 'Unknown', inline: true },
        { name: '👤 Unbanned User', value: user.tag || user.username, inline: true },
        { name: '🆔 User ID', value: user.id, inline: true },
        { name: '⏰ Time', value: new Date().toLocaleString('ar-SA'), inline: false }
      )
      .setFooter({ text: 'Unit S - Moderation' })
      .setTimestamp();

    await sendLog(guild, 'ban', embed);

    if (logSettings.allLog) {
      const allChannel = guild.channels.cache.get(logSettings.allLog);
      if (allChannel) {
        await allChannel.send({ embeds: [embed] });
      }
    }
  } catch (err) {
    console.error('Unban audit log error:', err);
  }
});

// Track kick actions from Audit Logs
client.on('guildMemberRemove', async (member) => {
  if (member.user.bot) return;

  try {
    const auditLogs = await member.guild.fetchAuditLogs({
      type: 'MEMBER_KICK',
      limit: 1
    }).catch(() => null);

    const kickEntry = auditLogs?.entries.first();

    // Check if this is a kick (entry should be recent, within 5 seconds)
    const isKick = kickEntry &&
                  kickEntry.target?.id === member.id &&
                  kickEntry.executor &&
                  (Date.now() - kickEntry.createdTimestamp) < 5000;

    if (isKick) {
      const moderator = kickEntry.executor;
      const reason = kickEntry.reason || 'No reason provided';

      const embed = new EmbedBuilder()
        .setTitle('🦵 KICK LOG')
        .setColor(0xF59E0B)
        .addFields(
          { name: '🦵 Admin', value: moderator.tag || moderator.username, inline: true },
          { name: '👤 Kicked User', value: member.user.tag || member.user.username, inline: true },
          { name: '🆔 User ID', value: member.id, inline: true },
          { name: '📝 Reason', value: reason, inline: false },
          { name: '⏰ Time', value: new Date().toLocaleString('ar-SA'), inline: false }
        )
        .setFooter({ text: 'Unit S - Moderation' })
        .setTimestamp();

      await sendLog(member.guild, 'kick', embed);

      if (logSettings.allLog) {
        const allChannel = member.guild.channels.cache.get(logSettings.allLog);
        if (allChannel) {
          await allChannel.send({ embeds: [embed] });
        }
      }
    } else {
      // Regular leave - not a kick
      await logMemberLeave(member.guild, member, null);
    }
  } catch (err) {
    console.error('Kick audit log error:', err);
    // If error, treat as regular leave
    await logMemberLeave(member.guild, member, null);
  }
});

// Track role create from Audit Logs
client.on('roleCreate', async (role) => {
  try {
    const auditLogs = await role.guild.fetchAuditLogs({
      type: 'ROLE_CREATE',
      limit: 1
    }).catch(() => null);

    const creator = auditLogs?.entries.first()?.executor || role.guild.me;

    const embed = new EmbedBuilder()
      .setTitle('🎭 ROLE CREATED')
      .setColor(0x10B981)
      .addFields(
        { name: '🎭 Role', value: role.name, inline: true },
        { name: '🆔 Role ID', value: role.id, inline: true },
        { name: '👤 Created By', value: creator?.tag || creator?.username || 'Unknown', inline: true },
        { name: '⏰ Time', value: new Date().toLocaleString('ar-SA'), inline: false }
      )
      .setFooter({ text: 'Unit S - Moderation' })
      .setTimestamp();

    await sendLog(role.guild, 'roles', embed);

    if (logSettings.allLog) {
      const allChannel = role.guild.channels.cache.get(logSettings.allLog);
      if (allChannel) {
        await allChannel.send({ embeds: [embed] });
      }
    }
  } catch (err) {
    console.error('Role create audit log error:', err);
  }
});

// Track role delete from Audit Logs
client.on('roleDelete', async (role) => {
  try {
    const auditLogs = await role.guild.fetchAuditLogs({
      limit: 5
    }).catch(() => null);

    // Find the role delete entry (action type 32)
    let deleter = role.guild.me;
    let actionTime = null;
    if (auditLogs?.entries) {
      // FIX: Use Array.from and check for action === 32 (ROLE_DELETE)
      const entriesArray = Array.from(auditLogs.entries.values());
      console.log(`[ROLE_DELETE] Checking ${entriesArray.length} audit log entries`);

      const deleteEntry = entriesArray.find(e => {
        const isMatch = (e.target && e.target.id === role.id) || e.action === 32 || e.actionType === 32;
        console.log(`[ROLE_DELETE] Entry: action=${e.action}, actionType=${e.actionType}, target=${e.target?.id}`);
        return isMatch;
      });

      if (deleteEntry) {
        console.log(`[ROLE_DELETE] Found delete entry! executor: ${deleteEntry.executor?.tag || 'null'}`);
        if (deleteEntry.executor) deleter = deleteEntry.executor;
        actionTime = deleteEntry.createdTimestamp;
      }
    }

    const embed = new EmbedBuilder()
      .setTitle('🎭 ROLE DELETED')
      .setColor(0xDC2626)
      .addFields(
        { name: '🎭 Role', value: role.name, inline: true },
        { name: '🆔 Role ID', value: role.id, inline: true },
        { name: '👤 Deleted By', value: deleter?.tag || deleter?.username || 'Unknown', inline: true },
        { name: '⏰ Time', value: new Date().toLocaleString('ar-SA'), inline: false }
      )
      .setFooter({ text: 'Unit S - Moderation' })
      .setTimestamp();

    await sendLog(role.guild, 'roles', embed);

    let allChannel = null;
    if (logSettings.allLog) {
      allChannel = role.guild.channels.cache.get(logSettings.allLog);
      if (allChannel) {
        await allChannel.send({ embeds: [embed] });
      }
    }

    // ============ PUNISHMENT: Remove roles only (NO KICK) ============
    // FIX: Check if deleter is valid (has id) and is not the bot
    const botId = role.guild.me?.id || client.user.id;
    console.log(`[ROLE_DELETE] Bot ID: ${botId}`);
    console.log(`[ROLE_DELETE] Deleter ID: ${deleter?.id || 'none'}`);
    console.log(`[ROLE_DELETE] Deleter tag: ${deleter?.tag || 'none'}`);

    if (!deleter?.id || deleter.id === botId) {
      console.log('[ROLE_DELETE] Skipped: no deleter ID or deleter is bot');
      return;
    }

    try {
      const deleterMember = await role.guild.members.fetch(deleter.id).catch(() => null);
      if (!deleterMember) {
        console.log('[ROLE_DELETE] Skipped: deleter member not found');
        return;
      }

      console.log(`[ROLE_DELETE] deleterMember roles: ${deleterMember.roles.cache.map(r => r.name).join(', ')}`);
      console.log(`[ROLE_DELETE] hasProtectedRole: ${deleterMember.roles.cache.has(PROTECTED_ROLE_ID)}`);
      console.log(`[ROLE_DELETE] isImmune: ${isImmune(deleterMember)}`);
      console.log(`[ROLE_DELETE] hasModRole: ${hasModRole(deleterMember)}`);

      // Skip if user is immune (حصين) - persons or protected role
      // هاي اول شي وبتحمي حتا لو الشخص عنده رتبه ادمن
      if (isImmune(deleterMember)) {
        console.log('[ROLE_DELETE] Skipped: user is immune');
        await allChannel?.send(`⚠️ تم تجاهل العقوبة لأن <@${deleter.id}> محصّن.`);
        return;
      }

      // Check time of action (must be within 60 seconds)
      const now = new Date();
      console.log(`[ROLE_DELETE] actionTime: ${actionTime || 'none'}`);
      console.log(`[ROLE_DELETE] timeDiff: ${actionTime ? (now - actionTime) : 'no actionTime'}`);
      if (actionTime && (now - actionTime) > 60000) {
        console.log('[ROLE_DELETE] Skipped: action too old (>60s)');
        return;
      }

      // Remove all roles except @everyone (بس نزع الرتب بدون طرد)
      const rolesToRemove = deleterMember.roles.cache.filter(r => r.id !== role.guild.id);
      console.log(`[ROLE_DELETE] Roles to remove: ${rolesToRemove.size}`);
      if (rolesToRemove.size > 0) {
        await deleterMember.roles.remove(rolesToRemove).catch(e => console.error('Error removing roles:', e));
        console.log('[ROLE_DELETE] Successfully removed roles!');
      }

      // Send punishment log
      const punishmentEmbed = new EmbedBuilder()
        .setTitle('🔨 عقوبة تلقائية - حذف رول')
        .setColor(0xDC2626)
        .setDescription(`تم إزالة رتب <@${deleter.id}> تلقائياً!`)
        .addFields(
          { name: '👤 العضو', value: deleter.tag || deleter.username || 'Unknown', inline: true },
          { name: '🎭 الرول المحذوف', value: role.name, inline: true },
          { name: '📋 سبب العقوبة', value: 'حذف رول من السيرفر', inline: false }
        )
        .setFooter({ text: 'Unit S - Auto Protection' })
        .setTimestamp();

      await allChannel?.send({ embeds: [punishmentEmbed] }).catch(() => {});

    } catch (punishErr) {
      console.error('[ERROR] Punishment error:', punishErr);
    }

  } catch (err) {
    console.error('Role delete audit log error:', err);
  }
});

// Track role updates (permissions, name, color, etc.)
client.on('roleUpdate', async (oldRole, newRole) => {
  try {
    const auditLogs = await newRole.guild.fetchAuditLogs({
      type: 'ROLE_UPDATE',
      limit: 1
    }).catch(() => null);

    const updater = auditLogs?.entries.first()?.executor || newRole.guild.me;

    const changes = [];
    if (oldRole.name !== newRole.name) {
      changes.push(`Name: ${oldRole.name} → ${newRole.name}`);
    }
    if (oldRole.color !== newRole.color) {
      changes.push(`Color: #${oldRole.color?.toString(16) || 'none'} → #${newRole.color?.toString(16) || 'none'}`);
    }
    if (oldRole.permissions.bitfield !== newRole.permissions.bitfield) {
      changes.push(`Permissions updated`);
    }

    if (changes.length === 0) return; // No significant changes

    const embed = new EmbedBuilder()
      .setTitle('🎭 ROLE UPDATED')
      .setColor(0xF59E0B)
      .addFields(
        { name: '🎭 Role', value: newRole.name, inline: true },
        { name: '🆔 Role ID', value: newRole.id, inline: true },
        { name: '👤 Updated By', value: updater?.tag || updater?.username || 'Unknown', inline: true },
        { name: '📝 Changes', value: changes.join('\n'), inline: false },
        { name: '⏰ Time', value: new Date().toLocaleString('ar-SA'), inline: false }
      )
      .setFooter({ text: 'Unit S - Moderation' })
      .setTimestamp();

    await sendLog(newRole.guild, 'roles', embed);

    if (logSettings.allLog) {
      const allChannel = newRole.guild.channels.cache.get(logSettings.allLog);
      if (allChannel) {
        await allChannel.send({ embeds: [embed] });
      }
    }
  } catch (err) {
    console.error('Role update audit log error:', err);
  }
});

// Track member role add/remove from Audit Logs
client.on('guildMemberUpdate', async (oldMember, newMember) => {
  try {
    const auditLogs = await newMember.guild.fetchAuditLogs({
      limit: 10
    }).catch(() => null);

    const roleAddEntries = auditLogs?.entries.filter(e => e.action === 'MEMBER_ROLE_UPDATE' && e.target?.id === newMember.id);
    const recentEntry = roleAddEntries?.first();

    if (!recentEntry) return;

    const addedRoles = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
    const removedRoles = oldMember.roles.cache.filter(role => !newMember.roles.cache.has(role.id));
    const moderator = recentEntry.executor || newMember.guild.me;

    for (const role of addedRoles) {
      const embed = new EmbedBuilder()
        .setTitle('🎭 ROLE ADDED')
        .setColor(0x10B981)
        .addFields(
          { name: '👮 Admin', value: moderator.tag || moderator.username || 'Unknown', inline: true },
          { name: '👤 User', value: newMember.user.tag || newMember.user.username, inline: true },
          { name: '🆔 User ID', value: newMember.id, inline: true },
          { name: '🎭 Role Added', value: role.name, inline: true },
          { name: '⏰ Time', value: new Date().toLocaleString('ar-SA'), inline: false }
        )
        .setFooter({ text: 'Unit S - Moderation' })
        .setTimestamp();

      await sendLog(newMember.guild, 'roles', embed);

      if (logSettings.allLog) {
        const allChannel = newMember.guild.channels.cache.get(logSettings.allLog);
        if (allChannel) {
          await allChannel.send({ embeds: [embed] });
        }
      }
    }

    for (const role of removedRoles) {
      const embed = new EmbedBuilder()
        .setTitle('🎭 ROLE REMOVED')
        .setColor(0xDC2626)
        .addFields(
          { name: '👮 Admin', value: moderator.tag || moderator.username || 'Unknown', inline: true },
          { name: '👤 User', value: newMember.user.tag || newMember.user.username, inline: true },
          { name: '🆔 User ID', value: newMember.id, inline: true },
          { name: '🎭 Role Removed', value: role.name, inline: true },
          { name: '⏰ Time', value: new Date().toLocaleString('ar-SA'), inline: false }
        )
        .setFooter({ text: 'Unit S - Moderation' })
        .setTimestamp();

      await sendLog(newMember.guild, 'roles', embed);

      if (logSettings.allLog) {
        const allChannel = newMember.guild.channels.cache.get(logSettings.allLog);
        if (allChannel) {
          await allChannel.send({ embeds: [embed] });
        }
      }
    }
  } catch (err) {
    console.error('Member role update audit log error:', err);
  }
});

// Track channel create from Audit Logs
client.on('channelCreate', async (channel) => {
  if (channel.isVoiceBased()) return;
  if (channel.name.startsWith('ticket-')) return; // Ignore ticket channels

  try {
    const auditLogs = await channel.guild.fetchAuditLogs({
      limit: 1
    }).catch(() => null);

    // Find the channel create entry
    let creator = channel.guild.me;
    if (auditLogs?.entries) {
      const entry = auditLogs.entries.find(e => e.target?.id === channel.id || e.actionType === 10); // 10 = CHANNEL_CREATE
      if (entry) creator = entry.executor || creator;
    }

    const embed = new EmbedBuilder()
      .setTitle('📁 CHANNEL CREATED')
      .setColor(0x10B981)
      .addFields(
        { name: '📁 Channel', value: channel.name, inline: true },
        { name: '🆔 Channel ID', value: channel.id, inline: true },
        { name: '👤 Created By', value: creator?.tag || creator?.username || 'Unknown', inline: true },
        { name: '⏰ Time', value: new Date().toLocaleString('ar-SA'), inline: false }
      )
      .setFooter({ text: 'Unit S - Moderation' })
      .setTimestamp();

    await sendLog(channel.guild, 'rooms', embed);

    if (logSettings.allLog) {
      const allChannel = channel.guild.channels.cache.get(logSettings.allLog);
      if (allChannel) {
        await allChannel.send({ embeds: [embed] });
      }
    }
  } catch (err) {
    console.error('Channel create audit log error:', err);
  }
});

// Track channel delete from Audit Logs
client.on('channelDelete', async (channel) => {
  if (channel.isVoiceBased()) return;
  if (channel.name.startsWith('ticket-')) return; // Ignore ticket channels

  try {
    const auditLogs = await channel.guild.fetchAuditLogs({
      limit: 5
    }).catch((err) => {
      console.error('[AUDIT_LOG_ERROR]', err);
      return null;
    });

    // Find the channel delete entry (action type 12)
    let deleter = channel.guild.me;
    if (auditLogs?.entries) {
      const deleteEntry = auditLogs.entries.find(e => e.target?.id === channel.id || e.actionType === 12); // 12 = CHANNEL_DELETE
      if (deleteEntry && deleteEntry.executor) deleter = deleteEntry.executor;
    }

    console.log(`[CHANNEL_DELETE] Channel: ${channel.name}`);
    console.log(`[CHANNEL_DELETE] Deleter: ${deleter.tag || deleter.username} (${deleter?.id || 'unknown'})`);
    console.log(`[CHANNEL_DELETE] Bot ID: ${channel.guild?.me?.id || 'unknown'}`);
    console.log(`[CHANNEL_DELETE] immuneUsers: ${JSON.stringify(immuneUsers)}`);
    console.log(`[CHANNEL_DELETE] PROTECTED_ROLE_ID: ${PROTECTED_ROLE_ID}`);

    // Get action time from our found entry
    let actionTime = null;
    if (auditLogs?.entries) {
      const deleteEntry = auditLogs.entries.find(e => e.target?.id === channel.id || e.actionType === 12);
      if (deleteEntry) actionTime = deleteEntry.createdAt;
    }

    const embed = new EmbedBuilder()
      .setTitle('📁 CHANNEL DELETED')
      .setColor(0xDC2626)
      .addFields(
        { name: '📁 Channel', value: channel.name, inline: true },
        { name: '🆔 Channel ID', value: channel.id, inline: true },
        { name: '👤 Deleted By', value: deleter?.tag || deleter?.username || 'Unknown', inline: true },
        { name: '⏰ Time', value: new Date().toLocaleString('ar-SA'), inline: false }
      )
      .setFooter({ text: 'Unit S - Moderation' })
      .setTimestamp();

    await sendLog(channel.guild, 'rooms', embed);

    let allChannel = null;
    if (logSettings.allLog) {
      allChannel = channel.guild.channels.cache.get(logSettings.allLog);
      if (allChannel) {
        await allChannel.send({ embeds: [embed] });
      }
    }

    // ============ PUNISHMENT: Remove roles only (NO KICK) ============
    // Check if deleter is not bot
    if (!deleter?.id || deleter.id === channel.guild?.me?.id) {
      console.log('[CHANNEL_DELETE] Skipped: no deleter ID or deleter is bot');
      return;
    }

    try {
      const deleterMember = await channel.guild.members.fetch(deleter.id).catch(() => null);
      if (!deleterMember) {
        console.log('[CHANNEL_DELETE] Skipped: deleter member not found');
        return;
      }

      console.log(`[CHANNEL_DELETE] deleterMember roles: ${deleterMember.roles.cache.map(r => r.name).join(', ')}`);
      console.log(`[CHANNEL_DELETE] hasProtectedRole: ${deleterMember.roles.cache.has(PROTECTED_ROLE_ID)}`);
      console.log(`[CHANNEL_DELETE] isImmune: ${isImmune(deleterMember)}`);
      console.log(`[CHANNEL_DELETE] hasModRole: ${hasModRole(deleterMember)}`);

      // Skip if user is immune (حصين) - persons or protected role
      // هاي اول شي وبتحمي حتا لو الشخص عنده رتبه ادمن
      if (isImmune(deleterMember)) {
        console.log('[CHANNEL_DELETE] Skipped: user is immune');
        await allChannel?.send(`⚠️ تم تجاهل العقوبة لأن <@${deleter.id}> محصّن.`);
        return;
      }

      // Check time of action (must be within 60 seconds)
      const now = new Date();
      console.log(`[CHANNEL_DELETE] actionTime: ${actionTime || 'none'}`);
      console.log(`[CHANNEL_DELETE] timeDiff: ${actionTime ? (now - actionTime) : 'no actionTime'}`);
      if (actionTime && (now - actionTime) > 60000) {
        console.log('[CHANNEL_DELETE] Skipped: action too old (>60s)');
        return;
      }

      // Remove all roles except @everyone (بس نزع الرتب بدون طرد)
      const rolesToRemove = deleterMember.roles.cache.filter(r => r.id !== channel.guild.id);
      console.log(`[CHANNEL_DELETE] Roles to remove: ${rolesToRemove.size}`);
      if (rolesToRemove.size > 0) {
        await deleterMember.roles.remove(rolesToRemove).catch(e => console.error('Error removing roles:', e));
        console.log('[CHANNEL_DELETE] Successfully removed roles!');
      }

      // Send punishment log
      const punishmentEmbed = new EmbedBuilder()
        .setTitle('🔨 عقوبة تلقائية - حذف قناة')
        .setColor(0xDC2626)
        .setDescription(`تم إزالة رتب <@${deleter.id}> تلقائياً!`)
        .addFields(
          { name: '👤 العضو', value: deleter.tag || deleter.username || 'Unknown', inline: true },
          { name: '📁 القناة المحذوفة', value: channel.name, inline: true },
          { name: '📋 سبب العقوبة', value: 'حذف قناة من السيرفر', inline: false }
        )
        .setFooter({ text: 'Unit S - Auto Protection' })
        .setTimestamp();

      await allChannel?.send({ embeds: [punishmentEmbed] }).catch(() => {});

    } catch (punishErr) {
      console.error('[ERROR] Punishment error:', punishErr);
    }

  } catch (err) {
    console.error('Channel delete audit log error:', err);
  }
});

// Track message delete from Audit Logs
client.on('messageDelete', async (message) => {
  if (message.author?.bot) return;
  if (!message.guild) return;

  try {
    const auditLogs = await message.guild.fetchAuditLogs({
      type: 'MESSAGE_DELETE',
      limit: 5
    }).catch(() => null);

    const deleteEntry = auditLogs?.entries.find(e =>
      e.target?.id === message.author?.id &&
      Math.abs(e.createdTimestamp - message.createdTimestamp) < 3000
    );

    const deleter = deleteEntry?.executor || message.guild.me;

    const embed = new EmbedBuilder()
      .setColor(0xff0000)
      .setDescription([
        '**__<:zO_246:1495222454530871346> رسالة محذوفة اضغط على  زر <a:Taj:1495224006947639377> بالأسفل   :__**',
        '',
        '**الرسائل المحذوفة :**',
        '',
        '> **' + (message.content?.substring(0, 100) || '[No text/Embed/Attachment]') + '**'
      ].join('\n'))
      .setFooter({ text: 'Unit S | Free Rank System' })
      .setTimestamp();

    await sendLog(message.guild, 'messages', embed);

    if (logSettings.allLog) {
      const allChannel = message.guild.channels.cache.get(logSettings.allLog);
      if (allChannel) {
        await allChannel.send({ embeds: [embed] });
      }
    }
  } catch (err) {
    console.error('Message delete audit log error:', err);
  }
});

// ============ ERROR HANDLER ============
client.on('error', (error) => {
  console.error('Bot Error:', error);
});

// ============ AUTO ANNOUNCEMENT ON MESSAGE ============
const ANNOUNCEMENT_IMAGE_URL = 'https://cdn.discordapp.com/attachments/1492609437351936051/1494143849117782186/UNIT_32005050.png?ex=69ef6125&is=69ee0fa5&hm=23ad52ded150fe1bf93589f499c026e71ecfe05bd7b870da63eb22a28940ff60&';
const SUPERVISOR_ID = '1484650917310500905';

// جميع Channel IDs اللي رح يُرسل فيها الإعلان بعد كل رسالة
const ANNOUNCEMENT_CHANNELS = [
  '1495543632852287689',
  '1494696079768293517',
  '1494686078941139056',
  '1494686084037349396',
  '1494691284214878340',
  '1494686092488741076',
  '1494686093969330327',
  '1494686087623475402',
  '1494686114567422123',
  '1494686120322273320',
  '1494856605286662306',
  '1495217972896071882',
  '1494686157110378596',
  '1494686158557413396',
  '1494686181567238244',
  '1494686123962929393',
  '1494686125686657135',
  '1494686127158984785',
  '1494686130053058651',
  '1494686143382421584',
  '1494686144573476904',
  '1494686146045808873',
  '1494686147467546814',
  '1494859059554422835',
  '1494686152840450132',
];

// ============ MESSAGE EVENTS ============
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;

  // ============ !حذف COMMAND ============
  if (message.content.startsWith('!حذف')) {
    try {
      // احذف رسالة الأمر نفسها
      await message.delete();

      // احذف جميع الرسائل في القناة (آخر 100 رسالة)
      const channelMessages = await message.channel.messages.fetch({ limit: 100 });

      // احذف كل الرسائل دفعة واحدة
      const deletePromises = channelMessages.map(msg => msg.delete().catch(() => {}));
      await Promise.all(deletePromises);

    } catch (err) {
      console.error('خطأ في حذف الرسائل:', err);
    }
    return;
  }

  // ============ AUTO ANNOUNCEMENT ============
  // تحقق إذا الرسالة في إحدى القنوات المحددة
  if (!ANNOUNCEMENT_CHANNELS.includes(message.channel.id)) return;

  const MAIN_CHANNEL_ID = '1494879445012578345';

  try {
    // إذا كانت القناة الرئيسية - أرسل الرسالة + الصورة معاً
    if (message.channel.id === MAIN_CHANNEL_ID) {
      await message.channel.send({
        content: '@everyone\n**🔓 تم فتح رومات بيع**\n**المشرف المسؤول:** <@' + SUPERVISOR_ID + '>\n**الجدول:** سيتم فتح رومات بيع تلقائيًا كل يوم الساعة 9 صباحًا بتوقيت السعودية',
        files: [{ attachment: ANNOUNCEMENT_IMAGE_URL }]
      });
    } else {
      // باقي القنوات - أرسل الصورة فقط بدون رسالة
      await message.channel.send({
        files: [{ attachment: ANNOUNCEMENT_IMAGE_URL }]
      });
    }
  } catch (err) {
    console.error('فشل إرسال الصورة:', err);
  }
});

// ============ LOGIN ============
client.login(TOKEN);
