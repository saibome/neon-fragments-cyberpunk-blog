import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, Share2, ThumbsUp, MessageSquare, AlertOctagon } from 'lucide-react';
import CyberButton from './CyberButton';
import GlitchText from './GlitchText';
import NotFound from './NotFound';
import CyberDate from './CyberDate';
import ShareModal from './ShareModal';
import { DEFAULT_COVER } from '../config';
import { cardUrl } from '../lib/permalink';
import { useData } from '../contexts/DataContext';
import type { BlogPost, PostRef } from '../types';

const PostDetail: React.FC = () => {
  const { slug } = useParams<{ year: string; month: string; day: string; slug: string }>();
  const navigate = useNavigate();
  const { posts, resolvedSlug, siteUrl } = useData();

  // SSR 与首屏 hydrate 都从注入的数据初始化
  const foundPost = posts.find(p => p.slug === slug);
  const [post, setPost] = useState<BlogPost | null>(foundPost || null);
  const [loading, setLoading] = useState(!foundPost && resolvedSlug !== slug);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  useEffect(() => {
    if (post?.slug === slug || (resolvedSlug === slug && !post)) return;

    setLoading(true);
    const found = posts.find(p => p.slug === slug);
    if (found) {
      setPost(found);
      setLoading(false);
    } else if (slug) {
      fetch(`/api/posts/${slug}`)
        .then(res => {
          if (res.ok) return res.json() as Promise<BlogPost>;
          throw new Error('Post not found');
        })
        .then(data => {
          setPost(data);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
          setPost(null);
        });
    }
  }, [slug, posts, post, resolvedSlug]);

  const contentRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!post) return;

    const enhanceCodeBlocks = () => {
      if (!contentRef.current) return;
      const root = contentRef.current;

      // 表格加横向滚动容器
      root.querySelectorAll('table').forEach((table) => {
        if (table.parentElement?.classList.contains('table-wrapper')) return;

        const wrapper = document.createElement('div');
        wrapper.className = 'table-wrapper mb-6 border border-cyber-gray/50 bg-cyber-dark/30 max-w-full';
        wrapper.style.display = 'block';
        wrapper.style.width = '100%';
        wrapper.style.maxWidth = '100%';
        wrapper.style.overflowX = 'auto';
        wrapper.style.setProperty('-webkit-overflow-scrolling', 'touch');

        if (table.parentNode) {
          table.parentNode.insertBefore(wrapper, table);
          wrapper.appendChild(table);
        }
        (table as HTMLElement).style.marginBottom = '0';
      });

      // 代码块加工具栏（语言标签、换行切换、复制）
      root.querySelectorAll('pre').forEach((preElement) => {
        const pre = preElement as HTMLElement;
        if (pre.parentElement?.classList.contains('code-block-wrapper')) return;

        const wrapper = document.createElement('div');
        wrapper.className = 'code-block-wrapper relative group mb-8 border border-cyber-gray bg-[#0a0a0a] w-full overflow-hidden rounded-md';

        pre.parentNode?.insertBefore(wrapper, pre);
        wrapper.appendChild(pre);

        pre.style.marginBottom = '0';
        pre.style.border = 'none';
        pre.style.background = 'transparent';
        pre.style.padding = '1.5rem';
        pre.style.margin = '0';
        pre.style.maxWidth = '100%';
        pre.style.overflowX = 'auto';

        const toolbar = document.createElement('div');
        toolbar.className = 'flex items-center justify-between px-4 py-2 border-b border-cyber-gray bg-cyber-dark/50 backdrop-blur-sm';

        const code = pre.querySelector('code') as HTMLElement | null;
        let lang = '文本';
        let rawLang = 'text';
        if (code) {
          const langClass = code.className.split(' ').find(c => c.startsWith('language-'));
          if (langClass) {
            rawLang = langClass.replace('language-', '').toLowerCase();
            lang = rawLang.toUpperCase();
          }
        }

        const langLabel = document.createElement('span');
        langLabel.className = 'text-xs font-mono text-cyber-yellow';
        langLabel.innerText = `// ${lang}`;

        const actions = document.createElement('div');
        actions.className = 'flex items-center space-x-4';

        const wrapBtn = document.createElement('button');
        wrapBtn.className = 'text-xs font-mono text-gray-400 hover:text-cyber-cyan transition-colors flex items-center cursor-pointer';
        let isWrapped = ['text', 'txt', 'markdown', 'md', 'plaintext'].includes(rawLang);
        if (isWrapped) {
          pre.style.whiteSpace = 'pre-wrap';
          pre.style.wordBreak = 'break-word';
          wrapBtn.innerHTML = '[ 取消换行 ]';
          wrapBtn.classList.add('text-cyber-cyan');
        } else {
          wrapBtn.innerHTML = '[ 自动换行 ]';
        }
        wrapBtn.onclick = () => {
          isWrapped = !isWrapped;
          if (isWrapped) {
            pre.style.whiteSpace = 'pre-wrap';
            pre.style.wordBreak = 'break-word';
            wrapBtn.innerHTML = '[ 取消换行 ]';
            wrapBtn.classList.add('text-cyber-cyan');
          } else {
            pre.style.whiteSpace = 'pre';
            pre.style.wordBreak = 'normal';
            wrapBtn.innerHTML = '[ 自动换行 ]';
            wrapBtn.classList.remove('text-cyber-cyan');
          }
        };

        const copyBtn = document.createElement('button');
        copyBtn.className = 'text-xs font-mono text-gray-400 hover:text-cyber-cyan transition-colors flex items-center cursor-pointer glitch-hover';
        copyBtn.innerHTML = '[ 复制 ]';
        copyBtn.onclick = async () => {
          const text = code?.innerText || pre.innerText;
          try {
            await navigator.clipboard.writeText(text);
            copyBtn.innerHTML = '[ 已复制 ]';
            copyBtn.classList.add('text-cyber-cyan');
            copyBtn.style.animation = 'glitch-skew 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) both infinite';
            setTimeout(() => {
              copyBtn.innerHTML = '[ 复制 ]';
              copyBtn.classList.remove('text-cyber-cyan');
              copyBtn.style.animation = '';
            }, 2000);
          } catch (err) {
            console.error('Failed to copy:', err);
          }
        };

        actions.appendChild(wrapBtn);
        actions.appendChild(copyBtn);
        toolbar.appendChild(langLabel);
        toolbar.appendChild(actions);
        wrapper.insertBefore(toolbar, pre);
      });
    };

    enhanceCodeBlocks();
  }, [post]);

  if (loading) {
    return <div className="text-white text-center mt-20">正在解密数据流……</div>;
  }

  if (!post) {
    return <NotFound />;
  }

  const currentUrl = `${siteUrl}${post.permalink}`;
  const displayImage = post.image || DEFAULT_COVER;
  const ogImage = `${siteUrl}${cardUrl(post.permalink)}`;
  const description = post.description || `${(post.content || '').replace(/<[^>]+>/g, '').substring(0, 150)}……`;

  const currentIndex = posts.findIndex(p => p.slug === slug);
  const newerPost: PostRef | undefined = post.next || (currentIndex > 0 ? posts[currentIndex - 1] : undefined);
  const olderPost: PostRef | undefined = post.previous ||
    (currentIndex !== -1 && currentIndex < posts.length - 1 ? posts[currentIndex + 1] : undefined);

  return (
    <div className="bg-cyber-dark min-h-full relative border-t-4 border-cyber-yellow">
      <Helmet>
        <title>{post.title} | 霓虹碎片</title>
        <meta name="description" content={description} />

        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={currentUrl} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:site_name" content="霓虹碎片" />
        <meta property="article:published_time" content={new Date(post.date).toISOString()} />
        {post.tags.map(tag => <meta key={tag} property="article:tag" content={tag} />)}

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={post.title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={ogImage} />
      </Helmet>

      <div className="w-full bg-zinc-900 relative overflow-hidden flex flex-col justify-end pt-4 md:pt-8">
        <div className="absolute inset-0 bg-cover bg-center opacity-20 mix-blend-overlay" style={{ backgroundImage: `url('${displayImage}')` }}></div>
        <div className="absolute inset-0 bg-gradient-to-t from-cyber-dark to-transparent"></div>

        <div className="relative z-10 w-full max-w-4xl mx-auto px-4 md:px-8 pb-4">
          <button onClick={() => navigate('/')} className="flex items-center text-cyber-cyan hover:text-white transition-colors font-mono text-sm mb-2 md:mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" /> 返回文章列表
          </button>
          <h1 className="text-2xl md:text-5xl font-display font-bold text-white uppercase tracking-tighter drop-shadow-[0_0_10px_rgba(252,238,10,0.5)]">
            <GlitchText text={post.title} />
          </h1>

          <div className="flex flex-wrap gap-2 mt-4">
            {post.tags.map(tag => (
              <Link key={tag} to={`/?tag=${encodeURIComponent(tag)}`} className="text-xs font-bold font-mono bg-cyber-cyan/10 text-cyber-cyan px-3 py-1 border border-cyber-cyan/30 uppercase hover:bg-cyber-cyan/20 transition-colors">
                #{tag}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 md:px-8 pt-2 pb-4 md:pb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-800 pb-4 mb-8 font-mono text-sm text-gray-400 gap-2 md:gap-0">
          <div className="flex items-center space-x-4">
            <CyberDate date={post.date} className="text-base" />
            <span className="flex items-center"><span className="w-2 h-2 bg-cyber-red rounded-full mr-2 animate-pulse"></span> {post.readTime}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span>作者：</span>
            <span className="text-white border border-gray-600 px-2 bg-gray-800 uppercase">{post.author.name}</span>
          </div>
        </div>

        <article className="max-w-none mb-12">
          {/* 正文 HTML 已在构建期由 sanitize-html 消毒 */}
          <div
            ref={contentRef}
            className="cyber-markdown text-gray-300 leading-relaxed font-sans max-w-full"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          {post.isGlitch && (
            <div className="mt-8 p-4 border border-cyber-red/50 bg-cyber-red/5 flex items-start space-x-3">
              <AlertOctagon className="w-6 h-6 text-cyber-red flex-shrink-0" />
              <p className="text-cyber-red text-sm font-mono m-0">
                警告：此内容已被 NetWatch 标记，查看可能导致神经接口保修失效。
              </p>
            </div>
          )}
        </article>

        <div className="flex flex-col md:flex-row items-center justify-between bg-gray-900 p-6 clip-corner border-l-4 border-cyber-cyan">
          <div className="flex items-center space-x-6 mb-4 md:mb-0">
            <span className="flex items-center space-x-2 text-gray-500" title="点赞功能即将上线">
              <ThumbsUp className="w-5 h-5" />
              <span className="font-mono font-bold">{post.likes} 次点赞</span>
            </span>
            <span className="flex items-center space-x-2 text-gray-500" title="评论功能即将上线">
              <MessageSquare className="w-5 h-5" />
              <span className="font-mono text-sm">评论功能建设中</span>
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <span className="text-gray-500 font-mono text-xs uppercase">分享文章：</span>
            <CyberButton variant="secondary" className="py-2 px-4" aria-label="分享文章" onClick={() => setIsShareModalOpen(true)}>
              <Share2 className="w-4 h-4" />
            </CyberButton>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 md:px-8 pb-8">
        <div className="flex flex-row justify-between gap-4">
          {olderPost ? (
            <Link to={olderPost.permalink} className="flex-1 group">
              <div className="border border-gray-800 bg-gray-900/50 p-4 hover:border-cyber-cyan transition-all h-full flex flex-col items-start relative overflow-hidden clip-corner">
                <div className="absolute inset-0 bg-cyber-cyan/5 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-300"></div>
                <span className="text-xs font-mono text-gray-500 mb-2 group-hover:text-cyber-cyan relative z-10 flex items-center">
                  <ArrowLeft className="w-3 h-3 mr-1" /> 上一篇
                </span>
                <span className="font-display text-lg text-white group-hover:text-cyber-yellow w-full text-left relative z-10">{olderPost.title}</span>
              </div>
            </Link>
          ) : (
            <div className="flex-1 opacity-50 cursor-not-allowed select-none">
              <div className="border border-gray-800 bg-gray-900/20 p-4 h-full flex flex-col items-start relative overflow-hidden clip-corner">
                <span className="text-xs font-mono text-gray-600 mb-2 relative z-10 flex items-center">
                  <ArrowLeft className="w-3 h-3 mr-1" /> 上一篇
                </span>
                <span className="font-display text-lg text-gray-600 w-full text-left relative z-10">没有更早的文章</span>
              </div>
            </div>
          )}

          {newerPost ? (
            <Link to={newerPost.permalink} className="flex-1 group">
              <div className="border border-gray-800 bg-gray-900/50 p-4 hover:border-cyber-cyan transition-all h-full flex flex-col items-end text-right relative overflow-hidden clip-corner">
                <div className="absolute inset-0 bg-cyber-cyan/5 translate-x-[100%] group-hover:translate-x-0 transition-transform duration-300"></div>
                <span className="text-xs font-mono text-gray-500 mb-2 group-hover:text-cyber-cyan relative z-10 flex items-center">
                  下一篇 <ArrowLeft className="w-3 h-3 ml-1 rotate-180" />
                </span>
                <span className="font-display text-lg text-white group-hover:text-cyber-yellow w-full text-right relative z-10">{newerPost.title}</span>
              </div>
            </Link>
          ) : (
            <div className="flex-1 opacity-50 cursor-not-allowed select-none">
              <div className="border border-gray-800 bg-gray-900/20 p-4 h-full flex flex-col items-end text-right relative overflow-hidden clip-corner">
                <span className="text-xs font-mono text-gray-600 mb-2 relative z-10 flex items-center">
                  下一篇 <ArrowLeft className="w-3 h-3 ml-1 rotate-180" />
                </span>
                <span className="font-display text-lg text-gray-600 w-full text-right relative z-10">没有更新的文章</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        title={post.title}
        url={currentUrl}
      />
    </div>
  );
};

export default PostDetail;
