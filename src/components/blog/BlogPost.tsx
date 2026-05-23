import type { ReactNode } from 'react';
import { Link } from "react-router-dom";
import { MDXProvider } from '@mdx-js/react';

import MDXComponents from './MDXComponents';
import Navbar from "../Navbar";
import 'katex/dist/katex.min.css';
import type { BlogPostFrontmatter } from '../../types';

interface BlogPostProps {
  children: ReactNode;
  frontmatter: BlogPostFrontmatter;
}

const formatDate = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "2-digit",
  });
};

const DraftBanner = () => (
  <div
    role="note"
    aria-label="Draft article"
    className="mb-10 border border-ember-500/40 bg-ember-500/5 px-4 sm:px-5 py-3 flex flex-wrap items-center gap-x-4 gap-y-1.5"
  >
    <span className="font-mono text-[10.5px] tracking-wider3 uppercase text-ember-400">
      Draft · Work in progress
    </span>
    <span aria-hidden className="text-bone-600 hidden sm:inline">·</span>
    <span className="text-bone-200 text-[0.875rem] leading-[1.5]">
      This post is incomplete and being written. Expect rough edges and missing
      sections.
    </span>
  </div>
);

const BlogPost = ({ children, frontmatter }: BlogPostProps) => {
  return (
    <div className="min-h-screen text-bone-200 grain">
      <Navbar />
      <article className="relative z-10 max-w-4xl mx-auto px-6 sm:px-10 pt-28 pb-20">
        <Link
          to="/blog"
          className="group inline-flex items-center gap-2 font-mono text-[10.5px] tracking-wider2 uppercase text-bone-400 hover:text-bone-50 transition-colors mb-10"
        >
          <span aria-hidden className="transition-transform group-hover:-translate-x-1">←</span>
          <span>Back to blog</span>
        </Link>

        {frontmatter.draft && <DraftBanner />}

        <header className="mb-12">
          <span className="font-mono text-[10.5px] tracking-wider3 uppercase text-bone-600">
            {formatDate(frontmatter.date)}
          </span>
          <h1 className="mt-4 font-display text-bone-50 font-medium leading-[1.0] tracking-[-0.02em] text-[clamp(2rem,4.6vw,3.4rem)]">
            {frontmatter.title}
          </h1>
          {frontmatter.tags && frontmatter.tags.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-x-3 gap-y-2">
              {frontmatter.tags.map(tag => (
                <span
                  key={tag}
                  className="font-mono text-[10.5px] tracking-wider2 uppercase text-bone-400"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          <div className="rule mt-10" />
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
