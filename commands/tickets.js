// Ticket Commands - أوامر نظام التذاكر
const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const TICKET_TYPES = require('../config/ticketTypes.js');

// ===== أمر order ⭐ =====
const orderCommand = {
  name: 'order',
  execute: async (message) => {
    if (!message.deleted) message.delete().catch(() => {});

    const embed = new EmbedBuilder()
      .setColor(0xDC2626)
      .setDescription([
        '<:Rox_pin:1495225600258998313> If you want to order anything !',
        '',
        '<:vanka237:1495225240035262597> Click the button below to open your ticket'
      ].join('\n'))
      .setFooter({ text: 'UNIT S | Order System' })
      .setTimestamp();

    const btn = new ButtonBuilder()
      .setCustomId('ticket_order')
      .setLabel('Open Ticket Order')
      .setStyle(ButtonStyle.Danger);

    await message.channel.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(btn)] });
  }
};

// ===== أمر support =====
const supportCommand = {
  name: 'support',
  execute: async (message) => {
    if (!message.deleted) message.delete().catch(() => {});
    const t = TICKET_TYPES.support;
    const embed = new EmbedBuilder()
      .setTitle(t.icon + ' || • ' + t.nameEn + ' • ' + t.nameAr)
      .setDescription([
        '**# If You Want Our Support For Anything..!!**',
        '',
        '- ➡ Open Ticket Here,',
        '',
        '__ ــــــــــــــــــــــــــــــــــــــــــــــــ <a:Taj:' + t.emojiId + '> ــــــــــــــــــــــــــــــــــــــــــــــــ__'
      ].join('\n'))
      .setColor(t.color)
      .setFooter({ text: 'Unit S | Ticketing System' })
      .setImage('https://cdn.discordapp.net/attachments/1397309666752593920/1495169428738936852/UNIT_406004040.webp');
    const btn = new ButtonBuilder().setCustomId('ticket_support').setLabel('Open Ticket SupporT').setStyle(ButtonStyle.Success).setEmoji({ name: '🎫' });
    await message.channel.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(btn)] });
  }
};

// ===== أمر report =====
const reportCommand = {
  name: 'report',
  execute: async (message) => {
    if (!message.deleted) message.delete().catch(() => {});
    const t = TICKET_TYPES.report;
    const embed = new EmbedBuilder()
      .setTitle(t.icon + ' || • ' + t.nameEn + ' • ' + t.nameAr)
      .setDescription([
        '**# If You Want To Report Someone..!!**',
        '',
        '- ➡ Open Ticket Here,',
        '',
        '__ ــــــــــــــــــــــــــــــــــــــــــــــــ <a:Taj:' + t.emojiId + '> ــــــــــــــــــــــــــــــــــــــــــــــــ__'
      ].join('\n'))
      .setColor(t.color)
      .setFooter({ text: 'Unit S | Ticketing System' })
      .setImage('https://cdn.discordapp.net/attachments/1397309666752593920/1495169428738936852/UNIT_406004040.webp');
    const btn = new ButtonBuilder().setCustomId('ticket_report').setLabel('Open Ticket RepoRT').setStyle(ButtonStyle.Danger).setEmoji({ name: '🎫' });
    await message.channel.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(btn)] });
  }
};

// ===== أمر applysupport =====
const applySupportCommand = {
  name: 'applysupport',
  execute: async (message) => {
    if (!message.deleted) message.delete().catch(() => {});
    const t = TICKET_TYPES.applysupport;
    const embed = new EmbedBuilder()
      .setTitle(t.icon + ' || • ' + t.nameEn + ' • ' + t.nameAr)
      .setDescription([
        '**# If You Want To Join Our Staff..!!**',
        '',
        '- ➡ Open Ticket Here,',
        '',
        '__ ــــــــــــــــــــــــــــــــــــــــــــــــ <a:Taj:' + t.emojiId + '> ــــــــــــــــــــــــــــــــــــــــــــــــ__'
      ].join('\n'))
      .setColor(t.color)
      .setFooter({ text: 'Unit S | Ticketing System' })
      .setImage('https://cdn.discordapp.net/attachments/1397309666752593920/1495169428738936852/UNIT_406004040.webp');
    const btn = new ButtonBuilder().setCustomId('ticket_applysupport').setLabel('Open Apply SupporT').setStyle(ButtonStyle.Primary).setEmoji({ name: '🎫' });
    await message.channel.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(btn)] });
  }
};

// ===== أمر applyteam =====
const applyTeamCommand = {
  name: 'applyteam',
  execute: async (message) => {
    if (!message.deleted) message.delete().catch(() => {});
    const t = TICKET_TYPES.applyteam;
    const embed = new EmbedBuilder()
      .setTitle(t.icon + ' || • ' + t.nameEn + ' • ' + t.nameAr)
      .setDescription([
        '**# If You Want To Join Our Team..!!**',
        '',
        '- ➡ Open Ticket Here,',
        '',
        '__ ــــــــــــــــــــــــــــــــــــــــــــــــ <a:Taj:' + t.emojiId + '> ــــــــــــــــــــــــــــــــــــــــــــــــ__'
      ].join('\n'))
      .setColor(t.color)
      .setFooter({ text: 'Unit S | Ticketing System' })
      .setImage('https://cdn.discordapp.net/attachments/1397309666752593920/1495169428738936852/UNIT_406004040.webp');
    const btn = new ButtonBuilder().setCustomId('ticket_applyteam').setLabel('Open Apply Team').setStyle(ButtonStyle.Primary).setEmoji({ name: '🎫' });
    await message.channel.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(btn)] });
  }
};

// ===== التصدير =====
module.exports = orderCommand;
module.exports.supportCommand = supportCommand;
module.exports.reportCommand = reportCommand;
module.exports.applySupportCommand = applySupportCommand;
module.exports.applyTeamCommand = applyTeamCommand;
