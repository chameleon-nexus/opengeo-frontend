
import React from 'react';
import { BlogPost } from '../types';

interface BlogPostDetailProps {
  post: BlogPost;
  onBack: () => void;
}

const BlogPostDetail: React.FC<BlogPostDetailProps> = ({ post, onBack }) => {
  const hasHtmlContent = /<\/?[a-z][\s\S]*>/i.test(post.content || '');

  return (
    <article className="max-w-screen-md mx-auto px-6 py-12 bg-white min-h-screen">
      <header className="mb-12">
        <div className="flex items-center space-x-2 mb-6 text-gray-500 text-sm">
          {post.tags.map(tag => (
            <span key={tag} className="hover:text-black cursor-pointer">#{tag}</span>
          ))}
        </div>
        
        <h1 className="serif text-4xl md:text-5xl lg:text-6xl text-gray-900 leading-tight mb-8">
          {post.title}
        </h1>

        <div className="flex items-center space-x-4 mb-10 pb-10 border-b border-gray-100">
          <img src={post.author.avatar} alt={post.author.name} className="w-12 h-12 rounded-full ring-2 ring-gray-100" />
          <div className="flex flex-col">
            <span className="font-medium text-gray-900">{post.author.name}</span>
            <span className="text-sm text-gray-500">发布于 {post.date} · 预计阅读 5 分钟</span>
          </div>
        </div>
      </header>

      <div className="rounded-2xl overflow-hidden mb-12">
        <img src={post.coverImage} alt={post.title} className="w-full h-auto object-cover max-h-[600px]" />
      </div>

      <div className="prose prose-lg max-w-none text-gray-800 leading-relaxed space-y-6">
        {hasHtmlContent ? (
          <div
            className="text-lg md:text-xl font-light text-gray-700"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        ) : (
          post.content.split('\n').map((para, i) => (
            <p key={i} className="text-lg md:text-xl font-light text-gray-700">
              {para}
            </p>
          ))
        )}
      </div>

      <footer className="mt-20 pt-10 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <button className="flex items-center space-x-2 text-gray-500 hover:text-red-500 transition-colors">
              <i className="fa-regular fa-heart text-xl"></i>
              <span>2.4k</span>
            </button>
            <button className="flex items-center space-x-2 text-gray-500 hover:text-blue-500 transition-colors">
              <i className="fa-regular fa-comment text-xl"></i>
              <span>128</span>
            </button>
          </div>
          <button className="text-gray-500 hover:text-black transition-colors">
            <i className="fa-regular fa-bookmark text-xl"></i>
          </button>
        </div>
      </footer>

      <div className="mt-8 pt-8 border-t border-gray-100">
        <button
          onClick={onBack}
          className="text-gray-500 hover:text-black transition-colors inline-flex items-center gap-2"
        >
          <span>←</span> 返回列表
        </button>
      </div>
    </article>
  );
};

export default BlogPostDetail;
