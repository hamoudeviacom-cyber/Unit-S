// Unit S - Discord Bot
// نظام الحماية والتشفير
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

client.on('ready', async () => {
  console.log(`✅ Bot is online! Logged in as ${client.user.tag}`);
  console.log(`✅ Bot ID: ${client.user.id}`);
  client.user.setActivity('Unit S | !help', { type: 'PLAYING' });
});

// Login to Discord
client.login(TOKEN)
  .then(() => console.log('✅ Successfully logged in to Discord!'))
  .catch(err => console.error('❌ Failed to login:', err));

// Collections
client.commands = new Collection();
client.encryptedPosts = new Collection();

// ============ 24/7 Voice Settings ============
let voiceConnection = null;
let voiceChannelId = null;

// ============ Owner Settings ============
const OWNER_ID = '840134050222964786'; // صاحب السيرفر - الوحيد اللي يقدر يتحكم بالبوت

// دالة مساعدة للتأكد إذا العضو محمي
function isMemberProtected(member) {
  if (member.id === OWNER_ID) return true; // صاحب السيرفر محمي دائماً
  return member.roles.cache.some(role => PROTECTED_ROLE_IDS.includes(role.id));
}

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

                  // التحقق إذا الشخص محمي من immuneUsers أو صاحب السيرفر
                  if (immuneUsers.includes(inviterId) || inviterId === OWNER_ID) {
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

const COLORS = {
  unitS: 0x8B5CF6,
  unitSDark: 0x1E1B4B,
  danger: 0xDC2626,
  success: 0x10B981,
  warning: 0xF59E0B,
  info: 0x3B82F6,
  primary: 0x667eea,
};

// ============ Date Formatting Helper ============
function formatDate(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${day}/${month}/${year}, ${hours}:${minutes}:${seconds}`;
}

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

// ============ Ranks Shop Settings ============
const RANKS_FILE = './ranks_settings.json';

function loadRanksSettings() {
  try {
    if (existsSync(RANKS_FILE)) {
      const data = readFileSync(RANKS_FILE, 'utf8');
      const parsed = JSON.parse(data);
      return {
        ranks: Array.isArray(parsed.ranks) ? parsed.ranks : []
      };
    }
  } catch (err) {
    console.error('Error loading ranks settings:', err);
  }
  return {
    ranks: [
      { id: 'rank_coder', name: 'Coder S.', price: 150000, features: ['نشر في رومات محددة', 'إمكانية منشن', 'صلاحيات خاصة'], roleId: null },
      { id: 'rank_artisan', name: 'Artisan S.', price: 200000, features: ['نشر في رومات معينة', 'نشر صور في رومات محددة', 'إمكانية منشن'], roleId: null },
      { id: 'rank_novice', name: 'Novice S.', price: 250000, features: ['نشر في جميع الرومات', 'عدم نشر صور', 'إمكانية منشن'], roleId: null },
      { id: 'rank_elite', name: 'Elite S.', price: 300000, features: ['نشر في جميع الرومات', 'نشر صور', 'عدم المنشن'], roleId: null },
      { id: 'rank_master', name: 'Master S.', price: 550000, features: ['نشر في جميع الرومات', 'نشر صور في رومات محددة', 'إمكانية منشن'], roleId: null },
      { id: 'rank_legend', name: 'Legend S.', price: 750000, features: ['نشر في جميع الرومات', 'نشر صور', 'إمكانية منشن'], roleId: null },
      { id: 'rank_seraph', name: 'Seraph S.', price: 1000000, features: ['جميع الصلاحيات', 'نشر صور في جميع الرومات', 'منشن كامل'], roleId: null }
    ]
  };
}

function saveRanksSettings(settings) {
  try {
    writeFileSync(RANKS_FILE, JSON.stringify(settings, null, 2));
  } catch (err) {
    console.error('Error saving ranks settings:', err);
  }
}

const ranksSettings = loadRanksSettings();

// ============ Log Channels Settings ============
// IDs اللي أعطيتهم - Audit Log channels
const logSettings = {
  allLog: '1494686253675839598',      // # all-log
  banLog: '1494686254866890832',       // # ban-log
  kickLog: '1494686256087695460',      // # kick-log
  timeoutLog: '1494686257425416262',   // # timeout-log
  messagesLog: '1494686258772050011',  // # messages-log
  roomsLog: '1494686260797771878',     // # rooms-log
  joinLeaveLog: '1494686262894788712', // # join-leave
  rolesLog: '1494686265235214347',     // # roles-log
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
  '',
  '840134050222964786'
];

// رتبة محمية - الاعضاء اللي عندهم هالرول يقدرون يعملون كل شي بدون ما يطردهم البوت
const PROTECTED_ROLE_ID = '1493346333170340003';

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
  console.log(`[LOG] Sending ${logType} log to channels`);
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
      console.log(`[LOG] Sent to ${logType} channel: ${channel.name}`);
    }
  }

  // Send to all-log if set
  if (logSettings.allLog && logType !== 'all') {
    const allChannel = guild.channels.cache.get(logSettings.allLog);
    if (allChannel) {
      await allChannel.send({ embeds: [embed] });
      console.log(`[LOG] Sent to all-log channel: ${allChannel.name}`);
    }
  }
}

async function logBan(guild, moderator, target, reason) {
  console.log(`[BAN_LOG] Creating ban log for ${target.tag} | By: ${moderator.tag} | Reason: ${reason}`);
  const embed = new EmbedBuilder()
    .setTitle('<:Security_Red:1495225135979036835> BAN LOG')
    .setColor(0xDC2626)
    .addFields(
      { name: '<:StaffHighCommand:1495224616585658418> Admin', value: moderator.tag || moderator.username, inline: true },
      { name: '<:Security_Red:1495225135979036835> Banned User', value: target.tag || target.username, inline: true },
      { name: '<:1_spider:1495225013194985582> User ID', value: target.id, inline: true },
      { name: '<:Rox_pin:1495225600258998313> Reason', value: reason || 'No reason provided', inline: false },
      { name: '<:vanka237:1495225240035262597> Time', value: formatDate(new Date()), inline: false }
    )
    .setFooter({ text: 'Unit S - Moderation' })
    .setTimestamp();

  await sendLog(guild, 'ban', embed);
  console.log(`[BAN_LOG] Ban log sent successfully`);
}

async function logKick(guild, moderator, target, reason) {
  console.log(`[KICK_LOG] Creating kick log for ${target.tag} | By: ${moderator.tag} | Reason: ${reason}`);
  const embed = new EmbedBuilder()
    .setTitle('<:Security_Red:1495225135979036835> KICK LOG')
    .setColor(0xF59E0B)
    .addFields(
      { name: '<:StaffHighCommand:1495224616585658418> Admin', value: moderator.tag || moderator.username, inline: true },
      { name: '<:Security_Red:1495225135979036835> Kicked User', value: target.tag || target.username, inline: true },
      { name: '<:1_spider:1495225013194985582> User ID', value: target.id, inline: true },
      { name: '<:Rox_pin:1495225600258998313> Reason', value: reason || 'No reason provided', inline: false },
      { name: '<:vanka237:1495225240035262597> Time', value: formatDate(new Date()), inline: false }
    )
    .setFooter({ text: 'Unit S - Moderation' })
    .setTimestamp();

  await sendLog(guild, 'kick', embed);
  console.log(`[KICK_LOG] Kick log sent successfully`);
}

async function logTimeout(guild, moderator, target, duration, reason) {
  console.log(`[TIMEOUT_LOG] Creating timeout log for ${target.tag} | By: ${moderator.tag} | Duration: ${duration}`);
  const embed = new EmbedBuilder()
    .setTitle('<:emrp_online:1495223740596879492> TIMEOUT LOG')
    .setColor(0x8B5CF6)
    .addFields(
      { name: '<:StaffHighCommand:1495224616585658418> Admin', value: moderator.tag || moderator.username, inline: true },
      { name: '<:Security_Red:1495225135979036835> User', value: target.tag || target.username, inline: true },
      { name: '<:1_spider:1495225013194985582> User ID', value: target.id, inline: true },
      { name: '<:vanka237:1495225240035262597> Duration', value: duration || 'Unknown', inline: true },
      { name: '<:Rox_pin:1495225600258998313> Reason', value: reason || 'No reason provided', inline: false },
      { name: '<:vanka234:1495225521242636432> Time', value: formatDate(new Date()), inline: false }
    )
    .setFooter({ text: 'Unit S - Moderation' })
    .setTimestamp();

  await sendLog(guild, 'timeout', embed);
  console.log(`[TIMEOUT_LOG] Timeout log sent successfully`);
}

async function logMemberJoin(guild, member) {
  console.log(`[JOIN_LOG] Member joined: ${member.user.tag}`);
  const embed = new EmbedBuilder()
    .setTitle('<:emrp_online:1495223740596879492> MEMBER JOINED')
    .setColor(0x10B981)
    .addFields(
      { name: '<:Security_Red:1495225135979036835> User', value: member.user?.tag || 'Unknown', inline: true },
      { name: '<:1_spider:1495225013194985582> User ID', value: member.id, inline: true },
      { name: '<:StaffHighCommand:1495224616585658418> Joined Server', value: formatDate(member.joinedTimestamp), inline: false },
      { name: '<:vanka234:1495225521242636432> Time', value: formatDate(new Date()), inline: false }
    )
    .setFooter({ text: 'Unit S - Moderation' })
    .setTimestamp();

  await sendLog(guild, 'joinLeave', embed);
  console.log(`[JOIN_LOG] Join log sent successfully`);
}

async function logMemberLeave(guild, member, kicker) {
  console.log(`[LEAVE_LOG] Member left: ${member.user.tag} | Kicked by: ${kicker?.tag || 'Left voluntarily'}`);
  const embed = new EmbedBuilder()
    .setTitle('<:emrp_offline:1495223788139446463> MEMBER LEFT')
    .setColor(0xF59E0B)
    .addFields(
      { name: '<:Security_Red:1495225135979036835> User', value: member.user?.tag || 'Unknown', inline: true },
      { name: '<:1_spider:1495225013194985582> User ID', value: member.id, inline: true },
      { name: '<:StaffHighCommand:1495224616585658418> Removed By', value: kicker ? `${kicker.tag || kicker.username}` : 'Left voluntarily', inline: true },
      { name: '<:vanka234:1495225521242636432> Time', value: formatDate(new Date()), inline: false }
    )
    .setFooter({ text: 'Unit S - Moderation' })
    .setTimestamp();

  await sendLog(guild, 'joinLeave', embed);
  console.log(`[LEAVE_LOG] Leave log sent successfully`);
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

// ============ HELP COMMAND ============
client.commands.set('help', {
  name: 'help',
  description: 'Show all commands',
  execute: async (message) => {
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
        { name: '<:StaffHighCommand:1495224616585658418> التذاكر', value:
          '`!tmanage addrole @رول` - إضافة رول للتذاكر\n' +
          '`!tmanage removerole @رول` - إزالة رول\n' +
          '`!tmanage addadmin @رول` - إضافة أدمن تذاكر\n' +
          '`!tmanage removeadmin @رول` - إزالة أدمن\n' +
          '`!tmanage roles` - عرض الرولات\n' +
          '`!tmanage admins` - عرض الأدمنز\n' +
          '`!tmanage setlogs #قناة` - تعيين قناة اللوجس\n' +
          '`!tmanage setmention @رول` - تعيين رول للمنشن\n' +
          '`!tmanage mention` - عرض إعدادات المنشن', inline: false },
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
    console.log(`[PING] ${message.author.tag} requested ping`);
    const ping = Date.now() - message.createdTimestamp;
    const apiPing = client.ws.ping;

    const embed = new EmbedBuilder()
      .setTitle('<:vanka235:1495225345518076034> Pong!')
      .setColor(0xDC2626)
      .addFields(
        { name: '<:vanka236:1495225280728662016> Latency', value: `${ping}ms`, inline: true },
        { name: '<:vanka234:1495225521242636432> API Ping', value: `${apiPing}ms`, inline: true }
      )
      .setTimestamp();

    await message.channel.send({ embeds: [embed] });
    if (!message.deleted) message.delete().catch(() => {});
    console.log(`[PING] Response sent to ${message.author.tag}`);
  },
});

