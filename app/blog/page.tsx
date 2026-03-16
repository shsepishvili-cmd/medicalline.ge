import { blogArticles } from './blogData';
import BlogClient from './BlogClient';

export const metadata = {
  title: 'ბლოგი | Medical Line Georgia',
  description: 'სიახლეები და სტატიები თანამედროვე სტომატოლოგიისთვის.',
};

export default function BlogPage() {
  return <BlogClient blogArticles={blogArticles} />;
}