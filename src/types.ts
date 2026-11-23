export interface PostRef {
  slug: string;
  title: string;
  date: string;
  permalink: string;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  /** 构建期按 UTC 生成的规范路径 /YYYY/MM/DD/slug */
  permalink: string;
  /** 内容集合条目的原始 Markdown，仅用于纯文本摘要 / 阅读时长，正文由 render(entry) 渲染 */
  body: string;
  /** 从 body 提取的纯文本，供列表摘要、SEO 描述与 RSS 使用 */
  text: string;
  description?: string;
  image?: string;
  date: string;
  author: UserProfile;
  tags: string[];
  readTime: string;
  isGlitch?: boolean;
  previous?: PostRef;
  next?: PostRef;
}

export interface UserProfile {
  name: string;
  handle: string;
  handle_link?: string;
  role: string;
  level: number;
  bio: string;
  stats: {
    ram: number;
    cpu: number;
    network: number;
  };
}

export enum NavItem {
  HOME = 'HOME',
  NET = 'NET',
  GEAR = 'GEAR'
}
