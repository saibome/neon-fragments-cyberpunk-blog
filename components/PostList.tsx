import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router';
import { BlogPost, PostListResult } from '../types';
import { useData } from '../contexts/DataContext';
import { useProfile } from '../contexts/ProfileContext';
import PostCard from './PostCard';
import { Search, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface PostListProps {
  posts?: BlogPost[];
}

const PostList: React.FC<PostListProps> = ({ posts: propPosts }) => {
  const { posts: contextPosts, initialList } = useData();
  const { resetProfile } = useProfile();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const searchQuery = searchParams.get('search') || '';
  const tagQuery = searchParams.get('tags') || searchParams.get('tag') || '';
  const queryKey = `${page}|${searchQuery}|${tagQuery}`;
  const initialListForQuery = initialList?.queryKey === queryKey ? initialList : undefined;
  const [posts, setPosts] = useState<BlogPost[]>(propPosts || initialListForQuery?.posts || contextPosts || []);
  const [loading, setLoading] = useState(!propPosts && !initialListForQuery);
  const [totalPages, setTotalPages] = useState(initialListForQuery?.totalPages || 1);
  const [inputValue, setInputValue] = useState(searchQuery);
  const requestRef = useRef<{ key: string; promise: Promise<PostListResult> } | null>(
    initialListForQuery ? { key: queryKey, promise: Promise.resolve(initialListForQuery) } : null
  );

  useEffect(() => {
    resetProfile();
  }, [resetProfile]);

  useEffect(() => {
    setInputValue(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    let request = requestRef.current;
    if (!request || request.key !== queryKey) {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '10');
      if (searchQuery) params.set('search', searchQuery);
      if (tagQuery) params.set('tags', tagQuery);

      const promise = fetch(`/api/posts?${params.toString()}`).then(response => {
        if (!response.ok) throw new Error(`文章请求失败：${response.status}`);
        return response.json() as Promise<PostListResult>;
      });
      request = { key: queryKey, promise };
      requestRef.current = request;
    }

    const activeRequest = request;
    setLoading(true);
    activeRequest.promise
      .then(data => {
        if (requestRef.current !== activeRequest) return;
        setPosts(data.posts);
        setTotalPages(data.totalPages);
      })
      .catch(error => {
        if (requestRef.current === activeRequest) {
          console.error('获取文章失败：', error);
          requestRef.current = null;
        }
      })
      .finally(() => {
        if (requestRef.current === activeRequest) setLoading(false);
      });
  }, [page, searchQuery, tagQuery, queryKey]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setSearchParams(prev => {
        const newParams = new URLSearchParams(prev);
        if (inputValue) {
          newParams.set('search', inputValue);
        } else {
          newParams.delete('search');
        }
        newParams.set('page', '1'); // Reset to page 1 on search
        return newParams;
      });
    }
  };

  const handleClearSearch = () => {
    setInputValue('');
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.delete('search');
      return newParams;
    });
  };

  const handleClearTag = () => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.delete('tags');
      newParams.delete('tag');
      newParams.set('page', '1');
      return newParams;
    });
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setSearchParams(prev => {
        const newParams = new URLSearchParams(prev);
        newParams.set('page', String(newPage));
        return newParams;
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-0 sm:px-6 lg:px-8 py-2 md:py-0">
      <div className="flex flex-col md:flex-row justify-between items-start mb-8 border-b-2 border-gray-800 pb-4 px-4 sm:px-0">
        <div>
          <h2 className="text-4xl font-display font-bold text-white mb-1">最新文章</h2>
          <p className="text-cyber-yellow font-mono text-xs">加密传输 // 已检测到公钥</p>
          {tagQuery && (
            <div className="mt-2 flex items-center space-x-2 bg-cyber-yellow/10 px-2 py-1 rounded border border-cyber-yellow/30 inline-flex">
              <span className="text-cyber-yellow font-mono text-xs">筛选：标签 [{tagQuery}]</span>
              <button onClick={handleClearTag} aria-label="清除标签筛选" className="text-cyber-yellow hover:text-white transition-colors">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        <div className="mt-4 md:mt-0 w-full md:w-auto">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-cyber-yellow group-focus-within:text-cyber-cyan transition-colors" />
            </div>
            <input
              type="text"
              className="block w-full md:w-72 bg-black/80 border-2 border-cyber-yellow text-cyber-yellow placeholder-cyber-yellow/40 font-mono text-sm focus:outline-none focus:border-cyber-cyan focus:text-cyber-cyan focus:placeholder-cyber-cyan/40 py-3 pl-10 pr-10 clip-corner transition-all duration-300 uppercase tracking-wider"
              placeholder="搜索文章……"
              aria-label="搜索文章"
              value={inputValue}
              onChange={handleSearchChange}
              onKeyDown={handleKeyDown}
            />
            {inputValue && (
              <button
                onClick={handleClearSearch}
                aria-label="清空搜索"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-cyber-yellow hover:text-cyber-cyan transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-2 h-2 bg-cyber-yellow group-focus-within:bg-cyber-cyan transition-colors"></div>
            <div className="absolute bottom-0 left-0 w-2 h-2 bg-cyber-yellow group-focus-within:bg-cyber-cyan transition-colors"></div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6">
        {loading && posts.length === 0 ? (
          <div className="text-center text-cyber-yellow font-mono animate-pulse">
            正在初始化数据连接……
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center text-gray-500 font-mono">
            暂无文章
          </div>
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
            />
          ))
        )}
      </div>

      {/* Pagination Controls */}
      <div className="mt-12 flex justify-center items-center space-x-6">
         <button
           onClick={() => handlePageChange(page - 1)}
           disabled={page <= 1}
           className={`flex items-center space-x-2 font-mono text-sm uppercase tracking-widest border border-transparent px-4 py-2 transition-all ${page <= 1 ? 'text-gray-600 cursor-not-allowed' : 'text-cyber-cyan hover:border-cyber-cyan hover:bg-cyber-cyan/10'}`}
         >
            <ChevronLeft className="w-4 h-4" />
            <span>上一页</span>
         </button>

         <div className="font-mono text-cyber-yellow text-sm">
            第 <span className="text-white font-bold">{page}</span> 页，共 {totalPages} 页
         </div>

         <button
           onClick={() => handlePageChange(page + 1)}
           disabled={page >= totalPages}
           className={`flex items-center space-x-2 font-mono text-sm uppercase tracking-widest border border-transparent px-4 py-2 transition-all ${page >= totalPages ? 'text-gray-600 cursor-not-allowed' : 'text-cyber-cyan hover:border-cyber-cyan hover:bg-cyber-cyan/10'}`}
         >
            <span>下一页</span>
            <ChevronRight className="w-4 h-4" />
         </button>
      </div>
    </div>
  );
};

export default PostList;
