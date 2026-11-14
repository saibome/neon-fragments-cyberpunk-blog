import React, { useEffect, useRef, useState } from 'react';
import { X, Copy, Link as LinkIcon, Check } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  url: string;
}

const SocialIcon: React.FC<{ name: string; className?: string }> = ({ name, className = "w-6 h-6" }) => {
  switch (name) {
    case 'x':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      );
    case 'linkedin':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      );
    case 'facebook':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      );
    case 'reddit':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
        </svg>
      );
    case 'tumblr':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M14.563 24c-5.093 0-7.031-3.756-7.031-6.411V9.747H5.116V6.648c3.63-1.313 4.512-4.596 4.71-6.469C9.84.051 9.941 0 9.999 0h3.517v6.114h4.801v3.633h-4.82v7.47c.016 1.001.375 2.371 2.207 2.371h.09c.631-.02 1.486-.205 1.936-.419l1.156 3.425c-.436.636-2.4 1.374-4.156 1.404h-.178l.011.002z" />
        </svg>
      );
    case 'truth':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
           <path d="M 4 4 L 20 4 L 20 8 L 14 8 L 14 20 L 10 20 L 10 8 L 4 8 Z" />
        </svg>
      );
    default:
      return null;
  }
};

const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, title, url }) => {
  const [copied, setCopied] = useState<'link' | 'title' | null>(null);
  const [copyError, setCopyError] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;

      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      ));
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopy = async (type: 'link' | 'title') => {
    const text = type === 'link' ? url : `${title} - ${url}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopyError(false);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('复制失败：', err);
      setCopied(null);
      setCopyError(true);
    }
  };

  const shareLinks = [
    {
      name: 'X',
      icon: <SocialIcon name="x" />,
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
      color: 'hover:text-white'
    },
    {
      name: 'LinkedIn',
      icon: <SocialIcon name="linkedin" />,
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      color: 'hover:text-[#0077b5]'
    },
    {
      name: 'Reddit',
      icon: <SocialIcon name="reddit" />,
      url: `https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`,
      color: 'hover:text-[#ff4500]'
    },
    {
      name: 'Facebook',
      icon: <SocialIcon name="facebook" />,
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      color: 'hover:text-[#1877f2]'
    },
    {
      name: 'Truth Social',
      icon: <SocialIcon name="truth" />,
      url: `https://truthsocial.com/share?text=${encodeURIComponent(title + ' ' + url)}`, // Best guess for Truth Social
      color: 'hover:text-[#6c37e0]' // Purple-ish
    },
    {
      name: 'Tumblr',
      icon: <SocialIcon name="tumblr" />,
      url: `https://www.tumblr.com/widgets/share/tool?canonicalUrl=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`,
      color: 'hover:text-[#36465d]'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      {/* Modal Content */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-dialog-title"
        className="relative w-full max-w-md bg-cyber-dark border-2 border-cyber-cyan clip-corner p-1 shadow-[0_0_20px_rgba(0,255,255,0.3)] animate-in fade-in zoom-in duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between bg-cyber-cyan/10 p-4 border-b border-cyber-cyan/30">
          <h3 id="share-dialog-title" className="text-xl font-display font-bold text-cyber-cyan tracking-wider">
            分享数据
          </h3>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="text-cyber-cyan hover:text-white transition-colors"
            aria-label="关闭分享弹窗"
            title="关闭"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Social Grid */}
          <div className="grid grid-cols-3 gap-4">
            {shareLinks.map((link) => (
              <a
                key={link.name}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex flex-col items-center justify-center p-4 border border-gray-700 bg-gray-900/50 hover:border-cyber-cyan/50 hover:bg-cyber-cyan/5 transition-all group ${link.color}`}
              >
                <div className="mb-2 transition-transform group-hover:scale-110 group-hover:drop-shadow-[0_0_5px_currentColor]">
                  {link.icon}
                </div>
                <span className="text-xs font-mono text-gray-400 group-hover:text-white">
                  {link.name}
                </span>
              </a>
            ))}
          </div>

          {/* Copy Actions */}
          <div className="space-y-3" aria-live="polite">
            {copyError && <p className="text-sm text-cyber-red" role="status">复制失败，请手动复制链接。</p>}
            <button
              onClick={() => handleCopy('link')}
              className="w-full flex items-center justify-between p-3 border border-gray-700 bg-gray-900/50 hover:border-cyber-yellow/50 hover:bg-cyber-yellow/5 transition-all group"
            >
              <div className="flex items-center space-x-3">
                <LinkIcon className="w-4 h-4 text-gray-400 group-hover:text-cyber-yellow" />
                <span className="font-mono text-sm text-gray-300 group-hover:text-white">
                  仅复制链接
                </span>
              </div>
              {copied === 'link' ? (
                <span className="flex items-center space-x-1 text-sm font-mono text-cyber-green">
                  <Check className="w-4 h-4" />
                  <span>已复制</span>
                </span>
              ) : (
                <Copy className="w-4 h-4 text-gray-500 group-hover:text-cyber-yellow" />
              )}
            </button>

            <button
              onClick={() => handleCopy('title')}
              className="w-full flex items-center justify-between p-3 border border-gray-700 bg-gray-900/50 hover:border-cyber-yellow/50 hover:bg-cyber-yellow/5 transition-all group"
            >
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <LinkIcon className="w-4 h-4 text-gray-400 group-hover:text-cyber-yellow" />
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-cyber-yellow rounded-full opacity-50"></span>
                </div>
                <span className="font-mono text-sm text-gray-300 group-hover:text-white">
                  复制标题和链接
                </span>
              </div>
              {copied === 'title' ? (
                <span className="flex items-center space-x-1 text-sm font-mono text-cyber-green">
                  <Check className="w-4 h-4" />
                  <span>已复制</span>
                </span>
              ) : (
                <Copy className="w-4 h-4 text-gray-500 group-hover:text-cyber-yellow" />
              )}
            </button>
          </div>
        </div>

        {/* Decorative Corners */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyber-cyan"></div>
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyber-cyan"></div>
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyber-cyan"></div>
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyber-cyan"></div>
      </div>
    </div>
  );
};

export default ShareModal;
