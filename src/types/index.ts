import type { ComponentType } from 'react';

export interface NavLink {
  id: string;
  title: string;
  path?: string;
}

export interface Service {
  title: string;
  icon: string;
}

export interface Technology {
  name: string;
  icon: string;
}

export interface ProjectTag {
  name: string;
  color: string;
}

export interface Project {
  name: string;
  description: string;
  tags: ProjectTag[];
  image: string;
  source_code_link: string;
  link_logo: string;
}

export interface BlogPostFrontmatter {
  title: string;
  date: string;
  excerpt?: string;
  tags?: string[];
  slug?: string;
}

export interface BlogPost extends BlogPostFrontmatter {
  slug: string;
  Component: ComponentType;
}

import type { Variants } from 'framer-motion';

export type MotionVariant = Variants;
