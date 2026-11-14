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
  content: string;
  description?: string;
  image?: string;
  date: string;
  author: UserProfile;
  tags: string[];
  readTime: string;
  likes: number;
  isGlitch?: boolean;
  previous?: PostRef;
  next?: PostRef;
}

export interface PostListResult {
  posts: BlogPost[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  queryKey: string;
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
  GEAR = 'GEAR',
  FILES = 'FILES'
}