// ============ TERMS & PRIVACY COMMAND ============
client.commands.set('terms', {
  name: 'terms',
  description: 'Send terms and privacy agreement',
  execute: async (message) => {
    console.log(`[TERMS] ${message.author.tag} requested terms`);
    const embed = new EmbedBuilder()
      .setTitle('<:vanka234:1495225521242636432> اتفاقية الاستخدام والخصوصية')
      .setDescription("بانضمامك واستخدامك لهذا السيرفر، فإنك تقر بموافقتك التامة على الالتزام بالشروط التالية:\n\n• **شروط ديسكورد الرسمية:**\nيجب الالتزام بـ [شروط خدمة ديسكورد](https://discord.com/terms) و [إرشادات المجتمع](https://discord.com/guidelines). أي مخالفة لها قد تؤدي لحرمانك من خدماتنا.\n\n• **الموافقة الضمنية:**\nبمجرد تواجدك في السيرفر أو طلبك لأي خدمة، فأنت توافق تلقائياً على كافة قوانين المتجر وشروط البيع الموضحة لدينا.\n\n• **إخلاء المسؤولية:**\nالمتجر غير مسؤول عن أي سوء استخدام للمنتجات بعد تسليمها، وتتحمل أنت كامل المسؤولية عن حسابك وتصرفاتك.")
      .setColor(2829619)
      .setTimestamp();

    await message.channel.send({ embeds: [embed] });
    if (!message.deleted) message.delete().catch(() => {});
    console.log(`[TERMS] Terms sent to ${message.author.tag}`);
  },
});

