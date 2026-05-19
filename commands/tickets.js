// Ticket Commands
// أوامر نظام التذاكر

import { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ChannelType } from 'discord.js';
import TICKET_TYPES from '../config/ticketTypes.js';

export default {
  name: 'tickets',
  aliases: ['ticket'],
  description: 'Show all ticket commands',
  execute: async (message, args, client) => {
    console.log('[TICKETS] ' + message.author.tag + ' requested tickets help');
    if (!message.deleted) message.delete().catch(() => {});
    const embed = new EmbedBuilder()
      .setTitle('🎫 Unit S | نظام التذاكر')
      .setColor(0x3ba55c)
      .setDescription('مرحباً بك في نظام التذاكر!\nاختر نوع التذكرة المناسب لك:')
      .addFields(
        { name: '📦 !order', value: 'للطلب منتج أو خدمة', inline: false },
        { name: '🔧 !support', value: 'للدعم الفني والمساعدة', inline: false },
        { name: '🚨 !report', value: 'للإبلاغ عن شخص مخالف', inline: false },
        { name: '📝 !applysupport', value: 'للانضمام لفريق الدعم الفني', inline: false },
        { name: '👥 !applyteam', value: 'للانضمام لفريق العمل', inline: false }
      )
      .setFooter({ text: 'Unit S | Ticketing System' })
      .setTimestamp();
    await message.channel.send({ embeds: [embed] });
  },
};

// Individual ticket type commands
export const orderCommand = {
  name: 'order',
  description: 'فتح لوحة الطلبات',
  execute: async (message) => {
    console.log('[ORDER] ' + message.author.tag + ' opened order panel');
    if (!message.deleted) message.delete().catch(() => {});
    const t = TICKET_TYPES.order;
    const embed = new EmbedBuilder()
      .setTitle(t.icon + ' || • ' + t.nameEn + ' • ' + t.nameAr)
      .setDescription([
        '**# If You Want Order Anything..!!**',
        '',
        '- ➡ Open Ticket Here,',
        '',
        '__ ـــــــــــــــــــــــــــــــــــــــــــــــــ <a:Taj:' + t.emojiId + '> ــــــــــــــــــــــــــــــــــــــــــــــــ\_\_'
      ].join('\n'))
      .setColor(t.color)
      .setFooter({ text: 'Unit S | Ticketing System' })
      .setImage('https://cdn.discordapp.net/attachments/1397309666752593920/1495169428738936852/UNIT_406004040.webp');
    const btn = new ButtonBuilder()
      .setCustomId('ticket_order')
      .setLabel('Open Ticket Order')
      .setStyle(ButtonStyle.Success)
      .setEmoji({ name: '🎫' });
    await message.channel.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(btn)] });
  }
};

export const supportCommand = {
  name: 'support',
  description: 'فتح لوحة الدعم الفني',
  execute: async (message) => {
    console.log('[SUPPORT] ' + message.author.tag + ' opened support panel');
    if (!message.deleted) message.delete().catch(() => {});
    const t = TICKET_TYPES.support;
    const embed = new EmbedBuilder()
      .setTitle(t.icon + ' || • ' + t.nameEn + ' • ' + t.nameAr)
      .setDescription([
        '**# If You Want Our Support For Anything..!!**',
        '',
        '- ➡ Open Ticket Here,',
        '',
        '__ ـــــــــــــــــــــــــــــــــــــــــــــــــ <a:Taj:' + t.emojiId + '> ــــــــــــــــــــــــــــــــــــــــــــــــ\_\_'
      ].join('\n'))
      .setColor(t.color)
      .setFooter({ text: 'Unit S | Ticketing System' })
      .setImage('https://cdn.discordapp.net/attachments/1397309666752593920/1495169428738936852/UNIT_406004040.webp');
    const btn = new ButtonBuilder()
      .setCustomId('ticket_support')
      .setLabel('Open Ticket SupporT')
      .setStyle(ButtonStyle.Success)
      .setEmoji({ name: '🎫' });
    await message.channel.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(btn)] });
  }
};

