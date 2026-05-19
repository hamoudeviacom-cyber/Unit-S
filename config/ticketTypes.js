// Ticket Types Configuration
// إعدادات أنواع التذاكر

export const TICKET_TYPES = {
  order: {
    name: 'الطلبات',
    nameAr: 'الطلبات',
    nameEn: 'Order',
    categoryPrefix: 'order',
    color: 0x10B981,
    icon: '📦',
    emojiId: '1495224006947639377',
    description: 'يرجى منك كتابة كل التفاصيل اللازمة لطلبك',
    questions: [
      'ما المنتج أو الخدمة المطلوبة؟',
      'ما التفاصيل المطلوبة؟',
      'هل لديك ميزانية محددة؟'
    ]
  },
  support: {
    name: 'الدعم الفني',
    nameAr: 'الدعم الفني',
    nameEn: 'Support',
    categoryPrefix: 'support',
    color: 0x3B82F6,
    icon: '🔧',
    emojiId: '1495224006947639377',
    description: 'يرجى توضيح مشكلتك بالكامل لكي يمكنني مساعدتك',
    questions: [
      'ما المشكلة التي تواجهك؟',
      'ما تفاصيل المشكلة؟',
      'هل لديك صور أو لقطات للمشكلة؟'
    ]
  },
  report: {
    name: 'الإبلاغ',
    nameAr: 'الإبلاغ',
    nameEn: 'Report',
    categoryPrefix: 'report',
    color: 0xDC2626,
    icon: '🚨',
    emojiId: '1495224006947639377',
    description: 'يرجى ذكر الشخص المخالف مع تفاصيل المخالفة',
    questions: [
      'من الشخص المخالف؟ (يوزر/أيدي)',
      'ما المخالفة التي قام بها؟',
      'ما الدليل على المخالفة؟ (صور/رسائل)'
    ]
  },
  applysupport: {
    name: 'التقديم للدعم',
    nameAr: 'التقديم للدعم',
    nameEn: 'Apply Support',
    categoryPrefix: 'applysupport',
    color: 0xF59E0B,
    icon: '📝',
    emojiId: '1495224006947639377',
    description: 'يرجى ملء البيانات التالية للانضمام لفريق الدعم',
    questions: [
      'ما اسمك الحقيقي؟',
      'ما خبراتك في مجال الدعم الفني؟',
      'كم ساعة تستطيع التفرغ يومياً؟',
      'ما أفضل وقت للتواصل معك؟'
    ]
  },
  applyteam: {
    name: 'التقديم للفريق',
    nameAr: 'التقديم للفريق',
    nameEn: 'Apply Team',
    categoryPrefix: 'applyteam',
    color: 0x8B5CF6,
    icon: '👥',
    emojiId: '1495224006947639377',
    description: 'يرجى ملء البيانات التالية للانضمام لفريق العمل',
    questions: [
      'ما اسمك الحقيقي؟',
      'ما مهاراتك؟ (تصميم/برمجة/تسويق...)',
      'ما الذي يميزك عن غيرك؟',
      'ما هدفك من الانضمام لفريقنا؟'
    ]
  }
};

export default TICKET_TYPES;