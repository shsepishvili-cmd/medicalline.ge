"use client";

import dynamic from 'next/dynamic';

const BlogContent = dynamic(() => import('./BlogContent'), { 
  ssr: false,
  loading: () => <div className="min-h-screen bg-white animate-pulse" /> 
});

export default function BlogWrapper({ post }: { post: any }) {
  return <BlogContent post={post} />;
}