/// <reference types="vite/client" />

declare module '*.png' {
  const src: string;
  export default src;
}

declare module '*.jpg' {
  const src: string;
  export default src;
}

declare module '*.jpeg' {
  const src: string;
  export default src;
}

declare module '*.gif' {
  const src: string;
  export default src;
}

declare module '*.svg' {
  const src: string;
  export default src;
}

declare module '*.mdx' {
  import type { ComponentType } from 'react';

  export const frontmatter: {
    title: string;
    date: string;
    excerpt?: string;
    tags?: string[];
    [key: string]: unknown;
  };

  const MDXComponent: ComponentType;
  export default MDXComponent;
}
