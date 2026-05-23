import type { ComponentType } from 'react';

export interface OpenSourceLink {
  label: string;
  url: string;
}

export interface OpenSourceChild {
  name: string;
  blurb: string;
  url: string;
}

export interface OpenSourceProject {
  name: string;
  role: 'author' | 'contributor';
  blurb: string;
  /** Primary link for non-expandable entries. Ignored if `children` is set. */
  links: OpenSourceLink[];
  /** When set, the row becomes expandable and reveals these sub-entries. */
  children?: OpenSourceChild[];
}

export interface BlogPostFrontmatter {
  title: string;
  date: string;
  excerpt?: string;
  tags?: string[];
  slug?: string;
  /** Mark the post as an in-progress draft. Surfaces a visible banner. */
  draft?: boolean;
  /** When true, the post is omitted from the public listing but remains
      reachable via direct URL. Used for in-progress work. */
  hidden?: boolean;
}

export interface BlogPost extends BlogPostFrontmatter {
  slug: string;
  Component: ComponentType;
}