export const reportCommand = {
  name: 'report',
  description: 'فتح لوحة الإبلاغ',
  execute: async (message) => {
    console.log('[REPORT] ' + message.author.tag + ' opened report panel');
    if (!message.deleted) message.delete().catch(() => {});
    const t = TICKET_TYPES.report;
    const embed = new EmbedBuilder()
      .setTitle(t.icon + ' || • ' + t.nameEn + ' • ' + t.nameAr)
      .setDescription([
        '**# If You Want To Report Someone..!!**',
        '',
        '- ➡ Open Ticket Here,',
        '',
        '__ ـــــــــــــــــــــــــــــــــــــــــــــــــ <a:Taj:' + t.emojiId + '> ــــــــــــــــــــــــــــــــــــــــــــــــ\_\_'
      ].join('\n'))
      .setColor(t.color)
      .setFooter({ text: 'Unit S | Ticketing System' })
      .setImage('https://cdn.discordapp.net/attachments/1397309666752593920/1495169428738936852/UNIT_406004040.webp');
    const btn = new ButtonBuilder()
      .setCustomId('ticket_report')
      .setLabel('Open Ticket RepoRT')
      .setStyle(ButtonStyle.Danger)
      .setEmoji({ name: '🎫' });
    await message.channel.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(btn)] });
  }
};

export const applySupportCommand = {
  name: 'applysupport',
  description: 'فتح لوحة التقديم للدعم',
  execute: async (message) => {
    console.log('[APPLYSUPPORT] ' + message.author.tag + ' opened apply support panel');
    if (!message.deleted) message.delete().catch(() => {});
    const t = TICKET_TYPES.applysupport;
    const embed = new EmbedBuilder()
      .setTitle(t.icon + ' || • ' + t.nameEn + ' • ' + t.nameAr)
      .setDescription([
        '**# If You Want To Join Our Staff..!!**',
        '',
        '- ➡ Open Ticket Here,',
        '',
        '__ ـــــــــــــــــــــــــــــــــــــــــــــــــ <a:Taj:' + t.emojiId + '> ــــــــــــــــــــــــــــــــــــــــــــــــ\_\_'
      ].join('\n'))
      .setColor(t.color)
      .setFooter({ text: 'Unit S | Ticketing System' })
      .setImage('https://cdn.discordapp.net/attachments/1397309666752593920/1495169428738936852/UNIT_406004040.webp');
    const btn = new ButtonBuilder()
      .setCustomId('ticket_applysupport')
      .setLabel('Open Apply SupporT')
      .setStyle(ButtonStyle.Primary)
      .setEmoji({ name: '🎫' });
    await message.channel.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(btn)] });
  }
};

export const applyTeamCommand = {
  name: 'applyteam',
  description: 'فتح لوحة التقديم للفريق',
  execute: async (message) => {
    console.log('[APPLYTEAM] ' + message.author.tag + ' opened apply team panel');
    if (!message.deleted) message.delete().catch(() => {});
    const t = TICKET_TYPES.applyteam;
    const embed = new EmbedBuilder()
      .setTitle(t.icon + ' || • ' + t.nameEn + ' • ' + t.nameAr)
      .setDescription([
        '**# If You Want To Join Our Team..!!**',
        '',
        '- ➡ Open Ticket Here,',
        '',
        '__ ـــــــــــــــــــــــــــــــــــــــــــــــــ <a:Taj:' + t.emojiId + '> ــــــــــــــــــــــــــــــــــــــــــــــــ\_\_'
      ].join('\n'))
      .setColor(t.color)
      .setFooter({ text: 'Unit S | Ticketing System' })
      .setImage('https://cdn.discordapp.net/attachments/1397309666752593920/1495169428738936852/UNIT_406004040.webp');
    const btn = new ButtonBuilder()
      .setCustomId('ticket_applyteam')
      .setLabel('Open Apply Team')
      .setStyle(ButtonStyle.Primary)
      .setEmoji({ name: '🎫' });
    await message.channel.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(btn)] });
  }
};