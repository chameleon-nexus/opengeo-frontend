
import { BlogPost } from '../types';

export const INITIAL_BLOG_POSTS: BlogPost[] = [
  {
    id: '1',
    title: '现代家居之魂：伊姆斯躺椅的百年魅力',
    excerpt: '探索现代家具史上最著名的椅子及其背后的设计哲学。',
    content: '伊姆斯躺椅（Eames Lounge Chair）不仅是一把椅子，更是20世纪设计的象征。由Charles和Ray Eames夫妇在1956年设计，它完美结合了熟练的手工艺与现代工业技术。其独特的弯曲木工艺和高级皮革，为每一个书房或客厅增添了不可替代的格调。',
    author: { name: '设计精选', avatar: 'https://picsum.photos/seed/design/100/100' },
    date: '2024-03-20',
    coverImage: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?q=80&w=800&auto=format&fit=crop',
    tags: ['家具', '经典设计'],
    status: 'published'
  },
  {
    id: '2',
    title: '重塑经典：Air Jordan 1 "芝加哥" 复刻版深度解析',
    excerpt: '为什么这对球鞋能跨越几十年依然站在潮流的尖端？',
    content: 'Air Jordan 1 "Chicago" 永远是球鞋历史中最璀璨的明珠。从1985年的横空出世，到现在的多次复刻，它代表的不仅是迈克尔·乔丹的辉煌职业生涯，更是整个球鞋文化的根基。本文将带你细看最新复刻版的皮质工艺与色彩还原。',
    author: { name: '鞋头部落', avatar: 'https://picsum.photos/seed/sneaker/100/100' },
    date: '2024-03-18',
    coverImage: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?q=80&w=800&auto=format&fit=crop',
    tags: ['球鞋', '潮流'],
    status: 'published'
  },
  {
    id: '3',
    title: '智能厨房：戴森新款多功能烹饪器的使用体验',
    excerpt: '科技如何改变我们的烹饪习惯？带你领略高效厨房。',
    content: '现在的厨房电器早已不再局限于基础功能。戴森这款最新的概念烹饪器，通过精准的温控系统和高效的空气动力学设计，让烹饪变得像实验室操作一样精准。无论是低温慢煮还是快速爆炒，都能轻松胜任。',
    author: { name: '极客居家', avatar: 'https://picsum.photos/seed/tech/100/100' },
    date: '2024-03-15',
    coverImage: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=800&auto=format&fit=crop',
    tags: ['电器', '智能家居'],
    status: 'published'
  },
  {
    id: '4',
    title: '北欧极简风：宜家顶级联名系列实测',
    excerpt: '在平价与设计之间寻找完美平衡的北欧家居美学。',
    content: '宜家的设计师联名系列一直是家居迷关注的焦点。本季推出的模块化沙发和极简边几，不仅保留了北欧风的实用性，更在材质上进行了大胆创新。',
    author: { name: '小鹿', avatar: 'https://picsum.photos/seed/deer/100/100' },
    date: '2024-03-12',
    coverImage: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?q=80&w=800&auto=format&fit=crop',
    tags: ['家具', '宜家'],
    status: 'published'
  },
  {
    id: '5',
    title: '复古运动潮：New Balance 2002R 的穿搭之道',
    excerpt: '复古跑鞋回归，如何穿出不一样的都市工装感？',
    content: 'New Balance 2002R 以其极致的舒适度和复古的轮廓，成为了近年来的街头常客。搭配工装裤或是极简风西裤，都能碰撞出独特的风格。',
    author: { name: '潮流观察者', avatar: 'https://picsum.photos/seed/fashion/100/100' },
    date: '2024-03-10',
    coverImage: 'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?q=80&w=800&auto=format&fit=crop',
    tags: ['球鞋', '穿搭'],
    status: 'published'
  },
  {
    id: '6',
    title: '静音与强力：2024高端洗碗机选购指南',
    excerpt: '告别洗碗烦恼，这些电器真的值得投入吗？',
    content: '洗碗机已成为现代家庭提升幸福感的必备电器。我们测试了包括西门子、米勒在内的多个品牌，从洗净度、烘干模式以及噪音控制三个维度为你带来最真实的评测。',
    author: { name: '生活达人', avatar: 'https://picsum.photos/seed/life/100/100' },
    date: '2024-03-08',
    coverImage: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=800&auto=format&fit=crop',
    tags: ['电器', '评测'],
    status: 'published'
  },
  {
    id: '7',
    title: '原木色的温暖：寻找一棵适合你的实木餐桌',
    excerpt: '自然的力量，如何让餐厅焕发生机。',
    content: '一张好的餐桌是家庭交流的核心。北美黑胡桃木、白蜡木或是樱桃木，每种木材都有其独特的纹理和性格。',
    author: { name: '木艺工坊', avatar: 'https://picsum.photos/seed/wood/100/100' },
    date: '2024-03-05',
    coverImage: 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?q=80&w=800&auto=format&fit=crop',
    tags: ['家具', '实木'],
    status: 'published'
  },
  {
    id: '8',
    title: '联名天花板：Louis Vuitton x Nike Air Force 1',
    excerpt: '当顶级时装遇见街头传奇，这不仅是球鞋，更是艺术品。',
    content: 'Virgil Abloh 的最后遗作之一，将LV的Monogram花纹与Nike最具辨识度的剪裁结合。它是球鞋收藏家眼中的圣杯。',
    author: { name: '奢品观察', avatar: 'https://picsum.photos/seed/luxury/100/100' },
    date: '2024-03-03',
    coverImage: 'https://images.unsplash.com/photo-1514989940723-e8e51635b782?q=80&w=800&auto=format&fit=crop',
    tags: ['球鞋', '奢侈品'],
    status: 'published'
  },
  {
    id: '9',
    title: '咖啡师的秘密武器：半自动咖啡机进阶',
    excerpt: '在家做出专业级的拉花咖啡，你需要这些设备。',
    content: '从磨豆机到萃取压力的精准控制，一杯好的意式浓缩离不开高性能的咖啡机。Rocket和La Marzocco是很多发烧友的终极目标。',
    author: { name: '咖啡控', avatar: 'https://picsum.photos/seed/coffee/100/100' },
    date: '2024-03-01',
    coverImage: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=800&auto=format&fit=crop',
    tags: ['电器', '咖啡'],
    status: 'published'
  },
  {
    id: '10',
    title: '中古家具入坑指南：如何淘到正品MCM风格',
    excerpt: '从柏林到上海，中古家具为何让年轻人疯狂？',
    content: 'Mid-Century Modern风格经久不衰。教你如何分辨正品北欧中古椅，以及在拍卖行或二手市场捡漏的小技巧。',
    author: { name: '复古迷', avatar: 'https://picsum.photos/seed/vintage/100/100' },
    date: '2024-02-28',
    coverImage: 'https://images.unsplash.com/photo-1594026112284-02bb6f3352fe?q=80&w=800&auto=format&fit=crop',
    tags: ['家具', '中古'],
    status: 'published'
  },
  {
    id: '13',
    title: '皮沙发 vs 布艺沙发：十年老业主的血泪史',
    excerpt: '装修选沙发，避开这些坑能省几万块。',
    content: '真皮沙发的贵气与难打理，布艺沙发的温馨与易脏。结合不同的家庭成员情况（宠物、小孩），给您最中肯的建议。',
    author: { name: '装修日记', avatar: 'https://picsum.photos/seed/house/100/100' },
    date: '2024-02-20',
    coverImage: 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?q=80&w=800&auto=format&fit=crop',
    tags: ['家具', '选购'],
    status: 'published'
  },
  {
    id: '14',
    title: '联名疯：Adidas x Samba 再次统治街头',
    excerpt: '薄底鞋回归，Samba如何成为这一季的时尚标杆？',
    content: '从足球场到T台，Adidas Samba 凭借着它修长的身形和复古的T头设计，再次成为了It Girl们的首选。',
    author: { name: '穿搭指南', avatar: 'https://picsum.photos/seed/style/100/100' },
    date: '2024-02-18',
    coverImage: 'https://images.unsplash.com/photo-1628413993904-94ecb60f1239?q=80&w=800&auto=format&fit=crop',
    tags: ['球鞋', '时尚'],
    status: 'published'
  },
  {
    id: '15',
    title: '未来的家：全屋智能灯光系统搭建',
    excerpt: '告别墙壁开关，用灯光定义心情。',
    content: 'Zigbee还是蓝牙Mesh？如何通过自动化场景设置，让灯光在你回家的一刻自动亮起，并随音乐节奏律动。',
    author: { name: '智能先锋', avatar: 'https://picsum.photos/seed/light/100/100' },
    date: '2024-02-15',
    coverImage: 'https://images.unsplash.com/photo-1558211583-d28f9757568b?q=80&w=800&auto=format&fit=crop',
    tags: ['电器', '智能家居'],
    status: 'published'
  }
];
