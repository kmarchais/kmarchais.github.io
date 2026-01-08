import type { ComponentType } from 'react';
import type { BlogPost, BlogPostFrontmatter } from '../types';

interface MDXModule {
  default: ComponentType;
  frontmatter: BlogPostFrontmatter;
}

const blogModules = import.meta.glob<MDXModule>('../content/blog/*.mdx', { eager: true });

export function getAllPosts(): BlogPost[] {
  return Object.entries(blogModules).map(([path, module]) => {
    const slug = path.replace('../content/blog/', '').replace('.mdx', '');
    return {
      slug,
      ...module.frontmatter,
      Component: module.default,
    };
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getPostBySlug(slug: string): BlogPost | null {
  const posts = getAllPosts();
  return posts.find(post => post.slug === slug) || null;
}