// ============ SAY COMMAND ============
client.commands.set('say', {
  name: 'say',
  description: 'Make the bot send a message',
  execute: async (message, args) => {
    // Check if user has admin permissions
    if (!hasModRole(message.member) && !modSettings.adminUsers.includes(message.author.username)) {
      console.log(`[SAY] ${message.author.tag} tried to use say without permission`);
      await message.channel.send('❌ ليس لديك صلاحية!');
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    // Check if there's text to send
    if (args.length === 0) {
      console.log(`[SAY] No message specified by ${message.author.tag}`);
      const embed = new EmbedBuilder()
        .setTitle('<:vanka235:1495225345518076034> أمر Say')
        .setColor(0xDC2626)
        .setDescription('الاستخدام: `!say [الرسالة]`\n\nمثال: `!say مرحباً بالجميع!`')
        .setFooter({ text: 'Unit S Bot' });
      await message.channel.send({ embeds: [embed] });
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    // Get the text to send
    const text = args.join(' ');
    console.log(`[SAY] ${message.author.tag} making bot say: ${text}`);

    // Delete the command message
    if (!message.deleted) message.delete().catch(() => {});

    // Send the message
    await message.channel.send(text);
    console.log(`[SAY] Message sent successfully`);
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
        console.log(`[BAN] ${message.author.tag} tried to use ban without permission`);
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
        console.log(`[BAN] Fetched user by ID: ${targetUser.tag}`);
      } catch (err) {
        console.log(`[BAN] User not found: ${userId}`);
        await message.channel.send('❌ لم يتم العثور على المستخدم!');
        if (!message.deleted) message.delete().catch(() => {});
        return;
      }
    }

    if (!targetUser) {
      console.log(`[BAN] No target user specified by ${message.author.tag}`);
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
        try {
      targetMember = await guild.members.fetch(targetUser.id);
      console.log(`[BAN] Target member found: ${targetMember.user.tag}`);
    } catch (err) {
      console.log(`[BAN] Target not in server: ${targetUser.tag}`);
      // User not in server
    }

    // Check if trying to ban higher role
    if (targetMember) {
      if (targetMember.roles.highest.position >= message.member.roles.highest.position && message.guild.ownerId !== message.member.id) {
        console.log(`[BAN] ${message.author.tag} tried to ban higher role user: ${targetUser.tag}`);
        await message.channel.send('❌ لا يمكنك حظر هذا العضو!');
        if (!message.deleted) message.delete().catch(() => {});
        return;
      }
    }

    // Ban the user
    try {
      console.log(`[BAN] ${message.author.tag} is banning ${targetUser.tag} | Reason: ${reason}`);
      await guild.members.ban(targetUser.id, { reason: `By: ${message.author.tag} | Reason: ${reason}` });
      console.log(`[BAN] Successfully banned ${targetUser.tag}`);

      // Log the ban
      await logBan(guild, message.author, targetUser, reason);
      console.log(`[BAN] Ban logged to channels`);

      // Confirmation message - EMBED IN SAME CHANNEL with the name of the banned person
      const embed = new EmbedBuilder()
        .setTitle(`<:Security_Red:1495225135979036835> ${targetUser.tag} تم حظر`)
        .setColor(0xDC2626)
        .setDescription([
          `<:Security_Red:1495225135979036835> ** العضو المحظور:** ${targetUser.tag}`,
          `<:StaffHighCommand:1495224616585658418> **السبب:** ${reason}`,
          `<:6542stafficonred:1495225057209880706> **بواسطة:** ${message.author.tag}`
        ].join('\n'))
        .setFooter({ text: 'Unit S - Moderation' })
        .setTimestamp();

      await message.channel.send({ embeds: [embed] });
      if (!message.deleted) message.delete().catch(() => {});

    } catch (err) {
      console.error(`[BAN ERROR] ${err.message}`);
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
        console.log(`[UNBAN] ${message.author.tag} tried to use unban without permission`);
        await message.channel.send('❌ ليس لديك صلاحية!');
        if (!message.deleted) message.delete().catch(() => {});
        return;
      }
    }

    if (args.length === 0) {
      console.log(`[UNBAN] No user ID specified by ${message.author.tag}`);
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
    console.log(`[UNBAN] ${message.author.tag} unbanning user ID: ${userId}`);

    try {
      const user = await client.users.fetch(userId);
      await message.guild.members.unban(userId);
      console.log(`[UNBAN] Successfully unbanned ${user.tag}`);

      // Log the unban
      const banLogEmbed = new EmbedBuilder()
        .setTitle('<:6542stafficonred:1495225057209880706> <a:vanka234:1495225521242636432> تم إلغاء الحظر')
        .setColor(0x10B981)
        .addFields(
          { name: '<:Security_Red:1495225135979036835> العضو', value: user.tag, inline: true },
          { name: '<:StaffHighCommand:1495224616585658418> بواسطة', value: message.author.tag, inline: true },
          { name: '<:1_spider:1495225013194985582> الوقت', value: new Date().toLocaleString('en-US', { timeZone: 'Asia/Riyadh' }), inline: false }
        )
        .setFooter({ text: 'Unit S - Moderation' })
        .setTimestamp();

      await message.channel.send({ embeds: [banLogEmbed] });

      // Send to ban log
      await sendLog(message.guild, 'ban', banLogEmbed);
      console.log(`[UNBAN] Unban logged to channels`);

      if (!message.deleted) message.delete().catch(() => {});

    } catch (err) {
      console.error(`[UNBAN ERROR] ${err.message}`);
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
        console.log(`[KICK] ${message.author.tag} tried to use kick without permission`);
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
        console.log(`[KICK] Fetched user by ID: ${targetUser.tag}`);
      } catch (err) {
        console.log(`[KICK] User not found: ${userId}`);
        await message.channel.send('❌ لم يتم العثور على المستخدم!');
        if (!message.deleted) message.delete().catch(() => {});
        return;
      }
    }

    if (!targetUser) {
      console.log(`[KICK] No target user specified by ${message.author.tag}`);
      const embed = new EmbedBuilder()
        .setTitle('<:Security_Red:1495225135979036835> KICK COMMAND')
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
        try {
      targetMember = await guild.members.fetch(targetUser.id);
      console.log(`[KICK] Target member found: ${targetMember.user.tag}`);
    } catch (err) {
      console.log(`[KICK] Target not in server: ${targetUser.tag}`);
      await message.channel.send('❌ هذا العضو غير موجود في السيرفر!');
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    // Check if trying to kick higher role
    if (targetMember.roles.highest.position >= message.member.roles.highest.position && message.guild.ownerId !== message.member.id) {
      console.log(`[KICK] ${message.author.tag} tried to kick higher role user: ${targetUser.tag}`);
      await message.channel.send('❌ لا يمكنك طرد هذا العضو!');
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    // Kick the user
    try {
      console.log(`[KICK] ${message.author.tag} is kicking ${targetUser.tag} | Reason: ${reason}`);
      await targetMember.kick(`By: ${message.author.tag} | Reason: ${reason}`);
      console.log(`[KICK] Successfully kicked ${targetUser.tag}`);

      // Log the kick
      await logKick(guild, message.author, targetUser, reason);
      console.log(`[KICK] Kick logged to channels`);

      // Confirmation message - EMBED IN SAME CHANNEL with the name of the kicked person
      const embed = new EmbedBuilder()
        .setTitle(`<:Security_Red:1495225135979036835> ${targetUser.tag} تم طرد`)
        .setColor(0xF59E0B)
        .setDescription([
          `<:Security_Red:1495225135979036835> **العضو المطرود:** ${targetUser.tag}`,
          `<:StaffHighCommand:1495224616585658418> **السبب:** ${reason}`,
          `<:6542stafficonred:1495225057209880706> **بواسطة:** ${message.author.tag}`
        ].join('\n'))
        .setFooter({ text: 'Unit S - Moderation' })
        .setTimestamp();

      await message.channel.send({ embeds: [embed] });
      if (!message.deleted) message.delete().catch(() => {});

    } catch (err) {
      console.error(`[KICK ERROR] ${err.message}`);
      await message.channel.send(`❌ حدث خطأ أثناء الطرد: ${err.message}`);
      if (!message.deleted) message.delete().catch(() => {});
    }
  },
});

// ============ PURGE COMMAND (!حذف) ============
client.commands.set('حذف', {
  name: 'حذف',
  aliases: ['purge', 'delete', 'clean'],
  description: 'Delete messages in bulk',
  execute: async (message, args) => {
    // Check permissions
    if (!message.member.permissions.has('ManageMessages')) {
      if (!hasModRole(message.member)) {
        await message.channel.send('❌ ليس لديك صلاحية!');
        if (!message.deleted) message.delete().catch(() => {});
        return;
      }
    }

    // Parse amount
    const amountArg = args[0];
    if (!amountArg) {
      const embed = new EmbedBuilder()
        .setTitle('🗑️ PURGE COMMAND')
        .setColor(0xDC2626)
        .addFields(
          { name: 'Usage:', value: '`!حذف [عدد]`', inline: false },
          { name: 'Example:', value: '`!حذف 10` - لحذف 10 رسائل', inline: false },
          { name: 'Max:', value: '100 رسالة في المرة', inline: false }
        )
        .setFooter({ text: 'Unit S - Moderation' });
      await message.channel.send({ embeds: [embed] });
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    // Parse number - يجب أن يكون بين 1 و 100
    const amount = parseInt(amountArg);

    if (isNaN(amount) || amount < 1 || amount > 100) {
      await message.channel.send('❌ استخدم رقم بين 1 و 100!\nمثال: `!حذف 10`');
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    // Fetch messages to delete (amount + 1 for the command message)
    try {
      const messages = await message.channel.messages.fetch({ limit: amount + 1 });

      if (messages.size === 0) {
        await message.channel.send('❌ لا توجد رسائل للحذف!');
        if (!message.deleted) message.delete().catch(() => {});
        return;
      }

      // Calculate actual messages to delete (excluding the command message)
      const toDelete = Math.min(messages.size - 1, amount);

      if (toDelete === 0) {
        await message.channel.send('❌ لا توجد رسائل للحذف!');
        if (!message.deleted) message.delete().catch(() => {});
        return;
      }

      // Bulk delete messages ( Discord has 14 day limit for bulk delete)
      const deletedMessages = await message.channel.bulkDelete(toDelete, { filterOld: true });

      // Delete the command message itself
      if (!message.deleted) {
        await message.delete().catch(() => {});
      }

      // Send confirmation
      const confirmEmbed = new EmbedBuilder()
        .setTitle('🗑️ تم حذف الرسائل')
        .setColor(0x10B981)
        .addFields(
          { name: 'عدد الرسائل المحذوفة', value: `${deletedMessages.size}`, inline: true },
          { name: 'بواسطة', value: message.author.tag, inline: true }
        )
        .setFooter({ text: 'Unit S - Moderation' })
        .setTimestamp();

      const confirmMsg = await message.channel.send({ embeds: [confirmEmbed] });

      // Auto-delete confirmation after 3 seconds
      setTimeout(() => {
        confirmMsg.delete().catch(() => {});
      }, 3000);

    } catch (err) {
      console.error('Purge error:', err);
      await message.channel.send(`❌ حدث خطأ: ${err.message}`);
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

// ============ RANKS MENU ============
client.commands.set('ranks', {
  name: 'ranks',
  description: 'Show available ranks for purchase',
  execute: async (message) => {
    // Use ranks from settings
    const ranks = ranksSettings.ranks;

    if (ranks.length === 0) {
      await message.channel.send('❌ لا توجد رتب متاحة حالياً!');
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    const embeds = [];
    for (let i = 0; i < ranks.length; i += 3) {
      const chunk = ranks.slice(i, i + 3);
      const embed = new EmbedBuilder()
        .setTitle('رتب Unit S')
        .setColor(0x667eea)
        .setFooter({ text: `Unit S | الصفحة ${Math.floor(i / 3) + 1}` });

      for (const rank of chunk) {
        embed.addFields({
          name: `${rank.name} - ${rank.price.toLocaleString()}`,
          value: rank.features.map(f => `• ${f}`).join('\n'),
          inline: false
        });
      }

      embeds.push(embed);
    }

    const buyButton = new ButtonBuilder()

// ============ PURCHASE MENU ============
client.commands.set('shop', {
  name: 'shop',
  description: 'Show shop options',
  execute: async (message) => {
    // Build options from ranksSettings
    const rankOptions = ranksSettings.ranks.map(rank => {
      return new StringSelectMenuOptionBuilder({
        label: `${rank.name} - ${rank.price.toLocaleString()}`,
        description: rank.features.join(' | '),
        value: `rank_${rank.id}`,
      });
    });

    const embed = new EmbedBuilder()
      .setTitle('💰 لوحة الشراء - الرتب')
      .setDescription('يرجى اختيار الرتبة التي تريد شرائها')
      .setColor(0x667eea)
      .setFooter({ text: 'Unit S | Shop' });

    const shopMenu = new StringSelectMenuBuilder()
      .setCustomId('shop_rank_select')
      .setPlaceholder('اختر الرتبة')
      .addOptions(rankOptions)
      .setMinValues(1)
      .setMaxValues(1);

    const buyButton = new ButtonBuilder()
      .setCustomId('buy_rank_button')
      .setLabel('شراء رتبة')
      .setStyle(ButtonStyle.Success);

    const backButton = new ButtonBuilder()
      .setCustomId('back_to_main_menu')
      .setLabel('رجوع للقائمة الرئيسية')
      .setStyle(ButtonStyle.Secondary);

    const menuRow = new ActionRowBuilder().addComponents(shopMenu);
    const buttonRow = new ActionRowBuilder().addComponents(buyButton, backButton);

    await message.channel.send({ embeds: [embed], components: [menuRow, buttonRow] });
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

// ============ RANKS MANAGEMENT COMMANDS ============
// !rankshop - عرض إعدادات الرتب
client.commands.set('rankshop', {
  name: 'rankshop',
  description: 'إدارة رتب المتجر',
  execute: async (message, args) => {
    // Check permissions
    if (!hasModRole(message.member) && !modSettings.adminUsers.includes(message.author.username)) {
      await message.channel.send('❌ ليس لديك صلاحية!');
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    if (args.length === 0) {
      const embed = new EmbedBuilder()
        .setTitle('Unit S | إدارة رتب المتجر')
        .setColor(0x667eea)
        .setDescription('أوامر إدارة رتب المتجر:')
        .addFields(
          { name: '`!rankshop list`', value: 'عرض جميع الرتب', inline: false },
          { name: '`!rankshop add [اسم] [السعر] [الميزات]`', value: 'إضافة رتبة جديدة', inline: false },
          { name: '`!rankshop remove [id]`', value: 'حذف رتبة', inline: false },
          { name: '`!rankshop price [id] [السعر]`', value: 'تعديل سعر رتبة', inline: false },
          { name: '`!rankshop name [id] [الاسم الجديد]`', value: 'تعديل اسم رتبة', inline: false },
          { name: '`!rankshop role [id] [@رول]`', value: 'ربط رتبة بديسكورد رول', inline: false },
          { name: '`!rankshop features [id] [الميزات]`', value: 'تعديل ميزات رتبة', inline: false }
        )
        .setFooter({ text: 'Unit S | Ranks Shop' })
        .setTimestamp();

      await message.channel.send({ embeds: [embed] });
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    const action = args[0].toLowerCase();

    // List all ranks
    if (action === 'list') {
      if (ranksSettings.ranks.length === 0) {
        await message.channel.send('❌ لا توجد رتب مضافة!');
        if (!message.deleted) message.delete().catch(() => {});
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle('قائمة الرتب | Unit S')
        .setColor(0x8B5CF6)
        .setFooter({ text: `عدد الرتب: ${ranksSettings.ranks.length}` })
        .setTimestamp()
        .setImage('https://cdn.discordapp.net/attachments/1397309666752593920/1495543234166919351/4cc71a18-6f61-459e-8e8a-293c31b199b4.png?ex=69e6a0ac&is=69e54f2c&hm=247d340eb85f00962d3e650df57c9221a78c33f75de0b5938a2340f503dfa33d&');

      for (const rank of ranksSettings.ranks) {
        embed.addFields({
          name: `${rank.name} - ${rank.price.toLocaleString()}`,
          value: `ID: \`${rank.id}\`\nالميزات: ${rank.features.join(' | ')}${rank.roleId ? `\nالرول: <@&${rank.roleId}>` : ''}`,
          inline: false
        });
      }

      // إنشاء الأزرار
      const buyButton = new ButtonBuilder()
        .setCustomId('shop_buy_rank')
        .setLabel('شراء رتبة')
        .setEmoji({ name: 'Taj', id: '1495224006947639377' })
        .setStyle(ButtonStyle.Success);

      const backButton = new ButtonBuilder()
        .setCustomId('shop_back_main')
        .setLabel('رجوع للقائمة الرئيسية')
        .setStyle(ButtonStyle.Secondary);

      const buttonRow = new ActionRowBuilder().addComponents(buyButton, backButton);

      await message.channel.send({ embeds: [embed], components: [buttonRow] });
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    // Add new rank
    if (action === 'add') {
      if (args.length < 3) {
        await message.channel.send('❌ الاستخدام: `!rankshop add [اسم] [السعر] [الميزات...]\`\nمثال: `!rankshop add VIP S. 500000 نشر في جميع الرومات`');
        if (!message.deleted) message.delete().catch(() => {});
        return;
      }

      const rankName = args[1];
      const price = parseInt(args[2]);
      const features = args.slice(3);

      if (isNaN(price) || price < 0) {
        await message.channel.send('❌ السعر يجب أن يكون رقماً!');
        if (!message.deleted) message.delete().catch(() => {});
        return;
      }

      if (features.length === 0) {
        await message.channel.send('❌ يجب إضافة ميزات للرتب!');
        if (!message.deleted) message.delete().catch(() => {});
        return;
      }

      const rankId = 'rank_' + rankName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

      // Check if rank already exists
      if (ranksSettings.ranks.some(r => r.id === rankId)) {
        await message.channel.send('❌ هذه الرتبة موجودة مسبقاً!');
        if (!message.deleted) message.delete().catch(() => {});
        return;
      }

      const newRank = {
        id: rankId,
        name: rankName,
        price: price,
        features: features,
        roleId: null
      };

      ranksSettings.ranks.push(newRank);
      saveRanksSettings(ranksSettings);

      await message.channel.send(`✅ تم إضافة الرتبة **${rankName}** بسعر **${price.toLocaleString()}**\nID: \`${rankId}\``);
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    // Remove rank
    if (action === 'remove') {
      if (args.length < 2) {
        await message.channel.send('❌ الاستخدام: `!rankshop remove [id]`');
        if (!message.deleted) message.delete().catch(() => {});
        return;
      }

      const rankId = args[1];
      const index = ranksSettings.ranks.findIndex(r => r.id === rankId);

      if (index === -1) {
        await message.channel.send('❌ لم يتم العثور على رتبة بهذا الـ ID!');
        if (!message.deleted) message.delete().catch(() => {});
        return;
      }

      const removedRank = ranksSettings.ranks.splice(index, 1)[0];
      saveRanksSettings(ranksSettings);

      await message.channel.send(`✅ تم حذف الرتبة **${removedRank.name}**`);
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    // Set price
    if (action === 'price') {
      if (args.length < 3) {
        await message.channel.send('❌ الاستخدام: `!rankshop price [id] [السعر]`');
        if (!message.deleted) message.delete().catch(() => {});
        return;
      }

      const rankId = args[1];
      const newPrice = parseInt(args[2]);

      if (isNaN(newPrice) || newPrice < 0) {
        await message.channel.send('❌ السعر يجب أن يكون رقماً!');
        if (!message.deleted) message.delete().catch(() => {});
        return;
      }

      const rank = ranksSettings.ranks.find(r => r.id === rankId);
      if (!rank) {
        await message.channel.send('❌ لم يتم العثور على رتبة بهذا الـ ID!');
        if (!message.deleted) message.delete().catch(() => {});
        return;
      }

      const oldPrice = rank.price;
      rank.price = newPrice;
      saveRanksSettings(ranksSettings);

      await message.channel.send(`✅ تم تحديث سعر **${rank.name}** من **${oldPrice.toLocaleString()}** إلى **${newPrice.toLocaleString()}**`);
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    // Set name
    if (action === 'name') {
      if (args.length < 3) {
        await message.channel.send('❌ الاستخدام: `!rankshop name [id] [الاسم الجديد]`');
        if (!message.deleted) message.delete().catch(() => {});
        return;
      }

      const rankId = args[1];
      const newName = args.slice(2).join(' ');

      const rank = ranksSettings.ranks.find(r => r.id === rankId);
      if (!rank) {
        await message.channel.send('❌ لم يتم العثور على رتبة بهذا الـ ID!');
        if (!message.deleted) message.delete().catch(() => {});
        return;
      }

      const oldName = rank.name;
      rank.name = newName;
      saveRanksSettings(ranksSettings);

      await message.channel.send(`✅ تم تحديث اسم **${oldName}** إلى **${newName}**`);
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    // Set role
    if (action === 'role') {
      if (args.length < 3) {
        await message.channel.send('❌ الاستخدام: `!rankshop role [id] [@رول]`');
        if (!message.deleted) message.delete().catch(() => {});
        return;
      }

      const rankId = args[1];
      const role = message.mentions.roles.first();

      if (!role) {
        await message.channel.send('❌ يجب mention رول!');
        if (!message.deleted) message.delete().catch(() => {});
        return;
      }

      const rank = ranksSettings.ranks.find(r => r.id === rankId);
      if (!rank) {
        await message.channel.send('❌ لم يتم العثور على رتبة بهذا الـ ID!');
        if (!message.deleted) message.delete().catch(() => {});
        return;
      }

      rank.roleId = role.id;
      saveRanksSettings(ranksSettings);

      await message.channel.send(`✅ تم ربط الرتبة **${rank.name}** بالرول ${role.name}`);
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    // Set features
    if (action === 'features') {
      if (args.length < 3) {
        await message.channel.send('❌ الاستخدام: `!rankshop features [id] [الميزات...]`');
        if (!message.deleted) message.delete().catch(() => {});
        return;
      }

      const rankId = args[1];
      const newFeatures = args.slice(2);

      const rank = ranksSettings.ranks.find(r => r.id === rankId);
      if (!rank) {
        await message.channel.send('❌ لم يتم العثور على رتبة بهذا الـ ID!');
        if (!message.deleted) message.delete().catch(() => {});
        return;
      }

      rank.features = newFeatures;
      saveRanksSettings(ranksSettings);

      await message.channel.send(`✅ تم تحديث ميزات **${rank.name}**\nالميزات: ${newFeatures.join(' | ')}`);
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    await message.channel.send('❌ أمر غير معروف! استخدم `!rankshop` لعرض الأوامر.');
    if (!message.deleted) message.delete().catch(() => {});
  },
});

// ============ EDIT PRICES BUTTONS COMMAND ============
client.commands.set('editprices', {
  name: 'editprices',
  description: 'عرض أزرار تعديل أسعار الرتب',
  execute: async (message, args) => {
    // Check permissions
    if (!hasModRole(message.member) && !modSettings.adminUsers.includes(message.author.username)) {
      await message.channel.send('❌ ليس لديك صلاحية!');
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    if (ranksSettings.ranks.length === 0) {
      await message.channel.send('❌ لا توجد رتب مضافة!');
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('Unit S | تعديل أسعار الرتب')
      .setColor(0x667eea)
      .setDescription('اضغط على الزر الخاص بالرتبة التي تريد تعديل سعرها')
      .setFooter({ text: 'Unit S | إدارة الأسعار' })
      .setTimestamp();

    // Create buttons row (max 5 per row)
    const rows = [];
    let currentRow = new ActionRowBuilder();

    for (let i = 0; i < ranksSettings.ranks.length; i++) {
      const rank = ranksSettings.ranks[i];

      const button = new ButtonBuilder()
        .setCustomId(`edit_price_${rank.id}`)
        .setLabel(`${rank.name}`)
        .setStyle(ButtonStyle.Primary);

      currentRow.addComponents(button);

      // Discord has max 5 buttons per row
      if ((i + 1) % 5 === 0 || i === ranksSettings.ranks.length - 1) {
        rows.push(currentRow);
        currentRow = new ActionRowBuilder();
      }
    }

    await message.channel.send({ embeds: [embed], components: rows });
    if (!message.deleted) message.delete().catch(() => {});
  },
});

// ============ INTERACTION HANDLER ============
client.on('interactionCreate', async (interaction) => {
  try {
    // Handle Button Interactions
    if (interaction.isButton()) {
      const customId = interaction.customId;

      // Handle edit price buttons
      if (customId.startsWith('edit_price_')) {
        const rankId = customId.replace('edit_price_', '');
        const rank = ranksSettings.ranks.find(r => r.id === rankId);

        if (!rank) {
          await interaction.reply({ content: '❌ الرتبة غير موجودة!', ephemeral: true });
          return;
        }

        // Create modal for price edit
        const modal = new ModalBuilder()
          .setCustomId(`price_modal_${rankId}`)
          .setTitle(`تعديل سعر ${rank.name}`);

        const priceInput = new TextInputBuilder()
          .setCustomId('new_price')
          .setLabel(`السعر الجديد (الحالي: ${rank.price.toLocaleString()})`)
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('أدخل السعر الجديد')
          .setRequired(true);

        const actionRow = new ActionRowBuilder().addComponents(priceInput);
        modal.addComponents(actionRow);

        await interaction.showModal(modal);
        return;
      }

      // Handle shop buy rank button
      if (customId === 'shop_buy_rank') {
        const rankOptions = ranksSettings.ranks.map(rank => {
          return {
            label: `${rank.name} - ${rank.price.toLocaleString()}`,
            description: rank.features.join(' | '),
            value: `rank_${rank.id}`,
          };
        });

        const embed = new EmbedBuilder()
          .setTitle('اختر الرتبة')
          .setColor(0x8B5CF6)
          .setFooter({ text: 'Unit S | Shop' })
          .setTimestamp();

        const shopMenu = new StringSelectMenuBuilder()
          .setCustomId('shop_rank_select')
          .setPlaceholder('اختر الرتبة')
          .addOptions(rankOptions.map(opt => new StringSelectMenuOptionBuilder(opt)))
          .setMinValues(1)
          .setMaxValues(1);

        const menuRow = new ActionRowBuilder().addComponents(shopMenu);

        await interaction.reply({ embeds: [embed], components: [menuRow], ephemeral: true });
        return;
      }

      // Handle back to main menu button
      if (customId === 'shop_back_main') {
        await interaction.message.delete().catch(() => {});

                return;
      }

      

      // Handle back to menu button (from !rank command)
      if (customId === 'back_to_menu') {
        await interaction.message.delete().catch(() => {});

                return;
      }
    }

    // Handle Modal submissions
    if (interaction.isModalSubmit()) {
      const customId = interaction.customId;

      if (customId.startsWith('price_modal_')) {
        const rankId = customId.replace('price_modal_', '');
        const rank = ranksSettings.ranks.find(r => r.id === rankId);

        if (!rank) {
          await interaction.reply({ content: '❌ الرتبة غير موجودة!', ephemeral: true });
          return;
        }

        const newPriceInput = interaction.fields.getTextInputValue('new_price');
        const newPrice = parseInt(newPriceInput);

        if (isNaN(newPrice) || newPrice < 0) {
          await interaction.reply({ content: '❌ السعر يجب أن يكون رقماً موجباً!', ephemeral: true });
          return;
        }

        const oldPrice = rank.price;
        rank.price = newPrice;
        saveRanksSettings(ranksSettings);

        const embed = new EmbedBuilder()
          .setTitle('✅ تم تحديث السعر بنجاح')
          .setColor(0x10B981)
          .addFields(
            { name: 'الرتبة:', value: rank.name, inline: true },
            { name: 'السعر القديم:', value: oldPrice.toLocaleString(), inline: true },
            { name: 'السعر الجديد:', value: newPrice.toLocaleString(), inline: true }
          )
          .setFooter({ text: 'Unit S | إدارة الأسعار' })
          .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: false });
        return;
      }

      // Handle buy rank modal submission
      if (customId === 'buy_rank_modal') {
          return;
        }

        // Store selected rank in cache for later use
        client.selectedRank = rank;

        const embed = new EmbedBuilder()
          .setTitle(`✅ تم اختيار: ${rank.name}`)
          .setColor(0x10B981)
          .addFields(
            { name: 'الرتبة:', value: rank.name, inline: true },
            { name: 'السعر:', value: rank.price.toLocaleString(), inline: true },
            { name: 'الميزات:', value: rank.features.map(f => `• ${f}`).join('\n'), inline: false }
          )
          .setFooter({ text: 'Unit S | Shop' })
          .setTimestamp();

        // Create buy button with selected rank info
        const buyButton = new ButtonBuilder()
          .setCustomId(`confirm_buy_rank_${rank.id}`)
          .setLabel('تأكيد الشراء')
          .setStyle(ButtonStyle.Success);

        const cancelButton = new ButtonBuilder()
          .setCustomId('cancel_buy')
          .setLabel('إلغاء')
          .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(buyButton, cancelButton);

        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
        return;
      }

      

      

    // Handle Button interactions for shop
    if (interaction.isButton()) {
      const customId = interaction.customId;

      // Handle buy rank button
      if (customId === 'buy_rank_button') {
        const embed = new EmbedBuilder()
          .setTitle('شراء رتبة')
          .setDescription('اختر الرتبة من القائمة أعلاه ثم اضغط على زر التأكيد')
          .setColor(0x667eea)
          .setFooter({ text: 'Unit S | Shop' });

        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
      }

      // Handle back to main menu button
      if (customId === 'back_to_main_menu') {
                await interaction.message.delete().catch(() => {});

                return;
      }

      // Handle new buy rank button from ranks list
      if (customId === 'shop_buy_rank') {
        const rankOptions = ranksSettings.ranks.map(rank => {
          return {
            label: `${rank.name} - ${rank.price.toLocaleString()}`,
            description: rank.features.join(' | '),
            value: `rank_${rank.id}`,
          };
        });

        const embed = new EmbedBuilder()
          .setTitle('اختر الرتبة')
          .setColor(0x8B5CF6)
          .setFooter({ text: 'Unit S | Shop' })
          .setTimestamp();

        const shopMenu = new StringSelectMenuBuilder()
          .setCustomId('shop_rank_select')
          .setPlaceholder('اختر الرتبة')
          .addOptions(rankOptions.map(opt => new StringSelectMenuOptionBuilder(opt)))
          .setMinValues(1)
          .setMaxValues(1);

        const menuRow = new ActionRowBuilder().addComponents(shopMenu);

        await interaction.reply({ embeds: [embed], components: [menuRow], ephemeral: true });
        return;
      }

      // Handle new back to main menu button
      if (customId === 'shop_back_main') {
        await interaction.message.delete().catch(() => {});

                return;
      }

      // Handle confirm buy rank
      if (customId.startsWith('confirm_buy_rank_')) {
        const rankId = customId.replace('confirm_buy_rank_', '');
        const rank = ranksSettings.ranks.find(r => r.id === rankId);

        if (!rank) {
          await interaction.reply({ content: '❌ الرتبة غير موجودة!', ephemeral: true });
          return;
        }

        

      // Handle cancel buy
      if (customId === 'cancel_buy') {
        await interaction.message.delete().catch(() => {});
        await interaction.reply({ content: 'تم إلغاء العملية.', ephemeral: true });
        return;
      }

      

      // Alias commands for easier access
client.commands.set('setrankprice', client.commands.get('rankshop'));
client.commands.set('addrank', client.commands.get('rankshop'));
client.commands.set('removerank', client.commands.get('rankshop'));
client.commands.set('editrank', client.commands.get('rankshop'));

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

// ============ TICKET SETTINGS ============
const TICKET_COLORS = {
  primary: 0x3B82F6,    // Blue
  dark: 0x1E1B4B,       // Dark blue
  danger: 0xDC2626,     // Red
  success: 0x10B981,    // Green
  warning: 0xF59E0B,    // Orange
};

const ticketSystem = {
  // Ticket category ID - set this to your ticket category
  categoryId: null,

  // Logs channel for closed tickets
  logsChannelId: null,

  // Role to mention when new ticket opens
  supportRoleId: null,

  // Admin roles that can manage tickets
  adminRoles: [],

  // Panel settings
  panelTitle: 'بانل تذاكر',
  ticketPrefix: 'support',
};

// ============ TICKET COUNTER ============
client.ticketCounter = 0;
client.ticketClaims = new Collection();

// ============ TICKET HELPER FUNCTIONS ============

// Check if user has ticket admin role
function hasTicketAdminRole(member) {
  if (!member) return false;

  // Check ManageChannels permission
  if (member.permissions.has('ManageChannels')) return true;

  // Check admin roles
  for (const roleId of ticketSystem.adminRoles) {
    if (member.roles.cache.has(roleId)) return true;
  }

  // Check role names
  const adminNames = ['عمر', 'ا', 'admin', 'ادمن'];
  for (const role of member.roles.cache.values()) {
    if (adminNames.some(name => role.name.toLowerCase().includes(name.toLowerCase()))) {
      return true;
    }
  }

  return false;
}

// Create ticket channel
async function createTicketChannel(guild, user, ticketType) {
  const category = guild.channels.cache.get(ticketSystem.categoryId);
  if (!category) return null;

  client.ticketCounter++;
  const channelName = `${ticketSystem.ticketPrefix}-${client.ticketCounter}`;

  const ticketChannel = await guild.channels.create(channelName, {
    type: 'GUILD_TEXT',
    parent: category.id,
    topic: `Ticket for ${user.tag} | Type: ${ticketType}`,
    permissionOverwrites: [
      {
        id: guild.id,
        deny: ['ViewChannel'],
      },
      {
        id: user.id,
        allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'],
      },
      {
        id: client.user.id,
        allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'ManageChannels'],
      },
    ],
  });

  return ticketChannel;
}

// Send ticket welcome message
async function sendTicketWelcome(ticketChannel, user, ticketType) {
  const embed = new EmbedBuilder()
    .setColor(TICKET_COLORS.primary)
    .setAuthor({
      name: 'Unit S | System Bot',
      iconURL: 'https://cdn.discordapp.com/attachments/placeholder/vs_logo.png'
    })
    .setTitle('الدعم الفني')
    .setDescription(`مرحباً <@${user.id}>!\n\nمرحباً بك في تذكرة الدعم الفني!\n\nيمكنك من هنا:\n• حل المشكلات والاستفسارات\n• شراء الرتب والإعلانات\n• شراء رومات خاصة ومميزة\n\nاختر من القائمة ادناه ما يناسب طلبك.\n\n⚠️ يرجى عدم السبام والمنشن والانتظار حتى يتم الرد.`);

  const purchaseEmbed = new EmbedBuilder()
    .setColor(TICKET_COLORS.primary)
    .setAuthor({
      name: 'Unit S | System Bot',
      iconURL: 'https://cdn.discordapp.com/attachments/placeholder/vs_logo.png'
    })
    .setTitle('الشراء التلقائي')
    .setDescription('اختر من القائمة سبب فتح التذكرة\n\nالخيارات:\n• شراء رتب عادية\n• شراء رتب مميزة\n• شراء رومات خاصة\n• شراء إعلانات\n• شراء منشورات مميزة\n• التبليغ عن مشكلة/استفسار');

  // Create select menu for ticket type
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('ticket_type_select')
    .setPlaceholder('Make a selection')
    .addOptions([
      new StringSelectMenuOptionBuilder()
        .setLabel('شراء رتب عادية')
        .setDescription('للشراء رتب عادية')
        .setEmoji('💎')
        .setValue('buy_ranks_normal'),
      new StringSelectMenuOptionBuilder()
        .setLabel('شراء رتب مميزة')
        .setDescription('للشراء رتب مميزة')
        .setEmoji('✨')
        .setValue('buy_ranks_premium'),
      new StringSelectMenuOptionBuilder()
        .setLabel('شراء رومات خاصة')
        .setDescription('للشراء رومات خاصة')
        .setEmoji('🏠')
        .setValue('buy_rooms'),
      new StringSelectMenuOptionBuilder()
        .setLabel('شراء إعلانات')
        .setDescription('للشراء إعلانات في السيرفر')
        .setEmoji('📢')
        .setValue('buy_ads'),
      new StringSelectMenuOptionBuilder()
        .setLabel('شراء منشورات مميزة')
        .setDescription('للشراء منشورات مميزة')
        .setEmoji('⭐')
        .setValue('buy_featured'),
      new StringSelectMenuOptionBuilder()
        .setLabel('استفسار/مشكلة')
        .setDescription('لأي استفسار أو مشكلة أخرى')
        .setEmoji('❓')
        .setValue('inquiry'),
    ]);

  const actionRow = new ActionRowBuilder().addComponents(selectMenu);

  await ticketChannel.send({ content: `مرحباً <@${user.id}>!`, embeds: [embed, purchaseEmbed], components: [actionRow] });

  // Send to support role if configured
  if (ticketSystem.supportRoleId) {
    await ticketChannel.send(`<@&${ticketSystem.supportRoleId}>`).then(msg => msg.delete());
  }
}

// Log ticket transcript
async function logTicketTranscript(channel, closedBy, reason = 'لم يذكر') {
  try {
    const messages = await channel.messages.fetch({ limit: 100 }).catch(() => new Collection());
    const sortedMessages = messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

    let transcript = `=== لوجس التذكرة: ${channel.name} ===\n`;
    transcript += `تاريخ الإغلاق: ${formatDate(new Date())}\n`;
    transcript += `مقام من: ${closedBy.tag || closedBy.username || 'غير معروف'}\n`;
    transcript += `السبب: ${reason}\n`;
    transcript += `عدد الرسائل: ${messages.size}\n`;
    transcript += '================================\n\n';

    for (const msg of sortedMessages.values()) {
      const timestamp = formatDate(msg.createdTimestamp);
      const author = msg.author.tag;
      const content = msg.content || '[رسالة بدون نص]';

      let attachments = '';
      if (msg.attachments.size > 0) {
        attachments = ' [مرفقات: ' + msg.attachments.map(a => a.name).join(', ') + ']';
      }

      transcript += `[${timestamp}] ${author}: ${content}${attachments}\n`;
    }

    transcript += '\n=== نهاية اللوجس ===';

    const logsChannel = client.channels.cache.get(ticketSystem.logsChannelId);
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

// ============ TICKET PANEL COMMAND ============
client.commands.set('ticket', {
  name: 'ticket',
  description: 'Open ticket panel - Unit S design',
  execute: async (message) => {
    // Check permissions
    if (!hasTicketAdminRole(message.member)) {
      await message.channel.send('❌ ليس لديك صلاحية!');
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    const ticketPanel = new EmbedBuilder()
      .setColor(TICKET_COLORS.primary)
      .setAuthor({
        name: 'Unit S | System Bot',
        iconURL: 'https://cdn.discordapp.com/attachments/placeholder/vs_logo.png'
      })
      .setTitle('بانل تذاكر')
      .setDescription(`اختر نوع التذكرة من القائمة ادناه:

🔧 **الدعم الفني**
افتح تذكرة للاستفسارات، شراء رتب، إعلانات، منشورات مميزة

🛡️ **إدارة الشكاوى**
افتح تذكرة للشكوى من أحد أعضاء الإدارة`);

    const notesEmbed = new EmbedBuilder()
      .setColor(TICKET_COLORS.dark)
      .addFields({
        name: '• ملاحظات •',
        value: `• لا تفتح تذكرة لأمور ليس لها علاقة بالسيرفر
• لا تزعج الموظفين بالمنشن والاسبام
• لا تطلب فتح تذكرة بدون سبب
• لا تستهتار بفتح التذاكر
• المخالفة تؤدي للعقوبة (Mute / Timeout) 12 ساعة`,
        inline: false
      })
      .setFooter({ text: 'Unit S | System Bot' });

    // Create select menu
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('ticket_main_select')
      .setPlaceholder('Make a selection')
      .addOptions([
        new StringSelectMenuOptionBuilder()
          .setLabel('دعم فني 🔧')
          .setDescription('للاستفسارات وشراء الرتب والإعلانات')
          .setValue('ticket_technical'),
        new StringSelectMenuOptionBuilder()
          .setLabel('الشكاوى 🛡️')
          .setDescription('للشكاوى من أعضاء الإدارة')
          .setValue('ticket_complaint'),
        new StringSelectMenuOptionBuilder()
          .setLabel('إعادة تعيين القائمة ⚙️')
          .setDescription('لإعادة فتح القائمة')
          .setValue('ticket_reset'),
      ]);

    const actionRow = new ActionRowBuilder().addComponents(selectMenu);

    const botMessage = await message.channel.send({
      embeds: [ticketPanel, notesEmbed],
      components: [actionRow]
    });

    // Store message ID for cleanup later
    client.ticketPanelMessageId = botMessage.id;

    // Additional note below the panel
    await message.channel.send(`⚠️ **ملحوظه:** عند شراء إعلان تأكد من أن رسالتك لا تحتوي على روابط، البوت لن يعدل أو يعوض عن روابط محظورة!\n\n@everyone`);

    if (!message.deleted) message.delete().catch(() => {});
  },
});

// ============ TICKET INTERACTION HANDLER ============
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isStringSelectMenu() && !interaction.isButton()) return;

  const customId = interaction.customId;

  // ============ TICKET MAIN SELECT MENU ============
  if (customId === 'ticket_main_select') {
    const selectedValue = interaction.values[0];

    if (selectedValue === 'ticket_reset') {
      // Resend the ticket panel
      const ticketPanel = new EmbedBuilder()
        .setColor(TICKET_COLORS.primary)
        .setAuthor({
          name: 'Unit S | System Bot',
          iconURL: 'https://cdn.discordapp.com/attachments/placeholder/vs_logo.png'
        })
        .setTitle('بانل تذاكر')
        .setDescription(`اختر نوع التذكرة من القائمة ادناه:

🔧 **الدعم الفني**
افتح تذكرة للاستفسارات، شراء رتب، إعلانات، منشورات مميزة

🛡️ **إدارة الشكاوى**
افتح تذكرة للشكوى من أحد أعضاء الإدارة`);

      const notesEmbed = new EmbedBuilder()
        .setColor(TICKET_COLORS.dark)
        .addFields({
          name: '• ملاحظات •',
          value: `• لا تفتح تذكرة لأمور ليس لها علاقة بالسيرفر
• لا تزعج الموظفين بالمنشن والاسبام
• لا تطلب فتح تذكرة بدون سبب
• لا تستهتار بفتح التذاكر
• المخالفة تؤدي للعقوبة (Mute / Timeout) 12 ساعة`,
          inline: false
        })
        .setFooter({ text: 'Unit S | System Bot' });

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('ticket_main_select')
        .setPlaceholder('Make a selection')
        .addOptions([
          new StringSelectMenuOptionBuilder()
            .setLabel('دعم فني 🔧')
            .setValue('ticket_technical'),
          new StringSelectMenuOptionBuilder()
            .setLabel('الشكاوى 🛡️')
            .setValue('ticket_complaint'),
          new StringSelectMenuOptionBuilder()
            .setLabel('إعادة تعيين القائمة ⚙️')
            .setValue('ticket_reset'),
        ]);

      const actionRow = new ActionRowBuilder().addComponents(selectMenu);

      await interaction.message.edit({ embeds: [ticketPanel, notesEmbed], components: [actionRow] });
      await interaction.reply({ content: '✅ تم إعادة تعيين القائمة!', ephemeral: true });
      return;
    }

    if (selectedValue === 'ticket_technical') {
      // Create technical support ticket
      try {
        const ticketChannel = await createTicketChannel(
          interaction.guild,
          interaction.user,
          'Technical Support'
        );

        if (!ticketChannel) {
          await interaction.reply({
            content: '❌ حدث خطأ! تأكد من إعداد قناة التذاكر.',
            ephemeral: true
          });
          return;
        }

        await sendTicketWelcome(ticketChannel, interaction.user, 'Technical Support');

        // Store ticket data
        client.ticketClaims.set(ticketChannel.id, {
          userId: interaction.user.id,
          type: 'technical',
          createdAt: Date.now(),
          claimedBy: null,
        });

        await interaction.reply({
          content: `✅ تم فتح تذكرة خاصة بك: ${ticketChannel}`,
          ephemeral: true
        });

      } catch (error) {
        console.error('Error creating ticket:', error);
        await interaction.reply({
          content: '❌ حدث خطأ أثناء فتح التذكرة!',
          ephemeral: true
        });
      }
      return;
    }

    if (selectedValue === 'ticket_complaint') {
      // Create complaint ticket
      try {
        const ticketChannel = await createTicketChannel(
          interaction.guild,
          interaction.user,
          'Complaint'
        );

        if (!ticketChannel) {
          await interaction.reply({
            content: '❌ حدث خطأ! تأكد من إعداد قناة التذاكر.',
            ephemeral: true
          });
          return;
        }

        // Send complaint welcome message
        const embed = new EmbedBuilder()
          .setColor(TICKET_COLORS.primary)
          .setAuthor({
            name: 'Unit S | System Bot',
            iconURL: 'https://cdn.discordapp.com/attachments/placeholder/vs_logo.png'
          })
          .setTitle('إدارة الشكاوى')
          .setDescription(`مرحباً <@${interaction.user.id}>!

مرحباً بك في قناة الشكاوى!

⚠️ **تنبيه مهم:**
فتح تذكرة شكوى بدون سبب إداري سيؤدي إلى _timeout_ لمدة 12 ساعة!

يرجى كتابة تفاصيل الشكوى بشكل واضح.`);

        const buttonRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('ticket_claim')
            .setLabel('Claim')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('📌'),
          new ButtonBuilder()
            .setCustomId('ticket_manage')
            .setLabel('Manage Ticket')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('ticket_close')
            .setLabel('Close')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🔒'),
        );

        await ticketChannel.send({ content: `<@${interaction.user.id}>`, embeds: [embed], components: [buttonRow] });

        // Send to support role
        if (ticketSystem.supportRoleId) {
          await ticketChannel.send(`<@&${ticketSystem.supportRoleId}>`).then(msg => msg.delete());
        }

        // Store ticket data
        client.ticketClaims.set(ticketChannel.id, {
          userId: interaction.user.id,
          type: 'complaint',
          createdAt: Date.now(),
          claimedBy: null,
        });

        await interaction.reply({
          content: `✅ تم فتح تذكرة الشكوى: ${ticketChannel}`,
          ephemeral: true
        });

      } catch (error) {
        console.error('Error creating complaint ticket:', error);
        await interaction.reply({
          content: '❌ حدث خطأ أثناء فتح التذكرة!',
          ephemeral: true
        });
      }
      return;
    }
  }

  // ============ TICKET TYPE SELECT (Inside ticket) ============
  if (customId === 'ticket_type_select') {
    const selectedValue = interaction.values[0];

    const typeEmbed = new EmbedBuilder()
      .setColor(TICKET_COLORS.success)
      .setAuthor({
        name: 'Unit S | System Bot',
        iconURL: 'https://cdn.discordapp.com/attachments/placeholder/vs_logo.png'
      })
      .setTitle('تم استلام طلبك')
      .setDescription(`تم تحديد: **${selectedValue}**\n\nيرجى الانتظار حتى يتم الرد عليك.`);

    await interaction.reply({ embeds: [typeEmbed], ephemeral: true });
    return;
  }

  // ============ TICKET BUTTON HANDLERS ============
  if (customId === 'ticket_claim') {
    const ticketData = client.ticketClaims.get(interaction.channel.id);

    if (!ticketData) {
      await interaction.reply({ content: '❌ لا توجد بيانات للتذكرة!', ephemeral: true });
      return;
    }

    if (ticketData.claimedBy) {
      await interaction.reply({
        content: `❌ تم استلام هذه التذكرة بواسطة <@${ticketData.claimedBy}>`,
        ephemeral: true
      });
      return;
    }

    // Claim the ticket
    ticketData.claimedBy = interaction.user.id;
    client.ticketClaims.set(interaction.channel.id, ticketData);

    // Update permissions
    await interaction.channel.permissionOverwrites.edit(interaction.user.id, {
      SendMessages: true,
    });

    const claimEmbed = new EmbedBuilder()
      .setColor(TICKET_COLORS.primary)
      .setTitle('تم استلام التذكرة')
      .setDescription(`تم استلام هذه التذكرة بواسطة <@${interaction.user.id}>`);

    await interaction.reply({ embeds: [claimEmbed] });
    return;
  }

  if (customId === 'ticket_close') {
    await interaction.deferReply();

    try {
      // Log transcript
      await logTicketTranscript(interaction.channel, interaction.user, 'تم إغلاق التذكرة');

      // Send closing message
      const closeEmbed = new EmbedBuilder()
        .setColor(TICKET_COLORS.danger)
        .setTitle('تم إغلاق التذكرة')
        .setDescription(`تم إغلاق هذه التذكرة بواسطة <@${interaction.user.id}>`);

      await interaction.editReply({ embeds: [closeEmbed] });

      // Delete channel after delay
      setTimeout(async () => {
        try {
          await interaction.channel.delete();
        } catch (e) {
          console.log('Error deleting channel:', e);
        }
      }, 3000);

    } catch (error) {
      console.error('Error closing ticket:', error);
      await interaction.editReply({ content: '❌ حدث خطأ أثناء إغلاق التذكرة!' });
    }
    return;
  }

  if (customId === 'ticket_manage') {
    const ticketData = client.ticketClaims.get(interaction.channel.id);
    const isAdmin = hasTicketAdminRole(interaction.member);

    if (!ticketData && !isAdmin) {
      await interaction.reply({ content: '❌ ليس لديك صلاحية!', ephemeral: true });
      return;
    }

    const manageEmbed = new EmbedBuilder()
      .setColor(TICKET_COLORS.primary)
      .setTitle('إدارة التذكرة')
      .addFields(
        { name: 'المستخدم', value: `<@${ticketData?.userId || 'غير معروف'}>`, inline: true },
        { name: 'الحالة', value: ticketData?.claimedBy ? `تم الاستلام بواسطة <@${ticketData.claimedBy}>` : 'لم يتم الاستلام', inline: true }
      )
      .setFooter({ text: 'Unit S | Ticket Management' });

    const manageRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_add_user')
        .setLabel('Add User')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('ticket_remove_user')
        .setLabel('Remove User')
        .setStyle(ButtonStyle.Secondary),
    );

    await interaction.reply({ embeds: [manageEmbed], components: [manageRow], ephemeral: true });
    return;
  }

  if (customId === 'ticket_add_user') {
    await interaction.reply({
      content: 'استخدم الأمر: `!ticket add @user` لإضافة مستخدم',
      ephemeral: true
    });
    return;
  }

  if (customId === 'ticket_remove_user') {
    await interaction.reply({
      content: 'استخدم الأمر: `!ticket remove @user` لإزالة مستخدم',
      ephemeral: true
    });
    return;
  }
});

// ============ TICKET MANAGER COMMAND ============
client.commands.set('tmanage', {
  name: 'tmanage',
  description: 'Manage tickets (admin only)',
  execute: async (message, args) => {
    // Check permissions
    if (!hasTicketAdminRole(message.member)) {
      await message.channel.send('❌ ليس لديك صلاحية!');
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    // If no args, show help
    if (args.length === 0) {
      const embed = new EmbedBuilder()
        .setColor(TICKET_COLORS.primary)
        .setTitle('إدارة التذاكر')
        .setDescription(`أوامر إدارة التذاكر:

\`!tmanage list\` - عرض جميع التذاكر المفتوحة
\`!tmanage close\` - إغلاق التذكرة الحالية
\`!tmanage addrole @رول\` - إضافة رول للأدمن
\`!tmanage removerole @رول\` - إزالة رول
\`!tmanage setlogs #قناة\` - تعيين قناة اللوج
\`!tmanage setcategory [id]\` - تعيين فئة التذاكر
\`!tmanage setmention @رول\` - تعيين رول للمنشن`)
        .setFooter({ text: 'Unit S | Ticket Management' });

      await message.channel.send({ embeds: [embed] });
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    const action = args[0].toLowerCase();

    // List all tickets
    if (action === 'list') {
      const tickets = message.guild.channels.cache.filter(ch => ch.name.startsWith(ticketSystem.ticketPrefix));

      if (tickets.size === 0) {
        await message.channel.send('❌ لا توجد تذاكر مفتوحة!');
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
        .setColor(TICKET_COLORS.primary)
        .setTitle('التذاكر المفتوحة')
        .setDescription(ticketList)
        .setFooter({ text: `عدد التذاكر: ${tickets.size}` });

      await message.channel.send({ embeds: [embed] });
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    // Close ticket
    if (action === 'close') {
      if (!message.channel.name.startsWith(ticketSystem.ticketPrefix)) {
        await message.channel.send('❌ هذا الأمر يجب استخدامه داخل تذكرة!');
        if (!message.deleted) message.delete().catch(() => {});
        return;
      }

      await logTicketTranscript(message.channel, message.author, 'تم الإغلاق بأمر !tmanage close');

      await message.channel.send('🔒 جاري إغلاق التذكرة...');

      setTimeout(async () => {
        try {
          await message.channel.delete();
        } catch (e) {
          console.log('Error deleting channel:', e);
        }
      }, 2000);
      return;
    }

    // Add admin role
    if (action === 'addrole') {
      const role = message.mentions.roles.first();
      if (!role) {
        await message.channel.send('❌ يجب mention رول!');
        if (!message.deleted) message.delete().catch(() => {});
        return;
      }

      if (!ticketSystem.adminRoles.includes(role.id)) {
        ticketSystem.adminRoles.push(role.id);
        await message.channel.send(`✅ تم إضافة <@&${role.id}> لقائمة الأدمن`);
      } else {
        await message.channel.send('❌ هذه الرتبة موجود بالفعل!');
      }
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    // Remove admin role
    if (action === 'removerole') {
      const role = message.mentions.roles.first();
      if (!role) {
        await message.channel.send('❌ يجب mention رول!');
        if (!message.deleted) message.delete().catch(() => {});
        return;
      }

      const index = ticketSystem.adminRoles.indexOf(role.id);
      if (index > -1) {
        ticketSystem.adminRoles.splice(index, 1);
        await message.channel.send(`✅ تم إزالة <@&${role.id}> من قائمة الأدمن`);
      } else {
        await message.channel.send('❌ هذه الرتبة غير موجود!');
      }
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    // Set logs channel
    if (action === 'setlogs') {
      const channel = message.mentions.channels.first();
      if (!channel) {
        await message.channel.send('❌ يجب mention قناة!');
        if (!message.deleted) message.delete().catch(() => {});
        return;
      }

      ticketSystem.logsChannelId = channel.id;
      await message.channel.send(`✅ تم تعيين قناة اللوج: ${channel}`);
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    // Set category
    if (action === 'setcategory') {
      const categoryId = args[1]?.replace(/[^0-9]/g, '');
      if (!categoryId || categoryId.length < 10) {
        await message.channel.send('❌ الاستخدام: `!tmanage setcategory [category_id]`');
        if (!message.deleted) message.delete().catch(() => {});
        return;
      }

      const category = message.guild.channels.cache.get(categoryId);
      if (!category || category.type !== 4) {
        await message.channel.send('❌ لم يتم العثور على الفئة!');
        if (!message.deleted) message.delete().catch(() => {});
        return;
      }

      ticketSystem.categoryId = categoryId;
      await message.channel.send(`✅ تم تعيين فئة التذاكر: ${category.name}`);
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    // Set mention role
    if (action === 'setmention') {
      const role = message.mentions.roles.first();
      if (!role) {
        await message.channel.send('❌ يجب mention رول!');
        if (!message.deleted) message.delete().catch(() => {});
        return;
      }

      ticketSystem.supportRoleId = role.id;
      await message.channel.send(`✅ تم تعيين رول الدعم: <@&${role.id}>`);
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    // Show current settings
    if (action === 'settings') {
      const adminRolesList = ticketSystem.adminRoles.length > 0
        ? ticketSystem.adminRoles.map(id => `<@&${id}>`).join('\n')
        : 'لا يوجد';

      const embed = new EmbedBuilder()
        .setColor(TICKET_COLORS.primary)
        .setTitle('إعدادات التذاكر')
        .addFields(
          { name: 'فئة التذاكر', value: ticketSystem.categoryId || 'غير معين', inline: true },
          { name: 'قناة اللوج', value: ticketSystem.logsChannelId || 'غير معين', inline: true },
          { name: 'رول الدعم', value: ticketSystem.supportRoleId || 'غير معين', inline: true },
          { name: 'أدمن التذاكر', value: adminRolesList, inline: false }
        )
        .setFooter({ text: 'Unit S | Ticket Settings' });

      await message.channel.send({ embeds: [embed] });
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }
  },
});

