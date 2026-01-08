import type { ReactNode } from 'react';
import { Link } from "react-router-dom";
import { MDXProvider } from '@mdx-js/react';
import MDXComponents from './MDXComponents';
import { Navbar } from "../";
import 'katex/dist/katex.min.css';
import type { BlogPostFrontmatter } from '../../types';

interface BlogPostProps {
  children: ReactNode;
  frontmatter: BlogPostFrontmatter;
}

const BlogPost = ({ children, frontmatter }: BlogPostProps) => {
  return (
    <div className="bg-primary min-h-screen">
      <Navbar />
      <article className="max-w-4xl mx-auto px-6 pt-28 pb-20">
        <Link
          to="/blog"
          className="text-secondary hover:text-white text-sm mb-8 inline-block transition-colors"
        >
          ← Back to blog
        </Link>

        <header className="mb-12">
          <p className="text-secondary text-sm">
            {new Date(frontmatter.date).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
          <h1 className="text-white font-bold text-4xl sm:text-5xl mt-2 leading-tight">
            {frontmatter.title}
          </h1>
          {frontmatter.tags && frontmatter.tags.length > 0 && (
            <div className="flex gap-2 mt-4">
              {frontmatter.tags.map(tag => (
                <span key={tag} className="text-secondary text-sm">#{tag}</span>
              ))}
            </div>
          )}
        </header>

        <MDXProvider components={MDXComponents}>
          <div className="prose prose-lg max-w-none">
            {children}
          </div>
        </MDXProvider>
      </article>
    </div>
  );
};

export default BlogPost;
