import { useParams, Navigate } from "react-router-dom";
import { BlogPost } from "../components/blog";
import { getPostBySlug } from "../utils/blogUtils";

const BlogPostPage = () => {
  const { slug } = useParams();
  const post = getPostBySlug(slug);

  if (!post) {
    return <Navigate to="/blog" replace />;
  }

  const { Component, ...frontmatter } = post;

  return (
    <BlogPost frontmatter={frontmatter}>
      <Component />
    </BlogPost>
  );
};

export default BlogPostPage;
