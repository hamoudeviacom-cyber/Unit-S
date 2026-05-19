// 24/7 Voice Command
// أمر الفويس 24/7

const { EmbedBuilder } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource } = require('@discordjs/voice');

module.exports = {
  name: '24voice',
  aliases: ['joinvoice', 'voice24'],
  description: '24/7 Voice Channel - Join and stay in voice',
  execute: async (message, args, client) => {
    let voiceConnection = client.voiceConnection;
    let voiceChannelId = client.voiceChannelId;

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
        client.voiceConnection = null;
        client.voiceChannelId = null;
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

      client.voiceConnection = connection;
      client.voiceChannelId = channelId;

      // Create audio player to stay in voice (prevents disconnect)
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
};
