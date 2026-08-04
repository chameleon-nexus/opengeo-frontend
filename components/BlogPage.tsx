
import React, { useState, useEffect } from 'react';
import PublicHeader from './PublicHeader';
import BlogPostDetail from './BlogPostDetail';
import { BlogPost, Theme } from '../types';
import { articlesAPI, type BlogPost as ApiBlogPost } from '../api/articles';

interface BlogPageProps {
  theme: Theme;
  currentPage: 'home' | 'pricing' | 'blog' | 'privacy' | 'terms';
  onNavigate: (page: 'home' | 'pricing' | 'blog' | 'privacy' | 'terms') => void;
  onNavigateToLogin: () => void;
  headerVariant?: 'default' | 'marketing';
}

const BlogPage: React.FC<BlogPageProps> = ({ 
  theme, 
  currentPage,
  onNavigate, 
  onNavigateToLogin,
  headerVariant = 'default',
}) => {
  const headerV = headerVariant === 'marketing' ? 'marketing' : 'default';
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('全部');
  const [allTags, setAllTags] = useState<string[]>(['全部']);

  // 从 API 加载文章列表
  useEffect(() => {
    const loadPosts = async () => {
      try {
        setLoading(true);
        setError(null);
        const apiPosts = await articlesAPI.listArticles({ 
          status: 'published',
          format: 'blog' 
        }) as ApiBlogPost[];
        
        // 转换为前端格式
        const formattedPosts: BlogPost[] = apiPosts.map(p => ({
          id: p.id,
          title: p.title,
          excerpt: p.excerpt,
          content: p.content,
          author: p.author,
          date: p.date,
          coverImage: p.coverImage,
          tags: p.tags,
          status: p.status as 'published' | 'draft'
        }));
        
        setPosts(formattedPosts);
        
        // 加载所有标签
        try {
          const tags = await articlesAPI.getTags();
          setAllTags(['全部', ...tags]);
        } catch (err) {
          // 如果获取标签失败，从文章列表中提取
          const tagsFromPosts = Array.from(new Set(formattedPosts.flatMap(p => p.tags)));
          setAllTags(['全部', ...tagsFromPosts]);
        }
      } catch (err: any) {
        console.error('加载文章列表失败:', err);
        setError(err.message || '加载文章列表失败');
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };

    loadPosts();
  }, []);

  // 筛选文章
  const filteredPosts = posts.filter(post => {
    if (post.status !== 'published') return false;
    if (selectedCategory === '全部') return true;
    return post.tags.includes(selectedCategory);
  });

  // 如果选择了文章，显示详情页
  if (selectedPostId) {
    const post = posts.find(p => p.id === selectedPostId);
    if (post) {
      return (
        <div className="min-h-screen bg-white">
          <PublicHeader 
            theme={theme} 
            currentPage={currentPage} 
            onNavigate={onNavigate}
            onNavigateToLogin={onNavigateToLogin}
            variant={headerV}
          />
          <BlogPostDetail 
            post={post} 
            onBack={() => setSelectedPostId(null)}
          />
        </div>
      );
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <PublicHeader 
          theme={theme} 
          currentPage={currentPage} 
          onNavigate={onNavigate}
          onNavigateToLogin={onNavigateToLogin}
          variant={headerV}
        />
        <div className="max-w-7xl mx-auto px-4 py-20 text-center">
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white">
        <PublicHeader 
          theme={theme} 
          currentPage={currentPage} 
          onNavigate={onNavigate}
          onNavigateToLogin={onNavigateToLogin}
          variant={headerV}
        />
        <div className="max-w-7xl mx-auto px-4 py-20 text-center">
          <p className="text-red-500">加载失败：{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <PublicHeader 
        theme={theme} 
        currentPage={currentPage} 
        onNavigate={onNavigate}
        onNavigateToLogin={onNavigateToLogin}
        variant={headerV}
      />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Category Pills */}
        <div className="flex items-center space-x-4 mb-8 overflow-x-auto no-scrollbar pb-2">
          {allTags.map((cat) => (
            <button 
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                selectedCategory === cat 
                  ? 'bg-black text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Masonry Grid */}
        <style>{`
          .masonry {
            column-count: 1;
            column-gap: 1.5rem;
          }
          @media (min-width: 640px) {
            .masonry {
              column-count: 2;
            }
          }
          @media (min-width: 1024px) {
            .masonry {
              column-count: 3;
            }
          }
          .masonry-item {
            break-inside: avoid;
            margin-bottom: 1.5rem;
          }
        `}</style>
        <div className="masonry">
          {filteredPosts.map((post) => (
            <div 
              key={post.id} 
              className="masonry-item group cursor-pointer"
              onClick={() => setSelectedPostId(post.id)}
            >
              <div className="relative overflow-hidden rounded-2xl bg-gray-200 mb-3">
                <img 
                  src={post.coverImage} 
                  alt={post.title} 
                  className="w-full h-auto object-cover transform group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
              </div>
              <div className="px-1">
                <h3 className="font-semibold text-gray-900 leading-tight line-clamp-2 mb-2 group-hover:text-red-500 transition-colors">
                  {post.title}
                </h3>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <img src={post.author.avatar} alt="" className="w-5 h-5 rounded-full" />
                    <span className="text-xs text-gray-500">{post.author.name}</span>
                  </div>
                  <div className="flex items-center space-x-1 text-gray-400">
                    <i className="fa-regular fa-heart text-xs"></i>
                    <span className="text-xs">{Math.floor(Math.random() * 1000)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredPosts.length === 0 && (
          <div className="text-center py-20">
            <i className="fa-solid fa-ghost text-4xl text-gray-300 mb-4"></i>
            <p className="text-gray-500">暂时没有找到内容。</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BlogPage;
