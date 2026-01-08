const blogModules = import.meta.glob('../content/blog/*.mdx', { eager: true });

export function getAllPosts() {
  return Object.entries(blogModules).map(([path, module]) => {
    const slug = path.replace('../content/blog/', '').replace('.mdx', '');
    return {
      slug,
      ...module.frontmatter,
      Component: module.default,
    };
  }).sort((a, b) => new Date(b.date) - new Date(a.date));
}

export function getPostBySlug(slug) {
  const posts = getAllPosts();
  return posts.find(post => post.slug === slug) || null;
}
