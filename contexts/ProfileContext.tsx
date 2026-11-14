import React, { createContext, useContext, type ReactNode } from 'react';
import { DEFAULT_AUTHOR } from '../config';
import type { UserProfile } from '../types';

/** 站点默认档案；文章作者信息由各文章自己的 frontmatter 提供 */
const ProfileContext = createContext<UserProfile>(DEFAULT_AUTHOR);

export const ProfileProvider: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ProfileContext.Provider value={DEFAULT_AUTHOR}>
    {children}
  </ProfileContext.Provider>
);

export const useProfile = () => useContext(ProfileContext);
