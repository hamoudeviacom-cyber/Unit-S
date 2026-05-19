// Terms & Privacy Command
// أمر اتفاقية الاستخدام والخصوصية

import { EmbedBuilder } from 'discord.js';

export default {
  name: 'terms',
  description: 'Send terms and privacy agreement',
  execute: async (message, args, client) => {
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
};