// Free Rank Command
// أمر الرتبة المجانية

const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { hasModRole } = require('../utils/helpers.js');
const modSettings = require('../config/modSettings.js');
const { readFileSync, writeFileSync, existsSync } = require('fs');
const { join } = require('path');

const FREE_RANK_FILE = './free_rank_settings.json';

function loadFreeRankSettings() {
  try {
    if (existsSync(FREE_RANK_FILE)) {
      const data = readFileSync(FREE_RANK_FILE, 'utf8');
      const parsed = JSON.parse(data);
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

module.exports = {
  name: 'freerank',
  description: 'Free rank management',
  execute: async (message, args, client) => {
    const freeRankSettings = loadFreeRankSettings();

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

      saveFreeRankSettings(freeRankSettings);
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
      saveFreeRankSettings(freeRankSettings);
      await message.channel.send(`✅ تم تعيين الحد الأقصى للمطالبات: **${freeRankSettings.maxClaims === 0 ? 'غير محدود' : freeRankSettings.maxClaims}**`);
      if (!message.deleted) message.delete().catch(() => {});
      return;
    }

    // Reset counter
    if (action === 'reset') {
      freeRankSettings.claimedCount = 0;
      freeRankSettings.claimedUsers = [];
      saveFreeRankSettings(freeRankSettings);

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
              image: { url: 'https://cdn.discordapp.net/attachments/1397309666752593920/1495543234166919351/4cc71a18-6f61-459e-8e8a-293c31b199b4.png?ex=69e6a0ac&is=69e54f2c&hm=247d340eb85f00962d3e650df57c9221a78c33f75de0b5938a2340f503dfa33d&' },
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
  },
};
