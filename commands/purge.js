// Purge Command - !حذف
// أمر حذف الرسائل

const { EmbedBuilder } = require('discord.js');
const { hasModRole } = require('../utils/helpers.js');

module.exports = {
  name: 'حذف',
  aliases: ['purge', 'delete', 'clean'],
  description: 'Delete messages in bulk',
  execute: async (message, args, client) => {
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
};
