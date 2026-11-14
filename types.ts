export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  description?: string;
  image?: string;
  date: string;
  author: UserProfile;
  tags: string[];
  readTime: string;
  likes: number;
  isGlitch?: boolean;
  previous?: { slug: string; title: string; date: string };
  next?: { slug: string; title: string; date: string };
}

export interface PostListResult {
  posts: BlogPost[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  queryKey: string;
}

export interface InitialData {
  posts: BlogPost[];
  list?: PostListResult;
  resolvedSlug?: string;
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

export enum ViewState {
  LIST = 'LIST',
  DETAIL = 'DETAIL'
}

export enum NavItem {
  HOME = 'HOME',
  NET = 'NET',
  GEAR = 'GEAR',
  FILES = 'FILES'
}
