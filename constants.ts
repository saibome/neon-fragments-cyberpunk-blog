import { BlogPost, UserProfile, NavItem } from './types';
import { Terminal, Radio, Settings, FolderOpen } from 'lucide-react';

export const NAV_ITEMS = [
  { id: NavItem.HOME, label: '首页', icon: Terminal, path: '/' },
  { id: NavItem.NET, label: '网络', icon: Radio, path: '/net' },
  { id: NavItem.FILES, label: '数据', icon: FolderOpen, path: '/data' },
  { id: NavItem.GEAR, label: '技术', icon: Settings, path: '/gear' },
];

export const BASE_URL = 'https://saibo.me';

export const DEFAULT_AUTHOR: UserProfile = {
  name: "文博",
  handle: "@venbo",
  handle_link: "https://saibo.me/venbo",
  role: "网络行者",
  level: 50,
  bio: "穿梭于夜之城的数据流中，猎杀恶魔，躲避企业的冰封。一切终将消亡。",
  stats: {
    ram: 64,
    cpu: 88,
    network: 42
  }
};

export const INITIAL_POSTS: BlogPost[] = [
  {
    id: '1',
    title: "荒坂入侵事件：行动复盘",
    slug: "arasaka-breach-post-mortem",
    content: "防御层比预想中更厚，到处都是黑 ICE，但我们还是拿到了有效载荷。新的神经连接原型显然并不稳定。\n\n我在矩阵里看到了本不该存在的故障。是 Relic 引起的，还是另有原因？\n\n标准加密协议在几秒内全部失效，我们只能切换到旧式模拟覆盖。回头得感谢朱迪送来的补丁。",
    date: "2077-08-12 04:20",
    author: { ...DEFAULT_AUTHOR, name: "V. Mendes" },
    tags: ["网络行动", "荒坂", "守护程序"],
    readTime: "约 3 分钟",
    likes: 1204,
    isGlitch: false
  },
  {
    id: '2',
    title: "迷彩摇滚：武侍乐队即将重聚？",
    slug: "chromatic-rock-samurai-reunion",
    content: "来生酒吧里流言四起。有人看到克里·欧罗迪恩翻看旧曲目单。我们真能等到重聚巡演，还是这只是公司的又一次障眼法？\n\n他拒绝置评。很符合他的风格。",
    date: "2077-08-10 18:45",
    author: { ...DEFAULT_AUTHOR, name: "Bes Isis" },
    tags: ["音乐", "武侍乐队", "夜之城"],
    readTime: "约 1 分钟",
    likes: 892,
    isGlitch: false
  },
  {
    id: '3',
    title: "警告：沃森区赛博精神病事件激增",
    slug: "warning-cyberpsychosis-spike-watson",
    content: "NCPD 报告称，沃森区赛博精神病事件增加了 300%。入夜后请避开歌舞伎市场。\n\n瑞吉娜需要有人帮忙收拾残局，同时保住那些可怜人的性命。如果你有非致命改装，现在就该装备上了。",
    date: "2077-08-09 09:00",
    author: { ...DEFAULT_AUTHOR, name: "Regina Jones" },
    tags: ["警告", "NCPD", "沃森区"],
    readTime: "约 2 分钟",
    likes: 3400,
    isGlitch: true
  }
];
